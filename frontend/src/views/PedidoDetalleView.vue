<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const route = useRoute()
const toast = useToast()

const loading = ref(true)
const pedido = ref(null)

const numero = computed(() => {
  if (!pedido.value) return ''
  return pedido.value.numero_pedido || pedido.value.id
})

const fecha = computed(() => {
  if (!pedido.value) return null
  return pedido.value.created_at || pedido.value.fecha_creacion
})

const total = computed(() => {
  if (!pedido.value) return 0
  return pedido.value.total ?? pedido.value.total_estimado ?? 0
})

const estado = computed(() => pedido.value?.estado || 'nuevo')

const estadoLabel = computed(() => {
  const labels = {
    nuevo: 'Nuevo',
    en_cotizacion: 'En Cotización',
    aprobado: 'Aprobado',
    en_produccion: 'En Producción',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  }
  return labels[estado.value] || estado.value
})

const badgeClass = computed(() => {
  const classes = {
    nuevo: 'badge-warning',
    en_cotizacion: 'badge-info',
    aprobado: 'badge-primary',
    en_produccion: 'badge-primary',
    entregado: 'badge-success',
    cancelado: 'badge-error',
  }
  return classes[estado.value] || 'badge-secondary'
})

const steps = computed(() => {
  const e = estado.value
  const i = ['nuevo', 'pendiente', 'borrador'].includes(e)
    ? 0
    : [
          'en_cotizacion',
          'confirmado',
          'aprobado',
          'en_produccion',
          'listo',
        ].includes(e)
      ? 1
      : e === 'entregado'
        ? 2
        : 0
  return [i >= 0, i >= 1, i >= 2]
})

const formatPrice = p =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(p || 0)
const formatDate = d => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(async () => {
  const id = route.params.id
  try {
    loading.value = true
    const response = await api.get(`/pedidos/xano/${id}`)
    pedido.value = response.data.pedido
  } catch (error) {
    try {
      const alt = await api.get(`/pedidos/cotizaciones/xano/${id}`)
      pedido.value = alt.data.pedido
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo cargar el pedido'
      toast.error(msg)
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container-custom section-padding">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">
Detalle de Pedido
</h1>
      <p class="text-gray-600">
Revisa la información de tu pedido
</p>
    </div>

    <div v-if="loading"
class="card">
      <div class="card-body">
Cargando...
</div>
    </div>

    <div v-else-if="!pedido"
class="card">
      <div class="card-body">
Pedido no encontrado
</div>
    </div>

    <div v-else
class="space-y-6">
      <div class="card">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-600">
Número
</div>
              <div class="text-lg font-semibold">
#{{ numero }}
</div>
            </div>
            <div>
              <span class="badge"
:class="badgeClass">{{ estadoLabel }}</span>
            </div>
          </div>
          <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm text-gray-700"
          >
            <div>
              <span class="font-medium">Fecha:</span>
              {{ formatDate(fecha) }}
            </div>
            <div>
              <span class="font-medium">Total estimado:</span>
              ${{ formatPrice(total) }}
            </div>
            <div>
              <span class="font-medium">Items:</span>
              {{ (pedido.detalles || []).length }}
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">
Productos
</h3>
        </div>
        <div class="card-body">
          <div
            v-if="(pedido.detalles || []).length === 0"
            class="text-sm text-gray-600"
          >
            Sin productos.
          </div>
          <div v-else
class="space-y-3">
            <div
              v-for="d in pedido.detalles"
              :key="d.id || d.descripcion"
              class="flex items-start justify-between"
            >
              <div class="max-w-[70%]">
                <div class="text-sm font-medium text-gray-900">
                  {{ d.descripcion }}
                </div>
                <div v-if="d.medidas"
class="text-xs text-gray-600">
                  Medidas: {{ d.medidas }}
                </div>
                <div v-if="d.material"
class="text-xs text-gray-600">
                  Material: {{ d.material }}
                </div>
              </div>
              <div class="text-sm text-gray-800">
x{{ d.cantidad || 1 }}
</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="pedido.estado !== 'cancelado'"
class="card">
        <div class="card-body">
          <div class="text-sm text-gray-600 mb-2">
Proceso del pedido
</div>
          <div class="flex items-center space-x-2">
            <div v-for="(step, idx) in steps"
:key="idx" class="flex-1">
              <div
                class="h-2 w-full rounded-full"
                :class="[step ? 'bg-primary-600' : 'bg-gray-200']"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
