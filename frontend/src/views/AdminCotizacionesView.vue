<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/services/api'
import logoUrl from '@/assets/logo-comercial-hg-compact.svg'

const toast = useToast()
const router = useRouter()
const loading = ref(true)
const quotes = ref([])
const pagination = reactive({ page: 1, limit: 10, total: 0 })
const showDetails = ref(false)
const selected = ref(null)
const detalles = ref([])

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

const exportPdf = q => {
  const precio = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(q.precio_unitario) || 0)
  const fecha = q.created_at
    ? new Date(q.created_at).toLocaleString('es-CL')
    : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cotización #${q.id}</title><style>@page{size:A4;margin:20mm}body{font-family:Inter,Arial,Helvetica,sans-serif;color:#111}header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:2px solid #e5e7eb}header .brand{display:flex;align-items:center;gap:12px}header img{height:40px}header .title{font-weight:700;font-size:18px;color:#1f2937}header .sub{font-size:12px;color:#6b7280}main{padding:24px}h1{font-size:20px;margin:0 0 12px;color:#111}table{width:100%;border-collapse:collapse;margin-top:4px}th,td{padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px}th{background:#f9fafb;color:#374151;font-weight:600}.total-row td{font-weight:700;font-size:16px}.meta{margin-top:8px;color:#6b7280;font-size:12px}footer{position:fixed;bottom:0;left:0;right:0;padding:10px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;display:flex;justify-content:space-between}</style></head><body><header><div class="brand"><img src="${logoUrl}" alt="Comercial HG"/><div><div class="title">Comercial HG</div><div class="sub">Muebles a medida • Cotización</div></div></div><div class="sub">#${q.id}</div></header><main><h1>Resumen de Cotización</h1><div class="meta">Emitida: ${fecha}</div><table><tr><th>Campo</th><th>Detalle</th></tr><tr><td>Cubierta</td><td>${q.cubierta || ''}</td></tr><tr><td>Material</td><td>${q.material_mueble || ''}</td></tr><tr><td>Color</td><td>${q.color || ''}</td></tr><tr><td>Medidas</td><td>${q.medidas || ''}</td></tr><tr><td>Comuna</td><td>${q.comuna || q.traslado_comuna || '—'}</td></tr><tr class="total-row"><td>Total</td><td>${precio}</td></tr></table></main><footer><div>Comercial HG — contacto@comercialhg.com</div><div>www.comercialhg.com</div></footer></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  setTimeout(() => {
    try {
      w.focus()
    } catch (_) {
      void 0
    }
    try {
      w.print()
    } catch (_) {
      void 0
    }
  }, 300)
}

const cargarJsPDF = () =>
  new Promise(resolve => {
    if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    s.onload = () => resolve(window.jspdf.jsPDF)
    document.head.appendChild(s)
  })

const descargarPdf = async q => {
  try {
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
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/png')
        domUrl.revokeObjectURL(urlObj)
        return dataUrl
      } catch (e) {
        return null
      }
    }

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
    const fecha = q.created_at
      ? new Date(q.created_at).toLocaleString('es-CL')
      : ''
    doc.text(`Emitida: ${fecha}`, 15, 48)

    const rows = [
      ['Cubierta', q.cubierta || ''],
      ['Material', q.material_mueble || ''],
      ['Color', q.color || ''],
      ['Medidas', q.medidas || ''],
      ['Comuna', q.comuna || q.traslado_comuna || '—'],
      [
        'Total',
        new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(q.precio_unitario) || 0),
      ],
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

    doc.save(`cotizacion-${q.id}.pdf`)
  } catch (e) {
    toast.error('No se pudo generar el PDF')
  }
}

const generarPdfBlob = async q => {
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
  const fecha = q.created_at
    ? new Date(q.created_at).toLocaleString('es-CL')
    : ''
  doc.text(`Emitida: ${fecha}`, 15, 48)
  const rows = [
    ['Cubierta', q.cubierta || ''],
    ['Material', q.material_mueble || ''],
    ['Color', q.color || ''],
    ['Medidas', q.medidas || ''],
    ['Comuna', q.comuna || q.traslado_comuna || '—'],
    [
      'Total',
      new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(q.precio_unitario) || 0),
    ],
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
  const blob = doc.output('blob')
  return blob
}

const verDetalles = async q => {
  try {
    const response = await api.get(`/pedidos/cotizaciones/xano/${q.id}`)
    if (response.data && response.data.pedido) {
      selected.value = { ...q, ...response.data.pedido }
    } else {
      selected.value = q
    }
  } catch (e) {
    console.error('Error fetching full details', e)
    selected.value = q
  }
  showDetails.value = true
}

const cerrarModal = () => {
  selected.value = null
  showDetails.value = false
}

const aceptarCotizacion = async q => {
  try {
    const blob = await generarPdfBlob(q)
    const fd = new FormData()
    fd.append('pdf', blob, `cotizacion-${q.id}.pdf`)
    await api.post(`/pedidos/cotizaciones/xano/${q.id}/aceptar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    toast.success('Cotización aceptada')
    
    // Actualizar estado localmente en lugar de eliminar
    if (selected.value && selected.value.id === q.id) {
      selected.value.estado_cotizacion = 'aprobada'
    }
    const idx = quotes.value.findIndex(item => item.id === q.id)
    if (idx !== -1) {
      quotes.value[idx].estado_cotizacion = 'aprobada'
    }
    
    showDetails.value = false
    selected.value = null
  } catch (e) {
    toast.error('No se pudo aceptar la cotización')
  }
}

const rechazarCotizacion = async q => {
  try {
    await api.patch(`/pedidos/cotizaciones/xano/${q.id}/rechazar`)
    toast.success('Cotización rechazada')
    if (selected.value && selected.value.id === q.id) {
      selected.value.rechazada = true
      selected.value.estado_cotizacion = 'rechazada'
    }
    const idx = quotes.value.findIndex(item => item.id === q.id)
    if (idx !== -1) {
      quotes.value[idx].rechazada = true
      quotes.value[idx].estado_cotizacion = 'rechazada'
    }
    showDetails.value = false
    selected.value = null
  } catch (_) {
    toast.error('No se pudo rechazar la cotización')
  }
}

const loadQuotes = async (page = 1) => {
  try {
    loading.value = true
    const params = { page, limit: pagination.limit }
    const response = await api.get('/pedidos/cotizaciones/xano', { params })
    quotes.value = response.data.cotizaciones || []
    const pag = response.data.pagination || {
      page,
      limit: pagination.limit,
      total: quotes.value.length,
    }
    pagination.page = pag.page || page
    pagination.limit = pag.limit || pagination.limit
    pagination.total = pag.total ?? quotes.value.length
  } catch (error) {
    toast.error('Error al cargar cotizaciones')
    quotes.value = []
    pagination.page = page
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => loadQuotes())
</script>

<template>
  <div class="container-custom section-padding">
    <div class="card">
      <div class="card-body">
        <div v-if="loading"
class="py-8 text-center text-gray-600">
          Cargando...
        </div>
        <div v-else>
          <div
            v-if="quotes.length === 0"
            class="py-8 text-center text-gray-600"
          >
            No hay cotizaciones pendientes
          </div>
          <div v-else
class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="text-left text-sm text-gray-600">
                  <th class="py-2 pr-4">ID</th>
                  <th class="py-2 pr-4">Usuario</th>
                  <th class="py-2 pr-4">Fecha</th>
                  <th class="py-2 pr-4">Precio</th>
                  <th class="py-2 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="q in quotes" :key="q.id" class="border-t">
                  <td class="py-2 pr-4">#{{ q.id }}</td>
                  <td class="py-2 pr-4">
                    <div v-if="q.usuario_id">
                      <div class="font-medium text-gray-900">{{ q.usuario_nombre || 'Usuario' }}</div>
                      <div class="text-xs text-gray-500">{{ q.usuario_email }}</div>
                      <div class="text-xs text-gray-400">ID: {{ q.usuario_id }}</div>
                    </div>
                    <span v-else>—</span>
                  </td>
                  <td class="py-2 pr-4">{{ formatDate(q.created_at) }}</td>
                  <td class="py-2 pr-4">${{ formatPrice(q.precio_unitario) }}</td>
                  <td class="py-2 pr-4">
                    <div class="flex gap-2 items-center">
                      <button
                        class="px-3 py-1 border rounded hover:bg-gray-50"
                        @click="verDetalles(q)"
                      >
                        Ver
                      </button>
                      <span
                        v-if="q.rechazada || q.estado_cotizacion === 'rechazada'"
                        class="px-2 py-1 text-xs rounded bg-red-100 text-red-700"
                      >Rechazado</span>
                      <span
                        v-if="q.estado_cotizacion === 'aprobada'"
                        class="px-2 py-1 text-xs rounded bg-green-100 text-green-700"
                      >Aprobado</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Detalles -->
    <div
      v-if="showDetails && selected"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 class="text-xl font-bold text-gray-900">
                Cotización #{{ selected.id }}
              </h2>
              <p class="text-sm text-gray-500">
                {{ formatDate(selected.created_at) }}
              </p>
            </div>
            <button
              @click="cerrarModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <span class="text-2xl">&times;</span>
            </button>
          </div>

          <div class="space-y-4">
            <!-- Sección de datos estructurados -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-500">Usuario</label>
                <div class="mt-1 text-gray-900" v-if="selected.usuario_id">
                    <div>{{ selected.usuario_nombre || 'Usuario' }}</div>
                    <div class="text-xs text-gray-500">{{ selected.usuario_email }}</div>
                    <div class="text-xs text-gray-400">ID: {{ selected.usuario_id }}</div>
                </div>
                <div v-else class="mt-1 text-gray-900">—</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Comuna</label>
                <div class="mt-1 text-gray-900">{{ selected.comuna || '—' }}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Material</label>
                <div class="mt-1 text-gray-900">{{ selected.material_mueble || '—' }}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Precio Comuna</label>
                <div class="mt-1 text-gray-900">${{ formatPrice(selected.precio_comuna) }}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Color Material</label>
                <div class="mt-1 text-gray-900">{{ selected.color_material || '—' }}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Cubierta</label>
                <div class="mt-1 text-gray-900">{{ selected.cubierta || '—' }}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Color Cubierta</label>
                <div class="mt-1 text-gray-900">{{ selected.color_cubierta || '—' }}</div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500">Medidas</label>
                <div class="mt-1 text-gray-900">{{ selected.medidas || '—' }}</div>
              </div>
            </div>

            <div class="pt-4 border-t space-y-2">
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-600">Subtotal</span>
                <span class="font-medium text-gray-900">${{ formatPrice(selected.precio_unitario) }}</span>
              </div>
              <div v-if="selected.precio_traslado" class="flex justify-between items-center text-sm">
                <span class="text-gray-600">Traslado ({{ selected.comuna }})</span>
                <span class="font-medium text-gray-900">${{ formatPrice(selected.precio_traslado) }}</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t">
                <span class="text-lg font-bold text-gray-900">Total</span>
                <span class="text-2xl font-bold text-indigo-600">
                  ${{ formatPrice(selected.total_con_traslado || selected.precio_unitario) }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-8 flex justify-end gap-3">
            <button
              @click="descargarPdf(selected)"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Descargar PDF
            </button>
            <button
              v-if="!selected.rechazada && selected.estado_cotizacion !== 'rechazada' && selected.estado_cotizacion !== 'aprobada'"
              @click="rechazarCotizacion(selected)"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Rechazar
            </button>
            <button
              v-if="selected.estado_cotizacion !== 'aprobada' && !selected.rechazada && selected.estado_cotizacion !== 'rechazada'"
              @click="aceptarCotizacion(selected)"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
