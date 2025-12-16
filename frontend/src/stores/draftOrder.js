import { defineStore } from 'pinia'

export const useDraftOrderStore = defineStore('draftOrder', {
  state: () => ({
    orderName: null,
    items: [],
    createdAt: null,
  }),
  getters: {
    isEmpty: state => state.items.length === 0,
    total: state =>
      state.items.reduce(
        (acc, p) => acc + (p.precio || 0) * (p.cantidad || 1),
        0,
      ),
    productosCount: state =>
      state.items.reduce((acc, p) => acc + (p.cantidad || 1), 0),
  },
  actions: {
    addProduct(product, catalogName) {
      if (!this.createdAt) this.createdAt = new Date().toISOString()
      if (!this.orderName) this.orderName = catalogName || 'Catálogo de Muebles'
      const idx = this.items.findIndex(i => i.id === product.id)
      if (idx >= 0) {
        this.items[idx].cantidad = (this.items[idx].cantidad || 1) + 1
      } else {
        this.items.push({
          id: product.id,
          nombre: product.nombre,
          precio: product.precio_base || 0,
          imagen: product.imagen_url || '/placeholder-furniture.jpg',
          categoria: product.categoria || '',
          cantidad: 1,
          medidas: product.medidas || '',
          material: product.material || '',
          color: product.color || '',
        })
      }
    },
    removeProduct(productId) {
      const idx = this.items.findIndex(i => i.id === productId)
      if (idx >= 0) this.items.splice(idx, 1)
    },
    clear() {
      this.orderName = null
      this.items = []
      this.createdAt = null
    },
    toPedidoObject() {
      return {
        id: 'draft',
        isDraft: true,
        estado: 'borrador',
        created_at: this.createdAt || new Date().toISOString(),
        productos_count: this.productosCount,
        productos: this.items.map(i => ({
          id: i.id,
          nombre: i.nombre,
          cantidad: i.cantidad,
          imagen_url: i.imagen,
        })),
        detalles: this.items.map(i => ({
          descripcion: i.nombre,
          medidas: i.medidas || '',
          material: i.material || '',
          color: i.color || '',
          cantidad: i.cantidad || 1,
          precio_unitario: i.precio || 0,
        })),
        total_estimado: this.total,
        nombre_pedido: this.orderName || 'Pedido',
      }
    },
  },
})
