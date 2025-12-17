const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verificarToken, verificarAdmin } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { createLogger } = require('../middleware/logger');
const xanoService = require('../services/xanoService');
const { membersDel, authDel } = require('../config/database');

const logger = createLogger('usuarios');

// Configuración de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.usuario.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Solo se permiten archivos de imagen'), false);
    }
    cb(null, true);
  }
});

// Configuración de Multer para Firmas
const storageFirma = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/firmas');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `firma-${req.usuario.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadFirma = multer({
  storage: storageFirma,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Solo se permiten archivos de imagen (jpg, jpeg, png)'), false);
    }
    cb(null, true);
  }
});

// GET /perfil
router.get('/perfil', verificarToken, asyncHandler(async (req, res) => {
  const token = req.usuario.token;
  try {
      const usuario = await xanoService.me(token);
      res.json({
          message: 'Perfil obtenido exitosamente',
          usuario: usuario
      });
  } catch (error) {
      if (req.usuario) {
          res.json({
              message: 'Perfil obtenido (fallback)',
              usuario: req.usuario
          });
      } else {
          throw error;
      }
  }
}));

// PUT /perfil
router.put('/perfil', verificarToken, asyncHandler(async (req, res) => {
  const token = req.usuario.token;
  const { nombre, telefono, direccion } = req.body;
  const updateData = {};
  
  if (nombre) {
    updateData.name = nombre;
    updateData.nombre = nombre;
  }
  if (telefono) {
    updateData.n_telefono = telefono;
    updateData.telefono = telefono;
  }
  if (direccion) updateData.direccion = direccion;
  
  const usuario = await xanoService.updateUser(req.usuario.id, updateData, token);
  res.json({
      message: 'Perfil actualizado exitosamente',
      usuario: usuario
  });
}));

// POST /avatar
router.post('/avatar', verificarToken, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('No se ha subido ningún archivo');
  
  const protocol = req.protocol;
  const host = req.get('host');
  const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;
  
  const token = req.usuario.token;
  
  // Actualizar en Xano
  await xanoService.updateUser(req.usuario.id, { avatar_url: avatarUrl, avatar: { url: avatarUrl } }, token);
  
  res.json({
      message: 'Avatar actualizado exitosamente',
      avatar_url: avatarUrl
  });
}));

// POST /firma
router.post('/firma', verificarToken, uploadFirma.single('firma'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('No se ha subido ningún archivo');
  
  const protocol = req.protocol;
  const host = req.get('host');
  const firmaUrl = `${protocol}://${host}/uploads/firmas/${req.file.filename}`;
  
  const token = req.usuario.token;
  
  // Actualizar en Xano
  await xanoService.updateUser(req.usuario.id, { firma_url: firmaUrl, firma: { url: firmaUrl } }, token);
  
  res.json({
      message: 'Firma actualizada exitosamente',
      firma_url: firmaUrl
  });
}));

// GET /exportar-datos
router.get('/exportar-datos', verificarToken, asyncHandler(async (req, res) => {
    const token = req.usuario.token;
    const usuario = await xanoService.me(token);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=mis-datos.json');
    res.send(JSON.stringify(usuario, null, 2));
}));

// DELETE /eliminar-cuenta
router.delete('/eliminar-cuenta', verificarToken, asyncHandler(async (req, res) => {
    const token = req.usuario.token;
    
    try {
        await authDel(`/user/${req.usuario.id}`, token);
    } catch (e) {
        try {
            await membersDel(`/user/${req.usuario.id}`, token);
        } catch (e2) {
             try {
                await membersDel(`/usuario/${req.usuario.id}`, token);
             } catch (e3) {
                 logger.error('Error al eliminar cuenta', { error: e3.message });
                 throw new Error('No se pudo eliminar la cuenta');
             }
        }
    }
    
    res.json({ message: 'Cuenta eliminada exitosamente' });
}));

module.exports = router;
