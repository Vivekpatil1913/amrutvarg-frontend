import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { VargsProvider } from './data/VargsProvider';
import Header, { ANNOUNCEMENTS_PATH, DIRECTORY_PATH, MEDIA_PATH } from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import YashogathaPage from './pages/YashogathaPage';
import StoryPage from './pages/StoryPage';
import DistrictDirectoryPage from './pages/DistrictDirectoryPage';
import MediaPage from './pages/MediaPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import NotFound from './pages/NotFound';
import SceneBackdrop from './components/SceneBackdrop';

// Admin panel (lazy-loaded to keep public site bundle small)
import { AdminAuthProvider } from './admin/context/AdminAuthContext.jsx';
import { ToastProvider } from './admin/components/ui/Toast.jsx';
import { ConfirmProvider } from './admin/components/ui/Modal.jsx';
import { AdminLayout } from './admin/components/layout/AdminLayout.jsx';
import './admin/styles/admin.css';
const AdminLogin = lazy(() => import('./admin/pages/Login.jsx'));
const Dashboard = lazy(() => import('./admin/pages/Dashboard.jsx'));
const HeroList = lazy(() => import('./admin/pages/HeroList.jsx'));
const HeroForm = lazy(() => import('./admin/pages/HeroForm.jsx'));
const HeroView = lazy(() => import('./admin/pages/HeroView.jsx'));
const AboutList = lazy(() => import('./admin/pages/AboutList.jsx'));
const AboutForm = lazy(() => import('./admin/pages/AboutForm.jsx'));
const AboutView = lazy(() => import('./admin/pages/AboutView.jsx'));
const ActivitiesList = lazy(() => import('./admin/pages/ActivitiesList.jsx'));
const ActivitiesForm = lazy(() => import('./admin/pages/ActivitiesForm.jsx'));
const ActivitiesView = lazy(() => import('./admin/pages/ActivitiesView.jsx'));
const SessionList = lazy(() => import('./admin/pages/SessionList.jsx'));
const SessionForm = lazy(() => import('./admin/pages/SessionForm.jsx'));
const SessionView = lazy(() => import('./admin/pages/SessionView.jsx'));
const JoinList = lazy(() => import('./admin/pages/JoinList.jsx'));
const JoinForm = lazy(() => import('./admin/pages/JoinForm.jsx'));
const JoinView = lazy(() => import('./admin/pages/JoinView.jsx'));
const DirectoryList = lazy(() => import('./admin/pages/DirectoryList.jsx'));
const DirectoryForm = lazy(() => import('./admin/pages/DirectoryForm.jsx'));
const DirectoryView = lazy(() => import('./admin/pages/DirectoryView.jsx'));
const FooterAdmin = lazy(() => import('./admin/pages/FooterAdmin.jsx'));
const YashogathaList = lazy(() => import('./admin/pages/YashogathaList.jsx'));
const YashogathaForm = lazy(() => import('./admin/pages/YashogathaForm.jsx'));
const YashogathaStoryForm = lazy(() => import('./admin/pages/YashogathaStoryForm.jsx'));
const YashogathaStoryView = lazy(() => import('./admin/pages/YashogathaStoryView.jsx'));
const YashogathaView = lazy(() => import('./admin/pages/YashogathaView.jsx'));
const FormsAdmin = lazy(() => import('./admin/pages/Forms.jsx'));
const Masters = lazy(() => import('./admin/pages/Masters.jsx'));
const MasterForm = lazy(() => import('./admin/pages/MasterForm.jsx'));
const Announcements = lazy(() => import('./admin/pages/Announcements.jsx'));
const AnnouncementForm = lazy(() => import('./admin/pages/AnnouncementForm.jsx'));
const VargsList = lazy(() => import('./admin/pages/VargsList.jsx'));
const VargsSectionForm = lazy(() => import('./admin/pages/VargsSectionForm.jsx'));
const VargForm = lazy(() => import('./admin/pages/VargForm.jsx'));
const VargView = lazy(() => import('./admin/pages/VargView.jsx'));
const Contacts = lazy(() => import('./admin/pages/Contacts.jsx'));
const VideosList = lazy(() => import('./admin/pages/VideosList.jsx'));
const VideoForm = lazy(() => import('./admin/pages/VideoForm.jsx'));
const PodcastsList = lazy(() => import('./admin/pages/PodcastsList.jsx'));
const PodcastForm = lazy(() => import('./admin/pages/PodcastForm.jsx'));
const OfficesList = lazy(() => import('./admin/pages/OfficesList.jsx'));
const OfficeForm = lazy(() => import('./admin/pages/OfficeForm.jsx'));
const ContactForm = lazy(() => import('./admin/pages/ContactForm.jsx'));
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
          <Route path={ANNOUNCEMENTS_PATH} element={<AnnouncementsPage />} />
          <Route path={MEDIA_PATH} element={<MediaPage />} />
          <Route path={DIRECTORY_PATH} element={<DistrictDirectoryPage />} />
          {/* One district's contacts, directly addressable and shareable. The
              same page, scoped — not a second copy of it. */}
          <Route path={`${DIRECTORY_PATH}/:districtSlug`} element={<DistrictDirectoryPage />} />
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
          <Route path="/admin/hero" element={<HeroList />} />
          <Route path="/admin/hero/edit" element={<HeroForm />} />
          <Route path="/admin/hero/view" element={<HeroView />} />
          <Route path="/admin/about" element={<AboutList />} />
          <Route path="/admin/about/edit" element={<AboutForm />} />
          <Route path="/admin/about/view" element={<AboutView />} />
          <Route path="/admin/activities" element={<ActivitiesList />} />
          <Route path="/admin/activities/edit" element={<ActivitiesForm />} />
          <Route path="/admin/activities/view" element={<ActivitiesView />} />
          <Route path="/admin/session" element={<SessionList />} />
          <Route path="/admin/session/edit" element={<SessionForm />} />
          <Route path="/admin/session/view" element={<SessionView />} />
          <Route path="/admin/join" element={<JoinList />} />
          <Route path="/admin/join/edit" element={<JoinForm />} />
          <Route path="/admin/join/view" element={<JoinView />} />
          <Route path="/admin/directory" element={<DirectoryList />} />
          <Route path="/admin/footer" element={<FooterAdmin />} />
          <Route path="/admin/directory/edit" element={<DirectoryForm />} />
          <Route path="/admin/directory/view" element={<DirectoryView />} />
          <Route path="/admin/yashogatha" element={<YashogathaList />} />
          <Route path="/admin/yashogatha/settings" element={<YashogathaForm />} />
          <Route path="/admin/yashogatha/view" element={<YashogathaView />} />
          <Route path="/admin/yashogatha/new" element={<YashogathaStoryForm />} />
          <Route path="/admin/yashogatha/:id/edit" element={<YashogathaStoryForm />} />
          <Route path="/admin/yashogatha/:id" element={<YashogathaStoryView />} />
          <Route path="/admin/forms" element={<FormsAdmin />} />
          <Route path="/admin/masters/states" element={<Masters master="states" />} />
          <Route path="/admin/masters/vibhags" element={<Masters master="vibhags" />} />
          <Route path="/admin/masters/districts" element={<Masters master="districts" />} />
          <Route path="/admin/masters/talukas" element={<Masters master="talukas" />} />
          {/* Add and edit are pages of their own, not dialogs over the list. */}
          <Route path="/admin/masters/:master/new" element={<MasterForm />} />
          <Route path="/admin/masters/:master/:id/edit" element={<MasterForm />} />
          <Route path="/admin/announcements" element={<Announcements />} />
          <Route path="/admin/announcements/new" element={<AnnouncementForm />} />
          <Route path="/admin/announcements/:id/edit" element={<AnnouncementForm />} />
          <Route path="/admin/stories" element={<Navigate to="/admin/yashogatha" replace />} />
          <Route path="/admin/vargs" element={<VargsList />} />
          <Route path="/admin/vargs/settings" element={<VargsSectionForm />} />
          <Route path="/admin/vargs/new" element={<VargForm />} />
          <Route path="/admin/vargs/:id/edit" element={<VargForm />} />
          <Route path="/admin/vargs/:id" element={<VargView />} />
          <Route path="/admin/contacts" element={<Contacts />} />
          <Route path="/admin/contacts/new" element={<ContactForm />} />
          <Route path="/admin/contacts/:id/edit" element={<ContactForm />} />
          <Route path="/admin/videos" element={<VideosList />} />
          <Route path="/admin/videos/new" element={<VideoForm />} />
          <Route path="/admin/videos/:id/edit" element={<VideoForm />} />
          <Route path="/admin/podcasts" element={<PodcastsList />} />
          <Route path="/admin/podcasts/new" element={<PodcastForm />} />
          <Route path="/admin/podcasts/:id/edit" element={<PodcastForm />} />
          <Route path="/admin/offices" element={<OfficesList />} />
          <Route path="/admin/offices/new" element={<OfficeForm />} />
          <Route path="/admin/offices/:id/edit" element={<OfficeForm />} />
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
          <ConfirmProvider>
            <AdminRoutes />
          </ConfirmProvider>
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
