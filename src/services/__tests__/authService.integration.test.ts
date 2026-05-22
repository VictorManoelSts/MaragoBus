/**
 * @jest-environment node
 */

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

// eslint-disable-next-line @typescript-eslint/no-var-requires
jest.mock('@/lib/firebase', () => require('@/services/firebaseTest'))

import { authService } from '@/services/authService'
import { adminAuth, adminDb } from '@/services/firebaseAdminTest'
import { auth } from '@/lib/firebase'

type UserRecord = { uid: string }

const TEST_PASSWORD = 'senha123'

async function criarUsuario(
  cpfDigitos: string,
  perfil: 'aluno' | 'motorista' | 'admin'
): Promise<UserRecord> {
  const email = `${cpfDigitos}@maragobus.app`
  const user = await adminAuth.createUser({ email, password: TEST_PASSWORD })
  await adminAuth.setCustomUserClaims(user.uid, { perfil })
  return user
}

describeIfEmulator('authService — integração', () => {
  const criados: string[] = []

  afterAll(async () => {
    await Promise.all(criados.map((uid) => adminAuth.deleteUser(uid)))
    await Promise.all(
      criados.map((uid) =>
        Promise.all([
          adminDb.collection('alunos').doc(uid).delete(),
          adminDb.collection('motoristas').doc(uid).delete(),
        ])
      )
    )
  })

  afterEach(async () => {
    await authService.logout()
  })

  it('login aluno com primeiroAcesso: true', async () => {
    const cpf = '11111111111'
    const user = await criarUsuario(cpf, 'aluno')
    criados.push(user.uid)
    await adminDb.collection('alunos').doc(user.uid).set({ primeiroAcesso: true })

    const result = await authService.login(cpf, TEST_PASSWORD)

    expect(result).toMatchObject({ perfil: 'aluno', primeiroAcesso: true })
    expect(result.uid).toBe(user.uid)
  })

  it('login motorista com primeiroAcesso: false', async () => {
    const cpf = '22222222222'
    const user = await criarUsuario(cpf, 'motorista')
    criados.push(user.uid)
    await adminDb.collection('motoristas').doc(user.uid).set({ primeiroAcesso: false })

    const result = await authService.login(cpf, TEST_PASSWORD)

    expect(result).toMatchObject({ perfil: 'motorista', primeiroAcesso: false })
  })

  it('login admin retorna primeiroAcesso: false sem Firestore', async () => {
    const cpf = '33333333333'
    const user = await criarUsuario(cpf, 'admin')
    criados.push(user.uid)

    const result = await authService.login(cpf, TEST_PASSWORD)

    expect(result).toMatchObject({ perfil: 'admin', primeiroAcesso: false })
  })

  it('senha errada rejeita com "Senha incorreta."', async () => {
    const cpf = '44444444444'
    const user = await criarUsuario(cpf, 'aluno')
    criados.push(user.uid)

    await expect(authService.login(cpf, 'errada')).rejects.toMatchObject({
      message: 'Senha incorreta.',
    })
  })

  it('CPF não cadastrado rejeita com "CPF não cadastrado."', async () => {
    await expect(authService.login('00000000000', TEST_PASSWORD)).rejects.toMatchObject({
      message: 'CPF não cadastrado.',
    })
  })

  it('logout zera currentUser', async () => {
    const cpf = '55555555555'
    const user = await criarUsuario(cpf, 'aluno')
    criados.push(user.uid)
    await adminDb.collection('alunos').doc(user.uid).set({ primeiroAcesso: false })

    await authService.login(cpf, TEST_PASSWORD)
    await authService.logout()

    expect((auth as { currentUser: unknown }).currentUser).toBeNull()
  })

  it('getPerfil retorna perfil após login e null após logout', async () => {
    const cpf = '66666666666'
    const user = await criarUsuario(cpf, 'aluno')
    criados.push(user.uid)
    await adminDb.collection('alunos').doc(user.uid).set({ primeiroAcesso: false })

    await authService.login(cpf, TEST_PASSWORD)
    expect(await authService.getPerfil()).toBe('aluno')

    await authService.logout()
    expect(await authService.getPerfil()).toBeNull()
  })
})
