import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type Icon as TablerIcon,
  IconUser,
  IconSteeringWheel,
  IconShieldCheck,
  IconId,
  IconLock,
  IconAlertCircle,
} from '@tabler/icons-react'
import { authService, type Perfil } from '@/services/authService'
import { BUSINESS } from '@/constants/business'

type PerfilLogin = 'aluno' | 'motorista' | 'admin'

const PERFIS_LOGIN: { id: PerfilLogin; label: string; Icon: TablerIcon }[] = [
  { id: 'aluno', label: 'Aluno', Icon: IconUser },
  { id: 'motorista', label: 'Motorista', Icon: IconSteeringWheel },
  { id: 'admin', label: 'Admin', Icon: IconShieldCheck },
]

const ROTAS: Record<Perfil, string> = {
  aluno: '/aluno',
  motorista: '/motorista',
  admin: '/admin',
}

export function LoginPage() {
  const navigate = useNavigate()

  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilLogin>('aluno')
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erroCpf, setErroCpf] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [erroGeral, setErroGeral] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErroCpf('')
    setErroSenha('')
    setErroGeral('')

    const digitos = cpf.replace(/\D/g, '')
    let valido = true

    if (!digitos) {
      setErroCpf('Campo obrigatório')
      valido = false
    } else if (digitos.length !== 11) {
      setErroCpf('CPF inválido. Verifique e tente novamente')
      valido = false
    }

    if (!senha) {
      setErroSenha('Campo obrigatório')
      valido = false
    }

    if (!valido) return

    setLoading(true)
    try {
      const result = await authService.login(digitos, senha)
      if (result.primeiroAcesso) {
        navigate('/primeiro-acesso')
        return
      }
      navigate(ROTAS[result.perfil])
    } catch (err) {
      setErroGeral((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <header className="bg-surface border-b border-thin border-border flex items-center justify-center px-xxxl py-lg">
        <div className="flex flex-col items-center gap-md">
          <img
            src="/logo-maragogi.png"
            alt="Prefeitura de Maragogi"
            className="w-logo-lg h-logo-lg object-contain"
          />
          <div className="text-center">
            <p className="text-display font-medium text-primary">MaragoBus</p>
            <p className="text-sm text-text-secondary">Transporte Universitário</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-xxxl">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[360px] flex flex-col gap-xl"
        >
          <div className="flex gap-sm justify-center">
            {PERFIS_LOGIN.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPerfilSelecionado(id)}
                className={
                  perfilSelecionado === id
                    ? 'bg-primary border-none rounded-pill px-lg py-xs text-sm font-medium text-white flex items-center gap-xs'
                    : 'bg-primary-light border-thin border-border rounded-pill px-lg py-xs text-sm font-medium text-text-secondary flex items-center gap-xs'
                }
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-xs">
            <label
              htmlFor="cpf"
              className="flex items-center gap-xs text-md font-medium text-text-secondary"
            >
              <IconId size={10} />
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              value={cpf}
              onChange={(e) => {
                setCpf(e.target.value)
                if (erroCpf) setErroCpf('')
              }}
              placeholder="000.000.000-00"
              className={
                erroCpf
                  ? 'w-full bg-input-error border-thick border-danger-strong rounded-input px-xl py-lg text-base text-text-primary outline-none'
                  : 'w-full bg-primary-light border-thin border-border rounded-input px-xl py-lg text-base text-text-disabled placeholder:text-text-disabled focus:border-medium focus:border-primary focus:bg-surface outline-none'
              }
            />
            {erroCpf && (
              <p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
                <IconAlertCircle size={12} />
                {erroCpf}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-xs">
            <label
              htmlFor="senha"
              className="flex items-center gap-xs text-md font-medium text-text-secondary"
            >
              <IconLock size={10} />
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value)
                if (erroSenha) setErroSenha('')
              }}
              placeholder="••••••"
              className={
                erroSenha
                  ? 'w-full bg-input-error border-thick border-danger-strong rounded-input px-xl py-lg text-base text-text-primary outline-none'
                  : 'w-full bg-primary-light border-thin border-border rounded-input px-xl py-lg text-base text-text-disabled placeholder:text-text-disabled focus:border-medium focus:border-primary focus:bg-surface outline-none'
              }
            />
            {erroSenha && (
              <p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
                <IconAlertCircle size={12} />
                {erroSenha}
              </p>
            )}
          </div>

          {erroGeral && (
            <p className="flex items-center gap-xs text-md text-danger-text">
              <IconAlertCircle size={12} />
              {erroGeral}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-label="Entrar"
            className="w-full bg-primary text-white rounded-button py-xl flex items-center justify-center gap-sm text-sub font-medium disabled:opacity-60"
          >
            {loading ? (
              <div className="w-spinner h-spinner rounded-full border-[3px] border-white/30 border-t-white spinner-animation" />
            ) : (
              'Entrar'
            )}
          </button>

          <a
            href={BUSINESS.whatsapp.secretaria}
            target="_blank"
            rel="noreferrer"
            className="text-center text-md text-text-secondary underline"
          >
            Esqueceu a senha?
          </a>
        </form>
      </main>
    </div>
  )
}
