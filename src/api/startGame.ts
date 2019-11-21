import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { sendNotification } from '../services/pushNotifications'
import { CardObject } from '../types/typings'
import gameConfig from '../configs/gameConfig'
import { fetchGameObject, fetchCollection, getTimestamp } from '../functions/firebase'
import { shuffleArray } from '../functions/shuffleArray'

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
    const cardsRef = fs.collection('cards')

    const [gameObject, allCards] = await Promise.all([
      fetchGameObject(gameId),
      fetchCollection<CardObject>(cardsRef),
    ])
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

    // assign the first turn to one of the players
    const coin = Math.floor(Math.random() * 2)
    const whichTurn = coin === 0 ? hostId : guestId

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
        whichTurn: whichTurn,
        started: true,
        lastActions: newLastActions,
        hostdeckLength: hostdeck.length,
        guestdeckLength: guestdeck.length,
      },
      { merge: true }
    )
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
