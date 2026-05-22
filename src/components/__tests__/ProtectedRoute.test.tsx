import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PrimeiroAcessoRoute, RootRedirect } from '@/components/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import type { AuthState } from '@/hooks/useAuth'
import type { Perfil } from '@/services/authService'

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))
const mockUseAuth = useAuth as jest.Mock

const AUTH_LOADING: AuthState = { loading: true, uid: null, perfil: null, primeiroAcesso: false }
const AUTH_UNAUTHENTICATED: AuthState = { loading: false, uid: null, perfil: null, primeiroAcesso: false }

function makeAuth(perfil: Perfil, primeiroAcesso = false): AuthState {
  return { loading: false, uid: 'uid123', perfil, primeiroAcesso }
}

function renderProtectedRoute(initialPath: string, perfil: Perfil) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Página de Login</div>} />
        <Route path="/primeiro-acesso" element={<div>Primeiro Acesso</div>} />
        <Route path="/aluno/reserva" element={<div>Área do Aluno</div>} />
        <Route path="/motorista/alunos" element={<div>Área do Motorista</div>} />
        <Route path="/admin/reservas" element={<div>Área do Admin</div>} />
        <Route element={<ProtectedRoute perfil={perfil} />}>
          <Route path="/protected" element={<div>Conteúdo Protegido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function renderPrimeiroAcessoRoute() {
  return render(
    <MemoryRouter initialEntries={['/primeiro-acesso']}>
      <Routes>
        <Route path="/login" element={<div>Página de Login</div>} />
        <Route path="/aluno/reserva" element={<div>Área do Aluno</div>} />
        <Route path="/motorista/alunos" element={<div>Área do Motorista</div>} />
        <Route path="/admin/reservas" element={<div>Área do Admin</div>} />
        <Route element={<PrimeiroAcessoRoute />}>
          <Route path="/primeiro-acesso" element={<div>Tela Primeiro Acesso</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function renderRootRedirect() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<div>Página de Login</div>} />
        <Route path="/primeiro-acesso" element={<div>Primeiro Acesso</div>} />
        <Route path="/aluno/reserva" element={<div>Área do Aluno</div>} />
        <Route path="/motorista/alunos" element={<div>Área do Motorista</div>} />
        <Route path="/admin/reservas" element={<div>Área do Admin</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── ProtectedRoute ────────────────────────────────────────────────────────────

describe('ProtectedRoute — carregando', () => {
  it('exibe spinner enquanto loading=true', () => {
    mockUseAuth.mockReturnValue(AUTH_LOADING)
    renderProtectedRoute('/protected', 'aluno')
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })
})

describe('ProtectedRoute — não autenticado', () => {
  it('redireciona para /login quando uid=null', () => {
    mockUseAuth.mockReturnValue(AUTH_UNAUTHENTICATED)
    renderProtectedRoute('/protected', 'aluno')
    expect(screen.getByText('Página de Login')).toBeInTheDocument()
  })
})

describe('ProtectedRoute — primeiro acesso', () => {
  it('redireciona para /primeiro-acesso quando primeiroAcesso=true', () => {
    mockUseAuth.mockReturnValue(makeAuth('aluno', true))
    renderProtectedRoute('/protected', 'aluno')
    expect(screen.getByText('Primeiro Acesso')).toBeInTheDocument()
  })
})

describe('ProtectedRoute — perfil correto', () => {
  it('renderiza conteúdo quando autenticado como aluno e perfil exige aluno', () => {
    mockUseAuth.mockReturnValue(makeAuth('aluno'))
    renderProtectedRoute('/protected', 'aluno')
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument()
  })

  it('renderiza conteúdo quando autenticado como motorista e perfil exige motorista', () => {
    mockUseAuth.mockReturnValue(makeAuth('motorista'))
    renderProtectedRoute('/protected', 'motorista')
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument()
  })

  it('renderiza conteúdo quando autenticado como admin e perfil exige admin', () => {
    mockUseAuth.mockReturnValue(makeAuth('admin'))
    renderProtectedRoute('/protected', 'admin')
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument()
  })
})

describe('ProtectedRoute — perfil errado', () => {
  it('redireciona para /aluno/reserva quando autenticado como aluno mas rota exige motorista', () => {
    mockUseAuth.mockReturnValue(makeAuth('aluno'))
    renderProtectedRoute('/protected', 'motorista')
    expect(screen.getByText('Área do Aluno')).toBeInTheDocument()
  })

  it('redireciona para /motorista/alunos quando autenticado como motorista mas rota exige admin', () => {
    mockUseAuth.mockReturnValue(makeAuth('motorista'))
    renderProtectedRoute('/protected', 'admin')
    expect(screen.getByText('Área do Motorista')).toBeInTheDocument()
  })

  it('redireciona para /admin/reservas quando autenticado como admin mas rota exige aluno', () => {
    mockUseAuth.mockReturnValue(makeAuth('admin'))
    renderProtectedRoute('/protected', 'aluno')
    expect(screen.getByText('Área do Admin')).toBeInTheDocument()
  })

  it('redireciona para /login quando uid existe mas perfil é null', () => {
    mockUseAuth.mockReturnValue({ loading: false, uid: 'uid123', perfil: null, primeiroAcesso: false })
    renderProtectedRoute('/protected', 'aluno')
    expect(screen.getByText('Página de Login')).toBeInTheDocument()
  })
})

// ── PrimeiroAcessoRoute ───────────────────────────────────────────────────────

describe('PrimeiroAcessoRoute — carregando', () => {
  it('exibe spinner enquanto loading=true', () => {
    mockUseAuth.mockReturnValue(AUTH_LOADING)
    renderPrimeiroAcessoRoute()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })
})

describe('PrimeiroAcessoRoute — não autenticado', () => {
  it('redireciona para /login quando uid=null', () => {
    mockUseAuth.mockReturnValue(AUTH_UNAUTHENTICATED)
    renderPrimeiroAcessoRoute()
    expect(screen.getByText('Página de Login')).toBeInTheDocument()
  })
})

describe('PrimeiroAcessoRoute — primeiroAcesso=true', () => {
  it('renderiza conteúdo quando primeiroAcesso=true', () => {
    mockUseAuth.mockReturnValue(makeAuth('aluno', true))
    renderPrimeiroAcessoRoute()
    expect(screen.getByText('Tela Primeiro Acesso')).toBeInTheDocument()
  })
})

describe('PrimeiroAcessoRoute — primeiroAcesso=false redireciona por perfil', () => {
  it('redireciona para /aluno/reserva quando aluno já trocou a senha', () => {
    mockUseAuth.mockReturnValue(makeAuth('aluno', false))
    renderPrimeiroAcessoRoute()
    expect(screen.getByText('Área do Aluno')).toBeInTheDocument()
  })

  it('redireciona para /motorista/alunos quando motorista já trocou a senha', () => {
    mockUseAuth.mockReturnValue(makeAuth('motorista', false))
    renderPrimeiroAcessoRoute()
    expect(screen.getByText('Área do Motorista')).toBeInTheDocument()
  })

  it('redireciona para /admin/reservas quando admin acessa /primeiro-acesso', () => {
    mockUseAuth.mockReturnValue(makeAuth('admin', false))
    renderPrimeiroAcessoRoute()
    expect(screen.getByText('Área do Admin')).toBeInTheDocument()
  })
})

// ── RootRedirect ──────────────────────────────────────────────────────────────

describe('RootRedirect — carregando', () => {
  it('exibe spinner enquanto loading=true', () => {
    mockUseAuth.mockReturnValue(AUTH_LOADING)
    renderRootRedirect()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })
})

describe('RootRedirect — não autenticado', () => {
  it('redireciona para /login quando uid=null', () => {
    mockUseAuth.mockReturnValue(AUTH_UNAUTHENTICATED)
    renderRootRedirect()
    expect(screen.getByText('Página de Login')).toBeInTheDocument()
  })
})

describe('RootRedirect — primeiro acesso', () => {
  it('redireciona para /primeiro-acesso quando primeiroAcesso=true', () => {
    mockUseAuth.mockReturnValue(makeAuth('aluno', true))
    renderRootRedirect()
    expect(screen.getByText('Primeiro Acesso')).toBeInTheDocument()
  })
})

describe('RootRedirect — redireciona por perfil', () => {
  it('redireciona para /aluno/reserva quando aluno autenticado', () => {
    mockUseAuth.mockReturnValue(makeAuth('aluno'))
    renderRootRedirect()
    expect(screen.getByText('Área do Aluno')).toBeInTheDocument()
  })

  it('redireciona para /motorista/alunos quando motorista autenticado', () => {
    mockUseAuth.mockReturnValue(makeAuth('motorista'))
    renderRootRedirect()
    expect(screen.getByText('Área do Motorista')).toBeInTheDocument()
  })

  it('redireciona para /admin/reservas quando admin autenticado', () => {
    mockUseAuth.mockReturnValue(makeAuth('admin'))
    renderRootRedirect()
    expect(screen.getByText('Área do Admin')).toBeInTheDocument()
  })

  it('redireciona para /login quando uid existe mas perfil é null', () => {
    mockUseAuth.mockReturnValue({ loading: false, uid: 'uid123', perfil: null, primeiroAcesso: false })
    renderRootRedirect()
    expect(screen.getByText('Página de Login')).toBeInTheDocument()
  })
})
