/* Lampa Anime4K WebGL Upscale — real GPU shader processing, with safe fallback */
(function () {
    'use strict';

    var VERSION = '2026-10-15-anime4k-2';
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
    var onWindowResize = null;
    var parentElement = null;
    var parentPosition = '';
    var parentPositionPriority = '';

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
        if (window.removeEventListener && onWindowResize) window.removeEventListener('resize', onWindowResize);
        onVideoPlay = null;
        onVideoSeeked = null;
        onWindowResize = null;
        if (video && originalOpacity !== null) {
            if (originalOpacity) video.style.setProperty('opacity', originalOpacity, originalOpacityPriority);
            else video.style.removeProperty('opacity');
        }
        originalOpacity = null;
        originalOpacityPriority = '';
        if (parentElement) {
            if (parentPosition) parentElement.style.setProperty('position', parentPosition, parentPositionPriority);
            else parentElement.style.removeProperty('position');
        }
        parentElement = null;
        parentPosition = '';
        parentPositionPriority = '';
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
        context.style.cssText = 'position:absolute!important;top:0!important;left:0!important;width:0!important;height:0!important;display:block!important;pointer-events:none!important;object-fit:fill!important;z-index:1!important;background:#000!important;';
        parentElement = parent;
        parentPosition = parent.style.getPropertyValue('position');
        parentPositionPriority = parent.style.getPropertyPriority('position');
        if (window.getComputedStyle(parent).position === 'static') parent.style.setProperty('position', 'relative');
        parent.appendChild(context);
        var contextGl = context.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
        if (!contextGl) {
            context.remove();
            parentElement = null;
            parentPosition = '';
            parentPositionPriority = '';
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
            syncCanvasGeometry();
            return true;
        } catch (error) {
            context.remove();
            if (parentElement) {
                if (parentPosition) parentElement.style.setProperty('position', parentPosition, parentPositionPriority);
                else parentElement.style.removeProperty('position');
            }
            parentElement = null;
            parentPosition = '';
            parentPositionPriority = '';
            return false;
        }
    }
    function syncCanvasGeometry() {
        if (!canvas || !video || !canvas.parentElement) return;
        var videoRect = video.getBoundingClientRect();
        var parentRect = canvas.parentElement.getBoundingClientRect();
        var left = videoRect.left - parentRect.left;
        var top = videoRect.top - parentRect.top;
        canvas.style.setProperty('left', left.toFixed(2) + 'px', 'important');
        canvas.style.setProperty('top', top.toFixed(2) + 'px', 'important');
        canvas.style.setProperty('width', Math.max(1, videoRect.width).toFixed(2) + 'px', 'important');
        canvas.style.setProperty('height', Math.max(1, videoRect.height).toFixed(2) + 'px', 'important');
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
        onWindowResize = function () {
            if (!running) return;
            syncCanvasGeometry();
            requestAnimationFrame(syncCanvasGeometry);
        };
        window.addEventListener('resize', onWindowResize, { passive: true });
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
    function openVideoShapeMenu() {
        if (!window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        var saved = 'default';
        try { saved = Lampa.Storage && Lampa.Storage.get ? Lampa.Storage.get('player_size', 'default') : 'default'; } catch (error) {}
        Lampa.Select.show({
            title: 'Форма відео',
            items: [
                { title: 'За замовчуванням', subtitle: 'Штатний розмір кадру', value: 'default', selected: saved === 'default' },
                { title: 'Вмістити', subtitle: 'Показати весь кадр', value: 'contain', selected: saved === 'contain' },
                { title: 'Заповнити', subtitle: 'Заповнити екран', value: 'fill', selected: saved === 'fill' },
                { title: 'Збільшити 150%', value: 's150', selected: saved === 's150' },
                { title: 'Збільшити 170%', value: 's170', selected: saved === 's170' },
                { title: 'Кіно 21:9', subtitle: 'Чорні поля без деформації', value: 'cinema219', selected: saved === 'cinema219' }
            ],
            onSelect: function (item) {
                try {
                    if (Lampa.Storage && Lampa.Storage.set) Lampa.Storage.set('player_size', item.value);
                    if (Lampa.Player && Lampa.Player.listener && typeof Lampa.Player.listener.send === 'function') Lampa.Player.listener.send('size', { size: item.value });
                } catch (error) {}
                if (Lampa.Select.close) Lampa.Select.close();
            }
        });
    }
    function installMenu() {
        if (menuInstalled || !window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;
        menuInstalled = true;
        var originalShow = Lampa.Select.show;
        Lampa.Select.show = function (options) {
            if (!options || !Array.isArray(options.items)) return originalShow.apply(this, arguments);
            var values = options.items.map(function (item) { return item && String(item.value); });
            var isQualityMenu = options.items.some(function (item) {
                return item && (item.quality !== undefined || item.url) && item.value !== 'anime4k2' && item.value !== 'anime4k-off';
            });
            var isMoreMenu = options.items.length >= 2 && options.items.every(function (item) { return item && typeof item.onSelect === 'function'; }) && options.items.some(function (item) {
                var title = String(item.title || '').toLowerCase();
                return title.indexOf('якіст') !== -1 || title.indexOf('качеств') !== -1 || title.indexOf('quality') !== -1 || String(item.icon || '').indexOf('sprite-hd') !== -1;
            });
            if ((!isQualityMenu && !isMoreMenu) || values.indexOf('anime4k2') !== -1 || values.indexOf('anime4k-off') !== -1 || values.indexOf('lampa-video-shape') !== -1) return originalShow.apply(this, arguments);
            var patched = Object.assign({}, options);
            patched.items = options.items.slice();
            if (isQualityMenu) patched.items = patched.items.concat([
                { title: 'Anime4K x2', subtitle: 'Реальний WebGL апскейл на GPU', value: 'anime4k2', quality: 'anime4k2', selected: enabled() },
                { title: 'Вимкнути Anime4K', subtitle: 'Стандартне відео Lampa', value: 'anime4k-off', quality: 'anime4k-off', selected: !enabled() }
            ]);
            if (isMoreMenu) patched.items.push({
                title: 'Форма відео',
                template: 'selectbox_icon',
                icon: '<svg><use xlink:href="#sprite-size"></use></svg>',
                value: 'lampa-video-shape',
                onSelect: openVideoShapeMenu
            });
            patched.onSelect = function (item) {
                if (item && item.value === 'anime4k2') {
                    setEnabled(true);
                    enableCurrent();
                    if (Lampa.Select.close) Lampa.Select.close();
                } else if (item && item.value === 'anime4k-off') {
                    setEnabled(false);
                    disableCurrent();
                    if (Lampa.Select.close) Lampa.Select.close();
                } else if (item && item.value === 'lampa-video-shape') {
                    if (Lampa.Select.close) Lampa.Select.close();
                    openVideoShapeMenu();
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
