(function () {
  var U = G.utils;

  G.game = {
    state: 'boot',
    fpsAcc: 0, fpsN: 0, fps: 60, adaptT: 0, adaptLevel: 0,
    saveT: 0,

    boot: function () {
      var self = this;
      G.save.load();
      G.input.init();

      var canvas = document.getElementById('gl');
      this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 1600);
      this.menuAngle = 0;

      var qname = G.save.data.settings.quality === 'auto' ? 'moyen' : G.save.data.settings.quality;
      var q = G.quality = Object.assign({}, G.CONFIG.qualityPresets[qname] || G.CONFIG.qualityPresets.moyen);

      var steps = [
        function () { G.world.init(self.scene, self.renderer, q); },
        function () { G.city.build(self.scene, q); },
        function () { G.ui.init(); },
        function () {
          G.traffic.init(self.scene, q);
          G.playerCars = [
            new G.Car('citadine', 60, 44, Math.PI / 2, 0xc23b32),
            new G.Car('berline', 798, -190, Math.PI, 0x2f6db3),
            new G.Car('sportive', -262, 518, Math.PI / 2, 0xd9a13b),
            new G.Car('fourgonnette', -660, 700, Math.PI, 0xe0e0e0),
            new G.Car('taxi', 10, -96, 0, 0x1a7a3c)
          ];
          G.playerCars.forEach(function (c) { self.scene.add(c.group); });
        },
        function () {
          G.missions.init(self.scene);
          var saved = G.save.data.pos;
          G.player = {
            char: new G.Character(saved ? saved.x : 70, saved ? saved.z : 20),
            inCar: false,
            active: null,
            pos: new THREE.Vector3(),
            speed: 0
          };
          self.scene.add(G.player.char.group);
          self.headlight = new THREE.SpotLight(0xfff2cc, 0, 60, 0.5, 0.4, 1.2);
          self.headlightTarget = new THREE.Object3D();
          self.scene.add(self.headlight);
          self.scene.add(self.headlightTarget);
          self.headlight.target = self.headlightTarget;
        },
        function () {
          self.applyQuality(G.save.data.settings.quality);
          self.state = 'menu';
          G.ui.showScreen('menu');
          document.getElementById('loading').classList.add('hidden');
          self.last = performance.now();
          requestAnimationFrame(self.loop.bind(self));
        }
      ];
      this.runSteps(steps);
      window.addEventListener('resize', function () { self.onResize(); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && self.state === 'play') self.pause();
      });
      window.addEventListener('beforeunload', function () { self.writeSave(); });
    },

    runSteps: function (steps) {
      var self = this;
      var i = 0;
      var bar = document.getElementById('loadBar');
      var label = document.getElementById('loadLabel');
      var names = ['Ciel et lumières', 'Construction de la ville', 'Interface', 'Circulation et véhicules', 'Missions', 'Derniers réglages'];
      var next = function () {
        if (i < steps.length) {
          label.textContent = names[i] || 'Chargement';
          bar.style.width = Math.round(i / steps.length * 100) + '%';
          setTimeout(function () {
            steps[i]();
            i++;
            next();
          }, 30);
        }
      };
      next();
    },

    applyQuality: function (name) {
      if (name === 'auto') {
        this.adaptLevel = 1;
        G.quality = Object.assign({}, G.CONFIG.qualityPresets.moyen);
      } else {
        this.adaptLevel = 0;
        G.quality = Object.assign({}, G.CONFIG.qualityPresets[name] || G.CONFIG.qualityPresets.moyen);
      }
      var q = G.quality;
      var pr = Math.min(devicePixelRatio || 1, q.pixelRatio);
      this.renderer.setPixelRatio(pr);
      this.onResize();
      if (G.world) {
        G.world.shadowOn(q.shadows);
        if (G.world.fog) G.world.fog.far = q.fogFar;
      }
      if (G.traffic && G.traffic.bodyMesh) G.traffic.setDensity(q);
    },

    onResize: function () {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    },

    start: function (fresh) {
      G.audio.init();
      G.audio.resume();
      if (fresh) {
        var settings = G.save.data.settings;
        G.save.reset();
        G.save.data.settings = settings;
        G.save.write();
        if (G.missions.packMeshes) G.missions.packMeshes.forEach(function (m) { m.visible = true; });
        G.missions.startNext();
      }
      var s = G.save.data.pos;
      if (s && s.inCar && G.playerCars[s.carIdx]) {
        G.player.inCar = true;
        G.player.active = G.playerCars[s.carIdx];
        G.player.char.group.visible = false;
      } else {
        G.player.inCar = false;
        G.player.active = null;
        G.player.char.group.visible = true;
      }
      if (s && s.x !== undefined) {
        G.player.char.pos.set(s.x, 0, s.z);
        if (G.player.active) {
          G.player.active.pos.set(s.x, 0, s.z);
          G.player.active.group.position.copy(G.player.active.pos);
        }
      }
      this.camYaw = undefined;
      this.state = 'play';
      G.ui.showScreen('hud');
      G.ui.toast('Bienvenue à Saint-Étienne !');
    },

    pause: function () {
      if (this.state !== 'play') return;
      this.state = 'pause';
      this.writeSave();
      G.ui.showScreen('pause');
      if (G.audio) G.audio.engine(0, 0, false);
    },
    resume: function () {
      if (this.state !== 'pause') return;
      this.state = 'play';
      G.ui.showScreen('hud');
      G.audio.resume();
    },
    toMenu: function () {
      this.writeSave();
      this.state = 'menu';
      G.ui.showScreen('menu');
    },
    writeSave: function () {
      if (!G.player) return;
      var p = G.player;
      G.save.data.pos = {
        x: p.pos.x, z: p.pos.z,
        inCar: p.inCar,
        carIdx: p.inCar ? Math.max(0, G.playerCars.indexOf(p.active)) : 0
      };
      G.save.write();
    },

    loop: function (t) {
      requestAnimationFrame(this.loop.bind(this));
      var dt = Math.min(0.05, (t - this.last) / 1000 || 0.016);
      this.last = t;

      if (G.input.wasPressed('pause')) {
        if (this.state === 'play') this.pause();
        else if (this.state === 'pause') this.resume();
      }

      if (this.state === 'play') {
        this.updatePlay(dt);
      } else if (this.state === 'menu') {
        this.menuAngle += dt * 0.05;
        var R = 320;
        this.camera.position.set(70 + Math.cos(this.menuAngle) * R, 150, -30 + Math.sin(this.menuAngle) * R);
        this.camera.lookAt(0, 0, 100);
        G.world.update(dt * 4, this.camera.position);
        G.traffic.update(dt, { pos: this.camera.position, inCar: false, speed: 0 });
      }
      this.renderer.render(this.scene, this.camera);
      G.input.endFrame();
      this.trackFps(dt);
    },

    updatePlay: function (dt) {
      var P = G.player;

      if (G.input.wasPressed('map')) G.ui.toggleMap();
      if (G.input.wasPressed('camera')) G.ui.camMode = (G.ui.camMode + 1) % 3;

      if (G.input.wasPressed('enter')) {
        if (P.inCar) {
          var car = P.active;
          var side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
          var res = G.city.resolveCircle(
            car.pos.x + side.x * (car.def.wid / 2 + 0.9),
            car.pos.z + side.z * (car.def.wid / 2 + 0.9), 0.42);
          P.char.pos.set(res.x, 0, res.z);
          P.inCar = false;
          P.active = null;
          P.char.group.visible = true;
          G.audio.engine(0, 0, false);
        } else {
          var best = null, bd = 16;
          for (var i = 0; i < G.playerCars.length; i++) {
            var c = G.playerCars[i];
            var d = Math.hypot(c.pos.x - P.pos.x, c.pos.z - P.pos.z);
            if (d < bd) { bd = d; best = c; }
          }
          if (best) {
            P.inCar = true;
            P.active = best;
            P.char.group.visible = false;
          }
        }
      }

      if (P.inCar) {
        var car2 = P.active;
        var inp = G.input.driveInput();
        car2.update(dt, inp);
        P.pos.copy(car2.pos);
        P.speed = car2.speed;
        G.audio.engine(Math.abs(car2.speed) / car2.def.maxSpeed, inp.throttle, true);
        var night = G.world.night;
        car2.lightF.material.emissiveIntensity = night > 0.4 ? 1 : 0;
        car2.lightR.material.emissiveIntensity = night > 0.4 || car2.speed < -0.5 ? 0.8 : 0;
        this.headlight.intensity = night > 0.4 ? 1.4 : 0;
        this.headlight.position.set(car2.pos.x, 1.4, car2.pos.z);
        var fwd = car2.forward();
        this.headlightTarget.position.set(car2.pos.x + fwd.x * 25, 0.5, car2.pos.z + fwd.z * 25);
        if (G.input.touch.horn || G.input.keys.horn) G.audio.horn(true);
        else G.audio.horn(false);
      } else {
        var camYaw = Math.atan2(
          this.camera.position.x - P.pos.x,
          this.camera.position.z - P.pos.z
        );
        P.char.update(dt, camYaw);
        P.pos.copy(P.char.pos);
        P.speed = 0;
        G.audio.engine(0, 0, false);
        this.headlight.intensity = 0;
      }

      G.world.update(dt, this.camera.position);
      G.traffic.update(dt, P);
      G.missions.update(dt, P);
      this.updateCamera(dt);
      G.ui.updateHUD(dt);

      this.saveT += dt;
      if (this.saveT > 20) { this.saveT = 0; this.writeSave(); }
    },

    updateCamera: function (dt) {
      var P = G.player;
      var modes = [
        { d: 8.5, h: 3.4 },
        { d: 12.5, h: 5.2 },
        { d: 5.5, h: 2.4 }
      ];
      var m = modes[G.ui.camMode];
      var dist = m.d * (P.inCar ? 1.15 : 0.62);
      var height = m.h * (P.inCar ? 1.1 : 0.75);
      var tx = P.pos.x, tz = P.pos.z;

      var heading = P.inCar ? P.active.heading : P.char.group.rotation.y;
      var camYaw = this.camYaw === undefined ? heading : this.camYaw;
      camYaw += U.angleDelta(camYaw, heading) * Math.min(1, dt * (P.inCar ? 3.2 : 6));
      this.camYaw = camYaw;

      var px = tx - Math.sin(camYaw) * dist;
      var pz = tz - Math.cos(camYaw) * dist;
      var py = height + 1;

      var cx = U.damp(this.camera.position.x, px, P.inCar ? 5 : 8, dt);
      var cz = U.damp(this.camera.position.z, pz, P.inCar ? 5 : 8, dt);
      var cy = U.damp(this.camera.position.y, py, 6, dt);

      var out = [];
      G.city.colliders.queryRect(cx - 1, cz - 1, cx + 1, cz + 1, out);
      for (var i = 0; i < out.length; i++) {
        var b = out[i];
        if (cx > b.minX - 0.5 && cx < b.maxX + 0.5 && cz > b.minZ - 0.5 && cz < b.maxZ + 0.5 && cy < 20) {
          cx = U.lerp(cx, tx, 0.65);
          cz = U.lerp(cz, tz, 0.65);
          cy = Math.max(cy, 6);
        }
      }
      this.camera.position.set(cx, cy, cz);
      var look = new THREE.Vector3(tx, 1.4, tz);
      if (P.inCar) {
        var f2 = P.active.forward();
        look.x += f2.x * 4;
        look.z += f2.z * 4;
      }
      this.camera.lookAt(look);
    },

    trackFps: function (dt) {
      this.fpsAcc += dt;
      this.fpsN++;
      if (this.fpsAcc >= 0.5) {
        this.fps = this.fpsN / this.fpsAcc;
        this.fpsAcc = 0; this.fpsN = 0;
        var f = document.getElementById('fps');
        if (f) f.textContent = Math.round(this.fps) + ' FPS';
      }
      if (this.adaptLevel && this.state === 'play') {
        this.adaptT += dt;
        if (this.adaptT > 2.5) {
          this.adaptT = 0;
          var q = G.quality;
          var cur = this.renderer.getPixelRatio();
          if (this.fps < 38 && cur > 0.6) {
            this.renderer.setPixelRatio(Math.max(0.6, cur - 0.2));
            this.onResize();
          } else if (this.fps < 45 && q.fogFar > 300) {
            q.fogFar -= 60;
          } else if (this.fps > 57) {
            var cap = Math.min(devicePixelRatio || 1, 1.35);
            if (cur < cap) {
              this.renderer.setPixelRatio(Math.min(cap, cur + 0.1));
              this.onResize();
            }
          }
        }
      }
    }
  };

  window.addEventListener('DOMContentLoaded', function () { G.game.boot(); });
})();
