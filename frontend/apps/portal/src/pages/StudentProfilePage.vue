<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseAlert, BaseButton, BaseCard, BaseSelect, MockSessionControls } from '@maragobus/shared'
import { mockAuthAvailable } from '@maragobus/shared/auth/service'
import { useStudentProfileStore } from '../stores/student-profile'

const profile = useStudentProfileStore()
const selectedPointId = ref(profile.reservationContext.defaultBoardingPointId ?? '')
const feedback = ref<'saved' | 'invalid' | null>(null)
const options = computed(() => profile.reservationContext.boardingPoints.map(point => ({
  value: point.id, label: point.name,
})))
const fields = computed(() => [
  { label: 'Nome', value: profile.student?.name },
  { label: 'CPF', value: null },
  { label: 'E-mail', value: null },
  { label: 'Faculdade', value: profile.reservationContext.college },
  { label: 'Curso', value: null },
  { label: 'Ponto de embarque padrão', value: options.value.find(option =>
    option.value === profile.reservationContext.defaultBoardingPointId)?.label },
])

watch([() => profile.student?.id, () => profile.reservationContext.defaultBoardingPointId], ([id, pointId], [previousId]) => {
  selectedPointId.value = pointId ?? ''
  if (id !== previousId) feedback.value = null
})

function save() {
  feedback.value = profile.saveDefaultPoint(selectedPointId.value) ? 'saved' : 'invalid'
}
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-3">
      <h1 class="text-page">Meu perfil</h1>
      <p class="max-w-prose text-body text-muted">Consulte seus dados e escolha o ponto de embarque padrão.</p>
    </div>

    <BaseCard>
      <template #header><h2 class="text-section">Dados do aluno</h2></template>
      <dl class="grid min-w-0 gap-5 sm:grid-cols-2">
        <div v-for="field in fields" :key="field.label" class="min-w-0 space-y-1">
          <dt class="text-helper text-muted">{{ field.label }}</dt>
          <dd class="text-body">{{ field.value ?? 'Não informado' }}</dd>
        </div>
      </dl>
    </BaseCard>

    <BaseCard>
      <template #header><h2 class="text-section">Preferência de embarque</h2></template>
      <form class="space-y-4" @submit.prevent="save">
        <BaseSelect
          v-model="selectedPointId" label="Alterar ponto padrão" :options="options"
          placeholder="Selecione um ponto de embarque"
          help="A preferência vale nesta sessão demonstrativa e será sugerida nas novas reservas."
          :error="feedback === 'invalid' ? 'Selecione um ponto de embarque válido.' : undefined"
          @update:model-value="feedback = null"
        />
        <BaseButton type="submit" :disabled="!profile.student" class="w-full sm:w-auto">Salvar ponto padrão</BaseButton>
        <BaseAlert v-if="feedback === 'saved'" variant="success">Ponto de embarque padrão atualizado.</BaseAlert>
      </form>
    </BaseCard>

    <MockSessionControls v-if="mockAuthAvailable" />
  </div>
</template>
