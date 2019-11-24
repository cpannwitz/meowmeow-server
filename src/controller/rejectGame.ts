import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { getTimestamp } from '../functions/firebase'
import { DBAction, GameObject } from '../types/typings'

export async function rejectGame(req: Request, res: Response, next: NextFunction) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId
  const { gameObject } = req.rejectGame

  if (!gameObject || !gameId) {
    return res.status(400).json('Missing parameters')
  }

  try {
    const gameRef = admin
      .firestore()
      .collection('games')
      .doc(gameId)
    const newLastActions = gameObject.lastActions

    newLastActions.unshift({
      user: userId,
      action: 'Game rejected!',
      timestamp: getTimestamp(),
    })

    const newGameObject: Partial<GameObject> = {
      rejected: true,
      lastActions: newLastActions,
    }

    const newDBActions: DBAction[] = [{ ref: gameRef, data: newGameObject, merge: true }]
    res.dbActions = newDBActions
    next()
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | rejectGame (logic): ', error)
    return res.status(500).json(false)
  }
}

export async function getRejectGameData(req: Request, res: Response, next: NextFunction) {
  const gameId: string = req.body.gameId

  if (!gameId) {
    return res.status(400).json('Missing parameter: gameId: (string)')
  }

  try {
    admin
      .firestore()
      .collection('games')
      .doc(gameId)
      .get()
      .then(result => {
        req.rejectGame = {}
        req.rejectGame.gameObject = result.data() as GameObject
        next()
      })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getRejectGameData: `, error)
    return res.status(500).json(false)
  }
}
