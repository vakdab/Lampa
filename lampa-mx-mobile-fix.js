/* Lampa MX Mobile Smooth Fix — safe areas and low-overhead touch handling */
(function () {
    'use strict';
    if (window.LampaMxMobileFix) return;
    window.LampaMxMobileFix = true;

    var STYLE_ID = 'lampa-mx-mobile-fix-style';
    var refreshFrame = 0;

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
            'body.lampa-mx-mobile-fix .scroll--horizontal,body.lampa-mx-mobile-fix .scroll--horizontal-scroll{touch-action:pan-x!important;-webkit-overflow-scrolling:touch;}'
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
    function patchVideos(root) {
        Array.prototype.forEach.call(root.querySelectorAll('video'), function (video) {
            if (video.dataset.lampaSmoothBound === '1') return;
            video.dataset.lampaSmoothBound = '1';
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            video.style.webkitBackfaceVisibility = 'hidden';
            video.style.backfaceVisibility = 'hidden';
        });
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
        window.addEventListener('resize', refresh, { passive: true });
        window.addEventListener('orientationchange', refresh, { passive: true });
        console.log('[Lampa MX Mobile Smooth] loaded');
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
