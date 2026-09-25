import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Sobre from './pages/Sobre'
import SimulationsMap from './pages/SimulationsMap'
import SimulationCatalog from './pages/SimulationCatalog'
import SimulationExample from './pages/SimulationExample'
import Login from './pages/Login'
import RequireAuth from './components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sobre" element={<Sobre />} />
      {/* Sobre + Contato foram unificados em /sobre — mantém o link
          antigo funcionando pra quem tiver salvo/compartilhado. */}
      <Route path="/contato" element={<Navigate to="/sobre" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/simulacoes" element={<SimulationsMap />} />
      <Route path="/simulacoes/categoria/:slug" element={<SimulationCatalog />} />
      {/* Só a execução de fato da simulação exige login — navegar pelo
          mapa e pelo catálogo continua público. */}
      <Route
        path="/simulacoes/rutherford"
        element={(
          <RequireAuth>
            <SimulationExample />
          </RequireAuth>
        )}
      />
    </Routes>
  )
}
