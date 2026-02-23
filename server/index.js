import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { readdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3001
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

/**
 * Dynamic controller loader
 * Scans /controllers directory and registers routes automatically
 * Pattern: /api/:controller/:action/:key?
 */
async function loadControllers() {
  const controllersPath = join(__dirname, 'controllers')
  const controllers = await readdir(controllersPath)

  for (const controller of controllers) {
    const controllerPath = join(controllersPath, controller)
    const actions = await readdir(controllerPath)

    for (const actionFile of actions) {
      if (!actionFile.endsWith('.js')) continue

      const action = actionFile.replace('.js', '')
      const modulePath = join(controllerPath, actionFile)
      const module = await import(modulePath)
      const handler = module.default

      const route = `/api/${controller}/${action}{/:key}`

      // Determine middleware based on action name
      const middleware = action === 'upload' ? [upload.single('file')] : []

      // Register route for all HTTP methods, let the handler decide
      app.all(route, ...middleware, handler)

      console.log(`Registered: ${route}`)
    }
  }
}

async function start() {
  await loadControllers()

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start().catch(console.error)
