(function () {
  'use strict';
  var M = {"canvas_w": 426, "canvas_h": 180, "ground_y": 148, "player_x": 54, "ride_off": 45, "road_hi": "F080A8", "road": "1A181E", "road_dark": "0D0C10", "road_line": "FAF4E2", "sky_top": "783E94"};
  var names = ['sky', 'clouds', 'city', 'trees', 'title', 'loading', 'version', 'rider0', 'rider1', 'rider2', 'rider3'];
  var img = {}, loaded = 0;
  var cv = document.createElement('canvas');
  cv.id = 'ot-splash';
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647;' +
    'pointer-events:none;image-rendering:pixelated;background:#' + M.sky_top;
  (document.body || document.documentElement).appendChild(cv);
  var ctx = cv.getContext('2d');
  var t0 = performance.now(), progress = 0, target = 0, completing = false;
  var dissolveStart = 0, finished = false, thr = null, cols = 0, rows = 0, CELL = 10, oy = 0;
  // масштаб: в альбоме сцена по высоте, на узком экране — по ширине (300 ед.), по центру
  function scaleK() { return Math.min(cv.height / M.canvas_h, cv.width / 300); }

  names.forEach(function (n) {
    var im = new Image();
    im.onload = function () { loaded++; };
    im.onerror = function () { loaded++; img[n] = null; };   // без картинки заставка не встаёт
    im.src = 'splash/' + n + '.png';
    img[n] = im;
  });

  // клетки рассыпания: волна слева направо с шумом (псевдослучайно, но детерминированно)
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function layout() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(window.innerWidth * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
    ctx.imageSmoothingEnabled = false;
    var k = scaleK();
    cols = Math.ceil(cv.width / (k * CELL)) + 1;
    rows = Math.ceil(cv.height / (k * CELL)) + 1;
    thr = new Float32Array(cols * rows);
    for (var cy = 0; cy < rows; cy++)
      for (var cx = 0; cx < cols; cx++)
        thr[cy * cols + cx] = (cx / cols) * 0.62 + rnd(cy * cols + cx) * 0.38;
  }
  window.addEventListener('resize', layout);
  layout();

  function layer(b, speed, t, k, shift) {
    var off = (speed * t) % M.canvas_w, x = -off * k + shift;
    for (var i = 0; i < 2; i++)
      ctx.drawImage(b, Math.round(x + i * M.canvas_w * k), Math.round(oy), Math.round(M.canvas_w * k), Math.round(M.canvas_h * k));
  }
  function rect(k, shift, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(shift + x * k, y * k + oy, w * k, h * k);
  }

  function frame(now) {
    if (finished) return;
    if (loaded < names.length) { requestAnimationFrame(frame); return; }
    var t = (now - t0) / 1000, w = cv.width, h = cv.height;
    var k = scaleK(), shift = -(M.canvas_w - w / k) / 2 * k, run = 78;
    oy = (h - M.canvas_h * k) / 2;

    if (completing && !dissolveStart && progress > 0.985) dissolveStart = now;
    var dissolve = 0;
    if (dissolveStart) {
      dissolve = (now - dissolveStart) / 1000 / 0.8;
      if (dissolve >= 1) { finished = true; cv.remove(); return; }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#' + M.sky_top;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img.sky, Math.round(shift), Math.round(oy), Math.round(M.canvas_w * k), Math.round(M.canvas_h * k));
    layer(img.clouds, run * 0.10, t, k, shift);
    layer(img.city, run * 0.28, t, k, shift);
    layer(img.trees, run * 0.62, t, k, shift);

    var gy = M.ground_y;
    rect(k, shift, 0, gy - 3, M.canvas_w, 3, '#' + M.road_hi);
    rect(k, shift, 0, gy, M.canvas_w, M.canvas_h - gy, '#' + M.road);
    rect(k, shift, 0, gy + 14, M.canvas_w, M.canvas_h - gy - 14, '#' + M.road_dark);
    var dashOff = (run * t) % 32;
    for (var x = -32; x < M.canvas_w + 32; x += 32)
      rect(k, shift, x - dashOff, gy + 6, 14, 2, '#' + M.road_line);

    ctx.fillStyle = '#' + M.road_dark;            // низ экрана под дорогой (узкий экран)
    ctx.fillRect(0, oy + M.canvas_h * k - 1, w, h);
    var r = img['rider' + (Math.floor(t * 14) % 4)];
    var bob = Math.sin(t * 15) * 0.5;
    ctx.drawImage(r, Math.round(shift + (M.player_x - 1) * k),
      Math.round((gy - M.ride_off + bob) * k + oy), Math.round(r.width * k), Math.round(r.height * k));

    var ti = img.title, tw = ti.width * k, ty = (10 + Math.sin(t * 4.2) * 2) * k + oy;
    ctx.drawImage(ti, Math.round((w - tw) / 2), Math.round(ty), Math.round(tw), Math.round(ti.height * k));

    if (!completing) target = 0.92 * (1 - Math.exp(-t / 3.4));
    progress += (target - progress) * (completing ? 0.3 : 0.08);
    var barW = 150, bx = M.canvas_w / 2 - barW / 2, by = 168;
    rect(k, shift, bx - 2, by - 2, barW + 4, 10, '#fff');
    rect(k, shift, bx - 1, by - 1, barW + 2, 8, '#1E1430');
    var steps = Math.floor(barW * progress / 6);
    for (var i = 0; i < steps; i++) rect(k, shift, bx + i * 6, by, 5, 6, i % 2 ? '#F8A02A' : '#FCD63C');
    if (!completing) {
      var lo = img.loading, lw = lo.width * k;
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.6));
      ctx.drawImage(lo, Math.round((w - lw) / 2), Math.round(157 * k + oy), Math.round(lw), Math.round(lo.height * k));
      ctx.globalAlpha = 1;
    }
    var vi = img.version;                     // номер версии в правом верхнем углу
    if (vi && vi.width > 1) {
      ctx.drawImage(vi, Math.round(w - vi.width * k - 12 * k), Math.round(5 * k + oy),
        Math.round(vi.width * k), Math.round(vi.height * k));
    }

    if (dissolve > 0) {                       // клетки открываются, пока игра под ними
      for (var cy = 0; cy < rows; cy++)
        for (var cx = 0; cx < cols; cx++) {
          var th = thr[cy * cols + cx];
          if (th <= dissolve) {
            ctx.clearRect(cx * CELL * k, cy * CELL * k, CELL * k + 1, CELL * k + 1);
            if (th > dissolve - 0.06) {
              ctx.fillStyle = '#FFE896';
              ctx.fillRect((cx * CELL + 3) * k, (cy * CELL + 3) * k, 4 * k, 4 * k);
            }
          }
        }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // игра сообщает о готовности из main.py
  window.otReady = function () { completing = true; target = 1; };
  setTimeout(window.otReady, 120000);          // страховка: заставка не должна висеть вечно
})();
