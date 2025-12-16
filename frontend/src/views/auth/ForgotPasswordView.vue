<script setup>
// IMPORTS - Dependencias necesarias para el componente
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'

// COMPOSABLES - Instancias de los composables necesarios
const router = useRouter()
const toast = useToast()

// ESTADO DEL FORMULARIO - Datos reactivos del formulario
const form = reactive({
  email: '',
})

// ESTADO DE LA UI - Variables reactivas para controlar la interfaz
const isLoading = ref(false)
const emailSent = ref(false)

// ERRORES - Objeto reactivo para manejar errores de validación
const errors = reactive({
  email: '',
  general: '',
})

// VALIDACIÓN DEL FORMULARIO - Función para validar los datos antes del envío
const validateForm = () => {
  // Limpiar errores previos
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  let isValid = true

  // Validar email - Verificar que existe y tiene formato válido
  if (!form.email) {
    errors.email = 'El correo electrónico es requerido'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'El correo electrónico no es válido'
    isValid = false
  }

  return isValid
}

// MANEJAR RECUPERACIÓN DE CONTRASEÑA - Función principal para procesar la solicitud
const handleForgotPassword = async () => {
  // Validar formulario antes de proceder
  if (!validateForm()) {
    return
  }

  // Activar estado de carga y limpiar errores
  isLoading.value = true
  errors.general = ''

  try {
    // Llamar al endpoint de recuperación de contraseña
    await axios.post('/api/forgot-password', {
      email: form.email,
    })

    // Mostrar estado de éxito
    emailSent.value = true
    toast.success('Enlace de recuperación enviado correctamente')
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error)

    // Manejar diferentes tipos de errores del servidor
    if (error.response?.status === 404) {
      errors.general = 'No se encontró una cuenta con ese correo electrónico.'
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
        'Error al enviar el enlace de recuperación. Por favor, inténtalo de nuevo.'
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

// WATCHERS - Observadores para limpiar errores cuando el usuario escribe
import { watch } from 'vue'

watch(
  () => form.email,
  () => clearFieldError('email')
)
</script>

<template>
  <!-- Contenedor principal de la página de recuperación de contraseña -->
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
          Recuperar Contraseña
        </h2>
        <!-- Descripción del proceso -->
        <p class="mt-2 text-center text-sm text-gray-600">
          Ingresa tu correo electrónico y te enviaremos un enlace para
          restablecer tu contraseña
        </p>
      </div>

      <!-- Formulario de recuperación -->
      <form
        v-if="!emailSent"
        class="mt-8 space-y-6"
        @submit.prevent="handleForgotPassword"
      >
        <div class="space-y-4">
          <!-- Campo de email -->
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
            {{ isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación' }}
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

      <!-- Mensaje de confirmación cuando se envía el email -->
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
        <h3 class="text-lg font-medium text-gray-900">¡Correo Enviado!</h3>
        <p class="text-sm text-gray-600">
          Hemos enviado un enlace de recuperación a
          <strong>{{ form.email }}</strong
          >. Revisa tu bandeja de entrada y sigue las instrucciones para
          restablecer tu contraseña.
        </p>
        <p class="text-xs text-gray-500">
          Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
        </p>
      </div>

      <!-- Enlaces adicionales -->
      <div class="text-center">
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
