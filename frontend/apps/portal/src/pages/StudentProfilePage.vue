<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton, BaseCard, BaseInput, BaseSelect } from '@maragobus/shared'
import { authNavigation } from '@maragobus/shared/auth/navigation'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { useStudentProfileStore } from '../stores/student-profile'

const profile = useStudentProfileStore()
const router = useRouter()
const session = useSessionStore()
const draft = reactive({ ...profile.preferences })
const form = ref<HTMLFormElement | null>(null)
const showErrors = ref(false)
const feedback = ref('')
const errors = computed(() => showErrors.value ? profile.validatePreferences(draft) : undefined)
const dirty = computed(() => draft.email !== profile.preferences.email
  || draft.phone !== profile.preferences.phone
  || draft.boardingPointId !== profile.preferences.boardingPointId)

const options = computed(() => profile.reservationContext.boardingPoints.map(point => ({
  value: point.id, label: point.name,
})))
const academicFields = computed(() => [
  { label: 'Faculdade', value: profile.reservationContext.college },
  { label: 'Curso', value: profile.registration?.course },
  { label: 'Modalidade de ensino', value: profile.registration?.educationModality },
])

function resetDraft() {
  Object.assign(draft, profile.preferences)
  showErrors.value = false
  feedback.value = ''
}

watch([() => profile.student?.id, () => profile.preferences], resetDraft)

async function reportFeedback(message: string) {
  const active = document.activeElement
  await nextTick()
  feedback.value = message
  if (active instanceof HTMLButtonElement && active.disabled && form.value?.contains(active)
    && (document.activeElement === active || document.activeElement === document.body)) {
    form.value.querySelector<HTMLInputElement>('input[type="email"]')?.focus()
  }
}

async function save() {
  if (!dirty.value) return
  if (!profile.savePreferences(draft)) {
    showErrors.value = true
    await nextTick()
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  await reportFeedback('Alterações salvas.')
}

function discard() {
  resetDraft()
  void reportFeedback('Alterações descartadas.')
}

async function logout() {
  session.logout()
  await authNavigation.afterLogout(router)
}
</script>

<template>
  <div class="min-w-0 max-w-3xl space-y-5 wrap-anywhere">
    <h1 class="text-page">Meu perfil</h1>

    <form
      ref="form"
      class="space-y-5"
      novalidate
      @submit.prevent="save"
      @input="feedback = ''"
      @change="feedback = ''"
    >
      <BaseCard>
        <template #header><h2 class="text-section">Dados pessoais</h2></template>
        <dl class="grid min-w-0 gap-4 sm:grid-cols-2">
          <div class="min-w-0">
            <dt class="text-helper text-muted">Nome completo</dt>
            <dd class="text-body wrap-anywhere">{{ profile.student?.name ?? 'Não informado' }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-helper text-muted">CPF</dt>
            <dd class="text-body wrap-anywhere">{{ profile.registration?.cpf ?? 'Não informado' }}</dd>
          </div>
        </dl>
        <div class="mt-4 space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput v-model="draft.email" label="E-mail" type="email" autocomplete="email" :error="errors?.email" />
            <BaseInput v-model="draft.phone" label="Telefone" type="tel" autocomplete="tel" :error="errors?.phone" />
          </div>
          <BaseSelect
            v-model="draft.boardingPointId"
            label="Ponto de embarque padrão"
            :options="options"
            placeholder="Selecione um ponto de embarque"
            help="Este ponto será sugerido nas novas reservas."
            :error="errors?.boardingPointId"
          />
          <div class="flex flex-col gap-2 sm:flex-row">
            <BaseButton class="w-full sm:w-auto" type="submit" :disabled="!profile.student || !dirty">Salvar alterações</BaseButton>
            <BaseButton class="w-full sm:w-auto" type="button" variant="outline" :disabled="!dirty" @click="discard">Descartar alterações</BaseButton>
          </div>
          <p role="status" aria-live="polite" aria-atomic="true" class="text-helper text-muted empty:m-0">{{ feedback }}</p>
        </div>
      </BaseCard>

      <BaseCard>
        <template #header><h2 class="text-section">Dados acadêmicos</h2></template>
        <dl class="grid min-w-0 gap-4 sm:grid-cols-3">
          <div v-for="field in academicFields" :key="field.label" class="min-w-0">
            <dt class="text-helper text-muted">{{ field.label }}</dt>
            <dd class="text-body wrap-break-word">{{ field.value ?? 'Não informado' }}</dd>
          </div>
        </dl>
      </BaseCard>
    </form>

    <BaseCard>
      <template #header><h2 class="text-section">Segurança</h2></template>
      <p class="text-helper text-muted">
        A alteração de senha estará disponível após a integração com a autenticação real.
      </p>
    </BaseCard>
    <div class="flex justify-end border-t border-line pt-5">
      <BaseButton variant="outline" class="w-full sm:w-auto" @click="logout">Sair</BaseButton>
    </div>
  </div>
</template>
