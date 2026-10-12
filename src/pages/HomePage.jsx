import { useEffect, useMemo, useState } from 'react';
import Hero from '../components/sections/Hero';
import About from '../components/sections/About';
import Activities from '../components/sections/Activities';
import Session from '../components/sections/Session';
import Growth from '../components/sections/Growth';
import Join from '../components/sections/Join';
import Vargs from '../components/sections/Vargs';
import Contact from '../components/sections/Contact';
import ParticipantForm from '../components/forms/ParticipantForm';
import OrganizerForm from '../components/forms/OrganizerForm';
import LeaderForm from '../components/forms/LeaderForm';
import { useSectionNav } from '../components/layout/Header';
import { useReveal } from '../hooks/useReveal';
import { useLanguage } from '../i18n/LanguageContext';
import { vargs } from '../data/vargs';

export default function HomePage() {
  const goTo = useSectionNav();
  const [enrollVarg, setEnrollVarg] = useState(null);
  const [form, setForm] = useState(null); // 'organizer' | 'leader' | null

  const { lang } = useLanguage();
  useReveal([lang]);

  // Honour deep links such as /#vargs on first load.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60);
  }, []);

  const stats = useMemo(
    () => ({ vargs: vargs.length, divisions: new Set(vargs.map((v) => v.vibhag).filter(Boolean)).size }),
    [],
  );

  return (
    <>
      <Hero stats={stats} onNavigate={goTo} />
      <About />
      <Activities onNavigate={goTo} />
      <Session />
      <Growth />
      <Join onFindVarg={() => goTo('vargs')} onOrganizer={() => setForm('organizer')} onLeader={() => setForm('leader')} />
      <Vargs vargs={vargs} onEnroll={setEnrollVarg} />
      <Contact onOrganizer={() => setForm('organizer')} onFindVarg={() => goTo('vargs')} />

      <ParticipantForm varg={enrollVarg} onClose={() => setEnrollVarg(null)} />
      <OrganizerForm open={form === 'organizer'} onClose={() => setForm(null)} />
      <LeaderForm open={form === 'leader'} onClose={() => setForm(null)} />
    </>
  );
}
