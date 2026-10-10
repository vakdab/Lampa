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
            'body.lampa-player-cinema-fill{--player-gap:8mm;}',
            'body.lampa-player-cinema-fill .player-info,body.lampa-player-cinema-fill .player-panel{left:var(--player-gap)!important;right:var(--player-gap)!important;width:auto!important;}',
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
            requestAnimationFrame(function () { requestAnimationFrame(fitHudToVideo); });
        }
        function clearMode(video) {
            if (!video || !video.style) return;
            clearHudFit(playerRoot(video));
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
            if (video) video.setAttribute('playsinline', 'true');
            function onReady() {
                applySavedMode();
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
        window.addEventListener('resize', function () {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(applySavedMode);
            scheduleHudFit();
        }, { passive: true });
        console.log('[Lampa Smooth Player] loaded');
    });
})();
/* Lampa AniSkip integration — automatic anime opening/ending skip */
(function () {
    'use strict';
    if (window.LampaAniSkip) return;
    window.LampaAniSkip = true;

    var API = 'https://api.aniskip.com/v2';
    var ANILIST = 'https://graphql.anilist.co';
    var STORAGE_KEY = 'lampa_aniskip_settings';
    var state = {
        video: null, segments: [], loadedKey: '', lastSkip: -1,
        playItem: null,
        settings: { enabled: true, malId: '', episode: '', title: '' },
        badge: null, panel: null
    };

    function storageGet() {
        try {
            var saved = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get(STORAGE_KEY, {}) : {};
            return Object.assign({}, state.settings, saved || {});
        } catch (error) { return Object.assign({}, state.settings); }
    }
    function storageSet() {
        try {
            if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set(STORAGE_KEY, state.settings);
        } catch (error) {}
    }
    function getVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') {
                var selected = Lampa.PlayerVideo.video();
                if (selected && selected.tagName === 'VIDEO') return selected;
            }
        } catch (error) {}
        return Array.prototype.slice.call(document.querySelectorAll('video')).filter(function (video) {
            var rect = video.getBoundingClientRect();
            return rect.width > 160 && rect.height > 90 && !video.paused;
        }).sort(function (a, b) {
            return b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height;
        })[0] || null;
    }
    function cleanTitle(value) {
        return String(value || '').replace(/\s+/g, ' ').replace(/\b(\d{3,4}p|WEB[- ]?DL|字幕|субтитри)\b/ig, '').trim();
    }
    function playTitle() {
        var item = state.playItem;
        return cleanTitle(item && (item.animeTitle || item.seriesTitle || item.original_title || item.title));
    }
    function lampaMovieTitle() {
        var values = [];
        try {
            if (Lampa.Activity && typeof Lampa.Activity.active === 'function') values.push(Lampa.Activity.active());
            if (Lampa.PlayerVideo && typeof Lampa.PlayerVideo.info === 'function') values.push(Lampa.PlayerVideo.info());
        } catch (error) {}
        for (var i = 0; i < values.length; i += 1) {
            var value = values[i] || {};
            var item = value.movie || value.card || value.object && (value.object.movie || value.object) || value.data && (value.data.movie || value.data) || value;
            var title = cleanTitle(item && (item.original_title || item.title || item.name));
            if (title && title.length >= 2 && title.length <= 120) return title;
        }
        return '';
    }
    function findTitle() {
        var fromPlay = playTitle();
        if (fromPlay && fromPlay.length >= 2 && !/^(?:серія|серия|episode|епізод|эпизод|S\d+\s*E\d+)/i.test(fromPlay)) return fromPlay.replace(/\s*(?:S\d+\s*E\d+|\d+\s*(?:сезон|season|серія|серия|episode)\b).*$/i, '').trim();
        var fromMovie = lampaMovieTitle();
        if (fromMovie) return fromMovie;
        var selectors = [
            '.player-info .title', '.player__title', '.player-video__title',
            '[class*="player"][class*="title"]', '[class*="movie"][class*="title"]', 'h1'
        ];
        for (var i = 0; i < selectors.length; i += 1) {
            var node = document.querySelector(selectors[i]);
            var text = cleanTitle(node && node.textContent);
            if (text && text.length >= 2 && text.length <= 120) return text.replace(/^\d+\s*:\s*/, '').trim();
        }
        var video = getVideo();
        var dataTitle = video && (video.getAttribute('data-title') || video.getAttribute('aria-label'));
        if (dataTitle) return cleanTitle(dataTitle);
        var info = document.querySelector('.player-info, .player__info, [class*="player-info"]');
        var infoText = cleanTitle(info && info.textContent).split(/\d{3,4}p|\d{3,4}x\d{3,4}/i)[0].trim();
        if (infoText.length >= 2 && infoText.length <= 120) return infoText.replace(/^\d+\s*:\s*/, '').trim();
        return '';
    }
    function findEpisode() {
        var candidates = [];
        var item = state.playItem || {};
        function numericEpisode(value) {
            if (!value || typeof value !== 'object') return 0;
            var fields = ['episode', 'episodeNumber', 'episode_num', 'episode_id', 'number'];
            for (var n = 0; n < fields.length; n += 1) {
                if (value[fields[n]] != null && /^\d+(?:\.\d+)?$/.test(String(value[fields[n]]))) return Number(value[fields[n]]);
            }
            return numericEpisode(value.media) || numericEpisode(value.source) || numericEpisode(value.data);
        }
        var nestedEpisode = numericEpisode(item);
        if (nestedEpisode) candidates.push(nestedEpisode);
        ['episode', 'episodeNumber', 'episode_num', 'episode_id'].forEach(function (name) {
            if (item[name] != null && /^\d+(?:\.\d+)?$/.test(String(item[name]))) candidates.push(item[name]);
        });
        if (item.season != null && item.episode != null) candidates.push('S' + item.season + 'E' + item.episode);
        if (playTitle()) candidates.push(playTitle());
        try {
            if (Lampa.PlayerVideo) {
                ['episode', 'episodeNumber', 'number'].forEach(function (name) {
                    if (typeof Lampa.PlayerVideo[name] === 'function') candidates.push(Lampa.PlayerVideo[name]());
                    else if (Lampa.PlayerVideo[name] != null) candidates.push(Lampa.PlayerVideo[name]);
                });
            }
        } catch (error) {}
        var text = document.body ? document.body.innerText.slice(0, 12000) : '';
        candidates.push(text);
        candidates.push(location.href);
        for (var i = 0; i < candidates.length; i += 1) {
            var value = String(candidates[i] || '');
            var seasonEpisode = value.match(/S\d+\s*[-x]?\s*E\s*(\d{1,4})\b/i);
            var wordEpisode = value.match(/(?:episode|ep\.?|серія|серия|епізод|эпизод)\s*[-#:]?\s*(\d{1,4})\b/i);
            var match = seasonEpisode || wordEpisode;
            if (match) return Number(match[1]);
            if (i < 4 && /^\d{1,4}$/.test(value.trim())) return Number(value.trim());
        }
        var detectedTitle = findTitle();
        // Lampa часто не передає номер епізоду. OP/ED зазвичай однакові,
        // тому серія 1 є безпечним fallback для автоматичного пошуку інтервалу.
        return detectedTitle ? 1 : 0;
    }
    function getTitleAndEpisode() {
        return { title: state.settings.title || findTitle(), episode: Number(state.settings.episode) || findEpisode() };
    }
    function findMalIdFromLampa() {
        var candidates = [];
        try {
            if (Lampa.PlayerVideo) {
                ['object', 'info', 'movie', 'data'].forEach(function (name) {
                    var value = typeof Lampa.PlayerVideo[name] === 'function' ? Lampa.PlayerVideo[name]() : Lampa.PlayerVideo[name];
                    if (value) candidates.push(value);
                });
            }
            if (Lampa.Activity && typeof Lampa.Activity.active === 'function') candidates.push(Lampa.Activity.active());
        } catch (error) {}
        for (var i = 0; i < candidates.length; i += 1) {
            var value = candidates[i] || {};
            var item = value.movie || value.card || value.object && (value.object.movie || value.object) || value.data && (value.data.movie || value.data) || value;
            if (item && (item.mal_id || item.malId || item.id_mal)) return Number(item.mal_id || item.malId || item.id_mal);
        }
        return Number(state.settings.malId) || 0;
    }
    function patchPlayerPlay() {
        if (!window.Lampa || !Lampa.Player || typeof Lampa.Player.play !== 'function' || Lampa.Player.play.__lampaAniSkipPatched) return;
        var originalPlay = Lampa.Player.play;
        function wrappedPlay(item) {
            state.playItem = item || null;
            state.loadedKey = '';
            setTimeout(function () { if (state.video) loadSegments(state.video); }, 0);
            return originalPlay.apply(this, arguments);
        }
        wrappedPlay.__lampaAniSkipPatched = true;
        Lampa.Player.play = wrappedPlay;
    }
    function anilistMalId(title) {
        return fetch(ANILIST, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'query($search:String){Page{media(search:$search,type:ANIME,perPage:1){idMal}}}', variables: { search: title } })
        }).then(function (response) { if (!response.ok) throw new Error('anilist'); return response.json(); }).then(function (json) {
            var media = json && json.data && json.data.Page && json.data.Page.media && json.data.Page.media[0];
            return media && Number(media.idMal) || 0;
        }).catch(function () {
            return fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(title) + '&limit=1').then(function (response) { return response.json(); }).then(function (json) {
                var item = json && json.data && json.data[0];
                return item && Number(item.mal_id) || 0;
            }).catch(function () { return 0; });
        });
    }
    function loadSegments(video) {
        if (!video || !isFinite(video.duration) || video.duration < 60) return;
        var meta = getTitleAndEpisode();
        var malId = findMalIdFromLampa();
        if (!meta.episode || (!malId && !meta.title)) {
            setStatus('AniSkip: вкажи MAL ID та серію');
            return;
        }
        var key = [malId || meta.title, meta.episode, Math.round(video.duration)].join('|');
        if (key === state.loadedKey) return;
        state.loadedKey = key;
        setStatus('AniSkip: пошук…');
        var idPromise = malId ? Promise.resolve(malId) : anilistMalId(meta.title);
        idPromise.then(function (resolvedId) {
            if (!resolvedId) throw new Error('no id');
            state.settings.malId = String(resolvedId);
            storageSet();
            var query = ['types=op', 'types=ed', 'types=mixed-op', 'types=mixed-ed', 'types=recap', 'episodeLength=' + encodeURIComponent(video.duration.toFixed(3))].join('&');
            return fetch(API + '/skip-times/' + resolvedId + '/' + meta.episode + '?' + query).then(function (response) { return response.json(); });
        }).then(function (json) {
            state.segments = (json && json.results || []).filter(function (item) {
                return item && item.interval && ['op', 'ed', 'mixed-op', 'mixed-ed', 'recap'].indexOf(item.skipType) !== -1;
            });
            setStatus(state.segments.length ? 'AniSkip: готово (' + state.segments.length + ')' : 'AniSkip: сегментів немає');
        }).catch(function () {
            state.segments = [];
            setStatus('AniSkip: даних немає');
        });
    }
    function onTimeUpdate() {
        var video = state.video;
        if (!video || !state.settings.enabled || !state.segments.length) return;
        var now = video.currentTime;
        state.segments.forEach(function (segment) {
            var start = Number(segment.interval.startTime);
            var end = Number(segment.interval.endTime);
            if (now >= start && now < end - 0.15 && state.lastSkip !== start) {
                state.lastSkip = start;
                video.currentTime = end + Math.max(0, video.duration - Number(segment.episodeLength || video.duration));
            }
        });
    }
    function attach(video) {
        if (!video || state.video === video) return;
        state.video = video;
        if (state.badge) state.badge.style.display = 'block';
        state.loadedKey = '';
        state.segments = [];
        state.lastSkip = -1;
        video.addEventListener('loadedmetadata', function () { loadSegments(video); }, { passive: true });
        video.addEventListener('durationchange', function () { loadSegments(video); }, { passive: true });
        video.addEventListener('timeupdate', onTimeUpdate, { passive: true });
        if (video.readyState >= 1) loadSegments(video);
    }
    function setStatus(text) {
        if (state.badge) state.badge.textContent = text;
    }
    function closePanel() {
        if (state.panel && state.panel.parentNode) state.panel.parentNode.removeChild(state.panel);
        state.panel = null;
    }
    function openPanel() {
        closePanel();
        var panel = document.createElement('div');
        panel.className = 'lampa-aniskip-panel';
        panel.innerHTML = '<b>AniSkip</b><label>MAL ID<input name="malId" inputmode="numeric" value="' + (state.settings.malId || '') + '"></label><label>Серія<input name="episode" inputmode="numeric" value="' + (state.settings.episode || '') + '"></label><label><input name="enabled" type="checkbox" ' + (state.settings.enabled ? 'checked' : '') + '> Автоматично пропускати</label><button name="save">Зберегти</button>';
        document.body.appendChild(panel);
        panel.querySelector('[name="save"]').addEventListener('click', function () {
            state.settings.malId = panel.querySelector('[name="malId"]').value.trim();
            state.settings.episode = panel.querySelector('[name="episode"]').value.trim();
            state.settings.enabled = panel.querySelector('[name="enabled"]').checked;
            state.loadedKey = ''; state.segments = []; storageSet(); closePanel();
            if (state.video) loadSegments(state.video);
        });
        state.panel = panel;
    }
    function installUi() {
        if (document.getElementById('lampa-aniskip-style')) return;
        var style = document.createElement('style'); style.id = 'lampa-aniskip-style';
        style.textContent = '.lampa-aniskip-badge{position:fixed;right:12px;top:12px;z-index:2147483640;padding:7px 10px;border:1px solid rgba(255,255,255,.25);border-radius:10px;background:rgba(15,15,18,.82);color:#fff;font:12px -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.lampa-aniskip-panel{position:fixed;right:12px;top:52px;z-index:2147483641;width:230px;padding:14px;border-radius:12px;background:rgba(20,20,24,.98);color:#fff;font:13px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 30px #0008}.lampa-aniskip-panel label{display:block;margin:9px 0}.lampa-aniskip-panel input:not([type="checkbox"]){box-sizing:border-box;width:100%;margin-top:4px;padding:6px;border:1px solid #666;border-radius:6px;background:#222;color:#fff}.lampa-aniskip-panel button{width:100%;padding:7px;border:0;border-radius:6px;background:#8ee6c0;color:#10251d}';
        document.head.appendChild(style);
        state.badge = document.createElement('button'); state.badge.className = 'lampa-aniskip-badge'; state.badge.type = 'button'; state.badge.textContent = 'AniSkip'; state.badge.style.display = 'none';
        state.badge.addEventListener('click', openPanel); document.body.appendChild(state.badge);
    }
    function scan() {
        var video = getVideo();
        if (video) attach(video);
    }
    function start() {
        state.settings = storageGet();
        state.settings.enabled = true;
        state.settings.malId = '';
        state.settings.episode = '';
        state.settings.title = '';
        patchPlayerPlay();
        scan();
        if (window.Lampa && Lampa.Player && Lampa.Player.listener) Lampa.Player.listener.follow('start', function (event) {
            if (event && typeof event === 'object' && (event.title || event.episode || event.movie)) state.playItem = event;
            scan();
            setTimeout(scan, 200);
        });
        if (window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
            Lampa.PlayerVideo.listener.follow('loadeddata', scan);
            Lampa.PlayerVideo.listener.follow('canplay', scan);
        }
        if (window.MutationObserver) {
            var observer = new MutationObserver(scan);
            observer.observe(document.body, { childList: true, subtree: true });
        }
        setInterval(scan, 2000);
        console.log('[Lampa AniSkip] loaded');
    }
    function wait() {
        if (window.Lampa && Lampa.Player && Lampa.PlayerVideo) start();
        else setTimeout(wait, 400);
    }
    if (document.body) wait(); else document.addEventListener('DOMContentLoaded', wait, { once: true });
})();
