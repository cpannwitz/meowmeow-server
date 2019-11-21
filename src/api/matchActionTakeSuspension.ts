import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { sendNotification } from '../services/pushNotifications'
import { fetchGameObject, getTimestamp } from '../functions/firebase'

export async function matchActionTakeSuspension(req: Request, res: Response) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId

  if (!gameId) {
    logger.error('Missing gameId @ startGame')
    return res.status(400).json('Missing parameter: gameId: (string)')
  }

  try {
    const gameObject = await fetchGameObject(gameId)

    const guestId = gameObject.guest.id
    const hostId = gameObject.host.id
    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)
    const newBatch = fs.batch()
    const newLastActions = gameObject.lastActions

    // check if action is allowed by game settings
    if (
      gameObject.whichTurn !== userId ||
      !(gameObject.preCondition.enabled && gameObject.preCondition.suspended)
    ) {
      logger.error('ERROR | Suspension-Action not allowed!')
      return res.status(200).json(false)
    }

    newBatch.set(
      gameRef,
      {
        preCondition: {
          enabled: false,
          suspended: false,
          newColor: '',
          toDraw: 0,
        },
      },
      { merge: true }
    )

    newLastActions.unshift({
      user: userId,
      action: 'Suspension was taken!',
      timestamp: getTimestamp(),
    })

    if (guestId === userId) {
      newBatch.set(
        gameRef,
        {
          lastActions: newLastActions,
          whichTurn: hostId,
        },
        { merge: true }
      )
    } else {
      newBatch.set(
        gameRef,
        {
          lastActions: newLastActions,
          whichTurn: guestId,
        },
        { merge: true }
      )
    }

    await newBatch.commit()
    if (userId === guestId) {
      sendNotification(hostId)
    } else {
      sendNotification(guestId)
    }
    logger.info('Took suspension')
    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error matchAction - takeSuspension: ', error)
    return res.status(500).json(false)
  }
}
