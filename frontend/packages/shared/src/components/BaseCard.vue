<template>
  <div class="mb-card">
    <div v-if="$slots.header" class="mb-card__header"><slot name="header" /></div>
    <div class="mb-card__body"><slot /></div>
    <div v-if="$slots.footer" class="mb-card__footer"><slot name="footer" /></div>
  </div>
</template>
