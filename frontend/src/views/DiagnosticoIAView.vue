<script>
import {
  ejecutarDiagnostico,
  probarIA,
  formatearDiagnostico,
} from '@/services/diagnosticoIA'

export default {
  name: 'DiagnosticoIAView',
  data() {
    return {
      cargandoDiagnostico: false,
      cargandoPrueba: false,
      diagnostico: null,
      pruebaIA: null,
    }
  },
  methods: {
    async ejecutarDiagnostico() {
      this.cargandoDiagnostico = true
      this.diagnostico = null

      try {
        const resultado = await ejecutarDiagnostico()
        this.diagnostico = formatearDiagnostico(resultado)
      } catch (error) {
        console.error('Error en diagnóstico:', error)
        this.diagnostico = {
          estado: 'ERROR',
          mensaje: 'Error al ejecutar diagnóstico',
          tests: [
            {
              nombre: 'Error de Conexión',
              estado: 'FAILED',
              detalles:
                error.response?.data?.message ||
                error.message ||
                'Error desconocido',
              esError: true,
            },
          ],
        }
      } finally {
        this.cargandoDiagnostico = false
      }
    },

    async probarIA() {
      this.cargandoPrueba = true
      this.pruebaIA = null

      try {
        const resultado = await probarIA()
        this.pruebaIA = resultado
      } catch (error) {
        console.error('Error en prueba de IA:', error)
        this.pruebaIA = {
          success: false,
          message: 'Error en prueba de IA',
          error:
            error.response?.data?.message ||
            error.message ||
            'Error desconocido',
          details: error.response?.data?.details || null,
        }
      } finally {
        this.cargandoPrueba = false
      }
    },
  },
}
</script>

<template>
  <div class="container-custom section-padding">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Diagnóstico de IA</h1>
      <p class="mt-2 text-gray-600">
        Herramientas para diagnosticar problemas con la API de Inteligencia
        Artificial
      </p>
    </div>

    <!-- Controles -->
    <div class="card mb-6">
      <div class="card-header">
        <h2 class="text-xl font-semibold text-gray-900">
          Pruebas de Conectividad
        </h2>
      </div>
      <div class="card-body">
        <div class="flex space-x-4">
          <button
            :disabled="cargandoDiagnostico"
            class="btn-primary"
            @click="ejecutarDiagnostico"
          >
            <span
              v-if="cargandoDiagnostico"
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
            />
            {{ cargandoDiagnostico ? 'Ejecutando...' : 'Ejecutar Diagnóstico' }}
          </button>

          <button
            :disabled="cargandoPrueba"
            class="btn-secondary"
            @click="probarIA"
          >
            <span
              v-if="cargandoPrueba"
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"
            />
            {{ cargandoPrueba ? 'Probando...' : 'Prueba Simple de IA' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Resultados del Diagnóstico -->
    <div
v-if="diagnostico" class="card mb-6"
>
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">
          Resultados del Diagnóstico
        </h3>
        <div class="flex items-center space-x-2">
          <div
            class="px-3 py-1 rounded-full text-sm font-medium"
            :class="[
              diagnostico.estado === 'EXITOSO'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800',
            ]"
          >
            {{ diagnostico.estado }}
          </div>
          <span class="text-sm text-gray-500">{{ diagnostico.mensaje }}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="space-y-3">
          <div
            v-for="test in diagnostico.tests"
            :key="test.nombre"
            class="p-4 rounded-lg border"
            :class="[
              test.esError
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50',
            ]"
          >
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900">
                {{ test.nombre }}
              </h4>
              <span
                class="px-2 py-1 rounded text-xs font-medium"
                :class="[
                  test.esError
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800',
                ]"
              >
                {{ test.estado }}
              </span>
            </div>
            <div class="mt-2 text-sm text-gray-600">
              <pre
                v-if="typeof test.detalles === 'object'"
                class="whitespace-pre-wrap"
                >{{ JSON.stringify(test.detalles, null, 2) }}</pre
              >
              <span v-else>{{ test.detalles }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="diagnostico.timestamp"
          class="mt-4 pt-4 border-t border-gray-200"
        >
          <p class="text-xs text-gray-500">
            Ejecutado: {{ new Date(diagnostico.timestamp).toLocaleString() }}
          </p>
        </div>
      </div>
    </div>

    <!-- Resultados de la Prueba de IA -->
    <div
v-if="pruebaIA" class="card mb-6"
>
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">
          Resultados de la Prueba de IA
        </h3>
        <div
          class="px-3 py-1 rounded-full text-sm font-medium"
          :class="[
            pruebaIA.success
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800',
          ]"
        >
          {{ pruebaIA.success ? 'EXITOSO' : 'ERROR' }}
        </div>
      </div>
      <div class="card-body">
        <div
v-if="pruebaIA.success" class="text-green-700"
>
          <p class="font-medium">✅ {{ pruebaIA.message }}</p>
          <div
v-if="pruebaIA.data" class="mt-3 p-3 bg-gray-50 rounded"
>
            <pre class="text-xs text-gray-600">{{
              JSON.stringify(pruebaIA.data, null, 2)
            }}</pre>
          </div>
        </div>
        <div
v-else class="text-red-700"
>
          <p class="font-medium">❌ {{ pruebaIA.message }}</p>
          <p class="mt-2 text-sm">
            {{ pruebaIA.error }}
          </p>
          <div
v-if="pruebaIA.details" class="mt-3 p-3 bg-gray-50 rounded"
>
            <pre class="text-xs text-gray-600">{{
              JSON.stringify(pruebaIA.details, null, 2)
            }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Información de Ayuda -->
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">
          Información de Ayuda
        </h3>
      </div>
      <div class="card-body">
        <div class="space-y-4 text-sm text-gray-600">
          <div>
            <h4 class="font-medium text-gray-900">Diagnóstico Completo</h4>
            <p>
              Verifica la conexión con Hugging Face, importación de librerías y
              procesamiento de imágenes.
            </p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900">Prueba Simple de IA</h4>
            <p>
              Ejecuta una llamada real a la API de IA con parámetros mínimos
              para verificar funcionalidad.
            </p>
          </div>
          <div>
            <h4 class="font-medium text-gray-900">Problemas Comunes</h4>
            <ul class="list-disc list-inside space-y-1 mt-2">
              <li>Error de conexión: Verificar conectividad a internet</li>
              <li>Error de autenticación: Verificar tokens de Hugging Face</li>
              <li>Error de formato: Verificar formato de imágenes base64</li>
              <li>Timeout: El servicio puede estar sobrecargado</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
