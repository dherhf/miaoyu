/**
 * 支付联动端到端联调脚本（妙语购票 × AI知托付）
 *
 * 前置条件：
 *   我方：ticket-service(8083) + gateway(9000) 已启动
 *   对方：gateway(8080) + user-center(8081) + account-center(8082) + business-center(8085) 已启动
 *
 * 用法: node test-integration.cjs
 */
const http = require('http');
const crypto = require('crypto');

// ---- 配置 ----
const MY_TICKET = 'localhost:8083';   // 我方 ticket-service
const MY_GATEWAY = 'localhost:9000';  // 我方 gateway
const OPP_GATEWAY = 'localhost:8080'; // 对方 gateway

// 对方测试账号
const OPP_PHONE = '13974539885';
const OPP_LOGIN_PWD = 'Drh256998';
const OPP_PAY_PWD = '256998';

// 我方 JWT secret
const JWT_SECRET = 'e7c75bac24ee42d980929bc7eccfa76bA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';

// ---- HTTP 请求封装 ----
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

// 生成我方 JWT (HS256, user type)
function genMyJwt(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), type: 'user', iss: 'miaoyu', iat: now, exp: now + 86400 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('═'.repeat(55));
  console.log('  支付联动端到端联调（妙语购票 × AI知托付）');
  console.log('═'.repeat(55));

  // ===== Step 1: 对方用户登录 =====
  console.log('\n【Step 1】对方用户登录...');
  const loginIdem = crypto.randomUUID();
  const loginRes = await request('POST', OPP_GATEWAY, '/api/user/v1/auth/login', {
    body: { phone: OPP_PHONE, loginPassword: OPP_LOGIN_PWD },
    headers: { 'X-Idempotency-Key': loginIdem },
  });
  if (loginRes.body?.success !== true) {
    console.log('  ❌ 登录失败:', JSON.stringify(loginRes.body).substring(0, 300));
    return;
  }
  const oppJwt = loginRes.body.data.jwt;
  const oppUserId = loginRes.body.data.userId;
  console.log(`  ✅ 登录成功: userId=${oppUserId}, jwt=${oppJwt?.substring(0, 20)}...`);

  const oppAuthHeaders = {
    'Authorization': `Bearer ${oppJwt}`,
    'X-Idempotency-Key': crypto.randomUUID(),
  };

  // ===== Step 2: 我方查场次 =====
  console.log('\n【Step 2】查询场次...');
  const myUserId = 1;
  const myToken = genMyJwt(myUserId);
  const myAuthHeaders = {
    'Authorization': `Bearer ${myToken}`,
    'X-Request-Id': crypto.randomUUID(),
    'X-User-Id': String(myUserId),
    'X-User-Type': 'user',
  };

  const schRes = await request('GET', MY_TICKET, '/api/v1/schedules?page=1&size=1', { headers: myAuthHeaders });
  if (schRes.body?.code !== 0 || !schRes.body?.data?.records?.length) {
    console.log('  ❌ 无可用场次:', JSON.stringify(schRes.body).substring(0, 200));
    return;
  }
  const schedule = schRes.body.data.records[0];
  const scheduleId = Number(schedule.id);
  console.log(`  ✅ 场次: ${schedule.movieName} @ ${schedule.cinemaName}, id=${scheduleId}, price=${schedule.price}`);

  // ===== Step 3: 查座位 + 锁座 =====
  console.log('\n【Step 3】查询座位...');
  const seatRes = await request('GET', MY_TICKET, `/api/v1/schedules/${scheduleId}/seats`, { headers: myAuthHeaders });
  const seats = (seatRes.body?.data?.seats || []).filter(s => s.status === 'available');
  if (seats.length < 2) {
    console.log('  ❌ 可用座位不足');
    return;
  }
  const seatIds = seats.slice(0, 2).map(s => Number(s.hallCellId));
  console.log(`  ✅ 座位: ${JSON.stringify(seatIds)}`);

  console.log('\n【Step 4】锁座下单...');
  const lockRes = await request('POST', MY_TICKET, '/api/v1/orders/lock-seat', {
    headers: { 'Authorization': `Bearer ${myToken}`, 'X-Request-Id': crypto.randomUUID(), 'X-User-Id': String(myUserId), 'X-User-Type': 'user' },
    body: { scheduleId, seatIds, ticketCount: 2 },
  });
  if (lockRes.body?.code !== 0) {
    console.log('  ❌ 锁座失败:', JSON.stringify(lockRes.body).substring(0, 300));
    return;
  }
  const orderId = Number(lockRes.body.data.id);
  const orderNo = lockRes.body.data.orderNo;
  const totalAmount = lockRes.body.data.totalAmount;
  console.log(`  ✅ 订单已创建: id=${orderId}, orderNo=${orderNo}, amount=${totalAmount}`);

  // ===== Step 5: 支付（我方调对方创建支付单）=====
  console.log('\n【Step 5】支付订单（调对方创建支付单）...');
  const payRes = await request('POST', MY_TICKET, `/api/v1/orders/${orderId}/pay`, {
    headers: { 'Authorization': `Bearer ${myToken}`, 'X-Request-Id': crypto.randomUUID(), 'X-User-Id': String(myUserId), 'X-User-Type': 'user' },
  });
  if (payRes.body?.code !== 0) {
    console.log('  ❌ 支付失败:', JSON.stringify(payRes.body).substring(0, 400));
    return;
  }
  const payData = payRes.body.data;
  console.log(`  ✅ 支付单已创建:`);
  console.log(`     status=${payData.status} (应为 pending)`);
  console.log(`     paymentIntent=${payData.paymentNo?.substring(0, 30)}...`);
  console.log(`     payUrl=${payData.payUrl}`);

  if (!payData.paymentNo) {
    console.log('  ❌ 未返回 paymentIntent');
    return;
  }

  // ===== Step 6: 对方获取 paymentAuthRef =====
  console.log('\n【Step 6】获取支付授权(paymentAuthRef)...');
  const authRes = await request('POST', OPP_GATEWAY, '/api/user/v1/payment-authorizations', {
    body: { payPassword: OPP_PAY_PWD, operationType: 'TRANSFER', idempotencyKey: crypto.randomUUID() },
    headers: { 'Authorization': `Bearer ${oppJwt}`, 'X-Idempotency-Key': crypto.randomUUID() },
  });
  if (authRes.body?.success !== true) {
    console.log('  ❌ 获取支付授权失败:', JSON.stringify(authRes.body).substring(0, 300));
    return;
  }
  const paymentAuthRef = authRes.body.data.paymentAuthRef;
  console.log(`  ✅ paymentAuthRef=${paymentAuthRef?.substring(0, 16)}...`);

  // ===== Step 7: 对方确认支付 =====
  console.log('\n【Step 7】确认支付（触发对方转账+回调）...');
  const confirmRes = await request('POST', OPP_GATEWAY, '/api/user/v1/merchant-transfers/confirm', {
    body: { paymentIntent: payData.paymentNo, paymentAuthRef },
    headers: { 'Authorization': `Bearer ${oppJwt}`, 'X-Idempotency-Key': crypto.randomUUID() },
  });
  console.log(`  确认结果: success=${confirmRes.body?.success}, code=${confirmRes.body?.code}`);
  if (confirmRes.body?.data) {
    console.log(`  businessNo=${confirmRes.body.data.businessNo}, status=${confirmRes.body.data.orderStatus}`);
  }
  if (confirmRes.body?.success !== true) {
    console.log('  ❌ 确认支付失败:', JSON.stringify(confirmRes.body).substring(0, 400));
    // 仍继续检查订单状态（可能回调已到）
  }

  // ===== Step 8: 等待回调 + 验证订单 =====
  console.log('\n【Step 8】等待回调，验证订单状态...');
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    const detRes = await request('GET', MY_TICKET, `/api/v1/orders/${orderId}`, { headers: myAuthHeaders });
    const status = detRes.body?.data?.status;
    const pickupCode = detRes.body?.data?.pickupCode;
    console.log(`  [${i + 1}/15] 订单状态: ${status}, 取票码: ${pickupCode || '(无)'}`);
    if (status === 'paid' && pickupCode) {
      console.log('\n' + '═'.repeat(55));
      console.log('  ✅✅✅ 联调成功！支付联动全链路通过');
      console.log(`  订单: ${orderNo}, 取票码: ${pickupCode}`);
      console.log('═'.repeat(55));
      return;
    }
    if (status === 'cancelled') {
      console.log('\n  ❌ 订单已取消（支付失败或超时）');
      return;
    }
  }
  console.log('\n  ⏳ 30秒内未收到回调，请检查对方 MerchantCallbackService 日志');
}

main().catch(e => console.error('测试异常:', e.message));
