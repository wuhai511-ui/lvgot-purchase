/**
 * BFF Server 入口
 * 启动服务并监听端口
 */
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const app = await createApp();

    app.listen(PORT, () => {
      console.log(`[BFF Server] 钱账通真实对接服务已启动运行在 http://localhost:${PORT}`);
      console.log(`[Debug Tool] 调试工具地址: http://localhost:${PORT}/api/debug/tool`);
    });
  } catch (error) {
    console.error('启动失败:', error.message);
    process.exit(1);
  }
}

start();
