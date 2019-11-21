import { Request, Response } from 'express'
import admin from 'firebase-admin'
import logger from '../services/logger'
// import { CardObject } from '../types/typings'
// import { sendNotification } from '../services/pushNotifications'
// import { fetchGameObject, fetchGameDeck, getTimestamp } from '../functions/firebase'
// import { shuffleArray } from '../functions/shuffleArray'

// * MESSAGES

const messages = {
  newAction: {
    notification: {
      title: 'MeowMeow!',
      body: 'New actions happened!',
      //eslint-disable-next-line
      click_action: 'https://meowcards.herokuapp.com',
      color: '#003366',
      icon: 'https://image.ibb.co/jMfs06/icon_192x192.png',
      // 'badge': './server/assets/icon-192x192.png'
    },
  },
}

async function obtainPushToken(userId: any) {
  let token = ''
  await admin
    .database()
    .ref('tokens/' + userId)
    .once('value', snapshot => {
      if (snapshot.val()) {
        token = snapshot.val().token
      }
    })
  return token
}

export async function sendNotification(userId: string) {
  const token = await obtainPushToken(userId)
  if (token) {
    admin
      .messaging()
      .sendToDevice(token, messages.newAction)
      .then(function(response) {
        // See the MessagingDevicesResponse reference documentation for
        // the contents of response.
        logger.info('Successfully send notification: ', response)
      })
      .catch(function(error) {
        logger.error('ERROR | Error sending notification: ')
        logger.error(error)
      })
  }
}

export async function testNotifications(req: Request, res: Response) {
  const userId: string = req.query.userId
  const message: string | undefined = req.query.message

  sendNotification(userId)

  return res.status(200).json(`Works: ${userId} | ${message}`)
}
