import { IconBan } from '@tabler/icons-react'
import type { Advertencia } from '@/types/advertencia'

interface Props {
  advertencias: Advertencia[]
  dataReativacao: string | null
  onFechar: () => void
}

function formatarDataISO(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function SuspensaoModal({ advertencias, dataReativacao, onFechar }: Props) {
  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suspensao-titulo"
        className="bg-surface rounded-modal p-huge w-[90%] max-w-sm flex flex-col items-center gap-md"
      >
        <IconBan size={28} className="text-danger-text" />

        <h2
          id="suspensao-titulo"
          className="text-title font-medium text-danger-text"
        >
          Acesso suspenso
        </h2>

        {dataReativacao && (
          <p className="text-base text-text-secondary">
            Reativação em: {formatarDataISO(dataReativacao)}
          </p>
        )}

        <div className="w-full flex flex-col gap-sm">
          {advertencias.map((adv) => (
            <div key={adv.id} className="flex flex-col gap-xs border-thin border-border rounded-input p-md">
              <p className="text-sm text-text-secondary">
                {adv.data.toDate().toLocaleDateString('pt-BR')}
              </p>
              <p className="text-body text-text-primary">{adv.motivo}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onFechar}
          className="w-full bg-primary text-white rounded-button py-xl text-sub font-medium"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
