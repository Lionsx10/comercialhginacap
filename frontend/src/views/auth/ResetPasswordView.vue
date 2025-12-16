<script setup>
// IMPORTS - Dependencias necesarias para el componente
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'

// COMPOSABLES - Instancias de los composables necesarios
const router = useRouter()
const route = useRoute()
const toast = useToast()

// ESTADO DEL FORMULARIO - Datos reactivos del formulario
const form = reactive({
  password: '',
  password_confirmation: '',
  token: '',
})

// ESTADO DE LA UI - Variables reactivas para controlar la interfaz
const isLoading = ref(false)
const passwordReset = ref(false)
const showPassword = ref(false)
const showPasswordConfirm = ref(false)

// ERRORES - Objeto reactivo para manejar errores de validación
const errors = reactive({
  password: '',
  password_confirmation: '',
  general: '',
})

// COMPUTED PROPERTIES - Propiedades computadas para la fortaleza de contraseña
const passwordStrength = computed(() => {
  const password = form.password
  let score = 0

  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  return score
})

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 1) return 'Muy débil'
  if (strength <= 2) return 'Débil'
  if (strength <= 3) return 'Regular'
  if (strength <= 4) return 'Fuerte'
  return 'Muy fuerte'
})

const passwordStrengthColor = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 1) return 'bg-red-500'
  if (strength <= 2) return 'bg-orange-500'
  if (strength <= 3) return 'bg-yellow-500'
  if (strength <= 4) return 'bg-blue-500'
  return 'bg-green-500'
})

const passwordStrengthWidth = computed(() => {
  return `${(passwordStrength.value / 5) * 100}%`
})

// VALIDACIÓN DEL FORMULARIO - Función para validar los datos antes del envío
const validateForm = () => {
  // Limpiar errores previos
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  let isValid = true

  // Validar contraseña
  if (!form.password) {
    errors.password = 'La contraseña es requerida'
    isValid = false
  } else if (form.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres'
    isValid = false
  }

  // Validar confirmación de contraseña
  if (!form.password_confirmation) {
    errors.password_confirmation = 'La confirmación de contraseña es requerida'
    isValid = false
  } else if (form.password !== form.password_confirmation) {
    errors.password_confirmation = 'Las contraseñas no coinciden'
    isValid = false
  }

  return isValid
}

// MANEJAR RESTABLECIMIENTO DE CONTRASEÑA - Función principal para procesar la solicitud
const handleResetPassword = async () => {
  // Validar formulario antes de proceder
  if (!validateForm()) {
    return
  }

  // Activar estado de carga y limpiar errores
  isLoading.value = true
  errors.general = ''

  try {
    // Llamar al endpoint de restablecimiento de contraseña
    await axios.post('/api/reset-password', {
      token: form.token,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    // Mostrar estado de éxito
    passwordReset.value = true
    toast.success('Contraseña restablecida correctamente')
  } catch (error) {
    console.error('Error en restablecimiento de contraseña:', error)

    // Manejar diferentes tipos de errores del servidor
    if (error.response?.status === 400) {
      errors.general =
        'El enlace de restablecimiento es inválido o ha expirado.'
    } else if (error.response?.status === 422) {
      // Errores de validación del servidor
      const serverErrors = error.response.data.errors || {}
      Object.keys(serverErrors).forEach(field => {
        if (errors.hasOwnProperty(field)) {
          errors[field] = serverErrors[field][0] || serverErrors[field]
        }
      })
    } else {
      errors.general =
        'Error al restablecer la contraseña. Por favor, inténtalo de nuevo.'
    }
  } finally {
    // Desactivar estado de carga
    isLoading.value = false
  }
}

// LIMPIAR ERRORES - Función para limpiar errores de campos específicos
const clearFieldError = field => {
  if (errors[field]) {
    errors[field] = ''
  }
}

// INICIALIZACIÓN - Obtener token de la URL al montar el componente
onMounted(() => {
  const token = route.params.token || route.query.token
  if (!token) {
    toast.error('Token de restablecimiento no válido')
    router.push('/login')
    return
  }
  form.token = token
})

// WATCHERS - Observadores para limpiar errores cuando el usuario escribe
import { watch } from 'vue'

watch(
  () => form.password,
  () => clearFieldError('password')
)
watch(
  () => form.password_confirmation,
  () => clearFieldError('password_confirmation')
)
</script>

<template>
  <!-- Contenedor principal de la página de restablecimiento de contraseña -->
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
  >
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
          Restablecer Contraseña
        </h2>
        <!-- Descripción del proceso -->
        <p class="mt-2 text-center text-sm text-gray-600">
          Ingresa tu nueva contraseña para completar el restablecimiento
        </p>
      </div>

      <!-- Formulario de restablecimiento -->
      <form
        v-if="!passwordReset"
        class="mt-8 space-y-6"
        @submit.prevent="handleResetPassword"
      >
        <div class="space-y-4">
          <!-- Campo de nueva contraseña -->
          <div class="input-group">
            <label for="password"
class="input-label"> Nueva Contraseña </label>
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

          <!-- Campo de confirmación de contraseña -->
          <div class="input-group">
            <label for="password_confirmation"
class="input-label">
              Confirmar Nueva Contraseña
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
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showPasswordConfirm = !showPasswordConfirm"
              >
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
            <p v-if="errors.password_confirmation"
class="input-error">
              {{ errors.password_confirmation }}
            </p>
          </div>
        </div>

        <!-- Botón de envío -->
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary w-full flex justify-center py-3 px-4 text-sm font-medium"
            :class="{ 'opacity-50 cursor-not-allowed': isLoading }"
          >
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
            {{ isLoading ? 'Restableciendo...' : 'Restablecer Contraseña' }}
          </button>
        </div>

        <!-- Error general -->
        <div v-if="errors.general"
class="alert-error">
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

      <!-- Mensaje de confirmación cuando se restablece la contraseña -->
      <div v-else
class="text-center space-y-4">
        <div
          class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100"
        >
          <svg
            class="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900">
          ¡Contraseña Restablecida!
        </h3>
        <p class="text-sm text-gray-600">
          Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar
          sesión con tu nueva contraseña.
        </p>
        <div class="pt-4">
          <RouterLink
            to="/login"
            class="btn-primary inline-flex items-center px-4 py-2 text-sm font-medium"
          >
            Ir al Inicio de Sesión
          </RouterLink>
        </div>
      </div>

      <!-- Enlaces adicionales -->
      <div v-if="!passwordReset"
class="text-center">
        <p class="text-sm text-gray-600">
          ¿Recordaste tu contraseña?
          <RouterLink
            to="/login"
            class="font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            Volver al inicio de sesión
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
