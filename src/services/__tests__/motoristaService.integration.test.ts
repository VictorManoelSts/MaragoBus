/**
 * @jest-environment node
 *
 * Testes de integração do motoristaService contra o Firebase Emulator.
 * Executar via: npm run test:integration
 */

const describeIfEmulator = process.env.FIREBASE_EMULATOR_HUB ? describe : describe.skip

jest.mock('@/lib/firebase', () => require('@/services/firebaseTest'))

import { motoristaService, MOTORISTA_ERROS } from '@/services/motoristaService'
import { authService } from '@/services/authService'
import { adminAuth, adminDb } from '@/services/firebaseAdminTest'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'

// ── Datas fixas para estabilidade dos testes ──────────────────────────────────
const AGORA_DISPONIVEL = new Date(2024, 2, 1, 8, 0)    // 08h → diaSeguinte liberado
const AGORA_INDISPONIVEL = new Date(2024, 2, 1, 3, 0)  // 03h → diaSeguinte bloqueado
const DATA_HOJE = '2024-03-01'
const DATA_AMANHA = '2024-03-02'

const TEST_PASSWORD = 'senha123'
const MOTORISTA_CPF = '20000000001'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function criarAluno(
  id: string,
  opts: { faculdade?: string; ponto?: string } = {}
): Promise<void> {
  await adminDb.collection('alunos').doc(id).set({
    nome: `Aluno ${id}`,
    cpf: id.replace('aluno-m', '2000000000'),
    telefone: '',
    endereco: '',
    foto: null,
    faculdade: opts.faculdade ?? 'UFAL',
    curso: 'Computação',
    modalidade: ModalidadeAluno.Presencial,
    semestre: 1,
    anoConclusao: 2026,
    pontoEmbarquePadrao: opts.ponto ?? 'Ponto Central',
    status: StatusAluno.Ativo,
    dataSuspensao: null,
    dataReativacao: null,
    primeiroAcesso: false,
  })
}

async function criarReserva(alunoId: string, data: string, ponto: string): Promise<string> {
  const ref = await adminDb.collection('reservas').add({
    alunoId,
    data,
    pontoEscolhido: ponto,
    criadaEm: new Date(),
  })
  return ref.id
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describeIfEmulator('motoristaService — integração', () => {
  let motoristaUid: string
  const reservaIds: string[] = []
  const alunoIds = ['aluno-m1', 'aluno-m2', 'aluno-m3', 'aluno-m4']

  beforeAll(async () => {
    // Cria motorista no emulador
    const email = `${MOTORISTA_CPF}@maragobus.app`
    const user = await adminAuth.createUser({ email, password: TEST_PASSWORD })
    motoristaUid = user.uid
    await adminAuth.setCustomUserClaims(motoristaUid, { perfil: 'motorista' })
    await adminDb.collection('motoristas').doc(motoristaUid).set({
      nome: 'Motorista Teste',
      telefone: '',
      primeiroAcesso: false,
    })

    // Cria alunos com faculdades e pontos diferentes
    await criarAluno('aluno-m1', { faculdade: 'UFAL', ponto: 'Ponto Central' })
    await criarAluno('aluno-m2', { faculdade: 'UNIT', ponto: 'Ponto Norte' })
    await criarAluno('aluno-m3', { faculdade: 'UFAL', ponto: 'Ponto Norte' })
    await criarAluno('aluno-m4', { faculdade: 'UNIT', ponto: 'Ponto Central' })

    // Reservas para HOJE: aluno-m1 (UFAL/Central), aluno-m2 (UNIT/Norte), aluno-m3 (UFAL/Norte)
    reservaIds.push(await criarReserva('aluno-m1', DATA_HOJE, 'Ponto Central'))
    reservaIds.push(await criarReserva('aluno-m2', DATA_HOJE, 'Ponto Norte'))
    reservaIds.push(await criarReserva('aluno-m3', DATA_HOJE, 'Ponto Norte'))

    // Reservas para AMANHÃ: aluno-m1 (Central), aluno-m4 (UNIT/Central)
    reservaIds.push(await criarReserva('aluno-m1', DATA_AMANHA, 'Ponto Central'))
    reservaIds.push(await criarReserva('aluno-m4', DATA_AMANHA, 'Ponto Central'))
  })

  beforeEach(async () => {
    await authService.login(MOTORISTA_CPF, TEST_PASSWORD)
  })

  afterEach(async () => {
    await authService.logout()
  })

  afterAll(async () => {
    await Promise.all(
      reservaIds.map((id) =>
        adminDb.collection('reservas').doc(id).delete().catch(() => undefined)
      )
    )
    await Promise.all(
      alunoIds.map((id) =>
        adminDb.collection('alunos').doc(id).delete().catch(() => undefined)
      )
    )
    await adminDb.collection('motoristas').doc(motoristaUid).delete().catch(() => undefined)
    await adminAuth.deleteUser(motoristaUid).catch(() => undefined)
  })

  // ── buscarAlunosHoje ────────────────────────────────────────────────────────

  describe('buscarAlunosHoje', () => {
    it('retorna todos os alunos com reserva na data atual', async () => {
      const resultado = await motoristaService.buscarAlunosHoje(AGORA_DISPONIVEL)

      expect(resultado).toHaveLength(3)
      expect(resultado.map((r) => r.aluno.id)).toEqual(
        expect.arrayContaining(['aluno-m1', 'aluno-m2', 'aluno-m3'])
      )
    })

    it('retorna array vazio quando não há reservas na data', async () => {
      const agoraOutraData = new Date(2024, 11, 31, 8, 0)
      const resultado = await motoristaService.buscarAlunosHoje(agoraOutraData)

      expect(resultado).toHaveLength(0)
    })

    it('inclui pontoEscolhido e reservaId em cada item', async () => {
      const resultado = await motoristaService.buscarAlunosHoje(AGORA_DISPONIVEL)
      const item = resultado.find((r) => r.aluno.id === 'aluno-m1')!

      expect(item.reservaId).toBeTruthy()
      expect(item.pontoEscolhido).toBe('Ponto Central')
    })

    it('filtra por faculdade', async () => {
      const resultado = await motoristaService.buscarAlunosHoje(AGORA_DISPONIVEL, {
        faculdade: 'UFAL',
      })

      expect(resultado).toHaveLength(2)
      expect(resultado.every((r) => r.aluno.faculdade === 'UFAL')).toBe(true)
    })

    it('filtra por ponto de embarque', async () => {
      const resultado = await motoristaService.buscarAlunosHoje(AGORA_DISPONIVEL, {
        pontoEmbarque: 'Ponto Norte',
      })

      expect(resultado).toHaveLength(2)
      expect(resultado.every((r) => r.pontoEscolhido === 'Ponto Norte')).toBe(true)
    })

    it('combina filtro de faculdade e ponto de embarque', async () => {
      const resultado = await motoristaService.buscarAlunosHoje(AGORA_DISPONIVEL, {
        faculdade: 'UFAL',
        pontoEmbarque: 'Ponto Norte',
      })

      expect(resultado).toHaveLength(1)
      expect(resultado[0].aluno.id).toBe('aluno-m3')
    })

    it('retorna vazio quando filtro não encontra correspondência', async () => {
      const resultado = await motoristaService.buscarAlunosHoje(AGORA_DISPONIVEL, {
        faculdade: 'FACULDADE_INEXISTENTE',
      })

      expect(resultado).toHaveLength(0)
    })
  })

  // ── buscarAlunosDiaSeguinte ─────────────────────────────────────────────────

  describe('buscarAlunosDiaSeguinte', () => {
    it('retorna alunos do dia seguinte quando >= 5h', async () => {
      const resultado = await motoristaService.buscarAlunosDiaSeguinte(AGORA_DISPONIVEL)

      expect(resultado).toHaveLength(2)
      expect(resultado.map((r) => r.aluno.id)).toEqual(
        expect.arrayContaining(['aluno-m1', 'aluno-m4'])
      )
    })

    it('lança LISTA_DIA_SEGUINTE_INDISPONIVEL quando < 5h', async () => {
      await expect(
        motoristaService.buscarAlunosDiaSeguinte(AGORA_INDISPONIVEL)
      ).rejects.toMatchObject({ code: MOTORISTA_ERROS.LISTA_DIA_SEGUINTE_INDISPONIVEL })
    })

    it('filtra por faculdade no dia seguinte', async () => {
      const resultado = await motoristaService.buscarAlunosDiaSeguinte(AGORA_DISPONIVEL, {
        faculdade: 'UNIT',
      })

      expect(resultado).toHaveLength(1)
      expect(resultado[0].aluno.id).toBe('aluno-m4')
    })

    it('filtra por ponto no dia seguinte', async () => {
      const resultado = await motoristaService.buscarAlunosDiaSeguinte(AGORA_DISPONIVEL, {
        pontoEmbarque: 'Ponto Central',
      })

      expect(resultado).toHaveLength(2)
      expect(resultado.every((r) => r.pontoEscolhido === 'Ponto Central')).toBe(true)
    })

    it('retorna array vazio quando não há reservas no dia seguinte', async () => {
      // Usa uma data em que não há reservas amanhã
      const agoraOutraData = new Date(2024, 5, 1, 8, 0)
      const resultado = await motoristaService.buscarAlunosDiaSeguinte(agoraOutraData)

      expect(resultado).toHaveLength(0)
    })
  })
})
