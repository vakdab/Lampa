/* Settings: hide the sections «Канали» (content_rows), «Парсер», «TorrServer» and the «Скрінсейвер» block of «Інше».
   Only what is drawn is hidden: nothing is removed, the features and the stored values stay as they are. */
(function () {
  'use strict';
  if (window.__snack_settings_hide) return;
  window.__snack_settings_hide = true;

  /* sections of the main Settings list (data-component) */
  var FOLDERS = ['content_rows', 'parser', 'server'];
  /* the options of the screensaver block (data-name) */
  var PARAMS = ['screensaver', 'screensaver_type', 'screensaver_time'];

  function css() {
    if (document.getElementById('snack-hide-css')) return;
    var st = document.createElement('style');
    st.id = 'snack-hide-css';
    var rules = [];
    FOLDERS.forEach(function (f) { rules.push('.settings-folder[data-component="' + f + '"]'); });
    PARAMS.forEach(function (n) { rules.push('.settings-param[data-name="' + n + '"]'); });
    st.textContent = rules.join(',') + '{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* take the folders out of the page itself (a plain CSS rule can lose to the theme or a late re-render) */
  function dropFolders() {
    try {
      FOLDERS.forEach(function (f) {
        var list = document.querySelectorAll('.settings-folder[data-component="' + f + '"]');
        for (var i = 0; i < list.length; i++) {
          list[i].style.setProperty('display', 'none', 'important');
          list[i].classList.remove('selector');
          if (list[i].parentNode) list[i].parentNode.removeChild(list[i]);
        }
      });
    } catch (e) {}
  }

  /* the block's title is a plain div without a name: find it as the title right before the first hidden option */
  function hideTitles() {
    try {
      var first = document.querySelector('.settings-param[data-name="screensaver"]');
      if (!first) return;
      var prev = first.previousElementSibling;
      while (prev && !prev.classList.contains('settings-param-title')) prev = prev.previousElementSibling;
      if (prev && prev.style.display !== 'none') prev.style.display = 'none';
    } catch (e) {}
  }

  /* also take them out of the lists Lampa builds (so the remote/keyboard never lands on a hidden row) */
  function patchApi() {
    try {
      var api = window.Lampa && Lampa.SettingsApi;
      if (!api || api.__snack_hide) return !!(api && api.__snack_hide);
      api.__snack_hide = true;
      var all = api.allComponents;
      api.allComponents = function () {
        var c = all.apply(api, arguments), out = {}, k;
        for (k in c) if (FOLDERS.indexOf(k) < 0) out[k] = c[k];
        return out;
      };
    } catch (e) {}
    return true;
  }

  function start() {
    css();
    hideTitles();
    dropFolders();
    var tries = 0;
    (function wait() { if (!patchApi() && tries++ < 200) setTimeout(wait, 100); })();
    if (window.MutationObserver && document.body) {
      new MutationObserver(function () { hideTitles(); dropFolders(); }).observe(document.body, { childList: true, subtree: true });
    }
    setInterval(function () { hideTitles(); dropFolders(); }, 500);
  }

  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
