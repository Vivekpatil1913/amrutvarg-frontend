// What the site is willing to render for an external media URL.
// Run with: npm test
//
// These deliberately duplicate the CMS backend's src/lib/mediaUrl.test.js. The
// two copies are meant to agree; if one drifts, the matching test fails and
// says so, which is the point of keeping both.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeHttpUrl, videoEmbed, audioEmbed, mediaSrc, formatDuration, MAX_URL_LENGTH,
} from './mediaUrl.js';

test('only http and https are rendered at all', () => {
  assert.equal(isSafeHttpUrl('https://example.org/a.mp4'), true);
  assert.equal(isSafeHttpUrl('http://example.org/a.mp4'), true);
  for (const bad of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>',
    'file:///etc/passwd', 'blob:https://x.test/a', 'ftp://x.test/a.mp4',
    '', '   ', 'not a url', '//example.org', null, undefined,
  ]) {
    assert.equal(isSafeHttpUrl(bad), false, String(bad));
  }
  assert.equal(isSafeHttpUrl('https://u:p@example.org/a.mp4'), false);
  assert.equal(isSafeHttpUrl(`https://example.org/${'a'.repeat(MAX_URL_LENGTH)}`), false);
});

test('an iframe src is rebuilt from the id, never passed through', () => {
  const expected = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0';
  for (const url of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=PLsomething',
  ]) {
    assert.equal(videoEmbed(url).src, expected, url);
  }
  const crafted = videoEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&origin=https://evil.test');
  assert.equal(crafted.src, expected);
  assert.ok(!crafted.src.includes('evil'));
});

test('lookalike hosts are not embedded', () => {
  for (const url of [
    'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com.evil.test/123456789',
    'https://instagram.com.evil.test/reel/Cx1y2z3AbCd/',
  ]) {
    const r = videoEmbed(url);
    assert.equal(r.provider, 'link', url);
    assert.equal(r.src, '', url);
  }
});

test('Vimeo and Instagram reels resolve to their player embeds', () => {
  assert.equal(videoEmbed('https://vimeo.com/123456789').src, 'https://player.vimeo.com/video/123456789');
  assert.equal(
    videoEmbed('https://www.instagram.com/reel/Cx1y2z3AbCd/').src,
    'https://www.instagram.com/reel/Cx1y2z3AbCd/embed/',
  );
});

test('direct files play natively over https and are links over http', () => {
  assert.equal(videoEmbed('https://cdn.test/a.mp4').mode, 'video');
  assert.equal(videoEmbed('http://cdn.test/a.mp4').mode, 'link');
  assert.equal(audioEmbed('https://cdn.test/a.mp3').mode, 'audio');
  assert.equal(audioEmbed('http://cdn.test/a.mp3').mode, 'link');
});

test('Spotify embeds; other podcast hosts are an external link', () => {
  assert.equal(
    audioEmbed('https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk').src,
    'https://open.spotify.com/embed/episode/4rOoJ6Egrf8K2IrywzwOMk',
  );
  assert.equal(audioEmbed('https://podcasts.apple.com/in/podcast/x/id1').mode, 'link');
});

test('an unsafe URL yields null, so a component renders nothing at all', () => {
  assert.equal(videoEmbed('javascript:alert(1)'), null);
  assert.equal(audioEmbed('data:audio/mp3;base64,AAA'), null);
});

// ── stored-file paths ───────────────────────────────────────────────────────

test('a stored /uploads path is joined to the media host', () => {
  assert.equal(mediaSrc('http://localhost:4000/api/v1', '/uploads/video/a.mp4'), 'http://localhost:4000/uploads/video/a.mp4');
  assert.equal(mediaSrc('https://cms.test/api/v1/', '/uploads/audio/a.mp3'), 'https://cms.test/uploads/audio/a.mp3');
});

test('anything that is not an /uploads path or a safe URL resolves to nothing', () => {
  assert.equal(mediaSrc('https://cms.test/api/v1', '../../etc/passwd'), '');
  assert.equal(mediaSrc('https://cms.test/api/v1', 'javascript:alert(1)'), '');
  assert.equal(mediaSrc('https://cms.test/api/v1', ''), '');
  assert.equal(mediaSrc('https://cms.test/api/v1', 'https://cdn.test/a.mp4'), 'https://cdn.test/a.mp4');
});

// ── duration ────────────────────────────────────────────────────────────────

test('duration is formatted, and unknown lengths show nothing', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(59), '0:59');
  assert.equal(formatDuration(612), '10:12');
  assert.equal(formatDuration(3661), '1:01:01');
  assert.equal(formatDuration(null), '');
  assert.equal(formatDuration(undefined), '');
  assert.equal(formatDuration(-1), '');
  assert.equal(formatDuration('abc'), '');
});

// ── YouTube: video vs channel vs playlist ───────────────────────────────────
//
// These mirror the CMS backend's own tests. A channel link must open the
// channel and a video link the video; turning one into the other sends the
// reader somewhere the editor did not choose.

test('every YouTube video form is reported as a video', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
  ]) {
    assert.equal(videoEmbed(url).kind, 'video', url);
  }
});

test('a channel is never rendered as a video embed', () => {
  for (const url of [
    'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
    'https://www.youtube.com/@amrutvarg',
    'https://www.youtube.com/c/AmrutVarg',
    'https://www.youtube.com/user/AmrutVarg',
  ]) {
    const r = videoEmbed(url);
    assert.equal(r.kind, 'channel', url);
    assert.equal(r.mode, 'link', url);
    assert.equal(r.src, '', url);
  }
});

test('a channel link still points at that channel', () => {
  assert.equal(videoEmbed('https://www.youtube.com/@amrutvarg').url, 'https://www.youtube.com/@amrutvarg');
});

test('a playlist embeds as a series, and a video in a playlist stays a video', () => {
  assert.equal(
    videoEmbed('https://www.youtube.com/playlist?list=PLabcdefghijkl').src,
    'https://www.youtube-nocookie.com/embed/videoseries?list=PLabcdefghijkl',
  );
  const inPlaylist = videoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghijkl');
  assert.equal(inPlaylist.kind, 'video');
  assert.equal(inPlaylist.src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
});

test('a channel on a lookalike host is not a YouTube channel', () => {
  assert.equal(videoEmbed('https://youtube.com.evil.test/@amrutvarg').kind, 'page');
  assert.equal(videoEmbed('https://evil-youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw').kind, 'page');
});

test('every result says what it is', () => {
  assert.equal(videoEmbed('https://cdn.test/a.mp4').kind, 'file');
  assert.equal(videoEmbed('https://example.org/page').kind, 'page');
  assert.equal(videoEmbed('https://vimeo.com/123456789').kind, 'video');
});
