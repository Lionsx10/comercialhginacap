/**
 * Servicio de generación de modelos 3D
 * - Intenta usar un proveedor externo (Replicate) para generar GLTF/GLB desde texto
 * - Si no hay proveedor, permite que el consumidor use el generador paramétrico del iaService
 */

const axios = require('axios');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('threeDService');

class ThreeDService {
  constructor(env) {
    this.apiKey = process.env.IA_API_KEY;
    this.apiUrl = process.env.IA_API_URL;
    this.isExternalAPIEnabled = !!(this.apiKey && this.apiUrl);

    this.providers = {
      replicate: {
        baseUrl: 'https://api.replicate.com/v1',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    };
  }

  detectarProveedor() {
    if (this.apiUrl?.includes('replicate')) return 'replicate';
    return 'desconocido';
  }

  construirPrompt3D(parametros) {
    const { medidas, material, color, estilo, tipo_mueble, especificaciones = {} } = parametros;
    const dimensionStr = `${medidas.largo}${medidas.unidad} x ${medidas.ancho}${medidas.unidad} x ${medidas.alto}${medidas.unidad}`;
    return `Mueble ${tipo_mueble || 'personalizado'} estilo ${estilo}, material ${material}, color ${color}, dimensiones ${dimensionStr}. ` +
      `Puertas: ${especificaciones.puertas || 0}, cajones: ${especificaciones.cajones || 0}. ` +
      `Genera un modelo 3D realista apto para fabricación en formato GLB/GLTF.`;
  }

  /**
   * Intenta generar un GLTF/GLB utilizando Replicate (modelos text-to-3d como Shap-E)
   * @returns {Promise<{tipo:'gltf_url', gltf_url:string, provider:string}|null>}
   */
  async generarModelo3DExterno(parametros) {
    try {
      if (!this.isExternalAPIEnabled) return null;
      const provider = this.detectarProveedor();
      const version = process.env.REPLICATE_3D_MODEL_VERSION; // 'cjwbw/shap-e:xxxxx'
      if (provider !== 'replicate' || !version) return null;

      const prompt = this.construirPrompt3D(parametros);
      const response = await axios.post(
        `${this.providers.replicate.baseUrl}/predictions`,
        {
          version,
          input: {
            prompt,
            guidance_scale: 7,
            num_inference_steps: 50,
            format: 'glb'
          }
        },
        { headers: this.providers.replicate.headers }
      );

      const data = response.data || {};
      const outputs = data.output || data.outputs || [];
      const gltfUrl = Array.isArray(outputs)
        ? outputs.find(u => typeof u === 'string' && (u.endsWith('.glb') || u.endsWith('.gltf')))
        : (typeof outputs === 'string' ? outputs : null);

      const url = gltfUrl || data?.urls?.get || data?.files?.gltf || data?.files?.glb || null;
      if (!url || typeof url !== 'string') return null;

      return { tipo: 'gltf_url', gltf_url: url, provider: 'replicate' };
    } catch (error) {
      logger.warn('Error al generar 3D externo', { error: error.message });
      return null;
    }
  }
}

module.exports = new ThreeDService(process.env);

