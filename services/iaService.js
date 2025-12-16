/**
 * SERVICIO DE INTELIGENCIA ARTIFICIAL
 * 
 * Este servicio maneja la generación de recomendaciones personalizadas de muebles
 * utilizando diferentes proveedores de IA (Hugging Face, Replicate, OpenAI) o
 * algoritmos simulados cuando no hay APIs externas disponibles.
 * 
 * Funcionalidades principales:
 * - Generación de recomendaciones basadas en parámetros del usuario
 * - Integración con múltiples proveedores de IA
 * - Sistema de fallback con recomendaciones simuladas
 * - Cálculo de estimaciones de precio, tiempo y características técnicas
 * - Generación de contenido descriptivo y visual
 */

const axios = require('axios');                    // Cliente HTTP para APIs externas
const { createLogger } = require('../middleware/logger'); // Sistema de logging

const logger = createLogger('iaService');

class IAService {
  /**
   * Constructor del servicio de IA
   * Inicializa la configuración de proveedores y datos de referencia
   */
  constructor() {
    // Configuración de API externa desde variables de entorno
    this.apiKey = process.env.IA_API_KEY;           // Clave de API para servicios externos
    this.apiUrl = process.env.IA_API_URL;           // URL base del proveedor de IA
    this.model = process.env.IA_MODEL || 'gpt-3.5-turbo'; // Modelo de OpenAI configurable
    this.isExternalAPIEnabled = !!(this.apiKey && this.apiUrl); // Flag de disponibilidad de API externa
    
    // Configuración para diferentes proveedores de IA
    this.providers = {
      // Configuración para Hugging Face (modelos de lenguaje gratuitos)
      huggingface: {
        baseUrl: 'https://api-inference.huggingface.co/models',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      // Configuración para Replicate (modelos especializados)
      replicate: {
        baseUrl: 'https://api.replicate.com/v1',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      // Configuración para OpenAI (GPT y modelos premium)
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    };

    // ========================================================================
    // DATOS DE REFERENCIA PARA RECOMENDACIONES SIMULADAS
    // ========================================================================

    // Tipos de muebles disponibles para recomendaciones
    this.tiposMuebles = [
      'Mesa de comedor', 'Silla', 'Sofá', 'Cama', 'Escritorio', 'Estantería',
      'Mesa de centro', 'Armario', 'Cómoda', 'Sillón', 'Mesa auxiliar', 'Banco'
    ];

    // Estilos de diseño soportados
    this.estilosDisponibles = [
      'Moderno', 'Clásico', 'Industrial', 'Rústico', 'Minimalista', 
      'Escandinavo', 'Vintage', 'Contemporáneo', 'Art Deco', 'Bohemio'
    ];

    // Materiales comunes para fabricación
    this.materialesComunes = [
      'Madera de roble', 'Madera de pino', 'MDF', 'Metal', 'Vidrio',
      'Cuero', 'Tela', 'Mármol', 'Acero inoxidable', 'Bambú'
    ];

    // Paleta de colores populares
    this.coloresPopulares = [
      'Blanco', 'Negro', 'Marrón', 'Gris', 'Beige', 'Azul marino',
      'Verde oliva', 'Rojo burdeos', 'Amarillo mostaza', 'Rosa pálido'
    ];
  }

  // ============================================================================
  // MÉTODOS PRINCIPALES DE GENERACIÓN DE RECOMENDACIONES
  // ============================================================================

  /**
   * Método principal para generar recomendaciones de muebles personalizados
   * Intenta usar APIs externas de IA y recurre a algoritmos simulados como fallback
   * @param {Object} parametros - Parámetros de especificación del mueble
   * @param {Object} parametros.medidas - Dimensiones (largo, ancho, alto, unidad)
   * @param {string} parametros.material - Material principal deseado
   * @param {string} parametros.color - Color principal
   * @param {string} parametros.estilo - Estilo de diseño
   * @param {string} parametros.tipo_mueble - Tipo específico de mueble
   * @param {number} parametros.presupuesto_estimado - Presupuesto aproximado
   * @param {string} parametros.descripcion_adicional - Requisitos especiales
   * @returns {Object} Recomendación completa con especificaciones técnicas y estimaciones
   */
  async generarRecomendacion(parametros) {
    try {
      logger.info('Generando recomendación de IA', {
        material: parametros.material,
        color: parametros.color,
        estilo: parametros.estilo,
        tipoMueble: parametros.tipo_mueble
      });

      // Si hay API externa configurada, intentar usarla
      if (this.isExternalAPIEnabled) {
        try {
          const recomendacionExterna = await this.generarRecomendacionExterna(parametros);
          if (recomendacionExterna) {
            return recomendacionExterna;
          }
        } catch (error) {
          logger.warn('Error con API externa, usando recomendación simulada', {
            error: error.message
          });
        }
      }

      // Generar recomendación simulada
      return this.generarRecomendacionSimulada(parametros);

    } catch (error) {
      logger.error('Error al generar recomendación', {
        error: error.message,
        parametros
      });
      throw new Error('Error al generar la recomendación de IA');
    }
  }

  /**
   * Genera recomendación utilizando APIs externas de IA
   * Detecta automáticamente el proveedor basado en la URL configurada
   * @param {Object} parametros - Parámetros de especificación del mueble
   * @returns {Object} Recomendación generada por IA externa
   * @throws {Error} Si el proveedor no es soportado o hay errores de API
   */
  async generarRecomendacionExterna(parametros) {
    try {
      const prompt = this.construirPrompt(parametros);
      
      // Ejemplo para Hugging Face
      if (this.apiUrl.includes('huggingface')) {
        return await this.generarConHuggingFace(prompt, parametros);
      }
      
      // Ejemplo para Replicate
      if (this.apiUrl.includes('replicate')) {
        return await this.generarConReplicate(prompt, parametros);
      }
      
      // Ejemplo para OpenAI
      if (this.apiUrl.includes('openai')) {
        return await this.generarConOpenAI(prompt, parametros);
      }

      throw new Error('Proveedor de IA no soportado');

    } catch (error) {
      logger.error('Error en API externa de IA', {
        error: error.message,
        provider: this.detectarProveedor()
      });
      throw error;
    }
  }

  /**
   * Construye el prompt para la IA basado en los parámetros
   * @param {Object} parametros - Parámetros del mueble
   * @returns {string} Prompt construido
   */
  construirPrompt(parametros) {
    const { medidas, material, color, estilo, tipo_mueble, presupuesto_estimado, descripcion_adicional } = parametros;
    
    let prompt = `Diseña un mueble personalizado con las siguientes especificaciones:
    
Tipo: ${tipo_mueble || 'Mueble personalizado'}
Dimensiones: ${medidas.largo}x${medidas.ancho}x${medidas.alto} ${medidas.unidad}
Material: ${material}
Color: ${color}
Estilo: ${estilo}`;

    if (presupuesto_estimado) {
      prompt += `\nPresupuesto estimado: $${presupuesto_estimado}`;
    }

    if (descripcion_adicional) {
      prompt += `\nDescripción adicional: ${descripcion_adicional}`;
    }

    prompt += `\n\nProporciona una recomendación detallada que incluya:
1. Descripción del diseño
2. Características técnicas
3. Proceso de fabricación sugerido
4. Estimación de tiempo de producción
5. Recomendaciones de acabado`;

    return prompt;
  }

  /**
   * Genera recomendación usando Hugging Face
   * @param {string} prompt - Prompt para la IA
   * @param {Object} parametros - Parámetros originales
   * @returns {Object} Recomendación generada
   */
  async generarConHuggingFace(prompt, parametros) {
    const response = await axios.post(
      `${this.providers.huggingface.baseUrl}/microsoft/DialoGPT-large`,
      {
        inputs: prompt,
        parameters: {
          max_length: 500,
          temperature: 0.7,
          do_sample: true
        }
      },
      { headers: this.providers.huggingface.headers }
    );

    return this.procesarRespuestaIA(response.data, parametros);
  }

  /**
   * Genera recomendación usando Replicate
   * @param {string} prompt - Prompt para la IA
   * @param {Object} parametros - Parámetros originales
   * @returns {Object} Recomendación generada
   */
  async generarConReplicate(prompt, parametros) {
    const response = await axios.post(
      `${this.providers.replicate.baseUrl}/predictions`,
      {
        version: "modelo-version-id",
        input: {
          prompt: prompt,
          max_tokens: 500,
          temperature: 0.7
        }
      },
      { headers: this.providers.replicate.headers }
    );

    return this.procesarRespuestaIA(response.data, parametros);
  }

  /**
   * Genera recomendación usando OpenAI
   * @param {string} prompt - Prompt para la IA
   * @param {Object} parametros - Parámetros originales
   * @returns {Object} Recomendación generada
   */
  async generarConOpenAI(prompt, parametros) {
    const response = await axios.post(
      `${this.providers.openai.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [
          {
            role: "system",
            content: "Eres un experto en diseño de muebles a medida. Devuelve SIEMPRE un JSON OBJETO estricto (sin texto adicional) con: texto, productos_sugeridos[], estimacion_precio{minimo,maximo,promedio}, tiempo_estimado{dias_minimo,dias_maximo,dias_promedio}, modelo_3d{tipo:'box'|'kitchen_set'|'component_set', dimensiones_cm{largo_cm,ancho_cm,alto_cm}, color_hex, material, modules[]|components[]}, instrucciones_3d[].\nReglas: todas las dimensiones en centímetros; modules/components deben incluir ancho_cm, alto_cm, fondo_cm, posicion_cm{x,y,z}, material, color_hex. Para cocina usa tipo=kitchen_set y modules (base/superior). Para muebles genéricos usa tipo=component_set y components. Si es simple, usa tipo=box con dimensiones_cm."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      },
      { headers: this.providers.openai.headers }
    );

    const content = response?.data?.choices?.[0]?.message?.content || '';
    return this.procesarRespuestaIA(content, parametros);
  }

  /**
   * Genera recomendación simulada cuando no hay API externa
   * @param {Object} parametros - Parámetros para la recomendación
   * @returns {Object} Recomendación simulada
   */
  generarRecomendacionSimulada(parametros) {
    const { medidas, material, color, estilo, tipo_mueble, presupuesto_estimado } = parametros;
    // Guardar parámetros actuales para cálculos posteriores (precio/tiempo)
    this._currentParams = parametros;
    
    // Generar recomendación basada en reglas
    const tipoRecomendado = tipo_mueble || this.seleccionarTipoOptimo(medidas);
    const materialesCompatibles = this.obtenerMaterialesCompatibles(material, estilo);
    const coloresComplementarios = this.obtenerColoresComplementarios(color);
    
    // Calcular estimaciones
    const volumen = medidas.largo * medidas.ancho * medidas.alto;
    const complejidad = this.calcularComplejidad(parametros);
    const tiempoEstimado = this.calcularTiempoProduccion(volumen, complejidad);
    const precioEstimado = this.calcularPrecioEstimado(volumen, material, complejidad);

    const recomendacion = {
      texto: this.generarTextoRecomendacion(parametros, tipoRecomendado, materialesCompatibles),
      imagen_url: this.generarURLImagenSimulada(parametros),
      productos_sugeridos: this.obtenerProductosSimilares(parametros),
      modelo_3d: this.generarModelo3D(parametros),
      estimacion_precio: {
        minimo: Math.round(precioEstimado * 0.8),
        maximo: Math.round(precioEstimado * 1.2),
        promedio: precioEstimado
      },
      tiempo_estimado: {
        dias_minimo: Math.round(tiempoEstimado * 0.8),
        dias_maximo: Math.round(tiempoEstimado * 1.3),
        dias_promedio: tiempoEstimado
      },
      caracteristicas_tecnicas: {
        volumen_m3: (volumen / 1000000).toFixed(3),
        peso_estimado_kg: this.calcularPesoEstimado(volumen, material),
        nivel_complejidad: complejidad,
        materiales_recomendados: materialesCompatibles,
        colores_complementarios: coloresComplementarios
      },
      proceso_fabricacion: this.generarProcesoFabricacion(parametros),
      recomendaciones_adicionales: this.generarRecomendacionesAdicionales(parametros)
    };

    logger.info('Recomendación simulada generada exitosamente', {
      tipo: tipoRecomendado,
      precio: precioEstimado,
      tiempo: tiempoEstimado
    });

    return recomendacion;
  }

  /**
   * Procesa la respuesta de la IA externa y la estructura
   * @param {string|Object} respuestaIA - Respuesta de la API de IA
   * @param {Object} parametros - Parámetros originales
   * @returns {Object} Recomendación estructurada
   */
  procesarRespuestaIA(respuestaIA, parametros) {
    let textoRecomendacion;
    let iaJson = null;

    if (typeof respuestaIA === 'string') {
      // Intentar parsear JSON si parece un objeto
      const trimmed = respuestaIA.trim();
      if (trimmed.startsWith('{')) {
        try {
          iaJson = JSON.parse(trimmed);
        } catch {}
      }
      textoRecomendacion = iaJson?.texto || trimmed;
    } else if (respuestaIA && respuestaIA.generated_text) {
      textoRecomendacion = respuestaIA.generated_text;
    } else if (typeof respuestaIA === 'object') {
      iaJson = respuestaIA;
      textoRecomendacion = iaJson.texto || JSON.stringify(respuestaIA);
    } else {
      textoRecomendacion = 'Recomendación generada.';
    }

    // Base calculada local (fallback y métricas)
    const recomendacionBase = this.generarRecomendacionSimulada(parametros);

    // Incorporar datos de IA si existen
    const productos = iaJson?.productos_sugeridos || recomendacionBase.productos_sugeridos;
    const estimacion_precio = iaJson?.estimacion_precio || recomendacionBase.estimacion_precio;
    const tiempo_estimado = iaJson?.tiempo_estimado || recomendacionBase.tiempo_estimado;
    const modelo_3d = iaJson?.modelo_3d || recomendacionBase.modelo_3d;
    const instrucciones_3d = iaJson?.instrucciones_3d || [];

    return {
      ...recomendacionBase,
      texto: textoRecomendacion,
      productos_sugeridos: productos,
      estimacion_precio,
      tiempo_estimado,
      modelo_3d,
      instrucciones_3d,
      fuente: 'ia_externa'
    };
  }

  // Métodos auxiliares para la generación simulada

  seleccionarTipoOptimo(medidas) {
    const volumen = medidas.largo * medidas.ancho * medidas.alto;
    
    if (medidas.alto < 50) return 'Mesa';
    if (medidas.alto > 180) return 'Estantería';
    if (volumen > 500000) return 'Armario';
    if (medidas.largo > medidas.ancho * 2) return 'Banco';
    
    return this.tiposMuebles[Math.floor(Math.random() * this.tiposMuebles.length)];
  }

  obtenerMaterialesCompatibles(materialPrincipal, estilo) {
    const compatibilidades = {
      'madera': ['MDF', 'Contrachapado', 'Madera maciza'],
      'metal': ['Acero', 'Aluminio', 'Hierro forjado'],
      'vidrio': ['Vidrio templado', 'Cristal', 'Acrílico']
    };

    const materialCheck = Array.isArray(materialPrincipal) ? materialPrincipal[0] : materialPrincipal;
    const materialBase = (materialCheck || '').toLowerCase();
    
    for (const [categoria, materiales] of Object.entries(compatibilidades)) {
      if (materialBase.includes(categoria)) {
        return materiales;
      }
    }

    return this.materialesComunes.slice(0, 3);
  }

  obtenerColoresComplementarios(colorPrincipal) {
    const complementarios = {
      'blanco': ['Gris claro', 'Beige', 'Azul pastel'],
      'negro': ['Blanco', 'Gris', 'Dorado'],
      'marrón': ['Crema', 'Verde oliva', 'Naranja quemado'],
      'gris': ['Blanco', 'Azul', 'Amarillo'],
      'azul': ['Blanco', 'Gris', 'Naranja']
    };

    const colorCheck = Array.isArray(colorPrincipal) ? colorPrincipal[0] : colorPrincipal;
    const colorBase = (colorCheck || '').toLowerCase();
    
    for (const [color, complementos] of Object.entries(complementarios)) {
      if (colorBase.includes(color)) {
        return complementos;
      }
    }

    return this.coloresPopulares.slice(0, 3);
  }

  calcularComplejidad(parametros) {
    let complejidad = 1;
    
    if (parametros.preferencias_especiales?.length > 0) complejidad += 0.5;
    if (parametros.descripcion_adicional?.length > 100) complejidad += 0.3;
    if (parametros.estilo === 'Art Deco' || parametros.estilo === 'Vintage') complejidad += 0.4;
    // Ajustes por puertas/cajones/herrajes/acabado solicitados
    const espec = parametros.especificaciones || {};
    const puertas = Number(espec.puertas || 0);
    const cajones = Number(espec.cajones || 0);
    if (puertas > 0) complejidad += Math.min(0.6, puertas * 0.1);
    if (cajones > 0) complejidad += Math.min(0.8, cajones * 0.15);
    const bis = (espec.bisagra || '').toLowerCase();
    const corr = (espec.corredera || '').toLowerCase();
    const acab = (espec.acabado || '').toLowerCase();
    if (bis === 'cierre_suave' || bis === 'oculta') complejidad += 0.2;
    if (corr === 'telescopica' || corr === 'cierre_suave') complejidad += 0.2;
    if (acab === 'brillante' || acab === 'texturizado') complejidad += 0.15;
    
    return Math.min(complejidad, 3);
  }

  calcularTiempoProduccion(volumen, complejidad) {
    const tiempoBase = Math.ceil(volumen / 100000) + 5; // Días base según volumen
    return Math.round(tiempoBase * complejidad);
  }

  calcularPrecioEstimado(volumen, material, complejidad) {
    const precioBasePorM3 = {
      'madera': 800,
      'metal': 1200,
      'vidrio': 600,
      'cuero': 1500
    };

    let precioBase = 500; // Precio mínimo
    const materialCheck = Array.isArray(material) ? material[0] : material;
    const materialBase = (materialCheck || '').toLowerCase();

    const materialKey = Object.keys(precioBasePorM3).find(key => 
      materialBase.includes(key)
    );

    if (materialKey) {
      precioBase = precioBasePorM3[materialKey];
    }

    const volumenM3 = volumen / 1000000;
    let precio = precioBase * volumenM3 * complejidad;

    // Incrementos según especificaciones actuales
    const espec = this._currentParams?.especificaciones || {};
    const puertas = Number(espec.puertas || 0);
    const cajones = Number(espec.cajones || 0);
    const bis = (espec.bisagra || '').toLowerCase();
    const corr = (espec.corredera || '').toLowerCase();
    const acab = (espec.acabado || '').toLowerCase();

    const costeBisagra = bis === 'cierre_suave' ? 25 : (bis === 'oculta' ? 18 : 12);
    const costeCorredera = corr === 'telescopica' ? 30 : (corr === 'cierre_suave' ? 26 : 14);
    const factorAcabado = acab === 'brillante' ? 1.12 : (acab === 'texturizado' ? 1.08 : 1.0);

    precio += puertas * costeBisagra * 2; // dos bisagras por puerta
    precio += cajones * costeCorredera * 2; // par de correderas por cajón
    precio = precio * factorAcabado;

    const presupuestoMax = this._currentParams?.presupuesto_maximo || null;
    if (presupuestoMax && precio > presupuestoMax) {
      precio = Math.max(presupuestoMax * 0.95, presupuestoMax - 500);
    }

    return Math.round(precio);
  }

  calcularPesoEstimado(volumen, material) {
    const densidades = {
      'madera': 0.6,
      'metal': 7.8,
      'vidrio': 2.5,
      'plastico': 0.9
    };

    const materialCheck = Array.isArray(material) ? material[0] : material;
    const materialBase = (materialCheck || '').toLowerCase();

    const materialKey = Object.keys(densidades).find(key => 
      materialBase.includes(key)
    );

    const densidad = materialKey ? densidades[materialKey] : 0.8;
    const volumenM3 = volumen / 1000000;
    
    return Math.round(volumenM3 * densidad * 1000); // kg
  }

  generarTextoRecomendacion(parametros, tipoRecomendado, materialesCompatibles) {
    const { medidas, material, color, estilo } = parametros;
    
    const materialStr = Array.isArray(material) ? material.join(', ') : material;
    const colorStr = Array.isArray(color) ? color.join(', ').toLowerCase() : color.toLowerCase();

    return `Recomendación para ${tipoRecomendado} personalizado:

Basándome en las especificaciones proporcionadas (${medidas.largo}x${medidas.ancho}x${medidas.alto} ${medidas.unidad}), recomiendo un diseño ${estilo.toLowerCase()} que combine funcionalidad y estética.

CARACTERÍSTICAS PRINCIPALES:
• Material principal: ${materialStr} con acabado en ${colorStr}
• Estilo: ${estilo} con líneas limpias y proporciones equilibradas
• Dimensiones optimizadas para el espacio disponible

RECOMENDACIONES DE DISEÑO:
• Utilizar ${materialesCompatibles[0]} como material complementario
• Incorporar elementos de ${materialesCompatibles[1]} para mayor durabilidad
• Acabado mate/satinado para resaltar la textura natural

CONSIDERACIONES TÉCNICAS:
• Estructura reforzada en puntos de mayor estrés
• Tratamiento anti-humedad y protección UV
• Herrajes de alta calidad para mayor durabilidad

Este diseño combina la elegancia del estilo ${estilo} con la practicidad moderna, resultando en una pieza única que se adaptará perfectamente a sus necesidades.`;
  }

  generarURLImagenSimulada(parametros) {
    // En un entorno real, aquí se generaría una imagen con IA
    const { tipo_mueble, estilo, color } = parametros;
    const baseUrl = 'https://via.placeholder.com/400x300';
    
    const colorCheck = Array.isArray(color) ? color[0] : color;
    const colorHex = this.colorAHex(colorCheck);
    
    return `${baseUrl}/${colorHex}/FFFFFF?text=${encodeURIComponent(tipo_mueble || 'Mueble')}+${encodeURIComponent(estilo)}`;
  }

  colorAHex(nombreColor) {
    const colores = {
      'blanco': 'FFFFFF',
      'negro': '000000',
      'gris': '808080',
      'marrón': '8B4513',
      'azul': '0000FF',
      'verde': '008000',
      'rojo': 'FF0000',
      'amarillo': 'FFFF00'
    };

    const colorCheck = Array.isArray(nombreColor) ? nombreColor[0] : nombreColor;
    const colorBase = (colorCheck || '').toLowerCase();

    const colorKey = Object.keys(colores).find(key => 
      colorBase.includes(key)
    );

    return colorKey ? colores[colorKey] : '808080';
  }

  generarModelo3D(parametros) {
    const { medidas, material, color, tipo_mueble } = parametros;
    const colorCheck = Array.isArray(color) ? color[0] : color;
    const colorHex = `#${this.colorAHex(colorCheck)}`;
    const dimensionFactor = medidas.unidad === 'm' ? 100 : (medidas.unidad === 'mm' ? 0.1 : 1);

    const materialCheck = Array.isArray(material) ? material[0] : material;

    const dimsCm = {
      largo_cm: Math.max(1, Math.round(medidas.largo * dimensionFactor)),
      ancho_cm: Math.max(1, Math.round(medidas.ancho * dimensionFactor)),
      alto_cm: Math.max(1, Math.round(medidas.alto * dimensionFactor))
    };

    const tipoLower = (tipo_mueble || '').toLowerCase();
    const esCocina = tipoLower.includes('cocina');
    const esCloset = tipoLower.includes('closet') || tipoLower.includes('armario');

    if (esCocina) {
      // Generación paramétrica de módulos de cocina (base y superiores) a lo largo del largo
      const moduloAncho = 60; // cm
      const baseAlto = 90; // cm (con zócalo)
      const baseFondo = 60; // cm
      const supAlto = 72; // cm
      const supFondo = 35; // cm
      const separacionEncimera = 45; // cm entre base y superior

      const numModulos = Math.max(1, Math.floor(dimsCm.largo_cm / moduloAncho));
      const modules = [];
      const components = [];

      for (let i = 0; i < numModulos; i++) {
        const x = i * moduloAncho + moduloAncho / 2; // centro del módulo
        // Base cabinet
        modules.push({
          tipo: 'base',
          ancho_cm: moduloAncho,
          alto_cm: baseAlto,
          fondo_cm: baseFondo,
          posicion_cm: { x, y: baseAlto / 2, z: 0 },
          material: materialCheck,
          color_hex: colorHex
        });

        // Upper cabinet (si altura lo permite)
        if (dimsCm.alto_cm > baseAlto + separacionEncimera + supAlto) {
          const ySup = baseAlto + separacionEncimera + supAlto / 2;
          modules.push({
            tipo: 'superior',
            ancho_cm: moduloAncho,
            alto_cm: supAlto,
            fondo_cm: supFondo,
            posicion_cm: { x, y: ySup, z: 0 },
            material: materialCheck,
            color_hex: colorHex
          });
        }
      }

      // Añadir puertas / cajones según especificaciones
      const espec = parametros.especificaciones || {};
      const numPuertas = Number(espec.puertas || 0);
      const numCajones = Number(espec.cajones || 0);

      // Distribuir puertas en módulos superiores si existen
      if (numPuertas > 0) {
        const supModules = modules.filter(m => m.tipo === 'superior');
        const destino = supModules.length ? supModules : modules;
        const puertaAncho = Math.max(30, Math.floor(moduloAncho / 2));
        destino.forEach((m, idx) => {
          if (idx < numPuertas) {
            const xPuerta = m.posicion_cm.x;
            const yPuerta = m.posicion_cm.y;
            components.push({
              tipo: 'puerta',
              ancho_cm: puertaAncho,
              alto_cm: m.alto_cm - 4,
              fondo_cm: 2,
              posicion_cm: { x: xPuerta, y: yPuerta, z: m.fondo_cm / 2 },
              material,
              color_hex: colorHex
            });
          }
        });
      }

      // Pila de cajones en los módulos base del primer tercio
      if (numCajones > 0) {
        const baseModules = modules.filter(m => m.tipo === 'base');
        const destino = baseModules.slice(0, Math.max(1, Math.ceil(baseModules.length / 3)));
        let restantes = numCajones;
        destino.forEach(m => {
          const cajonAlto = 18;
          const cajonFondo = Math.max(40, Math.min(m.fondo_cm - 6, 55));
          const cajonAncho = Math.max(40, Math.floor(m.ancho_cm / 2));
          let yAcum = (m.posicion_cm.y - m.alto_cm / 2) + 10 + cajonAlto / 2;
          while (restantes > 0 && yAcum < m.posicion_cm.y + m.alto_cm / 2 - 10) {
            components.push({
              tipo: 'cajon',
              ancho_cm: cajonAncho,
              alto_cm: cajonAlto,
              fondo_cm: cajonFondo,
              posicion_cm: { x: m.posicion_cm.x - cajonAncho / 4, y: yAcum, z: m.fondo_cm / 2 },
              material,
              color_hex: colorHex
            });
            restantes--;
            yAcum += cajonAlto + 5;
          }
        });
      }

      return {
        tipo: 'kitchen_set',
        dimensiones_cm: dimsCm,
        material,
        color_hex: colorHex,
        modules,
        components
      };
    }

    if (esCloset) {
      // Generación paramétrica de un closet con paneles laterales, divisor central y repisas
      const grosor = 2; // cm
      const profundidad = Math.max(40, Math.min(80, dimsCm.ancho_cm));
      const alto = dimsCm.alto_cm;
      const ancho = dimsCm.largo_cm;

      const components = [];

      // Panel lateral izquierdo
      components.push({
        tipo: 'panel_lateral_izquierdo',
        ancho_cm: grosor,
        alto_cm: alto,
        fondo_cm: profundidad,
        posicion_cm: { x: grosor / 2, y: alto / 2, z: 0 },
        material,
        color_hex: colorHex
      });

      // Panel lateral derecho
      components.push({
        tipo: 'panel_lateral_derecho',
        ancho_cm: grosor,
        alto_cm: alto,
        fondo_cm: profundidad,
        posicion_cm: { x: ancho - grosor / 2, y: alto / 2, z: 0 },
        material,
        color_hex: colorHex
      });

      // Divisor central (si el ancho lo permite)
      if (ancho > 120) {
        components.push({
          tipo: 'divisor_central',
          ancho_cm: grosor,
          alto_cm: alto,
          fondo_cm: profundidad,
          posicion_cm: { x: Math.round(ancho / 2), y: alto / 2, z: 0 },
          material,
          color_hex: colorHex
        });
      }

      // Repisas
      const espacioUtil = alto - 10; // margen superior/inferior
      const separacion = Math.max(25, Math.min(45, Math.floor(espacioUtil / 6)));
      const numRepisas = Math.max(3, Math.floor(espacioUtil / separacion));
      const anchoRepisa = ancho - grosor * 2; // entre paneles
      for (let i = 0; i < numRepisas; i++) {
        const y = 10 + separacion * (i + 1);
        components.push({
          tipo: 'repisa',
          ancho_cm: anchoRepisa,
          alto_cm: grosor,
          fondo_cm: profundidad,
          posicion_cm: { x: grosor + anchoRepisa / 2, y, z: 0 },
          material,
          color_hex: colorHex
        });
      }

      // Barra de colgar (si hay altura)
      if (alto > 160) {
        const barraY = Math.min(alto - 40, 170);
        components.push({
          tipo: 'barra_colgar',
          ancho_cm: anchoRepisa,
          alto_cm: 1.5,
          fondo_cm: 3,
          posicion_cm: { x: grosor + anchoRepisa / 2, y: barraY, z: 0 },
          material: 'Metal',
          color_hex: '#999999'
        });
      }

      // Puertas y cajones según especificaciones
      const espec = parametros.especificaciones || {};
      const numPuertas = Number(espec.puertas || 0);
      const numCajones = Number(espec.cajones || 0);
      const doorThickness = 2;

      if (numPuertas > 0) {
        const clearWidth = anchoRepisa;
        const puertaAncho = Math.max(30, Math.floor(clearWidth / numPuertas));
        for (let i = 0; i < numPuertas; i++) {
          const xPuerta = grosor + puertaAncho / 2 + i * puertaAncho;
          components.push({
            tipo: 'puerta',
            ancho_cm: puertaAncho,
            alto_cm: alto - 10, // despeje superior/inferior
            fondo_cm: doorThickness,
            posicion_cm: { x: xPuerta, y: alto / 2, z: 0 },
            material,
            color_hex: colorHex
          });
        }
      }

      if (numCajones > 0) {
        const cajonAlto = 20;
        const cajonFondo = Math.max(30, Math.min(profundidad - 6, 55));
        const cajonAncho = Math.max(40, Math.floor(anchoRepisa / 2) - 4);
        const xCajon = grosor + cajonAncho / 2 + 4; // pila a la izquierda
        for (let i = 0; i < numCajones; i++) {
          const yCajon = 10 + cajonAlto / 2 + i * (cajonAlto + 5);
          components.push({
            tipo: 'cajon',
            ancho_cm: cajonAncho,
            alto_cm: cajonAlto,
            fondo_cm: cajonFondo,
            posicion_cm: { x: xCajon, y: yCajon, z: 0 },
            material,
            color_hex: colorHex
          });
        }
      }

      return {
        tipo: 'component_set',
        dimensiones_cm: dimsCm,
        material,
        color_hex: colorHex,
        components
      };
    }

    // Fallback simple (prisma rectangular)
    const volumeCm3 = dimsCm.largo_cm * dimsCm.ancho_cm * dimsCm.alto_cm;
    return {
      tipo: 'box',
      dimensiones_cm: dimsCm,
      material,
      color_hex: colorHex,
      volumen_cm3: volumeCm3,
      nombre: tipo_mueble || 'Mueble'
    };
  }

  obtenerProductosSimilares(parametros) {
    // Simular productos similares del catálogo
    return [
      {
        id: Math.floor(Math.random() * 100) + 1,
        nombre: `${parametros.tipo_mueble || 'Mueble'} ${parametros.estilo}`,
        precio_base: this.calcularPrecioEstimado(
          parametros.medidas.largo * parametros.medidas.ancho * parametros.medidas.alto,
          parametros.material,
          1
        ),
        similitud: 85
      },
      {
        id: Math.floor(Math.random() * 100) + 1,
        nombre: `${parametros.estilo} en ${parametros.material}`,
        precio_base: this.calcularPrecioEstimado(
          parametros.medidas.largo * parametros.medidas.ancho * parametros.medidas.alto,
          parametros.material,
          0.8
        ),
        similitud: 72
      }
    ];
  }

  generarProcesoFabricacion(parametros) {
    return [
      'Diseño técnico y planos detallados',
      'Selección y preparación de materiales',
      'Corte y mecanizado de piezas',
      'Ensamblaje de estructura principal',
      'Aplicación de acabados y tratamientos',
      'Control de calidad final',
      'Embalaje y preparación para entrega'
    ];
  }

  generarRecomendacionesAdicionales(parametros) {
    return [
      'Considerar tratamiento antimanchas para mayor durabilidad',
      'Incluir sistema de ajuste de altura si es aplicable',
      'Evaluar opciones de almacenamiento integrado',
      'Planificar mantenimiento preventivo cada 6 meses'
    ];
  }

  detectarProveedor() {
    if (this.apiUrl?.includes('huggingface')) return 'huggingface';
    if (this.apiUrl?.includes('replicate')) return 'replicate';
    if (this.apiUrl?.includes('openai')) return 'openai';
    return 'desconocido';
  }
}

module.exports = new IAService();
