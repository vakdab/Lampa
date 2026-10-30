/* SenPlayer timecode bridge — opens a stream in SenPlayer at the position Lampa
 * remembers and writes SenPlayer's position back into Lampa's timeline.
 * SenPlayer 6.1.0+ (URL Scheme: position, x-callback-url return of play time).
 */
(function () {
    'use strict';

    var version = '2026-10-30-senplayer-bridge-v2';
    if (window.LampaSenBridgeVersion === version) return;
    window.LampaSenBridgeVersion = version;

    var COMPONENT = 'sen_bridge';
    var WATCH_KEY = 'sen_bridge_installed';
    var K = {
        enabled: 'sen_bridge_enabled',
        send: 'sen_bridge_send_position',
        save: 'sen_bridge_save_timecode',
        estimate: 'sen_bridge_estimate',
        subtitles: 'sen_bridge_subtitles',
        always: 'sen_bridge_always'
    };
    var PENDING_KEY = 'lampa_sen_bridge_pending';
    var RETURN_FLAG = 'lampa_sen';
    var PENDING_TTL = 12 * 60 * 60 * 1000;
    var MIN_TIME = 10;

    var TAB = (function () {
        try {
            var id = sessionStorage.getItem('lampa_sen_bridge_tab');
            if (!id) {
                id = Date.now() + '-' + Math.random().toString(36).slice(2);
                sessionStorage.setItem('lampa_sen_bridge_tab', id);
            }
            return String(id);
        } catch (e) { return ''; }
    })();

    var TIME_KEYS = ['position', 'currentTime', 'current_time', 'playbackTime', 'playback_time', 'time', 'pos', 'seconds', 'second', 'seek', 't'];
    var DURATION_KEYS = ['duration', 'totalTime', 'total_time', 'total', 'length', 'runTime', 'runtime', 'd'];
    var PROGRESS_KEYS = ['progress', 'percent', 'percentage', 'ratio'];

    var STR = {
        ru: {
            section: 'SenPlayer',
            enabled: 'Таймкоды SenPlayer',
            enabled_d: 'Открывать видео в SenPlayer и синхронизировать таймкод с Lampa',
            send: 'Передавать позицию',
            send_d: 'SenPlayer начнёт с места, где вы остановились в Lampa',
            save: 'Забирать таймкод',
            save_d: 'После выхода из SenPlayer позиция сохранится в Lampa',
            estimate: 'Оценка по времени',
            estimate_d: 'Если SenPlayer не вернул таймкод, посчитать его по времени просмотра',
            subtitles: 'Передавать субтитры',
            subtitles_d: 'Отдавать выбранные субтитры в SenPlayer',
            always: 'Всегда открывать SenPlayer',
            always_d: 'Игнорировать выбор плеера в настройках Lampa',
            info: 'Нужен SenPlayer 6.1.0 или новее. Плагін открывает поток в SenPlayer так же, как штатный внешний плеер Lampa.',
            saved: 'Таймкод из SenPlayer: ',
            on: 'Включено',
            off: 'Выключено'
        },
        uk: {
            section: 'SenPlayer',
            enabled: 'Таймкоди SenPlayer',
            enabled_d: 'Відкривати відео в SenPlayer і синхронізувати таймкод з Lampa',
            send: 'Передавати позицію',
            send_d: 'SenPlayer почне з місця, де ви зупинились у Lampa',
            save: 'Забирати таймкод',
            save_d: 'Після виходу з SenPlayer позиція збережеться у Lampa',
            estimate: 'Оцінка за часом',
            estimate_d: 'Якщо SenPlayer не повернув таймкод, порахувати його за часом перегляду',
            subtitles: 'Передавати субтитри',
            subtitles_d: 'Віддавати вибрані субтитри у SenPlayer',
            always: 'Завжди відкривати SenPlayer',
            always_d: 'Ігнорувати вибір плеєра в налаштуваннях Lampa',
            info: 'Потрібен SenPlayer 6.1.0 або новіший. Плагін відкриває потік у SenPlayer так само, як штатний зовнішній плеєр Lampa.',
            saved: 'Таймкод із SenPlayer: ',
            on: 'Увімкнено',
            off: 'Вимкнено'
        },
        en: {
            section: 'SenPlayer',
            enabled: 'SenPlayer timecodes',
            enabled_d: 'Open videos in SenPlayer and sync the timecode with Lampa',
            send: 'Send the position',
            send_d: 'SenPlayer starts where you stopped in Lampa',
            save: 'Take the timecode back',
            save_d: 'After leaving SenPlayer the position is saved in Lampa',
            estimate: 'Estimate from time',
            estimate_d: 'If SenPlayer returns no timecode, count it from watching time',
            subtitles: 'Send subtitles',
            subtitles_d: 'Hand the selected subtitles to SenPlayer',
            always: 'Always open SenPlayer',
            always_d: 'Ignore the player chosen in Lampa settings',
            info: 'SenPlayer 6.1.0 or newer is required. The plugin opens the stream in SenPlayer the same way Lampa\'s own external player does.',
            saved: 'Timecode from SenPlayer: ',
            on: 'On',
            off: 'Off'
        }
    };

    function lang() {
        var code = '';
        try { code = String(Lampa.Storage.get('language', '') || '').toLowerCase(); } catch (e) { }
        if (!code) code = String(navigator.language || 'uk').toLowerCase();
        if (code.indexOf('uk') === 0 || code.indexOf('ua') === 0) return 'uk';
        if (code.indexOf('en') === 0) return 'en';
        return 'ru';
    }

    function t(key) {
        var dict = STR[lang()] || STR.ru;
        return dict[key] || STR.ru[key] || key;
    }

    function storageReady() {
        return !!(window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function');
    }

    function flag(name, def) {
        var value = null;
        try { value = Lampa.Storage.get(name, def ? 'on' : 'off'); } catch (e) { }
        if (value === true || value === 'on' || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'off' || value === 'false' || value === 0 || value === '0') return false;
        return !!def;
    }

    function lsGet(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    }

    function lsSet(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
    }

    function lsDel(key) {
        try { localStorage.removeItem(key); } catch (e) { }
    }

    function number(value) {
        var parsed = parseFloat(String(value === undefined || value === null ? '' : value).replace(',', '.'));
        return isFinite(parsed) ? parsed : 0;
    }

    function secondsToTime(seconds) {
        try {
            if (window.Lampa && Lampa.Utils && typeof Lampa.Utils.secondsToTime === 'function') return Lampa.Utils.secondsToTime(seconds);
        } catch (e) { }
        var total = Math.max(0, Math.round(seconds || 0));
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
    }

    function notify(text) {
        if (!text) return;
        try {
            if (window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(text);
        } catch (e) { }
    }

    function playerField(data) {
        if (data && data.torrent_hash) return 'player_torrent';
        if (data && data.iptv) return 'player_iptv';
        return 'player';
    }

    function chosenPlayer(data) {
        try { return String(Lampa.Storage.field(playerField(data)) || ''); } catch (e) { return ''; }
    }

    function shouldHandle(data) {
        if (!storageReady() || !flag(K.enabled, true)) return false;
        if (!data || !data.url) return false;
        if (data.iptv || data.tv) return false;
        if (!/^https?:/i.test(String(data.url)) && !data.torrent_hash) return false;
        if (chosenPlayer(data) === 'senplayer') return true;
        return flag(K.always, false);
    }

    function resolveUrl(data) {
        var url = String(data && data.url ? data.url : '');
        try {
            if (data && data.quality && Lampa.Player && typeof Lampa.Player.getUrlQuality === 'function') {
                var picked = Lampa.Player.getUrlQuality(data.quality, false) || Lampa.Player.getUrlQuality(data.quality, true);
                if (picked) url = String(picked);
            }
            if (window.Lampa && Lampa.Torserver && typeof Lampa.Torserver.toPlayUrl === 'function') url = String(Lampa.Torserver.toPlayUrl(url));
        } catch (e) { }
        return /^https?:/i.test(url) || /^magnet:/i.test(url) ? url : '';
    }

    function timelineOf(data) {
        var info = { hash: '', time: 0, duration: 0, percent: 0, meta: null };
        var view = data && data.timeline ? data.timeline : null;
        if (!view) return info;
        info.hash = view.hash ? String(view.hash) : '';
        info.time = number(view.time);
        info.duration = number(view.duration);
        info.percent = number(view.percent);
        if (view.card) info.meta = { card: view.card, season: view.season, episode: view.episode };
        return info;
    }

    function baseUrl() {
        var origin = location.origin || (location.protocol + '//' + location.host);
        return origin + (location.pathname || '/');
    }

    function buildReturnUrl(info) {
        var parts = [RETURN_FLAG + '=1'];
        if (info.hash) parts.push('h=' + encodeURIComponent(info.hash));
        parts.push('p=' + Math.round(info.time || 0));
        if (info.duration) parts.push('d=' + Math.round(info.duration));
        if (info.percent) parts.push('pr=' + info.percent);
        if (info.meta) {
            var season = info.meta.season === undefined || info.meta.season === null ? '' : info.meta.season;
            var episode = info.meta.episode === undefined || info.meta.episode === null ? '' : info.meta.episode;
            parts.push('m=' + encodeURIComponent([info.meta.card, season, episode].join('|')));
        }
        return baseUrl() + '?' + parts.join('&');
    }

    function senUrl(data, url, info, back) {
        var query = ['url=' + encodeURIComponent(url)];

        if (flag(K.send, true) && info.time > MIN_TIME && (!info.duration || info.time < info.duration - 30)) {
            query.push('position=' + Math.round(info.time));
        }

        if (flag(K.subtitles, true)) {
            var subs = data && data.subtitles ? data.subtitles : [];
            var added = 0;
            for (var i = 0; i < subs.length && added < 8; i++) {
                if (subs[i] && subs[i].url) {
                    query.push('sub=' + encodeURIComponent(subs[i].url));
                    added++;
                }
            }
        }

        if (back) {
            query.push('x-success=' + encodeURIComponent(back));
            query.push('x-error=' + encodeURIComponent(back + '&sen_error=1'));
        }

        return 'senplayer://x-callback-url/play?' + query.join('&');
    }

    function launch(data) {
        var url = resolveUrl(data);
        if (!url) return false;

        var info = timelineOf(data);
        var back = flag(K.save, true) ? buildReturnUrl(info) : '';
        var target = senUrl(data, url, info, back);

        lsSet(PENDING_KEY, {
            hash: info.hash,
            meta: info.meta,
            url: url,
            start: Math.round(info.time || 0),
            duration: Math.round(info.duration || 0),
            tab: TAB,
            launched: Date.now()
        });

        try {
            if (window.Lampa && Lampa.Player && Lampa.Player.listener) Lampa.Player.listener.send('external', data);
        } catch (e) { }

        try { window.location.assign(target); } catch (e) { location.href = target; }
        return true;
    }

    /* ---------- reading SenPlayer's answer ---------- */

    function params(fromUrl) {
        var out = {};
        var href = String(fromUrl || location.href);
        var hashIndex = href.indexOf('#');
        if (hashIndex >= 0) href = href.slice(0, hashIndex);
        var queryIndex = href.indexOf('?');
        if (queryIndex < 0) return out;
        var pairs = href.slice(queryIndex + 1).split(/[?&]+/);
        for (var i = 0; i < pairs.length; i++) {
            if (!pairs[i]) continue;
            var eq = pairs[i].indexOf('=');
            var key = eq < 0 ? pairs[i] : pairs[i].slice(0, eq);
            var value = eq < 0 ? '' : pairs[i].slice(eq + 1);
            try {
                out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
            } catch (e) {
                out[key] = value;
            }
        }
        return out;
    }

    function pick(map, keys) {
        for (var i = 0; i < keys.length; i++) {
            var raw = map[keys[i]];
            if (raw === undefined || raw === null || raw === '') continue;
            var parsed = number(raw);
            if (parsed) return parsed;
        }
        return 0;
    }

    function parseMeta(raw) {
        if (!raw) return null;
        var parts = String(raw).split('|');
        if (!parts[0]) return null;
        var meta = { card: parts[0] };
        if (parts[1] !== undefined && parts[1] !== '') meta.season = parseInt(parts[1], 10);
        if (parts[2] !== undefined && parts[2] !== '') meta.episode = parseInt(parts[2], 10);
        return meta;
    }

    function apply(record) {
        if (!record || !record.hash) return false;

        var time = Math.max(0, Math.round(record.time || 0));
        if (time < MIN_TIME) return false;

        var duration = Math.max(0, Math.round(record.duration || 0));
        var progress = number(record.progress);
        if (progress > 1.5) progress = progress / 100;

        if (!duration && progress > 0) duration = Math.round(time / progress);

        var percent = 0;
        if (progress > 0) percent = Math.round(progress * 100);
        if (!percent && duration > 0) percent = Math.round(time / duration * 100);
        if (percent > 97 || (duration && time >= duration - 20)) percent = 100;
        if (percent > 100) percent = 100;
        if (!percent) percent = 1;

        var view = null;
        try { view = Lampa.Timeline.view(record.hash, record.meta || null); } catch (e) { }
        if (!view || typeof view.handler !== 'function') return false;

        if (!duration) duration = Math.round(view.duration || 0);

        try { view.handler(percent, time, duration); } catch (e) { return false; }

        notify(t('saved') + secondsToTime(time) + (record.estimated ? ' ~' : ''));
        return true;
    }

    function loadPending() {
        var pending = lsGet(PENDING_KEY);
        if (!pending || !pending.hash) return null;
        if (Date.now() - (pending.launched || 0) > PENDING_TTL) {
            lsDel(PENDING_KEY);
            return null;
        }
        return pending;
    }

    function cleanUrl() {
        try { history.replaceState(null, '', baseUrl() + (location.hash || '')); } catch (e) { }
    }

    function readReturn() {
        var map = params(location.href);
        var pending = loadPending();
        if (!map[RETURN_FLAG] && !pending) return false;

        var duration = pick(map, DURATION_KEYS) || (pending && pending.duration) || 0;
        var progress = pick(map, PROGRESS_KEYS);
        var time = pick(map, TIME_KEYS);

        if (!time && progress > 0 && duration) time = progress > 1.5 ? progress / 100 * duration : progress * duration;
        if (!time) return false;

        var record = {
            hash: map.h || (pending && pending.hash) || '',
            meta: parseMeta(map.m) || (pending && pending.meta) || null,
            time: time,
            duration: duration,
            progress: progress,
            estimated: false
        };

        if (!record.hash) return false;
        if (!apply(record)) return false;

        lsDel(PENDING_KEY);
        cleanUrl();
        return true;
    }

    /* ---------- fallback: estimate from wall-clock time ---------- */

    function probeDuration(url, done) {
        var finished = false;
        var video = document.createElement('video');

        function finish(value) {
            if (finished) return;
            finished = true;
            try { video.removeAttribute('src'); video.load(); } catch (e) { }
            done(Math.round(isFinite(value) ? value : 0));
        }

        try {
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.addEventListener('loadedmetadata', function () { finish(video.duration); });
            video.addEventListener('error', function () { finish(0); });
            video.src = url;
            setTimeout(function () { finish(0); }, 8000);
        } catch (e) {
            finish(0);
        }
    }

    function estimate() {
        var pending = loadPending();
        if (!pending || !flag(K.estimate, true)) return;

        var elapsed = Math.round((Date.now() - (pending.launched || 0)) / 1000);
        if (elapsed < 45) return;

        var duration = Math.round(pending.duration || 0);
        var time = Math.round(pending.start || 0) + elapsed;
        if (duration && time > duration - 15) time = duration - 10;

        var record = { hash: pending.hash, meta: pending.meta, time: time, duration: duration, estimated: true };

        if (!duration && pending.url) {
            probeDuration(pending.url, function (found) {
                record.duration = found;
                apply(record);
                lsDel(PENDING_KEY);
            });
            return;
        }

        apply(record);
        lsDel(PENDING_KEY);
    }

    function scheduleEstimate() {
        setTimeout(estimate, 1200);
    }

    function bindResume() {
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) scheduleEstimate();
        });
        window.addEventListener('pageshow', function (event) {
            if (event && event.persisted) scheduleEstimate();
        });
        window.addEventListener('focus', scheduleEstimate);
        window.addEventListener('online', scheduleEstimate);
    }

    /* ---------- hooks ---------- */

    function hookPlay() {
        if (!window.Lampa || !Lampa.Player || typeof Lampa.Player.play !== 'function') return false;
        if (Lampa.Player.play.__senBridge) return true;

        var core = Lampa.Player.play;
        var wrapped = function (data) {
            var handled = false;
            try {
                handled = shouldHandle(data) && launch(data);
            } catch (e) {
                handled = false;
                try { console.log('SenBridge', e); } catch (ignored) { }
            }
            if (handled) return;
            return core.apply(this, arguments);
        };

        wrapped.__senBridge = true;
        Lampa.Player.play = wrapped;
        return true;
    }

    function registerSettings() {
        if (!window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return;
        if (window.__LAMPA_SEN_BRIDGE_SETTINGS__) return;
        window.__LAMPA_SEN_BRIDGE_SETTINGS__ = true;

        if (Lampa.Template && Lampa.Template.add) {
            try { Lampa.Template.add('settings_' + COMPONENT, '<div></div>'); } catch (e) { }
        }

        try {
            Lampa.SettingsApi.addComponent({
                component: COMPONENT,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
                name: t('section')
            });
        } catch (e) { }

        function select(key, nameKey, descKey, def) {
            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: key, type: 'select', values: { on: t('on'), off: t('off') }, default: def },
                field: { name: t(nameKey), description: t(descKey) }
            });
        }

        try {
            select(K.enabled, 'enabled', 'enabled_d', 'on');
            select(K.send, 'send', 'send_d', 'on');
            select(K.save, 'save', 'save_d', 'on');
            select(K.estimate, 'estimate', 'estimate_d', 'on');
            select(K.subtitles, 'subtitles', 'subtitles_d', 'on');
            select(K.always, 'always', 'always_d', 'off');

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: 'sen_bridge_info', type: 'static' },
                field: { name: t('section'), description: t('info') }
            });
        } catch (e) { }
    }

    var attempts = 0;

    function boot() {
        attempts++;

        if (!window.Lampa || !Lampa.Player || !Lampa.Player.play) {
            if (attempts < 120) setTimeout(boot, 250);
            return;
        }

        hookPlay();
        registerSettings();

        if (!window[WATCH_KEY]) {
            window[WATCH_KEY] = true;
            bindResume();
        }

        if (!readReturn() && !document.hidden) setTimeout(estimate, 3000);
    }

    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
