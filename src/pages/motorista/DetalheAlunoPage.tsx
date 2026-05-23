import { useParams, useNavigate } from 'react-router-dom'
import {
  IconChevronLeft,
  IconBuilding,
  IconBook,
  IconMapPin,
  IconPhone,
  IconUserCircle,
} from '@tabler/icons-react'
import { useDetalheAluno } from '@/hooks/useDetalheAluno'

function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
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

export function DetalheAlunoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const agora = new Date()
  const { aluno, pontoEscolhido, carregando, erro } = useDetalheAluno(id ?? '', agora)

  return (
    <div className="flex flex-col gap-lg">

      {/* Botão voltar */}
      <button
        onClick={() => navigate('/motorista/alunos')}
        className="flex items-center gap-xs text-primary text-sm font-medium self-start"
      >
        <IconChevronLeft size={14} />
        Voltar
      </button>

      {/* Spinner */}
      {carregando && (
        <div className="flex flex-col items-center justify-center gap-lg flex-1 py-huge">
          <div
            role="status"
            className="w-spinner h-spinner rounded-full border-[3px]
                       border-spinner-track border-t-primary spinner-animation"
          />
          <p className="text-base text-text-secondary">Carregando...</p>
        </div>
      )}

      {/* Erro */}
      {!carregando && erro && (
        <p className="text-danger-text text-base">{erro}</p>
      )}

      {/* Conteúdo */}
      {!carregando && !erro && aluno && (
        <>
          {/* Header azul */}
          <div className="bg-primary px-xl py-[14px] flex items-center gap-lg rounded-card">
            <div className="w-avatar-md h-avatar-md rounded-full bg-header-overlay
                            border-thick border-header-border
                            flex items-center justify-center
                            text-body font-medium text-white flex-shrink-0">
              {iniciais(aluno.nome)}
            </div>
            <div>
              <p className="text-body font-medium text-white">{aluno.nome}</p>
              <p className="text-sm text-white/80">{aluno.curso} · {aluno.faculdade}</p>
            </div>
          </div>

          {/* Card de informações */}
          <div className="bg-surface border-thin border-border rounded-card overflow-hidden">
            <div className="flex items-center gap-sm px-xl pt-lg pb-md
                            border-b border-thin border-border-subtle">
              <IconUserCircle size={15} className="text-primary flex-shrink-0" />
              <h3 className="text-body font-medium text-text-primary">Informações</h3>
            </div>
            <div className="px-xl py-md flex flex-col">
              <InfoRow
                icone={<IconBuilding size={12} className="text-primary" />}
                label="Faculdade"
                valor={aluno.faculdade}
              />
              <InfoRow
                icone={<IconBook size={12} className="text-primary" />}
                label="Curso"
                valor={aluno.curso}
              />
              <InfoRow
                icone={<IconMapPin size={12} className="text-primary" />}
                label="Ponto de embarque"
                valor={pontoEscolhido ?? '—'}
              />
              <InfoRow
                icone={<IconPhone size={12} className="text-primary" />}
                label="Telefone"
                valor={aluno.telefone}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
