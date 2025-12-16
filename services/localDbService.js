const fs = require('fs');
const path = require('path');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('localDbService');

const DATA_DIR = path.join(__dirname, '../data');
const RECOMENDACIONES_FILE = path.join(DATA_DIR, 'recomendaciones.json');

// Asegurar que el directorio de datos existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Asegurar que el archivo de recomendaciones existe
if (!fs.existsSync(RECOMENDACIONES_FILE)) {
  fs.writeFileSync(RECOMENDACIONES_FILE, JSON.stringify([], null, 2));
}

class LocalDbService {
  constructor() {
    this.recomendacionesPath = RECOMENDACIONES_FILE;
  }

  _readRecomendaciones() {
    try {
      const data = fs.readFileSync(this.recomendacionesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error leyendo archivo de recomendaciones', { error: error.message });
      return [];
    }
  }

  _writeRecomendaciones(data) {
    try {
      fs.writeFileSync(this.recomendacionesPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      logger.error('Error escribiendo archivo de recomendaciones', { error: error.message });
      return false;
    }
  }

  async saveRecomendacion(recomendacion) {
    const recomendaciones = this._readRecomendaciones();
    
    // Asignar ID
    const id = recomendaciones.length > 0 ? Math.max(...recomendaciones.map(r => r.id)) + 1 : 1;
    
    const newRecomendacion = {
      id,
      ...recomendacion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    recomendaciones.push(newRecomendacion);
    this._writeRecomendaciones(recomendaciones);

    return newRecomendacion;
  }

  async getRecomendacionesByUser(userId) {
    const recomendaciones = this._readRecomendaciones();
    return recomendaciones.filter(r => r.usuario_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async getRecomendacionById(id) {
    const recomendaciones = this._readRecomendaciones();
    return recomendaciones.find(r => r.id === parseInt(id));
  }

  async updateRecomendacion(id, updates) {
    const recomendaciones = this._readRecomendaciones();
    const index = recomendaciones.findIndex(r => r.id === parseInt(id));

    if (index !== -1) {
      recomendaciones[index] = {
        ...recomendaciones[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this._writeRecomendaciones(recomendaciones);
      return recomendaciones[index];
    }
    return null;
  }
}

module.exports = new LocalDbService();
