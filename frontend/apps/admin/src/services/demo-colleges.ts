import { CollegeValidationError } from './colleges'
import type { College, CollegeDetails, CollegesService } from './colleges'

const demoColleges: readonly College[] = [
  { id: 'demo-horizonte-leste', name: 'Faculdade Horizonte Leste', acronym: 'FHL', active: true },
  { id: 'demo-lagoa-dourada', name: 'Faculdade Lagoa Dourada', acronym: 'FLD', active: true },
  { id: 'demo-campo-sereno', name: 'Faculdade Campo Sereno', acronym: 'FCS', active: false },
]

export function createDemoCollegesService(initial: readonly College[] = demoColleges) {
  const records = new Map(initial.map(college => [college.id, { ...college }]))
  let nextId = 1
  let failNextList = false

  function normalize(details: CollegeDetails, id?: string): CollegeDetails {
    const name = details.name.trim()
    if (!name) throw new CollegeValidationError({ name: 'Informe o nome da faculdade.' })
    if (details.name.length > 150) {
      throw new CollegeValidationError({ name: 'Use até 150 caracteres no nome.' })
    }
    if ([...records.values()].some(college => college.id !== id && college.name === name)) {
      throw new CollegeValidationError({ name: 'Já existe uma faculdade com este nome.' })
    }
    return { name, acronym: details.acronym.trim() }
  }

  function find(id: string): College {
    const college = records.get(id)
    if (!college) throw new Error('Faculdade não encontrada.')
    return college
  }

  function save(college: College): College {
    records.set(college.id, college)
    return { ...college }
  }

  const service: CollegesService = {
    async list() {
      if (failNextList) {
        failNextList = false
        throw new Error('Falha simulada de carregamento.')
      }
      return [...records.values()].map(college => ({ ...college }))
    },
    async create(details) {
      const normalized = normalize(details)
      while (records.has(`demo-college-${nextId}`)) nextId++
      return save({ ...normalized, id: `demo-college-${nextId++}`, active: true })
    },
    async update(id, details) {
      return save({ ...find(id), ...normalize(details, id) })
    },
    async setActive(id, active) {
      return save({ ...find(id), active })
    },
  }

  return {
    service,
    simulateListError() { failNextList = true },
  }
}
