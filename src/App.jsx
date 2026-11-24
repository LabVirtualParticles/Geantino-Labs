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
import b5Schema from './features/simulation-demo/data/espectrometro-b5.parameters.json'
import b5Explanation from './features/simulation-demo/data/espectrometro-b5.explanations.json'
import b5Preview from './features/simulation-demo/data/espectrometro-b5.preview.json'
import decaySchema from './features/simulation-demo/data/decaimento-rdecay01.parameters.json'
import decayExplanation from './features/simulation-demo/data/decaimento-rdecay01.explanations.json'
import decayPreview from './features/simulation-demo/data/decaimento-rdecay01.preview.json'
import telescopeSchema from './features/simulation-demo/data/telescopio-gammaraytel.parameters.json'
import telescopeExplanation from './features/simulation-demo/data/telescopio-gammaraytel.explanations.json'
import telescopePreview from './features/simulation-demo/data/telescopio-gammaraytel.preview.json'

// Geometria do tomógrafo (só os volumes, sem trajetórias) pra cena não
// abrir vazia antes da primeira simulação — gerada de uma run real do B3a.
const petPageSchema = { ...petSchema, preview: petPreview }
const b5PageSchema = { ...b5Schema, preview: b5Preview }
const decayPageSchema = { ...decaySchema, preview: decayPreview }
const telescopePageSchema = { ...telescopeSchema, preview: telescopePreview }

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
      {/* Espectrômetro — exemplo oficial B5 do Geant4 (backend: id "b5"). */}
      <Route
        path="/simulacoes/espectrometro"
        element={(
          <RequireAuth>
            <SimulationExample schema={b5PageSchema} explanationSchema={b5Explanation} />
          </RequireAuth>
        )}
      />
      {/* Decaimento radioativo — exemplo oficial rdecay01 do Geant4 (backend: id "rdecay01"). */}
      <Route
        path="/simulacoes/decaimento"
        element={(
          <RequireAuth>
            <SimulationExample schema={decayPageSchema} explanationSchema={decayExplanation} />
          </RequireAuth>
        )}
      />
      {/* Telescópio de raios gama — exemplo oficial gammaray_telescope do Geant4 (backend: id "gammaraytel"). */}
      <Route
        path="/simulacoes/telescopio-gama"
        element={(
          <RequireAuth>
            <SimulationExample schema={telescopePageSchema} explanationSchema={telescopeExplanation} />
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
