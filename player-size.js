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
        var enhancementStorageKey = 'video_enhancement';
        var qualityEnhancementValue = 'lampa_quality_enhance';
        var originalSelectShow = Lampa.Select.show;
        var qualityPanel = null;
        var playerActive = false;
        var scheduledTimers = [];

        var customModes = [
            {
                // Перехоплюємо штатний пункт Lampa «Заповнити».
                value: 'fill',
                title: 'Заповнити',
                subtitle: 'На весь екран із чорними полями приблизно по 2 мм з боків',
                horizontalFill: true,
                sideBars: true
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
                value: 'ultrawidify219',
                title: 'Ultrawidify 21:9',
                subtitle: 'Прибрати чорні смуги без розтягування',
                ultrawideCrop: true
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

        var barsStyle = document.createElement('style');
        barsStyle.id = 'lampa-player-side-bars-style';
        barsStyle.textContent = `
            body.lampa-player-side-bars::before,
            body.lampa-player-side-bars::after {
                content: '';
                position: fixed;
                top: 0;
                bottom: 0;
                width: 2mm;
                background: #000;
                z-index: 999999;
                pointer-events: none;
            }
            body.lampa-player-side-bars::before { left: 0; }
            body.lampa-player-side-bars::after { right: 0; }
        `;
        if (!document.getElementById(barsStyle.id)) document.head.appendChild(barsStyle);

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

        function getEnhancement() {
            var value = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get(enhancementStorageKey, 0) : 0;
            value = parseInt(value, 10);
            return isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
        }

        function applyEnhancement(video, value) {
            if (!video || !video.style) return;
            value = Math.max(0, Math.min(100, parseInt(value, 10) || 0));

            if (!value) {
                video.style.removeProperty('filter');
                return;
            }

            // Це легке покращення відображення, а не AI-апскейлінг Flux Fidelity.
            // Воно працює без моделей і сумісне з вбудованим web-плеєром Lampa.
            var contrast = (1 + value * 0.004).toFixed(3);
            var saturation = (1 + value * 0.003).toFixed(3);
            var brightness = (1 + value * 0.001).toFixed(3);
            video.style.setProperty('filter', 'contrast(' + contrast + ') saturate(' + saturation + ') brightness(' + brightness + ')', 'important');
        }

        function applySavedEnhancement() {
            applyEnhancement(getVideo(), getEnhancement());
        }

        function closeQualityPanel() {
            if (qualityPanel && qualityPanel.parentNode) qualityPanel.parentNode.removeChild(qualityPanel);
            qualityPanel = null;
        }

        function showQualityPanel() {
            closeQualityPanel();
            var current = getEnhancement();
            var panel = document.createElement('div');
            panel.className = 'lampa-quality-panel';
            panel.innerHTML = '<div class="lampa-quality-panel__title">Покращення якості відео</div>' +
                '<div class="lampa-quality-panel__descr">Контраст, насиченість і яскравість</div>' +
                '<input class="lampa-quality-panel__range" type="range" min="0" max="100" step="1" value="' + current + '" aria-label="Покращення якості відео">' +
                '<div class="lampa-quality-panel__value">' + current + '%</div>' +
                '<button class="lampa-quality-panel__close">Готово</button>';
            document.body.appendChild(panel);
            qualityPanel = panel;

            var range = panel.querySelector('.lampa-quality-panel__range');
            var valueLabel = panel.querySelector('.lampa-quality-panel__value');
            range.addEventListener('input', function () {
                var value = parseInt(range.value, 10) || 0;
                valueLabel.textContent = value + '%';
                if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set(enhancementStorageKey, value);
                applyEnhancement(getVideo(), value);
            });
            panel.querySelector('.lampa-quality-panel__close').addEventListener('click', closeQualityPanel);
            range.focus();
        }

        var qualityStyle = document.createElement('style');
        qualityStyle.id = 'lampa-quality-enhancement-style';
        qualityStyle.textContent = '.lampa-quality-panel{position:fixed;left:50%;bottom:8%;transform:translateX(-50%);z-index:1000000;width:min(78vw,520px);padding:18px 22px;border-radius:14px;background:rgba(20,20,20,.96);color:#fff;text-align:center;font-family:inherit;box-shadow:0 4px 24px rgba(0,0,0,.5)}' +
            '.lampa-quality-panel__title{font-size:20px;font-weight:600}.lampa-quality-panel__descr{margin:6px 0 14px;font-size:14px;opacity:.72}.lampa-quality-panel__range{width:100%;accent-color:#63e6be}.lampa-quality-panel__value{margin:8px 0;font-size:16px}.lampa-quality-panel__close{border:0;border-radius:8px;padding:8px 18px;background:#63e6be;color:#10231d;font-size:15px}';
        if (!document.getElementById(qualityStyle.id)) document.head.appendChild(qualityStyle);

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

        function setSideBars(enabled) {
            if (document.body) {
                document.body.classList.toggle('lampa-player-side-bars', !!enabled);
            }
        }

        function applyMode(mode) {
            var video = getVideo();
            if (!video || !mode) return;

            setSideBars(mode.sideBars);

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

            if (mode.ultrawideCrop) {
                clearAspectMode(video);

                // Інтеграція підходу Ultrawidify: відео масштабується
                // пропорційно й обрізається до широкого кадру 21:9.
                // На відміну від fullFrame, цей режим не розтягує обличчя.
                video.style.setProperty('position', 'fixed', 'important');
                video.style.setProperty('left', '50%', 'important');
                video.style.setProperty('top', '50%', 'important');
                video.style.setProperty('width', '100vw', 'important');
                video.style.setProperty('height', '100vh', 'important');
                video.style.setProperty('object-fit', 'cover', 'important');
                video.style.setProperty('object-position', 'center center', 'important');
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

        function isQualityMenu(options) {
            if (!options || !Array.isArray(options.items)) return false;
            var qualityCount = options.items.filter(function (item) {
                return item && /^(240|360|480|576|720|1080|1440|2160)$/.test(String(item.value));
            }).length;
            return qualityCount >= 2;
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
            var qualityMenu = isQualityMenu(options);
            if (!isVideoSizeMenu(options) && !qualityMenu) {
                return originalSelectShow.apply(this, arguments);
            }

            var patchedOptions = Object.assign({}, options);
            var originalOnSelect = options.onSelect;
            var savedSize = getSavedSize();
            var existingValues = options.items.map(function (item) {
                return item && item.value;
            });

            var extraItems = qualityMenu ? [{
                title: 'Покращення якості відео',
                subtitle: 'Повзунок для покращення зображення',
                value: qualityEnhancementValue,
                selected: false
            }] : customModes
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
                if (item && item.value === qualityEnhancementValue) {
                    if (Lampa.Select.close) Lampa.Select.close();
                    showQualityPanel();
                    return;
                }

                if (item && modes[item.value]) {
                    applyMode(modes[item.value]);
                    if (Lampa.Select.close) Lampa.Select.close();
                    return;
                }

                if (typeof originalOnSelect === 'function') {
                    var video = getVideo();
                    setSideBars(false);
                    if (video) clearAspectMode(video);
                    originalOnSelect(item);
                }
            };

            return originalSelectShow.call(this, patchedOptions);
        };

        function onPlayerStart() {
            playerActive = true;
            applySavedMode();
            applySavedEnhancement();
            var playerVideo = getVideo();

            function onLoadedData() {
                applySavedMode();
                applySavedEnhancement();
            }

            function onCanPlay() {
                applySavedMode();
                applySavedEnhancement();
            }

            function onDestroy() {
                playerActive = false;
                clearScheduledTimers();
                setSideBars(false);
                closeQualityPanel();
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
