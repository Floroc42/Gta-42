(function () {
  var U = G.utils;

  G.missions = {
    defs: [
      {
        id: 'm0', name: 'Bienvenue à Saint-Étienne', reward: 200,
        steps: [
          { x: 60, z: 44, r: 7, text: "Allez jusqu'à votre voiture garée près de la place." },
          { x: 70, z: 10, r: 10, text: "Conduisez jusqu'à la Place Jean Jaurès.", needCar: true }
        ]
      },
      {
        id: 'm1', name: 'Livraison au stade', reward: 500, time: 100,
        steps: [
          { x: 70, z: -30, r: 12, text: 'Récupérez le colis place Jean Jaurès.' },
          { x: -500, z: 520, r: 12, text: "Livrez-le à l'entrée du stade Geoffroy-Guichard." }        ]
      },
      {
        id: 'm2', name: 'Navette Châteaucreux', reward: 450,
        steps: [
          { x: 770, z: -260, r: 10, text: 'Prenez le voyageur en face de la gare.' },
          { x: -340, z: -250, r: 10, text: 'Déposez-le à la Cité du Design.' }
        ]
      },
      {
        id: 'm3', name: 'Fournitures du Montaud', reward: 600,
        steps: [
          { x: -720, z: -100, r: 10, text: 'Colis 1/3 — Quartier du Montaud.' },
          { x: -750, z: 300, r: 10, text: 'Colis 2/3 — Vers Montaud sud.' },
          { x: -620, z: 560, r: 10, text: 'Colis 3/3 — Retour vers le stade.' }
        ]
      },
      {
        id: 'm4', name: 'Circuit du centre', reward: 800, time: 170,
        steps: [
          { x: 0, z: -350, r: 12, text: 'Checkpoint 1/5 — Boulevard Thiers.' },
          { x: 320, z: -100, r: 12, text: 'Checkpoint 2/5 — Fauriel nord.' },
          { x: 320, z: 360, r: 12, text: 'Checkpoint 3/5 — Fauriel sud.' },
          { x: 0, z: 200, r: 12, text: "Checkpoint 4/5 — Rue de l'Industrie." },
          { x: 70, z: 10, r: 12, text: 'Checkpoint 5/5 — Retour à Jean Jaurès.' }
        ]
      }
    ],

    init: function (scene) {
      this.scene = scene;
      this.active = null;
      this.stepIdx = 0;
      this.timer = 0;

      var beamG = new THREE.CylinderGeometry(1.2, 1.2, 70, 12, 1, true);
      beamG.translate(0, 35, 0);
      this.beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({
        color: 0x35d46a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide
      }));
      this.ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.18, 8, 32), new THREE.MeshBasicMaterial({ color: 0x35d46a }));
      this.ring.rotation.x = Math.PI / 2;
      this.ring.position.y = 0.5;
      this.pad = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.15, 24), new THREE.MeshBasicMaterial({ color: 0x35d46a, transparent: true, opacity: 0.4 }));
      this.pad.position.y = 0.12;
      var wpG = new THREE.CylinderGeometry(1, 1, 60, 10, 1, true);
      wpG.translate(0, 30, 0);
      this.wpBeam = new THREE.Mesh(wpG, new THREE.MeshBasicMaterial({
        color: 0x3a9ad4, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide
      }));
      this.wpBeam.visible = false;
      scene.add(this.beam);
      scene.add(this.ring);
      scene.add(this.pad);
      scene.add(this.wpBeam);

      this.packMeshes = [];
      var pg = new THREE.TorusKnotGeometry(0.5, 0.16, 40, 8);
      var self = this;
      G.city.packages.forEach(function (p) {
        var m = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: 0x1a7a3c, emissive: 0x0f4a22, emissiveIntensity: 0.6 }));
        m.position.set(p[0], 1.2, p[1]);
        scene.add(m);
        self.packMeshes.push(m);
      });
      (G.save.data.packages || []).forEach(function (i) { self.packMeshes[i].visible = false; });
      this.startNext();
    },

    startNext: function () {
      var done = G.save.data.missions;
      for (var i = 0; i < this.defs.length; i++) {
        var d = this.defs[i];
        if (!done[d.id]) {
          this.active = d;
          this.stepIdx = 0;
          this.timer = d.time || 0;
          this.setMarker(d.steps[0]);
          G.ui.setMission(d.name, d.steps[0].text, d.time || 0);
          G.ui.toast('Nouvelle mission : ' + d.name);
          return;
        }
      }
      this.active = null;
      this.beam.visible = this.ring.visible = this.pad.visible = false;
      G.ui.setMission(null);
      G.ui.toast('Toutes les missions sont terminées ! Explorez la ville librement.');
    },

    setMarker: function (step) {
      this.beam.visible = this.ring.visible = this.pad.visible = true;
      this.beam.position.set(step.x, 0, step.z);
      this.ring.position.set(step.x, 0.5, step.z);
      this.pad.position.set(step.x, 0.12, step.z);
      this.target = step;
    },

    setWaypoint: function (x, z) {
      this.waypoint = { x: x, z: z };
      this.wpBeam.position.set(x, 0, z);
      this.wpBeam.visible = true;
      G.ui.toast('Itinéraire défini');
    },

    complete: function () {
      var d = this.active;
      G.save.data.missions[d.id] = true;
      G.save.data.money += d.reward;
      G.save.write();
      G.ui.toast('Mission terminée : +' + d.reward + ' €');
      if (G.audio) G.audio.chime();
      this.active = null;
      this.beam.visible = this.ring.visible = this.pad.visible = false;
      var self = this;
      setTimeout(function () { if (G.game.state === 'play') self.startNext(); }, 3500);
    },

    fail: function () {
      G.ui.toast('Mission échouée. Retentez quand vous voulez.');
      if (G.audio) G.audio.fail();
      this.active = null;
      this.beam.visible = this.ring.visible = this.pad.visible = false;
      var self = this;
      setTimeout(function () { if (G.game.state === 'play') self.startNext(); }, 4000);
    },

    update: function (dt, player) {
      var i;
      for (i = 0; i < this.packMeshes.length; i++) {
        var m = this.packMeshes[i];
        if (!m.visible) continue;
        m.rotation.y += dt * 2;
        m.position.y = 1.2 + Math.sin(performance.now() / 400 + i) * 0.15;
        var dxp = m.position.x - player.pos.x, dzp = m.position.z - player.pos.z;
        if (dxp * dxp + dzp * dzp < 6.25) {
          m.visible = false;
          G.save.data.packages.push(i);
          G.save.data.money += 100;
          G.save.write();
          G.ui.toast('Ruban vert trouvé ! +100 € (' + G.save.data.packages.length + '/10)');
          if (G.audio) G.audio.chime();
        }
      }

      if (this.ring.visible) this.ring.rotation.z += dt;
      if (this.waypoint) {
        var dwx = this.waypoint.x - player.pos.x, dwz = this.waypoint.z - player.pos.z;
        if (dwx * dwx + dwz * dwz < 25) {
          this.waypoint = null;
          this.wpBeam.visible = false;
        }
      }

      if (!this.active) return;
      var d = this.active;
      if (d.time) {
        this.timer -= dt;
        if (this.timer <= 0) { this.fail(); return; }
      }
      var step = d.steps[this.stepIdx];
      var dx = step.x - player.pos.x, dz = step.z - player.pos.z;
      if (dx * dx + dz * dz < (step.r || 6) * (step.r || 6)) {
        if (step.needCar && !player.inCar) {
          G.ui.setMission(d.name, step.text + ' (en voiture !)', d.time ? Math.ceil(this.timer) : 0);
          return;
        }
        this.stepIdx++;
        if (this.stepIdx >= d.steps.length) { this.complete(); return; }
        var ns = d.steps[this.stepIdx];
        this.setMarker(ns);
        G.ui.setMission(d.name, ns.text, d.time ? Math.ceil(this.timer) : 0);
      } else {
        G.ui.setMission(d.name, step.text, d.time ? Math.ceil(this.timer) : 0);
      }
    }
  };
})();
