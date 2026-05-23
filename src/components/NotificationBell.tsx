import { IconBell } from '@tabler/icons-react'

interface Props {
  naoLidas: number
  onClick: () => void
}

export function NotificationBell({ naoLidas, onClick }: Props) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        aria-label="Notificações"
        className="text-primary"
      >
        <IconBell size={20} />
      </button>
      {naoLidas > 0 && (
        <span
          data-testid="badge-notif"
          className="absolute -top-1 -right-1 w-badge-dot h-badge-dot
                     bg-badge rounded-full flex items-center justify-center
                     text-xs font-medium text-white pointer-events-none"
        >
          {naoLidas}
        </span>
      )}
    </div>
  )
}
