import admin from 'firebase-admin'
import { Request, Response } from 'express'
import logger, { externalLogger } from '../../services/logger'
import { sendNotification } from '../../services/pushNotifications'

export async function dbHandler(req: Request, res: Response) {
  const dbActions = res.dbActions
  const notify = res.notify

  try {
    if (dbActions && dbActions.length > 0) {
      const fs = admin.firestore()
      const batch = fs.batch()

      dbActions.forEach(action => {
        batch.set(action.ref, action.data, { merge: action.merge ?? false })
      })

      await batch.commit()
      // logger.info('Successfully created game.')
      if (notify) {
        sendNotification(notify)
      }
    }
    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : DBActions: `, error)
    return res.status(500).json(false)
  }
}
