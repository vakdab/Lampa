/* Lampa AniSkip — manual opening skip button powered by AniSkip */
(function () {
    'use strict';
    var pluginVersion = '2026-10-13-all-in-one-8';
    if (window.LampaAniSkipPluginVersion === pluginVersion) return;
    window.LampaAniSkipPluginVersion = pluginVersion;
    window.LampaAniSkipPlugin = true;

    var styleId = 'lampa-aniskip-style-' + pluginVersion;
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
    var lastVisibilityLog = null;
    function debugLog() {}

    function installStyles() {
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = '.lampa-aniskip-fallback{position:fixed!important;left:16px!important;right:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 82px)!important}' +
            '.player .lampa-aniskip-button{right:3em!important}' +
            '.player:not(.player--panel-visible) .lampa-aniskip-button{bottom:calc(5em + env(safe-area-inset-bottom,0px))!important}' +
            '.player.player--panel-visible .lampa-aniskip-button{bottom:calc(12em + env(safe-area-inset-bottom,0px))!important}';
        document.head.appendChild(style);
    }
    function currentPlaybackData() {
        try {
            if (window.Lampa && Lampa.Player && typeof Lampa.Player.playdata === 'function') return Lampa.Player.playdata() || null;
        } catch (error) {}
        return null;
    }
    function asObjects(event) {
        var activity = null;
        var playData = currentPlaybackData();
        try {
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function') activity = Lampa.Activity.active();
        } catch (error) {}
        var initial = [
            playData && playData.card,
            playData && playData.movie,
            activity && activity.movie,
            activity && activity.data && activity.data.movie,
            activity && activity.params && activity.params.movie,
            event && event.movie,
            event && event.card,
            event && event.data && event.data.card,
            event && event.data && event.data.movie,
            event && event.object && event.object.movie,
            playData,
            event && event.episode,
            activity && activity.episode,
            activity && activity.data,
            event && event.data,
            event && event.object,
            event,
            activity
        ].filter(function (value) { return value && (typeof value === 'object' || typeof value === 'string' || typeof value === 'number'); });
        initial.slice().forEach(function (value) {
            if (typeof value !== 'string' || value.length < 2 || !/^[\[{]/.test(value.trim())) return;
            try {
                var parsed = JSON.parse(value);
                if (parsed && typeof parsed === 'object') initial.unshift(parsed);
            } catch (error) {}
        });
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
        var keys = ['mal_id', 'malId', 'malID', 'myanimelist_id', 'myAnimeListId', 'myanimelist', 'mal'];
        for (var i = 0; i < objects.length; i++) {
            var item = objects[i];
            if (!item || typeof item !== 'object') continue;
            var id = 0;
            keys.some(function (key) {
                var value = Number(item[key] || (item.ids && item.ids[key]) || (item.externalIds && item.externalIds[key]) || (item.external_ids && item.external_ids[key]));
                if (Number.isInteger(value) && value > 0) { id = value; return true; }
                return false;
            });
            if (id) return id;
        }
        return 0;
    }
    function malIdFromText(value) {
        var text = String(value || '');
        var match = text.match(/(?:myanimelist\.net\/anime\/|mal[_ -]?id[=:/_-]?)(\d{2,8})/i);
        return match ? Number(match[1]) || 0 : 0;
    }
    function titleCandidates(objects) {
        var keys = ['title_orig', 'original_title', 'original_name', 'title_english', 'title_en', 'title_ru', 'title_uk', 'originalName', 'title', 'name', 'romaji', 'english', 'native'];
        var result = [];
        function add(value) {
            if (typeof value !== 'string' || value.trim().length < 3 || isGenericTitle(value)) return;
            var clean = value.trim();
            if (result.indexOf(clean) === -1) result.push(clean);
        }
        objects.forEach(function (item) {
            if (!item || typeof item !== 'object') return;
            keys.forEach(function (key) { add(item[key]); });
            if (item.titles && Array.isArray(item.titles)) item.titles.forEach(function (entry) {
                add(entry && (entry.title || entry.name || entry.value));
            });
        });
        objects.forEach(function (item) { if (typeof item === 'string') add(item); });
        return result.slice(0, 8);
    }
    function titleFrom(objects) {
        var keys = ['title_orig', 'original_title', 'title_english', 'title_en', 'originalName', 'title', 'name'];
        for (var j = 0; j < keys.length; j++) {
            for (var i = 0; i < objects.length; i++) {
                var item = objects[i];
                if (!item || typeof item !== 'object') continue;
                var value = item[keys[j]];
                if (typeof value === 'string' && value.trim().length > 2 && !isGenericTitle(value)) return value.trim();
            }
        }
        for (var k = 0; k < objects.length; k++) {
            if (typeof objects[k] === 'string' && objects[k].trim().length > 2 && !isGenericTitle(objects[k])) return objects[k].trim();
        }
        return '';
    }
    function isGenericTitle(value) {
        return /(?:\bsource\b|\bисточник\b|\b\d{3,4}\s*x\s*\d{3,4}\b|\b\d{3,4}p\b|\.m3u8(?:$|[?#])|\.mp4(?:$|[?#]))/i.test(String(value || ''));
    }
    function mediaSourceText() {
        var data = currentPlaybackData();
        var source = data && (data.url || data.file || data.src) || '';
        var video = getVideo();
        source = source || (video && (video.currentSrc || video.src)) || '';
        for (var i = 0; i < 2; i++) {
            try {
                var decoded = decodeURIComponent(source);
                if (decoded === source) break;
                source = decoded;
            } catch (error) { break; }
        }
        return String(source || '');
    }
    function normalizeTitle(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9а-яёіїєґ]+/gi, ' ').trim();
    }
    function knownAnimeMalId(value) {
        var text = String(value || '');
        if (/(?:\bfrieren\b|sousou[\s._\-/]*no[\s._\-/]*frieren|フリーレン|リーレン|芙莉莲|芙莉蓮|фрирен|фрирэн)/i.test(text)) {
            return /(?:season\s*2|2nd\s*season|сезон\s*2|2\s*сезон)/i.test(text) ? 59978 : 52991;
        }
        return 0;
    }
    function resolveMalId(objects) {
        var direct = directMalId(objects);
        if (direct) return Promise.resolve(direct);
        for (var sourceIndex = 0; sourceIndex < objects.length; sourceIndex++) {
            var sourceMalId = malIdFromText(objects[sourceIndex]);
            if (sourceMalId) return Promise.resolve(sourceMalId);
        }
        var title = titleFrom(objects);
        var knownId = knownAnimeMalId(title) || knownAnimeMalId(mediaSourceText());
        if (knownId) return Promise.resolve(knownId);
        var candidates = titleCandidates(objects);
        if (title && candidates.indexOf(title) === -1) candidates.unshift(title);
        candidates = candidates.slice(0, 4);
        if (!candidates.length) return Promise.resolve(0);
        var key = candidates.map(normalizeTitle).join('|');
        if (malIdCache.has(key)) return malIdCache.get(key);
        var promise = (async function () {
            var graph = 'query($search:String!){Media(search:$search,type:ANIME){idMal title{romaji english native}}}';
            for (var i = 0; i < candidates.length; i++) {
                var query = candidates[i];
                var controller = new AbortController();
                var timer = setTimeout(function () { controller.abort(); }, 2500);
                try {
                    var response = await fetch('https://graphql.anilist.co', {
                        method: 'POST', signal: controller.signal,
                        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: graph, variables: { search: query } })
                    });
                    if (response.ok) {
                        var payload = await response.json();
                        var media = payload && payload.data && payload.data.Media;
                        var names = media && media.title ? [media.title.romaji, media.title.english, media.title.native] : [];
                        if (media && media.idMal && (names.some(function (name) { return normalizeTitle(name) === normalizeTitle(query); }) || normalizeTitle(query).length > 5)) return Number(media.idMal);
                    }
                } catch (error) {} finally { clearTimeout(timer); }
            }
            for (var j = 0; j < Math.min(2, candidates.length); j++) {
                var jikanController = new AbortController();
                var jikanTimer = setTimeout(function () { jikanController.abort(); }, 2500);
                try {
                    var jikanResponse = await fetch('https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(candidates[j]) + '&limit=10', { signal: jikanController.signal, headers: { Accept: 'application/json' } });
                    if (!jikanResponse.ok) continue;
                    var jikanPayload = await jikanResponse.json();
                    var jikanResults = Array.isArray(jikanPayload && jikanPayload.data) ? jikanPayload.data : [];
                    var normalized = normalizeTitle(candidates[j]);
                    var exact = jikanResults.find(function (anime) { return [anime.title, anime.title_english, anime.title_japanese].some(function (name) { return normalizeTitle(name) === normalized; }); });
                    if (exact && exact.mal_id) return Number(exact.mal_id);
                } catch (error) {} finally { clearTimeout(jikanTimer); }
            }
            return 0;
        })();
        malIdCache.set(key, promise);
        return promise;
    }
    function episodeFromString(value) {
        var text = String(value || '');
        var patterns = [
            /__0*(\d{1,3})[_]/i,
            /(?:^|[\/_ .-])(?:episode|ep)[_ .-]?0*(\d{1,3})(?=[\/_ .-]|$)/i,
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
        var roots = [startEvent, currentPlaybackData()];
        var rootKeys = ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'current_episode', 'currentEpisode', 'episode_index', 'episodeIndex', 'playlist_index', 'playlistIndex', 'episode', 'ep'];
        for (var r = 0; r < roots.length; r++) {
            var root = roots[r];
            if (!root || typeof root !== 'object') continue;
            for (var rk = 0; rk < rootKeys.length; rk++) {
                var rootValue = root[rootKeys[rk]];
                if (typeof rootValue === 'number' && Number.isInteger(rootValue) && rootValue > 0) return rootValue;
                if (typeof rootValue === 'string') {
                    var rootNumber = Number(rootValue);
                    if (Number.isInteger(rootNumber) && rootNumber > 0) return rootNumber;
                    rootNumber = episodeFromString(rootValue);
                    if (rootNumber) return rootNumber;
                }
                if (rootValue && typeof rootValue === 'object') {
                    var nestedRoot = Number(rootValue.number || rootValue.episode_number || rootValue.episodeNumber || rootValue.num);
                    if (Number.isInteger(nestedRoot) && nestedRoot > 0) return nestedRoot;
                }
            }
        }
        var preferredKeys = ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'current_episode', 'currentEpisode', 'episode_index', 'episodeIndex', 'playlist_index', 'playlistIndex'];
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
        var sourceEpisode = episodeFromString(mediaSourceText());
        if (sourceEpisode) return sourceEpisode;
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
        var lampaVideo = document.querySelector('.player-video__video');
        if (lampaVideo && lampaVideo.tagName === 'VIDEO') return lampaVideo;
        var candidates = Array.prototype.slice.call(document.querySelectorAll('video'));
        candidates.sort(function (a, b) {
            var aScore = (a.paused ? 0 : 1000000) + a.getBoundingClientRect().width * a.getBoundingClientRect().height;
            var bScore = (b.paused ? 0 : 1000000) + b.getBoundingClientRect().width * b.getBoundingClientRect().height;
            return bScore - aScore;
        });
        return candidates[0] || null;
    }
    function createButton(video) {
        var root = document.querySelector('.player');
        if (!root && window.Lampa && Lampa.Player && typeof Lampa.Player.render === 'function') {
            try {
                var rendered = Lampa.Player.render();
                root = rendered && (rendered.nodeType === 1 ? rendered : rendered[0]) || null;
            } catch (error) {}
        }
        root = root || document.body;
        if (!root) return null;
        if (currentButton && currentButton.parentNode === root) return currentButton;
        if (currentButton && currentButton.parentNode) currentButton.parentNode.removeChild(currentButton);
        Array.prototype.slice.call(document.querySelectorAll('.lampa-aniskip-button')).forEach(function (oldButton) {
            if (oldButton !== currentButton && oldButton.parentNode) oldButton.parentNode.removeChild(oldButton);
        });
        var button = document.createElement('div');
        button.className = 'player-skip selector hide lampa-aniskip-button';
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', '0');
        button.setAttribute('aria-hidden', 'true');
        button.setAttribute('aria-label', 'Пропустити опенінг');
        button.innerHTML = '<span class="player-skip__text">Пропустити опенінг</span><svg aria-hidden="true"><use xlink:href="#sprite-player-next"></use></svg>';
        if (root === document.body) button.classList.add('lampa-aniskip-fallback');
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
        if (window.$ && typeof window.$ === 'function') {
            try { window.$(button).on('hover:enter', function () { button.click(); }); } catch (error) {}
        }
        currentButton = button;
        return button;
    }
    function syncButton() {
        if (!currentButton || !currentVideo) return;
        var now = Number(currentVideo.currentTime);
        currentSegment = currentSegments.find(function (segment) { return now >= segment.start && now < segment.end; }) || null;
        var visible = !!currentSegment;
        currentButton.classList.toggle('hide', !visible);
        currentButton.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (lastVisibilityLog !== visible) {
            lastVisibilityLog = visible;
            if (visible) debugLog('[Lampa AniSkip] Skip button visible:', currentSegment.type, currentSegment.start, '-', currentSegment.end);
        }
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
                    debugLog('[Lampa AniSkip] API error:', response.status);
                    return [];
                }
                var payload = await response.json();
                if (!payload || payload.found !== true || !Array.isArray(payload.results)) {
                    debugLog('[Lampa AniSkip] No segments for this MAL ID / episode:', malId, episode);
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
                debugLog('[Lampa AniSkip] Segments:', malId, episode, segments.length);
                return segments;
            } catch (error) {
                debugLog('[Lampa AniSkip] Request failed:', error && error.name ? error.name : error);
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
        lastVisibilityLog = null;
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
            if (pollCount === 1) debugLog('[Lampa AniSkip] Waiting for video metadata:', { video: !!video, episode: episode, title: !!title, malId: malId });
            if (pollCount === 60) debugLog('[Lampa AniSkip] Stopped: video, episode or anime title could not be detected');
            if (pollCount < 60) retryTimer = setTimeout(function () { loadForCurrent(token); }, 500);
            return;
        }
        debugLog('[Lampa AniSkip] Looking up:', { episode: episode, malId: malId || 'title lookup' });
        currentVideo = video;
        createButton(video);
        Promise.resolve(resolveMalId(objects)).then(function (malId) {
            if (token !== requestToken || currentVideo !== video) return;
            if (!malId) {
                debugLog('[Lampa AniSkip] No MAL ID resolved for title:', title);
                return;
            }
            debugLog('[Lampa AniSkip] Resolved MAL ID:', malId, 'episode:', episode);
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
        debugLog('[Lampa AniSkip] Player start');
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
        debugLog('[Lampa AniSkip] loaded');
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
