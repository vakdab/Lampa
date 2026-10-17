/* UA sources probe for Lampa. Runs from the phone (real UA IP), uses native() = no CORS on Android.
   It fetches search/film/player pages of Eneyida + UAkino and reports what is really returned.
   Result is shown on screen and copied/sent to a paste URL you can open. */
(function () {
  'use strict';
  if (window.__ua_probe) return; window.__ua_probe = true;

  var UA_HEAD = { 'Accept-Language': 'uk-UA,uk;q=0.9' };
  var out = [];
  function log(s) { out.push(s); console.log('[UA-PROBE]', s); }

  function req(url, post, headers) {
    return new Promise(function (resolve) {
      var n = new Lampa.Reguest(), t0 = Date.now();
      var opts = { dataType: 'text', headers: headers || UA_HEAD, timeout: 20000 };
      n['native'](url, function (d) {
        resolve({ ok: true, ms: Date.now() - t0, body: typeof d === 'string' ? d : JSON.stringify(d) });
      }, function (e) {
        resolve({ ok: false, ms: Date.now() - t0, status: e && e.status, msg: e && (e.responseText || e.message || '').toString().slice(0, 120) });
      }, post || false, opts);
    });
  }
  function summarize(name, r, checks) {
    if (!r.ok) { log(name + ' -> FAIL status=' + r.status + ' ' + (r.msg || '')); return; }
    var b = r.body || '', o = name + ' -> OK ' + b.length + 'b ' + r.ms + 'ms';
    if (/Sorry, you have been blocked|Just a moment|Attention Required/i.test(b)) o += ' [CLOUDFLARE BLOCK]';
    (checks || []).forEach(function (c) { o += ' | ' + c[0] + '=' + (b.match(c[1]) || []).length; });
    log(o);
  }
  function show() {
    var text = out.join('\n');
    try { Lampa.Utils.copyTextToClipboard && Lampa.Utils.copyTextToClipboard(text, function () {}, function () {}); } catch (e) {}
    var html = $('<div style="white-space:pre-wrap;font-size:.8em;line-height:1.35;word-break:break-all;max-height:70vh;overflow:auto"></div>').text(text);
    Lampa.Modal.open({ title: 'UA probe (' + out.length + ' lines)', html: html, size: 'large', onBack: function () { Lampa.Modal.close(); Lampa.Controller.toggle('content'); } });
  }

  async function run() {
    Lampa.Noty.show('UA probe: running...');
    var E = 'https://eneyida.tv', K = 'https://uakino.best';
    var r;

    // ---- Eneyida
    r = await req(E + '/films/'); summarize('ENEYIDA list', r, [['cards', /short_title/g]]);
    r = await req(E + '/index.php?do=search&subaction=search&story=' + encodeURIComponent('Дюна')); summarize('ENEYIDA search GET', r, [['cards', /short_title/g]]);
    var url = E + '/9366-duna-chastyna-druga.html';
    r = await req(url); summarize('ENEYIDA film page', r, [['iframe', /<iframe/g], ['tabs_b', /tabs_b/g], ['full_info', /full_info/g]]);
    var m = r.ok && r.body.match(/<iframe[^>]+(?:src|data-src)="([^"]+)"/);
    if (m) {
      log('ENEYIDA player iframe = ' + m[1]);
      var pu = m[1].indexOf('//') === 0 ? 'https:' + m[1] : m[1];
      r = await req(pu, false, { 'Referer': E + '/', 'Accept-Language': 'uk-UA' });
      summarize('ENEYIDA player page', r, [['file:', /file\s*:/g], ['m3u8', /\.m3u8/g]]);
      if (r.ok) { var f = r.body.match(/file\s*:\s*(['"])(.{0,160})/); log('ENEYIDA file= ' + (f ? f[2] : 'none')); }
    } else { log('ENEYIDA: NO player iframe in page (geo/anti-bot?)'); if (r.ok) log('ENEYIDA tabs_box html= ' + ((r.body.match(/id="tabs_box"[\s\S]{0,400}/) || [''])[0]).replace(/\s+/g, ' ')); }

    // ---- UAkino
    r = await req(K + '/filmy/'); summarize('UAKINO list', r, [['cards', /movie-title|movie-item/g]]);
    r = await req(K + '/ua/', 'do=search&subaction=search&story=' + encodeURIComponent('Дюна'), { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Language': 'uk-UA' });
    summarize('UAKINO search POST', r, [['cards', /movie-title/g]]);
    var link = r.ok && (r.body.match(/href="(https:\/\/uakino\.best\/[^"]+\.html)"/) || [])[1];
    log('UAKINO first result = ' + link);
    if (link) {
      r = await req(link); summarize('UAKINO film page', r, [['playlists-ajax', /playlists-ajax/g], ['iframe', /<iframe/g], ['news_id', /data-news_id/g]]);
      var id = r.ok && (r.body.match(/data-news_id="(\d+)"/) || [])[1];
      if (id) {
        var pl = await req(K + '/engine/ajax/playlists.php?news_id=' + id + '&xfield=playlist', false, { 'X-Requested-With': 'XMLHttpRequest', 'Referer': link });
        summarize('UAKINO playlists.php', pl, [['data-file', /data-file/g], ['voice', /data-voice/g]]);
        var df = pl.ok && (pl.body.match(/data-file=\\?"([^"\\]+)/) || [])[1];
        log('UAKINO first data-file = ' + df);
        if (df) {
          r = await req(df.indexOf('//') === 0 ? 'https:' + df : df, false, { 'Referer': K + '/' });
          summarize('UAKINO player', r, [['file:', /file\s*:/g], ['m3u8', /\.m3u8/g]]);
          if (r.ok) { var g = r.body.match(/file\s*:\s*["']([^"']{0,160})/); log('UAKINO file= ' + (g ? g[1] : 'none')); }
        }
      }
    }
    log('PLATFORM android=' + (Lampa.Platform.is('android')) + ' ua=' + navigator.userAgent.slice(0, 80));
    show();
  }

  function start() { setTimeout(run, 800); }
  if (window.appready) start(); else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
