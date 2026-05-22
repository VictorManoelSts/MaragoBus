import { Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-content mx-auto px-xxxl py-lg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
