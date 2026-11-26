<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { BaseButton, BaseCard, BaseInput, BrandLogo } from '@maragobus/shared'
import prefeituraLogo from '../../../../logo-maragogi.png'
import { cpfDigits, cpfError, formatCpf } from '../utils/cpf'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@maragobus/shared/auth/session'
import { mockAuthAvailable } from '@maragobus/shared/auth/service'
import { AuthError } from '@maragobus/shared/auth/contracts'
import { authNavigation } from '@maragobus/shared/auth/navigation'

const session = useSessionStore()
const router = useRouter()
const submitting = ref(false)
const authMessage = ref('')
const authFeedback = ref<HTMLElement | null>(null)

const cpf = ref('')
const password = ref('')
const showPassword = ref(false)
const cpfTouched = ref(false)
const passwordTouched = ref(false)
const cpfMessage = computed(() => cpfTouched.value ? cpfError(cpf.value) : '')
const passwordMessage = computed(() => passwordTouched.value && !password.value ? 'Informe sua senha.' : '')

function updateCpf(input: HTMLInputElement, value = input.value, position = input.selectionStart ?? value.length) {
  const digitsBeforeCaret = cpfDigits(value.slice(0, position)).length
  cpf.value = cpfDigits(value)
  const formatted = formatCpf(cpf.value)
  input.value = formatted
  let caret = 0
  let count = 0
  while (caret < formatted.length && count < digitsBeforeCaret) {
    if (/\d/.test(formatted[caret]!)) count++
    caret++
  }
  void nextTick(() => input.setSelectionRange(caret, caret))
}

function beforeCpfInput(event: Event) {
  const inputEvent = event as InputEvent
  const input = event.target as HTMLInputElement
  const start = input.selectionStart ?? 0
  if (start !== input.selectionEnd) return
  const backward = inputEvent.inputType === 'deleteContentBackward'
  const forward = inputEvent.inputType === 'deleteContentForward'
  const adjacent = backward ? start - 1 : start
  if ((!backward && !forward) || !/[.-]/.test(input.value[adjacent] ?? '')) return
  event.preventDefault()
  const from = backward ? Math.max(0, start - 2) : start
  const to = backward ? start : start + 2
  updateCpf(input, input.value.slice(0, from) + input.value.slice(to), from)
}

async function submit(event: Event) {
  if (submitting.value) return
  submitting.value = true
  cpfTouched.value = true
  passwordTouched.value = true
  await nextTick()
  const form = event.target as HTMLFormElement
  const invalid = form.querySelector<HTMLInputElement>('[aria-invalid="true"]')
  if (invalid) {
    submitting.value = false
    invalid.focus()
    return
  }
  if (!mockAuthAvailable) {
    submitting.value = false
    return
  }
  authMessage.value = ''
  try {
    const user = await session.login({ cpf: cpf.value, password: password.value })
    if (user) {
      password.value = ''
      await authNavigation.afterLogin(user.role, router)
    }
  } catch (error) {
    authMessage.value = error instanceof AuthError ? error.message : 'Não foi possível entrar. Tente novamente.'
    await nextTick()
    authFeedback.value?.focus()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main id="portal-content" tabindex="-1" class="login-page flex min-h-dvh min-w-0 flex-col bg-app px-4 py-8 text-content" aria-labelledby="login-title">
    <BaseCard class="m-auto w-full max-w-[440px]">
      <header class="mb-7 text-center">
        <div class="mb-7 grid grid-cols-2 items-center gap-6">
          <img :src="prefeituraLogo" alt="Prefeitura de Maragogi" class="h-auto w-full min-w-0" />
          <BrandLogo class="w-full min-w-0" />
        </div>
        <h1 id="login-title" class="text-page">Bem-vindo</h1>
        <p class="mt-2 text-body text-muted">Acesse sua conta no MaragoBus.</p>
      </header>

      <form class="grid gap-5" aria-labelledby="login-title" :aria-busy="submitting" novalidate @submit.prevent="submit">
        <BaseInput
          id="login-cpf"
          :model-value="formatCpf(cpf)"
          :error="cpfMessage"
          required
          @input="updateCpf($event.target as HTMLInputElement)"
          @beforeinput="beforeCpfInput"
          @blur="cpfTouched = true"
          label="CPF"
          placeholder="Digite seu CPF"
          name="username"
          inputmode="numeric"
          autocomplete="username"
          :spellcheck="false"
          autocapitalize="none"
        />
        <div>
          <BaseInput
            id="login-password"
            v-model="password"
            :error="passwordMessage"
            required
            @blur="passwordTouched = true"
            label="Senha"
            placeholder="Digite sua senha"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
          />
          <BaseButton
            class="mt-1"
            variant="ghost"
            size="sm"
            aria-controls="login-password"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >{{ showPassword ? 'Ocultar senha' : 'Mostrar senha' }}</BaseButton>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2 text-helper">
          <button type="button" disabled aria-describedby="recovery-unavailable" class="min-h-11 cursor-not-allowed text-muted">
            Esqueci minha senha
          </button>
          <span id="recovery-unavailable" class="text-muted">Em breve</span>
        </div>
        <p v-if="authMessage" ref="authFeedback" tabindex="-1" role="alert" class="text-helper text-content">{{ authMessage }}</p>
        <p v-if="!mockAuthAvailable" role="status" class="text-helper text-muted">Autenticação indisponível neste ambiente.</p>
        <BaseButton type="submit" class="w-full" :loading="submitting" :disabled="!mockAuthAvailable">Entrar</BaseButton>
      </form>
    </BaseCard>
  </main>
</template>
