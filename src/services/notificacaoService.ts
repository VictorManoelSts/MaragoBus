import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Notificacao } from '@/types/notificacao'

export const notificacaoService = {
  async buscarNotificacoes(alunoId: string): Promise<Notificacao[]> {
    const q = query(
      collection(db, 'notificacoes'),
      where('alunoId', '==', alunoId),
      orderBy('criadaEm', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notificacao))
  },

  async marcarComoLida(notificacaoId: string): Promise<void> {
    await updateDoc(doc(db, 'notificacoes', notificacaoId), { lida: true })
  },
}
