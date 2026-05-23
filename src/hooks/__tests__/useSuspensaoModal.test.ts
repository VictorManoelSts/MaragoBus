import { renderHook, act, waitFor } from '@testing-library/react'
import { useSuspensaoModal } from '@/hooks/useSuspensaoModal'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Aluno } from '@/types/aluno'
import type { Advertencia } from '@/types/advertencia'
import type { Timestamp } from 'firebase/firestore'

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'aluno-1' } },
  db: {},
}))

const mockGetDoc = jest.fn()
const mockDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}))

const mockBuscarAdvertencias = jest.fn()

jest.mock('@/services/advertenciaService', () => ({
  advertenciaService: {
    buscarAdvertencias: (...args: unknown[]) => mockBuscarAdvertencias(...args),
  },
}))

const mockAluno: Aluno = {
  id: 'aluno-1', nome: 'Luana Beatriz', cpf: '12345678901',
  telefone: '82999999999', endereco: 'Rua das Flores, 123', foto: null,
  faculdade: 'Uninassau', curso: 'Direito', modalidade: ModalidadeAluno.Presencial,
  semestre: 3, anoConclusao: 2026, pontoEmbarquePadrao: 'Praça Central',
  status: StatusAluno.Ativo, dataSuspensao: null, dataReativacao: null,
  primeiroAcesso: false,
}

const mockAlunoSuspenso: Aluno = {
  ...mockAluno,
  status: StatusAluno.Suspenso,
  dataReativacao: '2025-05-28',
}

const mockAdvertencias: Advertencia[] = [
  { id: 'a1', alunoId: 'aluno-1', motivo: 'Falta sem aviso', aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta, data: {} as unknown as Timestamp },
  { id: 'a2', alunoId: 'aluno-1', motivo: 'Comportamento inadequado', aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta, data: {} as unknown as Timestamp },
  { id: 'a3', alunoId: 'aluno-1', motivo: 'Ausência repetida', aplicadaPor: 'admin', tipo: TipoAdvertencia.Direta, data: {} as unknown as Timestamp },
]

function makeAlunoSnap(aluno: Aluno) {
  const { id: _id, ...dados } = aluno
  return { exists: () => true, data: () => dados }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDoc.mockReturnValue('doc-ref')
})

describe('useSuspensaoModal — aluno ativo', () => {
  it('mostrar=false quando aluno não está suspenso', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoSnap(mockAluno))
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.mostrar).toBe(false)
  })

  it('não carrega advertências quando aluno está ativo', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoSnap(mockAluno))
    renderHook(() => useSuspensaoModal())
    await waitFor(() => {})
    expect(mockBuscarAdvertencias).not.toHaveBeenCalled()
  })

  it('advertencias é array vazio quando aluno não está suspenso', async () => {
    mockGetDoc.mockResolvedValue(makeAlunoSnap(mockAluno))
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.advertencias).toHaveLength(0)
  })
})

describe('useSuspensaoModal — aluno suspenso', () => {
  beforeEach(() => {
    mockGetDoc.mockResolvedValue(makeAlunoSnap(mockAlunoSuspenso))
    mockBuscarAdvertencias.mockResolvedValue(mockAdvertencias)
  })

  it('mostrar=true quando aluno está suspenso', async () => {
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.mostrar).toBe(true)
  })

  it('retorna as advertências do aluno suspenso', async () => {
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.advertencias).toHaveLength(3)
    expect(result.current.advertencias[0].motivo).toBe('Falta sem aviso')
  })

  it('retorna dataReativacao do aluno', async () => {
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.dataReativacao).toBe('2025-05-28')
  })

  it('mostrar=false após chamar fechar()', async () => {
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.mostrar).toBe(true)
    act(() => result.current.fechar())
    expect(result.current.mostrar).toBe(false)
  })

  it('advertências continuam disponíveis após fechar (aluno acessa o app)', async () => {
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => result.current.fechar())
    expect(result.current.advertencias).toHaveLength(3)
  })
})

describe('useSuspensaoModal — documento inexistente', () => {
  it('mostrar=false quando documento do aluno não existe', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null })
    const { result } = renderHook(() => useSuspensaoModal())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.mostrar).toBe(false)
  })
})
