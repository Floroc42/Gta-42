(function () {
  var U = G.utils = {};
  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.damp = function (a, b, k, dt) { return U.lerp(a, b, 1 - Math.exp(-k * dt)); };
  U.rand = function (a, b) { return a + Math.random() * (b - a); };
  U.randInt = function (a, b) { return Math.floor(U.rand(a, b + 1)); };
  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  U.angleDelta = function (a, b) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  U.SpatialHash = function (cell) {
    this.cell = cell; this.map = new Map(); this._stamp = 0;
  };
  U.SpatialHash.prototype = {
    key: function (cx, cz) { return cx + '_' + cz; },
    insert: function (box) {
      var c = this.cell;
      for (var cx = Math.floor(box.minX / c); cx <= Math.floor(box.maxX / c); cx++)
        for (var cz = Math.floor(box.minZ / c); cz <= Math.floor(box.maxZ / c); cz++) {
          var k = this.key(cx, cz), a = this.map.get(k);
          if (!a) { a = []; this.map.set(k, a); }
          a.push(box);
        }
    },
    queryRect: function (minX, minZ, maxX, maxZ, out) {
      out.length = 0;
      var c = this.cell, stamp = (this._stamp = this._stamp + 1);
      for (var cx = Math.floor(minX / c); cx <= Math.floor(maxX / c); cx++)
        for (var cz = Math.floor(minZ / c); cz <= Math.floor(maxZ / c); cz++) {
          var a = this.map.get(this.key(cx, cz));
          if (!a) continue;
          for (var i = 0; i < a.length; i++) {
            var b = a[i];
            if (b._s === stamp) continue;
            b._s = stamp; out.push(b);
          }
        }
      return out;
    }
  };

  U.canvasTex = function (w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  };

  U.noise = function (g, w, h, n, alpha) {
    for (var i = 0; i < n; i++) {
      g.fillStyle = 'rgba(0,0,0,' + (Math.random() * alpha).toFixed(3) + ')';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  };

  U.facadeTextures = function (kind) {
    function drawDay(g, w, h) {
      g.fillStyle = kind === 'modern' ? '#c6ced3' : '#d9d5cc';
      g.fillRect(0, 0, w, h);
      U.noise(g, w, h, 260, 0.06);
      if (kind === 'modern') {
        g.fillStyle = '#8fa0a8';
        for (var fy = 0; fy < 5; fy++) g.fillRect(0, 50 + fy * 34, w, 5);
        for (var fx = 0; fx < 4; fx++) {
          g.fillStyle = '#31404c';
          g.fillRect(10 + fx * 62, 56, 50, 154);
          g.fillStyle = 'rgba(160,200,220,0.25)';
          g.fillRect(10 + fx * 62, 56, 12, 154);
        }
      } else {
        var cols = 6, rows = 5, x0 = 8, y0 = 48, cw = (w - 16) / cols, rh = (212 - y0) / rows;
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
          var x = x0 + c * cw, y = y0 + r * rh;
          g.fillStyle = '#8f887c';
          g.fillRect(x + 3, y + 3, cw - 12, rh - 10);
          g.fillStyle = (c + r) % 5 === 0 ? '#3d4a52' : '#2a333b';
          g.fillRect(x + 5, y + 5, cw - 16, rh - 14);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(x + 5, y + 5, cw - 16, 4);
          if (kind === 'res' && (c * 7 + r * 3) % 4 === 0) {
            g.fillStyle = '#7a5b46';
            g.fillRect(x + 5, y + 5, 5, rh - 14);
            g.fillRect(x + cw - 16, y + 5, 5, rh - 14);
          }
        }
      }
      if (kind === 'shops') {
        g.fillStyle = '#43484e';
        g.fillRect(0, 218, w, h - 218);
        var aw = ['#a83a32', '#2f7a44', '#33619e', '#c8892f'];
        for (var s = 0; s < 8; s++) {
          g.fillStyle = aw[s % aw.length];
          g.fillRect(s * 32, 214, 32, 12);
        }
        g.fillStyle = '#161f28';
        g.fillRect(2, 230, w - 4, 24);
        g.fillStyle = 'rgba(190,220,240,0.25)';
        g.fillRect(8, 232, w - 20, 5);
      }
    }
    function drawNight(g, w, h) {
      g.fillStyle = '#000000';
      g.fillRect(0, 0, w, h);
      if (kind === 'modern') {
        for (var fx = 0; fx < 4; fx++) {
          g.fillStyle = Math.random() < 0.6 ? '#b8d4e8' : '#0a0e12';
          g.fillRect(10 + fx * 62, 56, 50, 154);
        }
      } else {
        var cols = 6, rows = 5, x0 = 8, y0 = 48, cw = (w - 16) / cols, rh = (212 - y0) / rows;
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
          g.fillStyle = Math.random() < 0.62 ? '#ffd489' : '#0a0d10';
          g.fillRect(x0 + c * cw + 5, y0 + r * rh + 5, cw - 16, rh - 14);
        }
      }
      if (kind === 'shops') {
        g.fillStyle = '#ffca6a';
        g.fillRect(2, 230, w - 4, 24);
        var sg = ['#ff6a5a', '#5aff8a', '#5ab4ff'];
        for (var s2 = 0; s2 < 8; s2++) {
          g.fillStyle = sg[s2 % sg.length];
          g.fillRect(s2 * 32 + 8, 220, 16, 8);
        }
      }
    }
    return {
      day: U.canvasTex(256, 256, drawDay),
      night: U.canvasTex(256, 256, drawNight)
    };
  };

  U.roadTexture = function () {
    return U.canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#3b3e41';
      g.fillRect(0, 0, w, h);
      U.noise(g, w, h, 500, 0.1);
      g.fillStyle = '#d8d5c8';
      for (var y = 0; y < h; y += 32) g.fillRect(62, y, 4, 18);
      g.fillStyle = '#b8b4a8';
      g.fillRect(4, 0, 3, h);
      g.fillRect(121, 0, 3, h);
    });
  };

  U.plazaTexture = function () {
    return U.canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#b3afa4';
      g.fillRect(0, 0, w, h);
      U.noise(g, w, h, 200, 0.08);
      g.strokeStyle = 'rgba(70,66,60,0.5)';
      g.lineWidth = 2;
      g.strokeRect(0, 0, 64, 64);
      g.strokeRect(64, 64, 64, 64);
      g.strokeRect(64, 0, 64, 64);
      g.strokeRect(0, 64, 64, 64);
    });
  };

  U.pitchTexture = function () {
    return U.canvasTex(512, 340, function (g, w, h) {
      g.fillStyle = '#2f8a3e';
      g.fillRect(0, 0, w, h);
      for (var i = 0; i < 10; i++) {
        g.fillStyle = i % 2 ? '#2f8a3e' : '#37984a';
        g.fillRect(i * w / 10, 0, w / 10, h);
      }
      g.strokeStyle = '#e8e8e0';
      g.lineWidth = 4;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w / 2, h - 14); g.stroke();
      g.beginPath(); g.arc(w / 2, h / 2, 44, 0, Math.PI * 2); g.stroke();
      g.strokeRect(14, h / 2 - 66, 66, 132);
      g.strokeRect(w - 80, h / 2 - 66, 66, 132);
    });
  };

  U.mergeGeoms = function (geoms) {
    var verts = 0, i;
    for (i = 0; i < geoms.length; i++) verts += geoms[i].attributes.position.count;
    var P = new Float32Array(verts * 3), N = new Float32Array(verts * 3);
    var UV = has(geoms, 'uv') ? new Float32Array(verts * 2) : null;
    var C = has(geoms, 'color') ? new Float32Array(verts * 3) : null;
    var o = 0;
    for (i = 0; i < geoms.length; i++) {
      var g = geoms[i], n = g.attributes.position.count;
      P.set(g.attributes.position.array, o * 3);
      N.set(g.attributes.normal.array, o * 3);
      if (UV && g.attributes.uv) UV.set(g.attributes.uv.array, o * 2);
      if (C && g.attributes.color) C.set(g.attributes.color.array, o * 3);
      o += n;
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    if (UV) out.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    if (C) out.setAttribute('color', new THREE.BufferAttribute(C, 3));
    return out;
    function has(list, name) {
      for (var j = 0; j < list.length; j++) if (list[j].attributes[name]) return true;
      return false;
    }
  };

  U.facadeBox = function (w, h, d, x, y, z, hex, cols) {
    var g = new THREE.BoxGeometry(w, h, d);
    var uv = g.attributes.uv;
    for (var f = 0; f < 6; f++) {
      if (f === 2 || f === 3) {
        for (var i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, 0.5, 0.92);
      } else {
        for (var j = f * 4; j < f * 4 + 4; j++) uv.setXY(j, uv.getX(j) * cols, uv.getY(j) * 0.8);
      }
    }
    var col = new THREE.Color(hex), roof = new THREE.Color(hex).multiplyScalar(0.42);
    var cnt = g.attributes.position.count, carr = new Float32Array(cnt * 3);
    for (var k = 0; k < cnt; k++) {
      var c2 = g.attributes.position.getY(k) > h * 0.49 ? roof : col;
      carr[k * 3] = c2.r; carr[k * 3 + 1] = c2.g; carr[k * 3 + 2] = c2.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(carr, 3));
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
    return g.toNonIndexed();
  };

  U.coloredGeo = function (geo, hex, x, y, z) {
    var c = new THREE.Color(hex);
    var cnt = geo.attributes.position.count, arr = new Float32Array(cnt * 3);
    for (var i = 0; i < cnt; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    if (x || y || z) geo.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
    return geo.toNonIndexed();
  };

  U.colorBox = function (w, h, d, x, y, z, hex) {
    return U.coloredGeo(new THREE.BoxGeometry(w, h, d), hex, x, y, z);
  };
  U.colorCyl = function (rt, rb, h, seg, x, y, z, hex) {
    return U.coloredGeo(new THREE.CylinderGeometry(rt, rb, h, seg), hex, x, y, z);
  };
  U.colorCone = function (r, h, x, y, z, hex) {
    var g = new THREE.ConeGeometry(r, h, 4, 1);
    g.rotateY(Math.PI / 4);
    return U.coloredGeo(g, hex, x, y, z);
  };
})();
