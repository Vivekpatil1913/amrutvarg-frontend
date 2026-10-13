import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Announcements from '../components/sections/Announcements';
import Hero from '../components/sections/Hero';
import About from '../components/sections/About';
import Activities from '../components/sections/Activities';
import Session from '../components/sections/Session';
import Growth from '../components/sections/Growth';
import Yashogatha from '../components/sections/Yashogatha';
import Join from '../components/sections/Join';
import Vargs from '../components/sections/Vargs';
import Contact from '../components/sections/Contact';
import ParticipantForm from '../components/forms/ParticipantForm';
import OrganizerForm from '../components/forms/OrganizerForm';
import LeaderForm from '../components/forms/LeaderForm';
import VargDetails from '../components/VargDetails';
import { useSectionNav } from '../components/layout/Header';
import { useReveal } from '../hooks/useReveal';
import { useSceneTheme } from '../hooks/useSceneTheme';
import { useLanguage } from '../i18n/LanguageContext';
import { useVargs } from '../data/VargsProvider';
import { findVargBySlug } from '../data/vargLinks';

export default function HomePage() {
  const goTo = useSectionNav();
  const [enrollVarg, setEnrollVarg] = useState(null);
  const [form, setForm] = useState(null); // 'organizer' | 'leader' | null

  const { lang } = useLanguage();
  const { vargs } = useVargs();
  const { vargSlug } = useParams();
  useReveal([lang]);
  useSceneTheme(['hero', 'about', 'activities', 'session', 'growth', 'yashogatha', 'join', 'vargs', 'contact']);

  // Honour deep links such as /#vargs, or a varg's own /vargs/<slug> link, on first load.
  useEffect(() => {
    const id = vargSlug ? 'vargs' : window.location.hash.slice(1);
    if (id) window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // /vargs/<slug> shows that varg's details. Opened from the list, closing goes
  // back in history (so Back never reopens it); opened from a shared link, it
  // returns to the home page.
  const location = useLocation();
  const navigate = useNavigate();
  const detailVarg = useMemo(() => (vargSlug ? findVargBySlug(vargs, vargSlug) : null), [vargs, vargSlug]);
  const closeDetails = () => {
    if (location.state?.fromList) navigate(-1);
    else navigate('/', { replace: true });
  };
  const enrollFromDetails = (varg) => {
    closeDetails();
    setEnrollVarg(varg);
  };
  const seeAllVargs = () => {
    navigate('/', { replace: true });
    window.setTimeout(() => document.getElementById('vargs')?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  const stats = useMemo(
    () => ({ vargs: vargs.length, divisions: new Set(vargs.map((v) => v.vibhag).filter(Boolean)).size }),
    [vargs],
  );

  return (
    <>
      <Announcements />
      <Hero stats={stats} onNavigate={goTo} />
      <About />
      <Activities onNavigate={goTo} />
      <Session />
      <Growth />
      <Yashogatha />
      <Join onFindVarg={() => goTo('vargs')} onOrganizer={() => setForm('organizer')} onLeader={() => setForm('leader')} />
      <Vargs vargs={vargs} onEnroll={setEnrollVarg} />
      <Contact onOrganizer={() => setForm('organizer')} onFindVarg={() => goTo('vargs')} />

      <ParticipantForm varg={enrollVarg} onClose={() => setEnrollVarg(null)} />
      <OrganizerForm open={form === 'organizer'} onClose={() => setForm(null)} />
      <LeaderForm open={form === 'leader'} onClose={() => setForm(null)} />
      <VargDetails
        open={Boolean(vargSlug)}
        varg={detailVarg}
        onClose={closeDetails}
        onEnroll={enrollFromDetails}
        onSeeAll={seeAllVargs}
      />
    </>
  );
}
