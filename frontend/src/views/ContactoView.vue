<template>
  <div class="container mx-auto px-4 py-12">
    <h1 class="text-3xl font-bold mb-6">Contacto</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">Información</h2>
        <p class="text-gray-700">
          Franklin 565, Santiago Centro, Santiago, Chile
        </p>
        <p class="text-gray-700">+56998163536</p>
        <p class="text-gray-700">contacto@comercialhg.com</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-2">Envíanos un mensaje</h2>
        <form
class="space-y-4" @submit.prevent
>
          <input
            type="text"
            placeholder="Nombre"
            class="w-full border rounded-lg px-4 py-2"
          />
          <input
            type="email"
            placeholder="Email"
            class="w-full border rounded-lg px-4 py-2"
          />
          <textarea
            placeholder="Mensaje"
            class="w-full border rounded-lg px-4 py-2 h-32"
          />
          <a
            href="mailto:contacto@comercialhg.com"
            class="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Enviar por correo
          </a>
        </form>
      </div>
    </div>
  </div>
</template>
