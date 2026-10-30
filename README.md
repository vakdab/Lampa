# Lampa

Все исходники приложения **lampa**, всем желающим прошу до хаты :)

Приветствуется ваши идеи и правки в коде, сделаем вместе приложение еще лучше!

MSX версия тут: https://github.com/yumata/lampa

## Как запустить

Открываем CMD и запускаем команду `npm install`

Затем запускаем команду `npm run start`

Открываем браузер и вводим адрес `http://localhost:3000`

## Документация

В приложении появилась документация, которая будет постоянно обновляться и дополняться. Выполните команду `npm run doc` затем перейдите в папку `build/doc` и откройте файл `index.html`

И техническая документация от ИИ с обновлением раз в неделю [![DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yumata/lampa-source)

## Переход на версию 3.0
В версии 3.0 произошли значительные изменения в структуре проекта и кодовой базе. Пожалуйста, ознакомьтесь с [руководством по миграции](UPGRADE.md), чтобы узнать, как обновить ваше приложение до новой версии.
---

## Про цей репозиторий

Це повний вихідний код Lampa, перенесений з [yumata/lampa-source](https://github.com/yumata/lampa-source) (коміт `3c658ff`), плюс власні модулі vakdab.

**Що всередині**

- `src/` — ядро, інтерфейс, плеєр, сервіси, шаблони, локалізації, стилі
- `plugins/` — усі модулі-плагіни: `collections`, `dlna`, `etor`, `halloween`, `iptv`, `online`, `online_prestige`, `radio`, `record`, `senplayer`, `shots`, `snow`, `tmdb_proxy`, `tracks`, `twolines`, `view_plugin`, `womens-day`
- `public/` — статика (шрифти, іконки, звуки, мови, вендорні бібліотеки)
- `index/` — точка входу для github / tizen / webos / doc
- `docs/` — документація по архітектурі (ru + en)
- `spec/` — тести (vitest)
- `lampa-mobile-apple.js` — зібраний мобільний бандл для Apple-пристроїв з усіма кастомними доповненнями

**Власні модулі**

- `plugins/senplayer` — міст таймкодів у SenPlayer (x-callback-url, 6.1.0+). У бандлі також присутні теми AppleTV AG Native, Snack TV, AniSkip, Smooth Player Size та мобільний фікс навігації.

**Збірка**

```
npm install
npm run start   # dev-сервер на http://localhost:3000
npm run test    # тести
npm run doc     # документація в build/doc
```

**Публікація на GitHub Pages**

Сайт: https://vakdab.github.io/Lampa/ — збирається з цього коду і лежить у гілці `gh-pages` (Pages → branch `gh-pages` / root).

```
GITHUB_TOKEN=<PAT зі scope repo> ./deploy-gh-pages.sh
```

Скрипт робить `pack_github`, додає `custom/lampa-mobile-apple.js` (кастомні патчі: SenPlayer, AppleTV AG Native, Snack TV, AniSkip, Smooth Player Size, мобільний фікс) і пушить результат у `gh-pages`. Щоб віддавати чисту збірку без патчів — прибери виклик `loadCustomLampa()` в `build/site/index.html` перед пушем.
