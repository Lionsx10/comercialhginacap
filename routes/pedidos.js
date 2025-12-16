const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const { query, transaction } = require('../config/database');
const { verificarToken, verificarAdmin, verificarPropietarioPedido, tokenOpcional } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { createLogger } = require('../middleware/logger');
const xanoService = require('../services/xanoService');
const emailService = require('../services/emailService');

// Inicialización del router de Express y logger específico para pedidos
const router = express.Router();
const logger = createLogger('pedidos');
const pedidosMem = new Map();
const pedidosCancelOverride = new Map();
const cotizacionesEstado = new Map();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Configuración de estados y transiciones de pedidos

// Estados válidos que puede tener un pedido en el sistema
const ESTADOS_VALIDOS = ['nuevo', 'en_cotizacion', 'aprobado', 'en_produccion', 'entregado', 'cancelado'];

// Transiciones de estado permitidas - define qué cambios de estado son válidos
// Esto asegura que los pedidos sigan un flujo lógico de trabajo
const TRANSICIONES_PERMITIDAS = {
  'nuevo': ['en_cotizacion', 'cancelado'],
  'en_cotizacion': ['aprobado', 'cancelado'],
  'aprobado': ['en_produccion', 'cancelado'],
  'en_produccion': ['entregado'],
  'entregado': [], // Estado final - no se puede cambiar
  'cancelado': [] // Estado final - no se puede cambiar
};

// Esquemas de validación con Joi para diferentes operaciones

// Esquema para validar la creación de un nuevo pedido
const crearPedidoSchema = Joi.object({
  detalles: Joi.array().min(1).items(
    Joi.object({
      descripcion: Joi.string().min(1).max(1000).required().messages({
        'string.min': 'La descripción debe tener al menos 1 caracter',
        'string.max': 'La descripción no puede exceder 1000 caracteres',
        'any.required': 'La descripción es obligatoria'
      }),
      medidas: Joi.string().max(200).optional(),
      material: Joi.string().max(100).optional(),
      color: Joi.string().max(50).optional(),
      cantidad: Joi.number().integer().min(1).default(1),
      observaciones: Joi.string().max(500).optional(),
      precio_unitario: Joi.number().precision(2).min(0).optional(),
      precio_base: Joi.number().precision(2).min(0).optional()
    }).unknown(true)
  ).required(),
  notas_cliente: Joi.string().max(1000).optional(),
  direccion_entrega: Joi.string().max(500).optional()
});

// Esquema para validar actualización de estado de pedido
const actualizarEstadoSchema = Joi.object({
  estado: Joi.string().valid(...ESTADOS_VALIDOS).required(),
  notas_admin: Joi.string().max(1000).optional(),
  fecha_entrega: Joi.date().optional()
});

// Esquema para validar actualización de cotización
const actualizarCotizacionSchema = Joi.object({
  detalles: Joi.array().min(1).items(
    Joi.object({
      id: Joi.number().integer().required(),
      cotizacion: Joi.number().precision(2).min(0).required()
    })
  ).required(),
  total_estimado: Joi.number().precision(2).min(0).required()
});

/**
 * POST /pedidos - Crear nuevo pedido
 * Permite a los usuarios autenticados crear un nuevo pedido con múltiples detalles
 */
router.post('/', verificarToken, asyncHandler(async (req, res) => {
  // Validar datos de entrada usando el esquema de Joi
  const { error, value } = crearPedidoSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { detalles, notas_cliente, direccion_entrega } = value;

  // Usar transacción para asegurar consistencia de datos
  const resultado = await transaction(async (client) => {
    // Crear el pedido principal con estado inicial 'nuevo'
    const pedidoResult = await client.query(`
      INSERT INTO pedidos (usuario_id, estado, notas_cliente, direccion_entrega)
      VALUES ($1, 'nuevo', $2, $3)
      RETURNING id, estado, fecha_creacion
    `, [req.usuario.id, notas_cliente, direccion_entrega]);

    const pedido = pedidoResult.rows[0];

    // Insertar cada detalle del pedido en la tabla de detalles
    const detallesInsertados = [];
    for (const detalle of detalles) {
      const detalleResult = await client.query(`
        INSERT INTO detalles_pedido 
        (pedido_id, descripcion, medidas, material, color, cantidad, observaciones)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        pedido.id,
        detalle.descripcion,
        detalle.medidas,
        detalle.material,
        detalle.color,
        detalle.cantidad || 1,
        detalle.observaciones
      ]);
      detallesInsertados.push(detalleResult.rows[0]);
    }

    return { pedido, detalles: detallesInsertados };
  });

  // Crear notificación automática para informar al usuario sobre el nuevo pedido
  await query(`
    INSERT INTO notificaciones (usuario_id, mensaje, tipo, asunto, datos_adicionales)
    VALUES ($1, $2, 'sistema', $3, $4)
  `, [
    req.usuario.id,
    'Tu pedido ha sido creado exitosamente y está siendo revisado por nuestro equipo.',
    'Nuevo pedido creado',
    JSON.stringify({ pedido_id: resultado.pedido.id })
  ]);

  // Registrar la creación del pedido en los logs
  logger.info('Nuevo pedido creado', {
    pedidoId: resultado.pedido.id,
    usuarioId: req.usuario.id,
    cantidadDetalles: resultado.detalles.length
  });

  const detallesPayload = Array.isArray(req.body?.detalles) ? req.body.detalles : [];
  const memItem = {
    id: resultado.pedido.id,
    usuario_id: req.usuario.id,
    estado: 'nuevo',
    created_at: resultado.pedido.fecha_creacion,
    detalles: detallesPayload,
    total_estimado: detallesPayload.reduce((acc, d) => acc + (d.cantidad || 1) * (d.precio_unitario ?? d.precio_base ?? 0), 0)
  };
  const currentList = pedidosMem.get(req.usuario.id) || [];
  pedidosMem.set(req.usuario.id, [memItem, ...currentList]);

  res.status(201).json({
    message: 'Pedido creado exitosamente',
    pedido: {
      id: resultado.pedido.id,
      estado: resultado.pedido.estado,
      fechaCreacion: resultado.pedido.fecha_creacion,
      detalles: resultado.detalles
    }
  });
}));

router.post('/xano', verificarToken, asyncHandler(async (req, res) => {
  const tokenHeader = req.headers.authorization || '';
  const userToken = tokenHeader.split(' ')[1] || null;
  const payload = { ...req.body };
  try {
    // Preferir crear el pedido con el token del usuario; Xano asigna usuario automáticamente
    if (userToken) {
      try {
        const response = await xanoService.createOrderWithDetails({ ...payload, estado: 'en_cotizacion' }, userToken);
        return res.status(201).json({ message: 'Pedido creado exitosamente', pedido: response });
      } catch (_) { /* fallback a admin */ }
    }
    // Fallback con token admin: mapear usuario por correo y asignar relación explícita
    const adminToken = await xanoService.ensureAdminToken();
    let xanoUserId = null;
    try { xanoUserId = await xanoService.findUserIdByEmail(req.usuario.correo, adminToken); } catch (_) {}
    if (!xanoUserId && req.usuario?.correo) {
      try {
        const creado = await xanoService.createUser({ nombre: req.usuario.nombre, email: req.usuario.correo }, adminToken);
        xanoUserId = creado.id;
      } catch (_) {}
    }
    const response = await xanoService.createOrderWithDetails({ ...payload, usuario_id: xanoUserId ?? undefined, user_id: xanoUserId ?? undefined, estado: 'en_cotizacion' }, adminToken);
    res.status(201).json({ message: 'Pedido creado exitosamente', pedido: response });
  } catch (e) {
    const info = { status: e.response?.status, url: e.config?.url, message: e.response?.data?.message || e.message };
    logger.error('Fallo al crear pedido en Xano', info);
    const value = payload || {};
    const detallesPayload = Array.isArray(value.detalles) && value.detalles.length > 0
      ? value.detalles
      : [{ descripcion: 'Producto', cantidad: 1 }];
    const nuevo = {
      id: `mem-${Date.now()}`,
      usuario_id: req.usuario?.id ?? 0,
      estado: 'nuevo',
      created_at: new Date().toISOString(),
      detalles: detallesPayload,
      total_estimado: Array.isArray(detallesPayload)
        ? detallesPayload.reduce((acc, d) => acc + (d.cantidad || 1) * (d.precio_unitario ?? d.precio_base ?? 0), 0)
        : 0,
    };
    const userKey = parseInt(req.usuario?.id ?? 0);
    const lista = pedidosMem.get(userKey) || [];
    pedidosMem.set(userKey, [nuevo, ...lista]);
    res.status(201).json({ message: 'Pedido creado localmente', pedido: nuevo });
  }
}));

router.post('/cotizaciones/xano', tokenOpcional, asyncHandler(async (req, res) => {
  const tokenHeader = req.headers.authorization || '';
  const userToken = tokenHeader.split(' ')[1] || null;
  const payload = { ...req.body };
  try {
    if (userToken) {
      try {
        const created = await xanoService.createCotizacion({
          ...payload,
          usuario_id: req.usuario?.id ?? undefined,
          user_id: req.usuario?.id ?? undefined
        }, userToken);
        return res.status(201).json({ message: 'Cotización creada exitosamente', cotizacion: created });
      } catch (_) {}
    }
    // Intentar crear en Xano sin token cuando el endpoint es público
    try {
      const createdPublic = await xanoService.createCotizacion(payload, null);
      return res.status(201).json({ message: 'Cotización creada exitosamente', cotizacion: createdPublic });
    } catch (_) {}
    const adminToken = await xanoService.ensureAdminToken();
    let xanoUserId = null;
    try { xanoUserId = await xanoService.findUserIdByEmail(req.usuario.correo, adminToken); } catch (_) {}
    if (!xanoUserId && req.usuario?.correo) {
      try {
        const creadoUsuario = await xanoService.createUser({ nombre: req.usuario.nombre, email: req.usuario.correo }, adminToken);
        xanoUserId = creadoUsuario.id;
      } catch (_) {}
    }
    const created = await xanoService.createCotizacion({ ...payload, usuario_id: xanoUserId ?? undefined, user_id: xanoUserId ?? undefined }, adminToken);
    res.status(201).json({ message: 'Cotización creada exitosamente', cotizacion: created });
  } catch (e) {
    const value = payload || {};
    const nuevo = {
      id: `mem-${Date.now()}`,
      created_at: new Date().toISOString(),
      cubierta: value.cubierta,
      material_mueble: value.material_mueble,
      color: value.color || '',
      medidas: value.medidas || '',
      precio_unitario: value.precio_unitario ?? 0,
    };
    res.status(201).json({ message: 'Cotización creada localmente', cotizacion: nuevo });
  }
}));

/**
 * GET /pedidos/:id - Obtener detalles completos de un pedido específico
 * Permite ver información detallada de un pedido (solo propietario o administrador)
 */
// Listado administrativo desde Xano y memoria — colocado antes de la ruta genérica '/:id'
router.get('/xano', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const estado = req.query.estado || '';
  const usuario_id = req.query.usuario_id || '';

  let pedidosXano = [];
  try {
    const adminToken = await xanoService.ensureAdminToken();
    const params = {};
    if (estado) params.estado = estado;
    if (usuario_id) params.usuario_id = usuario_id;
    const resultado = await xanoService.getOrders({ page, limit, ...params }, adminToken);
    pedidosXano = resultado.data || resultado.items || [];
  } catch (error) {
    logger.warn('Fallo al obtener pedidos desde Xano, usando memoria', { error: error.message });
  }

  const pedidosMemAll = [];
  for (const [_, lista] of pedidosMem.entries()) {
    pedidosMemAll.push(...lista);
  }
  const pedidosMemFiltrados = pedidosMemAll.filter(p => {
    if (estado && p.estado !== estado) return false;
    if (usuario_id && String(p.usuario_id) !== String(usuario_id)) return false;
    return true;
  });

  const pedidos = [...pedidosXano, ...pedidosMemFiltrados];
  const total = pedidos.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginados = pedidos.slice(start, end);

  res.json({
    message: 'Pedidos obtenidos exitosamente',
    pedidos: paginados,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

router.get('/:id', verificarToken, verificarPropietarioPedido, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Obtener información principal del pedido junto con datos del usuario
  const pedidoResult = await query(`
    SELECT 
      p.*,
      u.nombre as nombre_usuario,
      u.correo as correo_usuario
    FROM pedidos p
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.id = $1
  `, [id]);

  if (pedidoResult.rows.length === 0) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const pedido = pedidoResult.rows[0];

  // Obtener todos los detalles del pedido ordenados por ID
  const detallesResult = await query(`
    SELECT * FROM detalles_pedido WHERE pedido_id = $1 ORDER BY id
  `, [id]);

  // Obtener historial completo de cambios de estado del pedido
  const historialResult = await query(`
    SELECT 
      h.*,
      u.nombre as usuario_cambio_nombre
    FROM historial_estados h
    LEFT JOIN usuarios u ON h.usuario_cambio_id = u.id
    WHERE h.pedido_id = $1
    ORDER BY h.fecha_cambio DESC
  `, [id]);

  res.json({
    message: 'Pedido obtenido exitosamente',
    pedido: {
      ...pedido,
      detalles: detallesResult.rows,
      historial: historialResult.rows
    }
  });
}));

router.get('/xano/:id', tokenOpcional, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const uid = req.usuario?.id;
  let pedidoMem = null;
  if (uid) {
    const lista = pedidosMem.get(uid) || [];
    pedidoMem = lista.find(p => String(p.id) === String(id)) || null;
  } else {
    for (const [_, lista] of pedidosMem.entries()) {
      const p = lista.find(pp => String(pp.id) === String(id));
      if (p) { pedidoMem = p; break; }
    }
  }
  if (pedidoMem) {
    return res.json({ message: 'Pedido obtenido exitosamente', pedido: pedidoMem });
  }
  const tokenHeader = req.headers.authorization || '';
  const token = tokenHeader.split(' ')[1] || null;
  try {
    const pedidoX = await xanoService.getOrderById(id, token);
    let detallesX = [];
    try { detallesX = await xanoService.getOrderDetails(id, token); } catch (_) {}
    const totalEstimado = (Array.isArray(detallesX) ? detallesX : []).reduce((acc, d) => acc + (d.cantidad || 1) * (d.precio_unitario ?? d.precio_base ?? 0), 0);
    return res.json({ message: 'Pedido obtenido exitosamente', pedido: { ...pedidoX, detalles: detallesX, total_estimado: pedidoX.total_estimado ?? totalEstimado } });
  } catch (e) {
    throw new NotFoundError('Pedido no encontrado');
  }
}));

router.get('/cotizaciones/xano/:id', tokenOpcional, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tokenHeader = req.headers.authorization || '';
  const token = tokenHeader.split(' ')[1] || null;
  const cot = await xanoService.getCotizacionById(id, token);
  const detalle = [{ descripcion: 'Cotización', medidas: cot.medidas || '', material: cot.material_mueble || '', color: cot.color || '', cantidad: 1, precio_unitario: cot.precio_unitario ?? 0 }];
  const estadoCot = cotizacionesEstado.get(String(id)) || 'pendiente';
  res.json({ message: 'Pedido obtenido exitosamente', pedido: { id: cot.id, estado: 'en_cotizacion', created_at: cot.created_at, detalles: detalle, total_estimado: cot.precio_unitario ?? 0, tipo: 'cotizacion', estado_cotizacion: estadoCot } });
}));

// Aceptar cotización (admin): crea pedido en Xano con estado 'aprobado' y envía PDF por correo
router.post('/cotizaciones/xano/:id/aceptar', verificarToken, verificarAdmin, upload.single('pdf'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const adminToken = await xanoService.ensureAdminToken();
    const cot = await xanoService.getCotizacionById(id, adminToken);
    const usuarioId = cot.usuario_id ?? cot.user_id ?? null;
    const detalle = [{ descripcion: 'Cotización aceptada', medidas: cot.medidas || '', material: cot.material_mueble || '', color: cot.color || '', cantidad: 1, precio_unitario: cot.precio_unitario ?? 0 }];
    const creado = await xanoService.createOrderWithDetails({ usuario_id: usuarioId, user_id: usuarioId, detalles: detalle }, adminToken);
    try { await xanoService.updateOrderStatus(creado.id, { estado: 'aprobado' }, adminToken); } catch (_) {}

    cotizacionesEstado.set(String(id), 'aprobada');

    let correoAdmin = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin123@gmail.com';
    let correoUsuario = null;
    try {
      if (usuarioId != null) {
        const usuario = await xanoService.getUserById(usuarioId, adminToken);
        correoUsuario = usuario.email || usuario.correo || null;
      }
    } catch (_) {}

    const asunto = `Cotización #${id} aceptada`;
    const contenidoAdmin = `<p>Se aceptó la cotización #${id} y se generó el pedido #${creado.id} con estado <b>aprobado</b>.</p>`;
    const contenidoUsuario = `<p>Tu cotización #${id} ha sido aceptada y se creó el pedido #${creado.id}. Pronto nos contactaremos para coordinar.</p>`;
    const adjuntos = req.file ? [{ filename: `cotizacion-${id}.pdf`, content: req.file.buffer, contentType: 'application/pdf' }] : [];

    try { await emailService.enviarCorreo({ destinatario: correoAdmin, asunto, contenido: contenidoAdmin, esHTML: true, adjuntos }); } catch (_) {}
    if (correoUsuario) { try { await emailService.enviarCorreo({ destinatario: correoUsuario, asunto, contenido: contenidoUsuario, esHTML: true, adjuntos }); } catch (_) {} }

    // Crear notificación en sistema para el usuario
    if (usuarioId) {
      try {
        await query(`
          INSERT INTO notificaciones (usuario_id, mensaje, tipo, asunto, datos_adicionales)
          VALUES ($1, $2, 'sistema', $3, $4)
        `, [
          usuarioId,
          `Tu cotización #${id} ha sido aceptada. Se ha generado el pedido #${creado.id}.`,
          'cotizacion',
          `Cotización #${id} Aceptada`,
          JSON.stringify({ cotizacion_id: id, pedido_id: creado.id, estado: 'aprobado' })
        ]);
      } catch (err) {
        logger.error('Error al crear notificación de cotización aceptada', { error: err.message, cotizacionId: id });
      }
    }

    logger.info('Cotización aceptada', { cotizacionId: id, pedidoId: creado.id, usuarioId });
    return res.json({ message: 'Cotización aceptada', pedido: { ...creado, estado: 'aprobado' } });
  } catch (e) {
    const memId = `mem-${Date.now()}`;
    cotizacionesEstado.set(String(id), 'aprobada');
    const asunto = `Cotización #${id} aceptada (offline)`;
    const contenidoAdmin = `<p>Se aceptó la cotización #${id}. Se registró pedido local #${memId} con estado <b>aprobado</b>.</p>`;
    const adjuntos = req.file ? [{ filename: `cotizacion-${id}.pdf`, content: req.file.buffer, contentType: 'application/pdf' }] : [];
    try { await emailService.enviarCorreo({ destinatario: process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin123@gmail.com', asunto, contenido: contenidoAdmin, esHTML: true, adjuntos }); } catch (_) {}
    logger.warn('Aceptación de cotización en modo offline', { cotizacionId: id, error: e.message });
    return res.json({ message: 'Cotización aceptada (offline)', pedido: { id: memId, estado: 'aprobado', created_at: new Date().toISOString() } });
  }
}));

// Rechazar cotización (admin): marca estado local y notifica al usuario
router.patch('/cotizaciones/xano/:id/rechazar', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  cotizacionesEstado.set(String(id), 'rechazada');
  let adminToken = null;
  try { adminToken = await xanoService.ensureAdminToken(); } catch (_) {}
  let correoUsuario = null;
  let usuarioId = null;
  try {
    const cot = await xanoService.getCotizacionById(id, adminToken);
    usuarioId = cot.usuario_id ?? cot.user_id ?? null;
    if (usuarioId != null) {
      const usuario = await xanoService.getUserById(usuarioId, adminToken);
      correoUsuario = usuario.email || usuario.correo || null;
    }
  } catch (_) {}

  const asunto = `Cotización #${id} rechazada`;
  const contenido = `<p>Tu cotización #${id} ha sido <b>rechazada</b>. Si deseas ajustar detalles, contáctanos para una nueva cotización.</p>`;
  if (correoUsuario) { try { await emailService.enviarCorreo({ destinatario: correoUsuario, asunto, contenido, esHTML: true }); } catch (_) {} }

  // Crear notificación en sistema para el usuario
  if (usuarioId) {
    try {
      await query(`
        INSERT INTO notificaciones (usuario_id, mensaje, tipo, asunto, datos_adicionales)
        VALUES ($1, $2, 'sistema', $3, $4)
      `, [
        usuarioId,
        `Tu cotización #${id} ha sido rechazada.`,
        'cotizacion',
        `Cotización #${id} Rechazada`,
        JSON.stringify({ cotizacion_id: id, estado: 'rechazada' })
      ]);
    } catch (err) {
      logger.error('Error al crear notificación de cotización rechazada', { error: err.message, cotizacionId: id });
    }
  }

  logger.info('Cotización rechazada', { cotizacionId: id });
  res.json({ message: 'Cotización rechazada' });
}));

// Listado de todas las cotizaciones desde Xano (solo administradores)
router.get('/cotizaciones/xano', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const usuario_id = req.query.usuario_id || '';
  const params = {};
  if (usuario_id) { params.usuario_id = usuario_id; params.user_id = usuario_id; }
  try {
    const adminToken = await xanoService.ensureAdminToken();
    const resultado = await xanoService.getCotizaciones({ page, limit, ...params }, adminToken);
    const items = resultado.data || resultado.items || [];
    const cotizaciones = items.map(c => ({
      id: c.id,
      created_at: c.created_at,
      medidas: c.medidas || '',
      cubierta: c.cubierta || '',
      material_mueble: c.material_mueble || '',
      color: c.color || '',
      precio_unitario: c.precio_unitario ?? 0,
      comuna: c.comuna || c.traslado_comuna || '',
      usuario_id: c.usuario_id ?? c.user_id ?? null,
      estado_cotizacion: cotizacionesEstado.get(String(c.id)) || 'pendiente',
    }));
    res.json({
      message: 'Cotizaciones obtenidas exitosamente',
      cotizaciones,
      pagination: {
        page,
        limit,
        total: Array.isArray(items) ? items.length : 0,
        pages: Math.ceil((Array.isArray(items) ? items.length : 0) / limit) || 1,
      },
    });
  } catch (error) {
    try {
      const resultado = await xanoService.getCotizaciones({ page, limit, ...params }, null);
      const items = resultado.data || resultado.items || [];
      const cotizaciones = items.map(c => ({
        id: c.id,
        created_at: c.created_at,
        medidas: c.medidas || '',
        cubierta: c.cubierta || '',
        material_mueble: c.material_mueble || '',
        color: c.color || '',
        precio_unitario: c.precio_unitario ?? 0,
        usuario_id: c.usuario_id ?? c.user_id ?? null,
        estado_cotizacion: cotizacionesEstado.get(String(c.id)) || 'pendiente',
      }));
      res.json({
        message: 'Cotizaciones obtenidas exitosamente (público)',
        cotizaciones,
        pagination: {
          page,
          limit,
          total: Array.isArray(items) ? items.length : 0,
          pages: Math.ceil((Array.isArray(items) ? items.length : 0) / limit) || 1,
        },
      });
    } catch (_) {
      res.status(200).json({
        message: 'Cotizaciones obtenidas (modo offline)',
        cotizaciones: [],
        pagination: { page, limit, total: 0, pages: 0 },
        error: 'Servicio temporalmente no disponible',
      });
    }
  }
}));

router.get('/xano/usuario/:id', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.usuario.rol !== 'administrador' && parseInt(id) !== req.usuario.id) {
    throw new ForbiddenError('Solo puedes ver tus propios pedidos');
  }
  const tokenHeader = req.headers.authorization || '';
  const token = tokenHeader.split(' ')[1] || null;
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const estado = req.query.estado || '';
  const params = {};
  if (estado) params.estado = estado;
  let pedidosXano = [];
  try {
    const r = await xanoService.getOrdersByUser(id, { page, limit, ...params }, token);
    pedidosXano = r.data || r.items || [];
  } catch (_) {}
  // Incluir pedidos desde la BD local
  let pedidosDb = [];
  try {
    const where = estado ? 'WHERE p.usuario_id = $1 AND p.estado = $2' : 'WHERE p.usuario_id = $1';
    const valores = estado ? [id, estado] : [id];
    const resultado = await query(`
      SELECT 
        p.id, p.estado, p.fecha_creacion, p.fecha_entrega, p.total_estimado,
        COUNT(dp.id) as cantidad_items
      FROM pedidos p
      LEFT JOIN detalles_pedido dp ON p.id = dp.pedido_id
      ${where}
      GROUP BY p.id, p.estado, p.fecha_creacion, p.fecha_entrega, p.total_estimado
      ORDER BY p.fecha_creacion DESC
      LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}
    `, [...valores, limit, (page - 1) * limit]);
    pedidosDb = resultado.rows;
  } catch (_) {}
  const mem = pedidosMem.get(parseInt(id)) || [];
  const overrideSet = pedidosCancelOverride.get(parseInt(id)) || new Set();
  const pedidosXanoConOverride = (Array.isArray(pedidosXano) ? pedidosXano : []).map(p => {
    if (overrideSet.has(String(p.id))) {
      return { ...p, estado: 'cancelado' };
    }
    return p;
  });
  let cotizacionesX = [];
  try {
    const rC = await xanoService.getCotizacionesByUser(id, { page, limit }, token);
    const listC = rC.data || rC.items || [];
    cotizacionesX = listC.map(c => ({ id: c.id, estado: 'en_cotizacion', created_at: c.created_at, detalles: [{ descripcion: 'Cotización', medidas: c.medidas || '', material: c.material_mueble || '', color: c.color || '', cantidad: 1, precio_unitario: c.precio_unitario ?? 0 }], total_estimado: c.precio_unitario ?? 0, tipo: 'cotizacion' }));
  } catch (_) {}
  const merged = [...pedidosDb, ...pedidosXanoConOverride, ...cotizacionesX, ...mem];
  const seen = new Set();
  const pedidos = [];
  for (const p of merged) {
    const key = String(p.id);
    if (!seen.has(key)) {
      pedidos.push(p);
      seen.add(key);
    }
  }
  res.json({
    message: 'Pedidos obtenidos exitosamente',
    pedidos,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: pedidos.length, pages: Math.ceil(pedidos.length / parseInt(limit)) },
  });
}));

// Listado solo de cotizaciones del usuario desde Xano
router.get('/cotizaciones/usuario/:id', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.usuario.rol !== 'administrador' && parseInt(id) !== req.usuario.id) {
    throw new ForbiddenError('Solo puedes ver tus propias cotizaciones');
  }
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const tokenHeader = req.headers.authorization || '';
  const token = tokenHeader.split(' ')[1] || null;
  try {
    const resultado = await xanoService.getCotizacionesByUser(id, { page, limit }, token);
    const items = resultado.data || resultado.items || [];
    const cotizaciones = items.map(c => ({
      id: c.id,
      created_at: c.created_at,
      medidas: c.medidas || '',
      cubierta: c.cubierta || '',
      material_mueble: c.material_mueble || '',
      color: c.color || '',
      comuna: c.comuna || c.traslado_comuna || '',
      precio_unitario: c.precio_unitario ?? 0,
      estado_cotizacion: cotizacionesEstado.get(String(c.id)) || 'pendiente',
    }));
    res.json({
      message: 'Cotizaciones obtenidas exitosamente',
      cotizaciones,
      pagination: {
        page,
        limit,
        total: Array.isArray(items) ? items.length : 0,
        pages: Math.ceil((Array.isArray(items) ? items.length : 0) / limit) || 1,
      },
    });
  } catch (error) {
    const cotizaciones = [];
    res.status(200).json({
      message: 'Cotizaciones obtenidas (modo offline)',
      cotizaciones,
      pagination: { page, limit, total: 0, pages: 0 },
      error: 'Servicio temporalmente no disponible',
    });
  }
}));

/**
 * GET /pedidos/usuario/:id - Listar pedidos de un usuario específico
 * Permite ver los pedidos de un usuario con filtros y paginación
 */
router.get('/usuario/:id', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10, estado = '' } = req.query;

  // Verificar permisos: solo el propio usuario o administrador pueden ver los pedidos
  if (req.usuario.rol !== 'administrador' && parseInt(id) !== req.usuario.id) {
    throw new ForbiddenError('Solo puedes ver tus propios pedidos');
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // Construir filtros dinámicamente
  let whereClause = 'WHERE p.usuario_id = $1';
  const valores = [id];
  let contador = 2;

  // Filtro opcional por estado
  if (estado) {
    whereClause += ` AND p.estado = $${contador}`;
    valores.push(estado);
    contador++;
  }

  // Obtener el total de registros que coinciden con los filtros
  const totalResult = await query(`
    SELECT COUNT(*) as total FROM pedidos p ${whereClause}
  `, valores);
  
  const total = parseInt(totalResult.rows[0].total);

  // Obtener pedidos paginados con información resumida
  valores.push(parseInt(limit), offset);
  const resultado = await query(`
    SELECT 
      p.id, p.estado, p.fecha_creacion, p.fecha_entrega, p.total_estimado,
      COUNT(dp.id) as cantidad_items
    FROM pedidos p
    LEFT JOIN detalles_pedido dp ON p.id = dp.pedido_id
    ${whereClause}
    GROUP BY p.id, p.estado, p.fecha_creacion, p.fecha_entrega, p.total_estimado
    ORDER BY p.fecha_creacion DESC
    LIMIT $${contador} OFFSET $${contador + 1}
  `, valores);

  res.json({
    message: 'Pedidos obtenidos exitosamente',
    pedidos: resultado.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

/**
 * GET /pedidos - Listar todos los pedidos con filtros (solo administradores)
 * Permite a los administradores ver todos los pedidos del sistema con opciones de filtrado
 */
router.get('/', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, estado = '', usuario_id = '' } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // Construir filtros dinámicamente basados en los parámetros de consulta
  let whereClause = 'WHERE 1=1';
  const valores = [];
  let contador = 1;

  // Filtro por estado específico
  if (estado) {
    whereClause += ` AND p.estado = $${contador}`;
    valores.push(estado);
    contador++;
  }

  // Filtro por usuario específico
  if (usuario_id) {
    whereClause += ` AND p.usuario_id = $${contador}`;
    valores.push(usuario_id);
    contador++;
  }

  // Obtener el total de registros que coinciden con los filtros
  const totalResult = await query(`
    SELECT COUNT(*) as total FROM pedidos p ${whereClause}
  `, valores);
  
  const total = parseInt(totalResult.rows[0].total);

  // Obtener pedidos paginados con información del usuario y resumen
  valores.push(parseInt(limit), offset);
  const resultado = await query(`
    SELECT 
      p.id, p.estado, p.fecha_creacion, p.fecha_entrega, p.total_estimado,
      u.nombre as nombre_usuario, u.correo as correo_usuario,
      COUNT(dp.id) as cantidad_items
    FROM pedidos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN detalles_pedido dp ON p.id = dp.pedido_id
    ${whereClause}
    GROUP BY p.id, p.estado, p.fecha_creacion, p.fecha_entrega, p.total_estimado, u.nombre, u.correo
    ORDER BY p.fecha_creacion DESC
    LIMIT $${contador} OFFSET $${contador + 1}
  `, valores);

  res.json({
    message: 'Pedidos obtenidos exitosamente',
    pedidos: resultado.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

router.get('/xano', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const estado = req.query.estado || '';
  const usuario_id = req.query.usuario_id || '';

  let pedidosXano = [];
  try {
    const adminToken = await xanoService.ensureAdminToken();
    const params = {};
    if (estado) params.estado = estado;
    if (usuario_id) params.usuario_id = usuario_id;
    const resultado = await xanoService.getOrders({ page, limit, ...params }, adminToken);
    pedidosXano = resultado.data || resultado.items || [];
  } catch (error) {
    logger.warn('Fallo al obtener pedidos desde Xano, usando memoria', { error: error.message });
  }

  const pedidosMemAll = [];
  for (const [_, lista] of pedidosMem.entries()) {
    pedidosMemAll.push(...lista);
  }
  const pedidosMemFiltrados = pedidosMemAll.filter(p => {
    if (estado && p.estado !== estado) return false;
    if (usuario_id && String(p.usuario_id) !== String(usuario_id)) return false;
    return true;
  });

  const pedidos = [...pedidosXano, ...pedidosMemFiltrados];
  const total = pedidos.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginados = pedidos.slice(start, end);

  res.json({
    message: 'Pedidos obtenidos exitosamente',
    pedidos: paginados,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

/**
 * PATCH /pedidos/:id/estado - Actualizar estado del pedido (solo administradores)
 * Permite cambiar el estado de un pedido siguiendo las transiciones válidas
 */
router.patch('/:id/estado', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = actualizarEstadoSchema.validate(req.body);
  
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { estado, notas_admin, fecha_entrega } = value;

  // Obtener el estado actual del pedido y el ID del usuario propietario
  const pedidoActual = await query(
    'SELECT estado, usuario_id FROM pedidos WHERE id = $1',
    [id]
  );

  if (pedidoActual.rows.length === 0) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const estadoActual = pedidoActual.rows[0].estado;
  const usuarioId = pedidoActual.rows[0].usuario_id;

  // Verificar que la transición de estado es válida según las reglas de negocio
  if (!TRANSICIONES_PERMITIDAS[estadoActual].includes(estado)) {
    throw new ValidationError(
      `No se puede cambiar el estado de '${estadoActual}' a '${estado}'. ` +
      `Estados permitidos: ${TRANSICIONES_PERMITIDAS[estadoActual].join(', ')}`
    );
  }

  // Construir query dinámicamente para actualizar solo los campos proporcionados
  const campos = ['estado = $2'];
  const valores = [id, estado];
  let contador = 3;

  if (notas_admin !== undefined) {
    campos.push(`notas_admin = $${contador}`);
    valores.push(notas_admin);
    contador++;
  }

  if (fecha_entrega !== undefined) {
    campos.push(`fecha_entrega = $${contador}`);
    valores.push(fecha_entrega);
    contador++;
  }

  // Actualizar el pedido en la base de datos
  const resultado = await query(`
    UPDATE pedidos 
    SET ${campos.join(', ')}
    WHERE id = $1
    RETURNING *
  `, valores);

  const pedidoActualizado = resultado.rows[0];

  // Actualizar el historial de estados con información del administrador que hizo el cambio
  // (el trigger de la base de datos crea automáticamente el registro de historial)
  await query(`
    UPDATE historial_estados 
    SET usuario_cambio_id = $1, comentario = $2
    WHERE pedido_id = $3 AND estado_nuevo = $4 AND usuario_cambio_id IS NULL
  `, [req.usuario.id, notas_admin, id, estado]);

  // Crear notificación automática para informar al usuario sobre el cambio de estado
  const mensajesEstado = {
    'en_cotizacion': 'Tu pedido está siendo cotizado por nuestro equipo.',
    'aprobado': 'Tu pedido ha sido aprobado y pronto comenzará la producción.',
    'en_produccion': 'Tu pedido está en producción.',
    'entregado': 'Tu pedido ha sido entregado exitosamente.',
    'cancelado': 'Tu pedido ha sido cancelado.'
  };

  await query(`
    INSERT INTO notificaciones (usuario_id, mensaje, tipo, asunto, datos_adicionales)
    VALUES ($1, $2, 'sistema', $3, $4)
  `, [
    usuarioId,
    mensajesEstado[estado] || `El estado de tu pedido ha cambiado a: ${estado}`,
    `Pedido ${estado}`,
    JSON.stringify({ pedido_id: id, estado_anterior: estadoActual, estado_nuevo: estado })
  ]);

  // Registrar el cambio de estado en los logs para auditoría
  logger.info('Estado de pedido actualizado', {
    pedidoId: id,
    estadoAnterior: estadoActual,
    estadoNuevo: estado,
    adminId: req.usuario.id,
    usuarioId: usuarioId
  });

  res.json({
    message: 'Estado del pedido actualizado exitosamente',
    pedido: pedidoActualizado
  });
}));

router.patch('/xano/:id/solicitar-cotizacion', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tokenHeader = req.headers.authorization || '';
  const token = tokenHeader.split(' ')[1] || null;
  const lista = pedidosMem.get(req.usuario.id) || [];
  const idx = lista.findIndex(p => String(p.id) === String(id));
  if (idx >= 0) {
    const pedidoMem = lista[idx];
    try {
      const tokenHeader = req.headers.authorization || '';
      const userToken = tokenHeader.split(' ')[1] || null;
      const adminToken = await xanoService.ensureAdminToken();
      let xanoUserId = await xanoService.findUserIdByEmail(req.usuario.correo, adminToken);
      if (!xanoUserId && req.usuario?.correo) {
        try {
          const creadoUsuario = await xanoService.createUser({ nombre: req.usuario.nombre, email: req.usuario.correo }, adminToken);
          xanoUserId = creadoUsuario.id;
        } catch (_) {}
      }
      let creado = null;
      if (userToken) {
        try {
          creado = await xanoService.createOrderWithDetails({
            usuario_id: xanoUserId ?? req.usuario.id,
            user_id: xanoUserId ?? req.usuario.id,
            detalles: pedidoMem.detalles,
            estado: 'en_cotizacion'
          }, userToken);
        } catch (_) {}
      }
      if (!creado) {
        creado = await xanoService.createOrderWithDetails({
          usuario_id: xanoUserId ?? req.usuario.id,
          user_id: xanoUserId ?? req.usuario.id,
          detalles: pedidoMem.detalles,
          estado: 'en_cotizacion'
        }, adminToken);
      }
      lista[idx].id = creado.id;
      lista[idx].estado = 'en_cotizacion';
      pedidosMem.set(req.usuario.id, lista);
      try {
        const statusToken = userToken || adminToken;
        await xanoService.updateOrderStatus(creado.id, { estado: 'en_cotizacion' }, statusToken);
      } catch (_) {}
      logger.info('Pedido sincronizado y solicitado para cotización (mem→xano)', { pedidoId: creado.id, usuarioId: req.usuario.id });
      res.json({ message: 'Solicitud de cotización enviada', pedido: { ...creado, estado: 'en_cotizacion' } });
      return;
    } catch (e) {
      lista[idx].estado = 'en_cotizacion';
      pedidosMem.set(req.usuario.id, lista);
      logger.info('Pedido solicitado para cotización (mem, sin xano)', { pedidoId: id, usuarioId: req.usuario.id });
      res.json({ message: 'Solicitud de cotización enviada (local)', pedido: lista[idx] });
      return;
    }
  }
  try {
    const adminToken = await xanoService.ensureAdminToken();
    let detallesX = [];
    try { detallesX = await xanoService.getOrderDetails(id, adminToken); } catch (_) {}
    const totalEstimado = (Array.isArray(detallesX) ? detallesX : []).reduce((acc, d) => acc + (d.cantidad || 1) * (d.precio_unitario ?? d.precio_base ?? 0), 0);
    const payload = { estado: 'en_cotizacion' };
    if (totalEstimado > 0) payload.total_estimado = totalEstimado;
    const pedidoActualizado = await xanoService.updateOrderStatus(id, payload, adminToken);
    logger.info('Pedido solicitado para cotización', { pedidoId: id, usuarioId: req.usuario.id });
    res.json({ message: 'Solicitud de cotización enviada', pedido: pedidoActualizado });
  } catch (e) {
    const infoErr = { status: e.response?.status, url: e.config?.url, message: e.response?.data?.message || e.message };
    logger.error('Fallo al solicitar cotización', infoErr);
    try {
      const adminToken = await xanoService.ensureAdminToken();
      // Intentar actualizar con endpoint de status, incluyendo total_estimado si se puede obtener
      let detallesX = [];
      try { detallesX = await xanoService.getOrderDetails(id, adminToken); } catch (_) {}
      const totalEstimado = (Array.isArray(detallesX) ? detallesX : []).reduce((acc, d) => acc + (d.cantidad || 1) * (d.precio_unitario ?? d.precio_base ?? 0), 0);
      const payload = { estado: 'en_cotizacion' };
      if (totalEstimado > 0) payload.total_estimado = totalEstimado;
      try {
        const pedidoActualizado = await xanoService.updateOrderStatus(id, payload, adminToken);
        logger.info('Pedido solicitado para cotización (fallback status)', { pedidoId: id, usuarioId: req.usuario.id });
        return res.json({ message: 'Solicitud de cotización enviada', pedido: pedidoActualizado });
      } catch (_) {}
      // Último recurso: sincronizar desde DB local hacia Xano
      const pedidoDb = await query('SELECT p.*, u.correo as correo_usuario FROM pedidos p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = $1', [id]);
      const detallesDb = await query('SELECT * FROM detalles_pedido WHERE pedido_id = $1 ORDER BY id', [id]);
      if (pedidoDb.rows.length > 0) {
        const correo = pedidoDb.rows[0].correo_usuario;
        let xanoUserId = await xanoService.findUserIdByEmail(correo, adminToken);
        if (!xanoUserId && correo) {
          try {
            const creadoUsuario = await xanoService.createUser({ nombre: req.usuario.nombre, email: correo }, adminToken);
            xanoUserId = creadoUsuario.id;
          } catch (_) {}
        }
        const creado = await xanoService.createOrderWithDetails({ usuario_id: xanoUserId ?? pedidoDb.rows[0].usuario_id, user_id: xanoUserId ?? pedidoDb.rows[0].usuario_id, detalles: detallesDb.rows, estado: 'en_cotizacion' }, adminToken);
        try { await xanoService.updateOrderStatus(creado.id, { estado: 'en_cotizacion' }, adminToken); } catch (_) {}
        logger.info('Pedido sincronizado y solicitado para cotización (db→xano)', { pedidoId: creado.id, usuarioId: pedidoDb.rows[0].usuario_id });
        return res.json({ message: 'Solicitud de cotización enviada', pedido: { ...creado, estado: 'en_cotizacion' } });
      }
    } catch (_) {}
    res.status(500).json({ message: 'Error al solicitar cotización' });
  }
}));

router.patch('/xano/:id/cancelar', verificarToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lista = pedidosMem.get(req.usuario.id) || [];
  const idx = lista.findIndex(p => String(p.id) === String(id));
  if (idx >= 0) {
    const estadoActual = lista[idx].estado;
    if (!TRANSICIONES_PERMITIDAS[estadoActual].includes('cancelado')) {
      throw new ValidationError(`No se puede cancelar un pedido en estado '${estadoActual}'`);
    }
    // Intentar actualizar en Xano o crear si no existe
    try {
      const tokenHeader = req.headers.authorization || '';
      const userToken = tokenHeader.split(' ')[1] || null;
      let pedidoXano = null;
      // Intentar cancelar directamente en Xano
      if (userToken) {
        try { pedidoXano = await xanoService.updateOrderStatus(id, { estado: 'cancelado' }, userToken); } catch (_) {}
      }
      if (!pedidoXano) {
        const adminToken = await xanoService.ensureAdminToken();
        try { pedidoXano = await xanoService.updateOrderStatus(id, { estado: 'cancelado' }, adminToken); } catch (_) {}
        // Si tampoco existe en Xano, crearlo con estado cancelado
        if (!pedidoXano) {
          const xanoUserId = await xanoService.findUserIdByEmail(req.usuario.correo, adminToken);
          const creado = await xanoService.createOrderWithDetails({
            usuario_id: xanoUserId ?? req.usuario.id,
            user_id: xanoUserId ?? req.usuario.id,
            detalles: lista[idx].detalles,
            estado: 'cancelado'
          }, adminToken);
          try { await xanoService.updateOrderStatus(creado.id, { estado: 'cancelado' }, adminToken); } catch (_) {}
          lista[idx].id = creado.id;
        }
      }
    } catch (_) {}
    // Actualización local asegurada
    lista[idx].estado = 'cancelado';
    pedidosMem.set(req.usuario.id, lista);
    logger.info('Pedido cancelado (mem/xano)', { pedidoId: lista[idx].id || id, usuarioId: req.usuario.id });
    return res.json({ message: 'Pedido cancelado exitosamente', pedido: lista[idx] });
  }
  try {
    const tokenHeader = req.headers.authorization || '';
    const userToken = tokenHeader.split(' ')[1] || null;
    let pedidoActualizado = null;
    if (userToken) {
      try {
        pedidoActualizado = await xanoService.updateOrderStatus(id, { estado: 'cancelado' }, userToken);
      } catch (_) {}
    }
    if (!pedidoActualizado) {
      const adminToken = await xanoService.ensureAdminToken();
      pedidoActualizado = await xanoService.updateOrderStatus(id, { estado: 'cancelado' }, adminToken);
    }
    logger.info('Pedido cancelado', { pedidoId: id, usuarioId: req.usuario.id });
    return res.json({ message: 'Pedido cancelado exitosamente', pedido: pedidoActualizado });
  } catch (e) {
    const uid = req.usuario.id;
    const set = pedidosCancelOverride.get(uid) || new Set();
    set.add(String(id));
    pedidosCancelOverride.set(uid, set);
    return res.json({ message: 'Pedido cancelado exitosamente (local)' });
  }
}));

router.patch('/:id/cancelar', verificarToken, verificarPropietarioPedido, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const estadoActualResult = await query(
    'SELECT estado, usuario_id FROM pedidos WHERE id = $1',
    [id]
  );
  if (estadoActualResult.rows.length === 0) {
    throw new NotFoundError('Pedido no encontrado');
  }
  const estadoActual = estadoActualResult.rows[0].estado;
  const usuarioId = estadoActualResult.rows[0].usuario_id;
  if (!TRANSICIONES_PERMITIDAS[estadoActual].includes('cancelado')) {
    throw new ValidationError(`No se puede cancelar un pedido en estado '${estadoActual}'`);
  }
  const actualizadoResult = await query(
    'UPDATE pedidos SET estado = $2 WHERE id = $1 RETURNING *',
    [id, 'cancelado']
  );
  await query(
    'UPDATE historial_estados SET usuario_cambio_id = $1, comentario = $2 WHERE pedido_id = $3 AND estado_nuevo = $4 AND usuario_cambio_id IS NULL',
    [req.usuario.id, 'Cancelado por usuario', id, 'cancelado']
  );
  await query(
    'INSERT INTO notificaciones (usuario_id, mensaje, tipo, asunto, datos_adicionales) VALUES ($1, $2, $3, $4, $5)',
    [
      usuarioId,
      'Tu pedido ha sido cancelado.',
      'sistema',
      'Pedido cancelado',
      JSON.stringify({ pedido_id: id, estado_anterior: estadoActual, estado_nuevo: 'cancelado' })
    ]
  );
  try {
    const adminToken = await xanoService.ensureAdminToken?.();
    if (adminToken) {
      await xanoService.updateOrderStatus(id, { estado: 'cancelado' }, adminToken);
    }
  } catch (_) {}
  logger.info('Pedido cancelado', { pedidoId: id, usuarioId });
  res.json({ message: 'Pedido cancelado exitosamente', pedido: actualizadoResult.rows[0] });
}));

/**
 * PUT /pedidos/:id/cotizacion - Actualizar cotización del pedido (solo administradores)
 * Permite establecer precios para los detalles del pedido y el total estimado
 */
router.put('/:id/cotizacion', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = actualizarCotizacionSchema.validate(req.body);
  
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { detalles, total_estimado } = value;

  // Usar transacción para asegurar consistencia al actualizar múltiples registros
  const resultado = await transaction(async (client) => {
    // Verificar que el pedido existe antes de proceder
    const pedidoResult = await client.query(
      'SELECT id, estado FROM pedidos WHERE id = $1',
      [id]
    );

    if (pedidoResult.rows.length === 0) {
      throw new NotFoundError('Pedido no encontrado');
    }

    // Actualizar la cotización de cada detalle del pedido
    for (const detalle of detalles) {
      await client.query(
        'UPDATE detalles_pedido SET cotizacion = $1 WHERE id = $2 AND pedido_id = $3',
        [detalle.cotizacion, detalle.id, id]
      );
    }

    // Actualizar el total estimado del pedido principal
    const pedidoActualizado = await client.query(
      'UPDATE pedidos SET total_estimado = $1 WHERE id = $2 RETURNING *',
      [total_estimado, id]
    );

    return pedidoActualizado.rows[0];
  });

  // Registrar la actualización de cotización en los logs
  logger.info('Cotización de pedido actualizada', {
    pedidoId: id,
    totalEstimado: total_estimado,
    adminId: req.usuario.id
  });

  res.json({
    message: 'Cotización actualizada exitosamente',
    pedido: resultado
  });
}));

/**
 * GET /pedidos/estadisticas/resumen - Obtener estadísticas de pedidos (solo administradores)
 * Proporciona un resumen estadístico de todos los pedidos para análisis de negocio
 */
router.get('/estadisticas/resumen', verificarToken, verificarAdmin, asyncHandler(async (req, res) => {
  // Obtener estadísticas agrupadas por estado de pedido
  const estadisticas = await query(`
    SELECT 
      estado,
      COUNT(*) as cantidad,
      SUM(total_estimado) as valor_total
    FROM pedidos 
    GROUP BY estado
    ORDER BY 
      CASE estado
        WHEN 'nuevo' THEN 1
        WHEN 'en_cotizacion' THEN 2
        WHEN 'aprobado' THEN 3
        WHEN 'en_produccion' THEN 4
        WHEN 'entregado' THEN 5
        WHEN 'cancelado' THEN 6
      END
  `);

  // Obtener resumen mensual de pedidos de los últimos 12 meses
  const resumenMensual = await query(`
    SELECT 
      DATE_TRUNC('month', fecha_creacion) as mes,
      COUNT(*) as pedidos_creados,
      SUM(total_estimado) as valor_total
    FROM pedidos 
    WHERE fecha_creacion >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', fecha_creacion)
    ORDER BY mes DESC
  `);

  res.json({
    message: 'Estadísticas obtenidas exitosamente',
    estadisticas: {
      por_estado: estadisticas.rows,
      resumen_mensual: resumenMensual.rows
    }
  });
}));

// Exportar el router para uso en el servidor principal
module.exports = router;
