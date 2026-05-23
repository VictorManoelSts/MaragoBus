import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  IconUserPlus,
  IconUserCircle,
  IconSchool,
  IconUpload,
  IconUser,
  IconLock,
  IconAlertCircle,
} from '@tabler/icons-react'
import { useCadastroAluno } from '@/hooks/useCadastroAluno'
import { ModalidadeAluno } from '@/types/aluno'
import { FACULDADES, CURSOS } from '@/constants/options'
import type { DadosCadastro } from '@/services/adminService'

// ── Tipos internos ────────────────────────────────────────────────────────────

interface FormCadastro {
  nome: string
  cpf: string
  senha: string
  telefone: string
  endereco: string
  foto: File | null
  faculdade: string
  curso: string
  modalidade: ModalidadeAluno
  semestre: string
  anoConclusao: string
  pontoEmbarquePadrao: string
}

interface ErrosCadastro {
  nome?: string
  cpf?: string
  senha?: string
  telefone?: string
  endereco?: string
  faculdade?: string
  curso?: string
  semestre?: string
  anoConclusao?: string
  pontoEmbarquePadrao?: string
  geral?: string
}

const FORM_INICIAL: FormCadastro = {
  nome: '',
  cpf: '',
  senha: '',
  telefone: '',
  endereco: '',
  foto: null,
  faculdade: '',
  curso: '',
  modalidade: ModalidadeAluno.Presencial,
  semestre: '',
  anoConclusao: '',
  pontoEmbarquePadrao: '',
}

const MODALIDADES: { valor: ModalidadeAluno; label: string }[] = [
  { valor: ModalidadeAluno.Presencial,     label: 'Presencial' },
  { valor: ModalidadeAluno.Semipresencial, label: 'Semipresencial' },
  { valor: ModalidadeAluno.Online,         label: 'Online' },
]

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
  id: string
  icone: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  erro?: string
  hint?: string
}

function CampoTexto({ id, icone, label, value, onChange, type = 'text', erro, hint }: CampoTextoProps) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="flex items-center gap-xs text-md font-medium text-text-secondary">
        {icone}
        {label}
        <span className="text-required">*</span>
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          erro
            ? 'w-full bg-input-error border-thick border-danger-strong rounded-input px-xl py-lg text-base text-text-primary outline-none'
            : 'w-full bg-surface border-thin border-border rounded-input px-xl py-lg text-base text-text-primary outline-none focus:border-medium focus:border-primary'
        }
      />
      {erro && (
        <p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
          <IconAlertCircle size={12} />
          {erro}
        </p>
      )}
      {hint && !erro && (
        <p className="flex items-center gap-xs mt-[2px] text-sm text-text-disabled">
          {hint}
        </p>
      )}
    </div>
  )
}

// ── ChipsSelecao ──────────────────────────────────────────────────────────────

interface ChipsSelecaoProps {
  label: string
  icone: React.ReactNode
  opcoes: readonly string[]
  selecionado: string
  onSelecionar: (v: string) => void
  erro?: string
}

function ChipsSelecao({ label, icone, opcoes, selecionado, onSelecionar, erro }: ChipsSelecaoProps) {
  return (
    <div className="flex flex-col gap-xs">
      <label className="flex items-center gap-xs text-md font-medium text-text-secondary">
        {icone}
        {label}
        <span className="text-required">*</span>
      </label>
      <div className="flex gap-sm flex-wrap">
        {opcoes.map((op) => {
          const ativo = selecionado === op
          return (
            <button
              key={op}
              type="button"
              aria-pressed={ativo}
              onClick={() => onSelecionar(op)}
              className={
                ativo
                  ? 'bg-primary border-none rounded-pill px-lg py-xs text-sm font-medium text-white'
                  : 'bg-primary-light border-thin border-border rounded-pill px-lg py-xs text-sm font-medium text-text-secondary'
              }
            >
              {op}
            </button>
          )
        })}
      </div>
      {erro && (
        <p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
          <IconAlertCircle size={12} />
          {erro}
        </p>
      )}
    </div>
  )
}

// ── ChipsModalidade ───────────────────────────────────────────────────────────

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
        <span className="text-required">*</span>
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

// ── UploadFoto ────────────────────────────────────────────────────────────────

interface UploadFotoProps {
  foto: File | null
  onChange: (file: File | null) => void
}

function UploadFoto({ foto, onChange }: UploadFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onChange(file)
  }

  return (
    <div className="flex flex-col gap-xs">
      <label className="flex items-center gap-xs text-md font-medium text-text-secondary">
        <IconUser size={10} />
        Foto
      </label>
      <button
        type="button"
        onClick={handleClick}
        className="bg-primary-light border-thin border-dashed border-border
                   rounded-input p-lg flex items-center gap-lg w-full text-left"
      >
        <div className="w-[36px] h-[36px] rounded-full bg-primary-medium
                        border-thick border-border
                        flex items-center justify-center flex-shrink-0">
          <IconUser size={18} className="text-border" />
        </div>
        <div className="flex-1">
          <p className="text-md font-medium text-text-primary">
            {foto ? foto.name : 'Adicionar foto'}
          </p>
          <p className="text-sm text-text-disabled mt-[1px]">JPG ou PNG · máx. 5MB</p>
        </div>
        <IconUpload size={14} className="text-primary ml-auto" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}

// ── validar ───────────────────────────────────────────────────────────────────

function validar(form: FormCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {}

  if (!form.nome.trim()) erros.nome = 'Nome é obrigatório'

  const cpfDigitos = form.cpf.replace(/\D/g, '')
  if (!cpfDigitos) erros.cpf = 'CPF é obrigatório'
  else if (cpfDigitos.length !== 11) erros.cpf = 'CPF inválido. Verifique e tente novamente'

  if (!form.senha) erros.senha = 'Senha inicial é obrigatória'
  else if (form.senha.length < 6) erros.senha = 'Mínimo 6 caracteres'

  if (!form.telefone.trim()) erros.telefone = 'Telefone é obrigatório'
  if (!form.endereco.trim()) erros.endereco = 'Endereço é obrigatório'

  if (!form.faculdade) erros.faculdade = 'Selecione uma faculdade'
  if (!form.curso) erros.curso = 'Selecione um curso'

  const semestre = Number(form.semestre)
  if (!form.semestre || semestre < 1 || semestre > 12) erros.semestre = 'Semestre inválido (1–12)'

  const ano = Number(form.anoConclusao)
  if (!form.anoConclusao || ano < 2000 || ano > 2050) erros.anoConclusao = 'Ano de conclusão inválido'

  if (!form.pontoEmbarquePadrao) erros.pontoEmbarquePadrao = 'Selecione um ponto de embarque'

  return erros
}

// ── CadastroAlunoPage ─────────────────────────────────────────────────────────

export function CadastroAlunoPage() {
  const navigate = useNavigate()
  const { pontos, carregandoPontos, salvando, salvar } = useCadastroAluno()

  const [form, setForm] = useState<FormCadastro>(FORM_INICIAL)
  const [erros, setErros] = useState<ErrosCadastro>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  function update<K extends keyof FormCadastro>(campo: K, valor: FormCadastro[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function handleCpfChange(v: string) {
    update('cpf', v)
    if (!form.senha || form.senha === form.cpf.replace(/\D/g, '').slice(-6)) {
      const digitos = v.replace(/\D/g, '')
      if (digitos.length >= 6) update('senha', digitos.slice(-6))
    }
  }

  async function handleSalvar() {
    const novosErros = validar(form)
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros)
      return
    }
    setErros({})
    setErroGeral(null)

    const dados: DadosCadastro = {
      nome: form.nome.trim(),
      cpf: form.cpf.replace(/\D/g, ''),
      senha: form.senha,
      telefone: form.telefone.trim(),
      endereco: form.endereco.trim(),
      foto: form.foto,
      faculdade: form.faculdade,
      curso: form.curso,
      modalidade: form.modalidade,
      semestre: Number(form.semestre),
      anoConclusao: Number(form.anoConclusao),
      pontoEmbarquePadrao: form.pontoEmbarquePadrao,
    }

    try {
      await salvar(dados)
      navigate('/admin/alunos')
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : 'Erro ao cadastrar aluno.')
    }
  }

  return (
    <div className="flex flex-col gap-lg">

      {/* Botão voltar */}
      <button
        type="button"
        onClick={() => navigate('/admin/alunos')}
        className="flex items-center gap-xs text-primary text-sm font-medium self-start"
      >
        <IconChevronLeft size={14} />
        Voltar
      </button>

      {/* Upload de foto */}
      <SecaoCard icone={<IconUser size={15} />} titulo="Foto">
        <UploadFoto foto={form.foto} onChange={(f) => update('foto', f)} />
      </SecaoCard>

      {/* Dados pessoais */}
      <SecaoCard icone={<IconUserCircle size={15} />} titulo="Dados pessoais">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <CampoTexto
            id="campo-nome"
            icone={<IconId size={10} />}
            label="Nome completo"
            value={form.nome}
            onChange={(v) => update('nome', v)}
            erro={erros.nome}
          />
          <CampoTexto
            id="campo-cpf"
            icone={<IconId size={10} />}
            label="CPF"
            value={form.cpf}
            onChange={handleCpfChange}
            erro={erros.cpf}
          />
          <CampoTexto
            id="campo-senha"
            icone={<IconLock size={10} />}
            label="Senha inicial"
            value={form.senha}
            onChange={(v) => update('senha', v)}
            erro={erros.senha}
            hint="Por padrão: 6 últimos dígitos do CPF"
          />
          <CampoTexto
            id="campo-telefone"
            icone={<IconPhone size={10} />}
            label="Telefone"
            value={form.telefone}
            onChange={(v) => update('telefone', v)}
            erro={erros.telefone}
          />
          <CampoTexto
            id="campo-endereco"
            icone={<IconHome size={10} />}
            label="Endereço"
            value={form.endereco}
            onChange={(v) => update('endereco', v)}
            erro={erros.endereco}
          />
        </div>
      </SecaoCard>

      {/* Dados acadêmicos */}
      <SecaoCard icone={<IconSchool size={15} />} titulo="Dados acadêmicos">
        <ChipsSelecao
          label="Faculdade"
          icone={<IconBook size={10} />}
          opcoes={FACULDADES}
          selecionado={form.faculdade}
          onSelecionar={(v) => update('faculdade', v)}
          erro={erros.faculdade}
        />

        <ChipsSelecao
          label="Curso"
          icone={<IconBook size={10} />}
          opcoes={CURSOS}
          selecionado={form.curso}
          onSelecionar={(v) => update('curso', v)}
          erro={erros.curso}
        />

        <ChipsModalidade
          value={form.modalidade}
          onChange={(v) => update('modalidade', v)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <CampoTexto
            id="campo-semestre"
            icone={<IconNumber size={10} />}
            label="Semestre"
            value={form.semestre}
            onChange={(v) => update('semestre', v)}
            type="number"
            erro={erros.semestre}
          />
          <CampoTexto
            id="campo-ano-conclusao"
            icone={<IconCalendar size={10} />}
            label="Ano de conclusão"
            value={form.anoConclusao}
            onChange={(v) => update('anoConclusao', v)}
            type="number"
            erro={erros.anoConclusao}
          />
        </div>
      </SecaoCard>

      {/* Ponto de embarque */}
      <SecaoCard icone={<IconMapPin size={15} />} titulo="Ponto de embarque">
        {carregandoPontos ? (
          <div
            role="status"
            className="w-spinner h-spinner rounded-full border-[3px]
                       border-spinner-track border-t-primary spinner-animation mx-auto"
          />
        ) : (
          <div className="flex flex-col gap-sm">
            {pontos.map((ponto) => {
              const selecionado = form.pontoEmbarquePadrao === ponto.nome
              return (
                <button
                  key={ponto.id}
                  type="button"
                  onClick={() => update('pontoEmbarquePadrao', ponto.nome)}
                  className={
                    selecionado
                      ? 'w-full flex items-center gap-md p-lg bg-primary-light border-thin border-primary rounded-input'
                      : 'w-full flex items-center gap-md p-lg bg-surface border-thin border-border rounded-input'
                  }
                >
                  <div className={
                    selecionado
                      ? 'w-[14px] h-[14px] rounded-full bg-primary flex-shrink-0 flex items-center justify-center'
                      : 'w-[14px] h-[14px] rounded-full border-thick border-border flex-shrink-0'
                  }>
                    {selecionado && <div className="w-[5px] h-[5px] rounded-full bg-white" />}
                  </div>
                  <IconMapPin size={12} className={selecionado ? 'text-primary' : 'text-text-disabled'} />
                  <span className={selecionado ? 'text-md font-medium text-text-primary' : 'text-md text-text-secondary'}>
                    {ponto.nome}
                  </span>
                </button>
              )
            })}
            {erros.pontoEmbarquePadrao && (
              <p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
                <IconAlertCircle size={12} />
                {erros.pontoEmbarquePadrao}
              </p>
            )}
          </div>
        )}
      </SecaoCard>

      {/* Erro geral */}
      {erroGeral && (
        <p className="text-danger-text text-base">{erroGeral}</p>
      )}

      {/* Botões */}
      <div className="flex gap-md">
        <button
          type="button"
          onClick={() => navigate('/admin/alunos')}
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
          <IconUserPlus size={14} />
          Cadastrar
        </button>
      </div>

    </div>
  )
}
