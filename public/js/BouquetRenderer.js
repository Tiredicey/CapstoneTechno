(function () {
  'use strict';
  if (window.BloomBouquetRenderer) return;

  var THREE_SPECIFIER = 'three';
  var ORBIT_SPECIFIER = 'three/addons/controls/OrbitControls.js';

  var renderer, scene, camera, controls, bouquetGroup, animId;
  var container = null;
  var loaded = false;
  var THREE = null;
  var OrbitControls = null;

  var currentConfig = {
    flower: 'rose',
    color: '#DC143C',
    bloomCount: 12,
    wrapping: false,
    luxury: false
  };

  var FLOWER_PROFILES = {
    rose: { petalCount: 24, petalLayers: 5, petalWidth: 0.22, petalLength: 0.38, curlFactor: 0.7, centerRadius: 0.06, petalThickness: 0.008 },
    tulip: { petalCount: 6, petalLayers: 2, petalWidth: 0.18, petalLength: 0.4, curlFactor: 0.3, centerRadius: 0.04, petalThickness: 0.012 },
    lily: { petalCount: 6, petalLayers: 2, petalWidth: 0.24, petalLength: 0.45, curlFactor: 0.85, centerRadius: 0.05, petalThickness: 0.006 },
    orchid: { petalCount: 5, petalLayers: 2, petalWidth: 0.28, petalLength: 0.35, curlFactor: 0.4, centerRadius: 0.07, petalThickness: 0.005 },
    sunflower: { petalCount: 20, petalLayers: 2, petalWidth: 0.08, petalLength: 0.5, curlFactor: 0.15, centerRadius: 0.18, petalThickness: 0.008 },
    peony: { petalCount: 32, petalLayers: 6, petalWidth: 0.25, petalLength: 0.32, curlFactor: 0.55, centerRadius: 0.08, petalThickness: 0.006 }
  };

  function rand(min, max) { return min + Math.random() * (max - min); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  async function loadThreeJS() {
    if (THREE) return;
    var threeModule = await import(THREE_SPECIFIER);
    THREE = threeModule;
    var orbitModule = await import(ORBIT_SPECIFIER);
    OrbitControls = orbitModule.OrbitControls;
  }

  function createPetalGeometry(profile, layer, totalLayers) {
    var segments = 12;
    var widthSegments = 6;
    var positions = [];
    var normals = [];
    var uvs = [];
    var indices = [];

    var layerRatio = layer / totalLayers;
    var openness = lerp(0.2, 1.0, layerRatio);
    var scaleFactor = lerp(0.5, 1.0, layerRatio);
    var w = profile.petalWidth * scaleFactor;
    var l = profile.petalLength * scaleFactor;
    var curl = profile.curlFactor * openness;

    for (var j = 0; j <= widthSegments; j++) {
      var wt = j / widthSegments;
      var wx = (wt - 0.5) * 2;
      for (var i = 0; i <= segments; i++) {
        var t = i / segments;
        var widthAtT = w * Math.sin(t * Math.PI) * (1 - 0.3 * t);
        var x = wx * widthAtT;
        var y = t * l;
        var z = curl * t * t * (1 - Math.abs(wx) * 0.5) + profile.petalThickness * (1 - Math.abs(wx));
        z += Math.sin(wx * Math.PI) * 0.02 * t;
        positions.push(x, y, z);
        var nx = -Math.sin(wx * Math.PI) * 0.3;
        var ny = -curl * 2 * t * 0.2;
        var nz = 1;
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals.push(nx / nl, ny / nl, nz / nl);
        uvs.push(wt, t);
      }
    }

    var rowSize = segments + 1;
    for (var j2 = 0; j2 < widthSegments; j2++) {
      for (var i2 = 0; i2 < segments; i2++) {
        var a = j2 * rowSize + i2;
        var b = a + rowSize;
        var c = a + 1;
        var d = b + 1;
        indices.push(a, b, c, c, b, d);
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  function createFlowerHead(profile, color) {
    var group = new THREE.Group();
    var baseColor = new THREE.Color(color);
    var totalPetals = profile.petalCount;
    var layers = profile.petalLayers;
    var petalsPerLayer = Math.ceil(totalPetals / layers);

    for (var layer = 0; layer < layers; layer++) {
      var petalGeo = createPetalGeometry(profile, layer, layers);
      var layerRatio = layer / layers;
      var petalColor = baseColor.clone();
      petalColor.offsetHSL(0, -layerRatio * 0.1, layerRatio * 0.08);

      var mat = new THREE.MeshStandardMaterial({
        color: petalColor,
        roughness: 0.55,
        metalness: 0.02,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });

      var layerPetals = petalsPerLayer;
      if (layer === 0) layerPetals = Math.max(3, Math.floor(petalsPerLayer * 0.5));

      for (var p = 0; p < layerPetals; p++) {
        var petal = new THREE.Mesh(petalGeo, mat);
        var angle = (p / layerPetals) * Math.PI * 2 + layer * 0.3;
        var radius = profile.centerRadius * lerp(0.3, 1.0, layerRatio);
        petal.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        petal.rotation.y = -angle + Math.PI / 2;
        petal.rotation.x = lerp(-0.4, -1.2, layerRatio) + rand(-0.08, 0.08);
        petal.rotation.z = rand(-0.05, 0.05);
        group.add(petal);
      }
    }

    var centerGeo = new THREE.SphereGeometry(profile.centerRadius * 0.8, 16, 12);
    var centerColor = profile.petalCount > 15 ? '#3d2b1f' : baseColor.clone().offsetHSL(0.05, -0.3, -0.3);
    var centerMat = new THREE.MeshStandardMaterial({ color: centerColor, roughness: 0.9, metalness: 0 });
    var center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = 0.02;
    center.scale.y = 0.6;
    group.add(center);

    if (profile.petalCount >= 18) {
      var stamenCount = 8;
      var stamenGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.06, 4);
      var stamenTipGeo = new THREE.SphereGeometry(0.008, 6, 6);
      var stamenMat = new THREE.MeshStandardMaterial({ color: '#FFD700', roughness: 0.4, metalness: 0.3 });

      for (var s = 0; s < stamenCount; s++) {
        var sa = (s / stamenCount) * Math.PI * 2;
        var sr = profile.centerRadius * 0.5;
        var stamen = new THREE.Mesh(stamenGeo, stamenMat);
        stamen.position.set(Math.cos(sa) * sr, 0.04, Math.sin(sa) * sr);
        stamen.rotation.z = rand(-0.3, 0.3);
        group.add(stamen);
        var tip = new THREE.Mesh(stamenTipGeo, stamenMat);
        tip.position.set(Math.cos(sa) * sr, 0.07, Math.sin(sa) * sr);
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

    camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 100);
    camera.position.set(0, 0.3, 2.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

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

  window.BloomBouquetRenderer = {
    init: init,
    updateConfig: updateConfig,
    dispose: dispose
  };
})();
