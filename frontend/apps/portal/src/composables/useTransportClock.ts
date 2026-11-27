import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStudentDemoStore } from '../stores/student-demo'

export function useTransportClock() {
  const demo = useStudentDemoStore()
  const wallClock = ref(new Date())
  const reference = computed(() => demo.now(wallClock.value))
  let timer: ReturnType<typeof setTimeout> | undefined

  function refresh() {
    clearTimeout(timer)
    wallClock.value = new Date()
    if (document.visibilityState === 'visible') {
      timer = setTimeout(refresh, 60_000 - reference.value.getTime() % 60_000)
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', refresh)
    refresh()
  })
  watch(() => demo.scenario, refresh)
  onUnmounted(() => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', refresh)
  })

  return { reference, refresh }
}
