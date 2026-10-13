/* Lampa MX Mobile Smooth Fix — safe areas, touch navigation and video focus */
(function () {
    'use strict';
    if (window.LampaMxMobileFix) return;
    window.LampaMxMobileFix = true;

    var STYLE_ID = 'lampa-mx-mobile-fix-style';
    var refreshFrame = 0;
    var activeVideo = null;
    var touchStart = null;

    function isMobile() {
        return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
            ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }
    function installViewportFix() {
        var viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && viewport.content.indexOf('viewport-fit=cover') === -1) viewport.content += ', viewport-fit=cover';
        var theme = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
        theme.name = 'theme-color'; theme.content = '#000000';
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
            'body.lampa-mx-mobile-fix .menu__item,body.lampa-mx-mobile-fix .navigation-bar__item,body.lampa-mx-mobile-fix .head__action,body.lampa-mx-mobile-fix .player__button,body.lampa-mx-mobile-fix .button{min-height:44px;touch-action:manipulation;} ',
            'body.lampa-mx-mobile-fix.lampa-video-playing .head,body.lampa-mx-mobile-fix.lampa-video-playing .navigation-bar,body.lampa-mx-mobile-fix.lampa-video-playing .player__head,body.lampa-mx-mobile-fix.lampa-video-playing .player__controls{opacity:0!important;visibility:hidden!important;pointer-events:none!important;} ',
            'body.lampa-mx-mobile-fix.lampa-video-playing{overflow:hidden!important;} ',
            'body.lampa-mx-mobile-fix.lampa-video-playing video{max-width:100vw!important;max-height:100dvh!important;} ',
            'html.lampa-mx-mobile-fix:fullscreen,html.lampa-mx-mobile-fix:fullscreen body{background:#000!important;} ',
            'html.lampa-mx-mobile-fix:fullscreen video{width:100vw!important;height:100dvh!important;object-fit:contain!important;}'
        ].join('');
        document.head.appendChild(style);
        document.documentElement.classList.add('lampa-mx-mobile-fix');
        document.body.classList.add('lampa-mx-mobile-fix');
    }
    function patchScrollContainers(root) {
        Array.prototype.forEach.call(root.querySelectorAll('.scroll,[class*="short" i]'), function (element) {
            // Permit either swipe axis. Lampa's strict pan-x/pan-y split made nested mobile lists hard to use.
            element.style.touchAction = 'pan-x pan-y';
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overscrollBehavior = 'contain';
        });
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
    function closeMenuOutsideTap(event, x, y) {
        var panel = findVisibleMenuPanel();
        if (!panel) return;
        var insidePanel = x >= panel.rect.left && x <= panel.rect.right && y >= panel.rect.top && y <= panel.rect.bottom;
        if (insidePanel) return;
        try {
            if (window.Lampa && Lampa.Menu && typeof Lampa.Menu.close === 'function') {
                Lampa.Menu.close();
                return;
            }
        } catch (error) {}
        var closeButton = document.querySelector('.menu__close,.menu-close,[data-action="menu-close"]');
        if (closeButton && typeof closeButton.click === 'function') closeButton.click();
    }
    function pointFromPointer(event) {
        return { x: event.clientX, y: event.clientY, id: event.pointerId };
    }
    function onPointerDown(event) {
        if (event.pointerType && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        touchStart = pointFromPointer(event);
    }
    function onPointerUp(event) {
        if (!touchStart || (touchStart.id !== undefined && event.pointerId !== touchStart.id)) return;
        var start = touchStart;
        touchStart = null;
        var dx = event.clientX - start.x;
        var dy = event.clientY - start.y;
        if (dx * dx + dy * dy > 18 * 18) return;
        closeMenuOutsideTap(event, event.clientX, event.clientY);
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
        closeMenuOutsideTap(event, touch.clientX, touch.clientY);
    }
    function installTouchNavigation() {
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
    function findActiveVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') {
                var selected = Lampa.PlayerVideo.video();
                if (selected && selected.tagName === 'VIDEO') return selected;
            }
        } catch (error) {}
        var videos = Array.prototype.slice.call(document.querySelectorAll('video'));
        return videos.filter(function (video) {
            var rect = video.getBoundingClientRect();
            return rect.width > 160 && rect.height > 90 && (video.closest('.player') || video.closest('.player-video'));
        }).sort(function (a, b) {
            return b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height;
        })[0] || null;
    }
    function leaveVideoMode() {
        document.body.classList.remove('lampa-video-playing');
        activeVideo = null;
    }
    function enterVideoMode(video) {
        if (!video) return;
        activeVideo = video;
        document.body.classList.add('lampa-video-playing');
    }
    function tryFullscreen() {
        if (!activeVideo || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
        try {
            var promise = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
            if (promise && promise.catch) promise.catch(function () {});
        } catch (error) {}
    }
    function bindVideo(video) {
        if (video.dataset.lampaSmoothBound === '1') return;
        video.dataset.lampaSmoothBound = '1';
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.style.webkitBackfaceVisibility = 'hidden';
        video.style.backfaceVisibility = 'hidden';
        video.addEventListener('play', function () { enterVideoMode(video); }, { passive: true });
        ['pause', 'ended', 'emptied'].forEach(function (eventName) {
            video.addEventListener(eventName, function () {
                if (activeVideo === video && (eventName !== 'pause' || !video.webkitDisplayingFullscreen)) leaveVideoMode();
            }, { passive: true });
        });
        video.addEventListener('pointerup', function () {
            if (activeVideo === video && !document.fullscreenElement) tryFullscreen();
        }, { passive: true });
    }
    function patchVideos(root) {
        Array.prototype.forEach.call(root.querySelectorAll('video'), bindVideo);
        var video = findActiveVideo();
        if (video && !video.paused) enterVideoMode(video);
    }
    function refresh() {
        if (refreshFrame) return;
        refreshFrame = requestAnimationFrame(function () {
            refreshFrame = 0;
            installViewportFix(); installStyles(); patchScrollContainers(document); patchVideos(document);
        });
    }
    function start() {
        if (!isMobile()) return;
        refresh();
        installTouchNavigation();
        if (window.MutationObserver) {
            var observer = new MutationObserver(function (mutations) {
                if (mutations.some(function (mutation) { return mutation.addedNodes && mutation.addedNodes.length; })) refresh();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
        document.addEventListener('fullscreenchange', function () {
            if (!document.fullscreenElement && activeVideo && activeVideo.paused) leaveVideoMode();
        }, { passive: true });
        window.addEventListener('resize', refresh, { passive: true });
        window.addEventListener('orientationchange', refresh, { passive: true });
        console.log('[Lampa MX Mobile Smooth] loaded');
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
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
            requestAnimationFrame(function () { requestAnimationFrame(fitHudToVideo); });
        }
        function clearMode(video) {
            if (!video || !video.style) return;
            clearHudFit(playerRoot(video));
            ['position','inset','top','right','bottom','left','width','height','object-fit','object-position','aspect-ratio','transform','transform-origin','background'].forEach(function (name) {
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
            if (video) video.setAttribute('playsinline', 'true');
            function onReady() {
                applySavedMode();
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
        window.addEventListener('resize', function () {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(applySavedMode);
            scheduleHudFit();
        }, { passive: true });
        console.log('[Lampa Smooth Player] loaded');
    });
})();
/* Lampa AniSkip — manual opening skip button powered by AniSkip */
(function () {
    'use strict';
    var pluginVersion = '2026-10-13-all-in-one-3';
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
    var retryTimer = 0;
    var pollCount = 0;
    var malIdCache = new Map();
    var segmentCache = new Map();
    var boundTimeUpdate = null;
    var boundLoadedMetadata = null;
    var lastVisibilityLog = null;

    function installStyles() {
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = [
            '.lampa-aniskip-button{z-index:2147483000!important;display:flex!important;align-items:center;gap:.6em;min-height:44px;padding:.8em 1.2em;border:0;border-radius:2em;background:rgba(255,255,255,.12);color:#fff;font:600 15px/1.2 Arial,sans-serif;cursor:pointer;touch-action:manipulation;-webkit-appearance:none;appearance:none;-webkit-tap-highlight-color:transparent}',
            '.lampa-aniskip-button.hide{display:none!important}',
            '.lampa-aniskip-button:not(.hide){display:flex!important}',
            '.player .lampa-aniskip-button{position:absolute!important;right:1.5em!important;bottom:1.5em!important}',
            '.lampa-aniskip-fallback{position:fixed!important;left:16px!important;right:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 82px)!important}',
            '.lampa-aniskip-button:active{transform:scale(.97)}',
            '.lampa-aniskip-button svg{width:20px;height:20px;flex:0 0 20px;fill:currentColor}'
        ].join('');
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
            activity && activity.movie,
            activity && activity.data && activity.data.movie,
            activity && activity.params && activity.params.movie,
            event && event.movie,
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
        var keys = ['mal_id', 'malId', 'malID', 'myanimelist_id', 'myAnimeListId'];
        for (var i = 0; i < objects.length; i++) {
            var item = objects[i];
            if (!item || typeof item !== 'object') continue;
            var id = 0;
            keys.some(function (key) {
                var value = Number(item[key] || (item.externalIds && item.externalIds[key]) || (item.external_ids && item.external_ids[key]));
                if (Number.isInteger(value) && value > 0) { id = value; return true; }
                return false;
            });
            if (id) return id;
        }
        return 0;
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
        return mediaSourceText();
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
        var title = titleFrom(objects);
        var source = mediaSourceText();
        var knownId = knownAnimeMalId(title) || knownAnimeMalId(source);
        if (knownId) {
            console.log('[Lampa AniSkip] Matched Frieren alias from title/source:', title, source ? 'source URL matched' : '');
            return Promise.resolve(knownId);
        }
        if (!title) return Promise.resolve(0);
        var normalizedTitle = normalizeTitle(title);
        var key = normalizeTitle(title);
        if (malIdCache.has(key)) return malIdCache.get(key);
        var promise = (async function () {
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 5000);
            try {
                var response = await fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(title) + '&limit=5', {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' }
                });
                if (!response.ok) return 0;
                var payload = await response.json();
                var results = Array.isArray(payload && payload.data) ? payload.data : [];
                var exact = results.find(function (anime) {
                    return [anime.title, anime.title_english, anime.title_japanese].some(function (candidate) {
                        return normalizeTitle(candidate) === key;
                    });
                });
                return Number((exact || results[0] || {}).mal_id) || 0;
            } catch (error) {
                return 0;
            } finally {
                clearTimeout(timer);
            }
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
        var rootKeys = ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'current_episode', 'currentEpisode', 'episode', 'ep'];
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
        var preferredKeys = ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'current_episode', 'currentEpisode'];
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
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'player-skip selector hide lampa-aniskip-button';
        button.setAttribute('aria-hidden', 'true');
        button.setAttribute('aria-label', 'Пропустити опенінг');
        button.innerHTML = '<span class="player-skip__text">Пропустити опенінг</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16l13-8L5 4z"></path></svg>';
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
            if (visible) console.log('[Lampa AniSkip] Skip button visible:', currentSegment.type, currentSegment.start, '-', currentSegment.end);
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
                    console.warn('[Lampa AniSkip] API error:', response.status);
                    return [];
                }
                var payload = await response.json();
                if (!payload || payload.found !== true || !Array.isArray(payload.results)) {
                    console.log('[Lampa AniSkip] No segments for this MAL ID / episode:', malId, episode);
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
                console.log('[Lampa AniSkip] Segments:', malId, episode, segments.length);
                return segments;
            } catch (error) {
                console.warn('[Lampa AniSkip] Request failed:', error && error.name ? error.name : error);
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
        if (currentButton && currentButton.parentNode) currentButton.parentNode.removeChild(currentButton);
        currentButton = null;
    }
    function loadForCurrent(token) {
        if (token !== requestToken) return;
        var video = getVideo();
        var objects = asObjects(startEvent);
        var episode = episodeFromObjects(objects);
        var title = titleFrom(objects);
        var malId = directMalId(objects);
        if (!video || !episode || (!title && !malId)) {
            pollCount++;
            if (pollCount === 1) console.log('[Lampa AniSkip] Waiting for video metadata:', { video: !!video, episode: episode, title: !!title, malId: malId });
            if (pollCount === 60) console.log('[Lampa AniSkip] Stopped: video, episode or anime title could not be detected');
            if (pollCount < 60) retryTimer = setTimeout(function () { loadForCurrent(token); }, 500);
            return;
        }
        console.log('[Lampa AniSkip] Looking up:', { episode: episode, malId: malId || 'title lookup' });
        currentVideo = video;
        createButton(video);
        Promise.resolve(resolveMalId(objects)).then(function (malId) {
            if (token !== requestToken || currentVideo !== video) return;
            if (!malId) {
                console.log('[Lampa AniSkip] No MAL ID resolved for title:', title);
                return;
            }
            console.log('[Lampa AniSkip] Resolved MAL ID:', malId, 'episode:', episode);
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
        console.log('[Lampa AniSkip] Player start');
        clearCurrent();
        startEvent = event || null;
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
        console.log('[Lampa AniSkip] loaded');
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
