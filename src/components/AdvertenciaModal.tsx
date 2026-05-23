import { useState } from 'react'
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'

interface AdvertenciaModalProps {
  nomeAluno: string
  onEnviar: (motivo: string) => Promise<void>
  onFechar: () => void
}

export function AdvertenciaModal({ nomeAluno, onEnviar, onFechar }: AdvertenciaModalProps) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function handleEnviar() {
    if (!motivo.trim() || enviando) return
    setEnviando(true)
    try {
      await onEnviar(motivo.trim())
      setSucesso(true)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-overlay flex items-center justify-center z-50"
    >
      <div className="bg-surface rounded-modal p-huge w-[90%] max-w-sm flex flex-col items-center gap-md">

        {sucesso ? (
          <>
            <IconCircleCheck size={24} className="text-success-strong" />
            <h2 className="text-title font-medium text-success-strong">Solicitação enviada!</h2>
            <p className="text-body text-text-secondary text-center">
              O admin receberá a solicitação de advertência para {nomeAluno}.
            </p>
            <button
              onClick={onFechar}
              className="w-full bg-primary text-white rounded-button py-xl
                         text-sub font-medium"
            >
              Fechar
            </button>
          </>
        ) : (
          <>
            <IconAlertTriangle size={24} className="text-warning-text" />
            <h2 className="text-title font-medium text-warning-text">Solicitar advertência?</h2>
            <p className="text-body text-text-secondary text-center">{nomeAluno}</p>

            <textarea
              className="w-full bg-primary-light border-thin border-border rounded-input
                         px-xl py-lg text-base text-text-primary placeholder:text-text-disabled
                         outline-none resize-none"
              rows={3}
              placeholder="Justificativa obrigatória"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />

            <div className="flex gap-md w-full">
              <button
                onClick={handleEnviar}
                disabled={!motivo.trim() || enviando}
                className="flex-1 bg-warning-text text-white rounded-button py-lg
                           text-body font-medium disabled:opacity-50"
              >
                Enviar
              </button>
              <button
                onClick={onFechar}
                className="flex-1 border-thick border-border text-text-secondary
                           rounded-button py-lg text-body font-medium"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
