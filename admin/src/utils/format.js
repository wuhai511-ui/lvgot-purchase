/**
 * 格式化工具函数
 */

/**
 * 金额格式化
 * @param {number|string} amount - 金额
 * @returns {string} - 保留2位小数，添加千分位，如 1,234,567.89
 */
export function formatMoney(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 日期格式化
 * @param {Date|string|number} date - 日期
 * @returns {string} - 格式化为 YYYY-MM-DD HH:mm:ss
 */
export function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  const second = pad(d.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
