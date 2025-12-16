// IMPORTS - Importación de dependencias necesarias
import axios from 'axios'
import { useToast } from 'vue-toastification'

const AUTH_API_BASE = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_AUTH_API_BASE_URL ||
    'https://x8ki-letl-twmt.n7.xano.io/api:29YGdjkj'
const APP_API_BASE = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_APP_API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'https://x8ki-letl-twmt.n7.xano.io/api:nWj2ojpi'
const authApi = axios.create({
  baseURL: AUTH_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})
const appApi = axios.create({
  baseURL: APP_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})
const api = appApi

// INTERCEPTOR PARA REQUESTS
// Se ejecuta antes de enviar cada petición HTTP
appApi.interceptors.request.use(
  config => {
    // AUTENTICACIÓN AUTOMÁTICA - Agregar token JWT si existe en localStorage
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (import.meta.env.DEV) {
      const uStr = localStorage.getItem('user')
      let u = null
      try {
        u = uStr ? JSON.parse(uStr) : null
      } catch (e) {
        u = null
      }
      if (u && u.id) {
        config.headers['x-dev-user-id'] = u.id
        if (u.nombre) config.headers['x-dev-user-nombre'] = u.nombre
        if (u.rol) config.headers['x-dev-user-rol'] = u.rol
        if (u.email) config.headers['x-dev-user-email'] = u.email
        if (u.correo) config.headers['x-dev-user-email'] = u.correo
      }
    }

    // LOGGING EN DESARROLLO - Registrar peticiones para debugging
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      })
    }

    return config
  },
  error => {
    console.error('Error en request:', error)
    return Promise.reject(error)
  },
)

// INTERCEPTOR PARA RESPONSES
// Se ejecuta después de recibir cada respuesta HTTP
appApi.interceptors.response.use(
  response => {
    // LOGGING DE RESPUESTAS EXITOSAS en desarrollo
    if (import.meta.env.DEV) {
      console.log(
        `✅ ${response.config.method?.toUpperCase()} ${response.config.url}`,
        { status: response.status, data: response.data },
      )
    }

    return response
  },
  async error => {
    const toast = useToast()

    // LOGGING DE ERRORES en desarrollo
    if (import.meta.env.DEV) {
      console.error(
        `❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        },
      )
    }

    // MANEJO CENTRALIZADO DE ERRORES HTTP
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          // MANEJO DE AUTENTICACIÓN - Token expirado o inválido
          if (data.codigo === 'TOKEN_EXPIRADO') {
            // Intentar renovar token automáticamente
            try {
              const refreshToken = localStorage.getItem('refreshToken')
              if (refreshToken) {
                const refreshResponse = await authApi.post('/auth/refresh', {
                  token: refreshToken,
                })

                const newToken =
                  refreshResponse.data.token || refreshResponse.data.authToken
                localStorage.setItem('token', newToken)

                // Reintentar la petición original con el nuevo token
                error.config.headers.Authorization = `Bearer ${newToken}`
                return appApi.request(error.config)
              }
            } catch (refreshError) {
              // Si el refresh falla, limpiar tokens y redirigir a login
              localStorage.removeItem('token')
              localStorage.removeItem('refreshToken')
              window.location.href = '/login'
              return Promise.reject(refreshError)
            }
          } else {
            // Error de autenticación general
            toast.error(data.mensaje || 'No autorizado')
            // Limpiar tokens para evitar bucles de redirección al home
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            // Redirigir a login si no estamos ya ahí
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'
            }
          }
          break

        case 403:
          // MANEJO DE PERMISOS - Usuario sin autorización para la acción
          toast.error(
            data.mensaje || 'No tienes permisos para realizar esta acción',
          )
          break

        case 404:
          // RECURSO NO ENCONTRADO
          toast.error(data.mensaje || 'Recurso no encontrado')
          break

        case 422:
          // ERRORES DE VALIDACIÓN - Mostrar errores específicos de campos
          if (data.errores && Array.isArray(data.errores)) {
            data.errores.forEach(error => {
              toast.error(`${error.campo}: ${error.mensaje}`)
            })
          } else {
            toast.error(data.mensaje || 'Error de validación')
          }
          break

        case 429:
          // RATE LIMITING - Demasiadas peticiones
          toast.error('Demasiadas solicitudes. Intenta de nuevo más tarde')
          break

        case 500:
          // ERROR INTERNO DEL SERVIDOR
          toast.error('Error interno del servidor. Intenta de nuevo más tarde')
          break

        default:
          // OTROS ERRORES HTTP
          toast.error(data.mensaje || `Error ${status}`)
      }
    } else if (error.request) {
      // ERROR DE RED - Sin respuesta del servidor
      toast.error('Error de conexión. Verifica tu conexión a internet')
    } else {
      // ERROR DE CONFIGURACIÓN - Error en la configuración de la petición
      toast.error('Error inesperado')
    }

    return Promise.reject(error)
  },
)

authApi.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error),
)

authApi.interceptors.response.use(
  response => response,
  error => Promise.reject(error),
)

// MÉTODOS DE CONVENIENCIA
// Funciones wrapper para simplificar el uso de la API
export const apiMethods = {
  // GET request - Obtener datos
  get: (url, config = {}) => api.get(url, config),

  // POST request - Crear nuevos recursos
  post: (url, data = {}, config = {}) => api.post(url, data, config),

  // PUT request - Actualizar recursos completos
  put: (url, data = {}, config = {}) => api.put(url, data, config),

  // PATCH request - Actualizar recursos parcialmente
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),

  // DELETE request - Eliminar recursos
  delete: (url, config = {}) => api.delete(url, config),

  // UPLOAD FILE - Subir archivos con FormData
  upload: (url, formData, config = {}) => {
    return api.post(url, formData, {
      ...config,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // DOWNLOAD FILE - Descargar archivos como blob
  download: (url, config = {}) => {
    return api.get(url, {
      ...config,
      responseType: 'blob',
    })
  },
}

// FUNCIONES ESPECÍFICAS PARA ENDPOINTS

// API DE AUTENTICACIÓN - Manejo de sesiones y tokens
export const authAPI = {
  // Iniciar sesión con credenciales
  login: credentials =>
    authApi.post(import.meta.env.DEV ? '/login' : '/auth/login', credentials),
  // Iniciar sesión como administrador
  adminLogin: credentials =>
    authApi.post(import.meta.env.DEV ? '/login' : '/auth/login', credentials),
  // Registrar nuevo usuario
  register: userData =>
    authApi.post(
      import.meta.env.DEV ? '/usuarios/registrar' : '/auth/register',
      userData,
    ),
  // Cerrar sesión
  logout: () => authApi.post(import.meta.env.DEV ? '/logout' : '/auth/logout'),
  // Renovar token de acceso
  refreshToken: refreshToken =>
    authApi.post(import.meta.env.DEV ? '/refresh-token' : '/auth/refresh', {
      token: refreshToken,
    }),
  // Verificar validez del token actual (en desarrollo usa perfil)
  verifyToken: () =>
    authApi.get(import.meta.env.DEV ? '/usuarios/perfil' : '/auth/me'),
  // Solicitar recuperación de contraseña
  forgotPassword: email =>
    authApi.post(
      import.meta.env.DEV ? '/forgot-password' : '/auth/forgot-password',
      { email },
    ),
  // Restablecer contraseña con token
  resetPassword: resetData =>
    authApi.post(
      import.meta.env.DEV ? '/reset-password' : '/auth/reset-password',
      resetData,
    ),
}

// API DE USUARIOS - Gestión de perfiles y usuarios
export const usersAPI = {
  // Obtener perfil del usuario actual
  getProfile: () => appApi.get('/usuarios/perfil'),
  // Actualizar perfil del usuario
  updateProfile: data => {
    const payload = {}
    if (data?.nombre !== undefined || data?.nombre_completo !== undefined) {
      payload.nombre = data?.nombre ?? data?.nombre_completo
    }
    if (data?.telefono !== undefined) {
      payload.telefono = data.telefono
    }
    if (data?.direccion !== undefined) {
      payload.direccion = data.direccion
    }
    return appApi.put('/usuarios/perfil', payload)
  },
  // Cambiar contraseña del usuario
  changePassword: data => {
    const payload = {
      contraseñaActual: data?.current_password || data?.contraseñaActual || '',
      contraseñaNueva: data?.new_password || data?.contraseñaNueva || '',
    }
    return appApi.put('/usuarios/cambiar-contraseña', payload)
  },
  // Listar usuarios (admin)
  getUsers: params => appApi.get('/usuarios', { params }),
  // Obtener usuario específico por ID
  getUserById: id => appApi.get(`/usuarios/${id}`),
  // Actualizar usuario específico (admin)
  updateUser: (id, data) => appApi.put(`/usuarios/${id}`, data),
  // Desactivar usuario (admin)
  deactivateUser: id => appApi.patch(`/usuarios/${id}/desactivar`),
  // Reactivar usuario (admin)
  reactivateUser: id => appApi.patch(`/usuarios/${id}/reactivar`),
}

// API DE PEDIDOS - Gestión de órdenes y cotizaciones
export const ordersAPI = {
  // Listar pedidos del usuario con filtros
  getOrders: params => appApi.get('/pedidos', { params }),
  // Obtener pedido específico por ID
  getOrderById: id => appApi.get(`/pedidos/${id}`),
  // Crear nuevo pedido
  createOrder: data => appApi.post('/pedidos', data),
  // Actualizar estado del pedido (admin)
  updateOrderStatus: (id, data) => appApi.patch(`/pedidos/${id}/estado`, data),
  // Actualizar cotización del pedido (admin)
  updateOrderQuote: (id, data) =>
    appApi.patch(`/pedidos/${id}/cotizacion`, data),
  // Obtener todos los pedidos (admin)
  getAllOrders: params => appApi.get('/pedidos/admin/todos', { params }),
}

// API DE CATÁLOGO - Gestión de productos y muebles
export const catalogAPI = {
  // Listar productos con filtros y paginación
  getProducts: params => appApi.get('/catalogo', { params }),
  // Obtener producto específico por ID
  getProductById: id => appApi.get(`/catalogo/${id}`),
  // Crear nuevo producto (admin)
  createProduct: data => appApi.post('/catalogo', data),
  // Actualizar producto existente (admin)
  updateProduct: (id, data) => appApi.put(`/catalogo/${id}`, data),
  // Desactivar producto (admin)
  deactivateProduct: id => appApi.patch(`/catalogo/${id}/desactivar`),
  // Reactivar producto (admin)
  reactivateProduct: id => appApi.patch(`/catalogo/${id}/reactivar`),
  // Obtener opciones de filtros disponibles
  getFilterOptions: () => appApi.get('/catalogo/filtros/opciones'),
  // Obtener estadísticas del catálogo (admin)
  getStatistics: () => appApi.get('/catalogo/estadisticas'),
}

// API DE RECOMENDACIONES - Gestión de IA y sugerencias
export const recommendationsAPI = {
  // Listar recomendaciones del usuario
  getRecommendations: params => appApi.get('/recomendaciones', { params }),
  // Obtener recomendación específica por ID
  getRecommendationById: id => appApi.get(`/recomendaciones/${id}`),
  // Crear nueva recomendación con IA
  createRecommendation: data => appApi.post('/recomendaciones', data),
  // Actualizar recomendación existente
  updateRecommendation: (id, data) =>
    appApi.put(`/recomendaciones/${id}`, data),
  // Obtener todas las recomendaciones (admin)
  getAllRecommendations: params =>
    appApi.get('/recomendaciones/admin/todas', { params }),
  // Obtener recomendaciones específicas de un pedido
  getOrderRecommendations: orderId =>
    appApi.get(`/recomendaciones/pedido/${orderId}`),
  // Obtener estadísticas de recomendaciones (admin)
  getStatistics: () => appApi.get('/recomendaciones/estadisticas'),
}

// API DE NOTIFICACIONES - Gestión de alertas y mensajes
export const notificationsAPI = {
  // Listar notificaciones del usuario con filtros
  getNotifications: params => appApi.get('/notificaciones', { params }),
  // Marcar notificación específica como leída
  markAsRead: id => appApi.patch(`/notificaciones/${id}/leida`),
  // Marcar todas las notificaciones como leídas
  markAllAsRead: () => appApi.patch('/notificaciones/marcar-todas-leidas'),
  // Obtener preferencias de notificaciones
  getPreferences: () => appApi.get('/notificaciones/preferencias'),
  // Actualizar preferencias de notificaciones
  updatePreferences: data => appApi.put('/notificaciones/preferencias', data),
  // Enviar notificación (admin)
  sendNotification: data => appApi.post('/notificaciones/enviar', data),
  // Obtener todas las notificaciones (admin)
  getAllNotifications: params =>
    appApi.get('/notificaciones/admin/todas', { params }),
  // Obtener estadísticas de notificaciones (admin)
  getStatistics: () => appApi.get('/notificaciones/estadisticas'),
}

// EXPORTACIÓN POR DEFECTO - Instancia principal de Axios configurada
export default api
