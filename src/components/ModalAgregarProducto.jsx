import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { X, PackagePlus, Smartphone, Tag, Cpu, HardDrive, Truck, User } from 'lucide-react';

export default function ModalAgregarProducto({ onClose, catalogos, onSave }) {
  const [proveedores, setProveedores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [form, setForm] = useState({
    nombre: '', 
    modelo: '', 
    Marca_id_Marca: '', 
    Color_id_Color: '', 
    Ram_id_Ram: '', 
    Almacenamiento_id_Almacenamiento: '', 
    imeisTexto: '',
    Proveedor_id_Proveedor: '', 
    nuevoProveedor: ''
  });

  // Cargar proveedores al abrir el modal
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/proveedores`).then(res => setProveedores(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Validar campos obligatorios
    if (!form.nombre.trim()) {
      alert('El nombre del producto es obligatorio.');
      setIsLoading(false);
      return;
    }
    if (!form.Marca_id_Marca) {
      alert('Debes seleccionar una marca.');
      setIsLoading(false);
      return;
    }

    // 2. Determinar el proveedor (Nuevo o Existente)
    let proveedorId = form.Proveedor_id_Proveedor;
    if (form.nuevoProveedor.trim() !== '' && proveedorId === '') {
      try {
        // CORRECCIÓN: Usamos la variable de entorno para la URL
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/proveedores`, { nombre: form.nuevoProveedor });
        proveedorId = res.data.id_Proveedor;
        // Actualizar la lista de proveedores localmente para que se vea reflejado
        setProveedores(prev => [...prev, res.data]);
      } catch (err) {
        alert('Error al crear el nuevo proveedor: ' + (err.response?.data?.error || err.message));
        setIsLoading(false);
        return;
      }
    }

    // 3. Procesar los IMEIs
    const lineas = form.imeisTexto.split('\n').filter(linea => linea.trim() !== '');
    if (lineas.length === 0) {
      alert('Debes escribir al menos un IMEI.');
      setIsLoading(false);
      return;
    }
    const unidades = lineas.map(linea => {
      const [imei1, imei2] = linea.split(',').map(s => s.trim());
      return { imei_1: imei1, imei_2: imei2 || null };
    });

    // 4. Enviar al servidor
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/productos`, { ...form, unidades, Proveedor_id_Proveedor: proveedorId });
      onSave();
      onClose();
    } catch (err) {
      alert('❌ Error al guardar el producto: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-white max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
          <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            <PackagePlus className="w-6 h-6 text-blue-400" /> Registrar Producto
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 p-2 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-5">
          
          {/* SECCIÓN 1: Datos Generales del Modelo */}
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Datos Generales
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1 relative group">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    required
                    placeholder="Nombre del producto (Ej: Samsung A07)" 
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.nombre}
                    onChange={e => setForm({...form, nombre: e.target.value})}
                  />
                </div>
                <div className="col-span-2 md:col-span-1 relative group">
                  <Cpu className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    placeholder="Modelo / Referencia (Ej: SM-A075G)" 
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.modelo}
                    onChange={e => setForm({...form, modelo: e.target.value})}
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <select 
                    required
                    className="w-full py-2.5 px-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.Marca_id_Marca}
                    onChange={e => setForm({...form, Marca_id_Marca: e.target.value})}
                  >
                    <option value="">Selecciona Marca</option>
                    {catalogos.marcas.map(m => <option key={m.id_Marca} value={m.id_Marca}>{m.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <select 
                    className="w-full py-2.5 px-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.Color_id_Color}
                    onChange={e => setForm({...form, Color_id_Color: e.target.value})}
                  >
                    <option value="">Selecciona Color</option>
                    {catalogos.colores.map(c => <option key={c.id_Color} value={c.id_Color}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <select 
                    className="w-full py-2.5 px-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.Ram_id_Ram}
                    onChange={e => setForm({...form, Ram_id_Ram: e.target.value})}
                  >
                    <option value="">Selecciona RAM</option>
                    {catalogos.rams.map(r => <option key={r.id_Ram} value={r.id_Ram}>{r.valor}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <select 
                    className="w-full py-2.5 px-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.Almacenamiento_id_Almacenamiento}
                    onChange={e => setForm({...form, Almacenamiento_id_Almacenamiento: e.target.value})}
                  >
                    <option value="">Selecciona Almacenamiento</option>
                    {catalogos.almacenamientos.map(a => <option key={a.id_Almacenamiento} value={a.id_Almacenamiento}>{a.Capacidad}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Proveedor */}
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Proveedor
              </h3>
              <p className="text-xs text-slate-400 mb-2">Selecciona uno existente o escribe el nombre de uno nuevo abajo.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1 relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                  <select 
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.Proveedor_id_Proveedor}
                    onChange={e => setForm({...form, Proveedor_id_Proveedor: e.target.value, nuevoProveedor: ''})}
                  >
                    <option value="">Selecciona un proveedor existente</option>
                    {proveedores.map(p => <option key={p.id_Proveedor} value={p.id_Proveedor}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <input 
                    placeholder="O escribe un nuevo proveedor aquí..." 
                    className="w-full py-2.5 px-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={form.nuevoProveedor}
                    onChange={e => setForm({...form, nuevoProveedor: e.target.value, Proveedor_id_Proveedor: ''})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: IMEIs */}
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-green-300 mb-2 flex items-center gap-2">
                <HardDrive className="w-4 h-4" /> IMEIs (Por línea, separados por coma)
              </h3>
              <p className="text-xs text-slate-400 mb-3">Escribe el IMEI 1 y el IMEI 2 separados por una coma. Ejemplo: <span className="text-white">86568494030, 3453545545</span></p>
              
              <textarea 
                required
                className="w-full h-28 p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                placeholder="86568494030, 3453545545"
                value={form.imeisTexto}
                onChange={e => setForm({...form, imeisTexto: e.target.value})}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10 sticky bottom-0 bg-slate-800/90 backdrop-blur-xl pb-1">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all">Cancelar</button>
            <button 
              type="submit" 
              disabled={isLoading}
              className={`px-6 py-2 rounded-xl transition-all font-bold shadow-lg text-white flex items-center gap-2
                ${isLoading 
                  ? 'bg-slate-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:scale-105 shadow-blue-500/30 hover:shadow-blue-500/50'
                }`}
            >
              {isLoading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}