(function () {
  var U = G.utils, C = G.CONFIG;

  var roads = [];
  function addRoad(axis, pos, min, max, major, name) {
    roads.push({ axis: axis, pos: pos, min: min, max: max, major: major, name: name, width: major ? 16 : 11 });
  }
  addRoad('z', -800, -650, 860, false, 'Route du Pilat');
  addRoad('z', -600, -650, 860, false, 'Rue de Montaud');
  addRoad('z', -400, -650, 860, false, 'Rue Désiré Claude');
  addRoad('z', -280, -220, 700, false, 'Rue Bergson');
  addRoad('z', -140, -650, 860, true, 'Rue Gambetta');
  addRoad('z', 0, -650, 860, true, 'Rue de la République');
  addRoad('z', 140, -650, 860, false, 'Rue de la Résistance');
  addRoad('z', 320, -650, 860, true, 'Cours Fauriel');
  addRoad('z', 480, -350, 700, false, 'Rue Saint-Simon');
  addRoad('z', 640, -650, 700, true, 'Avenue de la Libération');
  addRoad('z', 800, -500, 860, true, 'Rue Willy Brandt');
  addRoad('z', 950, -100, 200, false, 'Rue de la Montat');
  addRoad('x', -650, -800, 950, true, 'Boulevard Jules Janin');
  addRoad('x', -500, -800, -140, false, 'Rue de la Charité');
  addRoad('x', -350, -400, 1000, true, 'Boulevard Thiers');
  addRoad('x', -220, -280, 1000, true, 'Cours Valmy');
  addRoad('x', -100, -800, 950, false, "Rue de l'Hôtel de Ville");
  addRoad('x', 40, -800, 950, false, 'Rue Saint-Ferréol');
  addRoad('x', 200, -140, 950, false, "Rue de l'Industrie");
  addRoad('x', 360, -400, 950, false, 'Boulevard Saint-Roch');
  addRoad('x', 520, -280, 950, false, 'Rue Denis Papin');
  addRoad('x', 700, -800, -610, true, 'Avenue Albert Raymond');
  addRoad('x', 700, -370, 950, true, 'Avenue Albert Raymond');
  addRoad('x', 860, -800, 950, false, 'Boulevard de la Visitation');

  var VZ = roads.filter(function (r) { return r.axis === 'z'; }).sort(function (a, b) { return a.pos - b.pos; });
  var HX = roads.filter(function (r) { return r.axis === 'x'; }).sort(function (a, b) { return a.pos - b.pos; });

  var LM = {
    plaza: [0, -100, 140, 40],
    hdv: [-140, -100, 0, 40],
    cathedrale: [140, -220, 320, -100],
    design: [-400, -350, -280, -220],
    parc: [652, 368, 796, 512],
    stade: [-580, 550, -430, 850],
    gare: [800, -400, 1050, -100]
  };

  var poi = {
    jaures: { x: 70, z: -30, name: 'Place Jean Jaurès' },
    hdv: { x: -70, z: -30, name: 'Hôtel de Ville' },
    stade: { x: -505, z: 555, name: 'Stade Geoffroy-Guichard' },
    gare: { x: 770, z: -270, name: 'Gare de Châteaucreux' },
    design: { x: -340, z: -285, name: 'Cité du Design' },
    parc: { x: 720, z: 440, name: "Parc de l'Europe" },
    montaud: { x: -650, z: 100, name: 'Montaud' },
    fauriel: { x: 320, z: 200, name: 'Cours Fauriel' }
  };

  var packages = [
    [-720, -420], [-640, 240], [-560, 620], [-240, -520], [-90, 300],
    [220, -480], [420, 300], [560, 640], [880, 60], [180, 620]
  ];

  var palettes = {
    centre: [0xcbb9a2, 0xc4a98a, 0xb8a48e, 0xa89a8a, 0xc9c2b6, 0xb0927a, 0x9d9285],
    gare: [0xb8c4c8, 0x9fb0b6, 0xc8d0d4, 0xaab6ba],
    res: [0xd8c9b0, 0xc9b896, 0xd4c4a8, 0xbfa88f, 0xcbb69a, 0xc2ad91],
    maison: [0xd9c9a8, 0xe0d4bc, 0xc8b490, 0xd6c6ab]
  };

  function districtOf(x, z) {
    if (Math.hypot(x - 870, z + 250) < 300) return 'gare';
    if (Math.hypot(x + 500, z - 700) < 320) return 'stade';
    if (Math.hypot(x - 70, z + 30) < 340) return 'centre';
    if (x < -420) return 'montaud';
    if (z < -460) return 'nord';
    return 'res';
  }

  function rectIntersect(a, b, frac) {
    var ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
    var iz = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    if (ix * iz <= 0) return false;
    var area = (a[2] - a[0]) * (a[3] - a[1]);
    return (ix * iz) / area > (frac || 0.3);
  }

  function rectHit(a, b) {
    return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  }

  G.city = {
    roads: roads,
    poi: poi,
    packages: packages,
    colliders: new U.SpatialHash(24),
    isNight: 0,
    labels: [],
    treeList: [],

    build: function (scene, q) {
      this._scene = scene;
      this.q = q;
      var self = this;
      this.facade = {
        shops: U.facadeTextures('shops'),
        res: U.facadeTextures('res'),
        modern: U.facadeTextures('modern')
      };
      this.buildingMats = {};
      ['shops', 'res', 'modern'].forEach(function (k) {
        self.buildingMats[k] = new THREE.MeshLambertMaterial({
          map: self.facade[k].day,
          emissiveMap: self.facade[k].night,
          emissive: 0xffffff,
          emissiveIntensity: 0,
          vertexColors: true
        });
      });
      this.solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.sidewalkMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.roadMat = new THREE.MeshLambertMaterial({ map: U.roadTexture() });
      this.flatMat = new THREE.MeshLambertMaterial({ vertexColors: true });

      this.bGeos = { shops: [], res: [], modern: [] };
      this.solidGeos = [];
      this.walkGeos = [];
      this.roadGeos = [];
      this.flatGeos = [];

      this.buildGround();
      this.buildRiver();
      this.buildRoads();
      this.buildBlocks();
      this.buildLandmarks();
      this.buildProps(q);
      this.buildHills();
      this.buildBounds();

      ['shops', 'res', 'modern'].forEach(function (k) {
        if (self.bGeos[k].length) {
          var m = new THREE.Mesh(U.mergeGeoms(self.bGeos[k]), self.buildingMats[k]);
          m.castShadow = true; m.receiveShadow = true;
          scene.add(m);
        }
      });
      if (this.solidGeos.length) {
        var sm = new THREE.Mesh(U.mergeGeoms(this.solidGeos), this.solidMat);
        sm.castShadow = true; sm.receiveShadow = true;
        scene.add(sm);
      }
      if (this.walkGeos.length) {
        var wm = new THREE.Mesh(U.mergeGeoms(this.walkGeos), this.sidewalkMat);
        wm.receiveShadow = true;
        scene.add(wm);
      }
      if (this.roadGeos.length) {
        var rm = new THREE.Mesh(U.mergeGeoms(this.roadGeos), this.roadMat);
        rm.receiveShadow = true;
        scene.add(rm);
      }
      if (this.flatGeos.length) {
        var fm = new THREE.Mesh(U.mergeGeoms(this.flatGeos), this.flatMat);
        fm.receiveShadow = true;
        scene.add(fm);
      }
      this.prerenderMap();
    },

    addCollider: function (minX, minZ, maxX, maxZ) {
      this.colliders.insert({ minX: minX, minZ: minZ, maxX: maxX, maxZ: maxZ });
    },

    buildGround: function () {
      var g = new THREE.Mesh(
        new THREE.PlaneGeometry(2400, 2100),
        new THREE.MeshLambertMaterial({ color: 0x8f9082 })
      );
      g.rotation.x = -Math.PI / 2;
      g.position.set(50, 0, 100);
      g.receiveShadow = true;
      this._scene.add(g);
    },

    buildRiver: function () {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(1900, 26), new THREE.MeshLambertMaterial({ color: 0x39647a }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(60, 0.02, -269);
      this._scene.add(m);
      this.solidGeos.push(
        U.colorBox(1900, 0.5, 2.5, 60, 0.15, -283, 0x6e6a5e),
        U.colorBox(1900, 0.5, 2.5, 60, 0.15, -255, 0x6e6a5e)
      );
    },

    buildRoads: function () {
      var eps = 0;
      for (var i = 0; i < roads.length; i++) {
        var r = roads[i];
        var len = r.max - r.min;
        eps += 0.0015;
        var g = new THREE.PlaneGeometry(r.width, len);
        var uv = g.attributes.uv;
        for (var v = 0; v < uv.count; v++) uv.setY(v, uv.getY(v) * len / 14);
        g.rotateX(-Math.PI / 2);
        if (r.axis === 'x') g.rotateY(Math.PI / 2);
        var x = r.axis === 'z' ? r.pos : (r.min + r.max) / 2;
        var z = r.axis === 'x' ? r.pos : (r.min + r.max) / 2;
        g.translate(x, 0.04 + eps, z);
        this.roadGeos.push(g);
      }
    },

    buildBlocks: function () {
      for (var i = 0; i < VZ.length - 1; i++) {
        for (var j = 0; j < HX.length - 1; j++) {
          var v0 = VZ[i], v1 = VZ[i + 1], h0 = HX[j], h1 = HX[j + 1];
          if (v0.max < h1.pos - 5 || v0.min > h0.pos + 5) continue;
          if (v1.max < h1.pos - 5 || v1.min > h0.pos + 5) continue;
          if (h0.max < v1.pos - 5 || h0.min > v0.pos + 5) continue;
          if (h1.max < v1.pos - 5 || h1.min > v0.pos + 5) continue;
          var rect = [v0.pos + v0.width / 2, h0.pos + h0.width / 2, v1.pos - v1.width / 2, h1.pos - h1.width / 2];
          if (rect[2] - rect[0] < 16 || rect[3] - rect[1] < 16) continue;
          var skip = false;
          for (var k in LM) if (rectIntersect(rect, LM[k], 0.28)) { skip = true; break; }
          if (skip) continue;
          this.buildBlock(rect);
        }
      }
    },

    districtOf: districtOf,

    buildBlock: function (rect) {
      var inset = 3;
      var minX = rect[0], minZ = rect[1], maxX = rect[2], maxZ = rect[3];
      var w = maxX - minX, d = maxZ - minZ;
      var grey = 0x93948c;
      this.walkGeos.push(
        U.colorBox(w, 0.14, inset, minX + w / 2, 0.07, minZ + inset / 2, grey),
        U.colorBox(w, 0.14, inset, minX + w / 2, 0.07, maxZ - inset / 2, grey),
        U.colorBox(inset, 0.14, d - inset * 2, minX + inset / 2, 0.07, minZ + d / 2, grey),
        U.colorBox(inset, 0.14, d - inset * 2, maxX - inset / 2, 0.07, minZ + d / 2, grey)
      );
      var ix0 = minX + inset, iz0 = minZ + inset, ix1 = maxX - inset, iz1 = maxZ - inset;
      if (ix1 - ix0 < 12 || iz1 - iz0 < 12) return;
      var dist = districtOf((minX + maxX) / 2, (minZ + maxZ) / 2);
      var depth = (dist === 'montaud' || dist === 'stade') ? 9 : 12;
      var cd = depth;
      var self = this;

      function place(cx, cz, w2, d2, edgeLen) {
        if (w2 < 6 || d2 < 6) return;
        var rect2 = [cx - w2 / 2, cz - d2 / 2, cx + w2 / 2, cz + d2 / 2];
        for (var k in LM) if (rectHit(rect2, LM[k])) return;
        var floors, kind;
        if (dist === 'gare') { floors = U.randInt(5, 9); kind = 'modern'; }
        else if (dist === 'centre') { floors = U.randInt(4, 7); kind = Math.random() < 0.55 ? 'shops' : 'res'; }
        else if (dist === 'montaud' || dist === 'stade') { floors = U.randInt(2, 3); kind = 'res'; }
        else if (dist === 'nord') { floors = U.randInt(3, 5); kind = Math.random() < 0.3 ? 'shops' : 'res'; }
        else { floors = U.randInt(3, 6); kind = Math.random() < 0.35 ? 'shops' : 'res'; }
        var h = floors * 3.1 + U.rand(0.5, 1.5);
        var pal = palettes[kind === 'modern' ? 'gare' : (dist === 'montaud' || dist === 'stade') ? 'maison' : dist === 'centre' ? 'centre' : 'res'];
        var hex = U.pick(pal);
        var cols = Math.max(1, Math.round(edgeLen / 4));
        self.bGeos[kind].push(U.facadeBox(w2, h, d2, cx, h / 2, cz, hex, cols));
        self.addCollider(rect2[0], rect2[1], rect2[2], rect2[3]);
        if (floors <= 3 && Math.random() < 0.8) {
          self.solidGeos.push(U.colorCone(Math.min(w2, d2) * 0.74, U.rand(2.2, 3.2), cx, h + 1.3, cz, 0x8a4a3a));
        } else if (Math.random() < 0.3) {
          self.solidGeos.push(U.colorBox(w2 * 0.4, 1.2, d2 * 0.4, cx + U.rand(-2, 2), h + 0.6, cz + U.rand(-2, 2), 0x6a6a68));
        }
      }

      place(ix0 + cd / 2, iz0 + cd / 2, cd, cd, cd);
      place(ix1 - cd / 2, iz0 + cd / 2, cd, cd, cd);
      place(ix0 + cd / 2, iz1 - cd / 2, cd, cd, cd);
      place(ix1 - cd / 2, iz1 - cd / 2, cd, cd, cd);

      var run = function (a0, a1, fixed, axis) {
        var cur = a0;
        while (cur < a1 - 8) {
          var bw = U.rand(9, 17);
          if (cur + bw > a1) bw = a1 - cur;
          if (bw < 6) break;
          if (axis === 'x') place(cur + bw / 2, fixed + depth / 2, bw, depth, bw);
          else place(fixed + depth / 2, cur + bw / 2, depth, bw, bw);
          cur += bw + (Math.random() < 0.12 ? U.rand(2, 4) : 0.2);
        }
      };
      run(ix0 + cd, ix1 - cd, iz0, 'x');
      run(ix0 + cd, ix1 - cd, iz1 - depth, 'x');
      run(iz0 + cd, iz1 - cd, ix0, 'z');
      run(iz0 + cd, iz1 - cd, ix1 - depth, 'z');
    },

    buildLandmarks: function () {
      var scene = this._scene, self = this;
      var S = U.colorBox;

      var pl = LM.plaza;
      var pav = new THREE.Mesh(new THREE.PlaneGeometry(pl[2] - pl[0], pl[3] - pl[1]), new THREE.MeshLambertMaterial({ map: U.plazaTexture() }));
      pav.material.map.repeat.set(10, 10);
      pav.rotation.x = -Math.PI / 2;
      pav.position.set((pl[0] + pl[2]) / 2, 0.16, (pl[1] + pl[3]) / 2);
      pav.receiveShadow = true;
      scene.add(pav);
      this.solidGeos.push(
        U.colorCyl(6, 7, 1.1, 16, 70, 0.65, -30, 0xa8a49a),
        U.colorCyl(5, 5, 0.4, 16, 70, 1.25, -30, 0x3d6f88),
        U.colorCyl(0.8, 1.1, 3.5, 10, 70, 2.9, -30, 0xa8a49a)
      );
      this.addCollider(63, -37, 77, -23);
      var stallCols = [0xa83a32, 0x2f7a44, 0x33619e, 0xc8892f, 0x7a3f7a];
      for (var s = 0; s < 8; s++) {
        var a = s / 8 * Math.PI * 2 + 0.4;
        var sx = 70 + Math.cos(a) * 46, sz = -30 + Math.sin(a) * 46;
        this.solidGeos.push(
          S(3.2, 2.1, 2.2, sx, 1.2, sz, stallCols[s % 5]),
          S(3.6, 0.25, 2.6, sx, 2.45, sz, 0xe8e4da)
        );
        this.addCollider(sx - 1.8, sz - 1.3, sx + 1.8, sz + 1.3);
      }
      this.labels.push({ name: 'Place Jean Jaurès', x: 70, z: -30, big: true });

      this.solidGeos.push(
        S(66, 20, 16, -70, 10, -8, 0xcfc4ae),
        S(70, 2, 20, -70, 21, -8, 0xb8ad97),
        S(40, 1.2, 8, -70, 0.9, 8, 0xb0a68e)
      );
      for (var c2 = 0; c2 < 6; c2++) {
        this.solidGeos.push(U.colorCyl(0.8, 0.9, 12, 10, -98 + c2 * 11.2, 6, 2, 0xe2d9c4));
      }
      this.addCollider(-103, -16, -37, 0);
      this.labels.push({ name: 'Hôtel de Ville', x: -70, z: -10 });

      this.solidGeos.push(
        S(22, 24, 46, 230, 12, -160, 0xb8b0a4),
        S(13, 46, 13, 230, 23, -196, 0xb2aa9e),
        S(0.6, 6, 0.6, 230, 49, -196, 0x8a8a8a),
        S(3, 0.6, 0.6, 230, 51, -196, 0x8a8a8a)
      );
      this.addCollider(219, -183, 241, -137);
      this.addCollider(223, -203, 237, -183);
      this.labels.push({ name: 'Cathédrale Saint-Charles', x: 230, z: -160 });

      this.solidGeos.push(
        S(90, 12, 66, -340, 6, -285, 0x9fd4d8),
        S(94, 1.5, 70, -340, 13, -285, 0x5a7a80),
        U.colorCyl(7, 7, 34, 12, -300, 17, -320, 0xb8e0e4)
      );
      this.addCollider(-385, -318, -295, -252);
      this.addCollider(-307, -327, -293, -313);
      this.labels.push({ name: 'Cité du Design', x: -340, z: -285 });

      var pa = LM.parc;
      var grass = new THREE.Mesh(new THREE.PlaneGeometry(pa[2] - pa[0], pa[3] - pa[1]), new THREE.MeshLambertMaterial({ color: 0x5a8a4a }));
      grass.rotation.x = -Math.PI / 2;
      grass.position.set((pa[0] + pa[2]) / 2, 0.06, (pa[1] + pa[3]) / 2);
      grass.receiveShadow = true;
      scene.add(grass);
      this.flatGeos.push(U.colorBox(26, 0.06, 12, 740, 0.12, 440, 0x3f6f88));
      for (var t = 0; t < 24; t++) this.treeList.push([U.rand(pa[0] + 6, pa[2] - 6), U.rand(pa[1] + 6, pa[3] - 6)]);
      this.labels.push({ name: "Parc de l'Europe", x: 720, z: 440 });

      var st = LM.stade;
      var pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshLambertMaterial({ map: U.pitchTexture() }));
      pitch.rotation.x = -Math.PI / 2;
      pitch.position.set(-500, 0.12, 700);
      scene.add(pitch);
      var stands = [
        [st[0] + 8, st[1] + 6, st[2] - st[0] - 16, 16],
        [st[0] + 8, st[3] - 22, st[2] - st[0] - 16, 16],
        [st[0] + 6, st[1] + 6, 16, st[3] - st[1] - 12],
        [st[2] - 22, st[1] + 6, 16, st[3] - st[1] - 12]
      ];
      stands.forEach(function (sdt) {
        var wdt = sdt[2], ddt = sdt[3];
        var cx2 = sdt[0] + wdt / 2, cz2 = sdt[1] + ddt / 2;
        self.solidGeos.push(S(wdt, 13, ddt, cx2, 6.5, cz2, 0xe4e2dc));
        self.solidGeos.push(S(wdt - 4, 2.5, ddt - 4, cx2, 14.5, cz2, 0x1a7a3c));
        self.solidGeos.push(S(wdt + 2, 0.8, ddt + 2, cx2, 17, cz2, 0xd8d6d0));
        self.addCollider(sdt[0], sdt[1], sdt[0] + wdt, sdt[1] + ddt);
      });
      [[-570, 562], [-570, 838], [-440, 562], [-440, 838]].forEach(function (fp) {
        self.solidGeos.push(U.colorCyl(0.6, 0.9, 32, 8, fp[0], 16, fp[1], 0xc8c8c8));
        self.solidGeos.push(S(4, 2.4, 1.4, fp[0], 33, fp[1], 0xf0f0e8));
      });
      this.labels.push({ name: 'Stade Geoffroy-Guichard', x: -500, z: 700, big: true });

      this.solidGeos.push(
        S(150, 14, 60, 875, 7, -275, 0xc4ccd0),
        S(154, 2, 64, 875, 15, -275, 0x8fa0a8),
        S(10, 24, 10, 830, 12, -230, 0xd0d8dc),
        U.colorCyl(2.2, 2.2, 1, 14, 830, 25, -230, 0xf0f0ea)
      );
      this.addCollider(800, -305, 950, -245);
      this.addCollider(825, -235, 835, -225);
      for (var pf = 0; pf < 3; pf++) {
        var pz = -300 + pf * 25;
        this.solidGeos.push(S(90, 1, 7, 970, 0.5, pz, 0xb8b4a8));
        this.flatGeos.push(S(220, 0.08, 5, 990, 0.14, pz - 10, 0x2a2c30));
        this.flatGeos.push(S(220, 0.08, 5, 990, 0.14, pz + 10, 0x2a2c30));
      }
      this.solidGeos.push(S(3, 3.4, 20, 940, 2.2, -290, 0x9a3040));
      this.solidGeos.push(S(3, 3.4, 46, 960, 2.2, -300, 0xb03848));
      this.solidGeos.push(S(3, 3.2, 40, 950, 2.2, -280, 0x884048));
      this.addCollider(938, -292, 942, -288);
      this.addCollider(958, -302, 962, -298);
      this.addCollider(948, -282, 952, -278);
      this.labels.push({ name: 'Gare de Châteaucreux', x: 875, z: -275, big: true });
    },

    onRoad: function (x, z) {
      for (var i = 0; i < roads.length; i++) {
        var r = roads[i];
        if (r.axis === 'z') {
          if (Math.abs(x - r.pos) < r.width / 2 + 3 && z >= r.min && z <= r.max) return true;
        } else {
          if (Math.abs(z - r.pos) < r.width / 2 + 3 && x >= r.min && x <= r.max) return true;
        }
      }
      return false;
    },

    buildProps: function (q) {
      var dens = q.propDensity;
      var lampPos = [];
      var self = this;

      roads.forEach(function (r) {
        var step = 34 / dens;
        var side = 1;
        for (var a = r.min + 18; a < r.max - 18; a += step) {
          var off = (r.width / 2 + 1.2) * side;
          if (r.axis === 'z') lampPos.push([r.pos + off, a]);
          else lampPos.push([a, r.pos + off]);
          side = -side;
        }
      });

      for (var i = 0; i < VZ.length - 1; i++) for (var j = 0; j < HX.length - 1; j++) {
        if (Math.random() < 0.2 * dens) {
          var bx = (VZ[i].pos + VZ[i + 1].pos) / 2, bz = (HX[j].pos + HX[j + 1].pos) / 2;
          this.treeList.push([bx + U.rand(-18, 18), bz + U.rand(-18, 18)]);
        }
      }
      for (var m = 0; m < 46 * dens; m++) this.treeList.push([U.rand(-880, -470), U.rand(-600, 800)]);

      var self2 = this;
      this.treeList = this.treeList.filter(function (p) {
        if (p[0] < -930 || p[0] > 1020 || p[1] < -730 || p[1] > 840) return false;
        for (var k in LM) if (p[0] > LM[k][0] && p[0] < LM[k][2] && p[1] > LM[k][1] && p[1] < LM[k][3]) {
          return k === 'parc' || k === 'plaza';
        }
        return !self2.onRoad(p[0], p[1]) && !self2.blockedSpot(p[0], p[1]);
      });

      var majorsV = VZ.filter(function (r) { return r.major; });
      var majorsH = HX.filter(function (r) { return r.major; });
      var tlNodes = [];
      majorsV.forEach(function (rv) {
        majorsH.forEach(function (rh) {
          if (rv.pos >= rh.min && rv.pos <= rh.max && rh.pos >= rv.min && rh.pos <= rv.max) {
            tlNodes.push({ x: rv.pos, z: rh.pos });
          }
        });
      });
      this.tlNodes = tlNodes;

      var lampGeoPole = new THREE.CylinderGeometry(0.09, 0.13, 6, 6);
      lampGeoPole.translate(0, 3, 0);
      var lampGeoArm = new THREE.BoxGeometry(0.1, 0.1, 1.6);
      lampGeoArm.translate(0, 5.9, -0.7);
      this.lampMat = new THREE.MeshLambertMaterial({ color: 0x4a4d50, emissive: 0xffdf9e, emissiveIntensity: 0 });
      var lampGeoBulb = new THREE.SphereGeometry(0.28, 8, 6);
      lampGeoBulb.translate(0, 5.75, -1.4);
      var nL = Math.max(1, Math.floor(lampPos.length * dens));
      var lampInst = new THREE.InstancedMesh(U.mergeGeoms([lampGeoPole, lampGeoArm]), new THREE.MeshLambertMaterial({ color: 0x4a4d50 }), nL);
      this.lampBulbs = new THREE.InstancedMesh(lampGeoBulb, this.lampMat, nL);
      var dummy = new THREE.Object3D();
      for (var li = 0; li < nL; li++) {
        var lp = lampPos[Math.floor(li * lampPos.length / nL)];
        dummy.position.set(lp[0], 0.15, lp[1]);
        dummy.rotation.y = (li % 2) ? 0 : Math.PI;
        dummy.updateMatrix();
        lampInst.setMatrixAt(li, dummy.matrix);
        this.lampBulbs.setMatrixAt(li, dummy.matrix);
      }
      this._scene.add(lampInst);
      this._scene.add(this.lampBulbs);

      var trunkG = new THREE.CylinderGeometry(0.16, 0.22, 2.4, 6);
      trunkG.translate(0, 1.2, 0);
      var folG = new THREE.IcosahedronGeometry(1.7, 0);
      folG.translate(0, 3.6, 0);
      var trunkInst = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x5e4a38 }), Math.max(1, this.treeList.length));
      var folInst = new THREE.InstancedMesh(folG, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, this.treeList.length));
      var cTmp = new THREE.Color();
      for (var ti = 0; ti < this.treeList.length; ti++) {
        var tp = this.treeList[ti];
        var sc = U.rand(0.8, 1.5);
        dummy.position.set(tp[0], 0, tp[1]);
        dummy.rotation.y = U.rand(0, 6.28);
        dummy.scale.set(sc, sc * U.rand(0.9, 1.25), sc);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(ti, dummy.matrix);
        folInst.setMatrixAt(ti, dummy.matrix);
        folInst.setColorAt(ti, cTmp.setHex(U.pick([0x3f7a34, 0x4a8a3a, 0x35692c, 0x54923f])));
        this.addCollider(tp[0] - 0.4, tp[1] - 0.4, tp[0] + 0.4, tp[1] + 0.4);
      }
      if (folInst.instanceColor) folInst.instanceColor.needsUpdate = true;
      trunkInst.castShadow = true; folInst.castShadow = true;
      this._scene.add(trunkInst);
      this._scene.add(folInst);

      var poleG = new THREE.CylinderGeometry(0.1, 0.14, 5.2, 6);
      poleG.translate(0, 2.6, 0);
      var tlPole = new THREE.InstancedMesh(poleG, new THREE.MeshLambertMaterial({ color: 0x3a3d40 }), Math.max(1, tlNodes.length * 2));
      this.tlNSMat = new THREE.MeshBasicMaterial({ color: 0x22cc55 });
      this.tlEWMat = new THREE.MeshBasicMaterial({ color: 0xcc2222 });
      var boxG = new THREE.BoxGeometry(0.5, 1.1, 0.5);
      var tlNS = new THREE.InstancedMesh(boxG, this.tlNSMat, Math.max(1, tlNodes.length * 2));
      var tlEW = new THREE.InstancedMesh(boxG, this.tlEWMat, Math.max(1, tlNodes.length * 2));
      var idx = 0;
      tlNodes.forEach(function (n) {
        [[n.x - 10, n.z - 10], [n.x + 10, n.z + 10]].forEach(function (p) {
          dummy.position.set(p[0], 0, p[1]);
          dummy.rotation.y = 0; dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          tlPole.setMatrixAt(idx, dummy.matrix);
          dummy.position.set(p[0], 4.8, p[1]);
          dummy.updateMatrix();
          tlNS.setMatrixAt(idx, dummy.matrix);
          tlEW.setMatrixAt(idx, dummy.matrix);
          idx++;
        });
      });
      this._scene.add(tlPole);
      this._scene.add(tlNS);
      this._scene.add(tlEW);

      this.buildParked(q);
    },

    blockedSpot: function (x, z) {
      var out = [];
      this.colliders.queryRect(x - 2, z - 2, x + 2, z + 2, out);
      return out.length > 0;
    },

    buildParked: function (q) {
      var spots = [];
      var self = this;
      roads.forEach(function (r) {
        var step = 26;
        for (var a = r.min + 22; a < r.max - 22; a += step) {
          if (Math.random() < 0.32) {
            var side = Math.random() < 0.5 ? 1 : -1;
            var off = (r.width / 2 - 0.7) * side;
            var x, z, h;
            if (r.axis === 'z') { x = r.pos + off; z = a; h = side > 0 ? Math.PI : 0; }
            else { x = a; z = r.pos + off; h = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
            var ok = true;
            for (var k in LM) if (x > LM[k][0] - 6 && x < LM[k][2] + 6 && z > LM[k][1] - 6 && z < LM[k][3] + 6) ok = false;
            if (ok) spots.push([x, z, h, Math.floor(U.rand(0, G.CONFIG.carColors.length))]);
          }
        }
      });
      var n = Math.min(spots.length, q.parked);
      if (n === 0) return;
      var bodyG = new THREE.BoxGeometry(4.1, 0.85, 1.8);
      bodyG.translate(0, 0.75, 0);
      var det = [new THREE.BoxGeometry(2.3, 0.7, 1.7)];
      det[0].translate(0, 1.5, 0);
      [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]].forEach(function (p) {
        det.push(U.coloredGeo(new THREE.BoxGeometry(0.6, 0.55, 0.3), 0x1a1a1a, p[0], 0.35, p[1]));
      });
      var detG = U.mergeGeoms(det);
      this.parkedBody = new THREE.InstancedMesh(bodyG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
      this.parkedDet = new THREE.InstancedMesh(detG, new THREE.MeshLambertMaterial({ color: 0x24262a }), n);
      var dummy = new THREE.Object3D(), cT = new THREE.Color();
      for (var i = 0; i < n; i++) {
        var sp = spots[i];
        dummy.position.set(sp[0], 0, sp[1]);
        dummy.rotation.y = sp[2];
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.parkedBody.setMatrixAt(i, dummy.matrix);
        this.parkedDet.setMatrixAt(i, dummy.matrix);
        this.parkedBody.setColorAt(i, cT.setHex(G.CONFIG.carColors[sp[3]]));
        var vert = Math.abs(Math.abs(sp[2]) - Math.PI / 2) < 0.1;
        if (vert) this.addCollider(sp[0] - 1.1, sp[1] - 2.2, sp[0] + 1.1, sp[1] + 2.2);
        else this.addCollider(sp[0] - 2.2, sp[1] - 1.1, sp[0] + 2.2, sp[1] + 1.1);
      }
      if (this.parkedBody.instanceColor) this.parkedBody.instanceColor.needsUpdate = true;
      this._scene.add(this.parkedBody);
      this._scene.add(this.parkedDet);
    },

    buildHills: function () {
      var scene = this._scene;
      var mat = new THREE.MeshLambertMaterial({ color: 0x5a7a48 });
      var hills = [
        [100, 1080, 380, 130], [600, 1120, 300, 100], [-500, 1080, 340, 110],
        [200, -950, 320, 110], [-600, -920, 280, 95],
        [-1150, 200, 420, 140], [-1100, -400, 300, 100], [1200, 300, 360, 120], [1250, -300, 280, 100]
      ];
      hills.forEach(function (h) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(h[2], 18, 10), mat);
        m.scale.y = h[3] / h[2];
        m.position.set(h[0], -h[3] * 0.35, h[1]);
        scene.add(m);
      });
      for (var i = 0; i < 70; i++) {
        var a = Math.random() * Math.PI * 2, r = U.rand(1050, 1400);
        var x = 50 + Math.cos(a) * r, z = 100 + Math.sin(a) * r;
        if (x > -1000 && x < 1100 && z > -800 && z < 1000) continue;
        this.treeList.push([x, z]);
      }
    },

    buildBounds: function () {
      var B = G.CONFIG.world.bounds;
      this.addCollider(B.minX - 40, B.minZ - 40, B.maxX + 40, B.minZ + 8);
      this.addCollider(B.minX - 40, B.maxZ - 8, B.maxX + 40, B.maxZ + 40);
      this.addCollider(B.minX - 40, B.minZ - 40, B.minX + 8, B.maxZ + 40);
      this.addCollider(B.maxX - 8, B.minZ - 40, B.maxX + 40, B.maxZ + 40);
    },

    resolveCircle: function (px, pz, r) {
      var out = [], hit = false;
      this.colliders.queryRect(px - r - 1, pz - r - 1, px + r + 1, pz + r + 1, out);
      for (var i = 0; i < out.length; i++) {
        var b = out[i];
        var cx = U.clamp(px, b.minX, b.maxX), cz = U.clamp(pz, b.minZ, b.maxZ);
        var dx = px - cx, dz = pz - cz;
        var d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          hit = true;
          if (d2 > 0.0001) {
            var d = Math.sqrt(d2);
            px = cx + dx / d * r; pz = cz + dz / d * r;
          } else {
            var dl = px - b.minX, dr = b.maxX - px, dtp = pz - b.minZ, db = b.maxZ - pz;
            var mn = Math.min(dl, dr, dtp, db);
            if (mn === dl) px = b.minX - r;
            else if (mn === dr) px = b.maxX + r;
            else if (mn === dtp) pz = b.minZ - r;
            else pz = b.maxZ + r;
          }
        }
      }
      return { x: px, z: pz, hit: hit };
    },

    setNight: function (n) {
      if (n === this.isNight) return;
      this.isNight = n;
      if (this.lampMat) this.lampMat.emissiveIntensity = n;
      for (var k in this.buildingMats) this.buildingMats[k].emissiveIntensity = n * 1.05;
    },

    prerenderMap: function () {
      var size = 1600;
      var map = { minX: -1080, minZ: -880, size: 2260 };
      var s = size / map.size;
      this.mapScale = s;
      this.mapOrigin = map;
      var c = document.createElement('canvas');
      c.width = size; c.height = size;
      var g = c.getContext('2d');
      g.fillStyle = '#252a30';
      g.fillRect(0, 0, size, size);
      g.fillStyle = '#2e3a2c';
      [[100, 1080, 380], [600, 1120, 300], [-500, 1080, 340], [200, -950, 320], [-600, -920, 280], [-1150, 200, 420], [-1100, -400, 300], [1200, 300, 360], [1250, -300, 280]].forEach(function (h) {
        g.beginPath();
        g.arc((h[0] - map.minX) * s, (h[1] - map.minZ) * s, h[2] * s, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = '#39543a';
      var pa = LM.parc;
      g.fillRect((pa[0] - map.minX) * s, (pa[1] - map.minZ) * s, (pa[2] - pa[0]) * s, (pa[3] - pa[1]) * s);
      g.fillStyle = '#2d5a72';
      g.fillRect((-890 - map.minX) * s, (-282 - map.minZ) * s, 1900 * s, 26 * s);
      roads.forEach(function (r) {
        g.strokeStyle = r.major ? '#878d94' : '#6d737a';
        g.lineWidth = Math.max(2, r.width * s);
        g.beginPath();
        if (r.axis === 'z') {
          g.moveTo((r.pos - map.minX) * s, (r.min - map.minZ) * s);
          g.lineTo((r.pos - map.minX) * s, (r.max - map.minZ) * s);
        } else {
          g.moveTo((r.min - map.minX) * s, (r.pos - map.minZ) * s);
          g.lineTo((r.max - map.minX) * s, (r.pos - map.minZ) * s);
        }
        g.stroke();
      });
      var pl = LM.plaza;
      g.fillStyle = '#7d838a';
      g.fillRect((pl[0] - map.minX) * s, (pl[1] - map.minZ) * s, (pl[2] - pl[0]) * s, (pl[3] - pl[1]) * s);
      var st = LM.stade;
      g.fillStyle = '#2a6e38';
      g.fillRect((st[0] - map.minX) * s, (st[1] - map.minZ) * s, (st[2] - st[0]) * s, (st[3] - st[1]) * s);
      var ga = LM.gare;
      g.fillStyle = '#556069';
      g.fillRect((ga[0] - map.minX) * s, (ga[1] - map.minZ) * s, (ga[2] - ga[0]) * s, (ga[3] - ga[1]) * s);
      this.mapCanvas = c;
    }
  };
})();
