/* Snack TV header controls: clock + profile button on the right of the header.
   The left menu (burger) is Lampa's own .head__menu-icon, kept visible by Snack TV itself.
   Standalone. */
(function () {
  'use strict';
  if (window.__snack_header_ready) return;
  window.__snack_header_ready = true;

  var CSS_ID = 'snack-header-css';
  var DOCK_ID = 'snack-header-dock';
  var CLOCK_ID = 'snack-header-clock';
  var PROFILE_ID = 'snack-header-profile';
  var ICON = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4.1" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-3.9 3.8-6 8-6s8 2.1 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function css() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = [
      '#' + DOCK_ID + '{position:absolute;right:12px;top:calc(env(safe-area-inset-top,0px) + 2em - 18px);z-index:20;display:flex;align-items:center;gap:0;height:36px;box-sizing:border-box;padding:0 4px 0 0;border-radius:999px;background:rgba(32,34,40,.72);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 6px 16px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%)}',
      '#' + DOCK_ID + ' .snack-hbtn{display:inline-flex;align-items:center;justify-content:center;height:34px;box-sizing:border-box;border-radius:999px;color:#fff;background:transparent;border:0;box-shadow:none;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      '#' + CLOCK_ID + '{min-width:0;padding:0 8px 0 13px;font-size:14px;font-weight:700;letter-spacing:.01em;font-variant-numeric:tabular-nums}',
      '#' + PROFILE_ID + '{width:30px;padding:0;overflow:hidden}',
      '#' + PROFILE_ID + ' svg{width:18px;height:18px}',
      '#' + PROFILE_ID + ' img{width:24px;height:24px;border-radius:999px;object-fit:cover;display:block}',
      '#' + DOCK_ID + ' .snack-hbtn.focus,#' + DOCK_ID + ' .snack-hbtn.hover{background:rgba(255,255,255,.22)}',
      /* the left menu button: same glass capsule */
      'body.stv.true--mobile .head__menu-icon,body.stv.mouse--controll .head__menu-icon,body.stv .head__menu-icon{display:flex!important;align-items:center;justify-content:center;position:absolute!important;left:12px!important;top:calc(env(safe-area-inset-top,0px) + 2em - 18px)!important;right:auto!important;bottom:auto!important;transform:none!important;width:36px!important;height:36px!important;min-width:0!important;margin:0!important;padding:0!important;box-sizing:border-box;border-radius:999px;background:rgba(32,34,40,.72);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 6px 16px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);z-index:20;overflow:hidden}',
      'body.stv.true--mobile .head__menu-icon svg,body.stv .head__menu-icon svg,body.stv .head__menu-icon img{display:block!important;position:static!important;width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;margin:0!important;padding:0!important;transform:none!important;color:#fff;fill:#fff;flex:0 0 auto}',
      /* the header\'s own right-hand items stay out of the way */
      'body.stv .head__actions,body.stv .head__action{display:none!important}',
      /* full card order: logo, then the text title under it, then the reactions in ONE row, then the rest */
      'body.stv .full-start-new__title.stv-has-logo{font-size:clamp(16px,4.6vw,22px)!important;line-height:1.2!important;color:#fff!important;font-weight:800!important;text-align:center;display:flex!important;flex-direction:column-reverse;align-items:center;gap:8px}',
      'body.stv .full-start-new__title.stv-has-logo .stv-logo{margin:0 auto!important;object-position:center bottom!important}',
      /* the reactions come right after the title block (under logo + text), never above it */
      'body.stv .full-start-new__right{display:flex!important;flex-direction:column}',
      'body.stv .full-start-new__title{order:1!important}',
      'body.stv .full-start-new__reactions{order:2!important;display:flex!important;flex-wrap:nowrap!important;justify-content:center;align-items:center;gap:6px;margin:0 0 12px!important;min-height:0!important;width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
      'body.stv .full-start-new__reactions::-webkit-scrollbar{display:none}',
      'body.stv .full-start-new__reactions > div{flex:0 0 auto;padding:0!important;margin:0!important}',
      'body.stv .full-start-new__reactions .reaction{white-space:nowrap}',
      'body.stv .stv-meta{order:3!important}',
      'body.stv .full-start-new__buttons{order:4!important}',
      'body.stv .stv-desc{order:5!important}',
      /* the size setting (Agnative > Top bar > size) scales the burger and the clock/profile pill */
      'body.stv{--snack-hs:1}',
      'body.stv[data-agnative-topnav-size="xs"]{--snack-hs:.8}',
      'body.stv[data-agnative-topnav-size="sm"]{--snack-hs:.9}',
      'body.stv[data-agnative-topnav-size="md"]{--snack-hs:1}',
      'body.stv[data-agnative-topnav-size="lg"]{--snack-hs:1.15}',
      'body.stv[data-agnative-topnav-size="xl"]{--snack-hs:1.3}',
      '#' + DOCK_ID + '{transform:scale(var(--snack-hs,1));transform-origin:top right}',
      'body.stv .navigation-bar .navigation-bar__body{zoom:var(--snack-hs,1)}',
      'body.stv.true--mobile .head__menu-icon,body.stv .head__menu-icon{transform:scale(var(--snack-hs,1))!important;transform-origin:top left}',
      /* ONE ROW: burger | nav pill | clock + profile. The pill lives in the strip between the burger and the
         clock: centred there, it shrinks (smaller padding and text) to fit, so nothing overlaps. */
      'body.stv{--snack-hdr-l:calc(12px + 36px*var(--snack-hs,1) + 10px);--snack-hdr-r:calc(12px + var(--snack-dock-w,96px)*var(--snack-hs,1) + 10px)}',
      'body.stv .navigation-bar{left:var(--snack-hdr-l)!important;right:var(--snack-hdr-r)!important;width:auto!important;top:calc(env(safe-area-inset-top,0px) + 2em)!important;height:0!important;display:flex!important;justify-content:center;align-items:center;overflow:visible}',
      'body.stv .navigation-bar .navigation-bar__body{height:36px!important;min-height:36px!important;max-height:36px!important;padding:3px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;position:static!important;left:auto!important;top:auto!important;transform:none!important;max-width:100%;overflow:hidden;flex-shrink:1;min-width:0;margin:0}',
      'body.stv .navigation-bar .navigation-bar__item{height:28px!important;margin:0 1px!important;box-sizing:border-box!important}',
      'body.stv .navigation-bar .navigation-bar__item{min-width:0;flex:0 1 auto;white-space:nowrap}',
      'body.stv .navigation-bar .navigation-bar__label{overflow:hidden;text-overflow:ellipsis}',
      '@media (max-width:430px){body.stv{--snack-hdr-l:calc(10px + 36px*var(--snack-hs,1) + 8px);--snack-hdr-r:calc(10px + var(--snack-dock-w,92px)*var(--snack-hs,1) + 8px)}body.stv .navigation-bar .navigation-bar__body{padding:3px!important;height:36px!important;box-sizing:border-box!important;align-items:center}body.stv .navigation-bar .navigation-bar__item{padding:0 8px!important;margin:0 1px!important;height:28px!important}body.stv .navigation-bar .navigation-bar__item[data-action=back],body.stv .navigation-bar .navigation-bar__item[data-action=search]{padding:0 7px!important}body.stv .navigation-bar .navigation-bar__label{font-size:13.5px!important;overflow:visible!important;text-overflow:clip!important}body.stv .navigation-bar .navigation-bar__icon{width:16px!important;height:16px!important}}',
      '@media (max-width:380px){body.stv .navigation-bar .navigation-bar__item{padding:0 6px!important}body.stv .navigation-bar .navigation-bar__item[data-action=back],body.stv .navigation-bar .navigation-bar__item[data-action=search]{padding:0 4px!important}body.stv .navigation-bar .navigation-bar__label{font-size:13px!important}}',
      /* nothing from AgNative's own top bar may show next to Snack TV */
      'body.stv .agnative-topnav-shell,body.stv .agnative-topnav-rightdock,body.stv #agnative-topnav-clock,body.stv .agnative-control-panel,body.stv .agnative-hero{display:none!important}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function profileHtml() {
    try {
      var acc = window.Lampa && Lampa.Account && Lampa.Account.Permit && Lampa.Account.Permit.account;
      var icon = acc && acc.profile && acc.profile.icon;
      var proto = Lampa.Utils && Lampa.Utils.protocol && Lampa.Utils.protocol();
      var dom = Lampa.Manifest && Lampa.Manifest.cub_domain;
      if (icon && proto && dom) return '<img src="' + proto + dom + '/img/profiles/' + icon + '.png" alt="">';
    } catch (e) {}
    return ICON;
  }

  function openProfiles() {
    try {
      if (window.Lampa && Lampa.Account && Lampa.Account.Profile && typeof Lampa.Account.Profile.select === 'function') {
        Lampa.Account.Profile.select(function () {
          try { Lampa.Controller.toggle('head'); } catch (e) {}
        });
        return;
      }
      var nat = qs('.open--profile,.open--syncpro-profile');
      if (nat) { nat.click(); return; }
      if (window.Lampa && Lampa.Settings && Lampa.Settings.open) Lampa.Settings.open('account');
    } catch (e) {}
  }

  function openSettings() {
    try { if (window.Lampa && Lampa.Settings && Lampa.Settings.open) Lampa.Settings.open(); } catch (e) {}
  }

  function bind(el, fn) {
    var busy = false;
    function run(ev) {
      if (busy) return;
      busy = true; setTimeout(function () { busy = false; }, 250);
      if (ev && ev.preventDefault) ev.preventDefault();
      fn();
    }
    el.addEventListener('click', run);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(e); });
    if (window.$) { try { $(el).on('hover:enter', run); } catch (e) {} }
  }

  function time() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function ensure() {
    var head = qs('.head');
    if (!head || !document.body || !document.body.classList.contains('stv')) {
      var old = document.getElementById(DOCK_ID);
      if (old && (!document.body || !document.body.classList.contains('stv'))) old.remove();
      return;
    }
    css();
    var dock = document.getElementById(DOCK_ID);
    if (!dock) {
      dock = document.createElement('div');
      dock.id = DOCK_ID;
      var clock = document.createElement('div');
      clock.id = CLOCK_ID;
      clock.className = 'snack-hbtn selector';
      clock.setAttribute('tabindex', '0');
      bind(clock, openSettings);
      var prof = document.createElement('div');
      prof.id = PROFILE_ID;
      prof.className = 'snack-hbtn selector';
      prof.setAttribute('tabindex', '0');
      prof.setAttribute('data-role', 'profile');
      bind(prof, openProfiles);
      dock.appendChild(clock);
      dock.appendChild(prof);
    }
    if (dock.parentNode !== head) head.appendChild(dock);
    try {
      var dw = Math.ceil(dock.offsetWidth || 0);
      if (dw && document.body.getAttribute('data-snack-dw') !== String(dw)) {
        document.body.setAttribute('data-snack-dw', String(dw));
        document.body.style.setProperty('--snack-dock-w', dw + 'px');
      }
    } catch (e) {}
    var c = document.getElementById(CLOCK_ID);
    var t = time();
    if (c && c.textContent !== t) c.textContent = t;
    var pr = document.getElementById(PROFILE_ID);
    var html = profileHtml();
    if (pr && pr.getAttribute('data-h') !== html) { pr.innerHTML = html; pr.setAttribute('data-h', html); }
  }

  /* full card: logo, then the text title under it, then ALL reactions in ONE row, then the rest.
     Done in the DOM with inline styles, so no theme rule can reorder it again. */
  function fixCard() {
    if (!document.body || !document.body.classList.contains('stv')) return;
    var cards = document.querySelectorAll('.full-start-new__right');
    for (var i = 0; i < cards.length; i++) {
      var right = cards[i];
      var title = right.querySelector('.full-start-new__title');
      var react = right.querySelector('.full-start-new__reactions');
      if (!title) continue;
      /* logo above, the text title under it */
      var logo = title.querySelector('.stv-logo');
      if (logo && title.classList.contains('stv-has-logo')) {
        var txt = null;
        for (var n = title.firstChild; n; n = n.nextSibling) { if (n.nodeType === 3 && n.nodeValue.trim()) { txt = n; break; } }
        if (txt && !title.querySelector('.snack-title-text')) {
          var sp = document.createElement('div');
          sp.className = 'snack-title-text';
          sp.textContent = txt.nodeValue.trim();
          title.removeChild(txt);
          title.appendChild(sp);
        }
        var st = title.querySelector('.snack-title-text');
        if (st) { st.style.cssText = 'order:2;font-size:clamp(16px,4.6vw,22px);line-height:1.2;color:#fff;font-weight:800;text-align:center;margin-top:8px'; logo.style.order = '1'; }
        title.style.cssText += ';display:flex;flex-direction:column;align-items:center;font-size:0';
      }
      if (!react) continue;
      /* the reactions go right after the title block, in one row */
      if (title.nextElementSibling !== react) right.insertBefore(react, title.nextSibling);
      react.style.cssText = 'display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:6px;margin:6px 0 12px;min-height:0;width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none';
      var kids = react.children;
      for (var k = 0; k < kids.length; k++) kids[k].style.cssText = 'flex:0 0 auto;padding:0;margin:0';
    }
  }

  function start() {
    ensure();
    fixCard();
    setInterval(function () { ensure(); fixCard(); }, 1000);
    setInterval(ensure, 5000);
    if (window.MutationObserver) {
      var t;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { ensure(); fixCard(); }, 150); })
        .observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] });
    }
    if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') ensure(); });
  }

  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
