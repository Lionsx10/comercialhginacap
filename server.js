const express = require('express');
const cors = require('cors');
const path = require('path');
// Helmet puede ser ESM en versiones recientes; lo cargamos dinámicamente
let helmetMiddleware = null;
async function setupHelmet(app) {
  try {
    // Intentar cargar versión CommonJS
    const helmetCjs = require('helmet');
    helmetMiddleware = helmetCjs;
  } catch (err) {
    // Fallback a import ESM
    const helmetEsm = (await import('helmet')).default;
    helmetMiddleware = helmetEsm;
  }

  app.use(helmetMiddleware({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://x8ki-letl-twmt.n7.xano.io"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
      },
    },
  }));
}
require('dotenv').config(); // Cargar variables de entorno

// Importar configuración de base de datos
const { testConnection } = require('./config/database');

// IMPORTAR RUTAS - Módulos de rutas organizados por funcionalidad
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const pedidosRoutes = require('./routes/pedidos');
const catalogoRoutes = require('./routes/catalogo');
const recomendacionesRoutes = require('./routes/recomendaciones');
const notificacionesRoutes = require('./routes/notificaciones');
const analisisEspacioRoutes = require('./routes/analisisEspacio');
const modelosRoutes = require('./routes/modelos');

// IMPORTAR MIDDLEWARE - Middleware personalizado para manejo de errores y logging
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

// CONFIGURACIÓN DEL SERVIDOR - Inicialización de Express y configuración del puerto
const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE DE SEGURIDAD - Configuración de Helmet para headers de seguridad
// Configurar Helmet de forma segura más adelante (ESM/CJS compatible)

// CONFIGURACIÓN CORS - Permitir peticiones desde el frontend
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:8080', // URL del frontend (producción)
    'http://localhost:8081', // Vite puede mover el puerto si 8080 está ocupado
    'http://localhost:5173', // URL del frontend (desarrollo con Vite)
    'http://127.0.0.1:5173' // Alternativa para localhost
  ],
  credentials: true, // Permitir cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'] // Headers permitidos
}));

// MIDDLEWARE PARA PARSING - Configuración para procesar JSON y URL-encoded
app.use(express.json({ limit: '10mb' })); // Límite de 10MB para JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Límite para form data

// MIDDLEWARE DE LOGGING - Registrar todas las peticiones HTTP
app.use(requestLogger);

// RUTA DE SALUD DEL SERVIDOR - Endpoint para verificar el estado del servidor
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), // Tiempo que lleva ejecutándose el servidor
    environment: process.env.NODE_ENV || 'development'
  });
});

// SERVIR ARCHIVOS ESTÁTICOS - Frontend (debe ir después de las rutas de API)
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// RUTAS API RAÍZ - Mover la información de la API a /api en lugar de raíz
app.get('/api', (req, res) => {
  res.json({
    message: 'API Sistema de Gestión de Muebles a Medida',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/login, /api/usuarios/registrar',
      usuarios: '/api/usuarios/*',
      pedidos: '/api/pedidos/*',
      catalogo: '/api/catalogo',
      recomendaciones: '/api/recomendaciones/*',
      notificaciones: '/api/notificaciones/*',
      analisisEspacio: '/api/analisis-espacio/*'
    }
  });
});

// CONFIGURACIÓN DE RUTAS - Montaje de rutas organizadas por módulos bajo el prefijo /api
app.use('/api', authRoutes); // Rutas de autenticación (login, registro)
app.use('/api/usuarios', usuariosRoutes); // Rutas de gestión de usuarios
app.use('/api/pedidos', pedidosRoutes); // Rutas de gestión de pedidos
app.use('/api/catalogo', catalogoRoutes); // Rutas del catálogo de productos
app.use('/api/recomendaciones', recomendacionesRoutes); // Rutas del sistema de IA
app.use('/api/notificaciones', notificacionesRoutes); // Rutas de notificaciones
app.use('/api/analisis-espacio', analisisEspacioRoutes); // Rutas de análisis de espacio con IA
app.use('/api/modelos', modelosRoutes); // Rutas de generación de modelos 3D

// MIDDLEWARE PARA RUTAS NO ENCONTRADAS Y SPA - Manejo de 404 para API y soporte SPA
// Si la ruta comienza con /api, devolver 404 JSON
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en esta API`,
    availableRoutes: [
      'GET /api',
      'GET /health',
      'POST /api/login'
    ]
  });
});

// Para cualquier otra ruta que no sea API, enviar el index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// MIDDLEWARE DE MANEJO DE ERRORES - Debe ir al final para capturar todos los errores
app.use(errorHandler);

// FUNCIÓN PARA INICIAR EL SERVIDOR - Configuración de inicio con verificación de BD
const startServer = async () => {
  try {
    // Probar conexión a la base de datos antes de iniciar
    await testConnection();
    // Configurar Helmet después de confirmar entorno
    await setupHelmet(app);

    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API disponible en: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);

      if (process.env.NODE_ENV === 'development') {
        console.log(`📚 Documentación: http://localhost:${PORT}/`);
      }
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1); // Salir con código de error
  }
};

// MANEJO DE SEÑALES - Configuración para cierre graceful del servidor
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

// MANEJO DE ERRORES NO CAPTURADOS - Prevención de crashes inesperados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1); // Salir con código de error para errores críticos
});

// INICIAR SERVIDOR - Llamada a la función de inicio
startServer();

module.exports = app;
