(function () {
  'use strict';
  if (window.BloomBouquetRenderer) return;

  var THREE_SPECIFIER = 'three';
  var ORBIT_SPECIFIER = 'three/addons/controls/OrbitControls.js';
  var EXPORTER_SPECIFIER = 'three/addons/exporters/GLTFExporter.js';
  var RGBE_SPECIFIER = 'three/addons/loaders/RGBELoader.js';
  var ROOM_SPECIFIER = 'three/addons/environments/RoomEnvironment.js';

  var renderer, scene, camera, controls, bouquetGroup, animId, pmrem, envTex;
  var container = null;
  var loaded = false;
  var THREE = null;
  var OrbitControls = null;
  var GLTFExporter = null;
  var RoomEnvironment = null;


  var currentConfig = {
    flower: 'rose',
    color: '#DC143C',
    bloomCount: 12,
    wrapping: false,
    luxury: false
  };

  var FLOWER_PROFILES = {
    rose: {
      petalCount: 28, petalLayers: 6, petalWidth: 0.20, petalLength: 0.34,
      centerRadius: 0.05, thickness: 0.006, phyllotaxis: 137.508,
      bezier: { p1: [0.55, 0.10, 0.05], p2: [0.85, 0.65, 0.35], p3: [0.20, 1.00, 0.55] },
      taper: 0.35, ruffle: 0.18, twist: 0.22, reflex: 0.10,
      material: { roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.30, sheen: 0.25, sheenRoughness: 0.7, transmission: 0.08, ior: 1.42 }
    },
    tulip: {
      petalCount: 6, petalLayers: 2, petalWidth: 0.19, petalLength: 0.42,
      centerRadius: 0.035, thickness: 0.010, phyllotaxis: 60,
      bezier: { p1: [0.40, 0.20, 0.02], p2: [0.55, 0.70, 0.06], p3: [0.30, 1.00, 0.18] },
      taper: 0.55, ruffle: 0.02, twist: 0.05, reflex: -0.15,
      material: { roughness: 0.55, clearcoat: 0.20, clearcoatRoughness: 0.55, sheen: 0.10, sheenRoughness: 0.8, transmission: 0.04, ior: 1.40 }
    },
    lily: {
      petalCount: 6, petalLayers: 2, petalWidth: 0.18, petalLength: 0.52,
      centerRadius: 0.04, thickness: 0.005, phyllotaxis: 60,
      bezier: { p1: [0.50, 0.15, 0.0], p2: [0.75, 0.55, -0.20], p3: [0.25, 1.00, -0.45] },
      taper: 0.30, ruffle: 0.06, twist: 0.10, reflex: 0.85,
      material: { roughness: 0.38, clearcoat: 0.70, clearcoatRoughness: 0.20, sheen: 0.15, sheenRoughness: 0.6, transmission: 0.14, ior: 1.45 }
    },
    orchid: {
      petalCount: 5, petalLayers: 1, petalWidth: 0.30, petalLength: 0.36,
      centerRadius: 0.06, thickness: 0.004, phyllotaxis: 72,
      bezier: { p1: [0.65, 0.25, 0.04], p2: [0.95, 0.55, 0.10], p3: [0.55, 1.00, 0.05] },
      taper: 0.20, ruffle: 0.30, twist: 0.35, reflex: 0.05,
      material: { roughness: 0.48, clearcoat: 0.40, clearcoatRoughness: 0.45, sheen: 0.55, sheenRoughness: 0.5, transmission: 0.18, ior: 1.43 }
    },
    sunflower: {
      petalCount: 28, petalLayers: 2, petalWidth: 0.07, petalLength: 0.48,
      centerRadius: 0.20, thickness: 0.007, phyllotaxis: 137.508,
      bezier: { p1: [0.35, 0.20, 0.0], p2: [0.50, 0.65, 0.04], p3: [0.20, 1.00, 0.0] },
      taper: 0.65, ruffle: 0.05, twist: 0.02, reflex: -0.05,
      material: { roughness: 0.62, clearcoat: 0.10, clearcoatRoughness: 0.65, sheen: 0.05, sheenRoughness: 0.85, transmission: 0.02, ior: 1.39 }
    },
    peony: {
      petalCount: 42, petalLayers: 7, petalWidth: 0.24, petalLength: 0.30,
      centerRadius: 0.06, thickness: 0.005, phyllotaxis: 137.508,
      bezier: { p1: [0.70, 0.20, 0.10], p2: [1.05, 0.55, 0.55], p3: [0.10, 1.00, 0.75] },
      taper: 0.40, ruffle: 0.35, twist: 0.28, reflex: 0.20,
      material: { roughness: 0.50, clearcoat: 0.30, clearcoatRoughness: 0.40, sheen: 0.85, sheenRoughness: 0.45, transmission: 0.06, ior: 1.42 }
    }
  };


  function rand(min, max) { return min + Math.random() * (max - min); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  async function loadThreeJS() {
    if (THREE) return;
    var [t, o, e, r] = await Promise.all([
      import(THREE_SPECIFIER),
      import(ORBIT_SPECIFIER),
      import(EXPORTER_SPECIFIER),
      import(ROOM_SPECIFIER)
    ]);
    THREE = t;
    OrbitControls = o.OrbitControls;
    GLTFExporter = e.GLTFExporter;
    RoomEnvironment = r.RoomEnvironment;
  }


  function bez3(p0, p1, p2, p3, t) {
    var mt = 1 - t, mt2 = mt * mt, t2 = t * t;
    return p0 * mt2 * mt + 3 * p1 * mt2 * t + 3 * p2 * mt * t2 + p3 * t2 * t;
  }

  function bez3d(p0, p1, p2, p3, t) {
    var mt = 1 - t;
    return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
  }

  function createPetalGeometry(profile, layer, totalLayers) {
    var lenSeg = 18, widSeg = 10;
    var positions = new Float32Array((lenSeg + 1) * (widSeg + 1) * 3);
    var normals = new Float32Array((lenSeg + 1) * (widSeg + 1) * 3);
    var uvs = new Float32Array((lenSeg + 1) * (widSeg + 1) * 2);
    var indices = [];

    var layerT = totalLayers > 1 ? layer / (totalLayers - 1) : 0;
    var openness = lerp(0.15, 1.0, layerT);
    var sizeScale = lerp(0.55, 1.05, layerT);
    var W = profile.petalWidth * sizeScale;
    var L = profile.petalLength * sizeScale;
    var b = profile.bezier;
    var reflex = profile.reflex * openness;
    var twist = profile.twist * openness;
    var ruffle = profile.ruffle;
    var taper = profile.taper;
    var th = profile.thickness;

    var p0x = 0, p0y = 0, p0z = 0;
    var p1x = b.p1[0] * L, p1y = b.p1[1] * L, p1z = b.p1[2] + reflex * 0.3;
    var p2x = b.p2[0] * L, p2y = b.p2[1] * L, p2z = b.p2[2] + reflex * 0.6;
    var p3x = b.p3[0] * L, p3y = b.p3[1] * L, p3z = b.p3[2] + reflex;

    var idx = 0, uIdx = 0;
    for (var j = 0; j <= lenSeg; j++) {
      var t = j / lenSeg;
      var sx = bez3(p0x, p1x, p2x, p3x, t);
      var sy = bez3(p0y, p1y, p2y, p3y, t);
      var sz = bez3(p0z, p1z, p2z, p3z, t);
      var tx = bez3d(p0x, p1x, p2x, p3x, t);
      var ty = bez3d(p0y, p1y, p2y, p3y, t);
      var tz = bez3d(p0z, p1z, p2z, p3z, t);
      var tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      var bx = ty * 0 - tz * 0, by = tz * 1 - tx * 0, bz = tx * 0 - ty * 1;
      var bl = Math.hypot(bx, by, bz) || 1;
      bx = 1; by = 0; bz = 0;
      var nx0 = ty * bz - tz * by, ny0 = tz * bx - tx * bz, nz0 = tx * by - ty * bx;
      var nl0 = Math.hypot(nx0, ny0, nz0) || 1;
      nx0 /= nl0; ny0 /= nl0; nz0 /= nl0;

      var widthAtT = W * Math.pow(Math.sin(t * Math.PI), 0.85) * (1 - taper * t);
      var twistA = twist * t * Math.PI;
      var cT = Math.cos(twistA), sT = Math.sin(twistA);

      for (var i = 0; i <= widSeg; i++) {
        var u = i / widSeg;
        var wx = (u - 0.5) * 2;
        var rf = ruffle * Math.sin(wx * Math.PI * 3) * t * t * 0.5;
        var local = wx * widthAtT;
        var ox = local * cT;
        var oz = local * sT + rf;
        var thick = th * Math.sin(u * Math.PI);

        var px = sx + ox;
        var py = sy;
        var pz = sz + oz + thick;

        positions[idx] = px;
        positions[idx + 1] = py;
        positions[idx + 2] = pz;

        var nx = nx0 - sT * 0.4 * (1 - Math.abs(wx));
        var ny = ny0;
        var nz = nz0 + cT * 0.4 * (1 - Math.abs(wx));
        var nl = Math.hypot(nx, ny, nz) || 1;
        normals[idx] = nx / nl;
        normals[idx + 1] = ny / nl;
        normals[idx + 2] = nz / nl;

        uvs[uIdx] = u;
        uvs[uIdx + 1] = t;
        idx += 3; uIdx += 2;
      }
    }

    var rowSize = widSeg + 1;
    for (var jj = 0; jj < lenSeg; jj++) {
      for (var ii = 0; ii < widSeg; ii++) {
        var a = jj * rowSize + ii;
        var bb = a + rowSize;
        var c = a + 1;
        var d = bb + 1;
        indices.push(a, bb, c, c, bb, d);
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }


  function createFlowerHead(profile, color) {
    var group = new THREE.Group();
    var baseColor = new THREE.Color(color);
    var sheenTint = baseColor.clone().offsetHSL(0.02, 0.15, 0.18);
    var layers = profile.petalLayers;
    var totalPetals = profile.petalCount;
    var m = profile.material;
    var goldenAngle = profile.phyllotaxis * Math.PI / 180;

    for (var layer = 0; layer < layers; layer++) {
      var layerT = layers > 1 ? layer / (layers - 1) : 0;
      var petalGeo = createPetalGeometry(profile, layer, layers);
      var petalColor = baseColor.clone().offsetHSL(0, -layerT * 0.08, layerT * 0.06);

      var mat = new THREE.MeshPhysicalMaterial({
        color: petalColor,
        roughness: m.roughness,
        metalness: 0.0,
        clearcoat: m.clearcoat,
        clearcoatRoughness: m.clearcoatRoughness,
        sheen: m.sheen,
        sheenRoughness: m.sheenRoughness,
        sheenColor: sheenTint,
        transmission: m.transmission,
        thickness: 0.05,
        ior: m.ior,
        attenuationDistance: 0.6,
        attenuationColor: petalColor,
        side: THREE.DoubleSide,
        flatShading: false
      });

      var layerCount = Math.max(3, Math.round(totalPetals / layers * lerp(0.55, 1.15, layerT)));
      var openAngle = lerp(-1.35, -0.25, layerT);
      var radiusBase = profile.centerRadius * lerp(0.25, 1.05, layerT);

      for (var p = 0; p < layerCount; p++) {
        var petal = new THREE.Mesh(petalGeo, mat);
        var angle = p * goldenAngle + layer * 0.41;
        petal.position.set(Math.cos(angle) * radiusBase, layerT * 0.012, Math.sin(angle) * radiusBase);
        petal.rotation.y = -angle + Math.PI / 2;
        petal.rotation.x = openAngle + rand(-0.06, 0.06);
        petal.rotation.z = rand(-0.04, 0.04);
        petal.castShadow = true;
        petal.receiveShadow = true;
        group.add(petal);
      }
    }

    var centerGeo = new THREE.SphereGeometry(profile.centerRadius * 0.85, 24, 18);
    var centerHex = profile.petalCount > 18 ? '#2b1d10' : baseColor.clone().offsetHSL(0.04, -0.25, -0.28).getHexString();
    var centerMat = new THREE.MeshPhysicalMaterial({
      color: typeof centerHex === 'string' && centerHex.length === 6 ? '#' + centerHex : centerHex,
      roughness: 0.85,
      metalness: 0.0,
      sheen: 0.4,
      sheenRoughness: 0.6,
      clearcoat: 0.15
    });
    var center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = 0.018;
    center.scale.y = 0.55;
    center.castShadow = true;
    group.add(center);

    if (profile.petalCount >= 18 && profile.centerRadius >= 0.05) {
      var stamenCount = profile.flower === 'sunflower' ? 0 : 10;
      var stamenGeo = new THREE.CylinderGeometry(0.0025, 0.0035, 0.055, 5);
      var tipGeo = new THREE.SphereGeometry(0.009, 8, 6);
      var stamenMat = new THREE.MeshPhysicalMaterial({
        color: 0xFFC93C, roughness: 0.35, metalness: 0.15,
        clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: 0xFFE066
      });
      for (var s = 0; s < stamenCount; s++) {
        var sa = (s / stamenCount) * Math.PI * 2;
        var sr = profile.centerRadius * 0.45;
        var stem = new THREE.Mesh(stamenGeo, stamenMat);
        stem.position.set(Math.cos(sa) * sr, 0.035, Math.sin(sa) * sr);
        stem.rotation.z = rand(-0.25, 0.25);
        stem.castShadow = true;
        group.add(stem);
        var tip = new THREE.Mesh(tipGeo, stamenMat);
        tip.position.set(Math.cos(sa) * sr, 0.065, Math.sin(sa) * sr);
        group.add(tip);
      }
    }

    return group;
  }


  function createStem(length) {
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(rand(-0.02, 0.02), -length * 0.3, rand(-0.02, 0.02)),
      new THREE.Vector3(rand(-0.03, 0.03), -length * 0.6, rand(-0.03, 0.03)),
      new THREE.Vector3(rand(-0.01, 0.01), -length, rand(-0.01, 0.01))
    ]);

    var stemGeo = new THREE.TubeGeometry(curve, 12, 0.018, 6, false);
    var stemMat = new THREE.MeshStandardMaterial({ color: '#2d5016', roughness: 0.7, metalness: 0.05 });
    var stem = new THREE.Mesh(stemGeo, stemMat);

    var group = new THREE.Group();
    group.add(stem);

    var leafCount = Math.floor(rand(1, 3));
    for (var i = 0; i < leafCount; i++) {
      var leaf = createLeaf();
      var t = rand(0.3, 0.7);
      var pt = curve.getPoint(t);
      leaf.position.copy(pt);
      leaf.rotation.y = rand(0, Math.PI * 2);
      leaf.rotation.z = rand(-0.5, 0.5);
      leaf.rotation.x = rand(-0.3, 0.3);
      group.add(leaf);
    }

    return { group: group, curve: curve };
  }

  function createLeaf() {
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.04, 0.04, 0.02, 0.12);
    shape.quadraticCurveTo(0, 0.14, -0.02, 0.12);
    shape.quadraticCurveTo(-0.04, 0.04, 0, 0);

    var leafGeo = new THREE.ShapeGeometry(shape, 6);
    var leafMat = new THREE.MeshStandardMaterial({
      color: '#2e7d32',
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    var leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.scale.set(1.5, 1.5, 1);
    return leaf;
  }

  function createWrapping(stemCount, color, isLuxury) {
    var group = new THREE.Group();
    var height = 0.6;
    var topRadius = 0.45 + stemCount * 0.012;
    var bottomRadius = 0.12;
    var segments = 32;
    var positions = [];
    var normals2 = [];
    var uvs2 = [];
    var indices2 = [];
    var rows = 16;

    for (var j = 0; j <= rows; j++) {
      var t = j / rows;
      var r = lerp(bottomRadius, topRadius, t);
      var y = -0.8 + t * height;
      var ruffleAmount = t > 0.7 ? (t - 0.7) * 2.5 : 0;

      for (var i = 0; i <= segments; i++) {
        var angle = (i / segments) * Math.PI * 2;
        var ruffle = ruffleAmount * Math.sin(angle * 8) * 0.04;
        var fold = ruffleAmount * Math.cos(angle * 3) * 0.03;
        var x = Math.cos(angle) * (r + ruffle);
        var z = Math.sin(angle) * (r + ruffle);
        var yOff = y + fold;
        positions.push(x, yOff, z);
        normals2.push(Math.cos(angle), 0.2, Math.sin(angle));
        uvs2.push(i / segments, t);
      }
    }

    var rs = segments + 1;
    for (var j2 = 0; j2 < rows; j2++) {
      for (var i2 = 0; i2 < segments; i2++) {
        var a = j2 * rs + i2;
        var b2 = a + rs;
        var c2 = a + 1;
        var d2 = b2 + 1;
        indices2.push(a, b2, c2, c2, b2, d2);
      }
    }

    var wrapGeo = new THREE.BufferGeometry();
    wrapGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    wrapGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals2, 3));
    wrapGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs2, 2));
    wrapGeo.setIndex(indices2);
    wrapGeo.computeVertexNormals();

    var wrapColor = isLuxury ? '#1a0a2e' : '#8B6914';
    var wrapMat = new THREE.MeshStandardMaterial({
      color: wrapColor,
      roughness: isLuxury ? 0.3 : 0.7,
      metalness: isLuxury ? 0.15 : 0.02,
      side: THREE.DoubleSide
    });
    var wrap = new THREE.Mesh(wrapGeo, wrapMat);
    group.add(wrap);

    var ribbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.65, bottomRadius + 0.02),
      new THREE.Vector3(0.1, -0.55, bottomRadius + 0.08),
      new THREE.Vector3(-0.05, -0.45, bottomRadius + 0.15),
      new THREE.Vector3(0.08, -0.35, bottomRadius + 0.1)
    ]);
    var ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 12, 0.015, 4, false);
    var ribbonMat = new THREE.MeshStandardMaterial({
      color: isLuxury ? '#FFD700' : color,
      roughness: 0.2,
      metalness: 0.4
    });
    var ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    group.add(ribbon);

    var bowGeo = new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI * 1.4);
    var bow1 = new THREE.Mesh(bowGeo, ribbonMat);
    bow1.position.set(0, -0.55, bottomRadius + 0.02);
    bow1.rotation.x = Math.PI / 2;
    bow1.rotation.z = 0.3;
    group.add(bow1);
    var bow2 = bow1.clone();
    bow2.rotation.z = -0.3 + Math.PI;
    bow2.position.x = 0.01;
    group.add(bow2);

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
    var profile = FLOWER_PROFILES[cfg.flower] || FLOWER_PROFILES.rose;
    var count = cfg.bloomCount || 12;
    var color = cfg.color || '#DC143C';

    var spiralAngle = 137.508 * (Math.PI / 180);
    var stemLength = 1.0;

    for (var i = 0; i < count; i++) {
      var flowerGroup = new THREE.Group();
      var head = createFlowerHead(profile, color);
      var stemData = createStem(stemLength);

      var ring = Math.floor(Math.sqrt(i));
      var indexInRing = i - ring * ring;
      var angle = i * spiralAngle;
      var radius = ring * 0.12 + 0.02;
      var x = Math.cos(angle) * radius;
      var z = Math.sin(angle) * radius;
      var heightVariation = rand(-0.08, 0.08);

      head.position.set(x, heightVariation, z);
      head.rotation.set(rand(-0.15, 0.15), rand(0, Math.PI * 2), rand(-0.15, 0.15));
      var headScale = rand(0.85, 1.15);
      head.scale.set(headScale, headScale, headScale);

      stemData.group.position.set(x, -0.05, z);

      flowerGroup.add(head);
      flowerGroup.add(stemData.group);
      bouquetGroup.add(flowerGroup);
    }

    if (cfg.wrapping || cfg.luxury) {
      var wrap = createWrapping(count, color, cfg.luxury);
      bouquetGroup.add(wrap);
    }

    var box = new THREE.Box3().setFromObject(bouquetGroup);
    var center = box.getCenter(new THREE.Vector3());
    bouquetGroup.position.sub(center);
    bouquetGroup.position.y += 0.1;

    scene.add(bouquetGroup);
  }

  function setupScene(containerEl) {
    container = containerEl;
    var w = container.clientWidth;
    var h = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 100);
    camera.position.set(0, 0.35, 2.4);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;


    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.minDistance = 1;
    controls.maxDistance = 6;
    controls.target.set(0, 0, 0);
    controls.enablePan = false;

    var ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    scene.add(ambientLight);

    var keyLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 20;
    scene.add(keyLight);

    var fillLight = new THREE.DirectionalLight(0xe8d5ff, 0.5);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    var rimLight = new THREE.PointLight(0xff6b9d, 0.8, 10);
    rimLight.position.set(-2, 3, -3);
    scene.add(rimLight);

    var bottomLight = new THREE.PointLight(0xffd700, 0.3, 8);
    bottomLight.position.set(0, -2, 1);
    scene.add(bottomLight);

    var hemiLight = new THREE.HemisphereLight(0xffeedd, 0x1a0a2e, 0.4);
    scene.add(hemiLight);

    var floorGeo = new THREE.CircleGeometry(3, 32);
    var floorMat = new THREE.MeshStandardMaterial({ color: '#0a0514', roughness: 0.95, metalness: 0 });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    floor.receiveShadow = true;
    scene.add(floor);

    window.addEventListener('resize', onResize);
    animate();
  }

  function onResize() {
    if (!container || !renderer) return;
    var w = container.clientWidth;
    var h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (bouquetGroup) {
      bouquetGroup.children.forEach(function (child, i) {
        if (child.children && child.children[0]) {
          child.children[0].position.y += Math.sin(Date.now() * 0.001 + i * 0.5) * 0.00015;
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
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    bouquetGroup = null;
    loaded = false;
  }

  async function init(containerEl, cfg) {
    if (loaded) {
      updateConfig(cfg);
      return;
    }
    try {
      await loadThreeJS();
      setupScene(containerEl);
      currentConfig = Object.assign({}, currentConfig, cfg);
      buildBouquet(currentConfig);
      loaded = true;
    } catch (e) {
      console.error('[BouquetRenderer] Init failed:', e);
    }
  }

  function updateConfig(cfg) {
    if (!loaded || !THREE) return;
    var changed = false;
    Object.keys(cfg).forEach(function (k) {
      if (currentConfig[k] !== cfg[k]) { currentConfig[k] = cfg[k]; changed = true; }
    });
    if (changed) buildBouquet(currentConfig);
  }

  function exportGLB() {
    return new Promise(function (resolve, reject) {
      if (!loaded || !bouquetGroup || !GLTFExporter) { reject(new Error('renderer not ready')); return; }
      var exportRoot = new THREE.Group();
      var clone = bouquetGroup.clone(true);
      clone.rotation.set(0, 0, 0);
      clone.position.set(0, 0, 0);
      exportRoot.add(clone);
      var box = new THREE.Box3().setFromObject(exportRoot);
      var size = box.getSize(new THREE.Vector3());
      var target = 0.45;
      var scale = target / Math.max(size.x, size.y, size.z);
      exportRoot.scale.setScalar(scale);
      var center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      exportRoot.position.set(-center.x, -box.min.y * scale, -center.z);

      new GLTFExporter().parse(
        exportRoot,
        function (buf) {
          var blob = new Blob([buf], { type: 'model/gltf-binary' });
          resolve(URL.createObjectURL(blob));
        },
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
