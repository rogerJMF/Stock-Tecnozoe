import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cpu, Home, Bell, Truck, Tag, PackageX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function Navbar() {
  const location = useLocation();
  const [notificaciones, setNotificaciones] = useState([]);
  const [showNotis, setShowNotis] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotis = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notificaciones');
      setNotificaciones(res.data);
      console.log("Notificaciones: ", res)
    } catch (e) {
      console.error("❌ Error al cargar notificaciones:", e);
    }
  };

  useEffect(() => {
    fetchNotis();
    const interval = setInterval(fetchNotis, 5000);
    return () => clearInterval(interval);
  }, []);

  // CERRAR AL HACER CLIC FUERA
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotis(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const marcarLeida = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/notificaciones/${id}`);
      setNotificaciones(prev => prev.filter(n => n.id_Notificacion !== id));
    } catch (e) {
      console.error("❌ Error marcando notificación como leída:", e);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      const ids = notificaciones.map(n => n.id_Notificacion);
      await Promise.all(ids.map(id => axios.patch(`http://localhost:5000/api/notificaciones/${id}`)));
      setNotificaciones([]);
    } catch (e) {
      console.error("Error al marcar todas como leídas:", e);
    }
  };

  return (
    <nav className="fixed top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl px-2 sm:px-4 md:px-8">
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-2 sm:p-3 px-3 sm:px-6 flex items-center mx-2 sm:mx-4 md:mx-8">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-1 sm:gap-2 font-bold text-lg sm:text-xl tracking-wider text-white">
          <Cpu className="w-5 h-5 sm:w-6 h-6 text-blue-500" /> Stock<span className="text-blue-500">Tecno</span>zoe
        </Link>
        
        {/* CONTENEDOR DEL MENÚ Y LA CAMPANA (Empujado a la derecha en PC) */}
        <div className="flex items-center ml-auto gap-2 sm:gap-3 md:gap-4">
          <div className="flex gap-1 sm:gap-2 bg-slate-800 rounded-full p-1 sm:p-1.5">
            <Link to="/" className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-full transition-all text-[10px] sm:text-sm ${location.pathname === '/' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Inicio</span>
            </Link>
            <Link to="/compras" className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-full transition-all text-[10px] sm:text-sm ${location.pathname === '/compras' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Compras</span>
            </Link>
            <Link to="/ventas" className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-full transition-all text-[10px] sm:text-sm ${location.pathname === '/ventas' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Ventas</span>
            </Link>
            <Link to="/agotados" className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-full transition-all text-[10px] sm:text-sm ${location.pathname === '/agotados' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <PackageX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Agotados</span>
            </Link>
          </div>
          
          {/* CAMPANA */}
          <div className="relative">
            <button onClick={() => setShowNotis(!showNotis)} className="p-1.5 sm:p-2 bg-slate-800 border border-white/10 rounded-xl hover:bg-slate-700 relative">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              {notificaciones.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] sm:text-[10px] font-bold w-4 h-4 sm:w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {notificaciones.length}
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotis && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-10 sm:top-12 w-72 sm:w-80 bg-slate-800/90 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-2 sm:p-3 max-h-60 sm:max-h-72 overflow-y-auto z-50"
                >
                  <div className="flex justify-between items-center mb-2 px-1 border-b border-white/10 pb-2 sticky top-0 bg-slate-800/90 backdrop-blur-md z-10">
                    <span className="text-xs sm:text-sm font-semibold text-slate-300">Notificaciones</span>
                    {notificaciones.length > 0 && (
                      <button onClick={marcarTodasLeidas} className="text-[10px] text-blue-400 hover:text-blue-300 underline">Marcar todas leídas</button>
                    )}
                  </div>

                  {notificaciones.length === 0 ? (
                    <p className="text-center text-slate-500 py-4 text-xs sm:text-sm">Sin alertas.</p>
                  ) : (
                    notificaciones.map(n => (
                      <div key={n.id_Notificacion} className="group flex flex-col p-2 sm:p-3 mb-1 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl border-l-4 border-red-500/50 transition-all relative shadow-sm">
                        <div className="flex justify-between items-start">
                          <p className="text-xs sm:text-sm text-white leading-snug font-medium pr-6 w-full">
                            {n.mensaje}
                          </p>
                          <button
                            onClick={() => marcarLeida(n.id_Notificacion)}
                            className="absolute top-2 right-2 text-[10px] text-blue-400 hover:text-blue-300 opacity-40 group-hover:opacity-100 transition-opacity font-medium"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </nav>
  );
}