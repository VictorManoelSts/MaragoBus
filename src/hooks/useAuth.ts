import { useState, useEffect } from 'react'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { Perfil } from '@/services/authService'

export interface AuthState {
  loading: boolean
  uid: string | null
  perfil: Perfil | null
  primeiroAcesso: boolean
}

const PERFIS_VALIDOS: Perfil[] = ['aluno', 'motorista', 'admin']

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    uid: null,
    perfil: null,
    primeiroAcesso: false,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, uid: null, perfil: null, primeiroAcesso: false })
        return
      }

      try {
        const token = await getIdTokenResult(user)
        const perfil = token.claims['perfil'] as Perfil | undefined

        if (!perfil || !PERFIS_VALIDOS.includes(perfil)) {
          setState({ loading: false, uid: user.uid, perfil: null, primeiroAcesso: false })
          return
        }

        let primeiroAcesso = false
        if (perfil !== 'admin') {
          const colecao = perfil === 'motorista' ? 'motoristas' : 'alunos'
          const snap = await getDoc(doc(db, colecao, user.uid))
          if (snap.exists()) {
            primeiroAcesso = snap.data()['primeiroAcesso'] === true
          }
        }

        setState({ loading: false, uid: user.uid, perfil, primeiroAcesso })
      } catch {
        setState({ loading: false, uid: user.uid, perfil: null, primeiroAcesso: false })
      }
    })

    return unsubscribe
  }, [])

  return state
}
