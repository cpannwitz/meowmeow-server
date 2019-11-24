import admin from 'firebase-admin'
import { Request, Response, NextFunction } from 'express'
import logger, { externalLogger } from '../../services/logger'

export function authHandler(req: Request, res: Response, next: NextFunction) {
  const idToken: string | undefined = req.headers.authorization

  if (!idToken) {
    logger.warn('Unauthorized action detected.')
    return res.status(401).json('Unauthorized')
  }
  try {
    admin
      .auth()
      .verifyIdToken(idToken)
      .then(decodedToken => {
        req.userId = decodedToken.uid
        return next()
      })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error while validating Identity.', error)
    return res.status(500).json(false)
  }
}
