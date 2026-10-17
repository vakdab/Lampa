const B = 'https://bbe.lme.isroot.in/api/v2';
const S = {
  uakino: ['UAkino', 'https://uakino.best'],
  uaflix: ['UAFlix', 'https://uafix.net'],
  bambooua: ['BambooUA', 'https://bambooua.com'],
  eneyida: ['Eneyida', 'https://eneyida.tv'],
  uaserials: ['UASerials', 'https://uaserials.com']
};
const H = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'Content-Type',
  'content-type': 'application/json; charset=utf-8'
};
const J = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: H });
const A = (value, base) => {
  try { return new URL(value, base).href; } catch (_) { return ''; }
};
const G = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; LampaSourceProxy/1.0)',
      'accept-language': 'uk-UA,uk;q=.9,en;q=.7',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw Error('HTTP ' + response.status);
  return response.text();
};
const C = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const unescapeUrl = value => String(value || '')
  .replace(/\\\\/g, '\\').replace(/\\\//g, '/').replace(/\\u0026/gi, '&')
  .replace(/&amp;/gi, '&').replace(/&#x2f;/gi, '/');
const isMedia = url => /(?:\.m3u8(?:[?#]|$)|\.mp4(?:[?#]|$)|\.webm(?:[?#]|$)|\.mkv(?:[?#]|$)|\/vod\/|\/hls\/|\/stream\/|\/video\/)/i.test(url);
const isDocument = url => /(?:\/embed(?:\/|$)|\/iframe(?:\/|$)|player|watch\?|\.html?(?:[?#]|$))/i.test(url);

function mediaUrls(html, base) {
  const result = [];
  const add = raw => {
    const url = A(unescapeUrl(raw).replace(/["'<>\\]+$/, ''), base);
    if (url && isMedia(url) && !isDocument(url) && !result.includes(url)) result.push(url);
  };
  const patterns = [
    /(?:file|src|source|data-file|data-src)\s*[:=]\s*["']([^"']+)["']/gi,
    /(?:file|src|source)\s*[:=]\s*\\?["']([^"']+?)\\?["']/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) add(match[1]);
  }
  return result;
}

function iframeUrls(html, base) {
  const result = [];
  const re = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = A(unescapeUrl(match[1]), base);
    if (url && !result.includes(url)) result.push(url);
  }
  return result;
}

function isContentLink(url, title, key) {
  let parsed;
  try { parsed = new URL(url); } catch (_) { return false; }
  if (parsed.origin !== S[key][1]) return false;
  const path = parsed.pathname.toLowerCase();
  if (!path || path === '/' || /(?:login|register|feedback|favorites|comments|genres?|categories|collections|colections|for-supporters|lastnews|lostpassword)/i.test(path)) return false;
  if (/^\/(?:filmy|films|series|serials|anime|cartoons|fcartoon|tv-show|search)\/?$/i.test(path)) return false;
  if (/^(?:\/f\/|\/xfsearch\/|\/index\.php\/?$)/i.test(path)) return false;
  if (/^(?:меню|пошук|увійти|реєстрація|головна|фільми|серіали|мультфільми|жанри|категорії|новинки|ua serials)$/i.test(C(title))) return false;
  return /\.html?(?:$|[?#])|\/(?:anime|serial|film|movie)[^/]*\/|\/[^/]+-[0-9]{3,}/i.test(url) || path.split('/').filter(Boolean).length >= 2;
}

function links(html, base, key) {
  const result = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{2,220}?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && result.length < 40) {
    const url = A(match[1], base);
    const title = C(match[2]);
    if (url && title && isContentLink(url, title, key) && !result.some(item => item.ref.url === url)) {
      result.push({ title, source: key, ref: { url, source: key } });
    }
  }
  return result;
}

async function search(key, query) {
  const base = S[key][1];
  const encoded = encodeURIComponent(query).replace(/%20/g, '+');
  const html = key === 'uaserials'
    ? await G(base + '/search/' + encodeURIComponent(query) + '/')
    : key === 'uakino'
    ? await G(base + '/ua/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', referer: base + '/' },
        body: new URLSearchParams({ do: 'search', subaction: 'search', story: query })
      })
    : await G(base + '/index.php?do=search&subaction=search&search_start=0&story=' + encoded);
  return links(html, base, key);
}

async function content(key, ref) {
  const base = S[key][1];
  const url = typeof ref === 'string' ? ref : ref && ref.url;
  if (!url) throw Error('Missing source URL');
  const html = await G(url, { headers: { referer: base + '/' } });
  const found = mediaUrls(html, url);
  for (const frame of iframeUrls(html, url).slice(0, 5)) {
    try {
      const frameHtml = await G(frame, { headers: { referer: url } });
      mediaUrls(frameHtml, frame).forEach(item => { if (!found.includes(item)) found.push(item); });
    } catch (_) {}
  }
  return {
    ok: true,
    type: 'movie',
    title: C((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]),
    streams: found.map((item, index) => ({
      url: item,
      title: S[key][0] + ' ' + (index + 1),
      quality: (item.match(/2160|1440|1080|720|480|360/) || ['auto'])[0],
      voice: { id: key, display_name: S[key][0] }
    }))
  };
}

addEventListener('fetch', event => event.respondWith((async () => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response('', { headers: H });
  if (url.pathname === '/health') return J({ ok: true, service: 'lampa-uk-proxy' });
  if (url.pathname === '/sources') {
    let old = [];
    try { const response = await fetch(B + '/sources'); const json = await response.json(); old = Array.isArray(json.sources) ? json.sources : []; } catch (_) {}
    const custom = Object.entries(S).map(([key, value]) => ({ key, name: value[0], enabled: true }));
    const seen = new Set(custom.map(item => item.key));
    return J({ ok: true, sources: custom.concat(old.filter(item => item && item.key && !seen.has(item.key))) });
  }
  if (url.pathname === '/search') {
    const requested = (url.searchParams.get('source') || url.searchParams.get('sources') || '').split(',');
    const keys = requested.filter(key => S[key]);
    const query = url.searchParams.get('title') || url.searchParams.get('query') || '';
    const items = [];
    for (const key of keys) try { items.push(...await search(key, query)); } catch (_) {}
    if (!keys.length) {
      const response = await fetch(B + url.pathname + url.search, { headers: request.headers });
      return new Response(response.body, { status: response.status, headers: { ...H, 'content-type': response.headers.get('content-type') || H['content-type'] } });
    }
    return J({ ok: true, items });
  }
  if ((url.pathname === '/content' || url.pathname === '/stream') && request.method === 'POST') {
    const body = await request.json();
    if (S[body.source]) {
      try {
        const data = await content(body.source, body.ref);
        return J(url.pathname === '/stream' ? { ok: true, streams: data.streams } : data);
      } catch (error) { return J({ ok: false, error: String(error) }, 502); }
    }
    const response = await fetch(B + url.pathname, { method: 'POST', headers: request.headers, body: JSON.stringify(body) });
    return new Response(response.body, { status: response.status, headers: { ...H, 'content-type': response.headers.get('content-type') || H['content-type'] } });
  }
  return J({ ok: false, error: 'not_found' }, 404);
})()));
