#!/usr/bin/env node
/**
 * 妙语购票 Agent 对话测试脚本
 *
 * 用法:
 *   node test_agent.cjs                          # 默认测试（影片→影院→订单）
 *   node test_agent.cjs "我想看科幻电影"          # 自定义消息
 *   node test_agent.cjs "消息1" "消息2" "消息3"   # 多条消息
 *
 * 前置条件:
 *   - ticket-service 运行在 localhost:8080
 *   - agent-service 运行在 localhost:8081
 *   - 两个服务均已连接 Redis / MongoDB / MySQL
 *
 * 环境变量:
 *   AGENT_TOKEN  - 用户 JWT（默认用 .env 中的 JWT_CURRENT_SECRET 生成）
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8081';
const TICKET_BASE = 'http://localhost:8080';

// --- JWT 生成（避免依赖外部库） ---
function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateJwt(userId, type, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: String(userId),
    type: type,
    iat: now,
    exp: now + 86400,
    iss: 'miaoyu',
  };
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  const sigB64 = base64url(sig);
  return `${data}.${sigB64}`;
}

// --- 从 .env 读取 JWT_CURRENT_SECRET ---
function loadSecret() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '..', '..', '.env'),
    'D:\\Ai\\妙语\\tic\\.env',
  ];
  for (const p of envPaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const match = content.match(/^JWT_CURRENT_SECRET=(.+)$/m);
      if (match) return match[1].trim();
    } catch {}
  }
  // fallback
  return 'e7c75bac24ee42d980929bc7eccfa76bA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';
}

// --- HTTP helpers ---
function apiRequest(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(`${BASE}${urlPath}`, { method, headers }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({ raw: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function checkTicketService() {
  return new Promise((resolve) => {
    const req = http.request(`${TICKET_BASE}/internal/movies?page=1&size=1`, { method: 'GET' }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(buf);
          resolve(json.code === 0);
        } catch { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function sendMessage(sessionId, content, token) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ content });
    const req = http.request(`${BASE}/api/v1/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 90000,
    }, (res) => {
      let events = [];
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            events.push({ event: currentEvent, data });
            const label = currentEvent || 'data';
            if (label === 'message') {
              try {
                const parsed = JSON.parse(data);
                console.log(`  💬 ${parsed.content || data}`);
              } catch { console.log(`  💬 ${data}`); }
            } else if (label === 'card') {
              try {
                const parsed = JSON.parse(data);
                const count = parsed.cardData?.movies?.length || parsed.cardData?.cinemas?.length || parsed.cardData?.records?.length || 0;
                console.log(`  📇 ${parsed.cardType} (${count} items)`);
              } catch { console.log(`  📇 ${data.slice(0, 80)}...`); }
            } else if (label === 'done') {
              console.log(`  ✅ done`);
            } else if (label === 'error') {
              try {
                const parsed = JSON.parse(data);
                console.log(`  ❌ ${parsed.message || data}`);
              } catch { console.log(`  ❌ ${data}`); }
            }
            currentEvent = null;
          }
        }
      });
      res.on('end', () => resolve(events));
    });
    req.on('error', (e) => { console.log(`  ❌ Error: ${e.message}`); resolve([]); });
    req.on('timeout', () => { req.destroy(); console.log('  ⏰ TIMEOUT'); resolve([]); });
    req.write(body);
    req.end();
  });
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const messages = args.length > 0 ? args : ['列出所有影片', '列出所有影院', '查看我的订单'];
  const secret = process.env.AGENT_TOKEN ? null : loadSecret();
  const token = process.env.AGENT_TOKEN || generateJwt(1, 'user', secret);

  // 前置检查
  console.log('🔍 检查 ticket-service (localhost:8080)...');
  const ticketOk = await checkTicketService();
  if (!ticketOk) {
    console.log('❌ ticket-service 不可用，请先启动 ticket-service (port 8080)');
    process.exit(1);
  }
  console.log('✅ ticket-service 正常\n');

  // 创建会话
  console.log('📝 创建对话会话...');
  const session = await apiRequest('POST', '/api/v1/chat/sessions', {}, token);
  if (session.code !== 0) {
    console.log('❌ 创建会话失败:', JSON.stringify(session));
    process.exit(1);
  }
  const sessionId = session.data.sessionId;
  console.log(`✅ 会话已创建: ${sessionId}\n`);

  // 逐条发送消息
  for (let i = 0; i < messages.length; i++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📨 [${i + 1}/${messages.length}] ${messages[i]}`);
    console.log('='.repeat(60));
    await sendMessage(sessionId, messages[i], token);
  }

  console.log('\n🎉 测试完成\n');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
