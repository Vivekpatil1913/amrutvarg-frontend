// Seed data/admin/*.json from the static source files.
// Run once: node tools/seed.js
// Safe to re-run — overwrites existing files.

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, '..', 'data', 'admin');
if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true });

const save = (name, data) => {
  writeFileSync(join(DATA, `${name}.json`), JSON.stringify(data, null, 2));
  console.log(`✓ ${name}.json  (${data.length} records)`);
};

const now = new Date().toISOString();
const base = { created_at: now, updated_at: now, deleted_at: null };

// ── Import source data ────────────────────────────────────────────────────────

const { vargs }            = await import('../src/data/vargs.js');
const { VARG_NAMES_EN }    = await import('../src/data/vargNamesEn.js');
const { announcements }    = await import('../src/data/announcements.js');
const { districtContacts } = await import('../src/data/districtContacts.js');
const { stories, FEATURED_SLUGS } = await import('../src/data/yashogathaStories.js');

// ── Vibhag / division English names ──────────────────────────────────────────

const VIBHAG_EN = {
  'कोंकण':                  'Konkan',
  'पुणे':                   'Pune',
  'नाशिक':                  'Nashik',
  'छत्रपती संभाजीनगर':     'Chhatrapati Sambhajinagar',
  'अमरावती':                'Amravati',
  'नागपूर':                 'Nagpur',
};

const arr2str = (v) => (Array.isArray(v) ? v.join('\n\n') : (v || ''));

// ── Vargs ─────────────────────────────────────────────────────────────────────

save('vargs', vargs.map((v, i) => ({
  id:                randomUUID(),
  source_id:         v.id,
  vibhag_mr:         v.vibhag || '',
  vibhag_en:         VIBHAG_EN[v.vibhag] || '',
  district_mr:       v.district || '',
  district_en:       '',
  taluka:            v.taluka || '',
  school_name:       v.schoolName || '',
  school_name_en:    VARG_NAMES_EN[v.id] || '',
  varg_name:         v.vargName || '',
  coordinator_name:  v.coordinatorName || '',
  enrollment_count:  v.enrollmentCount || 0,
  is_active:         true,
  display_order:     i,
  ...base,
})));

// ── Contacts ──────────────────────────────────────────────────────────────────

save('contacts', districtContacts.map((c, i) => ({
  id:           randomUUID(),
  source_id:    c.id,
  division_mr:  c.division || '',
  division_en:  VIBHAG_EN[c.division] || '',
  role:         c.roles[0] || '',
  districts:    c.districts || [],
  name:         c.name || '',
  email:        c.email || '',
  phone:        c.phone || '',
  is_active:    true,
  display_order: i,
  ...base,
})));

// ── Announcements ─────────────────────────────────────────────────────────────

save('announcements', announcements.map((a, i) => ({
  id:            randomUUID(),
  source_id:     a.id,
  title_mr:      a.title?.mr || '',
  title_en:      a.title?.en || '',
  desc_mr:       a.desc?.mr  || '',
  desc_en:       a.desc?.en  || '',
  link:          a.link?.href || null,
  link_label:    a.link?.label?.mr || null,
  date:          a.date || null,
  until_date:    a.until || null,
  status:        a.status || 'info',
  pinned:        a.pinned || false,
  is_active:     true,
  display_order: i,
  ...base,
})));

// ── Stories ───────────────────────────────────────────────────────────────────

save('stories', stories.map((s, i) => ({
  id:            randomUUID(),
  slug:          s.slug,
  category:      s.category,
  image:         s.image || null,
  title_mr:      s.mr?.title  || '',
  title_en:      s.en?.title  || '',
  short_mr:      s.mr?.short  || '',
  short_en:      s.en?.short  || '',
  featured:      FEATURED_SLUGS.includes(s.slug),
  published:     true,
  display_order: i,
  content: {
    mr: {
      intro:      s.mr?.intro      || '',
      challenge:  s.mr?.challenge  || '',
      journey:    arr2str(s.mr?.journey),
      change:     arr2str(s.mr?.change),
      lessons:    arr2str(s.mr?.lessons),
      conclusion: s.mr?.conclusion || '',
    },
    en: {
      intro:      s.en?.intro      || '',
      challenge:  s.en?.challenge  || '',
      journey:    arr2str(s.en?.journey),
      change:     arr2str(s.en?.change),
      lessons:    arr2str(s.en?.lessons),
      conclusion: s.en?.conclusion || '',
    },
  },
  ...base,
})));

// ── Empty collections ─────────────────────────────────────────────────────────

save('submissions', []);
save('media', []);

console.log('\nSeed complete. Restart the dev server to pick up the new data.');
