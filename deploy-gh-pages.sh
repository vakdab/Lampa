#!/usr/bin/env bash
# Збірка Lampa і публікація на https://vakdab.github.io/Lampa/
# Потрібен GITHUB_TOKEN зі scope repo:  GITHUB_TOKEN=... ./deploy-gh-pages.sh
set -euo pipefail

cd "$(dirname "$0")"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Немає GITHUB_TOKEN (потрібен PAT зі scope repo)" >&2
  exit 1
fi

[ -d node_modules ] || npm install --no-audit --no-fund

# окремі кроки: merge віддає файл асинхронно, тому з паузами
cp gulpfile.js gulpfile.local.js
printf '\nexports.merge_task = merge;\nexports.lang_task = lang_task;\nexports.sass_task = sass_task;\n' >> gulpfile.local.js

npx gulp --gulpfile gulpfile.local.js lang_task
npx gulp --gulpfile gulpfile.local.js sass_task
npx gulp --gulpfile gulpfile.local.js merge_task
sleep 15
npx gulp pack_github

rm -rf build/site
mkdir -p build/site
cp -r build/github/lampa/. build/site/
rm -f build/site/Dockerfile build/site/README.md build/site/SECURITY.md build/site/LICENSE
mkdir -p build/site/custom
cp lampa-mobile-apple.js build/site/custom/
touch build/site/.nojekyll

python3 - << 'PY'
p = 'build/site/index.html'
s = open(p, encoding='utf-8').read()
old = """        function loadCurrentLampa() {
            putScript('app.min.js?v=' + cache_version, function () {})
        }"""
new = """        function loadCustomLampa() {
            putScript('custom/lampa-mobile-apple.js?v=' + cache_version, function () {})
        }

        function loadCurrentLampa() {
            putScript('app.min.js?v=' + cache_version, function () { loadCustomLampa() })
        }"""
if old in s:
    open(p, 'w', encoding='utf-8').write(s.replace(old, new))
PY

cd build/site
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name=vakdab -c user.email=3.0796115e+vakdab@users.noreply.github.com commit -q -m "Deploy Lampa web build"
git push -f "https://${GITHUB_TOKEN}@github.com/vakdab/Lampa.git" gh-pages
echo "Готово: https://vakdab.github.io/Lampa/"
