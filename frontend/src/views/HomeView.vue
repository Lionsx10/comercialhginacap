<script setup>
import { ref, onMounted } from 'vue'
import { catalogAPI } from '@/services/api'
import { useToast } from 'vue-toastification'

const toast = useToast()

// Estado básico
const stats = ref({
  productos: 500,
  clientes: 1200,
  recomendaciones: 2500,
})

const apiStatus = ref({
  connected: false,
  testing: false,
  error: null,
})

const isImageModalOpen = ref(false)
const modalImages = ref([])
const modalIndex = ref(0)
const openImageModal = img => {
  modalImages.value = [img]
  modalIndex.value = 0
  isImageModalOpen.value = true
}
const closeImageModal = () => {
  isImageModalOpen.value = false
}

// Función para probar la conexión con Xano
const testXanoConnection = async () => {
  apiStatus.value.testing = true
  apiStatus.value.error = null

  try {
    console.log('🔄 Probando conexión con Xano...')

    // Intentar obtener productos del catálogo
    const response = await catalogAPI.getProducts({ limit: 1 })

    console.log('✅ Conexión exitosa con Xano!')
    console.log('📦 Datos recibidos:', response.data)

    // Verificar que la respuesta tenga la estructura esperada
    if (response.data && typeof response.data === 'object') {
      apiStatus.value.connected = true
      console.log('✅ Estructura de respuesta válida')

      // Solo mostrar toast de éxito en desarrollo o si hay un error previo
      if (apiStatus.value.error) {
        toast.success('✅ Conexión con Xano restablecida')
      }

      // Actualizar estadísticas si hay datos
      if (response.data.productos && Array.isArray(response.data.productos)) {
        stats.value.productos = response.data.productos.length > 0 ? 500 : 0
      }
    } else {
      throw new Error('Respuesta inválida del servidor')
    }
  } catch (error) {
    console.error(
      '❌ Error conectando con Xano:',
      error?.response?.data?.message || error?.message || error,
    )
    apiStatus.value.connected = false

    let errorMessage = 'Error de conexión'

    if (error.response) {
      // El servidor respondió con un código de error
      if (error.response.status >= 500) {
        errorMessage = 'Error del servidor. Verifica la configuración de Xano.'
        toast.error(`❌ ${errorMessage}`)
      } else if (error.response.status === 404) {
        errorMessage = 'Endpoint no encontrado. Verifica la URL de la API.'
        toast.error(`❌ ${errorMessage}`)
      } else {
        errorMessage = `Error ${error.response.status}: ${error.response.statusText}`
        toast.error(`❌ ${errorMessage}`)
      }
    } else if (error.request) {
      // La petición se hizo pero no se recibió respuesta
      errorMessage =
        'No se pudo conectar con el servidor de Xano. Verifica la URL y tu conexión a internet.'
      toast.error(`❌ ${errorMessage}`)
    } else {
      // Error en la configuración de la petición
      errorMessage = `Error de configuración: ${error.message}`
      toast.error(`❌ ${errorMessage}`)
    }

    apiStatus.value.error = errorMessage
  } finally {
    apiStatus.value.testing = false
  }
}

// Lifecycle
onMounted(() => {
  console.log('HomeView montado correctamente')
  testXanoConnection()
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section
      class="hero-section relative text-white py-20"
      style="
        background-image: url('/images/muebles/Cocina.jpg');
        background-size: cover;
        background-position: center;
      "
    >
      <div
        class="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-red-900/70"
      />
      <div class="container mx-auto px-4 relative z-10">
        <div class="text-center">
          <h1 class="text-4xl md:text-6xl font-bold mb-6">
            Muebles a medida
            <span class="text-blue-300">Comercial HG</span>
          </h1>
          <p class="text-xl md:text-2xl mb-8 text-gray-200">
            Descubre muebles personalizados que se adaptan perfectamente a tu
            espacio y estilo.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <RouterLink
              to="/login"
              class="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Analizar Espacio
            </RouterLink>
            <RouterLink
              to="/login"
              class="bg-transparent text-white px-8 py-4 rounded-lg font-semibold border-2 border-white hover:bg-white hover:text-blue-600 transition-colors"
            >
              Cotizar Mueble
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-20 bg-blue-50">
      <div class="container mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            ¿Por qué elegir Comercial HG?
          </h2>
          <p class="text-xl text-gray-600">
            Combinamos la artesanía tradicional con tecnología de vanguardia
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div
            class="text-center p-6 bg-white rounded-lg shadow-md animate-fade-in transition-transform hover:-translate-y-1 hover:shadow-lg border-t-4 border-blue-600"
          >
            <div
              class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8"
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
            </div>
            <h3 class="text-xl font-semibold mb-2">Recomendaciones IA</h3>
            <p class="text-gray-600">
              Nuestra inteligencia artificial analiza tu espacio y preferencias
              para sugerir muebles perfectos
            </p>
          </div>

          <div
            class="text-center p-6 bg-white rounded-lg shadow-md border-t-4 border-red-600"
          >
            <div
              class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Personalización Total</h3>
            <p class="text-gray-600">
              Adapta cada mueble a tus necesidades específicas: dimensiones,
              materiales y acabados
            </p>
          </div>

          <div
            class="text-center p-6 bg-white rounded-lg shadow-md border-t-4 border-blue-600"
          >
            <div
              class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-gentle"
            >
              <svg
                class="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Calidad Premium</h3>
            <p class="text-gray-600">
              Materiales de primera calidad y artesanos expertos garantizan
              durabilidad y belleza
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Galería de proyectos -->
    <section class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl md:text-3xl font-bold">Galería de Proyectos</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <img
            src="/images/muebles/Cocina2.jpg"
            alt="Cocina"
            class="rounded-lg object-cover w-full h-36 md:h-40 lg:h-44 hover:opacity-90 cursor-zoom-in"
            loading="lazy"
            @click="openImageModal('/images/muebles/Cocina2.jpg')"
          />
          <img
            src="/images/muebles/Cocina3.jpg"
            alt="Cocina"
            class="rounded-lg object-cover w-full h-36 md:h-40 lg:h-44 hover:opacity-90 cursor-zoom-in"
            loading="lazy"
            @click="openImageModal('/images/muebles/Cocina3.jpg')"
          />
          <img
            src="/images/muebles/Cocina4.jpg"
            alt="Cocina"
            class="rounded-lg object-cover w-full h-36 md:h-40 lg:h-44 hover:opacity-90 cursor-zoom-in"
            loading="lazy"
            @click="openImageModal('/images/muebles/Cocina4.jpg')"
          />
          <img
            src="/images/muebles/Cocina5.jpg"
            alt="Cocina"
            class="rounded-lg object-cover w-full h-36 md:h-40 lg:h-44 hover:opacity-90 cursor-zoom-in"
            loading="lazy"
            @click="openImageModal('/images/muebles/Cocina5.jpg')"
          />
          <img
            src="/images/muebles/Cocina6.jpg"
            alt="Cocina"
            class="rounded-lg object-cover w-full h-36 md:h-40 lg:h-44 hover:opacity-90 cursor-zoom-in"
            loading="lazy"
            @click="openImageModal('/images/muebles/Cocina6.jpg')"
          />
        </div>
      </div>
    </section>

    <div
      v-if="isImageModalOpen"
      class="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center"
      @click="closeImageModal"
    >
      <div
class="relative max-w-[90vw] max-h-[85vh]" @click.stop
>
        <img
          :src="modalImages[modalIndex]"
          alt="Imagen ampliada"
          class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
        />
        <button
          class="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full p-2"
          @click="closeImageModal"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- CTA Section -->
    <section class="py-20 bg-blue-600 text-white">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">
          ¿Listo para Transformar tu Espacio?
        </h2>
        <p class="text-xl mb-8 max-w-2xl mx-auto">
          Únete a miles de clientes satisfechos y descubre el poder de la
          personalización con IA
        </p>
        <div
          class="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
        >
          <RouterLink
            to="/analisis-espacio"
            class="bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors animate-pulse-slow"
          >
            Análisis de espacio con IA
          </RouterLink>
          <RouterLink
            to="/cotizaciones"
            class="bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors animate-pulse-slow"
          >
            Cotizar mueble
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
}
</style>
