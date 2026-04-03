# 钱账通接口调试工具 v2.0

支持**钱账通 3.0**和**钱账通 4.0**双版本的Web调试工具。

## 启动

```bash
cd /home/admin/.openclaw/workspace/lvgot-purchase/bff-server/tools
node debug-server.js
```

然后打开浏览器访问: **http://localhost:3001**

## 版本支持

### 钱账通 3.0 (拉卡拉)
- **网关**: `http://sit-qzt-api.lakala.sh.in/service/soa`
- **App ID**: `7445002599175004161`
- **签名算法**: DSA with SHA1
- **加密算法**: RSA PKCS1 Padding
- **密钥配置**: `../keys/qzt3-config.json`

### 钱账通 4.0
- **网关**: `https://qztuat.xc-fintech.com/gateway/soa`
- **App ID**: `7348882579718766592`
- **签名算法**: SHA256 with RSA
- **加密算法**: RSA PKCS1 Padding
- **密钥文件**: `../keys/private_key.pem`

## API接口

| 端点 | 说明 |
|------|------|
| `GET /api/versions` | 获取支持的版本列表 |
| `POST /api/3.0/sign` | 3.0签名 |
| `POST /api/3.0/encrypt` | 3.0加密 |
| `POST /api/3.0/call` | 3.0调用接口 |
| `POST /api/4.0/sign` | 4.0签名 |
| `POST /api/4.0/encrypt` | 4.0加密 |
| `POST /api/4.0/call` | 4.0调用接口 |

## 签名规则

### 3.0
```
签名原文 = appId + timestamp + version + service + paramsJson
签名算法 = DSA with SHA1
```

### 4.0
```
签名原文 = appId + timestamp + version + service + paramsJson
签名算法 = SHA256 with RSA
```

## 密钥配置

### 3.0密钥 (qzt3-config.json)
```json
{
  "dsaPrivateKey": "...",
  "cloudRsaPublicKey": "...",
  "rsaPrivateKey": "..."
}
```

### 4.0密钥
- `private_key.pem` - 商户私钥（用于签名）
- `cloud_public_key.pem` - 钱账通公钥（用于加密）
