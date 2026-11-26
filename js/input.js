(function () {
  var I = G.input = {
    keys: {},
    pressed: {},
    joy: { x: 0, y: 0, active: false },
    touch: { accel: false, brake: false, sprint: false, horn: false },
    isTouch: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
    _map: {
      'KeyW': 'up', 'ArrowUp': 'up',
      'KeyS': 'down', 'ArrowDown': 'down',
      'KeyA': 'left', 'ArrowLeft': 'left',
      'KeyD': 'right', 'ArrowRight': 'right',
      'ShiftLeft': 'sprint', 'ShiftRight': 'sprint',
      'Space': 'handbrake',
      'KeyE': 'enter', 'KeyF': 'enter',
      'KeyC': 'camera',
      'KeyM': 'map',
      'KeyH': 'horn',
      'Escape': 'pause', 'KeyP': 'pause'
    },
    press: function (name) { this.pressed[name] = true; },
    wasPressed: function (name) { return !!this.pressed[name]; },
    isDown: function (name) {
      if (name === 'sprint') return !!(this.keys.sprint || this.touch.sprint || (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.92));
      if (name === 'handbrake') return !!this.keys.handbrake;
      return false;
    },
    endFrame: function () { this.pressed = {}; },
    init: function () {
      var self = this;
      document.addEventListener('keydown', function (e) {
        var name = self._map[e.code];
        if (!name) return;
        if (name === 'up' || name === 'down' || name === 'left' || name === 'right' || name === 'handbrake' || e.code === 'Space') e.preventDefault();
        if (!self.keys[name]) self.press(name);
        self.keys[name] = true;
        if (G.audio) G.audio.resume();
      });
      document.addEventListener('keyup', function (e) {
        var name = self._map[e.code];
        if (name) self.keys[name] = false;
      });
      window.addEventListener('blur', function () {
        self.keys = {};
        self.touch.accel = self.touch.brake = false;
        self.touch.horn = false;
        self.joy.active = false;
      });
    },
    driveInput: function () {
      var th = 0, br = 0, st = 0;
      if (this.keys.up) th = 1;
      if (this.keys.down) br = 1;
      if (this.keys.left) st -= 1;
      if (this.keys.right) st += 1;
      if (this.joy.active) {
        th = Math.max(th, Math.max(0, -this.joy.y));
        br = Math.max(br, Math.max(0, this.joy.y));
        st = this.joy.x;
      }
      if (this.touch.accel) th = 1;
      if (this.touch.brake) br = 1;
      return { throttle: th, brake: br, steer: st, handbrake: !!this.keys.handbrake };
    },
    footInput: function () {
      var x = 0, y = 0;
      if (this.keys.up) y -= 1;
      if (this.keys.down) y += 1;
      if (this.keys.left) x -= 1;
      if (this.keys.right) x += 1;
      if (this.joy.active) { x = this.joy.x; y = this.joy.y; }
      var len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x: x, y: y, sprint: this.isDown('sprint') };
    }
  };
})();
