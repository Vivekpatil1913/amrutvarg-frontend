// Turns a CMS story row into the shape the site's story components read.
//
// The CMS stores one flat row — `title_mr`, `short_en`, and a `content` object
// keyed by language — while StoryCard, StoryCover and StoryPage expect the
// shape src/data/yashogathaStories.js uses: a `mr` and an `en` side, each with
// its title, summary and the six parts of the body. Everything that reads a
// story goes through here, so there is one place where the two shapes meet.

// The parts StoryPage renders as a list of paragraphs. The admin writes them in
// one textarea each, so a blank line starts a new paragraph; an array that came
// from an older record is already in the right shape and passes through.
const toParagraphs = (value) => {
  if (Array.isArray(value)) return value.map((p) => String(p).trim()).filter(Boolean);
  return String(value ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
};

// The parts StoryPage renders as a single block of text.
const toText = (value) => (Array.isArray(value) ? value.join('\n\n') : String(value ?? ''));

const PARAGRAPH_PARTS = ['journey', 'change', 'lessons'];
const TEXT_PARTS = ['intro', 'challenge', 'conclusion'];

function side(row, lang) {
  const parts = row.content?.[lang] ?? {};
  const out = {
    title: row[`title_${lang}`] || '',
    short: row[`short_${lang}`] || '',
  };
  for (const part of TEXT_PARTS) out[part] = toText(parts[part]);
  for (const part of PARAGRAPH_PARTS) out[part] = toParagraphs(parts[part]);
  return out;
}

// A field left blank in one language falls back to the other rather than
// rendering an empty page — the same rule `pick` applies to section wording.
function withFallback(primary, other) {
  const out = { ...primary };
  for (const part of TEXT_PARTS) out[part] = primary[part] || other[part];
  for (const part of PARAGRAPH_PARTS) out[part] = primary[part].length ? primary[part] : other[part];
  out.title = primary.title || other.title;
  out.short = primary.short || other.short;
  return out;
}

export function storyFromCms(row) {
  if (!row || !row.slug) return null;
  const mr = side(row, 'mr');
  const en = side(row, 'en');
  return {
    slug: row.slug,
    category: row.category || 'personality',
    // StoryCover reads `image` for a bundled photograph and `image_url` for an
    // uploaded one, exactly as the bundled stories do.
    image: row.image_key || '',
    image_url: row.image_url || '',
    featured: !!row.featured,
    mr: withFallback(mr, en),
    en: withFallback(en, mr),
  };
}

// A {data, meta} envelope from the CMS, in the {items, total, …} shape the
// stories service and its callers already work with.
export function storyPageFromCms(body) {
  if (!body || !Array.isArray(body.data) || !body.meta) return null;
  const items = body.data.map(storyFromCms).filter(Boolean);
  const { total, page, pageSize, totalPages } = body.meta;
  if (![total, page, pageSize, totalPages].every(Number.isInteger)) return null;
  return { items, total, page, pageSize, totalPages };
}
