/**
 * @jest-environment node
 *
 * Teste de sanidade do Firebase Emulator Suite.
 *
 * Execução:
 *   npm run test:integration   → sobe os emuladores e roda este teste
 *   npm test                   → este describe é ignorado (sem emulador)
 *
 * O guard `FIREBASE_EMULATOR_HUB` é definido automaticamente pelo
 * comando `firebase emulators:exec` — não precisa ser configurado manualmente.
 */

import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import type { Firestore } from 'firebase/firestore'
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore'

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

describeIfEmulator('Firebase Emulator — Sanidade', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'maragobus',
      firestore: {
        host: 'localhost',
        port: 8080,
      },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  it('conecta ao emulador Firestore, cria e lê um documento', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore
      const docRef = doc(db, '_sanity_test', 'verificacao')

      await setDoc(docRef, { mensagem: 'ambiente funcionando', ok: true })

      const snap = await getDoc(docRef)

      expect(snap.exists()).toBe(true)
      expect(snap.data()?.mensagem).toBe('ambiente funcionando')
      expect(snap.data()?.ok).toBe(true)

      await deleteDoc(docRef)
    })
  })
})
