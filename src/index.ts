import 'dotenv/config'

import http from 'http'
/**
 * Module dependencies.
 */
import path from 'path'

// import { onError, onListening, gracefulHandler } from './server/serverUtils'
import getApp from './app'
import systemConfig from './configs/systemConfig'
import getDatabase from './services/database'
import logger, { externalLogger } from './services/logger'

/**
 * Normalize a port into a number, string, or false.
 */

export function normalizePort(val: string) {
  const port = parseInt(val, 10)

  if (isNaN(port)) {
    // named pipe
    return undefined
  }

  if (port >= 0) {
    // port number
    return port
  }

  return undefined
}

export function onListening(server: any) {
  const addr = server.address() || ({} as any)
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
  const message = 'Listening on ' + bind
  logger.info(message)
  return message
}

export function onError(error: NodeJS.ErrnoException) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const port = process.env.PORT
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      process.exit(1)
      throw error
  }
}

getDatabase().then(() => {
  const port = systemConfig.port
  const app = getApp()
  logger.info('[*] Starting up server...')

  /**
   * Get port from environment and store in Express.
   */
  app.set('port', port)
  app.set('views', path.join(__dirname, 'static/views'))
  app.set('view engine', 'pug')

  /**
   * Create HTTP server.
   */

  const server = http.createServer(app)

  /**
   * Listen on provided port, on all network interfaces.
   */

  logger.info(`[!] Server started [http://localhost:${systemConfig.port} ]`)
  server.listen(port)
  server.on('error', onError)
  server.on('listening', () => onListening(server))
})

/**
 * Error handlers
 */

process
  .on('unhandledRejection', (reason, promise) => {
    externalLogger.error('Unhandled Rejection at: ' + promise + ' | reason: ' + reason)
    logger.error('Unhandled Rejection at: ' + promise + ' | reason: ' + reason)
    // Application specific logging, throwing an error, or other logic here
  })
  .on('uncaughtException', error => {
    externalLogger.error(error)
    logger.info('[UNCAUGHT EXCEPTION] ' + error.stack || error.message)
    logger.error(error)
    process.exit(1)
  })
