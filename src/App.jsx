import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import NotFound from './pages/NotFound';
import SceneBackdrop from './components/SceneBackdrop';

function Shell() {
  const { switching, lang } = useLanguage();
  return (
    <div className={`app lang-${lang}${switching ? ' is-switching' : ''}`}>
      <SceneBackdrop />
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <Shell />
      </LanguageProvider>
    </BrowserRouter>
  );
}
