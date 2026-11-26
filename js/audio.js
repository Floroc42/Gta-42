(function () {
  G.audio = {
    ctx: null,
    init: function () {
      if (this.ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = G.save.data.settings.volume;
      this.master.connect(ctx.destination);

      var noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noise.getChannelData(0), last = 0;
      for (var i = 0; i < d.length; i++) {
        last = last * 0.98 + (Math.random() * 2 - 1) * 0.04;
        d[i] = last * 3;
      }
      this.noiseBuf = noise;

      var amb = ctx.createBufferSource();
      amb.buffer = noise; amb.loop = true;
      var ambF = ctx.createBiquadFilter(); ambF.type = 'lowpass'; ambF.frequency.value = 320;
      var ambG = ctx.createGain(); ambG.gain.value = 0.05;
      amb.connect(ambF); ambF.connect(ambG); ambG.connect(this.master);
      amb.start();

      var rain = ctx.createBufferSource();
      rain.buffer = noise; rain.loop = true; rain.playbackRate.value = 2.2;
      var rainF = ctx.createBiquadFilter(); rainF.type = 'highpass'; rainF.frequency.value = 1400;
      this.rainG = ctx.createGain(); this.rainG.gain.value = 0;
      rain.connect(rainF); rainF.connect(this.rainG); this.rainG.connect(this.master);
      rain.start();

      this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
      this.engFilt = ctx.createBiquadFilter(); this.engFilt.type = 'lowpass'; this.engFilt.frequency.value = 700;
      this.engGain.connect(this.engFilt); this.engFilt.connect(this.master);
      this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth'; this.osc1.frequency.value = 60;
      this.osc2 = ctx.createOscillator(); this.osc2.type = 'square'; this.osc2.frequency.value = 30;
      var o2g = ctx.createGain(); o2g.gain.value = 0.4;
      this.osc1.connect(this.engGain); this.osc2.connect(o2g); o2g.connect(this.engGain);
      this.osc1.start(); this.osc2.start();

      this.hornG = ctx.createGain(); this.hornG.gain.value = 0;
      this.hornG.connect(this.master);
      this.hornOsc = [];
      [392, 523].forEach(function (f) {
        var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
        o.connect(G.audio.hornG); o.start(); G.audio.hornOsc.push(o);
      });
    },
    resume: function () {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    setVolume: function (v) {
      if (this.master) this.master.gain.value = v;
    },
    engine: function (rpm, throttle, on) {
      if (!this.ctx) return;
      var t = this.ctx.currentTime;
      var f = on ? 55 + rpm * 175 : 40;
      this.osc1.frequency.setTargetAtTime(f, t, 0.06);
      this.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
      var g = on ? 0.025 + throttle * 0.07 + rpm * 0.05 : 0;
      this.engGain.gain.setTargetAtTime(Math.min(g, 0.16), t, 0.1);
    },
    rain: function (v) {
      if (!this.ctx) return;
      this.rainG.gain.setTargetAtTime(v * 0.12, this.ctx.currentTime, 0.6);
    },
    horn: function (on) {
      if (!this.ctx) return;
      this.hornG.gain.setTargetAtTime(on ? 0.07 : 0, this.ctx.currentTime, 0.02);
    },
    thud: function (intensity) {
      if (!this.ctx || intensity <= 0.05) return;
      var ctx = this.ctx, t = ctx.currentTime;
      var src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      var g = ctx.createGain();
      g.gain.setValueAtTime(Math.min(0.5, intensity * 0.6), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t, Math.random()); src.stop(t + 0.3);
    },
    tone: function (freq, delay, dur, vol, type) {
      if (!this.ctx) return;
      var ctx = this.ctx, t = ctx.currentTime + delay;
      var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.05);
    },
    chime: function () {
      this.tone(523, 0, 0.25, 0.1);
      this.tone(659, 0.12, 0.25, 0.1);
      this.tone(784, 0.24, 0.4, 0.12);
    },
    fail: function () {
      this.tone(220, 0, 0.3, 0.1, 'square');
      this.tone(174, 0.2, 0.4, 0.1, 'square');
    }
  };
})();
