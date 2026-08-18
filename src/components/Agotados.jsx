import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { PackageX, MemoryStick, HardDrive } from 'lucide-react';

export default function Agotados() {
  const [productos, setProductos] = useState([]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/productos`);
      setProductos(res.data);
    } catch (e) { console.error("Error cargando productos agotados:", e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const datosAgrupados = {};
  productos.forEach(p => {
    const marcaOriginal = p.Marca?.nombre || 'Sin Marca';
    const marcaKey = marcaOriginal.toLowerCase().trim();
    const nombreKey = (p.nombre || '').toLowerCase().trim();
    const modeloKey = (p.modelo || '').toLowerCase().trim();
    const ramKey = (p.Ram?.valor || '').toLowerCase().trim();
    const almacenamientoKey = (p.Almacenamiento?.Capacidad || '').toLowerCase().trim();
    
    const claveModelo = `${marcaKey}_${nombreKey}_${modeloKey}_${ramKey}_${almacenamientoKey}`;
    
    if (!datosAgrupados[marcaKey]) {
      datosAgrupados[marcaKey] = {
        displayName: marcaOriginal,
        modelos: {}
      };
    }

    if (!datosAgrupados[marcaKey].modelos[claveModelo]) {
      datosAgrupados[marcaKey].modelos[claveModelo] = {
        ids: [],
        nombreModelo: p.nombre,
        modeloRef: p.modelo,
        ram: p.Ram?.valor || '-',
        almacenamiento: p.Almacenamiento?.Capacidad || '-',
        marcaId: p.Marca_id_Marca,
        colorId: p.Color_id_Color,
        ramId: p.Ram_id_Ram,
        almacenamientoId: p.Almacenamiento_id_Almacenamiento,
        colores: [],
        stockTotal: 0,
        tieneVentas: false // Nueva bandera
      };
    }
    const grupo = datosAgrupados[marcaKey].modelos[claveModelo];
    grupo.ids.push(p.id_Producto);
    p.unidades.forEach(u => {
      grupo.stockTotal += 1;
    });

    // Si este producto tiene ventas, marcamos el grupo completo
    if (p.tieneVentas) {
      grupo.tieneVentas = true;
    }
  });

  // Filtrar solo los que tienen stock 0 Y tienen historial de ventas
  const productosAgotados = {};
  Object.keys(datosAgrupados).forEach(marcaKey => {
    const modelosFiltrados = Object.values(datosAgrupados[marcaKey].modelos)
      .filter(grupo => grupo.stockTotal === 0 && grupo.tieneVentas === true);
    
    if (modelosFiltrados.length > 0) {
      productosAgotados[marcaKey] = {
        displayName: datosAgrupados[marcaKey].displayName,
        modelos: modelosFiltrados
      };
    }
  });

  return (
    <div className="container mx-auto p-4 pt-24 text-slate-900 dark:text-white transition-colors duration-300">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
          <PackageX className="w-8 h-8 text-red-600 dark:text-red-400" /> Productos Agotados (Vendidos)
        </h1>
        <span className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm border border-red-200 dark:border-red-500/30 shadow-sm">
          Sin stock disponible y con ventas registradas
        </span>
      </motion.div>
      
      {Object.keys(productosAgotados).length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/80 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-3xl p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-4 min-h-[400px] shadow-sm">
          <PackageX className="w-20 h-20 text-slate-400 dark:text-slate-500/50" />
          <p className="text-2xl font-semibold text-slate-700 dark:text-slate-300">¡No hay productos agotados por ventas!</p>
        </motion.div>
      ) : (
        Object.keys(productosAgotados).sort().map(marcaKey => {
          const tituloMarca = marcaKey.charAt(0).toUpperCase() + marcaKey.slice(1);
          return (
            <motion.div key={marcaKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * Object.keys(productosAgotados).indexOf(marcaKey) }} className="mb-10">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-red-200 dark:border-red-500/20 pb-3">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span> Sección {tituloMarca}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productosAgotados[marcaKey].modelos.map((grupo, idx) => (
                  <motion.div whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }} className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg relative overflow-hidden group transition-colors duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{grupo.nombreModelo}</h3>
                          <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[10px] px-2 py-0.5 rounded-full border border-red-200 dark:border-red-500/30 uppercase font-bold">AGOTADO</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 font-mono">{grupo.modeloRef}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300">
                            <MemoryStick className="w-3 h-3 text-blue-600 dark:text-blue-400" /> {grupo.ram}
                          </span>
                          <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300">
                            <HardDrive className="w-3 h-3 text-purple-600 dark:text-purple-400" /> {grupo.almacenamiento}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}