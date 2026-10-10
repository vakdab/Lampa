/* AniSkip for Lampa — iPhone-friendly OP/ED skip button and optional auto-skip.
 * Uses the official AniSkip v2 and AniList public APIs. */
(function () {
    'use strict';

    var GLOBAL_KEY = 'LampaAniSkipPluginV2';
    if (window[GLOBAL_KEY]) return;
    window[GLOBAL_KEY] = true;

    var API = 'https://api.aniskip.com/v2';
    var ANILIST = 'https://graphql.anilist.co';
    var STORAGE_KEY = 'lampa_aniskip_v2';
    var OLD_STORAGE_KEY = 'lampa_aniskip_settings';
    var state = {
        settings: { autoSkip: false, opening: true, ending: true, overrides: {} },
        video: null,
        playEvent: null,
        meta: { title: '', malId: 0, episode: 0, season: 0 },
        segments: [],
        segmentKey: '',
        loadedKey: '',
        loadingKey: '',
        loadToken: 0,
        lastAutoSkip: '',
        status: 'Очікую на відео',
        controls: null,
        dialog: null,
        observer: null,
        scanFrame: 0,
        rulesCache: {},
        malCache: {}
    };

    function log(message, error) {
        if (window.console && console.warn) console.warn('[Lampa AniSkip] ' + message, error || '');
    }
    function storeGet(key, fallback) {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
                return Lampa.Storage.get(key, fallback);
            }
        } catch (error) { log('Storage read failed', error); }
        return fallback;
    }
    function storeSet(key, value) {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
                Lampa.Storage.set(key, value);
                return;
            }
        } catch (error) { log('Storage write failed', error); }
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
    }
    function loadSettings() {
        var saved = storeGet(STORAGE_KEY, null);
        if (!saved || typeof saved !== 'object') {
            var legacy = storeGet(OLD_STORAGE_KEY, null);
            saved = {
                autoSkip: !!(legacy && legacy.enabled),
                opening: true,
                ending: true,
                overrides: {}
            };
            if (legacy && (legacy.malId || legacy.episode || legacy.title)) {
                var key = normalizeTitle(legacy.title || '');
                if (key) saved.overrides[key] = {
                    malId: positiveInt(legacy.malId),
                    episode: positiveInt(legacy.episode),
                    searchTitle: String(legacy.title || '')
                };
            }
        }
        state.settings = {
            autoSkip: !!saved.autoSkip,
            opening: saved.opening !== false,
            ending: saved.ending !== false,
            overrides: saved.overrides && typeof saved.overrides === 'object' ? saved.overrides : {}
        };
    }
    function saveSettings() { storeSet(STORAGE_KEY, state.settings); }
    function positiveInt(value) {
        var number = Number(value);
        return isFinite(number) && number > 0 ? Math.floor(number) : 0;
    }
    function normalizeTitle(value) {
        return String(value || '').toLowerCase().normalize ?
            String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9а-яё\s]/gi, ' ').replace(/\s+/g, ' ').trim() :
            String(value || '').toLowerCase().replace(/[^a-z0-9а-яё\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    }
    function cleanTitle(value) {
        return String(value || '').replace(/\s+/g, ' ').replace(/\s*(?:[-–|:]?\s*)?(?:S\s*\d+\s*[- ]?\s*E\s*\d+|\d+\s*[x×]\s*\d+|(?:episode|ep\.?|серія|серия|епізод|эпизод)\s*[-#:]?\s*\d+).*$/i, '').trim();
    }
    function addValue(list, value) {
        if (value === undefined || value === null) return;
        if (typeof value === 'object' || typeof value === 'function') {
            if (list.indexOf(value) === -1) list.push(value);
        }
    }
    function safeMember(owner, name) {
        if (!owner) return null;
        try { return typeof owner[name] === 'function' ? owner[name]() : owner[name]; }
        catch (error) { return null; }
    }
    function collectRoots() {
        var roots = [];
        addValue(roots, state.playEvent);
        if (window.Lampa && Lampa.PlayerVideo) {
            ['info', 'object', 'movie', 'data', 'item', 'episode', 'current'].forEach(function (key) {
                addValue(roots, safeMember(Lampa.PlayerVideo, key));
            });
            addValue(roots, Lampa.PlayerVideo);
        }
        if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function') {
            addValue(roots, safeMember(Lampa.Activity, 'active'));
        }
        return roots;
    }
    function flatten(roots) {
        var result = [];
        var seen = [];
        function visit(value, depth) {
            if (!value || typeof value !== 'object' || depth > 4 || seen.indexOf(value) !== -1) return;
            seen.push(value);
            result.push(value);
            Object.keys(value).slice(0, 80).forEach(function (key) {
                var child;
                try { child = value[key]; } catch (error) { child = null; }
                if (child && typeof child === 'object') visit(child, depth + 1);
            });
        }
        roots.forEach(function (root) { visit(root, 0); });
        return result;
    }
    function numericField(value) {
        if (typeof value === 'number') return isFinite(value) && value > 0 ? Math.floor(value) : 0;
        if (typeof value === 'string' && /^\s*\d+(?:\.0+)?\s*$/.test(value)) return positiveInt(value);
        return 0;
    }
    function parseEpisodeText(value) {
        var text = String(value || '');
        var match = text.match(/\bS\s*(\d{1,2})\s*[- ]?\s*E\s*(\d{1,4})\b/i);
        if (match) return { season: positiveInt(match[1]), episode: positiveInt(match[2]) };
        match = text.match(/\b(\d{1,2})\s*[x×]\s*(\d{1,4})\b/i);
        if (match) return { season: positiveInt(match[1]), episode: positiveInt(match[2]) };
        match = text.match(/(?:episode|ep\.?|серія|серия|епізод|эпизод)\s*[-#:]?\s*(\d{1,4})\b/i);
        if (match) return { season: 0, episode: positiveInt(match[1]) };
        return { season: 0, episode: 0 };
    }
    function domText() {
        var selectors = ['.player__title', '.player-video__title', '.player-info__title', '.player-info .title', '.player__name'];
        for (var i = 0; i < selectors.length; i += 1) {
            var element = document.querySelector(selectors[i]);
            var value = element && element.textContent ? element.textContent.trim() : '';
            if (value) return value;
        }
        return '';
    }
    function detectMetadata() {
        var nodes = flatten(collectRoots());
        var malId = 0;
        var episode = 0;
        var season = 0;
        var title = '';
        var titleRank = 0;
        var titleKeys = [
            ['anime_title', 5], ['animeTitle', 5], ['series_title', 4], ['seriesTitle', 4],
            ['show_title', 4], ['showTitle', 4], ['original_name', 3], ['original_title', 3],
            ['name', 2], ['title', 2]
        ];
        var parsed = { season: 0, episode: 0 };
        nodes.forEach(function (node) {
            if (!malId) {
                ['mal_id', 'malId', 'myanimelist_id', 'myanimelistId'].some(function (key) {
                    malId = numericField(node[key]);
                    return !!malId;
                });
            }
            if (!episode) {
                ['episode_number', 'episodeNumber', 'episode_num', 'episodeNum', 'episode', 'ep'].some(function (key) {
                    var value = node[key];
                    episode = numericField(value);
                    if (!episode && typeof value === 'string') episode = parseEpisodeText(value).episode;
                    return !!episode;
                });
            }
            if (!season) {
                ['season_number', 'seasonNumber', 'season_num', 'seasonNum', 'season'].some(function (key) {
                    var value = node[key];
                    season = numericField(value);
                    if (!season && typeof value === 'string') {
                        var match = value.match(/\d+/);
                        season = match ? positiveInt(match[0]) : 0;
                    }
                    return !!season;
                });
            }
            titleKeys.forEach(function (entry) {
                var value = node[entry[0]];
                if (typeof value === 'string' && value.trim().length > 1 && entry[1] > titleRank) {
                    title = value.trim();
                    titleRank = entry[1];
                }
            });
        });
        var sourceTitle = title || domText();
        parsed = parseEpisodeText(sourceTitle);
        if (!episode) episode = parsed.episode;
        if (!season) season = parsed.season;
        title = cleanTitle(sourceTitle);
        if (!title && state.meta.title) title = state.meta.title;
        return { title: title, malId: malId, episode: episode, season: season };
    }
    function getOverride(title) {
        var key = normalizeTitle(title);
        return key && state.settings.overrides[key] ? state.settings.overrides[key] : {};
    }
    function titleScore(left, right) {
        var a = normalizeTitle(left);
        var b = normalizeTitle(right);
        if (!a || !b) return 0;
        if (a === b) return 1;
        if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) {
            return Math.min(a.length, b.length) / Math.max(a.length, b.length) >= 0.68 ? 0.84 : 0.64;
        }
        var at = a.split(' ').filter(Boolean);
        var bt = b.split(' ').filter(Boolean);
        var setA = {};
        var setB = {};
        at.forEach(function (token) { setA[token] = true; });
        bt.forEach(function (token) { setB[token] = true; });
        var intersection = Object.keys(setA).filter(function (token) { return setB[token]; }).length;
        var union = Object.keys(setA).length + Object.keys(setB).length - intersection;
        var jaccard = union ? intersection / union : 0;
        function bigrams(text) {
            var out = [];
            for (var i = 0; i < text.length - 1; i += 1) out.push(text.slice(i, i + 2));
            return out;
        }
        var ba = bigrams(a.replace(/ /g, ''));
        var bb = bigrams(b.replace(/ /g, ''));
        var used = {};
        var shared = 0;
        ba.forEach(function (pair) {
            var index = bb.indexOf(pair);
            if (index !== -1 && !used[index]) { used[index] = true; shared += 1; }
        });
        var dice = ba.length + bb.length ? (2 * shared) / (ba.length + bb.length) : 0;
        return 0.55 * jaccard + 0.45 * dice;
    }
    function postJson(url, body) {
        var controller = window.AbortController ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : 0;
        var options = {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        };
        if (controller) options.signal = controller.signal;
        return fetch(url, options).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        }).then(function (data) {
            if (timer) clearTimeout(timer);
            return data;
        }, function (error) {
            if (timer) clearTimeout(timer);
            throw error;
        });
    }
    function getAniListMalId(title) {
        var key = normalizeTitle(title);
        if (!key) return Promise.resolve(0);
        if (state.malCache[key] !== undefined) return Promise.resolve(state.malCache[key]);
        var query = 'query($search:String){Page(page:1,perPage:15){media(search:$search,type:ANIME){idMal title{english romaji native userPreferred} synonyms}}}';
        return postJson(ANILIST, { query: query, variables: { search: title } }).then(function (json) {
            var results = json && json.data && json.data.Page && json.data.Page.media || [];
            var ranked = [];
            results.forEach(function (media) {
                var id = positiveInt(media && media.idMal);
                if (!id) return;
                var variants = [];
                if (media.title) variants = variants.concat(Object.keys(media.title).map(function (name) { return media.title[name]; }));
                if (Array.isArray(media.synonyms)) variants = variants.concat(media.synonyms);
                var score = 0;
                variants.forEach(function (variant) { score = Math.max(score, titleScore(title, variant)); });
                ranked.push({ id: id, score: score });
            });
            ranked.sort(function (a, b) { return b.score - a.score; });
            var best = ranked[0];
            var next = ranked[1];
            var id = best && best.score >= 0.74 && (!next || best.score - next.score >= 0.06 || best.score >= 0.98) ? best.id : 0;
            state.malCache[key] = id;
            return id;
        }).catch(function (error) {
            log('AniList lookup failed', error);
            state.malCache[key] = 0;
            return 0;
        });
    }
    function getJson(url) {
        var controller = window.AbortController ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : 0;
        return fetch(url, controller ? { method: 'GET', mode: 'cors', signal: controller.signal } : { method: 'GET', mode: 'cors' })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            }).then(function (data) {
                if (timer) clearTimeout(timer);
                return data;
            }, function (error) {
                if (timer) clearTimeout(timer);
                throw error;
            });
    }
    function getRules(malId) {
        if (state.rulesCache[malId]) return Promise.resolve(state.rulesCache[malId]);
        return getJson(API + '/relation-rules/' + encodeURIComponent(malId)).then(function (data) {
            var rules = data && data.found && Array.isArray(data.rules) ? data.rules : [];
            state.rulesCache[malId] = rules;
            return rules;
        }).catch(function () {
            state.rulesCache[malId] = [];
            return [];
        });
    }
    function applyRelationRules(malId, episode, season) {
        return getRules(malId).then(function (rules) {
            if (!rules.length) return { malId: malId, episode: episode };
            for (var i = 0; i < rules.length; i += 1) {
                var rule = rules[i];
                var start = Number(rule.from && rule.from.start) || 1;
                var end = rule.from && rule.from.end != null ? Number(rule.from.end) : Infinity;
                if (episode >= start && episode <= end && positiveInt(rule.to && rule.to.malId)) {
                    return {
                        malId: positiveInt(rule.to.malId),
                        episode: (positiveInt(rule.to.start) || 1) + episode - start
                    };
                }
            }
            if (season > 1) {
                var groups = [];
                rules.slice().sort(function (a, b) { return Number(a.from.start) - Number(b.from.start); }).forEach(function (rule) {
                    var target = positiveInt(rule.to && rule.to.malId);
                    if (target && target !== malId && !groups.some(function (group) { return group.malId === target; })) {
                        groups.push({ malId: target, rule: rule });
                    }
                });
                var seasonGroup = groups[season - 2];
                if (seasonGroup) {
                    var range = seasonGroup.rule;
                    var toStart = positiveInt(range.to && range.to.start) || 1;
                    return { malId: seasonGroup.malId, episode: toStart + episode - 1 };
                }
            }
            return { malId: malId, episode: episode };
        });
    }
    function activeTypes() {
        var types = [];
        if (state.settings.opening) types.push('op', 'mixed-op');
        if (state.settings.ending) types.push('ed', 'mixed-ed');
        return types;
    }
    function dedupeSegments(segments) {
        var result = [];
        ['op', 'ed'].forEach(function (kind) {
            var sameKind = segments.filter(function (segment) {
                return segment.skipType === kind || segment.skipType === 'mixed-' + kind;
            });
            if (!sameKind.length) return;
            var preferred = sameKind.filter(function (segment) { return segment.skipType === 'mixed-' + kind; });
            result.push(preferred[0] || sameKind[0]);
        });
        return result.sort(function (a, b) { return Number(a.interval.startTime) - Number(b.interval.startTime); });
    }
    function loadSegments(force) {
        var video = state.video;
        var meta = state.meta;
        if (!video || !isFinite(video.duration) || video.duration < 60) return;
        var types = activeTypes();
        var override = getOverride(meta.title);
        var episode = positiveInt(meta.episode) || positiveInt(override.episode);
        var titleForSearch = String(override.searchTitle || meta.title || '').trim();
        var rawMalId = positiveInt(override.malId) || positiveInt(meta.malId);
        if (!types.length) {
            state.status = 'Пропуск вимкнено';
            state.segments = [];
            renderControls();
            return;
        }
        if (!episode || (!rawMalId && !titleForSearch)) {
            state.status = 'Не визначено аніме або серію';
            state.segments = [];
            renderControls();
            return;
        }
        var requestKey = [normalizeTitle(titleForSearch), rawMalId, episode, meta.season, Math.round(video.duration), types.join(',')].join('|');
        if (!force && (requestKey === state.loadedKey || requestKey === state.loadingKey)) return;
        state.loadingKey = requestKey;
        state.status = 'Шукаю опенінг/ендінг…';
        renderControls();
        var token = ++state.loadToken;
        var idPromise = rawMalId ? Promise.resolve(rawMalId) : getAniListMalId(titleForSearch);
        idPromise.then(function (malId) {
            if (!malId) throw new Error('Не вдалося визначити MAL ID. Укажіть його вручну.');
            return applyRelationRules(malId, episode, meta.season).then(function (mapped) {
                return { malId: mapped.malId, episode: mapped.episode };
            });
        }).then(function (identity) {
            var params = [];
            types.forEach(function (type) { params.push('types=' + encodeURIComponent(type)); });
            params.push('episodeLength=' + encodeURIComponent(Number(video.duration).toFixed(3)));
            var url = API + '/skip-times/' + encodeURIComponent(identity.malId) + '/' + encodeURIComponent(identity.episode) + '?' + params.join('&');
            return getJson(url);
        }).then(function (data) {
            if (token !== state.loadToken || video !== state.video) return;
            state.segments = data && data.found && Array.isArray(data.results) ? dedupeSegments(data.results) : [];
            state.loadedKey = requestKey;
            state.loadingKey = '';
            state.status = state.segments.length ? 'Готово: знайдено інтервали' : 'Для цієї серії інтервалів немає';
            state.lastAutoSkip = '';
            renderControls();
        }).catch(function (error) {
            if (token !== state.loadToken || video !== state.video) return;
            state.segments = [];
            state.loadedKey = requestKey;
            state.loadingKey = '';
            state.status = error && error.message && error.message.indexOf('MAL ID') !== -1 ? error.message : 'Не вдалося завантажити AniSkip';
            renderControls();
            log(state.status, error);
        });
    }
    function playerRoot(video) {
        return video && (video.closest('.player-video') || video.closest('.player') || video.parentElement);
    }
    function ensureControls() {
        if (!state.video || !document.body) return;
        if (state.controls && state.controls.parentNode) return;
        var container = document.createElement('div');
        container.className = 'lampa-aniskip-controls';
        container.innerHTML = '<button type="button" class="lampa-aniskip-settings" aria-label="Налаштування AniSkip">AniSkip</button><button type="button" class="lampa-aniskip-skip" aria-label="Пропустити сегмент" hidden></button>';
        state.controls = container;
        document.body.appendChild(container);
        container.querySelector('.lampa-aniskip-settings').addEventListener('click', openSettings);
        container.querySelector('.lampa-aniskip-skip').addEventListener('click', skipCurrentSegment);
    }
    function installStyles() {
        if (document.getElementById('lampa-aniskip-v2-style')) return;
        var style = document.createElement('style');
        style.id = 'lampa-aniskip-v2-style';
        style.textContent = [
            '.lampa-aniskip-controls{position:fixed;inset:0;z-index:2147482500;pointer-events:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
            '.lampa-aniskip-controls button{pointer-events:auto;appearance:none;-webkit-appearance:none;border:1px solid rgba(255,255,255,.28);color:#fff;background:rgba(18,20,24,.88);box-shadow:0 3px 16px rgba(0,0,0,.34);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:600 15px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:48px;border-radius:999px;padding:0 18px;touch-action:manipulation}',
            '.lampa-aniskip-controls button:active{transform:scale(.97);background:rgba(50,54,62,.96)}',
            '.lampa-aniskip-settings{position:absolute;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));opacity:.84}',
            '.lampa-aniskip-skip{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(92px + env(safe-area-inset-bottom));min-height:52px!important;padding:0 20px!important;background:rgba(255,255,255,.94)!important;color:#111!important;border:0!important;box-shadow:0 4px 20px rgba(0,0,0,.42)!important}',
            '.lampa-aniskip-skip[hidden]{display:none!important}',
            '.lampa-aniskip-dialog-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;padding:16px 12px calc(16px + env(safe-area-inset-bottom));background:rgba(0,0,0,.58);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
            '.lampa-aniskip-dialog{box-sizing:border-box;width:min(100%,460px);max-height:85vh;overflow:auto;border:1px solid rgba(255,255,255,.16);border-radius:20px;background:#17191e;color:#fff;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.55)}',
            '.lampa-aniskip-dialog h2{font-size:20px;margin:0 0 6px}',
            '.lampa-aniskip-dialog p{font-size:13px;line-height:1.45;color:#c4c7ce;margin:0 0 14px}',
            '.lampa-aniskip-dialog label{display:block;font-size:14px;margin:12px 0}',
            '.lampa-aniskip-dialog input[type=text],.lampa-aniskip-dialog input[type=number]{box-sizing:border-box;width:100%;height:48px;margin-top:6px;border:1px solid #555b66;border-radius:10px;background:#242730;color:#fff;padding:0 12px;font:16px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
            '.lampa-aniskip-dialog .lampa-aniskip-check{display:flex;align-items:center;gap:10px;min-height:40px}',
            '.lampa-aniskip-dialog input[type=checkbox]{width:22px;height:22px;accent-color:#4aa889}',
            '.lampa-aniskip-dialog .lampa-aniskip-status{min-height:18px;color:#c7d6d0;font-size:13px;margin:8px 0 14px}',
            '.lampa-aniskip-dialog .lampa-aniskip-actions{display:flex;gap:10px;margin-top:16px}',
            '.lampa-aniskip-dialog button{flex:1;min-height:48px;border:0;border-radius:12px;font:600 15px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
            '.lampa-aniskip-dialog [data-action=save]{background:#8ee6c0;color:#10251d}',
            '.lampa-aniskip-dialog [data-action=close]{background:#30343c;color:#fff}',
            '@media (orientation:landscape){.lampa-aniskip-skip{bottom:calc(54px + env(safe-area-inset-bottom))}.lampa-aniskip-dialog-backdrop{align-items:center}}'
        ].join('');
        document.head.appendChild(style);
    }
    function activeSegment() {
        if (!state.video || !state.segments.length) return null;
        var now = Number(state.video.currentTime) || 0;
        var duration = Number(state.video.duration) || 0;
        for (var i = 0; i < state.segments.length; i += 1) {
            var segment = state.segments[i];
            var segmentLength = Number(segment.episodeLength);
            var offset = isFinite(segmentLength) && segmentLength > 0 ? duration - segmentLength : 0;
            var start = Number(segment.interval.startTime) + offset;
            var end = Number(segment.interval.endTime) + offset;
            if (now >= start - 0.75 && now < end) return { segment: segment, start: start, end: end, offset: offset };
        }
        return null;
    }
    function renderControls() {
        if (!state.controls) return;
        var settingsButton = state.controls.querySelector('.lampa-aniskip-settings');
        var skipButton = state.controls.querySelector('.lampa-aniskip-skip');
        if (settingsButton) settingsButton.title = state.status;
        var active = activeSegment();
        if (state.settings.autoSkip && active) {
            var skipId = String(active.segment.skipId || active.segment.skipType + ':' + active.segment.interval.startTime);
            if (state.lastAutoSkip !== skipId) {
                state.lastAutoSkip = skipId;
                try { state.video.currentTime = Math.min(state.video.duration || active.end, Math.max(0, active.end + 0.1)); }
                catch (error) { log('Automatic seek failed', error); }
            }
            active = null;
        }
        if (!skipButton) return;
        if (!active) {
            skipButton.hidden = true;
            return;
        }
        skipButton.hidden = false;
        skipButton.textContent = active.segment.skipType === 'ed' || active.segment.skipType === 'mixed-ed' ? 'Пропустити ендинг' : 'Пропустити опенінг';
        skipButton.setAttribute('aria-label', skipButton.textContent);
        state.segmentKey = String(active.segment.skipId || active.segment.skipType + ':' + active.segment.interval.startTime);
    }
    function skipCurrentSegment() {
        var active = activeSegment();
        if (!active || !state.video) return;
        try {
            state.video.currentTime = Math.min(state.video.duration || active.end, Math.max(0, active.end + 0.1));
            renderControls();
        } catch (error) { log('Manual seek failed', error); }
    }
    function onTimeUpdate() { renderControls(); }
    function detachVideo() {
        if (state.video) {
            state.video.removeEventListener('timeupdate', onTimeUpdate);
            state.video.removeEventListener('loadedmetadata', onVideoReady);
            state.video.removeEventListener('durationchange', onVideoReady);
            state.video.removeEventListener('emptied', onVideoEmptied);
        }
        state.video = null;
        state.segments = [];
        state.segmentKey = '';
        state.loadedKey = '';
        state.loadingKey = '';
        state.lastAutoSkip = '';
        state.loadToken += 1;
    }
    function onVideoEmptied() {
        state.segments = [];
        state.loadedKey = '';
        state.loadingKey = '';
        state.lastAutoSkip = '';
        state.status = 'Завантаження відео…';
        renderControls();
    }
    function onVideoReady() {
        refreshMetadata();
        loadSegments(false);
    }
    function findVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') {
                var preferred = Lampa.PlayerVideo.video();
                if (preferred && preferred.tagName === 'VIDEO') return preferred;
            }
        } catch (error) {}
        var videos = Array.prototype.slice.call(document.querySelectorAll('.player-video video, .player video, video'));
        videos = videos.filter(function (video) {
            var rect = video.getBoundingClientRect();
            return rect.width > 120 && rect.height > 70 && !!(video.closest('.player-video') || video.closest('.player'));
        });
        videos.sort(function (a, b) {
            var ar = a.getBoundingClientRect(); var br = b.getBoundingClientRect();
            return br.width * br.height - ar.width * ar.height;
        });
        return videos[0] || null;
    }
    function refreshMetadata() {
        var found = detectMetadata();
        var override = getOverride(found.title || state.meta.title);
        if (!found.title) found.title = state.meta.title;
        if (override.malId) found.malId = positiveInt(override.malId);
        if (!found.episode && override.episode) found.episode = positiveInt(override.episode);
        var oldKey = [normalizeTitle(state.meta.title), state.meta.malId, state.meta.episode, state.meta.season].join('|');
        var newKey = [normalizeTitle(found.title), found.malId, found.episode, found.season].join('|');
        state.meta = found;
        if (oldKey !== newKey) {
            state.segments = [];
            state.loadedKey = '';
            state.loadingKey = '';
            state.lastAutoSkip = '';
            state.loadToken += 1;
            state.status = found.title && found.episode ? 'Визначаю AniSkip для серії ' + found.episode : 'Потрібно визначити аніме та серію';
            renderControls();
        }
    }
    function attachVideo(video) {
        if (!video || video === state.video) return;
        detachVideo();
        state.video = video;
        if (/iPhone|iPod/i.test(navigator.userAgent || '')) {
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
        }
        video.addEventListener('timeupdate', onTimeUpdate, { passive: true });
        video.addEventListener('loadedmetadata', onVideoReady, { passive: true });
        video.addEventListener('durationchange', onVideoReady, { passive: true });
        video.addEventListener('emptied', onVideoEmptied, { passive: true });
        ensureControls();
        refreshMetadata();
        if (video.readyState >= 1) loadSegments(false);
        renderControls();
    }
    function scan() {
        state.scanFrame = 0;
        var video = findVideo();
        if (!video) return;
        if (video !== state.video) attachVideo(video);
        else {
            refreshMetadata();
            loadSegments(false);
        }
    }
    function scheduleScan() {
        if (state.scanFrame) return;
        state.scanFrame = requestAnimationFrame(scan);
    }
    function onPlayerStart(event) {
        state.playEvent = event && typeof event === 'object' ? event : null;
        state.meta = { title: '', malId: 0, episode: 0, season: 0 };
        state.segments = [];
        state.loadedKey = '';
        state.loadingKey = '';
        state.lastAutoSkip = '';
        state.loadToken += 1;
        state.status = 'Відкриваю серію…';
        scheduleScan();
        setTimeout(scheduleScan, 180);
        setTimeout(scheduleScan, 650);
        setTimeout(scheduleScan, 1400);
    }
    function onPlayerDestroy() {
        detachVideo();
        state.playEvent = null;
        state.meta = { title: '', malId: 0, episode: 0, season: 0 };
        if (state.controls && state.controls.parentNode) state.controls.parentNode.removeChild(state.controls);
        state.controls = null;
        closeSettings();
    }
    function makeInput(form, labelText, name, value, type, placeholder) {
        var label = document.createElement('label');
        label.textContent = labelText;
        var input = document.createElement('input');
        input.name = name;
        input.type = type || 'text';
        input.value = value || '';
        input.placeholder = placeholder || '';
        if (input.type === 'number') { input.inputMode = 'numeric'; input.min = '1'; input.step = '1'; }
        label.appendChild(input);
        form.appendChild(label);
        return input;
    }
    function makeCheckbox(form, labelText, name, checked) {
        var label = document.createElement('label');
        label.className = 'lampa-aniskip-check';
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.name = name;
        input.checked = !!checked;
        label.appendChild(input);
        label.appendChild(document.createTextNode(labelText));
        form.appendChild(label);
        return input;
    }
    function openSettings() {
        if (state.dialog) return;
        var override = getOverride(state.meta.title);
        var backdrop = document.createElement('div');
        backdrop.className = 'lampa-aniskip-dialog-backdrop';
        backdrop.setAttribute('role', 'presentation');
        var dialog = document.createElement('section');
        dialog.className = 'lampa-aniskip-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'lampa-aniskip-title');
        var heading = document.createElement('h2');
        heading.id = 'lampa-aniskip-title';
        heading.textContent = 'AniSkip';
        dialog.appendChild(heading);
        var description = document.createElement('p');
        description.textContent = 'Кнопка з’являється під час опенінгу або ендингу. Якщо Lampa не визначила назву чи серію, введіть MAL ID та номер епізоду.';
        dialog.appendChild(description);
        var form = document.createElement('div');
        var titleInput = makeInput(form, 'Назва аніме', 'searchTitle', override.searchTitle || state.meta.title, 'text', 'Наприклад, Attack on Titan');
        var malInput = makeInput(form, 'MAL ID (необов’язково, якщо визначається автоматично)', 'malId', override.malId || state.meta.malId || '', 'number', '16498');
        var episodeInput = makeInput(form, 'Номер епізоду', 'episode', override.episode || state.meta.episode || '', 'number', '1');
        var openingInput = makeCheckbox(form, 'Пропускати опенінги', 'opening', state.settings.opening);
        var endingInput = makeCheckbox(form, 'Пропускати ендинги', 'ending', state.settings.ending);
        var autoInput = makeCheckbox(form, 'Пропускати автоматично (без натискання)', 'autoSkip', state.settings.autoSkip);
        var status = document.createElement('div');
        status.className = 'lampa-aniskip-status';
        status.textContent = state.status;
        form.appendChild(status);
        dialog.appendChild(form);
        var actions = document.createElement('div');
        actions.className = 'lampa-aniskip-actions';
        var close = document.createElement('button');
        close.type = 'button'; close.dataset.action = 'close'; close.textContent = 'Закрити';
        var save = document.createElement('button');
        save.type = 'button'; save.dataset.action = 'save'; save.textContent = 'Зберегти';
        actions.appendChild(close); actions.appendChild(save); dialog.appendChild(actions);
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
        state.dialog = backdrop;
        close.addEventListener('click', closeSettings);
        backdrop.addEventListener('click', function (event) { if (event.target === backdrop) closeSettings(); });
        save.addEventListener('click', function () {
            var manualTitle = titleInput.value.trim() || state.meta.title;
            var key = normalizeTitle(state.meta.title || manualTitle);
            if (key) {
                state.settings.overrides[key] = {
                    searchTitle: manualTitle,
                    malId: positiveInt(malInput.value),
                    episode: positiveInt(episodeInput.value)
                };
            }
            state.settings.opening = openingInput.checked;
            state.settings.ending = endingInput.checked;
            state.settings.autoSkip = autoInput.checked;
            saveSettings();
            state.meta = detectMetadata();
            var currentOverride = getOverride(state.meta.title || manualTitle);
            if (!state.meta.title) state.meta.title = manualTitle;
            if (!state.meta.malId) state.meta.malId = positiveInt(currentOverride.malId);
            if (!state.meta.episode) state.meta.episode = positiveInt(currentOverride.episode);
            state.segments = [];
            state.loadedKey = '';
            state.loadingKey = '';
            state.loadToken += 1;
            state.status = 'Оновлюю AniSkip…';
            closeSettings();
            loadSegments(true);
        });
    }
    function closeSettings() {
        if (state.dialog && state.dialog.parentNode) state.dialog.parentNode.removeChild(state.dialog);
        state.dialog = null;
    }
    function start() {
        loadSettings();
        installStyles();
        if (window.Lampa && Lampa.Player && Lampa.Player.listener) {
            Lampa.Player.listener.follow('start', onPlayerStart);
            Lampa.Player.listener.follow('destroy', onPlayerDestroy);
        }
        if (window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
            Lampa.PlayerVideo.listener.follow('loadeddata', scheduleScan);
            Lampa.PlayerVideo.listener.follow('canplay', scheduleScan);
        }
        if (window.MutationObserver && document.body) {
            state.observer = new MutationObserver(function (mutations) {
                if (mutations.some(function (mutation) { return mutation.addedNodes && mutation.addedNodes.length; })) scheduleScan();
            });
            state.observer.observe(document.body, { childList: true, subtree: true });
        }
        scheduleScan();
        console.log('[Lampa AniSkip] iPhone plugin ready');
    }
    function waitForLampa() {
        if (window.Lampa && Lampa.Player && Lampa.PlayerVideo && document.body) start();
        else setTimeout(waitForLampa, 300);
    }
    if (document.body) waitForLampa();
    else document.addEventListener('DOMContentLoaded', waitForLampa, { once: true });
})();
