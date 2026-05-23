import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdvertenciaModal } from '@/components/AdvertenciaModal'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const onEnviar = jest.fn()
const onFechar = jest.fn()

function renderModal(overrides: { onEnviar?: jest.Mock; onFechar?: jest.Mock } = {}) {
  render(
    <AdvertenciaModal
      nomeAluno="Alice Santos"
      onEnviar={overrides.onEnviar ?? onEnviar}
      onFechar={overrides.onFechar ?? onFechar}
    />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  onEnviar.mockResolvedValue(undefined)
})

// ── Estrutura do modal ────────────────────────────────────────────────────────

describe('AdvertenciaModal — estrutura', () => {
  it('tem role dialog com aria-modal', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('exibe o nome do aluno', () => {
    renderModal()
    expect(screen.getByText('Alice Santos')).toBeInTheDocument()
  })

  it('exibe campo de justificativa com placeholder', () => {
    renderModal()
    expect(screen.getByPlaceholderText(/justificativa/i)).toBeInTheDocument()
  })

  it('exibe botão Enviar', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument()
  })

  it('exibe botão Cancelar', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })
})

// ── Validação ─────────────────────────────────────────────────────────────────

describe('AdvertenciaModal — validação', () => {
  it('Enviar está desabilitado quando justificativa está vazia', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled()
  })

  it('Enviar está desabilitado quando justificativa tem apenas espaços', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText(/justificativa/i), '   ')
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled()
  })

  it('Enviar fica habilitado após digitar justificativa', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText(/justificativa/i), 'Faltou ao embarque')
    expect(screen.getByRole('button', { name: /enviar/i })).not.toBeDisabled()
  })
})

// ── Envio ─────────────────────────────────────────────────────────────────────

describe('AdvertenciaModal — envio', () => {
  it('chama onEnviar com a justificativa trimada', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText(/justificativa/i), '  Faltou ao embarque  ')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() =>
      expect(onEnviar).toHaveBeenCalledWith('Faltou ao embarque')
    )
  })

  it('desabilita Enviar enquanto aguarda resposta', async () => {
    onEnviar.mockReturnValue(new Promise(() => {}))
    renderModal()
    await userEvent.type(screen.getByPlaceholderText(/justificativa/i), 'Motivo')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled()
  })

  it('não chama onEnviar quando justificativa está vazia', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    expect(onEnviar).not.toHaveBeenCalled()
  })
})

// ── Feedback de sucesso ───────────────────────────────────────────────────────

describe('AdvertenciaModal — feedback de sucesso', () => {
  async function enviarComSucesso() {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText(/justificativa/i), 'Faltou')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(onEnviar).toHaveBeenCalled())
  }

  it('exibe mensagem de sucesso após envio', async () => {
    await enviarComSucesso()
    await waitFor(() =>
      expect(screen.getByText(/solicitação enviada/i)).toBeInTheDocument()
    )
  })

  it('oculta textarea após envio bem-sucedido', async () => {
    await enviarComSucesso()
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/justificativa/i)).not.toBeInTheDocument()
    )
  })

  it('oculta botão Enviar após envio bem-sucedido', async () => {
    await enviarComSucesso()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument()
    )
  })

  it('exibe botão Fechar no estado de sucesso', async () => {
    await enviarComSucesso()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument()
    )
  })

  it('botão Fechar chama onFechar', async () => {
    await enviarComSucesso()
    await waitFor(() => screen.getByRole('button', { name: /fechar/i }))
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onFechar).toHaveBeenCalledTimes(1)
  })
})

// ── Cancelar ──────────────────────────────────────────────────────────────────

describe('AdvertenciaModal — cancelar', () => {
  it('chama onFechar ao clicar em Cancelar', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onFechar).toHaveBeenCalledTimes(1)
  })

  it('não chama onEnviar ao cancelar', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onEnviar).not.toHaveBeenCalled()
  })
})
