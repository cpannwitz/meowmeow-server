import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { sendNotification } from '../services/pushNotifications'
import gameConfig from '../configs/gameConfig'
import { fetchGameObject, getTimestamp } from '../functions/firebase'
import { shuffleArray } from '../functions/shuffleArray'
import { cardsSet } from '../services/cardsSet'

export async function startGame(req: Request, res: Response) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId

  if (!gameId) {
    logger.error('Missing gameId @ startGame')
    return res.status(400).json('Missing parameter: gameId: (string)')
  }

  try {
    const fs = admin.firestore()

    const gameRef = fs.collection('games').doc(gameId)

    const [gameObject] = await Promise.all([fetchGameObject(gameId)])
    const allCards = [...cardsSet]
    const guestId = gameObject.guest.id
    const hostId = gameObject.host.id
    const newLastActions = gameObject.lastActions
    const decksRef = gameRef.collection('decks')
    const newBatch = fs.batch()

    const pile = []
    const hostdeck = []
    const guestdeck = []

    const shuffledDeck = shuffleArray(allCards)
    pile.push(shuffledDeck.pop())

    // give each player their cards
    for (let i = 0; i < gameConfig.cardsPerPlayer; ++i) {
      hostdeck.push(shuffledDeck.pop())
      guestdeck.push(shuffledDeck.pop())
    }

    newLastActions.unshift({
      user: userId,
      action: 'Game started!',
      timestamp: getTimestamp(),
    })

    newBatch.set(
      gameRef,
      {
        started: true,
        lastActions: newLastActions,
        hostdeckLength: hostdeck.length,
        guestdeckLength: guestdeck.length,
      },
      { merge: true }
    )
    console.log(`LOG | : startGame -> pile`, pile)
    newBatch.set(decksRef.doc('pile'), {
      pile: pile,
    })
    newBatch.set(decksRef.doc(hostId), {
      deck: hostdeck,
    })
    newBatch.set(decksRef.doc(guestId), {
      deck: guestdeck,
    })
    newBatch.set(decksRef.doc('stack'), {
      stack: shuffledDeck,
    })

    await newBatch.commit()
    if (userId === guestId) {
      sendNotification(hostId)
    } else {
      sendNotification(guestId)
    }
    logger.info('Updated Deck after assigning decks to each.')
    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error starting the game', error)
    return res.status(500).json(false)
  }
}
