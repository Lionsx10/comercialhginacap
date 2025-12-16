const axios = require('axios');

const API_URL = 'http://localhost:3000/api'; // Adjust port if necessary

async function testFlow() {
  try {
    // 1. Get Token
    console.log('Getting test token...');
    // Note: authRoutes is mounted at /api, so the path is /api/test-token
    const tokenRes = await axios.get(`${API_URL}/test-token`);
    const token = tokenRes.data.token;
    console.log('Token received:', token.substring(0, 20) + '...');

    // 2. Call Recommendation API
    console.log('Calling /recomendaciones/ia...');
    const payload = {
      medidas: {
        largo: 300,
        ancho: 60,
        alto: 240,
        unidad: 'cm'
      },
      material: ['Madera', 'Vidrio'],
      color: ['Blanco', 'Azul'],
      estilo: 'Moderno',
      tipo_mueble: 'Cocina',
      presupuesto_estimado: 100000,
      descripcion_adicional: 'Una cocina moderna con isla',
      especificaciones: {
        puertas: 4,
        cajones: 2
      }
    };

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    const response = await axios.post(`${API_URL}/recomendaciones/ia`, payload, config);
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.horde_request_id) {
      console.log('SUCCESS: horde_request_id received:', response.data.horde_request_id);
    } else {
      console.error('FAILURE: horde_request_id is MISSING');
    }

    if (response.data.recomendacion && response.data.recomendacion.prompt_used) {
        console.log('SUCCESS: prompt_used received:', response.data.recomendacion.prompt_used);
    } else {
        console.error('FAILURE: prompt_used is MISSING');
    }

  } catch (error) {
    console.error('Test FAILED:', error.message);
    if (error.response) {
      console.error('Error Data:', error.response.data);
    }
  }
}

testFlow();
