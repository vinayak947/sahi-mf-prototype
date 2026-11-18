#!/usr/bin/env bash
# Live prototype on an Android phone: `npm run phone`
# Connects the phone to this Mac over USB, installs/updates the SAHI MF app,
# opens it and starts the dev server. Save a file and the phone updates.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8443}"
APK=android/build/SAHI-MF.apk
PKG=com.sahi.mf.proto

command -v adb >/dev/null || { echo "adb not found. Install: brew install --cask android-platform-tools"; exit 1; }
if ! adb get-state >/dev/null 2>&1; then
  echo "No phone found. Plug it in by USB, turn on USB debugging, and accept the prompt on the phone."; exit 1
fi

# Rebuild the APK only if its sources changed.
if [ ! -f "$APK" ] || [ -n "$(find android/src android/res android/AndroidManifest.xml -newer "$APK" 2>/dev/null)" ]; then
  bash android/build.sh
fi
# Install if missing or older than the local build.
if ! adb shell pm path "$PKG" >/dev/null 2>&1 || [ "$APK" -nt android/build/.installed ]; then
  adb install -r "$APK" >/dev/null && touch android/build/.installed && echo "SAHI MF installed on $(adb shell getprop ro.product.model | tr -d '\r')"
fi

adb reverse tcp:"$PORT" tcp:"$PORT" >/dev/null
( sleep 3; adb shell am start -n "$PKG/com.sahi.mf.MainActivity" >/dev/null ) &
echo "Opening SAHI MF on the phone. Save any file and it updates live. Ctrl+C to stop."
PORT="$PORT" exec npx vite
