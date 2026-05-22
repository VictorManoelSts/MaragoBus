import { Outlet } from 'react-router-dom'

export function MotoristaLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full max-w-content mx-auto px-xxxl py-lg">
        <Outlet />
      </main>
    </div>
  )
}
