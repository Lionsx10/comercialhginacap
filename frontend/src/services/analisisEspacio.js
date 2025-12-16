// ============================================================================
// SERVICIO DE ANÁLISIS DE ESPACIO CON IA
// ============================================================================
// Este archivo contiene todas las funciones para interactuar con la API
// de análisis de espacios utilizando inteligencia artificial.

import api from './api'
import axios from 'axios'

// Instancia de axios sin autenticación para endpoints públicos
const publicApi = axios.create({
  baseURL: import.meta.env.DEV
    ? '/api'
    : import.meta.env.VITE_APP_API_BASE_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      'https://x8ki-letl-twmt.n7.xano.io/api:nWj2ojpi',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Convierte un archivo a base64
 * @param {File} file - Archivo a convertir
 * @returns {Promise<string>} - String en base64
 */
export const fileToBase64 = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

/**
 * Convierte un canvas a base64
 * @param {HTMLCanvasElement} canvas - Canvas a convertir
 * @param {string} format - Formato de imagen (default: 'image/png')
 * @param {number} quality - Calidad de la imagen (0-1, default: 0.9)
 * @returns {string} - String en base64
 */
export const canvasToBase64 = (canvas, format = 'image/png', quality = 0.9) => {
  return canvas.toDataURL(format, quality)
}

/**
 * Crea una imagen de máscara a partir de las coordenadas del rectángulo
 * @param {Object} rect - Coordenadas del rectángulo {x, y, width, height}
 * @param {Object} imageSize - Tamaño de la imagen original {width, height}
 * @returns {Promise<string>} - Imagen de máscara en base64
 */
export const createMaskFromRect = (rect, imageSize) => {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = imageSize.width
    canvas.height = imageSize.height

    // Fondo negro (área no seleccionada)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Rectángulo blanco (área seleccionada)
    ctx.fillStyle = 'white'
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)

    resolve(canvasToBase64(canvas))
  })
}

/**
 * Redimensiona una imagen manteniendo la proporción
 * @param {string} base64Image - Imagen en base64
 * @param {number} maxWidth - Ancho máximo
 * @param {number} maxHeight - Alto máximo
 * @returns {Promise<string>} - Imagen redimensionada en base64
 */
export const resizeImage = (base64Image, maxWidth = 512, maxHeight = 512) => {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // Calcular nuevas dimensiones manteniendo proporción
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvasToBase64(canvas))
    }
    img.src = base64Image
  })
}

// ============================================================================
// SERVICIOS DE API
// ============================================================================

/**
 * Genera una imagen con mueble usando IA
 * @param {Object} data - Datos para la generación
 * @param {string} data.room_image - Imagen de la habitación en base64
 * @param {string} data.mask_image - Imagen de máscara en base64
 * @param {string} data.furniture_image - Imagen del mueble en base64
 * @param {number} data.mueble_id - ID del mueble seleccionado
 * @param {string} data.prompt - Prompt opcional para la IA
 * @returns {Promise<Object>} - Respuesta con la imagen generada
 */
export const generarImagenConIA = async data => {
  try {
    console.log('Enviando solicitud de generación de imagen...', {
      mueble_id: data.mueble_id,
      prompt: data.prompt,
      room_image_size: data.room_image?.length || 0,
      mask_image_size: data.mask_image?.length || 0,
      furniture_image_size: data.furniture_image?.length || 0,
    })

    const response = await api.post('/analisis-espacio/generar-furniture', {
      room_image: data.room_image,
      mask_image: data.mask_image,
      furniture_image: data.furniture_image,
      mueble_id: data.mueble_id,
      prompt: data.prompt || '',
    })

    console.log('Respuesta de generación recibida:', {
      success: response.data.success,
      hasImages: !!response.data.data?.generated_images,
      imageCount: response.data.data?.generated_images?.length || 0,
    })

    // Adaptar la respuesta para incluir múltiples imágenes
    if (response.data.success && response.data.data?.generated_images) {
      response.data.data.images = response.data.data.generated_images
    }

    return response.data
  } catch (error) {
    console.error('Error al generar imagen con IA:', error)

    // Manejar diferentes tipos de errores
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          throw new Error(data.message || 'Error en los datos enviados')
        case 401:
          throw new Error('No autorizado. Por favor, inicia sesión nuevamente')
        case 503:
          throw new Error(
            'Servicio de IA temporalmente no disponible. Intenta más tarde',
          )
        case 500:
          throw new Error('Error interno del servidor. Intenta más tarde')
        default:
          throw new Error(data.message || 'Error desconocido')
      }
    } else if (error.request) {
      throw new Error(
        'No se pudo conectar con el servidor. Verifica tu conexión',
      )
    } else {
      throw new Error('Error al procesar la solicitud')
    }
  }
}

/**
 * Genera una imagen con IA usando archivos (nuevo endpoint basado en el código de ejemplo)
 * @param {FormData} formData - FormData con los archivos y parámetros
 * @returns {Promise<Object>} - Respuesta de la API
 */
export const generateWithFiles = async formData => {
  try {
    console.log('🚀 Enviando solicitud de generación con archivos...')

    const response = await publicApi.post(
      '/analisis-espacio/generate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      },
    )

    if (response.data.success) {
      return {
        success: true,
        image: response.data.image,
        message: 'Análisis completado exitosamente',
      }
    } else {
      console.error('❌ Error en la respuesta:', response.data.error)
      return {
        success: false,
        error: response.data.error || 'Error al generar la imagen',
      }
    }
  } catch (error) {
    console.error('❌ Error en generateWithFiles:', error)

    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Error del servidor',
      }
    } else if (error.request) {
      return {
        success: false,
        error: 'No se pudo conectar con el servidor',
      }
    } else {
      return {
        success: false,
        error: 'Error inesperado',
      }
    }
  }
}

/**
 * Obtiene el catálogo de muebles disponibles
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.categoria - Categoría de muebles (opcional)
 * @param {number} params.limit - Límite de resultados (default: 50)
 * @param {number} params.offset - Offset para paginación (default: 0)
 * @returns {Promise<Object>} - Catálogo de muebles
 */
export const obtenerCatalogoMuebles = async (params = {}) => {
  try {
    const { categoria, limit = 50, offset = 0 } = params

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (categoria) {
      queryParams.append('categoria', categoria)
    }

    console.log('Obteniendo catálogo de muebles...', {
      categoria,
      limit,
      offset,
    })

    const response = await publicApi.get(
      `/analisis-espacio/muebles?${queryParams}`,
    )

    console.log('Catálogo obtenido:', {
      total: response.data.data?.muebles?.length || 0,
      categorias: response.data.data?.categorias_disponibles?.length || 0,
    })

    return response.data
  } catch (error) {
    console.error('Error al obtener catálogo de muebles:', error)

    if (error.response) {
      const { status, data } = error.response
      throw new Error(
        data.message || `Error ${status}: No se pudo obtener el catálogo`
      )
    } else if (error.request) {
      throw new Error('No se pudo conectar con el servidor')
    } else {
      throw new Error('Error al procesar la solicitud')
    }
  }
}

/**
 * Obtiene el historial de análisis del usuario
 * @param {Object} params - Parámetros de consulta
 * @param {number} params.limit - Límite de resultados (default: 20)
 * @param {number} params.offset - Offset para paginación (default: 0)
 * @returns {Promise<Object>} - Historial de análisis
 */
export const obtenerHistorialAnalisis = async (params = {}) => {
  try {
    const { limit = 20, offset = 0 } = params

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    console.log('Obteniendo historial de análisis...', { limit, offset })

    const response = await api.get(`/analisis-espacio/historial?${queryParams}`)

    console.log('Historial obtenido:', {
      total: response.data.data?.analisis?.length || 0,
    })

    return response.data
  } catch (error) {
    console.error('Error al obtener historial de análisis:', error)

    if (error.response) {
      const { status, data } = error.response
      throw new Error(
        data.message || `Error ${status}: No se pudo obtener el historial`
      )
    } else if (error.request) {
      throw new Error('No se pudo conectar con el servidor')
    } else {
      throw new Error('Error al procesar la solicitud')
    }
  }
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Valida que un archivo sea una imagen válida
 * @param {File} file - Archivo a validar
 * @param {number} maxSize - Tamaño máximo en bytes (default: 10MB)
 * @returns {Object} - {valid: boolean, error?: string}
 */
export const validarImagenArchivo = (file, maxSize = 10 * 1024 * 1024) => {
  if (!file) {
    return { valid: false, error: 'No se ha seleccionado ningún archivo' }
  }

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'El archivo debe ser una imagen' }
  }

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `El archivo no puede ser mayor a ${maxSizeMB}MB`,
    }
  }

  return { valid: true }
}

/**
 * Valida que un rectángulo de selección sea válido
 * @param {Object} rect - Rectángulo {x, y, width, height}
 * @param {Object} imageSize - Tamaño de la imagen {width, height}
 * @returns {Object} - {valid: boolean, error?: string}
 */
export const validarRectanguloSeleccion = (rect, imageSize) => {
  if (!rect || typeof rect !== 'object') {
    return { valid: false, error: 'Rectángulo de selección inválido' }
  }

  const { x, y, width, height } = rect

  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number'
  ) {
    return {
      valid: false,
      error: 'Las coordenadas del rectángulo deben ser números',
    }
  }

  if (width <= 0 || height <= 0) {
    return {
      valid: false,
      error: 'El rectángulo debe tener dimensiones positivas',
    }
  }

  if (
    x < 0 ||
    y < 0 ||
    x + width > imageSize.width ||
    y + height > imageSize.height
  ) {
    return {
      valid: false,
      error: 'El rectángulo está fuera de los límites de la imagen',
    }
  }

  // Verificar que el área sea suficientemente grande (al menos 50x50 píxeles)
  if (width < 50 || height < 50) {
    return {
      valid: false,
      error: 'El área seleccionada debe ser de al menos 50x50 píxeles',
    }
  }

  return { valid: true }
}

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

export const CONFIGURACION_IA = {
  MAX_DIMENSION: 512,
  NUM_INFERENCE_STEPS: 20,
  MARGIN: 64,
  CROP: true,
  NUM_IMAGES_PER_PROMPT: 1,
  MODEL_TYPE: 'schnell',
}

export const CATEGORIAS_MUEBLES = [
  'sofas',
  'mesas',
  'sillas',
  'camas',
  'armarios',
  'estanterias',
]

export const FORMATOS_IMAGEN_SOPORTADOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export default {
  generarImagenConIA,
  generateWithFiles,
  obtenerCatalogoMuebles,
  obtenerHistorialAnalisis,
  fileToBase64,
  canvasToBase64,
  createMaskFromRect,
  resizeImage,
  validarImagenArchivo,
  validarRectanguloSeleccion,
  CONFIGURACION_IA,
  CATEGORIAS_MUEBLES,
  FORMATOS_IMAGEN_SOPORTADOS,
}
