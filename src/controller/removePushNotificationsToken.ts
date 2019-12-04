import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'

export async function removePushNotificationsToken(req: Request, res: Response) {
  const { userId } = req

  try {
    const db = admin.database()
    const ref = db.ref('tokens/' + userId)

    await ref.remove()

    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : removePushNotificationsToken: `, error)
    return res.status(500).json(false)
  }
}
