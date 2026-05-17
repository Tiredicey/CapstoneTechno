(function () {
  'use strict';
  if (typeof THREE === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    s.onload = init;
    document.head.appendChild(s);
  } else {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  function init() {
    if (typeof THREE === 'undefined') return;
    var container = document.getElementById('bloomExpoGallery');
    if (!container) {
      var exhibitSec = document.getElementById('bloomExhibitSection');
      if (!exhibitSec) return;
      var section = document.createElement('section');
      section.className = 'expo-section sec-pad';
      section.setAttribute('aria-label', '3D Exhibition showcase');
      section.innerHTML =
        '<div class="con">' +
        '<div class="sec-hd" style="flex-direction:column;align-items:flex-start">' +
        '<span class="tag tag-m">\u2728 3D Gallery</span>' +
        '<h2 class="sec-title" style="max-width:680px">Expo Box</h2>' +
        '<p class="sec-sub" style="max-width:640px">Interactive 3D showcase of artisan containers. ' +
        'Rendered in real-time using Three.js v0.170.0. Rotate with mouse or touch.</p>' +
        '</div>' +
        '<div id="bloomExpoGallery" class="expo-canvas-wrap" role="img" aria-label="Interactive 3D artisan container showcase"></div>' +
        '</div>';
      var divider = document.createElement('div');
      divider.className = 'p5-sec-div';
      divider.setAttribute('aria-hidden', 'true');
      exhibitSec.parentNode.insertBefore(divider, exhibitSec.nextSibling);
      exhibitSec.parentNode.insertBefore(section, divider.nextSibling);
      container = document.getElementById('bloomExpoGallery');
    }
    if (!container) return;
    buildScene(container);
  }

  function buildScene(container) {
    var w = container.clientWidth || 800;
    var h = 520;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030108);
    scene.fog = new THREE.FogExp2(0x030108, 0.032);

    var camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    camera.position.set(0, 2.5, 9);
    camera.lookAt(0, 0.5, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = '20px';

    var ambient = new THREE.AmbientLight(0x221133, 0.5);
    scene.add(ambient);

    var hemiLight = new THREE.HemisphereLight(0x7c3aed, 0x0d0520, 0.4);
    scene.add(hemiLight);

    var point1 = new THREE.PointLight(0xe61a1a, 1.5, 22);
    point1.position.set(3, 5, 3);
    scene.add(point1);
    var point2 = new THREE.PointLight(0x7c3aed, 1, 22);
    point2.position.set(-3, 3.5, -2);
    scene.add(point2);
    var point3 = new THREE.PointLight(0x00d4aa, 0.8, 18);
    point3.position.set(0, -1.5, 6);
    scene.add(point3);
    var point4 = new THREE.PointLight(0xe84393, 0.6, 16);
    point4.position.set(-4, 4, 4);
    scene.add(point4);
    var point5 = new THREE.PointLight(0xffd700, 0.5, 14);
    point5.position.set(4, -1, -3);
    scene.add(point5);

    var ITEMS = [
      { geo: 'cylinder', color: 0xe61a1a, metalness: 0.92, roughness: 0.12, emissive: 0x330505, name: 'Crimson Vessel', pos: [-3, 0, 0] },
      { geo: 'box', color: 0x7c3aed, metalness: 0.88, roughness: 0.18, emissive: 0x0d0520, name: 'Amethyst Cube', pos: [0, 0.4, 0] },
      { geo: 'torus', color: 0xffd700, metalness: 0.96, roughness: 0.08, emissive: 0x332200, name: 'Gold Ring', pos: [3, 0, 0] },
      { geo: 'sphere', color: 0x00d4aa, metalness: 0.84, roughness: 0.22, emissive: 0x002218, name: 'Jade Orb', pos: [-1.5, 1.8, -1] },
      { geo: 'icosahedron', color: 0xff6b6b, metalness: 0.9, roughness: 0.15, emissive: 0x331010, name: 'Coral Gem', pos: [1.5, 1.8, -1] },
      { geo: 'octahedron', color: 0xe84393, metalness: 0.93, roughness: 0.1, emissive: 0x200818, name: 'Rose Prism', pos: [0, 3, -2] }
    ];

    var meshes = [];

    ITEMS.forEach(function (item) {
      var geom;
      switch (item.geo) {
        case 'cylinder': geom = new THREE.CylinderGeometry(0.6, 0.5, 1.6, 48); break;
        case 'box': geom = new THREE.BoxGeometry(1.2, 1.2, 1.2, 6, 6, 6); break;
        case 'torus': geom = new THREE.TorusGeometry(0.7, 0.25, 32, 64); break;
        case 'sphere': geom = new THREE.SphereGeometry(0.55, 48, 48); break;
        case 'icosahedron': geom = new THREE.IcosahedronGeometry(0.55, 2); break;
        case 'octahedron': geom = new THREE.OctahedronGeometry(0.5, 2); break;
      }
      var mat = new THREE.MeshStandardMaterial({
        color: item.color,
        metalness: item.metalness,
        roughness: item.roughness,
        emissive: new THREE.Color(item.emissive),
        emissiveIntensity: 0.3,
        envMapIntensity: 1.5
      });
      var mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
      mesh.userData = { name: item.name, baseY: item.pos[1] };
      mesh.castShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
    });

    var ringGeo = new THREE.TorusGeometry(5, 0.02, 16, 100);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.15 });
    var floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -1.2;
    scene.add(floorRing);

    var ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.015, 16, 80),
      new THREE.MeshBasicMaterial({ color: 0xe61a1a, transparent: true, opacity: 0.1 })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = -1.2;
    scene.add(ring2);

    var gridHelper = new THREE.GridHelper(14, 28, 0x1a0a2e, 0x0a0418);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    var particleCount = 120;
    var particleGeo = new THREE.BufferGeometry();
    var pPositions = new Float32Array(particleCount * 3);
    for (var pi = 0; pi < particleCount; pi++) {
      pPositions[pi * 3] = (Math.random() - 0.5) * 16;
      pPositions[pi * 3 + 1] = Math.random() * 8 - 1;
      pPositions[pi * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    var particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    var targetRotY = 0, targetRotX = 0;
    var isDragging = false, prevX = 0, prevY = 0;
    var autoRotate = true;

    container.addEventListener('pointerdown', function (e) {
      isDragging = true;
      autoRotate = false;
      prevX = e.clientX;
      prevY = e.clientY;
    });

    window.addEventListener('pointermove', function (e) {
      if (isDragging) {
        targetRotY += (e.clientX - prevX) * 0.005;
        targetRotX += (e.clientY - prevY) * 0.003;
        targetRotX = Math.max(-0.5, Math.min(0.5, targetRotX));
        prevX = e.clientX;
        prevY = e.clientY;
      }
    });

    window.addEventListener('pointerup', function () {
      isDragging = false;
      setTimeout(function () { autoRotate = true; }, 3000);
    });

    container.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
      if (isDragging && e.touches.length === 1) {
        targetRotY += (e.touches[0].clientX - prevX) * 0.005;
        targetRotX += (e.touches[0].clientY - prevY) * 0.003;
        targetRotX = Math.max(-0.5, Math.min(0.5, targetRotX));
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }
    }, { passive: true });

    container.addEventListener('touchend', function () {
      isDragging = false;
      setTimeout(function () { autoRotate = true; }, 3000);
    });

    var clock = new THREE.Clock();
    var visible = true;
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    io.observe(container);

    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      var t = clock.getElapsedTime();
      if (autoRotate) targetRotY += 0.0025;

      meshes.forEach(function (m, i) {
        m.rotation.y = targetRotY + i * 0.2 + Math.sin(t * 0.3 + i) * 0.1;
        m.rotation.x = targetRotX + Math.cos(t * 0.4 + i * 0.7) * 0.05;
        m.position.y = m.userData.baseY + Math.sin(t * 0.7 + i * 1.3) * 0.18;
      });

      point1.position.x = Math.sin(t * 0.4) * 4.5;
      point1.position.z = Math.cos(t * 0.4) * 4.5;
      point1.intensity = 1.2 + Math.sin(t * 0.8) * 0.3;

      point2.position.x = Math.sin(t * 0.25 + 2) * 3.5;
      point2.position.z = Math.cos(t * 0.25 + 2) * 3.5;
      point2.intensity = 0.8 + Math.sin(t * 0.6 + 1) * 0.2;

      point4.position.y = 4 + Math.sin(t * 0.5) * 1.5;
      point5.position.x = 4 + Math.sin(t * 0.35) * 2;

      floorRing.rotation.z = t * 0.05;
      ring2.rotation.z = -t * 0.03;

      var positions = particles.geometry.attributes.position.array;
      for (var pi = 0; pi < particleCount; pi++) {
        positions[pi * 3 + 1] += 0.003;
        if (positions[pi * 3 + 1] > 7) positions[pi * 3 + 1] = -1;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      camera.position.x = Math.sin(targetRotY * 0.3) * 2.2;
      camera.lookAt(0, 0.5, 0);
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', function () {
      var nw = container.clientWidth || 800;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    });
  }
})();
