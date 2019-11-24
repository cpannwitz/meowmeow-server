import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import gameConfig from '../configs/gameConfig'
import { getTimestamp } from '../functions/firebase'
import { shuffleArray } from '../functions/shuffleArray'
import { cardsSet } from '../services/cardsSet'
import { GameObject, DBAction, CardObject } from '../types/typings'

export async function startGame(req: Request, res: Response, next: NextFunction) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId
  const { gameObject } = req.startGame

  if (!gameObject || !gameId) {
    return res.status(400).json('Missing parameters')
  }

  try {
    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)
    const decksRef = gameRef.collection('decks')

    const guestId = gameObject.guest.id
    const hostId = gameObject.host.id
    const newLastActions = gameObject.lastActions

    const opponentId = userId === guestId ? hostId : guestId

    const pile: CardObject[] = []
    const hostdeck: CardObject[] = []
    const guestdeck: CardObject[] = []

    const allCards = [...cardsSet]
    const shuffledDeck = shuffleArray(allCards)
    pile.push(shuffledDeck.pop() as CardObject)

    // give each player their cards
    for (let i = 0; i < gameConfig.cardsPerPlayer; ++i) {
      hostdeck.push(shuffledDeck.pop() as CardObject)
      guestdeck.push(shuffledDeck.pop() as CardObject)
    }

    newLastActions.unshift({
      user: userId,
      action: 'Game started!',
      timestamp: getTimestamp(),
    })

    const newGameObject: Partial<GameObject> = {
      started: true,
      lastActions: newLastActions,
      hostdeckLength: hostdeck.length,
      guestdeckLength: guestdeck.length,
    }

    const newDBActions: DBAction[] = [
      { ref: gameRef, data: newGameObject, merge: true },
      {
        ref: decksRef.doc('pile'),
        data: {
          pile: pile,
        },
      },
      {
        ref: decksRef.doc(hostId),
        data: {
          deck: hostdeck,
        },
      },
      {
        ref: decksRef.doc(guestId),
        data: {
          deck: guestdeck,
        },
      },
      {
        ref: decksRef.doc('stack'),
        data: {
          stack: shuffledDeck,
        },
      },
    ]
    res.dbActions = newDBActions

    res.notify = opponentId
    next()
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error starting the game', error)
    return res.status(500).json(false)
  }
}

export async function getStartGameData(req: Request, res: Response, next: NextFunction) {
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
        req.startGame = {}
        req.startGame.gameObject = result.data() as GameObject
        next()
      })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getStartGameData: `, error)
    return res.status(500).json(false)
  }
}
