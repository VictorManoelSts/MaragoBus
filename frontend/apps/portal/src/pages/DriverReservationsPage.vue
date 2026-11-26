<script setup lang="ts">
import { formatCivilDate } from '../utils/format-transport-date'
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Building2, ChevronDown, ChevronRight, UserRound } from '@lucide/vue'
import { BaseAlert, BaseButton, BaseCard, BaseInput, BaseModal } from '@maragobus/shared'
import DriverRouteOrganization from '../components/DriverRouteOrganization.vue'
import { useTransportClock } from '../composables/useTransportClock'
import { useReservationsStore } from '../stores/reservations'
import { useWarningRequestsStore } from '../stores/warning-requests'
import { getTransportDate } from '../utils/reservation-availability'

const store = useReservationsStore()
const warningRequests = useWarningRequestsStore()
const { reference } = useTransportClock()
const date = ref(getTransportDate(reference.value))
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const confirmed = computed(() => store.listDriverReservations(date.value))
const studentId = ref<string>()
const student = computed(() => confirmed.value.find(item => item.id === studentId.value))
const warningOpen = ref(false)
const warningTarget = computed(() => warningOpen.value ? student.value : undefined)
const colleges = computed(() => {
  const groups = new Map<string, typeof confirmed.value>()
  for (const item of confirmed.value) {
    const group = groups.get(item.college)
    if (group) group.push(item)
    else groups.set(item.college, [item])
  }
  return [...groups]
    .sort(([left], [right]) => collator.compare(left, right))
    .map(([name, students]) => ({
      name,
      students: students.sort((left, right) => collator.compare(left.studentName ?? '', right.studentName ?? '')),
    }))
})

const warningReason = ref('')
const reasonError = ref(false)
const warningError = ref('')
const warningSent = ref(false)
const reasonInput = ref<HTMLTextAreaElement>()
const errorFeedback = ref<HTMLElement>()
const successFeedback = ref<HTMLElement>()
const pageHeading = ref<HTMLElement>()

function closeWarning() {
  warningOpen.value = false
  warningReason.value = ''
  reasonError.value = false
  warningError.value = ''
}

function openStudent(id: string, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  studentId.value = id
}

function closeStudent() {
  closeWarning()
  studentId.value = undefined
}

async function openWarning(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  warningOpen.value = true
  warningSent.value = false
  await nextTick()
  reasonInput.value?.focus()
}

async function submitWarning() {
  if (!warningTarget.value) return
  const result = warningRequests.create(warningTarget.value.id, warningReason.value)
  if (result.status === 'created') {
    closeWarning()
    await nextTick()
    closeStudent()
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

watch(student, target => {
  if (!target) closeStudent()
})
watch(() => warningRequests.driverId, () => {
  closeStudent()
  warningSent.value = false
})
</script>

<template>
  <div class="min-w-0 space-y-6">
    <header class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end">
      <div>
        <h1 ref="pageHeading" tabindex="-1" class="text-page">Reservas</h1>
        <p class="mt-2 text-body text-muted">Consulte as reservas e organize as rotas do transporte.</p>
      </div>
      <BaseInput id="driver-reservation-date" :model-value="date" type="date" label="Data da viagem"
        @update:model-value="date = String($event)" />
    </header>

    <BaseAlert v-if="warningSent" variant="success">
      <p ref="successFeedback" tabindex="-1">Solicitação de advertência enviada. Situação inicial: Pendente.</p>
      <RouterLink :to="{ name: 'driver-warning-requests' }" class="underline">Consultar minhas solicitações</RouterLink>
    </BaseAlert>

    <div role="status" class="grid grid-cols-2 gap-3 sm:gap-4">
      <BaseCard>
        <dl>
          <dt class="text-helper text-muted">Reservas confirmadas</dt>
          <dd class="mt-1 text-page text-heading tabular-nums">{{ confirmed.length }}</dd>
        </dl>
      </BaseCard>
      <BaseCard>
        <dl>
          <dt class="text-helper text-muted">Faculdades</dt>
          <dd class="mt-1 text-page text-heading tabular-nums">{{ colleges.length }}</dd>
        </dl>
      </BaseCard>
    </div>

    <section aria-labelledby="driver-reservations-by-college" class="space-y-3">
      <h2 id="driver-reservations-by-college" class="text-subtitle text-heading">Reservas por faculdade</h2>
      <BaseCard class="[&>.mb-card__body]:p-0">
        <ul v-if="colleges.length" :key="date" aria-label="Faculdades com reservas confirmadas" class="divide-y divide-line">
          <li v-for="college in colleges" :key="college.name">
            <details class="group">
              <summary class="flex min-w-0 cursor-pointer list-none items-center gap-3 rounded-control px-4 py-3.5
                hover:bg-hover focus-visible:outline-offset-[-3px] sm:px-6 [&::-webkit-details-marker]:hidden">
                <Building2 :size="20" class="shrink-0 text-identity" aria-hidden="true" />
                <span class="min-w-0 flex-1 wrap-anywhere">
                  <span class="block text-body font-semibold text-heading">{{ college.name }}</span>
                  <span class="block text-helper text-muted">
                    {{ college.students.length }} {{ college.students.length === 1 ? 'reserva confirmada' : 'reservas confirmadas' }}
                  </span>
                </span>
                <ChevronDown :size="20" class="shrink-0 text-identity group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul class="mx-4 divide-y divide-line border-t border-line pb-2 sm:mx-6">
                <li v-for="item in college.students" :key="item.id">
                  <button type="button"
                    class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-control px-2 py-2
                      text-left hover:bg-hover focus-visible:bg-hover focus-visible:outline-offset-[-2px] sm:px-3"
                    aria-haspopup="dialog" @click="openStudent(item.id, $event)">
                    <UserRound :size="18" class="shrink-0 text-identity" aria-hidden="true" />
                    <span class="min-w-0 flex-1 wrap-anywhere">
                      <strong class="block text-body font-medium">{{ item.studentName || 'Nome indisponível' }}</strong>
                      <span class="block text-helper text-muted">{{ item.boardingPoint }}</span>
                    </span>
                    <ChevronRight :size="16" class="shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </details>
          </li>
        </ul>
        <p v-else role="status" class="px-4 py-6 text-center text-body text-muted sm:px-6">
          {{ date ? 'Nenhuma reserva confirmada para esta data.' : 'Selecione a data da viagem.' }}
        </p>
      </BaseCard>
    </section>

    <DriverRouteOrganization :date="date" :reference="reference" />

    <BaseModal :model-value="Boolean(student)" title="Dados do aluno"
      :focus-fallback="() => pageHeading" @update:model-value="closeStudent">
      <dl v-if="student" class="space-y-3 wrap-anywhere">
        <div><dt class="text-helper text-muted">Nome</dt><dd>{{ student.studentName || 'Nome indisponível' }}</dd></div>
        <div><dt class="text-helper text-muted">Faculdade</dt><dd>{{ student.college }}</dd></div>
        <div><dt class="text-helper text-muted">Telefone</dt><dd>{{ student.studentPhone || 'Não informado' }}</dd></div>
        <div><dt class="text-helper text-muted">Ponto de embarque</dt><dd>{{ student.boardingPoint }}</dd></div>
      </dl>
      <template #footer>
        <BaseButton aria-haspopup="dialog" @click="openWarning">Solicitar advertência</BaseButton>
      </template>
    </BaseModal>

    <BaseModal :model-value="Boolean(warningTarget)" title="Solicitar advertência"
      :focus-fallback="() => pageHeading" @update:model-value="closeWarning">
      <form v-if="warningTarget" id="driver-warning-form" class="space-y-4" novalidate @submit.prevent="submitWarning">
        <dl class="space-y-2 wrap-anywhere">
          <div><dt class="text-helper text-muted">Aluno</dt><dd>{{ warningTarget.studentName || 'Nome indisponível' }}</dd></div>
          <div>
            <dt class="text-helper text-muted">Data da viagem</dt>
            <dd><time :datetime="date">{{ formatCivilDate(date) }}</time></dd>
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
