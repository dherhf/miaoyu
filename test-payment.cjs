/**
 * 支付联动端到端测试
 * 
 * 前置条件：
 *   1. Mock AI知托付已启动: node mock-aiztf.cjs (port 8082)
 *   2. ticket-service 已启动 (port 8080)
 *   3. gateway-service 已启动 (port 9000)
 *   4. Redis 已连接
 *   5. MySQL 有测试数据（电影+场次+座位）
 *
 * 用法: node test-payment.cjs
 */
const http = require('http');

const GATEWAY = 'localhost:8083';
const TICKET = 'localhost:8083';
const MOCK = 'localhost:8082';

// JWT secret from .env
const JWT_SECRET = 'e7c75bac24ee42d980929bc7eccfa76bA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';

function request(method, host, path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: host.split(':')[0],
      port: host.split(':')[1],
      path, method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// 生成 JWT (HS256)
function genJwt(userId, type) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: String(userId), type, iss: 'miaoyu', iat: now, exp: now + 86400,
  })).toString('base64url');
  const crypto = require('crypto');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  支付联动端到端测试');
  console.log('═══════════════════════════════════════════\n');

  const userId = 1;
  const token = genJwt(userId, 'user');
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'X-Request-Id': require('crypto').randomUUID(), 'X-User-Id': String(userId), 'X-User-Type': 'user' };

  // Step 1: 查询场次
  console.log('【Step 1】查询场次...');
  let res = await request('GET', GATEWAY, '/api/v1/schedules?page=1&size=1', { headers: authHeaders });
  if (res.body?.code !== 0 || !res.body?.data?.records?.length) {
    console.log('  ❌ 无可用场次，请先插入测试数据');
    console.log('  响应:', JSON.stringify(res.body).substring(0, 300));
    return;
  }
  const schedule = res.body.data.records[0];
  schedule.id = Number(schedule.id);
  console.log(`  ✅ 场次: ${schedule.movieName} @ ${schedule.cinemaName} ${schedule.showDate} ${schedule.startTime}`);
  console.log(`     scheduleId=${schedule.id}, price=${schedule.price}`);

  // Step 2: 查询座位图
  console.log('\n【Step 2】查询座位图...');
  res = await request('GET', GATEWAY, `/api/v1/schedules/${schedule.id}/seats`, { headers: authHeaders });
  if (res.body?.code !== 0) {
    console.log('  ❌ 座位图查询失败:', JSON.stringify(res.body).substring(0, 200));
    return;
  }
  const seats = res.body.data?.seats || res.body.data?.cells || [];
  const availableSeats = seats.filter(s => s.status === 'available' || s.status === 0);
  if (availableSeats.length < 2) {
    console.log('  ❌ 可用座位不足2个');
    return;
  }
  const seatIds = availableSeats.slice(0, 2).map(s => Number(s.hallCellId || s.id));
  console.log(`  ✅ 选中座位: ${JSON.stringify(seatIds)}`);

  // Step 3: 锁座下单
  console.log('\n【Step 3】锁座下单...');
  const lockRequestId = require('crypto').randomUUID();
  res = await request('POST', GATEWAY, '/api/v1/orders/lock-seat', {
    headers: { 'Authorization': `Bearer ${token}`, 'X-Request-Id': lockRequestId },
    body: { scheduleId: schedule.id, seatIds, ticketCount: 2 },
  });
  if (res.body?.code !== 0) {
    console.log('  ❌ 锁座失败:', JSON.stringify(res.body).substring(0, 200));
    return;
  }
  const orderId = res.body.data.id;
  const orderNo = res.body.data.orderNo;
  console.log(`  ✅ 订单已创建: id=${orderId}, orderNo=${orderNo}, status=${res.body.data.status}`);

  // Step 4: 支付（调 AI知托付创建支付单）
  console.log('\n【Step 4】支付订单（调用 AI知托付 Mock）...');
  const payRequestId = require('crypto').randomUUID();
  res = await request('POST', GATEWAY, `/api/v1/orders/${orderId}/pay`, {
    headers: { 'Authorization': `Bearer ${token}`, 'X-Request-Id': payRequestId },
  });
  if (res.body?.code !== 0) {
    console.log('  ❌ 支付失败:', JSON.stringify(res.body).substring(0, 300));
    return;
  }
  const payResult = res.body.data;
  console.log(`  ✅ 支付单已创建:`);
  console.log(`     status=${payResult.status} (应为 pending)`);
  console.log(`     paymentNo=${payResult.paymentNo}`);
  console.log(`     payUrl=${payResult.payUrl}`);
  console.log(`     payExpireAt=${payResult.payExpireAt}`);

  if (!payResult.payUrl) {
    console.log('  ❌ 未返回 payUrl，请检查 PaymentClient 配置');
    return;
  }

  // Step 5: 查看订单详情（确认 pending + payUrl）
  console.log('\n【Step 5】查看订单详情...');
  res = await request('GET', GATEWAY, `/api/v1/orders/${orderId}`, { headers: authHeaders });
  console.log(`  订单状态: ${res.body?.data?.status} (应为 pending)`);
  console.log(`  payUrl: ${res.body?.data?.payUrl || '(无)'}`);

  // Step 6: 模拟支付成功（Mock 端触发回调）
  console.log('\n【Step 6】模拟支付成功 → 触发回调...');
  console.log(`  触发: GET http://localhost:8082/mock/pay/${payResult.paymentNo}/success`);
  res = await request('GET', MOCK, `/mock/pay/${payResult.paymentNo}/success`);
  console.log(`  Mock 响应:`, JSON.stringify(res.body));

  // 等待回调处理
  await sleep(2000);

  // Step 7: 查看订单状态（应为 paid）
  console.log('\n【Step 7】验证订单已支付...');
  res = await request('GET', GATEWAY, `/api/v1/orders/${orderId}`, { headers: authHeaders });
  const finalStatus = res.body?.data?.status;
  const pickupCode = res.body?.data?.pickupCode;
  console.log(`  订单状态: ${finalStatus}`);
  console.log(`  取票码: ${pickupCode || '(无)'}`);

  if (finalStatus === 'paid' && pickupCode) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅✅✅ 端到端测试通过！支付联动全链路成功');
    console.log('═══════════════════════════════════════════');
  } else {
    console.log('\n═══════════════════════════════════════════');
    console.log('  ❌ 订单未变为 paid，请检查回调日志');
    console.log('  提示：查看 ticket-service 控制台和 mock-aiztf.cjs 输出');
    console.log('═══════════════════════════════════════════');
  }

  // 附：查看 mock 支付单列表
  console.log('\n【附】Mock 支付单列表:');
  res = await request('GET', MOCK, '/mock/list');
  console.log(JSON.stringify(res.body, null, 2));
}

main().catch(e => console.error('测试异常:', e.message));
