/* Lampa AniSkip — manual opening skip button powered by AniSkip */
(function () {
    'use strict';
    if (window.LampaAniSkipPlugin) return;
    window.LampaAniSkipPlugin = true;

    var styleId = 'lampa-aniskip-style';
    var requestToken = 0;
    var currentVideo = null;
    var currentButton = null;
    var currentSegments = [];
    var currentSegment = null;
    var startEvent = null;
    var retryTimer = 0;
    var pollCount = 0;
    var malIdCache = new Map();
    var segmentCache = new Map();
    var boundTimeUpdate = null;
    var boundLoadedMetadata = null;

    function installStyles() {
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = [
            '.lampa-aniskip-button{position:fixed!important;z-index:2147483000!important;left:18px!important;bottom:clamp(68px,10vh,96px)!important;display:none;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 16px;border:1px solid rgba(255,255,255,.35);border-radius:12px;background:rgba(18,20,28,.92);color:#fff;font:600 14px/1.2 Arial,sans-serif;letter-spacing:.01em;box-shadow:0 5px 24px rgba(0,0,0,.35);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
            '.lampa-aniskip-button.is-visible{display:inline-flex}',
            '.lampa-aniskip-button:active{transform:scale(.97)}',
            '.lampa-aniskip-button svg{width:16px;height:16px;flex:0 0 16px;fill:currentColor}',
            '@media(max-width:600px){.lampa-aniskip-button{left:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 82px)!important;min-height:48px;padding:0 15px;font-size:14px}}'
        ].join('');
        document.head.appendChild(style);
    }
    function asObjects(event) {
        var activity = null;
        var playlistItem = null;
        try {
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function') activity = Lampa.Activity.active();
        } catch (error) {}
        try {
            if (window.Lampa && Lampa.Player && typeof Lampa.Player.playlist === 'function') {
                var playlistState = Lampa.Player.playlist();
                if (Array.isArray(playlistState) && playlistState.length === 1) playlistItem = playlistState[0];
                else if (playlistState && typeof playlistState === 'object') {
                    var list = playlistState.playlist || playlistState.list || playlistState.items;
                    var index = Number(playlistState.index !== undefined ? playlistState.index : playlistState.current);
                    if (Array.isArray(list) && Number.isInteger(index) && list[index]) playlistItem = list[index];
                    else if (Array.isArray(list)) {
                        var activeItem = list.find(function (item) { return item && (item.selected || item.active || item.current); });
                        if (activeItem) playlistItem = activeItem;
                    }
                }
            }
        } catch (error) {}
        var initial = [
            activity && activity.movie,
            activity && activity.data && activity.data.movie,
            activity && activity.params && activity.params.movie,
            event && event.movie,
            event && event.data && event.data.movie,
            event && event.object && event.object.movie,
            playlistItem,
            playlistItem && playlistItem.movie,
            event && event.episode,
            activity && activity.episode,
            activity && activity.data,
            event && event.data,
            event && event.object,
            event,
            activity
        ].filter(function (value) { return value && (typeof value === 'object' || typeof value === 'string' || typeof value === 'number'); });
        var values = [];
        var queue = initial.map(function (value) { return { value: value, depth: 0 }; });
        var seen = [];
        while (queue.length && values.length < 100) {
            var entry = queue.shift();
            var value = entry.value;
            if (!value || typeof value !== 'object' || seen.indexOf(value) !== -1) continue;
            seen.push(value);
            values.push(value);
            if (entry.depth >= 4) continue;
            Object.keys(value).forEach(function (key) {
                var child = value[key];
                if (child && typeof child === 'object') {
                    if (Array.isArray(child)) {
                        child.slice(0, 10).forEach(function (item) {
                            if (item && typeof item === 'object') queue.push({ value: item, depth: entry.depth + 1 });
                        });
                    } else queue.push({ value: child, depth: entry.depth + 1 });
                }
            });
        }
        return initial.filter(function (value) { return typeof value !== 'object'; }).concat(values);
    }
    function directMalId(objects) {
        var keys = ['mal_id', 'malId', 'malID', 'myanimelist_id', 'myAnimeListId'];
        for (var i = 0; i < objects.length; i++) {
            var item = objects[i];
            if (!item || typeof item !== 'object') continue;
            var id = 0;
            keys.some(function (key) {
                var value = Number(item[key] || (item.externalIds && item.externalIds[key]) || (item.external_ids && item.external_ids[key]));
                if (Number.isInteger(value) && value > 0) { id = value; return true; }
                return false;
            });
            if (id) return id;
        }
        return 0;
    }
    function titleFrom(objects) {
        var keys = ['title_orig', 'original_title', 'title_english', 'title_en', 'originalName', 'title', 'name'];
        for (var j = 0; j < keys.length; j++) {
            for (var i = 0; i < objects.length; i++) {
                var item = objects[i];
                if (!item || typeof item !== 'object') continue;
                var value = item[keys[j]];
                if (typeof value === 'string' && value.trim().length > 2) return value.trim();
            }
        }
        for (var k = 0; k < objects.length; k++) {
            if (typeof objects[k] === 'string' && objects[k].trim().length > 2) return objects[k].trim();
        }
        return '';
    }
    function normalizeTitle(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9а-яёіїєґ]+/gi, ' ').trim();
    }
    function resolveMalId(objects) {
        var direct = directMalId(objects);
        if (direct) return Promise.resolve(direct);
        var title = titleFrom(objects);
        if (!title) return Promise.resolve(0);
        var normalizedTitle = normalizeTitle(title);
        if (/\b(frieren|sousou no frieren)\b|фрирен|фрирэн/i.test(normalizedTitle)) {
            return Promise.resolve(/(?:season\s*2|2nd\s*season|сезон\s*2|2\s*сезон)/i.test(normalizedTitle) ? 59978 : 52991);
        }
        var key = normalizeTitle(title);
        if (malIdCache.has(key)) return malIdCache.get(key);
        var promise = (async function () {
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 5000);
            try {
                var response = await fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(title) + '&limit=5', {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' }
                });
                if (!response.ok) return 0;
                var payload = await response.json();
                var results = Array.isArray(payload && payload.data) ? payload.data : [];
                var exact = results.find(function (anime) {
                    return [anime.title, anime.title_english, anime.title_japanese].some(function (candidate) {
                        return normalizeTitle(candidate) === key;
                    });
                });
                return Number((exact || results[0] || {}).mal_id) || 0;
            } catch (error) {
                return 0;
            } finally {
                clearTimeout(timer);
            }
        })();
        malIdCache.set(key, promise);
        return promise;
    }
    function episodeFromString(value) {
        var text = String(value || '');
        var patterns = [
            /\bS\s*\d{1,2}\s*[:._ -]?\s*E\s*0*(\d{1,3})\b/i,
            /\b(?:episode|ep\.?|сер(?:ія|ии|ия)|еп(?:ізод|изод|\.)?)\s*#?\s*0*(\d{1,3})\b/i,
            /\b0*(\d{1,3})\s*(?:серія|серии|эпизод|episode)\b/i
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = text.match(patterns[i]);
            if (match) return Number(match[1]) || 0;
        }
        return 0;
    }
    function episodeFromObjects(objects) {
        var preferredKeys = ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'current_episode', 'currentEpisode'];
        var fallbackKeys = ['episode', 'ep'];
        function readKeys(keys) {
            for (var j = 0; j < keys.length; j++) {
                for (var i = 0; i < objects.length; i++) {
                    var item = objects[i];
                    if (!item || typeof item !== 'object') continue;
                var value = item[keys[j]];
                if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
                if (typeof value === 'string') {
                    var parsed = Number(value);
                    if (Number.isInteger(parsed) && parsed > 0) return parsed;
                    parsed = episodeFromString(value);
                    if (parsed) return parsed;
                }
                if (value && typeof value === 'object') {
                    var nested = Number(value.number || value.episode_number || value.episodeNumber || value.num);
                    if (Number.isInteger(nested) && nested > 0) return nested;
                }
            }
            }
            return 0;
        }
        var explicitEpisode = readKeys(preferredKeys);
        if (explicitEpisode) return explicitEpisode;
        var genericEpisode = readKeys(fallbackKeys);
        if (genericEpisode) return genericEpisode;
        for (var itemIndex = 0; itemIndex < objects.length; itemIndex++) {
            var item = objects[itemIndex];
            if (typeof item === 'number' && Number.isInteger(item) && item > 0) return item;
            if (typeof item === 'string') {
                var parsedText = episodeFromString(item);
                if (parsedText) return parsedText;
            }
            if (!item || typeof item !== 'object') continue;
            var labelKeys = ['episode_title', 'episodeName', 'episode_name', 'release_name', 'title_episode', 'name_episode', 'title', 'name'];
            for (var k = 0; k < labelKeys.length; k++) {
                var found = episodeFromString(item[labelKeys[k]]);
                if (found) return found;
            }
        }
        var label = document.querySelector('.player-video__title,.player__title,.player-video__info,.player__info,.player-video__subtitle,.player__subtitle');
        var fromLabel = label ? episodeFromString(label.textContent) : 0;
        if (fromLabel) return fromLabel;
        var video = getVideo();
        return video ? episodeFromString(video.currentSrc || video.src || '') : 0;
    }
    function getVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') {
                var video = Lampa.PlayerVideo.video();
                if (video && video.tagName === 'VIDEO') return video;
            }
        } catch (error) {}
        var candidates = Array.prototype.slice.call(document.querySelectorAll('video'));
        candidates.sort(function (a, b) {
            var aScore = (a.paused ? 0 : 1000000) + a.getBoundingClientRect().width * a.getBoundingClientRect().height;
            var bScore = (b.paused ? 0 : 1000000) + b.getBoundingClientRect().width * b.getBoundingClientRect().height;
            return bScore - aScore;
        });
        return candidates[0] || null;
    }
    function createButton(video) {
        var root = document.body;
        if (!root) return null;
        if (currentButton && currentButton.parentNode === root) return currentButton;
        if (currentButton && currentButton.parentNode) currentButton.parentNode.removeChild(currentButton);
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lampa-aniskip-button';
        button.setAttribute('aria-hidden', 'true');
        button.setAttribute('aria-label', 'Пропустити опенінг');
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16l13-8L5 4z"></path></svg><span>Пропустити опенінг</span>';
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (!currentVideo || !currentSegment) return;
            var target = Number(currentSegment.end);
            if (!Number.isFinite(target)) return;
            try {
                currentVideo.currentTime = target;
                currentSegment = null;
                syncButton();
                if (!currentVideo.paused && currentVideo.play) currentVideo.play().catch(function () {});
                if (window.Lampa && Lampa.Notice && typeof Lampa.Notice.show === 'function') Lampa.Notice.show('Опенінг пропущено');
            } catch (error) {}
        });
        root.appendChild(button);
        currentButton = button;
        return button;
    }
    function syncButton() {
        if (!currentButton || !currentVideo) return;
        var now = Number(currentVideo.currentTime);
        currentSegment = currentSegments.find(function (segment) { return now >= segment.start && now < segment.end; }) || null;
        var visible = !!currentSegment;
        currentButton.classList.toggle('is-visible', visible);
        currentButton.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    function fetchSegments(malId, episode) {
        var cacheKey = malId + ':' + episode;
        if (segmentCache.has(cacheKey)) return segmentCache.get(cacheKey);
        var promise = (async function () {
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 6000);
            try {
                var url = 'https://api.aniskip.com/v2/skip-times/' + malId + '/' + episode + '?types=op&types=ed&types=recap&episodeLength=0';
                var response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
                if (!response.ok) {
                    console.warn('[Lampa AniSkip] API error:', response.status);
                    return [];
                }
                var payload = await response.json();
                if (!payload || payload.found !== true || !Array.isArray(payload.results)) {
                    console.info('[Lampa AniSkip] No segments for this MAL ID / episode:', malId, episode);
                    return [];
                }
                var segments = payload.results.map(function (item) {
                    var interval = item.interval || item;
                    return {
                        start: Number(interval.startTime !== undefined ? interval.startTime : interval.start_time),
                        end: Number(interval.endTime !== undefined ? interval.endTime : interval.end_time),
                        type: String(item.skipType || item.skip_type || '').toLowerCase()
                    };
                }).filter(function (item) {
                    return ['op', 'opening'].indexOf(item.type) !== -1 && Number.isFinite(item.start) && Number.isFinite(item.end) && item.start >= 0 && item.end > item.start;
                });
                console.info('[Lampa AniSkip] Segments:', malId, episode, segments.length);
                return segments;
            } catch (error) {
                console.warn('[Lampa AniSkip] Request failed:', error && error.name ? error.name : error);
                return [];
            } finally {
                clearTimeout(timer);
            }
        })();
        segmentCache.set(cacheKey, promise);
        return promise;
    }
    function clearCurrent() {
        requestToken++;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = 0;
        pollCount = 0;
        if (currentVideo && boundTimeUpdate) currentVideo.removeEventListener('timeupdate', boundTimeUpdate);
        if (currentVideo && boundLoadedMetadata) currentVideo.removeEventListener('loadedmetadata', boundLoadedMetadata);
        currentVideo = null;
        boundTimeUpdate = null;
        boundLoadedMetadata = null;
        currentSegments = [];
        currentSegment = null;
        if (currentButton && currentButton.parentNode) currentButton.parentNode.removeChild(currentButton);
        currentButton = null;
    }
    function loadForCurrent(token) {
        if (token !== requestToken) return;
        var video = getVideo();
        var objects = asObjects(startEvent);
        var episode = episodeFromObjects(objects);
        var title = titleFrom(objects);
        var malId = directMalId(objects);
        if (!video || !episode || (!title && !malId)) {
            pollCount++;
            if (pollCount === 1) console.info('[Lampa AniSkip] Waiting for video metadata:', { video: !!video, episode: episode, title: !!title, malId: malId });
            if (pollCount < 60) retryTimer = setTimeout(function () { loadForCurrent(token); }, 500);
            return;
        }
        console.info('[Lampa AniSkip] Looking up:', { episode: episode, malId: malId || 'title lookup' });
        currentVideo = video;
        createButton(video);
        Promise.resolve(resolveMalId(objects)).then(function (malId) {
            if (token !== requestToken || currentVideo !== video || !malId) return;
            console.info('[Lampa AniSkip] Resolved MAL ID:', malId, 'episode:', episode);
            return fetchSegments(malId, episode).then(function (segments) {
                if (token !== requestToken || currentVideo !== video) return;
                currentSegments = segments;
                boundTimeUpdate = syncButton;
                boundLoadedMetadata = syncButton;
                video.addEventListener('timeupdate', boundTimeUpdate, { passive: true });
                video.addEventListener('loadedmetadata', boundLoadedMetadata, { passive: true });
                syncButton();
            });
        }).catch(function () {});
    }
    function onPlayerStart(event) {
        console.info('[Lampa AniSkip] Player start');
        clearCurrent();
        startEvent = event || null;
        var token = requestToken;
        installStyles();
        retryTimer = setTimeout(function () { loadForCurrent(token); }, 350);
    }
    function onPlayerDestroy() {
        clearCurrent();
        startEvent = null;
    }
    function start() {
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener || typeof Lampa.Player.listener.follow !== 'function') {
            setTimeout(start, 250);
            return;
        }
        installStyles();
        Lampa.Player.listener.follow('start', onPlayerStart);
        Lampa.Player.listener.follow('destroy', onPlayerDestroy);
        console.log('[Lampa AniSkip] loaded');
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
