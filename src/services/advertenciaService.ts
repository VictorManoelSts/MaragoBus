import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
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
}
