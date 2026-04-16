/**
 * 阿里云 OSS 文件存储客户端
 * 统一管理钱账通相关文件的上传/下载/删除
 */
const OSS = require('ali-oss');
const path = require('path');

// 单例
let client = null;

function getOSSClient() {
  if (!client) {
    const region = process.env.OSS_REGION;
    if (!region) {
      throw new Error('OSS_REGION environment variable is not set');
    }
    client = new OSS({
      region,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    });
  }
  return client;
}

/**
 * 上传文件 Buffer 到 OSS
 * @param {string} targetPath - OSS 路径，如 'merchants/123/business_license.jpg'
 * @param {Buffer|string} fileContent - 文件内容
 * @param {string} contentType - MIME 类型
 * @returns {Promise<string>} - 文件访问 URL
 */
async function uploadFile(targetPath, fileContent, contentType) {
  const oss = getOSSClient();
  const buffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent);
  const result = await oss.put(targetPath, buffer, {
    contentType,
  });
  return result.url;
}

/**
 * 获取私有 bucket 的签名访问 URL
 * @param {string} targetPath - OSS 路径
 * @param {number} expires - 有效期（秒），默认 3600
 * @returns {Promise<string>} - 签名 URL
 */
async function getSignedUrl(targetPath, expires = 3600) {
  const oss = getOSSClient();
  return oss.signatureUrl(targetPath, { expires });
}

/**
 * 删除 OSS 文件
 * @param {string} targetPath - OSS 路径
 */
async function deleteFile(targetPath) {
  const oss = getOSSClient();
  await oss.delete(targetPath);
}

module.exports = {
  getOSSClient,
  uploadFile,
  getSignedUrl,
  deleteFile,
};