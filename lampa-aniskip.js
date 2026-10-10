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
            var item = values[i] && (values[i].movie || values[i].card || values[i]);
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
        return 0;
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
            var item = candidates[i] && (candidates[i].movie || candidates[i].card || candidates[i]);
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
