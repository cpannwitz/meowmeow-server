declare namespace Express {
  export interface Request {
    userId: string
    initUser: {
      user?: import('firebase-admin').auth.UserRecord
      userStats?: import('./typings').UserStats
    }
    createGame: {
      userData?: import('firebase-admin').auth.UserRecord
      guestData?: import('firebase-admin').auth.UserRecord
    }
    startGame: {
      gameObject?: import('./typings').GameObject
    }
    rejectGame: {
      gameObject?: import('./typings').GameObject
    }
    matchActionSuspension: {
      gameObject?: import('./typings').GameObject
    }
    matchActionDraw: {
      gameObject?: import('./typings').GameObject
      userDeck?: import('./typings').CardObject[]
      stackDeck?: import('./typings').CardObject[]
      pileDeck?: import('./typings').CardObject[]
    }
    matchActionPut: {
      gameObject?: import('./typings').GameObject
      userDeck?: import('./typings').CardObject[]
      pileDeck?: import('./typings').CardObject[]
      hostStats?: import('./typings').UserStats
      guestStats?: import('./typings').UserStats
    }
  }

  export interface Response {
    // local inline import to not break ambient declaration file due to top level imports
    // see: https://stackoverflow.com/a/51114250
    dbActions?: import('./typings').DBAction[]
    notify?: string
    // newGameObject: import('./typings').GameObject
  }
}
