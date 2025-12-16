// RUTAS DE GENERACIÓN DE MODELOS 3D
// Esta API recibe especificaciones y devuelve un modelo 3D.
// Si hay un proveedor externo configurado (por ejemplo Replicate con un
// modelo text-to-3d), devuelve una URL GLTF; en caso contrario, genera
// un modelo paramétrico estructurado para el visor interno.

const express = require('express');
const router = express.Router();

const Joi = require('joi');
const { asyncHandler } = require('../middleware/errorHandler');
const { createLogger } = require('../middleware/logger');
const { verificarToken } = require('../middleware/auth');
const iaService = require('../services/iaService');
const threeDService = require('../services/threeDService');

const logger = createLogger('modelos');

// Validación de entrada
const generarModeloSchema = Joi.object({
  tipoEspacio: Joi.string().valid('cocina', 'closet', 'mueble').required(),
  medidas: Joi.object({
    largo: Joi.number().positive().required(),
    ancho: Joi.number().positive().required(),
    alto: Joi.number().positive().required(),
    unidad: Joi.string().valid('cm', 'mm', 'm').default('cm')
  }).required(),
  material: Joi.string().required(),
  color: Joi.string().required(),
  estilo: Joi.string().default('Moderno'),
  especificaciones: Joi.object({
    puertas: Joi.number().integer().min(0).default(0),
    cajones: Joi.number().integer().min(0).default(0),
    bisagra: Joi.string().allow('', null),
    corredera: Joi.string().allow('', null),
    acabado: Joi.string().allow('', null)
  }).default({}),
  presupuesto_maximo: Joi.number().integer().min(0).optional(),
  descripcion: Joi.string().allow('').optional()
});

// POST /api/modelos/generar - Generar modelo 3D desde especificaciones
router.post('/generar', verificarToken, asyncHandler(async (req, res) => {
  const { error, value } = generarModeloSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  const {
    tipoEspacio,
    medidas,
    material,
    color,
    estilo,
    especificaciones,
    presupuesto_maximo,
    descripcion
  } = value;

  logger.info('Solicitud de generación de modelo 3D', {
    userId: req.usuario?.id || 'unknown',
    tipoEspacio,
    medidas,
    especificaciones
  });

  // Construir parámetros compatibles con iaService
  const params = {
    medidas,
    material,
    color,
    estilo,
    tipo_mueble: tipoEspacio,
    presupuesto_estimado: presupuesto_maximo,
    descripcion_adicional: descripcion,
    especificaciones
  };

  // Intentar proveedor externo de 3D si está habilitado
  let externo = null;
  try {
    externo = await threeDService.generarModelo3DExterno(params);
  } catch (e) {
    logger.warn('Proveedor 3D externo falló, se usa modelo paramétrico', { error: e.message });
  }

  if (externo && externo.tipo === 'gltf_url') {
    return res.json({
      success: true,
      modelo_3d: externo,
      provider: 'externo'
    });
  }

  // Fallback paramétrico válido para nuestro visor
  const modeloParametrico = iaService.generarModelo3D(params);
  return res.json({
    success: true,
    modelo_3d: modeloParametrico,
    provider: 'parametrico'
  });
}));

module.exports = router;
