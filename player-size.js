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
        function clearMode(video) {
            if (!video || !video.style) return;
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
            function onReady() { applySavedMode(); }
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
        }, { passive: true });
        console.log('[Lampa Smooth Player] loaded');
    });
})();
