import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconSearch,
  IconCircleCheck,
  IconBan,
  IconClock,
  IconUserOff,
} from '@tabler/icons-react'
import { useAlunos } from '@/hooks/useAlunos'
import { StatusAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { FiltroStatus } from '@/hooks/useAlunos'

// ── helpers ───────────────────────────────────────────────────────────────────

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

type TipoBadge = 'ativo' | 'suspenso' | 'concluindo'

function calcularBadge(aluno: Aluno, anoAtual: number): TipoBadge {
  if (aluno.status === StatusAluno.Suspenso) return 'suspenso'
  if (aluno.anoConclusao === anoAtual) return 'concluindo'
  return 'ativo'
}

// ── BadgeStatus ───────────────────────────────────────────────────────────────

interface BadgeStatusProps {
  tipo: TipoBadge
  onClick?: () => void
}

function BadgeStatus({ tipo, onClick }: BadgeStatusProps) {
  if (tipo === 'suspenso') {
    return (
      <button
        data-testid="badge-status"
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        className="flex items-center gap-xs bg-danger-bg text-danger-text
                   rounded-pill px-xl py-[2px] text-xs font-medium"
      >
        <IconBan size={11} /> Suspenso
      </button>
    )
  }

  if (tipo === 'concluindo') {
    return (
      <span
        data-testid="badge-status"
        className="flex items-center gap-xs bg-warning-bg text-warning-text
                   rounded-pill px-xl py-[2px] text-xs font-medium"
      >
        <IconClock size={11} /> Concluindo
      </span>
    )
  }

  return (
    <span
      data-testid="badge-status"
      className="flex items-center gap-xs bg-success-bg text-success-text
                 rounded-pill px-xl py-[2px] text-xs font-medium"
    >
      <IconCircleCheck size={11} /> Ativo
    </span>
  )
}

// ── AlunoCard ─────────────────────────────────────────────────────────────────

interface AlunoCardProps {
  aluno: Aluno
  anoAtual: number
  onClickCard: () => void
  onReativar: () => void
}

function AlunoCard({ aluno, anoAtual, onClickCard, onReativar }: AlunoCardProps) {
  const tipo = calcularBadge(aluno, anoAtual)

  return (
    <div
      data-testid={`aluno-card-${aluno.id}`}
      onClick={onClickCard}
      className="bg-surface border-thin border-border rounded-card p-lg flex items-center gap-md cursor-pointer"
    >
      <div className="w-avatar-sm h-avatar-sm rounded-full bg-primary
                      flex items-center justify-center
                      text-md font-medium text-white flex-shrink-0">
        {iniciais(aluno.nome)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-text-primary">{aluno.nome}</p>
        <p className="text-sm text-text-secondary">
          {aluno.faculdade} · {aluno.curso} · {aluno.semestre}º sem.
        </p>
      </div>
      <BadgeStatus tipo={tipo} onClick={tipo === 'suspenso' ? onReativar : undefined} />
    </div>
  )
}

// ── ModalReativacao ───────────────────────────────────────────────────────────

interface ModalReativacaoProps {
  onConfirmar: () => void
  onCancelar: () => void
}

function ModalReativacao({ onConfirmar, onCancelar }: ModalReativacaoProps) {
  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface rounded-modal p-huge w-[90%] max-w-sm
                   flex flex-col items-center gap-md"
      >
        <IconCircleCheck size={24} className="text-success-strong" />
        <h2 className="text-title font-medium text-success-strong">Reativar aluno?</h2>
        <p className="text-body text-text-secondary text-center">
          O aluno voltará a ter acesso às reservas imediatamente.
        </p>
        <div className="flex gap-md w-full">
          <button
            onClick={onConfirmar}
            className="flex-1 bg-success-strong text-white rounded-button py-lg
                       text-body font-medium"
          >
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

// ── Filtro ────────────────────────────────────────────────────────────────────

const FILTROS: { valor: FiltroStatus; label: string }[] = [
  { valor: 'todos',     label: 'Todos' },
  { valor: 'suspensos', label: 'Suspensos' },
  { valor: 'concluindo', label: 'Concluindo' },
]

// ── AlunosPage ────────────────────────────────────────────────────────────────

export function AlunosPage() {
  const anoAtual = new Date().getFullYear()
  const navigate = useNavigate()
  const {
    busca,
    filtroStatus,
    alunosFiltrados,
    carregando,
    erro,
    total,
    setBusca,
    setFiltroStatus,
    reativarAluno,
  } = useAlunos(anoAtual)

  const [alunoParaReativar, setAlunoParaReativar] = useState<string | null>(null)

  async function handleConfirmarReativacao() {
    if (!alunoParaReativar) return
    await reativarAluno(alunoParaReativar)
    setAlunoParaReativar(null)
  }

  const semAlunos = !carregando && !erro && alunosFiltrados.length === 0

  return (
    <div className="flex flex-col gap-lg">

      {/* Barra de busca */}
      <div className="bg-surface border-thin border-border rounded-input
                      px-lg py-sm flex items-center gap-sm">
        <IconSearch size={13} className="text-primary flex-shrink-0" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          className="flex-1 text-md text-text-disabled bg-transparent outline-none
                     placeholder:text-text-disabled"
        />
      </div>

      {/* Filtros de status */}
      <div className="flex bg-primary-medium rounded-input p-[2px]">
        {FILTROS.map(({ valor, label }) => (
          <button
            key={valor}
            onClick={() => setFiltroStatus(valor)}
            className={`flex-1 flex items-center justify-center rounded-sm py-xs text-sm font-medium ${
              filtroStatus === valor
                ? 'bg-primary text-white'
                : 'text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Total */}
      <p className="text-sm text-text-secondary">
        <span data-testid="total-alunos" className="font-medium text-text-primary">{total}</span>
        {' '}aluno{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </p>

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

      {/* Empty state */}
      {semAlunos && (
        <div className="flex flex-col items-center gap-md py-huge">
          <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle
                          flex items-center justify-center">
            <IconUserOff size={24} className="text-primary" />
          </div>
          <p className="text-body font-medium text-text-primary">Nenhum aluno encontrado</p>
          <p className="text-md text-text-secondary text-center">
            {busca
              ? 'Tente ajustar a busca ou os filtros.'
              : 'Ainda não há alunos cadastrados.'}
          </p>
        </div>
      )}

      {/* Lista de alunos */}
      {!carregando && !erro && alunosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {alunosFiltrados.map((aluno) => (
            <AlunoCard
              key={aluno.id}
              aluno={aluno}
              anoAtual={anoAtual}
              onClickCard={() => navigate(`/admin/alunos/${aluno.id}`)}
              onReativar={() => setAlunoParaReativar(aluno.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de reativação */}
      {alunoParaReativar && (
        <ModalReativacao
          onConfirmar={handleConfirmarReativacao}
          onCancelar={() => setAlunoParaReativar(null)}
        />
      )}

    </div>
  )
}
