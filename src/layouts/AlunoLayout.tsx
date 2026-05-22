import { Outlet } from 'react-router-dom'

export function AlunoLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full max-w-content mx-auto px-xxxl py-lg pb-nav-bar">
        <Outlet />
      </main>
    </div>
  )
}
