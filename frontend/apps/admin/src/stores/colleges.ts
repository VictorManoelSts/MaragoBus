import { defineStore } from 'pinia'
import { inject, ref } from 'vue'
import type { InjectionKey } from 'vue'
import { createDemoCollegesService } from '../services/demo-colleges'
import type { College, CollegeDetails, CollegesService } from '../services/colleges'

export const collegesServiceKey: InjectionKey<CollegesService> = Symbol('collegesService')

export const useCollegesStore = defineStore('admin-colleges', () => {
  const demo = createDemoCollegesService()
  const service = inject(collegesServiceKey, demo.service)
  const canSimulateError = service === demo.service
  const colleges = ref<College[]>([])
  const listState = ref<'loading' | 'ready' | 'error'>('loading')
  const simulatedError = ref(false)

  async function load(simulateError = false) {
    listState.value = 'loading'
    simulatedError.value = false
    if (simulateError && canSimulateError) demo.simulateListError()
    try {
      colleges.value = await service.list()
      listState.value = 'ready'
    } catch {
      simulatedError.value = simulateError && canSimulateError
      listState.value = 'error'
    }
  }

  function apply(college: College) {
    const index = colleges.value.findIndex(item => item.id === college.id)
    if (index === -1) colleges.value.push(college)
    else colleges.value[index] = college
  }

  async function save(details: CollegeDetails, id?: string) {
    apply(await (id ? service.update(id, details) : service.create(details)))
  }

  async function setActive(id: string, active: boolean) {
    apply(await service.setActive(id, active))
  }

  return { colleges, listState, simulatedError, canSimulateError, load, save, setActive }
})
