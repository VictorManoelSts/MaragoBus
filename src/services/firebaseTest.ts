// Inicialização do Firebase exclusiva para testes de integração.
// Sempre aponta para o Firebase Emulator Suite — nunca para produção.
// Use este módulo em testes que precisam de auth, firestore, storage ou functions.

import { getApps, initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const TEST_APP_NAME = 'maragobus-test'
const TEST_PROJECT_ID = 'maragobus'

const EMULATOR = {
  auth: { url: 'http://localhost:9099' },
  firestore: { host: 'localhost', port: 8080 },
  storage: { host: 'localhost', port: 9199 },
  functions: { host: 'localhost', port: 5001 },
}

const existingApp = getApps().find((app) => app.name === TEST_APP_NAME)

const app =
  existingApp ??
  initializeApp(
    {
      apiKey: 'test-api-key',
      authDomain: 'localhost',
      projectId: TEST_PROJECT_ID,
      storageBucket: `${TEST_PROJECT_ID}.appspot.com`,
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:000000000000000000',
    },
    TEST_APP_NAME
  )

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'southamerica-east1')

if (!existingApp) {
  connectAuthEmulator(auth, EMULATOR.auth.url, { disableWarnings: true })
  connectFirestoreEmulator(db, EMULATOR.firestore.host, EMULATOR.firestore.port)
  connectStorageEmulator(storage, EMULATOR.storage.host, EMULATOR.storage.port)
  connectFunctionsEmulator(functions, EMULATOR.functions.host, EMULATOR.functions.port)
}
