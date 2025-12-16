// Importaciones necesarias para el módulo de gestión del catálogo de productos
const express = require('express');
const Joi = require('joi'); // Para validación de datos de entrada
const { query } = require('../config/database'); // Función para consultas de base de datos
const { verificarToken, verificarAdmin, tokenOpcional } = require('../middleware/auth'); // Middleware de autenticación y autorización
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler'); // Manejo de errores
const { createLogger } = require('../middleware/logger'); // Sistema de logging
const xanoService = require('../services/xanoService'); // Servicio de Xano

// Inicialización del router de Express y logger específico para catálogo
const router = express.Router();
const logger = createLogger('catalogo');

// Esquemas de validación con Joi para diferentes operaciones

// Esquema para validar la creación de un nuevo producto en el catálogo
const crearProductoSchema = Joi.object({
  nombre: Joi.string().min(2).max(150).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 150 caracteres',
    'any.required': 'El nombre es obligatorio'
  }),
  tipo: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El tipo debe tener al menos 2 caracteres',
    'string.max': 'El tipo no puede exceder 50 caracteres',
    'any.required': 'El tipo es obligatorio'
  }),
  imagen_url: Joi.string().uri().max(500).optional(),
  precio_base: Joi.number().precision(2).min(0).required().messages({
    'number.min': 'El precio base debe ser mayor o igual a 0',
    'any.required': 'El precio base es obligatorio'
  }),
  estilo: Joi.string().max(50).optional(),
  dimensiones: Joi.string().max(200).optional(),
  descripcion: Joi.string().max(1000).optional(),
  materiales_disponibles: Joi.array().items(Joi.string().max(50)).optional(),
  colores_disponibles: Joi.array().items(Joi.string().max(30)).optional(),
  activo: Joi.boolean().default(true)
});

// Esquema para validar la actualización de un producto existente
const actualizarProductoSchema = Joi.object({
  nombre: Joi.string().min(2).max(150).optional(),
  tipo: Joi.string().min(2).max(50).optional(),
  imagen_url: Joi.string().uri().max(500).optional().allow(''),
  precio_base: Joi.number().precision(2).min(0).optional(),
  estilo: Joi.string().max(50).optional().allow(''),
  dimensiones: Joi.string().max(200).optional().allow(''),
  descripcion: Joi.string().max(1000).optional().allow(''),
  materiales_disponibles: Joi.array().items(Joi.string().max(50)).optional(),
  colores_disponibles: Joi.array().items(Joi.string().max(30)).optional(),
  activo: Joi.boolean().optional()
});

/**
 * GET /catalogo - Listar productos del catálogo (público con token opcional)
 * Permite ver productos del catálogo con filtros avanzados y paginación
 * Los usuarios no autenticados solo ven productos activos
 */
router.get('/', tokenOpcional, asyncHandler(async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search = '', 
      tipo = '', 
      estilo = '',
      precio_min = '',
      precio_max = '',
      materiales = '',
      colores = '',
      activo = 'true' // Por defecto solo mostrar productos activos
    } = req.query;

    // Preparar parámetros para Xano
    const params = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    // Agregar filtros si están presentes
    if (search) params.search = search;
    if (tipo) params.tipo = tipo;
    if (estilo) params.estilo = estilo;
    if (precio_min) params.precio_min = parseFloat(precio_min);
    if (precio_max) params.precio_max = parseFloat(precio_max);
    if (materiales) params.materiales = materiales;
    if (colores) params.colores = colores;
    
    // Control de visibilidad: solo los administradores pueden ver productos inactivos
    if (req.usuario?.rol !== 'administrador') {
      params.activo = true;
    } else if (activo !== '') {
      params.activo = activo === 'true';
    }

    // Obtener token del usuario si está autenticado
    const token = req.usuario?.token || null;

    // Llamar al servicio de Xano
    const resultado = await xanoService.getCatalog(params, token);

    logger.info('Catálogo obtenido desde Xano', { 
      page: params.page, 
      limit: params.limit,
      total: resultado.total || 0
    });

    res.json({
      message: 'Catálogo obtenido exitosamente',
      productos: resultado.data || resultado.productos || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: resultado.total || 0,
        pages: Math.ceil((resultado.total || 0) / parseInt(limit))
      },
      filtros_aplicados: {
        search, tipo, estilo, precio_min, precio_max, materiales, colores
      }
    });

  } catch (error) {
    logger.error('Error al obtener catálogo desde Xano', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Si hay error con Xano, devolver respuesta vacía pero válida
    res.status(200).json({
      message: 'Catálogo obtenido (modo offline)',
      productos: [],
      pagination: {
        page: parseInt(req.query.page || 1),
        limit: parseInt(req.query.limit || 12),
        total: 0,
        pages: 0
      },
      filtros_aplicados: {
        search: req.query.search || '', 
        tipo: req.query.tipo || '', 
        estilo: req.query.estilo || '', 
        precio_min: req.query.precio_min || '', 
        precio_max: req.query.precio_max || '', 
        materiales: req.query.materiales || '', 
        colores: req.query.colores || ''
      },
      error: 'Servicio temporalmente no disponible'
    });
  }
}));

/**
 * GET /catalogo/:id - Obtener producto específico del catálogo
 * Permite ver detalles completos de un producto específico
 * Los usuarios no autenticados solo pueden ver productos activos
 */
router.get('/:id', tokenOpcional, asyncHandler(async (req, res) => {
  const { id } = req.params;

  let whereClause = 'WHERE id = $1';
  const valores = [id];

  // Control de visibilidad: solo los administradores pueden ver productos inactivos
  if (req.usuario?.rol !== 'administrador') {
    whereClause += ' AND activo = true';
  }

  const resultado = await query(`
    SELECT * FROM catalogo ${whereClause}
  `, valores);

  if (resultado.rows.length === 0) {
    throw new NotFoundError('Producto no encontrado en el catálogo');
  }

  res.json({
    message: 'Producto obtenido exitosamente',
    producto: resultado.rows[0]
  });
}));

/**
 * POST /catalogo - Crear nuevo producto en el catálogo (solo administradores)
 * Permite a los administradores agregar nuevos productos al catálogo
 */
router.post('/', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  // Validar datos de entrada usando el esquema de Joi
  const { error, value } = crearProductoSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const {
    nombre, tipo, imagen_url, precio_base, estilo, dimensiones,
    descripcion, materiales_disponibles, colores_disponibles, activo
  } = value;

  // Insertar el nuevo producto en la base de datos
  const resultado = await query(`
    INSERT INTO catalogo (
      nombre, tipo, imagen_url, precio_base, estilo, dimensiones,
      descripcion, materiales_disponibles, colores_disponibles, activo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    nombre, tipo, imagen_url, precio_base, estilo, dimensiones,
    descripcion, materiales_disponibles, colores_disponibles, activo
  ]);

  const nuevoProducto = resultado.rows[0];

  // Registrar la creación del producto en los logs
  logger.info('Nuevo producto creado en catálogo', {
    productoId: nuevoProducto.id,
    nombre: nuevoProducto.nombre,
    tipo: nuevoProducto.tipo,
    adminId: req.usuario.id
  });

  res.status(201).json({
    message: 'Producto creado exitosamente en el catálogo',
    producto: nuevoProducto
  });
}));

/**
 * PUT /catalogo/:id - Actualizar producto del catálogo (solo administradores)
 * Permite a los administradores modificar productos existentes en el catálogo
 */
router.put('/:id', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = actualizarProductoSchema.validate(req.body);
  
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  // Verificar que el producto existe antes de intentar actualizarlo
  const productoExistente = await query('SELECT id FROM catalogo WHERE id = $1', [id]);
  if (productoExistente.rows.length === 0) {
    throw new NotFoundError('Producto no encontrado en el catálogo');
  }

  // Construir query dinámicamente para actualizar solo los campos proporcionados
  const campos = [];
  const valores = [];
  let contador = 1;

  Object.entries(value).forEach(([campo, valor]) => {
    if (valor !== undefined) {
      campos.push(`${campo} = $${contador}`);
      valores.push(valor);
      contador++;
    }
  });

  if (campos.length === 0) {
    throw new ValidationError('No se proporcionaron campos para actualizar');
  }

  valores.push(id);

  // Ejecutar la actualización en la base de datos
  const resultado = await query(`
    UPDATE catalogo 
    SET ${campos.join(', ')}
    WHERE id = $${contador}
    RETURNING *
  `, valores);

  const productoActualizado = resultado.rows[0];

  // Registrar la actualización del producto en los logs
  logger.info('Producto actualizado en catálogo', {
    productoId: id,
    camposActualizados: Object.keys(value),
    adminId: req.usuario.id
  });

  res.json({
    message: 'Producto actualizado exitosamente',
    producto: productoActualizado
  });
}));

/**
 * DELETE /catalogo/:id - Eliminar producto del catálogo (solo administradores)
 * En lugar de eliminar físicamente, desactiva el producto para mantener integridad referencial
 */
router.delete('/:id', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar que el producto existe antes de intentar desactivarlo
  const productoExistente = await query('SELECT id, nombre FROM catalogo WHERE id = $1', [id]);
  if (productoExistente.rows.length === 0) {
    throw new NotFoundError('Producto no encontrado en el catálogo');
  }

  // Desactivar el producto en lugar de eliminarlo físicamente
  // Esto mantiene la integridad referencial con pedidos existentes
  await query('UPDATE catalogo SET activo = false WHERE id = $1', [id]);

  // Registrar la desactivación del producto en los logs
  logger.info('Producto desactivado en catálogo', {
    productoId: id,
    nombre: productoExistente.rows[0].nombre,
    adminId: req.usuario.id
  });

  res.json({
    message: 'Producto desactivado exitosamente del catálogo'
  });
}));

/**
 * POST /catalogo/:id/activar - Reactivar producto del catálogo (solo administradores)
 * Permite reactivar productos que fueron previamente desactivados
 */
router.post('/:id/activar', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar que el producto existe y obtener su estado actual
  const productoExistente = await query('SELECT id, nombre, activo FROM catalogo WHERE id = $1', [id]);
  if (productoExistente.rows.length === 0) {
    throw new NotFoundError('Producto no encontrado en el catálogo');
  }

  // Verificar que el producto no esté ya activo
  if (productoExistente.rows[0].activo) {
    throw new ValidationError('El producto ya está activo');
  }

  // Reactivar el producto
  await query('UPDATE catalogo SET activo = true WHERE id = $1', [id]);

  // Registrar la reactivación del producto en los logs
  logger.info('Producto reactivado en catálogo', {
    productoId: id,
    nombre: productoExistente.rows[0].nombre,
    adminId: req.usuario.id
  });

  res.json({
    message: 'Producto reactivado exitosamente en el catálogo'
  });
}));

/**
 * GET /catalogo/filtros/opciones - Obtener opciones disponibles para filtros
 * Proporciona todas las opciones únicas disponibles para filtrar el catálogo
 * Endpoint público para construir interfaces de filtrado dinámicas
 */
router.get('/filtros/opciones', asyncHandler(async (req, res) => {
  try {
    // Obtener datos del catálogo desde Xano para extraer filtros únicos
    const resultado = await xanoService.getCatalog({});
    
    // Extraer productos de la respuesta
    const productos = resultado.data || resultado.productos || [];
    
    // Extraer valores únicos para filtros
    const tipos = [...new Set(productos.map(p => p.tipo).filter(Boolean))].sort();
    const estilos = [...new Set(productos.map(p => p.estilo).filter(Boolean))].sort();
    const materiales = [...new Set(productos.flatMap(p => p.materiales_disponibles || []).filter(Boolean))].sort();
    const colores = [...new Set(productos.flatMap(p => p.colores_disponibles || []).filter(Boolean))].sort();
    
    // Calcular rango de precios
    const precios = productos.map(p => p.precio_base).filter(p => p != null);
    const rango_precios = precios.length > 0 ? {
      precio_min: Math.min(...precios),
      precio_max: Math.max(...precios)
    } : { precio_min: 0, precio_max: 0 };

    res.json({
      message: 'Opciones de filtros obtenidas exitosamente',
      filtros: {
        tipos,
        estilos,
        rango_precios,
        materiales,
        colores
      }
    });
  } catch (error) {
    logger.error('Error obteniendo filtros desde Xano:', error);
    
    // Respuesta de fallback con filtros vacíos
    res.json({
      message: 'Opciones de filtros obtenidas (modo fallback)',
      filtros: {
        tipos: [],
        estilos: [],
        rango_precios: { precio_min: 0, precio_max: 0 },
        materiales: [],
        colores: []
      }
    });
  }
}));

/**
 * GET /catalogo/estadisticas/resumen - Obtener estadísticas del catálogo (solo administradores)
 * Proporciona un resumen estadístico completo del catálogo para análisis de negocio
 */
router.get('/estadisticas/resumen', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  // Obtener estadísticas generales del catálogo
  const estadisticas = await query(`
    SELECT 
      COUNT(*) as total_productos,
      COUNT(*) FILTER (WHERE activo = true) as productos_activos,
      COUNT(*) FILTER (WHERE activo = false) as productos_inactivos,
      AVG(precio_base) as precio_promedio,
      MIN(precio_base) as precio_minimo,
      MAX(precio_base) as precio_maximo
    FROM catalogo
  `);

  // Obtener estadísticas agrupadas por tipo de producto
  const porTipo = await query(`
    SELECT 
      tipo,
      COUNT(*) as cantidad,
      AVG(precio_base) as precio_promedio
    FROM catalogo 
    WHERE activo = true
    GROUP BY tipo
    ORDER BY cantidad DESC
  `);

  // Obtener estadísticas agrupadas por estilo de producto
  const porEstilo = await query(`
    SELECT 
      estilo,
      COUNT(*) as cantidad
    FROM catalogo 
    WHERE activo = true AND estilo IS NOT NULL
    GROUP BY estilo
    ORDER BY cantidad DESC
  `);

  res.json({
    message: 'Estadísticas del catálogo obtenidas exitosamente',
    estadisticas: {
      resumen_general: estadisticas.rows[0],
      por_tipo: porTipo.rows,
      por_estilo: porEstilo.rows
    }
  });
}));

// Exportar el router para uso en el servidor principal
module.exports = router;

