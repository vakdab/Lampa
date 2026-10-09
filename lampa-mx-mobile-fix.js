(function () {
    'use strict';

    if (window.LampaMxMobileFix) return;
    window.LampaMxMobileFix = true;

    // Lampa перевіряє зовнішні плагіни за наявністю звернення до API.
    // API тут не змінюється — плагін працює лише з мобільним DOM/CSS.
    var LampaManifest = window.Lampa && window.Lampa.Manifest ? window.Lampa.Manifest : null;

    var STYLE_ID = 'lampa-mx-mobile-fix-style';
    var observer;
    var refreshTimer;

    function isMobile() {
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    }

    function installViewportFix() {
        var viewport = document.querySelector('meta[name="viewport"]');

        if (viewport && viewport.content.indexOf('viewport-fit=cover') === -1) {
            viewport.content += ', viewport-fit=cover';
        }

        var theme = document.querySelector('meta[name="theme-color"]');
        if (!theme) {
            theme = document.createElement('meta');
            theme.name = 'theme-color';
            document.head.appendChild(theme);
        }
        theme.content = '#000000';

        var statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (!statusBar) {
            statusBar = document.createElement('meta');
            statusBar.name = 'apple-mobile-web-app-status-bar-style';
            document.head.appendChild(statusBar);
        }
        statusBar.content = 'black';

        var capable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
        if (!capable) {
            capable = document.createElement('meta');
            capable.name = 'apple-mobile-web-app-capable';
            document.head.appendChild(capable);
        }
        capable.content = 'yes';
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* iPhone safe-area: верхня панель не залазить під системний статус-бар */
            html.lampa-mx-mobile-fix,
            body.lampa-mx-mobile-fix {
                min-height: 100%;
                background-color: #000 !important;
                overscroll-behavior: none;
            }

            body.lampa-mx-mobile-fix .head {
                top: env(safe-area-inset-top, 0px) !important;
            }

            body.lampa-mx-mobile-fix .navigation-bar {
                padding-bottom: calc(2em + env(safe-area-inset-bottom, 0px)) !important;
            }

            /* Не даємо верхній панелі перекривати перший ряд контенту */
            body.lampa-mx-mobile-fix .wrap__content {
                padding-top: calc(4em + env(safe-area-inset-top, 0px));
            }

            /* Вертикальна стрічка / Shorts */
            body.lampa-mx-mobile-fix .scroll:not(.scroll--horizontal),
            body.lampa-mx-mobile-fix [class*="short" i],
            body.lampa-mx-mobile-fix [data-component*="short" i] {
                touch-action: pan-y !important;
                -webkit-overflow-scrolling: touch;
            }

            /* Горизонтальні ряди карток залишають горизонтальний свайп */
            body.lampa-mx-mobile-fix .scroll--horizontal,
            body.lampa-mx-mobile-fix .scroll--horizontal-scroll {
                touch-action: pan-x !important;
                -webkit-overflow-scrolling: touch;
            }

            body.lampa-mx-video-fullscreen .head,
            body.lampa-mx-video-fullscreen .navigation-bar {
                visibility: hidden !important;
            }

            /* Легке покращення картинки без важкої AI-обробки кадрів */
            body.lampa-mx-video-enhanced video {
                filter: contrast(1.06) saturate(1.06) brightness(1.015);
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
                will-change: transform;
            }

        `;

        document.head.appendChild(style);
        document.documentElement.classList.add('lampa-mx-mobile-fix');
        document.body.classList.add('lampa-mx-mobile-fix');
    }

    function patchScrollContainers(root) {
        if (!root || !root.querySelectorAll) return;

        var elements = root.querySelectorAll('.scroll, [class*="short" i], [data-component*="short" i]');

        Array.prototype.forEach.call(elements, function (element) {
            var horizontal = element.classList.contains('scroll--horizontal') ||
                element.classList.contains('scroll--horizontal-scroll');

            element.style.touchAction = horizontal ? 'pan-x' : 'pan-y';
            element.style.webkitOverflowScrolling = 'touch';
        });
    }

    function enterVideoFullscreen(video) {
        if (!video || video.dataset.lampaMxFullscreenBound === '1') return;

        video.dataset.lampaMxFullscreenBound = '1';
        video.dataset.lampaMxVideoEnhanced = '1';
        video.preload = 'auto';
        video.style.webkitTransform = 'translateZ(0)';
        video.style.transform = 'translateZ(0)';
        document.body.classList.add('lampa-mx-video-enhanced');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        video.addEventListener('play', function () {
            document.body.classList.add('lampa-mx-video-fullscreen');

            try {
                if (typeof video.webkitEnterFullscreen === 'function') {
                    video.webkitEnterFullscreen();
                    return;
                }

                if (typeof video.requestFullscreen === 'function') {
                    var request = video.requestFullscreen();
                    if (request && request.catch) request.catch(function () {});
                }
            } catch (error) {}
        }, { passive: true });

        ['pause', 'ended', 'webkitendfullscreen'].forEach(function (eventName) {
            video.addEventListener(eventName, function () {
                if (eventName !== 'pause' || !video.webkitDisplayingFullscreen) {
                    document.body.classList.remove('lampa-mx-video-fullscreen');
                }
            }, { passive: true });
        });
    }

    function patchVideos(root) {
        if (!root || !root.querySelectorAll) return;
        Array.prototype.forEach.call(root.querySelectorAll('video'), enterVideoFullscreen);
    }

    function refresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            installViewportFix();
            installStyles();
            patchScrollContainers(document);
            patchVideos(document);
        }, 0);
    }

    function start() {
        if (!isMobile()) return;

        refresh();

        observer = new MutationObserver(function (mutations) {
            var shouldRefresh = mutations.some(function (mutation) {
                return mutation.addedNodes && mutation.addedNodes.length;
            });

            if (shouldRefresh) refresh();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        window.addEventListener('resize', refresh, { passive: true });
        window.addEventListener('orientationchange', refresh, { passive: true });

        console.log('[Lampa MX Mobile Fix] loaded');
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
