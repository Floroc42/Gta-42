(function () {
  var U = G.utils;

  G.Car = function (typeName, x, z, heading, colorHex) {
    this.typeName = typeName;
    this.def = G.CONFIG.vehicles[typeName];
    this.color = colorHex !== undefined ? colorHex : U.pick(G.CONFIG.carColors);
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading || 0;
    this.speed = 0;
    this.steer = 0;
    this.vel = new THREE.Vector3();
    this.damage = 0;
    this.wheelSpin = 0;
    this.buildMesh();
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
  };

  G.Car.prototype.buildMesh = function () {
    var g = this.group = new THREE.Group();
    this.body = new THREE.Group();
    g.add(this.body);
    var def = this.def;
    var L = def.len, W = def.wid;
    this.bodyMat = new THREE.MeshLambertMaterial({ color: this.color });
    var dark = new THREE.MeshLambertMaterial({ color: 0x1e2126 });
    var glass = new THREE.MeshLambertMaterial({ color: 0x28323c });

    var lower = new THREE.Mesh(new THREE.BoxGeometry(W, 0.55, L), this.bodyMat);
    lower.position.y = 0.62;
    lower.castShadow = true;
    var hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, 0.3, L * 0.96), this.bodyMat);
    hood.position.y = 0.98;
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.52, L * 0.45), glass);
    cabin.position.set(0, 1.32, -L * 0.06);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.1, L * 0.4), this.bodyMat);
    roof.position.set(0, 1.6, -L * 0.06);
    var bumperF = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.22, 0.18), dark);
    bumperF.position.set(0, 0.42, L / 2 + 0.04);
    var bumperR = bumperF.clone();
    bumperR.position.z = -L / 2 - 0.04;
    this.lightF = new THREE.Mesh(new THREE.BoxGeometry(W * 0.75, 0.14, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0 }));
    this.lightF.position.set(0, 0.85, L / 2 + 0.02);
    this.lightR = new THREE.Mesh(new THREE.BoxGeometry(W * 0.75, 0.12, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x8a1a1a, emissive: 0xff2222, emissiveIntensity: 0 }));
    this.lightR.position.set(0, 0.85, -L / 2 - 0.02);
    this.body.add(lower);
    this.body.add(hood);
    this.body.add(cabin);
    this.body.add(roof);
    this.body.add(bumperF);
    this.body.add(bumperR);
    this.body.add(this.lightF);
    this.body.add(this.lightR);

    if (this.typeName === 'fourgonnette') {
      cabin.scale.set(1, 1.4, 0.55);
      cabin.position.set(0, 1.5, L * 0.22);
      roof.position.set(0, 2.1, L * 0.22);
      lower.scale.set(1, 1.2, 1);
    }
    if (this.typeName === 'sportive') {
      cabin.position.z = -L * 0.14;
      roof.position.z = -L * 0.14;
      lower.scale.set(1, 0.9, 1.02);
    }
    if (this.typeName === 'taxi') {
      var sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshLambertMaterial({ color: 0xf0c040 }));
      sign.position.set(0, 1.8, -L * 0.06);
      this.body.add(sign);
    }

    this.wheels = [];
    var wg = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10);
    wg.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
    var hubMat = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });
    for (var i = 0; i < 4; i++) {
      var w = new THREE.Group();
      var tire = new THREE.Mesh(wg, wheelMat);
      tire.castShadow = true;
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 8), hubMat);
      hub.rotation.z = Math.PI / 2;
      w.add(tire);
      w.add(hub);
      w.position.set((i % 2 ? 1 : -1) * (W / 2 - 0.02), 0.34, (i < 2 ? 1 : -1) * L * 0.31);
      this.wheels.push(w);
      g.add(w);
    }
  };

  G.Car.prototype.forward = function () {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  };

  G.Car.prototype.update = function (dt, inp) {
    var def = this.def;
    var maxSpeed = def.maxSpeed * (this.damage > 75 ? 0.55 : 1);
    var maxSteer = 0.62 / (1 + Math.abs(this.speed) * 0.045);
    this.steer = U.damp(this.steer, U.clamp(inp.steer, -1, 1) * maxSteer, 7, dt);

    var th = inp.throttle, br = inp.brake;
    if (th > 0) {
      if (this.speed < -0.5) this.speed += def.brake * 0.7 * dt;
      else this.speed += def.accel * th * (1 - U.clamp(this.speed / maxSpeed, 0, 1)) * dt;
    }
    if (br > 0) {
      if (this.speed > 0.5) this.speed -= def.brake * br * dt;
      else if (this.speed > -def.maxSpeed * 0.32) this.speed -= def.accel * 0.6 * br * dt;
    }
    if (inp.handbrake) this.speed = U.damp(this.speed, 0, 1.6, dt);
    this.speed -= this.speed * 0.12 * dt;
    if (th === 0 && br === 0) this.speed = U.damp(this.speed, 0, 0.6, dt);
    this.speed = U.clamp(this.speed, -def.maxSpeed * 0.32, maxSpeed);

    var wb = def.len * 0.62;
    this.heading += (this.speed / wb) * Math.tan(this.steer) * dt;

    var fwd = this.forward();
    var k = 1 - Math.exp(-def.grip * (inp.handbrake ? 0.35 : 1) * dt);
    this.vel.x = U.lerp(this.vel.x, fwd.x * this.speed, k);
    this.vel.z = U.lerp(this.vel.z, fwd.z * this.speed, k);

    var res = this.collide(this.pos.x + this.vel.x * dt, this.pos.z + this.vel.z * dt);
    this.pos.x = res.x;
    this.pos.z = res.z;
    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.y = this.heading;

    this.wheelSpin += this.speed / 0.34 * dt;
    for (var i = 0; i < 4; i++) {
      this.wheels[i].children[0].rotation.x = this.wheelSpin;
      this.wheels[i].children[1].rotation.x = this.wheelSpin;
      if (i < 2) this.wheels[i].rotation.y = this.steer;
    }
    var accel = (this.speed - (this._prevSpeed || 0)) / Math.max(dt, 0.001);
    this._prevSpeed = this.speed;
    this._accSm = U.damp(this._accSm || 0, accel, 4, dt);
    this.body.rotation.x = U.clamp(-this._accSm * 0.0035, -0.06, 0.06);
    this.body.rotation.z = U.clamp(this.steer * this.speed * 0.006, -0.08, 0.08);
    this.body.position.y = Math.abs(Math.sin(performance.now() / 130)) * U.clamp(Math.abs(this.speed) * 0.0012, 0, 0.05);
  };

  G.Car.prototype.collide = function (nx, nz) {
    var def = this.def;
    var fwd = this.forward();
    var px = fwd.x, pz = fwd.z;
    var rx = -pz, rz = px;
    var hl = def.len * 0.38, hw = def.wid * 0.38;
    var pts = [
      [nx + px * hl, nz + pz * hl],
      [nx - px * hl, nz - pz * hl],
      [nx + px * hl * 0.3 + rx * hw, nz + pz * hl * 0.3 + rz * hw],
      [nx + px * hl * 0.3 - rx * hw, nz + pz * hl * 0.3 - rz * hw],
      [nx - px * hl * 0.3 + rx * hw, nz - pz * hl * 0.3 + rz * hw],
      [nx - px * hl * 0.3 - rx * hw, nz - pz * hl * 0.3 - rz * hw]
    ];
    var out = [], r = 0.5;
    for (var pass = 0; pass < 2; pass++) {
      G.city.colliders.queryRect(nx - 3.5, nz - 3.5, nx + 3.5, nz + 3.5, out);
      for (var i = 0; i < out.length; i++) {
        var b = out[i];
        for (var p = 0; p < pts.length; p++) {
          var qx = U.clamp(pts[p][0], b.minX, b.maxX);
          var qz = U.clamp(pts[p][1], b.minZ, b.maxZ);
          var dx = pts[p][0] - qx, dz = pts[p][1] - qz;
          var d2 = dx * dx + dz * dz;
          if (d2 < r * r) {
            var impact = Math.abs(this.speed);
            var d = Math.sqrt(d2);
            if (d > 0.001) {
              var push = r - d;
              nx += dx / d * push;
              nz += dz / d * push;
              for (var q2 = 0; q2 < pts.length; q2++) {
                pts[q2][0] += dx / d * push;
                pts[q2][1] += dz / d * push;
              }
            } else {
              var dl = nx - b.minX, dr = b.maxX - nx, dtp = nz - b.minZ, db = b.maxZ - nz;
              var mn = Math.min(dl, dr, dtp, db);
              if (mn === dl) nx = b.minX - r;
              else if (mn === dr) nx = b.maxX + r;
              else if (mn === dtp) nz = b.minZ - r;
              else nz = b.maxZ + r;
            }
            if (impact > 2) {
              this.damage = Math.min(100, this.damage + impact * 0.5);
              if (G.audio) G.audio.thud(Math.min(1, impact / 14));
            }
            this.speed *= 0.55;
            this.vel.multiplyScalar(0.4);
          }
        }
      }
    }
    var res2 = G.traffic.collidePlayer(nx, nz, hw + 0.6, Math.abs(this.speed));
    if (res2.hit) {
      this.damage = Math.min(100, this.damage + Math.abs(this.speed) * 0.35);
      this.speed *= 0.5;
      this.vel.multiplyScalar(0.5);
    }
    return { x: res2.x, z: res2.z };
  };
})();
