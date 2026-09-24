# Axiom Frontend

Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus。

    cd /Users/bytedance/Desktop/test_case/axiom-frontend
    npm install
    npm run dev

打开 http://127.0.0.1:5173。开发服务器将 /api 代理到 http://127.0.0.1:8000。

已初始化的本地演示账号：admin / Axiom-Local-2026!。首次登录后可在个人设置修改密码；此账号仅用于当前本地开发数据库，不会随源码自动在正式环境创建。

    npm run build
    npm run preview

生产构建在 dist/，通过 Nginx 提供静态文件并代理 API。preview 不自动代理 API，需配置 VITE_API_BASE_URL 或使用 Nginx。

## 页面

工作台、项目管理、接口管理、测试用例、测试套件、执行记录及详情、环境配置、用户管理、角色权限、操作审计、个人设置。

导航和按钮基于服务端返回权限显示；最终鉴权由 Django 强制执行。登录令牌存储于当前标签页 sessionStorage，刷新令牌轮换。

## 端到端验证

先启动 Django、Worker、Vite，安装 Google Chrome：

    npm run test:e2e

可设置 AXIOM_ADMIN_USER / AXIOM_ADMIN_PASSWORD，默认使用本地演示管理员。测试会编辑演示接口并执行示例套件，仅用于开发环境。截图生成到 test-results/。
