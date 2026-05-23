/**
 * @jest-environment node
 *
 * Testes de integração do reservaService contra o Firebase Emulator.
 * Executar via: npm run test:integration
 */

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

jest.mock('@/lib/firebase', () => require('@/services/firebaseTest'))

import { reservaService, RESERVA_ERROS } from '@/services/reservaService'
import { authService } from '@/services/authService'
import { adminAuth, adminDb } from '@/services/firebaseAdminTest'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'

const TEST_PASSWORD = 'senha123'

const JANELA_ABERTA = new Date(2024, 0, 15, 18, 0)   // 18h → aberta
const JANELA_FECHADA = new Date(2024, 0, 15, 14, 0)  // 14h → fechada
const CANCELAMENTO_OK = new Date(2024, 0, 15, 10, 0) // 10h → permitido
const CANCELAMENTO_EXP = new Date(2024, 0, 15, 17, 0) // 17h → expirado

async function criarAlunoEmulador(cpf: string, status = StatusAluno.Ativo) {
  const email = `${cpf}@maragobus.app`
  const user = await adminAuth.createUser({ email, password: TEST_PASSWORD })
  await adminAuth.setCustomUserClaims(user.uid, { perfil: 'aluno' })
  await adminDb.collection('alunos').doc(user.uid).set({
    nome: 'Aluno Teste',
    cpf,
    status,
    primeiroAcesso: false,
    telefone: '',
    endereco: '',
    foto: null,
    faculdade: 'UFAL',
    curso: 'Computação',
    modalidade: ModalidadeAluno.Presencial,
    semestre: 1,
    anoConclusao: 2026,
    pontoEmbarquePadrao: 'Ponto Central',
    dataSuspensao: null,
    dataReativacao: null,
  })
  return user
}

describeIfEmulator('reservaService — integração', () => {
  const criados: string[] = []
  const reservasCriadas: string[] = []

  afterEach(async () => {
    await authService.logout()
  })

  afterAll(async () => {
    await Promise.all(reservasCriadas.map((id) =>
      adminDb.collection('reservas').doc(id).delete().catch(() => undefined)
    ))
    await Promise.all(criados.map((uid) =>
      Promise.all([
        adminAuth.deleteUser(uid).catch(() => undefined),
        adminDb.collection('alunos').doc(uid).delete().catch(() => undefined),
      ])
    ))
  })

  // ── criarReserva ────────────────────────────────────────────────────────────

  describe('criarReserva', () => {
    it('cria documento no Firestore quando janela aberta e aluno ativo', async () => {
      const cpf = '10000000001'
      const user = await criarAlunoEmulador(cpf)
      criados.push(user.uid)

      await authService.login(cpf, TEST_PASSWORD)

      const reserva = await reservaService.criarReserva(
        user.uid, 'Ponto Central', '2024-01-16', JANELA_ABERTA
      )
      reservasCriadas.push(reserva.id)

      const snap = await adminDb.collection('reservas').doc(reserva.id).get()
      expect(snap.exists).toBe(true)
      expect(snap.data()).toMatchObject({
        alunoId: user.uid,
        pontoEscolhido: 'Ponto Central',
        data: '2024-01-16',
      })
    })

    it('rejeita com JANELA_FECHADA quando janela está fechada (14h)', async () => {
      const cpf = '10000000002'
      const user = await criarAlunoEmulador(cpf)
      criados.push(user.uid)

      await authService.login(cpf, TEST_PASSWORD)

      await expect(
        reservaService.criarReserva(user.uid, 'Ponto Central', '2024-01-16', JANELA_FECHADA)
      ).rejects.toMatchObject({ code: RESERVA_ERROS.JANELA_FECHADA })
    })

    it('rejeita com ALUNO_SUSPENSO quando aluno está suspenso', async () => {
      const cpf = '10000000003'
      const user = await criarAlunoEmulador(cpf, StatusAluno.Suspenso)
      criados.push(user.uid)

      await authService.login(cpf, TEST_PASSWORD)

      await expect(
        reservaService.criarReserva(user.uid, 'Ponto Central', '2024-01-16', JANELA_ABERTA)
      ).rejects.toMatchObject({ code: RESERVA_ERROS.ALUNO_SUSPENSO })
    })
  })

  // ── buscarReservaAtiva ──────────────────────────────────────────────────────

  describe('buscarReservaAtiva', () => {
    it('retorna reserva existente com campos corretos', async () => {
      const cpf = '10000000004'
      const user = await criarAlunoEmulador(cpf)
      criados.push(user.uid)

      await authService.login(cpf, TEST_PASSWORD)

      const criada = await reservaService.criarReserva(
        user.uid, 'Ponto Norte', '2024-01-17', JANELA_ABERTA
      )
      reservasCriadas.push(criada.id)

      const encontrada = await reservaService.buscarReservaAtiva(user.uid, '2024-01-17')

      expect(encontrada).toMatchObject({
        alunoId: user.uid,
        pontoEscolhido: 'Ponto Norte',
        data: '2024-01-17',
      })
    })

    it('retorna null quando não há reserva para o aluno na data', async () => {
      const cpf = '10000000005'
      const user = await criarAlunoEmulador(cpf)
      criados.push(user.uid)

      await authService.login(cpf, TEST_PASSWORD)

      const resultado = await reservaService.buscarReservaAtiva(user.uid, '2024-12-31')

      expect(resultado).toBeNull()
    })
  })

  // ── cancelarReserva ─────────────────────────────────────────────────────────

  describe('cancelarReserva', () => {
    it('deleta documento do Firestore quando dentro do prazo (10h)', async () => {
      const cpf = '10000000006'
      const user = await criarAlunoEmulador(cpf)
      criados.push(user.uid)

      await authService.login(cpf, TEST_PASSWORD)

      const reserva = await reservaService.criarReserva(
        user.uid, 'Ponto Sul', '2024-01-18', JANELA_ABERTA
      )

      await reservaService.cancelarReserva(reserva.id, user.uid, CANCELAMENTO_OK)

      const snap = await adminDb.collection('reservas').doc(reserva.id).get()
      expect(snap.exists).toBe(false)
    })

    it('rejeita com CANCELAMENTO_EXPIRADO quando prazo expirado (17h)', async () => {
      const cpf = '10000000007'
      const user = await criarAlunoEmulador(cpf)
      criados.push(user.uid)

      await authService.login(cpf, TEST_PASSWORD)

      const reserva = await reservaService.criarReserva(
        user.uid, 'Ponto Leste', '2024-01-19', JANELA_ABERTA
      )
      reservasCriadas.push(reserva.id)

      await expect(
        reservaService.cancelarReserva(reserva.id, user.uid, CANCELAMENTO_EXP)
      ).rejects.toMatchObject({ code: RESERVA_ERROS.CANCELAMENTO_EXPIRADO })
    })
  })
})
