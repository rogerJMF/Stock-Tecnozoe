import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Smartphone, Tag, User, CreditCard, Phone, CheckCircle, X } from 'lucide-react';

export default function ModalVender({ onClose, onSave }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isSearching, setIsSearching] = useState(true);
  const [clientData, setClientData] = useState({ nombre: '', cedula: '', telefono: '' });

  // Cargar todos los productos disponibles al abrir el modal
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/productos`).then(res => {
      setProducts(res.data);
    });
  }, []);

  // Aplanar la estructura: Convertir todos los "productos" en una lista plana de "unidades" (cada IMEI)
  const allUnits = useMemo(() => {
    const list = [];
    products.forEach(p => {
      p.unidades.forEach(u => {
        list.push({
          id: u.id_UnidadInventario,
          imei_1: u.Imei_1,
          imei_2: u.Imei_2,
          producto: p.nombre,
          marca: p.Marca?.nombre || 'Sin marca',
          modelo: p.modelo || '-'
        });
      });
    });
    return list;
  }, [products]);

  // Filtrar en tiempo real por IMEI, Nombre, Marca o Modelo
  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase().trim();
    return allUnits
      .filter(u => 
        u.imei_1.toLowerCase().includes(lower) ||
        u.producto.toLowerCase().includes(lower) ||
        u.marca.toLowerCase().includes(lower) ||
        u.modelo.toLowerCase().includes(lower)
      )
      .slice(0, 8); // Limitamos a 8 resultados para que sea rápido y no se sature el modal
  }, [allUnits, searchTerm]);

  // Seleccionar una unidad para vender
  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit);
    setIsSearching(false);
    setSearchTerm('');
  };

  // Cambiar de unidad seleccionada (volver a buscar)
  const handleChangeUnit = () => {
    setSelectedUnit(null);
    setIsSearching(true);
    setSearchTerm('');
  };

  // Confirmar la venta y enviar al servidor
  const handleConfirmSale = async () => {
    if (!selectedUnit) return alert('Primero debes seleccionar un teléfono.');
    if (!clientData.nombre.trim()) return alert('El nombre del cliente es obligatorio.');

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/ventas`, {
        unidadInventarioId: selectedUnit.id,
        nombreCliente: clientData.nombre,
        cedulaCliente: clientData.cedula,
        telefonoCliente: clientData.telefono,
      });
      onSave(); // Refrescar datos principales
      onClose();
    } catch (err) {
      alert('❌ Error al registrar la venta: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-white max-h-[90vh] flex flex-col"
      >
        <h2 className="text-2xl font-bold mb-4 text-green-400 flex items-center gap-3">
          <Smartphone className="w-6 h-6" /> Registrar Venta
        </h2>

        <div className="flex-1 overflow-y-auto pr-2 space-y-5">
          
          {/* PASO 1: Búsqueda y selección del producto */}
          {isSearching ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-3"
            >
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Buscar por IMEI, Nombre, Marca o Modelo..." 
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchTerm.trim() && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="max-h-56 overflow-y-auto space-y-2 border-t border-white/5 pt-3"
                >
                  {filteredUnits.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">No se encontraron coincidencias.</p>
                  ) : (
                    filteredUnits.map((u) => (
                      <motion.div
                        key={u.id}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
                        onClick={() => handleSelectUnit(u)}
                        className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl cursor-pointer border border-white/5 group hover:border-green-500/30 transition-all"
                      >
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-semibold text-white truncate group-hover:text-green-300 transition-colors">{u.producto}</span>
                          <div className="flex gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {u.marca}</span>
                            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {u.modelo}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-300 bg-black/30 px-2 py-1 rounded">{u.imei_1}</span>
                          <span className="text-xs text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">Seleccionar →</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (
            // PASO 2: Producto seleccionado
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4 flex justify-between items-center relative group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/20 rounded-xl text-green-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white group-hover:text-green-300 transition-colors">{selectedUnit.producto}</p>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span>Marca: <span className="text-slate-300">{selectedUnit.marca}</span></span>
                    <span>Modelo: <span className="text-slate-300">{selectedUnit.modelo}</span></span>
                  </div>
                  <p className="font-mono text-xs text-blue-300 mt-1">IMEI: {selectedUnit.imei_1}</p>
                </div>
              </div>
              <button 
                onClick={handleChangeUnit}
                className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 p-2 rounded-full transition-all"
                title="Cambiar de producto"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* PASO 3: Datos del Cliente (Siempre visible cuando hay un producto seleccionado) */}
          {!isSearching && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-white/10 pt-4 space-y-3"
            >
              <p className="text-sm text-slate-400 font-medium">Datos del Cliente</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Nombre completo *" 
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    value={clientData.nombre}
                    onChange={e => setClientData({...clientData, nombre: e.target.value})}
                  />
                </div>
                <div className="relative group">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Cédula / NIT (Opcional)" 
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    value={clientData.cedula}
                    onChange={e => setClientData({...clientData, cedula: e.target.value})}
                  />
                </div>
                <div className="relative group md:col-span-2">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Teléfono (Opcional)" 
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    value={clientData.telefono}
                    onChange={e => setClientData({...clientData, telefono: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all">Cancelar</button>
          <button 
            onClick={handleConfirmSale} 
            disabled={isSearching}
            className={`px-6 py-2 rounded-xl transition-all font-bold shadow-lg text-white flex items-center gap-2
              ${isSearching 
                ? 'bg-slate-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105 shadow-green-500/30 hover:shadow-green-500/50'
              }`}
          >
            <CheckCircle className="w-4 h-4" /> Confirmar Venta
          </button>
        </div>
      </motion.div>
    </div>
  );
}