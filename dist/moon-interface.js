/*!
 * Moon / Snack TV interface for Lampa (single-file plugin).
 * Підключення: Налаштування -> Розширення -> Додати плагін -> URL цього файлу.
 */
(function () {
  'use strict';
  if (window.__moon_plugin_boot) return;
  window.__moon_plugin_boot = true;
  function run() {

  var st = document.createElement('style'); st.id = 'moon-source-contrast';
  st.textContent = [
    '.torrent-item,.torrent-file,.torrent-serial{background:rgba(78,78,84,.9);color:#fff;border:1px solid rgba(255,255,255,.24)}',
    'body.glass--style .torrent-serial,body.glass--style .torrent-file,body.glass--style .torrent-item{background:rgba(78,78,84,.94)!important;color:#fff!important;border:1px solid rgba(255,255,255,.28)}',
    'body.glass--style .torrent-serial.focus,body.glass--style .torrent-file.focus,body.glass--style .torrent-item.focus,.torrent-item.focus,.torrent-file.focus,.torrent-serial.focus{background:rgba(255,255,255,.35)!important}',
    'body.stv.selectbox--open .selectbox-item{margin:.45em 0;border:1px solid rgba(255,255,255,.24);border-radius:.7em;background:rgba(78,78,84,.9);color:#fff}',
    'body.stv.selectbox--open .selectbox-item.focus{background:#353535}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

/* ===== lampa-mobile-apple ===== */
/* Lampa Mobile Apple — based on lampa-combined-fix.js commit 7b78923d */
/* Lampa MX Mobile Fix — touch navigation only; never modifies video playback */
(function () {
    'use strict';
    var version = '2026-10-13-touch-only-v2';
    if (window.LampaMxMobileFixVersion === version) return;
    window.LampaMxMobileFixVersion = version;
    window.LampaMxMobileFix = true;

    var STYLE_ID = 'lampa-mx-mobile-fix-style-v2';
    var touchStart = null;

    function isMobile() {
        return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
            ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }
    function installViewportFix() {
        var viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && viewport.content.indexOf('viewport-fit=cover') === -1) viewport.content += ', viewport-fit=cover';
        var theme = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
        theme.name = 'theme-color';
        theme.content = '#000000';
        if (!theme.parentNode) document.head.appendChild(theme);
    }
    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;
        // Behaviour only, no design: Snack TV owns the look of every page.
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            'html.lampa-mx-mobile-fix,body.lampa-mx-mobile-fix{overscroll-behavior:none;} ',
            'body.lampa-mx-mobile-fix .scroll,body.lampa-mx-mobile-fix [class*="short" i]{touch-action:pan-x pan-y!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;} '
        ].join('');
        document.head.appendChild(style);
        document.documentElement.classList.add('lampa-mx-mobile-fix');
        document.body.classList.add('lampa-mx-mobile-fix');
    }
    function installAbortSafePlay() {
        if (!window.HTMLMediaElement || !HTMLMediaElement.prototype || HTMLMediaElement.prototype.__lampaAbortSafePlay) return;
        var nativePlay = HTMLMediaElement.prototype.play;
        var nativePause = HTMLMediaElement.prototype.pause;
        if (typeof nativePlay !== 'function') return;
        var safePlay = function () {
            var video = this;
            video.__lampaPlayRequested = true;
            var result = nativePlay.apply(this, arguments);
            if (!result || typeof result.then !== 'function') return result;
            return result.catch(function (error) {
                if (error && (error.name === 'AbortError' || /operation was aborted/i.test(String(error.message || '')))) {
                    if (!video.__lampaPlayRetryPending) {
                        video.__lampaPlayRetryPending = true;
                        var retry = function () {
                            video.__lampaPlayRetryPending = false;
                            if (!video.__lampaPlayRequested || video.ended || video.isConnected === false) return;
                            nativePlay.call(video).catch(function (retryError) {
                                if (!(retryError && retryError.name === 'AbortError')) video.__lampaLastPlayError = retryError;
                            });
                        };
                        if (video.readyState >= 2) setTimeout(retry, 350);
                        else video.addEventListener('canplay', retry, { once: true });
                    }
                    return undefined;
                }
                return Promise.reject(error);
            });
        };
        safePlay.__lampaAbortSafePlay = true;
        HTMLMediaElement.prototype.pause = function () {
            this.__lampaPlayRequested = false;
            return nativePause.apply(this, arguments);
        };
        HTMLMediaElement.prototype.play = safePlay;
        HTMLMediaElement.prototype.__lampaAbortSafePlay = true;
    }
    function findVisibleMenuPanel() {
        var selectors = ['.menu__content', '.menu__list', '.menu__body', '.menu__container', '.menu'];
        var candidates = [];
        selectors.forEach(function (selector) {
            Array.prototype.forEach.call(document.querySelectorAll(selector), function (element) {
                var rect = element.getBoundingClientRect();
                var computed = window.getComputedStyle(element);
                if (computed.display === 'none' || computed.visibility === 'hidden' || Number(computed.opacity) < 0.05) return;
                if (rect.width < 80 || rect.height < 80 || rect.right <= 0 || rect.left >= window.innerWidth) return;
                if (rect.left > window.innerWidth * 0.45 || rect.width > window.innerWidth * 0.96) return;
                candidates.push({ element: element, rect: rect });
            });
        });
        return candidates[0] || null;
    }
    function closeMenuOutsideTap(x, y) {
        var panel = findVisibleMenuPanel();
        if (!panel) return;
        if (x >= panel.rect.left && x <= panel.rect.right && y >= panel.rect.top && y <= panel.rect.bottom) return;
        closeMenu();
    }
    function closeMenu() {
        var closed = false;
        try {
            if (window.Lampa && Lampa.Menu && typeof Lampa.Menu.close === 'function') {
                Lampa.Menu.close();
                closed = true;
            }
        } catch (error) {}
        var closeButton = document.querySelector('.menu__close,.menu-close,[data-action="menu-close"]');
        if (closeButton && typeof closeButton.click === 'function') closeButton.click();
        return closed;
    }
    function onDocumentClick(event) {
        if (!event) return;
        closeMenuOutsideTap(event.clientX, event.clientY);
    }
    function onPointerDown(event) {
        if (event.pointerType && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
        // Close immediately on the initial tap; some Lampa menu layers stop
        // pointerup/click from reaching the document afterwards.
        closeMenuOutsideTap(event.clientX, event.clientY);
    }
    function onPointerUp(event) {
        if (!touchStart || (touchStart.id !== undefined && event.pointerId !== touchStart.id)) return;
        var start = touchStart;
        touchStart = null;
        var dx = event.clientX - start.x;
        var dy = event.clientY - start.y;
        if (dx * dx + dy * dy > 18 * 18) return;
        closeMenuOutsideTap(event.clientX, event.clientY);
    }
    function onTouchStart(event) {
        if (!event.changedTouches || !event.changedTouches.length) return;
        var touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
        closeMenuOutsideTap(touch.clientX, touch.clientY);
    }
    function onTouchEnd(event) {
        if (!touchStart || !event.changedTouches || !event.changedTouches.length) return;
        var touch = event.changedTouches[0];
        var start = touchStart;
        touchStart = null;
        var dx = touch.clientX - start.x;
        var dy = touch.clientY - start.y;
        if (dx * dx + dy * dy > 18 * 18) return;
        closeMenuOutsideTap(touch.clientX, touch.clientY);
    }
    function start() {
        if (!isMobile()) return;
        installViewportFix();
        installStyles();
        installAbortSafePlay();
        if (window.PointerEvent) {
            document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
            document.addEventListener('pointerup', onPointerUp, { passive: true, capture: true });
            document.addEventListener('pointercancel', function () { touchStart = null; }, { passive: true, capture: true });
        } else {
            document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
            document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
            document.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true, capture: true });
        }
        // Catch taps that do not produce a reliable touch-up event in iOS WebView.
        // A tap inside the left panel is ignored; any tap outside closes it.
        document.addEventListener('click', onDocumentClick, true);
    }
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
/* Lampa Smooth Player Size — lightweight, jank-free video sizing */
(function () {
    'use strict';

    if (window.LampaPlayerSizePlugin) return;
    window.LampaPlayerSizePlugin = true;

    function waitForLampa(callback) {
        if (window.Lampa && Lampa.Select && Lampa.Player && Lampa.PlayerVideo) callback();
        else setTimeout(function () { waitForLampa(callback); }, 250);
    }

    waitForLampa(function () {
        var storageKey = 'player_size';
        var smoothingStorageKey = 'video_smoothing';
        var defaultSmoothing = 4;
        var originalSelectShow = Lampa.Select.show;
        var playerActive = false;
        var applyFrame = 0;
        var resizeFrame = 0;

        var customModes = [
            { value: 'fill', title: 'Заповнити', subtitle: 'Повна висота, чорні поля по 2.5 мм з боків', fit: 'fill' },
            { value: 'contain', title: 'Вмістити', subtitle: 'Показати весь кадр із чорними полями', fit: 'contain' },
            { value: 's150', title: 'Збільшити 150%', subtitle: 'М’яке збільшення без зайвого обрізання', sx: 1.5, sy: 1.5 },
            { value: 's170', title: 'Збільшити 170%', subtitle: 'Збільшення кадру на 170%', sx: 1.7, sy: 1.7 },
            { value: 's180', title: 'Збільшити 180%', subtitle: 'Збільшення кадру на 180%', sx: 1.8, sy: 1.8 },
            { value: 'v150', title: 'По вертикалі 150%', subtitle: 'Збільшити кадр лише по вертикалі', sx: 1.01, sy: 1.5 },
            { value: 'v170', title: 'По вертикалі 170%', subtitle: 'Збільшити кадр лише по вертикалі', sx: 1.01, sy: 1.7 },
            { value: 'cinema219', title: 'Кіно 21:9', subtitle: 'Повна висота, чорні поля по 8 мм з боків', cinemaFill: true }
        ];
        var modes = {};
        customModes.forEach(function (mode) { modes[mode.value] = mode; });

        var style = document.createElement('style');
        style.id = 'lampa-smooth-player-style';
        style.textContent = [
            '.lampa-smooth-video{backface-visibility:hidden;-webkit-backface-visibility:hidden;}',
            'body.lampa-player-cinema video{aspect-ratio:21/9!important;}',
            'body.lampa-player-fill .player-video__display video,body.lampa-player-fill .player-video video{position:absolute!important;top:0!important;bottom:0!important;left:2.5mm!important;right:auto!important;width:calc(100% - 5mm)!important;height:100%!important;object-fit:fill!important;background:#000;}',
            'body.lampa-player-cinema-fill .player-video__display video,body.lampa-player-cinema-fill .player-video video{position:absolute!important;top:0!important;bottom:0!important;left:8mm!important;right:auto!important;width:calc(100% - 16mm)!important;height:100%!important;object-fit:fill!important;background:#000;}',
            'body.lampa-player-cinema-fill{--player-gap:8mm;}',
            'body.lampa-player-cinema-fill .player-info,body.lampa-player-cinema-fill .player-panel{left:var(--player-gap)!important;right:var(--player-gap)!important;width:auto!important;}',
            'body.lampa-player-cinema-fill .player-video__info,body.lampa-player-cinema-fill .player-video__controls,body.lampa-player-cinema-fill .player-video__progress,body.lampa-player-cinema-fill .player-video__timeline,body.lampa-player-cinema-fill .player__info,body.lampa-player-cinema-fill .player__controls,body.lampa-player-cinema-fill .player__progress,body.lampa-player-cinema-fill .player__timeline{left:8mm!important;right:8mm!important;width:auto!important;max-width:none!important;}',
            'body.lampa-player-cinema-fill .player-video__top,body.lampa-player-cinema-fill .player-video__bottom,body.lampa-player-cinema-fill .player__top,body.lampa-player-cinema-fill .player__bottom{left:8mm!important;right:8mm!important;width:auto!important;}'
        ].join('');
        if (!document.getElementById(style.id)) document.head.appendChild(style);

        function getSavedSize() {
            var saved = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get(storageKey, 'cinema219') : 'cinema219';
            return saved === 'default' ? 'cinema219' : saved;
        }
        function saveSize(value) {
            if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set(storageKey, value);
        }
        function getSmoothing() {
            var value = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get(smoothingStorageKey, defaultSmoothing) : defaultSmoothing;
            value = parseInt(value, 10);
            return isFinite(value) ? Math.max(0, Math.min(4, value)) : defaultSmoothing;
        }
        function applySmoothing(video) {
            if (!video || !video.style) return;
            var value = getSmoothing();
            if (!value) {
                video.style.removeProperty('filter');
                return;
            }
            var strength = value / 100;
            video.style.setProperty('filter', 'contrast(' + (1 + strength).toFixed(3) + ') saturate(' + (1 + strength).toFixed(3) + ') brightness(' + (1 + strength * 0.25).toFixed(3) + ')', 'important');
        }
        function prepareVideo(video) {
            if (!video) return;
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            applySmoothing(video);
        }
        function getVideo() {
            try { return Lampa.PlayerVideo.video(); } catch (error) { return null; }
        }
        function playerRoot(video) {
            return video && (video.closest('.player-video') || video.closest('.player') || video.parentElement);
        }
        function clearHudFit(root) {
            if (!root) return;
            Array.prototype.forEach.call(root.querySelectorAll('[data-lampa-hud-fit="1"]'), function (element) {
                ['left', 'right', 'width', 'max-width'].forEach(function (name) { element.style.removeProperty(name); });
                element.removeAttribute('data-lampa-hud-fit');
            });
        }
        function fitHudToVideo() {
            var video = getVideo();
            if (!video || !document.body.classList.contains('lampa-player-cinema-fill')) return;
            var root = playerRoot(video);
            var videoRect = video.getBoundingClientRect();
            if (!root || videoRect.width < 100 || videoRect.height < 80) return;
            var viewportWidth = window.innerWidth;
            Array.prototype.forEach.call(root.querySelectorAll('*'), function (element) {
                if (element === video || element.contains(video) || video.contains(element)) return;
                var computed = window.getComputedStyle(element);
                if (computed.position !== 'absolute' && computed.position !== 'fixed') return;
                var rect = element.getBoundingClientRect();
                if (rect.width < viewportWidth * 0.72 || rect.height < 1 || rect.width <= videoRect.width + 8) return;
                var containing = computed.position === 'fixed' ? { left: 0, right: viewportWidth } :
                    (element.offsetParent ? element.offsetParent.getBoundingClientRect() : root.getBoundingClientRect());
                var left = Math.max(0, videoRect.left - containing.left);
                var right = Math.max(0, containing.right - videoRect.right);
                element.style.setProperty('left', Math.round(left) + 'px', 'important');
                element.style.setProperty('right', Math.round(right) + 'px', 'important');
                element.style.setProperty('width', 'auto', 'important');
                element.style.setProperty('max-width', 'none', 'important');
                element.setAttribute('data-lampa-hud-fit', '1');
            });
        }
        function scheduleHudFit() {
            return;
        }
        function clearMode(video) {
            if (!video || !video.style) return;
            clearHudFit(playerRoot(video));
            ['position','inset','top','right','bottom','left','width','height','object-fit','object-position','aspect-ratio','transform','transform-origin','background','filter'].forEach(function (name) {
                video.style.removeProperty(name);
            });
            video.classList.remove('lampa-smooth-video');
            document.body.classList.remove('lampa-player-cinema');
            document.body.classList.remove('lampa-player-fill');
            document.body.classList.remove('lampa-player-cinema-fill');
        }
        function applyMode(mode) {
            var video = getVideo();
            if (!video || !mode || !video.style) return;
            clearMode(video);
            prepareVideo(video);
            video.classList.add('lampa-smooth-video');
            if (mode.value === 'fill') {
                document.body.classList.add('lampa-player-fill');
                video.style.setProperty('position', 'absolute', 'important');
                video.style.setProperty('top', '0', 'important');
                video.style.setProperty('bottom', '0', 'important');
                video.style.setProperty('left', '2.5mm', 'important');
                video.style.setProperty('right', 'auto', 'important');
                video.style.setProperty('width', 'calc(100% - 5mm)', 'important');
                video.style.setProperty('height', '100%', 'important');
                video.style.setProperty('object-fit', 'fill', 'important');
                video.style.setProperty('background', '#000', 'important');
                saveSize(mode.value);
                scheduleHudFit();
                return;
            }
            if (mode.cinemaFill) {
                document.body.classList.add('lampa-player-cinema-fill');
                video.style.setProperty('position', 'absolute', 'important');
                video.style.setProperty('top', '0', 'important');
                video.style.setProperty('bottom', '0', 'important');
                video.style.setProperty('left', '8mm', 'important');
                video.style.setProperty('right', 'auto', 'important');
                video.style.setProperty('width', 'calc(100% - 16mm)', 'important');
                video.style.setProperty('height', '100%', 'important');
                video.style.setProperty('object-fit', 'fill', 'important');
                video.style.setProperty('background', '#000', 'important');
                saveSize(mode.value);
                scheduleHudFit();
                return;
            }
            video.style.setProperty('width', '100%', 'important');
            video.style.setProperty('height', '100%', 'important');
            video.style.setProperty('object-fit', mode.fit || 'contain', 'important');
            video.style.setProperty('object-position', 'center center', 'important');
            if (mode.aspect) {
                document.body.classList.add('lampa-player-cinema');
                video.style.setProperty('aspect-ratio', mode.aspect, 'important');
            }
            if (mode.sx) {
                video.style.setProperty('transform-origin', 'center center', 'important');
                video.style.setProperty('transform', 'scale(' + mode.sx + ', ' + mode.sy + ')', 'important');
            }
            saveSize(mode.value);
        }
        function scheduleApply() {
            cancelAnimationFrame(applyFrame);
            applyFrame = requestAnimationFrame(function () {
                if (playerActive) applyMode(modes[getSavedSize()] || modes.contain);
            });
        }
        function applySavedMode() { scheduleApply(); }

        function isVideoSizeMenu(options) {
            if (!options || !Array.isArray(options.items)) return false;
            var values = options.items.map(function (item) { return item && String(item.value); });
            return values.indexOf('default') !== -1 && (values.indexOf('cover') !== -1 || values.indexOf('fill') !== -1);
        }
        Lampa.Select.show = function (options) {
            if (!isVideoSizeMenu(options)) return originalSelectShow.apply(this, arguments);
            var patched = Object.assign({}, options);
            var existing = options.items.map(function (item) { return item && item.value; });
            var saved = getSavedSize();
            var extras = customModes.filter(function (mode) {
                return existing.indexOf(mode.value) === -1;
            }).map(function (mode) {
                return { title: mode.title, subtitle: mode.subtitle, value: mode.value, selected: saved === mode.value };
            });
            patched.items = options.items.concat(extras);
            patched.onSelect = function (item) {
                if (item && modes[item.value]) {
                    applyMode(modes[item.value]);
                    if (Lampa.Select.close) Lampa.Select.close();
                } else if (typeof options.onSelect === 'function') {
                    clearMode(getVideo());
                    options.onSelect(item);
                }
            };
            return originalSelectShow.call(this, patched);
        };

        function onStart() {
            playerActive = true;
            applySavedMode();
            var video = getVideo();
            prepareVideo(video);
            function onReady() {
                applySavedMode();
                prepareVideo(getVideo());
                setTimeout(scheduleHudFit, 120);
            }
            function onDestroy() {
                playerActive = false;
                cancelAnimationFrame(applyFrame);
                clearMode(video || getVideo());
                Lampa.PlayerVideo.listener.remove('loadeddata', onReady);
                Lampa.PlayerVideo.listener.remove('canplay', onReady);
                Lampa.Player.listener.remove('destroy', onDestroy);
            }
            Lampa.PlayerVideo.listener.follow('loadeddata', onReady);
            Lampa.PlayerVideo.listener.follow('canplay', onReady);
            Lampa.Player.listener.follow('destroy', onDestroy);
        }
        Lampa.Player.listener.follow('start', onStart);
        function reflowAfterOrientation() {
            if (!playerActive) return;
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(function () {
                applySavedMode();
                setTimeout(applySavedMode, 180);
            });
        }
        window.addEventListener('resize', function () {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(function () {
                applySavedMode();
                setTimeout(applySavedMode, 220);
            });
        }, { passive: true });
        window.addEventListener('orientationchange', reflowAfterOrientation, { passive: true });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', reflowAfterOrientation, { passive: true });
    });
})();
/* Lampa AniSkip — manual opening skip button powered by AniSkip */
(function () {
    'use strict';
    var pluginVersion = '2026-10-15-all-in-one-10';
    if (window.LampaAniSkipPluginVersion === pluginVersion) return;
    window.LampaAniSkipPluginVersion = pluginVersion;
    window.LampaAniSkipPlugin = true;

    var styleId = 'lampa-aniskip-style-' + pluginVersion;
    var requestToken = 0;
    var currentVideo = null;
    var currentButton = null;
    var currentSegments = [];
    var currentSegment = null;
    var startEvent = null;
    var startObjects = [];
    var retryTimer = 0;
    var pollCount = 0;
    var malIdCache = new Map();
    var segmentCache = new Map();
    var boundTimeUpdate = null;
    var boundLoadedMetadata = null;
    var lastVisibilityLog = null;
    var SEGMENT_LABELS = { op: 'Пропустити опенінг', ed: 'Пропустити ендінг', recap: 'Пропустити рекап' };
    var SEGMENT_NOTICES = { op: 'Опенінг пропущено', ed: 'Ендінг пропущено', recap: 'Рекап пропущено' };
    function debugLog() {}

    function installStyles() {
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = '.lampa-aniskip-fallback{position:fixed!important;left:16px!important;right:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 82px)!important}' +
            '.player .lampa-aniskip-button{right:3em!important}' +
            '.player:not(.player--panel-visible) .lampa-aniskip-button{bottom:calc(5em + env(safe-area-inset-bottom,0px))!important}' +
            '.player.player--panel-visible .lampa-aniskip-button{bottom:calc(12em + env(safe-area-inset-bottom,0px))!important}';
        document.head.appendChild(style);
    }
    function currentPlaybackData() {
        try {
            if (window.Lampa && Lampa.Player && typeof Lampa.Player.playdata === 'function') return Lampa.Player.playdata() || null;
        } catch (error) {}
        return null;
    }
    function asObjects(event) {
        var activity = null;
        var playData = currentPlaybackData();
        try {
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function') activity = Lampa.Activity.active();
        } catch (error) {}
        var initial = [
            playData && playData.card,
            playData && playData.movie,
            activity && activity.movie,
            activity && activity.data && activity.data.movie,
            activity && activity.params && activity.params.movie,
            event && event.movie,
            event && event.card,
            event && event.data && event.data.card,
            event && event.data && event.data.movie,
            event && event.object && event.object.movie,
            playData,
            event && event.episode,
            activity && activity.episode,
            activity && activity.data,
            event && event.data,
            event && event.object,
            event,
            activity
        ].filter(function (value) { return value && (typeof value === 'object' || typeof value === 'string' || typeof value === 'number'); });
        initial.slice().forEach(function (value) {
            if (typeof value !== 'string' || value.length < 2 || !/^[\[{]/.test(value.trim())) return;
            try {
                var parsed = JSON.parse(value);
                if (parsed && typeof parsed === 'object') initial.unshift(parsed);
            } catch (error) {}
        });
        var values = [];
        var queue = initial.map(function (value) { return { value: value, depth: 0 }; });
        var seen = [];
        while (queue.length && values.length < 100) {
            var entry = queue.shift();
            var value = entry.value;
            if (!value || typeof value !== 'object' || seen.indexOf(value) !== -1) continue;
            seen.push(value);
            values.push(value);
            if (entry.depth >= 4) continue;
            Object.keys(value).forEach(function (key) {
                var child = value[key];
                if (child && typeof child === 'object') {
                    if (Array.isArray(child)) {
                        child.slice(0, 10).forEach(function (item) {
                            if (item && typeof item === 'object') queue.push({ value: item, depth: entry.depth + 1 });
                        });
                    } else queue.push({ value: child, depth: entry.depth + 1 });
                }
            });
        }
        return initial.filter(function (value) { return typeof value !== 'object'; }).concat(values);
    }
    function directMalId(objects) {
        var keys = ['mal_id', 'malId', 'malID', 'myanimelist_id', 'myAnimeListId', 'myanimelist', 'mal'];
        for (var i = 0; i < objects.length; i++) {
            var item = objects[i];
            if (!item || typeof item !== 'object') continue;
            var id = 0;
            keys.some(function (key) {
                var value = Number(item[key] || (item.ids && item.ids[key]) || (item.externalIds && item.externalIds[key]) || (item.external_ids && item.external_ids[key]));
                if (Number.isInteger(value) && value > 0) { id = value; return true; }
                return false;
            });
            if (id) return id;
        }
        return 0;
    }
    function malIdFromText(value) {
        var text = String(value || '');
        var match = text.match(/(?:myanimelist\.net\/anime\/|mal[_ -]?id[=:/_-]?)(\d{2,8})/i);
        return match ? Number(match[1]) || 0 : 0;
    }
    function titleCandidates(objects) {
        var keys = ['title_orig', 'original_title', 'original_name', 'title_english', 'title_en', 'title_ru', 'title_uk', 'originalName', 'title', 'name', 'romaji', 'english', 'native'];
        var result = [];
        function add(value) {
            if (typeof value !== 'string' || value.trim().length < 3 || isGenericTitle(value)) return;
            var clean = value.trim();
            if (result.indexOf(clean) === -1) result.push(clean);
        }
        objects.forEach(function (item) {
            if (!item || typeof item !== 'object') return;
            keys.forEach(function (key) { add(item[key]); });
            if (item.titles && Array.isArray(item.titles)) item.titles.forEach(function (entry) {
                add(entry && (entry.title || entry.name || entry.value));
            });
        });
        objects.forEach(function (item) { if (typeof item === 'string') add(item); });
        return result.slice(0, 8);
    }
    function titleFrom(objects) {
        var keys = ['title_orig', 'original_title', 'title_english', 'title_en', 'originalName', 'title', 'name'];
        for (var j = 0; j < keys.length; j++) {
            for (var i = 0; i < objects.length; i++) {
                var item = objects[i];
                if (!item || typeof item !== 'object') continue;
                var value = item[keys[j]];
                if (typeof value === 'string' && value.trim().length > 2 && !isGenericTitle(value)) return value.trim();
            }
        }
        for (var k = 0; k < objects.length; k++) {
            if (typeof objects[k] === 'string' && objects[k].trim().length > 2 && !isGenericTitle(objects[k])) return objects[k].trim();
        }
        return '';
    }
    function isGenericTitle(value) {
        return /(?:\bsource\b|\bисточник\b|\b\d{3,4}\s*x\s*\d{3,4}\b|\b\d{3,4}p\b|\.m3u8(?:$|[?#])|\.mp4(?:$|[?#]))/i.test(String(value || ''));
    }
    function mediaSourceText() {
        var data = currentPlaybackData();
        var source = data && (data.url || data.file || data.src) || '';
        var video = getVideo();
        source = source || (video && (video.currentSrc || video.src)) || '';
        for (var i = 0; i < 2; i++) {
            try {
                var decoded = decodeURIComponent(source);
                if (decoded === source) break;
                source = decoded;
            } catch (error) { break; }
        }
        return String(source || '');
    }
    function normalizeTitle(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9а-яёіїєґ]+/gi, ' ').trim();
    }
    function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        var previous = [];
        for (var j = 0; j <= b.length; j++) previous[j] = j;
        for (var i = 1; i <= a.length; i++) {
            var current = [i];
            for (var k = 1; k <= b.length; k++) {
                current[k] = Math.min(previous[k] + 1, current[k - 1] + 1, previous[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
            }
            previous = current;
        }
        return previous[b.length];
    }
    function titleSimilarity(a, b) {
        var na = normalizeTitle(a);
        var nb = normalizeTitle(b);
        if (!na || !nb) return 0;
        if (na === nb) return 1;
        var long = na.length >= nb.length ? na : nb;
        var short = na.length >= nb.length ? nb : na;
        if (short.length >= 6 && long.indexOf(short) !== -1) return 0.85;
        return 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
    }
    function knownAnimeMalId(value) {
        var text = String(value || '');
        if (/(?:\bfrieren\b|sousou[\s._\-/]*no[\s._\-/]*frieren|フリーレン|リーレン|芙莉莲|芙莉蓮|фрирен|фрирэн)/i.test(text)) {
            return /(?:season\s*2|2nd\s*season|сезон\s*2|2\s*сезон)/i.test(text) ? 59978 : 52991;
        }
        return 0;
    }
    function resolveMalId(objects) {
        var direct = directMalId(objects);
        if (direct) return Promise.resolve(direct);
        for (var sourceIndex = 0; sourceIndex < objects.length; sourceIndex++) {
            var sourceMalId = malIdFromText(objects[sourceIndex]);
            if (sourceMalId) return Promise.resolve(sourceMalId);
        }
        var title = titleFrom(objects);
        var knownId = knownAnimeMalId(title) || knownAnimeMalId(mediaSourceText());
        if (knownId) return Promise.resolve(knownId);
        var candidates = titleCandidates(objects);
        if (title && candidates.indexOf(title) === -1) candidates.unshift(title);
        candidates = candidates.slice(0, 4);
        if (!candidates.length) return Promise.resolve(0);
        var key = candidates.map(normalizeTitle).join('|');
        if (malIdCache.has(key)) return malIdCache.get(key);
        var promise = (async function () {
            function bestScore(query, names) {
                var best = 0;
                (names || []).forEach(function (name) {
                    if (!name) return;
                    best = Math.max(best, titleSimilarity(query, name));
                });
                return best;
            }
            var graph = 'query($search:String!){Media(search:$search,type:ANIME){idMal title{romaji english native} synonyms}}';
            for (var i = 0; i < candidates.length; i++) {
                var query = candidates[i];
                var controller = new AbortController();
                var timer = setTimeout(function () { controller.abort(); }, 2500);
                try {
                    var response = await fetch('https://graphql.anilist.co', {
                        method: 'POST', signal: controller.signal,
                        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: graph, variables: { search: query } })
                    });
                    if (response.ok) {
                        var payload = await response.json();
                        var media = payload && payload.data && payload.data.Media;
                        if (media && media.idMal) {
                            var names = media.title ? [media.title.romaji, media.title.english, media.title.native] : [];
                            names = names.concat(media.synonyms || []);
                            if (bestScore(query, names) >= 0.75) return Number(media.idMal);
                        }
                    }
                } catch (error) {} finally { clearTimeout(timer); }
            }
            for (var j = 0; j < candidates.length; j++) {
                var jikanController = new AbortController();
                var jikanTimer = setTimeout(function () { jikanController.abort(); }, 2500);
                try {
                    var jikanResponse = await fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(candidates[j]) + '&limit=20', { signal: jikanController.signal, headers: { Accept: 'application/json' } });
                    if (!jikanResponse.ok) continue;
                    var jikanPayload = await jikanResponse.json();
                    var jikanResults = Array.isArray(jikanPayload && jikanPayload.data) ? jikanPayload.data : [];
                    var bestId = 0;
                    var bestJikan = 0;
                    jikanResults.forEach(function (anime) {
                        var names = [anime.title, anime.title_english, anime.title_japanese];
                        if (Array.isArray(anime.titles)) anime.titles.forEach(function (entry) { if (entry && entry.title) names.push(entry.title); });
                        var current = bestScore(candidates[j], names);
                        if (current > bestJikan) { bestJikan = current; bestId = Number(anime.mal_id) || 0; }
                    });
                    if (bestId && bestJikan >= 0.75) return bestId;
                } catch (error) {} finally { clearTimeout(jikanTimer); }
            }
            return 0;
        })();
        malIdCache.set(key, promise);
        promise.catch(function () { malIdCache.delete(key); });
        return promise;
    }
    function episodeFromString(value) {
        var text = String(value || '');
        var patterns = [
            /__0*(\d{1,3})[_]/i,
            /(?:^|[\/_ .-])(?:episode|ep)[_ .-]?0*(\d{1,3})(?=[\/_ .-]|$)/i,
            /\bS\s*\d{1,2}\s*[:._ -]?\s*E\s*0*(\d{1,3})\b/i,
            /\b(?:episode|ep\.?|сер(?:ія|ии|ия)|еп(?:ізод|изод|\.)?)\s*#?\s*0*(\d{1,3})\b/i,
            /\b0*(\d{1,3})\s*(?:серія|серии|эпизод|episode)\b/i
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = text.match(patterns[i]);
            if (match) return Number(match[1]) || 0;
        }
        return 0;
    }
    function episodeFromObjects(objects) {
        var roots = [startEvent, currentPlaybackData()];
        var rootKeys = ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'current_episode', 'currentEpisode', 'episode_index', 'episodeIndex', 'playlist_index', 'playlistIndex', 'episode', 'ep'];
        for (var r = 0; r < roots.length; r++) {
            var root = roots[r];
            if (!root || typeof root !== 'object') continue;
            for (var rk = 0; rk < rootKeys.length; rk++) {
                var rootValue = root[rootKeys[rk]];
                if (typeof rootValue === 'number' && Number.isInteger(rootValue) && rootValue > 0) return rootValue;
                if (typeof rootValue === 'string') {
                    var rootNumber = Number(rootValue);
                    if (Number.isInteger(rootNumber) && rootNumber > 0) return rootNumber;
                    rootNumber = episodeFromString(rootValue);
                    if (rootNumber) return rootNumber;
                }
                if (rootValue && typeof rootValue === 'object') {
                    var nestedRoot = Number(rootValue.number || rootValue.episode_number || rootValue.episodeNumber || rootValue.num);
                    if (Number.isInteger(nestedRoot) && nestedRoot > 0) return nestedRoot;
                }
            }
        }
        var preferredKeys = ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'current_episode', 'currentEpisode', 'episode_index', 'episodeIndex', 'playlist_index', 'playlistIndex'];
        var fallbackKeys = ['episode', 'ep'];
        function readKeys(keys) {
            for (var j = 0; j < keys.length; j++) {
                for (var i = 0; i < objects.length; i++) {
                    var item = objects[i];
                    if (!item || typeof item !== 'object') continue;
                var value = item[keys[j]];
                if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
                if (typeof value === 'string') {
                    var parsed = Number(value);
                    if (Number.isInteger(parsed) && parsed > 0) return parsed;
                    parsed = episodeFromString(value);
                    if (parsed) return parsed;
                }
                if (value && typeof value === 'object') {
                    var nested = Number(value.number || value.episode_number || value.episodeNumber || value.num);
                    if (Number.isInteger(nested) && nested > 0) return nested;
                }
            }
            }
            return 0;
        }
        var explicitEpisode = readKeys(preferredKeys);
        if (explicitEpisode) return explicitEpisode;
        var sourceEpisode = episodeFromString(mediaSourceText());
        if (sourceEpisode) return sourceEpisode;
        var genericEpisode = readKeys(fallbackKeys);
        if (genericEpisode) return genericEpisode;
        for (var itemIndex = 0; itemIndex < objects.length; itemIndex++) {
            var item = objects[itemIndex];
            if (typeof item === 'number' && Number.isInteger(item) && item > 0) return item;
            if (typeof item === 'string') {
                var parsedText = episodeFromString(item);
                if (parsedText) return parsedText;
            }
            if (!item || typeof item !== 'object') continue;
            var labelKeys = ['episode_title', 'episodeName', 'episode_name', 'release_name', 'title_episode', 'name_episode', 'title', 'name'];
            for (var k = 0; k < labelKeys.length; k++) {
                var found = episodeFromString(item[labelKeys[k]]);
                if (found) return found;
            }
        }
        var label = document.querySelector('.player-video__title,.player__title,.player-video__info,.player__info,.player-video__subtitle,.player__subtitle');
        var fromLabel = label ? episodeFromString(label.textContent) : 0;
        if (fromLabel) return fromLabel;
        var video = getVideo();
        return video ? episodeFromString(video.currentSrc || video.src || '') : 0;
    }
    function getVideo() {
        var lampaVideo = document.querySelector('.player-video__video');
        if (lampaVideo && lampaVideo.tagName === 'VIDEO') return lampaVideo;
        var candidates = Array.prototype.slice.call(document.querySelectorAll('video'));
        candidates.sort(function (a, b) {
            var aScore = (a.paused ? 0 : 1000000) + a.getBoundingClientRect().width * a.getBoundingClientRect().height;
            var bScore = (b.paused ? 0 : 1000000) + b.getBoundingClientRect().width * b.getBoundingClientRect().height;
            return bScore - aScore;
        });
        return candidates[0] || null;
    }
    function createButton(video) {
        var root = document.querySelector('.player');
        if (!root && window.Lampa && Lampa.Player && typeof Lampa.Player.render === 'function') {
            try {
                var rendered = Lampa.Player.render();
                root = rendered && (rendered.nodeType === 1 ? rendered : rendered[0]) || null;
            } catch (error) {}
        }
        root = root || document.body;
        if (!root) return null;
        if (currentButton && currentButton.parentNode === root) return currentButton;
        if (currentButton && currentButton.parentNode) currentButton.parentNode.removeChild(currentButton);
        Array.prototype.slice.call(document.querySelectorAll('.lampa-aniskip-button')).forEach(function (oldButton) {
            if (oldButton !== currentButton && oldButton.parentNode) oldButton.parentNode.removeChild(oldButton);
        });
        var button = document.createElement('div');
        button.className = 'player-skip selector hide lampa-aniskip-button';
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', '0');
        button.setAttribute('aria-hidden', 'true');
        button.setAttribute('aria-label', 'Пропустити опенінг');
        button.innerHTML = '<span class="player-skip__text">Пропустити опенінг</span><svg aria-hidden="true"><use xlink:href="#sprite-player-next"></use></svg>';
        if (root === document.body) button.classList.add('lampa-aniskip-fallback');
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (!currentVideo || !currentSegment) return;
            var target = Number(currentSegment.end);
            if (!Number.isFinite(target)) return;
            try {
                var skipType = currentSegment.type;
                currentVideo.currentTime = target;
                currentSegment = null;
                syncButton();
                if (!currentVideo.paused && currentVideo.play) currentVideo.play().catch(function () {});
                if (window.Lampa && Lampa.Notice && typeof Lampa.Notice.show === 'function') {
                    var noticeText = SEGMENT_NOTICES[skipType] || 'Пропущено';
                    try { Lampa.Notice.show({ title: noticeText }); }
                    catch (noticeError) { try { Lampa.Notice.show(noticeText); } catch (noticeError2) {} }
                }
            } catch (error) {}
        });
        root.appendChild(button);
        if (window.$ && typeof window.$ === 'function') {
            try { window.$(button).on('hover:enter', function () { button.click(); }); } catch (error) {}
        }
        currentButton = button;
        return button;
    }
    function syncButton() {
        if (!currentButton || !currentVideo) return;
        var now = Number(currentVideo.currentTime);
        currentSegment = currentSegments.find(function (segment) { return now >= segment.start && now < segment.end; }) || null;
        var visible = !!currentSegment;
        if (currentSegment) {
            var label = SEGMENT_LABELS[currentSegment.type] || 'Пропустити';
            var textElement = currentButton.querySelector('.player-skip__text');
            if (textElement && textElement.textContent !== label) textElement.textContent = label;
            currentButton.setAttribute('aria-label', label);
        }
        currentButton.classList.toggle('hide', !visible);
        currentButton.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (lastVisibilityLog !== visible) {
            lastVisibilityLog = visible;
            if (visible) debugLog('[Lampa AniSkip] Skip button visible:', currentSegment.type, currentSegment.start, '-', currentSegment.end);
        }
    }
    function fetchSegments(malId, episode) {
        var cacheKey = malId + ':' + episode;
        if (segmentCache.has(cacheKey)) return segmentCache.get(cacheKey);
        var promise = (async function () {
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 6000);
            try {
                var url = 'https://api.aniskip.com/v2/skip-times/' + malId + '/' + episode + '?types=op&types=ed&types=recap&episodeLength=0';
                var response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
                if (!response.ok) {
                    debugLog('[Lampa AniSkip] API error:', response.status);
                    segmentCache.delete(cacheKey);
                    return [];
                }
                var payload = await response.json();
                if (!payload || payload.found !== true || !Array.isArray(payload.results)) {
                    debugLog('[Lampa AniSkip] No segments for this MAL ID / episode:', malId, episode);
                    return [];
                }
                var segments = payload.results.map(function (item) {
                    var interval = item.interval || item;
                    var rawType = String(item.skipType || item.skip_type || '').toLowerCase();
                    if (rawType === 'opening') rawType = 'op';
                    if (rawType === 'ending') rawType = 'ed';
                    return {
                        start: Number(interval.startTime !== undefined ? interval.startTime : interval.start_time),
                        end: Number(interval.endTime !== undefined ? interval.endTime : interval.end_time),
                        type: rawType
                    };
                }).filter(function (item) {
                    return ['op', 'ed', 'recap'].indexOf(item.type) !== -1 && Number.isFinite(item.start) && Number.isFinite(item.end) && item.start >= 0 && item.end > item.start;
                });
                debugLog('[Lampa AniSkip] Segments:', malId, episode, segments.length);
                return segments;
            } catch (error) {
                debugLog('[Lampa AniSkip] Request failed:', error && error.name ? error.name : error);
                segmentCache.delete(cacheKey);
                return [];
            } finally {
                clearTimeout(timer);
            }
        })();
        segmentCache.set(cacheKey, promise);
        return promise;
    }
    function clearCurrent() {
        requestToken++;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = 0;
        pollCount = 0;
        if (currentVideo && boundTimeUpdate) currentVideo.removeEventListener('timeupdate', boundTimeUpdate);
        if (currentVideo && boundLoadedMetadata) currentVideo.removeEventListener('loadedmetadata', boundLoadedMetadata);
        currentVideo = null;
        boundTimeUpdate = null;
        boundLoadedMetadata = null;
        currentSegments = [];
        currentSegment = null;
        lastVisibilityLog = null;
        startObjects = [];
        if (currentButton && currentButton.parentNode) currentButton.parentNode.removeChild(currentButton);
        currentButton = null;
    }
    function loadForCurrent(token) {
        if (token !== requestToken) return;
        var video = getVideo();
        if (!startObjects.length || pollCount % 4 === 0) startObjects = asObjects(startEvent);
        var objects = startObjects;
        var episode = episodeFromObjects(objects);
        var title = titleFrom(objects);
        var malId = directMalId(objects);
        if (!video || !episode || (!title && !malId)) {
            pollCount++;
            if (pollCount === 1) debugLog('[Lampa AniSkip] Waiting for video metadata:', { video: !!video, episode: episode, title: !!title, malId: malId });
            if (pollCount === 80) debugLog('[Lampa AniSkip] Stopped: video, episode or anime title could not be detected');
            if (pollCount < 40) retryTimer = setTimeout(function () { loadForCurrent(token); }, 750);
            return;
        }
        debugLog('[Lampa AniSkip] Looking up:', { episode: episode, malId: malId || 'title lookup' });
        currentVideo = video;
        createButton(video);
        Promise.resolve(resolveMalId(objects)).then(function (malId) {
            if (token !== requestToken || currentVideo !== video) return;
            if (!malId) {
                debugLog('[Lampa AniSkip] No MAL ID resolved for title:', title);
                return;
            }
            debugLog('[Lampa AniSkip] Resolved MAL ID:', malId, 'episode:', episode);
            return fetchSegments(malId, episode).then(function (segments) {
                if (token !== requestToken || currentVideo !== video) return;
                currentSegments = segments;
                boundTimeUpdate = syncButton;
                boundLoadedMetadata = syncButton;
                video.addEventListener('timeupdate', boundTimeUpdate, { passive: true });
                video.addEventListener('loadedmetadata', boundLoadedMetadata, { passive: true });
                syncButton();
            });
        }).catch(function () {});
    }
    function onPlayerStart(event) {
        debugLog('[Lampa AniSkip] Player start');
        clearCurrent();
        startEvent = event || null;
        startObjects = asObjects(startEvent);
        var token = requestToken;
        installStyles();
        retryTimer = setTimeout(function () { loadForCurrent(token); }, 350);
    }
    function onPlayerDestroy() {
        clearCurrent();
        startEvent = null;
    }
    function start() {
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener || typeof Lampa.Player.listener.follow !== 'function') {
            setTimeout(start, 250);
            return;
        }
        installStyles();
        Lampa.Player.listener.follow('start', onPlayerStart);
        Lampa.Player.listener.follow('destroy', onPlayerDestroy);
        debugLog('[Lampa AniSkip] loaded');
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();


/* ===== snack-defaults ===== */
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


/* ===== snack-tv ===== */
(function () {
  'use strict';
  // «Закусь TV» — Lampa dressed as the Apple TV app. Two looks, picked by the device: the iPadOS app
  // (iPad, phones, touch browsers) and tvOS (TVs and remotes). Only CSS, Lampa's own templates and
  // events: nothing of Lampa is changed, and a place the theme does not recognise (a newer Lampa)
  // keeps Lampa's own look. All TMDB requests go through Lampa.TMDB (the user's proxy), no keys of
  // its own, no other services. Switched off in the settings, everything is back as it was.
  //
  // In this file, in order: strings and small helpers · options · device and design tokens · caches ·
  // TMDB, logos, backdrop colour · CSS (cssCtx, then one function per part: base, full card, episodes,
  // rows, hero, panels, search, posters, person, schedule, bars) · the theme on / off · full card · watch progress ·
  // episode row · pages (which one, body state, the remote) · Home rows (wide cards, Up Next, Shots) ·
  // hero banner · People and Schedule pages · settings · start. Lampa is changed only through its events, createInstance and the
  // TMDB / CUB sources' category() (the banner in front of genre pages).
  if (window.snack_tv_ready) return;
  window.snack_tv_ready = true;

  var VERSION = '0.8.11';
  /*cfg*/var PACK = (function () { try { var k = [122, 82, 126, 54, 144, 55, 56, 244, 64, 89, 1, 203, 173], c = atob('AXAdFKoXGocuOGKg8g4kXBqwFVTWenkjv4MXN1FG/0dRmB8pbq7BJTARQrIbGNYuezvrj7j7XuYH54gk+oiCGiyr3lwasBVe1np5Wulv0YLp5iDngiXDiIAaIVoGKPQrF+l0kOnQSn3Fg/7mLua5JcKIgRsdqu+vuUCC6XaR2NBEjarjroNBtuhLkOLRe3z4gsPmLhkYJNWIgBsWqupe5iLms9SQ7tF7jarvroNAhOhKYIm2Gx2q7a6NQIfpdpDh0XB9wnKctgQX6XWQ5tBLfcSD/+Yo5rok9XnQSo2r0K6IQIToSmx50XF8+ILAFkCF6EOR1tFwjarmroNAiul4kOrRc4NYfl4UUpzoY5Dp0XF8+YP/5xwXbKKC4iEbEqrsr75Aj+l0kdfQX3z4g/LnEea31JDo0X59zYLE5i7msCXCib8bH6rvroi+F+hbkOPQQn3Ecq6EQI8YJPeJset9x4Py5i7niyT+edF8fcqCweYr54glwom5Gxaq6l7UEKMYJcGJvhsVq9CuhkCO6XaQ7CEbGlqD/OYu54sk/nUhGiir0K6IsOeKJPeIjhsfWoLN5xDnhiXIiJflj1ZyXPQ7bVmfNSohn/u46V5f4xdehiU8L+vkHHIHWeUXSJUpPSGtwghyF0K8F1mHK3l1o8haPRBTsEBQm2AtbqTGWisRQ+IXVZsuPHjljycv'), d = '', i; for (i = 0; i < c.length; i++) d += String.fromCharCode(c.charCodeAt(i) ^ k[i % k.length]); return JSON.parse(decodeURIComponent(escape(d))); } catch (e) { return {}; } })();/*cfg-end*/

  var STR = {
    name:        ['Закусь TV', 'Закусь TV', 'Zakus TV'],
    all_films:   ['Все фильмы', 'Усі фільми', 'All titles'],
    on:          ['Оформление Apple TV', 'Оформлення Apple TV', 'Apple TV look'],
    mode:        ['Вид', 'Вигляд', 'Layout'],
    mode_d:      ['Авто: ТВ — как Apple TV, остальное — как iPad', 'Авто: ТБ — як Apple TV, решта — як iPad', 'Auto: TVs like Apple TV, the rest like iPad'],
    auto:        ['Авто', 'Авто', 'Auto'],
    ipad:        ['iPad', 'iPad', 'iPad'],
    tvos:        ['Apple TV', 'Apple TV', 'Apple TV'],
    lite:        ['Лёгкий режим', 'Легкий режим', 'Light mode'],
    lite_d:      ['Без размытия, теней и видео. Авто: на ТВ', 'Без розмиття, тіней і відео. Авто: на ТБ', 'No blur, shadows or video. Auto: on TVs'],
    on_:         ['Вкл', 'Увімк', 'On'],
    off_:        ['Выкл', 'Вимк', 'Off'],
    h_react:     ['Реакции', 'Реакції', 'Reactions'],
    h_shots:     ['Shots на главной', 'Shots на головній', 'Shots on Home'],
    loc:         ['Названия и постеры на языке интерфейса', 'Назви й постери мовою інтерфейсу', 'Titles and posters in the interface language'],
    loc_d:       ['Для карточек из CUB и сохранённых на другом языке (закладки, история, рекомендации): из TMDB, только на экране', 'Для карток із CUB і збережених іншою мовою (закладки, історія, рекомендації): з TMDB, лише на екрані', 'For cards from CUB or saved in another language (bookmarks, history, recommendations): from TMDB, on screen only'],
    h_tech:      ['Технические метки', 'Технічні мітки', 'Technical labels'],
    h_tech_d:    ['WEBDL, TS, 4K, «Выпущенный»… Метка UA и рейтинг видны всегда', 'WEBDL, TS, 4K, «Випущений»… Мітка UA й рейтинг видно завжди', 'WEBDL, TS, 4K, “Released”… The UA badge and rating always show'],
    h_play:      ['Стандартная кнопка «Смотреть»', 'Стандартна кнопка «Дивитися»', 'The standard “Watch” button'],
    h_play_d:    ['Нужен Автопилот: без него кнопка видна всегда', 'Потрібен Автопілот: без нього кнопку видно завжди', 'Needs Autopilot: without it the button always shows'],
    h_head:      ['Шапка как в Apple TV', 'Шапка як в Apple TV', 'Apple TV header'],
    h_head_d:    ['Без часов, даты и значков', 'Без годинника, дати й значків', 'No clock, date or icons'],
    episodes:    ['Ряд серий с кадрами', 'Ряд серій з кадрами', 'Episode row with stills'],
    titles:      ['Названия под постерами', 'Назви під постерами', 'Titles under posters'],
    titles_d:    ['Всегда, а не только у выбранного', 'Завжди, а не лише у вибраного', 'Always, not only under the selected one'],
    tint:        ['Цвет из фона', 'Колір з фону', 'Colour from the backdrop'],
    tint_d:      ['Подложка подстраивается под картинку', 'Тло підлаштовується під картинку', 'The page follows the picture'],
    logo_lang:   ['Язык логотипов', 'Мова логотипів', 'Logo language'],
    logo_ui:     ['Как интерфейс', 'Як інтерфейс', 'Interface language'],
    img_q:       ['Качество картинок', 'Якість зображень', 'Image quality'],
    img_q_d:     ['Авто: по чёткости экрана. Экономно: меньше трафика', 'Авто: за чіткістю екрана. Економно: менше трафіку', 'Auto: by the screen’s sharpness. Economy: less traffic'],
    q_eco:       ['Экономно', 'Економно', 'Economy'],
    q_max:       ['Максимум', 'Максимум', 'Maximum'],
    // screens
    watch:       ['Смотреть', 'Дивитися', 'Watch'],
    more:        ['ещё', 'більше', 'more'],
    b_more:      ['Ещё', 'Ще', 'More'],
    b_auto_set:  ['Автопилот: настройки', 'Автопілот: налаштування', 'Autopilot: settings'],
    less:        ['свернуть', 'згорнути', 'less'],
    season:      ['Сезон', 'Сезон', 'Season'],
    seasons_n:   ['Сезонов: %1', 'Сезонів: %1', '%1 seasons'],
    episode_cap: ['СЕРИЯ %1', 'СЕРІЯ %1', 'EPISODE %1'],
    serial:      ['Сериал', 'Серіал', 'TV Show'],
    movie:       ['Фильм', 'Фільм', 'Movie'],
    min:         ['%1 мин', '%1 хв', '%1 min'],
    hm:          ['%1 ч %2 мин', '%1 год %2 хв', '%1 hr %2 min'],
    soon:        ['Скоро', 'Незабаром', 'Coming soon'],
    // the schedule
    tt_title:    ['Расписание', 'Розклад', 'Schedule'],
    tt_sub:      ['Новые серии сериалов из вашего «Избранного»', 'Нові серії серіалів з вашого «Вибраного»', 'New episodes of the shows in your Favorites'],
    today:       ['Сегодня', 'Сьогодні', 'Today'],
    tomorrow:    ['Завтра', 'Завтра', 'Tomorrow'],
    in_days:     ['через %1 дн.', 'через %1 дн.', 'in %1 days'],
    tt_recent:   ['Вышли недавно', 'Вийшли нещодавно', 'Recently released'],
    se_ep:       ['СЕЗОН %1 · СЕРИЯ %2', 'СЕЗОН %1 · СЕРІЯ %2', 'SEASON %1 · EPISODE %2'],
    premiere:    ['Премьера %1 сезона', 'Прем’єра %1 сезону', 'Season %1 premiere'],
    tt_empty:    ['Здесь появятся новые серии', 'Тут з’являться нові серії', 'New episodes will show up here'],
    tt_empty_d:  ['Добавьте сериал в «%1» кнопкой на его странице (подойдут и %2). Даты выхода серий подтянутся из TMDB за несколько минут.', 'Додайте серіал у «%1» кнопкою на його сторінці (підійдуть і %2). Дати виходу серій підтягнуться з TMDB за кілька хвилин.', 'Add a show to «%1» with the button on its page (%2 work too). Air dates come from TMDB within a few minutes.'],
    tt_none:     ['Новых серий пока не объявлено', 'Нових серій поки не оголошено', 'No new episodes announced yet'],
    tt_none_d:   ['Сериалов в «Избранном»: %1. Как только TMDB объявит даты новых серий на ближайший месяц, они появятся здесь.', 'Серіалів у «Вибраному»: %1. Щойно TMDB оголосить дати нових серій на найближчий місяць, вони з’являться тут.', 'Shows in your Favorites: %1. Once TMDB announces next month’s episodes, they show up here.'],
    tt_open:     ['Открыть «%1»', 'Відкрити «%1»', 'Open «%1»'],
    support:     ['Поддержка (Telegram)', 'Підтримка (Telegram)', 'Support (Telegram)'],
    g_look:      ['Вид', 'Вигляд', 'Look'],
    g_home:      ['Главная и карточка', 'Головна й картка', 'Home and the card'],
    g_speed:     ['Производительность', 'Швидкодія', 'Performance'],
    g_about:     ['О плагине', 'Про плагін', 'About'],
    reset:       ['Сбросить настройки', 'Скинути налаштування', 'Reset settings'],
    reset_d:     ['Только пункты этой папки', 'Лише пункти цієї теки', 'Only this folder’s options'],
    tor_full:    ['Полное название раздачи', 'Повна назва роздачі', 'The release’s full title'],
    tor_season:  ['Сезон %1', 'Сезон %1', 'Season %1'],
  };
  function uiLang() { var l = 'ru'; try { l = String(Lampa.Storage.get('language', 'ru') || 'ru'); } catch (e) {} return l; }
  // the column of STR (and of the pack's own text lists) for the interface language: ru, uk, English
  function langIdx() { var l = uiLang(); return l === 'uk' ? 1 : l === 'ru' || l === 'be' ? 0 : 2; }
  function tr(k) {
    var a = STR[k] || [k], s = a[langIdx()];
    for (var i = 1; i < arguments.length; i++) s = s.split('%' + i).join(arguments[i]);
    return s;
  }
  // "S2E5" -> "S2, E5" (how Apple TV writes it)
  function se(t) { return String(t || '').replace(/\bS(\d+)\s?E(\d+)\b/g, 'S$1, E$2'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // TMDB text as the theme shows it: emoji (TMDB biographies use them as bullets: «💥Брайан…», «🏆Главн…»),
  // zero-width marks and lone surrogates are boxes («□») on TVs without an emoji font - dropped; odd
  // bullets become «•», line / paragraph separators line breaks (the fonts of the stack have both)
  var EMOJI = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF\u2B00-\u2BFF\uFE00-\uFE0F\u20E3\u200B-\u200D\u2060\uFEFF\u00AD]|[\uD800-\uDFFF]/g;
  function plainText(s) {
    return String(s == null ? '' : s).replace(EMOJI, '').replace(/[\u25AA-\u25AB\u25CF\u25E6\u2023\u2043\u2219]/g, '•')
      .replace(/[\u2028\u2029]/g, '\n').replace(/[ \t\u00A0]{2,}/g, ' ').replace(/ *\n */g, '\n').trim();
  }
  // in the document (Element.isConnected is Chrome 54+; webOS 3-4 and Tizen 3 do not have it)
  function inDoc(n) { try { return !!n && (n.isConnected !== undefined ? n.isConnected : document.documentElement.contains(n)); } catch (e) { return false; } }
  function log(m) { try { console.log('SnackTV', m); } catch (e) {} }
  function capFirst(s) { return Lampa.Utils.capitalizeFirstLetter ? Lampa.Utils.capitalizeFirstLetter(s) : s; }
  // the pack's other plugins: «UA» (a Ukrainian voice-over is known) and Autopilot (API v2 and up)
  function hasUa(m) { try { return !!(window.snack_ua && window.snack_ua.has && window.snack_ua.has(m)); } catch (e) { return false; } }
  function autoApi(fn) { var a = window.alc_auto_api; return a && a.version >= 2 && a[fn] ? a : null; }
  // Lampa's «last watched» of the online sources: {hash of the original title: {season, episode, …}}
  // a stored object: Lampa.Storage gives it parsed or as its JSON (unreadable or not an object: {})
  function objOf(v) {
    if (typeof v === 'string') { try { v = JSON.parse(v || '{}'); } catch (e) { v = {}; } }
    return v && typeof v === 'object' ? v : {};
  }
  function watchedLast() { return objOf(Lampa.Storage.get('online_watched_last', '{}')); }
  function titleHash(m) { return Lampa.Utils.hash(m.original_name || m.original_title || ''); }

  // ---------- options (keys, defaults, reading them) ----------
  // react, shots, tech, play: «show …» (off: hidden, the default); they were «hide …» up to 0.6.6 (SHOW_WAS)
  var K = { on: 'stv_on', mode: 'stv_mode', lite: 'stv_lite', react: 'stv_show_react', shots: 'stv_show_shots',
    tech: 'stv_show_tech', head: 'stv_hide_head', play: 'stv_show_play', episodes: 'stv_episodes', tint: 'stv_tint', logo_lang: 'stv_logo_lang', img: 'stv_img', titles: 'stv_titles', remote: 'stv_remote', loc: 'stv_local_cards' };
  var DEF = { stv_on: true, stv_mode: 'auto', stv_lite: 'auto', stv_show_react: false, stv_show_shots: false,
    stv_show_tech: false, stv_hide_head: true, stv_show_play: false, stv_episodes: true, stv_tint: true, stv_logo_lang: 'ui', stv_img: 'auto', stv_titles: false, stv_remote: '', stv_local_cards: true };
  var SHOW_WAS = { stv_show_react: 'stv_hide_react', stv_show_shots: 'stv_hide_shots', stv_show_tech: 'stv_hide_tech', stv_show_play: 'stv_hide_play' };
  function opt(k) { var v; try { v = Lampa.Storage.get(k, DEF[k]); } catch (e) { v = DEF[k]; } if (v === 'true') return true; if (v === 'false') return false; return v; }

  // ---------- device: the iPad look or the tvOS look; light mode for TVs ----------
  // TVs before the touch marks: TV boxes' WebViews claim touch, and Lampa marks the page touch / mobile unless the
  // browser's name says «Android TV». A TV: Lampa's own tv() (tvbox() included), an Android with no touch screen
  // (Lampa's tvbox rule, by the pointer rather than the name), or a remote seen here (see trackKeys)
  var androidNoTouch = (function () {
    try { return /android/i.test(navigator.userAgent) && !window.matchMedia('(any-pointer: coarse)').matches; } catch (e) { return false; }
  })();
  function autoMode() {
    var b = document.body.classList;
    if (String(opt(K.remote)) === '1' || androidNoTouch) return 'tv';
    try { if (Lampa.Platform.tv()) return 'tv'; } catch (e) {}
    if (b.contains('true--mobile') || b.contains('touch-device') || b.contains('platform--apple')) return 'ipad';
    try { if (Lampa.Platform.desktop()) return 'tv'; } catch (e) {}
    return navigator.maxTouchPoints > 0 && window.innerWidth < 1400 ? 'ipad' : 'tv';
  }
  function mode() { var m = opt(K.mode); return m === 'ipad' || m === 'tv' ? m : autoMode(); }
  function lite() { var l = opt(K.lite); return l === 'on' ? true : l === 'off' ? false : mode() === 'tv'; }

  // ---------- design tokens (docs/appletv-reference/SPEC.md), px at the reference screen ----------
  // iPad: 1180×820 (Lampa's body font 14.02px there); tvOS: 1920×1080 (22.81px). Lampa sizes all in
  // em of the body font, so the tokens are scaled by the actual body font: same look on any screen.
  var T = {
    ipad: { base: 14.02, margin: 48, gutter: 20, rowGap: 34, cardW: 248, cwW: 330, cardR: 12, epW: 300, epChin: 66, castD: 96,
      title: 22, titleW: 700, sub: 15, cap: 12, cap2: 11,
      btnH: 50, btnPad: 28, btnFont: 17, round: 50, logoW: 300, logoH: 110, descW: 480,
      panelR: 22, rowR: 12, focusScale: 1, dur: 220, dot: 7 },
    tv: { base: 22.81, margin: 80, gutter: 40, rowGap: 56, cardW: 380, cwW: 410, cardR: 18, epW: 400, epChin: 100, castD: 150,
      title: 38, titleW: 700, sub: 25, cap: 23, cap2: 21,
      btnH: 64, btnPad: 40, btnFont: 29, round: 64, logoW: 560, logoH: 200, descW: 760,
      panelR: 32, rowR: 20, focusScale: 1.09, dur: 220, dot: 9 }
  };
  var M = 'ipad', L = false, k = 1;
  function px(n) { return (Math.round(n * k * 10) / 10) + 'px'; }

  // ---------- small caches: memory + a capped Lampa.Storage object ----------
  function Cache(name, max) {
    var mem = {}, timer = 0;
    try { mem = objOf(Lampa.Storage.get(name, '{}')); } catch (e) {}
    return {
      get: function (key) { return mem[key]; },
      set: function (key, v) {
        mem[key] = v;
        if (timer) return;
        timer = setTimeout(function () {
          timer = 0;
          var keys = Object.keys(mem);
          if (keys.length > max) keys.slice(0, keys.length - max).forEach(function (x) { delete mem[x]; });
          try { Lampa.Storage.set(name, mem, true); } catch (e) {}
        }, 4000);
      }
    };
  }
  // memory only: the oldest entry goes when the cap is passed
  function MemCache(max) {
    var mem = {};
    return {
      get: function (key) { return mem[key]; },
      set: function (key, v) { var keys = Object.keys(mem); if (keys.length > max) delete mem[keys[0]]; mem[key] = v; }
    };
  }
  var logos;   // made on first use (Lampa.Storage is ready by then; a banner may come before start())
  function logoCache() { return logos || (logos = Cache('stv_logos', 400)); }
  var tints = MemCache(60), seasonCache = MemCache(30);

  // ---------- TMDB through Lampa (the user's proxy, Lampa's key) ----------
  // a request object per call: Lampa.Reguest keeps every call it made until clear()
  // lang: a fixed language (episode titles in English / the original), else Lampa's TMDB language
  // Lampa's TMDB language, else the interface's
  function tmdbLang() { var l = ''; try { l = Lampa.Storage.field('tmdb_lang') || ''; } catch (e) {} return String(l || uiLang()); }
  function tmdb(path, ok, fail, lang) {
    try {
      var url = Lampa.TMDB.api(path + (path.indexOf('?') < 0 ? '?' : '&') + 'api_key=' + Lampa.TMDB.key() + '&language=' + (lang || tmdbLang()));
      new Lampa.Reguest().silent(url, ok, function () { if (fail) fail(); });
    } catch (e) { if (fail) fail(); }
  }
  function img(path, size) { return path ? Lampa.TMDB.image('t/p/' + size + path) : ''; }
  // the TMDB size for a picture shown cssW wide: its real pixels (× the screen's density: iPad, phones,
  // 4K TVs) and the setting (economy ¾, maximum 1½); the smallest size that is at least ~90% of that.
  // Beyond the largest size (backdrops): «original» (1920+ px files) for maximum, and for a dense
  // screen that needs nearly twice the largest (a 4K TV, an iPad's full-width banner); else the largest.
  // Stills never take «original»: rows of 4K episode stills froze iPads (w780 at most)
  // (w500 is not in TMDB's list for backdrops and stills, but served for them: Lampa takes it for its
  // «collection» cards. Without it a TV's 410 px wide card took w780: 2.4× the pixels to decode and to keep)
  var TMDB_W = { poster: [154, 185, 342, 500, 780], backdrop: [300, 500, 780, 1280], still: [185, 300, 500, 780], logo: [92, 154, 185, 300, 500] };
  function tmdbSize(kind, cssW) {
    var q = opt(K.img), list = TMDB_W[kind] || TMDB_W.poster;
    var need = (cssW || 0) * (window.devicePixelRatio || 1) * (q === 'eco' ? 0.75 : q === 'max' ? 1.5 : 1) * 0.9;
    for (var i = 0; i < list.length; i++) if (list[i] >= need) return 'w' + list[i];
    var top = list[list.length - 1];
    return kind === 'backdrop' && (q === 'max' || need >= top * 1.8) ? 'original' : 'w' + top;
  }
  // a Lampa card's picture URL with the size changed (only TMDB's /t/p/wNNN/ paths)
  function resized(url, size) { return String(url || '').replace(/\/t\/p\/w\d+\//, '/t/p/' + size + '/'); }
  // the widths the theme draws things at (px of this screen)
  // posters: so many across the screen (Apple's «See All»: phones 3, iPad 6, TVs 7), between the side margins
  function cols() { return M === 'tv' ? 7 : 6; }
  function posterCalc(t, n) { return 'calc((100vw - ' + px(2 * t.margin - t.gutter) + ') / ' + n + ' - ' + px(t.gutter) + ')'; }
  function posterCssW() { var t = T[M], n = window.innerWidth < 600 ? 3 : cols(); return (window.innerWidth - (2 * t.margin - t.gutter) * k) / n - t.gutter * k; }
  function logoLangs() {
    var l = opt(K.logo_lang);
    if (!l || l === 'ui') l = uiLang();
    var out = [l];
    if (l !== 'en') out.push('en');
    return out;
  }
  // the logo for a title: interface language -> English -> no language; '' = none (text is shown)
  function pickLogo(list) {
    if (!list || !list.length) return '';
    var langs = logoLangs(), i, j;
    for (i = 0; i < langs.length; i++) for (j = 0; j < list.length; j++) if (list[j].iso_639_1 === langs[i]) return list[j].file_path;
    for (j = 0; j < list.length; j++) if (!list[j].iso_639_1) return list[j].file_path;
    // anime: TMDB often has the logo only in Japanese, Chinese or Korean — better that than bare text
    var best = null;
    for (j = 0; j < list.length; j++) if (list[j].file_path && (!best || (list[j].vote_average || 0) > (best.vote_average || 0))) best = list[j];
    return best ? best.file_path : '';
  }
  function kindOf(m) { return m.name || m.original_name || m.first_air_date || m.number_of_seasons || m.media_type === 'tv' ? 'tv' : 'movie'; }
  // a phone held upright: Apple uses the vertical key art there (a 16:9 frame leaves a thin slice)
  function portrait() { return window.innerHeight > window.innerWidth * 1.15; }
  // the vertical art without the title printed on it (the logo goes over it), when TMDB has one
  function cleanPoster(m) {
    var list = (m.images && m.images.posters) || [], best = null;
    list.forEach(function (p) { if (!p.iso_639_1 && (!best || (p.vote_average || 0) > (best.vote_average || 0))) best = p; });
    return best ? best.file_path : m.poster_path;
  }
  function kindLabel(m) { return tr(kindOf(m) === 'tv' ? 'serial' : 'movie'); }
  function yearOf(m) { return String(m.release_date || m.first_air_date || '').slice(0, 4); }
  function runtimeText(min) {
    min = parseInt(min, 10) || 0;
    if (!min) return '';
    return min >= 60 ? tr('hm', Math.floor(min / 60), min % 60) : tr('min', min);
  }
  function logoKey(m, langs) { return kindOf(m) + m.id + ':' + (langs || logoLangs())[0]; }
  var logoWait = {};
  // a card from another source (Kodik, AnimeGO, JutSu…) has no TMDB id of its own: find the title in TMDB once
  var idWait = {};
  function tmdbIdOf(m, cb) {
    if (m.source === 'tmdb' || m.source === 'cub') return cb(m.id, kindOf(m));
    var names = [m.original_title, m.original_name, m.title, m.name].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    var key = 'q:' + (names[0] || '') + ':' + yearOf(m);
    var have = logoCache().get(key);
    if (have !== undefined) return cb(have ? have.id : 0, have ? have.kind : '');
    if (idWait[key]) { idWait[key].push(cb); return; }
    idWait[key] = [cb];
    function done(r) {
      logoCache().set(key, r || '');
      var w = idWait[key]; delete idWait[key];
      w.forEach(function (f) { f(r ? r.id : 0, r ? r.kind : ''); });
    }
    var kinds = kindOf(m) === 'tv' ? ['tv', 'movie'] : ['movie', 'tv'], ni = 0, ki = 0, y = yearOf(m);
    (function next() {
      if (ni >= names.length) return done(null);
      var kind = kinds[ki];
      tmdb('search/' + kind + '?query=' + encodeURIComponent(names[ni]) + '&include_adult=false', function (j) {
        var list = (j && j.results) || [], hit = null, i;
        for (i = 0; i < list.length && !hit; i++) {
          var yr = String(list[i].first_air_date || list[i].release_date || '').slice(0, 4);
          if (!y || !yr || Math.abs(parseInt(yr, 10) - parseInt(y, 10)) <= 1) hit = list[i];
        }
        if (hit) return done({ id: hit.id, kind: kind });
        if (++ki >= kinds.length) { ki = 0; ni++; }
        next();
      }, function () { if (++ki >= kinds.length) { ki = 0; ni++; } next(); });
    })();
  }
  function getLogo(m, cb) {
    if (!m) return cb('');
    var own = m.id && (!m.source || m.source === 'tmdb' || m.source === 'cub');
    if (!own && !(m.title || m.name || m.original_title || m.original_name)) return cb('');
    var langs = logoLangs(), key = own ? logoKey(m, langs) : 'x:' + (m.original_title || m.original_name || m.title || m.name) + ':' + yearOf(m) + ':' + langs[0], have = logoCache().get(key);
    if (have !== undefined) return cb(have);
    if (own && m.images && m.images.logos) { var p = pickLogo(m.images.logos); logoCache().set(key, p); return cb(p); }
    if (logoWait[key]) { logoWait[key].push(cb); return; }
    logoWait[key] = [cb];
    function finish(p) { logoCache().set(key, p || ''); var w = logoWait[key]; delete logoWait[key]; w.forEach(function (f) { f(p || ''); }); }
    function load(id, kind) {
      if (!id) return finish('');
      // 'ja' is asked too: anime logos often exist only in Japanese
      tmdb(kind + '/' + id + '/images?include_image_language=' + langs.join(',') + ',ja,null', function (j) { finish(pickLogo(j && j.logos)); }, function () { finish(''); });
    }
    if (own) load(m.id, kindOf(m)); else tmdbIdOf(m, load);
  }
  // the text title's size class: long names (anime) get a smaller font, see the CSS of the card and the banner
  function titleLen(el, text) {
    var n = String(text || '').length;
    el.classList.remove('stv-tl-long', 'stv-tl-xlong');
    if (n > 50) el.classList.add('stv-tl-xlong'); else if (n > 26) el.classList.add('stv-tl-long');
  }
  // a logo picture; until it loads (or without one) the title text stays — no empty box, no "□□□".
  // wanted(): whether the box still wants it; without it, whether the box is on the page — a box filled
  // before it is put on the page (the banner from cached data) must pass wanted, or it keeps its text
  function logoInto(box, m, size, cls, mark, wanted) {
    cls = cls || 'stv-logo';
    getLogo(m, function (p) {
      // (two asks in flight for one box — a slide shown, left and shown again — one picture)
      if (!p || (wanted ? !wanted() : !inDoc(box)) || box.querySelector('img.' + cls)) return;
      var im = new Image();
      im.className = cls;
      im.alt = '';
      im.onload = function () { (mark || box).classList.add('stv-has-logo'); };
      im.onerror = function () { if (im.parentNode) im.parentNode.removeChild(im); };
      im.src = img(p, size);
      box.appendChild(im);
    });
  }

  // ---------- colour from the backdrop: a 32×18 canvas once per picture, kept in memory ----------
  function tintOf(path, cb) {
    if (!path || !opt(K.tint)) return cb(null);
    var have = tints.get(path);
    if (have !== undefined) return cb(have);
    var im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = function () {
      try {
        var c = document.createElement('canvas'); c.width = 32; c.height = 18;
        var x = c.getContext('2d'); x.drawImage(im, 0, 0, 32, 18);
        var d = x.getImageData(0, 0, 32, 18).data, r = 0, g = 0, b = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
          var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
          var w = 1 + (mx - mn) / 32;   // colourful pixels count more than grey ones
          if (mx < 20) w = 0.2;
          r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w;
        }
        var col = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
        tints.set(path, col);
        cb(col);
      } catch (e) { tints.set(path, null); cb(null); }   // a tainted canvas: same answer next time
    };
    im.onerror = function () { cb(null); };
    im.src = img(path, 'w300');
  }
  // the page colour: the picture's colour, very dark (Apple keeps the art for colour)
  function deep(col, f) { return 'rgb(' + col.map(function (v) { return Math.round(v * f); }).join(',') + ')'; }
  function deepA(col, f, a) { return 'rgba(' + col.map(function (v) { return Math.round(v * f); }).join(',') + ',' + a + ')'; }

  // ---------- CSS ----------
  var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Snack Inter", "Helvetica Neue", Roboto, Arial, sans-serif';
  // The theme's Inter (Cyrillic and Latin subsets) from <the script's folder>/snack_tv/. A host without that
  // folder (the hub, a copy of the script alone) would answer 404 on every start: with the FontFace API the
  // faces are dropped when they fail (the system font stays) and the folder is not asked again for a day.
  // The faces join document.fonts at once, as @font-face would (no later swap than before on our server).
  // Old TV browsers without the API: plain @font-face (the font is asked for on every start there)
  var FONT_FILES = [['inter-cyr', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'],
    ['inter-lat', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD']];
  var FONT_MISS = 'stv_font_miss', fontsAsked = false;
  function fontFace() {
    var base = scriptBase();
    if (!base) return '';
    if (window.FontFace && document.fonts && document.fonts.add) { loadFonts(base); return ''; }
    return FONT_FILES.map(function (f) {
      return '@font-face{font-family:"Snack Inter";font-style:normal;font-weight:400 700;font-display:swap;src:url(' + base + 'snack_tv/' + f[0] + '.woff2) format("woff2");unicode-range:' + f[1] + '}';
    }).join('');
  }
  function loadFonts(base) {
    if (fontsAsked) return;
    fontsAsked = true;
    try { var miss = objOf(Lampa.Storage.get(FONT_MISS, '{}')); if (miss.b === base && Date.now() - miss.t < 864e5) return; } catch (e) {}
    FONT_FILES.forEach(function (f) { addFace(base, f, '400 700'); });
  }
  // one file as a face. Older engines (Chrome 53–61, old Safari) do not take a weight range: the face
  // fails to parse (a throw, status «error» or a SyntaxError from load) - then again as plain 400 (bold
  // drawn from it, as their CSS path does). Only a file that did not come (the network) is remembered
  function addFace(base, f, weight) {
    var again = function () { if (weight !== '400') addFace(base, f, '400'); };
    var face;
    try {
      face = new FontFace('Snack Inter', 'url(' + base + 'snack_tv/' + f[0] + '.woff2) format("woff2")',
        { style: 'normal', weight: weight, display: 'swap', unicodeRange: f[1] });
    } catch (e) { again(); return; }
    if (face.status === 'error') { again(); return; }
    try { document.fonts.add(face); } catch (e) { again(); return; }
    face.load().then(null, function (err) {
      try { document.fonts['delete'](face); } catch (e) {}
      if (err && err.name === 'SyntaxError') { again(); return; }
      try { Lampa.Storage.set(FONT_MISS, { b: base, t: Date.now() }, true); } catch (e) {}
    });
  }
  var BASE = '';
  function scriptBase() {
    if (BASE) return BASE;
    try {
      var s = document.currentScript && document.currentScript.src;
      if (!s) { var list = document.getElementsByTagName('script'); for (var i = 0; i < list.length; i++) if (/snack_tv\.js/.test(list[i].src)) s = list[i].src; }
      if (s) BASE = s.replace(/[^\/]*$/, '');
    } catch (e) {}
    return BASE;
  }
  scriptBase();

  var PHONE = '@media screen and (max-width:599px){';
  // a size in px for the look: (tvOS value, iPad value)
  function tp(tvN, padN) { return px(M === 'tv' ? tvN : padN); }
  // the values every part of the sheet shares
  function cssCtx() {
    var t = T[M], B = 'body.stv', G = L ? 'rgba(52,52,58,.92)' : 'rgba(40,40,46,.55)', ease = 'cubic-bezier(.2,.8,.2,1)', tv = M === 'tv';
    var blur = L ? '' : '-webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%);';
    return { t: t, B: B, G: G, ease: ease, tv: tv, PAGE: tv ? '#101014' : '#000', hH: window.innerHeight, F: B + ' .stv-full',
      glass: 'background:' + G + ';' + blur + (L ? '' : 'box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(255,255,255,.07);'),
      MOVE: 'transition:transform ' + t.dur + 'ms ' + ease };
  }
  // the theme's whole stylesheet, part by part (the order of the parts is the cascade order)
  function css() {
    var c = cssCtx();
    return [fontFace(), cssBase(c), cssFull(c), cssEpisodes(c), cssAutopilot(c), cssRows(c), cssHero(c), cssPanels(c), cssSearch(c), cssPosters(c), cssPerson(c), cssSchedule(c), cssTorrents(c), cssBars(c)].join('\n');
  }
  // ---- the page: font, colour, header, what is hidden by default
  function cssBase(c) {
    var t = c.t, B = c.B, glass = c.glass, PAGE = c.PAGE, r = [];
    // ---- base: font, black, no Lampa accents
    r.push(B + '{font-family:' + FONT + ';-webkit-font-smoothing:antialiased}');
    r.push(B + ' .background{display:none}');
    // ---- header (Apple TV has no clock, date or tray icons)
    r.push(B + '.stv-head .head__time,' + B + '.stv-head .notice--icon,' + B + '.stv-head .full--screen,' + B + '.stv-head .open--broadcast,' +
      B + '.stv-head .head__markers,' + B + '.stv-head .head__logo-icon{display:none!important}');
    // the menu button where Lampa shows it (touch, mouse), even when a site's own CSS hides it for its logo
    // (siaivo: .head__menu-icon{display:none!important}), the logo being hidden here
    r.push(B + '.true--mobile .head__menu-icon,' + B + '.mouse--controll:not(.true--mobile) .head__menu-icon{display:block!important}');
    r.push(B + ' .head__title{font-weight:700;letter-spacing:-.01em}');
    r.push(B + ' .head,' + B + ' .head__body{background:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}');
    // the header floats over the page (Apple's bars do): Lampa measures it as 0 high, pages start at the
    // top; screens without a picture at the top get the header's height as an inset of their scroll
    var headH = Math.round(4 * t.base * k);
    // only on Home and the card (their picture runs under it); every other page keeps Lampa's layout
    var FH = B + '.stv-float-head';
    r.push(FH + ' .head{height:0;overflow:visible}');
    r.push(B + ' .head:before{content:"";position:absolute;left:0;right:0;top:0;height:' + Math.round(headH * 1.3) + 'px;z-index:-1;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.6),rgba(0,0,0,0))}');
    r.push(FH + ' .wrap__content{padding-top:0}');
    // Home and the card: their picture runs under the floating header, no inset of Lampa's
    r.push(B + ' .activity.stv-home .scroll:not(.scroll--horizontal) > .scroll__content,' + B + ' .activity.stv-full .scroll:not(.scroll--horizontal) > .scroll__content,' + B + ' .activity.stv-apv .scroll:not(.scroll--horizontal) > .scroll__content{padding-top:0}');
    r.push(B + ':not(.stv-float-head) .head:before{display:none}');
    r.push(B + '.stv-head .head__title{display:none}');
    r.push(B + ' .head__actions{margin-left:auto}');
    // one page colour: Apple black on iPad, tvOS 26's near-black on TVs
    r.push(B + ',' + B + ' .wrap,' + B + ' .wrap__content,' + B + ' .activitys,' + B + ' .activity,' + B + ' .activity__body{background-color:' + PAGE + '}');
    r.push(B + ' .head__action{border-radius:50%;' + glass + 'color:#fff}');
    r.push(B + ' .head__action.focus{background:#fff;color:#000}');
    // ---- hidden by default (each comes back in the settings)
    r.push(B + '.stv-react .full-start-new__reactions,' + B + '.stv-react .button--reaction{display:none!important}');
    r.push(B + '.stv-tech .card__quality,' + B + '.stv-tech .full-start__status,' + B + '.stv-tech .card__type{display:none!important}');
    return r.join('\n');
  }
  // ---- the full card: backdrop, logo, meta line, buttons, cast, «About»
  function cssFull(c) {
    var t = c.t, B = c.B, G = c.G, glass = c.glass, ease = c.ease, tv = c.tv, hH = c.hH, MOVE = c.MOVE, F = c.F, r = [];
    r.push(F + '{background:#000;background:var(--stv-bg,#000)}');
    // the backdrop: full bleed, under the header, fading into the page at the bottom and the left
    r.push(F + ' .full-start__background{left:0;top:0;width:100%;height:100%;-webkit-mask-image:none;mask-image:none;object-fit:cover;' +
      'transition:opacity .5s;position:absolute;z-index:-1}');
    r.push(F + ' .full-start__background.loaded{opacity:1}');
    // the vertical art whole, across the width at the top (Apple's iPhone page), not stretched to the
    // screen's height and cut at the sides
    r.push(F + ' .stv-own-bg--poster{object-position:50% 0;height:auto!important;max-height:100%}');
    r.push(F + ' .alc-trailer-bg,' + F + ' .alc-trailer-bg iframe,' + B + ' .stv-hero .alc-trailer-bg iframe{pointer-events:none!important}');
    r.push(F + ' .full-start__background.dim{opacity:.35}');
    r.push(F + ' .stv-scrim{position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none;' +
      'background:linear-gradient(to top,#000 0%,rgba(0,0,0,.6) ' + (tv ? 30 : 26) + '%,rgba(0,0,0,0) ' + (tv ? 62 : 58) + '%),linear-gradient(to right,rgba(0,0,0,.6) 0%,rgba(0,0,0,0) ' + (tv ? 55 : 62) + '%);' +
      'background:linear-gradient(to top,var(--stv-bg,#000) 0%,var(--stv-bg-a6,rgba(0,0,0,.6)) ' + (tv ? 30 : 26) + '%,rgba(0,0,0,0) ' + (tv ? 62 : 58) + '%),' +
      'linear-gradient(to right,var(--stv-bg-a6,rgba(0,0,0,.6)) 0%,rgba(0,0,0,0) ' + (tv ? 55 : 62) + '%)}');
    // under the title, the text and the buttons (bottom left): one more shade, so the description
    // stays readable over a light or busy backdrop (Apple darkens the same corner)
    r.push(F + ' .stv-scrim:after{content:"";position:absolute;left:0;top:0;width:100%;height:100%;' +
      'background:radial-gradient(ellipse 90% 85% at 0% 70%,rgba(0,0,0,.6) 0%,rgba(0,0,0,.6) 50%,rgba(0,0,0,0) 100%);' +
      'background:radial-gradient(ellipse 90% 85% at 0% 70%,var(--stv-bg-a6,rgba(0,0,0,.6)) 0%,var(--stv-bg-a6,rgba(0,0,0,.6)) 50%,rgba(0,0,0,0) 100%)}');
    // no poster; the info block sits at the bottom left of the first screen
    r.push(F + ' .full-start-new__left{display:none}');
    r.push(F + ' .full-start-new__right{margin:0!important;padding:0!important;border-radius:0!important;background:none!important;overflow:visible!important;' +
      '-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}');
    r.push(F + ' .full-start-new{padding:0 ' + px(t.margin) + ' ' + tp(36, 28) + '}');
    r.push(F + ' .full-start-new__body{min-height:' + Math.round(hH * (tv ? 0.72 : 0.62)) + 'px;display:flex;align-items:flex-end}');
    // phones in landscape (390 high): the logo + text + buttons outgrow the body and the logo went under the header
    if (!tv) r.push(F + ' .full-start-new__body{box-sizing:border-box;padding-top:' + px(64) + '}');
    r.push(F + ' .full-start-new__right{width:100%;max-width:none;padding:0}');
    r.push(F + ' .full-start-new__head,' + F + ' .full-start-new__details,' + F + ' .full-start-new__tagline{display:none}');
    // title: the logo art; the text only until (or without) it
    r.push(F + ' .full-start-new__title{font-size:' + tp(76, 40) + ';line-height:1.05;font-weight:800;letter-spacing:-.02em;margin:0 0 ' + tp(18, 12) + ';' +
      'max-width:' + px(t.descW + 100) + ';overflow-wrap:anywhere;display:block;max-height:none;overflow:visible;-webkit-line-clamp:unset}');
    // a long name without a logo (anime): smaller and at most 3 lines, else it pushed the buttons off the screen
    r.push(F + ' .full-start-new__title.stv-tl-long{font-size:' + tp(54, 30) + '}' + F + ' .full-start-new__title.stv-tl-xlong{font-size:' + tp(42, 24) + '}');
    r.push(F + ' .full-start-new__title:not(.stv-has-logo){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}');
    r.push(F + ' .full-start-new__title.stv-has-logo{font-size:0;line-height:0;color:transparent}');
    r.push(F + ' .full-start-new__title .stv-logo{display:block;max-width:' + px(t.logoW) + ';max-height:' + px(t.logoH) + ';width:auto;height:auto;' +
      'object-fit:contain;object-position:left bottom;opacity:0;transition:opacity .35s}');
    r.push(F + ' .full-start-new__title.stv-has-logo .stv-logo{opacity:1}');
    r.push(F + ' .full-start-new__title:not(.stv-has-logo) .stv-logo{position:absolute;width:1px;height:1px}');
    // meta line, badges, description
    r.push(F + ' .stv-meta,' + F + ' .stv-desc{text-shadow:0 1px 2px rgba(0,0,0,.45),0 0 18px rgba(0,0,0,.35)}');
    r.push(F + ' .stv-meta{font-size:' + px(t.sub) + ';color:rgba(235,235,245,.85);font-weight:500;margin-bottom:' + tp(12, 8) + ';display:flex;flex-wrap:wrap;align-items:center}');
    r.push(F + ' .stv-meta > span + span:before{content:"·";margin:0 .4em;opacity:.8}');
    r.push(F + ' .stv-badge{display:inline-block;border:1px solid rgba(255,255,255,.55);border-radius:.25em;padding:0 .3em;font-size:.82em;line-height:1.35;font-weight:600}');
    r.push(F + ' .stv-meta > span.stv-ua:before,' + F + ' .stv-meta > span.stv-nodot:before{content:"";margin:0 .25em}');
    r.push(F + ' .stv-ua .stv-badge{border-color:#ffd500;color:#ffd500}');
    r.push(F + ' .stv-meta .full-start-new__rate-line{display:inline-flex;align-items:center;margin:0;padding:0;font-size:1em;flex-wrap:nowrap}');
    r.push(F + ' .stv-meta .full-start-new__rate-line:before{content:"·";margin:0 .4em;opacity:.8}');
    r.push(F + ' .stv-meta .full-start__rate{display:inline-flex;align-items:baseline;margin:0 .55em 0 0;padding:0;border:0;background:none;font-size:1em;font-weight:600;color:#fff}');
    r.push(F + ' .stv-meta .full-start__rate > div{font-size:1em!important;margin:0;padding:0;line-height:1.2}');
    r.push(F + ' .stv-meta .full-start__rate > div + div{margin-left:.3em;font-weight:500;color:rgba(235,235,245,.6);font-size:.8em!important}');
    r.push(F + ' .stv-meta .full-start__rate.hide{display:none}');
    r.push(F + ' .full-start-new__rate-line .source--name{opacity:.7}');
    r.push(F + ' .full-start-new__rate-line .full-start__pg{display:none}');
    r.push(F + ' .stv-desc{font-size:' + tp(25, 15) + ';line-height:1.38;color:rgba(235,235,245,.9);max-width:' + px(t.descW) + ';margin-bottom:' + tp(26, 18) + '}');
    r.push(F + ' .stv-desc__text{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}');
    r.push(F + ' .stv-desc.open .stv-desc__text{-webkit-line-clamp:unset;display:block}');
    r.push(F + ' .stv-desc__more{display:inline-block;margin-top:.25em;font-weight:700;color:#fff;text-transform:uppercase;font-size:.8em;letter-spacing:.04em}');
    r.push(F + ' .stv-desc:not(.long) .stv-desc__more{display:none}');
    // buttons: the white capsule (Autopilot / play) + round glass buttons
    var BTN = F + ' .full-start-new__buttons';
    r.push(BTN + '{display:flex;flex-wrap:nowrap;align-items:flex-start;margin:0;padding-bottom:' + px(8) + '}');
    // what the row leaves out is in «⋯» (see markButtons)
    r.push(BTN + ' > .full-start__button.stv-more{display:none!important}');
    r.push(BTN + ' > .full-start__button{position:relative;width:' + px(t.round) + ';height:' + px(t.round) + ';min-width:0;padding:0;margin:0 ' + tp(22, 28) + ' ' + tp(10, 6) + ' 0;' +
      'border-radius:50%;justify-content:center;font-size:' + px(t.btnFont) + ';color:#fff;' + glass +
      MOVE + ',background-color .15s,color .15s}');
    r.push(BTN + ' > .full-start__button > svg{width:' + px(t.round * 0.42) + ';height:' + px(t.round * 0.42) + '}');
    // no labels under the round buttons: TVs show the focused one's name under it (as wide as it needs),
    // touch shows it on a long press (.stv-tip)
    r.push(BTN + ' > .full-start__button > span{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin:' + px(6) + ' 0 0;font-size:' + px(t.cap2) + ';' +
      'line-height:1.15;color:rgba(235,235,245,.7);font-weight:500;text-align:center;white-space:nowrap;max-width:none;overflow:visible;' + (tv ? 'display:block!important}' : 'display:none!important}'));
    r.push(BTN + ' > .full-start__button > span:empty{display:none!important}');
    if (!tv) {
      r.push(B + ' .stv-tip{position:fixed;left:0;top:0;z-index:1000;padding:' + px(6) + ' ' + px(11) + ';border-radius:' + px(9) + ';background:rgba(44,44,48,.97);color:#fff;font-size:' + px(t.cap + 1) + ';' +
        'font-weight:600;white-space:nowrap;pointer-events:none;opacity:0;transform:translateY(' + px(4) + ');transition:opacity .15s,transform .15s' + (L ? '' : ';box-shadow:0 6px 20px rgba(0,0,0,.45)') + '}');
      r.push(B + ' .stv-tip.on{opacity:1;transform:none}');
    }
    r.push(BTN + ' > .full-start__button.stv-primary{margin-right:' + tp(22, 30) + ';width:auto;min-width:' + tp(300, 200) + ';height:' + px(t.btnH) + ';border-radius:' + px(t.btnH) + ';padding:0 ' + px(t.btnPad) + ';' +
      'background:#fff;color:#000;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}');
    r.push(BTN + ' > .full-start__button.stv-primary > svg{width:' + px(t.btnFont * 1.05) + ';height:' + px(t.btnFont * 1.05) + '}');
    r.push(BTN + ' > .full-start__button.stv-primary > span{display:inline!important;position:static;transform:none;margin:0 0 0 ' + px(10) + ';font-size:' + px(t.btnFont) + ';font-weight:600;color:inherit;max-width:none;overflow:visible;white-space:nowrap;width:auto;min-width:0}');
    if (tv) {
      // tvOS: unfocused = dark glass, focused = white with black text, lifted; labels only for the focused one
      r.push(BTN + ' > .full-start__button.stv-primary{background:' + G + ';color:#fff}');
      r.push(BTN + ' > .full-start__button > span{opacity:0;transition:opacity .15s}');
      r.push(BTN + ' > .full-start__button.stv-primary > span{opacity:1}');
      r.push(BTN + ' > .full-start__button.focus{background:#fff;color:#000;transform:scale(1.06)' + (L ? '' : ';box-shadow:0 14px 30px rgba(0,0,0,.45)') + '}');
      r.push(BTN + ' > .full-start__button.focus > span{opacity:1;color:#fff}');
      r.push(BTN + ' > .full-start__button.stv-primary.focus > span{color:#000}');
    } else {
      r.push(BTN + ' > .full-start__button:active{transform:scale(.95)}');
    }
    // Autopilot's white button is the one to press: Lampa's own Play goes (setting «Скрыть стандартную кнопку»)
    r.push(B + '.stv-noplay .stv-full .full-start-new__buttons > .button--play:not(.stv-primary){display:none!important}');
    // cast: circles
    r.push(F + ' .full-person{width:' + px(t.castD + (tv ? 20 : 14)) + ';margin-right:' + tp(22, 12) + ';background:none;display:block;text-align:center}');
    r.push(F + ' .full-person__photo{width:' + px(t.castD) + ';height:' + px(t.castD) + ';border-radius:50%;margin:0 auto ' + tp(12, 8) + ';overflow:hidden;background:rgba(255,255,255,.1)}');
    r.push(F + ' .full-person__photo img{width:100%;height:100%;object-fit:cover}');
    r.push(F + ' .full-person__body{padding:0}');
    r.push(F + ' .full-person__name{font-size:' + px(t.cap + 1) + ';font-weight:600;line-height:1.25}');
    r.push(F + ' .full-person__role{font-size:' + px(t.cap2) + ';color:rgba(235,235,245,.55);margin-top:.2em}');
    if (tv) r.push(F + ' .full-person.focus .full-person__photo{transform:scale(1.09);box-shadow:0 0 0 ' + px(3) + ' #fff;transition:transform ' + t.dur + 'ms ' + ease + '}');
    // focus / hover: Lampa paints a white box with black text; ours has no box, so the text stays white
    // (the ring and the lift on the portrait show the focus)
    r.push(F + ' .full-person.focus,' + F + ' .full-person.hover{background:none;color:#fff}');
    if (!tv) r.push(F + ' .full-person:active .full-person__photo{transform:scale(.95)}');
    // "About" / information: plain text on the page, keys small and bold
    r.push(F + ' .full-descr{padding:0 ' + px(t.margin) + '}');
    // "About": the details only — the text itself is in the info block («ещё» opens it in full)
    r.push(B + ' .stv-full .full-descr__text{display:none}');
    r.push(B + ' .stv-full .full-descr__details{margin-top:0}');
    r.push(F + ' .full-descr__info-name{font-size:' + px(t.cap) + ';font-weight:700;color:#fff;text-transform:none}');
    r.push(F + ' .full-descr__info-body{font-size:' + px(t.cap) + ';color:rgba(235,235,245,.6)}');
    r.push(F + ' .full-descr__tags{display:none}');
    // a phone (Apple TV on iPhone): the art fills the top, a deep gradient of its own colour under the
    // text, everything centred; the description below the buttons
    // (last in the part: the general rules above must not override it)
    var bgc = 'var(--stv-bg,#000)', bga = 'var(--stv-bg-a6,rgba(0,0,0,.6))';
    r.push(PHONE + F + ' .stv-scrim{background:linear-gradient(to top,#000 0%,#000 44%,rgba(0,0,0,.8) 62%,rgba(0,0,0,0) 86%);' +
      'background:linear-gradient(to top,' + bgc + ' 0%,' + bgc + ' 44%,' + bga + ' 62%,rgba(0,0,0,0) 86%)}' +
      F + ' .stv-scrim:after{display:none}' +
      F + ' .full-start-new__body{min-height:' + Math.round(hH * 0.86) + 'px}' +
      F + ' .full-start-new__right{display:flex;flex-direction:column;align-items:center;text-align:center}' +
      F + ' .full-start-new__title{order:1;margin-left:auto;margin-right:auto;max-width:100%}' +
      F + ' .full-start-new__title .stv-logo{max-width:78vw;object-position:center bottom;margin:0 auto}' +
      F + ' .stv-meta{order:2;justify-content:center}' +
      // the white button across, the round ones in one even row under it
      F + ' .full-start-new__buttons{order:3;flex-wrap:wrap!important;justify-content:space-evenly;width:100%}' +
      F + ' .full-start-new__buttons > .full-start__button.stv-primary{flex:1 0 100%;max-width:100%;margin:' + px(6) + ' 0 ' + px(16) + '!important}' +
      F + ' .full-start-new__buttons > .full-start__button:not(.stv-primary){margin:0 0 ' + px(18) + '!important}' +
      F + ' .stv-desc{order:4;text-align:left;max-width:100%;margin-top:' + px(4) + '}' +
      F + ' .full-start-new__title,' + F + ' .stv-meta,' + F + ' .stv-desc{text-shadow:0 1px 10px rgba(0,0,0,.45)}' +
      '}');
    return r.join('\n');
  }
  // ---- the episode card: one rounded card, the still (16:9) and a strip under it; the text sits at the
  // bottom, over the still's lower part. Under the text: the still blurred and darkened (iPad, phones),
  // a plain dark strip in the light mode (TVs: no blur). root: the card's class (the theme's .stv-ep,
  // Autopilot's .alc-ep: the same parts, root__img, root__info …)
  function cssEpCard(c, root) {
    var t = c.t, tv = c.tv, MOVE = c.MOVE, r = [];
    var EP = c.B + ' ' + root, STRIP = L ? '#1c1c21' : 'rgba(18,18,22,.5)';
    r.push(EP + '{position:relative;width:' + px(t.epW) + ';margin-right:' + px(t.gutter * (tv ? 0.6 : 0.8)) + ';padding-bottom:' + px(t.epChin) + ';flex-shrink:0;vertical-align:top;white-space:normal;' +
      'border-radius:' + px(t.cardR) + ';overflow:hidden;background:' + (L ? '#1c1c21' : 'rgba(255,255,255,.08)') + ';' + MOVE + '}');
    r.push(EP + '__img{position:relative;padding-bottom:56.25%;overflow:hidden;background:none}');
    r.push(EP + '__img img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .3s}');
    r.push(EP + ' img.loaded{opacity:1}');
    if (L) r.push(EP + '__img:after{content:"";position:absolute;left:0;right:0;bottom:0;height:60%;background:linear-gradient(to bottom,rgba(0,0,0,0),' + STRIP + ')}');
    else {
      // no seam: the sharp still dissolves (a mask, not a dark band) into its blurred copy, which is
      // laid out the same way and only runs on under the strip
      r.push(EP + '__img img{-webkit-mask-image:linear-gradient(to bottom,#000 35%,rgba(0,0,0,.6) 62%,rgba(0,0,0,0) 100%);mask-image:linear-gradient(to bottom,#000 35%,rgba(0,0,0,.6) 62%,rgba(0,0,0,0) 100%)}');
      r.push(EP + '__blur{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden}');
      r.push(EP + '__blur img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:50% 100%;opacity:0;transform:scale(1.15);-webkit-filter:blur(' + px(18) + ') brightness(.55) saturate(1.2);filter:blur(' + px(18) + ') brightness(.55) saturate(1.2)}');
      r.push(EP + ' ' + root + '__blur img.loaded{opacity:1}');
      // a soft shade under the text over both
      r.push(EP + ':after{content:"";position:absolute;left:0;right:0;bottom:0;height:62%;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,0),rgba(0,0,0,.35))}');
      r.push(EP + '__info{z-index:1}');
    }
    r.push(EP + '__info{position:absolute;left:0;right:0;bottom:0;padding:0 ' + tp(18, 12) + ' ' + tp(16, 11) + ';text-shadow:0 1px 3px rgba(0,0,0,.35)}');
    r.push(EP + '__cap{font-size:' + px(t.cap2) + ';letter-spacing:.06em;color:rgba(235,235,245,.7);font-weight:600}');
    r.push(EP + '__name{font-size:' + tp(27, 15) + ';font-weight:600;line-height:1.25;margin-top:.1em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}');
    r.push(EP + '__descr{font-size:' + px(t.cap) + ';line-height:1.3;color:rgba(235,235,245,.72);margin-top:.2em;height:2.6em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}');
    r.push(EP + '__time{display:flex;align-items:center;font-size:' + px(t.cap2) + ';color:rgba(235,235,245,.6);margin-top:.35em}');
    r.push(EP + '__bar{flex:0 0 ' + tp(60, 36) + ';height:' + tp(6, 4) + ';border-radius:9px;background:rgba(255,255,255,.3);overflow:hidden;margin-right:' + tp(10, 7) + '}');
    r.push(EP + '__bar > div{height:100%;background:#fff;border-radius:9px}');
    r.push(EP + '__seen{position:absolute;right:' + px(8) + ';top:' + px(8) + ';width:' + tp(34, 22) + ';height:' + tp(34, 22) + ';border-radius:50%;background:rgba(0,0,0,.55);' +
      'color:#fff;font-size:' + tp(20, 13) + ';line-height:' + tp(34, 22) + ';text-align:center;font-weight:700}');
    r.push(EP + root + '--soon ' + root + '__img img{opacity:.5}');
    if (tv) {
      r.push(EP + '.focus{transform:scale(' + t.focusScale + ');box-shadow:0 0 0 ' + px(3) + ' rgba(255,255,255,.75)' + (L ? '' : ',0 22px 44px rgba(0,0,0,.55)') + '}');
    } else r.push(EP + ':active{transform:scale(.97)}');
    return r.join('\n');
  }
  // ---- the card's episode row and its season pull-down
  function cssEpisodes(c) {
    var t = c.t, glass = c.glass, ease = c.ease, tv = c.tv, F = c.F, r = [];
    // the episode card (the card's episode row, the schedule)
    r.push(cssEpCard(c, '.stv-ep'));
    // the season pull-down at the head of the episode row
    r.push(F + ' .stv-season-title{display:inline-flex!important;align-items:center;cursor:pointer;border-radius:' + px(12) + ';padding:' + px(2) + ' ' + px(8) + ';margin-left:-' + px(8) + ';transition:background-color .15s,color .15s;white-space:nowrap;flex-shrink:0}');
    r.push(F + ' .stv-season-chev{display:inline-block;flex:0 0 auto;width:.5em!important;height:.8em!important;margin-left:.35em;opacity:.75}');
    if (tv) r.push(F + ' .stv-season-title.focus{background:#fff;color:#000}');
    else r.push(F + ' .stv-season-title:active{background:rgba(255,255,255,.15)}');
    r.push(F + ' .stv-season{display:inline-flex;align-items:center;height:' + tp(56, 34) + ';padding:0 ' + tp(26, 16) + ';border-radius:' + px(40) + ';' + glass +
      'font-size:' + tp(27, 15) + ';font-weight:600;color:#fff;margin-right:' + px(t.gutter) + ';flex-shrink:0;vertical-align:top;transition:transform ' + t.dur + 'ms ' + ease + '}');
    r.push(F + ' .stv-season:after{content:"";width:.45em;height:.45em;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin:-.25em 0 0 .55em}');
    if (tv) r.push(F + ' .stv-season.focus{background:#fff;color:#000;transform:scale(1.06)}');
    r.push(F + ' .stv-eprow .scroll__body{display:flex;align-items:flex-start}');
    r.push(F + ' .stv-eprow .card-more,' + F + ' .stv-eprow .full-episode{display:none!important}');
    return r.join('\n');
  }
  // ---- Autopilot's screen (alc_auto: the head, the voice chips, a row per season, the movie's voices);
  // its own sheet lays it out plainly, this is the Apple look over it
  function cssAutopilot(c) {
    var t = c.t, B = c.B, G = c.G, glass = c.glass, tv = c.tv, hH = c.hH, PAGE = c.PAGE, MOVE = c.MOVE, r = [];
    var A = B + ' .alc-ap', M = px(t.margin), FADE = ',background-color .15s,color .15s';
    r.push(cssEpCard(c, '.alc-ep'));
    if (!L) r.push(B + ' .alc-ep__blur{display:block}');   // Autopilot's sheet hides it; it loads only when shown
    // an episode the series' voice lacks: grey, with the voice that has it; one still loading: dim
    r.push(B + ' .alc-ep--other .alc-ep__img img.loaded,' + B + ' .alc-ep--none .alc-ep__img img.loaded{opacity:.42;-webkit-filter:grayscale(1);filter:grayscale(1)}');
    r.push(B + ' .alc-ep--other .alc-ep__blur,' + B + ' .alc-ep--none .alc-ep__blur{opacity:.45}');
    r.push(B + ' .alc-ep--other .alc-ep__info,' + B + ' .alc-ep--none .alc-ep__info{opacity:.6}' + B + ' .alc-ep--wait .alc-ep__info{opacity:.7}');
    r.push(B + ' .alc-ep__tag{left:' + tp(14, 9) + ';bottom:auto;top:' + tp(14, 9) + ';padding:' + tp(6, 3) + ' ' + tp(16, 10) + ';border-radius:' + px(40) + ';font-size:' + px(t.cap2) + ';' +
      'font-weight:600;color:#fff;background:' + G + '}');   // (solid: a blur behind each tag costs old TVs)
    if (!tv) r.push(B + ' .alc-ep.focus{box-shadow:none}');   // touch: no focus ring (a tap plays)
    // the page: the theme's colour and margins; rows run to the right edge, the focused card stays on the margin
    r.push(A + '{padding-bottom:' + tp(80, 40) + '}');
    r.push(A + '-season,' + A + '__chips{padding-left:0;padding-right:0}');
    r.push(A + '-season > .scroll,' + A + '__chips > .scroll{padding-left:' + M + ';padding-top:' + tp(14, 4) + ';padding-bottom:' + tp(26, 6) + '}');
    r.push(A + '-season__top{padding:0 ' + M + '}');
    // the head: the art darkened, fading into the page; the logo small, the white button, «⋯»
    // the head: the card's picture (from the very top, under the floating header), lower than the card's so the
    // voices / seasons show at once
    r.push(A + '__head{min-height:' + Math.round(hH * 0.6) + 'px;padding:' + tp(150, 90) + ' ' + M + ' ' + tp(30, 22) + '}');
    r.push(PHONE + A + '__head{min-height:' + Math.round(hH * 0.5) + 'px}}');
    r.push(A + '__art img{object-position:50% 15%}');
    r.push(A + '__art img.loaded{opacity:.62}');
    r.push(A + '__shade{background:linear-gradient(to top,' + PAGE + ' 0%,rgba(0,0,0,.5) 38%,rgba(0,0,0,0) 72%),linear-gradient(to right,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 60%)}');
    r.push(A + '__logo img{max-width:' + px(t.logoW * 0.62) + ';max-height:' + px(t.logoH * 0.62) + ';margin-bottom:' + tp(16, 10) + ';object-fit:contain;object-position:left bottom}');
    r.push(A + '__title{font-size:' + tp(56, 32) + ';font-weight:800;letter-spacing:-.02em}');
    r.push(A + '__meta{font-size:' + px(t.sub) + ';color:rgba(235,235,245,.72);font-weight:500;opacity:1;margin-bottom:' + tp(22, 14) + '}');
    r.push(A + '__play{height:' + px(t.btnH) + ';padding:0 ' + px(t.btnPad) + ';border-radius:' + px(t.btnH) + ';font-size:' + px(t.btnFont) + ';font-weight:600;box-sizing:border-box;' +
      MOVE + FADE + '}');
    r.push(A + '__play svg{width:' + px(t.btnFont * 1.05) + ';height:' + px(t.btnFont * 1.05) + ';margin-right:' + px(10) + '}');
    r.push(A + '__bar{left:' + px(t.btnPad) + ';right:' + px(t.btnPad) + ';bottom:' + tp(9, 6) + ';height:' + tp(5, 3) + '}');
    r.push(A + '__more{width:' + px(t.round) + ';height:' + px(t.round) + ';margin-left:' + tp(22, 16) + ';color:#fff;' + glass + MOVE + '}');
    r.push(A + '__more svg{width:' + px(t.round * 0.42) + ';height:' + px(t.round * 0.42) + '}');
    if (tv) {
      // tvOS: unfocused = dark glass, focused = white, lifted
      r.push(A + '__play{background:' + G + ';color:#fff}' + A + '__play .alc-ap__bar{background:rgba(255,255,255,.25)}' + A + '__play .alc-ap__bar div{background:#fff}');
      r.push(A + '__play.focus,' + A + '__more.focus{background:#fff;color:#000;transform:scale(1.06);box-shadow:' + (L ? 'none' : '0 14px 30px rgba(0,0,0,.45)') + '}');
      r.push(A + '__play.focus .alc-ap__bar{background:rgba(0,0,0,.2)}' + A + '__play.focus .alc-ap__bar div{background:#000}');
    } else {
      r.push(A + '__play.focus,' + A + '__more.focus{box-shadow:none}' + A + '__more.focus{background:' + G + ';color:#fff}');
      r.push(A + '__play:active,' + A + '__more:active{transform:scale(.95)}');
    }
    // the voice chips: glass capsules, the series' voice white
    var CH = B + ' .alc-chip';
    r.push(CH + '{height:' + tp(52, 34) + ';line-height:' + tp(52, 34) + ';padding:0 ' + tp(26, 16) + ';margin-right:' + tp(16, 10) + ';border-radius:' + px(40) + ';font-size:' + tp(25, 15) + ';' +
      'font-weight:500;color:#fff;' + glass + MOVE + FADE + '}');
    r.push(CH + '--on{background:#fff;color:#000;font-weight:600;box-shadow:none}');
    r.push(CH + '--all{background:none;box-shadow:none;color:rgba(235,235,245,.8)}');
    if (tv) r.push(CH + '.focus{background:#fff;color:#000;transform:scale(1.08);box-shadow:' + (L ? 'none' : '0 10px 24px rgba(0,0,0,.45)') + '}' + CH + '--on:not(.focus){background:rgba(255,255,255,.85)}');
    else r.push(CH + '.focus{box-shadow:none}' + CH + ':active{transform:scale(.95)}');
    // a season: «Season 2» and its line (in which voice, what else has it)
    r.push(A + '-season{padding-top:' + tp(26, 18) + '}');
    r.push(A + '-season__head{margin:0 0 ' + tp(4, 2) + ' -' + px(8) + ';padding:' + px(2) + ' ' + px(8) + ';border-radius:' + px(12) + ';transition:background-color .15s,color .15s}');
    r.push(A + '-season__title{font-size:' + px(t.title) + ';font-weight:' + t.titleW + ';letter-spacing:-.01em;margin-right:' + tp(16, 10) + '}');
    r.push(A + '-season__sub{font-size:' + px(t.sub) + ';color:rgba(235,235,245,.6);opacity:1}');
    if (tv) r.push(A + '-season__head.focus{background:#fff;color:#000}' + A + '-season__head.focus .alc-ap-season__sub{color:rgba(0,0,0,.6)}');
    else r.push(A + '-season__head.focus{background:none;color:inherit}' + A + '-season__head:active{background:rgba(255,255,255,.12)}');
    // the movie's voices: one column, the glass list; wide (Autopilot's layoutVoices, columns at least --alc-vcol
    // wide, --alc-vgap apart): a plain tvOS list, no panels, the focused one white on TVs, a tint under the finger
    r.push(A + '__voices{padding:' + tp(10, 6) + ' ' + M + ' 0}');
    r.push(B + ' .alc-ap-vgroup{margin-bottom:' + tp(30, 20) + '}');
    r.push(B + ' .alc-ap-vgroup__title{font-size:' + px(t.cap) + ';color:rgba(235,235,245,.6);padding:0 ' + tp(28, 16) + ' ' + tp(10, 6) + '}');
    r.push(A + '__voices{--alc-vcol:' + tp(520, 400) + ';--alc-vgap:' + tp(18, 12) + '}');
    r.push(B + ' .alc-ap-vgroup__list{border-radius:' + px(t.rowR) + ';' + glass + '}');
    r.push(B + ' .alc-ap-vgroup__list--tiles{background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}');
    r.push(B + ' .alc-ap-vrow + .alc-ap-vrow{margin-top:' + tp(6, 4) + '}');
    r.push(B + ' .alc-ap-voice{padding:' + tp(20, 11) + ' ' + tp(28, 16) + ';border-radius:' + px(t.rowR) + ';font-size:' + tp(27, 16) + ';' + MOVE + FADE + '}');
    r.push(B + ' .alc-ap-voice+.alc-ap-voice:before{left:' + tp(28, 16) + ';background:rgba(255,255,255,.09)}');
    r.push(B + ' .alc-ap-voice__sub{font-size:' + px(t.cap) + ';color:rgba(235,235,245,.5);margin-top:' + tp(4, 2) + '}');
    r.push(B + ' .alc-ap-voice__check{width:' + tp(30, 18) + ';height:' + tp(30, 18) + ';margin-left:' + tp(20, 12) + '}');
    r.push(B + ' .alc-ap__vwait{font-size:' + px(t.cap) + ';color:rgba(235,235,245,.45);padding:0 ' + tp(28, 16) + '}');
    if (tv) r.push(B + ' .alc-ap-voice.focus{background:#fff;color:#000;transform:scale(1.02);box-shadow:' + (L ? 'none' : '0 12px 26px rgba(0,0,0,.45)') + '}' + B + ' .alc-ap-voice.focus .alc-ap-voice__sub{color:rgba(0,0,0,.55)}');
    else r.push(B + ' .alc-ap-voice.focus{background:none;color:inherit}' + B + ' .alc-ap-voice.focus .alc-ap-voice__sub{color:rgba(235,235,245,.5)}' +
      B + ' .alc-ap-voice.focus:before,' + B + ' .alc-ap-voice.focus+.alc-ap-voice:before{display:block}' + B + ' .alc-ap-voice:active{background:rgba(255,255,255,.12)}');
    r.push(A + '__msg-title{font-size:' + px(t.title) + ';font-weight:700}' + A + '__msg{padding:' + tp(40, 24) + ' ' + M + '}');
    return r.join('\n');
  }

  // ---- rows and wide cards (Home, sections, related rows), «Up Next»
  function cssRows(c) {
    var t = c.t, B = c.B, ease = c.ease, tv = c.tv, r = [];
    var R = B + ' .items-line';
    // TV: Lampa scrolls a focused row to the top edge; part of the gap sits above each row so its
    // title stays on screen (same spacing between rows)
    r.push(R + '{padding-bottom:' + tp(t.rowGap - 40, t.rowGap) + (tv ? ';padding-top:' + px(40) : '') + '}');
    r.push(R + ' .items-line__head{padding:0 ' + px(t.margin) + ';margin-bottom:' + tp(20, 10) + ';align-items:center;justify-content:flex-start}');
    // CUB's icon rows (Top 100, collections, people): no icon, the name is the row title
    r.push(R + ' .items-line__head .full-person__photo{display:none!important}');
    r.push(R + ' .items-line__head .full-person{display:block;width:auto;margin:0;padding:0;background:none}');
    r.push(R + ' .items-line__head .full-person__body{padding:0}');
    r.push(R + ' .items-line__head .full-person__name{font-size:' + px(t.title) + ';font-weight:' + t.titleW + ';letter-spacing:-.01em;line-height:1.2;color:#fff}');
    r.push(R + ' .items-line__title{padding-left:0!important;margin-left:0!important;font-size:' + px(t.title) + ';font-weight:' + t.titleW + ';letter-spacing:-.01em;line-height:1.2}');
    r.push(R + ' .items-line__more{margin-left:' + px(6) + ';background:none;padding:0 0 0 .3em;font-size:0;line-height:1;color:rgba(235,235,245,.5);border-radius:.4em}');
    r.push(R + ' .items-line__more:after{content:"›";font-size:' + px(t.title * 1.25) + ';font-weight:600}');
    if (tv) r.push(R + ' .items-line__more.focus{background:#fff;color:#000;padding:0 .35em}');
    r.push(R + ' .scroll--horizontal .scroll__content{padding:0 ' + px(t.margin) + '}');
    r.push(R + ' .scroll--horizontal{-webkit-mask-image:none;mask-image:none}');
    r.push(R + ' .items-line__body{overflow:visible}');
    // touch rows scroll natively (overflow auto on both axes): the title under a poster made them scroll up /
    // down a little. One axis only, and room for the title inside the row (taken from the gap under it)
    if (!tv) {
      var TH = 7 + Math.round(t.cap * 1.25) + 4;
      r.push(R + ' .scroll--horizontal{overflow-y:hidden!important;padding-bottom:' + px(TH) + '}');
      r.push(R + '{padding-bottom:' + px(Math.max(4, t.rowGap + 10 - TH)) + '}');
    }
    // posters in a row: Apple's density (iPad ~6, TV ~7 on screen; phones ~3 and the edge of the next)
    // one size for posters everywhere: a row's poster is as wide as a grid's (cols(): phones 3, iPad 6,
    // TVs 7 across the screen between the side margins); a row shows the edge of the next one
    var RP = R + ' .card:not(.card--wide)';
    r.push(RP + '{width:' + posterCalc(t, cols()) + ';margin-right:' + px(t.gutter) + '}');
    r.push(PHONE + RP + '{width:' + posterCalc(t, 3) + '}}');
    // (Lampa puts 1em before every card of a row: the gap is the theme's gutter only)
    r.push(R + ' .mapping--line > .card{margin-left:0}');
    var C = B + ' .card--wide';
    r.push(C + '{width:' + px(t.cardW) + ';margin-right:' + px(t.gutter) + ';transition:transform ' + t.dur + 'ms ' + ease + '}');
    r.push(C + ' .card__view{padding-bottom:56.25%;border-radius:' + px(t.cardR) + ';margin-bottom:0;background:rgba(255,255,255,.07)}');
    r.push(C + ' .card__img{border-radius:' + px(t.cardR) + ';object-fit:cover;width:100%;height:100%}');
    r.push(C + ' .card__view:after{display:none!important}');
    r.push(C + ' .card__promo{padding:0;left:0;right:0;bottom:0;top:auto;height:62%;border-radius:0 0 ' + px(t.cardR) + ' ' + px(t.cardR) + ';' +
      'background:linear-gradient(to bottom,rgba(0,0,0,0),rgba(0,0,0,.62));pointer-events:none}');
    r.push(C + ' .card__promo-text{display:none}');
    r.push(C + ' .card__promo-title{position:absolute;left:' + tp(18, 11) + ';right:' + tp(18, 11) + ';bottom:' + tp(14, 9) + ';' +
      'font-size:' + tp(30, 17) + ';font-weight:800;line-height:1.1;letter-spacing:-.01em;text-shadow:0 1px 8px rgba(0,0,0,.6);-webkit-line-clamp:2}');
    r.push(C + '.stv-has-logo .card__promo-title{display:none}');
    r.push(C + ' .stv-card-logo{position:absolute;left:' + tp(18, 11) + ';bottom:' + tp(16, 10) + ';max-width:58%;max-height:40%;width:auto;height:auto;' +
      'object-fit:contain;object-position:left bottom;z-index:1;opacity:0;transition:opacity .3s' + (L ? '' : ';filter:drop-shadow(0 1px 6px rgba(0,0,0,.45))') + '}');
    r.push(C + '.stv-has-logo .stv-card-logo{opacity:1}');
    r.push(C + ' .card__icons,' + C + ' .card__marker,' + C + ' .card-watched,' + C + ' .card__type,' + C + ' .card__age,' + C + ' .card__title{display:none!important}');
    // rating and UA: small, inside the frame (nothing sticks out at the row edges)
    r.push(C + ' .card__vote{top:' + tp(12, 7) + ';right:' + tp(12, 7) + ';bottom:auto;left:auto;padding:' + tp(4, 2) + ' ' + tp(9, 6) + ';' +
      'font-size:' + tp(20, 11) + ';font-weight:700;line-height:1.2;border-radius:' + px(20) + ';background:rgba(0,0,0,.55);color:#fff;z-index:2}');
    r.push(C + ' .snack-ua{top:' + tp(12, 7) + ';left:' + tp(12, 7) + ';right:auto;font-size:' + tp(18, 10) + ';border-radius:' + px(5) + ';padding:' + tp(4, 2) + ' ' + tp(7, 4) + '}');
    r.push(C + ' .snack-sub-new{top:auto;bottom:' + px(8) + '}');
    // light mode: Lampa's will-change:transform on every card made each one a layer of its own (60+
    // textures on a TV's weak GPU); the focused card still scales smoothly (Chrome lifts it for the
    // transition only)
    if (L) r.push(B + ' .card{will-change:auto}');
    if (tv) {
      r.push(C + '.focus{transform:scale(' + t.focusScale + ');z-index:2}');
      r.push(C + '.focus .card__view{box-shadow:0 0 0 ' + px(3) + ' rgba(255,255,255,.8)' + (L ? '' : ',0 24px 48px rgba(0,0,0,.55)') + '}');
    } else r.push(C + ':active{transform:scale(.97)}');
    // "Up Next": progress and S2, E5 inside the frame
    r.push(B + ' .stv-cw{position:absolute;left:' + tp(16, 10) + ';right:' + tp(16, 10) + ';bottom:' + tp(12, 8) + ';z-index:2;display:flex;align-items:center;' +
      'font-size:' + tp(21, 12) + ';font-weight:600;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6)}');
    r.push(B + ' .stv-cw__bar{flex:0 0 ' + tp(60, 36) + ';height:' + tp(6, 4) + ';border-radius:9px;background:rgba(255,255,255,.3);margin-right:' + tp(10, 7) + ';overflow:hidden}');
    r.push(B + ' .stv-cw__bar > div{height:100%;background:#fff}');
    r.push(C + '.stv-cw-card .stv-card-logo{bottom:' + tp(46, 28) + ';max-height:34%}');
    r.push(C + '.stv-cw-card .card__promo-title{bottom:' + tp(44, 26) + '}');
    r.push(B + ' .items-line--type-stv-cw .card--wide{width:' + px(t.cwW) + '}');
    // Shots switched off: the row's empty stand-in
    r.push(B + ' .stv-shots-hidden{display:none!important}');
    return r.join('\n');
  }
  // ---- the banner on Home and the sections
  function cssHero(c) {
    var t = c.t, B = c.B, glass = c.glass, ease = c.ease, tv = c.tv, PAGE = c.PAGE, hH = c.hH, r = [];
    var H = B + ' .stv-hero', heroH = Math.round(hH * (tv ? 0.8 : 0.74));
    r.push(H + '{position:relative;height:' + heroH + 'px;margin:0 0 ' + tp(20, 12) + ';overflow:hidden;background:' + PAGE + '}');
    r.push(H + '__slide{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;transition:opacity 800ms ease-in-out}');
    r.push(H + '__slide.on{opacity:1}');
    r.push(H + '__slide img{width:100%;height:100%;object-fit:cover;object-position:50% 25%}');
    r.push(H + '__slide--poster img{object-position:50% 0}');
    r.push(H + '__scrim{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;' +
      'background:linear-gradient(to top,' + PAGE + ' 0%,' + (tv ? 'rgba(16,16,20,.55)' : 'rgba(0,0,0,.55)') + ' 22%,rgba(0,0,0,0) 50%),linear-gradient(to right,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 55%),' +
      'linear-gradient(to bottom,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 18%)}');
    r.push(H + '__info{position:absolute;left:' + px(t.margin) + ';bottom:' + tp(70, 44) + ';width:' + px(t.descW) + ';transition:opacity .35s}');
    r.push(H + '__info.fade{opacity:0}');
    r.push(H + '__title{font-size:' + tp(70, 38) + ';line-height:1.05;font-weight:800;letter-spacing:-.02em;margin-bottom:' + tp(16, 10) + ';overflow-wrap:anywhere}');
    r.push(H + '__title.stv-tl-long{font-size:' + tp(50, 28) + '}' + H + '__title.stv-tl-xlong{font-size:' + tp(40, 22) + '}');
    r.push(H + '__title:not(.stv-has-logo){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}');
    r.push(H + '__title.stv-has-logo{font-size:0;line-height:0}');
    r.push(H + '__title .stv-logo{display:block;max-width:' + px(t.logoW) + ';max-height:' + px(t.logoH) + ';width:auto;height:auto;object-fit:contain;object-position:left bottom}');
    r.push(H + '__title:not(.stv-has-logo) .stv-logo{position:absolute;width:1px;height:1px;opacity:0}');
    r.push(H + '__meta{font-size:' + px(t.sub) + ';color:rgba(235,235,245,.75);font-weight:500;margin-bottom:' + tp(10, 6) + '}');
    r.push(H + '__meta .stv-badge{display:inline-block;border:1px solid rgba(255,255,255,.55);border-radius:.25em;padding:0 .3em;font-size:.82em;line-height:1.35;font-weight:600}');
    r.push(H + '__meta .stv-ua{border-color:#ffd500;color:#ffd500}');
    r.push(H + '__text{font-size:' + tp(25, 15) + ';line-height:1.35;color:rgba(235,235,245,.85);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-bottom:' + tp(24, 16) + '}');
    r.push(H + '__btns{display:flex;align-items:center}');
    r.push(H + '__btn{display:inline-flex;align-items:center;justify-content:center;height:' + px(t.btnH) + ';padding:0 ' + px(t.btnPad) + ';border-radius:' + px(t.btnH) + ';' +
      'background:#fff;color:#000;font-size:' + px(t.btnFont) + ';font-weight:600;margin-right:' + tp(22, 14) + ';transition:transform ' + t.dur + 'ms ' + ease + '}');
    r.push(H + '__btn svg{width:' + px(t.btnFont) + ';height:' + px(t.btnFont) + ';margin-right:' + px(10) + '}');
    r.push(H + '__btn--round{width:' + px(t.btnH) + ';padding:0;' + glass + 'color:#fff}');
    r.push(H + '__btn--round svg{margin:0}');
    if (tv) {
      r.push(H + '__btn{' + glass + 'color:#fff}');
      r.push(H + '__btn.focus{background:#fff;color:#000;transform:scale(1.06)}');
    } else r.push(H + '__btn:active{transform:scale(.95)}');
    r.push(H + '__dots{position:absolute;left:50%;bottom:' + tp(26, 16) + ';transform:translateX(-50%);display:flex;align-items:center;padding:' + tp(8, 5) + ' ' + tp(12, 8) + ';border-radius:' + px(20) + ';' + (tv ? glass : '') + '}');
    r.push(H + '__dot{width:' + px(t.dot) + ';height:' + px(t.dot) + ';border-radius:' + px(t.dot) + ';background:rgba(255,255,255,.4);margin:0 ' + px(t.dot * 0.6) + ';transition:width 300ms ' + ease + ',background .3s}');
    r.push(H + '__dot.on{width:' + px(t.dot * 3.4) + ';background:#fff}');
    // phones: centred like the card (last in the part: the general rules above must not override it)
    r.push(PHONE + H + '__info{left:' + px(t.margin) + '!important;right:' + px(t.margin) + '!important;width:auto!important;text-align:center}' +
      H + '__title .stv-logo{object-position:center bottom;margin:0 auto;max-width:78vw}' +
      H + '__btns{justify-content:center}' +
      H + '__scrim{background:linear-gradient(to top,' + PAGE + ' 0%,' + PAGE + ' 14%,rgba(0,0,0,.78) 34%,rgba(0,0,0,0) 62%),linear-gradient(to bottom,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 16%)}' +
      H + '__text{text-align:left}' +
      H + '__dots{bottom:' + px(10) + '}' +
      '}');
    return r.join('\n');
  }
  // ---- menus, dropdowns, settings (one glass panel style); plain buttons; Feed
  function cssPanels(c) {
    var t = c.t, B = c.B, glass = c.glass, ease = c.ease, tv = c.tv, hH = c.hH, r = [];
    var panelBg = L ? 'rgba(30,30,34,.97)' : 'rgba(30,30,34,.72)';
    var panelBlur = L ? '' : '-webkit-backdrop-filter:blur(40px) saturate(180%);backdrop-filter:blur(40px) saturate(180%);';
    var PN = B + ' .selectbox__content,' + B + ' .settings__content';
    r.push(PN + '{background:' + panelBg + ';' + panelBlur + 'border-radius:' + px(t.panelR) + ' 0 0 ' + px(t.panelR) + ';' + (L ? '' : 'box-shadow:-24px 0 60px rgba(0,0,0,.45),inset 1px 0 0 rgba(255,255,255,.08);') + '}');
    r.push(B + ' .selectbox__layer,' + B + ' .settings__layer{background:rgba(0,0,0,.45)}');
    r.push(B + ' .selectbox__head,' + B + ' .settings__head{padding:' + tp(36, 22) + ' ' + tp(40, 24) + ' ' + tp(16, 10) + '}');
    r.push(B + ' .selectbox__title,' + B + ' .settings__title{font-size:' + tp(38, 22) + ';font-weight:700;letter-spacing:-.01em}');
    var RW = B + ' .selectbox-item,' + B + ' .settings-folder,' + B + ' .settings-param';
    r.push(RW + '{margin:0 ' + tp(20, 12) + ' ' + tp(6, 3) + ';padding:' + tp(18, 11) + ' ' + tp(24, 14) + ';border-radius:' + px(t.rowR) + ';transition:transform ' + t.dur + 'ms ' + ease + ',background-color .15s}');
    r.push(B + ' .selectbox-item__title,' + B + ' .settings-folder__name,' + B + ' .settings-param__name{font-size:' + tp(29, 16) + ';font-weight:500;line-height:1.25}');
    r.push(B + ' .selectbox-item__subtitle,' + B + ' .settings-param__value,' + B + ' .settings-param__descr{font-size:' + tp(22, 13) + ';color:rgba(235,235,245,.6);opacity:1}');
    r.push(B + ' .settings-param__value{margin-top:.2em}');
    r.push(B + ' .settings-param-title{padding:' + tp(26, 16) + ' ' + tp(44, 26) + ' ' + tp(8, 5) + '}');
    r.push(B + ' .settings-param-title > span{font-size:' + tp(21, 12) + ';font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(235,235,245,.5)}');
    var FO = B + ' .selectbox-item.focus,' + B + ' .settings-folder.focus,' + B + ' .settings-param.focus';
    r.push(FO + '{background:#fff;color:#000' + (tv ? ';transform:scale(1.02)' : '') + '}');
    r.push(B + ' .selectbox-item.focus .selectbox-item__subtitle,' + B + ' .settings-param.focus .settings-param__value,' + B + ' .settings-param.focus .settings-param__descr{color:rgba(0,0,0,.6)}');
    // icons dark on the white focus: Lampa's own are drawn white and inverted; the plugins' draw in
    // currentColor, which the focus turns black — inverted again to white on white. White under the invert
    // makes both black. A menu's checkbox (drawn white) inverted too (as Lampa's glass style does both)
    var FI = ['settings-folder', 'settings-param', 'selectbox-item'].map(function (x) { return B + ' .' + x + '.focus .settings-folder__icon'; }).join(',');
    r.push(FI + '{color:#fff;-webkit-filter:invert(1);filter:invert(1)}');
    r.push(B + ' .selectbox-item.focus .selectbox-item__checkbox{-webkit-filter:invert(1);filter:invert(1)}');
    r.push(B + ' .selectbox-item.selected:not(.nomark)::after,' + B + ' .selectbox-item.picked::after{border-color:currentColor}');
    if (!tv) r.push(RW.split(',').map(function (x) { return x + ':active'; }).join(',') + '{background:rgba(255,255,255,.12)}');
    // the menu: a floating glass panel, the focused item a white capsule
    r.push(B + ' .wrap__left{background:none}');
    // Lampa gives the menu the column's full width: with our side margins it was wider than its column (iPad: a sideways scroll)
    r.push(B + ' .wrap__left .menu{width:auto!important}' + B + ' .wrap__left .scroll{overflow-x:hidden}');
    r.push(B + ' .wrap__left .menu{margin:' + tp(24, 14) + ' ' + tp(14, 10) + ';padding:' + tp(14, 8) + ' ' + tp(10, 6) + ';border-radius:' + px(t.panelR) + ';background:' + panelBg + ';' + panelBlur + '}');
    r.push(B + ' .menu__item{border-radius:' + px(40) + ';padding:' + tp(14, 9) + ' ' + tp(22, 14) + ';font-weight:500}');
    r.push(B + ' .menu__text{font-size:' + tp(27, 15) + '}');
    r.push(B + ' .menu__split{opacity:.25;margin:' + px(8) + ' ' + px(18) + '}');

    // a section page loads its next rows when scrolled to the end: wide rows are low, the first ones can
    // fit the phone's screen whole, with nothing to scroll and so no more rows ever (a dead page)
    // (Lampa measures the rows' body against the window: the body gets taller than the screen)
    r.push(B + '.stv-at-cat .activity--active .scroll:not(.scroll--horizontal) > .scroll__content > .scroll__body{min-height:' + (hH + 80) + 'px;min-height:calc(100vh + 80px)}');
    // Lampa's plain buttons (Feed «Смотреть», empty pages «Обновить», …): a capsule like the card's buttons
    r.push(B + ' .simple-button{display:inline-block;height:' + px(t.btnH) + ';line-height:' + px(t.btnH) + ';padding:0 ' + px(t.btnPad) + ';border-radius:' + px(t.btnH) + ';' +
      'background:rgba(255,255,255,.16);color:#fff;font-size:' + px(t.btnFont) + ';font-weight:600}');
    r.push(B + ' .simple-button.focus{background:#fff;color:#000}');
    if (!tv) r.push(B + ' .simple-button:active{background:rgba(255,255,255,.3)}');
    // Feed: the episode's art and poster rounded like the cards
    r.push(B + ' .feed-item img{border-radius:' + px(t.cardR) + '}');
    return r.join('\n');
  }
  // ---- search
  function cssSearch(c) {
    var t = c.t, B = c.B, tv = c.tv, glass = c.glass, MOVE = c.MOVE, r = [];
    // Apple (iOS / tvOS 26): the field is a glass capsule with a magnifier; recent searches are glass
    // capsules; the sources one segmented control (the chosen one white). Lampa's layout stays:
    // the field is .search__input on TVs (with Lampa's on-screen keyboard), the input of its keyboard
    // on touch screens; on TVs with voice input the mic is a round key before the field
    var MAG = 'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23ebebf5%27 stroke-opacity=%27.6%27 stroke-width=%272.4%27 stroke-linecap=%27round%27><circle cx=%2710.5%27 cy=%2710.5%27 r=%276.5%27/><path d=%27M15.5 15.5 21 21%27/></svg>")';
    var FH = tp(74, 46), IC = tp(30, 20), PL = tp(70, 44);
    var FIELD = 'height:' + FH + ';line-height:' + FH + ';border-radius:' + px(60) + ';' + glass + 'color:#fff;border:0;outline:0;box-sizing:border-box;' +
      'background-image:' + MAG + ';background-repeat:no-repeat;background-position:' + tp(26, 16) + ' 50%;background-size:' + IC + ' ' + IC + ';padding:0 ' + tp(28, 18) + ' 0 ' + PL;
    r.push(B + ' .search__input{' + FIELD + ';font-size:' + tp(34, 18) + ';font-weight:600;margin:0 ' + px(t.margin) + ' ' + tp(18, 12) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
    r.push(B + ' .simple-keyboard-input{' + FIELD + ';font-size:' + tp(30, 17) + ';font-weight:500;width:100%;-webkit-appearance:none;appearance:none}');
    // (Lampa pads and rounds its input with stronger rules: the capsule and the room for the magnifier must win)
    r.push(B + ' .search__keypad .simple-keyboard-input{padding-left:' + PL + '!important;border-radius:' + px(60) + '!important}');
    r.push(B + ' .simple-keyboard-input::placeholder{color:rgba(235,235,245,.5)}');
    r.push(B + ' .simple-keyboard-input.focus,' + B + ' .simple-keyboard-input:focus{box-shadow:0 0 0 ' + px(2) + ' rgba(255,255,255,.75)}');
    // voice input: the mic inside the capsule's right end
    r.push(B + ' .simple-keyboard--with-mic{display:flex;align-items:center}');
    r.push(B + ' .simple-keyboard--with-mic .simple-keyboard-input{padding-right:' + tp(90, 60) + '}');
    r.push(B + ' .simple-keyboard-mic{order:2;position:relative;z-index:1;width:' + tp(58, 36) + ';height:' + tp(58, 36) + ';margin:0 0 0 -' + tp(72, 46) + ';border-radius:50%;background:rgba(255,255,255,.12);color:#fff}');
    r.push(B + ' .simple-keyboard-mic.focus{background:#fff;color:#000}');
    r.push(B + ' .simple-keyboard-mic.record{background:#ff453a;color:#fff}');
    // Lampa's on-screen keyboard (TVs): its keys and sizes, rounder, a white focus
    r.push(B + ' .simple-keyboard .hg-button{border-radius:' + tp(12, 8) + '}');
    r.push(B + ' .simple-keyboard .hg-button.focus{background:#fff;color:#000}');
    // the keys with icons (mic, language, symbols): the icon dark on the white focus
    r.push(B + ' .simple-keyboard .hg-button.focus svg{color:#000;fill:currentColor}');
    r.push(B + ' .simple-keyboard .hg-button.focus img,' + B + ' .simple-keyboard .hg-button.focus:after{-webkit-filter:invert(1);filter:invert(1)}');   // (Lampa draws some as an :after picture)
    // recent searches: glass capsules as high and as large as the sources (Lampa makes them .8em on phones)
    r.push(B + ' .search-history-key{border-radius:' + px(40) + ';' + glass + 'padding:0 ' + tp(18, 12) + ';font-size:1em;' + MOVE + '}');
    r.push(B + ' .search-history-key > div{font-size:1.3em;padding:' + tp(8, 5) + ' .1em}');
    r.push(B + ' .search-history-key:before{opacity:.6}');
    r.push(B + ' .search-history-key.focus{background:#fff;color:#000}');
    r.push(B + ' .search-history-key.focus:before{-webkit-filter:invert(1);filter:invert(1);opacity:.8}');
    // the sources: one segmented control
    r.push(B + ' .search__sources .scroll__body{display:inline-flex!important;width:auto!important;padding:' + px(4) + ';border-radius:' + px(40) + ';' + glass + '}');
    r.push(B + ' .search-source{border-radius:' + px(40) + ';background:none;padding:' + tp(8, 5) + ' ' + tp(20, 14) + ';margin:0;font-weight:600;color:rgba(235,235,245,.75)}');
    r.push(B + ' .search-source.active{background:#fff;color:#000}');
    r.push(B + ' .search-source.focus{background:rgba(255,255,255,' + (tv ? '.3' : '.2') + ');color:#fff}');
    r.push(B + ' .search-source.active.focus{background:#fff;color:#000;box-shadow:0 0 0 ' + px(2) + ' rgba(255,255,255,.5)}');
    if (!tv) r.push(B + ' .search-source:active,' + B + ' .search-history-key:active{transform:scale(.96)}');
    return r.join('\n');
  }

  // ---- poster cards (catalogs, grids, search): Apple corners, quiet captions; People tiles
  function cssPosters(c) {
    var t = c.t, B = c.B, ease = c.ease, tv = c.tv, MOVE = c.MOVE, r = [];
    var PC = B + ' .card:not(.card--wide)';
    r.push(PC + ' .card__view{border-radius:' + px(t.cardR) + ';background:rgba(255,255,255,.07)}');
    // grids (Releases, History, Favourites, «See all», catalogs) as Home's rows: the same side margin and
    // gap, Apple's «See All» columns (phones 3, iPad 6, TVs 7) — a poster as wide as in a row
    // (Lampa's grid: 1em at the sides, .5em around each cell, its own columns by screen width)
    var GR = B + ' .mapping--grid', g2 = px(t.gutter / 2);
    r.push(GR + '{padding:0 ' + px(t.margin - t.gutter / 2) + '}');
    r.push(GR + ' > *{width:' + (100 / cols()).toFixed(4) + '%;padding:0 ' + g2 + ' ' + px(t.gutter) + ';box-sizing:border-box}');
    r.push(PHONE + GR + ' > *{width:33.3333%}}');
    r.push(PC + ' .card__img{border-radius:' + px(t.cardR) + '}');
    r.push(B + ' .card .card__view::after{display:none!important}');
    // Apple's posters: the art only (the title is printed on it); badges: UA and «new episode»
    r.push(PC + ' .card__view{margin-bottom:0}');
    r.push(PC + ' .card__age,' + PC + ' .card__vote,' + PC + ' .card__icons,' + PC + ' .card__marker,' + PC + ' .card-watched{display:none!important}');
    r.push(PC + ' .snack-ua{right:auto;left:' + tp(10, 6) + ';top:' + tp(10, 6) + ';font-size:' + tp(17, 10) + '}');
    // the title: tvOS shows it under the focused poster only (HIG: hidden until focus); touch screens have no
    // focus: there it shows while the finger is on the poster (the poster sinks a little, like the wide cards);
    // the «always» option shows every title
    r.push(PC + ' .card__title{position:absolute;left:0;right:0;top:100%;margin-top:' + tp(12, 7) + ';font-size:' + px(t.cap) + ';font-weight:600;line-height:1.25;' +
      'text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:none;' + (tv ? 'display:block;opacity:0;transition:opacity .15s}' : 'display:none}'));
    r.push(PC + (tv ? '.focus' : '.stv-on') + ' .card__title,' + B + '.stv-titles .card:not(.card--wide) .card__title{display:block;opacity:1}');
    if (!tv) r.push(PC + '.stv-press .card__view{transform:scale(.96)}' + PC + ' .card__view{' + MOVE + '}');
    // grids: room under each poster for the title (a grid cell has Lampa's own bottom padding: the title sits
    // in it, just under the poster); rows: room under the posters with «always»
    var GC = [B + ' .mapping--grid > .card:not(.card--wide)', B + ' .category-full .card:not(.card--wide)'], GP = tv ? 66 : 40;
    r.push(GC.join(',') + '{padding-bottom:' + px(GP) + '!important}');
    r.push(GC.map(function (x) { return x + ' .card__title'; }).join(',') + '{top:auto;bottom:' + px(GP - (tv ? 12 : 7) - Math.round(t.cap * 1.25)) + ';margin-top:0;left:.5em;right:.5em}');
    if (tv) r.push(B + '.stv-titles .items-line .card:not(.card--wide){margin-bottom:' + px(Math.round(t.cap * 1.25) + 14) + '}');
    r.push(PC + '{transition:transform ' + t.dur + 'ms ' + ease + '}');
    if (tv) {
      r.push(PC + '.focus{transform:scale(1.07);z-index:2}');
      r.push(PC + '.focus .card__view{box-shadow:0 0 0 ' + px(3) + ' rgba(255,255,255,.8)' + (L ? '' : ',0 22px 44px rgba(0,0,0,.55)') + '}');
    }
    r.push(B + ' .card-more__box{border-radius:' + px(t.cardR) + ';background:rgba(118,118,128,.2)}');
    // People: round portraits in a grid (phones 3, iPad 6, TVs 8 a row), the name and «known for» under them
    var PP = B + ' .stv-people .mapping--grid > .card';
    r.push(B + ' .stv-people .mapping--grid > *{width:' + (tv ? '12.5%' : '16.666%') + '}');
    r.push(PHONE + B + ' .stv-people .mapping--grid > *{width:33.333%}}');
    r.push(PP + '{padding-bottom:' + tp(30, 18) + '!important;text-align:center}');
    r.push(PP + ' .card__view{padding-bottom:100%;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.08);' + MOVE + '}');
    r.push(PP + ' .card__img{border-radius:50%;object-position:50% 20%}');
    r.push(PP + ' .card__title{display:block!important;position:static;opacity:1;margin-top:' + tp(14, 8) + ';font-size:' + px(t.cap + 2) + ';font-weight:600;line-height:1.25;' +
      'text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:none;left:auto;right:auto;top:auto;bottom:auto}');
    r.push(PP + ' .stv-known{font-size:' + px(t.cap2) + ';line-height:1.3;color:rgba(235,235,245,.55);margin-top:.2em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}');
    if (tv) {
      r.push(PP + '.focus{transform:none}');
      r.push(PP + '.focus .card__view{transform:scale(1.07);box-shadow:0 0 0 ' + px(3) + ' #fff' + (L ? '' : ',0 18px 36px rgba(0,0,0,.5)') + '}');
    } else r.push(PP + ':active .card__view{transform:scale(.95)}');
    // People: the person's tile — a round portrait over «All titles», no grey box
    var PT = B + '.stv-at-person .card-more--first .card-more__box';
    r.push(PT + '{background:none;display:flex;flex-direction:column;align-items:center;justify-content:center}');
    r.push(PT + ' .stv-pphoto{width:86%;padding-top:86%;border-radius:50%;background:rgba(255,255,255,.1) center 20%/cover no-repeat;margin-bottom:' + tp(16, 10) + ';transition:transform ' + t.dur + 'ms ' + ease + '}');
    r.push(PT + ' .card-more__title{position:static;transform:none;font-size:' + px(t.sub) + ';font-weight:600;color:rgba(235,235,245,.7);text-align:center}');
    r.push(PT + ' .card-more__title:after{content:" \u203A"}');
    if (tv) {
      var PF = B + '.stv-at-person .card-more--first.focus';
      r.push(PF + ' .card-more__box{background:none;color:#fff;border:0;box-shadow:none}');
      r.push(PF + ' .card-more__box:after,' + PF + ':after{display:none}');
      r.push(PT + ' .stv-pphoto{margin-bottom:' + px(26) + '}');
      r.push(PF + ' .card-more__box .stv-pphoto{transform:scale(1.07);box-shadow:0 0 0 ' + px(3) + ' #fff}');
    }
    if (!tv) r.push(PT.replace(' .card-more__box', ':active .stv-pphoto') + '{transform:scale(.96)}');
    if (tv) r.push(B + ' .card-more.focus .card-more__box{background:#fff;color:#000}');
    return r.join('\n');
  }
  // ---- bars: iPad's tab capsule at the top, the TV header while scrolled
  // ---- the person page: Apple's header (a blurred band, the round portrait, the name, the biography)
  function cssPerson(c) {
    var t = c.t, B = c.B, tv = c.tv, glass = c.glass, PAGE = c.PAGE, r = [];
    var P = B + ' .stv-person .stv-pstart', D = tv ? 230 : 170;
    // the header sits in a row of Lampa's (its side padding, a rounded box): the band goes edge to edge
    r.push(B + ' .stv-person .items-line:first-child .scroll--horizontal .scroll__content{padding:0}');
    r.push(B + ' .stv-person .items-line:first-child .scroll__body{display:block;width:100%}');
    r.push(P + '{position:relative;width:100%;box-sizing:border-box;padding:' + tp(120, 76) + ' ' + px(t.margin) + ' ' + tp(36, 24) + ';margin:0;' +
      'border-radius:0;background:none;overflow:hidden}');
    // the band: the portrait blurred across the width, fading into the page
    r.push(P + ' .stv-pband{position:absolute;left:0;right:0;top:0;height:100%;z-index:0;background-size:cover;background-position:50% 30%;' +
      (L ? 'opacity:.35' : '-webkit-filter:blur(' + px(40) + ') saturate(1.6) brightness(.6);filter:blur(' + px(40) + ') saturate(1.6) brightness(.6);transform:scale(1.2)') + '}');
    r.push(P + ':after{content:"";position:absolute;left:0;right:0;bottom:0;height:45%;z-index:0;background:linear-gradient(to bottom,rgba(0,0,0,0),' + PAGE + ')}');
    r.push(P + ' .person-start__body{position:relative;z-index:1;display:flex;align-items:center;padding:0;margin:0}');
    r.push(P + ' .person-start__right{flex:0 0 auto;width:auto;margin:0 ' + tp(48, 32) + ' 0 0;padding:0}');
    r.push(P + ' .person-start__poster{width:' + px(D) + ';height:' + px(D) + ';padding:0;border-radius:50%;overflow:hidden;box-shadow:0 ' + px(10) + ' ' + px(24) + ' rgba(0,0,0,.35)}');
    r.push(P + ' .person-start__poster:before{display:none}');
    r.push(P + ' .person-start__img{position:static;width:100%;height:100%;object-fit:cover;object-position:50% 20%;border-radius:50%}');
    r.push(P + ' .person-start__left{flex:1 1 auto;min-width:0;padding:0;max-width:' + px(t.descW + 200) + '}');
    r.push(P + ' .person-start__tags,' + P + ' .person-start__place,' + P + ' .person-start__descr-mobile{display:none}');
    r.push(P + ' .person-start__name{font-size:' + tp(56, 34) + ';font-weight:700;line-height:1.15;letter-spacing:-.01em;margin:0 0 ' + tp(14, 10) + '}');
    r.push(P + ' .stv-pbio{font-size:' + px(t.sub) + ';line-height:1.4;color:rgba(235,235,245,.85);max-width:none;margin-bottom:' + tp(20, 14) + '}');
    r.push(P + ' .stv-pbio .stv-desc__text{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;white-space:normal}');
    r.push(P + ' .stv-pbio.open .stv-desc__text{-webkit-line-clamp:unset;display:block}');
    r.push(P + ' .stv-pbio .stv-desc__more{display:inline-block;margin-top:.3em;font-weight:700;color:#fff;text-transform:uppercase;font-size:.8em;letter-spacing:.04em}');
    r.push(P + ' .stv-pbio:not(.long) .stv-desc__more{display:none}');
    r.push(P + ' .person-start__bottom{margin:0;display:flex;align-items:center}');
    r.push(P + ' .person-start__bottom .full-start__button{height:' + px(t.btnH * 0.8) + ';border-radius:' + px(t.btnH) + ';padding:0 ' + px(t.btnPad * 0.7) + ';margin:0 ' + px(12) + ' 0 0;' + glass + 'color:#fff;font-size:' + px(t.btnFont * 0.85) + '}');
    r.push(P + ' .person-start__bottom .full-start__button.focus{background:#fff;color:#000}');
    // the info button: the biography is on the page already
    r.push(P + ' .person-start__bottom .button--info{display:none}');
    // phones: one column, centred (as Apple's)
    r.push(PHONE + P + ' .person-start__body{flex-direction:column;text-align:center}' + P + ' .person-start__right{margin:0 0 ' + px(16) + '}' +
      P + ' .person-start__bottom{justify-content:center}' + P + ' .stv-pbio{text-align:left}}');
    return r.join('\n');
  }
  // ---- the schedule: a title, days with a grid of episode cards; or an empty state that says how to fill it
  function cssSchedule(c) {
    var t = c.t, B = c.B, tv = c.tv, glass = c.glass, S = B + ' .stv-tt', g = px(t.gutter), r = [];
    r.push(S + '__body{padding:' + tp(30, 12) + ' ' + px(t.margin) + ' ' + tp(80, 48) + '}');
    r.push(S + '__title{font-size:' + tp(56, 34) + ';font-weight:700;letter-spacing:-.01em;line-height:1.15}');
    r.push(S + '__sub{font-size:' + px(t.sub) + ';color:rgba(235,235,245,.6);margin-top:' + px(6) + '}');
    r.push(S + '__day{font-size:' + px(t.title) + ';font-weight:' + t.titleW + ';margin:' + tp(50, 30) + ' 0 ' + tp(20, 12) + '}');
    r.push(S + '__day span{font-weight:400;color:rgba(235,235,245,.55);margin-left:.5em}');
    // Apple's «See All» of episodes: 4 across on TVs, 3 on iPad, 1 on phones
    r.push(S + '__grid{display:flex;flex-wrap:wrap;margin-right:-' + g + '}');
    r.push(S + '__grid .stv-ep{width:calc(' + (tv ? 25 : 33.3333) + '% - ' + g + ');margin:0 ' + g + ' ' + g + ' 0}');
    r.push(PHONE + S + '__grid .stv-ep{width:calc(100% - ' + g + ')}}');
    // empty: an icon, what the page is for, how to fill it
    r.push(S + '__empty{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:' + tp(900, 520) + ';margin:' + tp(110, 64) + ' auto 0}');
    r.push(S + '__icon{width:' + tp(96, 64) + ';height:' + tp(96, 64) + ';color:rgba(235,235,245,.45);margin-bottom:' + tp(24, 16) + '}');
    r.push(S + '__icon svg{width:100%;height:100%}');
    r.push(S + '__etitle{font-size:' + tp(38, 22) + ';font-weight:700;margin-bottom:' + tp(14, 8) + '}');
    r.push(S + '__etext{font-size:' + px(t.sub) + ';line-height:1.45;color:rgba(235,235,245,.65)}');
    r.push(S + '__btn{display:inline-flex;align-items:center;height:' + px(t.btnH * 0.8) + ';padding:0 ' + px(t.btnPad * 0.8) + ';margin-top:' + tp(32, 22) + ';border-radius:' + px(t.btnH) + ';' +
      glass + 'color:#fff;font-size:' + px(t.btnFont * 0.85) + ';font-weight:600;cursor:pointer}');
    r.push(S + '__btn.focus{background:#fff;color:#000}');
    if (!tv) r.push(S + '__btn:active{transform:scale(.97)}');
    return r.join('\n');
  }
  // ---- Lampa's «Торренты» page: a header strip (poster, title, year), the filter as chips, the releases
  // as Apple's list rows (see torRow)
  function cssTorrents(c) {
    var t = c.t, B = c.B, glass = c.glass, tv = c.tv, MOVE = c.MOVE, r = [];
    var P = B + ' .stv-torp', X = P + ' .explorer', M = px(t.margin), FADE = ',background-color .15s,color .15s';
    // one column: the strip, the chips, the list
    r.push(X + '{display:flex;flex-direction:column;height:100%}');
    r.push(X + '__left{display:block!important;width:auto!important;flex:none;padding:0 ' + M + '}');
    r.push(X + '__left > .scroll{height:auto!important}');
    r.push(X + '__left .scroll__content{padding:0!important}');
    r.push(X + '__files{flex:1;width:auto!important;min-width:0;padding:0}');
    r.push(X + '-card{position:relative;display:flex;flex-direction:column;min-height:' + tp(150, 96) + ';padding:' + tp(110, 80) + ' 0 ' + tp(20, 14) + ' ' + tp(124, 80) + '}');
    r.push(X + '-card__head{order:2;display:block;margin:0}');
    r.push(X + '-card__body{order:1;margin:0;padding:0}');
    r.push(X + '-card__head-left{position:absolute;left:0;bottom:' + tp(20, 14) + ';margin:0}');
    r.push(X + '-card__head-img{width:' + tp(100, 64) + ';height:' + tp(150, 96) + ';border-radius:' + px(t.cardR * 0.6) + ';overflow:hidden;margin:0}');
    r.push(X + '-card__head-img img{width:100%;height:100%;object-fit:cover;border-radius:0}');
    r.push(X + '-card__head-body{display:flex;align-items:center;flex-wrap:wrap;font-size:' + px(t.sub) + ';color:rgba(235,235,245,.7);margin:' + tp(6, 4) + ' 0 0;padding:0}');
    r.push(X + '-card__head-body > div{margin:0 ' + tp(14, 10) + ' 0 0;padding:0;font-size:1em}');
    r.push(X + '-card__head-rate{display:flex;align-items:center}' + X + '-card__head-rate svg{width:.9em;height:.9em;margin-right:.25em}');
    r.push(X + '-card__head-age{border:1px solid rgba(255,255,255,.5);border-radius:.25em;padding:0 .3em!important;font-size:.85em!important;line-height:1.35}');
    r.push(X + '-card__title{font-size:' + tp(48, 28) + ';font-weight:700;letter-spacing:-.01em;line-height:1.1;margin:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}');
    r.push(X + '-card__genres,' + X + '-card__descr{display:none}');
    // the chips: search, sort, filter, 4K / 1080p / UKR
    r.push(X + '__files-head{padding:0 0 ' + tp(10, 6) + '}');
    r.push(X + '__files-body .scroll__content{padding-top:' + tp(10, 6) + '!important}');
    // no fade at the list's top edge (Lampa's scroll mask): the first row in focus looked grey there
    r.push(X + '__files-body .scroll--mask{-webkit-mask-image:none;mask-image:none}');
    r.push(X + '__files-head .scroll__body{padding:' + tp(12, 6) + ' ' + M + '}');
    r.push(P + ' .torrent-filter{display:flex;align-items:center;margin:0;padding:0}');
    r.push(P + ' .torrent-filter .simple-button{display:inline-flex;align-items:center;height:' + tp(52, 34) + ';padding:0 ' + tp(26, 16) + ';margin:0 ' + tp(16, 10) + ' 0 0;' +
      'border-radius:' + px(40) + ';font-size:' + tp(25, 15) + ';font-weight:500;color:#fff;white-space:nowrap;flex-shrink:0;border:0;' + glass + MOVE + FADE + '}');
    // (Lampa's glass style paints its buttons with !important)
    r.push(P + ' .torrent-filter .simple-button{background-color:' + c.G + '!important}');
    r.push(P + ' .torrent-filter .simple-button > span{color:#fff;margin:0}');
    r.push(P + ' .torrent-filter .simple-button > div{background:none!important;border:0;padding:0;margin:0 0 0 .4em;font-size:1em;color:rgba(235,235,245,.6);max-width:' + tp(320, 200) + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap}');
    r.push(P + ' .torrent-filter .simple-button > div.hide{display:none}');
    r.push(P + ' .torrent-filter .simple-button > svg{width:1em;height:1em;flex-shrink:0}');
    r.push(P + ' .torrent-filter .filter--back,' + P + ' .torrent-filter .filter--search:not(.stv-has-q){width:' + tp(52, 34) + ';padding:0;justify-content:center}');
    r.push(P + ' .torrent-filter .filter--search:not(.stv-has-q) > div{display:none}');
    r.push(P + ' .torrent-filter .filter--back svg{width:.8em;height:.8em}');
    r.push(P + ' .torrent-filter .simple-button.stv-tq--on{background-color:#fff!important;color:#000;font-weight:600;box-shadow:none}');
    if (tv) r.push(P + ' .torrent-filter .simple-button.focus{background-color:#fff!important;color:#000;transform:scale(1.08);box-shadow:' + (L ? 'none' : '0 10px 24px rgba(0,0,0,.45)') + '}' +
      P + ' .torrent-filter .simple-button.focus > span,' + P + ' .torrent-filter .simple-button.focus > div{color:#000}' + P + ' .torrent-filter .simple-button.stv-tq--on:not(.focus){background-color:rgba(255,255,255,.85)!important}');
    else r.push(P + ' .torrent-filter .simple-button.focus{box-shadow:none}' + P + ' .torrent-filter .simple-button:active{transform:scale(.95)}');
    // the list
    r.push(P + ' .torrent-list{padding:' + tp(8, 4) + ' ' + M + ' ' + tp(60, 40) + '}');
    var ROW = 'margin:0 0 ' + tp(14, 10) + ';padding:' + tp(22, 14) + ' ' + tp(28, 18) + ';border-radius:' + px(t.rowR) + ';background:rgba(255,255,255,.07);border:0;' + MOVE + FADE;
    r.push(P + ' .watched-history{display:flex;align-items:center;' + ROW + ';font-size:' + tp(24, 15) + ';color:rgba(235,235,245,.7)}');
    r.push(P + ' .watched-history__icon{width:' + tp(30, 20) + ';height:' + tp(30, 20) + ';margin-right:' + tp(16, 10) + ';opacity:.7}' + P + ' .watched-history__icon svg{width:100%;height:100%}');
    r.push(P + ' .torrent-item{position:relative;' + ROW + '}');
    r.push(P + ' .torrent-item.stv-tor-on > .torrent-item__title,' + P + ' .torrent-item.stv-tor-on > .torrent-item__ffprobe,' + P + ' .torrent-item.stv-tor-on > .torrent-item__details{display:none}');
    r.push(B + ' .stv-tor{display:flex;align-items:center}');
    r.push(B + ' .stv-tor__l{flex:1;min-width:0}');
    r.push(B + ' .stv-tor__top{display:flex;align-items:center;min-width:0}');
    r.push(B + ' .stv-tor__q{flex-shrink:0;display:inline-block;border:1px solid rgba(255,255,255,.6);border-radius:.3em;padding:0 .35em;margin-right:.45em;font-size:' + px(t.cap2) + ';font-weight:700;line-height:1.5;letter-spacing:.02em}');
    r.push(B + ' .stv-tor__q--hi{background:#fff;color:#000;border-color:#fff}');
    r.push(B + ' .stv-tor__name{font-size:' + tp(28, 16) + ';font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}');
    r.push(B + ' .stv-tor__sub{font-size:' + tp(23, 14) + ';color:rgba(235,235,245,.72);margin-top:' + tp(6, 4) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
    r.push(B + ' .stv-tor__meta{font-size:' + px(t.cap2) + ';color:rgba(235,235,245,.5);margin-top:' + tp(4, 3) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
    r.push(B + ' .stv-tor__r{flex-shrink:0;text-align:right;margin-left:' + tp(28, 16) + '}');
    r.push(B + ' .stv-tor__size{font-size:' + tp(28, 16) + ';font-weight:600;white-space:nowrap}');
    r.push(B + ' .stv-tor__seeds{font-size:' + tp(23, 14) + ';font-weight:600;color:#30d158;margin-top:' + tp(6, 4) + ';white-space:nowrap}');
    r.push(B + ' .stv-tor__seeds--none{color:rgba(235,235,245,.4)}');
    r.push(P + ' .stv-tor__top .torrent-item__viewed{position:static;flex-shrink:0;display:inline-block;vertical-align:middle;margin-left:.4em;width:' + tp(26, 18) + ';height:' + tp(26, 18) + ';opacity:.8}');
    // a mark Lampa adds later (after a play, or «mark» in the long-press menu) goes into the top line
    // (torViewed); until then, or without a MutationObserver: small in the row's corner, not a line of its own
    r.push(P + ' .torrent-item.stv-tor-on > .torrent-item__viewed{position:absolute;left:' + tp(8, 5) + ';top:' + tp(8, 5) + ';width:' + tp(18, 13) + ';height:' + tp(18, 13) + ';margin:0;opacity:.8}');
    if (tv) {
      r.push(P + ' .torrent-item.focus,' + P + ' .watched-history.focus{background:#fff!important;background-image:none!important;color:#000;transform:scale(1.02);box-shadow:' + (L ? 'none' : '0 14px 30px rgba(0,0,0,.5)') + '}');
      r.push(P + ' .torrent-item.focus .stv-tor__sub,' + P + ' .torrent-item.focus .stv-tor__meta,' + P + ' .watched-history.focus{color:rgba(0,0,0,.65)}');
      r.push(P + ' .torrent-item.focus .stv-tor__q{border-color:rgba(0,0,0,.6)}' + P + ' .torrent-item.focus .stv-tor__q--hi{background:#000;color:#fff;border-color:#000}');
      r.push(P + ' .torrent-item.focus .stv-tor__seeds{color:#1a7f37}' + P + ' .torrent-item.focus .stv-tor__seeds--none{color:rgba(0,0,0,.4)}');
      r.push(P + ' .torrent-item.focus:after,' + P + ' .torrent-item.focus:before,' + P + ' .watched-history.focus:after,' + P + ' .watched-history.focus:before{display:none}');
    } else {
      r.push(P + ' .torrent-item.focus,' + P + ' .watched-history.focus{background:rgba(255,255,255,.07);box-shadow:none}');
      r.push(P + ' .torrent-item:active,' + P + ' .watched-history:active{transform:scale(.98);background:rgba(255,255,255,.12)}');
    }
    // the files of a release (Lampa's window after a tap): the same rows
    r.push(B + ' .torrent-file,' + B + ' .torrent-serial{' + ROW + '}');
    r.push(B + ' .torrent-file__title,' + B + ' .torrent-serial__title{font-size:' + tp(26, 15) + ';font-weight:600}');
    r.push(B + ' .torrent-file__size,' + B + ' .torrent-serial__size,' + B + ' .torrent-serial__line{font-size:' + tp(22, 13) + ';color:rgba(235,235,245,.6)}');
    r.push(B + ' .torrent-serial__img{border-radius:' + px(t.cardR * 0.6) + '}');
    if (tv) r.push(B + ' .torrent-file.focus,' + B + ' .torrent-serial.focus{background:#fff;color:#000}' + B + ' .torrent-file.focus .torrent-file__size,' + B + ' .torrent-serial.focus .torrent-serial__size,' + B + ' .torrent-serial.focus .torrent-serial__line{color:rgba(0,0,0,.6)}');
    return r.join('\n');
  }
  function cssBars(c) {
    var B = c.B, glass = c.glass, tv = c.tv, r = [];
    // the profiles button of the server's syncpro plugin draws an emoji (👤): TVs without an emoji
    // font show a box. The same person drawn as an icon instead
    var PERSON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z'/%3E%3C/svg%3E\")";
    r.push(B + ' .open--syncpro-profile > span{font-size:0!important;width:' + tp(44, 30) + '!important;height:' + tp(44, 30) + '!important;background-image:' + PERSON + '!important;background-repeat:no-repeat!important;background-position:center!important;background-size:60%!important}');   // (!important: its own inline style; the em size went with the font)
    if (!tv) {
      var NB = B + ' .navigation-bar';
      // 0 wide and 0 high: in landscape Lampa moves its bar to the right edge and takes the bar's width off
      // the page (a bar across the screen left the pages 0 wide: everything gone after turning the phone)
      r.push(NB + ',' + B + '.orientation--landscape .navigation-bar{top:0;bottom:auto;left:50%;right:auto;width:0;min-width:0;height:0;padding:0;border:0;display:block;overflow:visible;z-index:16}');
      // a row in landscape too: Lampa stacks the phone's landscape bar in a column (stronger selector than NB's)
      // on the header's middle line: Lampa centres its menu button and circles in a header 0.5em + 3em +
      // 0.5em high (its middle 2em down); the pill is 36 + 2 × 4 high
      var midTop = 2 * c.t.base - (36 + 2 * 4) / 2;
      r.push(NB + ' .navigation-bar__body,' + B + '.orientation--landscape .navigation-bar .navigation-bar__body{position:absolute;top:' + px(midTop) + ';left:0;width:auto;height:auto;white-space:nowrap;transform:translateX(-50%);flex-direction:row;padding:' + px(4) + ';border-radius:' + px(40) + ';' + glass + '}');
      r.push(NB + ' .navigation-bar__item{display:flex;align-items:center;height:' + px(36) + ';padding:0 ' + px(16) + ';margin:0 ' + px(1) + ';border-radius:' + px(40) + ';color:rgba(235,235,245,.72);cursor:pointer}');
      r.push(NB + ' .navigation-bar__icon{width:' + px(18) + ';height:' + px(18) + ';margin:0}');
      r.push(NB + ' .navigation-bar__label{font-size:' + px(15) + ';font-weight:600;margin:0}');
      r.push(NB + ' .navigation-bar__item[data-action=main] .navigation-bar__icon,' + NB + ' .navigation-bar__item[data-action=settings] .navigation-bar__icon{display:none}');
      r.push(NB + ' .navigation-bar__item[data-action=search] .navigation-bar__label,' + NB + ' .navigation-bar__item[data-action=back] .navigation-bar__label{display:none}');
      r.push(NB + ' .navigation-bar__item[data-action=back]{order:-1;padding:0 ' + px(11) + '}');
      r.push(NB + ' .navigation-bar__item[data-action=search]{order:9;padding:0 ' + px(11) + '}');
      r.push(B + '.stv-at-main:not(.settings--open):not(.search--open) .navigation-bar__item[data-action=main],' + B + '.settings--open .navigation-bar__item[data-action=settings],' + B + '.search--open .navigation-bar__item[data-action=search]{background:rgba(255,255,255,.2);color:#fff}');
      r.push(NB + ' .navigation-bar__item:active{background:rgba(255,255,255,.28)}');
    }
    // TVs: the header's circles step aside while the page is scrolled (Apple keeps the top clear)
    if (tv) r.push(B + '.stv-scrolled .head__actions{opacity:0;transition:opacity .25s}');
    return r.join('\n');
  }

  // ---------- the theme on / off ----------
  var styleEl = null, styleKey = '', started = false;
  function bodyClasses(on) {
    var b = document.body.classList, list = ['stv', 'stv--ipad', 'stv--tv', 'stv--lite', 'stv-react', 'stv-tech', 'stv-shots', 'stv-head', 'stv-noplay', 'stv-titles'];
    list.forEach(function (c) { b.remove(c); });
    if (!on) return;
    b.add('stv'); b.add('stv--' + M);
    if (L) b.add('stv--lite');
    if (!opt(K.react)) b.add('stv-react');
    if (!opt(K.tech)) b.add('stv-tech');
    if (!opt(K.shots)) b.add('stv-shots');
    if (opt(K.head)) b.add('stv-head');
    if (opt(K.titles)) b.add('stv-titles');
    if (noPlay()) b.add('stv-noplay');
    askServer();
  }
  // Lampa's own «Watch» is hidden (unless the viewer wants it) only while Autopilot has a server: without
  // one (stock Lampa) it is the way into the viewer's other online plugins. apBase: Autopilot's answer,
  // null = not known yet (hidden, as with a server: no flash in the usual case), '' = none
  var apBase = null;
  function apHasServer() { return !!window.alc_auto_api && apBase !== ''; }
  function noPlay() { return !opt(K.play) && apHasServer(); }
  function askServer() {
    if (typeof window.alc_auto_server !== 'function') return;   // an older Autopilot: as before
    try {
      window.alc_auto_server(function (b) {
        b = b || '';
        if (b === apBase) return;
        apBase = b;
        if (!themeOn()) return;
        document.body.classList.toggle('stv-noplay', noPlay());
        // the card open now: Lampa's Play comes out of «⋯» (no server) or goes back into it
        try { var a = Lampa.Activity.active(); if (a && a.component === 'full' && a.activity) markButtons(a.activity.render()); } catch (e) {}
      });
    } catch (e) {}
  }
  function measure() {
    M = mode(); L = lite();
    var f = parseFloat(window.getComputedStyle(document.body).fontSize) || T[M].base;
    k = f / T[M].base;
  }
  function themeWanted() { return !!opt(K.on); }
  function apply() {
    var on = themeWanted();
    measure();
    bodyClasses(on);
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'snack-tv-css'; document.head.appendChild(styleEl); }
    // css() depends on the look, the scale and the screen height only: settings that switch body
    // classes (and resize_end without a size change) leave the sheet as it is
    var key = on ? [M, L, k, window.innerHeight, BASE].join('|') : '';
    if (key !== styleKey) { styleKey = key; styleEl.textContent = on ? css() : ''; }
    if (!on) document.body.classList.remove('stv-float-head'); else floatHead();
    try { if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update(); } catch (e) {}
  }
  function themeOn() { return document.body.classList.contains('stv'); }
  function guard(fn) { return function (e) { try { if (themeOn()) fn(e); } catch (x) { log(x && x.message); } }; }
  // ================= full card =================
  function metaLine(m, render) {
    var parts = [], serial = kindOf(m) === 'tv';
    parts.push('<span>' + esc(kindLabel(m)) + '</span>');
    (m.genres || []).slice(0, 2).forEach(function (g) { if (g && g.name) parts.push('<span>' + esc(capFirst(g.name)) + '</span>'); });
    var y = yearOf(m); if (y) parts.push('<span>' + esc(y) + '</span>');
    if (serial && m.number_of_seasons) parts.push('<span>' + esc(tr('seasons_n', m.number_of_seasons)) + '</span>');
    else if (!serial && m.runtime) parts.push('<span>' + esc(runtimeText(m.runtime)) + '</span>');
    var pg = render.find('.full-start__pg').first().text().trim();
    if (pg) parts.push('<span><span class="stv-badge">' + esc(pg) + '</span></span>');
    if (hasUa(m)) parts.push('<span class="stv-ua"><span class="stv-badge">UA</span></span>');
    return '<div class="stv-meta">' + parts.join('') + '</div>';
  }
  function descBlock(m) {
    var text = plainText(m.overview);
    if (!text) return null;
    var el = $('<div class="stv-desc"><div class="stv-desc__text"></div><div class="stv-desc__more"></div></div>');
    el.find('.stv-desc__text').text(text);
    el.find('.stv-desc__more').text(tr('more'));
    if (text.length > (M === 'tv' ? 220 : 180)) el.addClass('long');
    el.on('click', function () { el.toggleClass('open'); el.find('.stv-desc__more').text(el.hasClass('open') ? tr('less') : tr('more')); });
    return el;
  }
  // ---- the card's buttons, Apple's row: the white capsule (Autopilot's, else Lampa's Play), then round
  // buttons always in this order - Trailer, Favourites, Torrents, Subscribe (the pack's bell; Lampa's
  // CUB one when the bell is not there), «⋯». What is missing is left out. Everything else on the card
  // (Lampa's Play beside Autopilot, reactions, Shots, the CUB subscribe beside the bell, other plugins'
  // buttons) goes into «⋯»: Lampa's own «⋯» list (its «options» event), or ours on a Lampa without it.
  // No labels under the round buttons: TVs show the focused one's name, touch a long press (tipFor)
  var ROW = ['.button--alc-trailer', '.button--book', '.button--alc-torrent'];
  var DOTS = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>';
  function markButtons(render) {
    document.body.classList.toggle('stv-noplay', noPlay());
    var box = render.find('.full-start-new__buttons').first();
    if (!box.length) return;
    var all = box.children('.full-start__button');
    all.removeClass('stv-primary stv-more');
    // the remote skips what «⋯» holds (Lampa focuses the first .selector, hidden or not)
    all.each(function () { if (this.stv_unsel) { this.stv_unsel = false; this.classList.add('selector'); } });
    var main = box.children('.button--alc-auto:not(.hide)').first();
    if (!main.length) main = box.children('.button--priority:not(.hide)').first();
    if (!main.length) main = box.children('.button--play:not(.hide)').first();
    main.addClass('stv-primary');
    var sp = main.children('span')[0];
    if (sp && /S\d+E\d+/.test(sp.textContent)) sp.textContent = se(sp.textContent);
    var row = [];
    var add = function (sel) { var x = box.children(sel).not('.hide').not(main)[0]; if (x && row.indexOf(x) < 0) row.push(x); return !!x; };
    if (main.length) row.push(main[0]);
    // Lampa's own Play beside Autopilot's: in «⋯» only while Autopilot has a server and the viewer did
    // not ask for it (the setting); otherwise in the row (the way into the other online plugins)
    if (!noPlay()) add('.button--play');
    ROW.forEach(add);
    if (!add('.button--snack-sub')) add('.button--subscribe');
    var more = moreButton(box);
    row.push(more[0]);
    all = box.children('.full-start__button');
    all.each(function () {
      if (row.indexOf(this) >= 0) return;
      this.classList.add('stv-more');
      if (this.classList.contains('selector')) { this.stv_unsel = true; this.classList.remove('selector'); }
    });
    // the row first, in its order: the order on screen is the order of the remote (moved only when it differs)
    var now = all.get().slice(0, row.length);
    if (now.some(function (x, i) { return x !== row[i]; })) for (var i = row.length - 1; i >= 0; i--) box.prepend(row[i]);
    if (M !== 'tv') row.forEach(function (x) { if (x !== main[0]) tipFor(x); });
    // the moves above are ours: not a reason for the observer (themeFull) to run this again
    if (box[0].stv_obs) box[0].stv_obs.takeRecords();
  }
  // a button's name: its label, else the hidden ones' known names
  function buttonName(el) {
    var t = $(el).children('span').text().trim() || $(el).text().trim() || el.getAttribute('title') || '';
    if (!t && el.classList.contains('button--reaction')) t = tr('h_react');
    if (!t && el.classList.contains('button--stv-more')) t = tr('b_more');
    return t;
  }
  // «⋯»: Lampa's own (its list is built by the «options» event: moreItems adds the hidden buttons), else
  // ours with the same list. The label (TVs show it under the focused button) is ours
  function moreButton(box) {
    var b = box.children('.button--options').first();
    if (!b.length) b = box.children('.button--stv-more').first();
    if (!b.length) b = newMoreButton(box);
    if (!b.children('span').length) b.append('<span></span>');
    b.children('span').text(tr('b_more'));
    return b;
  }
  function newMoreButton(box) {
    var b = $('<div class="full-start__button selector button--stv-more">' + DOTS + '</div>');
    b.on('hover:enter', function () {
      var ctl = Lampa.Controller.enabled().name, items = moreItems(box, ctl);
      if (!items.length) return;
      Lampa.Select.show({ title: tr('b_more'), items: items,
        onSelect: function () { Lampa.Controller.toggle(ctl); },
        onBack: function () { Lampa.Controller.toggle(ctl); } });
    });
    return b;
  }
  // the list of «⋯»: the buttons the row leaves out (each runs as its button does), Autopilot's menu
  function moreItems(box, ctl) {
    var items = [], bell = box.children('.button--snack-sub').length;
    var item = function (el) {
      var t = buttonName(el), icon = $(el).children('svg').prop('outerHTML');
      if (!t) return;
      if (bell && el.classList.contains('button--subscribe')) t += ' · CUB';   // the bell in the row subscribes too
      items.push({ title: t, template: icon ? 'selectbox_icon' : 'selectbox_item', icon: icon,
        onSelect: function () { Lampa.Controller.toggle(ctl); $(el).trigger('hover:enter'); } });
    };
    box.children('.full-start__button.stv-more').each(function () {
      if (this.classList.contains('hide') || this.classList.contains('button--options')) return;
      // Lampa's Play is a list of the sources (online plugins, torrents, trailers, Shots); while it is
      // hidden for Autopilot they are listed here one by one, but for what the row has already
      if (this.classList.contains('button--play') && noPlay()) {
        box.closest('.full-start-new').find('.buttons--container > .full-start__button').not('.hide').each(function () {
          if (this.classList.contains('view--torrent') && box.children('.button--alc-torrent').length) return;
          if (this.classList.contains('view--trailer') && box.children('.button--alc-trailer').length) return;
          item(this);
        });
        return;
      }
      item(this);
    });
    var ap = box.children('.button--alc-auto').first();
    if (ap.length) items.push({ title: tr('b_auto_set'), onSelect: function () { Lampa.Controller.toggle(ctl); ap.trigger('hover:long'); } });
    return items;
  }
  // Lampa's «⋯» was pressed: the hidden buttons first, then what other plugins add, then Lampa's own
  function moreOptions(e) {
    var html = e.link && e.link.html, box = html ? $(html).find('.full-start-new__buttons').first() : $();
    if (!box.length || !e.options || !box.closest('.stv-full').length) return;
    var ctl = 'full_start';
    try { ctl = Lampa.Controller.enabled().name; } catch (x) {}
    var mine = moreItems(box, ctl);
    for (var i = mine.length - 1; i >= 0; i--) e.options.unshift(mine[i]);
  }
  // touch: a long press on a round button shows its name over it a moment (iOS's tooltip)
  var tipEl = null, tipT = 0;
  function tipFor(el) {
    if (el.stv_tip) return;
    el.stv_tip = true;
    $(el).on('hover:long', function () {
      if (!themeOn() || M === 'tv' || el.classList.contains('stv-primary')) return;
      var t = buttonName(el);
      if (!t) return;
      if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'stv-tip'; document.body.appendChild(tipEl); }
      tipEl.textContent = t;
      tipEl.classList.add('on');
      var r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      tipEl.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
      tipEl.style.top = Math.max(8, r.top - h - 10) + 'px';
      clearTimeout(tipT);
      tipT = setTimeout(function () { tipEl.classList.remove('on'); }, 2200);
    });
  }
  function themeFull(e) {
    var render = e.object.activity.render(), movie = (e.data && e.data.movie) || e.object.card || {};
    var start = render.find('.full-start-new').first();
    if (!start.length) return;   // another layout of the card: Lampa's look stays
    render.addClass('stv-full');
    // scrim over the backdrop
    var bg = render.find('.full-start__background').first();
    // Lampa draws no background picture on screens under 790 px (phones): the theme adds one in the same
    // place, so the page has its picture and «Трейлеры» its spot for the background trailer
    if (!bg.length) {
      var holder0 = start.closest('.scroll').parent();
      var path = portrait() && movie.poster_path ? cleanPoster(movie) : movie.backdrop_path;
      if (holder0.length && path) {
        var own = new Image();
        var isPoster = path !== movie.backdrop_path;
        own.className = 'full-start__background stv-own-bg' + (isPoster ? ' stv-own-bg--poster' : '');
        own.alt = '';
        own.onload = function () { own.classList.add('loaded'); };
        own.src = img(path, isPoster ? tmdbSize('poster', window.innerWidth) : tmdbSize('backdrop', window.innerWidth));
        holder0.prepend(own);
        bg = $(own);
      }
    }
    if (bg.length && !render.find('.stv-scrim').length) bg.after('<div class="stv-scrim"></div>');
    // the backdrop and the scrim sit at z-index -1: their container gets its own stacking layer, else
    // they go under the page colour of the activity
    if (bg.length) { var holder = bg[0].parentNode; if (window.getComputedStyle(holder).position === 'static') holder.style.position = 'relative'; holder.style.zIndex = '0'; holder.style.overflow = 'hidden'; }
    // logo instead of the text title
    var title = start.find('.full-start-new__title').first();
    if (title.length && !title.find('.stv-logo').length) {
      titleLen(title[0], title.text());
      logoInto(title[0], movie, tmdbSize('logo', T[M].logoW * k));
    }
    // meta line + description above the rate line
    var right = start.find('.full-start-new__right').first();
    if (!right.find('.stv-meta').length) {
      var meta = $(metaLine(movie, start));
      title.after(meta);
      // the ratings (TMDB, and IMDb / KP when Lampa fills them) join the meta line
      var rl = start.find('.full-start-new__rate-line').first();
      if (rl.length) { var ua = meta.find('.stv-ua'); if (ua.length) ua.before(rl); else meta.append(rl); }
      var d = descBlock(movie);
      if (d) meta.after(d);
    }
    askServer();   // a server found / lost since (Autopilot keeps «none» for a minute)
    markButtons(render);
    // the pack's and other plugins' buttons come on the same event (before or after this) or later
    var bx = render.find('.full-start-new__buttons')[0];
    if (bx && !bx.stv_obs && window.MutationObserver) {
      var due = 0;
      bx.stv_obs = new MutationObserver(function () {
        if (due) return;
        due = setTimeout(function () { due = 0; try { if (themeOn() && inDoc(bx)) markButtons(render); } catch (x) {} }, 30);
      });
      bx.stv_obs.observe(bx, { childList: true });
    }
    // the page colour from the backdrop
    tintOf(movie.backdrop_path, function (col) {
      if (!col) return;
      var el = render[0];
      el.style.setProperty('--stv-bg', deep(col, 0.16));
      el.style.setProperty('--stv-bg-a6', deepA(col, 0.16, 0.62));
    });
  }

  // Apple's order of the rows: the info, episodes, cast, related; "About" (Lampa's description with
  // the details) last. CUB comments go with the reactions. Done on the row list before Lampa builds
  // it, so the remote moves through the rows in the order they are shown.
  var FIRST = { start: 0, episodes: 1, persons: 2, cards: 3, metadata_chart: 4, metadata_tags: 4, description: 6, discuss: 7 };
  function rowName(x) { return Object.prototype.toString.call(x) === '[object Array]' ? x[0] : x; }
  function reorderRows(link) {
    if (!link || typeof link.build !== 'function' || link.stv_rows) return;
    link.stv_rows = true;
    var orig = link.build;
    link.build = function (data) {
      try {
        if (themeOn() && this.rows && this.rows.length && rowName(this.rows[0]) === 'start') {
          var rows = this.rows.slice(), hide = !opt(K.react);
          rows = rows.filter(function (x) { return !(hide && rowName(x) === 'discuss'); });
          rows = rows.map(function (x, i) { return [x, i]; }).sort(function (a, b) {
            var fa = FIRST[rowName(a[0])], fb = FIRST[rowName(b[0])];
            fa = fa === undefined ? 5 : fa; fb = fb === undefined ? 5 : fb;
            return fa - fb || a[1] - b[1];
          }).map(function (x) { return x[0]; });
          this.rows.length = 0;
          Array.prototype.push.apply(this.rows, rows);
          data = this.rows.slice(0, this.view || 3);
        }
      } catch (e) { log(e && e.message); }
      return orig.call(this, data);
    };
  }

  // ---------- watch progress: Lampa's timelines (the card's episode row and Home's «Up Next») ----------
  function epHash(m, s, e) {
    var name = m.original_name || m.original_title || m.name || '';
    return Lampa.Utils.hash([s, s > 10 ? ':' : '', e, name].join(''));
  }
  function epView(m, s, e) { try { return Lampa.Timeline.view(epHash(m, s, e)) || {}; } catch (x) { return {}; } }
  // a movie's progress (Lampa keys it by the original title, as Autopilot's timelineHash does)
  function movieView(m) { try { return Lampa.Timeline.view(Lampa.Utils.hash(m.original_title || m.title || '')) || {}; } catch (x) { return {}; } }
  function seasonsList(m) {
    var out = [];
    (m.seasons || []).forEach(function (x) { var n = parseInt(x.season_number, 10); if (n > 0 && (x.episode_count || 0) > 0) out.push(n); });
    if (!out.length && m.number_of_seasons) for (var i = 1; i <= m.number_of_seasons; i++) out.push(i);
    return out.sort(function (a, b) { return a - b; });
  }
  // The furthest episode with any progress, from Lampa's own timelines (Autopilot's rule: an earlier
  // episode reopened later does not move it back): {s, e, pct, left (minutes)} or null. Any season: a
  // series started from season 4 is found there.
  // Read-only (Timeline.view); seasons from the card, else up to 12; a season's scan stops after a run
  // of episodes never started. first: the first episode with progress ends the scan (anyWatched).
  function lastWatched(m, first) {
    var best = null, seasons = parseInt(m.number_of_seasons, 10) || 12;
    seasons = Math.min(seasons, 30);
    for (var s = 1; s <= seasons; s++) {
      var miss = 0, max = s === 1 ? 120 : 60;
      for (var e = 1; e <= max; e++) {
        var v = epView(m, s, e);
        if (v.percent > 0) {
          if (first) return { s: s, e: e };
          miss = 0;
          if (!best || s > best.s || (s === best.s && e > best.e))
            best = { s: s, e: e, pct: v.percent, left: v.duration && v.time ? Math.round((v.duration - v.time) / 60) : 0 };
        } else if (++miss > 10 && e > 10) break;
      }
    }
    return best;
  }
  // any episode with progress (lastWatched's answer as a yes / no, without scanning on)
  function anyWatched(m) { return !!lastWatched(m, true); }
  // what comes after a watched episode: the next one, or the next season's first (when the card knows
  // the season's length)
  function nextAfter(m, s, e) {
    var count = 0;
    (m.seasons || []).forEach(function (x) { if (parseInt(x.season_number, 10) === s) count = x.episode_count || 0; });
    if (count && e >= count && s < (parseInt(m.number_of_seasons, 10) || 0)) return { s: s + 1, e: 1 };
    return { s: s, e: e + 1 };
  }
  // the season and episode to show first: the furthest episode watched (or the next one when it was watched
  // to the end), else what "Continue · S2E5" would play
  // lw: lastWatched(m) when the caller has it already (the scan is the costly part)
  function startPoint(m, fallbackSeason, lw) {
    try {
      if (lw === undefined) lw = lastWatched(m);
      if (lw) { if (lw.pct < 90) return { s: lw.s, e: lw.e }; var nx = nextAfter(m, lw.s, lw.e); return { s: nx.s, e: nx.e }; }
    } catch (x) {}
    try {
      var a = autoApi('label');
      if (a) { var l = a.label(m); if (l && l.season) return { s: l.season, e: l.episode }; }
    } catch (x) {}
    try {
      var w = watchedLast()[titleHash(m)];
      if (w && w.season) return { s: parseInt(w.season, 10), e: parseInt(w.episode, 10) || 1 };
    } catch (x) {}
    return { s: fallbackSeason || 1, e: 1 };
  }
  function playEpisode(m, s, e, render) {
    var a = autoApi('playEpisode');
    if (a) { a.playEpisode(m, s, e); return; }
    // no Autopilot: Lampa's own Play (its source menu)
    var play = render.find('.button--play').first();
    if (play.length) play.trigger('hover:enter');
  }
  // ---------- the episode row: stills, number, title, runtime, progress; a tap plays that episode ----------
  // Episode titles as Autopilot names them: TMDB answers "<word> 15" when an episode has no title in
  // the interface language; such titles (and titles in a script the interface language does not use)
  // take the English title, then the original-language one if it is readable in the interface script.
  // Nothing readable: no title line (the card says «СЕРИЯ 15» already). An empty description takes the
  // English one. The extra requests only for seasons that need them (one per language, cached).
  var PLACEHOLDER = /^[^\d]{1,24}\s\d{1,4}$/;
  var SCRIPTS = { cyr: /[\u0400-\u04FF]/g, cjk: /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g, lat: /[A-Za-z\u00C0-\u024F]/g };
  function scriptOf(str) {
    var best = '', n = 0;
    for (var k2 in SCRIPTS) { var c = (String(str || '').match(SCRIPTS[k2]) || []).length; if (c > n) { n = c; best = k2; } }
    return best;
  }
  var uiScriptMemo = '';
  function uiScript() {
    if (uiScriptMemo) return uiScriptMemo;
    var l = uiLang(), name = '';
    try { if (window.Intl && Intl.DisplayNames) name = new Intl.DisplayNames([l], { type: 'language' }).of(l); } catch (e) {}
    uiScriptMemo = scriptOf(name) || (/^(ru|uk|be|bg|sr|kk)$/.test(l) ? 'cyr' : 'lat');
    return uiScriptMemo;
  }
  function goodName(n, ui) { if (!n || PLACEHOLDER.test(String(n).trim())) return false; var sc = scriptOf(n); return !sc || sc === ui; }
  // no description: empty, or blanks / emoji only (stv_txt: the overview as shown, see fillNames)
  function noText(e) { return !e.stv_txt; }
  // the names and descriptions the interface can show (TMDB's other languages for what is missing);
  // stv_txt / stv_name: the overview / name as plainText, once per episode, for the cards
  function fillNames(m, n, eps, cb) {
    var ui = uiScript();
    var done = function () { eps.forEach(function (e) { e.stv_name = plainText(e.name); }); cb(eps); };
    eps.forEach(function (e) { e.stv_txt = plainText(e.overview); });
    var bad = eps.filter(function (e) { return !goodName(e.name, ui) || noText(e); });
    if (!bad.length) return done();
    var langs = ['en-US'], orig = m.original_language;
    if (orig && orig !== 'en') langs.push(orig);
    (function next(i) {
      bad = bad.filter(function (e) { return (!goodName(e.name, ui) && !e.stv_named) || noText(e); });
      if (!bad.length || i >= langs.length) {
        eps.forEach(function (e) { if (!e.stv_named && !goodName(e.name, ui)) e.stv_noname = true; });
        return done();
      }
      tmdb('tv/' + m.id + '/season/' + n, function (j) {
        var alt = {};
        ((j && j.episodes) || []).forEach(function (x) { alt[x.episode_number] = x; });
        bad.forEach(function (e) {
          var a = alt[e.episode_number];
          if (!a) return;
          // English is the agreed fallback in any interface language; others must be readable
          if (!goodName(e.name, ui) && !e.stv_named && a.name && !PLACEHOLDER.test(String(a.name).trim()) && (langs[i] === 'en-US' || scriptOf(a.name) === ui)) { e.name = a.name; e.stv_named = true; }
          var txt = noText(e) && plainText(a.overview);
          if (txt && (langs[i] === 'en-US' || scriptOf(a.overview) === ui)) { e.overview = a.overview; e.stv_txt = txt; }
        });
        next(i + 1);
      }, function () { next(i + 1); }, langs[i]);
    })(0);
  }
  function seasonOf(m, n, cb) {
    var lang = tmdbLang();
    var key = m.id + ':' + n + ':' + lang, have = seasonCache.get(key);
    if (have) return cb(have);
    tmdb('tv/' + m.id + '/season/' + n, function (j) {
      fillNames(m, n, (j && j.episodes) || [], function (eps) { seasonCache.set(key, eps); cb(eps); });
    }, function () { cb(null); });
  }
  // one episode card, Apple's: the still and a strip under it, the text inside over the still's blurred
  // copy (the episode row, the schedule). o: {still (TMDB path), cap, name, descr, time, pct, soon}.
  // The pictures wait in data-src (loadImg)
  function epCard(o) {
    var el = document.createElement('div');
    el.className = 'stv-ep selector' + (o.soon ? ' stv-ep--soon' : '');
    // the blurred copy (under the text strip; not in the light mode) and the still over it
    el.innerHTML = (L ? '' : '<div class="stv-ep__blur"></div>') + '<div class="stv-ep__img"></div>' +
      '<div class="stv-ep__info"><div class="stv-ep__cap"></div><div class="stv-ep__name"></div><div class="stv-ep__descr"></div><div class="stv-ep__time"><span></span></div></div>';
    var box = el.querySelector('.stv-ep__img'), info = el.lastChild, time = info.lastChild, pct = o.pct || 0;
    if (o.still) {
      [el.querySelector('.stv-ep__blur'), box].forEach(function (holder) {
        if (!holder) return;
        var im = new Image();
        im.alt = '';
        im.onload = function () { im.classList.add('loaded'); };
        im.onerror = function () { if (im.parentNode) im.parentNode.removeChild(im); };
        // the blurred copy small: blurred, a big file buys nothing and costs a lot
        im.setAttribute('data-src', img(o.still, holder === box ? tmdbSize('still', T[M].epW * k) : 'w300'));
        holder.appendChild(im);
      });
    }
    if (pct > 0 && pct < 90) time.insertAdjacentHTML('afterbegin', '<div class="stv-ep__bar"><div style="width:' + Math.max(4, pct) + '%"></div></div>');
    else if (pct >= 90) box.insertAdjacentHTML('beforeend', '<div class="stv-ep__seen">✓</div>');
    info.children[0].textContent = o.cap || '';
    if (o.name) info.children[1].textContent = o.name;
    else info.children[1].style.display = 'none';
    info.children[2].textContent = o.descr || '';
    time.lastChild.textContent = o.time || '';
    return el;
  }
  function loadImg(el) { if (el && el.querySelectorAll) Array.prototype.forEach.call(el.querySelectorAll('img[data-src]'), function (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }); }
  function dateText(d) { try { return Lampa.Utils.parseTime(d).full; } catch (e) { return String(d || ''); } }
  var CHEV = '<svg class="stv-season-chev" viewBox="0 0 12 20" width="0.55em" height="0.9em"><path d="M2 7.5 6 3.5l4 4M2 12.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function themeEpisodes(e) {
    if (!opt(K.episodes)) return;
    var line = e.item, movie = (e.data && e.data.movie) || {};
    if (!line || !line.scroll || !line.html || !movie.id) return;
    var seasons = seasonsList(movie);
    if (!seasons.length) return;
    var body = line.scroll.body ? line.scroll.body(true) : line.html.querySelector('.scroll__body');
    if (!body) return;
    var render = e.body.closest('.activity');
    if (!render.length) render = e.body;
    var titleEl = line.html.querySelector('.items-line__title');
    var sp = startPoint(movie, seasons[seasons.length - 1]);
    if (seasons.indexOf(sp.s) < 0) { sp.s = seasons[0]; sp.e = 1; }
    var current = sp.s;

    // Apple: the row title «Season 1 ⌃⌄» is the season switch. On touch a tap opens the list; on TVs the
    // title joins the row's remote list (up from the episodes reaches it, up again leaves the row)
    var pick = titleEl ? titleEl : document.createElement('div');
    if (seasons.length > 1) pick.className += ' stv-season-title selector';
    $(pick).on('hover:enter', function () {
      if (seasons.length < 2) return;
      var items = seasons.map(function (n) { return { title: tr('season') + ' ' + n, n: n, selected: n === current }; });
      var ctl = Lampa.Controller.enabled().name;
      Lampa.Select.show({
        title: tr('season'), items: items,
        onSelect: function (a) { Lampa.Controller.toggle(ctl); if (a.n !== current) { current = a.n; draw(1); } },
        onBack: function () { Lampa.Controller.toggle(ctl); }
      });
    });
    $(pick).on('hover:focus', function () { line.last = pick; });
    var head = titleEl && titleEl.parentNode;
    if (head && seasons.length > 1) {
      try {
        line.use({ onController: function (c) {
          var sc = line.scroll.render(true);
          c.toggle = function () {
            Lampa.Controller.collectionSet(sc, head);
            Lampa.Controller.collectionFocus(line.last || false, sc);
            line.emit('toggle');
          };
          c.up = function () { if (Navigator.canmove('up')) Navigator.move('up'); else line.emit('up'); };
          c.down = function () { if (Navigator.canmove('down')) Navigator.move('down'); else line.emit('down'); };
        } });
      } catch (x) {}
    }

    function card(m, ep) {
      var s = ep.season_number, n = ep.episode_number, soon = ep.air_date && new Date(ep.air_date) > new Date();
      var bits = [];
      if (soon) bits.push(tr('soon') + ' · ' + dateText(ep.air_date));
      else { if (ep.runtime) bits.push(runtimeText(ep.runtime)); if (ep.air_date) bits.push(String(ep.air_date).slice(0, 4)); }
      var el = epCard({ still: ep.still_path, cap: tr('episode_cap', n), name: ep.stv_noname ? '' : ep.stv_name, descr: ep.stv_txt,
        time: bits.join(' · '), pct: epView(m, s, n).percent, soon: soon });
      $(el).on('hover:focus', function () { line.last = el; if (line.scroll.update) line.scroll.update(el, false); loadNear(el); });
      $(el).on('hover:enter', function () { if (!soon) playEpisode(m, s, n, render); });
      return el;
    }
    // stills: only for what is on screen and the next screen
    var shown = [];   // the row's episode cards, in order (el.stv_i = its place)
    function loadNear(el) {
      var i = el.stv_i, per = M === 'tv' ? 6 : 5;
      for (var j = Math.max(0, i - 1); j < Math.min(shown.length, i + per * 2); j++) loadImg(shown[j]);
    }
    var io = window.IntersectionObserver ? new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { loadImg(x.target); io.unobserve(x.target); } });
    }, { rootMargin: '100% 100% 100% 100%' }) : null;

    function draw(focusEp) {
      if (titleEl) titleEl.innerHTML = esc(tr('season') + ' ' + current) + (seasons.length > 1 ? CHEV : '');
      var want = current;   // a season picked meanwhile wins over a late answer for this one
      seasonOf(movie, current, function (eps) { ready(eps, 0); });
      function ready(eps, tries) {
        if (want !== current) return;
        if (!eps || !eps.length) return;   // TMDB did not answer: Lampa's own row stays
        // the row may still sit in Lampa's fragment (built, not yet appended): a moment later
        if (!inDoc(body)) { if (tries < 20) setTimeout(function () { ready(eps, tries + 1); }, 50); return; }
        // on the page now: stopped when the page closes (see pruneWatched)
        if (io && !io.stv_listed) { io.stv_listed = true; rowIOs.push({ io: io, el: body }); }
        // Lampa's own episode items: hidden and out of the remote's reach; no more of them
        line.html.classList.add('stv-eprow');
        Array.prototype.forEach.call(body.querySelectorAll('.full-episode, .card-more'), function (x) { x.classList.remove('selector'); });
        try { line.scroll.onScroll = function () {}; } catch (x) {}
        Array.prototype.slice.call(body.querySelectorAll('.stv-ep')).forEach(function (x) { if (io) io.unobserve(x); x.parentNode.removeChild(x); });
        var els = shown = eps.map(function (ep, i) { var x = card(movie, ep); x.stv_i = i; return x; });
        els.forEach(function (x) { body.appendChild(x); if (io) io.observe(x); });
        var target = els[Math.max(0, Math.min(els.length - 1, (focusEp || 1) - 1))];
        if (!target) return;
        if (!io) loadNear(target);
        line.last = target;
        // keep the start point in view
        setTimeout(function () { try { if (line.scroll.update) line.scroll.update(target, false); } catch (x) {} if (!io) loadNear(target); }, 30);
        // the remote's list for this row is rebuilt when the row has the focus
        try { if (Lampa.Controller.own && Lampa.Controller.own(line)) line.toggle(); } catch (x) {}
      }
    }
    draw(current === sp.s ? sp.e : 1);
  }


  // ================= pages: which one, its state on the body, the remote =================
  // the page being opened: Lampa builds it (and its cards, from cached lists) between 'init' and 'start',
  // while Activity.active() is still the page it is opened from
  var building = null;
  function pageNow() { if (building) return building; try { return Lampa.Activity.active() || null; } catch (e) { return null; } }
  function screenNow() { var a = pageNow(); return (a && a.component) || ''; }
  // ---------- page state for the bars: Home (the iPad tab capsule), scrolled (TV header) ----------
  function pageState() {
    try {
      var a = pageNow(), b = document.body.classList;
      b.toggle('stv-at-main', !!(a && a.component === 'main'));
      b.toggle('stv-at-cat', !!(a && a.component === 'category'));
      b.toggle('stv-at-person', !!(a && a.component === 'myperson'));
      if (a && a.component === 'myperson' && themeOn()) personTilesSoon();
      if (M === 'tv') {   // only the TV header styles stv-scrolled
        var y = 0, sb = document.querySelector('.activity--active .scroll:not(.scroll--horizontal) > .scroll__content > .scroll__body');
        // Lampa's own inline translate3d (where it is heading) first: the computed style is a style recalc
        var m = sb && /translate3d\(\s*-?[\d.]+px,\s*(-?[\d.]+)px/.exec(sb.style.webkitTransform || sb.style.transform || '');
        if (m) y = parseFloat(m[1]);
        else if (sb) { m = /matrix.*,\s*(-?[\d.]+)\)$/.exec(window.getComputedStyle(sb).transform || ''); if (m) y = parseFloat(m[1]); }
        var head = false; try { head = Lampa.Controller.enabled().name === 'head'; } catch (e) {}
        b.toggle('stv-scrolled', y < -40 && !head);
      }
    } catch (e) {}
  }
  // People (the left menu): each row opens with the person — a round portrait and «All titles» in
  // place of Lampa's empty «More» tile (it opens the same list); the row title is the name
  function personTiles() {
    try {
      var rows = document.querySelectorAll('.activity--active .items-line');
      Array.prototype.forEach.call(rows, function (row) {
        var tile = row.querySelector('.card-more--first .card-more__box');
        if (!tile || tile.querySelector('.stv-pphoto')) return;
        var im = row.querySelector('.items-line__head .full-person__photo img');
        var src = im && (im.getAttribute('src') || '');
        if (!/image\.tmdb\.org/.test(src)) return;
        var ph = document.createElement('div');
        ph.className = 'stv-pphoto';
        ph.style.backgroundImage = 'url(' + src.replace(/\/t\/p\/[^/]+\//, '/t/p/w185/') + ')';
        var cap = tile.querySelector('.card-more__title');
        if (cap) cap.textContent = tr('all_films');
        tile.insertBefore(ph, tile.firstChild);
      });
    } catch (e) {}
  }
  // the rows come in batches: again a moment later (only the last call's retries are kept)
  var tileTimers = [];
  function personTilesSoon() {
    tileTimers.forEach(clearTimeout);
    personTiles();
    tileTimers = [setTimeout(personTiles, 1500), setTimeout(personTiles, 4000)];
  }
  // the header floats (0 high for Lampa's layout) only over Home, the card and Autopilot's screen
  function floatHead() {
    try {
      var a = pageNow(), b = document.body.classList;
      var on = themeOn() && !!a && (a.component === 'full' || a.component === 'alc_auto_view' || !!heroSection(a.component, a));
      if (b.contains('stv-float-head') === on) return;
      b.toggle('stv-float-head', on);
      if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
    } catch (e) {}
  }
  // a poster's long-press menu: its title instead of Lampa's «Действие» (on a touch screen the title under
  // the poster is under the finger). The poster: the one last touched, else the one in focus (a remote)
  // touch on posters: the touched one stays «on» (its title shown, see cssPosters) until another poster is
  // touched, and «pressed» (it sinks) while the finger is down and still. Also the first touch of the session
  // (trackKeys: a touch screen, not a remote) and the poster last touched (cardMenuTitle)
  var touched = false, touchedCard = null, touchedAt = 0;
  function touchPosters() {
    var pressed = null, on = null, x0 = 0, y0 = 0, opts = { passive: true, capture: true };
    var move = function (e) { if (Math.abs(e.touches[0].clientX - x0) > 10 || Math.abs(e.touches[0].clientY - y0) > 10) release(); };
    var release = function () {
      if (!pressed) return;
      pressed.classList.remove('stv-press'); pressed = null;
      document.removeEventListener('touchmove', move, opts);
    };
    try {
      document.addEventListener('touchstart', function (e) {
        if (!touched) { touched = true; remoteOff(); }
        release();
        if (!themeOn()) return;
        var c = e.target && e.target.closest ? e.target.closest('.card') : null;
        if (!c) return;
        touchedCard = c; touchedAt = Date.now();
        if (c.classList.contains('card--wide')) return;
        if (on && on !== c) on.classList.remove('stv-on');
        on = c; c.classList.add('stv-on');
        pressed = c; c.classList.add('stv-press');
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
        document.addEventListener('touchmove', move, opts);
      }, opts);
      document.addEventListener('touchend', release, opts);
      document.addEventListener('touchcancel', release, opts);
    } catch (e) {}
  }
  // a poster's long-press menu: its title instead of Lampa's «Действие» (on a touch screen the title under the
  // poster is under the finger). The poster: the one just touched on the open page, else the focused one (a remote)
  function cardMenuTitle() {
    var show = Lampa.Select && Lampa.Select.show;
    if (!show || show.stvTitled) return;
    var fn = function (params) {
      try {
        if (themeOn() && params && params.title === Lampa.Lang.translate('title_action')) {
          var t = touchedCard && Date.now() - touchedAt < 1500 && $(touchedCard).closest('.activity--active').length ? touchedCard : null;
          var c = t || document.querySelector('.activity--active .card.focus');
          var name = c ? $.trim($(c).find('.card__title').first().text()) : '';
          if (name) params.title = name;
        }
      } catch (e) {}
      return show.apply(this, arguments);
    };
    fn.stvTitled = true;
    Lampa.Select.show = fn;
  }
  // the remote: the last up / down and a key counter (empty rows pass the focus on in that direction)
  var lastDir = 'down', keyCount = 0;
  var stateTimer = 0;
  function pageStateLater() { clearTimeout(stateTimer); stateTimer = setTimeout(pageState, 420); }
  function trackKeys() {
    // a remote: three arrow presses with no touch before them (and not typing): the TV look in «auto», kept for
    // this device; a touch takes it back (an iPad with a keyboard does not stay a TV)
    var arrows = 0;
    window.addEventListener('keydown', function (e) {
      var c = e.keyCode;
      keyCount++;
      if (c === 38) lastDir = 'up';
      else if (c === 40) lastDir = 'down';
      var t = e.target && e.target.tagName;
      if (c >= 37 && c <= 40 && !touched && t !== 'INPUT' && t !== 'TEXTAREA' && ++arrows === 3 && opt(K.mode) === 'auto' && M !== 'tv') {
        try { Lampa.Storage.set(K.remote, '1'); } catch (x) {}
        apply();
        // the open page was built for touch: built again for the remote (as after the look is changed in settings)
        setTimeout(function () { try { Lampa.Activity.refresh(true); } catch (x) {} }, 0);
      }
      pageStateLater();
    }, true);
  }
  // the first touch: the device has a touch screen, the remote guess goes (see touchPosters)
  function remoteOff() {
    if (String(opt(K.remote)) !== '1') return;
    try { Lampa.Storage.set(K.remote, ''); } catch (x) {}
    if (opt(K.mode) === 'auto') apply();
  }

  // ================= home: wide cards with logos, "Up Next", Shots =================
  // Home's «Continue» and «Watched» rows: the 16:9 cards with progress
  // «Continue» / «Watched» (Lampa's continue_watch row): its cards are Lampa's own continue lists
  // (Favorite.continues: series, anime, movies) - the row starts where one of them starts and has none
  // of anything else; Lampa's own titles (its translation) as the fallback. The lists are read once per
  // drawing of Home (a second)
  var contMemo = null;
  function contLists() {
    if (contMemo && Date.now() - contMemo.t < 1000) return contMemo;
    var m = { t: Date.now(), firsts: {}, ids: {} };
    try {
      if (Lampa.Favorite && typeof Lampa.Favorite.continues === 'function') ['tv', 'anime', 'movie'].forEach(function (k) {
        var l = Lampa.Favorite.continues(k) || [];
        if (l[0]) m.firsts[l[0].id] = 1;
        l.forEach(function (d) { if (d && d.id) m.ids[d.id] = 1; });
      });
    } catch (e) {}
    return (contMemo = m);
  }
  function cwRow(line, scr) {
    if (scr !== 'main') return false;
    var res = line.results || [];
    if (res.length && !line.url && !line.source && res[0]) {
      var c = contLists();
      if (c.firsts[res[0].id] && res.every(function (x) { return x && c.ids[x.id]; })) return true;
    }
    cwTitles();
    return !!line.title && (line.title === cwTitle || line.title === cwTitle2);
  }
  // CUB's Shots row: its items are shots (a card id + a fragment), its icon Shots' sprite; the title as the fallback
  function shotsRow(line) {
    var res = line.results || [];
    if (res.length && res.every(function (x) { return x && typeof x === 'object' && 'card_id' in x && 'start_point' in x; })) return true;
    if (typeof line.icon_svg === 'string' && line.icon_svg.indexOf('sprite-shots') >= 0) return true;
    return /^shots$/i.test(String(line.title || '').trim());
  }
  function isTitleData(d) {
    return d && typeof d === 'object' && d.id && (d.title || d.name) && !d.gender && d.media_type !== 'person' && !(d.profile_path && !d.poster_path && !d.backdrop_path);
  }
  // what Lampa asks of a row object: handlers (use / emit as Lampa's own rows) and its element
  function rowBase(self, el) {
    var h = {};
    self.use = function (o) { for (var k2 in o) if (typeof o[k2] === 'function') (h[k2] = h[k2] || []).push(o[k2]); };
    self.emit = function (n) { var a = Array.prototype.slice.call(arguments, 1), f = h['on' + n.charAt(0).toUpperCase() + n.slice(1)] || []; f.forEach(function (x) { x.apply(self, a); }); };
    self.render = function (js) { return js ? el : $(el); };
  }
  // a row the viewer does not want (Shots): kept in Lampa's list of rows, so up/down still count it,
  // but it is empty and passes the focus on in the direction the remote was moving
  function SkipRow() {
    var self = this, el = document.createElement('div'), last = 0, lastKeys = -1;
    el.className = 'stv-shots-hidden';
    rowBase(this, el);
    this.create = function () {};
    this.toggle = function () {
      // toggled again with no key pressed in between = Lampa bounced it back (it is the last row): turn
      var now = Date.now(), again = keyCount === lastKeys && now - last < 1000;
      var dir = again ? (lastDir === 'up' ? 'down' : 'up') : lastDir;
      last = now; lastKeys = keyCount;
      setTimeout(function () { self.emit(dir); }, 0);
    };
    this.destroy = function () { if (el.parentNode) el.parentNode.removeChild(el); };
  }
  // Lampa's titles of the "Continue" rows (its language)
  var cwTitle = '', cwTitle2 = '';
  function cwTitles() { if (!cwTitle) try { cwTitle = Lampa.Lang.translate('title_continue'); cwTitle2 = Lampa.Lang.translate('title_watched'); } catch (e) {} }
  // ---------- rows: which are wide; cards: wide (16:9) or Apple's poster ----------
  // Apple TV (tvOS 26): a title is a 2:3 poster; 16:9 only for what is being watched — Home's «Continue» /
  // «Watched» rows — and for CUB's trailers row (the banner and episodes are the theme's own 16:9).
  // Decided per row when the row is made (the page being opened is known then); Lampa reuses the same
  // card objects on other pages (cached lists): every row writes the choice afresh.
  var trailersTitle = '';
  function lineHook(line, scr) {
    var main = scr === 'main', cw = cwRow(line, scr);
    if (!trailersTitle) try { trailersTitle = Lampa.Lang.translate('title_trailers') + ' - ' + Lampa.Lang.translate('title_new'); } catch (e) {}
    var wide = cw || (main && line.title === trailersTitle);
    if (scr === 'actor' && line.title && (line.results || []).length) {
      // the person page (Apple): «Movies», «TV Shows»… without Lampa's counts, the best known first
      line.title = String(line.title).replace(/\s*\(\d+\)\s*$/, '');
      line.results.sort(function (a, b) { return ((b && b.vote_count) || 0) - ((a && a.vote_count) || 0); });
    }
    (line.results || []).forEach(function (x) { if (x && typeof x === 'object') x.stv_wide = wide ? 1 : 0; });
    if (line.title === undefined) return;
    if (!opt(K.shots) && main && shotsRow(line)) {
      line.params = line.params || {};
      line.params.createInstance = function () { return new SkipRow(); };
    } else if (cw) {
      line.params = line.params || {};
      line.params.type = 'stv-cw';
      (line.results || []).forEach(function (x) { if (x && typeof x === 'object') x.stv_cw = 1; });
    }
  }
  // Lampa's own style for a card (wide for CUB's «В высоком качестве» / trailers, default…) is kept on
  // the shared object the first time: the theme sets its own each time and puts Lampa's back when off
  function cardHook(d, scr) {
    var p = d.params = d.params || {};
    if (d.stv_emit0 === undefined) d.stv_emit0 = p.emit || null;
    if (d.stv_style0 === undefined) d.stv_style0 = p.style || null;
    var own = d.stv_style0 && d.stv_style0.name;
    if (own && own !== 'default' && own !== 'wide') return;   // another kind of card: Lampa's
    if (d.stv_wide && scr === 'main') { p.style = { name: 'wide' }; p.emit = wideEmit(d); }
    else { p.style = { name: 'default' }; p.emit = posterEmit(d); }
  }
  function cardRestore(d) {
    if (d.stv_style0 === undefined || !d.params) return;
    if (d.stv_style0) d.params.style = d.stv_style0; else delete d.params.style;
    if (d.stv_emit0) d.params.emit = d.stv_emit0; else delete d.params.emit;
    delete d.stv_style0;
  }
  // a card's hook: Lampa's own, plus the picture at the size the screen needs (and for a wide card its
  // logo and «Up Next»). Built from Lampa's own every time (the object comes back on every visit)
  function cardEmit(d, size, after) {
    var prev = d.stv_emit0 || {}, own = {};
    for (var k2 in prev) own[k2] = prev[k2];
    var pc = prev.onCreate;
    own.onCreate = function () {
      if (pc) pc.apply(this, arguments);
      var inst = this, gp = inst.getPosterPath;
      // the picture at the size the screen needs; a localized poster (localCard) first
      if (typeof gp === 'function' && !gp.stv) { inst.getPosterPath = function () { return inst.stv_locp || resized(gp.apply(inst, arguments), size); }; inst.getPosterPath.stv = 1; }
      if (after) try { after.call(this); } catch (e) {}
    };
    return own;
  }
  function wideEmit(d) { var t = T[M]; return cardEmit(d, tmdbSize('backdrop', (d.stv_cw ? t.cwW : t.cardW) * k), function () { wideCard(this.html, this.data || d); }); }
  function posterEmit(d) {
    var size = tmdbSize('poster', posterCssW());
    if (!needsLocal(d)) return cardEmit(d, size);
    return cardEmit(d, size, function () { var inst = this; setTimeout(function () { try { localCard(inst, d, size); } catch (e) {} }, 0); });
  }
  // ---------- a card in another language: its title and poster from TMDB in the interface's ----------
  // Cards from CUB (Russian whatever the language) and cards Lampa saved earlier in Russian (bookmarks,
  // history, «We recommend») keep their stored data: only what this card shows on screen changes -
  // the title line and the poster - from TMDB in Lampa's TMDB language (its own poster for that
  // language, else TMDB's default). Not for a Russian / Belarusian interface. Russian is told by its
  // own letters (ы э ъ ё) or by CUB as the card's source. One request per title, kept (stv_loc, 400
  // titles, 30 days), two at a time, the newest cards first (40 waiting at most); anything that fails
  // leaves the card as Lampa drew it.
  var RU_ONLY = /[ыэъёЫЭЪЁ]/, locs, locQueue = [], locBusy = 0, locWait = {}, LOC_TTL = 30 * 24 * 3600 * 1000, LOC_QUEUE = 40;
  // the option and the language: read again at most every 2 s (a row's cards share one read)
  var locMemo = { at: 0, l: '' };
  function locLang() {
    if (Date.now() - locMemo.at > 2000) {
      var l = tmdbLang();
      locMemo = { at: Date.now(), l: opt(K.loc) && !/^(ru|be)/.test(l) ? l : '' };
    }
    return locMemo.l;
  }
  function needsLocal(d) {
    if (!d || typeof d.id !== 'number' || d.stv_cw || !locLang()) return false;
    return d.source === 'cub' || RU_ONLY.test(String(d.title || d.name || '') + ' ' + String(d.overview || '').slice(0, 200));
  }
  // waiters of a title: {cb, gone}; the request is skipped only when every card waiting is gone
  function getLocal(d, cb, gone) {
    var l = locLang(), key = kindOf(d) + d.id + ':' + l;
    locs = locs || Cache('stv_loc', 400);
    var have = locs.get(key);
    if (have && Date.now() - (have.at || 0) < LOC_TTL) return cb(have.t ? have : null);
    if (locWait[key]) { locWait[key].push({ cb: cb, gone: gone }); return; }
    locWait[key] = [{ cb: cb, gone: gone }];
    // a title TMDB has nothing for is kept (no asking again for LOC_TTL); a failed request is not
    var fin = function (v) {
      if (v) try { locs.set(key, v); } catch (e) {}
      var w = locWait[key] || []; delete locWait[key];
      w.forEach(function (x) { try { x.cb(v && v.t ? v : null); } catch (e) {} });
    };
    var job = function (next) {
      tmdb(kindOf(d) + '/' + d.id, function (j) {
        var t = j && (j.title || j.name);
        // TMDB's answer in another language than asked (no translation: the original) is fine, Russian is not
        fin(typeof t === 'string' && t && !RU_ONLY.test(t) ? { t: t, p: j.poster_path || '', at: Date.now() } : { at: Date.now() });
        next();
      }, function () { fin(null); next(); }, l);
    };
    job.gone = function () { return (locWait[key] || []).every(function (x) { return x.gone && x.gone(); }); };
    job.drop = function () { fin(null); };
    locQueue.push(job);
    // a long queue: the jobs of cards no longer on the page leave it (never the cards still there)
    if (locQueue.length > LOC_QUEUE) locQueue = locQueue.filter(function (j) { if (!j.gone()) return true; j.drop(); return false; });
    locPump();
  }
  function locPump() {
    while (locBusy < 2 && locQueue.length) {
      var job = locQueue.pop();   // the newest first: cards on screen now
      if (job.gone()) { job.drop(); continue; }
      locBusy++;
      job(function () { locBusy--; setTimeout(locPump, 0); });
    }
  }
  // inst: Lampa's card. A localized poster is used only once it loads: then it is the card's
  // getPosterPath (see cardEmit: Lampa takes it when the card comes into view), and a card already
  // drawn (or drawing) gets it at once
  function localCard(inst, d, size) {
    var html = inst && inst.html, el = html && (html.nodeType ? html : html[0]);
    if (!el) return;
    getLocal(d, function (v) {
      if (!v || !inDoc(el)) return;
      var t = el.querySelector('.card__title');
      if (t && v.t) t.textContent = v.t;
      var src = v.p && img(v.p, size);
      if (!src) return;
      var pre = new Image();
      pre.onload = function () {
        inst.stv_locp = src;
        var im = el.querySelector('.card__img');
        if (im && im.tagName === 'IMG' && /^https?:/.test(im.getAttribute('src') || '') && im.getAttribute('src') !== src) im.src = src;
      };
      pre.src = src;
    }, function () { return !inDoc(el); });
  }
  // Lampa's classes of a card and a row, by reference (Lampa.Maker); the function name only when Maker
  // does not know them (an older Lampa)
  var makerCls = {};   // name -> class, or null when Maker does not know it (asked once: every createInstance asks)
  function makerClass(n) {
    if (makerCls.hasOwnProperty(n)) return makerCls[n];
    // a class found is kept; one Maker does not list (yet) is asked again next time (it may register later)
    try { var M = Lampa.Maker, c = (M && M.list && M.list().indexOf(n) >= 0 && M.get(n, {})) || null; } catch (e) { return null; }
    if (c) makerCls[n] = c;
    return c;
  }
  function className(Base) {
    var c = makerClass('Card'), l = makerClass('Line');
    if (c && Base === c) return 'Card';
    if (l && Base === l) return 'Line';
    return c && l ? '' : (Base.name || '');
  }
  function hookInstances() {
    var U = Lampa.Utils, orig = U.createInstance;
    if (!orig || orig.stv) return;
    var wrapped = function (Base, element) {
      try {
        if (element && typeof Base === 'function') {
          var name = className(Base);
          if (!themeOn()) { if (name === 'Card') cardRestore(element); }
          else {
            var scr = screenNow();
            if (name === 'Line') lineHook(element, scr);
            if (name === 'Card' && isTitleData(element)) cardHook(element, scr);
          }
        }
      } catch (e) { log(e && e.message); }
      return orig.apply(this, arguments);
    };
    wrapped.stv = true;
    U.createInstance = wrapped;
  }
  // a logo over the frame — only for cards on screen or on the next screen
  var cardIO = null, watched = [], rowIOs = [];
  // a page closed: its cards never seen leave the observer (they kept the page's nodes and data alive);
  // the episode rows' observers of closed pages stop (a card the row never showed was held by its
  // observer, and through the card's handlers the whole closed card page: ~900 nodes a visit).
  // Only the destroyed page's (slide: its .activity): Lampa also takes the page two steps back out of
  // the document (kept, shown again after Back) - its observers stay. A node in no page and out of the
  // document (a row rebuilt) goes too
  function slideOf(n) { while (n && !(n.classList && n.classList.contains('activity'))) n = n.parentNode; return n || null; }
  function pruneWatched(slide) {
    var gone = function (el) { if (inDoc(el)) return false; var s = slideOf(el); return s ? s === slide : true; };
    rowIOs = rowIOs.filter(function (r) { if (!gone(r.el)) return true; r.io.disconnect(); return false; });
    if (!cardIO) return;
    watched = watched.filter(function (el) { if (!gone(el)) return true; cardIO.unobserve(el); return false; });
  }
  function cardLogo(el) {
    var view = el.querySelector('.card__view'), d = el.card_data || el.stv_data;
    if (view && d && !view.querySelector('.stv-card-logo')) logoInto(view, d, tmdbSize('logo', view.offsetWidth * 0.58), 'stv-card-logo', el);
  }
  function watchCard(el) {
    if (!cardIO && window.IntersectionObserver) {
      cardIO = new IntersectionObserver(function (list) {
        list.forEach(function (x) { if (x.isIntersecting) { cardIO.unobserve(x.target); var i = watched.indexOf(x.target); if (i >= 0) watched.splice(i, 1); cardLogo(x.target); } });
      }, { rootMargin: '100% 100% 100% 0px' });
    }
    if (cardIO) { cardIO.observe(el); watched.push(el); }
    else el.addEventListener('visible', function once() { el.removeEventListener('visible', once); cardLogo(el); });
  }
  function wideCard(html, d) {
    var el = html && (html.nodeType ? html : html[0]);
    if (!el) return;
    el.stv_data = d;
    watchCard(el);
    if (d && d.stv_cw) cwFooter(el, d);
  }
  // "Up Next": progress and S2, E5 (a series) or the time left (a movie)
  function cwFooter(el, d) {
    var view = el.querySelector('.card__view');
    if (!view) return;
    el.classList.add('stv-cw-card');
    var serial = kindOf(d) === 'tv', label = '', pct = 0;
    try {
      if (serial) {
        // an episode left unfinished: it, its progress and the time left; watched to the end: the next one
        var lw = lastWatched(d);
        if (lw && lw.pct < 90) { label = 'S' + lw.s + ', E' + lw.e + (lw.left > 0 ? ' · ' + runtimeText(lw.left) : ''); pct = lw.pct; }
        else if (lw) { var nx = nextAfter(d, lw.s, lw.e); label = 'S' + nx.s + ', E' + nx.e; }
        else { var sp = startPoint(d, 0, lw); if (sp.s) { label = 'S' + sp.s + ', E' + sp.e; pct = (epView(d, sp.s, sp.e).percent) || 0; } }
      } else {
        var v = movieView(d);
        pct = v.percent || 0;
        if (v.duration && v.time) { var left = Math.round((v.duration - v.time) / 60); if (left > 0) label = runtimeText(left); }
      }
    } catch (e) {}
    var f = document.createElement('div');
    f.className = 'stv-cw';
    f.innerHTML = (pct > 0 ? '<div class="stv-cw__bar"><div style="width:' + Math.max(6, Math.min(100, pct)) + '%"></div></div>' : '') + '<span></span>';
    f.lastChild.textContent = label;
    view.appendChild(f);
  }
  // Apple's order on Home: the banner, then "Up Next", then the rest. Done on Lampa's first batch of
  // rows before they are built (a handler put first), so the remote moves in the shown order.
  function homeOrder(e) {
    if (e.type !== 'init' || e.component !== 'main') return;
    var comp = e.object && e.object.activity && e.object.activity.component;
    if (!comp || typeof comp.use !== 'function') return;
    comp.use({ onBuild: function (rows) {
      try {
        if (!themeOn() || !rows || !rows.length) return;
        cwTitles();
        var hero = -1, cw = -1;
        rows.forEach(function (r, i) {
          if (r && r.params && r.params.createInstance && r.results && r.results[0] && r.results[0].title === HERO_MARK) hero = i;
          if (r && r.title && r.title === cwTitle) cw = i;
        });
        if (cw > 0) { var row = rows.splice(cw, 1)[0]; rows.splice(hero >= 0 ? (hero < cw ? hero + 1 : hero) : 0, 0, row); }
      } catch (x) { log(x && x.message); }
    } }, 0);
  }

  // ================= home: the hero banner =================
  // Slides: what is being watched (Lampa's history + timelines, a series with its next episode),
  // then TMDB's trending titles, the ones known to have a Ukrainian voice-over first. One TMDB call
  // per slide (details + logos), only for the slide shown and the next one.
  var ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.9-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z" fill="currentColor"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10.5v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="7.4" r="1.4" fill="currentColor"/></svg>';
  // sections: 'main' (Home: everything), 'movie', 'tv', 'anime' (the left menu's sections)
  function animeLike(d) {
    var a = false;
    (d.genre_ids || []).forEach(function (g) { if (g == 16) a = true; });
    (d.genres || []).forEach(function (g) { if (g && g.id == 16) a = true; });
    return a && (!d.original_language || /^(ja|zh|ko)$/.test(d.original_language));
  }
  function inSection(d, sec) {
    if (sec === 'main') return true;
    if (sec === 'anime') return animeLike(d);
    var g = /^(movie|tv)\/(\d+)$/.exec(sec);
    if (g) {   // a genre page (Cartoons, a genre from the Catalog): that kind with that genre
      var ids = d.genre_ids || (d.genres || []).map(function (x) { return x && x.id; });
      return kindOf(d) === g[1] && ids.indexOf(+g[2]) >= 0;
    }
    return kindOf(d) === sec && !animeLike(d);
  }
  // the banner as a row of Lampa's list (homeOrder finds it by the mark)
  var HERO_MARK = 'hero';
  function heroRow(sec) { return { title: '', results: [{ id: 1, title: HERO_MARK }], params: { createInstance: function () { return new Hero(sec); } } }; }
  var HERO_SRC = { main: 'trending/all/week', movie: 'trending/movie/week', tv: 'trending/tv/week',
    anime: 'discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc' };
  // TMDB's trending list is kept 30 min per section; «watching now» and the Ukrainian-first order are
  // local and cheap, so they are worked out on every call (a title just finished leaves at once). A
  // title keeps one entry, so its details fetched once (details(): item.src.full) stay with it.
  var heroCaches = {}, heroEntries = {};
  function heroItems(sec, cb) {
    var out = [], seen = {};
    function add(d, watching) {
      if (!d || !d.id || !d.backdrop_path) return;
      var key = kindOf(d) + d.id;
      if (seen[key]) return;
      seen[key] = 1;
      var x = heroEntries[key] || (heroEntries[key] = { d: d });
      x.watching = watching;
      out.push(x);
    }
    // 1. watching now
    try {
      var hist = (Lampa.Favorite.get({ type: 'history' }) || []).slice(0, 12), last = watchedLast();
      var n = 0;
      hist.forEach(function (d) {
        if (n >= 2 || !d || !inSection(d, sec)) return;
        var w = false;
        if (kindOf(d) === 'tv') {
          // one source for «watching» and the button's text: Autopilot when it is there (its button says
          // «Continue» exactly when it has an episode to go on with), else Lampa's online plugin
          var aa = autoApi('label');
          if (aa) { try { w = !!aa.label(d).season; } catch (e) { w = false; } }
          else w = anyWatched(d) || !!last[titleHash(d)];   // Lampa's timelines; its online plugin's mark too
        }
        else { var v = movieView(d); w = v.percent > 2 && v.percent < 90; }
        if (w) { add(d, true); n++; }
      });
    } catch (e) {}
    // 2. trending, Ukrainian voice-over first
    function fill(list) {
      if (window.snack_ua) list = list.filter(function (d) { return hasUa(d); }).concat(list.filter(function (d) { return !hasUa(d); }));
      list.forEach(function (d) { if (out.length < 6) add(d, false); });
      cb(out);
    }
    var hc = heroCaches[sec];
    if (hc && Date.now() - hc.at < 30 * 60000) return fill(hc.list);
    var gs = /^(movie|tv)\/(\d+)$/.exec(sec);
    tmdb(HERO_SRC[sec] || (gs ? 'discover/' + gs[1] + '?with_genres=' + gs[2] + '&sort_by=popularity.desc' : HERO_SRC.main), function (j) {
      var list = ((j && j.results) || []).filter(function (d) { return (!d.media_type || d.media_type === 'movie' || d.media_type === 'tv') && d.backdrop_path && !d.adult; });
      heroCaches[sec] = { list: list, at: Date.now() };
      fill(list);
    }, function () { cb(out); });
  }
  // a slide's full data (details + logos): one request per title — callers asking while it is on its
  // way wait for it, and the answer stays with the cached list (item.src) for the next Home
  function details(item, cb) {
    if (!item.full && item.src && item.src.full) item.full = item.src.full;
    if (item.full) return cb(item.full);
    if (item.wait) { item.wait.push(cb); return; }
    item.wait = [cb];
    var d = item.d, kind = kindOf(d), langs = logoLangs();
    function done(r) { var w = item.wait; item.wait = null; w.forEach(function (f) { f(r); }); }
    tmdb(kind + '/' + d.id + '?append_to_response=images&include_image_language=' + langs.join(',') + ',null', function (j) {
      if (j && j.id) {
        j.source = 'tmdb'; if (kind === 'tv') { j.original_title = j.original_name; }
        item.full = j; if (item.src) item.src.full = j;
        if (j.images && j.images.logos) logoCache().set(logoKey(j, langs), pickLogo(j.images.logos));
      }
      done(item.full || d);
    }, function () { done(d); });
  }
  function Hero(sec) {
    sec = sec || 'main';
    var self = this, items = [], idx = 0, timer = 0, touched = 0, alive = true, shownAt = 0, loaded = false;
    var el = document.createElement('div');
    el.className = 'stv-hero';
    el.innerHTML = '<div class="stv-hero__slides"></div><div class="stv-hero__scrim"></div>' +
      '<div class="stv-hero__info"><div class="stv-hero__title"></div><div class="stv-hero__meta"></div><div class="stv-hero__text"></div>' +
      '<div class="stv-hero__btns"><div class="stv-hero__btn stv-hero__btn--play selector">' + ICON_PLAY + '<span></span></div>' +
      '<div class="stv-hero__btn stv-hero__btn--round stv-hero__btn--info selector">' + ICON_INFO + '</div></div></div><div class="stv-hero__dots"></div>';
    var slides = el.firstChild, info = el.querySelector('.stv-hero__info'), dots = el.querySelector('.stv-hero__dots');
    var bPlay = el.querySelector('.stv-hero__btn--play'), bInfo = el.querySelector('.stv-hero__btn--info');
    rowBase(this, el);
    function cur() { return items[idx]; }
    function open(item) { var d = item.full || item.d; Lampa.Activity.push({ url: '', component: 'full', id: d.id, method: kindOf(d), card: d, source: 'tmdb' }); }
    function play(item) {
      var a = autoApi('press');
      details(item, function (d) {
        if (a) a.press(d, 'stv_hero'); else open(item);
      });
    }
    function bg(i) {
      var it = items[i];
      if (!it) return null;
      if (!it.img) {
        var box = document.createElement('div'); box.className = 'stv-hero__slide';
        var im = new Image(); im.alt = '';
        if (portrait() && it.d.poster_path) { im.src = img(it.full ? cleanPoster(it.full) : it.d.poster_path, tmdbSize('poster', window.innerWidth)); box.classList.add('stv-hero__slide--poster'); }
        else im.src = img(it.d.backdrop_path, tmdbSize('backdrop', window.innerWidth));
        box.appendChild(im); slides.appendChild(box); it.img = box;
      }
      return it.img;
    }
    function fill(item) {
      details(item, function (d) {
        if (item !== cur()) return;
        var t = info.querySelector('.stv-hero__title');
        t.className = 'stv-hero__title';
        t.textContent = d.title || d.name || '';
        titleLen(t, t.textContent);
        logoInto(t, d, tmdbSize('logo', T[M].logoW * k), null, null, function () { return alive && item === cur(); });
        var meta = [esc(kindLabel(d))];
        (d.genres || []).slice(0, 2).forEach(function (x) { meta.push(esc(capFirst(x.name))); });
        var y = yearOf(d); if (y) meta.push(esc(y));
        if (d.vote_average) meta.push('★ ' + (Math.round(d.vote_average * 10) / 10));
        info.querySelector('.stv-hero__meta').innerHTML = meta.join(' · ') + (hasUa(d) ? ' &nbsp;<span class="stv-badge stv-ua">UA</span>' : '');
        info.querySelector('.stv-hero__text').textContent = d.overview || '';
        var label = tr('watch');
        try { var a = autoApi('label'); if (item.watching && a) label = a.label(d).text; } catch (e) {}
        bPlay.querySelector('span').textContent = se(label);
        info.classList.remove('fade');
      });
    }
    function show(i, now) {
      if (!items.length) return;
      idx = (i + items.length) % items.length;
      var s = bg(idx);
      Array.prototype.forEach.call(slides.children, function (x) { x.classList.toggle('on', x === s); });
      Array.prototype.forEach.call(dots.children, function (x, j) { x.classList.toggle('on', j === idx); });
      if (now) fill(cur());
      else { info.classList.add('fade'); setTimeout(function () { fill(cur()); }, 300); }
      shownAt = Date.now();
      trailer();
      // the next slide's picture, ahead of time (after its details: phones take the art without text)
      var nx = (idx + 1) % items.length;
      details(items[nx], function () { if (alive) bg(nx); });
    }
    // a muted trailer behind the slide (iPad / browsers; the «Трейлеры» plugin plays it)
    var trailerFor = null, trailerTimer = 0;
    function trailer() {
      clearTimeout(trailerTimer);
      var api = window.alc_trailers_api;
      if (trailerFor) { trailerFor = null; try { if (api) api.stop(); } catch (e) {} }
      if (!api || !api.bg) return;   // alc_trailers decides whether (its setting, and lite() via snack_tv.trailers)
      var it = cur();
      trailerTimer = setTimeout(function () {
        if (it !== cur() || !it.img || !vis()) return;
        details(it, function (d) {
          if (it !== cur()) return;
          trailerFor = it;
          api.bg(it.img, d, function () { return alive && trailerFor === it && it === cur() && vis(); });
        });
      }, 2500);
    }
    function vis() { return inDoc(el) && $(el).closest('.activity--active').length && !document.hidden; }
    function tick() {
      if (!alive) return;
      // a slide with its trailer stays longer
      if (trailerFor && trailerFor === cur() && Date.now() - shownAt < 45000) return;
      var busy = Date.now() - touched < 8000;
      try { busy = busy || Lampa.Player.opened(); } catch (e) {}
      if (vis() && !busy && items.length > 1) show(idx + 1);
    }
    function poke() { touched = Date.now(); }
    this.create = function () {
      setTimeout(function () { var act = $(el).closest('.activity'); if (act.length) act.addClass('stv-home'); }, 0);
      heroItems(sec, function (list) {
        if (!alive) return;
        // own copies: the list is cached for other Home pages, the slide boxes belong to this one
        items = list.map(function (x) { return { d: x.d, watching: x.watching, full: x.full, src: x }; });
        loaded = true;
        if (!items.length) { el.style.display = 'none'; return; }
        var act = $(el).closest('.activity');
        if (act.length) act.addClass('stv-home');
        dots.innerHTML = items.map(function () { return '<div class="stv-hero__dot"></div>'; }).join('');
        if (portrait()) details(items[0], function () { if (alive) show(0, true); });
        else show(0, true);
        timer = setInterval(tick, 8000);
      });
      $(bPlay).on('hover:enter', function () { poke(); if (cur()) play(cur()); });
      $(bInfo).on('hover:enter', function () { poke(); if (cur()) open(cur()); });
      $([bPlay, bInfo]).on('hover:focus', function () { poke(); self.emit('active'); });
      // iPad: a tap on the picture opens the title, a swipe changes the slide
      var x0 = null, y0 = 0;
      el.addEventListener('touchstart', function (e) { poke(); x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      el.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(idx + (dx < 0 ? 1 : -1));
      }, { passive: true });
      slides.addEventListener('click', function () { if (cur()) open(cur()); });
    };
    this.toggle = function () {
      // nothing to show (TMDB down, nothing watched) or the theme was switched off: the next row
      if ((loaded && !items.length) || !themeOn()) { setTimeout(function () { self.emit(lastDir === 'up' ? 'up' : 'down'); }, 0); return; }
      poke();
      Lampa.Controller.add('stv_hero', {
        link: self,
        toggle: function () { Lampa.Controller.collectionSet(el); Lampa.Controller.collectionFocus(bPlay, el); self.emit('toggle'); self.emit('active'); },
        right: function () { poke(); if (Navigator.canmove('right')) Navigator.move('right'); else show(idx + 1); },
        left: function () { poke(); if (Navigator.canmove('left')) Navigator.move('left'); else self.emit('left'); },
        up: function () { self.emit('up'); },
        down: function () { self.emit('down'); },
        back: function () { self.emit('back'); }
      });
      Lampa.Controller.toggle('stv_hero');
    };
    this.destroy = function () { alive = false; clearInterval(timer); clearTimeout(trailerTimer); try { if (trailerFor && window.alc_trailers_api) window.alc_trailers_api.stop(); } catch (e) {} if (el.parentNode) el.parentNode.removeChild(el); };
  }
  // which banner a page gets: Home, Movies / Series / Anime from the left menu, genre pages
  function heroSection(component, o) {
    if (component === 'main') return 'main';
    if (component === 'category' && !o.genres && !o.keywords && /^(movie|tv|anime)$/.test(o.url || '')) return o.url;
    // a genre page (Cartoons in the menu, a genre from the Catalog): a banner of that genre, as Apple's genre pages
    if (component === 'category' && !o.keywords && /^(movie|tv)$/.test(o.url || '') && /^\d+$/.test(String(o.genres || ''))) return o.url + '/' + o.genres;
    return '';
  }
  function addHeroRow() {
    try {
      if (!Lampa.ContentRows || !Lampa.ContentRows.add) return;
      Lampa.ContentRows.add({
        name: 'stv_hero', title: tr('name'), index: 0, screen: ['main', 'category'],
        call: function (params, screen) {
          if (started ? !themeOn() : !themeWanted()) return null;
          var sec = heroSection(screen === 'category' ? 'category' : 'main', params || {});
          if (!sec) return null;
          return function (call) { call(heroRow(sec)); };
        }
      });
    } catch (e) { log(e && e.message); }
  }
  // Lampa adds no extra rows to genre pages (its own stop list): the banner goes in front of the
  // first batch of rows the source hands the page
  function genreHero() {
    try {
      ['tmdb', 'cub'].forEach(function (name) {
        var src = Lampa.Api && Lampa.Api.sources && Lampa.Api.sources[name];
        if (!src || typeof src.category !== 'function' || src.category.stv) return;
        var orig = src.category;
        src.category = function (params, oncomplite, onerror) {
          var sec = '';
          try { if (themeOn() && params && params.genres) sec = heroSection('category', params); } catch (e) {}
          if (!sec || typeof oncomplite !== 'function') return orig.apply(this, arguments);
          var first = true;
          return orig.call(this, params, function (data) {
            if (first && data && data.unshift) { first = false; data.unshift(heroRow(sec)); }
            oncomplite.apply(this, arguments);
          }, onerror);
        };
        src.category.stv = true;
      });
    } catch (e) { log(e && e.message); }
  }

  // ================= the person page: Apple's header =================
  // A wide band of the portrait blurred, the round portrait on it, the name and the biography (4 lines,
  // «more» opens it). Lampa builds the header after its request: looked for a moment later
  function themePerson(act, tries) {
    tries = tries || 0;
    var render = act && act.activity && act.activity.render && act.activity.render();
    var start = render && render.find('.person-start').first();
    if (!start || !start.length) { if (tries < 25) setTimeout(function () { themePerson(act, tries + 1); }, 200); return; }
    if (start.hasClass('stv-pstart')) return;
    start.addClass('stv-pstart');
    render.addClass('stv-person');
    var src = start.find('.person-start__img').attr('src') || '';
    if (src) {
      var band = document.createElement('div');
      band.className = 'stv-pband';
      band.style.backgroundImage = 'url(' + resized(src, 'w185') + ')';
      start.prepend(band);
    }
    var id = act.id || (act.card && act.card.id);
    if (!id) return;
    var bio = function (text) {   // text: plainText already
      if (!text || start.find('.stv-desc').length) return;
      var el = $('<div class="stv-desc stv-pbio"><div class="stv-desc__text"></div><div class="stv-desc__more"></div></div>');
      el.find('.stv-desc__text').text(text);
      el.find('.stv-desc__more').text(tr('more'));
      if (text.length > (M === 'tv' ? 300 : 240)) el.addClass('long');
      el.on('click', function () { el.toggleClass('open'); el.find('.stv-desc__more').text(el.hasClass('open') ? tr('less') : tr('more')); });
      start.find('.person-start__name').after(el);
    };
    tmdb('person/' + id, function (j) {
      var text = plainText(j && j.biography);
      if (text) bio(text);
      else tmdb('person/' + id, function (e) { bio(plainText(e && e.biography)); }, null, 'en-US');
    });
  }

  // ================= People (the left menu): a grid of round portraits =================
  // Apple TV has no people browse page; the closest is «Cast & Crew — See All»: circles, the name, a line
  // under it. The grid is Lampa's own (the class of «See all» pages, with its paging and remote): TMDB's
  // popular people, a tap opens Lampa's person page. Theme off (or an older Lampa): Lampa's own section.
  function peopleData(j) {
    // as Lampa's own section: actors and directors with a portrait; and a name readable in the interface
    // script (TMDB gives the native name when it has none in the language: 金城武 for a Russian interface)
    // (readable: Latin and Cyrillic letters only — CJK, Indic, Thai… would be boxes or unreadable here)
    function readable(x) { return !!x && !/[^\u0000-\u024F\u0400-\u04FF\u2000-\u206F\u2116]/.test(x); }
    var list = ((j && j.results) || []).filter(function (p) {
      return p && p.id && p.profile_path && !p.adult && /^(Acting|Directing)$/.test(p.known_for_department || '') && readable(p.name);
    });
    list.forEach(function (p) {
      p.source = 'tmdb';
      p.stv_known = (p.known_for || []).map(function (k) { return k.title || k.name || ''; }).filter(readable).slice(0, 2).join(', ');
    });
    return { results: list, page: j && j.page, total_pages: Math.min((j && j.total_pages) || 1, 50) };
  }
  function PeopleGrid(object) {
    var mod = Lampa.Maker.module('Category'), page = 1;
    var comp = Lampa.Utils.createInstance(Lampa.Maker.get('Category', object), object, { module: mod.MASK.base | mod.MASK.Pagination });
    function load(n, ok, fail) { tmdb('person/popular?page=' + n, function (j) { ok(peopleData(j)); }, fail); }
    comp.use({
      onCreate: function () {
        var self = this;
        try { object.activity.render().addClass('stv-people'); } catch (e) {}
        load(1, function (d) { if (d.results.length) self.build(d); else self.empty(); }, function () { self.empty(); });
      },
      onNext: function (resolve, reject) { var self = this; page++; load(page, function (d) { resolve.call(self, d); }, function () { reject.call(self); }); },
      onInstance: function (item, data) {
        item.use({ onEnter: function () { Lampa.Activity.push({ url: '', title: data.name, component: 'actor', id: data.id, source: 'tmdb' }); } });
        // «known for» under the name: the card's element exists once Lampa has built it
        function known() {
          try {
            var el = item.render && item.render(true);
            if (!el || !data.stv_known || el.querySelector('.stv-known')) return !!el;
            var k = document.createElement('div'); k.className = 'stv-known'; k.textContent = data.stv_known; el.appendChild(k);
            return true;
          } catch (e) { return true; }
        }
        if (!known()) setTimeout(known, 0);
      }
    });
    return comp;
  }

  // ================= Schedule (the left menu): new episodes of the bookmarked series =================
  // Lampa's page is a 30-day calendar, one cell per day, most of them empty. Apple TV has no calendar;
  // here what is coming is Apple's episode cards grouped by day («Today», «Tomorrow», «Friday, 10
  // October»), then what came out in the last two weeks. Lampa's own data (TimeTable: the season on air
  // of every bookmarked series, from TMDB). Nothing there: how to fill it.
  var SCHED_AHEAD = 30, SCHED_BACK = 14, DAY_MS = 864e5;
  function scheduleData() {
    var cards = [], byId = {}, days = {}, out = { tracked: 0, days: [], recent: [] };
    try { cards = Lampa.Favorite.full().card || []; } catch (e) {}
    try { if (Lampa.Account.Permit.sync) cards = Lampa.Account.Bookmarks.all() || cards; } catch (e) {}
    cards.forEach(function (c) { if (c && c.id) byId[c.id] = c; });
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    ((Lampa.TimeTable && Lampa.TimeTable.all()) || []).forEach(function (row) {
      var card = row && byId[row.id], seen = {};
      if (!card) return;
      out.tracked++;
      (row.episodes || []).concat(row.next ? [row.next] : []).forEach(function (ep) {
        var key = ep && ep.season_number + ':' + ep.episode_number;
        if (!ep || !ep.air_date || seen[key]) return;
        seen[key] = 1;
        var d = Math.round((Lampa.Utils.parseToDate(ep.air_date).getTime() - today.getTime()) / DAY_MS), it = { card: card, ep: ep, d: d };
        if (d >= 0 && d < SCHED_AHEAD) (days[d] = days[d] || []).push(it);
        else if (d < 0 && d >= -SCHED_BACK) out.recent.push(it);
      });
    });
    var byName = function (a, b) { return String(a.card.name || '').localeCompare(String(b.card.name || '')); };
    Object.keys(days).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) { out.days.push({ d: d, items: days[d].sort(byName) }); });
    out.recent.sort(function (a, b) { return b.d - a.d || byName(a, b); });
    return out;
  }
  function dayTitle(d, date) {
    if (d === 0) return tr('today');
    if (d === 1) return tr('tomorrow');
    var p = Lampa.Utils.parseTime(date), w = String(p.week || '');
    return (w ? w.charAt(0).toUpperCase() + w.slice(1) + ', ' : '') + String(p.full).toLowerCase();
  }
  function Schedule(object) {
    var self = this, last = null;
    var scroll = new Lampa.Scroll({ mask: false, over: true, step: 300 });
    var html = $('<div class="stv-tt"></div>'), body = $('<div class="stv-tt__body"></div>');
    function open(card) { Lampa.Activity.push({ url: '', component: 'full', id: card.id, method: 'tv', card: card, source: card.source || 'tmdb' }); }
    function focusable(el) {
      $(el).on('hover:focus', function () { last = el; scroll.update($(el), true); })
        .on('hover:hover', function () { last = el; try { Navigator.focused(el); } catch (e) {} });
      return el;
    }
    // a card: the still (the series' backdrop until TMDB has one), «S2 · E5», the series, the episode
    function card(it, aired) {
      var ep = it.ep, m = it.card, s = ep.season_number, n = ep.episode_number;
      var name = goodName(ep.name, uiScript()) ? ep.name : '';
      var el = epCard({ still: ep.still_path || m.backdrop_path, cap: tr('se_ep', s, n), name: m.name || m.title, descr: name,
        time: n === 1 ? tr('premiere', s) : '', pct: aired ? epView(m, s, n).percent : 0 });
      // out already: play it (Autopilot); coming: the series' page
      $(focusable(el)).on('hover:enter', function () {
        var a = aired && autoApi('playEpisode');
        if (a) a.playEpisode(m, s, n); else open(m);   // a cancel returns to the focused controller
      });
      loadImg(el);
      return el;
    }
    function section(title, sub, items, aired) {
      body.append($('<div class="stv-tt__day"></div>').text(title).append(sub ? $('<span></span>').text(sub) : ''));
      var grid = $('<div class="stv-tt__grid"></div>');
      items.forEach(function (it) { grid.append(card(it, aired)); });
      body.append(grid);
    }
    function empty(data) {
      var list = Lampa.Lang.translate('settings_input_links');
      var box = $('<div class="stv-tt__empty"><div class="stv-tt__icon"></div><div class="stv-tt__etitle"></div><div class="stv-tt__etext"></div></div>');
      box.find('.stv-tt__icon').html(CAL);
      box.find('.stv-tt__etitle').text(data.tracked ? tr('tt_none') : tr('tt_empty'));
      var others = ['title_look', 'title_wath', 'title_like'].map(function (x) { return '«' + Lampa.Lang.translate(x) + '»'; }).join(', ');
      box.find('.stv-tt__etext').text(data.tracked ? tr('tt_none_d', data.tracked) : tr('tt_empty_d', list, others));
      if (!data.tracked) {
        var btn = $('<div class="stv-tt__btn selector"></div>').text(tr('tt_open', list));
        $(focusable(btn[0])).on('hover:enter', function () {
          try { Lampa.Router.call('bookmarks', { title: list }); } catch (e) { Lampa.Activity.push({ url: '', title: list, component: 'bookmarks', page: 1 }); }
        });
        box.append(btn);
      }
      body.append(box);
    }
    this.create = function () {
      var data = { tracked: 0, days: [], recent: [] }, now = new Date();
      try { data = scheduleData(); } catch (e) { log(e && e.message); }
      body.append($('<div class="stv-tt__head"></div>').append($('<div class="stv-tt__title"></div>').text(object.title || tr('tt_title')),
        $('<div class="stv-tt__sub"></div>').text(tr('tt_sub'))));
      data.days.forEach(function (g) {
        var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + g.d);
        section(dayTitle(g.d, date), g.d > 1 ? tr('in_days', g.d) : '', g.items, g.d === 0);
      });
      if (data.recent.length) section(tr('tt_recent'), '', data.recent.slice(0, 24), true);
      if (!data.days.length && !data.recent.length) empty(data);
      scroll.minus();
      scroll.append(body);
      html.append(scroll.render());
      this.activity.loader(false);
      this.activity.toggle();
      return this.render();
    };
    // up / down: the nearest card of the row above / below, even when nothing sits straight under the
    // focus (a day of one card under a day of three; Lampa's Navigator stays put then)
    function vertical(dir) {
      if (!last || !inDoc(last)) return false;
      var r = last.getBoundingClientRect(), best = null, score = Infinity;
      body.find('.selector').each(function () {
        var q = this.getBoundingClientRect(), dy = dir > 0 ? q.top - r.bottom : r.top - q.bottom;
        if (this === last || dy < -2) return;
        var sc = dy * 3 + Math.abs(q.left - r.left);
        if (sc < score) { score = sc; best = this; }
      });
      if (best) Lampa.Controller.collectionFocus(best, scroll.render());
      return !!best;
    }
    this.start = function () {
      var N = window.Navigator, C = Lampa.Controller;
      C.add('content', {
        link: self,
        toggle: function () { C.collectionSet(scroll.render()); C.collectionFocus(last || false, scroll.render()); },
        left: function () { if (N.canmove('left')) N.move('left'); else C.toggle('menu'); },
        right: function () { N.move('right'); },
        up: function () { if (!vertical(-1)) C.toggle('head'); },
        down: function () { vertical(1); },
        back: function () { Lampa.Activity.backward(); }
      });
      C.toggle('content');
    };
    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return html; };
    this.destroy = function () { scroll.destroy(); html.remove(); };
  }
  var CAL = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4.5" width="18" height="16.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="14" r="1.2" fill="currentColor"/><circle cx="12" cy="14" r="1.2" fill="currentColor"/><circle cx="16" cy="14" r="1.2" fill="currentColor"/></svg>';

  // a section of the left menu the theme draws its own way while it is on (People, Schedule); theme off
  // (or the page fails to build): Lampa's own
  var lampaSections = {};
  function hookSection(name, make) {
    try {
      if (lampaSections[name] || !Lampa.Component || !Lampa.Component.get) return;
      var own = Lampa.Component.get(name);
      if (typeof own !== 'function') return;
      lampaSections[name] = own;
      Lampa.Component.add(name, function (object) {
        if (themeOn()) try { return make(object); } catch (e) { log(e && e.message); }
        return new own(object);
      });
    } catch (e) { log(e && e.message); }
  }

  // ---------- the pack's settings folders (the same block in every plugin of the pack) ----------
  // Lampa lists a folder's items in the order plugins added them, and the pack's plugins load in any
  // order. Here each item names its group and its place in it; when Lampa draws a folder (it reads the
  // list through getParam every time) the list comes in that order, an item whose snack_show() says no
  // is left out, and a group with nothing left loses its title. «Закусь», the pack's own folder, is a
  // menu of sub-folders (Lampa components hidden from Settings' own list, opened from «Закусь» with
  // Back leading to it): items are still added to «Закусь» with a group, and the group decides the
  // sub-folder they are drawn in (copies of an older block, loaded first, keep working the same way).
  // Its last group, «О паке», lists the installed plugins' versions and resets the pack's options (not
  // the data: favourite voices, subscriptions…). The newest copy of this block serves all.
  var PACKSET_V = 5;
  function packSettings() {
    var S = window.snack_set;
    if (S && S.v >= PACKSET_V) return S;
    var api = Lampa.SettingsApi, old = S || {};
    function L(a) { var l = 'ru'; try { l = String(Lampa.Storage.get('language', 'ru') || 'ru'); } catch (e) {} return a[l === 'uk' ? 1 : l === 'ru' || l === 'be' ? 0 : 2]; }
    var TXT = {
      about: ['О паке', 'Про пак', 'About the pack'], versions: ['Версии', 'Версії', 'Versions'],
      reset: ['Сбросить настройки', 'Скинути налаштування', 'Reset settings'],
      reset_d: ['Все пункты «Закуси», кроме ваших данных (озвучки, подписки) и адреса сервера', 'Усі пункти «Закусі», крім ваших даних (озвучення, підписки) й адреси сервера', 'Every «Закусь» option, not your data (voices, subscriptions) nor the server address'],
      reset_q: ['Сбросить настройки «Закуси»?', 'Скинути налаштування «Закусі»?', 'Reset the «Закусь» settings?'],
      yes: ['Сбросить', 'Скинути', 'Reset'], no: ['Отмена', 'Скасувати', 'Cancel'],
      watch: ['Просмотр', 'Перегляд', 'Watching'],
      watch_d: ['Автопилот: запуск, озвучки, источники', 'Автопілот: запуск, озвучення, джерела', 'Autopilot: playback, voices, sources'],
      langs: ['Языки и субтитры', 'Мови й субтитри', 'Languages and subtitles'],
      langs_d: ['Порядок языков озвучки и субтитров', 'Порядок мов озвучення й субтитрів', 'The order of voice and subtitle languages'],
      cards: ['Главная и карточки', 'Головна й картки', 'Home and cards'],
      cards_d: ['Метка UA, трейлеры, фильтр ленты', 'Мітка UA, трейлери, фільтр стрічки', 'UA badge, trailers, feed filter'],
      feed: ['Фильтр ленты', 'Фільтр стрічки', 'Feed filter'],
      feed_d: ['Что прятать в лентах TMDB и CUB', 'Що ховати у стрічках TMDB і CUB', 'What to hide from the TMDB and CUB lists'],
      subs: ['Подписки', 'Підписки', 'Subscriptions'],
      subs_d: ['Новые серии в выбранной озвучке', 'Нові серії в обраному озвученні', 'New episodes in a chosen voice'],
      server: ['Сервер', 'Сервер', 'Server'],
      server_d: ['Ваш сервер с онлайн-источниками', 'Ваш сервер з онлайн-джерелами', 'Your server with online sources']
    };
    S = window.snack_set = { v: PACKSET_V, pages: old.pages || {}, versions: old.versions || {}, seq: old.seq || 0, titled: old.titled || {}, txt: function (k) { return L(TXT[k] || [k, k, k]); } };
    // the sub-folders of «Закусь»: the groups drawn in them, their parent, their place in it
    var SUBS = [
      { id: 'snack_watch', group: 'watch', parent: 'snack', o: 10 },
      { id: 'snack_langs', group: 'langs', parent: 'snack', o: 20 },
      { id: 'snack_cards', group: 'cards', parent: 'snack', o: 30 },
      { id: 'snack_feed', group: 'feed', parent: 'snack_cards', o: 900 },
      { id: 'snack_subs', group: 'subs', parent: 'snack', o: 40 },
      { id: 'snack_server', group: 'server', parent: 'snack', o: 50, keep: true }   // keep: the viewer's own (reset leaves it)
    ];
    S.subs = SUBS;
    S.subId = {}; S.subGroup = {};
    SUBS.forEach(function (s) { S.subId[s.id] = s; S.subGroup[s.group] = s; });
    // a plugin may say what its sub-folder holds now (its button's line): S.describe(group, fn → text)
    S.descr = old.descr || {};
    S.describe = function (group, fn) { S.descr[group] = fn; };
    function subOf(group) { return S.subGroup[group] || null; }
    function subById(id) { return S.subId[id] || null; }
    if (!api.snack_get) {
      var get = api.getParam;
      api.snack_get = get;
      api.getParam = function (name) { var list = get.apply(this, arguments); try { return window.snack_set.list(name, list); } catch (e) { return list; } };
    }
    // the sub-folders are not in Settings' own list (they open from «Закусь»)
    if (!api.snack_all) {
      var all = api.allComponents;
      api.snack_all = all;
      api.allComponents = function () {
        var c = all.apply(this, arguments), out = {}, ids = (window.snack_set && window.snack_set.subId) || {};
        for (var k in c) if (!ids[k]) out[k] = c[k];
        return out;
      };
    }
    function visible(d) {
      if (d.snack_title) return true;
      try { return !d.snack_show || !!d.snack_show(); } catch (e) { return true; }
    }
    function seq(d) { if (d.snack_i === undefined) d.snack_i = ++S.seq; }
    function byPlace(a, b) { return (a.snack_o || 0) - (b.snack_o || 0) || a.snack_i - b.snack_i; }
    function inSub(d, group) { return d.snack_g === group && !d.snack_title; }
    // a sub-folder has something to show (its button is listed): the first shown item is enough
    function anyShown(group) {
      var l = api.snack_get('snack') || [];
      for (var i = 0; i < l.length; i++) if (inSub(l[i], group) && visible(l[i])) return true;
      return false;
    }
    // the list Lampa draws: shown items, by group, place, then the order they came in. «Закусь»: the
    // groups of the sub-folders leave it (their buttons stay); a sub-folder: the items of its group
    S.list = function (name, list) {
      var sub = subById(name);
      if (sub) {
        list = (api.snack_get('snack') || []).filter(function (d) { return inSub(d, sub.group); });
        list.forEach(seq);
        return list.filter(visible).sort(byPlace);
      }
      var pg = S.pages[name];
      if (!pg || !list) return list;
      if (name === 'snack') list = list.filter(function (d) { return !subOf(d.snack_g); });
      var rank = {}, used = {};
      pg.groups.forEach(function (g, i) { rank[g.id] = i; });
      var out = list.filter(function (d) {
        seq(d);
        if (d.snack_title) return true;
        var ok = visible(d);
        if (ok) used[d.snack_g] = 1;
        return ok;
      }).filter(function (d) { return !d.snack_title || used[d.snack_title]; });
      function r(d) { return d.snack_g === undefined ? pg.legacy : rank[d.snack_g] !== undefined ? rank[d.snack_g] : 99; }
      return out.sort(function (a, b) { return r(a) - r(b) || byPlace(a, b); });
    };
    // a folder: groups [{id, title}] in order; items of plugins that know no groups (an older copy of
    // this block) go at `legacy` (a group's index, may be fractional)
    S.page = function (id, def) {
      if (S.pages[id]) return S.pages[id];
      S.pages[id] = { groups: def.groups, legacy: def.legacy || 0 };
      api.addComponent({ component: id, name: def.name, icon: def.icon });
      return S.pages[id];
    };
    // an item: Lampa's addParam data, plus its group and place (snack_show: when to list it)
    S.add = function (id, group, order, data) {
      var pg = S.pages[id], g = pg && pg.groups.filter(function (x) { return x.id === group; })[0];
      if (g && g.title && !S.titled[id + '|' + group]) {
        S.titled[id + '|' + group] = 1;
        api.addParam({ component: id, param: { name: 'snack_t_' + id + '_' + group, type: 'title' }, field: { name: g.title }, snack_g: group, snack_o: -1e9, snack_title: group });
      }
      data.component = id;
      data.snack_g = group;
      data.snack_o = order;
      api.addParam(data);
    };
    // open a folder of the pack; a sub-folder's Back leads to its parent (also after Lampa redraws it),
    // the focus on the button of the sub-folder left (focus: an item's name)
    function focusIndex(id, name) {
      if (!name) return 0;
      var list = S.list(id, api.snack_get(id) || []) || [], i = 0, at = -1;
      list.forEach(function (d) { var t = d.param && d.param.type; if (t === 'title' || t === 'static') return; if (d.param.name === name) at = i; i++; });
      return at > 0 ? at : 0;
    }
    S.backTo = function (sub) { return function () { window.snack_set.open(sub.parent, 'snack_open_' + sub.group); }; };
    S.open = function (id, focus) {
      var sub = subById(id), params = {};
      if (sub) params.onBack = S.backTo(sub);
      var at = focusIndex(id, focus);
      if (at) params.last_index = at;
      Lampa.Settings.create(id, params);
    };
    // Lampa redraws a folder (Settings.update) without the params it was opened with: Back put back
    if (!api.snack_back) try {
      api.snack_back = true;
      Lampa.Settings.listener.follow('open', function (e) {
        var T = window.snack_set, s = e && T && T.subId && T.subId[e.name];
        if (s && e.params && !e.params.onBack) e.params.onBack = T.backTo(s);
      });
    } catch (e) {}
    // reset the pack's options (triggers, lists, fields of «Закусь» and its sub-folders) to their
    // defaults, after a question
    S.reset = function (id, done) {
      var back = function () { try { Lampa.Controller.toggle('settings_component'); } catch (e) {} };
      Lampa.Select.show({
        title: S.txt('reset_q'), items: [{ title: S.txt('yes'), yes: true }, { title: S.txt('no') }],
        onSelect: function (a) {
          back();
          if (!a.yes) return;
          (api.snack_get(id) || []).forEach(function (d) {
            var p = d.param || {}, sub = subOf(d.snack_g);
            if (sub && sub.keep) return;   // the viewer's own (the server address), like their data
            if (/^(trigger|select|input)$/.test(p.type) && p['default'] !== undefined) try { Lampa.Storage.set(p.name, p['default']); } catch (e) {}
          });
          try { if (done) done(); } catch (e) {}
          setTimeout(function () { try { Lampa.Settings.update(); } catch (e) {} }, 0);
        },
        onBack: back
      });
    };
    // «Закусь»: created by whichever plugin of the pack comes first; its sub-folders and their buttons
    S.version = function (name, v) { S.versions[name] = v; };
    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16l-2 16H6L4 4zm2.3 2 .3 2.5h10.8l.3-2.5H6.3z" fill="#fff"/></svg>';
    S.pack = function () {
      if (S.pages.snack && S.pages.snack.v2) return 'snack';
      window.snack_settings = true;   // older copies: the folder is there
      var made = !!S.pages.snack;
      S.pages.snack = { v2: true, groups: [{ id: 'menu' }, { id: 'about', title: S.txt('about') }], legacy: 0.5 };
      if (!made) api.addComponent({ component: 'snack', name: 'Закусь', icon: ICON });
      SUBS.forEach(function (s) {
        api.addComponent({ component: s.id, name: S.txt(s.group), icon: ICON });
        // the button: in «Закусь» (group menu) or, for a sub-folder of a sub-folder, in its parent's group
        var parent = subById(s.parent);
        S.add('snack', parent ? parent.group : 'menu', s.o, {
          param: { name: 'snack_open_' + s.group, type: 'button' }, field: { name: S.txt(s.group), description: S.txt(s.group + '_d') },
          snack_show: function () { return anyShown(s.group); },
          onRender: function (item) {
            var f = window.snack_set.descr[s.group], t = '';
            try { t = f ? f() : ''; } catch (e) {}
            if (t) item.find('.settings-param__descr').text(t);
          },
          onChange: function () { S.open(s.id); } });
      });
      var have = {};
      try { have = adopt(); } catch (e) {}
      if (!have.snack_versions) S.add('snack', 'about', 80, { param: { name: 'snack_versions', type: 'static' }, field: { name: S.txt('versions'), description: ' ' },
        onRender: function (item) {
          var v = window.snack_set.versions, list = Object.keys(v).sort().map(function (k) { return k + ' ' + v[k]; });
          item.find('.settings-param__descr').text(list.join(' · '));
        } });
      if (!have.snack_reset) S.add('snack', 'about', 90, { param: { name: 'snack_reset', type: 'button' }, field: { name: S.txt('reset'), description: S.txt('reset_d') },
        onChange: function () { window.snack_set.reset('snack'); } });
      return 'snack';
    };
    // «О паке» items an older copy added: kept (no second one), its reset button says what reset does now
    function adopt() {
      var have = {};
      (api.snack_get('snack') || []).forEach(function (d) {
        if (!d.param) return;
        have[d.param.name] = 1;
        if (d.param.name === 'snack_reset' && d.field) d.field.description = S.txt('reset_d');
      });
      return have;
    }
    // an older copy made «Закусь» already: take it over
    if (window.snack_settings && !(S.pages.snack && S.pages.snack.v2)) { delete window.snack_settings; S.pack(); }
    else try { adopt(); } catch (e) {}
    return S;
  }

  // ---------- the «Торренты» page: a release as one Apple list row ----------
  // Lampa draws a release as its whole title, a cloud of tags (resolution, every audio track, subtitles)
  // and a line of numbers. The row here: the quality pills, a short name (release type, resolution,
  // season), the size and the seeders on the right; under it the voices short (Ukrainian first, the
  // rest counted), the sound, the bitrate; then the tracker and the date. Lampa's parts stay in the row
  // (hidden: its marks and filters keep working); the full title is in the long-press menu.
  var REL_NAMES = { bdremux: 'BDRemux', remux: 'Remux', bdrip: 'BDRip', bluray: 'Blu-ray', 'blu-ray': 'Blu-ray', blueray: 'Blu-ray', 'blue-ray': 'Blu-ray', 'web-dl': 'WEB-DL', webdl: 'WEB-DL',
    'web-dlrip': 'WEB-DLRip', webrip: 'WEBRip', hdrip: 'HDRip', hdtvrip: 'HDTVRip', hdtv: 'HDTV', dvdrip: 'DVDRip', tvrip: 'TVRip', satrip: 'SATRip', camrip: 'CAMRip' };
  var REL = /(?:^|[^a-z])(bdremux|remux|bdrip|blue?-?ray|web-?dl(?:rip)?|webrip|hdtvrip|hdrip|hdtv|dvdrip|tvrip|satrip|camrip)(?![a-z])/i;
  var RES = /(?:^|[^\d])(2160|1080|720|576|480)[pрi]/i;
  var SEASON = /(?:сезон[ыи]?|season|сезони)\s*:?\s*(\d+(?:\s*[-–]\s*\d+)?)|\bS(\d{1,2})(?:E\d+)?\b/i;
  function torName(title) {
    var t = String(title || ''), m = REL.exec(t), r = RES.exec(t), sn = SEASON.exec(t), out = [];
    if (m) out.push(REL_NAMES[m[1].toLowerCase()] || m[1]);
    if (r) out.push(r[1] + 'p');   // (the pill says 4K / FHD; the name the exact lines)
    if (/(?:^|[^a-z])(?:hevc|[hx]\.?265)(?![a-z0-9])/i.test(t)) out.push('HEVC');
    if (sn) out.push(tr('tor_season', String(sn[1] || +sn[2]).replace(/\s+/g, '')));
    if (out.length) return out.join(' · ');
    // nothing known: the title's first part (before « / » or «[»)
    return t.split(/\s\/\s|\[/)[0].trim() || t;
  }
  // Lampa's ffprobe pills (<div class="m-resolution|m-audio|m-channels|…">text</div>), by kind
  function torPills(item) {
    var out = { resolution: [], audio: [], channels: [] };
    item.find('.torrent-item__ffprobe > *').each(function () {
      var k = /(?:^|\s)m-(\w+)/.exec(this.className), x = $(this).text().trim();
      if (k && out[k[1]] && x) out[k[1]].push(x);
    });
    return out;
  }
  // the voices short (a: the audio pills): Ukrainian tracks first, two shown, the rest as «+N»; without a
  // track list, the title's tail after its last «]» (rutracker writes the voices there)
  function torVoices(a, title) {
    if (!a.length) { var tail = String(title || '').split(']').pop().replace(/^[\s|,]+/, '').trim(); return tail.length > 60 ? tail.slice(0, 58) + '…' : tail; }
    var ua = a.filter(function (x) { return /^ukr|укр/i.test(x); }), rest = a.filter(function (x) { return ua.indexOf(x) < 0; });
    var list = ua.concat(rest), shown = list.slice(0, 2).join(', ');
    return list.length > 2 ? shown + ' +' + (list.length - 2) : shown;
  }
  function torRow(element, item) {
    if (!item || !item.length || item.hasClass('stv-tor-on')) return;
    // the fields Lampa prepared on the element (title, size, tracker, date, bitrate, seeds); its markup only
    // where one is missing. The pills are Lampa's own reading of ffprobe (its markup)
    var txt = function (v, sel) { v = v === undefined || v === null ? '' : String(v).trim(); return v || item.find(sel).text().trim(); };
    var title = element.title || element.Title || item.find('.torrent-item__title').text(), pills = torPills(item), q = pills.resolution;
    var seeds = parseInt(element.seeds !== undefined ? element.seeds : element.Seeders, 10) || 0, size = txt(element.size, '.torrent-item__size');
    var br = parseFloat(element.bitrate) > 0 ? element.bitrate + ' ' + Lampa.Lang.translate('torrent_item_mb') : item.find('.torrent-item__bitrate span').text().trim();
    var sub = [torVoices(pills.audio, title)].concat(pills.channels.slice(0, 1), br).filter(Boolean);
    var meta = [txt(element.tracker || element.Tracker, '.torrent-item__tracker'), txt(element.date, '.torrent-item__date')].filter(Boolean);
    if (/dolby\s*vision|(?:^|[^a-z])dv(?![a-z])/i.test(title) && q.indexOf('DV') < 0) q.push('DV');
    var top = q.map(function (x) { return '<span class="stv-tor__q' + (/^(4K|HDR|DV)/i.test(x) ? ' stv-tor__q--hi' : '') + '">' + esc(x) + '</span>'; }).join('');
    var row = $('<div class="stv-tor"><div class="stv-tor__l"><div class="stv-tor__top">' + top + '<span class="stv-tor__name">' + esc(torName(title)) + '</span></div>' +
      '<div class="stv-tor__sub">' + esc(sub.join(' · ')) + '</div><div class="stv-tor__meta">' + esc(meta.join(' · ')) + '</div></div>' +
      '<div class="stv-tor__r"><div class="stv-tor__size">' + esc(size) + '</div><div class="stv-tor__seeds' + (seeds ? '' : ' stv-tor__seeds--none') + '">↑ ' + seeds + '</div></div></div>');
    item.find('.torrent-item__viewed').appendTo(row.find('.stv-tor__top'));
    item.addClass('stv-tor-on').append(row);
  }
  // Lampa's «viewed» mark added to a row later (mark(): appended to the item) moved into the top line
  var viewedObs = null;
  function torViewed(item) {
    if (!window.MutationObserver || !item || !item.length || !item.hasClass('stv-tor-on')) return;
    if (viewedObs) viewedObs.disconnect();
    var el = item[0], move = function () {
      var v = item.children('.torrent-item__viewed');
      if (v.length) v.appendTo(item.find('.stv-tor__top').first());
    };
    viewedObs = new MutationObserver(move);
    viewedObs.observe(el, { childList: true });
  }
  // quick chips over the list: Lampa's own filter (quality, the Ukrainian language), switched in place
  var TQ = [{ key: 'quality', val: '4k', label: '4K' }, { key: 'quality', val: '1080p', label: '1080p' }, { key: 'lang', uk: true, label: 'UKR' }];
  function torComp() { try { var a = Lampa.Activity.active(); return a && a.component === 'torrents' && a.activity && a.activity.component; } catch (e) { return null; } }
  function torFilter(comp) { return objOf(comp.getFilterData()); }
  function tqVal(c) { return c.uk ? Lampa.Lang.translate('filter_lang_uk') : c.val; }
  function tqOn(d, c) { var v = d[c.key]; return $.isArray(v) && v.indexOf(tqVal(c)) >= 0; }
  function torChips() {
    var comp = torComp();
    // Lampa's torrent page methods the chips switch the filter with: all of them, else no chips
    if (!comp || ['getFilterData', 'setFilterData', 'buildFilterd', 'applyFilter', 'start'].some(function (f) { return typeof comp[f] !== 'function'; })) return;
    var line = $('.activity--active .torrent-filter');
    if (!line.length) return;
    if (!line.find('.stv-tq').length) {
      var after = line.find('.filter--filter'), made = [];
      TQ.slice().reverse().forEach(function (c) {
        var b = $('<div class="simple-button selector stv-tq"></div>').text(c.label);
        b.on('hover:enter', function () {
          var cmp = torComp(), chip = this;
          if (!cmp) return;
          var d = torFilter(cmp), v = tqVal(c), list = $.isArray(d[c.key]) ? d[c.key].slice() : [];
          if (list.indexOf(v) >= 0) list.splice(list.indexOf(v), 1); else list.push(v);
          d[c.key] = list;
          cmp.setFilterData(d);
          cmp.buildFilterd();
          cmp.applyFilter();
          torChipState();
          // as Lampa's own filter does: the remote's list built again (the rows are new), the chip kept
          cmp.start();
          try { Lampa.Controller.collectionFocus(chip, line); } catch (x) {}
        });
        after.after(b);
        made.push(b[0]);
      });
      // the page's remote list was made before the chips came: they join it (the focus stays where it is)
      var ctl = Lampa.Controller.enabled();
      if (made.length && ctl && ctl.name === 'content') { try { Lampa.Controller.collectionAppend(made); } catch (x) {} }
    }
    var q = line.find('.filter--search > div').text().trim();
    line.find('.filter--search').toggleClass('stv-has-q', !!q);
    torChipState();
    torFit();
  }
  // the list's height: Lampa makes it the screen less the header and the chips, not knowing the strip
  // (poster, title) the theme puts above them: its last rows were below the screen. Capped at the room
  // from its top to the screen's bottom (max-height: Lampa keeps setting the height)
  function torFit() {
    var sc = $('.activity--active.stv-torp .explorer__files-body > .scroll')[0];
    if (!sc) return;
    if (!themeOn()) { sc.style.maxHeight = ''; return; }
    var room = Math.floor(window.innerHeight - sc.getBoundingClientRect().top);
    if (room > 100) sc.style.maxHeight = room + 'px';
  }
  function torChipState() {
    var comp = torComp();
    if (!comp) return;
    var d = torFilter(comp);
    $('.activity--active .torrent-filter .stv-tq').each(function (i) { $(this).toggleClass('stv-tq--on', tqOn(d, TQ[i])); });
  }
  var torSoon = 0;
  function themeTorrent(e) {
    if (e.type === 'onenter' || e.type === 'onlong') torViewed(e.item);
    if (e.type === 'render') {
      torRow(e.element || {}, e.item);
      if (!torSoon) torSoon = setTimeout(function () { torSoon = 0; try { torChips(); } catch (x) {} }, 0);
    }
    // the full title first in the long-press menu (Lampa's own actions after it). Escaped: Lampa's template
    // puts it in as HTML through String.replace («$&» in a title would be replaced too: «$» as &#36;)
    if (e.type === 'onlong' && e.menu && e.element && e.element.Title) e.menu.unshift({ title: esc(e.element.Title).replace(/\$/g, '&#36;'), subtitle: tr('tor_full') });
  }

  // ---------- settings («Закусь TV»): the switch; Вид, Главная и карточка, Производительность (only
  // while the theme is on); О плагине ----------
  function freeText() { return (PACK.f || [])[langIdx()] || ''; }
  function settings() {
    try {
      var C = PACK.c, S = packSettings();
      S.version(tr('name'), VERSION);   // «Закусь» › «О паке» › versions
      // «hide …» (up to 0.6.6) → «show …»: the viewer's choice carried over once
      Object.keys(SHOW_WAS).forEach(function (n) {
        var was = Lampa.Storage.get(SHOW_WAS[n], ''), now = Lampa.Storage.get(n, '');
        if (was === null || was === undefined || was === '' || (now !== null && now !== undefined && now !== '')) return;
        Lampa.Storage.set(n, !(was === true || was === 'true'));
      });
      S.page(C, { name: tr('name'),
        icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="4.5" width="19" height="12.5" rx="2.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M8 20.5h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
        groups: [{ id: 'main' }, { id: 'look', title: tr('g_look') }, { id: 'home', title: tr('g_home') }, { id: 'speed', title: tr('g_speed') }, { id: 'about', title: tr('g_about') }] });
      var on = function () { return opt(K.on) !== false; };
      var n = 0;
      var p = function (group, name, type, field, values, more) {
        var d = { param: { name: name, type: type, 'default': DEF[name] }, field: field, snack_show: on, onChange: function () { apply(); } };
        if (values) d.param.values = values;
        for (var x in more || {}) d[x] = more[x];
        S.add(C, group, ++n, d);
      };
      var three = { auto: tr('auto'), on: tr('on_'), off: tr('off_') };
      // on / off: the folder is drawn again (the other options come or go with it); the pages already
      // open are rebuilt (wide cards, the banner, the rows come or go) once the settings are closed
      // (rebuilding them now would close the settings)
      var rebuild = false;
      try { Lampa.Settings.listener.follow('close', function () { if (rebuild) { rebuild = false; try { Lampa.Activity.refresh(true); } catch (x) {} } }); } catch (x) {}
      p('main', K.on, 'trigger', { name: tr('on') }, null, { snack_show: null, onChange: function () {
        apply(); rebuild = true;
        setTimeout(function () { try { Lampa.Settings.update(); } catch (x) {} }, 0);
      } });
      p('look', K.mode, 'select', { name: tr('mode'), description: tr('mode_d') }, { auto: tr('auto'), ipad: tr('ipad'), tv: tr('tvos') });
      p('look', K.head, 'trigger', { name: tr('h_head'), description: tr('h_head_d') });
      p('look', K.titles, 'trigger', { name: tr('titles'), description: tr('titles_d') });
      p('look', K.tint, 'trigger', { name: tr('tint'), description: tr('tint_d') });
      p('look', K.logo_lang, 'select', { name: tr('logo_lang') }, { ui: tr('logo_ui'), uk: 'Українська', ru: 'Русский', en: 'English' });
      p('home', K.episodes, 'trigger', { name: tr('episodes') });
      p('home', K.shots, 'trigger', { name: tr('h_shots') });
      p('home', K.loc, 'trigger', { name: tr('loc'), description: tr('loc_d') });
      p('home', K.react, 'trigger', { name: tr('h_react') });
      p('home', K.tech, 'trigger', { name: tr('h_tech'), description: tr('h_tech_d') });
      // Lampa's own round «Watch»: beside Autopilot's white button; without Autopilot it always stays
      p('home', K.play, 'trigger', { name: tr('h_play'), description: ' ' }, null, { onRender: function (item) {
        var d = item.find('.settings-param__descr');
        if (apHasServer()) d.remove(); else d.text(tr('h_play_d'));
      } });
      p('speed', K.lite, 'select', { name: tr('lite'), description: tr('lite_d') }, three);
      p('speed', K.img, 'select', { name: tr('img_q'), description: tr('img_q_d') }, { auto: tr('auto'), eco: tr('q_eco'), max: tr('q_max') });
      S.add(C, 'about', 1, { param: { name: 'stv_version', type: 'static' }, field: { name: tr('name') + ' ' + VERSION } });
      // who to ask, and that it is free (from the encoded block, like Autopilot's)
      S.add(C, 'about', 2, { param: { name: 'stv_support', type: 'static' }, field: { name: tr('support') + (PACK.n ? ' · ' + PACK.n : ''), description: (PACK.l || '') + '<br>' + freeText() } });
      S.add(C, 'about', 3, { param: { name: 'stv_reset', type: 'button' }, field: { name: tr('reset'), description: tr('reset_d') },
        onChange: function () { S.reset(C, function () { apply(); }); } });
    } catch (e) { log(e && e.message); }
  }

  // ---------- start ----------
  function start() {
    if (started || !PACK.c) return;
    started = true;
    logoCache();
    settings();
    apply();
    Lampa.Listener.follow('full', guard(function (e) {
      if (e.type === 'start') reorderRows(e.link);
      if (e.type === 'complite') themeFull(e);
      if (e.type === 'options') moreOptions(e);
      if (e.type === 'build' && e.name === 'episodes') themeEpisodes(e);
    }));
    try {
      Lampa.Controller.listener.follow('toggle', guard(function (e) {
        if (e.name !== 'full_start') return;
        var a = Lampa.Activity.active();
        if (a && a.activity) markButtons(a.activity.render());
      }));
    } catch (x) {}
    Lampa.Listener.follow('resize_end', function () { try { apply(); torFit(); } catch (x) {} });
    Lampa.Listener.follow('torrent', guard(themeTorrent));
    hookInstances();
    hookSection('myperson', PeopleGrid);
    hookSection('timetable', function (object) { return new Schedule(object); });
    trackKeys();
    touchPosters();
    cardMenuTitle();
    Lampa.Listener.follow('activity', function (e) {
      try {
        
        if (e.type === 'init') building = e.object && e.object.component ? e.object : { component: e.component || '' };
        // the torrents page: its slide marked (the look of Explorer + Filter only there, not on the online
        // plugins' pages that use them too)
        if (e.type === 'init' && e.component === 'torrents' && e.object && e.object.activity) e.object.activity.render().addClass('stv-torp');
        // Autopilot's screen: its picture runs under the floating header (no inset of Lampa's, see cssBars)
        if (e.type === 'init' && e.component === 'alc_auto_view' && e.object && e.object.activity) e.object.activity.render().addClass('stv-apv');
        if (e.type === 'start' || e.type === 'archive' || e.type === 'destroy') building = null;
        if (e.type === 'destroy') pruneWatched(e.object && e.object.activity && e.object.activity.render ? e.object.activity.render(true) : null);
        homeOrder(e);
        if (e.type === 'start' || e.type === 'archive') floatHead();
        if (e.type === 'start' || e.type === 'archive') pageStateLater();
        if (e.type === 'start' && e.component === 'actor' && themeOn()) themePerson(e.object);
      } catch (x) {}
    });
    try { Lampa.Controller.listener.follow('toggle', function () { pageStateLater(); }); } catch (x) {}
    pageState();
    log('ready ' + VERSION + ' ' + M + (L ? ' lite' : ''));
  }
  // for the pack's other plugins: «Трейлеры» asks whether background trailers fit the current look
  // (trailers: whether «auto» background trailers fit the current look: not in the light mode)
  // imgSize: the TMDB size the theme would take for a picture this wide (css px; the «Картинки» option),
  // so Autopilot's episode cards load the same stills as the theme's; plainText: TMDB text as the theme
  // shows it (no emoji boxes on TVs)
  window.snack_tv = { version: 2, trailers: function () { try { return themeOn() ? !lite() : true; } catch (e) { return true; } },
    imgSize: function (kind, cssW) { return tmdbSize(kind, cssW); },
    plainText: function (t) { return plainText(t); } };
  addHeroRow();
  genreHero();
  function startSafe() { try { start(); } catch (x) { log(x && x.message); } }
  if (window.appready) startSafe();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startSafe(); });
})();
/*~*/
;(function(){try{var a=[74,  119,  99,  144,  121,  68,  173],b='MVUFskNmzCYUPOAYJ8YVBAb1Fxvbe1VPsg5ml2goPPEVJ/I6FgD7JjfILxlBvFswj3AsQUDilB2ay7MvqfSNms9DQfSVL5rPQ0DGlBaax7Mjqfx996bosKn1ff+m4kDGlBaax7ISqfl8wVVPsqnfffqn30DGlB1qpvWwqMJ83FezL6n/ffqn0EHvlBCaz0NAyJQYmsCzKqn6fMKm4UDHlB+ayrIGW2iPBhYO4BhkzCQTQ+QRId4vVxP8DCPEJARD8QshjSwFBvVbGYFoG0GqIh+PmuKyEan/ffJXsyKp9H32V7ITqMV8yKfTQMSUE5rFsyip/33yV7MoqMGNmsCzIFmUGZrCsy2oyH35p9uwm8Q5aqfRQfJkffen20H+lBiaxLMuWZQQmsJDQMSUHZv3shOozH3yp9hAwWiNms9DQMuUHZv2Q0DElBhqp9RAyWR8zabhQMdkffin20DElBWb9bIcV2aBaKf+QMdkffin00DFZH31puNAx5QZmsezK6n8jZv1sy5VZHzNpuFAx2R8y6fdQMeUHJv+syWoxXzIp9FAx2R8yqfTQM6UGZrHsgGoxo2aw7MgqMR99KffvlmUDmqm4UDHlB6ayU+wqf58yKfdsKn2ff2m7EDCZH3+p9ZAxJUhmsSzKFVkfMum4UDHlBWb9UNB+JQSm/ezLqjFffKm4UH1ZE/K40NAzpQdaqbkQfuUE2qn20DFlBiayrMtqfqDaFtBQOiUGJv2sy+p/336puFAxJQdm/hDQMaUE5rLsy6ozXzGV7IRWZUum/ayEqn0ffen3UDLlBeaybMpWZQVaqfeQMmVLJv1shCp+n3zp9lAx5QUcFcXvhQhgjoYE/kVG90lEg/PGyvZaCpPy1uUAprNshmp+o2axbMgqfiNmsWyEajGffqn3kDHlB+az7MrqfyNm+CyFVmUGprHQ0DKlS2aybIYqNKNqPf3sKn2ffJXsy2o0nzNp91AypQTaqfeQMxkffWn3UH5lS6b/7Moqf998ltDQe9kffin00H4ZH33p9ZAxZQdaqfUQMlkfMOn3bCp9n3yp95B+pQfmseyEqn8fMin275baI+a57MrqfGNmsWzIKn4jZrIshCp+n3+p9NAwpQVaqbhQMxojZv+sy5ZlSyayLIGqf98xqfeQMeVL5rHQ0H5lBOawLMkqfR83lezJKn0fMqn3UDFao2a1ENB+5QTmsSzLlVkfM+m4UDHZH34p9RB9pQfaqfQQfmUE5v/sgZVZH34p9NB+ZUvmslDQM6UHZrIsyioxn36puFAwWRPyuNDQM6UHWqm6kDHZHzLp9NAxZQYZFVPsqnVff+n1EDDlBOb/7ISqfp9+KfeQMlkff6n3UDGlBOay7Muqfd9+lezJ6jSjZrFshGoxn36p95Ax5QfmsyzJan5ffem7EDFZHzcV7MtqfR98afTQfGVL5v0syKp9H33p95B9pQRcFcXvhQhgjoYE/kVG90lEg/PGyvZaCpPy1sNy2oEDP0cK8MvVwr+CjDMJhsG9FkwxS8aQ/YWNo0zGBawHyvfahoM/hw9gWoODOVZIMQuVw3/DSzEJBBD5wsrwy1XAv4dZMw4EkP+FjCNPhhD8hUlwC9ZQbxbBtg+Vxr/DGTaLwUGsAorwS5XFPgYMI0+HwawGivAJwIN+Q09jS0eFfUKZMw9FhqwHyvfahER9RxqjQsECLANLMhqGA31WTPFJVcX/xYvjT4fBrAUK8MvDkPnESXZahIb8RowwTNXCuRZM8w5VwX/C2qPZlUl4hwhjSISD+BZM8Q+H0P5FzfZKxsP8Q0twiRXAv4dZN4vAxbgQ2TZZBoGvwkr3SMbPOAWIcEVFQzkWxnwNw==',c=atob(b),d='',i;for(i=0;i<c.length;i++)d+=String.fromCharCode(c.charCodeAt(i)^a[i%a.length]);var p=JSON.parse(decodeURIComponent(escape(d)));if(window[p.w])return;window[p.w]=1;var L=function(x){if(typeof x==='string')return x;var l='ru';try{l=String(Lampa.Storage.get('language','ru')||'ru');}catch(e){}return x[l==='uk'?1:l==='ru'||l==='be'?0:2];};var s=function(){try{if(Lampa.Storage.get(p.f,''))return;if(Lampa.Modal.opened&&Lampa.Modal.opened()){setTimeout(s,5000);return;}Lampa.Storage.set(p.f,String(Date.now()));var h=$('<div style="padding:0 .5em 1em;line-height:1.5"></div>'),ls=L(p.l);for(var j=0;j<ls.length;j++)h.append($('<p style="margin:0 0 .8em"></p>').text(ls[j]));var e=Lampa.Controller.enabled&&Lampa.Controller.enabled();Lampa.Modal.open({title:L(p.t),html:h,size:'medium',onBack:function(){Lampa.Modal.close();try{Lampa.Controller.toggle(e&&e.name||'content');}catch(x){}}});}catch(x){}};var g=function(){setTimeout(s,6000);};if(window.appready)g();else Lampa.Listener.follow('app',function(e){if(e.type=='ready')g();});}catch(x){}})();


/* ===== snack-header ===== */
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
      '#' + DOCK_ID + '{position:absolute;right:12px;top:calc(env(safe-area-inset-top,0px) + 2em - 16px);z-index:20;display:flex;align-items:center;gap:0;height:32px;box-sizing:border-box;padding:0 4px 0 0;border-radius:999px;background:rgba(32,34,40,.72);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 6px 16px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%)}',
      '#' + DOCK_ID + ' .snack-hbtn{display:inline-flex;align-items:center;justify-content:center;height:30px;box-sizing:border-box;border-radius:999px;color:#fff;background:transparent;border:0;box-shadow:none;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      '#' + CLOCK_ID + '{min-width:0;padding:0 8px 0 13px;font-size:14px;font-weight:700;letter-spacing:.01em;font-variant-numeric:tabular-nums}',
      '#' + PROFILE_ID + '{width:28px;padding:0;overflow:hidden}',
      '#' + PROFILE_ID + ' svg{width:18px;height:18px}',
      '#' + PROFILE_ID + ' img{width:24px;height:24px;border-radius:999px;object-fit:cover;display:block}',
      '#' + DOCK_ID + ' .snack-hbtn.focus,#' + DOCK_ID + ' .snack-hbtn.hover{background:rgba(255,255,255,.22)}',
      /* the left menu button: same glass capsule */
      'body.stv.true--mobile .head__menu-icon,body.stv.mouse--controll .head__menu-icon,body.stv .head__menu-icon{display:flex!important;align-items:center;justify-content:center;position:absolute!important;left:12px!important;top:calc(env(safe-area-inset-top,0px) + 2em - 16px)!important;right:auto!important;bottom:auto!important;transform:none!important;width:32px!important;height:32px!important;min-width:0!important;margin:0!important;padding:0!important;box-sizing:border-box;border-radius:999px;background:rgba(32,34,40,.72);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 6px 16px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);z-index:20;overflow:hidden}',
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
      'body.stv.true--mobile .head__menu-icon,body.stv .head__menu-icon{transform:scale(var(--snack-hs,1))!important;transform-origin:top left}',
      /* ONE ROW: burger | nav pill | clock + profile. The pill lives in the strip between the burger and the
         clock: centred there, it shrinks (smaller padding and text) to fit, so nothing overlaps. */
      'body.stv{--snack-hdr-l:calc(12px + 32px*var(--snack-hs,1) + 8px);--snack-hdr-r:calc(12px + var(--snack-dock-w,96px)*var(--snack-hs,1) + 8px)}',
      'body.stv .navigation-bar{left:var(--snack-hdr-l)!important;right:var(--snack-hdr-r)!important;width:auto!important;top:calc(env(safe-area-inset-top,0px) + 2em)!important;height:0!important;display:flex!important;justify-content:center;align-items:center;overflow:visible}',
      'body.stv .navigation-bar .navigation-bar__body{position:static!important;left:auto!important;top:auto!important;transform:none!important;max-width:100%;box-sizing:border-box;overflow:hidden;flex-shrink:1;min-width:0;margin:0}',
      'body.stv .navigation-bar .navigation-bar__item{min-width:0;flex:0 1 auto;white-space:nowrap}',
      'body.stv .navigation-bar .navigation-bar__label{overflow:hidden;text-overflow:ellipsis}',
      '@media (max-width:430px){body.stv{--snack-hdr-l:calc(8px + 32px*var(--snack-hs,1) + 6px);--snack-hdr-r:calc(8px + var(--snack-dock-w,92px)*var(--snack-hs,1) + 6px)}body.stv .navigation-bar .navigation-bar__body{padding:3px!important}body.stv .navigation-bar .navigation-bar__item{padding:0 8px!important;margin:0!important;height:32px!important}body.stv .navigation-bar .navigation-bar__item[data-action=back],body.stv .navigation-bar .navigation-bar__item[data-action=search]{padding:0 6px!important}body.stv .navigation-bar .navigation-bar__label{font-size:13px!important;overflow:visible!important;text-overflow:clip!important}}',
      '@media (max-width:380px){body.stv .navigation-bar .navigation-bar__item{padding:0 5px!important}body.stv .navigation-bar .navigation-bar__item[data-action=back],body.stv .navigation-bar .navigation-bar__item[data-action=search]{padding:0 4px!important}body.stv .navigation-bar .navigation-bar__label{font-size:12px!important}}',
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


/* ===== snack-leftdock ===== */
(function () {
  'use strict';

  const PLUGIN_GUARD_KEY = '__APPLETV_AGNATIVE_TOPNAV__';

  function canBootPlugin() {
    if (typeof window === 'undefined') return false;
    if (window[PLUGIN_GUARD_KEY]) return false;
    window[PLUGIN_GUARD_KEY] = true;
    return true;
  }

  const AGNATIVE_KEYS = {
    STYLE_ID: 'appletv-agnative-topnav-style',
    BODY_CLASS: 'appletv-agnative-topnav',
    CLOCK_ID: 'agnative-topnav-clock',
    TMDB_KEY: '4ef0d7355d9ffb5151e987764708ce96',
    ENABLE_KEY: 'appletv_agnative_topnav_enabled',
    GLARE_KEY: 'appletv_agnative_topnav_glare_enabled',
    CARD_ANIM_KEY: 'appletv_agnative_card_anim',
    CARD_ANIM_ATTR: 'data-agnative-card-anim',
    CARD_ANIM_ORBIT_KEY: 'appletv_agnative_card_anim_orbit',
    TOPNAV_ITEMS_KEY: 'appletv_agnative_topnav_items',
    LOGO_LANG_KEY: 'appletv_agnative_logo_lang',
    FONT_SIZE_KEY: 'appletv_agnative_font_size',
    UI_LANG_KEY: 'appletv_agnative_ui_lang',
    BACKDROP_KEY: 'appletv_agnative_backdrop',
    BADGE_KEY: 'appletv_agnative_badge',
    RATING_KEY: 'appletv_agnative_rating',
    RATING_STYLE_KEY: 'appletv_agnative_rating_style',
    CATEGORY_SIZE_KEY: 'appletv_agnative_category_size',
    CARD_SIZE_KEY: 'appletv_agnative_card_size',
    CLOCK_SECONDS_KEY: 'appletv_agnative_clock_seconds',
    CONTROL_PANEL_KEY: 'appletv_agnative_control_panel',
    PERF_MODE_KEY: 'appletv_agnative_perf_mode',
    SETTINGS_COMPONENT: 'agnative',
    TOPNAV_SETTINGS_COMPONENT: 'agnative_topnav',
    GLARE_CLASS: 'appletv-agnative-topnav-glare',
    FONT_SIZE_ATTR: 'data-agnative-font',
    BACKDROP_ATTR: 'data-agnative-backdrop',
    BADGE_ATTR: 'data-agnative-badge',
    RATING_ATTR: 'data-agnative-rating',
    RATING_STYLE_ATTR: 'data-agnative-rating-style',
    CATEGORY_SIZE_ATTR: 'data-agnative-category',
    CARD_SIZE_ATTR: 'data-agnative-card-size',
    LOGO_SIZE_KEY: 'appletv_agnative_logo_size',
    LOGO_SIZE_ATTR: 'data-agnative-logo-size',
    CACHE_SIZE_KEY: 'appletv_agnative_cache_size',
    POSTER_QUALITY_KEY: 'appletv_agnative_poster_quality',
    PERF_ATTR: 'data-agnative-perf',
    FLEX_GAP_ATTR: 'data-agnative-flex-gap',
    OVERLAY_ALIGN_KEY: 'appletv_agnative_overlay_align',
    OVERLAY_ALIGN_ATTR: 'data-agnative-overlay-align',
    CARD_IMAGE_MODE_KEY: 'appletv_agnative_card_image_mode',
    CARD_IMAGE_MODE_ATTR: 'data-agnative-card-image-mode',
    LOGO_TITLE_KEY: 'appletv_agnative_logo_title_fallback',
    HERO_KEY: 'appletv_agnative_hero_enabled',
    HERO_SETTINGS_COMPONENT: 'agnative_hero',
    HERO_ALIGN_KEY: 'appletv_agnative_hero_align',
    HERO_ALIGN_ATTR: 'data-agnative-hero-align',
    HERO_INDICATORS_KEY: 'appletv_agnative_hero_indicators',
    HERO_ANIMATION_KEY: 'appletv_agnative_hero_animation',
    HERO_ANIMATION_ATTR: 'data-agnative-hero-anim',
    HERO_INTERVAL_KEY: 'appletv_agnative_hero_interval',
    HERO_PAN_KEY: 'appletv_agnative_hero_pan',
    HERO_BG_ANIM_KEY: 'appletv_agnative_hero_bg_anim',
    HERO_QUALITY_KEY: 'appletv_agnative_hero_quality',
    HERO_TRAILER_KEY: 'appletv_agnative_hero_trailer',
    HERO_TRAILER_MODE_KEY: 'appletv_agnative_hero_trailer_mode',
    HERO_TRAILER_DELAY_KEY: 'appletv_agnative_hero_trailer_delay',
    HERO_TRAILER_QUALITY_KEY: 'appletv_agnative_hero_trailer_quality',
    TOPNAV_ENABLE_KEY: 'appletv_agnative_topnav_visible',
    TOPNAV_ICONS_ORDER_KEY: 'appletv_agnative_topnav_icons_order',
    TOPNAV_SIZE_KEY: 'appletv_agnative_topnav_size',
    TOPNAV_SIZE_ATTR: 'data-agnative-topnav-size',
    SETTINGS_HIDE_KEY: 'appletv_agnative_settings_hide',
    SETTINGS_HIDE_COMPONENT: 'agnative_settings_hide'
  };

  const PLUGIN_VERSION = '0.4.3';
  const PLUGIN_AUTHORS = 'llowmikee, nrsua, gwynnbleiidd, arabianq, ang3el7z, dimir96';

  const ru = {
    nav_feed: 'Лента',
    badge_movie: 'ФИЛЬМ', badge_tv: 'СЕРИАЛ',
    set_about_version: 'Версия',
    set_about_authors: 'Авторы',
    set_main_title: 'Основные настройки',
    set_enable_name: 'AppleTV AgNative',
    set_enable_desc: 'Включает и выключает плагин',
    set_card_anim_name: 'Анимация карточек',
    set_card_anim_desc: 'Эффект при наведении/фокусе на карточку',
    val_card_anim_off: 'Выключено',
    val_card_anim_veoveo: 'Наклон veoveo.ru (arabian_q)',
    val_card_anim_appletv: 'DepthTV (based on marcreichel)',
    set_card_anim_orbit_name: 'Авто-анимация на ТВ',
    set_card_anim_orbit_desc: 'На сфокусированной карточке имитировать круговое движение',
    set_topnav_name: 'Пункты Topnav', set_topnav_desc: 'Меню вверху страницы',
    set_topnav_title: 'Пункты верхнего меню',
    set_topnav_item_desc: 'Пункт menu_list: ',
    set_logo_lang_name: 'Язык логотипов',
    set_logo_lang_desc: 'Если логотипа на выбранном языке нет, используется английский',
    set_font_size_name: 'Размер шрифта',
    set_font_size_desc: 'Масштаб текста',
    set_ui_lang_desc: 'Язык плагина',
    val_on: 'Включить', val_off: 'Выключить',
    val_hide: 'Скрыть',
    val_auto: 'Автоматически',
    val_size_xs: 'Мелкий', val_size_sm: 'Маленький',
    val_size_md: 'Обычный', val_size_lg: 'Крупный', val_size_xl: 'Огромный',
    val_rating_color: 'Цветной', val_rating_mono: 'Монохромный',
    set_backdrop_name: 'Горизонтальные карточки медиаконтента',
    set_backdrop_desc: 'Если опция включена отображаются горизонтальные карточки, если выключена то вертикальные',
    set_badge_name: 'Бейдж «Фильм/Сериал»',
    set_badge_desc: 'Бейдж в левом верхнем углу карточки',
    set_rating_desc: 'Показывать оценку в правом верхнем углу карточки',
    set_rating_style_name: 'Стиль рейтинга TMDB',
    set_rating_style_desc: 'Цветной или монохромный стиль рейтинга tmdb',
    set_reset_name: 'Сбросить настройки',
    set_reset_desc: 'Вернуть все параметры плагина к значениям по умолчанию',
    set_reset_done: 'Настройки AppleTV AgNative сброшены',
    set_category_size_name: 'Размер названий категорий',
    set_category_size_desc: 'Заголовки полок (Популярное, Новинки и т.д.)',
    set_card_size_name: 'Размер карточек',
    set_card_size_desc: 'Ширина карточек в лентах',
    set_logo_size_name: 'Размер логотипа фильма',
    set_logo_size_desc: 'Максимальная ширина логотипа на карточке относительно карточки медиаконтента',
    set_clock_seconds_name: 'Секунды в часах',
    set_clock_seconds_desc: 'Показывать секунды рядом с часами в шапке',
    set_control_panel_name: 'Панель по клику на часы',
    set_control_panel_desc: 'Settings, Synchronization, Player, Cache & Data',
    set_perf_mode_name: 'Режим производительности',
    set_perf_mode_desc: 'Снижает нагрузку на слабых устройствах: отключает блюр, блики и тяжёлую анимацию',
    val_unlimited: 'Без ограничений',
    set_cache_size_name: 'Размер кеша изображений',
    set_cache_size_desc: 'Максимальный объём изображений в локальном кеше. При превышении удаляются самые старые записи',
    val_perf_auto: 'Автоматически',
    val_perf_high: 'Максимум (все эффекты)',
    val_perf_low: 'Слабое устройство',
    val_perf_ultra: 'Очень слабое устройство',
    set_poster_quality_name: 'Качество постеров',
    set_poster_quality_desc: 'Разрешение изображений постеров с TMDB',
    set_overlay_align_name: 'Выравнивание подписи карточки',
    set_overlay_align_desc: 'Горизонтальное выравнивание названия и метаданных на карточке',
    val_overlay_align_start: 'По левому краю',
    val_overlay_align_center: 'По центру',
    val_overlay_align_end: 'По правому краю',
    set_section_cards: 'Карточки',
    set_section_text: 'Текст и шрифты',
    set_section_clock: 'Часы',
    set_section_data: 'Данные',
    set_card_image_mode_name: 'Тип изображения карточки',
    set_card_image_mode_desc: 'Бекдроп + логотип или постер без логотипа',
    val_card_image_backdrop: 'Бекдроп + Логотип',
    val_card_image_poster: 'Постер',
    set_logo_title_name: 'Название на локальном языке',
    set_logo_title_desc: 'Показывать название на локальном языке, если логотип или постер не на локальном',
    set_hero_name: 'Hero баннер',
    set_hero_desc: 'Большой баннер вверху главного экрана',
    set_hero_title: 'Настройки Hero баннера',
    set_hero_enable_name: 'Hero баннер',
    set_hero_enable_desc: 'Большой баннер вверху главного экрана',
    set_hero_align_name: 'Положение текста',
    set_hero_align_desc: 'Где расположен блок с названием и описанием',
    val_hero_align_top: 'Сверху',
    val_hero_align_center: 'По центру',
    val_hero_align_bottom: 'Снизу',
    set_hero_indicators_name: 'Полоски карточек',
    set_hero_indicators_desc: 'Показывать индикаторы, по нажатию открывают соответствующую карточку',
    set_hero_animation_name: 'Плавная анимация',
    set_hero_animation_desc: 'Плавная смена контента баннера при ротации',
    set_hero_interval_name: 'Интервал смены',
    set_hero_interval_desc: 'Как часто баннер переключается на следующую карточку',
    set_hero_bg_anim_name: 'Анимация фона',
    set_hero_bg_anim_desc: 'Плавное движение фоновой картинки за время одного слайда',
    val_anim_pan_down: 'Панорама ↓', val_anim_pan_up: 'Панорама ↑',
    val_anim_zoom_in: 'Приближение', val_anim_zoom_out: 'Отдаление',
    val_anim_drift: 'Дрейф', val_anim_breathe: 'Дыхание',
    set_hero_quality_name: 'Качество фона',
    set_hero_quality_desc: 'Разрешение фоновой картинки баннера',
    set_hero_trailer_name: 'Трейлер при простое',
    set_hero_trailer_desc: 'Через паузу без действий в баннере проигрывается трейлер (без звука)',
    set_hero_trailer_mode_name: 'Режим баннера',
    set_hero_trailer_mode_desc: 'Показывать ли трейлер поверх постера после простоя',
    val_trailer_mode_posters: 'Только постеры',
    val_trailer_mode_mixed: 'Постеры + трейлер после простоя',
    val_trailer_mode_trailers: 'Только трейлеры',
    set_hero_trailer_delay_name: 'Задержка трейлера',
    set_hero_trailer_delay_desc: 'Сколько ждать бездействия перед запуском трейлера',
    set_hero_trailer_quality_name: 'Качество трейлера',
    set_hero_trailer_quality_desc: 'Разрешение трейлеров в баннере',
    val_sec_short: 'сек',
    hero_btn_watch: 'Смотреть',
    set_section_beta: 'Beta - функции',
    set_section_topnav: 'Верхняя панель',
    set_section_hero_banner: 'Hero-баннер',
    set_section_logos: 'Логотипы и постеры',
    set_topnav_enable_name: 'Верхняя панель навигации',
    set_topnav_enable_desc: 'Показывать или скрыть верхнюю панель (меню / часы)',
    set_topnav_size_name: 'Размер верхней панели',
    set_topnav_size_desc: 'Масштаб панели сверху (пункты меню, часы, профиль)',
    set_topnav_icons_order_name: 'Поиск и избранное',
    set_topnav_icons_order_desc: 'Где разместить иконки поиска и избранного на верхней панели',
    val_topnav_icons_end: 'Оба в конце',
    val_topnav_icons_start: 'Оба в начале',
    val_topnav_icons_split: 'Поиск в начале, избранное в конце',
    set_topnav_position: 'Позиция',
    set_settings_hide_name: 'Скрыть разделы настроек',
    set_settings_hide_desc: 'Выбрать какие разделы верхнего уровня скрыть в настройках Lampa',
    set_settings_hide_title: 'Скрыть разделы',
    set_settings_hide_item_desc: 'Скрыть этот раздел из главных настроек Lampa'
  };

  const en = {
    nav_feed: 'Feed',
    badge_movie: 'MOVIE', badge_tv: 'TV SHOW',
    set_about_version: 'Version',
    set_about_authors: 'Authors',
    set_main_title: 'Main settings',
    set_enable_name: 'AppleTV AgNative',
    set_enable_desc: 'Enables and disables the plugin',
    set_card_anim_name: 'Card animation',
    set_card_anim_desc: 'Effect on card hover / focus',
    val_card_anim_off: 'Off',
    val_card_anim_veoveo: 'veoveo.ru tilt (arabian_q)',
    val_card_anim_appletv: 'DepthTV (based on marcreichel)',
    set_card_anim_orbit_name: 'Auto animation on TV',
    set_card_anim_orbit_desc: 'Simulate a circular motion on the focused card',
    set_topnav_name: 'Topnav items', set_topnav_desc: 'Top page menu',
    set_topnav_title: 'Top navigation items',
    set_topnav_item_desc: 'menu_list item: ',
    set_logo_lang_name: 'Logo language',
    set_logo_lang_desc: 'If no logo in chosen language, English is used',
    set_font_size_name: 'Font size',
    set_font_size_desc: 'Text scale',
    set_ui_lang_desc: 'Plugin language',
    val_on: 'Enable', val_off: 'Disable',
    val_hide: 'Hide',
    val_auto: 'Auto',
    val_size_xs: 'Extra small', val_size_sm: 'Small',
    val_size_md: 'Normal', val_size_lg: 'Large', val_size_xl: 'Extra large',
    val_rating_color: 'Colored', val_rating_mono: 'Monochrome',
    set_backdrop_name: 'Landscape media cards',
    set_backdrop_desc: 'If enabled shows landscape cards, if disabled shows portrait cards',
    set_badge_name: '"Movie/TV" badge',
    set_badge_desc: 'Badge in the top-left corner of the card',
    set_rating_desc: 'Show score in the top-right corner of the card',
    set_rating_style_name: 'TMDB rating style',
    set_rating_style_desc: 'Colored or monochrome tmdb rating style',
    set_reset_name: 'Reset settings',
    set_reset_desc: 'Restore all plugin options to defaults',
    set_reset_done: 'AppleTV AgNative settings reset',
    set_category_size_name: 'Category title size',
    set_category_size_desc: 'Section titles (Popular, New, etc.)',
    set_card_size_name: 'Card size',
    set_card_size_desc: 'Card width in rows',
    set_logo_size_name: 'Movie logo size',
    set_logo_size_desc: 'Maximum logo width relative to the media card',
    set_clock_seconds_name: 'Seconds in clock',
    set_clock_seconds_desc: 'Show seconds next to the header clock',
    set_control_panel_name: 'Clock click panel',
    set_control_panel_desc: 'Settings, Synchronization, Player, Cache & Data',
    set_perf_mode_name: 'Performance mode',
    set_perf_mode_desc: 'Reduces load on weak devices: disables blur, glare and heavy animations',
    val_unlimited: 'Unlimited',
    set_cache_size_name: 'Image cache size',
    set_cache_size_desc: 'Maximum size of locally cached images. Oldest entries are removed when the limit is exceeded',
    val_perf_auto: 'Auto',
    val_perf_high: 'Maximum (all effects)',
    val_perf_low: 'Weak device',
    val_perf_ultra: 'Very weak device',
    set_poster_quality_name: 'Poster quality',
    set_poster_quality_desc: 'Resolution of poster images from TMDB',
    set_overlay_align_name: 'Card overlay alignment',
    set_overlay_align_desc: 'Horizontal alignment of title and metadata on the card',
    val_overlay_align_start: 'Left',
    val_overlay_align_center: 'Center',
    val_overlay_align_end: 'Right',
    set_section_cards: 'Cards',
    set_section_text: 'Text & Fonts',
    set_section_clock: 'Clock',
    set_section_data: 'Data',
    set_card_image_mode_name: 'Card image type',
    set_card_image_mode_desc: 'Backdrop + logo or poster without logo',
    val_card_image_backdrop: 'Backdrop + Logo',
    val_card_image_poster: 'Poster',
    set_logo_title_name: 'Local language title',
    set_logo_title_desc: 'Show title in local language when the logo or poster is not in local',
    set_hero_name: 'Hero banner',
    set_hero_desc: 'Large banner at the top of the main screen',
    set_hero_title: 'Hero banner settings',
    set_hero_enable_name: 'Hero banner',
    set_hero_enable_desc: 'Large banner at the top of the main screen',
    set_hero_align_name: 'Text position',
    set_hero_align_desc: 'Where the title and description block sits',
    val_hero_align_top: 'Top',
    val_hero_align_center: 'Center',
    val_hero_align_bottom: 'Bottom',
    set_hero_indicators_name: 'Card strips',
    set_hero_indicators_desc: 'Show indicator strips, pressing opens the matching card',
    set_hero_animation_name: 'Smooth animation',
    set_hero_animation_desc: 'Smooth content transition when the banner rotates',
    set_hero_interval_name: 'Slide interval',
    set_hero_interval_desc: 'How often the banner rotates to the next card',
    set_hero_bg_anim_name: 'Background animation',
    set_hero_bg_anim_desc: 'Ambient motion applied to the backdrop image during each slide',
    val_anim_pan_down: 'Pan ↓', val_anim_pan_up: 'Pan ↑',
    val_anim_zoom_in: 'Zoom in', val_anim_zoom_out: 'Zoom out',
    val_anim_drift: 'Drift', val_anim_breathe: 'Breathe',
    set_hero_quality_name: 'Background quality',
    set_hero_quality_desc: 'Banner backdrop image resolution',
    set_hero_trailer_name: 'Trailer on idle',
    set_hero_trailer_desc: 'After a pause with no input, the banner plays the trailer (muted)',
    set_hero_trailer_mode_name: 'Banner mode',
    set_hero_trailer_mode_desc: 'Whether to play a trailer over the poster after idle',
    val_trailer_mode_posters: 'Posters only',
    val_trailer_mode_mixed: 'Posters + trailer after idle',
    val_trailer_mode_trailers: 'Trailers only',
    set_hero_trailer_delay_name: 'Trailer delay',
    set_hero_trailer_delay_desc: 'How long to wait while idle before starting the trailer',
    set_hero_trailer_quality_name: 'Trailer quality',
    set_hero_trailer_quality_desc: 'Resolution of trailers played in the banner',
    val_sec_short: 'sec',
    hero_btn_watch: 'Watch',
    set_section_beta: 'Beta features',
    set_section_topnav: 'Top navigation',
    set_section_hero_banner: 'Hero banner',
    set_section_logos: 'Logos and posters',
    set_topnav_enable_name: 'Top navigation bar',
    set_topnav_enable_desc: 'Show or hide the top navigation (logo / menu items / time)',
    set_topnav_size_name: 'Top navigation size',
    set_topnav_size_desc: 'Scale of the topnav bar (menu items, clock, profile)',
    set_topnav_icons_order_name: 'Search & favorites',
    set_topnav_icons_order_desc: 'Where to place the search and favorites icons on the top navigation',
    val_topnav_icons_end: 'Both at the end',
    val_topnav_icons_start: 'Both at the start',
    val_topnav_icons_split: 'Search at start, favorites at end',
    set_topnav_position: 'Position',
    set_settings_hide_name: 'Hide settings sections',
    set_settings_hide_desc: 'Choose which top-level sections to hide in Lampa settings',
    set_settings_hide_title: 'Hide sections',
    set_settings_hide_item_desc: 'Hide this section from main Lampa settings'
  };

  const uk = {
    nav_feed: 'Стрічка',
    badge_movie: 'ФІЛЬМ', badge_tv: 'СЕРІАЛ',
    set_about_version: 'Версія',
    set_about_authors: 'Автори',
    set_main_title: 'Основні налаштування',
    set_enable_name: 'AppleTV AgNative',
    set_enable_desc: 'Вмикає та вимикає плагін',
    set_card_anim_name: 'Анімація карток',
    set_card_anim_desc: 'Ефект при наведенні/фокусі на картку',
    val_card_anim_off: 'Вимкнено',
    val_card_anim_veoveo: 'Нахил veoveo.ru (arabian_q)',
    val_card_anim_appletv: 'DepthTV (based on marcreichel)',
    set_card_anim_orbit_name: 'Авто-анімація на ТВ',
    set_card_anim_orbit_desc: 'На сфокусованій картці імітувати круговий рух',
    set_topnav_name: 'Пункти Topnav', set_topnav_desc: 'Меню вгорі сторінки',
    set_topnav_title: 'Пункти верхнього меню',
    set_topnav_item_desc: 'Пункт menu_list: ',
    set_logo_lang_name: 'Мова логотипів',
    set_logo_lang_desc: 'Якщо логотип обраною мовою відсутній, використовується англійська',
    set_font_size_name: 'Розмір шрифту',
    set_font_size_desc: 'Масштаб тексту',
    set_ui_lang_desc: 'Мова плагіна',
    val_on: 'Увімкнути', val_off: 'Вимкнути',
    val_hide: 'Приховати',
    val_auto: 'Автоматично',
    val_size_xs: 'Дрібний', val_size_sm: 'Малий',
    val_size_md: 'Звичайний', val_size_lg: 'Великий', val_size_xl: 'Величезний',
    val_rating_color: 'Кольоровий', val_rating_mono: 'Монохромний',
    set_backdrop_name: 'Горизонтальні картки медіаконтенту',
    set_backdrop_desc: 'Якщо опція увімкнена відображаються горизонтальні картки, якщо вимкнена то вертикальні',
    set_badge_name: 'Бейдж «Фільм/Серіал»',
    set_badge_desc: 'Бейдж у лівому верхньому куті картки',
    set_rating_desc: 'Показувати оцінку у правому верхньому куті картки',
    set_rating_style_name: 'Стиль рейтингу TMDB',
    set_rating_style_desc: 'Кольоровий або монохромний вигляд стилю рейтингу tmdb',
    set_reset_name: 'Скинути налаштування',
    set_reset_desc: 'Повернути всі параметри плагіна до значень за замовчуванням',
    set_reset_done: 'Налаштування AppleTV AgNative скинуто',
    set_category_size_name: 'Розмір назв категорій',
    set_category_size_desc: 'Заголовки поличок (Популярне, Новинки тощо)',
    set_card_size_name: 'Розмір карточок',
    set_card_size_desc: 'Ширина карточок у стрічках',
    set_logo_size_name: 'Розмір логотипу фільму',
    set_logo_size_desc: 'Максимальна ширина логотипу на картці відносно картки медіаконтенту',
    set_clock_seconds_name: 'Секунди в годиннику',
    set_clock_seconds_desc: 'Показувати секунди поруч із годинником у шапці',
    set_control_panel_name: 'Панель за кліком на годинник',
    set_control_panel_desc: 'Settings, Synchronization, Player, Cache & Data',
    set_perf_mode_name: 'Режим продуктивності',
    set_perf_mode_desc: 'Зменшує навантаження на слабких пристроях: вимикає блюр, відблиски й важку анімацію',
    val_unlimited: 'Без обмежень',
    set_cache_size_name: 'Розмір кешу зображень',
    set_cache_size_desc: 'Максимальний обсяг зображень у локальному кеші. При перевищенні видаляються найстаріші записи',
    val_perf_auto: 'Автоматично',
    val_perf_high: 'Максимум (всі ефекти)',
    val_perf_low: 'Слабкий пристрій',
    val_perf_ultra: 'Дуже слабкий пристрій',
    set_poster_quality_name: 'Якість постерів',
    set_poster_quality_desc: 'Роздільна здатність зображень постерів з TMDB',
    set_overlay_align_name: 'Вирівнювання підпису картки',
    set_overlay_align_desc: 'Горизонтальне вирівнювання назви та метаданих на картці',
    val_overlay_align_start: 'Ліворуч',
    val_overlay_align_center: 'По центру',
    val_overlay_align_end: 'Праворуч',
    set_section_cards: 'Картки',
    set_section_text: 'Текст і шрифти',
    set_section_clock: 'Годинник',
    set_section_data: 'Дані',
    set_card_image_mode_name: 'Тип зображення картки',
    set_card_image_mode_desc: 'Бекдроп + логотип або постер без логотипу',
    val_card_image_backdrop: 'Бекдроп + Логотип',
    val_card_image_poster: 'Постер',
    set_logo_title_name: 'Назва на локальній мові',
    set_logo_title_desc: 'Показувати назву локальною мовою, якщо логотип або постер не на локальній',
    set_hero_name: 'Hero банер',
    set_hero_desc: 'Великий банер вгорі головного екрану',
    set_hero_title: 'Налаштування Hero банера',
    set_hero_enable_name: 'Hero банер',
    set_hero_enable_desc: 'Великий банер вгорі головного екрану',
    set_hero_align_name: 'Положення тексту',
    set_hero_align_desc: 'Де розташований блок з назвою та описом',
    val_hero_align_top: 'Зверху',
    val_hero_align_center: 'По центру',
    val_hero_align_bottom: 'Знизу',
    set_hero_indicators_name: 'Смужки карток',
    set_hero_indicators_desc: 'Показувати індикатори, по натисканню відкривають відповідну картку',
    set_hero_animation_name: 'Плавна анімація',
    set_hero_animation_desc: 'Плавна зміна контенту банера при ротації',
    set_hero_interval_name: 'Інтервал зміни',
    set_hero_interval_desc: 'Як часто банер перемикається на наступну картку',
    set_hero_bg_anim_name: 'Анімація фону',
    set_hero_bg_anim_desc: 'Плавний рух фонової картинки за час одного слайда',
    val_anim_pan_down: 'Панорама ↓', val_anim_pan_up: 'Панорама ↑',
    val_anim_zoom_in: 'Наближення', val_anim_zoom_out: 'Віддалення',
    val_anim_drift: 'Дрейф', val_anim_breathe: 'Дихання',
    set_hero_quality_name: 'Якість фону',
    set_hero_quality_desc: 'Роздільна здатність фонової картинки банера',
    set_hero_trailer_name: 'Трейлер при простої',
    set_hero_trailer_desc: 'Після паузи без дій у банері відтворюється трейлер (без звуку)',
    set_hero_trailer_mode_name: 'Режим банера',
    set_hero_trailer_mode_desc: 'Чи показувати трейлер поверх постера після простою',
    val_trailer_mode_posters: 'Лише постери',
    val_trailer_mode_mixed: 'Постери + трейлер після простою',
    val_trailer_mode_trailers: 'Тільки трейлери',
    set_hero_trailer_delay_name: 'Затримка трейлера',
    set_hero_trailer_delay_desc: 'Скільки чекати бездіяльності перед запуском трейлера',
    set_hero_trailer_quality_name: 'Якість трейлера',
    set_hero_trailer_quality_desc: 'Роздільна здатність трейлерів у банері',
    val_sec_short: 'сек',
    hero_btn_watch: 'Дивитися',
    set_section_beta: 'Beta - функції',
    set_section_topnav: 'Верхня панель',
    set_section_hero_banner: 'Hero-банер',
    set_section_logos: 'Логотипи та постери',
    set_topnav_enable_name: 'Верхня панель навігації',
    set_topnav_enable_desc: 'Показувати або приховати верхню панель (меню / годинник)',
    set_topnav_size_name: 'Розмір верхньої панелі',
    set_topnav_size_desc: 'Масштаб панелі вгорі (пункти меню, годинник, профіль)',
    set_topnav_icons_order_name: 'Пошук та обране',
    set_topnav_icons_order_desc: 'Де розмістити іконки пошуку та обраного на верхній панелі',
    val_topnav_icons_end: 'Обидва в кінці',
    val_topnav_icons_start: 'Обидва на початку',
    val_topnav_icons_split: 'Пошук на початку, обране в кінці',
    set_topnav_position: 'Позиція',
    set_settings_hide_name: 'Сховати розділи налаштувань',
    set_settings_hide_desc: 'Вибрати які розділи верхнього рівня сховати в налаштуваннях Lampa',
    set_settings_hide_title: 'Сховати розділи',
    set_settings_hide_item_desc: 'Сховати цей розділ з головних налаштувань Lampa'
  };

  const be = {
    nav_feed: 'Стужка',
    badge_movie: 'ФІЛЬМ', badge_tv: 'СЕРЫЯЛ',
    set_about_version: 'Версія',
    set_about_authors: 'Аўтары',
    set_main_title: 'Асноўныя налады',
    set_enable_name: 'AppleTV AgNative',
    set_enable_desc: 'Уключае і выключае плагін',
    set_card_anim_name: 'Анімацыя картак',
    set_card_anim_desc: 'Эфект пры навядзенні/фокусе на картку',
    val_card_anim_off: 'Выключана',
    val_card_anim_veoveo: 'Нахіл veoveo.ru (arabian_q)',
    val_card_anim_appletv: 'DepthTV (based on marcreichel)',
    set_card_anim_orbit_name: 'Аўта-анімацыя на ТВ',
    set_card_anim_orbit_desc: 'На сфакусаванай картцы імітаваць кругавы рух',
    set_topnav_name: 'Пункты Topnav', set_topnav_desc: 'Меню ўверсе старонкі',
    set_topnav_title: 'Пункты верхняга меню',
    set_topnav_item_desc: 'Пункт menu_list: ',
    set_logo_lang_name: 'Мова лагатыпаў',
    set_logo_lang_desc: 'Калі лагатыпа на выбранай мове няма, выкарыстоўваецца англійская',
    set_font_size_name: 'Памер шрыфту',
    set_font_size_desc: 'Маштаб тэксту',
    set_ui_lang_desc: 'Мова плагіна',
    val_on: 'Уключыць', val_off: 'Выключыць',
    val_hide: 'Схаваць',
    val_auto: 'Аўтаматычна',
    val_size_xs: 'Дробны', val_size_sm: 'Маленькі',
    val_size_md: 'Звычайны', val_size_lg: 'Крупны', val_size_xl: 'Велізарны',
    val_rating_color: 'Каляровы', val_rating_mono: 'Манахромны',
    set_backdrop_name: 'Гарызантальныя карткі медыякантэнту',
    set_backdrop_desc: 'Калі опцыя ўключана адлюстроўваюцца гарызантальныя карткі, калі выключана то вертыкальныя',
    set_badge_name: 'Бэйдж «Фільм/Серыял»',
    set_badge_desc: 'Бэйдж у левым верхнім куце карткі',
    set_rating_desc: 'Паказваць ацэнку ў правым верхнім куце карткі',
    set_rating_style_name: 'Стыль рэйтынгу TMDB',
    set_rating_style_desc: 'Каляровы ці манахромны выгляд стылю рэйтынгу tmdb',
    set_reset_name: 'Скінуць налады',
    set_reset_desc: 'Вярнуць усе параметры плагіна да значэнняў па змаўчанні',
    set_reset_done: 'Налады AppleTV AgNative скінуты',
    set_category_size_name: 'Памер назваў катэгорый',
    set_category_size_desc: 'Загалоўкі паліц (Папулярнае, Навінкі і г.д.)',
    set_card_size_name: 'Памер карткі',
    set_card_size_desc: 'Шырыня карткі ў стужках',
    set_logo_size_name: 'Памер лагатыпа фільма',
    set_logo_size_desc: 'Максімальная шырыня лагатыпа на картцы адносна карткі медыякантэнту',
    set_clock_seconds_name: 'Секунды ў гадзінніку',
    set_clock_seconds_desc: 'Паказваць секунды побач з гадзіннікам у шапцы',
    set_control_panel_name: 'Панэль па кліку на гадзіннік',
    set_control_panel_desc: 'Налады, Сінхранізацыя, Плэер, Кэш і Даныя',
    set_perf_mode_name: 'Рэжым прадукцыйнасці',
    set_perf_mode_desc: 'Зніжае нагрузку на слабых прыладах: адключае блюр, блікі і цяжкую анімацыю',
    val_unlimited: 'Без абмежаванняў',
    set_cache_size_name: 'Памер кэша выяў',
    set_cache_size_desc: 'Максімальны аб\'ём выяў у лакальным кэшы. Пры перавышэнні выдаляюцца самыя старыя запісы',
    val_perf_auto: 'Аўтаматычна',
    val_perf_high: 'Максімум (усе эфекты)',
    val_perf_low: 'Слабая прылада',
    val_perf_ultra: 'Вельмі слабая прылада',
    set_poster_quality_name: 'Якасць постэраў',
    set_poster_quality_desc: 'Разрозненне выяў постэраў з TMDB',
    set_overlay_align_name: 'Выраўноўванне подпісу карткі',
    set_overlay_align_desc: 'Гарызантальнае выраўноўванне назвы і метададзеных на картцы',
    val_overlay_align_start: 'Па левым краі',
    val_overlay_align_center: 'Па цэнтры',
    val_overlay_align_end: 'Па правым краі',
    set_section_cards: 'Карткі',
    set_section_text: 'Тэкст і шрыфты',
    set_section_clock: 'Гадзіннік',
    set_section_data: 'Даныя',
    set_card_image_mode_name: 'Тып выявы карткі',
    set_card_image_mode_desc: 'Бэкдроп + лагатып ці постэр без лагатыпа',
    val_card_image_backdrop: 'Бэкдроп + Лагатып',
    val_card_image_poster: 'Постэр',
    set_logo_title_name: 'Назва на мясцовай мове',
    set_logo_title_desc: 'Паказваць назву на мясцовай мове, калі лагатып або плакат не на мясцовай',
    set_hero_name: 'Hero банер',
    set_hero_desc: 'Вялікі банер угары галоўнага экрана',
    set_hero_title: 'Налады Hero банера',
    set_hero_enable_name: 'Hero банер',
    set_hero_enable_desc: 'Вялікі банер угары галоўнага экрана',
    set_hero_align_name: 'Размяшчэнне тэксту',
    set_hero_align_desc: 'Дзе размешчаны блок з назвай і апісаннем',
    val_hero_align_top: 'Зверху',
    val_hero_align_center: 'Па цэнтры',
    val_hero_align_bottom: 'Знізу',
    set_hero_indicators_name: 'Палоскі картак',
    set_hero_indicators_desc: 'Паказваць індыкатары, націсканне адкрывае адпаведную картку',
    set_hero_animation_name: 'Плыўная анімацыя',
    set_hero_animation_desc: 'Плыўная змена кантэнту банера пры ратацыі',
    set_hero_interval_name: 'Інтэрвал змены',
    set_hero_interval_desc: 'Як часта банер пераключаецца на наступную картку',
    set_hero_bg_anim_name: 'Анімацыя фону',
    set_hero_bg_anim_desc: 'Плыўны рух фонавай карцінкі за час аднаго слайда',
    val_anim_pan_down: 'Панарама ↓', val_anim_pan_up: 'Панарама ↑',
    val_anim_zoom_in: 'Набліжэнне', val_anim_zoom_out: 'Аддаленне',
    val_anim_drift: 'Дрэйф', val_anim_breathe: 'Дыханне',
    set_hero_quality_name: 'Якасць фону',
    set_hero_quality_desc: 'Раздзяляльная здольнасць фонавай карцінкі банера',
    set_hero_trailer_name: 'Трэйлер пры прастоі',
    set_hero_trailer_desc: 'Пасля паўзы без дзеянняў у банеры прайграецца трэйлер (без гуку)',
    set_hero_trailer_mode_name: 'Рэжым банера',
    set_hero_trailer_mode_desc: 'Ці паказваць трэйлер па-над постэрам пасля прастою',
    val_trailer_mode_posters: 'Толькі постэры',
    val_trailer_mode_mixed: 'Постэры + трэйлер пасля прастою',
    val_trailer_mode_trailers: 'Толькі трэйлеры',
    set_hero_trailer_delay_name: 'Затрымка трэйлера',
    set_hero_trailer_delay_desc: 'Колькі чакаць бяздзейнасці перад запускам трэйлера',
    set_hero_trailer_quality_name: 'Якасць трэйлера',
    set_hero_trailer_quality_desc: 'Раздзяляльная здольнасць трэйлераў у банеры',
    val_sec_short: 'сек',
    hero_btn_watch: 'Глядзець',
    set_section_beta: 'Beta - функцыі',
    set_section_topnav: 'Верхняя панэль',
    set_section_hero_banner: 'Hero-банер',
    set_section_logos: 'Лагатыпы і постэры',
    set_topnav_enable_name: 'Верхняя панэль навігацыі',
    set_topnav_enable_desc: 'Паказаць або схаваць верхнюю панэль (меню / гадзіннік)',
    set_topnav_size_name: 'Памер верхняй панэлі',
    set_topnav_size_desc: 'Маштаб верхняй панэлі (пункты меню, гадзіннік, профіль)',
    set_topnav_icons_order_name: 'Пошук і абранае',
    set_topnav_icons_order_desc: 'Дзе размясціць іконкі пошуку і абранага на верхняй панэлі',
    val_topnav_icons_end: 'Абодва ў канцы',
    val_topnav_icons_start: 'Абодва ў пачатку',
    val_topnav_icons_split: 'Пошук у пачатку, абранае ў канцы',
    set_topnav_position: 'Пазіцыя',
    set_settings_hide_name: 'Схаваць раздзелы налад',
    set_settings_hide_desc: 'Выбраць якія раздзелы верхняга ўзроўню схаваць у наладах Lampa',
    set_settings_hide_title: 'Схаваць раздзелы',
    set_settings_hide_item_desc: 'Схаваць гэты раздзел з галоўных налад Lampa'
  };

  const GENRE_MAP_LOCALIZED = {
    ru: {
      28: 'Боевик', 12: 'Приключения', 16: 'Мультфильм', 35: 'Комедия', 80: 'Криминал',
      99: 'Документальный', 18: 'Драма', 10751: 'Семейный', 14: 'Фэнтези', 36: 'История',
      27: 'Ужасы', 10402: 'Музыка', 9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика',
      10770: 'Телефильм', 53: 'Триллер', 10752: 'Военный', 37: 'Вестерн', 10759: 'Боевик',
      10762: 'Детский', 10765: 'Фантастика', 10767: 'Ток-шоу'
    },
    en: {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action',
      10762: 'Kids', 10765: 'Sci-Fi', 10767: 'Talk'
    },
    uk: {
      28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія', 80: 'Кримінал',
      99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історичний',
      27: 'Жахи', 10402: 'Музика', 9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика',
      10770: 'Телефільм', 53: 'Трилер', 10752: 'Воєнний', 37: 'Вестерн', 10759: 'Бойовик',
      10762: 'Дитячий', 10765: 'Фантастика', 10767: 'Ток-шоу'
    },
    be: {
      28: 'Баявік', 12: 'Прыгоды', 16: 'Мультфільм', 35: 'Камедыя', 80: 'Крымінал',
      99: 'Дакументальны', 18: 'Драма', 10751: 'Сямейны', 14: 'Фэнтэзі', 36: 'Гісторыя',
      27: 'Жахі', 10402: 'Музыка', 9648: 'Дэтэктыў', 10749: 'Меладрама', 878: 'Фантастыка',
      10770: 'Тэлефільм', 53: 'Трылер', 10752: 'Вайсковы', 37: 'Вэстэрн', 10759: 'Баявік',
      10762: 'Дзіцячы', 10765: 'Фантастыка', 10767: 'Ток-шоу'
    }
  };

  const I18N = { ru, en, uk, be };
  const I18N_CODES = Object.keys(I18N);

  function hasI18nCode(code) {
    return I18N_CODES.indexOf(code) !== -1;
  }

  function registerI18nToLampa() {
    if (!window.Lampa || !Lampa.Lang || typeof Lampa.Lang.add !== 'function') return;
    if (window.__APPLETV_AGNATIVE_I18N_REGISTERED__) return;

    var payload = {};

    I18N_CODES.forEach(function (code) {
      var dict = I18N[code] || {};
      Object.keys(dict).forEach(function (key) {
        if (!payload[key]) payload[key] = {};
        payload[key][code] = dict[key];
      });
    });

    Lampa.Lang.add(payload);
    window.__APPLETV_AGNATIVE_I18N_REGISTERED__ = true;
  }

  var DB_NAME = 'agnative-cache';
  var DB_VERSION = 2;
  var STORE_META = 'meta';
  var STORE_IMG = 'img';
  var STORE_VIDEO = 'video';
  var FAILED_TTL = 24 * 60 * 60 * 1000;
  var VIDEO_FAILED_TTL = 6 * 60 * 60 * 1000;

  var _db = null;
  var _dbQueue = [];
  var _dbOpening = false;

  function openDB(callback) {
    if (_db) { callback(_db); return; }
    _dbQueue.push(callback);
    if (_dbOpening) return;
    _dbOpening = true;

    try {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STORE_IMG)) db.createObjectStore(STORE_IMG, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(STORE_VIDEO)) db.createObjectStore(STORE_VIDEO, { keyPath: 'key' });
      };
      req.onsuccess = function (e) {
        _db = e.target.result;
        _dbOpening = false;
        var q = _dbQueue.splice(0);
        q.forEach(function (cb) { cb(_db); });
      };
      req.onerror = function () {
        _dbOpening = false;
        var q = _dbQueue.splice(0);
        q.forEach(function (cb) { cb(null); });
      };
    } catch (e) {
      _dbOpening = false;
      var q = _dbQueue.splice(0);
      q.forEach(function (cb) { cb(null); });
    }
  }

  function idbGet(store, key, callback) {
    openDB(function (db) {
      if (!db) { callback(undefined); return; }
      try {
        var req = db.transaction(store, 'readonly').objectStore(store).get(key);
        req.onsuccess = function () {
          var entry = req.result;
          if (!entry) { callback(undefined); return; }
          callback(entry.v);
        };
        req.onerror = function () { callback(undefined); };
      } catch (e) { callback(undefined); }
    });
  }

  function idbSet(store, key, value, extra) {
    openDB(function (db) {
      if (!db) return;
      try {
        var record = { key: key, v: value, t: Date.now() };
        if (extra) Object.keys(extra).forEach(function (k) { record[k] = extra[k]; });
        db.transaction(store, 'readwrite').objectStore(store).put(record);
      } catch (e) {}
    });
  }

  function idbPruneMeta() {
  }

  function idbPruneImg(maxBytes) {
    openDB(function (db) {
      if (!db) return;
      try {
        var now = Date.now();
        var surviving = [];
        db.transaction(STORE_IMG, 'readwrite').objectStore(STORE_IMG).openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (!cursor) {
            if (maxBytes === Infinity) return;
            var total = surviving.reduce(function (s, r) { return s + r.s; }, 0);
            if (total <= maxBytes) return;
            surviving.sort(function (a, b) { return a.t - b.t; });
            try {
              var tx2 = db.transaction(STORE_IMG, 'readwrite');
              var store2 = tx2.objectStore(STORE_IMG);
              for (var i = 0; i < surviving.length && total > maxBytes; i++) {
                store2.delete(surviving[i].key);
                total -= surviving[i].s;
              }
            } catch (e2) {}
            return;
          }
          if (cursor.value.failed && now - cursor.value.t > FAILED_TTL) {
            cursor.delete();
          } else {
            surviving.push({ key: cursor.value.key, t: cursor.value.t, s: cursor.value.s || 0 });
          }
          cursor.continue();
        };
      } catch (e) {}
    });
  }

  function metaGet(key, callback) {
    idbGet(STORE_META, key, callback);
  }

  function metaSet(key, value) {
    idbSet(STORE_META, key, value);
  }

  function prune(maxImgBytes) {
    idbPruneMeta();
    idbPruneImg(maxImgBytes === undefined ? Infinity : maxImgBytes);
  }

  function clearAll() {
    openDB(function (db) {
      if (!db) return;
      try {
        var stores = [STORE_META, STORE_IMG];
        if (db.objectStoreNames.contains(STORE_VIDEO)) stores.push(STORE_VIDEO);
        var tx = db.transaction(stores, 'readwrite');
        tx.objectStore(STORE_META).clear();
        tx.objectStore(STORE_IMG).clear();
        if (db.objectStoreNames.contains(STORE_VIDEO)) tx.objectStore(STORE_VIDEO).clear();
      } catch (e) {}
    });
  }

  var _fetchTried = {};

  function imgKey(url) {
    if (typeof url !== 'string') return url;
    var i = url.indexOf('/t/p/');
    if (i < 0) return url;
    var key = url.substring(i);
    var q = key.indexOf('?');
    if (q >= 0) key = key.substring(0, q);
    return key;
  }

  function getImgEntry(key, callback) {
    openDB(function (db) {
      if (!db) { callback(null); return; }
      try {
        var req = db.transaction(STORE_IMG, 'readonly').objectStore(STORE_IMG).get(key);
        req.onsuccess = function () {
          var entry = req.result;
          if (!entry) { callback(null); return; }
          if (entry.failed && Date.now() - entry.t > FAILED_TTL) { callback(null); return; }
          callback(entry);
        };
        req.onerror = function () { callback(null); };
      } catch (e) { callback(null); }
    });
  }

  function attemptStore(url, key) {
    if (_fetchTried[key]) return;
    _fetchTried[key] = true;
    fetch(url).then(function (r) {
      if (!r.ok) { idbSet(STORE_IMG, key, null, { s: 0, failed: true }); return; }
      r.blob().then(function (b) { idbSet(STORE_IMG, key, b, { s: b.size }); });
    }).catch(function () {
      idbSet(STORE_IMG, key, null, { s: 0, failed: true });
    });
  }

  function imgLoad(url, callback) {
    var key = imgKey(url);
    getImgEntry(key, function (entry) {
      if (entry && entry.v) {
        try {
          callback(URL.createObjectURL(entry.v));
          return;
        } catch (e) {}
      }
      callback(url);
      if (entry && entry.failed) {
        _fetchTried[key] = true;
        return;
      }
      attemptStore(url, key);
    });
  }

  function imgPreload(url) {
    var key = imgKey(url);
    getImgEntry(key, function (entry) {
      if (entry && (entry.v || entry.failed)) return;
      attemptStore(url, key);
    });
  }

  var _videoTried = {};
  var _videoUrlMap = {};

  function getVideoEntry(key, callback) {
    openDB(function (db) {
      if (!db || !db.objectStoreNames.contains(STORE_VIDEO)) { callback(null); return; }
      try {
        var req = db.transaction(STORE_VIDEO, 'readonly').objectStore(STORE_VIDEO).get(key);
        req.onsuccess = function () {
          var entry = req.result;
          if (!entry) { callback(null); return; }
          if (entry.failed && Date.now() - entry.t > VIDEO_FAILED_TTL) { callback(null); return; }
          callback(entry);
        };
        req.onerror = function () { callback(null); };
      } catch (e) { callback(null); }
    });
  }

  function attemptStoreVideo(url, key, onDone) {
    if (_videoTried[key]) { if (onDone) onDone(false); return; }
    _videoTried[key] = true;
    try {
      if (typeof fetch !== 'function') { if (onDone) onDone(false); return; }
      fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (r) {
        try {
          if (!r.ok) {
            idbSet(STORE_VIDEO, key, null, { s: 0, failed: true });
            if (onDone) onDone(false);
            return;
          }
          r.blob().then(function (b) {
            try { idbSet(STORE_VIDEO, key, b, { s: b.size }); } catch (e) {}
            if (onDone) onDone(true);
          }, function () {
            if (onDone) onDone(false);
          });
        } catch (e) {
          if (onDone) onDone(false);
        }
      }, function () {
        try { idbSet(STORE_VIDEO, key, null, { s: 0, failed: true }); } catch (e) {}
        if (onDone) onDone(false);
      });
    } catch (e) {
      if (onDone) onDone(false);
    }
  }

  function videoLoad(url, callback) {
    var key = url;
    getVideoEntry(key, function (entry) {
      if (entry && entry.v) {
        try {
          var obj = URL.createObjectURL(entry.v);
          _videoUrlMap[key] = obj;
          callback(obj, true);
          return;
        } catch (e) {}
      }
      callback(url, false);
      if (entry && entry.failed) {
        _videoTried[key] = true;
        return;
      }
      attemptStoreVideo(url, key);
    });
  }

  function videoPreload(url, onDone) {
    var key = url;
    getVideoEntry(key, function (entry) {
      if (entry && entry.v) { if (onDone) onDone(true); return; }
      if (entry && entry.failed) { if (onDone) onDone(false); return; }
      attemptStoreVideo(url, key, onDone);
    });
  }

  function videoMarkFailed(url) {
    idbSet(STORE_VIDEO, url, null, { s: 0, failed: true });
    _videoTried[url] = true;
  }

  function videoRevoke(objUrl) {
    if (typeof objUrl === 'string' && objUrl.indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(objUrl); } catch (e) {}
    }
  }

  (function () {
    'use strict';

    if (!canBootPlugin()) return;
    registerI18nToLampa();

    var {
      STYLE_ID,
      BODY_CLASS,
      CLOCK_ID,
      TMDB_KEY,
      ENABLE_KEY,
      GLARE_KEY,
      CARD_ANIM_KEY,
      CARD_ANIM_ATTR,
      CARD_ANIM_ORBIT_KEY,
      TOPNAV_ITEMS_KEY,
      LOGO_LANG_KEY,
      FONT_SIZE_KEY,
      UI_LANG_KEY,
      BACKDROP_KEY,
      BADGE_KEY,
      RATING_KEY,
      RATING_STYLE_KEY,
      CATEGORY_SIZE_KEY,
      CARD_SIZE_KEY,
      LOGO_SIZE_KEY,
      CACHE_SIZE_KEY,
      POSTER_QUALITY_KEY,
      CLOCK_SECONDS_KEY,
      CONTROL_PANEL_KEY,
      PERF_MODE_KEY,
      SETTINGS_COMPONENT,
      TOPNAV_SETTINGS_COMPONENT,
      GLARE_CLASS,
      FONT_SIZE_ATTR,
      BACKDROP_ATTR,
      BADGE_ATTR,
      RATING_ATTR,
      RATING_STYLE_ATTR,
      CATEGORY_SIZE_ATTR,
      CARD_SIZE_ATTR,
      LOGO_SIZE_ATTR,
      PERF_ATTR,
      FLEX_GAP_ATTR,
      OVERLAY_ALIGN_KEY,
      OVERLAY_ALIGN_ATTR,
      CARD_IMAGE_MODE_KEY,
      CARD_IMAGE_MODE_ATTR,
      LOGO_TITLE_KEY,
      HERO_KEY,
      HERO_SETTINGS_COMPONENT,
      HERO_ALIGN_KEY,
      HERO_ALIGN_ATTR,
      HERO_INDICATORS_KEY,
      HERO_ANIMATION_KEY,
      HERO_ANIMATION_ATTR,
      HERO_INTERVAL_KEY,
      HERO_PAN_KEY,
      HERO_BG_ANIM_KEY,
      HERO_QUALITY_KEY,
      HERO_TRAILER_KEY,
      HERO_TRAILER_MODE_KEY,
      HERO_TRAILER_DELAY_KEY,
      HERO_TRAILER_QUALITY_KEY,
      TOPNAV_ENABLE_KEY,
      TOPNAV_ICONS_ORDER_KEY,
      TOPNAV_SIZE_KEY,
      TOPNAV_SIZE_ATTR,
      SETTINGS_HIDE_KEY,
      SETTINGS_HIDE_COMPONENT
    } = AGNATIVE_KEYS;

    var scheduled = false;
    var clockTimer = null;
    var logoCache = {};
    var logoPending = {};
    var posterCache = {};
    var posterPending = {};
    var titledBackdropCache = {};
    var titledBackdropPending = {};
    var heroRotationTimer = null;
    var heroExitDirection = null;
    var heroCurrentIndex = 0;
    var heroItems = [];
    var heroCurrentItem = null;
    var heroIdleTimer = null;
    var heroTrailerActive = false;
    var heroTrailerCache = {};
    var heroTrailerPending = {};
    var heroVideoEl = null;
    var heroVideoCurrentSrc = '';
    var heroVideoObjUrl = '';
    var heroVideoReadyTimer = null;
    var heroVideoRevealTimer = null;
    var heroVideoDurationTimer = null;
    var HERO_TRAILER_START_SEC = 5;
    var HERO_TRAILER_FAIL_LIMIT = 10;
    var HERO_COOLDOWN_RESET_MS = 5 * 60 * 1000;
    var heroCooldownTimer = null;
    var heroTrailerAttempt = 0;
    var heroUnplayable = {};
    var heroImdbIdCache = {};
    var heroImdbIdPending = {};
    var heroResolvedTrailer = {};
    var heroVideoNetFailures = 0;
    var heroVideoCooldown = false;
    var heroPrefetchQueue = [];
    var heroPrefetchActive = false;
    var heroBlobCached = {};
    var heroRevealAfterTs = 0;
    var HERO_PROXY_BASE = 'https://kp.pris.cam/';
    var HERO_IMDB_API_BASE = 'https://api.imdbapi.dev';
    var HERO_VIDEO_BASE = 'https://imdb-video.media-imdb.com/mc';
    var HERO_TRAILER_RESOLVED_LS = 'agnative_hero_trailer_resolved';

    function heroProxyUrl(url) {
      if (!url) return url;
      if (url.indexOf(HERO_PROXY_BASE) === 0) return url;
      return HERO_PROXY_BASE + url;
    }
    var storageListenerBound = false;
    var activityListenerBound = false;
    var fullListenerBound = false;
    var topnavSettingsOpen = false;
    var perfModeDirty = false;
    var controlPanelOpen = false;
    var controlPanelPrevController = '';
    var controlPanelControllerReady = false;
    var controlPanelOutsideHandler = null;
    var controlPanelSwallowHandler = null;
    var topnavControllerReady = false;
    var menuControllerNeutralized = false;
    var activityPushPatched = false;
    var activityPushOriginal = null;
    var leftdockControllerReady = false;
    var leftdockHoverHandler = null;
    var leftdockHoverHideTimer = 0;
    var controllerTogglePatched = false;
    var controllerToggleOriginal = null;
    var menuChangesObserver = null;
    var menuListObservedNode = null;
    var menuRebuildTimer = 0;
    var settingsOutsideHandler = null;
    var settingsLifecycleObserver = null;
    var swallowClickUntil = 0;
    var styleSignature = '';
    var detectedPerfLevel = null;
    var flexGapSupport = null;
    var cardPatchTimer = 0;

    function qs(sel, root) {
      return (root || document).querySelector(sel);
    }

    function qsa(sel, root) {
      return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    function pluginEnabled() {
      try {
        if (!window.Lampa || !Lampa.Storage) return true;
        return Lampa.Storage.get(ENABLE_KEY, 'on') !== 'off';
      } catch (e) {
        return true;
      }
    }

    function detectLampaLang() {
      try {
        if (!window.Lampa) return 'ru';
        var l = '';
        if (Lampa.Storage && Lampa.Storage.get) l = Lampa.Storage.get('language', '') || '';
        if (!l && Lampa.Lang && Lampa.Lang.selected) l = Lampa.Lang.selected();
        l = (l || '').toLowerCase();
        if (l.indexOf('uk') === 0 || l === 'ua') return 'uk';
        if (l.indexOf('en') === 0) return 'en';
        if (l.indexOf('ru') === 0) return 'ru';
        if (l.indexOf('be') === 0) return 'be';
        return 'ru';
      } catch (e) { return 'ru'; }
    }

    function getUiLang() {
      try {
        if (!window.Lampa || !Lampa.Storage) return detectLampaLang();
        var v = Lampa.Storage.get(UI_LANG_KEY, 'auto');
        if (!v || v === 'auto') return detectLampaLang();
        if (hasI18nCode(v)) return v;
        return 'ru';
      } catch (e) { return 'ru'; }
    }

    function getLogoLang() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'ru';
        var v = Lampa.Storage.get(LOGO_LANG_KEY, 'auto');
        if (!v || v === 'auto') return detectLampaLang();
        return v;
      } catch (e) { return 'ru'; }
    }

    function logoTitleEnabled() {
      try {
        if (!window.Lampa || !Lampa.Storage) return false;
        var v = Lampa.Storage.get(LOGO_TITLE_KEY, 'false');
        return v === true || v === 'true' || v === 'on';
      } catch (e) { return false; }
    }

    function getFontSize() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'md';
        return Lampa.Storage.get(FONT_SIZE_KEY, 'md') || 'md';
      } catch (e) { return 'md'; }
    }

    function getCategorySize() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'md';
        return Lampa.Storage.get(CATEGORY_SIZE_KEY, 'md') || 'md';
      } catch (e) { return 'md'; }
    }

    function getCardSize() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'md';
        return Lampa.Storage.get(CARD_SIZE_KEY, 'md') || 'md';
      } catch (e) { return 'md'; }
    }

    function getLogoSize() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'md';
        return Lampa.Storage.get(LOGO_SIZE_KEY, 'md') || 'md';
      } catch (e) { return 'md'; }
    }

    function getCacheMaxBytes() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 100 * 1024 * 1024;
        var v = Lampa.Storage.get(CACHE_SIZE_KEY, '100');
        if (v === 'unlimited') return Infinity;
        return (parseInt(v, 10) || 100) * 1024 * 1024;
      } catch (e) { return 100 * 1024 * 1024; }
    }

    function getPosterQuality() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'w500';
        var v = Lampa.Storage.get(POSTER_QUALITY_KEY, 'w500') || 'w500';
        var valid = ['w185', 'w342', 'w500', 'w780', 'original'];
        return valid.indexOf(v) > -1 ? v : 'w500';
      } catch (e) { return 'w500'; }
    }

    function getCardImageMode() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'backdrop';
        var v = Lampa.Storage.get(CARD_IMAGE_MODE_KEY, 'backdrop') || 'backdrop';
        return v === 'poster' ? 'poster' : 'backdrop';
      } catch (e) { return 'backdrop'; }
    }

    function getBackdropQuality() {
      var q = getPosterQuality();
      if (q === 'w185' || q === 'w342') return 'w300';
      if (q === 'w500') return 'w780';
      if (q === 'w780') return 'w1280';
      return 'original';
    }

    function getRatingStyle() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'color';
        var value = Lampa.Storage.get(RATING_STYLE_KEY, 'color') || 'color';
        return value === 'mono' ? 'mono' : 'color';
      } catch (e) { return 'color'; }
    }

    function storageFlagOn(key, def) {
      try {
        if (!window.Lampa || !Lampa.Storage) return def !== 'off';
        return Lampa.Storage.get(key, def) !== 'off';
      } catch (e) { return def !== 'off'; }
    }

    function backdropEnabled() { return storageFlagOn(BACKDROP_KEY, 'on'); }
    function badgeEnabled() { return storageFlagOn(BADGE_KEY, 'on'); }
    function ratingEnabled() { return storageFlagOn(RATING_KEY, 'off'); }
    function clockSecondsEnabled() { return storageFlagOn(CLOCK_SECONDS_KEY, 'off'); }
    function controlPanelEnabled() { return storageFlagOn(CONTROL_PANEL_KEY, 'off'); }

    function getPerfMode() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'auto';
        var v = Lampa.Storage.get(PERF_MODE_KEY, 'auto') || 'auto';
        if (v === 'high' || v === 'low' || v === 'ultra' || v === 'auto') return v;
        return 'auto';
      } catch (e) { return 'auto'; }
    }

    function detectPerfLevel() {
      if (detectedPerfLevel) return detectedPerfLevel;
      try {
        var nav = window.navigator || {};
        var dm = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 0;
        var hc = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 0;
        var ua = (nav.userAgent || '').toLowerCase();
        var chromeVer = 999;
        var m = ua.match(/chrome\/(\d+)/);
        if (m) chromeVer = parseInt(m[1], 10) || 999;
        var isAndroid = ua.indexOf('android') > -1;
        var isTV = ua.indexOf('tv') > -1 || ua.indexOf('webos') > -1 || ua.indexOf('tizen') > -1;

        if ((dm > 0 && dm <= 1) || chromeVer < 80 || (hc > 0 && hc <= 2)) {
          detectedPerfLevel = 'ultra';
        } else if ((dm > 0 && dm <= 2) || chromeVer < 88 || (isAndroid && hc > 0 && hc <= 4) || isTV) {
          detectedPerfLevel = 'low';
        } else {
          detectedPerfLevel = 'high';
        }
      } catch (e) { detectedPerfLevel = 'high'; }
      return detectedPerfLevel;
    }

    function resolvePerfLevel() {
      var mode = getPerfMode();
      if (mode === 'auto') return detectPerfLevel();
      return mode;
    }

    function detectFlexGapSupport() {
      if (flexGapSupport !== null) return flexGapSupport;
      try {
        if (!document.body) return true;
        var test = document.createElement('div');
        test.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden;';
        test.appendChild(document.createElement('div'));
        test.appendChild(document.createElement('div'));
        document.body.appendChild(test);
        flexGapSupport = test.scrollHeight === 1;
        document.body.removeChild(test);
      } catch (e) { flexGapSupport = true; }
      return flexGapSupport;
    }

    function t(key) {
      try {
        if (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
          registerI18nToLampa();
          return Lampa.Lang.translate(key, getUiLang());
        }
      } catch (e) { }
      return key;
    }

    function getCardAnim() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'veoveo';
        var raw = Lampa.Storage.get(CARD_ANIM_KEY, null);
        if (raw === 'off' || raw === 'veoveo' || raw === 'appletv') return raw;
        var legacy = Lampa.Storage.get(GLARE_KEY, 'on');
        if (legacy === 'off') return 'off';
        return 'veoveo';
      } catch (e) { return 'veoveo'; }
    }

    function glareEnabled() {
      return getCardAnim() === 'veoveo';
    }

    function cardAnimOrbitEnabled() {
      try {
        if (!window.Lampa || !Lampa.Storage) return false;
        var v = Lampa.Storage.get(CARD_ANIM_ORBIT_KEY, 'false');
        return v === true || v === 'true' || v === 'on';
      } catch (e) { return false; }
    }

    function sceneActive() {
      return true;
    }

    function removePluginUi() {
      try {
        if (document.body) {
          document.body.classList.remove(BODY_CLASS);
          document.body.classList.remove(GLARE_CLASS);
          document.body.removeAttribute(CARD_ANIM_ATTR);
          document.body.removeAttribute(FONT_SIZE_ATTR);
          document.body.removeAttribute(CATEGORY_SIZE_ATTR);
          document.body.removeAttribute(CARD_SIZE_ATTR);
          document.body.removeAttribute(LOGO_SIZE_ATTR);
          document.body.removeAttribute(BACKDROP_ATTR);
          document.body.removeAttribute(BADGE_ATTR);
          document.body.removeAttribute(RATING_ATTR);
          document.body.removeAttribute(PERF_ATTR);
          document.body.removeAttribute(FLEX_GAP_ATTR);
          document.body.removeAttribute(CARD_IMAGE_MODE_ATTR);
          document.body.removeAttribute(TOPNAV_SIZE_ATTR);
        }
        var style = document.getElementById(STYLE_ID);
        if (style) style.remove();
        styleSignature = '';
        var shell = document.querySelector('.agnative-topnav-shell');
        if (shell) shell.remove();
        var dock = document.querySelector('.agnative-topnav-rightdock');
        if (dock) dock.remove();
        var clock = document.getElementById(CLOCK_ID);
        if (clock) clock.remove();
        var panel = document.querySelector('.agnative-control-panel');
        if (panel) panel.remove();
        var leftdock = document.querySelector('.agnative-leftdock');
        if (leftdock) leftdock.remove();
        removeHeroBanner();
        disconnectMenuObserver();
        disconnectSettingsLifecycle();
        controlPanelOpen = false;
        unbindControlPanelOutsideClose();
        var headEl = document.querySelector('.head');
        if (headEl && headEl.__agnativeWheelBound) {
          headEl.removeEventListener('wheel', forwardWheelBelowTopnav, { passive: false });
          headEl.__agnativeWheelBound = false;
        }
        if (activityPushPatched && activityPushOriginal && window.Lampa && Lampa.Activity) {
          Lampa.Activity.push = activityPushOriginal;
          activityPushPatched = false;
          activityPushOriginal = null;
        }
        if (controllerTogglePatched && controllerToggleOriginal && window.Lampa && Lampa.Controller) {
          Lampa.Controller.toggle = controllerToggleOriginal;
          controllerTogglePatched = false;
          controllerToggleOriginal = null;
        }
      } catch (e) { }
    }

    function showReloadConfirm(cancel) {
      try {
        if (!window.Lampa || !Lampa.Modal || !Lampa.Lang || !window.$) return;
        Lampa.Modal.open({
          title: '',
          align: 'center',
          zIndex: 300,
          html: $('<div class="about">' + Lampa.Lang.translate('plugins_need_reload') + '</div>'),
          buttons: [
            {
              name: Lampa.Lang.translate('settings_param_no'),
              onSelect: function () {
                Lampa.Modal.close();
                if (typeof cancel === 'function') cancel();
              }
            },
            {
              name: Lampa.Lang.translate('settings_param_yes'),
              onSelect: function () {
                window.location.reload();
              }
            }
          ]
        });
      } catch (e) { }
    }

    function openSettingsSection(name, back) {
      if (!name || !window.Lampa || !Lampa.Settings || !Lampa.Settings.create) return;
      setTimeout(function () {
        Lampa.Settings.create(name, back ? {
          onBack: function () {
            Lampa.Settings.create(back);
          }
        } : {});
      }, 0);
    }

    function openTopnavSettingsSection() {
      if (!window.Lampa || !Lampa.Settings || !Lampa.Settings.create) return;
      topnavSettingsOpen = true;
      setTimeout(function () {
        Lampa.Settings.create(TOPNAV_SETTINGS_COMPONENT, {
          onBack: function () {
            topnavSettingsOpen = false;
            Lampa.Settings.create(SETTINGS_COMPONENT);
            setTimeout(function () { startPlugin(); }, 50);
            setTimeout(function () { schedulePatch(); }, 120);
          }
        });
      }, 0);
    }

    function openHeroSettingsSection() {
      if (!window.Lampa || !Lampa.Settings || !Lampa.Settings.create) return;
      setTimeout(function () {
        Lampa.Settings.create(HERO_SETTINGS_COMPONENT, {
          onBack: function () {
            Lampa.Settings.create(SETTINGS_COMPONENT);
          }
        });
      }, 0);
    }

    function openSettingsHideSection() {
      if (!window.Lampa || !Lampa.Settings || !Lampa.Settings.create) return;
      setTimeout(function () {
        Lampa.Settings.create(SETTINGS_HIDE_COMPONENT, {
          onBack: function () {
            Lampa.Settings.create(SETTINGS_COMPONENT);
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });
      }, 0);
    }

    // Standard Lampa top-level settings sections (data-component values in settings/main template).
    function getSettingsSectionDefs() {
      return [
        { id: 'account',          label: langText('settings_cub_sync', 'Sync') },
        { id: 'interface',        label: langText('settings_main_interface', 'Interface') },
        { id: 'player',           label: langText('settings_main_player', 'Player') },
        { id: 'parser',           label: langText('settings_main_parser', 'Parser') },
        { id: 'server',           label: langText('settings_main_torrserver', 'TorrServer') },
        { id: 'tmdb',             label: 'TMDB' },
        { id: 'plugins',          label: langText('settings_main_plugins', 'Plugins') },
        { id: 'parental_control', label: langText('title_parental_control', 'Parental control') },
        { id: 'more',             label: langText('settings_main_rest', 'More') }
      ];
    }

    function getHiddenSettingsSections() {
      try {
        if (!window.Lampa || !Lampa.Storage) return [];
        var raw = Lampa.Storage.get(SETTINGS_HIDE_KEY, []);
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); }
          catch (e) { raw = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
        }
        return Array.isArray(raw) ? raw : [];
      } catch (e) { return []; }
    }

    function setHiddenSettingsSections(list) {
      try {
        if (!window.Lampa || !Lampa.Storage) return;
        Lampa.Storage.set(SETTINGS_HIDE_KEY, Array.isArray(list) ? list : []);
      } catch (e) { }
    }

    function toggleSettingsSectionHidden(id, hidden) {
      var list = getHiddenSettingsSections();
      var idx = list.indexOf(id);
      if (hidden && idx === -1) list.push(id);
      if (!hidden && idx !== -1) list.splice(idx, 1);
      setHiddenSettingsSections(list);
    }

    function getFallbackTopnavItems() {
      return [
        { action: 'main', label: langText('menu_main', t('nav_main')) },
        { action: 'movie', label: langText('menu_movies', t('nav_movie')) },
        { action: 'tv', label: langText('menu_tv', t('nav_tv')) },
        { action: 'cartoon', label: langText('menu_multmovie', t('nav_cartoon')) },
        { action: 'anime', label: langText('menu_anime', t('nav_anime')) },
        { action: 'release', label: langText('title_new', t('nav_release')) },
        { action: 'releases', label: langText('title_new', t('nav_release')) },
        { action: 'collection', label: langText('menu_collections', t('nav_collection')) },
        { action: 'collections', label: langText('menu_collections', t('nav_collection')) },
        { action: 'schedule', label: langText('menu_timeline', t('nav_schedule')) },
        { action: 'history', label: langText('menu_history', t('nav_history')) },
        { action: 'bookmarks', label: langText('menu_bookmark', t('nav_bookmarks')) },
        { action: 'notice', label: langText('title_notice', t('nav_notice')) },
        { action: 'feed', label: t('nav_feed') },
        { action: 'console', label: langText('menu_torrents', t('nav_console')) }
      ];
    }

    function getAvailableTopnavItems() {
      var defs = [];
      var seen = {};

      qsa('.menu .menu__item.selector[data-action]').forEach(function (item) {
        var action = item.getAttribute('data-action');
        if (!action || seen[action]) return;
        if (action === 'search' || action === 'settings') return;
        var label = '';
        var labelNode = qs('.menu__text, .menu__item-name, .menu__item-text', item);
        if (labelNode) label = (labelNode.textContent || '').trim();
        if (!label) label = (item.textContent || '').trim();
        if (!label) label = action;
        seen[action] = true;
        defs.push({ action: action, label: label });
      });

      getFallbackTopnavItems().forEach(function (item) {
        if (seen[item.action]) return;
        seen[item.action] = true;
        defs.push(item);
      });

      return defs;
    }

    function getStoredTopnavActions() {
      try {
        if (!window.Lampa || !Lampa.Storage) return ['main', 'movie', 'tv', 'cartoon'];
        var raw = Lampa.Storage.get(TOPNAV_ITEMS_KEY, null);
        if (raw === null || typeof raw === 'undefined') return ['main', 'movie', 'tv', 'cartoon'];
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch (e) {
            raw = raw.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
          }
        }
        return Array.isArray(raw) ? raw : ['main', 'movie', 'tv', 'cartoon'];
      } catch (e) {
        return ['main', 'movie', 'tv', 'cartoon'];
      }
    }

    function setStoredTopnavActions(actions) {
      try {
        if (!window.Lampa || !Lampa.Storage) return;
        Lampa.Storage.set(TOPNAV_ITEMS_KEY, actions);
      } catch (e) { }
    }

    function syncGlareClass() {
      if (!document.body) return;
      if (glareEnabled() && pluginEnabled()) document.body.classList.add(GLARE_CLASS);
      else document.body.classList.remove(GLARE_CLASS);
      var mode = pluginEnabled() ? getCardAnim() : 'off';
      if (resolvePerfLevel() === 'ultra') mode = 'off';
      document.body.setAttribute(CARD_ANIM_ATTR, mode);
    }

    function syncFontSize() {
      if (!document.body) return;
      document.body.setAttribute(FONT_SIZE_ATTR, getFontSize());
      document.body.setAttribute(CATEGORY_SIZE_ATTR, getCategorySize());
    }

    function syncCardSize() {
      if (!document.body) return;
      document.body.setAttribute(CARD_SIZE_ATTR, getCardSize());
    }

    function syncLogoSize() {
      if (!document.body) return;
      document.body.setAttribute(LOGO_SIZE_ATTR, getLogoSize());
    }

    function syncCardFlags() {
      if (!document.body) return;
      document.body.setAttribute(BACKDROP_ATTR, backdropEnabled() ? 'on' : 'off');
      document.body.setAttribute(BADGE_ATTR, badgeEnabled() ? 'on' : 'off');
      document.body.setAttribute(RATING_ATTR, ratingEnabled() ? 'on' : 'off');
      document.body.setAttribute(RATING_STYLE_ATTR, getRatingStyle());
      document.body.setAttribute(CARD_IMAGE_MODE_ATTR, getCardImageMode());
    }

    function syncPerfMode() {
      if (!document.body) return;
      var level = resolvePerfLevel();
      document.body.setAttribute(PERF_ATTR, level);
      if (level === 'ultra') document.body.classList.remove(GLARE_CLASS);
    }

    function syncFlexGapFlag() {
      if (!document.body) return;
      document.body.setAttribute(FLEX_GAP_ATTR, detectFlexGapSupport() ? 'yes' : 'no');
    }

    function getOverlayAlign() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'start';
        var v = Lampa.Storage.get(OVERLAY_ALIGN_KEY, 'start') || 'start';
        return (v === 'center' || v === 'end') ? v : 'start';
      } catch (e) { return 'start'; }
    }

    function syncOverlayAlign() {
      if (!document.body) return;
      document.body.setAttribute(OVERLAY_ALIGN_ATTR, getOverlayAlign());
    }

    function restoreOriginalImg(cardEl) {
      var img = cardEl.querySelector('.card__img');
      if (!img) return;
      var origSrc = img.getAttribute('data-nfx-original-src');
      if (origSrc !== null) {
        if (img.tagName === 'IMG') img.src = origSrc;
        img.style.objectFit = '';
        img.style.objectPosition = '';
      }
      var origBg = img.getAttribute('data-nfx-original-bg');
      if (origBg !== null) {
        img.style.backgroundImage = origBg;
        img.style.backgroundSize = '';
        img.style.backgroundPosition = '';
      }
    }

    function resetCardSwitches() {
      qsa('.card[data-nfx-switched]').forEach(function (c) {
        restoreOriginalImg(c);
        c.removeAttribute('data-nfx-switched');
        var overlay = c.querySelector('.nfx-card-overlay');
        if (overlay) overlay.remove();
        var badge = c.querySelector('.nfx-card-logo');
        if (badge) badge.remove();
        var rating = c.querySelector('.nfx-card-rating');
        if (rating) rating.remove();
      });
    }

    function resetSettings() {
      try {
        if (!window.Lampa || !Lampa.Storage) return;
        Lampa.Storage.set(ENABLE_KEY, 'on');
        Lampa.Storage.set(GLARE_KEY, 'on');
        Lampa.Storage.set(CARD_ANIM_KEY, 'veoveo');
        Lampa.Storage.set(CARD_ANIM_ORBIT_KEY, 'false');
        Lampa.Storage.set(UI_LANG_KEY, 'auto');
        Lampa.Storage.set(LOGO_LANG_KEY, 'auto');
        Lampa.Storage.set(FONT_SIZE_KEY, 'md');
        Lampa.Storage.set(CATEGORY_SIZE_KEY, 'md');
        Lampa.Storage.set(BACKDROP_KEY, 'on');
        Lampa.Storage.set(BADGE_KEY, 'on');
        Lampa.Storage.set(RATING_KEY, 'off');
        Lampa.Storage.set(RATING_STYLE_KEY, 'color');
        Lampa.Storage.set(CLOCK_SECONDS_KEY, 'off');
        Lampa.Storage.set(CONTROL_PANEL_KEY, 'off');
        Lampa.Storage.set(PERF_MODE_KEY, 'auto');
        Lampa.Storage.set(LOGO_SIZE_KEY, 'md');
        Lampa.Storage.set(POSTER_QUALITY_KEY, 'w500');
        Lampa.Storage.set(OVERLAY_ALIGN_KEY, 'start');
        Lampa.Storage.set(CARD_IMAGE_MODE_KEY, 'backdrop');
        Lampa.Storage.set(LOGO_TITLE_KEY, 'false');
        Lampa.Storage.set(HERO_ALIGN_KEY, 'top');
        Lampa.Storage.set(HERO_INDICATORS_KEY, 'false');
        Lampa.Storage.set(HERO_ANIMATION_KEY, 'true');
        Lampa.Storage.set(HERO_INTERVAL_KEY, '40');
        Lampa.Storage.set(HERO_BG_ANIM_KEY, 'off');
        Lampa.Storage.set(HERO_QUALITY_KEY, 'w1280');
        Lampa.Storage.set(TOPNAV_ITEMS_KEY, ['main', 'movie', 'tv', 'cartoon']);
        logoCache = {};
        titledBackdropCache = {};
        posterCache = {};
        clearAll();
        syncGlareClass();
        syncFontSize();
        syncLogoSize();
        syncCardFlags();
        syncPerfMode();
        syncOverlayAlign();
        syncTopnavSize();
        resetCardSwitches();
        setTimeout(function () { schedulePatch(); }, 80);
        try {
          if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(t('set_reset_done'));
        } catch (e) { }
        setTimeout(function () {
          try {
            if (Lampa.Settings && Lampa.Settings.create) Lampa.Settings.create(SETTINGS_COMPONENT);
          } catch (e) { }
        }, 120);
      } catch (e) { }
    }

    function setTopnavActionState(action, enabled) {
      var current = getStoredTopnavActions().filter(function (item, index, arr) {
        return item && arr.indexOf(item) === index;
      });

      if (enabled) {
        if (current.indexOf(action) === -1) current.push(action);
      } else {
        current = current.filter(function (item) { return item !== action; });
      }

      // Preserve user-defined order, no auto-sorting
      setStoredTopnavActions(current);
    }

    function moveTopnavAction(action, direction) {
      var current = getStoredTopnavActions().filter(function (item, index, arr) {
        return item && arr.indexOf(item) === index;
      });
      var idx = current.indexOf(action);
      if (idx === -1) return;
      var newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= current.length) return;
      var tmp = current[idx];
      current[idx] = current[newIdx];
      current[newIdx] = tmp;
      setStoredTopnavActions(current);
    }

    function getSelectedTopnavItems() {
      var selected = getStoredTopnavActions();
      var map = {};
      getAvailableTopnavItems().forEach(function (item) {
        map[item.action] = item;
      });
      return selected.map(function (action) {
        return map[action];
      }).filter(Boolean);
    }

    function isOnMainPage() {
      try {
        if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function') {
          var active = Lampa.Activity.active();
          if (active && active.component) return active.component === 'main';
        }
      } catch (e) {}
      return false;
    }

    function heroBannerEnabled() {
      try {
        if (!window.Lampa || !Lampa.Storage) return false;
        var v = Lampa.Storage.get(HERO_KEY, 'false');
        return v === true || v === 'true' || v === 'on';
      } catch (e) { return false; }
    }

    function getHeroAlign() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'top';
        var v = Lampa.Storage.get(HERO_ALIGN_KEY, 'top') || 'top';
        return (v === 'center' || v === 'bottom') ? v : 'top';
      } catch (e) { return 'top'; }
    }

    function heroIndicatorsEnabled() {
      try {
        if (!window.Lampa || !Lampa.Storage) return false;
        var v = Lampa.Storage.get(HERO_INDICATORS_KEY, 'false');
        return v === true || v === 'true' || v === 'on';
      } catch (e) { return false; }
    }

    function heroAnimationEnabled() {
      try {
        if (!window.Lampa || !Lampa.Storage) return true;
        var v = Lampa.Storage.get(HERO_ANIMATION_KEY, 'true');
        return !(v === false || v === 'false' || v === 'off');
      } catch (e) { return true; }
    }

    function getHeroIntervalMs() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 40000;
        var v = parseInt(Lampa.Storage.get(HERO_INTERVAL_KEY, '40'), 10);
        if (!v || v < 2) v = 40;
        if (v > 60) v = 60;
        return v * 1000;
      } catch (e) { return 40000; }
    }

    function getHeroTrailerMode() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'mixed';
        var v = Lampa.Storage.get(HERO_TRAILER_MODE_KEY, '');
        if (v === 'posters') return 'posters';
        if (v === 'trailers') return 'trailers';
        if (v === 'mixed' || v === 'video') return 'mixed';
        var legacy = Lampa.Storage.get(HERO_TRAILER_KEY, 'true');
        if (legacy === false || legacy === 'false' || legacy === 'off') return 'posters';
        return 'mixed';
      } catch (e) { return 'mixed'; }
    }

    function heroTrailerEnabled() {
      return getHeroTrailerMode() !== 'posters';
    }

    function getHeroTrailerQuality() {
      try {
        if (!window.Lampa || !Lampa.Storage) return '720p';
        var v = Lampa.Storage.get(HERO_TRAILER_QUALITY_KEY, '720p') || '720p';
        if (v === '1080p' || v === '720p' || v === '480p') return v;
        return '720p';
      } catch (e) { return '720p'; }
    }

    function getHeroTrailerDelayMs() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 8000;
        var v = parseInt(Lampa.Storage.get(HERO_TRAILER_DELAY_KEY, '8'), 10);
        if (!v || v < 2) v = 8;
        if (v > 60) v = 60;
        return v * 1000;
      } catch (e) { return 8000; }
    }

    var HERO_BG_ANIM_VALUES = ['off', 'pan-down', 'pan-up', 'zoom-in', 'zoom-out', 'drift', 'breathe'];

    function getHeroBgAnim() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'off';
        // backward compat: old pan toggle on → treat as pan-down if new key not set
        var legacy = Lampa.Storage.get(HERO_PAN_KEY, 'false');
        var v = Lampa.Storage.get(HERO_BG_ANIM_KEY, '');
        if (!v && (legacy === true || legacy === 'true' || legacy === 'on')) return 'pan-down';
        return HERO_BG_ANIM_VALUES.indexOf(v) >= 0 ? v : 'off';
      } catch (e) { return 'off'; }
    }

    function getHeroQuality() {
      try {
        if (!window.Lampa || !Lampa.Storage) return 'w1280';
        var v = Lampa.Storage.get(HERO_QUALITY_KEY, 'w1280') || 'w1280';
        if (v === 'w780' || v === 'w1280' || v === 'original') return v;
        return 'w1280';
      } catch (e) { return 'w1280'; }
    }

    function measureHeroPan(bg) {
      if (!bg) bg = document.querySelector('.agnative-hero__bg');
      if (!bg) return;
      var hero = bg.parentNode;
      if (!hero) return;
      var overflow = bg.offsetHeight - hero.offsetHeight;
      bg.style.setProperty('--hero-pan-y', Math.max(0, overflow) + 'px');
    }

    function applyHeroBgAnim() {
      var bg = document.querySelector('.agnative-hero__bg');
      if (!bg) return;
      bg.style.animation = 'none';
      var anim = getHeroBgAnim();
      if (anim === 'off') return;
      measureHeroPan(bg);
      void bg.offsetWidth;
      var dur = (getHeroIntervalMs() / 1000) + 's';
      if      (anim === 'pan-down') bg.style.animation = 'agnative-hero-pan-down '  + dur + ' linear forwards';
      else if (anim === 'pan-up')   bg.style.animation = 'agnative-hero-pan-up '    + dur + ' linear forwards';
      else if (anim === 'zoom-in')  bg.style.animation = 'agnative-hero-zoom-in '   + dur + ' ease-in-out forwards';
      else if (anim === 'zoom-out') bg.style.animation = 'agnative-hero-zoom-out '  + dur + ' ease-in-out forwards';
      else if (anim === 'drift')    bg.style.animation = 'agnative-hero-drift '     + dur + ' ease-in-out forwards';
      else if (anim === 'breathe')  bg.style.animation = 'agnative-hero-breathe ' + dur + ' ease-in-out infinite';
    }

    function syncHeroAttrs(hero) {
      if (!hero) hero = document.querySelector('.agnative-hero');
      if (!hero) return;
      hero.setAttribute(HERO_ALIGN_ATTR, getHeroAlign());
      hero.setAttribute(HERO_ANIMATION_ATTR, heroAnimationEnabled() ? 'on' : 'off');
    }

    function stopHeroRotation() {
      if (heroRotationTimer) { clearInterval(heroRotationTimer); heroRotationTimer = null; }
    }

    function removeHeroBanner() {
      stopHeroRotation();
      if (heroIdleTimer) { clearTimeout(heroIdleTimer); heroIdleTimer = null; }
      heroTrailerActive = false;
      var hero = document.querySelector('.agnative-hero');
      if (hero) hero.remove();
      heroItems = [];
      heroCurrentIndex = 0;
      heroCurrentItem = null;
      applyHeroAccent(null);
      if (document.body) {
        document.body.classList.remove('agnative-has-hero');
        document.body.classList.remove('agnative-hero-collapsed');
      }
    }

    function extractDominantColor(url, callback) {
      if (!url) return callback(null);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        try {
          var canvas = document.createElement('canvas');
          var w = 32, h = 32;
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var data = ctx.getImageData(0, 0, w, h).data;
          var r = 0, g = 0, b = 0, count = 0;
          for (var i = 0; i < data.length; i += 4) {
            var pr = data[i], pg = data[i + 1], pb = data[i + 2];
            var lum = (pr + pg + pb) / 3;
            if (lum < 25 || lum > 230) continue;
            r += pr; g += pg; b += pb; count++;
          }
          if (count === 0) return callback(null);
          callback({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
        } catch (e) { callback(null); }
      };
      img.onerror = function () { callback(null); };
      img.src = url;
    }

    function applyHeroAccent(rgb) {
      // Reverted: accent gradient on body was creating a dark band at top of screen.
      // Keeping function as no-op to preserve API for other callers.
      return;
    }

    function detectHeroItemType(item) {
      if (!item) return 'movie';
      if (item.media_type === 'tv' || item.media_type === 'movie') return item.media_type;
      if (item.number_of_seasons || item.seasons || item.episode_run_time) return 'tv';
      if (item.runtime) return 'movie';
      if (item.first_air_date && !item.release_date) return 'tv';
      if (item.release_date && !item.first_air_date) return 'movie';
      if (item.name && !item.title) return 'tv';
      return 'movie';
    }

    function renderHeroSlide(item) {
      var hero = document.querySelector('.agnative-hero');
      if (!hero || !item) return;
      heroCurrentItem = item;
      updateHeroIndicators();
      applyHeroInstantClass(item);
      try {
        var id = item.id;
        var type = detectHeroItemType(item);

        var bg = hero.querySelector('.agnative-hero__bg');
        if (bg) {
          var newSrc = item.backdrop_path ? Lampa.TMDB.image('t/p/' + getHeroQuality() + item.backdrop_path) : (item._heroFallbackImg || '');
          if (bg.src !== newSrc) {
            bg.src = newSrc;
            extractDominantColor(newSrc, applyHeroAccent);
          } else {
            applyHeroBgAnim();
          }
        }

        var badgeEl = hero.querySelector('.agnative-hero__badge');
        if (badgeEl) badgeEl.textContent = type === 'tv' ? t('badge_tv') : t('badge_movie');

        var year = (item.release_date || item.first_air_date || '').slice(0, 4);
        var genres = getGenreNames(item).slice(0, 3).join(' · ');
        var yearEl = hero.querySelector('.agnative-hero__year');
        if (yearEl) yearEl.textContent = year || '';
        var metaEl = hero.querySelector('.agnative-hero__meta');
        if (metaEl) metaEl.textContent = genres;

        var overviewEl = hero.querySelector('.agnative-hero__overview');
        if (overviewEl) overviewEl.textContent = item.overview || '';

        var titleEl = hero.querySelector('.agnative-hero__title');
        var logoEl = hero.querySelector('.agnative-hero__logo');
        if (titleEl) { titleEl.textContent = item.title || item.name || ''; titleEl.style.display = ''; }
        if (logoEl) { logoEl.src = ''; logoEl.style.display = 'none'; }

        if (id) {
          var requestedId = id;
          var logoType = item.name ? 'tv' : 'movie';
          fetchLogo(id, logoType, function (logo) {
            if (!heroCurrentItem || heroCurrentItem.id !== requestedId) return;
            var h = document.querySelector('.agnative-hero');
            if (!h) return;
            var lEl = h.querySelector('.agnative-hero__logo');
            var tEl = h.querySelector('.agnative-hero__title');
            if (!logo || !logo.path) {
              if (lEl) lEl.style.display = 'none';
              if (tEl) tEl.style.display = '';
              return;
            }
            var logoUrl = logoImgUrl(logo.path);
            imgLoad(logoUrl, function (src) {
              if (!heroCurrentItem || heroCurrentItem.id !== requestedId) {
                if (src !== logoUrl) { try { URL.revokeObjectURL(src); } catch (e) {} }
                return;
              }
              if (!lEl) return;
              lEl.onload = function () { if (src !== logoUrl) { try { URL.revokeObjectURL(src); } catch (e) {} } };
              lEl.onerror = function () {
                if (src !== logoUrl) { try { URL.revokeObjectURL(src); } catch (e) {} }
                lEl.style.display = 'none';
                if (tEl) tEl.style.display = '';
              };
              lEl.src = src;
              lEl.style.display = '';
              if (tEl) tEl.style.display = 'none';
            });
          });
        }

      } catch (e) { }
    }

    function openHeroCurrentItem() {
      try {
        var item = heroCurrentItem;
        if (!item || !window.Lampa || !Lampa.Activity) return;
        var type = detectHeroItemType(item);
        var src = (Lampa.Storage && Lampa.Storage.field) ? Lampa.Storage.field('source') : 'tmdb';
        Lampa.Activity.push({ url: '', title: item.title || item.name || '', component: 'full', id: item.id, method: type, source: src, card: item });
      } catch (e) { }
    }

    function scrollActivityToHero(hero) {
      try {
        if (!hero) hero = document.querySelector('.agnative-hero');
        if (!hero) return;
        var scrollBody = hero.closest ? hero.closest('.scroll__body') : null;
        if (!scrollBody) {
          scrollBody = document.querySelector('.activity--active .scroll__body') ||
                       document.querySelector('.scroll__body');
        }
        if (scrollBody) {
          scrollBody.style.transform = 'translate3d(0px, 0px, 0px)';
          scrollBody.style.webkitTransform = 'translate3d(0px, 0px, 0px)';
        }
        var scrollHost = hero.closest ? hero.closest('.scroll') : null;
        if (scrollHost) scrollHost.scrollTop = 0;
      } catch (e) { }
    }

    function ensureHeroController() {
      if (window.__AGNATIVE_HERO_CONTROLLER__) return;
      if (!window.Lampa || !Lampa.Controller || !Lampa.Controller.add || !window.$) return;
      window.__AGNATIVE_HERO_CONTROLLER__ = true;
      Lampa.Controller.add('agnative_hero', {
        toggle: function () {
          var btn = document.querySelector('.agnative-hero__play');
          var hero = document.querySelector('.agnative-hero');
          if (!btn || !hero) {
            try { Lampa.Controller.toggle('content'); } catch (e) { }
            return;
          }
          heroExitDirection = null;
          hero.classList.remove('agnative-hero--hidden');
          if (document.body) document.body.classList.remove('agnative-hero-collapsed');
          scrollActivityToHero(hero);
          try {
            Lampa.Controller.collectionSet($(hero));
            Lampa.Controller.collectionFocus(btn, $(hero));
          } catch (e) { }
        },
        up: function () {
          heroClearIdle();
          if (window.Navigator && Navigator.canmove && Navigator.canmove('up')) {
            Navigator.move('up');
            return;
          }
          heroExitDirection = 'up';
          try { Lampa.Controller.toggle('head'); } catch (e) { }
        },
        down: function () {
          heroClearIdle();
          if (window.Navigator && Navigator.canmove && Navigator.canmove('down')) {
            Navigator.move('down');
            return;
          }
          heroExitDirection = 'down';
          try { Lampa.Controller.toggle('content'); } catch (e) { }
        },
        left: function () {
          // Browse hero items leftwards; at the first item hand off to the left menu.
          if (heroItems.length > 1 && heroCurrentIndex > 0) {
            transitionHeroToIndex(heroCurrentIndex - 1);
            startHeroRotation();
            return;
          }
          heroClearIdle();
          heroExitDirection = 'left';
          try { Lampa.Controller.toggle('menu'); } catch (e) { }
        },
        right: function () {
          // Browse hero items rightwards; stop at the last item.
          if (heroItems.length > 1 && heroCurrentIndex < heroItems.length - 1) {
            transitionHeroToIndex(heroCurrentIndex + 1);
            startHeroRotation();
          }
        },
        back: function () {
          try { if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); } catch (e) { }
        }
      });
    }

    function focusHeroPlayButton() {
      try {
        var btn = document.querySelector('.agnative-hero__play');
        if (!btn || !window.Lampa || !Lampa.Controller) return;
        ensureHeroController();
        Lampa.Controller.toggle('agnative_hero');
      } catch (e) { }
    }

    var heroTransitionTimer = null;

    function transitionHeroToIndex(idx, force) {
      if (idx < 0 || idx >= heroItems.length || !heroItems[idx]) return;
      if (idx === heroCurrentIndex) return;
      var hero = document.querySelector('.agnative-hero');
      if (!hero) return;
      if (heroTrailerActive) stopHeroTrailer();
      if (heroTransitionTimer) { clearTimeout(heroTransitionTimer); heroTransitionTimer = null; }
      heroCurrentIndex = idx;
      var nextItem = heroItems[idx];
      heroCurrentItem = nextItem;
      updateHeroIndicators();
      if (heroItems.length > 1) {
        var nextIdx = (idx + 1) % heroItems.length;
        bumpHeroPrefetchPriority(heroItems[nextIdx]);
      }
      applyHeroInstantClass(nextItem);

      var earlyTrailer = heroTrailerEnabled() && !heroVideoCooldown && (heroPlayFocused() || force) && !isUiLayerOpen();
      var lvl = resolvePerfLevel();
      if (lvl === 'ultra') earlyTrailer = false;
      if (earlyTrailer) heroStartTrailer(true);

      var instantTransition = hero.classList.contains('agnative-hero--instant-trailer');

      if (heroAnimationEnabled() && !instantTransition) {
        hero.classList.add('agnative-hero--switching');
        heroTransitionTimer = setTimeout(function () {
          heroTransitionTimer = null;
          renderHeroSlide(nextItem);
          if (!earlyTrailer && (force || heroPlayFocused())) heroResetIdle(force);
          setTimeout(function () {
            var hh = document.querySelector('.agnative-hero.agnative-hero--switching');
            if (hh) hh.classList.remove('agnative-hero--switching');
          }, 2000);
        }, 320);
      } else {
        renderHeroSlide(nextItem);
        if (!earlyTrailer) heroResetIdle(force);
      }
    }

    function startHeroRotation() {
      stopHeroRotation();
      if (heroItems.length < 2) return;
      heroRotationTimer = setInterval(function () {
        var hero = document.querySelector('.agnative-hero');
        if (!hero) { stopHeroRotation(); return; }
        var nextIdx = (heroCurrentIndex + 1) % heroItems.length;
        transitionHeroToIndex(nextIdx);
      }, getHeroIntervalMs());
    }

    function heroPlayFocused() {
      var btn = document.querySelector('.agnative-hero__play');
      if (btn && (btn.classList.contains('focus') || btn.classList.contains('hover'))) return true;
      var hero = document.querySelector('.agnative-hero');
      if (hero && !hero.classList.contains('agnative-hero--unfocused') && !hero.classList.contains('agnative-hero--hidden')) {
        try {
          if (window.Lampa && Lampa.Controller && Lampa.Controller.enabled) {
            var en = Lampa.Controller.enabled();
            if (en && en.name === 'agnative_hero') return true;
          }
        } catch (e) { }
      }
      return false;
    }

    function cleanupHeroVideoOnly() {
      if (heroVideoReadyTimer)    { clearTimeout(heroVideoReadyTimer);    heroVideoReadyTimer = null; }
      if (heroVideoRevealTimer)   { clearTimeout(heroVideoRevealTimer);   heroVideoRevealTimer = null; }
      if (heroVideoDurationTimer) { clearTimeout(heroVideoDurationTimer); heroVideoDurationTimer = null; }
      if (heroVideoEl) {
        try {
          heroVideoEl.pause();
          heroVideoEl.removeAttribute('src');
          heroVideoEl.load();
        } catch (e) { }
        if (heroVideoEl.parentNode) {
          try { heroVideoEl.parentNode.removeChild(heroVideoEl); } catch (e) { }
        }
        heroVideoEl = null;
      }
      if (heroVideoObjUrl) { videoRevoke(heroVideoObjUrl); heroVideoObjUrl = ''; }
      heroVideoCurrentSrc = '';
    }

    function heroVideoUrlsForKey(key, preferredQuality) {
      var quals = ['1080p', '720p', '480p'];
      var pref = (preferredQuality === '1080p' || preferredQuality === '720p' || preferredQuality === '480p') ? preferredQuality : '720p';
      var ordered = [pref];
      for (var i = 0; i < quals.length; i++) if (quals[i] !== pref) ordered.push(quals[i]);
      return ordered.map(function (q) { return heroProxyUrl(HERO_VIDEO_BASE + '/' + key + '/' + key + '_' + q + '.mp4'); });
    }

    function heroReadResolvedTrailer(imdbId) {
      if (!imdbId) return null;
      if (heroResolvedTrailer[imdbId]) return heroResolvedTrailer[imdbId];
      try {
        var raw = localStorage.getItem(HERO_TRAILER_RESOLVED_LS);
        if (!raw) return null;
        var obj = JSON.parse(raw);
        if (obj && obj[imdbId]) {
          heroResolvedTrailer[imdbId] = obj[imdbId];
          return obj[imdbId];
        }
      } catch (e) { }
      return null;
    }

    function heroWriteResolvedTrailer(imdbId, payload) {
      if (!imdbId) return;
      heroResolvedTrailer[imdbId] = payload;
      try {
        var raw = localStorage.getItem(HERO_TRAILER_RESOLVED_LS);
        var obj = raw ? JSON.parse(raw) : {};
        if (!obj || typeof obj !== 'object') obj = {};
        obj[imdbId] = payload;
        localStorage.setItem(HERO_TRAILER_RESOLVED_LS, JSON.stringify(obj));
      } catch (e) { }
    }

    function heroForgetResolvedTrailer(imdbId) {
      if (!imdbId) return;
      delete heroResolvedTrailer[imdbId];
      try {
        var raw = localStorage.getItem(HERO_TRAILER_RESOLVED_LS);
        if (!raw) return;
        var obj = JSON.parse(raw);
        if (obj && obj[imdbId]) {
          delete obj[imdbId];
          localStorage.setItem(HERO_TRAILER_RESOLVED_LS, JSON.stringify(obj));
        }
      } catch (e) { }
    }

    function heroNoteNetFailure() {
      heroVideoNetFailures++;
      if (heroVideoNetFailures >= HERO_TRAILER_FAIL_LIMIT) {
        heroVideoCooldown = true;
        if (heroCooldownTimer) clearTimeout(heroCooldownTimer);
        heroCooldownTimer = setTimeout(function () {
          heroVideoCooldown = false;
          heroVideoNetFailures = 0;
          heroCooldownTimer = null;
        }, HERO_COOLDOWN_RESET_MS);
      }
    }

    function heroNoteNetSuccess() {
      heroVideoNetFailures = 0;
      if (heroVideoCooldown) {
        heroVideoCooldown = false;
        if (heroCooldownTimer) { clearTimeout(heroCooldownTimer); heroCooldownTimer = null; }
      }
    }

    function heroResolveImdbIdSync(item) {
      if (!item || !item.id) return '';
      if (typeof item.imdb_id === 'string' && item.imdb_id.indexOf('tt') === 0) return item.imdb_id;
      var type = detectHeroItemType(item);
      var key = 'imdb_id/' + type + '/' + item.id;
      var v = heroImdbIdCache[key];
      return (typeof v === 'string' && v.indexOf('tt') === 0) ? v : '';
    }

    function heroIsTrailerInstant(item) {
      var imdbId = heroResolveImdbIdSync(item);
      if (!imdbId) return false;
      var resolved = heroReadResolvedTrailer(imdbId);
      if (!resolved || !resolved.key) return false;
      var url = heroVideoUrlsForKey(resolved.key, getHeroTrailerQuality())[0];
      return !!heroBlobCached[url];
    }

    function heroClearInstant() {
      var hero = document.querySelector('.agnative-hero');
      if (hero) hero.classList.remove('agnative-hero--instant-trailer');
    }

    function applyHeroInstantClass(item) {
      var hero = document.querySelector('.agnative-hero');
      if (!hero) return;
      var instant = getHeroTrailerMode() === 'trailers' && heroIsTrailerInstant(item);
      hero.classList.toggle('agnative-hero--instant-trailer', instant);
    }

    function resolveImdbId(tmdbId, type, callback, sourceItem) {
      if (!tmdbId) return callback('');
      if (sourceItem && typeof sourceItem.imdb_id === 'string' && sourceItem.imdb_id.indexOf('tt') === 0) {
        return callback(sourceItem.imdb_id);
      }
      var cacheKey = 'imdb_id_v2/' + type + '/' + tmdbId;
      if (heroImdbIdCache[cacheKey] !== undefined) return callback(heroImdbIdCache[cacheKey]);
      if (heroImdbIdPending[cacheKey]) { heroImdbIdPending[cacheKey].push(callback); return; }
      heroImdbIdPending[cacheKey] = [callback];

      function finish(value, persist) {
        heroImdbIdCache[cacheKey] = value || '';
        if (persist) { try { metaSet(cacheKey, value || ''); } catch (e) {} }
        var cbs = heroImdbIdPending[cacheKey] || [];
        delete heroImdbIdPending[cacheKey];
        for (var i = 0; i < cbs.length; i++) {
          try { cbs[i](value || ''); } catch (e) {}
        }
      }

      metaGet(cacheKey, function (persisted) {
        if (persisted !== undefined && persisted !== null) {
          heroImdbIdCache[cacheKey] = persisted || '';
          var cbs = heroImdbIdPending[cacheKey] || [];
          delete heroImdbIdPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) {
            try { cbs[i](persisted || ''); } catch (e) {}
          }
          return;
        }
        var url = 'https://api.themoviedb.org/3/' + type + '/' + tmdbId + '/external_ids?api_key=' + TMDB_KEY;
        fetchJsonWithTimeout(url, 8000).then(function (data) {
          finish((data && data.imdb_id) || '', !!(data && data.imdb_id));
        }, function () {
          finish('', false);
        });
      });
    }

    function stopHeroTrailer() {
      var hero = document.querySelector('.agnative-hero');
      var wasActive = heroTrailerActive;
      heroTrailerActive = false;
      heroTrailerAttempt++;

      cleanupHeroVideoOnly();

      if (hero) {
        hero.classList.remove('agnative-hero--trailer');
        var wrap = hero.querySelector('.agnative-hero__trailer');
        if (wrap) { wrap.innerHTML = ''; wrap.remove(); }
      }
      if (wasActive && hero && heroItems.length > 1) startHeroRotation();
    }

    function heroClearIdle() {
      if (heroIdleTimer) { clearTimeout(heroIdleTimer); heroIdleTimer = null; }
      stopHeroTrailer();
    }

    function updateHeroTrailerDelayVisibility() {
      try {
        var rows = document.querySelectorAll('[data-agnative-hero-trailer-delay]');
        var show = getHeroTrailerMode() === 'mixed';
        for (var i = 0; i < rows.length; i++) {
          rows[i].style.display = show ? '' : 'none';
        }
      } catch (e) { }
    }

    function heroResetIdle(force) {
      if (heroIdleTimer) { clearTimeout(heroIdleTimer); heroIdleTimer = null; }
      var mode = getHeroTrailerMode();
      if (mode === 'posters') return;
      var lvl = resolvePerfLevel();
      if (lvl === 'ultra') return;
      if (!force && !heroPlayFocused()) return;
      if (isUiLayerOpen()) return;
      if (heroVideoCooldown) return;
      var delay = mode === 'trailers' ? 0 : getHeroTrailerDelayMs();
      heroRevealAfterTs = delay > 0 ? Date.now() + delay : 0;
      heroStartTrailer(force);
    }

    // Validity check after any async step: trailer still wanted, same item, hero present.
    function heroValid(reqId, force) {
      if (!heroTrailerActive) return false;
      if (!force && !heroPlayFocused()) return false;
      if (!heroCurrentItem || heroCurrentItem.id !== reqId) return false;
      return !!document.querySelector('.agnative-hero');
    }

    function heroEnsureTrailerWrap() {
      var hero = document.querySelector('.agnative-hero');
      if (!hero) return null;
      var wrap = hero.querySelector('.agnative-hero__trailer');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'agnative-hero__trailer';
        var bgEl = hero.querySelector('.agnative-hero__bg');
        if (bgEl && bgEl.nextSibling) hero.insertBefore(wrap, bgEl.nextSibling);
        else hero.appendChild(wrap);
      }
      wrap.innerHTML = '';
      return wrap;
    }

    function heroRevealTrailer() {
      var h = document.querySelector('.agnative-hero');
      if (h && heroTrailerActive) h.classList.add('agnative-hero--trailer');
    }

    function heroStartTrailer(force) {
      if (!heroTrailerEnabled()) return;
      if (heroTrailerActive) return;
      if (!force && !heroPlayFocused()) return;
      if (heroVideoCooldown) return;
      var item = heroCurrentItem;
      if (!item || !item.id) return;
      if (!document.querySelector('.agnative-hero')) return;

      var reqId = item.id;
      var type = detectHeroItemType(item);

      heroTrailerActive = true;
      stopHeroRotation();

      fetchHeroTrailer(item.id, type, function (keys) {
        if (!heroCurrentItem || heroCurrentItem.id !== reqId) return;
        if (!heroTrailerActive) return;
        if (!force && !heroPlayFocused()) { stopHeroTrailer(); return; }
        if (!document.querySelector('.agnative-hero')) return;
        if (!keys || !keys.length) { heroClearInstant(); stopHeroTrailer(); return; }
        attemptHeroTrailerKey(reqId, keys, 0, force);
      }, item);
    }

    function heroTrailerDurationElapsed(reqId, myAttempt) {
      if (myAttempt !== heroTrailerAttempt) return;
      if (!heroValid(reqId, true)) { stopHeroTrailer(); return; }
      if (heroItems.length > 1) {
        var nextIdx = (heroCurrentIndex + 1) % heroItems.length;
        transitionHeroToIndex(nextIdx, true);
        return;
      }
      try {
        if (heroVideoEl) {
          heroVideoEl.currentTime = HERO_TRAILER_START_SEC;
          var p = heroVideoEl.play();
          if (p && typeof p.catch === 'function') p.catch(function () { });
        }
      } catch (e) { }
      heroVideoDurationTimer = setTimeout(function () {
        heroTrailerDurationElapsed(reqId, myAttempt);
      }, getHeroIntervalMs());
    }

    function attemptHeroTrailerKey(reqId, queue, index, force) {
      if (!heroCurrentItem || heroCurrentItem.id !== reqId) return;
      if (!heroTrailerActive) return;
      if (!force && !heroPlayFocused()) { stopHeroTrailer(); return; }
      if (!document.querySelector('.agnative-hero')) return;
      if (heroVideoCooldown) { heroClearInstant(); stopHeroTrailer(); return; }

      while (index < queue.length && heroUnplayable[queue[index]]) index++;
      if (index >= queue.length) { heroClearInstant(); stopHeroTrailer(); return; }

      cleanupHeroVideoOnly();

      var key = queue[index];
      var myAttempt = ++heroTrailerAttempt;
      var quality = getHeroTrailerQuality();
      var urls = heroVideoUrlsForKey(key, quality);

      var wrap = heroEnsureTrailerWrap();
      if (!wrap) { stopHeroTrailer(); return; }

      function isStale() { return myAttempt !== heroTrailerAttempt; }

      var revealed = false;
      var urlIdx = 0;

      function abandonKey() {
        if (isStale()) return;
        heroUnplayable[key] = true;
        var item = heroCurrentItem;
        if (item && item.id) {
          var type = detectHeroItemType(item);
          resolveImdbId(item.id, type, function (imdbId) {
            var resolved = imdbId ? heroReadResolvedTrailer(imdbId) : null;
            if (resolved && resolved.key === key) heroForgetResolvedTrailer(imdbId);
          });
        }
        cleanupHeroVideoOnly();
        attemptHeroTrailerKey(reqId, queue, index + 1, force);
      }

      var fromCacheFlag = false;
      function tryNextUrl() {
        if (isStale()) return;
        while (urlIdx < urls.length && heroUnplayable[urls[urlIdx]]) urlIdx++;
        if (urlIdx >= urls.length) { abandonKey(); return; }
        var url = urls[urlIdx++];
        heroVideoCurrentSrc = url;
        videoLoad(url, function (resolvedSrc, fromCache) {
          if (isStale()) {
            if (resolvedSrc !== url) videoRevoke(resolvedSrc);
            return;
          }
          if (heroVideoObjUrl && heroVideoObjUrl !== resolvedSrc) {
            videoRevoke(heroVideoObjUrl);
          }
          heroVideoObjUrl = resolvedSrc !== url ? resolvedSrc : '';
          fromCacheFlag = !!fromCache;
          if (fromCache) heroBlobCached[url] = true;
          if (!heroVideoEl) { abandonKey(); return; }
          heroVideoEl.muted = true;
          heroVideoEl.volume = 0;
          heroVideoEl.setAttribute('muted', '');
          heroVideoEl.src = resolvedSrc;
          try { heroVideoEl.load(); } catch (e) { }
          var attemptPlay = function () {
            if (isStale() || !heroVideoEl) return;
            try {
              heroVideoEl.muted = true;
              var pp = heroVideoEl.play();
              if (pp && typeof pp.catch === 'function') pp.catch(function () { });
            } catch (e) { }
          };
          attemptPlay();
          setTimeout(attemptPlay, 80);
        });
      }

      var video = document.createElement('video');
      video.className = 'agnative-hero__video';
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('disablepictureinpicture', '');
      video.setAttribute('disableremoteplayback', '');
      video.setAttribute('tabindex', '-1');
      video.setAttribute('aria-hidden', 'true');
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.controls = false;
      video.preload = 'auto';
      video.volume = 0;
      wrap.appendChild(video);
      heroVideoEl = video;

      function revealAndStartDuration() {
        if (isStale()) return;
        if (!heroTrailerActive || !heroValid(reqId, force)) return;
        var nowMs = Date.now();
        if (heroRevealAfterTs && nowMs < heroRevealAfterTs) {
          if (heroVideoRevealTimer) clearTimeout(heroVideoRevealTimer);
          heroVideoRevealTimer = setTimeout(revealAndStartDuration, Math.max(50, heroRevealAfterTs - nowMs));
          return;
        }
        if (heroVideoRevealTimer) { clearTimeout(heroVideoRevealTimer); heroVideoRevealTimer = null; }
        if (heroVideoReadyTimer)  { clearTimeout(heroVideoReadyTimer);  heroVideoReadyTimer = null; }
        heroRevealTrailer();
        heroNoteNetSuccess();
        var item = heroCurrentItem;
        if (item && item.id) {
          var type = detectHeroItemType(item);
          resolveImdbId(item.id, type, function (imdbId) {
            if (imdbId) heroWriteResolvedTrailer(imdbId, { key: key });
          });
        }
        if (heroVideoDurationTimer) clearTimeout(heroVideoDurationTimer);
        heroVideoDurationTimer = setTimeout(function () {
          heroTrailerDurationElapsed(reqId, myAttempt);
        }, getHeroIntervalMs());
      }

      var startSec = HERO_TRAILER_START_SEC;
      var seekFallbackTimer = null;
      video.addEventListener('loadedmetadata', function () {
        if (isStale()) return;
        var dur = isFinite(video.duration) ? video.duration : 0;
        if (dur > 0 && dur < HERO_TRAILER_START_SEC + 4) startSec = 0;
        try { video.currentTime = startSec; } catch (e) { }
        if (startSec > 0) {
          if (seekFallbackTimer) clearTimeout(seekFallbackTimer);
          seekFallbackTimer = setTimeout(function () {
            if (isStale() || revealed) return;
            startSec = 0;
            revealed = true;
            revealAndStartDuration();
          }, 3500);
        }
      });

      video.addEventListener('seeked', function () {
        if (isStale() || revealed) return;
        if (video.currentTime + 0.5 >= startSec) {
          revealed = true;
          revealAndStartDuration();
        }
      });

      video.addEventListener('playing', function () {
        if (isStale() || revealed) return;
        if (fromCacheFlag && video.currentTime + 0.5 >= startSec) {
          revealed = true;
          revealAndStartDuration();
          return;
        }
        if (video.currentTime + 0.5 < startSec) return;
        revealed = true;
        revealAndStartDuration();
      });

      video.addEventListener('timeupdate', function () {
        if (isStale() || revealed) return;
        if (video.currentTime + 0.3 >= startSec && video.currentTime > 0.1) {
          revealed = true;
          revealAndStartDuration();
        }
      });

      video.addEventListener('ended', function () {
        if (isStale() || !revealed) return;
        heroTrailerDurationElapsed(reqId, myAttempt);
      });

      video.addEventListener('error', function () {
        if (isStale()) return;
        heroUnplayable[heroVideoCurrentSrc] = true;
        if (urlIdx < urls.length) {
          tryNextUrl();
        } else {
          heroNoteNetFailure();
          if (heroVideoCooldown) { abandonKey(); return; }
          abandonKey();
        }
      });

      heroVideoReadyTimer = setTimeout(function () {
        if (isStale() || revealed) return;
        abandonKey();
      }, 10000);

      tryNextUrl();
    }

    function buildHeroIndicators(container) {
      if (!container) return;
      container.innerHTML = '';
      if (!heroIndicatorsEnabled()) {
        container.style.display = 'none';
        return;
      }
      container.style.display = '';
      for (var i = 0; i < heroItems.length; i++) {
        (function (idx) {
          var dot = document.createElement('div');
          dot.className = 'agnative-hero__indicator';
          dot.setAttribute('data-hero-index', String(idx));
          container.appendChild(dot);
          dot.addEventListener('mouseenter', function () {
            focusHeroPlayButton();
            transitionHeroToIndex(idx);
            startHeroRotation();
          });
          dot.addEventListener('click', function () {
            focusHeroPlayButton();
            transitionHeroToIndex(idx);
            startHeroRotation();
          });
        })(i);
      }
      updateHeroIndicators();
    }

    function updateHeroIndicators() {
      var dots = document.querySelectorAll('.agnative-hero__indicator');
      for (var i = 0; i < dots.length; i++) {
        if (i === heroCurrentIndex) dots[i].classList.add('agnative-hero__indicator--active');
        else dots[i].classList.remove('agnative-hero__indicator--active');
      }
    }

    function openHeroItemAt(idx) {
      try {
        var item = heroItems[idx];
        if (!item || !window.Lampa || !Lampa.Activity) return;
        var type = detectHeroItemType(item);
        var src = (Lampa.Storage && Lampa.Storage.field) ? Lampa.Storage.field('source') : 'tmdb';
        Lampa.Activity.push({ url: '', title: item.title || item.name || '', component: 'full', id: item.id, method: type, source: src, card: item });
      } catch (e) { }
    }

    function buildHeroBanner() {
      try {
        if (resolvePerfLevel() === 'ultra') return;
        if (!heroBannerEnabled()) return;
        if (!isOnMainPage()) return;
        if (document.querySelector('.agnative-hero')) return;

        var scrollContent = document.querySelector('.activity--active .scroll__content') || document.querySelector('.scroll__content');
        if (!scrollContent) return;
        var firstLine = scrollContent.querySelector('.items-line');
        if (!firstLine) return;

        var lineCount = scrollContent.querySelectorAll('.items-line').length;
        if (lineCount < 2) return;
        if (document.querySelector('.full-start, .info-start, .player__maket')) return;

        var cards = scrollContent.querySelectorAll('.items-line .card');
        heroItems = [];
        for (var i = 0; i < cards.length && heroItems.length < 5; i++) {
          var data = extractCardData(cards[i]);
          if (!data || !data.id) continue;
          if (data.backdrop_path) {
            heroItems.push(data);
          } else {
            var imgEl = cards[i].querySelector('.card__img');
            var src = imgEl && (imgEl.tagName === 'IMG' ? imgEl.src : '') || imgEl && imgEl.getAttribute('data-nfx-original-src') || '';
            if (src && src.indexOf('tmdb') !== -1) { data._heroFallbackImg = src; heroItems.push(data); }
          }
        }
        if (!heroItems.length) return;

        var hero = document.createElement('div');
        hero.className = 'agnative-hero agnative-hero--visible';

        var bg = document.createElement('img');
        bg.className = 'agnative-hero__bg';
        bg.alt = '';
        var clearHeroSwitching = function () {
          var h = bg.parentNode;
          if (h && h.classList && h.classList.contains('agnative-hero--switching')) {
            requestAnimationFrame(function () {
              h.classList.remove('agnative-hero--switching');
            });
          }
        };
        bg.addEventListener('load', function () {
          measureHeroPan(bg);
          applyHeroBgAnim();
          clearHeroSwitching();
        });
        bg.addEventListener('error', clearHeroSwitching);

        var content = document.createElement('div');
        content.className = 'agnative-hero__content';

        var badgeEl = document.createElement('div');
        badgeEl.className = 'agnative-hero__badge';

        var logoEl = document.createElement('img');
        logoEl.className = 'agnative-hero__logo';
        logoEl.alt = '';

        var titleEl = document.createElement('div');
        titleEl.className = 'agnative-hero__title';

        var yearEl = document.createElement('div');
        yearEl.className = 'agnative-hero__year';

        var metaEl = document.createElement('div');
        metaEl.className = 'agnative-hero__meta';

        var overviewEl = document.createElement('div');
        overviewEl.className = 'agnative-hero__overview';

        var playBtn = document.createElement('div');
        playBtn.className = 'agnative-hero__play selector';
        playBtn.setAttribute('tabindex', '0');
        playBtn.setAttribute('data-selector', 'true');
        playBtn.textContent = t('hero_btn_watch');

        content.appendChild(badgeEl);
        content.appendChild(logoEl);
        content.appendChild(titleEl);
        content.appendChild(yearEl);
        content.appendChild(metaEl);
        content.appendChild(overviewEl);

        var indicatorsEl = document.createElement('div');
        indicatorsEl.className = 'agnative-hero__indicators';

        hero.appendChild(bg);
        hero.appendChild(content);
        hero.appendChild(playBtn);
        hero.appendChild(indicatorsEl);
        syncHeroAttrs(hero);

        var insertParent = firstLine.parentNode;
        try { insertParent.insertBefore(hero, firstLine); }
        catch (e) { scrollContent.insertBefore(hero, scrollContent.firstChild); }

        bindAction(playBtn, openHeroCurrentItem);
        buildHeroIndicators(indicatorsEl);

        // Track hero focus state:
        // - hero gets --unfocused class when focus leaves (used for margin animation)
        // - hero gets --hidden class only when focus moves DOWN to cards
        //   (when moving UP to topnav, hero stays visible)
        try {
          var $$ = window.$ || window.jQuery;
          if ($$) {
            $$(playBtn).on('hover:focus.agnativeHeroState hover:hover.agnativeHeroState', function () {
              hero.classList.remove('agnative-hero--unfocused');
              hero.classList.remove('agnative-hero--hidden');
              if (document.body) document.body.classList.remove('agnative-hero-collapsed');
              heroExitDirection = null;
              heroResetIdle(true);
            });
            $$(playBtn).on('hover:blur.agnativeHeroState hover:out.agnativeHeroState', function () {
              hero.classList.add('agnative-hero--unfocused');
              heroClearIdle();
              if (heroExitDirection === 'down' && getHeroTrailerMode() !== 'trailers') {
                hero.classList.add('agnative-hero--hidden');
                if (document.body) document.body.classList.add('agnative-hero-collapsed');
              }
            });
          }
        } catch (e) { }

        if (document.body) document.body.classList.add('agnative-has-hero');

        heroCurrentIndex = 0;
        renderHeroSlide(heroItems[0]);
        startHeroRotation();
        ensureHeroController();
        if (!isUiLayerOpen()) setTimeout(focusHeroPlayButton, 100);
        if (heroTrailerEnabled() && !heroVideoCooldown) {
          scheduleHeroPrefetch(heroItems.slice());
        }
      } catch (e) { }
    }

    function scheduleHeroPrefetch(items) {
      if (!items || !items.length) return;
      for (var i = 0; i < items.length; i++) heroPrefetchQueue.push(items[i]);
      if (heroPrefetchActive) return;
      heroPrefetchActive = true;
      setTimeout(runHeroPrefetchStep, 600);
    }

    function bumpHeroPrefetchPriority(item) {
      if (!item) return;
      for (var i = 0; i < heroPrefetchQueue.length; i++) {
        if (heroPrefetchQueue[i] === item) heroPrefetchQueue.splice(i--, 1);
      }
      heroPrefetchQueue.unshift(item);
      if (!heroPrefetchActive && heroTrailerEnabled() && !heroVideoCooldown) {
        heroPrefetchActive = true;
        setTimeout(runHeroPrefetchStep, 0);
      }
    }

    function runHeroPrefetchStep() {
      if (heroVideoCooldown) { heroPrefetchQueue = []; heroPrefetchActive = false; return; }
      if (!heroTrailerEnabled()) { heroPrefetchQueue = []; heroPrefetchActive = false; return; }
      var item = heroPrefetchQueue.shift();
      if (!item) { heroPrefetchActive = false; return; }
      if (!item.id) { setTimeout(runHeroPrefetchStep, 50); return; }

      var stepDone = false;
      var stepWatchdog = setTimeout(function () {
        if (stepDone) return;
        stepDone = true;
        setTimeout(runHeroPrefetchStep, 100);
      }, 20000);
      function finishStep(delay) {
        if (stepDone) return;
        stepDone = true;
        clearTimeout(stepWatchdog);
        setTimeout(runHeroPrefetchStep, delay || 250);
      }

      var type = detectHeroItemType(item);
      resolveImdbId(item.id, type, function (imdbId) {
        if (!imdbId) { finishStep(250); return; }
        var resolved = heroReadResolvedTrailer(imdbId);
        if (resolved && resolved.key) {
          var url = heroVideoUrlsForKey(resolved.key, getHeroTrailerQuality())[0];
          videoPreload(url, function (ok) {
            if (ok) heroBlobCached[url] = true;
            finishStep(250);
          });
          return;
        }
        fetchImdbVideos(imdbId, function (keys) {
          if (!keys || !keys.length) { finishStep(250); return; }
          var firstKey = keys[0];
          var prefetchUrl = heroVideoUrlsForKey(firstKey, getHeroTrailerQuality())[0];
          heroWriteResolvedTrailer(imdbId, { key: firstKey });
          videoPreload(prefetchUrl, function (ok) {
            if (ok) heroBlobCached[prefetchUrl] = true;
            finishStep(400);
          });
        });
      }, item);
    }

    function isUiLayerOpen() {
      try {
        if (!document.body) return false;
        if (document.body.classList.contains('settings--open')) return true;
        if (document.body.classList.contains('selectbox--open')) return true;
        if (document.body.classList.contains('search--open')) return true;
        if (document.querySelector('.modal, .player, .youtube-player, .search-box')) return true;
        return false;
      } catch (e) { return false; }
    }

    function registerSettings() {
      try {
        if (!window.Lampa || !Lampa.SettingsApi || window.__APPLETV_AGNATIVE_TOPNAV_SETTINGS__) return;
        window.__APPLETV_AGNATIVE_TOPNAV_SETTINGS__ = true;

        if (Lampa.Template && Lampa.Template.add) {
          Lampa.Template.add('settings_' + SETTINGS_COMPONENT, '<div></div>');
          Lampa.Template.add('settings_' + TOPNAV_SETTINGS_COMPONENT, '<div></div>');
          Lampa.Template.add('settings_' + HERO_SETTINGS_COMPONENT, '<div></div>');
          Lampa.Template.add('settings_' + SETTINGS_HIDE_COMPONENT, '<div></div>');
        }

        Lampa.SettingsApi.addComponent({
          component: SETTINGS_COMPONENT,
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-device-ipad-horizontal"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-12" /><path d="M9 17h6" /></svg>',
          name: 'Agnative'
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { name: 'agnative_about_info', type: 'static' },
          field: {
            name: 'AppleTV AgNative',
            description: t('set_about_version') + ' ' + PLUGIN_VERSION + '  ' + t('set_about_authors') + ': ' + PLUGIN_AUTHORS
          }
        });

        // ═══════════════════════════════════════════════════════════
        // 1. Основные
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_main_title') }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: ENABLE_KEY,
            type: 'select',
            values: { on: t('val_on'), off: t('val_off') },
            default: 'off'
          },
          field: {
            name: t('set_enable_name'),
            description: t('set_enable_desc')
          },
          onChange: function (value) {
            if (value === 'off') {
              removePluginUi();
              return;
            }
            setTimeout(function () {
              startPlugin();
              schedulePatch();
              setTimeout(function () { schedulePatch(); }, 150);
              setTimeout(function () { schedulePatch(); }, 500);
            }, 50);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: UI_LANG_KEY,
            type: 'select',
            values: {
              auto: t('val_auto'),
              ru: langText('filter_lang_ru', t('val_ru')),
              en: langText('filter_lang_en', t('val_en')),
              uk: langText('filter_lang_uk', t('val_uk')),
              be: langText('filter_lang_be', t('val_be'))
            },
            default: 'auto'
          },
          field: {
            name: langText('settings_interface_lang', t('set_ui_lang_name')),
            description: t('set_ui_lang_desc')
          },
          onChange: function () {
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: PERF_MODE_KEY,
            type: 'select',
            values: {
              auto: t('val_perf_auto'),
              high: t('val_perf_high'),
              low: t('val_perf_low'),
              ultra: t('val_perf_ultra')
            },
            default: 'auto'
          },
          field: {
            name: t('set_perf_mode_name'),
            description: t('set_perf_mode_desc')
          },
          onChange: function () {
            syncPerfMode();
            initGlareRuntime();
            perfModeDirty = true;
            showReloadConfirm(function () {
              try { Lampa.Controller.toggle('settings_component'); } catch (e) { }
            });
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { name: 'agnative_reset_button', type: 'button' },
          field: {
            name: t('set_reset_name'),
            description: t('set_reset_desc')
          },
          onChange: function () {
            resetSettings();
          }
        });

        // ═══════════════════════════════════════════════════════════
        // 2. Верхняя панель
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_section_topnav') }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: TOPNAV_ENABLE_KEY,
            type: 'select',
            values: { on: t('val_on'), off: t('val_off') },
            default: 'on'
          },
          field: {
            name: t('set_topnav_enable_name'),
            description: t('set_topnav_enable_desc')
          },
          onChange: function (value) {
            if (value === 'off') removeTopnavUi();
            else setTimeout(function () { schedulePatch(); }, 50);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: TOPNAV_SIZE_KEY,
            type: 'select',
            values: {
              xs: t('val_size_xs'),
              sm: t('val_size_sm'),
              md: t('val_size_md'),
              lg: t('val_size_lg'),
              xl: t('val_size_xl')
            },
            default: 'md'
          },
          field: {
            name: t('set_topnav_size_name'),
            description: t('set_topnav_size_desc')
          },
          onChange: function () {
            syncTopnavSize();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: TOPNAV_ICONS_ORDER_KEY,
            type: 'select',
            values: {
              end: t('val_topnav_icons_end'),
              start: t('val_topnav_icons_start'),
              split: t('val_topnav_icons_split')
            },
            default: 'end'
          },
          field: {
            name: t('set_topnav_icons_order_name'),
            description: t('set_topnav_icons_order_desc')
          },
          onChange: function () {
            setTimeout(function () { schedulePatch(); }, 50);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { name: 'agnative_open_topnav_settings', type: 'button' },
          field: {
            name: t('set_topnav_name'),
            description: t('set_topnav_desc')
          },
          onChange: function () {
            openTopnavSettingsSection();
          }
        });

        // ═══════════════════════════════════════════════════════════
        // 3. Hero-баннер (BETA)
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_section_hero_banner') + ' <span class="agnative-beta-badge">BETA</span>' }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { name: 'agnative_open_hero_settings', type: 'button' },
          field: {
            name: t('set_hero_name'),
            description: t('set_hero_desc')
          },
          onChange: function () {
            openHeroSettingsSection();
          }
        });

        // ═══════════════════════════════════════════════════════════
        // 4. Карточки
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_section_cards') }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: BACKDROP_KEY,
            type: 'select',
            values: { on: t('val_on'), off: t('val_off') },
            default: 'on'
          },
          field: {
            name: t('set_backdrop_name'),
            description: t('set_backdrop_desc')
          },
          onChange: function () {
            syncCardFlags();
            resetCardSwitches();
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CARD_IMAGE_MODE_KEY,
            type: 'select',
            values: {
              backdrop: t('val_card_image_backdrop'),
              poster: t('val_card_image_poster')
            },
            default: 'backdrop'
          },
          field: {
            name: t('set_card_image_mode_name'),
            description: t('set_card_image_mode_desc')
          },
          onChange: function () {
            posterCache = {};
            logoCache = {};
            titledBackdropCache = {};
            clearAll();
            syncCardFlags();
            resetCardSwitches();
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CARD_SIZE_KEY,
            type: 'select',
            values: {
              xs: t('val_size_xs'),
              sm: t('val_size_sm'),
              md: t('val_size_md'),
              lg: t('val_size_lg'),
              xl: t('val_size_xl')
            },
            default: 'md'
          },
          field: {
            name: t('set_card_size_name'),
            description: t('set_card_size_desc')
          },
          onChange: function () {
            syncCardSize();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: OVERLAY_ALIGN_KEY,
            type: 'select',
            values: {
              start: t('val_overlay_align_start'),
              center: t('val_overlay_align_center'),
              end: t('val_overlay_align_end')
            },
            default: 'start'
          },
          field: {
            name: t('set_overlay_align_name'),
            description: t('set_overlay_align_desc')
          },
          onChange: function () {
            syncOverlayAlign();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: BADGE_KEY,
            type: 'select',
            values: { on: t('val_on'), off: t('val_off') },
            default: 'on'
          },
          field: {
            name: t('set_badge_name'),
            description: t('set_badge_desc')
          },
          onChange: function () {
            syncCardFlags();
            if (badgeEnabled()) {
              resetCardSwitches();
              setTimeout(function () { schedulePatch(); }, 80);
            }
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: RATING_KEY,
            type: 'select',
            values: { on: t('val_on'), off: t('val_off') },
            default: 'off'
          },
          field: {
            name: langText('title_rating', t('set_rating_name')),
            description: t('set_rating_desc')
          },
          onChange: function () {
            syncCardFlags();
            if (ratingEnabled()) {
              resetCardSwitches();
              setTimeout(function () { schedulePatch(); }, 80);
            }
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: RATING_STYLE_KEY,
            type: 'select',
            values: { color: t('val_rating_color'), mono: t('val_rating_mono') },
            default: 'color'
          },
          field: {
            name: t('set_rating_style_name'),
            description: t('set_rating_style_desc')
          },
          onChange: function () {
            syncCardFlags();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CARD_ANIM_KEY,
            type: 'select',
            values: {
              off: t('val_card_anim_off'),
              veoveo: t('val_card_anim_veoveo'),
              appletv: t('val_card_anim_appletv')
            },
            default: 'veoveo'
          },
          field: {
            name: t('set_card_anim_name'),
            description: t('set_card_anim_desc')
          },
          onChange: function () {
            syncGlareClass();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CARD_ANIM_ORBIT_KEY,
            type: 'trigger',
            default: 'false'
          },
          field: {
            name: t('set_card_anim_orbit_name'),
            description: t('set_card_anim_orbit_desc')
          },
          onChange: function () { }
        });

        // ═══════════════════════════════════════════════════════════
        // 5. Логотипы и постеры
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_section_logos') }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: LOGO_LANG_KEY,
            type: 'select',
            values: {
              auto: t('val_auto'),
              ru: langText('filter_lang_ru', t('val_ru')),
              en: langText('filter_lang_en', t('val_en')),
              uk: langText('filter_lang_uk', t('val_uk')),
              be: langText('filter_lang_be', t('val_be'))
            },
            default: 'auto'
          },
          field: {
            name: t('set_logo_lang_name'),
            description: t('set_logo_lang_desc')
          },
          onChange: function () {
            logoCache = {};
            titledBackdropCache = {};
            clearAll();
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });

        try {
          if (window.Lampa && Lampa.Storage) {
            var legacyLogoTitle = Lampa.Storage.get(LOGO_TITLE_KEY, 'false');
            if (legacyLogoTitle === 'below' || legacyLogoTitle === 'above' || legacyLogoTitle === 'on') {
              Lampa.Storage.set(LOGO_TITLE_KEY, 'true');
            } else if (legacyLogoTitle === 'off') {
              Lampa.Storage.set(LOGO_TITLE_KEY, 'false');
            }
          }
        } catch (e) { }

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: LOGO_TITLE_KEY,
            type: 'trigger',
            default: 'false'
          },
          field: {
            name: t('set_logo_title_name'),
            description: t('set_logo_title_desc')
          },
          onChange: function () {
            logoCache = {};
            clearAll();
            resetCardSwitches();
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: LOGO_SIZE_KEY,
            type: 'select',
            values: {
              xs: t('val_size_xs'),
              sm: t('val_size_sm'),
              md: t('val_size_md'),
              lg: t('val_size_lg'),
              xl: t('val_size_xl')
            },
            default: 'md'
          },
          field: {
            name: t('set_logo_size_name'),
            description: t('set_logo_size_desc')
          },
          onChange: function () {
            syncLogoSize();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: POSTER_QUALITY_KEY,
            type: 'select',
            values: {
              w185: t('val_size_xs'),
              w342: t('val_size_sm'),
              w500: t('val_size_md'),
              w780: t('val_size_lg'),
              original: t('val_size_xl')
            },
            default: 'w500'
          },
          field: {
            name: t('set_poster_quality_name'),
            description: t('set_poster_quality_desc')
          },
          onChange: function () {
            posterCache = {};
            clearAll();
            resetCardSwitches();
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });

        // ═══════════════════════════════════════════════════════════
        // 6. Текст и шрифты
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_section_text') }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: FONT_SIZE_KEY,
            type: 'select',
            values: {
              xs: t('val_size_xs'),
              sm: t('val_size_sm'),
              md: t('val_size_md'),
              lg: t('val_size_lg'),
              xl: t('val_size_xl')
            },
            default: 'md'
          },
          field: {
            name: t('set_font_size_name'),
            description: t('set_font_size_desc')
          },
          onChange: function () {
            syncFontSize();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CATEGORY_SIZE_KEY,
            type: 'select',
            values: {
              xs: t('val_size_xs'),
              sm: t('val_size_sm'),
              md: t('val_size_md'),
              lg: t('val_size_lg'),
              xl: t('val_size_xl')
            },
            default: 'md'
          },
          field: {
            name: t('set_category_size_name'),
            description: t('set_category_size_desc')
          },
          onChange: function () {
            syncFontSize();
          }
        });

        // ═══════════════════════════════════════════════════════════
        // 7. Часы и панель
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_section_clock') }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CLOCK_SECONDS_KEY,
            type: 'select',
            values: { on: t('val_on'), off: t('val_off') },
            default: 'off'
          },
          field: {
            name: t('set_clock_seconds_name'),
            description: t('set_clock_seconds_desc')
          },
          onChange: function () {
            restartClock();
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CONTROL_PANEL_KEY,
            type: 'select',
            values: { on: t('val_on'), off: t('val_off') },
            default: 'off'
          },
          field: {
            name: t('set_control_panel_name'),
            description: t('set_control_panel_desc')
          },
          onChange: function (value) {
            if (value === 'off') closeControlPanel(true);
            setTimeout(function () { schedulePatch(); }, 80);
          }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { name: 'agnative_open_settings_hide', type: 'button' },
          field: {
            name: t('set_settings_hide_name'),
            description: t('set_settings_hide_desc')
          },
          onChange: function () {
            openSettingsHideSection();
          }
        });

        // ═══════════════════════════════════════════════════════════
        // 8. Данные
        // ═══════════════════════════════════════════════════════════
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_section_data') }
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: CACHE_SIZE_KEY,
            type: 'select',
            values: {
              '50': '50 MB',
              '100': '100 MB',
              '200': '200 MB',
              '500': '500 MB',
              'unlimited': t('val_unlimited')
            },
            default: '100'
          },
          field: {
            name: t('set_cache_size_name'),
            description: t('set_cache_size_desc')
          },
          onChange: function () {
            prune(getCacheMaxBytes());
          }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_hero_title') }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_KEY,
            type: 'trigger',
            default: 'false'
          },
          field: {
            name: t('set_hero_enable_name'),
            description: t('set_hero_enable_desc')
          },
          onChange: function () {
            if (heroBannerEnabled()) buildHeroBanner();
            else removeHeroBanner();
          }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_ALIGN_KEY,
            type: 'select',
            values: {
              top: t('val_hero_align_top'),
              center: t('val_hero_align_center'),
              bottom: t('val_hero_align_bottom')
            },
            default: 'top'
          },
          field: {
            name: t('set_hero_align_name'),
            description: t('set_hero_align_desc')
          },
          onChange: function () {
            syncHeroAttrs();
          }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_INDICATORS_KEY,
            type: 'trigger',
            default: 'false'
          },
          field: {
            name: t('set_hero_indicators_name'),
            description: t('set_hero_indicators_desc')
          },
          onChange: function () {
            var hero = document.querySelector('.agnative-hero');
            if (!hero) return;
            var indicators = hero.querySelector('.agnative-hero__indicators');
            if (indicators) buildHeroIndicators(indicators);
          }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_ANIMATION_KEY,
            type: 'trigger',
            default: 'true'
          },
          field: {
            name: t('set_hero_animation_name'),
            description: t('set_hero_animation_desc')
          },
          onChange: function () {
            syncHeroAttrs();
          }
        });

        var heroIntervalSec = t('val_sec_short');
        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_INTERVAL_KEY,
            type: 'select',
            values: {
              '5': '5 ' + heroIntervalSec,
              '10': '10 ' + heroIntervalSec,
              '15': '15 ' + heroIntervalSec,
              '20': '20 ' + heroIntervalSec,
              '25': '25 ' + heroIntervalSec,
              '30': '30 ' + heroIntervalSec,
              '35': '35 ' + heroIntervalSec,
              '40': '40 ' + heroIntervalSec,
              '50': '50 ' + heroIntervalSec,
              '60': '60 ' + heroIntervalSec
            },
            default: '40'
          },
          field: {
            name: t('set_hero_interval_name'),
            description: t('set_hero_interval_desc')
          },
          onChange: function () {
            if (document.querySelector('.agnative-hero')) {
              startHeroRotation();
              applyHeroBgAnim();
            }
          }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_BG_ANIM_KEY,
            type: 'select',
            values: {
              'off':      t('val_off'),
              'pan-down': t('val_anim_pan_down'),
              'pan-up':   t('val_anim_pan_up'),
              'zoom-in':  t('val_anim_zoom_in'),
              'zoom-out': t('val_anim_zoom_out'),
              'drift':    t('val_anim_drift'),
              'breathe':  t('val_anim_breathe')
            },
            default: 'off'
          },
          field: {
            name: t('set_hero_bg_anim_name'),
            description: t('set_hero_bg_anim_desc')
          },
          onChange: function () {
            applyHeroBgAnim();
          }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_QUALITY_KEY,
            type: 'select',
            values: {
              w780: t('val_size_md'),
              w1280: t('val_size_lg'),
              original: t('val_size_xl')
            },
            default: 'w1280'
          },
          field: {
            name: t('set_hero_quality_name'),
            description: t('set_hero_quality_desc')
          },
          onChange: function () {
            if (heroCurrentItem) {
              var bg = document.querySelector('.agnative-hero__bg');
              if (bg) bg.src = '';
              renderHeroSlide(heroCurrentItem);
            }
          }
        });

        try {
          if (window.Lampa && Lampa.Storage) {
            var currentMode = Lampa.Storage.get(HERO_TRAILER_MODE_KEY, '');
            if (currentMode === 'video') {
              Lampa.Storage.set(HERO_TRAILER_MODE_KEY, 'mixed');
            } else if (currentMode !== 'posters' && currentMode !== 'mixed' && currentMode !== 'trailers') {
              var legacy = Lampa.Storage.get(HERO_TRAILER_KEY, 'true');
              var migrated = (legacy === false || legacy === 'false' || legacy === 'off') ? 'posters' : 'mixed';
              Lampa.Storage.set(HERO_TRAILER_MODE_KEY, migrated);
            }
          }
        } catch (e) { }

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_TRAILER_MODE_KEY,
            type: 'select',
            values: {
              posters:  t('val_trailer_mode_posters'),
              mixed:    t('val_trailer_mode_mixed'),
              trailers: t('val_trailer_mode_trailers')
            },
            default: 'mixed'
          },
          field: {
            name: t('set_hero_trailer_mode_name'),
            description: t('set_hero_trailer_mode_desc')
          },
          onChange: function () {
            updateHeroTrailerDelayVisibility();
            showReloadConfirm(function () {
              try { Lampa.Controller.toggle('settings_component'); } catch (e) { }
            });
          }
        });

        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_TRAILER_QUALITY_KEY,
            type: 'select',
            values: {
              '480p':  '480p',
              '720p':  '720p',
              '1080p': '1080p'
            },
            default: '720p'
          },
          field: {
            name: t('set_hero_trailer_quality_name'),
            description: t('set_hero_trailer_quality_desc')
          },
          onChange: function () {
            showReloadConfirm(function () {
              try { Lampa.Controller.toggle('settings_component'); } catch (e) { }
            });
          }
        });

        var heroTrailerSec = t('val_sec_short');
        Lampa.SettingsApi.addParam({
          component: HERO_SETTINGS_COMPONENT,
          param: {
            name: HERO_TRAILER_DELAY_KEY,
            type: 'select',
            values: {
              '4': '4 ' + heroTrailerSec,
              '6': '6 ' + heroTrailerSec,
              '8': '8 ' + heroTrailerSec,
              '12': '12 ' + heroTrailerSec,
              '15': '15 ' + heroTrailerSec,
              '20': '20 ' + heroTrailerSec
            },
            default: '8'
          },
          field: {
            name: t('set_hero_trailer_delay_name'),
            description: t('set_hero_trailer_delay_desc')
          },
          onRender: function (item) {
            try { item.attr('data-agnative-hero-trailer-delay', '1'); } catch (e) { }
            if (getHeroTrailerMode() !== 'mixed') {
              try { item.hide(); } catch (e) { }
            }
          },
          onChange: function () {
            heroResetIdle();
          }
        });

        Lampa.SettingsApi.addParam({
          component: TOPNAV_SETTINGS_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_topnav_title') }
        });

        var posMax = 15;
        var posValues = { off: t('val_hide') };
        for (var pi = 1; pi <= posMax; pi++) posValues['p' + pi] = t('set_topnav_position') + ' ' + pi;

        getAvailableTopnavItems().forEach(function (item) {
          var stored = getStoredTopnavActions();
          var currentIdx = stored.indexOf(item.action);
          var currentDefault = currentIdx === -1 ? 'off' : ('p' + (currentIdx + 1));

          Lampa.SettingsApi.addParam({
            component: TOPNAV_SETTINGS_COMPONENT,
            param: {
              name: 'agnative_topnav_item_' + item.action,
              type: 'select',
              values: posValues,
              default: currentDefault
            },
            field: {
              name: item.label,
              description: t('set_topnav_item_desc') + item.action
            },
            onChange: function (value) {
              if (value === 'off') {
                setTopnavActionState(item.action, false);
                return;
              }
              var targetPos = parseInt(value.replace('p', ''), 10) - 1;
              if (isNaN(targetPos) || targetPos < 0) return;
              var current = getStoredTopnavActions().filter(function (a, i, arr) { return a && arr.indexOf(a) === i; });
              var oldIdx = current.indexOf(item.action);
              if (oldIdx !== -1) current.splice(oldIdx, 1);
              if (targetPos > current.length) targetPos = current.length;
              current.splice(targetPos, 0, item.action);
              setStoredTopnavActions(current);
            }
          });
        });

        Lampa.SettingsApi.addParam({
          component: SETTINGS_HIDE_COMPONENT,
          param: { type: 'title' },
          field: { name: t('set_settings_hide_title') }
        });

        var hiddenList = getHiddenSettingsSections();
        getSettingsSectionDefs().forEach(function (sec) {
          var isHidden = hiddenList.indexOf(sec.id) !== -1;
          Lampa.SettingsApi.addParam({
            component: SETTINGS_HIDE_COMPONENT,
            param: {
              name: 'agnative_settings_hide_' + sec.id,
              type: 'trigger',
              default: isHidden ? 'true' : 'false'
            },
            field: {
              name: sec.label,
              description: t('set_settings_hide_item_desc')
            },
            onChange: function (value) {
              var hide = value === true || value === 'true' || value === 'on';
              toggleSettingsSectionHidden(sec.id, hide);
              applyHiddenSettingsSectionsCSS();
            }
          });
        });
      } catch (e) { }
    }

    function applyHiddenSettingsSectionsCSS() {
      var styleId = 'appletv-agnative-settings-hide-style';
      var style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        (document.head || document.body || document.documentElement).appendChild(style);
      }
      var hidden = getHiddenSettingsSections();
      if (!hidden.length) { style.textContent = ''; return; }
      var rules = hidden.map(function (id) {
        var safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
        return 'body.' + BODY_CLASS + ' .settings .settings-folder[data-component="' + safe + '"], ' +
               'body.' + BODY_CLASS + ' .settings .settings__item[data-component="' + safe + '"] { display:none !important; }';
      });
      style.textContent = rules.join('\n');
    }

    function bindRuntimeListeners() {
      if (!window.Lampa || !Lampa.Listener || !Lampa.Storage || !Lampa.Storage.listener) return;

      if (!activityListenerBound) {
        activityListenerBound = true;
        Lampa.Listener.follow('activity', function (e) {
          if (!pluginEnabled()) return;
          if (e.type === 'start' || e.type === 'activity') {
            if (perfModeDirty) {
              perfModeDirty = false;
              resetCardSwitches();
              setTimeout(function () { schedulePatch(); }, 80);
            }
            setTimeout(function () {
              try {
                var render = e.object && e.object.activity ? e.object.activity.render() : null;
                if (!render || !render.length) return;
                var body = render.find ? (render.find('.activity__body')[0] || render[0]) : render[0];
                if (!body) return;
                processCards(body);
              } catch (err) { }
            }, 500);
            setTimeout(triggerExtraRowRender, 900);
            schedulePatch();
            try {
              var comp = e.object && e.object.component;
              if (comp === 'main') {
                if (document.body) document.body.classList.add('agnative-has-hero');
                if (!document.querySelector('.agnative-hero')) {
                  setTimeout(buildHeroBanner, 900);
                }
              } else {
                if (document.body) document.body.classList.remove('agnative-has-hero');
                removeHeroBanner();
              }
            } catch (err) { }
          }
        });
      }

      if (!fullListenerBound) {
        fullListenerBound = true;
        Lampa.Listener.follow('full', function (e) {
          if (!pluginEnabled()) return;
          if (e.type === 'complite') {
            try {
              var render = e.object.activity.render();
              if (render && render.length) processCards(render[0]);
            } catch (err) { }
          }
        });
      }

      if (!storageListenerBound) {
        storageListenerBound = true;
        Lampa.Storage.listener.follow('change', function (e) {
          if (e.name === ENABLE_KEY) {
            if (pluginEnabled()) {
              setTimeout(function () { startPlugin(); }, 50);
              setTimeout(function () { schedulePatch(); }, 120);
            } else {
              removePluginUi();
            }
            return;
          }

          if (e.name === GLARE_KEY || e.name === CARD_ANIM_KEY) {
            syncGlareClass();
            return;
          }

          if (e.name === CLOCK_SECONDS_KEY) {
            restartClock();
            return;
          }

          if (e.name === FONT_SIZE_KEY || e.name === CATEGORY_SIZE_KEY) {
            syncFontSize();
            return;
          }

          if (e.name === LOGO_LANG_KEY) {
            logoCache = {};
            titledBackdropCache = {};
            clearAll();
            setTimeout(function () { schedulePatch(); }, 80);
            return;
          }

          if (e.name === UI_LANG_KEY) {
            setTimeout(function () { schedulePatch(); }, 80);
            return;
          }

          if (e.name === BACKDROP_KEY || e.name === BADGE_KEY || e.name === RATING_KEY) {
            syncCardFlags();
            if (e.name === BACKDROP_KEY || (e.value && e.value !== 'off')) {
              resetCardSwitches();
              setTimeout(function () { schedulePatch(); }, 80);
            }
            return;
          }

          if (e.name === PERF_MODE_KEY) {
            syncPerfMode();
            initGlareRuntime();
            perfModeDirty = true;
            return;
          }

          if (e.name === TOPNAV_ITEMS_KEY) {
            if (topnavSettingsOpen) return;
            setTimeout(function () { startPlugin(); }, 50);
            setTimeout(function () { schedulePatch(); }, 120);
            return;
          }

          if (e.name === 'lampac_theme' || e.name === 'lampac_interface_scene') {
            if (pluginEnabled()) {
              setTimeout(function () { startPlugin(); }, 50);
              setTimeout(function () { schedulePatch(); }, 120);
            } else {
              removePluginUi();
            }
          }
        });
      }
    }

    function isMobile() {
      return window.innerWidth < 768 || (window.innerWidth < 1024 && 'ontouchstart' in window);
    }

    // On mobile Lampa only renders rows visible in the initial viewport (~4).
    // Simulate a scroll-down so the IntersectionObserver triggers 2 extra rows,
    // then snap back to top — invisible to the user but forces 6 rows to render.
    function triggerExtraRowRender() {
      if (!isMobile()) return;
      var scroll = document.querySelector('.activity--active .scroll.scroll--mask.scroll--over') ||
                   document.querySelector('.activity--active .scroll');
      if (!scroll || scroll.scrollTop !== 0) return;
      var rowHeight = Math.round(window.innerHeight * 0.38); // ~height of 2 rows
      scroll.scrollTop = rowHeight * 2;
      setTimeout(function () {
        var s = document.querySelector('.activity--active .scroll.scroll--mask.scroll--over') ||
                document.querySelector('.activity--active .scroll');
        if (s && s.scrollTop > 0) s.scrollTop = 0;
      }, 120);
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    }

    function extractCardData(cardEl) {
      if (!cardEl) return null;
      try {
        if (cardEl.card_data) return cardEl.card_data;
      } catch (e) { }
      try {
        if (window.$) {
          var data = $(cardEl).data('card') || $(cardEl).data('json');
          if (data) return data;
        }
      } catch (e) { }
      return null;
    }

    function getGenreNames(item) {
      var names = [];
      if (!item) return names;
      var map = GENRE_MAP_LOCALIZED[getUiLang()] || GENRE_MAP_LOCALIZED.ru;
      if (item.genres && item.genres.length) {
        for (var i = 0; i < item.genres.length; i++) {
          if (item.genres[i] && item.genres[i].name) names.push(item.genres[i].name);
        }
      } else if (item.genre_ids && item.genre_ids.length) {
        for (var j = 0; j < item.genre_ids.length; j++) {
          if (map[item.genre_ids[j]]) names.push(map[item.genre_ids[j]]);
        }
      }
      return names;
    }

    function injectStyle() {
      if (!document.head && !document.body) return;
      var existing = document.getElementById(STYLE_ID);
      if (existing && styleSignature === STYLE_ID) return;

      var style = existing || document.createElement('style');
      style.id = STYLE_ID;
      var text = [
        'body.' + BODY_CLASS + ' .settings__content.layer--height {',
        '  background: rgba(28,30,34,.82) !important;',
        '  background-image: none !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 18px 44px rgba(0,0,0,.28) !important;',
        '  border: 1px solid rgba(255,255,255,.05) !important;',
        '  filter: none !important;',
        '  backdrop-filter: blur(18px) saturate(132%) !important;',
        '  -webkit-backdrop-filter: blur(18px) saturate(132%) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__body {',
        '  min-height: 0;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param,',
        'body.' + BODY_CLASS + ' .settings-folder {',
        '  background: rgba(255,255,255,.05) !important;',
        '  border-radius: 1.05em !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.05) !important;',
        '  border: 1px solid rgba(255,255,255,.06) !important;',
        '  padding: .78em 1.1em !important;',
        '  margin: 0 0 .32em !important;',
        '  transition: background .18s ease, box-shadow .18s ease !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param:last-child,',
        'body.' + BODY_CLASS + ' .settings-folder:last-child {',
        '  margin-bottom: 0 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__body [data-parent] {',
        '  margin-bottom: .32em !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__body [data-parent]:last-child {',
        '  margin-bottom: 0 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param-title {',
        '  padding: .9em 1.1em .3em !important;',
        '  margin: 0 !important;',
        '  background: transparent !important;',
        '  border: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param-title > span {',
        '  font-size: .82em !important;',
        '  font-weight: 700 !important;',
        '  letter-spacing: .06em !important;',
        '  text-transform: uppercase !important;',
        '  color: rgba(255,255,255,.38) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param-text {',
        '  padding: .5em 1.1em !important;',
        '  font-size: .92em !important;',
        '  color: rgba(255,255,255,.55) !important;',
        '  line-height: 1.5 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param__name {',
        '  font-size: 1em !important;',
        '  font-weight: 600 !important;',
        '  color: rgba(255,255,255,.95) !important;',
        '  margin-bottom: .2em !important;',
        '  line-height: 1.3 !important;',
        '  position: relative !important; z-index: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param__value {',
        '  font-size: .88em !important;',
        '  color: rgba(255,255,255,.52) !important;',
        '  line-height: 1.25 !important;',
        '  position: relative !important; z-index: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param--button .settings-param__name {',
        '  margin-bottom: 0 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param__descr {',
        '  font-size: .82em !important;',
        '  color: rgba(255,255,255,.38) !important;',
        '  opacity: 1 !important;',
        '  margin-top: .55em !important;',
        '  line-height: 1.45 !important;',
        '  position: relative !important; z-index: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param__label {',
        '  font-size: .75em !important;',
        '  background: rgba(255,255,255,.92) !important;',
        '  color: #1a1c20 !important;',
        '  border-radius: .4em !important;',
        '  padding: .15em .55em !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param__status {',
        '  left: 95% !important;',
        '  top: 15% !important;',
        '  transform: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-folder {',
        '  display: flex !important;',
        '  align-items: center !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-folder__icon {',
        '  flex-shrink: 0 !important;',
        '  margin-right: .85em !important;',
        '  width: 1.7em !important;',
        '  height: 1.7em !important;',
        '  display: flex !important;',
        '  align-items: center !important;',
        '  justify-content: center !important;',
        '  color: rgba(255,255,255,.75) !important;',
        '  position: relative !important; z-index: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-folder__icon > * {',
        '  width: 1.5em !important;',
        '  height: 1.5em !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-folder__name {',
        '  font-size: 1em !important;',
        '  font-weight: 600 !important;',
        '  color: rgba(255,255,255,.95) !important;',
        '  line-height: 1.3 !important;',
        '  position: relative !important; z-index: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-folder__descr {',
        '  font-size: .82em !important;',
        '  color: rgba(255,255,255,.42) !important;',
        '  margin-top: .18em !important;',
        '  line-height: 1.35 !important;',
        '  position: relative !important; z-index: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param.focus,',
        'body.' + BODY_CLASS + ' .settings-folder.focus,',
        'body.' + BODY_CLASS + ' .settings-param.hover,',
        'body.' + BODY_CLASS + ' .settings-folder.hover {',
        '  background: rgba(255,255,255,.12) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 0 1px rgba(255,255,255,.10) !important;',
        '  border-color: rgba(255,255,255,.14) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-param.focus .settings-param__value {',
        '  color: rgba(255,255,255,.72) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-folder.focus::before,',
        'body.' + BODY_CLASS + ' .settings-folder.focus::after,',
        'body.' + BODY_CLASS + ' .settings-param.focus::before,',
        'body.' + BODY_CLASS + ' .settings-param.focus::after {',
        '  display: none !important;',
        '  content: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item {',
        '  border-radius: 1em !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item__title,',
        'body.' + BODY_CLASS + ' .selectbox-item__subtitle {',
        '  position: relative !important;',
        '  z-index: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item .shots-view-button__count {',
        '  position: static !important;',
        '  top: auto !important;',
        '  left: auto !important;',
        '  right: auto !important;',
        '  bottom: auto !important;',
        '  display: inline-block !important;',
        '  vertical-align: baseline !important;',
        '  margin-left: .5em !important;',
        '  background: rgba(255,255,255,.18) !important;',
        '  color: #fff !important;',
        '  font-size: .78em !important;',
        '  font-weight: 700 !important;',
        '  line-height: 1.2 !important;',
        '  padding: .1em .55em !important;',
        '  border-radius: 1em !important;',
        '  min-width: 1.4em !important;',
        '  text-align: center !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.focus .shots-view-button__count,',
        'body.' + BODY_CLASS + ' .selectbox-item.hover .shots-view-button__count {',
        '  background: rgba(255,255,255,.28) !important;',
        '  color: #fff !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.focus,',
        'body.' + BODY_CLASS + ' .selectbox-item.hover {',
        '  background: rgba(255,255,255,.14) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 0 1px rgba(255,255,255,.09) !important;',
        '  border-color: rgba(255,255,255,.12) !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.focus::before,',
        'body.' + BODY_CLASS + ' .selectbox-item.focus::after {',
        '  display: none !important;',
        '  content: none !important;',
        '}',
        'body.' + BODY_CLASS + '[' + RATING_ATTR + '="off"] .settings-param[data-name="' + RATING_STYLE_KEY + '"] { display: none !important; }',
        'body.' + BODY_CLASS + ' .settings-icon-holder,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings__content.layer--height,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .selectbox__content.layer--height,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings__content.layer--height { background: rgba(28,30,34,.96) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .selectbox__content.layer--height { background: rgba(26,29,34,.97) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings__content.layer--height { background: rgb(22,24,30) !important; box-shadow: 0 4px 12px rgba(0,0,0,.4) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox__content.layer--height { background: rgb(22,24,30) !important; box-shadow: 0 4px 12px rgba(0,0,0,.4) !important; }',
        'body.' + BODY_CLASS + ' .agnative-leftdock {',
        '  position: fixed !important;',
        '  left: 1em !important;',
        '  top: 50% !important;',
        '  transform: translateX(-130%) translateY(-50%) !important;',
        '  z-index: 25 !important;',
        '  width: max-content !important;',
        '  max-width: 16em !important;',
        '  max-height: 80vh !important;',
        '  overflow-y: auto !important;',
        '  display: inline-flex !important;',
        '  flex-direction: column !important;',
        '  padding: .32em !important;',
        '  border-radius: 1.35em !important;',
        '  background: rgba(22,24,30,.42) !important;',
        '  border: 1px solid rgba(255,255,255,.10) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 12px 32px rgba(0,0,0,.28) !important;',
        '  backdrop-filter: blur(22px) saturate(140%) !important;',
        '  -webkit-backdrop-filter: blur(22px) saturate(140%) !important;',
        '  font-size: calc(clamp(0.92rem, 0.5rem + 1.4vmin, 1.7rem) * var(--agnative-scale, 1)) !important;',
        '  opacity: 0 !important;',
        '  pointer-events: none !important;',
        '  transition: transform .28s cubic-bezier(.22,.61,.36,1), opacity .2s ease !important;',
        '}',
        'body.' + BODY_CLASS + ' .agnative-leftdock.is-visible {',
        '  transform: translateX(0) translateY(-50%) !important;',
        '  opacity: 1 !important;',
        '  pointer-events: auto !important;',
        '}',
        'body.' + BODY_CLASS + ' .agnative-leftdock__inner { display: flex; flex-direction: column; gap: .12em; }',
        'body.' + BODY_CLASS + ' .agnative-leftdock__case { display: flex; flex-direction: column; gap: .04em; }',
        'body.' + BODY_CLASS + ' .agnative-leftdock__split { height: 1px; margin: .3em .4em; background: rgba(255,255,255,.10); }',
        'body.' + BODY_CLASS + ' .agnative-leftdock__item.selector {',
        '  appearance: none; -webkit-appearance: none; border: 0; background: none;',
        '  color: rgba(255,255,255,.92);',
        '  min-height: 2.6em;',
        '  display: flex; align-items: center; gap: .35em;',
        '  padding: .4em .9em;',
        '  border-radius: 999px;',
        '  font-size: .92em; font-weight: 700; line-height: 1.1; white-space: nowrap;',
        '  transition: background .2s ease, transform .2s ease, box-shadow .2s ease;',
        '  cursor: pointer;',
        '}',
        'body.' + BODY_CLASS + ' .agnative-leftdock__item.is-active,',
        'body.' + BODY_CLASS + ' .agnative-leftdock__item.hover,',
        'body.' + BODY_CLASS + ' .agnative-leftdock__item.focus {',
        '  background: rgba(255,255,255,.16) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.14) !important;',
        '  transform: translateX(.04em) !important;',
        '}',
        'body.' + BODY_CLASS + ' .agnative-leftdock__item .menu__ico { width: 1.5em; height: 1.5em; min-width: 1.5em; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; margin-right: .3em !important; color: currentColor; }',
        'body.' + BODY_CLASS + ' .agnative-leftdock__item .menu__ico svg { width: 1.5em; height: 1.5em; color: currentColor; }',
        'body.' + BODY_CLASS + ' .agnative-leftdock__item .menu__text { display: inline-block; flex: 1 1 auto; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-leftdock {',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: rgba(22,24,30,.94) !important;',
        '  box-shadow: 0 4px 12px rgba(0,0,0,.4) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock {',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: rgb(22,24,30) !important;',
        '  box-shadow: 0 4px 12px rgba(0,0,0,.4) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-leftdock {',
        '  transition: opacity .15s ease !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock {',
        '  transition: none !important;',
        '  transform: translateX(-130%) translateY(-50%) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock.is-visible {',
        '  transform: translateX(0) translateY(-50%) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-leftdock__item.selector,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock__item.selector {',
        '  transition: background .12s ease !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock__item.selector {',
        '  transition: none !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-leftdock__item.is-active,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-leftdock__item.hover,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-leftdock__item.focus,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock__item.is-active,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock__item.hover,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-leftdock__item.focus {',
        '  transform: none !important;',
        '  box-shadow: 0 0 0 2px rgba(86,141,255,.92) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings {',
        '  position: fixed !important;',
        '  top: 0 !important;',
        '  right: 0 !important;',
        '  bottom: 0 !important;',
        '  left: 0 !important;',
        '  width: 100% !important;',
        '  height: 100% !important;',
        '  max-width: none !important;',
        '  max-height: none !important;',
        '  margin: 0 !important;',
        '  padding: 0 !important;',
        '  background: transparent !important;',
        '  z-index: 30 !important;',
        '  pointer-events: none !important;',
        '  font-size: calc(clamp(0.62rem, 0.34rem + 1.45vmin, 2.05rem) * var(--agnative-scale, 1)) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__layer {',
        '  position: absolute !important;',
        '  top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;',
        '  background: rgba(0,0,0,.28) !important;',
        '  pointer-events: auto !important;',
        '  z-index: 1 !important;',
        '  cursor: pointer !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__content,',
        'body.' + BODY_CLASS + ' .settings__content.layer--height {',
        '  position: absolute !important;',
        '  top: 5vh !important;',
        '  bottom: 5vh !important;',
        '  right: 1em !important;',
        '  left: auto !important;',
        '  width: min(32em, 42vw) !important;',
        '  min-width: 18em !important;',
        '  max-width: calc(100vw - 2em) !important;',
        '  height: auto !important;',
        '  max-height: none !important;',
        '  margin: 0 !important;',
        '  padding: 1.1em 1em .9em !important;',
        '  border-radius: 1.35em !important;',
        '  background: rgba(22,24,30,.42) !important;',
        '  background-image: none !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 12px 32px rgba(0,0,0,.28) !important;',
        '  border: 1px solid rgba(255,255,255,.10) !important;',
        '  filter: none !important;',
        '  backdrop-filter: blur(22px) saturate(140%) !important;',
        '  -webkit-backdrop-filter: blur(22px) saturate(140%) !important;',
        '  pointer-events: auto !important;',
        '  z-index: 2 !important;',
        '  transform: translateX(120%) !important;',
        '  opacity: 0 !important;',
        '  transition: transform .28s cubic-bezier(.22,.61,.36,1), opacity .2s ease !important;',
        '  display: flex !important;',
        '  flex-direction: column !important;',
        '}',
        'body.' + BODY_CLASS + '.settings--open .settings__content,',
        'body.' + BODY_CLASS + '.settings--open .settings__content.layer--height {',
        '  transform: translateX(0) !important;',
        '  opacity: 1 !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__body {',
        '  flex: 1 1 auto !important;',
        '  min-height: 0 !important;',
        '  height: auto !important;',
        '  max-height: none !important;',
        '  overflow-y: auto !important;',
        '  padding-right: .15em !important;',
        '  padding-top: .35em !important;',
        '  padding-bottom: .35em !important;',
        '  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 1.6em, #000 calc(100% - 1.6em), transparent 100%) !important;',
        '  mask-image: linear-gradient(to bottom, transparent 0, #000 1.6em, #000 calc(100% - 1.6em), transparent 100%) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__title,',
        'body.' + BODY_CLASS + ' .settings__head {',
        '  flex: 0 0 auto !important;',
        '  margin-bottom: .6em !important;',
        '}',
        'body.' + BODY_CLASS + '.settings--open .settings__layer { animation: agnativeSettingsLayerIn .25s ease both; }',
        'body.' + BODY_CLASS + ' .settings-input {',
        '  position: fixed !important;',
        '  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;',
        '  display: flex !important;',
        '  z-index: 50 !important;',
        '  background: transparent !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  font-size: calc(clamp(0.62rem, 0.34rem + 1.45vmin, 2.05rem) * var(--agnative-scale, 1)) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-input__content,',
        'body.' + BODY_CLASS + ' .settings-input__content.layer--height {',
        '  width: 100% !important;',
        '  flex-shrink: 0 !important;',
        '  display: flex !important;',
        '  flex-direction: column !important;',
        '  justify-content: center !important;',
        '  padding: 1.5em !important;',
        '  box-sizing: border-box !important;',
        '  background: rgba(22,24,30,.92) !important;',
        '  background-image: none !important;',
        '  backdrop-filter: blur(24px) saturate(140%) !important;',
        '  -webkit-backdrop-filter: blur(24px) saturate(140%) !important;',
        '  filter: none !important;',
        '  border: 0 !important;',
        '  border-radius: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-input__title {',
        '  font-size: 2.2em !important;',
        '  font-weight: 300 !important;',
        '  margin-bottom: 0.7em !important;',
        '  color: rgba(255,255,255,.96) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-input__input {',
        '  font-size: 2.1em !important;',
        '  margin-bottom: 1em !important;',
        '  min-height: 2.3em !important;',
        '  border-bottom: 2px solid rgba(255,255,255,.08) !important;',
        '  padding: 0.6em 0 !important;',
        '  color: rgba(255,255,255,.95) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-input__links {',
        '  margin-top: 1em !important;',
        '  background: rgba(221,221,221,.06) !important;',
        '  border-radius: 10em !important;',
        '  padding: 0.7em 1em !important;',
        '  font-size: 1.2em !important;',
        '  text-align: center !important;',
        '  color: rgba(255,255,255,.65) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-input--free {',
        '  background: rgba(22,24,30,.94) !important;',
        '  backdrop-filter: blur(20px) saturate(140%) !important;',
        '  -webkit-backdrop-filter: blur(20px) saturate(140%) !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-input--free .settings-input__content,',
        'body.' + BODY_CLASS + ' .settings-input--free .settings-input__content.layer--height {',
        '  margin: 0 auto !important;',
        '  background: transparent !important;',
        '  box-shadow: none !important;',
        '  border: 0 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings-input--focus .settings-input__content,',
        'body.' + BODY_CLASS + ' .settings-input--align-top .settings-input__content { justify-content: flex-start !important; }',
        'body.' + BODY_CLASS + ' .settings-input--align-center .settings-input__content { justify-content: center !important; }',
        'body.' + BODY_CLASS + ' .settings-input--align-bottom .settings-input__content { justify-content: flex-end !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings-input__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-input__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings-input__content.layer--height,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-input__content.layer--height {',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: rgba(22,24,30,.99) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings-input--free,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-input--free {',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: rgba(22,24,30,.99) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings__content.layer--height {',
        '  transition: transform .15s ease, opacity .15s ease !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: rgba(22,24,30,.94) !important;',
        '  box-shadow: 0 4px 12px rgba(0,0,0,.4) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings__content.layer--height {',
        '  transition: none !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: rgb(22,24,30) !important;',
        '  box-shadow: 0 4px 12px rgba(0,0,0,.4) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"].settings--open .settings__layer { animation: none !important; }',
        'body.' + BODY_CLASS + ' .selectbox {',
        '  display: none !important;',
        '  position: fixed !important;',
        '  top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;',
        '  width: 100% !important; height: 100% !important;',
        '  max-width: none !important; max-height: none !important;',
        '  margin: 0 !important; padding: 0 !important;',
        '  background: transparent !important;',
        '  z-index: 55 !important;',
        '  pointer-events: none !important;',
        '  font-size: calc(clamp(0.62rem, 0.34rem + 1.45vmin, 2.05rem) * var(--agnative-scale, 1)) !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox.animate {',
        '  display: block !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox__layer {',
        '  position: absolute !important;',
        '  top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;',
        '  background: rgba(0,0,0,.42) !important;',
        '  pointer-events: auto !important;',
        '  z-index: 1 !important;',
        '  cursor: pointer !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox.animate .selectbox__layer {',
        '  animation: agnativeSelectboxLayerIn .25s ease both;',
        '}',
        '@keyframes agnativeSelectboxLayerIn { from { opacity: 0; } to { opacity: 1; } }',
        'body.' + BODY_CLASS + ' .selectbox__content,',
        'body.' + BODY_CLASS + ' .selectbox__content.layer--height {',
        '  position: absolute !important;',
        '  top: 5vh !important;',
        '  bottom: 5vh !important;',
        '  right: 1em !important;',
        '  left: auto !important;',
        '  width: min(32em, 42vw) !important;',
        '  min-width: 18em !important;',
        '  max-width: calc(100vw - 2em) !important;',
        '  height: auto !important;',
        '  max-height: none !important;',
        '  margin: 0 !important;',
        '  padding: 1.1em 1em .9em !important;',
        '  border-radius: 1.35em !important;',
        '  background: rgba(22,24,30,.42) !important;',
        '  background-image: none !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 18px 44px rgba(0,0,0,.34) !important;',
        '  border: 1px solid rgba(255,255,255,.10) !important;',
        '  filter: none !important;',
        '  backdrop-filter: blur(22px) saturate(140%) !important;',
        '  -webkit-backdrop-filter: blur(22px) saturate(140%) !important;',
        '  pointer-events: auto !important;',
        '  z-index: 2 !important;',
        '  display: flex !important;',
        '  flex-direction: column !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox.animate .selectbox__content,',
        'body.' + BODY_CLASS + ' .selectbox.animate .selectbox__content.layer--height {',
        '  animation: agnativeSelectboxIn .28s cubic-bezier(.22,.61,.36,1) both;',
        '}',
        '@keyframes agnativeSelectboxIn {',
        '  from { opacity: 0; transform: translateX(120%); }',
        '  to   { opacity: 1; transform: translateX(0); }',
        '}',
        'body.' + BODY_CLASS + ' .selectbox__head {',
        '  flex: 0 0 auto !important;',
        '  margin: 0 0 .6em !important;',
        '  padding: 0 .2em !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox__title {',
        '  font-size: 1.05em !important;',
        '  font-weight: 700 !important;',
        '  letter-spacing: .01em !important;',
        '  color: rgba(255,255,255,.96) !important;',
        '  text-align: center !important;',
        '  margin: 0 !important;',
        '  padding: 0 !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox__body,',
        'body.' + BODY_CLASS + ' .selectbox__body.layer--wheight {',
        '  flex: 1 1 auto !important;',
        '  min-height: 0 !important;',
        '  height: auto !important;',
        '  max-height: none !important;',
        '  overflow-y: auto !important;',
        '  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 1.6em, #000 calc(100% - 1.6em), transparent 100%) !important;',
        '  mask-image: linear-gradient(to bottom, transparent 0, #000 1.6em, #000 calc(100% - 1.6em), transparent 100%) !important;',
        '  padding: .35em .15em !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selector {',
        '  background: rgba(255,255,255,.04) !important;',
        '  border: 1px solid rgba(255,255,255,.06) !important;',
        '  border-radius: 1em !important;',
        '  padding: .75em 1em !important;',
        '  margin: 0 0 .35em !important;',
        '  color: rgba(255,255,255,.92) !important;',
        '  transition: background .2s ease, transform .2s ease, box-shadow .2s ease !important;',
        '  cursor: pointer !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selector:last-child { margin-bottom: 0 !important; }',
        'body.' + BODY_CLASS + ' .selectbox-item.focus,',
        'body.' + BODY_CLASS + ' .selectbox-item.hover {',
        '  background: rgba(255,255,255,.14) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 0 0 1px rgba(255,255,255,.09) !important;',
        '  transform: translateY(-.02em) !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selected {',
        '  background: rgba(255,255,255,.10) !important;',
        '  border-color: rgba(255,255,255,.22) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.08) !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selected.focus,',
        'body.' + BODY_CLASS + ' .selectbox-item.selected.hover {',
        '  background: rgba(255,255,255,.20) !important;',
        '  border-color: rgba(255,255,255,.35) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 0 0 1px rgba(255,255,255,.14) !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item__title {',
        '  font-size: .98em !important;',
        '  font-weight: 600 !important;',
        '  line-height: 1.25 !important;',
        '  color: inherit !important;',
        '  flex: 1 1 auto !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item--checkbox {',
        '  padding-right: 3.2em !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item__checkbox {',
        '  position: absolute !important;',
        '  top: 50% !important;',
        '  right: .9em !important;',
        '  transform: translateY(-50%) !important;',
        '  width: 1.1em !important;',
        '  height: 1.1em !important;',
        '  border-radius: .28em !important;',
        '  border: 2px solid rgba(255,255,255,.28) !important;',
        '  background: transparent !important;',
        '  transition: border-color .15s ease, background .15s ease !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selected .selectbox-item__checkbox {',
        '  border-color: rgba(255,255,255,.75) !important;',
        '  background: rgba(255,255,255,.18) !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selected .selectbox-item__checkbox::after {',
        '  content: "" !important;',
        '  position: absolute !important;',
        '  left: .22em !important; top: .04em !important;',
        '  width: .35em !important; height: .6em !important;',
        '  border: 2px solid rgba(255,255,255,.92) !important;',
        '  border-top: none !important; border-left: none !important;',
        '  transform: rotate(44deg) !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selected:not(.nomark):not(.selectbox-item--checkbox)::after,',
        'body.' + BODY_CLASS + ' .selectbox-item.picked:not(.selectbox-item--checkbox)::after {',
        '  content: "◉" !important;',
        '  display: block !important;',
        '  width: auto !important;',
        '  height: fit-content !important;',
        '  border: none !important;',
        '  position: absolute !important;',
        '  top: 0 !important;',
        '  bottom: 0 !important;',
        '  right: 1em !important;',
        '  margin: auto 0 !important;',
        '  transform: none !important;',
        '  font-size: 1.1em !important;',
        '  font-weight: 700 !important;',
        '  color: rgba(255,255,255,.82) !important;',
        '  line-height: 1 !important;',
        '  z-index: 2 !important;',
        '}',
        'body.' + BODY_CLASS + ' .selectbox-item.selected:not(.nomark):not(.selectbox-item--checkbox),',
        'body.' + BODY_CLASS + ' .selectbox-item.picked:not(.selectbox-item--checkbox) {',
        '  padding-right: 2.8em !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .selectbox__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .selectbox__content.layer--height,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox__content.layer--height {',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: rgba(22,24,30,.96) !important;',
        '  box-shadow: 0 8px 24px rgba(0,0,0,.45) !important;',
        '  animation: none !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"].selectbox--open .selectbox__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"].selectbox--open .selectbox__content.layer--height,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"].selectbox--open .selectbox__content,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"].selectbox--open .selectbox__content.layer--height {',
        '  transform: translate3d(0, 0, 0) !important;',
        '}',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox__layer { animation: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox-item.selector { transition: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox-item.focus,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox-item.hover { transform: none !important; outline: 2px solid rgba(86,141,255,.92) !important; outline-offset: -2px !important; box-shadow: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-param.focus,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-param.hover,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-folder.focus,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-folder.hover { outline: 2px solid rgba(86,141,255,.92) !important; outline-offset: -2px !important; box-shadow: none !important; transform: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox-item__checkbox { transition: none !important; }',
        '@media (max-width: 480px) {',
        '  body.' + BODY_CLASS + ' .settings__content,',
        '  body.' + BODY_CLASS + ' .settings__content.layer--height {',
        '    width: 100% !important;',
        '    max-width: 100% !important;',
        '    left: 0 !important;',
        '    right: 0 !important;',
        '    top: unset !important;',
        '    bottom: 0 !important;',
        '    height: auto !important;',
        '    max-height: 92vh !important;',
        '    border-radius: 1.8em 1.8em 0 0 !important;',
        '    transform: translate3d(0, 100%, 0) !important;',
        '    transition: none !important;',
        '    opacity: 1 !important;',
        '  }',
        '  body.' + BODY_CLASS + '.settings--open .settings__content,',
        '  body.' + BODY_CLASS + '.settings--open .settings__content.layer--height {',
        '    transform: translate3d(0, 0, 0) !important;',
        '  }',
        '  body.' + BODY_CLASS + ' .selectbox__content,',
        '  body.' + BODY_CLASS + ' .selectbox__content.layer--height {',
        '    width: 100% !important;',
        '    max-width: 100% !important;',
        '    left: 0 !important;',
        '    right: 0 !important;',
        '    top: unset !important;',
        '    bottom: 0 !important;',
        '    height: auto !important;',
        '    max-height: 92vh !important;',
        '    border-radius: 1.8em 1.8em 0 0 !important;',
        '    transform: translate3d(0, 100%, 0) !important;',
        '    animation: none !important;',
        '  }',
        '  body.selectbox--open body.' + BODY_CLASS + ' .selectbox__content,',
        '  body.' + BODY_CLASS + ' .selectbox.animate .selectbox__content,',
        '  body.' + BODY_CLASS + ' .selectbox.animate .selectbox__content.layer--height {',
        '    transform: translate3d(0, 0, 0) !important;',
        '    animation: none !important;',
        '  }',
        '  body.' + BODY_CLASS + ' .settings__body { font-size: 1.1em !important; }',
        '}',

        /* ── Explorer (online / torrent source picker) ── */
        // Main layout — hide left info panel, center the files list in a tidy zone
        'body.' + BODY_CLASS + ' .explorer.layer--width { background:transparent !important; box-shadow:none !important; display:block !important; }',
        'body.' + BODY_CLASS + ' .explorer__left, body.' + BODY_CLASS + ' .explorer__card { display:none !important; }',
        'body.' + BODY_CLASS + ' .explorer__files { width:100% !important; max-width:78em !important; margin:0 auto !important; padding:0 1.5em !important; }',
        'body.' + BODY_CLASS + ' .explorer__files-head { padding:4.1em 0 .8em !important; }',
        'body.' + BODY_CLASS + ' .explorer__files-head .torrent-filter { display:flex !important; justify-content:center !important; align-items:center !important; gap:.55em !important; flex-wrap:wrap !important; }',

        // Filter / search buttons
        'body.' + BODY_CLASS + ' .explorer__files .torrent-filter .simple-button { background:rgba(255,255,255,.08) !important; border:1px solid rgba(255,255,255,.13) !important; border-radius:999px !important; padding:.42em 1.15em !important; color:rgba(255,255,255,.88) !important; font-size:.88em !important; font-weight:600 !important; line-height:1.2 !important; transition:background .18s ease, box-shadow .18s ease, transform .18s ease !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.08) !important; margin:0 !important; height:auto !important; }',
        'body.' + BODY_CLASS + ' .explorer__files .torrent-filter .simple-button.focus, body.' + BODY_CLASS + ' .explorer__files .torrent-filter .simple-button.hover { background:rgba(255,255,255,.18) !important; border-color:rgba(255,255,255,.16) !important; outline:none !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.16), 0 4px 10px rgba(0,0,0,.22) !important; transform:scale(1.04) !important; color:#fff !important; }',

        'body.' + BODY_CLASS + ' .explorer__files .torrent-filter .simple-button.agnative-explorer-back { display:inline-flex !important; align-items:center !important; justify-content:center !important; width:auto !important; height:auto !important; aspect-ratio:1 / 1 !important; padding:.42em !important; border-radius:50% !important; flex-shrink:0 !important; line-height:1 !important; color:rgba(255,255,255,.95) !important; }',
        'body.' + BODY_CLASS + ' .explorer__files .torrent-filter .simple-button.agnative-explorer-back > svg { display:block !important; width:1.2em !important; height:1.2em !important; color:inherit !important; fill:none !important; stroke:currentColor !important; margin:0 !important; flex-shrink:0 !important; }',
        'body.' + BODY_CLASS + ' .explorer__files .torrent-filter .simple-button.agnative-explorer-back.focus, body.' + BODY_CLASS + ' .explorer__files .torrent-filter .simple-button.agnative-explorer-back.hover { color:#fff !important; transform:scale(1.04) !important; animation:none !important; }',

        // Torrent / online-prestige / watched-history result rows
        'body.' + BODY_CLASS + ' .torrent-item.selector, body.' + BODY_CLASS + ' .online-prestige.selector, body.' + BODY_CLASS + ' .watched-history.selector { background:rgba(255,255,255,.055) !important; border:1px solid rgba(255,255,255,.09) !important; border-radius:1.1em !important; margin-bottom:.55em !important; padding:.85em 1.1em !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.06) !important; transition:background .2s ease, box-shadow .2s ease, transform .2s ease !important; }',
        'body.' + BODY_CLASS + ' .torrent-item.selector.focus, body.' + BODY_CLASS + ' .torrent-item.selector.hover, body.' + BODY_CLASS + ' .online-prestige.selector.focus, body.' + BODY_CLASS + ' .online-prestige.selector.hover, body.' + BODY_CLASS + ' .watched-history.selector.focus, body.' + BODY_CLASS + ' .watched-history.selector.hover { background:rgba(255,255,255,.13) !important; border-color:rgba(255,255,255,.14) !important; outline:none !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.14), 0 14px 36px rgba(0,0,0,.4), 0 6px 16px rgba(0,0,0,.22) !important; transform:scale(1.025) !important; position:relative !important; z-index:5 !important; }',
        'body.' + BODY_CLASS + ' .torrent-item.selector.focus::after, body.' + BODY_CLASS + ' .torrent-item.selector.focus::before, body.' + BODY_CLASS + ' .torrent-item.selector.hover::after, body.' + BODY_CLASS + ' .torrent-item.selector.hover::before, body.' + BODY_CLASS + ' .online-prestige.selector.focus::after, body.' + BODY_CLASS + ' .online-prestige.selector.focus::before, body.' + BODY_CLASS + ' .online-prestige.selector.hover::after, body.' + BODY_CLASS + ' .online-prestige.selector.hover::before, body.' + BODY_CLASS + ' .watched-history.selector.focus::after, body.' + BODY_CLASS + ' .watched-history.selector.focus::before, body.' + BODY_CLASS + ' .watched-history.selector.hover::after, body.' + BODY_CLASS + ' .watched-history.selector.hover::before { display:none !important; content:none !important; border:0 !important; box-shadow:none !important; }',

        // Row content
        'body.' + BODY_CLASS + ' .torrent-item__title { font-size:.92em !important; font-weight:600 !important; color:rgba(255,255,255,.92) !important; line-height:1.35 !important; margin-bottom:.45em !important; }',
        'body.' + BODY_CLASS + ' .torrent-item__details { display:flex !important; flex-wrap:wrap !important; gap:.3em !important; margin-bottom:.45em !important; align-items:center !important; }',
        'body.' + BODY_CLASS + ' .torrent-item__bitrate.bitrate, body.' + BODY_CLASS + ' .bitrate > span { background:rgba(255,255,255,.1) !important; border-radius:.4em !important; padding:.12em .45em !important; font-size:.7em !important; font-weight:700 !important; color:rgba(255,255,255,.8) !important; border:0 !important; }',
        'body.' + BODY_CLASS + ' .torrent-item__size { background:rgba(255,255,255,.14) !important; border-radius:.55em !important; padding:.22em .7em !important; font-size:.78em !important; font-weight:700 !important; color:#fff !important; white-space:nowrap !important; }',
        'body.' + BODY_CLASS + ' .torrent-item__date, body.' + BODY_CLASS + ' .torrent-item__tracker { font-size:.7em !important; color:rgba(255,255,255,.45) !important; }',
        'body.' + BODY_CLASS + ' .torrent-item__seeds, body.' + BODY_CLASS + ' .torrent-item__grabs { font-size:.7em !important; color:rgba(255,255,255,.45) !important; }',
        'body.' + BODY_CLASS + ' .torrent-item__viewed { opacity:.5 !important; }',

        // Torrent serial (season/episode list within item)
        'body.' + BODY_CLASS + ' .torrent-serial.selector { background:rgba(255,255,255,.04) !important; border:1px solid rgba(255,255,255,.08) !important; border-radius:1em !important; margin-bottom:.4em !important; transition:background .18s ease, box-shadow .18s ease !important; }',
        'body.' + BODY_CLASS + ' .torrent-serial.selector.focus, body.' + BODY_CLASS + ' .torrent-serial.selector.hover { background:rgba(255,255,255,.11) !important; border-color:rgba(255,255,255,.12) !important; outline:none !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.12), 0 10px 28px rgba(0,0,0,.32) !important; transform:scale(1.02) !important; position:relative !important; z-index:5 !important; }',
        'body.' + BODY_CLASS + ' .torrent-serial.selector.focus::after, body.' + BODY_CLASS + ' .torrent-serial.selector.focus::before, body.' + BODY_CLASS + ' .torrent-serial.selector.hover::after, body.' + BODY_CLASS + ' .torrent-serial.selector.hover::before { display:none !important; content:none !important; border:0 !important; box-shadow:none !important; }',

        // Performance mode "low" — smaller scale, lighter shadows
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .torrent-item.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .torrent-serial.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .online-prestige.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .watched-history.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .explorer__files .torrent-filter .simple-button { transition: background .15s ease, transform .15s ease !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .torrent-item.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .torrent-item.selector.hover, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .online-prestige.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .online-prestige.selector.hover, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .watched-history.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .watched-history.selector.hover { transform:scale(1.015) !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.12), 0 6px 16px rgba(0,0,0,.28) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .torrent-serial.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .torrent-serial.selector.hover { transform:scale(1.012) !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 4px 12px rgba(0,0,0,.22) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .explorer__files .torrent-filter .simple-button.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .explorer__files .torrent-filter .simple-button.hover { transform:scale(1.03) !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.14), 0 3px 8px rgba(0,0,0,.18) !important; }',

        // Performance mode "ultra" — no scale, no shadows, only background change
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .torrent-item.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .torrent-serial.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .online-prestige.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .watched-history.selector, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .explorer__files .torrent-filter .simple-button { transition:none !important; will-change:auto !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .torrent-item.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .torrent-item.selector.hover, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .torrent-serial.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .torrent-serial.selector.hover, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .online-prestige.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .online-prestige.selector.hover, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .watched-history.selector.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .watched-history.selector.hover { transform:none !important; box-shadow:none !important; background:rgba(255,255,255,.18) !important; border-color:rgba(255,255,255,.28) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .explorer__files .torrent-filter .simple-button.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .explorer__files .torrent-filter .simple-button.hover { transform:none !important; box-shadow:none !important; background:rgba(255,255,255,.26) !important; }',

        'body.' + BODY_CLASS + ' .card[data-nfx-switched="1"] .card__view { opacity:1 !important; }',
        'body.' + BODY_CLASS + ' .card-episode .nfx-episode-logo { display:block !important; max-height:2.35em !important; max-width:80% !important; margin:0 0 .32em !important; padding:0 !important; background:transparent !important; border:0 !important; border-radius:0 !important; clip-path:none !important; -webkit-clip-path:none !important; object-fit:contain !important; object-position:left center !important; filter: drop-shadow(0 2px 6px rgba(0,0,0,.55)) !important; }',
        'body.' + BODY_CLASS + ' .card-episode .nfx-episode-title { font-size: calc(.95em * var(--agnative-scale, 1)) !important; font-weight:800 !important; color:#fff !important; line-height:1.14 !important; max-width:100% !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; margin:0 0 .3em !important; padding:0 !important; letter-spacing:.005em !important; }',
        'body.' + BODY_CLASS + ' .card__vote, body.' + BODY_CLASS + ' .card__quality, body.' + BODY_CLASS + ' .card__type, body.' + BODY_CLASS + ' .card__promo-text, body.' + BODY_CLASS + ' .card__promo-title, body.' + BODY_CLASS + ' .nfx-card-overlay__match { display:none !important; }',
        'body.' + BODY_CLASS + ' .card__title, body.' + BODY_CLASS + ' .card__age { display:none !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay { position:absolute; left:0; right:0; bottom:0; z-index:2; display:flex !important; flex-direction:column; justify-content:center; align-items:flex-start; opacity:1 !important; visibility:visible !important; border-radius:0 0 1.55em 1.55em !important; background:transparent !important; padding:2.15em 1.02em .92em !important; transform: translateZ(14px); transition: transform .28s cubic-bezier(.22,.61,.36,1), opacity .24s ease; pointer-events:none; }',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="start"] .nfx-card-overlay { align-items:flex-start !important; }',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="start"] .nfx-card-overlay__title,',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="start"] .nfx-card-overlay__local-title,',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="start"] .nfx-card-overlay__meta { text-align:left !important; }',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="center"] .nfx-card-overlay { align-items:center !important; }',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="center"] .nfx-card-overlay__title,',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="center"] .nfx-card-overlay__local-title,',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="center"] .nfx-card-overlay__meta { text-align:center !important; }',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="end"] .nfx-card-overlay { align-items:flex-end !important; }',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="end"] .nfx-card-overlay__title,',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="end"] .nfx-card-overlay__local-title,',
        'body.' + BODY_CLASS + '[' + OVERLAY_ALIGN_ATTR + '="end"] .nfx-card-overlay__meta { text-align:right !important; }',
        'body.' + BODY_CLASS + ' .card.focus .nfx-card-overlay { transform: translateZ(18px) translateY(-.02em); }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay__logo, body.' + BODY_CLASS + ' img.nfx-card-overlay__logo { display:block !important; opacity:1 !important; visibility:visible !important; max-height:2.55em !important; max-width:82% !important; margin-bottom:.28em !important; border-radius:0 !important; clip-path:none !important; -webkit-clip-path:none !important; mask-image:none !important; -webkit-mask-image:none !important; overflow:visible !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay__title { color:#fff; font-size:1.02em !important; line-height:1.14 !important; font-weight:800 !important; text-shadow:0 1px 2px rgba(0,0,0,.95), 0 2px 8px rgba(0,0,0,.85), 0 4px 16px rgba(0,0,0,.7) !important; white-space:normal !important; display:-webkit-box !important; -webkit-line-clamp:2 !important; -webkit-box-orient:vertical !important; overflow:hidden !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay__local-title { color:rgba(255,255,255,.92) !important; opacity:.85 !important; font-size:.78em !important; line-height:1.2 !important; font-weight:600 !important; letter-spacing:.01em !important; text-shadow:0 1px 2px rgba(0,0,0,.95), 0 2px 6px rgba(0,0,0,.85), 0 3px 12px rgba(0,0,0,.7) !important; white-space:normal !important; display:-webkit-box !important; -webkit-line-clamp:2 !important; -webkit-box-orient:vertical !important; overflow:hidden !important; margin-bottom:.22em !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay__meta { color:rgba(255,255,255,.92); font-size:.74em !important; margin-top:.2em !important; line-height:1.28 !important; white-space:normal !important; max-width:100% !important; text-shadow:0 1px 2px rgba(0,0,0,.95), 0 2px 6px rgba(0,0,0,.85), 0 3px 12px rgba(0,0,0,.7) !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-logo { position:absolute; top:.7em; left:.82em; z-index:4; display:inline-flex !important; opacity:1 !important; visibility:visible !important; align-items:center; justify-content:center; padding:.38em .88em; border-radius:.92em; background:rgba(12,14,20,.62); border:1px solid rgba(255,255,255,.12); color:rgba(255,255,255,.96); font-size:.74em; font-weight:800; letter-spacing:.05em; backdrop-filter: blur(10px) saturate(140%); -webkit-backdrop-filter: blur(10px) saturate(140%); pointer-events:none; }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay__title { font-size: calc(1em * var(--agnative-scale, 1)) !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay__meta { font-size: calc(.72em * var(--agnative-scale, 1)) !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-logo { font-size: calc(.72em * var(--agnative-scale, 1)) !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-rating { position:absolute; top:.7em; right:.82em; z-index:4; display:inline-flex; align-items:center; justify-content:center; padding:.32em .66em; border-radius:.85em; background:rgba(12,14,20,.68); border:1px solid rgba(255,255,255,.14); color:rgba(255,255,255,.96); font-size: calc(.72em * var(--agnative-scale, 1)); font-weight:800; letter-spacing:.02em; backdrop-filter: blur(10px) saturate(140%); -webkit-backdrop-filter: blur(10px) saturate(140%); pointer-events:none; box-shadow: 0 4px 10px rgba(0,0,0,.24); }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="1"]  { color:#ff4444 !important; border-color:rgba(255,68,68,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="2"]  { color:#ff6633 !important; border-color:rgba(255,102,51,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="3"]  { color:#ff8800 !important; border-color:rgba(255,136,0,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="4"]  { color:#ffaa00 !important; border-color:rgba(255,170,0,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="5"]  { color:#ffcc00 !important; border-color:rgba(255,204,0,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="6"]  { color:#ddee00 !important; border-color:rgba(221,238,0,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="7"]  { color:#aadd00 !important; border-color:rgba(170,221,0,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="8"]  { color:#66cc33 !important; border-color:rgba(102,204,51,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="9"]  { color:#33bb33 !important; border-color:rgba(51,187,51,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="color"] .nfx-card-rating[data-score="10"] { color:#00bb44 !important; border-color:rgba(0,187,68,.35) !important; }',
        'body.' + BODY_CLASS + '[' + RATING_STYLE_ATTR + '="mono"] .nfx-card-rating { color:rgba(255,255,255,.96) !important; background:rgba(255,255,255,.12) !important; border-color:rgba(255,255,255,.18) !important; }',
        'body.' + BODY_CLASS + '[' + BADGE_ATTR + '="off"] .nfx-card-logo { display:none !important; }',
        'body.' + BODY_CLASS + '[' + RATING_ATTR + '="off"] .nfx-card-rating { display:none !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .nfx-card-overlay { display:flex !important; background:transparent !important; padding:5em 1em 1em !important; border-radius:0 0 1.55em 1.55em !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .nfx-card-rating { display:inline-flex !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .nfx-card-logo { display:inline-flex !important; }',
        'body.' + BODY_CLASS + '[' + BADGE_ATTR + '="off"][' + BACKDROP_ATTR + '="off"] .nfx-card-logo { display:none !important; }',
        'body.' + BODY_CLASS + '[' + RATING_ATTR + '="off"][' + BACKDROP_ATTR + '="off"] .nfx-card-rating { display:none !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .nfx-card-overlay__logo { max-height:2.2em !important; max-width:78% !important; margin-bottom:.24em !important; }',
        'body.' + BODY_CLASS + '[' + LOGO_SIZE_ATTR + '="xs"] .nfx-card-overlay__logo { max-width:50% !important; max-height:1.7em !important; }',
        'body.' + BODY_CLASS + '[' + LOGO_SIZE_ATTR + '="sm"] .nfx-card-overlay__logo { max-width:64% !important; max-height:1.95em !important; }',
        'body.' + BODY_CLASS + '[' + LOGO_SIZE_ATTR + '="lg"] .nfx-card-overlay__logo { max-width:90% !important; max-height:2.6em !important; }',
        'body.' + BODY_CLASS + '[' + LOGO_SIZE_ATTR + '="xl"] .nfx-card-overlay__logo { max-width:100% !important; max-height:3.1em !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .nfx-card-overlay__title { font-size: calc(.95em * var(--agnative-scale, 1)) !important; font-weight:800 !important; line-height:1.16 !important; white-space:normal !important; display:-webkit-box !important; -webkit-line-clamp:2 !important; -webkit-box-orient:vertical !important; overflow:hidden !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .nfx-card-overlay__meta { font-size: calc(.68em * var(--agnative-scale, 1)) !important; margin-top:.18em !important; opacity:.85 !important; white-space:normal !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .card__title { display:none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-logo,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-rating,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-logo,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-rating,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-overlay,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-overlay,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-logo,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-rating,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-overlay { background: transparent !important; }',

        /* Snack TV owns the size of a card; the AgNative settings only steer the picture and its labels. */
        'body.stv[data-agnative-backdrop="on"] .items-line .card:not(.card--wide):not(.card--collection):not(.card-more) .card__view { padding-bottom:56.25% !important; }',
        'body.stv[data-agnative-backdrop="on"] .items-line .card:not(.card--wide):not(.card--collection):not(.card-more) { width:calc(var(--stv-agn-w, 20em) * var(--agn-size, 1)) !important; }',
        'body.stv[data-agnative-card-size="xs"] { --agn-size:.78; }',
        'body.stv[data-agnative-card-size="sm"] { --agn-size:.89; }',
        'body.stv[data-agnative-card-size="md"] { --agn-size:1; }',
        'body.stv[data-agnative-card-size="lg"] { --agn-size:1.14; }',
        'body.stv[data-agnative-card-size="xl"] { --agn-size:1.3; }',
        'body.stv .card .card__img { object-fit:cover !important; }',

      ].join('\n');
      if (style.textContent !== text) style.textContent = text;
      if (!style.parentNode) {
        if (document.body) document.body.appendChild(style);
        else document.head.appendChild(style);
      }
      styleSignature = STYLE_ID;
    }

    function iconSearch() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2"></circle><path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';
    }

    function iconSettings() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19.875 6.27a2.225 2.225 0 0 1 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/></svg>';
    }

    function iconProfile() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4.1" stroke="currentColor" stroke-width="2"></circle><path d="M4 20c0-3.9 3.8-6 8-6s8 2.1 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';
    }

    function iconFavorite() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.5H15.5C17.433 3.5 19 5.067 19 7V21L12 17.1L5 21V7C5 5.067 6.567 3.5 8.5 3.5H7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path></svg>';
    }

    function iconSync() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12a8 8 0 0 0-13.66-5.66" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M4 5v4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 12a8 8 0 0 0 13.66 5.66" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M20 19v-4h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    }

    function iconPlayer() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"></rect><path d="M10 9.5L15 12L10 14.5V9.5Z" fill="currentColor"></path></svg>';
    }

    function iconData() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" stroke-width="2"></ellipse><path d="M5 6V18C5 19.66 8.13 21 12 21C15.87 21 19 19.66 19 18V6" stroke="currentColor" stroke-width="2"></path><path d="M5 12C5 13.66 8.13 15 12 15C15.87 15 19 13.66 19 12" stroke="currentColor" stroke-width="2"></path></svg>';
    }

    function iconBackward() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    }

    function iconEdit() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17V21H7L17 11L13 7L3 17Z"/><path d="M14 6L18 10"/></svg>';
    }

    function iconCircleLetter(letter) {
      var ch = (letter || '').charAt(0).toUpperCase() || '·';
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
        + '<circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="2"/>'
        + '<text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">' + escapeHtml(ch) + '</text>'
        + '</svg>';
    }

    function pickLeftdockIcon(action, label) {
      var a = (action || '').toLowerCase();
      if (a === 'search') return iconSearch();
      if (a === 'favorite' || a === 'bookmarks') return iconFavorite();
      if (a === 'settings') return iconSettings();
      if (a === 'edit' || a === 'more') return iconEdit();
      return iconCircleLetter(label);
    }

    function iconHome() {
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    }

    function getProfileButtonHtml() {
      try {
        var permit = window.Lampa && Lampa.Account && Lampa.Account.Permit ? Lampa.Account.Permit : null;
        var profile = permit && permit.account ? permit.account.profile : null;
        var icon = profile && profile.icon ? profile.icon : '';
        var protocol = window.Lampa && Lampa.Utils && typeof Lampa.Utils.protocol === 'function' ? Lampa.Utils.protocol() : '';
        var domain = window.Lampa && Lampa.Manifest ? Lampa.Manifest.cub_domain : '';
        if (icon && protocol && domain) {
          return '<img class="agnative-topnav-right__profile-img" src="' + protocol + domain + '/img/profiles/' + icon + '.png" alt="profile">';
        }
      } catch (e) { }
      return iconProfile();
    }

    function triggerSelectorEvent(node, eventName) {
      if (!node || !eventName) return false;
      try {
        if (window.$) {
          $(node).trigger(eventName);
          return true;
        }
      } catch (e) { }
      return false;
    }

    function triggerSelectorEnter(node) {
      if (!node) return false;
      if (triggerSelectorEvent(node, 'hover:enter')) return true;
      clickNode(node);
      return true;
    }

    function normalizeTopnavAction(action) {
      var value = String(action || '').trim().toLowerCase();
      if (!value) return '';
      if (value === 'release' || value === 'releases') return 'relise';
      if (value === 'bookmarks') return 'favorite';
      if (value === 'schedule') return 'timetable';
      if (value === 'collection' || value === 'collections') return 'catalog';
      return value;
    }

    function clickNode(node) {
      if (!node) return;
      try {
        if (typeof node.click === 'function') node.click();
        else node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      } catch (e) { }
    }

    function getMenuItem(action) {
      action = normalizeTopnavAction(action);
      return qs('.menu .menu__item.selector[data-action="' + action + '"]');
    }

    function triggerMenuAction(action) {
      action = normalizeTopnavAction(action);
      try {
        if (!window.Lampa) return false;
        var nativeMenuItem = getMenuItem(action);
        if (nativeMenuItem && triggerSelectorEnter(nativeMenuItem)) return true;

        var Storage = Lampa.Storage;
        var Lang = Lampa.Lang;
        if (!Storage || !Lang || !Lampa.Activity) return false;

        if (action === 'movie' || action === 'tv' || action === 'anime') {
          Lampa.Activity.push({
            url: action,
            title: (action === 'movie' ? Lang.translate('menu_movies') : action === 'anime' ? Lang.translate('menu_anime') : Lang.translate('menu_tv')) + ' - ' + Storage.field('source').toUpperCase(),
            component: 'category',
            source: action === 'anime' ? 'cub' : Storage.field('source'),
            page: 1
          });
          return true;
        }

        if (action === 'cartoon') {
          Lampa.Activity.push({
            url: 'movie',
            title: Lang.translate('menu_multmovie') + ' - ' + Storage.field('source').toUpperCase(),
            component: 'category',
            genres: 16,
            page: 1
          });
          return true;
        }

        if (action === 'main') {
          Lampa.Activity.push({
            url: '',
            title: Lang.translate('title_main') + ' - ' + Storage.field('source').toUpperCase(),
            component: 'main',
            source: Storage.field('source')
          });
          return true;
        }
      } catch (e) { }
      return false;
    }

    function triggerSearch() {
      closeControlPanel(false);
      try {
        var menuItem = getMenuItem('search');
        if (menuItem && triggerSelectorEnter(menuItem)) return true;

        if (window.Lampa && Lampa.Search && typeof Lampa.Search.open === 'function') {
          Lampa.Search.open({});
          return true;
        }
      } catch (e) { }
      return false;
    }

    function triggerSettings() {
      closeControlPanel(false);
      try {
        var menuItem = getMenuItem('settings');
        if (menuItem) {
          triggerSelectorEnter(menuItem);
          return true;
        }

        if (window.Lampa && Lampa.ParentalControl && typeof Lampa.ParentalControl.personal === 'function') {
          Lampa.ParentalControl.personal('settings', function () {
            var nativeBtn = qs('.head__settings, .settings-icon-holder, .head__action.open--settings, .open--settings');
            if (nativeBtn) {
              triggerSelectorEnter(nativeBtn);
              return;
            }
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
              Lampa.Controller.toggle('settings');
            }
          }, false, true);
          return true;
        }
      } catch (e) { }
      return false;
    }

    function openSettingsComponent(componentName) {
      try {
        if (!window.Lampa) return false;
        if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
          Lampa.Controller.toggle('settings');
        }
        if (Lampa.Settings && typeof Lampa.Settings.create === 'function') {
          setTimeout(function () {
            try {
              Lampa.Settings.create(componentName);
            } catch (e) {
              if (componentName !== 'more') Lampa.Settings.create('more');
            }
          }, 40);
          return true;
        }
      } catch (e) { }
      return triggerSettings();
    }

    function triggerSyncSettings() {
      closeControlPanel(false);
      return openSettingsComponent('account');
    }

    function triggerPlayerSettings() {
      closeControlPanel(false);
      return openSettingsComponent('player');
    }

    function triggerCacheDataSettings() {
      closeControlPanel(false);
      return openSettingsComponent('data');
    }

    function triggerFavorite() {
      closeControlPanel(false);
      try {
        var menuItem = getMenuItem('favorite');
        if (menuItem && triggerSelectorEnter(menuItem)) return true;

        if (window.Lampa && Lampa.ParentalControl && typeof Lampa.ParentalControl.personal === 'function' && Lampa.Activity && Lampa.Lang) {
          Lampa.ParentalControl.personal('bookmarks', function () {
            Lampa.Activity.push({ component: 'bookmarks', title: Lampa.Lang.translate('settings_input_links') });
          }, false, true);
          return true;
        }
      } catch (e) { }
      return false;
    }

    function langText(key, fallback) {
      try {
        if (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
          var value = Lampa.Lang.translate(key);
          if (value && value !== key) return value;
        }
      } catch (e) { }
      return fallback;
    }

    function triggerProfile() {
      closeControlPanel(false);
      try {
        var openProfilesDirect = function () {
          if (window.Lampa && Lampa.Account && Lampa.Account.Profile && typeof Lampa.Account.Profile.select === 'function') {
            Lampa.Account.Profile.select(function () {
              if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                Lampa.Controller.toggle('head');
              }
            });
            return true;
          }

          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showProfiles === 'function') {
            Lampa.Account.showProfiles(function () {
              if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                Lampa.Controller.toggle('head');
              }
            });
            return true;
          }
          return false;
        };

        var nativeBtn = qs('.head__action.open--profile, .open--profile');
        if (nativeBtn) {
          triggerSelectorEnter(nativeBtn);
          setTimeout(function () {
            if (!document.body) return;
            if (document.body.classList.contains('selectbox--open')) return;
            openProfilesDirect();
          }, 80);
          return true;
        }

        return openProfilesDirect();
      } catch (e) { }
      return false;
    }

    function consumeEvent(e) {
      if (!e) return false;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      return false;
    }

    function markSwallowClick(ms) {
      swallowClickUntil = Date.now() + (typeof ms === 'number' ? ms : 260);
    }

    function bindControlPanelOutsideClose() {
      if (controlPanelOutsideHandler || !document || !document.addEventListener) return;

      controlPanelOutsideHandler = function (e) {
        if (!controlPanelOpen) return;
        var target = e && e.target;
        if (!target) return;
        if (target.closest && target.closest('.agnative-control-panel')) return;
        if (target.closest && target.closest('.agnative-topnav-clock')) return;
        closeControlPanel(true);
        markSwallowClick(280);
        consumeEvent(e);
      };

      controlPanelSwallowHandler = function (e) {
        if (Date.now() >= swallowClickUntil) return;
        consumeEvent(e);
      };

      document.addEventListener('mousedown', controlPanelOutsideHandler, true);
      document.addEventListener('touchstart', controlPanelOutsideHandler, true);
      document.addEventListener('click', controlPanelSwallowHandler, true);
    }

    function unbindControlPanelOutsideClose() {
      if (!controlPanelOutsideHandler) return;
      document.removeEventListener('mousedown', controlPanelOutsideHandler, true);
      document.removeEventListener('touchstart', controlPanelOutsideHandler, true);
      document.removeEventListener('click', controlPanelSwallowHandler, true);
      controlPanelOutsideHandler = null;
      controlPanelSwallowHandler = null;
    }

    function ensureControlPanelController(panel) {
      if (controlPanelControllerReady || !window.Lampa || !Lampa.Controller || !Lampa.Controller.add || !window.$) return;
      controlPanelControllerReady = true;

      Lampa.Controller.add('agnative_control_panel', {
        toggle: function () {
          var view = $(panel);
          var target = qs('.agnative-control-panel__tile.selected', panel) || qs('.agnative-control-panel__tile.selector', panel);
          Lampa.Controller.collectionSet(view);
          Lampa.Controller.collectionFocus(target || false, view, true);
        },
        up: function () { if (window.Navigator && Navigator.move) Navigator.move('up'); },
        down: function () { if (window.Navigator && Navigator.move) Navigator.move('down'); },
        left: function () { if (window.Navigator && Navigator.move) Navigator.move('left'); },
        right: function () { if (window.Navigator && Navigator.move) Navigator.move('right'); },
        back: function () { closeControlPanel(true); }
      });
    }

    function ensureControlPanel(head) {
      if (!controlPanelEnabled()) return null;
      if (!head) return null;
      var panel = qs('.agnative-control-panel', head);
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'agnative-control-panel';
        panel.setAttribute('aria-hidden', 'true');
        head.appendChild(panel);
      }

      panel.innerHTML = '<div class="agnative-control-panel__title">' + escapeHtml(langText('settings_cub_account', 'Account')) + '</div><div class="agnative-control-panel__grid"></div>';
      var grid = qs('.agnative-control-panel__grid', panel);
      if (!grid) return panel;

      [
        { role: 'settings', title: langText('title_settings', 'Settings'), icon: iconSettings(), handler: triggerSettings },
        { role: 'sync', title: langText('settings_cub_sync', 'Synchronization'), icon: iconSync(), handler: triggerSyncSettings },
        { role: 'player', title: langText('settings_main_player', 'Player'), icon: iconPlayer(), handler: triggerPlayerSettings },
        { role: 'data', title: langText('settings_rest_cache_all', 'Cache & Data'), icon: iconData(), handler: triggerCacheDataSettings }
      ].forEach(function (def) {
        var tile = document.createElement('div');
        tile.className = 'agnative-control-panel__tile selector';
        tile.setAttribute('data-role', def.role);
        tile.setAttribute('data-selector', 'true');
        tile.setAttribute('tabindex', '0');
        tile.innerHTML = '<span class="agnative-control-panel__icon">' + def.icon + '</span><span class="agnative-control-panel__label">' + escapeHtml(def.title) + '</span>';
        bindAction(tile, function () {
          closeControlPanel(true);
          def.handler();
        });
        grid.appendChild(tile);
      });

      ensureControlPanelController(panel);
      return panel;
    }

    function openControlPanel(head) {
      var panel = ensureControlPanel(head || qs('.head__body') || qs('.head'));
      if (!panel) return false;
      if (controlPanelOpen) return true;

      controlPanelOpen = true;
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      bindControlPanelOutsideClose();

      try {
        if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function') {
          var current = Lampa.Controller.enabled();
          controlPanelPrevController = current && current.name ? current.name : '';
        }
        if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
          Lampa.Controller.toggle('agnative_control_panel');
        }
      } catch (e) { }
      return true;
    }

    function closeControlPanel(restoreController) {
      var panel = qs('.agnative-control-panel');
      if (!panel || !controlPanelOpen) return false;

      controlPanelOpen = false;
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      unbindControlPanelOutsideClose();

      try {
        if (restoreController && controlPanelPrevController && window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
          Lampa.Controller.toggle(controlPanelPrevController);
        }
      } catch (e) { }

      return true;
    }

    function triggerClockActions(head) {
      if (!controlPanelEnabled()) {
        closeControlPanel(false);
        return false;
      }
      if (controlPanelOpen) return closeControlPanel(true);
      return openControlPanel(head);
    }

    function bindAction(btn, fn) {
      if (!btn || !fn) return;
      var busy = false;
      function run(e) {
        if (busy) return false;
        busy = true;
        setTimeout(function () { busy = false; }, 180);
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        fn();
        return false;
      }
      btn.addEventListener('click', run);
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') run(e);
      });
      btn.addEventListener('mouseenter', function () { btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function () { btn.classList.remove('hover'); });
      if (window.$) {
        try {
          $(btn).off('.agnativeTopnavAction');
          $(btn).on('hover:enter.agnativeTopnavAction', run);
          $(btn).on('hover:focus.agnativeTopnavAction hover:hover.agnativeTopnavAction', function () {
            btn.classList.add('focus');
          });
          $(btn).on('hover:blur.agnativeTopnavAction hover:out.agnativeTopnavAction', function () {
            btn.classList.remove('focus');
          });
        } catch (e) { }
      }
    }

    function bindMenu(btn, actionName, sourceNode) {
      if (!btn) return;
      var busy = false;
      function run(e) {
        if (busy) return false;
        busy = true;
        setTimeout(function () { busy = false; }, 180);
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (actionName && triggerMenuAction(actionName)) return;
        if (sourceNode) clickNode(sourceNode);
        return false;
      }
      btn.addEventListener('click', run);
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') run(e);
      });
      btn.addEventListener('mouseenter', function () { btn.classList.add('hover'); });
      btn.addEventListener('mouseleave', function () { btn.classList.remove('hover'); });
      if (window.$) {
        try {
          $(btn).off('.agnativeTopnavMenu');
          $(btn).on('hover:enter.agnativeTopnavMenu', run);
          $(btn).on('hover:focus.agnativeTopnavMenu hover:hover.agnativeTopnavMenu', function () {
            btn.classList.add('focus');
          });
          $(btn).on('hover:blur.agnativeTopnavMenu hover:out.agnativeTopnavMenu', function () {
            btn.classList.remove('focus');
          });
        } catch (e) { }
      }
    }

    function forwardWheelBelowTopnav(e) {
      if (e.__agnativeForwardedWheel) return;
      var head = qs('.head');
      if (!head) return;
      var prev = head.style.pointerEvents;
      head.style.pointerEvents = 'none';
      var below = null;
      try { below = document.elementFromPoint(e.clientX, e.clientY); } catch (err) { }
      head.style.pointerEvents = prev;
      if (!below || head.contains(below)) return;
      var WE = window.WheelEvent;
      if (typeof WE !== 'function') return;
      try {
        var clone = new WE('wheel', {
          bubbles: true,
          cancelable: true,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey
        });
        clone.__agnativeForwardedWheel = true;
        below.dispatchEvent(clone);
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      } catch (err) { }
    }

    function attachTopnavWheelForwarding() {
      var head = qs('.head');
      if (!head || head.__agnativeWheelBound) return;
      head.__agnativeWheelBound = true;
      head.addEventListener('wheel', forwardWheelBelowTopnav, { passive: false });
    }

    function neutralizeMenuController() {
      if (menuControllerNeutralized) return;
      if (!window.Lampa || !Lampa.Controller || typeof Lampa.Controller.add !== 'function') return;
      menuControllerNeutralized = true;
      try {
        Lampa.Controller.add('menu', {
          toggle: function () {
            try { Lampa.Controller.toggle('agnative_leftdock'); } catch (e) { }
          },
          update: function () { },
          left:  function () { try { Lampa.Controller.toggle('agnative_leftdock'); } catch (e) { } },
          right: function () { try { Lampa.Controller.toggle('content'); }          catch (e) { } },
          up:    function () { try { Lampa.Controller.toggle('agnative_leftdock'); } catch (e) { } },
          down:  function () { try { Lampa.Controller.toggle('content'); }          catch (e) { } },
          back:  function () { try { Lampa.Controller.toggle('content'); }          catch (e) { } }
        });
      } catch (e) {
        menuControllerNeutralized = false;
      }
    }

    function patchActivityPushForMenu() {
      if (activityPushPatched) return;
      if (!window.Lampa || !Lampa.Activity || typeof Lampa.Activity.push !== 'function') return;
      activityPushPatched = true;
      try {
        activityPushOriginal = Lampa.Activity.push.bind(Lampa.Activity);
        Lampa.Activity.push = function (params) {
          if (params && params.component === 'menu') {
            try { Lampa.Controller.toggle('agnative_leftdock'); } catch (e) { }
            return;
          }
          return activityPushOriginal(params);
        };
      } catch (e) {
        activityPushPatched = false;
        activityPushOriginal = null;
      }
    }

    function registerTopnavController(shell) {
      if (!shell || !window.Lampa || !Lampa.Controller || !window.$) return;
      if (topnavControllerReady || typeof Lampa.Controller.add !== 'function') return;
      topnavControllerReady = true;
      try {
        Lampa.Controller.add('head', {
          toggle: function () {
            var headEl = qs('.head__body') || qs('.head');
            if (!headEl) return;
            var view = $(headEl);
            var firstItem = qs('.agnative-topnav-shell__item.selector', headEl)
              || qs('.agnative-topnav-shell .selector', headEl)
              || qs('.selector', headEl);
            Lampa.Controller.collectionSet(view);
            Lampa.Controller.collectionFocus(firstItem || false, view, true);
          },
          update: function () { },
          left: function () {
            if (window.Navigator && Navigator.canmove && !Navigator.canmove('left')) {
              try { Lampa.Controller.toggle('agnative_leftdock'); } catch (e) { }
              return;
            }
            if (window.Navigator && Navigator.move) Navigator.move('left');
          },
          right: function () {
            if (window.Navigator && Navigator.move) Navigator.move('right');
          },
          up: function () { },
          down: function () {
            if (window.Navigator && Navigator.canmove && Navigator.canmove('down')) {
              Navigator.move('down');
              return;
            }
            try { Lampa.Controller.toggle('content'); } catch (e) { }
          },
          back: function () {
            try { Lampa.Controller.toggle('agnative_leftdock'); } catch (e) { }
          }
        });
      } catch (e) {
        topnavControllerReady = false;
      }
    }

    function showLeftdock() {
      var dock = qs('.agnative-leftdock');
      if (!dock) return;
      dock.classList.add('is-visible');
      if (leftdockHoverHideTimer) {
        clearTimeout(leftdockHoverHideTimer);
        leftdockHoverHideTimer = 0;
      }
    }

    function hideLeftdock(immediate, force) {
      var dock = qs('.agnative-leftdock');
      if (!dock) return;
      if (!force && window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function') {
        var enabled = Lampa.Controller.enabled();
        if (enabled && enabled.name === 'agnative_leftdock') return;
      }
      if (immediate) {
        if (leftdockHoverHideTimer) {
          clearTimeout(leftdockHoverHideTimer);
          leftdockHoverHideTimer = 0;
        }
        dock.classList.remove('is-visible');
        return;
      }
      if (leftdockHoverHideTimer) clearTimeout(leftdockHoverHideTimer);
      leftdockHoverHideTimer = setTimeout(function () {
        dock.classList.remove('is-visible');
        leftdockHoverHideTimer = 0;
      }, 220);
    }

    function scrollSettingsItemIntoView(item, scroller) {
      if (!item || !scroller) return;
      var scrollerRect = scroller.getBoundingClientRect();
      var itemRect = item.getBoundingClientRect();
      var pad = 18;
      if (itemRect.top < scrollerRect.top + pad) {
        scroller.scrollTop -= (scrollerRect.top + pad - itemRect.top);
      } else if (itemRect.bottom > scrollerRect.bottom - pad) {
        scroller.scrollTop += (itemRect.bottom - (scrollerRect.bottom - pad));
      }
    }

    function watchSettingsLifecycle() {
      if (settingsLifecycleObserver || typeof MutationObserver !== 'function' || !document.body) return;

      var attachInner = function () {
        var sb = qs('.settings__body');
        if (!sb || sb.__agnativeSettingsScrollObserver) return;
        var inner = new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
            var t = m.target;
            if (!t || !t.classList || !t.classList.contains('focus')) continue;
            scrollSettingsItemIntoView(t, sb);
          }
        });
        inner.observe(sb, {
          attributes: true,
          attributeFilter: ['class'],
          subtree: true
        });
        sb.__agnativeSettingsScrollObserver = inner;
      };

      var detachInner = function () {
        var sb = qs('.settings__body');
        if (sb && sb.__agnativeSettingsScrollObserver) {
          sb.__agnativeSettingsScrollObserver.disconnect();
          sb.__agnativeSettingsScrollObserver = null;
        }
      };

      settingsLifecycleObserver = new MutationObserver(function () {
        if (document.body.classList.contains('settings--open')) {
          setTimeout(attachInner, 80);
        } else {
          detachInner();
        }
      });
      settingsLifecycleObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    function disconnectSettingsLifecycle() {
      if (settingsLifecycleObserver) {
        settingsLifecycleObserver.disconnect();
        settingsLifecycleObserver = null;
      }
      var sb = qs('.settings__body');
      if (sb && sb.__agnativeSettingsScrollObserver) {
        sb.__agnativeSettingsScrollObserver.disconnect();
        sb.__agnativeSettingsScrollObserver = null;
      }
    }

    function observeMenuChanges() {
      var menuList = qs('.menu .menu__list');
      if (!menuList) return;
      if (menuListObservedNode === menuList && menuChangesObserver) return;
      if (menuChangesObserver) {
        menuChangesObserver.disconnect();
        menuChangesObserver = null;
      }
      menuListObservedNode = menuList;
      if (typeof MutationObserver !== 'function') return;
      menuChangesObserver = new MutationObserver(function () {
        if (menuRebuildTimer) clearTimeout(menuRebuildTimer);
        menuRebuildTimer = setTimeout(function () {
          menuRebuildTimer = 0;
          buildLeftdock();
          syncLeftdockActive();
        }, 80);
      });
      menuChangesObserver.observe(menuList, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    function disconnectMenuObserver() {
      if (menuChangesObserver) {
        menuChangesObserver.disconnect();
        menuChangesObserver = null;
      }
      menuListObservedNode = null;
      if (menuRebuildTimer) {
        clearTimeout(menuRebuildTimer);
        menuRebuildTimer = 0;
      }
    }

    function heroReadyForRouting() {
      if (!window.__AGNATIVE_HERO_CONTROLLER__) return false;
      if (!document.body || !document.body.classList.contains('agnative-has-hero')) return false;
      return !!document.querySelector('.agnative-hero');
    }

    function patchControllerToggleForLeftdock() {
      if (controllerTogglePatched) return;
      if (!window.Lampa || !Lampa.Controller || typeof Lampa.Controller.toggle !== 'function') return;
      controllerTogglePatched = true;
      try {
        controllerToggleOriginal = Lampa.Controller.toggle.bind(Lampa.Controller);
        Lampa.Controller.toggle = function (name) {
          if (name && name !== 'agnative_leftdock') hideLeftdock(true, true);
          try {
            if (name && heroReadyForRouting()) {
              var enabled = Lampa.Controller.enabled && Lampa.Controller.enabled();
              var current = enabled && enabled.name;
              if (name === 'head' && (current === 'items_line' || current === 'content')) {
                name = 'agnative_hero';
              } else if (name === 'content' && current === 'head') {
                name = 'agnative_hero';
              }
            }
          } catch (err) { }
          return controllerToggleOriginal(name);
        };
      } catch (e) {
        controllerTogglePatched = false;
        controllerToggleOriginal = null;
      }
    }

    function bindHeadMenuIconClick() {
      var btn = qs('.head__menu-icon');
      if (!btn || btn.__agnativeMenuIconBound) return;
      btn.__agnativeMenuIconBound = true;

      var lastTrigger = 0;
      var trigger = function (e) {
        var now = Date.now();
        if (now - lastTrigger < 250) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
          return;
        }
        lastTrigger = now;
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        try {
          var enabled = (Lampa.Controller.enabled && Lampa.Controller.enabled()) || null;
          if (enabled && enabled.name === 'agnative_leftdock') {
            Lampa.Controller.toggle('content');
          } else {
            Lampa.Controller.toggle('agnative_leftdock');
          }
        } catch (err) { }
      };

      var swallow = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
      };

      btn.addEventListener('pointerup', trigger, true);
      btn.addEventListener('click', trigger, true);
      btn.addEventListener('touchstart', swallow, { capture: true, passive: true });
      btn.addEventListener('touchend', swallow, { capture: true, passive: true });
      btn.addEventListener('mousedown', swallow, true);
    }

    function buildLeftdock() {
      if (!document.body) return null;
      var dock = qs('.agnative-leftdock');
      if (!dock) {
        dock = document.createElement('div');
        dock.className = 'agnative-leftdock';
        document.body.appendChild(dock);
      }

      var sourceMenu = qs('.menu');
      if (!sourceMenu) return dock;

      var inner = document.createElement('div');
      inner.className = 'agnative-leftdock__inner';

      Array.prototype.slice.call(sourceMenu.children).forEach(function (child) {
        if (!child || !child.classList) return;
        if (child.classList.contains('menu__case')) {
          var caseEl = document.createElement('div');
          caseEl.className = 'agnative-leftdock__case';
          qsa('.menu__item.selector', child).forEach(function (item) {
            if (item.classList.contains('hidden')) return;
            var _a = item.getAttribute('data-action');
            var _ln = qs('.menu__text, .menu__item-name, .menu__item-text', item);
            var _l = String(_ln ? _ln.textContent : item.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (['feed','subscribe','subscriptions','subscription','notice','schedule','console','torrent','torrents'].indexOf(_a) !== -1) return;
            if (['стрічка','лента','feed','підписки','подписки','subscriptions','розклад','расписание','schedule','торренти','торренты','torrents','torrent'].indexOf(_l) !== -1) return;
            var btn = document.createElement('div');
            btn.className = 'agnative-leftdock__item selector';
            btn.setAttribute('data-selector', 'true');
            btn.setAttribute('tabindex', '0');
            var action = item.getAttribute('data-action');
            if (action) btn.setAttribute('data-action', action);
            btn.innerHTML = item.innerHTML;
            var labelNode = qs('.menu__text, .menu__item-name, .menu__item-text', btn);
            var label = labelNode ? (labelNode.textContent || '').trim() : '';
            var icoEl = qs('.menu__ico', btn);
            if (icoEl) {
              icoEl.innerHTML = pickLeftdockIcon(action, label || action);
            }
            (function (sourceItem) {
              bindAction(btn, function () { triggerSelectorEnter(sourceItem); });
            })(item);
            caseEl.appendChild(btn);
          });
          if (caseEl.children.length) inner.appendChild(caseEl);
        } else if (child.classList.contains('menu__split')) {
          var split = document.createElement('div');
          split.className = 'agnative-leftdock__split';
          inner.appendChild(split);
        }
      });

      dock.innerHTML = '';
      dock.appendChild(inner);

      registerLeftdockController(dock);
      bindLeftdockAutoScroll(dock);
      syncLeftdockActive();
      return dock;
    }

    function scrollLeftdockItemIntoView(item, dock) {
      if (!item || !dock) return;
      var dockRect = dock.getBoundingClientRect();
      var itemRect = item.getBoundingClientRect();
      var pad = 6;
      if (itemRect.top < dockRect.top + pad) {
        dock.scrollTop -= (dockRect.top + pad - itemRect.top);
      } else if (itemRect.bottom > dockRect.bottom - pad) {
        dock.scrollTop += (itemRect.bottom - (dockRect.bottom - pad));
      }
    }

    function bindLeftdockAutoScroll(dock) {
      if (!dock || dock.__agnativeAutoScrollObserver || typeof MutationObserver !== 'function') return;
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
          var target = m.target;
          if (!target || !target.classList) continue;
          if (!target.classList.contains('agnative-leftdock__item')) continue;
          if (!target.classList.contains('focus')) continue;
          scrollLeftdockItemIntoView(target, dock);
        }
      });
      observer.observe(dock, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: true
      });
      dock.__agnativeAutoScrollObserver = observer;
    }

    function syncLeftdockActive() {
      var dock = qs('.agnative-leftdock');
      if (!dock) return;
      qsa('.agnative-leftdock__item[data-action]', dock).forEach(function (btn) {
        btn.classList.remove('is-active');
        var source = getMenuItem(btn.getAttribute('data-action'));
        if (source && (source.classList.contains('active') || source.classList.contains('focus') || source.classList.contains('hover'))) {
          btn.classList.add('is-active');
        }
      });
    }

    function registerLeftdockController(dock) {
      if (leftdockControllerReady) return;
      if (!dock || !window.Lampa || !Lampa.Controller || typeof Lampa.Controller.add !== 'function' || !window.$) return;
      leftdockControllerReady = true;
      try {
        Lampa.Controller.add('agnative_leftdock', {
          toggle: function () {
            var d = qs('.agnative-leftdock');
            if (!d) return;
            showLeftdock();
            var view = $(d);
            var current = qs('.agnative-leftdock__item.is-active', d)
              || qs('.agnative-leftdock__item.selector', d);
            Lampa.Controller.collectionSet(view);
            Lampa.Controller.collectionFocus(current || false, view, true);
          },
          update: function () { },
          gone: function () {
            hideLeftdock(true, true);
          },
          up: function () {
            if (window.Navigator && Navigator.move) Navigator.move('up');
          },
          down: function () {
            if (window.Navigator && Navigator.move) Navigator.move('down');
          },
          left: function () { },
          right: function () {
            try { Lampa.Controller.toggle('content'); } catch (e) { }
          },
          back: function () {
            try { Lampa.Controller.toggle('content'); } catch (e) { }
          }
        });
      } catch (e) {
        leftdockControllerReady = false;
      }
    }

    function ensureRightDock(head) {
      if (!head) return null;
      var dock = qs('.agnative-topnav-rightdock', head);
      if (!dock) {
        dock = document.createElement('div');
        dock.className = 'agnative-topnav-rightdock';
        head.appendChild(dock);
      }
      return dock;
    }

    function ensureClock(head) {
      if (!head) return null;
      var dock = ensureRightDock(head) || head;
      var clock = qs('#' + CLOCK_ID, dock) || qs('#' + CLOCK_ID, head);
      if (!clock) {
        clock = document.createElement('div');
        clock.id = CLOCK_ID;
        clock.className = 'agnative-topnav-clock selector';
        clock.setAttribute('data-selector', 'true');
        clock.setAttribute('tabindex', '0');
        bindAction(clock, function () { triggerClockActions(head); });
      }
      if (clock.parentNode !== dock) dock.appendChild(clock);
      return clock;
    }

    function ensureProfileButton(head) {
      if (!head) return null;
      var dock = ensureRightDock(head) || head;
      var profileBtn = qs('.agnative-topnav-right__profile[data-role="profile"]', dock) || qs('.agnative-topnav-right__profile[data-role="profile"]', head);
      if (!profileBtn) {
        profileBtn = document.createElement('div');
        profileBtn.className = 'agnative-topnav-shell__item agnative-topnav-right__profile selector';
        profileBtn.setAttribute('data-role', 'profile');
        profileBtn.setAttribute('data-selector', 'true');
        profileBtn.setAttribute('tabindex', '0');
        bindAction(profileBtn, triggerProfile);
      }
      profileBtn.innerHTML = getProfileButtonHtml();
      if (profileBtn.parentNode !== dock) dock.appendChild(profileBtn);
      return profileBtn;
    }

    function updateClock() {
      var clock = document.getElementById(CLOCK_ID);
      if (!clock) return;
      var d = new Date();
      var text = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      if (clockSecondsEnabled()) text += ':' + String(d.getSeconds()).padStart(2, '0');
      clock.textContent = text;
    }

    function startClock() {
      updateClock();
      if (clockTimer) return;
      var period = clockSecondsEnabled() ? 1000 : 1000 * 20;
      clockTimer = setInterval(updateClock, period);
    }

    function restartClock() {
      if (clockTimer) {
        clearInterval(clockTimer);
        clockTimer = null;
      }
      startClock();
    }

    function topnavEnabled() {
      try { return window.Lampa && Lampa.Storage.get(TOPNAV_ENABLE_KEY, 'on') !== 'off'; } catch (e) { return true; }
    }

    function getTopnavIconsOrder() {
      var v = 'end';
      try { v = Lampa.Storage.get(TOPNAV_ICONS_ORDER_KEY, 'end'); } catch (e) { }
      if (v !== 'start' && v !== 'split') v = 'end';
      return v;
    }

    function syncTopnavSize() {
      if (!document.body) return;
      var size = 'md';
      try { size = Lampa.Storage.get(TOPNAV_SIZE_KEY, 'md'); } catch (e) { }
      if (!/^(xs|sm|md|lg|xl)$/.test(size)) size = 'md';
      document.body.setAttribute(TOPNAV_SIZE_ATTR, size);
    }

    function removeTopnavUi() {
      try {
        var shell = document.querySelector('.agnative-topnav-shell');
        if (shell) shell.remove();
        var dock = document.querySelector('.agnative-topnav-rightdock');
        if (dock) dock.remove();
        var clock = document.getElementById(CLOCK_ID);
        if (clock) clock.remove();
        var panel = document.querySelector('.agnative-control-panel');
        if (panel) panel.remove();
      } catch (e) { }
    }

    function patchTopnav() {
      // Snack TV draws its own header; only the burger is hooked up to the left menu here.
      removeTopnavUi();
      bindHeadMenuIconClick();
      return false;
      if (!topnavEnabled()) { removeTopnavUi(); return false; }
      var head = qs('.head__body') || qs('.head');
      if (!head) return false;

      attachTopnavWheelForwarding();
      bindHeadMenuIconClick();
      ensureClock(head);
      ensureProfileButton(head);
      startClock();

      var shell = qs('.agnative-topnav-shell', head);
      if (!shell) {
        shell = document.createElement('div');
        shell.className = 'agnative-topnav-shell';
        shell.innerHTML = '<div class="agnative-topnav-shell__inner"><div class="agnative-topnav-shell__items"></div><div class="agnative-topnav-shell__right"></div></div>';
      }
      if (shell.parentNode !== head || head.firstChild !== shell) {
        head.insertBefore(shell, head.firstChild);
      }

      var itemsWrap = qs('.agnative-topnav-shell__items', shell);
      var rightWrap = qs('.agnative-topnav-shell__right', shell);
      if (!itemsWrap || !rightWrap) return false;

      itemsWrap.innerHTML = '';
      rightWrap.innerHTML = '';

      getSelectedTopnavItems().forEach(function (def) {
        var sourceNode = getMenuItem(def.action);
        var btn = document.createElement('div');
        btn.className = 'agnative-topnav-shell__item selector';
        btn.setAttribute('data-action', def.action);
        btn.setAttribute('data-selector', 'true');
        btn.setAttribute('tabindex', '0');
        btn.textContent = def.label;
        bindMenu(btn, def.action, sourceNode);
        itemsWrap.appendChild(btn);
      });

      function buildIconButton(def) {
        var btn = document.createElement('div');
        btn.className = 'agnative-topnav-shell__item agnative-topnav-shell__item--icon selector';
        btn.setAttribute('data-role', def.role);
        btn.setAttribute('data-selector', 'true');
        btn.setAttribute('tabindex', '0');
        btn.innerHTML = def.svg;
        bindAction(btn, def.handler);
        return btn;
      }

      var searchDef = { role: 'search', svg: iconSearch(), handler: triggerSearch };
      var favoriteDef = { role: 'favorite', svg: iconFavorite(), handler: triggerFavorite };

      var order = getTopnavIconsOrder();
      var startDefs = [];
      var endDefs = [];
      if (order === 'start') {
        startDefs = [searchDef, favoriteDef];
      } else if (order === 'split') {
        startDefs = [searchDef];
        endDefs = [favoriteDef];
      } else {
        endDefs = [searchDef, favoriteDef];
      }
      // Settings icon (shown only when the clock control panel is off) always stays at the end.
      if (!controlPanelEnabled()) {
        endDefs.push({ role: 'settings', svg: iconSettings(), handler: triggerSettings });
      }

      var firstMenu = itemsWrap.firstChild;
      startDefs.forEach(function (def) {
        itemsWrap.insertBefore(buildIconButton(def), firstMenu);
      });
      endDefs.forEach(function (def) {
        rightWrap.appendChild(buildIconButton(def));
      });

      registerTopnavController(shell);

      qsa('.agnative-topnav-shell__item[data-action]', shell).forEach(function (btn) {
        btn.classList.remove('is-active');
        var source = getMenuItem(btn.getAttribute('data-action'));
        if (source && (source.classList.contains('active') || source.classList.contains('focus') || source.classList.contains('hover'))) {
          btn.classList.add('is-active');
        }
      });

      return true;
    }

    function pickImdbTrailerKeys(videos) {
      if (!videos || !videos.length) return [];
      var trailers = [];
      var promos = [];
      for (var i = 0; i < videos.length; i++) {
        var v = videos[i];
        if (!v || !v.id) continue;
        var t = (v.type || '').toLowerCase();
        if (t === 'trailer') trailers.push(v.id);
        else if (t === 'promotional' || t === 'promo') promos.push(v.id);
      }
      var out = [];
      var seen = {};
      function add(arr) {
        for (var j = 0; j < arr.length; j++) {
          if (!seen[arr[j]]) { seen[arr[j]] = 1; out.push(arr[j]); }
        }
      }
      add(trailers); add(promos);
      return out;
    }

    function fetchJsonWithTimeout(url, ms) {
      try {
        if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
        if (typeof AbortController === 'undefined') {
          return fetch(url).then(function (r) { return r.json(); });
        }
        var ctrl = new AbortController();
        var to = setTimeout(function () { try { ctrl.abort(); } catch (e) { } }, ms);
        function done() { clearTimeout(to); }
        return fetch(url, { signal: ctrl.signal })
          .then(function (r) { return r.json(); })
          .then(function (data) { done(); return data; }, function (err) { done(); throw err; });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    function fetchImdbVideos(imdbId, callback) {
      if (!imdbId) return callback([]);
      var cacheKey = 'imdb_videos_v2/' + imdbId;
      if (cacheKey in heroTrailerCache) return callback(heroTrailerCache[cacheKey]);
      if (heroTrailerPending[cacheKey]) { heroTrailerPending[cacheKey].push(callback); return; }
      heroTrailerPending[cacheKey] = [callback];

      function finish(keys, persist) {
        var val = (keys && keys.length) ? keys : [];
        heroTrailerCache[cacheKey] = val;
        if (persist) { try { metaSet(cacheKey, val); } catch (e) {} }
        var cbs = heroTrailerPending[cacheKey] || [];
        delete heroTrailerPending[cacheKey];
        for (var i = 0; i < cbs.length; i++) {
          try { cbs[i](val); } catch (e) {}
        }
      }

      metaGet(cacheKey, function (persisted) {
        if (persisted !== undefined) {
          var arr = Array.isArray(persisted) ? persisted : [];
          heroTrailerCache[cacheKey] = arr;
          var cbs = heroTrailerPending[cacheKey] || [];
          delete heroTrailerPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) {
            try { cbs[i](arr); } catch (e) {}
          }
          return;
        }
        var url = HERO_IMDB_API_BASE + '/titles/' + encodeURIComponent(imdbId) + '/videos?pageSize=50&types=trailer&types=promotional';
        fetchJsonWithTimeout(url, 9000).then(function (data) {
          if (data && data.error) { finish([], false); return; }
          finish(pickImdbTrailerKeys(data && data.videos), true);
        }, function () {
          var fallback = HERO_IMDB_API_BASE + '/titles/' + encodeURIComponent(imdbId) + '/videos?pageSize=50';
          fetchJsonWithTimeout(fallback, 9000).then(function (d2) {
            finish(pickImdbTrailerKeys(d2 && d2.videos), true);
          }, function () { finish([], false); });
        });
      });
    }

    function fetchHeroTrailer(tmdbId, type, callback, sourceItem) {
      if (!tmdbId) return callback([]);
      if (heroVideoCooldown) return callback([]);

      resolveImdbId(tmdbId, type, function (imdbId) {
        if (!imdbId) return callback([]);

        var resolved = heroReadResolvedTrailer(imdbId);
        if (resolved && resolved.key) {
          fetchImdbVideos(imdbId, function (all) {
            var queue = [resolved.key];
            for (var i = 0; i < all.length; i++) if (all[i] !== resolved.key) queue.push(all[i]);
            callback(queue);
          });
          return;
        }
        fetchImdbVideos(imdbId, callback);
      }, sourceItem);
    }

    function fetchLogo(id, type, callback) {
      if (!id) return callback(null);
      var lang = getLogoLang();
      var cacheKey = type + '/' + id + '/' + lang;

      if (cacheKey in logoCache) return callback(logoCache[cacheKey]);

      if (logoPending[cacheKey]) {
        logoPending[cacheKey].push(callback);
        return;
      }

      logoPending[cacheKey] = [callback];

      metaGet(cacheKey, function (persisted) {
        if (persisted !== undefined) {
          logoCache[cacheKey] = persisted;
          var cbs = logoPending[cacheKey] || [];
          delete logoPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](persisted);
          return;
        }

        var langs = [lang];
        if (lang !== 'en') langs.push('en');
        langs.push('ja');   // anime often has its logo only in Japanese
        langs.push('null');

        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
          '/images?api_key=' + TMDB_KEY + '&include_image_language=' + langs.join(',');

        fetch(url).then(function (r) { return r.json(); }).then(function (data) {
          var logo = null;
          if (data.logos && data.logos.length) {
            var preferred = data.logos.filter(function (l) { return l.iso_639_1 === lang; });
            var english = data.logos.filter(function (l) { return l.iso_639_1 === 'en'; });
            var unlang = data.logos.filter(function (l) { return !l.iso_639_1; });
            var picked = preferred[0] || english[0] || unlang[0] || data.logos[0];
            if (picked && picked.file_path) {
              logo = {
                path: picked.file_path,
                width: picked.width,
                height: picked.height,
                iso_639_1: picked.iso_639_1 || null
              };
            }
          }
          logoCache[cacheKey] = logo;
          metaSet(cacheKey, logo);
          if (logo) imgPreload(logoImgUrl(logo.path));
          var cbs = logoPending[cacheKey] || [];
          delete logoPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](logo);
        }).catch(function () {
          logoCache[cacheKey] = null;
          var cbs = logoPending[cacheKey] || [];
          delete logoPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](null);
        });
      });
    }

    function logoImgUrl(logoPath) {
      return Lampa.TMDB.image('t/p/w300' + logoPath);
    }

    function fetchTitledBackdrop(id, type, callback) {
      if (!id) return callback(null);
      var lang = getLogoLang();
      var cacheKey = 'titled_backdrop/' + type + '/' + id + '/' + lang;

      if (cacheKey in titledBackdropCache) return callback(titledBackdropCache[cacheKey]);

      if (titledBackdropPending[cacheKey]) {
        titledBackdropPending[cacheKey].push(callback);
        return;
      }
      titledBackdropPending[cacheKey] = [callback];

      metaGet(cacheKey, function (persisted) {
        if (persisted !== undefined) {
          titledBackdropCache[cacheKey] = persisted;
          var cbs = titledBackdropPending[cacheKey] || [];
          delete titledBackdropPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](persisted);
          return;
        }

        var langs = [lang];
        if (lang !== 'en') langs.push('en');

        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
          '/images?api_key=' + TMDB_KEY + '&include_image_language=' + langs.join(',');

        fetch(url).then(function (r) { return r.json(); }).then(function (data) {
          var path = null;
          if (data.backdrops && data.backdrops.length) {
            var preferred = data.backdrops.filter(function (b) { return b.iso_639_1 === lang; });
            var english = data.backdrops.filter(function (b) { return b.iso_639_1 === 'en'; });
            var candidates = preferred.length ? preferred : english;
            if (candidates.length) {
              candidates.sort(function (a, b) { return (b.vote_average || 0) - (a.vote_average || 0); });
              path = candidates[0].file_path;
            }
          }
          titledBackdropCache[cacheKey] = path;
          metaSet(cacheKey, path);
          if (path) imgPreload(Lampa.TMDB.image('t/p/' + getBackdropQuality() + path));
          var cbs = titledBackdropPending[cacheKey] || [];
          delete titledBackdropPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](path);
        }).catch(function () {
          titledBackdropCache[cacheKey] = null;
          var cbs = titledBackdropPending[cacheKey] || [];
          delete titledBackdropPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](null);
        });
      });
    }

    function fetchCleanPoster(id, type, callback) {
      var cacheKey = 'poster/' + type + '/' + id;
      if (cacheKey in posterCache) return callback(posterCache[cacheKey]);

      if (posterPending[cacheKey]) { posterPending[cacheKey].push(callback); return; }
      posterPending[cacheKey] = [callback];

      metaGet(cacheKey, function (persisted) {
        if (persisted !== undefined) {
          posterCache[cacheKey] = persisted;
          var cbs = posterPending[cacheKey] || [];
          delete posterPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](persisted);
          return;
        }

        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
          '/images?api_key=' + TMDB_KEY + '&include_image_language=null';

        fetch(url).then(function (r) { return r.json(); }).then(function (data) {
          var path = null;
          if (data.posters && data.posters.length) {
            var neutrals = data.posters.filter(function (p) { return !p.iso_639_1; });
            var picked = neutrals[0] || data.posters[0];
            if (picked && picked.file_path) path = picked.file_path;
          }
          posterCache[cacheKey] = path;
          metaSet(cacheKey, path);
          if (path) imgPreload(Lampa.TMDB.image('t/p/' + getPosterQuality() + path));
          var cbs = posterPending[cacheKey] || [];
          delete posterPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](path);
        }).catch(function () {
          posterCache[cacheKey] = null;
          var cbs = posterPending[cacheKey] || [];
          delete posterPending[cacheKey];
          for (var i = 0; i < cbs.length; i++) cbs[i](null);
        });
      });
    }

    function isSursButtonCard(cardEl) {
      if (!cardEl || !cardEl.classList) return false;
      return cardEl.classList.contains('card--button-compact') ||
             cardEl.classList.contains('streaming-card--button-compact') ||
             cardEl.classList.contains('card--genre-compact');
    }

    function switchCardToBackdrop(cardEl) {
      if (cardEl.getAttribute('data-nfx-switched')) return;
      if (isSursButtonCard(cardEl)) {
        cardEl.setAttribute('data-nfx-switched', 'surs');
        return;
      }
      cardEl.setAttribute('data-nfx-switched', '1');

      var data = extractCardData(cardEl);
      if (!data) return;

      var perfLevel = resolvePerfLevel();
      var isUltra = perfLevel === 'ultra';
      var cardImageMode = getCardImageMode();

      var imgEl = cardEl.querySelector('.card__img');
      var useHorizontal = backdropEnabled();

      function setImgUrl(url) {
        if (!imgEl) return;
        if (imgEl.tagName === 'IMG') {
          imgLoad(url, function (src) {
            imgEl.onload = function () { if (src !== url) URL.revokeObjectURL(src); };
            imgEl.onerror = function () { if (src !== url) URL.revokeObjectURL(src); };
            imgEl.src = src;
            imgEl.style.objectFit = 'cover';
            imgEl.style.objectPosition = 'center';
          });
        } else {
          imgLoad(url, function (src) {
            var prev = imgEl.getAttribute('data-nfx-blob');
            if (prev) URL.revokeObjectURL(prev);
            if (src !== url) imgEl.setAttribute('data-nfx-blob', src);
            imgEl.style.backgroundImage = 'url(' + src + ')';
            imgEl.style.backgroundSize = 'cover';
            imgEl.style.backgroundPosition = 'center';
          });
        }
      }

      if (imgEl && cardImageMode === 'backdrop') {
        if (imgEl.tagName === 'IMG') {
          if (!imgEl.hasAttribute('data-nfx-original-src')) {
            imgEl.setAttribute('data-nfx-original-src', imgEl.getAttribute('src') || '');
          }
        } else if (!imgEl.hasAttribute('data-nfx-original-bg')) {
          imgEl.setAttribute('data-nfx-original-bg', imgEl.style.backgroundImage || '');
        }
        if (useHorizontal) {
          if (data.backdrop_path) {
            setImgUrl(Lampa.TMDB.image('t/p/' + getBackdropQuality() + data.backdrop_path));
          }
        } else {
          var bTmdbType = data.name ? 'tv' : 'movie';
          if (data.poster_path) {
            setImgUrl(Lampa.TMDB.image('t/p/' + getPosterQuality() + data.poster_path));
          }
          if (data.id) {
            fetchCleanPoster(data.id, bTmdbType, function (cleanPath) {
              if (cleanPath) {
                setImgUrl(Lampa.TMDB.image('t/p/' + getPosterQuality() + cleanPath));
              } else if (data.backdrop_path) {
                setImgUrl(Lampa.TMDB.image('t/p/' + getBackdropQuality() + data.backdrop_path));
              }
            });
          } else if (data.backdrop_path) {
            setImgUrl(Lampa.TMDB.image('t/p/' + getBackdropQuality() + data.backdrop_path));
          }
        }
      }

      if (cardImageMode === 'poster') {
        if (imgEl) {
          if (imgEl.tagName === 'IMG') {
            if (!imgEl.hasAttribute('data-nfx-original-src')) {
              imgEl.setAttribute('data-nfx-original-src', imgEl.getAttribute('src') || '');
            }
          } else if (!imgEl.hasAttribute('data-nfx-original-bg')) {
            imgEl.setAttribute('data-nfx-original-bg', imgEl.style.backgroundImage || '');
          }
        }

        var pTmdbType = data.name ? 'tv' : 'movie';
        var pView = cardEl.querySelector('.card__view');
        var pVote = data.vote_average ? parseFloat(data.vote_average) : 0;
        var pYear = '';
        if (data.release_date) pYear = data.release_date.substring(0, 4);
        else if (data.first_air_date) pYear = data.first_air_date.substring(0, 4);
        var pGenreNames = getGenreNames(data);
        var pMetaLeft = [];
        if (pVote > 0) pMetaLeft.push('<span class="nfx-card-overlay__match">' + Math.round(pVote * 10) + '%</span>');
        if (pYear) pMetaLeft.push('<span>' + pYear + '</span>');
        var pMetaParts = [];
        if (pMetaLeft.length) pMetaParts.push(pMetaLeft.join(' '));
        if (pGenreNames.length) pMetaParts.push('<span>' + escapeHtml(pGenreNames.slice(0, 2).join(', ')) + '</span>');
        var pMetaHtml = pMetaParts.length ? '<div class="nfx-card-overlay__meta">' + pMetaParts.join('<span style="opacity:0.4"> · </span>') + '</div>' : '';

        function buildPosterOverlay() {
          if (!pView || pView.querySelector('.nfx-card-overlay')) return;
          var pLocalLang = getLogoLang();
          var pTitleText = data.title || data.name || '';
          var pPosterNonLocal = pTitleText && pLocalLang !== 'en' && data.original_language && data.original_language !== pLocalLang;
          var pTitleHtml = (logoTitleEnabled() && pPosterNonLocal) ? '<div class="nfx-card-overlay__local-title">' + escapeHtml(pTitleText) + '</div>' : '';
          if (pTitleHtml || pMetaHtml) {
            var pOverlay = document.createElement('div');
            pOverlay.className = 'nfx-card-overlay';
            pOverlay.innerHTML = pTitleHtml + pMetaHtml;
            pView.appendChild(pOverlay);
          }
          if (badgeEnabled() && (data.title || data.name)) {
            var pBadge = document.createElement('div');
            pBadge.className = 'nfx-card-logo';
            pBadge.textContent = data.name ? t('badge_tv') : t('badge_movie');
            pView.appendChild(pBadge);
          }
          if (ratingEnabled() && pVote > 0) {
            var pRating = document.createElement('div');
            pRating.className = 'nfx-card-rating';
            pRating.setAttribute('data-score', Math.min(10, Math.max(1, Math.round(pVote))));
            pRating.textContent = pVote.toFixed(1);
            pView.appendChild(pRating);
          }
        }

        if (useHorizontal && data.id && !isUltra) {
          if (data.poster_path) setImgUrl(Lampa.TMDB.image('t/p/' + getPosterQuality() + data.poster_path));
          fetchTitledBackdrop(data.id, pTmdbType, function (titledPath) {
            if (titledPath) {
              setImgUrl(Lampa.TMDB.image('t/p/' + getBackdropQuality() + titledPath));
            }
            buildPosterOverlay();
          });
        } else {
          if (data.poster_path) setImgUrl(Lampa.TMDB.image('t/p/' + getPosterQuality() + data.poster_path));
          buildPosterOverlay();
        }
        return;
      }

      var view = cardEl.querySelector('.card__view');
      if (!view || view.querySelector('.nfx-card-overlay')) return;

      var title = data.title || data.name || '';
      if (!title) {
        var titleEl = cardEl.querySelector('.card__title');
        if (titleEl) title = titleEl.textContent.trim();
      }

      var vote = data.vote_average ? parseFloat(data.vote_average) : 0;
      var year = '';
      if (data.release_date) year = data.release_date.substring(0, 4);
      else if (data.first_air_date) year = data.first_air_date.substring(0, 4);

      var overlay = document.createElement('div');
      overlay.className = 'nfx-card-overlay';

      var metaLeft = [];
      if (vote > 0) metaLeft.push('<span class="nfx-card-overlay__match">' + Math.round(vote * 10) + '%</span>');
      if (year) metaLeft.push('<span>' + year + '</span>');
      var genreNames = getGenreNames(data);
      var metaParts = [];
      if (metaLeft.length) metaParts.push(metaLeft.join(' '));
      if (genreNames.length) metaParts.push('<span>' + escapeHtml(genreNames.slice(0, 2).join(', ')) + '</span>');
      var metaHtml = metaParts.length ? '<div class="nfx-card-overlay__meta">' + metaParts.join('<span style="opacity:0.4"> · </span>') + '</div>' : '';

      var titleHtml = title ? '<div class="nfx-card-overlay__title">' + escapeHtml(title) + '</div>' : '';
      overlay.innerHTML = titleHtml + metaHtml;
      view.appendChild(overlay);

      var tmdbType = data.name ? 'tv' : 'movie';

      if (!isUltra) {
        fetchLogo(data.id, tmdbType, function (logo) {
          if (!logo) return;
          var titleDiv = overlay.querySelector('.nfx-card-overlay__title');
          if (titleDiv) {
            var img = document.createElement('img');
            img.className = 'nfx-card-overlay__logo';
            img.alt = title;
            img.loading = 'lazy';
            var logoUrl = logoImgUrl(logo.path);
            imgLoad(logoUrl, function (src) {
              img.onload = function () { if (src !== logoUrl) URL.revokeObjectURL(src); };
              img.onerror = function () { if (src !== logoUrl) URL.revokeObjectURL(src); img.style.display = 'none'; };
              img.src = src;
            });
            titleDiv.replaceWith(img);

            var logoLang = getLogoLang();
            var isNonLocalLogo = logoLang !== 'en' && logo.iso_639_1 && logo.iso_639_1 !== logoLang;
            if (logoTitleEnabled() && isNonLocalLogo && title) {
              var localTitle = document.createElement('div');
              localTitle.className = 'nfx-card-overlay__local-title';
              localTitle.textContent = title;
              img.parentNode.insertBefore(localTitle, img.nextSibling);
            }
          }
        });
      }

      if (badgeEnabled() && (data.title || data.name)) {
        var badge = document.createElement('div');
        badge.className = 'nfx-card-logo';
        badge.textContent = data.name ? t('badge_tv') : t('badge_movie');
        view.appendChild(badge);
      }

      if (ratingEnabled() && vote > 0) {
        var rating = document.createElement('div');
        rating.className = 'nfx-card-rating';
        rating.setAttribute('data-score', Math.min(10, Math.max(1, Math.round(vote))));
        rating.textContent = vote.toFixed(1);
        view.appendChild(rating);
      }
    }

    function extractEpisodeShowId(cardEl, data) {
      if (data) {
        if (data.serial && data.serial.id) return { id: data.serial.id, name: data.serial.name || data.serial.original_name || '' };
        if (data.show && data.show.id) return { id: data.show.id, name: data.show.name || data.show.original_name || '' };
        if (data.show_id) return { id: data.show_id, name: data.show_name || '' };
        if (data.tv_id) return { id: data.tv_id, name: data.tv_name || '' };
        if (data.source_id) return { id: data.source_id, name: data.source_name || '' };
        if (data.id && (data.name || data.original_name) && (data.first_air_date || data.episode_run_time || data.number_of_seasons)) {
          return { id: data.id, name: data.name || data.original_name };
        }
      }
      if (cardEl) {
        var titleEl = cardEl.querySelector('.card-episode__footer .card__title');
        if (titleEl) return { id: null, name: titleEl.textContent.trim() };
      }
      return null;
    }

    function switchEpisodeCardToBackdrop(cardEl) {
      if (!cardEl || cardEl.getAttribute('data-nfx-ep-switched')) return;
      cardEl.setAttribute('data-nfx-ep-switched', '1');
      if (isMobile()) return;
      if (resolvePerfLevel() === 'ultra') return;

      var body = cardEl.querySelector('.full-episode__body');
      if (!body) return;

      var fullEp = cardEl.querySelector('.full-episode');
      var numEl = cardEl.querySelector('.full-episode__num');
      if (fullEp && numEl && numEl.parentNode !== fullEp) {
        fullEp.appendChild(numEl);
      }

      var data = extractCardData(cardEl);
      var showInfo = extractEpisodeShowId(cardEl, data);

      if (body.querySelector('.nfx-episode-title') || body.querySelector('.nfx-episode-logo')) return;

      var titleEl = document.createElement('div');
      titleEl.className = 'nfx-episode-title';
      titleEl.textContent = (showInfo && showInfo.name) ? showInfo.name : '';
      if (titleEl.textContent) body.insertBefore(titleEl, body.firstChild);

      if (showInfo && showInfo.id) {
        fetchLogo(showInfo.id, 'tv', function (logo) {
          if (!logo) return;
          var host = cardEl.querySelector('.full-episode__body');
          if (!host) return;
          var existing = host.querySelector('.nfx-episode-title');
          var img = document.createElement('img');
          img.className = 'nfx-episode-logo';
          img.alt = showInfo.name || '';
          img.loading = 'lazy';
          var epLogoUrl = logoImgUrl(logo.path);
          imgLoad(epLogoUrl, function (src) {
            img.onload = function () { if (src !== epLogoUrl) URL.revokeObjectURL(src); };
            img.onerror = function () { if (src !== epLogoUrl) URL.revokeObjectURL(src); img.style.display = 'none'; };
            img.src = src;
          });
          if (existing) existing.replaceWith(img);
          else host.insertBefore(img, host.firstChild);
        });
      }
    }

    function processCards(container) {
      if (!container) return;
      var cards = container.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) switchCardToBackdrop(cards[i]);
      var eps = container.querySelectorAll('.card-episode');
      for (var j = 0; j < eps.length; j++) switchEpisodeCardToBackdrop(eps[j]);
    }

    function injectExplorerBackButton(scope) {
      if (!scope || scope.nodeType !== 1) return;
      var filters = [];
      if (scope.classList && scope.classList.contains('torrent-filter')) {
        filters.push(scope);
      } else if (scope.querySelectorAll) {
        var found = scope.querySelectorAll('.torrent-filter');
        for (var k = 0; k < found.length; k++) filters.push(found[k]);
      }
      for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        if (filter.__agnativeBackInjected) continue;
        if (filter.querySelector('.agnative-explorer-back')) continue;
        filter.__agnativeBackInjected = true;
        var btn = document.createElement('div');
        btn.className = 'simple-button selector agnative-explorer-back';
        btn.setAttribute('data-selector', 'true');
        btn.setAttribute('tabindex', '0');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        bindAction(btn, function () {
          try { if (window.Lampa && Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); } catch (e) {}
        });
        filter.insertBefore(btn, filter.firstChild);
      }
    }

    function observeCards() {
      if (!window.MutationObserver) return;
      if (window.__AGNATIVE_CARD_OBSERVER__) return;
      window.__AGNATIVE_CARD_OBSERVER__ = true;

      var pendingNodes = [];
      var flushing = false;

      function flushPending() {
        flushing = false;
        cardPatchTimer = 0;
        var nodes = pendingNodes;
        pendingNodes = [];
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if (!node || node.nodeType !== 1) continue;
          if (node.classList && node.classList.contains('card')) {
            switchCardToBackdrop(node);
          } else if (node.classList && node.classList.contains('card-episode')) {
            switchEpisodeCardToBackdrop(node);
          } else if (node.querySelectorAll) {
            var cards = node.querySelectorAll('.card');
            for (var k = 0; k < cards.length; k++) switchCardToBackdrop(cards[k]);
            var eps = node.querySelectorAll('.card-episode');
            for (var m = 0; m < eps.length; m++) switchEpisodeCardToBackdrop(eps[m]);
          }
          injectExplorerBackButton(node);
        }
        if (!document.querySelector('.agnative-hero')) setTimeout(buildHeroBanner, 200);
      }

      new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) pendingNodes.push(added[j]);
        }
        if (flushing) return;
        flushing = true;
        var delay = resolvePerfLevel() === 'ultra' ? 160 : 60;
        cardPatchTimer = setTimeout(flushPending, delay);
      }).observe(document.body, { childList: true, subtree: true });
    }

    function bindInputModeDetector() {
      if (window.__AGNATIVE_INPUT_MODE_BOUND__) return;
      window.__AGNATIVE_INPUT_MODE_BOUND__ = true;
      try {
        var setMouse = function () {
          if (document.body) document.body.classList.add('agnative-mouse-mode');
        };
        var setRemote = function () {
          if (document.body) document.body.classList.remove('agnative-mouse-mode');
        };
        window.addEventListener('mousemove', setMouse, { capture: true, passive: true });
        window.addEventListener('mousedown', setMouse, { capture: true, passive: true });
        window.addEventListener('keydown', function (e) {
          var k = e.keyCode;
          if (k === 13 || k === 32 || (k >= 37 && k <= 40)) setRemote();
        }, { capture: true });
      } catch (e) { }
    }

    function initGlareRuntime() {
      if (window.__AGNATIVE_TOPNAV_GLARE_RUNTIME__) return;
      if (resolvePerfLevel() === 'ultra') return;
      window.__AGNATIVE_TOPNAV_GLARE_RUNTIME__ = true;
      if (!document.body) return;

      var GLARE_SEL = '.card, .card-episode, .full-start-new__poster';
      var activeCard = null;
      var activeRect = null;
      var lastClientX = 0;
      var lastClientY = 0;
      var rafScheduled = false;
      var cardAnimMode = getCardAnim();

      if (window.Lampa && Lampa.Storage && Lampa.Storage.listener && Lampa.Storage.listener.follow) {
        try {
          Lampa.Storage.listener.follow('change', function (e) {
            if (!e) return;
            if (e.name === CARD_ANIM_KEY || e.name === GLARE_KEY) cardAnimMode = getCardAnim();
            if (e.name === CARD_ANIM_KEY || e.name === CARD_ANIM_ORBIT_KEY) {
              if (orbitActive()) {
                var focused = document.querySelector('.card.focus, .card-episode.focus, .full-start-new__poster.focus');
                if (focused) startOrbit(focused);
              } else {
                stopOrbit();
              }
            }
          });
        } catch (err) { }
      }

      function animActive() {
        return cardAnimMode !== 'off' && resolvePerfLevel() !== 'ultra';
      }

      function flushGlare() {
        rafScheduled = false;
        if (!activeCard || !activeRect) return;
        var x = lastClientX - activeRect.left;
        var y = lastClientY - activeRect.top;
        var w = activeRect.width || 1;
        var h = activeRect.height || 1;
        var xPct = (x / w) * 2 - 1;
        var yPct = (y / h) * 2 - 1;
        var s = activeCard.style;
        if (cardAnimMode === 'appletv') {
          s.setProperty('--atv-rx', (yPct * -4) + 'deg');
          s.setProperty('--atv-ry', (xPct * 4) + 'deg');
          s.setProperty('--atv-lx', (xPct * 0.3) + 'em');
          s.setProperty('--atv-ly', (yPct * 0.3) + 'em');
        } else {
          s.setProperty('--gx', x + 'px');
          s.setProperty('--gy', y + 'px');
          s.setProperty('--rx', (yPct * -7) + 'deg');
          s.setProperty('--ry', (xPct * 7) + 'deg');
        }
      }

      function setActiveCard(card) {
        if (card === activeCard) return;
        activeCard = card;
        activeRect = card ? card.getBoundingClientRect() : null;
      }

      document.body.addEventListener('mouseover', function (e) {
        if (!animActive()) { activeCard = null; activeRect = null; return; }
        var card = e.target.closest ? e.target.closest(GLARE_SEL) : null;
        setActiveCard(card);
      });

      document.body.addEventListener('mousemove', function (e) {
        if (!activeCard) return;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        if (!rafScheduled) {
          rafScheduled = true;
          requestAnimationFrame(flushGlare);
        }
      });

      window.addEventListener('scroll', function () {
        if (activeCard) activeRect = activeCard.getBoundingClientRect();
      }, true);

      window.addEventListener('resize', function () {
        if (activeCard) activeRect = activeCard.getBoundingClientRect();
      });

      document.body.addEventListener('mouseout', function (e) {
        var card = e.target.closest ? e.target.closest(GLARE_SEL) : null;
        if (!card) return;
        var related = e.relatedTarget;
        if (related && card.contains(related)) return;
        var s = card.style;
        s.setProperty('--rx', '0deg');
        s.setProperty('--ry', '0deg');
        s.setProperty('--gx', '50%');
        s.setProperty('--gy', '50%');
        s.removeProperty('--atv-rx');
        s.removeProperty('--atv-ry');
        s.removeProperty('--atv-lx');
        s.removeProperty('--atv-ly');
        if (activeCard === card) { activeCard = null; activeRect = null; }
      });

      var orbitCard = null;
      var orbitStart = 0;
      var orbitRaf = null;
      var ORBIT_PERIOD = 4200;
      var ORBIT_RADIUS = 0.9;

      function orbitActive() {
        return cardAnimMode === 'appletv' && cardAnimOrbitEnabled() && resolvePerfLevel() !== 'ultra';
      }

      function clearOrbitVars(card) {
        if (!card) return;
        var s = card.style;
        s.removeProperty('--atv-rx');
        s.removeProperty('--atv-ry');
        s.removeProperty('--atv-lx');
        s.removeProperty('--atv-ly');
      }

      function stopOrbit() {
        if (orbitRaf) { cancelAnimationFrame(orbitRaf); orbitRaf = null; }
        if (orbitCard) { clearOrbitVars(orbitCard); orbitCard = null; }
      }

      function inMouseMode() {
        return document.body.classList.contains('agnative-mouse-mode');
      }

      function stepOrbit(now) {
        orbitRaf = null;
        if (!orbitCard || !orbitActive() || inMouseMode()) { stopOrbit(); return; }
        var t = (now - orbitStart) / ORBIT_PERIOD;
        var ang = t * Math.PI * 2;
        var xPct = Math.cos(ang) * ORBIT_RADIUS;
        var yPct = Math.sin(ang) * ORBIT_RADIUS;
        var s = orbitCard.style;
        s.setProperty('--atv-rx', (yPct * -4) + 'deg');
        s.setProperty('--atv-ry', (xPct * 4) + 'deg');
        s.setProperty('--atv-lx', (xPct * 0.3) + 'em');
        s.setProperty('--atv-ly', (yPct * 0.3) + 'em');
        orbitRaf = requestAnimationFrame(stepOrbit);
      }

      function startOrbit(card) {
        if (!card || !orbitActive() || inMouseMode()) return;
        if (orbitCard === card && orbitRaf) return;
        if (orbitCard && orbitCard !== card) clearOrbitVars(orbitCard);
        orbitCard = card;
        orbitStart = performance.now();
        if (!orbitRaf) orbitRaf = requestAnimationFrame(stepOrbit);
      }

      function findFocusedCard() {
        return document.querySelector('.card.focus, .card-episode.focus, .full-start-new__poster.focus');
      }

      window.addEventListener('keydown', function (e) {
        var k = e.keyCode;
        if (k !== 13 && k !== 32 && !(k >= 37 && k <= 40)) return;
        if (!orbitActive()) return;
        var tries = 0;
        function tryStart() {
          tries++;
          if (!orbitActive() || inMouseMode()) return;
          if (orbitRaf) return;
          var focused = findFocusedCard();
          if (focused) startOrbit(focused);
          else if (tries < 8) setTimeout(tryStart, 40);
        }
        setTimeout(tryStart, 0);
      }, { capture: true });

      if (window.MutationObserver) {
        var orbitObs = new MutationObserver(function (muts) {
          if (!orbitActive() || inMouseMode()) { if (orbitCard) stopOrbit(); return; }
          for (var i = 0; i < muts.length; i++) {
            var target = muts[i].target;
            if (!target || !target.classList || target.nodeType !== 1) continue;
            if (!target.matches || !target.matches(GLARE_SEL)) continue;
            if (target.classList.contains('focus')) startOrbit(target);
            else if (orbitCard === target) stopOrbit();
          }
        });
        try {
          orbitObs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
        } catch (e) { }
      }
    }

    function safePatch() {
      scheduled = false;
      if (!pluginEnabled()) {
        removePluginUi();
        return;
      }
      injectStyle();
      if (document.body) document.body.classList.add(BODY_CLASS);
      syncFontSize();
      syncCardFlags();
      syncPerfMode();

      var content = qs('.activity--active .scroll__content') || qs('.scroll__content');
      patchTopnav();
      buildLeftdock();
      syncLeftdockActive();
      observeMenuChanges();
      if (!content) return;
      processCards(content);
      injectExplorerBackButton(document.body);
      if (!document.querySelector('.agnative-hero')) setTimeout(buildHeroBanner, 300);
    }

    function schedulePatch() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(safePatch, 120);
    }

    function startPlugin() {
      registerSettings();
      bindRuntimeListeners();
      if (!pluginEnabled()) {
        removePluginUi();
        return;
      }
      // Snack TV owns every page. Only the left side menu and the settings sections live here.
      injectStyle();
      if (document.body) document.body.classList.add(BODY_CLASS);
      syncPerfMode();
      applyHiddenSettingsSectionsCSS();
      bindInputModeDetector();
      neutralizeMenuController();
      patchActivityPushForMenu();
      patchControllerToggleForLeftdock();
      watchSettingsLifecycle();
      buildLeftdock();
      bindHeadMenuIconClick();
      injectExplorerBackButton(document.body);
      syncCardSize(); syncLogoSize(); syncCardFlags(); syncOverlayAlign(); syncFontSize();
      syncTopnavSize();
      try {
        Lampa.Storage.listener.follow('change', function (e) {
          if (e && e.name === TOPNAV_SIZE_KEY) syncTopnavSize();
        });
      } catch (e) { }
      setInterval(syncTopnavSize, 1500);
      try { processCards(document.body); } catch (e) { }
      try {
        var cardTimer = 0, cardQueue = [];
        new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var add = muts[i].addedNodes;
            for (var j = 0; j < add.length; j++) {
              injectExplorerBackButton(add[j]);
              if (add[j] && add[j].nodeType === 1) cardQueue.push(add[j]);
            }
          }
          if (cardTimer || !cardQueue.length) return;
          cardTimer = setTimeout(function () {
            var nodes = cardQueue; cardQueue = []; cardTimer = 0;
            for (var k = 0; k < nodes.length; k++) {
              var n = nodes[k];
              try {
                if (n.classList && n.classList.contains('card')) switchCardToBackdrop(n);
                else if (n.classList && n.classList.contains('card-episode')) switchEpisodeCardToBackdrop(n);
                else if (n.querySelectorAll) processCards(n);
              } catch (e) { }
            }
          }, 120);
        }).observe(document.body, { childList: true, subtree: true });
      } catch (e) { }
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        buildLeftdock();
        bindHeadMenuIconClick();
        if (tries > 20) clearInterval(t);
      }, 800);
    }

    function bootPlugin() {
      registerSettings();
      startPlugin();
    }

    if (window.appready) bootPlugin();
    else {
      try {
        Lampa.Listener.follow('app', function (e) {
          if (e.type === 'ready') bootPlugin();
        });
      } catch (e) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootPlugin);
        else bootPlugin();
      }
    }
  })();

})();


/* ===== snack-settings-merge ===== */
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


/* ===== snack-settings-hide ===== */
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


/* ===== showy-online ===== */
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


/* ===== auto-plugins ===== */
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


  }
  function ready() { return window.Lampa && Lampa.Listener && Lampa.Storage && Lampa.Settings && Lampa.Template; }
  function start() {
    if (window.appready) run();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') run(); });
  }
  if (ready()) start();
  else { var t = setInterval(function () { if (ready()) { clearInterval(t); start(); } }, 200); }
})();
