import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { CardObject } from '../types/typings'
import { sendNotification } from '../services/pushNotifications'
import { fetchGameObject, fetchGameDeck, getTimestamp } from '../functions/firebase'
import { shuffleArray } from '../functions/shuffleArray'

export async function matchActionDraw(req: Request, res: Response) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId

  if (!gameId) {
    logger.error('ERROR | Unsufficient Params')
    return res.status(400).json('Missing parameter: gameId')
  }

  try {
    const [gameObject, userDeck, stackDeck, pileDeck] = await Promise.all([
      fetchGameObject(gameId),
      fetchGameDeck(gameId, userId),
      fetchGameDeck(gameId, 'stack'),
      fetchGameDeck(gameId, 'pile'),
    ])

    // check if action is allowed by game settings
    if (gameObject.whichTurn !== userId || gameObject.preCondition.suspended) {
      logger.error('ERROR | Draw-Action not allowed!')
      return res.status(406).json('Draw-Action not allowed: Not your turn | Suspension active')
    }

    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)

    const newLastActions = gameObject.lastActions
    const newBatch = fs.batch()
    const newStackDeck: CardObject[] = [...stackDeck.stack]
    const newUserDeck: CardObject[] = [...userDeck.deck]
    const newPileDeck: CardObject[] = [...pileDeck.pile]

    const penalty =
      gameObject.preCondition.enabled && gameObject.preCondition.toDraw
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

    newLastActions.unshift({
      user: userId,
      action: 'Card was drawn!',
      timestamp: getTimestamp(),
    })

    // update userdeck / stack / whichturn / decklength /
    newBatch.set(gameRef.collection('decks').doc('stack'), {
      stack: newStackDeck,
    })
    newBatch.set(gameRef.collection('decks').doc('pile'), {
      pile: newPileDeck,
    })
    newBatch.set(gameRef.collection('decks').doc(userId), {
      deck: newUserDeck,
    })
    // check if user draws due to precondition
    const userIsHost = gameObject.guest.id === userId ? false : true
    // const penaltyActive = !penalty || penalty <= 1 ? false : true
    const resultObject = {
      guestdeckLength: !userIsHost ? gameObject.guestdeckLength + 1 : gameObject.guestdeckLength,
      hostdeckLength: userIsHost ? gameObject.hostdeckLength + 1 : gameObject.hostdeckLength,
      lastActions: newLastActions,
      preCondition: {
        enabled: false,
        suspended: false,
        toDraw: 0,
        newColor: '',
      },
      whichTurn: userIsHost ? gameObject.guest.id : gameObject.host.id,
    }

    newBatch.set(gameRef, resultObject, { merge: true })

    await newBatch.commit()
    if (!userIsHost) {
      sendNotification(gameObject.host.id)
    } else {
      sendNotification(gameObject.guest.id)
    }
    logger.info('Draw card action.')
    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error drawing card', error)
    return res.status(500).json('Error drawing card')
  }
}
