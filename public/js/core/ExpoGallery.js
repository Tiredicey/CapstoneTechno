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
    var h = 480;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05020a);
    scene.fog = new THREE.FogExp2(0x05020a, 0.04);

    var camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = '20px';

    var ambient = new THREE.AmbientLight(0x332244, 0.6);
    scene.add(ambient);
    var point1 = new THREE.PointLight(0xe61a1a, 1.2, 20);
    point1.position.set(3, 4, 3);
    scene.add(point1);
    var point2 = new THREE.PointLight(0x7c3aed, 0.8, 20);
    point2.position.set(-3, 3, -2);
    scene.add(point2);
    var point3 = new THREE.PointLight(0x00d4aa, 0.6, 15);
    point3.position.set(0, -2, 5);
    scene.add(point3);

    var ITEMS = [
      { geo: 'cylinder', color: 0xe61a1a, metalness: 0.9, roughness: 0.15, name: 'Crimson Vessel', pos: [-3, 0, 0] },
      { geo: 'box', color: 0x7c3aed, metalness: 0.85, roughness: 0.2, name: 'Amethyst Cube', pos: [0, 0.4, 0] },
      { geo: 'torus', color: 0xffd700, metalness: 0.95, roughness: 0.1, name: 'Gold Ring', pos: [3, 0, 0] },
      { geo: 'sphere', color: 0x00d4aa, metalness: 0.8, roughness: 0.25, name: 'Jade Orb', pos: [-1.5, 1.8, -1] },
      { geo: 'icosahedron', color: 0xff6b6b, metalness: 0.88, roughness: 0.18, name: 'Coral Gem', pos: [1.5, 1.8, -1] }
    ];

    var meshes = [];

    ITEMS.forEach(function (item) {
      var geom;
      switch (item.geo) {
        case 'cylinder': geom = new THREE.CylinderGeometry(0.6, 0.5, 1.6, 32); break;
        case 'box': geom = new THREE.BoxGeometry(1.2, 1.2, 1.2, 4, 4, 4); break;
        case 'torus': geom = new THREE.TorusGeometry(0.7, 0.25, 24, 48); break;
        case 'sphere': geom = new THREE.SphereGeometry(0.55, 32, 32); break;
        case 'icosahedron': geom = new THREE.IcosahedronGeometry(0.55, 1); break;
      }
      var mat = new THREE.MeshStandardMaterial({
        color: item.color,
        metalness: item.metalness,
        roughness: item.roughness,
        envMapIntensity: 1.2
      });
      var mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
      mesh.userData = { name: item.name, baseY: item.pos[1] };
      scene.add(mesh);
      meshes.push(mesh);
    });

    var gridHelper = new THREE.GridHelper(12, 24, 0x1a0a2e, 0x0d0520);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

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
      if (autoRotate) targetRotY += 0.003;
      meshes.forEach(function (m, i) {
        m.rotation.y = targetRotY + i * 0.2;
        m.rotation.x = targetRotX;
        m.position.y = m.userData.baseY + Math.sin(t * 0.8 + i * 1.2) * 0.15;
      });
      point1.position.x = Math.sin(t * 0.5) * 4;
      point1.position.z = Math.cos(t * 0.5) * 4;
      point2.position.x = Math.sin(t * 0.3 + 2) * 3;
      point2.position.z = Math.cos(t * 0.3 + 2) * 3;
      camera.position.x = Math.sin(targetRotY * 0.3) * 2;
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
