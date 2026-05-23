import { useReserva } from '@/hooks/useReserva'
import { StatusAluno } from '@/types/aluno'
import { IconCheck, IconMapPin } from '@tabler/icons-react'

export function ReservaPage() {
  const {
    aluno,
    pontos,
    reservaAtiva,
    pontoSelecionado,
    carregando,
    enviando,
    erro,
    janelaEstaAberta,
    cancelamentoEstaPermitido,
    confirmarReserva,
    cancelarReserva,
    selecionarPonto,
  } = useReserva()

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center gap-lg flex-1">
        <div
          data-testid="spinner"
          className="w-spinner h-spinner rounded-full border-[3px] border-spinner-track border-t-primary spinner-animation"
        />
        <p className="text-base text-text-secondary">Carregando...</p>
      </div>
    )
  }

  const suspenso = aluno?.status === StatusAluno.Suspenso
  const confirmarDesabilitado = enviando || !janelaEstaAberta || suspenso

  return (
    <div className="flex flex-col gap-lg">
      {/* Status da janela */}
      <div className="bg-primary-medium border-thin border-border rounded-card p-xl flex items-center gap-lg">
        <div
          data-testid="indicador-janela"
          className={`w-[11px] h-[11px] rounded-full flex-shrink-0 ${
            janelaEstaAberta ? 'bg-success-strong' : 'bg-danger-strong'
          }`}
        />
        <div>
          <p className="text-base font-medium text-text-primary">
            {janelaEstaAberta ? 'Inscrições abertas' : 'Inscrições encerradas'}
          </p>
          <p className="text-sm text-text-secondary">
            Disponíveis das 17h até 11h do dia seguinte
          </p>
        </div>
      </div>

      {/* Badge de suspensão */}
      {suspenso && (
        <div className="flex items-center gap-xs bg-danger-bg border-thin border-danger-strong rounded-pill px-xl py-sm">
          <span className="text-sm text-danger-text">
            Seu acesso está suspenso. Você não pode realizar reservas.
          </span>
        </div>
      )}

      {/* Dados do aluno */}
      {aluno && (
        <div className="bg-surface border-thin border-border rounded-card p-xl">
          <p className="text-base font-medium text-text-primary">{aluno.nome}</p>
          <p className="text-sm text-text-secondary">
            {aluno.faculdade} · {aluno.curso} · {aluno.semestre}º sem.
          </p>
        </div>
      )}

      {/* Seletor de pontos de embarque */}
      {pontos.length > 0 && (
        <div className="flex flex-col gap-sm">
          {pontos.map((ponto) => {
            const selecionado = ponto.nome === pontoSelecionado
            return (
              <button
                key={ponto.id}
                aria-pressed={selecionado}
                onClick={() => selecionarPonto(ponto.nome)}
                className={`w-full flex items-center gap-md p-lg rounded-input border-thin ${
                  selecionado
                    ? 'bg-primary-light border-primary'
                    : 'bg-surface border-border'
                }`}
              >
                <div
                  className={`w-[14px] h-[14px] rounded-full flex-shrink-0 ${
                    selecionado
                      ? 'bg-primary flex items-center justify-center'
                      : 'border-thick border-border'
                  }`}
                >
                  {selecionado && <div className="w-[5px] h-[5px] rounded-full bg-white" />}
                </div>
                <IconMapPin
                  size={12}
                  className={selecionado ? 'text-primary' : 'text-text-disabled'}
                />
                <span
                  className={`text-md ${
                    selecionado ? 'font-medium text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {ponto.nome}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Mensagem de erro */}
      {erro && (
        <div role="alert" className="flex items-center gap-xs bg-danger-bg rounded-input px-xl py-lg">
          <p className="text-sm text-danger-text">{erro}</p>
        </div>
      )}

      {/* Botão confirmar — visível apenas sem reserva ativa */}
      {!reservaAtiva && (
        <button
          onClick={confirmarReserva}
          disabled={confirmarDesabilitado}
          className="w-full bg-primary text-white rounded-button py-xl flex items-center justify-center gap-sm text-sub font-medium disabled:opacity-50"
        >
          <IconCheck size={15} />
          Confirmar reserva
        </button>
      )}

      {/* Botão cancelar — visível apenas com reserva ativa e dentro do prazo */}
      {reservaAtiva && cancelamentoEstaPermitido && (
        <button
          onClick={cancelarReserva}
          disabled={enviando}
          className="w-full bg-transparent border-thick border-primary text-primary rounded-button py-lg text-body font-medium disabled:opacity-50"
        >
          Cancelar reserva
        </button>
      )}
    </div>
  )
}
