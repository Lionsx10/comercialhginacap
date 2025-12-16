<template>
  <div class="container mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <h1 class="text-3xl md:text-4xl font-bold mb-3">Centro de Ayuda</h1>
      <p class="text-gray-700">Encuentra respuestas rápidas y guías útiles.</p>
    </div>
    <div class="max-w-xl mx-auto mb-8">
      <input
        type="text"
        placeholder="Buscar en ayuda..."
        class="w-full border rounded-lg px-4 py-2"
      />
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">Guías</h2>
        <ul class="list-disc list-inside text-gray-700 space-y-1">
          <li>
            <RouterLink
to="/como-funciona" class="text-blue-600"
>
              Solicitar recomendaciones
            </RouterLink>
          </li>

          <li>
            <RouterLink
to="/mis-cotizaciones" class="text-blue-600"
>
              Mis cotizaciones
            </RouterLink>
          </li>
        </ul>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">Contacto rápido</h2>
        <p class="text-gray-700">
          Escríbenos a contacto@comercialhg.com o llama al +56998163536.
        </p>
        <div class="mt-4">
          <RouterLink
            to="/contacto"
            class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Ir a Contacto
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
