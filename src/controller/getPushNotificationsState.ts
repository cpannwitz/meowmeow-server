import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'

export async function getPushNotificationsState(req: Request, res: Response) {
  const { userId } = req

  try {
    const db = admin.database()
    const ref = db.ref('tokens/' + userId)

    const snapshot = await ref.once('value')
    if (snapshot.val()) {
      return res.status(200).json(true)
    } else {
      return res.status(200).json(false)
    }
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getPushNotificationsState: `, error)
    return res.status(500).json(false)
  }
}
