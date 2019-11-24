import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { getTimestamp } from '../functions/firebase'
import { GameObject, DBAction } from '../types/typings'

export async function matchActionSuspension(req: Request, res: Response, next: NextFunction) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId
  const { gameObject } = req.matchActionSuspension

  if (!gameObject || !gameId) {
    return res.status(400).json('Missing parameters')
  }

  try {
    const guestId = gameObject.guest.id
    const hostId = gameObject.host.id
    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)
    const newLastActions = gameObject.lastActions

    const opponentId = userId === guestId ? hostId : guestId

    // check if action is allowed by game settings
    if (
      gameObject.whichTurn !== userId ||
      !(gameObject.preCondition.enabled && gameObject.preCondition.suspended)
    ) {
      logger.error('ERROR | Suspension-Action not allowed!')
      return res.status(200).json(false)
    }

    newLastActions.unshift({
      user: userId,
      action: 'Suspension was taken!',
      timestamp: getTimestamp(),
    })

    const newGameObject: Partial<GameObject> = {
      lastActions: newLastActions,
      whichTurn: opponentId,
      preCondition: {
        enabled: false,
        suspended: false,
        newColor: '',
        toDraw: 0,
      },
    }

    const newDBActions: DBAction[] = [{ ref: gameRef, data: newGameObject, merge: true }]
    res.dbActions = newDBActions
    res.notify = opponentId
    next()
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error matchAction - takeSuspension: ', error)
    return res.status(500).json(false)
  }
}

export async function getMatchActionSuspensionData(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
        req.matchActionSuspension = {}
        req.matchActionSuspension.gameObject = result.data() as GameObject
        next()
      })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getMatchActionSuspensionData: `, error)
    return res.status(500).json(false)
  }
}
