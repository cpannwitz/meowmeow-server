import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'

export async function initUser(req: Request, res: Response) {
  const userId = req.userId

  try {
    const user = await admin.auth().getUser(userId)

    if (user) {
      const existingUserStats = await admin
        .firestore()
        .collection('userstats')
        .doc(user.uid)
        .get()
      const newUserStats = {
        wins: 0,
        losses: 0,
        meowpoints: 0,
        ...existingUserStats,
        uid: user.uid,
        displayName: user.displayName,
      }

      admin
        .firestore()
        .collection('userstats')
        .doc(user.uid)
        .set(newUserStats, { merge: true })
        .then(() => {
          res.status(200).json(newUserStats)
        })
    } else {
      return res.status(400).json('User not found.')
    }
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : initUser -> error: `, error)
    return res.status(500).json(false)
  }
}