import { useEffect } from 'react'
import {
  IconCalendarCheck,
  IconBell,
  IconBan,
  IconCalendarOff,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { TipoNotificacao } from '@/types/notificacao'
import type { Notificacao } from '@/types/notificacao'

const ICONE_POR_TIPO: Record<TipoNotificacao, React.ReactNode> = {
  [TipoNotificacao.AberturaReservas]: (
    <IconCalendarCheck
      size={16}
      className="text-success-text flex-shrink-0"
      data-testid="icone-abertura_reservas"
    />
  ),
  [TipoNotificacao.LembreteEncerramento]: (
    <IconBell
      size={16}
      className="text-warning-text flex-shrink-0"
      data-testid="icone-lembrete_encerramento"
    />
  ),
  [TipoNotificacao.SuspensaoConfirmada]: (
    <IconBan
      size={16}
      className="text-danger-text flex-shrink-0"
      data-testid="icone-suspensao_confirmada"
    />
  ),
  [TipoNotificacao.AvisoFeriado]: (
    <IconCalendarOff
      size={16}
      className="text-warning-text flex-shrink-0"
      data-testid="icone-aviso_feriado"
    />
  ),
  [TipoNotificacao.Advertencia]: (
    <IconAlertTriangle
      size={16}
      className="text-danger-text flex-shrink-0"
      data-testid="icone-advertencia"
    />
  ),
}

function formatarData(ts: Notificacao['criadaEm']): string {
  return ts.toDate().toLocaleDateString('pt-BR')
}

interface ItemProps {
  notificacao: Notificacao
}

function NotificacaoItem({ notificacao }: ItemProps) {
  return (
    <div
      data-testid={`notif-${notificacao.id}`}
      data-unread={String(!notificacao.lida)}
      className={`flex items-start gap-md p-lg rounded-card border-thin border-border
        ${!notificacao.lida ? 'bg-primary-light' : 'bg-surface'}`}
    >
      {ICONE_POR_TIPO[notificacao.tipo]}
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-text-primary">{notificacao.titulo}</p>
        <p className="text-sm text-text-secondary mt-[2px]">{notificacao.mensagem}</p>
      </div>
      <span className="text-xs text-text-disabled flex-shrink-0">
        {formatarData(notificacao.criadaEm)}
      </span>
    </div>
  )
}

export function NotificacoesPage() {
  const { notificacoes, carregando, marcarTodasComoLidas } = useNotificacoes()

  useEffect(() => {
    marcarTodasComoLidas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  if (notificacoes.length === 0) {
    return (
      <div data-testid="empty-notificacoes" className="flex flex-col items-center gap-md py-huge">
        <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle flex items-center justify-center">
          <IconBell size={24} className="text-primary" />
        </div>
        <p className="text-body font-medium text-text-primary">Nenhuma notificação</p>
        <p className="text-md text-text-secondary text-center">
          Você não tem notificações no momento
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-sm">
      {notificacoes.map((n) => (
        <NotificacaoItem key={n.id} notificacao={n} />
      ))}
    </div>
  )
}
