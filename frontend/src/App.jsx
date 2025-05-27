import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SolverPage from './pages/SolverPage';
import AnalyticsPage from './pages/AnalyticsPage';
import Authentication from './pages/Authentication';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/solver" element={<SolverPage />} />
        <Route path="/db" element={<AnalyticsPage />} />
        <Route path="/auth" element={<Authentication />} />
      </Routes>
    </Router>
  );
}

export default App;
