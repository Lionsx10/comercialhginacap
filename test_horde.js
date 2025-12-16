const hordeService = require('./services/hordeService');

async function testHorde() {
  console.log('Testing Stable Horde connection...');
  try {
    // 1. Probar un prompt simple
    console.log('Sending generation request...');
    const result = await hordeService.generateImageAsync({
      tipo_mueble: 'Chair',
      estilo: 'Modern',
      material: 'Wood',
      color: 'Brown',
      descripcion_adicional: 'Simple test',
      medidas: { largo: 50, ancho: 50, alto: 100, unidad: 'cm' }
    });

    console.log('Generation Result:', result);

    if (result.success) {
      console.log('Checking status for ID:', result.id);
      const status = await hordeService.checkStatus(result.id);
      console.log('Status:', status);
      console.log('Connection SUCCESS');
    } else {
      console.error('Generation FAILED:', result.error);
    }

  } catch (error) {
    console.error('Test FAILED with exception:', error);
  }
}

testHorde();
