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

    function refresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            installViewportFix();
            installStyles();
            patchScrollContainers(document);
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
