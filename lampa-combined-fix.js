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
        'body.' + BODY_CLASS + ' .navigation-bar { position: fixed !important; left: 50% !important; bottom: .8em !important; transform: translateX(-50%) !important; z-index: 10 !important; width: 100% !important; max-width: calc(100vw - 2em) !important; font-size: 1.15em !important; padding: 0 1.2em .7em 1.2em !important; }',
        'body.' + BODY_CLASS + '.orientation--landscape .navigation-bar { width: auto !important; left: auto !important; transform: translateX(0) !important; height: 85% !important; top: 15% !important; }',
        'body.' + BODY_CLASS + ' .navigation-bar__body { width: 100% !important; height: 2.8em !important; box-sizing: border-box !important; display: flex !important; align-items: center !important; justify-content: space-around !important; padding: .18em .32em !important; border-radius: 999px !important; background: rgba(22,24,30,.82) !important; border: 1px solid rgba(255,255,255,.12) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 8px 24px rgba(0,0,0,.28) !important; backdrop-filter: blur(22px) saturate(145%) !important; -webkit-backdrop-filter: blur(22px) saturate(145%) !important; font-size: 1.4em !important; }',
        'body.' + BODY_CLASS + '.orientation--landscape .navigation-bar__body { width: auto !important; height: auto !important; min-width: 3em !important;}',
        'body.' + BODY_CLASS + ' .navigation-bar__item { width: 100% !important; height: 100% !important; appearance: none !important; -webkit-appearance: none !important; border: 0 !important; background: none !important; color: rgba(255,255,255,.88) !important; flex: 1 !important; display: inline-flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; text-align: center !important; padding: 0 !important; border-radius: 999px !important; font-size: 1em !important; font-weight: 700 !important; line-height: 1 !important; white-space: nowrap !important; transition: background .2s ease, transform .2s ease, box-shadow .2s ease, color .2s ease !important; cursor: pointer !important; }',
        'body.' + BODY_CLASS + ' .navigation-bar__icon { width: 1.2em !important; height: 1.2em !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; color: inherit !important; }',
        'body.' + BODY_CLASS + ' .navigation-bar__icon svg { width: 1.2em !important; height: 1.2em !important; stroke-width: 2 !important; }',
        'body.' + BODY_CLASS + ' .navigation-bar__label { display: none !important; }',
        'body.' + BODY_CLASS + ' .navigation-bar__item.is-active, body.' + BODY_CLASS + ' .navigation-bar__item.hover, body.' + BODY_CLASS + ' .navigation-bar__item.focus, body.' + BODY_CLASS + ' .navigation-bar__item:hover, body.' + BODY_CLASS + ' .navigation-bar__item:focus { background: rgba(255,255,255,.16) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.14) !important; color: rgba(255,255,255,.98) !important; transform: translateY(-.04em) !important; }',

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
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .navigation-bar__body,',
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
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .navigation-bar__body { background: rgba(22,24,30,.94) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .settings__content.layer--height { background: rgba(28,30,34,.96) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .selectbox__content.layer--height { background: rgba(26,29,34,.97) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-logo,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-rating,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode .full-episode__num { background: rgba(12,14,20,.88) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card .card__view::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode .full-episode__img::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .full-start-new__poster::after { display: none !important; content: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .nfx-card-overlay,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .navigation-bar__item,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .agnative-topnav-shell__item { transition-duration: .12s !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card.focus .card__view { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.92), 0 6px 14px rgba(0,0,0,.22) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card.hover .card__view { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.60), 0 6px 14px rgba(0,0,0,.18) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode.focus .full-episode__img { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.92), 0 6px 14px rgba(0,0,0,.22) !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="low"] .card-episode.hover .full-episode__img { filter: none !important; box-shadow: 0 0 0 2px rgba(86,141,255,.60), 0 6px 14px rgba(0,0,0,.18) !important; }',

        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card .card__view::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode .full-episode__img::after,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .full-start-new__poster::after { display: none !important; content: none !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .card-episode,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .full-start-new__poster { will-change: auto !important; transform-style: flat !important; }',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .nfx-card-overlay,',
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .navigation-bar__item,',
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
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .navigation-bar__body { background: rgba(22,24,30,.98) !important; box-shadow: 0 4px 10px rgba(0,0,0,.35) !important; }',
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
        'body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .explorer__files .torrent-filter .simple-button.focus, body.' + BODY_CLASS + '[' + PERF_ATTR + '="ultra"] .explorer__files .torrent-filter .simple-button.hover { transform:none !important; box-shadow:none !important; background:rgba(255,255,255,.26) !important; }'
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

      prune(getCacheMaxBytes());
      injectStyle();
      if (document.body) document.body.classList.add(BODY_CLASS);
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
            B + ' .lampa-prisma-detail-logo{position:absolute;top:calc(.85em + 4cm);bottom:auto;left:50%;z-index:12;display:flex!important;align-items:center;justify-content:center;width:78%;min-height:1.5em;margin:0;transform:translateX(-50%);pointer-events:none}',
            B + ' .lampa-prisma-detail-logo img{display:block;width:auto;max-width:100%;max-height:4.2em;object-fit:contain;filter:drop-shadow(0 3px 9px rgba(0,0,0,.78))}',
            B + '.lampa-prisma-detail-logo.is-empty{display:none!important}',
            /* buttons row */
            B + '.full-start-new__buttons{display:flex!important;justify-content:center;align-items:center;gap:.6em;width:100%;margin:.2em 0 0!important;flex-wrap:nowrap}',
            B + '.full-start-new__buttons .full-start__button{border:0!important;border-radius:999px!important;background:#1d1d1f!important;height:3.6em;min-height:3.6em;box-shadow:none!important;transition:transform .2s ease,background .2s ease}',
            B + '.full-start-new__buttons .full-start__button.focus,' + B + '.full-start-new__buttons .full-start__button:hover{background:#333336!important;transform:scale(1.04)}',
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
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { install(); scan(); } });
        Lampa.Listener.follow('full', function (e) {
            window.__lampaFullEvent = e;
            schedule();
            setTimeout(function () { scan(); }, 350);
        });
    }
})();
