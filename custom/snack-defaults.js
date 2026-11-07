/* Starting settings for a NEW user.
   Every value below is written only when the user has never set that option (nothing in the storage),
   so nobody who already chose something loses their choice. Runs before the other plugins read their options. */
(function () {
  'use strict';
  if (window.__snack_defaults) return;
  window.__snack_defaults = true;

  var D = {
    /* Lampa's own «Інтерфейс» */
    interface_size: 'normal',
    light_version: false,
    background: true,
    background_type: 'simple',
    black_style: true,
    card_interfice_poster: true,
    card_interfice_cover: true,
    card_interfice_reactions: true,
    glass_style: true,
    glass_opacity: 'easy',
    animation: true,
    advanced_animation: false,
    mask: true,
    scroll_type: 'css',

    /* the Apple TV look */
    stv_on: true,
    stv_mode: 'auto',
    stv_hide_head: true,
    stv_titles: false,
    stv_tint: true,
    stv_logo_lang: 'ui',
    stv_episodes: true,
    stv_show_shots: false,
    stv_local_cards: true,
    stv_show_react: true,
    stv_show_tech: false,
    stv_show_play: false,
    stv_lite: 'auto',
    stv_img: 'auto',

    /* the top bar, cards, logos, text, clock, data */
    appletv_agnative_topnav_enabled: 'on',
    appletv_agnative_ui_lang: 'auto',
    appletv_agnative_perf_mode: 'auto',
    appletv_agnative_topnav_visible: 'on',
    appletv_agnative_topnav_size: 'xs',
    appletv_agnative_topnav_icons_order: 'end',
    appletv_agnative_backdrop: 'off',
    appletv_agnative_card_image_mode: 'backdrop',
    appletv_agnative_card_size: 'xs',
    appletv_agnative_overlay_align: 'start',
    appletv_agnative_badge: 'on',
    appletv_agnative_rating: 'off',
    appletv_agnative_card_anim: 'veoveo',
    appletv_agnative_card_anim_orbit: 'false',
    appletv_agnative_logo_lang: 'auto',
    appletv_agnative_logo_title_fallback: 'false',
    appletv_agnative_logo_size: 'md',
    appletv_agnative_poster_quality: 'w500',
    appletv_agnative_font_size: 'md',
    appletv_agnative_category_size: 'md',
    appletv_agnative_clock_seconds: 'off',
    appletv_agnative_control_panel: 'off',
    appletv_agnative_cache_size: '100'
  };

  function apply() {
    if (!window.Lampa || !Lampa.Storage || !Lampa.Storage.get || !Lampa.Storage.set) return false;
    var S = Lampa.Storage, k, cur;
    for (k in D) {
      try {
        /* «nothing there yet» = the user has never chosen: ask the raw storage, not the default-filling getter */
        cur = window.localStorage ? window.localStorage.getItem(k) : null;
        if (cur !== null && cur !== undefined) continue;
        S.set(k, D[k]);
      } catch (e) {}
    }
    return true;
  }

  /* once per device: after that the user's own changes are never touched */
  var FLAG = 'snack_defaults_done_v1';
  function run() {
    try { if (window.localStorage && window.localStorage.getItem(FLAG)) return; } catch (e) {}
    if (!apply()) return false;
    try { window.localStorage.setItem(FLAG, '1'); } catch (e) {}
    return true;
  }

  (function wait(n) {
    if (run() !== false) return;
    if (n < 200) setTimeout(function () { wait(n + 1); }, 50);
  })(0);
})();
