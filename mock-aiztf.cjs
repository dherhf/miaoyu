/**
 * AI知托付 Mock Server
 * 模拟：创建支付单、查询支付状态、模拟支付回调
 *
 * 启动：node mock-aiztf.cjs
 * 触发回调（另开终端）：
 *   curl http://localhost:8082/mock/pay/PAYxxx/success
 *   curl http://localhost:8082/mock/pay/PAYxxx/fail
 *   curl http://localhost:8082/mock/list
 */
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = 8082;
const CALLBACK_URL = 'http://localhost:9000/internal/payment/callback';
const CALLBACK_SECRET = 'miaoyu-callback-secret-32bytes!!';
const MERCHANT_HMAC_KEY = 'miaoyu-test-hmac-secret-key-32bytes!!';
const MERCHANT_ID = 'miaoyu-test-merchant';

const payments = new Map();

function hmacSha256(data, key) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}
function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}
function genId(prefix) {
  return prefix + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}
function genToken() { return crypto.randomBytes(16).toString('hex'); }

function verifyMerchantSign(method, path, body, headers) {
  const timestamp = headers['x-timestamp'];
  const nonce = headers['x-nonce'];
  const signature = headers['x-signature'];
  if (headers['x-merchant-id'] !== MERCHANT_ID) return false;
  const bodyHash = sha256(body || '');
  const signPayload = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
  return hmacSha256(signPayload, MERCHANT_HMAC_KEY) === signature;
}

function triggerCallback(payment) {
  const callbackData = {
    paymentNo: payment.paymentNo,
    merchantOrderNo: payment.merchantOrderNo,
    businessNo: payment.businessNo || genId('BIZ'),
    status: payment.status,
    amount: payment.amount,
    completedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
  // 签名覆盖完整 body（不含 sign 字段本身）
  const callbackBodyWithoutSign = JSON.stringify(callbackData);
  const sign = hmacSha256(callbackBodyWithoutSign, CALLBACK_SECRET);
  // 把 sign 放到 body 中
  callbackData.sign = sign;
  const callbackBody = JSON.stringify(callbackData);

  const u = new URL(CALLBACK_URL);

  console.log(`\n[Callback] POST ${CALLBACK_URL}`);
  console.log(`[Callback] body: ${callbackBody}`);
  console.log(`[Callback] sign: ${sign.substring(0, 16)}...`);

  const req = http.request({
    hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(callbackBody) },
  }, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      console.log(`[Callback] ← ${res.statusCode}: ${data}`);
      console.log(data === 'SUCCESS' ? `[Callback] ✅ 订单 ${payment.merchantOrderNo} 出票成功` : `[Callback] ❌ 回调失败`);
    });
  });
  req.on('error', (e) => console.error(`[Callback] 请求失败: ${e.message} (ticket-service 8080 是否启动?)`));
  req.write(callbackBody);
  req.end();
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const path = u.pathname;
  const method = req.method;
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    console.log(`\n[${method}] ${path}`);

    // POST /api/open/v1/payments — 创建支付单
    if (method === 'POST' && path === '/api/open/v1/payments') {
      if (!verifyMerchantSign(method, path, body, req.headers)) {
        console.log('  ❌ 签名验证失败');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 401, message: '签名验证失败' }));
        return;
      }
      const data = JSON.parse(body);
      let payment = null;
      for (const p of payments.values()) {
        if (p.merchantOrderNo === data.merchantOrderNo) { payment = p; break; }
      }
      if (!payment) {
        payment = {
          paymentNo: genId('PAY'), paymentToken: genToken(),
          payUrl: `http://localhost:${PORT}/pay?token=${genToken()}`,
          expiresAt: data.expireAt, merchantOrderNo: data.merchantOrderNo,
          amount: data.amount, payeeUserId: data.payeeUserId, remark: data.remark,
          status: 'PENDING', businessNo: null, createdAt: new Date().toISOString(),
        };
        payments.set(payment.paymentNo, payment);
        console.log(`  ✅ 创建支付单: ${payment.paymentNo} (订单 ${data.merchantOrderNo}, 金额 ${data.amount})`);
      } else {
        console.log(`  ↩️ 幂等返回: ${payment.paymentNo}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 0, data: { paymentNo: payment.paymentNo, paymentToken: payment.paymentToken, payUrl: payment.payUrl, expiresAt: payment.expiresAt } }));
      return;
    }

    // GET /api/open/v1/payments/:no — 查询支付状态
    const q = path.match(/^\/api\/open\/v1\/payments\/(.+)$/);
    if (method === 'GET' && q) {
      const payment = payments.get(q[1]);
      if (!payment) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 404, message: '支付单不存在' })); return; }
      console.log(`  查询: ${q[1]} → ${payment.status}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 0, data: { paymentNo: payment.paymentNo, merchantOrderNo: payment.merchantOrderNo, status: payment.status, businessNo: payment.businessNo, amount: payment.amount, completedAt: payment.completedAt || null } }));
      return;
    }

    // ===== Mock 控制端点 =====

    // GET /mock/pay/:no/success — 模拟支付成功
    // GET /mock/pay/:no/fail — 模拟支付失败
    const mockMatch = path.match(/^\/mock\/pay\/(.+)\/(success|fail)$/);
    if (method === 'GET' && mockMatch) {
      const payment = payments.get(mockMatch[1]);
      if (!payment) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '支付单不存在', payments: [...payments.keys()] }));
        return;
      }
      if (mockMatch[2] === 'success') {
        payment.status = 'SUCCESS';
        payment.businessNo = genId('BIZ');
        payment.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
        console.log(`  🟢 模拟支付成功: ${payment.paymentNo}`);
      } else {
        payment.status = 'FAILED';
        console.log(`  🔴 模拟支付失败: ${payment.paymentNo}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, paymentNo: payment.paymentNo, status: payment.status, triggeringCallback: true }));
      triggerCallback(payment);
      return;
    }

    // GET /mock/list — 查看所有支付单
    if (method === 'GET' && path === '/mock/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([...payments.values()], null, 2));
      return;
    }

    // GET /pay?token=xxx — 模拟支付页
    if (method === 'GET' && path === '/pay') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const list = [...payments.values()].map(p => 
        `<tr><td>${p.paymentNo}</td><td>${p.merchantOrderNo}</td><td>¥${p.amount}</td><td>${p.status}</td>` +
        `<td><a href="/mock/pay/${p.paymentNo}/success">✅成功</a> <a href="/mock/pay/${p.paymentNo}/fail">❌失败</a></td></tr>`
      ).join('');
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI知托付 Mock</title></head>
<body style="font-family:monospace;padding:20px">
<h2>🧪 AI知托付 Mock 支付管理</h2>
<table border="1" cellpadding="6" style="border-collapse:collapse">
<tr><th>paymentNo</th><th>订单号</th><th>金额</th><th>状态</th><th>操作</th></tr>
${list || '<tr><td colspan="5" style="text-align:center">暂无支付单</td></tr>'}
</table>
<p>点击操作链接后，Mock Server 会向 ticket-service 发送签名回调</p>
</body></html>`);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 404, message: 'Not Found' }));
  });
});

server.listen(PORT, () => {
  console.log('═'.repeat(50));
  console.log('  AI知托付 Mock Server @ http://localhost:' + PORT);
  console.log('');
  console.log('  商户API:');
  console.log('    POST /api/open/v1/payments        创建支付单');
  console.log('    GET  /api/open/v1/payments/:no    查询状态');
  console.log('');
  console.log('  Mock控制:');
  console.log('    GET  /mock/list                   所有支付单');
  console.log('    GET  /mock/pay/:no/success        模拟支付成功→触发回调');
  console.log('    GET  /mock/pay/:no/fail           模拟支付失败→触发回调');
  console.log('    GET  /pay (浏览器打开)            可视化操作面板');
  console.log('═'.repeat(50));
});
