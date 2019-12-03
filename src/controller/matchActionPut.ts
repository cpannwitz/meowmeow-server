import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import logger, { externalLogger } from '../services/logger'
import { CardObject, UserStats, GamePreConditions, GameObject, DBAction } from '../types/typings'
import gameConfig from '../configs/gameConfig'
import { getTimestamp } from '../functions/firebase'
import { validateCardAction } from '../functions/validateCardAction'

export async function matchActionPut(req: Request, res: Response, next: NextFunction) {
  const userId: string = req.userId
  const gameId: string = req.body.gameId
  const card: CardObject = req.body.card
  const jackWish: string = req.body.jackWish

  const { gameObject, userDeck, pileDeck, hostStats, guestStats } = req.matchActionPut

  if (!gameId || !card || !gameObject || !userDeck || !pileDeck || !hostStats || !guestStats) {
    logger.error('ERROR | Unsufficient Params')
    return res.status(400).json('Missing parameter: gameId | card')
  }

  try {
    // check if action is allowed by game settings
    if (gameObject.whichTurn !== userId) {
      logger.error('ERROR | Card-Action not allowed!')
      return res.status(200).json(false)
    }

    if (!validateCardAction(card, pileDeck[0], gameObject.preCondition)) {
      // if card is not validated
      logger.info(`Card played was not valid (card): ${card.color}|${card.value}`)
      logger.info(`Card played was not valid (pile): ${pileDeck[0].color}|${pileDeck[0].value}`)
      logger.info(
        `Card played was not valid (preCon): ${
          gameObject.preCondition.enabled ? 'true' : 'false'
        }|${gameObject.preCondition.newColor}|${
          gameObject.preCondition.suspended ? 'true' : 'false'
        }|${gameObject.preCondition.toDraw}`
      )
      return res.status(200).json(false)
    }

    const fs = admin.firestore()
    const gameRef = fs.collection('games').doc(gameId)
    const decksRef = gameRef.collection('decks')
    const newLastActions = gameObject.lastActions
    const newPileDeck: CardObject[] = [...pileDeck]
    const newUserDeck: CardObject[] = [...userDeck]
    const guestId = gameObject.guest.id
    const hostId = gameObject.host.id
    const userIsHost = userId === guestId ? false : true
    const opponentId = userId === guestId ? hostId : guestId

    // ! handle remove from deck | add to pile
    // find card in userdeck
    const positionInUserDeck = newUserDeck.findIndex(element => element.name === card.name)
    // splice that one
    const userCard = newUserDeck.splice(positionInUserDeck, 1)[0]
    // add userCard to pile
    newPileDeck.unshift(userCard)

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
      if (gameObject.preCondition.suspended === true && userCard.value === 'ace') {
        preconditionToApply.enabled = true
        preconditionToApply.suspended = true
      }
      // handle jacks
      if (gameObject.preCondition.newColor && userCard.color === gameObject.preCondition.newColor) {
        preconditionToApply.enabled = false
        preconditionToApply.newColor = ''
      }
      // handle 7's
      if (gameObject.preCondition.toDraw > 0 && userCard.value === '7') {
        preconditionToApply.enabled = true
        preconditionToApply.toDraw = gameObject.preCondition.toDraw + 2
      }
    } else {
      // handle 7's
      if (userCard.value === '7') {
        preconditionToApply.enabled = true
        preconditionToApply.toDraw = 2
      }
    }
    // handle application of preConditions
    // handle ace's
    if (userCard.value === 'ace') {
      preconditionToApply.enabled = true
      preconditionToApply.suspended = true
    }
    // handle jacks
    if (userCard.value === 'jack' && jackWish) {
      preconditionToApply.enabled = true
      preconditionToApply.newColor = jackWish
    }

    newLastActions.unshift({
      user: userId,
      action: `${userCard.value} of ${userCard.color}s was played! `,
      timestamp: getTimestamp(),
    })

    let newGameObject: Partial<GameObject> = {
      preCondition: preconditionToApply,
      guestdeckLength: !userIsHost ? gameObject.guestdeckLength - 1 : gameObject.guestdeckLength,
      hostdeckLength: userIsHost ? gameObject.hostdeckLength - 1 : gameObject.hostdeckLength,
      lastActions: newLastActions,
      whichTurn: opponentId,
    }

    const newDBActions: DBAction[] = []

    // ! winning case
    if (newUserDeck.length <= 0) {
      newGameObject = {
        ...newGameObject,
        winner: userId,
        finished: true,
      }

      newDBActions.push({
        ref: gameObject.host,
        data: !userIsHost
          ? {
              losses: hostStats.losses++,
              meowpoints: hostStats.meowpoints + gameConfig.meowpointsForLoss,
            }
          : {
              wins: hostStats.wins++,
              meowpoints: hostStats.meowpoints + gameConfig.meowpointsForWin,
            },
        merge: true,
      })
      newDBActions.push({
        ref: gameObject.guest,
        data: !userIsHost
          ? {
              wins: guestStats.wins++,
              meowpoints: guestStats.meowpoints + gameConfig.meowpointsForWin,
            }
          : {
              losses: guestStats.losses++,
              meowpoints: guestStats.meowpoints + gameConfig.meowpointsForLoss,
            },
        merge: true,
      })
    }

    newDBActions.push({ ref: gameRef, data: newGameObject, merge: true }),
      newDBActions.push({
        ref: decksRef.doc('pile'),
        data: {
          pile: newPileDeck,
        },
      })
    newDBActions.push({
      ref: decksRef.doc(userId),
      data: {
        deck: newUserDeck,
      },
    })

    res.dbActions = newDBActions
    res.notify = opponentId
    next()
  } catch (error) {
    externalLogger.error(error, req)
    logger.error('ERROR | Error playing card: ', error)
    return res.status(500).send(error)
  }
}

export async function getMatchActionPutData(req: Request, res: Response, next: NextFunction) {
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
        .doc('pile')
        .get(),
    ]).then(result => {
      req.matchActionPut = {}
      const gameObject = result[0].data() as GameObject
      req.matchActionPut.gameObject = gameObject
      req.matchActionPut.userDeck = result[1].data()?.deck
      req.matchActionPut.pileDeck = result[2].data()?.pile

      Promise.all([gameObject.host.get(), gameObject.guest.get()]).then(secondResult => {
        req.matchActionPut.hostStats = secondResult[0].data() as UserStats | undefined
        req.matchActionPut.guestStats = secondResult[1].data() as UserStats | undefined
        next()
      })
    })
  } catch (error) {
    externalLogger.error(error, req)
    logger.error(`ERROR | : getMatchActionPutData: `, error)
    return res.status(500).json(false)
  }
}
