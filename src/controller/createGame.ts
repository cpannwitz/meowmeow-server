import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import uuid from 'uuid/v4'
import logger, { externalLogger } from '../services/logger'
import { GameObject, DBAction } from '../types/typings'
import { getTimestamp } from '../functions/firebase'

export async function createGame(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId
  const guestId: string = req.body.guestId
  const { userData, guestData } = req.createGame

  if (!userData || !guestData) {
    externalLogger.error('Missing data @createGame', req)
    logger.error(`ERROR | : createGame (missing data): `)
    return res.status(400).json(false)
  }

  try {
    const fs = admin.firestore()
    const timestamp = getTimestamp()
    const newGameId = uuid()
    const newGameRef = fs.collection('games').doc(newGameId)
    const userRef = fs.collection('userstats').doc(userId)
    const userMatchRef = userRef.collection('matches').doc(newGameId)
    const guestRef = fs.collection('userstats').doc(guestId)
    const guestMatchRef = guestRef.collection('matches').doc(newGameId)
    const matchRefData = {
      gameRef: newGameRef,
    }

    const newLastActions = [
      {
        user: userId,
        action: `Game was created by ${userData.displayName}!`,
        timestamp: timestamp,
      },
    ]

    // assign the first turn to one of the players
    const coin = Math.floor(Math.random() * 2)
    const whichTurn = coin === 0 ? userId : guestId

    const newGameObject: GameObject = {
      gameId: newGameId,
      host: userRef,
      guest: guestRef,
      [userId]: true,
      [guestId]: true,
      hostName: userData.displayName || '',
      guestName: guestData.displayName || '',
      createdAt: timestamp,
      lastActions: newLastActions,
      preCondition: {
        enabled: false,
        toDraw: 0,
        newColor: '',
        suspended: false,
      },
      started: false,
      finished: false,
      rejected: false,
      hostdeckLength: 0,
      guestdeckLength: 0,
      whichTurn: whichTurn,
    }

    const newDBActions: DBAction[] = [
      { ref: newGameRef, data: newGameObject },
      { ref: userMatchRef, data: matchRefData },
      { ref: guestMatchRef, data: matchRefData },
    ]
    res.dbActions = newDBActions
    res.notify = guestId
    next()
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : createGame (logic): `, error)
    return res.status(500).json(false)
  }
}

export async function getCreateGameData(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId
  const guestId: string = req.body.guestId

  if (!guestId) {
    return res.status(400).json('Missing parameter: guestId: (string)')
  }

  try {
    Promise.all([admin.auth().getUser(userId), admin.auth().getUser(guestId)]).then(result => {
      req.createGame = {}
      req.createGame.userData = result[0]
      req.createGame.guestData = result[1]
      next()
    })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getCreateGameData: `, error)
    return res.status(500).json(false)
  }
}
