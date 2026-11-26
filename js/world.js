(function () {
  var U = G.utils;
  var KF = [
    { h: 0,  sky: 0x070b18, fog: 0x0a0f1c, sun: 0.0, hemi: 0.12, amb: 0.18, sc: 0x223355 },
    { h: 5,  sky: 0x111a30, fog: 0x151d33, sun: 0.0, hemi: 0.16, amb: 0.2,  sc: 0x334466 },
    { h: 7,  sky: 0xd99a63, fog: 0xc9a67f, sun: 0.55, hemi: 0.4, amb: 0.3,  sc: 0xffb070 },
    { h: 10, sky: 0x87b5e5, fog: 0xa9c2d8, sun: 1.05, hemi: 0.55, amb: 0.38, sc: 0xfff2dd },
    { h: 15, sky: 0x87b5e5, fog: 0xa9c2d8, sun: 1.05, hemi: 0.55, amb: 0.38, sc: 0xfff2dd },
    { h: 18, sky: 0xe0905a, fog: 0xcf9a70, sun: 0.6, hemi: 0.4, amb: 0.3,  sc: 0xffa068 },
    { h: 20, sky: 0x232c48, fog: 0x262f4a, sun: 0.05, hemi: 0.2, amb: 0.2,  sc: 0x405077 },
    { h: 22, sky: 0x070b18, fog: 0x0a0f1c, sun: 0.0, hemi: 0.12, amb: 0.16, sc: 0x223355 },
    { h: 24, sky: 0x070b18, fog: 0x0a0f1c, sun: 0.0, hemi: 0.12, amb: 0.16, sc: 0x223355 }
  ];

  G.world = {
    tod: 10.5,
    night: 0,
    weather: 'clear',
    fogMul: 1, sunMul: 1, rainAmt: 0,

    init: function (scene, renderer, q) {
      this.scene = scene;
      this.renderer = renderer;
      this.tod = G.save.data.tod || 10.5;
      this.fog = new THREE.Fog(0xa9c2d8, 60, q.fogFar);
      scene.fog = this.fog;
      scene.background = new THREE.Color(0x87b5e5);

      this.sun = new THREE.DirectionalLight(0xfff2dd, 1);
      this.sun.position.set(120, 200, 60);
      sun = this.sun;
      scene.add(sun);
      scene.add(sun.target);
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 500;
      sun.shadow.camera.left = -110;
      sun.shadow.camera.right = 110;
      sun.shadow.camera.top = 110;
      sun.shadow.camera.bottom = -110;
      sun.shadow.bias = -0.0015;
      sun.castShadow = q.shadows;

      this.hemi = new THREE.HemisphereLight(0xbdd3e8, 0x5a5245, 0.5);
      scene.add(this.hemi);
      this.amb = new THREE.AmbientLight(0xffffff, 0.35);
      scene.add(this.amb);

      var starGeo = new THREE.BufferGeometry();
      var sp = new Float32Array(400 * 3);
      for (var i = 0; i < 400; i++) {
        var a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.1;
        sp[i * 3] = Math.cos(a) * Math.cos(e) * 700;
        sp[i * 3 + 1] = Math.sin(e) * 700;
        sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 700;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: 0xdde6ff, size: 1.6, transparent: true, opacity: 0, depthWrite: false, fog: false
      }));
      this.stars.frustumCulled = false;
      scene.add(this.stars);

      this.rainMax = 1400;
      var rGeo = new THREE.BufferGeometry();
      this.rainPos = new Float32Array(this.rainMax * 3);
      for (var r = 0; r < this.rainMax; r++) {
        this.rainPos[r * 3] = U.rand(-60, 60);
        this.rainPos[r * 3 + 1] = U.rand(0, 50);
        this.rainPos[r * 3 + 2] = U.rand(-60, 60);
      }
      rGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
      this.rain = new THREE.Points(rGeo, new THREE.PointsMaterial({
        color: 0xaac4dd, size: 0.12, transparent: true, opacity: 0.55, depthWrite: false
      }));
      this.rain.frustumCulled = false;
      this.rain.visible = false;
      scene.add(this.rain);
      this.setWeather(G.save.data.weather || 'clear', true);
    },

    setWeather: function (w, instant) {
      this.weather = w;
      this.wTimer = U.rand(90, 220);
      this.targets = w === 'rain' ? { fogMul: 0.5, sunMul: 0.35, rain: 1 }
        : w === 'clouds' ? { fogMul: 0.78, sunMul: 0.65, rain: 0 }
        : { fogMul: 1, sunMul: 1, rain: 0 };
      if (instant) {
        this.fogMul = this.targets.fogMul;
        this.sunMul = this.targets.sunMul;
        this.rainAmt = this.targets.rain;
      }
      if (G.ui) G.ui.setWeather(w);
    },

    shadowOn: function (on) {
      this.sun.castShadow = on;
      this.scene.traverse(function (o) {
        if (o.material) {
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function (m) { m.needsUpdate = true; });
        }
      });
    },

    update: function (dt, camPos) {
      var C = G.CONFIG.world;
      this.tod = (this.tod + dt / C.dayLength * 24) % 24;
      G.save.data.tod = this.tod;
      var h = this.tod;

      var a = KF[0], b = KF[KF.length - 1];
      for (var i = 0; i < KF.length - 1; i++) {
        if (h >= KF[i].h && h <= KF[i + 1].h) { a = KF[i]; b = KF[i + 1]; break; }
      }
      var f = (h - a.h) / Math.max(0.001, b.h - a.h);
      var skyC = new THREE.Color(a.sky).lerp(new THREE.Color(b.sky), f);
      var fogC = new THREE.Color(a.fog).lerp(new THREE.Color(b.fog), f);
      var sc = new THREE.Color(a.sc).lerp(new THREE.Color(b.sc), f);

      this.wTimer -= dt;
      if (this.wTimer <= 0) {
        var next;
        if (this.weather === 'clear') next = Math.random() < 0.6 ? 'clear' : (Math.random() < 0.75 ? 'clouds' : 'rain');
        else if (this.weather === 'clouds') next = Math.random() < 0.4 ? 'clear' : (Math.random() < 0.6 ? 'clouds' : 'rain');
        else next = Math.random() < 0.5 ? 'clouds' : (Math.random() < 0.5 ? 'rain' : 'clear');
        this.setWeather(next);
      }
      this.fogMul = U.damp(this.fogMul, this.targets.fogMul, 0.4, dt);
      this.sunMul = U.damp(this.sunMul, this.targets.sunMul, 0.4, dt);
      this.rainAmt = U.damp(this.rainAmt, this.targets.rain, 0.5, dt);

      var q = G.quality || G.CONFIG.qualityPresets.moyen;
      this.fog.far = q.fogFar * this.fogMul;
      this.fog.near = this.fog.far * 0.12;

      var elev = Math.sin((h - 6) / 12 * Math.PI);
      var az = (h / 24) * Math.PI * 2 + Math.PI;
      var dir = new THREE.Vector3(Math.cos(az), Math.max(0.06, elev), Math.sin(az)).normalize();
      this.sun.position.copy(camPos).addScaledVector(dir, 260);
      this.sun.target.position.copy(camPos);
      this.sun.intensity = a.sun + (b.sun - a.sun) * f;
      this.sun.intensity *= this.sunMul;
      this.sun.color.copy(sc);
      this.hemi.intensity = a.hemi + (b.hemi - a.hemi) * f;
      this.amb.intensity = a.amb + (b.amb - a.amb) * f;
      this.scene.background.copy(skyC);
      this.fog.color.copy(fogC);

      var n = U.clamp(1 - elev / 0.18, 0, 1);
      this.night = n;
      this.stars.material.opacity = n * 0.9;
      this.stars.position.set(camPos.x, 0, camPos.z);

      G.city.setNight(n);

      var raining = this.rainAmt > 0.02;
      this.rain.visible = raining;
      if (G.audio) G.audio.rain(raining ? this.rainAmt : 0);
      if (raining) {
        this.rain.material.opacity = 0.5 * this.rainAmt;
        this.rain.geometry.setDrawRange(0, Math.floor(this.rainMax * this.rainAmt * (G.quality ? G.quality.rain / 1400 : 0.6)));
        var p = this.rainPos, box = 120, time = performance.now() / 1000;
        for (var j = 0; j < p.length; j += 3) {
          p[j + 1] -= dt * 24;
          if (p[j + 1] < 0) {
            p[j + 1] += 50;
            p[j] = U.rand(-box / 2, box / 2);
            p[j + 2] = U.rand(-box / 2, box / 2);
          }
        }
        this.rain.geometry.attributes.position.needsUpdate = true;
        this.rain.position.set(Math.round(camPos.x / box) * box, 0, Math.round(camPos.z / box) * box);
      }
      G.save.data.weather = this.weather;
    }
  };
  var sun;
})();
