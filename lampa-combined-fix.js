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
            return Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get(storageKey, 'default') : 'default';
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
    var pluginVersion = '2026-10-13-all-in-one-9';
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
        candidates = candidates.slice(0, 2);
        if (!candidates.length) return Promise.resolve(0);
        var key = candidates.map(normalizeTitle).join('|');
        if (malIdCache.has(key)) return malIdCache.get(key);
        var promise = (async function () {
            var graph = 'query($search:String!){Media(search:$search,type:ANIME){idMal title{romaji english native}}}';
            for (var i = 0; i < candidates.length; i++) {
                var query = candidates[i];
                var controller = new AbortController();
                var timer = setTimeout(function () { controller.abort(); }, 1800);
                try {
                    var response = await fetch('https://graphql.anilist.co', {
                        method: 'POST', signal: controller.signal,
                        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: graph, variables: { search: query } })
                    });
                    if (response.ok) {
                        var payload = await response.json();
                        var media = payload && payload.data && payload.data.Media;
                        var names = media && media.title ? [media.title.romaji, media.title.english, media.title.native] : [];
                        if (media && media.idMal && (names.some(function (name) { return normalizeTitle(name) === normalizeTitle(query); }) || normalizeTitle(query).length > 5)) return Number(media.idMal);
                    }
                } catch (error) {} finally { clearTimeout(timer); }
            }
            for (var j = 0; j < Math.min(1, candidates.length); j++) {
                var jikanController = new AbortController();
                var jikanTimer = setTimeout(function () { jikanController.abort(); }, 1800);
                try {
                    var jikanResponse = await fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(candidates[j]) + '&limit=10', { signal: jikanController.signal, headers: { Accept: 'application/json' } });
                    if (!jikanResponse.ok) continue;
                    var jikanPayload = await jikanResponse.json();
                    var jikanResults = Array.isArray(jikanPayload && jikanPayload.data) ? jikanPayload.data : [];
                    var normalized = normalizeTitle(candidates[j]);
                    var exact = jikanResults.find(function (anime) { return [anime.title, anime.title_english, anime.title_japanese].some(function (name) { return normalizeTitle(name) === normalized; }); });
                    if (exact && exact.mal_id) return Number(exact.mal_id);
                } catch (error) {} finally { clearTimeout(jikanTimer); }
            }
            return 0;
        })();
        malIdCache.set(key, promise);
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
                currentVideo.currentTime = target;
                currentSegment = null;
                syncButton();
                if (!currentVideo.paused && currentVideo.play) currentVideo.play().catch(function () {});
                if (window.Lampa && Lampa.Notice && typeof Lampa.Notice.show === 'function') Lampa.Notice.show('Опенінг пропущено');
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
                    return [];
                }
                var payload = await response.json();
                if (!payload || payload.found !== true || !Array.isArray(payload.results)) {
                    debugLog('[Lampa AniSkip] No segments for this MAL ID / episode:', malId, episode);
                    return [];
                }
                var segments = payload.results.map(function (item) {
                    var interval = item.interval || item;
                    return {
                        start: Number(interval.startTime !== undefined ? interval.startTime : interval.start_time),
                        end: Number(interval.endTime !== undefined ? interval.endTime : interval.end_time),
                        type: String(item.skipType || item.skip_type || '').toLowerCase()
                    };
                }).filter(function (item) {
                    return ['op', 'opening'].indexOf(item.type) !== -1 && Number.isFinite(item.start) && Number.isFinite(item.end) && item.start >= 0 && item.end > item.start;
                });
                debugLog('[Lampa AniSkip] Segments:', malId, episode, segments.length);
                return segments;
            } catch (error) {
                debugLog('[Lampa AniSkip] Request failed:', error && error.name ? error.name : error);
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
            if (pollCount === 60) debugLog('[Lampa AniSkip] Stopped: video, episode or anime title could not be detected');
            if (pollCount < 20) retryTimer = setTimeout(function () { loadForCurrent(token); }, 750);
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
/* Anime4K WebGL core — browser adaptation of mobooru/anime4k.
 * Original project: https://github.com/mobooru/anime4k
 * Upstream Anime4K: https://github.com/bloc97/Anime4K
 * License: MIT
 */
/**
 * A real-time upscaler for anime content using WebGL.
 * Ported from https://github.com/bloc97/Anime4K by https://github.com/mobooru
 * Licensed under the MIT license.
 */
window.Anime4K = {
  gl: {
    createShader: function (gl, type, source) {
      var shader = gl.createShader(type)
      gl.shaderSource(shader, source)

      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader))
      }

      return shader
    },

    createProgram: function (gl, vertexSource, fragmentSource) {
      var program = gl.createProgram()

      var vertexShader = Anime4K.gl.createShader(gl, gl.VERTEX_SHADER, vertexSource)
      var fragmentShader = Anime4K.gl.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)

      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program))
      }

      var wrapper = { program: program }

      var numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
      for (var i = 0; i < numAttributes; i++) {
        var attribute = gl.getActiveAttrib(program, i)
        wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name)
      }
      var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
      for (var i$1 = 0; i$1 < numUniforms; i$1++) {
        var uniform = gl.getActiveUniform(program, i$1)
        wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name)
      }

      return wrapper
    },

    createTexture: function (gl, filter, data, width, height) {
      var texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      if (data instanceof Uint8Array) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data)
      }
      gl.bindTexture(gl.TEXTURE_2D, null)
      return texture
    },

    bindTexture: function (gl, texture, unit) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    },

    updateTexture: function (gl, texture, src) {
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    },

    createBuffer: function (gl, data) {
      var buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      return buffer
    },

    bindAttribute: function (gl, buffer, attribute, numComponents) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(attribute)
      gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0)
    },

    bindFramebuffer: function (gl, framebuffer, texture) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      if (texture) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      }
    }
  },
  shaders: {
    quadVert: `
    precision mediump float;

    attribute vec2 a_pos;
    varying vec2 v_tex_pos;

    void main() {
        v_tex_pos = a_pos;
        gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
    }
    `,
    scaleFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform vec2 u_size;
    varying vec2 v_tex_pos;

    vec4 interp(const vec2 uv) {
        vec2 px = 1.0 / u_size;
        vec2 vc = (floor(uv * u_size)) * px;
        vec2 f = fract(uv * u_size);
        vec4 tl = texture2D(u_texture, vc);
        vec4 tr = texture2D(u_texture, vc + vec2(px.x, 0));
        vec4 bl = texture2D(u_texture, vc + vec2(0, px.y));
        vec4 br = texture2D(u_texture, vc + px);
        return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
    }

    void main() {
        gl_FragColor = interp(1.0 - v_tex_pos);
        //gl_FragColor = texture2D(u_texture, 1.0 - v_tex_pos);
    }
    `,
    lumFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    varying vec2 v_tex_pos;

    float getLum(vec4 rgb) {
        return (rgb.r + rgb.r + rgb.g + rgb.g + rgb.g + rgb.b) / 6.0;
    }

    void main() {
        vec4 rgb = texture2D(u_texture, 1.0 - v_tex_pos);
        float lum = getLum(rgb);
        gl_FragColor = vec4(lum);
    }
    `,
    pushFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureTemp;
    uniform float u_scale;
    uniform float u_bold;
    uniform vec2 u_pt;
    varying vec2 v_tex_pos;

    #define strength (min(u_scale / u_bold, 1.0))

    vec4 HOOKED_tex(vec2 pos) {
        return texture2D(u_texture, pos);
    }

    vec4 POSTKERNEL_tex(vec2 pos) {
        return texture2D(u_textureTemp, pos);
    }

    vec4 getLargest(vec4 cc, vec4 lightestColor, vec4 a, vec4 b, vec4 c) {
        vec4 newColor = cc * (1.0 - strength) + ((a + b + c) / 3.0) * strength;
        if (newColor.a > lightestColor.a) {
            return newColor;
        }
        return lightestColor;
    }

    vec4 getRGBL(vec2 pos) {
        return vec4(HOOKED_tex(pos).rgb, POSTKERNEL_tex(pos).x);
    }

    float min3v(vec4 a, vec4 b, vec4 c) {
        return min(min(a.a, b.a), c.a);
    }
    float max3v(vec4 a, vec4 b, vec4 c) {
        return max(max(a.a, b.a), c.a);
    }

    void main() {
        vec2 HOOKED_pos = v_tex_pos;

        vec2 d = u_pt;

        vec4 cc = getRGBL(HOOKED_pos);
        vec4 t = getRGBL(HOOKED_pos + vec2(0.0, -d.y));
        vec4 tl = getRGBL(HOOKED_pos + vec2(-d.x, -d.y));
        vec4 tr = getRGBL(HOOKED_pos + vec2(d.x, -d.y));

        vec4 l = getRGBL(HOOKED_pos + vec2(-d.x, 0.0));
        vec4 r = getRGBL(HOOKED_pos + vec2(d.x, 0.0));

        vec4 b = getRGBL(HOOKED_pos + vec2(0.0, d.y));
        vec4 bl = getRGBL(HOOKED_pos + vec2(-d.x, d.y));
        vec4 br = getRGBL(HOOKED_pos + vec2(d.x, d.y));

        vec4 lightestColor = cc;

        //Kernel 0 and 4
        float maxDark = max3v(br, b, bl);
        float minLight = min3v(tl, t, tr);

        if (minLight > cc.a && minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, tl, t, tr);
        } else {
            maxDark = max3v(tl, t, tr);
            minLight = min3v(br, b, bl);
            if (minLight > cc.a && minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, br, b, bl);
            }
        }

        //Kernel 1 and 5
        maxDark = max3v(cc, l, b);
        minLight = min3v(r, t, tr);

        if (minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, r, t, tr);
        } else {
            maxDark = max3v(cc, r, t);
            minLight = min3v(bl, l, b);
            if (minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, bl, l, b);
            }
        }

        //Kernel 2 and 6
        maxDark = max3v(l, tl, bl);
        minLight = min3v(r, br, tr);

        if (minLight > cc.a && minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, r, br, tr);
        } else {
            maxDark = max3v(r, br, tr);
            minLight = min3v(l, tl, bl);
            if (minLight > cc.a && minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, l, tl, bl);
            }
        }

        //Kernel 3 and 7
        maxDark = max3v(cc, l, t);
        minLight = min3v(r, br, b);

        if (minLight > maxDark) {
            lightestColor = getLargest(cc, lightestColor, r, br, b);
        } else {
            maxDark = max3v(cc, r, b);
            minLight = min3v(t, l, tl);
            if (minLight > maxDark) {
                lightestColor = getLargest(cc, lightestColor, t, l, tl);
            }
        }

        gl_FragColor = lightestColor;
    }
    `,
    gradFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureTemp;
    uniform vec2 u_pt;
    varying vec2 v_tex_pos;

    vec4 HOOKED_tex(vec2 pos) {
        return texture2D(u_texture, 1.0 - pos);
    }

    vec4 POSTKERNEL_tex(vec2 pos) {
        return texture2D(u_textureTemp, 1.0 - pos);
    }

    vec4 getRGBL(vec2 pos) {
        return vec4(HOOKED_tex(pos).rgb, POSTKERNEL_tex(pos).x);
    }

    void main() {
        vec2 HOOKED_pos = v_tex_pos;

        vec2 d = u_pt;

        //[tl  t tr]
        //[ l cc  r]
        //[bl  b br]
        vec4 cc = getRGBL(HOOKED_pos);
        vec4 t = getRGBL(HOOKED_pos + vec2(0.0, -d.y));
        vec4 tl = getRGBL(HOOKED_pos + vec2(-d.x, -d.y));
        vec4 tr = getRGBL(HOOKED_pos + vec2(d.x, -d.y));

        vec4 l = getRGBL(HOOKED_pos + vec2(-d.x, 0.0));
        vec4 r = getRGBL(HOOKED_pos + vec2(d.x, 0.0));

        vec4 b = getRGBL(HOOKED_pos + vec2(0.0, d.y));
        vec4 bl = getRGBL(HOOKED_pos + vec2(-d.x, d.y));
        vec4 br = getRGBL(HOOKED_pos + vec2(d.x, d.y));

        //Horizontal Gradient
        //[-1  0  1]
        //[-2  0  2]
        //[-1  0  1]
        float xgrad = (-tl.a + tr.a - l.a - l.a + r.a + r.a - bl.a + br.a);

        //Vertical Gradient
        //[-1 -2 -1]
        //[ 0  0  0]
        //[ 1  2  1]
        float ygrad = (-tl.a - t.a - t.a - tr.a + bl.a + b.a + b.a + br.a);

        gl_FragColor = vec4(1.0 - clamp(sqrt(xgrad * xgrad + ygrad * ygrad), 0.0, 1.0));
    }
    `,
    finalFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureTemp;
    uniform vec2 u_pt;
    uniform float u_scale;
    uniform float u_blur;
    varying vec2 v_tex_pos;

    #define strength (min(u_scale / u_blur, 1.0))

    vec4 HOOKED_tex(vec2 pos) {
        return texture2D(u_texture, vec2(pos.x, 1.0 - pos.y));
    }

    vec4 POSTKERNEL_tex(vec2 pos) {
        return texture2D(u_textureTemp, vec2(pos.x, 1.0 - pos.y));
    }

    vec4 getAverage(vec4 cc, vec4 a, vec4 b, vec4 c) {
        return cc * (1.0 - strength) + ((a + b + c) / 3.0) * strength;
    }

    vec4 getRGBL(vec2 pos) {
        return vec4(HOOKED_tex(pos).rgb, POSTKERNEL_tex(pos).x);
    }

    float min3v(vec4 a, vec4 b, vec4 c) {
        return min(min(a.a, b.a), c.a);
    }
    float max3v(vec4 a, vec4 b, vec4 c) {
        return max(max(a.a, b.a), c.a);
    }

    void main() {
        vec2 HOOKED_pos = v_tex_pos;

        vec2 d = u_pt;

        vec4 cc = getRGBL(HOOKED_pos);
        vec4 t = getRGBL(HOOKED_pos + vec2(0.0, -d.y));
        vec4 tl = getRGBL(HOOKED_pos + vec2(-d.x, -d.y));
        vec4 tr = getRGBL(HOOKED_pos + vec2(d.x, -d.y));

        vec4 l = getRGBL(HOOKED_pos + vec2(-d.x, 0.0));
        vec4 r = getRGBL(HOOKED_pos + vec2(d.x, 0.0));

        vec4 b = getRGBL(HOOKED_pos + vec2(0.0, d.y));
        vec4 bl = getRGBL(HOOKED_pos + vec2(-d.x, d.y));
        vec4 br = getRGBL(HOOKED_pos + vec2(d.x, d.y));

        //Kernel 0 and 4
        float maxDark = max3v(br, b, bl);
        float minLight = min3v(tl, t, tr);

        if (minLight > cc.a && minLight > maxDark) {
            gl_FragColor = getAverage(cc, tl, t, tr);
            return;
        } else {
            maxDark = max3v(tl, t, tr);
            minLight = min3v(br, b, bl);
            if (minLight > cc.a && minLight > maxDark) {
                gl_FragColor = getAverage(cc, br, b, bl);
                return;
            }
        }

        //Kernel 1 and 5
        maxDark = max3v(cc, l, b);
        minLight = min3v(r, t, tr);

        if (minLight > maxDark) {
            gl_FragColor = getAverage(cc, r, t, tr);
            return;
        } else {
            maxDark = max3v(cc, r, t);
            minLight = min3v(bl, l, b);
            if (minLight > maxDark) {
                gl_FragColor = getAverage(cc, bl, l, b);
                return;
            }
        }

        //Kernel 2 and 6
        maxDark = max3v(l, tl, bl);
        minLight = min3v(r, br, tr);

        if (minLight > cc.a && minLight > maxDark) {
            gl_FragColor = getAverage(cc, r, br, tr);
            return;
        } else {
            maxDark = max3v(r, br, tr);
            minLight = min3v(l, tl, bl);
            if (minLight > cc.a && minLight > maxDark) {
                gl_FragColor = getAverage(cc, l, tl, bl);
                return;
            }
        }

        //Kernel 3 and 7
        maxDark = max3v(cc, l, t);
        minLight = min3v(r, br, b);

        if (minLight > maxDark) {
            gl_FragColor = getAverage(cc, r, br, b);
            return;
        } else {
            maxDark = max3v(cc, r, b);
            minLight = min3v(t, l, tl);
            if (minLight > maxDark) {
                gl_FragColor = getAverage(cc, t, l, tl);
                return;
            }
        }

        gl_FragColor = cc;
    }
    `,
    drawFrag: `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_textureOrig;
    varying vec2 v_tex_pos;

    void main() {
        vec4 color = texture2D(u_texture, 1.0 - v_tex_pos);
        vec4 colorOrig = texture2D(u_textureOrig, vec2(1.0 - v_tex_pos.x, v_tex_pos.y));
        gl_FragColor = vec4(color.rgb, colorOrig.a);
    }
    `
  },
  /**
   * The scaler constructor.
   * @constructor
   * @param {WegGLRenderingContext} gl - The WebGL context to use.
   */
  Scaler: function (gl) {
    const { createProgram, createTexture, bindTexture, updateTexture, createBuffer, bindAttribute, bindFramebuffer } = Anime4K.gl
    const { quadVert, scaleFrag, lumFrag, pushFrag, gradFrag, finalFrag, drawFrag } = Anime4K.shaders

    function Scaler (gl) {
      this.gl = gl

      this.inputTex = null
      this.inputMov = null
      this.inputWidth = 0
      this.inputHeight = 0

      this.quadBuffer = createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]))
      this.framebuffer = gl.createFramebuffer()

      this.scaleProgram = createProgram(gl, quadVert, scaleFrag)
      this.lumProgram = createProgram(gl, quadVert, lumFrag)
      this.pushProgram = createProgram(gl, quadVert, pushFrag)
      this.gradProgram = createProgram(gl, quadVert, gradFrag)
      this.finalProgram = createProgram(gl, quadVert, finalFrag)
      this.drawProgram = createProgram(gl, quadVert, drawFrag)

      this.tempTexture = null
      this.tempTexture2 = null
      this.tempTexture3 = null

      this.bold = 6.0
      this.blur = 2.0
    }

    Scaler.prototype.inputImage = function (img) {
      const gl = this.gl

      this.inputWidth = img.width
      this.inputHeight = img.height

      this.inputTex = createTexture(gl, gl.LINEAR, img)
      this.inputMov = null
    }

    Scaler.prototype.inputVideo = function (mov) {
      const gl = this.gl

      const width = mov.videoWidth
      const height = mov.videoHeight

      this.inputWidth = width
      this.inputHeight = height

      const emptyPixels = new Uint8Array(width * height * 4)
      this.inputTex = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.inputMov = mov
    }

    Scaler.prototype.setSize = function (scale) {
      const gl = this.gl

      const width = Math.round(this.inputWidth * scale)
      const height = Math.round(this.inputHeight * scale)

      gl.canvas.width = width
      gl.canvas.height = height

      const emptyPixels = new Uint8Array(width * height * 4)
      this.scaleTexture = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.tempTexture = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.tempTexture2 = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
      this.tempTexture3 = createTexture(gl, gl.LINEAR, emptyPixels, width, height)
    }

    Scaler.prototype.render = function () {
      if (!this.inputTex) {
        return
      }

      const gl = this.gl
      const scalePgm = this.scaleProgram
      const lumPgm = this.lumProgram
      const pushPgm = this.pushProgram
      const gradPgm = this.gradProgram
      const finalPgm = this.finalProgram
      const drawPgm = this.drawProgram

      if (this.inputMov) {
        updateTexture(gl, this.inputTex, this.inputMov)
      }

      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.STENCIL_TEST)

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      // First upscaling with Bicubic interpolation.

      bindFramebuffer(gl, this.framebuffer, this.scaleTexture)

      gl.useProgram(scalePgm.program)

      bindAttribute(gl, this.quadBuffer, scalePgm.a_pos, 2)
      bindTexture(gl, this.inputTex, 0)
      gl.uniform1i(scalePgm.u_texture, 0)
      gl.uniform2f(scalePgm.u_size, this.inputWidth, this.inputHeight)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: scaleTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture)

      gl.useProgram(lumPgm.program)

      bindAttribute(gl, this.quadBuffer, lumPgm.a_pos, 2)
      bindTexture(gl, this.scaleTexture, 0)
      gl.uniform1i(lumPgm.u_texture, 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: scaleTexture
      // PostKernel: tempTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture2)

      gl.useProgram(pushPgm.program)

      bindAttribute(gl, this.quadBuffer, pushPgm.a_pos, 2)
      bindTexture(gl, this.scaleTexture, 0)
      bindTexture(gl, this.tempTexture, 1)
      gl.uniform1i(pushPgm.u_texture, 0)
      gl.uniform1i(pushPgm.u_textureTemp, 1)
      gl.uniform1f(pushPgm.u_scale, gl.canvas.width / this.inputWidth)
      gl.uniform2f(pushPgm.u_pt, 1.0 / gl.canvas.width, 1.0 / gl.canvas.height)
      gl.uniform1f(pushPgm.u_bold, this.bold)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture2
      // PostKernel: tempTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture)

      gl.useProgram(lumPgm.program)

      bindAttribute(gl, this.quadBuffer, lumPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture2, 0)
      gl.uniform1i(lumPgm.u_texture, 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture2
      // PostKernel: tempTexture

      bindFramebuffer(gl, this.framebuffer, this.tempTexture3)

      gl.useProgram(gradPgm.program)

      bindAttribute(gl, this.quadBuffer, gradPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture2, 0)
      bindTexture(gl, this.tempTexture, 1)
      gl.uniform1i(gradPgm.u_texture, 0)
      gl.uniform1i(gradPgm.u_textureTemp, 1)
      gl.uniform2f(gradPgm.u_pt, 1.0 / gl.canvas.width, 1.0 / gl.canvas.height)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture2
      // PostKernel: tempTexture3

      bindFramebuffer(gl, this.framebuffer, this.tempTexture)

      gl.useProgram(finalPgm.program)

      bindAttribute(gl, this.quadBuffer, finalPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture2, 0)
      bindTexture(gl, this.tempTexture3, 1)
      gl.uniform1i(finalPgm.u_texture, 0)
      gl.uniform1i(finalPgm.u_textureTemp, 1)
      gl.uniform1f(finalPgm.u_scale, gl.canvas.width / this.inputWidth)
      gl.uniform2f(finalPgm.u_pt, 1.0 / gl.canvas.width, 1.0 / gl.canvas.height)
      gl.uniform1f(finalPgm.u_blur, this.blur)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Scaled: tempTexture
      // PostKernel: tempTexture3

      bindFramebuffer(gl, null)

      gl.useProgram(drawPgm.program)

      bindAttribute(gl, this.quadBuffer, drawPgm.a_pos, 2)
      bindTexture(gl, this.tempTexture, 0)
      bindTexture(gl, this.inputTex, 1)
      gl.uniform1i(drawPgm.u_texture, 0)
      gl.uniform1i(drawPgm.u_textureOrig, 1)

      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    /**
     * Scale and rander.
     * @function
     * @param {number} scale - The scale to render to.
     * @param {Object} options - Optional options to apply.
     * @param {number} options.blur - How much to blur.
     * @param {number} options.bold - Line boldening.
     */
    Scaler.prototype.resize = function (scale, { blur, bold }) {
      if (blur) this.blur = blur
      if (bold) this.bold = bold
      this.setSize(scale)
      this.render()
    }

    return new Scaler(gl)
  }
};
/* Lampa Anime4K WebGL Upscale — real GPU shader processing, with safe fallback */
(function () {
    'use strict';

    var VERSION = '2026-10-15-anime4k-4';
    if (window.LampaAnime4KVersion === VERSION) return;
    window.LampaAnime4KVersion = VERSION;

    var STORAGE_KEY = 'anime4k_enabled';
    var SCALE = 2;
    var video = null;
    var canvas = null;
    var gl = null;
    var scaler = null;
    var frameHandle = 0;
    var running = false;
    var originalOpacity = null;
    var originalOpacityPriority = '';
    var sourceWidth = 0;
    var sourceHeight = 0;
    var menuInstalled = false;
    var onVideoPlay = null;
    var onVideoSeeked = null;
    var onWindowResize = null;
    var parentElement = null;
    var parentPosition = '';
    var parentPositionPriority = '';

    function enabled() {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
                var stored = Lampa.Storage.get(STORAGE_KEY, true);
                return stored !== false && stored !== 'false' && stored !== 0 && stored !== '0';
            }
        } catch (error) {}
        return true;
    }
    function setEnabled(value) {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') Lampa.Storage.set(STORAGE_KEY, !!value);
        } catch (error) {}
    }
    function currentVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') return Lampa.PlayerVideo.video();
        } catch (error) {}
        return document.querySelector('.player-video__video, video');
    }
    function removeCanvas() {
        if (frameHandle) {
            if (video && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(frameHandle);
            else cancelAnimationFrame(frameHandle);
        }
        frameHandle = 0;
        running = false;
        if (video && onVideoPlay) video.removeEventListener('play', onVideoPlay);
        if (video && onVideoSeeked) video.removeEventListener('seeked', onVideoSeeked);
        if (window.removeEventListener && onWindowResize) window.removeEventListener('resize', onWindowResize);
        onVideoPlay = null;
        onVideoSeeked = null;
        onWindowResize = null;
        if (video && originalOpacity !== null) {
            if (originalOpacity) video.style.setProperty('opacity', originalOpacity, originalOpacityPriority);
            else video.style.removeProperty('opacity');
        }
        originalOpacity = null;
        originalOpacityPriority = '';
        if (parentElement) {
            if (parentPosition) parentElement.style.setProperty('position', parentPosition, parentPositionPriority);
            else parentElement.style.removeProperty('position');
        }
        parentElement = null;
        parentPosition = '';
        parentPositionPriority = '';
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        canvas = null;
        scaler = null;
        gl = null;
        video = null;
        sourceWidth = 0;
        sourceHeight = 0;
    }
    function setupCanvas(target) {
        if (!target || !target.videoWidth || !target.videoHeight || !window.Anime4K || typeof window.Anime4K.Scaler !== 'function') return false;
        var parent = target.parentElement;
        if (!parent) return false;
        var context = document.createElement('canvas');
        context.className = 'lampa-anime4k-canvas';
        context.setAttribute('aria-hidden', 'true');
        context.style.cssText = 'position:absolute!important;top:0!important;left:0!important;width:0!important;height:0!important;display:block!important;pointer-events:none!important;object-fit:fill!important;z-index:2!important;background:#000!important;';
        parentElement = parent;
        parentPosition = parent.style.getPropertyValue('position');
        parentPositionPriority = parent.style.getPropertyPriority('position');
        if (window.getComputedStyle(parent).position === 'static') parent.style.setProperty('position', 'relative');
        parent.appendChild(context);
        var contextGl = context.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
        if (!contextGl) {
            context.remove();
            parentElement = null;
            parentPosition = '';
            parentPositionPriority = '';
            return false;
        }
        try {
            var maxTexture = Number(contextGl.getParameter(contextGl.MAX_TEXTURE_SIZE)) || 4096;
            var actualScale = Math.min(SCALE, maxTexture / target.videoWidth, maxTexture / target.videoHeight);
            if (actualScale < 1) actualScale = 1;
            var upscaler = window.Anime4K.Scaler(contextGl);
            upscaler.inputVideo(target);
            upscaler.setSize(actualScale);
            canvas = context;
            gl = contextGl;
            scaler = upscaler;
            video = target;
            sourceWidth = target.videoWidth;
            sourceHeight = target.videoHeight;
            originalOpacity = target.style.getPropertyValue('opacity');
            originalOpacityPriority = target.style.getPropertyPriority('opacity');
            syncCanvasGeometry();
            return true;
        } catch (error) {
            context.remove();
            if (parentElement) {
                if (parentPosition) parentElement.style.setProperty('position', parentPosition, parentPositionPriority);
                else parentElement.style.removeProperty('position');
            }
            parentElement = null;
            parentPosition = '';
            parentPositionPriority = '';
            return false;
        }
    }
    function syncCanvasGeometry() {
        if (!canvas || !video || !canvas.parentElement) return;
        var videoRect = video.getBoundingClientRect();
        var parentRect = canvas.parentElement.getBoundingClientRect();
        var left = videoRect.left - parentRect.left;
        var top = videoRect.top - parentRect.top;
        canvas.style.setProperty('left', left.toFixed(2) + 'px', 'important');
        canvas.style.setProperty('top', top.toFixed(2) + 'px', 'important');
        canvas.style.setProperty('width', Math.max(1, videoRect.width).toFixed(2) + 'px', 'important');
        canvas.style.setProperty('height', Math.max(1, videoRect.height).toFixed(2) + 'px', 'important');
    }
    function renderFrame() {
        if (!running || !video || !scaler) return;
        try {
            if (video.readyState >= 2) scaler.render();
        } catch (error) {
            removeCanvas();
            return;
        }
        if (!running) return;
        if (typeof video.requestVideoFrameCallback === 'function') frameHandle = video.requestVideoFrameCallback(renderVideoFrame);
        else if (!video.paused) frameHandle = requestAnimationFrame(renderFrame);
    }
    function renderVideoFrame() {
        frameHandle = 0;
        renderFrame();
    }
    function startRendering(target) {
        if (!setupCanvas(target)) return false;
        running = true;
        try {
            scaler.render();
            target.style.setProperty('opacity', '0', 'important');
        } catch (error) {
            removeCanvas();
            return false;
        }
        onVideoPlay = function () {
            if (!running || frameHandle) return;
            if (typeof target.requestVideoFrameCallback === 'function') frameHandle = target.requestVideoFrameCallback(renderVideoFrame);
            else frameHandle = requestAnimationFrame(renderFrame);
        };
        onVideoSeeked = function () {
            if (running && scaler) {
                try { scaler.render(); } catch (error) { removeCanvas(); }
            }
        };
        target.addEventListener('play', onVideoPlay, { passive: true });
        target.addEventListener('seeked', onVideoSeeked, { passive: true });
        onWindowResize = function () {
            if (!running) return;
            syncCanvasGeometry();
            requestAnimationFrame(syncCanvasGeometry);
        };
        window.addEventListener('resize', onWindowResize, { passive: true });
        if (typeof target.requestVideoFrameCallback === 'function') frameHandle = target.requestVideoFrameCallback(renderVideoFrame);
        else if (!target.paused) frameHandle = requestAnimationFrame(renderFrame);
        return true;
    }
    function enableCurrent() {
        var target = currentVideo();
        if (!target || !enabled()) return;
        if (video === target && scaler) return;
        removeCanvas();
        if (target.readyState >= 2) startRendering(target);
        else target.addEventListener('loadeddata', function onLoadedData() {
            target.removeEventListener('loadeddata', onLoadedData);
            if (enabled()) startRendering(target);
        }, { once: true, passive: true });
    }
    function disableCurrent() {
        removeCanvas();
    }
    function openVideoShapeMenu() {
        if (!window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        var saved = 'default';
        try { saved = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get('player_size', 'default') : 'default'; } catch (error) {}
        Lampa.Select.show({
            title: 'Форма відео',
            items: [
                { title: 'За замовчуванням', subtitle: 'Штатний розмір кадру', value: 'default', selected: saved === 'default' },
                { title: 'Вмістити', subtitle: 'Показати весь кадр', value: 'contain', selected: saved === 'contain' },
                { title: 'Заповнити', subtitle: 'Заповнити екран', value: 'fill', selected: saved === 'fill' },
                { title: 'Збільшити 150%', value: 's150', selected: saved === 's150' },
                { title: 'Збільшити 170%', value: 's170', selected: saved === 's170' },
                { title: 'Кіно 21:9', subtitle: 'Чорні поля без деформації', value: 'cinema219', selected: saved === 'cinema219' }
            ],
            onSelect: function (item) {
                try {
                    if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set('player_size', item.value);
                    if (Lampa.Player && Lampa.Player.listener && typeof Lampa.Player.listener.send === 'function') Lampa.Player.listener.send('size', { size: item.value });
                } catch (error) {}
                if (Lampa.Select.close) Lampa.Select.close();
            }
        });
    }
    function installMenu() {
        if (menuInstalled || !window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        menuInstalled = true;
        var originalShow = Lampa.Select.show;
        Lampa.Select.show = function (options) {
            if (!options || !Array.isArray(options.items)) return originalShow.apply(this, arguments);
            var values = options.items.map(function (item) { return item && String(item.value); });
            var isQualityMenu = options.items.some(function (item) {
                return item && (item.quality !== undefined || item.url) && item.value !== 'anime4k-toggle' && item.value !== 'anime4k2' && item.value !== 'anime4k-off';
            });
            var isMoreMenu = options.items.length >= 2 && options.items.every(function (item) { return item && typeof item.onSelect === 'function'; }) && options.items.some(function (item) {
                var title = String(item.title || '').toLowerCase();
                return title.indexOf('якіст') !== -1 || title.indexOf('качеств') !== -1 || title.indexOf('quality') !== -1 || String(item.icon || '').indexOf('sprite-hd') !== -1;
            });
            if ((!isQualityMenu && !isMoreMenu) || values.indexOf('anime4k-toggle') !== -1 || values.indexOf('anime4k2') !== -1 || values.indexOf('anime4k-off') !== -1 || values.indexOf('lampa-video-shape') !== -1) return originalShow.apply(this, arguments);
            var patched = Object.assign({}, options);
            patched.items = options.items.slice();
            if (isQualityMenu) patched.items.push({
                title: enabled() ? 'Anime4K: Вимкнути' : 'Anime4K: Увімкнути',
                subtitle: enabled() ? 'Зараз увімкнено — WebGL апскейл x2' : 'Зараз вимкнено — стандартне відео Lampa',
                value: 'anime4k-toggle',
                quality: 'anime4k-toggle'
            });
            if (isMoreMenu) patched.items.push({
                title: 'Форма відео',
                template: 'selectbox_icon',
                icon: '<svg><use xlink:href="#sprite-size"></use></svg>',
                value: 'lampa-video-shape',
                onSelect: openVideoShapeMenu
            });
            patched.onSelect = function (item) {
                if (item && item.value === 'anime4k-toggle') {
                    var nextEnabled = !enabled();
                    setEnabled(nextEnabled);
                    if (nextEnabled) enableCurrent();
                    else disableCurrent();
                    if (Lampa.Select.close) Lampa.Select.close();
                } else if (item && item.value === 'lampa-video-shape') {
                    if (Lampa.Select.close) Lampa.Select.close();
                    openVideoShapeMenu();
                } else if (typeof options.onSelect === 'function') options.onSelect(item);
            };
            return originalShow.call(this, patched);
        };
    }
    function onStart() {
        installMenu();
        if (enabled()) setTimeout(enableCurrent, 120);
    }
    function onDestroy() {
        disableCurrent();
    }
    function start() {
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener) {
            setTimeout(start, 300);
            return;
        }
        installMenu();
        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('destroy', onDestroy);
    }
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
