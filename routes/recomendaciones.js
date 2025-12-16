// ============================================================================
// RUTAS DE RECOMENDACIONES DE IA
// ============================================================================
// Este archivo define todas las rutas relacionadas con el sistema de 
// recomendaciones de IA para muebles personalizados.
// 
// Funcionalidades principales:
// - Solicitar recomendaciones de IA basadas en parámetros del usuario
// - Gestionar y consultar recomendaciones existentes
// - Calificar y comentar recomendaciones
// - Estadísticas y administración de recomendaciones
// ============================================================================

// Importaciones necesarias
const express = require('express');              // Framework web para Node.js
const Joi = require('joi');                      // Librería para validación de datos
// const { query } = require('../config/database'); // Función para ejecutar consultas a la base de datos (DESHABILITADA - USANDO LOCAL DB)
const localDbService = require('../services/localDbService'); // Servicio de base de datos local
const { verificarToken, verificarAdmin, verificarPropietarioOAdmin } = require('../middleware/auth'); // Middleware de autenticación y autorización
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler'); // Middleware para manejo de errores
const { createLogger } = require('../middleware/logger'); // Sistema de logging

// Inicialización del router de Express y logger específico para recomendaciones
const router = express.Router();
const logger = createLogger('recomendaciones');

// ============================================================================
// ESQUEMAS DE VALIDACIÓN CON JOI
// ============================================================================

// Esquema para validar datos al solicitar una nueva recomendación de IA
const solicitarRecomendacionSchema = Joi.object({
  pedido_id: Joi.number().integer().positive().optional(),    // ID del pedido asociado (opcional)
  medidas: Joi.object({                                       // Dimensiones del mueble requerido
    largo: Joi.number().positive().required(),                // Largo en unidades especificadas
    ancho: Joi.number().positive().required(),                // Ancho en unidades especificadas
    alto: Joi.number().positive().required(),                 // Alto en unidades especificadas
    unidad: Joi.string().valid('cm', 'm', 'mm').default('cm') // Unidad de medida (por defecto cm)
  }).required(),
  material: Joi.alternatives().try(
    Joi.string().min(2).max(50),
    Joi.array().items(Joi.string().min(2).max(50))
  ).required().messages({
    'string.min': 'El material debe tener al menos 2 caracteres',
    'string.max': 'El material no puede exceder 50 caracteres',
    'any.required': 'El material es obligatorio'
  }),
  color: Joi.alternatives().try(
    Joi.string().min(2).max(30),
    Joi.array().items(Joi.string().min(2).max(30))
  ).required().messages({
    'string.min': 'El color debe tener al menos 2 caracteres',
    'string.max': 'El color no puede exceder 30 caracteres',
    'any.required': 'El color es obligatorio'
  }),
  estilo: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El estilo debe tener al menos 2 caracteres',
    'string.max': 'El estilo no puede exceder 50 caracteres',
    'any.required': 'El estilo es obligatorio'
  }),
  tipo_mueble: Joi.string().min(2).max(50).optional(),        // Tipo específico de mueble (opcional)
  presupuesto_estimado: Joi.number().positive().optional(),   // Presupuesto aproximado del cliente
  descripcion_adicional: Joi.string().max(500).optional(),    // Descripción adicional de requerimientos
  preferencias_especiales: Joi.array().items(Joi.string().max(100)).optional(), // Array de preferencias especiales
  especificaciones: Joi.object({
    puertas: Joi.number().integer().min(0).optional(),
    cajones: Joi.number().integer().min(0).optional(),
    bisagra: Joi.string().optional(),
    corredera: Joi.string().optional(),
    acabado: Joi.string().optional()
  }).optional()
});

// Esquema para validar actualizaciones de recomendaciones existentes
const actualizarRecomendacionSchema = Joi.object({
  texto_recomendacion: Joi.string().min(10).max(2000).optional(),              // Texto de la recomendación generada
  imagen_generada_url: Joi.string().uri().max(500).optional(),                 // URL de imagen generada por IA
  estado: Joi.string().valid('pendiente', 'procesando', 'completada', 'error').optional(), // Estado de la recomendación
  puntuacion_usuario: Joi.number().min(1).max(5).optional(),                   // Calificación del usuario (1-5 estrellas)
  comentario_usuario: Joi.string().max(500).optional()                         // Comentario del usuario sobre la recomendación
});

// ============================================================================
// RUTAS DE RECOMENDACIONES
// ============================================================================

// POST /recomendaciones/ia - Solicitar recomendación de IA
// Permite a los usuarios autenticados solicitar recomendaciones personalizadas
// de muebles utilizando inteligencia artificial basada en sus especificaciones
router.post('/ia', verificarToken, asyncHandler(async (req, res) => {
  const { error, value } = solicitarRecomendacionSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const {
    pedido_id,
    medidas,
    material,
    color,
    estilo,
    tipo_mueble,
    presupuesto_estimado,
    descripcion_adicional,
    preferencias_especiales,
    especificaciones
  } = value;

  // Restringir tipos de mueble: solo cocina o closet
  if (tipo_mueble) {
    const tipoLower = (tipo_mueble || '').toLowerCase();
    const esCocina = tipoLower.includes('cocin');
    const esCloset = tipoLower.includes('closet') || tipoLower.includes('clóset') || tipoLower.includes('armario');
    if (!esCocina && !esCloset) {
      throw new ValidationError('Solo se permiten recomendaciones de muebles de cocina o closet');
    }
  }

  // NOTA: Verificación de pedido_id omitida por no usar BD SQL (Xano)
  // En un entorno real sin SQL, deberíamos verificar contra otro servicio o archivo.

  try {
    // Importar el servicio de IA dinámicamente
    const iaService = require('../services/iaService');
    const hordeService = require('../services/hordeService');

    // Crear registro inicial de recomendación en localDb
    let recomendacion = await localDbService.saveRecomendacion({
      pedido_id,
      usuario_id: req.usuario.id,
      datos_entrada: {
        medidas,
        material,
        color,
        estilo,
        tipo_mueble,
        presupuesto_estimado,
        descripcion_adicional,
        preferencias_especiales
      },
      estado: 'procesando'
    });

    const recomendacionId = recomendacion.id;

    // Solicitar recomendación al servicio de IA
    const tipoMuebleNormalizado = tipo_mueble
      ? ((tipo_mueble || '').toLowerCase().includes('cocin') ? 'Mueble de cocina' : 'Closet')
      : undefined;

    const recomendacionIA = await iaService.generarRecomendacion({
      medidas,
      material,
      color,
      estilo,
      tipo_mueble: tipoMuebleNormalizado,
      presupuesto_estimado,
      descripcion_adicional,
      preferencias_especiales
    });

    // Iniciar generación de imagen con Stable Horde
    let hordeRequestId = null;
    let hordePrompt = null;
    try {
      console.log('Iniciando generación de imagen Stable Horde...');
      const hordeResponse = await hordeService.generateImageAsync({
        tipo_mueble: tipoMuebleNormalizado || tipo_mueble || 'Mueble',
        estilo,
        material,
        color,
        descripcion_adicional,
        medidas,
        especificaciones
      });
      console.log('Respuesta de Stable Horde:', JSON.stringify(hordeResponse));

      if (hordeResponse.success) {
        hordeRequestId = hordeResponse.id;
        hordePrompt = hordeResponse.prompt;
        logger.info('Generación de imagen iniciada en Stable Horde', { id: hordeRequestId });
      } else {
        console.error('Stable Horde retornó success=false:', hordeResponse);
      }
    } catch (hordeError) {
      console.error('Excepción al llamar a Stable Horde:', hordeError);
      logger.error('No se pudo iniciar la generación de imagen', { error: hordeError.message });
    }

    // Actualizar la recomendación con los resultados
    recomendacion = await localDbService.updateRecomendacion(recomendacionId, {
      texto_recomendacion: recomendacionIA.texto,
      imagen_generada_url: recomendacionIA.imagen_url,
      horde_request_id: hordeRequestId,
      prompt_used: hordePrompt,
      estado: 'completada',
      fecha_completada: new Date().toISOString(),
      modelo_3d: recomendacionIA.modelo_3d,
      productos_sugeridos: recomendacionIA.productos_sugeridos,
      estimacion_precio: recomendacionIA.estimacion_precio,
      tiempo_estimado: recomendacionIA.tiempo_estimado
    });

    logger.info('Recomendación de IA generada exitosamente', {
      recomendacionId,
      usuarioId: req.usuario.id,
      pedidoId: pedido_id,
      parametros: { material, color, estilo }
    });

    res.status(201).json({
      message: 'Recomendación generada exitosamente',
      horde_request_id: hordeRequestId,
      recomendacion: {
        id: recomendacion.id,
        texto_recomendacion: recomendacionIA.texto,
        imagen_generada_url: recomendacionIA.imagen_url,
        horde_request_id: hordeRequestId,
        prompt_used: hordePrompt,
        modelo_3d: recomendacionIA.modelo_3d,
        productos_sugeridos: recomendacionIA.productos_sugeridos,
        estimacion_precio: recomendacionIA.estimacion_precio,
        tiempo_estimado: recomendacionIA.tiempo_estimado,
        fecha_generacion: recomendacion.created_at
      }
    });

  } catch (iaError) {
    // Si hay error en el servicio de IA, actualizar el estado
    // Necesitamos el ID si se llegó a crear
    // Como saveRecomendacion es el primer paso, asumimos que no tenemos ID si falla antes
    // Pero si falla en generarRecomendacion, tenemos recomendacionId en el scope superior si lo definimos fuera
    // Por simplicidad, solo logueamos el error aquí
    
    logger.error('Error al generar recomendación de IA', {
      error: iaError.message,
      usuarioId: req.usuario.id,
      parametros: { material, color, estilo }
    });

    throw new Error('Error al generar la recomendación. Por favor, inténtalo de nuevo más tarde.');
  }
}));

// ---------------------------------------------------------------------------
// COMPATIBILIDAD CON FRONTEND ACTUAL
// ---------------------------------------------------------------------------
// POST /recomendaciones/generar - Wrapper que mapea el formulario del frontend
router.post('/generar', verificarToken, asyncHandler(async (req, res) => {
  // Mapea el payload del frontend a nuestro esquema interno
  const {
    tipoEspacio,
    dimensiones = {},
    estilo,
    presupuesto,
    colores = [],
    materiales = [],
    descripcion,
    especificaciones = {},
    presupuesto_maximo = null
  } = req.body || {};

  // Validación: solo permitir cocina o closet
  const espaciosPermitidos = ['cocina', 'closet'];
  if (!espaciosPermitidos.includes((tipoEspacio || '').toLowerCase())) {
    throw new ValidationError('Solo se permiten recomendaciones para cocina o closet');
  }

  const medidas = {
    largo: Number(dimensiones.largo || 2.0) * 100, // a cm
    ancho: Number(dimensiones.ancho || 0.6) * 100,
    alto: Number(dimensiones.altura || 2.4) * 100,
    unidad: 'cm'
  };

  const material = materiales[0] || 'Madera';
  const color = colores[0] || 'Blanco';
  const estiloNormalizado = (estilo || 'Moderno').charAt(0).toUpperCase() + (estilo || 'Moderno').slice(1);
  const tipo_mueble = (tipoEspacio === 'cocina') ? 'Mueble de cocina' : 'Closet';
  const presupuesto_estimado = (
    presupuesto === 'bajo' ? 50000 :
    presupuesto === 'medio' ? 120000 :
    presupuesto === 'alto' ? 220000 :
    presupuesto === 'premium' ? 350000 : 120000
  );

  const iaService = require('../services/iaService');
  const hordeService = require('../services/hordeService');
  
  const reco = await iaService.generarRecomendacion({
    medidas,
    material,
    color,
    estilo: estiloNormalizado,
    tipo_mueble,
    presupuesto_estimado,
    descripcion_adicional: descripcion,
    preferencias_especiales: [],
    especificaciones,
    presupuesto_maximo
  });

  // Iniciar generación de imagen con Stable Horde
  let hordeRequestId = null;
  let hordePrompt = null;
  try {
    const hordeResponse = await hordeService.generateImageAsync({
      tipo_mueble,
      estilo: estiloNormalizado,
      material,
      color,
      descripcion_adicional: descripcion,
      medidas
    });

    if (hordeResponse.success) {
      hordeRequestId = hordeResponse.id;
      hordePrompt = hordeResponse.prompt;
      logger.info('Generación de imagen iniciada en Stable Horde', { id: hordeRequestId });
    }
  } catch (hordeError) {
    logger.error('No se pudo iniciar la generación de imagen', { error: hordeError.message });
  }

  // Persistir registro en BD local
  let id = null;
  let fechaGeneracion = new Date();
  
  try {
    const nuevaRecomendacion = await localDbService.saveRecomendacion({
      usuario_id: req.usuario.id,
      datos_entrada: { tipoEspacio, dimensiones, estilo, presupuesto, colores, materiales, descripcion },
      texto_recomendacion: reco.texto,
      imagen_generada_url: reco.imagen_url,
      horde_request_id: hordeRequestId,
      prompt_used: hordePrompt,
      estado: 'completada',
      modelo_3d: reco.modelo_3d,
      productos_sugeridos: reco.productos_sugeridos,
      estimacion_precio: reco.estimacion_precio,
      tiempo_estimado: reco.tiempo_estimado
    });
    
    id = nuevaRecomendacion.id;
    fechaGeneracion = nuevaRecomendacion.created_at;
  } catch (error) {
    logger.error('Error guardando recomendación en BD local', { error: error.message });
  }

  // Respuesta adaptada al frontend (alineada con nombres esperados)
  res.status(201).json({
    id,
    titulo: `${tipo_mueble} • ${estiloNormalizado}`,
    descripcion: reco.texto,
    imagen_generada_url: reco.imagen_url,
    productos_sugeridos: (reco.productos_sugeridos || []).map(p => ({
      id: p.id,
      nombre: p.nombre,
      categoria: 'Sugerido',
      precio_base: p.precio_base,
      imagen_url: '/placeholder-furniture.jpg'
    })),
    estimacion_precio: reco.estimacion_precio || null,
    tiempo_estimado: reco.tiempo_estimado || null,
    modelo_3d: reco.modelo_3d,
    especificaciones: reco.especificaciones || especificaciones,
    presupuesto_maximo: presupuesto_maximo,
    horde_request_id: hordeRequestId, // ID para polling de imagen
    prompt_used: hordePrompt,
    created_at: fechaGeneracion
  });
}));

// GET /recomendaciones/estado-imagen/:id - Verificar estado de generación de imagen
router.get('/estado-imagen/:id', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hordeService = require('../services/hordeService');
  
  try {
    const status = await hordeService.checkStatus(id);
    
    // Si terminó, devolver la URL de la imagen
    let imageUrl = null;
    if (status.done && status.generations && status.generations.length > 0) {
      const imgData = status.generations[0].img;
      // Si parece una URL, usarla tal cual. Si no, asumir Base64 y agregar prefijo webp (formato común de Horde)
      if (imgData.startsWith('http')) {
        imageUrl = imgData;
      } else {
        imageUrl = `data:image/webp;base64,${imgData}`;
      }
    }
    
    res.json({
      done: status.done,
      wait_time: status.wait_time,
      queue_position: status.queue_position,
      processing: status.processing,
      image_url: imageUrl
    });
    
    // Si la imagen se generó, podríamos actualizar la BD local si tuviéramos el ID de la recomendación
    // Pero este endpoint solo recibe el ID de Horde.
  } catch (error) {
    throw new Error('Error al verificar estado de imagen: ' + error.message);
  }
}));

// POST /recomendaciones/guardar - Marca recomendación como guardada
router.post('/guardar', verificarToken, asyncHandler(async (req, res) => {
  const { recomendacion_id } = req.body;
  if (!recomendacion_id) {
    throw new ValidationError('recomendacion_id es requerido');
  }

  // Verificar propiedad
  const reco = await localDbService.getRecomendacionById(recomendacion_id);
  
  if (!reco) {
    throw new NotFoundError('Recomendación no encontrada');
  }
  
  if (reco.usuario_id !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new ValidationError('No tienes permisos para guardar esta recomendación');
  }

  // Actualizar estado o fecha para reflejar guardado
  await localDbService.updateRecomendacion(recomendacion_id, {
    guardada: true,
    updated_at: new Date().toISOString()
  });

  res.json({ message: 'Recomendación guardada exitosamente' });
}));

// GET /recomendaciones - Historial del usuario actual
router.get('/', verificarToken, asyncHandler(async (req, res) => {
  const recomendaciones = await localDbService.getRecomendacionesByUser(req.usuario.id);

  const data = recomendaciones.map(r => ({
    id: r.id,
    titulo: 'Recomendación IA',
    descripcion: r.texto_recomendacion,
    imagen_url: r.imagen_generada_url,
    created_at: r.created_at
  }));

  res.json(data);
}));

// GET /recomendaciones/usuario/:usuarioId - Obtener recomendaciones de un usuario
router.get('/usuario/:usuarioId', verificarToken, verificarPropietarioOAdmin('usuarioId'), asyncHandler(async (req, res) => {
  const { usuarioId } = req.params;
  const { page = 1, limit = 10, estado = '' } = req.query;

  // Obtener todas y filtrar en memoria (localDB no soporta SQL)
  let recomendaciones = await localDbService.getRecomendacionesByUser(parseInt(usuarioId));
  
  if (estado) {
    recomendaciones = recomendaciones.filter(r => r.estado === estado);
  }
  
  const total = recomendaciones.length;
  
  // Paginación manual
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedResults = recomendaciones.slice(startIndex, endIndex);

  res.json({
    message: 'Recomendaciones obtenidas exitosamente',
    recomendaciones: paginatedResults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// GET /recomendaciones/:id - Obtener recomendación específica
router.get('/:id', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const recomendacion = await localDbService.getRecomendacionById(id);

  if (!recomendacion) {
    throw new NotFoundError('Recomendación no encontrada');
  }

  // Verificar permisos: solo el propietario o admin pueden ver la recomendación
  if (req.usuario.rol !== 'administrador' && recomendacion.usuario_id !== req.usuario.id) {
    throw new ValidationError('No tienes permisos para ver esta recomendación');
  }

  res.json({
    message: 'Recomendación obtenida exitosamente',
    recomendacion
  });
}));

// PUT /recomendaciones/:id - Actualizar recomendación (para calificaciones de usuario)
router.put('/:id', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = actualizarRecomendacionSchema.validate(req.body);
  
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  // Verificar que la recomendación existe y permisos
  const recomendacion = await localDbService.getRecomendacionById(id);

  if (!recomendacion) {
    throw new NotFoundError('Recomendación no encontrada');
  }

  // Los usuarios solo pueden actualizar sus propias recomendaciones (calificaciones)
  // Los administradores pueden actualizar cualquier campo
  if (req.usuario.rol !== 'administrador' && recomendacion.usuario_id !== req.usuario.id) {
    throw new ValidationError('No tienes permisos para actualizar esta recomendación');
  }

  // Si es usuario normal, solo permitir actualizar calificación y comentario
  if (req.usuario.rol !== 'administrador') {
    const camposPermitidos = ['puntuacion_usuario', 'comentario_usuario'];
    const camposProporcionados = Object.keys(value);
    const camposNoPermitidos = camposProporcionados.filter(campo => !camposPermitidos.includes(campo));
    
    if (camposNoPermitidos.length > 0) {
      throw new ValidationError(`No tienes permisos para actualizar los campos: ${camposNoPermitidos.join(', ')}`);
    }
  }

  const updatedRecomendacion = await localDbService.updateRecomendacion(id, value);

  logger.info('Recomendación actualizada', {
    recomendacionId: id,
    camposActualizados: Object.keys(value),
    usuarioId: req.usuario.id,
    esAdmin: req.usuario.rol === 'administrador'
  });

  res.json({
    message: 'Recomendación actualizada exitosamente',
    recomendacion: updatedRecomendacion
  });
}));

// GET /recomendaciones/pedido/:pedidoId - MOCK
router.get('/pedido/:pedidoId', verificarToken, asyncHandler(async (req, res) => {
    // Implementación mock para evitar errores de SQL
    res.json({
        message: 'Recomendaciones del pedido obtenidas exitosamente (Local Mode)',
        recomendaciones: []
    });
}));

// GET /recomendaciones/admin/todas - MOCK
router.get('/admin/todas', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
    res.json({
        message: 'Todas las recomendaciones (Local Mode - Feature limitado)',
        recomendaciones: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
    });
}));

// GET /recomendaciones/estadisticas/resumen - MOCK
router.get('/estadisticas/resumen', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  res.json({
    message: 'Estadísticas no disponibles en modo local',
    estadisticas: {
      resumen_general: {},
      por_material: [],
      por_estilo: [],
      tendencias_mensuales: []
    }
  });
}));

// Exportar el router para su uso en la aplicación principal
module.exports = router;
