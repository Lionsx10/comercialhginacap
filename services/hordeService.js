const axios = require('axios');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('hordeService');

const HORDE_API_KEY = process.env.STABLE_HORDE_API_KEY || '14r7jZjO05_69uPftFLwAg';
const HORDE_API_URL = 'https://stablehorde.net/api/v2';

class HordeService {
  constructor() {
    this.client = axios.create({
      baseURL: HORDE_API_URL,
      headers: {
        'apikey': HORDE_API_KEY,
        'Client-Agent': 'SistemaMuebles:1.0:admin@sistemamuebles.com'
      }
    });
  }

  /**
   * Genera un prompt basado en los parámetros del mueble
   */
  generatePrompt(params) {
    const {
      tipo_mueble,
      estilo,
      material,
      color,
      descripcion_adicional,
      medidas,
      especificaciones
    } = params;

    // Mapeo de términos comunes (idealmente usaría un servicio de traducción o diccionario más completo)
    const translations = {
      // Colores
      'blanco': 'white',
      'negro': 'black',
      'gris': 'grey',
      'beige': 'beige',
      'marron': 'brown',
      'marrón': 'brown',
      'azul': 'blue',
      'verde': 'green',
      'rojo': 'red',
      'amarillo': 'yellow',
      
      // Materiales
      'madera': 'wood',
      'metal': 'metal',
      'vidrio': 'glass',
      'cuero': 'leather',
      'tela': 'fabric',
      'plástico': 'plastic',
      'plastico': 'plastic',
      'mármol': 'marble',
      'marmol': 'marble',
      'cerámica': 'ceramic',
      'ceramica': 'ceramic',
      
      // Estilos
      'moderno': 'modern',
      'contemporaneo': 'contemporary',
      'contemporáneo': 'contemporary',
      'minimalista': 'minimalist',
      'industrial': 'industrial',
      'escandinavo': 'scandinavian',
      'rustico': 'rustic',
      'rústico': 'rustic',
      'clasico': 'classic',
      'clásico': 'classic',
      'vintage': 'vintage',
      'bohemio': 'bohemian',
      
      // Tipos
      'cocina': 'kitchen',
      'mueble de cocina': 'kitchen cabinet',
      'closet': 'closet',
      'armario': 'wardrobe',
      'mueble': 'furniture'
    };

    const translate = (text) => {
        if (!text) return '';
        const lower = text.toLowerCase().trim();
        return translations[lower] || text; 
    };

    // Manejar múltiples materiales y colores
    const materialStr = Array.isArray(material) 
        ? material.map(m => translate(m)).join(' and ') 
        : translate(material);
        
    const colorStr = Array.isArray(color) 
        ? color.map(c => translate(c)).join(' and ') 
        : translate(color);

    let prompt = `Furniture design, ${translate(tipo_mueble)}, style ${translate(estilo)}, made of ${materialStr}, color ${colorStr}`;
    
    // Agregar especificaciones de puertas y cajones
    if (especificaciones) {
        if (especificaciones.puertas > 0) {
            prompt += `, ${especificaciones.puertas} doors`;
        }
        if (especificaciones.cajones > 0) {
            prompt += `, ${especificaciones.cajones} drawers`;
        }
    }
    
    if (descripcion_adicional) {
      prompt += `, ${translate(descripcion_adicional)}`;
    }
    
    // Agregar modificadores de calidad
    prompt += ", photorealistic, 8k, highly detailed, professional photography, cinematic lighting, 3d render, unreal engine 5";

    return prompt;
  }

  /**
   * Inicia la generación de imagen asíncrona
   */
  async generateImageAsync(params) {
    try {
      const prompt = this.generatePrompt(params);
      
      const payload = {
        prompt: prompt,
        params: {
          sampler_name: "k_euler_a",
          cfg_scale: 7,
          height: 512,
          width: 768, // Aspecto más panorámico para muebles
          steps: 30,
          n: 1 // Cantidad de imágenes
        },
        nsfw: false,
        censor_nsfw: true,
        trusted_workers: false,
        models: ["stable_diffusion"]
      };

      logger.info('Enviando solicitud a Stable Horde', { prompt });

      const response = await this.client.post('/generate/async', payload);
      
      return {
        success: true,
        id: response.data.id,
        kudos: response.data.kudos,
        prompt: prompt
      };
    } catch (error) {
      logger.error('Error al solicitar generación a Stable Horde', { 
        error: error.message,
        response: error.response?.data 
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica el estado de la generación
   */
  async checkStatus(id) {
    try {
      const response = await this.client.get(`/generate/status/${id}`);
      
      return response.data;
    } catch (error) {
      logger.error('Error al verificar estado en Stable Horde', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new HordeService();
