/* Lampa Anime4K WebGL Upscale — real GPU shader processing, with safe fallback */
(function () {
    'use strict';

    var VERSION = '2026-10-15-anime4k-1';
    if (window.LampaAnime4KVersion === VERSION) return;
    window.LampaAnime4KVersion = VERSION;

    var STORAGE_KEY = 'anime4k_enabled';
    var SCALE = 2;
    var video = null;
    var canvas = null;
    var gl = null;
    var scaler = null;
    var frameHandle = 0;
    var running = false;
    var originalOpacity = null;
    var originalOpacityPriority = '';
    var sourceWidth = 0;
    var sourceHeight = 0;
    var menuInstalled = false;
    var onVideoPlay = null;
    var onVideoSeeked = null;

    function enabled() {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
                var stored = Lampa.Storage.get(STORAGE_KEY, true);
                return stored !== false && stored !== 'false' && stored !== 0 && stored !== '0';
            }
        } catch (error) {}
        return true;
    }
    function setEnabled(value) {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') Lampa.Storage.set(STORAGE_KEY, !!value);
        } catch (error) {}
    }
    function currentVideo() {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.video === 'function') return Lampa.PlayerVideo.video();
        } catch (error) {}
        return document.querySelector('.player-video__video, video');
    }
    function removeCanvas() {
        if (frameHandle) {
            if (video && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(frameHandle);
            else cancelAnimationFrame(frameHandle);
        }
        frameHandle = 0;
        running = false;
        if (video && onVideoPlay) video.removeEventListener('play', onVideoPlay);
        if (video && onVideoSeeked) video.removeEventListener('seeked', onVideoSeeked);
        onVideoPlay = null;
        onVideoSeeked = null;
        if (video && originalOpacity !== null) {
            if (originalOpacity) video.style.setProperty('opacity', originalOpacity, originalOpacityPriority);
            else video.style.removeProperty('opacity');
        }
        originalOpacity = null;
        originalOpacityPriority = '';
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        canvas = null;
        scaler = null;
        gl = null;
        video = null;
        sourceWidth = 0;
        sourceHeight = 0;
    }
    function setupCanvas(target) {
        if (!target || !target.videoWidth || !target.videoHeight || !window.Anime4K || typeof window.Anime4K.Scaler !== 'function') return false;
        var parent = target.parentElement;
        if (!parent) return false;
        var context = document.createElement('canvas');
        context.className = 'lampa-anime4k-canvas';
        context.setAttribute('aria-hidden', 'true');
        context.style.cssText = 'position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;pointer-events:none!important;object-fit:contain!important;z-index:1!important;background:#000!important;';
        parent.style.position = window.getComputedStyle(parent).position === 'static' ? 'relative' : parent.style.position;
        parent.appendChild(context);
        var contextGl = context.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
        if (!contextGl) {
            context.remove();
            return false;
        }
        try {
            var maxTexture = Number(contextGl.getParameter(contextGl.MAX_TEXTURE_SIZE)) || 4096;
            var actualScale = Math.min(SCALE, maxTexture / target.videoWidth, maxTexture / target.videoHeight);
            if (actualScale < 1) actualScale = 1;
            var upscaler = window.Anime4K.Scaler(contextGl);
            upscaler.inputVideo(target);
            upscaler.setSize(actualScale);
            canvas = context;
            gl = contextGl;
            scaler = upscaler;
            video = target;
            sourceWidth = target.videoWidth;
            sourceHeight = target.videoHeight;
            originalOpacity = target.style.getPropertyValue('opacity');
            originalOpacityPriority = target.style.getPropertyPriority('opacity');
            target.style.setProperty('opacity', '0', 'important');
            context.style.width = '100%';
            context.style.height = '100%';
            return true;
        } catch (error) {
            context.remove();
            return false;
        }
    }
    function renderFrame() {
        if (!running || !video || !scaler) return;
        try {
            if (video.readyState >= 2) scaler.render();
        } catch (error) {
            removeCanvas();
            return;
        }
        if (!running) return;
        if (typeof video.requestVideoFrameCallback === 'function') frameHandle = video.requestVideoFrameCallback(renderVideoFrame);
        else if (!video.paused) frameHandle = requestAnimationFrame(renderFrame);
    }
    function renderVideoFrame() {
        frameHandle = 0;
        renderFrame();
    }
    function startRendering(target) {
        if (!setupCanvas(target)) return false;
        running = true;
        scaler.render();
        onVideoPlay = function () {
            if (!running || frameHandle) return;
            if (typeof target.requestVideoFrameCallback === 'function') frameHandle = target.requestVideoFrameCallback(renderVideoFrame);
            else frameHandle = requestAnimationFrame(renderFrame);
        };
        onVideoSeeked = function () {
            if (running && scaler) {
                try { scaler.render(); } catch (error) {}
            }
        };
        target.addEventListener('play', onVideoPlay, { passive: true });
        target.addEventListener('seeked', onVideoSeeked, { passive: true });
        if (typeof target.requestVideoFrameCallback === 'function') frameHandle = target.requestVideoFrameCallback(renderVideoFrame);
        else if (!target.paused) frameHandle = requestAnimationFrame(renderFrame);
        return true;
    }
    function enableCurrent() {
        var target = currentVideo();
        if (!target || !enabled()) return;
        if (video === target && scaler) return;
        removeCanvas();
        if (target.readyState >= 1) startRendering(target);
        else target.addEventListener('loadedmetadata', function onMetadata() {
            target.removeEventListener('loadedmetadata', onMetadata);
            if (enabled()) startRendering(target);
        }, { once: true, passive: true });
    }
    function disableCurrent() {
        removeCanvas();
    }
    function installMenu() {
        if (menuInstalled || !window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        menuInstalled = true;
        var originalShow = Lampa.Select.show;
        Lampa.Select.show = function (options) {
            if (!options || !Array.isArray(options.items)) return originalShow.apply(this, arguments);
            var values = options.items.map(function (item) { return item && String(item.value); });
            if (values.indexOf('default') === -1 || (values.indexOf('cover') === -1 && values.indexOf('fill') === -1) || values.indexOf('anime4k2') !== -1) return originalShow.apply(this, arguments);
            var patched = Object.assign({}, options);
            patched.items = options.items.concat([
                { title: 'Anime4K x2', subtitle: 'Реальний WebGL апскейл на GPU', value: 'anime4k2', selected: enabled() },
                { title: 'Вимкнути Anime4K', subtitle: 'Стандартне відео Lampa', value: 'anime4k-off', selected: !enabled() }
            ]);
            patched.onSelect = function (item) {
                if (item && item.value === 'anime4k2') {
                    setEnabled(true);
                    enableCurrent();
                    if (Lampa.Select.close) Lampa.Select.close();
                } else if (item && item.value === 'anime4k-off') {
                    setEnabled(false);
                    disableCurrent();
                    if (Lampa.Select.close) Lampa.Select.close();
                } else if (typeof options.onSelect === 'function') options.onSelect(item);
            };
            return originalShow.call(this, patched);
        };
    }
    function onStart() {
        installMenu();
        if (enabled()) setTimeout(enableCurrent, 120);
    }
    function onDestroy() {
        disableCurrent();
    }
    function start() {
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener) {
            setTimeout(start, 300);
            return;
        }
        installMenu();
        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('destroy', onDestroy);
    }
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
