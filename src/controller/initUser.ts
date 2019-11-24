import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { UserStats, DBAction } from '../types/typings'

export async function initUser(req: Request, res: Response, next: NextFunction) {
  const { user, userStats } = req.initUser
  if (!user) {
    return res.status(400).json('User not found.')
  }

  try {
    const fs = admin.firestore()
    const userStatsRef = fs.collection('userstats').doc(user.uid)

    const newUserStats = {
      wins: userStats?.wins ?? 0,
      losses: userStats?.losses ?? 0,
      meowpoints: userStats?.meowpoints ?? 0,
      uid: user.uid,
      displayName: user.displayName,
    }

    const newDBActions: DBAction[] = [{ ref: userStatsRef, data: newUserStats, merge: true }]
    res.dbActions = newDBActions
    next()
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : initUser -> error: `, error)
    return res.status(500).json(false)
  }
}

export async function getInitUserData(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId
  try {
    Promise.all([
      admin.auth().getUser(userId),
      admin
        .firestore()
        .collection('userstats')
        .doc(userId)
        .get(),
    ]).then(result => {
      req.initUser = {}
      req.initUser.user = result[0]
      req.initUser.userStats = result[1].data() as UserStats | undefined
      next()
    })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getInitUserData: `, error)
    return res.status(500).json(false)
  }
}
