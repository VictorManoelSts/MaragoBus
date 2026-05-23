import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TipoAdvertencia } from '@/types/advertencia'
import type { Advertencia } from '@/types/advertencia'

export const advertenciaService = {
  async buscarAdvertencias(alunoId: string): Promise<Advertencia[]> {
    const q = query(
      collection(db, 'advertencias'),
      where('alunoId', '==', alunoId),
      orderBy('data', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Advertencia))
  },

  async aplicarAdvertencia(alunoId: string, motivo: string, adminId: string): Promise<void> {
    await addDoc(collection(db, 'advertencias'), {
      alunoId,
      motivo,
      aplicadaPor: adminId,
      tipo: TipoAdvertencia.Direta,
      data: serverTimestamp(),
    })
  },
}
