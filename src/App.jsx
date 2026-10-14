import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { VargsProvider } from './data/VargsProvider';
import Header, { DIRECTORY_PATH } from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import YashogathaPage from './pages/YashogathaPage';
import StoryPage from './pages/StoryPage';
import DistrictDirectoryPage from './pages/DistrictDirectoryPage';
import NotFound from './pages/NotFound';
import SceneBackdrop from './components/SceneBackdrop';

// Admin panel (lazy-loaded to keep public site bundle small)
import { AdminAuthProvider } from './admin/context/AdminAuthContext.jsx';
import { ToastProvider } from './admin/components/ui/Toast.jsx';
import { AdminLayout } from './admin/components/layout/AdminLayout.jsx';
import './admin/styles/admin.css';
const AdminLogin = lazy(() => import('./admin/pages/Login.jsx'));
const Dashboard = lazy(() => import('./admin/pages/Dashboard.jsx'));
const HeroSection = lazy(() => import('./admin/pages/HeroSection.jsx'));
const FormsAdmin = lazy(() => import('./admin/pages/Forms.jsx'));
const Masters = lazy(() => import('./admin/pages/Masters.jsx'));
const Announcements = lazy(() => import('./admin/pages/Announcements.jsx'));
const Stories = lazy(() => import('./admin/pages/Stories.jsx'));
const Vargs = lazy(() => import('./admin/pages/Vargs.jsx'));
const Contacts = lazy(() => import('./admin/pages/Contacts.jsx'));
const Submissions = lazy(() => import('./admin/pages/Submissions.jsx'));
const SubmissionDetail = lazy(() => import('./admin/pages/SubmissionDetail.jsx'));
const Settings = lazy(() => import('./admin/pages/Settings.jsx'));
const Media = lazy(() => import('./admin/pages/Media.jsx'));
const AdminProfile = lazy(() => import('./admin/pages/Profile.jsx'));

const AdminSpinner = () => (
  <div className="admin-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
    <div className="a-spinner">
      <svg className="a-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Loading…
    </div>
  </div>
);

function Shell() {
  const { switching, lang } = useLanguage();
  const location = useLocation();

  // Admin routes bypass the public shell
  if (location.pathname.startsWith('/admin')) return null;

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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function AdminRoutes() {
  return (
    <Suspense fallback={<AdminSpinner />}>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/hero" element={<HeroSection />} />
          <Route path="/admin/forms" element={<FormsAdmin />} />
          <Route path="/admin/masters/states" element={<Masters master="states" />} />
          <Route path="/admin/masters/vibhags" element={<Masters master="vibhags" />} />
          <Route path="/admin/masters/districts" element={<Masters master="districts" />} />
          <Route path="/admin/masters/talukas" element={<Masters master="talukas" />} />
          <Route path="/admin/announcements" element={<Announcements />} />
          <Route path="/admin/stories" element={<Stories />} />
          <Route path="/admin/vargs" element={<Vargs />} />
          <Route path="/admin/contacts" element={<Contacts />} />
          <Route path="/admin/submissions" element={<Submissions />} />
          <Route path="/admin/submissions/:id" element={<SubmissionDetail />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/media" element={<Media />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function RouterContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <AdminAuthProvider>
        <ToastProvider>
          <AdminRoutes />
        </ToastProvider>
      </AdminAuthProvider>
    );
  }

  return (
    <LanguageProvider>
      <VargsProvider>
        <Shell />
      </VargsProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouterContent />
    </BrowserRouter>
  );
}
