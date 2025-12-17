const axios = require('axios');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('xano');

// Configuración de APIs de Xano

// API de Autenticación
const xanoAuthConfig = {
  baseURL: 'https://x8ki-letl-twmt.n7.xano.io/api:rT2fyQCN',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
};

// API de Cotizaciones y Pedidos (Main)
const xanoOrdersConfig = {
  baseURL: 'https://x8ki-letl-twmt.n7.xano.io/api:TZIZvj3s',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
};

// API de Members & Accounts (Usuarios)
const xanoMembersConfig = {
  baseURL: 'https://x8ki-letl-twmt.n7.xano.io/api:EvCUzMV_',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
};

// API de Event Logs
const xanoLogsConfig = {
  baseURL: 'https://x8ki-letl-twmt.n7.xano.io/api:9GWuhvFH',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
};

// Crear instancias de axios para Xano
const xanoAuthAPI = axios.create(xanoAuthConfig);
const xanoAPI = axios.create(xanoOrdersConfig); // Alias para compatibilidad (Business Logic)
const xanoMembersAPI = axios.create(xanoMembersConfig);
const xanoLogsAPI = axios.create(xanoLogsConfig);

// Helper para configurar interceptores
const setupInterceptors = (axiosInstance, name) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      if (config.headers && (config.headers['x-no-auth'] === '1' || config.headers['x-no-auth'] === true)) {
        delete config.headers.Authorization;
      } else {
        const token = config.headers.Authorization || process.env.XANO_API_KEY;
        if (token) {
          config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
      }
      
      logger.info(`${name} Request`, {
        method: config.method?.toUpperCase(),
        url: config.url,
        hasAuth: !!config.headers.Authorization
      });
      
      return config;
    },
    (error) => {
      logger.error(`Error en request a ${name}`, { error: error.message });
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      logger.info(`${name} Response`, {
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
      
      logger.error(`Error en response de ${name}`, errorInfo);
      
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
};

// Configurar interceptores para todas las instancias
setupInterceptors(xanoAuthAPI, 'Xano Auth API');
setupInterceptors(xanoAPI, 'Xano Orders API');
setupInterceptors(xanoMembersAPI, 'Xano Members API');
setupInterceptors(xanoLogsAPI, 'Xano Logs API');

// Función para probar la conexión con Xano
const testConnection = async () => {
  try {
    logger.info('Configuración de Xano actualizada', {
      auth: xanoAuthConfig.baseURL,
      orders: xanoOrdersConfig.baseURL,
      members: xanoMembersConfig.baseURL,
      logs: xanoLogsConfig.baseURL,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (error) {
    logger.error('Error al verificar configuración de Xano', { error: error.message });
    return false;
  }
};

// Generador de helpers
const createHelpers = (axiosInstance) => ({
  get: async (endpoint, params = {}, token = null, options = {}) => {
    try {
      const config = {};
      if (token) config.headers = { Authorization: `Bearer ${token}` };
      else if (options.noAuth) config.headers = { 'x-no-auth': '1' };
      if (Object.keys(params).length > 0) config.params = params;
      const response = await axiosInstance.get(endpoint, config);
      return response.data;
    } catch (error) { throw error; }
  },
  post: async (endpoint, data = {}, token = null, options = {}) => {
    try {
      const config = {};
      if (token) config.headers = { Authorization: `Bearer ${token}` };
      else if (options.noAuth) config.headers = { 'x-no-auth': '1' };
      const response = await axiosInstance.post(endpoint, data, config);
      return response.data;
    } catch (error) { throw error; }
  },
  put: async (endpoint, data = {}, token = null, options = {}) => {
    try {
      const config = {};
      if (token) config.headers = { Authorization: `Bearer ${token}` };
      else if (options.noAuth) config.headers = { 'x-no-auth': '1' };
      const response = await axiosInstance.put(endpoint, data, config);
      return response.data;
    } catch (error) { throw error; }
  },
  del: async (endpoint, token = null, options = {}) => {
    try {
      const config = {};
      if (token) config.headers = { Authorization: `Bearer ${token}` };
      else if (options.noAuth) config.headers = { 'x-no-auth': '1' };
      const response = await axiosInstance.delete(endpoint, config);
      return response.data;
    } catch (error) { throw error; }
  },
  patch: async (endpoint, data = {}, token = null, options = {}) => {
    try {
      const config = {};
      if (token) config.headers = { Authorization: `Bearer ${token}` };
      else if (options.noAuth) config.headers = { 'x-no-auth': '1' };
      const response = await axiosInstance.patch(endpoint, data, config);
      return response.data;
    } catch (error) { throw error; }
  }
});

const ordersHelpers = createHelpers(xanoAPI);
const authHelpers = createHelpers(xanoAuthAPI);
const membersHelpers = createHelpers(xanoMembersAPI);
const logsHelpers = createHelpers(xanoLogsAPI);

// Función para manejar paginación (default to orders/main API)
const getPaginated = async (endpoint, page = 1, limit = 10, params = {}, token = null, options = {}) => {
  try {
    const paginationParams = { page, per_page: limit, ...params };
    const response = await ordersHelpers.get(endpoint, paginationParams, token, options);
    return {
      data: response.items || response.data || response,
      pagination: {
        page: response.page || page,
        per_page: response.per_page || limit,
        total: response.total || response.count,
        pages: response.pages || Math.ceil((response.total || response.count || 0) / limit)
      }
    };
  } catch (error) { throw error; }
};

// Dummy query/transaction for compatibility with old routes
const query = async () => { throw new Error('Local DB not supported. Use Xano Service.'); };
const transaction = async () => { throw new Error('Local DB not supported. Use Xano Service.'); };

module.exports = {
  xanoAPI,
  xanoAuthAPI,
  xanoMembersAPI,
  xanoLogsAPI,
  // Default helpers (mapped to Orders/Main)
  get: ordersHelpers.get,
  post: ordersHelpers.post,
  put: ordersHelpers.put,
  del: ordersHelpers.del,
  patch: ordersHelpers.patch,
  // Auth helpers
  authGet: authHelpers.get,
  authPost: authHelpers.post,
  authPut: authHelpers.put,
  authDel: authHelpers.del,
  authPatch: authHelpers.patch,
  // Members helpers
  membersGet: membersHelpers.get,
  membersPost: membersHelpers.post,
  membersPut: membersHelpers.put,
  membersDel: membersHelpers.del,
  // Logs helpers
  logsGet: logsHelpers.get,
  logsPost: logsHelpers.post,
  // Utilities
  getPaginated,
  testConnection,
  query,
  transaction
};
