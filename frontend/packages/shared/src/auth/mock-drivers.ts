import type { SessionUser } from './contracts'
import { driverDemoEnabled } from './driver-demo'

export const testDriver = { id: 'mock-driver-test', name: 'Motorista de Teste', role: 'driver' } as const
export const demoDrivers = [
  { id: 'driver-demo-1', name: 'Motorista Demo 1', role: 'driver' },
  { id: 'driver-demo-2', name: 'Motorista Demo 2', role: 'driver' },
  { id: 'driver-demo-3', name: 'Motorista Demo 3', role: 'driver' },
] as const

export function listMockDrivers(): SessionUser[] {
  if (!import.meta.env.DEV || import.meta.env.PROD || window.location.hostname !== 'localhost') return []
  return (driverDemoEnabled() ? demoDrivers : [testDriver]).map(driver => ({ ...driver }))
}
