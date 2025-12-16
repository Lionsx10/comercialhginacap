<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

// Estado del formulario
const form = reactive({
  tipoEspacio: '',
  dimensiones: {
    largo: null,
    ancho: null,
    altura: null,
  },
  estilo: '',
  presupuesto: '',
  colores: [],
  materiales: [],
  descripcion: '',
  especificaciones: {
    puertas: 0,
    cajones: 0,
    bisagra: 'estandar',
    corredera: 'simple',
    acabado: 'mate',
  },
  presupuestoMaximo: null,
})

// Estado de la UI
const isGenerating = ref(false)
const isSaving = ref(false)
const isLoadingHistory = ref(true)

// Errores
const errors = reactive({
  tipoEspacio: '',
  estilo: '',
  presupuesto: '',
  general: '',
})

// Datos
const currentRecommendation = ref(null)
const recommendationHistory = ref([])

// Opciones disponibles
const coloresDisponibles = [
  { value: 'blanco', label: 'Blanco', hex: '#FFFFFF' },
  { value: 'negro', label: 'Negro', hex: '#000000' },
  { value: 'gris', label: 'Gris', hex: '#6B7280' },
  { value: 'beige', label: 'Beige', hex: '#F5F5DC' },
  { value: 'marron', label: 'Marrón', hex: '#8B4513' },
  { value: 'azul', label: 'Azul', hex: '#3B82F6' },
  { value: 'verde', label: 'Verde', hex: '#10B981' },
  { value: 'rojo', label: 'Rojo', hex: '#EF4444' },
]

const materialesDisponibles = [
  'Madera',
  'Metal',
  'Vidrio',
  'Cuero',
  'Tela',
  'Plástico',
  'Mármol',
  'Cerámica',
]

// Opciones de herrajes y acabado
const opcionesBisagra = [
  { value: 'estandar', label: 'Estándar' },
  { value: 'cierre_suave', label: 'Cierre suave' },
  { value: 'oculta', label: 'Oculta' },
]
const opcionesCorredera = [
  { value: 'simple', label: 'Simple' },
  { value: 'telescopica', label: 'Telescópica' },
  { value: 'cierre_suave', label: 'Cierre suave' },
]
const opcionesAcabado = [
  { value: 'mate', label: 'Mate' },
  { value: 'brillante', label: 'Brillante' },
  { value: 'texturizado', label: 'Texturizado' },
]

// Validar formulario
const validateForm = () => {
  // Limpiar errores
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  let isValid = true

  if (!form.tipoEspacio) {
    errors.tipoEspacio = 'El tipo de espacio es requerido'
    isValid = false
  }

  if (!form.estilo) {
    errors.estilo = 'El estilo es requerido'
    isValid = false
  }

  if (!form.presupuesto) {
    errors.presupuesto = 'El presupuesto es requerido'
    isValid = false
  }

  // Validar dimensiones
  if (!form.dimensiones.largo || Number(form.dimensiones.largo) <= 0) {
    errors.general = 'Las dimensiones deben ser mayores a 0'
    isValid = false
  }
  if (!form.dimensiones.ancho || Number(form.dimensiones.ancho) <= 0) {
    errors.general = 'Las dimensiones deben ser mayores a 0'
    isValid = false
  }
  if (!form.dimensiones.altura || Number(form.dimensiones.altura) <= 0) {
    errors.general = 'Las dimensiones deben ser mayores a 0'
    isValid = false
  }

  // Validaciones para nuevos campos
  const p = Number(form.especificaciones.puertas || 0)
  const c = Number(form.especificaciones.cajones || 0)
  if (p < 0 || c < 0) {
    errors.general = 'Puertas y cajones deben ser números positivos'
    isValid = false
  }

  return isValid
}

// Generar recomendación
// Adaptar datos del formulario al endpoint /recomendaciones/generar
const mapFormToIARequest = () => {
  const dimensiones = {
    largo: Number(form.dimensiones.largo || 0),
    ancho: Number(form.dimensiones.ancho || 0),
    altura: Number(form.dimensiones.altura || 0),
  }

  // Estilo tal cual selecciona el usuario (minúsculas como opciones)
  const estilo = (form.estilo || '').trim()

  // Presupuesto etiqueta (bajo|medio|alto|premium)
  const presupuesto = form.presupuesto || ''

  // Usar arreglos como espera el backend
  const colores =
    form.colores && form.colores.length > 0 ? form.colores : ['blanco']
  const materiales =
    form.materiales && form.materiales.length > 0 ? form.materiales : ['Madera']

  return {
    // Campos requeridos por el backend (Joi Schema)
    medidas: {
      largo: dimensiones.largo,
      ancho: dimensiones.ancho,
      alto: dimensiones.altura,
      unidad: 'cm',
    },
    material: materiales[0] || 'Madera',
    color: colores[0] || 'Blanco',
    descripcion_adicional: form.descripcion || '',
    tipo_mueble: form.tipoEspacio || 'Mueble',
    presupuesto_estimado: form.presupuestoMaximo
      ? Number(form.presupuestoMaximo)
      : undefined,

    // Campos originales usados por el frontend
    tipoEspacio: form.tipoEspacio || '',
    dimensiones,
    estilo,
    presupuesto,
    colores,
    materiales,
    descripcion: form.descripcion || '',
    especificaciones: {
      puertas: Number(form.especificaciones.puertas || 0),
      cajones: Number(form.especificaciones.cajones || 0),
      bisagra: form.especificaciones.bisagra || 'estandar',
      corredera: form.especificaciones.corredera || 'simple',
      acabado: form.especificaciones.acabado || 'mate',
    },
    presupuesto_maximo: form.presupuestoMaximo
      ? Number(form.presupuestoMaximo)
      : null,
  }
}

const isGeneratingImage = ref(false)
const imageGenerationStatus = ref('')

// Polling de imagen
const pollImageStatus = async requestId => {
  console.log('Iniciando polling para ID:', requestId)
  isGeneratingImage.value = true
  imageGenerationStatus.value = 'Iniciando generación...'

  const poll = async () => {
    try {
      console.log('Consultando estado imagen:', requestId)
      const response = await api.get(
        `/recomendaciones/estado-imagen/${requestId}`,
      )
      const status = response.data
      console.log('Estado recibido:', status)
      
      if (status.done) {
        if (status.image_url) {
          console.log('Imagen generada:', status.image_url)
          currentRecommendation.value.imagen_generada_url = status.image_url
          imageGenerationStatus.value = '¡Imagen generada!'
        } else {
          console.warn('Proceso terminado pero sin URL de imagen')
          imageGenerationStatus.value = 'No se pudo generar la imagen.'
        }
        isGeneratingImage.value = false
      } else {
        // Actualizar estado
        if (status.processing) {
          imageGenerationStatus.value = 'Procesando imagen...'
        } else if (status.wait_time) {
          imageGenerationStatus.value = `En cola (espera aprox: ${status.wait_time}s)...`
        } else {
          imageGenerationStatus.value = `En cola (posición: ${status.queue_position})...`
        }

        // Continuar polling
        setTimeout(poll, 2000)
      }
    } catch (error) {
      console.error('Error polling image:', error)
      // No detener polling inmediatamente por un error de red transitorio,
      // pero si es 404 o 400, detener.
      if (
        error.response &&
        (error.response.status === 404 || error.response.status === 400)
      ) {
        // Verificar si es un error real o si la imagen ya se generó y el ID expiró
        if (currentRecommendation.value.imagen_generada_url) {
          console.log('Error ignorado: La imagen ya se generó correctamente.')
          isGeneratingImage.value = false
        } else {
          imageGenerationStatus.value = 'Error: Solicitud no encontrada.'
          isGeneratingImage.value = false
        }
      } else {
        // Reintentar en 5s si es error de conexión
        setTimeout(poll, 5000)
      }
    }
  }

  // Iniciar primer poll
  setTimeout(poll, 2000)
}

const generateRecommendation = async () => {
  if (!validateForm()) {
    return
  }

  isGenerating.value = true
  errors.general = ''

  try {
    const payload = mapFormToIARequest()

    // Preparar payload exclusivo para la API (filtrando campos extra)
    const apiPayload = {
      medidas: payload.medidas,
      material: payload.materiales, // Enviar array
      color: payload.colores, // Enviar array
      estilo: payload.estilo,
      tipo_mueble: payload.tipo_mueble,
      presupuesto_estimado: payload.presupuesto_estimado,
      descripcion_adicional: payload.descripcion_adicional || undefined,
      especificaciones: payload.especificaciones, // Enviar especificaciones
    }

    const response = await api.post('/recomendaciones/ia', apiPayload)

    console.log('Respuesta completa API:', response.data)

    // La respuesta del backend viene envuelta en { message, recomendacion: {...}, horde_request_id }
    // Desempaquetamos la recomendación para que la vista pueda acceder a sus propiedades
    currentRecommendation.value = response.data.recomendacion || response.data

    // Asegurar que prompt_used esté disponible en currentRecommendation
    if (
      !currentRecommendation.value.prompt_used &&
      response.data.recomendacion &&
      response.data.recomendacion.prompt_used
    ) {
      currentRecommendation.value.prompt_used =
        response.data.recomendacion.prompt_used
    }

    // Si hay un ID de solicitud de imagen (en nivel superior o dentro de la recomendación), iniciar polling
    const requestId =
      response.data.horde_request_id ||
      (response.data.recomendacion &&
        response.data.recomendacion.horde_request_id)

    console.log('Horde Request ID encontrado:', requestId)
    console.log('Prompt Used:', currentRecommendation.value.prompt_used)

    if (requestId) {
      // Forzar estado de carga visualmente inmediato
      isGeneratingImage.value = true
      imageGenerationStatus.value = 'Iniciando generación...'
      pollImageStatus(requestId)
    } else {
      console.warn(
        'No se recibió horde_request_id, no se iniciará polling de imagen.',
      )
    }

    toast.success('¡Recomendación generada exitosamente!')

    // Recargar historial
    // loadRecommendationHistory() // Deshabilitado temporalmente hasta alinear endpoints
  } catch (error) {
    console.error('Error generando recomendación:', error)

    if (error.response?.status === 422) {
      const serverErrors = error.response.data.errors || {}
      Object.keys(serverErrors).forEach(field => {
        if (errors.hasOwnProperty(field)) {
          errors[field] = Array.isArray(serverErrors[field])
            ? serverErrors[field][0]
            : serverErrors[field]
        }
      })
    } else {
      errors.general =
        'Error al generar la recomendación. Por favor, inténtalo de nuevo.'
    }
  } finally {
    isGenerating.value = false
  }
}

// Guardar recomendación
const saveRecommendation = async () => {
  if (!currentRecommendation.value) return

  isSaving.value = true

  try {
    await api.post('/recomendaciones/guardar', {
      recomendacion_id: currentRecommendation.value.id,
    })
    toast.success('Recomendación guardada exitosamente')
    loadRecommendationHistory()
  } catch (error) {
    console.error('Error guardando recomendación:', error)
    toast.error('Error al guardar la recomendación')
  } finally {
    isSaving.value = false
  }
}

// Crear pedido
const createOrder = () => {
  if (!currentRecommendation.value) return

  router.push({
    name: 'NuevoPedido',
    query: { recomendacion_id: currentRecommendation.value.id },
  })
}

// Compartir recomendación
const shareRecommendation = async () => {
  if (!currentRecommendation.value) return

  try {
    if (navigator.share) {
      await navigator.share({
        title: currentRecommendation.value.titulo,
        text: currentRecommendation.value.descripcion,
        url: window.location.href,
      })
    } else {
      // Fallback: copiar al portapapeles
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado al portapapeles')
    }
  } catch (error) {
    console.error('Error compartiendo:', error)
    toast.error('Error al compartir la recomendación')
  }
}

// Cargar historial de recomendaciones
const loadRecommendationHistory = async () => {
  try {
    isLoadingHistory.value = true
    const response = await api.get('/recomendaciones')
    recommendationHistory.value = response.data.data || response.data
  } catch (error) {
    console.error('Error cargando historial:', error)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // No mostrar error rojo si no hay sesión; dar aviso informativo
      toast.info('Inicia sesión para ver tu historial de recomendaciones')
    } else {
      toast.error('Error al cargar el historial de recomendaciones')
    }
  } finally {
    isLoadingHistory.value = false
  }
}

// Cargar recomendación específica
const loadRecommendation = async recommendation => {
  try {
    const response = await api.get(`/recomendaciones/${recommendation.id}`)
    currentRecommendation.value = response.data
  } catch (error) {
    console.error('Error cargando recomendación:', error)
    toast.error('Error al cargar la recomendación')
  }
}

// Eliminar recomendación
const deleteRecommendation = async id => {
  if (!confirm('¿Estás seguro de que quieres eliminar esta recomendación?')) {
    return
  }

  try {
    await api.delete(`/recomendaciones/${id}`)
    toast.success('Recomendación eliminada')
    loadRecommendationHistory()

    // Si es la recomendación actual, limpiarla
    if (currentRecommendation.value?.id === id) {
      currentRecommendation.value = null
    }
  } catch (error) {
    console.error('Error eliminando recomendación:', error)
    toast.error('Error al eliminar la recomendación')
  }
}

// Ir a producto
const goToProduct = productId => {
  router.push(`/catalogo/${productId}`)
}

// Formatear precio
const formatPrice = price => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Formatear fecha
const formatDate = dateString => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Cargar datos al montar
onMounted(() => {
  // Cargar historial solo si el usuario está autenticado
  if (authStore.isAuthenticated) {
    loadRecommendationHistory()
  } else {
    isLoadingHistory.value = false
  }
})
</script>

<template>
  <div class="container-custom section-padding">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        Recomendaciones de IA
      </h1>
      <p class="mt-2 text-gray-600">
        Obtén recomendaciones personalizadas de muebles basadas en tus
        necesidades y preferencias
      </p>
    </div>

    <!-- Formulario de recomendación -->
    <div class="card mb-8">
      <div class="card-header">
        <h2 class="text-xl font-semibold text-gray-900">
          Nueva Recomendación
        </h2>
        <p class="text-sm text-gray-600 mt-1">
          Describe tus necesidades y preferencias para obtener recomendaciones
          personalizadas
        </p>
      </div>

      <div class="card-body">
        <form
          class="space-y-6"
          @submit.prevent="generateRecommendation"
        >
          <!-- Tipo de espacio -->
          <div class="form-group">
            <label
              for="tipoEspacio"
              class="input-label"
            >
              Tipo de espacio *
            </label>
            <select
              id="tipoEspacio"
              v-model="form.tipoEspacio"
              required
              class="form-select"
              :class="{
                'border-red-300 focus:ring-red-500': errors.tipoEspacio,
              }"
            >
              <option value="">
                Selecciona el tipo de espacio
              </option>
              <option value="cocina">
                Cocina
              </option>
              <option value="closet">
                Closet
              </option>
            </select>
            <p
              v-if="errors.tipoEspacio"
              class="input-error"
            >
              {{ errors.tipoEspacio }}
            </p>
          </div>

          <!-- Dimensiones del espacio -->
          <div class="form-group">
            <label class="input-label">Dimensiones del espacio</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  for="largo"
                  class="block text-sm text-gray-600 mb-1"
                >Largo (metros)</label>
                <input
                  id="largo"
                  v-model.number="form.dimensiones.largo"
                  type="number"
                  step="0.1"
                  min="0"
                  class="input-field"
                  placeholder="3.5"
                >
              </div>
              <div>
                <label
                  for="ancho"
                  class="block text-sm text-gray-600 mb-1"
                >Ancho (metros)</label>
                <input
                  id="ancho"
                  v-model.number="form.dimensiones.ancho"
                  type="number"
                  step="0.1"
                  min="0"
                  class="input-field"
                  placeholder="2.8"
                >
              </div>
              <div>
                <label
                  for="altura"
                  class="block text-sm text-gray-600 mb-1"
                >Altura (metros)</label>
                <input
                  id="altura"
                  v-model.number="form.dimensiones.altura"
                  type="number"
                  step="0.1"
                  min="0"
                  class="input-field"
                  placeholder="2.5"
                >
              </div>
            </div>
          </div>

          <!-- Estilo preferido -->
          <div class="form-group">
            <label
              for="estilo"
              class="input-label"
            > Estilo preferido * </label>
            <select
              id="estilo"
              v-model="form.estilo"
              required
              class="form-select"
              :class="{ 'border-red-300 focus:ring-red-500': errors.estilo }"
            >
              <option value="">
                Selecciona un estilo
              </option>
              <option value="moderno">
                Moderno
              </option>
              <option value="contemporaneo">
                Contemporáneo
              </option>
              <option value="minimalista">
                Minimalista
              </option>
              <option value="industrial">
                Industrial
              </option>
              <option value="escandinavo">
                Escandinavo
              </option>
              <option value="rustico">
                Rústico
              </option>
              <option value="clasico">
                Clásico
              </option>
              <option value="vintage">
                Vintage
              </option>
              <option value="bohemio">
                Bohemio
              </option>
            </select>
            <p
              v-if="errors.estilo"
              class="input-error"
            >
              {{ errors.estilo }}
            </p>
          </div>

          <!-- Presupuesto -->
          <div class="form-group">
            <label
              for="presupuesto"
              class="input-label"
            >
              Presupuesto aproximado *
            </label>
            <select
              id="presupuesto"
              v-model="form.presupuesto"
              required
              class="form-select"
              :class="{
                'border-red-300 focus:ring-red-500': errors.presupuesto,
              }"
            >
              <option value="">
                Selecciona tu presupuesto
              </option>
              <option value="bajo">
                Hasta $50,000
              </option>
              <option value="medio">
                $50,000 - $150,000
              </option>
              <option value="alto">
                $150,000 - $300,000
              </option>
              <option value="premium">
                Más de $300,000
              </option>
            </select>
            <p
              v-if="errors.presupuesto"
              class="input-error"
            >
              {{ errors.presupuesto }}
            </p>
          </div>

          <!-- Colores preferidos -->
          <div class="form-group">
            <label class="input-label">Colores preferidos</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label
                v-for="color in coloresDisponibles"
                :key="color.value"
                class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                :class="
                  form.colores.includes(color.value)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300'
                "
              >
                <input
                  v-model="form.colores"
                  type="checkbox"
                  :value="color.value"
                  class="sr-only"
                >
                <div
                  class="w-4 h-4 rounded-full mr-2 border border-gray-300"
                  :style="{ backgroundColor: color.hex }"
                />
                <span class="text-sm">{{ color.label }}</span>
              </label>
            </div>
          </div>

          <!-- Materiales preferidos -->
          <div class="form-group">
            <label class="input-label">Materiales preferidos</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label
                v-for="material in materialesDisponibles"
                :key="material"
                class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                :class="
                  form.materiales.includes(material)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300'
                "
              >
                <input
                  v-model="form.materiales"
                  type="checkbox"
                  :value="material"
                  class="sr-only"
                >
                <span class="text-sm">{{ material }}</span>
              </label>
            </div>
          </div>

          <!-- Especificaciones del mueble -->
          <div class="form-group">
            <label class="input-label">Especificaciones del mueble</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  for="puertas"
                  class="block text-sm text-gray-600 mb-1"
                >Número de puertas</label>
                <input
                  id="puertas"
                  v-model.number="form.especificaciones.puertas"
                  type="number"
                  min="0"
                  class="input-field"
                  placeholder="2"
                >
              </div>
              <div>
                <label
                  for="cajones"
                  class="block text-sm text-gray-600 mb-1"
                >Número de cajones</label>
                <input
                  id="cajones"
                  v-model.number="form.especificaciones.cajones"
                  type="number"
                  min="0"
                  class="input-field"
                  placeholder="3"
                >
              </div>
              <div>
                <label
                  for="bisagra"
                  class="block text-sm text-gray-600 mb-1"
                >Tipo de bisagra</label>
                <select
                  id="bisagra"
                  v-model="form.especificaciones.bisagra"
                  class="form-select"
                >
                  <option
                    v-for="opt in opcionesBisagra"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label
                  for="corredera"
                  class="block text-sm text-gray-600 mb-1"
                >Tipo de corredera</label>
                <select
                  id="corredera"
                  v-model="form.especificaciones.corredera"
                  class="form-select"
                >
                  <option
                    v-for="opt in opcionesCorredera"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label
                  for="acabado"
                  class="block text-sm text-gray-600 mb-1"
                >Acabado</label>
                <select
                  id="acabado"
                  v-model="form.especificaciones.acabado"
                  class="form-select"
                >
                  <option
                    v-for="opt in opcionesAcabado"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label
                  for="presupuestoMaximo"
                  class="block text-sm text-gray-600 mb-1"
                >Presupuesto máximo ($)</label>
                <input
                  id="presupuestoMaximo"
                  v-model.number="form.presupuestoMaximo"
                  type="number"
                  min="0"
                  step="1000"
                  class="input-field"
                  placeholder="200000"
                >
              </div>
            </div>
          </div>

          <!-- Descripción adicional -->
          <div class="form-group">
            <label
              for="descripcion"
              class="input-label"
            >
              Descripción adicional
            </label>
            <textarea
              id="descripcion"
              v-model="form.descripcion"
              rows="4"
              class="form-textarea"
              placeholder="Describe cualquier requerimiento específico, funcionalidades especiales, o detalles adicionales sobre lo que buscas..."
            />
            <p class="input-help">
              Ejemplo: "Necesito un sofá cómodo para 4 personas, con
              almacenamiento, que combine con mi mesa de centro de madera"
            </p>
          </div>

          <!-- Botón de envío -->
          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="isGenerating"
              class="btn-primary px-8 py-3"
              :class="{ 'opacity-50 cursor-not-allowed': isGenerating }"
            >
              <svg
                v-if="isGenerating"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{
                isGenerating
                  ? 'Generando recomendación...'
                  : 'Generar Recomendación'
              }}
            </button>
          </div>

          <!-- Error general -->
          <div
            v-if="errors.general"
            class="alert-error"
          >
            <div class="flex">
              <div class="flex-shrink-0">
                <svg
                  class="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm">
                  {{ errors.general }}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Resultado de la recomendación -->
    <div
      v-if="currentRecommendation"
      class="card mb-8"
    >
      <div class="card-header">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            Tu Recomendación Personalizada
          </h2>
          <span class="badge-success">Generada por IA</span>
        </div>
      </div>

      <div class="card-body">
        <!-- Información general -->
        <div class="mb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            Detalle de la Recomendación
          </h3>
          <p class="text-gray-600 whitespace-pre-line">
            {{ currentRecommendation.texto_recomendacion }}
          </p>
        </div>

        <!-- Productos recomendados -->
        <div
          v-if="
            currentRecommendation.productos_sugeridos &&
              currentRecommendation.productos_sugeridos.length > 0
          "
          class="mb-6"
        >
          <h4 class="text-md font-medium text-gray-900 mb-4">
            Productos Recomendados
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="producto in currentRecommendation.productos_sugeridos"
              :key="producto.id"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              @click="goToProduct(producto.id)"
            >
              <img
                :src="producto.imagen_url || '/images/muebles/img1.jpg'"
                :alt="producto.nombre"
                class="w-full h-32 object-cover rounded-lg mb-3"
              >
              <h5 class="font-medium text-gray-900">
                {{ producto.nombre }}
              </h5>
              <p class="text-lg font-semibold text-primary-600 mt-2">
                ${{ formatPrice(producto.precio_base) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Detalles adicionales -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-if="currentRecommendation.tiempo_estimado">
            <h5 class="font-medium text-gray-900 mb-2">
              Tiempo de Producción
            </h5>
            <p class="text-gray-600">
              {{ currentRecommendation.tiempo_estimado.dias_promedio }} días ({{
                currentRecommendation.tiempo_estimado.dias_minimo
              }}-{{ currentRecommendation.tiempo_estimado.dias_maximo }})
            </p>
          </div>

          <div v-if="currentRecommendation.estimacion_precio">
            <h5 class="font-medium text-gray-900 mb-2">
              Precio Estimado Total
            </h5>
            <p class="text-2xl font-semibold text-primary-600">
              ${{
                formatPrice(currentRecommendation.estimacion_precio.promedio)
              }}
            </p>
            <p class="text-sm text-gray-600">
              Rango: ${{
                formatPrice(currentRecommendation.estimacion_precio.minimo)
              }}
              - ${{
                formatPrice(currentRecommendation.estimacion_precio.maximo)
              }}
            </p>
          </div>
        </div>

        <!-- Imagen Generada por IA -->
        <div
          v-if="isGeneratingImage || currentRecommendation.imagen_generada_url"
          class="mt-6"
        >
          <h4 class="text-sm font-medium text-gray-900 mb-2">
            Visualización IA
          </h4>
          <div
            v-if="isGeneratingImage"
            class="bg-white rounded-lg p-8 flex flex-col items-center justify-center h-80 border border-gray-200 shadow-sm relative overflow-hidden"
            <!--
            Fondo
            animado
            sutil
            --
          >
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50 to-transparent opacity-50 animate-pulse" />
            >
          </div>

          <!-- Icono animado central -->
          <div class="relative z-10 mb-4">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600" />
          </div>

          <!-- Texto de estado -->
          <h5 class="relative z-10 text-lg font-semibold text-gray-800 mb-2">
            Generando tu diseño...
          </h5>
          <p class="relative z-10 text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
            {{ imageGenerationStatus }}
          </p>
          <p class="relative z-10 text-xs text-gray-500 mt-4 max-w-xs text-center">
            La IA está imaginando tu mueble basándose en tus preferencias. Esto puede tomar unos segundos.
          </p>
        </div>

        <div
          v-else-if="currentRecommendation.imagen_generada_url"
          class="rounded-lg overflow-hidden shadow-lg border border-gray-200 group"
        >
          <div class="relative aspect-video">
            <img 
              :src="currentRecommendation.imagen_generada_url" 
              alt="Diseño generado por IA" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
              <p class="text-white text-sm p-4 font-medium">
                Diseño generado exclusivamente para ti
              </p>
            </div>
          </div>
          <div
            class="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-200"
          >
            <span class="text-xs text-gray-500 flex items-center">
              <svg
                class="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
              Stable Horde AI
            </span>
            <a
              :href="currentRecommendation.imagen_generada_url"
              target="_blank"
              class="text-indigo-600 hover:text-indigo-800 text-xs font-semibold cursor-pointer"
            >
              Ver tamaño completo
            </a>
          </div>
        </div>
      </div>

      <!-- Prompt de IA -->
      <div
        v-if="currentRecommendation.prompt_used"
        class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
      >
        <h4 class="text-sm font-medium text-gray-900 mb-2">
          Prompt utilizado para la IA
        </h4>
        <p
          class="text-xs text-gray-600 font-mono bg-white p-3 rounded border border-gray-100 overflow-x-auto"
        >
          {{ currentRecommendation.prompt_used }}
        </p>
      </div>

      <!-- Acciones -->
      <div class="mt-6 flex flex-wrap gap-3">
        <button
          class="btn-primary"
          :disabled="isSaving"
          @click="saveRecommendation"
        >
          <svg
            v-if="isSaving"
            class="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ isSaving ? 'Guardando...' : 'Guardar Recomendación' }}
        </button>

        <button
          class="btn-success"
          @click="createOrder"
        >
          Crear Pedido
        </button>

        <button
          class="btn-secondary"
          @click="shareRecommendation"
        >
          Compartir
        </button>
      </div>
    </div>
  </div>

  <!-- Historial de recomendaciones -->
  <div class="card">
    <div class="card-header">
      <h2 class="text-xl font-semibold text-gray-900">
        Historial de Recomendaciones
      </h2>
    </div>

    <div class="card-body">
      <div
        v-if="isLoadingHistory"
        class="space-y-4"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="animate-pulse"
        >
          <div class="flex space-x-4">
            <div class="bg-gray-200 h-20 w-20 rounded-lg" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-3/4" />
              <div class="h-4 bg-gray-200 rounded w-1/2" />
              <div class="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="recommendationHistory.length === 0"
        class="text-center py-8"
      >
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">
          No hay recomendaciones anteriores
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          Genera tu primera recomendación usando el formulario de arriba.
        </p>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div
          v-for="recommendation in recommendationHistory"
          :key="recommendation.id"
          class="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          @click="loadRecommendation(recommendation)"
        >
          <div class="flex-shrink-0">
            <img
              :src="recommendation.imagen_url || '/placeholder-furniture.jpg'"
              :alt="recommendation.titulo"
              class="h-16 w-16 object-cover rounded-lg"
            >
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium text-gray-900">
              {{ recommendation.titulo }}
            </h4>
            <p class="text-sm text-gray-600 mt-1 line-clamp-2">
              {{ recommendation.descripcion }}
            </p>
            <div
              class="mt-2 flex items-center space-x-4 text-xs text-gray-500"
            >
              <span>{{ formatDate(recommendation.created_at) }}</span>
              <span v-if="recommendation.precio_estimado">
                ${{ formatPrice(recommendation.precio_estimado) }}
              </span>
              <span v-if="recommendation.productos_count">
                {{ recommendation.productos_count }} productos
              </span>
            </div>
          </div>

          <div class="flex-shrink-0">
            <button
              class="p-2 text-gray-400 hover:text-red-500 transition-colors"
              @click.stop="deleteRecommendation(recommendation.id)"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
