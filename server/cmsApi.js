// Local development CMS API – mounts on the Vite dev/preview server at /api/v1
// Data is persisted in data/admin/*.json  (auto-created on first run)

import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, '..', 'data', 'admin');

// ── Persistence ───────────────────────────────────────────────────────────────

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readStore(name) {
  ensureDir();
  const file = join(DATA_DIR, `${name}.json`);
  if (!existsSync(file)) return [];
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
}

function writeStore(name, data) {
  ensureDir();
  writeFileSync(join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

// ── Default settings ──────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = [
  { setting_key: 'site_name',        label: 'Site Name',        value: 'अमृतवर्ग', group_name: 'general' },
  { setting_key: 'site_tagline',     label: 'Tagline',          value: '',          group_name: 'general' },
  { setting_key: 'contact_email',    label: 'Contact Email',    value: '',          group_name: 'contact' },
  { setting_key: 'contact_phone',    label: 'Contact Phone',    value: '',          group_name: 'contact' },
  { setting_key: 'facebook_url',     label: 'Facebook URL',     value: '',          group_name: 'links'   },
  { setting_key: 'youtube_url',      label: 'YouTube URL',      value: '',          group_name: 'links'   },
  { setting_key: 'instagram_url',    label: 'Instagram URL',    value: '',          group_name: 'links'   },
  { setting_key: 'meta_description', label: 'Meta Description', value: '',          group_name: 'seo'     },
  { setting_key: 'meta_keywords',    label: 'Meta Keywords',    value: '',          group_name: 'seo'     },
];

function getSettings() {
  const stored = readStore('settings');
  if (!stored.length) return DEFAULT_SETTINGS;
  const map = Object.fromEntries(stored.map(s => [s.setting_key, s]));
  return DEFAULT_SETTINGS.map(d => ({ ...d, ...(map[d.setting_key] || {}) }));
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@amrutvarg.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const sessions = new Map(); // token → { user, expires }

// Profile overrides (name / email / password / avatarUrl) stored in data/admin/profile.json
function readProfile() {
  ensureDir();
  const file = join(DATA_DIR, 'profile.json');
  if (!existsSync(file)) return {};
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
}
function writeProfile(data) {
  ensureDir();
  writeFileSync(join(DATA_DIR, 'profile.json'), JSON.stringify(data, null, 2));
}

function createToken(user) {
  const token = randomUUID();
  sessions.set(token, { user, expires: Date.now() + 24 * 60 * 60 * 1000 });
  return token;
}

function getUser(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  const session = sessions.get(auth.slice(7));
  if (!session || session.expires < Date.now()) return null;
  return session.user;
}

// Parse multipart and extract one file field (returns { fields, file: {name,ext,buffer} })
function parseMultipartWithFile(req) {
  return new Promise(resolve => {
    const ct = req.headers['content-type'] || '';
    const bMatch = ct.match(/boundary=(.+)/i);
    if (!bMatch) { req.resume(); resolve({ fields: {}, file: null }); return; }
    const boundary = '--' + bMatch[1].trim();
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const fields = {};
      let file = null;
      try {
        const buf  = Buffer.concat(chunks);
        const body = buf.toString('binary');
        for (const part of body.split(boundary)) {
          const sep = part.indexOf('\r\n\r\n');
          if (sep === -1) continue;
          const hdr      = part.slice(0, sep);
          const nameM    = hdr.match(/name="([^"]+)"/);
          const fileM    = hdr.match(/filename="([^"]+)"/);
          if (!nameM) continue;
          const content  = part.slice(sep + 4).replace(/\r\n$/, '');
          if (fileM) {
            const ext = extname(fileM[1]).toLowerCase() || '.jpg';
            file = { name: fileM[1], ext, buffer: Buffer.from(content, 'binary') };
          } else {
            fields[nameM[1]] = content;
          }
        }
      } catch {}
      resolve({ fields, file });
    });
    req.on('error', () => resolve({ fields: {}, file: null }));
  });
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function send(res, status, body) {
  cors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function ok(res, data, meta) {
  const body = { data };
  if (meta !== undefined) body.meta = meta;
  send(res, 200, body);
}

function fail(res, status, message, code) {
  send(res, status, { error: { message, code } });
}

function parseJson(req) {
  return new Promise(resolve => {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json')) {
      req.resume(); // drain
      resolve({});
      return;
    }
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function parseMultipart(req) {
  return new Promise(resolve => {
    const ct = req.headers['content-type'] || '';
    const bMatch = ct.match(/boundary=(.+)/i);
    if (!bMatch) { req.resume(); resolve({}); return; }
    const boundary = '--' + bMatch[1].trim();
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const fields = {};
      try {
        const body = Buffer.concat(chunks).toString('latin1');
        for (const part of body.split(boundary)) {
          const sep = part.indexOf('\r\n\r\n');
          if (sep === -1) continue;
          const hdr = part.slice(0, sep);
          const nm  = hdr.match(/name="([^"]+)"/);
          if (!nm || hdr.includes('filename=')) continue;
          fields[nm[1]] = part.slice(sep + 4).replace(/\r\n$/, '');
        }
      } catch {}
      resolve(fields);
    });
    req.on('error', () => resolve({}));
  });
}

// ── Pagination ────────────────────────────────────────────────────────────────

function paginate(all, page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 25));
  const total = all.length;
  return {
    items: all.slice((p - 1) * l, p * l),
    meta:  { total, page: p, pageSize: l, totalPages: Math.ceil(total / l) || 1 },
  };
}

// ── Main middleware ───────────────────────────────────────────────────────────

export function cmsApiMiddleware(req, res, next) {
  const url  = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  if (!path.startsWith('/api/v1')) return next();

  if (req.method === 'OPTIONS') {
    cors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const route = path.slice('/api/v1'.length);
  const q     = url.searchParams;

  // ── Public read-only endpoints (no auth) ─────────────────────────────────

  if (route === '/public/vargs' && req.method === 'GET') {
    const all = readStore('vargs').filter(v => !v.deleted_at && v.is_active);
    // Return in the same shape as the static vargs.js snapshot
    ok(res, all.map(v => ({
      id:              v.source_id ?? v.id,
      vibhag:          v.vibhag_mr,
      district:        v.district_mr,
      taluka:          v.taluka || '',
      schoolName:      v.school_name,
      schoolNameEn:    v.school_name_en || '',
      vargName:        v.varg_name || '',
      coordinatorName: v.coordinator_name || '',
      enrollmentCount: v.enrollment_count || 0,
      status:          'APPROVED',
    })));
    return;
  }

  if (route === '/public/announcements' && req.method === 'GET') {
    const today = new Date().toISOString().slice(0, 10);
    const all = readStore('announcements')
      .filter(a => !a.deleted_at && a.is_active && (!a.until_date || a.until_date >= today));
    // Return in the shape Announcements.jsx expects
    ok(res, all.map(a => ({
      id:     a.source_id ?? a.id,
      title:  { mr: a.title_mr, en: a.title_en },
      desc:   { mr: a.desc_mr,  en: a.desc_en  },
      date:   a.date       || undefined,
      until:  a.until_date || undefined,
      status: a.status,
      pinned: a.pinned || false,
      link:   a.link ? { href: a.link, label: { mr: a.link_label || '', en: a.link_label || '' } } : undefined,
    })));
    return;
  }

  if (route === '/public/contacts' && req.method === 'GET') {
    const all = readStore('contacts').filter(c => !c.deleted_at && c.is_active);
    // Return in the shape districtContacts.js uses
    ok(res, all.map(c => ({
      id:        c.source_id ?? c.id,
      division:  c.division_mr,
      roles:     [c.role].filter(Boolean),
      districts: c.districts || [],
      name:      c.name,
      email:     c.email || '',
      phone:     c.phone || '',
    })));
    return;
  }

  // ── Public form submissions ────────────────────────────────────────────────

  if (route.startsWith('/forms/') && req.method === 'POST') {
    const formType = route.slice('/forms/'.length).replace(/s$/, ''); // participants→participant
    const isMulti  = (req.headers['content-type'] || '').includes('multipart');
    const parser   = isMulti ? parseMultipart : parseJson;
    parser(req).then(body => {
      const record = {
        id:             randomUUID(),
        form_type:      formType,
        submitter_name: body.name || body.fullName || body.full_name || '',
        name:           body.name || body.fullName || body.full_name || '',
        submitter_email:body.email || '',
        status:         'new',
        submitted_at:   new Date().toISOString(),
        data:           body,
      };
      const subs = readStore('submissions');
      subs.unshift(record);
      writeStore('submissions', subs);
      ok(res, { received: true });
    });
    return;
  }

  // ── Auth (no token required) ───────────────────────────────────────────────

  if (route === '/auth/login' && req.method === 'POST') {
    parseJson(req).then(({ email, password }) => {
      const profile      = readProfile();
      const activeEmail  = profile.email    || ADMIN_EMAIL;
      const activePasswd = profile.password || ADMIN_PASSWORD;
      if (email === activeEmail && password === activePasswd) {
        const base = { id: 1, name: 'Admin', email: activeEmail, role: 'admin' };
        const user = { ...base, ...profile, id: 1, password: undefined };
        const token = createToken(user);
        ok(res, { token, user });
      } else {
        fail(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      }
    });
    return;
  }

  if (route === '/auth/logout' && req.method === 'POST') {
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Bearer ')) sessions.delete(auth.slice(7));
    req.resume();
    ok(res, {});
    return;
  }

  if (route === '/auth/me' && req.method === 'GET') {
    const user = getUser(req);
    if (!user) return fail(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    // Merge stored profile overrides
    const profile = readProfile();
    ok(res, { ...user, ...profile, id: user.id });
    return;
  }

  // ── Profile update (PATCH /auth/profile) ─────────────────────────────────
  if (route === '/auth/profile' && req.method === 'PATCH') {
    const user = getUser(req);
    if (!user) return fail(res, 401, 'Unauthorized', 'UNAUTHORIZED');

    parseMultipartWithFile(req).then(({ fields, file }) => {
      const profile = readProfile();
      if (fields.name)  profile.name  = fields.name.trim();
      if (fields.email) profile.email = fields.email.trim();

      // Save avatar file if provided
      if (file && file.buffer.length > 0) {
        const uploadsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'uploads');
        if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
        const fname = `avatar-${randomUUID()}${file.ext}`;
        writeFileSync(join(uploadsDir, fname), file.buffer);
        profile.avatarUrl = `/uploads/${fname}`;
      }

      writeProfile(profile);

      // Update live sessions so the topbar reflects immediately
      for (const [token, session] of sessions) {
        session.user = { ...session.user, ...profile };
      }

      ok(res, { ...user, ...profile });
    });
    return;
  }

  // ── Change password (POST /auth/change-password) ──────────────────────────
  if (route === '/auth/change-password' && req.method === 'POST') {
    const user = getUser(req);
    if (!user) return fail(res, 401, 'Unauthorized', 'UNAUTHORIZED');

    parseJson(req).then(({ currentPassword, newPassword }) => {
      const profile  = readProfile();
      const current  = profile.password || ADMIN_PASSWORD;

      if (currentPassword !== current) {
        return fail(res, 400, 'Current password is incorrect', 'WRONG_PASSWORD');
      }
      if (!newPassword || newPassword.length < 6) {
        return fail(res, 400, 'New password must be at least 6 characters', 'WEAK_PASSWORD');
      }

      profile.password = newPassword;
      writeProfile(profile);
      ok(res, { changed: true });
    });
    return;
  }

  // ── Protected routes (require valid token) ────────────────────────────────

  const user = getUser(req);
  if (!user) return fail(res, 401, 'Unauthorized', 'UNAUTHORIZED');

  // Dashboard
  if (route === '/admin/dashboard' && req.method === 'GET') {
    const ann  = readStore('announcements').filter(a => !a.deleted_at && a.is_active);
    const sto  = readStore('stories').filter(s => !s.deleted_at && s.status === 'published');
    const vgs  = readStore('vargs').filter(v => !v.deleted_at && v.is_active);
    const cts  = readStore('contacts').filter(c => !c.deleted_at && c.is_active);
    const subs = readStore('submissions');
    const recent = [...subs]
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      .slice(0, 5);
    ok(res, {
      stats: {
        activeAnnouncements: ann.length,
        publishedStories:    sto.length,
        activeVargs:         vgs.length,
        teamContacts:        cts.length,
        newSubmissions:      subs.filter(s => s.status === 'new').length,
        totalSubmissions:    subs.length,
      },
      recentSubmissions: recent,
    });
    return;
  }

  // Settings
  if (route === '/admin/settings' && req.method === 'GET') {
    ok(res, getSettings());
    return;
  }

  if (route === '/admin/settings/bulk' && req.method === 'POST') {
    parseJson(req).then(body => {
      const updated = getSettings().map(s => ({
        ...s,
        value: body[s.setting_key] !== undefined ? body[s.setting_key] : s.value,
      }));
      writeStore('settings', updated);
      ok(res, {});
    });
    return;
  }

  // Media list
  if (route === '/admin/media' && req.method === 'GET') {
    const all = readStore('media');
    const { items, meta } = paginate(all, q.get('page'), q.get('limit'));
    ok(res, items, meta);
    return;
  }

  // Media upload (mock – drain body, return placeholder)
  if (route === '/admin/media/upload' && req.method === 'POST') {
    const id = randomUUID();
    req.resume();
    req.on('end', () => {
      const item = {
        id,
        filename:   `upload-${id.slice(0, 8)}.jpg`,
        url:        `/uploads/${id}.jpg`,
        created_at: new Date().toISOString(),
      };
      const media = readStore('media');
      media.unshift(item);
      writeStore('media', media);
      ok(res, item);
    });
    return;
  }

  // Media delete
  const mediaDel = route.match(/^\/admin\/media\/([^/]+)$/);
  if (mediaDel && req.method === 'DELETE') {
    req.resume();
    writeStore('media', readStore('media').filter(m => m.id !== mediaDel[1]));
    ok(res, {});
    return;
  }

  // ── Generic CRUD for announcements / stories / vargs / contacts / submissions

  const m = route.match(/^\/admin\/(announcements|stories|vargs|contacts|submissions)(\/([^/]+)(\/(\w+))?)?$/);
  if (m) {
    const [, resource, , id, , action] = m;
    handleCRUD(req, res, resource, id, action, q);
    return;
  }

  fail(res, 404, 'Not found', 'NOT_FOUND');
}

// ── CRUD handler ──────────────────────────────────────────────────────────────

const SEARCH_FIELDS = {
  announcements: ['title_mr', 'title_en', 'desc_mr'],
  stories:       ['title_mr', 'title_en', 'slug'],
  vargs:         ['school_name', 'school_name_en', 'district_mr', 'vibhag_mr'],
  contacts:      ['name', 'email', 'phone', 'division_mr'],
  submissions:   ['submitter_name', 'submitter_email'],
};

function handleCRUD(req, res, resource, id, action, q) {
  // PUT /admin/submissions/:id/status
  if (resource === 'submissions' && action === 'status' && req.method === 'PUT') {
    parseJson(req).then(body => {
      const all = readStore('submissions');
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) return fail(res, 404, 'Not found', 'NOT_FOUND');
      all[idx] = { ...all[idx], ...body, updated_at: new Date().toISOString() };
      writeStore('submissions', all);
      ok(res, all[idx]);
    });
    return;
  }

  // POST /admin/:resource/:id/restore
  if (action === 'restore' && req.method === 'POST') {
    req.resume();
    const all = readStore(resource);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return fail(res, 404, 'Not found', 'NOT_FOUND');
    all[idx] = { ...all[idx], deleted_at: null };
    writeStore(resource, all);
    ok(res, all[idx]);
    return;
  }

  // GET list
  if (!id && req.method === 'GET') {
    const trash  = q.get('trash') === 'true';
    let items    = readStore(resource).filter(r => trash ? !!r.deleted_at : !r.deleted_at);
    const search = (q.get('search') || q.get('q') || '').toLowerCase();
    if (search) {
      const fields = SEARCH_FIELDS[resource] || ['name'];
      items = items.filter(r => fields.some(f => String(r[f] || '').toLowerCase().includes(search)));
    }
    // Resource-specific filters
    if (resource === 'announcements') {
      const st = q.get('status');
      if (st) items = items.filter(a => a.status === st);
    }
    if (resource === 'vargs') {
      const vib = q.get('vibhag');
      if (vib) items = items.filter(v => v.vibhag_mr === vib);
    }
    if (resource === 'contacts') {
      const div = q.get('division');
      if (div) items = items.filter(c => c.division_mr === div);
    }
    if (resource === 'stories') {
      const cat = q.get('category');
      const pub = q.get('published');
      if (cat) items = items.filter(s => s.category === cat);
      if (pub !== '' && pub !== null && pub !== undefined) items = items.filter(s => String(s.published) === pub);
    }
    if (resource === 'submissions') {
      const ft  = q.get('form_type');
      const st  = q.get('status');
      if (ft)  items = items.filter(s => s.form_type === ft);
      if (st)  items = items.filter(s => s.status === st);
    }
    const { items: page, meta } = paginate(items, q.get('page'), q.get('limit'));
    ok(res, page, meta);
    return;
  }

  // GET single
  if (id && !action && req.method === 'GET') {
    const item = readStore(resource).find(r => r.id === id);
    if (!item) return fail(res, 404, 'Not found', 'NOT_FOUND');
    ok(res, item);
    return;
  }

  // POST create
  if (!id && req.method === 'POST') {
    parseJson(req).then(body => {
      const now  = new Date().toISOString();
      const item = { id: randomUUID(), ...body, created_at: now, updated_at: now, deleted_at: null };
      const all  = readStore(resource);
      all.unshift(item);
      writeStore(resource, all);
      ok(res, item);
    });
    return;
  }

  // PUT update
  if (id && !action && req.method === 'PUT') {
    parseJson(req).then(body => {
      const all = readStore(resource);
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) return fail(res, 404, 'Not found', 'NOT_FOUND');
      all[idx] = { ...all[idx], ...body, updated_at: new Date().toISOString() };
      writeStore(resource, all);
      ok(res, all[idx]);
    });
    return;
  }

  // DELETE (soft)
  if (id && !action && req.method === 'DELETE') {
    req.resume();
    const all = readStore(resource);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return fail(res, 404, 'Not found', 'NOT_FOUND');
    all[idx] = { ...all[idx], deleted_at: new Date().toISOString() };
    writeStore(resource, all);
    ok(res, {});
    return;
  }

  fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
}

// ── Vite plugin ───────────────────────────────────────────────────────────────

export function cmsApi() {
  return {
    name: 'amrut-cms-api',
    configureServer(server)        { server.middlewares.use(cmsApiMiddleware); },
    configurePreviewServer(server) { server.middlewares.use(cmsApiMiddleware); },
  };
}
