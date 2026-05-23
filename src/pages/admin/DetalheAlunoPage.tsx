import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconChevronLeft,
  IconId,
  IconPhone,
  IconHome,
  IconBook,
  IconBooks,
  IconNumber,
  IconCalendar,
  IconMapPin,
  IconAlertTriangle,
  IconClock,
  IconTrash,
  IconCircleCheck,
  IconBan,
  IconUserCircle,
  IconSchool,
} from '@tabler/icons-react'
import { useAdminDetalheAluno } from '@/hooks/useAdminDetalheAluno'
import { StatusAluno, ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { Advertencia } from '@/types/advertencia'

// ── helpers ───────────────────────────────────────────────────────────────────

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

const MODALIDADE_LABEL: Record<ModalidadeAluno, string> = {
  [ModalidadeAluno.Presencial]:     'Presencial',
  [ModalidadeAluno.Semipresencial]: 'Semipresencial',
  [ModalidadeAluno.Online]:         'Online',
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

interface InfoRowProps {
  icone: React.ReactNode
  label: string
  valor: string
}

function InfoRow({ icone, label, valor }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-xs
                    border-b border-thin border-border-subtle last:border-0">
      <span className="flex items-center gap-xs text-sm text-text-secondary">
        {icone}
        {label}
      </span>
      <span className="text-sm font-medium text-text-primary text-right max-w-[60%] break-words">
        {valor}
      </span>
    </div>
  )
}

// ── SecaoCard ─────────────────────────────────────────────────────────────────

interface SecaoCardProps {
  icone: React.ReactNode
  titulo: string
  testId: string
  children: React.ReactNode
}

function SecaoCard({ icone, titulo, testId, children }: SecaoCardProps) {
  return (
    <div
      data-testid={testId}
      className="bg-surface border-thin border-border rounded-card overflow-hidden"
    >
      <div className="flex items-center gap-sm px-xl pt-lg pb-md
                      border-b border-thin border-border-subtle">
        <span className="text-primary flex-shrink-0">{icone}</span>
        <h3 className="text-body font-medium text-text-primary">{titulo}</h3>
      </div>
      <div className="px-xl py-md flex flex-col">
        {children}
      </div>
    </div>
  )
}

// ── BadgeHeader ───────────────────────────────────────────────────────────────

function BadgeHeader({ status }: { status: StatusAluno }) {
  if (status === StatusAluno.Suspenso) {
    return (
      <span className="inline-flex items-center gap-xs mt-[3px]
                       bg-header-overlay border-thin border-header-border
                       rounded-pill px-xl py-[2px] text-xs text-danger-bg">
        <IconBan size={9} /> Suspenso
      </span>
    )
  }
  if (status === StatusAluno.Concluindo) {
    return (
      <span className="inline-flex items-center gap-xs mt-[3px]
                       bg-header-overlay border-thin border-header-border
                       rounded-pill px-xl py-[2px] text-xs text-warning-bg">
        <IconClock size={9} /> Concluindo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-xs mt-[3px]
                     bg-header-overlay border-thin border-header-border
                     rounded-pill px-xl py-[2px] text-xs text-white">
      <IconCircleCheck size={9} /> Ativo
    </span>
  )
}

// ── ModalAplicarAdvertencia ───────────────────────────────────────────────────

interface ModalAplicarAdvertenciaProps {
  onAplicar: (motivo: string) => Promise<void>
  onFechar: () => void
}

function ModalAplicarAdvertencia({ onAplicar, onFechar }: ModalAplicarAdvertenciaProps) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleAplicar() {
    if (!motivo.trim() || enviando) return
    setEnviando(true)
    try {
      await onAplicar(motivo.trim())
      onFechar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface rounded-modal p-huge w-[90%] max-w-sm flex flex-col gap-md"
      >
        <div className="flex flex-col items-center gap-sm">
          <IconAlertTriangle size={24} className="text-warning-text" />
          <h2 className="text-title font-medium text-warning-text">Aplicar advertência?</h2>
        </div>

        <textarea
          className="w-full bg-primary-light border-thin border-border rounded-input
                     px-xl py-lg text-base text-text-primary placeholder:text-text-disabled
                     outline-none resize-none"
          rows={3}
          placeholder="Justificativa obrigatória"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />

        <div className="flex gap-md w-full">
          <button
            onClick={handleAplicar}
            disabled={!motivo.trim() || enviando}
            className="flex-1 bg-warning-text text-white rounded-button py-lg
                       text-body font-medium disabled:opacity-50"
          >
            Aplicar
          </button>
          <button
            onClick={onFechar}
            className="flex-1 border-thick border-border text-text-secondary
                       rounded-button py-lg text-body font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ModalConfirmacao ──────────────────────────────────────────────────────────

type TipoConfirmacao = 'suspender' | 'excluir'

interface ModalConfirmacaoProps {
  tipo: TipoConfirmacao
  onConfirmar: () => void
  onCancelar: () => void
}

const configModal: Record<TipoConfirmacao, {
  icone: React.ReactNode
  titulo: string
  descricao: string
  classeConfirmar: string
}> = {
  suspender: {
    icone: <IconClock size={24} className="text-warning-text" />,
    titulo: 'Suspender aluno?',
    descricao: 'O aluno ficará suspenso por 3 dias úteis.',
    classeConfirmar: 'flex-1 bg-warning-text text-white rounded-button py-lg text-body font-medium',
  },
  excluir: {
    icone: <IconTrash size={24} className="text-danger-text" />,
    titulo: 'Excluir cadastro?',
    descricao: 'Todos os dados serão apagados permanentemente.',
    classeConfirmar: 'flex-1 bg-danger-text text-white rounded-button py-lg text-body font-medium',
  },
}

function ModalConfirmacao({ tipo, onConfirmar, onCancelar }: ModalConfirmacaoProps) {
  const { icone, titulo, descricao, classeConfirmar } = configModal[tipo]

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface rounded-modal p-huge w-[90%] max-w-sm
                   flex flex-col items-center gap-md"
      >
        {icone}
        <h2 className={`text-title font-medium ${tipo === 'suspender' ? 'text-warning-text' : 'text-danger-text'}`}>
          {titulo}
        </h2>
        <p className="text-body text-text-secondary text-center">{descricao}</p>
        <div className="flex gap-md w-full">
          <button onClick={onConfirmar} className={classeConfirmar}>
            Confirmar
          </button>
          <button
            onClick={onCancelar}
            className="flex-1 border-thick border-border text-text-secondary
                       rounded-button py-lg text-body font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── HistoricoAdvertencias ─────────────────────────────────────────────────────

function HistoricoAdvertencias({ advertencias }: { advertencias: Advertencia[] }) {
  if (advertencias.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-md">
        Sem advertências registradas
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-sm">
      {advertencias.map((adv) => (
        <div
          key={adv.id}
          className="border-thin border-border-subtle rounded-input p-md flex flex-col gap-xs"
        >
          <p className="text-sm text-text-secondary">
            {adv.data.toDate().toLocaleDateString('pt-BR')}
          </p>
          <p className="text-body text-text-primary">{adv.motivo}</p>
        </div>
      ))}
    </div>
  )
}

// ── DetalheAlunoPage ──────────────────────────────────────────────────────────

type ModalAberto = 'advertencia' | 'suspender' | 'excluir' | null

function renderConteudo(
  aluno: Aluno,
  advertencias: Advertencia[],
  modalAberto: ModalAberto,
  setModalAberto: (m: ModalAberto) => void,
  hook: {
    aplicarAdvertencia: (m: string) => Promise<void>
    suspenderAluno: () => Promise<void>
    reativarAluno: () => Promise<void>
    excluirAluno: () => Promise<void>
  },
  navigate: (to: string) => void,
) {
  const isSuspenso = aluno.status === StatusAluno.Suspenso

  async function handleConfirmarSuspensao() {
    await hook.suspenderAluno()
    setModalAberto(null)
  }

  async function handleConfirmarExclusao() {
    await hook.excluirAluno()
    navigate('/admin/alunos')
  }

  return (
    <>
      {/* Header azul */}
      <div
        data-testid="header-aluno"
        className="bg-primary px-xl py-[14px] flex items-center gap-lg rounded-card"
      >
        <div className="w-avatar-md h-avatar-md rounded-full bg-header-overlay
                        border-thick border-header-border
                        flex items-center justify-center
                        text-body font-medium text-white flex-shrink-0">
          {iniciais(aluno.nome)}
        </div>
        <div>
          <p className="text-body font-medium text-white">{aluno.nome}</p>
          <p className="text-sm text-white/80">{aluno.faculdade} · {aluno.curso}</p>
          <BadgeHeader status={aluno.status} />
        </div>
      </div>

      {/* Dados pessoais */}
      <SecaoCard
        testId="secao-dados-pessoais"
        icone={<IconId size={15} />}
        titulo="Dados pessoais"
      >
        <InfoRow
          icone={<IconId size={12} className="text-primary" />}
          label="CPF"
          valor={aluno.cpf}
        />
        <InfoRow
          icone={<IconPhone size={12} className="text-primary" />}
          label="Telefone"
          valor={aluno.telefone}
        />
        <InfoRow
          icone={<IconHome size={12} className="text-primary" />}
          label="Endereço"
          valor={aluno.endereco}
        />
      </SecaoCard>

      {/* Dados acadêmicos */}
      <SecaoCard
        testId="secao-dados-academicos"
        icone={<IconSchool size={15} />}
        titulo="Dados acadêmicos"
      >
        <InfoRow
          icone={<IconBook size={12} className="text-primary" />}
          label="Curso"
          valor={aluno.curso}
        />
        <InfoRow
          icone={<IconBooks size={12} className="text-primary" />}
          label="Modalidade"
          valor={MODALIDADE_LABEL[aluno.modalidade]}
        />
        <InfoRow
          icone={<IconNumber size={12} className="text-primary" />}
          label="Semestre"
          valor={`${aluno.semestre}º semestre`}
        />
        <InfoRow
          icone={<IconCalendar size={12} className="text-primary" />}
          label="Conclusão"
          valor={String(aluno.anoConclusao)}
        />
        <InfoRow
          icone={<IconMapPin size={12} className="text-primary" />}
          label="Ponto padrão"
          valor={aluno.pontoEmbarquePadrao}
        />
      </SecaoCard>

      {/* Histórico de advertências */}
      <SecaoCard
        testId="secao-advertencias"
        icone={<IconAlertTriangle size={15} />}
        titulo="Advertências"
      >
        <HistoricoAdvertencias advertencias={advertencias} />
      </SecaoCard>

      {/* Botões de ação */}
      <div className="flex flex-col gap-md">
        <button
          onClick={() => setModalAberto('advertencia')}
          className="w-full border-thick border-warning-text text-warning-text
                     rounded-button py-lg flex items-center justify-center gap-sm
                     text-body font-medium"
        >
          <IconAlertTriangle size={14} />
          Aplicar advertência
        </button>

        {!isSuspenso && (
          <button
            onClick={() => setModalAberto('suspender')}
            className="w-full border-thick border-warning-text text-warning-text
                       rounded-button py-lg flex items-center justify-center gap-sm
                       text-body font-medium"
          >
            <IconClock size={14} />
            Suspender
          </button>
        )}

        {isSuspenso && (
          <button
            onClick={hook.reativarAluno}
            className="w-full border-thick border-success-strong text-success-strong
                       rounded-button py-lg flex items-center justify-center gap-sm
                       text-body font-medium"
          >
            <IconCircleCheck size={14} />
            Reativar acesso
          </button>
        )}

        <button
          onClick={() => setModalAberto('excluir')}
          className="w-full border-thick border-danger-text text-danger-text
                     rounded-button py-lg flex items-center justify-center gap-sm
                     text-body font-medium"
        >
          <IconTrash size={14} />
          Excluir cadastro
        </button>
      </div>

      {/* Modais */}
      {modalAberto === 'advertencia' && (
        <ModalAplicarAdvertencia
          onAplicar={hook.aplicarAdvertencia}
          onFechar={() => setModalAberto(null)}
        />
      )}

      {(modalAberto === 'suspender' || modalAberto === 'excluir') && (
        <ModalConfirmacao
          tipo={modalAberto}
          onConfirmar={modalAberto === 'suspender' ? handleConfirmarSuspensao : handleConfirmarExclusao}
          onCancelar={() => setModalAberto(null)}
        />
      )}
    </>
  )
}

export function DetalheAlunoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null)

  const {
    aluno,
    advertencias,
    carregando,
    erro,
    aplicarAdvertencia,
    suspenderAluno,
    reativarAluno,
    excluirAluno,
  } = useAdminDetalheAluno(id ?? '')

  return (
    <div className="flex flex-col gap-lg">

      {/* Botão voltar */}
      <button
        onClick={() => navigate('/admin/alunos')}
        className="flex items-center gap-xs text-primary text-sm font-medium self-start"
      >
        <IconChevronLeft size={14} />
        Voltar
      </button>

      {/* Spinner */}
      {carregando && (
        <div className="flex flex-col items-center justify-center gap-lg flex-1 py-huge">
          <div
            role="status"
            className="w-spinner h-spinner rounded-full border-[3px]
                       border-spinner-track border-t-primary spinner-animation"
          />
          <p className="text-base text-text-secondary">Carregando...</p>
        </div>
      )}

      {/* Erro */}
      {!carregando && erro && (
        <p className="text-danger-text text-base">{erro}</p>
      )}

      {/* Conteúdo */}
      {!carregando && !erro && aluno && renderConteudo(
        aluno,
        advertencias,
        modalAberto,
        setModalAberto,
        { aplicarAdvertencia, suspenderAluno, reativarAluno, excluirAluno },
        navigate,
      )}

    </div>
  )
}
