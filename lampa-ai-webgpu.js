(function () {
    'use strict';

    if (window.LampaAiWebGpu) return;
    window.LampaAiWebGpu = true;

    var MODEL_URL = 'https://cdn.jsdelivr.net/gh/fishy-ops/webvsr@6353cce624875527767416d5d42a06227a24d036/extension/models/span_lite_2x_c8.bin';
    var engine = null;
    var enginePromise = null;
    var attachedVideo = null;
    var STORAGE_KEY = 'lampa_ai_quality';

    function readQuality() {
        var value = 60;
        try {
            if (window.Lampa && Lampa.Storage) {
                value = Number(Lampa.Storage.get(STORAGE_KEY, 60));
            } else {
                value = Number(localStorage.getItem(STORAGE_KEY) || 60);
            }
        } catch (error) {}
        return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 60));
    }

    function saveQuality(value) {
        try {
            if (window.Lampa && Lampa.Storage) Lampa.Storage.set(STORAGE_KEY, value);
            else localStorage.setItem(STORAGE_KEY, String(value));
        } catch (error) {}
    }

    function getVideo() {
        try {
            return window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.video
                ? Lampa.PlayerVideo.video()
                : null;
        } catch (error) {
            return null;
        }
    }

    function isBuiltInVideo(video) {
        return !!(video && video.tagName === 'VIDEO' &&
            (video.classList.contains('player-video__video') || video.closest('.player') ||
                video.closest('.player-video') || video === getVideo()));
    }

    function loadEngine() {
        if (engine) return Promise.resolve(engine);
        if (enginePromise) return enginePromise;

        enginePromise = (async function () {
            if (!navigator.gpu || typeof WebGPUSR !== 'function') return null;
            try {
                var adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
                if (!adapter) return null;
                var instance = new WebGPUSR();
                if (!await instance.init()) return null;
                await instance.loadWeights(MODEL_URL);
                engine = instance;
                console.log('[Lampa AI] WebGPU engine ready');
                return engine;
            } catch (error) {
                console.warn('[Lampa AI] WebGPU unavailable:', error);
                enginePromise = null;
                return null;
            }
        })();

        return enginePromise;
    }

    function hideEnhancement(state) {
        if (state.canvas) state.canvas.style.display = 'none';
        if (state.video) state.video.style.visibility = '';
        state.running = false;
    }

    function stopEnhancement(state) {
        state.running = false;
        state.pending = false;
        if (state.canvas) state.canvas.remove();
        if (state.controls) state.controls.remove();
        if (state.tick && state.video.cancelVideoFrameCallback) {
            state.video.cancelVideoFrameCallback(state.tick);
        }
        state.tick = null;
    }

    function makeControls(state) {
        var root = document.createElement('div');
        root.className = 'lampa-ai-quality-control';
        root.style.cssText = 'position:fixed;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.28);border-radius:14px;background:rgba(18,20,25,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font:13px -apple-system,BlinkMacSystemFont,sans-serif;z-index:2147483646;pointer-events:auto;box-sizing:border-box;';

        var title = document.createElement('span');
        title.textContent = 'AI';
        title.style.cssText = 'font-weight:700;min-width:22px;';

        var label = document.createElement('span');
        label.textContent = 'Покращення якості';
        label.style.cssText = 'white-space:nowrap;';

        var range = document.createElement('input');
        range.type = 'range';
        range.min = '0';
        range.max = '100';
        range.step = '5';
        range.value = String(state.quality);
        range.title = 'Покращує різкість і деталізацію відео';
        range.style.cssText = 'width:105px;accent-color:#fff;';

        var value = document.createElement('span');
        value.style.cssText = 'min-width:34px;text-align:right;color:#cbd5e1;font-variant-numeric:tabular-nums;';
        value.textContent = state.quality + '%';

        var note = document.createElement('span');
        note.textContent = 'Покращує якість';
        note.style.cssText = 'display:none;';
        root.append(title, label, range, value, note);
        document.body.appendChild(root);

        range.addEventListener('input', function () {
            state.quality = Number(range.value);
            value.textContent = state.quality + '%';
            saveQuality(state.quality);
            if (state.quality === 0) {
                hideEnhancement(state);
                return;
            }
            if (!state.running) startEnhancement(state);
        });

        root.addEventListener('click', function (event) { event.stopPropagation(); });
        state.controls = root;
        state.range = range;
        state.value = value;
    }

    function syncControls(state) {
        if (!state.controls) return;
        var rect = state.video.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        state.controls.style.left = Math.max(8, Math.round(rect.left + 8)) + 'px';
        state.controls.style.top = Math.max(8, Math.round(rect.top + 8)) + 'px';
        state.controls.style.maxWidth = Math.max(220, Math.round(rect.width - 16)) + 'px';
    }

    function createState(video) {
        var parent = video.parentElement;
        if (!parent) return null;
        if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

        var canvas = document.createElement('canvas');
        canvas.className = 'lampa-ai-webgpu-canvas';
        canvas.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:49;object-fit:fill;';
        document.body.appendChild(canvas);

        var state = {
            video: video, canvas: canvas, running: false, pending: false, tick: null,
            width: 0, height: 0, inputWidth: 0, inputHeight: 0, quality: readQuality()
        };
        makeControls(state);
        return state;
    }

    function syncCanvas(state) {
        var rect = state.video.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        state.canvas.style.left = Math.round(rect.left) + 'px';
        state.canvas.style.top = Math.round(rect.top) + 'px';
        state.canvas.style.width = Math.round(rect.width) + 'px';
        state.canvas.style.height = Math.round(rect.height) + 'px';
        syncControls(state);
        return true;
    }

    function renderFrame(state) {
        state.tick = null;
        if (!state.running || state.video.paused || state.video.ended) return;
        if (!syncCanvas(state) || state.pending) { schedule(state); return; }

        var video = state.video;
        var engineInstance = engine;
        if (!engineInstance || !engineInstance.ready) { schedule(state); return; }
        var rect = video.getBoundingClientRect();
        var sourceW = video.videoWidth;
        var sourceH = video.videoHeight;
        if (!sourceW || !sourceH) { schedule(state); return; }

        // Higher quality uses a larger neural input. This improves detail but costs more GPU time.
        var inputH = Math.min(sourceH, Math.round(240 + state.quality * 4.8));
        inputH = Math.max(144, inputH) & ~1;
        var inputW = Math.max(2, Math.round(sourceW * inputH / sourceH)) & ~1;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var displayW = Math.max(2, Math.round(rect.width * dpr));
        var displayH = Math.max(2, Math.round(rect.height * dpr));

        try {
            if (state.inputWidth !== inputW || state.inputHeight !== inputH ||
                state.width !== displayW || state.height !== displayH) {
                engineInstance.configure(state.canvas, inputW, inputH, displayW, displayH);
                state.inputWidth = inputW;
                state.inputHeight = inputH;
                state.width = displayW;
                state.height = displayH;
            }

            engineInstance.sharpen = 0.04 + (state.quality / 100) * 0.22;
            state.pending = true;
            engineInstance.render(video);
            engineInstance.device.queue.onSubmittedWorkDone().then(function () {
                state.pending = false;
                if (state.running) {
                    state.canvas.style.display = '';
                    schedule(state);
                }
            }).catch(function () {
                state.pending = false;
                hideEnhancement(state);
            });
        } catch (error) {
            console.warn('[Lampa AI] frame fallback:', error);
            hideEnhancement(state);
        }
    }

    function schedule(state) {
        if (!state.running || state.tick !== null) return;
        if (state.video.requestVideoFrameCallback) {
            state.tick = state.video.requestVideoFrameCallback(function () { renderFrame(state); });
        }
    }

    async function startEnhancement(state) {
        if (!state || state.running || state.quality === 0) return;
        if (!navigator.gpu || !state.video.requestVideoFrameCallback) return;
        var ready = await loadEngine();
        if (!ready || attachedVideo !== state.video) return;
        state.running = true;
        state.video.style.visibility = 'hidden';
        state.canvas.style.display = '';
        schedule(state);
    }

    function attach(video) {
        if (!isBuiltInVideo(video)) return;
        if (attachedVideo === video && video.__lampaAiState) return;
        if (attachedVideo && attachedVideo.__lampaAiState) stopEnhancement(attachedVideo.__lampaAiState);
        attachedVideo = video;
        var state = createState(video);
        if (!state) return;
        video.__lampaAiState = state;

        video.addEventListener('play', function () { startEnhancement(state); });
        video.addEventListener('pause', function () { hideEnhancement(state); video.style.visibility = ''; });
        video.addEventListener('ended', function () { stopEnhancement(state); video.style.visibility = ''; });
        video.addEventListener('emptied', function () { stopEnhancement(state); video.style.visibility = ''; });
        window.addEventListener('resize', function () { syncCanvas(state); });
        if (!video.paused) startEnhancement(state);
    }

    function scan() {
        var current = getVideo();
        if (isBuiltInVideo(current)) attach(current);

        // Different Lampa builds use different video class names. Also scan
        // visible HTML5 videos so the control still appears when the public
        // PlayerVideo.video() helper is unavailable.
        var fallback = Array.prototype.find.call(document.querySelectorAll('video'), function (video) {
            var rect = video.getBoundingClientRect();
            return rect.width > 80 && rect.height > 45 && isBuiltInVideo(video);
        });
        if (!current && fallback) attach(fallback);
    }

    function start() {
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener) {
            setTimeout(start, 500);
            return;
        }
        scan();
        Lampa.Player.listener.follow('start', scan);
        Lampa.PlayerVideo.listener.follow('loadeddata', scan);
        Lampa.PlayerVideo.listener.follow('canplay', scan);
        if (window.MutationObserver) {
            var observer = new MutationObserver(function () { scan(); });
            observer.observe(document.body, { childList: true, subtree: true });
            window.__lampaAiObserver = observer;
        }
        setInterval(scan, 1500);
        Lampa.Player.listener.follow('destroy', function () {
            if (attachedVideo && attachedVideo.__lampaAiState) stopEnhancement(attachedVideo.__lampaAiState);
            if (attachedVideo) attachedVideo.style.visibility = '';
            attachedVideo = null;
        });
        console.log('[Lampa AI] WebGPU integration loaded; quality slider enabled');
    }

    start();
})();
