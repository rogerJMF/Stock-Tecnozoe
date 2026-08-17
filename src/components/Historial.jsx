import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Historial() {
  const [movimientos, setMovimientos] = useState([]);

  const fetchMovimientos = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/movimientos');
      setMovimientos(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMovimientos();
    const interval = setInterval(fetchMovimientos, 5000);
    return () => clearInterval(interval);
  }, []);

  const compras = movimientos.filter(m => m.tipo === 'ENTRADA');
  const ventas = movimientos.filter(m => m.tipo === 'SALIDA');

  const TablaMovimientos = ({ titulo, datos, esCompra }) => (
    <div className="mb-8">
      <h2 className={`text-2xl font-bold mb-4 ${esCompra ? 'text-blue-400' : 'text-green-400'} flex items-center gap-2`}>
        {esCompra ? '📥 Compras (Entradas)' : '📤 Ventas (Salidas)'}
      </h2>
      <div className="bg-slate-800/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-700/80 text-slate-300 font-bold uppercase border-b border-white/10">
            <tr>
              <th className="p-4">Fecha / Hora</th>
              <th className="p-4">Producto (IMEI)</th>
              <th className="p-4">{esCompra ? 'Proveedor' : 'Cliente'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {datos.length === 0 ? (
              <tr><td colSpan="3" className="p-4 text-center text-slate-500">No hay registros.</td></tr>
            ) : (
              datos.map(m => (
                <tr key={m.id_MovimientoStock} className="hover:bg-slate-700/30 transition-all">
                  <td className="p-4 text-slate-400 font-mono text-xs">{new Date(m.fecha_hora).toLocaleString()}</td>
                  <td className="p-4">
                    {m.detalles.map(d => (
                      <div key={d.UnidadInventario_id_UnidadInventario} className="text-slate-200 flex items-center gap-2">
                        <span>{d.UnidadInventario.Producto.nombre}</span>
                        <span className="text-slate-500 text-[10px] bg-slate-800 px-2 py-0.5 rounded-full">({d.UnidadInventario.Imei_1})</span>
                      </div>
                    ))}
                  </td>
                  <td className="p-4 text-slate-300 font-medium">
                    {esCompra ? (m.Proveedor?.nombre || 'Proveedor eliminado') : (m.Cliente?.nombre || 'Cliente eliminado')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 pt-24 text-white">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">📜 Historial de Movimientos</h1>
      
      <TablaMovimientos titulo="Compras" datos={compras} esCompra={true} />
      <TablaMovimientos titulo="Ventas" datos={ventas} esCompra={false} />
    </div>
  );
}