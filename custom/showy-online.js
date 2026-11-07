/* Showy / wtch online: http://wtch.ch/m не працює на https, тому підміняємо
   на робочий https-хост https://showy.pro/online.js */
(function () {
  'use strict';

  var GOOD = 'https://showy.pro/online.js';
  var BAD = /^https?:\/\/(?:www\.)?wtch\.ch(?:\/|$)/i;

  function fixStored() {
    try {
      var list = JSON.parse(localStorage.getItem('plugins') || '[]');
      if (!Array.isArray(list)) return;
      var changed = false, has = false;
      list.forEach(function (p) {
        var url = typeof p === 'string' ? p : (p && p.url) || '';
        if (url.indexOf('showy.pro/online.js') >= 0) has = true;
      });
      var out = [];
      list.forEach(function (p) {
        var url = typeof p === 'string' ? p : (p && p.url) || '';
        if (BAD.test(url)) {
          changed = true;
          if (!has) { out.push({ url: GOOD, status: 1, name: 'Showy Online' }); has = true; }
        } else out.push(p);
      });
      if (changed) localStorage.setItem('plugins', JSON.stringify(out));
    } catch (e) {}
  }

  // Якщо Лампа вже стартувала зі старим записом, підключаємо новий плагін одразу.
  function load() {
    if (window.showy_pro_eu_runtime_loaded || window.__showy_online_requested) return;
    window.__showy_online_requested = true;
    if (window.Lampa && Lampa.Utils && Lampa.Utils.putScriptAsync) {
      Lampa.Utils.putScriptAsync([GOOD + '?v=' + Date.now()], function () {});
    } else {
      var s = document.createElement('script');
      s.src = GOOD + '?v=' + Date.now();
      document.head.appendChild(s);
    }
  }

  function needed() {
    try {
      return (localStorage.getItem('plugins') || '').indexOf('wtch.ch') >= 0 ||
             (localStorage.getItem('plugins') || '').indexOf('showy.pro/online.js') >= 0;
    } catch (e) { return false; }
  }

  var wasBad = needed();
  fixStored();
  if (wasBad) {
    if (window.appready) load();
    else if (window.Lampa && Lampa.Listener) {
      Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') load(); });
      setTimeout(load, 4000);
    } else setTimeout(load, 2000);
  }
})();
