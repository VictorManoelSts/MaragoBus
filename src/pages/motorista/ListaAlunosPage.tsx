import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconCalendarCheck,
  IconCalendar,
  IconAlertTriangle,
  IconMapPin,
  IconBuilding,
  IconCalendarOff,
  IconInfoCircle,
  IconCircleCheck,
  IconBan,
  IconClock,
} from '@tabler/icons-react'
import { useMotorista } from '@/hooks/useMotorista'
import { StatusAluno } from '@/types/aluno'
import type { AlunoComReserva } from '@/services/motoristaService'

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function BadgeStatus({ status }: { status: StatusAluno }) {
  if (status === StatusAluno.Suspenso) {
    return (
      <span className="flex items-center gap-xs bg-danger-bg text-danger-text rounded-pill px-xl py-[2px] text-xs font-medium">
        <IconBan size={11} /> Suspenso
      </span>
    )
  }
  if (status === StatusAluno.Concluindo) {
    return (
      <span className="flex items-center gap-xs bg-warning-bg text-warning-text rounded-pill px-xl py-[2px] text-xs font-medium">
        <IconClock size={11} /> Concluindo
      </span>
    )
  }
  return (
    <span className="flex items-center gap-xs bg-success-bg text-success-text rounded-pill px-xl py-[2px] text-xs font-medium">
      <IconCircleCheck size={11} /> Ativo
    </span>
  )
}

interface ModalAdvertenciaProps {
  item: AlunoComReserva
  onConfirmar: (motivo: string) => Promise<void>
  onCancelar: () => void
}

function ModalAdvertencia({ item, onConfirmar, onCancelar }: ModalAdvertenciaProps) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleConfirmar() {
    if (!motivo.trim() || enviando) return
    setEnviando(true)
    try {
      await onConfirmar(motivo.trim())
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-overlay flex items-center justify-center z-50"
    >
      <div className="bg-surface rounded-modal p-huge w-[90%] max-w-sm flex flex-col items-center gap-md">
        <IconAlertTriangle size={24} className="text-warning-text" />
        <h2 className="text-title font-medium text-warning-text">Solicitar advertência?</h2>
        <p className="text-body text-text-secondary text-center">{item.aluno.nome}</p>

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
            onClick={handleConfirmar}
            disabled={!motivo.trim() || enviando}
            className="flex-1 bg-warning-text text-white rounded-button py-lg
                       text-body font-medium disabled:opacity-50"
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

export function ListaAlunosPage() {
  const agora = new Date()
  const {
    aba,
    alunosAgrupados,
    faculdadesDisponiveis,
    pontosDisponiveis,
    filtros,
    carregando,
    abaAmanhaBloqueada,
    total,
    selecionarAba,
    toggleFaculdade,
    togglePonto,
    solicitarAdvertencia,
  } = useMotorista(agora)

  const navigate = useNavigate()
  const [modalItem, setModalItem] = useState<AlunoComReserva | null>(null)

  async function handleConfirmarAdvertencia(motivo: string) {
    if (!modalItem) return
    await solicitarAdvertencia(modalItem.aluno.id, motivo)
    setModalItem(null)
  }

  const faculdadesOrdenadas = Object.keys(alunosAgrupados).sort()
  const semAlunos = !carregando && !abaAmanhaBloqueada && faculdadesOrdenadas.length === 0

  return (
    <div className="flex flex-col gap-lg">

      {/* Tabs Hoje / Amanhã */}
      <div className="flex bg-primary-medium rounded-input p-[2px]">
        <button
          onClick={() => selecionarAba('hoje')}
          className={`flex-1 flex items-center justify-center gap-xs rounded-sm py-xs text-sm font-medium ${
            aba === 'hoje' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >
          <IconCalendarCheck size={11} /> Hoje
        </button>
        <button
          onClick={() => selecionarAba('amanha')}
          className={`flex-1 flex items-center justify-center gap-xs rounded-sm py-xs text-sm font-medium ${
            aba === 'amanha' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >
          <IconCalendar size={11} /> Amanhã
        </button>
      </div>

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

      {/* Banner — amanhã bloqueado */}
      {!carregando && abaAmanhaBloqueada && (
        <div className="bg-warning-bg border-thin border-warning-border rounded-input p-md flex items-center gap-md">
          <IconInfoCircle size={14} className="text-warning-text flex-shrink-0" />
          <p className="text-sm text-warning-text">
            Reservas de amanhã disponíveis a partir das 5h.
          </p>
        </div>
      )}

      {/* Conteúdo */}
      {!carregando && !abaAmanhaBloqueada && (
        <>
          {/* Total + filtros */}
          <div className="flex flex-col gap-md">
            <div className="flex items-center gap-xs">
              <span className="text-heading font-medium text-primary">{total}</span>
              <span className="text-base text-text-secondary">
                {total === 1 ? 'aluno' : 'alunos'}
              </span>
            </div>

            {/* Chips de faculdade */}
            {faculdadesDisponiveis.length > 0 && (
              <div className="flex flex-wrap gap-sm">
                {faculdadesDisponiveis.map((fac) => (
                  <button
                    key={fac}
                    onClick={() => toggleFaculdade(fac)}
                    className={
                      filtros.faculdade === fac
                        ? 'bg-primary border-none rounded-pill px-lg py-xs text-sm font-medium text-white'
                        : 'bg-primary-light border-thin border-border rounded-pill px-lg py-xs text-sm font-medium text-text-secondary'
                    }
                  >
                    {fac}
                  </button>
                ))}
              </div>
            )}

            {/* Chips de ponto */}
            {pontosDisponiveis.length > 0 && (
              <div className="flex flex-wrap gap-sm">
                {pontosDisponiveis.map((ponto) => (
                  <button
                    key={ponto}
                    onClick={() => togglePonto(ponto)}
                    className={
                      filtros.pontoEmbarque === ponto
                        ? 'bg-primary border-none rounded-pill px-lg py-xs text-sm font-medium text-white'
                        : 'bg-primary-light border-thin border-border rounded-pill px-lg py-xs text-sm font-medium text-text-secondary'
                    }
                  >
                    {ponto}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Empty state */}
          {semAlunos && (
            <div className="flex flex-col items-center gap-md py-huge">
              <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle flex items-center justify-center">
                <IconCalendarOff size={24} className="text-primary" />
              </div>
              <p className="text-body font-medium text-text-primary">Nenhuma reserva encontrada</p>
              <p className="text-md text-text-secondary text-center">
                Ainda não há reservas para o dia selecionado
              </p>
            </div>
          )}

          {/* Lista por faculdade */}
          <div className="flex flex-col gap-xl">
            {faculdadesOrdenadas.map((faculdade) => (
              <section key={faculdade}>
                <div className="flex items-center gap-sm mb-md">
                  <IconBuilding size={13} className="text-primary" />
                  <h2 className="text-base font-medium text-text-primary">{faculdade}</h2>
                  <span className="text-sm text-text-secondary">
                    ({alunosAgrupados[faculdade].length})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {alunosAgrupados[faculdade].map((item) => (
                    <div
                      key={item.reservaId}
                      data-testid={`aluno-card-${item.aluno.id}`}
                      onClick={() => navigate(`/motorista/alunos/${item.aluno.id}`)}
                      className="bg-surface border-thin border-border rounded-card p-lg
                                 flex items-center gap-md cursor-pointer"
                    >
                      {/* Avatar */}
                      <div className="w-avatar-sm h-avatar-sm rounded-full bg-primary
                                      flex items-center justify-center
                                      text-md font-medium text-white flex-shrink-0">
                        {iniciais(item.aluno.nome)}
                      </div>

                      {/* Dados */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-text-primary">{item.aluno.nome}</p>
                        <p className="text-sm text-text-secondary">
                          {item.aluno.curso} · {item.aluno.semestre}º sem.
                        </p>
                        <p className="text-sm text-text-secondary flex items-center gap-xs mt-[2px]">
                          <IconMapPin size={9} className="flex-shrink-0" />
                          {item.pontoEscolhido}
                        </p>
                        <div className="mt-xs">
                          <BadgeStatus status={item.aluno.status} />
                        </div>
                      </div>

                      {/* Botão advertência */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalItem(item)
                        }}
                        className="border-thick border-warning-text text-warning-text
                                   rounded-button px-lg py-xs flex items-center gap-xs
                                   text-sm font-medium flex-shrink-0"
                      >
                        <IconAlertTriangle size={12} />
                        Advertir
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {/* Modal de advertência */}
      {modalItem && (
        <ModalAdvertencia
          item={modalItem}
          onConfirmar={handleConfirmarAdvertencia}
          onCancelar={() => setModalItem(null)}
        />
      )}
    </div>
  )
}
