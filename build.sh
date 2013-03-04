#!/bin/sh

version=`echo "process.stdout.write(JSON.parse(require('fs').readFileSync('package.json')).version);" | node`
dir="dist/$version"

echo "Building (v$version)..."
grunt

echo "Gzipping..."
gzip -9 -f -c "$dir/puredom.js" > "$dir/puredom.js.gz"
gzip -9 -f -c "$dir/puredom.light.js" > "$dir/puredom.light.js.gz"

echo "Zipping..."
zip -9 "$dir/puredom.zip" "$dir/puredom.js"
zip -9 "$dir/puredom.light.zip" "$dir/puredom.light.js"

echo 'Done.'