<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId } from 'vue'
import { BaseAlert, BaseBadge, BaseButton, BaseCard, BaseInput, BaseModal, BaseSelect } from '@maragobus/shared'
import { CollegeValidationError } from '../services/colleges'
import type { College, CollegeFieldErrors } from '../services/colleges'
import { useCollegesStore } from '../stores/colleges'

type Dialog = { kind: 'create' } | { kind: 'edit' | 'status'; college: College }

const store = useCollegesStore()
const search = ref('')
const status = ref('all')
const currentDialog = ref<Dialog>()
const name = ref('')
const acronym = ref('')
const nameId = useId()
const acronymId = useId()
const searchId = useId()
const retryId = useId()
const fieldErrors = ref<CollegeFieldErrors>({})
const operationError = ref('')
const feedback = ref('')
const saving = ref(false)

const statusOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'inactive', label: 'Inativas' },
]
function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
}
const visibleColleges = computed(() => {
  const query = normalizeSearch(search.value.trim())
  return store.colleges.filter(college =>
    (status.value === 'all' || college.active === (status.value === 'active')) &&
    (normalizeSearch(college.name).includes(query) || normalizeSearch(college.acronym).includes(query)),
  ).sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
})

const confirming = computed(() => currentDialog.value?.kind === 'status')
const deactivating = computed(() => currentDialog.value?.kind === 'status' && currentDialog.value.college.active)
const dialogTitle = computed(() => {
  if (confirming.value) return deactivating.value ? 'Desativar faculdade' : 'Reativar faculdade'
  return currentDialog.value?.kind === 'edit' ? 'Editar faculdade' : 'Nova faculdade'
})

function openDialog(dialog: Dialog, event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  name.value = dialog.kind === 'edit' ? dialog.college.name : ''
  acronym.value = dialog.kind === 'edit' ? dialog.college.acronym : ''
  fieldErrors.value = {}
  operationError.value = ''
  feedback.value = ''
  currentDialog.value = dialog
}

function closeDialog() {
  if (!saving.value) currentDialog.value = undefined
}

async function submit() {
  const dialog = currentDialog.value
  if (!dialog || saving.value) return
  saving.value = true
  fieldErrors.value = {}
  operationError.value = ''
  try {
    if (dialog.kind === 'status') {
      await store.setActive(dialog.college.id, !dialog.college.active)
      feedback.value = dialog.college.active ? 'Faculdade desativada.' : 'Faculdade reativada.'
    } else {
      await store.save({ name: name.value, acronym: acronym.value }, dialog.kind === 'edit' ? dialog.college.id : undefined)
      feedback.value = dialog.kind === 'edit' ? 'Faculdade atualizada.' : 'Faculdade cadastrada.'
    }
    currentDialog.value = undefined
  } catch (error) {
    if (error instanceof CollegeValidationError) {
      fieldErrors.value = error.fields
    } else {
      operationError.value = 'Não foi possível salvar a alteração. Tente novamente.'
    }
  } finally {
    saving.value = false
  }
  if (fieldErrors.value.name || fieldErrors.value.acronym) {
    await nextTick()
    document.getElementById(fieldErrors.value.name ? nameId : acronymId)?.focus()
  }
}

function searchControl() {
  return document.getElementById(searchId)
}

async function reloadFromAction(simulateError = false) {
  await store.load(simulateError)
  await nextTick()
  if (store.listState === 'error') document.getElementById(retryId)?.focus()
  else searchControl()?.focus()
}

function resetFilters() {
  search.value = ''
  status.value = 'all'
  searchControl()?.focus()
}

onMounted(() => { void store.load() })
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-prose text-body text-muted">
        Dados fictícios para demonstração. As alterações ficam disponíveis até recarregar a aplicação.
      </p>
      <BaseButton :disabled="store.listState !== 'ready'" @click="openDialog({ kind: 'create' }, $event)">
        Nova faculdade
      </BaseButton>
    </div>

    <BaseAlert v-if="feedback" variant="success">{{ feedback }}</BaseAlert>

    <BaseCard>
      <div class="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <BaseInput :id="searchId" v-model="search" type="search" label="Pesquisar por nome ou sigla" />
        <BaseSelect v-model="status" label="Situação" :options="statusOptions" />
      </div>
    </BaseCard>

    <p v-if="store.listState === 'loading'" class="text-body text-muted" role="status">Carregando faculdades…</p>
    <div v-else-if="store.listState === 'error'" class="space-y-4">
      <BaseAlert variant="danger">
        {{ store.simulatedError ? 'Falha simulada de carregamento.' : 'Não foi possível carregar as faculdades.' }}
      </BaseAlert>
      <BaseButton :id="retryId" variant="secondary" @click="reloadFromAction()">Tentar novamente</BaseButton>
    </div>
    <BaseCard v-else-if="!store.colleges.length">
      <p role="status">Nenhuma faculdade cadastrada.</p>
    </BaseCard>
    <BaseCard v-else-if="!visibleColleges.length">
      <p role="status">Nenhuma faculdade corresponde à pesquisa e aos filtros.</p>
      <BaseButton class="mt-3" variant="secondary" @click="resetFilters">Limpar filtros</BaseButton>
    </BaseCard>
    <ul v-else aria-label="Faculdades cadastradas" class="grid gap-4 lg:grid-cols-2">
      <li v-for="college in visibleColleges" :key="college.id" class="min-w-0">
        <BaseCard class="h-full">
          <h2 class="break-words text-lg font-semibold">{{ college.name }}</h2>
          <dl class="mt-3 flex flex-wrap gap-x-8 gap-y-3">
            <div class="min-w-0">
              <dt class="text-sm text-muted">Sigla</dt>
              <dd class="break-words">{{ college.acronym || 'Não informada' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Situação</dt>
              <dd><BaseBadge :variant="college.active ? 'success' : 'neutral'">{{ college.active ? 'Ativa' : 'Inativa' }}</BaseBadge></dd>
            </div>
          </dl>
          <div class="mt-4 flex flex-wrap gap-2">
            <BaseButton variant="secondary" size="sm" :aria-label="`Editar ${college.name}`"
              @click="openDialog({ kind: 'edit', college }, $event)">Editar</BaseButton>
            <BaseButton variant="secondary" size="sm" :aria-label="`${college.active ? 'Desativar' : 'Reativar'} ${college.name}`"
              @click="openDialog({ kind: 'status', college }, $event)">
              {{ college.active ? 'Desativar' : 'Reativar' }}
            </BaseButton>
          </div>
        </BaseCard>
      </li>
    </ul>

    <BaseButton v-if="store.canSimulateError && store.listState === 'ready'" variant="ghost" size="sm" @click="reloadFromAction(true)">
      Simular erro de carregamento
    </BaseButton>

    <BaseModal :model-value="!!currentDialog" :title="dialogTitle"
      :focus-fallback="searchControl"
      @update:model-value="closeDialog">
      <form v-if="currentDialog" class="space-y-4" novalidate @submit.prevent="submit">
        <template v-if="currentDialog.kind === 'status'">
          <p class="break-words">
            {{ deactivating ? 'Desativar' : 'Reativar' }} <strong>{{ currentDialog.college.name }}</strong>?
            O registro e os vínculos existentes serão preservados.
          </p>
        </template>
        <template v-else>
          <BaseInput :id="nameId" v-model="name" label="Nome" required :error="fieldErrors.name" :disabled="saving" />
          <BaseInput :id="acronymId" v-model="acronym" label="Sigla (opcional)" :error="fieldErrors.acronym" :disabled="saving" />
        </template>
        <BaseAlert v-if="operationError" variant="danger">{{ operationError }}</BaseAlert>
        <div class="flex flex-wrap justify-end gap-2">
          <BaseButton variant="secondary" :disabled="saving" @click="closeDialog">Cancelar</BaseButton>
          <BaseButton type="submit" :loading="saving">
            {{ confirming ? (deactivating ? 'Confirmar desativação' : 'Confirmar reativação')
              : (currentDialog.kind === 'edit' ? 'Salvar alterações' : 'Salvar faculdade') }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
