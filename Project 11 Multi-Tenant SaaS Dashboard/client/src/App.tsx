import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Billing } from './pages/Billing';
import { Settings } from './pages/Settings';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </WorkspaceProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
