import { Router, Response } from 'express'

import { initUser, getInitUserData } from '../controller/initUser'
import { createGame, getCreateGameData } from '../controller/createGame'
import { startGame, getStartGameData } from '../controller/startGame'
import { rejectGame, getRejectGameData } from '../controller/rejectGame'
import {
  matchActionSuspension,
  getMatchActionSuspensionData,
} from '../controller/matchActionSuspension'
import { matchActionDraw, getMatchActionDrawData } from '../controller/matchActionDraw'
import { matchActionPut, getMatchActionPutData } from '../controller/matchActionPut'
import { testNotifications } from './testNotifications'

import { authHandler } from '../middlewares/auth/authHandler'
import { dbHandler } from '../middlewares/db/dbHandler'

const router = Router()

router.get('/', (_, res: Response) => {
  res.render('index', { title: 'MeowMeow' })
})

router.get('/api/initUser', authHandler, getInitUserData, initUser, dbHandler)
router.post('/api/createGame', authHandler, getCreateGameData, createGame, dbHandler)
router.post('/api/startGame', authHandler, getStartGameData, startGame, dbHandler)
router.post('/api/rejectGame', authHandler, getRejectGameData, rejectGame, dbHandler)
router.post(
  '/api/matchAction/takeSuspension',
  authHandler,
  getMatchActionSuspensionData,
  matchActionSuspension,
  dbHandler
)
router.post(
  '/api/matchAction/draw',
  authHandler,
  getMatchActionDrawData,
  matchActionDraw,
  dbHandler
)
router.post('/api/matchAction/put', authHandler, getMatchActionPutData, matchActionPut, dbHandler)
router.get('/api/testNotifications', testNotifications)

export default router
