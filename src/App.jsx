import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Sobre from './pages/Sobre'
import SimulationsMap from './pages/SimulationsMap'
import SimulationCatalog from './pages/SimulationCatalog'
import SimulationExample from './pages/SimulationExample'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import RequireAuth from './components/RequireAuth'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import ShowerTest from './pages/ShowerTest'
import petSchema from './features/simulation-demo/data/pet-b3a.parameters.json'
import petExplanation from './features/simulation-demo/data/pet-b3a.explanations.json'
import petPreview from './features/simulation-demo/data/pet-b3a.preview.json'

// Geometria do tomógrafo (só os volumes, sem trajetórias) pra cena não
// abrir vazia antes da primeira simulação — gerada de uma run real do B3a.
const petPageSchema = { ...petSchema, preview: petPreview }

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sobre" element={<Sobre />} />
      {/* Sobre + Contato foram unificados em /sobre — mantém o link
          antigo funcionando pra quem tiver salvo/compartilhado. */}
      <Route path="/contato" element={<Navigate to="/sobre" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      {/* Painel do usuário — histórico de simulações, relatórios, perfil,
          senha e tema. Exige login, igual à execução de simulação. */}
      <Route
        path="/painel"
        element={(
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        )}
      />
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
      {/* PET — exemplo oficial B3a do Geant4 (backend: id "b3a"). */}
      <Route
        path="/simulacoes/pet"
        element={(
          <RequireAuth>
            <SimulationExample schema={petPageSchema} explanationSchema={petExplanation} />
          </RequireAuth>
        )}
      />
      {/* Página de teste da animação do chuveiro eletromagnético — só
          existe em `npm run dev`, não vai pro site publicado. */}
      {import.meta.env.DEV && <Route path="/teste/chuveiro" element={<ShowerTest />} />}
      {/* Rota coringa — tem que ser sempre a última. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
