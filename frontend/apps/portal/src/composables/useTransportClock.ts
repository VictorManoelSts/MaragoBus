import { onMounted, onUnmounted, ref } from 'vue'

export function useTransportClock() {
  const reference = ref(new Date())
  let timer: ReturnType<typeof setTimeout> | undefined

  function refresh() {
    clearTimeout(timer)
    reference.value = new Date()
    if (document.visibilityState === 'visible') {
      timer = setTimeout(refresh, 60_000 - reference.value.getTime() % 60_000)
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', refresh)
    refresh()
  })
  onUnmounted(() => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', refresh)
  })

  return { reference, refresh }
}
