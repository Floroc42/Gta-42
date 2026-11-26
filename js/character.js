(function () {
  var U = G.utils;

  G.Character = function (x, z) {
    this.group = new THREE.Group();
    this.pos = new THREE.Vector3(x, 0, z);
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.phase = 0;
    this.speed = 0;
    this.build();
    this.group.position.copy(this.pos);
  };

  G.Character.prototype.build = function () {
    var g = this.group;
    var skin = new THREE.MeshLambertMaterial({ color: 0xc99873 });
    var jacket = new THREE.MeshLambertMaterial({ color: 0x2e4d3a });
    var jeans = new THREE.MeshLambertMaterial({ color: 0x2d3b52 });
    var shoe = new THREE.MeshLambertMaterial({ color: 0x1c1c1e });

    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.24), jacket);
    this.torso.position.y = 1.12;
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skin);
    this.head.position.y = 1.53;
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.16), jeans);
    this.legR = this.legL.clone();
    this.legL.position.set(-0.11, 0.48, 0);
    this.legR.position.set(0.11, 0.48, 0);
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.13), jacket);
    this.armR = this.armL.clone();
    this.armL.position.set(-0.28, 1.15, 0);
    this.armR.position.set(0.28, 1.15, 0);
    this.handL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.11), skin);
    this.handR = this.handL.clone();
    this.handL.position.set(-0.28, 0.85, 0);
    this.handR.position.set(0.28, 0.85, 0);
    [this.legL, this.legR].forEach(function (l) {
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), shoe);
      foot.position.set(0, -0.4, 0.04);
      l.add(foot);
    });
    var pivot = function (m) {
      var p = new THREE.Group();
      p.position.copy(m.position);
      m.position.set(0, 0, 0).sub(new THREE.Vector3(0, m.geometry.parameters.height / 2, 0));
      p.add(m);
      return p;
    };
    this.legLP = pivot(this.legL); this.legRP = pivot(this.legR);
    this.armLP = pivot(this.armL); this.armRP = pivot(this.armR);
    this.handL.position.set(0, -0.28, 0); this.armLP.add(this.handL);
    this.handR.position.set(0, -0.28, 0); this.armRP.add(this.handR);
    g.add(this.torso, this.head, this.legLP, this.legRP, this.armLP, this.armRP);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
  };

  G.Character.prototype.update = function (dt, camYaw) {
    var inp = G.input.footInput();
    var len = Math.hypot(inp.x, inp.y);
    var targetSpeed = 0;
    if (len > 0.15) {
      targetSpeed = inp.sprint ? 6.2 : U.lerp(1.4, 3.4, U.clamp(len, 0, 1));
      var wx = inp.x / len, wz = inp.y / len;
      var fx = Math.sin(camYaw), fz = Math.cos(camYaw);
      var rx = fz, rz = -fx;
      var dx = rx * wx + fx * (-wz);
      var dz = rz * wx + fz * (-wz);
      this.heading = Math.atan2(dx, dz);
      this.targetDirX = dx; this.targetDirZ = dz;
    }
    this.speed = U.damp(this.speed, targetSpeed, 8, dt);
    if (this.speed > 0.05 && this.targetDirX !== undefined) {
      var k = 1 - Math.exp(-10 * dt);
      this.vel.x = U.lerp(this.vel.x, this.targetDirX * this.speed, k);
      this.vel.z = U.lerp(this.vel.z, this.targetDirZ * this.speed, k);
    } else {
      this.vel.multiplyScalar(Math.exp(-8 * dt));
    }
    var nx = this.pos.x + this.vel.x * dt;
    var nz = this.pos.z + this.vel.z * dt;
    var res = G.city.resolveCircle(nx, nz, 0.42);
    this.pos.x = U.clamp(res.x, G.CONFIG.world.bounds.minX + 10, G.CONFIG.world.bounds.maxX - 10);
    this.pos.z = U.clamp(res.z, G.CONFIG.world.bounds.minZ + 10, G.CONFIG.world.bounds.maxZ - 10);
    this.group.position.copy(this.pos);
    if (this.speed > 0.1) {
      var d = U.angleDelta(this.group.rotation.y, this.heading);
      this.group.rotation.y += d * Math.min(1, dt * 12);
      this.phase += dt * (this.speed * 2.4 + 2);
    } else {
      this.phase += dt * 1.2;
    }
    var amp = U.clamp(this.speed / 6, 0, 1) * 0.9;
    var s = Math.sin(this.phase * 2) * amp;
    this.legLP.rotation.x = s * 0.8;
    this.legRP.rotation.x = -s * 0.8;
    this.armLP.rotation.x = -s * 0.7;
    this.armRP.rotation.x = s * 0.7;
    this.group.position.y = Math.abs(Math.sin(this.phase * 2)) * amp * 0.06;
  };
})();
