/* Auto plugins: підключає потрібні плагіни разом з Moon-інтерфейсом.
   1) вантажить кожен у поточній сесії (працює одразу, без перезапуску);
   2) один раз додає у список плагінів Lampa (без дублікатів), щоб лишались після перезапуску.
   Щоб вимкнути якийсь, видали його з Налаштування -> Розширення (повторно не додається). */
(function () {
  'use strict';
  if (window.__moon_auto_plugins) return;
  window.__moon_auto_plugins = true;

  var LIST = [
    { name: 'UAFree',        url: 'https://uafree.mooo.com/' },
    { name: 'UAFilms',       url: 'https://films.aartzz.pp.ua/l' },
    { name: 'NB557 Free',    url: 'https://nb557.github.io/plugins/free.js' },
    { name: 'L-vid Online',  url: 'https://beta.l-vid.online/on.js' }
  ];
  var DONE_KEY = 'moon_auto_plugins_added';

  function norm(u) { return String(u || '').replace(/^https?:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase(); }
  function urlOf(p) { return typeof p === 'string' ? p : (p && p.url) || ''; }

  function readList() {
    try { var l = JSON.parse(localStorage.getItem('plugins') || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }
  function readDone() {
    try { var d = JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); return Array.isArray(d) ? d : []; } catch (e) { return []; }
  }

  // 2) запис у список Lampa, лише для тих, що ще ніколи не додавались (щоб видалені вручну не поверталися)
  function register() {
    try {
      var list = readList(), done = readDone(), changed = false;
      LIST.forEach(function (it) {
        var k = norm(it.url);
        if (done.indexOf(k) >= 0) return;
        var has = list.some(function (p) { return norm(urlOf(p)) === k; });
        if (!has) { list.push({ url: it.url, status: 1, name: it.name, author: 'Moon' }); changed = true; }
        done.push(k);
      });
      if (changed) localStorage.setItem('plugins', JSON.stringify(list));
      localStorage.setItem(DONE_KEY, JSON.stringify(done));
    } catch (e) {}
  }

  // 1) завантаження в поточній сесії: лише ті, що не вимкнені/не видалені користувачем
  function enabled(it) {
    var k = norm(it.url), list = readList(), done = readDone();
    var found = null;
    list.forEach(function (p) { if (norm(urlOf(p)) === k) found = p; });
    if (found) return typeof found === 'string' || found.status !== 0;
    return done.indexOf(k) < 0; // ще не реєстрували = перший запуск
  }

  function loaded(it) { return window.__moon_loaded && window.__moon_loaded[norm(it.url)]; }

  function loadAll() {
    window.__moon_loaded = window.__moon_loaded || {};
    var todo = LIST.filter(function (it) { return enabled(it) && !loaded(it); });
    register();
    // Lampa сама підхопить усі з localStorage при старті; щоб не було подвійного запуску,
    // вантажимо вручну лише ті, яких Lampa ще не завантажила в цій сесії.
    todo.forEach(function (it) {
      var k = norm(it.url);
      if (document.querySelector('script[src^="' + it.url.replace(/"/g, '') + '"]')) { window.__moon_loaded[k] = 1; return; }
      window.__moon_loaded[k] = 1;
      var s = document.createElement('script');
      s.src = it.url + (it.url.indexOf('?') < 0 ? '?' : '&') + 'v=' + Date.now();
      s.async = true;
      s.onerror = function () { window.__moon_loaded[k] = 0; };
      document.head.appendChild(s);
    });
  }

  if (window.appready) loadAll();
  else if (window.Lampa && Lampa.Listener) {
    Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') loadAll(); });
    setTimeout(loadAll, 5000);
  } else setTimeout(loadAll, 2000);
})();
