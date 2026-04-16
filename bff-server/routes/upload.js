/**
 * 文件上传路由
 * 支持本地文件转存阿里云 OSS，同时调用 QZT 文件上传接口（用于需要向 QZT 提交文件的场景）
 *
 * POST /api/upload/oss          — 上传文件到 OSS，返回 URL
 * POST /api/upload/qzt          — 上传文件到 OSS，再调用 QZT file.upload.commn 注册
 * GET  /api/upload/signed-url   — 获取 OSS 私有文件的签名访问 URL
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const { callQzt } = require('../tools/qzt-service');
const ossClient = require('../tools/oss-client');

/**
 * 生成 OSS 文件路径
 * @param {string} category - 分类：merchants / stores / bank-cards / id-cards / biz-license
 * @param {number} merchantId
 * @param {string} originalFilename
 */
function genOSSPath(category, merchantId, originalFilename) {
  const ext = path.extname(originalFilename || '.jpg').toLowerCase();
  const hash = crypto.randomBytes(4).toString('hex');
  const timestamp = Date.now();
  return `lvgot/${category}/${merchantId}/${timestamp}_${hash}${ext}`;
}

/**
 * POST /api/upload/oss
 * 上传文件到 OSS
 * Body: form-data file + fields (category, merchant_id)
 */
router.post('/oss', async (req, res) => {
  try {
    // 支持 form-data（multer）或 JSON base64
    let fileBuffer = null;
    let mimeType = 'application/octet-stream';
    let originalname = 'file';

    if (req.body && req.body.file_content && req.body.file_name) {
      // JSON 模式：base64 文件内容
      const { file_content, file_name, content_type, category, merchant_id } = req.body;
      fileBuffer = Buffer.from(file_content, 'base64');
      mimeType = content_type || 'application/octet-stream';
      originalname = file_name;

      const ossPath = genOSSPath(category || 'misc', parseInt(merchant_id) || 0, originalname);
      const url = await ossClient.uploadFile(ossPath, fileBuffer, mimeType);

      return res.json({ code: 0, data: { url, path: ossPath, size: fileBuffer.length } });
    }

    // form-data 模式（需配合 multer 等中间件，暂支持 busboy/raw body）
    // 优先读取原始 body
    if (Buffer.isBuffer(req.body?.file_buffer)) {
      const { file_buffer, file_name, content_type, category, merchant_id } = req.body;
      fileBuffer = Buffer.from(file_buffer, 'base64');
      mimeType = content_type || 'application/octet-stream';
      originalname = file_name || 'upload';

      const ossPath = genOSSPath(category || 'misc', parseInt(merchant_id) || 0, originalname);
      const url = await ossClient.uploadFile(ossPath, fileBuffer, mimeType);

      return res.json({ code: 0, data: { url, path: ossPath, size: fileBuffer.length } });
    }

    return res.status(400).json({ code: 400, message: '未提供文件内容，请发送 file_content (base64) + file_name' });
  } catch (err) {
    console.error('[upload/oss] 上传失败:', err.message);
    res.status(500).json({ code: 500, message: '上传失败: ' + err.message });
  }
});

/**
 * POST /api/upload/qzt
 * 上传文件到 OSS，再调用 QZT file.upload.commn 注册
 * Body: file_content (base64), file_name, content_type, category, merchant_id, biz_type
 *
 * QZT file.upload.commn 需要 file_content 参与签名但不过手
 */
router.post('/qzt', async (req, res) => {
  try {
    const { file_content, file_name, content_type, category, merchant_id, biz_type } = req.body;
    if (!file_content || !file_name) {
      return res.status(400).json({ code: 400, message: '缺少 file_content 或 file_name' });
    }

    // 1. 先存 OSS
    const fileBuffer = Buffer.from(file_content, 'base64');
    const mimeType = content_type || 'application/octet-stream';
    const ossPath = genOSSPath(category || 'misc', parseInt(merchant_id) || 0, file_name);
    const ossUrl = await ossClient.uploadFile(ossPath, fileBuffer, mimeType);

    // 2. 调用 QZT 文件上传接口
    const qztResult = await callQzt('file.upload.commn', {
      file_content,       // QZT 直连上传，不中转大文件
      file_name,
      content_type: mimeType,
      biz_type: biz_type || 'MERCHANT_CERT',
    });

    res.json({
      code: 0,
      data: {
        oss_url: ossUrl,
        oss_path: ossPath,
        qzt_result: qztResult,
      },
    });
  } catch (err) {
    console.error('[upload/qzt] 上传失败:', err.message);
    res.status(500).json({ code: 500, message: '上传失败: ' + err.message });
  }
});

/**
 * GET /api/upload/signed-url
 * 获取 OSS 私有文件的签名访问 URL（临时 URL）
 * Query: path (OSS 路径，如 lvgot/merchants/123/abc.jpg)
 *        expires (有效期秒数，默认 3600)
 */
router.get('/signed-url', async (req, res) => {
  try {
    const { path: ossPath, expires } = req.query;
    if (!ossPath) return res.status(400).json({ code: 400, message: '缺少 path 参数' });

    const url = await ossClient.getSignedUrl(ossPath, parseInt(expires) || 3600);
    res.json({ code: 0, data: { url, expires: parseInt(expires) || 3600 } });
  } catch (err) {
    console.error('[upload/signed-url] 获取签名 URL 失败:', err.message);
    res.status(500).json({ code: 500, message: '获取签名 URL 失败: ' + err.message });
  }
});

module.exports = router;
