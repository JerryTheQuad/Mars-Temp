# Mars Temp

Небольшое веб-приложение, которое показывает температуру на Марсе на основе данных NASA Mars Explorer.

## Бесплатный хостинг

### Вариант 1 (самый простой): Cloudflare Workers + Assets (free tier)

Этот репозиторий уже подготовлен под `wrangler deploy`:
- `wrangler.jsonc` описывает worker и директорию статических файлов.
- `src/worker.js` отдаёт статику и API `/api/temperature`.

Команды деплоя:

```bash
npm i -g wrangler
wrangler login
wrangler deploy
```

После деплоя получите публичный URL вида `https://mars-temp.<subdomain>.workers.dev`.

### Вариант 2: Cloudflare Pages + Functions (альтернатива)

Можно также использовать `functions/api/temperature.js` в Pages. Но если вы запускаете именно `wrangler deploy`, используйте вариант 1 выше.

## Как работает защита от слишком частых обновлений

Схема реализована в `src/worker.js` (и дублируется в `functions/api/temperature.js` для Pages):

- Фронтенд (`app.js`) запрашивает **только** `/api/temperature`, а не NASA напрямую.
- Серверный API запрашивает NASA (`Tair` + `Tsurf`) и складывает ответ в edge-cache.
- TTL кэша: `3600` секунд (1 час).
- Все пользователи в течение часа получают кэшированный ответ; повторный запрос не дёргает NASA.

Итог:
- Нельзя «накликать» обновления и устроить частый опрос NASA.
- Даже если один пользователь спамит кнопку, источник обновится не чаще 1 раза в час.

## Локальный запуск

```bash
python3 -m http.server 4173
```
