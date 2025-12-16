<script setup>
// ===== IMPORTACIONES =====
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

// ===== COMPOSABLES Y STORES =====
const router = useRouter() // Para navegación programática
const toast = useToast() // Para mostrar notificaciones toast
const authStore = useAuthStore() // Store de autenticación

// ===== ESTADO REACTIVO =====
const showUserMenu = ref(false) // Controla visibilidad del menú de usuario
const showMobileMenu = ref(false) // Controla visibilidad del menú móvil
const showNotifications = ref(false) // Controla visibilidad del panel de notificaciones
const showCart = ref(false) // Controla visibilidad del carrito
const notifications = ref([]) // Array de notificaciones del usuario
const cartItemsCount = ref(0) // Contador de items en el carrito

// ===== REFERENCIAS DE TEMPLATE =====
const userMenuRef = ref(null) // Referencia al elemento del menú de usuario

// ===== PROPIEDADES COMPUTADAS =====
// Calcula el número de notificaciones no leídas
const unreadNotificationsCount = computed(() => {
  return notifications.value.filter(n => !n.leida).length
})

// ===== FUNCIONES DE CARGA DE DATOS =====

// Carga las notificaciones del usuario con datos de ejemplo
const loadNotifications = async () => {
  if (!authStore.isAuthenticated) return // Solo cargar si está autenticado

  // Simular carga con datos de ejemplo
  await new Promise(resolve => setTimeout(resolve, 200))

  notifications.value = [
    {
      id: 1,
      titulo: 'Bienvenido a Comercial HG',
      mensaje: 'Gracias por registrarte. Explora nuestro catálogo de muebles.',
      leida: false,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // Hace 30 minutos
    },
    {
      id: 2,
      titulo: 'Nuevos productos disponibles',
      mensaje:
        'Hemos agregado nuevos muebles de baño, cocina y closets a nuestro catálogo.',
      leida: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Hace 1 día
    },
  ]
}

// Carga el contador de items en el carrito con datos de ejemplo
const loadCartCount = async () => {
  if (!authStore.isAuthenticated) return // Solo cargar si está autenticado

  // Simular carga con datos de ejemplo
  await new Promise(resolve => setTimeout(resolve, 100))
  cartItemsCount.value = 2 // Ejemplo: 2 items en el carrito
}

// ===== FUNCIONES DE CONTROL DE MENÚS =====

// Alterna la visibilidad del menú de usuario y cierra otros menús
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  showMobileMenu.value = false // Cierra menú móvil
  showNotifications.value = false // Cierra panel de notificaciones
}

// Alterna la visibilidad del menú móvil y cierra otros menús
const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  showUserMenu.value = false // Cierra menú de usuario
  showNotifications.value = false // Cierra panel de notificaciones
}

// Alterna la visibilidad del panel de notificaciones y cierra otros menús
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false // Cierra menú de usuario
  showMobileMenu.value = false // Cierra menú móvil

  // Carga notificaciones cuando se abre el panel
  if (showNotifications.value) {
    loadNotifications()
  }
}

// Alterna la visibilidad del carrito y cierra otros menús
const toggleCart = () => {
  showCart.value = !showCart.value
  showUserMenu.value = false // Cierra menú de usuario
  showMobileMenu.value = false // Cierra menú móvil
  showNotifications.value = false // Cierra panel de notificaciones
}

// Cierra todos los paneles y menús abiertos
const closeAllPanels = () => {
  showUserMenu.value = false
  showMobileMenu.value = false
  showNotifications.value = false
  showCart.value = false
}

// Marcar notificación como leída (simulado)
const markAsRead = async notificationId => {
  // Simular operación
  await new Promise(resolve => setTimeout(resolve, 100))

  const notification = notifications.value.find(n => n.id === notificationId)
  if (notification) {
    notification.leida = true
  }
}

// Marcar todas como leídas (simulado)
const markAllAsRead = async () => {
  // Simular operación
  await new Promise(resolve => setTimeout(resolve, 200))

  notifications.value.forEach(notification => {
    notification.leida = true
  })

  toast.success('Todas las notificaciones marcadas como leídas')
}

// Cerrar sesión
const logout = async () => {
  try {
    await authStore.logout()
    closeAllPanels()
    router.push('/')
    toast.success('Sesión cerrada exitosamente')
  } catch (error) {
    console.error('Error cerrando sesión:', error)
    toast.error('Error al cerrar sesión')
  }
}

// Formatear fecha
const formatDate = dateString => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now - date) / (1000 * 60 * 60)

  if (diffInHours < 1) {
    return 'Hace unos minutos'
  } else if (diffInHours < 24) {
    return `Hace ${Math.floor(diffInHours)} horas`
  } else if (diffInHours < 48) {
    return 'Ayer'
  } else {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })
  }
}

// Manejar clics fuera del menú de usuario
const handleClickOutside = event => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    showUserMenu.value = false
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  if (authStore.isAuthenticated) {
    loadNotifications()
    loadCartCount()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <!-- Barra de navegación principal - Fija en la parte superior -->
  <nav class="bg-white shadow-lg sticky top-0 z-40">
    <div class="container-custom">
      <div class="flex justify-between items-center h-16">
        <!-- ===== SECCIÓN LOGO ===== -->
        <div class="flex items-center">
          <!-- Logo clickeable que lleva al home -->
          <RouterLink to="/"
class="flex items-center">
            <!-- Logo SVG de COMERCIAL HG -->
            <img
              src="@/assets/logo-comercial-hg-compact.svg"
              alt="Comercial HG - Muebles De Baño y Cocina A Medidas"
              class="h-10 w-auto"
            />
          </RouterLink>
        </div>

        <!-- ===== NAVEGACIÓN PRINCIPAL (DESKTOP) ===== -->
        <div
          v-if="!authStore.isAdmin"
          class="hidden md:flex items-center space-x-8"
        >
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/cotizaciones"
            class="nav-link"
            :class="{
              'nav-link-active': $route.path.startsWith('/cotizaciones'),
            }"
          >
            Cotizaciones
          </RouterLink>
          <!-- Link a inicio/dashboard - Solo para usuarios autenticados -->
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/dashboard"
            class="nav-link"
            :class="{ 'nav-link-active': $route.path.startsWith('/dashboard') }"
          >
            Inicio
          </RouterLink>

          <!-- Link a análisis de espacio con IA - Solo para usuarios autenticados -->
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/analisis-espacio"
            class="nav-link"
            :class="{
              'nav-link-active': $route.path.startsWith('/analisis-espacio'),
            }"
          >
            Análisis de espacio
          </RouterLink>

          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/mis-cotizaciones"
            class="nav-link"
            :class="{
              'nav-link-active': $route.path.startsWith('/mis-cotizaciones'),
            }"
          >
            Mis Cotizaciones
          </RouterLink>
        </div>

        <!-- ===== ACCIONES DEL USUARIO ===== -->
        <div class="flex items-center space-x-4">
          <!-- Botón de notificaciones - Solo para usuarios autenticados -->
          <button
            v-if="authStore.isAuthenticated"
            class="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
            @click="toggleNotifications"
          >
            <!-- Icono de campana para notificaciones -->
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <!-- Badge con contador de notificaciones no leídas -->
            <span
              v-if="unreadNotificationsCount > 0"
              class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
            >
              {{ unreadNotificationsCount }}
            </span>
          </button>

          <!-- Menú de usuario -->
          <div
            v-if="authStore.isAuthenticated"
            ref="userMenuRef"
            class="relative"
          >
            <button
              class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              @click="toggleUserMenu"
            >
              <img
                :src="
                  authStore.user?.avatar_url &&
                  !authStore.user?.avatar_url.includes('default-avatar')
                    ? authStore.user?.avatar_url
                    : '/images/muebles/perfil.webp'
                "
                :alt="authStore.user?.nombre_completo"
                class="w-8 h-8 rounded-full object-cover"
              />
              <span class="hidden sm:block text-sm font-medium text-gray-700">
                {{ authStore.user?.nombre_completo?.split(' ')[0] }}
              </span>
              <svg
                class="w-4 h-4 text-gray-500 transition-transform"
                :class="{ 'rotate-180': showUserMenu }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <!-- Dropdown del usuario -->
            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
              >
                <RouterLink
                  to="/perfil"
                  class="dropdown-item"
                  @click="showUserMenu = false"
                >
                  <svg
                    class="w-4 h-4 mr-3"
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
                  Mi Perfil
                </RouterLink>

                <RouterLink
                  to="/mis-cotizaciones"
                  class="dropdown-item"
                  @click="showUserMenu = false"
                >
                  <svg
                    class="w-4 h-4 mr-3"
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
                  Mis Cotizaciones
                </RouterLink>

                <RouterLink
                  v-if="authStore.isAdmin"
                  to="/admin"
                  class="dropdown-item"
                  @click="showUserMenu = false"
                >
                  <svg
                    class="w-4 h-4 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Administración
                </RouterLink>

                <hr class="my-1" >

                <button
                  class="dropdown-item w-full text-left text-red-600 hover:bg-red-50"
                  @click="logout"
                >
                  <svg
                    class="w-4 h-4 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </Transition>
          </div>

          <!-- Botones de autenticación -->
          <div v-else
class="flex items-center space-x-3">
            <RouterLink
              to="/login"
              class="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Iniciar Sesión
            </RouterLink>
            <RouterLink to="/register"
class="btn-primary">
              Registrarse
            </RouterLink>
          </div>

          <!-- Botón de menú móvil -->
          <button
            class="md:hidden p-2 text-gray-600 hover:text-primary-600 transition-colors"
            @click="toggleMobileMenu"
          >
            <svg
              class="w-6 h-6"
              :class="{ hidden: showMobileMenu, block: !showMobileMenu }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <svg
              class="w-6 h-6"
              :class="{ block: showMobileMenu, hidden: !showMobileMenu }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Menú móvil -->
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div v-if="showMobileMenu"
class="md:hidden border-t border-gray-200">
          <div
            v-if="!authStore.isAdmin"
            class="px-2 pt-2 pb-3 space-y-1 bg-white"
          >
            <RouterLink
              v-if="authStore.isAuthenticated"
              to="/cotizaciones"
              class="mobile-nav-link"
              @click="showMobileMenu = false"
            >
              Cotizaciones
            </RouterLink>

            <RouterLink
              v-if="authStore.isAuthenticated"
              to="/analisis-espacio"
              class="mobile-nav-link"
              @click="showMobileMenu = false"
            >
              Análisis de espacio
            </RouterLink>

            <RouterLink
              v-if="authStore.isAuthenticated"
              to="/mis-cotizaciones"
              class="mobile-nav-link"
              @click="showMobileMenu = false"
            >
              Mis Cotizaciones
            </RouterLink>

            <RouterLink
              v-if="authStore.isAuthenticated"
              to="/dashboard"
              class="mobile-nav-link"
              @click="showMobileMenu = false"
            >
              Dashboard
            </RouterLink>

            <RouterLink
              v-if="authStore.isAuthenticated"
              to="/perfil"
              class="mobile-nav-link"
              @click="showMobileMenu = false"
            >
              Mi Perfil
            </RouterLink>

            <RouterLink
              v-if="authStore.isAdmin"
              to="/admin"
              class="mobile-nav-link"
              @click="showMobileMenu = false"
            >
              Administración
            </RouterLink>

            <div
              v-if="!authStore.isAuthenticated && !authStore.isAdmin"
              class="pt-4 border-t border-gray-200"
            >
              <RouterLink
                to="/login"
                class="mobile-nav-link"
                @click="showMobileMenu = false"
              >
                Iniciar Sesión
              </RouterLink>
              <RouterLink
                to="/register"
                class="mobile-nav-link"
                @click="showMobileMenu = false"
              >
                Registrarse
              </RouterLink>
            </div>

            <div v-else
class="pt-4 border-t border-gray-200">
              <button
                class="mobile-nav-link w-full text-left text-red-600"
                @click="logout"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Panel de notificaciones -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform translate-x-full"
      enter-to-class="transform translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform translate-x-0"
      leave-to-class="transform translate-x-full"
    >
      <div
        v-if="showNotifications"
        class="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 overflow-y-auto"
      >
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Notificaciones</h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600"
              @click="showNotifications = false"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="p-4">
          <div v-if="notifications.length === 0"
class="text-center py-8">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p class="mt-2 text-sm text-gray-500">No tienes notificaciones</p>
          </div>

          <div v-else
class="space-y-3">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              :class="{ 'bg-blue-50 border-blue-200': !notification.leida }"
              @click="markAsRead(notification.id)"
            >
              <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="notification.leida ? 'bg-gray-300' : 'bg-blue-500'"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">
                    {{ notification.titulo }}
                  </p>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ notification.mensaje }}
                  </p>
                  <p class="text-xs text-gray-500 mt-2">
                    {{ formatDate(notification.created_at) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="notifications.length > 0"
class="mt-4 text-center">
            <button
              class="text-sm text-primary-600 hover:text-primary-800"
              @click="markAllAsRead"
            >
              Marcar todas como leídas
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Overlay para cerrar paneles -->
    <div
      v-if="showNotifications"
      class="fixed inset-0 bg-black bg-opacity-25 z-40"
      @click="closeAllPanels"
    />
  </nav>
</template>

<style scoped>
.nav-link {
  @apply text-gray-600 hover:text-primary-600 font-medium transition-colors px-3 py-2 rounded-md;
}

.nav-link-active {
  @apply text-primary-600 bg-primary-50;
}

.dropdown-item {
  @apply flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors;
}

.mobile-nav-link {
  @apply block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors;
}
</style>
