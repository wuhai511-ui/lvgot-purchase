/**
 * 旅购通分账系统 - Mock API Server
 * 模拟钱账通、钱包系统接口
 */

const http = require('http');
const url = require('url');

const PORT = 3000;

// Mock数据
const mockData = {
  accounts: [
    { id: '1', accountNo: 'LAK2026030001', name: '张三商行', type: 'merchant', balance: 125680.00, status: 'active', level: 1 },
    { id: '2', accountNo: 'LAK2026030002', name: '顺风旅行社', type: 'agency', balance: 356200.00, status: 'active', level: 2 },
    { id: '3', accountNo: 'LAK2026030003', name: '李四(导游)', type: 'guide', balance: 8560.00, status: 'active', level: 3 },
    { id: '4', accountNo: 'LAK2026030004', name: '王五(司机)', type: 'driver', balance: 4200.00, status: 'active', level: 3 },
  ],
  splitRecords: [
    { id: '1', orderNo: 'ORD20260326001', merchantName: '张三商行', agencyName: '顺风旅行社', guideName: '李四', totalAmount: 5000, splitAmount: 3500, status: 'success', createTime: '2026-03-26 10:30:00' },
    { id: '2', orderNo: 'ORD20260326002', merchantName: '张三商行', agencyName: '顺风旅行社', guideName: '李四', totalAmount: 8000, splitAmount: 5600, status: 'success', createTime: '2026-03-25 15:20:00' },
    { id: '3', orderNo: 'ORD20260325001', merchantName: '张三商行', agencyName: '顺风旅行社', guideName: '王五', totalAmount: 3000, splitAmount: 2100, status: 'pending', createTime: '2026-03-25 09:00:00' },
  ],
  withdrawRecords: [
    { id: '1', withdrawNo: 'WD20260326001', accountName: '李四(导游)', accountNo: 'LAK2026030003', bankName: '中国工商银行', amount: 5000, fee: 5, status: 'pending', createTime: '2026-03-26 11:00:00' },
    { id: '2', withdrawNo: 'WD20260325002', accountName: '张三商行', accountNo: 'LAK2026030001', bankName: '中国建设银行', amount: 20000, fee: 20, status: 'success', createTime: '2026-03-25 16:30:00' },
  ],
  stores: [
    { id: '1', name: '门店一(旗舰店)', merchantNo: 'M10001', terminalNo: 'T001', accountName: '张三商行', status: 'active' },
    { id: '2', name: '门店二(分店)', merchantNo: 'M10002', terminalNo: 'T002', accountName: '张三商行', status: 'active' },
  ],
};

// 工具函数：生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 工具函数：生成账号
function generateAccountNo() {
  return 'LAK' + Date.now().toString().slice(-10);
}

// 响应工具函数
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function sendSuccess(res, data) {
  sendJson(res, 200, { code: 0, message: 'success', data });
}

function sendError(res, message, code = -1) {
  sendJson(res, 200, { code, message });
}

// API路由处理
const routes = {
  // ==================== 账户相关 ====================
  'GET /api/accounts': (req, res) => {
    const { type, status, keyword } = url.parse(req.url, true).query;
    let accounts = [...mockData.accounts];
    if (type) accounts = accounts.filter(a => a.type === type);
    if (status) accounts = accounts.filter(a => a.status === status);
    if (keyword) accounts = accounts.filter(a => a.name.includes(keyword) || a.accountNo.includes(keyword));
    sendSuccess(res, { list: accounts, total: accounts.length });
  },

  'GET /api/accounts/:id': (req, res, id) => {
    const account = mockData.accounts.find(a => a.id === id);
    if (!account) return sendError(res, '账户不存在');
    sendSuccess(res, account);
  },

  'POST /api/accounts/open': (req, res) => {
    // 模拟开户申请
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { name, type, phone, idCard, bankAccount, bankName } = params;
      
      if (!name || !type || !phone) {
        return sendError(res, '参数不完整');
      }
      
      // 对公账户需要审核
      const isCompany = type === 'merchant' || type === 'agency';
      const newAccount = {
        id: generateId(),
        accountNo: generateAccountNo(),
        name,
        type,
        phone,
        balance: 0,
        status: isCompany ? 'pending_audit' : 'pending_liveness',
        level: type === 'merchant' ? 1 : type === 'agency' ? 2 : 3,
        auditStatus: isCompany ? '待审核' : '自动通过',
        livenessStatus: '待检测',
        createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      mockData.accounts.push(newAccount);
      sendSuccess(res, newAccount);
    });
  },

  'POST /api/accounts/:id/upgrade': (req, res, id) => {
    // 账户升级（人脸识别）
    const account = mockData.accounts.find(a => a.id === id);
    if (!account) return sendError(res, '账户不存在');
    
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { faceToken } = params;
      
      if (!faceToken) {
        return sendError(res, '人脸认证Token不能为空');
      }
      
      // 模拟升级成功
      account.level = Math.min(account.level + 1, 5);
      sendSuccess(res, { message: '升级成功', account });
    });
  },

  // ==================== 分账相关 ====================
  'GET /api/split/records': (req, res) => {
    const { status, startDate, endDate } = url.parse(req.url, true).query;
    let records = [...mockData.splitRecords];
    if (status) records = records.filter(r => r.status === status);
    sendSuccess(res, { list: records, total: records.length });
  },

  'POST /api/split/apply': (req, res) => {
    // 分账申请
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { orderNo, merchantAccountNo, agencyAccountNo, guideAccountNo, totalAmount, splitRatio } = params;
      
      if (!orderNo || !merchantAccountNo || !totalAmount) {
        return sendError(res, '参数不完整');
      }
      
      // 模拟分账计算
      const merchantAmount = totalAmount * 0.7;
      const agencyAmount = totalAmount * 0.15;
      const guideAmount = totalAmount * 0.15;
      
      const splitRecord = {
        id: generateId(),
        orderNo,
        merchantName: '张三商行',
        agencyName: '顺风旅行社',
        guideName: '李四',
        totalAmount,
        splitAmount: guideAmount,
        merchantAmount,
        agencyAmount,
        guideAmount,
        status: 'success',
        createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      mockData.splitRecords.push(splitRecord);
      sendSuccess(res, splitRecord);
    });
  },

  'POST /api/split/refund': (req, res) => {
    // 分账退款
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { splitNo, amount, reason } = params;
      
      if (!splitNo || !amount) {
        return sendError(res, '参数不完整');
      }
      
      const refundRecord = {
        id: generateId(),
        refundNo: 'REF' + Date.now().toString().slice(-10),
        splitNo,
        amount,
        reason: reason || '用户申请退款',
        status: 'pending',
        createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      sendSuccess(res, refundRecord);
    });
  },

  // ==================== 交易相关 ====================
  'POST /api/payment/pay': (req, res) => {
    // 付款订单支付
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { orderNo, amount, payMethod, verifyType } = params;
      
      if (!orderNo || !amount) {
        return sendError(res, '参数不完整');
      }
      
      // 模拟支付
      const paymentRecord = {
        id: generateId(),
        orderNo,
        amount,
        payMethod: payMethod || 'wechat',
        verifyType: verifyType || 'sms',
        status: 'paid',
        payTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      sendSuccess(res, paymentRecord);
    });
  },

  'POST /api/subscribe/webhook': (req, res) => {
    // 交易订阅Webhook配置
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { name, eventType, url } = params;
      
      if (!name || !eventType || !url) {
        return sendError(res, '参数不完整');
      }
      
      const webhook = {
        id: generateId(),
        name,
        eventType,
        eventTypeName: eventType === 'pay' ? '支付成功' : eventType === 'split' ? '分账完成' : '退款通知',
        url,
        status: true,
        createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      sendSuccess(res, webhook);
    });
  },

  // ==================== 提现相关 ====================
  'GET /api/withdraw/records': (req, res) => {
    const { status } = url.parse(req.url, true).query;
    let records = [...mockData.withdrawRecords];
    if (status) records = records.filter(r => r.status === status);
    sendSuccess(res, { list: records, total: records.length });
  },

  'POST /api/withdraw/apply': (req, res) => {
    // 提现申请
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { accountNo, amount, bankAccount, bankName } = params;
      
      if (!accountNo || !amount || !bankAccount || !bankName) {
        return sendError(res, '参数不完整');
      }
      
      // 计算手续费
      const fee = Math.max(1, Math.round(amount * 0.001));
      
      const withdrawRecord = {
        id: generateId(),
        withdrawNo: 'WD' + Date.now().toString().slice(-10),
        accountNo,
        bankAccount,
        bankName,
        amount,
        fee,
        realAmount: amount - fee,
        status: 'pending',
        createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      mockData.withdrawRecords.push(withdrawRecord);
      sendSuccess(res, withdrawRecord);
    });
  },

  // ==================== 门店相关 ====================
  'GET /api/stores': (req, res) => {
    sendSuccess(res, { list: mockData.stores, total: mockData.stores.length });
  },

  'POST /api/stores/bind': (req, res) => {
    // 门店绑定商户号/终端
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { storeId, merchantNo, terminalNo, accountNo } = params;
      
      if (!storeId || !merchantNo || !terminalNo) {
        return sendError(res, '参数不完整');
      }
      
      const store = mockData.stores.find(s => s.id === storeId);
      if (store) {
        store.merchantNo = merchantNo;
        store.terminalNo = terminalNo;
        store.accountName = accountNo;
      }
      sendSuccess(res, { message: '绑定成功', store });
    });
  },

  // ==================== 短信相关 ====================
  'POST /api/sms/send': (req, res) => {
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { phone, type } = params;
      
      if (!phone) {
        return sendError(res, '手机号不能为空');
      }
      
      // 模拟发送短信
      const code = Math.floor(100000 + Math.random() * 900000);
      sendSuccess(res, { message: '短信发送成功', code: '123456' }); // 演示用固定验证码
    });
  },

  // ==================== 人脸识别 ====================
  'POST /api/face/auth-url': (req, res) => {
    // 获取人脸授权链接
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const params = JSON.parse(Buffer.concat(body).toString());
      const { accountNo } = params;
      
      // 模拟返回人脸授权URL
      const authUrl = `https://api.lakala.com/face/auth?app_id=LVGOT&account=${accountNo}&redirect=${encodeURIComponent('lvgot://callback')}&t=${Date.now()}`;
      sendSuccess(res, { authUrl, token: 'FACE_' + Date.now().toString() });
    });
  },
};

// 创建服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS预检
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // 匹配路由
  let matched = false;
  for (const [route, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = route.split(' ');
    
    if (method !== routeMethod) continue;
    
    // 精确匹配
    if (pathname === routePath) {
      handler(req, res);
      matched = true;
      break;
    }
    
    // 参数匹配 (如 /api/accounts/:id)
    const routeParts = routePath.split('/');
    const pathParts = pathname.split('/');
    
    if (routeParts.length === pathParts.length) {
      let match = true;
      let param = null;
      
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          param = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }
      
      if (match && param) {
        handler(req, res, param);
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    sendError(res, 'API不存在: ' + method + ' ' + pathname);
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     旅购通分账系统 - Mock API Server                   ║
║     运行在: http://localhost:${PORT}                      ║
╠═══════════════════════════════════════════════════════╣
║  账户管理                                              ║
║  - GET  /api/accounts          账户列表               ║
║  - GET  /api/accounts/:id      账户详情               ║
║  - POST /api/accounts/open     开户申请               ║
║  - POST /api/accounts/:id/upgrade 账户升级            ║
╠═══════════════════════════════════════════════════════╣
║  分账管理                                              ║
║  - GET  /api/split/records     分账记录               ║
║  - POST /api/split/apply       分账申请               ║
║  - POST /api/split/refund      分账退款               ║
╠═══════════════════════════════════════════════════════╣
║  交易管理                                              ║
║  - POST /api/payment/pay        付款支付               ║
║  - POST /api/subscribe/webhook Webhook订阅            ║
╠═══════════════════════════════════════════════════════╣
║  提现管理                                              ║
║  - GET  /api/withdraw/records  提现记录               ║
║  - POST /api/withdraw/apply    提现申请               ║
╠═══════════════════════════════════════════════════════╣
║  其他                                                  ║
║  - GET  /api/stores             门店列表               ║
║  - POST /api/stores/bind       门店绑定               ║
║  - POST /api/sms/send          发送短信               ║
║  - POST /api/face/auth-url     人脸授权链接           ║
╚═══════════════════════════════════════════════════════╝
  `);
});
