import fbAdmin from 'firebase-admin'

import systemConfig from '../configs/systemConfig'
import { externalLogger } from './logger'

const serviceAccount = JSON.parse(systemConfig.fbServiceAccount)

function getDatabase() {
  return new Promise((resolve, reject) => {
    try {
      fbAdmin.initializeApp({
        credential: fbAdmin.credential.cert(serviceAccount),
        databaseURL: 'https://realtimegame-eb264.firebaseio.com',
      })
      resolve()
    } catch (error) {
      externalLogger.error(error)
      reject(error)
    }
  })
}

export default getDatabase
