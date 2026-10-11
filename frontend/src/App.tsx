import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { ExplorePage } from './pages/ExplorePage';
import { StatisticalTestsPage } from './pages/StatisticalTestsPage';
import { ModelWorkspacePage } from './pages/ModelWorkspacePage';
import { ComparisonPage } from './pages/ComparisonPage';
import { ForecastPage } from './pages/ForecastPage';
import { ReportsPage } from './pages/ReportsPage';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-6 overflow-y-auto">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/datasets" element={<DatasetsPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/statistical-tests" element={<StatisticalTestsPage />} />
                <Route path="/models/:modelType" element={<ModelWorkspacePage />} />
                <Route path="/model-comparison" element={<ComparisonPage />} />
                <Route path="/forecast" element={<ForecastPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
