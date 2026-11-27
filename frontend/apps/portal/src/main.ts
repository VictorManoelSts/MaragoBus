import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles.css'
import { mountAfterNavigation, syncSessionAccess } from '@maragobus/shared/auth/initialization'
import { applyDriverDemoPreference } from '@maragobus/shared/auth/driver-demo'
import { startTheme } from '@maragobus/shared/theme'

if (import.meta.env.DEV && !import.meta.env.PROD) applyDriverDemoPreference()
const pinia = createPinia()
const stopSessionSync = syncSessionAccess(pinia, router)
const stopTheme = startTheme()
if (import.meta.hot) {
  import.meta.hot.dispose(stopSessionSync)
  import.meta.hot.dispose(stopTheme)
}
const app = createApp(App).use(pinia).use(router)
app.onUnmount(stopTheme)
void mountAfterNavigation(app, router)
