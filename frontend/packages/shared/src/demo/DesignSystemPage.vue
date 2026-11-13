<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, Search } from '@lucide/vue'
import {
  BaseAlert, BaseBadge, BaseButton, BaseCard, BaseInput, BaseModal, BaseSelect, BrandLogo,
} from '../index'
import type { BrandVariant, ButtonVariant, FeedbackVariant, SelectOption } from '../index'

const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost']
const states: { variant: FeedbackVariant; label: string; description: string }[] = [
  { variant: 'success', label: 'Sucesso', description: 'A ação de demonstração foi concluída.' },
  { variant: 'warning', label: 'Aviso', description: 'Revise as informações antes de continuar.' },
  { variant: 'danger', label: 'Erro', description: 'Não foi possível concluir esta ação de exemplo.' },
  { variant: 'info', label: 'Informação', description: 'Este é um exemplo de mensagem informativa.' },
]
const brands: { variant: BrandVariant; label: string }[] = [
  { variant: 'horizontal', label: 'Logo horizontal' },
  { variant: 'with-subtitle', label: 'Logo com subtítulo' },
  { variant: 'icon-blue', label: 'Ícone azul' },
  { variant: 'icon-dark', label: 'Ícone escuro' },
]
const options: SelectOption[] = [
  { value: 'one', label: 'Primeira opção' },
  { value: 'two', label: 'Segunda opção' },
  { value: 'three', label: 'Opção indisponível', disabled: true },
]
const name = ref('')
const email = ref('')
const selection = ref('')
const submitted = ref(false)
const modalOpen = ref(false)
const modalName = ref('')
</script>

<template>
  <main id="conteudo" class="min-h-svh bg-app px-4 py-8 text-content sm:px-8 sm:py-12">
    <div class="mx-auto max-w-6xl space-y-10">
      <header class="space-y-5 border-b border-line pb-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <BrandLogo />
          <a href="/" class="text-helper font-semibold underline underline-offset-4">Voltar ao início</a>
        </div>
        <div class="space-y-3">
          <BaseBadge size="sm">Etapa 02 · Apenas desenvolvimento</BaseBadge>
          <h1 class="text-page">Design System</h1>
          <p class="max-w-2xl text-body text-muted">
            Uma base compartilhada para o Portal e o Admin. Componentes simples, acessíveis e adaptáveis.
          </p>
        </div>
        <BaseAlert title="Paleta oficial">
          A interface usa a paleta MaragoBus aprovada. Os estados funcionais preservam seus tokens, textos e ícones.
        </BaseAlert>
      </header>

      <section aria-labelledby="marcas" class="space-y-5">
        <h2 id="marcas" class="text-section">Identidade oficial</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BaseCard v-for="brand in brands" :key="brand.variant">
            <template #header><h3 class="text-label">{{ brand.label }}</h3></template>
            <div class="flex min-h-28 items-center justify-center"><BrandLogo :variant="brand.variant" /></div>
          </BaseCard>
        </div>
      </section>

      <section aria-labelledby="tipografia" class="space-y-5">
        <h2 id="tipografia" class="text-section">Tipografia e tokens</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <BaseCard>
            <div class="space-y-4">
              <p class="text-page">Título de página</p>
              <p class="text-section">Título de seção</p>
              <p class="text-subtitle">Subtítulo</p>
              <p class="text-body">Texto normal em Inter, com leitura confortável.</p>
              <p class="text-helper text-muted">Texto auxiliar com informações complementares.</p>
              <p class="text-label">Rótulo de formulário</p>
              <p class="text-validation text-danger">Validação: descreva o que precisa ser corrigido.</p>
            </div>
          </BaseCard>
          <BaseCard>
            <template #header><h3 class="text-subtitle">Fundamentos visuais</h3></template>
            <dl class="grid grid-cols-2 gap-4 text-helper">
              <dt class="text-muted">Fonte</dt><dd>Inter variável, local</dd>
              <dt class="text-muted">Espaçamento base</dt><dd>4 px</dd>
              <dt class="text-muted">Controles</dt><dd>44 / 48 / 56 px</dd>
              <dt class="text-muted">Bordas</dt><dd>1 px; erro em 2 px</dd>
              <dt class="text-muted">Raios</dt><dd>8 / 12 px</dd>
              <dt class="text-muted">Transição</dt><dd>150 ms, movimento reduzido respeitado</dd>
            </dl>
          </BaseCard>
        </div>
      </section>

      <section aria-labelledby="botoes" class="space-y-5">
        <h2 id="botoes" class="text-section">Botões</h2>
        <BaseCard>
          <div class="space-y-6">
            <div class="flex flex-wrap gap-3">
              <BaseButton v-for="variant in variants" :key="variant" :variant="variant">{{ variant }}</BaseButton>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <BaseButton size="sm">Pequeno</BaseButton>
              <BaseButton size="md">Médio</BaseButton>
              <BaseButton size="lg">Grande</BaseButton>
              <BaseButton variant="outline" :icon="Search">Pesquisar</BaseButton>
              <BaseButton variant="secondary">
                <template #icon><ArrowRight /></template>
                Continuar
              </BaseButton>
            </div>
            <div class="flex flex-wrap gap-3">
              <BaseButton loading>Processando</BaseButton>
              <BaseButton disabled>Indisponível</BaseButton>
              <BaseButton variant="outline" disabled>Contorno desabilitado</BaseButton>
            </div>
          </div>
        </BaseCard>
      </section>

      <section aria-labelledby="formularios" class="space-y-5">
        <h2 id="formularios" class="text-section">Campos e seletores</h2>
        <BaseCard>
          <form class="space-y-6" @submit.prevent="submitted = true">
            <div class="grid gap-6 md:grid-cols-2">
              <BaseInput v-model="name" label="Nome de exemplo" placeholder="Como podemos chamar você?" help="Exemplo local, sem envio de dados." autocomplete="name" />
              <BaseInput v-model="email" label="E-mail de exemplo" type="email" placeholder="nome@exemplo.com" help="Campo em estado de erro para demonstração." error="Informe um e-mail válido." autocomplete="email" />
              <BaseSelect v-model="selection" label="Opção de exemplo" :options="options" help="Use Tab e as setas do teclado." />
              <BaseSelect label="Seleção com erro" :options="options" error="Selecione uma opção para continuar." />
              <BaseInput label="Campo desabilitado" model-value="Indisponível" disabled />
              <BaseSelect label="Seletor desabilitado" :options="options" disabled />
            </div>
            <p class="text-helper text-muted" aria-live="polite">
              Valores locais: nome {{ name || 'vazio' }} · seleção {{ selection || 'vazia' }}.
            </p>
            <BaseButton type="submit" variant="secondary">Testar formulário local</BaseButton>
            <BaseAlert v-if="submitted" variant="info">Demonstração concluída. Nenhum dado foi enviado.</BaseAlert>
          </form>
        </BaseCard>
      </section>

      <section aria-labelledby="cards" class="space-y-5">
        <h2 id="cards" class="text-section">Cards e badges</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <BaseCard>
            <template #header><h3 class="text-subtitle">Card com cabeçalho e rodapé</h3></template>
            <p class="text-body text-muted">Conteúdo organizado em slots, com espaçamento e bordas consistentes.</p>
            <template #footer><BaseButton variant="outline" @click="modalOpen = true">Abrir exemplo de modal</BaseButton></template>
          </BaseCard>
          <BaseCard>
            <div class="space-y-4">
              <h3 class="text-subtitle">Estados explícitos</h3>
              <p class="text-helper text-muted">Os estados mantêm seus tokens funcionais e comunicam o significado também por texto e ícones.</p>
              <div class="flex flex-wrap gap-2">
                <BaseBadge>Neutro</BaseBadge>
                <BaseBadge v-for="state in states" :key="state.variant" :variant="state.variant">{{ state.label }}</BaseBadge>
              </div>
              <div class="flex flex-wrap gap-2">
                <BaseBadge size="sm">Pequeno</BaseBadge><BaseBadge size="md">Médio</BaseBadge>
              </div>
            </div>
          </BaseCard>
        </div>
      </section>

      <section aria-labelledby="alertas" class="space-y-5">
        <h2 id="alertas" class="text-section">Alertas</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <BaseAlert v-for="state in states" :key="state.variant" :variant="state.variant" :title="state.label">{{ state.description }}</BaseAlert>
          <BaseAlert :show-icon="false">Informação sem título e sem ícone.</BaseAlert>
        </div>
      </section>

      <section aria-labelledby="modal" class="space-y-5">
        <h2 id="modal" class="text-section">Modal e navegação por teclado</h2>
        <BaseCard>
          <div class="space-y-4">
            <p class="text-body text-muted">Abra o modal, navegue com Tab e Shift+Tab e feche com Escape. O foco retorna ao botão que abriu o diálogo.</p>
            <BaseButton @click="modalOpen = true">Abrir modal</BaseButton>
          </div>
        </BaseCard>
      </section>
      <p class="border-t border-line pt-6 text-helper text-muted">Catálogo temporário de desenvolvimento · MaragoBus</p>
    </div>

    <BaseModal v-model="modalOpen" title="Exemplo de modal">
      <div class="space-y-5">
        <p class="text-body">Este diálogo é apenas uma demonstração. O fundo fica bloqueado enquanto ele está aberto.</p>
        <BaseInput v-model="modalName" label="Campo dentro do modal" placeholder="Teste a navegação por teclado" />
      </div>
      <template #footer>
        <BaseButton variant="outline" @click="modalOpen = false">Cancelar</BaseButton>
        <BaseButton @click="modalOpen = false">Concluir exemplo</BaseButton>
      </template>
    </BaseModal>
  </main>
</template>
