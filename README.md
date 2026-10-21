# Lampa Combined Fix

Єдиний об’єднаний плагін для Lampa. Усі функції залишаються в одному файлі `lampa-combined-fix.js`.

## Що містить файл

- мобільні виправлення інтерфейсу та safe-area;
- керування розміром відео;
- Cinema 21:9 як режим за замовчуванням;
- AniSkip для ручного пропуску опенінга;
- покращення відео через Anime4K-WebGPU;
- автоматичний fallback на штатне відео, якщо WebGPU недоступний або повертає помилку;
- Prismak: онлайн-джерела (UAKino, Eneyida та інші), кнопка «Prismak» на сторінці фільму/серіалу (з'являється в меню «Дивитися»).

Старий WebGL Anime4K із цього об’єднаного файлу прибраний. Окремий новий плагін не потрібен.

## Встановлення

Додавайте тільки цей URL через **Розширення → Додати плагін**:

```text
https://cdn.jsdelivr.net/gh/vakdab/Lampa@main/lampa-combined-fix.js
```

Запасний URL:

```text
https://fastly.jsdelivr.net/gh/vakdab/Lampa@main/lampa-combined-fix.js
```

Після оновлення повністю закрийте й відкрийте Lampa: плагін кешується у пам'яті застосунку.
Плагін автоматично визначає пристрій: на iPhone/Android використовується мобільний Apple-інтерфейс, а на Smart TV/Android TV — TV-інтерфейс. Встановлюйте тільки цей універсальний файл.

## Окремий Prismak із онлайн-джерелами

Це окрема копія вбудованого в TV-версію Prismak Online Sources v2.9.5. Він додає джерела UAKino, Eneyida та інші онлайн-балансери без встановлення TV-оболонки:

```text
https://cdn.jsdelivr.net/gh/vakdab/Lampa@main/lampa-prismak.js
```

Якщо вже встановлений `lampa-combined-fix.js`, окремий Prismak додавати не потрібно — він уже вбудований.

## Окремий AniSkip

AniSkip також доступний окремим плагіном для ручного пропуску опенінга, ендінга та рекапа:

```text
https://cdn.jsdelivr.net/gh/vakdab/Lampa@main/lampa-aniskip.js
```

Зафіксована версія:

```text
https://cdn.jsdelivr.net/gh/vakdab/Lampa@25c99eba66678967e55d3781c5dd65743831e478/lampa-aniskip.js
```

Він визначає назву аніме та епізод, отримує таймкоди з AniSkip і показує кнопку тільки під час відповідного сегмента. Якщо вже встановлений `lampa-combined-fix.js` або мобільний Apple-плагін, окремий AniSkip додавати не потрібно — він уже вбудований.

На телефонах Apple-стиль також увімкнений, але використовується адаптивна мобільна гілка без TV-розкладки. На Android TV, Smart TV та інших TV-пристроях залишається повний TV-режим.


## Мобільна Apple-версія
Якщо потрібна тільки мобільна версія Apple-інтерфейсу для телефона, встановлюйте окремий файл `lampa-mobile-apple.js`:

```text
https://cdn.jsdelivr.net/gh/vakdab/Lampa@main/lampa-mobile-apple.js
```

Зафіксована версія мобільного плагіна:

```text
https://cdn.jsdelivr.net/gh/vakdab/Lampa@dc240d1baafc2c7bdf032a797f84be56edd31f87/lampa-mobile-apple.js
```

Для автоматичного вибору режиму на одному посиланні використовуйте `lampa-combined-fix.js`: він сам вибирає мобільну або TV-гілку.

```text
https://cdn.jsdelivr.net/gh/vakdab/Lampa@main/lampa-combined-fix.js
```

Не встановлюйте `lampa-mobile-apple.js` одночасно з універсальним файлом: залиште тільки один плагін.

Не додавайте окремо плагін Prismak: він уже вбудований у цей файл.

Не додавайте одночасно окремі `player-size.js`, `lampa-anime4k.js` або `anime4k-upscale.js`, інакше меню може дублюватися.

## Покращення відео

У меню якості плеєра з’явиться один пункт:

```text
Покращення відео: Увімкнути / Вимкнути
```

Обробка виконується на GPU пристрою через WebGPU та Anime4K CNNx2M. Відео й звук залишаються штатними для Lampa.

WebGPU офіційно доступний у Safari 26 та iOS 26+, але фактична підтримка залежить від моделі iPhone і оболонки Lampa. Якщо WebGPU не працює, плеєр автоматично повертає звичайне відео без чорного екрана.

## Джерело

Вбудована бібліотека [Anime4K-WebGPU](https://github.com/Anime4KWebBoost/Anime4K-WebGPU) розповсюджується за MIT License.
