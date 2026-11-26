(function () {
  var U = G.utils;
  var el = function (id) { return document.getElementById(id); };

  G.ui = {
    toasts: [],
    camMode: 0,

    init: function () {
      var s = G.save.data;
      el('qualitySelect').value = s.settings.quality;
      el('volumeRange').value = s.settings.volume;
      this.bindMenu();
      this.bindTouch();
      this.miniCtx = el('minimap').getContext('2d');
      this.mapCtx = el('mapCanvas').getContext('2d');
      if (G.input.isTouch) document.body.classList.add('touch');
    },

    bindMenu: function () {
      var self = this;
      el('btnPlay').addEventListener('click', function () { G.game.start(false); });
      el('btnNew').addEventListener('click', function () { G.game.start(true); });
      el('btnSettings').addEventListener('click', function () { self.showScreen('settings'); self._settingsFrom = 'menu'; });
      el('btnHelp').addEventListener('click', function () { self.showScreen('help'); self._helpFrom = 'menu'; });
      el('btnResume').addEventListener('click', function () { G.game.resume(); });
      el('btnPauseSettings').addEventListener('click', function () { self.showScreen('settings'); self._settingsFrom = 'pause'; });
      el('btnPauseMap').addEventListener('click', function () { self.showScreen('bigmap'); self._mapFrom = 'pause'; });
      el('btnPauseMenu').addEventListener('click', function () { G.game.toMenu(); });
      el('btnSettingsBack').addEventListener('click', function () {
        var q = el('qualitySelect').value;
        G.save.data.settings.quality = q;
        G.save.data.settings.volume = parseFloat(el('volumeRange').value);
        G.save.write();
        G.audio.setVolume(G.save.data.settings.volume);
        G.game.applyQuality(q);
        self.showScreen(self._settingsFrom === 'pause' ? 'pause' : 'menu');
      });
      el('btnHelpBack').addEventListener('click', function () {
        self.showScreen(self._helpFrom === 'pause' ? 'pause' : 'menu');
      });
      el('btnMapClose').addEventListener('click', function () {
        self.showScreen(self._mapFrom === 'pause' ? 'pause' : 'hud');
      });
      el('mapCanvas').addEventListener('click', function (e) {
        var rect = e.target.getBoundingClientRect();
        var mx = (e.clientX - rect.left) / rect.width * e.target.width;
        var my = (e.clientY - rect.top) / rect.height * e.target.height;
        var o = G.city.mapOrigin, s = G.city.mapScale;
        G.missions.setWaypoint(mx / s + o.minX, my / s + o.minZ);
      });
      el('btnMapFull').addEventListener('click', function () { self.toggleMap(); });
      el('btnPause').addEventListener('click', function () { G.game.pause(); });
      el('qualitySelect').addEventListener('change', function () { G.game.applyQuality(el('qualitySelect').value); });
      el('volumeRange').addEventListener('input', function () { G.audio.setVolume(parseFloat(el('volumeRange').value)); });
    },

    bindTouch: function () {
      var self = this;
      var zone = el('joyZone'), knob = el('joyKnob');
      var joyId = null, cx = 0, cy = 0;
      zone.addEventListener('pointerdown', function (e) {
        joyId = e.pointerId;
        var r = zone.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        zone.setPointerCapture(e.pointerId);
        self.moveJoy(e, knob, cx, cy);
        e.preventDefault();
      });
      zone.addEventListener('pointermove', function (e) {
        if (e.pointerId === joyId) self.moveJoy(e, knob, cx, cy);
      });
      var endJoy = function (e) {
        if (e.pointerId !== joyId) return;
        joyId = null;
        G.input.joy.active = false;
        G.input.joy.x = G.input.joy.y = 0;
        knob.style.transform = 'translate(-50%,-50%)';
      };
      zone.addEventListener('pointerup', endJoy);
      zone.addEventListener('pointercancel', endJoy);

      var bind = function (id, down, up) {
        var b = el(id);
        b.addEventListener('pointerdown', function (e) { down(); b.classList.add('on'); e.preventDefault(); });
        b.addEventListener('pointerup', function () { up(); b.classList.remove('on'); });
        b.addEventListener('pointerleave', function () { up(); b.classList.remove('on'); });
        b.addEventListener('pointercancel', function () { up(); b.classList.remove('on'); });
      };
      bind('tcAccel', function () { G.input.touch.accel = true; G.audio.resume(); }, function () { G.input.touch.accel = false; });
      bind('tcBrake', function () { G.input.touch.brake = true; }, function () { G.input.touch.brake = false; });
      bind('tcEnter', function () { G.input.press('enter'); }, function () {});
      bind('tcCam', function () { G.input.press('camera'); }, function () {});
      bind('tcMap', function () { G.input.press('map'); }, function () {});
      bind('tcPause', function () { G.input.press('pause'); }, function () {});
      bind('tcHorn', function () { G.input.touch.horn = true; }, function () { G.input.touch.horn = false; });
      bind('tcRun', function () { G.input.touch.sprint = true; }, function () { G.input.touch.sprint = false; });
    },

    moveJoy: function (e, knob, cx, cy) {
      var dx = (e.clientX - cx) / 55, dy = (e.clientY - cy) / 55;
      var len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      G.input.joy.x = dx; G.input.joy.y = dy; G.input.joy.active = true;
      knob.style.transform = 'translate(-50%,-50%) translate(' + (dx * 40) + 'px,' + (dy * 40) + 'px)';
    },

    showScreen: function (id) {
      ['menu', 'settings', 'help', 'pause', 'bigmap'].forEach(function (s) {
        el(s).classList.add('hidden');
      });
      el('hud').classList.add('hidden');
      if (id && id !== 'hud') el(id).classList.remove('hidden');
      if (id === 'hud') el('hud').classList.remove('hidden');
      if (id === 'bigmap') this.drawBigMap();
    },

    toggleMap: function () {
      var bm = el('bigmap');
      if (bm.classList.contains('hidden')) {
        this._mapFrom = 'hud';
        this.showScreen('bigmap');
      } else {
        this.showScreen('hud');
      }
    },

    setMission: function (name, text, timer) {
      var p = el('missionPanel');
      if (!name) { p.classList.add('hidden'); return; }
      p.classList.remove('hidden');
      el('missionName').textContent = name;
      el('missionText').textContent = text;
      el('missionTimer').textContent = timer > 0 ? timer + 's' : '';
    },

    toast: function (msg) {
      this.toasts.push({ msg: msg, t: 3.5 });
      this.renderToasts();
    },
    renderToasts: function () {
      var c = el('toasts');
      c.innerHTML = '';
      for (var i = 0; i < this.toasts.length; i++) {
        var d = document.createElement('div');
        d.className = 'toast';
        d.textContent = this.toasts[i].msg;
        c.appendChild(d);
      }
    },

    setWeather: function (w) {
      var icon = w === 'rain' ? '🌧️' : w === 'clouds' ? '⛅' : '☀️';
      el('weatherIcon').textContent = icon;
    },

    setPrompt: function (txt) {
      var p = el('prompt');
      if (txt) { p.textContent = txt; p.classList.remove('hidden'); }
      else p.classList.add('hidden');
    },

    updateHUD: function (dt) {
      var s = G.save.data;
      el('money').textContent = Math.floor(s.money) + ' €';
      var h = Math.floor(G.world.tod), m = Math.floor((G.world.tod % 1) * 60);
      el('clock').textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      for (var i = this.toasts.length - 1; i >= 0; i--) {
        this.toasts[i].t -= dt;
        if (this.toasts[i].t <= 0) { this.toasts.splice(i, 1); this.renderToasts(); }
      }
      if (G.player) {
        var spd = 0, name = 'À pied', gear = '';
        if (G.player.inCar) {
          var car = G.player.active;
          spd = Math.abs(car.speed) * 3.6;
          name = car.def.name;
          gear = car.speed < -0.5 ? 'R' : 'D';
          this.drawSpeedo(spd, car.damage);
        } else {
          spd = G.player.char.speed * 3.6;
          this.drawSpeedo(spd, 0);
        }
        el('speedVal').textContent = Math.round(spd);
        el('speedGear').textContent = gear;
        el('vehName').textContent = name;
        this.drawMinimap();
      }
    },

    drawSpeedo: function (kmh, dmg) {
      var c = el('speedo');
      var g = c.getContext('2d');
      var W = c.width;
      g.clearRect(0, 0, W, W);
      var cx = W / 2, cy = W / 2, r = W / 2 - 8;
      g.lineWidth = 6;
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.beginPath();
      g.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
      g.stroke();
      var frac = U.clamp(kmh / 200, 0, 1);
      g.strokeStyle = dmg > 70 ? '#e05a3a' : '#f0a63a';
      g.beginPath();
      g.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 0.75 + frac * Math.PI * 1.5);
      g.stroke();
    },

    drawMinimap: function () {
      var c = el('minimap'), g = this.miniCtx;
      var size = c.width;
      var p = G.player.pos;
      var view = 170;
      var o = G.city.mapOrigin, s = G.city.mapScale;
      var sx = (p.x - o.minX) * s - view * s / 2;
      var sy = (p.z - o.minZ) * s - view * s / 2;
      g.save();
      g.beginPath();
      g.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = '#22262b';
      g.fillRect(0, 0, size, size);
      var px = view * s;
      g.drawImage(G.city.mapCanvas, sx, sy, px, px, 0, 0, size, size);

      var toMini = function (wx, wz) {
        return [(wx - o.minX) * s - sx, (wz - o.minZ) * s - sy];
      };
      var scaleUp = size / (view * s);
      var blip = function (wx, wz, color, r) {
        var m = toMini(wx, wz);
        var x = m[0] * scaleUp, y = m[1] * scaleUp;
        if (x < 4 || x > size - 4 || y < 4 || y > size - 4) return;
        g.fillStyle = color;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      };
      if (G.missions.target) blip(G.missions.target.x, G.missions.target.z, '#35d46a', 6);
      if (G.missions.waypoint) blip(G.missions.waypoint.x, G.missions.waypoint.z, '#3a9ad4', 5);

      var cx = size / 2, cy = size / 2;
      g.save();
      g.translate(cx, cy);
      var yaw = G.player.inCar ? G.player.active.heading : G.player.char.group.rotation.y;
      g.rotate(-yaw + Math.PI);
      g.fillStyle = '#f0a63a';
      g.beginPath();
      g.moveTo(0, -9);
      g.lineTo(6, 7);
      g.lineTo(0, 3);
      g.lineTo(-6, 7);
      g.closePath();
      g.fill();
      g.restore();
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      g.stroke();
    },

    drawBigMap: function () {
      var c = el('mapCanvas'), g = this.mapCtx;
      var size = c.width;
      g.drawImage(G.city.mapCanvas, 0, 0, size, size);
      var o = G.city.mapOrigin, s = G.city.mapScale;
      var sc = size / G.city.mapCanvas.width;
      g.textAlign = 'center';
      G.city.labels.forEach(function (l) {
        var x = (l.x - o.minX) * s * sc, y = (l.z - o.minZ) * s * sc;
        g.font = (l.big ? 'bold 17px' : '13px') + ' system-ui, sans-serif';
        g.fillStyle = '#fff';
        g.strokeStyle = 'rgba(0,0,0,0.7)';
        g.lineWidth = 3;
        g.strokeText(l.name, x, y);
        g.fillText(l.name, x, y);
      });
      var blip = function (wx, wz, color, r) {
        var x = (wx - o.minX) * s * sc, y = (wz - o.minZ) * s * sc;
        g.fillStyle = color;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      };
      (G.city.packages || []).forEach(function (p, i) {
        if ((G.save.data.packages || []).indexOf(i) < 0) blip(p[0], p[1], '#1a7a3c', 5);
      });
      if (G.missions.target) blip(G.missions.target.x, G.missions.target.z, '#35d46a', 9);
      if (G.missions.waypoint) blip(G.missions.waypoint.x, G.missions.waypoint.z, '#3a9ad4', 8);
      if (G.player) blip(G.player.pos.x, G.player.pos.z, '#f0a63a', 9);
    }
  };
})();
