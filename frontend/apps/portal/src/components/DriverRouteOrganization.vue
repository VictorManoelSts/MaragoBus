<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowLeftRight, Building2, Bus } from '@lucide/vue'
import { BaseAlert, BaseBadge, BaseButton, BaseCard, BaseModal, BaseSelect } from '@maragobus/shared'
import { listMockDrivers } from '@maragobus/shared/auth/mock'
import { useCollegeDistributionsStore } from '../stores/college-distributions'
import { transportTimeZone } from '../utils/reservation-availability'

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
const publicationDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: transportTimeZone,
})
const heading = ref<HTMLElement>()
const transitionFeedback = ref<HTMLElement>()
const transitionMessage = ref('')
const transitionError = ref(false)
const confirmation = ref<'publish' | 'reopen'>()
const confirmationLabel = computed(() => confirmation.value === 'publish' ? 'Publicar distribuição' : 'Reabrir distribuição')
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
  confirmation.value = undefined
  transitionMessage.value = ''
  feedback.value = ''
  error.value = ''
})
watch(() => organization.value.schedule, schedule => {
  if (schedule !== 'open') confirmation.value = undefined
})
watch(target, value => {
  if (!value) closeEditor()
})

function openEditor(college: string, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  error.value = ''
  editing.value = college
}

function openConfirmation(action: 'publish' | 'reopen', event: MouseEvent) {
  if (action === 'publish' ? !organization.value.canPublish : !organization.value.canReopen) return
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  transitionMessage.value = ''
  confirmation.value = action
}

async function confirmTransition() {
  const action = confirmation.value
  if (!action) return
  const result = store[action](props.date)
  confirmation.value = undefined
  feedback.value = ''
  error.value = ''
  transitionError.value = result !== 'published' && result !== 'reopened'
  if (result === 'published') transitionMessage.value = 'Distribuição publicada com sucesso.'
  else if (result === 'reopened') transitionMessage.value = 'Distribuição reaberta com sucesso.'
  else if (result === 'unassigned-colleges') transitionMessage.value = 'Atribua todas as faculdades com reservas confirmadas para publicar a distribuição.'
  else transitionMessage.value = action === 'publish'
    ? 'Não foi possível publicar a distribuição.'
    : 'Não foi possível reabrir a distribuição.'
  await nextTick()
  transitionFeedback.value?.focus()
}

async function applyChange(action: 'assign' | 'transfer' | 'remove', college: string, driverId?: string | number) {
  transitionMessage.value = ''
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
    <div class="flex flex-wrap items-center gap-2">
      <h2 id="driver-route-organization" ref="heading" tabindex="-1" class="text-subtitle text-heading">Organização de rotas</h2>
      <BaseBadge v-if="organization.status" :variant="organization.status === 'PUBLICADA' ? 'success' : 'neutral'">
        {{ organization.status === 'PUBLICADA' ? 'Publicada' : 'Rascunho' }}
      </BaseBadge>
    </div>
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
      <p v-if="organization.publication" class="text-helper text-muted">
        Publicada por {{ organization.publication.author.name }} em
        <time :datetime="organization.publication.at">{{ publicationDate.format(new Date(organization.publication.at)) }}</time>
      </p>
      <BaseButton v-if="organization.status === 'RASCUNHO'" :disabled="!organization.canPublish"
        aria-haspopup="dialog" @click="openConfirmation('publish', $event)">
        Publicar distribuição
      </BaseButton>
      <BaseButton v-if="organization.canReopen" variant="outline" aria-haspopup="dialog"
        @click="openConfirmation('reopen', $event)">
        Reabrir distribuição
      </BaseButton>
    </div>
    <BaseAlert v-if="transitionMessage" :variant="transitionError ? 'danger' : 'success'">
      <p ref="transitionFeedback" tabindex="-1">{{ transitionMessage }}</p>
    </BaseAlert>

    <BaseModal :model-value="Boolean(confirmation)" :title="confirmationLabel"
      :focus-fallback="() => heading" @update:model-value="confirmation = undefined">
      <p v-if="confirmation === 'publish'" class="text-body text-muted">
        Ao publicar, as atribuições ficam disponíveis para consulta. Para alterá-las, reabra a distribuição.
      </p>
      <p v-else-if="confirmation === 'reopen'" class="text-body text-muted">
        Ao reabrir, você poderá editar as atribuições existentes.
      </p>
      <template #footer>
        <BaseButton variant="outline" @click="confirmation = undefined">Cancelar</BaseButton>
        <BaseButton @click="confirmTransition">{{ confirmationLabel }}</BaseButton>
      </template>
    </BaseModal>

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
