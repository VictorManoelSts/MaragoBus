import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles.css'
import { mountAfterNavigation, syncSessionAccess } from '@maragobus/shared/auth/initialization'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'

if (import.meta.env.DEV && !import.meta.env.PROD) applyDriverDemoPreference()
const pinia = createPinia()
const stopSessionSync = syncSessionAccess(pinia, router)
if (import.meta.hot) import.meta.hot.dispose(stopSessionSync)
const app = createApp(App).use(pinia).use(router)
void mountAfterNavigation(app, router)
