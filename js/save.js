(function () {
  var defaultsFn = function () {
    return {
      money: 500,
      missions: {},
      packages: [],
      pos: null,
      tod: 10.5,
      settings: { quality: 'auto', volume: 0.7, camDist: 1 }
    };
  };
  G.save = {
    data: null,
    load: function () {
      try {
        var raw = localStorage.getItem(G.CONFIG.saveKey);
        this.data = raw ? Object.assign(defaultsFn(), JSON.parse(raw)) : defaultsFn();
      } catch (e) { this.data = defaultsFn(); }
      return this.data;
    },
    write: function () {
      try { localStorage.setItem(G.CONFIG.saveKey, JSON.stringify(this.data)); } catch (e) {}
    },
    reset: function () {
      this.data = defaultsFn();
      this.write();
    }
  };
})();
