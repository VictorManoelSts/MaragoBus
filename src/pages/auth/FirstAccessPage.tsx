import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconLock, IconAlertCircle, IconKey } from '@tabler/icons-react'
import { authService, type Perfil } from '@/services/authService'
import { BUSINESS } from '@/constants/business'

const ROTAS: Record<Perfil, string> = {
  aluno: '/aluno',
  motorista: '/motorista',
  admin: '/admin',
}

export function FirstAccessPage() {
  const navigate = useNavigate()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroNovaSenha, setErroNovaSenha] = useState('')
  const [erroConfirmarSenha, setErroConfirmarSenha] = useState('')
  const [erroGeral, setErroGeral] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErroNovaSenha('')
    setErroConfirmarSenha('')
    setErroGeral('')

    let valido = true

    if (!novaSenha) {
      setErroNovaSenha('Campo obrigatório')
      valido = false
    } else if (novaSenha.length < BUSINESS.senha.minCaracteres) {
      setErroNovaSenha('Mínimo de 6 caracteres')
      valido = false
    }

    if (!confirmarSenha) {
      setErroConfirmarSenha('Campo obrigatório')
      valido = false
    } else if (valido && novaSenha !== confirmarSenha) {
      setErroConfirmarSenha('As senhas não coincidem')
      valido = false
    }

    if (!valido) return

    setLoading(true)
    try {
      const perfil = await authService.trocarSenhaInicial(novaSenha)
      navigate(ROTAS[perfil])
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
        <div className="w-full max-w-[360px] flex flex-col gap-xl">
          <div className="text-center flex flex-col items-center gap-sm">
            <div className="w-avatar-lg h-avatar-lg rounded-full bg-primary-light flex items-center justify-center">
              <IconKey size={22} className="text-primary" />
            </div>
            <p className="text-title font-medium text-text-primary">Primeiro acesso</p>
            <p className="text-md text-text-secondary">
              Crie uma senha pessoal para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-xl">
            <div className="flex flex-col gap-xs">
              <label
                htmlFor="nova-senha"
                className="flex items-center gap-xs text-md font-medium text-text-secondary"
              >
                <IconLock size={10} />
                Nova senha
              </label>
              <input
                id="nova-senha"
                type="password"
                value={novaSenha}
                onChange={(e) => {
                  setNovaSenha(e.target.value)
                  if (erroNovaSenha) setErroNovaSenha('')
                }}
                placeholder="Mínimo 6 caracteres"
                className={
                  erroNovaSenha
                    ? 'w-full bg-input-error border-thick border-danger-strong rounded-input px-xl py-lg text-base text-text-primary outline-none'
                    : 'w-full bg-primary-light border-thin border-border rounded-input px-xl py-lg text-base text-text-disabled placeholder:text-text-disabled focus:border-medium focus:border-primary focus:bg-surface outline-none'
                }
              />
              {erroNovaSenha && (
                <p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
                  <IconAlertCircle size={12} />
                  {erroNovaSenha}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-xs">
              <label
                htmlFor="confirmar-senha"
                className="flex items-center gap-xs text-md font-medium text-text-secondary"
              >
                <IconLock size={10} />
                Confirmar senha
              </label>
              <input
                id="confirmar-senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => {
                  setConfirmarSenha(e.target.value)
                  if (erroConfirmarSenha) setErroConfirmarSenha('')
                }}
                placeholder="Repita a nova senha"
                className={
                  erroConfirmarSenha
                    ? 'w-full bg-input-error border-thick border-danger-strong rounded-input px-xl py-lg text-base text-text-primary outline-none'
                    : 'w-full bg-primary-light border-thin border-border rounded-input px-xl py-lg text-base text-text-disabled placeholder:text-text-disabled focus:border-medium focus:border-primary focus:bg-surface outline-none'
                }
              />
              {erroConfirmarSenha && (
                <p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
                  <IconAlertCircle size={12} />
                  {erroConfirmarSenha}
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
              aria-label="Confirmar"
              className="w-full bg-primary text-white rounded-button py-xl flex items-center justify-center gap-sm text-sub font-medium disabled:opacity-60"
            >
              {loading ? (
                <div className="w-spinner h-spinner rounded-full border-[3px] border-white/30 border-t-white spinner-animation" />
              ) : (
                'Confirmar'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
