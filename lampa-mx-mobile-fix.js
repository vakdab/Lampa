/* Lampa MX Mobile Smooth Fix — safe areas, touch handling and video focus */
(function () {
    'use strict';
    if (window.LampaMxMobileFix) return;
    window.LampaMxMobileFix = true;

    var STYLE_ID = 'lampa-mx-mobile-fix-style';
    var refreshFrame = 0;
    var activeVideo = null;

    function isMobile() {
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
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
            'html.lampa-mx-mobile-fix,body.lampa-mx-mobile-fix{min-height:100%;background:#000!important;overscroll-behavior:none;}',
            'body.lampa-mx-mobile-fix .head{top:env(safe-area-inset-top,0px)!important;}',
            'body.lampa-mx-mobile-fix .navigation-bar{padding-bottom:calc(2em + env(safe-area-inset-bottom,0px))!important;}',
            'body.lampa-mx-mobile-fix .wrap__content{padding-top:calc(4em + env(safe-area-inset-top,0px));}',
            'body.lampa-mx-mobile-fix .scroll:not(.scroll--horizontal),body.lampa-mx-mobile-fix [class*="short" i]{touch-action:pan-y!important;-webkit-overflow-scrolling:touch;}',
            'body.lampa-mx-mobile-fix .scroll--horizontal,body.lampa-mx-mobile-fix .scroll--horizontal-scroll{touch-action:pan-x!important;-webkit-overflow-scrolling:touch;}',
            'body.lampa-mx-mobile-fix.lampa-video-playing .head,body.lampa-mx-mobile-fix.lampa-video-playing .navigation-bar,body.lampa-mx-mobile-fix.lampa-video-playing .player__head,body.lampa-mx-mobile-fix.lampa-video-playing .player__controls{opacity:0!important;visibility:hidden!important;pointer-events:none!important;}',
            'body.lampa-mx-mobile-fix.lampa-video-playing{overflow:hidden!important;}',
            'body.lampa-mx-mobile-fix.lampa-video-playing video{max-width:100vw!important;max-height:100dvh!important;}',
            'html.lampa-mx-mobile-fix:fullscreen,html.lampa-mx-mobile-fix:fullscreen body{background:#000!important;}',
            'html.lampa-mx-mobile-fix:fullscreen video{width:100vw!important;height:100dvh!important;object-fit:contain!important;}'
        ].join('');
        document.head.appendChild(style);
        document.documentElement.classList.add('lampa-mx-mobile-fix');
        document.body.classList.add('lampa-mx-mobile-fix');
    }
    function patchScrollContainers(root) {
        Array.prototype.forEach.call(root.querySelectorAll('.scroll,[class*="short" i]'), function (element) {
            var horizontal = element.classList.contains('scroll--horizontal') || element.classList.contains('scroll--horizontal-scroll');
            element.style.touchAction = horizontal ? 'pan-x' : 'pan-y';
            element.style.webkitOverflowScrolling = 'touch';
        });
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
