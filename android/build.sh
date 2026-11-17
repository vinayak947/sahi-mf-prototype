#!/usr/bin/env bash
# Builds the SAHI MF shell APK with plain SDK tools (no Gradle). Output: android/build/SAHI-MF.apk
set -euo pipefail
cd "$(dirname "$0")"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
[ -d "$SDK/platforms" ] || SDK=/opt/homebrew/share/android-commandlinetools
BT="$SDK/build-tools/$(ls "$SDK/build-tools" | sort -V | tail -1)"
JAR="$SDK/platforms/$(ls "$SDK/platforms" | sort -V | tail -1)/android.jar"
KS="$HOME/.android/debug.keystore"
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass android -keypass android \
  -alias androiddebugkey -dname "CN=Android Debug,O=Android,C=US" -keyalg RSA -validity 10000 >/dev/null

rm -rf build && mkdir -p build/gen build/classes build/dex
"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -I "$JAR" --manifest AndroidManifest.xml -o build/unsigned.apk build/res.zip \
  --java build/gen --min-sdk-version 26 --target-sdk-version 36 --version-code 1 --version-name 1.0
javac -nowarn --release 11 -cp "$JAR" -d build/classes $(find src build/gen -name '*.java')
"$BT/d8" --release --lib "$JAR" --min-api 26 --output build/dex $(find build/classes -name '*.class')
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --out build/SAHI-MF.apk build/aligned.apk
echo "Built android/build/SAHI-MF.apk ($(du -h build/SAHI-MF.apk | cut -f1))"
