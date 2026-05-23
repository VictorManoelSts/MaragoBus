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
  IconDeviceFloppy,
  IconUserCircle,
  IconSchool,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useEdicaoAluno } from '@/hooks/useEdicaoAluno'
import { ModalidadeAluno } from '@/types/aluno'
import type { Aluno } from '@/types/aluno'
import type { CamposEditaveis } from '@/services/adminService'

// ── helpers ───────────────────────────────────────────────────────────────────

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function computeDiff(original: Aluno, form: CamposEditaveis): Partial<CamposEditaveis> {
  const campos: (keyof CamposEditaveis)[] = [
    'nome', 'telefone', 'endereco', 'faculdade', 'curso',
    'modalidade', 'semestre', 'anoConclusao', 'pontoEmbarquePadrao',
  ]
  const diff: Partial<CamposEditaveis> = {}
  for (const campo of campos) {
    if ((form[campo] as unknown) !== (original[campo] as unknown)) {
      (diff as Record<string, unknown>)[campo] = form[campo]
    }
  }
  return diff
}

// ── SecaoCard ─────────────────────────────────────────────────────────────────

interface SecaoCardProps {
  icone: React.ReactNode
  titulo: string
  children: React.ReactNode
}

function SecaoCard({ icone, titulo, children }: SecaoCardProps) {
  return (
    <div className="bg-surface border-thin border-border rounded-card overflow-hidden">
      <div className="flex items-center gap-sm px-xl pt-lg pb-md
                      border-b border-thin border-border-subtle">
        <span className="text-primary flex-shrink-0">{icone}</span>
        <h3 className="text-body font-medium text-text-primary">{titulo}</h3>
      </div>
      <div className="p-xl flex flex-col gap-lg">
        {children}
      </div>
    </div>
  )
}

// ── CampoTexto ────────────────────────────────────────────────────────────────

interface CampoTextoProps {
  icone: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  type?: string
}

function CampoTexto({ icone, label, value, onChange, disabled = false, type = 'text' }: CampoTextoProps) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="flex items-center gap-xs text-md font-medium text-text-secondary">
        {icone}
        {label}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={
          disabled
            ? 'w-full bg-primary-medium border-thin border-border rounded-input px-xl py-lg text-base text-text-disabled outline-none cursor-not-allowed'
            : 'w-full bg-surface border-thin border-border rounded-input px-xl py-lg text-base text-text-primary outline-none focus:border-medium focus:border-primary'
        }
      />
    </div>
  )
}

// ── ChipsModalidade ───────────────────────────────────────────────────────────

const MODALIDADES: { valor: ModalidadeAluno; label: string }[] = [
  { valor: ModalidadeAluno.Presencial,     label: 'Presencial' },
  { valor: ModalidadeAluno.Semipresencial, label: 'Semipresencial' },
  { valor: ModalidadeAluno.Online,         label: 'Online' },
]

interface ChipsModalidadeProps {
  value: ModalidadeAluno
  onChange: (v: ModalidadeAluno) => void
}

function ChipsModalidade({ value, onChange }: ChipsModalidadeProps) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="flex items-center gap-xs text-md font-medium text-text-secondary">
        <IconBooks size={10} />
        Modalidade
      </label>
      <div className="flex gap-sm flex-wrap">
        {MODALIDADES.map((m) => {
          const ativo = value === m.valor
          return (
            <button
              key={m.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => onChange(m.valor)}
              className={
                ativo
                  ? 'bg-primary border-none rounded-pill px-lg py-xs text-sm font-medium text-white'
                  : 'bg-primary-light border-thin border-border rounded-pill px-lg py-xs text-sm font-medium text-text-secondary'
              }
            >
              {m.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── FormularioEdicao ──────────────────────────────────────────────────────────

interface FormularioEdicaoProps {
  aluno: Aluno
  salvando: boolean
  onSalvar: (dados: Partial<CamposEditaveis>) => Promise<void>
  onCancelar: () => void
}

function FormularioEdicao({ aluno, salvando, onSalvar, onCancelar }: FormularioEdicaoProps) {
  const [formData, setFormData] = useState<CamposEditaveis>({
    nome:                aluno.nome,
    telefone:            aluno.telefone,
    endereco:            aluno.endereco,
    faculdade:           aluno.faculdade,
    curso:               aluno.curso,
    modalidade:          aluno.modalidade,
    semestre:            aluno.semestre,
    anoConclusao:        aluno.anoConclusao,
    pontoEmbarquePadrao: aluno.pontoEmbarquePadrao,
  })
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)

  function update<K extends keyof CamposEditaveis>(campo: K, valor: CamposEditaveis[K]) {
    setFormData((prev) => ({ ...prev, [campo]: valor }))
  }

  const pontoDiferente = formData.pontoEmbarquePadrao !== aluno.pontoEmbarquePadrao

  async function handleSalvar() {
    setErroSalvar(null)
    const diff = computeDiff(aluno, formData)
    try {
      await onSalvar(diff)
    } catch (e) {
      setErroSalvar(e instanceof Error ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <>
      {/* Header azul */}
      <div className="bg-primary px-xl py-[14px] flex items-center gap-lg rounded-card">
        <div className="w-avatar-md h-avatar-md rounded-full bg-header-overlay
                        border-thick border-header-border
                        flex items-center justify-center
                        text-body font-medium text-white flex-shrink-0">
          {iniciais(aluno.nome)}
        </div>
        <div>
          <p className="text-body font-medium text-white">{aluno.nome}</p>
          <p className="text-sm text-white/80">{aluno.faculdade} · {aluno.curso}</p>
        </div>
      </div>

      {/* Dados pessoais */}
      <SecaoCard icone={<IconUserCircle size={15} />} titulo="Dados pessoais">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <CampoTexto
            icone={<IconId size={10} />}
            label="Nome completo"
            value={formData.nome}
            onChange={(v) => update('nome', v)}
          />
          <CampoTexto
            icone={<IconId size={10} />}
            label="CPF"
            value={aluno.cpf}
            onChange={() => {}}
            disabled
          />
          <CampoTexto
            icone={<IconPhone size={10} />}
            label="Telefone"
            value={formData.telefone}
            onChange={(v) => update('telefone', v)}
          />
          <CampoTexto
            icone={<IconHome size={10} />}
            label="Endereço"
            value={formData.endereco}
            onChange={(v) => update('endereco', v)}
          />
        </div>
      </SecaoCard>

      {/* Dados acadêmicos */}
      <SecaoCard icone={<IconSchool size={15} />} titulo="Dados acadêmicos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <CampoTexto
            icone={<IconBook size={10} />}
            label="Faculdade"
            value={formData.faculdade}
            onChange={(v) => update('faculdade', v)}
          />
          <CampoTexto
            icone={<IconBook size={10} />}
            label="Curso"
            value={formData.curso}
            onChange={(v) => update('curso', v)}
          />
          <CampoTexto
            icone={<IconNumber size={10} />}
            label="Semestre"
            value={String(formData.semestre)}
            onChange={(v) => update('semestre', Number(v))}
            type="number"
          />
          <CampoTexto
            icone={<IconCalendar size={10} />}
            label="Ano de conclusão"
            value={String(formData.anoConclusao)}
            onChange={(v) => update('anoConclusao', Number(v))}
            type="number"
          />
        </div>

        <ChipsModalidade
          value={formData.modalidade}
          onChange={(v) => update('modalidade', v)}
        />

        <div className="flex flex-col gap-xs">
          <CampoTexto
            icone={<IconMapPin size={10} />}
            label="Ponto de embarque padrão"
            value={formData.pontoEmbarquePadrao}
            onChange={(v) => update('pontoEmbarquePadrao', v)}
          />
          {pontoDiferente && (
            <div className="bg-warning-bg border-thin border-warning-border
                            rounded-input p-md flex items-center gap-md">
              <IconInfoCircle size={14} className="text-warning-text flex-shrink-0" />
              <p className="text-sm text-warning-text">
                O novo ponto será aplicado apenas nas próximas reservas.
              </p>
            </div>
          )}
        </div>
      </SecaoCard>

      {/* Erro de salvar */}
      {erroSalvar && (
        <p className="text-danger-text text-base">{erroSalvar}</p>
      )}

      {/* Botões */}
      <div className="flex gap-md">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 bg-transparent border-thick border-primary
                     text-primary rounded-button py-lg text-body font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="flex-1 bg-primary text-white rounded-button py-lg
                     flex items-center justify-center gap-sm
                     text-body font-medium disabled:opacity-50"
        >
          <IconDeviceFloppy size={14} />
          Salvar
        </button>
      </div>
    </>
  )
}

// ── EdicaoAlunoPage ───────────────────────────────────────────────────────────

export function EdicaoAlunoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { aluno, carregando, erro, salvando, salvar } = useEdicaoAluno(id ?? '')

  async function handleSalvar(dados: Partial<CamposEditaveis>) {
    await salvar(dados)
    navigate(`/admin/alunos/${id}`)
  }

  return (
    <div className="flex flex-col gap-lg">

      {/* Botão voltar */}
      <button
        onClick={() => navigate(`/admin/alunos/${id}`)}
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

      {/* Formulário */}
      {!carregando && !erro && aluno && (
        <FormularioEdicao
          aluno={aluno}
          salvando={salvando}
          onSalvar={handleSalvar}
          onCancelar={() => navigate(`/admin/alunos/${id}`)}
        />
      )}

    </div>
  )
}
