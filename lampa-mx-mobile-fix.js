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
