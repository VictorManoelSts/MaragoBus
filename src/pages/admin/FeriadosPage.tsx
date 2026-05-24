import { useState } from 'react'
import {
  IconCalendar,
  IconAlertTriangle,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconTrash,
  IconCalendarOff,
  IconAlertCircle,
} from '@tabler/icons-react'
import { useFeriados } from '@/hooks/useFeriados'
import { TipoFeriado } from '@/types/feriado'
import type { Feriado } from '@/types/feriado'

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface DiaMes {
  data: string
  diaNumero: number
  foraDoMes: boolean
}

function gerarDias(primeiroDia: Date): DiaMes[] {
  const ano = primeiroDia.getFullYear()
  const mes = primeiroDia.getMonth()
  const inicioGrade = new Date(ano, mes, 1).getDay()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()

  const mesAnterior = mes === 0 ? 11 : mes - 1
  const anoAnterior = mes === 0 ? ano - 1 : ano
  const ultimoDiaMesAnterior = new Date(anoAnterior, mesAnterior + 1, 0).getDate()

  const dias: DiaMes[] = []

  for (let i = inicioGrade - 1; i >= 0; i--) {
    const d = ultimoDiaMesAnterior - i
    dias.push({
      data: `${anoAnterior}-${String(mesAnterior + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      diaNumero: d,
      foraDoMes: true,
    })
  }

  for (let d = 1; d <= ultimoDia; d++) {
    dias.push({
      data: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      diaNumero: d,
      foraDoMes: false,
    })
  }

  const mesProximo = mes === 11 ? 0 : mes + 1
  const anoProximo = mes === 11 ? ano + 1 : ano
  let proximoDia = 1
  while (dias.length % 7 !== 0) {
    dias.push({
      data: `${anoProximo}-${String(mesProximo + 1).padStart(2, '0')}-${String(proximoDia).padStart(2, '0')}`,
      diaNumero: proximoDia,
      foraDoMes: true,
    })
    proximoDia++
  }

  return dias
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

// ── Componentes internos ──────────────────────────────────────────────────────

const CHIP_ATIVO = 'bg-primary border-none rounded-pill px-lg py-xs text-sm font-medium text-white'
const CHIP_INATIVO = 'bg-primary-light border-thin border-border rounded-pill px-lg py-xs text-sm font-medium text-text-secondary'

const INPUT_VAZIO = 'w-full bg-primary-light border-thin border-border rounded-input px-xl py-lg text-base text-text-disabled placeholder:text-text-disabled focus:border-medium focus:border-primary focus:bg-surface outline-none'
const INPUT_PREENCHIDO = 'w-full bg-surface border-thin border-border rounded-input px-xl py-lg text-base text-text-primary outline-none'
const INPUT_ERRO = 'w-full bg-input-error border-thick border-danger-strong rounded-input px-xl py-lg text-base text-text-primary outline-none'

function TipoBadge({ tipo }: { tipo: TipoFeriado }) {
  if (tipo === TipoFeriado.Nacional) {
    return (
      <span className="flex items-center bg-info-bg text-info-text rounded-pill px-xl py-[2px] text-xs font-medium flex-shrink-0">
        Nacional
      </span>
    )
  }
  if (tipo === TipoFeriado.Regional) {
    return (
      <span className="flex items-center bg-warning-bg text-warning-text rounded-pill px-xl py-[2px] text-xs font-medium flex-shrink-0">
        Regional
      </span>
    )
  }
  return (
    <span className="flex items-center bg-primary-medium text-text-secondary rounded-pill px-xl py-[2px] text-xs font-medium flex-shrink-0">
      Avulso
    </span>
  )
}

// ── FeriadosPage ──────────────────────────────────────────────────────────────

type Filtro = TipoFeriado | 'todos'

export function FeriadosPage() {
  const { feriados, carregando, erro, adicionar, remover, avisos } = useFeriados()

  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [avisoFechado, setAvisoFechado] = useState(false)
  const [mesCalendario, setMesCalendario] = useState(() => {
    const agora = new Date()
    return new Date(agora.getFullYear(), agora.getMonth(), 1)
  })

  const [formData, setFormData] = useState('')
  const [formNome, setFormNome] = useState('')
  const [formTipo, setFormTipo] = useState<TipoFeriado.Regional | TipoFeriado.Avulso>(TipoFeriado.Regional)
  const [formErro, setFormErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const feriadosFiltrados: Feriado[] = filtro === 'todos'
    ? feriados
    : feriados.filter(f => f.tipo === filtro)

  const feriadosDatasNoMes = new Set(
    feriados
      .filter(f => {
        const d = new Date(f.data + 'T00:00:00')
        return (
          d.getFullYear() === mesCalendario.getFullYear() &&
          d.getMonth() === mesCalendario.getMonth()
        )
      })
      .map(f => f.data)
  )

  const mostrarAviso = !avisoFechado && avisos.length > 0
  const dias = gerarDias(mesCalendario)

  function irMesAnterior() {
    setMesCalendario(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function irProximoMes() {
    setMesCalendario(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  async function handleAdicionar() {
    if (!formData) {
      setFormErro('Data é obrigatória.')
      return
    }
    if (!formNome.trim()) {
      setFormErro('Nome é obrigatório.')
      return
    }
    setFormErro(null)
    setEnviando(true)
    try {
      await adicionar(formData, formNome.trim(), formTipo)
      setFormData('')
      setFormNome('')
    } catch (e) {
      setFormErro(e instanceof Error ? e.message : 'Erro ao salvar feriado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-lg">

      {/* Modal de aviso */}
      {mostrarAviso && (
        <div
          className="fixed inset-0 bg-overlay flex items-center justify-center z-50"
          data-testid="modal-aviso-feriado"
        >
          <div className="bg-surface rounded-modal p-huge w-[90%] max-w-sm flex flex-col items-center gap-md">
            <IconAlertTriangle size={24} className="text-warning-text" />
            <h2 className="text-title font-medium text-warning-text text-center">
              Feriado próximo
            </h2>
            <div className="w-full flex flex-col gap-sm">
              {avisos.map(f => (
                <div
                  key={f.id}
                  className="bg-warning-bg border-thin border-warning-border rounded-input p-md"
                >
                  <p className="text-base font-medium text-warning-text">{f.nome}</p>
                  <p className="text-sm text-warning-text">{formatarData(f.data)}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setAvisoFechado(true)}
              className="w-full bg-primary text-white rounded-button py-xl text-sub font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center gap-md">
        <IconCalendar size={18} className="text-primary" />
        <h1 className="text-title-lg font-medium text-text-primary">Feriados</h1>
      </div>

      {/* Erro global */}
      {erro && (
        <div className="bg-warning-bg border-thin border-warning-border rounded-input p-md flex items-center gap-md">
          <IconAlertTriangle size={14} className="text-warning-text flex-shrink-0" />
          <p className="text-sm text-warning-text">{erro}</p>
        </div>
      )}

      {/* Spinner */}
      {carregando && (
        <div className="flex flex-col items-center justify-center gap-lg flex-1" role="status">
          <div className="w-spinner h-spinner rounded-full border-[3px] border-spinner-track border-t-primary spinner-animation" />
          <p className="text-base text-text-secondary">Carregando...</p>
        </div>
      )}

      {!carregando && (
        <>
          {/* Calendário */}
          <div
            className="bg-surface border-thin border-border rounded-card p-xl"
            data-testid="calendario"
          >
            <div className="flex items-center justify-between mb-md">
              <button
                data-testid="btn-mes-anterior"
                onClick={irMesAnterior}
                className="text-text-secondary hover:text-primary transition-colors p-xs rounded-button"
              >
                <IconChevronLeft size={16} />
              </button>
              <span
                className="text-base font-medium text-text-primary"
                data-testid="calendario-mes-header"
              >
                {NOMES_MESES[mesCalendario.getMonth()]} {mesCalendario.getFullYear()}
              </span>
              <button
                data-testid="btn-proximo-mes"
                onClick={irProximoMes}
                className="text-text-secondary hover:text-primary transition-colors p-xs rounded-button"
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-[2px]">
              {DIAS_SEMANA.map(d => (
                <div
                  key={d}
                  className="text-center text-xs text-text-disabled font-medium py-xs"
                >
                  {d}
                </div>
              ))}
              {dias.map(({ data, diaNumero, foraDoMes }) => {
                const ehFeriado = feriadosDatasNoMes.has(data)
                return (
                  <div
                    key={data}
                    data-testid={ehFeriado ? `dia-feriado-${data}` : undefined}
                    className={[
                      'text-center text-sm py-xs rounded-sm leading-none',
                      foraDoMes ? 'text-text-disabled' : 'text-text-primary',
                      ehFeriado
                        ? 'bg-primary text-white rounded-full font-medium'
                        : '',
                    ].join(' ')}
                  >
                    {diaNumero}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chips de filtro */}
          <div className="flex flex-wrap gap-sm" data-testid="filtros">
            <button
              onClick={() => setFiltro('todos')}
              className={filtro === 'todos' ? CHIP_ATIVO : CHIP_INATIVO}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltro(TipoFeriado.Nacional)}
              className={filtro === TipoFeriado.Nacional ? CHIP_ATIVO : CHIP_INATIVO}
            >
              Nacional
            </button>
            <button
              onClick={() => setFiltro(TipoFeriado.Regional)}
              className={filtro === TipoFeriado.Regional ? CHIP_ATIVO : CHIP_INATIVO}
            >
              Regional
            </button>
            <button
              onClick={() => setFiltro(TipoFeriado.Avulso)}
              className={filtro === TipoFeriado.Avulso ? CHIP_ATIVO : CHIP_INATIVO}
            >
              Avulso
            </button>
          </div>

          {/* Formulário de adição */}
          <div className="bg-surface border-thin border-border rounded-card overflow-hidden">
            <div className="flex items-center gap-sm px-xl pt-lg pb-md border-b border-thin border-border-subtle">
              <IconPlus size={15} className="text-primary flex-shrink-0" />
              <h3 className="text-body font-medium text-text-primary">Adicionar feriado</h3>
            </div>
            <div className="p-xl flex flex-col gap-lg">

              {/* Data */}
              <div className="flex flex-col gap-xs">
                <label
                  htmlFor="form-data-feriado"
                  className="flex items-center gap-xs text-md font-medium text-text-secondary"
                >
                  <IconCalendar size={10} />
                  Data
                  <span className="text-required">*</span>
                </label>
                <input
                  id="form-data-feriado"
                  type="date"
                  aria-label="Data"
                  value={formData}
                  onChange={e => setFormData(e.target.value)}
                  className={formErro && !formData ? INPUT_ERRO : formData ? INPUT_PREENCHIDO : INPUT_VAZIO}
                />
              </div>

              {/* Nome */}
              <div className="flex flex-col gap-xs">
                <label
                  htmlFor="form-nome-feriado"
                  className="flex items-center gap-xs text-md font-medium text-text-secondary"
                >
                  <IconCalendar size={10} />
                  Nome do feriado
                  <span className="text-required">*</span>
                </label>
                <input
                  id="form-nome-feriado"
                  type="text"
                  aria-label="Nome do feriado"
                  value={formNome}
                  onChange={e => setFormNome(e.target.value)}
                  placeholder="Ex: São João"
                  className={formErro && !formNome.trim() ? INPUT_ERRO : formNome ? INPUT_PREENCHIDO : INPUT_VAZIO}
                />
              </div>

              {/* Tipo */}
              <div className="flex flex-col gap-xs">
                <span className="text-md font-medium text-text-secondary">Tipo</span>
                <div className="flex gap-sm" data-testid="form-tipo">
                  <button
                    type="button"
                    onClick={() => setFormTipo(TipoFeriado.Regional)}
                    className={formTipo === TipoFeriado.Regional ? CHIP_ATIVO : CHIP_INATIVO}
                  >
                    Regional
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipo(TipoFeriado.Avulso)}
                    className={formTipo === TipoFeriado.Avulso ? CHIP_ATIVO : CHIP_INATIVO}
                  >
                    Avulso
                  </button>
                </div>
              </div>

              {/* Erro de formulário */}
              {formErro && (
                <p className="flex items-center gap-xs text-md text-danger-text">
                  <IconAlertCircle size={12} />
                  {formErro}
                </p>
              )}

              {/* Botão Adicionar */}
              <button
                type="button"
                onClick={handleAdicionar}
                disabled={enviando}
                className="w-full bg-primary text-white rounded-button py-xl flex items-center justify-center gap-sm text-sub font-medium disabled:opacity-50"
              >
                <IconPlus size={15} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de feriados */}
          {feriadosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-md py-huge">
              <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle flex items-center justify-center">
                <IconCalendarOff size={24} className="text-primary" />
              </div>
              <p className="text-body font-medium text-text-primary">Nenhum feriado cadastrado</p>
              <p className="text-md text-text-secondary text-center">
                Ainda não há feriados para exibir
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {feriadosFiltrados.map(f => (
                <div
                  key={f.id}
                  className="bg-surface border-thin border-border rounded-card p-xl flex items-center gap-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-text-primary truncate">{f.nome}</p>
                    <p className="text-sm text-text-secondary">{formatarData(f.data)}</p>
                  </div>
                  <TipoBadge tipo={f.tipo} />
                  <button
                    type="button"
                    onClick={() => remover(f.id)}
                    aria-label={`Remover ${f.nome}`}
                    className="flex items-center gap-xs border-thick border-danger-text text-danger-text rounded-button py-xs px-md text-sm font-medium flex-shrink-0"
                  >
                    <IconTrash size={12} />
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
