// Importaciones necesarias para el módulo de autenticación
const express = require('express');
const bcrypt = require('bcryptjs'); // Para cifrado de contraseñas
const jwt = require('jsonwebtoken'); // Para manejo de tokens JWT
const crypto = require('crypto'); // Para generar tokens de recuperación
const Joi = require('joi'); // Para validación de datos de entrada
const xanoService = require('../services/xanoService'); // Servicio de Xano para autenticación
const emailService = require('../services/emailService'); // Servicio de email
const { asyncHandler, ValidationError, UnauthorizedError, ConflictError } = require('../middleware/errorHandler'); // Manejo de errores
const { createLogger } = require('../middleware/logger'); // Sistema de logging

// Inicialización del router de Express y logger específico para autenticación
const router = express.Router();
const logger = createLogger('auth');

// ESQUEMAS DE VALIDACIÓN - Definición de reglas de validación usando Joi

// Esquema para validar datos de registro de usuario
const registroSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es obligatorio'
  }),
  email: Joi.string().email().max(150).required().messages({
    'string.email': 'Debe ser un correo electrónico válido',
    'string.max': 'El correo no puede exceder 150 caracteres',
    'any.required': 'El correo es obligatorio'
  }),
  password: Joi.string().min(8).max(100).required().custom((value, helpers) => {
    if (!/[A-Z]/.test(value)) {
      return helpers.message('La contraseña debe incluir al menos 1 mayúscula');
    }
    const digits = (value.match(/\d/g) || []).length;
    if (digits < 4) {
      return helpers.message('La contraseña debe incluir al menos 4 números');
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
      return helpers.message('La contraseña debe incluir al menos 1 carácter especial');
    }
    return value;
  }).messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.max': 'La contraseña no puede exceder 100 caracteres',
    'any.required': 'La contraseña es obligatoria'
  }),
  password_confirmation: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Las contraseñas no coinciden',
    'any.required': 'La confirmación de contraseña es obligatoria'
  }),
  n_telefono: Joi.string()
    .pattern(/^9\d{8}$|^9\s\d{4}\s\d{4}$/)
    .optional()
    .messages({
      'string.pattern.base': 'El teléfono debe ser 9 dígitos: formato 9 1234 5678'
    }),
  telefono: Joi.string()
    .pattern(/^9\d{8}$|^9\s\d{4}\s\d{4}$/)
    .optional()
    .messages({
      'string.pattern.base': 'El teléfono debe ser 9 dígitos: formato 9 1234 5678'
    })
});

// Esquema para validar datos de inicio de sesión
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Debe ser un correo electrónico válido',
    'any.required': 'El correo es obligatorio'
  }),
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es obligatoria'
  })
});

// Esquema para validar solicitud de recuperación de contraseña
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Debe ser un correo electrónico válido',
    'any.required': 'El correo es obligatorio'
  })
});

// Esquema para validar restablecimiento de contraseña
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'El token es obligatorio'
  }),
  password: Joi.string().min(8).max(100).required().custom((value, helpers) => {
    if (!/[A-Z]/.test(value)) {
      return helpers.message('La contraseña debe incluir al menos 1 mayúscula');
    }
    const digits = (value.match(/\d/g) || []).length;
    if (digits < 4) {
      return helpers.message('La contraseña debe incluir al menos 4 números');
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
      return helpers.message('La contraseña debe incluir al menos 1 carácter especial');
    }
    return value;
  }).messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.max': 'La contraseña no puede exceder 100 caracteres',
    'any.required': 'La contraseña es obligatoria'
  }),
  password_confirmation: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Las contraseñas no coinciden',
    'any.required': 'La confirmación de contraseña es obligatoria'
  })
});

/**
 * Función para generar tokens JWT con información del usuario
 * @param {Object} usuario - Objeto con datos del usuario (id, correo, rol)
 * @returns {string} Token JWT firmado
 */
const generarToken = (usuario) => {
  return jwt.sign(
    { 
      userId: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol
    },
    process.env.JWT_SECRET, // Clave secreta para firmar el token
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h', // Tiempo de expiración
      issuer: 'sistema-muebles', // Emisor del token
      audience: 'sistema-muebles-users' // Audiencia del token
    }
  );
};

/**
 * POST /usuarios/registrar - Endpoint para registrar un nuevo usuario
 * Valida los datos, verifica que el email no esté en uso usando Xano,
 * y crea el usuario en la base de datos de Xano
 */
router.post('/usuarios/registrar', asyncHandler(async (req, res) => {
  // Validar datos de entrada usando el esquema definido
  const { error, value } = registroSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { nombre, email, password, password_confirmation, telefono, n_telefono } = value;
  const telefonoFinal = n_telefono || telefono;

  try {
    // Registrar usuario usando el servicio de Xano
    const response = await xanoService.register({
      nombre,
      email,
      password,
      telefono: (telefonoFinal || '').replace(/\s/g, '')
    });

    // Extraer datos de la respuesta de Xano (ahora incluye información completa del usuario)
    const { authToken, user } = response;

    // Registrar el evento de registro exitoso
    logger.info('Usuario registrado exitosamente', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    // Responder con los datos del usuario y el token
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token: authToken,
      refreshToken: authToken, // Xano maneja tokens de forma diferente
      usuario: user
    });

  } catch (error) {
    // Manejar errores específicos de Xano
    if (error.response?.status === 409 || error.message.includes('duplicate') || error.message.includes('already exists')) {
      throw new ConflictError('El correo electrónico ya está registrado');
    }
    
    if (error.response?.status === 400) {
      throw new ValidationError(error.response.data.message || 'Datos de registro inválidos');
    }

    // Registrar error para debugging
    logger.error('Error en registro de usuario', {
      email,
      error: error.message,
      ip: req.ip
    });

    throw new Error('Error interno del servidor durante el registro');
  }
}));

/**
 * POST /login - Endpoint para iniciar sesión
 * Valida las credenciales del usuario usando Xano y genera un token JWT si son correctas
 */
router.post('/login', asyncHandler(async (req, res) => {
  // Validar datos de entrada usando el esquema definido
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password } = value;

  try {
    // Autenticar usuario usando el servicio de Xano
    const response = await xanoService.login({
      email,
      password
    });

    // Log detallado para debug - ver estructura de respuesta
    console.log('🔍 Respuesta completa de Xano:', JSON.stringify(response, null, 2));

    // Manejar la estructura de respuesta de Xano
    let authToken, user;
    
    if (response.authToken && response.user) {
      // Estructura esperada: { authToken, user }
      authToken = response.authToken;
      user = response.user;
      console.log('📋 Usuario desde response.user:', JSON.stringify(user, null, 2));
    } else {
      // Fallback para otras estructuras
      authToken = response.authToken || response.token || response.access_token || 'temp_token';
      user = response.user || response;
      console.log('📋 Usuario desde fallback:', JSON.stringify(user, null, 2));
    }

    // Asegurar que tenemos los datos mínimos del usuario
    const userData = {
      id: user?.id || user?.user_id || Date.now(), // Fallback temporal
      nombre: user?.nombre || user?.name || user?.full_name || user?.first_name || 'Usuario',
      nombre_completo: user?.nombre_completo || user?.full_name || user?.name || user?.nombre || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Usuario',
      email: user?.email || email, // Usar el email del request como fallback
      telefono: user?.telefono || user?.phone || '',
      rol: user?.rol || user?.role || 'member',
      is_admin: (user?.is_admin === true) || (user?.admin === true) || ((user?.rol || user?.role) === 'admin')
    };

    console.log('👤 UserData final enviado al frontend:', JSON.stringify(userData, null, 2));

    // VALIDACIÓN DE ROL: Solo permitir acceso a usuarios con rol 'member'
    const userRole = (userData.rol || '').toString().toLowerCase();
    // Aceptamos 'member' y también 'cliente' por compatibilidad, pero rechazamos 'admin'
    if (userRole !== 'member' && userRole !== 'cliente') {
      logger.warn('Intento de login rechazado: Usuario no es member/cliente', { email, role: userRole });
      return res.status(403).json({ 
        message: 'Acceso restringido. Esta sección es exclusiva para clientes/miembros.' 
      });
    }

    // Registrar el evento de inicio de sesión exitoso
    logger.info('Usuario inició sesión', {
      userId: userData.id,
      email: userData.email,
      ip: req.ip
    });

    // Responder con los datos del usuario y el token
    res.json({
      message: 'Inicio de sesión exitoso',
      token: authToken,
      refreshToken: authToken, // Xano maneja tokens de forma diferente
      usuario: userData
    });

  } catch (error) {
    /*
    // Fallback de desarrollo: permitir inicio de sesión sin Xano
    if ((process.env.NODE_ENV || 'development') === 'development') {
      const adminEmails = [process.env.XANO_ADMIN_EMAIL, process.env.ADMIN_EMAIL].filter(Boolean).map(e => e.toLowerCase());
      const emailLower = (email || '').toLowerCase();
      const isDevAdmin = adminEmails.includes(emailLower) || emailLower.includes('admin');
      const devUser = {
        id: Date.now(),
        nombre: isDevAdmin ? 'Administrador Desarrollo' : 'Usuario Desarrollo',
        email,
        rol: isDevAdmin ? 'admin' : 'cliente',
        is_admin: isDevAdmin
      };
      logger.warn('Usando fallback de desarrollo para login', { email, ip: req.ip });
      return res.json({
        message: 'Inicio de sesión (modo desarrollo)',
        token: 'dev_token',
        refreshToken: 'dev_token',
        usuario: devUser,
      });
    }
    */

    // Manejar errores específicos de Xano (producción)
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new UnauthorizedError('Credenciales inválidas. Verifica tu email y contraseña');
    }
    
    if (error.response?.status === 404) {
      throw new UnauthorizedError('Usuario no encontrado. Verifica tu email o regístrate');
    }

    if (error.response?.status === 400) {
      throw new ValidationError('Datos de inicio de sesión inválidos');
    }

    // Registrar error para debugging
    logger.error('Error en inicio de sesión', {
      email,
      error: error.message,
      ip: req.ip
    });

    throw new UnauthorizedError('Error durante el inicio de sesión. Intenta nuevamente');
  }
}));

/**
 * POST /logout - Endpoint para cerrar sesión
 * Actualmente solo registra el evento, pero podría implementar invalidación de tokens
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // En una implementación más avanzada, aquí se podría agregar el token
  // a una lista negra en Redis o base de datos para invalidarlo

  // Registrar el evento de cierre de sesión
  logger.info('Usuario cerró sesión', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    message: 'Sesión cerrada exitosamente'
  });
}));

/**
 * POST /refresh-token - Endpoint para renovar un token JWT
 * Permite obtener un nuevo token válido usando un token existente (incluso expirado)
 */
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Token requerido para renovación');
  }

  try {
    // Verificar token actual (permitiendo tokens expirados para renovación)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Verificar que el usuario aún existe y está activo en la base de datos
    const resultado = await query(
      'SELECT id, nombre, correo, rol, activo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (resultado.rows.length === 0 || !resultado.rows[0].activo) {
      throw new UnauthorizedError('Usuario no válido para renovación de token');
    }

    const usuario = resultado.rows[0];
    
    // Generar un nuevo token JWT
    const nuevoToken = generarToken(usuario);

    // Registrar el evento de renovación de token
    logger.info('Token renovado', {
      userId: usuario.id,
      correo: usuario.correo,
      ip: req.ip
    });

    res.json({
      message: 'Token renovado exitosamente',
      token: nuevoToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    // Manejar errores específicos de JWT
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Token inválido para renovación');
    }
    throw error;
  }
}));

/**
 * GET /verify-token - Endpoint para verificar la validez de un token JWT
 * Comprueba si el token es válido y si el usuario asociado aún existe y está activo
 */
router.get('/verify-token', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Verificar que se proporcione el header de autorización
  if (!authHeader) {
    return res.status(401).json({
      valid: false,
      message: 'Token no proporcionado'
    });
  }

  // Extraer el token del header Authorization (formato: "Bearer <token>")
  const token = authHeader.split(' ')[1];
  
  try {
    // Verificar y decodificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario aún existe y está activo en la base de datos
    const resultado = await query(
      'SELECT id, activo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (resultado.rows.length === 0 || !resultado.rows[0].activo) {
      return res.status(401).json({
        valid: false,
        message: 'Usuario no válido'
      });
    }

    // Responder con información de validez del token
    res.json({
      valid: true,
      message: 'Token válido',
      expiresAt: new Date(decoded.exp * 1000) // Convertir timestamp a fecha
    });

  } catch (error) {
    // Manejar diferentes tipos de errores de JWT
    res.status(401).json({
      valid: false,
      message: error.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido'
    });
  }
}));

/**
 * POST /forgot-password - Endpoint para solicitar recuperación de contraseña
 * Genera un token de recuperación y envía un email al usuario
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  // Validar datos de entrada
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email } = value;

  try {
    // Verificar si el usuario existe en Xano
    const usuario = await xanoService.getUserByEmail(email);
    
    if (!usuario) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({
        message: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación'
      });
    }

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Guardar el token en Xano (necesitaremos agregar este método)
    await xanoService.savePasswordResetToken(usuario.id, resetToken, resetTokenExpiry);

    // Crear enlace de recuperación
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password/${resetToken}`;

    // Enviar email de recuperación
    await emailService.enviarCorreo({
      destinatario: email,
      asunto: 'Recuperación de contraseña - Comercial HG',
      contenido: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Recuperación de contraseña</h2>
          <p>Hola,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Restablecer contraseña
          </a>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p>Saludos,<br>Equipo de Comercial HG</p>
        </div>
      `,
      esHTML: true
    });

    logger.info('Solicitud de recuperación de contraseña enviada', {
      email,
      ip: req.ip
    });

    res.json({
      message: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación'
    });

  } catch (error) {
    logger.error('Error en solicitud de recuperación de contraseña', {
      email,
      error: error.message,
      ip: req.ip
    });

    res.json({
      message: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación'
    });
  }
}));

/**
 * POST /reset-password - Endpoint para restablecer la contraseña
 * Valida el token y actualiza la contraseña del usuario
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  // Validar datos de entrada
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { token, password } = value;

  try {
    // Verificar el token en Xano
    const tokenData = await xanoService.verifyPasswordResetToken(token);
    
    if (!tokenData || new Date() > new Date(tokenData.expires_at)) {
      throw new UnauthorizedError('Token inválido o expirado');
    }

    // Actualizar la contraseña del usuario
    await xanoService.updatePassword(tokenData.user_id, password);

    // Eliminar el token usado
    await xanoService.deletePasswordResetToken(token);

    logger.info('Contraseña restablecida exitosamente', {
      userId: tokenData.user_id,
      ip: req.ip
    });

    res.json({
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    logger.error('Error al restablecer contraseña', {
      token,
      error: error.message,
      ip: req.ip
    });

    throw new Error('Error interno del servidor al restablecer la contraseña');
  }
}));

// Exportar el router para uso en el servidor principal
router.post('/admin/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw new ValidationError('Correo y contraseña son obligatorios');
  }

  // 1. Intentar login con Xano primero
  try {
    const response = await xanoService.login({ email, password });
    
    // Verificar si es admin
    const user = response.user || response;
    const token = response.authToken || response.token || response.access_token;
    
    logger.info('Respuesta Login Xano', { 
      hasToken: !!token, 
      userId: user?.id, 
      userRole: user?.rol || user?.role || user?.role_id,
      keys: Object.keys(user || {})
    });

    const isAdmin = (user.rol && user.rol.toLowerCase().includes('admin')) || 
                    (user.role && user.role.toLowerCase().includes('admin')) ||
                    user.is_admin === true || 
                    user.isAdmin === true;

    if (isAdmin) {
       logger.info('Administrador inició sesión vía Xano', { userId: user.id, email: user.email, ip: req.ip });
       
       return res.json({
        message: 'Inicio de sesión de administrador exitoso',
        token: token,
        refreshToken: token,
        usuario: {
          ...user,
          is_admin: true // Asegurar flag para frontend
        }
      });
    } else {
      logger.warn('Usuario autenticado en Xano pero no es administrador', { email, role: user.role || user.rol });
      return res.status(403).json({ message: 'No tienes permisos de administrador' });
    }
  } catch (e) {
    // Si falla Xano (401 invalid credentials, o error de red)
    logger.warn('Login admin Xano falló', { error: e.message });
    throw new UnauthorizedError('Credenciales inválidas o no tienes permisos de administrador');
  }
}));

// Generar token de prueba (SOLO DESARROLLO)
router.get('/test-token', (req, res) => {
  const token = generarToken({
    id: 999,
    correo: 'test@example.com',
    rol: 'cliente'
  });
  res.json({ token });
});

module.exports = router;
