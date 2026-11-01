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
- `lampa-mobile-apple.js` — збережений у репозиторії старий кастомний бандл; публічна збірка його не підключає

**Власні модулі**

- `plugins/senplayer` та інші власні файли збережені у репозиторії, але не активуються в публічній збірці. Опублікований інтерфейс відповідає upstream `yumata/lampa-source`; штатне ліве бургер-меню Lampa збережено.

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

Скрипт збирає upstream-код, додає лише потрібне для GitHub Pages та iOS (PWA-метадані й safe-area стилі), після чого пушить результат у `gh-pages`. Кастомний `lampa-mobile-apple.js` не завантажується; ліве бургер-меню працює штатно з ядра Lampa.
