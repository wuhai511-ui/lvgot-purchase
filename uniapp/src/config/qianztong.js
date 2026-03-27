/**
 * 钱账通·支付账户 API 配置
 * AppID 和密钥等敏感信息，请勿提交到公开仓库
 */

// 测试环境
const QZT_CONFIG = {
  appId: '7348882579718766592',
  gateway: 'https://qztuat.xc-fintech.com/gateway/soa',
  version: '4.0',
  // 签名私钥（绝对路径，从环境变量或本地文件读取）
  privateKeyPath: '/workspace/uniapp/src/config/keys/private_key.pem',
  // 钱账通平台公钥（验签用）
  platformPublicKeyPath: '/workspace/uniapp/src/config/keys/cloud_public_key.pem',
}

export default QZT_CONFIG
