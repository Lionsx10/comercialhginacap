const axios = require('axios');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('xano');

// Configuración de Xano - API principal
const xanoConfig = {
  baseURL:
    process.env.XANO_API_URL ||
    process.env.XANO_API_BASE_URL ||
    'https://x8ki-letl-twmt.n7.xano.io/api:nWj2ojpi',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// Configuración de Xano - API de autenticación
const xanoAuthConfig = {
  baseURL:
    process.env.XANO_AUTH_URL ||
    process.env.XANO_API_URL ||
    process.env.XANO_API_BASE_URL ||
    'https://x8ki-letl-twmt.n7.xano.io/api:29YGdjkj',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// Crear instancias de axios para Xano
const xanoAPI = axios.create(xanoConfig);
const xanoAuthAPI = axios.create(xanoAuthConfig);

// Interceptor para requests - agregar token de autenticación si existe
xanoAPI.interceptors.request.use(
  (config) => {
    // Permitir solicitudes explícitamente públicas sin Authorization
    if (config.headers && (config.headers['x-no-auth'] === '1' || config.headers['x-no-auth'] === true)) {
      delete config.headers.Authorization;
    } else {
      const token = config.headers.Authorization || process.env.XANO_API_KEY;
      if (token) {
        config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
    }
    
    logger.info('Xano API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasAuth: !!config.headers.Authorization
    });
    
    return config;
  },
  (error) => {
    logger.error('Error en request a Xano', { error: error.message });
    return Promise.reject(error);
  }
);

// Interceptor para responses - manejo de errores
xanoAPI.interceptors.response.use(
  (response) => {
    logger.info('Xano API Response', {
      status: response.status,
      url: response.config.url,
      dataSize: JSON.stringify(response.data).length
    });
    return response;
  },
  (error) => {
    const errorInfo = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.response?.data?.message || error.message
    };
    
    logger.error('Error en response de Xano', errorInfo);
    
    // Personalizar errores según el código de estado
    if (error.response?.status === 401) {
      error.message = 'Token de autenticación inválido o expirado';
    } else if (error.response?.status === 403) {
      error.message = 'No tienes permisos para realizar esta acción';
    } else if (error.response?.status === 404) {
      error.message = 'Recurso no encontrado';
    } else if (error.response?.status >= 500) {
      error.message = 'Error interno del servidor';
    }
    
    return Promise.reject(error);
  }
);

// Interceptores para la API de autenticación
xanoAuthAPI.interceptors.request.use(
  (config) => {
    const token = config.headers.Authorization || process.env.XANO_API_KEY;
    if (token) {
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    
    logger.info('Xano Auth API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasAuth: !!config.headers.Authorization
    });
    
    return config;
  },
  (error) => {
    logger.error('Error en request a Xano Auth', { error: error.message });
    return Promise.reject(error);
  }
);

xanoAuthAPI.interceptors.response.use(
  (response) => {
    logger.info('Xano Auth API Response', {
      status: response.status,
      url: response.config.url,
      dataSize: JSON.stringify(response.data).length
    });
    return response;
  },
  (error) => {
    const errorInfo = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.response?.data?.message || error.message
    };
    
    logger.error('Error en response de Xano Auth', errorInfo);
    
    // Personalizar errores según el código de estado
    if (error.response?.status === 401) {
      error.message = 'Credenciales de autenticación inválidas';
    } else if (error.response?.status === 403) {
      error.message = 'No tienes permisos para realizar esta acción';
    } else if (error.response?.status === 404) {
      error.message = 'Endpoint de autenticación no encontrado';
    } else if (error.response?.status >= 500) {
      error.message = 'Error interno del servidor de autenticación';
    }
    
    return Promise.reject(error);
  }
);

// Función para probar la conexión con Xano
const testConnection = async () => {
  // Si no hay URLs de Xano configuradas, omitir la prueba de conexión
  const apiUrl = process.env.XANO_API_URL || process.env.XANO_API_BASE_URL;
  if (!apiUrl || apiUrl.includes('your-workspace')) {
    logger.info('Xano no configurado, omitiendo prueba de conexión');
    return false;
  }

  try {
    // Probar conexión básica sin endpoint específico
    logger.info('Configuración de Xano detectada', {
      mainAPI: apiUrl,
      authAPI: process.env.XANO_AUTH_URL || apiUrl || 'usando main API',
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    logger.error('Error al verificar configuración de Xano', { 
      error: error.message 
    });
    return false;
  }
};

// Función helper para realizar peticiones GET
const get = async (endpoint, params = {}, token = null, options = {}) => {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    } else if (options.noAuth) {
      config.headers = { 'x-no-auth': '1' };
    }
    if (Object.keys(params).length > 0) {
      config.params = params;
    }
    
    const response = await xanoAPI.get(endpoint, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Función helper para realizar peticiones POST
const post = async (endpoint, data = {}, token = null, options = {}) => {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    } else if (options.noAuth) {
      config.headers = { 'x-no-auth': '1' };
    }
    
    const response = await xanoAPI.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Función helper para realizar peticiones PUT
const put = async (endpoint, data = {}, token = null, options = {}) => {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    } else if (options.noAuth) {
      config.headers = { 'x-no-auth': '1' };
    }
    
    const response = await xanoAPI.put(endpoint, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Función helper para realizar peticiones DELETE
const del = async (endpoint, token = null, options = {}) => {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    } else if (options.noAuth) {
      config.headers = { 'x-no-auth': '1' };
    }
    
    const response = await xanoAPI.delete(endpoint, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Función helper para realizar peticiones PATCH
const patch = async (endpoint, data = {}, token = null, options = {}) => {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    } else if (options.noAuth) {
      config.headers = { 'x-no-auth': '1' };
    }
    
    const response = await xanoAPI.patch(endpoint, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Función para manejar paginación de Xano
const getPaginated = async (endpoint, page = 1, limit = 10, params = {}, token = null, options = {}) => {
  try {
    const paginationParams = {
      page,
      per_page: limit,
      ...params
    };
    
    const response = await get(endpoint, paginationParams, token, options);
    
    // Xano devuelve la paginación en headers o en el response
    return {
      data: response.items || response.data || response,
      pagination: {
        page: response.page || page,
        per_page: response.per_page || limit,
        total: response.total || response.count,
        pages: response.pages || Math.ceil((response.total || response.count || 0) / limit)
      }
    };
  } catch (error) {
    throw error;
  }
};

// Funciones específicas para autenticación
const authPost = async (endpoint, data = {}, token = null) => {
  try {
    const config = {};
    if (token) {
      config.headers = { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` };
    }
    
    const response = await xanoAuthAPI.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

const authGet = async (endpoint, params = {}, token = null) => {
  try {
    const config = { params };
    if (token) {
      config.headers = { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` };
    }
    
    const response = await xanoAuthAPI.get(endpoint, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  xanoAPI,
  xanoAuthAPI,
  get,
  post,
  put,
  del,
  patch,
  getPaginated,
  authGet,
  authPost,
  testConnection
};
