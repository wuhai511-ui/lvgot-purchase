require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { KJUR } = require('jsrsasign');
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

// --- 初始化 JSON 数据库 ---
const DB_FILE = path.join(__dirname, 'database.json');
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}
function getFlows() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveFlow(flow) {
  const flows = getFlows();
  flow.id = Date.now();
  flow.created_at = new Date().toISOString();
  flows.unshift(flow);
  fs.writeFileSync(DB_FILE, JSON.stringify(flows, null, 2));
}

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
  const paramsStr = params && Object.keys(params).length ? JSON.stringify(params) : '{}';
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
  res.json({ code: 0, message: '绑定模拟成功', merchant_no });
});

// ================= WEBHOOK: 接收交易流水通知 =================
app.post('/webhook/trade-flow', (req, res) => {
  const payload = req.body;
  try {
    const data = JSON.parse(payload.result || '{}');
    const dbData = { 
      merchant_no: data.merchant_no, 
      order_no: data.order_no, 
      trade_type: data.trade_type, 
      amount: data.amount, 
      status: data.status, 
      raw_data: JSON.stringify(data) 
    };
    saveFlow(dbData);
    console.log('✔ 已记录一笔真实交易流水:', data.order_no);
    res.send('SUCCESS');
  } catch (e) {
    res.status(400).send('FAIL');
  }
});

// ================= API: 前端获取交易流水记录 (展示用) =================
app.get('/api/flows', (req, res) => {
  try {
    const rows = getFlows();
    res.json({ code: 0, data: rows });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 统一错误捕获
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[BFF Server] 钱账通真实对接服务已启动运行在 http://localhost:${port}`);
});
