// ============================================================================
// SERVICIO DE DIAGNÓSTICO DE IA
// ============================================================================
// Este archivo contiene funciones para diagnosticar problemas con la API de IA

import api from './api'

/**
 * Ejecuta diagnóstico completo de la conexión con Hugging Face
 * @returns {Promise<Object>} - Resultado del diagnóstico
 */
export const ejecutarDiagnostico = async () => {
  try {
    console.log('Ejecutando diagnóstico de IA...')

    const response = await api.get('/analisis-espacio/diagnostico')

    console.log('Diagnóstico completado:', response.data)

    return response.data
  } catch (error) {
    console.error('Error en diagnóstico:', error)
    throw error
  }
}

/**
 * Ejecuta prueba simple de IA
 * @returns {Promise<Object>} - Resultado de la prueba
 */
export const probarIA = async () => {
  try {
    console.log('Ejecutando prueba simple de IA...')

    const response = await api.post('/analisis-espacio/test-ia', {})

    console.log('Prueba de IA completada:', response.data)

    return response.data
  } catch (error) {
    console.error('Error en prueba de IA:', error)
    throw error
  }
}

/**
 * Formatea los resultados del diagnóstico para mostrar
 * @param {Object} diagnostico - Resultado del diagnóstico
 * @returns {Object} - Diagnóstico formateado
 */
export const formatearDiagnostico = diagnostico => {
  if (!diagnostico || !diagnostico.data) {
    return {
      estado: 'ERROR',
      mensaje: 'No se pudo obtener información de diagnóstico',
      tests: [],
    }
  }

  const { tests, summary } = diagnostico.data

  return {
    estado: summary.failed === 0 ? 'EXITOSO' : 'CON_ERRORES',
    mensaje: `${summary.passed}/${summary.total} pruebas exitosas`,
    timestamp: diagnostico.data.timestamp,
    tests: tests.map(test => ({
      nombre: test.name,
      estado: test.status,
      detalles: test.details || test.error || 'Sin detalles',
      esError: test.status === 'FAILED',
    })),
  }
}

export default {
  ejecutarDiagnostico,
  probarIA,
  formatearDiagnostico,
}
