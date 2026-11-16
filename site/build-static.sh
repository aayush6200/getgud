#!/bin/sh
# Builds the GitHub Pages version of the site into ../docs.  ./build-static.sh
set -e
cd "$(dirname "$0")"; OUT=../docs
rm -rf "$OUT"; mkdir -p "$OUT/css" "$OUT/js"
cp public/css/site.css "$OUT/css/"; cp shared/gg.js public/js/app.js static/spa.js "$OUT/js/"
{ echo 'window.GGViews=(function(){var module={exports:{}},exports=module.exports;var require=function(){return window.GG};'; cat views.js; echo 'return module.exports;})();'; } > "$OUT/js/views.js"
cat > "$OUT/index.html" <<'HTML'
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GetGud · Mental health support for esports athletes</title>
<meta name="description" content="GetGud matches esports athletes with therapists and mental performance coaches who understand competitive play.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&display=swap">
<link rel="stylesheet" href="css/site.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230B7D72'/%3E%3Crect x='6' y='12' width='20' height='8' rx='4' fill='%23fff'/%3E%3Crect x='6' y='12' width='13' height='8' rx='4' fill='%23F2BE55'/%3E%3C/svg%3E">
<style>#root{display:flex;flex-direction:column;min-height:100vh;flex:1}</style>
</head><body>
<div id="root"></div>
<noscript><p style="padding:24px">GetGud needs JavaScript turned on.</p></noscript>
<script>window.GG_STATIC=true</script>
<script src="js/gg.js"></script><script src="js/views.js"></script><script src="js/app.js"></script><script src="js/spa.js"></script>
</body></html>
HTML
cp "$OUT/index.html" "$OUT/404.html"; touch "$OUT/.nojekyll"
echo "Built $OUT"
