import admin from 'firebase-admin'

const EMULATOR_HOST = process.env.EMULATOR_HOST ?? 'localhost'
process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:9099`
process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:8080`

const app = admin.apps.length ? admin.apps[0]! : admin.initializeApp({ projectId: 'maragobus-dev' })

export const adminAuth = admin.auth(app)
export const adminDb = admin.firestore(app)
