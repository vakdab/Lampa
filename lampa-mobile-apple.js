/* Lampa Mobile Apple — based on lampa-combined-fix.js commit 7b78923d */
/* Lampa MX Mobile Fix — touch navigation only; never modifies video playback */
(function () {
    'use strict';
    var version = '2026-10-25-hero-no-top-tint-v9';
    if (window.LampaMxMobileFixVersion === version) return;
    window.LampaMxMobileFixVersion = version;
    window.LampaMxMobileFix = true;

    var STYLE_ID = 'lampa-mx-mobile-fix-style-v9';
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
        ['lampa-mx-mobile-fix-style-v2', 'lampa-mx-mobile-fix-style-v3', 'lampa-mx-mobile-fix-style-v4', 'lampa-mx-mobile-fix-style-v5', 'lampa-mx-mobile-fix-style-v6', 'lampa-mx-mobile-fix-style-v7', 'lampa-mx-mobile-fix-style-v8'].forEach(function (id) {
            var oldStyle = document.getElementById(id);
            if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);
        });
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            'html.lampa-mx-mobile-fix,body.lampa-mx-mobile-fix{min-height:100%;overscroll-behavior:none;} ',
            'body.lampa-mx-mobile-fix .activity.application,body.lampa-mx-mobile-fix .activity.application .scroll,body.lampa-mx-mobile-fix .activity.application .scroll__content,body.lampa-mx-mobile-fix .activity.application .scroll__body{background:#fff!important;background-image:none!important;color:#17191d!important;} ',
            'body.lampa-mx-mobile-fix .activity.application .wrap__content,body.lampa-mx-mobile-fix .activity.application .items-line,body.lampa-mx-mobile-fix .activity.application .items-line__body{background:transparent!important;} ',
            'body.lampa-mx-mobile-fix .activity.application .card__title,body.lampa-mx-mobile-fix .activity.application .card__text,body.lampa-mx-mobile-fix .activity.application .items-line__title{color:#17191d!important;text-shadow:none!important;} ',
            'body.lampa-mx-mobile-fix .head{top:calc(env(safe-area-inset-top,0px) + 0.25cm)!important;} ',
            'body.lampa-mx-mobile-fix .wrap__content{padding-top:calc(4em + env(safe-area-inset-top,0px));} ',
            'body.lampa-mx-mobile-fix .scroll,body.lampa-mx-mobile-fix [class*="short" i]{touch-action:pan-x pan-y!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;} ',
            'body.lampa-mx-mobile-fix .navigation-bar,body.true--mobile .navigation-bar{background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;border:0!important;padding-bottom:env(safe-area-inset-bottom,0px)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;} ',
            'body.true--mobile .navigation-bar::before,body.true--mobile .navigation-bar::after{content:none!important;display:none!important;} ',
            'body.true--mobile:not(.orientation--landscape) .navigation-bar{height:0!important;padding:0!important;overflow:visible!important;} body.true--mobile:not(.orientation--landscape) .navigation-bar__body{position:absolute!important;left:1.5em!important;right:1.5em!important;bottom:2em!important;} ',
            'body.lampa-mx-mobile-fix .menu__item,body.lampa-mx-mobile-fix .navigation-bar__item,body.lampa-mx-mobile-fix .head__action,body.lampa-mx-mobile-fix .player__button,body.lampa-mx-mobile-fix .button{min-height:44px;touch-action:manipulation;}'
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

    function isRemovedTopnavAction(action) {
      return ['feed', 'subscribe', 'subscriptions', 'subscription', 'notice', 'schedule', 'console', 'torrent', 'torrents'].indexOf(action) !== -1;
    }

    function isRemovedTopnavLabel(label) {
      var text = String(label || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text === 'стрічка' || text === 'лента' || text === 'feed' ||
        text === 'підписки' || text === 'подписки' || text === 'subscriptions' ||
        text === 'розклад' || text === 'расписание' || text === 'schedule' ||
        text === 'торренти' || text === 'торренты' || text === 'torrents' || text === 'torrent';
    }

    function getAvailableTopnavItems() {
      var defs = [];
      var seen = {};

      qsa('.menu .menu__item.selector[data-action]').forEach(function (item) {
        var action = item.getAttribute('data-action');
        if (!action || seen[action]) return;
        if (action === 'search' || action === 'settings' || isRemovedTopnavAction(action)) return;
        var label = '';
        var labelNode = qs('.menu__text, .menu__item-name, .menu__item-text', item);
        if (labelNode) label = (labelNode.textContent || '').trim();
        if (!label) label = (item.textContent || '').trim();
        if (!label) label = action;
        if (isRemovedTopnavLabel(label)) return;
        seen[action] = true;
        defs.push({ action: action, label: label });
      });

      getFallbackTopnavItems().forEach(function (item) {
        if (isRemovedTopnavAction(item.action)) return;
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
        return (Array.isArray(raw) ? raw : ['main', 'movie', 'tv', 'cartoon']).filter(function (action) {
          return !isRemovedTopnavAction(action);
        });
      } catch (e) {
        return ['main', 'movie', 'tv', 'cartoon'];
      }
    }

    function setStoredTopnavActions(actions) {
      try {
        if (!window.Lampa || !Lampa.Storage) return;
        Lampa.Storage.set(TOPNAV_ITEMS_KEY, (Array.isArray(actions) ? actions : []).filter(function (action) {
          return !isRemovedTopnavAction(action);
        }));
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
      if (window.__stvMobileComponents) return false;
      try { if (!window.Lampa || !Lampa.Storage) return false; var v = Lampa.Storage.get(HERO_KEY, 'true'); return v === true || v === 'true' || v === 'on'; } catch (e) { return false; }
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

    function hideRemovedBackgroundSettings() {
      var styleId = 'appletv-agnative-background-settings-hide-style';
      var style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        (document.head || document.body || document.documentElement).appendChild(style);
      }
      style.textContent = 'body.' + BODY_CLASS + ' { background-color:#000 !important; }';

      var labels = [
        'показувати фон', 'показывать фон', 'show background',
        'тип фону', 'тип фона', 'background type'
      ];
      qsa('.settings__item, .settings-param, .settings__field').forEach(function (item) {
        var text = String(item.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!text) return;
        if (labels.some(function (label) { return text.indexOf(label) !== -1; })) {
          item.style.setProperty('display', 'none', 'important');
          item.setAttribute('data-agnative-removed-background-setting', 'true');
        }
      });
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
          if (e.type === 'complite' && !window.__stvMobileComponents) {
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
      var ua = String((window.navigator && window.navigator.userAgent) || '').toLowerCase();
      var mobileUa = /iphone|ipod|ipad|android|windows phone|mobile/.test(ua);
      var tvUa = /smart[- ]?tv|googletv|android ?tv|aftb|afts|webos|tizen|netcast|viera|bravia|hbbtv/.test(ua);
      return !tvUa && (window.innerWidth < 768 || (window.innerWidth < 1024 && 'ontouchstart' in window) || mobileUa);
    }

    function isTvDevice() {
      try {
        // On phones, never allow a WebView/platform flag to select the TV skin.
        if (isMobile()) return false;
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
        'body.' + BODY_CLASS + ' .activity { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; transition: none !important; }',
        'body.' + BODY_CLASS + ' .activity.activity--active { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; z-index: 1 !important; }',
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
        'body.true--mobile .navigation-bar, body.true--mobile .navigation-bar::before, body.true--mobile .navigation-bar::after { background:transparent !important; background-color:transparent !important; background-image:none !important; box-shadow:none !important; border:0 !important; -webkit-backdrop-filter:none !important; backdrop-filter:none !important; }',
        'body.' + BODY_CLASS + ' .navigation-bar { background:transparent !important; background-color:transparent !important; background-image:none !important; box-shadow:none !important; }',
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
        '  height: auto !important;',
        '  max-height: 80vh !important;',
        '  min-height: 0 !important;',
        '  overflow-y: hidden !important;',
        '  overflow-x: hidden !important;',
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
        'body.' + BODY_CLASS + ' .agnative-leftdock__inner { display: flex; flex: 0 0 auto; min-height: 0; max-height: calc(80vh - 1em); flex-direction: column; gap: .12em; }',
        'body.' + BODY_CLASS + ' .agnative-leftdock__scrollcase { flex: 0 1 auto; min-height: 0; max-height: 22em; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; touch-action: pan-y; scrollbar-width: thin; }',
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
          hideRemovedBackgroundSettings();
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
          childList: true,
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
      var menuCaseIndex = 0;

      Array.prototype.slice.call(sourceMenu.children).forEach(function (child) {
        if (!child || !child.classList) return;
        if (child.classList.contains('menu__case')) {
          var caseEl = document.createElement('div');
          caseEl.className = 'agnative-leftdock__case' + (menuCaseIndex === 0 ? ' agnative-leftdock__scrollcase' : '');
          menuCaseIndex++;
          qsa('.menu__item.selector', child).forEach(function (item) {
            if (item.classList.contains('hidden')) return;
            var action = item.getAttribute('data-action');
            var sourceLabelNode = qs('.menu__text, .menu__item-name, .menu__item-text', item);
            var sourceLabel = sourceLabelNode ? (sourceLabelNode.textContent || '').trim() : (item.textContent || '').trim();
            if (isRemovedTopnavAction(action) || isRemovedTopnavLabel(sourceLabel)) {
              item.style.setProperty('display', 'none', 'important');
              item.setAttribute('data-agnative-removed-menu-item', 'true');
              return;
            }
            var btn = document.createElement('div');
            btn.className = 'agnative-leftdock__item selector';
            btn.setAttribute('data-selector', 'true');
            btn.setAttribute('tabindex', '0');
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
      hideRemovedBackgroundSettings();

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
      hideRemovedBackgroundSettings();
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

/* Embedded Applecation TV details plugin v1.2.1. */
(function () {
  if (window.__LampaCombinedApplecationEmbedded) return;
  window.__LampaCombinedApplecationEmbedded = true;
  !function(){"use strict";const t="1.2.1",e='<svg viewBox="110 90 180 210"xmlns=http://www.w3.org/2000/svg><g id=sphere><circle cx=200 cy=140 fill="hsl(200, 80%, 40%)"opacity=0.3 r=1.2 /><circle cx=230 cy=150 fill="hsl(200, 80%, 45%)"opacity=0.35 r=1.3 /><circle cx=170 cy=155 fill="hsl(200, 80%, 42%)"opacity=0.32 r=1.2 /><circle cx=245 cy=175 fill="hsl(200, 80%, 48%)"opacity=0.38 r=1.4 /><circle cx=155 cy=180 fill="hsl(200, 80%, 44%)"opacity=0.34 r=1.3 /><circle cx=215 cy=165 fill="hsl(200, 80%, 46%)"opacity=0.36 r=1.2 /><circle cx=185 cy=170 fill="hsl(200, 80%, 43%)"opacity=0.33 r=1.3 /><circle cx=260 cy=200 fill="hsl(200, 80%, 50%)"opacity=0.4 r=1.5 /><circle cx=140 cy=200 fill="hsl(200, 80%, 50%)"opacity=0.4 r=1.5 /><circle cx=250 cy=220 fill="hsl(200, 80%, 48%)"opacity=0.38 r=1.4 /><circle cx=150 cy=225 fill="hsl(200, 80%, 47%)"opacity=0.37 r=1.4 /><circle cx=235 cy=240 fill="hsl(200, 80%, 45%)"opacity=0.35 r=1.3 /><circle cx=165 cy=245 fill="hsl(200, 80%, 44%)"opacity=0.34 r=1.3 /><circle cx=220 cy=255 fill="hsl(200, 80%, 42%)"opacity=0.32 r=1.2 /><circle cx=180 cy=258 fill="hsl(200, 80%, 41%)"opacity=0.31 r=1.2 /><circle cx=200 cy=120 fill="hsl(200, 80%, 60%)"opacity=0.5 r=1.8 /><circle cx=240 cy=135 fill="hsl(200, 80%, 65%)"opacity=0.55 r=2 /><circle cx=160 cy=140 fill="hsl(200, 80%, 62%)"opacity=0.52 r=1.9 /><circle cx=270 cy=165 fill="hsl(200, 80%, 70%)"opacity=0.6 r=2.2 /><circle cx=130 cy=170 fill="hsl(200, 80%, 67%)"opacity=0.57 r=2.1 /><circle cx=255 cy=190 fill="hsl(200, 80%, 72%)"opacity=0.62 r=2.3 /><circle cx=145 cy=195 fill="hsl(200, 80%, 69%)"opacity=0.59 r=2.2 /><circle cx=280 cy=200 fill="hsl(200, 80%, 75%)"opacity=0.65 r=2.5 /><circle cx=120 cy=200 fill="hsl(200, 80%, 75%)"opacity=0.65 r=2.5 /><circle cx=275 cy=215 fill="hsl(200, 80%, 73%)"opacity=0.63 r=2.4 /><circle cx=125 cy=220 fill="hsl(200, 80%, 71%)"opacity=0.61 r=2.3 /><circle cx=260 cy=235 fill="hsl(200, 80%, 68%)"opacity=0.58 r=2.2 /><circle cx=140 cy=240 fill="hsl(200, 80%, 66%)"opacity=0.56 r=2.1 /><circle cx=245 cy=255 fill="hsl(200, 80%, 63%)"opacity=0.53 r=2 /><circle cx=155 cy=260 fill="hsl(200, 80%, 61%)"opacity=0.51 r=1.9 /><circle cx=225 cy=270 fill="hsl(200, 80%, 58%)"opacity=0.48 r=1.8 /><circle cx=175 cy=272 fill="hsl(200, 80%, 56%)"opacity=0.46 r=1.7 /><circle cx=200 cy=100 fill="hsl(200, 80%, 85%)"opacity=0.8 r=2.8 /><circle cx=230 cy=115 fill="hsl(200, 80%, 90%)"opacity=0.85 r=3 /><circle cx=170 cy=120 fill="hsl(200, 80%, 87%)"opacity=0.82 r=2.9 /><circle cx=250 cy=140 fill="hsl(200, 80%, 92%)"opacity=0.88 r=3.2 /><circle cx=150 cy=145 fill="hsl(200, 80%, 89%)"opacity=0.84 r=3.1 /><circle cx=265 cy=170 fill="hsl(200, 80%, 95%)"opacity=0.9 r=3.4 /><circle cx=135 cy=175 fill="hsl(200, 80%, 93%)"opacity=0.87 r=3.3 /><circle cx=275 cy=200 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.5 /><circle cx=125 cy=200 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.5 /><circle cx=200 cy=200 fill="hsl(200, 80%, 100%)"opacity=1 r=4 /><circle cx=220 cy=195 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.8 /><circle cx=180 cy=205 fill="hsl(200, 80%, 97%)"opacity=0.93 r=3.7 /><circle cx=240 cy=210 fill="hsl(200, 80%, 96%)"opacity=0.92 r=3.6 /><circle cx=160 cy=215 fill="hsl(200, 80%, 95%)"opacity=0.9 r=3.5 /><circle cx=270 cy=230 fill="hsl(200, 80%, 94%)"opacity=0.88 r=3.4 /><circle cx=130 cy=235 fill="hsl(200, 80%, 92%)"opacity=0.86 r=3.3 /><circle cx=255 cy=250 fill="hsl(200, 80%, 90%)"opacity=0.84 r=3.2 /><circle cx=145 cy=255 fill="hsl(200, 80%, 88%)"opacity=0.82 r=3.1 /><circle cx=235 cy=265 fill="hsl(200, 80%, 86%)"opacity=0.8 r=3 /><circle cx=165 cy=268 fill="hsl(200, 80%, 84%)"opacity=0.78 r=2.9 /><circle cx=215 cy=280 fill="hsl(200, 80%, 82%)"opacity=0.76 r=2.8 /><circle cx=185 cy=282 fill="hsl(200, 80%, 80%)"opacity=0.74 r=2.7 /><circle cx=200 cy=290 fill="hsl(200, 80%, 78%)"opacity=0.72 r=2.6 /><circle cx=210 cy=130 fill="hsl(200, 80%, 88%)"opacity=0.83 r=2.5 /><circle cx=190 cy=135 fill="hsl(200, 80%, 86%)"opacity=0.81 r=2.4 /><circle cx=225 cy=155 fill="hsl(200, 80%, 91%)"opacity=0.86 r=2.8 /><circle cx=175 cy=160 fill="hsl(200, 80%, 89%)"opacity=0.84 r=2.7 /><circle cx=245 cy=185 fill="hsl(200, 80%, 94%)"opacity=0.89 r=3.3 /><circle cx=155 cy=190 fill="hsl(200, 80%, 92%)"opacity=0.87 r=3.2 /><circle cx=260 cy=210 fill="hsl(200, 80%, 95%)"opacity=0.91 r=3.4 /><circle cx=140 cy=215 fill="hsl(200, 80%, 93%)"opacity=0.88 r=3.3 /><circle cx=250 cy=230 fill="hsl(200, 80%, 91%)"opacity=0.85 r=3.2 /><circle cx=150 cy=235 fill="hsl(200, 80%, 89%)"opacity=0.83 r=3.1 /><circle cx=230 cy=245 fill="hsl(200, 80%, 87%)"opacity=0.81 r=3 /><circle cx=170 cy=250 fill="hsl(200, 80%, 85%)"opacity=0.79 r=2.9 /><circle cx=210 cy=260 fill="hsl(200, 80%, 83%)"opacity=0.77 r=2.8 /><circle cx=190 cy=265 fill="hsl(200, 80%, 81%)"opacity=0.75 r=2.7 /></g></svg>',n=864e5,a="applecation_ratings_cache",i=500,o=15e3,l="https://corsproxy.io/?url=";class r{static getJson(t,e,n,a={}){return this._request(t,e,n,{dataType:"json",...a})}static getText(t,e,n,a={}){return this._request(t,e,n,{dataType:"text",...a})}static _request(t,e,n,a){const i=new Lampa.Reguest;i.timeout(o),i.silent(t,e,n,!1,a)}}class s{static clean(t){return t?t.replace(/[\s.,:;''`!?]+/g," ").trim():""}static cleanForKP(t){return this.clean(t).replace(/^[ \/\\]+/,"").replace(/[ \/\\]+$/,"").replace(/\+( *[+\/\\])+/g,"+").replace(/([+\/\\] *)+\+/g,"+").replace(/( *[\/\\]+ *)+/g,"+")}static normalize(t){return t?this.clean(t.toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g,"-").replace(/ё/g,"е")):""}static equal(t,e){return"string"==typeof t&&"string"==typeof e&&this.normalize(t)===this.normalize(e)}static contains(t,e){return"string"==typeof t&&"string"==typeof e&&-1!==this.normalize(t).indexOf(this.normalize(e))}}class p{_getCache(){return Lampa.Storage.cache(a,i,{})}get(t){if(!t)return null;const e=this._getCache(),i=e[t];if(!i)return null;return Date.now()-i.timestamp>n?(delete e[t],Lampa.Storage.set(a,e),null):i.data}set(t,e){if(!t)return;const n=this._getCache();n[t]={timestamp:Date.now(),data:e},Lampa.Storage.set(a,n)}}class c{static fetch(t,e){const n=Lampa.Storage.get("applecation_mdblist_api_key","");if(!n)return e({});const a=`https://api.mdblist.com/tmdb/${t.name?"show":"movie"}/${t.id}?apikey=${n}`;r.getJson(a,t=>this._processResponse(t,e),()=>e({}))}static _processResponse(t,e){const n={};t&&t.ratings&&t.ratings.forEach(t=>{const e=(t.source||"").toString().toLowerCase().trim();"tmdb"!==e&&(n[e]="tomatoes"===e||"popcorn"===e?{value:t.value,score:t.score,votes:t.votes,url:t.url}:t.value)}),e(n)}}class d{static fetch(t,e){const n=Lampa.Storage.get("applecation_kp_api_key","");if(!n)return e(null);this._searchFilm(t,e,n)}static _searchFilm(t,e,n){const a=t.title||t.name,i=s.cleanForKP(a||""),{url:o,method:l}=this._buildSearchUrl(t,i);r.getJson(o,a=>this._processSearchResponse(a,t,e,i,n),()=>e(null),{headers:{"X-API-KEY":n}})}static _processSearchResponse(t,e,n,a,i){const o=t.items||t.films||[];o.length>0?this._selectBestMatch(e,o,n,i):e.imdb_id?this._searchByKeyword(a,e,n,i):n(null)}static _searchByKeyword(t,e,n,a){const i=`https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(t)}`;r.getJson(i,t=>{const i=t.items||t.films||[];this._selectBestMatch(e,i,n,a)},()=>n(null),{headers:{"X-API-KEY":a}})}static _selectBestMatch(t,e,n,a){const i=this._extractYear(t.release_date||t.first_air_date),o=t.original_title||t.original_name;let l=e.map(t=>{const e=t.start_date||t.year||"0000";return{...t,tmp_year:parseInt((e+"").slice(0,4))}});if(t.imdb_id){const e=l.filter(e=>(e.imdb_id||e.imdbId)===t.imdb_id);if(e.length>0)return this._extractRating(e[0],n,a)}if(o&&(l=this._applyFilter(l,t=>s.contains(t.orig_title||t.nameOriginal||t.nameEn||t.en_title,o)||s.contains(t.title||t.ru_title||t.nameRu,o))),t.title&&(l=this._applyFilter(l,e=>s.contains(e.title||e.ru_title||e.nameRu,t.title)||s.contains(e.en_title||e.nameEn||e.nameOriginal||e.orig_title,t.title))),l.length>1&&null!==i&&i>0){const t=l.filter(t=>t.tmp_year===i);l=t.length>0?t:this._applyFilter(l,t=>t.tmp_year&&t.tmp_year>i-2&&t.tmp_year<i+2)}1===l.length?this._extractRating(l[0],n,a):n(null)}static _applyFilter(t,e){const n=t.filter(e);return n.length>0?n:t}static _buildSearchUrl(t,e){return t.imdb_id?{url:`https://kinopoiskapiunofficial.tech/api/v2.2/films?imdbId=${encodeURIComponent(t.imdb_id)}`,method:"IMDb ID"}:{url:`https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(e)}`,method:"Keyword"}}static _extractYear(t){return t?parseInt((t+"").slice(0,4)):null}static _extractRating(t,e,n){const a=t.kp_id||t.kinopoisk_id||t.kinopoiskId||t.filmId,i=t.ratingKinopoisk||t.rating;if(i&&!isNaN(i)){const t=parseFloat(i);if(t>0&&t<=10)return e(t)}a?this._fetchRatingFromXML(a,e):e(null)}static _fetchRatingFromXML(t,e){const n=`${l}${encodeURIComponent(`https://rating.kinopoisk.ru/${t}.xml`)}`;r.getText(n,t=>{const n=this._parseXMLRating(t);e(n)},()=>e(null))}static _parseXMLRating(t){try{const e=$($.parseXML(t)).find("kp_rating");if(e.length){const t=parseFloat(e.text());return t>0&&t<=10?t:null}}catch(t){}return null}}const g=new class{constructor(){this.cacheManager=new p,this.pendingRequests=new Map}fetch(t,e){if(!t||!t.id)return e(this._getEmptyResult());const n=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]),a=this.cacheManager.get(t.id);if(a)return e(a);if(this.pendingRequests.has(t.id))return void this.pendingRequests.get(t.id).push(e);this.pendingRequests.set(t.id,[e]);const i=this._createResult(t,!1);let o=0;const l=()=>{if(o--,o<=0){i.ready=!0,this.cacheManager.set(t.id,i);const e=this.pendingRequests.get(t.id)||[];this.pendingRequests.delete(t.id),e.forEach(t=>{try{t(i)}catch(t){}})}};return Lampa.Storage.get("applecation_mdblist_api_key","")&&(o++,c.fetch(t,t=>{Object.assign(i,t),l()})),n.includes("kp")&&Lampa.Storage.get("applecation_kp_api_key","")&&(o++,d.fetch(t,t=>{i.kp=t,l()})),0===o?(i.ready=!0,e(i)):void 0}_getEmptyResult(){return this._createResult(null,!0)}_createResult(t,e){return{imdb:null,kp:null,tmdb:t&&t.vote_average?parseFloat(t.vote_average):null,tomatoes:null,popcorn:null,metacritic:null,letterboxd:null,trakt:null,myanimelist:null,ready:!!e}}};function m(t){return t&&!t.__destroyed}function h(t,e){if(!t||!Lampa.Storage.field("parser_use"))return;if(!Lampa.Parser||"function"!=typeof Lampa.Parser.get)return;const n=t.title||t.name||"Неизвестно",a=((t.first_air_date||t.release_date||"0000")+"").slice(0,4),i={df:t.original_title,df_year:t.original_title+" "+a,df_lg:t.original_title+" "+t.title,df_lg_year:t.original_title+" "+t.title+" "+a,lg:t.title,lg_year:t.title+" "+a,lg_df:t.title+" "+t.original_title,lg_df_year:t.title+" "+t.original_title+" "+a}[Lampa.Storage.field("parse_lang")]||t.title;Lampa.Parser.get({search:i,movie:t,page:1},t=>{if(!m(e))return;if(!t||!t.Results||0===t.Results.length)return;const a={resolutions:new Set,hdr:new Set,audio:new Set,hasDub:!1};t.Results.forEach(t=>{if(t.ffprobe&&Array.isArray(t.ffprobe)){const e=function(t){if(!t||!Array.isArray(t))return null;const e={resolution:null,hdr:!1,dolbyVision:!1,audio:null},n=t.find(t=>"video"===t.codec_type);if(n){if(n.width&&n.height&&(e.resolution=`${n.width}x${n.height}`,n.height>=2160||n.width>=3840?e.resolutionLabel="4K":n.height>=1440||n.width>=2560?e.resolutionLabel="2K":n.height>=1080||n.width>=1920?e.resolutionLabel="FULL HD":(n.height>=720||n.width>=1280)&&(e.resolutionLabel="HD")),n.side_data_list){const t=n.side_data_list.some(t=>"Mastering display metadata"===t.side_data_type),a=n.side_data_list.some(t=>"Content light level metadata"===t.side_data_type);n.side_data_list.some(t=>"DOVI configuration record"===t.side_data_type||"Dolby Vision RPU"===t.side_data_type)?(e.dolbyVision=!0,e.hdr=!0):(t||a)&&(e.hdr=!0)}!e.hdr&&n.color_transfer&&["smpte2084","arib-std-b67"].includes(n.color_transfer.toLowerCase())&&(e.hdr=!0),!e.dolbyVision&&n.codec_name&&(n.codec_name.toLowerCase().includes("dovi")||n.codec_name.toLowerCase().includes("dolby"))&&(e.dolbyVision=!0,e.hdr=!0)}const a=t.filter(t=>"audio"===t.codec_type);let i=0;return a.forEach(t=>{t.channels&&t.channels>i&&(i=t.channels)}),i>=8?e.audio="7.1":i>=6?e.audio="5.1":i>=4?e.audio="4.0":i>=2&&(e.audio="2.0"),e}(t.ffprobe);if(e&&(e.resolutionLabel&&a.resolutions.add(e.resolutionLabel),e.audio&&a.audio.add(e.audio)),!a.hasDub){t.ffprobe.filter(t=>"audio"===t.codec_type&&t.tags).forEach(t=>{const e=(t.tags.language||"").toLowerCase(),n=(t.tags.title||t.tags.handler_name||"").toLowerCase();"rus"!==e&&"ru"!==e&&"russian"!==e||(n.includes("dub")||n.includes("дубляж")||n.includes("дублир")||"d"===n)&&(a.hasDub=!0)})}}const e=t.Title.toLowerCase();(e.includes("dolby vision")||e.includes("dovi")||e.match(/\bdv\b/))&&a.hdr.add("Dolby Vision"),e.includes("hdr10+")&&a.hdr.add("HDR10+"),e.includes("hdr10")&&a.hdr.add("HDR10"),e.includes("hdr")&&a.hdr.add("HDR")});const i={title:n,torrents_found:t.Results.length,quality:null,dv:!1,hdr:!1,hdr_type:null,sound:null,dub:a.hasDub};if(a.resolutions.size>0){const t=["8K","4K","2K","FULL HD","HD"];for(const e of t)if(a.resolutions.has(e)){i.quality=e;break}}if(a.hdr.has("Dolby Vision")&&(i.dv=!0,i.hdr=!0),a.hdr.size>0){i.hdr=!0;const t=["HDR10+","HDR10","HDR"];for(const e of t)if(a.hdr.has(e)){i.hdr_type=e;break}}if(a.audio.size>0){const t=["7.1","5.1","4.0","2.0"];for(const e of t)if(a.audio.has(e)){i.sound=e;break}}e&&void 0===e.applecation_quality&&(e.applecation_quality=i,function(t,e){const n=t.render().find(".applecation__quality-badges");if(!n.length)return;const a=[];if(e.quality){let t="";"4K"===e.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM113 20.9092L74.1367 82.1367V97.6367H118.818V114H137.637V97.6367H149.182V81.8633H137.637V20.9092H113ZM162.841 20.9092V114H182.522V87.5459L192.204 75.7275L217.704 114H241.25L206.296 62.5908L240.841 20.9092H217.25L183.75 61.9541H182.522V20.9092H162.841ZM119.182 81.8633H93.9541V81.1367L118.454 42.3633H119.182V81.8633Z" fill="white"/></svg>':"2K"===e.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM110.608 19.6367C104.124 19.6367 98.3955 20.8638 93.4258 23.3184C88.4563 25.7729 84.5925 29.2428 81.835 33.7275C79.0775 38.2123 77.6992 43.5001 77.6992 49.5908H96.3809C96.3809 46.6212 96.9569 44.0607 98.1084 41.9092C99.2599 39.7578 100.896 38.1056 103.017 36.9541C105.138 35.8026 107.623 35.2275 110.472 35.2275C113.199 35.2276 115.639 35.7724 117.79 36.8633C119.941 37.9238 121.638 39.4542 122.881 41.4541C124.123 43.4238 124.744 45.7727 124.744 48.5C124.744 50.9545 124.244 53.2421 123.244 55.3633C122.244 57.4542 120.774 59.5906 118.835 61.7725C116.926 63.9543 114.562 66.4094 111.744 69.1367L78.6084 99.8184V114H144.972V97.9092H105.881V97.2725L119.472 83.9541C125.865 78.1361 130.82 73.1514 134.335 69C137.85 64.8182 140.29 61.0151 141.653 57.5908C143.047 54.1666 143.744 50.6968 143.744 47.1816C143.744 41.8182 142.366 37.0606 139.608 32.9092C136.851 28.7577 132.986 25.515 128.017 23.1816C123.077 20.8182 117.275 19.6368 110.608 19.6367ZM159.778 20.9092V114H179.46V87.5459L189.142 75.7275L214.642 114H238.188L203.233 62.5908L237.778 20.9092H214.188L180.688 61.9541H179.46V20.9092H159.778Z" fill="white"/></svg>':"FULL HD"===e.quality?t='<svg viewBox="331 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M622 0C633.046 3.57563e-06 642 8.95431 642 20V114C642 125.046 633.046 134 622 134H351C339.954 134 331 125.046 331 114V20C331 8.95431 339.954 0 351 0H622ZM362.341 20.9092V114H382.022V75.5459H419.887V59.3184H382.022V37.1367H423.978V20.9092H362.341ZM437.216 20.9092V114H456.897V75.5459H496.853V114H516.488V20.9092H496.853V59.3184H456.897V20.9092H437.216ZM532.716 20.9092V114H565.716C575.17 114 583.291 112.136 590.079 108.409C596.897 104.682 602.125 99.333 605.762 92.3633C609.428 85.3937 611.262 77.0601 611.262 67.3633C611.262 57.6968 609.428 49.3934 605.762 42.4541C602.125 35.5149 596.928 30.1969 590.171 26.5C583.413 22.7727 575.352 20.9092 565.988 20.9092H532.716ZM564.943 37.7725C570.761 37.7725 575.655 38.8027 579.625 40.8633C583.595 42.9239 586.579 46.1364 588.579 50.5C590.609 54.8636 591.625 60.4847 591.625 67.3633C591.625 74.3026 590.609 79.9694 588.579 84.3633C586.579 88.7269 583.579 91.955 579.579 94.0459C575.609 96.1063 570.715 97.1367 564.897 97.1367H552.397V37.7725H564.943Z" fill="white"/></svg>':"HD"===e.quality&&(t='<svg viewBox="662 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M953 0C964.046 3.57563e-06 973 8.95431 973 20V114C973 125.046 964.046 134 953 134H682C670.954 134 662 125.046 662 114V20C662 8.95431 670.954 0 682 0H953ZM731.278 20.9092V114H750.96V75.5459H790.915V114H810.551V20.9092H790.915V59.3184H750.96V20.9092H731.278ZM826.778 20.9092V114H859.778C869.233 114 877.354 112.136 884.142 108.409C890.96 104.682 896.188 99.333 899.824 92.3633C903.491 85.3937 905.324 77.0601 905.324 67.3633C905.324 57.6968 903.491 49.3934 899.824 42.4541C896.188 35.5149 890.991 30.1969 884.233 26.5C877.476 22.7727 869.414 20.9092 860.051 20.9092H826.778ZM859.006 37.7725C864.824 37.7725 869.718 38.8027 873.688 40.8633C877.657 42.9239 880.642 46.1364 882.642 50.5C884.672 54.8636 885.687 60.4847 885.688 67.3633C885.688 74.3026 884.672 79.9694 882.642 84.3633C880.642 88.7269 877.642 91.955 873.642 94.0459C869.672 96.1063 864.778 97.1367 858.96 97.1367H846.46V37.7725H859.006Z" fill="white"/></svg>'),t&&a.push(`<div class="quality-badge quality-badge--res">${t}</div>`)}e.dv&&a.push('<div class="quality-badge quality-badge--dv"><svg viewBox="0 0 1051 393" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,393) scale(0.1,-0.1)" fill="currentColor"><path d="M50 2905 l0 -1017 223 5 c146 4 244 11 287 21 361 85 638 334 753 677 39 116 50 211 44 366 -7 200 -52 340 -163 511 -130 199 -329 344 -574 419 -79 24 -102 26 -327 31 l-243 4 0 -1017z"/><path d="M2436 3904 c-443 -95 -762 -453 -806 -905 -30 -308 86 -611 320 -832 104 -99 212 -165 345 -213 133 -47 253 -64 468 -64 l177 0 0 1015 0 1015 -217 -1 c-152 0 -239 -5 -287 -15z"/><path d="M3552 2908 l3 -1013 425 0 c309 0 443 4 490 13 213 43 407 148 550 299 119 124 194 255 247 428 25 84 27 103 27 270 1 158 -2 189 -22 259 -72 251 -221 458 -424 590 -97 63 -170 97 -288 134 l-85 26 -463 4 -462 3 2 -1013z m825 701 c165 -22 283 -81 404 -199 227 -223 279 -550 133 -831 -70 -133 -176 -234 -319 -304 -132 -65 -197 -75 -490 -75 l-245 0 0 703 c0 387 3 707 7 710 11 11 425 8 510 -4z"/><path d="M7070 2905 l0 -1015 155 0 155 0 0 1015 0 1015 -155 0 -155 0 0 -1015z"/><path d="M7640 2905 l0 -1015 150 0 150 0 0 60 c0 33 2 60 5 60 2 0 33 -15 67 -34 202 -110 433 -113 648 -9 79 38 108 59 180 132 72 71 95 102 134 181 102 207 102 414 1 625 -120 251 -394 411 -670 391 -115 -8 -225 -42 -307 -93 -21 -13 -42 -23 -48 -23 -7 0 -10 125 -10 370 l0 370 -150 0 -150 0 0 -1015z m832 95 c219 -67 348 -310 280 -527 -62 -198 -268 -328 -466 -295 -96 15 -168 52 -235 119 -131 132 -164 311 -87 478 27 60 101 145 158 181 100 63 234 80 350 44z"/><path d="M6035 3286 c-253 -49 -460 -232 -542 -481 -23 -70 -26 -96 -26 -210 0 -114 3 -140 26 -210 37 -113 90 -198 177 -286 84 -85 170 -138 288 -177 67 -22 94 -26 207 -26 113 0 140 4 207 26 119 39 204 92 288 177 87 89 140 174 177 286 22 67 26 99 27 200 1 137 -14 207 -69 320 -134 277 -457 440 -760 381z m252 -284 c117 -37 206 -114 260 -229 121 -253 -38 -548 -321 -595 -258 -43 -503 183 -483 447 20 271 287 457 544 377z"/><path d="M9059 3258 c10 -24 138 -312 285 -642 l266 -598 -72 -162 c-39 -88 -78 -171 -86 -183 -37 -58 -132 -80 -208 -48 l-35 14 -18 -42 c-10 -23 -37 -84 -60 -135 -23 -52 -39 -97 -36 -102 3 -4 40 -23 83 -41 70 -31 86 -34 177 -34 93 0 105 2 167 33 76 37 149 104 180 166 29 57 799 1777 805 1799 5 16 -6 17 -161 15 l-167 -3 -185 -415 c-102 -228 -192 -431 -200 -450 l-15 -35 -201 453 -201 452 -168 0 -168 0 18 -42z"/><path d="M2650 968 c0 -2 81 -211 179 -463 l179 -460 59 -3 59 -3 178 453 c98 249 180 459 183 466 4 9 -13 12 -65 12 -47 0 -71 -4 -74 -12 -3 -7 -65 -176 -138 -375 -73 -200 -136 -363 -139 -363 -3 0 -67 168 -142 373 l-136 372 -72 3 c-39 2 -71 1 -71 0z"/><path d="M3805 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 466 0 465 -60 0 c-39 0 -62 -4 -65 -12z"/><path d="M4580 960 c-97 -16 -178 -72 -211 -145 -23 -50 -24 -143 -3 -193 32 -77 91 -117 244 -167 99 -32 146 -64 166 -112 28 -65 -11 -149 -83 -179 -78 -33 -212 -1 -261 61 l-19 24 -48 -43 -48 -42 43 -37 c121 -103 347 -112 462 -17 54 44 88 120 88 194 -1 130 -79 213 -242 256 -24 7 -71 25 -104 41 -48 22 -66 37 -79 65 -32 67 -5 138 65 174 73 37 193 18 244 -39 l20 -22 43 43 c41 40 42 43 25 61 -27 30 -102 64 -167 76 -64 12 -70 12 -135 1z"/><path d="M5320 505 l0 -465 65 0 65 0 0 465 0 465 -65 0 -65 0 0 -465z"/><path d="M6210 960 c-147 -25 -264 -114 -328 -249 -32 -65 -36 -84 -40 -175 -7 -161 33 -271 135 -367 140 -132 360 -164 541 -77 227 108 316 395 198 634 -88 177 -290 271 -506 234z m232 -132 c100 -46 165 -136 188 -261 20 -106 -18 -237 -88 -310 -101 -105 -245 -132 -377 -73 -74 33 -120 79 -157 154 -31 62 -33 74 -33 167 0 87 4 107 26 155 64 137 173 204 320 196 43 -2 85 -12 121 -28z"/><path d="M7135 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 376 c0 207 3 374 8 371 4 -2 115 -171 247 -375 l240 -371 78 0 77 0 0 465 0 465 -60 0 -60 0 -2 -372 -3 -372 -241 370 -241 369 -82 3 c-59 2 -83 -1 -86 -10z"/></g></svg></div>');e.hdr&&e.hdr_type&&a.push('<div class="quality-badge quality-badge--hdr"><svg viewBox="-1 178 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="181.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M27.2784 293V199.909H46.9602V238.318H86.9148V199.909H106.551V293H86.9148V254.545H46.9602V293H27.2784ZM155.778 293H122.778V199.909H156.051C165.415 199.909 173.475 201.773 180.233 205.5C186.991 209.197 192.188 214.515 195.824 221.455C199.491 228.394 201.324 236.697 201.324 246.364C201.324 256.061 199.491 264.394 195.824 271.364C192.188 278.333 186.96 283.682 180.142 287.409C173.354 291.136 165.233 293 155.778 293ZM142.46 276.136H154.96C160.778 276.136 165.672 275.106 169.642 273.045C173.642 270.955 176.642 267.727 178.642 263.364C180.672 258.97 181.688 253.303 181.688 246.364C181.688 239.485 180.672 233.864 178.642 229.5C176.642 225.136 173.657 221.924 169.688 219.864C165.718 217.803 160.824 216.773 155.006 216.773H142.46V276.136ZM215.903 293V199.909H252.631C259.661 199.909 265.661 201.167 270.631 203.682C275.631 206.167 279.434 209.697 282.04 214.273C284.676 218.818 285.994 224.167 285.994 230.318C285.994 236.5 284.661 241.818 281.994 246.273C279.328 250.697 275.464 254.091 270.403 256.455C265.373 258.818 259.282 260 252.131 260H227.54V244.182H248.949C252.706 244.182 255.828 243.667 258.312 242.636C260.797 241.606 262.646 240.061 263.858 238C265.1 235.939 265.722 233.379 265.722 230.318C265.722 227.227 265.1 224.621 263.858 222.5C262.646 220.379 260.782 218.773 258.267 217.682C255.782 216.561 252.646 216 248.858 216H235.585V293H215.903ZM266.176 250.636L289.312 293H267.585L244.949 250.636H266.176Z" fill="currentColor"/></svg></div>');if(e.sound){let t="";"7.1"===e.sound?t='<svg viewBox="-1 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M91.6023 483L130.193 406.636V406H85.2386V389.909H150.557V406.227L111.92 483H91.6023ZM159.545 484.182C156.545 484.182 153.97 483.121 151.818 481C149.697 478.848 148.636 476.273 148.636 473.273C148.636 470.303 149.697 467.758 151.818 465.636C153.97 463.515 156.545 462.455 159.545 462.455C162.455 462.455 165 463.515 167.182 465.636C169.364 467.758 170.455 470.303 170.455 473.273C170.455 475.273 169.939 477.106 168.909 478.773C167.909 480.409 166.591 481.727 164.955 482.727C163.318 483.697 161.515 484.182 159.545 484.182ZM215.045 389.909V483H195.364V408.591H194.818L173.5 421.955V404.5L196.545 389.909H215.045Z" fill="currentColor"/></svg>':"5.1"===e.sound?t='<svg viewBox="330 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="333.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M443.733 484.273C437.309 484.273 431.581 483.091 426.551 480.727C421.551 478.364 417.581 475.106 414.642 470.955C411.703 466.803 410.172 462.045 410.051 456.682H429.142C429.354 460.288 430.869 463.212 433.688 465.455C436.506 467.697 439.854 468.818 443.733 468.818C446.824 468.818 449.551 468.136 451.915 466.773C454.309 465.379 456.172 463.455 457.506 461C458.869 458.515 459.551 455.667 459.551 452.455C459.551 449.182 458.854 446.303 457.46 443.818C456.097 441.333 454.203 439.394 451.778 438C449.354 436.606 446.581 435.894 443.46 435.864C440.733 435.864 438.081 436.424 435.506 437.545C432.96 438.667 430.975 440.197 429.551 442.136L412.051 439L416.46 389.909H473.369V406H432.688L430.278 429.318H430.824C432.46 427.015 434.93 425.106 438.233 423.591C441.536 422.076 445.233 421.318 449.324 421.318C454.93 421.318 459.93 422.636 464.324 425.273C468.718 427.909 472.188 431.53 474.733 436.136C477.278 440.712 478.536 445.985 478.506 451.955C478.536 458.227 477.081 463.803 474.142 468.682C471.233 473.53 467.157 477.348 461.915 480.136C456.703 482.894 450.642 484.273 443.733 484.273ZM500.733 484.182C497.733 484.182 495.157 483.121 493.006 481C490.884 478.848 489.824 476.273 489.824 473.273C489.824 470.303 490.884 467.758 493.006 465.636C495.157 463.515 497.733 462.455 500.733 462.455C503.642 462.455 506.188 463.515 508.369 465.636C510.551 467.758 511.642 470.303 511.642 473.273C511.642 475.273 511.127 477.106 510.097 478.773C509.097 480.409 507.778 481.727 506.142 482.727C504.506 483.697 502.703 484.182 500.733 484.182ZM556.233 389.909V483H536.551V408.591H536.006L514.688 421.955V404.5L537.733 389.909H556.233Z" fill="currentColor"/></svg>':"2.0"===e.sound&&(t='<svg viewBox="661 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="664.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M722.983 483V468.818L756.119 438.136C758.938 435.409 761.301 432.955 763.21 430.773C765.15 428.591 766.619 426.455 767.619 424.364C768.619 422.242 769.119 419.955 769.119 417.5C769.119 414.773 768.498 412.424 767.256 410.455C766.013 408.455 764.316 406.924 762.165 405.864C760.013 404.773 757.574 404.227 754.847 404.227C751.998 404.227 749.513 404.803 747.392 405.955C745.271 407.106 743.634 408.758 742.483 410.909C741.331 413.061 740.756 415.621 740.756 418.591H722.074C722.074 412.5 723.453 407.212 726.21 402.727C728.968 398.242 732.831 394.773 737.801 392.318C742.771 389.864 748.498 388.636 754.983 388.636C761.65 388.636 767.453 389.818 772.392 392.182C777.362 394.515 781.225 397.758 783.983 401.909C786.741 406.061 788.119 410.818 788.119 416.182C788.119 419.697 787.422 423.167 786.028 426.591C784.665 430.015 782.225 433.818 778.71 438C775.195 442.152 770.241 447.136 763.847 452.955L750.256 466.273V466.909H789.347V483H722.983ZM815.108 484.182C812.108 484.182 809.532 483.121 807.381 481C805.259 478.848 804.199 476.273 804.199 473.273C804.199 470.303 805.259 467.758 807.381 465.636C809.532 463.515 812.108 462.455 815.108 462.455C818.017 462.455 820.563 463.515 822.744 465.636C824.926 467.758 826.017 470.303 826.017 473.273C826.017 475.273 825.502 477.106 824.472 478.773C823.472 480.409 822.153 481.727 820.517 482.727C818.881 483.697 817.078 484.182 815.108 484.182ZM874.483 485.045C866.665 485.015 859.938 483.091 854.301 479.273C848.695 475.455 844.377 469.924 841.347 462.682C838.347 455.439 836.862 446.727 836.892 436.545C836.892 426.394 838.392 417.742 841.392 410.591C844.422 403.439 848.741 398 854.347 394.273C859.983 390.515 866.695 388.636 874.483 388.636C882.271 388.636 888.968 390.515 894.574 394.273C900.21 398.03 904.544 403.485 907.574 410.636C910.604 417.758 912.104 426.394 912.074 436.545C912.074 446.758 910.559 455.485 907.528 462.727C904.528 469.97 900.225 475.5 894.619 479.318C889.013 483.136 882.301 485.045 874.483 485.045ZM874.483 468.727C879.816 468.727 884.074 466.045 887.256 460.682C890.438 455.318 892.013 447.273 891.983 436.545C891.983 429.485 891.256 423.606 889.801 418.909C888.377 414.212 886.347 410.682 883.71 408.318C881.104 405.955 878.028 404.773 874.483 404.773C869.18 404.773 864.938 407.424 861.756 412.727C858.574 418.03 856.968 425.97 856.938 436.545C856.938 443.697 857.65 449.667 859.074 454.455C860.528 459.212 862.574 462.788 865.21 465.182C867.847 467.545 870.938 468.727 874.483 468.727Z" fill="currentColor"/></svg>'),t&&a.push(`<div class="quality-badge quality-badge--sound">${t}</div>`)}e.dub&&a.push('<div class="quality-badge quality-badge--dub"><svg viewBox="-1 558 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="561.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M60.5284 673H27.5284V579.909H60.8011C70.1648 579.909 78.2254 581.773 84.983 585.5C91.7405 589.197 96.9375 594.515 100.574 601.455C104.241 608.394 106.074 616.697 106.074 626.364C106.074 636.061 104.241 644.394 100.574 651.364C96.9375 658.333 91.7102 663.682 84.892 667.409C78.1042 671.136 69.983 673 60.5284 673ZM47.2102 656.136H59.7102C65.5284 656.136 70.4223 655.106 74.392 653.045C78.392 650.955 81.392 647.727 83.392 643.364C85.4223 638.97 86.4375 633.303 86.4375 626.364C86.4375 619.485 85.4223 613.864 83.392 609.5C81.392 605.136 78.4072 601.924 74.4375 599.864C70.4678 597.803 65.5739 596.773 59.7557 596.773H47.2102V656.136ZM178.153 579.909H197.835V640.364C197.835 647.152 196.214 653.091 192.972 658.182C189.759 663.273 185.259 667.242 179.472 670.091C173.684 672.909 166.941 674.318 159.244 674.318C151.517 674.318 144.759 672.909 138.972 670.091C133.184 667.242 128.684 663.273 125.472 658.182C122.259 653.091 120.653 647.152 120.653 640.364V579.909H140.335V638.682C140.335 642.227 141.108 645.379 142.653 648.136C144.229 650.894 146.441 653.061 149.29 654.636C152.138 656.212 155.456 657 159.244 657C163.063 657 166.381 656.212 169.199 654.636C172.047 653.061 174.244 650.894 175.79 648.136C177.366 645.379 178.153 642.227 178.153 638.682V579.909ZM214.028 673V579.909H251.301C258.15 579.909 263.862 580.924 268.438 582.955C273.013 584.985 276.453 587.803 278.756 591.409C281.059 594.985 282.21 599.106 282.21 603.773C282.21 607.409 281.483 610.606 280.028 613.364C278.574 616.091 276.574 618.333 274.028 620.091C271.513 621.818 268.634 623.045 265.392 623.773V624.682C268.938 624.833 272.256 625.833 275.347 627.682C278.468 629.53 280.998 632.121 282.938 635.455C284.877 638.758 285.847 642.697 285.847 647.273C285.847 652.212 284.619 656.621 282.165 660.5C279.741 664.348 276.15 667.394 271.392 669.636C266.634 671.879 260.771 673 253.801 673H214.028ZM233.71 656.909H249.756C255.241 656.909 259.241 655.864 261.756 653.773C264.271 651.652 265.528 648.833 265.528 645.318C265.528 642.742 264.907 640.47 263.665 638.5C262.422 636.53 260.65 634.985 258.347 633.864C256.074 632.742 253.362 632.182 250.21 632.182H233.71V656.909ZM233.71 618.864H248.301C250.998 618.864 253.392 618.394 255.483 617.455C257.604 616.485 259.271 615.121 260.483 613.364C261.725 611.606 262.347 609.5 262.347 607.045C262.347 603.682 261.15 600.97 258.756 598.909C256.392 596.848 253.028 595.818 248.665 595.818H233.71V618.864Z" fill="currentColor"/></svg></div>');a.length>0&&(n.html(a.join("")),n.addClass("show"))}(e,i))},t=>{})}function _(){console.log("Applecation","v"+t),Lampa.Platform.screen("tv")?(function(){const t=Lampa.Api.sources.tmdb;if(!t)return;if(window.Lampa&&Lampa.TMDB&&Lampa.TMDB.api){const t=Lampa.TMDB.api;Lampa.TMDB.api=function(e){let n=e;if("string"==typeof n&&-1!==n.indexOf("append_to_response=")&&-1===n.indexOf("images")&&(n=n.replace("append_to_response=","append_to_response=images,"),-1===n.indexOf("include_image_language="))){const t=Lampa.Storage.field("tmdb_lang")||Lampa.Storage.get("language")||"ru";n+=(-1===n.indexOf("?")?"?":"&")+"include_image_language=en,null,"+t}return t.call(Lampa.TMDB,n)}}const e=Lampa.Template.js;Lampa.Template.js=function(t,n){if("full_episode"===t&&n&&(n.runtime>0?n.time=Lampa.Utils.secondsToTimeHuman(60*n.runtime).replace(/\./g,""):n.time="",n.air_date)){const t=new Date(n.air_date.replace(/-/g,"/")),e=t.getMonth()+1,a=Lampa.Lang.translate("month_"+e+"_e"),i=f("year_short");n.date=t.getDate()+" "+a+" "+t.getFullYear()+i}return e.call(Lampa.Template,t,n)};const n=t.img;t.img=function(e,a){const i=Lampa.Storage.field("poster_size");if("w1280"===a){a={w200:"w780",w300:"w1280",w500:"original"}[i]||"w1280"}if("w300"===a){a={w200:"w300",w300:"w780",w500:"w780"}[i]||"w300"}return"w276_and_h350_face"===a&&"w500"===i&&(a="w600_and_h900_face"),n.call(t,e,a)},Lampa.Api.img=t.img}(),C(),y(),function(){const t="<style>\n\n/* Основной контейнер */\n.applecation {\n    transition: all .3s;\n}\n\n.applecation .full-start-new__body {\n    height: 80vh;\n}\n\n.applecation .full-start-new__right {\n    display: flex;\n    align-items: flex-end;\n}\n\n.applecation .full-start-new__title {\n    font-size: 2.5em;\n    font-weight: 700;\n    line-height: 1.2;\n    margin-bottom: 0.5em;\n    text-shadow: 0 0 .1em rgba(0, 0, 0, 0.3);\n}\n\n/* Логотип */\n.applecation__logo {\n    margin-bottom: 0.5em;\n    opacity: 0;\n    transform: translateY(20px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n}\n\n.applecation__logo.loaded {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.applecation__logo img {\n    display: block;\n    max-width: 35vw;\n    max-height: 180px;\n    width: auto;\n    height: auto;\n    object-fit: contain;\n    object-position: left center;\n}\n\n/* Контейнер для масштабируемого контента */\n.applecation__content-wrapper {\n    font-size: 100%;\n}\n\n/* Мета информация (Тип/Жанр/поджанр) */\n.applecation__meta {\n    display: flex;\n    align-items: center;\n    color: #fff;\n    font-size: 1.1em;\n    margin-bottom: 0.5em;\n    line-height: 1;\n    opacity: 0;\n    transform: translateY(15px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n    transition-delay: 0.05s;\n}\n\n.applecation__meta.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.applecation__meta-left {\n    display: flex;\n    align-items: center;\n    line-height: 1;\n}\n\n.applecation__network {\n    display: inline-flex;\n    align-items: center;\n    line-height: 1;\n    margin-right: 1em;\n}\n\n.applecation__network img {\n    display: block;\n    max-height: 0.8em;\n    width: auto;\n    object-fit: contain;\n    filter: brightness(0) invert(1);\n}\n\n.applecation__meta-text {\n    line-height: 1;\n}\n\n.applecation__meta .full-start__pg {\n    margin: 0 0 0 0.6em;\n    padding: 0.2em 0.5em;\n    font-size: 0.85em;\n    font-weight: 600;\n    border: 1.5px solid rgba(255, 255, 255, 0.4);\n    border-radius: 0.3em;\n    background: rgba(255, 255, 255, 0.1);\n    color: rgba(255, 255, 255, 0.9);\n    line-height: 1;\n    vertical-align: middle;\n}\n\n/* Рейтинги */\n.applecation__ratings {\n    display: flex;\n    align-items: center;\n    gap: 0.8em;\n    margin-bottom: 0.5em;\n    opacity: 0;\n    transform: translateY(15px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n    transition-delay: 0.08s;\n}\n\n.applecation__ratings.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n/* Встроенные рейтинги: плавное появление контента внутри уже показанного блока */\n.applecation__ratings-builtin {\n    display: flex;\n    align-items: center;\n    gap: 0.8em;\n}\n\n@keyframes applecation-ratings-in {\n    from {\n        opacity: 0;\n        transform: translateY(15px);\n    }\n    to {\n        opacity: 1;\n        transform: translateY(0);\n    }\n}\n\n/* Каждый рейтинг анимируется при вставке. До раскрытия карточки анимация на паузе. */\n.applecation__ratings-builtin > div {\n    opacity: 0;\n    transform: translateY(15px);\n    animation: applecation-ratings-in 0.4s ease-out both;\n    animation-play-state: paused;\n}\n\n.applecation__ratings.show .applecation__ratings-builtin > div {\n    animation-play-state: running;\n}\n\n.applecation__ratings .rate--imdb,\n.applecation__ratings .rate--kp,\n.applecation__ratings .rate--tmdb,\n.applecation__ratings .rate--tomatoes,\n.applecation__ratings .rate--popcorn,\n.applecation__ratings .rate--metacritic,\n.applecation__ratings .rate--letterboxd,\n.applecation__ratings .rate--trakt,\n.applecation__ratings .rate--myanimelist,\n.applecation__ratings .builtin-rate--imdb,\n.applecation__ratings .builtin-rate--kp,\n.applecation__ratings .builtin-rate--tmdb,\n.applecation__ratings .builtin-rate--tomatoes,\n.applecation__ratings .builtin-rate--popcorn,\n.applecation__ratings .builtin-rate--metacritic,\n.applecation__ratings .builtin-rate--letterboxd,\n.applecation__ratings .builtin-rate--trakt,\n.applecation__ratings .builtin-rate--myanimelist {\n    display: flex;\n    align-items: center;\n    gap: 0.35em;\n}\n\n.applecation__ratings svg {\n    width: 1.8em;\n    height: auto;\n    flex-shrink: 0;\n    color: rgba(255, 255, 255, 0.85);\n}\n\n.applecation__ratings .rate--kp svg,\n.applecation__ratings .builtin-rate--kp svg {\n    width: 1.5em;\n}\n\n.applecation__ratings .rate--tmdb svg {\n    width: 1.6em;\n}\n\n.applecation__ratings .builtin-rate--tmdb svg {\n    width: 1.35em;\n}\n\n.applecation__ratings .rate--tomatoes svg,\n.applecation__ratings .builtin-rate--tomatoes svg {\n    width: 1.3em;\n}\n\n.applecation__ratings .rate--popcorn svg,\n.applecation__ratings .builtin-rate--popcorn svg {\n    width: 1em;\n}\n\n.applecation__ratings .rate--metacritic svg,\n.applecation__ratings .builtin-rate--metacritic svg {\n    width: 1.3em;\n}\n\n.applecation__ratings .rate--letterboxd svg,\n.applecation__ratings .builtin-rate--letterboxd svg {\n    width: 1.6em;\n}\n\n.applecation__ratings .rate--trakt svg,\n.applecation__ratings .builtin-rate--trakt svg {\n    width: 1.3em;\n}\n\n.applecation__ratings .rate--myanimelist svg,\n.applecation__ratings .builtin-rate--myanimelist svg {\n    width: 1.8em;\n}\n\n.applecation__ratings > div > div {\n    font-size: 0.95em;\n    font-weight: 600;\n    line-height: 1;\n    color: #fff;\n}\n\n/* Управление видимостью рейтингов через настройки */\nbody.applecation--hide-ratings .applecation__ratings {\n    display: none !important;\n}\n\n/* Скрытие рейтингов в зависимости от источника */\n/* Когда выбраны встроенные рейтинги - скрываем контейнеры для внешних плагинов */\nbody.applecation--ratings-source-builtin .applecation__ratings .rate--imdb,\nbody.applecation--ratings-source-builtin .applecation__ratings .rate--kp,\nbody.applecation--ratings-source-builtin .applecation__ratings .rate--tmdb {\n    display: none !important;\n}\n\n/* Когда выбраны внешние рейтинги - скрываем встроенные */\nbody.applecation--ratings-source-external .applecation__ratings-builtin {\n    display: none !important;\n}\n\n/* Расположение рейтингов - в правом нижнем углу */\nbody.applecation--ratings-corner .applecation__right {\n    gap: 1em;\n}\n\nbody.applecation--ratings-corner .applecation__ratings {\n    margin-bottom: 0;\n}\n\n/* Обертка для описания */\n.applecation__description-wrapper {\n    background-color: transparent;\n    padding: 0;\n    border-radius: 1em;\n    width: fit-content;\n    opacity: 0;\n    transform: translateY(15px);\n    transition:\n        padding 0.25s ease,\n        transform 0.25s ease,\n        opacity 0.4s ease-out;\n    transition-delay: 0.1s;\n}\n\n.applecation__description-wrapper.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.applecation__description-wrapper.focus {\n  background: linear-gradient(\n    135deg,\n    rgba(255, 255, 255, 0.28),\n    rgba(255, 255, 255, 0.18)\n  );\n  padding: .15em .4em 0 .7em;\n  border-radius: 1em;\n  width: fit-content;\n\n//   box-shadow:\n//     inset 0 1px 0 rgba(255, 255, 255, 0.35),\n//     0 8px 24px rgba(0, 0, 0, 0.25);\n  box-shadow:\n    inset 0 1px 0 rgba(255, 255, 255, 0.35);\n\n  transform: scale(1.07) translateY(0);\n  \n  transition-delay: 0s;\n}\n\n/* Описание */\n.applecation__description {\n    color: rgba(255, 255, 255, 0.6);\n    font-size: 0.95em;\n    line-height: 1.5;\n    margin-bottom: 0.5em;\n    max-width: 35vw;\n    display: -webkit-box;\n    -webkit-line-clamp: 4;\n    -webkit-box-orient: vertical;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n\n.focus .applecation__description {\n  color: rgba(255, 255, 255, 0.92);\n}\n\n/* Дополнительная информация (Год/длительность) */\n.applecation__info {\n    color: rgba(255, 255, 255, 0.75);\n    font-size: 1em;\n    line-height: 1.4;\n    margin-bottom: 0.5em;\n    opacity: 0;\n    transform: translateY(15px);\n    transition: opacity 0.4s ease-out, transform 0.4s ease-out;\n    transition-delay: 0.15s;\n}\n\n.applecation__info.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n/* Левая и правая части */\n.applecation__left {\n    flex-grow: 1;\n}\n\n.applecation__right {\n    display: flex;\n    align-items: center;\n    flex-shrink: 0;\n    position: relative;\n}\n\n/* Выравнивание по baseline если рейтинги в углу */\nbody.applecation--ratings-corner .applecation__right {\n    align-items: last baseline;\n}\n\n/* Реакции */\n.applecation .full-start-new__reactions {\n    margin: 0;\n    display: flex;\n    flex-direction: column-reverse;\n    align-items: flex-end;\n}\n\n.applecation .full-start-new__reactions > div {\n    align-self: flex-end;\n}\n\n.applecation .full-start-new__reactions:not(.focus) {\n    margin: 0;\n}\n\n.applecation .full-start-new__reactions:not(.focus) > div:not(:first-child) {\n    display: none;\n}\n\n/* Стили первой реакции (всегда видимой) */\n.applecation .full-start-new__reactions > div:first-child .reaction {\n    display: flex !important;\n    align-items: center !important;\n    background-color: rgba(0, 0, 0, 0) !important;\n    gap: 0 !important;\n}\n\n.applecation .full-start-new__reactions > div:first-child .reaction__icon {\n    background-color: rgba(0, 0, 0, 0.3) !important;\n    -webkit-border-radius: 5em;\n    -moz-border-radius: 5em;\n    border-radius: 5em;\n    padding: 0.5em;\n    width: 2.6em !important;\n    height: 2.6em !important;\n}\n\n.applecation .full-start-new__reactions > div:first-child .reaction__count {\n    font-size: 1.2em !important;\n    font-weight: 500 !important;\n}\n\n/* При фокусе реакции раскрываются вверх */\n.applecation .full-start-new__reactions.focus {\n    gap: 0.5em;\n}\n\n.applecation .full-start-new__reactions.focus > div {\n    display: block;\n}\n\n/* Скрываем стандартный rate-line (используется только для статуса) */\n.applecation .full-start-new__rate-line {\n    margin: 0;\n    height: 0;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n}\n\n/* Фон - переопределяем стандартную анимацию на fade */\n.full-start__background {\n    height: calc(100% + 6em);\n    left: 0 !important;\n    opacity: 0 !important;\n    transition: opacity 0.6s ease-out, filter 0.3s ease-out !important;\n    animation: none !important;\n    transform: none !important;\n    will-change: opacity, filter;\n}\n\n.full-start__background.loaded:not(.dim) {\n    opacity: 1 !important;\n}\n\n.full-start__background.dim {\n  filter: blur(30px);\n}\n\n/* Удерживаем opacity при загрузке нового фона */\n.full-start__background.loaded.applecation-animated {\n    opacity: 1 !important;\n}\n\nbody:not(.menu--open) .full-start__background {\n    mask-image: none;\n}\n\n/* Отключаем стандартную анимацию Lampa для фона */\nbody.advanced--animation:not(.no--animation) .full-start__background.loaded {\n    animation: none !important;\n}\n\n/* Скрываем статус для предотвращения выхода реакций за экран */\n.applecation .full-start__status {\n    display: none;\n}\n\n/* Оверлей для затемнения левого края */\n.applecation__overlay {\n    width: 90vw;\n    background: linear-gradient(to right, rgba(0, 0, 0, 0.792) 0%, rgba(0, 0, 0, 0.504) 25%, rgba(0, 0, 0, 0.264) 45%, rgba(0, 0, 0, 0.12) 55%, rgba(0, 0, 0, 0.043) 60%, rgba(0, 0, 0, 0) 65%);\n}\n\n/* Бейджи качества */\n.applecation__quality-badges {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.4em;\n    margin-left: 0.6em;\n    opacity: 0;\n    transform: translateY(10px);\n    transition: opacity 0.3s ease-out, transform 0.3s ease-out;\n}\n\n.applecation__quality-badges.show {\n    opacity: 1;\n    transform: translateY(0);\n}\n\n.quality-badge {\n    display: inline-flex;\n    height: 0.8em;\n}\n\n.quality-badge svg {\n    height: 100%;\n    width: auto;\n    display: block;\n}\n\n.quality-badge--res svg {\n    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));\n}\n\n.quality-badge--dv svg,\n.quality-badge--hdr svg,\n.quality-badge--sound svg,\n.quality-badge--dub svg {\n    color: rgba(255, 255, 255, 0.85);\n    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));\n}\n\n/* Эпизоды Apple TV */\n.applecation .full-episode--small {\n    width: 20em !important;\n    height: auto !important;\n    margin-right: 1.5em !important;\n    background: none !important;\n    display: flex !important;\n    flex-direction: column !important;\n    transition: transform 0.3s !important;\n}\n\n.applecation .full-episode--small.focus {\n    transform: scale(1.02);\n}\n\n.applecation .full-episode--next .full-episode__img::after {\n  border: none !important;\n}\n\n.applecation .full-episode__img {\n    padding-bottom: 56.25% !important;\n    border-radius: 0.8em !important;\n    margin-bottom: 1em !important;\n    background-color: rgba(255,255,255,0.05) !important;\n    position: relative !important;\n    overflow: visible !important;\n}\n\n.applecation .full-episode__img img {\n    border-radius: 0.8em !important;\n    object-fit: cover !important;\n}\n\n.applecation .full-episode__time {\n    position: absolute;\n    bottom: 0.8em;\n    left: 0.8em;\n    background: rgba(0,0,0,0.6);\n    padding: 0.2em 0.5em;\n    border-radius: 0.4em;\n    font-size: 0.75em;\n    font-weight: 600;\n    color: #fff;\n    backdrop-filter: blur(5px);\n    z-index: 2;\n}\n\n.applecation .full-episode__time:empty {\n    display: none;\n}\n\n.applecation .full-episode__body {\n    position: static !important;\n    display: flex !important;\n    flex-direction: column !important;\n    background: none !important;\n    padding: 0 0.5em !important;\n    opacity: 0.6;\n    transition: opacity 0.3s;\n}\n\n.applecation .full-episode.focus .full-episode__body {\n    opacity: 1;\n}\n\n.applecation .full-episode__num {\n    font-size: 0.75em !important;\n    font-weight: 600 !important;\n    text-transform: uppercase !important;\n    color: rgba(255,255,255,0.4) !important;\n    margin-bottom: 0.2em !important;\n    letter-spacing: 0.05em !important;\n}\n\n.applecation .full-episode__name {\n    font-size: 1.1em !important;\n    font-weight: 600 !important;\n    color: #fff !important;\n    margin-bottom: 0.4em !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    line-height: 1.4 !important;\n    padding-bottom: 0.1em !important;\n}\n\n.applecation .full-episode__overview {\n    font-size: 0.85em !important;\n    line-height: 1.4 !important;\n    color: rgba(255,255,255,0.5) !important;\n    display: -webkit-box !important;\n    -webkit-line-clamp: 2 !important;\n    -webkit-box-orient: vertical !important;\n    overflow: hidden !important;\n    margin-bottom: 0.6em !important;\n    height: 2.8em !important;\n}\n\n.applecation .full-episode__date {\n    font-size: 0.8em !important;\n    color: rgba(255,255,255,0.3) !important;\n}\n\n\n/* =========================================================\n   БАЗА: ничего не блюрим/не затемняем без фокуса\n   ========================================================= */\n\n.applecation .full-episode{\n  position: relative;\n  z-index: 1;\n  opacity: 1;\n  filter: none;\n\n  transition: transform .6s cubic-bezier(.16,1,.3,1);\n}\n\n/* без фокуса — вообще без эффектов */\n.applecation .full-episode:not(.focus){\n  transform: none;\n}\n\n/* фокус — мягкий “apple” подъём */\n.applecation .full-episode.focus{\n  z-index: 10;\n  transform: scale(1.03) translateY(-6px);\n}\n\n\n/* =========================================================\n   КАРТИНКА\n   ========================================================= */\n\n.applecation .full-episode__img{\n  position: relative;\n  overflow: hidden;\n  border-radius: inherit;\n\n  transition:\n    box-shadow .6s cubic-bezier(.16,1,.3,1),\n    backdrop-filter .6s cubic-bezier(.16,1,.3,1),\n    transform .6s cubic-bezier(.16,1,.3,1);\n}\n\n\n/* =========================================================\n   ЖИДКОЕ СТЕКЛО — ТОЛЬКО НА ФОКУСЕ\n   ========================================================= */\n\n.applecation .full-episode.focus .full-episode__img{\n  box-shadow:\n    0 0 0 1px rgba(255,255,255,.18),\n    0 26px 65px rgba(0,0,0,.4) !important;\n\n  -webkit-backdrop-filter: blur(14px) saturate(1.25) contrast(1.05);\n  backdrop-filter: blur(14px) saturate(1.25) contrast(1.05);\n\n  background: rgba(255,255,255,.06);\n}\n\n/* толщина стекла */\n.applecation .full-episode.focus .full-episode__img::before{\n  content: '';\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  pointer-events: none;\n  z-index: 2;\n\n  box-shadow:\n    inset 0 0 0 1px rgba(255,255,255,.22),\n    inset 0 0 18px rgba(255,255,255,.12),\n    inset 0 -14px 22px rgba(0,0,0,.18);\n\n  filter: blur(.35px);\n  opacity: 1;\n  transition: opacity .45s ease;\n}\n\n/* блик */\n.applecation .full-episode.focus .full-episode__img::after{\n  content: '';\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  pointer-events: none;\n  z-index: 3;\n\n  background:\n    radial-gradient(120% 85% at 18% 10%,\n      rgba(255,255,255,.38),\n      rgba(255,255,255,.10) 38%,\n      transparent 62%),\n    linear-gradient(135deg,\n      rgba(255,255,255,.20),\n      rgba(255,255,255,0) 52%,\n      rgba(255,255,255,.06));\n\n  mix-blend-mode: screen;\n  opacity: .95;\n\n  transition:\n    opacity .45s ease,\n    transform .65s cubic-bezier(.16,1,.3,1);\n}\n\n/* когда фокуса нет — просто не показываем слои стекла */\n.applecation .full-episode:not(.focus) .full-episode__img::before,\n.applecation .full-episode:not(.focus) .full-episode__img::after{\n  opacity: 0;\n}\n\n/* убрать старый оверлей */\n.applecation .full-episode.focus::after{\n  display: none !important;\n}\n\n\n\n.applecation .full-episode__viewed {\n    top: 0.8em !important;\n    right: 0.8em !important;\n    background: rgba(0,0,0,0.5) !important;\n    border-radius: 50% !important;\n    padding: 0.3em !important;\n    backdrop-filter: blur(10px) !important;\n}\n\n/* Статус следующей серии */\n.applecation .full-episode--next .full-episode__img:after {\n    border-radius: 0.8em !important;\n}\n\n/* Оверлей для полного описания */\n.applecation-description-overlay {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    z-index: 9999;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    opacity: 0;\n    visibility: hidden;\n    pointer-events: none;\n    transition: opacity 0.3s ease, visibility 0.3s ease;\n}\n\n.applecation-description-overlay.show {\n    opacity: 1;\n    visibility: visible;\n    pointer-events: all;\n}\n\n.applecation-description-overlay__bg {\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    -webkit-backdrop-filter: blur(100px);\n    backdrop-filter: blur(100px);\n}\n\n.applecation-description-overlay__content {\n    position: relative;\n    z-index: 1;\n    max-width: 60vw;\n    max-height: 90vh;\n    overflow-y: auto;\n}\n\n.applecation-description-overlay__logo {\n    text-align: center;\n    margin-bottom: 1.5em;\n    display: none;\n}\n\n.applecation-description-overlay__logo img {\n    max-width: 40vw;\n    max-height: 150px;\n    width: auto;\n    height: auto;\n    object-fit: contain;\n}\n\n.applecation-description-overlay__title {\n    font-size: 2em;\n    font-weight: 600;\n    margin-bottom: 1em;\n    color: #fff;\n    text-align: center;\n}\n\n.applecation-description-overlay__text {\n    font-size: 1.2em;\n    line-height: 1.6;\n    color: rgba(255, 255, 255, 0.9);\n    white-space: pre-wrap;\n    margin-bottom: 1.5em;\n}\n\n.applecation-description-overlay__details {\n    display: flex;\n    flex-wrap: wrap;\n    margin: -1em;\n}\n\n.applecation-description-overlay__details > * {\n    margin: 1em;\n}\n\n.applecation-description-overlay__info-name {\n    font-size: 1.1em;\n    margin-bottom: 0.5em;\n}\n\n.applecation-description-overlay__info-body {\n    font-size: 1.2em;\n    opacity: 0.6;\n}\n\n/* Скроллбар для описания */\n.applecation-description-overlay__content::-webkit-scrollbar {\n    width: 0.5em;\n}\n\n.applecation-description-overlay__content::-webkit-scrollbar-track {\n    background: rgba(255, 255, 255, 0.1);\n    border-radius: 1em;\n}\n\n.applecation-description-overlay__content::-webkit-scrollbar-thumb {\n    background: rgba(255, 255, 255, 0.3);\n    border-radius: 1em;\n}\n\n.applecation-description-overlay__content::-webkit-scrollbar-thumb:hover {\n    background: rgba(255, 255, 255, 0.5);\n}\n\n/* =========================================================\n   ПЕРСОНЫ (АКТЕРЫ И СЪЕМОЧНАЯ ГРУППА) - APPLE TV СТИЛЬ\n   ========================================================= */\n\n.applecation .full-person {\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    width: 10.7em !important;\n    background: none !important;\n    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;\n    will-change: transform;\n    -webkit-animation: none !important;\n    animation: none !important;\n    margin-left: 0;\n}\n\n.applecation .full-person.focus {\n    transform: scale(1.08) translateY(-6px) !important;\n    z-index: 10;\n}\n\n/* Фото персоны - круглое */\n.applecation .full-person__photo {\n    position: relative !important;\n    width: 9.4em !important;\n    height: 9.4em !important;\n    margin: 0 0 .3em 0 !important;\n    border-radius: 50% !important;\n    overflow: hidden !important;\n    background: rgba(255, 255, 255, 0.05) !important;\n    flex-shrink: 0 !important;\n    transition: \n        box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        backdrop-filter 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        -webkit-backdrop-filter 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),\n        background 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;\n    will-change: transform, box-shadow, backdrop-filter;\n    -webkit-animation: none !important;\n    animation: none !important;\n}\n\n.applecation .full-person__photo img {\n    width: 100% !important;\n    height: 100% !important;\n    object-fit: cover !important;\n    border-radius: 50% !important;\n}\n\n/* Смещаем лицо только при высоком качестве (w500), так как там другой кроп у TMDB */\n.applecation.applecation--poster-high .full-person__photo img {\n    object-position: center calc(50% + 20px) !important;\n}\n\n/* Дефолтные заглушки оставляем по центру, чтобы не ломать симметрию иконок */\n.applecation .full-person__photo img[src*=\"actor.svg\"],\n.applecation .full-person__photo img[src*=\"img_broken.svg\"] {\n    object-position: center !important;\n}\n\n/* ЖИДКОЕ СТЕКЛО — БАЗОВЫЕ СЛОИ (скрыты) */\n.applecation .full-person__photo::before,\n.applecation .full-person__photo::after {\n    content: '';\n    position: absolute;\n    inset: 0;\n    border-radius: 50%;\n    pointer-events: none;\n    opacity: 0;\n    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;\n    will-change: opacity;\n}\n\n/* толщина стекла */\n.applecation .full-person__photo::before {\n    z-index: 2;\n    box-shadow:\n        inset 2px 2px 1px rgba(255, 255, 255, 0.30),\n        inset -2px -2px 2px rgba(255, 255, 255, 0.30);\n}\n\n/* ореол и блик */\n.applecation .full-person__photo::after {\n    z-index: 3;\n    background:\n        radial-gradient(circle at center,\n            transparent 58%,\n            rgba(255, 255, 255, 0.22) 75%,\n            rgba(255, 255, 255, 0.38) 90%),\n        radial-gradient(120% 85% at 18% 10%,\n            rgba(255, 255, 255, 0.35),\n            rgba(255, 255, 255, 0.10) 38%,\n            transparent 62%);\n    mix-blend-mode: screen;\n}\n\n/* ЭФФЕКТЫ ПРИ ФОКУСЕ */\n\n.applecation .full-person.focus .full-person__photo::before,\n.applecation .full-person.focus .full-person__photo::after {\n    opacity: 1;\n}\n\n.applecation .full-person.focus .full-person__photo::after {\n    opacity: 0.9;\n}\n\n/* Текстовая информация */\n.applecation .full-person__body {\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    text-align: center !important;\n    width: 100% !important;\n    padding: 0 0.3em !important;\n}\n\n/* Имя персоны */\n.applecation .full-person__name {\n    font-size: 1em !important;\n    font-weight: 600 !important;\n    color: #fff !important;\n    line-height: 1.3 !important;\n    width: 100% !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    position: relative !important;\n}\n\n/* Бегущая строка для длинных имен */\n.applecation .full-person__name.marquee-active {\n    text-overflow: clip !important;\n    mask-image: linear-gradient(to right, #000 92%, transparent 100%);\n    -webkit-mask-image: linear-gradient(to right, #000 92%, transparent 100%);\n}\n\n/* При фокусе (когда строка едет) прозрачность с обеих сторон */\n.applecation .full-person.focus .full-person__name.marquee-active {\n    mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);\n    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%);\n}\n\n.applecation .marquee__inner {\n    display: inline-block;\n    white-space: nowrap;\n}\n\n.applecation .marquee__inner span {\n    padding-right: 2.5em;\n    display: inline-block;\n}\n\n/* Запуск анимации при фокусе */\n.applecation .full-person.focus .full-person__name.marquee-active .marquee__inner {\n    animation: marquee var(--marquee-duration, 5s) linear infinite;\n}\n\n@keyframes marquee {\n    0% { transform: translateX(0); }\n    100% { transform: translateX(-50%); }\n}\n\n/* Роль персоны */\n.applecation .full-person__role {\n    font-size: 0.8em !important;\n    font-weight: 400 !important;\n    color: rgba(255, 255, 255, 0.5) !important;\n    line-height: 1.3 !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    width: 100% !important;\n    margin-top: 0;\n}\n\n.applecation .full-person.focus .full-person__role {\n    color: rgb(255, 255, 255) !important;\n}\n\n/* ОТКЛЮЧЕНИЕ ЖИДКОГО СТЕКЛА */\nbody.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img,\nbody.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo {\n    backdrop-filter: none !important;\n    -webkit-backdrop-filter: none !important;\n    background: rgba(255,255,255,0.05) !important;\n    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;\n}\n\nbody.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img::before,\nbody.applecation--no-liquid-glass .applecation .full-episode.focus .full-episode__img::after,\nbody.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo::before,\nbody.applecation--no-liquid-glass .applecation .full-person.focus .full-person__photo::after {\n    display: none !important;\n}\n\n/* Секция «Подробно» оставлена только ради штатного warning-box--full-adult; остальное скрыто */\n.applecation .items-line:has(.warning-box--full-adult) .items-line__head,\n.applecation .items-line:has(.warning-box--full-adult) .full-descr__text,\n.applecation .items-line:has(.warning-box--full-adult) .full-descr__details,\n.applecation .items-line:has(.warning-box--full-adult) .full-descr__tags {\n    display: none !important;\n}\n\n.applecation .items-line:has(.warning-box--full-adult) .items-line__body {\n    padding-top: 0;\n}\n</style>";Lampa.Template.add("applecation_css",t),$("body").append(Lampa.Template.get("applecation_css",{},!0))}(),function(){void 0===Lampa.Storage.get("applecation_show_ratings")&&Lampa.Storage.set("applecation_show_ratings",!1);void 0===Lampa.Storage.get("applecation_ratings_source")&&Lampa.Storage.set("applecation_ratings_source","external");void 0===Lampa.Storage.get("applecation_ratings_position")&&Lampa.Storage.set("applecation_ratings_position","card");void 0===Lampa.Storage.get("applecation_mdblist_api_key")&&Lampa.Storage.set("applecation_mdblist_api_key","");void 0===Lampa.Storage.get("applecation_kp_api_key")&&Lampa.Storage.set("applecation_kp_api_key","");if(void 0===Lampa.Storage.get("applecation_enabled_ratings")){const t=!!Lampa.Storage.get("applecation_kp_api_key","");Lampa.Storage.set("applecation_enabled_ratings",t?["imdb","kp"]:["imdb"])}else{if(!!!Lampa.Storage.get("applecation_kp_api_key","")){const t=Lampa.Storage.get("applecation_enabled_ratings",["imdb"]);Array.isArray(t)&&t.includes("kp")&&Lampa.Storage.set("applecation_enabled_ratings",t.filter(t=>"kp"!==t))}}void 0===Lampa.Storage.get("applecation_logo_scale")&&Lampa.Storage.set("applecation_logo_scale","100");void 0===Lampa.Storage.get("applecation_text_scale")&&Lampa.Storage.set("applecation_text_scale","100");void 0===Lampa.Storage.get("applecation_spacing_scale")&&Lampa.Storage.set("applecation_spacing_scale","100");void 0===Lampa.Storage.get("applecation_reverse_episodes")&&Lampa.Storage.set("applecation_reverse_episodes",!0);void 0===Lampa.Storage.get("applecation_description_overlay")&&Lampa.Storage.set("applecation_description_overlay",!0);void 0===Lampa.Storage.get("applecation_show_foreign_logo")&&Lampa.Storage.set("applecation_show_foreign_logo",!0);void 0===Lampa.Storage.get("applecation_liquid_glass")&&Lampa.Storage.set("applecation_liquid_glass",!0);void 0===Lampa.Storage.get("applecation_show_episode_count")&&Lampa.Storage.set("applecation_show_episode_count",!1);Lampa.SettingsApi.addComponent({component:"applecation_settings",name:"Applecation",icon:e}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_about",type:"static"},field:{name:"<div>Applecation v1.2.1</div>"},onRender:function(t){t.css("opacity","0.7"),t.find(".settings-param__name").css({"font-size":"1.2em","margin-bottom":"0.3em"}),t.append('<div style="font-size: 0.9em; padding: 0 1.2em; line-height: 1.4;">'+f("about_author")+": DarkestClouds<br>"+f("about_description")+"</div>")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_ratings_title",type:"title"},field:{name:f("settings_title_ratings")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_show_ratings",type:"trigger",default:!1},field:{name:f("show_ratings"),description:f("show_ratings_desc")},onChange:function(t){t?$("body").removeClass("applecation--hide-ratings"):$("body").addClass("applecation--hide-ratings"),Lampa.Settings.update()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_ratings_source",type:"select",values:{external:f("ratings_source_external"),builtin:f("ratings_source_builtin")},default:"external"},field:{name:f("ratings_source"),description:f("ratings_source_desc")},onChange:function(t){Lampa.Storage.set("applecation_ratings_source",t),$("body").removeClass("applecation--ratings-source-external applecation--ratings-source-builtin"),$("body").addClass("applecation--ratings-source-"+t),Lampa.Settings.update()},onRender:function(t){Lampa.Storage.get("applecation_show_ratings",!1)?t.show():t.hide()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_mdblist_api_key",type:"button",default:""},field:{name:f("mdblist_api_key"),description:f("mdblist_api_key_desc")},onChange:function(){const t=Lampa.Storage.get("applecation_mdblist_api_key","");Lampa.Input.edit({title:f("mdblist_api_key"),value:t,free:!0,nosave:!0},function(e){e!==t&&(Lampa.Storage.set("applecation_mdblist_api_key",e),Lampa.Storage.set(a,{}),Lampa.Noty.show(f("mdblist_api_key")+" "+(e?Lampa.Lang.translate("settings_saved"):Lampa.Lang.translate("settings_cleared"))))})},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();"external"===Lampa.Storage.get("applecation_ratings_source","external")?t.hide():t.show()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_kp_api_key",type:"button",default:""},field:{name:f("kp_api_key"),description:f("kp_api_key_desc")},onChange:function(){const t=Lampa.Storage.get("applecation_kp_api_key","");Lampa.Input.edit({title:f("kp_api_key"),value:t,free:!0,nosave:!0},function(e){if(e!==t&&(Lampa.Storage.set("applecation_kp_api_key",e),Lampa.Storage.set(a,{}),Lampa.Noty.show(f("kp_api_key")+" "+(e?Lampa.Lang.translate("settings_saved"):Lampa.Lang.translate("settings_cleared"))),!e)){const t=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]);Array.isArray(t)&&t.includes("kp")&&Lampa.Storage.set("applecation_enabled_ratings",t.filter(t=>"kp"!==t))}})},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();"external"===Lampa.Storage.get("applecation_ratings_source","external")?t.hide():t.show()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_enabled_ratings",type:"button",default:["imdb","kp"]},field:{name:f("enabled_ratings"),description:f("enabled_ratings_desc")},onChange:function(){let t=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]);const e=!!Lampa.Storage.get("applecation_kp_api_key","");!e&&Array.isArray(t)&&t.includes("kp")&&(t=t.filter(t=>"kp"!==t),Lampa.Storage.set("applecation_enabled_ratings",t));const n=[{title:f("rating_imdb"),value:"imdb",checkbox:!0,checked:t.includes("imdb")},{title:f("rating_tmdb"),value:"tmdb",checkbox:!0,checked:t.includes("tmdb")},{title:f("rating_tomatoes"),value:"tomatoes",checkbox:!0,checked:t.includes("tomatoes")},{title:f("rating_popcorn"),value:"popcorn",checkbox:!0,checked:t.includes("popcorn")},{title:f("rating_metacritic"),value:"metacritic",checkbox:!0,checked:t.includes("metacritic")},{title:f("rating_letterboxd"),value:"letterboxd",checkbox:!0,checked:t.includes("letterboxd")},{title:f("rating_trakt"),value:"trakt",checkbox:!0,checked:t.includes("trakt")},{title:f("rating_mal"),value:"myanimelist",checkbox:!0,checked:t.includes("myanimelist")}];e&&n.splice(1,0,{title:f("rating_kp"),value:"kp",checkbox:!0,checked:t.includes("kp")}),Lampa.Select.show({title:f("enabled_ratings"),items:n,onCheck:function(t){const e=!!Lampa.Storage.get("applecation_kp_api_key",""),n=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]).filter(t=>!!e||"kp"!==t);if(t.checked)n.includes(t.value)||n.push(t.value);else{const e=n.indexOf(t.value);e>-1&&n.splice(e,1)}Lampa.Storage.set("applecation_enabled_ratings",n)},onBack:function(){Lampa.Controller.toggle("settings_component")}})},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();"external"===Lampa.Storage.get("applecation_ratings_source","external")?t.hide():t.show()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_ratings_position",type:"select",values:{card:f("position_card"),corner:f("position_corner")},default:"card"},field:{name:f("ratings_position"),description:f("ratings_position_desc")},onChange:function(t){Lampa.Storage.get("applecation_ratings_source","external"),Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]);Lampa.Storage.set("applecation_ratings_position",t),$("body").removeClass("applecation--ratings-card applecation--ratings-corner"),$("body").addClass("applecation--ratings-"+t),C(),y(),Lampa.Activity.back()},onRender:function(t){if(!Lampa.Storage.get("applecation_show_ratings",!1))return void t.hide();Lampa.Storage.get("applecation_ratings_source","external"),Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"])}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_display_title",type:"title"},field:{name:f("settings_title_display")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"card_interfice_reactions",type:"trigger",default:!0},field:{name:f("show_reactions"),description:f("show_reactions_desc")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_show_foreign_logo",type:"trigger",default:!0},field:{name:f("show_foreign_logo"),description:f("show_foreign_logo_desc")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_reverse_episodes",type:"trigger",default:!0},field:{name:f("reverse_episodes"),description:f("reverse_episodes_desc")},onChange:function(t){Lampa.Storage.set("applecation_reverse_episodes",t)}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_description_overlay",type:"trigger",default:!0},field:{name:f("description_overlay"),description:f("description_overlay_desc")},onChange:function(t){Lampa.Storage.set("applecation_description_overlay",t)}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_show_episode_count",type:"trigger",default:!1},field:{name:f("show_episode_count"),description:f("show_episode_count_desc")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_liquid_glass",type:"trigger",default:!0},field:{name:f("liquid_glass"),description:f("liquid_glass_desc")},onChange:function(t){Lampa.Storage.set("applecation_liquid_glass",t),v()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_scaling_title",type:"title"},field:{name:f("settings_title_scaling")}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_logo_scale",type:"select",values:{50:"50%",60:"60%",70:"70%",80:"80%",90:"90%",100:f("scale_default"),110:"110%",120:"120%",130:"130%",140:"140%",150:"150%",160:"160%",170:"170%",180:"180%"},default:"100"},field:{name:f("logo_scale"),description:f("logo_scale_desc")},onChange:function(t){Lampa.Storage.set("applecation_logo_scale",t),b()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_text_scale",type:"select",values:{50:"50%",60:"60%",70:"70%",80:"80%",90:"90%",100:f("scale_default"),110:"110%",120:"120%",130:"130%",140:"140%",150:"150%",160:"160%",170:"170%",180:"180%"},default:"100"},field:{name:f("text_scale"),description:f("text_scale_desc")},onChange:function(t){Lampa.Storage.set("applecation_text_scale",t),b()}}),Lampa.SettingsApi.addParam({component:"applecation_settings",param:{name:"applecation_spacing_scale",type:"select",values:{50:"50%",60:"60%",70:"70%",80:"80%",90:"90%",100:f("scale_default"),110:"110%",120:"120%",130:"130%",140:"140%",150:"150%",160:"160%",170:"170%",180:"180%",200:"200%",250:"250%",300:"300%"},default:"100"},field:{name:f("spacing_scale"),description:f("spacing_scale_desc")},onChange:function(t){Lampa.Storage.set("applecation_spacing_scale",t),b()}}),Lampa.Storage.get("applecation_show_ratings",!1)||$("body").addClass("applecation--hide-ratings");$("body").addClass("applecation--ratings-"+Lampa.Storage.get("applecation_ratings_position","card"));const t=Lampa.Storage.get("applecation_ratings_source","external");$("body").addClass("applecation--ratings-source-"+t),b()}(),v(),Lampa.Listener.follow("full",t=>{if(window.__stvMobileComponents)return;if(Lampa.Storage.get("applecation_description_overlay",!0)&&function(t){if("start"===t.type&&t.link){const e=t.data&&t.data.movie;if(e&&e.adult&&!Lampa.Storage.field("adult_content_view"))return;const n=t.link.rows,a=n.indexOf("description");a>-1&&n.splice(a,1)}}(t),"complite"===t.type){const n=t.object.activity,a=n.render();a.addClass("applecation");const i=t.data,o=i&&i.movie;Lampa.Storage.get("applecation_description_overlay",!0)&&o&&o.adult&&!Lampa.Storage.field("adult_content_view")&&function(t){const e=t.find(".items-line .warning-box--full-adult");if(!e.length)return;const n=e.closest(".full-descr").find(".full-descr__left").first();n.length&&n.find(".selector").filter(function(){const t=$(this);return!t.hasClass("warning-box")&&!t.closest(".warning-box").length}).removeClass("selector")}(a),n.__destroyed=!1;var e=n.destroy;n.destroy=function(){n.__destroyed=!0,e&&e.apply(n,arguments)};const l=Lampa.Storage.field("poster_size");a.toggleClass("applecation--poster-high","w500"===l),function(t){const e=t.render().find(".full-start__background");e.length&&!e.next(".applecation__overlay").length&&e.after('<div class="full-start__background loaded applecation__overlay"></div>')}(n),k(t),o&&function(t,e){if(!Lampa.Storage.get("applecation_show_ratings",!1))return;const n=t.render().find(".applecation__ratings");n.length&&"builtin"===Lampa.Storage.get("applecation_ratings_source","external")&&g.fetch(e,n=>{m(t)&&function(t,e,n){const a=t.render().find(".applecation__ratings");if(!a.length)return;const i=!!Lampa.Storage.get("applecation_kp_api_key",""),o=Lampa.Storage.get("applecation_enabled_ratings",["imdb","kp"]).filter(t=>!!i||"kp"!==t),l=Lampa.Storage.get("applecation_ratings_source","external");if("builtin"!==l)return;let r=a.find(".applecation__ratings-builtin");r.length||(r=$('<div class="applecation__ratings-builtin hide"></div>'),a.append(r)),r.removeClass("show").addClass("hide").empty();const s="builtin-rate--",p={tomatoes:{fresh:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 138.75 141.25"><g fill="#f93208"><path d="m20.154 40.829c-28.149 27.622-13.657 61.011-5.734 71.931 35.254 41.954 92.792 25.339 111.89-5.9071 4.7608-8.2027 22.554-53.467-23.976-78.009z"/><path d="m39.613 39.265 4.7778-8.8607 28.406-5.0384 11.119 9.2082z"/></g><path d="m39.436 8.5696 8.9682-5.2826 6.7569 15.479c3.7925-6.3226 13.79-16.316 24.939-4.6684-4.7281 1.2636-7.5161 3.8553-7.7397 8.4768 15.145-4.1697 31.343 3.2127 33.539 9.0911-10.951-4.314-27.695 10.377-41.771 2.334 0.009 15.045-12.617 16.636-19.902 17.076 2.077-4.996 5.591-9.994 1.474-14.987-7.618 8.171-13.874 10.668-33.17 4.668 4.876-1.679 14.843-11.39 24.448-11.425-6.775-2.467-12.29-2.087-17.814-1.475 2.917-3.961 12.149-15.197 28.625-8.476z" fill="#02902e"/></svg>',certified:'<svg viewBox="0 0 264 264"xmlns=http://www.w3.org/2000/svg><g id=layer1><path d="m37.343 201c-64.636-75.11-21.896-199.45 92.547-200.68 109.5-1.9185 166 117.79 98.07 200.36z"id=path3406 fill=#fa6d0e /></g><g id=layer2><path d="m39.391 194.45c-5.232-6.2-9.522-12.72-13.649-20.73-6.979-13.55-11.103-27.74-12.599-43.34-0.60643-6.3238-0.44896-18.969 0.307-24.652 1.9531-14.684 5.7507-27.003 12.112-39.293 18.411-35.567 52.726-57.341 95.518-60.608 5.327-0.40672 17.081-0.40573 21.912 0.00186 26.228 2.2125 49.157 11.341 67.929 27.045 20.207 16.904 33.673 39.672 38.885 65.748 1.6378 8.1935 1.8934 11.156 1.8916 21.922-0.002 10.239-0.13698 12.089-1.4281 19.534-1.3592 7.838-3.1873 14.455-6.0824 22.015-1.9226 5.0206-5.4869 12.588-7.5942 16.124-0.76237 1.279-1.4706 2.5348-1.5739 2.7906-0.40166 0.99471-5.8217 8.831-8.4607 12.233l-2.7782 3.5809-73.628 0.008c-40.495 0.005-81.465 0.0864-91.042 0.18233l-17.414 0.1745-2.3083-2.7351z"id=path3414 fill=#ffd600 /></g><g id=layer3 fill-rule=evenodd stroke=#000 stroke-width=1px><g><path d="m60.733 41.274c-13.825 0.77302-13.491 15.928-7.5773 20.321 5.7404 4.7541 19.245 4.1115 18.714-10.677h-4.7071c0.81464 7.4274-6.1664 10.215-10.792 6.544-3.1787-2.4792-3.3966-10.664 4.4775-11.366z"id=path3419 /><path d="m65.98 34.008 13.236-8.3473 1.9042 3.1531-9.4084 5.8018 2.8029 4.2282 8.8344-5.7404 1.8566 3.1392-8.6581 5.5386 2.6069 4.2479 9.2936-5.6452 1.8427 2.9629-13.094 7.9414z"id=path3463 /><path d="m87.732 21.446 6.8212 20.517 5.2278-2.019-2.3576-6.936 2.411-0.80365 5.7125 5.6255 5.7485-1.9378-6.6391-6.0987c5.8115-6.7807-0.73197-16.414-12.805-10.333z"id=path3487 /><path d="m110.12 14.044 0.73063 4.6679 6.1697-0.89299 1.9078 17.332 4.7085-0.64945-2.0295-17.048 6.3321-1.0554-0.4465-4.5055z"id=path3513 /><path d="m136.55 12.177-1.1365 21.838 4.7897 0.32472 1.2177-21.919z"id=path3515 /><path d="m152.46 14.288-5.2768 20.782 4.3026 1.1365 2.2731-8.3616 8.8487 2.5166 0.97417-3.8967-8.6864-2.5166 1.1365-4.5461 9.4982 2.5166 1.0554-4.3026z"id=path3517 /><path d="m175.41 20.871-9.0758 19.895 4.3358 2.0608 9.1811-19.941z"id=path3519 /><path d="m189.41 27.48 12.708 9.1323-2.2071 2.949-8.9107-6.5405-2.8659 4.1857 8.6381 6.0316-2.212 2.8997-8.3849-5.944-2.9577 4.0115 8.7225 6.4929-2.0539 2.8206-12.278-9.1525z"id=path3521 /><path d="m209.61 42.295-15.749 14.45c2.101 4.1046 11.445 15.188 21.269 6.6568 7.7467-7.7002 0.46855-14.925-5.5203-21.107z"id=path3523 /></g><path d="m93.601 23.867 2.2731 5.845c2.2103-1.0484 7.5812-1.814 5.845-6.0886-1.7638-2.4625-4.5169-1.7258-8.1181 0.24354z"id=path3597 fill=#ffd600 /><path d="m209.38 48.512-9.5145 8.7794c0.96874 2.2553 5.9216 8.786 12.12 3.0671 5.1113-5.0568 0.43115-8.5523-2.6052-11.847z"id=path3600 fill=#ffd600 /></g><g id=layer4><path d="m52.811 196.72c-29.827-32.21-35.027-109.5 35.131-128.81l87.488-1.608c64.955 14.227 70.868 92.462 35.131 129.96z"id=path3605 fill=#fa3008 /></g><g id=layer5><g fill=#fff><path d="m44.545 110.85v41.675h11.251v-15.269h16.647v-9.6438h-16.647v-7.118h17.68v-9.6438z"id=path3702 /><path d="m76.806 110.96v41.101h11.251v-12.399h3.7886l7.334 12.703h13.331l-8.6418-14.968c11.722-6.4577 8.299-26.954-8.0052-26.781 0 0-19.173 0.34442-19.058 0.34442z"id=path3704 /><path d="m114.46 111.19v41.445h31.802v-10.218h-19.517v-6.4292h18.369v-9.6438h-18.369v-5.7404h19.632v-9.6438z"id=path3706 /><path d="m174.28 125.31 7.0032-7.5773c-5.6401-9.8066-31.184-12.207-32.261 5.8552-0.0651 10.857 10.676 12.689 16.647 13.547 9.1514 1.1745 4.5108 5.4184 2.1813 5.97-4.1015 0.3558-9.5196-1.8055-12.858-6.3144l-7.118 7.3476c12.082 15.461 29.732 6.958 32.376 2.8702 9.8557-16.106-10.255-23.046-16.417-22.043-4.5744 0.5052-4.1267-6.0987 2.2962-4.5923 2.1102 0.54658 3.4808 0.3029 8.1513 4.9367z"id=path3708 /><path d="m185.07 110.73v42.249h11.825v-16.417h12.055v16.303h11.94v-42.019h-12.055v15.499h-11.94v-15.499z"id=path3710 /></g><path d="m88.287 121.18v8.4957c5.4584-0.16649 10.747 0.86766 10.792-4.4775 0.05152-3.6316-3.2768-4.8952-10.792-4.0182z"id=path3712 fill=#fa3008 /></g><g id=layer6><path d="m6.9717 230.41c6.2855-7.2889 16.555-13.98 31.498-19.97l24.841 36.694c-15.721 0.33212-26.526 9.2959-32.797 16.561-2.5232-9.7958-3.895-19.592-2.1107-29.387-10.522-4.6768-14.817-3.1271-21.432-3.8967z"id=path3895 fill=#04c754 /><path d="m257.99 230.07c-6.2855-7.2889-16.555-13.98-31.498-19.97l-24.841 36.694c15.721 0.33212 26.526 9.2959 32.797 16.561 2.5232-9.7958 3.895-19.592 2.1107-29.387 10.522-4.6768 14.817-3.1271 21.432-3.8967z"id=path3961 fill=#04c754 /><path d="m30.166 214.17c3.5218-1.832 4.8782-2.4512 8.4068-3.6212l9.2431 33.319z"id=path4029 fill=#00ac40 /><path d="m234.73 213.72c-3.5218-1.832-4.8782-2.4512-8.4068-3.6212l-9.2431 33.319z"id=path4031 fill=#00ac40 /><path d="m47.588 243.74 15.556 3.0424-0.68884-7.9791z"id=path4033 fill=#009c34 /><path d="m202.92 240.06-1.2055 6.8884 15.958-3.0424z"id=path4035 fill=#009c34 /></g><g id=layer7 fill=#01912c><path d="m30.686 197.59 16.786 46.372c57.615-9.8616 114.29-9.3656 170.17-0.1802l16.642-46.273c-71.73-11.24-135.24-12.64-203.59 0.08z"id=path4037 /><path d="m95.793 191.42 2.1107-3.7343 7.5498-1.7048 7.631 5.0332z"id=path4307 /></g><g id=layer8><g id=g4262 fill=#f9f517 transform="matrix(.24170 0 0 .24170 49.363 178.57)"><path d="m105.8 102.98-8.0172-0.10423v-50.619-50.619h24.186c26.088 0 28.291 0.12542 34.659 1.9732 10.334 2.9985 18.223 9.4964 22.57 18.591 2.1141 4.4222 2.9427 7.9588 3.1597 13.486 0.49026 12.49-4.8082 23.35-14.188 29.082-2.8096 1.7169-2.9403 1.8527-2.4829 2.5796 1.2343 1.9616 20.736 35.548 20.736 35.713 0 0.1025-7.4426 0.18636-16.539 0.18636h-16.539l-9.5998-16.167c-5.2799-8.8917-9.8029-16.445-10.051-16.784-0.33627-0.45988-1.1926-0.66814-3.3574-0.81651l-2.906-0.19918 0.1815 16.983 0.1815 16.983-6.9879-0.0828c-3.8433-0.0455-10.596-0.12973-15.005-0.18705zm35.703-56.479c6.7674-1.4238 10.228-4.6666 10.607-9.9384 0.26462-3.6861-0.61122-6.2013-2.9536-8.482-3.1044-3.0227-7.4377-4.0701-16.926-4.0912l-5.0084-0.0111 0.23412 3.2983c0.12877 1.814 0.23412 7.1086 0.23412 11.766v8.4675l5.6751-0.24535c3.1213-0.13495 6.7833-0.47851 8.1378-0.76348z"id=path3554 /><path d="m218.68 104.68c-8.9254-1.007-16.797-4.9792-23.157-11.686-7.2226-7.6165-11.109-16.992-11.521-27.797-0.22097-5.7879 0.2163-9.6195 1.5977-14 5.206-16.508 19.973-26.343 40.714-27.116 3.5416-0.13202 6.6611-0.0434 8.8279 0.25076 17.801 2.4166 30.891 14.819 34.788 32.96 0.82406 3.8358 0.81686 12.628-0.0133 16.27-3.4361 15.073-14.036 25.493-29.983 29.475-6.315 1.5768-15.528 2.2888-21.255 1.6427h-0.00001zm9.7895-12.053c3.4979-1.0388 4.9377-2.9451 4.899-6.4866-0.013-1.1891-0.28397-2.8511-0.60221-3.6933-1.675-4.4332-1.6614-4.3761-1.2552-5.2676 0.21765-0.47768 0.78769-1.0471 1.2668-1.2654 1.1551-0.52631 1.8453-0.0729 3.4061 2.2376 2.2156 3.2798 6.2083 7.0112 8.7996 8.2239 2.0783 0.97253 2.6624 1.089 4.8436 0.96575 2.166-0.1224 2.733-0.31414 4.4738-1.5131 2.2856-1.5742 2.9015-2.8565 2.8796-5.996-0.0219-3.1463-1.6539-5.7434-4.8982-7.7954-1.9849-1.2554-6.2108-2.548-9.285-2.84-3.9203-0.37243-5.3039-1.0122-5.8047-2.6839-0.48683-1.6249 0.0253-2.9578 1.5779-4.1069 0.79157-0.58585 1.76-0.78306 4.6842-0.95387 2.3539-0.13749 4.0903-0.42912 4.8039-0.80682 5.1061-2.7026 5.4383-11.468 0.56294-14.856-1.364-0.9479-1.8674-1.0841-3.9636-1.0725-4.8275 0.0268-8.0918 3.1872-9.6325 9.3261-0.12439 0.49562-0.60784 1.313-1.0743 1.8163-0.9863 1.0642-2.8395 1.226-4.4579 0.38911-1.6309-0.84339-1.8399-2.6938-0.90178-7.9844 1.1672-6.5826 0.53375-9.3395-2.5629-11.154-1.9709-1.155-5.4749-1.5596-7.5568-0.87248-1.8355 0.60576-4.2268 3.0607-4.7778 4.905-1.1107 3.7172-0.22935 6.0738 3.8878 10.396 1.7296 1.8156 3.2504 3.6341 3.3796 4.0411 0.59081 1.8615-1.6535 3.9975-3.7227 3.543-1.1806-0.25929-2.3025-1.4025-4.1283-4.2067-2.9344-4.5068-7.0321-5.9454-11.069-3.8859-3.4732 1.7719-4.3725 5.7747-2.0664 9.1975 1.3375 1.9852 3.7393 3.3086 7.44 4.0994 5.3584 1.1451 6.8669 2.3079 5.4052 4.1662-0.75801 0.96366-0.83096 0.9792-3.3251 0.7083-3.7655-0.409-5.2238-0.25808-7.3156 0.75707-2.1787 1.0573-3.1289 2.2273-3.7222 4.5835-1.1898 4.725 2.1398 8.9112 7.0702 8.8892 2.5959-0.0116 4.5669-1.083 7.8614-4.2736 3.6397-3.525 4.2895-3.8967 5.4654-3.1262 1.2859 0.84253 1.4466 2.0917 0.56544 4.3943-2.0038 5.2363-0.15432 10.68 4.1498 12.214 1.8042 0.64317 2.5 0.6414 4.7-0.0119z"id=path3556 /><path d="m310.73 103.24c-13.527-0.86538-20.855-4.6291-24.882-12.779-2.7931-5.6532-3.4544-10.408-3.7959-27.295l-0.23135-11.44h-1.89c-1.0395 0-2.6423-0.10312-3.5617-0.22914l-1.6717-0.22914v-12.382-12.382h3.7834 3.7834v-10.81-10.81h14.773 14.773v10.81 10.81h6.1255 6.1255v12.792 12.792h-6.1255-6.1255l0.001 11.44c0.001 10.711 0.0462 11.514 0.70471 12.594 1.2297 2.017 2.1917 2.2695 8.6444 2.2695h5.7831v12.611 12.611l-6.0354-0.0538c-3.3195-0.0296-7.9001-0.17311-10.179-0.31891z"id=path3558 /><path d="m365.58 102.87c-15.629-1.5099-22.78-7.8138-25.148-22.169-0.41928-2.541-0.6553-7.1627-0.82014-16.06-0.12729-6.8705-0.36628-12.627-0.53108-12.791-0.1648-0.16485-1.8268-0.35591-3.6933-0.42459l-3.3937-0.12486v-12.577-12.577h4.0064 4.0064l-0.26587-10.81-0.26587-10.81h14.816 14.816v10.99 10.99h6.1255 6.1255v12.611 12.611h-6.144-6.144l0.10857 11.62c0.0984 10.534 0.16986 11.711 0.76417 12.586 1.4074 2.0734 2.088 2.2667 8.4426 2.3982l5.8553 0.12108v12.4 12.4l-7.837-0.0491c-4.3104-0.027-9.1809-0.17894-10.823-0.33763z"id=path3560 /><path d="m425.4 87.386c-12.392-1.5612-23.904-7.7739-29.557-15.952-5.3449-7.7317-8.0642-16.437-8.0697-25.834-0.008-13.574 5.9092-24.516 17.388-32.154 7.1893-4.7836 12.745-6.3503 23.579-6.6497 5.523-0.1526 6.9942-0.0741 9.9106 0.52869 5.7317 1.1847 10.724 3.5398 14.889 7.0243 3.7102 3.1035 7.8573 9.2211 9.9488 14.676 2.507 6.5385 3.9263 17.032 3.034 22.43l-0.22334 1.3512h-26.076c-14.342 0-26.076 0.137-26.076 0.30446 0 0.16745 0.62239 1.2674 1.3831 2.4444 3.3244 5.1435 8.6222 7.7076 15.898 7.6943 5.4469-0.01 10.592-1.4423 14.27-3.973l1.4804-1.0186 8.2565 7.7551c4.5411 4.2653 8.475 7.9652 8.742 8.2221 0.75121 0.7224 0.0562 1.6522-3.1554 4.2219-4.9481 3.9589-11.022 6.685-18.337 8.23-4.0389 0.85301-13.138 1.2205-17.284 0.69813zm15.261-50.147c-0.59675-3.7319-2.7937-6.5239-6.4972-8.257-4.0532-1.8967-9.342-1.7323-13.564 0.42183-2.8638 1.461-5.5299 4.8747-6.2366 7.9854l-0.2218 0.97626 2.9759 0.12145c1.6367 0.0668 7.6583 0.15445 13.381 0.19478l10.405 0.0734-0.24243-1.5161z"id=path3562 /><path d="m473.24 64.698v-38.915h14.593 14.593v5.4048c0 2.9727 0.12161 5.4037 0.27025 5.4023 0.14863-0.001 1.081-0.98805 2.0719-2.1925 3.3319-4.05 8.4992-7.6668 13.356-9.348 15.184-5.2565 31.395 6.568 33.649 24.545 0.23146 1.846 0.37789 12.826 0.37789 28.336v25.322h-14.773-14.773v-22.99-22.99l-0.9562-1.9188c-1.5738-3.1581-4.7154-4.9985-8.5924-5.0335-4.3579-0.0393-7.6091 2.6196-9.3056 7.6105-0.74626 2.1954-0.7727 2.9121-0.88464 23.973l-0.11539 21.71h-14.755-14.755v-38.915z"id=path3564 /><path d="m483.72 195.49c-8.7879-1.2296-17.227-5.0751-22.84-10.407-6.9419-6.5948-11.058-16.86-11.058-27.579 0-11.183 5.0732-21.063 14.659-28.549 1.6668-1.3015 2.971-2.4258 2.8983-2.4985s-2.839 0.0526-6.1473 0.27845c-3.3084 0.22582-6.1097 0.31609-6.2252 0.20059-0.35527-0.35527 1.9224-3.3646 3.4808-4.5988 3.1887-2.5255 7.1982-3.4206 11.016-2.4593 2.8647 0.72134 2.7601 0.0117-0.52917-3.5913l-2.9368-3.2169 1.9486-1.6648c1.0718-0.91561 2.0264-1.6648 2.1214-1.6648s1.3454 1.8672 2.7786 4.1494 2.7377 4.2309 2.8989 4.3305c0.16121 0.0996 0.88234-0.70656 1.6025-1.7915 3.1041-4.6766 7.5048-6.7814 11.726-5.6087 2.8281 0.78567 2.8284 0.94893 0.009 4.474-1.4011 1.7514-2.5474 3.2129-2.5474 3.2477s2.8972-0.005 6.4382-0.0887c12.435-0.2935 20.725 1.6085 27.681 6.351 2.3823 1.6241 5.8912 5.1844 7.6504 7.7624 1.3597 1.9926 5.0735 9.6438 5.9418 12.241 1.8727 5.6021 2.1543 15.51 0.60611 21.323-1.0931 4.1048-3.901 9.5862-6.6754 13.032-6.2675 7.7832-16.447 13.536-27.95 15.794-3.5693 0.70076-13.148 1.0101-16.548 0.53438z"id=path3566 /><path d="m578.46 196.55c-7.8346-0.99337-14.881-3.5706-21.428-7.837-7.4897-4.8811-13.128-13.98-15.556-25.105-0.78464-3.5949-1.0411-10.974-0.50816-14.619 1.8612-12.729 9.6305-22.96 22.28-29.339 2.3971-1.2089 4.4428-1.9037 7.7062-2.6174 4.0381-0.88306 5.1322-0.97166 12.01-0.97253 6.7615-0.00086 7.8928 0.087 10.63 0.82559 12.802 3.4549 21.615 13.546 24.914 28.527 0.6918 3.142 0.83442 4.8524 0.84128 10.089l0.008 6.3057-26.206 0.18017-26.206 0.18016 1.1028 1.9308c3.137 5.4924 8.7262 8.3384 16.375 8.3384 5.3866 0 11.187-1.6725 14.461-4.1698l1.1776-0.89824 8.8542 8.356 8.8542 8.356-1.3689 1.4106c-7.9413 8.1832-23.911 12.838-37.942 11.059zm15.344-49.787c-0.77215-4.8941-4.5797-8.3719-10.226-9.3401-7.3015-1.2521-14.551 3.0206-16.122 9.5022-0.23523 0.97036-0.23008 0.97313 2.0507 1.1016 1.2576 0.0709 7.2932 0.16007 13.413 0.19825l11.126 0.0694-0.24162-1.5314z"id=path3568 /><path d="m649.62 196.93c-4.1463-0.4696-9.5241-1.6761-13.109-2.941-5.0223-1.7721-12.654-5.8658-12.654-6.7875 0-0.29887 10.534-18.822 11.044-19.42 0.0714-0.0836 2.3584 0.99211 5.0822 2.3905 7.4733 3.8368 10.895 4.8595 16.123 4.8192 4.2064-0.0324 6.9057-0.75215 8.1974-2.1858 1.8014-1.9995 0.97638-4.9047-1.6271-5.7293-0.64098-0.20303-3.6787-0.35471-6.7504-0.33708-3.9043 0.0224-6.3566-0.14086-8.1489-0.54259-10.216-2.2898-18.196-8.8832-21.451-17.724-0.64718-1.7576-0.7997-2.9616-0.82112-6.4824-0.0646-2.6728 0.7448-5.0553 1.5236-7.5661 3.0818-9.9354 13.202-16.079 23.78-18.263 2.9019-0.59914 4.4449-0.69408 9.0809-0.55874 6.0131 0.17555 9.6049 0.81959 15.149 2.7164 5.6992 1.9497 13.459 5.5992 13.421 6.312-0.009 0.16319-2.2624 4.0982-5.0083 8.7444-3.8334 6.4863-5.1196 8.3911-5.5397 8.2041-2.0201-0.89918-11.14-3.7997-13.519-4.2998-1.5854-0.33323-4.5108-0.62581-6.5009-0.65016-3.8407-0.047-4.94 0.31052-6.3727 2.0726-0.98054 1.206-0.83346 3.5197 0.29091 4.5764 0.89112 0.83748 1.1626 0.87763 6.5759 0.97257 13.405 0.2351 21.781 3.1407 27.711 9.6131 3.5386 3.8618 5.3831 8.2718 5.7427 13.731 0.51074 7.752-2.2504 14.495-8.2806 20.223-4.1377 3.9304-5.7939 4.9373-11.207 6.8132-5.8898 2.0411-15.988 3.0618-22.733 2.2979z"id=path3570 /><path d="m427.56 194.43c-3.1147-0.14948-8.5034-0.88225-10.832-1.473-10.841-2.7501-16.058-8.9595-18.094-21.535-0.27815-1.718-0.47698-6.2005-0.68515-15.446l-0.29328-13.025-1.6724-0.15801c-0.91985-0.0869-2.561-0.15881-3.6471-0.15981l-1.9746-0.002v-12.612-12.612h3.9386 3.9386l-0.1221-9.1086c-0.0672-5.0098-0.17037-9.8826-0.22936-10.828l-0.10726-1.7198h14.89 14.89v10.956 10.956h6.1149 6.1149v12.739 12.739h-6.1149-6.1149l0.002 10.892c0.00076 6.8144 0.10147 11.252 0.26868 11.855 0.33257 1.1976 1.6225 2.6971 2.7115 3.1521 0.60913 0.25456 2.3193 0.34423 6.5646 0.34423h5.7409v12.612 12.612l-6.8156-0.0491c-3.7486-0.027-7.5608-0.0849-8.4717-0.12858z"id=path3572 /><path d="m327.55 196.91c-6.0677-0.89879-12.181-4.2608-18.039-9.9194-3.6145-3.4921-5.6717-6.2542-7.7002-10.339-3.0306-6.1023-4.1772-10.835-4.3864-18.104-0.20071-6.9721 0.59366-12.343 2.7511-18.599 2.2335-6.4773 4.4455-10.213 8.3658-14.126 8.4647-8.4508 18.629-11.802 28.321-9.3368 5.607 1.426 10.185 4.0966 15.083 8.7982l2.2294 2.14v-4.7499-4.7499h13.886 13.886v38.473 38.473h-13.886-13.886v-4.841c0-2.6625-0.0749-4.841-0.16647-4.841-0.0916 0-1.2206 1.0606-2.5091 2.3568-7.0642 7.107-15.892 10.559-23.95 9.366zm17.685-28.317c5.7855-2.8454 9.0992-11.159 6.9944-17.547-1.1572-3.5124-4.2606-6.4205-8.2736-7.7526-3.876-1.2867-6.6105-1.145-10.106 0.52351-4.5126 2.154-7.1913 6.6024-7.1913 11.943 0 3.8881 1.2707 7.0034 3.9492 9.6819 4.0239 4.0239 10.164 5.3469 14.627 3.1517z"id=path3574 /><path d="m260.84 189.73c-0.0924-2.9654-0.17862-11.364-0.1917-18.663-0.0131-7.2994-0.0995-15.45-0.19195-18.113-0.19113-5.5023-0.42525-6.3086-2.4118-8.3062-2.3224-2.3354-6.3268-3.1823-9.4598-2.0009-2.7463 1.0356-4.8368 3.8001-5.4692 7.2327-0.18747 1.0175-0.27855 8.5779-0.27855 23.122v21.61h-14.778c-8.1277 0-14.801-0.0287-14.829-0.0637-0.0281-0.035-0.1141-10.383-0.19109-22.995l-0.13998-22.931-0.86605-1.5971c-0.99669-1.838-2.2415-3.0544-4.1569-4.0618-1.1982-0.63025-1.6137-0.70842-3.7673-0.70889-2.0345-0.0005-2.5948 0.0925-3.5138 0.58259-2.416 1.2885-4.2402 4.0486-5.0865 7.6961-0.40668 1.7527-0.43572 3.667-0.35081 23.122l0.0926 21.211h-14.765-14.765l-0.16939-22.973c-0.0932-12.635-0.16939-30.12-0.16939-38.855v-15.882h14.643 14.643l0.0707 3.6275c0.0605 3.1064 0.13001 3.6389 0.48358 3.7068 0.24341 0.0467 1.3415-0.84094 2.6753-2.1625 2.7004-2.6758 5.0529-4.087 9.1256-5.4745 11.078-3.7741 22.042-1.1534 30.246 7.2298l2.2033 2.2515 0.69237-1.1814c3.2464-5.5396 12.361-9.5259 21.781-9.5259 7.8044 0 14.775 2.6568 19.708 7.5117 5.1179 5.0368 8.1838 12.777 8.6807 21.916 0.0762 1.4013 0.20438 13.239 0.28485 26.307l0.14632 23.759h-14.879-14.879l-0.16791-5.3916z"id=path3576 /><path d="m107.78 196.02c-6.0926-0.99832-10.52-2.705-15.396-5.9351-11.61-7.6903-18.797-22.407-18.135-37.134 0.81092-18.046 12.392-31.634 30.62-35.927 7.9813-1.8796 17.076-2.1579 24.066-0.73652 12.231 2.4873 22.77 10.864 28.179 22.395 5.2662 11.228 5.4349 24.038 0.4578 34.76-5.5967 12.056-17.13 19.866-32.956 22.316-3.758 0.5817-13.917 0.73961-16.834 0.26167zm13.14-27.525c4.4484-0.93392 8.1199-3.6944 10.055-7.5597 1.0002-1.9983 1.0286-2.1268 1.0249-4.6373-0.004-3.0016-0.47007-5.2416-1.5427-7.4205-3.6817-7.4786-12.83-10.42-20.566-6.6116-3.7913 1.8662-7.0509 6.2224-7.7619 10.373-1.1202 6.5396 3.8078 14.306 10.256 16.163 1.4002 0.40328 5.9277 0.24039 8.5354-0.3071z"id=path3578 /><path d="m28.559 158.18v-36.689h-13.376-13.376v-14.301-14.301l40.448 0.18815c22.246 0.10348 40.534 0.23971 40.639 0.30273 0.1051 0.063 0.19109 6.3565 0.19109 13.985v13.871h-12.994-12.994v36.817 36.817h-14.268-14.268v-36.689z"id=path3580 /><path d="m705.5 109.07c-0.8084-0.0513-1.6332-0.0184-2.4531 0.0918-1.6393 0.22023-3.2608 0.74918-4.6836 1.582-1.7985 1.0528-3.6019 3.0024-4.5664 4.9102-2.1226 4.1983-1.8353 9.352 0.76758 13.117 1.7571 2.542 4.5826 4.305 7.9336 5.0293 1.743 0.37669 4.1785 0.36028 5.7168-0.13281 1.965-0.62998 3.6029-1.6767 5.1113-3.252 2.559-2.6723 3.9068-5.9718 3.9121-9.6094 0.005-3.253-1.1303-5.9181-3.459-8.1133-1.5822-1.4916-3.3513-2.4394-5.9258-3.2109-0.75281-0.22561-1.5451-0.36077-2.3535-0.41211zm-0.79492 3.9121c1.2826 0.00021 1.3825 0.009 2.248 0.27344 3.2525 0.99456 5.2285 2.8755 5.9492 5.4766 1.2382 4.4679-1.9019 9.9522-6.2051 10.967-1.9266 0.45434-5.0387-0.16285-6.8809-1.4258-2.9831-2.0454-4.2013-5.8638-2.9863-9.6445 0.72861-2.267 2.2294-3.9702 4.3262-4.9297 1.2837-0.58744 1.9196-0.71707 3.5488-0.71679z"id=path4305 /><path d="m701.3 126.62-0.8542-0.0115v-5.3932-5.3933h2.577c2.7795 0 3.0143 0.0134 3.6928 0.21025 1.101 0.31948 1.9415 1.0118 2.4049 1.9808 0.22524 0.47117 0.31353 0.84798 0.33665 1.437 0.0521 1.3307-0.51231 2.4879-1.5117 3.0986-0.29937 0.18292-0.31328 0.19738-0.26455 0.27485 0.13151 0.20899 2.2093 3.7876 2.2093 3.8051 0 0.0107-0.79299 0.0199-1.7622 0.0199h-1.7622l-1.0228-1.7225c-0.56254-0.9474-1.0445-1.7521-1.0709-1.7883-0.0358-0.049-0.12706-0.0712-0.35773-0.087l-0.30963-0.0212 0.0193 1.8095 0.0193 1.8095-0.74454-0.009c-0.4095-0.005-1.1289-0.0138-1.5988-0.0199zm3.804-6.0177c0.72105-0.15169 1.0898-0.49721 1.1301-1.0589 0.0282-0.39275-0.0652-0.66074-0.3147-0.90375-0.33078-0.32205-0.79247-0.43365-1.8034-0.4359l-0.53364-0.001 0.0249 0.35143c0.0136 0.19328 0.0248 0.75742 0.0248 1.2536v0.90219l0.60466-0.0261c0.33258-0.0144 0.72275-0.0511 0.86707-0.0814z"id=path3584 /></g></g><path d="m92.534 57.233c1.823-2.196 15.246-14.146 32.836-3.215l-6.8884-14.351 7.8069-0.80365 4.133 14.58c5.6938-6.7936 18.081-12.516 26.75-0.68884-7.1807 0.6116-8.6909 4.1794-9.1846 7.3476 21.349-2.099 27.616 3.9846 31.457 8.1513-12.791-3.6696-27.648 11.782-42.019 2.4109-2.2844 14.012-13.151 14.634-22.502 14.351 2.9228-4.5918 6.742-8.9147 3.7886-15.269-11.512 8.7305-20.641 5.0873-33.753-1.3777 1.6737-1.2709 18.946-7.0772 25.946-6.6588-6.6249-3.4685-13.423-4.1733-18.369-4.4775z"id=path3607 fill=#01912c /></svg>',rotten:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 145 140"><path fill="#0fc755" d="M47.4 35.342c-13.607-7.935-12.32-25.203 2.097-31.88 26.124-6.531 29.117 13.78 22.652 30.412-6.542 24.11 18.095 23.662 19.925 10.067 3.605-18.412 19.394-26.695 31.67-16.359 12.598 12.135 7.074 36.581-17.827 34.187-16.03-1.545-19.552 19.585.839 21.183 32.228 1.915 42.49 22.167 31.04 35.865-15.993 15.15-37.691-4.439-45.512-19.505-6.8-9.307-17.321.11-13.423 6.502 12.983 19.465 2.923 31.229-10.906 30.62-13.37-.85-20.96-9.06-13.214-29.15 3.897-12.481-8.595-15.386-16.57-5.45-11.707 19.61-28.865 13.68-33.976 4.19-3.243-7.621-2.921-25.846 24.119-23.696 16.688 4.137 11.776-12.561-.63-13.633-9.245-.443-30.501-7.304-22.86-24.54 7.34-11.056 24.958-11.768 33.348 6.293 3.037 4.232 8.361 11.042 18.037 5.033 3.51-5.197 1.21-13.9-8.809-20.135z"/></svg>'},popcorn:{fresh:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.25 140"><path fill="#fa3106" d="M2.727 39.537c-.471-21.981 100.88-25.089 100.88-.42L92.91 117.56c-7.605 26.86-72.064 27.007-79.07.21z"/><g fill="#fff"><path d="M8.809 51.911l9.018 66.639c3.472 4.515 8.498 7.384 9.648 8.022l-6.921-68.576c-3.498-1.41-9.881-4.579-11.745-6.083zM28.629 59.776l5.453 68.898c4.926 2.652 11.04 3.391 15.73 3.566l-1.258-70.366c-3.414-.024-13.82-.642-19.925-2.098zM97.632 52.121l-9.019 66.643c-3.472 4.515-8.498 7.384-9.647 8.022l6.92-68.583c3.5-1.41 9.882-4.579 11.746-6.082zM77.812 59.986l-5.453 68.898c-4.926 2.652-11.04 3.391-15.73 3.566l1.258-70.366c3.414-.024 13.82-.642 19.925-2.098z"/></g><g fill="#ffd600"><circle cx="13.213" cy="31.252" r="6.816"/><circle cx="22.022" cy="27.687" r="6.607"/><circle cx="30.359" cy="19.769" r="5.925"/><circle cx="34.973" cy="15.155" r="6.03"/><circle cx="45.093" cy="17.095" r="4.929"/><circle cx="51.123" cy="9.597" r="6.24"/><circle cx="61.19" cy="9.387" r="6.554"/><circle cx="67.954" cy="13.635" r="4.929"/><circle cx="76.081" cy="17.672" r="5.925"/><circle cx="78.913" cy="22.706" r="4.352"/><circle cx="83.475" cy="26.324" r="5.243"/><circle cx="88.194" cy="34.398" r="5.768"/><path d="M87.355 35.447c5.79 2.799 1.352-2.213 10.696 2.097-9.574 15.338-74.774 16.892-90.291.525l-.21-3.985L38.59 16.99l22.863-6.606 15.52 9.962z"/></g></svg>',rotten:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 143.75 108.75"><path d="m96.641 2.9657c28.149 1.101 27.459 97.814 0.825 97.194l-74.45-9.973c-25.51-7.211-25.922-69.313-0.534-76.178z" fill="#07a23b"/><g fill="#fff"><path d="m85.419 8.8789-63.171 8.9751c-4.2681 3.3648-6.9679 8.2192-7.5687 9.3296l65.017-6.963c1.3226-3.3762 4.3015-9.5395 5.7202-11.342z"/><path d="m78.042 28.008-65.329 5.5498c-2.494 4.757-3.169 10.65-3.3147 15.17l66.739-1.5147c0.0074-3.2891 0.55003-13.318 1.9052-19.206z"/><path d="m85.595 94.456-63.251-8.403c-4.2975-3.326-7.0398-8.1557-7.6503-9.2607l65.082 6.3737c1.3522 3.3644 4.3852 9.4999 5.8189 11.29z"/><path d="m78.051 75.394-65.375-4.957c-2.536-4.734-3.2627-10.621-3.4481-15.14l66.749 0.9101c0.03629 3.2889 0.66694 13.312 2.0737 19.188z"/></g><path d="m100.36 10.836c-13.099 0.685-19.878 48.223-11.732 71.195l21.342-4.561c8.39-24.044 1.28-66.986-9.61-66.634z" fill="#03621e"/><g fill="#fdd600"><path d="m99.087 78.942a6.1255 6.1255 0 0 1 -6.1238 6.1255 6.1255 6.1255 0 0 1 -6.1273 -6.122 6.1255 6.1255 0 0 1 6.1202 -6.1291 6.1255 6.1255 0 0 1 6.1309 6.1184"/><path d="m112.96 75.406a5.5952 5.5952 0 0 1 -5.5936 5.5952 5.5952 5.5952 0 0 1 -5.5968 -5.592 5.5952 5.5952 0 0 1 5.5903 -5.5985 5.5952 5.5952 0 0 1 5.6001 5.5887"/><path d="m120.39 74.743a4.9323 4.9323 0 0 1 -4.9309 4.9323 4.9323 4.9323 0 0 1 -4.9337 -4.9294 4.9323 4.9323 0 0 1 4.928 -4.9352 4.9323 4.9323 0 0 1 4.9366 4.9266"/><path d="m124.1 78.942a3.7391 3.7391 0 0 1 -3.738 3.7391 3.7391 3.7391 0 0 1 -3.7402 -3.7369 3.7391 3.7391 0 0 1 3.7358 -3.7412 3.7391 3.7391 0 0 1 3.7423 3.7347"/><path d="m131.08 83.14a5.0207 5.0207 0 0 1 -5.0192 5.0207 5.0207 5.0207 0 0 1 -5.0222 -5.0178 5.0207 5.0207 0 0 1 5.0163 -5.0236 5.0207 5.0207 0 0 1 5.0251 5.0148"/><path d="m135.86 91.67a5.5952 5.5952 0 0 1 -5.5936 5.5952 5.5952 5.5952 0 0 1 -5.5968 -5.592 5.5952 5.5952 0 0 1 5.5903 -5.5985 5.5952 5.5952 0 0 1 5.6001 5.5887"/><path d="m140.36 97.327a3.9158 3.9158 0 0 1 -3.9147 3.9158 3.9158 3.9158 0 0 1 -3.917 -3.9136 3.9158 3.9158 0 0 1 3.9124 -3.9181 3.9158 3.9158 0 0 1 3.9192 3.9113"/><path d="m140.45 99.625a4.181 4.181 0 0 1 -4.1798 4.181 4.181 4.181 0 0 1 -4.1822 -4.1786 4.181 4.181 0 0 1 4.1773 -4.1834 4.181 4.181 0 0 1 4.1846 4.1761"/><path d="m134.44 100.55a4.8439 4.8439 0 0 1 -4.8425 4.8439 4.8439 4.8439 0 0 1 -4.8453 -4.8411 4.8439 4.8439 0 0 1 4.8397 -4.8467 4.8439 4.8439 0 0 1 4.8481 4.8383"/><path d="m126.84 100.24a4.0042 4.0042 0 0 1 -4.0031 4.0042 4.0042 4.0042 0 0 1 -4.0054 -4.0019 4.0042 4.0042 0 0 1 4.0007 -4.0065 4.0042 4.0042 0 0 1 4.0077 3.9996"/><path d="m125.43 97.636a5.1091 5.1091 0 0 1 -5.1076 5.1091 5.1091 5.1091 0 0 1 -5.1106 -5.1061 5.1091 5.1091 0 0 1 5.1046 -5.112 5.1091 5.1091 0 0 1 5.1135 5.1031"/><path d="m117.12 98.078a5.1091 5.1091 0 0 1 -5.1076 5.1091 5.1091 5.1091 0 0 1 -5.1106 -5.1061 5.1091 5.1091 0 0 1 5.1046 -5.112 5.1091 5.1091 0 0 1 5.1135 5.1031"/><path d="m110.49 97.459a3.6065 3.6065 0 0 1 -3.6054 3.6065 3.6065 3.6065 0 0 1 -3.6075 -3.6044 3.6065 3.6065 0 0 1 3.6033 -3.6086 3.6065 3.6065 0 0 1 3.6096 3.6023"/><path d="m105.72 96.929a4.0484 4.0484 0 0 1 -4.0472 4.0484 4.0484 4.0484 0 0 1 -4.0496 -4.0461 4.0484 4.0484 0 0 1 4.0449 -4.0508 4.0484 4.0484 0 0 1 4.052 4.0437"/><path d="m94.71 80.271c2.1568-1.7217 5.4319-2.8842 9.5881-3.6062l11.579 0.61872 15.203 13.612-2.0329 9.6343-27.047-2.5633-4.7288 1.4584-11.183-17.899z"/></g><path d="m85.913 71.627c3.2472 12.036 7.0507 22.57 12.64 28.284l-9.9879-1.591s-5.5685-25.456-4.8614-25.544c0.70711-0.08839 2.2097-1.149 2.2097-1.149z" fill="#09a339"/></svg>'}},c={imdb:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none"><path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/></svg>',kp:'<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10"/></svg>',tmdb:'<svg width="800" height="800" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M25.99 29.198c2.807 0 4.708-1.896 4.708-4.708v-19.781c0-2.807-1.901-4.708-4.708-4.708h-19.979c-2.807 0-4.708 1.901-4.708 4.708v27.292l2.411-2.802v-24.49c.005-1.266 1.031-2.292 2.297-2.292h19.974c1.266 0 2.292 1.026 2.292 2.292v19.781c0 1.266-1.026 2.292-2.292 2.292h-16.755l-2.417 2.417-.016-.016zM11.714 15.286h-2.26v7.599h2.26c5.057 0 5.057-7.599 0-7.599zM11.714 21.365h-.734v-4.557h.734c2.958 0 2.958 4.557 0 4.557zM11.276 13.854h1.516v-6.083h1.891v-1.505h-5.302v1.505h1.896zM18.75 9.599l-2.625-3.333h-.49v7.714h1.542v-4.24l1.573 2.042 1.578-2.042-.010 4.24h1.542v-7.714h-.479zM21.313 19.089c.474-.333.677-.922.698-1.5.031-1.339-.807-2.307-2.156-2.307h-3.005v7.609h3.005c1.24-.010 2.245-1.021 2.245-2.26v-.036c0-.62-.307-1.172-.781-1.5zM18.37 16.802h1.354c.432 0 .698.339.698.766.031.406-.286.76-.698.76h-1.354zM19.724 21.37h-1.354v-1.516h1.37c.411 0 .745.333.745.745v.016c0 .417-.333.755-.75.755z"/></svg>',tomatoes:'<svg id="svg3390" xmlns="http://www.w3.org/2000/svg" height="141.25" viewBox="0 0 138.75 141.25" width="138.75" version="1.1"><g id="layer1" fill="#f93208"><path id="path3412" d="m20.154 40.829c-28.149 27.622-13.657 61.011-5.734 71.931 35.254 41.954 92.792 25.339 111.89-5.9071 4.7608-8.2027 22.554-53.467-23.976-78.009z"/><path id="path3471" d="m39.613 39.265 4.7778-8.8607 28.406-5.0384 11.119 9.2082z"/></g><g id="layer2"><path id="path3437" d="m39.436 8.5696 8.9682-5.2826 6.7569 15.479c3.7925-6.3226 13.79-16.316 24.939-4.6684-4.7281 1.2636-7.5161 3.8553-7.7397 8.4768 15.145-4.1697 31.343 3.2127 33.539 9.0911-10.951-4.314-27.695 10.377-41.771 2.334 0.009 15.045-12.617 16.636-19.902 17.076 2.077-4.996 5.591-9.994 1.474-14.987-7.618 8.171-13.874 10.668-33.17 4.668 4.876-1.679 14.843-11.39 24.448-11.425-6.775-2.467-12.29-2.087-17.814-1.475 2.917-3.961 12.149-15.197 28.625-8.476z" fill="#02902e"/></g></svg>',popcorn:'<svg xmlns="http://www.w3.org/2000/svg" width="106.25" height="140"><path fill="#fa3106" d="M2.727 39.537c-.471-21.981 100.88-25.089 100.88-.42L92.91 117.56c-7.605 26.86-72.064 27.007-79.07.21z"/><g fill="#fff"><path d="M8.809 51.911l9.018 66.639c3.472 4.515 8.498 7.384 9.648 8.022l-6.921-68.576c-3.498-1.41-9.881-4.579-11.745-6.083zM28.629 59.776l5.453 68.898c4.926 2.652 11.04 3.391 15.73 3.566l-1.258-70.366c-3.414-.024-13.82-.642-19.925-2.098zM97.632 52.121l-9.019 66.643c-3.472 4.515-8.498 7.384-9.647 8.022l6.92-68.583c3.5-1.41 9.882-4.579 11.746-6.082zM77.812 59.986l-5.453 68.898c-4.926 2.652-11.04 3.391-15.73 3.566l1.258-70.366c3.414-.024 13.82-.642 19.925-2.098z"/></g><g fill="#ffd600"><circle cx="13.213" cy="31.252" r="6.816"/><circle cx="22.022" cy="27.687" r="6.607"/><circle cx="30.359" cy="19.769" r="5.925"/><circle cx="34.973" cy="15.155" r="6.03"/><circle cx="45.093" cy="17.095" r="4.929"/><circle cx="51.123" cy="9.597" r="6.24"/><circle cx="61.19" cy="9.387" r="6.554"/><circle cx="67.954" cy="13.635" r="4.929"/><circle cx="76.081" cy="17.672" r="5.925"/><circle cx="78.913" cy="22.706" r="4.352"/><circle cx="83.475" cy="26.324" r="5.243"/><circle cx="88.194" cy="34.398" r="5.768"/><path d="M87.355 35.447c5.79 2.799 1.352-2.213 10.696 2.097-9.574 15.338-74.774 16.892-90.291.525l-.21-3.985L38.59 16.99l22.863-6.606 15.52 9.962z"/></g></svg>',metacritic:'<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.209 32.937L20.619 29.527L14.052 22.96C13.776 22.684 13.476 22.338 13.315 21.946C12.946 21.163 12.785 19.942 13.684 19.043C14.79 17.937 16.264 18.398 17.693 19.827L24.006 26.14L27.416 22.73L20.826 16.14C20.55 15.864 20.227 15.449 20.066 15.103C19.628 14.205 19.651 13.076 20.458 12.269C21.587 11.14 23.061 11.555 24.698 13.191L30.826 19.32L34.236 15.91L27.6 9.274C24.236 5.91 21.08 6.025 18.914 8.191C18.084 9.021 17.577 9.896 17.324 10.887C17.0952 11.8067 17.0639 12.7643 17.232 13.697L17.186 13.744C15.526 13.053 13.637 13.467 12.186 14.919C10.25 16.854 10.32 18.905 10.55 20.103L10.48 20.173L8.799 18.813L5.849 21.762C6.886 22.707 8.131 23.859 9.536 25.264L17.209 32.937Z" fill="white"/><path d="M19.982 8.12464e-06C16.0272 0.0035675 12.1621 1.17957 8.87551 3.37936C5.5889 5.57915 3.02825 8.70397 1.51726 12.3588C0.00626421 16.0136 -0.387235 20.0344 0.386501 23.9128C1.16024 27.7913 3.06647 31.3532 5.86424 34.1485C8.662 36.9437 12.2257 38.8468 16.1048 39.617C19.9839 40.3873 24.0044 39.9901 27.6578 38.4759C31.3113 36.9616 34.4338 34.3981 36.6306 31.1095C38.8275 27.8209 40 23.9549 40 20V19.976C39.9936 14.6727 37.8812 9.58908 34.1273 5.84302C30.3734 2.09697 25.2853 -0.00476866 19.982 8.12464e-06ZM19.891 4.27401C24.0449 4.27029 28.0303 5.9166 30.9705 8.85087C33.9108 11.7851 35.5652 15.7671 35.57 19.921V19.939C35.57 23.0366 34.6516 26.0647 32.931 28.6405C31.2104 31.2162 28.7647 33.2241 25.9032 34.4101C23.0417 35.5962 19.8927 35.9073 16.8544 35.3041C13.8161 34.7009 11.0249 33.2104 8.83348 31.0211C6.6421 28.8318 5.14897 26.042 4.54284 23.0043C3.93671 19.9666 4.24479 16.8173 5.42814 13.9547C6.61148 11.092 8.61697 8.64442 11.1911 6.92133C13.7652 5.19823 16.7924 4.27697 19.89 4.27401H19.891Z" fill="#FFBD3F"/></svg>',letterboxd:'<svg width="800" height="800" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="currentColor" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2"><path d="M1179.28 284.01c-6.02-5.845-14.23-9.447-23.28-9.447-9.04 0-17.25 3.597-23.27 9.438-6.03-5.841-14.23-9.438-23.28-9.438-18.45 0-33.43 14.983-33.43 33.437 0 18.454 14.98 33.437 33.43 33.437 9.05 0 17.25-3.597 23.28-9.438 6.02 5.841 14.23 9.438 23.27 9.438 9.05 0 17.26-3.602 23.28-9.447 6.02 5.845 14.24 9.447 23.28 9.447 18.46 0 33.44-14.983 33.44-33.437 0-18.454-14.98-33.437-33.44-33.437-9.04 0-17.26 3.602-23.28 9.447Zm-7.07 9.965c-3.94-4.539-9.74-7.412-16.21-7.412-6.46 0-12.26 2.867-16.2 7.397a33.152 33.152 0 0 1 3.09 14.04c0 5.012-1.1 9.768-3.09 14.04 3.94 4.53 9.74 7.397 16.2 7.397 6.47 0 12.27-2.873 16.21-7.412a33.228 33.228 0 0 1-3.08-14.025c0-5.007 1.1-9.758 3.08-14.025Zm-46.56-.015c-3.93-4.53-9.73-7.397-16.2-7.397-11.83 0-21.43 9.606-21.43 21.437 0 11.831 9.6 21.437 21.43 21.437 6.47 0 12.27-2.867 16.2-7.397a33.303 33.303 0 0 1-3.09-14.04c0-5.012 1.11-9.768 3.09-14.04Zm60.71 28.065c3.93 4.539 9.73 7.412 16.2 7.412 11.83 0 21.44-9.606 21.44-21.437 0-11.831-9.61-21.437-21.44-21.437-6.47 0-12.27 2.873-16.2 7.412a33.373 33.373 0 0 1 3.07 14.025c0 5.007-1.1 9.758-3.07 14.025Z" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2" transform="translate(-1060 -212)"/></svg>',trakt:'<svg width="800" height="800" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M16 32c-8.817 0-16-7.183-16-16s7.183-16 16-16c8.817 0 16 7.183 16 16s-7.183 16-16 16zM16 1.615c-7.932 0-14.385 6.453-14.385 14.385s6.453 14.385 14.385 14.385c7.932 0 14.385-6.453 14.385-14.385s-6.453-14.385-14.385-14.385zM6.521 24.708c2.339 2.557 5.724 4.152 9.479 4.152 1.917 0 3.735-0.417 5.369-1.167l-8.932-8.907zM25.573 24.62c2.052-2.281 3.307-5.323 3.307-8.625 0-5.177-3.047-9.62-7.421-11.677l-8.12 8.099 12.219 12.204zM12.401 13.38l-6.765 6.74-0.907-0.907 15.421-15.416c-1.301-0.437-2.692-0.677-4.151-0.677-7.115-0.005-12.885 5.765-12.885 12.88 0 2.896 0.953 5.573 2.588 7.735l6.74-6.74 0.479 0.437 9.663 9.661c0.197-0.109 0.38-0.219 0.556-0.353l-10.703-10.672-6.468 6.473-0.907-0.905 7.38-7.381 0.479 0.443 11.281 11.251c0.177-0.136 0.339-0.292 0.5-0.421l-12.181-12.157-0.109 0.021zM16.464 14.749l-0.901-0.9 6.38-6.385 0.907 0.916-6.385 6.38zM22.521 5.979l-7.36 7.36-0.907-0.907 7.36-7.359 0.907 0.911z"/></svg>',myanimelist:'<svg width="512" height="206" viewBox="0 0 512 206" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M176.49 1.28V180.97L131.63 180.91V69.67L88.32 120.96L45.89 68.52L45.46 181.27H0V1.32001H47L86.79 55.61L129.79 1.30002L176.49 1.28ZM360.55 45.42L361.08 180.57H310.63L310.46 119.32H250.73C252.22 129.97 255.21 146.32 259.63 157.32C262.94 165.45 265.99 173.32 272.07 181.38L235.7 205.38C228.25 191.81 222.43 176.86 216.97 160.96C211.505 145.955 207.872 130.346 206.15 114.47C204.34 98.47 204.08 83.09 208.43 67.28C212.708 51.9137 221.305 38.0972 233.2 27.47C239.88 21.22 249.2 16.8 256.67 12.81C264.14 8.82003 272.52 7.18002 280.29 5.15002C288.64 3.16198 297.138 1.85764 305.7 1.25C314.19 0.52 329.32 -0.159976 356.7 0.650024L368.33 37.96H309.55C296.9 38.13 290.82 37.96 280.94 42.42C273.097 46.129 266.415 51.9066 261.611 59.131C256.808 66.3555 254.066 74.7531 253.68 83.42L310.49 84.12L311.3 45.51H360.56L360.55 45.42ZM445.72 0.670013V142.02L512 142.67L502.83 180.54H400.28V0L445.72 0.670013Z" fill="white"/></svg>'};["imdb","kp","tmdb","tomatoes","popcorn","metacritic","letterboxd","trakt","myanimelist"].forEach(t=>{if(!o.includes(t))return;if(!e[t]||null===e[t])return;const a=e[t],i=a&&"object"==typeof a?a.score??a.value:a,l=a&&"object"==typeof a?a.votes:void 0,d=parseFloat(i);if(isNaN(d))return;const g=75,m=n&&(n.name||n.original_name||n.first_air_date)?20:80,h="number"==typeof l&&!isNaN(l),_=d>=60,u="tomatoes"===t?"tomatoes"===t&&d>=g&&h&&l>=m?p.tomatoes.certified:_?p.tomatoes.fresh:p.tomatoes.rotten:"popcorn"===t?_?p.popcorn.fresh:p.popcorn.rotten:c[t];let f;f="tomatoes"===t||"popcorn"===t?Math.round(d)+"%":"metacritic"===t||"trakt"===t?Math.round(d).toString():d.toFixed(1);const v=`\n                <div class="${s}${t}">\n                    ${u}\n                    <div>${f}</div>\n                </div>\n            `;r.append(v)}),r.children().length>0&&(a.removeClass("hide"),r.removeClass("hide"))}(t,n,e)})}(n,o),function(t){const e=t.render().find(".full-start__background:not(.applecation__overlay)")[0],n=t.render().find(".scroll__body")[0];if(!e||!n)return;let a=!1;const i=Object.getOwnPropertyDescriptor(n.style,"-webkit-transform")||Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,"webkitTransform");Object.defineProperty(n.style,"-webkit-transform",{set:function(t){if(t){const n=t.indexOf(",")+1,i=t.indexOf(",",n);if(n>0&&i>n){const o=parseFloat(t.substring(n,i))<0;o!==a&&(a=o,e.classList.toggle("dim",o))}}i&&i.set?i.set.call(this,t):this.setProperty("-webkit-transform",t)},get:function(){return i&&i.get?i.get.call(this):this.getPropertyValue("-webkit-transform")},configurable:!0})}(n),function(t){const e=t.render(),n=e.find(".full-person__name");function a(t){return t.scrollWidth>t.clientWidth+1}n.each(function(){const t=$(this);if(t.hasClass("marquee-processed")){const e=t.find("span").first().text();e&&(t.text(e),t.removeClass("marquee-processed marquee-active"),t.css("--marquee-duration",""))}}),setTimeout(()=>{m(t)&&n.each(function(){const t=$(this),e=t.text().trim();if(e)if(a(t[0])){const n=Math.min(Math.max(.25*e.length,5),20);t.addClass("marquee-processed marquee-active"),t.css("--marquee-duration",n+"s");const a=$("<span>").text(e),i=$("<span>").text(e),o=$('<div class="marquee__inner">').append(a).append(i);t.empty().append(o)}else t.addClass("marquee-processed")})},100)}(n),o&&h(o,n)}}),function(){try{if(window.applecation_episodes_core_patch)return;if(window.applecation_episodes_core_patch=!0,window.episodes_order_fix=!0,window.episodes_core_patch=!0,!window.Lampa||!Lampa.Utils||"function"!=typeof Lampa.Utils.createInstance)return;if(Lampa.Utils.__applecation_episodes_core_patch_applied)return;function e(t){try{if(!t)return!1;if(!t.movie)return!1;if(!Array.isArray(t.results)||!t.results.length)return!1;for(var e=0,n=0;n<t.results.length;n++){var a=t.results[n];a&&("number"==typeof a.episode_number&&e++,"number"==typeof a.season_number&&e++,a.comeing&&e++,a.air_date&&e++)}return e>=3}catch(t){return!1}}function n(t){try{for(var e=t.results||[],n=[],a=[],i=0;i<e.length;i++){var o=e[i];o&&(o.comeing?n.push(o):a.push(o))}a.sort(function(t,e){return(t.episode_number||0)-(e.episode_number||0)}),t.results=a.concat(n)}catch(t){}}function a(t){try{if(!t||!t.scroll||"function"!=typeof t.scroll.append)return;if(t.__applecation_episodes_scroll_append_patched)return;t.__applecation_episodes_scroll_append_patched=!0;var e=t.scroll.append.bind(t.scroll);t.scroll.append=function(n){var a=n instanceof jQuery?n[0]:n;if(a&&a.classList&&a.classList.contains("card-more"))return e(n);var i="function"==typeof t.scroll.body?t.scroll.body(!0):null;if(i){var o=i.querySelector(".card-more");if(o&&a&&a!==o)return void i.insertBefore(a,o)}return e(n)}}catch(t){}}function i(t){try{if(!t||"function"!=typeof t.create)return;if(t.__applecation_episodes_create_patched)return;t.__applecation_episodes_create_patched=!0;var e=t.create.bind(t);t.create=function(){a(t);var n=e();return setTimeout(function(){try{var e=t&&t.scroll&&"function"==typeof t.scroll.body?t.scroll.body(!0):null,n=e?e.querySelector(".card-more"):null;n&&n.classList.remove("card-more--first")}catch(t){}},0),n}}catch(t){}}Lampa.Utils.__applecation_episodes_core_patch_applied=!0;var t=Lampa.Utils.createInstance;Lampa.Utils.createInstance=function(a,o,l,r){var s=e(o),p=Lampa.Storage.get("applecation_reverse_episodes",!0);s&&p&&n(o);var c=t.call(this,a,o,l,r);return s&&p&&i(c),c}}catch(o){}}()):console.log("Applecation","TV mode only")}const u={show_ratings:{ru:"Показывать рейтинги",en:"Show ratings",uk:"Показувати рейтинги",be:"Паказваць рэйтынгі",bg:"Показване на рейтинги",cs:"Zobrazit hodnocení",he:"הצג דירוגים",pt:"Mostrar classificações",zh:"显示评分"},ratings_source:{ru:"Источник рейтингов",en:"Ratings Source",uk:"Джерело рейтингів",be:"Крыніца рэйтынгаў",bg:"Източник на рейтинги",cs:"Zdroj hodnocení",he:"מקור דירוגים",pt:"Fonte de classificações",zh:"评分来源"},ratings_source_desc:{ru:"От плагинов или от рейтинговых сервисов",en:"From plugins or rating services",uk:"Від плагінів або від рейтингових сервісів",be:"Ад плагінаў або ад рэйтынгавых сэрвісаў",bg:"От плъгини или от рейтингови услуги",cs:"Z pluginů nebo z ratingových služeb",he:"מתוספים או משירותי דירוג",pt:"De plugins ou de serviços de avaliação",zh:"来自插件或评分服务"},ratings_source_builtin:{ru:"Рейтинговые сервисы",en:"Rating services",uk:"Рейтингові сервіси",be:"Рэйтынгавыя сэрвісы",bg:"Рейтингови услуги",cs:"Ratingové služby",he:"שירותי דירוג",pt:"Serviços de avaliação",zh:"评分服务"},ratings_source_external:{ru:"Плагины",en:"Plugins",uk:"Плагіни",be:"Плагіны",bg:"Плъгини",cs:"Pluginy",he:"תוספים",pt:"Plugins",zh:"插件"},mdblist_api_key:{ru:"MDBList API Key",en:"MDBList API Key",uk:"MDBList API Key",be:"MDBList API Key",bg:"MDBList API Key",cs:"MDBList API Key",he:"MDBList API Key",pt:"MDBList API Key",zh:"MDBList API 密钥"},mdblist_api_key_desc:{ru:"API ключ для получения рейтингов от MDBList (mdblist.com)",en:"API key for getting ratings from MDBList (mdblist.com)",uk:"API ключ для отримання рейтингів від MDBList (mdblist.com)",be:"API ключ для атрымання рэйтынгаў ад MDBList (mdblist.com)",bg:"API ключ за получаване на рейтинги от MDBList (mdblist.com)",cs:"API klíč pro získání hodnocení od MDBList (mdblist.com)",he:"מפתח API לקבלת דירוגים מ-MDBList (mdblist.com)",pt:"Chave API para obter classificações do MDBList (mdblist.com)",zh:"用于从 MDBList 获取评分的 API 密钥（mdblist.com）"},kp_api_key:{ru:"КиноПоиск API Key",en:"KinoPoisk API Key",uk:"КіноПошук API Key",be:"КіноПошук API Key",bg:"KinoPoisk API Key",cs:"KinoPoisk API Key",he:"KinoPoisk API Key",pt:"KinoPoisk API Key",zh:"KinoPoisk API 密钥"},kp_api_key_desc:{ru:"API ключ для получения рейтингов КиноПоиска (kinopoiskapiunofficial.tech)",en:"API key for getting KinoPoisk ratings (kinopoiskapiunofficial.tech)",uk:"API ключ для отримання рейтингів КіноПошуку (kinopoiskapiunofficial.tech)",be:"API ключ для атрымання рэйтынгаў КіноПошука (kinopoiskapiunofficial.tech)",bg:"API ключ за получаване на рейтинги от KinoPoisk (kinopoiskapiunofficial.tech)",cs:"API klíč pro získání hodnocení KinoPoisk (kinopoiskapiunofficial.tech)",he:"מפתח API לקבלת דירוגי KinoPoisk (kinopoiskapiunofficial.tech)",pt:"Chave API para obter classificações do KinoPoisk (kinopoiskapiunofficial.tech)",zh:"用于获取 KinoPoisk 评分的 API 密钥 (kinopoiskapiunofficial.tech)"},enabled_ratings:{ru:"Отображаемые рейтинги",en:"Displayed Ratings",uk:"Рейтинги що відображаються",be:"Рэйтынгі што адлюстроўваюцца",bg:"Показани рейтинги",cs:"Zobrazená hodnocení",he:"דירוגים מוצגים",pt:"Classificações exibidas",zh:"显示的评分"},enabled_ratings_desc:{ru:"Выберите какие рейтинги показывать",en:"Select which ratings to show",uk:"Виберіть які рейтинги показувати",be:"Выберыце якія рэйтынгі паказваць",bg:"Изберете кои рейтинги да се показват",cs:"Vyberte, která hodnocení zobrazit",he:"בחר אילו דירוגים להציג",pt:"Selecione quais classificações exibir",zh:"选择要显示的评分"},rating_imdb:{ru:"IMDB",en:"IMDB",uk:"IMDB",be:"IMDB",bg:"IMDB",cs:"IMDB",he:"IMDB",pt:"IMDB",zh:"IMDB"},rating_kp:{ru:"КиноПоиск",en:"KinoPoisk",uk:"КіноПошук",be:"КіноПошук",bg:"KinoPoisk",cs:"KinoPoisk",he:"KinoPoisk",pt:"KinoPoisk",zh:"KinoPoisk"},rating_tmdb:{ru:"TMDB",en:"TMDB",uk:"TMDB",be:"TMDB",bg:"TMDB",cs:"TMDB",he:"TMDB",pt:"TMDB",zh:"TMDB"},rating_tomatoes:{ru:"Rotten Tomatoes",en:"Rotten Tomatoes",uk:"Rotten Tomatoes",be:"Rotten Tomatoes",bg:"Rotten Tomatoes",cs:"Rotten Tomatoes",he:"Rotten Tomatoes",pt:"Rotten Tomatoes",zh:"Rotten Tomatoes"},rating_popcorn:{ru:"Popcorn",en:"Popcorn",uk:"Popcorn",be:"Popcorn",bg:"Popcorn",cs:"Popcorn",he:"Popcorn",pt:"Popcorn",zh:"Popcorn"},rating_metacritic:{ru:"Metacritic",en:"Metacritic",uk:"Metacritic",be:"Metacritic",bg:"Metacritic",cs:"Metacritic",he:"Metacritic",pt:"Metacritic",zh:"Metacritic"},rating_letterboxd:{ru:"Letterboxd",en:"Letterboxd",uk:"Letterboxd",be:"Letterboxd",bg:"Letterboxd",cs:"Letterboxd",he:"Letterboxd",pt:"Letterboxd",zh:"Letterboxd"},rating_trakt:{ru:"Trakt",en:"Trakt",uk:"Trakt",be:"Trakt",bg:"Trakt",cs:"Trakt",he:"Trakt",pt:"Trakt",zh:"Trakt"},rating_mal:{ru:"MyAnimeList",en:"MyAnimeList",uk:"MyAnimeList",be:"MyAnimeList",bg:"MyAnimeList",cs:"MyAnimeList",he:"MyAnimeList",pt:"MyAnimeList",zh:"MyAnimeList"},settings_title_ratings:{ru:"Рейтинги",en:"Ratings",uk:"Рейтинги",be:"Рэйтынгі",bg:"Рейтинги",cs:"Hodnocení",he:"דירוגים",pt:"Classificações",zh:"评分"},show_ratings_desc:{ru:"Отображать рейтинги в карточке",en:"Show ratings on the card",uk:"Відображати рейтинги в картці",be:"Адлюстроўваць рэйтынгі ў картцы",bg:"Показване на рейтинги в картата",cs:"Zobrazit hodnocení na kartě",he:"הצג דירוגים בכרטיס",pt:"Exibir classificações no cartão",zh:"在卡片中显示评分"},show_reactions:{ru:"Показывать реакции Lampa",en:"Show Lampa Reactions",uk:"Показувати реакції Lampa",be:"Паказваць рэакцыі Lampa",bg:"Показване на реакции Lampa",cs:"Zobrazit reakce Lampa",he:"הצג תגובות Lampa",pt:"Mostrar reações Lampa",zh:"显示 Lampa 反应"},show_reactions_desc:{ru:"Отображать блок с реакциями на карточке",en:"Display reactions block on card",uk:"Відображати блок з реакціями на картці",be:"Адлюстроўваць блок з рэакцыямі на картцы",bg:"Показване на блока с реакции на картата",cs:"Zobrazit blok s reakcemi na kartě",he:"הצג בלוק תגובות בכרטיס",pt:"Exibir bloco de reações no cartão",zh:"在卡片上显示反应块"},show_foreign_logo:{ru:"Логотип на английском",en:"No language logo",uk:"Логотип англійською",be:"Лагатып на англійскай",bg:"Лого на английски",cs:"Logo v angličtině",he:"לוגו באנגלית",pt:"Logotipo em inglês",zh:"英文徽标"},show_foreign_logo_desc:{ru:"Показывать логотип на английском языке, если нет на русском",en:"Show no language logo if localized version is missing",uk:"Показувати логотип на англійській мові, якщо немає на українській",be:"Паказваць лагатып на англійскай мове, калі няма на беларускай",bg:"Показване на лого на английски език, ако не е налично на български",cs:"Zobrazit logo v angličtině, pokud není k dispozici v češtině",he:"הצג לוגו באנגלית אם הגרסה המקומית חסרה",pt:"Mostrar logotipo em inglês se a versão localizada estiver ausente",zh:"如果本地化版本缺失，则显示英文徽标"},ratings_position:{ru:"Расположение рейтингов",en:"Ratings position",uk:"Розташування рейтингів",be:"Размяшчэнне рэйтынгаў",bg:"Позиция на рейтингите",cs:"Umístění hodnocení",he:"מיקום דירוגים",pt:"Posição das classificações",zh:"评分位置"},ratings_position_desc:{ru:"Выберите где отображать рейтинги",en:"Choose where to display ratings",uk:"Виберіть де відображати рейтинги",be:"Выберыце дзе адлюстроўваць рэйтынгі",bg:"Изберете къде да се показват рейтингите",cs:"Vyberte, kde zobrazit hodnocení",he:"בחר היכן להציג דירוגים",pt:"Escolha onde exibir classificações",zh:"选择评分显示位置"},position_card:{ru:"В карточке",en:"In card",uk:"У картці",be:"У картцы",bg:"В картата",cs:"Na kartě",he:"בכרטיס",pt:"No cartão",zh:"在卡片中"},position_corner:{ru:"В правом нижнем углу",en:"Bottom right corner",uk:"У правому нижньому куті",be:"У правым ніжнім куце",bg:"В долния десен ъгъл",cs:"V pravém dolním rohu",he:"בפינה הימנית התחתונה",pt:"Canto inferior direito",zh:"右下角"},year_short:{ru:" г.",en:"",uk:" р.",be:" г.",bg:" г.",cs:"",he:"",pt:"",zh:"年"},logo_scale:{ru:"Размер логотипа",en:"Logo Size",uk:"Розмір логотипу",be:"Памер лагатыпа",bg:"Размер на логото",cs:"Velikost loga",he:"גודל לוגו",pt:"Tamanho do logotipo",zh:"徽标大小"},logo_scale_desc:{ru:"Масштаб логотипа фильма",en:"Movie logo scale",uk:"Масштаб логотипу фільму",be:"Маштаб лагатыпа фільма",bg:"Мащаб на логото на филма",cs:"Měřítko loga filmu",he:"קנה מידה של לוגו הסרט",pt:"Escala do logotipo do filme",zh:"电影徽标比例"},text_scale:{ru:"Размер текста",en:"Text Size",uk:"Розмір тексту",be:"Памер тэксту",bg:"Размер на текста",cs:"Velikost textu",he:"גודל טקסט",pt:"Tamanho do texto",zh:"文本大小"},text_scale_desc:{ru:"Масштаб текста данных о фильме",en:"Movie data text scale",uk:"Масштаб тексту даних про фільм",be:"Маштаб тэксту даных пра фільм",bg:"Мащаб на текста с данни за филма",cs:"Měřítko textu dat filmu",he:"קנה מידה של טקסט נתוני הסרט",pt:"Escala do texto de dados do filme",zh:"电影数据文本比例"},scale_default:{ru:"По умолчанию",en:"Default",uk:"За замовчуванням",be:"Па змаўчанні",bg:"По подразбиране",cs:"Výchozí",he:"ברירת מחדל",pt:"Padrão",zh:"默认"},spacing_scale:{ru:"Отступы между строками",en:"Spacing Between Lines",uk:"Відступи між рядками",be:"Адступы паміж радкамі",bg:"Разстояние между редовете",cs:"Mezery mezi řádky",he:"מרווח בין שורות",pt:"Espaçamento entre linhas",zh:"行间距"},spacing_scale_desc:{ru:"Расстояние между элементами информации",en:"Distance between information elements",uk:"Відстань між елементами інформації",be:"Адлегласць паміж элементамі інфармацыі",bg:"Разстояние между информационни елементи",cs:"Vzdálenost mezi informačními prvky",he:"מרחק בין אלמנטי מידע",pt:"Distância entre elementos de informação",zh:"信息元素之间的距离"},settings_title_display:{ru:"Отображение",en:"Display",uk:"Відображення",be:"Адлюстраванне",bg:"Показване",cs:"Zobrazení",he:"תצוגה",pt:"Exibição",zh:"显示"},settings_title_scaling:{ru:"Масштабирование",en:"Scaling",uk:"Масштабування",be:"Маштабаванне",bg:"Мащабиране",cs:"Škálování",he:"קנה מידה",pt:"Dimensionamento",zh:"缩放"},show_episode_count:{ru:"Количество серий",en:"Episode Count",uk:"Кількість серій",be:"Колькасць серый",bg:"Брой епизоди",cs:"Počet epizod",he:"מספר פרקים",pt:"Número de episódios",zh:"剧集数量"},show_episode_count_desc:{ru:"Показывать общее количество серий для сериалов",en:"Show total episode count for TV shows",uk:"Показувати загальну кількість серій для серіалів",be:"Паказваць агульную колькасць серый для серыялаў",bg:"Показване на общия брой епизоди за сериали",cs:"Zobrazit celkový počet epizod u seriálů",he:"הצג את סך כל הפרקים עבור סדרות טלוויזיה",pt:"Mostrar o número total de episódios para séries",zh:"显示电视剧的总剧集数"},reverse_episodes:{ru:"Перевернуть список эпизодов",en:"Reverse Episodes List",uk:"Перевернути список епізодів",be:"Перавярнуць спіс эпізодаў",bg:"Обърни списъка с епизоди",cs:"Obrátit seznam epizod",he:"הפוך את רשימת הפרקים",pt:"Inverter lista de episódios",zh:"反转剧集列表"},reverse_episodes_desc:{ru:"Показывать эпизоды в обратном порядке (от новых к старым)",en:"Show episodes in reverse order (from newest to oldest)",uk:"Показувати епізоди у зворотному порядку (від нових до старих)",be:"Паказваць эпізоды ў адваротным парадку (ад новых да старых)",bg:"Показване на епизоди в обратен ред (от нови към стари)",cs:"Zobrazit epizody v opačném pořadí (od nejnovějších po nejstarší)",he:"הצג פרקים בסדר הפוך (מהחדש לישן)",pt:"Mostrar episódios em ordem inversa (do mais novo ao mais antigo)",zh:"以相反顺序显示剧集（从新到旧）"},description_overlay:{ru:"Описание в оверлее",en:"Description in Overlay",uk:"Опис в оверлеї",be:"Апісанне ў аверлеі",bg:"Описание в овърлей",cs:"Popis v překryvné vrstvě",he:"תיאור בשכבת על",pt:"Descrição em sobreposição",zh:"叠加层中的描述"},description_overlay_desc:{ru:"Показывать описание в отдельном окне при нажатии",en:"Show description in a separate window when clicked",uk:"Показувати опис в окремому вікні при натисканні",be:"Паказваць апісанне ў асобным акне пры націску",bg:"Показване на описанието в отделен прозорец при щракване",cs:"Při kliknutí zobrazit popis v samostatném okně",he:"הצג תיאור בחלון נפרד בעת לחיצה",pt:"Mostrar descrição em uma janela separada quando clicado",zh:"点击时在单独的窗口中显示描述"},liquid_glass:{ru:"Жидкое стекло",en:"Liquid Glass",uk:"Рідке скло",be:"Вадкае шкло",bg:"Течно стъкло",cs:"Tekuté sklo",he:"זכוכית נוזלית",pt:"Vidro Líquido",zh:"液体玻璃"},liquid_glass_desc:{ru:"Эффект «стеклянных» карточек при наведении в эпизодах и актерах",en:'"Glassy" card effect on focus in episodes and cast',uk:"Ефект «скляних» карток при наведенні в епізодах та акторах",be:"Эфект «шкляных» картак пры навядзенні ў эпізодах і акцёрах",bg:"Ефект „стъклени“ карти при фокус в епизодите и актьорите",cs:"Efekt „skleněných“ karet při zaměření v epizodách a obsazení",he:'אפקט כрטיסי "זכוכית" במיקוד בפרקים ובשחקנים',pt:'Efeito de cartões "vítreos" em foco nos episódios e elenco',zh:"剧集和演员表中聚焦时的“玻璃”卡片效果"},about_author:{ru:"Автор",en:"Author",uk:"Автор",be:"Аўтар",bg:"Автор",cs:"Autor",he:"מחבר",pt:"Autor",zh:"作者"},about_description:{ru:"Делает интерфейс в карточке фильма похожим на Apple TV и оптимизирует под 4K",en:"Makes the movie card interface look like Apple TV and optimizes for 4K",uk:"Робить інтерфейс у картці фільму схожим на Apple TV та оптимізує під 4K",be:"Робіць інтэрфейс у картцы фільма падобным на Apple TV і аптымізуе пад 4K",bg:"Прави интерфейса в картата на филма подобен на Apple TV и оптимизира за 4K",cs:"Vytváří rozhraní karty filmu podobné Apple TV a optimalizuje pro 4K",he:"הופך את ממשק כрטיס הסרט לדומה ל-Apple TV ומבצע אופטימיזציה ל-4K",pt:"Torna a interface do cartão do filme semelhante à Apple TV e otimiza para 4K",zh:"使电影卡片界面看起来像 Apple TV 并针对 4K 进行优化"}};function f(t){const e=Lampa.Storage.get("language","ru");return u[t]&&u[t][e]||u[t].ru}function v(){Lampa.Storage.get("applecation_liquid_glass",!0)?$("body").removeClass("applecation--no-liquid-glass"):$("body").addClass("applecation--no-liquid-glass")}function b(){const t=parseInt(Lampa.Storage.get("applecation_logo_scale","100")),e=parseInt(Lampa.Storage.get("applecation_text_scale","100")),n=parseInt(Lampa.Storage.get("applecation_spacing_scale","100"));$('style[data-id="applecation_scales"]').remove();const a=`\n            <style data-id="applecation_scales">\n                /* Масштаб логотипа */\n                \n                .applecation .applecation__logo img {\n                    max-width: ${35*t/100}vw !important;\n                    max-height: ${180*t/100}px !important;\n                }\n\n                /* Масштаб текста и мета-информации */\n                .applecation .applecation__content-wrapper {\n                    font-size: ${e}% !important;\n                }\n\n                /* Отступы между элементами */\n                .applecation .full-start-new__title {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__meta {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__ratings {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__description {\n                    max-width: ${35*e/100}vw !important;\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n                \n                .applecation .applecation__info {\n                    margin-bottom: ${.5*n/100}em !important;\n                }\n            </style>\n        `;$("body").append(a)}function y(){Lampa.Template.add("applecation_overlay",'\n            <div class="applecation-description-overlay">\n                <div class="applecation-description-overlay__bg"></div>\n                <div class="applecation-description-overlay__content selector">\n                    <div class="applecation-description-overlay__logo"></div>\n                    <div class="applecation-description-overlay__title">{title}</div>\n                    <div class="applecation-description-overlay__text">{text}</div>\n                    <div class="applecation-description-overlay__details">\n                        <div class="applecation-description-overlay__info">\n                            <div class="applecation-description-overlay__info-name">#{full_date_of_release}</div>\n                            <div class="applecation-description-overlay__info-body">{relise}</div>\n                        </div>\n                        <div class="applecation-description-overlay__info applecation--budget">\n                            <div class="applecation-description-overlay__info-name">#{full_budget}</div>\n                            <div class="applecation-description-overlay__info-body">{budget}</div>\n                        </div>\n                        <div class="applecation-description-overlay__info applecation--countries">\n                            <div class="applecation-description-overlay__info-name">#{full_countries}</div>\n                            <div class="applecation-description-overlay__info-body">{countries}</div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        ')}function C(){const t=Lampa.Storage.get("applecation_ratings_position","card"),e='\x3c!-- Рейтинги --\x3e\n                    <div class="applecation__ratings">\n                        <div class="rate--imdb hide">\n                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">\n                                <path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/>\n                            </svg>\n                            <div>0.0</div>\n                        </div>\n                        <div class="rate--kp hide">\n                            <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none">\n                                <path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10"/>\n                            </svg>\n                            <div>0.0</div>\n                        </div>\n                        \x3c!-- Контейнер для встроенных рейтингов (чтобы можно было анимировать появление отдельно от общего блока) --\x3e\n                        <div class="applecation__ratings-builtin hide"></div>\n                    </div>',n=`<div class="full-start-new applecation">\n        <div class="full-start-new__body">\n            <div class="full-start-new__left hide">\n                <div class="full-start-new__poster">\n                    <img class="full-start-new__img full--poster" />\n                </div>\n            </div>\n\n            <div class="full-start-new__right">\n                <div class="applecation__left">\n                    <div class="applecation__logo"></div>\n                    \n                    <div class="applecation__content-wrapper">\n                        <div class="full-start-new__title" style="display: none;">{title}</div>\n                        \n                        <div class="applecation__meta">\n                            <div class="applecation__meta-left">\n                                <span class="applecation__network"></span>\n                                <span class="applecation__meta-text"></span>\n                                <div class="full-start__pg hide"></div>\n                            </div>\n                        </div>\n                        \n                        ${"card"===t?e:""}\n                        \n                        <div class="applecation__description-wrapper">\n                            <div class="applecation__description"></div>\n                        </div>\n                        <div class="applecation__info"></div>\n                    </div>\n                    \n                    \x3c!-- Скрытые оригинальные элементы --\x3e\n                    <div class="full-start-new__head" style="display: none;"></div>\n                    <div class="full-start-new__details" style="display: none;"></div>\n\n                    <div class="full-start-new__buttons">\n                        <div class="full-start__button selector button--play">\n                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>\n                                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>\n                            </svg>\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--book">\n                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>\n                            </svg>\n                            <span>#{settings_input_links}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--reaction">\n                            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3164 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/>\n                                <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/>\n                            </svg>\n                            <span>#{title_reactions}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--subscribe hide">\n                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>\n                                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>\n                            </svg>\n                            <span>#{title_subscribe}</span>\n                        </div>\n\n                        <div class="full-start__button selector button--options">\n                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">\n                                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>\n                                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>\n                                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>\n                            </svg>\n                        </div>\n                    </div>\n                </div>\n\n                <div class="applecation__right">\n                    <div class="full-start-new__reactions selector">\n                        <div>#{reactions_none}</div>\n                    </div>\n                    \n                    ${"corner"===t?e:""}\n\n                    \x3c!-- Скрытый элемент для совместимости (предотвращает выход реакций за экран) --\x3e\n                    <div class="full-start-new__rate-line">\n                        <div class="full-start__status hide"></div>\n                    </div>\n                    \n                    \x3c!-- Пустой маркер для предотвращения вставки элементов от modss.js --\x3e\n                    <div class="rating--modss" style="display: none;"></div>\n                </div>\n            </div>\n        </div>\n\n        <div class="hide buttons--container">\n            <div class="full-start__button view--torrent hide">\n                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50px" height="50px">\n                    <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/>\n                </svg>\n                <span>#{full_torrents}</span>\n            </div>\n\n            <div class="full-start__button selector view--trailer">\n                <svg height="70" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg">\n                    <path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"></path>\n                </svg>\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>`;Lampa.Template.add("full_start_new",n);Lampa.Template.add("full_episode",'<div class="full-episode selector layer--visible">\n            <div class="full-episode__img">\n                <img />\n                <div class="full-episode__time">{time}</div>\n            </div>\n\n            <div class="full-episode__body">\n                <div class="full-episode__num">#{full_episode} {num}</div>\n                <div class="full-episode__name">{name}</div>\n                <div class="full-episode__overview">{overview}</div>\n                <div class="full-episode__date">{date}</div>\n            </div>\n        </div>')}function w(t,e){const n=t.render().find(".applecation__meta-text"),a=[];if(a.push(function(t){const e=Lampa.Storage.get("language","ru"),n=!!t.name,a={ru:n?"Сериал":"Фильм",en:n?"TV Series":"Movie",uk:n?"Серіал":"Фільм",be:n?"Серыял":"Фільм",bg:n?"Сериал":"Филм",cs:n?"Seriál":"Film",he:n?"סדרה":"סרט",pt:n?"Série":"Filme",zh:n?"电视剧":"电影"};return a[e]||a.en}(e)),e.genres&&e.genres.length){const t=e.genres.slice(0,2).map(t=>Lampa.Utils.capitalizeFirstLetter(t.name));a.push(...t)}n.html(a.join(" · ")),function(t,e){const n=t.render().find(".applecation__network");if(e.networks&&e.networks.length){const t=e.networks[0];if(t.logo_path){const e=Lampa.Api.img(t.logo_path,"w200");return void n.html(`<img src="${e}" alt="${t.name}">`)}}if(e.production_companies&&e.production_companies.length){const t=e.production_companies[0];if(t.logo_path){const e=Lampa.Api.img(t.logo_path,"w200");return void n.html(`<img src="${e}" alt="${t.name}">`)}}n.remove()}(t,e)}function x(t,e){const n=t.render().find(".applecation__description"),a=t.render().find(".applecation__description-wrapper"),i=e.overview||"",o=Lampa.Storage.get("applecation_description_overlay",!0);n.text(i),o?(!function(t,e){const n=e.overview||"",a=e.title||e.name;if(!n)return;$(".applecation-description-overlay").remove();const i=(e.release_date||e.first_air_date||"")+"",o=i.length>3?Lampa.Utils.parseTime(i).full:i.length>0?i:Lampa.Lang.translate("player_unknown"),l="$ "+Lampa.Utils.numberWithSpaces(e.budget||0),r=(c=e,c.production_countries?c.production_countries.map(t=>{const e="country_"+t.iso_3166_1.toLowerCase(),n=Lampa.Lang.translate(e);return n!==e?n:t.name}):[]),s=r.join(", "),p=$(Lampa.Template.get("applecation_overlay",{title:a,text:n,relise:o,budget:l,countries:s}));var c;e.budget&&0!==e.budget||p.find(".applecation--budget").remove();s||p.find(".applecation--countries").remove();$("body").append(p),p.data("controller-created",!1)}(0,e),a.off("hover:enter").on("hover:enter",function(){!function(){const t=$(".applecation-description-overlay");if(!t.length)return;if(setTimeout(()=>t.addClass("show"),10),!t.data("controller-created")){const e={toggle:function(){Lampa.Controller.collectionSet(t),Lampa.Controller.collectionFocus(t.find(".applecation-description-overlay__content"),t)},back:function(){!function(){const t=$(".applecation-description-overlay");if(!t.length)return;t.removeClass("show"),setTimeout(()=>{Lampa.Controller.toggle("content")},300)}()}};Lampa.Controller.add("applecation_description",e),t.data("controller-created",!0)}Lampa.Controller.toggle("applecation_description")}()})):(a.off("hover:enter"),$(".applecation-description-overlay").remove())}function L(t,e){const n=t.render().find(".applecation__info"),a=[],i=e.release_date||e.first_air_date||"";if(i){const t=i.split("-")[0];a.push(t)}if(e.name){if(e.episode_run_time&&e.episode_run_time.length){const t=e.episode_run_time[0],n=Lampa.Lang.translate("time_m").replace(".","");a.push(`${t} ${n}`)}const t=Lampa.Utils.countSeasons(e);if(t&&a.push(function(t){const e=Lampa.Storage.get("language","ru");if(["ru","uk","be","bg"].includes(e)){const n=[2,0,1,1,1,2],a={ru:["сезон","сезона","сезонов"],uk:["сезон","сезони","сезонів"],be:["сезон","сезоны","сезонаў"],bg:["сезон","сезона","сезона"]};return`${t} ${(a[e]||a.ru)[t%100>4&&t%100<20?2:n[Math.min(t%10,5)]]}`}if("en"===e)return 1===t?`${t} Season`:`${t} Seasons`;if("cs"===e)return 1===t||t>=2&&t<=4?`${t} série`:`${t} sérií`;if("pt"===e)return 1===t?`${t} Temporada`:`${t} Temporadas`;if("he"===e)return 1===t?`עונה ${t}`:`${t} עונות`;if("zh"===e)return`${t} 季`;const n=Lampa.Lang.translate("full_season");return 1===t?`${t} ${n}`:`${t} ${n}s`}(t)),Lampa.Storage.get("applecation_show_episode_count",!1)){const t=e.number_of_episodes;t&&a.push(function(t){const e=Lampa.Storage.get("language","ru");if(["ru","uk","be","bg"].includes(e)){const n=[2,0,1,1,1,2],a={ru:["серия","серии","серий"],uk:["серія","серії","серій"],be:["серыя","серыі","серый"],bg:["епизод","епизода","епизода"]};return`${t} ${(a[e]||a.ru)[t%100>4&&t%100<20?2:n[Math.min(t%10,5)]]}`}if("en"===e)return 1===t?`${t} Episode`:`${t} Episodes`;if("cs"===e)return 1===t?`${t} epizoda`:t>=2&&t<=4?`${t} epizody`:`${t} epizod`;if("pt"===e)return 1===t?`${t} Episódio`:`${t} Episódios`;if("he"===e)return 1===t?`פרק ${t}`:`${t} פרקים`;if("zh"===e)return`${t} 集`;const n=Lampa.Lang.translate("full_episode");return 1===t?`${t} ${n}`:`${t} ${n}s`}(t))}}else if(e.runtime&&e.runtime>0){const t=Math.floor(e.runtime/60),n=e.runtime%60,i=Lampa.Lang.translate("time_h").replace(".",""),o=Lampa.Lang.translate("time_m").replace(".",""),l=t>0?`${t} ${i} ${n} ${o}`:`${n} ${o}`;a.push(l)}const o=a.length>0?a.join(" · "):"";n.html(o+'<span class="applecation__quality-badges"></span>')}function k(t){const e=activity.render().find(".applecation__quality-badges");if(!e.length)return;const n=[];if(qualityInfo.quality){let t="";"4K"===qualityInfo.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM113 20.9092L74.1367 82.1367V97.6367H118.818V114H137.637V97.6367H149.182V81.8633H137.637V20.9092H113ZM162.841 20.9092V114H182.522V87.5459L192.204 75.7275L217.704 114H241.25L206.296 62.5908L240.841 20.9092H217.25L183.75 61.9541H182.522V20.9092H162.841ZM119.182 81.8633H93.9541V81.1367L118.454 42.3633H119.182V81.8633Z" fill="white"/></svg>':"2K"===qualityInfo.quality?t='<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM110.608 19.6367C104.124 19.6367 98.3955 20.8638 93.4258 23.3184C88.4563 25.7729 84.5925 29.2428 81.835 33.7275C79.0775 38.2123 77.6992 43.5001 77.6992 49.5908H96.3809C96.3809 46.6212 96.9569 44.0607 98.1084 41.9092C99.2599 39.7578 100.896 38.1056 103.017 36.9541C105.138 35.8026 107.623 35.2275 110.472 35.2275C113.199 35.2276 115.639 35.7724 117.79 36.8633C119.941 37.9238 121.638 39.4542 122.881 41.4541C124.123 43.4238 124.744 45.7727 124.744 48.5C124.744 50.9545 124.244 53.2421 123.244 55.3633C122.244 57.4542 120.774 59.5906 118.835 61.7725C116.926 63.9543 114.562 66.4094 111.744 69.1367L78.6084 99.8184V114H144.972V97.9092H105.881V97.2725L119.472 83.9541C125.865 78.1361 130.82 73.1514 134.335 69C137.85 64.8182 140.29 61.0151 141.653 57.5908C143.047 54.1666 143.744 50.6968 143.744 47.1816C143.744 41.8182 142.366 37.0606 139.608 32.9092C136.851 28.7577 132.986 25.515 128.017 23.1816C123.077 20.8182 117.275 19.6368 110.608 19.6367ZM159.778 20.9092V114H179.46V87.5459L189.142 75.7275L214.642 114H238.188L203.233 62.5908L237.778 20.9092H214.188L180.688 61.9541H179.46V20.9092H159.778Z" fill="white"/></svg>':"FULL HD"===qualityInfo.quality?t='<svg viewBox="331 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M622 0C633.046 3.57563e-06 642 8.95431 642 20V114C642 125.046 633.046 134 622 134H351C339.954 134 331 125.046 331 114V20C331 8.95431 339.954 0 351 0H622ZM362.341 20.9092V114H382.022V75.5459H419.887V59.3184H382.022V37.1367H423.978V20.9092H362.341ZM437.216 20.9092V114H456.897V75.5459H496.853V114H516.488V20.9092H496.853V59.3184H456.897V20.9092H437.216ZM532.716 20.9092V114H565.716C575.17 114 583.291 112.136 590.079 108.409C596.897 104.682 602.125 99.333 605.762 92.3633C609.428 85.3937 611.262 77.0601 611.262 67.3633C611.262 57.6968 609.428 49.3934 605.762 42.4541C602.125 35.5149 596.928 30.1969 590.171 26.5C583.413 22.7727 575.352 20.9092 565.988 20.9092H532.716ZM564.943 37.7725C570.761 37.7725 575.655 38.8027 579.625 40.8633C583.595 42.9239 586.579 46.1364 588.579 50.5C590.609 54.8636 591.625 60.4847 591.625 67.3633C591.625 74.3026 590.609 79.9694 588.579 84.3633C586.579 88.7269 583.579 91.955 579.579 94.0459C575.609 96.1063 570.715 97.1367 564.897 97.1367H552.397V37.7725H564.943Z" fill="white"/></svg>':"HD"===qualityInfo.quality&&(t='<svg viewBox="662 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M953 0C964.046 3.57563e-06 973 8.95431 973 20V114C973 125.046 964.046 134 953 134H682C670.954 134 662 125.046 662 114V20C662 8.95431 670.954 0 682 0H953ZM731.278 20.9092V114H750.96V75.5459H790.915V114H810.551V20.9092H790.915V59.3184H750.96V20.9092H731.278ZM826.778 20.9092V114H859.778C869.233 114 877.354 112.136 884.142 108.409C890.96 104.682 896.188 99.333 899.824 92.3633C903.491 85.3937 905.324 77.0601 905.324 67.3633C905.324 57.6968 903.491 49.3934 899.824 42.4541C896.188 35.5149 890.991 30.1969 884.233 26.5C877.476 22.7727 869.414 20.9092 860.051 20.9092H826.778ZM859.006 37.7725C864.824 37.7725 869.718 38.8027 873.688 40.8633C877.657 42.9239 880.642 46.1364 882.642 50.5C884.672 54.8636 885.687 60.4847 885.688 67.3633C885.688 74.3026 884.672 79.9694 882.642 84.3633C880.642 88.7269 877.642 91.955 873.642 94.0459C869.672 96.1063 864.778 97.1367 858.96 97.1367H846.46V37.7725H859.006Z" fill="white"/></svg>'),t&&n.push(`<div class="quality-badge quality-badge--res">${t}</div>`)}if(qualityInfo.dv&&n.push('<div class="quality-badge quality-badge--dv"><svg viewBox="0 0 1051 393" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,393) scale(0.1,-0.1)" fill="currentColor"><path d="M50 2905 l0 -1017 223 5 c146 4 244 11 287 21 361 85 638 334 753 677 39 116 50 211 44 366 -7 200 -52 340 -163 511 -130 199 -329 344 -574 419 -79 24 -102 26 -327 31 l-243 4 0 -1017z"/><path d="M2436 3904 c-443 -95 -762 -453 -806 -905 -30 -308 86 -611 320 -832 104 -99 212 -165 345 -213 133 -47 253 -64 468 -64 l177 0 0 1015 0 1015 -217 -1 c-152 0 -239 -5 -287 -15z"/><path d="M3552 2908 l3 -1013 425 0 c309 0 443 4 490 13 213 43 407 148 550 299 119 124 194 255 247 428 25 84 27 103 27 270 1 158 -2 189 -22 259 -72 251 -221 458 -424 590 -97 63 -170 97 -288 134 l-85 26 -463 4 -462 3 2 -1013z m825 701 c165 -22 283 -81 404 -199 227 -223 279 -550 133 -831 -70 -133 -176 -234 -319 -304 -132 -65 -197 -75 -490 -75 l-245 0 0 703 c0 387 3 707 7 710 11 11 425 8 510 -4z"/><path d="M7070 2905 l0 -1015 155 0 155 0 0 1015 0 1015 -155 0 -155 0 0 -1015z"/><path d="M7640 2905 l0 -1015 150 0 150 0 0 60 c0 33 2 60 5 60 2 0 33 -15 67 -34 202 -110 433 -113 648 -9 79 38 108 59 180 132 72 71 95 102 134 181 102 207 102 414 1 625 -120 251 -394 411 -670 391 -115 -8 -225 -42 -307 -93 -21 -13 -42 -23 -48 -23 -7 0 -10 125 -10 370 l0 370 -150 0 -150 0 0 -1015z m832 95 c219 -67 348 -310 280 -527 -62 -198 -268 -328 -466 -295 -96 15 -168 52 -235 119 -131 132 -164 311 -87 478 27 60 101 145 158 181 100 63 234 80 350 44z"/><path d="M6035 3286 c-253 -49 -460 -232 -542 -481 -23 -70 -26 -96 -26 -210 0 -114 3 -140 26 -210 37 -113 90 -198 177 -286 84 -85 170 -138 288 -177 67 -22 94 -26 207 -26 113 0 140 4 207 26 119 39 204 92 288 177 87 89 140 174 177 286 22 67 26 99 27 200 1 137 -14 207 -69 320 -134 277 -457 440 -760 381z m252 -284 c117 -37 206 -114 260 -229 121 -253 -38 -548 -321 -595 -258 -43 -503 183 -483 447 20 271 287 457 544 377z"/><path d="M9059 3258 c10 -24 138 -312 285 -642 l266 -598 -72 -162 c-39 -88 -78 -171 -86 -183 -37 -58 -132 -80 -208 -48 l-35 14 -18 -42 c-10 -23 -37 -84 -60 -135 -23 -52 -39 -97 -36 -102 3 -4 40 -23 83 -41 70 -31 86 -34 177 -34 93 0 105 2 167 33 76 37 149 104 180 166 29 57 799 1777 805 1799 5 16 -6 17 -161 15 l-167 -3 -185 -415 c-102 -228 -192 -431 -200 -450 l-15 -35 -201 453 -201 452 -168 0 -168 0 18 -42z"/><path d="M2650 968 c0 -2 81 -211 179 -463 l179 -460 59 -3 59 -3 178 453 c98 249 180 459 183 466 4 9 -13 12 -65 12 -47 0 -71 -4 -74 -12 -3 -7 -65 -176 -138 -375 -73 -200 -136 -363 -139 -363 -3 0 -67 168 -142 373 l-136 372 -72 3 c-39 2 -71 1 -71 0z"/><path d="M3805 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 466 0 465 -60 0 c-39 0 -62 -4 -65 -12z"/><path d="M4580 960 c-97 -16 -178 -72 -211 -145 -23 -50 -24 -143 -3 -193 32 -77 91 -117 244 -167 99 -32 146 -64 166 -112 28 -65 -11 -149 -83 -179 -78 -33 -212 -1 -261 61 l-19 24 -48 -43 -48 -42 43 -37 c121 -103 347 -112 462 -17 54 44 88 120 88 194 -1 130 -79 213 -242 256 -24 7 -71 25 -104 41 -48 22 -66 37 -79 65 -32 67 -5 138 65 174 73 37 193 18 244 -39 l20 -22 43 43 c41 40 42 43 25 61 -27 30 -102 64 -167 76 -64 12 -70 12 -135 1z"/><path d="M5320 505 l0 -465 65 0 65 0 0 465 0 465 -65 0 -65 0 0 -465z"/><path d="M6210 960 c-147 -25 -264 -114 -328 -249 -32 -65 -36 -84 -40 -175 -7 -161 33 -271 135 -367 140 -132 360 -164 541 -77 227 108 316 395 198 634 -88 177 -290 271 -506 234z m232 -132 c100 -46 165 -136 188 -261 20 -106 -18 -237 -88 -310 -101 -105 -245 -132 -377 -73 -74 33 -120 79 -157 154 -31 62 -33 74 -33 167 0 87 4 107 26 155 64 137 173 204 320 196 43 -2 85 -12 121 -28z"/><path d="M7135 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 376 c0 207 3 374 8 371 4 -2 115 -171 247 -375 l240 -371 78 0 77 0 0 465 0 465 -60 0 -60 0 -2 -372 -3 -372 -241 370 -241 369 -82 3 c-59 2 -83 -1 -86 -10z"/></g></svg></div>'),qualityInfo.hdr&&qualityInfo.hdr_type&&n.push('<div class="quality-badge quality-badge--hdr"><svg viewBox="-1 178 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="181.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M27.2784 293V199.909H46.9602V238.318H86.9148V199.909H106.551V293H86.9148V254.545H46.9602V293H27.2784ZM155.778 293H122.778V199.909H156.051C165.415 199.909 173.475 201.773 180.233 205.5C186.991 209.197 192.188 214.515 195.824 221.455C199.491 228.394 201.324 236.697 201.324 246.364C201.324 256.061 199.491 264.394 195.824 271.364C192.188 278.333 186.96 283.682 180.142 287.409C173.354 291.136 165.233 293 155.778 293ZM142.46 276.136H154.96C160.778 276.136 165.672 275.106 169.642 273.045C173.642 270.955 176.642 267.727 178.642 263.364C180.672 258.97 181.688 253.303 181.688 246.364C181.688 239.485 180.672 233.864 178.642 229.5C176.642 225.136 173.657 221.924 169.688 219.864C165.718 217.803 160.824 216.773 155.006 216.773H142.46V276.136ZM215.903 293V199.909H252.631C259.661 199.909 265.661 201.167 270.631 203.682C275.631 206.167 279.434 209.697 282.04 214.273C284.676 218.818 285.994 224.167 285.994 230.318C285.994 236.5 284.661 241.818 281.994 246.273C279.328 250.697 275.464 254.091 270.403 256.455C265.373 258.818 259.282 260 252.131 260H227.54V244.182H248.949C252.706 244.182 255.828 243.667 258.312 242.636C260.797 241.606 262.646 240.061 263.858 238C265.1 235.939 265.722 233.379 265.722 230.318C265.722 227.227 265.1 224.621 263.858 222.5C262.646 220.379 260.782 218.773 258.267 217.682C255.782 216.561 252.646 216 248.858 216H235.585V293H215.903ZM266.176 250.636L289.312 293H267.585L244.949 250.636H266.176Z" fill="currentColor"/></svg></div>'),qualityInfo.sound){let t="";"7.1"===qualityInfo.sound?t='<svg viewBox="-1 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M91.6023 483L130.193 406.636V406H85.2386V389.909H150.557V406.227L111.92 483H91.6023ZM159.545 484.182C156.545 484.182 153.97 483.121 151.818 481C149.697 478.848 148.636 476.273 148.636 473.273C148.636 470.303 149.697 467.758 151.818 465.636C153.97 463.515 156.545 462.455 159.545 462.455C162.455 462.455 165 463.515 167.182 465.636C169.364 467.758 170.455 470.303 170.455 473.273C170.455 475.273 169.939 477.106 168.909 478.773C167.909 480.409 166.591 481.727 164.955 482.727C163.318 483.697 161.515 484.182 159.545 484.182ZM215.045 389.909V483H195.364V408.591H194.818L173.5 421.955V404.5L196.545 389.909H215.045Z" fill="currentColor"/></svg>':"5.1"===qualityInfo.sound?t='<svg viewBox="330 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="333.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M443.733 484.273C437.309 484.273 431.581 483.091 426.551 480.727C421.551 478.364 417.581 475.106 414.642 470.955C411.703 466.803 410.172 462.045 410.051 456.682H429.142C429.354 460.288 430.869 463.212 433.688 465.455C436.506 467.697 439.854 468.818 443.733 468.818C446.824 468.818 449.551 468.136 451.915 466.773C454.309 465.379 456.172 463.455 457.506 461C458.869 458.515 459.551 455.667 459.551 452.455C459.551 449.182 458.854 446.303 457.46 443.818C456.097 441.333 454.203 439.394 451.778 438C449.354 436.606 446.581 435.894 443.46 435.864C440.733 435.864 438.081 436.424 435.506 437.545C432.96 438.667 430.975 440.197 429.551 442.136L412.051 439L416.46 389.909H473.369V406H432.688L430.278 429.318H430.824C432.46 427.015 434.93 425.106 438.233 423.591C441.536 422.076 445.233 421.318 449.324 421.318C454.93 421.318 459.93 422.636 464.324 425.273C468.718 427.909 472.188 431.53 474.733 436.136C477.278 440.712 478.536 445.985 478.506 451.955C478.536 458.227 477.081 463.803 474.142 468.682C471.233 473.53 467.157 477.348 461.915 480.136C456.703 482.894 450.642 484.273 443.733 484.273ZM500.733 484.182C497.733 484.182 495.157 483.121 493.006 481C490.884 478.848 489.824 476.273 489.824 473.273C489.824 470.303 490.884 467.758 493.006 465.636C495.157 463.515 497.733 462.455 500.733 462.455C503.642 462.455 506.188 463.515 508.369 465.636C510.551 467.758 511.642 470.303 511.642 473.273C511.642 475.273 511.127 477.106 510.097 478.773C509.097 480.409 507.778 481.727 506.142 482.727C504.506 483.697 502.703 484.182 500.733 484.182ZM556.233 389.909V483H536.551V408.591H536.006L514.688 421.955V404.5L537.733 389.909H556.233Z" fill="currentColor"/></svg>':"2.0"===qualityInfo.sound&&(t='<svg viewBox="661 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="664.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M722.983 483V468.818L756.119 438.136C758.938 435.409 761.301 432.955 763.21 430.773C765.15 428.591 766.619 426.455 767.619 424.364C768.619 422.242 769.119 419.955 769.119 417.5C769.119 414.773 768.498 412.424 767.256 410.455C766.013 408.455 764.316 406.924 762.165 405.864C760.013 404.773 757.574 404.227 754.847 404.227C751.998 404.227 749.513 404.803 747.392 405.955C745.271 407.106 743.634 408.758 742.483 410.909C741.331 413.061 740.756 415.621 740.756 418.591H722.074C722.074 412.5 723.453 407.212 726.21 402.727C728.968 398.242 732.831 394.773 737.801 392.318C742.771 389.864 748.498 388.636 754.983 388.636C761.65 388.636 767.453 389.818 772.392 392.182C777.362 394.515 781.225 397.758 783.983 401.909C786.741 406.061 788.119 410.818 788.119 416.182C788.119 419.697 787.422 423.167 786.028 426.591C784.665 430.015 782.225 433.818 778.71 438C775.195 442.152 770.241 447.136 763.847 452.955L750.256 466.273V466.909H789.347V483H722.983ZM815.108 484.182C812.108 484.182 809.532 483.121 807.381 481C805.259 478.848 804.199 476.273 804.199 473.273C804.199 470.303 805.259 467.758 807.381 465.636C809.532 463.515 812.108 462.455 815.108 462.455C818.017 462.455 820.563 463.515 822.744 465.636C824.926 467.758 826.017 470.303 826.017 473.273C826.017 475.273 825.502 477.106 824.472 478.773C823.472 480.409 822.153 481.727 820.517 482.727C818.881 483.697 817.078 484.182 815.108 484.182ZM874.483 485.045C866.665 485.015 859.938 483.091 854.301 479.273C848.695 475.455 844.377 469.924 841.347 462.682C838.347 455.439 836.862 446.727 836.892 436.545C836.892 426.394 838.392 417.742 841.392 410.591C844.422 403.439 848.741 398 854.347 394.273C859.983 390.515 866.695 388.636 874.483 388.636C882.271 388.636 888.968 390.515 894.574 394.273C900.21 398.03 904.544 403.485 907.574 410.636C910.604 417.758 912.104 426.394 912.074 436.545C912.074 446.758 910.559 455.485 907.528 462.727C904.528 469.97 900.225 475.5 894.619 479.318C889.013 483.136 882.301 485.045 874.483 485.045ZM874.483 468.727C879.816 468.727 884.074 466.045 887.256 460.682C890.438 455.318 892.013 447.273 891.983 436.545C891.983 429.485 891.256 423.606 889.801 418.909C888.377 414.212 886.347 410.682 883.71 408.318C881.104 405.955 878.028 404.773 874.483 404.773C869.18 404.773 864.938 407.424 861.756 412.727C858.574 418.03 856.968 425.97 856.938 436.545C856.938 443.697 857.65 449.667 859.074 454.455C860.528 459.212 862.574 462.788 865.21 465.182C867.847 467.545 870.938 468.727 874.483 468.727Z" fill="currentColor"/></svg>'),t&&n.push(`<div class="quality-badge quality-badge--sound">${t}</div>`)}qualityInfo.dub&&n.push('<div class="quality-badge quality-badge--dub"><svg viewBox="-1 558 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="561.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M60.5284 673H27.5284V579.909H60.8011C70.1648 579.909 78.2254 581.773 84.983 585.5C91.7405 589.197 96.9375 594.515 100.574 601.455C104.241 608.394 106.074 616.697 106.074 626.364C106.074 636.061 104.241 644.394 100.574 651.364C96.9375 658.333 91.7102 663.682 84.892 667.409C78.1042 671.136 69.983 673 60.5284 673ZM47.2102 656.136H59.7102C65.5284 656.136 70.4223 655.106 74.392 653.045C78.392 650.955 81.392 647.727 83.392 643.364C85.4223 638.97 86.4375 633.303 86.4375 626.364C86.4375 619.485 85.4223 613.864 83.392 609.5C81.392 605.136 78.4072 601.924 74.4375 599.864C70.4678 597.803 65.5739 596.773 59.7557 596.773H47.2102V656.136ZM178.153 579.909H197.835V640.364C197.835 647.152 196.214 653.091 192.972 658.182C189.759 663.273 185.259 667.242 179.472 670.091C173.684 672.909 166.941 674.318 159.244 674.318C151.517 674.318 144.759 672.909 138.972 670.091C133.184 667.242 128.684 663.273 125.472 658.182C122.259 653.091 120.653 647.152 120.653 640.364V579.909H140.335V638.682C140.335 642.227 141.108 645.379 142.653 648.136C144.229 650.894 146.441 653.061 149.29 654.636C152.138 656.212 155.456 657 159.244 657C163.063 657 166.381 656.212 169.199 654.636C172.047 653.061 174.244 650.894 175.79 648.136C177.366 645.379 178.153 642.227 178.153 638.682V579.909ZM214.028 673V579.909H251.301C258.15 579.909 263.862 580.924 268.438 582.955C273.013 584.985 276.453 587.803 278.756 591.409C281.059 594.985 282.21 599.106 282.21 603.773C282.21 607.409 281.483 610.606 280.028 613.364C278.574 616.091 276.574 618.333 274.028 620.091C271.513 621.818 268.634 623.045 265.392 623.773V624.682C268.938 624.833 272.256 625.833 275.347 627.682C278.468 629.53 280.998 632.121 282.938 635.455C284.877 638.758 285.847 642.697 285.847 647.273C285.847 652.212 284.619 656.621 282.165 660.5C279.741 664.348 276.15 667.394 271.392 669.636C266.634 671.879 260.771 673 253.801 673H214.028ZM233.71 656.909H249.756C255.241 656.909 259.241 655.864 261.756 653.773C264.271 651.652 265.528 648.833 265.528 645.318C265.528 642.742 264.907 640.47 263.665 638.5C262.422 636.53 260.65 634.985 258.347 633.864C256.074 632.742 253.362 632.182 250.21 632.182H233.71V656.909ZM233.71 618.864H248.301C250.998 618.864 253.392 618.394 255.483 617.455C257.604 616.485 259.271 615.121 260.483 613.364C261.725 611.606 262.347 609.5 262.347 607.045C262.347 603.682 261.15 600.97 258.756 598.909C256.392 596.848 253.028 595.818 248.665 595.818H233.71V618.864Z" fill="currentColor"/></svg></div>'),n.length>0&&(e.html(n.join("")),e.addClass("show"))}function k(t){const e=t.data.movie,n=t.object.activity;if(!e||!n)return;w(n,e),x(n,e),L(n,e),z(n,()=>{if(!m(n))return;n.render().find(".applecation__meta").addClass("show");const t=Lampa.Storage.get("applecation_description_overlay",!0),e=n.render().find(".applecation__description-wrapper").addClass("show");t&&(e.addClass("selector"),window.Lampa&&Lampa.Controller&&Lampa.Controller.collectionAppend(e)),n.render().find(".applecation__info").addClass("show"),n.render().find(".applecation__ratings").addClass("show")});const a=n.render().find(".applecation__logo"),i=n.render().find(".full-start-new__title"),o=t=>{const e={w200:"w300",w300:"w500",w500:"original"}[Lampa.Storage.field("poster_size")]||"w500",i=Lampa.TMDB.image(`/t/p/${e}${t}`),o=new Image;o.onload=()=>{m(n)&&(a.html(`<img src="${i}" alt="" />`),z(n,()=>{m(n)&&a.addClass("loaded")}),function(t){const e=$(".applecation-description-overlay");if(e.length&&t){const n=$("<img>").attr("src",t);e.find(".applecation-description-overlay__logo").html(n).css("display","block"),e.find(".applecation-description-overlay__title").css("display","none")}}(i))},o.src=i};if(e.images&&e.images.logos&&e.images.logos.length>0){const t=Lampa.Storage.field("tmdb_lang")||Lampa.Storage.get("language")||"ru";let n=e.images.logos.find(e=>e.iso_639_1===t);if(!n&&Lampa.Storage.get("applecation_show_foreign_logo",!0)&&(n=e.images.logos.find(t=>"en"===t.iso_639_1),n||(n=e.images.logos.find(t=>!t.iso_639_1)),n||(n=e.images.logos[0])),n&&n.file_path)return o(n.file_path)}const l=e.name?"tv":"movie",r=Lampa.TMDB.api(`${l}/${e.id}/images?api_key=${Lampa.TMDB.key()}&language=${Lampa.Storage.get("language")}`);$.get(r,t=>{if(m(n)){if(t.logos&&t.logos.length>0){const e=Lampa.Storage.field("tmdb_lang")||Lampa.Storage.get("language")||"ru";let n=t.logos.find(t=>t.iso_639_1===e);if(!n&&Lampa.Storage.get("applecation_show_foreign_logo",!0)&&(n=t.logos.find(t=>"en"===t.iso_639_1)||t.logos.find(t=>!t.iso_639_1)||t.logos[0]),n&&n.file_path)return o(n.file_path)}i.show(),z(n,()=>{a.addClass("loaded")})}}).fail(()=>{i.show(),z(n,()=>{a.addClass("loaded")})})}function z(t,e){const n=t.render().find(".full-start__background:not(.applecation__overlay)");if(!n.length)return void e();if(n.hasClass("loaded")&&n.hasClass("applecation-animated"))return void e();if(n.hasClass("loaded"))return void setTimeout(()=>{n.addClass("applecation-animated"),e()},350);const a=setInterval(()=>{m(t)?n.hasClass("loaded")&&(clearInterval(a),setTimeout(()=>{m(t)&&(n.addClass("applecation-animated"),e())},650)):clearInterval(a)},50);setTimeout(()=>{clearInterval(a),n.hasClass("applecation-animated")||(n.addClass("applecation-animated"),e())},2e3)}var M={type:"other",version:t,name:"Applecation",description:"Делает интерфейс в карточке фильма похожим на Apple TV и оптимизирует под 4K",author:"@darkestclouds",icon:e};Lampa.Manifest&&Lampa.Manifest.plugins&&(Lampa.Manifest.plugins=M),window.appready?_():Lampa.Listener.follow("app",t=>{"ready"===t.type&&_()})}();
})();


/* Snack TV 0.8.11: isolated hero/full-card component port. */
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
    agn:         ['Закусь TV не включён: стоит плагин AppleTV AGNative, они несовместимы', 'Закусь TV не увімкнено: стоїть плагін AppleTV AGNative, вони несумісні', 'Zakus TV is off: the AppleTV AGNative plugin is installed, they do not mix']
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
  function logoLangs(m) {
    var l = opt(K.logo_lang);
    if (!l || l === 'ui') l = uiLang();
    var out = [l];
    var original = String((m && m.original_language) || '').toLowerCase();
    if (original && out.indexOf(original) < 0) out.push(original);
    if (l !== 'en' && out.indexOf('en') < 0) out.push('en');
    return out;
  }
  // the logo for a title: interface language -> English -> no language; '' = none (text is shown)
  function pickLogo(list, m) {
    if (!list || !list.length) return '';
    var langs = logoLangs(m), i, j;
    for (i = 0; i < langs.length; i++) for (j = 0; j < list.length; j++) if (list[j].iso_639_1 === langs[i] && list[j].file_path) return list[j].file_path;
    for (j = 0; j < list.length; j++) if (!list[j].iso_639_1 && list[j].file_path) return list[j].file_path;
    // TMDB anime logos are often tagged with a language that is neither the UI language nor English.
    // Use a real available logo before falling back to the text title.
    for (j = 0; j < list.length; j++) if (list[j].file_path) return list[j].file_path;
    return '';
  }
  function kindOf(m) {
    var type = String(m && (m.media_type || m.type || m.source_type) || '').toLowerCase();
    if (type === 'tv' || type === 'anime' || type === 'series' || type === 'show') return 'tv';
    return m && (m.name || m.original_name || m.first_air_date || m.number_of_seasons) ? 'tv' : 'movie';
  }
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
  function logoKey(m, langs) { langs = langs || logoLangs(m); return kindOf(m) + m.id + ':' + langs.join(','); }
  var logoWait = {};
  function getLogo(m, cb) {
    if (!m || !m.id) return cb('');
    // Some anime sources still provide a TMDB id but label the item with their own source name.
    // Try the TMDB images endpoint; an unmapped id safely returns no logo.
    var langs = logoLangs(m), key = logoKey(m, langs), have = logoCache().get(key);
    if (have !== undefined) return cb(have);
    if (m.images && m.images.logos) { var p = pickLogo(m.images.logos, m); if (p) { logoCache().set(key, p); return cb(p); } }
    if (logoWait[key]) { logoWait[key].push(cb); return; }
    logoWait[key] = [cb];
    tmdb(kindOf(m) + '/' + m.id + '/images?include_image_language=' + langs.join(',') + ',null', function (j) {
      var p = pickLogo(j && j.logos, m);
      logoCache().set(key, p);
      var w = logoWait[key]; delete logoWait[key];
      w.forEach(function (f) { f(p); });
    }, function () { var w = logoWait[key]; delete logoWait[key]; w.forEach(function (f) { f(''); }); });
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
    return [cssFull(c), cssEpisodes(c), cssHero(c), 'body.stv .agnative-hero{display:none!important}'].join('\n');
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
    r.push('@media (max-width: 700px){' + H + '{margin-top:-0.5cm}}');
    r.push(H + '__slide{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;transition:opacity 800ms ease-in-out}');
    r.push(H + '__slide.on{opacity:1}');
    r.push(H + '__slide img{width:100%;height:100%;object-fit:cover;object-position:50% 25%}');
    r.push(H + '__slide--poster img{object-position:50% 0}');
    r.push(H + '__scrim{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;' +
      'background:linear-gradient(to top,' + PAGE + ' 0%,' + (tv ? 'rgba(16,16,20,.55)' : 'rgba(0,0,0,.55)') + ' 22%,rgba(0,0,0,0) 50%),linear-gradient(to right,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 55%)}');
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
  function themeWanted() { return !!opt(K.on) && !agnative(); }
  function apply() {
    var on = themeWanted();
    window.__stvMobileComponents = on;
    measure();
    bodyClasses(on);
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'snack-tv-mobile-scope-css'; document.head.appendChild(styleEl); }
    var key = on ? [M, L, k, window.innerHeight, BASE].join('|') : '';
    if (key !== styleKey) { styleKey = key; styleEl.textContent = on ? css() : ''; }
    if (on) Array.prototype.forEach.call(document.querySelectorAll('.agnative-hero'), function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    try { if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update(); } catch (e) {}
  }
  function themeOn() { return document.body.classList.contains('stv'); }
  function guard(fn) { return function (e) { try { if (themeOn()) fn(e); } catch (x) { log(x && x.message); } }; }
  // AppleTV AGNative restyles the same places: the two do not mix
  var agnTold = false;
  function agnative() { return false; }

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
    render.removeClass('applecation').addClass('stv-full');
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
          rows = rows.filter(function (x) {
            var name = rowName(x);
            return name !== 'metadata_chart' && name !== 'metadata_tags' && name !== 'description' && !(hide && name === 'discuss');
          });
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
    }, { rootMargin: '0px 100% 0px 100%' }) : null;

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
      }, { rootMargin: '50% 100% 50% 0px' });
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
        if (j.images && j.images.logos) logoCache().set(logoKey(j, langs), pickLogo(j.images.logos, j));
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
    apply();
    addHeroRow();
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
    Lampa.Listener.follow('resize_end', function () { try { apply(); } catch (x) {} });
  }
  // for the pack's other plugins: «Трейлеры» asks whether background trailers fit the current look
  // (trailers: whether «auto» background trailers fit the current look: not in the light mode)
  // imgSize: the TMDB size the theme would take for a picture this wide (css px; the «Картинки» option),
  // so Autopilot's episode cards load the same stills as the theme's; plainText: TMDB text as the theme
  // shows it (no emoji boxes on TVs)
  function startSafe() { try { start(); } catch (x) { log(x && x.message); } }
  if (window.appready) startSafe();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startSafe(); });
})();
/* SenPlayer timecode bridge — opens a stream in SenPlayer at the position Lampa
 * remembers and writes SenPlayer's position back into Lampa's timeline.
 * SenPlayer 6.1.0+ (URL Scheme: position, x-callback-url return of play time).
 */
(function () {
    'use strict';

    var version = '2026-10-29-senplayer-bridge-v1';
    if (window.LampaSenBridgeVersion === version) return;
    window.LampaSenBridgeVersion = version;

    var COMPONENT = 'sen_bridge';
    var WATCH_KEY = 'sen_bridge_installed';
    var K = {
        enabled: 'sen_bridge_enabled',
        send: 'sen_bridge_send_position',
        save: 'sen_bridge_save_timecode',
        estimate: 'sen_bridge_estimate',
        subtitles: 'sen_bridge_subtitles',
        always: 'sen_bridge_always'
    };
    var PENDING_KEY = 'lampa_sen_bridge_pending';
    var RETURN_FLAG = 'lampa_sen';
    var PENDING_TTL = 12 * 60 * 60 * 1000;
    var MIN_TIME = 10;

    var TAB = (function () {
        try {
            var id = sessionStorage.getItem('lampa_sen_bridge_tab');
            if (!id) {
                id = Date.now() + '-' + Math.random().toString(36).slice(2);
                sessionStorage.setItem('lampa_sen_bridge_tab', id);
            }
            return String(id);
        } catch (e) { return ''; }
    })();

    var TIME_KEYS = ['position', 'currentTime', 'current_time', 'playbackTime', 'playback_time', 'time', 'pos', 'seconds', 'second', 'seek', 't'];
    var DURATION_KEYS = ['duration', 'totalTime', 'total_time', 'total', 'length', 'runTime', 'runtime', 'd'];
    var PROGRESS_KEYS = ['progress', 'percent', 'percentage', 'ratio'];

    var STR = {
        ru: {
            section: 'SenPlayer',
            enabled: 'Таймкоды SenPlayer',
            enabled_d: 'Открывать видео в SenPlayer и синхронизировать таймкод с Lampa',
            send: 'Передавать позицию',
            send_d: 'SenPlayer начнёт с места, где вы остановились в Lampa',
            save: 'Забирать таймкод',
            save_d: 'После выхода из SenPlayer позиция сохранится в Lampa',
            estimate: 'Оценка по времени',
            estimate_d: 'Если SenPlayer не вернул таймкод, посчитать его по времени просмотра',
            subtitles: 'Передавать субтитры',
            subtitles_d: 'Отдавать выбранные субтитры в SenPlayer',
            always: 'Всегда открывать SenPlayer',
            always_d: 'Игнорировать выбор плеера в настройках Lampa',
            info: 'Нужен SenPlayer 6.1.0 или новее. Плагін открывает поток в SenPlayer так же, как штатный внешний плеер Lampa.',
            saved: 'Таймкод из SenPlayer: ',
            on: 'Включено',
            off: 'Выключено'
        },
        uk: {
            section: 'SenPlayer',
            enabled: 'Таймкоди SenPlayer',
            enabled_d: 'Відкривати відео в SenPlayer і синхронізувати таймкод з Lampa',
            send: 'Передавати позицію',
            send_d: 'SenPlayer почне з місця, де ви зупинились у Lampa',
            save: 'Забирати таймкод',
            save_d: 'Після виходу з SenPlayer позиція збережеться у Lampa',
            estimate: 'Оцінка за часом',
            estimate_d: 'Якщо SenPlayer не повернув таймкод, порахувати його за часом перегляду',
            subtitles: 'Передавати субтитри',
            subtitles_d: 'Віддавати вибрані субтитри у SenPlayer',
            always: 'Завжди відкривати SenPlayer',
            always_d: 'Ігнорувати вибір плеєра в налаштуваннях Lampa',
            info: 'Потрібен SenPlayer 6.1.0 або новіший. Плагін відкриває потік у SenPlayer так само, як штатний зовнішній плеєр Lampa.',
            saved: 'Таймкод із SenPlayer: ',
            on: 'Увімкнено',
            off: 'Вимкнено'
        },
        en: {
            section: 'SenPlayer',
            enabled: 'SenPlayer timecodes',
            enabled_d: 'Open videos in SenPlayer and sync the timecode with Lampa',
            send: 'Send the position',
            send_d: 'SenPlayer starts where you stopped in Lampa',
            save: 'Take the timecode back',
            save_d: 'After leaving SenPlayer the position is saved in Lampa',
            estimate: 'Estimate from time',
            estimate_d: 'If SenPlayer returns no timecode, count it from watching time',
            subtitles: 'Send subtitles',
            subtitles_d: 'Hand the selected subtitles to SenPlayer',
            always: 'Always open SenPlayer',
            always_d: 'Ignore the player chosen in Lampa settings',
            info: 'SenPlayer 6.1.0 or newer is required. The plugin opens the stream in SenPlayer the same way Lampa\'s own external player does.',
            saved: 'Timecode from SenPlayer: ',
            on: 'On',
            off: 'Off'
        }
    };

    function lang() {
        var code = '';
        try { code = String(Lampa.Storage.get('language', '') || '').toLowerCase(); } catch (e) { }
        if (!code) code = String(navigator.language || 'uk').toLowerCase();
        if (code.indexOf('uk') === 0 || code.indexOf('ua') === 0) return 'uk';
        if (code.indexOf('en') === 0) return 'en';
        return 'ru';
    }

    function t(key) {
        var dict = STR[lang()] || STR.ru;
        return dict[key] || STR.ru[key] || key;
    }

    function storageReady() {
        return !!(window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function');
    }

    function flag(name, def) {
        var value = null;
        try { value = Lampa.Storage.get(name, def ? 'on' : 'off'); } catch (e) { }
        if (value === true || value === 'on' || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'off' || value === 'false' || value === 0 || value === '0') return false;
        return !!def;
    }

    function lsGet(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    }

    function lsSet(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
    }

    function lsDel(key) {
        try { localStorage.removeItem(key); } catch (e) { }
    }

    function number(value) {
        var parsed = parseFloat(String(value === undefined || value === null ? '' : value).replace(',', '.'));
        return isFinite(parsed) ? parsed : 0;
    }

    function secondsToTime(seconds) {
        try {
            if (window.Lampa && Lampa.Utils && typeof Lampa.Utils.secondsToTime === 'function') return Lampa.Utils.secondsToTime(seconds);
        } catch (e) { }
        var total = Math.max(0, Math.round(seconds || 0));
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
    }

    function notify(text) {
        if (!text) return;
        try {
            if (window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(text);
        } catch (e) { }
    }

    function playerField(data) {
        if (data && data.torrent_hash) return 'player_torrent';
        if (data && data.iptv) return 'player_iptv';
        return 'player';
    }

    function chosenPlayer(data) {
        try { return String(Lampa.Storage.field(playerField(data)) || ''); } catch (e) { return ''; }
    }

    function shouldHandle(data) {
        if (!storageReady() || !flag(K.enabled, true)) return false;
        if (!data || !data.url) return false;
        if (data.iptv || data.tv) return false;
        if (!/^https?:/i.test(String(data.url)) && !data.torrent_hash) return false;
        if (chosenPlayer(data) === 'senplayer') return true;
        return flag(K.always, false);
    }

    function resolveUrl(data) {
        var url = String(data && data.url ? data.url : '');
        try {
            if (data && data.quality && Lampa.Player && typeof Lampa.Player.getUrlQuality === 'function') {
                var picked = Lampa.Player.getUrlQuality(data.quality, false) || Lampa.Player.getUrlQuality(data.quality, true);
                if (picked) url = String(picked);
            }
            if (window.Lampa && Lampa.Torserver && typeof Lampa.Torserver.toPlayUrl === 'function') url = String(Lampa.Torserver.toPlayUrl(url));
        } catch (e) { }
        return /^https?:/i.test(url) || /^magnet:/i.test(url) ? url : '';
    }

    function timelineOf(data) {
        var info = { hash: '', time: 0, duration: 0, percent: 0, meta: null };
        var view = data && data.timeline ? data.timeline : null;
        if (!view) return info;
        info.hash = view.hash ? String(view.hash) : '';
        info.time = number(view.time);
        info.duration = number(view.duration);
        info.percent = number(view.percent);
        if (view.card) info.meta = { card: view.card, season: view.season, episode: view.episode };
        return info;
    }

    function baseUrl() {
        var origin = location.origin || (location.protocol + '//' + location.host);
        return origin + (location.pathname || '/');
    }

    function buildReturnUrl(info) {
        var parts = [RETURN_FLAG + '=1'];
        if (info.hash) parts.push('h=' + encodeURIComponent(info.hash));
        parts.push('p=' + Math.round(info.time || 0));
        if (info.duration) parts.push('d=' + Math.round(info.duration));
        if (info.percent) parts.push('pr=' + info.percent);
        if (info.meta) {
            var season = info.meta.season === undefined || info.meta.season === null ? '' : info.meta.season;
            var episode = info.meta.episode === undefined || info.meta.episode === null ? '' : info.meta.episode;
            parts.push('m=' + encodeURIComponent([info.meta.card, season, episode].join('|')));
        }
        return baseUrl() + '?' + parts.join('&');
    }

    function senUrl(data, url, info, back) {
        var query = ['url=' + encodeURIComponent(url)];

        if (flag(K.send, true) && info.time > MIN_TIME && (!info.duration || info.time < info.duration - 30)) {
            query.push('position=' + Math.round(info.time));
        }

        if (flag(K.subtitles, true)) {
            var subs = data && data.subtitles ? data.subtitles : [];
            var added = 0;
            for (var i = 0; i < subs.length && added < 8; i++) {
                if (subs[i] && subs[i].url) {
                    query.push('sub=' + encodeURIComponent(subs[i].url));
                    added++;
                }
            }
        }

        if (back) {
            query.push('x-success=' + encodeURIComponent(back));
            query.push('x-error=' + encodeURIComponent(back + '&sen_error=1'));
        }

        return 'senplayer://x-callback-url/play?' + query.join('&');
    }

    function launch(data) {
        var url = resolveUrl(data);
        if (!url) return false;

        var info = timelineOf(data);
        var back = flag(K.save, true) ? buildReturnUrl(info) : '';
        var target = senUrl(data, url, info, back);

        lsSet(PENDING_KEY, {
            hash: info.hash,
            meta: info.meta,
            url: url,
            start: Math.round(info.time || 0),
            duration: Math.round(info.duration || 0),
            tab: TAB,
            launched: Date.now()
        });

        try {
            if (window.Lampa && Lampa.Player && Lampa.Player.listener) Lampa.Player.listener.send('external', data);
        } catch (e) { }

        try { window.location.assign(target); } catch (e) { location.href = target; }
        return true;
    }

    /* ---------- reading SenPlayer's answer ---------- */

    function params(fromUrl) {
        var out = {};
        var href = String(fromUrl || location.href);
        var hashIndex = href.indexOf('#');
        if (hashIndex >= 0) href = href.slice(0, hashIndex);
        var queryIndex = href.indexOf('?');
        if (queryIndex < 0) return out;
        var pairs = href.slice(queryIndex + 1).split(/[?&]+/);
        for (var i = 0; i < pairs.length; i++) {
            if (!pairs[i]) continue;
            var eq = pairs[i].indexOf('=');
            var key = eq < 0 ? pairs[i] : pairs[i].slice(0, eq);
            var value = eq < 0 ? '' : pairs[i].slice(eq + 1);
            try {
                out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
            } catch (e) {
                out[key] = value;
            }
        }
        return out;
    }

    function pick(map, keys) {
        for (var i = 0; i < keys.length; i++) {
            var raw = map[keys[i]];
            if (raw === undefined || raw === null || raw === '') continue;
            var parsed = number(raw);
            if (parsed) return parsed;
        }
        return 0;
    }

    function parseMeta(raw) {
        if (!raw) return null;
        var parts = String(raw).split('|');
        if (!parts[0]) return null;
        var meta = { card: parts[0] };
        if (parts[1] !== undefined && parts[1] !== '') meta.season = parseInt(parts[1], 10);
        if (parts[2] !== undefined && parts[2] !== '') meta.episode = parseInt(parts[2], 10);
        return meta;
    }

    function apply(record) {
        if (!record || !record.hash) return false;

        var time = Math.max(0, Math.round(record.time || 0));
        if (time < MIN_TIME) return false;

        var duration = Math.max(0, Math.round(record.duration || 0));
        var progress = number(record.progress);
        if (progress > 1.5) progress = progress / 100;

        if (!duration && progress > 0) duration = Math.round(time / progress);

        var percent = 0;
        if (progress > 0) percent = Math.round(progress * 100);
        if (!percent && duration > 0) percent = Math.round(time / duration * 100);
        if (percent > 97 || (duration && time >= duration - 20)) percent = 100;
        if (percent > 100) percent = 100;
        if (!percent) percent = 1;

        var view = null;
        try { view = Lampa.Timeline.view(record.hash, record.meta || null); } catch (e) { }
        if (!view || typeof view.handler !== 'function') return false;

        if (!duration) duration = Math.round(view.duration || 0);

        try { view.handler(percent, time, duration); } catch (e) { return false; }

        notify(t('saved') + secondsToTime(time) + (record.estimated ? ' ~' : ''));
        return true;
    }

    function loadPending() {
        var pending = lsGet(PENDING_KEY);
        if (!pending || !pending.hash) return null;
        if (Date.now() - (pending.launched || 0) > PENDING_TTL) {
            lsDel(PENDING_KEY);
            return null;
        }
        return pending;
    }

    function cleanUrl() {
        try { history.replaceState(null, '', baseUrl() + (location.hash || '')); } catch (e) { }
    }

    function readReturn() {
        var map = params(location.href);
        var pending = loadPending();
        if (!map[RETURN_FLAG] && !pending) return false;

        var duration = pick(map, DURATION_KEYS) || (pending && pending.duration) || 0;
        var progress = pick(map, PROGRESS_KEYS);
        var time = pick(map, TIME_KEYS);

        if (!time && progress > 0 && duration) time = progress > 1.5 ? progress / 100 * duration : progress * duration;
        if (!time) return false;

        var record = {
            hash: map.h || (pending && pending.hash) || '',
            meta: parseMeta(map.m) || (pending && pending.meta) || null,
            time: time,
            duration: duration,
            progress: progress,
            estimated: false
        };

        if (!record.hash) return false;
        if (!apply(record)) return false;

        lsDel(PENDING_KEY);
        cleanUrl();
        return true;
    }

    /* ---------- fallback: estimate from wall-clock time ---------- */

    function probeDuration(url, done) {
        var finished = false;
        var video = document.createElement('video');

        function finish(value) {
            if (finished) return;
            finished = true;
            try { video.removeAttribute('src'); video.load(); } catch (e) { }
            done(Math.round(isFinite(value) ? value : 0));
        }

        try {
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.addEventListener('loadedmetadata', function () { finish(video.duration); });
            video.addEventListener('error', function () { finish(0); });
            video.src = url;
            setTimeout(function () { finish(0); }, 8000);
        } catch (e) {
            finish(0);
        }
    }

    function estimate() {
        var pending = loadPending();
        if (!pending || !flag(K.estimate, true)) return;

        if (pending.tab && TAB && pending.tab !== TAB) {
            lsDel(PENDING_KEY);
            return;
        }

        var elapsed = Math.round((Date.now() - (pending.launched || 0)) / 1000);
        if (elapsed < 45) return;

        var duration = Math.round(pending.duration || 0);
        var time = Math.round(pending.start || 0) + elapsed;
        if (duration && time > duration - 15) time = duration - 10;

        var record = { hash: pending.hash, meta: pending.meta, time: time, duration: duration, estimated: true };

        if (!duration && pending.url) {
            probeDuration(pending.url, function (found) {
                record.duration = found;
                apply(record);
                lsDel(PENDING_KEY);
            });
            return;
        }

        apply(record);
        lsDel(PENDING_KEY);
    }

    function scheduleEstimate() {
        setTimeout(estimate, 1200);
    }

    function bindResume() {
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) scheduleEstimate();
        });
        window.addEventListener('pageshow', function (event) {
            if (event && event.persisted) scheduleEstimate();
        });
        window.addEventListener('focus', scheduleEstimate);
        window.addEventListener('online', scheduleEstimate);
    }

    /* ---------- hooks ---------- */

    function hookPlay() {
        if (!window.Lampa || !Lampa.Player || typeof Lampa.Player.play !== 'function') return false;
        if (Lampa.Player.play.__senBridge) return true;

        var core = Lampa.Player.play;
        var wrapped = function (data) {
            var handled = false;
            try {
                handled = shouldHandle(data) && launch(data);
            } catch (e) {
                handled = false;
                try { console.log('SenBridge', e); } catch (ignored) { }
            }
            if (handled) return;
            return core.apply(this, arguments);
        };

        wrapped.__senBridge = true;
        Lampa.Player.play = wrapped;
        return true;
    }

    function registerSettings() {
        if (!window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return;
        if (window.__LAMPA_SEN_BRIDGE_SETTINGS__) return;
        window.__LAMPA_SEN_BRIDGE_SETTINGS__ = true;

        if (Lampa.Template && Lampa.Template.add) {
            try { Lampa.Template.add('settings_' + COMPONENT, '<div></div>'); } catch (e) { }
        }

        try {
            Lampa.SettingsApi.addComponent({
                component: COMPONENT,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
                name: t('section')
            });
        } catch (e) { }

        function select(key, nameKey, descKey, def) {
            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: key, type: 'select', values: { on: t('on'), off: t('off') }, default: def },
                field: { name: t(nameKey), description: t(descKey) }
            });
        }

        try {
            select(K.enabled, 'enabled', 'enabled_d', 'on');
            select(K.send, 'send', 'send_d', 'on');
            select(K.save, 'save', 'save_d', 'on');
            select(K.estimate, 'estimate', 'estimate_d', 'on');
            select(K.subtitles, 'subtitles', 'subtitles_d', 'on');
            select(K.always, 'always', 'always_d', 'off');

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: 'sen_bridge_info', type: 'static' },
                field: { name: t('section'), description: t('info') }
            });
        } catch (e) { }
    }

    var attempts = 0;

    function boot() {
        attempts++;

        if (!window.Lampa || !Lampa.Player || !Lampa.Player.play) {
            if (attempts < 120) setTimeout(boot, 250);
            return;
        }

        hookPlay();
        registerSettings();

        if (!window[WATCH_KEY]) {
            window[WATCH_KEY] = true;
            bindResume();
        }

        readReturn();
    }

    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
