import admin from 'firebase-admin'

export interface UserStats {
  wins: number
  losses: number
  meowpoints: number
  uid: string
  displayName: string
}

export interface GameLastAction {
  user: string
  action: string
  timestamp: string
}

export interface GamePreConditions {
  enabled: boolean
  suspended: boolean
  toDraw: number
  newColor: string
}

export interface GameObject {
  gameId: string
  host: admin.firestore.DocumentReference
  guest: admin.firestore.DocumentReference
  hostName: string
  guestName: string
  winner?: string
  createdAt: string
  lastActions: GameLastAction[]
  preCondition: GamePreConditions
  started: boolean
  finished: boolean
  rejected: boolean
  whichTurn: string
  hostdeckLength: number
  guestdeckLength: number
}

export interface CardObject {
  color: string
  name: string
  value: string
}

export interface DBAction<T = any> {
  ref: admin.firestore.DocumentReference
  data: T
  merge?: boolean
}
