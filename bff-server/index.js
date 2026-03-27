require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { KJUR } = require('jsrsasign');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('express-async-errors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 钱账通配置 ---
const QZT_CONFIG = {
  appId: process.env.QZT_APP_ID || '7348882579718766592',
  version: '4.0',
  gateway: 'https://qztuat.xc-fintech.com/gateway/soa',
  privateKey: fs.readFileSync(path.join(__dirname, 'keys', 'private_key.pem'), 'utf8'),
  publicKey: fs.readFileSync(path.join(__dirname, 'keys', 'cloud_public_key.pem'), 'utf8')
};

// --- 初始化 SQLite 数据库 ---
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
  // 交易流水存储表
  db.run(`CREATE TABLE IF NOT EXISTS trade_flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_no TEXT,
    order_no TEXT,
    trade_type TEXT,
    amount REAL,
    status TEXT,
    raw_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// --- 加签 / 验签工具 ---
function signData(content) {
  const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
  sig.init(QZT_CONFIG.privateKey);
  sig.updateString(content);
  return sig.sign();
}

function verifyData(data, signValue) {
  if (!signValue) return true;
  try {
    const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
    sig.init(QZT_CONFIG.publicKey);
    sig.updateString(data);
    return sig.verify(signValue);
  } catch(e) {
    return false;
  }
}

// ================= API: 代理钱账通接口 =================
app.post('/api/qzt/proxy', async (req, res) => {
  const { service, params } = req.body;
  if (!service) return res.status(400).json({ error: 'Missing service name' });

  const timestamp = String(Math.floor(Date.now() / 1000));
  const paramsStr = params ? JSON.stringify(params) : '{}';
  const signContent = QZT_CONFIG.appId + timestamp + QZT_CONFIG.version + service + paramsStr;
  
  const signValue = signData(signContent);

  const body = {
    app_id: QZT_CONFIG.appId,
    timestamp,
    version: QZT_CONFIG.version,
    sign: signValue,
    service,
    params: paramsStr
  };

  try {
    const response = await axios.post(QZT_CONFIG.gateway, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Gateway Request Failed', 
      details: error.response ? error.response.data : error.message 
    });
  }
});

// ================= API: 门店绑定 (示例) =================
app.post('/api/merchant/bind', async (req, res) => {
  const { merchant_no } = req.body;
  // TODO: 如果需要调钱账通接口绑定商户号可在此构造内部调用
  res.json({ code: 0, message: '绑定模拟成功', merchant_no });
});

// ================= WEBHOOK: 接收交易流水通知 =================
app.post('/webhook/trade-flow', (req, res) => {
  // 1. 接收钱账通发来的通知体
  const payload = req.body;
  
  // 2. 验签 (真实情况请严格判断参数并组合验签)
  // const isValid = verifyData(payload.result, payload.sign);
  // if (!isValid) return res.status(403).send('FAIL');

  try {
    // 假设 result 包含明文 JSON (如: { merchant_no: 'xxx', amount: 100 })
    const data = JSON.parse(payload.result || '{}');
    
    // 3. 落库
    db.run(
      `INSERT INTO trade_flows (merchant_no, order_no, trade_type, amount, status, raw_data) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.merchant_no, data.order_no, data.trade_type, data.amount, data.status, JSON.stringify(data)],
      function(err) {
        if (err) {
          console.error('Insert flow err:', err);
          return res.status(500).send('FAIL');
        }
        console.log('✔ 已记录一笔真实交易流水:', data.order_no);
        // 4. 返回标准成功的 ACK，防止钱账通持续堆积重复推送
        res.send('SUCCESS'); 
    });
  } catch (e) {
    res.status(400).send('FAIL');
  }
});

// ================= API: 前端获取交易流水记录 (展示用) =================
app.get('/api/flows', (req, res) => {
  db.all(`SELECT * FROM trade_flows ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ code: 0, data: rows });
  });
});

// 统一错误捕获
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[BFF Server] 钱账通真实对接服务已启动运行在 http://localhost:${port}`);
  console.log(`[BFF Server] 请在钱账通管理后台将商户 Webhook 配置为: http://您的公网IP/webhook/trade-flow`);
});
