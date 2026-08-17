import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Compras from './components/Compras'; // Nuevo componente
import Ventas from './components/Ventas';   // Nuevo componente
import Agotados from './components/Agotados';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0b1120] font-sans selection:bg-blue-500 selection:text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compras" element={<Compras />} /> {/* Nueva ruta */}
          <Route path="/ventas" element={<Ventas />} />   {/* Nueva ruta */}
          <Route path="/agotados" element={<Agotados />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;