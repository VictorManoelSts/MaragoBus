import React, { useState } from 'react'
import {
  IconMapPin,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDeviceFloppy,
  IconX,
  IconAlertCircle,
  IconInfoCircle,
} from '@tabler/icons-react'
import { usePontos } from '@/hooks/usePontos'

const CHIP_ATIVO   = 'bg-primary border-none rounded-pill px-lg py-xs text-sm font-medium text-white'
const CHIP_INATIVO = 'bg-primary-light border-thin border-border rounded-pill px-lg py-xs text-sm font-medium text-text-secondary'
const INPUT_BASE   = 'w-full rounded-input px-xl py-lg text-base outline-none border-thin'
const INPUT_VAZIO  = `${INPUT_BASE} bg-primary-light border-border text-text-disabled placeholder:text-text-disabled focus:border-medium focus:border-primary focus:bg-surface`
const INPUT_PREENCHIDO = `${INPUT_BASE} bg-surface border-border text-text-primary`
const INPUT_ERRO   = `${INPUT_BASE} bg-input-error border-thick border-danger-strong text-text-primary`

export function PontosPage() {
  const { pontos, carregando, erro, adicionar, editar, remover } = usePontos()

  const [mostrarForm, setMostrarForm]       = useState(false)
  const [nomeNovo, setNomeNovo]             = useState('')
  const [erroNome, setErroNome]             = useState<string | null>(null)
  const [enviandoAdicionar, setEnviandoAdicionar] = useState(false)

  const [editandoId, setEditandoId]         = useState<string | null>(null)
  const [nomeEditando, setNomeEditando]     = useState('')
  const [enviandoEditar, setEnviandoEditar] = useState(false)

  const [erroRemocao, setErroRemocao]       = useState<string | null>(null)

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeNovo.trim()) {
      setErroNome('O nome do ponto é obrigatório.')
      return
    }
    setEnviandoAdicionar(true)
    try {
      await adicionar(nomeNovo.trim())
      setNomeNovo('')
      setErroNome(null)
      setMostrarForm(false)
    } finally {
      setEnviandoAdicionar(false)
    }
  }

  function handleCancelarForm() {
    setMostrarForm(false)
    setNomeNovo('')
    setErroNome(null)
  }

  async function handleSalvarEdicao(id: string) {
    if (!nomeEditando.trim()) return
    setEnviandoEditar(true)
    try {
      await editar(id, nomeEditando.trim())
      setEditandoId(null)
    } finally {
      setEnviandoEditar(false)
    }
  }

  async function handleRemover(id: string, nome: string) {
    setErroRemocao(null)
    try {
      await remover(id, nome)
    } catch (e) {
      setErroRemocao(e instanceof Error ? e.message : 'Erro ao remover ponto.')
    }
  }

  if (carregando) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center gap-lg">
        <div className="w-spinner h-spinner rounded-full border-[3px] border-spinner-track border-t-primary spinner-animation" />
        <p className="text-base text-text-secondary">Carregando...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="bg-background min-h-screen p-xxxl">
        <div className="bg-danger-bg border-thin border-danger-strong rounded-input p-md flex items-center gap-md">
          <IconAlertCircle size={14} className="text-danger-text flex-shrink-0" />
          <p className="text-sm text-danger-text">{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen p-xxxl flex flex-col gap-lg">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-title font-medium text-text-primary flex items-center gap-sm">
          <IconMapPin size={18} className="text-primary" />
          Pontos de Embarque
        </h1>
        {!mostrarForm && (
          <button
            className={CHIP_ATIVO}
            onClick={() => setMostrarForm(true)}
          >
            <span className="flex items-center gap-xs">
              <IconPlus size={11} />
              Novo ponto
            </span>
          </button>
        )}
      </div>

      {/* Erro de remoção */}
      {erroRemocao && (
        <div
          data-testid="erro-remocao"
          className="bg-warning-bg border-thin border-warning-border rounded-input p-md flex items-center gap-md"
        >
          <IconInfoCircle size={14} className="text-warning-text flex-shrink-0" />
          <p className="text-sm text-warning-text">{erroRemocao}</p>
        </div>
      )}

      {/* Formulário de adição */}
      {mostrarForm && (
        <div className="bg-surface border-thin border-border rounded-card overflow-hidden">
          <div className="flex items-center gap-sm px-xl pt-lg pb-md border-b border-thin border-border-subtle">
            <IconMapPin size={15} className="text-primary flex-shrink-0" />
            <h3 className="text-body font-medium text-text-primary">Novo ponto de embarque</h3>
          </div>
          <form
            data-testid="form-adicionar"
            onSubmit={handleAdicionar}
            className="p-xl flex flex-col gap-lg"
          >
            <div className="flex flex-col gap-xs">
              <label className="flex items-center gap-xs text-md font-medium text-text-secondary">
                <IconMapPin size={10} />
                Nome do ponto
                <span className="text-required">*</span>
              </label>
              <input
                data-testid="input-nome"
                className={erroNome ? INPUT_ERRO : nomeNovo ? INPUT_PREENCHIDO : INPUT_VAZIO}
                placeholder="Ex: Praça Central"
                value={nomeNovo}
                onChange={(e) => {
                  setNomeNovo(e.target.value)
                  if (erroNome) setErroNome(null)
                }}
              />
              {erroNome && (
                <p data-testid="erro-nome" className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
                  <IconAlertCircle size={12} />
                  {erroNome}
                </p>
              )}
            </div>
            <div className="flex gap-md">
              <button
                type="submit"
                disabled={enviandoAdicionar}
                className="flex-1 bg-primary text-white rounded-button py-xl flex items-center justify-center gap-sm text-sub font-medium"
              >
                <IconDeviceFloppy size={15} />
                Salvar
              </button>
              <button
                type="button"
                onClick={handleCancelarForm}
                className="flex-1 bg-transparent border-thick border-border text-text-secondary rounded-button py-lg text-body font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {pontos.length === 0 && (
        <div className="flex flex-col items-center gap-md py-huge">
          <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle flex items-center justify-center">
            <IconMapPin size={24} className="text-primary" />
          </div>
          <p className="text-body font-medium text-text-primary">Nenhum ponto cadastrado</p>
          <p className="text-md text-text-secondary text-center">
            Adicione os pontos de embarque disponíveis para os alunos
          </p>
        </div>
      )}

      {/* Lista de pontos */}
      {pontos.length > 0 && (
        <div data-testid="lista-pontos" className="flex flex-col gap-md">
          {pontos.map((ponto) => (
            <div
              key={ponto.id}
              data-testid={`item-ponto-${ponto.id}`}
              className="bg-surface border-thin border-border rounded-card p-lg"
            >
              {editandoId === ponto.id ? (
                /* Modo edição inline */
                <div className="flex items-center gap-md">
                  <IconMapPin size={14} className="text-primary flex-shrink-0" />
                  <input
                    data-testid={`input-editar-${ponto.id}`}
                    className={`flex-1 ${nomeEditando ? INPUT_PREENCHIDO : INPUT_VAZIO}`}
                    value={nomeEditando}
                    onChange={(e) => setNomeEditando(e.target.value)}
                  />
                  <button
                    onClick={() => handleSalvarEdicao(ponto.id)}
                    disabled={enviandoEditar}
                    className="flex items-center gap-xs text-sm font-medium text-primary bg-primary-light border-thin border-border rounded-sm px-md py-[3px]"
                    aria-label="Salvar"
                  >
                    <IconDeviceFloppy size={13} />
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="flex items-center gap-xs text-sm font-medium text-text-secondary bg-primary-medium border-thin border-border rounded-sm px-md py-[3px]"
                    aria-label="Cancelar"
                  >
                    <IconX size={13} />
                    Cancelar
                  </button>
                </div>
              ) : editandoId !== null ? (
                /* Outro ponto está sendo editado — exibe só o nome */
                <div className="flex items-center gap-md">
                  <IconMapPin size={14} className="text-text-disabled flex-shrink-0" />
                  <span className="flex-1 text-base text-text-secondary">{ponto.nome}</span>
                </div>
              ) : (
                /* Modo visualização normal */
                <div className="flex items-center gap-md">
                  <IconMapPin size={14} className="text-primary flex-shrink-0" />
                  <span className="flex-1 text-base font-medium text-text-primary">
                    {ponto.nome}
                  </span>
                  <button
                    data-testid={`btn-editar-${ponto.id}`}
                    onClick={() => {
                      setEditandoId(ponto.id)
                      setNomeEditando(ponto.nome)
                    }}
                    className="text-text-secondary hover:text-primary"
                    aria-label="Editar"
                  >
                    <IconEdit size={15} />
                  </button>
                  <button
                    data-testid={`btn-remover-${ponto.id}`}
                    onClick={() => handleRemover(ponto.id, ponto.nome)}
                    className="text-text-secondary hover:text-danger-text"
                    aria-label="Remover"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
