import { RequestHandler } from 'express'
import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err)
  }

  res.status(err.status || 500)
  res.json({ message: err.message, error: err })
}

export function asyncErrorHandler(fn: Function): RequestHandler {
  return function(req, res, next) {
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    fn(req, res, next).catch(next)
  }
}
