# 腾讯视频链接生成器 - 秘钥登录版

基于Express的腾讯视频链接生成器，使用秘钥登录系统，替代原有的时间限制。

## 功能特点

- 秘钥登录系统（10个秘钥存储在后端）
- 未登录不显示主界面
- 支持手动输入视频ID或从列表选择
- 自动生成可播放的视频链接
- 支持复制链接和跳转到视频页面

## 安装步骤

1. 确保已安装 Node.js（建议 v14 或更高版本）
2. 在项目目录下运行：
   ```bash
   npm install
   ```

## 启动项目

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

服务器运行在 `http://localhost:6688`

## 秘钥列表

系统内置10个秘钥（可在 `server.js` 中修改）：
- KEY001
- KEY002
- KEY003
- KEY004
- KEY005
- KEY006
- KEY007
- KEY008
- KEY009
- KEY010

## API接口

### POST /api/login
登录接口
- 请求体：`{ "key": "秘钥" }`
- 响应：`{ "success": true/false, "message": "消息" }`

### GET /api/check-auth
检查认证状态
- 响应：`{ "authenticated": true/false }`

### POST /api/logout
退出登录
- 响应：`{ "success": true, "message": "退出成功" }`

### GET /api/video-data
获取视频数据（需要认证）
- 响应：video-data.json 的内容

## 部署说明

1. 修改 `server.js` 中的秘钥列表
2. 设置环境变量 `PORT` 指定端口（默认6688）
3. 设置 `NODE_ENV=production` 启用生产模式
4. 使用 PM2 或其他进程管理器保持服务运行

## 文件结构

```
d:\1.12\
├── index.html          # 前端页面
├── server.js           # Express后端服务器
├── package.json        # 项目配置
├── video-data.json     # 视频数据
└── README.md          # 项目说明
```

## 注意事项

- 登录状态使用 Cookie 存储，有效期24小时
- 视频数据接口需要登录后才能访问
- 建议在生产环境中使用 HTTPS
