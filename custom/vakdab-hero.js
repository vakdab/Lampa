(function () {
    'use strict';

    if (window.__vakdabLampaHeroInstalled) return;
    window.__vakdabLampaHeroInstalled = true;

    var STYLE_ID = 'vakdab-lampa-hero-style';
    var HERO_ID = 'vakdab-lampa-hero';
    var lastCard = null;

    function onHome() {
        var route = (window.location.hash || '#main').slice(1).split('?')[0];
        return !route || route === 'main';
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.vakdab-lampa-hero{position:relative;isolation:isolate;height:clamp(230px,42vw,390px);min-height:230px;margin:0 1.5em 1.2em;border-radius:1.35em;overflow:hidden;background:#17191d;color:#fff;box-shadow:0 1em 2.5em rgba(0,0,0,.22);}',
            '.vakdab-lampa-hero[hidden]{display:none!important}',
            '.vakdab-lampa-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 28%;transform:scale(1.015);transition:transform 8s ease;z-index:-2}',
            '.vakdab-lampa-hero:hover .vakdab-lampa-hero__bg{transform:scale(1.07)}',
            '.vakdab-lampa-hero::before{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,7,10,.94) 0%,rgba(5,7,10,.68) 34%,rgba(5,7,10,.12) 100%),linear-gradient(90deg,rgba(5,7,10,.35),transparent 75%);z-index:-1;pointer-events:none}',
            '.vakdab-lampa-hero__content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:.7em;padding:1.25em 1.5em 1.4em;box-sizing:border-box;pointer-events:none}',
            '.vakdab-lampa-hero__eyebrow{display:inline-flex;align-items:center;padding:.38em .8em;border:1px solid rgba(255,255,255,.25);border-radius:99em;background:rgba(255,255,255,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:.85em;font-weight:700;letter-spacing:.08em;text-transform:uppercase}',
            '.vakdab-lampa-hero__title{max-width:90%;font-size:clamp(1.6em,4vw,2.6em);line-height:1.08;font-weight:800;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.65);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}',
            '.vakdab-lampa-hero__meta{font-size:1em;color:rgba(255,255,255,.85);text-shadow:0 1px 8px rgba(0,0,0,.75)}',
            '.vakdab-lampa-hero__watch{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;gap:.55em;min-height:2.8em;margin-top:.25em;padding:0 1.25em;border:0;border-radius:99em;background:#fff;color:#15171a;font:inherit;font-size:1em;font-weight:800;cursor:pointer;box-shadow:0 .45em 1.3em rgba(0,0,0,.3);-webkit-tap-highlight-color:transparent}',
            '.vakdab-lampa-hero__watch:active{transform:scale(.97)}',
            '@media(max-width:600px){.vakdab-lampa-hero{height:clamp(220px,62vw,310px);min-height:220px;margin:0 .9em 1em;border-radius:1.15em}.vakdab-lampa-hero__content{padding:1em 1.1em 1.15em;gap:.55em}.vakdab-lampa-hero__title{font-size:1.65em}}',
            '@media(prefers-reduced-motion:reduce){.vakdab-lampa-hero__bg{transition:none}}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function titleFor(card) {
        var data = card.card_data || {};
        var title = data.title || data.name || card.querySelector('.card__title')?.textContent || '';
        return String(title).trim();
    }

    function imageFor(card) {
        var data = card.card_data || {};
        var image = card.querySelector('.card__img');
        var src = data.backdrop || data.backdrop_path || data.poster || data.img || '';
        if (src && src.charAt(0) === '/') src = 'https://image.tmdb.org/t/p/w1280' + src;
        if (!src && image) src = image.currentSrc || image.src || '';
        if (/img_(load|broken)\.svg/i.test(src)) src = '';
        return src;
    }

    function yearFor(card) {
        var data = card.card_data || {};
        var date = data.release_date || data.first_air_date || '';
        return String(date).slice(0, 4);
    }

    function openCard(card) {
        if (!card || !window.$) return;
        window.$(card).trigger('hover:enter');
    }

    function createHero() {
        if (!onHome()) return;
        var app = document.getElementById('app');
        if (!app) return;
        var rows = app.querySelectorAll('.items-line');
        var firstRow = Array.prototype.find.call(rows, function (row) {
            return !row.closest('.vakdab-lampa-hero') && row.getClientRects().length > 0 && row.querySelector('.card.card--loaded');
        });
        if (!firstRow) return;
        var card = firstRow.querySelector('.card.card--loaded');
        if (!card) return;
        var image = imageFor(card);
        var title = titleFor(card);
        if (!image || !title) return;

        addStyles();
        var hero = document.getElementById(HERO_ID);
        if (!hero) {
            hero = document.createElement('section');
            hero.id = HERO_ID;
            hero.className = 'vakdab-lampa-hero';
            hero.setAttribute('aria-label', 'Рекомендовано');
            hero.innerHTML = '<div class="vakdab-lampa-hero__bg"></div><div class="vakdab-lampa-hero__content"><span class="vakdab-lampa-hero__eyebrow">Рекомендовано</span><div class="vakdab-lampa-hero__title"></div><div class="vakdab-lampa-hero__meta"></div><button class="vakdab-lampa-hero__watch" type="button"><span aria-hidden="true">▶</span><span>Дивитися</span></button></div>';
            hero.querySelector('.vakdab-lampa-hero__watch').addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                openCard(lastCard);
            });
        }
        var year = yearFor(card);
        var rating = (card.card_data || {}).vote_average;
        var meta = [];
        if (year) meta.push(year);
        if (rating) meta.push('★ ' + Number(rating).toFixed(1));
        var metaText = meta.join(' · ');
        var dataKey = image + '|' + title + '|' + metaText;
        var needsMove = hero.parentNode !== firstRow.parentNode || hero.nextElementSibling !== firstRow;
        if (hero.__vakdabDataKey === dataKey && !needsMove) {
            hero.hidden = false;
            lastCard = card;
            return;
        }
        hero.querySelector('.vakdab-lampa-hero__bg').style.backgroundImage = 'url("' + image.replace(/["\\]/g, '') + '")';
        hero.querySelector('.vakdab-lampa-hero__title').textContent = title;
        hero.querySelector('.vakdab-lampa-hero__meta').textContent = metaText;
        hero.hidden = false;
        lastCard = card;
        hero.__vakdabDataKey = dataKey;
        if (hero.parentNode !== firstRow.parentNode || hero.nextElementSibling !== firstRow) {
            firstRow.parentNode.insertBefore(hero, firstRow);
        }
    }

    function syncRoute() {
        var hero = document.getElementById(HERO_ID);
        if (hero) hero.hidden = !onHome();
        if (onHome()) createHero();
    }

    function install() {
        var app = document.getElementById('app');
        if (!app) {
            setTimeout(install, 500);
            return;
        }
        var observer = new MutationObserver(function () {
            if (onHome()) createHero();
        });
        observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
        window.addEventListener('hashchange', syncRoute);
        setInterval(syncRoute, 1500);
        syncRoute();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
})();
