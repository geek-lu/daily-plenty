/** [INPUT]: 本机 PORT 与 setup/status 接口。[OUTPUT]: 启动健康检查退出码。
 * [POS]: 验证 Next 路由、SQLite 原生驱动和迁移均可用，不创建用户或账单。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
const url = `http://127.0.0.1:${process.env.PORT || '3000'}/api/setup/status`;
let failure = '尚未启动';
for (let attempt = 0; attempt < 15; attempt++) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    const data = await response.json();
    if (!response.ok || typeof data.initialized !== 'boolean' || data.configured !== true)
      throw new Error(`状态异常：${response.status}`);
    console.log('应用、接口和数据库健康检查通过');
    process.exit(0);
  } catch (error) {
    failure = error.message;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
console.error(`健康检查失败：${failure}`);
process.exit(1);
