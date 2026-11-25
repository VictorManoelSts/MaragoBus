import type { Component } from 'vue'

export type ControlSize = 'sm' | 'md' | 'lg'
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type FeedbackVariant = 'success' | 'warning' | 'danger' | 'info'
export type BadgeVariant = 'neutral' | FeedbackVariant
export type BrandVariant = 'horizontal' | 'with-subtitle' | 'icon-blue' | 'icon-dark'
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date'
  | 'date' | 'time' | 'datetime-local' | 'month' | 'week'
export type SelectValue = string | number
export interface SelectOption {
  value: SelectValue
  label: string
  disabled?: boolean
}
export type ButtonIcon = Component
