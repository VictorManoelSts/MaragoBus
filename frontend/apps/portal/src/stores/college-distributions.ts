import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import { isSessionUser, type SessionUser } from '@maragobus/shared/auth/contracts'
import { useSessionStore } from '@maragobus/shared/auth/session'
import type {
  CollegeDistribution, DistributionChange, DistributionDriver, DistributionStatus,
} from '../types/college-distribution'
import type { TravelDate } from '../types/reservation-availability'
import { getReservationClosingTime, getTransportDate } from '../utils/reservation-availability'
import { useReservationsStore } from './reservations'

interface DistributionRecord {
  status: DistributionStatus
  assignments: ReadonlyMap<string, DistributionDriver>
  history: readonly DistributionChange[]
}

type CollegeEdit =
  | { type: 'assigned' | 'transferred'; college: string; driver: SessionUser }
  | { type: 'removed'; college: string }

function driverIdentity({ id, name }: SessionUser): DistributionDriver {
  return Object.freeze({ id, name })
}

export const useCollegeDistributionsStore = defineStore('college-distributions', () => {
  const session = useSessionStore()
  const reservations = useReservationsStore()
  const records = shallowReactive(new Map<TravelDate, DistributionRecord>())

  function getSchedule(travelDate: TravelDate, now: Date) {
    if (!/^\d{4,}-\d{2}-\d{2}$/.test(travelDate)) return 'no-date'
    const today = getTransportDate(now)
    if (travelDate < today) return 'past'
    if (travelDate > today) return 'future'
    return now < getReservationClosingTime(travelDate) ? 'before-closing' : 'open'
  }

  function currentDriver() {
    const user = session.user
    return session.authenticated && user?.role === 'driver' ? user : undefined
  }

  function getOrganization(travelDate: TravelDate, now: Date) {
    const schedule = getSchedule(travelDate, now)
    const driver = currentDriver()
    const distribution = driver ? getDistribution(travelDate) : undefined
    const colleges = distribution?.colleges ?? (driver
      ? Array.from(reservations.countConfirmedByCollege(travelDate), ([college, studentCount]) => ({
        college, studentCount, driver: null,
      }))
      : [])
    const canManage = Boolean(driver && schedule === 'open')
    return {
      schedule,
      driver,
      status: distribution?.status,
      colleges,
      history: distribution?.history,
      canEdit: canManage && distribution?.status !== 'PUBLICADA',
      canPublish: canManage && distribution?.status === 'RASCUNHO' &&
        colleges.every(college => college.studentCount === 0 || college.driver),
      canReopen: canManage && distribution?.status === 'PUBLICADA',
      publication: distribution?.status === 'PUBLICADA'
        ? distribution.history.filter(change => change.type === 'published').at(-1)
        : undefined,
    }
  }

  function getDistribution(travelDate: TravelDate): CollegeDistribution | undefined {
    const record = records.get(travelDate)
    if (!record) return

    const counts = reservations.countConfirmedByCollege(travelDate)
    const colleges = [...new Set([...counts.keys(), ...record.assignments.keys()])].map(college => ({
      college,
      studentCount: counts.get(college) ?? 0,
      driver: record.assignments.get(college) ?? null,
    }))
    return {
      travelDate,
      status: record.status,
      colleges,
      totalStudents: colleges.reduce((total, college) => total + college.studentCount, 0),
      history: record.history,
    }
  }

  function authorize(travelDate: TravelDate) {
    const user = currentDriver()
    if (!user) return 'driver-required'
    const now = new Date()
    if (getSchedule(travelDate, now) !== 'open') return 'outside-window'
    return { author: driverIdentity(user), at: now.toISOString() }
  }

  function save(travelDate: TravelDate, record: DistributionRecord, change: DistributionChange) {
    records.set(travelDate, {
      ...record,
      history: Object.freeze([...record.history, Object.freeze(change)]),
    })
  }

  function create(travelDate: TravelDate) {
    const audit = authorize(travelDate)
    if (typeof audit === 'string') return audit
    if (records.has(travelDate)) return 'already-exists'
    save(travelDate, { status: 'RASCUNHO', assignments: new Map(), history: [] }, {
      ...audit, type: 'created',
    })
    return 'created'
  }

  function editCollege(travelDate: TravelDate, edit: CollegeEdit, createDraft = false) {
    const audit = authorize(travelDate)
    if (typeof audit === 'string') return audit
    const existing = records.get(travelDate)
    const record = existing ?? (createDraft ? {
      status: 'RASCUNHO' as const,
      assignments: new Map<string, DistributionDriver>(),
      history: [Object.freeze({ ...audit, type: 'created' as const })],
    } : undefined)
    if (!record) return 'not-found'
    if (record.status !== 'RASCUNHO') return 'not-draft'

    const { college, type } = edit
    const previousDriver = record.assignments.get(college)
    const assignments = new Map(record.assignments)
    if (type === 'removed') {
      if (!previousDriver) return 'not-assigned'
      assignments.delete(college)
      save(travelDate, { ...record, assignments }, { ...audit, type, college, previousDriver })
      return type
    }
    if (!isSessionUser(edit.driver) || edit.driver.role !== 'driver') return 'invalid-driver'
    if (type === 'assigned') {
      if (previousDriver) return 'already-assigned'
      if (!reservations.countConfirmedByCollege(travelDate).has(college)) return 'college-not-found'
    } else {
      if (!previousDriver) return 'not-assigned'
      if (previousDriver.id === edit.driver.id) return 'same-driver'
    }

    const driver = driverIdentity(edit.driver)
    assignments.set(college, driver)
    const change: DistributionChange = previousDriver
      ? { ...audit, type: 'transferred', college, previousDriver, driver }
      : { ...audit, type: 'assigned', college, driver }
    save(travelDate, { ...record, assignments }, change)
    return type
  }

  function assign(travelDate: TravelDate, college: string, driver: SessionUser, createDraft = false) {
    return editCollege(travelDate, { type: 'assigned', college, driver }, createDraft)
  }

  function remove(travelDate: TravelDate, college: string) {
    return editCollege(travelDate, { type: 'removed', college })
  }

  function transfer(travelDate: TravelDate, college: string, driver: SessionUser) {
    return editCollege(travelDate, { type: 'transferred', college, driver })
  }

  function publish(travelDate: TravelDate) {
    const audit = authorize(travelDate)
    if (typeof audit === 'string') return audit
    const record = records.get(travelDate)
    if (!record) return 'not-found'
    if (record.status !== 'RASCUNHO') return 'not-draft'
    for (const college of reservations.countConfirmedByCollege(travelDate).keys()) {
      if (!record.assignments.has(college)) return 'unassigned-colleges'
    }
    save(travelDate, { ...record, status: 'PUBLICADA' }, { ...audit, type: 'published' })
    return 'published'
  }

  function reopen(travelDate: TravelDate) {
    const audit = authorize(travelDate)
    if (typeof audit === 'string') return audit
    const record = records.get(travelDate)
    if (!record) return 'not-found'
    if (record.status !== 'PUBLICADA') return 'not-published'
    save(travelDate, { ...record, status: 'RASCUNHO' }, { ...audit, type: 'reopened' })
    return 'reopened'
  }

  return { getDistribution, getOrganization, create, assign, remove, transfer, publish, reopen }
})
