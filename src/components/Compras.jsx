import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Smartphone, Calendar, Tag, MemoryStick, HardDrive, Palette, Truck } from 'lucide-react';

export default function Compras() {
  const [movimientos, setMovimientos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMovimientos = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/movimientos`);
      setMovimientos(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMovimientos();
    const interval = setInterval(fetchMovimientos, 5000);
    return () => clearInterval(interval);
  }, []);

  // Procesar los datos con todos los detalles completos (Igual que Ventas)
  const comprasProcesadas = useMemo(() => {
    return movimientos
      .filter(m => m.tipo === 'ENTRADA')
      .flatMap(m => m.detalles.map(d => ({
        id: m.id_MovimientoStock,
        fecha_raw: m.fecha_hora,
        fecha: new Date(m.fecha_hora).toLocaleString('es-ES', { hour12: false }),
        proveedor: m.Proveedor,
        imei: d.UnidadInventario.Imei_1,
        producto: d.UnidadInventario.Producto.nombre,
        modeloRef: d.UnidadInventario.Producto.modelo || 'N/A',
        marca: d.UnidadInventario.Producto.Marca?.nombre || 'Sin marca',
        color: d.UnidadInventario.Producto.Color?.nombre || 'Sin color',
        ram: d.UnidadInventario.Producto.Ram?.valor || 'N/A',
        almacenamiento: d.UnidadInventario.Producto.Almacenamiento?.Capacidad || 'N/A',
        // A diferencia de Ventas, aquí no necesitamos el proveedorOrigen porque el proveedor ya es el de la compra
      })));
  }, [movimientos]);

  // Filtrado de búsqueda en tiempo real (Ampliado para buscar por color, RAM, etc.)
  const comprasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return comprasProcesadas;
    const lowerSearch = searchTerm.toLowerCase().trim();
    return comprasProcesadas.filter(v => 
      v.marca.toLowerCase().includes(lowerSearch) ||
      v.producto.toLowerCase().includes(lowerSearch) ||
      v.modeloRef.toLowerCase().includes(lowerSearch) ||
      v.color.toLowerCase().includes(lowerSearch) ||
      v.ram.toLowerCase().includes(lowerSearch) ||
      v.almacenamiento.toLowerCase().includes(lowerSearch) ||
      v.imei.toLowerCase().includes(lowerSearch) ||
      v.fecha.toLowerCase().includes(lowerSearch) ||
      (v.proveedor?.nombre || '').toLowerCase().includes(lowerSearch)
    );
  }, [comprasProcesadas, searchTerm]);

  return (
    <div className="container mx-auto p-4 pt-24 text-white">
      
      {/* Encabezado y Barra de Búsqueda */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-400" /> Compras Realizadas
          </h1>
          <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            {comprasFiltradas.length} {comprasFiltradas.length === 1 ? 'compra' : 'compras'}
          </span>
        </div>
        <div className="relative w-full md:w-72 lg:w-96 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
          <input type="text" placeholder="Buscar por color, RAM, IMEI, proveedor..." className="w-full pl-10 pr-10 py-3 bg-slate-800/70 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-xs bg-slate-700/50 p-1 rounded-full hover:bg-slate-600">✕</button>}
        </div>
      </motion.div>

      {comprasFiltradas.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-3xl p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-4 min-h-[400px] shadow-2xl">
          <Truck className="w-16 h-16 text-slate-500/50" />
          <p className="text-xl font-semibold text-slate-300">{searchTerm.trim() ? 'No hay compras que coincidan' : 'Aún no hay compras registradas'}</p>
          {searchTerm.trim() && <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-400 hover:text-blue-300 underline text-sm">Limpiar búsqueda</button>}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {comprasFiltradas.map((v, idx) => (
              <motion.div layout key={v.id + v.imei} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2, delay: idx * 0.03 }} whileHover={{ y: -8, boxShadow: "0 15px 40px rgba(59, 130, 246, 0.15)" }} className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-lg font-bold text-white tracking-tight truncate group-hover:text-blue-300 transition-colors">{v.producto}</h3>
                      <span className="bg-slate-700/80 border border-white/10 text-slate-300 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold shrink-0 group-hover:bg-blue-900/50 group-hover:text-blue-300 group-hover:border-blue-500/30 transition-all">{v.marca}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded-full text-[10px] border border-white/5 text-slate-300"><Palette className="w-3 h-3 text-blue-300" /> {v.color}</span>
                      <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded-full text-[10px] border border-white/5 text-slate-300"><MemoryStick className="w-3 h-3 text-cyan-300" /> {v.ram}</span>
                      <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded-full text-[10px] border border-white/5 text-slate-300"><HardDrive className="w-3 h-3 text-purple-300" /> {v.almacenamiento}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Ref: <span className="text-white font-mono">{v.modeloRef}</span></div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5 group-hover:border-blue-500/20 transition-colors mt-1">
                    <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-300 truncate">{v.imei}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 truncate max-w-[50%]">
                      <Truck className="w-3 h-3 text-blue-400/70" />
                      <span className="truncate font-medium text-slate-300">{v.proveedor?.nombre || <span className="italic text-slate-500">Sin proveedor</span>}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-purple-400/60" />
                      <span className="font-mono">{v.fecha}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}