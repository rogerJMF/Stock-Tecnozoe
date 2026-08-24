import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Smartphone, Tag, Search, Eye, Edit, Trash2, Plus, ShoppingBag, 
  X, Palette, Truck, ChevronDown, ChevronUp, List, LayoutGrid, TrendingUp, Boxes
} from 'lucide-react';
import ModalAgregarProducto from './ModalAgregarProducto';
import ModalVender from './ModalVender';
import ModalGestionarGrupo from './ModalGestionarGrupo';
import ModalEditarProducto from './ModalEditarProducto';

export default function Dashboard() {
  const [productos, setProductos] = useState([]);
  const [catalogos, setCatalogos] = useState({ marcas: [], colores: [], rams: [], almacenamientos: [] });
  const [movements, setMovements] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');

  const [showAgregar, setShowAgregar] = useState(false);
  const [showVender, setShowVender] = useState(false);
  const [grupoGestionar, setGrupoGestionar] = useState(null);
  const [grupoEditar, setGrupoEditar] = useState(null);
  const [grupoVerImeis, setGrupoVerImeis] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const fetchData = async () => {
    try {
      const [prodRes, catRes, movRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/productos`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/catalogos`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/movimientos`)
      ]);
      setProductos(prodRes.data);
      setCatalogos(catRes.data);
      setMovements(movRes.data);
    } catch (e) { console.error("Error cargando datos", e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Lógica de Agrupación (Sin cambios) ---
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
        stockTotal: 0
      };
    }
    const grupo = datosAgrupados[marcaKey].modelos[claveModelo];
    grupo.ids.push(p.id_Producto);
    p.unidades.forEach(u => {
      const color = p.Color?.nombre || 'Sin Color';
      const proveedor = p.proveedor?.nombre || 'Sin proveedor';
      const proveedorId = p.proveedor?.id_Proveedor || null;
      
      let colorEntry = grupo.colores.find(c => c.color === color);
      if (!colorEntry) {
        colorEntry = { color, colorId: p.Color_id_Color, proveedores: [], stockColor: 0 };
        grupo.colores.push(colorEntry);
      }
      let provEntry = colorEntry.proveedores.find(prov => prov.proveedor === proveedor);
      if (!provEntry) {
        provEntry = { proveedor, proveedorId, imeis: [], stock: 0 };
        colorEntry.proveedores.push(provEntry);
      }
      provEntry.imeis.push({ id: u.id_UnidadInventario, imei_1: u.Imei_1, imei_2: u.Imei_2, productoId: p.id_Producto });
      provEntry.stock += 1;
      colorEntry.stockColor += 1;
      grupo.stockTotal += 1;
    });
  });

  const stats = useMemo(() => {
    let totalStock = 0;
    let totalModelos = 0;
    let totalMarcasActivas = 0;
    Object.entries(datosAgrupados).forEach(([marcaKey, marcaData]) => {
      let marcaTieneStock = false;
      Object.values(marcaData.modelos).forEach(grupo => {
        totalStock += grupo.stockTotal;
        if (grupo.stockTotal > 0) {
          totalModelos += 1;
          marcaTieneStock = true;
        }
      });
      if (marcaTieneStock) totalMarcasActivas += 1;
    });

    const totalMovimientos = movements.length;
    const hoy = new Date().toDateString();
    const movimientosHoy = movements.filter(m => 
      new Date(m.fecha_hora).toDateString() === hoy
    ).length;

    return {
      totalStock,
      totalBrands: totalMarcasActivas,
      totalModels: totalModelos,
      totalMovimientos,
      movimientosHoy
    };
  }, [datosAgrupados, movements]);

  const marcasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return Object.keys(datosAgrupados).sort();
    const lowerSearch = searchTerm.toLowerCase().trim();
    return Object.keys(datosAgrupados).filter(marcaKey => {
      const grupo = datosAgrupados[marcaKey];
      return grupo.displayName.toLowerCase().includes(lowerSearch) || 
             Object.values(grupo.modelos).some(m => m.nombreModelo.toLowerCase().includes(lowerSearch));
    }).sort();
  }, [datosAgrupados, searchTerm]);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const expandAll = () => {
    const allExpanded = {};
    marcasFiltradas.forEach(key => allExpanded[key] = true);
    setExpandedSections(allExpanded);
  };
  const collapseAll = () => {
    setExpandedSections({});
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 pt-24 sm:pt-28 text-white relative">
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* 1. ENCABEZADO CON ESTILO TECNOLÓGICO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-6 sm:mb-10 gap-4">
        <h1 className="text-2xl sm:text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent tracking-tight">
          Panel de Inventario
        </h1>
        <div className="flex gap-2 sm:gap-3">
          <button onClick={() => setShowVender(true)} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all text-white font-semibold text-xs sm:text-base">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" /> Vender
          </button>
          <button onClick={() => setShowAgregar(true)} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all text-white font-semibold text-xs sm:text-base">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Agregar Producto
          </button>
        </div>
      </motion.div>

      {/* 2. TARJETAS DE ESTADÍSTICAS CON GRADIENTES */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div whileHover={{ y: -5, boxShadow: "0 15px 40px rgba(6,182,212,0.2)" }} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/20 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Stock</p>
              <p className="text-4xl font-bold mt-1 text-cyan-300">{stats.totalStock}</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><Boxes className="w-5 h-5" /></div>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5, boxShadow: "0 15px 40px rgba(168,85,247,0.2)" }} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/20 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Marcas</p>
              <p className="text-4xl font-bold mt-1 text-purple-300">{stats.totalBrands}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Tag className="w-5 h-5" /></div>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5, boxShadow: "0 15px 40px rgba(34,197,94,0.2)" }} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-green-500/20 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Modelos</p>
              <p className="text-4xl font-bold mt-1 text-green-300">{stats.totalModels}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl text-green-400"><Smartphone className="w-5 h-5" /></div>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5, boxShadow: "0 15px 40px rgba(59,130,246,0.2)" }} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-blue-500/20 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Movimientos</p>
              <p className="text-4xl font-bold mt-1 text-blue-300">{stats.totalMovimientos}</p>
              <p className="text-xs text-slate-500 mt-1">Hoy: {stats.movimientosHoy}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><TrendingUp className="w-5 h-5" /></div>
          </div>
        </motion.div>
      </motion.div>

      {/* 3. BARRA DE BÚSQUEDA Y CONTROLES */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-6 bg-slate-800/50 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
            <input type="text" placeholder="Buscar por Marca o Modelo..." className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={expandAll} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-slate-700/60 hover:bg-slate-600 px-3 py-2 rounded-lg text-xs text-slate-200 border border-white/10 transition-all">
              <LayoutGrid className="w-3 h-3" /> Desplegar
            </button>
            <button onClick={collapseAll} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-slate-700/60 hover:bg-slate-600 px-3 py-2 rounded-lg text-xs text-slate-200 border border-white/10 transition-all">
              <List className="w-3 h-3" /> Plegar
            </button>
          </div>
        </div>
      </motion.div>

      {/* 4. TABLAS CON EFECTO GLASS (Con scroll horizontal en móvil) */}
      <div className="relative z-10">
        {marcasFiltradas.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-3xl p-12 text-center text-slate-300 flex flex-col items-center justify-center gap-3 min-h-[200px]">
            <Search className="w-12 h-12 text-slate-500" />
            <p className="text-lg font-medium">No se encontraron marcas o modelos</p>
            <button onClick={() => setSearchTerm('')} className="text-cyan-400 hover:underline text-sm">Limpiar búsqueda</button>
          </motion.div>
        ) : (
          marcasFiltradas.map(marcaKey => {
            const tituloMarca = marcaKey.charAt(0).toUpperCase() + marcaKey.slice(1);
            const modelos = Object.values(datosAgrupados[marcaKey].modelos).filter(g => g.stockTotal > 0);
            if (modelos.length === 0) return null;
            const isExpanded = expandedSections[marcaKey] || false;
            return (
              <div key={marcaKey} className="mb-4 bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl backdrop-blur-lg">
                <button onClick={() => toggleSection(marcaKey)} className="w-full flex justify-between items-center p-4 bg-slate-800/40 hover:bg-slate-700/40 transition-all border-b border-white/10 group">
                  <h3 className="text-base sm:text-lg font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                    {tituloMarca}
                    <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{modelos.reduce((acc, cur) => acc + cur.stockTotal, 0)} unid.</span>
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
                    <span className="text-xs">{isExpanded ? 'Plegar' : 'Desplegar'}</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                      {/* AQUÍ ESTÁ EL SCROLL HORIZONTAL EN MÓVIL */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[800px]"> {/* min-w para forzar el scroll en móvil */}
                          <thead className="bg-slate-800/60 text-slate-300 font-bold uppercase border-b border-white/10 text-xs">
                            <tr>
                              <th className="p-3 sm:p-4">Modelo</th>
                              <th className="p-3 sm:p-4">Ref.</th>
                              <th className="p-3 sm:p-4">RAM / Almac.</th>
                              <th className="p-3 sm:p-4">Colores y Proveedores</th>
                              <th className="p-3 sm:p-4 text-center">Total</th>
                              <th className="p-3 sm:p-4 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {modelos.map((grupo, idx) => (
                              <motion.tr key={idx} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-3 sm:p-4 font-semibold text-white group-hover:text-cyan-300">{grupo.nombreModelo}</td>
                                <td className="p-3 sm:p-4 text-slate-400">{grupo.modeloRef}</td>
                                <td className="p-3 sm:p-4 text-slate-300">{grupo.ram} / {grupo.almacenamiento}</td>
                                <td className="p-3 sm:p-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    {grupo.colores.filter(c => c.stockColor > 0).map((colorEntry, ci) => (
                                      <div key={ci} className="bg-slate-800/80 border border-white/5 rounded-full px-2.5 py-1 text-xs flex flex-wrap gap-1 items-center">
                                        <span className="font-medium text-cyan-300">{colorEntry.color}</span>
                                        <span className="text-slate-400">|</span>
                                        {colorEntry.proveedores.map((prov, pi) => (
                                          <span key={pi} className="flex items-center gap-1">
                                            <span className="text-purple-300">{prov.proveedor}</span>
                                            <span className="text-green-400 font-bold">({prov.stock})</span>
                                            {pi < colorEntry.proveedores.length - 1 && <span className="text-slate-500">,</span>}
                                          </span>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 sm:p-4 text-center font-bold text-green-400">{grupo.stockTotal}</td>
                                <td className="p-3 sm:p-4">
                                  {/* Botones compactos y fáciles de tocar en móvil */}
                                  <div className="flex flex-wrap gap-1.5 justify-center">
                                    <button onClick={() => setGrupoVerImeis(grupo)} className="text-xs text-cyan-400 hover:text-cyan-300 bg-slate-700/40 px-2 py-1 rounded-lg whitespace-nowrap">Ver IMEIs</button>
                                    <button onClick={() => setGrupoEditar(grupo)} className="text-xs text-yellow-400 hover:text-yellow-300 bg-slate-700/40 px-2 py-1 rounded-lg whitespace-nowrap">Editar</button>
                                    <button onClick={() => setGrupoGestionar(grupo)} className="text-xs text-red-400 hover:text-red-300 bg-slate-700/40 px-2 py-1 rounded-lg whitespace-nowrap">Gestionar</button>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* --- MODALES --- */}
      {grupoVerImeis && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl p-4 sm:p-6 text-white max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"><Package className="w-5 h-5 text-cyan-400" /> Detalle de IMEIs - {grupoVerImeis.nombreModelo}</h2>
              <button onClick={() => setGrupoVerImeis(null)} className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-2 rounded-full transition-all"><X className="w-5 h-5" /></button>
            </div>
            
            {/* AQUÍ ESTÁ EL SCROLL DEL MODAL */}
            <div className="flex-1 overflow-y-auto pr-2">
              {/* AQUÍ ESTÁ EL SCROLL HORIZONTAL DE LA TABLA DENTRO DEL MODAL */}
              <div className="overflow-x-auto">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-slate-800/60 text-slate-300 font-bold uppercase text-xs sticky top-0 z-10 backdrop-blur-md border-b border-white/10">
                      <tr>
                        <th className="p-4 w-1/5">Color</th>
                        <th className="p-4 w-1/5">Proveedor</th>
                        <th className="p-4 font-mono w-3/10">IMEI 1</th>
                        <th className="p-4 font-mono w-3/10">IMEI 2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {grupoVerImeis.colores.filter(c => c.stockColor > 0).map((colorEntry, ci) => (
                        colorEntry.proveedores.map((prov, pi) => (
                          prov.imeis.map((imei, ji) => (
                            <motion.tr key={`${ci}-${pi}-${ji}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (ci + pi + ji) * 0.02 }} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-4 text-cyan-300">{ci === 0 && pi === 0 && ji === 0 ? colorEntry.color : ''}</td>
                              <td className="p-4 text-purple-300">{pi === 0 && ji === 0 ? prov.proveedor : ''}</td>
                              <td className="p-4 font-mono text-xs text-slate-300">{imei.imei_1}</td>
                              <td className="p-4 font-mono text-xs text-slate-400">{imei.imei_2 || '-'}</td>
                            </motion.tr>
                          ))
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
              <button onClick={() => setGrupoVerImeis(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all text-sm font-medium border border-white/10">Cerrar</button>
            </div>
          </motion.div>
        </div>
      )}
      {grupoGestionar && <ModalGestionarGrupo grupo={grupoGestionar} onClose={() => setGrupoGestionar(null)} onSave={fetchData} />}
      {grupoEditar && <ModalEditarProducto grupo={grupoEditar} catalogos={catalogos} onClose={() => setGrupoEditar(null)} onSave={fetchData} />}
      {showAgregar && <ModalAgregarProducto onClose={() => setShowAgregar(false)} catalogos={catalogos} onSave={fetchData} />}
      {showVender && <ModalVender onClose={() => setShowVender(false)} onSave={fetchData} />}
    </div>
  );
}