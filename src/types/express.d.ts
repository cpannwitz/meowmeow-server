declare namespace Express {
  export interface Request {
    userId: string
    body: {
      user?: firebase.auth.UserInfo
      userId?: string
    }
  }

  export interface Response {
    jwtPayload?: {
      userId?: string
    }
  }
}
