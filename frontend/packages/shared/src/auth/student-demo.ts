import { ref } from 'vue'

const preferenceKey = 'maragobus:student-demo'
const sessionKey = 'maragobus:student-demo-session'
const preference = ref<string | null>()
const signedIn = ref<boolean>()

export function studentDemoSelection() {
  if (import.meta.env.DEV && !import.meta.env.PROD && window.location.hostname === 'localhost') {
    return preference.value === undefined ? sessionStorage.getItem(preferenceKey) : preference.value
  }
  return null
}

export function selectStudentDemo(selection: string | null) {
  if (import.meta.env.DEV && !import.meta.env.PROD && window.location.hostname === 'localhost') {
    if (selection === null) {
      clearStudentDemoSession()
      sessionStorage.removeItem(preferenceKey)
    } else {
      sessionStorage.setItem(preferenceKey, selection)
    }
    preference.value = selection
  }
}

export function hasStudentDemoSession() {
  return Boolean(studentDemoSelection() && (signedIn.value ?? sessionStorage.getItem(sessionKey) === '1'))
}

export function setStudentDemoSession() {
  sessionStorage.setItem(sessionKey, '1')
  signedIn.value = true
}

export function clearStudentDemoSession() {
  sessionStorage.removeItem(sessionKey)
  signedIn.value = false
}
