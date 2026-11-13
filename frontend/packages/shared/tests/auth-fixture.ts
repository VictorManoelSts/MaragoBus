import type { AuthRole } from '../src/auth/contracts'
import { useSessionStore } from '../src/auth/session'

export async function setMockSession(role: AuthRole): Promise<void> {
  document.cookie = `maragobus_mock_session=mock-${role}-test; Path=/; SameSite=Lax`
  await useSessionStore().restore()
}
