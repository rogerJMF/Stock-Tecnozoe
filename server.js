import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const PORT = process.env.PORT || 5000;

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- FUNCIÓN AUXILIAR PARA ENVIAR NOTIFICACIONES ---
async function sendNotification(productId, message, colorName = null) {
  try {
    const notification = await prisma.notificacion.create({
      data: {
        Producto_id_Producto: parseInt(productId),
        mensaje: message,
        color: colorName,
        leida: false
      }
    });
    console.log(`✅ [NOTIFICACIÓN CREADA]: ${message}`);
    return notification;
  } catch (error) {
    console.error("❌ [ERROR AL CREAR NOTIFICACIÓN]:", error);
    return null; 
  }
}

// --- 1. CATÁLOGOS ---
app.get('/api/catalogos', async (req, res) => {
  const [marcas, colores, rams, almacenamientos] = await Promise.all([
    prisma.marca.findMany(),
    prisma.color.findMany(),
    prisma.ram.findMany(),
    prisma.almacenamiento.findMany()
  ]);
  res.json({ marcas, colores, rams, almacenamientos });
});

// --- 2. PROVEEDORES ---
app.get('/api/proveedores', async (req, res) => {
  const proveedores = await prisma.proveedor.findMany();
  res.json(proveedores);
});
app.post('/api/proveedores', async (req, res) => {
  const { nombre, telefono } = req.body;
  const nuevo = await prisma.proveedor.create({ data: { nombre, telefono } });
  res.json(nuevo);
});

// --- 3. PRODUCTOS (GET) ---
app.get('/api/productos', async (req, res) => {
  const productos = await prisma.producto.findMany({
    include: {
      Marca: true, Color: true, Ram: true, Almacenamiento: true,
      unidades: {
        where: { estado: 'DISPONIBLE' },
        include: {
          detalles: {
            include: {
              MovimientoStock: {
                include: { Proveedor: true }
              }
            },
            take: 1
          }
        }
      }
    }
  });

  const productosConStock = productos.map(p => ({
    ...p,
    stock_actual: p.unidades.length,
    proveedor: p.unidades.length > 0 && p.unidades[0].detalles.length > 0 
               ? p.unidades[0].detalles[0].MovimientoStock?.Proveedor 
               : null
  }));
  res.json(productosConStock);
});

// --- 4. PRODUCTOS (CREATE) ---
app.post('/api/productos', async (req, res) => {
  const { nombre, modelo, Marca_id_Marca, Color_id_Color, Ram_id_Ram, Almacenamiento_id_Almacenamiento, Stock_minimo_alerta, unidades, Proveedor_id_Proveedor } = req.body;
  try {
    const resultado = await prisma.$transaction(async (prisma) => {
      const nuevoProducto = await prisma.producto.create({
        data: { 
          nombre, modelo, 
          Marca: { connect: { id_Marca: parseInt(Marca_id_Marca) } },
          Color: Color_id_Color ? { connect: { id_Color: parseInt(Color_id_Color) } } : undefined,
          Ram: Ram_id_Ram ? { connect: { id_Ram: parseInt(Ram_id_Ram) } } : undefined,
          Almacenamiento: Almacenamiento_id_Almacenamiento ? { connect: { id_Almacenamiento: parseInt(Almacenamiento_id_Almacenamiento) } } : undefined,
          Stock_minimo_alerta: Stock_minimo_alerta || 3 
        }
      });
      
      let idsUnidades = [];
      if (unidades && unidades.length > 0) {
        for (const u of unidades) {
          const nuevaUnidad = await prisma.unidadInventario.create({
            data: {
              Imei_1: u.imei_1.trim(),
              Imei_2: u.imei_2 ? u.imei_2.trim() : null,
              estado: 'DISPONIBLE',
              Producto_id_Producto: nuevoProducto.id_Producto
            }
          });
          idsUnidades.push(nuevaUnidad.id_UnidadInventario);
        }
      }
      
      if (idsUnidades.length > 0) {
        const movimiento = await prisma.movimientoStock.create({
          data: { tipo: 'ENTRADA', Proveedor_id_Proveedor: parseInt(Proveedor_id_Proveedor) }
        });
        for (const idUnidad of idsUnidades) {
          await prisma.detalleMovimiento.create({
            data: { UnidadInventario_id_UnidadInventario: idUnidad, MovimientoStock_id_MovimientoStock: movimiento.id_MovimientoStock }
          });
        }
      }
      return nuevoProducto;
    });
    res.json(resultado);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Error creando producto' }); 
  }
});

// --- 5. ELIMINAR PRODUCTO INDIVIDUAL ---
app.delete('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.producto.delete({ where: { id_Producto: parseInt(id) } });
    res.json({ message: 'Producto eliminado' });
  } catch (error) { res.status(500).json({ error: 'No se pudo eliminar' }); }
});

// --- 5.5 ELIMINAR PRODUCTOS EN LOTE ---
app.post('/api/productos/batch-delete', async (req, res) => {
  const { ids } = req.body;
  try {
    await prisma.$transaction(async (prisma) => {
      for (const id of ids) {
        const unidades = await prisma.unidadInventario.findMany({
          where: { Producto_id_Producto: parseInt(id) },
          select: { id_UnidadInventario: true }
        });
        const idsUnidades = unidades.map(u => u.id_UnidadInventario);
        if (idsUnidades.length > 0) {
          await prisma.detalleMovimiento.deleteMany({
            where: { UnidadInventario_id_UnidadInventario: { in: idsUnidades } }
          });
        }
        await prisma.producto.delete({ where: { id_Producto: parseInt(id) } });
      }
    });
    res.json({ message: 'Modelo eliminado exitosamente' });
  } catch (error) {
    console.error("❌ ERROR REAL EN EL SERVIDOR:", error);
    res.status(500).json({ error: 'No se pudo eliminar el modelo' });
  }
});

// --- 6. EDITAR PRODUCTO ---
app.patch('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, modelo, Marca_id_Marca, Color_id_Color, Ram_id_Ram, Almacenamiento_id_Almacenamiento,
    unidades 
  } = req.body;
  try {
    const dataToUpdate = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre;
    if (modelo !== undefined) dataToUpdate.modelo = modelo;
    if (Marca_id_Marca !== undefined) {
      dataToUpdate.Marca = { connect: { id_Marca: parseInt(Marca_id_Marca) } };
    }
    if (Color_id_Color !== undefined) {
      dataToUpdate.Color = Color_id_Color ? { connect: { id_Color: parseInt(Color_id_Color) } } : { disconnect: true };
    }
    if (Ram_id_Ram !== undefined) {
      dataToUpdate.Ram = Ram_id_Ram ? { connect: { id_Ram: parseInt(Ram_id_Ram) } } : { disconnect: true };
    }
    if (Almacenamiento_id_Almacenamiento !== undefined) {
      dataToUpdate.Almacenamiento = Almacenamiento_id_Almacenamiento ? { connect: { id_Almacenamiento: parseInt(Almacenamiento_id_Almacenamiento) } } : { disconnect: true };
    }

    const productoActualizado = await prisma.producto.update({
      where: { id_Producto: parseInt(id) },
      data: dataToUpdate
    });
    
    if (unidades && unidades.length > 0) {
      for (const u of unidades) {
        if (u.id) {
          await prisma.unidadInventario.update({
            where: { id_UnidadInventario: parseInt(u.id) },
            data: { Imei_1: u.imei_1.trim(), Imei_2: u.imei_2 ? u.imei_2.trim() : null }
          });
        }
      }
    }
    res.json(productoActualizado);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Error editando producto' }); 
  }
});

// --- 7. ELIMINACIONES GRANULARES ---
app.delete('/api/unidades/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.detalleMovimiento.deleteMany({ where: { UnidadInventario_id_UnidadInventario: parseInt(id) } });
    await prisma.unidadInventario.delete({ where: { id_UnidadInventario: parseInt(id) } });
    res.json({ message: 'IMEI eliminado' });
  } catch (error) { res.status(500).json({ error: 'Error eliminando el IMEI' }); }
});

app.delete('/api/variantes', async (req, res) => {
  const { ids } = req.body;
  try {
    if (ids && ids.length > 0) {
      for (const id of ids) {
        await prisma.detalleMovimiento.deleteMany({ where: { UnidadInventario_id_UnidadInventario: parseInt(id) } });
        await prisma.unidadInventario.delete({ where: { id_UnidadInventario: parseInt(id) } });
      }
      res.json({ message: 'Variante eliminada' });
    } else {
      res.status(400).json({ error: 'No se proporcionaron IDs' });
    }
  } catch (error) { res.status(500).json({ error: 'Error eliminando la variante' }); }
});

app.patch('/api/variantes/proveedor', async (req, res) => {
  const { unidadIds, proveedorId } = req.body;
  try {
    const detalles = await prisma.detalleMovimiento.findMany({
      where: { UnidadInventario_id_UnidadInventario: { in: unidadIds } },
      include: { MovimientoStock: true }
    });
    const movimientoIds = [...new Set(detalles.map(d => d.MovimientoStock_id_MovimientoStock))];
    for (const id of movimientoIds) {
      await prisma.movimientoStock.update({
        where: { id_MovimientoStock: id },
        data: { Proveedor_id_Proveedor: parseInt(proveedorId) }
      });
    }
    res.json({ message: 'Proveedor actualizado para la variante' });
  } catch (error) { res.status(500).json({ error: 'Error actualizando el proveedor' }); }
});

// --- 8. MOVER UNIDADES ---
app.patch('/api/unidades/mover', async (req, res) => {
  const { unidadIds, nuevoProductoId } = req.body;
  try {
    await prisma.unidadInventario.updateMany({
      where: { id_UnidadInventario: { in: unidadIds } },
      data: { Producto_id_Producto: parseInt(nuevoProductoId) }
    });
    res.json({ message: 'IMEIs movidos exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error moviendo los IMEIs' });
  }
});

// --- 9. VENTAS ---
app.post('/api/ventas', async (req, res) => {
  const { unidadInventarioId, nombreCliente, cedulaCliente, telefonoCliente } = req.body;
  try {
    await prisma.$transaction(async (prisma) => {
      let cliente = await prisma.cliente.findUnique({ where: { cedula: cedulaCliente } });
      if (!cliente) {
        cliente = await prisma.cliente.create({ data: { nombre: nombreCliente, cedula: cedulaCliente, telefono: telefonoCliente } });
      }
      const movimiento = await prisma.movimientoStock.create({ data: { tipo: 'SALIDA', Cliente_id_Cliente: cliente.id_Cliente } });
      await prisma.detalleMovimiento.create({ data: { UnidadInventario_id_UnidadInventario: parseInt(unidadInventarioId), MovimientoStock_id_MovimientoStock: movimiento.id_MovimientoStock } });
      await prisma.unidadInventario.update({ where: { id_UnidadInventario: parseInt(unidadInventarioId) }, data: { estado: 'VENDIDO' } });
    });
    res.json({ message: 'Venta registrada exitosamente' });
  } catch (error) { res.status(500).json({ error: 'Error en la venta' }); }
});

// --- 10. HISTORIAL Y BÚSQUEDA ---
app.get('/api/movimientos', async (req, res) => {
  try {
    // 1. Primero obtenemos los movimientos con toda la data básica
    const movimientos = await prisma.movimientoStock.findMany({
      include: {
        Proveedor: true,
        Cliente: true,
        detalles: {
          include: {
            UnidadInventario: {
              include: {
                Producto: {
                  include: {
                    Marca: true,
                    Color: true,
                    Ram: true,
                    Almacenamiento: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { fecha_hora: 'desc' }
    });

    // 2. Optimización: En lugar de hacer una consulta por cada IMEI, buscamos TODOS los orígenes de una sola vez
    // (Esto evita que el servidor se sobrecargue y deje de traer los colores y RAM)
    const allIds = movimientos.flatMap(m => m.detalles.map(d => d.UnidadInventario_id_UnidadInventario));
    
    // Obtenemos el movimiento de entrada más antiguo para cada IMEI
    const entradas = await prisma.detalleMovimiento.groupBy({
      by: ['UnidadInventario_id_UnidadInventario'],
      where: { UnidadInventario_id_UnidadInventario: { in: allIds } },
      _min: { MovimientoStock_id_MovimientoStock: true } // Tomamos el ID del movimiento más antiguo
    });

    // Obtenemos los detalles completos de esas entradas
    const entradaIds = entradas.map(e => e._min.MovimientoStock_id_MovimientoStock).filter(id => id !== null);
    const detallesEntrada = await prisma.detalleMovimiento.findMany({
      where: { MovimientoStock_id_MovimientoStock: { in: entradaIds } },
      include: { MovimientoStock: { include: { Proveedor: true } } }
    });

    // Creamos un mapa rápido: IMEI ID -> Proveedor
    const mapaProveedores = new Map();
    detallesEntrada.forEach(det => {
      mapaProveedores.set(det.UnidadInventario_id_UnidadInventario, det.MovimientoStock?.Proveedor);
    });

    // 3. Armamos la respuesta final con los datos enriquecidos
    const movimientosEnriquecidos = movimientos.map(mov => ({
      ...mov,
      detalles: mov.detalles.map(det => ({
        ...det,
        UnidadInventario: {
          ...det.UnidadInventario,
          proveedorOrigen: mapaProveedores.get(det.UnidadInventario_id_UnidadInventario) || null
        }
      }))
    }));

    res.json(movimientosEnriquecidos);
  } catch (error) {
    console.error("❌ Error al obtener movimientos:", error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

app.get('/api/unidades/search/:imei', async (req, res) => {
  const imei = req.params.imei;
  const unidad = await prisma.unidadInventario.findFirst({
    where: { estado: 'DISPONIBLE', OR: [{ Imei_1: imei }, { Imei_2: imei }] },
    include: { Producto: { include: { Marca: true, Color: true, Ram: true, Almacenamiento: true } } }
  });
  res.json(unidad);
});

// --- 11. NOTIFICACIONES ---
app.get('/api/notificaciones', async (req, res) => {
  try {
    const notis = await prisma.notificacion.findMany({
      where: { leida: false },
      include: { Producto: true },
      orderBy: { fecha_creacion: 'desc' }
    });
    res.json(notis);
  } catch (error) {
    console.error("❌ Error al obtener notificaciones:", error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

app.patch('/api/notificaciones/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.notificacion.update({ where: { id_Notificacion: parseInt(id) }, data: { leida: true } });
  res.json({ message: 'Notificación leída' });
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));