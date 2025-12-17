<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import logoUrl from '@/assets/logo-comercial-hg-compact.svg'

const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const quotes = ref([])
const pagination = reactive({ page: 1, limit: 10, total: 0 })
const showDetails = ref(false)
const selected = ref(null)
const detalles = ref([])
const searchQuery = ref('')
const statusFilter = ref('')

const filteredQuotes = computed(() => {
  return quotes.value.filter(q => {
    const matchesSearch = (
      q.id.toString().includes(searchQuery.value) ||
      (q.usuario_nombre && q.usuario_nombre.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (q.usuario_email && q.usuario_email.toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
    const matchesStatus = statusFilter.value ? (
        statusFilter.value === 'aprobada' ? q.estado_cotizacion === 'aprobada' :
        statusFilter.value === 'rechazada' ? (q.rechazada || q.estado_cotizacion === 'rechazada') :
        statusFilter.value === 'pendiente' ? (!q.rechazada && q.estado_cotizacion !== 'aprobada' && q.estado_cotizacion !== 'rechazada') :
        true
    ) : true
    
    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => {
  const total = quotes.value.length
  const pending = quotes.value.filter(q => !q.rechazada && q.estado_cotizacion !== 'aprobada' && q.estado_cotizacion !== 'rechazada').length
  const approved = quotes.value.filter(q => q.estado_cotizacion === 'aprobada').length
  const rejected = quotes.value.filter(q => q.rechazada || q.estado_cotizacion === 'rechazada').length
  return { total, pending, approved, rejected }
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
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cotización #${q.id}</title><style>@page{size:A4;margin:20mm}body{font-family:Inter,Arial,Helvetica,sans-serif;color:#111}header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:2px solid #e5e7eb}header .brand{display:flex;align-items:center;gap:12px}header img{height:40px}header .title{font-weight:700;font-size:18px;color:#1f2937}header .sub{font-size:12px;color:#6b7280}main{padding:24px}h1{font-size:20px;margin:0 0 12px;color:#111}table{width:100%;border-collapse:collapse;margin-top:4px}th,td{padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px}th{background:#f9fafb;color:#374151;font-weight:600}.total-row td{font-weight:700;font-size:16px}.meta{margin-top:8px;color:#6b7280;font-size:12px}footer{position:fixed;bottom:0;left:0;right:0;padding:10px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;display:flex;justify-content:space-between}</style></head><body><header><div class="brand"><img src="${logoUrl}" alt="Comercial HG"/><div><div class="title">Comercial HG</div><div class="sub">Muebles a medida • Cotización</div></div></div><div class="sub">#${q.id}</div></header><main><h1>Resumen de Cotización</h1><div class="meta">Emitida: ${fecha}</div><table><tr><th>Campo</th><th>Detalle</th></tr><tr><td>Cubierta</td><td>${q.cubierta || ''} ${q.color_cubierta ? '(' + q.color_cubierta + ')' : ''}</td></tr><tr><td>Material</td><td>${q.material_mueble || ''} ${q.color_material ? '(' + q.color_material + ')' : ''}</td></tr><tr><td>Color General</td><td>${q.color || ''}</td></tr><tr><td>Medidas</td><td>${q.medidas || ''}</td></tr><tr><td>Comuna</td><td>${q.comuna || q.traslado_comuna || '—'}</td></tr><tr class="total-row"><td>Total</td><td>${precio}</td></tr></table></main><footer><div>Comercial HG — contacto@comercialhg.com</div><div>www.comercialhg.com</div></footer></body></html>`
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
  new Promise((resolve, reject) => {
    // Si ya está cargado, resolver
    if (window.jspdf?.jsPDF && window.jspdf.plugin?.autotable) {
        return resolve(window.jspdf.jsPDF)
    }

    // Función para cargar script
    const loadScript = (src) => new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = src
        s.onload = res
        s.onerror = rej
        document.head.appendChild(s)
    })

    // Cargar jspdf primero, luego autotable
    const loadLibs = async () => {
        try {
            if (!window.jspdf?.jsPDF) {
                await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
            }
            if (!window.jspdf?.plugin?.autotable) {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js')
            }
            resolve(window.jspdf.jsPDF)
        } catch (e) {
            reject(e)
        }
    }

    loadLibs()
  })

const generarContenidoPdf = (doc, q, logoData, firmaData) => {
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20

    // --- Header ---
    // Fondo del header
    doc.setFillColor(67, 56, 202) // Indigo 700
    doc.rect(0, 0, pageWidth, 45, 'F')

    // Logo (si existe)
    if (logoData) {
        doc.addImage(logoData, 'PNG', margin, 12, 40, 16)
    } else {
        // Fallback texto si no hay logo
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('Comercial HG', margin, 25)
    }

    // Título Cotización
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.text('COTIZACIÓN', pageWidth - margin, 22, { align: 'right' })

    // Info Cotización (Número y Fecha)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`#${q.id}`, pageWidth - margin, 30, { align: 'right' })
    
    const fecha = q.created_at ? new Date(q.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
    doc.text(`Fecha: ${fecha}`, pageWidth - margin, 36, { align: 'right' })

    // --- Info Empresa y Cliente ---
    const infoY = 60
    
    // Empresa (Izquierda)
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('De:', margin, infoY)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text('Comercial HG', margin, infoY + 6)
    doc.text('Muebles a medida y restauraciones', margin, infoY + 11)
    doc.text('contacto@comercialhg.com', margin, infoY + 16)
    doc.text('www.comercialhg.com', margin, infoY + 21)

    // Cliente (Derecha)
    const clientX = pageWidth / 2 + 10
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Para:', clientX, infoY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(q.usuario_nombre || 'Cliente Estimado', clientX, infoY + 6)
    doc.text(q.usuario_email || '', clientX, infoY + 11)
    if (q.comuna || q.traslado_comuna) {
        doc.text(`Comuna: ${q.comuna || q.traslado_comuna}`, clientX, infoY + 16)
    }

    // --- Tabla de Ítems ---
    const tableBody = [
        [
            'Fabricación de Mueble a Medida',
            `Material: ${q.material_mueble || '—'}${q.color_material ? ' (' + q.color_material + ')' : ''}\nCubierta: ${q.cubierta || '—'}${q.color_cubierta ? ' (' + q.color_cubierta + ')' : ''}\nColor General: ${q.color || '—'}\nMedidas: ${q.medidas || '—'}`,
            `$ ${formatPrice(q.precio_unitario)}`
        ]
    ]

    const precioTraslado = Number(q.precio_comuna || q.precio_traslado) || 0
    if (precioTraslado > 0) {
        tableBody.push([
            'Servicio de Despacho',
            `Traslado a comuna de ${q.comuna || q.traslado_comuna || 'destino'}`,
            `$ ${formatPrice(precioTraslado)}`
        ])
    }

    // Calcular total
    const total = (Number(q.precio_unitario) || 0) + precioTraslado

    doc.autoTable({
        startY: 95,
        head: [['Ítem / Servicio', 'Especificaciones', 'Precio']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: [67, 56, 202], 
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: { 
            fontSize: 10, 
            cellPadding: 6, 
            valign: 'middle',
            lineColor: [220, 220, 220],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
    })

    // --- Totales ---
    const finalY = doc.lastAutoTable.finalY + 15
    const totalBoxWidth = 80
    const totalBoxX = pageWidth - margin - totalBoxWidth

    // Línea separadora
    doc.setDrawColor(67, 56, 202)
    doc.setLineWidth(0.5)
    doc.line(totalBoxX, finalY, pageWidth - margin, finalY)

    // Total Texto
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text('TOTAL', totalBoxX, finalY + 10)

    // Total Valor
    doc.setTextColor(67, 56, 202)
    doc.setFontSize(16)
    doc.text(`$ ${formatPrice(total)}`, pageWidth - margin, finalY + 10, { align: 'right' })
    
    // --- Firma ---
    if (firmaData) {
        const firmaY = finalY + 25
        doc.addImage(firmaData, 'PNG', pageWidth - margin - 40, firmaY, 40, 20)
        
        doc.setDrawColor(150, 150, 150)
        doc.setLineWidth(0.3)
        doc.line(pageWidth - margin - 45, firmaY + 22, pageWidth - margin + 5, firmaY + 22)

        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('Firma Digital', pageWidth - margin - 20, firmaY + 26, { align: 'center' })
    }

    // --- Footer ---
    const footerY = pageHeight - 25
    
    // Línea footer
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.line(margin, footerY, pageWidth - margin, footerY)

    // Texto footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    
    doc.text('Esta cotización tiene una validez de 15 días hábiles.', margin, footerY + 8)
    doc.text('Comercial HG - Calidad y diseño a tu medida.', pageWidth - margin, footerY + 8, { align: 'right' })
}

const getLogoData = async () => {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => resolve(null)
        img.src = logoUrl
    })
}

const getFirmaData = async (url) => {
    if (!url) return null;
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => resolve(null)
        img.src = url
    })
}

const descargarPdf = async q => {
  try {
    const JS = await cargarJsPDF()
    const doc = new JS({ unit: 'mm', format: 'a4' })
    const logoData = await getLogoData()
    
    // Obtener firma
    const firmaUrl = authStore.user?.firma_url
    const firmaData = await getFirmaData(firmaUrl)
    
    generarContenidoPdf(doc, q, logoData, firmaData)
    
    doc.save(`cotizacion-${q.id}.pdf`)
  } catch (e) {
    console.error(e)
    toast.error('Error al generar el PDF profesional')
  }
}

const generarPdfBlob = async q => {
  const JS = await cargarJsPDF()
  const doc = new JS({ unit: 'mm', format: 'a4' })
  const logoData = await getLogoData()
  
  // Obtener firma
  const firmaUrl = authStore.user?.firma_url
  const firmaData = await getFirmaData(firmaUrl)
  
  generarContenidoPdf(doc, q, logoData, firmaData)
  
  return doc.output('blob')
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
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-gray-900 mb-2">Cotizaciones</h1>
      <p class="text-gray-500">Gestiona y revisa todas las solicitudes de cotización.</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <div class="flex items-center justify-between mb-4">
          <div class="bg-white/20 p-3 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span class="text-xs font-semibold bg-white/20 px-2 py-1 rounded">Total</span>
        </div>
        <div class="text-3xl font-bold">{{ stats.total }}</div>
        <div class="text-blue-100 text-sm mt-1">Cotizaciones registradas</div>
      </div>

      <div class="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg p-6 text-white">
        <div class="flex items-center justify-between mb-4">
          <div class="bg-white/20 p-3 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs font-semibold bg-white/20 px-2 py-1 rounded">Pendientes</span>
        </div>
        <div class="text-3xl font-bold">{{ stats.pending }}</div>
        <div class="text-yellow-100 text-sm mt-1">Requieren atención</div>
      </div>

      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
        <div class="flex items-center justify-between mb-4">
          <div class="bg-white/20 p-3 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs font-semibold bg-white/20 px-2 py-1 rounded">Aprobadas</span>
        </div>
        <div class="text-3xl font-bold">{{ stats.approved }}</div>
        <div class="text-green-100 text-sm mt-1">Cotizaciones exitosas</div>
      </div>

      <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
        <div class="flex items-center justify-between mb-4">
          <div class="bg-white/20 p-3 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs font-semibold bg-white/20 px-2 py-1 rounded">Rechazadas</span>
        </div>
        <div class="text-3xl font-bold">{{ stats.rejected }}</div>
        <div class="text-red-100 text-sm mt-1">Canceladas o desestimadas</div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 class="text-lg font-semibold text-gray-800">Listado de Solicitudes</h2>
        <span class="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
          {{ pagination.total }} registros
        </span>
      </div>
      <!-- Toolbar -->
      <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-white">
        <div class="relative max-w-sm w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          </div>
          <input 
            v-model="searchQuery"
            type="text" 
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm transition duration-150 ease-in-out" 
            placeholder="Buscar por ID, nombre o email..."
          />
        </div>
        
        <div class="flex items-center gap-2">
          <select 
            v-model="statusFilter" 
            class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
        </div>
      </div>

      <div class="p-0">
        <div v-if="loading" class="py-16 text-center text-gray-500">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p class="text-lg">Cargando cotizaciones...</p>
        </div>
        <div v-else>
          <div v-if="filteredQuotes.length === 0" class="py-16 text-center text-gray-500 bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-lg font-medium">No se encontraron cotizaciones</p>
            <p class="text-sm mt-2">Intenta ajustar los filtros de búsqueda.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-100">
                <tr v-for="q in filteredQuotes" :key="q.id" class="hover:bg-blue-50/50 transition-colors duration-150 group">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">#{{ q.id }}</td>
                  <td class="px-6 py-4">
                    <div v-if="q.usuario_id" class="flex items-center">
                      <div class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 text-xs">
                        {{ (q.usuario_nombre || 'U').charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex flex-col">
                        <span class="text-sm font-medium text-gray-900">{{ q.usuario_nombre || 'Usuario' }}</span>
                        <span class="text-xs text-gray-500">{{ q.usuario_email }}</span>
                      </div>
                    </div>
                    <span v-else class="text-sm text-gray-400 italic">—</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div class="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {{ formatDate(q.created_at) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${{ formatPrice(q.precio_unitario) }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span v-if="q.rechazada || q.estado_cotizacion === 'rechazada'" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                      <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Rechazado
                    </span>
                    <span v-else-if="q.estado_cotizacion === 'aprobada'" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Aprobado
                    </span>
                    <span v-else class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                      <span class="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                      Pendiente
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      @click="verDetalles(q)"
                      class="inline-flex items-center text-white bg-indigo-600 hover:bg-indigo-700 font-medium px-4 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                      <span>Ver detalles</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <!-- Pagination -->
            <div class="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
              <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    Mostrando <span class="font-medium">{{ (pagination.page - 1) * pagination.limit + 1 }}</span> a <span class="font-medium">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span> de <span class="font-medium">{{ pagination.total }}</span> resultados
                  </p>
                </div>
                <div>
                  <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button 
                      @click="loadQuotes(pagination.page - 1)" 
                      :disabled="pagination.page === 1"
                      class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <span class="sr-only">Anterior</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <button 
                      v-for="p in Math.ceil(pagination.total / pagination.limit)" 
                      :key="p"
                      @click="loadQuotes(p)"
                      :class="[
                        p === pagination.page ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                        'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                      ]"
                    >
                      {{ p }}
                    </button>
                    <button 
                      @click="loadQuotes(pagination.page + 1)" 
                      :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
                      class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <span class="sr-only">Siguiente</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Modal Detalles -->
    <div
      v-if="showDetails && selected"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">
        <div class="p-0">
          <div class="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 flex justify-between items-start text-white">
            <div>
              <h2 class="text-2xl font-bold">
                Cotización #{{ selected.id }}
              </h2>
              <p class="text-indigo-200 mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(selected.created_at) }}
              </p>
            </div>
            <button
              @click="cerrarModal"
              class="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-6">
            <!-- Sección de datos estructurados -->
            <div class="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Información del Cliente</h3>
              <div class="grid grid-cols-2 gap-x-4 gap-y-4">
                <div class="col-span-2 sm:col-span-1">
                  <label class="block text-xs font-medium text-gray-500 uppercase mb-1">Usuario</label>
                  <div class="text-gray-900 font-medium" v-if="selected.usuario_id">
                      <div class="text-base">{{ selected.usuario_nombre || 'Usuario' }}</div>
                      <div class="text-sm text-gray-500">{{ selected.usuario_email }}</div>
                      <div class="text-xs text-indigo-500 mt-0.5">ID: {{ selected.usuario_id }}</div>
                  </div>
                  <div v-else class="text-gray-400 italic">—</div>
                </div>
                <div class="col-span-2 sm:col-span-1">
                  <label class="block text-xs font-medium text-gray-500 uppercase mb-1">Comuna</label>
                  <div class="text-gray-900 font-medium bg-white px-3 py-2 rounded border border-gray-200 inline-block w-full">
                    {{ selected.comuna || '—' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Detalles del Mueble</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 uppercase mb-1">Material</label>
                  <div class="text-gray-900 font-medium">{{ selected.material_mueble || '—' }}</div>
                  <div class="text-xs text-gray-500 mt-1" v-if="selected.color_material">Color: {{ selected.color_material }}</div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 uppercase mb-1">Cubierta</label>
                  <div class="text-gray-900 font-medium">{{ selected.cubierta || '—' }}</div>
                  <div class="text-xs text-gray-500 mt-1" v-if="selected.color_cubierta">Color: {{ selected.color_cubierta }}</div>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-500 uppercase mb-1">Medidas</label>
                  <div class="text-gray-900 font-medium bg-white px-3 py-2 rounded border border-gray-200">
                    {{ selected.medidas || '—' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
              <h3 class="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 border-b border-indigo-200 pb-2">Desglose de Precios</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-gray-600">Precio Base (Mueble)</span>
                  <span class="font-medium text-gray-900">${{ formatPrice(selected.precio_unitario) }}</span>
                </div>
                <div v-if="selected.precio_comuna" class="flex justify-between items-center text-sm">
                   <span class="text-gray-600">Ajuste Comuna</span>
                   <span class="font-medium text-gray-900">${{ formatPrice(selected.precio_comuna) }}</span>
                </div>
                <div v-if="selected.precio_traslado" class="flex justify-between items-center text-sm">
                  <span class="text-gray-600">Traslado ({{ selected.comuna }})</span>
                  <span class="font-medium text-gray-900">${{ formatPrice(selected.precio_traslado) }}</span>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-indigo-200 mt-2">
                  <span class="text-lg font-bold text-indigo-900">Total Final</span>
                  <span class="text-3xl font-bold text-indigo-700">
                    ${{ formatPrice(selected.total_con_traslado || selected.precio_unitario) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                @click="descargarPdf(selected)"
                class="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar PDF
              </button>
              <button
                v-if="!selected.rechazada && selected.estado_cotizacion !== 'rechazada' && selected.estado_cotizacion !== 'aprobada'"
                @click="rechazarCotizacion(selected)"
                class="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Rechazar
              </button>
              <button
                v-if="selected.estado_cotizacion !== 'aprobada' && !selected.rechazada && selected.estado_cotizacion !== 'rechazada'"
                @click="aceptarCotizacion(selected)"
                class="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
