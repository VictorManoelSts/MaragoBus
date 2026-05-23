import { Outlet } from 'react-router-dom'

export function MotoristaLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface border-b border-thin border-border
                         flex items-center justify-center px-xxxl py-lg">
        <img
          src="/assets/logo-maragogi.png"
          alt="Prefeitura de Maragogi"
          className="w-logo-sm h-logo-sm object-contain"
        />
      </header>

      <main className="flex-1 w-full max-w-content mx-auto px-xxxl py-lg">
        <Outlet />
      </main>
    </div>
  )
}
