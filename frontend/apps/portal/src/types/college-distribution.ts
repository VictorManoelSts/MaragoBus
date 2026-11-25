import type { SessionUser } from '@maragobus/shared/auth/contracts'
import type { TravelDate } from './reservation-availability'

export type DistributionDriver = Readonly<Pick<SessionUser, 'id' | 'name'>>
export type DistributionStatus = 'RASCUNHO' | 'PUBLICADA'

export interface CollegeAllocation {
  readonly college: string
  readonly studentCount: number
  readonly driver: DistributionDriver | null
}

export type DistributionChange = Readonly<{
  author: DistributionDriver
  at: string
} & (
  | { type: 'created' | 'published' | 'reopened' }
  | { type: 'assigned'; college: string; driver: DistributionDriver }
  | { type: 'removed'; college: string; previousDriver: DistributionDriver }
  | { type: 'transferred'; college: string; previousDriver: DistributionDriver; driver: DistributionDriver }
)>

export interface CollegeDistribution {
  readonly travelDate: TravelDate
  readonly status: DistributionStatus
  readonly colleges: readonly CollegeAllocation[]
  readonly totalStudents: number
  readonly history: readonly DistributionChange[]
}
