<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api, { catalogAPI } from '@/services/api'
import { useDraftOrderStore } from '@/stores/draftOrder'

const router = useRouter()
const toast = useToast()
const draftStore = useDraftOrderStore()

const materialesDisponibles = ref([])
const coloresDisponibles = ref([])

const coverTypes = [
  { key: 'Granito', img: '/images/muebles/Granito Piedra.JPG' },
  { key: 'Cuarzo', img: '/images/muebles/Cuarzoos' },
]

const granitoColors = [
  { key: 'Blanco Ituanas', price: 90000, img: '/images/muebles/Granito01.jpg' },
  { key: 'Blanco Dallas', price: 95000, img: '/images/muebles/Granito02.jpg' },
  {
    key: 'Blanco Kashmire',
    price: 100000,
    img: '/images/muebles/Granito03.jpg',
  },
  { key: 'Gris Sardo', price: 100000, img: '/images/muebles/Granito04.jpg' },
  { key: 'Gris Mara', price: 95000, img: '/images/muebles/Granito05.jpg' },
  {
    key: 'Amarillo Santa Cecilia Gold',
    price: 110000,
    img: '/images/muebles/Granito06.jpg',
  },
  {
    key: 'Amarillo Santa Cecilia',
    price: 105000,
    img: '/images/muebles/Granito07.jpg',
  },
  {
    key: 'Amarillo Venecia',
    price: 100000,
    img: '/images/muebles/Granito08.jpg',
  },
  {
    key: 'Amarillo Barroco',
    price: 105000,
    img: '/images/muebles/Granito09.jpg',
  },
  {
    key: 'Amarillo New Venetian Gold',
    price: 110000,
    img: '/images/muebles/Granito10.jpg',
  },
  {
    key: 'Amarillo Ornamental',
    price: 105000,
    img: '/images/muebles/Granito11.jpg',
  },
  { key: 'Amarillo Bambú', price: 95000, img: '/images/muebles/Granito12.jpg' },
  {
    key: 'Amarillo Maracuyá',
    price: 95000,
    img: '/images/muebles/Granito13.jpg',
  },
  {
    key: 'Amarillo Golden Coast',
    price: 110000,
    img: '/images/muebles/Granito14.jpg',
  },
  { key: 'Café Mara', price: 100000, img: '/images/muebles/Granito15.jpg' },
  {
    key: 'Amarillo Icarai',
    price: 95000,
    img: '/images/muebles/Granito16.jpg',
  },
  {
    key: 'Amarillo Santa Elena',
    price: 100000,
    img: '/images/muebles/Granito17.jpg',
  },
  { key: 'Beige Abano', price: 90000, img: '/images/muebles/Granito18.jpg' },
  { key: 'Oro Fino', price: 120000, img: '/images/muebles/Granito19.jpg' },
  { key: 'San Felipe', price: 95000, img: '/images/muebles/Granito20.jpg' },
  { key: 'Fortaleza', price: 90000, img: '/images/muebles/Granito21.jpg' },
  { key: 'Beige Puma', price: 90000, img: '/images/muebles/Granito22.jpg' },
  { key: 'Rosa Beta', price: 90000, img: '/images/muebles/Granito23.jpg' },
  { key: 'Rosa del Salto', price: 90000, img: '/images/muebles/Granito24.jpg' },
  { key: 'Ocre', price: 95000, img: '/images/muebles/Granito25.jpg' },
  { key: 'Rojo Dragón', price: 120000, img: '/images/muebles/Granito26.jpg' },
  { key: 'Rojo Rubí', price: 120000, img: '/images/muebles/Granito27.jpg' },
  { key: 'Rojo Imperial', price: 115000, img: '/images/muebles/Granito28.jpg' },
  { key: 'Café Perla', price: 95000, img: '/images/muebles/Granito29.jpg' },
  {
    key: 'Verde Ecología',
    price: 100000,
    img: '/images/muebles/Granito30.jpg',
  },
  {
    key: 'Verde Butterfly',
    price: 110000,
    img: '/images/muebles/Granito31.jpg',
  },
  { key: 'Verde Ubatuba', price: 110000, img: '/images/muebles/Granito32.jpg' },
  {
    key: 'Verde Esmeralda',
    price: 100000,
    img: '/images/muebles/Granito33.jpg',
  },
  { key: 'Blue Pearl', price: 120000, img: '/images/muebles/Granito34.jpg' },
  { key: 'Negro Impala', price: 120000, img: '/images/muebles/Granito35.jpg' },
  { key: 'Negro Galaxy', price: 120000, img: '/images/muebles/Granito36.jpg' },
  {
    key: 'Negro San Gabriel Extra',
    price: 115000,
    img: '/images/muebles/Granito37.jpg',
  },
  {
    key: 'Negro Absoluto',
    price: 120000,
    img: '/images/muebles/Granito38.jpg',
  },
]
const cuarzoColors = [
  {
    key: 'Blanco Absoluto',
    price: 250000,
    img: '/images/muebles/Cuarzos01.jpg',
  },
  { key: 'Carrara', price: 280000, img: '/images/muebles/Cuarzos02.jpg' },
  { key: 'Calacatta', price: 300000, img: '/images/muebles/Cuarzos03.webp' },
  {
    key: 'Blanco Cristal',
    price: 260000,
    img: '/images/muebles/Cuarzos04.jpg',
  },
  { key: 'Blanco Sugar', price: 240000, img: '/images/muebles/Cuarzos05.jpg' },
  {
    key: 'White Diamond',
    price: 290000,
    img: '/images/muebles/Cuarzos06.jpg',
  },
  {
    key: 'Blanco Galaxy',
    price: 270000,
    img: '/images/muebles/Cuarzos07.webp',
  },
  { key: 'Blanco Norte', price: 250000, img: '/images/muebles/Cuarzos08.jpg' },
  { key: 'Beige Nogado', price: 240000, img: '/images/muebles/Cuarzos09.jpg' },
  { key: 'Sand Diamond', price: 260000, img: '/images/muebles/Cuarzos10.jpeg' },
  { key: 'Gris Galaxy', price: 270000, img: '/images/muebles/Cuarzos11.jpg' },
  { key: 'Beige Arena', price: 250000, img: '/images/muebles/Cuarzos12.jpg' },
  { key: 'Beige Silky', price: 240000, img: '/images/muebles/Cuarzos13.jpg' },
  {
    key: 'Amarillo Galaxy',
    price: 270000,
    img: '/images/muebles/Cuarzos14.jpg',
  },
  { key: 'Moka', price: 240000, img: '/images/muebles/Cuarzos15.jpg' },
  { key: 'Beige Galaxy', price: 260000, img: '/images/muebles/Cuarzos16.jpg' },
  { key: 'Oasis', price: 250000, img: '/images/muebles/Cuarzos17.jpg' },
  {
    key: 'Marron Galaxy',
    price: 260000,
    img: '/images/muebles/Cuarzos18.png',
  },
  { key: 'Caramel', price: 240000, img: '/images/muebles/Cuarzos19.png' },
  { key: 'Orange', price: 250000, img: '/images/muebles/Cuarzos20.jpg' },
  { key: 'Rojo Galaxy', price: 280000, img: '/images/muebles/Cuarzos21.webp' },
  { key: 'Verde Galaxy', price: 260000, img: '/images/muebles/Cuarzos22.png' },
  { key: 'Apple', price: 250000, img: '/images/muebles/Cuarzos23.webp' },
  { key: 'Azul Galaxy', price: 290000, img: '/images/muebles/Cuarzos24.jpg' },
  { key: 'Negro Galaxy', price: 290000, img: '/images/muebles/Cuarzos25.webp' },
  { key: 'Gris Iron', price: 260000, img: '/images/muebles/Cuarzos26.jpg' },
  {
    key: 'Black Diamond',
    price: 300000,
    img: '/images/muebles/Cuarzos27.webp',
  },
  { key: 'Gold Jade', price: 300000, img: '/images/muebles/Cuarzos28.jpg' },
  { key: 'Negro Liso', price: 260000, img: '/images/muebles/Cuarzos29.webp' },
  {
    key: 'Negro Marquina',
    price: 300000,
    img: '/images/muebles/Cuarzos30.webp',
  },
]

const termolaminadoColors = [
  { key: 'Verde Esmeralda Ultra Mate', img: '/images/muebles/Color01.jpg' },
  { key: 'Celeste Ultra Mate', img: '/images/muebles/Color02.jpg' },
  { key: 'Verde Olivo Ultra Mate', img: '/images/muebles/Color03.jpg' },
  { key: 'Verde Claro Ultra Mate', img: '/images/muebles/Color04.jpg' },
  { key: 'Azul Oceanico Ultra Mate', img: '/images/muebles/Color05.jpg' },
  { key: 'Negro Ultra Mate', img: '/images/muebles/Color06.jpg' },
  { key: 'Grafito Ultra Mate', img: '/images/muebles/Color07.jpg' },
  { key: 'Gris Plata Ultra Mate', img: '/images/muebles/Color08.jpg' },
  { key: 'Titanio Ultra Mate', img: '/images/muebles/Color09.jpg' },
  { key: 'Maple Beige', img: '/images/muebles/Color10.jpg' },
  { key: 'New Maple', img: '/images/muebles/Color11.jpg' },
  { key: 'Natural Oak Ultra Mate', img: '/images/muebles/Color12.jpg' },
  { key: 'Palo Rosa', img: '/images/muebles/Color13.jpg' },
  { key: 'Nogal Veneza', img: '/images/muebles/Color14.jpg' },
  { key: 'Blanco Opaco', img: '/images/muebles/Color15.jpg' },
  { key: 'Blanco Brillo', img: '/images/muebles/Color16.jpg' },
  { key: 'Blanco Ultra Mate', img: '/images/muebles/Color17.jpg' },
  { key: 'Madera Perillo', img: '/images/muebles/Color18.jpg' },
  { key: 'Café Latte', img: '/images/muebles/Color19.jpg' },
  { key: 'Encina Brillo', img: '/images/muebles/Color20.jpg' },
  { key: 'Madera Rosa', img: '/images/muebles/Color21.jpg' },
  { key: 'Peral', img: '/images/muebles/Color22.jpg' },
  { key: 'New Cerezo', img: '/images/muebles/Color23.jpg' },
  { key: 'Granadillo', img: '/images/muebles/Color24.jpg' },
  { key: 'Hard Rock', img: '/images/muebles/Color25.jpg' },
  { key: 'Chocolate Sincro', img: '/images/muebles/Color26.jpg' },
  { key: 'Madera Africana', img: '/images/muebles/Color27.jpg' },
]
const commonMuebleColors = [
  'Linz',
  'Marsella',
  'Blanco Antártico',
  'Blanco Antártico',
  'Almendra',
  'Aluminio',
  'Gris',
  'Titanio',
  'Grafito',
  'Negro',
  'Negro',
  'Rojo Strong',
  'Rojo Strong',
  'Blue Sky',
  'Morado',
  'Green Grass',
  'Coffee Milk',
  'Café Claro',
  'Damascus',
  'Lila',
  'Orquídea',
  'Magenta',
  'Violeta',
  'Violeta',
  'Cata Otoñal',
  'Cata Blue',
  'Mármol Azul',
  'Vicenza',
  'Mármol Florenza',
  'Mármol Salamanca',
  'Mármol Beige',
  'Mármol Carrara',
  'Módena',
  'Mármol Santiago',
  'Mármol Verona',
  'Mármol Italia',
  'Viena',
  'Palermo',
  'Quebec',
  'Betania',
  'Piedra Gris',
  'Piedra Roja',
  'Trento',
  'Granito Octay',
  'Granito Dich',
  'Black Pearl',
  'Vancouver',
  'Montreal Gray',
  'Montreal Dark',
  'Clear Wood',
  'Madera Haya',
  'Arezzo',
  'Arezzo',
  'Cerezo Rojo',
  'Cerezo Rojo',
  'Viterbo',
  'Viterbo',
  'Madera Huapa',
  'Vilcún',
  'Madera Nativa',
  'Rauco',
  'Eleganza',
  'Veneza',
  'Peumo',
  'Tabunco',
  'Rancura',
  'Pirque',
  'Londrina',
  'Dark Wood',
  'Llanquihue',
  'Porvenir',
  'Timaukel',
  'Licantén',
  'Tantauco',
]
const postformadoColors = commonMuebleColors.map((name, i) => ({
  key: name,
  img: `/images/muebles/Colores${String(i + 1).padStart(2, '0')}.jpg`,
}))
const melaminaColors = commonMuebleColors.map((name, i) => ({
  key: name,
  img: `/images/muebles/Colores${String(i + 1).padStart(2, '0')}.jpg`,
}))

const terminaciones = [
  { key: 'Postformado', img: '/images/muebles/Cocina con postformado.png' },
  { key: 'Melamina', img: '/images/muebles/Cocina con melamina.png' },
  { key: 'Termolaminado', img: '/images/muebles/Cocina con termolaminado.png' },
]

// Eliminado el selector con fotos de tipo de mueble

const form = reactive({
  cubiertaTipo: null,
  materialMueble: null,
  color: null,
  muebleColor: null,
  medidas: { ancho: 100, alto: 90, fondo: 60 },
  cantidad: 1,
})

const openColors = reactive({
  Termolaminado: true,
  Postformado: false,
  Melamina: false,
})
const openCoverColors = reactive({ Cuarzo: true, Granito: true })

const imgPreview = reactive({ open: false, src: '', title: '' })
const openPreviewImg = (src, title) => {
  imgPreview.open = true
  imgPreview.src = src
  imgPreview.title = title
}
const closePreviewImg = () => {
  imgPreview.open = false
  imgPreview.src = ''
  imgPreview.title = ''
}

const onQuarzImgError = e => {
  const img = e.target
  const src = img.getAttribute('src') || ''
  const dot = src.lastIndexOf('.')
  const base = dot > -1 ? src.slice(0, dot) : src
  const list = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP']
  const currentExt = src.split('.').pop()?.toLowerCase() || ''
  const nextList = list.filter(ext => ext !== currentExt)
  const idx = Number(img.dataset.extIdx || 0)
  if (idx >= nextList.length) return
  img.dataset.extIdx = String(idx + 1)
  img.src = `${base}.${nextList[idx]}`
}

const baseCoverPrice = {
  Granito: 650000,
  Cuarzo: 800000,
}

const muebleRatePer100 = mat => {
  const m = String(mat || '').toLowerCase()
  if (m.includes('termolaminado')) return 250000
  if (m.includes('postformado')) return 100000
  if (m.includes('melamina')) return 100000
  return 0
}

// Sin multiplicadores por material de cubierta; el color de cuarzo define el precio

const lengthUnits = computed(() => {
  const a = Number(form.medidas.ancho) || 0
  return a / 100
})

const selectedCuarzo = computed(
  () => cuarzoColors.find(c => c.key === form.color) || null,
)

const selectedGranito = computed(
  () => granitoColors.find(c => c.key === form.color) || null,
)

const precioCubierta = computed(() => {
  if (form.cubiertaTipo === 'Cuarzo') {
    const rate = selectedCuarzo.value?.price || 0
    return Math.round(rate * lengthUnits.value)
  }
  if (form.cubiertaTipo === 'Granito') {
    const rate = selectedGranito.value?.price || 0
    return Math.round(rate * lengthUnits.value)
  }
  const base = baseCoverPrice[form.cubiertaTipo] || 0
  return Math.round(base * lengthUnits.value)
})

const precioMueble = computed(() => {
  const rate = muebleRatePer100(form.materialMueble)
  return Math.round(rate * lengthUnits.value)
})

const comunasRM = [
  'Santiago',
  'Cerrillos',
  'Cerro Navia',
  'Conchalí',
  'El Bosque',
  'Estación Central',
  'Huechuraba',
  'Independencia',
  'La Cisterna',
  'La Granja',
  'La Florida',
  'La Pintana',
  'La Reina',
  'Las Condes',
  'Lo Barnechea',
  'Lo Espejo',
  'Lo Prado',
  'Macul',
  'Maipú',
  'Ñuñoa',
  'Pedro Aguirre Cerda',
  'Peñalolén',
  'Providencia',
  'Pudahuel',
  'Quilicura',
  'Quinta Normal',
  'Recoleta',
  'Renca',
  'San Joaquín',
  'San Miguel',
  'San Ramón',
  'Vitacura',
  'Colina',
  'Lampa',
  'Tiltil',
  'Puente Alto',
  'Pirque',
  'San José de Maipo',
  'San Bernardo',
  'Buin',
  'Paine',
  'Calera de Tango',
  'Melipilla',
  'Curacaví',
  'María Pinto',
  'San Pedro',
  'Alhué',
  'Talagante',
  'El Monte',
  'Isla de Maipo',
  'Padre Hurtado',
  'Peñaflor',
]
const ringA = new Set([
  'Santiago',
  'Providencia',
  'Ñuñoa',
  'Las Condes',
  'Vitacura',
  'La Reina',
  'Macul',
  'San Miguel',
  'San Joaquín',
  'La Cisterna',
  'Pedro Aguirre Cerda',
  'San Ramón',
  'La Granja',
  'Estación Central',
  'Quinta Normal',
  'Independencia',
  'Recoleta',
  'Conchalí',
  'Huechuraba',
  'Renca',
  'Cerro Navia',
  'Lo Prado',
])
const ringB = new Set([
  'La Florida',
  'La Pintana',
  'El Bosque',
  'Maipú',
  'Pudahuel',
  'Cerrillos',
  'Quilicura',
  'Lo Espejo',
  'Peñalolén',
  'Lo Barnechea',
])
const ringC = new Set([
  'Puente Alto',
  'Pirque',
  'San José de Maipo',
  'San Bernardo',
  'Buin',
  'Paine',
  'Calera de Tango',
  'Colina',
  'Lampa',
  'Tiltil',
  'Melipilla',
  'Curacaví',
  'María Pinto',
  'San Pedro',
  'Alhué',
  'Talagante',
  'El Monte',
  'Isla de Maipo',
  'Padre Hurtado',
  'Peñaflor',
])
const trasladoComuna = ref('')
const getTrasladoPrice = comuna => {
  if (!comuna) return 0
  if (ringA.has(comuna)) return 25000
  if (ringB.has(comuna)) return 35000
  if (ringC.has(comuna)) return 45000
  return 0
}
const precioTraslado = computed(() => getTrasladoPrice(trasladoComuna.value))

const total = computed(() => {
  const qty = Number(form.cantidad) || 1
  return Math.max(
    0,
    (precioCubierta.value + precioMueble.value) * qty + precioTraslado.value,
  )
})

const formatPrice = p =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(p || 0)

const loadFilterOptions = async () => {
  try {
    const { data } = await catalogAPI.getFilterOptions()
    const filtros = data?.filtros || {}
    coloresDisponibles.value = Array.isArray(filtros.colores)
      ? filtros.colores
      : []
    if (!form.materialMueble) form.materialMueble = 'Melamina'
    if (!form.color && coloresDisponibles.value.length)
      form.color = coloresDisponibles.value[0]
  } catch (_) {
    coloresDisponibles.value = ['Blanco', 'Negro', 'Gris', 'Beige']
    if (!form.materialMueble) form.materialMueble = 'Melamina'
    if (!form.color) form.color = coloresDisponibles.value[0]
  }
}

const agregarAPedidos = () => {
  const item = {
    id: Date.now(),
    nombre: 'Cotización de mueble y cubierta',
    categoria: 'Cotizaciones',
    precio: total.value,
    cantidad: form.cantidad,
    detalles: {
      cubierta: { tipo: form.cubiertaTipo, color: form.color },
      mueble: { material: form.materialMueble, color: form.muebleColor },
      medidas: { ...form.medidas },
      precios: { cubierta: precioCubierta.value, mueble: precioMueble.value },
    },
  }
  draftStore.addProduct(item, 'Cotizaciones')
  toast.success('Agregado a Mis Pedidos')
  router.push('/pedidos')
}

const resumen = reactive({ open: false, id: null, created_at: '', data: null })

const mandarPedido = async () => {
  try {
    const medidasTxt = `${form.medidas.ancho}x${form.medidas.alto}x${form.medidas.fondo} cm`
    const payload = {
      cubierta: form.cubiertaTipo,
      material_mueble: form.materialMueble,
      color: form.muebleColor || form.color || '',
      color_cubierta: form.color || '',
      color_material: form.muebleColor || '',
      medidas: medidasTxt,
      precio_unitario: total.value,
      comuna: trasladoComuna.value || '',
      traslado_comuna: trasladoComuna.value || '',
      precio_traslado: precioTraslado.value,
      total_con_traslado: total.value,
    }
    const r = await api.post('/pedidos/cotizaciones/xano', payload)
    resumen.open = true
    resumen.id = r.data?.cotizacion?.id || r.data?.id || null
    resumen.created_at =
      r.data?.cotizacion?.created_at || new Date().toISOString()
    resumen.data = payload
    toast.success('Pedido enviado')
  } catch (error) {}
}

const closeResumen = () => {
  resumen.open = false
}

onMounted(() => {
  form.cubiertaTipo = coverTypes[0].key
  if (!form.materialMueble) form.materialMueble = 'Melamina'
  loadFilterOptions()
})
</script>

<template>
  <div class="container-custom section-padding">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Cotizaciones</h1>
      <p class="text-gray-600">
        Elige cubierta, materiales y mueble para tu proyecto
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <!-- Disclaimer -->
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-bold text-yellow-800">
                Importante – Proceso de Cotización
              </h3>
              <div class="mt-2 text-sm text-yellow-700 space-y-2">
                <p>
                  La información ingresada en este formulario corresponde únicamente a una cotización y no constituye una compra ni un compromiso de pago.
                </p>
                <p>
                  Una vez enviada la cotización, esta será revisada por un administrador, quien evaluará la información proporcionada. Posteriormente, la cotización podrá ser aceptada o rechazada.
                </p>
                <p>
                  En caso de ser aceptada, el cliente podrá descargar el archivo PDF de la cotización y deberá acercarse al local para continuar con el proceso de compra y coordinación correspondiente.
                </p>
                <p>
                  En caso de ser rechazada, se solicita al cliente comunicarse con el establecimiento, ya sea vía llamada telefónica o de manera presencial en el local, para recibir mayor información o realizar ajustes a la cotización.
                </p>
                <p>
                  Agradecemos su comprensión y preferencia.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h2 class="text-lg font-semibold mb-4">Tipo de cubierta</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                v-for="t in coverTypes"
                :key="t.key"
                class="p-2 border rounded-lg hover:border-primary-500 transition-colors"
                :class="{
                  'border-primary-600 ring-1 ring-primary-200':
                    form.cubiertaTipo === t.key,
                }"
                @click="form.cubiertaTipo = t.key"
              >
                <img
                  :src="t.img"
                  :alt="t.key"
                  class="w-full h-24 object-contain rounded-md bg-gray-50"
                  @error="onQuarzImgError"
                />
                <div class="mt-2 text-center text-sm font-medium">
                  {{ t.key }}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body space-y-4">
            <div v-if="form.cubiertaTipo === 'Cuarzo'" class="space-y-2">
              <button
                type="button"
                class="w-full flex items-center justify-between"
                @click="openCoverColors.Cuarzo = !openCoverColors.Cuarzo"
              >
                <div class="text-sm font-medium text-gray-700">
                  Colores de cuarzo
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-5 w-5 text-gray-600 transition-transform"
                  :class="openCoverColors.Cuarzo ? 'rotate-180' : 'rotate-0'"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div
                v-show="openCoverColors.Cuarzo"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <button
                  v-for="c in cuarzoColors"
                  :key="c.key"
                  class="p-3 border rounded-lg text-left hover:border-primary-500 transition-colors"
                  :class="{
                    'border-primary-600 ring-1 ring-primary-200':
                      form.color === c.key,
                  }"
                  @click="form.color = c.key"
                >
                  <img
                    :src="c.img"
                    :alt="c.key"
                    class="w-full h-20 object-cover rounded-md"
                    @error="onQuarzImgError"
                    @click.stop="openPreviewImg(c.img, c.key)"
                  />
                  <div class="mt-2 text-sm font-semibold">
                    {{ c.key }}
                  </div>
                  <div class="text-xs text-gray-600">
                    $ {{ formatPrice(c.price) }}/100 cm
                  </div>
                </button>
              </div>
            </div>
            <div v-if="form.cubiertaTipo === 'Granito'" class="space-y-2">
              <button
                type="button"
                class="w-full flex items-center justify-between"
                @click="openCoverColors.Granito = !openCoverColors.Granito"
              >
                <div class="text-sm font-medium text-gray-700">
                  Colores de granito
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-5 w-5 text-gray-600 transition-transform"
                  :class="openCoverColors.Granito ? 'rotate-180' : 'rotate-0'"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div
                v-show="openCoverColors.Granito"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <button
                  v-for="g in granitoColors"
                  :key="g.key"
                  class="p-3 border rounded-lg text-left hover:border-primary-500 transition-colors"
                  :class="{
                    'border-primary-600 ring-1 ring-primary-200':
                      form.color === g.key,
                  }"
                  @click="form.color = g.key"
                >
                  <img
                    :src="g.img"
                    :alt="g.key"
                    class="w-full h-20 object-cover rounded-md"
                    @error="onQuarzImgError"
                    @click.stop="openPreviewImg(g.img, g.key)"
                  />
                  <div class="mt-2 text-sm font-semibold">
                    {{ g.key }}
                  </div>
                  <div class="text-xs text-gray-600">
                    $ {{ formatPrice(g.price) }}/100 cm
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h2 class="text-lg font-semibold mb-4">Material del mueble</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                class="p-3 border rounded-lg hover:border-primary-500"
                :class="{
                  'border-primary-600 ring-1 ring-primary-200':
                    form.materialMueble === 'Termolaminado',
                }"
                @click="form.materialMueble = 'Termolaminado'"
              >
                <div class="text-sm font-semibold">Termolaminado</div>
                <div class="text-xs text-gray-600">
                  $ {{ formatPrice(250000) }}/100 cm
                </div>
              </button>
              <button
                class="p-3 border rounded-lg hover:border-primary-500"
                :class="{
                  'border-primary-600 ring-1 ring-primary-200':
                    form.materialMueble === 'Postformado',
                }"
                @click="form.materialMueble = 'Postformado'"
              >
                <div class="text-sm font-semibold">Postformado</div>
                <div class="text-xs text-gray-600">
                  $ {{ formatPrice(100000) }}/100 cm
                </div>
              </button>
              <button
                class="p-3 border rounded-lg hover:border-primary-500"
                :class="{
                  'border-primary-600 ring-1 ring-primary-200':
                    form.materialMueble === 'Melamina',
                }"
                @click="form.materialMueble = 'Melamina'"
              >
                <div class="text-sm font-semibold">Melamina</div>
                <div class="text-xs text-gray-600">
                  $ {{ formatPrice(100000) }}/100 cm
                </div>
              </button>
            </div>

            <div
              v-if="form.materialMueble === 'Termolaminado'"
              class="mt-4 space-y-2"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between"
                @click="openColors.Termolaminado = !openColors.Termolaminado"
              >
                <div class="text-sm font-medium text-gray-700">
                  Colores de termolaminado
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-5 w-5 text-gray-600 transition-transform"
                  :class="openColors.Termolaminado ? 'rotate-180' : 'rotate-0'"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div
                v-show="openColors.Termolaminado"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <button
                  v-for="t in termolaminadoColors"
                  :key="t.key"
                  class="p-3 border rounded-lg text-left hover:border-primary-500 transition-colors"
                  :class="{
                    'border-primary-600 ring-1 ring-primary-200':
                      form.muebleColor === t.key,
                  }"
                  @click="form.muebleColor = t.key"
                >
                  <img
                    :src="t.img"
                    :alt="t.key"
                    class="w-full h-20 object-cover rounded-md"
                    @error="onQuarzImgError"
                    @click.stop="openPreviewImg(t.img, t.key)"
                  />
                  <div class="mt-2 text-sm font-semibold">
                    {{ t.key }}
                  </div>
                </button>
              </div>
            </div>

            <div
              v-if="form.materialMueble === 'Postformado'"
              class="mt-4 space-y-2"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between"
                @click="openColors.Postformado = !openColors.Postformado"
              >
                <div class="text-sm font-medium text-gray-700">
                  Colores de postformado
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-5 w-5 text-gray-600 transition-transform"
                  :class="openColors.Postformado ? 'rotate-180' : 'rotate-0'"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div
                v-show="openColors.Postformado"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <button
                  v-for="p in postformadoColors"
                  :key="p.key"
                  class="p-3 border rounded-lg text-left hover:border-primary-500 transition-colors"
                  :class="{
                    'border-primary-600 ring-1 ring-primary-200':
                      form.muebleColor === p.key,
                  }"
                  @click="form.muebleColor = p.key"
                >
                  <img
                    :src="p.img"
                    :alt="p.key"
                    class="w-full h-20 object-cover rounded-md"
                    @error="onQuarzImgError"
                    @click.stop="openPreviewImg(p.img, p.key)"
                  />
                  <div class="mt-2 text-sm font-semibold">
                    {{ p.key }}
                  </div>
                </button>
              </div>
            </div>

            <div
              v-if="form.materialMueble === 'Melamina'"
              class="mt-4 space-y-2"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between"
                @click="openColors.Melamina = !openColors.Melamina"
              >
                <div class="text-sm font-medium text-gray-700">
                  Colores de melamina
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-5 w-5 text-gray-600 transition-transform"
                  :class="openColors.Melamina ? 'rotate-180' : 'rotate-0'"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div
                v-show="openColors.Melamina"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <button
                  v-for="m in melaminaColors"
                  :key="m.key"
                  class="p-3 border rounded-lg text-left hover:border-primary-500 transition-colors"
                  :class="{
                    'border-primary-600 ring-1 ring-primary-200':
                      form.muebleColor === m.key,
                  }"
                  @click="form.muebleColor = m.key"
                >
                  <img
                    :src="m.img"
                    :alt="m.key"
                    class="w-full h-20 object-cover rounded-md"
                    @error="onQuarzImgError"
                    @click.stop="openPreviewImg(m.img, m.key)"
                  />
                  <div class="mt-2 text-sm font-semibold">
                    {{ m.key }}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h2 class="text-lg font-semibold mb-4">Terminaciones de muebles</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                v-for="t in terminaciones"
                :key="t.key"
                class="p-2 border rounded-lg hover:border-primary-500 transition-colors"
                @click="openPreviewImg(t.img, t.key)"
              >
                <img
                  :src="t.img"
                  :alt="t.key"
                  class="w-full h-40 object-cover rounded-md"
                  @error="onQuarzImgError"
                />
                <div class="mt-2 text-center text-sm font-medium">
                  {{ t.key }}
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Descripción de Acabados -->
        <div class="card">
          <div class="card-body">
            <h2 class="text-lg font-semibold mb-4">Acabados de los Muebles</h2>
            <p class="text-gray-700 mb-4 text-sm">
              Nuestros muebles de cocina están disponibles en los siguientes acabados, los cuales se adaptan a distintos estilos, necesidades y presupuestos:
            </p>
            
            <div class="space-y-4">
              <div>
                <h3 class="font-semibold text-gray-800 text-base">• Termolaminados</h3>
                <p class="text-gray-600 text-sm mt-1">
                  Acabado moderno y uniforme, recubierto con una lámina termoformada que ofrece alta resistencia a la humedad y una superficie fácil de limpiar. Ideal para cocinas de uso frecuente y diseños contemporáneos.
                </p>
              </div>
              
              <div>
                <h3 class="font-semibold text-gray-800 text-base">• Postformados</h3>
                <p class="text-gray-600 text-sm mt-1">
                  Caracterizados por sus bordes curvos y continuos, lo que evita uniones visibles. Este acabado proporciona una mayor protección contra la humedad y un diseño funcional, siendo una opción práctica y duradera.
                </p>
              </div>
              
              <div>
                <h3 class="font-semibold text-gray-800 text-base">• Melamina</h3>
                <p class="text-gray-600 text-sm mt-1">
                  Material versátil y económico, disponible en una amplia variedad de colores y texturas. Ofrece buena resistencia al uso diario y es una excelente alternativa para proyectos que buscan equilibrio entre costo y estética.
                </p>
              </div>
            </div>

            <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p class="text-sm text-blue-800">
                Si tiene alguna consulta o necesita orientación adicional, puede realizarla directamente a través de nuestro chatbot, el cual está disponible para asistirle durante el proceso de cotización.
              </p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ancho (cm)</label>
              <input
                v-model.number="form.medidas.ancho"
                type="number"
                min="40"
                max="300"
                class="input-field w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Alto (cm)</label>
              <input
                v-model.number="form.medidas.alto"
                type="number"
                min="60"
                max="240"
                class="input-field w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fondo (cm)</label>
              <input
                v-model.number="form.medidas.fondo"
                type="number"
                min="40"
                max="100"
                class="input-field w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="card">
          <div class="card-body space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600">Precio cubierta</div>
              <div class="text-lg font-semibold">
                $ {{ formatPrice(precioCubierta) }}
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600">Precio mueble</div>
              <div class="text-lg font-semibold">
                $ {{ formatPrice(precioMueble) }}
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600">Cantidad</div>
              <input
                v-model.number="form.cantidad"
                type="number"
                min="1"
                max="20"
                class="input-field w-24 text-center"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Comuna (Traslado)</label>
              <select v-model="trasladoComuna" class="input-field w-full">
                <option
disabled value="">Seleccione comuna</option>
                <option v-for="c in comunasRM" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600">Traslado</div>
              <div class="text-lg font-semibold">
                $ {{ formatPrice(precioTraslado) }}
              </div>
            </div>
            <hr>
            <div class="flex items-center justify-between">
              <div class="text-base font-medium">Total estimado</div>
              <div class="text-2xl font-bold text-primary-700">
                $ {{ formatPrice(total) }}
              </div>
            </div>
            <div class="grid grid-cols-1 gap-2 mt-4">
              <button class="btn-primary"
@click="mandarPedido">
                Mandar Pedido
              </button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-semibold mb-3">Resumen</h3>
            <ul class="space-y-2 text-sm text-gray-700">
              <li>
                <span class="font-medium">Cubierta:</span>
                {{ form.cubiertaTipo }} • {{ form.color }}
              </li>
              <li>
                <span class="font-medium">Mueble:</span>
                {{ form.materialMueble }}
                <template v-if="form.muebleColor">
                  • {{ form.muebleColor }}
                </template>
              </li>
              <li>
                <span class="font-medium">Medidas:</span>
                {{ form.medidas.ancho }}×{{ form.medidas.alto }}×{{
                  form.medidas.fondo
                }}
                cm
              </li>
              <li>
                <span class="font-medium">Traslado:</span>
                {{ trasladoComuna || '—' }}
                <template v-if="precioTraslado">
                  • $ {{ formatPrice(precioTraslado) }}
                </template>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="imgPreview.open"
    class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
    @click="closePreviewImg"
  >
    <div class="max-w-4xl w-full px-4" @click.stop>
      <img
        :src="imgPreview.src"
        :alt="imgPreview.title"
        class="w-full max-h-[80vh] object-contain rounded-lg bg-white"
        @error="onQuarzImgError"
      />
      <div class="mt-2 text-center text-sm font-medium text-white">
        {{ imgPreview.title }}
      </div>
    </div>
  </div>

  <div
    v-if="resumen.open"
    class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
    @click="closeResumen"
  >
    <div class="max-w-xl w-full px-4"
@click.stop>
      <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 class="text-lg font-semibold mb-4">Resumen del pedido</h3>
        <div class="space-y-2 text-sm text-gray-700">
          <div>
            <span class="font-medium">ID:</span> {{ resumen.id || '—' }}
          </div>
          <div>
            <span class="font-medium">Fecha:</span>
            {{
              new Date(resumen.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            }}
          </div>
          <div>
            <span class="font-medium">Cubierta:</span>
            {{ resumen.data?.cubierta }}
          </div>
          <div>
            <span class="font-medium">Material mueble:</span>
            {{ resumen.data?.material_mueble }}
          </div>
          <div>
            <span class="font-medium">Color:</span> {{ resumen.data?.color }}
          </div>
          <div>
            <span class="font-medium">Medidas:</span>
            {{ resumen.data?.medidas }}
          </div>
          <div>
            <span class="font-medium">Cantidad:</span> {{ form.cantidad }}
          </div>
          <div>
            <span class="font-medium">Precio unitario:</span> $
            {{ formatPrice(resumen.data?.precio_unitario) }}
          </div>
          <div>
            <span class="font-medium">Total:</span> $ {{ formatPrice(total) }}
          </div>
        </div>
        <div class="mt-4 text-right">
          <button
class="btn-primary" @click="closeResumen">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow border border-gray-200;
}
.card-body {
  @apply p-4 md:p-6;
}
.input-field {
  @apply border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400;
}
.btn-primary {
  @apply bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors;
}
.btn-secondary {
  @apply bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors;
}
.container-custom {
  @apply max-w-6xl mx-auto px-4;
}
.section-padding {
  @apply py-8;
}
</style>
