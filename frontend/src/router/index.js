// IMPORTS - Importación de Vue Router y store de autenticación
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// IMPORTAR VISTAS - Importación de todos los componentes de vista
import Home from '@/views/HomeView.vue'
import Login from '@/views/auth/LoginView.vue'
import Register from '@/views/auth/RegisterView.vue'
import ForgotPassword from '@/views/auth/ForgotPasswordView.vue'
import ResetPassword from '@/views/auth/ResetPasswordView.vue'

// Vistas del catálogo
import Catalog from '@/views/CatalogoView.vue'
import Cotizaciones from '@/views/CotizacionesView.vue'

// Vistas de cotizaciones del usuario
import MisCotizaciones from '@/views/MisCotizacionesView.vue'

// Vistas de recomendaciones

// Vistas de análisis de espacio con IA
import AnalisisEspacio from '@/views/AnalisisEspacioView.vue'

// Vistas de diagnóstico de IA
import DiagnosticoIA from '@/views/DiagnosticoIAView.vue'

// Vistas del perfil
import Profile from '@/views/PerfilView.vue'

// Vistas de administración
import AdminDashboard from '@/views/DashboardView.vue'
import AdminQuotes from '@/views/AdminCotizacionesView.vue'
import AdminQuoteDetail from '@/views/AdminCotizacionDetalleView.vue'
import SobreNosotros from '@/views/SobreNosotrosView.vue'
import ComoFunciona from '@/views/ComoFuncionaView.vue'
import Testimonios from '@/views/TestimoniosView.vue'
import Ayuda from '@/views/AyudaView.vue'
import Contacto from '@/views/ContactoView.vue'
import FAQ from '@/views/FAQView.vue'
import Privacidad from '@/views/PrivacidadView.vue'
import Terminos from '@/views/TerminosView.vue'
import Cookies from '@/views/CookiesView.vue'
import Sitemap from '@/views/SitemapView.vue'

// CONFIGURACIÓN DE RUTAS - Definición de todas las rutas de la aplicación
const routes = [
  // RUTAS PÚBLICAS - Accesibles sin autenticación
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      title: 'Inicio',
      requiresAuth: false, // No requiere autenticación
    },
  },
  {
    path: '/privacidad',
    name: 'privacidad',
    component: Privacidad,
    meta: { title: 'Política de Privacidad', requiresAuth: false },
  },
  {
    path: '/terminos',
    name: 'terminos',
    component: Terminos,
    meta: { title: 'Términos de Servicio', requiresAuth: false },
  },
  {
    path: '/cookies',
    name: 'cookies',
    component: Cookies,
    meta: { title: 'Política de Cookies', requiresAuth: false },
  },
  {
    path: '/sitemap',
    name: 'sitemap',
    component: Sitemap,
    meta: { title: 'Mapa del Sitio', requiresAuth: false },
  },
  {
    path: '/sobre-nosotros',
    name: 'sobre-nosotros',
    component: SobreNosotros,
    meta: { title: 'Sobre Nosotros', requiresAuth: false },
  },
  {
    path: '/como-funciona',
    name: 'como-funciona',
    component: ComoFunciona,
    meta: { title: 'Cómo Funciona', requiresAuth: false },
  },
  {
    path: '/testimonios',
    name: 'testimonios',
    component: Testimonios,
    meta: { title: 'Testimonios', requiresAuth: false },
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: 'Iniciar Sesión',
      requiresAuth: false,
      hideForAuth: true, // Se oculta para usuarios ya autenticados
    },
  },

  {
    path: '/admin/login',
    name: 'admin-login',
    component: Login,
    meta: {
      title: 'Login Administrador',
      requiresAuth: false,
      hideForAuth: true,
    },
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: {
      title: 'Registrarse',
      requiresAuth: false,
      hideForAuth: true, // Se oculta para usuarios ya autenticados
    },
  },
  {
    path: '/auth/forgot-password',
    name: 'forgot-password',
    component: ForgotPassword,
    meta: {
      title: 'Recuperar Contraseña',
      requiresAuth: false,
      hideForAuth: true, // Se oculta para usuarios ya autenticados
    },
  },
  {
    path: '/auth/reset-password/:token',
    name: 'reset-password',
    component: ResetPassword,
    meta: {
      title: 'Restablecer Contraseña',
      requiresAuth: false,
      hideForAuth: true, // Se oculta para usuarios ya autenticados
    },
  },

  // RUTAS DEL CATÁLOGO - Visualización de productos
  {
    path: '/catalogo',
    name: 'catalog',
    component: Catalog,
    meta: {
      title: 'Catálogo',
      requiresAuth: false, // Accesible para todos los usuarios
    },
  },

  {
    path: '/cotizaciones',
    name: 'cotizaciones',
    component: Cotizaciones,
    meta: {
      title: 'Cotizaciones',
      requiresAuth: false,
    },
  },

  // RUTA NUEVA: Mis Cotizaciones - listado de cotizaciones del usuario
  {
    path: '/mis-cotizaciones',
    name: 'mis-cotizaciones',
    component: MisCotizaciones,
    meta: {
      title: 'Mis Cotizaciones',
      requiresAuth: true,
    },
  },

  // RUTAS DE ANÁLISIS DE ESPACIO - Sistema de IA para análisis de espacios
  {
    path: '/analisis-espacio',
    name: 'analisis-espacio',
    component: AnalisisEspacio,
    meta: {
      title: 'Análisis de espacio con IA',
      requiresAuth: true, // Requiere autenticación
    },
  },

  // RUTAS DE DIAGNÓSTICO DE IA - Herramientas de diagnóstico para IA
  {
    path: '/diagnostico-ia',
    name: 'diagnostico-ia',
    component: DiagnosticoIA,
    meta: {
      title: 'Diagnóstico de IA',
      requiresAuth: true, // Requiere autenticación
    },
  },

  // RUTAS DEL PERFIL - Gestión del perfil de usuario
  {
    path: '/perfil',
    name: 'profile',
    component: Profile,
    meta: {
      title: 'Mi Perfil',
      requiresAuth: true, // Requiere autenticación
    },
  },

  // RUTAS DE DASHBOARD - Panel de usuario
  {
    path: '/dashboard',
    name: 'dashboard',
    component: AdminDashboard,
    meta: {
      title: 'Mi Área Personal',
      requiresAuth: true, // Requiere autenticación
    },
  },

  // RUTAS DE ADMINISTRACIÓN - Panel administrativo
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: AdminDashboard,
    meta: {
      title: 'Panel de Administración',
      requiresAuth: true,
      requiresAdmin: true, // Requiere permisos de administrador
    },
  },
  {
    path: '/admin/cotizaciones',
    name: 'admin-quotes',
    component: AdminQuotes,
    meta: {
      title: 'Cotizaciones',
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/admin/cotizaciones/:id',
    name: 'admin-quote-detail',
    component: AdminQuoteDetail,
    meta: {
      title: 'Detalle de Cotización',
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/ayuda',
    name: 'ayuda',
    component: Ayuda,
    meta: { title: 'Centro de Ayuda', requiresAuth: false },
  },
  {
    path: '/contacto',
    name: 'contacto',
    component: Contacto,
    meta: { title: 'Contacto', requiresAuth: false },
  },
  {
    path: '/faq',
    name: 'faq',
    component: FAQ,
    meta: { title: 'Preguntas Frecuentes', requiresAuth: false },
  },
]

// CREACIÓN DEL ROUTER - Configuración del router con historial web
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Comportamiento de scroll al navegar entre rutas
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition // Restaurar posición guardada (botón atrás)
    } else {
      return { top: 0 } // Ir al inicio de la página
    }
  },
})

// GUARDS DE NAVEGACIÓN - Middleware para controlar el acceso a rutas
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Actualizar el título de la página dinámicamente
  document.title = to.meta.title
    ? `${to.meta.title} - Sistema de Muebles`
    : 'Sistema de Muebles'

  // Verificar si hay un token pero no hay datos de usuario (página recargada)
  if (authStore.token && !authStore.user) {
    try {
      await authStore.verifyToken() // Verificar validez del token y obtener datos del usuario
    } catch (error) {
      console.warn('Token inválido al navegar:', error)
      // Solo hacer logout si estamos intentando acceder a una ruta protegida
      if (to.meta.requiresAuth) {
        authStore.logout()
        next({
          name: 'login',
          query: { redirect: to.fullPath },
        })
        return
      }
    }
  }

  // Redirigir usuarios autenticados lejos de páginas de auth (login/register)
  if (to.meta.hideForAuth && authStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }

  // Verificar autenticación requerida para rutas protegidas
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }, // Guardar ruta de destino para redirección post-login
    })
    return
  }

  // Verificar permisos de administrador para rutas administrativas
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'admin-login', query: { admin: 1, redirect: to.fullPath } })
    return
  }

  next() // Permitir navegación
})

export default router
