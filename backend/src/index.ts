import 'dotenv/config'

import { createServer } from 'http'

import app from './app.js'
import { connectMongoDB } from './config/database.js'
import { initSocket } from './socket/index.js'

const PORT = Number(process.env.PORT) || 5000

async function startServer(): Promise<void> {
  try {
    await connectMongoDB()

    const httpServer = createServer(app)
    initSocket(httpServer)

    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
