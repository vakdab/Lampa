(function () {
    'use strict';

    if (window.LampaAiWebGpu) return;
    window.LampaAiWebGpu = true;

    var MODEL_URL = 'https://cdn.jsdelivr.net/gh/fishy-ops/webvsr@6353cce624875527767416d5d42a06227a24d036/extension/models/span_lite_2x_c8.bin';
    var MODEL_MANIFEST = 'https://cdn.jsdelivr.net/gh/fishy-ops/webvsr@6353cce624875527767416d5d42a06227a24d036/extension/models/span_lite_2x_c8.json';
    var engine = null;
    var enginePromise = null;
    var attachedVideo = null;

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
            (video.classList.contains('player-video__video') || video.closest('.player')));
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
        if (state.tick && state.video.cancelVideoFrameCallback) {
            state.video.cancelVideoFrameCallback(state.tick);
        }
        state.tick = null;
    }

    function createState(video) {
        var parent = video.parentElement;
        if (!parent) return null;

        if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

        var canvas = document.createElement('canvas');
        canvas.className = 'lampa-ai-webgpu-canvas';
        canvas.style.cssText = 'position:fixed;display:none;pointer-events:none;z-index:49;object-fit:fill;';
        document.body.appendChild(canvas);

        return {
            video: video,
            canvas: canvas,
            running: false,
            pending: false,
            tick: null,
            width: 0,
            height: 0,
            inputWidth: 0,
            inputHeight: 0
        };
    }

    function syncCanvas(state) {
        var rect = state.video.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;

        state.canvas.style.left = Math.round(rect.left) + 'px';
        state.canvas.style.top = Math.round(rect.top) + 'px';
        state.canvas.style.width = Math.round(rect.width) + 'px';
        state.canvas.style.height = Math.round(rect.height) + 'px';
        return true;
    }

    function renderFrame(state, now) {
        state.tick = null;
        if (!state.running || state.video.paused || state.video.ended) return;
        if (!syncCanvas(state) || state.pending) {
            schedule(state);
            return;
        }

        var video = state.video;
        var engineInstance = engine;
        if (!engineInstance || !engineInstance.ready) {
            schedule(state);
            return;
        }

        var rect = video.getBoundingClientRect();
        var sourceW = video.videoWidth;
        var sourceH = video.videoHeight;
        if (!sourceW || !sourceH) {
            schedule(state);
            return;
        }

        // iPhone-safe limit: keep the neural input at or below 480p.
        var inputH = Math.min(sourceH, 480);
        inputH = Math.max(144, inputH) & ~1;
        var inputW = Math.max(2, Math.round(sourceW * inputH / sourceH)) & ~1;
        var displayW = Math.max(2, Math.round(rect.width * (window.devicePixelRatio || 1)));
        var displayH = Math.max(2, Math.round(rect.height * (window.devicePixelRatio || 1)));

        try {
            if (state.inputWidth !== inputW || state.inputHeight !== inputH ||
                state.width !== displayW || state.height !== displayH) {
                engineInstance.configure(state.canvas, inputW, inputH, displayW, displayH);
                state.inputWidth = inputW;
                state.inputHeight = inputH;
                state.width = displayW;
                state.height = displayH;
            }

            engineInstance.sharpen = 0.12;
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
            state.tick = state.video.requestVideoFrameCallback(function (now) {
                renderFrame(state, now);
            });
        }
    }

    async function startEnhancement(state) {
        if (!state || state.running) return;
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

        video.addEventListener('play', function () {
            startEnhancement(state);
        });
        video.addEventListener('pause', function () {
            hideEnhancement(state);
            video.style.visibility = '';
        });
        video.addEventListener('ended', function () {
            stopEnhancement(state);
            video.style.visibility = '';
        });
        video.addEventListener('emptied', function () {
            stopEnhancement(state);
            video.style.visibility = '';
        });

        if (!video.paused) startEnhancement(state);
    }

    function scan() {
        var video = getVideo();
        if (isBuiltInVideo(video)) attach(video);
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
        Lampa.Player.listener.follow('destroy', function () {
            if (attachedVideo && attachedVideo.__lampaAiState) stopEnhancement(attachedVideo.__lampaAiState);
            if (attachedVideo) attachedVideo.style.visibility = '';
            attachedVideo = null;
        });

        console.log('[Lampa AI] WebGPU integration loaded; fallback is automatic');
    }

    start();
})();
