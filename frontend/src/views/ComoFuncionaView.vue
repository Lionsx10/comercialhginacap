<template>
  <div class="container mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <h1 class="text-3xl md:text-4xl font-bold mb-3">Cómo Funciona</h1>
      <p class="text-gray-700 max-w-2xl mx-auto">
        Un proceso simple y claro para obtener tu mueble ideal con ayuda de IA.
      </p>
    </div>
    <ol class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <li class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">1. Describe tu espacio</h2>
        <p class="text-gray-700">Indica medidas, estilo y necesidades.</p>
      </li>
      <li class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">2. Recomendación con IA</h2>
        <p class="text-gray-700">
          Generamos propuestas optimizadas con materiales y tiempos estimados.
        </p>
      </li>
      <li class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">3. Fabricación e instalación</h2>
        <p class="text-gray-700">
          Nos encargamos de todo, con plazos claros y resultados de calidad.
        </p>
      </li>
    </ol>
    <div class="mt-10 flex flex-wrap gap-3 justify-center">
      <RouterLink
        to="/recomendaciones"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Probar Recomendaciones IA
      </RouterLink>
      <RouterLink
        to="/analisis-espacio"
        class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Analizar mi Espacio
      </RouterLink>
    </div>
  </div>
</template>
