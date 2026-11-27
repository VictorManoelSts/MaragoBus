export interface CollegeDetails {
  name: string
  acronym: string
}

export interface College extends CollegeDetails {
  id: string
  active: boolean
}

export type CollegeFieldErrors = Partial<Record<keyof CollegeDetails, string>>

export class CollegeValidationError extends Error {
  constructor(readonly fields: CollegeFieldErrors) {
    super('Revise os campos da faculdade.')
  }
}

export interface CollegesService {
  list(): Promise<College[]>
  create(details: CollegeDetails): Promise<College>
  update(id: string, details: CollegeDetails): Promise<College>
  setActive(id: string, active: boolean): Promise<College>
}
