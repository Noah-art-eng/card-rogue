# Card Game

卡牌游戏 monorepo 脚手架。当前为 **Phase 0** 工程基础阶段，仅包含前后端项目结构与开发规范，尚未实现游戏业务功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + Vite + TypeScript |
| 后端 | Node.js + Express + TypeScript |
| 包管理 | npm workspaces |

## 目录结构

```
CardGame/
├── frontend/          # 前端应用
├── backend/           # 后端 API 服务
├── package.json       # 根 workspace 配置
├── package-lock.json  # 统一依赖锁文件
└── README.md
```

## 环境要求

- Node.js 18+
- npm 9+

## 快速开始

```bash
# 1. 安装依赖（在根目录执行）
npm install

# 2. 启动前端开发服务器（http://localhost:5173）
npm run dev:frontend

# 3. 启动后端开发服务器（http://localhost:5000）
npm run dev:backend
```

## 可用脚本

在**根目录**执行：

| 命令 | 说明 |
|------|------|
| `npm run dev:frontend` | 启动前端开发服务器 |
| `npm run dev:backend` | 启动后端开发服务器 |
| `npm run build` | 构建前端 + 后端 |
| `npm run build:frontend` | 仅构建前端 |
| `npm run build:backend` | 仅构建后端 |

各 workspace 另有独立脚本（在对应目录或通过 `-w` 调用）：

- **frontend**：`dev`、`build`、`lint`、`preview`
- **backend**：`dev`、`build`、`start`

## 构建与生产启动

```bash
# 构建全部
npm run build

# 启动后端生产服务（需先 build:backend）
npm run start -w backend
```

## 健康检查

后端提供健康检查接口：

```
GET http://localhost:5000/api/health
```

预期响应：

```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

前端开发时，`/api/*` 请求会通过 Vite 代理转发到后端（`http://localhost:5000`）。

## 环境变量

后端参考 `backend/.env.example`：

```bash
PORT=5000
```

复制为 `backend/.env` 后按需修改。`.env` 文件不应提交到 Git。

## 代码质量（当前状态）

- **frontend**：`build` 含 TypeScript 类型检查（`tsc -b`）；另有 `lint`（ESLint）可手动运行
- **backend**：`build` 含 TypeScript 编译与类型检查；暂未配置 ESLint

后续 Phase 可考虑在根目录增加统一的 `lint` / `typecheck` 脚本，当前阶段保持简单，不强制引入额外工具链。

## 当前未实现

以下功能计划在后续阶段实现，**当前代码库中不存在**：

- MongoDB
- JWT 认证
- Socket.IO
- 游戏逻辑 / 登录页面

## 提交 Git 时注意

以下内容**不应**提交：

- `node_modules/`
- `dist/`
- `.env` 及含敏感信息的 env 文件
- 日志、系统缓存文件

`package-lock.json` 应提交，以保证依赖版本一致。
