/* Lampa combined mobile and player-size fix */
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
            // Не викликаємо webkitEnterFullscreen(): це примусово перемикає
            // навіть вибраний користувачем «Вбудований плеєр» на iOS-плеєр.
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

(function () {
    'use strict';

    if (window.LampaPlayerSizePlugin) return;
    window.LampaPlayerSizePlugin = true;

    function waitForLampa(callback) {
        if (window.Lampa && Lampa.Select && Lampa.Player && Lampa.PlayerVideo) {
            callback();
        } else {
            setTimeout(function () {
                waitForLampa(callback);
            }, 300);
        }
    }

    waitForLampa(function () {
        var storageKey = 'player_size';
        var originalSelectShow = Lampa.Select.show;
        var playerActive = false;
        var scheduledTimers = [];

        var customModes = [
            {
                // Перехоплюємо штатний пункт Lampa «Заповнити».
                value: 'fill',
                title: 'Заповнити',
                subtitle: 'На весь екран із чорними полями приблизно по 2 мм з боків',
                horizontalFill: true
            },
            {
                // Перехоплюємо штатний пункт Lampa «Розширити».
                // Новий пункт у меню для нього не створюється.
                value: 'cover',
                title: 'Розширити',
                subtitle: 'Заповнити екран з легким розтягуванням по горизонталі',
                horizontalFill: true
            },
            {
                value: 's170',
                title: 'Збільшити 170%',
                subtitle: 'Збільшити відео на 170%',
                sx: 1.70,
                sy: 1.70
            },
            {
                value: 's180',
                title: 'Збільшити 180%',
                subtitle: 'Збільшити відео на 180%',
                sx: 1.80,
                sy: 1.80
            },
            {
                value: 'a219',
                title: '21:9 без обрізання',
                subtitle: 'Як «Заповнити», з розтягуванням по горизонталі',
                horizontalFill: true
            },
            {
                value: 'cinema219',
                title: 'Формат 21:9',
                subtitle: 'Кінематографічний кадр 21:9',
                fullFrame: true
            },
            {
                value: 'v170',
                title: 'По вертикалі 170%',
                subtitle: 'Збільшити відео по вертикалі на 170%',
                sx: 1.01,
                sy: 1.70
            },
            {
                value: 'v180',
                title: 'По вертикалі 180%',
                subtitle: 'Збільшити відео по вертикалі на 180%',
                sx: 1.01,
                sy: 1.80
            }
        ];

        var modes = {};
        customModes.forEach(function (mode) {
            modes[mode.value] = mode;
        });

        function getSavedSize() {
            if (Lampa.Storage && Lampa.Storage.get) {
                return Lampa.Storage.get(storageKey, 'default');
            }
            return 'default';
        }

        function getVideo() {
            try {
                return Lampa.PlayerVideo.video();
            } catch (error) {
                return null;
            }
        }

        function clearAspectMode(video) {
            if (!video || !video.style) return;
            video.style.position = '';
            video.style.left = '';
            video.style.top = '';
            video.style.width = '';
            video.style.height = '';
            video.style.objectFit = '';
            video.style.transformOrigin = '';
            video.style.transform = '';
        }

        function clearScheduledTimers() {
            scheduledTimers.forEach(function (timer) {
                clearTimeout(timer);
            });
            scheduledTimers = [];
        }

        function applyMode(mode) {
            var video = getVideo();
            if (!video || !mode) return;

            if (mode.horizontalFill) {
                clearAspectMode(video);

                // Залишаємо приблизно по 2 мм чорного поля з кожного боку.
                // !important потрібен, бо штатний Lampa ще раз перераховує video.
                video.style.setProperty('position', 'fixed', 'important');
                video.style.setProperty('left', '50%', 'important');
                video.style.setProperty('top', '50%', 'important');
                video.style.setProperty('right', 'auto', 'important');
                video.style.setProperty('bottom', 'auto', 'important');
                video.style.setProperty('width', 'calc(100vw - 4mm)', 'important');
                video.style.setProperty('height', '100vh', 'important');
                video.style.setProperty('object-fit', 'fill', 'important');
                video.style.setProperty('transform-origin', 'center center', 'important');
                video.style.setProperty('transform', 'translate(-50%, -50%)', 'important');

                if (Lampa.Storage && Lampa.Storage.set) {
                    Lampa.Storage.set(storageKey, mode.value);
                }

                return;
            }

            if (mode.fullFrame) {
                clearAspectMode(video);

                // Відео заповнює весь екран без бічних чорних смуг.
                // Це відповідає широкому 21:9 режиму на телевізорах і телефонах.
                video.style.width = '100vw';
                video.style.height = '100vh';
                video.style.objectFit = 'fill';
                video.style.transformOrigin = 'center center';
                video.style.transform = 'none';

                if (Lampa.Storage && Lampa.Storage.set) {
                    Lampa.Storage.set(storageKey, mode.value);
                }

                return;
            }

            if (mode.aspectWidth && mode.aspectHeight) {
                var screenWidth = window.innerWidth;
                var screenHeight = window.innerHeight;
                var ratio = mode.aspectWidth / mode.aspectHeight;
                var gap = mode.sideGap || 0;
                var width = Math.min(screenWidth - gap * 2, screenHeight * ratio);
                var height = width / ratio;

                video.style.position = 'absolute';
                video.style.left = '50%';
                video.style.top = '50%';
                video.style.width = Math.round(width) + 'px';
                video.style.height = Math.round(height) + 'px';
                // Заповнюємо кадр 21:9. Для джерела 16:9
                // зайва частина зверху і знизу обрізається.
                video.style.objectFit = 'cover';
                video.style.transformOrigin = 'center center';
                video.style.transform = 'translate(-50%, -50%)';

                if (Lampa.Storage && Lampa.Storage.set) {
                    Lampa.Storage.set(storageKey, mode.value);
                }

                return;
            }

            clearAspectMode(video);

            video.style.width = '100vw';
            video.style.height = '100vh';
            video.style.objectFit = 'contain';
            video.style.transformOrigin = 'center center';
            video.style.transform = 'scaleX(' + mode.sx + ') scaleY(' + mode.sy + ')';

            if (Lampa.Storage && Lampa.Storage.set) {
                Lampa.Storage.set(storageKey, mode.value);
            }
        }

        function applySavedMode() {
            var mode = modes[getSavedSize()];
            if (!mode || !playerActive) return;

            [100, 500, 1200].forEach(function (delay) {
                var timer = setTimeout(function () {
                    scheduledTimers = scheduledTimers.filter(function (item) {
                        return item !== timer;
                    });
                    if (playerActive) applyMode(mode);
                }, delay);
                scheduledTimers.push(timer);
            });
        }

        function isVideoSizeMenu(options) {
            if (!options || !Array.isArray(options.items)) return false;

            var values = options.items.map(function (item) {
                return item && item.value;
            });

            return values.indexOf('default') !== -1 &&
                (values.indexOf('cover') !== -1 || values.indexOf('fill') !== -1);
        }

        Lampa.Select.show = function (options) {
            if (!isVideoSizeMenu(options)) {
                return originalSelectShow.apply(this, arguments);
            }

            var patchedOptions = Object.assign({}, options);
            var originalOnSelect = options.onSelect;
            var savedSize = getSavedSize();
            var existingValues = options.items.map(function (item) {
                return item && item.value;
            });

            var extraItems = customModes
                .filter(function (mode) {
                    return existingValues.indexOf(mode.value) === -1;
                })
                .map(function (mode) {
                    return {
                        title: mode.title,
                        subtitle: mode.subtitle,
                        value: mode.value,
                        selected: savedSize === mode.value
                    };
                });

            patchedOptions.items = options.items.concat(extraItems);
            patchedOptions.onSelect = function (item) {
                if (item && modes[item.value]) {
                    applyMode(modes[item.value]);
                    if (Lampa.Select.close) Lampa.Select.close();
                    return;
                }

                if (typeof originalOnSelect === 'function') {
                    var video = getVideo();
                    if (video) clearAspectMode(video);
                    originalOnSelect(item);
                }
            };

            return originalSelectShow.call(this, patchedOptions);
        };

        function onPlayerStart() {
            playerActive = true;
            applySavedMode();
            var playerVideo = getVideo();

            function onLoadedData() {
                applySavedMode();
            }

            function onCanPlay() {
                applySavedMode();
            }

            function onDestroy() {
                playerActive = false;
                clearScheduledTimers();
                clearAspectMode(playerVideo || getVideo());
                Lampa.PlayerVideo.listener.remove('loadeddata', onLoadedData);
                Lampa.PlayerVideo.listener.remove('canplay', onCanPlay);
                Lampa.Player.listener.remove('destroy', onDestroy);
            }

            Lampa.PlayerVideo.listener.follow('loadeddata', onLoadedData);
            Lampa.PlayerVideo.listener.follow('canplay', onCanPlay);
            Lampa.Player.listener.follow('destroy', onDestroy);
        }

        Lampa.Player.listener.follow('start', onPlayerStart);

        window.addEventListener('resize', function () {
            var mode = modes[getSavedSize()];
            if (mode && playerActive) {
                setTimeout(function () {
                    if (playerActive) applyMode(mode);
                }, 200);
            }
        });

        console.log('[Lampa Player Size] loaded');
    });
})();
