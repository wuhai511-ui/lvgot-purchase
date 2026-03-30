/**
 * localStorage 封装
 */

const TOKEN_KEY = 'token';
const MERCHANT_INFO_KEY = 'merchantInfo';

/**
 * 获取 token
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 设置 token
 * @param {string} token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 删除 token
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 获取商户信息
 * @returns {object|null}
 */
export function getMerchantInfo() {
  const raw = localStorage.getItem(MERCHANT_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 设置商户信息
 * @param {object} info
 */
export function setMerchantInfo(info) {
  localStorage.setItem(MERCHANT_INFO_KEY, JSON.stringify(info));
}
