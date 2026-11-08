/* Telegram Mini App: only the behaviour, never the colours.
   Inside Telegram a downward drag from the top of the page is taken by Telegram (it collapses/closes the mini app),
   so the page "disappears" while scrolling. Telegram's own switch for this is disableVerticalSwipes().
   Outside Telegram nothing happens. No colours, no fullscreen, no layout change. */
(function () {
  'use strict';
  if (window.__snack_telegram) return;
  window.__snack_telegram = true;

  function inTelegram() {
    try {
      if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) return true;
      var h = String(location.hash || '') + String(location.search || '');
      if (/tgWebApp(Data|Version|Platform)/i.test(h)) return true;
      if (window.TelegramWebviewProxy) return true;
    } catch (e) {}
    return false;
  }

  function calm() {
    var W = window.Telegram && Telegram.WebApp;
    if (!W) return false;
    try { if (typeof W.ready === 'function') W.ready(); } catch (e) {}
    try { if (typeof W.expand === 'function') W.expand(); } catch (e) {}
    try { if (typeof W.disableVerticalSwipes === 'function') W.disableVerticalSwipes(); } catch (e) {}
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
      calm();
      setTimeout(calm, 500);
      setTimeout(calm, 2000);
      try { Telegram.WebApp.onEvent('activated', calm); } catch (e) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
