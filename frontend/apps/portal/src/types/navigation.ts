import type { Component } from 'vue'

export interface PortalNavigationItem {
  name: string
  path: string
  label: string
  icon: Component
  title?: string
  description?: string
}
