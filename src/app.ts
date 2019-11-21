import path from 'path'
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import timeout from 'connect-timeout'
import favicon from 'serve-favicon'
import StatusMonitor from 'express-status-monitor'

// SETUP FILES
import Routes from './api'
import { errorHandler } from './middlewares/error/errorHandler'
import corsConfig from './configs/corsConfig'
import systemConfig from './configs/systemConfig'
import { expressErrorLogger, expressLogger, externalLogger } from './services/logger'

const statusMonitor = StatusMonitor()

function getApp() {
  const app = express()

  app.use([
    expressLogger,
    helmet(),
    cors(corsConfig),
    timeout(systemConfig.globalTimeout),
    compression(),
    express.urlencoded({ extended: true }),
    express.json(),
    express.static(path.join(__dirname, 'static/public')),
    favicon(path.join(__dirname, 'static', 'images', 'favicon.ico')),
    statusMonitor,
    Routes,
    externalLogger.errorHandler(),
    expressErrorLogger,
    errorHandler,
  ])

  return app
}

export default getApp
