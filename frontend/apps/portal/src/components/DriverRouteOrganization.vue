<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowLeftRight, Building2, Bus } from '@lucide/vue'
import { BaseAlert, BaseButton, BaseCard, BaseModal, BaseSelect } from '@maragobus/shared'
import { listMockDrivers } from '@maragobus/shared/auth/mock'
import { useCollegeDistributionsStore } from '../stores/college-distributions'

const props = defineProps<{ date: string; reference: Date }>()
const store = useCollegeDistributionsStore()
const organization = computed(() => store.getOrganization(props.date, props.reference))
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const colleges = computed(() => [...organization.value.colleges]
  .sort((left, right) => collator.compare(left.college, right.college)))
const unassigned = computed(() => colleges.value.filter(college => !college.driver))
const assigned = computed(() => colleges.value.filter(college => college.driver))
const studentTotal = (items: typeof colleges.value) => items.reduce((total, item) => total + item.studentCount, 0)
const countLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`

const drivers = computed(() => {
  const current = organization.value.driver
  if (!current) return []
  return [...new Map([...listMockDrivers(), current].map(driver => [driver.id, driver])).values()]
})
const options = computed(() => drivers.value.map(driver => ({ value: driver.id, label: driver.name })))
const routes = computed(() => {
  const roster = new Map(drivers.value.map(({ id, name }) => [id, { id, name }]))
  for (const { driver } of assigned.value) {
    if (driver && !roster.has(driver.id)) roster.set(driver.id, driver)
  }
  return [...roster.values()]
    .sort((left, right) => collator.compare(left.name, right.name))
    .map(driver => ({ ...driver, colleges: assigned.value.filter(college => college.driver?.id === driver.id) }))
})

const message = computed(() => {
  const { schedule, status, driver } = organization.value
  if (schedule === 'no-date') return 'Selecione a data da viagem para consultar a organização de rotas.'
  if (!driver) return 'Entre como motorista para consultar a organização de rotas.'
  if (schedule === 'future') return 'A data selecionada é futura. A organização estará disponível a partir das 11h no dia da viagem.'
  if (schedule === 'before-closing') return 'A organização de rotas estará disponível após o encerramento das reservas, às 11h na data selecionada.'
  if (schedule === 'past') return status
    ? 'A data selecionada já passou. A distribuição está disponível para consulta.'
    : 'A data selecionada já passou e não tem distribuição registrada.'
  if (status === 'PUBLICADA') return 'A distribuição está publicada e disponível para consulta.'
  return ''
})
const showDistribution = computed(() => Boolean(organization.value.status) || organization.value.canEdit)
const heading = ref<HTMLElement>()
const feedback = ref('')
const error = ref('')
const editing = ref('')
const destination = ref<string | number>('')
const target = computed(() => organization.value.canEdit
  ? assigned.value.find(college => college.college === editing.value)
  : undefined)
const transferOptions = computed(() => options.value.filter(option => option.value !== target.value?.driver?.id))

function closeEditor() {
  editing.value = ''
  destination.value = ''
}

watch([() => props.date, () => organization.value.driver?.id], () => {
  closeEditor()
  feedback.value = ''
  error.value = ''
})
watch(target, value => {
  if (!value) closeEditor()
})

function openEditor(college: string, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  error.value = ''
  editing.value = college
}

async function applyChange(action: 'assign' | 'transfer' | 'remove', college: string, driverId?: string | number) {
  const driver = drivers.value.find(item => item.id === driverId)
  const result = action === 'remove'
    ? store.remove(props.date, college)
    : driver && (action === 'transfer'
      ? store.transfer(props.date, college, driver)
      : store.assign(props.date, college, driver, true))

  error.value = ''
  feedback.value = ''
  if (result !== 'assigned' && result !== 'removed' && result !== 'transferred') {
    error.value = 'Não foi possível atualizar a atribuição.'
    return
  }
  feedback.value = driver ? `${college} atribuída a ${driver.name}.` : `Atribuição de ${college} removida.`
  closeEditor()
  await nextTick()
  heading.value?.focus()
}
</script>

<template>
  <section aria-labelledby="driver-route-organization" class="space-y-3">
    <h2 id="driver-route-organization" ref="heading" tabindex="-1" class="text-subtitle text-heading">Organização de rotas</h2>
    <BaseCard v-if="message">
      <p role="status" class="text-body text-muted">{{ message }}</p>
    </BaseCard>

    <div v-if="showDistribution" class="space-y-4">
      <div class="grid grid-cols-2 gap-3 sm:gap-4" aria-live="polite">
        <BaseCard>
          <dl>
            <dt class="text-helper text-muted">Faculdades atribuídas</dt>
            <dd class="mt-1 text-page text-heading tabular-nums">{{ assigned.length }}/{{ colleges.length }}</dd>
          </dl>
        </BaseCard>
        <BaseCard>
          <dl>
            <dt class="text-helper text-muted">Alunos distribuídos</dt>
            <dd class="mt-1 text-page text-heading tabular-nums">{{ studentTotal(assigned) }}/{{ studentTotal(colleges) }}</dd>
          </dl>
        </BaseCard>
      </div>
      <p role="status" class="sr-only">{{ feedback }}</p>
      <BaseAlert v-if="error && !target" variant="danger">{{ error }}</BaseAlert>

      <BaseCard>
        <h3 class="text-body font-semibold text-heading">Faculdades não atribuídas</h3>
        <ul v-if="unassigned.length" aria-label="Faculdades não atribuídas" class="mt-2 divide-y divide-line">
          <li v-for="college in unassigned" :key="college.college"
            class="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:items-center sm:gap-4">
            <div class="flex min-w-0 items-center gap-3">
              <Building2 :size="20" class="shrink-0 text-identity" aria-hidden="true" />
              <div class="min-w-0 wrap-anywhere">
                <p class="text-body font-semibold text-heading">{{ college.college }}</p>
                <p class="text-helper text-muted">{{ countLabel(college.studentCount, 'aluno', 'alunos') }}</p>
              </div>
            </div>
            <BaseSelect v-if="organization.canEdit" :model-value="''" :options="options"
              label="Motorista" :aria-label="`Motorista para ${college.college}`" placeholder="Selecione o motorista"
              @update:model-value="applyChange('assign', college.college, $event)" />
          </li>
        </ul>
        <p v-else class="mt-2 text-body text-muted">
          {{ studentTotal(colleges) ? 'Todas as faculdades com reservas estão atribuídas.' : 'Nenhuma reserva confirmada para esta data.' }}
        </p>
      </BaseCard>

      <div class="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <BaseCard v-for="route in routes" :key="route.id" class="min-w-0">
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="grid size-9 shrink-0 place-items-center rounded-control bg-secondary text-identity">
                <Bus :size="20" aria-hidden="true" />
              </span>
              <div class="min-w-0 wrap-anywhere">
                <h3 class="text-body font-semibold text-heading">{{ route.name }}</h3>
                <p class="text-helper text-muted">{{ countLabel(route.colleges.length, 'faculdade', 'faculdades') }}</p>
              </div>
            </div>
            <dl class="flex flex-col-reverse text-right">
              <dt class="text-helper text-muted">alunos</dt>
              <dd class="text-page text-primary tabular-nums">{{ studentTotal(route.colleges) }}</dd>
            </dl>
          </div>
          <ul v-if="route.colleges.length" :aria-label="`Faculdades de ${route.name}`" class="mt-3 divide-y divide-line border-t border-line">
            <li v-for="college in route.colleges" :key="college.college" class="flex flex-wrap items-center justify-between gap-2 py-3">
              <div class="min-w-0 flex-[1_1_8rem] wrap-anywhere">
                <p class="text-body font-medium text-heading">{{ college.college }}</p>
                <p class="text-helper text-muted">{{ countLabel(college.studentCount, 'aluno', 'alunos') }}</p>
              </div>
              <BaseButton v-if="organization.canEdit" variant="outline" size="sm" class="ml-auto shrink-0"
                :icon="ArrowLeftRight" aria-haspopup="dialog"
                :aria-label="`Transferir ou remover a atribuição de ${college.college}`" @click="openEditor(college.college, $event)">
                Transferir
              </BaseButton>
            </li>
          </ul>
          <p v-else class="mt-3 border-t border-line pt-3 text-helper text-muted">Nenhuma faculdade atribuída.</p>
        </BaseCard>
      </div>
    </div>

    <BaseModal :model-value="Boolean(target)" title="Editar atribuição"
      :focus-fallback="() => heading" @update:model-value="closeEditor">
      <div v-if="target" class="space-y-3">
        <p class="text-body font-semibold text-heading wrap-anywhere">{{ target.college }}</p>
        <BaseSelect v-if="transferOptions.length" v-model="destination" label="Transferir para" :options="transferOptions" />
        <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
      </div>
      <template #footer>
        <BaseButton v-if="target" variant="outline" @click="applyChange('remove', target.college)">Remover atribuição</BaseButton>
        <BaseButton v-if="target && transferOptions.length" :disabled="!destination"
          @click="applyChange('transfer', target.college, destination)">Transferir</BaseButton>
      </template>
    </BaseModal>
  </section>
</template>
