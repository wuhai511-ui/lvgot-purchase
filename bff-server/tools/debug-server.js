#!/usr/bin/env node
/**
 * 钱账通接口调试工具 - 支持3.0和4.0版本
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 版本配置
const VERSIONS = {
  '3.0': {
    name: '钱账通3.0',
    gateway: 'https://test.wsmsd.cn/qzt/service/soa',
    appId: '7445002599175004161',
    configFile: path.join(__dirname, '..', 'keys', 'qzt3-config.json')
  },
  '4.0': {
    name: '钱账通4.0',
    gateway: 'https://qztuat.xc-fintech.com/gateway/soa',
    appId: '7348882579718766592',
    configFile: path.join(__dirname, '..', 'keys', 'private_key.pem'),
    publicKeyFile: path.join(__dirname, '..', 'keys', 'cloud_public_key.pem')
  }
};

const PORT = 3001;

// 加载配置
function loadConfig(version) {
  const config = VERSIONS[version];
  if (!config) return null;
  
  if (version === '3.0') {
    try {
      const configs = JSON.parse(fs.readFileSync(config.configFile, 'utf8'));
      return configs[0];
    } catch (e) {
      console.error('3.0配置加载失败:', e.message);
      return null;
    }
  } else {
    try {
      return {
        privateKey: fs.readFileSync(config.configFile, 'utf8'),
        publicKey: fs.readFileSync(config.publicKeyFile, 'utf8')
      };
    } catch (e) {
      console.error('4.0密钥加载失败:', e.message);
      return null;
    }
  }
}

// 3.0 DSA签名
function signData3(paramsStr, appId, timestamp, version, service, privateKeyHex) {
  const content = appId + timestamp + version + service + paramsStr;
  
  // 将hex字符串转换为PEM格式
  const keyBuffer = Buffer.from(privateKeyHex, 'hex');
  const base64Key = keyBuffer.toString('base64');
  const pemKey = `-----BEGIN DSA PRIVATE KEY-----\n${base64Key.match(/.{1,64}/g).join('\n')}\n-----END DSA PRIVATE KEY-----`;
  
  const sign = crypto.createSign('DSA-SHA1');
  sign.update(content, 'utf8');
  sign.end();
  
  // 返回base64格式的签名
  return sign.sign(pemKey, 'base64');
}

// 4.0 RSA签名
function signData4(content, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(content, 'utf8');
  sign.end();
  return sign.sign(privateKey, 'base64');
}

// RSA加密
function rsaEncrypt(plaintext, publicKey) {
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(plaintext)
  );
  return encrypted.toString('base64');
}

// 解析POST请求
function parsePostData(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// 处理请求
async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // 首页
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtmlPage());
    return;
  }
  
  // 版本列表
  if (req.method === 'GET' && url.pathname === '/api/versions') {
    const result = Object.entries(VERSIONS).map(([v, c]) => ({
      version: v,
      name: c.name,
      gateway: c.gateway,
      appId: c.appId
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 0, data: result }));
    return;
  }
  
  // 3.0签名
  if (req.method === 'POST' && url.pathname === '/api/3.0/sign') {
    try {
      const body = await parsePostData(req);
      const { appId, version, service, params } = body;
      
      const config = loadConfig('3.0');
      if (!config) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '3.0配置加载失败' }));
        return;
      }
      
      const timestamp = String(Math.floor(Date.now() / 1000));
      const paramsStr = JSON.stringify(params);
      const signContent = appId + timestamp + version + service + paramsStr;
      const signValue = signData3(paramsStr, appId, timestamp, version, service, config.dsaPrivateKey);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 0,
        signContent,
        signValue,
        timestamp
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 500, message: '签名失败', error: err.message }));
    }
    return;
  }
  
  // 4.0签名
  if (req.method === 'POST' && url.pathname === '/api/4.0/sign') {
    try {
      const body = await parsePostData(req);
      const { appId, version, service, params } = body;
      
      const config = loadConfig('4.0');
      if (!config) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '4.0密钥加载失败' }));
        return;
      }
      
      const timestamp = String(Math.floor(Date.now() / 1000));
      const paramsStr = JSON.stringify(params);
      const signContent = appId + timestamp + version + service + paramsStr;
      const signValue = signData4(signContent, config.privateKey);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 0,
        signContent,
        signValue,
        timestamp
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 500, message: '签名失败', error: err.message }));
    }
    return;
  }
  
  // 3.0加密
  if (req.method === 'POST' && url.pathname === '/api/3.0/encrypt') {
    try {
      const body = await parsePostData(req);
      const { plaintext } = body;
      
      const config = loadConfig('3.0');
      if (!config) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '3.0配置加载失败' }));
        return;
      }
      
      // 使用cloudRsaPublicKey加密
      const encrypted = rsaEncrypt(plaintext, config.cloudRsaPublicKey);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 0, encrypted }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 500, message: '加密失败', error: err.message }));
    }
    return;
  }
  
  // 4.0加密
  if (req.method === 'POST' && url.pathname === '/api/4.0/encrypt') {
    try {
      const body = await parsePostData(req);
      const { plaintext } = body;
      
      const config = loadConfig('4.0');
      if (!config) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '4.0密钥加载失败' }));
        return;
      }
      
      const encrypted = rsaEncrypt(plaintext, config.publicKey);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 0, encrypted }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 500, message: '加密失败', error: err.message }));
    }
    return;
  }
  
  // 3.0调用
  if (req.method === 'POST' && url.pathname === '/api/3.0/call') {
    const http = require('http');
    try {
      const body = await parsePostData(req);
      const { gateway, appId, version, service, params } = body;
      
      const config = loadConfig('3.0');
      if (!config) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '3.0配置加载失败' }));
        return;
      }
      
      const timestamp = String(Math.floor(Date.now() / 1000));
      const paramsStr = JSON.stringify(params);
      const signContent = appId + timestamp + version + service + paramsStr;
      const signValue = signData3(paramsStr, appId, timestamp, version, service, config.dsaPrivateKey);
      
      const requestBody = {
        app_id: appId,
        timestamp,
        version,
        sign: signValue,
        service,
        params: paramsStr
      };
      
      const targetUrl = new URL(gateway || config.serverUrl);
      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || 80,
        path: targetUrl.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            code: 0,
            signContent,
            signValue,
            request: requestBody,
            response: JSON.parse(data)
          }, null, 2));
        });
      });
      
      proxyReq.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '请求失败', error: err.message }));
      });
      
      proxyReq.write(JSON.stringify(requestBody));
      proxyReq.end();
      
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 500, message: '请求失败', error: err.message }));
    }
    return;
  }
  
  // 4.0调用
  if (req.method === 'POST' && url.pathname === '/api/4.0/call') {
    const https = require('https');
    try {
      const body = await parsePostData(req);
      const { gateway, appId, version, service, params } = body;
      
      const config = loadConfig('4.0');
      if (!config) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '4.0密钥加载失败' }));
        return;
      }
      
      const timestamp = String(Math.floor(Date.now() / 1000));
      const paramsStr = JSON.stringify(params);
      const signContent = appId + timestamp + version + service + paramsStr;
      const signValue = signData4(signContent, config.privateKey);
      
      const requestBody = {
        app_id: appId,
        timestamp,
        version,
        sign: signValue,
        service,
        params
      };
      
      const targetUrl = new URL(gateway || config.gateway);
      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || 443,
        path: targetUrl.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            code: 0,
            signContent,
            signValue,
            request: requestBody,
            response: JSON.parse(data)
          }, null, 2));
        });
      });
      
      proxyReq.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '请求失败', error: err.message }));
      });
      
      proxyReq.write(JSON.stringify(requestBody));
      proxyReq.end();
      
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 500, message: '请求失败', error: err.message }));
    }
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

// HTML页面
function getHtmlPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>钱账通接口调试工具 v2.0</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; text-align: center; }
    h1 span { font-size: 14px; color: #999; font-weight: normal; }
    
    .version-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .version-tab { 
      padding: 12px 24px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer;
      font-size: 16px; font-weight: 500; background: white; transition: all 0.2s;
    }
    .version-tab:hover { border-color: #1890ff; }
    .version-tab.active { border-color: #1890ff; background: #1890ff; color: white; }
    
    .panel { background: white; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); margin-bottom: 20px; overflow: hidden; }
    .panel-header { padding: 12px 20px; font-weight: 500; }
    .panel-header.success { background: #52c41a; color: white; }
    .panel-header.info { background: #1890ff; color: white; }
    .panel-header.warning { background: #faad14; color: white; }
    .panel-body { padding: 20px; }
    
    .form-row { display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 200px; }
    .form-group label { display: block; margin-bottom: 5px; color: #666; font-size: 14px; }
    .form-group input, .form-group select, .form-group textarea { 
      width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;
    }
    .form-group textarea { min-height: 100px; resize: vertical; font-family: monospace; }
    
    .btn { padding: 10px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 10px; }
    .btn-primary { background: #1890ff; color: white; }
    .btn-primary:hover { background: #40a9ff; }
    .btn-success { background: #52c41a; color: white; }
    .btn-success:hover { background: #73d13d; }
    .btn-warning { background: #faad14; color: white; }
    .btn-warning:hover { background: #ffc53d; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .result-box { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 4px; max-height: 400px; overflow: auto; font-family: 'Monaco', monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all; }
    
    .interface-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 15px; }
    .interface-item { padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 13px; }
    .interface-item:hover { border-color: #1890ff; background: #f0f7ff; }
    .interface-item.active { border-color: #1890ff; background: #1890ff; color: white; }
    
    .key-info { background: #f5f5f5; padding: 12px 15px; border-radius: 4px; margin-bottom: 15px; font-size: 13px; color: #666; line-height: 1.8; }
    .key-info code { background: #e8e8e8; padding: 2px 6px; border-radius: 2px; font-family: monospace; }
    
    .version-3 { display: none; }
    .version-4 { display: none; }
    .version-3.active { display: block; }
    .version-4.active { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💰 钱账通接口调试工具 <span>v2.0 - 支持3.0/4.0</span></h1>
    
    <div class="version-tabs">
      <div class="version-tab active" data-version="3.0">📌 钱账通 3.0 (拉卡拉)</div>
      <div class="version-tab" data-version="4.0">📌 钱账通 4.0</div>
    </div>
    
    <!-- 3.0 配置 -->
    <div class="version-3 active">
      <div class="panel">
        <div class="panel-header info">⚙️ 3.0 配置信息</div>
        <div class="panel-body">
          <div class="key-info">
            <strong>版本:</strong> 钱账通 3.0 (拉卡拉SIT)<br>
            <strong>网关:</strong> <code>https://test.wsmsd.cn/qzt/service/soa</code><br>
            <strong>App ID:</strong> <code>7445002599175004161</code><br>
            <strong>签名算法:</strong> DSA with SHA1<br>
            <strong>加密算法:</strong> RSA PKCS1 Padding<br>
            <strong>密钥:</strong> qzt3-config.json
          </div>
        </div>
      </div>
      
      <div class="panel">
        <div class="panel-header info">📡 3.0 接口选择</div>
        <div class="panel-body">
          <div class="interface-grid">
            <div class="interface-item" data-service="member.open.part.page.url.get">会员开户(H5页面)</div>
            <div class="interface-item" data-service="member.query.commn">会员查询</div>
            <div class="interface-item" data-service="merchant.open.commn">商户开通</div>
            <div class="interface-item" data-service="merchant.query.commn">商户查询</div>
            <div class="interface-item" data-service="account.open.commn">账户开户</div>
            <div class="interface-item" data-service="account.query.commn">账户查询</div>
            <div class="interface-item" data-service="split.apply.commn">分账申请</div>
            <div class="interface-item" data-service="split.query.commn">分账查询</div>
            <div class="interface-item" data-service="withdraw.apply.commn">提现申请</div>
            <div class="interface-item" data-service="recharge.apply.commn">充值申请</div>
            <div class="interface-item" data-service="file.upload.commn">文件上传</div>
            <div class="interface-item" data-service="bankcard.bind.commn">银行卡绑定</div>
          </div>
        </div>
      </div>
      
      <div class="panel">
        <div class="panel-header info">📝 3.0 请求参数</div>
        <div class="panel-body">
          <div class="form-row">
            <div class="form-group">
              <label>网关地址</label>
              <input type="text" id="gateway3" value="https://test.wsmsd.cn/qzt/service/soa">
            </div>
            <div class="form-group">
              <label>App ID</label>
              <input type="text" id="appId3" value="7445002599175004161">
            </div>
            <div class="form-group">
              <label>Version</label>
              <input type="text" id="version3" value="3.0" readonly>
            </div>
          </div>
          <div class="form-group">
            <label>参数 (JSON)</label>
            <textarea id="params3">{}</textarea>
          </div>
          <button class="btn btn-primary" onclick="call3()">🚀 发送请求</button>
          <button class="btn btn-success" onclick="signOnly3()">🔐 仅签名</button>
        </div>
      </div>
    </div>
    
    <!-- 4.0 配置 -->
    <div class="version-4">
      <div class="panel">
        <div class="panel-header info">⚙️ 4.0 配置信息</div>
        <div class="panel-body">
          <div class="key-info">
            <strong>版本:</strong> 钱账通 4.0<br>
            <strong>网关:</strong> <code>https://qztuat.xc-fintech.com/gateway/soa</code><br>
            <strong>App ID:</strong> <code>7348882579718766592</code><br>
            <strong>签名算法:</strong> SHA256 with RSA<br>
            <strong>加密算法:</strong> RSA PKCS1 Padding<br>
            <strong>密钥:</strong> keys/private_key.pem
          </div>
        </div>
      </div>
      
      <div class="panel">
        <div class="panel-header info">📡 4.0 接口选择</div>
        <div class="panel-body">
          <div class="interface-grid">
            <div class="interface-item" data-service="account.open.commn">账户开户</div>
            <div class="interface-item" data-service="account.query.commn">账户查询</div>
            <div class="interface-item" data-service="account.list.commn">账户列表</div>
            <div class="interface-item" data-service="split.apply.commn">分账申请</div>
            <div class="interface-item" data-service="split.query.commn">分账查询</div>
            <div class="interface-item" data-service="withdraw.apply.commn">提现申请</div>
            <div class="interface-item" data-service="withdraw.query.commn">提现查询</div>
            <div class="interface-item" data-service="recharge.apply.commn">充值申请</div>
            <div class="interface-item" data-service="recharge.query.commn">充值查询</div>
            <div class="interface-item" data-service="file.upload.commn">文件上传</div>
            <div class="interface-item" data-service="bankcard.bind.commn">银行卡绑定</div>
            <div class="interface-item" data-service="merchant.register.commn">商户入驻</div>
          </div>
        </div>
      </div>
      
      <div class="panel">
        <div class="panel-header info">📝 4.0 请求参数</div>
        <div class="panel-body">
          <div class="form-row">
            <div class="form-group">
              <label>网关地址</label>
              <input type="text" id="gateway4" value="https://qztuat.xc-fintech.com/gateway/soa">
            </div>
            <div class="form-group">
              <label>App ID</label>
              <input type="text" id="appId4" value="7348882579718766592">
            </div>
            <div class="form-group">
              <label>Version</label>
              <input type="text" id="version4" value="4.0">
            </div>
          </div>
          <div class="form-group">
            <label>参数 (JSON)</label>
            <textarea id="params4">{}</textarea>
          </div>
          <button class="btn btn-primary" onclick="call4()">🚀 发送请求</button>
          <button class="btn btn-success" onclick="signOnly4()">🔐 仅签名</button>
        </div>
      </div>
    </div>
    
    <!-- 签名结果 -->
    <div class="panel">
      <div class="panel-header warning">📤 签名原文</div>
      <div class="panel-body">
        <div class="result-box" id="signContent"></div>
      </div>
    </div>
    
    <!-- 响应结果 -->
    <div class="panel">
      <div class="panel-header success">📥 响应结果</div>
      <div class="panel-body">
        <div class="result-box" id="responseResult"></div>
      </div>
    </div>
  </div>

  <script>
    let currentVersion = '3.0';
    let selectedService = '';
    
    // 版本切换
    document.querySelectorAll('.version-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.version-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentVersion = tab.dataset.version;
        
        document.querySelector('.version-3').classList.toggle('active', currentVersion === '3.0');
        document.querySelector('.version-4').classList.toggle('active', currentVersion === '4.0');
      });
    });
    
    // 接口选择
    document.querySelectorAll('.interface-item').forEach(item => {
      item.addEventListener('click', () => {
        const parent = item.closest('.version-3, .version-4');
        parent.querySelectorAll('.interface-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        selectedService = item.dataset.service;
        
        // 填充示例参数
        fillExampleParams(selectedService, currentVersion);
      });
    });
    
    function fillExampleParams(service, version) {
      const examples3 = {
        'member.open.part.page.url.get': {
          out_member_no: 'M' + Date.now(),
          open_part: 2,
          back_url: 'http://example.com/callback',
          member_category: 0,
          member_role: 'R001',
          member_type: 1,
          phone: '13800138000'
        }
      };
      
      const examples4 = {
        'account.open.commn': {
          out_request_no: Date.now(),
          enterprise_type: 1,
          enterprise_name: '测试企业',
          legal_name: '张三',
          legal_id_card_no: 'encrypted_base64',
          legal_phone: '13800138000'
        }
      };
      
      const examples = version === '3.0' ? examples3 : examples4;
      const textarea = version === '3.0' ? document.getElementById('params3') : document.getElementById('params4');
      textarea.value = JSON.stringify(examples[service] || {}, null, 2);
    }
    
    async function signOnly3() {
      const gateway = document.getElementById('gateway3').value;
      const appId = document.getElementById('appId3').value;
      const version = document.getElementById('version3').value;
      const params = document.getElementById('params3').value;
      
      try {
        const paramsObj = JSON.parse(params);
        const response = await fetch('/api/3.0/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gateway, appId, version, service: selectedService, params: paramsObj })
        });
        const result = await response.json();
        document.getElementById('signContent').textContent = result.signContent || JSON.stringify(result, null, 2);
      } catch (err) {
        document.getElementById('signContent').textContent = '错误: ' + err.message;
      }
    }
    
    async function call3() {
      if (!selectedService) { alert('请先选择接口'); return; }
      
      const gateway = document.getElementById('gateway3').value;
      const appId = document.getElementById('appId3').value;
      const version = document.getElementById('version3').value;
      const params = document.getElementById('params3').value;
      
      try {
        const paramsObj = JSON.parse(params);
        const response = await fetch('/api/3.0/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gateway, appId, version, service: selectedService, params: paramsObj })
        });
        const result = await response.json();
        document.getElementById('responseResult').textContent = JSON.stringify(result, null, 2);
        document.getElementById('signContent').textContent = result.signContent || '';
      } catch (err) {
        document.getElementById('responseResult').textContent = '错误: ' + err.message;
      }
    }
    
    async function signOnly4() {
      const gateway = document.getElementById('gateway4').value;
      const appId = document.getElementById('appId4').value;
      const version = document.getElementById('version4').value;
      const params = document.getElementById('params4').value;
      
      try {
        const paramsObj = JSON.parse(params);
        const response = await fetch('/api/4.0/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gateway, appId, version, service: selectedService, params: paramsObj })
        });
        const result = await response.json();
        document.getElementById('signContent').textContent = result.signContent || JSON.stringify(result, null, 2);
      } catch (err) {
        document.getElementById('signContent').textContent = '错误: ' + err.message;
      }
    }
    
    async function call4() {
      if (!selectedService) { alert('请先选择接口'); return; }
      
      const gateway = document.getElementById('gateway4').value;
      const appId = document.getElementById('appId4').value;
      const version = document.getElementById('version4').value;
      const params = document.getElementById('params4').value;
      
      try {
        const paramsObj = JSON.parse(params);
        const response = await fetch('/api/4.0/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gateway, appId, version, service: selectedService, params: paramsObj })
        });
        const result = await response.json();
        document.getElementById('responseResult').textContent = JSON.stringify(result, null, 2);
        document.getElementById('signContent').textContent = result.signContent || '';
      } catch (err) {
        document.getElementById('responseResult').textContent = '错误: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
}

// 启动
http.createServer(handleRequest).listen(PORT, () => {
  console.log('\\n🔧 钱账通接口调试工具 v2.0 已启动');
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log('📌 支持: 钱账通 3.0 (拉卡拉) 和 钱账通 4.0\\n');
});
