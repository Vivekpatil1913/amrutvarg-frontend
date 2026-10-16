// Building a share link for one piece of content.
// Run with: npm test
//
// The two things worth pinning: a shared address is always a public page on
// this site, and a title carrying punctuation cannot break the wa.me link.

import test from 'node:test';
import assert from 'node:assert/strict';
import { publicUrl, shareText, whatsappHref, canWebShare } from './share.js';

const ORIGIN = 'https://amrutvarg.example.gov.in';

// ── the shared address ──────────────────────────────────────────────────────

test('a site path becomes an absolute public address', () => {
  assert.equal(publicUrl('/yashogatha', ORIGIN), `${ORIGIN}/yashogatha`);
  assert.equal(publicUrl('/yashogatha/my-story', ORIGIN), `${ORIGIN}/yashogatha/my-story`);
  assert.equal(publicUrl('/yashogatha#video-3', ORIGIN), `${ORIGIN}/yashogatha#video-3`);
});

test('a trailing slash on the origin is not doubled', () => {
  assert.equal(publicUrl('/yashogatha', `${ORIGIN}/`), `${ORIGIN}/yashogatha`);
  assert.equal(publicUrl('/yashogatha', `${ORIGIN}///`), `${ORIGIN}/yashogatha`);
});

test('anything that is not a path on this site is refused', () => {
  // A share must not hand out a CMS endpoint, an upload path on another host,
  // or an address the recipient cannot open.
  for (const bad of ['', '   ', null, undefined, 'yashogatha', 'https://evil.test/x', '//evil.test/x']) {
    assert.equal(publicUrl(bad, ORIGIN), '', String(bad));
  }
});

// ── the message ─────────────────────────────────────────────────────────────

test('the message carries the lead, the title and the link', () => {
  const url = `${ORIGIN}/yashogatha/ravi`;
  const text = shareText({ lead: 'ही यशोगाथा पहा:', title: 'रवीची गोष्ट', url });
  assert.ok(text.includes('ही यशोगाथा पहा:'));
  assert.ok(text.includes('रवीची गोष्ट'));
  assert.ok(text.includes(url));
  // The link sits on its own line so WhatsApp previews it.
  assert.equal(text.split('\n').pop(), url);
});

test('a missing lead or title simply drops out', () => {
  const url = `${ORIGIN}/yashogatha`;
  assert.equal(shareText({ title: 'शीर्षक', url }), `शीर्षक\n${url}`);
  assert.equal(shareText({ lead: 'पहा:', url }), `पहा:\n${url}`);
  assert.equal(shareText({ url }), url);
  assert.equal(shareText({}), '');
});

// ── the WhatsApp link ───────────────────────────────────────────────────────

test('the wa.me link opens WhatsApp with the message prefilled', () => {
  const href = whatsappHref('Watch this: Story\nhttps://x.test/a');
  assert.ok(href.startsWith('https://wa.me/?text='));
  // Round-trips exactly.
  assert.equal(decodeURIComponent(href.split('text=')[1]), 'Watch this: Story\nhttps://x.test/a');
});

test('punctuation in a title cannot break the link', () => {
  // & would start a new parameter, # would truncate it, and a space would
  // break the href — all of them have to survive as content.
  const title = 'A & B #1 — 50% "done" ?yes=no +plus /slash';
  const url = `${ORIGIN}/yashogatha/a-b`;
  const href = whatsappHref(shareText({ lead: 'Watch:', title, url }));

  const encoded = href.slice('https://wa.me/?text='.length);
  assert.ok(!encoded.includes(' '), 'a raw space would break the href');
  assert.ok(!encoded.includes('#'), 'a raw # would truncate the parameter');
  assert.ok(!encoded.includes('&'), 'a raw & would start a new parameter');

  const back = decodeURIComponent(encoded);
  assert.ok(back.includes(title), 'the title must survive intact');
  assert.ok(back.endsWith(url), 'the link must survive intact');
});

test('Marathi text survives encoding', () => {
  const title = 'रवीची यशोगाथा — अमृत वर्ग';
  const href = whatsappHref(shareText({ title, url: `${ORIGIN}/yashogatha` }));
  assert.ok(decodeURIComponent(href.split('text=')[1]).includes(title));
});

test('an empty message yields no link rather than a bare wa.me', () => {
  // A bare wa.me opens WhatsApp with nothing in it, which looks broken.
  assert.equal(whatsappHref(''), '');
  assert.equal(whatsappHref('   '), '');
  assert.equal(whatsappHref(null), '');
});

test('nothing in here sends a message', () => {
  // The whole surface is a string builder: there is no fetch, no form post,
  // and no WhatsApp API call. Opening the href is the visitor's own action.
  const href = whatsappHref('x');
  assert.ok(href.startsWith('https://wa.me/?text='));
  assert.equal(typeof href, 'string');
});

// ── native sharing ──────────────────────────────────────────────────────────

test('native sharing is reported as unavailable when the browser has none', () => {
  // node has no navigator.share, which is the server-render case too.
  assert.equal(canWebShare(), false);
});
