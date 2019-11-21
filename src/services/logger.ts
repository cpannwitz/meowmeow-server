import { ErrorRequestHandler, RequestHandler } from 'express'
import * as expressWinston from 'express-winston'
import winston from 'winston'
import Rollbar from 'rollbar'

import systemConfig from '../configs/systemConfig'

// * Default logger for about everything

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    // winston.format.simple(),
    winston.format.printf(info => `${info.level}: ${info.timestamp} | ${info.message}`),
    winston.format.errors({
      stack: systemConfig.isEnvDev() ? true : false,
    })
  ),
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
})

// * HTTP Logger & Error Logger Options

const expressWinstonConfig: expressWinston.LoggerOptions = {
  level: 'info',
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
  colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
  ignoreRoute: function(req, res) {
    // optional: allows to skip some log messages based on request and/or response
    if (req.url.startsWith('/graphql')) return true
    if (req.url.startsWith('/stylesheets')) return true
    return false
  },
}

// * External error logger

const rollbar = new Rollbar({
  accessToken: systemConfig.rollbarToken,
  captureUncaught: true,
  captureUnhandledRejections: true,
})

export const externalLogger = rollbar

export const expressLogger: RequestHandler = expressWinston.logger(expressWinstonConfig)

export const expressErrorLogger: ErrorRequestHandler = expressWinston.errorLogger(
  expressWinstonConfig
)

export default logger
