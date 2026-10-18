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
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            'html.lampa-mx-mobile-fix,body.lampa-mx-mobile-fix{min-height:100%;background:#000!important;overscroll-behavior:none;} ',
            'body.lampa-mx-mobile-fix .head{top:env(safe-area-inset-top,0px)!important;} ',
            'body.lampa-mx-mobile-fix .wrap__content{padding-top:calc(4em + env(safe-area-inset-top,0px));} ',
            'body.lampa-mx-mobile-fix .scroll,body.lampa-mx-mobile-fix [class*="short" i]{touch-action:pan-x pan-y!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;} ',
            'body.lampa-mx-mobile-fix .menu__item,body.lampa-mx-mobile-fix .navigation-bar__item,body.lampa-mx-mobile-fix .head__action,body.lampa-mx-mobile-fix .player__button,body.lampa-mx-mobile-fix .button{min-height:44px;touch-action:manipulation;}'
        ].join('');
        document.head.appendChild(style);
        document.documentElement.classList.add('lampa-mx-mobile-fix');
        document.body.classList.add('lampa-mx-mobile-fix');
    }
    function findVisibleMenuPanel() {
        var selectors = ['.agnative-leftdock.is-visible', '.menu__content', '.menu__list', '.menu__body', '.menu__container', '.menu'];
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
        var leftdock = document.querySelector('.agnative-leftdock.is-visible');
        if (leftdock) {
            leftdock.classList.remove('is-visible');
            try {
                if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' &&
                    Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'agnative_leftdock') {
                    Lampa.Controller.toggle('content');
                }
            } catch (error) {}
            return true;
        }
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
/* Lampa WebGPU Video Enhancement
 * Anime4K-WebGPU is MIT-licensed: https://github.com/Anime4KWebBoost/Anime4K-WebGPU
 * The renderer is an overlay only: native HTML5/HLS playback, audio,
 * controls and subtitles remain owned by Lampa.
 */
(function () {
    'use strict';
    var VERSION = '2026-10-15-anime4k-webgpu-5';
    if (window.LampaAnime4KVersion === VERSION) return;
    window.LampaAnime4KVersion = VERSION;

    var STORAGE_KEY = 'anime4k_enabled';
    var STATE_OFF = 'off';
    var STATE_UNSUPPORTED = 'unsupported';
    var STATE_WAIT = 'wait';
    var STATE_STARTING = 'starting';
    var STATE_ACTIVE = 'active';
    var state = STATE_OFF;

    var canvas = null;
    var video = null;
    var host = null;
    var originalOpacity = null;
    var originalOpacityPriority = '';
    var originalPosition = null;
    var originalPositionPriority = '';
    var resizeObserver = null;
    var resizeHandler = null;
    var metadataHandler = null;
    var sourceHandler = null;
    var revealPlayHandler = null;
    var retryTimer = 0;
    var retryAttempts = 0;
    var renderToken = 0;
    var menuInstalled = false;
    var badge = null;

    function enabled() {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                var stored = Lampa.Storage.get(STORAGE_KEY, true);
                return stored !== false && stored !== 'false' && stored !== 0 && stored !== '0';
            }
        } catch (error) {}
        return true;
    }
    function setEnabled(value) {
        try { if (window.Lampa && Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set(STORAGE_KEY, !!value); } catch (error) {}
    }
    function currentVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') {
                var playerVideo = Lampa.PlayerVideo.video();
                if (playerVideo) return playerVideo;
            }
        } catch (error) {}
        return document.querySelector('.player-video__video, video');
    }
    function toast(text) {
        try {
            if (window.Lampa && Lampa.Toast && typeof Lampa.Toast.show === 'function') {
                Lampa.Toast.show({ title: '', text: text });
            }
        } catch (error) {}
    }
    function getApi() {
        return window['anime4k-webgpu'];
    }
    function supportsVideoFrameCallback() {
        try { return typeof document.createElement('video').requestVideoFrameCallback === 'function'; }
        catch (error) { return false; }
    }
    function webgpuSupported() {
        return !!(navigator.gpu && getApi() && typeof getApi().render === 'function' &&
            typeof getApi().CNNx2M === 'function' && supportsVideoFrameCallback());
    }
    function clearRetry() {
        if (retryTimer) window.clearTimeout(retryTimer);
        retryTimer = 0;
    }
    function restoreHost() {
        if (!host) return;
        if (originalPosition) host.style.setProperty('position', originalPosition, originalPositionPriority);
        else host.style.removeProperty('position');
    }
    function destroyRenderer() {
        if (!canvas) return;
        try {
            var gpuctx = canvas.getContext && canvas.getContext('webgpu');
            if (gpuctx && typeof gpuctx.unconfigure === 'function') gpuctx.unconfigure();
        } catch (error) {}
        try { canvas.width = 0; canvas.height = 0; } catch (error) {}
    }
    function showBadge() {
        if (!host) return;
        if (badge) return;
        var style = document.getElementById('lampa-webgpu-badge-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'lampa-webgpu-badge-style';
            style.textContent = '.lampa-webgpu-badge{position:absolute!important;top:calc(env(safe-area-inset-top,0px) + 14px)!important;right:14px!important;z-index:20!important;pointer-events:none!important;font-size:11px!important;font-weight:700!important;letter-spacing:.4px;color:#fff!important;background:rgba(0,0,0,.6)!important;border:1px solid rgba(255,255,255,.3)!important;border-radius:999px!important;padding:3px 10px!important;font-family:inherit!important;}';
            document.head.appendChild(style);
        }
        badge = document.createElement('div');
        badge.className = 'lampa-webgpu-badge';
        badge.textContent = '\u2713 Anime4K';
        host.appendChild(badge);
    }
    function hideBadge() {
        if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
        badge = null;
    }
    function cleanup() {
        renderToken++;
        clearRetry();
        if (resizeObserver) resizeObserver.disconnect();
        if (resizeHandler) window.removeEventListener('resize', resizeHandler);
        if (video && metadataHandler) video.removeEventListener('loadedmetadata', metadataHandler);
        if (video && sourceHandler) {
            video.removeEventListener('emptied', sourceHandler);
            video.removeEventListener('loadstart', sourceHandler);
        }
        if (video && revealPlayHandler) {
            video.removeEventListener('play', revealPlayHandler);
            revealPlayHandler = null;
        }
        resizeObserver = null;
        resizeHandler = null;
        metadataHandler = null;
        sourceHandler = null;
        if (video && originalOpacity !== null) {
            if (originalOpacity) video.style.setProperty('opacity', originalOpacity, originalOpacityPriority);
            else video.style.removeProperty('opacity');
        }
        destroyRenderer();
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        hideBadge();
        restoreHost();
        canvas = null;
        video = null;
        host = null;
        originalOpacity = null;
        originalOpacityPriority = '';
        originalPosition = null;
        originalPositionPriority = '';
    }
    function syncCanvas() {
        if (!canvas || !video || !host) return;
        var vr = video.getBoundingClientRect();
        var hr = host.getBoundingClientRect();
        canvas.style.left = (vr.left - hr.left).toFixed(2) + 'px';
        canvas.style.top = (vr.top - hr.top).toFixed(2) + 'px';
        canvas.style.width = Math.max(1, vr.width).toFixed(2) + 'px';
        canvas.style.height = Math.max(1, vr.height).toFixed(2) + 'px';
    }
    function retryFor(target, token) {
        clearRetry();
        if (!enabled() || token !== renderToken || retryAttempts >= 12) return;
        retryAttempts++;
        retryTimer = window.setTimeout(function () {
            if (token !== renderToken) return;
            startFor(target);
        }, 350);
    }
    function createCanvas(target) {
        var parent = target.parentElement;
        if (!parent) return false;
        host = parent;
        var computed = window.getComputedStyle(parent);
        originalPosition = parent.style.getPropertyValue('position');
        originalPositionPriority = parent.style.getPropertyPriority('position');
        if (computed.position === 'static') parent.style.setProperty('position', 'relative');
        canvas = document.createElement('canvas');
        canvas.className = 'lampa-webgpu-video-canvas';
        canvas.width = Math.max(1, target.videoWidth * 2);
        canvas.height = Math.max(1, target.videoHeight * 2);
        canvas.style.cssText = 'position:absolute!important;z-index:2!important;pointer-events:none!important;display:block!important;opacity:0!important;background:#000!important;object-fit:fill!important;';
        parent.appendChild(canvas);
        syncCanvas();
        return true;
    }
    function reveal(token) {
        if (token !== renderToken || !canvas || !video) return;
        syncCanvas();
        video.style.setProperty('opacity', '0', 'important');
        canvas.style.setProperty('opacity', '1', 'important');
        state = STATE_ACTIVE;
        showBadge();
    }
    function scheduleReveal(token) {
        if (token !== renderToken || !canvas || !video) return;
        if (!video.paused && video.readyState >= 2) {
            if (typeof video.requestVideoFrameCallback === 'function') {
                video.requestVideoFrameCallback(function () {
                    window.setTimeout(function () { reveal(token); }, 0);
                });
            } else {
                window.setTimeout(function () { reveal(token); }, 150);
            }
            return;
        }
        if (revealPlayHandler) video.removeEventListener('play', revealPlayHandler);
        revealPlayHandler = function () {
            if (revealPlayHandler && video) video.removeEventListener('play', revealPlayHandler);
            revealPlayHandler = null;
            scheduleReveal(token);
        };
        video.addEventListener('play', revealPlayHandler, { passive: true });
    }
    async function startFor(target) {
        if (!enabled() || !target) return false;
        if (!target.videoWidth || !target.videoHeight) {
            state = STATE_WAIT;
            if (video !== target) { cleanup(); video = target; }
            retryFor(target, renderToken);
            return false;
        }
        if (!webgpuSupported() || typeof target.requestVideoFrameCallback !== 'function') {
            state = STATE_UNSUPPORTED;
            return false;
        }
        cleanup();
        if (!createCanvas(target)) return false;
        video = target;
        retryAttempts = 0;
        var token = ++renderToken;
        originalOpacity = target.style.getPropertyValue('opacity');
        originalOpacityPriority = target.style.getPropertyPriority('opacity');
        resizeHandler = syncCanvas;
        window.addEventListener('resize', resizeHandler, { passive: true });
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(syncCanvas);
            resizeObserver.observe(host);
            resizeObserver.observe(target);
        }
        metadataHandler = function () {
            if (token === renderToken && canvas &&
                (target.videoWidth * 2 !== canvas.width || target.videoHeight * 2 !== canvas.height)) startFor(target);
        };
        sourceHandler = function () { if (token === renderToken) startFor(target); };
        target.addEventListener('loadedmetadata', metadataHandler, { passive: true });
        target.addEventListener('emptied', sourceHandler, { passive: true });
        target.addEventListener('loadstart', sourceHandler, { passive: true });
        state = STATE_STARTING;
        try {
            var api = getApi();
            await api.render({
                video: target,
                canvas: canvas,
                pipelineBuilder: function (device, inputTexture) {
                    return [new api.CNNx2M({ device: device, inputTexture: inputTexture })];
                }
            });
            if (token !== renderToken || !canvas) return false;
            syncCanvas();
            scheduleReveal(token);
            return true;
        } catch (error) {
            if (token === renderToken) { state = STATE_UNSUPPORTED; cleanup(); }
            return false;
        }
    }
    function menuTitle() {
        return enabled() ? '✓ Покращення відео — УВІМКНЕНО' : '✕ Покращення відео — ВИМКНЕНО';
    }
    function menuSubtitle() {
        if (!enabled()) {
            return webgpuSupported()
                ? 'Зараз вимкнено. Натисніть, щоб увімкнути Anime4K WebGPU'
                : 'WebGPU недоступний на цьому пристрої';
        }
        if (state === STATE_ACTIVE) return 'Зараз працює: Anime4K WebGPU, x2. Натисніть, щоб вимкнути';
        if (state === STATE_STARTING) return 'WebGPU запускається…';
        if (state === STATE_WAIT) return 'Очікує завантаження відео…';
        if (state === STATE_UNSUPPORTED) return 'WebGPU недоступний — показує стандартне відео';
        return 'Увімкнено';
    }
    function installMenu() {
        if (menuInstalled || !window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        menuInstalled = true;
        var originalShow = Lampa.Select.show;
        Lampa.Select.show = function (options) {
            if (!options || !Array.isArray(options.items)) return originalShow.apply(this, arguments);
            var isQuality = options.items.some(function (item) {
                return item && item.value !== 'anime4k-toggle' && (item.quality !== undefined || item.url);
            });
            if (!isQuality || options.items.some(function (item) { return item && item.value === 'anime4k-toggle'; })) {
                return originalShow.apply(this, arguments);
            }
            var patched = Object.assign({}, options);
            patched.items = options.items.concat([{
                title: menuTitle(),
                subtitle: menuSubtitle(),
                value: 'anime4k-toggle',
                quality: 'anime4k-toggle'
            }]);
            patched.onSelect = function (item) {
                if (item && item.value === 'anime4k-toggle') {
                    toggle();
                    return;
                }
                if (typeof options.onSelect === 'function') options.onSelect(item);
            };
            return originalShow.call(this, patched);
        };
    }
    async function toggle() {
        var next = !enabled();
        setEnabled(next);
        if (!next) {
            cleanup();
            state = STATE_OFF;
            toast('Покращення відео вимкнено');
        } else {
            var target = currentVideo();
            if (!target) {
                state = STATE_OFF;
                toast('Покращення відео увімкнено — застосується при відтворенні');
            } else {
                var ok = await startFor(target);
                if (state === STATE_ACTIVE) toast('Покращення відео працює (WebGPU, x2)');
                else if (state === STATE_UNSUPPORTED) toast('WebGPU недоступний — показує стандартне відео');
                else if (ok || state === STATE_STARTING || state === STATE_WAIT) toast('Покращення відео увімкнено');
                else toast('Не вдалося запустити WebGPU — показує стандартне відео');
            }
        }
        if (window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
    }
    function onStart() {
        installMenu();
        var target = currentVideo();
        if (!target) return;
        if (enabled()) {
            clearRetry();
            retryAttempts = 0;
            startFor(target);
        } else cleanup();
    }
    function onDestroy() {
        cleanup();
        state = STATE_OFF;
    }
    function start() {
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener) { setTimeout(start, 300); return; }
        installMenu();
        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('destroy', onDestroy);
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports["anime4k-webgpu"]=t():e["anime4k-webgpu"]=t()}(this,(()=>(()=>{"use strict";var e={679:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="@group(0) @binding(0) var tex_in: texture_2d<f32>; // original frame\n@group(0) @binding(1) var tex_lumi: texture_2d<f32>; // lumination Y\n@group(0) @binding(2) var tex_out: texture_storage_2d<rgba16float, write>; // output texture\n\nfn colorAt(x: u32, y: u32) -> vec4f {\n  return textureLoad(tex_in, vec2u(x, y), 0);\n}\n\nfn lumaAt(x: u32, y: u32) -> f32 {\n  return textureLoad(tex_lumi, vec2u(x, y), 0).x;\n}\n\n// Function to calculate luminance\nfn get_luma(rgba: vec4<f32>) -> f32 {\n    return dot(rgba, vec4<f32>(0.299, 0.587, 0.114, 0.0));\n}\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_in: vec2u = textureDimensions(tex_in);\n  let dim_out: vec2u = textureDimensions(tex_out);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n\n  let color: vec4f = colorAt(pixel.x, pixel.y);\n  let luma: f32 = get_luma(color);\n  let new_luma: f32 = min(luma, lumaAt(pixel.x, pixel.y));\n  let luma_diff: f32 = luma - new_luma;\n  let new_color: vec4f = color - vec4f(luma_diff, luma_diff, luma_diff, 0.0);\n\n  textureStore(tex_out, vec2u(pixel.x, pixel.y), new_color);\n}\n"},986:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="@group(0) @binding(0) var tex_in: texture_2d<f32>; // original frame\n@group(0) @binding(1) var tex_out: texture_storage_2d<rgba16float, write>; // luminationX\n\nfn colorAt(x: u32, y: u32) -> vec4f {\n  return textureLoad(tex_in, vec2u(x, y), 0);\n}\n\n// Function to calculate luminance\nfn get_luma(rgba: vec4<f32>) -> f32 {\n    return dot(rgba, vec4<f32>(0.299, 0.587, 0.114, 0.0));\n}\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_in: vec2u = textureDimensions(tex_in);\n  let dim_out: vec2u = textureDimensions(tex_out);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n\n  let KERNEL_SIZE: u32 = 5;\n  let KERNEL_HALF: u32 = 2;\n\n  var gmax: f32 = 0.0;\n  for (var i: u32 = 0; i < KERNEL_SIZE; i = i + 1) {\n    let g: f32 = get_luma(colorAt(pixel.x + i - KERNEL_HALF, pixel.y));\n    gmax = max(gmax, g);\n  }\n  textureStore(tex_out, vec2u(pixel.x, pixel.y), vec4f(gmax, 0, 0, 1));\n}\n"},261:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="@group(0) @binding(0) var tex_in: texture_2d<f32>; // lumination X\n@group(0) @binding(1) var tex_out: texture_storage_2d<rgba16float, write>; // lumination Y\n\nfn lumaAt(x: u32, y: u32) -> vec4f {\n  return textureLoad(tex_in, vec2u(x, y), 0);\n}\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_in: vec2u = textureDimensions(tex_in);\n  let dim_out: vec2u = textureDimensions(tex_out);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n\n  let KERNEL_SIZE: u32 = 5;\n  let KERNEL_HALF: u32 = 2;\n\n  var gmax: f32 = 0.0;\n  for (var i: u32 = 0; i < KERNEL_SIZE; i = i + 1) {\n    let g: f32 = lumaAt(pixel.x, pixel.y + i - KERNEL_HALF).x;\n    gmax = max(gmax, g);\n  }\n  textureStore(tex_out, vec2u(pixel.x, pixel.y), vec4f(gmax, 0, 0, 1));\n}\n"},486:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="@group(0) @binding(0) var tex_0: texture_2d<f32>;\n@group(0) @binding(1) var tex_1: texture_2d<f32>;\n@group(0) @binding(2) var tex_2: texture_2d<f32>;\n@group(0) @binding(3) var tex_out: texture_storage_2d<rgba16float, write>;\n\nfn colorAt(texture: texture_2d<f32>, x: u32, y: u32) -> vec4<f32> {\n    return textureLoad(texture, vec2u(x, y), 0);\n}\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n    let dim_out: vec2u = textureDimensions(tex_out);\n    if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n        return;\n    }\n\n    let loc: vec2u = pixel.xy / vec2u(2, 2);\n    let sub_loc: vec2u = pixel.xy % vec2u(2, 2);\n    let channel: u32 = sub_loc.y * 2 + sub_loc.x;\n    let c0: f32 = colorAt(tex_0, loc.x, loc.y)[channel];\n    let c1: f32 = colorAt(tex_1, loc.x, loc.y)[channel];\n    let c2: f32 = colorAt(tex_2, loc.x, loc.y)[channel];\n    let c3: f32 = c2; // unclear why\n\n    textureStore(tex_out, pixel.xy, vec4f(c0, c1, c2, c3));\n}\n"},265:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="@group(0) @binding(1) var mySampler: sampler;\n@group(0) @binding(2) var myTexture: texture_2d<f32>;\n\n@fragment\nfn main(@location(0) fragUV : vec2f) -> @location(0) vec4f {\n  return textureSampleBaseClampToEdge(myTexture, mySampler, fragUV);\n}\n"},617:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="struct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fragUV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {\n  const pos = array(\n    vec2( 1.0,  1.0),\n    vec2( 1.0, -1.0),\n    vec2(-1.0, -1.0),\n    vec2( 1.0,  1.0),\n    vec2(-1.0, -1.0),\n    vec2(-1.0,  1.0),\n  );\n\n  const uv = array(\n    vec2(1.0, 0.0),\n    vec2(1.0, 1.0),\n    vec2(0.0, 1.0),\n    vec2(1.0, 0.0),\n    vec2(0.0, 1.0),\n    vec2(0.0, 0.0),\n  );\n\n  var output : VertexOutput;\n  output.Position = vec4(pos[VertexIndex], 0.0, 1.0);\n  output.fragUV = uv[VertexIndex];\n  return output;\n}\n"},545:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="@group(0) @binding(0) var mySampler: sampler;\n@group(0) @binding(1) var tex_diff: texture_2d<f32>;\n@group(0) @binding(2) var tex_origin: texture_2d<f32>;\n\n@fragment\nfn main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {\n    let color_bilinear: vec4f = textureSample(tex_origin, mySampler, fragUV);\n    let color_addon: vec4f = textureSample(tex_diff, mySampler, fragUV);\n    return clamp(color_bilinear + color_addon, vec4<f32>(0., 0., 0., 0.), vec4<f32>(1., 1., 1., 1.));\n}\n"},155:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="struct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fragUV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {\n  const pos = array(\n    vec2( 1.0,  1.0),\n    vec2( 1.0, -1.0),\n    vec2(-1.0, -1.0),\n    vec2( 1.0,  1.0),\n    vec2(-1.0, -1.0),\n    vec2(-1.0,  1.0),\n  );\n\n  const uv = array(\n    vec2(1.0, 0.0),\n    vec2(1.0, 1.0),\n    vec2(0.0, 1.0),\n    vec2(1.0, 0.0),\n    vec2(0.0, 1.0),\n    vec2(0.0, 0.0),\n  );\n\n  var output : VertexOutput;\n  output.Position = vec4(pos[VertexIndex], 0.0, 1.0);\n  output.fragUV = uv[VertexIndex];\n  return output;\n}\n"},324:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x3x3x8\n// Name: conv2d1tf\n// Inputs: ['conv2d_tf']\n// Output: conv2d_1_tf\n@group(0) @binding(0) var conv2d_tf_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_1_tf_tex: texture_storage_2d<rgba16float, write>;\nfn max4(vector: vec4f, value: f32) -> vec4f {\n  return max(vector, vec4f(value));\n}\n\nfn go_0(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(textureLoad(conv2d_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\nfn go_1(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(-textureLoad(conv2d_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_1_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(-0.08532478, -0.14302494, -0.017921071, -0.0032664281, -0.09841952, 0.024187077, 0.10701477, 0.14110753, -0.05714981, -0.10897174, 0.073803626, 0.103992954, 0.07914382, 0.032193683, -0.18346278, -0.09723936) * go_0(pixel.xy, -1, -1);\n  result += mat4x4<f32>(-0.034482613, -0.10742312, -0.047286414, -0.08641124, -0.33896688, -0.036533825, -0.48337597, 0.034040943, -0.13598205, -0.080917805, 0.08540263, -0.012667689, -0.009171425, -0.120026454, -0.20536867, -0.032149274) * go_0(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.18687321, 0.066278316, 0.024327392, 0.08816582, -0.08017908, 0.09488853, 0.26018232, -0.101504356, 0.17487666, 0.31057635, 0.14785016, -0.09622089, -0.07537452, -0.13844088, -0.05810814, 0.09907489) * go_0(pixel.xy, -1, 1);\n  result += mat4x4<f32>(-0.04183032, 0.15207712, 0.005002397, 0.32277516, -0.16169126, -0.119836345, -0.04068436, -0.096728764, 0.11943901, 0.1789597, -0.20412198, 0.19009817, 0.36630696, 0.06946421, -0.5254373, -0.11896399) * go_0(pixel.xy, 0, -1);\n  result += mat4x4<f32>(-0.31916487, -0.98911583, 1.0728644, -0.39280394, 0.33458877, -0.17325239, -0.645045, -0.28524077, -0.14512783, 0.24996442, -0.09837877, 0.05468934, 0.31559715, -0.020504637, -0.026724018, 0.24507573) * go_0(pixel.xy, 0, 0);\n  result += mat4x4<f32>(-0.23759829, -0.08530173, -0.16665787, -0.22463752, 0.109896734, 0.13446991, -0.049552456, -0.02385489, -0.01245375, 0.3833208, 0.05758832, 0.1528937, 0.0501858, -0.19651426, 0.0076587177, -0.03297025) * go_0(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.14554465, -0.01826686, 0.10284085, -0.19152659, -0.017585073, -0.05511482, 0.06362406, 0.023924058, -0.0018977845, -0.103172876, 0.03287086, -0.20085956, 0.36062446, 0.10749464, -0.20984372, 0.018256644) * go_0(pixel.xy, 1, -1);\n  result += mat4x4<f32>(-0.005534592, 0.3709197, -0.18287498, 0.1720451, 0.030155553, -0.023265475, 0.0058617783, -0.031765483, 0.037328955, -0.2730994, 0.35090837, -0.3269043, -0.028477207, 0.32756507, -0.15989502, 0.12158258) * go_0(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.10873739, 0.19583772, 0.060394943, 0.09410379, -0.04739245, 0.026561242, 0.022990001, 0.1093272, -0.01071349, -0.022938967, -0.046423864, 0.2385325, -0.0319821, 0.046962265, 0.09081178, -0.11001857) * go_0(pixel.xy, 1, 1);\n  result += mat4x4<f32>(0.13012704, 0.112289295, 0.030790284, -0.050499484, 0.11784853, 0.08107028, -0.07556717, -0.15643, 0.015249331, 0.015299608, 0.07748125, 0.054485757, 0.044857923, 0.12161275, -0.048292994, -0.033995003) * go_1(pixel.xy, -1, -1);\n  result += mat4x4<f32>(0.12931514, 0.15114146, 0.070513315, 0.11246343, 0.4142387, 0.213479, -0.5439916, 0.07776645, 0.13109331, 0.2021147, 0.25932786, -0.22157331, 0.02377734, -0.014970623, -0.1943276, 0.18440372) * go_1(pixel.xy, -1, 0);\n  result += mat4x4<f32>(-0.22365458, -0.19829084, -0.06881161, -0.06468993, 0.17202774, 0.0048758537, -0.09235021, 0.18941896, 0.064125344, -0.09067088, 0.09748182, 0.13561936, -0.05876288, -0.0122420965, -0.054380875, -0.17743628) * go_1(pixel.xy, -1, 1);\n  result += mat4x4<f32>(0.18582906, -0.09263032, -0.08210888, -0.20515606, 0.11484005, 0.08557595, 0.0009253741, -0.051202174, -0.18535301, -0.1529345, -0.13092944, 0.03770747, -0.020947013, 0.19187425, -0.15494856, -0.048979875) * go_1(pixel.xy, 0, -1);\n  result += mat4x4<f32>(-0.38131633, 0.4278787, 0.19763695, 0.27655518, -0.08711912, 0.07374453, -0.064803004, 0.5983854, 0.2361923, -0.057221692, -0.37138999, -0.24259573, 0.13890724, 0.25706333, -0.54021406, 0.08095518) * go_1(pixel.xy, 0, 0);\n  result += mat4x4<f32>(0.0991328, -0.022651536, -0.029148921, -0.009812537, -0.09523686, -0.15704902, 0.052389514, 0.21561539, 0.1950314, -0.08572602, 0.0016523858, 0.14125621, -0.030999828, 0.12009709, 0.0373512, -0.105043754) * go_1(pixel.xy, 0, 1);\n  result += mat4x4<f32>(-0.11251988, 0.12106985, 0.011923068, 0.3662747, 0.004800994, 0.017972551, 0.004761366, -0.07934206, -0.13755941, -0.022852683, 0.1502225, 0.009758547, -0.16964264, 0.00984782, 0.07855833, 0.035730787) * go_1(pixel.xy, 1, -1);\n  result += mat4x4<f32>(0.01964957, -0.27226487, 0.033933397, -0.117632054, -0.009058229, 0.047830686, -0.01125145, 0.136628, 0.0056388285, 0.3028781, -0.12286517, 0.23498532, -0.009319075, -0.444048, 0.16174883, -0.06367683) * go_1(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.02343933, -0.010915871, -0.058680378, -0.21886891, -0.010750894, -0.06671997, 0.0602906, -0.07903071, 0.066891186, 0.06650588, 0.14362891, -0.101870626, 0.02264628, -0.06940821, -0.077616625, 0.110911585) * go_1(pixel.xy, 1, 1);\n  result += vec4f(0.032014452, -0.020821465, 0.0826416, -0.002838458);\n  textureStore(conv2d_1_tf_tex, pixel.xy, result);\n}\n"},575:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x3x3x8\n// Name: conv2d2tf\n// Inputs: ['conv2d_1_tf']\n// Output: conv2d_2_tf\n@group(0) @binding(0) var conv2d_1_tf_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_2_tf_tex: texture_storage_2d<rgba16float, write>;\nfn max4(vector: vec4f, value: f32) -> vec4f {\n  return max(vector, vec4f(value));\n}\n\nfn go_0(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(textureLoad(conv2d_1_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\nfn go_1(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(-textureLoad(conv2d_1_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_2_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(-0.06963679, -0.07560548, -0.069522075, 0.0038078027, -0.08002613, 0.13671301, 0.084461786, -0.039376218, 0.19136548, -0.123174496, 0.26566333, -0.16583005, -0.18664864, -0.023539122, -0.21928434, -0.026818147) * go_0(pixel.xy, -1, -1);\n  result += mat4x4<f32>(0.16660932, -0.18558703, 0.37230486, 0.118128106, -0.14098641, 0.14659132, -0.22217897, 0.12952235, -0.4139033, -0.04308319, 0.12885277, -0.17986743, -0.23556231, -0.08351981, -0.43240538, 0.019033253) * go_0(pixel.xy, -1, 0);\n  result += mat4x4<f32>(-0.18008037, -0.04448665, 0.011906908, -0.023056917, 0.18136618, -0.04723555, -0.0050158803, -0.14823224, -0.2105281, 0.023047728, -0.14040631, -0.03178526, -0.13477588, -0.01820428, 0.058358394, 0.23792502) * go_0(pixel.xy, -1, 1);\n  result += mat4x4<f32>(0.07363309, -0.061728477, 0.03573137, -0.0050971056, -0.012813505, -0.17236637, 0.1697835, 0.055788577, -0.22263195, 0.10324512, 0.58971673, -0.4872246, -0.1555681, 0.032747746, -0.096495196, 0.070196226) * go_0(pixel.xy, 0, -1);\n  result += mat4x4<f32>(0.14174286, 0.099460006, -0.088765986, 0.58350676, -0.025177564, -0.46004987, 0.37007022, -0.11437029, -0.5164534, -0.60465246, 0.38859612, -0.32846406, 0.050266482, -0.20334712, 0.18316261, -0.19327633) * go_0(pixel.xy, 0, 0);\n  result += mat4x4<f32>(-0.09377763, -0.0012762006, -0.028991895, -0.26523829, 0.20173682, 0.037923716, -0.03174243, 0.07103378, -0.10764164, -0.30752546, 0.20556998, -0.1892279, 0.08115748, -0.023550175, -0.07627362, 0.11746628) * go_0(pixel.xy, 0, 1);\n  result += mat4x4<f32>(-0.06998859, -0.017997518, 0.069938794, -0.14943017, -0.14179112, 0.16643842, -0.110231474, 0.08895815, -0.24074875, 0.3277253, -0.07435203, -0.23452802, 0.039962552, -0.07145652, -0.022511544, -0.04571222) * go_0(pixel.xy, 1, -1);\n  result += mat4x4<f32>(-0.059785757, -0.23771374, -0.030571314, 0.25222278, 0.106601834, 0.34398326, 0.14511436, -0.03867526, -0.38982397, -0.11944689, 0.12997924, -0.13079585, 0.005729482, 0.012653905, -0.063693404, 0.09632285) * go_0(pixel.xy, 1, 0);\n  result += mat4x4<f32>(-0.04933823, 0.0547175, 0.050636575, -0.10060694, 0.1344485, 0.19752938, -0.100068115, -0.028829506, -0.14096203, -0.079092234, 0.092109434, 0.011606209, -0.04052607, -0.008347507, 0.06956573, -0.028109524) * go_0(pixel.xy, 1, 1);\n  result += mat4x4<f32>(0.21918017, -0.11115073, 0.2262453, -0.06889667, -0.11256312, -0.07438075, -0.088454485, 0.13672407, -0.06905764, 0.08128395, 0.016103368, 0.050190717, 0.09691516, 0.05845721, 0.4886816, 0.041121427) * go_1(pixel.xy, -1, -1);\n  result += mat4x4<f32>(-0.3449472, 0.09711974, -0.13881907, -0.018265123, 0.27855873, -0.07030004, 0.29545054, 0.37216932, 0.08657718, 0.099066615, -0.10574013, -0.17667885, -0.14855732, -0.11351448, 0.66945946, 0.11312157) * go_1(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.2526151, -0.04594331, -0.06606611, 0.09104881, 0.06857995, -0.075284235, -0.17664689, 0.21578754, 0.0696524, 0.09142951, 0.080997564, -0.0682772, -0.0011445724, -0.11736295, 0.2519232, -0.101926275) * go_1(pixel.xy, -1, 1);\n  result += mat4x4<f32>(-0.12913518, 0.058357026, 0.195421, -0.15651494, 0.2877076, 0.0033844314, -0.07831594, 0.052855384, -0.031295884, 0.03301088, -0.18408822, 0.06732994, 0.23742151, -0.12568143, 0.22810535, -0.11545694) * go_1(pixel.xy, 0, -1);\n  result += mat4x4<f32>(-0.49203303, -0.22656603, 0.1723193, -0.51250046, -0.09742038, 0.758559, -0.3387505, -0.6193586, 0.14136684, 0.27679884, -0.050113205, 0.31041816, -0.36475047, -0.48746544, 0.3233227, 0.4579754) * go_1(pixel.xy, 0, 0);\n  result += mat4x4<f32>(0.46636763, 0.1507748, -0.2581362, 0.15413165, -0.17160143, 0.14256273, -0.074575804, -0.099299066, -0.0017214464, 0.13778336, -0.07378213, -0.15489665, -0.10533715, -0.0011083825, 0.39584312, 0.0023906573) * go_1(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.026959421, -0.06391859, 0.0034752619, 0.14521928, -0.0010877338, -0.032619733, 0.005375293, -0.018952755, 0.03381545, -0.007652831, 0.034141563, 0.046016496, 0.11219674, 0.030913852, 0.077403754, 0.17192438) * go_1(pixel.xy, 1, -1);\n  result += mat4x4<f32>(0.040326044, 0.17290725, -0.1220239, -0.09594783, -0.025229257, 0.17913155, -0.26623353, -0.033396784, -0.03075146, 0.009143897, -0.0136083895, -0.13886899, 0.075683735, -0.11584183, 0.22182357, 0.19350322) * go_1(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.15726025, -0.10215694, -0.060057458, 0.26487043, -0.04075552, -0.016496127, 0.0015382086, 0.108562306, 0.026795091, 0.0441233, -0.08754318, -0.0460157, 0.048422016, 0.14107347, 0.07986661, 0.1047697) * go_1(pixel.xy, 1, 1);\n  result += vec4f(0.0766796, 0.08115133, -0.05703058, 0.14025708);\n  textureStore(conv2d_2_tf_tex, pixel.xy, result);\n}\n"},91:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x3x3x8\n// Name: conv2d3tf\n// Inputs: ['conv2d_2_tf']\n// Output: conv2d_3_tf\n@group(0) @binding(0) var conv2d_2_tf_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_3_tf_tex: texture_storage_2d<rgba16float, write>;\nfn max4(vector: vec4f, value: f32) -> vec4f {\n  return max(vector, vec4f(value));\n}\n\nfn go_0(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(textureLoad(conv2d_2_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\nfn go_1(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(-textureLoad(conv2d_2_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_3_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(-0.18038331, 0.21830973, -0.10019419, -0.022745568, -0.14944611, -0.15669158, 0.46361133, -0.07289843, 0.02976627, -0.09000817, 0.113060996, 0.05635241, 0.012762965, -0.022688959, 0.01629751, 0.061114635) * go_0(pixel.xy, -1, -1);\n  result += mat4x4<f32>(0.024338024, -0.10004009, -0.13709056, -0.0851965, 0.23927099, -0.024349794, -0.16574804, 0.084686354, -0.047885604, 0.09688507, -0.12733915, 0.06980246, 0.11480734, 0.014669346, -0.07505829, 0.04676309) * go_0(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.054203495, 0.011881634, -0.036115017, -0.0686298, -0.13682245, -0.15678032, 0.057050128, -0.03368558, 0.13011025, 0.033391044, -0.09841339, -0.027057761, -0.18701133, 0.20852546, -0.13660902, 0.0005817616) * go_0(pixel.xy, -1, 1);\n  result += mat4x4<f32>(-0.08077834, 0.35952288, -0.07647382, -0.0033230998, 0.13929126, -0.09155619, 0.14128102, 0.16005981, 0.18161216, -0.09485738, 0.0029118075, 0.052682754, 0.03242074, 0.08299826, 0.073796146, -0.06446532) * go_0(pixel.xy, 0, -1);\n  result += mat4x4<f32>(-0.36655015, 0.4606936, 0.19073649, 0.31655258, -0.006838053, -0.579939, 0.089126326, -0.14021218, -0.3437716, 0.16714323, 0.17705944, -0.22418492, -0.3883696, -0.2302651, 0.2581861, 0.21983066) * go_0(pixel.xy, 0, 0);\n  result += mat4x4<f32>(0.0992383, -0.014257871, -0.023896435, 0.19868234, 0.0408007, 0.07995299, 0.16102871, -0.11668251, 0.22458278, -0.05587917, 0.19373615, -0.016202094, -0.25106144, 0.15634494, 0.11624891, -0.2930768) * go_0(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.024616942, 0.36248252, -0.14779098, -0.019894283, -0.007111256, 0.010641561, -0.09541178, 0.21236233, 0.009501827, 0.08132797, -0.13983901, 0.027207611, 0.038444366, -0.013995817, -0.16242191, 0.03294123) * go_0(pixel.xy, 1, -1);\n  result += mat4x4<f32>(0.0131698875, -0.18124102, -0.13503514, -0.06099072, 0.07422735, -0.20906176, -0.049005672, 0.08739405, -0.031758767, -0.1978915, 0.23094437, 0.54512614, 0.21338555, -0.011205669, -0.23727885, -0.29533875) * go_0(pixel.xy, 1, 0);\n  result += mat4x4<f32>(-0.0010255767, -0.07168225, -0.033568826, 0.22161655, -0.087293416, 0.11350447, 0.13653576, 0.061226424, -0.13074352, 0.058425818, 0.038460605, 0.2749964, -0.012814839, 0.085885845, -0.038151987, -0.17960808) * go_0(pixel.xy, 1, 1);\n  result += mat4x4<f32>(0.19728905, -0.040724937, -0.18270236, 0.046735186, 0.03507326, 0.119867206, -0.12691991, 0.18119748, -0.052895024, 0.11348764, -0.043787055, 0.004703516, 0.006752757, -0.06939761, -0.009801806, -0.075640485) * go_1(pixel.xy, -1, -1);\n  result += mat4x4<f32>(0.051735226, 0.1732299, -0.10672899, 0.0320877, -0.4913656, 0.2102274, 0.43920282, 0.059108034, 0.08349019, -0.16517872, 0.15436842, -0.1075667, 0.022741623, -0.26693836, 0.3645307, 0.017874828) * go_1(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.034464058, 0.014929155, 0.054227423, 0.14167373, -0.0023630706, -0.08904212, 0.11918041, -0.034539603, 0.06048089, -0.06807333, 0.14447778, 0.035260547, 0.09979546, -0.1924939, 0.14596114, -0.12069667) * go_1(pixel.xy, -1, 1);\n  result += mat4x4<f32>(-0.04427228, -0.23673469, 0.010357103, -0.2907043, -0.06845721, -0.078984015, 0.06867713, -0.058163825, -0.12154615, 0.08430951, 0.1922373, 0.030108064, -0.43081748, -0.38715646, -0.022240646, -0.15403675) * go_1(pixel.xy, 0, -1);\n  result += mat4x4<f32>(0.46885306, -0.33421394, -0.6695223, -0.41841158, 0.30317923, 0.24244753, -0.1047785, -0.18656285, 0.06261881, -0.4405616, 0.24233986, 0.40070608, 0.81440526, 0.11305212, -0.8826317, -0.023478031) * go_1(pixel.xy, 0, 0);\n  result += mat4x4<f32>(-0.07879348, -0.024378026, -0.041883785, -0.17030984, 0.23229122, -0.011237109, 0.12058088, 0.20766267, -0.36519575, 0.09599417, -0.1271098, 0.06990154, 0.21161246, 0.041002538, -0.36046275, 0.007304667) * go_1(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.10873893, 0.003872542, -0.13476561, -0.036068805, -0.054637462, 0.02304618, 0.04707738, -0.2856381, 0.07124422, 0.010866545, 0.20484549, -0.008342406, -0.43660247, -0.041055538, 0.33536008, -0.060022205) * go_1(pixel.xy, 1, -1);\n  result += mat4x4<f32>(0.1966458, 0.0016302796, -0.25712642, -0.09639119, -0.006955351, 0.10882133, 0.1107341, 0.062697805, -0.1074494, 0.17361663, 0.6429869, -0.39846307, -0.26302996, 0.048710946, 0.40387508, 0.4299715) * go_1(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.18948616, 0.24086732, -0.064474985, -0.11069709, 0.1279659, -0.13438123, -0.028438117, 0.125883, 0.018153818, -0.21942288, 0.020390838, -0.22797634, -0.10821287, -0.17175092, 0.122016855, 0.20699544) * go_1(pixel.xy, 1, 1);\n  result += vec4f(-0.05101961, -0.060740646, -0.024465766, 0.058471628);\n  textureStore(conv2d_3_tf_tex, pixel.xy, result);\n}\n"},645:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x3x3x8\n// Name: conv2d4tf\n// Inputs: ['conv2d_3_tf']\n// Output: conv2d_4_tf\n@group(0) @binding(0) var conv2d_3_tf_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_4_tf_tex: texture_storage_2d<rgba16float, write>;\nfn max4(vector: vec4f, value: f32) -> vec4f {\n  return max(vector, vec4f(value));\n}\n\nfn go_0(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(textureLoad(conv2d_3_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\nfn go_1(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(-textureLoad(conv2d_3_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_4_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(-0.14533128, 0.07266841, 0.13238011, -0.23328504, 0.031516243, 0.058471266, -0.06394412, 0.090752736, -0.0042359144, 0.12357294, -0.04377495, 0.0011743477, 0.05412243, -0.08146249, 0.04002749, -0.032876283) * go_0(pixel.xy, -1, -1);\n  result += mat4x4<f32>(-0.036972385, -0.15238069, -0.3453321, -0.36025128, 0.07597202, -0.02368151, -0.3889606, 0.34607083, 0.3133179, -0.21712309, -0.4210954, 0.21450534, 0.15226828, 0.25326282, 0.45327064, -0.3350824) * go_0(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.019018406, -0.33060563, -0.092601225, 0.14970545, 0.1441509, -0.19228427, -0.032771986, 0.26331595, 0.052981265, -0.06627376, -0.08634131, 0.038706224, 0.13403937, -4.4842476e-05, 0.049002815, -0.12719193) * go_0(pixel.xy, -1, 1);\n  result += mat4x4<f32>(0.17527401, -0.0035254909, -0.047959115, -0.4526988, -0.07510284, 0.0013256798, -0.07539148, 0.24220634, -0.08708839, -0.14494033, -0.17085724, -0.099797316, 0.0068515535, -0.08918779, 0.27164719, -0.1702649) * go_0(pixel.xy, 0, -1);\n  result += mat4x4<f32>(0.31848368, 0.48983255, -0.44140294, -0.65174145, -0.004199057, 0.19494705, 0.5196497, -0.027118586, 0.032509074, -0.23900363, -0.14489244, 0.36314297, -0.23168536, -0.20960593, 0.61471456, 0.12401275) * go_0(pixel.xy, 0, 0);\n  result += mat4x4<f32>(-0.24317405, 0.21560913, 0.15564032, 0.11606844, -0.15039803, -0.59578896, 0.14100945, -0.026194477, 0.37237462, -0.49472088, -0.15215331, -0.38820064, -0.25089455, -0.29643852, -0.09513793, 0.019779462) * go_0(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.12498539, 0.0710632, -0.25012368, -0.2272255, -0.08647026, 0.12277892, 0.011025097, -0.12168395, -0.13489573, 0.016708186, -0.15583871, -0.057124946, 0.1216943, 0.019803725, 0.06952334, -0.032985855) * go_0(pixel.xy, 1, -1);\n  result += mat4x4<f32>(0.28794885, 0.33783793, -0.14469545, -0.081780486, -0.50320613, -0.067601606, -0.06847453, -0.021648854, -0.34295765, 0.15071863, -0.06619896, -0.084465064, 0.31909832, 0.015414661, 0.14930317, -0.11295768) * go_0(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.24530606, 0.25526014, 0.09971985, -0.07749641, -0.2361951, -0.07997673, 0.03617294, 0.02959561, -0.4498983, -0.014073485, -0.20587012, 0.06396779, 0.1262825, 0.027433183, 0.14469334, 0.011538011) * go_0(pixel.xy, 1, 1);\n  result += mat4x4<f32>(-0.038572453, -0.023108613, -0.039481267, -0.012160024, -0.004521989, -0.028665857, 0.04295255, 0.10580258, 0.05439479, -0.072261885, 0.11030243, 0.08934696, 0.09133867, 0.017547369, 0.097613186, 0.05491059) * go_1(pixel.xy, -1, -1);\n  result += mat4x4<f32>(-0.09972817, 0.057730395, 0.12665828, 0.32861367, -0.16186063, 0.0745509, 0.2394045, -0.08687853, -0.034404907, -0.05843572, 0.0684561, -0.1355754, 0.19248672, -0.60372186, 0.12583947, 0.4388962) * go_1(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.10341107, 0.061113223, 0.08773817, -0.082504354, -0.16612078, 0.2681751, 0.019737698, -0.17122322, -0.135949, 0.3048101, 0.087803006, 0.11373851, 0.013192192, -0.27022064, 0.35529897, -0.15321451) * go_1(pixel.xy, -1, 1);\n  result += mat4x4<f32>(-0.032835662, 0.11123062, -0.11322452, -0.17300649, 0.04680824, 0.12849288, 0.17269878, -0.048671383, 0.05189037, -0.009078046, 0.22105052, 0.013008137, -0.009738674, 0.15391739, 0.20969556, 0.14189166) * go_1(pixel.xy, 0, -1);\n  result += mat4x4<f32>(-0.47377753, 0.3038031, 0.18604809, 0.1931698, -0.2964668, -0.12287907, -0.7107761, 0.26619422, -0.33923018, 0.19200724, 0.013786281, -0.17496964, 0.079325035, -0.3694445, 0.0054486147, -0.33018264) * go_1(pixel.xy, 0, 0);\n  result += mat4x4<f32>(0.14903802, -0.028043179, 1.5238678e-05, 0.021232028, 0.16025065, 0.14746875, -0.22831628, -0.12177345, 0.038778774, 0.32188168, -0.042017702, 0.27155936, 0.17920609, 0.04099755, 0.28527525, 0.074623376) * go_1(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.057019282, -0.112741895, 0.030361209, 0.14567861, 0.056265317, -0.01573537, -0.06707608, 0.016657263, 0.09829025, -0.026795063, 0.023042196, 0.09438241, -0.025483066, -0.052787006, 0.19730279, 0.021218104) * go_1(pixel.xy, 1, -1);\n  result += mat4x4<f32>(0.19868211, -0.01531125, 0.108596824, -0.035456363, 0.0033609823, 0.057961613, -0.013726211, 0.101742364, 0.33357215, 0.14468077, 0.29711527, -0.24662566, -0.119014986, -0.1899639, 0.11246697, -0.0035374009) * go_1(pixel.xy, 1, 0);\n  result += mat4x4<f32>(-0.05602109, -0.15539522, 0.010730943, 0.057116497, -0.02037749, 0.084210664, -0.028235348, 0.10574697, 0.056925274, 0.07922333, -0.090088, 0.1615985, -0.0044301567, -0.089945644, 0.024176618, -0.041844133) * go_1(pixel.xy, 1, 1);\n  result += vec4f(0.0015292584, -0.043625206, -0.09429898, -0.06280405);\n  textureStore(conv2d_4_tf_tex, pixel.xy, result);\n}\n"},701:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x3x3x8\n// Name: conv2d5tf\n// Inputs: ['conv2d_4_tf']\n// Output: conv2d_5_tf\n@group(0) @binding(0) var conv2d_4_tf_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_5_tf_tex: texture_storage_2d<rgba16float, write>;\nfn max4(vector: vec4f, value: f32) -> vec4f {\n  return max(vector, vec4f(value));\n}\n\nfn go_0(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(textureLoad(conv2d_4_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\nfn go_1(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(-textureLoad(conv2d_4_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_5_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(0.06051604, -0.028152643, -0.21418124, 0.13032125, 0.42565975, -0.09571944, -0.34494513, 0.30004, -0.073245734, -0.028659137, 0.0032105136, -0.05009555, -0.048971225, 0.04814533, 0.002843805, -0.046224426) * go_0(pixel.xy, -1, -1);\n  result += mat4x4<f32>(-0.07495975, 0.018714864, 0.21229684, -0.13614887, 0.79988647, -0.0697328, 0.38232988, 0.24165109, 0.25947478, -0.0009418982, -0.17369923, 0.10007766, 0.024117598, 0.028611807, 0.15090801, -0.06344829) * go_0(pixel.xy, -1, 0);\n  result += mat4x4<f32>(-0.07982219, 0.0900347, 0.007609254, -0.0034791247, 0.013611781, -0.13560618, 0.09685799, 0.06276075, 0.134693, -0.14370437, -0.25175703, -0.0016138123, -0.0075672898, -0.13325731, -0.061100446, 0.0059743375) * go_0(pixel.xy, -1, 1);\n  result += mat4x4<f32>(-0.039018434, -0.19668463, -0.43018532, 0.31886247, 0.4965479, 0.114569925, 0.19110382, 0.27343535, 0.0707728, -0.11877004, -0.25827697, 0.37012872, 0.1474777, 0.07056952, -0.14965728, 0.061595406) * go_0(pixel.xy, 0, -1);\n  result += mat4x4<f32>(0.506543, -0.16268773, 0.455319, -0.0702646, 0.70102173, -0.14041683, 0.70184857, 0.4817842, -0.3389246, -0.14463086, 0.13763213, -1.1259074, 0.47722015, 0.38352612, -0.04293366, -0.5604627) * go_0(pixel.xy, 0, 0);\n  result += mat4x4<f32>(0.17606944, 0.15897374, 0.13499324, 0.29241478, -0.032824475, 0.11128662, -0.22204424, -0.051803727, 0.013195331, -0.42040786, -0.3950585, 0.70745844, 0.38646924, -0.19080774, -0.15171832, -0.10742828) * go_0(pixel.xy, 0, 1);\n  result += mat4x4<f32>(-0.039278325, 0.18421806, -0.044948544, 0.07902063, -0.2149251, 0.09913459, -0.09743655, -0.26899317, -0.002695496, -0.07554527, -0.22373366, 0.17830558, -0.047994815, -0.06789183, -0.06755918, -0.104452066) * go_0(pixel.xy, 1, -1);\n  result += mat4x4<f32>(-0.0493473, -0.30411786, -0.056439694, -0.06582185, -0.21309847, 0.100670904, -0.22966193, -0.045954112, 0.12728062, -0.25081897, -0.094699375, -0.4036555, 0.060854495, -0.64373237, -0.21522263, -0.6683476) * go_0(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.063481025, 0.11744312, -0.043330096, 0.33817932, -0.06679828, -0.23207302, -0.10188898, -0.10590511, 0.058780864, 0.047292337, -0.11834696, 0.10076128, -0.036641665, 0.30200714, -0.0002892557, -0.10303763) * go_0(pixel.xy, 1, 1);\n  result += mat4x4<f32>(-0.10842604, 0.042055763, 0.29702973, -0.07409644, -0.030164458, -0.012098744, -0.06396587, -0.08787527, 0.051854923, 0.12997511, 0.11468497, 0.15022379, 0.007814715, 0.014517445, 0.025484756, 0.01078619) * go_1(pixel.xy, -1, -1);\n  result += mat4x4<f32>(-0.29229385, 0.040265664, -0.15376821, 0.075579196, -0.05593569, -0.045405343, 0.12099204, 0.1571252, 0.17841713, 0.04673325, 0.14550509, 0.08603346, -0.049786013, 0.06121843, -0.16273825, -0.13857752) * go_1(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.06903744, 0.2628764, -0.13582836, -0.35678583, -0.13821034, -0.019381443, -0.19570538, -0.09298511, 0.08965436, 0.09745909, 0.20055099, 0.024967568, 0.08144204, 0.004633625, 0.12809834, -0.009431525) * go_1(pixel.xy, -1, 1);\n  result += mat4x4<f32>(0.09784006, 0.010729353, 0.046643205, -0.110926524, -0.21556224, 0.00016300633, 0.122175336, 0.15004392, 0.013864355, 0.24767809, 0.13865592, 0.0155424485, -0.1450483, -0.15688781, -0.06195043, -0.13745981) * go_1(pixel.xy, 0, -1);\n  result += mat4x4<f32>(0.018991318, 0.55401963, 0.11709872, -0.028442185, -0.46035343, -0.10215539, -0.60193926, 0.47882316, -0.23346989, 0.037200127, 0.22814943, -0.08231696, -0.36430013, -0.011152757, 0.48752213, 0.29796222) * go_1(pixel.xy, 0, 0);\n  result += mat4x4<f32>(-0.07258066, -0.023222538, 0.23230423, -0.30317304, 0.03942911, -0.06899803, 0.23778579, 0.07418621, -0.17443737, 0.33387753, 0.007354842, -0.123447575, -0.1745315, 0.11071779, -0.11949625, -0.22832453) * go_1(pixel.xy, 0, 1);\n  result += mat4x4<f32>(-0.024909232, -0.0308135, 0.12170621, -0.13298757, 0.045828197, -0.1532345, -0.06633672, 0.23591088, 0.04964077, 0.14091493, 0.038343724, -0.029780807, 0.05762822, -0.048930667, -0.02434709, 0.07109019) * go_1(pixel.xy, 1, -1);\n  result += mat4x4<f32>(-0.16039175, 0.3004474, -0.17278233, 0.13677922, 0.18838613, 0.15054552, 0.32901475, -0.1288333, 0.26378244, -0.05119892, 0.34533516, 0.25180495, 0.19452183, 0.0843233, -0.08029368, 0.39877903) * go_1(pixel.xy, 1, 0);\n  result += mat4x4<f32>(-0.07097129, -0.26492423, -0.055032317, -0.093516104, -0.11795062, 0.04086253, -0.07989471, 0.059686553, 0.09378249, 0.45851848, 0.2510942, 0.19599153, 0.019765077, -0.02920918, -0.04125142, -0.13859107) * go_1(pixel.xy, 1, 1);\n  result += vec4f(0.04400571, -0.04015565, 0.0140529545, 0.05474095);\n  textureStore(conv2d_5_tf_tex, pixel.xy, result);\n}\n"},874:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x3x3x8\n// Name: conv2d6tf\n// Inputs: ['conv2d_5_tf']\n// Output: conv2d_6_tf\n@group(0) @binding(0) var conv2d_5_tf_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_6_tf_tex: texture_storage_2d<rgba16float, write>;\nfn max4(vector: vec4f, value: f32) -> vec4f {\n  return max(vector, vec4f(value));\n}\n\nfn go_0(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(textureLoad(conv2d_5_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\nfn go_1(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return max4(-textureLoad(conv2d_5_tf_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0), 0.0);\n}\n\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_6_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(-0.014236042, -0.0031431736, -0.1551387, 0.12515116, -0.28528872, 0.36161992, 0.15750743, -0.17111474, 0.13792591, -0.0657419, -0.17471549, 0.14650472, 0.034169197, -0.019157575, 0.23520657, -0.20358163) * go_0(pixel.xy, -1, -1);\n  result += mat4x4<f32>(0.02015035, 0.12993371, 0.11199667, -0.09854378, 0.5001741, 0.03462961, 0.24919736, 0.08505297, -0.20902094, -0.24141377, -0.15360375, 0.049974803, -0.037157424, -0.048510186, 0.20106035, -0.118480384) * go_0(pixel.xy, -1, 0);\n  result += mat4x4<f32>(0.086798504, -0.009607818, 0.034812123, -0.005187592, 0.0351509, 0.021755, -0.04996161, -0.041231696, 0.0020545553, 0.015730752, -0.07507172, 0.018597523, -0.02393343, 0.07624775, 0.03892451, -0.0025574185) * go_0(pixel.xy, -1, 1);\n  result += mat4x4<f32>(0.035725456, 0.06809103, 0.51926994, -0.39983147, -0.16402833, -0.1243394, -0.25922915, 0.28285915, 0.15959994, -0.2351732, 0.2650535, -0.30193794, -0.11468332, 0.050777763, -0.51894253, 0.4408367) * go_0(pixel.xy, 0, -1);\n  result += mat4x4<f32>(-0.27042082, 0.22243942, 0.14902467, 0.38428563, 0.46612173, 0.5169912, -0.22330502, -0.11300288, -0.36141354, 0.0668681, 0.2984152, 0.1275798, -0.24121419, 0.2952039, -0.45109174, -0.3822957) * go_0(pixel.xy, 0, 0);\n  result += mat4x4<f32>(0.26543504, -0.05742226, -0.052103903, -0.013124308, -0.14358385, -0.04024543, 0.07665455, -0.012301872, -0.18752757, -0.03913891, 0.038205814, -0.006583095, -0.25550908, -0.25725332, -0.12454206, -0.0058936924) * go_0(pixel.xy, 0, 1);\n  result += mat4x4<f32>(-0.0018946569, 0.019746022, -0.13080788, 0.11450627, -0.013743845, -0.027179785, -0.14425103, 0.07109661, 0.023703793, 0.086905524, 0.03151253, 0.0132474145, 0.041018624, 0.04548913, 0.2718715, -0.20008296) * go_0(pixel.xy, 1, -1);\n  result += mat4x4<f32>(-0.076830454, 0.11652955, 0.5068201, -0.3082819, 0.058615055, -0.006765798, -0.057522714, 0.049981344, -0.006897243, -0.21763432, 0.16896053, -0.21176189, -0.061227098, 0.03566485, 0.08901554, -0.050980624) * go_0(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.02327798, 0.07662976, 0.034811985, -0.03238033, -0.0021881019, -0.030997375, -0.069672935, 0.04040273, -0.1217442, 0.104173124, 0.09862539, 0.020557549, -0.022286594, 0.10287763, -0.021694934, 0.07542515) * go_0(pixel.xy, 1, 1);\n  result += mat4x4<f32>(0.124069154, -0.08579466, -0.07816314, 0.11332851, -0.034682628, -0.11038275, 0.04750615, -0.096100725, 0.039588403, -0.15149672, -0.05529172, 0.034304325, -0.022520235, -0.05023852, -0.2674731, 0.21886522) * go_1(pixel.xy, -1, -1);\n  result += mat4x4<f32>(-0.1948599, -0.14946899, -0.39548838, 0.18042913, -0.007919619, 0.19826505, 0.23789087, 0.009140256, 0.11857748, 0.18215668, 0.13606293, -0.09209675, -0.080678545, -0.020431137, -0.07728839, -0.051353537) * go_1(pixel.xy, -1, 0);\n  result += mat4x4<f32>(-0.07616472, -0.0032800382, -0.045657665, -0.039144326, -0.37786487, -0.08877774, 0.053579114, -0.070886396, 0.011311804, 0.107276045, 0.013236154, 0.009832061, 0.08292063, 0.12258811, 0.0005569043, -0.009806432) * go_1(pixel.xy, -1, 1);\n  result += mat4x4<f32>(-0.28062925, 0.15946878, -0.1021801, -0.06471589, -0.26999477, 0.21230288, -0.14243907, 0.2555922, -0.09608517, 0.26339412, 0.20891234, -0.23538485, 0.33958244, -0.12569186, 0.43289876, -0.33462036) * go_1(pixel.xy, 0, -1);\n  result += mat4x4<f32>(0.16265294, 0.2625464, -0.34452894, 0.2233622, 0.13850005, -0.42999864, -0.5385177, -0.11035979, 0.51662, -0.78238726, -0.09422375, 0.83759475, 0.44468537, 0.14301361, 0.108906105, 1.1596143) * go_1(pixel.xy, 0, 0);\n  result += mat4x4<f32>(-0.73757625, -0.12369605, 0.23523071, 0.006587637, -0.15445381, 0.22757277, 0.052819528, 0.10183905, -0.07912228, -0.16998893, -0.13360223, 0.014348178, -0.17778571, -0.41047302, 0.10241381, -0.08526306) * go_1(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.14712952, 0.048995696, 0.05299946, -0.06817572, 0.1498064, -0.079825334, 0.40354064, -0.31789717, -0.1998377, 0.00955295, -0.32318407, 0.30898204, -0.039571725, -0.026203401, -0.16292085, 0.08574385) * go_1(pixel.xy, 1, -1);\n  result += mat4x4<f32>(-0.6353329, -0.56000775, -0.17279743, 0.18198174, -0.19555812, 0.056538377, 0.34365895, -0.07799055, 0.19011354, -0.13952748, 0.029196098, -0.19596763, -0.069196045, -0.17402656, 0.07948411, -0.016226962) * go_1(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.25592864, 0.083498634, -0.28515807, 0.10789751, 0.0043962947, 0.07085363, 0.048724182, -0.025131436, -0.0049440865, -0.033094388, -0.032935806, 0.04266025, 0.20026933, 0.0927841, -0.006839351, -0.013012285) * go_1(pixel.xy, 1, 1);\n  result += vec4f(0.02021373, 0.0014037411, 0.0012718709, 0.017278494);\n  textureStore(conv2d_6_tf_tex, pixel.xy, result);\n}\n"},385:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x1x1x56\n// Name: conv2dlasttf\n// Inputs: ['conv2d_tf', 'conv2d_1_tf', 'conv2d_2_tf', 'conv2d_3_tf', 'conv2d_4_tf', 'conv2d_5_tf', 'conv2d_6_tf']\n// Output: conv2d_last_tf\n@group(0) @binding(0) var conv2d_tf_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_1_tf_tex: texture_2d<f32>;\n@group(0) @binding(2) var conv2d_2_tf_tex: texture_2d<f32>;\n@group(0) @binding(3) var conv2d_3_tf_tex: texture_2d<f32>;\n@group(0) @binding(4) var conv2d_4_tf_tex: texture_2d<f32>;\n@group(0) @binding(5) var conv2d_5_tf_tex: texture_2d<f32>;\n@group(0) @binding(6) var conv2d_6_tf_tex: texture_2d<f32>;\n@group(0) @binding(7) var conv2d_last_tf_tex: texture_storage_2d<rgba16float, write>;\nfn max4(vector: vec4f, value: f32) -> vec4f {\n  return max(vector, vec4f(value));\n}\n\nfn g_0(pos: vec2u) -> vec4f {\n  return max4(textureLoad(conv2d_tf_tex, pos, 0), 0.0);\n}\n\nfn g_1(pos: vec2u) -> vec4f {\n  return max4(-textureLoad(conv2d_tf_tex, pos, 0), 0.0);\n}\n\nfn g_2(pos: vec2u) -> vec4f {\n  return max4(textureLoad(conv2d_1_tf_tex, pos, 0), 0.0);\n}\n\nfn g_3(pos: vec2u) -> vec4f {\n  return max4(-textureLoad(conv2d_1_tf_tex, pos, 0), 0.0);\n}\n\nfn g_4(pos: vec2u) -> vec4f {\n  return max4(textureLoad(conv2d_2_tf_tex, pos, 0), 0.0);\n}\n\nfn g_5(pos: vec2u) -> vec4f {\n  return max4(-textureLoad(conv2d_2_tf_tex, pos, 0), 0.0);\n}\n\nfn g_6(pos: vec2u) -> vec4f {\n  return max4(textureLoad(conv2d_3_tf_tex, pos, 0), 0.0);\n}\n\nfn g_7(pos: vec2u) -> vec4f {\n  return max4(-textureLoad(conv2d_3_tf_tex, pos, 0), 0.0);\n}\n\nfn g_8(pos: vec2u) -> vec4f {\n  return max4(textureLoad(conv2d_4_tf_tex, pos, 0), 0.0);\n}\n\nfn g_9(pos: vec2u) -> vec4f {\n  return max4(-textureLoad(conv2d_4_tf_tex, pos, 0), 0.0);\n}\n\nfn g_10(pos: vec2u) -> vec4f {\n  return max4(textureLoad(conv2d_5_tf_tex, pos, 0), 0.0);\n}\n\nfn g_11(pos: vec2u) -> vec4f {\n  return max4(-textureLoad(conv2d_5_tf_tex, pos, 0), 0.0);\n}\n\nfn g_12(pos: vec2u) -> vec4f {\n  return max4(textureLoad(conv2d_6_tf_tex, pos, 0), 0.0);\n}\n\nfn g_13(pos: vec2u) -> vec4f {\n  return max4(-textureLoad(conv2d_6_tf_tex, pos, 0), 0.0);\n}\n\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_last_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(-0.0067711817, 0.08160003, 0.0247279, 0.03084815, -0.026977416, -0.02120602, -0.025078611, -0.029852165, -0.011627478, -0.012742972, 0.022736797, -0.0028815821, -0.007515677, 0.0172887, -0.023259213, 0.009608947) * g_0(pixel.xy);\n  result += mat4x4<f32>(-0.028660107, -0.014015208, -0.027838672, -0.013171922, 0.0029435428, 0.027047642, -0.017478354, 0.022834882, -0.037572853, -0.0034044068, -0.0149029335, -0.013362301, 0.009827443, -0.015742151, -0.0074795415, -0.0022266617) * g_1(pixel.xy);\n  result += mat4x4<f32>(-0.07579662, -0.039754186, -0.066026606, -0.046816852, 0.1099032, 0.043956704, 0.073109835, 0.04680284, -0.06896613, -0.008838632, -0.044584926, -0.01319039, -0.0021152915, -0.04503326, 0.027061926, -0.028334105) * g_2(pixel.xy);\n  result += mat4x4<f32>(0.15458213, 0.059769996, 0.09327123, -0.028782733, 0.023459995, -0.15390377, -0.13432898, -0.1127775, 0.072764635, -0.0020463336, 0.034736466, -0.0012086042, -0.05847183, -0.029952323, 0.052969377, 0.09590908) * g_3(pixel.xy);\n  result += mat4x4<f32>(-0.07476772, -0.016574614, 0.04131183, 0.017335678, 0.009654406, 0.072183535, -0.002266456, 0.086873695, 9.310129e-05, 0.0056416965, -0.004188391, 0.023132093, -0.05183336, -0.025825873, -0.03684392, -0.0075729224) * g_4(pixel.xy);\n  result += mat4x4<f32>(0.00878842, 0.03869637, -0.035759524, 0.003345386, -0.064184256, -0.034568302, -0.06672922, -0.0686381, -0.06794392, -0.10685906, 0.04679947, -0.012535639, 0.006932529, -0.007783515, 0.109123886, 0.13804391) * g_5(pixel.xy);\n  result += mat4x4<f32>(-0.03160699, 0.050473, -0.09030729, 0.0649397, 0.11466501, 0.17912874, -0.0081851315, 0.052244574, 0.051632743, 0.061941486, 0.06546816, 0.12174249, -0.05104755, -0.018193979, -0.032196652, -0.035292786) * g_6(pixel.xy);\n  result += mat4x4<f32>(0.013612735, -0.0024100312, -0.068611205, -0.07369285, -0.019647537, -0.066944756, -0.010012875, -0.06785739, -0.062246565, -0.087313406, -0.044278186, -0.09368995, 0.052555013, 0.13604961, 0.05645059, 0.08763303) * g_7(pixel.xy);\n  result += mat4x4<f32>(0.04218486, -0.05028401, 0.059086576, -0.03545452, 0.027737848, 0.0043074046, 0.0011001764, -0.073026665, -0.04094988, 0.044061556, -0.009812515, 0.06841999, -0.06612581, 0.037223976, -0.07759491, -0.04356598) * g_8(pixel.xy);\n  result += mat4x4<f32>(-0.027558247, 0.014248466, -0.019813016, -0.058107473, -0.016717663, -0.020424338, 0.0053625097, -0.009917319, 0.013678771, 0.0113340765, 0.0061787106, -0.036083996, -0.020179711, -0.011310535, 0.054827053, -0.0008278952) * g_9(pixel.xy);\n  result += mat4x4<f32>(0.028690035, -0.012079616, 0.11931408, -0.048533775, 0.069336995, 0.0049852817, 0.013774468, 0.035233382, -0.07384821, 0.0003354423, -0.0059171803, -0.04503906, 0.08727279, 0.005138857, -0.17724465, 0.055782065) * g_10(pixel.xy);\n  result += mat4x4<f32>(-0.20744391, 0.24348328, -0.3145766, 0.17026486, -0.022870807, -0.01648648, -0.05912279, -0.012555373, -0.066004686, 0.03182394, 0.16285324, -0.1221846, -0.31816196, 0.007928748, 0.43180224, -0.015949022) * g_11(pixel.xy);\n  result += mat4x4<f32>(0.16363169, 0.14781676, -0.2377973, -0.1571377, -0.09038187, 0.0046504294, 0.033955004, -0.051421452, 0.046735536, 0.006827522, -0.121338, 0.12671822, 0.15833299, -0.1858712, -0.1942371, 0.17336044) * g_12(pixel.xy);\n  result += mat4x4<f32>(-0.018145572, -0.015550516, 0.044410378, 0.046016492, 0.084021375, 0.05327457, -0.008270992, -0.045435544, 0.07185879, -0.131923, 0.26721445, -0.26745328, -0.07093472, 0.042701527, 0.13793674, -0.095621444) * g_13(pixel.xy);\n  result += vec4f(0.016836504, 0.010161949, 0.021351453, 0.01278978);\n  textureStore(conv2d_last_tf_tex, pixel.xy, result);\n}\n"},817:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="// Layer: Anime4K-v3.2-Upscale-CNN-x2-(M)-Conv-4x3x3x3\n// Name: conv2dtf\n// Inputs: ['MAIN']\n// Output: conv2d_tf\n@group(0) @binding(0) var MAIN_tex: texture_2d<f32>;\n@group(0) @binding(1) var conv2d_tf_tex: texture_storage_2d<rgba16float, write>;\n\nfn go_0(pos: vec2u, x_off: i32, y_off: i32) -> vec4f {\n  return textureLoad(MAIN_tex, vec2i(i32(pos.x) + x_off, i32(pos.y) + y_off), 0);\n}\n\n@compute\n@workgroup_size(8, 8)\nfn computeMain(@builtin(global_invocation_id) pixel: vec3u) {\n  // OOB check\n  let dim_out: vec2u = textureDimensions(conv2d_tf_tex);\n  if (pixel.x >= dim_out.x || pixel.y >= dim_out.y) {\n    return;\n  }\n  \n  var result: vec4f = vec4f(0.0);\n  result += mat4x4<f32>(-0.010995803, 0.077095956, -0.043992598, 0.06048717, 0.1164834, -0.11689607, 0.072985925, -0.078805886, 0.01182932, 0.054985743, -0.09018186, 0.044907484, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, -1, -1);\n  result += mat4x4<f32>(0.1813623, -0.14752422, 0.025720436, -0.17639883, 0.15697388, 0.10445984, -0.1843076, 0.5264643, 0.047516696, -0.097305484, 0.09740847, -0.29619336, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, -1, 0);\n  result += mat4x4<f32>(-0.014534763, 0.09486465, 0.046173926, 0.039391946, 0.09609376, -0.060574662, 0.042200956, -0.3269777, 0.051006425, 0.059818447, 0.04366627, 0.17699827, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, -1, 1);\n  result += mat4x4<f32>(0.04268535, -0.08152529, 0.10577459, -0.036936995, -0.051562306, 0.054872766, 0.09194519, 0.0025066638, -0.01073954, 0.00064474024, 0.10038221, 0.02131141, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, 0, -1);\n  result += mat4x4<f32>(-0.51751363, -0.40028602, 0.3469574, 0.5933738, -0.91357684, -0.67692596, 0.57815677, 0.39809322, -0.16341521, -0.27169713, 0.12232366, 0.4318641, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, 0, 0);\n  result += mat4x4<f32>(0.12601124, -0.06263236, -0.45907676, -0.41514075, 0.3330334, -0.1929565, -0.6333532, -0.6552794, -0.045809917, 0.046351526, -0.26173338, -0.30252662, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, 0, 1);\n  result += mat4x4<f32>(0.0030332592, 0.012103107, 0.010537323, -0.02038607, 0.095558085, 0.097704545, 0.083433494, 0.026790185, 0.01943357, -0.061712462, -0.00015703632, -0.032268334, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, 1, -1);\n  result += mat4x4<f32>(0.016870102, 0.5215812, -0.11525501, 0.027527615, -0.09045733, 0.61310345, -0.1575268, 0.1905386, 0.020172214, 0.3503187, -0.08209157, -0.051328037, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, 1, 0);\n  result += mat4x4<f32>(0.005494087, -0.010656317, 0.07682753, -0.08116042, -0.03934524, 0.16589017, 0.101483546, -0.066603065, 0.03494657, -0.07885597, 0.074227594, 0.0016264897, 0.0, 0.0, 0.0, 0.0) * go_0(pixel.xy, 1, 1);\n  result += vec4f(0.014463938, -0.0031906287, 0.007015422, -0.003888468);\n  textureStore(conv2d_tf_tex, pixel.xy, result);\n}\n"},334:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="struct VertexOutput {\n  @builtin(position) Position : vec4<f32>,\n  @location(0) fragUV : vec2<f32>,\n}\n\n@vertex\nfn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {\n  const pos = array(\n    vec2( 1.0,  1.0),\n    vec2( 1.0, -1.0),\n    vec2(-1.0, -1.0),\n    vec2( 1.0,  1.0),\n    vec2(-1.0, -1.0),\n    vec2(-1.0,  1.0),\n  );\n\n  const uv = array(\n    vec2(1.0, 0.0),\n    vec2(1.0, 1.0),\n    vec2(0.0, 1.0),\n    vec2(1.0, 0.0),\n    vec2(0.0, 1.0),\n    vec2(0.0, 0.0),\n  );\n\n  var output : VertexOutput;\n  output.Position = vec4(pos[VertexIndex], 0.0, 1.0);\n  output.fragUV = uv[VertexIndex];\n  return output;\n}\n"},777:(e,t,n)=>{n.r(t),n.d(t,{default:()=>r});const r="@group(0) @binding(1) var mySampler: sampler;\n@group(0) @binding(2) var myTexture: texture_2d<f32>;\n\n@fragment\nfn main(@location(0) fragUV : vec2f) -> @location(0) vec4f {\n  return textureSampleBaseClampToEdge(myTexture, mySampler, fragUV);\n}\n"},747:function(e,t,n){var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.ClampHighlights=void 0;const i=r(n(986)),o=r(n(261)),u=r(n(679));t.ClampHighlights=class{constructor({device:e,inputTexture:t,name:n="clamp highlights"}){this.name=n,this.outputTexture=e.createTexture({label:`${n}: clamp_highlights_texture`,size:[t.width,t.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING});const r=e.createTexture({label:`${n}: statsmax_texture`,size:[t.width,t.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING}),a=e.createTexture({label:`${n}: statsmax_texture`,size:[t.width,t.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING}),l=e.createBindGroupLayout({label:`${n} lumination bind group layout`,entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float"}}]}),x=e.createBindGroupLayout({label:`${n} clamp bind group layout`,entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{}},{binding:1,visibility:GPUShaderStage.COMPUTE,texture:{}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float"}}]}),p=e.createShaderModule({label:`${n}: luminationX Module`,code:i.default}),c=e.createShaderModule({label:`${n}: luminationY Module`,code:o.default}),s=e.createShaderModule({label:`${n}: clamp Module`,code:u.default}),f=e.createPipelineLayout({label:`${n} lumination pipeline layout`,bindGroupLayouts:[l]}),_=e.createPipelineLayout({label:`${n} clamp pipeline layout`,bindGroupLayouts:[x]}),d=e.createComputePipeline({label:`${n} luminationX pipeline`,layout:f,compute:{module:p,entryPoint:"computeMain"}}),v=e.createComputePipeline({label:`${n} luminationY pipeline`,layout:f,compute:{module:c,entryPoint:"computeMain"}}),g=e.createComputePipeline({label:`${n} clamp pipeline`,layout:_,compute:{module:s,entryPoint:"computeMain"}});this.pipelines={luminationXPipeline:d,luminationYPipeline:v,clampPipeline:g};const m=e.createBindGroup({label:`${n} luminationX bind group`,layout:l,entries:[{binding:0,resource:t.createView()},{binding:1,resource:r.createView()}]}),y=e.createBindGroup({label:`${n} luminationY bind group`,layout:l,entries:[{binding:0,resource:r.createView()},{binding:1,resource:a.createView()}]}),h=e.createBindGroup({label:`${n} clamp bind group`,layout:x,entries:[{binding:0,resource:t.createView()},{binding:1,resource:a.createView()},{binding:2,resource:this.outputTexture.createView()}]});this.bindGroups={luminationXBindGroup:m,luminationYBindGroup:y,clampBindGroup:h}}updateParam(e,t){throw new Error(`${this.name} has no param.`)}pass(e){const t=e.beginComputePass();t.setPipeline(this.pipelines.luminationXPipeline),t.setBindGroup(0,this.bindGroups.luminationXBindGroup),t.dispatchWorkgroups(Math.ceil(this.outputTexture.width/8),Math.ceil(this.outputTexture.height/8)),t.end();const n=e.beginComputePass();n.setPipeline(this.pipelines.luminationYPipeline),n.setBindGroup(0,this.bindGroups.luminationYBindGroup),n.dispatchWorkgroups(Math.ceil(this.outputTexture.width/8),Math.ceil(this.outputTexture.height/8)),n.end();const r=e.beginComputePass();r.setPipeline(this.pipelines.clampPipeline),r.setBindGroup(0,this.bindGroups.clampBindGroup),r.dispatchWorkgroups(Math.ceil(this.outputTexture.width/8),Math.ceil(this.outputTexture.height/8)),r.end()}getOutputTexture(){return this.outputTexture}}},457:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.Conv2d=void 0,t.Conv2d=class{constructor({device:e,inputTextures:t,shaderWGSL:n,name:r="conv2d"}){this.name=r;const i=t.length;if(0===i)throw Error(`${r}: 0 input textures for conv2d.`);if(void 0===n)throw Error(`${r}: shader not defined.`);this.outputTexture=e.createTexture({label:`${r}: conv2d_texture`,size:[t[0].width,t[0].height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING});const o=e.createShaderModule({label:`${r}: conv2dModule`,code:n}),u=[];for(let e=0;e<i;e+=1)u.push({binding:e,visibility:GPUShaderStage.COMPUTE,texture:{}});u.push({binding:i,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float"}});const a=e.createBindGroupLayout({label:`${r}: ${i} to 1 convolution bind group layout`,entries:u}),l=[];for(let e=0;e<i;e+=1)l.push({binding:e,resource:t[e].createView()});l.push({binding:i,resource:this.outputTexture.createView()}),this.bindGroup=e.createBindGroup({label:`${r}: bind group`,layout:a,entries:l});const x=e.createPipelineLayout({label:`${r}: pipeline layout`,bindGroupLayouts:[a]});this.pipeline=e.createComputePipeline({label:`${r}: pipeline`,layout:x,compute:{module:o,entryPoint:"computeMain"}})}updateParam(e,t){throw new Error("Method not implemented.")}pass(e){const t=e.beginComputePass();t.setPipeline(this.pipeline),t.setBindGroup(0,this.bindGroup),t.dispatchWorkgroups(Math.ceil(this.outputTexture.width/8),Math.ceil(this.outputTexture.height/8)),t.end()}getOutputTexture(){return this.outputTexture}}},8:function(e,t,n){var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.DepthToSpace=void 0;const i=r(n(486));t.DepthToSpace=class{constructor({device:e,inputTextures:t,name:n="depth to space"}){if(3!==t.length)throw Error(`expect 3 textures for depth2Space, got ${t.length}`);this.name=n,this.outputTexture=e.createTexture({label:`${n}: depth_to_space_texture`,size:[2*t[0].width,2*t[0].height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING});const r=e.createShaderModule({label:`${n}: depthToSpace Module`,code:i.default}),o=e.createBindGroupLayout({label:`${n}depth to space bind group layout`,entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{}},{binding:1,visibility:GPUShaderStage.COMPUTE,texture:{}},{binding:2,visibility:GPUShaderStage.COMPUTE,texture:{}},{binding:3,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float"}}]}),u=e.createPipelineLayout({label:"depth to space pipeline layout",bindGroupLayouts:[o]});this.pipeline=e.createComputePipeline({label:"depth to space pipeline",layout:u,compute:{module:r,entryPoint:"computeMain"}}),this.bindGroup=e.createBindGroup({layout:o,entries:[{binding:0,resource:t[0].createView()},{binding:1,resource:t[1].createView()},{binding:2,resource:t[2].createView()},{binding:3,resource:this.outputTexture.createView()}]})}updateParam(e,t){throw new Error("Method not implemented.")}pass(e){const t=e.beginComputePass();t.setPipeline(this.pipeline),t.setBindGroup(0,this.bindGroup),t.dispatchWorkgroups(Math.ceil(this.outputTexture.width/4),Math.ceil(this.outputTexture.height/4)),t.end()}getOutputTexture(){return this.outputTexture}}},260:function(e,t,n){var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.Downscale=void 0;const i=r(n(617)),o=r(n(265));t.Downscale=class{constructor({device:e,inputTexture:t,targetDimensions:n,name:r="downscale"}){this.name=r,this.outputTexture=e.createTexture({label:`${r} output texture`,size:[n.width,n.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.STORAGE_BINDING});const u=e.createShaderModule({label:"vertex module",code:i.default}),a=e.createShaderModule({label:"fragment module",code:o.default}),l=e.createBindGroupLayout({label:"Render Bind Group Layout",entries:[{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{}}]}),x=e.createPipelineLayout({label:`${r} pipeline layout`,bindGroupLayouts:[l]});this.pipeline=e.createRenderPipeline({layout:x,vertex:{module:u,entryPoint:"vert_main"},fragment:{module:a,entryPoint:"main",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}});const p=e.createSampler({magFilter:"linear",minFilter:"linear"});this.bindGroup=e.createBindGroup({layout:l,entries:[{binding:1,resource:p},{binding:2,resource:t.createView()}]})}updateParam(e,t){throw new Error(`${this.name} has no param`)}pass(e){const t=e.beginRenderPass({colorAttachments:[{view:this.outputTexture.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});t.setPipeline(this.pipeline),t.setBindGroup(0,this.bindGroup),t.draw(6),t.end()}getOutputTexture(){return this.outputTexture}}},853:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.Original=void 0,t.Original=class{constructor({inputTexture:e}){this.outputTexture=e}updateParam(e,t){throw new Error("Method not implemented.")}pass(e){}getOutputTexture(){return this.outputTexture}}},468:function(e,t,n){var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.Overlay=void 0;const i=r(n(155)),o=r(n(545));t.Overlay=class{constructor({device:e,inputTextures:t,outputTextureSize:n,fragmentWGSL:r=o.default,name:u="overlay"}){const a=t.length;if(this.name=u,void 0===r)throw Error(`${u}: shader not defined.`);this.outputTexture=e.createTexture({label:`${u}: output texture`,size:[n[0],n[1],1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.STORAGE_BINDING});const l=e.createShaderModule({label:`${u}: vertex module`,code:i.default}),x=e.createShaderModule({label:`${u}: fragment module`,code:r}),p=[];p.push({binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}});for(let e=1;e<=a;e+=1)p.push({binding:e,visibility:GPUShaderStage.FRAGMENT,texture:{}});const c=e.createBindGroupLayout({label:`${u}: bind group layout`,entries:p}),s=e.createPipelineLayout({label:`${u}: pipeline layout`,bindGroupLayouts:[c]});this.pipeline=e.createRenderPipeline({layout:s,vertex:{module:l,entryPoint:"vert_main"},fragment:{module:x,entryPoint:"main",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"}});const f=e.createSampler({magFilter:"linear",minFilter:"linear"}),_=[];_.push({binding:0,resource:f});for(let e=1;e<=a;e+=1)_.push({binding:e,resource:t[e-1].createView()});this.bindGroup=e.createBindGroup({label:`${u}: bind group`,layout:c,entries:_})}updateParam(e,t){throw new Error(`${this.constructor.name} has no param`)}pass(e){const t=e.beginRenderPass({colorAttachments:[{view:this.outputTexture.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});t.setPipeline(this.pipeline),t.setBindGroup(0,this.bindGroup),t.draw(6),t.end()}getOutputTexture(){return this.outputTexture}}},317:function(e,t,n){var r=this&&this.__createBinding||(Object.create?function(e,t,n,r){void 0===r&&(r=n);var i=Object.getOwnPropertyDescriptor(t,n);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[n]}}),Object.defineProperty(e,r,i)}:function(e,t,n,r){void 0===r&&(r=n),e[r]=t[n]}),i=this&&this.__exportStar||function(e,t){for(var n in e)"default"===n||Object.prototype.hasOwnProperty.call(t,n)||r(t,e,n)};Object.defineProperty(t,"__esModule",{value:!0}),i(n(457),t),i(n(8),t),i(n(468),t),i(n(853),t),i(n(260),t),i(n(747),t)},67:function(e,t,n){var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.CNNx2M=void 0;const i=r(n(817)),o=r(n(324)),u=r(n(575)),a=r(n(91)),l=r(n(645)),x=r(n(701)),p=r(n(874)),c=r(n(385)),s=n(317);t.CNNx2M=class{constructor({device:e,inputTexture:t}){this.pipelines=[];const n=[i.default,o.default,u.default,a.default,l.default,x.default,p.default,c.default];this.pushPipeline(e,[t],n[0],"conv2d_tf");for(let t=1;t<n.length-1;t+=1)this.pushPipeline(e,[this.pipelines[t-1].getOutputTexture()],n[t],`conv2d_${t}_tf`);const r=[];this.fillOutputTextures(r,0,7),this.pushPipeline(e,r,n[n.length-1],"conv2d_last_tf"),r.length=0,r.push(this.getOutputTexture()),r.push(this.getOutputTexture()),r.push(this.getOutputTexture()),this.pipelines.push(new s.DepthToSpace({device:e,inputTextures:r,name:"DepthToSpace"})),this.pipelines.push(new s.Overlay({device:e,inputTextures:[t,this.getOutputTexture()],outputTextureSize:[2*t.width,2*t.height]}))}updateParam(e,t){throw new Error("Method not implemented.")}pass(e){for(let t=0;t<this.pipelines.length;t+=1)this.pipelines[t].pass(e)}getOutputTexture(){return this.pipelines[this.pipelines.length-1].getOutputTexture()}pushPipeline(e,t,n,r){this.pipelines.push(new s.Conv2d({device:e,inputTextures:t,shaderWGSL:n,name:r}))}fillOutputTextures(e,t,n){for(let r=t;r<t+n;r+=1)e.push(this.pipelines[r].getOutputTexture())}}},838:function(e,t,n){var r=this&&this.__awaiter||function(e,t,n,r){return new(n||(n=Promise))((function(i,o){function u(e){try{l(r.next(e))}catch(e){o(e)}}function a(e){try{l(r.throw(e))}catch(e){o(e)}}function l(e){var t;e.done?i(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t)}))).then(u,a)}l((r=r.apply(e,t||[])).next())}))},i=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.render=void 0;const o=i(n(334)),u=i(n(777));t.render=function(e){return r(this,void 0,void 0,(function*(){const{video:t,canvas:n,pipelineBuilder:r}=e;t.readyState<t.HAVE_FUTURE_DATA&&(yield new Promise((e=>{t.onloadeddata=e})));const i=t.videoWidth,a=t.videoHeight,l=yield navigator.gpu.requestAdapter();if(!l)throw new Error("WebGPU not supported");const x=yield l.requestDevice(),p=n.getContext("webgpu"),c=navigator.gpu.getPreferredCanvasFormat();p.configure({device:x,format:c,alphaMode:"premultiplied"});const s=x.createTexture({size:[i,a,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),f=r(x,s),_=x.createBindGroupLayout({label:"Render Bind Group Layout",entries:[{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{}}]}),d=x.createPipelineLayout({label:"Render Pipeline Layout",bindGroupLayouts:[_]}),v=x.createRenderPipeline({layout:d,vertex:{module:x.createShaderModule({code:o.default}),entryPoint:"vert_main"},fragment:{module:x.createShaderModule({code:u.default}),entryPoint:"main",targets:[{format:c}]},primitive:{topology:"triangle-list"}}),g=x.createSampler({magFilter:"linear",minFilter:"linear"}),m=x.createBindGroup({layout:_,entries:[{binding:1,resource:g},{binding:2,resource:f.at(-1).getOutputTexture().createView()}]});t.requestVideoFrameCallback((function e(){t.paused||x.queue.copyExternalImageToTexture({source:t},{texture:s},[i,a]);const n=x.createCommandEncoder();f.forEach((e=>{e.pass(n)}));const r=n.beginRenderPass({colorAttachments:[{view:p.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});r.setPipeline(v),r.setBindGroup(0,m),r.draw(6),r.end(),x.queue.submit([n.finish()]),t.requestVideoFrameCallback(e)}))}))}}},t={};function n(r){var i=t[r];if(void 0!==i)return i.exports;var o=t[r]={exports:{}};return e[r].call(o.exports,o,o.exports,n),o.exports}n.d=(e,t)=>{for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var r={};return(()=>{var e=r;Object.defineProperty(e,"__esModule",{value:!0}),e.render=e.CNNx2M=void 0;var t=n(67);Object.defineProperty(e,"CNNx2M",{enumerable:!0,get:function(){return t.CNNx2M}});var i=n(838);Object.defineProperty(e,"render",{enumerable:!0,get:function(){return i.render}})})(),r})()));

/* AppleTV AG Native — UI theme for Lampa
 * Copied verbatim (unmodified) from:
 * https://llowmikee.github.io/AppleTVAGNativeNG/appletv_agnative.js
 * Self-guarded: window.__APPLETV_AGNATIVE_TOPNAV__ prevents double initialization.
 * Has its own settings component (AppleTV AG Native) in Lampa settings.
 */
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
    TV_CLASS: 'agnative-tv-mode',
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
      TV_CLASS,
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
    var leftdockKeyGuardBound = false;
    var leftdockKeyIndex = -1;
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
          document.body.classList.remove(TV_CLASS);
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
      // TV browsers have limited CPU/GPU; prefer predictable rendering.
      var level = isTvDevice() ? 'ultra' : resolvePerfLevel();
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
        var v = Lampa.Storage.get(HERO_KEY, 'true');
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
        if (!heroBannerEnabled()) return;
        if (!isOnMainPage()) return;
        if (document.querySelector('.agnative-hero')) return;

        var scrollContent = document.querySelector('.activity--active .scroll__content') || document.querySelector('.scroll__content');
        if (!scrollContent) return;
        var firstLine = scrollContent.querySelector('.items-line');
        if (!firstLine) return;

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
            default: 'true'
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

    function isTvDevice() {
      try {
        if (window.Lampa && Lampa.Platform && typeof Lampa.Platform.screen === 'function' && Lampa.Platform.screen('tv')) return true;
        var ua = String((window.navigator && window.navigator.userAgent) || '').toLowerCase();
        return /smart[- ]?tv|googletv|android ?tv|aftb|afts|webos|tizen|netcast|viera|bravia|hbbtv/.test(ua) ||
          !!(window.matchMedia && window.matchMedia('(display-mode: tv)').matches);
      } catch (e) { return false; }
    }

    function syncTvClass() {
      if (!document.body) return;
      var tv = isTvDevice();
      document.body.classList.toggle(TV_CLASS, tv);
      // Keep the global Lampa/TV interface skin active. Only the separate
      // Prisma details layer is skipped on TV so Applecation can own that page.
      document.body.classList.add(BODY_CLASS);
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
        'body.' + BODY_CLASS + ' .head,',
        'body.' + BODY_CLASS + ' .head__body,',
        'body.' + BODY_CLASS + ' .head__wrapper,',
        'body.' + BODY_CLASS + ' .head__layer {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  border: none !important;',
        '  box-shadow: none !important;',
        '  filter: none !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .head__body {',
        '  position: relative !important;',
        '  z-index: 12 !important;',
        '  min-height: 0 !important;',
        '  height: 0 !important;',
        '  padding-top: 0 !important;',
        '  padding-bottom: 0 !important;',
        '  overflow: visible !important;',
        '}',
        'body.' + BODY_CLASS + ' .activity.activity--active,',
        'body.' + BODY_CLASS + ' .activity__body,',
        'body.' + BODY_CLASS + ' .full-start,',
        'body.' + BODY_CLASS + ' .full-start-new,',
        'body.' + BODY_CLASS + ' .full-start__head,',
        'body.' + BODY_CLASS + ' .full-start-new__head,',
        'body.' + BODY_CLASS + ' .full-start__body,',
        'body.' + BODY_CLASS + ' .full-start-new__body,',
        'body.' + BODY_CLASS + ' .full-start__bottom,',
        'body.' + BODY_CLASS + ' .full-start-new__bottom {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  filter: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .activity__slides { padding-top:3.5em !important; }',
        'body.' + BODY_CLASS + ' .full-start__body, body.' + BODY_CLASS + ' .full-start-new__body { transform: translateY(3em) !important; }',
        'body.' + BODY_CLASS + ' .full-start-new ~ .items-line, body.' + BODY_CLASS + ' .full-start ~ .items-line, body.' + BODY_CLASS + ' .full-start-new + *, body.' + BODY_CLASS + ' .full-start + * { transform: translateY(3em) !important; }',
        'body.' + BODY_CLASS + ' .activity.layer--width.activity--active,',
        'body.' + BODY_CLASS + ' .activity.layer--width.activity--active.application,',
        'body.' + BODY_CLASS + ' .activity.layer--width.activity--active.applecation {',
        '  background: transparent !important;',
        '  background-color: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + '.agnative-has-hero .activity.layer--width.activity--active {',
        '  padding: 0 !important;',
        '}',
        'body.' + BODY_CLASS + ' .activity.layer--width.activity--active::before,',
        'body.' + BODY_CLASS + ' .activity.layer--width.activity--active::after,',
        'body.' + BODY_CLASS + ' .full-start__bottom::before,',
        'body.' + BODY_CLASS + ' .full-start__bottom::after,',
        'body.' + BODY_CLASS + ' .full-start-new__bottom::before,',
        'body.' + BODY_CLASS + ' .full-start-new__bottom::after {',
        '  content: none !important;',
        '  display: none !important;',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .full-start__status,',
        'body.' + BODY_CLASS + ' .full-start__reactions,',
        'body.' + BODY_CLASS + ' .full-start-new__reactions {',
        '  display: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .wrap__content.layer--height.layer--width,',
        'body.' + BODY_CLASS + ' .wrap__content,',
        'body.' + BODY_CLASS + ' .layer--height,',
        'body.' + BODY_CLASS + ' .layer--width {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  filter: none !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .wrap__content,',
        'body.' + BODY_CLASS + ' .wrap__content .layer--height,',
        'body.' + BODY_CLASS + ' .wrap__content .layer--width {',
        '  padding-top: .3em !important;',
        '}',
        'body.' + BODY_CLASS + '.agnative-has-hero .wrap__content.layer--height.layer--width {',
        '  padding-top: 0 !important;',
        '}',
        'body.' + BODY_CLASS + ' .wrap__content.layer--height.layer--width > *,',
        'body.' + BODY_CLASS + ' .wrap__content > *,',
        'body.' + BODY_CLASS + ' .layer--height > *,',
        'body.' + BODY_CLASS + ' .layer--width > * {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  filter: none !important;',
        '  mask-image: none !important;',
        '  -webkit-mask-image: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .settings__content.layer--height {',
        '  background: rgba(28,30,34,.82) !important;',
        '  background-image: none !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 18px 44px rgba(0,0,0,.28) !important;',
        '  border: 1px solid rgba(255,255,255,.05) !important;',
        '  filter: none !important;',
        '  backdrop-filter: blur(18px) saturate(132%) !important;',
        '  -webkit-backdrop-filter: blur(18px) saturate(132%) !important;',
        '}',
        'body.' + BODY_CLASS + ' .wrap__left,',
        'body.' + BODY_CLASS + ' .menu,',
        'body.' + BODY_CLASS + ' .menu__content,',
        'body.' + BODY_CLASS + ' .menu .menu__list {',
        '  background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.06)) !important;',
        '  background-image: none !important;',
        '  box-shadow: 0 10px 24px rgba(0,0,0,.18) !important;',
        '  border: 0 !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .wrap__left::before,',
        'body.' + BODY_CLASS + ' .wrap__left::after,',
        'body.' + BODY_CLASS + ' .menu::before,',
        'body.' + BODY_CLASS + ' .menu::after,',
        'body.' + BODY_CLASS + ' .menu__content::before,',
        'body.' + BODY_CLASS + ' .menu__content::after,',
        'body.' + BODY_CLASS + ' .menu .menu__list::before,',
        'body.' + BODY_CLASS + ' .menu .menu__list::after {',
        '  display: none !important;',
        '  content: none !important;',
        '  border: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .menu .menu__item {',
        '  background: transparent !important;',
        '  border-radius: 999px !important;',
        '  border: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .menu .menu__item + .menu__item {',
        '  margin-top: .18em !important;',
        '}',
        'body.' + BODY_CLASS + ' .menu .menu__item.focus,',
        'body.' + BODY_CLASS + ' .menu .menu__item.hover,',
        'body.' + BODY_CLASS + ' .menu .menu__item.traverse,',
        'body.' + BODY_CLASS + ' .menu .menu__item.active {',
        '  background: rgba(255,255,255,.085) !important;',
        '  border-color: transparent !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10) !important;',
        '}',
        'body.' + BODY_CLASS + ' .scroll--over {',
        '  max-height: 100%;',
        '}',
        'body.' + BODY_CLASS + ' .menu__list {',
        '  border-radius: 1.35em',
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

        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings-param[data-name="' + CARD_ANIM_KEY + '"] { display: none !important; }',
        'body.' + BODY_CLASS + ':not([' + CARD_ANIM_ATTR + '="appletv"]) .settings-param[data-name="' + CARD_ANIM_ORBIT_KEY + '"] { display: none !important; }',
        'body.' + BODY_CLASS + '[' + RATING_ATTR + '="off"] .settings-param[data-name="' + RATING_STYLE_KEY + '"] { display: none !important; }',
        'body.' + BODY_CLASS + '[' + CARD_IMAGE_MODE_ATTR + '="poster"] .settings-param[data-name="' + LOGO_SIZE_KEY + '"] { display: none !important; }',
        'body.' + BODY_CLASS + ' .wrap__content.layer--height.layer--width::after,',
        'body.' + BODY_CLASS + ' .wrap__content.layer--height.layer--width > *::before,',
        'body.' + BODY_CLASS + ' .wrap__content.layer--height.layer--width > *::after,',
        'body.' + BODY_CLASS + ' .wrap__content::after,',
        'body.' + BODY_CLASS + ' .wrap__content > *::before,',
        'body.' + BODY_CLASS + ' .wrap__content > *::after,',
        'body.' + BODY_CLASS + ' .layer--height::after,',
        'body.' + BODY_CLASS + ' .layer--height > *::before,',
        'body.' + BODY_CLASS + ' .layer--height > *::after,',
        'body.' + BODY_CLASS + ' .layer--width > *::before,',
        'body.' + BODY_CLASS + ' .layer--width > *::after,',
        'body.' + BODY_CLASS + ' .layer--width::after {',
        '  content: none !important;',
        '  display: none !important;',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  mask-image: none !important;',
        '  -webkit-mask-image: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .head__title,',
        'body.' + BODY_CLASS + ' .head__time,',
        'body.' + BODY_CLASS + ' .head__split,',
        'body.' + BODY_CLASS + ' .head__logo,',
        'body.' + BODY_CLASS + ' .head__history,',
        'body.' + BODY_CLASS + ' .head__source,',
        'body.' + BODY_CLASS + ' .head__markers,',
        'body.' + BODY_CLASS + ' .head__backward,',
        'body.' + BODY_CLASS + ' .open--search,',
        'body.' + BODY_CLASS + ' .head__settings,',
        'body.' + BODY_CLASS + ' .settings-icon-holder,',
        'body.' + BODY_CLASS + ' .head__action,',
        'body.' + BODY_CLASS + ' .head__button {',
        '  display: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .head__actions {',
        '  position: absolute !important;',
        '  left: calc(1em + 2.6em + .8em) !important;',
        '  top: .46em !important;',
        '  right: auto !important;',
        '  bottom: auto !important;',
        '  height: 2.6em !important;',
        '  margin: 0 !important;',
        '  padding: 0 !important;',
        '  display: inline-flex !important;',
        '  align-items: center !important;',
        '  justify-content: flex-start !important;',
        '  gap: .4em !important;',
        '  z-index: 20 !important;',
        '  background: transparent !important;',
        '  border: 0 !important;',
        '  box-shadow: none !important;',
        '  pointer-events: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .head__navigator {',
        '  display: inline-flex !important;',
        '  align-items: center !important;',
        '  justify-content: center !important;',
        '  height: 2.6em !important;',
        '  padding: 0 1em !important;',
        '  margin: 0 !important;',
        '  font-size: calc(.78em * var(--agnative-scale, 1)) !important;',
        '  font-weight: 700 !important;',
        '  letter-spacing: .04em !important;',
        '  color: rgba(255,255,255,.92) !important;',
        '  background: rgba(22,24,30,.26) !important;',
        '  border: 1px solid rgba(255,255,255,.10) !important;',
        '  border-radius: 999px !important;',
        '  backdrop-filter: blur(18px) saturate(140%) !important;',
        '  -webkit-backdrop-filter: blur(18px) saturate(140%) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 8px 18px rgba(0,0,0,.12) !important;',
        '  white-space: nowrap !important;',
        '  pointer-events: auto !important;',
        '}',
        'body.' + BODY_CLASS + ' .head__menu-icon {',
        '  position: absolute !important;',
        '  left: 1em !important;',
        '  top: .46em !important;',
        '  transform: none !important;',
        '  z-index: 20 !important;',
        '  width: 2.6em !important;',
        '  height: 2.6em !important;',
        '  min-width: 2.6em !important;',
        '  margin: 0 !important;',
        '  padding: 0 !important;',
        '  display: inline-flex !important;',
        '  align-items: center !important;',
        '  justify-content: center !important;',
        '  border-radius: 999px !important;',
        '  background: rgba(22,24,30,.26) !important;',
        '  border: 1px solid rgba(255,255,255,.10) !important;',
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 8px 18px rgba(0,0,0,.12) !important;',
        '  backdrop-filter: blur(18px) saturate(140%) !important;',
        '  -webkit-backdrop-filter: blur(18px) saturate(140%) !important;',
        '  color: rgba(255,255,255,.95) !important;',
        '}',
        'body.' + BODY_CLASS + ' .head__menu-icon > *,',
        'body.' + BODY_CLASS + ' .head__menu-icon svg,',
        'body.' + BODY_CLASS + ' .head__menu-icon img {',
        '  width: 1.1em !important;',
        '  height: 1.1em !important;',
        '  max-width: 1.1em !important;',
        '  max-height: 1.1em !important;',
        '}',
        'body.' + BODY_CLASS + ' .head::before,',
        'body.' + BODY_CLASS + ' .head::after,',
        'body.' + BODY_CLASS + ' .head__body::before,',
        'body.' + BODY_CLASS + ' .head__body::after,',
        'body.' + BODY_CLASS + ' .head__wrapper::before,',
        'body.' + BODY_CLASS + ' .head__wrapper::after,',
        'body.' + BODY_CLASS + ' .head__layer::before,',
        'body.' + BODY_CLASS + ' .head__layer::after {',
        '  content: none !important;',
        '  display: none !important;',
        '  filter: none !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background: transparent !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .head__logo-icon {',
        '  display: none !important;',
        '}',
        'body.' + BODY_CLASS + '.agnative-hero-collapsed .activity--active .scroll__content { padding-top:5em !important; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell { position:absolute; left:50%; top:.46em; transform:translateX(-50%); z-index:20; width:max-content; max-width:calc(100vw - 24em); height:2.6em; display:inline-flex; align-items:center; box-sizing:border-box; font-size:1em; }',
        'body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xs"] .agnative-topnav-shell, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xs"] .agnative-topnav-rightdock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xs"] .agnative-topnav-clock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xs"] .head__menu-icon { font-size:.78em !important; }',
        'body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="sm"] .agnative-topnav-shell, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="sm"] .agnative-topnav-rightdock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="sm"] .agnative-topnav-clock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="sm"] .head__menu-icon { font-size:.9em !important; }',
        'body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="md"] .agnative-topnav-shell, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="md"] .agnative-topnav-rightdock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="md"] .agnative-topnav-clock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="md"] .head__menu-icon { font-size:1em !important; }',
        'body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="lg"] .agnative-topnav-shell, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="lg"] .agnative-topnav-rightdock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="lg"] .agnative-topnav-clock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="lg"] .head__menu-icon { font-size:1.15em !important; }',
        'body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xl"] .agnative-topnav-shell, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xl"] .agnative-topnav-rightdock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xl"] .agnative-topnav-clock, body.' + BODY_CLASS + '[' + TOPNAV_SIZE_ATTR + '="xl"] .head__menu-icon { font-size:1.3em !important; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__inner { height:2.6em; box-sizing:border-box; display:inline-flex; align-items:center; gap:.18em; padding:.21em .32em; border-radius:999px; background:rgba(22,24,30,.28); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 8px 18px rgba(0,0,0,.12); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__items { display:flex; align-items:center; justify-content:center; gap:.08em; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__right { display:flex; align-items:center; gap:.08em; margin-left:.12em; padding-left:.18em; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__item.selector { appearance:none; -webkit-appearance:none; border:0; background:none; color:rgba(255,255,255,.92); height:2.16em; display:inline-flex; align-items:center; justify-content:center; text-align:center; padding:0 .96em; border-radius:999px; font-size:.83em; font-weight:700; line-height:1; white-space:nowrap; transition:background .2s ease, transform .2s ease, box-shadow .2s ease; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__item--icon.selector { width:2.16em; min-width:2.16em; padding:0; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__item--icon svg { width:1em; height:1em; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-right__profile.selector { width:2.16em; min-width:2.16em; padding:0; overflow:hidden; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-right__profile-img { width:1.56em; height:1.56em; border-radius:999px; object-fit:cover; display:block; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__item.is-active, body.' + BODY_CLASS + ' .agnative-topnav-shell__item.hover, body.' + BODY_CLASS + ' .agnative-topnav-shell__item.focus { background:rgba(255,255,255,.14); box-shadow:inset 0 1px 0 rgba(255,255,255,.10); }',
        'body.' + BODY_CLASS + ' .agnative-topnav-rightdock { position:absolute; right:1.15em; top:.46em; z-index:20; height:2.6em; box-sizing:border-box; display:inline-flex; align-items:center; gap:.08em; padding:.21em .32em; border-radius:999px; background:rgba(22,24,30,.28); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 8px 18px rgba(0,0,0,.12); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); }',
        'body.' + BODY_CLASS + ' .agnative-topnav-rightdock .agnative-topnav-clock { position:static !important; right:auto !important; top:auto !important; z-index:auto !important; height:2.16em !important; min-width:4.2em !important; padding:0 .95em !important; background:transparent !important; border:0 !important; box-shadow:none !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; transition:background .2s ease, transform .2s ease, box-shadow .2s ease; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-rightdock .agnative-topnav-clock.hover, body.' + BODY_CLASS + ' .agnative-topnav-rightdock .agnative-topnav-clock.focus, body.' + BODY_CLASS + ' .agnative-topnav-rightdock .agnative-topnav-right__profile.hover, body.' + BODY_CLASS + ' .agnative-topnav-rightdock .agnative-topnav-right__profile.focus { background:rgba(255,255,255,.14) !important; box-shadow:inset 0 1px 0 rgba(255,255,255,.10) !important; transform:translateY(-.02em); }',
        'body.' + BODY_CLASS + ' .agnative-topnav-clock { position:absolute; right:1.15em; top:.46em; z-index:20; display:inline-flex; align-items:center; justify-content:center; min-width:4.2em; height:2.6em; padding:0 .95em; border-radius:999px; background:rgba(22,24,30,.26); border:1px solid rgba(255,255,255,.10); box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 8px 18px rgba(0,0,0,.12); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); color:rgba(255,255,255,.95); font-size:.92em; font-weight:700; letter-spacing:.01em; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-clock.selector { cursor:pointer; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel { position:absolute; right:1.15em; top:3.7em; z-index:26; width:18.8em; padding:.72em; border-radius:1.18em; background:rgba(40,48,62,.76); border:1px solid rgba(255,255,255,.13); box-shadow:0 18px 48px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.09); backdrop-filter:blur(22px) saturate(136%); -webkit-backdrop-filter:blur(22px) saturate(136%); opacity:0; transform:translateY(-.35em) scale(.98); pointer-events:none; transition:opacity .2s ease, transform .2s ease; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel.is-open { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel__title { font-size:1.28em; font-weight:600; color:rgba(255,255,255,.94); padding:.18em .15em .52em; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.48em; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel__tile.selector { min-height:5.2em; border-radius:.95em; background:rgba(16,20,28,.82); border:1px solid rgba(255,255,255,.10); display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:.34em; padding:.65em .72em; color:rgba(255,255,255,.95); transition:background .2s ease, box-shadow .2s ease, transform .2s ease; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel__tile.selector .agnative-control-panel__icon { width:1.3em; height:1.3em; display:inline-flex; align-items:center; justify-content:center; color:rgba(214,230,255,.97); }',
        'body.' + BODY_CLASS + ' .agnative-control-panel__tile.selector .agnative-control-panel__icon svg { width:1.3em; height:1.3em; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel__tile.selector .agnative-control-panel__label { font-size:.95em; font-weight:700; line-height:1.15; text-align:left; }',
        'body.' + BODY_CLASS + ' .agnative-control-panel__tile.selector.hover, body.' + BODY_CLASS + ' .agnative-control-panel__tile.selector.focus { background:rgba(255,255,255,.18); box-shadow:inset 0 1px 0 rgba(255,255,255,.18), 0 0 0 1px rgba(255,255,255,.12); transform:translateY(-.02em); }',
        'body.' + BODY_CLASS + ' .items-line--type-default { min-height:auto !important; padding-top:0 !important; padding-bottom:.12em !important; margin-bottom:.32em !important; transition:transform .35s cubic-bezier(.22,.61,.36,1) !important; }',
        'body.' + BODY_CLASS + ' .items-line.layer--visible.layer--render.items-line--type-default { padding-top:0 !important; }',
        'body.' + BODY_CLASS + ' .items-line--type-default .items-line__head { margin-bottom:1.1em !important; min-height:auto !important; padding-top:0 !important; padding-bottom:.45em !important; padding-left:2.5em !important; padding-right:2.5em !important; font-size:1em !important; }',
        'body.' + BODY_CLASS + ' .items-line__more.selector { font-size:.7em !important; padding:.3em .6em !important; opacity:.85 !important; }',
        'body.' + BODY_CLASS + ' .items-line--type-default .items-cards { padding-top:0 !important; padding-left:2.5em !important; padding-right:2.5em !important; font-size:.86em !important; }',
        'body.' + BODY_CLASS + ' .items-cards { padding-left:1.05em !important; padding-right:1.05em !important; gap:.62em !important; }',
        'body.' + BODY_CLASS + ' .items-line__body { padding-left:0 !important; }',
        'body.' + BODY_CLASS + ' .items-line__title { font-size:1em !important; line-height:1.2 !important; font-weight:700 !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line { display:flex !important; gap:1.5em !important; padding-left:1.15em !important; padding-right:1.15em !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small) { padding: .6em .55em !important; display:flex !important; flex-direction:column !important; align-items:center !important; text-align:center !important; width:9em !important; border-radius:1.2em !important; background:transparent !important; color:inherit !important; transition: transform .28s cubic-bezier(.34,1.4,.64,1) !important; will-change: transform !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small) .full-person__photo { width:6.8em !important; height:6.8em !important; border-radius:50% !important; margin:0 0 .65em !important; background-color:rgba(255,255,255,.06) !important; background-size:cover !important; background-position:50% 50% !important; overflow:hidden !important; flex-shrink:0 !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,255,255,.06), 0 6px 14px rgba(0,0,0,.18), 0 12px 28px rgba(0,0,0,.22) !important; transition: box-shadow .28s ease, filter .28s ease !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small) .full-person__photo > img { width:100% !important; height:100% !important; border-radius:50% !important; object-fit:cover !important; object-position:center 20% !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small) .full-person__body { display:flex !important; flex-direction:column !important; align-items:center !important; padding:0 !important; margin:0 !important; max-width:100% !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small) .full-person__name { font-size:1em !important; font-weight:600 !important; color:rgba(255,255,255,.95) !important; margin:0 0 .2em !important; line-height:1.2 !important; max-width:100% !important; overflow:hidden !important; text-overflow:ellipsis !important; display:-webkit-box !important; -webkit-line-clamp:2 !important; -webkit-box-orient:vertical !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small) .full-person__role { font-size:.82em !important; font-weight:400 !important; color:rgba(255,255,255,.58) !important; margin:0 !important; line-height:1.25 !important; max-width:100% !important; overflow:hidden !important; text-overflow:ellipsis !important; display:-webkit-box !important; -webkit-line-clamp:2 !important; -webkit-box-orient:vertical !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).focus, body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).hover { background:transparent !important; color:inherit !important; transform: scale(1.06) translateY(-4px) !important; z-index:10 !important; position:relative !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).focus .full-person__photo, body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).hover .full-person__photo { box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 0 0 2px rgba(86,141,255,.92), 0 18px 42px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.16) !important; filter: saturate(1.06) brightness(1.02) !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).focus .full-person__name, body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).hover .full-person__name { color:#fff !important; }',
        'body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).focus .full-person__role, body.' + BODY_CLASS + ' .scroll__body.mapping--line .full-person:not(.full-person--small).hover .full-person__role { color:rgba(255,255,255,.78) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .scroll__body.mapping--line .full-person:not(.full-person--small).focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .scroll__body.mapping--line .full-person:not(.full-person--small).hover { transform: scale(1.04) translateY(-2px) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .scroll__body.mapping--line .full-person:not(.full-person--small) { transition:none !important; will-change:auto !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .scroll__body.mapping--line .full-person:not(.full-person--small).focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .scroll__body.mapping--line .full-person:not(.full-person--small).hover { transform:none !important; }',
        'body.' + BODY_CLASS + ' .mapping--grid { display:grid !important; grid-template-columns:repeat(auto-fit, minmax(17.6em, 1fr)) !important; gap: 1em .52em !important; align-items:start !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(13em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(14em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(10.4em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(15.8em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(11.7em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(17.6em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(13em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(19.4em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(14.3em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(21.2em, 1fr)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(15.6em, 1fr)) !important; }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + ' .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(15em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(11.1em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(11.9em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(8.8em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(13.4em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(9.9em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(15em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(11.1em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(16.5em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(12.2em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(18em, 1fr)) !important; } }',
        '@media (max-width: 1279px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(13.3em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + ' .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(15em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(11.1em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(11.9em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(8.8em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(13.4em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(9.9em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(15em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(11.1em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(16.5em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(12.2em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(18em, 1fr)) !important; } }',
        '@media (max-width: 767px) { body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"][' + BACKDROP_ATTR + '="off"] .mapping--grid { grid-template-columns:repeat(auto-fit, minmax(13.3em, 1fr)) !important; } }',
        'body.' + BODY_CLASS + ' .card { width:auto !important; margin:0 !important; padding-bottom:0 !important; transform-origin:center center !important; overflow:visible !important; }',
        'body.' + BODY_CLASS + ' .items-line .card { width:17.6em !important; flex:0 0 auto !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .items-line .card { width:13em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .items-line .card { width:14em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"][' + BACKDROP_ATTR + '="off"] .items-line .card { width:10.4em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .items-line .card { width:15.8em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"][' + BACKDROP_ATTR + '="off"] .items-line .card { width:11.7em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .items-line .card { width:17.6em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"][' + BACKDROP_ATTR + '="off"] .items-line .card { width:13em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .items-line .card { width:19.4em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"][' + BACKDROP_ATTR + '="off"] .items-line .card { width:14.3em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .items-line .card { width:21.2em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"][' + BACKDROP_ATTR + '="off"] .items-line .card { width:15.6em !important; }',
        // Compact service/genre cards (e.g. from SURS plugin) — half size of regular cards
        'body.' + BODY_CLASS + ' .card.card--button-compact .nfx-card-overlay, body.' + BODY_CLASS + ' .card.card--button-compact .nfx-card-logo, body.' + BODY_CLASS + ' .card.card--button-compact .nfx-card-rating, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .nfx-card-overlay, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .nfx-card-logo, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .nfx-card-rating, body.' + BODY_CLASS + ' .card.card--genre-compact .nfx-card-overlay, body.' + BODY_CLASS + ' .card.card--genre-compact .nfx-card-logo, body.' + BODY_CLASS + ' .card.card--genre-compact .nfx-card-rating { display:none !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__view, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .card__view, body.' + BODY_CLASS + ' .card.card--genre-compact .card__view { display:flex !important; align-items:center !important; justify-content:center !important; padding-bottom:56% !important; background-color:rgba(200,200,200,.16) !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__button-label, body.' + BODY_CLASS + ' .card.card--genre-compact .card__genre-label { display:block !important; position:absolute !important; bottom:.42em !important; left:0 !important; right:0 !important; text-align:center !important; color:#fff !important; padding:.34em !important; font-size:calc(.78em * var(--agnative-scale, 1)) !important; font-weight:600 !important; line-height:1.1 !important; z-index:2 !important; text-shadow:0 1px 2px rgba(0,0,0,.7) !important; pointer-events:none !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__svg-icon, body.' + BODY_CLASS + ' .card.card--genre-compact .card__svg-icon { position:absolute !important; top:42% !important; left:50% !important; transform:translate(-50%, -50%) !important; width:42% !important; height:42% !important; display:flex !important; align-items:center !important; justify-content:center !important; z-index:1 !important; }',
        'body.' + BODY_CLASS + ' .card.streaming-card--button-compact .streaming-card__svg-icon { position:absolute !important; top:50% !important; left:50% !important; transform:translate(-50%, -50%) !important; width:60% !important; height:60% !important; display:flex !important; align-items:center !important; justify-content:center !important; z-index:1 !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__svg-icon svg, body.' + BODY_CLASS + ' .card.card--genre-compact .card__svg-icon svg, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .streaming-card__svg-icon svg, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .streaming-card__svg-icon img { width:100% !important; height:100% !important; object-fit:contain !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__svg-icon, body.' + BODY_CLASS + ' .card.card--genre-compact .card__svg-icon, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .streaming-card__svg-icon { transform: translate(-50%, -50%) !important; transition: transform .14s ease-out !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__button-label, body.' + BODY_CLASS + ' .card.card--genre-compact .card__genre-label { transform: translate(0, 0) !important; transition: transform .14s ease-out !important; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--button-compact.focus .card__svg-icon, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--button-compact.hover .card__svg-icon, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--genre-compact.focus .card__svg-icon, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--genre-compact.hover .card__svg-icon, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.streaming-card--button-compact.focus .streaming-card__svg-icon, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.streaming-card--button-compact.hover .streaming-card__svg-icon { transform: translate(calc(-50% + var(--atv-lx, 0em)), calc(-50% + var(--atv-ly, 0em))) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--button-compact.focus .card__button-label, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--button-compact.hover .card__button-label, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--genre-compact.focus .card__genre-label, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.card--genre-compact.hover .card__genre-label { transform: translate(var(--atv-lx, 0em), var(--atv-ly, 0em)) !important; }',
        'body.' + BODY_CLASS + ' .items-line .card.card--button-compact, body.' + BODY_CLASS + ' .items-line .card.streaming-card--button-compact, body.' + BODY_CLASS + ' .items-line .card.card--genre-compact { width:8.8em !important; flex:0 0 auto !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .items-line .card.card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .items-line .card.streaming-card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .items-line .card.card--genre-compact { width:7em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .items-line .card.card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .items-line .card.streaming-card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .items-line .card.card--genre-compact { width:7.9em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .items-line .card.card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .items-line .card.streaming-card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .items-line .card.card--genre-compact { width:8.8em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .items-line .card.card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .items-line .card.streaming-card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .items-line .card.card--genre-compact { width:9.7em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .items-line .card.card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .items-line .card.streaming-card--button-compact, body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .items-line .card.card--genre-compact { width:10.6em !important; }',
        // Scale text inside (logo labels, etc) accordingly
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__view, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .card__view, body.' + BODY_CLASS + ' .card.card--genre-compact .card__view { font-size:.85em !important; }',
        'body.' + BODY_CLASS + ' .card .card-watched { position:absolute !important; left:.55em !important; right:.55em !important; bottom:.55em !important; top:auto !important; z-index:3 !important; display:block !important; opacity:0 !important; transform:translateY(.45em) scale(.94) !important; transition: opacity .18s ease 0s, transform .18s ease 0s !important; pointer-events:none !important; background:rgba(15,17,22,.72) !important; border:1px solid rgba(255,255,255,.09) !important; border-radius:.85em !important; box-shadow:0 10px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.07) !important; backdrop-filter:blur(16px) saturate(140%) !important; -webkit-backdrop-filter:blur(16px) saturate(140%) !important; overflow:hidden !important; max-height:calc(100% - 1.2em) !important; }',
        'body.' + BODY_CLASS + ' .card.focus .card-watched, body.' + BODY_CLASS + ' .card.hover .card-watched { opacity:1 !important; transform:translateY(0) scale(1) !important; transition: opacity .32s ease 1s, transform .14s ease-out !important; }',
        'body.' + BODY_CLASS + ' .card .card-watched__inner { padding:.5em .75em .6em !important; }',
        'body.' + BODY_CLASS + ' .card .card-watched__body { font-size:.7em !important; line-height:1.25 !important; }',
        'body.' + BODY_CLASS + ' .card .card-watched__item { margin-top:.4em !important; }',
        'body.' + BODY_CLASS + ' .card .card-watched__item:first-child { margin-top:0 !important; }',
        'body.' + BODY_CLASS + ' .card .card__view { padding-bottom:56.25% !important; margin-bottom:0 !important; border-radius:1.55em !important; overflow:hidden !important; clip-path: inset(0 round 1.55em); -webkit-clip-path: inset(0 round 1.55em); box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1.5px 1px rgba(0,0,0,.18), inset 0 0 0 1px rgba(255,255,255,.06), 0 6px 14px rgba(0,0,0,.14), 0 12px 28px rgba(0,0,0,.16) !important; transition: transform .28s cubic-bezier(.22,.61,.36,1), box-shadow .28s ease, filter .28s ease, opacity .18s ease !important; border: 0.1em solid transparent !important; box-sizing: border-box !important; }',
        'body.' + BODY_CLASS + ' .card[data-nfx-switched="1"] .card__view { opacity:1 !important; }',
        'body.' + BODY_CLASS + ' .card__view > *, body.' + BODY_CLASS + ' .card__view img, body.' + BODY_CLASS + ' .card__view .card__img, body.' + BODY_CLASS + ' .card__view .card__image, body.' + BODY_CLASS + ' .card__img, body.' + BODY_CLASS + ' .card__image, body.' + BODY_CLASS + ' .card__filter, body.' + BODY_CLASS + ' .card__filter::before, body.' + BODY_CLASS + ' .card__filter::after { border-radius:1.55em !important; }',
        'body.' + BODY_CLASS + ' .card__img, body.' + BODY_CLASS + ' .card__image { object-fit:cover !important; object-position:center 20% !important; border:none !important; box-shadow:none !important; background-clip:padding-box !important; }',
        'body.' + BODY_CLASS + ' .card.focus .card__view { transform: translateY(-.08em) scale(1.06) !important; filter: saturate(1.06) brightness(1.02) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 0 0 2px rgba(86,141,255,.92), 0 18px 42px rgba(0,0,0,.26), 0 8px 20px rgba(0,0,0,.14) !important; }',
        'body.' + BODY_CLASS + ' .card.hover .card__view { transform: translateY(-.04em) scale(1.03) !important; filter: saturate(1.02) brightness(1.01) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 10px 24px rgba(0,0,0,.16) !important; }',
        'body.' + BODY_CLASS + ' .card.focus::after, body.' + BODY_CLASS + ' .card.hover::after, body.' + BODY_CLASS + ' .card__view::before, body.' + BODY_CLASS + ' .card__view::after { display:none !important; content:none !important; }',
        'body.' + BODY_CLASS + ' .card { transition: transform .28s cubic-bezier(.34,1.4,.64,1) !important; will-change: transform !important; transform-style: preserve-3d !important; }',
        'body.' + BODY_CLASS + ' .card.focus, body.' + BODY_CLASS + ' .card.hover, body.' + BODY_CLASS + ' .card.traverse { transform: scale(1.07) translateY(-6px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) !important; z-index: 10 !important; position: relative !important; }',
        'body.' + BODY_CLASS + ' .card.focus ~ .card, body.' + BODY_CLASS + ' .card.hover ~ .card { transform: translateX(4px) !important; transition: transform .22s ease !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card.hover, body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card.traverse { transform: scale(1.05) translateY(-3px) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card { transition: none !important; will-change: auto !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card.hover, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card.traverse { transform: none !important; }',
        'body.' + BODY_CLASS + ' .card-episode { width:17.6em !important; flex:0 0 auto !important; margin:0 !important; padding:0 !important; background:transparent !important; border:0 !important; outline:0 !important; box-shadow:none !important; transform:none !important; transform-origin:center center !important; overflow:visible !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xs"] .card-episode { width:14em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="sm"] .card-episode { width:15.8em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="md"] .card-episode { width:17.6em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="lg"] .card-episode { width:19.4em !important; }',
        'body.' + BODY_CLASS + '[' + CARD_SIZE_ATTR + '="xl"] .card-episode { width:21.2em !important; }',
        'body.' + BODY_CLASS + ' .card-episode.focus, body.' + BODY_CLASS + ' .card-episode.hover, body.' + BODY_CLASS + ' .card-episode.focus .card-episode__body, body.' + BODY_CLASS + ' .card-episode.hover .card-episode__body { border:0 !important; outline:0 !important; box-shadow:none !important; background:transparent !important; }',
        'body.' + BODY_CLASS + ' .card-episode { transition: transform .28s cubic-bezier(.34,1.4,.64,1), box-shadow .28s ease !important; will-change: transform !important; }',
        'body.' + BODY_CLASS + ' .card-episode.focus, body.' + BODY_CLASS + ' .card-episode.hover, body.' + BODY_CLASS + ' .card-episode.traverse { transform: scale(1.05) translateY(-4px) !important; box-shadow: 0 16px 40px rgba(0,0,0,.5), 0 6px 16px rgba(0,0,0,.3) !important; z-index: 10 !important; position: relative !important; }',
        'body.' + BODY_CLASS + ' .card-episode__body { background:transparent !important; border:0 !important; outline:0 !important; box-shadow:none !important; padding:0 !important; margin:0 !important; display:block !important; overflow:visible !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode { position:relative !important; display:block !important; background:transparent !important; border:0 !important; box-shadow:none !important; padding:0 !important; margin:0 !important; overflow:visible !important; transform-origin:center center !important; transition: transform .28s cubic-bezier(.22,.61,.36,1) !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__img { position:relative !important; width:100% !important; height:0 !important; padding-bottom:56.25% !important; margin:0 !important; border-radius:1.55em !important; overflow:hidden !important; clip-path: inset(0 round 1.55em); -webkit-clip-path: inset(0 round 1.55em); box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1.5px 1px rgba(0,0,0,.18), inset 0 0 0 1px rgba(255,255,255,.06), 0 6px 14px rgba(0,0,0,.14), 0 12px 28px rgba(0,0,0,.16) !important; transition: box-shadow .28s ease, filter .28s ease !important; border: 0.1em solid transparent !important; box-sizing: border-box !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__img > *, body.' + BODY_CLASS + ' .card-episode .full-episode__img img { border-radius:1.55em !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__img img { position:absolute !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; object-position:center center !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__img::before { content:none !important; display:none !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__body { position:absolute !important; left:1.02em !important; right:1.02em !important; bottom:.9em !important; top:auto !important; z-index:3 !important; padding:0 !important; margin:0 !important; background:transparent !important; border:0 !important; display:flex !important; flex-direction:column !important; align-items:flex-start !important; text-shadow:0 1px 2px rgba(0,0,0,.95), 0 2px 8px rgba(0,0,0,.85), 0 4px 16px rgba(0,0,0,.7) !important; pointer-events:none !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__num { position:absolute !important; top:.72em !important; right:.82em !important; left:auto !important; bottom:auto !important; z-index:4 !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; min-width:1.9em !important; font-size: calc(.72em * var(--agnative-scale, 1)) !important; font-weight:800 !important; color:#fff !important; letter-spacing:.04em !important; line-height:1 !important; margin:0 !important; padding:.34em .66em !important; border-radius:.85em !important; background:rgba(12,14,20,.68) !important; border:1px solid rgba(255,255,255,.14) !important; backdrop-filter: blur(10px) saturate(140%) !important; -webkit-backdrop-filter: blur(10px) saturate(140%) !important; box-shadow: 0 4px 10px rgba(0,0,0,.24) !important; text-shadow:none !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__num::before { content:"EP " !important; opacity:.7 !important; font-weight:700 !important; margin-right:.04em !important; }',
        'body.' + BODY_CLASS + ' .card-episode .nfx-episode-logo { display:block !important; max-height:2.35em !important; max-width:80% !important; margin:0 0 .32em !important; padding:0 !important; background:transparent !important; border:0 !important; border-radius:0 !important; clip-path:none !important; -webkit-clip-path:none !important; object-fit:contain !important; object-position:left center !important; filter: drop-shadow(0 2px 6px rgba(0,0,0,.55)) !important; }',
        'body.' + BODY_CLASS + ' .card-episode .nfx-episode-title { font-size: calc(.95em * var(--agnative-scale, 1)) !important; font-weight:800 !important; color:#fff !important; line-height:1.14 !important; max-width:100% !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; margin:0 0 .3em !important; padding:0 !important; letter-spacing:.005em !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__name { font-size: calc(.82em * var(--agnative-scale, 1)) !important; font-weight:700 !important; color:#fff !important; line-height:1.18 !important; max-width:100% !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; margin:0 !important; padding:0 !important; }',
        'body.' + BODY_CLASS + ' .card-episode .full-episode__date { font-size: calc(.68em * var(--agnative-scale, 1)) !important; font-weight:500 !important; color:rgba(255,255,255,.78) !important; line-height:1.2 !important; margin-top:.18em !important; padding:0 !important; letter-spacing:.01em !important; gap: .5em;}',
        'body.' + BODY_CLASS + ' .card-episode__footer { display:none !important; }',
        'body.' + BODY_CLASS + ' .card-episode::before, body.' + BODY_CLASS + ' .card-episode::after, body.' + BODY_CLASS + ' .card-episode__body::before, body.' + BODY_CLASS + ' .card-episode__body::after, body.' + BODY_CLASS + ' .card-episode .full-episode::before, body.' + BODY_CLASS + ' .card-episode .full-episode::after { display:none !important; content:none !important; border:0 !important; outline:0 !important; box-shadow:none !important; background:transparent !important; }',
        'body.' + BODY_CLASS + ' .card-episode.focus .full-episode__img { filter: saturate(1.06) brightness(1.02) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 0 0 2px rgba(86,141,255,.92), 0 18px 42px rgba(0,0,0,.26), 0 8px 20px rgba(0,0,0,.14) !important; }',
        'body.' + BODY_CLASS + ' .card-episode.hover .full-episode__img { filter: saturate(1.02) brightness(1.01) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 10px 24px rgba(0,0,0,.16) !important; }',
        'body.' + BODY_CLASS + ':not(.' + GLARE_CLASS + ') .card-episode.focus .full-episode { transform: translateY(-.08em) scale(1.06) !important; }',
        'body.' + BODY_CLASS + ':not(.' + GLARE_CLASS + ') .card-episode.hover .full-episode { transform: translateY(-.04em) scale(1.03) !important; }',
        'body.' + GLARE_CLASS + ' .card, body.' + GLARE_CLASS + ' .card-episode, body.' + GLARE_CLASS + ' .full-start-new__poster { will-change: transform; transform-style: preserve-3d; }',
        'body.' + GLARE_CLASS + ' .card__view, body.' + GLARE_CLASS + ' .full-episode__img, body.' + GLARE_CLASS + ' .full-start-new__poster { position: relative; overflow: hidden; }',
        'body.' + GLARE_CLASS + ' .card .card__view::after, body.' + GLARE_CLASS + ' .card-episode .full-episode__img::after, body.' + GLARE_CLASS + ' .full-start-new__poster::after { content:"" !important; display:block !important; position:absolute; inset:-10%; border-radius:inherit; background: radial-gradient(ellipse at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,.20) 0%, rgba(255,255,255,.16) 12%, rgba(255,255,255,.10) 26%, rgba(255,255,255,.05) 42%, rgba(255,255,255,.02) 58%, rgba(255,255,255,0) 78%) !important; opacity:0; filter: blur(18px); transition: opacity .22s ease, transform .22s ease; pointer-events:none; z-index:8; mix-blend-mode: screen; }',
        'body.' + GLARE_CLASS + ' .card.focus .card__view::after, body.' + GLARE_CLASS + ' .card.hover .card__view::after, body.' + GLARE_CLASS + ' .card-episode.focus .full-episode__img::after, body.' + GLARE_CLASS + ' .card-episode.hover .full-episode__img::after, body.' + GLARE_CLASS + ' .full-start-new__poster.focus::after, body.' + GLARE_CLASS + ' .full-start-new__poster.hover::after { opacity: 1 !important; }',
        'body.' + GLARE_CLASS + ' .card.focus .card__view, body.' + GLARE_CLASS + ' .card.hover .card__view, body.' + GLARE_CLASS + ' .card-episode.focus .full-episode, body.' + GLARE_CLASS + ' .card-episode.hover .full-episode, body.' + GLARE_CLASS + ' .full-start-new__poster.focus, body.' + GLARE_CLASS + ' .full-start-new__poster.hover { transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(1.055) translateY(-.06em) !important; transition: transform .08s linear, box-shadow .24s ease, filter .24s ease !important; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card .card__view > *, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode .full-episode > *:not(.full-episode__img) { transition: transform .14s ease-out; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.focus .card__view, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.hover .card__view, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.focus .full-episode, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.hover .full-episode, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .full-start-new__poster.focus, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .full-start-new__poster.hover { transform: perspective(1200px) rotateX(var(--atv-rx, 0deg)) rotateY(var(--atv-ry, 0deg)) scale(1.05) translateY(-.06em) !important; transition: transform .12s ease-out, box-shadow .24s ease, filter .24s ease !important; will-change: transform; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.focus .card__view, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.focus .full-episode__img, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .full-start-new__poster.focus { box-shadow: inset 0 1px 0 rgba(255,255,255,.24), 0 0 0 2px rgba(86,141,255,.92), 0 28px 60px rgba(0,0,0,.55), 0 14px 32px rgba(0,0,0,.38), 0 6px 14px rgba(0,0,0,.22) !important; filter: saturate(1.08) brightness(1.03) drop-shadow(0 18px 28px rgba(0,0,0,.32)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.hover .card__view, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.hover .full-episode__img, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .full-start-new__poster.hover { box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 20px 44px rgba(0,0,0,.42), 0 10px 22px rgba(0,0,0,.28) !important; filter: saturate(1.04) brightness(1.02) drop-shadow(0 12px 22px rgba(0,0,0,.26)) !important; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"][' + PERF_ATTR + '="low"] .card.focus .card__view, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"][' + PERF_ATTR + '="low"] .card.hover .card__view, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"][' + PERF_ATTR + '="low"] .card-episode.focus .full-episode__img, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"][' + PERF_ATTR + '="low"] .card-episode.hover .full-episode__img { filter: none !important; }',
        'body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.focus .card__view > *:not(.card__img):not(.card__image):not(.card__svg-icon):not(.streaming-card__svg-icon):not(.card__button-label):not(.card__genre-label), body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card.hover .card__view > *:not(.card__img):not(.card__image):not(.card__svg-icon):not(.streaming-card__svg-icon):not(.card__button-label):not(.card__genre-label), body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.focus .full-episode__body, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.hover .full-episode__body, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.focus .full-episode__num, body.' + BODY_CLASS + '[' + CARD_ANIM_ATTR + '="appletv"] .card-episode.hover .full-episode__num { transform: translate(var(--atv-lx, 0em), var(--atv-ly, 0em)) !important; will-change: transform; }',
        'body.' + BODY_CLASS + ' .card__vote, body.' + BODY_CLASS + ' .card__quality, body.' + BODY_CLASS + ' .card__type, body.' + BODY_CLASS + ' .card__promo-text, body.' + BODY_CLASS + ' .card__promo-title, body.' + BODY_CLASS + ' .nfx-card-overlay__match { display:none !important; }',
        'body.' + BODY_CLASS + ' .card__title, body.' + BODY_CLASS + ' .card__age { display:none !important; }',
        'body.' + BODY_CLASS + ' .nfx-card-overlay { position:absolute; left:0; right:0; bottom:0; z-index:2; display:flex !important; flex-direction:column; justify-content:center; align-items:flex-start; opacity:1 !important; visibility:visible !important; border-radius:0 0 1.55em 1.55em !important; background:transparent !important; padding:2.15em 1.02em .92em !important; transform: translateZ(14px); transition: transform .28s cubic-bezier(.22,.61,.36,1), opacity .24s ease; pointer-events:none; }',
        'body.' + BODY_CLASS + ' .card__view::before { content:"" !important; display:block !important; position:absolute; left:0; right:0; bottom:0; height:8.5em; z-index:1 !important; pointer-events:none; border-radius:0 0 1.55em 1.55em; background:linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.78) 18%, rgba(0,0,0,.5) 42%, rgba(0,0,0,.22) 64%, rgba(0,0,0,.06) 82%, transparent 100%) !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__view::before, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .card__view::before, body.' + BODY_CLASS + ' .card.card--genre-compact .card__view::before { height:2.4em !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__svg-icon, body.' + BODY_CLASS + ' .card.card--genre-compact .card__svg-icon, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .streaming-card__svg-icon { border-radius:.35em !important; overflow:visible !important; background:transparent !important; clip-path:none !important; -webkit-clip-path:none !important; }',
        'body.' + BODY_CLASS + ' .card.card--button-compact .card__svg-icon svg, body.' + BODY_CLASS + ' .card.card--genre-compact .card__svg-icon svg, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .streaming-card__svg-icon svg, body.' + BODY_CLASS + ' .card.streaming-card--button-compact .streaming-card__svg-icon img { border-radius:0 !important; clip-path:none !important; -webkit-clip-path:none !important; }',
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
        'body.' + BODY_CLASS + ' { --agnative-scale: 1; --agnative-category-scale: 1; }',
        'body.' + BODY_CLASS + '[' + FONT_SIZE_ATTR + '="xs"] { --agnative-scale: .85; }',
        'body.' + BODY_CLASS + '[' + FONT_SIZE_ATTR + '="sm"] { --agnative-scale: .92; }',
        'body.' + BODY_CLASS + '[' + FONT_SIZE_ATTR + '="md"] { --agnative-scale: 1; }',
        'body.' + BODY_CLASS + '[' + FONT_SIZE_ATTR + '="lg"] { --agnative-scale: 1.12; }',
        'body.' + BODY_CLASS + '[' + FONT_SIZE_ATTR + '="xl"] { --agnative-scale: 1.24; }',
        'body.' + BODY_CLASS + '[' + CATEGORY_SIZE_ATTR + '="xs"] { --agnative-category-scale: .78; }',
        'body.' + BODY_CLASS + '[' + CATEGORY_SIZE_ATTR + '="sm"] { --agnative-category-scale: .9; }',
        'body.' + BODY_CLASS + '[' + CATEGORY_SIZE_ATTR + '="md"] { --agnative-category-scale: 1; }',
        'body.' + BODY_CLASS + '[' + CATEGORY_SIZE_ATTR + '="lg"] { --agnative-category-scale: 1.18; }',
        'body.' + BODY_CLASS + '[' + CATEGORY_SIZE_ATTR + '="xl"] { --agnative-category-scale: 1.4; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-shell__item.selector { font-size: calc(.85em * var(--agnative-scale, 1)) !important; }',
        'body.' + BODY_CLASS + ' .agnative-topnav-clock { font-size: calc(.88em * var(--agnative-scale, 1)) !important; }',
        'body.' + BODY_CLASS + ' .items-line__title { font-size: calc(1em * var(--agnative-scale, 1) * var(--agnative-category-scale, 1)) !important; }',
        'body.' + BODY_CLASS + ' .items-line__more.selector { font-size: calc(.72em * var(--agnative-scale, 1) * var(--agnative-category-scale, 1)) !important; }',
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
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .card .card__view { padding-bottom:140% !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .card.card--button-compact .card__view, body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .card.streaming-card--button-compact .card__view, body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .card.card--genre-compact .card__view { padding-bottom:56% !important; }',
        'body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .card__img, body.' + BODY_CLASS + '[' + BACKDROP_ATTR + '="off"] .card__image { object-position:center center !important; }',
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
        'body.' + BODY_CLASS + ' .community-watches-line-title,',
        'body.' + BODY_CLASS + ' .community-watches__title,',
        'body.' + BODY_CLASS + ' .community-watches .items-line__title,',
        'body.' + BODY_CLASS + ' .community-watches__line-title {',
        '  font-size: calc(1em * var(--agnative-scale, 1) * var(--agnative-category-scale, 1)) !important;',
        '  line-height: 1.2 !important;',
        '  font-weight: 700 !important;',
        '  letter-spacing: .01em !important;',
        '  margin: 0 !important;',
        '}',

        'body.' + BODY_CLASS + ' .navigation-bar { translate: 0 .35em !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-shell__inner { gap: 0 !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-shell__inner > * + * { margin-left: .18em !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-shell__items { gap: 0 !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-shell__items > * + * { margin-left: .08em !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-shell__right { gap: 0 !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-shell__right > * + * { margin-left: .08em !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-rightdock { gap: 0 !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .agnative-topnav-rightdock > * + * { margin-left: .08em !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .items-cards { gap: 0 !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .items-cards > * + * { margin-left: .62em !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .scroll__body.mapping--line { gap: 0 !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .scroll__body.mapping--line > * + * { margin-left: 1.5em !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .full-episode__date { gap: 0 !important; }',
        'body.' + BODY_CLASS + '[' + FLEX_GAP_ATTR + '="no"] .full-episode__date > * + * { margin-left: .5em !important; }',

        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .head__navigator,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .head__menu-icon,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-shell__inner,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-rightdock,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-clock,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-control-panel,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-control-panel__tile,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings__content.layer--height,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .selectbox__content.layer--height,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-logo,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-rating,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode .full-episode__num { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .head__navigator,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .head__menu-icon,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-shell__inner,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-rightdock,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-clock { background: rgba(22,24,30,.86) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-control-panel { background: rgba(40,48,62,.95) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings__content.layer--height { background: rgba(28,30,34,.96) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .selectbox__content.layer--height { background: rgba(26,29,34,.97) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-logo,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-rating,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode .full-episode__num { background: rgba(12,14,20,.88) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card .card__view::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode .full-episode__img::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .full-start-new__poster::after { display: none !important; content: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-overlay,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-shell__item { transition-duration: .12s !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card.focus .card__view { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.92), 0 6px 14px rgba(0,0,0,.22) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card.hover .card__view { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.60), 0 6px 14px rgba(0,0,0,.18) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode.focus .full-episode__img { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.92), 0 6px 14px rgba(0,0,0,.22) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode.hover .full-episode__img { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.60), 0 6px 14px rgba(0,0,0,.18) !important; }',

        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] :not(.full-start-new):not(.full-start-new *) { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card .card__view::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode .full-episode__img::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .full-start-new__poster::after { display: none !important; content: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .full-start-new__poster { will-change: auto !important; transform-style: flat !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-overlay,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-topnav-shell__item,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card__view,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode .full-episode__img,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode .full-episode { transition: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card .card__view, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode .full-episode__img { clip-path: none !important; -webkit-clip-path: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card.focus .card__view { transform: none !important; filter: none !important; box-shadow: 0 2px 6px rgba(0,0,0,.4) !important; box-sizing: border-box !important; border-color: rgba(86,141,255,.95) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card.hover .card__view { transform: none !important; filter: none !important; box-shadow: 0 2px 6px rgba(0,0,0,.4) !important; box-sizing: border-box !important; border-color: rgba(86,141,255,.65) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode.focus .full-episode__img { filter: none !important; box-shadow: 0 2px 6px rgba(0,0,0,.4) !important; box-sizing: border-box !important; border-color: rgba(86,141,255,.95) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode.hover .full-episode__img { filter: none !important; box-shadow: 0 2px 6px rgba(0,0,0,.4) !important; box-sizing: border-box !important; border-color: rgba(86,141,255,.65) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode.focus .full-episode, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode.hover .full-episode { transform: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .head__navigator,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .head__menu-icon,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-topnav-shell__inner,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-topnav-rightdock,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-topnav-clock { background: rgba(22,24,30,.96) !important; box-shadow: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .agnative-control-panel { background: rgba(28,30,34,.98) !important; box-shadow: 0 4px 10px rgba(0,0,0,.4) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .settings__content.layer--height { background: rgb(22,24,30) !important; box-shadow: 0 4px 12px rgba(0,0,0,.4) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .selectbox__content.layer--height { background: rgb(22,24,30) !important; box-shadow: 0 4px 12px rgba(0,0,0,.4) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-logo,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-rating,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode .full-episode__num { background: rgba(12,14,20,.94) !important; box-shadow: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card .card__view,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode .full-episode__img { box-shadow: 0 2px 6px rgba(0,0,0,.4) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-overlay { background: transparent !important; }',

        'body.' + BODY_CLASS + ' .wrap__left,',
        'body.' + BODY_CLASS + ' .menu,',
        'body.' + BODY_CLASS + ' .menu__content,',
        'body.' + BODY_CLASS + ' .menu .menu__list {',
        '  width: 0 !important;',
        '  min-width: 0 !important;',
        '  max-width: 0 !important;',
        '  padding: 0 !important;',
        '  margin: 0 !important;',
        '  border: 0 !important;',
        '  overflow: hidden !important;',
        '  visibility: hidden !important;',
        '  pointer-events: none !important;',
        '  opacity: 0 !important;',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '}',
        'body.' + BODY_CLASS + ' .wrap__left .menu__item,',
        'body.' + BODY_CLASS + ' .menu .menu__item {',
        '  pointer-events: none !important;',
        '}',

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
        '@keyframes agnativeSettingsLayerIn { from { opacity: 0; } to { opacity: 1; } }',
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

        '@media (max-width: 767px) {',
        '  body.' + BODY_CLASS + ' .agnative-topnav-shell { display: none !important; }',
        '  body.' + BODY_CLASS + ' .agnative-topnav-rightdock { font-size: 1.3em !important; }',
        '  body.' + BODY_CLASS + ' .head__menu-icon { font-size: 1.3em !important; }',
        '  body.' + BODY_CLASS + ' .head__navigator { position: absolute !important; top: 0 !important; left: 1em !important; font-size: 1.3em !important; }',
        '  body.' + BODY_CLASS + ' .activity.layer--width.activity--active { padding: 0 !important; }',
        '  body.' + BODY_CLASS + ' .head__navigator:empty { display: none !important; }',
        '  body.' + BODY_CLASS + ' .settings__content { top: .75em !important; bottom: .75em !important; right: .5em !important; width: calc(100vw - 1em) !important; max-width: calc(100vw - 1em) !important; }',
        '  body.' + BODY_CLASS + ' .selectbox__content,',
        '  body.' + BODY_CLASS + ' .selectbox__content.layer--height { top: .75em !important; bottom: .75em !important; right: .5em !important; width: calc(100vw - 1em) !important; max-width: calc(100vw - 1em) !important; }',
        '  body.' + BODY_CLASS + ' .settings-input__content,',
        '  body.' + BODY_CLASS + ' .settings-input__content.layer--height { width: 100% !important; }',
        '  body.' + BODY_CLASS + ' .settings-input__links { display: none !important; }',
        '  body.' + BODY_CLASS + ' .selectbox-item.selector { padding: .65em .85em !important; }',
        '}',
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
        'body.' + BODY_CLASS + ' .agnative-beta-badge { display:inline-block; margin-left:.6em; padding:.12em .5em; font-size:.55em; font-weight:800; letter-spacing:.06em; color:#fff; background:linear-gradient(135deg, #ff6b35, #c1272d); border-radius:.4em; vertical-align:middle; line-height:1.2; box-shadow:0 1px 4px rgba(193,39,45,.4); }',
        'body.' + BODY_CLASS + ' .agnative-hero { position:relative; width:auto; margin:1em 2.5em 1.5em; height:52vh; min-height:380px; overflow:hidden; border-radius:1.5em; opacity:1; transition:opacity .6s ease, transform .3s cubic-bezier(.22,.61,.36,1), box-shadow .3s ease; flex-shrink:0; display:block; z-index:8; box-shadow:0 16px 40px rgba(0,0,0,.32), 0 6px 14px rgba(0,0,0,.18); }',
        'body.' + BODY_CLASS + ' .agnative-hero__bg { position:absolute; top:0; left:0; right:0; bottom:auto; width:100%; height:auto; min-height:100%; object-fit:cover; object-position:center top; border-radius:1.5em; opacity:1; transition:opacity .4s ease; pointer-events:none; transform-origin:center center; will-change:transform, opacity; backface-visibility:hidden; -webkit-backface-visibility:hidden; transform:translate3d(0,0,0); }',
        '@keyframes agnative-hero-pan-down { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(0, calc(var(--hero-pan-y, 0px) * -1), 0); } }',
        '@keyframes agnative-hero-pan-up { from { transform: translate3d(0, calc(var(--hero-pan-y, 0px) * -1), 0); } to { transform: translate3d(0, 0, 0); } }',
        '@keyframes agnative-hero-zoom-in { from { transform: scale(1) translate3d(0,0,0); } to { transform: scale(1.1) translate3d(0,0,0); } }',
        '@keyframes agnative-hero-zoom-out { from { transform: scale(1.1) translate3d(0,0,0); } to { transform: scale(1) translate3d(0,0,0); } }',
        '@keyframes agnative-hero-drift { from { transform: scale(1.08) translate3d(-2%, -1.5%, 0); } to { transform: scale(1.08) translate3d(2%, 1.5%, 0); } }',
        '@keyframes agnative-hero-breathe { 0% { transform: scale(1) translate3d(0,0,0); } 50% { transform: scale(1.04) translate3d(0,0,0); } 100% { transform: scale(1) translate3d(0,0,0); } }',
        'body.' + BODY_CLASS + ' .agnative-hero.agnative-hero--hidden .agnative-hero__bg { opacity:0; }',
        'body.' + BODY_CLASS + ' .agnative-hero__trailer { position:absolute; top:0; left:0; right:0; bottom:0; overflow:hidden; border-radius:1.5em; opacity:0; transition:opacity .6s ease-out; pointer-events:none; background:#000; will-change:opacity; }',
        'body.' + BODY_CLASS + ' .agnative-hero--trailer .agnative-hero__trailer { opacity:1; }',
        'body.' + BODY_CLASS + ' .agnative-hero.agnative-hero--instant-trailer .agnative-hero__bg { transition:opacity .6s ease-out !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero.agnative-hero--instant-trailer.agnative-hero--trailer .agnative-hero__bg { opacity:0 !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero__trailer .agnative-hero__video { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; object-position:center center; border:0; display:block; pointer-events:none; background:#000; }',
        'body.' + BODY_CLASS + ' .agnative-hero__video::-webkit-media-controls { display:none !important; -webkit-appearance:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero__video::-webkit-media-controls-panel { display:none !important; -webkit-appearance:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero__video::-webkit-media-controls-play-button { display:none !important; -webkit-appearance:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero__video::-webkit-media-controls-start-playback-button { display:none !important; -webkit-appearance:none !important; opacity:0 !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero__video::-webkit-media-controls-overlay-play-button { display:none !important; -webkit-appearance:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero.agnative-hero--hidden .agnative-hero__trailer { opacity:0; }',
        'body.' + BODY_CLASS + ' .activity--active .items-line, body.' + BODY_CLASS + ' .activity--active .scroll__content { position:relative; z-index:10; }',
        'body.' + BODY_CLASS + ' .agnative-hero.agnative-hero--visible { opacity:1; }',
        'body.' + BODY_CLASS + ' .agnative-hero::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,.30) 28%, rgba(0,0,0,.05) 55%, transparent 78%); pointer-events:none; z-index:1; border-radius:1.5em; }',
        'body.' + BODY_CLASS + ' .agnative-hero__content { position:absolute; left:2.4em; right:auto; top:2em; bottom:auto; max-width:40%; display:flex; flex-direction:column; align-items:flex-start; z-index:2; }',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ALIGN_ATTR + '="center"] .agnative-hero__content { top:50%; bottom:auto; transform:translateY(-50%); }',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ALIGN_ATTR + '="bottom"] .agnative-hero__content { top:auto; bottom:2em; transform:none; }',
        'body.' + BODY_CLASS + ' .agnative-hero__badge { display:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero__logo { max-height:4.2em; max-width:70%; object-fit:contain; object-position:left center; filter:drop-shadow(0 4px 12px rgba(0,0,0,.7)); margin:.1em 0 .45em; }',
        'body.' + BODY_CLASS + ' .agnative-hero__title { font-size:2.3em; font-weight:900; color:#fff; text-shadow:0 2px 18px rgba(0,0,0,.85); line-height:1.05; margin:0 0 .25em; letter-spacing:.005em; }',
        'body.' + BODY_CLASS + ' .agnative-hero__year { font-size:.92em; font-weight:700; color:rgba(255,255,255,.85); margin-bottom:.35em; text-shadow:0 1px 8px rgba(0,0,0,.6); }',
        'body.' + BODY_CLASS + ' .agnative-hero__meta { display:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero__overview { font-size:.95em; line-height:1.4; color:rgba(255,255,255,.94); margin:0 0 1.1em; text-shadow:0 1px 8px rgba(0,0,0,.6); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; max-width:100%; font-weight:500; }',
        'body.' + BODY_CLASS + ' .agnative-hero__play.selector { position:absolute; inset:0; display:block; padding:0; background:transparent !important; border:0 !important; color:transparent !important; font-size:0 !important; cursor:pointer; outline:none; z-index:3; }',
        'body.' + BODY_CLASS + ' .agnative-hero__play.focus, body.' + BODY_CLASS + ' .agnative-hero__play.hover { background:transparent !important; box-shadow:none !important; transform:none !important; color:transparent !important; outline:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero:has(.agnative-hero__play.focus), body.' + BODY_CLASS + ' .agnative-hero:has(.agnative-hero__play.hover) { transform:scale(1.012); box-shadow:0 0 0 1.5px rgba(255,255,255,.9), 0 24px 60px rgba(0,0,0,.5), 0 8px 24px rgba(0,0,0,.3); }',
        'body.' + BODY_CLASS + ' .agnative-hero__indicators { position:absolute; left:50%; right:auto; bottom:1.4em; transform:translateX(-50%); display:inline-flex; gap:.42em; align-items:center; z-index:3; padding:.46em .62em; border-radius:999px; background:rgba(18,18,20,.42); box-shadow:0 2px 12px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08); backdrop-filter:blur(14px) saturate(140%); -webkit-backdrop-filter:blur(14px) saturate(140%); }',
        'body.' + BODY_CLASS + ' .agnative-hero__indicator { display:inline-block; width:.5em; height:.5em; border-radius:999px; background:rgba(255,255,255,.42); border:0; padding:0; cursor:pointer; outline:none; transition:background .25s ease, width .3s cubic-bezier(.22,.61,.36,1), box-shadow .25s ease; }',
        'body.' + BODY_CLASS + ' .agnative-hero__indicator.agnative-hero__indicator--active { background:#fff; width:1.25em; box-shadow:0 1px 4px rgba(0,0,0,.4); }',
        'body.' + BODY_CLASS + ' .agnative-hero__indicator:hover { background:rgba(255,255,255,.85) !important; outline:none !important; }',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"] .agnative-hero__title,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"] .agnative-hero__logo,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"] .agnative-hero__year,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"] .agnative-hero__meta,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"] .agnative-hero__overview,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"] .agnative-hero__badge { transition: opacity .45s ease, transform .55s ease; }',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"] .agnative-hero__bg { transition: opacity .35s ease; }',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"].agnative-hero--switching .agnative-hero__title,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"].agnative-hero--switching .agnative-hero__logo,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"].agnative-hero--switching .agnative-hero__year,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"].agnative-hero--switching .agnative-hero__meta,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"].agnative-hero--switching .agnative-hero__overview,',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"].agnative-hero--switching .agnative-hero__badge { opacity:0; transform:translateY(.6em); }',
        'body.' + BODY_CLASS + ' .agnative-hero[' + HERO_ANIMATION_ATTR + '="on"].agnative-hero--switching .agnative-hero__bg { opacity:0; }',
        'body.' + BODY_CLASS + ' .agnative-hero__overview:empty, body.' + BODY_CLASS + ' .agnative-hero__year:empty, body.' + BODY_CLASS + ' .agnative-hero__meta:empty, body.' + BODY_CLASS + ' .agnative-hero__badge:empty { display:none; }',

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

        // Smart TV: keep the native details geometry, remove mobile-only offsets,
        // and prefer cheap compositor-friendly transitions for stable 60 FPS.
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .activity__slides { padding-top:0 !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .full-start__body, body.' + BODY_CLASS + '.' + TV_CLASS + ' .full-start-new__body, body.' + BODY_CLASS + '.' + TV_CLASS + ' .full-start-new ~ .items-line, body.' + BODY_CLASS + '.' + TV_CLASS + ' .full-start ~ .items-line { transform:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .wrap__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .wrap__content .layer--height, body.' + BODY_CLASS + '.' + TV_CLASS + ' .wrap__content .layer--width { padding-top:0 !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .full-start-new__right { margin-top:0 !important; padding-top:0 !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .lampa-prisma-detail-logo { display:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' *, body.' + BODY_CLASS + '.' + TV_CLASS + ' *::before, body.' + BODY_CLASS + '.' + TV_CLASS + ' *::after { backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .card, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card .card__view, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card-episode, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selector { transition:transform .12s linear, background-color .12s linear, box-shadow .12s linear !important; will-change:transform !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .card.focus .card__view, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card.hover .card__view, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card-episode.focus .full-episode__img, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card-episode.hover .full-episode__img, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selector.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selector.hover, body.' + BODY_CLASS + '.' + TV_CLASS + ' .menu__item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .menu__item.hover { filter:none !important; border-color:rgba(255,255,255,.95) !important; outline:2px solid rgba(255,255,255,.95) !important; outline-offset:2px !important; box-shadow:0 0 0 2px rgba(255,255,255,.95), 0 8px 20px rgba(0,0,0,.28) !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .card.focus::after, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card.hover::after, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card__view::before, body.' + BODY_CLASS + '.' + TV_CLASS + ' .card__view::after, body.' + BODY_CLASS + '.' + TV_CLASS + ' .full-start-new__poster::after { display:none !important; content:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-param.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-folder.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .torrent-item.selector.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .torrent-serial.selector.focus { outline:2px solid rgba(255,255,255,.95) !important; outline-offset:2px !important; border-color:rgba(255,255,255,.95) !important; box-shadow:0 0 0 2px rgba(255,255,255,.95) !important; }',
        // TV source picker: wide, centered and readable from a distance.
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox__content.layer--height { top:8vh !important; right:8vw !important; bottom:8vh !important; left:8vw !important; width:auto !important; min-width:0 !important; max-width:none !important; transform:none !important; padding:1.7em 2em !important; border-radius:1.2em !important; background:rgba(18,20,25,.97) !important; box-shadow:0 18px 50px rgba(0,0,0,.55) !important; animation:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox__title { font-size:1.45em !important; padding:.15em 0 .55em !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox__body { padding:.5em .25em !important; mask-image:none !important; -webkit-mask-image:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item.selector { min-height:3.3em !important; margin-bottom:.55em !important; padding:1em 1.25em !important; border-radius:.75em !important; font-size:1.25em !important; transition:background-color .12s linear, outline-color .12s linear !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item.hover { background:rgba(255,255,255,.18) !important; outline:3px solid #fff !important; outline-offset:-3px !important; border-color:#fff !important; box-shadow:none !important; transform:none !important; }',
        // TV navigation: larger hit areas and safe margins for a remote control.
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell { top:1em !important; max-width:calc(100vw - 30em) !important; height:3.25em !important; font-size:1.12em !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__inner, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-rightdock { height:3.25em !important; padding:.28em .42em !important; border-radius:1em !important; background:rgba(18,20,25,.9) !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item.selector { min-width:6.2em !important; height:2.65em !important; padding:0 1.15em !important; font-size:1em !important; border-radius:.72em !important; transition:background-color .12s linear, outline-color .12s linear !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item--icon.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-right__profile.selector { width:2.65em !important; min-width:2.65em !important; height:2.65em !important; padding:0 !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-rightdock { right:1.5em !important; top:1em !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .head__menu-icon { left:1.5em !important; top:1em !important; width:3.25em !important; height:3.25em !important; font-size:1.15em !important; background:rgba(18,20,25,.9) !important; border-radius:1em !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock { left:1.5em !important; max-width:18em !important; max-height:82vh !important; padding:.5em !important; border-radius:1em !important; background:rgba(18,20,25,.97) !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; font-size:clamp(1rem,1.15vw,1.55rem) !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock__item.selector { min-height:2.9em !important; padding:.55em 1em !important; border-radius:.7em !important; font-size:1em !important; transition:background-color .12s linear, outline-color .12s linear !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item.hover, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-right__profile.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-right__profile.hover, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-clock.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-clock.hover, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock__item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock__item.hover { background:rgba(255,255,255,.2) !important; outline:3px solid #fff !important; outline-offset:-3px !important; border-color:#fff !important; box-shadow:none !important; transform:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .selector.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selector.hover { outline-color:#fff !important; }',
        // Glossy black surfaces for TV controls and modal menus.
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__inner, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-rightdock, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-control-panel, body.' + BODY_CLASS + '.' + TV_CLASS + ' .navigation-bar__body, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox__content.layer--height, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings__content.layer--height, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-input__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-input--free, body.' + BODY_CLASS + '.' + TV_CLASS + ' .menu__body { background:#000 !important; background-image:none !important; border-color:#000 !important; box-shadow:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-clock, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-right__profile, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock__item.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-control-panel__tile.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .navigation-bar__item, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-param.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-folder.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .simple-button, body.' + BODY_CLASS + '.' + TV_CLASS + ' .button.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .menu__item.selector { background:#000 !important; background-image:none !important; border-color:#000 !important; box-shadow:none !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item.hover, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock__item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock__item.hover, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item.hover, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-param.focus, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-folder.focus { background:linear-gradient(180deg,rgba(65,65,70,.98) 0%,rgba(16,16,18,.99) 55%,#000 100%) !important; }',
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-hero { display:block !important; visibility:visible !important; opacity:1 !important; min-height:420px !important; }',
        // Final TV override: solid black everywhere, including focused controls.
        'body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-leftdock *, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__inner, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-shell__item, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-rightdock, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-clock, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-topnav-right__profile, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-control-panel, body.' + BODY_CLASS + '.' + TV_CLASS + ' .agnative-control-panel__tile, body.' + BODY_CLASS + '.' + TV_CLASS + ' .navigation-bar__body, body.' + BODY_CLASS + '.' + TV_CLASS + ' .navigation-bar__item, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .selectbox-item, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-param, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-folder, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-input__content, body.' + BODY_CLASS + '.' + TV_CLASS + ' .settings-input--free, body.' + BODY_CLASS + '.' + TV_CLASS + ' .simple-button, body.' + BODY_CLASS + '.' + TV_CLASS + ' .button.selector, body.' + BODY_CLASS + '.' + TV_CLASS + ' .menu__item.selector { background:#000 !important; background-image:none !important; border-color:#000 !important; box-shadow:none !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }'
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
      if (value === 'multmovie' || value === 'multfilm' || value === 'cartoons') return 'cartoon';
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

    function replaceMenuActivity(params) {
      if (!window.Lampa || !Lampa.Activity) return false;
      try {
        // From a full movie page the catalog must replace that page, not be
        // stacked behind it. This is especially important on TV where the
        // back stack otherwise restores the previously opened title.
        if (typeof Lampa.Activity.replace === 'function') {
          Lampa.Activity.replace(params);
          return true;
        }
        if (typeof Lampa.Activity.push === 'function') {
          Lampa.Activity.push(params);
          return true;
        }
      } catch (e) { }
      return false;
    }

    function triggerMenuAction(action) {
      action = normalizeTopnavAction(action);
      try {
        if (!window.Lampa) return false;
        // Native hidden menu items can inherit the currently focused card on
        // TV and open its Play screen. Route all primary sections directly.
        var directRoute = action === 'main' || action === 'movie' || action === 'tv' || action === 'anime' || action === 'cartoon';
        var nativeMenuItem = directRoute ? null : getMenuItem(action);
        if (nativeMenuItem && triggerSelectorEnter(nativeMenuItem)) return true;

        var Storage = Lampa.Storage;
        var Lang = Lampa.Lang;
        if (!Storage || !Lang || !Lampa.Activity) return false;

        if (action === 'movie' || action === 'tv' || action === 'anime') {
          replaceMenuActivity({
            url: action,
            title: (action === 'movie' ? Lang.translate('menu_movies') : action === 'anime' ? Lang.translate('menu_anime') : Lang.translate('menu_tv')) + ' - ' + Storage.field('source').toUpperCase(),
            component: 'category',
            source: action === 'anime' ? 'cub' : Storage.field('source'),
            page: 1
          });
          return true;
        }

        if (action === 'cartoon') {
          replaceMenuActivity({
            url: 'movie',
            title: Lang.translate('menu_multmovie') + ' - ' + Storage.field('source').toUpperCase(),
            component: 'category',
            genres: 16,
            page: 1
          });
          return true;
        }

        if (action === 'main') {
          replaceMenuActivity({
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
      bindLeftdockKeyGuard();
      focusLeftdock(dock);
      // Some TV builds finish the controller transition one tick later and
      // leave focus on the card underneath the dock. Re-assert the collection
      // after the transition so Enter cannot start that card.
      setTimeout(function () {
        if (dock.classList.contains('is-visible')) focusLeftdock(dock);
      }, 0);
    }

    function focusLeftdock(dock) {
      if (!dock || !window.Lampa || !Lampa.Controller || !window.$) return;
      try {
        var view = $(dock);
        var current = qs('.agnative-leftdock__item.is-active', dock) ||
          qs('.agnative-leftdock__item.selector', dock);
        Lampa.Controller.collectionSet(view);
        Lampa.Controller.collectionFocus(current || false, view, true);
      } catch (e) { }
    }

    function bindLeftdockKeyGuard() {
      if (leftdockKeyGuardBound || !document || !document.addEventListener) return;
      leftdockKeyGuardBound = true;
      document.addEventListener('keydown', function (e) {
        if (!isTvDevice()) return;
        var dock = qs('.agnative-leftdock.is-visible');
        if (!dock) return;
        var code = e.keyCode || 0;
        var key = e.key || '';
        var items = qsa('.agnative-leftdock__item.selector', dock);
        if (!items.length) return;
        var index = -1;
        for (var i = 0; i < items.length; i++) {
          if (items[i].classList.contains('focus') || items[i].classList.contains('hover')) { index = i; break; }
        }
        if (index < 0) index = leftdockKeyIndex >= 0 ? leftdockKeyIndex : 0;
        if (key === 'ArrowDown' || code === 40 || key === 'ArrowUp' || code === 38) {
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          index = key === 'ArrowUp' || code === 38 ? index - 1 : index + 1;
          if (index < 0) index = items.length - 1;
          if (index >= items.length) index = 0;
          leftdockKeyIndex = index;
          items.forEach(function (item, n) {
            item.classList.toggle('focus', n === index);
            item.classList.toggle('hover', n === index);
          });
          scrollLeftdockItemIntoView(items[index], dock);
          return false;
        }
        if (key === 'Enter' || key === ' ' || code === 13 || code === 32) {
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          leftdockKeyIndex = index;
          items[index].click();
          return false;
        }
        if (key === 'Escape' || key === 'Backspace' || code === 27 || code === 8) {
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          try { Lampa.Controller.toggle('content'); } catch (err) { hideLeftdock(true, true); }
          return false;
        }
      }, true);
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
              bindAction(btn, function () {
                var route = normalizeTopnavAction(action);
                // Category/home routes must not be sent through the hidden
                // menu controller: on TV it can reuse the focused card and
                // open its Play screen instead of the requested section.
                if (route === 'main' || route === 'movie' || route === 'tv' || route === 'anime' || route === 'cartoon') {
                  if (triggerMenuAction(route)) return;
                }
                // Use the real menu item's click, not hover:enter. The latter
                // is also used by cards and may open the currently focused film.
                if (sourceItem) clickNode(sourceItem);
              });
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
            focusLeftdock(d);
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
        langs.push('null');

        var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
          '/images?api_key=' + TMDB_KEY + '&include_image_language=' + langs.join(',');

        fetch(url).then(function (r) { return r.json(); }).then(function (data) {
          var logo = null;
          if (data.logos && data.logos.length) {
            var preferred = data.logos.filter(function (l) { return l.iso_639_1 === lang; });
            var english = data.logos.filter(function (l) { return l.iso_639_1 === 'en'; });
            var picked = preferred[0] || english[0] || data.logos[0];
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
    // Reuse the same TMDB logo resolver on the full details page.
    window.AgNativeLogo = window.AgNativeLogo || {};
    window.AgNativeLogo.fetch = fetchLogo;
    window.AgNativeLogo.url = logoImgUrl;

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
      var isTv = isTvDevice();
      var isUltra = isTv || perfLevel === 'ultra';
      var cardPosterQuality = isTv ? 'w342' : getPosterQuality();
      var cardBackdropQuality = isTv ? 'w300' : getBackdropQuality();
      var cardImageMode = getCardImageMode();

      var imgEl = cardEl.querySelector('.card__img');
      var useHorizontal = backdropEnabled();

      function setImgUrl(url) {
        if (!imgEl) return;
        if (isTv) {
          if (imgEl.tagName === 'IMG') {
            imgEl.loading = 'lazy';
            imgEl.decoding = 'async';
            imgEl.setAttribute('fetchpriority', 'low');
            imgEl.src = url;
          } else {
            imgEl.style.backgroundImage = 'url(' + url + ')';
          }
          imgEl.style.objectFit = 'cover';
          imgEl.style.objectPosition = 'center';
          return;
        }
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
            setImgUrl(Lampa.TMDB.image('t/p/' + cardBackdropQuality + data.backdrop_path));
          }
        } else {
          var bTmdbType = data.name ? 'tv' : 'movie';
          if (data.poster_path) {
            setImgUrl(Lampa.TMDB.image('t/p/' + cardPosterQuality + data.poster_path));
          }
          if (data.id && !isTv) {
            fetchCleanPoster(data.id, bTmdbType, function (cleanPath) {
              if (cleanPath) {
                setImgUrl(Lampa.TMDB.image('t/p/' + cardPosterQuality + cleanPath));
              } else if (data.backdrop_path) {
                setImgUrl(Lampa.TMDB.image('t/p/' + cardBackdropQuality + data.backdrop_path));
              }
            });
          } else if (data.backdrop_path) {
            setImgUrl(Lampa.TMDB.image('t/p/' + cardBackdropQuality + data.backdrop_path));
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
          if (data.poster_path) setImgUrl(Lampa.TMDB.image('t/p/' + cardPosterQuality + data.poster_path));
          fetchTitledBackdrop(data.id, pTmdbType, function (titledPath) {
            if (titledPath) {
              setImgUrl(Lampa.TMDB.image('t/p/' + cardBackdropQuality + titledPath));
            }
            buildPosterOverlay();
          });
        } else {
          if (data.poster_path) setImgUrl(Lampa.TMDB.image('t/p/' + cardPosterQuality + data.poster_path));
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
      syncTvClass();
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

      prune(getCacheMaxBytes());
      injectStyle();
      if (document.body) document.body.classList.add(BODY_CLASS);
      syncTvClass();
      syncGlareClass();
      syncFontSize();
      syncCardSize();
      syncLogoSize();
      syncCardFlags();
      syncPerfMode();
      syncFlexGapFlag();
      syncOverlayAlign();
      syncTopnavSize();
      applyHiddenSettingsSectionsCSS();
      observeCards();
      bindInputModeDetector();
      initGlareRuntime();
      neutralizeMenuController();
      patchActivityPushForMenu();
      patchControllerToggleForLeftdock();
      watchSettingsLifecycle();
      processCards(document.body);
      schedulePatch();
      // Polling retry: try build hero every 1s for 30s, until built
      var heroAttempts = 0;
      var heroPoll = setInterval(function () {
        heroAttempts++;
        if (heroAttempts > 30 || document.querySelector('.agnative-hero') || !pluginEnabled() || !heroBannerEnabled()) {
          clearInterval(heroPoll);
          return;
        }
        buildHeroBanner();
      }, 1000);
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

/* Prisma-style info & buttons on the full details page
 * Keeps the standard Lampa layout (normal background and poster).
 * One big "Дивитися" button; all sources open in a menu after pressing it. */
(function () {
    'use strict';
    var STYLE_ID = 'lampa-prisma-buttons-skin-v3';
    var B = 'body.appletv-agnative-topnav ';
    var MORE_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
    var PLAY_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M10 8.5 16 12l-6 3.5z" fill="currentColor" stroke="none"/></svg>';

    function isTvScreen() {
        try {
            if (window.Lampa && Lampa.Platform && typeof Lampa.Platform.screen === 'function' && Lampa.Platform.screen('tv')) return true;
            var ua = String((window.navigator && window.navigator.userAgent) || '').toLowerCase();
            return /smart[- ]?tv|googletv|android ?tv|aftb|afts|webos|tizen|netcast|viera|bravia|hbbtv/.test(ua);
        } catch (e) { return false; }
    }

    function css() {
        return [
            B + '.full-start-new__right{text-align:center;display:flex;flex-direction:column;align-items:center;margin-top:-17em!important;padding-top:1em!important}',
            B + '.full-start-new__head{color:rgba(255,255,255,.72)!important;margin-bottom:.35em!important}',
            B + '.full-start-new__title{font-size:clamp(1.9em,4vw,3.4em)!important;line-height:1.15!important;color:#fff!important;margin:0 auto .1em!important;max-width:100%;-webkit-line-clamp:3!important}',
            B + '.full-start-new__tagline{color:rgba(255,255,255,.62)!important;margin:.1em auto .6em!important;font-size:1.3em!important;line-height:1.25!important;max-width:100%}',
            /* rating row: smaller, tidy, no overlap with the next row */
            B + '.full-start-new__rate-line{display:flex!important;justify-content:center;align-items:center;flex-wrap:wrap;gap:.5em;margin:.2em 0 .9em!important;padding:0!important;font-size:.82em!important}',
            B + '.full-start-new__rate-line>*{margin:0!important}',
            B + '.full-start-new__rate-line .full-start__rate{display:inline-flex;align-items:baseline;gap:.35em;padding:.25em .6em!important;border-radius:.7em;background:rgba(0,0,0,.28)}',
            B + '.full-start__rate>div:first-child{font-size:1.45em!important;font-weight:700;color:#fff;line-height:1.1}',
            B + '.full-start__rate>div:last-child{font-size:.7em;color:rgba(255,255,255,.55)!important;letter-spacing:.08em}',
            B + '.full-start__pg,' + B + '.full-start__status{font-size:.95em!important;border:1px solid rgba(255,255,255,.32)!important;border-radius:.5em!important;padding:.15em .5em!important;color:#fff!important;background:rgba(255,255,255,.06)!important}',
            /* details (seasons / episodes / genres): no overlap, readable */
            B + '.full-start-new__details{justify-content:center;color:rgba(255,255,255,.82)!important;font-size:.98em!important;line-height:1.45!important;margin:0 0 .9em!important;position:relative;z-index:1}',
            B + '.full-start-new__reactions{justify-content:center;min-height:0!important;margin-bottom:.4em!important}',
            B + ' .full-start-new__poster{position:relative!important;overflow:hidden!important}',
            B + ' .lampa-prisma-detail-logo{position:absolute;top:calc(.85em + 3.1cm);bottom:auto;left:50%;z-index:12;display:flex!important;align-items:center;justify-content:center;width:100%;min-height:1.5em;margin:0;transform:translateX(-50%);pointer-events:none}',
            B + ' .lampa-prisma-detail-logo img{display:block;width:auto;max-width:100%;max-height:8.4em;object-fit:contain;filter:drop-shadow(0 3px 9px rgba(0,0,0,.78))}',
            B + '.lampa-prisma-detail-logo.is-empty{display:none!important}',
            /* buttons row */
            B + '.full-start-new__buttons{display:flex!important;justify-content:center;align-items:center;gap:.6em;width:100%;margin:.55em 0 0!important;flex-wrap:nowrap}',
            B + '.full-start-new__buttons .full-start__button{border:1px solid rgba(255,255,255,.10)!important;border-radius:999px!important;background:rgba(22,24,30,.26)!important;height:3.6em;min-height:3.6em;box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 8px 18px rgba(0,0,0,.12)!important;backdrop-filter:blur(18px) saturate(140%)!important;-webkit-backdrop-filter:blur(18px) saturate(140%)!important;transition:transform .2s ease,background .2s ease,border-color .2s ease}',
            B + '.full-start-new__buttons .full-start__button.focus,' + B + '.full-start-new__buttons .full-start__button:hover{background:rgba(255,255,255,.14)!important;border-color:rgba(255,255,255,.20)!important;transform:scale(1.04)}',
            '.full-start-new__buttons .button--play,.full-start-new__buttons .button--play.hide,.full-start-new__buttons .button--play[hidden]{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}',
            B + '.full-start-new__buttons .button--play,' + B + '.full-start-new__buttons .button--play.hide,' + B + '.full-start-new__buttons .button--play[hidden]{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}',
            B + '.full-start-new__buttons .button--play{flex:1 1 auto;max-width:15em;padding:0 2em!important;display:inline-flex!important;align-items:center;justify-content:center;gap:.6em}',
            B + '.full-start-new__buttons .button--play span{font-weight:700}',
            B + '.full-start-new__buttons .button--book,' + B + '.full-start-new__buttons .button--reaction,' + B + '.full-start-new__buttons .button--subscribe,' + B + '.full-start-new__buttons .button--options,' + B + '.full-start-new__buttons .lampa-prisma-more{flex:0 0 3.6em;width:3.6em!important;padding:0!important;display:inline-flex!important;align-items:center;justify-content:center}',
            B + '.full-start-new__buttons .button--book span,' + B + '.full-start-new__buttons .button--reaction span,' + B + '.full-start-new__buttons .button--subscribe span{display:none!important}',
            B + '.full-start-new__buttons svg{width:1.4em;height:1.4em;margin:0!important}',
            /* every source/plugin button is hidden: they live in the menu behind "Дивитися" */
            B + '.full-start-new__buttons .lampa-prisma-hidden{display:none!important}',
            '@media(max-width:700px){' + B + '.full-start-new__right{margin-top:-15em!important}' + B + '.full-start-new__buttons .button--play{max-width:11em;padding:0 1.3em!important}}'
        ].join('');
    }

    function install() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css();
        (document.head || document.documentElement).appendChild(style);
    }

    var KEEP = ['button--play', 'button--book', 'button--reaction', 'button--subscribe', 'button--options', 'lampa-prisma-more'];
    function isKept(el) {
        for (var i = 0; i < KEEP.length; i++) if (el.classList.contains(KEEP[i])) return true;
        return false;
    }

    function labelOf(el) {
        var span = el.querySelector('span');
        var text = (span ? span.textContent : el.textContent) || '';
        text = text.replace(/\s+/g, ' ').trim();
        return text || 'Джерело';
    }

    function detailItem(root, event) {
        var candidates = [
            root && root.card_data,
            root && root.dataset,
            event && event.object && event.object.card,
            event && event.object && event.object.data,
            event && event.object && event.object.activity && event.object.activity.data,
            event && event.object && event.object.activity && event.object.activity.card_data,
            event && event.card,
            event && event.data,
            event && event.object
        ];
        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];
            if (!item || typeof item !== 'object') continue;
            var id = item.tmdb_id || item.tmdbId || item.id;
            if (id) {
                var rawType = String(item.media_type || item.type || '').toLowerCase();
                var isSeries = rawType === 'tv' || rawType === 'series' || rawType === 'anime' ||
                    !!item.name || !!item.first_air_date || !!item.number_of_episodes;
                return { id: id, type: isSeries ? 'tv' : 'movie' };
            }
        }
        var poster = root && root.querySelector('.full-start-new__poster img, .full-start__poster img');
        var raw = poster && (poster.getAttribute('src') || poster.getAttribute('data-src') || '');
        var match = raw.match(/\/t\/p\/[^/]+\/([^?]+)/);
        return match ? null : null;
    }

    function renderDetailLogo(root, event) {
        if (!root) return;
        var poster = root.querySelector('.full-start-new__poster');
        if (!poster) return;
        var holder = poster.querySelector('.lampa-prisma-detail-logo');
        if (!holder) {
            holder = document.createElement('div');
            holder.className = 'lampa-prisma-detail-logo is-empty';
            poster.appendChild(holder);
        }
        var item = detailItem(root, event);
        var resolver = window.AgNativeLogo;
        if (!item || !resolver || typeof resolver.fetch !== 'function') return;
        var type = item.type === 'tv' ? 'tv' : 'movie';
        if (holder.getAttribute('data-logo-key') === type + '/' + item.id) return;
        holder.setAttribute('data-logo-key', type + '/' + item.id);
        holder.classList.add('is-empty');
        function applyLogo(logo, triedAlternate) {
            if (!logo || !logo.path) {
                if (!triedAlternate) {
                    resolver.fetch(item.id, type === 'tv' ? 'movie' : 'tv', function (alternate) {
                        applyLogo(alternate, true);
                    });
                }
                return;
            }
            if (holder.getAttribute('data-logo-key') !== type + '/' + item.id) return;
            var img = document.createElement('img');
            img.alt = '';
            img.src = resolver.url(logo.path);
            img.onload = function () { holder.textContent = ''; holder.appendChild(img); holder.classList.remove('is-empty'); };
            img.onerror = function () { holder.classList.add('is-empty'); };
        }
        resolver.fetch(item.id, type, function (logo) { applyLogo(logo, false); });
    }

    function collect(root) {
        var all = root.querySelectorAll('.full-start-new__buttons .full-start__button, .buttons--container .full-start__button, .full-start__buttons .full-start__button');
        var out = [];
        var seen = {};
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var key = labelOf(el);
            if (seen[key]) continue;
            seen[key] = 1;
            if (el.classList.contains('button--play') || el.classList.contains('lampa-prisma-more') || el.classList.contains('button--priority')) continue;
            if (isKept(el)) continue;
            var inContainer = !!(el.closest && el.closest('.buttons--container'));
            if (el.classList.contains('hide') && !inContainer) continue;
            out.push(el);
        }
        return out;
    }

    function trigger(el) {
        try {
            if (window.$ && window.jQuery) { window.$(el).trigger('hover:enter'); return; }
        } catch (e) {}
        try { el.dispatchEvent(new Event('hover:enter')); } catch (e2) {}
        try { el.click(); } catch (e3) {}
    }

    function showMenu(root) {
        var sources = collect(root);
        if (!sources.length) {
            try { Lampa.Noty.show('Шукаю джерела...'); } catch (e) {}
            setTimeout(function () {
                if (collect(root).length) showMenu(root);
                else { try { Lampa.Noty.show('Джерел не знайдено'); } catch (e) {} }
            }, 1200);
            return;
        }
        var items = sources.map(function (el) {
            var svg = el.querySelector('svg');
            return {
                title: labelOf(el),
                template: svg ? 'selectbox_icon' : 'selectbox_item',
                icon: svg ? svg.outerHTML : '',
                node: el
            };
        });
        var controller = '';
        try { controller = Lampa.Controller.enabled().name; } catch (e) {}
        Lampa.Select.show({
            title: 'Дивитися',
            items: items,
            onSelect: function (item) {
                try { Lampa.Controller.toggle(controller || 'content'); } catch (e) {}
                trigger(item.node);
            },
            onBack: function () {
                try { Lampa.Controller.toggle(controller || 'content'); } catch (e) {}
            }
        });
    }

    function bind(root) {
        var row = root.querySelector('.full-start-new__buttons');
        if (!row) return;
        renderDetailLogo(root, window.__lampaFullEvent || null);
        var play = row.querySelector('.button--play');
        if (!play) {
            // Some Lampa builds omit the native play button when sources arrive
            // asynchronously (or when no provider reports itself in time).
            // Create the stable primary action so the user can retry source lookup.
            play = document.createElement('div');
            play.className = 'full-start__button button--play selector';
            play.innerHTML = PLAY_ICON + '<span>Дивитися</span>';
            row.insertBefore(play, row.firstElementChild || null);
        }
        if (play) {
            play.classList.remove('hide');
            play.hidden = false;
            play.removeAttribute('aria-hidden');
            // Lampa can apply an inline hide after the details view is rendered.
            // Keep the primary action visible instead of only removing the class.
            play.style.setProperty('display', 'inline-flex', 'important');
            play.style.setProperty('visibility', 'visible', 'important');
            play.style.setProperty('opacity', '1', 'important');
            play.style.setProperty('pointer-events', 'auto', 'important');
            if (row.firstElementChild !== play) row.insertBefore(play, row.firstElementChild);
        }
        // Hide every source/plugin action in the row, including buttons from
        // providers that use a different class name in newer Lampa builds.
        // Keep only the standard actions and the primary Play action.
        var kids = row.children;
        for (var i = 0; i < kids.length; i++) {
            var el = kids[i];
            if (isKept(el)) continue;
            if (!el.classList.contains('lampa-prisma-hidden')) el.classList.add('lampa-prisma-hidden');
        }
        // make sure the hidden-container sources are also available
        if (play && !play.getAttribute('data-prisma-bound')) {
            play.setAttribute('data-prisma-bound', '1');
            var handler = function (e) {
                if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
                if (e && e.preventDefault) e.preventDefault();
                showMenu(root);
            };
            if (window.$ && window.jQuery) {
                window.$(play).unbind('hover:enter').on('hover:enter', handler);
                window.$(play).off('click').on('click', handler);
            } else {
                play.addEventListener('click', handler, true);
            }
        }
        // compact "options" button should be a round icon only
        var opts = row.querySelector('.button--options');
        if (opts && !opts.querySelector('svg')) opts.innerHTML = MORE_ICON;
    }

    var timer = null;
    function scan() {
        var roots = document.querySelectorAll('.full-start-new');
        for (var i = 0; i < roots.length; i++) bind(roots[i]);
    }
    function schedule() {
        if (timer) return;
        timer = setTimeout(function () { timer = null; scan(); }, 120);
    }

    function start() {
        // Applecation is the TV details interface. Do not overwrite its
        // template, button row or source picker with the mobile Prisma skin.
        if (isTvScreen()) {
            var oldStyle = document.getElementById(STYLE_ID);
            if (oldStyle) oldStyle.remove();
            return;
        }
        install();
        scan();
        try {
            var mo = new MutationObserver(schedule);
            mo.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
            });
        } catch (e) { setInterval(scan, 800); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
    if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready' && !isTvScreen()) { install(); scan(); } });
        Lampa.Listener.follow('full', function (e) {
            if (isTvScreen()) return;
            window.__lampaFullEvent = e;
            schedule();
            setTimeout(function () { scan(); }, 350);
        });
    }
})();
/* Embedded Applecation TV details plugin v1.2.1. */
(function () {
  if (window.__LampaCombinedApplecationEmbedded) return;
  window.__LampaCombinedApplecationEmbedded = true;
  !function(){"use strict";const t="1.2.1",e='<svg viewBox="110 90 180 210"xmlns=http://www.w3.org/2000/svg><g id=sphere><circle cx=200 cy=140 fill="hsl(200, 80%, 40%)"opacity=0.3 r=1.2 /><circle cx=230 cy=150 fill="hsl(200, 80%, 45%)"opacity=0.35 r=1.3 /><circle cx=170 cy=155 fill="hsl(200, 80%, 42%)"opacity=0.32 r=1.2 /><circle cx=245 cy=175 fill="hsl(200, 80%, 48%)"opacity=0.38 r=1.4 /><circle cx=155 cy=180 fill="hsl(200, 80%, 44%)"opacity=0.34 r=1.3 /><circle cx=215 cy=165 fill="hsl(200, 80%, 46%)"opacity=0.36 r=1.2 /><circle cx=185 cy=170 fill="hsl(200, 80%, 43%)"opacity=0.33 r=1.3 /><circle cx=260 cy=200 fill="hsl(200, 80%, 50%)"opacity=0.4 r=1.5 /><circle cx=140 cy=200 fill="hsl(200, 80%, 50%)"opacity=0.4 r=1.5 /><circle cx=250 cy=220 fill="hsl(200, 80%, 48%)"opacity=0.38 r=1.4 /><circle cx=150 cy=225 fill="hsl(200, 80%, 47%)"opacity=0.37 r=1.4 /><circle cx=235 cy=240 fill="hsl(200, 80%, 45%)"opacity=0.35 r=1.3 /><circle cx=165 cy=245 fill="hsl(200, 80%, 44%)"opacity=0.34 r=1.3 /><circle cx=220 cy=255 fill="hsl(200, 80%, 42%)"opacity=0.32 r=1.2 /><circle cx=180 cy=258 fill="hsl(200, 80%, 41%)"opacity=0.31 r=1.2 /><circle cx=200 cy=120 fill="hsl(200, 80%, 60%)"opacity=0.5 r=1.8 /><circle cx=240 cy=135 fill="hsl(200, 80%, 65%)"opacity=0.55 r=2 /><circle cx=160 cy=140 fill="hsl(200, 80%, 62%)"opacity=0.52 r=1.9 /><circle cx=270 cy=165 fill="hsl(200, 80%, 70%)"opacity=0.6 r=2.2 /><circle cx=130 cy=170 fill="hsl(200, 80%, 67%)"opacity=0.57 r=2.1 /><circle cx=255 cy=190 fill="hsl(200, 80%, 72%)"opacity=0.62 r=2.3 /><circle cx=145 cy=195 fill="hsl(200, 80%, 69%)"opacity=0.59 r=2.2 /><circle cx=280 cy=200 fill="hsl(200, 80%, 75%)"opacity=0.65 r=2.5 /><circle cx=120 cy=200 fill="hsl(200, 80%, 75%)"opacity=0.65 r=2.5 /><circle cx=275 cy=215 fill="hsl(200, 80%, 73%)"opacity=0.63 r=2.4 /><circle cx=125 cy=220 fill="hsl(200, 80%, 71%)"opacity=0.61 r=2.3 /><circle cx=260 cy=235 fill="hsl(200, 80%, 68%)"opacity=0.58 r=2.2 /><circle cx=140 cy=240 fill="hsl(200, 80%, 66%)"opacity=0.56 r=2.1 /><circle cx=245 cy=255 fill="hsl(200, 80%, 63%)"opacity=0.53 r=2 /><circle cx=155 cy=260 fill="hsl(200, 80%, 61%)"opacity=0.51 r=1.9 /><circle cx=225 cy=270 fill="hsl(200, 80%, 58%)"opacity=0.48 r=1.8 /><circle cx=175 cy=272 fill="hsl(200, 80%, 56%)"opacity=0.46 r=1.7 /><circle cx=200 cy=100 fill="hsl(200, 80%, 85%)"opacity=0.8 r=2.8 /><circle cx=230 cy=115 fill="hsl(200, 80%, 90%)"opacity=0.85 r=3 /><circle cx=170 cy=120 fill="hsl(200, 80%, 87%)"opacity=0.82 r=2.9 /><circle cx=250 cy=140 fill="hsl(200, 80%, 92%)"opacity=0.88 r=3.2 /><circle cx=150 cy=145 fill="hsl(200, 80%, 89%)"opacity=0.84 r=3.1 /><circle cx=265 cy=170 fill="hsl(200, 80%, 95%)"opacity=0.9 r=3.4 /><circle cx=135 cy=175 fill="hsl(200, 80%, 93%)"opacity=0.87 r=3.3 /><circle cx=275 cy=200 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.5 /><circle cx=125 cy=200 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.5 /><circle cx=200 cy=200 fill="hsl(200, 80%, 100%)"opacity=1 r=4 /><circle cx=220 cy=195 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.8 /><circle cx=180 cy=205 fill="hsl(200, 80%, 97%)"opacity=0.93 r=3.7 /><circle cx=240 cy=210 fill="hsl(200, 80%, 96%)"opacity=0.92 r=3.6 /><circle cx=160 cy=215 fill="hsl(200, 80%, 95%)"opacity=0.9 r=3.5 /><circle cx=270 cy=230 fill="hsl(200, 80%, 94%)"opacity=0.88 r=3.4 /><circle cx=130 cy=235 fill="hsl(200, 80%, 92%)"opacity=0.86 r=3.3 /><circle cx=255 cy=250 fill="hsl(200, 80%, 90%)"opacity=0.84 r=3.2 /><circle cx=145 cy=255 fill="hsl(200, 80%, 88%)"opacity=0.82 r=3.1 /><circle cx=235 cy=265 fill="hsl(200, 80%, 86%)"opacity=0.8 r=3 /><circle cx=165 cy=268 fill="hsl(200, 80%, 84%)"opacity=0.78 r=2.9 /><circle cx=215 cy=280 fill="hsl(200, 80%, 82%)"opacity=0.76 r=2.8 /><circle cx=185 cy=282 fill="hsl(200, 80%, 80%)"opacity=0.74 r=2.7 /><circle cx=200 cy=290 fill="hsl(200, 80%, 78%)"opacity=0.72 r=2.6 /><circle cx=210 cy=130 fill="hsl(200, 80%, 88%)"opacity=0.83 r=2.5 /><circle cx=190 cy=135 fill="hsl(200, 80%, 86%)"opacity=0.81 r=2.4 /><circle cx=225 cy=155 fill="hsl(200, 80%, 91%)"opacity=0.86 r=2.8 /><circle cx=175 cy=160 fill="hsl(200, 80%, 89%)"opacity=0.84 r=2.7 /><circle cx=245 cy=185 fill="hsl(200, 80%, 94%)"opacity=0.89 r=3.3 /><circle cx=155 cy=190 fill="hsl(200, 80%, 92%)"opacity=0.87 r=3.2 /><circle cx=260 cy=210 fill="hsl(200, 80%, 95%)"opacity=0.91 r=3.4 /><circle cx=140 cy=215 fill="hsl(200, 80%, 93%)"opacity=0.88 r=3.3 /><circle cx=250 cy=230 fill="hsl(200, 80%, 91%)"opacity=0.85 r=3.2 /><circle cx=150 cy=235 fill="hsl(200, 80%, 89%)"opacity=0.83 r=3.1 /><circle cx=230 cy=245 fill="hsl(200, 80%, 87%)"opacity=0.81 r=3 /><circle cx=170 cy=250 fill="hsl(200, 80%, 85%)"opacity=0.79 r=2.9 /><circle cx=210 cy=260 fill="hsl(200, 80%, 83%)"opacity=0.77 r=2.8 /><circle cx=190 cy=265 fill="hsl(200, 80%, 81%)"opacity=0.75 r=2.7 /></g></svg>',n=864e5,a="applecation_ratings_cache",i=500,o=15e3,l="https://corsproxy.io/?url=";class r{static getJson(t,e,n,a={}){return this._request(t,e,n,{dataType:"json",...a})}static getText(t,e,n,a={}){return this._request(t,e,n,{dataType:"text",...a})}static _request(t,e,n,a){const i=new Lampa.Reguest;i.timeout(o),i.silent(t,e,n,!1,a)}}class s{static clean(t){return t?t.replace(/[\s.,:;''`!?]+/g," ").trim():""}static cleanForKP(t){return this.clean(t).replace(/^[ \/\\]+/,"").replace(/[ \/\\]+$/,"").replace(/\+( *[+\/\\])+/g,"+").replace(/([+\/\\] *)+\+/g,"+").replace(/( *[\/\\]+ *)+/g,"+")}static normalize(t){return t?this.clean(t.toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g,"-").replace(/ё/g,"е")):""}static equal(t,e){return"string"==typeof t&&"string"==typeof e&&this.normalize(t)===this.normalize(e)}static contains(t,e){return"string"==typeof t&&"string"==typeof e&&-1!==this.normalize(t).indexOf(this.normalize(e))}}class p{_getCache(){return Lampa.Storage.cache(a,i,{})}get(t){if(!t)return null;const e=this._getCache(),i=e[t];if(!i)return null;return Date.now()-i.timestamp>n?(delete e[t],Lampa.Storage.set(a,e),null):i.data}set(t,e){if(!t)return;const n=this._getCache();n[t]={timestamp:Date.now(),data:e},Lampa.Storage.set(a,n)}}class c{static fetch(t,e){const n=Lampa.Storage.get("applecation_mdblist_api_key","");if(!n)return e({});const a=`https://api.mdblist.com/tmdb/${t.name?"show":"movie"}/${t.id}?apikey=${n}`;r.getJson(a,t=>this._processResponse(t,e),()=>e({}))}static _processResponse(t,e){const n={};t&&t.ratings&&t.ratings.forEach(t=>{const e=(t.source||"").toString().toLowerCase().trim();"tmdb"!==e&&(n[e]="tomatoes"===e||"popcorn"===e?{value:t.value,score:t.score,votes:t.votes,url:t.url}:t.value)}),e(n)}}class d{static fetch(t,e){const n=Lampa.Storage.get("applecation_kp_api_key","");if(!n)return e(null);this._searchFilm(t,e,n)}static _searchFilm(t,e,n){const a=t.title||t.name,i=s.cleanForKP(a||""),{url:o,method:l}=this._buildSearchUrl(t,i);r.getJson(o,a=>this._processSearchResponse(a,t,e,i,n),()=>e(null),{headers:{"X-API-KEY":n}})}static _processSearchResponse(t,e,n,a,i){const o=t.items||t.films||[];o.length>0?this._selectBestMatch(e,o,n,i):e.imdb_id?this._searchByKeyword(a,e,n,i):n(null)}static _searchByKeyword(t,e,n,a){const i=`https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(t)}`;r.getJson(i,t=>{const i=t.items||t.films||[];this._selectBestMatch(e,i,n,a)},()=>n(null),{headers:{"X-API-KEY":a}})}static _selectBestMatch(t,e,n,a){const i=this._extractYear(t.release_date||t.first_air_date),o=t.original_title||t.original_name;let l=e.map(t=>{const e=t.start_date||t.year||"0000";return{...t,tmp_year:parseInt((e+"").slice(0,4))}});if(t.imdb_id){const e=l.filter(e=>(e.imdb_id||e.imdbId)===t.imdb_id);if(e.length>0)return this._extractRating(e[0],n,a)}if(o&&(l=this._applyFilter(l,t=>s.contains(t.orig_title||t.nameOriginal||t.nameEn||t.en_title,o)||s.contains(t.title||t.ru_title||t.nameRu,o))),t.title&&(l=this._applyFilter(l,e=>s.contains(e.title||e.ru_title||e.nameRu,t.title)||s.contains(e.en_title||e.nameEn||e.nameOriginal||e.orig_title,t.title))),l.length>1&&null!==i&&i>0){const t=l.filter(t=>t.tmp_year===i);l=t.length>0?t:this._applyFilter(l,t=>t.tmp_year&&t.tmp_year>i-2&&t.tmp_year<i+2)}1===l.length?this._extractRating(l[0],n,a):n(null)}static _applyFilter(t,e){const n=t.filter(e);return n.length>0?n:t}static _buildSearchUrl(t,e){return t.imdb_id?{url:`https://kinopoiskapiunofficial.tech/api/v2.2/films?imdbId=${encodeURIComponent(t.imdb_id)}`,method:"IMDb ID"}:{url:`https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(e)}`,method:"Keyword"}}static _extractYear(t){return t?parseInt((t+"").slice(0,4)):null}static _extractRating(t,e,n){const a=t.kp_id||t.kinopoisk_id||t.kinopoiskId||t.filmId,i=t.ratingKinopoisk||t.rating;if(i&&!isNaN(i)){const t=parseFloat(i);if(t>0&&t<=10)return e(t)}a?this._fetchRatingFromXML(a,e):e(null)}static _fetchRatingFromXML(t,e){const n=`${l}${encodeURIComponent(`https://rating.kinopoisk.ru/${t}.xml`)}`;r.getText(n,t=>{const n=this._parseXMLRating(t);e(n)},()=>e(null))}static _parseXMLRating(t){try{const e=$($.parseXML(t)).find("kp_rating");if(e.length){const t=parseFloat(e.text());return t>0&&t<=10?t:null}}catch(t){}return null}}const g=new class{constructor(){this.cacheManager=new p,this.pendingRequests=new Map}fetch(t,e){if(!t||!t.id)return e(this._getEmptyResult());const n=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]),a=this.cacheManager.get(t.id);if(a)return e(a);if(this.pendingRequests.has(t.id))return void this.pendingRequests.get(t.id).push(e);this.pendingRequests.set(t.id,[e]);const i=this._createResult(t,!1);let o=0;const l=()=>{if(o--,o<=0){i.ready=!0,this.cacheManager.set(t.id,i);const e=this.pendingRequests.get(t.id)||[];this.pendingRequests.delete(t.id),e.forEach(t=>{try{t(i)}catch(t){}})}};return Lampa.Storage.get("applecation_mdblist_api_key","")&&(o++,c.fetch(t,t=>{Object.assign(i,t),l()})),n.includes("kp")&&Lampa.Storage.get("applecation_kp_api_key","")&&(o++,d.fetch(t,t=>{i.kp=t,l()})),0===o?(i.ready=!0,e(i)):void 0}_getEmptyResult(){return this._createResult(null,!0)}_createResult(t,e){return{imdb:null,kp:null,tmdb:t&&t.vote_average?parseFloat(t.vote_average):null,tomatoes:null,popcorn:null,metacritic:null,letterboxd:null,trakt:null,myanimelist:null,ready:!!e}}};function m(t){return t&&!t.__destroyed}function h(t,e){if(!t||!Lampa.Storage.field("parser_use"))return;if(!Lampa.Parser||"function"!=typeof Lampa.Parser.get)return;const n=t.title||t.name||"Неизвестно",a=((t.first_air_date||t.release_date||"0000")+"").slice(0,4),i={df:t.original_title,df_year:t.original_title+" "+a,df_lg:t.original_title+" "+t.title,df_lg_year:t.original_title+" "+t.title+" "+a,lg:t.title,lg_year:t.title+" "+a,lg_df:t.title+" "+t.original_title,lg_df_year:t.title+" "+t.original_title+" "+a}[Lampa.Storage.field("parse_lang")]||t.title;Lampa.Parser.get({search:i,movie:t,page:1},t=>{if(!m(e))return;if(!t||!t.Results||0===t.Results.length)return;const a={resolutions:new Set,hdr:new Set,audio:new Set,hasDub:!1};t.Results.forEach(t=>{if(t.ffprobe&&Array.isArray(t.ffprobe)){const e=function(t){if(!t||!Array.isArray(t))return null;const e={resolution:null,hdr:!1,dolbyVision:!1,audio:null},n=t.find(t=>"video"===t.codec_type);if(n){if(n.width&&n.height&&(e.resolution=`${n.width}x${n.height}`,n.height>=2160||n.width>=3840?e.resolutionLabel="4K":n.height>=1440||n.width>=2560?e.resolutionLabel="2K":n.height>=1080||n.width>=1920?e.resolutionLabel="FULL HD":(n.height>=720||n.width>=1280)&&(e.resolutionLabel="HD")),n.side_data_list){const t=n.side_data_list.some(t=>"Mastering display metadata"===t.side_data_type),a=n.side_data_list.some(t=>"Content light level metadata"===t.side_data_type);n.side_data_list.some(t=>"DOVI configuration record"===t.side_data_type||"Dolby Vision RPU"===t.side_data_type)?(e.dolbyVision=!0,e.hdr=!0):(t||a)&&(e.hdr=!0)}!e.hdr&&n.color_transfer&&["smpte2084","arib-std-b67"].includes(n.color_transfer.toLowerCase())&&(e.hdr=!0),!e.dolbyVision&&n.codec_name&&(n.codec_name.toLowerCase().includes("dovi")||n.codec_name.toLowerCase().includes("dolby"))&&(e.dolbyVision=!0,e.hdr=!0)}const a=t.filter(t=>"audio"===t.codec_type);let i=0;return a.forEach(t=>{t.channels&&t.channels>i&&(i=t.channels)}),i>=8?e.audio="7.1":i>=6?e.audio="5.1":i>=4?e.audio="4.0":i>=2&&(e.audio="2.0"),e}(t.ffprobe);if(e&&(e.resolutionLabel&&a.resolutions.add(e.resolutionLabel),e.audio&&a.audio.add(e.audio)),!a.hasDub){t.ffprobe.filter(t=>"audio"===t.codec_type&&t.tags).forEach(t=>{const e=(t.tags.language||"").toLowerCase(),n=(t.tags.title||t.tags.handler_name||"").toLowerCase();"rus"!==e&&"ru"!==e&&"russian"!==e||(n.includes("dub")||n.includes("дубляж")||n.includes("дублир")||"d"===n)&&(a.hasDub=!0)})}}const e=t.Title.toLowerCase();(e.includes("dolby vision")||e.includes("dovi")||e.match(/\bdv\b/))&&a.hdr.add("Dolby Vision"),e.includes("hdr10+")&&a.hdr.add("HDR10+"),e.includes("hdr10")&&a.hdr.add("HDR10"),e.includes("hdr")&&a.hdr.add("HDR")});const i={title:n,torrents_found:t.Results.length,quality:null,dv:!1,hdr:!1,hdr_type:null,sound:null,dub:a.hasDub};if(a.resolutions.size>0){const t=["8K","4K","2K","FULL HD","HD"];for(const e of t)if(a.resolutions.has(e)){i.quality=e;break}}if(a.hdr.has("Dolby Vision")&&(i.dv=!0,i.hdr=!0),a.hdr.size>0){i.hdr=!0;const t=["HDR10+","HDR10","HDR"];for(const e of t)if(a.hdr.has(e)){i.hdr_type=e;break}}if(a.audio.size>0){const t=["7.1","5.1","4.0","2.0"];for(const e of t)if(a.audio.has(e)){i.sound=e;break}}e&&void 0===e.applecation_quality&&(e.applecation_quality=i,function(t,e){const n=t.render().find(".applecation__quality-badges");if(!n.length)return;const a=[];if(e.quality){let t="";"4K"===e.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM113 20.9092L74.1367 82.1367V97.6367H118.818V114H137.637V97.6367H149.182V81.8633H137.637V20.9092H113ZM162.841 20.9092V114H182.522V87.5459L192.204 75.7275L217.704 114H241.25L206.296 62.5908L240.841 20.9092H217.25L183.75 61.9541H182.522V20.9092H162.841ZM119.182 81.8633H93.9541V81.1367L118.454 42.3633H119.182V81.8633Z" fill="white"/></svg>':"2K"===e.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM110.608 19.6367C104.124 19.6367 98.3955 20.8638 93.4258 23.3184C88.4563 25.7729 84.5925 29.2428 81.835 33.7275C79.0775 38.2123 77.6992 43.5001 77.6992 49.5908H96.3809C96.3809 46.6212 96.9569 44.0607 98.1084 41.9092C99.2599 39.7578 100.896 38.1056 103.017 36.9541C105.138 35.8026 107.623 35.2275 110.472 35.2275C113.199 35.2276 115.639 35.7724 117.79 36.8633C119.941 37.9238 121.638 39.4542 122.881 41.4541C124.123 43.4238 124.744 45.7727 124.744 48.5C124.744 50.9545 124.244 53.2421 123.244 55.3633C122.244 57.4542 120.774 59.5906 118.835 61.7725C116.926 63.9543 114.562 66.4094 111.744 69.1367L78.6084 99.8184V114H144.972V97.9092H105.881V97.2725L119.472 83.9541C125.865 78.1361 130.82 73.1514 134.335 69C137.85 64.8182 140.29 61.0151 141.653 57.5908C143.047 54.1666 143.744 50.6968 143.744 47.1816C143.744 41.8182 142.366 37.0606 139.608 32.9092C136.851 28.7577 132.986 25.515 128.017 23.1816C123.077 20.8182 117.275 19.6368 110.608 19.6367ZM159.778 20.9092V114H179.46V87.5459L189.142 75.7275L214.642 114H238.188L203.233 62.5908L237.778 20.9092H214.188L180.688 61.9541H179.46V20.9092H159.778Z" fill="white"/></svg>':"FULL HD"===e.quality?t='<svg viewBox="331 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M622 0C633.046 3.57563e-06 642 8.95431 642 20V114C642 125.046 633.046 134 622 134H351C339.954 134 331 125.046 331 114V20C331 8.95431 339.954 0 351 0H622ZM362.341 20.9092V114H382.022V75.5459H419.887V59.3184H382.022V37.1367H423.978V20.9092H362.341ZM437.216 20.9092V114H456.897V75.5459H496.853V114H516.488V20.9092H496.853V59.3184H456.897V20.9092H437.216ZM532.716 20.9092V114H565.716C575.17 114 583.291 112.136 590.079 108.409C596.897 104.682 602.125 99.333 605.762 92.3633C609.428 85.3937 611.262 77.0601 611.262 67.3633C611.262 57.6968 609.428 49.3934 605.762 42.4541C602.125 35.5149 596.928 30.1969 590.171 26.5C583.413 22.7727 575.352 20.9092 565.988 20.9092H532.716ZM564.943 37.7725C570.761 37.7725 575.655 38.8027 579.625 40.8633C583.595 42.9239 586.579 46.1364 588.579 50.5C590.609 54.8636 591.625 60.4847 591.625 67.3633C591.625 74.3026 590.609 79.9694 588.579 84.3633C586.579 88.7269 583.579 91.955 579.579 94.0459C575.609 96.1063 570.715 97.1367 564.897 97.1367H552.397V37.7725H564.943Z" fill="white"/></svg>':"HD"===e.quality&&(t='<svg viewBox="662 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M953 0C964.046 3.57563e-06 973 8.95431 973 20V114C973 125.046 964.046 134 953 134H682C670.954 134 662 125.046 662 114V20C662 8.95431 670.954 0 682 0H953ZM731.278 20.9092V114H750.96V75.5459H790.915V114H810.551V20.9092H790.915V59.3184H750.96V20.9092H731.278ZM826.778 20.9092V114H859.778C869.233 114 877.354 112.136 884.142 108.409C890.96 104.682 896.188 99.333 899.824 92.3633C903.491 85.3937 905.324 77.0601 905.324 67.3633C905.324 57.6968 903.491 49.3934 899.824 42.4541C896.188 35.5149 890.991 30.1969 884.233 26.5C877.476 22.7727 869.414 20.9092 860.051 20.9092H826.778ZM859.006 37.7725C864.824 37.7725 869.718 38.8027 873.688 40.8633C877.657 42.9239 880.642 46.1364 882.642 50.5C884.672 54.8636 885.687 60.4847 885.688 67.3633C885.688 74.3026 884.672 79.9694 882.642 84.3633C880.642 88.7269 877.642 91.955 873.642 94.0459C869.672 96.1063 864.778 97.1367 858.96 97.1367H846.46V37.7725H859.006Z" fill="white"/></svg>'),t&&a.push(`<div class="quality-badge quality-badge--res">${t}</div>`)}e.dv&&a.push('<div class="quality-badge quality-badge--dv"><svg viewBox="0 0 1051 393" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,393) scale(0.1,-0.1)" fill="currentColor"><path d="M50 2905 l0 -1017 223 5 c146 4 244 11 287 21 361 85 638 334 753 677 39 116 50 211 44 366 -7 200 -52 340 -163 511 -130 199 -329 344 -574 419 -79 24 -102 26 -327 31 l-243 4 0 -1017z"/><path d="M2436 3904 c-443 -95 -762 -453 -806 -905 -30 -308 86 -611 320 -832 104 -99 212 -165 345 -213 133 -47 253 -64 468 -64 l177 0 0 1015 0 1015 -217 -1 c-152 0 -239 -5 -287 -15z"/><path d="M3552 2908 l3 -1013 425 0 c309 0 443 4 490 13 213 43 407 148 550 299 119 124 194 255 247 428 25 84 27 103 27 270 1 158 -2 189 -22 259 -72 251 -221 458 -424 590 -97 63 -170 97 -288 134 l-85 26 -463 4 -462 3 2 -1013z m825 701 c165 -22 283 -81 404 -199 227 -223 279 -550 133 -831 -70 -133 -176 -234 -319 -304 -132 -65 -197 -75 -490 -75 l-245 0 0 703 c0 387 3 707 7 710 11 11 425 8 510 -4z"/><path d="M7070 2905 l0 -1015 155 0 155 0 0 1015 0 1015 -155 0 -155 0 0 -1015z"/><path d="M7640 2905 l0 -1015 150 0 150 0 0 60 c0 33 2 60 5 60 2 0 33 -15 67 -34 202 -110 433 -113 648 -9 79 38 108 59 180 132 72 71 95 102 134 181 102 207 102 414 1 625 -120 251 -394 411 -670 391 -115 -8 -225 -42 -307 -93 -21 -13 -42 -23 -48 -23 -7 0 -10 125 -10 370 l0 370 -150 0 -150 0 0 -1015z m832 95 c219 -67 348 -310 280 -527 -62 -198 -268 -328 -466 -295 -96 15 -168 52 -235 119 -131 132 -164 311 -87 478 27 60 101 145 158 181 100 63 234 80 350 44z"/><path d="M6035 3286 c-253 -49 -460 -232 -542 -481 -23 -70 -26 -96 -26 -210 0 -114 3 -140 26 -210 37 -113 90 -198 177 -286 84 -85 170 -138 288 -177 67 -22 94 -26 207 -26 113 0 140 4 207 26 119 39 204 92 288 177 87 89 140 174 177 286 22 67 26 99 27 200 1 137 -14 207 -69 320 -134 277 -457 440 -760 381z m252 -284 c117 -37 206 -114 260 -229 121 -253 -38 -548 -321 -595 -258 -43 -503 183 -483 447 20 271 287 457 544 377z"/><path d="M9059 3258 c10 -24 138 -312 285 -642 l266 -598 -72 -162 c-39 -88 -78 -171 -86 -183 -37 -58 -132 -80 -208 -48 l-35 14 -18 -42 c-10 -23 -37 -84 -60 -135 -23 -52 -39 -97 -36 -102 3 -4 40 -23 83 -41 70 -31 86 -34 177 -34 93 0 105 2 167 33 76 37 149 104 180 166 29 57 799 1777 805 1799 5 16 -6 17 -161 15 l-167 -3 -185 -415 c-102 -228 -192 -431 -200 -450 l-15 -35 -201 453 -201 452 -168 0 -168 0 18 -42z"/><path d="M2650 968 c0 -2 81 -211 179 -463 l179 -460 59 -3 59 -3 178 453 c98 249 180 459 183 466 4 9 -13 12 -65 12 -47 0 -71 -4 -74 -12 -3 -7 -65 -176 -138 -375 -73 -200 -136 -363 -139 -363 -3 0 -67 168 -142 373 l-136 372 -72 3 c-39 2 -71 1 -71 0z"/><path d="M3805 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 466 0 465 -60 0 c-39 0 -62 -4 -65 -12z"/><path d="M4580 960 c-97 -16 -178 -72 -211 -145 -23 -50 -24 -143 -3 -193 32 -77 91 -117 244 -167 99 -32 146 -64 166 -112 28 -65 -11 -149 -83 -179 -78 -33 -212 -1 -261 61 l-19 24 -48 -43 -48 -42 43 -37 c121 -103 347 -112 462 -17 54 44 88 120 88 194 -1 130 -79 213 -242 256 -24 7 -71 25 -104 41 -48 22 -66 37 -79 65 -32 67 -5 138 65 174 73 37 193 18 244 -39 l20 -22 43 43 c41 40 42 43 25 61 -27 30 -102 64 -167 76 -64 12 -70 12 -135 1z"/><path d="M5320 505 l0 -465 65 0 65 0 0 465 0 465 -65 0 -65 0 0 -465z"/><path d="M6210 960 c-147 -25 -264 -114 -328 -249 -32 -65 -36 -84 -40 -175 -7 -161 33 -271 135 -367 140 -132 360 -164 541 -77 227 108 316 395 198 634 -88 177 -290 271 -506 234z m232 -132 c100 -46 165 -136 188 -261 20 -106 -18 -237 -88 -310 -101 -105 -245 -132 -377 -73 -74 33 -120 79 -157 154 -31 62 -33 74 -33 167 0 87 4 107 26 155 64 137 173 204 320 196 43 -2 85 -12 121 -28z"/><path d="M7135 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 376 c0 207 3 374 8 371 4 -2 115 -171 247 -375 l240 -371 78 0 77 0 0 465 0 465 -60 0 -60 0 -2 -372 -3 -372 -241 370 -241 369 -82 3 c-59 2 -83 -1 -86 -10z"/></g></svg></div>');e.hdr&&e.hdr_type&&a.push('<div class="quality-badge quality-badge--hdr"><svg viewBox="-1 178 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="181.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M27.2784 293V199.909H46.9602V238.318H86.9148V199.909H106.551V293H86.9148V254.545H46.9602V293H27.2784ZM155.778 293H122.778V199.909H156.051C165.415 199.909 173.475 201.773 180.233 205.5C186.991 209.197 192.188 214.515 195.824 221.455C199.491 228.394 201.324 236.697 201.324 246.364C201.324 256.061 199.491 264.394 195.824 271.364C192.188 278.333 186.96 283.682 180.142 287.409C173.354 291.136 165.233 293 155.778 293ZM142.46 276.136H154.96C160.778 276.136 165.672 275.106 169.642 273.045C173.642 270.955 176.642 267.727 178.642 263.364C180.672 258.97 181.688 253.303 181.688 246.364C181.688 239.485 180.672 233.864 178.642 229.5C176.642 225.136 173.657 221.924 169.688 219.864C165.718 217.803 160.824 216.773 155.006 216.773H142.46V276.136ZM215.903 293V199.909H252.631C259.661 199.909 265.661 201.167 270.631 203.682C275.631 206.167 279.434 209.697 282.04 214.273C284.676 218.818 285.994 224.167 285.994 230.318C285.994 236.5 284.661 241.818 281.994 246.273C279.328 250.697 275.464 254.091 270.403 256.455C265.373 258.818 259.282 260 252.131 260H227.54V244.182H248.949C252.706 244.182 255.828 243.667 258.312 242.636C260.797 241.606 262.646 240.061 263.858 238C265.1 235.939 265.722 233.379 265.722 230.318C265.722 227.227 265.1 224.621 263.858 222.5C262.646 220.379 260.782 218.773 258.267 217.682C255.782 216.561 252.646 216 248.858 216H235.585V293H215.903ZM266.176 250.636L289.312 293H267.585L244.949 250.636H266.176Z" fill="currentColor"/></svg></div>');if(e.sound){let t="";"7.1"===e.sound?t='<svg viewBox="-1 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M91.6023 483L130.193 406.636V406H85.2386V389.909H150.557V406.227L111.92 483H91.6023ZM159.545 484.182C156.545 484.182 153.97 483.121 151.818 481C149.697 478.848 148.636 476.273 148.636 473.273C148.636 470.303 149.697 467.758 151.818 465.636C153.97 463.515 156.545 462.455 159.545 462.455C162.455 462.455 165 463.515 167.182 465.636C169.364 467.758 170.455 470.303 170.455 473.273C170.455 475.273 169.939 477.106 168.909 478.773C167.909 480.409 166.591 481.727 164.955 482.727C163.318 483.697 161.515 484.182 159.545 484.182ZM215.045 389.909V483H195.364V408.591H194.818L173.5 421.955V404.5L196.545 389.909H215.045Z" fill="currentColor"/></svg>':"5.1"===e.sound?t='<svg viewBox="330 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="333.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M443.733 484.273C437.309 484.273 431.581 483.091 426.551 480.727C421.551 478.364 417.581 475.106 414.642 470.955C411.703 466.803 410.172 462.045 410.051 456.682H429.142C429.354 460.288 430.869 463.212 433.688 465.455C436.506 467.697 439.854 468.818 443.733 468.818C446.824 468.818 449.551 468.136 451.915 466.773C454.309 465.379 456.172 463.455 457.506 461C458.869 458.515 459.551 455.667 459.551 452.455C459.551 449.182 458.854 446.303 457.46 443.818C456.097 441.333 454.203 439.394 451.778 438C449.354 436.606 446.581 435.894 443.46 435.864C440.733 435.864 438.081 436.424 435.506 437.545C432.96 438.667 430.975 440.197 429.551 442.136L412.051 439L416.46 389.909H473.369V406H432.688L430.278 429.318H430.824C432.46 427.015 434.93 425.106 438.233 423.591C441.536 422.076 445.233 421.318 449.324 421.318C454.93 421.318 459.93 422.636 464.324 425.273C468.718 427.909 472.188 431.53 474.733 436.136C477.278 440.712 478.536 445.985 478.506 451.955C478.536 458.227 477.081 463.803 474.142 468.682C471.233 473.53 467.157 477.348 461.915 480.136C456.703 482.894 450.642 484.273 443.733 484.273ZM500.733 484.182C497.733 484.182 495.157 483.121 493.006 481C490.884 478.848 489.824 476.273 489.824 473.273C489.824 470.303 490.884 467.758 493.006 465.636C495.157 463.515 497.733 462.455 500.733 462.455C503.642 462.455 506.188 463.515 508.369 465.636C510.551 467.758 511.642 470.303 511.642 473.273C511.642 475.273 511.127 477.106 510.097 478.773C509.097 480.409 507.778 481.727 506.142 482.727C504.506 483.697 502.703 484.182 500.733 484.182ZM556.233 389.909V483H536.551V408.591H536.006L514.688 421.955V404.5L537.733 389.909H556.233Z" fill="currentColor"/></svg>':"2.0"===e.sound&&(t='<svg viewBox="661 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="664.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M722.983 483V468.818L756.119 438.136C758.938 435.409 761.301 432.955 763.21 430.773C765.15 428.591 766.619 426.455 767.619 424.364C768.619 422.242 769.119 419.955 769.119 417.5C769.119 414.773 768.498 412.424 767.256 410.455C766.013 408.455 764.316 406.924 762.165 405.864C760.013 404.773 757.574 404.227 754.847 404.227C751.998 404.227 749.513 404.803 747.392 405.955C745.271 407.106 743.634 408.758 742.483 410.909C741.331 413.061 740.756 415.621 740.756 418.591H722.074C722.074 412.5 723.453 407.212 726.21 402.727C728.968 398.242 732.831 394.773 737.801 392.318C742.771 389.864 748.498 388.636 754.983 388.636C761.65 388.636 767.453 389.818 772.392 392.182C777.362 394.515 781.225 397.758 783.983 401.909C786.741 406.061 788.119 410.818 788.119 416.182C788.119 419.697 787.422 423.167 786.028 426.591C784.665 430.015 782.225 433.818 778.71 438C775.195 442.152 770.241 447.136 763.847 452.955L750.256 466.273V466.909H789.347V483H722.983ZM815.108 484.182C812.108 484.182 809.532 483.121 807.381 481C805.259 478.848 804.199 476.273 804.199 473.273C804.199 470.303 805.259 467.758 807.381 465.636C809.532 463.515 812.108 462.455 815.108 462.455C818.017 462.455 820.563 463.515 822.744 465.636C824.926 467.758 826.017 470.303 826.017 473.273C826.017 475.273 825.502 477.106 824.472 478.773C823.472 480.409 822.153 481.727 820.517 482.727C818.881 483.697 817.078 484.182 815.108 484.182ZM874.483 485.045C866.665 485.015 859.938 483.091 854.301 479.273C848.695 475.455 844.377 469.924 841.347 462.682C838.347 455.439 836.862 446.727 836.892 436.545C836.892 426.394 838.392 417.742 841.392 410.591C844.422 403.439 848.741 398 854.347 394.273C859.983 390.515 866.695 388.636 874.483 388.636C882.271 388.636 888.968 390.515 894.574 394.273C900.21 398.03 904.544 403.485 907.574 410.636C910.604 417.758 912.104 426.394 912.074 436.545C912.074 446.758 910.559 455.485 907.528 462.727C904.528 469.97 900.225 475.5 894.619 479.318C889.013 483.136 882.301 485.045 874.483 485.045ZM874.483 468.727C879.816 468.727 884.074 466.045 887.256 460.682C890.438 455.318 892.013 447.273 891.983 436.545C891.983 429.485 891.256 423.606 889.801 418.909C888.377 414.212 886.347 410.682 883.71 408.318C881.104 405.955 878.028 404.773 874.483 404.773C869.18 404.773 864.938 407.424 861.756 412.727C858.574 418.03 856.968 425.97 856.938 436.545C856.938 443.697 857.65 449.667 859.074 454.455C860.528 459.212 862.574 462.788 865.21 465.182C867.847 467.545 870.938 468.727 874.483 468.727Z" fill="currentColor"/></svg>'),t&&a.push(`<div class="quality-badge quality-badge--sound">${t}</div>`)}e.dub&&a.push('<div class="quality-badge quality-badge--dub"><svg viewBox="-1 558 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="561.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M60.5284 673H27.5284V579.909H60.8011C70.1648 579.909 78.2254 581.773 84.983 585.5C91.7405 589.197 96.9375 594.515 100.574 601.455C104.241 608.394 106.074 616.697 106.074 626.364C106.074 636.061 104.241 644.394 100.574 651.364C96.9375 658.333 91.7102 663.682 84.892 667.409C78.1042 671.136 69.983 673 60.5284 673ZM47.2102 656.136H59.7102C65.5284 656.136 70.4223 655.106 74.392 653.045C78.392 650.955 81.392 647.727 83.392 643.364C85.4223 638.97 86.4375 633.303 86.4375 626.364C86.4375 619.485 85.4223 613.864 83.392 609.5C81.392 605.136 78.4072 601.924 74.4375 599.864C70.4678 597.803 65.5739 596.773 59.7557 596.773H47.2102V656.136ZM178.153 579.909H197.835V640.364C197.835 647.152 196.214 653.091 192.972 658.182C189.759 663.273 185.259 667.242 179.472 670.091C173.684 672.909 166.941 674.318 159.244 674.318C151.517 674.318 144.759 672.909 138.972 670.091C133.184 667.242 128.684 663.273 125.472 658.182C122.259 653.091 120.653 647.152 120.653 640.364V579.909H140.335V638.682C140.335 642.227 141.108 645.379 142.653 648.136C144.229 650.894 146.441 653.061 149.29 654.636C152.138 656.212 155.456 657 159.244 657C163.063 657 166.381 656.212 169.199 654.636C172.047 653.061 174.244 650.894 175.79 648.136C177.366 645.379 178.153 642.227 178.153 638.682V579.909ZM214.028 673V579.909H251.301C258.15 579.909 263.862 580.924 268.438 582.955C273.013 584.985 276.453 587.803 278.756 591.409C281.059 594.985 282.21 599.106 282.21 603.773C282.21 607.409 281.483 610.606 280.028 613.364C278.574 616.091 276.574 618.333 274.028 620.091C271.513 621.818 268.634 623.045 265.392 623.773V624.682C268.938 624.833 272.256 625.833 275.347 627.682C278.468 629.53 280.998 632.121 282.938 635.455C284.877 638.758 285.847 642.697 285.847 647.273C285.847 652.212 284.619 656.621 282.165 660.5C279.741 664.348 276.15 667.394 271.392 669.636C266.634 671.879 260.771 673 253.801 673H214.028ZM233.71 656.909H249.756C255.241 656.909 259.241 655.864 261.756 653.773C264.271 651.652 265.528 648.833 265.528 645.318C265.528 642.742 264.907 640.47 263.665 638.5C262.422 636.53 260.65 634.985 258.347 633.864C256.074 632.742 253.362 632.182 250.21 632.182H233.71V656.909ZM233.71 618.864H248.301C250.998 618.864 253.392 618.394 255.483 617.455C257.604 616.485 259.271 615.121 260.483 613.364C261.725 611.606 262.347 609.5 262.347 607.045C262.347 603.682 261.15 600.97 258.756 598.909C256.392 596.848 253.028 595.818 248.665 595.818H233.71V618.864Z" fill="currentColor"/></svg></div>');a.length>0&&(n.html(a.join("")),n.addClass("show"))}(e,i))},t=>{})}function _(){console.log("Applecation","v"+t),Lampa.Platform.screen("tv")?(function(){const t=Lampa.Api.sources.tmdb;if(!t)return;if(window.Lampa&&Lampa.TMDB&&Lampa.TMDB.api){const t=Lampa.TMDB.api;Lampa.TMDB.api=function(e){let n=e;if("string"==typeof n&&-1!==n.indexOf("append_to_response=")&&-1===n.indexOf("images")&&(n=n.replace("append_to_response=","append_to_response=images,"),-1===n.indexOf("include_image_language="))){const t=Lampa.Storage.field("tmdb_lang")||Lampa.Storage.get("language")||"ru";n+=(-1===n.indexOf("?")?"?":"&")+"include_image_language=en,null,"+t}return t.call(Lampa.TMDB,n)}}const e=Lampa.Template.js;Lampa.Template.js=function(t,n){if("full_episode"===t&&n&&(n.runtime>0?n.time=Lampa.Utils.secondsToTimeHuman(60*n.runtime).replace(/\./g,""):n.time="",n.air_date)){const t=new Date(n.air_date.replace(/-/g,"/")),e=t.getMonth()+1,a=Lampa.Lang.translate("month_"+e+"_e"),i=f("year_short");n.date=t.getDate()+" "+a+" "+t.getFullYear()+i}return e.call(Lampa.Template,t,n)};const n=t.img;t.img=function(e,a){const i=Lampa.Storage.field("poster_size");if("w1280"===a){a={w200:"w780",w300:"w1280",w500:"original"}[i]||"w1280"}if("w300"===a){a={w200:"w300",w300:"w780",w500:"w780"}[i]||"w300"}return"w276_and_h350_face"===a&&"w500"===i&&(a="w600_and_h900_face"),n.call(t,e,a)},Lampa.Api.img=t.img}(),C(),y(),function(){const t="<style>\n\n/* Основной контейнер */\n.applecation {\n    transition: all .3s;\n}\n\n.applecation .full-start-new__body {\n    height: 80vh;\n}\n\n.applecation .full-start-new__right {\n    display: flex;\n    align-items: flex-end;\n}\n\n.applecation .full-start-new__title {\n    font-size: 2.5em;\n    font-weight: 700;\n    line-height: 1.2;\n    margin-bottom: 0.5em;\n    text-shadow: 0 0 .1em rgba(0, 0, 0, 0.3);\n}\n\n/* Логотип */\n.applecation__logo {\n    margin-bottom: 0.5em;\n    opacity: 0;\n    transform: translateY(20px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n}\n\n.applecation__logo.loaded {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.applecation__logo img {\n    display: block;\n    max-width: 35vw;\n    max-height: 180px;\n    width: auto;\n    height: auto;\n    object-fit: contain;\n    object-position: left center;\n}\n\n/* Контейнер для масштабируемого контента */\n.applecation__content-wrapper {\n    font-size: 100%;\n}\n\n/* Мета информация (Тип/Жанр/поджанр) */\n.applecation__meta {\n    display: flex;\n    align-items: center;\n    color: #fff;\n    font-size: 1.1em;\n    margin-bottom: 0.5em;\n    line-height: 1;\n    opacity: 0;\n    transform: translateY(15px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n    transition-delay: 0.05s;\n}\n\n.applecation__meta.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.applecation__meta-left {\n    display: flex;\n    align-items: center;\n    line-height: 1;\n}\n\n.applecation__network {\n    display: inline-flex;\n    align-items: center;\n    line-height: 1;\n    margin-right: 1em;\n}\n\n.applecation__network img {\n    display: block;\n    max-height: 0.8em;\n    width: auto;\n    object-fit: contain;\n    filter: brightness(0) invert(1);\n}\n\n.applecation__meta-text {\n    line-height: 1;\n}\n\n.applecation__meta .full-start__pg {\n    margin: 0 0 0 0.6em;\n    padding: 0.2em 0.5em;\n    font-size: 0.85em;\n    font-weight: 600;\n    border: 1.5px solid rgba(255, 255, 255, 0.4);\n    border-radius: 0.3em;\n    background: rgba(255, 255, 255, 0.1);\n    color: rgba(255, 255, 255, 0.9);\n    line-height: 1;\n    vertical-align: middle;\n}\n\n/* Рейтинги */\n.applecation__ratings {\n    display: flex;\n    align-items: center;\n    gap: 0.8em;\n    margin-bottom: 0.5em;\n    opacity: 0;\n    transform: translateY(15px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n    transition-delay: 0.08s;\n}\n\n.applecation__ratings.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n/* Встроенные рейтинги: плавное появление контента внутри уже показанного блока */\n.applecation__ratings-builtin {\n    display: flex;\n    align-items: center;\n    gap: 0.8em;\n}\n\n@keyframes applecation-ratings-in {\n    from {\n        opacity: 0;\n        transform: translateY(15px);\n    }\n    to {\n        opacity: 1;\n        transform: translateY(0);\n    }\n}\n\n/* Каждый рейтинг анимируется при вставке. До раскрытия карточки анимация на паузе. */\n.applecation__ratings-builtin > div {\n    opacity: 0;\n    transform: translateY(15px);\n    animation: applecation-ratings-in 0.4s ease-out both;\n    animation-play-state: paused;\n}\n\n.applecation__ratings.show .applecation__ratings-builtin > div {\n    animation-play-state: running;\n}\n\n.applecation__ratings .rate--imdb,\n.applecation__ratings .rate--kp,\n.applecation__ratings .rate--tmdb,\n.applecation__ratings .rate--tomatoes,\n.applecation__ratings .rate--popcorn,\n.applecation__ratings .rate--metacritic,\n.applecation__ratings .rate--letterboxd,\n.applecation__ratings .rate--trakt,\n.applecation__ratings .rate--myanimelist,\n.applecation__ratings .builtin-rate--imdb,\n.applecation__ratings .builtin-rate--kp,\n.applecation__ratings .builtin-rate--tmdb,\n.applecation__ratings .builtin-rate--tomatoes,\n.applecation__ratings .builtin-rate--popcorn,\n.applecation__ratings .builtin-rate--metacritic,\n.applecation__ratings .builtin-rate--letterboxd,\n.applecation__ratings .builtin-rate--trakt,\n.applecation__ratings .builtin-rate--myanimelist {\n    display: flex;\n    align-items: center;\n    gap: 0.35em;\n}\n\n.applecation__ratings svg {\n    width: 1.8em;\n    height: auto;\n    flex-shrink: 0;\n    color: rgba(255, 255, 255, 0.85);\n}\n\n.applecation__ratings .rate--kp svg,\n.applecation__ratings .builtin-rate--kp svg {\n    width: 1.5em;\n}\n\n.applecation__ratings .rate--tmdb svg {\n    width: 1.6em;\n}\n\n.applecation__ratings .builtin-rate--tmdb svg {\n    width: 1.35em;\n}\n\n.applecation__ratings .rate--tomatoes svg,\n.applecation__ratings .builtin-rate--tomatoes svg {\n    width: 1.3em;\n}\n\n.applecation__ratings .rate--popcorn svg,\n.applecation__ratings .builtin-rate--popcorn svg {\n    width: 1em;\n}\n\n.applecation__ratings .rate--metacritic svg,\n.applecation__ratings .builtin-rate--metacritic svg {\n    width: 1.3em;\n}\n\n.applecation__ratings .rate--letterboxd svg,\n.applecation__ratings .builtin-rate--letterboxd svg {\n    width: 1.6em;\n}\n\n.applecation__ratings .rate--trakt svg,\n.applecation__ratings .builtin-rate--trakt svg {\n    width: 1.3em;\n}\n\n.applecation__ratings .rate--myanimelist svg,\n.applecation__ratings .builtin-rate--myanimelist svg {\n    width: 1.8em;\n}\n\n.applecation__ratings > div > div {\n    font-size: 0.95em;\n    font-weight: 600;\n    line-height: 1;\n    color: #fff;\n}\n\n/* Управление видимостью рейтингов через настройки */\nbody.applecation--hide-ratings .applecation__ratings {\n    display: none !important;\n}\n\n/* Скрытие рейтингов в зависимости от источника */\n/* Когда выбраны встроенные рейтинги - скрываем контейнеры для внешних плагинов */\nbody.applecation--ratings-source-builtin .applecation__ratings .rate--imdb,\nbody.applecation--ratings-source-builtin .applecation__ratings .rate--kp,\nbody.applecation--ratings-source-builtin .applecation__ratings .rate--tmdb {\n    display: none !important;\n}\n\n/* Когда выбраны внешние рейтинги - скрываем встроенные */\nbody.applecation--ratings-source-external .applecation__ratings-builtin {\n    display: none !important;\n}\n\n/* Расположение рейтингов - в правом нижнем углу */\nbody.applecation--ratings-corner .applecation__right {\n    gap: 1em;\n}\n\nbody.applecation--ratings-corner .applecation__ratings {\n    margin-bottom: 0;\n}\n\n/* Обертка для описания */\n.applecation__description-wrapper {\n    background-color: transparent;\n    padding: 0;\n    border-radius: 1em;\n    width: fit-content;\n    opacity: 0;\n    transform: translateY(15px);\n    transition:\n        padding 0.25s ease,\n        transform 0.25s ease,\n        opacity 0.4s ease-out;\n    transition-delay: 0.1s;\n}\n\n.applecation__description-wrapper.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.applecation__description-wrapper.focus {\n  background: linear-gradient(\n    135deg,\n    rgba(255, 255, 255, 0.28),\n    rgba(255, 255, 255, 0.18)\n  );\n  padding: .15em .4em 0 .7em;\n  border-radius: 1em;\n  width: fit-content;\n\n//   box-shadow:\n//     inset 0 1px 0 rgba(255, 255, 255, 0.35),\n//     0 8px 24px rgba(0, 0, 0, 0.25);\n  box-shadow:\n    inset 0 1px 0 rgba(255, 255, 255, 0.35);\n\n  transform: scale(1.07) translateY(0);\n  \n  transition-delay: 0s;\n}\n\n/* Описание */\n.applecation__description {\n    color: rgba(255, 255, 255, 0.6);\n    font-size: 0.95em;\n    line-height: 1.5;\n    margin-bottom: 0.5em;\n    max-width: 35vw;\n    display: -webkit-box;\n    -webkit-line-clamp: 4;\n    -webkit-box-orient: vertical;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n\n.focus .applecation__description {\n  color: rgba(255, 255, 255, 0.92);\n}\n\n/* Дополнительная информация (Год/длительность) */\n.applecation__info {\n    color: rgba(255, 255, 255, 0.75);\n    font-size: 1em;\n    line-height: 1.4;\n    margin-bottom: 0.5em;\n    opacity: 0;\n    transform: translateY(15px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n    transition-delay: 0.15s;\n}\n\n.applecation__info.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n/* Левая и правая части */\n.applecation__left {\n    flex-grow: 1;\n}\n\n.applecation__right {\n    display: flex;\n    align-items: center;\n    flex-shrink: 0;\n    position: relative;\n}\n\n/* Выравнивание по baseline если рейтинги в углу */\nbody.applecation--ratings-corner .applecation__right {\n    align-items: last baseline;\n}\n\n/* Реакции */\n.applecation .full-start-new__reactions {\n    margin: 0;\n    display: flex;\n    flex-direction: column-reverse;\n    align-items: flex-end;\n}\n\n.applecation .full-start-new__reactions > div {\n    align-self: flex-end;\n}\n\n.applecation .full-start-new__reactions:not(.focus) {\n    margin: 0;\n}\n\n.applecation .full-start-new__reactions:not(.focus) > div:not(:first-child) {\n    display: none;\n}\n\n/* Стили первой реакции (всегда видимой) */\n.applecation .full-start-new__reactions > div:first-child .reaction {\n    display: flex !important;\n    align-items: center !important;\n    background-color: rgba(0, 0, 0, 0) !important;\n    gap: 0 !important;\n}\n\n.applecation .full-start-new__reactions > div:first-child .reaction__icon {\n    background-color: rgba(0, 0, 0, 0.3) !important;\n    -webkit-border-radius: 5em;\n    -moz-border-radius: 5em;\n    border-radius: 5em;\n    padding: 0.5em;\n    width: 2.6em !important;\n    height: 2.6em !important;\n}\n\n.applecation .full-start-new__reactions > div:first-child .reaction__count {\n    font-size: 1.2em !important;\n    font-weight: 500 !important;\n}\n\n/* При фокусе реакции раскрываются вверх */\n.applecation .full-start-new__reactions.focus {\n    gap: 0.5em;\n}\n\n.applecation .full-start-new__reactions.focus > div {\n    display: block;\n}\n\n/* Скрываем стандартный rate-line (используется только для статуса) */\n.applecation .full-start-new__rate-line {\n    margin: 0;\n    height: 0;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n}\n\n/* Фон - переопределяем стандартную анимацию на fade */\n.full-start__background {\n    height: calc(100% + 6em);\n    left: 0 !important;\n    opacity: 0 !important;\n    transition: opacity 0.6s ease-out, filter 0.3s ease-out !important;\n    animation: none !important;\n    transform: none !important;\n    will-change: opacity, filter;\n}\n\n.full-start__background.loaded:not(.dim) {\n    opacity: 1 !important;\n}\n\n.full-start__background.dim {\n  filter: blur(30px);\n}\n\n/* Удерживаем opacity при загрузке нового фона */\n.full-start__background.loaded.applecation-animated {\n    opacity: 1 !important;\n}\n\nbody:not(.menu--open) .full-start__background {\n    mask-image: none;\n}\n\n/* Отключаем стандартную анимацию Lampa для фона */\nbody.advanced--animation:not(.no--animation) .full-start__background.loaded {\n    animation: none !important;\n}\n\n/* Скрываем статус для предотвращения выхода реакций за экран */\n.applecation .full-start__status {\n    display: none;\n}\n\n/* Оверлей для затемнения левого края */\n.applecation__overlay {\n    width: 90vw;\n    background: linear-gradient(to right, rgba(0, 0, 0, 0.792) 0%, rgba(0, 0, 0, 0.504) 25%, rgba(0, 0, 0, 0.264) 45%, rgba(0, 0, 0, 0.12) 55%, rgba(0, 0, 0, 0.043) 60%, rgba(0, 0, 0, 0) 65%);\n}\n\n/* Бейджи качества */\n.applecation__quality-badges {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.4em;\n    margin-left: 0.6em;\n    opacity: 0;\n    transform: translateY(10px);\n    transition: opacity 0.3s ease-out, transform 0.3s ease-out;\n}\n\n.applecation__quality-badges.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.quality-badge {\n    display: inline-flex;\n    height: 0.8em;\n}\n\n.quality-badge svg {\n    height: 100%;\n    width: auto;\n    display: block;\n}\n\n.quality-badge--res svg {\n    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));\n}\n\n.quality-badge--dv svg,\n.quality-badge--hdr svg,\n.quality-badge--sound svg,\n.quality-badge--dub svg {\n    color: rgba(255, 255, 255, 0.85);\n    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));\n}\n\n/* Эпизоды Apple TV */\n.applecation .full-episode--small {\n    width: 20em !important;\n    height: auto !important;\n    margin-right: 1.5em !important;\n    background: none !important;\n    display: flex !important;\n    flex-direction: column !important;\n    transition: transform 0.3s !important;\n}\n\n.applecation .full-episode--small.focus {\n    transform: scale(1.02);\n}\n\n.applecation .full-episode--next .full-episode__img::after {\n  border: none !important;\n}\n\n.applecation .full-episode__img {\n    padding-bottom: 56.25% !important;\n    border-radius: 0.8em !important;\n    margin-bottom: 1em !important;\n    background-color: rgba(255,255,255,0.05) !important;\n    position: relative !important;\n    overflow: visible !important;\n}\n\n.applecation .full-episode__img img {\n    border-radius: 0.8em !important;\n    object-fit: cover !important;\n}\n\n.applecation .full-episode__time {\n    position: absolute;\n    bottom: 0.8em;\n    left: 0.8em;\n    background: rgba(0,0,0,0.6);\n    padding: 0.2em 0.5em;\n    border-radius: 0.4em;\n    font-size: 0.75em;\n    font-weight: 600;\n    color: #fff;\n    backdrop-filter: blur(5px);\n    z-index: 2;\n}\n\n.applecation .full-episode__time:empty {\n    display: none;\n}\n\n.applecation .full-episode__body {\n    position: static !important;\n    display: flex !important;\n    flex-direction: column !important;\n    background: none !important;\n    padding: 0 0.5em !important;\n    opacity: 0.6;\n    transition: opacity 0.3s;\n}\n\n.applecation .full-episode.focus .full-episode__body {\n    opacity: 1;\n}\n\n.applecation .full-episode__num {\n    font-size: 0.75em !important;\n    font-weight: 600 !important;\n    text-transform: uppercase !important;\n    color: rgba(255,255,255,0.4) !important;\n    margin-bottom: 0.2em !important;\n    letter-spacing: 0.05em !important;\n}\n\n.applecation .full-episode__name {\n    font-size: 1.1em !important;\n    font-weight: 600 !important;\n    color: #fff !important;\n    margin-bottom: 0.4em !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    line-height: 1.4 !important;\n    padding-bottom: 0.1em !important;\n}\n\n.applecation .full-episode__overview {\n    font-size: 0.85em !important;\n    line-height: 1.4 !important;\n    color: rgba(255,255,255,0.5) !important;\n    display: -webkit-box !important;\n    -webkit-line-clamp: 2 !important;\n    -webkit-box-orient: vertical !important;\n    overflow: hidden !important;\n    margin-bottom: 0.6em !important;\n    height: 2.8em !important;\n}\n\n.applecation .full-episode__date {\n    font-size: 0.8em !important;\n    color: rgba(255,255,255,0.3) !important;\n}\n\n\n/* =========================================================\n   БАЗА: ничего не блюрим/не затемняем без фокуса\n   ========================================================= */\n\n.applecation .full-episode{\n  position: relative;\n  z-index: 1;\n  opacity: 1;\n  filter: none;\n\n  transition: transform .6s cubic-bezier(.16,1,.3,1);\n}\n\n/* без фокуса — вообще без эффектов */\n.applecation .full-episode:not(.focus){\n  transform: none;\n}\n\n/* фокус — мягкий “apple” подъём */\n.applecation .full-episode.focus{\n  z-index: 10;\n  transform: scale(1.03) translateY(-6px);\n}\n\n\n/* =========================================================\n   КАРТИНКА\n   ========================================================= */\n\n.applecation .full-episode__img{\n  position: relative;\n  overflow: hidden;\n  border-radius: inherit;\n\n  transition:\n    box-shadow .6s cubic-bezier(.16,1,.3,1),\n    backdrop-filter .6s cubic-bezier(.16,1,.3,1),\n    transform .6s cubic-bezier(.16,1,.3,1);\n}\n\n\n/* =========================================================\n   ЖИДКОЕ СТЕКЛО — ТОЛЬКО НА ФОКУСЕ\n   ========================================================= */\n\n.applecation .full-episode.focus .full-episode__img{\n  box-shadow:\n    0 0 0 1px rgba(255,255,255,.18),\n    0 26px 65px rgba(0,0,0,.4) !important;\n\n  -webkit-backdrop-filter: blur(14px) saturate(1.25) contrast(1.05);\n  backdrop-filter: blur(14px) saturate(1.25) contrast(1.05);\n\n  background: rgba(255,255,255,.06);\n}\n\n/* толщина стекла */\n.applecation .full-episode.focus .full-episode__img::before{\n  content: '';\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  pointer-events: none;\n  z-index: 2;\n\n  box-shadow:\n    inset 0 0 0 1px rgba(255,255,255,.22),\n    inset 0 0 18px rgba(255,255,255,.12),\n    inset 0 -14px 22px rgba(0,0,0,.18);\n\n  filter: blur(.35px);\n  opacity: 1;\n  transition: opacity .45s ease;\n}\n\n/* блик */\n.applecation .full-episode.focus .full-episode__img::after{\n  content: '';\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  pointer-events: none;\n  z-index: 3;\n\n  background:\n    radial-gradient(120% 85% at 18% 10%,\n      rgba(255,255,255,.38),\n      rgba(255,255,255,.10) 38%,\n      transparent 62%),\n    linear-gradient(135deg,\n      rgba(255,255,255,.20),\n      rgba(255,255,255,0) 52%,\n      rgba(255,255,255,.06));\n\n  mix-blend-mode: screen;\n  opacity: .95;\n\n  transition:\n    opacity .45s ease,\n    transform .65s cubic-bezier(.16,1,.3,1);\n}\n\n/* когда фокуса нет — просто не показываем слои стекла */\n.applecation .full-episode:not(.focus) .full-episode__img::before,\n.applecation .full-episode:not(.focus) .full-episode__img::after{\n  opacity: 0;\n}\n\n/* убрать старый оверлей */\n.applecation .full-episode.focus::after{\n  display: none !important;\n}\n\n\n\n.applecation .full-episode__viewed {\n    top: 0.8em !important;\n    right: 0.8em !important;\n    background: rgba(0,0,0,0.5) !important;\n    border-radius: 50% !important;\n    padding: 0.3em !important;\n    backdrop-filter: blur(10px) !important;\n}\n\n/* Статус следующей серии */\n.applecation .full-episode--next .full-episode__img:after {\n    border-radius: 0.8em !important;\n}\n\n/* Оверлей для полного описания */\n.applecation-description-overlay {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    z-index: 9999;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    opacity: 0;\n    visibility: hidden;\n    pointer-events: none;\n    transition: opacity 0.3s ease, visibility 0.3s ease;\n}\n\n.applecation-description-overlay.show {\n    opacity: 1;\n    visibility: visible;\n    pointer-events: all;\n}\n\n.applecation-description-overlay__bg {\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    -webkit-backdrop-filter: blur(100px);\n    backdrop-filter: blur(100px);\n}\n\n.applecation-description-overlay__content {\n    position: relative;\n    z-index: 1;\n    max-width: 60vw;\n    max-height: 90vh;\n    overflow-y: auto;\n}\n\n.applecation-description-overlay__logo {\n    text-align: center;\n    margin-bottom: 1.5em;\n    display: none;\n}\n\n.applecation-description-overlay__logo img {\n    max-width: 40vw;\n    max-height: 150px;\n    width: auto;\n    height: auto;\n    object-fit: contain;\n}\n\n.applecation-description-overlay__title {\n    font-size: 2em;\n    font-weight: 600;\n    margin-bottom: 1em;\n    color: #fff;\n    text-align: center;\n}\n\n.applecation-description-overlay__text {\n    font-size: 1.2em;\n    line-height: 1.6;\n    color: rgba(255, 255, 255, 0.9);\n    white-space: pre-wrap;\n    margin-bottom: 1.5em;\n}\n\n.applecation-description-overlay__details {\n    display: flex;\n    flex-wrap: wrap;\n    margin: -1em;\n}\n\n.applecation-description-overlay__details > * {\n    margin: 1em;\n}\n\n.applecation-description-overlay__info-name {\n    font-size: 1.1em;\n    margin-bottom: 0.5em;\n}\n\n.applecation-description-overlay__info-body {\n    font-size: 1.2em;\n    opacity: 0.6;\n}\n\n/* Скроллбар для описания */\n.applecation-description-overlay__content::-webkit-scrollbar {\n    width: 0.5em;\n}\n\n.applecation-description-overlay__content::-webkit-scrollbar-track {\n    background: rgba(255, 255, 255, 0.1);\n    border-radius: 1em;\n}\n\n.applecation-description-overlay__content::-webkit-scrollbar-thumb {\n    background: rgba(255, 255, 255, 0.3);\n    border-radius: 1em;\n}\n\n.applecation-description-overlay__content::-webkit-scrollbar-thumb:hover {\n    background: rgba(255, 255, 255, 0.5);\n}\n\n/* =========================================================\n   ПЕРСОНЫ (АКТЕРЫ И СЪЕМОЧНАЯ ГРУППА) - APPLE TV СТИЛЬ\n   ========================================================= */\n\n.applecation .full-person {\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    width: 10.7em !important;\n    background: none !important;\n    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;\n    will-change: transform;\n    -webkit-animation: none !important;\n    animation: none !important;\n    margin-left: 0;\n}\n\n.applecation .full-person.focus {\n    transform: scale(1.08) translateY(-6px) !important;\n    z-index: 10;\n}\n\n/* Фото персоны - круглое */\n.applecation .full-person__photo {\n    position: relative !important;\n    width: 9.4em !important;\n    height: 9.4em !important;\n    margin: 0 0 .3em 0 !important;\n    border-radius: 50% !important;\n    overflow: hidden !important;\n    background: rgba(255, 255, 255, 0.05) !important;\n    flex-shrink: 0 !important;\n    transition: \n        box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        backdrop-filter 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        -webkit-backdrop-filter 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        background 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;\n    will-change: transform, box-shadow, backdrop-filter;\n    -webkit-animation: none !important;\n    animation: none !important;\n}\n\n.applecation .full-person__photo img {\n    width: 100% !important;\n    height: 100% !important;\n    object-fit: cover !important;\n    border-radius: 50% !important;\n}\n\n/* Смещаем лицо только при высоком качестве (w500), так как там другой кроп у TMDB */\n.applecation.applecation--poster-high .full-person__photo img {\n    object-position: center calc(50% + 20px) !important;\n}\n\n/* Дефолтные заглушки оставляем по центру, чтобы не ломать симметрию иконок */\n.applecation .full-person__photo img[src*=\"actor.svg\"],\n.applecation .full-person__photo img[src*=\"img_broken.svg\"] {\n    object-position: center !important;\n}\n\n/* ЖИДКОЕ СТЕКЛО — БАЗОВЫЕ СЛОИ (скрыты) */\n.applecation .full-person__photo::before,\n.applecation .full-person__photo::after {\n    content: '';\n    position: absolute;\n    inset: 0;\n    border-radius: 50%;\n    pointer-events: none;\n    opacity: 0;\n    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;\n    will-change: opacity;\n}\n\n/* толщина стекла */\n.applecation .full-person__photo::before {\n    z-index: 2;\n    box-shadow:\n        inset 2px 2px 1px rgba(255, 255, 255, 0.30),\n        inset -2px -2px 2px rgba(255, 255, 255, 0.30);\n}\n\n/* ореол и блик */\n.applecation .full-person__photo::after {\n    z-index: 3;\n    background:\n        radial-gradient(circle at center,\n            transparent 58%,\n            rgba(255, 255, 255, 0.22) 75%,\n            rgba(255, 255, 255, 0.38) 90%),\n        radial-gradient(120% 85% at 18% 10%,\n            rgba(255, 255, 255, 0.35),\n            rgba(255, 255, 255, 0.10) 38%,\n            transparent 62%);\n    mix-blend-mode: screen;\n}\n\n/* ЭФФЕКТЫ ПРИ ФОКУСЕ */\n\n.applecation .full-person.focus .full-person__photo::before,\n.applecation .full-person.focus .full-person__photo::after {\n    opacity: 1;\n}\n\n.applecation .full-person.focus .full-person__photo::after {\n    opacity: 0.9;\n}\n\n/* Текстовая информация */\n.applecation .full-person__body {\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    text-align: center !important;\n    width: 100% !important;\n    padding: 0 0.3em !important;\n}\n\n/* Имя персоны */\n.applecation .full-person__name {\n    font-size: 1em !important;\n    font-weight: 600 !important;\n    color: #fff !important;\n    line-height: 1.3 !important;\n    width: 100% !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    position: relative !important;\n}\n\n/* Бегущая строка для длинных имен */\n.applecation .full-person__name.marquee-active {\n    text-overflow: clip !important;\n    mask-image: linear-gradient(to right, #000 92%, transparent 100%);\n    -webkit-mask-image: linear-gradient(to right, #000 92%, transparent 100%);\n}\n\n/* При фокусе (когда строка едет) прозрачность с обеих сторон */\n.applecation .full-person.focus .full-person__name.marquee-active {\n    mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);\n    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);\n}\n\n.applecation .marquee__inner {\n    display: inline-block;\n    white-space: nowrap;\n}\n\n.applecation .marquee__inner span {\n    padding-right: 2.5em;\n    display: inline-block;\n}\n\n/* Запуск анимации при фокусе */\n.applecation .full-person.focus .full-person__name.marquee-active .marquee__inner {\n    animation: marquee var(--marquee-duration, 5s) linear infinite;\n}\n\n@keyframes marquee {\n    0% { transform: translateX(0); }\n    100% { transform: translateX(-50%); }\n}\n\n/* Роль персоны */\n.applecation .full-person__role {\n    font-size: 0.8em !important;\n    font-weight: 400 !important;\n    color: rgba(255, 255, 255, 0.5) !important;\n    line-height: 1.3 !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    width: 100% !important;\n    margin-top: 0;\n}\n\n.applecation .full-person.focus .full-person__role {\n    color: rgb(255, 255, 255) !important;\n}\n\n/* ОТКЛЮЧЕНИЕ ЖИДКОГО СТЕКЛА */\nbody.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img,\nbody.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo {\n    backdrop-filter: none !important;\n    -webkit-backdrop-filter: none !important;\n    background: rgba(255,255,255,0.05) !important;\n    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;\n}\n\nbody.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img::before,\nbody.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img::after,\nbody.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo::before,\nbody.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo::after {\n    display: none !important;\n}\n\n/* Секция «Подробно» оставлена только ради штатного warning-box--full-adult; остальное скрыто */\n.applecation .items-line:has(.warning-box--full-adult) .items-line__head,\n.applecation .items-line:has(.warning-box--full-adult) .full-descr__text,\n.applecation .items-line:has(.warning-box--full-adult) .full-descr__details,\n.applecation .items-line:has(.warning-box--full-adult) .full-descr__tags {\n    display: none !important;\n}\n\n.applecation .items-line:has(.warning-box--full-adult) .items-line__body {\n    padding-top: 0;\n}\n</style>";Lampa.Template.add("applecation_css",t),$("body").append(Lampa.Template.get("applecation_css",{},!0))}(),function(){void 0===Lampa.Storage.get("applecation_show_ratings")&&Lampa.Storage.set("applecation_show_ratings",!1);void 0===Lampa.Storage.get("applecation_ratings_source")&&Lampa.Storage.set("applecation_ratings_source","external");void 0===Lampa.Storage.get("applecation_ratings_position")&&Lampa.Storage.set("applecation_ratings_position","card");void 0===Lampa.Storage.get("applecation_mdblist_api_key")&&Lampa.Storage.set("applecation_mdblist_api_key","");void 0===Lampa.Storage.get("applecation_kp_api_key")&&Lampa.Storage.set("applecation_kp_api_key","");if(void 0===Lampa.Storage.get("applecation_enabled_ratings")){const t=!!Lampa.Storage.get("applecation_kp_api_key","");Lampa.Storage.set("applecation_enabled_ratings",t?["imdb","kp"]:["imdb"])}else{if(!!!Lampa.Storage.get("applecation_kp_api_key","")){const t=Lampa.Storage.get("applecation_enabled_ratings",["imdb"]);Array.isArray(t)&&t.includes("kp")&&Lampa.Storage.set("applecation_enabled_ratings",t.filter(t=>"kp"!==t))}}void 0===Lampa.Storage.get("applecation_logo_scale")&&Lampa.Storage.set("applecation_logo_scale","100");void 0===Lampa.Storage.get("applecation_text_scale")&&Lampa.Storage.set("applecation_text_scale","100");void 0===Lampa.Storage.get("applecation_spacing_scale")&&Lampa.Storage.set("applecation_spacing_scale","100");void 0===Lampa.Storage.get("applecation_reverse_episodes")&&Lampa.Storage.set("applecation_reverse_episodes",!0);void 0===Lampa.Storage.get("applecation_description_overlay")&&Lampa.Storage.set("applecation_description_overlay",!0);void 0===Lampa.Storage.get("applecation_show_foreign_logo")&&Lampa.Storage.set("applecation_show_foreign_logo",!0);void 0===Lampa.Storage.get("applecation_liquid_glass")&&Lampa.Storage.set("applecation_liquid_glass",!0);void 0===Lampa.Storage.get("applecation_show_episode_count")&&Lampa.Storage.set("applecation_show_episode_count",!1);Lampa.SettingsApi.addComponent({component:"applecation_settings",name:"Applecation",icon:e}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_about",type:"static"},field:{name:"<div>Applecation v1.2.1</div>"},onRender:function(t){t.css("opacity","0.7"),t.find(".settings-param__name").css({"font-size":"1.2em","margin-bottom":"0.3em"}),t.append('<div style="font-size: 0.9em; padding: 0 1.2em; line-height: 1.4;">'+f("about_author")+": DarkestClouds<br>"+f("about_description")+"</div>")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_ratings_title",type:"title"},field:{name:f("settings_title_ratings")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_show_ratings",type:"trigger",default:!1},field:{name:f("show_ratings"),description:f("show_ratings_desc")},onChange:function(t){t?$("body").removeClass("applecation--hide-ratings"):$("body").addClass("applecation--hide-ratings"),Lampa.Settings.update()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_ratings_source",type:"select",values:{external:f("ratings_source_external"),builtin:f("ratings_source_builtin")},default:"external"},field:{name:f("ratings_source"),description:f("ratings_source_desc")},onChange:function(t){Lampa.Storage.set("applecation_ratings_source",t),$("body").removeClass("applecation--ratings-source-external applecation--ratings-source-builtin"),$("body").addClass("applecation--ratings-source-"+t),Lampa.Settings.update()},onRender:function(t){Lampa.Storage.get("applecation_show_ratings",!1)?t.show():t.hide()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_mdblist_api_key",type:"button",default:""},field:{name:f("mdblist_api_key"),description:f("mdblist_api_key_desc")},onChange:function(){const t=Lampa.Storage.get("applecation_mdblist_api_key","");Lampa.Input.edit({title:f("mdblist_api_key"),value:t,free:!0,nosave:!0},function(e){e!==t&&(Lampa.Storage.set("applecation_mdblist_api_key",e),Lampa.Storage.set(a,{}),Lampa.Noty.show(f("mdblist_api_key")+" "+(e?Lampa.Lang.translate("settings_saved"):Lampa.Lang.translate("settings_cleared"))))})},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();"external"===Lampa.Storage.get("applecation_ratings_source","external")?t.hide():t.show()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_kp_api_key",type:"button",default:""},field:{name:f("kp_api_key"),description:f("kp_api_key_desc")},onChange:function(){const t=Lampa.Storage.get("applecation_kp_api_key","");Lampa.Input.edit({title:f("kp_api_key"),value:t,free:!0,nosave:!0},function(e){if(e!==t&&(Lampa.Storage.set("applecation_kp_api_key",e),Lampa.Storage.set(a,{}),Lampa.Noty.show(f("kp_api_key")+" "+(e?Lampa.Lang.translate("settings_saved"):Lampa.Lang.translate("settings_cleared"))),!e)){const t=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]);Array.isArray(t)&&t.includes("kp")&&Lampa.Storage.set("applecation_enabled_ratings",t.filter(t=>"kp"!==t))}})},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();"external"===Lampa.Storage.get("applecation_ratings_source","external")?t.hide():t.show()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_enabled_ratings",type:"button",default:["imdb","kp"]},field:{name:f("enabled_ratings"),description:f("enabled_ratings_desc")},onChange:function(){let t=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]);const e=!!Lampa.Storage.get("applecation_kp_api_key","");!e&&Array.isArray(t)&&t.includes("kp")&&(t=t.filter(t=>"kp"!==t),Lampa.Storage.set("applecation_enabled_ratings",t));const n=[{title:f("rating_imdb"),value:"imdb",checkbox:!0,checked:t.includes("imdb")},{title:f("rating_tmdb"),value:"tmdb",checkbox:!0,checked:t.includes("tmdb")},{title:f("rating_tomatoes"),value:"tomatoes",checkbox:!0,checked:t.includes("tomatoes")},{title:f("rating_popcorn"),value:"popcorn",checkbox:!0,checked:t.includes("popcorn")},{title:f("rating_metacritic"),value:"metacritic",checkbox:!0,checked:t.includes("metacritic")},{title:f("rating_letterboxd"),value:"letterboxd",checkbox:!0,checked:t.includes("letterboxd")},{title:f("rating_trakt"),value:"trakt",checkbox:!0,checked:t.includes("trakt")},{title:f("rating_mal"),value:"myanimelist",checkbox:!0,checked:t.includes("myanimelist")}];e&&n.splice(1,0,{title:f("rating_kp"),value:"kp",checkbox:!0,checked:t.includes("kp")}),Lampa.Select.show({title:f("enabled_ratings"),items:n,onCheck:function(t){const e=!!Lampa.Storage.get("applecation_kp_api_key",""),n=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]).filter(t=>!!e||"kp"!==t);if(t.checked)n.includes(t.value)||n.push(t.value);else{const e=n.indexOf(t.value);e>-1&&n.splice(e,1)}Lampa.Storage.set("applecation_enabled_ratings",n)},onBack:function(){Lampa.Controller.toggle("settings_component")}})},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();"external"===Lampa.Storage.get("applecation_ratings_source","external")?t.hide():t.show()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_ratings_position",type:"select",values:{card:f("position_card"),corner:f("position_corner")},default:"card"},field:{name:f("ratings_position"),description:f("ratings_position_desc")},onChange:function(t){Lampa.Storage.get("applecation_ratings_source","external"),Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]);Lampa.Storage.set("applecation_ratings_position",t),$("body").removeClass("applecation--ratings-card applecation--ratings-corner"),$("body").addClass("applecation--ratings-"+t),C(),y(),Lampa.Activity.back()},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();Lampa.Storage.get("applecation_ratings_source","external"),Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"])}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_display_title",type:"title"},field:{name:f("settings_title_display")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"card_interfice_reactions",type:"trigger",default:!0},field:{name:f("show_reactions"),description:f("show_reactions_desc")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_show_foreign_logo",type:"trigger",default:!0},field:{name:f("show_foreign_logo"),description:f("show_foreign_logo_desc")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_reverse_episodes",type:"trigger",default:!0},field:{name:f("reverse_episodes"),description:f("reverse_episodes_desc")},onChange:function(t){Lampa.Storage.set("applecation_reverse_episodes",t)}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_description_overlay",type:"trigger",default:!0},field:{name:f("description_overlay"),description:f("description_overlay_desc")},onChange:function(t){Lampa.Storage.set("applecation_description_overlay",t)}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_show_episode_count",type:"trigger",default:!1},field:{name:f("show_episode_count"),description:f("show_episode_count_desc")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_liquid_glass",type:"trigger",default:!0},field:{name:f("liquid_glass"),description:f("liquid_glass_desc")},onChange:function(t){Lampa.Storage.set("applecation_liquid_glass",t),v()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_scaling_title",type:"title"},field:{name:f("settings_title_scaling")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_logo_scale",type:"select",values:{50:"50%",60:"60%",70:"70%",80:"80%",90:"90%",100:f("scale_default"),110:"110%",120:"120%",130:"130%",140:"140%",150:"150%",160:"160%",170:"170%",180:"180%"},default:"100"},field:{name:f("logo_scale"),description:f("logo_scale_desc")},onChange:function(t){Lampa.Storage.set("applecation_logo_scale",t),b()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_text_scale",type:"select",values:{50:"50%",60:"60%",70:"70%",80:"80%",90:"90%",100:f("scale_default"),110:"110%",120:"120%",130:"130%",140:"140%",150:"150%",160:"160%",170:"170%",180:"180%"},default:"100"},field:{name:f("text_scale"),description:f("text_scale_desc")},onChange:function(t){Lampa.Storage.set("applecation_text_scale",t),b()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_spacing_scale",type:"select",values:{50:"50%",60:"60%",70:"70%",80:"80%",90:"90%",100:f("scale_default"),110:"110%",120:"120%",130:"130%",140:"140%",150:"150%",160:"160%",170:"170%",180:"180%",200:"200%",250:"250%",300:"300%"},default:"100"},field:{name:f("spacing_scale"),description:f("spacing_scale_desc")},onChange:function(t){Lampa.Storage.set("applecation_spacing_scale",t),b()}}),Lampa.Storage.get("applecation_show_ratings",!1)||$("body").addClass("applecation--hide-ratings");$("body").addClass("applecation--ratings-"+Lampa.Storage.get("applecation_ratings_position","card"));const t=Lampa.Storage.get("applecation_ratings_source","external");$("body").addClass("applecation--ratings-source-"+t),b()}(),v(),Lampa.Listener.follow("full",t=>{if(Lampa.Storage.get("applecation_description_overlay",!0)&&function(t){if("start"===t.type&&t.link){const e=t.data&&t.data.movie;if(e&&e.adult&&!Lampa.Storage.field("adult_content_view"))return;const n=t.link.rows,a=n.indexOf("description");a>-1&&n.splice(a,1)}}(t),"complite"===t.type){const n=t.object.activity,a=n.render();a.addClass("applecation");const i=t.data,o=i&&i.movie;Lampa.Storage.get("applecation_description_overlay",!0)&&o&&o.adult&&!Lampa.Storage.field("adult_content_view")&&function(t){const e=t.find(".items-line .warning-box--full-adult");if(!e.length)return;const n=e.closest(".full-descr").find(".full-descr__left").first();n.length&&n.find(".selector").filter(function(){const t=$(this);return!t.hasClass("warning-box")&&!t.closest(".warning-box").length}).removeClass("selector")}(a),n.__destroyed=!1;var e=n.destroy;n.destroy=function(){n.__destroyed=!0,e&&e.apply(n,arguments)};const l=Lampa.Storage.field("poster_size");a.toggleClass("applecation--poster-high","w500"===l),function(t){const e=t.render().find(".full-start__background");e.length&&!e.next(".applecation__overlay").length&&e.after('<div class="full-start__background loaded applecation__overlay"></div>')}(n),k(t),o&&function(t,e){if(!Lampa.Storage.get("applecation_show_ratings",!1))return;const n=t.render().find(".applecation__ratings");n.length&&"builtin"===Lampa.Storage.get("applecation_ratings_source","external")&&g.fetch(e,n=>{m(t)&&function(t,e,n){const a=t.render().find(".applecation__ratings");if(!a.length)return;const i=!!Lampa.Storage.get("applecation_kp_api_key",""),o=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]).filter(t=>!!i||"kp"!==t),l=Lampa.Storage.get("applecation_ratings_source","external");if("builtin"!==l)return;let r=a.find(".applecation__ratings-builtin");r.length||(r=$('<div class="applecation__ratings-builtin hide"></div>'),a.append(r)),r.removeClass("show").addClass("hide").empty();const s="builtin-rate--",p={tomatoes:{fresh:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 138.75 141.25"><g fill="#f93208"><path d="m20.154 40.829c-28.149 27.622-13.657 61.011-5.734 71.931 35.254 41.954 92.792 25.339 111.89-5.9071 4.7608-8.2027 22.554-53.467-23.976-78.009z"/><path d="m39.613 39.265 4.7778-8.8607 28.406-5.0384 11.119 9.2082z"/></g><path d="m39.436 8.5696 8.9682-5.2826 6.7569 15.479c3.7925-6.3226 13.79-16.316 24.939-4.6684-4.7281 1.2636-7.5161 3.8553-7.7397 8.4768 15.145-4.1697 31.343 3.2127 33.539 9.0911-10.951-4.314-27.695 10.377-41.771 2.334 0.009 15.045-12.617 16.636-19.902 17.076 2.077-4.996 5.591-9.994 1.474-14.987-7.618 8.171-13.874 10.668-33.17 4.668 4.876-1.679 14.843-11.39 24.448-11.425-6.775-2.467-12.29-2.087-17.814-1.475 2.917-3.961 12.149-15.197 28.625-8.476z" fill="#02902e"/></svg>',certified:'<svg viewBox="0 0 264 264"xmlns=http://www.w3.org/2000/svg><g id=layer1><path d="m37.343 201c-64.636-75.11-21.896-199.45 92.547-200.68 109.5-1.9185 166 117.79 98.07 200.36z"id=path3406 fill=#fa6d0e /></g><g id=layer2><path d="m39.391 194.45c-5.232-6.2-9.522-12.72-13.649-20.73-6.979-13.55-11.103-27.74-12.599-43.34-0.60643-6.3238-0.44896-18.969 0.307-24.652 1.9531-14.684 5.7507-27.003 12.112-39.293 18.411-35.567 52.726-57.341 95.518-60.608 5.327-0.40672 17.081-0.40573 21.912 0.00186 26.228 2.2125 49.157 11.341 67.929 27.045 20.207 16.904 33.673 39.672 38.885 65.748 1.6378 8.1935 1.8934 11.156 1.8916 21.922-0.002 10.239-0.13698 12.089-1.4281 19.534-1.3592 7.838-3.1873 14.455-6.0824 22.015-1.9226 5.0206-5.4869 12.588-7.5942 16.124-0.76237 1.279-1.4706 2.5348-1.5739 2.7906-0.40166 0.99471-5.8217 8.831-8.4607 12.233l-2.7782 3.5809-73.628 0.008c-40.495 0.005-81.465 0.0864-91.042 0.18233l-17.414 0.1745-2.3083-2.7351z"id=path3414 fill=#ffd600 /></g><g id=layer3 fill-rule=evenodd stroke=#000 stroke-width=1px><g><path d="m60.733 41.274c-13.825 0.77302-13.491 15.928-7.5773 20.321 5.7404 4.7541 19.245 4.1115 18.714-10.677h-4.7071c0.81464 7.4274-6.1664 10.215-10.792 6.544-3.1787-2.4792-3.3966-10.664 4.4775-11.366z"id=path3419 /><path d="m65.98 34.008 13.236-8.3473 1.9042 3.1531-9.4084 5.8018 2.8029 4.2282 8.8344-5.7404 1.8566 3.1392-8.6581 5.5386 2.6069 4.2479 9.2936-5.6452 1.8427 2.9629-13.094 7.9414z"id=path3463 /><path d="m87.732 21.446 6.8212 20.517 5.2278-2.019-2.3576-6.936 2.411-0.80365 5.7125 5.6255 5.7485-1.9378-6.6391-6.0987c5.8115-6.7807-0.73197-16.414-12.805-10.333z"id=path3487 /><path d="m110.12 14.044 0.73063 4.6679 6.1697-0.89299 1.9078 17.332 4.7085-0.64945-2.0295-17.048 6.3321-1.0554-0.4465-4.5055z"id=path3513 /><path d="m136.55 12.177-1.1365 21.838 4.7897 0.32472 1.2177-21.919z"id=path3515 /><path d="m152.46 14.288-5.2768 20.782 4.3026 1.1365 2.2731-8.3616 8.8487 2.5166 0.97417-3.8967-8.6864-2.5166 1.1365-4.5461 9.4982 2.5166 1.0554-4.3026z"id=path3517 /><path d="m175.41 20.871-9.0758 19.895 4.3358 2.0608 9.1811-19.941z"id=path3519 /><path d="m189.41 27.48 12.708 9.1323-2.2071 2.949-8.9107-6.5405-2.8659 4.1857 8.6381 6.0316-2.212 2.8997-8.3849-5.944-2.9577 4.0115 8.7225 6.4929-2.0539 2.8206-12.278-9.1525z"id=path3521 /><path d="m209.61 42.295-15.749 14.45c2.101 4.1046 11.445 15.188 21.269 6.6568 7.7467-7.7002 0.46855-14.925-5.5203-21.107z"id=path3523 /></g><path d="m93.601 23.867 2.2731 5.845c2.2103-1.0484 7.5812-1.814 5.845-6.0886-1.7638-2.4625-4.5169-1.7258-8.1181 0.24354z"id=path3597 fill=#ffd600 /><path d="m209.38 48.512-9.5145 8.7794c0.96874 2.2553 5.9216 8.786 12.12 3.0671 5.1113-5.0568 0.43115-8.5523-2.6052-11.847z"id=path3600 fill=#ffd600 /></g><g id=layer4><path d="m52.811 196.72c-29.827-32.21-35.027-109.5 35.131-128.81l87.488-1.608c64.955 14.227 70.868 92.462 35.131 129.96z"id=path3605 fill=#fa3008 /></g><g id=layer5><g fill=#fff><path d="m44.545 110.85v41.675h11.251v-15.269h16.647v-9.6438h-16.647v-7.118h17.68v-9.6438z"id=path3702 /><path d="m76.806 110.96v41.101h11.251v-12.399h3.7886l7.334 12.703h13.331l-8.6418-14.968c11.722-6.4577 8.299-26.954-8.0052-26.781 0 0-19.173 0.34442-19.058 0.34442z"id=path3704 /><path d="m114.46 111.19v41.445h31.802v-10.218h-19.517v-6.4292h18.369v-9.6438h-18.369v-5.7404h19.632v-9.6438z"id=path3706 /><path d="m174.28 125.31 7.0032-7.5773c-5.6401-9.8066-31.184-12.207-32.261 5.8552-0.0651 10.857 10.676 12.689 16.647 13.547 9.1514 1.1745 4.5108 5.4184 2.1813 5.97-4.1015 0.3558-9.5196-1.8055-12.858-6.3144l-7.118 7.3476c12.082 15.461 29.732 6.958 32.376 2.8702 9.8557-16.106-10.255-23.046-16.417-22.043-4.5744 0.5052-4.1267-6.0987 2.2962-4.5923 2.1102 0.54658 3.4808 0.3029 8.1513 4.9367z"id=path3708 /><path d="m185.07 110.73v42.249h11.825v-16.417h12.055v16.303h11.94v-42.019h-12.055v15.499h-11.94v-15.499z"id=path3710 /></g><path d="m88.287 121.18v8.4957c5.4584-0.16649 10.747 0.86766 10.792-4.4775 0.05152-3.6316-3.2768-4.8952-10.792-4.0182z"id=path3712 fill=#fa3008 /></g><g id=layer6><path d="m6.9717 230.41c6.2855-7.2889 16.555-13.98 31.498-19.97l24.841 36.694c-15.721 0.33212-26.526 9.2959-32.797 16.561-2.5232-9.7958-3.895-19.592-2.1107-29.387-10.522-4.6768-14.817-3.1271-21.432-3.8967z"id=path3895 fill=#04c754 /><path d="m257.99 230.07c-6.2855-7.2889-16.555-13.98-31.498-19.97l-24.841 36.694c15.721 0.33212 26.526 9.2959 32.797 16.561 2.5232-9.7958 3.895-19.592 2.1107-29.387 10.522-4.6768 14.817-3.1271 21.432-3.8967z"id=path3961 fill=#04c754 /><path d="m30.166 214.17c3.5218-1.832 4.8782-2.4512 8.4068-3.6212l9.2431 33.319z"id=path4029 fill=#00ac40 /><path d="m234.73 213.72c-3.5218-1.832-4.8782-2.4512-8.4068-3.6212l-9.2431 33.319z"id=path4031 fill=#00ac40 /><path d="m47.588 243.74 15.556 3.0424-0.68884-7.9791z"id=path4033 fill=#009c34 /><path d="m202.92 240.06-1.2055 6.8884 15.958-3.0424z"id=path4035 fill=#009c34 /></g><g id=layer7 fill=#01912c><path d="m30.686 197.59 16.786 46.372c57.615-9.8616 114.29-9.3656 170.17-0.1802l16.642-46.273c-71.73-11.24-135.24-12.64-203.59 0.08z"id=path4037 /><path d="m95.793 191.42 2.1107-3.7343 7.5498-1.7048 7.631 5.0332z"id=path4307 /></g><g id=layer8><g id=g4262 fill=#f9f517 transform="matrix(.24170 0 0 .24170 49.363 178.57)"><path d="m105.8 102.98-8.0172-0.10423v-50.619-50.619h24.186c26.088 0 28.291 0.12542 34.659 1.9732 10.334 2.9985 18.223 9.4964 22.57 18.591 2.1141 4.4222 2.9427 7.9588 3.1597 13.486 0.49026 12.49-4.8082 23.35-14.188 29.082-2.8096 1.7169-2.9403 1.8527-2.4829 2.5796 1.2343 1.9616 20.736 35.548 20.736 35.713 0 0.1025-7.4426 0.18636-16.539 0.18636h-16.539l-9.5998-16.167c-5.2799-8.8917-9.8029-16.445-10.051-16.784-0.33627-0.45988-1.1926-0.66814-3.3574-0.81651l-2.906-0.19918 0.1815 16.983 0.1815 16.983-6.9879-0.0828c-3.8433-0.0455-10.596-0.12973-15.005-0.18705zm35.703-56.479c6.7674-1.4238 10.228-4.6666 10.607-9.9384 0.26462-3.6861-0.61122-6.2013-2.9536-8.482-3.1044-3.0227-7.4377-4.0701-16.926-4.0912l-5.0084-0.0111 0.23412 3.2983c0.12877 1.814 0.23412 7.1086 0.23412 11.766v8.4675l5.6751-0.24535c3.1213-0.13495 6.7833-0.47851 8.1378-0.76348z"id=path3554 /><path d="m218.68 104.68c-8.9254-1.007-16.797-4.9792-23.157-11.686-7.2226-7.6165-11.109-16.992-11.521-27.797-0.22097-5.7879 0.2163-9.6195 1.5977-14 5.206-16.508 19.973-26.343 40.714-27.116 3.5416-0.13202 6.6611-0.0434 8.8279 0.25076 17.801 2.4166 30.891 14.819 34.788 32.96 0.82406 3.8358 0.81686 12.628-0.0133 16.27-3.4361 15.073-14.036 25.493-29.983 29.475-6.315 1.5768-15.528 2.2888-21.255 1.6427h-0.00001zm9.7895-12.053c3.4979-1.0388 4.9377-2.9451 4.899-6.4866-0.013-1.1891-0.28397-2.8511-0.60221-3.6933-1.675-4.4332-1.6614-4.3761-1.2552-5.2676 0.21765-0.47768 0.78769-1.0471 1.2668-1.2654 1.1551-0.52631 1.8453-0.0729 3.4061 2.2376 2.2156 3.2798 6.2083 7.0112 8.7996 8.2239 2.0783 0.97253 2.6624 1.089 4.8436 0.96575 2.166-0.1224 2.733-0.31414 4.4738-1.5131 2.2856-1.5742 2.9015-2.8565 2.8796-5.996-0.0219-3.1463-1.6539-5.7434-4.8982-7.7954-1.9849-1.2554-6.2108-2.548-9.285-2.84-3.9203-0.37243-5.3039-1.0122-5.8047-2.6839-0.48683-1.6249 0.0253-2.9578 1.5779-4.1069 0.79157-0.58585 1.76-0.78306 4.6842-0.95387 2.3539-0.13749 4.0903-0.42912 4.8039-0.80682 5.1061-2.7026 5.4383-11.468 0.56294-14.856-1.364-0.9479-1.8674-1.0841-3.9636-1.0725-4.8275 0.0268-8.0918 3.1872-9.6325 9.3261-0.12439 0.49562-0.60784 1.313-1.0743 1.8163-0.9863 1.0642-2.8395 1.226-4.4579 0.38911-1.6309-0.84339-1.8399-2.6938-0.90178-7.9844 1.1672-6.5826 0.53375-9.3395-2.5629-11.154-1.9709-1.155-5.4749-1.5596-7.5568-0.87248-1.8355 0.60576-4.2268 3.0607-4.7778 4.905-1.1107 3.7172-0.22935 6.0738 3.8878 10.396 1.7296 1.8156 3.2504 3.6341 3.3796 4.0411 0.59081 1.8615-1.6535 3.9975-3.7227 3.543-1.1806-0.25929-2.3025-1.4025-4.1283-4.2067-2.9344-4.5068-7.0321-5.9454-11.069-3.8859-3.4732 1.7719-4.3725 5.7747-2.0664 9.1975 1.3375 1.9852 3.7393 3.3086 7.44 4.0994 5.3584 1.1451 6.8669 2.3079 5.4052 4.1662-0.75801 0.96366-0.83096 0.9792-3.3251 0.7083-3.7655-0.409-5.2238-0.25808-7.3156 0.75707-2.1787 1.0573-3.1289 2.2273-3.7222 4.5835-1.1898 4.725 2.1398 8.9112 7.0702 8.8892 2.5959-0.0116 4.5669-1.083 7.8614-4.2736 3.6397-3.525 4.2895-3.8967 5.4654-3.1262 1.2859 0.84253 1.4466 2.0917 0.56544 4.3943-2.0038 5.2363-0.15432 10.68 4.1498 12.214 1.8042 0.64317 2.5 0.6414 4.7-0.0119z"id=path3556 /><path d="m310.73 103.24c-13.527-0.86538-20.855-4.6291-24.882-12.779-2.7931-5.6532-3.4544-10.408-3.7959-27.295l-0.23135-11.44h-1.89c-1.0395 0-2.6423-0.10312-3.5617-0.22914l-1.6717-0.22914v-12.382-12.382h3.7834 3.7834v-10.81-10.81h14.773 14.773v10.81 10.81h6.1255 6.1255v12.792 12.792h-6.1255-6.1255l0.001 11.44c0.001 10.711 0.0462 11.514 0.70471 12.594 1.2297 2.017 2.1917 2.2695 8.6444 2.2695h5.7831v12.611 12.611l-6.0354-0.0538c-3.3195-0.0296-7.9001-0.17311-10.179-0.31891z"id=path3558 /><path d="m365.58 102.87c-15.629-1.5099-22.78-7.8138-25.148-22.169-0.41928-2.541-0.6553-7.1627-0.82014-16.06-0.12729-6.8705-0.36628-12.627-0.53108-12.791-0.1648-0.16485-1.8268-0.35591-3.6933-0.42459l-3.3937-0.12486v-12.577-12.577h4.0064 4.0064l-0.26587-10.81-0.26587-10.81h14.816 14.816v10.99 10.99h6.1255 6.1255v12.611 12.611h-6.144-6.144l0.10857 11.62c0.0984 10.534 0.16986 11.711 0.76417 12.586 1.4074 2.0734 2.088 2.2667 8.4426 2.3982l5.8553 0.12108v12.4 12.4l-7.837-0.0491c-4.3104-0.027-9.1809-0.17894-10.823-0.33763z"id=path3560 /><path d="m425.4 87.386c-12.392-1.5612-23.904-7.7739-29.557-15.952-5.3449-7.7317-8.0642-16.437-8.0697-25.834-0.008-13.574 5.9092-24.516 17.388-32.154 7.1893-4.7836 12.745-6.3503 23.579-6.6497 5.523-0.1526 6.9942-0.0741 9.9106 0.52869 5.7317 1.1847 10.724 3.5398 14.889 7.0243 3.7102 3.1035 7.8573 9.2211 9.9488 14.676 2.507 6.5385 3.9263 17.032 3.034 22.43l-0.22334 1.3512h-26.076c-14.342 0-26.076 0.137-26.076 0.30446 0 0.16745 0.62239 1.2674 1.3831 2.4444 3.3244 5.1435 8.6222 7.7076 15.898 7.6943 5.4469-0.01 10.592-1.4423 14.27-3.973l1.4804-1.0186 8.2565 7.7551c4.5411 4.2653 8.475 7.9652 8.742 8.2221 0.75121 0.7224 0.0562 1.6522-3.1554 4.2219-4.9481 3.9589-11.022 6.685-18.337 8.23-4.0389 0.85301-13.138 1.2205-17.284 0.69813zm15.261-50.147c-0.59675-3.7319-2.7937-6.5239-6.4972-8.257-4.0532-1.8967-9.342-1.7323-13.564 0.42183-2.8638 1.461-5.5299 4.8747-6.2366 7.9854l-0.2218 0.97626 2.9759 0.12145c1.6367 0.0668 7.6583 0.15445 13.381 0.19478l10.405 0.0734-0.24243-1.5161z"id=path3562 /><path d="m473.24 64.698v-38.915h14.593 14.593v5.4048c0 2.9727 0.12161 5.4037 0.27025 5.4023 0.14863-0.001 1.081-0.98805 2.0719-2.1925 3.3319-4.05 8.4992-7.6668 13.356-9.348 15.184-5.2565 31.395 6.568 33.649 24.545 0.23146 1.846 0.37789 12.826 0.37789 28.336v25.322h-14.773-14.773v-22.99-22.99l-0.9562-1.9188c-1.5738-3.1581-4.7154-4.9985-8.5924-5.0335-4.3579-0.0393-7.6091 2.6196-9.3056 7.6105-0.74626 2.1954-0.7727 2.9121-0.88464 23.973l-0.11539 21.71h-14.755-14.755v-38.915z"id=path3564 /><path d="m483.72 195.49c-8.7879-1.2296-17.227-5.0751-22.84-10.407-6.9419-6.5948-11.058-16.86-11.058-27.579 0-11.183 5.0732-21.063 14.659-28.549 1.6668-1.3015 2.971-2.4258 2.8983-2.4985s-2.839 0.0526-6.1473 0.27845c-3.3084 0.22582-6.1097 0.31609-6.2252 0.20059-0.35527-0.35527 1.9224-3.3646 3.4808-4.5988 3.1887-2.5255 7.1982-3.4206 11.016-2.4593 2.8647 0.72134 2.7601 0.0117-0.52917-3.5913l-2.9368-3.2169 1.9486-1.6648c1.0718-0.91561 2.0264-1.6648 2.1214-1.6648s1.3454 1.8672 2.7786 4.1494 2.7377 4.2309 2.8989 4.3305c0.16121 0.0996 0.88234-0.70656 1.6025-1.7915 3.1041-4.6766 7.5048-6.7814 11.726-5.6087 2.8281 0.78567 2.8284 0.94893 0.009 4.474-1.4011 1.7514-2.5474 3.2129-2.5474 3.2477s2.8972-0.005 6.4382-0.0887c12.435-0.2935 20.725 1.6085 27.681 6.351 2.3823 1.6241 5.8912 5.1844 7.6504 7.7624 1.3597 1.9926 5.0735 9.6438 5.9418 12.241 1.8727 5.6021 2.1543 15.51 0.60611 21.323-1.0931 4.1048-3.901 9.5862-6.6754 13.032-6.2675 7.7832-16.447 13.536-27.95 15.794-3.5693 0.70076-13.148 1.0101-16.548 0.53438z"id=path3566 /><path d="m578.46 196.55c-7.8346-0.99337-14.881-3.5706-21.428-7.837-7.4897-4.8811-13.128-13.98-15.556-25.105-0.78464-3.5949-1.0411-10.974-0.50816-14.619 1.8612-12.729 9.6305-22.96 22.28-29.339 2.3971-1.2089 4.4428-1.9037 7.7062-2.6174 4.0381-0.88306 5.1322-0.97166 12.01-0.97253 6.7615-0.00086 7.8928 0.087 10.63 0.82559 12.802 3.4549 21.615 13.546 24.914 28.527 0.6918 3.142 0.83442 4.8524 0.84128 10.089l0.008 6.3057-26.206 0.18017-26.206 0.18016 1.1028 1.9308c3.137 5.4924 8.7262 8.3384 16.375 8.3384 5.3866 0 11.187-1.6725 14.461-4.1698l1.1776-0.89824 8.8542 8.356 8.8542 8.356-1.3689 1.4106c-7.9413 8.1832-23.911 12.838-37.942 11.059zm15.344-49.787c-0.77215-4.8941-4.5797-8.3719-10.226-9.3401-7.3015-1.2521-14.551 3.0206-16.122 9.5022-0.23523 0.97036-0.23008 0.97313 2.0507 1.1016 1.2576 0.0709 7.2932 0.16007 13.413 0.19825l11.126 0.0694-0.24162-1.5314z"id=path3568 /><path d="m649.62 196.93c-4.1463-0.4696-9.5241-1.6761-13.109-2.941-5.0223-1.7721-12.654-5.8658-12.654-6.7875 0-0.29887 10.534-18.822 11.044-19.42 0.0714-0.0836 2.3584 0.99211 5.0822 2.3905 7.4733 3.8368 10.895 4.8595 16.123 4.8192 4.2064-0.0324 6.9057-0.75215 8.1974-2.1858 1.8014-1.9995 0.97638-4.9047-1.6271-5.7293-0.64098-0.20303-3.6787-0.35471-6.7504-0.33708-3.9043 0.0224-6.3566-0.14086-8.1489-0.54259-10.216-2.2898-18.196-8.8832-21.451-17.724-0.64718-1.7576-0.7997-2.9616-0.82112-6.4824-0.0646-2.6728 0.7448-5.0553 1.5236-7.5661 3.0818-9.9354 13.202-16.079 23.78-18.263 2.9019-0.59914 4.4449-0.69408 9.0809-0.55874 6.0131 0.17555 9.6049 0.81959 15.149 2.7164 5.6992 1.9497 13.459 5.5992 13.421 6.312-0.009 0.16319-2.2624 4.0982-5.0083 8.7444-3.8334 6.4863-5.1196 8.3911-5.5397 8.2041-2.0201-0.89918-11.14-3.7997-13.519-4.2998-1.5854-0.33323-4.5108-0.62581-6.5009-0.65016-3.8407-0.047-4.94 0.31052-6.3727 2.0726-0.98054 1.206-0.83346 3.5197 0.29091 4.5764 0.89112 0.83748 1.1626 0.87763 6.5759 0.97257 13.405 0.2351 21.781 3.1407 27.711 9.6131 3.5386 3.8618 5.3831 8.2718 5.7427 13.731 0.51074 7.752-2.2504 14.495-8.2806 20.223-4.1377 3.9304-5.7939 4.9373-11.207 6.8132-5.8898 2.0411-15.988 3.0618-22.733 2.2979z"id=path3570 /><path d="m427.56 194.43c-3.1147-0.14948-8.5034-0.88225-10.832-1.473-10.841-2.7501-16.058-8.9595-18.094-21.535-0.27815-1.718-0.47698-6.2005-0.68515-15.446l-0.29328-13.025-1.6724-0.15801c-0.91985-0.0869-2.561-0.15881-3.6471-0.15981l-1.9746-0.002v-12.612-12.612h3.9386 3.9386l-0.1221-9.1086c-0.0672-5.0098-0.17037-9.8826-0.22936-10.828l-0.10726-1.7198h14.89 14.89v10.956 10.956h6.1149 6.1149v12.739 12.739h-6.1149-6.1149l0.002 10.892c0.00076 6.8144 0.10147 11.252 0.26868 11.855 0.33257 1.1976 1.6225 2.6971 2.7115 3.1521 0.60913 0.25456 2.3193 0.34423 6.5646 0.34423h5.7409v12.612 12.612l-6.8156-0.0491c-3.7486-0.027-7.5608-0.0849-8.4717-0.12858z"id=path3572 /><path d="m327.55 196.91c-6.0677-0.89879-12.181-4.2608-18.039-9.9194-3.6145-3.4921-5.6717-6.2542-7.7002-10.339-3.0306-6.1023-4.1772-10.835-4.3864-18.104-0.20071-6.9721 0.59366-12.343 2.7511-18.599 2.2335-6.4773 4.4455-10.213 8.3658-14.126 8.4647-8.4508 18.629-11.802 28.321-9.3368 5.607 1.426 10.185 4.0966 15.083 8.7982l2.2294 2.14v-4.7499-4.7499h13.886 13.886v38.473 38.473h-13.886-13.886v-4.841c0-2.6625-0.0749-4.841-0.16647-4.841-0.0916 0-1.2206 1.0606-2.5091 2.3568-7.0642 7.107-15.892 10.559-23.95 9.366zm17.685-28.317c5.7855-2.8454 9.0992-11.159 6.9944-17.547-1.1572-3.5124-4.2606-6.4205-8.2736-7.7526-3.876-1.2867-6.6105-1.145-10.106 0.52351-4.5126 2.154-7.1913 6.6024-7.1913 11.943 0 3.8881 1.2707 7.0034 3.9492 9.6819 4.0239 4.0239 10.164 5.3469 14.627 3.1517z"id=path3574 /><path d="m260.84 189.73c-0.0924-2.9654-0.17862-11.364-0.1917-18.663-0.0131-7.2994-0.0995-15.45-0.19195-18.113-0.19113-5.5023-0.42525-6.3086-2.4118-8.3062-2.3224-2.3354-6.3268-3.1823-9.4598-2.0009-2.7463 1.0356-4.8368 3.8001-5.4692 7.2327-0.18747 1.0175-0.27855 8.5779-0.27855 23.122v21.61h-14.778c-8.1277 0-14.801-0.0287-14.829-0.0637-0.0281-0.035-0.1141-10.383-0.19109-22.995l-0.13998-22.931-0.86605-1.5971c-0.99669-1.838-2.2415-3.0544-4.1569-4.0618-1.1982-0.63025-1.6137-0.70842-3.7673-0.70889-2.0345-0.0005-2.5948 0.0925-3.5138 0.58259-2.416 1.2885-4.2402 4.0486-5.0865 7.6961-0.40668 1.7527-0.43572 3.667-0.35081 23.122l0.0926 21.211h-14.765-14.765l-0.16939-22.973c-0.0932-12.635-0.16939-30.12-0.16939-38.855v-15.882h14.643 14.643l0.0707 3.6275c0.0605 3.1064 0.13001 3.6389 0.48358 3.7068 0.24341 0.0467 1.3415-0.84094 2.6753-2.1625 2.7004-2.6758 5.0529-4.087 9.1256-5.4745 11.078-3.7741 22.042-1.1534 30.246 7.2298l2.2033 2.2515 0.69237-1.1814c3.2464-5.5396 12.361-9.5259 21.781-9.5259 7.8044 0 14.775 2.6568 19.708 7.5117 5.1179 5.0368 8.1838 12.777 8.6807 21.916 0.0762 1.4013 0.20438 13.239 0.28485 26.307l0.14632 23.759h-14.879-14.879l-0.16791-5.3916z"id=path3576 /><path d="m107.78 196.02c-6.0926-0.99832-10.52-2.705-15.396-5.9351-11.61-7.6903-18.797-22.407-18.135-37.134 0.81092-18.046 12.392-31.634 30.62-35.927 7.9813-1.8796 17.076-2.1579 24.066-0.73652 12.231 2.4873 22.77 10.864 28.179 22.395 5.2662 11.228 5.4349 24.038 0.4578 34.76-5.5967 12.056-17.13 19.866-32.956 22.316-3.758 0.5817-13.917 0.73961-16.834 0.26167zm13.14-27.525c4.4484-0.93392 8.1199-3.6944 10.055-7.5597 1.0002-1.9983 1.0286-2.1268 1.0249-4.6373-0.004-3.0016-0.47007-5.2416-1.5427-7.4205-3.6817-7.4786-12.83-10.42-20.566-6.6116-3.7913 1.8662-7.0509 6.2224-7.7619 10.373-1.1202 6.5396 3.8078 14.306 10.256 16.163 1.4002 0.40328 5.9277 0.24039 8.5354-0.3071z"id=path3578 /><path d="m28.559 158.18v-36.689h-13.376-13.376v-14.301-14.301l40.448 0.18815c22.246 0.10348 40.534 0.23971 40.639 0.30273 0.1051 0.063 0.19109 6.3565 0.19109 13.985v13.871h-12.994-12.994v36.817 36.817h-14.268-14.268v-36.689z"id=path3580 /><path d="m705.5 109.07c-0.8084-0.0513-1.6332-0.0184-2.4531 0.0918-1.6393 0.22023-3.2608 0.74918-4.6836 1.582-1.7985 1.0528-3.6019 3.0024-4.5664 4.9102-2.1226 4.1983-1.8353 9.352 0.76758 13.117 1.7571 2.542 4.5826 4.305 7.9336 5.0293 1.743 0.37669 4.1785 0.36028 5.7168-0.13281 1.965-0.62998 3.6029-1.6767 5.1113-3.252 2.559-2.6723 3.9068-5.9718 3.9121-9.6094 0.005-3.253-1.1303-5.9181-3.459-8.1133-1.5822-1.4916-3.3513-2.4394-5.9258-3.2109-0.75281-0.22561-1.5451-0.36077-2.3535-0.41211zm-0.79492 3.9121c1.2826 0.00021 1.3825 0.009 2.248 0.27344 3.2525 0.99456 5.2285 2.8755 5.9492 5.4766 1.2382 4.4679-1.9019 9.9522-6.2051 10.967-1.9266 0.45434-5.0387-0.16285-6.8809-1.4258-2.9831-2.0454-4.2013-5.8638-2.9863-9.6445 0.72861-2.267 2.2294-3.9702 4.3262-4.9297 1.2837-0.58744 1.9196-0.71707 3.5488-0.71679z"id=path4305 /><path d="m701.3 126.62-0.8542-0.0115v-5.3932-5.3933h2.577c2.7795 0 3.0143 0.0134 3.6928 0.21025 1.101 0.31948 1.9415 1.0118 2.4049 1.9808 0.22524 0.47117 0.31353 0.84798 0.33665 1.437 0.0521 1.3307-0.51231 2.4879-1.5117 3.0986-0.29937 0.18292-0.31328 0.19738-0.26455 0.27485 0.13151 0.20899 2.2093 3.7876 2.2093 3.8051 0 0.0107-0.79299 0.0199-1.7622 0.0199h-1.7622l-1.0228-1.7225c-0.56254-0.9474-1.0445-1.7521-1.0709-1.7883-0.0358-0.049-0.12706-0.0712-0.35773-0.087l-0.30963-0.0212 0.0193 1.8095 0.0193 1.8095-0.74454-0.009c-0.4095-0.005-1.1289-0.0138-1.5988-0.0199zm3.804-6.0177c0.72105-0.15169 1.0898-0.49721 1.1301-1.0589 0.0282-0.39275-0.0652-0.66074-0.3147-0.90375-0.33078-0.32205-0.79247-0.43365-1.8034-0.4359l-0.53364-0.001 0.0249 0.35143c0.0136 0.19328 0.0248 0.75742 0.0248 1.2536v0.90219l0.60466-0.0261c0.33258-0.0144 0.72275-0.0511 0.86707-0.0814z"id=path3584 /></g></g><path d="m92.534 57.233c1.823-2.196 15.246-14.146 32.836-3.215l-6.8884-14.351 7.8069-0.80365 4.133 14.58c5.6938-6.7936 18.081-12.516 26.75-0.68884-7.1807 0.6116-8.6909 4.1794-9.1846 7.3476 21.349-2.099 27.616 3.9846 31.457 8.1513-12.791-3.6696-27.648 11.782-42.019 2.4109-2.2844 14.012-13.151 14.634-22.502 14.351 2.9228-4.5918 6.742-8.9147 3.7886-15.269-11.512 8.7305-20.641 5.0873-33.753-1.3777 1.6737-1.2709 18.946-7.0772 25.946-6.6588-6.6249-3.4685-13.423-4.1733-18.369-4.4775z"id=path3607 fill=#01912c /></svg>',rotten:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 145 140"><path fill="#0fc755" d="M47.4 35.342c-13.607-7.935-12.32-25.203 2.097-31.88 26.124-6.531 29.117 13.78 22.652 30.412-6.542 24.11 18.095 23.662 19.925 10.067 3.605-18.412 19.394-26.695 31.67-16.359 12.598 12.135 7.074 36.581-17.827 34.187-16.03-1.545-19.552 19.585.839 21.183 32.228 1.915 42.49 22.167 31.04 35.865-15.993 15.15-37.691-4.439-45.512-19.505-6.8-9.307-17.321.11-13.423 6.502 12.983 19.465 2.923 31.229-10.906 30.62-13.37-.85-20.96-9.06-13.214-29.15 3.897-12.481-8.595-15.386-16.57-5.45-11.707 19.61-28.865 13.68-33.976 4.19-3.243-7.621-2.921-25.846 24.119-23.696 16.688 4.137 11.776-12.561-.63-13.633-9.245-.443-30.501-7.304-22.86-24.54 7.34-11.056 24.958-11.768 33.348 6.293 3.037 4.232 8.361 11.042 18.037 5.033 3.51-5.197 1.21-13.9-8.809-20.135z"/></svg>'},popcorn:{fresh:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.25 140"><path fill="#fa3106" d="M2.727 39.537c-.471-21.981 100.88-25.089 100.88-.42L92.91 117.56c-7.605 26.86-72.064 27.007-79.07.21z"/><g fill="#fff"><path d="M8.809 51.911l9.018 66.639c3.472 4.515 8.498 7.384 9.648 8.022l-6.921-68.576c-3.498-1.41-9.881-4.579-11.745-6.083zM28.629 59.776l5.453 68.898c4.926 2.652 11.04 3.391 15.73 3.566l-1.258-70.366c-3.414-.024-13.82-.642-19.925-2.098zM97.632 52.121l-9.019 66.643c-3.472 4.515-8.498 7.384-9.647 8.022l6.92-68.583c3.5-1.41 9.882-4.579 11.746-6.082zM77.812 59.986l-5.453 68.898c-4.926 2.652-11.04 3.391-15.73 3.566l1.258-70.366c3.414-.024 13.82-.642 19.925-2.098z"/></g><g fill="#ffd600"><circle cx="13.213" cy="31.252" r="6.816"/><circle cx="22.022" cy="27.687" r="6.607"/><circle cx="30.359" cy="19.769" r="5.925"/><circle cx="34.973" cy="15.155" r="6.03"/><circle cx="45.093" cy="17.095" r="4.929"/><circle cx="51.123" cy="9.597" r="6.24"/><circle cx="61.19" cy="9.387" r="6.554"/><circle cx="67.954" cy="13.635" r="4.929"/><circle cx="76.081" cy="17.672" r="5.925"/><circle cx="78.913" cy="22.706" r="4.352"/><circle cx="83.475" cy="26.324" r="5.243"/><circle cx="88.194" cy="34.398" r="5.768"/><path d="M87.355 35.447c5.79 2.799 1.352-2.213 10.696 2.097-9.574 15.338-74.774 16.892-90.291.525l-.21-3.985L38.59 16.99l22.863-6.606 15.52 9.962z"/></g></svg>',rotten:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 143.75 108.75"><path d="m96.641 2.9657c28.149 1.101 27.459 97.814 0.825 97.194l-74.45-9.973c-25.51-7.211-25.922-69.313-0.534-76.178z" fill="#07a23b"/><g fill="#fff"><path d="m85.419 8.8789-63.171 8.9751c-4.2681 3.3648-6.9679 8.2192-7.5687 9.3296l65.017-6.963c1.3226-3.3762 4.3015-9.5395 5.7202-11.342z"/><path d="m78.042 28.008-65.329 5.5498c-2.494 4.757-3.169 10.65-3.3147 15.17l66.739-1.5147c0.0074-3.2891 0.55003-13.318 1.9052-19.206z"/><path d="m85.595 94.456-63.251-8.403c-4.2975-3.326-7.0398-8.1557-7.6503-9.2607l65.082 6.3737c1.3522 3.3644 4.3852 9.4999 5.8189 11.29z"/><path d="m78.051 75.394-65.375-4.957c-2.536-4.734-3.2627-10.621-3.4481-15.14l66.749 0.9101c0.03629 3.2889 0.66694 13.312 2.0737 19.188z"/></g><path d="m100.36 10.836c-13.099 0.685-19.878 48.223-11.732 71.195l21.342-4.561c8.39-24.044 1.28-66.986-9.61-66.634z" fill="#03621e"/><g fill="#fdd600"><path d="m99.087 78.942a6.1255 6.1255 0 0 1 -6.1238 6.1255 6.1255 6.1255 0 0 1 -6.1273 -6.122 6.1255 6.1255 0 0 1 6.1202 -6.1291 6.1255 6.1255 0 0 1 6.1309 6.1184"/><path d="m112.96 75.406a5.5952 5.5952 0 0 1 -5.5936 5.5952 5.5952 5.5952 0 0 1 -5.5968 -5.592 5.5952 5.5952 0 0 1 5.5903 -5.5985 5.5952 5.5952 0 0 1 5.6001 5.5887"/><path d="m120.39 74.743a4.9323 4.9323 0 0 1 -4.9309 4.9323 4.9323 4.9323 0 0 1 -4.9337 -4.9294 4.9323 4.9323 0 0 1 4.928 -4.9352 4.9323 4.9323 0 0 1 4.9366 4.9266"/><path d="m124.1 78.942a3.7391 3.7391 0 0 1 -3.738 3.7391 3.7391 3.7391 0 0 1 -3.7402 -3.7369 3.7391 3.7391 0 0 1 3.7358 -3.7412 3.7391 3.7391 0 0 1 3.7423 3.7347"/><path d="m131.08 83.14a5.0207 5.0207 0 0 1 -5.0192 5.0207 5.0207 5.0207 0 0 1 -5.0222 -5.0178 5.0207 5.0207 0 0 1 5.0163 -5.0236 5.0207 5.0207 0 0 1 5.0251 5.0148"/><path d="m135.86 91.67a5.5952 5.5952 0 0 1 -5.5936 5.5952 5.5952 5.5952 0 0 1 -5.5968 -5.592 5.5952 5.5952 0 0 1 5.5903 -5.5985 5.5952 5.5952 0 0 1 5.6001 5.5887"/><path d="m140.36 97.327a3.9158 3.9158 0 0 1 -3.9147 3.9158 3.9158 3.9158 0 0 1 -3.917 -3.9136 3.9158 3.9158 0 0 1 3.9124 -3.9181 3.9158 3.9158 0 0 1 3.9192 3.9113"/><path d="m140.45 99.625a4.181 4.181 0 0 1 -4.1798 4.181 4.181 4.181 0 0 1 -4.1822 -4.1786 4.181 4.181 0 0 1 4.1773 -4.1834 4.181 4.181 0 0 1 4.1846 4.1761"/><path d="m134.44 100.55a4.8439 4.8439 0 0 1 -4.8425 4.8439 4.8439 4.8439 0 0 1 -4.8453 -4.8411 4.8439 4.8439 0 0 1 4.8397 -4.8467 4.8439 4.8439 0 0 1 4.8481 4.8383"/><path d="m126.84 100.24a4.0042 4.0042 0 0 1 -4.0031 4.0042 4.0042 4.0042 0 0 1 -4.0054 -4.0019 4.0042 4.0042 0 0 1 4.0007 -4.0065 4.0042 4.0042 0 0 1 4.0077 3.9996"/><path d="m125.43 97.636a5.1091 5.1091 0 0 1 -5.1076 5.1091 5.1091 5.1091 0 0 1 -5.1106 -5.1061 5.1091 5.1091 0 0 1 5.1046 -5.112 5.1091 5.1091 0 0 1 5.1135 5.1031"/><path d="m117.12 98.078a5.1091 5.1091 0 0 1 -5.1076 5.1091 5.1091 5.1091 0 0 1 -5.1106 -5.1061 5.1091 5.1091 0 0 1 5.1046 -5.112 5.1091 5.1091 0 0 1 5.1135 5.1031"/><path d="m110.49 97.459a3.6065 3.6065 0 0 1 -3.6054 3.6065 3.6065 3.6065 0 0 1 -3.6075 -3.6044 3.6065 3.6065 0 0 1 3.6033 -3.6086 3.6065 3.6065 0 0 1 3.6096 3.6023"/><path d="m105.72 96.929a4.0484 4.0484 0 0 1 -4.0472 4.0484 4.0484 4.0484 0 0 1 -4.0496 -4.0461 4.0484 4.0484 0 0 1 4.0449 -4.0508 4.0484 4.0484 0 0 1 4.052 4.0437"/><path d="m94.71 80.271c2.1568-1.7217 5.4319-2.8842 9.5881-3.6062l11.579 0.61872 15.203 13.612-2.0329 9.6343-27.047-2.5633-4.7288 1.4584-11.183-17.899z"/></g><path d="m85.913 71.627c3.2472 12.036 7.0507 22.57 12.64 28.284l-9.9879-1.591s-5.5685-25.456-4.8614-25.544c0.70711-0.08839 2.2097-1.149 2.2097-1.149z" fill="#09a339"/></svg>'}},c={imdb:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none"><path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/></svg>',kp:'<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10"/></svg>',tmdb:'<svg width="800" height="800" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M25.99 29.198c2.807 0 4.708-1.896 4.708-4.708v-19.781c0-2.807-1.901-4.708-4.708-4.708h-19.979c-2.807 0-4.708 1.901-4.708 4.708v27.292l2.411-2.802v-24.49c.005-1.266 1.031-2.292 2.297-2.292h19.974c1.266 0 2.292 1.026 2.292 2.292v19.781c0 1.266-1.026 2.292-2.292 2.292h-16.755l-2.417 2.417-.016-.016zM11.714 15.286h-2.26v7.599h2.26c5.057 0 5.057-7.599 0-7.599zM11.714 21.365h-.734v-4.557h.734c2.958 0 2.958 4.557 0 4.557zM11.276 13.854h1.516v-6.083h1.891v-1.505h-5.302v1.505h1.896zM18.75 9.599l-2.625-3.333h-.49v7.714h1.542v-4.24l1.573 2.042 1.578-2.042-.010 4.24h1.542v-7.714h-.479zM21.313 19.089c.474-.333.677-.922.698-1.5.031-1.339-.807-2.307-2.156-2.307h-3.005v7.609h3.005c1.24-.010 2.245-1.021 2.245-2.26v-.036c0-.62-.307-1.172-.781-1.5zM18.37 16.802h1.354c.432 0 .698.339.698.766.031.406-.286.76-.698.76h-1.354zM19.724 21.37h-1.354v-1.516h1.37c.411 0 .745.333.745.745v.016c0 .417-.333.755-.75.755z"/></svg>',tomatoes:'<svg id="svg3390" xmlns="http://www.w3.org/2000/svg" height="141.25" viewBox="0 0 138.75 141.25" width="138.75" version="1.1"><g id="layer1" fill="#f93208"><path id="path3412" d="m20.154 40.829c-28.149 27.622-13.657 61.011-5.734 71.931 35.254 41.954 92.792 25.339 111.89-5.9071 4.7608-8.2027 22.554-53.467-23.976-78.009z"/><path id="path3471" d="m39.613 39.265 4.7778-8.8607 28.406-5.0384 11.119 9.2082z"/></g><g id="layer2"><path id="path3437" d="m39.436 8.5696 8.9682-5.2826 6.7569 15.479c3.7925-6.3226 13.79-16.316 24.939-4.6684-4.7281 1.2636-7.5161 3.8553-7.7397 8.4768 15.145-4.1697 31.343 3.2127 33.539 9.0911-10.951-4.314-27.695 10.377-41.771 2.334 0.009 15.045-12.617 16.636-19.902 17.076 2.077-4.996 5.591-9.994 1.474-14.987-7.618 8.171-13.874 10.668-33.17 4.668 4.876-1.679 14.843-11.39 24.448-11.425-6.775-2.467-12.29-2.087-17.814-1.475 2.917-3.961 12.149-15.197 28.625-8.476z" fill="#02902e"/></g></svg>',popcorn:'<svg xmlns="http://www.w3.org/2000/svg" width="106.25" height="140"><path fill="#fa3106" d="M2.727 39.537c-.471-21.981 100.88-25.089 100.88-.42L92.91 117.56c-7.605 26.86-72.064 27.007-79.07.21z"/><g fill="#fff"><path d="M8.809 51.911l9.018 66.639c3.472 4.515 8.498 7.384 9.648 8.022l-6.921-68.576c-3.498-1.41-9.881-4.579-11.745-6.083zM28.629 59.776l5.453 68.898c4.926 2.652 11.04 3.391 15.73 3.566l-1.258-70.366c-3.414-.024-13.82-.642-19.925-2.098zM97.632 52.121l-9.019 66.643c-3.472 4.515-8.498 7.384-9.647 8.022l6.92-68.583c3.5-1.41 9.882-4.579 11.746-6.082zM77.812 59.986l-5.453 68.898c-4.926 2.652-11.04 3.391-15.73 3.566l1.258-70.366c3.414-.024 13.82-.642 19.925-2.098z"/></g><g fill="#ffd600"><circle cx="13.213" cy="31.252" r="6.816"/><circle cx="22.022" cy="27.687" r="6.607"/><circle cx="30.359" cy="19.769" r="5.925"/><circle cx="34.973" cy="15.155" r="6.03"/><circle cx="45.093" cy="17.095" r="4.929"/><circle cx="51.123" cy="9.597" r="6.24"/><circle cx="61.19" cy="9.387" r="6.554"/><circle cx="67.954" cy="13.635" r="4.929"/><circle cx="76.081" cy="17.672" r="5.925"/><circle cx="78.913" cy="22.706" r="4.352"/><circle cx="83.475" cy="26.324" r="5.243"/><circle cx="88.194" cy="34.398" r="5.768"/><path d="M87.355 35.447c5.79 2.799 1.352-2.213 10.696 2.097-9.574 15.338-74.774 16.892-90.291.525l-.21-3.985L38.59 16.99l22.863-6.606 15.52 9.962z"/></g></svg>',metacritic:'<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.209 32.937L20.619 29.527L14.052 22.96C13.776 22.684 13.476 22.338 13.315 21.946C12.946 21.163 12.785 19.942 13.684 19.043C14.79 17.937 16.264 18.398 17.693 19.827L24.006 26.14L27.416 22.73L20.826 16.14C20.55 15.864 20.227 15.449 20.066 15.103C19.628 14.205 19.651 13.076 20.458 12.269C21.587 11.14 23.061 11.555 24.698 13.191L30.826 19.32L34.236 15.91L27.6 9.274C24.236 5.91 21.08 6.025 18.914 8.191C18.084 9.021 17.577 9.896 17.324 10.887C17.0952 11.8067 17.0639 12.7643 17.232 13.697L17.186 13.744C15.526 13.053 13.637 13.467 12.186 14.919C10.25 16.854 10.32 18.905 10.55 20.103L10.48 20.173L8.799 18.813L5.849 21.762C6.886 22.707 8.131 23.859 9.536 25.264L17.209 32.937Z" fill="white"/><path d="M19.982 8.12464e-06C16.0272 0.0035675 12.1621 1.17957 8.87551 3.37936C5.5889 5.57915 3.02825 8.70397 1.51726 12.3588C0.00626421 16.0136 -0.387235 20.0344 0.386501 23.9128C1.16024 27.7913 3.06647 31.3532 5.86424 34.1485C8.662 36.9437 12.2257 38.8468 16.1048 39.617C19.9839 40.3873 24.0044 39.9901 27.6578 38.4759C31.3113 36.9616 34.4338 34.3981 36.6306 31.1095C38.8275 27.8209 40 23.9549 40 20V19.976C39.9936 14.6727 37.8812 9.58908 34.1273 5.84302C30.3734 2.09697 25.2853 -0.00476866 19.982 8.12464e-06ZM19.891 4.27401C24.0449 4.27029 28.0303 5.9166 30.9705 8.85087C33.9108 11.7851 35.5652 15.7671 35.57 19.921V19.939C35.57 23.0366 34.6516 26.0647 32.931 28.6405C31.2104 31.2162 28.7647 33.2241 25.9032 34.4101C23.0417 35.5962 19.8927 35.9073 16.8544 35.3041C13.8161 34.7009 11.0249 33.2104 8.83348 31.0211C6.6421 28.8318 5.14897 26.042 4.54284 23.0043C3.93671 19.9666 4.24479 16.8173 5.42814 13.9547C6.61148 11.092 8.61697 8.64442 11.1911 6.92133C13.7652 5.19823 16.7924 4.27697 19.89 4.27401H19.891Z" fill="#FFBD3F"/></svg>',letterboxd:'<svg width="800" height="800" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="currentColor" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2"><path d="M1179.28 284.01c-6.02-5.845-14.23-9.447-23.28-9.447-9.04 0-17.25 3.597-23.27 9.438-6.03-5.841-14.23-9.438-23.28-9.438-18.45 0-33.43 14.983-33.43 33.437 0 18.454 14.98 33.437 33.43 33.437 9.05 0 17.25-3.597 23.28-9.438 6.02 5.841 14.23 9.438 23.27 9.438 9.05 0 17.26-3.602 23.28-9.447 6.02 5.845 14.24 9.447 23.28 9.447 18.46 0 33.44-14.983 33.44-33.437 0-18.454-14.98-33.437-33.44-33.437-9.04 0-17.26 3.602-23.28 9.447Zm-7.07 9.965c-3.94-4.539-9.74-7.412-16.21-7.412-6.46 0-12.26 2.867-16.2 7.397a33.152 33.152 0 0 1 3.09 14.04c0 5.012-1.1 9.768-3.09 14.04 3.94 4.53 9.74 7.397 16.2 7.397 6.47 0 12.27-2.873 16.21-7.412a33.228 33.228 0 0 1-3.08-14.025c0-5.007 1.1-9.758 3.08-14.025Zm-46.56-.015c-3.93-4.53-9.73-7.397-16.2-7.397-11.83 0-21.43 9.606-21.43 21.437 0 11.831 9.6 21.437 21.43 21.437 6.47 0 12.27-2.867 16.2-7.397a33.303 33.303 0 0 1-3.09-14.04c0-5.012 1.11-9.768 3.09-14.04Zm60.71 28.065c3.93 4.539 9.73 7.412 16.2 7.412 11.83 0 21.44-9.606 21.44-21.437 0-11.831-9.61-21.437-21.44-21.437-6.47 0-12.27 2.873-16.2 7.412a33.373 33.373 0 0 1 3.07 14.025c0 5.007-1.1 9.758-3.07 14.025Z" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" transform="translate(-1060 -212)"/></svg>',trakt:'<svg width="800" height="800" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M16 32c-8.817 0-16-7.183-16-16s7.183-16 16-16c8.817 0 16 7.183 16 16s-7.183 16-16 16zM16 1.615c-7.932 0-14.385 6.453-14.385 14.385s6.453 14.385 14.385 14.385c7.932 0 14.385-6.453 14.385-14.385s-6.453-14.385-14.385-14.385zM6.521 24.708c2.339 2.557 5.724 4.152 9.479 4.152 1.917 0 3.735-0.417 5.369-1.167l-8.932-8.907zM25.573 24.62c2.052-2.281 3.307-5.323 3.307-8.625 0-5.177-3.047-9.62-7.421-11.677l-8.12 8.099 12.219 12.204zM12.401 13.38l-6.765 6.74-0.907-0.907 15.421-15.416c-1.301-0.437-2.692-0.677-4.151-0.677-7.115-0.005-12.885 5.765-12.885 12.88 0 2.896 0.953 5.573 2.588 7.735l6.74-6.74 0.479 0.437 9.663 9.661c0.197-0.109 0.38-0.219 0.556-0.353l-10.703-10.672-6.468 6.473-0.907-0.905 7.38-7.381 0.479 0.443 11.281 11.251c0.177-0.136 0.339-0.292 0.5-0.421l-12.181-12.157-0.109 0.021zM16.464 14.749l-0.901-0.9 6.38-6.385 0.907 0.916-6.385 6.38zM22.521 5.979l-7.36 7.36-0.907-0.907 7.36-7.359 0.907 0.911z"/></svg>',myanimelist:'<svg width="512" height="206" viewBox="0 0 512 206" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M176.49 1.28V180.97L131.63 180.91V69.67L88.32 120.96L45.89 68.52L45.46 181.27H0V1.32001H47L86.79 55.61L129.79 1.30002L176.49 1.28ZM360.55 45.42L361.08 180.57H310.63L310.46 119.32H250.73C252.22 129.97 255.21 146.32 259.63 157.32C262.94 165.45 265.99 173.32 272.07 181.38L235.7 205.38C228.25 191.81 222.43 176.86 216.97 160.96C211.505 145.955 207.872 130.346 206.15 114.47C204.34 98.47 204.08 83.09 208.43 67.28C212.708 51.9137 221.305 38.0972 233.2 27.47C239.88 21.22 249.2 16.8 256.67 12.81C264.14 8.82003 272.52 7.18002 280.29 5.15002C288.64 3.16198 297.138 1.85764 305.7 1.25C314.19 0.52 329.32 -0.159976 356.7 0.650024L368.33 37.96H309.55C296.9 38.13 290.82 37.96 280.94 42.42C273.097 46.129 266.415 51.9066 261.611 59.131C256.808 66.3555 254.066 74.7531 253.68 83.42L310.49 84.12L311.3 45.51H360.56L360.55 45.42ZM445.72 0.670013V142.02L512 142.67L502.83 180.54H400.28V0L445.72 0.670013Z" fill="white"/></svg>'};["imdb","kp","tmdb","tomatoes","popcorn","metacritic","letterboxd","trakt","myanimelist"].forEach(t=>{if(!o.includes(t))return;if(!e[t]||null===e[t])return;const a=e[t],i=a&&"object"==typeof a?a.score??a.value:a,l=a&&"object"==typeof a?a.votes:void 0,d=parseFloat(i);if(isNaN(d))return;const g=75,m=n&&(n.name||n.original_name||n.first_air_date)?20:80,h="number"==typeof l&&!isNaN(l),_=d>=60,u="tomatoes"===t?"tomatoes"===t&&d>=g&&h&&l>=m?p.tomatoes.certified:_?p.tomatoes.fresh:p.tomatoes.rotten:"popcorn"===t?_?p.popcorn.fresh:p.popcorn.rotten:c[t];let f;f="tomatoes"===t||"popcorn"===t?Math.round(d)+"%":"metacritic"===t||"trakt"===t?Math.round(d).toString():d.toFixed(1);const v=`\n                <div class="${s}${t}">\n                    ${u}\n                    <div>${f}</div>\n                </div>\n            `;r.append(v)}),r.children().length>0&&(a.removeClass("hide"),r.removeClass("hide"))}(t,n,e)})}(n,o),function(t){const e=t.render().find(".full-start__background:not(.applecation__overlay)")[0],n=t.render().find(".scroll__body")[0];if(!e||!n)return;let a=!1;const i=Object.getOwnPropertyDescriptor(n.style,"-webkit-transform")||Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,"webkitTransform");Object.defineProperty(n.style,"-webkit-transform",{set:function(t){if(t){const n=t.indexOf(",")+1,i=t.indexOf(",",n);if(n>0&&i>n){const o=parseFloat(t.substring(n,i))<0;o!==a&&(a=o,e.classList.toggle("dim",o))}}i&&i.set?i.set.call(this,t):this.setProperty("-webkit-transform",t)},get:function(){return i&&i.get?i.get.call(this):this.getPropertyValue("-webkit-transform")},configurable:!0})}(n),function(t){const e=t.render(),n=e.find(".full-person__name");function a(t){return t.scrollWidth>t.clientWidth+1}n.each(function(){const t=$(this);if(t.hasClass("marquee-processed")){const e=t.find("span").first().text();e&&(t.text(e),t.removeClass("marquee-processed marquee-active"),t.css("--marquee-duration",""))}}),setTimeout(()=>{m(t)&&n.each(function(){const t=$(this),e=t.text().trim();if(e)if(a(t[0])){const n=Math.min(Math.max(.25*e.length,5),20);t.addClass("marquee-processed marquee-active"),t.css("--marquee-duration",n+"s");const a=$("<span>").text(e),i=$("<span>").text(e),o=$('<div class="marquee__inner">').append(a).append(i);t.empty().append(o)}else t.addClass("marquee-processed")})},100)}(n),o&&h(o,n)}}),function(){try{if(window.applecation_episodes_core_patch)return;if(window.applecation_episodes_core_patch=!0,window.episodes_order_fix=!0,window.episodes_core_patch=!0,!window.Lampa||!Lampa.Utils||"function"!=typeof Lampa.Utils.createInstance)return;if(Lampa.Utils.__applecation_episodes_core_patch_applied)return;function e(t){try{if(!t)return!1;if(!t.movie)return!1;if(!Array.isArray(t.results)||!t.results.length)return!1;for(var e=0,n=0;n<t.results.length;n++){var a=t.results[n];a&&("number"==typeof a.episode_number&&e++,"number"==typeof a.season_number&&e++,a.comeing&&e++,a.air_date&&e++)}return e>=3}catch(t){return!1}}function n(t){try{for(var e=t.results||[],n=[],a=[],i=0;i<e.length;i++){var o=e[i];o&&(o.comeing?n.push(o):a.push(o))}a.sort(function(t,e){return(t.episode_number||0)-(e.episode_number||0)}),t.results=a.concat(n)}catch(t){}}function a(t){try{if(!t||!t.scroll||"function"!=typeof t.scroll.append)return;if(t.__applecation_episodes_scroll_append_patched)return;t.__applecation_episodes_scroll_append_patched=!0;var e=t.scroll.append.bind(t.scroll);t.scroll.append=function(n){var a=n instanceof jQuery?n[0]:n;if(a&&a.classList&&a.classList.contains("card-more"))return e(n);var i="function"==typeof t.scroll.body?t.scroll.body(!0):null;if(i){var o=i.querySelector(".card-more");if(o&&a&&a!==o)return void i.insertBefore(a,o)}return e(n)}}catch(t){}}function i(t){try{if(!t||"function"!=typeof t.create)return;if(t.__applecation_episodes_create_patched)return;t.__applecation_episodes_create_patched=!0;var e=t.create.bind(t);t.create=function(){a(t);var n=e();return setTimeout(function(){try{var e=t&&t.scroll&&"function"==typeof t.scroll.body?t.scroll.body(!0):null,n=e?e.querySelector(".card-more"):null;n&&n.classList.remove("card-more--first")}catch(t){}},0),n}}catch(t){}}Lampa.Utils.__applecation_episodes_core_patch_applied=!0;var t=Lampa.Utils.createInstance;Lampa.Utils.createInstance=function(a,o,l,r){var s=e(o),p=Lampa.Storage.get("applecation_reverse_episodes",!0);s&&p&&n(o);var c=t.call(this,a,o,l,r);return s&&p&&i(c),c}}catch(o){}}()):console.log("Applecation","TV mode only")}const u={show_ratings:{ru:"Показывать рейтинги",en:"Show ratings",uk:"Показувати рейтинги",be:"Паказваць рэйтынгі",bg:"Показване на рейтинги",cs:"Zobrazit hodnocení",he:"הצג דירוגים",pt:"Mostrar classificações",zh:"显示评分"},ratings_source:{ru:"Источник рейтингов",en:"Ratings Source",uk:"Джерело рейтингів",be:"Крыніца рэйтынгаў",bg:"Източник на рейтинги",cs:"Zdroj hodnocení",he:"מקור דירוגים",pt:"Fonte de classificações",zh:"评分来源"},ratings_source_desc:{ru:"От плагинов или от рейтинговых сервисов",en:"From plugins or rating services",uk:"Від плагінів або від рейтингових сервісів",be:"Ад плагінаў або ад рэйтынгавых сэрвісаў",bg:"От плъгини или от рейтингови услуги",cs:"Z pluginů nebo z ratingových služeb",he:"מתוספים או משירותי דירוג",pt:"De plugins ou de serviços de avaliação",zh:"来自插件或评分服务"},ratings_source_builtin:{ru:"Рейтинговые сервисы",en:"Rating services",uk:"Рейтингові сервіси",be:"Рэйтынгавыя сэрвісы",bg:"Рейтингови услуги",cs:"Ratingové služby",he:"שירותי דירוג",pt:"Serviços de avaliação",zh:"评分服务"},ratings_source_external:{ru:"Плагины",en:"Plugins",uk:"Плагіни",be:"Плагіны",bg:"Плъгини",cs:"Pluginy",he:"תוספים",pt:"Plugins",zh:"插件"},mdblist_api_key:{ru:"MDBList API Key",en:"MDBList API Key",uk:"MDBList API Key",be:"MDBList API Key",bg:"MDBList API Key",cs:"MDBList API Key",he:"MDBList API Key",pt:"MDBList API Key",zh:"MDBList API 密钥"},mdblist_api_key_desc:{ru:"API ключ для получения рейтингов от MDBList (mdblist.com)",en:"API key for getting ratings from MDBList (mdblist.com)",uk:"API ключ для отримання рейтингів від MDBList (mdblist.com)",be:"API ключ для атрымання рэйтынгаў ад MDBList (mdblist.com)",bg:"API ключ за получаване на рейтинги от MDBList (mdblist.com)",cs:"API klíč pro získání hodnocení od MDBList (mdblist.com)",he:"מפתח API לקבלת דירוגים מ-MDBList (mdblist.com)",pt:"Chave API para obter classificações do MDBList (mdblist.com)",zh:"用于从 MDBList 获取评分的 API 密钥（mdblist.com）"},kp_api_key:{ru:"КиноПоиск API Key",en:"KinoPoisk API Key",uk:"КіноПошук API Key",be:"КіноПошук API Key",bg:"KinoPoisk API Key",cs:"KinoPoisk API Key",he:"KinoPoisk API Key",pt:"KinoPoisk API Key",zh:"KinoPoisk API 密钥"},kp_api_key_desc:{ru:"API ключ для получения рейтингов КиноПоиска (kinopoiskapiunofficial.tech)",en:"API key for getting KinoPoisk ratings (kinopoiskapiunofficial.tech)",uk:"API ключ для отримання рейтингів КіноПошуку (kinopoiskapiunofficial.tech)",be:"API ключ для атрымання рэйтынгаў КіноПошука (kinopoiskapiunofficial.tech)",bg:"API ключ за получаване на рейтинги от KinoPoisk (kinopoiskapiunofficial.tech)",cs:"API klíč pro získání hodnocení KinoPoisk (kinopoiskapiunofficial.tech)",he:"מפתח API לקבלת דירוגי KinoPoisk (kinopoiskapiunofficial.tech)",pt:"Chave API para obter classificações do KinoPoisk (kinopoiskapiunofficial.tech)",zh:"用于获取 KinoPoisk 评分的 API 密钥 (kinopoiskapiunofficial.tech)"},enabled_ratings:{ru:"Отображаемые рейтинги",en:"Displayed Ratings",uk:"Рейтинги що відображаються",be:"Рэйтынгі што адлюстроўваюцца",bg:"Показани рейтинги",cs:"Zobrazená hodnocení",he:"דירוגים מוצגים",pt:"Classificações exibidas",zh:"显示的评分"},enabled_ratings_desc:{ru:"Выберите какие рейтинги показывать",en:"Select which ratings to show",uk:"Виберіть які рейтинги показувати",be:"Выберыце якія рэйтынгі паказваць",bg:"Изберете кои рейтинги да се показват",cs:"Vyberte, která hodnocení zobrazit",he:"בחר אילו דירוגים להציג",pt:"Selecione quais classificações exibir",zh:"选择要显示的评分"},rating_imdb:{ru:"IMDB",en:"IMDB",uk:"IMDB",be:"IMDB",bg:"IMDB",cs:"IMDB",he:"IMDB",pt:"IMDB",zh:"IMDB"},rating_kp:{ru:"КиноПоиск",en:"KinoPoisk",uk:"КіноПошук",be:"КіноПошук",bg:"KinoPoisk",cs:"KinoPoisk",he:"KinoPoisk",pt:"KinoPoisk",zh:"KinoPoisk"},rating_tmdb:{ru:"TMDB",en:"TMDB",uk:"TMDB",be:"TMDB",bg:"TMDB",cs:"TMDB",he:"TMDB",pt:"TMDB",zh:"TMDB"},rating_tomatoes:{ru:"Rotten Tomatoes",en:"Rotten Tomatoes",uk:"Rotten Tomatoes",be:"Rotten Tomatoes",bg:"Rotten Tomatoes",cs:"Rotten Tomatoes",he:"Rotten Tomatoes",pt:"Rotten Tomatoes",zh:"Rotten Tomatoes"},rating_popcorn:{ru:"Popcorn",en:"Popcorn",uk:"Popcorn",be:"Popcorn",bg:"Popcorn",cs:"Popcorn",he:"Popcorn",pt:"Popcorn",zh:"Popcorn"},rating_metacritic:{ru:"Metacritic",en:"Metacritic",uk:"Metacritic",be:"Metacritic",bg:"Metacritic",cs:"Metacritic",he:"Metacritic",pt:"Metacritic",zh:"Metacritic"},rating_letterboxd:{ru:"Letterboxd",en:"Letterboxd",uk:"Letterboxd",be:"Letterboxd",bg:"Letterboxd",cs:"Letterboxd",he:"Letterboxd",pt:"Letterboxd",zh:"Letterboxd"},rating_trakt:{ru:"Trakt",en:"Trakt",uk:"Trakt",be:"Trakt",bg:"Trakt",cs:"Trakt",he:"Trakt",pt:"Trakt",zh:"Trakt"},rating_mal:{ru:"MyAnimeList",en:"MyAnimeList",uk:"MyAnimeList",be:"MyAnimeList",bg:"MyAnimeList",cs:"MyAnimeList",he:"MyAnimeList",pt:"MyAnimeList",zh:"MyAnimeList"},settings_title_ratings:{ru:"Рейтинги",en:"Ratings",uk:"Рейтинги",be:"Рэйтынгі",bg:"Рейтинги",cs:"Hodnocení",he:"דירוגים",pt:"Classificações",zh:"评分"},show_ratings_desc:{ru:"Отображать рейтинги в карточке",en:"Show ratings on the card",uk:"Відображати рейтинги в картці",be:"Адлюстроўваць рэйтынгі ў картцы",bg:"Показване на рейтинги в картата",cs:"Zobrazit hodnocení na kartě",he:"הצג דירוגים בכרטיס",pt:"Exibir classificações no cartão",zh:"在卡片中显示评分"},show_reactions:{ru:"Показывать реакции Lampa",en:"Show Lampa Reactions",uk:"Показувати реакції Lampa",be:"Паказваць рэакцыі Lampa",bg:"Показване на реакции Lampa",cs:"Zobrazit reakce Lampa",he:"הצג תגובות Lampa",pt:"Mostrar reações Lampa",zh:"显示 Lampa 反应"},show_reactions_desc:{ru:"Отображать блок с реакциями на карточке",en:"Display reactions block on card",uk:"Відображати блок з реакціями на картці",be:"Адлюстроўваць блок з рэакцыямі на картцы",bg:"Показване на блока с реакции на картата",cs:"Zobrazit blok s reakcemi na kartě",he:"הצג בלוק תגובות בכרטיס",pt:"Exibir bloco de reações no cartão",zh:"在卡片上显示反应块"},show_foreign_logo:{ru:"Логотип на английском",en:"No language logo",uk:"Логотип англійською",be:"Лагатып на англійскай",bg:"Лого на английски",cs:"Logo v angličtině",he:"לוגו באנגלית",pt:"Logotipo em inglês",zh:"英文徽标"},show_foreign_logo_desc:{ru:"Показывать логотип на английском языке, если нет на русском",en:"Show no language logo if localized version is missing",uk:"Показувати логотип на англійській мові, якщо немає на українській",be:"Паказваць лагатып на англійскай мове, калі няма на беларускай",bg:"Показване на лого на английски език, ако не е налично на български",cs:"Zobrazit logo v angličtině, pokud není k dispozici v češtině",he:"הצג לוגו באנגלית אם הגרסה המקומית חסרה",pt:"Mostrar logotipo em inglês se a versão localizada estiver ausente",zh:"如果本地化版本缺失，则显示英文徽标"},ratings_position:{ru:"Расположение рейтингов",en:"Ratings position",uk:"Розташування рейтингів",be:"Размяшчэнне рэйтынгаў",bg:"Позиция на рейтингите",cs:"Umístění hodnocení",he:"מיקום דירוגים",pt:"Posição das classificações",zh:"评分位置"},ratings_position_desc:{ru:"Выберите где отображать рейтинги",en:"Choose where to display ratings",uk:"Виберіть де відображати рейтинги",be:"Выберыце дзе адлюстроўваць рэйтынгі",bg:"Изберете къде да се показват рейтингите",cs:"Vyberte, kde zobrazit hodnocení",he:"בחר היכן להציג דירוגים",pt:"Escolha onde exibir classificações",zh:"选择评分显示位置"},position_card:{ru:"В карточке",en:"In card",uk:"У картці",be:"У картцы",bg:"В картата",cs:"Na kartě",he:"בכרטיס",pt:"No cartão",zh:"在卡片中"},position_corner:{ru:"В правом нижнем углу",en:"Bottom right corner",uk:"У правому нижньому куті",be:"У правым ніжнім куце",bg:"В долния десен ъгъл",cs:"V pravém dolním rohu",he:"בפינה הימנית התחתונה",pt:"Canto inferior direito",zh:"右下角"},year_short:{ru:" г.",en:"",uk:" р.",be:" г.",bg:" г.",cs:"",he:"",pt:"",zh:"年"},logo_scale:{ru:"Размер логотипа",en:"Logo Size",uk:"Розмір логотипу",be:"Памер лагатыпа",bg:"Размер на логото",cs:"Velikost loga",he:"גודל לוגו",pt:"Tamanho do logotipo",zh:"徽标大小"},logo_scale_desc:{ru:"Масштаб логотипа фильма",en:"Movie logo scale",uk:"Масштаб логотипу фільму",be:"Маштаб лагатыпа фільма",bg:"Мащаб на логото на филма",cs:"Měřítko loga filmu",he:"קנה מידה של לוגו הסרט",pt:"Escala do logotipo do filme",zh:"电影徽标比例"},text_scale:{ru:"Размер текста",en:"Text Size",uk:"Розмір тексту",be:"Памер тэксту",bg:"Размер на текста",cs:"Velikost textu",he:"גודל טקסט",pt:"Tamanho do texto",zh:"文本大小"},text_scale_desc:{ru:"Масштаб текста данных о фильме",en:"Movie data text scale",uk:"Масштаб тексту даних про фільм",be:"Маштаб тэксту даных пра фільм",bg:"Мащаб на текста с данни за филма",cs:"Měřítko textu dat filmu",he:"קנה מידה של טקסט נתוני הסרט",pt:"Escala do texto de dados do filme",zh:"电影数据文本比例"},scale_default:{ru:"По умолчанию",en:"Default",uk:"За замовчуванням",be:"Па змаўчанні",bg:"По подразбиране",cs:"Výchozí",he:"ברירת מחדל",pt:"Padrão",zh:"默认"},spacing_scale:{ru:"Отступы между строками",en:"Spacing Between Lines",uk:"Відступи між рядками",be:"Адступы паміж радкамі",bg:"Разстояние между редовете",cs:"Mezery mezi řádky",he:"מרווח בין שורות",pt:"Espaçamento entre linhas",zh:"行间距"},spacing_scale_desc:{ru:"Расстояние между элементами информации",en:"Distance between information elements",uk:"Відстань між елементами інформації",be:"Адлегласць паміж элементамі інфармацыі",bg:"Разстояние между информационни елементи",cs:"Vzdálenost mezi informačními prvky",he:"מרחק בין אלמנטי מידע",pt:"Distância entre elementos de informação",zh:"信息元素之间的距离"},settings_title_display:{ru:"Отображение",en:"Display",uk:"Відображення",be:"Адлюстраванне",bg:"Показване",cs:"Zobrazení",he:"תצוגה",pt:"Exibição",zh:"显示"},settings_title_scaling:{ru:"Масштабирование",en:"Scaling",uk:"Масштабування",be:"Маштабаванне",bg:"Мащабиране",cs:"Škálování",he:"קנה מידה",pt:"Dimensionamento",zh:"缩放"},show_episode_count:{ru:"Количество серий",en:"Episode Count",uk:"Кількість серій",be:"Колькасць серый",bg:"Брой епизоди",cs:"Počet epizod",he:"מספר פרקים",pt:"Número de episódios",zh:"剧集数量"},show_episode_count_desc:{ru:"Показывать общее количество серий для сериалов",en:"Show total episode count for TV shows",uk:"Показувати загальну кількість серій для серіалів",be:"Паказваць агульную колькасць серый для серыялаў",bg:"Показване на общия брой епизоди за сериали",cs:"Zobrazit celkový počet epizod u seriálů",he:"הצג את סך כל הפרקים עבור סדרות טלוויזיה",pt:"Mostrar o número total de episódios para séries",zh:"显示电视剧的总剧集数"},reverse_episodes:{ru:"Перевернуть список эпизодов",en:"Reverse Episodes List",uk:"Перевернути список епізодів",be:"Перавярнуць спіс эпізодаў",bg:"Обърни списъка с епизоди",cs:"Obrátit seznam epizod",he:"הפוך את רשימת הפרקים",pt:"Inverter lista de episódios",zh:"反转剧集列表"},reverse_episodes_desc:{ru:"Показывать эпизоды в обратном порядке (от новых к старым)",en:"Show episodes in reverse order (from newest to oldest)",uk:"Показувати епізоди у зворотному порядку (від нових до старих)",be:"Паказваць эпізоды ў адваротным парадку (ад новых да старых)",bg:"Показване на епизоди в обратен ред (от нови към стари)",cs:"Zobrazit epizody v opačném pořadí (od nejnovějších po nejstarší)",he:"הצג פרקים בסדר הפוך (מהחדש לישן)",pt:"Mostrar episódios em ordem inversa (do mais novo ao mais antigo)",zh:"以相反顺序显示剧集（从新到旧）"},description_overlay:{ru:"Описание в оверлее",en:"Description in Overlay",uk:"Опис в оверлеї",be:"Апісанне ў аверлеі",bg:"Описание в овърлей",cs:"Popis v překryvné vrstvě",he:"תיאור בשכבת על",pt:"Descrição em sobreposição",zh:"叠加层中的描述"},description_overlay_desc:{ru:"Показывать описание в отдельном окне при нажатии",en:"Show description in a separate window when clicked",uk:"Показувати опис в окремому вікні при натисканні",be:"Паказваць апісанне ў асобным акне пры націску",bg:"Показване на описанието в отделен прозорец при щракване",cs:"Při kliknutí zobrazit popis v samostatném okně",he:"הצג תיאור בחלון נפרד בעת לחיצה",pt:"Mostrar descrição em uma janela separada quando clicado",zh:"点击时在单独的窗口中显示描述"},liquid_glass:{ru:"Жидкое стекло",en:"Liquid Glass",uk:"Рідке скло",be:"Вадкае шкло",bg:"Течно стъкло",cs:"Tekuté sklo",he:"זכוכית נוזלית",pt:"Vidro Líquido",zh:"液体玻璃"},liquid_glass_desc:{ru:"Эффект «стеклянных» карточек при наведении в эпизодах и актерах",en:'"Glassy" card effect on focus in episodes and cast',uk:"Ефект «скляних» карток при наведенні в епізодах та акторах",be:"Эфект «шкляных» картак пры навядзенні ў эпізодах і акцёрах",bg:"Ефект „стъклени“ карти при фокус в епизодите и актьорите",cs:"Efekt „skleněných“ karet při zaměření v epizodách a obsazení",he:'אפקט כрטיסי "זכוכית" במיקוד בפרקים ובשחקנים',pt:'Efeito de cartões "vítreos" em foco nos episódios e elenco',zh:"剧集和演员表中聚焦时的“玻璃”卡片效果"},about_author:{ru:"Автор",en:"Author",uk:"Автор",be:"Аўтар",bg:"Автор",cs:"Autor",he:"מחבר",pt:"Autor",zh:"作者"},about_description:{ru:"Делает интерфейс в карточке фильма похожим на Apple TV и оптимизирует под 4K",en:"Makes the movie card interface look like Apple TV and optimizes for 4K",uk:"Робить інтерфейс у картці фільму схожим на Apple TV та оптимізує під 4K",be:"Робіць інтэрфейс у картцы фільма падобным на Apple TV і аптымізуе пад 4K",bg:"Прави интерфейса в картата на филма подобен на Apple TV и оптимизира за 4K",cs:"Vytváří rozhraní karty filmu podobné Apple TV a optimalizuje pro 4K",he:"הופך את ממשק כрטיס הסרט לדומה ל-Apple TV ומבצע אופטימיזציה ל-4K",pt:"Torna a interface do cartão do filme semelhante à Apple TV e otimiza para 4K",zh:"使电影卡片界面看起来像 Apple TV 并针对 4K 进行优化"}};function f(t){const e=Lampa.Storage.get("language","ru");return u[t]&&u[t][e]||u[t].ru}function v(){Lampa.Storage.get("applecation_liquid_glass",!0)?$("body").removeClass("applecation--no-liquid-glass"):$("body").addClass("applecation--no-liquid-glass")}function b(){const t=parseInt(Lampa.Storage.get("applecation_logo_scale","100")),e=parseInt(Lampa.Storage.get("applecation_text_scale","100")),n=parseInt(Lampa.Storage.get("applecation_spacing_scale","100"));$('style[data-id="applecation_scales"]').remove();const a=`\n            <style data-id="applecation_scales">\n                /* Масштаб логотипа */\n                \n                .applecation .applecation__logo img {\n                    max-width: ${35*t/100}vw !important;\n                    max-height: ${180*t/100}px !important;\n                }\n\n                /* Масштаб текста и мета-информации */\n                .applecation .applecation__content-wrapper {\n                    font-size: ${e}% !important;\n                }\n\n                /* Отступы между элементами */\n                .applecation .full-start-new__title {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__meta {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__ratings {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__description {\n                    max-width: ${35*e/100}vw !important;\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__info {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n            </style>\n        `;$("body").append(a)}function y(){Lampa.Template.add("applecation_overlay",'\n            <div class="applecation-description-overlay">\n                <div class="applecation-description-overlay__bg"></div>\n                <div class="applecation-description-overlay__content selector">\n                    <div class="applecation-description-overlay__logo"></div>\n                    <div class="applecation-description-overlay__title">{title}</div>\n                    <div class="applecation-description-overlay__text">{text}</div>\n                    <div class="applecation-description-overlay__details">\n                        <div class="applecation-description-overlay__info">\n                            <div class="applecation-description-overlay__info-name">#{full_date_of_release}</div>\n                            <div class="applecation-description-overlay__info-body">{relise}</div>\n                        </div>\n                        <div class="applecation-description-overlay__info applecation--budget">\n                            <div class="applecation-description-overlay__info-name">#{full_budget}</div>\n                            <div class="applecation-description-overlay__info-body">{budget}</div>\n                        </div>\n                        <div class="applecation-description-overlay__info applecation--countries">\n                            <div class="applecation-description-overlay__info-name">#{full_countries}</div>\n                            <div class="applecation-description-overlay__info-body">{countries}</div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        ')}function C(){const t=Lampa.Storage.get("applecation_ratings_position","card"),e='\x3c!-- Рейтинги --\x3e\n                    <div class="applecation__ratings">\n                        <div class="rate--imdb hide">\n                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">\n                                <path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/>\n                            </svg>\n                            <div>0.0</div>\n                        </div>\n                        <div class="rate--kp hide">\n                            <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none">\n                                <path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10"/>\n                            </svg>\n                            <div>0.0</div>\n                        </div>\n                        \x3c!-- Контейнер для встроенных рейтингов (чтобы можно было анимировать появление отдельно от общего блока) --\x3e\n                        <div class="applecation__ratings-builtin hide"></div>\n                    </div>',n=`<div class="full-start-new applecation">\n        <div class="full-start-new__body">\n            <div class="full-start-new__left hide">\n                <div class="full-start-new__poster">\n                    <img class="full-start-new__img full--poster" />\n                </div>\n            </div>\n\n            <div class="full-start-new__right">\n                <div class="applecation__left">\n                    <div class="applecation__logo"></div>\n                    \n                    <div class="applecation__content-wrapper">\n                        <div class="full-start-new__title" style="display: none;">{title}</div>\n                        \n                        <div class="applecation__meta">\n                            <div class="applecation__meta-left">\n                                <span class="applecation__network"></span>\n                                <span class="applecation__meta-text"></span>\n                                <div class="full-start__pg hide"></div>\n                            </div>\n                        </div>\n                        \n                        ${"card"===t?e:""}\n                        \n                        <div class="applecation__description-wrapper">\n                            <div class="applecation__description"></div>\n                        </div>\n                        <div class="applecation__info"></div>\n                    </div>\n                    \n                    \x3c!-- Скрытые оригинальные элементы --\x3e\n                    <div class="full-start-new__head" style="display: none;"></div>\n                    <div class="full-start-new__details" style="display: none;"></div>\n\n                    <div class="full-start-new__buttons">\n                        <div class="full-start__button selector button--play">\n                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>\n                                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>\n                            </svg>\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--book">\n                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>\n                            </svg>\n                            <span>#{settings_input_links}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--reaction">\n                            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3164 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/>\n                                <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/>\n                            </svg>\n                            <span>#{title_reactions}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--subscribe hide">\n                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>\n                                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>\n                            </svg>\n                            <span>#{title_subscribe}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--options">\n                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>\n                                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>\n                                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>\n                            </svg>\n                        </div>\n                    </div>\n                </div>\n\n                <div class="applecation__right">\n                    <div class="full-start-new__reactions selector">\n                        <div>#{reactions_none}</div>\n                    </div>\n                    \n                    ${"corner"===t?e:""}\n\n                    \x3c!-- Скрытый элемент для совместимости (предотвращает выход реакций за экран) --\x3e\n                    <div class="full-start-new__rate-line">\n                        <div class="full-start__status hide"></div>\n                    </div>\n                    \n                    \x3c!-- Пустой маркер для предотвращения вставки элементов от modss.js --\x3e\n                    <div class="rating--modss" style="display: none;"></div>\n                </div>\n            </div>\n        </div>\n\n        <div class="hide buttons--container">\n            <div class="full-start__button view--torrent hide">\n                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50px" height="50px">\n                    <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/>\n                </svg>\n                <span>#{full_torrents}</span>\n            </div>\n\n            <div class="full-start__button selector view--trailer">\n                <svg height="70" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg">\n                    <path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"></path>\n                </svg>\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>`;Lampa.Template.add("full_start_new",n);Lampa.Template.add("full_episode",'<div class="full-episode selector layer--visible">\n            <div class="full-episode__img">\n                <img />\n                <div class="full-episode__time">{time}</div>\n            </div>\n\n            <div class="full-episode__body">\n                <div class="full-episode__num">#{full_episode} {num}</div>\n                <div class="full-episode__name">{name}</div>\n                <div class="full-episode__overview">{overview}</div>\n                <div class="full-episode__date">{date}</div>\n            </div>\n        </div>')}function w(t,e){const n=t.render().find(".applecation__meta-text"),a=[];if(a.push(function(t){const e=Lampa.Storage.get("language","ru"),n=!!t.name,a={ru:n?"Сериал":"Фильм",en:n?"TV Series":"Movie",uk:n?"Серіал":"Фільм",be:n?"Серыял":"Фільм",bg:n?"Сериал":"Филм",cs:n?"Seriál":"Film",he:n?"סדרה":"סרט",pt:n?"Série":"Filme",zh:n?"电视剧":"电影"};return a[e]||a.en}(e)),e.genres&&e.genres.length){const t=e.genres.slice(0,2).map(t=>Lampa.Utils.capitalizeFirstLetter(t.name));a.push(...t)}n.html(a.join(" · ")),function(t,e){const n=t.render().find(".applecation__network");if(e.networks&&e.networks.length){const t=e.networks[0];if(t.logo_path){const e=Lampa.Api.img(t.logo_path,"w200");return void n.html(`<img src="${e}" alt="${t.name}">`)}}if(e.production_companies&&e.production_companies.length){const t=e.production_companies[0];if(t.logo_path){const e=Lampa.Api.img(t.logo_path,"w200");return void n.html(`<img src="${e}" alt="${t.name}">`)}}n.remove()}(t,e)}function x(t,e){const n=t.render().find(".applecation__description"),a=t.render().find(".applecation__description-wrapper"),i=e.overview||"",o=Lampa.Storage.get("applecation_description_overlay",!0);n.text(i),o?(!function(t,e){const n=e.overview||"",a=e.title||e.name;if(!n)return;$(".applecation-description-overlay").remove();const i=(e.release_date||e.first_air_date||"")+"",o=i.length>3?Lampa.Utils.parseTime(i).full:i.length>0?i:Lampa.Lang.translate("player_unknown"),l="$ "+Lampa.Utils.numberWithSpaces(e.budget||0),r=(c=e,c.production_countries?c.production_countries.map(t=>{const e="country_"+t.iso_3166_1.toLowerCase(),n=Lampa.Lang.translate(e);return n!==e?n:t.name}):[]),s=r.join(", "),p=$(Lampa.Template.get("applecation_overlay",{title:a,text:n,relise:o,budget:l,countries:s}));var c;e.budget&&0!==e.budget||p.find(".applecation--budget").remove();s||p.find(".applecation--countries").remove();$("body").append(p),p.data("controller-created",!1)}(0,e),a.off("hover:enter").on("hover:enter",function(){!function(){const t=$(".applecation-description-overlay");if(!t.length)return;if(setTimeout(()=>t.addClass("show"),10),!t.data("controller-created")){const e={toggle:function(){Lampa.Controller.collectionSet(t),Lampa.Controller.collectionFocus(t.find(".applecation-description-overlay__content"),t)},back:function(){!function(){const t=$(".applecation-description-overlay");if(!t.length)return;t.removeClass("show"),setTimeout(()=>{Lampa.Controller.toggle("content")},300)}()}};Lampa.Controller.add("applecation_description",e),t.data("controller-created",!0)}Lampa.Controller.toggle("applecation_description")}()})):(a.off("hover:enter"),$(".applecation-description-overlay").remove())}function L(t,e){const n=t.render().find(".applecation__info"),a=[],i=e.release_date||e.first_air_date||"";if(i){const t=i.split("-")[0];a.push(t)}if(e.name){if(e.episode_run_time&&e.episode_run_time.length){const t=e.episode_run_time[0],n=Lampa.Lang.translate("time_m").replace(".","");a.push(`${t} ${n}`)}const t=Lampa.Utils.countSeasons(e);if(t&&a.push(function(t){const e=Lampa.Storage.get("language","ru");if(["ru","uk","be","bg"].includes(e)){const n=[2,0,1,1,1,2],a={ru:["сезон","сезона","сезонов"],uk:["сезон","сезони","сезонів"],be:["сезон","сезоны","сезонаў"],bg:["сезон","сезона","сезона"]};return`${t} ${(a[e]||a.ru)[t%100>4&&t%100<20?2:n[Math.min(t%10,5)]]}`}if("en"===e)return 1===t?`${t} Season`:`${t} Seasons`;if("cs"===e)return 1===t||t>=2&&t<=4?`${t} série`:`${t} sérií`;if("pt"===e)return 1===t?`${t} Temporada`:`${t} Temporadas`;if("he"===e)return 1===t?`עונה ${t}`:`${t} עונות`;if("zh"===e)return`${t} 季`;const n=Lampa.Lang.translate("full_season");return 1===t?`${t} ${n}`:`${t} ${n}s`}(t)),Lampa.Storage.get("applecation_show_episode_count",!1)){const t=e.number_of_episodes;t&&a.push(function(t){const e=Lampa.Storage.get("language","ru");if(["ru","uk","be","bg"].includes(e)){const n=[2,0,1,1,1,2],a={ru:["серия","серии","серий"],uk:["серія","серії","серій"],be:["серыя","серыі","серый"],bg:["епизод","епизода","епизода"]};return`${t} ${(a[e]||a.ru)[t%100>4&&t%100<20?2:n[Math.min(t%10,5)]]}`}if("en"===e)return 1===t?`${t} Episode`:`${t} Episodes`;if("cs"===e)return 1===t?`${t} epizoda`:t>=2&&t<=4?`${t} epizody`:`${t} epizod`;if("pt"===e)return 1===t?`${t} Episódio`:`${t} Episódios`;if("he"===e)return 1===t?`פרק ${t}`:`${t} פרקים`;if("zh"===e)return`${t} 集`;const n=Lampa.Lang.translate("full_episode");return 1===t?`${t} ${n}`:`${t} ${n}s`}(t))}}else if(e.runtime&&e.runtime>0){const t=Math.floor(e.runtime/60),n=e.runtime%60,i=Lampa.Lang.translate("time_h").replace(".",""),o=Lampa.Lang.translate("time_m").replace(".",""),l=t>0?`${t} ${i} ${n} ${o}`:`${n} ${o}`;a.push(l)}const o=a.length>0?a.join(" · "):"";n.html(o+'<span class="applecation__quality-badges"></span>')}function k(t){const e=activity.render().find(".applecation__quality-badges");if(!e.length)return;const n=[];if(qualityInfo.quality){let t="";"4K"===qualityInfo.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM113 20.9092L74.1367 82.1367V97.6367H118.818V114H137.637V97.6367H149.182V81.8633H137.637V20.9092H113ZM162.841 20.9092V114H182.522V87.5459L192.204 75.7275L217.704 114H241.25L206.296 62.5908L240.841 20.9092H217.25L183.75 61.9541H182.522V20.9092H162.841ZM119.182 81.8633H93.9541V81.1367L118.454 42.3633H119.182V81.8633Z" fill="white"/></svg>':"2K"===qualityInfo.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM110.608 19.6367C104.124 19.6367 98.3955 20.8638 93.4258 23.3184C88.4563 25.7729 84.5925 29.2428 81.835 33.7275C79.0775 38.2123 77.6992 43.5001 77.6992 49.5908H96.3809C96.3809 46.6212 96.9569 44.0607 98.1084 41.9092C99.2599 39.7578 100.896 38.1056 103.017 36.9541C105.138 35.8026 107.623 35.2275 110.472 35.2275C113.199 35.2276 115.639 35.7724 117.79 36.8633C119.941 37.9238 121.638 39.4542 122.881 41.4541C124.123 43.4238 124.744 45.7727 124.744 48.5C124.744 50.9545 124.244 53.2421 123.244 55.3633C122.244 57.4542 120.774 59.5906 118.835 61.7725C116.926 63.9543 114.562 66.4094 111.744 69.1367L78.6084 99.8184V114H144.972V97.9092H105.881V97.2725L119.472 83.9541C125.865 78.1361 130.82 73.1514 134.335 69C137.85 64.8182 140.29 61.0151 141.653 57.5908C143.047 54.1666 143.744 50.6968 143.744 47.1816C143.744 41.8182 142.366 37.0606 139.608 32.9092C136.851 28.7577 132.986 25.515 128.017 23.1816C123.077 20.8182 117.275 19.6368 110.608 19.6367ZM159.778 20.9092V114H179.46V87.5459L189.142 75.7275L214.642 114H238.188L203.233 62.5908L237.778 20.9092H214.188L180.688 61.9541H179.46V20.9092H159.778Z" fill="white"/></svg>':"FULL HD"===qualityInfo.quality?t='<svg viewBox="331 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M622 0C633.046 3.57563e-06 642 8.95431 642 20V114C642 125.046 633.046 134 622 134H351C339.954 134 331 125.046 331 114V20C331 8.95431 339.954 0 351 0H622ZM362.341 20.9092V114H382.022V75.5459H419.887V59.3184H382.022V37.1367H423.978V20.9092H362.341ZM437.216 20.9092V114H456.897V75.5459H496.853V114H516.488V20.9092H496.853V59.3184H456.897V20.9092H437.216ZM532.716 20.9092V114H565.716C575.17 114 583.291 112.136 590.079 108.409C596.897 104.682 602.125 99.333 605.762 92.3633C609.428 85.3937 611.262 77.0601 611.262 67.3633C611.262 57.6968 609.428 49.3934 605.762 42.4541C602.125 35.5149 596.928 30.1969 590.171 26.5C583.413 22.7727 575.352 20.9092 565.988 20.9092H532.716ZM564.943 37.7725C570.761 37.7725 575.655 38.8027 579.625 40.8633C583.595 42.9239 586.579 46.1364 588.579 50.5C590.609 54.8636 591.625 60.4847 591.625 67.3633C591.625 74.3026 590.609 79.9694 588.579 84.3633C586.579 88.7269 583.579 91.955 579.579 94.0459C575.609 96.1063 570.715 97.1367 564.897 97.1367H552.397V37.7725H564.943Z" fill="white"/></svg>':"HD"===qualityInfo.quality&&(t='<svg viewBox="662 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M953 0C964.046 3.57563e-06 973 8.95431 973 20V114C973 125.046 964.046 134 953 134H682C670.954 134 662 125.046 662 114V20C662 8.95431 670.954 0 682 0H953ZM731.278 20.9092V114H750.96V75.5459H790.915V114H810.551V20.9092H790.915V59.3184H750.96V20.9092H731.278ZM826.778 20.9092V114H859.778C869.233 114 877.354 112.136 884.142 108.409C890.96 104.682 896.188 99.333 899.824 92.3633C903.491 85.3937 905.324 77.0601 905.324 67.3633C905.324 57.6968 903.491 49.3934 899.824 42.4541C896.188 35.5149 890.991 30.1969 884.233 26.5C877.476 22.7727 869.414 20.9092 860.051 20.9092H826.778ZM859.006 37.7725C864.824 37.7725 869.718 38.8027 873.688 40.8633C877.657 42.9239 880.642 46.1364 882.642 50.5C884.672 54.8636 885.687 60.4847 885.688 67.3633C885.688 74.3026 884.672 79.9694 882.642 84.3633C880.642 88.7269 877.642 91.955 873.642 94.0459C869.672 96.1063 864.778 97.1367 858.96 97.1367H846.46V37.7725H859.006Z" fill="white"/></svg>'),t&&n.push(`<div class="quality-badge quality-badge--res">${t}</div>`)}if(qualityInfo.dv&&n.push('<div class="quality-badge quality-badge--dv"><svg viewBox="0 0 1051 393" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,393) scale(0.1,-0.1)" fill="currentColor"><path d="M50 2905 l0 -1017 223 5 c146 4 244 11 287 21 361 85 638 334 753 677 39 116 50 211 44 366 -7 200 -52 340 -163 511 -130 199 -329 344 -574 419 -79 24 -102 26 -327 31 l-243 4 0 -1017z"/><path d="M2436 3904 c-443 -95 -762 -453 -806 -905 -30 -308 86 -611 320 -832 104 -99 212 -165 345 -213 133 -47 253 -64 468 -64 l177 0 0 1015 0 1015 -217 -1 c-152 0 -239 -5 -287 -15z"/><path d="M3552 2908 l3 -1013 425 0 c309 0 443 4 490 13 213 43 407 148 550 299 119 124 194 255 247 428 25 84 27 103 27 270 1 158 -2 189 -22 259 -72 251 -221 458 -424 590 -97 63 -170 97 -288 134 l-85 26 -463 4 -462 3 2 -1013z m825 701 c165 -22 283 -81 404 -199 227 -223 279 -550 133 -831 -70 -133 -176 -234 -319 -304 -132 -65 -197 -75 -490 -75 l-245 0 0 703 c0 387 3 707 7 710 11 11 425 8 510 -4z"/><path d="M7070 2905 l0 -1015 155 0 155 0 0 1015 0 1015 -155 0 -155 0 0 -1015z"/><path d="M7640 2905 l0 -1015 150 0 150 0 0 60 c0 33 2 60 5 60 2 0 33 -15 67 -34 202 -110 433 -113 648 -9 79 38 108 59 180 132 72 71 95 102 134 181 102 207 102 414 1 625 -120 251 -394 411 -670 391 -115 -8 -225 -42 -307 -93 -21 -13 -42 -23 -48 -23 -7 0 -10 125 -10 370 l0 370 -150 0 -150 0 0 -1015z m832 95 c219 -67 348 -310 280 -527 -62 -198 -268 -328 -466 -295 -96 15 -168 52 -235 119 -131 132 -164 311 -87 478 27 60 101 145 158 181 100 63 234 80 350 44z"/><path d="M6035 3286 c-253 -49 -460 -232 -542 -481 -23 -70 -26 -96 -26 -210 0 -114 3 -140 26 -210 37 -113 90 -198 177 -286 84 -85 170 -138 288 -177 67 -22 94 -26 207 -26 113 0 140 4 207 26 119 39 204 92 288 177 87 89 140 174 177 286 22 67 26 99 27 200 1 137 -14 207 -69 320 -134 277 -457 440 -760 381z m252 -284 c117 -37 206 -114 260 -229 121 -253 -38 -548 -321 -595 -258 -43 -503 183 -483 447 20 271 287 457 544 377z"/><path d="M9059 3258 c10 -24 138 -312 285 -642 l266 -598 -72 -162 c-39 -88 -78 -171 -86 -183 -37 -58 -132 -80 -208 -48 l-35 14 -18 -42 c-10 -23 -37 -84 -60 -135 -23 -52 -39 -97 -36 -102 3 -4 40 -23 83 -41 70 -31 86 -34 177 -34 93 0 105 2 167 33 76 37 149 104 180 166 29 57 799 1777 805 1799 5 16 -6 17 -161 15 l-167 -3 -185 -415 c-102 -228 -192 -431 -200 -450 l-15 -35 -201 453 -201 452 -168 0 -168 0 18 -42z"/><path d="M2650 968 c0 -2 81 -211 179 -463 l179 -460 59 -3 59 -3 178 453 c98 249 180 459 183 466 4 9 -13 12 -65 12 -47 0 -71 -4 -74 -12 -3 -7 -65 -176 -138 -375 -73 -200 -136 -363 -139 -363 -3 0 -67 168 -142 373 l-136 372 -72 3 c-39 2 -71 1 -71 0z"/><path d="M3805 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 466 0 465 -60 0 c-39 0 -62 -4 -65 -12z"/><path d="M4580 960 c-97 -16 -178 -72 -211 -145 -23 -50 -24 -143 -3 -193 32 -77 91 -117 244 -167 99 -32 146 -64 166 -112 28 -65 -11 -149 -83 -179 -78 -33 -212 -1 -261 61 l-19 24 -48 -43 -48 -42 43 -37 c121 -103 347 -112 462 -17 54 44 88 120 88 194 -1 130 -79 213 -242 256 -24 7 -71 25 -104 41 -48 22 -66 37 -79 65 -32 67 -5 138 65 174 73 37 193 18 244 -39 l20 -22 43 43 c41 40 42 43 25 61 -27 30 -102 64 -167 76 -64 12 -70 12 -135 1z"/><path d="M5320 505 l0 -465 65 0 65 0 0 465 0 465 -65 0 -65 0 0 -465z"/><path d="M6210 960 c-147 -25 -264 -114 -328 -249 -32 -65 -36 -84 -40 -175 -7 -161 33 -271 135 -367 140 -132 360 -164 541 -77 227 108 316 395 198 634 -88 177 -290 271 -506 234z m232 -132 c100 -46 165 -136 188 -261 20 -106 -18 -237 -88 -310 -101 -105 -245 -132 -377 -73 -74 33 -120 79 -157 154 -31 62 -33 74 -33 167 0 87 4 107 26 155 64 137 173 204 320 196 43 -2 85 -12 121 -28z"/><path d="M7135 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 376 c0 207 3 374 8 371 4 -2 115 -171 247 -375 l240 -371 78 0 77 0 0 465 0 465 -60 0 -60 0 -2 -372 -3 -372 -241 370 -241 369 -82 3 c-59 2 -83 -1 -86 -10z"/></g></svg></div>'),qualityInfo.hdr&&qualityInfo.hdr_type&&n.push('<div class="quality-badge quality-badge--hdr"><svg viewBox="-1 178 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="181.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M27.2784 293V199.909H46.9602V238.318H86.9148V199.909H106.551V293H86.9148V254.545H46.9602V293H27.2784ZM155.778 293H122.778V199.909H156.051C165.415 199.909 173.475 201.773 180.233 205.5C186.991 209.197 192.188 214.515 195.824 221.455C199.491 228.394 201.324 236.697 201.324 246.364C201.324 256.061 199.491 264.394 195.824 271.364C192.188 278.333 186.96 283.682 180.142 287.409C173.354 291.136 165.233 293 155.778 293ZM142.46 276.136H154.96C160.778 276.136 165.672 275.106 169.642 273.045C173.642 270.955 176.642 267.727 178.642 263.364C180.672 258.97 181.688 253.303 181.688 246.364C181.688 239.485 180.672 233.864 178.642 229.5C176.642 225.136 173.657 221.924 169.688 219.864C165.718 217.803 160.824 216.773 155.006 216.773H142.46V276.136ZM215.903 293V199.909H252.631C259.661 199.909 265.661 201.167 270.631 203.682C275.631 206.167 279.434 209.697 282.04 214.273C284.676 218.818 285.994 224.167 285.994 230.318C285.994 236.5 284.661 241.818 281.994 246.273C279.328 250.697 275.464 254.091 270.403 256.455C265.373 258.818 259.282 260 252.131 260H227.54V244.182H248.949C252.706 244.182 255.828 243.667 258.312 242.636C260.797 241.606 262.646 240.061 263.858 238C265.1 235.939 265.722 233.379 265.722 230.318C265.722 227.227 265.1 224.621 263.858 222.5C262.646 220.379 260.782 218.773 258.267 217.682C255.782 216.561 252.646 216 248.858 216H235.585V293H215.903ZM266.176 250.636L289.312 293H267.585L244.949 250.636H266.176Z" fill="currentColor"/></svg></div>'),qualityInfo.sound){let t="";"7.1"===qualityInfo.sound?t='<svg viewBox="-1 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M91.6023 483L130.193 406.636V406H85.2386V389.909H150.557V406.227L111.92 483H91.6023ZM159.545 484.182C156.545 484.182 153.97 483.121 151.818 481C149.697 478.848 148.636 476.273 148.636 473.273C148.636 470.303 149.697 467.758 151.818 465.636C153.97 463.515 156.545 462.455 159.545 462.455C162.455 462.455 165 463.515 167.182 465.636C169.364 467.758 170.455 470.303 170.455 473.273C170.455 475.273 169.939 477.106 168.909 478.773C167.909 480.409 166.591 481.727 164.955 482.727C163.318 483.697 161.515 484.182 159.545 484.182ZM215.045 389.909V483H195.364V408.591H194.818L173.5 421.955V404.5L196.545 389.909H215.045Z" fill="currentColor"/></svg>':"5.1"===qualityInfo.sound?t='<svg viewBox="330 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="333.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M443.733 484.273C437.309 484.273 431.581 483.091 426.551 480.727C421.551 478.364 417.581 475.106 414.642 470.955C411.703 466.803 410.172 462.045 410.051 456.682H429.142C429.354 460.288 430.869 463.212 433.688 465.455C436.506 467.697 439.854 468.818 443.733 468.818C446.824 468.818 449.551 468.136 451.915 466.773C454.309 465.379 456.172 463.455 457.506 461C458.869 458.515 459.551 455.667 459.551 452.455C459.551 449.182 458.854 446.303 457.46 443.818C456.097 441.333 454.203 439.394 451.778 438C449.354 436.606 446.581 435.894 443.46 435.864C440.733 435.864 438.081 436.424 435.506 437.545C432.96 438.667 430.975 440.197 429.551 442.136L412.051 439L416.46 389.909H473.369V406H432.688L430.278 429.318H430.824C432.46 427.015 434.93 425.106 438.233 423.591C441.536 422.076 445.233 421.318 449.324 421.318C454.93 421.318 459.93 422.636 464.324 425.273C468.718 427.909 472.188 431.53 474.733 436.136C477.278 440.712 478.536 445.985 478.506 451.955C478.536 458.227 477.081 463.803 474.142 468.682C471.233 473.53 467.157 477.348 461.915 480.136C456.703 482.894 450.642 484.273 443.733 484.273ZM500.733 484.182C497.733 484.182 495.157 483.121 493.006 481C490.884 478.848 489.824 476.273 489.824 473.273C489.824 470.303 490.884 467.758 493.006 465.636C495.157 463.515 497.733 462.455 500.733 462.455C503.642 462.455 506.188 463.515 508.369 465.636C510.551 467.758 511.642 470.303 511.642 473.273C511.642 475.273 511.127 477.106 510.097 478.773C509.097 480.409 507.778 481.727 506.142 482.727C504.506 483.697 502.703 484.182 500.733 484.182ZM556.233 389.909V483H536.551V408.591H536.006L514.688 421.955V404.5L537.733 389.909H556.233Z" fill="currentColor"/></svg>':"2.0"===qualityInfo.sound&&(t='<svg viewBox="661 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="664.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M722.983 483V468.818L756.119 438.136C758.938 435.409 761.301 432.955 763.21 430.773C765.15 428.591 766.619 426.455 767.619 424.364C768.619 422.242 769.119 419.955 769.119 417.5C769.119 414.773 768.498 412.424 767.256 410.455C766.013 408.455 764.316 406.924 762.165 405.864C760.013 404.773 757.574 404.227 754.847 404.227C751.998 404.227 749.513 404.803 747.392 405.955C745.271 407.106 743.634 408.758 742.483 410.909C741.331 413.061 740.756 415.621 740.756 418.591H722.074C722.074 412.5 723.453 407.212 726.21 402.727C728.968 398.242 732.831 394.773 737.801 392.318C742.771 389.864 748.498 388.636 754.983 388.636C761.65 388.636 767.453 389.818 772.392 392.182C777.362 394.515 781.225 397.758 783.983 401.909C786.741 406.061 788.119 410.818 788.119 416.182C788.119 419.697 787.422 423.167 786.028 426.591C784.665 430.015 782.225 433.818 778.71 438C775.195 442.152 770.241 447.136 763.847 452.955L750.256 466.273V466.909H789.347V483H722.983ZM815.108 484.182C812.108 484.182 809.532 483.121 807.381 481C805.259 478.848 804.199 476.273 804.199 473.273C804.199 470.303 805.259 467.758 807.381 465.636C809.532 463.515 812.108 462.455 815.108 462.455C818.017 462.455 820.563 463.515 822.744 465.636C824.926 467.758 826.017 470.303 826.017 473.273C826.017 475.273 825.502 477.106 824.472 478.773C823.472 480.409 822.153 481.727 820.517 482.727C818.881 483.697 817.078 484.182 815.108 484.182ZM874.483 485.045C866.665 485.015 859.938 483.091 854.301 479.273C848.695 475.455 844.377 469.924 841.347 462.682C838.347 455.439 836.862 446.727 836.892 436.545C836.892 426.394 838.392 417.742 841.392 410.591C844.422 403.439 848.741 398 854.347 394.273C859.983 390.515 866.695 388.636 874.483 388.636C882.271 388.636 888.968 390.515 894.574 394.273C900.21 398.03 904.544 403.485 907.574 410.636C910.604 417.758 912.104 426.394 912.074 436.545C912.074 446.758 910.559 455.485 907.528 462.727C904.528 469.97 900.225 475.5 894.619 479.318C889.013 483.136 882.301 485.045 874.483 485.045ZM874.483 468.727C879.816 468.727 884.074 466.045 887.256 460.682C890.438 455.318 892.013 447.273 891.983 436.545C891.983 429.485 891.256 423.606 889.801 418.909C888.377 414.212 886.347 410.682 883.71 408.318C881.104 405.955 878.028 404.773 874.483 404.773C869.18 404.773 864.938 407.424 861.756 412.727C858.574 418.03 856.968 425.97 856.938 436.545C856.938 443.697 857.65 449.667 859.074 454.455C860.528 459.212 862.574 462.788 865.21 465.182C867.847 467.545 870.938 468.727 874.483 468.727Z" fill="currentColor"/></svg>'),t&&n.push(`<div class="quality-badge quality-badge--sound">${t}</div>`)}qualityInfo.dub&&n.push('<div class="quality-badge quality-badge--dub"><svg viewBox="-1 558 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="561.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M60.5284 673H27.5284V579.909H60.8011C70.1648 579.909 78.2254 581.773 84.983 585.5C91.7405 589.197 96.9375 594.515 100.574 601.455C104.241 608.394 106.074 616.697 106.074 626.364C106.074 636.061 104.241 644.394 100.574 651.364C96.9375 658.333 91.7102 663.682 84.892 667.409C78.1042 671.136 69.983 673 60.5284 673ZM47.2102 656.136H59.7102C65.5284 656.136 70.4223 655.106 74.392 653.045C78.392 650.955 81.392 647.727 83.392 643.364C85.4223 638.97 86.4375 633.303 86.4375 626.364C86.4375 619.485 85.4223 613.864 83.392 609.5C81.392 605.136 78.4072 601.924 74.4375 599.864C70.4678 597.803 65.5739 596.773 59.7557 596.773H47.2102V656.136ZM178.153 579.909H197.835V640.364C197.835 647.152 196.214 653.091 192.972 658.182C189.759 663.273 185.259 667.242 179.472 670.091C173.684 672.909 166.941 674.318 159.244 674.318C151.517 674.318 144.759 672.909 138.972 670.091C133.184 667.242 128.684 663.273 125.472 658.182C122.259 653.091 120.653 647.152 120.653 640.364V579.909H140.335V638.682C140.335 642.227 141.108 645.379 142.653 648.136C144.229 650.894 146.441 653.061 149.29 654.636C152.138 656.212 155.456 657 159.244 657C163.063 657 166.381 656.212 169.199 654.636C172.047 653.061 174.244 650.894 175.79 648.136C177.366 645.379 178.153 642.227 178.153 638.682V579.909ZM214.028 673V579.909H251.301C258.15 579.909 263.862 580.924 268.438 582.955C273.013 584.985 276.453 587.803 278.756 591.409C281.059 594.985 282.21 599.106 282.21 603.773C282.21 607.409 281.483 610.606 280.028 613.364C278.574 616.091 276.574 618.333 274.028 620.091C271.513 621.818 268.634 623.045 265.392 623.773V624.682C268.938 624.833 272.256 625.833 275.347 627.682C278.468 629.53 280.998 632.121 282.938 635.455C284.877 638.758 285.847 642.697 285.847 647.273C285.847 652.212 284.619 656.621 282.165 660.5C279.741 664.348 276.15 667.394 271.392 669.636C266.634 671.879 260.771 673 253.801 673H214.028ZM233.71 656.909H249.756C255.241 656.909 259.241 655.864 261.756 653.773C264.271 651.652 265.528 648.833 265.528 645.318C265.528 642.742 264.907 640.47 263.665 638.5C262.422 636.53 260.65 634.985 258.347 633.864C256.074 632.742 253.362 632.182 250.21 632.182H233.71V656.909ZM233.71 618.864H248.301C250.998 618.864 253.392 618.394 255.483 617.455C257.604 616.485 259.271 615.121 260.483 613.364C261.725 611.606 262.347 609.5 262.347 607.045C262.347 603.682 261.15 600.97 258.756 598.909C256.392 596.848 253.028 595.818 248.665 595.818H233.71V618.864Z" fill="currentColor"/></svg></div>'),n.length>0&&(e.html(n.join("")),e.addClass("show"))}function k(t){const e=t.data.movie,n=t.object.activity;if(!e||!n)return;w(n,e),x(n,e),L(n,e),z(n,()=>{if(!m(n))return;n.render().find(".applecation__meta").addClass("show");const t=Lampa.Storage.get("applecation_description_overlay",!0),e=n.render().find(".applecation__description-wrapper").addClass("show");t&&(e.addClass("selector"),window.Lampa&&Lampa.Controller&&Lampa.Controller.collectionAppend(e)),n.render().find(".applecation__info").addClass("show"),n.render().find(".applecation__ratings").addClass("show")});const a=n.render().find(".applecation__logo"),i=n.render().find(".full-start-new__title"),o=t=>{const e={w200:"w300",w300:"w500",w500:"original"}[Lampa.Storage.field("poster_size")]||"w500",i=Lampa.TMDB.image(`/t/p/${e}${t}`),o=new Image;o.onload=()=>{m(n)&&(a.html(`<img src="${i}" alt="" />`),z(n,()=>{m(n)&&a.addClass("loaded")}),function(t){const e=$(".applecation-description-overlay");if(e.length&&t){const n=$("<img>").attr("src",t);e.find(".applecation-description-overlay__logo").html(n).css("display","block"),e.find(".applecation-description-overlay__title").css("display","none")}}(i))},o.src=i};if(e.images&&e.images.logos&&e.images.logos.length>0){const t=Lampa.Storage.field("tmdb_lang")||Lampa.Storage.get("language")||"ru";let n=e.images.logos.find(e=>e.iso_639_1===t);if(!n&&Lampa.Storage.get("applecation_show_foreign_logo",!0)&&(n=e.images.logos.find(t=>"en"===t.iso_639_1),n||(n=e.images.logos.find(t=>!t.iso_639_1)),n||(n=e.images.logos[0])),n&&n.file_path)return o(n.file_path)}const l=e.name?"tv":"movie",r=Lampa.TMDB.api(`${l}/${e.id}/images?api_key=${Lampa.TMDB.key()}&language=${Lampa.Storage.get("language")}`);$.get(r,t=>{if(m(n)){if(t.logos&&t.logos.length>0){const e=Lampa.Storage.field("tmdb_lang")||Lampa.Storage.get("language")||"ru";let n=t.logos.find(t=>t.iso_639_1===e);if(!n&&Lampa.Storage.get("applecation_show_foreign_logo",!0)&&(n=t.logos.find(t=>"en"===t.iso_639_1)||t.logos.find(t=>!t.iso_639_1)||t.logos[0]),n&&n.file_path)return o(n.file_path)}i.show(),z(n,()=>{a.addClass("loaded")})}}).fail(()=>{i.show(),z(n,()=>{a.addClass("loaded")})})}function z(t,e){const n=t.render().find(".full-start__background:not(.applecation__overlay)");if(!n.length)return void e();if(n.hasClass("loaded")&&n.hasClass("applecation-animated"))return void e();if(n.hasClass("loaded"))return void setTimeout(()=>{n.addClass("applecation-animated"),e()},350);const a=setInterval(()=>{m(t)?n.hasClass("loaded")&&(clearInterval(a),setTimeout(()=>{m(t)&&(n.addClass("applecation-animated"),e())},650)):clearInterval(a)},50);setTimeout(()=>{clearInterval(a),n.hasClass("applecation-animated")||(n.addClass("applecation-animated"),e())},2e3)}var M={type:"other",version:t,name:"Applecation",description:"Делает интерфейс в карточке фильма похожим на Apple TV и оптимизирует под 4K",author:"@darkestclouds",icon:e};Lampa.Manifest&&Lampa.Manifest.plugins&&(Lampa.Manifest.plugins=M),window.appready?_():Lampa.Listener.follow("app",t=>{"ready"===t.type&&_()})}();
})();
