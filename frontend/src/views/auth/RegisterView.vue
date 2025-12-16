<script setup>
// IMPORTS - Importación de dependencias de Vue y librerías externas
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

// COMPOSABLES - Inicialización de composables y stores
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// ESTADO DEL FORMULARIO - Datos reactivos del formulario de registro
const form = reactive({
  nombre: '',
  email: '',
  telefono: '',
  password: '',
  password_confirmation: '',
  acceptTerms: false,
})

// ESTADO DE LA UI - Variables reactivas para controlar la interfaz
const isLoading = ref(false)
const showPassword = ref(false)
const showPasswordConfirm = ref(false)
const showTermsModal = ref(false)
const showPrivacyModal = ref(false)

// MANEJO DE ERRORES - Objeto reactivo para almacenar errores de validación
const errors = reactive({
  nombre: '',
  email: '',
  telefono: '',
  password: '',
  password_confirmation: '',
  acceptTerms: '',
  general: '',
})

// COMPUTED PROPERTIES - Propiedades computadas para la fortaleza de contraseña

// Calcula la fortaleza de la contraseña basada en varios criterios
const passwordStrength = computed(() => {
  const password = form.password
  if (!password) return 0

  let score = 0

  // Criterios de longitud
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  // Criterios de caracteres
  if (/[a-z]/.test(password)) score += 1 // Minúsculas
  if (/[A-Z]/.test(password)) score += 1 // Mayúsculas
  if (/[0-9]/.test(password)) score += 1 // Números
  if (/[^A-Za-z0-9]/.test(password)) score += 1 // Caracteres especiales

  return Math.min(score, 4)
})

// Texto descriptivo de la fortaleza de la contraseña
const passwordStrengthText = computed(() => {
  switch (passwordStrength.value) {
    case 0:
    case 1:
      return 'Débil'
    case 2:
      return 'Regular'
    case 3:
      return 'Buena'
    case 4:
      return 'Fuerte'
    default:
      return ''
  }
})

// Color del indicador de fortaleza de contraseña
const passwordStrengthColor = computed(() => {
  switch (passwordStrength.value) {
    case 0:
    case 1:
      return 'bg-red-500'
    case 2:
      return 'bg-yellow-500'
    case 3:
      return 'bg-blue-500'
    case 4:
      return 'bg-green-500'
    default:
      return 'bg-gray-300'
  }
})

// Ancho de la barra de progreso de fortaleza de contraseña
const passwordStrengthWidth = computed(() => {
  return `${(passwordStrength.value / 4) * 100}%`
})

// FUNCIONES DE VALIDACIÓN

// Función principal de validación del formulario
const validateForm = () => {
  // Limpiar errores previos
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  let isValid = true

  // Validar nombre completo
  if (!form.nombre.trim()) {
    errors.nombre = 'El nombre es requerido'
    isValid = false
  } else if (form.nombre.trim().length < 2) {
    errors.nombre = 'El nombre debe tener al menos 2 caracteres'
    isValid = false
  }

  // Validar email con expresión regular
  if (!form.email) {
    errors.email = 'El correo electrónico es requerido'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'El correo electrónico no es válido'
    isValid = false
  }

  // Validar teléfono: exactamente 9 dígitos, formato chileno "9 1234 5678"
  if (!form.telefono) {
    errors.telefono = 'El teléfono es requerido'
    isValid = false
  } else {
    const raw = form.telefono.replace(/\s/g, '')
    const patternOk =
      /^9\d{8}$/.test(raw) || /^9\s\d{4}\s\d{4}$/.test(form.telefono)
    if (!patternOk) {
      errors.telefono = 'Debe ser 9 dígitos: 9 1234 5678'
      isValid = false
    }
  }

  // Validar contraseña con criterios de seguridad
  if (!form.password) {
    errors.password = 'La contraseña es requerida'
    isValid = false
  } else if (form.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres'
    isValid = false
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = 'La contraseña debe incluir al menos 1 mayúscula'
    isValid = false
  } else if ((form.password.match(/\d/g) || []).length < 4) {
    errors.password = 'La contraseña debe incluir al menos 4 números'
    isValid = false
  } else if (!/[^A-Za-z0-9]/.test(form.password)) {
    errors.password = 'La contraseña debe incluir al menos 1 carácter especial'
    isValid = false
  }

  // Validar confirmación de contraseña
  if (!form.password_confirmation) {
    errors.password_confirmation = 'Debes confirmar tu contraseña'
    isValid = false
  } else if (form.password !== form.password_confirmation) {
    errors.password_confirmation = 'Las contraseñas no coinciden'
    isValid = false
  }

  // Validar aceptación de términos y condiciones
  if (!form.acceptTerms) {
    errors.acceptTerms = 'Debes aceptar los términos y condiciones'
    isValid = false
  }

  return isValid
}

// FUNCIÓN PRINCIPAL DE REGISTRO

// Maneja el proceso de registro del usuario
const handleRegister = async () => {
  // Validar formulario antes de enviar
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  errors.general = ''

  try {
    // Llamar al store de autenticación para registrar usuario
    const result = await authStore.register({
      nombre: form.nombre.trim(),
      email: form.email.toLowerCase().trim(),
      telefono: form.telefono.replace(/\s/g, ''),
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    if (result.success) {
      // Redirigir al login después del registro exitoso
      router.push('/login')
    }
  } catch (error) {
    console.error('Error en registro:', error)

    if (error.response?.status === 422) {
      // Manejar errores de validación del servidor
      const serverErrors = error.response.data.errors || {}
      Object.keys(serverErrors).forEach(field => {
        if (errors.hasOwnProperty(field)) {
          errors[field] = Array.isArray(serverErrors[field])
            ? serverErrors[field][0]
            : serverErrors[field]
        }
      })

      // Manejar error específico de email duplicado
      if (
        serverErrors.email &&
        serverErrors.email.includes('already been taken')
      ) {
        errors.email = 'Este correo electrónico ya está registrado'
      }
    } else {
      // Error general del servidor
      errors.general =
        'Error al crear la cuenta. Por favor, inténtalo de nuevo.'
    }
  } finally {
    isLoading.value = false
  }
}

// FUNCIONES AUXILIARES

// Función para limpiar errores específicos de campos
const clearFieldError = field => {
  if (errors[field]) {
    errors[field] = ''
  }
}

// WATCHERS - Observadores para limpiar errores cuando el usuario escribe
import { watch } from 'vue'

watch(
  () => form.nombre,
  () => clearFieldError('nombre')
)
watch(
  () => form.email,
  () => clearFieldError('email')
)
watch(
  () => form.telefono,
  () => clearFieldError('telefono')
)
watch(
  () => form.password,
  () => clearFieldError('password')
)
watch(
  () => form.password_confirmation,
  () => clearFieldError('password_confirmation')
)
watch(
  () => form.acceptTerms,
  () => clearFieldError('acceptTerms')
)
</script>

<template>
  <!-- Contenedor principal de la página de registro con diseño centrado -->
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
  >
    <RouterLink
      to="/"
      class="btn-primary fixed top-4 left-4 px-4 py-2 text-sm font-medium"
    >
      Volver al inicio
    </RouterLink>
    <div class="max-w-md w-full space-y-8">
      <!-- Header con logo y título -->
      <div>
        <!-- Logo de COMERCIAL HG -->
        <div class="mx-auto flex justify-center mb-6">
          <img
            src="@/assets/logo-comercial-hg.svg"
            alt="Comercial HG - Muebles De Baño y Cocina A Medidas"
            class="h-20 w-auto"
          />
        </div>
        <!-- Título principal de la página -->
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Crear Cuenta
        </h2>
      </div>

      <!-- Formulario de registro con prevención de envío por defecto -->
      <form class="mt-8 space-y-6"
@submit.prevent="handleRegister">
        <div class="space-y-4">
          <!-- Campo de nombre completo -->
          <div class="input-group">
            <label for="nombre"
class="input-label"> Nombre Completo </label>
            <input
              id="nombre"
              v-model="form.nombre"
              type="text"
              autocomplete="name"
              required
              class="input-field"
              :class="{ 'border-red-300 focus:ring-red-500': errors.nombre }"
              placeholder="Tu nombre completo"
            />
            <p v-if="errors.nombre"
class="input-error">
              {{ errors.nombre }}
            </p>
          </div>

          <!-- Campo de email con validación -->
          <div class="input-group">
            <label for="email"
class="input-label"> Correo Electrónico </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              class="input-field"
              :class="{ 'border-red-300 focus:ring-red-500': errors.email }"
              placeholder="tu@ejemplo.com"
            />
            <p v-if="errors.email"
class="input-error">
              {{ errors.email }}
            </p>
          </div>

          <!-- Campo de teléfono (opcional) -->
          <div class="input-group">
            <label for="telefono"
class="input-label"> Teléfono </label>
            <input
              id="telefono"
              v-model="form.telefono"
              type="tel"
              autocomplete="tel"
              class="input-field"
              :class="{ 'border-red-300 focus:ring-red-500': errors.telefono }"
              placeholder="9 1234 5678"
              inputmode="numeric"
              maxlength="11"
              pattern="^9 [0-9]{4} [0-9]{4}$|^9[0-9]{8}$"
            />
            <p v-if="errors.telefono"
class="input-error">
              {{ errors.telefono }}
            </p>
          </div>

          <!-- Campo de contraseña con indicador de fortaleza -->
          <div class="input-group">
            <label for="password"
class="input-label"> Contraseña </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                class="input-field pr-10"
                :class="{
                  'border-red-300 focus:ring-red-500': errors.password,
                }"
                placeholder="••••••••"
              />
              <!-- Botón para mostrar/ocultar contraseña -->
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
                <svg
                  v-else
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
            <p v-if="errors.password"
class="input-error">
              {{ errors.password }}
            </p>
            <!-- Indicador de fortaleza de contraseña -->
            <div v-if="form.password"
class="mt-2">
              <div class="flex items-center space-x-2">
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-300"
                    :class="passwordStrengthColor"
                    :style="{ width: passwordStrengthWidth }"
                  />
                </div>
                <span
                  class="text-xs font-medium"
                  :class="passwordStrengthColor.replace('bg-', 'text-')"
                >
                  {{ passwordStrengthText }}
                </span>
              </div>
            </div>
          </div>

          <!-- Campo de confirmación de contraseña con toggle de visibilidad -->
          <div class="input-group">
            <label for="password_confirmation"
class="input-label">
              Confirmar Contraseña
            </label>
            <div class="relative">
              <input
                id="password_confirmation"
                v-model="form.password_confirmation"
                :type="showPasswordConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                required
                class="input-field pr-10"
                :class="{
                  'border-red-300 focus:ring-red-500':
                    errors.password_confirmation,
                }"
                placeholder="••••••••"
              />
              <!-- Botón para mostrar/ocultar confirmación de contraseña -->
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showPasswordConfirm = !showPasswordConfirm"
              >
                <!-- Icono de ojo tachado cuando la contraseña es visible -->
                <svg
                  v-if="showPasswordConfirm"
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
                <!-- Icono de ojo normal cuando la contraseña está oculta -->
                <svg
                  v-else
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
            <!-- Mensaje de error específico para confirmación de contraseña -->
            <p v-if="errors.password_confirmation"
class="input-error">
              {{ errors.password_confirmation }}
            </p>
          </div>
        </div>

        <!-- Sección de términos y condiciones obligatorios -->
        <div class="flex items-start">
          <div class="flex items-center h-5">
            <!-- Checkbox para aceptar términos y condiciones -->
            <input
              id="terms"
              v-model="form.acceptTerms"
              type="checkbox"
              required
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              :class="{ 'border-red-300': errors.acceptTerms }"
            />
          </div>
          <div class="ml-3 text-sm">
            <!-- Etiqueta con enlaces a términos y política de privacidad -->
            <label for="terms"
class="text-gray-700">
              Acepto los
              <a
                href="#"
                class="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                @click.prevent="showTermsModal = true"
              >
                términos y condiciones
              </a>
              y la
              <a
                href="#"
                class="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                @click.prevent="showPrivacyModal = true"
              >
                política de privacidad
              </a>
            </label>
            <!-- Error específico para términos y condiciones -->
            <p v-if="errors.acceptTerms"
class="input-error mt-1">
              {{ errors.acceptTerms }}
            </p>
          </div>
        </div>

        <!-- Botón de envío del formulario con estado de carga -->
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary w-full flex justify-center py-3 px-4 text-sm font-medium"
            :class="{ 'opacity-50 cursor-not-allowed': isLoading }"
          >
            <!-- Spinner de carga cuando se está procesando el registro -->
            <svg
              v-if="isLoading"
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
            <!-- Texto dinámico del botón según el estado de carga -->
            {{ isLoading ? 'Creando cuenta...' : 'Crear Cuenta' }}
          </button>
        </div>

        <!-- Alerta de error general del formulario -->
        <div v-if="errors.general"
class="alert-error">
          <div class="flex">
            <div class="flex-shrink-0">
              <!-- Icono de error -->
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
              <!-- Mensaje de error general -->
              <p class="text-sm">
                {{ errors.general }}
              </p>
            </div>
          </div>
        </div>
      </form>

      <!-- Enlaces adicionales para navegación -->
      <div class="text-center">
        <p class="text-sm text-gray-600">
          ¿Ya tienes una cuenta?
          <!-- Enlace para redirigir al login -->
          <RouterLink
            to="/login"
            class="font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            Inicia sesión aquí
          </RouterLink>
        </p>
      </div>
    </div>
    <!-- Modales legales -->
    <div
      v-if="showTermsModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div
        class="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-hidden"
      >
        <div class="px-6 py-4 border-b">
          <h3 class="text-xl font-semibold text-gray-900">
            Términos y Condiciones
          </h3>
          <p class="text-xs text-gray-500">
            Última actualización: {{ new Date().toLocaleDateString() }}
          </p>
        </div>
        <div
          class="px-6 py-4 max-h-[60vh] overflow-y-auto text-gray-700 space-y-4"
        >
          <h3 class="text-xl font-semibold">Términos y Condiciones de Uso</h3>
          <p class="text-sm text-gray-600">
            Última actualización: Diciembre 2025
          </p>

          <h4 class="text-lg font-medium">
            1. Información general y aceptación
          </h4>
          <p>
            Los presentes Términos y Condiciones regulan el acceso, navegación y
            uso de la plataforma digital operada por Comercial HG, domiciliada
            en Franklin 565, Santiago Centro, Santiago, Chile. Al registrarse o
            utilizar los servicios de cotización y visualización ofrecidos, el
            usuario acepta someterse íntegramente a las disposiciones aquí
            establecidas.
          </p>

          <h4 class="text-lg font-medium">2. Naturaleza de los servicios</h4>
          <p>
            La plataforma proporciona herramientas tecnológicas para la
            configuración y cotización referencial de muebles a medida. El
            usuario declara conocer que, debido a la naturaleza personalizada de
            la fabricación, los servicios digitales constituyen una etapa
            preliminar de estimación y no un contrato de compraventa
            perfeccionado.
          </p>

          <h4 class="text-lg font-medium">
            3. Política de precios y cotizaciones
          </h4>
          <div class="space-y-3">
            <div>
              <h5 class="text-base font-semibold">
                3.1. Valores referenciales
              </h5>
              <p>
                Todos los precios emitidos por el sistema, incluidos aquellos
                calculados automáticamente según medidas y materiales, tienen
                carácter estrictamente referencial y estimativo. No constituyen
                una oferta vinculante ni un precio final de venta.
              </p>
            </div>
            <div>
              <h5 class="text-base font-semibold">3.2. Validación técnica</h5>
              <p>
                Todo proyecto requiere una validación técnica posterior por
                parte de especialistas de Comercial HG para verificar la
                factibilidad constructiva, rectificar medidas en terreno y
                confirmar el stock de materiales. El precio final será fijado
                únicamente tras dicha validación.
              </p>
            </div>
            <div>
              <h5 class="text-base font-semibold">3.3. Errores del sistema</h5>
              <p>
                Comercial HG se reserva el derecho de anular cotizaciones o
                pedidos que presenten errores manifiestos de precio debido a
                fallas algorítmicas, de integración de datos o errores
                tipográficos, sin que ello genere derecho a indemnización para
                el usuario.
              </p>
            </div>
          </div>

          <h4 class="text-lg font-medium">
            4. Uso de herramientas de Inteligencia Artificial (IA)
          </h4>
          <div class="space-y-3">
            <div>
              <h5 class="text-base font-semibold">4.1. Asistencia virtual</h5>
              <p>
                La información técnica proporcionada por el asistente
                “ComercialHG IA” es de carácter orientativo. El usuario debe
                validar cualquier decisión crítica sobre materiales o
                instalación con el personal humano de la empresa.
              </p>
            </div>
            <div>
              <h5 class="text-base font-semibold">
                4.2. Visualización predictiva
              </h5>
              <p>
                Las imágenes generadas mediante IA (superposición de muebles en
                fotografías del usuario) son prototipos conceptuales destinados
                a evaluar estética y estilo. No representan con exactitud
                milimétrica el color, textura, iluminación o dimensiones del
                producto final fabricado.
              </p>
            </div>
          </div>

          <h4 class="text-lg font-medium">
            5. Propiedad intelectual y contenido del usuario
          </h4>
          <div class="space-y-3">
            <div>
              <h5 class="text-base font-semibold">5.1. Licencia de uso</h5>
              <p>
                Al cargar fotografías de sus espacios privados en la plataforma,
                el usuario otorga a Comercial HG una licencia de uso temporal,
                no exclusiva y gratuita, con el único fin de procesar dichas
                imágenes mediante algoritmos de visión por computador para
                generar la visualización solicitada.
              </p>
            </div>
            <div>
              <h5 class="text-base font-semibold">5.2. Responsabilidad</h5>
              <p>
                El usuario garantiza ser el titular de los derechos de las
                imágenes subidas, liberando a Comercial HG de cualquier
                responsabilidad por reclamos de terceros sobre la privacidad o
                propiedad de dichas fotos.
              </p>
            </div>
          </div>

          <h4 class="text-lg font-medium">6. Limitación de responsabilidad</h4>
          <ul class="list-disc list-inside space-y-1">
            <li>
              Interrupciones del servicio derivadas de cortes de energía o
              fallos en proveedores de internet.
            </li>
            <li>
              Pérdida de datos de cotizaciones no guardadas por el usuario.
            </li>
            <li>
              Decisiones de compra basadas exclusivamente en la interpretación
              visual de las herramientas de IA.
            </li>
          </ul>

          <h4 class="text-lg font-medium">
            7. Legislación aplicable y jurisdicción
          </h4>
          <p>
            Estos términos se rigen por las leyes de la República de Chile. Para
            cualquier controversia derivada del uso de la plataforma, las partes
            se someten a la competencia de los Tribunales Ordinarios de Justicia
            de la comuna de Santiago.
          </p>
        </div>
        <div class="px-6 py-4 border-t flex items-center justify-between">
          <div class="text-sm text-gray-600">
            <RouterLink
              to="/terminos"
              class="text-primary-600 hover:text-primary-500"
            >
              Ver versión completa
            </RouterLink>
          </div>
          <div class="space-x-2">
            <button
              class="btn-secondary px-4 py-2"
              @click="showTermsModal = false"
            >
              Cerrar
            </button>
            <button
              class="btn-primary px-4 py-2"
              @click="((showTermsModal = false), (form.acceptTerms = true))"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showPrivacyModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div
        class="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-hidden"
      >
        <div class="px-6 py-4 border-b">
          <h3 class="text-xl font-semibold text-gray-900">
            Política de Privacidad y Protección de Datos
          </h3>
          <p class="text-xs text-gray-500">
            Última actualización: {{ new Date().toLocaleDateString() }}
          </p>
        </div>
        <div
          class="px-6 py-4 max-h-[60vh] overflow-y-auto text-gray-700 space-y-4"
        >
          <h4 class="text-lg font-medium">1. Responsable del tratamiento</h4>
          <p>
            El responsable del tratamiento de los datos personales recolectados
            a través de esta plataforma es Comercial HG, con domicilio comercial
            en Franklin 565, Santiago Centro, Santiago, Chile.
          </p>

          <h4 class="text-lg font-medium">2. Recopilación de datos</h4>
          <p>
            En cumplimiento con la Ley N° 19.628 sobre Protección de la Vida
            Privada, informamos que recopilamos los siguientes datos para la
            prestación del servicio:
          </p>
          <div class="space-y-2">
            <div>
              <h5 class="text-base font-semibold">Datos identificatorios</h5>
              <p>
                Nombre completo, correo electrónico, número telefónico (+569...)
                y dirección.
              </p>
            </div>
            <div>
              <h5 class="text-base font-semibold">Datos del proyecto</h5>
              <p>Medidas, preferencias de materiales y presupuesto estimado.</p>
            </div>
            <div>
              <h5 class="text-base font-semibold">Datos visuales</h5>
              <p>
                Fotografías de espacios interiores proporcionadas
                voluntariamente por el usuario para el uso de herramientas de
                diseño.
              </p>
            </div>
          </div>

          <h4 class="text-lg font-medium">3. Finalidad del tratamiento</h4>
          <ul class="list-disc list-inside space-y-1">
            <li>
              Gestionar el registro de usuarios y mantener el historial de
              cotizaciones.
            </li>
            <li>
              Proveer los servicios de diseño asistido y cálculo de
              presupuestos.
            </li>
            <li>
              Entrenar y mejorar la precisión de los modelos de Inteligencia
              Artificial utilizados en la atención al cliente.
            </li>
            <li>
              Establecer contacto comercial a través del correo
              contacto@comercialhg.com o vía telefónica.
            </li>
          </ul>

          <h4 class="text-lg font-medium">4. Transferencia a terceros</h4>
          <p>
            Comercial HG garantiza que no comercializa datos personales. No
            obstante, para la operación técnica de la plataforma, ciertos datos
            (incluyendo imágenes temporales) pueden ser procesados por
            proveedores de infraestructura en la nube y servicios de IA
            externos, quienes actúan bajo estrictos acuerdos de seguridad y
            confidencialidad.
          </p>

          <h4 class="text-lg font-medium">5. Seguridad y almacenamiento</h4>
          <div class="space-y-2">
            <div>
              <h5 class="text-base font-semibold">5.1. Medidas de seguridad</h5>
              <p>
                Utilizamos protocolos de encriptación estándar (SSL/TLS) para
                proteger la transmisión de sus datos.
              </p>
            </div>
            <div>
              <h5 class="text-base font-semibold">
                5.2. Retención de imágenes
              </h5>
              <p>
                Las fotografías subidas para visualización se almacenan de
                manera temporal para la ejecución del servicio. Comercial HG se
                reserva el derecho de eliminar periódicamente dichos archivos de
                sus servidores para optimizar el rendimiento del sistema y
                garantizar la privacidad del usuario.
              </p>
            </div>
          </div>

          <h4 class="text-lg font-medium">6. Derechos ARCO</h4>
          <p>
            El titular de los datos podrá ejercer en cualquier momento sus
            derechos de Acceso, Rectificación, Cancelación y Oposición respecto
            a sus datos personales. Para ello, deberá enviar una solicitud
            escrita al correo electrónico contacto@comercialhg.com o contactar
            al soporte al +56998163536.
          </p>
        </div>
        <div class="px-6 py-4 border-t flex items-center justify-between">
          <div class="text-sm text-gray-600">
            <RouterLink
              to="/privacidad"
              class="text-primary-600 hover:text-primary-500"
            >
              Ver versión completa
            </RouterLink>
          </div>
          <div class="space-x-2">
            <button
              class="btn-secondary px-4 py-2"
              @click="showPrivacyModal = false"
            >
              Cerrar
            </button>
            <button
              class="btn-primary px-4 py-2"
              @click="((showPrivacyModal = false), (form.acceptTerms = true))"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
