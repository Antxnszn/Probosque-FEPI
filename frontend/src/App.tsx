import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { initDatabase } from './db/dexie';

// Layouts
import { TechnicianLayout } from './layouts/TechnicianLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Auth
import { LoginPage } from './features/auth/LoginPage';

// Technician Views
import { TechDashboard } from './features/technician/TechDashboard';
import { TechPlots } from './features/technician/TechPlots';
import { ParcelMapWorkspace } from './features/plots/ParcelMapWorkspace';
import { TechPlotDetail } from './features/technician/TechPlotDetail';
import { TechAuditWizard } from './features/technician/TechAuditWizard';
import { TechSyncCenter } from './features/technician/TechSyncCenter';
import { TechHistory } from './features/technician/TechHistory';
import { TechProfile } from './features/technician/TechProfile';

// Admin Views
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminMap } from './features/admin/AdminMap';
import { AdminPlots } from './features/admin/AdminPlots';
import { AdminPlotDetail } from './features/admin/AdminPlotDetail';
import { AdminTriage } from './features/admin/AdminTriage';
import { AdminAudits } from './features/admin/AdminAudits';
import { AdminSubsidies } from './features/admin/AdminSubsidies';
import { AdminEvidence } from './features/admin/AdminEvidence';
import { AdminUsers } from './features/admin/AdminUsers';
import { AdminReports } from './features/admin/AdminReports';
import { AdminSystem } from './features/admin/AdminSystem';
import { ForestViewerPage } from './features/forest-viewer/pages/ForestViewerPage';
import { ProbosqueWorkspace } from './features/home/ProbosqueWorkspace';

export function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Forest Portal & Workspace */}
          <Route path="/" element={<ProbosqueWorkspace />} />
          <Route path="/visor" element={<ForestViewerPage />} />

          {/* Legacy Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Technician Operational Workspace (/app) */}
          <Route path="/app" element={<TechnicianLayout />}>
            <Route index element={<TechDashboard />} />
            <Route path="plots" element={<TechPlots />} />
            <Route path="plots/new" element={<ParcelMapWorkspace />} />
            <Route path="plots/:id" element={<TechPlotDetail />} />
            <Route path="audit/:id" element={<TechAuditWizard />} />
            <Route path="sync" element={<TechSyncCenter />} />
            <Route path="history" element={<TechHistory />} />
            <Route path="profile" element={<TechProfile />} />
          </Route>

          {/* Admin Supervisory Workspace (/admin) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="map" element={<AdminMap />} />
            <Route path="plots" element={<AdminPlots />} />
            <Route path="plots/:id" element={<AdminPlotDetail />} />
            <Route path="triage" element={<AdminTriage />} />
            <Route path="audits" element={<AdminAudits />} />
            <Route path="subsidies" element={<AdminSubsidies />} />
            <Route path="evidence" element={<AdminEvidence />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="system" element={<AdminSystem />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
