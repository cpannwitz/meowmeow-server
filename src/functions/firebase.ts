import { CollectionReference, DocumentReference } from '@google-cloud/firestore'
import admin from 'firebase-admin'
import { GameObject, CardObject } from '../types/typings'
import logger from '../services/logger'

export function getTimestamp() {
  return (admin.firestore.FieldValue.serverTimestamp() as unknown) as string
}

export function fetchGameObject(id: string) {
  return new Promise<GameObject>((resolve, reject) => {
    admin
      .firestore()
      .collection('games')
      .doc(id)
      .get()
      .then(doc => resolve(doc.data() as GameObject))
      .catch(error => {
        logger.error('Error | Error while fetching game object: ')
        logger.error(error)
        reject(error)
      })
  })
}

export function fetchCollection<T>(ref: CollectionReference) {
  return new Promise<T[]>((resolve, reject) => {
    ref
      .get()
      .then(querySnapshot => {
        const result: T[] = []
        querySnapshot.forEach(doc => result.push(doc.data() as T))
        resolve(result)
      })
      .catch(error => {
        logger.error('Error | Error fetching Collection')
        logger.error(error)
        reject(error)
      })
  })
}

export function fetchDoc<T>(ref: DocumentReference) {
  return new Promise<T>((resolve, reject) => {
    ref
      .get()
      .then(doc => resolve(doc.data() as T))
      .catch(error => {
        logger.error('Error | Error fetching Document')
        logger.error(error)
        reject(error)
      })
  })
}

export function fetchGameDeck(gameId: string, deckId: string) {
  return new Promise<{ [key: string]: CardObject[] }>((resolve, reject) => {
    admin
      .firestore()
      .collection('games')
      .doc(gameId)
      .collection('decks')
      .doc(deckId)
      .get()
      .then(doc => {
        const data = doc.data()
        if (deckId === 'pile' && data) resolve(data as { pile: CardObject[] })
        if (deckId === 'stack' && data) resolve(data as { stack: CardObject[] })
        if (data) resolve(data as { deck: CardObject[] })
        reject('NO DATA')
      })
      .catch(error => {
        logger.error('Error | Error while fetching deck object: ')
        logger.error(error)
        reject(error)
      })
  })
}
