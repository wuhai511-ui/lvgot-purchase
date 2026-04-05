/**
 * 认证中间件
 * 
 * DEMO_MODE=true: 所有请求直接放行（仅演示用，生产环境必须设为 false）
 * DEMO_MODE=false: 使用 JWT 验证请求 Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DEMO_MODE = process.env.DEMO_MODE === 'true';

/**
 * JWT 签发（登录成功时调用）
 */
function issueToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * JWT 验证
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

/**
 * 中间件：强制认证（非演示模式）
 */
function requireAuth(req, res, next) {
  // 演示模式：放行但记录警告
  if (DEMO_MODE) {
    req.auth = { demo: true, userId: 'demo-user' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未授权：缺少有效 Token' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ code: 401, message: 'Token 无效或已过期' });
  }

  req.auth = decoded;
  next();
}

/**
 * 中间件：可选认证（检测到 Token 则验证，未携带则继续）
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.auth = null;
    return next();
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  req.auth = decoded; // null 如果无效也不阻挡
  next();
}

/**
 * 计算密码哈希（用于用户密码存储）
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = {
  JWT_SECRET,
  DEMO_MODE,
  issueToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  hashPassword
};
