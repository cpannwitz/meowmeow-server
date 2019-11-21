import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { CardObject, UserStats, GamePreConditions } from '../types/typings'
import { sendNotification } from '../services/pushNotifications'
import gameConfig from '../configs/gameConfig'
import { fetchGameObject, fetchGameDeck, fetchDoc, getTimestamp } from '../functions/firebase'
import { validateCardAction } from '../functions/validateCardAction'

export async function matchActionPut(req: Request, res: Response) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId
  const card: CardObject = req.body.card
  const jackWish: string = req.body.jackWish

  if (!gameId || !card) {
    logger.error('ERROR | Unsufficient Params')
    return res.status(400).json('Missing parameter: gameId | card')
  }

  try {
    const [gameObject, pileDeck] = await Promise.all([
      fetchGameObject(gameId),
      fetchGameDeck(gameId, 'pile'),
    ])

    // check if action is allowed by game settings
    if (gameObject.whichTurn !== userId) {
      logger.error('ERROR | Card-Action not allowed!')
      return res.status(200).json(false)
    }

    if (!validateCardAction(card, pileDeck.pile[0], gameObject.preCondition)) {
      // if card is not validated
      logger.info(`Card played was not valid (card): ${card.color}|${card.value}`)
      logger.info(
        `Card played was not valid (pile): ${pileDeck.pile[0].color}|${pileDeck.pile[0].value}`
      )
      logger.info(
        `Card played was not valid (preCon): ${
          gameObject.preCondition.enabled ? 'true' : 'false'
        }|${gameObject.preCondition.newColor}|${
          gameObject.preCondition.suspended ? 'true' : 'false'
        }|${gameObject.preCondition.toDraw}`
      )
      return res.status(200).json(false)
    }

    const [userDeck, hostStats, guestStats] = await Promise.all([
      fetchGameDeck(gameId, userId),
      fetchDoc<UserStats>(gameObject.host),
      fetchDoc<UserStats>(gameObject.guest),
    ])

    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)
    const newLastActions = gameObject.lastActions
    const newPileDeck: CardObject[] = [...pileDeck.pile]
    const newBatch = fs.batch()
    const newUserDeck: CardObject[] = [...userDeck.deck]

    // ! handle remove from deck | add to pile
    // find card in userdeck
    const positionInUserDeck = newUserDeck.findIndex(element => element.name === card.name)
    // splice that one
    const poppedCard = newUserDeck.splice(positionInUserDeck, 1)[0]
    // add poppedcard to pile
    newPileDeck.unshift(poppedCard)

    // ! handle precondition handling
    const preconditionToApply: GamePreConditions = {
      enabled: false,
      suspended: false,
      toDraw: 0,
      newColor: '',
    }
    // handle removal of preConditions
    if (gameObject.preCondition.enabled) {
      // handle ace's
      if (gameObject.preCondition.suspended === true && poppedCard.value === 'ace') {
        preconditionToApply.enabled = true
        preconditionToApply.suspended = true
      }
      // handle jacks
      if (
        gameObject.preCondition.newColor &&
        poppedCard.color === gameObject.preCondition.newColor
      ) {
        preconditionToApply.enabled = false
        preconditionToApply.newColor = ''
      }
    } else {
      // handle application of preConditions
      // handle ace's
      if (poppedCard.value === 'ace') {
        preconditionToApply.enabled = true
        preconditionToApply.suspended = true
      }
      // handle jacks
      if (poppedCard.value === 'jack' && jackWish) {
        preconditionToApply.enabled = true
        preconditionToApply.newColor = jackWish
      }
      // handle 7's
      if (poppedCard.value === '7') {
        preconditionToApply.enabled = true
        preconditionToApply.toDraw = gameObject.preCondition.toDraw + 2
      }
    }

    newLastActions.unshift({
      user: userId,
      action: `${poppedCard.value} of ${poppedCard.color}s was played! `,
      timestamp: getTimestamp(),
    })

    // now it's time to push
    newBatch.set(gameRef.collection('decks').doc('pile'), {
      pile: newPileDeck,
    })
    newBatch.set(gameRef.collection('decks').doc(userId), {
      deck: newUserDeck,
    })
    if (preconditionToApply) {
      newBatch.set(
        gameRef,
        {
          preCondition: preconditionToApply,
        },
        { merge: true }
      )
    }

    const userIsHost = userId === hostStats.uid ? true : false

    // Winning case
    if (newUserDeck.length === 0) {
      // set new stats to game
      newBatch.set(
        gameRef,
        {
          guestdeckLength: !userIsHost
            ? gameObject.guestdeckLength - 1
            : gameObject.guestdeckLength,
          hostdeckLength: userIsHost ? gameObject.hostdeckLength - 1 : gameObject.hostdeckLength,
          lastActions: newLastActions,
          winner: userId,
          finished: true,
        },
        { merge: true }
      )

      if (!userIsHost) {
        // if user is winner, he gets points
        newBatch.set(
          gameObject.guest,
          {
            wins: guestStats.wins++,
            meowpoints: guestStats.meowpoints + gameConfig.meowpointsForWin,
          },
          { merge: true }
        )
        // ... and the opponent also some
        newBatch.set(
          gameObject.host,
          {
            losses: hostStats.losses++,
            meowpoints: hostStats.meowpoints + gameConfig.meowpointsForLoss,
          },
          { merge: true }
        )
      } else {
        // if user is winner, he gets points
        newBatch.set(
          gameObject.host,
          {
            wins: hostStats.wins++,
            meowpoints: hostStats.meowpoints + gameConfig.meowpointsForWin,
          },
          { merge: true }
        )
        // ... and the opponent also some
        newBatch.set(
          gameObject.guest,
          {
            losses: guestStats.losses++,
            meowpoints: guestStats.meowpoints + gameConfig.meowpointsForLoss,
          },
          { merge: true }
        )
      }
    } else {
      if (guestStats.uid === userId) {
        newBatch.set(
          gameRef,
          {
            guestdeckLength: gameObject.guestdeckLength - 1,
            lastActions: newLastActions,
            whichTurn: hostStats.uid,
          },
          { merge: true }
        )
      } else {
        newBatch.set(
          gameRef,
          {
            hostdeckLength: gameObject.hostdeckLength - 1,
            lastActions: newLastActions,
            whichTurn: guestStats.uid,
          },
          { merge: true }
        )
      }
    }

    await newBatch.commit()

    if (!userIsHost) {
      sendNotification(hostStats.uid)
    } else {
      sendNotification(guestStats.uid)
    }

    return res.status(200).json(true)
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error playing card: ', error)
    return res.status(500).send(error)
  }
}
