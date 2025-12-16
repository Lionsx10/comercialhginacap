<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/services/api'
import logoUrl from '@/assets/logo-comercial-hg-compact.svg'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(true)
const cotizacion = ref(null)
const accepted = ref(false)
const estado = ref('pendiente')
const pdfBlob = ref(null)

const id = computed(() => route.params.id)

const formatPrice = p =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(p || 0))

const formatDateTime = d => {
  if (!d) return ''
  return new Date(d).toLocaleString('es-CL')
}

const cargarCotizacion = async () => {
  try {
    loading.value = true
    const r = await api.get(`/pedidos/cotizaciones/xano/${id.value}`)
    const p = r.data.pedido || {}
    cotizacion.value = {
      id: p.id,
      created_at: p.created_at,
      precio_unitario:
        p.total_estimado ?? p.detalles?.[0]?.precio_unitario ?? 0,
      color: p.detalles?.[0]?.color || '',
      material_mueble: p.detalles?.[0]?.material || '',
      medidas: p.detalles?.[0]?.medidas || '',
      comuna: p.detalles?.[0]?.comuna || '',
      cubierta: p.detalles?.[0]?.descripcion || 'Cotización',
      detalles: p.detalles || [],
    }
    estado.value = p.estado_cotizacion || 'pendiente'
    accepted.value = estado.value === 'aprobada'
  } catch (e) {
    toast.error('No se pudo cargar la cotización')
  } finally {
    loading.value = false
  }
}

const cargarJsPDF = () =>
  new Promise(resolve => {
    if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    s.onload = () => resolve(window.jspdf.jsPDF)
    document.head.appendChild(s)
  })

const generarPdfBlob = async () => {
  const JS = await cargarJsPDF()
  const doc = new JS({ unit: 'mm', format: 'a4' })
  const svgToPngDataUrl = async (url, width = 140, height = 56) => {
    try {
      const resp = await fetch(url)
      const svgText = await resp.text()
      const svgBlob = new Blob([svgText], {
        type: 'image/svg+xml;charset=utf-8',
      })
      const domUrl = URL || window.URL
      const urlObj = domUrl.createObjectURL(svgBlob)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise(resolve => {
        img.onload = () => resolve(null)
        img.src = urlObj
      })
      const canvas = document.createElement('canvas')
      canvas.width = 140
      canvas.height = 56
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 140, 56)
      const dataUrl = canvas.toDataURL('image/png')
      domUrl.revokeObjectURL(urlObj)
      return dataUrl
    } catch (_) {
      return null
    }
  }
  const q = cotizacion.value
  const imgData = await svgToPngDataUrl(logoUrl)
  if (imgData) doc.addImage(imgData, 'PNG', 15, 15, 35, 14)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Comercial HG', 55, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Muebles a medida • Cotización', 55, 27)
  doc.text(`#${q.id}`, 180, 27, { align: 'right' })
  doc.setDrawColor(220)
  doc.line(15, 33, 195, 33)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen de Cotización', 15, 43)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const fecha = q.created_at ? formatDateTime(q.created_at) : ''
  doc.text(`Emitida: ${fecha}`, 15, 48)
  const rows = [
    ['Cubierta', q.cubierta || ''],
    ['Material', q.material_mueble || ''],
    ['Color', q.color || ''],
    ['Medidas', q.medidas || ''],
    ['Comuna', q.comuna || '—'],
    ['Total', formatPrice(q.precio_unitario)],
  ]
  let y = 58
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Campo', 20, y)
  doc.text('Detalle', 80, y)
  doc.setDrawColor(220)
  doc.line(15, y + 2, 195, y + 2)
  doc.setFont('helvetica', 'normal')
  y += 8
  rows.forEach(rw => {
    doc.text(String(rw[0]), 20, y)
    doc.text(String(rw[1]), 80, y)
    y += 8
    doc.setDrawColor(240)
    doc.line(15, y, 195, y)
    y += 2
  })
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Comercial HG — contacto@comercialhg.com', 15, 285)
  doc.text('www.comercialhg.com', 195, 285, { align: 'right' })
  pdfBlob.value = doc.output('blob')
  return pdfBlob.value
}

const aceptar = async () => {
  try {
    const blob = await generarPdfBlob()
    const fd = new FormData()
    fd.append('pdf', blob, `cotizacion-${cotizacion.value.id}.pdf`)
    await api.post(
      `/pedidos/cotizaciones/xano/${cotizacion.value.id}/aceptar`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    accepted.value = true
    estado.value = 'aprobada'
    toast.success('Cotización aceptada')
  } catch (_) {
    toast.error('No se pudo aceptar la cotización')
  }
}

const rechazar = async () => {
  try {
    await api.patch(
      `/pedidos/cotizaciones/xano/${cotizacion.value.id}/rechazar`,
    )
    toast.success('Cotización rechazada')
    estado.value = 'rechazada'
    router.push('/admin/cotizaciones')
  } catch (_) {
    toast.error('No se pudo rechazar la cotización')
  }
}

const descargarPdf = async () => {
  if (!pdfBlob.value) {
    await generarPdfBlob()
  }
  const url = URL.createObjectURL(pdfBlob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = `cotizacion-${cotizacion.value.id}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

onMounted(() => cargarCotizacion())
</script>

<template>
  <div class="container-custom section-padding">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Cotización #{{ cotizacion?.id }}</h1>
        <button
          class="btn-secondary"
          @click="router.push('/admin/cotizaciones')"
        >
          Volver
        </button>
      </div>
      <div v-if="loading"
class="card">
        <div class="card-body py-8 text-center text-gray-600">
Cargando...
</div>
      </div>
      <div v-else
class="space-y-6">
        <div class="card">
          <div class="card-header">
            <h2 class="text-xl font-semibold">Resumen</h2>
            <p class="text-sm text-gray-600">
              Emitida: {{ formatDateTime(cotizacion?.created_at) }}
            </p>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-3 bg-gray-50 rounded">
                <div class="text-xs text-gray-500">Material</div>
                <div class="text-sm font-medium text-gray-900">
                  {{ cotizacion?.material_mueble }}
                </div>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <div class="text-xs text-gray-500">Color</div>
                <div class="text-sm font-medium text-gray-900">
                  {{ cotizacion?.color }}
                </div>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <div class="text-xs text-gray-500">Medidas</div>
                <div class="text-sm font-medium text-gray-900">
                  {{ cotizacion?.medidas }}
                </div>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <div class="text-xs text-gray-500">Comuna</div>
                <div class="text-sm font-medium text-gray-900">
                  {{ cotizacion?.comuna || '—' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="text-xl font-semibold">Detalle</h2>
          </div>
          <div class="card-body">
            <table class="min-w-full">
              <thead>
                <tr class="text-left text-sm text-gray-600">
                  <th class="py-2">Descripción</th>
                  <th class="py-2">Material</th>
                  <th class="py-2">Color</th>
                  <th class="py-2">Medidas</th>
                  <th class="py-2">Cantidad</th>
                  <th class="py-2">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="d in cotizacion?.detalles || []"
                  :key="d.descripcion"
                  class="border-t"
                >
                  <td class="py-2">
                    {{ d.descripcion }}
                  </td>
                  <td class="py-2">
                    {{ d.material }}
                  </td>
                  <td class="py-2">
                    {{ d.color }}
                  </td>
                  <td class="py-2">
                    {{ d.medidas }}
                  </td>
                  <td class="py-2">
                    {{ d.cantidad || 1 }}
                  </td>
                  <td class="py-2">
                    {{ formatPrice(d.precio_unitario ?? 0) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="flex items-center justify-end mt-4">
              <div class="text-sm text-gray-600 mr-3">Total</div>
              <div class="text-lg font-semibold">
                {{ formatPrice(cotizacion?.precio_unitario) }}
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body flex flex-wrap gap-2 justify-end">
            <button
              v-if="estado !== 'aprobada' && estado !== 'rechazada'"
              class="px-4 py-2 border rounded"
              @click="rechazar"
            >
              Rechazar
            </button>
            <button
              v-if="estado !== 'aprobada' && estado !== 'rechazada'"
              class="px-4 py-2 bg-primary-600 text-white rounded"
              @click="aceptar"
            >
              Aceptar
            </button>
            <button
              v-if="estado === 'aprobada'"
              class="px-4 py-2 border rounded"
              @click="descargarPdf"
            >
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
