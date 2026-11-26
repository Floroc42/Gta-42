(function () {
  var U = G.utils;

  G.traffic = {
    cars: [],
    peds: [],
    phaseT: 0,

    init: function (scene, q) {
      this.scene = scene;
      this.q = q;
      this.phaseT = 0;

      var bodyG = new THREE.BoxGeometry(1.8, 0.85, 4.1);
      bodyG.translate(0, 0.72, 0);
      var det = [new THREE.BoxGeometry(1.65, 0.68, 2.2)];
      det[0].translate(0, 1.45, -0.2);
      [[0.92, 0.65], [0.92, -0.65], [-0.92, 0.65], [-0.92, -0.65]].forEach(function (p) {
        det.push(U.coloredGeo(new THREE.BoxGeometry(0.62, 0.55, 0.32), 0x17181a, p[0], 0.32, p[1]));
      });
      var detG = U.mergeGeoms(det);
      var n = q.traffic;
      this.bodyMesh = new THREE.InstancedMesh(bodyG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
      this.detMesh = new THREE.InstancedMesh(detG, new THREE.MeshLambertMaterial({ color: 0x2a2d31 }), n);
      this.bodyMesh.frustumCulled = false;
      this.detMesh.frustumCulled = false;
      scene.add(this.bodyMesh);
      scene.add(this.detMesh);

      this.dummy = new THREE.Object3D();
      this.cTmp = new THREE.Color();
      this.cars = [];
      for (var i = 0; i < n; i++) {
        this.bodyMesh.setColorAt(i, this.cTmp.setHex(U.pick(G.CONFIG.carColors)));
        this.cars.push(this.spawnCar(true));
      }
      if (this.bodyMesh.instanceColor) this.bodyMesh.instanceColor.needsUpdate = true;

      var pedBody = [
        new THREE.BoxGeometry(0.4, 0.62, 0.24),
        new THREE.BoxGeometry(0.34, 0.55, 0.2)
      ];
      pedBody[0].translate(0, 0.95, 0);
      pedBody[1].translate(0, 0.28, 0);
      var pedBodyG = U.mergeGeoms(pedBody);
      var headG = new THREE.SphereGeometry(0.14, 8, 6);
      headG.translate(0, 1.45, 0);
      this.pedMesh = new THREE.InstancedMesh(pedBodyG, new THREE.MeshLambertMaterial({ color: 0xffffff }), q.peds);
      this.pedHead = new THREE.InstancedMesh(headG, new THREE.MeshLambertMaterial({ color: 0xc99873 }), q.peds);
      this.pedMesh.frustumCulled = false;
      this.pedHead.frustumCulled = false;
      scene.add(this.pedMesh);
      scene.add(this.pedHead);
      this.peds = [];
      var shirt = [0x8a3a3a, 0x3a5a8a, 0x3a7a4a, 0x8a7a3a, 0x6a4a8a, 0x557788, 0xaa8855];
      for (var p = 0; p < q.peds; p++) {
        this.pedMesh.setColorAt(p, this.cTmp.setHex(U.pick(shirt)));
        this.peds.push(this.spawnPed(true));
      }
      if (this.pedMesh.instanceColor) this.pedMesh.instanceColor.needsUpdate = true;
    },

    setDensity: function (q) {
      this.bodyMesh.count = q.traffic;
      this.detMesh.count = q.traffic;
      this.pedMesh.count = q.peds;
      this.pedHead.count = q.peds;
      while (this.cars.length < q.traffic) this.cars.push(this.spawnCar(true));
      while (this.peds.length < q.peds) this.peds.push(this.spawnPed(true));
    },

    lightState: function () {
      var t = this.phaseT % 16;
      if (t < 7) return { ns: 'green', ew: 'red' };
      if (t < 8) return { ns: 'yellow', ew: 'red' };
      if (t < 9) return { ns: 'red', ew: 'red' };
      if (t < 15) return { ns: 'red', ew: 'green' };
      return { ns: 'red', ew: 'yellow' };
    },

    carPos: function (car) {
      if (car.road.axis === 'z') return { x: car.road.pos - G.CONFIG.world.laneOffset * car.dir, z: car.t, yaw: car.dir > 0 ? 0 : Math.PI };
      return { x: car.t, z: car.road.pos + G.CONFIG.world.laneOffset * car.dir, yaw: car.dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
    },

    spawnCar: function (anywhere) {
      var road, t, tries = 0;
      var px = this._playerPos ? this._playerPos.x : 0;
      var pz = this._playerPos ? this._playerPos.z : 0;
      do {
        road = U.pick(G.city.roads);
        t = U.rand(road.min + 15, road.max - 15);
        tries++;
      } while (tries < 24 && !anywhere && Math.hypot(
        (road.axis === 'z' ? road.pos : t) - px,
        (road.axis === 'z' ? t : road.pos) - pz) < 70);
      return {
        road: road, dir: Math.random() < 0.5 ? 1 : -1, t: t,
        speed: U.rand(4, 9), target: 0, push: { x: 0, z: 0 }, stun: 0
      };
    },

    spawnPed: function () {
      var road = U.pick(G.city.roads);
      var side = Math.random() < 0.5 ? 1 : -1;
      return {
        road: road, dir: Math.random() < 0.5 ? 1 : -1,
        t: U.rand(road.min + 10, road.max - 10),
        off: side * (road.width / 2 + 1.6),
        speed: U.rand(1.1, 1.9),
        down: 0, phase: Math.random() * 10
      };
    },

    pedPos: function (p) {
      if (p.road.axis === 'z') return { x: p.road.pos + p.off, z: p.t };
      return { x: p.t, z: p.road.pos + p.off };
    },

    update: function (dt, player) {
      this._playerPos = player;
      this.phaseT += dt;
      var st = this.lightState();
      G.city.tlNSMat.color.setHex(st.ns === 'green' ? 0x22cc55 : st.ns === 'yellow' ? 0xddbb22 : 0xcc2222);
      G.city.tlEWMat.color.setHex(st.ew === 'green' ? 0x22cc55 : st.ew === 'yellow' ? 0xddbb22 : 0xcc2222);

      var i, j, car;
      for (i = 0; i < this.cars.length; i++) {
        car = this.cars[i];
        if (car.stun > 0) {
          car.stun -= dt;
          car.speed = 0;
        } else {
          var target = car.road.major ? 11 : 8;
          var nodes = car.road.crossings || (car.road.crossings = this.computeCrossings(car.road));
          var next = null;
          for (j = 0; j < nodes.length; j++) {
            var nd = nodes[j];
            if ((nd.pos - car.t) * car.dir > 2) { next = nd; break; }
          }
          if (next) {
            var dist = Math.abs(next.pos - car.t);
            if (dist < 16) target = Math.min(target, 5.5);
            var green = car.road.axis === 'z' ? st.ns : st.ew;
            if (green !== 'green' && dist < 22 && dist > 7) target = 0;
          }
          for (j = 0; j < this.cars.length; j++) {
            var o = this.cars[j];
            if (o === car || o.road !== car.road || o.dir !== car.dir) continue;
            var ahead = (o.t - car.t) * car.dir;
            if (ahead > 0 && ahead < 11) target = Math.min(target, ahead < 6.5 ? 0 : o.speed * 0.8);
          }
          if (player.inCar) {
            var cp = this.carPos(car);
            var dx = player.pos.x - cp.x, dz = player.pos.z - cp.z;
            var fwd = car.road.axis === 'z' ? { x: 0, z: car.dir } : { x: car.dir, z: 0 };
            var aheadD = dx * fwd.x + dz * fwd.z;
            var lat = Math.abs(dx * fwd.z - dz * fwd.x);
            if (aheadD > 0 && aheadD < 11 && lat < 3) target = 0;
          }
          car.target = target;
          var dv = target - car.speed;
          car.speed += U.clamp(dv, -9 * dt, 4 * dt);
          car.speed = Math.max(0, car.speed);
          car.t += car.dir * car.speed * dt;
          if (car.t < car.road.min + 4 || car.t > car.road.max - 4) {
            this.respawnCar(car);
            continue;
          }
          if (next && (car.t - next.pos) * car.dir > 0) this.decideTurn(car, next);
        }
        car.push.x *= Math.exp(-2 * dt);
        car.push.z *= Math.exp(-2 * dt);
      }

      var pk = (player.inCar && Math.abs(player.speed || 0) > 3) ? player.pos : null;
      for (i = 0; i < this.peds.length; i++) {
        var ped = this.peds[i];
        if (ped.down > 0) {
          ped.down -= dt;
          if (ped.down <= 0) this.peds[i] = this.spawnPed();
          continue;
        }
        ped.t += ped.dir * ped.speed * dt;
        ped.phase += dt * ped.speed * 3;
        if (ped.t < ped.road.min + 6 || ped.t > ped.road.max - 6) ped.dir *= -1;
        if (pk) {
          var pp2 = this.pedPos(ped);
          if (Math.hypot(pp2.x - pk.x, pp2.z - pk.z) < 1.5) {
            ped.down = 8;
            if (G.audio) G.audio.thud(0.5);
          }
        }
      }

      for (i = 0; i < this.cars.length; i++) {
        car = this.cars[i];
        var cp2 = this.carPos(car);
        var yaw = car.road.axis === 'z' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        this.dummy.position.set(cp2.x + car.push.x, 0, cp2.z + car.push.z);
        this.dummy.rotation.set(0, yaw, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.bodyMesh.setMatrixAt(i, this.dummy.matrix);
        this.detMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.bodyMesh.instanceMatrix.needsUpdate = true;
      this.detMesh.instanceMatrix.needsUpdate = true;

      for (i = 0; i < this.peds.length; i++) {
        var pd = this.peds[i];
        var pp3 = this.pedPos(pd);
        if (pd.down > 0) {
          this.dummy.position.set(pp3.x, 0.25, pp3.z);
          this.dummy.rotation.set(Math.PI / 2, 0, 0);
        } else {
          this.dummy.position.set(pp3.x, Math.abs(Math.sin(pd.phase * 4)) * 0.04, pp3.z);
          this.dummy.rotation.set(0, pd.road.axis === 'z' ? (pd.dir > 0 ? 0 : Math.PI) : (pd.dir > 0 ? Math.PI / 2 : -Math.PI / 2), Math.sin(pd.phase * 4) * 0.05);
        }
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.pedMesh.setMatrixAt(i, this.dummy.matrix);
        this.pedHead.setMatrixAt(i, this.dummy.matrix);
      }
      this.pedMesh.instanceMatrix.needsUpdate = true;
      this.pedHead.instanceMatrix.needsUpdate = true;
    },

    computeCrossings: function (road) {
      var list = [];
      G.city.roads.forEach(function (o) {
        if (o === road || o.axis === road.axis) return;
        if (road.pos >= o.min && road.pos <= o.max && o.pos >= road.min && o.pos <= road.max) {
          list.push({ pos: o.pos, road: o });
        }
      });
      list.sort(function (a, b) { return a.pos - b.pos; });
      return list;
    },

    decideTurn: function (car, node) {
      var cross = node.road;
      var canContinue = (car.dir > 0 ? car.road.max - node.pos : node.pos - car.road.min) > 40;
      var dirs = [];
      if (canContinue) dirs.push({ turn: false });
      if (cross.max - cross.pos > 40) dirs.push({ turn: true, dir: 1 });
      if (cross.pos - cross.min > 40) dirs.push({ turn: true, dir: -1 });
      if (!dirs.length) { this.respawnCar(car); return; }
      var choice = dirs[Math.floor(Math.random() * dirs.length)];
      if (choice.turn) {
        var oldPos = car.road.pos;
        car.road = cross;
        car.dir = choice.dir;
        car.t = oldPos;
      }
      car.speed = Math.min(car.speed, 6);
    },

    respawnCar: function (car) {
      var nc = this.spawnCar(false);
      car.road = nc.road; car.dir = nc.dir; car.t = nc.t;
      car.speed = 5; car.stun = 0;
      car.push.x = 0; car.push.z = 0;
    },

    collidePlayer: function (px, pz, r, speedAbs) {
      var hit = false;
      for (var i = 0; i < this.cars.length; i++) {
        var car = this.cars[i];
        var cp = this.carPos(car);
        var cx = cp.x + car.push.x, cz = cp.z + car.push.z;
        var dx = px - cx, dz = pz - cz;
        var d = Math.hypot(dx, dz);
        if (d < r + 1.6 && d > 0.001) {
          var nx = dx / d, nz = dz / d;
          var overlap = r + 1.6 - d;
          px += nx * overlap;
          pz += nz * overlap;
          car.push.x -= nx * overlap * 0.6;
          car.push.z -= nz * overlap * 0.6;
          car.stun = Math.max(car.stun, 1.5);
          car.speed = 0;
          if (speedAbs > 2) {
            hit = true;
            if (G.audio) G.audio.thud(Math.min(1, speedAbs / 15));
          }
        }
      }
      return { x: px, z: pz, hit: hit };
    }
  };
})();
