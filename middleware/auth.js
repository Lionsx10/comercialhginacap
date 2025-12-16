// IMPORTS - Importación de dependencias para JWT y Xano
const jwt = require('jsonwebtoken');
const xanoService = require('../services/xanoService');

// MIDDLEWARE PRINCIPAL DE AUTENTICACIÓN - Verificar token con Xano
const verificarToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      if ((process.env.NODE_ENV || 'development') === 'development') {
        const devId = parseInt(req.headers['x-dev-user-id']) || 0;
        const devNombre = req.headers['x-dev-user-nombre'] || 'Usuario';
        const devRol = req.headers['x-dev-user-rol'] || 'cliente';
        const devCorreo = req.headers['x-dev-user-email'] || null;
        req.usuario = { id: devId, nombre: devNombre, correo: devCorreo, rol: devRol, token: 'dev_token' };
        return next();
      }
      return res.status(401).json({ error: 'Token de acceso requerido', message: 'Debes incluir el header Authorization con el token' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      if ((process.env.NODE_ENV || 'development') === 'development') {
        const devId = parseInt(req.headers['x-dev-user-id']) || 0;
        const devNombre = req.headers['x-dev-user-nombre'] || 'Usuario';
        const devRol = req.headers['x-dev-user-rol'] || 'cliente';
        const devCorreo = req.headers['x-dev-user-email'] || null;
        req.usuario = { id: devId, nombre: devNombre, correo: devCorreo, rol: devRol, token: 'dev_token' };
        return next();
      }
      return res.status(401).json({ error: 'Token malformado', message: 'El formato debe ser: Bearer <token>' });
    }
    try {
      const userInfo = await xanoService.me(token);
      req.usuario = { id: userInfo.id, nombre: userInfo.nombre || userInfo.name || 'Usuario', correo: userInfo.email || userInfo.correo, rol: userInfo.rol || userInfo.role || 'cliente', token };
      return next();
    } catch (_) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = { id: decoded.userId, nombre: decoded.nombre || 'Usuario', correo: decoded.email || decoded.correo, rol: decoded.rol || 'cliente', token };
        return next();
      } catch (_) {
        if ((process.env.NODE_ENV || 'development') === 'development') {
          const devId = parseInt(req.headers['x-dev-user-id']) || 0;
          const devNombre = req.headers['x-dev-user-nombre'] || 'Usuario';
          const devRol = req.headers['x-dev-user-rol'] || 'cliente';
          const devCorreo = req.headers['x-dev-user-email'] || null;
          req.usuario = { id: devId, nombre: devNombre, correo: devCorreo, rol: devRol, token: 'dev_token' };
          return next();
        }
        return res.status(401).json({ error: 'Token inválido', message: 'El token proporcionado no es válido' });
      }
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor', message: 'Error al verificar el token de autenticación' });
  }
};

// MIDDLEWARE DE VERIFICACIÓN DE ADMINISTRADOR - Verificar permisos de admin
const verificarAdmin = (req, res, next) => {
  // VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
  if (!req.usuario) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Debes estar autenticado para acceder a este recurso'
    });
  }

  // VERIFICAR ROL DE ADMINISTRADOR
  const rol = (req.usuario.rol || '').toString().toLowerCase();
  const isAdmin = req.usuario.is_admin === true || rol === 'admin' || rol === 'administrador';
  if (!isAdmin) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Solo los administradores pueden acceder a este recurso'
    });
  }

  next(); // Continuar si es administrador
};

// MIDDLEWARE DE VERIFICACIÓN DE PROPIETARIO - Verificar acceso a recursos propios
const verificarPropietarioOAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    // VERIFICAR AUTENTICACIÓN
    if (!req.usuario) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes estar autenticado para acceder a este recurso'
      });
    }

    // EXTRAER IDs para comparación
    const recursoId = req.params[paramName];
    const usuarioId = req.usuario.id;
    const esAdmin = req.usuario.rol === 'administrador';

    // PERMITIR ACCESO A ADMINISTRADORES sin restricciones
    if (esAdmin) {
      return next();
    }

    // VERIFICAR QUE EL USUARIO ACCEDA SOLO A SUS RECURSOS
    if (parseInt(recursoId) !== usuarioId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo puedes acceder a tus propios recursos'
      });
    }

    next(); // Permitir acceso al propietario
  };
};

// MIDDLEWARE ESPECÍFICO PARA PEDIDOS - Verificar propietario de pedido
const verificarPropietarioPedido = async (req, res, next) => {
  try {
    // VERIFICAR AUTENTICACIÓN
    if (!req.usuario) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes estar autenticado para acceder a este recurso'
      });
    }

    // EXTRAER DATOS para verificación
    const pedidoId = req.params.id;
    const usuarioId = req.usuario.id;
    const esAdmin = req.usuario.rol === 'administrador';

    // PERMITIR ACCESO COMPLETO A ADMINISTRADORES
    if (esAdmin) {
      return next();
    }

    // VERIFICAR PROPIETARIO DEL PEDIDO en la base de datos
    const result = await query(
      'SELECT usuario_id FROM pedidos WHERE id = $1',
      [pedidoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Pedido no encontrado',
        message: 'El pedido especificado no existe'
      });
    }

    // VERIFICAR QUE EL PEDIDO PERTENEZCA AL USUARIO
    if (result.rows[0].usuario_id !== usuarioId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo puedes acceder a tus propios pedidos'
      });
    }

    next(); // Permitir acceso al propietario del pedido
  } catch (error) {
    console.error('Error en verificación de propietario de pedido:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error al verificar permisos del pedido'
    });
  }
};

// MIDDLEWARE OPCIONAL - Para rutas que pueden ser públicas o privadas
const tokenOpcional = async (req, res, next) => {
  try {
    // INTENTAR EXTRAER TOKEN si está presente
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // Modo desarrollo: permitir usuario desde cabeceras de desarrollo
      if ((process.env.NODE_ENV || 'development') === 'development') {
        const devId = parseInt(req.headers['x-dev-user-id']) || 0;
        const devNombre = req.headers['x-dev-user-nombre'] || 'Usuario';
        const devRol = req.headers['x-dev-user-rol'] || 'cliente';
        req.usuario = { id: devId, nombre: devNombre, correo: null, rol: devRol, token: 'dev_token' };
      }
      return next(); // Continuar con o sin usuario autenticado
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Continuar sin usuario autenticado
    }

    // INTENTAR VERIFICAR TOKEN CON XANO sin fallar si es inválido
    try {
      const userInfo = await xanoService.me(token);
      
      // AGREGAR USUARIO AL REQUEST si está autenticado
      req.usuario = {
        id: userInfo.id,
        nombre: userInfo.nombre || userInfo.name || 'Usuario',
        correo: userInfo.email || userInfo.correo,
        rol: userInfo.rol || userInfo.role || 'cliente',
        token
      };
    } catch (xanoError) {
      // Si falla Xano, intentar con JWT local como fallback
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.usuario = {
          id: decoded.userId,
          nombre: decoded.nombre || 'Usuario',
          correo: decoded.email || decoded.correo,
          rol: decoded.rol || 'cliente',
          token
        };
      } catch (jwtError) {
        // Continuar sin usuario si ambos fallan
      }
    }

    next(); // Continuar con o sin usuario
  } catch (error) {
    // CONTINUAR SIN USUARIO si hay error en el token
    next();
  }
};

// EXPORTAR TODOS LOS MIDDLEWARE
module.exports = {
  verificarToken,
  verificarAdmin,
  verificarPropietarioOAdmin,
  verificarPropietarioPedido,
  tokenOpcional
};
