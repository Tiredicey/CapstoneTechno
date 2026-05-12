(function () {
  'use strict';
  if (window.BloomBouquetRenderer) return;

  var THREE_SPECIFIER = 'three';
  var ORBIT_SPECIFIER = 'three/addons/controls/OrbitControls.js';
  var EXPORTER_SPECIFIER = 'three/addons/exporters/GLTFExporter.js';
  var ROOM_SPECIFIER = 'three/addons/environments/RoomEnvironment.js';

  var renderer, scene, camera, controls, bouquetGroup, animId, pmrem, envTex;
  var container = null;
  var loaded = false;
  var THREE = null;
  var OrbitControls = null;
  var GLTFExporter = null;
  var RoomEnvironment = null;

  var currentConfig = { flower: 'rose', color: '#DC143C', bloomCount: 12, wrapping: false, luxury: false };

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
        pos.push(p[0], p[1], p[2]);
        uv.push(u, v);
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
    var shape = {
      widthSegs: [
        [0, 0.0], [0.10, 0.32, 0.7], [0.18, 0.58, 1.0],
        [0.50, 1.0, 1.0], [0.78, 0.76, 1.0], [0.90, 0.30, 0.6], [1.0, 0.0]
      ]
    };
    return buildGeo(22, 16, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w;
      var ux = (u - 0.5) * 2;
      var ang = tilt + lerp(0, Math.PI * 0.46, Math.pow(v, 1.3));
      if (v > 0.70 && reflexAmt > 0) {
        var rT = (v - 0.70) / 0.30;
        ang -= reflexAmt * rT * rT;
      }
      var spineY = v * L * Math.cos(ang);
      var spineZ = v * L * Math.sin(ang);
      var cup = cupSign * cupDepth * (1 - ux * ux) * w * Math.pow(v, 0.6);
      var rf = (ruffle > 0 && v > 0.28) ? ruffle * Math.sin(ux * Math.PI * 3.8 + v * 1.2) * (v - 0.28) * w : 0;
      return [ux * hw, spineY, spineZ + cup + rf];
    });
  }

  function buildTulipPetalGeo(inner) {
    var L = inner ? 0.31 : 0.34, W = inner ? 0.18 : 0.20;
    var baseTilt = inner ? -0.14 : -0.08;
    var midTilt = inner ? 0.22 : 0.32;
    var shape = {
      widthSegs: [
        [0, 0.0], [0.08, 0.42, 0.7], [0.20, 0.65, 1.0],
        [0.62, 1.0, 1.0], [0.82, 0.98, 1.0], [0.90, 0.52, 0.7], [1.0, 0.0, 0.5]
      ]
    };
    return buildGeo(18, 12, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w;
      var ux = (u - 0.5) * 2;
      var ang = lerp(baseTilt, midTilt, Math.pow(v, 0.88));
      var spineY = v * L * Math.cos(ang);
      var spineZ = v * L * Math.sin(ang);
      var conc = -0.011 * (1 - ux * ux) * w * v;
      return [ux * hw, spineY, spineZ + conc];
    });
  }

  function buildLilyPetalGeo(inner) {
    var L = inner ? 0.40 : 0.44, W = inner ? 0.135 : 0.155;
    var ruffle = 0.020;
    var shape = {
      widthSegs: [
        [0, 0.0], [0.07, 0.22, 0.8], [0.18, 0.52, 1.0],
        [0.44, 1.0, 1.0], [0.70, 0.88, 1.0], [0.86, 0.42, 0.7], [1.0, 0.0, 0.55]
      ]
    };
    return buildGeo(20, 14, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w;
      var ux = (u - 0.5) * 2;
      var ang = lerp(0.28, -1.30, Math.pow(v, 0.78));
      var spineY = v * L * Math.cos(ang);
      var spineZ = v * L * Math.sin(ang);
      var rf = ruffle * Math.sin(ux * Math.PI * 2.8 + v * 1.4) * v * w;
      return [ux * hw, spineY, spineZ + rf];
    });
  }

  function buildOrchidWingGeo(isDorsal) {
    var L = isDorsal ? 0.22 : 0.30, W = isDorsal ? 0.10 : 0.22;
    var shape = {
      widthSegs: [
        [0, 0.0], [0.12, 0.52, 0.8], [0.35, 0.85, 1.0],
        [0.62, 1.0, 1.0], [0.82, 0.65, 1.0], [1.0, 0.0, 0.55]
      ]
    };
    return buildGeo(16, 14, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w;
      var ux = (u - 0.5) * 2;
      var ang = lerp(0.04, isDorsal ? 0.40 : 0.65, Math.pow(v, 0.75));
      var spineY = v * L * Math.cos(ang);
      var spineZ = v * L * Math.sin(ang);
      var wave = 0.007 * Math.sin(ux * Math.PI * 2.2) * v;
      return [ux * hw, spineY, spineZ + wave];
    });
  }

  function buildOrchidLabellumGeo() {
    var L = 0.24, W = 0.20;
    var shape = {
      widthSegs: [
        [0, 0.0], [0.15, 0.55, 0.8], [0.30, 0.88, 1.0],
        [0.50, 1.0, 1.0], [0.65, 0.58, 1.0], [0.78, 0.72, 1.0], [1.0, 0.0, 0.6]
      ]
    };
    return buildGeo(20, 16, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w;
      var ux = (u - 0.5) * 2;
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
    var shape = {
      widthSegs: [
        [0, 0.0], [0.10, 0.55, 0.7], [0.22, 0.82, 1.0],
        [0.75, 1.0, 1.0], [0.88, 0.70, 1.0], [1.0, 0.12, 0.5]
      ]
    };
    return buildGeo(16, 8, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w;
      var ux = (u - 0.5) * 2;
      var ang = lerp(0.06, 0.32, v) + (v > 0.78 ? (v - 0.78) * 0.9 : 0);
      var spineY = v * L * Math.cos(ang);
      var spineZ = v * L * Math.sin(ang);
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
    var shape = {
      widthSegs: [
        [0, 0.0], [0.10, 0.42, 0.8], [0.22, 0.72, 1.0],
        [0.55, 1.0, 1.0], [0.78, 0.82, 1.0], [0.90, 0.35, 0.7], [1.0, 0.0, 0.6]
      ]
    };
    return buildGeo(18, 14, function (u, v) {
      var w = petalWidthProfile(v, shape);
      var hw = W * 0.5 * w;
      var ux = (u - 0.5) * 2;
      var ang = tilt + Math.pow(v, 1.25) * 0.38;
      var spineY = v * L * Math.cos(ang);
      var spineZ = v * L * Math.sin(ang);
      var cup = cupSign * 0.06 * (1 - ux * ux) * w * v;
      var rf = ruffle * Math.sin(ux * Math.PI * 5.2 + v * 2.8) * Math.max(0, v - 0.18) * w;
      return [ux * hw, spineY, spineZ + cup + rf];
    });
  }

  function makeMat(color, m, sheenColor) {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: m.roughness,
      metalness: 0.0,
      clearcoat: m.clearcoat,
      clearcoatRoughness: m.clearcoatRoughness,
      sheen: m.sheen,
      sheenRoughness: m.sheenRoughness,
      sheenColor: sheenColor,
      transmission: m.transmission,
      thickness: 0.038,
      ior: m.ior,
      side: THREE.DoubleSide
    });
  }

  function createRoseHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0.02, 0.12, 0.14);
    var m = { roughness: 0.38, clearcoat: 0.58, clearcoatRoughness: 0.26, sheen: 0.38, sheenRoughness: 0.52, transmission: 0.08, ior: 1.42 };
    var layers = 5, total = 28;
    var phi = 137.508 * Math.PI / 180;
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
        mesh.castShadow = true;
        g.add(mesh);
      }
    }
    var coneG = new THREE.ConeGeometry(0.011, 0.030, 10);
    var coneM = new THREE.MeshPhysicalMaterial({ color: base.clone().offsetHSL(0, -0.28, -0.28), roughness: 0.82 });
    var cone = new THREE.Mesh(coneG, coneM);
    cone.position.y = 0.010; cone.rotation.x = Math.PI;
    g.add(cone);
    var stG = new THREE.CylinderGeometry(0.0013, 0.0019, 0.022, 4);
    var stM = new THREE.MeshPhysicalMaterial({ color: 0xFFCC40, roughness: 0.38, metalness: 0.08, clearcoat: 0.4 });
    var tipG = new THREE.SphereGeometry(0.0045, 6, 5);
    for (var s = 0; s < 12; s++) {
      var sa = (s / 12) * Math.PI * 2, sr = rand(0.004, 0.018);
      var st = new THREE.Mesh(stG, stM);
      st.position.set(Math.cos(sa) * sr, 0.016, Math.sin(sa) * sr);
      st.rotation.z = rand(-0.35, 0.35); g.add(st);
      var tip = new THREE.Mesh(tipG, stM);
      tip.position.set(Math.cos(sa) * sr * 1.05, 0.028, Math.sin(sa) * sr * 1.05);
      g.add(tip);
    }
    return g;
  }

  function createTulipHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0, 0.06, 0.12);
    var m = { roughness: 0.46, clearcoat: 0.28, clearcoatRoughness: 0.50, sheen: 0.14, sheenRoughness: 0.72, transmission: 0.05, ior: 1.40 };
    var outerG = buildTulipPetalGeo(false);
    var innerG = buildTulipPetalGeo(true);
    var outerM = makeMat(base, m, sheen);
    var innerM = makeMat(base.clone().offsetHSL(0, -0.04, 0.06), m, sheen);
    for (var p = 0; p < 3; p++) {
      var a = (p / 3) * Math.PI * 2;
      var pm = new THREE.Mesh(outerG, outerM);
      pm.position.set(Math.cos(a) * 0.019, 0, Math.sin(a) * 0.019);
      pm.rotation.y = -a + Math.PI * 0.5; pm.castShadow = true; g.add(pm);
    }
    for (var p = 0; p < 3; p++) {
      var a = ((p + 0.5) / 3) * Math.PI * 2;
      var pm = new THREE.Mesh(innerG, innerM);
      pm.position.set(Math.cos(a) * 0.014, 0.004, Math.sin(a) * 0.014);
      pm.rotation.y = -a + Math.PI * 0.5; pm.castShadow = true; g.add(pm);
    }
    var pstG = new THREE.CylinderGeometry(0.004, 0.005, 0.14, 6);
    var pstM = new THREE.MeshPhysicalMaterial({ color: 0x7AAA44, roughness: 0.58 });
    var pst = new THREE.Mesh(pstG, pstM); pst.position.y = 0.048; g.add(pst);
    var stigG = new THREE.SphereGeometry(0.009, 8, 6);
    var stigM = new THREE.MeshPhysicalMaterial({ color: 0x6A9A36, roughness: 0.65 });
    var stig = new THREE.Mesh(stigG, stigM); stig.position.y = 0.122; stig.scale.y = 0.5; g.add(stig);
    var filG = new THREE.CylinderGeometry(0.0016, 0.002, 0.11, 4);
    var antG = new THREE.CylinderGeometry(0.004, 0.005, 0.028, 5);
    var antM = new THREE.MeshPhysicalMaterial({ color: 0x1A1508, roughness: 0.78 });
    for (var s = 0; s < 6; s++) {
      var sa = (s / 6) * Math.PI * 2;
      var fil = new THREE.Mesh(filG, pstM);
      fil.position.set(Math.cos(sa) * 0.013, 0.038, Math.sin(sa) * 0.013);
      g.add(fil);
      var ant = new THREE.Mesh(antG, antM);
      ant.position.set(Math.cos(sa) * 0.014, 0.094, Math.sin(sa) * 0.014);
      ant.rotation.z = rand(-0.18, 0.18); g.add(ant);
    }
    return g;
  }

  function createLilyHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0, 0, 0.16);
    var m = { roughness: 0.31, clearcoat: 0.70, clearcoatRoughness: 0.16, sheen: 0.20, sheenRoughness: 0.52, transmission: 0.16, ior: 1.46 };
    var outerG = buildLilyPetalGeo(false);
    var innerG = buildLilyPetalGeo(true);
    var outerM = makeMat(base, m, sheen);
    var innerM = makeMat(base.clone().offsetHSL(0, -0.03, 0.07), m, sheen);
    for (var p = 0; p < 3; p++) {
      var a = (p / 3) * Math.PI * 2;
      var pm = new THREE.Mesh(outerG, outerM);
      pm.position.set(Math.cos(a) * 0.014, 0, Math.sin(a) * 0.014);
      pm.rotation.y = -a + Math.PI * 0.5; pm.castShadow = true; g.add(pm);
    }
    for (var p = 0; p < 3; p++) {
      var a = ((p + 0.5) / 3) * Math.PI * 2;
      var pm = new THREE.Mesh(innerG, innerM);
      pm.position.set(Math.cos(a) * 0.010, 0.001, Math.sin(a) * 0.010);
      pm.rotation.y = -a + Math.PI * 0.5; pm.castShadow = true; g.add(pm);
    }
    var filG = new THREE.CylinderGeometry(0.0018, 0.0024, 0.22, 4);
    var filM = new THREE.MeshPhysicalMaterial({ color: 0xAACC66, roughness: 0.48 });
    var antG = new THREE.CylinderGeometry(0.005, 0.006, 0.028, 5);
    var antM = new THREE.MeshStandardMaterial({ color: 0x7B3F00, roughness: 0.72 });
    for (var s = 0; s < 6; s++) {
      var sa = (s / 6) * Math.PI * 2;
      var fil = new THREE.Mesh(filG, filM);
      var fx = Math.cos(sa) * 0.019, fz = Math.sin(sa) * 0.019;
      fil.position.set(fx, 0.068, fz);
      fil.rotation.z = Math.cos(sa) * 0.38; fil.rotation.x = Math.sin(sa) * 0.38;
      g.add(fil);
      var ant = new THREE.Mesh(antG, antM);
      ant.position.set(Math.cos(sa) * 0.028, 0.168, Math.sin(sa) * 0.028);
      ant.rotation.z = Math.cos(sa) * 0.52; ant.rotation.x = Math.sin(sa) * 0.52;
      g.add(ant);
    }
    var pistG = new THREE.CylinderGeometry(0.004, 0.005, 0.24, 6);
    var pistM = new THREE.MeshStandardMaterial({ color: 0x88AA44, roughness: 0.54 });
    var pist = new THREE.Mesh(pistG, pistM); pist.position.y = 0.088; g.add(pist);
    var stigG = new THREE.SphereGeometry(0.008, 8, 6);
    var stigma = new THREE.Mesh(stigG, pistM); stigma.position.y = 0.215; g.add(stigma);
    return g;
  }

  function createOrchidHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0, 0.12, 0.14);
    var m = { roughness: 0.40, clearcoat: 0.48, clearcoatRoughness: 0.36, sheen: 0.58, sheenRoughness: 0.46, transmission: 0.18, ior: 1.44 };
    var wingG = buildOrchidWingGeo(false);
    var dorsalG = buildOrchidWingGeo(true);
    var labG = buildOrchidLabellumGeo();
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
    var colG = new THREE.CylinderGeometry(0.007, 0.010, 0.048, 8);
    var colM = new THREE.MeshPhysicalMaterial({ color: base.clone().offsetHSL(0, -0.22, 0.12), roughness: 0.48, clearcoat: 0.35 });
    var col = new THREE.Mesh(colG, colM);
    col.position.set(0, 0.008, 0.026); col.rotation.x = 0.32; g.add(col);
    var polG = new THREE.SphereGeometry(0.006, 6, 5);
    var polM = new THREE.MeshPhysicalMaterial({ color: 0xFFE44A, roughness: 0.3, metalness: 0.1 });
    var pol = new THREE.Mesh(polG, polM);
    pol.position.set(0, 0.034, 0.030); pol.scale.y = 0.6; g.add(pol);
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
        ray.rotation.y = -a + Math.PI * 0.5;
        ray.scale.setScalar(ring.sc);
        ray.castShadow = true; g.add(ray);
      }
    });
    var diskG = new THREE.CylinderGeometry(0.224, 0.220, 0.028, 44);
    var diskM = new THREE.MeshStandardMaterial({ color: 0x150C04, roughness: 0.88 });
    var disk = new THREE.Mesh(diskG, diskM); disk.position.y = 0.014; g.add(disk);
    var dotG = new THREE.SphereGeometry(0.0062, 5, 4);
    var dotLightM = new THREE.MeshStandardMaterial({ color: 0x3D2408, roughness: 0.82 });
    var dotDarkM = new THREE.MeshStandardMaterial({ color: 0x0A0502, roughness: 0.92 });
    var phi = 137.508 * Math.PI / 180;
    for (var d = 0; d < 240; d++) {
      var dr = Math.sqrt(d / 240) * 0.208;
      var da = d * phi;
      var dot = new THREE.Mesh(dotG, d % 3 === 0 ? dotLightM : dotDarkM);
      dot.position.set(Math.cos(da) * dr, 0.030, Math.sin(da) * dr);
      dot.scale.y = 0.42; g.add(dot);
    }
    return g;
  }

  function createPeonyHead(color) {
    var g = new THREE.Group();
    var base = new THREE.Color(color);
    var sheen = base.clone().offsetHSL(0.01, 0.14, 0.20);
    var m = { roughness: 0.44, clearcoat: 0.34, clearcoatRoughness: 0.40, sheen: 0.84, sheenRoughness: 0.42, transmission: 0.05, ior: 1.42 };
    var layers = 6, total = 40;
    var phi = 137.508 * Math.PI / 180;
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
    var stG = new THREE.CylinderGeometry(0.0012, 0.0017, 0.030, 4);
    var tipG = new THREE.SphereGeometry(0.0052, 5, 4);
    var stM = new THREE.MeshPhysicalMaterial({ color: 0xFFD44C, roughness: 0.30, metalness: 0.10, clearcoat: 0.42 });
    for (var s = 0; s < 22; s++) {
      var sa = rand(0, Math.PI * 2), sr = rand(0, 0.030);
      var st = new THREE.Mesh(stG, stM);
      st.position.set(Math.cos(sa) * sr, 0.009, Math.sin(sa) * sr);
      st.rotation.z = rand(-0.32, 0.32); g.add(st);
      var tip = new THREE.Mesh(tipG, stM);
      tip.position.set(Math.cos(sa) * sr * 1.1, 0.030, Math.sin(sa) * sr * 1.1);
      g.add(tip);
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

  function createStem(length, type) {
    var curvature = type === 'tulip' ? 0.012 : 0.025;
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(rand(-curvature, curvature), -length * 0.3, rand(-curvature, curvature)),
      new THREE.Vector3(rand(-curvature * 1.4, curvature * 1.4), -length * 0.65, rand(-curvature * 1.4, curvature * 1.4)),
      new THREE.Vector3(rand(-curvature * 0.5, curvature * 0.5), -length, rand(-curvature * 0.5, curvature * 0.5))
    ]);
    var thickness = type === 'tulip' ? 0.014 : type === 'lily' ? 0.016 : 0.015;
    var stemG = new THREE.TubeGeometry(curve, 14, thickness, 7, false);
    var stemM = new THREE.MeshStandardMaterial({ color: '#2d5016', roughness: 0.68, metalness: 0.04 });
    var stemMesh = new THREE.Mesh(stemG, stemM);
    var group = new THREE.Group(); group.add(stemMesh);
    var leafCnt = Math.floor(rand(1, 3));
    for (var i = 0; i < leafCnt; i++) {
      var leaf = createLeaf(type);
      var pt = curve.getPoint(rand(0.28, 0.72));
      leaf.position.copy(pt);
      leaf.rotation.y = rand(0, Math.PI * 2);
      leaf.rotation.z = rand(-0.5, 0.4);
      leaf.rotation.x = rand(-0.25, 0.25);
      group.add(leaf);
    }
    return { group: group, curve: curve };
  }

  function createLeaf(type) {
    var shape = new THREE.Shape();
    if (type === 'tulip') {
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.06, 0.02, 0.06, 0.10, 0.03, 0.18);
      shape.bezierCurveTo(0.01, 0.22, -0.01, 0.22, -0.03, 0.18);
      shape.bezierCurveTo(-0.06, 0.10, -0.06, 0.02, 0, 0);
    } else if (type === 'lily') {
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.05, 0.01, 0.06, 0.08, 0.04, 0.16);
      shape.bezierCurveTo(0.02, 0.22, -0.02, 0.22, -0.04, 0.16);
      shape.bezierCurveTo(-0.06, 0.08, -0.05, 0.01, 0, 0);
    } else {
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.038, 0.008, 0.044, 0.06, 0.028, 0.13);
      shape.bezierCurveTo(0.012, 0.18, -0.012, 0.18, -0.028, 0.13);
      shape.bezierCurveTo(-0.044, 0.06, -0.038, 0.008, 0, 0);
    }
    var leafG = new THREE.ShapeGeometry(shape, 8);
    var leafM = new THREE.MeshStandardMaterial({ color: type === 'tulip' ? '#3a7020' : '#2e7d32', roughness: 0.58, metalness: 0.04, side: THREE.DoubleSide });
    var leaf = new THREE.Mesh(leafG, leafM);
    leaf.scale.set(1.6, 1.6, 1);
    return leaf;
  }

  function createWrapping(stemCount, color, isLuxury) {
    var group = new THREE.Group();
    var topR = 0.44 + stemCount * 0.011, botR = 0.11;
    var rows = 18, segs = 36;
    var pos = [], nrm = [], uvw = [], idxW = [];
    for (var j = 0; j <= rows; j++) {
      var t = j / rows;
      var r = lerp(botR, topR, t);
      var y = -0.82 + t * 0.62;
      var rA = t > 0.68 ? (t - 0.68) * 2.8 : 0;
      for (var i = 0; i <= segs; i++) {
        var a = (i / segs) * Math.PI * 2;
        var rf = rA * Math.sin(a * 8) * 0.042, fd = rA * Math.cos(a * 3) * 0.028;
        var x = Math.cos(a) * (r + rf), z = Math.sin(a) * (r + rf);
        pos.push(x, y + fd, z);
        nrm.push(Math.cos(a), 0.18, Math.sin(a));
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
    wG.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    wG.setAttribute('uv', new THREE.Float32BufferAttribute(uvw, 2));
    wG.setIndex(idxW); wG.computeVertexNormals();
    var wM = new THREE.MeshPhysicalMaterial({
      color: isLuxury ? '#1a0a2e' : '#8B6914',
      roughness: isLuxury ? 0.28 : 0.68,
      metalness: isLuxury ? 0.18 : 0.02,
      clearcoat: isLuxury ? 0.4 : 0.05,
      side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(wG, wM));
    var ribCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.66, botR + 0.02),
      new THREE.Vector3(0.10, -0.56, botR + 0.09),
      new THREE.Vector3(-0.06, -0.46, botR + 0.16),
      new THREE.Vector3(0.09, -0.36, botR + 0.11)
    ]);
    var ribM = new THREE.MeshStandardMaterial({ color: isLuxury ? '#FFD700' : color, roughness: 0.18, metalness: 0.42 });
    group.add(new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 12, 0.014, 5, false), ribM));
    var bowG = new THREE.TorusGeometry(0.058, 0.011, 6, 12, Math.PI * 1.4);
    var b1 = new THREE.Mesh(bowG, ribM);
    b1.position.set(0, -0.56, botR + 0.02); b1.rotation.x = Math.PI * 0.5; b1.rotation.z = 0.30;
    group.add(b1);
    var b2 = b1.clone(); b2.rotation.z = -0.30 + Math.PI; b2.position.x = 0.01;
    group.add(b2);
    return group;
  }

  function buildBouquet(cfg) {
    if (!THREE) return;
    if (bouquetGroup) {
      scene.remove(bouquetGroup);
      bouquetGroup.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
          else obj.material.dispose();
        }
      });
    }
    bouquetGroup = new THREE.Group();
    var type = cfg.flower || 'rose';
    var count = cfg.bloomCount || 12;
    var color = cfg.color || '#DC143C';
    var phi = 137.508 * Math.PI / 180;
    var stemLength = 1.0;
    for (var i = 0; i < count; i++) {
      var fg = new THREE.Group();
      var head = createFlowerHead(type, color);
      var stemData = createStem(stemLength, type);
      var ring = Math.floor(Math.sqrt(i));
      var radius = ring * 0.12 + 0.02;
      var angle = i * phi;
      var x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      var yVar = rand(-0.082, 0.082);
      head.position.set(x, yVar, z);
      head.rotation.set(rand(-0.14, 0.14), rand(0, Math.PI * 2), rand(-0.14, 0.14));
      var hs = rand(0.86, 1.14);
      head.scale.set(hs, hs, hs);
      stemData.group.position.set(x, -0.05, z);
      fg.add(head); fg.add(stemData.group);
      bouquetGroup.add(fg);
    }
    if (cfg.wrapping || cfg.luxury) bouquetGroup.add(createWrapping(count, color, cfg.luxury));
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
    camera.position.set(0, 0.38, 2.5);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    var fill = new THREE.DirectionalLight(0xe8d5ff, 0.52);
    fill.position.set(-3, 2, -2); scene.add(fill);
    var rim = new THREE.PointLight(0xff6b9d, 0.82, 10);
    rim.position.set(-2, 3, -3); scene.add(rim);
    var bot = new THREE.PointLight(0xffd700, 0.32, 8);
    bot.position.set(0, -2, 1); scene.add(bot);
    scene.add(new THREE.HemisphereLight(0xffeedd, 0x1a0a2e, 0.42));
    var floorG = new THREE.CircleGeometry(3, 36);
    var floorM = new THREE.MeshStandardMaterial({ color: '#080412', roughness: 0.96 });
    var floor = new THREE.Mesh(floorG, floorM);
    floor.rotation.x = -Math.PI * 0.5; floor.position.y = -1.42;
    floor.receiveShadow = true; scene.add(floor);
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
      bouquetGroup.children.forEach(function (child, i) {
        if (child.children && child.children[0]) {
          child.children[0].position.y += Math.sin(t + i * 0.52) * 0.00014;
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
      if (renderer.domElement && renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    scene = camera = renderer = controls = bouquetGroup = null;
    loaded = false;
  }

  async function init(containerEl, cfg) {
    if (loaded) { updateConfig(cfg); return; }
    try {
      await loadThreeJS();
      setupScene(containerEl);
      currentConfig = Object.assign({}, currentConfig, cfg);
      buildBouquet(currentConfig);
      loaded = true;
    } catch (e) { console.error('[BouquetRenderer] Init failed:', e); }
  }

  function updateConfig(cfg) {
    if (!loaded || !THREE) return;
    var changed = false;
    Object.keys(cfg).forEach(function (k) { if (currentConfig[k] !== cfg[k]) { currentConfig[k] = cfg[k]; changed = true; } });
    if (changed) buildBouquet(currentConfig);
  }

  function exportGLB() {
    return new Promise(function (resolve, reject) {
      if (!loaded || !bouquetGroup || !GLTFExporter) { reject(new Error('renderer not ready')); return; }
      var root = new THREE.Group();
      var clone = bouquetGroup.clone(true);
      clone.rotation.set(0, 0, 0); clone.position.set(0, 0, 0);
      root.add(clone);
      var box = new THREE.Box3().setFromObject(root);
      var size = box.getSize(new THREE.Vector3());
      var sc = 0.45 / Math.max(size.x, size.y, size.z);
      root.scale.setScalar(sc);
      var ctr = box.getCenter(new THREE.Vector3()).multiplyScalar(sc);
      root.position.set(-ctr.x, -box.min.y * sc, -ctr.z);
      new GLTFExporter().parse(root,
        function (buf) { resolve(URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }))); },
        function (err) { reject(err); },
        { binary: true, embedImages: true, onlyVisible: true, includeCustomExtensions: false }
      );
    });
  }

  window.BloomBouquetRenderer = {
    init: init,
    updateConfig: updateConfig,
    dispose: dispose,
    exportGLB: exportGLB,
    isReady: function () { return loaded; }
  };
})();
