/**
 * SCRIPT DE DEBUG PARA VERIFICAR ARCHIVOS
 * 
 * Este script ayuda a verificar el formato y contenido de los archivos
 * que se envían al backend para identificar problemas en la generación de IA.
 */

const fs = require('fs');
const path = require('path');

// Función para analizar un archivo de imagen
function analyzeImageFile(filePath, fileName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Archivo no encontrado: ${fileName}`);
      return;
    }

    const stats = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);
    
    console.log(`\n📁 Analizando: ${fileName}`);
    console.log(`   Tamaño: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
    console.log(`   Tipo MIME detectado: ${detectMimeType(buffer)}`);
    console.log(`   Primeros 20 bytes: ${buffer.slice(0, 20).toString('hex')}`);
    
    // Verificar si es una imagen válida
    if (isValidImage(buffer)) {
      console.log(`   ✅ Imagen válida`);
    } else {
      console.log(`   ❌ Imagen inválida o corrupta`);
    }
    
  } catch (error) {
    console.error(`❌ Error analizando ${fileName}:`, error.message);
  }
}

// Detectar tipo MIME basado en los primeros bytes
function detectMimeType(buffer) {
  const firstBytes = buffer.slice(0, 8);
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
    return 'image/png';
  }
  
  // JPEG: FF D8 FF
  if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46) {
    return 'image/webp';
  }
  
  return 'unknown';
}

// Verificar si es una imagen válida
function isValidImage(buffer) {
  const mimeType = detectMimeType(buffer);
  return ['image/png', 'image/jpeg', 'image/webp'].includes(mimeType);
}

// Función para crear archivos de prueba
function createTestFiles() {
  console.log('🔧 Creando archivos de prueba...');
  
  const testDir = path.join(__dirname, 'test_files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  
  // Crear una imagen PNG de prueba (1x1 pixel negro)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(path.join(testDir, 'test_room.png'), pngData);
  fs.writeFileSync(path.join(testDir, 'test_furniture.png'), pngData);
  fs.writeFileSync(path.join(testDir, 'test_mask.png'), pngData);
  
  console.log('✅ Archivos de prueba creados en:', testDir);
}

// Función principal
function main() {
  console.log('🔍 INICIANDO ANÁLISIS DE ARCHIVOS\n');
  
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (fs.existsSync(uploadsDir)) {
    console.log('📂 Analizando archivos en uploads/...');
    const files = fs.readdirSync(uploadsDir);
    
    if (files.length === 0) {
      console.log('📭 No hay archivos en uploads/');
    } else {
      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        analyzeImageFile(filePath, file);
      });
    }
  } else {
    console.log('📂 Directorio uploads/ no existe');
  }
  
  // Crear archivos de prueba
  createTestFiles();
  
  console.log('\n🔍 Analizando archivos de prueba...');
  const testDir = path.join(__dirname, 'test_files');
  ['test_room.png', 'test_furniture.png', 'test_mask.png'].forEach(file => {
    const filePath = path.join(testDir, file);
    analyzeImageFile(filePath, file);
  });
  
  console.log('\n✅ Análisis completado');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  analyzeImageFile,
  detectMimeType,
  isValidImage,
  createTestFiles
};