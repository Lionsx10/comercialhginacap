const { 
  get, post, put, del, patch, getPaginated, 
  authGet, authPost, authPut, authDel, authPatch,
  membersGet, membersPost, membersPut, membersDel 
} = require('../config/database');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('xanoService');

class XanoService {
  constructor() {
    this.endpoints = {
      auth: {
        login: '/auth/login',
        register: '/auth/signup',
        refresh: '/auth/refresh',
        logout: '/auth/logout',
        verify: '/auth/verify',
        me: '/auth/me',
      },
      usuario: {
        list: '/usuario',
        create: '/usuario',
        getById: id => `/usuario/${id}`,
        update: id => `/usuario/${id}`,
        delete: id => `/usuario/${id}`,
      },
      user: {
        list: '/user',
        create: '/user',
        getById: id => `/user/${id}`,
        update: id => `/user/${id}`,
        delete: id => `/user/${id}`,
      },
      pedido: {
        list: '/pedido',
        create: '/pedido',
        getById: id => `/pedido/${id}`,
        update: id => `/pedido/${id}`,
        delete: id => `/pedido/${id}`,
      },
      detalle_pedido: {
        list: '/detalle_pedido',
        create: '/detalle_pedido',
        getById: id => `/detalle_pedido/${id}`,
        update: id => `/detalle_pedido/${id}`,
        delete: id => `/detalle_pedido/${id}`,
      },
      catalogo: {
        list: '/catalogo',
        create: '/catalogo',
        getById: id => `/catalogo/${id}`,
        update: id => `/catalogo/${id}`,
        delete: id => `/catalogo/${id}`,
        filters: '/catalogo/filtros',
      },
      recomendacion_ia: {
        list: '/recomendacion_ia',
        create: '/recomendacion_ia',
        getById: id => `/recomendacion_ia/${id}`,
        update: id => `/recomendacion_ia/${id}`,
        byUser: userId => `/recomendacion_ia`,
        byOrder: orderId => `/recomendacion_ia`,
        generate: '/recomendacion_ia',
      },
      notificacion: {
        list: '/notificacion',
        create: '/notificacion',
        getById: id => `/notificacion/${id}`,
        update: id => `/notificacion/${id}`,
        byUser: userId => `/notificacion`,
        preferences: '/notificacion/preferencias',
        send: '/notificacion/enviar',
        markRead: '/notificacion/marcar_leida',
      },
      cotizacion: {
        list: '/cotizacion',
        create: '/cotizacion',
        getById: id => `/cotizacion/${id}`,
      },
      estado_pedido: {
        list: '/estado_pedido',
        create: '/estado_pedido',
        getById: id => `/estado_pedido/${id}`,
      },
      usuarios: {
        updatePassword: '/usuarios/update_password',
        deleteResetToken: '/usuarios/delete_reset_token',
        getByEmail: '/usuarios/get_by_email',
        saveResetToken: '/usuarios/save_reset_token',
        verifyResetToken: '/usuarios/verify_reset_token',
      }
    };
    this.adminToken = null;
  }

  // Métodos de autenticación
  async login(credentials) {
    try {
      const loginResponse = await authPost(this.endpoints.auth.login, credentials);
      logger.info('Usuario autenticado exitosamente', { email: credentials.email });

      const token = loginResponse.authToken || loginResponse.token || loginResponse.access_token || loginResponse.key || null;
      let userInfo = loginResponse.user || loginResponse.userData || null;

      if (token) {
        if (!userInfo) {
          try {
            userInfo = await this.me(token);
          } catch (meError) {
            logger.warn('No se pudo obtener info de usuario (me) tras login, usando datos parciales si existen', { error: meError.message });
          }
        }
        return { authToken: token, user: userInfo || {} };
      }

      userInfo = userInfo || loginResponse;
      return { authToken: null, user: userInfo };
    } catch (error) {
      logger.error('Error en login', { 
        email: credentials.email, 
        error: error.message 
      });
      throw error;
    }
  }

  async ensureAdminToken() {
    if (this.adminToken) return this.adminToken;
    if (process.env.XANO_API_KEY) {
      this.adminToken = process.env.XANO_API_KEY;
      logger.info('Usando XANO_API_KEY como token admin para Xano');
      return this.adminToken;
    }
    const email = process.env.XANO_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin123@gmail.com';
    const password = process.env.XANO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin123@';
    try {
      const { authToken } = await authPost(this.endpoints.auth.login, { email, password });
      this.adminToken = authToken;
      logger.info('Token admin Xano obtenido');
      return this.adminToken;
    } catch (error) {
      logger.error('No se pudo obtener token admin Xano', { error: error.message });
      throw error;
    }
  }

  async register(userData) {
    try {
      // Mapear los campos al formato que espera Xano
      const xanoData = {
        name: userData.nombre,
        email: userData.email,
        password: userData.password
      };
      
      // Agregar teléfono si está presente
      if (userData.telefono) {
        xanoData.n_telefono = String(userData.telefono).replace(/\s/g, '');
      }
      
      const signupResponse = await authPost(this.endpoints.auth.register, xanoData);
      
      // Obtener información completa del usuario usando el token
      const userInfo = await this.me(signupResponse.authToken);

      // Intentar persistir el teléfono en la tabla user de Xano
      if (xanoData.n_telefono) {
        try {
          await this.updateUser(userInfo.id, { n_telefono: xanoData.n_telefono }, signupResponse.authToken);
        } catch (e) {
          logger.warn('No se pudo actualizar teléfono con token de usuario, intentando con admin', { userId: userInfo.id, message: e.message });
          try {
            const adminToken = await this.ensureAdminToken();
            await this.updateUser(userInfo.id, { n_telefono: xanoData.n_telefono }, adminToken);
          } catch (e2) {
            logger.error('Fallo al actualizar teléfono del usuario en Xano (admin fallback)', { userId: userInfo.id, message: e2.message });
          }
        }
      }
      
      // Combinar la respuesta del signup con la información del usuario
      const completeResponse = {
        authToken: signupResponse.authToken,
        user: {
          id: userInfo.id,
          nombre: userInfo.name,
          email: userInfo.email,
          telefono: (xanoData.n_telefono || userInfo.n_telefono || userInfo.telefono || null),
          rol: 'cliente',
          fecha_registro: new Date(userInfo.created_at).toISOString()
        }
      };
      
      logger.info('Usuario registrado exitosamente', { 
        userId: userInfo.id,
        email: userData.email,
        nombre: userData.nombre 
      });
      
      return completeResponse;
    } catch (error) {
      logger.error('Error en registro', { 
        email: userData.email, 
        error: error.message 
      });
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await authPost(this.endpoints.auth.refresh, { refresh_token: refreshToken });
      return response;
    } catch (error) {
      logger.error('Error al refrescar token', { error: error.message });
      throw error;
    }
  }

  async verifyToken(token) {
    try {
      const response = await authGet(this.endpoints.auth.verify, {}, token);
      return response;
    } catch (error) {
      logger.error('Error al verificar token', { error: error.message });
      throw error;
    }
  }

  async me(token) {
    // MOCK ME para administrador local
    if (token === 'mock-admin-token-123') {
      logger.info('Retornando usuario simulado para token de admin')
      return {
        id: 9999,
        name: 'Admin Local',
        nombre: 'Admin Local',
        email: 'admin123@gmail.com',
        rol: 'admin',
        role: 'admin',
        is_admin: true,
        isAdmin: true,
      }
    }

    try {
      const response = await authGet(this.endpoints.auth.me, {}, token)
      logger.info('Información de usuario obtenida', { 
        userId: response.id,
        email: response.email 
      });
      return response;
    } catch (error) {
      logger.error('Error al obtener información del usuario', { error: error.message });
      throw error;
    }
  }

  // Métodos de usuarios
  async getUsers(params = {}, token) {
    try {
      const queryParams = { 
        page: params.page || 1, 
        per_page: params.limit || 10,
        ...params 
      };
      
      // Intentar primero con Auth API (según instrucción del usuario)
      let response;
      try {
        response = await authGet(this.endpoints.usuario.list, queryParams, token);
      } catch (e) {
        // Fallback a Members API
        response = await membersGet(this.endpoints.usuario.list, queryParams, token);
      }

      const items = response.items || response.data || response || [];
      return {
        data: items,
        pagination: {
          page: response.page || params.page || 1,
          per_page: response.per_page || params.limit || 10,
          total: response.total || (Array.isArray(items) ? items.length : 0),
          pages: response.pages || 1
        }
      };
    } catch (error) {
      logger.error('Error al obtener usuarios', { error: error.message });
      throw error;
    }
  }

  async createUser(userData, token) {
    try {
      const body = { 
        name: userData.nombre || userData.name || 'Usuario', 
        email: userData.email, 
        telefono: userData.telefono || null 
      };
      
      let response;
      try {
        response = await authPost(this.endpoints.usuario.create, body, token);
      } catch (_) {
        response = await membersPost(this.endpoints.usuario.create, body, token);
      }
      
      logger.info('Usuario creado en Xano', { id: response.id, email: body.email });
      return response;
    } catch (error) {
      logger.error('Error al crear usuario en Xano', { error: error.message });
      throw error;
    }
  }

  async getUserById(id, token) {
    try {
      let response;
      // Intentar primero con endpoint /usuario (custom)
      try {
        response = await authGet(this.endpoints.usuario.getById(id), {}, token);
        return response;
      } catch (_) {}
      
      // Intentar con members /usuario
      try {
        response = await membersGet(this.endpoints.usuario.getById(id), {}, token);
        return response;
      } catch (_) {}

      // Intentar con endpoint /user (standard Xano auth)
      try {
        response = await authGet(this.endpoints.user.getById(id), {}, token);
        return response;
      } catch (_) {}

      // Último intento: endpoint genérico /user/{id}
      try {
        response = await get(`/user/${id}`, {}, token);
        return response;
      } catch (_) {}

      throw new Error('Usuario no encontrado en ninguna tabla (usuario/user)');
    } catch (error) {
      logger.error('Error al obtener usuario', { id, error: error.message });
      throw error;
    }
  }

  async updateUser(id, userData, token) {
    try {
      let response;
      try {
        response = await authPut(this.endpoints.usuario.update(id), userData, token);
      } catch (_) {
        try {
          response = await membersPut(this.endpoints.usuario.update(id), userData, token);
        } catch (e2) {
          // Fallback a endpoints antiguos por si acaso
          response = await authPut(`/user/${id}`, userData, token);
        }
      }
      logger.info('Usuario actualizado', { id, campos: Object.keys(userData) });
      return response;
    } catch (error) {
      logger.error('Error al actualizar usuario', { id, error: error.message });
      throw error;
    }
  }

  async changePassword(passwordData, token) {
    try {
      let response;
      try {
        // Corregido: usar updatePassword y authPost
        response = await authPost(this.endpoints.usuarios.updatePassword, passwordData, token);
      } catch (_) {
        response = await membersPost(this.endpoints.usuarios.updatePassword, passwordData, token);
      }
      logger.info('Contraseña cambiada exitosamente');
      return response;
    } catch (error) {
      logger.error('Error al cambiar contraseña', { error: error.message });
      throw error;
    }
  }

  async deleteResetToken(data, token) {
    try {
      let response;
      try {
        response = await authPost(this.endpoints.usuarios.deleteResetToken, data, token);
      } catch (_) {
        response = await membersPost(this.endpoints.usuarios.deleteResetToken, data, token);
      }
      return response;
    } catch (error) {
      logger.error('Error al eliminar token de reset', { error: error.message });
      throw error;
    }
  }

  // Métodos de pedidos
  async getOrders(params = {}, token) {
    try {
      const response = await getPaginated(this.endpoints.pedido.list, 
        params.page || 1, 
        params.limit || 10, 
        params, 
        token
      );
      return response;
    } catch (error) {
      logger.error('Error al obtener pedidos', { error: error.message });
      throw error;
    }
  }

  async createOrder(orderData, token) {
    try {
      const body = { estado: orderData.estado || 'nuevo' };
      if (orderData.usuario_id != null) body.usuario_id = orderData.usuario_id;
      if (orderData.user_id != null) body.user_id = orderData.user_id;
      const response = await post(this.endpoints.pedido.create, body, token);
      logger.info('Pedido creado exitosamente', { orderId: response.id, userId: orderData.usuario_id });
      return response;
    } catch (error) {
      try {
        const body = { estado: orderData.estado || 'nuevo' };
        if (orderData.usuario_id != null) body.usuario_id = orderData.usuario_id;
        if (orderData.user_id != null) body.user_id = orderData.user_id;
        const responseAlt = await post('/pedidos', body, token);
        logger.info('Pedido creado exitosamente (fallback)', { orderId: responseAlt.id, userId: orderData.usuario_id });
        return responseAlt;
      } catch (err) {
        logger.error('Error al crear pedido', { error: err.message });
        throw err;
      }
    }
  }

  async createOrderWithDetails(orderData, token) {
    const payload = { estado: orderData.estado || 'en_cotizacion' };
    if (orderData.usuario_id != null) payload.usuario_id = orderData.usuario_id;
    if (orderData.user_id != null) payload.user_id = orderData.user_id;
    if (orderData.estado_pedido != null) payload.estado_pedido = orderData.estado_pedido;
    const pedido = await this.createOrder(payload, token);

    // Crear registro en la tabla estado_pedido si se proporciona
    if (orderData.estado_pedido) {
      try {
        await this.createEstadoPedido({
          estado_cotizacion: orderData.estado_pedido,
          user_id: payload.user_id || payload.usuario_id,
          pedido_id: pedido.id
        }, token);
      } catch (e) {
        logger.warn('No se pudo crear registro en estado_pedido', { error: e.message });
      }
    }

    const detalles = Array.isArray(orderData.detalles) ? orderData.detalles : [];
    const creados = [];
    let totalEstimado = 0;
    for (const d of detalles) {
      const body = {
        pedido_id: pedido.id,
        descripcion: d.descripcion,
        medidas: d.medidas || '',
        material: d.material || '',
        cantidad: d.cantidad || 1,
        color: d.color || null,
        observaciones: d.observaciones || null,
        precio_unitario: d.precio_unitario ?? d.precio_base ?? 0,
      };
      try {
        const det = await post(this.endpoints.detalle_pedido.create, body, token);
        creados.push(det);
        totalEstimado += (body.cantidad || 1) * (body.precio_unitario || 0);
      } catch (e) {
        logger.warn('Fallo al crear detalle de pedido', { pedidoId: pedido.id, message: e.message });
      }
    }
    try {
      await put(this.endpoints.pedido.update(pedido.id), { total_estimado: totalEstimado }, token);
    } catch (e) {
      logger.warn('No se pudo actualizar total estimado del pedido en Xano', { pedidoId: pedido.id });
    }
    return { ...pedido, detalles: creados, total_estimado: totalEstimado };
  }

  async createEstadoPedido(data, token) {
    try {
      // Intentar crear con el token proporcionado
      return await post(this.endpoints.estado_pedido.create, data, token);
    } catch (error) {
      // Si falla, intentar con token de admin si no es el que se usó
      if (token !== this.adminToken) {
        try {
          const adminToken = await this.ensureAdminToken();
          return await post(this.endpoints.estado_pedido.create, data, adminToken);
        } catch (e2) {
          throw error;
        }
      }
      throw error;
    }
  }

  async createCotizacion(data, token) {
    try {
      const body = {
        cubierta: data.cubierta,
        material_mueble: data.material_mueble,
        color: data.color || '',
        color_cubierta: data.color_cubierta || '',
        color_material: data.color_material || '',
        medidas: data.medidas || '',
        precio_unitario: data.precio_unitario ?? 0,
        precio: data.precio_unitario ?? 0,
      };
      if (data.comuna !== undefined) {
        body.comuna = data.comuna || '';
      }
      if (data.traslado_comuna !== undefined) {
        body.traslado_comuna = data.traslado_comuna || '';
      }
      if (data.precio_traslado !== undefined) {
        body.precio_traslado = data.precio_traslado ?? 0;
        body.precio_comuna = data.precio_traslado ?? 0;
      }
      if (data.total_con_traslado !== undefined) {
        body.total_con_traslado = data.total_con_traslado ?? body.precio_unitario;
      }
      if (data.usuario_id !== undefined && data.usuario_id !== null) {
        body.usuario_id = data.usuario_id;
      }
      if (data.user_id !== undefined && data.user_id !== null) {
        body.user_id = data.user_id;
      }
      // Si no hay token, intentar como endpoint público sin Authorization
      const response = token
        ? await post(this.endpoints.cotizacion.create, body, token)
        : await post(this.endpoints.cotizacion.create, body, null, { noAuth: true });
      return response;
    } catch (error) {
      // Fallback: intentar vía API de autenticación si aplica
      try {
        const responseAlt = await authPost('/cotizacion', body, token);
        return responseAlt;
      } catch (e2) {
        throw e2;
      }
    }
  }

  async getCotizacionById(id, token) {
    try {
      const response = await get(this.endpoints.cotizacion.getById(id), {}, token);
      return response;
    } catch (error) {
      try {
        const responseAlt = await authGet(`/cotizacion/${id}`, {}, token);
        return responseAlt;
      } catch (e2) {
        throw e2;
      }
    }
  }

  async getCotizaciones(params = {}, token) {
    try {
      const response = await getPaginated(this.endpoints.cotizacion.list,
        params.page || 1,
        params.limit || 10,
        params,
        token
      );
      return response;
    } catch (error) {
      try {
        const data = await authGet('/cotizacion', { page: params.page || 1, per_page: params.limit || 10, ...params }, token);
        const items = data.items || data.data || data || [];
        return { data: items, pagination: { page: params.page || 1, per_page: params.limit || 10, total: Array.isArray(items) ? items.length : 0, pages: 1 } };
      } catch (e2) {
        throw e2;
      }
    }
  }

  async getCotizacionesByUser(userId, params = {}, token) {
    try {
      const response = await getPaginated(this.endpoints.cotizacion.list, params.page || 1, params.limit || 10, { ...params, usuario_id: userId, user_id: userId }, token);
      return response;
    } catch (error) {
      try {
        const data = await authGet('/cotizacion', { page: params.page || 1, per_page: params.limit || 10, usuario_id: userId, user_id: userId }, token);
        const items = data.items || data.data || data || [];
        return { data: items, pagination: { page: params.page || 1, per_page: params.limit || 10, total: Array.isArray(items) ? items.length : 0, pages: 1 } };
      } catch (e2) {
        throw e2;
      }
    }
  }

  async findUserIdByEmail(email, token) {
    const r = await this.getUsers({ email, limit: 1 }, token);
    const list = r.data || r.items || [];
    if (Array.isArray(list) && list.length > 0) {
      const u = list[0];
      return u.id;
    }
    return null;
  }

  async getOrderById(id, token) {
    try {
      const response = await get(this.endpoints.pedido.getById(id), {}, token);
      return response;
    } catch (error) {
      try {
        const responseAlt = await get(`/pedidos/${id}`, {}, token);
        return responseAlt;
      } catch (err) {
        logger.error('Error al obtener pedido', { id, error: err.message });
        throw err;
      }
    }
  }

  async getOrderDetails(orderId, token) {
    const endpointsToTry = ['/detalle_pedido', '/detalles_pedido'];
    let lastError = null;
    for (const ep of endpointsToTry) {
      try {
        const data = await getPaginated(ep, 1, 100, { pedido_id: orderId }, token);
        const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
        if (Array.isArray(list)) return list;
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    logger.error('Error al obtener detalles de pedido', { orderId, error: lastError?.message || 'desconocido' });
    throw lastError || new Error('No fue posible obtener detalles de pedido');
  }

  async updateOrderStatus(id, statusData, token) {
    const onlyStatus = { estado: statusData.estado };
    try {
      const responseStatus = await patch(`/pedidos/${id}/status`, onlyStatus, token);
      logger.info('Estado de pedido actualizado (status endpoint)', { id, nuevoEstado: statusData.estado });
      return responseStatus;
    } catch (_) {}
    try {
      const response = await patch(this.endpoints.pedido.update(id), statusData, token);
      logger.info('Estado de pedido actualizado', { id, nuevoEstado: statusData.estado });
      return response;
    } catch (error) {
      try {
        const responseAlt = await patch(`/pedidos/${id}`, statusData, token);
        logger.info('Estado de pedido actualizado (fallback)', { id, nuevoEstado: statusData.estado });
        return responseAlt;
      } catch (err) {
        logger.error('Error al actualizar estado de pedido', { id, error: err.message });
        throw err;
      }
    }
  }

  async updateOrderQuote(id, quoteData, token) {
    try {
      const response = await patch(this.endpoints.pedido.update(id), quoteData, token);
      logger.info('Cotización de pedido actualizada', { id });
      return response;
    } catch (error) {
      logger.error('Error al actualizar cotización', { id, error: error.message });
      throw error;
    }
  }

  async getOrdersByUser(userId, params = {}, token) {
    try {
      const response = await getPaginated(this.endpoints.pedido.list, params.page || 1, params.limit || 10, { ...params, usuario_id: userId, user_id: userId }, token);
      return response;
    } catch (error) {
      try {
        const responseAlt = await getPaginated('/pedidos', params.page || 1, params.limit || 10, { ...params, usuario_id: userId, user_id: userId }, token);
        return responseAlt;
      } catch (err) {
        logger.error('Error al obtener pedidos del usuario', { userId, error: err.message });
        throw err;
      }
    }
  }

  // Métodos del catálogo
  async getCatalog(params = {}, token = null) {
    try {
      const response = await getPaginated(this.endpoints.catalogo.list, 
        params.page || 1, 
        params.limit || 12, 
        params, 
        token
      );
      return response;
    } catch (error) {
      logger.error('Error al obtener catálogo', { error: error.message });
      return { data: [], items: [], total: 0 };
    }
  }

  async createProduct(productData, token) {
    try {
      const response = await post(this.endpoints.catalogo.create, productData, token);
      logger.info('Producto creado en catálogo', { 
        productId: response.id,
        nombre: productData.nombre 
      });
      return response;
    } catch (error) {
      logger.error('Error al crear producto', { error: error.message });
      throw error;
    }
  }

  async getProductById(id, token = null) {
    try {
      const response = await get(this.endpoints.catalogo.getById(id), {}, token);
      return response;
    } catch (error) {
      logger.error('Error al obtener producto', { id, error: error.message });
      throw error;
    }
  }

  async updateProduct(id, productData, token) {
    try {
      const response = await put(this.endpoints.catalogo.update(id), productData, token);
      logger.info('Producto actualizado', { id, campos: Object.keys(productData) });
      return response;
    } catch (error) {
      logger.error('Error al actualizar producto', { id, error: error.message });
      throw error;
    }
  }

  async deleteProduct(id, token) {
    try {
      const response = await del(this.endpoints.catalogo.delete(id), token);
      logger.info('Producto eliminado', { id });
      return response;
    } catch (error) {
      logger.error('Error al eliminar producto', { id, error: error.message });
      throw error;
    }
  }

  async getCatalogFilters(token = null) {
    try {
      const response = await get(this.endpoints.catalogo.filters, {}, token);
      return response;
    } catch (error) {
      logger.error('Error al obtener filtros del catálogo', { error: error.message });
      throw error;
    }
  }

  // Métodos de recomendaciones
  async generateRecommendation(recommendationData, token) {
    try {
      const response = await post(this.endpoints.recomendaciones.generate, recommendationData, token);
      logger.info('Recomendación generada', { 
        recommendationId: response.id,
        userId: recommendationData.usuario_id 
      });
      return response;
    } catch (error) {
      logger.error('Error al generar recomendación', { error: error.message });
      throw error;
    }
  }

  async getRecommendationsByUser(userId, params = {}, token) {
    try {
      const response = await getPaginated(this.endpoints.recomendaciones.byUser(userId), 
        params.page || 1, 
        params.limit || 10, 
        params, 
        token
      );
      return response;
    } catch (error) {
      logger.error('Error al obtener recomendaciones del usuario', { userId, error: error.message });
      throw error;
    }
  }

  async updateRecommendation(id, updateData, token) {
    try {
      const response = await put(this.endpoints.recomendaciones.update(id), updateData, token);
      logger.info('Recomendación actualizada', { id });
      return response;
    } catch (error) {
      logger.error('Error al actualizar recomendación', { id, error: error.message });
      throw error;
    }
  }

  // Métodos de notificaciones
  async getNotificationsByUser(userId, params = {}, token) {
    try {
      const response = await getPaginated(this.endpoints.notificaciones.byUser(userId), 
        params.page || 1, 
        params.limit || 20, 
        params, 
        token
      );
      return response;
    } catch (error) {
      logger.error('Error al obtener notificaciones del usuario', { userId, error: error.message });
      throw error;
    }
  }

  async markNotificationsAsRead(notificationIds, token) {
    try {
      const response = await post(this.endpoints.notificaciones.markRead, 
        { notification_ids: notificationIds }, 
        token
      );
      logger.info('Notificaciones marcadas como leídas', { 
        cantidad: notificationIds.length 
      });
      return response;
    } catch (error) {
      logger.error('Error al marcar notificaciones como leídas', { error: error.message });
      throw error;
    }
  }

  async sendNotification(notificationData, token) {
    try {
      const response = await post(this.endpoints.notificaciones.send, notificationData, token);
      logger.info('Notificación enviada', { 
        userId: notificationData.usuario_id,
        tipo: notificationData.tipo 
      });
      return response;
    } catch (error) {
      logger.error('Error al enviar notificación', { error: error.message });
      throw error;
    }
  }

  async getNotificationPreferences(token) {
    try {
      const response = await get(this.endpoints.notificaciones.preferences, {}, token);
      return response;
    } catch (error) {
      logger.error('Error al obtener preferencias de notificaciones', { error: error.message });
      throw error;
    }
  }

  async updateNotificationPreferences(preferences, token) {
    try {
      const response = await put(this.endpoints.notificaciones.preferences, preferences, token);
      logger.info('Preferencias de notificaciones actualizadas');
      return response;
    } catch (error) {
      logger.error('Error al actualizar preferencias de notificaciones', { error: error.message });
      throw error;
    }
  }

  // Métodos para recuperación de contraseña
  async getUserByEmail(email) {
    try {
      let response;
      try {
        response = await authPost(this.endpoints.usuarios.getByEmail, { email });
      } catch (_) {
        response = await membersPost(this.endpoints.usuarios.getByEmail, { email });
      }
      return response;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Usuario no encontrado
      }
      logger.error('Error al buscar usuario por email', { email, error: error.message });
      throw error;
    }
  }

  async savePasswordResetToken(userId, token, expiresAt) {
    try {
      const data = {
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString()
      };
      let response;
      try {
        response = await authPost(this.endpoints.usuarios.saveResetToken, data);
      } catch (_) {
        response = await membersPost(this.endpoints.usuarios.saveResetToken, data);
      }
      logger.info('Token de recuperación guardado', { userId });
      return response;
    } catch (error) {
      logger.error('Error al guardar token de recuperación', { userId, error: error.message });
      throw error;
    }
  }

  async verifyPasswordResetToken(token) {
    try {
      let response;
      try {
        response = await authPost(this.endpoints.usuarios.verifyResetToken, { token });
      } catch (_) {
        response = await membersPost(this.endpoints.usuarios.verifyResetToken, { token });
      }
      return response;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Token no encontrado o expirado
      }
      logger.error('Error al verificar token de recuperación', { token, error: error.message });
      throw error;
    }
  }

  // Métodos para recuperación de contraseña (compatibilidad con routes/auth.js)
  async updatePassword(userId, newPassword) {
    try {
      const data = {
        user_id: userId,
        password: newPassword
      };
      let response;
      try {
        response = await authPost(this.endpoints.usuarios.updatePassword, data);
      } catch (_) {
        response = await membersPost(this.endpoints.usuarios.updatePassword, data);
      }
      logger.info('Contraseña actualizada exitosamente', { userId });
      return response;
    } catch (error) {
      logger.error('Error al actualizar contraseña', { userId, error: error.message });
      throw error;
    }
  }

  async deletePasswordResetToken(token) {
    try {
      let response;
      try {
        response = await authPost(this.endpoints.usuarios.deleteResetToken, { token });
      } catch (_) {
        response = await membersPost(this.endpoints.usuarios.deleteResetToken, { token });
      }
      logger.info('Token de recuperación eliminado');
      return response;
    } catch (error) {
      logger.error('Error al eliminar token de recuperación', { token, error: error.message });
      throw error;
    }
  }
}

module.exports = new XanoService();
