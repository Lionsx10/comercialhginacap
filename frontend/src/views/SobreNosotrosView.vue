<template>
  <div class="container mx-auto px-4 py-12">
    <div class="text-center mb-10">
      <h1 class="text-3xl md:text-4xl font-bold mb-4">Sobre Nosotros</h1>
      <p class="text-gray-700 max-w-2xl mx-auto">
        En Comercial HG diseñamos y fabricamos muebles de baño, cocina y closets
        a medida, combinando artesanía con tecnología para resultados
        impecables.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div class="bg-white rounded-lg shadow p-6 border-t-4 border-blue-600">
        <h2 class="text-xl font-semibold mb-2">Misión</h2>
        <p class="text-gray-700">
          Crear soluciones de mobiliario personalizadas con calidad premium y
          servicio cercano.
        </p>
      </div>
      <div class="bg-white rounded-lg shadow p-6 border-t-4 border-red-600">
        <h2 class="text-xl font-semibold mb-2">Visión</h2>
        <p class="text-gray-700">
          Ser referentes en diseño a medida integrando IA en todo el proceso.
        </p>
      </div>
      <div class="bg-white rounded-lg shadow p-6 border-t-4 border-blue-600">
        <h2 class="text-xl font-semibold mb-2">Valores</h2>
        <ul class="list-disc list-inside text-gray-700 space-y-1">
          <li>Calidad y detalle</li>
          <li>Compromiso con plazos</li>
          <li>Atención personalizada</li>
        </ul>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div class="rounded-lg shadow overflow-hidden">
        <img
          src="/images/muebles/img5.jpg"
          alt="Cocina Comercial HG"
          class="w-full h-56 md:h-64 lg:h-72 object-cover"
          loading="lazy"
        />
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-2">Nuestro Taller</h2>
        <p class="text-gray-700">
          Trabajamos con materiales de primera y equipos de precisión para
          asegurar acabados duraderos y funcionales.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded">Baño</span>
          <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded"
            >Cocina</span
          >
          <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded"
            >Closets</span
          >
        </div>
      </div>
    </div>

    <div class="mt-12 text-center">
      <RouterLink
        to="/contacto"
        class="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Contactar
      </RouterLink>
    </div>
  </div>
</template>
