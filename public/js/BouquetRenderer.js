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


  var currentConfig = {
    flower: 'rose',
    color: '#DC143C',
    bloomCount: 12,
    wrapping: false,
    luxury: false
  };

  var FLOWER_PROFILES = {
    rose: {
      flower: 'rose', petalCount: 26, petalLayers: 5, petalWidth: 0.18, petalLength: 0.28,
      centerRadius: 0.04, cupInner: 0.6, cupOuter: 0.2, bendInner: 0.15, bendOuter: 0.9,
      reflex: 0.3, ruffle: 0.008, widthPow: 0.8,
      material: { roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.3, sheenRoughness: 0.6, transmission: 0.08, ior: 1.42 }
    },
    tulip: {
      flower: 'tulip', petalCount: 6, petalLayers: 2, petalWidth: 0.16, petalLength: 0.38,
      centerRadius: 0.03, cupInner: 0.7, cupOuter: 0.5, bendInner: 0.08, bendOuter: 0.25,
      reflex: 0.0, ruffle: 0.0, widthPow: 0.65,
      material: { roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5, sheen: 0.1, sheenRoughness: 0.8, transmission: 0.05, ior: 1.40 }
    },
    lily: {
      flower: 'lily', petalCount: 6, petalLayers: 2, petalWidth: 0.14, petalLength: 0.42,
      centerRadius: 0.03, cupInner: 0.3, cupOuter: 0.15, bendInner: 0.3, bendOuter: 1.1,
      reflex: 0.6, ruffle: 0.012, widthPow: 0.9,
      material: { roughness: 0.35, clearcoat: 0.65, clearcoatRoughness: 0.2, sheen: 0.15, sheenRoughness: 0.6, transmission: 0.12, ior: 1.45 }
    },
    orchid: {
      flower: 'orchid', petalCount: 5, petalLayers: 1, petalWidth: 0.22, petalLength: 0.30,
      centerRadius: 0.04, cupInner: 0.25, cupOuter: 0.15, bendInner: 0.2, bendOuter: 0.6,
      reflex: 0.1, ruffle: 0.015, widthPow: 0.7,
      material: { roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.4, sheen: 0.5, sheenRoughness: 0.5, transmission: 0.15, ior: 1.43 }
    },
    sunflower: {
      flower: 'sunflower', petalCount: 24, petalLayers: 2, petalWidth: 0.06, petalLength: 0.35,
      centerRadius: 0.18, cupInner: 0.15, cupOuter: 0.08, bendInner: 0.6, bendOuter: 0.9,
      reflex: 0.0, ruffle: 0.0, widthPow: 0.5,
      material: { roughness: 0.6, clearcoat: 0.1, clearcoatRoughness: 0.6, sheen: 0.05, sheenRoughness: 0.85, transmission: 0.02, ior: 1.39 }
    },
    peony: {
      flower: 'peony', petalCount: 36, petalLayers: 6, petalWidth: 0.20, petalLength: 0.24,
      centerRadius: 0.05, cupInner: 0.55, cupOuter: 0.15, bendInner: 0.12, bendOuter: 0.85,
      reflex: 0.2, ruffle: 0.02, widthPow: 0.75,
      material: { roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.4, sheen: 0.8, sheenRoughness: 0.45, transmission: 0.06, ior: 1.42 }
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

  // Petal geometry: parametric surface with real bowl-shaped cupping
  function createPetalGeometry(profile, layerT) {
    var vSegs = 14, uSegs = 10;
    var total = (vSegs + 1) * (uSegs + 1);
    var positions = new Float32Array(total * 3);
    var uvs = new Float32Array(total * 2);
    var indices = [];

    var sizeScale = lerp(0.4, 1.0, Math.pow(layerT, 0.5));
    var W = profile.petalWidth * sizeScale;
    var L = profile.petalLength * sizeScale;
    var cupDepth = W * lerp(profile.cupInner, profile.cupOuter, layerT);
    var maxBend = lerp(profile.bendInner, profile.bendOuter, Math.pow(layerT, 0.6));
    var reflex = profile.reflex * layerT;
    var wPow = profile.widthPow || 0.8;

    var idx = 0, uI = 0;
    for (var j = 0; j <= vSegs; j++) {
      var v = j / vSegs;
      // Width: narrow at base, widest ~55%, narrow at tip
      var wShape = Math.pow(Math.sin(v * Math.PI), wPow) * (1 - 0.15 * v);
      var halfW = W * wShape * 0.5;

      // Spine: starts vertical (Y-up), bends outward (+Z) progressively
      var bendT = Math.pow(v, 1.8);
      var spineY = v * L * Math.cos(maxBend * bendT);
      var spineZ = v * L * Math.sin(maxBend * bendT);

      // Tip reflex: curl backward at tip
      if (v > 0.7 && reflex > 0) {
        var rT = (v - 0.7) / 0.3;
        spineZ -= Math.sin(reflex * rT * rT) * L * 0.12;
      }

      // Cup depth fades toward tip
      var cupAtV = cupDepth * (1 - Math.pow(v, 1.5) * 0.7);

      for (var i = 0; i <= uSegs; i++) {
        var u = i / uSegs;
        var ux = (u - 0.5) * 2; // -1 to 1
        var x = ux * halfW;
        // Bowl cupping: center pushed outward, edges at baseline
        var cup = cupAtV * (1 - ux * ux);
        // Subtle edge ruffle
        var ruf = 0;
        if (profile.ruffle > 0 && v > 0.4) {
          ruf = profile.ruffle * Math.sin(ux * Math.PI * 3 + v * 2) * (v - 0.4);
        }

        positions[idx] = x;
        positions[idx + 1] = spineY;
        positions[idx + 2] = spineZ + cup + ruf;
        uvs[uI] = u;
        uvs[uI + 1] = v;
        idx += 3; uI += 2;
      }
    }

    var rs = uSegs + 1;
    for (var jj = 0; jj < vSegs; jj++) {
      for (var ii = 0; ii < uSegs; ii++) {
        var a = jj * rs + ii, b = a + rs, c = a + 1, d = b + 1;
        indices.push(a, b, c, c, b, d);
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }


  function createFlowerHead(profile, color) {
    var group = new THREE.Group();
    var baseColor = new THREE.Color(color);
    var sheenTint = baseColor.clone().offsetHSL(0.02, 0.1, 0.15);
    var layers = profile.petalLayers;
    var totalPetals = profile.petalCount;
    var m = profile.material;
    var goldenOffset = 0.618 * Math.PI; // golden ratio angle offset between rings

    for (var layer = 0; layer < layers; layer++) {
      var layerT = layers > 1 ? layer / (layers - 1) : 0;
      var petalGeo = createPetalGeometry(profile, layerT);
      var petalColor = baseColor.clone().offsetHSL(0, -layerT * 0.06, layerT * 0.08);

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
        thickness: 0.03,
        ior: m.ior,
        side: THREE.DoubleSide,
        flatShading: false
      });

      // Fewer petals inside, more outside
      var layerCount = Math.max(3, Math.round(totalPetals / layers * lerp(0.5, 1.3, layerT)));
      var radiusBase = profile.centerRadius * lerp(0.15, 1.0, layerT);

      for (var p = 0; p < layerCount; p++) {
        var petal = new THREE.Mesh(petalGeo, mat);
        // Even distribution per ring + golden offset between rings
        var angle = (p / layerCount) * Math.PI * 2 + layer * goldenOffset;
        petal.position.set(Math.cos(angle) * radiusBase, layerT * 0.008, Math.sin(angle) * radiusBase);
        petal.rotation.y = -angle + Math.PI / 2;
        petal.rotation.z = rand(-0.03, 0.03);
        petal.castShadow = true;
        petal.receiveShadow = true;
        group.add(petal);
      }
    }

    // Center sphere
    var centerGeo = new THREE.SphereGeometry(profile.centerRadius * 0.7, 20, 16);
    var isBig = profile.petalCount > 16;
    var centerColor = isBig ? '#3d2b1f' : baseColor.clone().offsetHSL(0.04, -0.25, -0.3);
    var centerMat = new THREE.MeshPhysicalMaterial({
      color: centerColor, roughness: 0.85, sheen: 0.3, sheenRoughness: 0.6, clearcoat: 0.1
    });
    var center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = 0.01;
    center.scale.y = 0.5;
    center.castShadow = true;
    group.add(center);

    // Sunflower: large flat disk center
    if (profile.flower === 'sunflower') {
      var diskGeo = new THREE.CylinderGeometry(profile.centerRadius, profile.centerRadius, 0.04, 32);
      var diskMat = new THREE.MeshStandardMaterial({ color: 0x2b1d10, roughness: 0.9 });
      var disk = new THREE.Mesh(diskGeo, diskMat);
      disk.position.y = 0.02;
      group.add(disk);
    }

    // Stamens for non-sunflower large flowers
    if (profile.petalCount >= 16 && profile.flower !== 'sunflower') {
      var stamenCount = 8;
      var stamenGeo = new THREE.CylinderGeometry(0.002, 0.003, 0.045, 4);
      var tipGeo = new THREE.SphereGeometry(0.007, 6, 6);
      var stamenMat = new THREE.MeshPhysicalMaterial({
        color: 0xFFC93C, roughness: 0.35, metalness: 0.1, clearcoat: 0.5
      });
      for (var s = 0; s < stamenCount; s++) {
        var sa = (s / stamenCount) * Math.PI * 2;
        var sr = profile.centerRadius * 0.35;
        var stm = new THREE.Mesh(stamenGeo, stamenMat);
        stm.position.set(Math.cos(sa) * sr, 0.03, Math.sin(sa) * sr);
        stm.rotation.z = rand(-0.2, 0.2);
        group.add(stm);
        var tip = new THREE.Mesh(tipGeo, stamenMat);
        tip.position.set(Math.cos(sa) * sr, 0.055, Math.sin(sa) * sr);
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
