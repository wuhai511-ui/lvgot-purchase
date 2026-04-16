/**
 * 修复 db-sqlite.js 中 DEFAULT 'now' 的迁移脚本
 * 执行一次即可，将所有 'now' 替换为 CURRENT_TIMESTAMP
 */
const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'db-sqlite.js');
let content = fs.readFileSync(dbFile, 'utf8');

const count = (content.match(/DEFAULT 'now'/g) || []).length;
console.log(`Found ${count} occurrences of DEFAULT 'now'`);

content = content.replace(/DEFAULT 'now'/g, 'DEFAULT CURRENT_TIMESTAMP');

fs.writeFileSync(dbFile, content);
console.log(`Fixed. Writing back to ${dbFile}`);