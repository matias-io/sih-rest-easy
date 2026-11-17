# Test-only: inside the container copy, log the captured screen before the shader runs (used by check.sh).
p = '/app/web/js/main.js'
s = open(p).read()
a = "      const source = await captureDesktop();"
diag = (
    "\n      { const cv = document.createElement('canvas'); cv.width = 80; cv.height = 50; const x = cv.getContext('2d');"
    " x.drawImage(source, 0, 0, 80, 50); const d = x.getImageData(0, 0, 80, 50).data; let r = 0, g = 0, b = 0;"
    " for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4;"
    " console.error('DIAG capture ' + (source.width || source.videoWidth) + 'x' + (source.height || source.videoHeight)"
    " + ' avg rgb ' + Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n)"
    " + ' webgl ' + !!document.createElement('canvas').getContext('webgl'));"
    " let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let i = 0; i < n; i++) { if (d[i * 4] > 200 && d[i * 4 + 1] > 200 && d[i * 4 + 2] > 200) { const px = i % 80, py = Math.floor(i / 80); x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); } }"
    " const sx = (source.width || source.videoWidth) / 80, sy = (source.height || source.videoHeight) / 50;"
    " console.error('DIAG bright area x ' + Math.round(x0 * sx) + '-' + Math.round((x1 + 1) * sx) + ' y ' + Math.round(y0 * sy) + '-' + Math.round((y1 + 1) * sy)); }"
)
assert s.count(a) == 1
open(p, 'w').write(s.replace(a, a + diag))
print('diag injected')
