import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { RuntimeOptions } from 'firebase-functions'

interface OnlineStatusDB {
  lastChanged: number
  status: 'online' | 'offline'
  displayName: string
}
interface OnlineStatusFS {
  lastChanged: Date
  status: 'online' | 'offline'
  displayName: string
}

const runtimeOpts: RuntimeOptions = {
  timeoutSeconds: 30,
  memory: '128MB',
}

admin.initializeApp()

// Since this code will be running in the Cloud Functions environment
// we call initialize Firestore without any arguments because it
// detects authentication from the environment.
const firestore = admin.firestore()

// Create a new function which is triggered on changes to /status/{uid}
// Note: This is a Realtime Database trigger, *not* Cloud Firestore.
exports.onUserStatusChanged = functions
  .runWith(runtimeOpts)
  .database.ref('/status/{uid}')
  .onUpdate(async (change, context) => {
    // Get the data written to Realtime Database
    const eventStatus: OnlineStatusFS = change.after.val()

    // Then use other event data to create a reference to the
    // corresponding Firestore document.
    const userStatusFirestoreRef = firestore.doc(`status/${context.params.uid}`)

    // It is likely that the Realtime Database change that triggered
    // this event has already been overwritten by a fast change in
    // online / offline status, so we'll re-read the current data
    // and compare the timestamps.
    const statusSnapshot = await change.after.ref.once('value')
    const status: OnlineStatusDB = statusSnapshot.val()
    console.log(status, eventStatus)
    // If the current timestamp for this data is newer than
    // the data that triggered this event, we exit this function.
    if (new Date(status.lastChanged) > eventStatus.lastChanged) {
      return null
    }

    // Otherwise, we convert the lastChanged field to a Date
    eventStatus.lastChanged = new Date(eventStatus.lastChanged)

    // ... and write it to Firestore.
    return userStatusFirestoreRef.set(eventStatus)
  })
