import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { X, Smartphone, Edit, Cpu, HardDrive, Palette, Truck, CheckCircle } from 'lucide-react';

export default function ModalEditarProducto({ grupo, catalogos, onClose, onSave }) {
  // --- Estados del flujo ---
  const [step, setStep] = useState('select'); // 'select' | 'options' | 'edit'
  const [selectedVariant, setSelectedVariant] = useState(null); // { color, colorId, proveedor, proveedorId, imeis }
  const [editMode, setEditMode] = useState(null); // 'all' | 'single'
  const [selectedImeiIndex, setSelectedImeiIndex] = useState(null);
  const [proveedores, setProveedores] = useState([]);

  // --- Estados del formulario ---
  const [form, setForm] = useState({
    nombre: grupo.nombreModelo,
    modelo: grupo.modeloRef,
    ramId: grupo.ramId || '',
    almacenamientoId: grupo.almacenamientoId || '',
    colorId: '',
    proveedorId: ''
  });

  // --- Estados para edición de IMEIs ---
  const [imeiEdit, setImeiEdit] = useState({ imei_1: '', imei_2: '' });

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/proveedores`).then(res => setProveedores(res.data));
  }, []);

  // --- Paso 1: Seleccionar Variante ---
  const handleSelectVariant = (color, colorId, proveedor, proveedorId, imeis) => {
    setSelectedVariant({ color, colorId, proveedor, proveedorId, imeis });
    setForm(prev => ({
      ...prev,
      colorId: colorId || '',
      proveedorId: proveedorId || ''
    }));
    setStep('options');
  };

  // --- Paso 2: Elegir modo de edición ---
  const handleModeSelect = (mode) => {
    setEditMode(mode);
    if (mode === 'single' && selectedVariant) {
      // Si es single, seleccionamos el primer IMEI por defecto y prellenamos su edición
      setSelectedImeiIndex(0);
      const firstImei = selectedVariant.imeis[0];
      setImeiEdit({
        imei_1: firstImei.imei_1,
        imei_2: firstImei.imei_2 || ''
      });
      // Prellenamos el formulario con los datos actuales del grupo (el IMEI hereda esto)
      setForm(prev => ({
        ...prev,
        nombre: grupo.nombreModelo,
        modelo: grupo.modeloRef,
        ramId: grupo.ramId || '',
        almacenamientoId: grupo.almacenamientoId || '',
        colorId: selectedVariant.colorId || '',
        proveedorId: selectedVariant.proveedorId || ''
      }));
    } else if (mode === 'all') {
      setForm(prev => ({
        ...prev,
        nombre: grupo.nombreModelo,
        modelo: grupo.modeloRef,
        ramId: grupo.ramId || '',
        almacenamientoId: grupo.almacenamientoId || '',
        colorId: selectedVariant.colorId || '',
        proveedorId: selectedVariant.proveedorId || ''
      }));
    }
    setStep('edit');
  };

  // --- Manejo de cambios en IMEI específico ---
  const handleImeiChange = (field, value) => {
    setImeiEdit(prev => ({ ...prev, [field]: value }));
  };

  // --- Lógica de Guardado ---
  const handleSave = async () => {
    try {
      // Si se edita TODA la variante
      if (editMode === 'all') {
        const targetProductId = selectedVariant.imeis[0].productoId;
        const idsViejos = selectedVariant.imeis.map(i => i.id);
        
        const coreChanged = 
          form.nombre.trim() !== grupo.nombreModelo.trim() ||
          form.modelo.trim() !== grupo.modeloRef.trim() ||
          form.ramId !== grupo.ramId ||
          form.almacenamientoId !== grupo.almacenamientoId;

        if (coreChanged) {
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/productos`, {
            nombre: form.nombre,
            modelo: form.modelo,
            Marca_id_Marca: grupo.marcaId,
            Color_id_Color: form.colorId || grupo.colorId,
            Ram_id_Ram: form.ramId,
            Almacenamiento_id_Almacenamiento: form.almacenamientoId,
            Proveedor_id_Proveedor: form.proveedorId || selectedVariant.proveedorId,
            Stock_minimo_alerta: 3,
            unidades: []
          });
          const nuevoProductoId = res.data.id_Producto;

          await axios.patch(`${import.meta.env.VITE_API_URL}/api/unidades/mover`, {
            unidadIds: idsViejos,
            nuevoProductoId: nuevoProductoId
          });

          if (form.proveedorId && form.proveedorId !== selectedVariant.proveedorId) {
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/variantes/proveedor`, {
              unidadIds: idsViejos,
              proveedorId: parseInt(form.proveedorId)
            });
          }
        } else {
          if (form.colorId && form.colorId !== selectedVariant.colorId) {
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/productos/${targetProductId}`, {
              Color_id_Color: parseInt(form.colorId)
            });
          }
          if (form.proveedorId && form.proveedorId !== selectedVariant.proveedorId) {
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/variantes/proveedor`, {
              unidadIds: idsViejos,
              proveedorId: parseInt(form.proveedorId)
            });
          }
        }
      } 
      
      // 2. Si se edita un IMEI individual (¡AHORA PUEDE EDITAR CUALQUIER CAMPO!)
      else if (editMode === 'single') {
        const selectedImei = selectedVariant.imeis[selectedImeiIndex];
        const targetProductId = selectedImei.productoId;
        
        // Detectar cambios en atributos base del modelo para este solo IMEI
        const coreChanged = 
          form.nombre.trim() !== grupo.nombreModelo.trim() ||
          form.modelo.trim() !== grupo.modeloRef.trim() ||
          form.ramId !== grupo.ramId ||
          form.almacenamientoId !== grupo.almacenamientoId;

        const colorChanged = form.colorId && form.colorId !== selectedVariant.colorId;
        const providerChanged = form.proveedorId && form.proveedorId !== selectedVariant.proveedorId;
        const imeiChanged = 
          imeiEdit.imei_1 !== selectedImei.imei_1 ||
          imeiEdit.imei_2 !== (selectedImei.imei_2 || '');

        // SI CAMBIA RAM, ALMACENAMIENTO, NOMBRE O MODELO -> DEBE CREAR UN PRODUCTO NUEVO Y MOVER SOLO ESE IMEI
        if (coreChanged || colorChanged || providerChanged) {
          // Crear producto nuevo sin IMEIs
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/productos`, {
            nombre: form.nombre,
            modelo: form.modelo,
            Marca_id_Marca: grupo.marcaId,
            Color_id_Color: form.colorId || grupo.colorId,
            Ram_id_Ram: form.ramId,
            Almacenamiento_id_Almacenamiento: form.almacenamientoId,
            Proveedor_id_Proveedor: form.proveedorId || selectedVariant.proveedorId,
            Stock_minimo_alerta: 3,
            unidades: []
          });
          const nuevoProductoId = res.data.id_Producto;

          // Mover SOLO este IMEI específico al nuevo producto
          await axios.patch(`${import.meta.env.VITE_API_URL}/api/unidades/mover`, {
            unidadIds: [selectedImei.id],
            nuevoProductoId: nuevoProductoId
          });

          // Actualizar el número de IMEI del nuevo producto si cambió
          if (imeiChanged) {
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/productos/${nuevoProductoId}`, {
              unidades: [{ id: selectedImei.id, imei_1: imeiEdit.imei_1, imei_2: imeiEdit.imei_2 || null }]
            });
          }
        } 
        // SI SOLO CAMBIÓ EL NÚMERO DE IMEI (pero no los atributos base)
        else if (imeiChanged) {
          await axios.patch(`${import.meta.env.VITE_API_URL}/api/productos/${targetProductId}`, {
            unidades: [{ id: selectedImei.id, imei_1: imeiEdit.imei_1, imei_2: imeiEdit.imei_2 || null }]
          });
        }
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar los cambios: ' + (err.response?.data?.error || err.message));
    }
  };

  // --- Renderizado Paso 1: Seleccionar Variante ---
  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-white"
        >
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              <Edit className="w-5 h-5 text-yellow-400" /> Selecciona qué editar
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-2 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-400 mb-4">Elige la variante exacta (Color + Proveedor) que deseas modificar.</p>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {grupo.colores.filter(c => c.stockColor > 0).map((colorEntry, ci) => (
              colorEntry.proveedores.map((prov, pi) => (
                <motion.div
                  key={`${ci}-${pi}`}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
                  onClick={() => handleSelectVariant(colorEntry.color, colorEntry.colorId, prov.proveedor, prov.proveedorId, prov.imeis)}
                  className="p-3 bg-slate-700/30 rounded-xl cursor-pointer border border-white/5 hover:border-yellow-400/30 transition-all flex justify-between items-center group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
                    <span className="font-medium text-blue-300">{colorEntry.color}</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-purple-300">{prov.proveedor}</span>
                  </div>
                  <span className="bg-slate-700/50 px-2 py-0.5 rounded-full text-xs text-green-300 border border-white/5">
                    {prov.stock} unid.
                  </span>
                </motion.div>
              ))
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all">Cancelar</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Renderizado Paso 2: Elegir modo ---
  if (step === 'options') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-white"
        >
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              <Edit className="w-5 h-5 text-yellow-400" /> ¿Qué quieres editar?
            </h2>
            <button onClick={() => setStep('select')} className="text-slate-400 hover:text-white text-sm bg-slate-700/50 hover:bg-slate-700 px-3 py-1 rounded-full transition-all">
              ← Volver
            </button>
          </div>
          <p className="text-slate-400 mb-4">
            Variante seleccionada: <span className="text-blue-300 font-medium">{selectedVariant.color}</span> - <span className="text-purple-300 font-medium">{selectedVariant.proveedor}</span> ({selectedVariant.imeis.length} unidades)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(59,130,246,0.2)" }}
              onClick={() => handleModeSelect('all')}
              className="p-5 bg-slate-800/50 border border-blue-500/30 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-all flex flex-col items-center text-center"
            >
              <Smartphone className="w-10 h-10 text-blue-400 mb-2" />
              <h3 className="text-lg font-bold text-white">Toda la variante</h3>
              <p className="text-xs text-slate-400 mt-1">Cambiar RAM, Almacenamiento, Color o Proveedor para <span className="font-bold text-blue-300">todas</span> las unidades de este grupo.</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(168,85,247,0.2)" }}
              onClick={() => handleModeSelect('single')}
              className="p-5 bg-slate-800/50 border border-purple-500/30 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-all flex flex-col items-center text-center"
            >
              <HardDrive className="w-10 h-10 text-purple-400 mb-2" />
              <h3 className="text-lg font-bold text-white">Un IMEI específico</h3>
              <p className="text-xs text-slate-400 mt-1">Editar un solo teléfono individual. Puedes cambiarle <span className="font-bold text-purple-300">cualquier atributo</span> (RAM, Color, Proveedor, IMEI, etc.).</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Renderizado Paso 3: Formulario de Edición (Completamente expandido para ambos modos) ---
  if (step === 'edit') {
    // Determinamos el título y el texto del modo
    const modeTitle = editMode === 'all' 
      ? `Editando toda la variante: ${selectedVariant.color} - ${selectedVariant.proveedor}`
      : `Editando IMEI #${selectedImeiIndex + 1} de ${selectedVariant.color} - ${selectedVariant.proveedor}`;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full p-6 text-white max-h-[90vh] flex flex-col"
        >
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              <Edit className="w-5 h-5 text-yellow-400" /> {modeTitle}
            </h2>
            <button onClick={() => setStep('options')} className="text-slate-400 hover:text-white text-sm bg-slate-700/50 hover:bg-slate-700 px-3 py-1 rounded-full transition-all">
              ← Cambiar modo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            
            {/* SECCIÓN 1: Datos Generales (Visible para ambos modos) */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Atributos del Modelo
              </h3>
              <p className="text-[10px] text-slate-400 mb-2">
                {editMode === 'all' 
                  ? 'Aplica a todo el grupo.' 
                  : 'Si cambias estos datos, el teléfono se moverá a un nuevo modelo (creando un producto nuevo).'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre</label>
                  <input className="w-full p-2 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-yellow-500" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Referencia (Modelo)</label>
                  <input className="w-full p-2 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-yellow-500" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">RAM</label>
                  <select className="w-full p-2 bg-black/40 border border-white/10 rounded-xl" value={form.ramId} onChange={e => setForm({...form, ramId: e.target.value})}>
                    <option value="">Sin RAM</option>
                    {catalogos.rams.map(r => <option key={r.id_Ram} value={r.id_Ram}>{r.valor}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Almacenamiento</label>
                  <select className="w-full p-2 bg-black/40 border border-white/10 rounded-xl" value={form.almacenamientoId} onChange={e => setForm({...form, almacenamientoId: e.target.value})}>
                    <option value="">Sin Almacenamiento</option>
                    {catalogos.almacenamientos.map(a => <option key={a.id_Almacenamiento} value={a.id_Almacenamiento}>{a.Capacidad}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Color y Proveedor (Visible para ambos modos) */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Color y Proveedor
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Color</label>
                  <select className="w-full p-2 bg-black/40 border border-white/10 rounded-xl" value={form.colorId} onChange={e => setForm({...form, colorId: e.target.value})}>
                    <option value="">Selecciona Color</option>
                    {catalogos.colores.map(c => <option key={c.id_Color} value={c.id_Color}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Proveedor</label>
                  <select className="w-full p-2 bg-black/40 border border-white/10 rounded-xl" value={form.proveedorId} onChange={e => setForm({...form, proveedorId: e.target.value})}>
                    <option value="">Selecciona Proveedor</option>
                    {proveedores.map(p => <option key={p.id_Proveedor} value={p.id_Proveedor}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Edición de IMEIs */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-green-300 mb-3 flex items-center gap-2">
                <HardDrive className="w-4 h-4" /> IMEIs
              </h3>
              
              {editMode === 'all' ? (
                // Modo 'all': Mostrar todos los IMEIs en modo solo lectura
                <div className="space-y-2">
                  {selectedVariant.imeis.map((imei, idx) => (
                    <div key={idx} className="flex gap-2 bg-black/20 p-2 rounded border border-white/5">
                      <span className="text-slate-400 text-xs self-center font-mono w-8 text-right">{idx + 1}.</span>
                      <span className="flex-1 p-1 bg-black/40 border border-white/10 rounded text-xs font-mono text-slate-300">{imei.imei_1}</span>
                      <span className="flex-1 p-1 bg-black/40 border border-white/10 rounded text-xs font-mono text-slate-300">{imei.imei_2 || '-'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                // Modo 'single': Selector de IMEI y campos editables
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <label className="text-xs text-slate-400 font-medium">Selecciona el IMEI a editar:</label>
                    <select 
                      className="p-1.5 bg-black/40 border border-white/10 rounded text-xs text-white"
                      value={selectedImeiIndex}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value);
                        setSelectedImeiIndex(idx);
                        const imei = selectedVariant.imeis[idx];
                        setImeiEdit({
                          imei_1: imei.imei_1,
                          imei_2: imei.imei_2 || ''
                        });
                      }}
                    >
                      {selectedVariant.imeis.map((imei, idx) => (
                        <option key={idx} value={idx}>IMEI {idx + 1}: {imei.imei_1}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 bg-black/20 p-3 rounded border border-white/5">
                    <span className="text-slate-400 text-xs self-center font-mono w-8 text-right">Nuevo</span>
                    <input 
                      className="flex-1 p-1 bg-black/40 border border-white/10 rounded text-xs font-mono focus:ring-1 focus:ring-yellow-500" 
                      value={imeiEdit.imei_1} 
                      onChange={e => handleImeiChange('imei_1', e.target.value)} 
                      placeholder="IMEI 1"
                    />
                    <input 
                      className="flex-1 p-1 bg-black/40 border border-white/10 rounded text-xs font-mono focus:ring-1 focus:ring-yellow-500" 
                      value={imeiEdit.imei_2 || ''} 
                      onChange={e => handleImeiChange('imei_2', e.target.value)} 
                      placeholder="IMEI 2"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
            <button onClick={() => setStep('options')} className="px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all">Atrás</button>
            <button 
              onClick={handleSave} 
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-yellow-500/30 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Guardar Cambios
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
}