window.G = window.G || {};
G.CONFIG = {
  version: '1.0.0',
  saveKey: 'gta42_save_v1',
  world: {
    bounds: { minX: -950, maxX: 1050, minZ: -750, maxZ: 950 },
    laneOffset: 2.6,
    dayLength: 480
  },
  qualityPresets: {
    bas:   { pixelRatio: 1,    fogFar: 430, shadows: false, traffic: 16, peds: 14, propDensity: 0.5,  rain: 500,  parked: 50 },
    moyen: { pixelRatio: 1.35, fogFar: 640, shadows: false, traffic: 30, peds: 26, propDensity: 0.75, rain: 900,  parked: 90 },
    haut:  { pixelRatio: 2,    fogFar: 900, shadows: true,  traffic: 44, peds: 38, propDensity: 1,    rain: 1400, parked: 120 }
  },
  vehicles: {
    citadine:     { name: 'Berliet Compact',    len: 3.8, wid: 1.75, maxSpeed: 32, accel: 8,   brake: 18, grip: 8.5 },
    berline:      { name: 'Berline Présidence', len: 4.7, wid: 1.85, maxSpeed: 38, accel: 7,   brake: 17, grip: 8.0 },
    sportive:     { name: 'S-42 Sport',         len: 4.2, wid: 1.90, maxSpeed: 50, accel: 12,  brake: 22, grip: 10.0 },
    fourgonnette: { name: 'Fourgon Furan',      len: 4.9, wid: 2.00, maxSpeed: 26, accel: 5,   brake: 15, grip: 7.0 },
    taxi:         { name: 'Taxi Jaurès',        len: 4.4, wid: 1.80, maxSpeed: 34, accel: 7.5, brake: 17, grip: 8.2 }
  },
  carColors: [0xc23b32, 0x2f6db3, 0xe0e0e0, 0x2b2f33, 0x1a7a3c, 0xd9a13b, 0x7a8894, 0x8a3f7a]
};
