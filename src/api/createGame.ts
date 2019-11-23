import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'

import uuid from 'uuid/v4'
import { sendNotification } from '../services/pushNotifications'
// import { UserStats } from '../types/typings'
import { getTimestamp } from '../functions/firebase'
import { GameObject } from '../types/typings'

export async function createGame(req: Request, res: Response) {
  const userId = req.userId
  const guestId: string = req.body.guestId

  if (!guestId) {
    return res.status(400).json('Missing parameter: guestId: (string)')
  }

  try {
    const fs = admin.firestore()
    const timestamp = getTimestamp()
    const newBatch = fs.batch()
    const newGameId = uuid()
    const newGameRef = fs.collection('games').doc(newGameId)
    const userRef = fs.collection('userstats').doc(userId)
    const guestRef = fs.collection('userstats').doc(guestId)

    const userData = await admin.auth().getUser(userId)
    const guestData = await admin.auth().getUser(guestId)
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

    newBatch.set(userRef.collection('matches').doc(newGameId), {
      gameRef: newGameRef,
    })
    newBatch.set(guestRef.collection('matches').doc(newGameId), {
      gameRef: newGameRef,
    })
    newBatch.set(newGameRef, newGameObject)

    await newBatch.commit()
    logger.info('Successfully created game.')
    sendNotification(guestId)
    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : createGame -> error`, error)
    return res.status(500).json(false)
  }
}
