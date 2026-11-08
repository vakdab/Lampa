#!/usr/bin/env bash
# Збирає dist/moon-interface.js з модулів у src-modules/
set -euo pipefail
cd "$(dirname "$0")"
OUT=dist/moon-interface.js
python3 - <<'PY'
order = ["lampa-mobile-apple","snack-defaults","snack-tv","snack-header","snack-leftdock",
         "snack-settings-merge","snack-settings-hide","showy-online","auto-plugins"]
css = """
  var st = document.createElement('style'); st.id = 'moon-source-contrast';
  st.textContent = [
    '.torrent-item,.torrent-file,.torrent-serial{background:rgba(78,78,84,.9);color:#fff;border:1px solid rgba(255,255,255,.24)}',
    'body.glass--style .torrent-serial,body.glass--style .torrent-file,body.glass--style .torrent-item{background:rgba(78,78,84,.94)!important;color:#fff!important;border:1px solid rgba(255,255,255,.28)}',
    'body.glass--style .torrent-serial.focus,body.glass--style .torrent-file.focus,body.glass--style .torrent-item.focus,.torrent-item.focus,.torrent-file.focus,.torrent-serial.focus{background:rgba(255,255,255,.35)!important}',
    'body.stv.selectbox--open .selectbox-item{margin:.45em 0;border:1px solid rgba(255,255,255,.24);border-radius:.7em;background:rgba(78,78,84,.9);color:#fff}',
    'body.stv.selectbox--open .selectbox-item.focus{background:#353535}'
  ].join('\\n');
  (document.head || document.documentElement).appendChild(st);
"""
head = """/*!
 * Moon / Snack TV interface for Lampa (single-file plugin).
 * Підключення: Налаштування -> Розширення -> Додати плагін -> URL цього файлу.
 */
(function () {
  'use strict';
  if (window.__moon_plugin_boot) return;
  window.__moon_plugin_boot = true;
  function run() {
""" + css
tail = """
  }
  function ready() { return window.Lampa && Lampa.Listener && Lampa.Storage && Lampa.Settings && Lampa.Template; }
  function start() {
    if (window.appready) run();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') run(); });
  }
  if (ready()) start();
  else { var t = setInterval(function () { if (ready()) { clearInterval(t); start(); } }, 200); }
})();
"""
body = ""
for n in order:
    body += "\n/* ===== %s ===== */\n" % n + open("src-modules/%s.js" % n, encoding="utf-8").read() + "\n"
open("dist/moon-interface.js", "w", encoding="utf-8").write(head + body + tail)
PY
node --check "$OUT" && echo "OK: $OUT"
