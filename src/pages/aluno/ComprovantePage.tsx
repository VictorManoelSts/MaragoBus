import { QRCodeSVG } from 'qrcode.react'
import {
  IconCalendarOff,
  IconCircleCheck,
  IconQrcode,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPhone,
  IconBook,
  IconSchool,
} from '@tabler/icons-react'
import { useReserva } from '@/hooks/useReserva'
import type { Aluno } from '@/types/aluno'
import type { Reserva } from '@/types/reserva'

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function formatarDataISO(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarHora(ts: Reserva['criadaEm']): string {
  return ts.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface InfoRowProps {
  icone: React.ReactNode
  label: string
  valor: string
}

function InfoRow({ icone, label, valor }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-xs border-b border-thin border-border-subtle last:border-0">
      <span className="flex items-center gap-xs text-sm text-text-secondary">
        {icone}
        {label}
      </span>
      <span className="text-sm font-medium text-text-primary text-right">{valor}</span>
    </div>
  )
}

interface ConteudoProps {
  aluno: Aluno
  reserva: Reserva
}

function Conteudo({ aluno, reserva }: ConteudoProps) {
  return (
    <div className="flex flex-col gap-lg">
      {/* Header azul */}
      <div className="bg-primary px-xl py-[14px] flex items-center gap-lg rounded-card">
        <div
          data-testid="avatar-iniciais"
          className="w-avatar-md h-avatar-md rounded-full bg-header-overlay
                     border-thick border-header-border
                     flex items-center justify-center
                     text-body font-medium text-white flex-shrink-0"
        >
          {iniciais(aluno.nome)}
        </div>
        <div>
          <p className="text-body font-medium text-white">{aluno.nome}</p>
          <p className="text-sm text-white/80">{aluno.curso} · {aluno.faculdade}</p>
          <span className="inline-flex items-center gap-xs mt-[3px]
                           bg-header-overlay border-thin border-header-border
                           rounded-pill px-xl py-[2px] text-xs text-white">
            <IconCircleCheck size={9} />
            Reserva confirmada
          </span>
        </div>
      </div>

      {/* Informações da reserva */}
      <div className="bg-surface border-thin border-border rounded-card p-xl flex flex-col">
        <InfoRow
          icone={<IconCalendar size={12} className="text-primary" />}
          label="Data da viagem"
          valor={formatarDataISO(reserva.data)}
        />
        <InfoRow
          icone={<IconClock size={12} className="text-primary" />}
          label="Horário da reserva"
          valor={formatarHora(reserva.criadaEm)}
        />
        <InfoRow
          icone={<IconMapPin size={12} className="text-primary" />}
          label="Ponto de embarque"
          valor={reserva.pontoEscolhido}
        />
        <InfoRow
          icone={<IconSchool size={12} className="text-primary" />}
          label="Modalidade"
          valor={aluno.modalidade.charAt(0).toUpperCase() + aluno.modalidade.slice(1)}
        />
        <InfoRow
          icone={<IconBook size={12} className="text-primary" />}
          label="Semestre"
          valor={`${aluno.semestre}º semestre`}
        />
        <InfoRow
          icone={<IconPhone size={12} className="text-primary" />}
          label="Telefone"
          valor={aluno.telefone}
        />
      </div>

      {/* QR Code */}
      <div className="bg-surface border-thin border-border rounded-card p-xl
                      flex flex-col items-center gap-sm">
        <p className="flex items-center gap-xs text-sm font-medium text-primary uppercase tracking-wider">
          <IconQrcode size={11} />
          Comprovante de embarque
        </p>
        <QRCodeSVG
          value={reserva.id}
          size={80}
          fgColor="#499bd0"
          bgColor="#ffffff"
          className="border-thick border-border rounded-input p-xs"
        />
        <p className="text-xs text-text-secondary">
          Apresente ao motorista no embarque
        </p>
      </div>
    </div>
  )
}

export function ComprovantePage() {
  const { aluno, reservaAtiva, carregando } = useReserva()

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

  if (!reservaAtiva || !aluno) {
    return (
      <div data-testid="empty-state" className="flex flex-col items-center gap-md py-huge">
        <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle
                        flex items-center justify-center">
          <IconCalendarOff size={24} className="text-primary" />
        </div>
        <p className="text-body font-medium text-text-primary">Nenhuma reserva ativa</p>
        <p className="text-md text-text-secondary text-center">
          Confirme sua reserva na tela de reservas
        </p>
      </div>
    )
  }

  return <Conteudo aluno={aluno} reserva={reservaAtiva} />
}
