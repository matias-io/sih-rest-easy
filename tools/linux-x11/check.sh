#!/bin/bash
# Desktop app self-check on a real Linux X11 desktop (Xvfb) inside node:24-bookworm. From the repo root:
#   MSYS_NO_PATHCONV=1 docker run --rm -v "$PWD:/src:ro" node:24-bookworm bash /src/tools/linux-x11/check.sh
# Passes when SMOKE ok is printed and the DIAG bright area matches the xterm at +120+120 (about 540x400).
set -e
apt-get update -qq >/dev/null
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq xvfb x11-xserver-utils xterm libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 libgtk-3-0 libasound2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 libxshmfence1 >/dev/null 2>&1
Xvfb :99 -screen 0 1600x1000x24 >/dev/null 2>&1 &
export DISPLAY=:99; sleep 2
xsetroot -solid '#2a6fdb'                                  # a bright desktop, so black frames can't pass
xterm -geometry 90x30+120+120 -bg white -fg black -e 'sleep 120' &   # a real window on it
sleep 1
git config --global --add safe.directory /src; mkdir -p /app && cd /src && git ls-files -z | tar --null -T - -cf - | (cd /app && tar -xf -)
cd /app && npm ci --no-audit --no-fund >/dev/null 2>&1
python3 /src/tools/linux-x11/inject.py
REST_EASY_SMOKE=1 timeout 60 npx electron . --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader 2>&1 | grep -E "SMOKE|DIAG" || echo "no SMOKE line"
