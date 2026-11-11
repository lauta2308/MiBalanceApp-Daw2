import { Navigate, Route, Routes } from 'react-router'
import GuardiaSesion from './componentes/GuardiaSesion.jsx'
import FormularioMovimiento from './componentes/FormularioMovimiento.jsx'
import SeccionCuenta from './paginas/SeccionCuenta.jsx'

export default function App() {
  return (
    <GuardiaSesion>
      <Routes>
        <Route path="/" element={<SeccionCuenta />} />
        <Route path="/ingresos/nuevo" element={<FormularioMovimiento />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GuardiaSesion>
  )
}
