/**
 * Express 应用的组装入口。
 * 这里挂载 CORS、JSON 解析、静态头像、HTTP 路由和统一错误处理，供 HTTP 与 Socket 服务器共同使用。
 */

import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getFrontendCorsConfig } from './config/corsOrigin.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import leaderboardRoutes from './routes/leaderboard.js'
import matchesRoutes from './routes/matches.js'
import rogueRoutes from './routes/rogue.js'
import usersRoutes from './routes/users.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cors(getFrontendCorsConfig()))
app.use(express.json())
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/matches', matchesRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/rogue', rogueRoutes)

app.use(errorHandler)

export default app
