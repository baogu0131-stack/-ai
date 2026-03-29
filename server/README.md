# 探宝AI 登录注册后端服务

本项目使用 Node.js + Express + MySQL 实现，提供了真实可用的手机号验证码登录和 OAuth 登录模拟接口，并通过 JWT 实现会话保持。

## 环境要求
- Node.js >= 18
- MySQL >= 8.0

## 本地运行部署步骤

### 1. 数据库配置
1. 确保本地或远程 MySQL 已经启动。
2. 使用工具（如 Navicat, DataGrip）连接 MySQL，执行项目根目录下的 `db.sql`，该脚本会自动创建 `tanbao_ai` 数据库及所需的 `users` 和 `verification_codes` 表。

### 2. 后端服务配置
1. 进入 `server` 目录。
2. 复制或修改 `.env` 文件，根据你的真实 MySQL 配置修改 `DB_USER` 和 `DB_PASSWORD`：
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=你的数据库密码
   DB_NAME=tanbao_ai
   JWT_SECRET=super_secret_jwt_key_tanbao_ai
   ```
3. 在 `server` 目录下安装依赖：
   ```bash
   npm install
   ```
4. 启动开发服务器：
   ```bash
   npm run dev
   ```
   服务将运行在 `http://localhost:3001`。

### 3. 前端服务配置
1. 在项目根目录下，确保已安装依赖：
   ```bash
   npm install
   ```
2. 启动前端开发服务器：
   ```bash
   npm run dev
   ```
3. 访问前端页面，即可体验完整的真实登录注册流程。

### 功能说明
- **获取验证码**：由于未真实对接短信服务，调用获取验证码后，控制台会打印出验证码，并在前端弹窗中显示。直接使用该验证码进行登录即可。
- **OAuth登录**：点击微信/QQ登录后，会自动模拟授权过程，在数据库中生成绑定了对应 provider openid 的新用户并实现免密登录。
- **JWT会话保持**：登录成功后下发 Token（7天有效），保存在前端 `localStorage`。每次页面刷新会自动请求 `/api/auth/me` 同步最新用户信息。
- **数据联动**：前端用户登录状态已和原有探宝 AI 行程规划的 `isElderlyMode`、长辈模式等业务数据完全打通。
