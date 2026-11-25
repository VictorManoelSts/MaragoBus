import { computed, ref, watch } from 'vue'
import { useReservationsStore } from '../stores/reservations'
import { useTransportClock } from './useTransportClock'

export function useReservationReceipt() {
  const store = useReservationsStore()
  const { reference, refresh } = useTransportClock()
  const selectedId = ref<string>()
  const receiptUnavailable = ref(false)
  const receipt = computed(() => selectedId.value ? store.getReceiptReservation(selectedId.value, reference.value) : undefined)

  function closeReceipt() {
    selectedId.value = undefined
  }

  function openReceipt(id: string) {
    refresh()
    const available = store.getReceiptReservation(id, reference.value)
    receiptUnavailable.value = !available
    selectedId.value = available?.id
  }

  watch(receipt, value => {
    if (!value && selectedId.value) {
      closeReceipt()
      receiptUnavailable.value = true
    }
  })
  watch(() => store.studentId, () => {
    closeReceipt()
    receiptUnavailable.value = false
  }, { flush: 'sync' })

  return { reference, refresh, receipt, receiptUnavailable, openReceipt, closeReceipt }
}
