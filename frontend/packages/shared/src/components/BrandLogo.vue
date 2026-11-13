<script setup lang="ts">
import horizontal from '../assets/branding/logo-horizontal.svg?url'
import withSubtitle from '../assets/branding/logo-com-subititulo.svg?url'
import iconBlue from '../assets/branding/icone-azul.svg?url'
import iconDark from '../assets/branding/icone-escuro.svg?url'
import type { BrandVariant } from '../types/design-system'

const props = withDefaults(defineProps<{ variant?: BrandVariant; alt?: string }>(), {
  variant: 'horizontal',
  alt: 'MaragoBus',
})
const sources: Record<BrandVariant, string> = {
  horizontal,
  'with-subtitle': withSubtitle,
  'icon-blue': iconBlue,
  'icon-dark': iconDark,
}
</script>

<template>
  <img :src="sources[props.variant]" :alt="alt" class="mb-brand-logo" :class="'mb-brand-logo--' + variant" />
</template>
