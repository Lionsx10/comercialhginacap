<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToast()

// Estado reactivo
const completedProjects = ref([])
const isLoading = ref(true)
const pendingQuotes = ref([])

// Carrusel de imágenes para el primer proyecto
const currentImageIndex = ref(0)
const carouselImages = ref([
  '/images/muebles/img1.jpg',
  '/images/muebles/img2.jpg',
  '/images/muebles/img3.jpg',
])

// Funciones del carrusel
const nextImage = () => {
  currentImageIndex.value =
    (currentImageIndex.value + 1) % carouselImages.value.length
}

const prevImage = () => {
  currentImageIndex.value =
    currentImageIndex.value === 0
      ? carouselImages.value.length - 1
      : currentImageIndex.value - 1
}

// Carrusel de imágenes para el segundo proyecto
const currentImageIndex2 = ref(0)
const carouselImages2 = ref([
  '/images/muebles/img4.jpg',
  '/images/muebles/img5.jpg',
  '/images/muebles/img6.jpg',
])

// Funciones del segundo carrusel
const nextImage2 = () => {
  currentImageIndex2.value =
    (currentImageIndex2.value + 1) % carouselImages2.value.length
}

const prevImage2 = () => {
  currentImageIndex2.value =
    currentImageIndex2.value === 0
      ? carouselImages2.value.length - 1
      : currentImageIndex2.value - 1
}

// Carrusel de imágenes para el tercer proyecto
const currentImageIndex3 = ref(0)
const carouselImages3 = ref([
  '/images/muebles/img7.webp',
  '/images/muebles/img8.webp',
  '/images/muebles/img9.webp',
  '/images/muebles/img10.webp',
])

// Funciones del tercer carrusel
const nextImage3 = () => {
  currentImageIndex3.value =
    (currentImageIndex3.value + 1) % carouselImages3.value.length
}

const prevImage3 = () => {
  currentImageIndex3.value =
    currentImageIndex3.value === 0
      ? carouselImages3.value.length - 1
      : currentImageIndex3.value - 1
}

// Carrusel de imágenes para el cuarto proyecto
const currentImageIndex4 = ref(0)
const carouselImages4 = ref([
  '/images/muebles/img11.webp',
  '/images/muebles/img12.webp',
])

// Funciones del cuarto carrusel
const nextImage4 = () => {
  currentImageIndex4.value =
    (currentImageIndex4.value + 1) % carouselImages4.value.length
}

const prevImage4 = () => {
  currentImageIndex4.value =
    currentImageIndex4.value === 0
      ? carouselImages4.value.length - 1
      : currentImageIndex4.value - 1
}

// Carrusel de imágenes para el quinto proyecto
const currentImageIndex5 = ref(0)
const carouselImages5 = ref([
  '/images/muebles/img13.webp',
  '/images/muebles/img14.webp',
  '/images/muebles/img15.webp',
])

// Funciones del quinto carrusel
const nextImage5 = () => {
  currentImageIndex5.value =
    (currentImageIndex5.value + 1) % carouselImages5.value.length
}

const prevImage5 = () => {
  currentImageIndex5.value =
    currentImageIndex5.value === 0
      ? carouselImages5.value.length - 1
      : currentImageIndex5.value - 1
}

// Carrusel de imágenes para el sexto proyecto
const currentImageIndex6 = ref(0)
const carouselImages6 = ref([
  '/images/muebles/img16.webp',
  '/images/muebles/img17.webp',
])

// Funciones del sexto carrusel
const nextImage6 = () => {
  currentImageIndex6.value =
    (currentImageIndex6.value + 1) % carouselImages6.value.length
}

const prevImage6 = () => {
  currentImageIndex6.value =
    currentImageIndex6.value === 0
      ? carouselImages6.value.length - 1
      : currentImageIndex6.value - 1
}

const isImageModalOpen = ref(false)
const modalImages = ref([])
const modalIndex = ref(0)
const openImageModal = (images, index) => {
  modalImages.value = Array.isArray(images) ? images.slice() : [images]
  modalIndex.value = index || 0
  isImageModalOpen.value = true
}
const closeImageModal = () => {
  isImageModalOpen.value = false
}
const nextModalImage = () => {
  if (!modalImages.value.length) return
  modalIndex.value = (modalIndex.value + 1) % modalImages.value.length
}
const prevModalImage = () => {
  if (!modalImages.value.length) return
  modalIndex.value =
    modalIndex.value === 0 ? modalImages.value.length - 1 : modalIndex.value - 1
}

// Cargar datos del dashboard
const loadDashboardData = async () => {
  try {
    isLoading.value = true

    // Simular carga de datos con datos de ejemplo
    await new Promise(resolve => setTimeout(resolve, 500)) // Simular delay de carga

    // Trabajos realizados de ejemplo
    completedProjects.value = [
      {
        id: 1,
        titulo: 'Cocina Integral Moderna',
        categoria: 'Cocinas',
        descripcion:
          'Cocina completa con muebles altos y bajos, acabado en blanco con detalles contemporáneos.',
        ubicacion: 'Ñuñoa, Chile',
        imagen_url: '/images/muebles/MR1.png',
      },
      {
        id: 2,
        titulo: 'Cocina Modular Contemporánea',
        categoria: 'Cocinas',
        descripcion:
          'Muebles de cocina modulares con acabados modernos, cajones con sistema soft-close y encimera de cuarzo.',
        ubicacion: 'Pirque, Chile',
        imagen_url:
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      },
      {
        id: 3,
        titulo: 'Cocina Americana Elegante',
        categoria: 'Cocinas',
        descripcion:
          'Diseño de cocina americana con isla central, muebles altos y bajos en tonos claros con detalles en madera.',
        ubicacion: 'Los Ángeles, Chile',
        imagen_url:
          'https://images.unsplash.com/photo-1620626011761-996317b8d101?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      },
      {
        id: 4,
        titulo: 'Cocina Termolaminada Premium',
        categoria: 'Cocinas',
        descripcion:
          'Muebles de cocina termolaminados con cubierta de cuarzo, diseño funcional y acabados de alta calidad.',
        ubicacion: 'Santiago, Chile',
        imagen_url:
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      },
      {
        id: 5,
        titulo: 'Closet Modular Elegante',
        categoria: 'Closets',
        descripcion:
          'Closet modular con múltiples compartimentos, cajones y barras colgadoras para optimizar el espacio.',
        ubicacion: 'Santiago, Chile',
        imagen_url:
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      },
      {
        id: 6,
        titulo: 'Closet Contemporáneo Premium',
        categoria: 'Closets',
        descripcion:
          'Closet contemporáneo con diseño minimalista, puertas corredizas y sistema de organización interno.',
        ubicacion: 'Santiago, Chile',
        imagen_url:
          'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      },
    ]
  } catch (error) {
    console.error('Error cargando datos del dashboard:', error)
    toast.error('Error al cargar los datos del dashboard')
  } finally {
    isLoading.value = false
  }
}

const loadPendingQuotes = async () => {
  try {
    if (!authStore.isAdmin) return
    const response = await api.get('/pedidos/xano', {
      params: { estado: 'en_cotizacion', page: 1, limit: 10 },
    })
    pendingQuotes.value = response.data.pedidos || []
  } catch (error) {
    toast.error('Error al cargar cotizaciones pendientes')
  }
}

// Formatear precio
const formatPrice = price => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Cargar datos al montar el componente
onMounted(() => {
  loadDashboardData()
  loadPendingQuotes()
})
</script>

<template>
  <div class="container-custom section-padding">
    <!-- Header del Dashboard -->
    <div class="mb-8">
      <div
        class="bg-gradient-to-r from-blue-600 to-red-600 rounded-lg p-6 text-white"
      >
        <h1 class="text-3xl font-bold">
          ¡Bienvenido, {{ authStore.user?.nombre }}!
        </h1>
        <p class="mt-2 text-blue-100">
          Estás en Comercial HG, tu plataforma para encontrar los mejores
          muebles. Explora nuestro catálogo, obtén recomendaciones
          personalizadas y gestiona tus pedidos.
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <RouterLink
            to="/cotizaciones"
            class="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Cotizar
          </RouterLink>
          <RouterLink
            to="/analisis-espacio"
            class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <svg
              class="w-4 h-4 mr-2"
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
            Analizar Espacio
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Acciones rápidas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- Acciones principales -->
      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Acciones Rápidas</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-4">
            <RouterLink
              to="/cotizaciones"
              class="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <div
                class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors"
              >
                <svg
                  class="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <span class="mt-2 text-sm font-medium text-gray-900"
                >Cotizar</span
              >
            </RouterLink>

            <RouterLink
              to="/analisis-espacio"
              class="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors group"
            >
              <div
                class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors"
              >
                <svg
                  class="w-6 h-6 text-red-600"
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
              <span class="mt-2 text-sm font-medium text-gray-900"
                >Analizar Espacio</span
              >
            </RouterLink>

            <RouterLink
              to="/mis-cotizaciones"
              class="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
            >
              <div
                class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors"
              >
                <svg
                  class="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <span class="mt-2 text-sm font-medium text-gray-900"
                >Mis Cotizaciones</span
              >
            </RouterLink>

            <RouterLink
              to="/perfil"
              class="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div
                class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors"
              >
                <svg
                  class="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <span class="mt-2 text-sm font-medium text-gray-900"
                >Mi Perfil</span
              >
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Nuestra Ubicación -->
      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-medium text-gray-900">Nuestra Ubicación</h3>
        </div>
        <div class="card-body">
          <div class="space-y-4">
            <!-- Información de contacto -->
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">Dirección</p>
                <p class="text-sm text-gray-500">
                  Franklin 565, Santiago Centro
                </p>
                <p class="text-sm text-gray-500">Santiago, Chile</p>
              </div>
            </div>

            <!-- Mapa embebido -->
            <div class="mt-4">
              <div
                class="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden border border-gray-200"
              >
                <iframe
                  src="https://maps.google.com/maps?q=Franklin+565,+Santiago+Centro,+Chile&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="200"
                  style="border: 0"
                  allowfullscreen=""
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  class="w-full h-48 rounded-lg"
                  title="Ubicación de nuestra tienda en Franklin 565, Santiago Centro"
                />
              </div>
            </div>

            <!-- Información adicional -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div class="flex items-center space-x-2">
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span class="text-sm text-gray-600"
                  >Lun - Vie: 9:00 - 18:00</span
                >
              </div>
              <div class="flex items-center space-x-2">
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span class="text-sm text-gray-600">+569 9816 3536</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Trabajos Realizados -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">Trabajos Realizados</h3>
          <span class="text-sm font-medium text-primary-600">
            Nuestros Proyectos
          </span>
        </div>
      </div>
      <div class="card-body">
        <div
v-if="completedProjects.length === 0" class="text-center py-8"
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p class="mt-2 text-sm text-gray-500">
            No hay trabajos realizados para mostrar
          </p>
        </div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <div
            v-for="project in completedProjects"
            :key="project.id"
            class="group cursor-pointer bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow transition-transform hover:-translate-y-1 animate-fade-in"
          >
            <!-- Carrusel especial para el primer proyecto -->
            <div
              v-if="project.id === 1"
              class="aspect-w-16 aspect-h-9 w-full overflow-hidden bg-gray-200 relative"
            >
              <img
                :src="carouselImages[currentImageIndex]"
                :alt="project.titulo"
                class="h-40 w-full object-contain object-center group-hover:scale-105 transition-transform duration-300 bg-white"
                @click="openImageModal(carouselImages, currentImageIndex)"
              />
              <!-- Flecha izquierda -->
              <button
                class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="prevImage"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <!-- Flecha derecha -->
              <button
                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="nextImage"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <!-- Indicadores de puntos -->
              <div
                class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1"
              >
                <button
                  v-for="(image, index) in carouselImages"
                  :key="index"
                  class="w-2 h-2 rounded-full transition-all duration-200"
                  :class="[
                    currentImageIndex === index
                      ? 'bg-white'
                      : 'bg-white bg-opacity-50',
                  ]"
                  @click.stop="currentImageIndex = index"
                />
              </div>
            </div>
            <!-- Carrusel especial para el segundo proyecto -->
            <div
              v-else-if="project.id === 2"
              class="aspect-w-16 aspect-h-9 w-full overflow-hidden bg-gray-200 relative"
            >
              <img
                :src="carouselImages2[currentImageIndex2]"
                :alt="project.titulo"
                class="h-40 w-full object-contain object-center group-hover:scale-105 transition-transform duration-300 bg-white"
                @click="openImageModal(carouselImages2, currentImageIndex2)"
              />
              <!-- Flecha izquierda -->
              <button
                class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="prevImage2"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <!-- Flecha derecha -->
              <button
                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="nextImage2"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <!-- Indicadores de puntos -->
              <div
                class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1"
              >
                <button
                  v-for="(image, index) in carouselImages2"
                  :key="index"
                  class="w-2 h-2 rounded-full transition-all duration-200"
                  :class="[
                    currentImageIndex2 === index
                      ? 'bg-white'
                      : 'bg-white bg-opacity-50',
                  ]"
                  @click.stop="currentImageIndex2 = index"
                />
              </div>
            </div>
            <!-- Carrusel especial para el tercer proyecto -->
            <div
              v-else-if="project.id === 3"
              class="aspect-w-16 aspect-h-9 w-full overflow-hidden bg-gray-200 relative"
            >
              <img
                :src="carouselImages3[currentImageIndex3]"
                :alt="project.titulo"
                class="h-40 w-full object-contain object-center group-hover:scale-105 transition-transform duration-300 bg-white"
                @click="openImageModal(carouselImages3, currentImageIndex3)"
              />
              <!-- Flecha izquierda -->
              <button
                class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="prevImage3"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <!-- Flecha derecha -->
              <button
                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="nextImage3"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <!-- Indicadores de puntos -->
              <div
                class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1"
              >
                <button
                  v-for="(image, index) in carouselImages3"
                  :key="index"
                  class="w-2 h-2 rounded-full transition-all duration-200"
                  :class="[
                    currentImageIndex3 === index
                      ? 'bg-white'
                      : 'bg-white bg-opacity-50',
                  ]"
                  @click.stop="currentImageIndex3 = index"
                />
              </div>
            </div>
            <!-- Carrusel especial para el cuarto proyecto -->
            <div
              v-else-if="project.id === 4"
              class="aspect-w-16 aspect-h-9 w-full overflow-hidden bg-gray-200 relative"
            >
              <img
                :src="carouselImages4[currentImageIndex4]"
                :alt="project.titulo"
                class="h-40 w-full object-contain object-center group-hover:scale-105 transition-transform duration-300 bg-white"
                @click="openImageModal(carouselImages4, currentImageIndex4)"
              />
              <!-- Flecha izquierda -->
              <button
                class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="prevImage4"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <!-- Flecha derecha -->
              <button
                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="nextImage4"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <!-- Indicadores de puntos -->
              <div
                class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1"
              >
                <button
                  v-for="(image, index) in carouselImages4"
                  :key="index"
                  class="w-2 h-2 rounded-full transition-all duration-200"
                  :class="[
                    currentImageIndex4 === index
                      ? 'bg-white'
                      : 'bg-white bg-opacity-50',
                  ]"
                  @click.stop="currentImageIndex4 = index"
                />
              </div>
            </div>
            <!-- Carrusel especial para el quinto proyecto -->
            <div
              v-else-if="project.id === 5"
              class="aspect-w-16 aspect-h-9 w-full overflow-hidden bg-gray-200 relative"
            >
              <img
                :src="carouselImages5[currentImageIndex5]"
                :alt="project.titulo"
                class="h-40 w-full object-contain object-center group-hover:scale-105 transition-transform duration-300 bg-white"
                @click="openImageModal(carouselImages5, currentImageIndex5)"
              />
              <!-- Flecha izquierda -->
              <button
                class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="prevImage5"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <!-- Flecha derecha -->
              <button
                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="nextImage5"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <!-- Indicadores de puntos -->
              <div
                class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1"
              >
                <button
                  v-for="(image, index) in carouselImages5"
                  :key="index"
                  class="w-2 h-2 rounded-full transition-all duration-200"
                  :class="[
                    currentImageIndex5 === index
                      ? 'bg-white'
                      : 'bg-white bg-opacity-50',
                  ]"
                  @click.stop="currentImageIndex5 = index"
                />
              </div>
            </div>
            <!-- Carrusel especial para el sexto proyecto -->
            <div
              v-else-if="project.id === 6"
              class="aspect-w-16 aspect-h-9 w-full overflow-hidden bg-gray-200 relative"
            >
              <img
                :src="carouselImages6[currentImageIndex6]"
                :alt="project.titulo"
                class="h-40 w-full object-contain object-center group-hover:scale-105 transition-transform duration-300 bg-white"
                @click="openImageModal(carouselImages6, currentImageIndex6)"
              />
              <!-- Flecha izquierda -->
              <button
                class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="prevImage6"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <!-- Flecha derecha -->
              <button
                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                @click.stop="nextImage6"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <!-- Indicadores de puntos -->
              <div
                class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1"
              >
                <button
                  v-for="(image, index) in carouselImages6"
                  :key="index"
                  class="w-2 h-2 rounded-full transition-all duration-200"
                  :class="[
                    currentImageIndex6 === index
                      ? 'bg-white'
                      : 'bg-white bg-opacity-50',
                  ]"
                  @click.stop="currentImageIndex6 = index"
                />
              </div>
            </div>
            <!-- Imagen normal para otros proyectos -->
            <div
              v-else
              class="aspect-w-16 aspect-h-9 w-full overflow-hidden bg-gray-200"
            >
              <img
                :src="project.imagen_url"
                :alt="project.titulo"
                class="h-40 w-full object-contain object-center group-hover:scale-105 transition-transform duration-300 bg-white"
                @click="openImageModal([project.imagen_url], 0)"
              />
            </div>
            <div class="p-4">
              <h4 class="text-sm font-semibold text-gray-900 mb-1">
                {{ project.titulo }}
              </h4>
              <p class="text-xs text-primary-600 font-medium mb-2">
                {{ project.categoria }}
              </p>
              <p class="text-sm text-gray-600 mb-2 line-clamp-2">
                {{ project.descripcion }}
              </p>
              <div
                class="flex items-center justify-between text-xs text-gray-500"
              >
                <span>{{ project.ubicacion }}</span>
                <span>{{ project.fecha_completado }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
        <button
          v-if="modalImages.length > 1"
          class="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 text-white rounded-full p-3"
          @click="prevModalImage"
        >
          ‹
        </button>
        <button
          v-if="modalImages.length > 1"
          class="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 text-white rounded-full p-3"
          @click="nextModalImage"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>
