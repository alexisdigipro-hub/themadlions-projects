#!/usr/bin/env bash
# After `npx cap add android`: what TML Chat needs on top of Capacitor's template.
set -euo pipefail
cd "$(dirname "$0")"
RES=android/app/src/main/res
MANIFEST=android/app/src/main/AndroidManifest.xml

# the camera and the microphone, for calls, video calls and voice messages
sed -i 's|</manifest>|    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n</manifest>|' "$MANIFEST"

# TML Chat's own icon at every density (the adaptive icon of the template is dropped)
for d in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  n=${d%%:*}; s=${d##*:}
  out="$RES/mipmap-$n/ic_launcher.png"
  if command -v convert >/dev/null; then convert ../public/icons/chat-glass-512.png -resize "${s}x${s}" "$out"; else cp ../public/icons/chat-glass-512.png "$out"; fi
  cp "$out" "$RES/mipmap-$n/ic_launcher_round.png"
done
rm -rf "$RES/mipmap-anydpi-v26"

# the bars above and below in the chat's dark colour
sed -i 's|<item name="windowActionBar">false</item>|<item name="windowActionBar">false</item>\n        <item name="android:statusBarColor">#0b1018</item>\n        <item name="android:navigationBarColor">#0b1018</item>|' "$RES/values/styles.xml"

grep -q RECORD_AUDIO "$MANIFEST"
echo "prepared"
