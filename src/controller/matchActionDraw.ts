import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { CardObject, GameObject, DBAction } from '../types/typings'
import { getTimestamp } from '../functions/firebase'
import { shuffleArray } from '../functions/shuffleArray'

export async function matchActionDraw(req: Request, res: Response, next: NextFunction) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId
  const { gameObject, userDeck, pileDeck, stackDeck } = req.matchActionDraw

  if (!gameObject || !gameId || !userDeck || !pileDeck || !stackDeck) {
    return res.status(400).json('Missing parameters')
  }

  try {
    // check if action is allowed by game settings
    if (gameObject.whichTurn !== userId || gameObject.preCondition.suspended) {
      logger.error('ERROR | Draw-Action not allowed!')
      return res.status(200).json(false)
    }

    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)
    const decksRef = gameRef.collection('decks')
    const guestId = gameObject.guest.id
    const hostId = gameObject.host.id
    const userIsHost = gameObject.guest.id === userId ? false : true
    const opponentId = userId === guestId ? hostId : guestId
    const newLastActions = gameObject.lastActions

    const newStackDeck: CardObject[] = [...stackDeck]
    const newUserDeck: CardObject[] = [...userDeck]
    const newPileDeck: CardObject[] = [...pileDeck]

    const penalty =
      gameObject.preCondition.enabled && gameObject.preCondition.toDraw > 0
        ? gameObject.preCondition.toDraw
        : 1

    for (let i = 0; i < penalty; ++i) {
      // pop a card from stack
      const poppedFromStack = newStackDeck.pop()
      // push it to player deck
      if (poppedFromStack) {
        newUserDeck.push(poppedFromStack)
      }

      // check if the stack is empty now
      if (newStackDeck.length === 0) {
        const pileRest = newPileDeck.splice(1)
        pileRest.forEach(pileCard => newStackDeck.push(pileCard))
        shuffleArray(newStackDeck)
      }
    }

    // check if user draws due to precondition
    let newPreCondition = gameObject.preCondition
    if (gameObject.preCondition.enabled && gameObject.preCondition.toDraw > 0) {
      newPreCondition = {
        enabled: false,
        suspended: false,
        toDraw: 0,
        newColor: '',
      }
    }

    newLastActions.unshift({
      user: userId,
      action: 'Card was drawn!',
      timestamp: getTimestamp(),
    })

    const newGameObject: Partial<GameObject> = {
      guestdeckLength: !userIsHost
        ? gameObject.guestdeckLength + penalty
        : gameObject.guestdeckLength,
      hostdeckLength: userIsHost ? gameObject.hostdeckLength + penalty : gameObject.hostdeckLength,
      lastActions: newLastActions,
      preCondition: newPreCondition,
      whichTurn: opponentId,
    }
    const newDBActions: DBAction[] = [
      { ref: gameRef, data: newGameObject, merge: true },
      {
        ref: decksRef.doc('stack'),
        data: {
          stack: newStackDeck,
        },
      },
      {
        ref: decksRef.doc('pile'),
        data: {
          pile: newPileDeck,
        },
      },
      {
        ref: decksRef.doc(userId),
        data: {
          deck: newUserDeck,
        },
      },
    ]
    res.dbActions = newDBActions
    res.notify = opponentId
    next()
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error drawing card', error)
    return res.status(500).json('Error drawing card')
  }
}

export async function getMatchActionDrawData(req: Request, res: Response, next: NextFunction) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId

  if (!gameId) {
    return res.status(400).json('Missing parameter: gameId')
  }

  const fsGameDoc = admin
    .firestore()
    .collection('games')
    .doc(gameId)

  try {
    Promise.all([
      fsGameDoc.get(),
      fsGameDoc
        .collection('decks')
        .doc(userId)
        .get(),
      fsGameDoc
        .collection('decks')
        .doc('stack')
        .get(),
      fsGameDoc
        .collection('decks')
        .doc('pile')
        .get(),
    ]).then(result => {
      req.matchActionDraw = {}
      req.matchActionDraw.gameObject = result[0].data() as GameObject | undefined
      req.matchActionDraw.userDeck = result[1].data()?.deck
      req.matchActionDraw.stackDeck = result[2].data()?.stack
      req.matchActionDraw.pileDeck = result[3].data()?.pile
      next()
    })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getMatchActionDrawData: `, error)
    return res.status(500).json(false)
  }
}
