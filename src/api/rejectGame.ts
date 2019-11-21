import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { fetchGameObject, getTimestamp } from '../functions/firebase'

export async function rejectGame(req: Request, res: Response) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId

  if (!gameId) {
    logger.error('Missing gameId @ startGame')
    return res.status(400).json('Missing parameter: gameId: (string)')
  }

  try {
    const gameObject = await fetchGameObject(gameId)

    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)
    const newLastActions = gameObject.lastActions
    const newBatch = fs.batch()

    newLastActions.unshift({
      user: userId,
      action: 'Game rejected or given up!',
      timestamp: getTimestamp(),
    })

    newBatch.set(
      gameRef,
      {
        rejected: true,
        lastActions: newLastActions,
      },
      { merge: true }
    )

    await newBatch.commit()
    logger.info('Rejected game successfully')
    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error while rejecting a game: ', error)
    return res.status(500).json(false)
  }
}
