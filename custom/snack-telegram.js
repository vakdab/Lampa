/* Telegram Mini App: make it look exactly like the web app / PWA.
   Telegram paints its own header, background and bottom bar (grey/white by default) around a mini app, which
   is the grey strip the web version does not have. Here they are painted black, the app is expanded and the
   pull-down-to-close swipe is off. Outside Telegram nothing happens. */
(function () {
  'use strict';
  if (window.__snack_telegram) return;
  window.__snack_telegram = true;

  var COLOR = '#000000';

  /* are we inside Telegram? (its launch parameters live in the URL hash or in the user agent) */
  function inTelegram() {
    try {
      if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) return true;
      var h = String(location.hash || '') + String(location.search || '');
      if (/tgWebApp(Data|Version|Platform)/i.test(h)) return true;
      if (window.TelegramWebviewProxy) return true;
      if (/Telegram/i.test(navigator.userAgent || '')) return true;
      if (window.name && /telegram/i.test(window.name)) return true;
    } catch (e) {}
    return false;
  }

  function paint() {
    var W = window.Telegram && Telegram.WebApp;
    if (!W) return false;
    function call(fn, a) { try { if (typeof W[fn] === 'function') W[fn](a); } catch (e) {} }
    call('ready');
    call('expand');
    call('setHeaderColor', COLOR);
    call('setBackgroundColor', COLOR);
    call('setBottomBarColor', COLOR);
    call('disableVerticalSwipes');
    /* Telegram's own grey also comes through the page: the colours it hands out as CSS variables */
    try {
      var st = document.getElementById('snack-tg-css');
      if (!st) {
        st = document.createElement('style');
        st.id = 'snack-tg-css';
        st.textContent =
          'html,body{background:' + COLOR + '!important}' +
          ':root{--tg-theme-bg-color:' + COLOR + '!important;--tg-theme-secondary-bg-color:' + COLOR + '!important;--tg-theme-header-bg-color:' + COLOR + '!important;--tg-theme-bottom-bar-bg-color:' + COLOR + '!important}';
        (document.head || document.documentElement).appendChild(st);
      }
      document.documentElement.classList.add('snack-in-telegram');
      if (document.body) document.body.classList.add('snack-in-telegram');
    } catch (e) {}
    return true;
  }

  function loadSdk(done) {
    if (window.Telegram && Telegram.WebApp) return done();
    var s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.async = true;
    s.onload = done;
    s.onerror = function () {};
    (document.head || document.documentElement).appendChild(s);
  }

  function start() {
    if (!inTelegram()) return;
    loadSdk(function () {
      paint();
      /* Telegram repaints on theme / viewport changes: paint again */
      try {
        var W = Telegram.WebApp;
        if (W && W.onEvent) {
          W.onEvent('themeChanged', paint);
          W.onEvent('viewportChanged', paint);
          W.onEvent('activated', paint);
        }
      } catch (e) {}
      setTimeout(paint, 500);
      setTimeout(paint, 2000);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
