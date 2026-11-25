<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { BaseAlert, BaseButton, BaseCard, BaseInput, BaseModal, BaseSelect } from '@maragobus/shared'
import { useReservationsStore } from '../stores/reservations'
import { useWarningRequestsStore } from '../stores/warning-requests'
import { getTransportDate } from '../utils/reservation-availability'

const store = useReservationsStore()
const warningRequests = useWarningRequestsStore()
const date = ref(getTransportDate(new Date()))
const search = ref('')
const all = 0
const college = ref<string | number>(all)
const boardingPoint = ref<string | number>(all)
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const confirmed = computed(() => store.listDriverReservations(date.value))
const warningId = ref<string>()
const warningTarget = computed(() => confirmed.value.find(item => item.id === warningId.value))
const warningReason = ref('')
const reasonError = ref(false)
const warningError = ref('')
const warningSent = ref(false)
const reasonInput = ref<HTMLTextAreaElement>()
const errorFeedback = ref<HTMLElement>()
const successFeedback = ref<HTMLElement>()
const pageHeading = ref<HTMLElement>()
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })

function closeWarning() {
  warningId.value = undefined
  warningReason.value = ''
  reasonError.value = false
  warningError.value = ''
}

async function openWarning(id: string) {
  warningId.value = id
  warningSent.value = false
  await nextTick()
  reasonInput.value?.focus()
}

async function submitWarning() {
  if (!warningId.value) return
  const result = warningRequests.create(warningId.value, warningReason.value)
  if (result.status === 'created') {
    closeWarning()
    warningSent.value = true
    await nextTick()
    successFeedback.value?.focus()
  } else if (result.status === 'reason-required') {
    reasonError.value = true
    warningError.value = ''
    await nextTick()
    reasonInput.value?.focus()
  } else {
    reasonError.value = false
    warningError.value = result.status === 'duplicate'
      ? 'Já existe uma solicitação pendente ou aprovada para esta reserva.'
      : 'Esta reserva não está disponível para solicitação.'
    await nextTick()
    errorFeedback.value?.focus()
  }
}

watch(warningTarget, target => {
  if (!target) closeWarning()
})
watch(() => warningRequests.driverId, () => {
  closeWarning()
  warningSent.value = false
})

const collegeOptions = computed(() => [
  { value: all, label: 'Todas as faculdades' },
  ...Array.from(new Set(confirmed.value.map(item => item.college)))
    .sort(collator.compare)
    .map(label => ({ value: label, label })),
])
const boardingOptions = computed(() => [
  { value: all, label: 'Todos os pontos' },
  ...Array.from(new Map(confirmed.value.map(item => [item.boardingPointId, item.boardingPoint])))
    .sort((left, right) => collator.compare(left[1], right[1]))
    .map(([value, label]) => ({ value, label })),
])

function normalizeName(value: string) {
  return value.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
}

const filtered = computed(() => {
  const query = normalizeName(search.value)
  return confirmed.value
    .filter(item => (!query || normalizeName(item.studentName ?? '').includes(query))
      && (college.value === all || item.college === college.value)
      && (boardingPoint.value === all || item.boardingPointId === boardingPoint.value))
    .sort((left, right) => collator.compare(left.studentName ?? '', right.studentName ?? ''))
})

function changeDate(value: string | number) {
  date.value = String(value)
  college.value = all
  boardingPoint.value = all
}

watch([collegeOptions, boardingOptions], ([colleges, points]) => {
  if (!colleges.some(option => option.value === college.value)) college.value = all
  if (!points.some(option => option.value === boardingPoint.value)) boardingPoint.value = all
})
</script>

<template>
  <div class="min-w-0 space-y-6">
    <h1 ref="pageHeading" tabindex="-1" class="text-page">Reservas confirmadas</h1>

    <BaseAlert v-if="warningSent" variant="success">
      <p ref="successFeedback" tabindex="-1">Solicitação de advertência enviada. Situação inicial: Pendente.</p>
      <RouterLink :to="{ name: 'driver-warning-requests' }" class="underline">Consultar minhas solicitações</RouterLink>
    </BaseAlert>

    <BaseCard>
      <div class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BaseInput id="driver-reservation-date" :model-value="date" type="date" label="Data da viagem"
          @update:model-value="changeDate" />
        <BaseInput id="driver-reservation-name" v-model="search" type="search" label="Buscar por nome" />
        <BaseSelect id="driver-reservation-college" v-model="college" label="Faculdade" :options="collegeOptions" />
        <BaseSelect id="driver-reservation-point" v-model="boardingPoint" label="Ponto de embarque" :options="boardingOptions" />
      </div>
    </BaseCard>

    <div role="status" class="space-y-2 text-body">
      <div class="flex flex-wrap gap-x-6 gap-y-1">
        <p>Total de reservas confirmadas: <strong>{{ confirmed.length }}</strong></p>
        <p>Resultados filtrados: <strong>{{ filtered.length }}</strong></p>
      </div>
      <p v-if="!date" class="text-muted">Selecione a data da viagem.</p>
      <p v-else-if="!confirmed.length" class="text-muted">Nenhuma reserva confirmada para esta data.</p>
      <p v-else-if="!filtered.length" class="text-muted">Nenhuma reserva corresponde aos filtros selecionados.</p>
    </div>

    <ul v-if="filtered.length" aria-label="Alunos com reserva confirmada" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <li v-for="item in filtered" :key="item.id" class="min-w-0">
        <BaseCard class="h-full wrap-anywhere">
          <h2 class="text-subtitle">{{ item.studentName || 'Nome indisponível' }}</h2>
          <dl class="mt-3 space-y-3">
            <div>
              <dt class="text-helper text-muted">Faculdade</dt>
              <dd class="text-body">{{ item.college }}</dd>
            </div>
            <div>
              <dt class="text-helper text-muted">Ponto de embarque</dt>
              <dd class="text-body">{{ item.boardingPoint }}</dd>
            </div>
          </dl>
          <template #footer>
            <BaseButton variant="outline" class="w-full sm:w-auto"
              :aria-label="`Solicitar advertência para ${item.studentName || 'aluno com nome indisponível'}`"
              @click="openWarning(item.id)">
              Solicitar advertência
            </BaseButton>
          </template>
        </BaseCard>
      </li>
    </ul>

    <BaseModal :model-value="Boolean(warningTarget)" title="Solicitar advertência"
      :focus-fallback="() => pageHeading" @update:model-value="closeWarning">
      <form v-if="warningTarget" id="driver-warning-form" class="space-y-4" novalidate @submit.prevent="submitWarning">
        <dl class="space-y-2 wrap-anywhere">
          <div><dt class="text-helper text-muted">Aluno</dt><dd>{{ warningTarget.studentName || 'Nome indisponível' }}</dd></div>
          <div>
            <dt class="text-helper text-muted">Data da viagem</dt>
            <dd><time :datetime="date">{{ dateFormat.format(new Date(`${date}T00:00:00Z`)) }}</time></dd>
          </div>
        </dl>
        <div class="mb-field">
          <label for="driver-warning-reason" class="mb-label">Motivo</label>
          <textarea id="driver-warning-reason" ref="reasonInput" v-model="warningReason"
            class="mb-control" rows="4" required :aria-invalid="reasonError || undefined"
            :aria-describedby="reasonError ? 'driver-warning-reason-error' : undefined"
            @input="reasonError = false" />
          <p v-if="reasonError" id="driver-warning-reason-error" class="mb-error" role="alert">
            Informe o motivo da solicitação.
          </p>
        </div>
        <BaseAlert v-if="warningError" variant="danger">
          <p ref="errorFeedback" tabindex="-1">{{ warningError }}</p>
        </BaseAlert>
      </form>
      <template #footer>
        <BaseButton variant="outline" @click="closeWarning">Voltar</BaseButton>
        <BaseButton type="submit" form="driver-warning-form">Enviar solicitação</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
