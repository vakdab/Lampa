/* Settings merge: the «Закусь TV» and «Agnative» folders disappear from the Settings list and ALL their
   options (with their section titles, and the sub-pages of Agnative) are shown inside «Інтерфейс».
   Nothing about the options themselves changes: the same params, the same onChange, the same storage keys.
   Standalone; it only re-routes what Lampa.SettingsApi returns. */
(function () {
  'use strict';
  if (window.__snack_settings_merge) return;
  window.__snack_settings_merge = true;

  var TARGET = 'interface';
  /* the folders whose options move into the Interface (matched by the name they were registered with) */
  var NAMES = ['закусь tv', 'agnative'];
  /* Agnative's own sub-pages */
  var AGN_SUBS = ['agnative_topnav', 'agnative_hero', 'agnative_settings_hide'];

  function lc(s) { return String(s || '').replace(/<[^>]*>/g, '').trim().toLowerCase(); }

  /* no mention of the two names in what the viewer reads */
  var WORDS = [
    /\s*[«"]?\s*(?:AppleTV\s*)?AgNative\s*[»"]?/gi,
    /\s*[«"]?\s*Закусь\s*TV\s*[»"]?/gi,
    /\s*[«"]?\s*Zakus\s*TV\s*[»"]?/gi
  ];
  function scrub(t) {
    if (typeof t !== 'string') return t;
    var o = t;
    WORDS.forEach(function (w) { o = o.replace(w, ''); });
    o = o.replace(/Усі пункти(?=\s*(?:[,.]|$))/, 'Усі пункти налаштувань').replace(/Все пункты(?=\s*(?:[,.]|$))/, 'Все пункты настроек');
    return o.replace(/\s{2,}/g, ' ').replace(/^\s*[:\-–—·]\s*/, '').replace(/\(\s*\)/g, '').trim();
  }
  function clean(d) {
    var f = d && d.field;
    if (!f) return d;
    var name = scrub(f.name), descr = f.description;
    if (!name && d.param && d.param.type !== 'title') name = 'Apple TV';
    if (typeof descr === 'string') descr = scrub(descr);
    if (name === f.name && descr === f.description) return d;
    var c = {}, k;
    for (k in d) c[k] = d[k];
    c.field = {};
    for (k in f) c.field[k] = f[k];
    c.field.name = name;
    if (descr !== undefined) c.field.description = descr;
    return c;
  }

  function patch() {
    var api = window.Lampa && Lampa.SettingsApi;
    if (!api || api.__snack_merge) return !!(api && api.__snack_merge);
    api.__snack_merge = true;

    var getParam = api.getParam;
    var allComponents = api.allComponents;

    /* ids of the folders being merged, found by name (and Agnative's sub-pages by id) */
    function movedIds() {
      var ids = {}, c = allComponents.call(api) || {}, k, own = [];
      for (k in c) {
        if (NAMES.indexOf(lc(c[k] && c[k].name)) >= 0) { ids[k] = 1; own.push(k); }
      }
      for (k in c) {
        for (var i = 0; i < AGN_SUBS.length; i++) if (k === AGN_SUBS[i] || k.indexOf('agnative') === 0) ids[k] = 1;
      }
      return ids;
    }

    /* the options of Interface = its own + every merged folder's options (in the order they are registered) */
    api.getParam = function (name) {
      var list = getParam.apply(api, arguments);
      if (name !== TARGET) return list;
      var moved = movedIds(), out = (list || []).slice(), c = allComponents.call(api) || {}, k;
      /* the main folders first (Закусь TV, Agnative), then Agnative's sub-pages */
      var order = [];
      for (k in moved) order.push(k);
      order.sort(function (a, b) {
        var wa = AGN_SUBS.indexOf(a) >= 0 || a.indexOf('agnative_') === 0 ? 1 : 0;
        var wb = AGN_SUBS.indexOf(b) >= 0 || b.indexOf('agnative_') === 0 ? 1 : 0;
        return wa - wb;
      });
      order.forEach(function (id) {
        var p = getParam.call(api, id);
        if (!p || !p.length) return;
        var folder = c[id] && c[id].name;
        p.forEach(function (d) {
          var n = d && d.param && d.param.name;
          if (n === 'agnative_open_topnav_settings' || n === 'agnative_open_hero_settings' || n === 'agnative_open_settings_hide') return;
          /* the name cards and the support line (Telegram) are not shown */
          if (n === 'agnative_about_info' || n === 'stv_version' || n === 'stv_support') return;
          out.push(clean(d));
        });
      });
      return out;
    };

    /* the merged folders are not listed in Settings any more */
    api.allComponents = function () {
      var c = allComponents.apply(api, arguments), out = {}, moved = movedIds(), k;
      for (k in c) if (!moved[k]) out[k] = c[k];
      return out;
    };

    /* anything that still opens one of the merged folders lands in the Interface */
    try {
      var open = Lampa.Settings.create;
      if (!Lampa.Settings.__snack_merge_create) {
        Lampa.Settings.__snack_merge_create = true;
        Lampa.Settings.create = function (comp, params) {
          if (comp && comp !== TARGET && movedIds()[comp]) comp = TARGET;
          return open.call(this, comp, params);
        };
      }
    } catch (e) {}

    try {
      if (Lampa.Noty && Lampa.Noty.show && !Lampa.Noty.__snack_merge) {
        var show = Lampa.Noty.show;
        Lampa.Noty.__snack_merge = true;
        Lampa.Noty.show = function (text) {
          var a = Array.prototype.slice.call(arguments);
          if (typeof text === 'string') { var r = text.replace(/\s*[«"]?\s*(?:AppleTV\s*)?AgNative\s*[»"]?\s*/gi, ' ').replace(/\s*[«"]?\s*(?:Закусь|Zakus)\s*TV\s*[»"]?\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim(); a[0] = r || text; }
          return show.apply(this, a);
        };
      }
    } catch (e) {}

    /* hide any left-over entry of these folders in Settings' own main list */
    var css = document.getElementById('snack-merge-css');
    if (!css) {
      css = document.createElement('style');
      css.id = 'snack-merge-css';
      css.textContent = '.settings-folder[data-component="agnative"],.settings-folder[data-component^="agnative_"]{display:none!important}';
      (document.head || document.documentElement).appendChild(css);
    }
    return true;
  }

  /* hide the folder rows in the main Settings list by name (their component id is not known up front) */
  function hideRows() {
    try {
      var rows = document.querySelectorAll('.settings-folder');
      for (var i = 0; i < rows.length; i++) {
        var n = rows[i].querySelector('.settings-folder__name');
        var key = lc(n ? n.textContent : '');
        if (NAMES.indexOf(key) >= 0) rows[i].style.display = 'none';
      }
    } catch (e) {}
  }

  function start() {
    var tries = 0;
    (function wait() {
      if (patch()) { hideRows(); } else if (tries++ < 200) { return setTimeout(wait, 100); }
    })();
    setInterval(hideRows, 500);
    if (window.MutationObserver && document.body) {
      new MutationObserver(function () { hideRows(); }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
