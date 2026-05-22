import admin from 'firebase-admin'

process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

const app = admin.apps.length ? admin.apps[0]! : admin.initializeApp({ projectId: 'maragobus' })

export const adminAuth = admin.auth(app)
export const adminDb = admin.firestore(app)
