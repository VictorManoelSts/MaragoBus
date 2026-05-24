import { useState } from 'react'
import {
  IconBell,
  IconClipboardOff,
  IconAlertTriangle,
  IconSteeringWheel,
  IconCalendar,
  IconCheck,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react'
import { useSolicitacoes } from '@/hooks/useSolicitacoes'
import type { SolicitacaoComDetalhes } from '@/services/adminService'
import type { Timestamp } from 'firebase/firestore'

// ── helpers ───────────────────────────────────────────────────────────────────

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function formatarData(timestamp: Timestamp): string {
  const data = timestamp.toDate()
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  return `${dia}/${mes}/${ano}`
}

// ── tipos de estado da ação inline ────────────────────────────────────────────

type TipoAcao = 'confirmar' | 'rejeitar'

interface AcaoAberta {
  id: string
  tipo: TipoAcao
}

// ── SolicitacaoCard ───────────────────────────────────────────────────────────

interface SolicitacaoCardProps {
  sol: SolicitacaoComDetalhes
  acaoAberta: AcaoAberta | null
  justificativa: string
  erroJustificativa: string | null
  erroAcao: string | null
  processando: boolean
  onAbrirAcao: (id: string, tipo: TipoAcao) => void
  onCancelar: () => void
  onChangeJustificativa: (valor: string) => void
  onSubmit: () => void
}

function SolicitacaoCard({
  sol,
  acaoAberta,
  justificativa,
  erroJustificativa,
  erroAcao,
  processando,
  onAbrirAcao,
  onCancelar,
  onChangeJustificativa,
  onSubmit,
}: SolicitacaoCardProps) {
  const formularioAberto = acaoAberta?.id === sol.id

  return (
    <div className="bg-surface border-thin border-border rounded-card p-lg flex flex-col gap-md">

      {/* Cabeçalho: avatar + nome + motorista + data */}
      <div className="flex items-center gap-md">
        <div className="w-avatar-sm h-avatar-sm rounded-full bg-primary
                        flex items-center justify-center
                        text-md font-medium text-white flex-shrink-0">
          {iniciais(sol.nomeAluno)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-text-primary">{sol.nomeAluno}</p>
          <p className="text-sm text-text-secondary flex items-center gap-xs">
            <IconSteeringWheel size={9} className="flex-shrink-0" />
            {sol.nomeMotorista}
          </p>
        </div>
        <span className="text-sm text-text-disabled flex items-center gap-xs flex-shrink-0">
          <IconCalendar size={10} />
          {formatarData(sol.data)}
        </span>
      </div>

      {/* Motivo */}
      <div className="bg-warning-bg border-thin border-warning-border rounded-input px-md py-sm">
        <p className="text-sm text-warning-text flex items-start gap-xs">
          <IconAlertTriangle size={11} className="flex-shrink-0 mt-[2px]" />
          {sol.motivo}
        </p>
      </div>

      {/* Ações */}
      {formularioAberto ? (
        <div className="flex flex-col gap-sm">

          {/* Campo de justificativa */}
          <div className="flex flex-col gap-xs">
            <label
              htmlFor={`justificativa-${sol.id}`}
              className="text-md font-medium text-text-secondary"
            >
              Justificativa
              <span className="text-required ml-xs">*</span>
            </label>
            <textarea
              id={`justificativa-${sol.id}`}
              value={justificativa}
              onChange={(e) => onChangeJustificativa(e.target.value)}
              placeholder="Descreva o motivo da decisão..."
              disabled={processando}
              className={[
                'w-full rounded-input px-xl py-lg text-base outline-none resize-none',
                erroJustificativa
                  ? 'bg-input-error border-thick border-danger-strong text-text-primary'
                  : 'bg-primary-light border-thin border-border text-text-disabled placeholder:text-text-disabled focus:border-medium focus:border-primary focus:bg-surface',
                processando ? 'opacity-60 cursor-not-allowed' : '',
              ].join(' ')}
              rows={3}
            />
            {erroJustificativa && (
              <p className="flex items-center gap-xs text-md text-danger-text">
                <IconAlertCircle size={12} />
                {erroJustificativa}
              </p>
            )}
          </div>

          {/* Erro de ação */}
          {erroAcao && (
            <p className="flex items-center gap-xs text-md text-danger-text">
              <IconAlertCircle size={12} />
              {erroAcao}
            </p>
          )}

          {/* Botões de submit */}
          <div className="flex gap-md">
            {acaoAberta!.tipo === 'confirmar' ? (
              <button
                onClick={onSubmit}
                disabled={processando}
                className="flex-1 bg-primary text-white rounded-button py-lg
                           text-body font-medium flex items-center justify-center gap-sm
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <IconCheck size={14} />
                Confirmar
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={processando}
                className="flex-1 bg-transparent border-thick border-danger-text
                           text-danger-text rounded-button py-lg
                           text-body font-medium flex items-center justify-center gap-sm
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <IconX size={14} />
                Rejeitar
              </button>
            )}
            <button
              onClick={onCancelar}
              disabled={processando}
              className="flex-1 border-thick border-border text-text-secondary
                         rounded-button py-lg text-body font-medium
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-md">
          <button
            onClick={() => onAbrirAcao(sol.id, 'confirmar')}
            className="flex-1 bg-primary text-white rounded-button py-lg
                       text-body font-medium flex items-center justify-center gap-sm"
          >
            <IconCheck size={14} />
            Confirmar
          </button>
          <button
            onClick={() => onAbrirAcao(sol.id, 'rejeitar')}
            className="flex-1 bg-transparent border-thick border-danger-text
                       text-danger-text rounded-button py-lg
                       text-body font-medium flex items-center justify-center gap-sm"
          >
            <IconX size={14} />
            Rejeitar
          </button>
        </div>
      )}
    </div>
  )
}

// ── SolicitacoesPage ──────────────────────────────────────────────────────────

export function SolicitacoesPage() {
  const { solicitacoes, carregando, confirmar, rejeitar } = useSolicitacoes()

  const [acaoAberta, setAcaoAberta] = useState<AcaoAberta | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [erroJustificativa, setErroJustificativa] = useState<string | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  function abrirAcao(id: string, tipo: TipoAcao) {
    setAcaoAberta({ id, tipo })
    setJustificativa('')
    setErroJustificativa(null)
    setErroAcao(null)
  }

  function cancelar() {
    setAcaoAberta(null)
    setJustificativa('')
    setErroJustificativa(null)
    setErroAcao(null)
  }

  async function submeter() {
    if (!acaoAberta) return

    if (!justificativa.trim()) {
      setErroJustificativa('Justificativa é obrigatória')
      return
    }

    setErroJustificativa(null)
    setErroAcao(null)
    setProcessando(true)

    try {
      const sol = solicitacoes.find((s) => s.id === acaoAberta.id)
      if (!sol) return

      if (acaoAberta.tipo === 'confirmar') {
        await confirmar(sol.id, sol.alunoId, sol.motivo, justificativa.trim())
      } else {
        await rejeitar(sol.id, justificativa.trim())
      }

      setAcaoAberta(null)
      setJustificativa('')
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div className="flex flex-col gap-lg">

      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <h1 className="text-title font-medium text-text-primary">Solicitações</h1>
        <div className="relative">
          <IconBell size={20} className="text-primary" />
          {solicitacoes.length > 0 && (
            <span
              data-testid="badge-pendencias"
              className="absolute -top-1 -right-1 w-badge-dot h-badge-dot
                         bg-badge rounded-full flex items-center justify-center
                         text-xs font-medium text-white pointer-events-none"
            >
              {solicitacoes.length}
            </span>
          )}
        </div>
      </div>

      {/* Spinner */}
      {carregando && (
        <div className="flex flex-col items-center justify-center gap-lg py-huge" role="status">
          <div className="w-spinner h-spinner rounded-full border-[3px]
                          border-spinner-track border-t-primary spinner-animation" />
          <p className="text-base text-text-secondary">Carregando...</p>
        </div>
      )}

      {/* Empty state */}
      {!carregando && solicitacoes.length === 0 && (
        <div className="flex flex-col items-center gap-md py-huge">
          <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle
                          flex items-center justify-center">
            <IconClipboardOff size={24} className="text-primary" />
          </div>
          <p className="text-body font-medium text-text-primary">
            Nenhuma solicitação pendente
          </p>
          <p className="text-md text-text-secondary text-center">
            Todas as solicitações do motorista já foram processadas
          </p>
        </div>
      )}

      {/* Lista de solicitações */}
      {!carregando && solicitacoes.length > 0 && (
        <div className="flex flex-col gap-md">
          {solicitacoes.map((sol) => (
            <SolicitacaoCard
              key={sol.id}
              sol={sol}
              acaoAberta={acaoAberta}
              justificativa={justificativa}
              erroJustificativa={erroJustificativa}
              erroAcao={erroAcao}
              processando={processando}
              onAbrirAcao={abrirAcao}
              onCancelar={cancelar}
              onChangeJustificativa={setJustificativa}
              onSubmit={submeter}
            />
          ))}
        </div>
      )}
    </div>
  )
}
