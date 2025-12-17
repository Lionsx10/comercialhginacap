<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import logoUrl from '@/assets/logo-comercial-hg-compact.svg'

const toast = useToast()
const authStore = useAuthStore()

const isLoading = ref(true)
const items = ref([])
const pagination = reactive({ page: 1, limit: 10, total: 0, pages: 1 })

const exportarPdf = c => {
  const precio = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(c.precio_unitario) || 0)
  const fecha = c.created_at
    ? new Date(c.created_at).toLocaleString('es-CL')
    : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cotización #${c.id}</title><style>@page{size:A4;margin:20mm}body{font-family:Inter,Arial,Helvetica,sans-serif;color:#111}header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:2px solid #e5e7eb}header .brand{display:flex;align-items:center;gap:12px}header img{height:40px}header .title{font-weight:700;font-size:18px;color:#1f2937}header .sub{font-size:12px;color:#6b7280}main{padding:24px}h1{font-size:20px;margin:0 0 12px;color:#111}table{width:100%;border-collapse:collapse;margin-top:4px}th,td{padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px}th{background:#f9fafb;color:#374151;font-weight:600}.total-row td{font-weight:700;font-size:16px}.meta{margin-top:8px;color:#6b7280;font-size:12px}footer{position:fixed;bottom:0;left:0;right:0;padding:10px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;display:flex;justify-content:space-between}</style></head><body><header><div class="brand"><img src="${logoUrl}" alt="Comercial HG"/><div><div class="title">Comercial HG</div><div class="sub">Muebles a medida • Cotización</div></div></div><div class="sub">#${c.id}</div></header><main><h1>Resumen de Cotización</h1><div class="meta">Emitida: ${fecha}</div><table><tr><th>Campo</th><th>Detalle</th></tr><tr><td>Cubierta</td><td>${c.cubierta || ''}</td></tr><tr><td>Material</td><td>${c.material_mueble || ''}</td></tr><tr><td>Color</td><td>${c.color || ''}</td></tr><tr><td>Medidas</td><td>${c.medidas || ''}</td></tr><tr><td>Comuna</td><td>${c.comuna || '—'}</td></tr><tr class="total-row"><td>Total</td><td>${precio}</td></tr></table></main><footer><div>Comercial HG — contacto@comercialhg.com</div><div>www.comercialhg.com</div></footer></body></html>`
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

const descargarPdf = async c => {
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
    doc.text(`#${c.id}`, 180, 27, { align: 'right' })

    doc.setDrawColor(220)
    doc.line(15, 33, 195, 33)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen de Cotización', 15, 43)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const fecha = c.created_at
      ? new Date(c.created_at).toLocaleString('es-CL')
      : ''
    doc.text(`Emitida: ${fecha}`, 15, 48)

    const rows = [
      ['Cubierta', c.cubierta || ''],
      ['Color Cubierta', c.color_cubierta || ''],
      ['Material', c.material_mueble || ''],
      ['Color Material', c.color_material || ''],
      ['Medidas', c.medidas || ''],
      ['Comuna', c.comuna || '—'],
      [
        'Total',
        new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(c.precio_unitario) || 0),
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

    doc.save(`cotizacion-${c.id}.pdf`)
  } catch (e) {
    toast.error('No se pudo generar el PDF')
  }
}

const loadCotizaciones = async (page = 1) => {
  try {
    isLoading.value = true
    if (!authStore.user?.id) {
      try {
        await authStore.verifyToken()
      } catch (_) {
        void 0
      }
    }
    const uid = authStore.user?.id
    const res = await api.get(`/pedidos/cotizaciones/usuario/${uid}`, {
      params: { page, limit: pagination.limit },
    })
    items.value = res.data.cotizaciones || []
    if (res.data.pagination) {
      pagination.page = res.data.pagination.page || page
      pagination.limit = res.data.pagination.limit || pagination.limit
      pagination.total = res.data.pagination.total || items.value.length
      pagination.pages =
        res.data.pagination.pages ||
        Math.ceil(pagination.total / pagination.limit) ||
        1
    }
  } catch (e) {
    if (!e?.response) {
      toast.error('Error al cargar cotizaciones')
    }
  } finally {
    isLoading.value = false
  }
}

const changePage = p => {
  if (p >= 1 && p <= pagination.pages) {
    pagination.page = p
    loadCotizaciones(p)
  }
}

onMounted(() => loadCotizaciones(1))
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-semibold mb-4">Mis Cotizaciones</h1>

    <div
v-if="isLoading" class="py-10 text-center text-gray-600"
>
      Cargando…
    </div>

    <div v-else>
      <div class="overflow-x-auto bg-white shadow rounded">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50 text-left">
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Cubierta</th>
              <th class="px-4 py-3">Color Cubierta</th>
              <th class="px-4 py-3">Material</th>
              <th class="px-4 py-3">Color Material</th>
              <th class="px-4 py-3">Medidas</th>
              <th class="px-4 py-3">Comuna</th>
              <th class="px-4 py-3">Precio</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in items" :key="c.id" class="border-t">
              <td class="px-4 py-2">
                {{ c.id }}
              </td>
              <td class="px-4 py-2">
                {{ new Date(c.created_at).toLocaleString() }}
              </td>
              <td class="px-4 py-2">
                {{ c.cubierta || '—' }}
              </td>
              <td class="px-4 py-2">
                {{ c.color_cubierta || '—' }}
              </td>
              <td class="px-4 py-2">
                {{ c.material_mueble }}
              </td>
              <td class="px-4 py-2">
                {{ c.color_material || '—' }}
              </td>
              <td class="px-4 py-2">
                {{ c.medidas }}
              </td>
              <td class="px-4 py-2">
                {{ c.comuna || '—' }}
              </td>
              <td class="px-4 py-2">
                {{
                  Number(c.precio_unitario).toLocaleString('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                  })
                }}
              </td>
              <td class="px-4 py-2">
                <div class="flex gap-2 items-center">
                  <span
                    v-if="
                      c.estado_cotizacion !== 'aprobada' &&
                        c.estado_cotizacion !== 'rechazada'
                    "
                    class="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700"
                  >En revisión</span>
                  <span
                    v-if="c.estado_cotizacion === 'rechazada'"
                    class="px-2 py-1 text-xs rounded bg-red-100 text-red-700"
                  >Rechazado</span>
                  <span
                    v-if="c.estado_cotizacion === 'aprobada'"
                    class="px-2 py-1 text-xs rounded bg-green-100 text-green-700"
                  >Aprobado</span>
                  <button
                    v-if="c.estado_cotizacion === 'aprobada'"
                    class="px-3 py-1 border rounded"
                    @click="descargarPdf(c)"
                  >
                    Descargar PDF
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="items.length === 0">
              <td class="px-4 py-6 text-center text-gray-500" colspan="10">
                No hay cotizaciones
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-center gap-2 mt-4">
        <button
          class="px-3 py-2 border rounded"
          :disabled="pagination.page <= 1"
          @click="changePage(pagination.page - 1)"
        >
          Anterior
        </button>
        <span class="text-sm text-gray-700">Página {{ pagination.page }} de {{ pagination.pages }}</span>
        <button
          class="px-3 py-2 border rounded"
          :disabled="pagination.page >= pagination.pages"
          @click="changePage(pagination.page + 1)"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>
