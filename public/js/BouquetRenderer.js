(function () {
  'use strict';
  if (window.BloomBouquetRenderer) return;

  var THREE_SPECIFIER = 'three';
  var ORBIT_SPECIFIER = 'three/addons/controls/OrbitControls.js';
  var EXPORTER_SPECIFIER = 'three/addons/exporters/GLTFExporter.js';
  var ROOM_SPECIFIER = 'three/addons/environments/RoomEnvironment.js';

  var renderer, scene, camera, controls, bouquetGroup, animId, pmrem, envTex;
  var container = null, loaded = false, initPromise = null;
  var THREE = null, OrbitControls = null, GLTFExporter = null, RoomEnvironment = null;
  var junctionTex = null, kraftTex = null, silkTex = null, velvetTex = null, satinTex = null;
  var logoTex = null, customTex = null, logoUrlCached = null, customUrlCached = null;

  var TIE_Y = -0.30;
  var BUNDLE_BOTTOM_Y = -0.92;

  var currentConfig = {
    flower: 'rose', color: '#DC143C', bloomCount: 12,
    wrappingPremium: false, wrappingLuxury: false,
    ribbonSatin: false, ribbonVelvet: false,
    giftBox: false, engraving: false, engravingText: '',
    greetingCard: false, cardText: '',
    logoUpload: false, logoUrl: null,
    customDesign: false, customDesignUrl: null
  };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  async function loadThreeJS() {
    if (THREE) return;
    var [t, o, e, r] = await Promise.all([
      import(THREE_SPECIFIER), import(ORBIT_SPECIFIER),
      import(EXPORTER_SPECIFIER), import(ROOM_SPECIFIER)
    ]);
    THREE = t; OrbitControls = o.OrbitControls;
    GLTFExporter = e.GLTFExporter; RoomEnvironment = r.RoomEnvironment;
  }

  function buildGeo(vS, uS, fn) {
    var pos = [], uv = [], idx = [];
    for (var j = 0; j <= vS; j++) {
      var v = j / vS;
      for (var i = 0; i <= uS; i++) {
        var u = i / uS;
        var p = fn(u, v);
        pos.push(p[0], p[1], p[2]); uv.push(u, v);
      }
    }
    var rs = uS + 1;
    for (var jj = 0; jj < vS; jj++)
      for (var ii = 0; ii < uS; ii++) {
        var a = jj * rs + ii, b = a + rs, c = a + 1, d = b + 1;
        idx.push(a, b, c, c, b, d);
      }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }

  function petalWidthProfile(v, shape) {
    var segs = shape.widthSegs;
    for (var k = 0; k < segs.length - 1; k++) {
      var s0 = segs[k], s1 = segs[k + 1];
      if (v >= s0[0] && v <= s1[0]) {
        var t = (v - s0[0]) / (s1[0] - s0[0]);
        var p = s0[2] !== undefined ? s0[2] : 1;
        return lerp(s0[1], s1[1], Math.pow(t, p));
      }
    }
    return 0;
  }

  function buildRosePetalGeo(layerT) {
    var s = lerp(0.28, 1.0, Math.pow(layerT, 0.52));
    var L = 0.26 * s, W = 0.19 * s;
    var tilt = lerp(0.06, 0.72, layerT);
    var cupSign = layerT < 0.52 ? -1 : 1;
    var cupDepth = lerp(0.072, 0.014, layerT);
    var reflexAmt = layerT > 0.62 ? ((layerT - 0.62) / 0.38) * 0.62 : 0;
    var ruffle = lerp(0, 0.026, Math.pow(layerT, 1.4));
    var shape = { widthSegs: [[0,0],[0.10,0.32,0.7],[0.18,0.58,1],[0.50,1,1],[0.78,0.76,1],[0.90,0.30,0.6],[1,0]] };
    return buildGeo(22, 16, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w, ux = (u - 0.5) * 2;
      var ang = tilt + lerp(0, Math.PI * 0.46, Math.pow(v, 1.3));
      if (v > 0.70 && reflexAmt > 0) { var rT = (v - 0.70) / 0.30; ang -= reflexAmt * rT * rT; }
      var spineY = v * L * Math.cos(ang), spineZ = v * L * Math.sin(ang);
      var cup = cupSign * cupDepth * (1 - ux * ux) * w * Math.pow(v, 0.6);
      var rf = (ruffle > 0 && v > 0.28) ? ruffle * Math.sin(ux * Math.PI * 3.8 + v * 1.2) * (v - 0.28) * w : 0;
      return [ux * hw, spineY, spineZ + cup + rf];
    });
  }

  function buildTulipPetalGeo(inner) {
    var L = inner ? 0.31 : 0.34, W = inner ? 0.18 : 0.20;
    var baseTilt = inner ? -0.14 : -0.08, midTilt = inner ? 0.22 : 0.32;
    var shape = { widthSegs: [[0,0],[0.08,0.42,0.7],[0.20,0.65,1],[0.62,1,1],[0.82,0.98,1],[0.90,0.52,0.7],[1,0,0.5]] };
    return buildGeo(18, 12, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w, ux = (u - 0.5) * 2;
      var ang = lerp(baseTilt, midTilt, Math.pow(v, 0.88));
      var spineY = v * L * Math.cos(ang), spineZ = v * L * Math.sin(ang);
      var conc = -0.011 * (1 - ux * ux) * w * v;
      return [ux * hw, spineY, spineZ + conc];
    });
  }

  function buildLilyPetalGeo(inner) {
    var L = inner ? 0.40 : 0.44, W = inner ? 0.135 : 0.155, ruffle = 0.020;
    var shape = { widthSegs: [[0,0],[0.07,0.22,0.8],[0.18,0.52,1],[0.44,1,1],[0.70,0.88,1],[0.86,0.42,0.7],[1,0,0.55]] };
    return buildGeo(20, 14, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w, ux = (u - 0.5) * 2;
      var ang = lerp(0.28, -1.30, Math.pow(v, 0.78));
      var spineY = v * L * Math.cos(ang), spineZ = v * L * Math.sin(ang);
      var rf = ruffle * Math.sin(ux * Math.PI * 2.8 + v * 1.4) * v * w;
      return [ux * hw, spineY, spineZ + rf];
    });
  }

  function buildOrchidWingGeo(isDorsal) {
    var L = isDorsal ? 0.22 : 0.30, W = isDorsal ? 0.10 : 0.22;
    var shape = { widthSegs: [[0,0],[0.12,0.52,0.8],[0.35,0.85,1],[0.62,1,1],[0.82,0.65,1],[1,0,0.55]] };
    return buildGeo(16, 14, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w, ux = (u - 0.5) * 2;
      var ang = lerp(0.04, isDorsal ? 0.40 : 0.65, Math.pow(v, 0.75));
      var spineY = v * L * Math.cos(ang), spineZ = v * L * Math.sin(ang);
      var wave = 0.007 * Math.sin(ux * Math.PI * 2.2) * v;
      return [ux * hw, spineY, spineZ + wave];
    });
  }

  function buildOrchidLabellumGeo() {
    var L = 0.24, W = 0.20;
    var shape = { widthSegs: [[0,0],[0.15,0.55,0.8],[0.30,0.88,1],[0.50,1,1],[0.65,0.58,1],[0.78,0.72,1],[1,0,0.6]] };
    return buildGeo(20, 16, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w, ux = (u - 0.5) * 2;
      var ang = lerp(-0.08, 0.55, v);
      var spineY = v * L * Math.cos(ang) - v * L * 0.22;
      var spineZ = v * L * Math.sin(ang);
      var ridge = (v > 0.18 && v < 0.72) ? -0.010 * Math.exp(-ux * ux * 8) : 0;
      var flare = v > 0.62 ? 0.008 * (1 - ux * ux) * ((v - 0.62) / 0.38) : 0;
      return [ux * hw, spineY, spineZ + ridge + flare];
    });
  }

  function buildSunflowerRayGeo() {
    var L = 0.40, W = 0.085;
    var shape = { widthSegs: [[0,0],[0.10,0.55,0.7],[0.22,0.82,1],[0.75,1,1],[0.88,0.70,1],[1,0.12,0.5]] };
    return buildGeo(16, 8, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w, ux = (u - 0.5) * 2;
      var ang = lerp(0.06, 0.32, v) + (v > 0.78 ? (v - 0.78) * 0.9 : 0);
      var spineY = v * L * Math.cos(ang), spineZ = v * L * Math.sin(ang);
      var twist = v > 0.5 ? 0.005 * Math.sin(v * Math.PI * 4) * ux : 0;
      return [ux * hw, spineY + twist, spineZ];
    });
  }

  function buildPeonyPetalGeo(ruffleIntensity) {
    var s = lerp(0.42, 1.0, 1 - ruffleIntensity);
    var L = 0.23 * s, W = 0.21 * s;
    var tilt = lerp(0.06, 0.58, 1 - ruffleIntensity);
    var ruffle = lerp(0.010, 0.038, ruffleIntensity);
    var cupSign = ruffleIntensity > 0.55 ? -1 : 0.4;
    var shape = { widthSegs: [[0,0],[0.10,0.42,0.8],[0.22,0.72,1],[0.55,1,1],[0.78,0.82,1],[0.90,0.35,0.7],[1,0,0.6]] };
    return buildGeo(18, 14, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w, ux = (u - 0.5) * 2;
      var ang = tilt + Math.pow(v, 1.25) * 0.38;
      var spineY = v * L * Math.cos(ang), spineZ = v * L * Math.sin(ang);
      var cup = cupSign * 0.06 * (1 - ux * ux) * w * v;
      var rf = ruffle * Math.sin(ux * Math.PI * 5.2 + v * 2.8) * Math.max(0, v - 0.18) * w;
      return [ux * hw, spineY, spineZ + cup + rf];
    });
  }

  function makeMat(color, m, sheenColor) {
    return new THREE.MeshPhysicalMaterial({
      color: color, roughness: m.roughness, metalness: 0.0,
      clearcoat: m.clearcoat, clearcoatRoughness: m.clearcoatRoughness,
      sheen: m.sheen, sheenRoughness: m.sheenRoughness, sheenColor: sheenColor,
      transmission: m.transmission, thickness: 0.038, ior: m.ior, side: THREE.DoubleSide
    });
  }

  function createRoseHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0.02, 0.12, 0.14);
    var m = { roughness: 0.38, clearcoat: 0.58, clearcoatRoughness: 0.26, sheen: 0.38, sheenRoughness: 0.52, transmission: 0.08, ior: 1.42 };
    var layers = 5, total = 28, phi = 137.508 * Math.PI / 180;
    var geos = Array.from({ length: layers }, function (_, l) { return buildRosePetalGeo(l / (layers - 1)); });
    var pi = 0;
    for (var l = 0; l < layers; l++) {
      var lt = l / (layers - 1);
      var cnt = Math.max(3, Math.round(total / layers * lerp(0.42, 1.38, lt)));
      var r = lerp(0.004, 0.068, lt);
      var pc = base.clone().offsetHSL(0, -lt * 0.05, lt * 0.08);
      var mat = makeMat(pc, m, sheen);
      for (var p = 0; p < cnt; p++, pi++) {
        var a = pi * phi;
        var mesh = new THREE.Mesh(geos[l], mat);
        mesh.position.set(Math.cos(a) * r, lt * 0.013, Math.sin(a) * r);
        mesh.rotation.y = -a + Math.PI * 0.5;
        mesh.rotation.z = rand(-0.022, 0.022);
        mesh.castShadow = true; g.add(mesh);
      }
    }
    return g;
  }

  function createTulipHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0, 0.06, 0.12);
    var m = { roughness: 0.46, clearcoat: 0.28, clearcoatRoughness: 0.50, sheen: 0.14, sheenRoughness: 0.72, transmission: 0.05, ior: 1.40 };
    var outerG = buildTulipPetalGeo(false), innerG = buildTulipPetalGeo(true);
    var outerM = makeMat(base, m, sheen);
    var innerM = makeMat(base.clone().offsetHSL(0, -0.04, 0.06), m, sheen);
    for (var p = 0; p < 3; p++) {
      var a = (p / 3) * Math.PI * 2;
      var pm = new THREE.Mesh(outerG, outerM);
      pm.position.set(Math.cos(a) * 0.019, 0, Math.sin(a) * 0.019);
      pm.rotation.y = -a + Math.PI * 0.5; pm.castShadow = true; g.add(pm);
    }
    for (var p2 = 0; p2 < 3; p2++) {
      var a2 = ((p2 + 0.5) / 3) * Math.PI * 2;
      var pm2 = new THREE.Mesh(innerG, innerM);
      pm2.position.set(Math.cos(a2) * 0.014, 0.004, Math.sin(a2) * 0.014);
      pm2.rotation.y = -a2 + Math.PI * 0.5; pm2.castShadow = true; g.add(pm2);
    }
    return g;
  }

  function createLilyHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0, 0, 0.16);
    var m = { roughness: 0.31, clearcoat: 0.70, clearcoatRoughness: 0.16, sheen: 0.20, sheenRoughness: 0.52, transmission: 0.16, ior: 1.46 };
    var outerG = buildLilyPetalGeo(false), innerG = buildLilyPetalGeo(true);
    var outerM = makeMat(base, m, sheen);
    var innerM = makeMat(base.clone().offsetHSL(0, -0.03, 0.07), m, sheen);
    for (var p = 0; p < 3; p++) {
      var a = (p / 3) * Math.PI * 2;
      var pm = new THREE.Mesh(outerG, outerM);
      pm.position.set(Math.cos(a) * 0.014, 0, Math.sin(a) * 0.014);
      pm.rotation.y = -a + Math.PI * 0.5; pm.castShadow = true; g.add(pm);
    }
    for (var p2 = 0; p2 < 3; p2++) {
      var a2 = ((p2 + 0.5) / 3) * Math.PI * 2;
      var pm2 = new THREE.Mesh(innerG, innerM);
      pm2.position.set(Math.cos(a2) * 0.010, 0.001, Math.sin(a2) * 0.010);
      pm2.rotation.y = -a2 + Math.PI * 0.5; pm2.castShadow = true; g.add(pm2);
    }
    return g;
  }

  function createOrchidHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0, 0.12, 0.14);
    var m = { roughness: 0.40, clearcoat: 0.48, clearcoatRoughness: 0.36, sheen: 0.58, sheenRoughness: 0.46, transmission: 0.18, ior: 1.44 };
    var wingG = buildOrchidWingGeo(false), dorsalG = buildOrchidWingGeo(true), labG = buildOrchidLabellumGeo();
    var wingM = makeMat(base, m, sheen);
    var dorsalM = makeMat(base.clone().offsetHSL(0, -0.06, 0.05), m, sheen);
    var labM = makeMat(base.clone().offsetHSL(0.07, 0.18, -0.18), Object.assign({}, m, { sheen: 0.68 }), sheen);
    var dorsal = new THREE.Mesh(dorsalG, dorsalM);
    dorsal.rotation.z = Math.PI; dorsal.position.set(0, 0.008, 0.008); g.add(dorsal);
    [-1, 1].forEach(function (side) {
      var ls = new THREE.Mesh(dorsalG, dorsalM);
      ls.rotation.y = side * 1.05; ls.rotation.z = Math.PI + side * 0.38;
      ls.position.set(side * 0.012, -0.010, 0.006); g.add(ls);
    });
    [-1, 1].forEach(function (side) {
      var wp = new THREE.Mesh(wingG, wingM);
      wp.rotation.y = side * 0.52; wp.rotation.z = side * 0.12;
      wp.position.set(side * 0.007, 0.003, 0.014); g.add(wp);
    });
    var lab = new THREE.Mesh(labG, labM);
    lab.rotation.x = 0.22; lab.position.set(0, -0.020, 0.016); g.add(lab);
    return g;
  }

  function createSunflowerHead(color) {
    var g = new THREE.Group();
    var rayColor = new THREE.Color(color && color !== '#DC143C' ? color : '#FFB800');
    var m = { roughness: 0.60, clearcoat: 0.08, clearcoatRoughness: 0.68, sheen: 0.06, sheenRoughness: 0.88, transmission: 0.02, ior: 1.38 };
    var rayM = makeMat(rayColor, m, rayColor.clone().offsetHSL(0, 0.1, 0.1));
    var rayG = buildSunflowerRayGeo();
    var rays = [{ cnt: 24, r: 0.225, sc: 1.0 }, { cnt: 18, r: 0.200, sc: 0.80 }];
    rays.forEach(function (ring, ri) {
      for (var p = 0; p < ring.cnt; p++) {
        var a = (p / ring.cnt) * Math.PI * 2 + (ri * 0.18) + rand(-0.025, 0.025);
        var ray = new THREE.Mesh(rayG, rayM);
        ray.position.set(Math.cos(a) * ring.r, rand(-0.004, 0.004), Math.sin(a) * ring.r);
        ray.rotation.y = -a + Math.PI * 0.5; ray.scale.setScalar(ring.sc);
        ray.castShadow = true; g.add(ray);
      }
    });
    var diskG = new THREE.CylinderGeometry(0.224, 0.220, 0.028, 44);
    var diskM = new THREE.MeshStandardMaterial({ color: 0x150C04, roughness: 0.88 });
    var disk = new THREE.Mesh(diskG, diskM); disk.position.y = 0.014; g.add(disk);
    return g;
  }

  function createPeonyHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0.01, 0.14, 0.20);
    var m = { roughness: 0.44, clearcoat: 0.34, clearcoatRoughness: 0.40, sheen: 0.84, sheenRoughness: 0.42, transmission: 0.05, ior: 1.42 };
    var layers = 6, total = 40, phi = 137.508 * Math.PI / 180;
    var geos = Array.from({ length: layers }, function (_, l) { return buildPeonyPetalGeo(1.0 - (l / (layers - 1)) * 0.85); });
    var pi = 0;
    for (var l = 0; l < layers; l++) {
      var lt = l / (layers - 1);
      var cnt = Math.max(4, Math.round(total / layers * lerp(0.38, 1.42, lt)));
      var r = lerp(0.005, 0.072, lt);
      var pc = base.clone().offsetHSL(0, -lt * 0.04, lt * 0.07);
      var mat = makeMat(pc, m, sheen);
      for (var p = 0; p < cnt; p++, pi++) {
        var a = pi * phi;
        var pm = new THREE.Mesh(geos[l], mat);
        pm.position.set(Math.cos(a) * r, lt * 0.015, Math.sin(a) * r);
        pm.rotation.y = -a + Math.PI * 0.5;
        pm.rotation.z = rand(-0.028, 0.028);
        pm.castShadow = true; g.add(pm);
      }
    }
    return g;
  }

  function createFlowerHead(type, color) {
    switch (type) {
      case 'tulip': return createTulipHead(color);
      case 'lily': return createLilyHead(color);
      case 'orchid': return createOrchidHead(color);
      case 'sunflower': return createSunflowerHead(color);
      case 'peony': return createPeonyHead(color);
      default: return createRoseHead(color);
    }
  }

  function getReceptacleProfile(type) {
    switch (type) {
      case 'tulip':     return { radius: 0.012, height: 0.020, color: 0x3a7020, top: -0.002 };
      case 'lily':      return { radius: 0.014, height: 0.026, color: 0x4a8a32, top: -0.002 };
      case 'orchid':    return { radius: 0.010, height: 0.022, color: 0x4a7028, top: -0.004 };
      case 'sunflower': return { radius: 0.034, height: 0.020, color: 0x3d6a1c, top:  0.000 };
      case 'peony':     return { radius: 0.022, height: 0.024, color: 0x3a6b1f, top: -0.002 };
      default:          return { radius: 0.018, height: 0.022, color: 0x3a6b1f, top: -0.002 };
    }
  }

  function createReceptacle(type) {
    var p = getReceptacleProfile(type);
    var g = new THREE.Group();
    var bodyG = new THREE.SphereGeometry(p.radius, 16, 12);
    var bodyM = new THREE.MeshPhysicalMaterial({ color: p.color, roughness: 0.62, metalness: 0.02, clearcoat: 0.18, clearcoatRoughness: 0.55 });
    var body = new THREE.Mesh(bodyG, bodyM);
    body.scale.y = p.height / (p.radius * 2);
    body.position.y = p.top - p.radius * 0.4;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    return { group: g, profile: p };
  }

  function getJunctionTexture() {
    if (junctionTex) return junctionTex;
    var canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    var ctx = canvas.getContext('2d');
    var g1 = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g1.addColorStop(0, 'rgba(90,140,55,0.85)');
    g1.addColorStop(0.25, 'rgba(60,105,35,0.55)');
    g1.addColorStop(0.55, 'rgba(45,80,25,0.22)');
    g1.addColorStop(1, 'rgba(30,55,15,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, 128, 128);
    junctionTex = new THREE.CanvasTexture(canvas);
    junctionTex.colorSpace = THREE.SRGBColorSpace;
    return junctionTex;
  }

  function makeKraftTexture() {
    if (kraftTex) return kraftTex;
    var c = document.createElement('canvas'); c.width = 512; c.height = 512;
    var x = c.getContext('2d');
    x.fillStyle = '#8B6914'; x.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 4000; i++) {
      var rx = Math.random() * 512, ry = Math.random() * 512;
      var a = Math.random() * 0.18;
      x.fillStyle = 'rgba(' + (60 + Math.random() * 40 | 0) + ',' + (35 + Math.random() * 30 | 0) + ',10,' + a.toFixed(2) + ')';
      x.fillRect(rx, ry, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (var f = 0; f < 50; f++) {
      x.strokeStyle = 'rgba(255,200,80,' + (0.04 + Math.random() * 0.06) + ')';
      x.lineWidth = 0.5;
      x.beginPath();
      x.moveTo(Math.random() * 512, Math.random() * 512);
      x.lineTo(Math.random() * 512, Math.random() * 512);
      x.stroke();
    }
    kraftTex = new THREE.CanvasTexture(c);
    kraftTex.wrapS = kraftTex.wrapT = THREE.RepeatWrapping;
    kraftTex.colorSpace = THREE.SRGBColorSpace;
    return kraftTex;
  }

  function makeSilkTexture() {
    if (silkTex) return silkTex;
    var c = document.createElement('canvas'); c.width = 512; c.height = 512;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, '#1a0a2e'); g.addColorStop(0.5, '#2d1b4e'); g.addColorStop(1, '#1a0a2e');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    for (var s = 0; s < 200; s++) {
      x.strokeStyle = 'rgba(180,140,220,' + (0.02 + Math.random() * 0.04) + ')';
      x.lineWidth = 0.3;
      x.beginPath();
      var y = Math.random() * 512;
      x.moveTo(0, y); x.lineTo(512, y + (Math.random() - 0.5) * 40);
      x.stroke();
    }
    silkTex = new THREE.CanvasTexture(c);
    silkTex.wrapS = silkTex.wrapT = THREE.RepeatWrapping;
    silkTex.colorSpace = THREE.SRGBColorSpace;
    return silkTex;
  }

  function makeVelvetTexture() {
    if (velvetTex) return velvetTex;
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = '#3a0a1a'; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 3000; i++) {
      x.fillStyle = 'rgba(' + (60 + Math.random() * 30 | 0) + ',10,30,' + (Math.random() * 0.4).toFixed(2) + ')';
      x.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
    }
    velvetTex = new THREE.CanvasTexture(c);
    velvetTex.wrapS = velvetTex.wrapT = THREE.RepeatWrapping;
    velvetTex.colorSpace = THREE.SRGBColorSpace;
    return velvetTex;
  }

  function makeSatinTexture() {
    if (satinTex) return satinTex;
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    satinTex = new THREE.CanvasTexture(c);
    satinTex.wrapS = satinTex.wrapT = THREE.RepeatWrapping;
    satinTex.colorSpace = THREE.SRGBColorSpace;
    return satinTex;
  }

  function loadImageTexture(url) {
    return new Promise(function (resolve) {
      if (!url) { resolve(null); return; }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        var tex = new THREE.Texture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        resolve(tex);
      };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function createJunctionBlur(profile) {
    var spriteMat = new THREE.SpriteMaterial({ map: getJunctionTexture(), transparent: true, depthWrite: false, opacity: 0.78, blending: THREE.NormalBlending });
    var sprite = new THREE.Sprite(spriteMat);
    var s = Math.max(profile.radius * 4.2, 0.055);
    sprite.scale.set(s, s, 1);
    sprite.position.y = profile.top - profile.radius * 0.2;
    return sprite;
  }

  function createConvergingStem(headPos, type, topRadius, stemHidden) {
    var grp = new THREE.Group();
    if (stemHidden) return { group: grp };
    var sx = headPos.x, sy = headPos.y, sz = headPos.z;
    var tieY = TIE_Y;
    var p0 = new THREE.Vector3(sx, sy, sz);
    var p1 = new THREE.Vector3(sx * 0.78 + rand(-0.008, 0.008), lerp(sy, tieY, 0.35), sz * 0.78 + rand(-0.008, 0.008));
    var p2 = new THREE.Vector3(sx * 0.32 + rand(-0.006, 0.006), lerp(sy, tieY, 0.72), sz * 0.32 + rand(-0.006, 0.006));
    var p3 = new THREE.Vector3(rand(-0.004, 0.004), tieY + rand(-0.005, 0.005), rand(-0.004, 0.004));
    var curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    var base = type === 'tulip' ? 0.0095 : type === 'lily' ? 0.011 : 0.010;
    var tube = new THREE.TubeGeometry(curve, 40, base, 8, false);
    var pos = tube.attributes.position;
    var radSegs = 8, tubSegs = 40;
    for (var i = 0; i <= tubSegs; i++) {
      var t = i / tubSegs;
      var taper = t < 0.06 ? lerp(topRadius / base, 1.0, t / 0.06) : 1.0;
      for (var r = 0; r <= radSegs; r++) {
        var vi = (i * (radSegs + 1) + r) * 3;
        var px = pos.array[vi], py = pos.array[vi + 1], pz = pos.array[vi + 2];
        var cp = curve.getPoint(t);
        pos.array[vi]     = cp.x + (px - cp.x) * taper;
        pos.array[vi + 1] = cp.y + (py - cp.y) * taper;
        pos.array[vi + 2] = cp.z + (pz - cp.z) * taper;
      }
    }
    pos.needsUpdate = true; tube.computeVertexNormals();
    var stemM = new THREE.MeshStandardMaterial({ color: '#2d5016', roughness: 0.68, metalness: 0.04 });
    var mesh = new THREE.Mesh(tube, stemM);
    mesh.castShadow = true; mesh.receiveShadow = true;
    grp.add(mesh);
    var leafCnt = Math.random() < 0.6 ? 1 : 0;
    for (var li = 0; li < leafCnt; li++) {
      var leaf = createLeaf(type);
      var pt = curve.getPoint(rand(0.30, 0.55));
      leaf.position.copy(pt);
      leaf.rotation.y = rand(0, Math.PI * 2);
      leaf.rotation.z = rand(-0.5, 0.4);
      grp.add(leaf);
    }
    return { group: grp, curve: curve };
  }

  function createLeaf(type) {
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.038, 0.008, 0.044, 0.06, 0.028, 0.13);
    shape.bezierCurveTo(0.012, 0.18, -0.012, 0.18, -0.028, 0.13);
    shape.bezierCurveTo(-0.044, 0.06, -0.038, 0.008, 0, 0);
    var leafG = new THREE.ShapeGeometry(shape, 8);
    var leafM = new THREE.MeshStandardMaterial({ color: type === 'tulip' ? '#3a7020' : '#2e7d32', roughness: 0.58, metalness: 0.04, side: THREE.DoubleSide });
    var leaf = new THREE.Mesh(leafG, leafM);
    leaf.scale.set(1.4, 1.4, 1);
    return leaf;
  }

  function createBundle(hidden) {
    if (hidden) return null;
    var grp = new THREE.Group();
    var bundleR = 0.030;
    var bundleG = new THREE.CylinderGeometry(bundleR * 0.85, bundleR * 0.95, BUNDLE_BOTTOM_Y - TIE_Y, 12, 1);
    var bundleM = new THREE.MeshStandardMaterial({ color: '#1e3a0a', roughness: 0.78, metalness: 0.02 });
    var bundle = new THREE.Mesh(bundleG, bundleM);
    bundle.position.y = (TIE_Y + BUNDLE_BOTTOM_Y) / 2;
    bundle.castShadow = true; bundle.receiveShadow = true;
    grp.add(bundle);
    return grp;
  }

  function createTwine() {
    var grp = new THREE.Group();
    var r = 0.034;
    var twineG = new THREE.TorusGeometry(r, 0.005, 6, 24);
    var twineM = new THREE.MeshStandardMaterial({ color: '#a87c3a', roughness: 0.85 });
    for (var i = 0; i < 4; i++) {
      var t = new THREE.Mesh(twineG, twineM);
      t.position.y = TIE_Y - 0.008 - i * 0.012;
      t.rotation.x = Math.PI / 2;
      t.rotation.z = rand(-0.08, 0.08);
      grp.add(t);
    }
    return grp;
  }

  function createKraftWrap(stemCount, logoTexture) {
    var grp = new THREE.Group();
    var topR = 0.40 + stemCount * 0.010, midR = 0.22, botR = 0.085;
    var rows = 22, segs = 40;
    var pos = [], uvw = [], idxW = [];
    for (var j = 0; j <= rows; j++) {
      var t = j / rows;
      var r = t < 0.55 ? lerp(botR, midR, t / 0.55) : lerp(midR, topR, (t - 0.55) / 0.45);
      var y = lerp(BUNDLE_BOTTOM_Y + 0.04, TIE_Y + 0.10, t);
      var ruffleAmt = t > 0.78 ? (t - 0.78) * 3.2 : 0;
      for (var i = 0; i <= segs; i++) {
        var a = (i / segs) * Math.PI * 2;
        var foldA = a + (j % 2) * (Math.PI / segs);
        var ruffle = ruffleAmt * Math.sin(foldA * 7) * 0.05;
        var pleat = 0.008 * Math.sin(a * 12);
        var x = Math.cos(a) * (r + ruffle + pleat);
        var z = Math.sin(a) * (r + ruffle + pleat);
        var yWave = ruffleAmt * 0.03 * Math.cos(a * 5);
        pos.push(x, y + yWave, z);
        uvw.push(i / segs * 2, t * 1.5);
      }
    }
    var rs2 = segs + 1;
    for (var j2 = 0; j2 < rows; j2++)
      for (var i2 = 0; i2 < segs; i2++) {
        var a2 = j2 * rs2 + i2, b2 = a2 + rs2, c2 = a2 + 1, d2 = b2 + 1;
        idxW.push(a2, b2, c2, c2, b2, d2);
      }
    var wG = new THREE.BufferGeometry();
    wG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wG.setAttribute('uv', new THREE.Float32BufferAttribute(uvw, 2));
    wG.setIndex(idxW); wG.computeVertexNormals();
    var kraftMap = makeKraftTexture();
    var kraftRepeat = kraftMap.clone(); kraftRepeat.needsUpdate = true;
    kraftRepeat.wrapS = kraftRepeat.wrapT = THREE.RepeatWrapping;
    kraftRepeat.repeat.set(3, 2);
    var wM = new THREE.MeshPhysicalMaterial({
      map: kraftRepeat, color: '#b89060', roughness: 0.78, metalness: 0.04,
      clearcoat: 0.10, clearcoatRoughness: 0.6, side: THREE.DoubleSide
    });
    var wrap = new THREE.Mesh(wG, wM);
    wrap.castShadow = true; wrap.receiveShadow = true;
    grp.add(wrap);
    var foilG = new THREE.CylinderGeometry(midR * 1.04, midR * 1.04, 0.04, 40, 1, true);
    var foilM = new THREE.MeshPhysicalMaterial({ color: '#d4a84a', roughness: 0.22, metalness: 0.85, side: THREE.DoubleSide });
    var foil = new THREE.Mesh(foilG, foilM);
    foil.position.y = lerp(BUNDLE_BOTTOM_Y + 0.04, TIE_Y + 0.10, 0.50);
    grp.add(foil);
    if (logoTexture) addLogoDecal(grp, logoTexture, midR, foil.position.y + 0.10);
    return grp;
  }

  function createSilkWrap(stemCount, logoTexture) {
    var grp = new THREE.Group();
    var topR = 0.42 + stemCount * 0.011, midR = 0.24, botR = 0.09;
    var rows = 24, segs = 44;
    var pos = [], uvw = [], idxW = [];
    for (var j = 0; j <= rows; j++) {
      var t = j / rows;
      var r = t < 0.55 ? lerp(botR, midR, t / 0.55) : lerp(midR, topR, (t - 0.55) / 0.45);
      var y = lerp(BUNDLE_BOTTOM_Y + 0.04, TIE_Y + 0.12, t);
      var drape = 0.014 * Math.sin(t * Math.PI * 3);
      var ruffleAmt = t > 0.82 ? (t - 0.82) * 4.0 : 0;
      for (var i = 0; i <= segs; i++) {
        var a = (i / segs) * Math.PI * 2;
        var fold = drape * Math.sin(a * 6 + t * 2);
        var ruffle = ruffleAmt * Math.sin(a * 9) * 0.045;
        var x = Math.cos(a) * (r + fold + ruffle);
        var z = Math.sin(a) * (r + fold + ruffle);
        pos.push(x, y + ruffleAmt * 0.025 * Math.cos(a * 4), z);
        uvw.push(i / segs, t);
      }
    }
    var rs2 = segs + 1;
    for (var j2 = 0; j2 < rows; j2++)
      for (var i2 = 0; i2 < segs; i2++) {
        var a2 = j2 * rs2 + i2, b2 = a2 + rs2, c2 = a2 + 1, d2 = b2 + 1;
        idxW.push(a2, b2, c2, c2, b2, d2);
      }
    var wG = new THREE.BufferGeometry();
    wG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wG.setAttribute('uv', new THREE.Float32BufferAttribute(uvw, 2));
    wG.setIndex(idxW); wG.computeVertexNormals();
    var silkMap = makeSilkTexture().clone(); silkMap.needsUpdate = true;
    silkMap.wrapS = silkMap.wrapT = THREE.RepeatWrapping;
    silkMap.repeat.set(2, 1);
    var wM = new THREE.MeshPhysicalMaterial({
      map: silkMap, color: '#2a1a4e', roughness: 0.28, metalness: 0.10,
      clearcoat: 0.55, clearcoatRoughness: 0.18, sheen: 0.75,
      sheenColor: new THREE.Color('#b89cff'), sheenRoughness: 0.35, side: THREE.DoubleSide
    });
    var wrap = new THREE.Mesh(wG, wM);
    wrap.castShadow = true; wrap.receiveShadow = true;
    grp.add(wrap);
    var sealG = new THREE.CylinderGeometry(0.038, 0.040, 0.008, 24);
    var sealM = new THREE.MeshPhysicalMaterial({ color: '#8a0a1a', roughness: 0.55, metalness: 0.05, clearcoat: 0.65, clearcoatRoughness: 0.35 });
    var seal = new THREE.Mesh(sealG, sealM);
    seal.position.set(midR * 0.95, lerp(BUNDLE_BOTTOM_Y + 0.04, TIE_Y + 0.12, 0.45), 0.02);
    seal.rotation.z = Math.PI / 2;
    grp.add(seal);
    var sealRim = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.003, 6, 20), new THREE.MeshStandardMaterial({ color: '#5a0508', roughness: 0.7 }));
    sealRim.position.copy(seal.position); sealRim.rotation.y = Math.PI / 2;
    grp.add(sealRim);
    if (logoTexture) addLogoDecal(grp, logoTexture, midR, lerp(BUNDLE_BOTTOM_Y + 0.04, TIE_Y + 0.12, 0.6));
    return grp;
  }

  function addLogoDecal(parentGrp, tex, midR, yPos) {
    var planeG = new THREE.PlaneGeometry(0.12, 0.07);
    var planeM = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, side: THREE.DoubleSide });
    var plane = new THREE.Mesh(planeG, planeM);
    plane.position.set(-midR * 1.02, yPos, 0);
    plane.rotation.y = Math.PI / 2;
    parentGrp.add(plane);
  }

  function createSatinRibbon(color) {
    var grp = new THREE.Group();
    var ribbonM = new THREE.MeshPhysicalMaterial({
      color: color, roughness: 0.22, metalness: 0.04,
      clearcoat: 0.78, clearcoatRoughness: 0.12,
      sheen: 0.6, sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.2, side: THREE.DoubleSide
    });
    var wrapG = new THREE.TorusGeometry(0.054, 0.012, 6, 32);
    var band = new THREE.Mesh(wrapG, ribbonM);
    band.position.y = TIE_Y - 0.02; band.rotation.x = Math.PI / 2;
    band.scale.y = 0.55;
    grp.add(band);
    var bowG = new THREE.TorusGeometry(0.060, 0.013, 6, 20, Math.PI * 1.5);
    var b1 = new THREE.Mesh(bowG, ribbonM);
    b1.position.set(0, TIE_Y - 0.02, 0.040); b1.rotation.x = Math.PI / 2; b1.rotation.z = 0.30;
    grp.add(b1);
    var b2 = new THREE.Mesh(bowG, ribbonM);
    b2.position.set(0, TIE_Y - 0.02, 0.040); b2.rotation.x = Math.PI / 2; b2.rotation.z = -0.30 + Math.PI;
    grp.add(b2);
    var tailG = new THREE.PlaneGeometry(0.022, 0.18);
    [-1, 1].forEach(function (s) {
      var tail = new THREE.Mesh(tailG, ribbonM);
      tail.position.set(s * 0.012, TIE_Y - 0.10, 0.044);
      tail.rotation.z = s * 0.18;
      grp.add(tail);
    });
    return grp;
  }

  function createVelvetRibbon(color) {
    var grp = new THREE.Group();
    var velvetMap = makeVelvetTexture();
    var ribbonM = new THREE.MeshPhysicalMaterial({
      map: velvetMap, color: color, roughness: 0.92, metalness: 0.0,
      sheen: 1.0, sheenColor: new THREE.Color(color).offsetHSL(0, 0.1, 0.2),
      sheenRoughness: 0.85, side: THREE.DoubleSide
    });
    var wrapG = new THREE.TorusGeometry(0.054, 0.014, 6, 32);
    var band = new THREE.Mesh(wrapG, ribbonM);
    band.position.y = TIE_Y - 0.02; band.rotation.x = Math.PI / 2;
    band.scale.y = 0.55;
    grp.add(band);
    var bowG = new THREE.TorusGeometry(0.058, 0.015, 6, 18, Math.PI * 1.4);
    var b1 = new THREE.Mesh(bowG, ribbonM);
    b1.position.set(0, TIE_Y - 0.02, 0.042); b1.rotation.x = Math.PI / 2; b1.rotation.z = 0.32;
    grp.add(b1);
    var b2 = new THREE.Mesh(bowG, ribbonM);
    b2.position.set(0, TIE_Y - 0.02, 0.042); b2.rotation.x = Math.PI / 2; b2.rotation.z = -0.32 + Math.PI;
    grp.add(b2);
    var tailG = new THREE.PlaneGeometry(0.024, 0.16);
    [-1, 1].forEach(function (s) {
      var tail = new THREE.Mesh(tailG, ribbonM);
      tail.position.set(s * 0.014, TIE_Y - 0.09, 0.046);
      tail.rotation.z = s * 0.22;
      grp.add(tail);
    });
    return grp;
  }

  function createGiftBox(engravingText) {
    var grp = new THREE.Group();
    var w = 0.62, h = 0.36, d = 0.62;
    var boxG = new THREE.BoxGeometry(w, h, d);
    var boxM = new THREE.MeshPhysicalMaterial({ color: '#1a0f08', roughness: 0.45, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    var box = new THREE.Mesh(boxG, boxM);
    box.position.y = BUNDLE_BOTTOM_Y + h / 2;
    box.castShadow = true; box.receiveShadow = true;
    grp.add(box);
    var lidG = new THREE.BoxGeometry(w * 1.02, 0.04, d * 1.02);
    var lid = new THREE.Mesh(lidG, boxM);
    lid.position.set(0, BUNDLE_BOTTOM_Y + h + 0.02, 0);
    lid.rotation.z = 0.55;
    lid.position.x = -w * 0.4;
    lid.position.y += w * 0.20;
    grp.add(lid);
    var trimG = new THREE.BoxGeometry(w * 1.01, 0.008, d * 1.01);
    var trimM = new THREE.MeshPhysicalMaterial({ color: '#d4a84a', roughness: 0.25, metalness: 0.85 });
    var trim = new THREE.Mesh(trimG, trimM);
    trim.position.y = BUNDLE_BOTTOM_Y + h - 0.004;
    grp.add(trim);
    if (engravingText && engravingText.length > 0) {
      var plate = makeEngravingPlate(engravingText, 0.30, 0.06);
      plate.position.set(0, BUNDLE_BOTTOM_Y + h * 0.45, d / 2 + 0.001);
      grp.add(plate);
    }
    return grp;
  }

  function makeEngravingPlate(text, w, h) {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = Math.round(1024 * h / w);
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, '#d4a84a'); g.addColorStop(0.5, '#f0d480'); g.addColorStop(1, '#a07820');
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(40,20,0,0.85)';
    ctx.font = 'bold ' + Math.round(c.height * 0.45) + 'px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillText(text.substring(0, 40), c.width / 2, c.height / 2);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    var mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, metalness: 0.75, clearcoat: 0.6 });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  }

  function createGreetingCard(message, engraved) {
    var grp = new THREE.Group();
    var cw = 0.16, ch = 0.11;
    var c = document.createElement('canvas');
    c.width = 512; c.height = 352;
    var x = c.getContext('2d');
    var bg = x.createLinearGradient(0, 0, 0, c.height);
    bg.addColorStop(0, '#fffdf7'); bg.addColorStop(1, '#f0e8d4');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = engraved ? '#8a6020' : '#c4a060';
    x.lineWidth = 4;
    x.strokeRect(12, 12, c.width - 24, c.height - 24);
    x.fillStyle = '#4a3018';
    x.font = 'italic 30px Georgia, serif';
    x.textAlign = 'center';
    x.fillText('♡ With Love ♡', c.width / 2, 70);
    x.font = '22px Georgia, serif';
    var msg = (message || 'A token of affection,\nblooming just for you.').split('\n');
    msg.forEach(function (line, i) { x.fillText(line.substring(0, 40), c.width / 2, 130 + i * 32); });
    var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide });
    var card = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), mat);
    card.position.set(0.18, TIE_Y - 0.04, 0.05);
    card.rotation.set(-0.2, 0.5, -0.15);
    card.castShadow = true;
    grp.add(card);
    var stringG = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, TIE_Y - 0.02, 0),
      new THREE.Vector3(0.10, TIE_Y - 0.03, 0.03),
      new THREE.Vector3(0.18, TIE_Y - 0.04, 0.05)
    ]);
    var stringM = new THREE.LineBasicMaterial({ color: '#a87c3a' });
    grp.add(new THREE.Line(stringG, stringM));
    return grp;
  }

  function createEngravedTag(text) {
    var grp = new THREE.Group();
    var plate = makeEngravingPlate(text, 0.10, 0.045);
    plate.position.set(-0.16, TIE_Y - 0.05, 0.04);
    plate.rotation.set(-0.15, -0.5, 0.18);
    grp.add(plate);
    var stringG = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, TIE_Y - 0.02, 0),
      new THREE.Vector3(-0.10, TIE_Y - 0.035, 0.025),
      new THREE.Vector3(-0.16, TIE_Y - 0.05, 0.04)
    ]);
    grp.add(new THREE.Line(stringG, new THREE.LineBasicMaterial({ color: '#a87c3a' })));
    return grp;
  }

  function createCustomDesignOverlay(tex) {
    var grp = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.95, roughness: 0.65, side: THREE.DoubleSide });
    var plane = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.20), mat);
    plane.position.set(0, lerp(BUNDLE_BOTTOM_Y, TIE_Y, 0.45), 0.30);
    grp.add(plane);
    var plane2 = plane.clone(); plane2.position.z = -0.30; plane2.rotation.y = Math.PI;
    grp.add(plane2);
    return grp;
  }

  function addEtherealGlow(group, count, color) {
    var glowCol = new THREE.Color(color).offsetHSL(0, -0.15, 0.35);
    var canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.3, 'rgba(255,220,240,0.4)');
    grad.addColorStop(0.7, 'rgba(200,180,255,0.1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(canvas);
    var particleCount = Math.min(count * 8, 120);
    var positions = new Float32Array(particleCount * 3), colors = new Float32Array(particleCount * 3);
    for (var i = 0; i < particleCount; i++) {
      var phi = 137.508 * Math.PI / 180;
      var fi = i % count, ring = Math.floor(Math.sqrt(fi));
      var r = ring * 0.12 + 0.02, a = fi * phi;
      positions[i * 3] = Math.cos(a) * r + rand(-0.06, 0.06);
      positions[i * 3 + 1] = rand(-0.4, 0.18);
      positions[i * 3 + 2] = Math.sin(a) * r + rand(-0.06, 0.06);
      var c = glowCol.clone().offsetHSL(rand(-0.05, 0.05), 0, rand(-0.1, 0.1));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var mat = new THREE.PointsMaterial({
      map: tex, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true
    });
    var points = new THREE.Points(geo, mat);
    points.userData.isGlow = true;
    group.add(points);
  }

  async function buildBouquet(cfg) {
    if (!THREE) return;
    if (bouquetGroup) {
      scene.remove(bouquetGroup);
      bouquetGroup.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); }); else obj.material.dispose(); }
      });
    }
    if (cfg.logoUpload && cfg.logoUrl && cfg.logoUrl !== logoUrlCached) {
      logoTex = await loadImageTexture(cfg.logoUrl); logoUrlCached = cfg.logoUrl;
    } else if (!cfg.logoUpload) { logoTex = null; logoUrlCached = null; }
    if (cfg.customDesign && cfg.customDesignUrl && cfg.customDesignUrl !== customUrlCached) {
      customTex = await loadImageTexture(cfg.customDesignUrl); customUrlCached = cfg.customDesignUrl;
    } else if (!cfg.customDesign) { customTex = null; customUrlCached = null; }

    bouquetGroup = new THREE.Group();
    var type = cfg.flower || 'rose';
    var count = cfg.bloomCount || 12;
    var color = cfg.color || '#DC143C';
    var phi = 137.508 * Math.PI / 180;
    var hasGiftBox = !!cfg.giftBox;
    var stemHidden = hasGiftBox;
    var bundleHidden = hasGiftBox;

    for (var i = 0; i < count; i++) {
      var fg = new THREE.Group();
      var head = createFlowerHead(type, color);
      var recept = createReceptacle(type);
      var ring = Math.floor(Math.sqrt(i));
      var radius = ring * 0.11 + 0.018;
      var angle = i * phi;
      var fx = Math.cos(angle) * radius, fz = Math.sin(angle) * radius;
      var yVar = rand(-0.05, 0.07);
      var headY = hasGiftBox ? (BUNDLE_BOTTOM_Y + 0.46 + yVar * 0.3) : yVar;
      var pivot = new THREE.Vector3(fx, headY, fz);
      head.position.copy(pivot);
      head.rotation.set(rand(-0.12, 0.12), rand(0, Math.PI * 2), rand(-0.12, 0.12));
      var hs = rand(0.86, 1.12);
      head.scale.setScalar(hs);
      recept.group.position.copy(pivot);
      recept.group.rotation.y = rand(0, Math.PI * 2);
      var blur = createJunctionBlur(recept.profile);
      blur.position.copy(pivot);
      fg.add(head); fg.add(recept.group); fg.add(blur);
      if (!stemHidden) {
        var stemData = createConvergingStem(pivot, type, recept.profile.radius * 0.92, false);
        fg.add(stemData.group);
      }
      bouquetGroup.add(fg);
    }

    if (!bundleHidden) {
      var bundle = createBundle(false);
      if (bundle) bouquetGroup.add(bundle);
      bouquetGroup.add(createTwine());
    }

    var hasWrap = !!(cfg.wrappingPremium || cfg.wrappingLuxury);
    if (hasWrap && !hasGiftBox) {
      if (cfg.wrappingLuxury) bouquetGroup.add(createSilkWrap(count, logoTex));
      else bouquetGroup.add(createKraftWrap(count, logoTex));
    }

    if (cfg.customDesign && customTex && !hasGiftBox) {
      bouquetGroup.add(createCustomDesignOverlay(customTex));
    }

    var ribbonColor = color;
    if (!hasGiftBox) {
      if (cfg.ribbonVelvet) bouquetGroup.add(createVelvetRibbon(ribbonColor));
      else if (cfg.ribbonSatin) bouquetGroup.add(createSatinRibbon(ribbonColor));
    }

    if (hasGiftBox) bouquetGroup.add(createGiftBox(cfg.engraving ? (cfg.engravingText || 'With Love') : ''));

    if (cfg.greetingCard) bouquetGroup.add(createGreetingCard(cfg.cardText, cfg.engraving));
    else if (cfg.engraving && !hasGiftBox) bouquetGroup.add(createEngravedTag(cfg.engravingText || 'With Love'));

    addEtherealGlow(bouquetGroup, count, color);

    var box = new THREE.Box3().setFromObject(bouquetGroup);
    var ctr = box.getCenter(new THREE.Vector3());
    bouquetGroup.position.sub(ctr);
    bouquetGroup.position.y += 0.12;
    scene.add(bouquetGroup);
  }

  function setupScene(containerEl) {
    container = containerEl;
    var w = container.clientWidth, h = container.clientHeight;
    scene = new THREE.Scene(); scene.background = null;
    camera = new THREE.PerspectiveCamera(36, w / h, 0.01, 100);
    camera.position.set(0, 0.45, 2.8);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.58;
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
    controls.minDistance = 1; controls.maxDistance = 6;
    controls.target.set(0, 0, 0); controls.enablePan = false;
    scene.add(new THREE.AmbientLight(0xffeedd, 0.62));
    var key = new THREE.DirectionalLight(0xfff5e6, 1.85);
    key.position.set(3, 5, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1; key.shadow.camera.far = 20;
    scene.add(key);
    scene.add(Object.assign(new THREE.DirectionalLight(0xe8d5ff, 0.52), { position: new THREE.Vector3(-3, 2, -2) }));
    scene.add(Object.assign(new THREE.PointLight(0xff6b9d, 0.82, 10), { position: new THREE.Vector3(-2, 3, -3) }));
    scene.add(Object.assign(new THREE.PointLight(0xffd700, 0.32, 8), { position: new THREE.Vector3(0, -2, 1) }));
    scene.add(new THREE.HemisphereLight(0xffeedd, 0x1a0a2e, 0.42));
    var floor = new THREE.Mesh(new THREE.CircleGeometry(3, 36), new THREE.MeshStandardMaterial({ color: '#080412', roughness: 0.96 }));
    floor.rotation.x = -Math.PI * 0.5; floor.position.y = -1.45;
    floor.receiveShadow = true; scene.add(floor);
    scene.fog = new THREE.FogExp2(0x080412, 0.16);
    window.addEventListener('resize', onResize);
    animate();
  }

  function onResize() {
    if (!container || !renderer) return;
    var w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (bouquetGroup) {
      var t = Date.now() * 0.001;
      bouquetGroup.children.forEach(function (child) {
        if (child.userData && child.userData.isGlow) {
          var pos = child.geometry.attributes.position;
          for (var p = 0; p < pos.count; p++) pos.setY(p, pos.getY(p) + Math.sin(t * 0.8 + p * 1.3) * 0.00025);
          pos.needsUpdate = true;
          child.material.opacity = 0.28 + Math.sin(t * 0.6) * 0.08;
        }
      });
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    if (controls) controls.dispose();
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    [junctionTex, kraftTex, silkTex, velvetTex, satinTex, logoTex, customTex].forEach(function (t) { if (t) t.dispose(); });
    junctionTex = kraftTex = silkTex = velvetTex = satinTex = logoTex = customTex = null;
    scene = camera = renderer = controls = bouquetGroup = null;
    loaded = false;
  }

  function normalizeCfg(cfg) {
    var n = Object.assign({}, cfg);
    if ('wrapping' in n && !('wrappingPremium' in cfg)) n.wrappingPremium = n.wrapping;
    if ('luxury' in n && !('wrappingLuxury' in cfg)) n.wrappingLuxury = n.luxury;
    return n;
  }

  async function init(containerEl, cfg) {
    if (loaded) { await updateConfig(cfg); return; }
    if (initPromise) { await initPromise; await updateConfig(cfg); return; }
    initPromise = (async function () {
      await loadThreeJS();
      setupScene(containerEl);
      currentConfig = Object.assign({}, currentConfig, normalizeCfg(cfg || {}));
      await buildBouquet(currentConfig);
      loaded = true;
    })();
    try { await initPromise; }
    catch (e) { initPromise = null; loaded = false; console.error('[BouquetRenderer]', e); throw e; }
  }

  async function updateConfig(cfg) {
    if (!loaded || !THREE) return;
    var nc = normalizeCfg(cfg || {});
    var changed = false;
    Object.keys(nc).forEach(function (k) { if (currentConfig[k] !== nc[k]) { currentConfig[k] = nc[k]; changed = true; } });
    if (changed) await buildBouquet(currentConfig);
  }

  function exportGLB() {
    return new Promise(function (resolve, reject) {
      if (!loaded || !bouquetGroup || !GLTFExporter) { reject(new Error('renderer not ready')); return; }
      var root = new THREE.Group();
      var clone = bouquetGroup.clone(true);
      clone.traverse(function (o) { if (o.userData && o.userData.isGlow) o.visible = false; });
      clone.rotation.set(0, 0, 0); clone.position.set(0, 0, 0);
      root.add(clone);
      var pre = new THREE.Box3().setFromObject(root);
      var sc = 0.42 / Math.max(pre.getSize(new THREE.Vector3()).y, 0.0001);
      root.scale.setScalar(sc);
      var post = new THREE.Box3().setFromObject(root);
      var ctr = post.getCenter(new THREE.Vector3());
      root.position.set(-ctr.x, -post.min.y, -ctr.z);
      new GLTFExporter().parse(root,
        function (buf) { try { resolve(URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }))); } catch (e) { reject(e); } },
        function (err) { reject(err); },
        { binary: true, embedImages: true, onlyVisible: true }
      );
    });
  }

  window.BloomBouquetRenderer = {
    init: init, updateConfig: updateConfig,
    dispose: dispose, exportGLB: exportGLB,
    isReady: function () { return loaded; }
  };
})();
