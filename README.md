# Moon / Snack TV: інтерфейс-плагін для Lampa

Це не форк Lampa. Тут лише мій інтерфейс (Snack TV, шапка, ліве меню, налаштування, Showy online, контраст рядків джерел) як **один плагін**. Саму Lampa беремо з офіційного джерела.

## CDN-посилання плагіна

```
https://cdn.jsdelivr.net/gh/vakdab/Lampa@main/dist/moon-interface.js
```

Свіжа версія без кешу гілки (за хешем коміту, оновлюй хеш після кожного push):

```
https://cdn.jsdelivr.net/gh/vakdab/Lampa@302763e/dist/moon-interface.js
```

Запасні:

```
https://raw.githack.com/vakdab/Lampa/main/dist/moon-interface.js
https://rawcdn.githack.com/vakdab/Lampa/main/dist/moon-interface.js
```

## Як підключити

Lampa → Налаштування → Розширення → Додати плагін → вставити посилання вище → перезапустити Lampa.

## Структура

- `dist/moon-interface.js` — готовий плагін (його віддає CDN)
- `src-modules/` — окремі модулі, з яких він складається
- `build.sh` — збирає `dist/` з `src-modules/` (`./build.sh`)

## Оновлення

Змінюєш файл у `src-modules/`, запускаєш `./build.sh`, коміт і push. jsDelivr кешує гілку до 12 годин; щоб оновити одразу: `https://purge.jsdelivr.net/gh/vakdab/Lampa@main/dist/moon-interface.js`.

Telegram Mini App: `src-modules/snack-telegram.js` вставляється окремо в `<head>` сторінки, де Lampa відкривається в Telegram (як плагін він не потрібен).
