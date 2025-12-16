<template>
  <div class="container mx-auto px-4 py-12">
    <h1 class="text-3xl font-bold mb-6">Mapa del Sitio</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">Enlaces</h2>
        <ul class="space-y-1 text-blue-600">
          <li>
            <RouterLink to="/"> Inicio </RouterLink>
          </li>
          <li>
            <RouterLink to="/catalogo"> Catálogo </RouterLink>
          </li>
          <li>
            <RouterLink to="/cotizaciones"> Cotizaciones </RouterLink>
          </li>

          <li>
            <RouterLink to="/analisis-espacio">
              Análisis de Espacio
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/mis-cotizaciones"> Mis Cotizaciones </RouterLink>
          </li>
        </ul>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">Información</h2>
        <ul class="space-y-1 text-blue-600">
          <li>
            <RouterLink to="/sobre-nosotros"> Sobre Nosotros </RouterLink>
          </li>
          <li>
            <RouterLink to="/como-funciona"> Cómo Funciona </RouterLink>
          </li>
          <li>
            <RouterLink to="/testimonios"> Testimonios </RouterLink>
          </li>
          <li>
            <RouterLink to="/ayuda"> Centro de Ayuda </RouterLink>
          </li>
          <li>
            <RouterLink to="/contacto"> Contacto </RouterLink>
          </li>
          <li>
            <RouterLink to="/faq"> Preguntas Frecuentes </RouterLink>
          </li>
        </ul>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">Legal</h2>
        <ul class="space-y-1 text-blue-600">
          <li>
            <RouterLink to="/privacidad"> Política de Privacidad </RouterLink>
          </li>
          <li>
            <RouterLink to="/terminos"> Términos de Servicio </RouterLink>
          </li>
          <li>
            <RouterLink to="/cookies"> Política de Cookies </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
