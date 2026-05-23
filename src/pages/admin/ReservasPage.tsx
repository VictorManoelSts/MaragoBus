import {
  IconCalendarCheck,
  IconCalendar,
  IconCalendarStats,
  IconBuilding,
  IconMapPin,
  IconCalendarOff,
} from '@tabler/icons-react'
import { useAdminReservas } from '@/hooks/useAdminReservas'
import type { ReservaAdmin } from '@/services/adminService'

// ── Componentes internos ───────────────────────────────────────────────────────

type TipoMetrica = 'hoje' | 'amanha' | 'total'

interface MetricCardProps {
  tipo: TipoMetrica
  valor: number
}

const metricaConfig = {
  hoje:   { label: 'Hoje',   barClass: 'bg-metric-today',    iconClass: 'text-metric-today',    Icone: IconCalendarCheck },
  amanha: { label: 'Amanhã', barClass: 'bg-metric-tomorrow', iconClass: 'text-metric-tomorrow', Icone: IconCalendar },
  total:  { label: 'Total',  barClass: 'bg-metric-total',    iconClass: 'text-metric-total',    Icone: IconCalendarStats },
} as const

function MetricCard({ tipo, valor }: MetricCardProps) {
  const { label, barClass, iconClass, Icone } = metricaConfig[tipo]
  return (
    <div
      data-testid={`metric-${tipo}`}
      className="flex-1 bg-surface border-thin border-border rounded-card overflow-hidden"
    >
      <div className={`h-metric-bar ${barClass}`} />
      <div className="p-md flex flex-col items-center">
        <Icone size={16} className={iconClass} />
        <p className="text-heading font-medium text-text-primary">{valor}</p>
        <p className="text-sm text-text-secondary">{label}</p>
      </div>
    </div>
  )
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

interface AlunoCardProps {
  reserva: ReservaAdmin
}

function AlunoCard({ reserva }: AlunoCardProps) {
  return (
    <div className="bg-surface border-thin border-border rounded-card p-lg flex items-center gap-md">
      <div className="w-avatar-sm h-avatar-sm rounded-full bg-primary
                      flex items-center justify-center
                      text-md font-medium text-white flex-shrink-0">
        {iniciais(reserva.aluno.nome)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-text-primary">{reserva.aluno.nome}</p>
        <p className="text-sm text-text-secondary">{reserva.aluno.curso} · {reserva.aluno.semestre}º sem.</p>
        <p className="text-sm text-text-secondary flex items-center gap-xs mt-[2px]">
          <IconMapPin size={9} className="flex-shrink-0" />
          {reserva.pontoEscolhido}
        </p>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export function ReservasPage() {
  const agora = new Date()
  const {
    aba,
    reservasAgrupadas,
    metricas,
    abaAmanhaDisponivel,
    carregando,
    erro,
    selecionarAba,
  } = useAdminReservas(agora)

  const faculdadesOrdenadas = Object.keys(reservasAgrupadas).sort()
  const semReservas = !carregando && !erro && faculdadesOrdenadas.length === 0

  return (
    <div className="flex flex-col gap-lg">

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-md">
        <MetricCard tipo="hoje"   valor={metricas.hoje} />
        <MetricCard tipo="amanha" valor={metricas.amanha} />
        <MetricCard tipo="total"  valor={metricas.total} />
      </div>

      {/* Tabs */}
      <div className="flex bg-primary-medium rounded-input p-[2px]">
        <button
          onClick={() => selecionarAba('hoje')}
          className={`flex-1 flex items-center justify-center gap-xs rounded-sm py-xs text-sm font-medium ${
            aba === 'hoje' ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >
          <IconCalendarCheck size={11} /> Hoje
        </button>
        {abaAmanhaDisponivel && (
          <button
            onClick={() => selecionarAba('amanha')}
            className={`flex-1 flex items-center justify-center gap-xs rounded-sm py-xs text-sm font-medium ${
              aba === 'amanha' ? 'bg-primary text-white' : 'text-text-secondary'
            }`}
          >
            <IconCalendar size={11} /> Amanhã
          </button>
        )}
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

      {/* Erro */}
      {!carregando && erro && (
        <p className="text-danger-text text-base">{erro}</p>
      )}

      {/* Empty state */}
      {semReservas && (
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
      {!carregando && !erro && (
        <div className="flex flex-col gap-xl">
          {faculdadesOrdenadas.map((faculdade) => (
            <section key={faculdade}>
              <div className="flex items-center gap-sm mb-md">
                <IconBuilding size={13} className="text-primary" />
                <h2 className="text-base font-medium text-text-primary">{faculdade}</h2>
                <span
                  data-testid={`count-${faculdade}`}
                  className="text-sm text-text-secondary"
                >
                  ({reservasAgrupadas[faculdade].length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {reservasAgrupadas[faculdade].map((r) => (
                  <AlunoCard key={r.reservaId} reserva={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

    </div>
  )
}
