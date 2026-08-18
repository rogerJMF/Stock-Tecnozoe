import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Trash2, AlertTriangle, Smartphone, Palette, Truck, 
  Package, ArrowLeft 
} from 'lucide-react';

export default function ModalGestionarGrupo({ grupo, onClose, onSave }) {
  const [step, setStep] = useState('select'); // 'select' o 'confirm'
  const [deleteTarget, setDeleteTarget] = useState(null); // Objeto con la info de lo que se va a eliminar

  // --- Funciones de eliminación (Devuelven un objeto con la información para la confirmación) ---
  const prepareDeleteImei = (imei) => {
    setDeleteTarget({
      type: 'IMEI',
      title: `IMEI: ${imei.imei_1}`,
      subtitle: `Unidad individual de ${grupo.nombreModelo}`,
      action: async () => {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/unidades/${imei.id}`);
      }
    });
    setStep('confirm');
  };

  const prepareDeleteProvider = (ids, providerName, colorName) => {
    setDeleteTarget({
      type: 'Proveedor',
      title: `Proveedor "${providerName}"`,
      subtitle: `Todos los IMEIs de ${colorName} para este proveedor (${ids.length} unidades)`,
      action: async () => {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/variantes`, { data: { ids } });
      }
    });
    setStep('confirm');
  };

  const prepareDeleteColor = (ids, colorName) => {
    setDeleteTarget({
      type: 'Color',
      title: `Color "${colorName}"`,
      subtitle: `Todos los proveedores e IMEIs de este color (${ids.length} unidades)`,
      action: async () => {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/variantes`, { data: { ids } });
      }
    });
    setStep('confirm');
  };

  // --- CORRECCIÓN AQUÍ (Usa el nuevo endpoint seguro) ---
  const prepareDeleteAll = () => {
    setDeleteTarget({
      type: 'Modelo Completo',
      title: `${grupo.nombreModelo}`,
      subtitle: `Todas las variantes, colores, proveedores e IMEIs asociados.`,
      action: async () => {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/productos/batch-delete`, { 
          ids: grupo.ids 
        });
      }
    });
    setStep('confirm');
  };

  // --- Ejecutar la acción confirmada ---
  const confirmDeletion = async () => {
    try {
      await deleteTarget.action();
      onSave();
      onClose();
    } catch (err) {
      alert('❌ Error al eliminar: ' + (err.response?.data?.error || err.message));
    }
  };

  // --- Renderizado PASO 1: Selección ---
  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full p-6 text-white max-h-[90vh] flex flex-col"
        >
          {/* Encabezado */}
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              <Trash2 className="w-5 h-5 text-red-400" /> Gestionar eliminación
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-2 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-400 mb-4 text-sm">
            Selecciona el <span className="text-red-300 font-medium">Color</span>, <span className="text-purple-300 font-medium">Proveedor</span> o <span className="text-blue-300 font-medium">IMEI</span> específico que deseas eliminar. 
          </p>

          {/* Lista de colores */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {grupo.colores.filter(c => c.stockColor > 0).map((colorEntry, ci) => {
              // IDs de todos los IMEIs de este color
              const colorImeisIds = colorEntry.proveedores.flatMap(p => p.imeis.map(i => i.id));

              return (
                <div key={ci} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 relative group">
                  {/* Encabezado del Color */}
                  <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-blue-300 text-base">{colorEntry.color}</span>
                      <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                        {colorEntry.stockColor} unidades
                      </span>
                    </div>
                    <button 
                      onClick={() => prepareDeleteColor(colorImeisIds, colorEntry.color)}
                      className="text-xs bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-3 py-1 rounded-full transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar Color
                    </button>
                  </div>

                  {/* Lista de Proveedores dentro del Color */}
                  <div className="ml-2 space-y-2">
                    {colorEntry.proveedores.map((prov, pi) => {
                      const providerImeisIds = prov.imeis.map(i => i.id);
                      return (
                        <div key={pi} className="bg-black/30 p-3 rounded-xl border border-white/5 border-dashed">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <Truck className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-purple-300 font-medium text-sm">{prov.proveedor}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                                {prov.stock} unid.
                              </span>
                            </div>
                            <button 
                              onClick={() => prepareDeleteProvider(providerImeisIds, prov.proveedor, colorEntry.color)}
                              className="text-[10px] bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white px-2 py-0.5 rounded-full transition-all flex items-center gap-1"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Eliminar Proveedor
                            </button>
                          </div>

                          {/* Lista de IMEIs individuales */}
                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {prov.imeis.map((imei, ji) => (
                              <div key={ji} className="flex justify-between items-center bg-black/40 p-1.5 px-2 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors group/imei">
                                <span className="font-mono text-xs text-slate-300 group-hover/imei:text-white transition-colors">
                                  {imei.imei_1}
                                </span>
                                <button 
                                  onClick={() => prepareDeleteImei(imei)}
                                  className="opacity-0 group-hover/imei:opacity-100 text-[10px] text-red-400 hover:text-red-300 underline transition-all"
                                >
                                  Eliminar IMEI
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer con opción de eliminar TODO */}
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
            <button 
              onClick={prepareDeleteAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl transition-all text-sm font-bold shadow-lg shadow-red-600/30 flex items-center gap-2"
            >
              <Package className="w-4 h-4" /> Eliminar TODO el modelo
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all">Cancelar</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Renderizado PASO 2: Confirmación ---
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white flex flex-col relative overflow-hidden"
        >
          {/* Icono de advertencia */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/20 rounded-full border border-red-500/30">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
          </div>

          {/* Texto de confirmación */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-red-400 mb-2">¿Estás seguro?</h3>
            <p className="text-slate-300 text-sm">
              Estás a punto de eliminar <span className="font-bold text-white">{deleteTarget.title}</span>.
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {deleteTarget.subtitle}
            </p>
            <p className="text-red-500/70 text-xs mt-3 font-medium">
              Esta acción no se puede deshacer.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 mt-auto">
            <button 
              onClick={() => setStep('select')} 
              className="px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <button 
              onClick={confirmDeletion} 
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-red-500/30 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Confirmar Eliminación
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
}