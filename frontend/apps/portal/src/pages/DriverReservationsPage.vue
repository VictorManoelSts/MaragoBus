<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseCard, BaseInput, BaseSelect } from '@maragobus/shared'
import { useReservationsStore } from '../stores/reservations'
import { getTransportDate } from '../utils/reservation-availability'

const store = useReservationsStore()
const date = ref(getTransportDate(new Date()))
const search = ref('')
const all = 0
const college = ref<string | number>(all)
const boardingPoint = ref<string | number>(all)
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const confirmed = computed(() => store.listDriverReservations(date.value))

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
    <h1 class="text-page">Reservas confirmadas</h1>

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
        </BaseCard>
      </li>
    </ul>
  </div>
</template>
