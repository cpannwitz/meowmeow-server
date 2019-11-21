import { Router, Request, Response } from 'express'

import { initUser } from './initUser'
import { createGame } from './createGame'
import { startGame } from './startGame'
import { rejectGame } from './rejectGame'
import { matchActionDraw } from './matchActionDraw'
import { matchActionPut } from './matchActionPut'
import { matchActionTakeSuspension } from './matchActionTakeSuspension'
import { authHandler } from '../middlewares/auth/autthHandler'
import { testNotifications } from './testNotifications'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'MeowMeow' })
})

router.get('/api/initUser', authHandler, initUser)
router.post('/api/createGame', authHandler, createGame)
router.post('/api/startGame', authHandler, startGame)
router.post('/api/rejectGame', authHandler, rejectGame)
router.post('/api/matchAction/takeSuspension', authHandler, matchActionTakeSuspension)
router.post('/api/matchAction/draw', authHandler, matchActionDraw)
router.post('/api/matchAction/put', authHandler, matchActionPut)
router.get('/api/testNotifications', testNotifications)

export default router
