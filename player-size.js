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

        var customModes = [
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
                title: 'Розтягнути 21:9',
                subtitle: 'Повний кадр без обрізання',
                aspectWidth: 21,
                aspectHeight: 9,
                sideGap: 8
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
            video.style.position = '';
            video.style.left = '';
            video.style.top = '';
            video.style.width = '';
            video.style.height = '';
            video.style.objectFit = '';
            video.style.transformOrigin = '';
            video.style.transform = '';
        }

        function applyMode(mode) {
            var video = getVideo();
            if (!video || !mode) return;

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
                // Розтягуємо весь кадр до 21:9 без обрізання.
                // Це навмисно може трохи змінювати пропорції відео.
                video.style.objectFit = 'fill';
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
            if (!mode) return;

            [100, 500, 1200].forEach(function (delay) {
                setTimeout(function () {
                    applyMode(mode);
                }, delay);
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
            applySavedMode();

            function onLoadedData() {
                applySavedMode();
            }

            function onCanPlay() {
                applySavedMode();
            }

            function onDestroy() {
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
            if (mode) {
                setTimeout(function () {
                    applyMode(mode);
                }, 200);
            }
        });

        console.log('[Lampa Player Size] loaded');
    });
})();
