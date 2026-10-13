import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { VargsProvider } from './data/VargsProvider';
import Header, { DIRECTORY_PATH } from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import YashogathaPage from './pages/YashogathaPage';
import StoryPage from './pages/StoryPage';
import DistrictDirectoryPage from './pages/DistrictDirectoryPage';
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
          {/* A varg's shareable link opens its details over the home page, which stays mounted. */}
          <Route path="/" element={<HomePage />}>
            <Route path="vargs/:vargSlug" element={null} />
          </Route>
          <Route path="/yashogatha" element={<YashogathaPage />} />
          <Route path="/yashogatha/:slug" element={<StoryPage />} />
          <Route path={DIRECTORY_PATH} element={<DistrictDirectoryPage />} />
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
        <VargsProvider>
          <Shell />
        </VargsProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
