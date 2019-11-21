import admin from 'firebase-admin'
import logger from './logger'

// * MESSAGES

const messages: { [key: string]: admin.messaging.MessagingPayload } = {
  newAction: {
    notification: {
      title: 'MeowMeow',
      body: 'New actions happened!',
      color: '#003366',
      icon: 'https://image.ibb.co/jMfs06/icon_192x192.png',
    },
  },
}
const messagingOptions: admin.messaging.MessagingOptions = {}

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
      .sendToDevice(token, messages.newAction, messagingOptions)
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
