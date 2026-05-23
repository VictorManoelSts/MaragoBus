/**
 * Testes unitários para adminService.editarAluno — sem emulador.
 */

jest.mock('@/lib/firebase', () => ({ db: {} }))

const mockDoc = jest.fn()
const mockUpdateDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  doc:       (...args: unknown[]) => mockDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}))

import { adminService } from '@/services/adminService'
import { ModalidadeAluno } from '@/types/aluno'

beforeEach(() => {
  jest.clearAllMocks()
  mockDoc.mockReturnValue('doc-ref')
  mockUpdateDoc.mockResolvedValue(undefined)
})

describe('adminService — editarAluno', () => {
  it('referencia o documento do aluno pelo id correto', async () => {
    await adminService.editarAluno('a1', { nome: 'Novo Nome' })
    expect(mockDoc).toHaveBeenCalledWith({}, 'alunos', 'a1')
  })

  it('chama updateDoc com os campos fornecidos', async () => {
    await adminService.editarAluno('a1', { nome: 'Novo Nome' })
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { nome: 'Novo Nome' })
  })

  it('não chama updateDoc quando dados está vazio', async () => {
    await adminService.editarAluno('a1', {})
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('atualiza múltiplos campos ao mesmo tempo', async () => {
    await adminService.editarAluno('a1', { nome: 'Novo', telefone: '99999' })
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { nome: 'Novo', telefone: '99999' })
  })

  it('atualiza modalidade corretamente', async () => {
    await adminService.editarAluno('a1', { modalidade: ModalidadeAluno.Online })
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { modalidade: ModalidadeAluno.Online })
  })

  it('atualiza semestre corretamente', async () => {
    await adminService.editarAluno('a1', { semestre: 5 })
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { semestre: 5 })
  })

  it('atualiza anoConclusao corretamente', async () => {
    await adminService.editarAluno('a1', { anoConclusao: 2028 })
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { anoConclusao: 2028 })
  })

  it('atualiza pontoEmbarquePadrao corretamente', async () => {
    await adminService.editarAluno('a1', { pontoEmbarquePadrao: 'Ponto Norte' })
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', { pontoEmbarquePadrao: 'Ponto Norte' })
  })

  it('propaga erro quando updateDoc falha', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Permissão negada'))
    await expect(adminService.editarAluno('a1', { nome: 'X' })).rejects.toThrow('Permissão negada')
  })
})
