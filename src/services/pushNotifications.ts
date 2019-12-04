import admin from 'firebase-admin'
import logger from './logger'
import { PushNotificationsCredentials } from '../types/typings'
import gameConfig from '../configs/gameConfig'
import systemConfig from '../configs/systemConfig'

const messages: { [key: string]: admin.messaging.MessagingPayload } = {
  newAction: {
    notification: {
      title: 'MeowMeow',
      body: 'New actions happened!',
      color: '#003366',
      icon: 'https://image.ibb.co/jMfs06/icon_192x192.png',
      //eslint-disable-next-line
      click_action: systemConfig.clientUrl,
    },
  },
}
const messagingOptions: admin.messaging.MessagingOptions = {}

async function obtainPushCredentials(userId: string) {
  return new Promise<PushNotificationsCredentials | null>((resolve, reject) => {
    admin
      .database()
      .ref('tokens/' + userId)
      .once('value', snapshot => {
        if (snapshot.val()) {
          resolve(snapshot.val() as PushNotificationsCredentials)
        } else {
          resolve(null)
        }
      })
      .catch(error => reject(error))
  })
}

async function updatePushCredentials(userId: string, credentials: PushNotificationsCredentials) {
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref('tokens/' + userId)
      .set(credentials)
      .then(resolve)
      .catch(reject)
  })
}

export async function sendNotification(userId: string) {
  const credentials = await obtainPushCredentials(userId)
  if (credentials && credentials.token) {
    const throttled =
      new Date(credentials.lastUsed).getTime() - new Date().getTime() <
      gameConfig.pushNotificationThrottle
        ? true
        : false
    if (!throttled) {
      const newCredentials = { ...credentials, lastUsed: new Date().toISOString() }
      await updatePushCredentials(userId, newCredentials)
      admin
        .messaging()
        .sendToDevice(credentials.token, messages.newAction, messagingOptions)
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
}
