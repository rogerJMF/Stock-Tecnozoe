import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Smartphone, Tag, Search, Eye, Edit, Trash2, Plus, ShoppingBag, 
  X, Palette, Truck, ChevronDown, ChevronUp, List, LayoutGrid 
} from 'lucide-react';
import ModalAgregarProducto from './ModalAgregarProducto';
import ModalVender from './ModalVender';
import ModalGestionarGrupo from './ModalGestionarGrupo';
import ModalEditarProducto from './ModalEditarProducto';

export default function Dashboard() {
  const [productos, setProductos] = useState([]);
  const [catalogos, setCatalogos] = useState({ marcas: [], colores: [], rams: [], almacenamientos: [] });
  const [searchTerm, setSearchTerm] = useState('');

  const [showAgregar, setShowAgregar] = useState(false);
  const [showVender, setShowVender] = useState(false);
  const [grupoGestionar, setGrupoGestionar] = useState(null);
  const [grupoEditar, setGrupoEditar] = useState(null);
  const [grupoVerImeis, setGrupoVerImeis] = useState(null);

  // --- NUEVO ESTADO PARA EL ACORDEÓN ---
  const [expandedSections, setExpandedSections] = useState({});

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/productos`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/catalogos`)
      ]);
      setProductos(prodRes.data);
      setCatalogos(catRes.data);
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

  // --- Cálculo de Estadísticas Globales ---
  const stats = useMemo(() => {
    let totalStock = 0;
    let totalModelos = 0;
    Object.values(datosAgrupados).forEach(marca => {
      Object.values(marca.modelos).forEach(grupo => {
        totalStock += grupo.stockTotal;
        if (grupo.stockTotal > 0) totalModelos += 1;
      });
    });
    return {
      totalStock,
      totalBrands: Object.keys(datosAgrupados).length,
      totalModels: totalModelos
    };
  }, [datosAgrupados]);

  // --- Filtro de Búsqueda ---
  const marcasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return Object.keys(datosAgrupados).sort();
    const lowerSearch = searchTerm.toLowerCase().trim();
    return Object.keys(datosAgrupados).filter(marcaKey => {
      const grupo = datosAgrupados[marcaKey];
      const matchMarca = grupo.displayName.toLowerCase().includes(lowerSearch);
      const matchModelo = Object.values(grupo.modelos).some(m => 
        m.nombreModelo.toLowerCase().includes(lowerSearch) || 
        m.modeloRef.toLowerCase().includes(lowerSearch)
      );
      return matchMarca || matchModelo;
    }).sort();
  }, [datosAgrupados, searchTerm]);

  // --- Funciones del Acordeón ---
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
    <div className="container mx-auto p-2 sm:p-4 pt-20 sm:pt-24 text-white">
      
      {/* 1. ENCABEZADO Y ESTADÍSTICAS (Separación ampliada en PC) */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col md:flex-row justify-between items-center mb-4 sm:mb-8 gap-4 sm:gap-6 md:gap-8"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" /> Panel de Inventario
          </h1>
        </div>
        <div className="flex gap-2 sm:gap-3 md:gap-4 flex-wrap justify-center">
          <button onClick={() => setShowVender(true)} className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-green-500 to-emerald-500 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all text-white text-xs sm:text-sm font-medium">
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Vender
          </button>
          <button onClick={() => setShowAgregar(true)} className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all text-white text-xs sm:text-sm font-medium">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Agregar Producto
          </button>
        </div>
      </motion.div>

      {/* Tarjetas de Estadísticas */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8"
      >
        <motion.div whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(59,130,246,0.15)" }} className="bg-slate-800/60 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-3 sm:p-6 relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold tracking-wider">Stock Total Disponible</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 group-hover:text-blue-400 transition-colors">{stats.totalStock}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl text-blue-400"><Package className="w-5 h-5 sm:w-6 sm:h-6" /></div>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(168,85,247,0.15)" }} className="bg-slate-800/60 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-3 sm:p-6 relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold tracking-wider">Marcas Activas</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 group-hover:text-purple-400 transition-colors">{stats.totalBrands}</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl text-purple-400"><Tag className="w-5 h-5 sm:w-6 sm:h-6" /></div>
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(34,197,94,0.15)" }} className="bg-slate-800/60 backdrop-blur-sm border border-green-500/20 rounded-2xl p-3 sm:p-6 relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold tracking-wider">Modelos Únicos</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 group-hover:text-green-400 transition-colors">{stats.totalModels}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-500/20 rounded-xl text-green-400"><Smartphone className="w-5 h-5 sm:w-6 sm:h-6" /></div>
          </div>
        </motion.div>
      </motion.div>

      {/* 2. BARRA DE BÚSQUEDA Y CONTROLES DE PLIEGUE */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-4"
      >
        <div className="relative group flex-1 min-w-[150px] sm:min-w-[200px]">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por Marca o Modelo..." 
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2.5 bg-slate-800/70 backdrop-blur-sm border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button onClick={expandAll} className="bg-slate-700/50 hover:bg-slate-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all border border-white/5 text-[10px] sm:text-xs flex items-center gap-1">
            <LayoutGrid className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Desplegar todo</span>
          </button>
          <button onClick={collapseAll} className="bg-slate-700/50 hover:bg-slate-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all border border-white/5 text-[10px] sm:text-xs flex items-center gap-1">
            <List className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Plegar todo</span>
          </button>
        </div>
      </motion.div>

      {/* 3. TABLAS AGRUPADAS POR MARCA CON DISEÑO ACORDEÓN */}
      {marcasFiltradas.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 min-h-[200px] shadow-2xl">
          <Search className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500/50" />
          <p className="text-base sm:text-lg font-medium text-slate-300">No se encontraron marcas o modelos</p>
          <button onClick={() => setSearchTerm('')} className="text-blue-400 hover:text-blue-300 underline text-xs sm:text-sm">Limpiar búsqueda</button>
        </motion.div>
      ) : (
        marcasFiltradas.map(marcaKey => {
          const tituloMarca = marcaKey.charAt(0).toUpperCase() + marcaKey.slice(1);
          const modelos = Object.values(datosAgrupados[marcaKey].modelos).filter(g => g.stockTotal > 0);
          if (modelos.length === 0) return null;
          
          const isExpanded = expandedSections[marcaKey] || false;

          return (
            <div key={marcaKey} className="mb-3 sm:mb-4 bg-slate-800/30 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
              
              {/* ENCABEZADO DE LA SECCIÓN (ACORDEÓN) */}
              <button 
                onClick={() => toggleSection(marcaKey)}
                className="w-full flex justify-between items-center p-3 sm:p-4 bg-slate-800/50 hover:bg-slate-700/50 transition-all border-b border-white/5 group"
              >
                <h3 className="text-base sm:text-lg font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 h-2 bg-blue-500 rounded-full group-hover:animate-pulse"></span> 
                  Sección {tituloMarca} 
                  <span className="text-[10px] sm:text-xs font-normal text-slate-400 bg-slate-700/50 px-1.5 sm:px-2 py-0.5 rounded-full ml-2">
                    {modelos.reduce((acc, cur) => acc + cur.stockTotal, 0)} unidades
                  </span>
                </h3>
                <div className="flex items-center gap-1 sm:gap-2 text-slate-400 group-hover:text-white transition-colors">
                  <span className="text-[10px] sm:text-xs">{isExpanded ? 'Plegar' : 'Desplegar'}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                </div>
              </button>

              {/* CONTENIDO PLEGABLE */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden bg-slate-800/20"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] sm:text-sm text-left">
                        <thead className="bg-slate-700/50 text-slate-300 font-bold uppercase border-b border-white/10 text-[9px] sm:text-xs sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="p-2 sm:p-4 min-w-[100px]">Modelo</th>
                            <th className="p-2 sm:p-4 min-w-[80px]">Referencia</th>
                            <th className="p-2 sm:p-4 min-w-[80px]">RAM / Almacenamiento</th>
                            <th className="p-2 sm:p-4 min-w-[150px]">Colores y Proveedores (Stock)</th>
                            <th className="p-2 sm:p-4 text-center min-w-[40px]">Total</th>
                            <th className="p-2 sm:p-4 text-center min-w-[140px]">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          <AnimatePresence mode="wait">
                            {modelos.map((grupo, idx) => (
                              <motion.tr 
                                key={idx} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                transition={{ delay: idx * 0.03 }}
                                className="hover:bg-slate-700/30 transition-colors group"
                              >
                                <td className="p-2 sm:p-4 font-semibold text-white group-hover:text-blue-300 transition-colors">{grupo.nombreModelo}</td>
                                <td className="p-2 sm:p-4 text-slate-400">{grupo.modeloRef}</td>
                                <td className="p-2 sm:p-4 text-slate-300">{grupo.ram} / {grupo.almacenamiento}</td>
                                <td className="p-2 sm:p-4">
                                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                    {grupo.colores.filter(c => c.stockColor > 0).map((colorEntry, ci) => (
                                      <div key={ci} className="bg-slate-700/50 border border-white/5 rounded-full px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-xs flex flex-wrap gap-1 items-center">
                                        <span className="font-medium text-blue-300">{colorEntry.color}</span>
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
                                <td className="p-2 sm:p-4 text-center font-bold text-green-400 text-xs sm:text-base">{grupo.stockTotal}</td>
                                <td className="p-2 sm:p-4 text-center flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                                  <button onClick={() => setGrupoVerImeis(grupo)} className="flex items-center gap-0.5 sm:gap-1 bg-slate-700/50 hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-semibold border border-white/5 transition-all">
                                    <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Ver IMEIs</span>
                                  </button>
                                  <button onClick={() => setGrupoEditar(grupo)} className="flex items-center gap-0.5 sm:gap-1 bg-slate-700/50 hover:bg-yellow-500/20 text-slate-300 hover:text-yellow-300 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-semibold border border-white/5 transition-all">
                                    <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Editar</span>
                                  </button>
                                  <button onClick={() => setGrupoGestionar(grupo)} className="flex items-center gap-0.5 sm:gap-1 bg-slate-700/50 hover:bg-red-500/20 text-slate-300 hover:text-red-300 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-semibold border border-white/5 transition-all">
                                    <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Gestionar</span>
                                  </button>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
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

      {/* --- MODALES (Mantenidos intactos con el diseño original) --- */}
      {grupoVerImeis && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full p-6 text-white max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                <Package className="w-5 h-5 text-blue-400" /> Detalle de IMEIs - {grupoVerImeis.nombreModelo}
              </h2>
              <button onClick={() => setGrupoVerImeis(null)} className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-2 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full text-xs border border-blue-500/20">
                <Package className="w-3 h-3" /> {grupoVerImeis.stockTotal} unidades totales
              </span>
              <span className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full text-xs border border-purple-500/20">
                <Palette className="w-3 h-3" /> {grupoVerImeis.colores.filter(c => c.stockColor > 0).length} colores
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-inner">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800/60 text-slate-300 font-bold uppercase text-xs sticky top-0 z-10 backdrop-blur-md border-b border-white/10">
                    <tr>
                      <th className="p-4 w-1/5">Color</th>
                      <th className="p-4 w-1/5">Proveedor</th>
                      <th className="p-4 font-mono w-3/10">IMEI 1</th>
                      <th className="p-4 font-mono w-3/10">IMEI 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {grupoVerImeis.colores
                      .filter(c => c.stockColor > 0)
                      .map((colorEntry, ci) => (
                        colorEntry.proveedores.map((prov, pi) => (
                          prov.imeis.map((imei, ji) => (
                            <motion.tr 
                              key={`${ci}-${pi}-${ji}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: (ci + pi + ji) * 0.02 }}
                              className="hover:bg-slate-700/40 transition-colors group"
                            >
                              <td className="p-4">
                                {ci === 0 && pi === 0 && ji === 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 shadow-sm" />
                                    <span className="font-medium text-blue-300">{colorEntry.color}</span>
                                    <span className="text-slate-500 text-[10px] bg-slate-700/40 px-1.5 py-0.5 rounded-full">x{colorEntry.stockColor}</span>
                                  </div>
                                ) : (ci === 0 && pi === 0 && ji !== 0) ? (
                                  <span className="text-transparent select-none">-</span>
                                ) : (ci !== 0 && pi === 0 && ji === 0) ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 shadow-sm" />
                                    <span className="font-medium text-blue-300">{colorEntry.color}</span>
                                    <span className="text-slate-500 text-[10px] bg-slate-700/40 px-1.5 py-0.5 rounded-full">x{colorEntry.stockColor}</span>
                                  </div>
                                ) : null}
                              </td>
                              <td className="p-4">
                                {ji === 0 ? (
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-3.5 h-3.5 text-purple-400" />
                                    <span className="text-purple-300">{prov.proveedor}</span>
                                  </div>
                                ) : null}
                              </td>
                              <td className="p-4 font-mono text-xs text-slate-300 bg-black/20 rounded group-hover:text-white transition-colors">{imei.imei_1}</td>
                              <td className="p-4 font-mono text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                                {imei.imei_2 || <span className="text-slate-600 italic select-none text-[10px]">No tiene</span>}
                              </td>
                            </motion.tr>
                          ))
                        ))
                      ))}
                  </tbody>
                </table>
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