import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { videosRouter } from './routes/videos.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// Log all incoming requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

app.use('/api/videos', videosRouter)

process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err))
process.on('unhandledRejection', (err) => console.error('[UNHANDLED REJECTION]', err))

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
