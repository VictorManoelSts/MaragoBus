import { signInWithEmailAndPassword, signOut, getIdTokenResult, updatePassword } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export type Perfil = 'aluno' | 'motorista' | 'admin'

export interface LoginResult {
  uid: string
  perfil: Perfil
  primeiroAcesso: boolean
}

const PERFIS_VALIDOS: Perfil[] = ['aluno', 'motorista', 'admin']
const EMAIL_DOMAIN = '@maragobus.app'

const ERROS: Record<string, string> = {
  'auth/user-not-found': 'CPF não cadastrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'Senha incorreta.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
}

const ERROS_TROCA_SENHA: Record<string, string> = {
  'auth/requires-recent-login': 'Sessão expirada. Faça login novamente.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
}

export function formatarEmail(cpf: string): string {
  return `${cpf.replace(/\D/g, '')}${EMAIL_DOMAIN}`
}

async function obterPerfil(uid: string): Promise<Perfil> {
  const user = auth.currentUser
  if (!user || user.uid !== uid) throw new Error('Usuário não autenticado')
  const token = await getIdTokenResult(user)
  const perfil = token.claims['perfil'] as Perfil | undefined
  if (!perfil || !PERFIS_VALIDOS.includes(perfil)) {
    throw Object.assign(new Error('Perfil não autorizado.'), { code: 'auth/perfil-invalido' })
  }
  return perfil
}

async function verificarPrimeiroAcesso(uid: string, perfil: Perfil): Promise<boolean> {
  if (perfil === 'admin') return false
  const colecao = perfil === 'motorista' ? 'motoristas' : 'alunos'
  const snap = await getDoc(doc(db, colecao, uid))
  if (!snap.exists()) return false
  return snap.data()['primeiroAcesso'] === true
}

async function login(cpf: string, senha: string): Promise<LoginResult> {
  try {
    const email = formatarEmail(cpf)
    const { user } = await signInWithEmailAndPassword(auth, email, senha)
    const perfil = await obterPerfil(user.uid)
    const primeiroAcesso = await verificarPrimeiroAcesso(user.uid, perfil)
    return { uid: user.uid, perfil, primeiroAcesso }
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? ''
    const message = ERROS[code] ?? (err as Error).message ?? 'Erro ao autenticar. Tente novamente.'
    throw Object.assign(new Error(message), { code })
  }
}

async function logout(): Promise<void> {
  await signOut(auth)
}

async function getPerfil(): Promise<Perfil | null> {
  const user = auth.currentUser
  if (!user) return null
  const token = await getIdTokenResult(user)
  const perfil = token.claims['perfil'] as Perfil | undefined
  return PERFIS_VALIDOS.includes(perfil!) ? perfil! : null
}

async function trocarSenhaInicial(novaSenha: string): Promise<Perfil> {
  const user = auth.currentUser
  if (!user) throw new Error('Usuário não autenticado.')

  try {
    await updatePassword(user, novaSenha)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? ''
    const message =
      ERROS_TROCA_SENHA[code] ??
      (err as Error).message ??
      'Erro ao trocar senha. Tente novamente.'
    throw Object.assign(new Error(message), { code })
  }

  const perfil = await obterPerfil(user.uid)

  if (perfil !== 'admin') {
    const colecao = perfil === 'motorista' ? 'motoristas' : 'alunos'
    await updateDoc(doc(db, colecao, user.uid), { primeiroAcesso: false })
  }

  return perfil
}

export const authService = { login, logout, getPerfil, formatarEmail, trocarSenhaInicial }
