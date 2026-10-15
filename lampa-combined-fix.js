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
            'body.lampa-mx-mobile-fix .navigation-bar{padding-bottom:calc(2em + env(safe-area-inset-bottom,0px))!important;} ',
            'body.lampa-mx-mobile-fix .wrap__content{padding-top:calc(4em + env(safe-area-inset-top,0px));} ',
            'body.lampa-mx-mobile-fix .scroll,body.lampa-mx-mobile-fix [class*="short" i]{touch-action:pan-x pan-y!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;} ',
            'body.lampa-mx-mobile-fix .menu__item,body.lampa-mx-mobile-fix .navigation-bar__item,body.lampa-mx-mobile-fix .head__action,body.lampa-mx-mobile-fix .player__button,body.lampa-mx-mobile-fix .button{min-height:44px;touch-action:manipulation;}'
        ].join('');
        document.head.appendChild(style);
        document.documentElement.classList.add('lampa-mx-mobile-fix');
        document.body.classList.add('lampa-mx-mobile-fix');
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
        try {
            if (window.Lampa && Lampa.Menu && typeof Lampa.Menu.close === 'function') {
                Lampa.Menu.close();
                return;
            }
        } catch (error) {}
        var closeButton = document.querySelector('.menu__close,.menu-close,[data-action="menu-close"]');
        if (closeButton && typeof closeButton.click === 'function') closeButton.click();
    }
    function onPointerDown(event) {
        if (event.pointerType && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
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