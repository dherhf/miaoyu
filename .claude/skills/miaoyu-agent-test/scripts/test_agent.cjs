#!/usr/bin/env node
/**
 * 妙语购票 Agent 对话测试脚本
 *
 * 用法:
 *   node test_agent.cjs                          # 默认测试（影片→影院→订单）
 *   node test_agent.cjs "我想看科幻电影"          # 自定义消息
 *   node test_agent.cjs "消息1" "消息2" "消息3"   # 多条消息
 *   node test_agent.cjs --admin-schedule         # 管理端新增排期 API 测试
 *
 * 前置条件:
 *   - gateway-service 运行在 localhost:9000
 *   - ticket-service 运行在 localhost:8080
 *   - agent-service 运行在 localhost:8081
 *   - 三个服务均已连接 Redis / MongoDB / MySQL
 *
 * 环境变量:
 *   AGENT_TOKEN  - 用户 JWT（默认用 .env 中的 JWT_CURRENT_SECRET 生成）
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:9000';
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
    const req = http.request(`${TICKET_BASE}/internal/movies?page=1&size=1`, {
      method: 'GET',
      headers: { 'X-Internal-Token': 'miaoyu-internal-token-2026' },
    }, (res) => {
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
                const count = getCardCount(parsed);
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

// --- 卡片计数：兼容 movie_list / cinema_list / session_list / pending_order / order_confirm / seat_map ---
function getCardCount(parsed) {
  const d = parsed.cardData;
  if (!d) return 0;
  return d.movies?.length ?? d.cinemas?.length ?? d.sessions?.length ?? d.records?.length ?? d.orders?.length ?? 0;
}

// ========== 管理端新增排期 API 测试 ==========
async function testAdminScheduleCreate(secret) {
  const token = generateJwt(1, 'admin', secret);

  console.log('🔍 前置：查询影片/影院/影厅数据...');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Internal-Token': 'miaoyu-internal-token-2026',
  };

  // 查影片
  const movies = await fetchJson(`${TICKET_BASE}/internal/movies?page=1&size=1`, headers);
  if (movies.code !== 0 || !movies.data?.records?.length) {
    console.log('❌ 无可用影片，无法测试新增排期');
    return false;
  }
  const movieId = movies.data.records[0].id;

  // 查影院
  const cinemas = await fetchJson(`${TICKET_BASE}/internal/cinemas?page=1&size=100`, headers);
  if (cinemas.code !== 0 || !cinemas.data?.records?.length) {
    console.log('❌ 无可用影院');
    return false;
  }
  const cinemaId = cinemas.data.records[0].id;

  // 查影厅（通过 ticket-service admin API: GET /api/v1/admin/halls?cinemaId={id}）
  const halls = await fetchJson(`${TICKET_BASE}/api/v1/admin/halls?cinemaId=${cinemaId}&size=100`, { 'Authorization': `Bearer ${token}` });
  if (halls.code !== 0 || !halls.data?.records?.length) {
    console.log(`❌ 影院 ${cinemaId} 无可用影厅: ${JSON.stringify(halls)}`);
    return false;
  }
  const hallId = halls.data.records[0].id;
  console.log(`✅ 影片=${movieId}, 影院=${cinemaId}, 影厅=${hallId}`);

  // 构造排期（明天 10:00）
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const showDate = tomorrow.toISOString().slice(0, 10);

  const scheduleBody = {
    movieId: movieId,
    cinemaId: cinemaId,
    hallId: hallId,
    showDate: showDate,
    startTime: '22:00',
    price: 45.00,
    languageVersion: '国语2D',
  };

  console.log(`📝 POST /api/v1/admin/schedules (movieId=${movieId}, cinemaId=${cinemaId}, hallId=${hallId}, date=${showDate})`);
  const result = await postJson(`${BASE}/api/v1/admin/schedules`, scheduleBody, token);

  if (result.code === 0) {
    console.log(`✅ 排期创建成功: scheduleId=${result.data?.id}, status=${result.data?.status}`);
    return true;
  } else if (result.code === 409) {
    console.log(`✅ 排期冲突校验正常（409: ${result.message}）`);
    return true;
  } else {
    console.log(`❌ 排期创建失败: code=${result.code}, msg=${result.message}`);
    return false;
  }
}

function fetchJson(url, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({ raw: buf }); }
      });
    });
    req.on('error', () => resolve({ code: -1, message: 'request error' }));
    req.end();
  });
}

function postJson(url, body, token) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({ raw: buf }); }
      });
    });
    req.on('error', () => resolve({ code: -1, message: 'request error' }));
    req.write(data);
    req.end();
  });
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);

  // --admin-schedule: 单独测试管理端新增排期
  if (args.includes('--admin-schedule')) {
    const secret = loadSecret();
    console.log('='.repeat(60));
    console.log('🔧 管理端新增排期 API 测试');
    console.log('='.repeat(60));
    const ok = await testAdminScheduleCreate(secret);
    console.log(`\n${'='.repeat(60)}`);
    console.log(ok ? '🎉 排期创建测试通过' : '❌ 排期创建测试失败');
    console.log('='.repeat(60));
    process.exit(ok ? 0 : 1);
  }

  const messages = args.length > 0 ? args : [
    // 影片查询链路
    '有哪些上映的电影',
    '我想看科幻电影',
    // 影院查询链路（按影片过滤）
    '流浪地球3在哪些影院有排片',
    // 场次查询链路（中文日期）
    '帮我查星际穿越2明天长沙学院的场次',
    // 缺槽追问链路
    '想看电影',
    // 订单查询链路（验证卡片推送）
    '查看我的订单',
    // 模糊推荐链路
    '周末想看个轻松的喜剧',
    // 按日期查影片
    '今天有什么电影可以看',
    // 历史问题验证：从影院查影片
    '长沙学院有什么电影可以看',
  ];
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

  // 管理端新增排期 API 测试
  console.log(`\n${'='.repeat(60)}`);
  console.log('🔧 管理端新增排期 API 测试');
  console.log('='.repeat(60));
  await testAdminScheduleCreate(loadSecret());

  console.log('\n🎉 测试完成\n');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
