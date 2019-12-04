import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { PushNotificationsCredentials } from '../types/typings'

export async function setPushNotificationsToken(req: Request, res: Response) {
  const { userId } = req
  const { token } = req.body

  if (!token) {
    return res.status(400).json('No token found.')
  }

  try {
    const db = admin.database()
    const ref = db.ref('tokens/' + userId)

    const newPushNotificationsCredentials: PushNotificationsCredentials = {
      token: token,
      user: userId,
      lastUsed: new Date().toISOString(),
    }

    await ref.set(newPushNotificationsCredentials)

    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : setPushNotificationsToken: `, error)
    return res.status(500).json(false)
  }
}
