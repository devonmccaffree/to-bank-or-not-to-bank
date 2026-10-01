#!/bin/sh
set -e
cd "$(dirname "$0")/.."

if [ ! -f ios/App/App.xcodeproj/project.pbxproj ]; then
  rm -rf ios
  npx cap add ios
fi

npx cap sync ios
npx cap open ios
