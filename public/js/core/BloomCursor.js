(function () {
  'use strict';
  if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var dot = document.getElementById('cDot');
  var ring = document.getElementById('cRing');
  if (!dot || !ring) return;

  var trail = [];
  var TRAIL_COUNT = 5;
  var mx = -100, my = -100;
  var hoverType = '';

  for (var i = 0; i < TRAIL_COUNT; i++) {
    var t = document.createElement('div');
    t.className = 'bloom-cursor-trail';
    t.style.cssText = 'position:fixed;pointer-events:none;z-index:99997;border-radius:50%;width:' + (6 - i) + 'px;height:' + (6 - i) + 'px;opacity:' + (0.3 - i * 0.05) + ';will-change:transform;transition:none;';
    document.body.appendChild(t);
    trail.push({ el: t, x: -100, y: -100 });
  }

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  var TARGETS = {
    product: '.p-card, .h-card, .feat-card, .subs-card, .bc-card, .team-card, .rev-card',
    button: 'a, button, [role="button"], [role="tab"], input, textarea, select',
    canvas: 'canvas, .bloom-expo-item, .ch-main-card'
  };

  function getHoverType(el) {
    if (!el) return '';
    if (el.closest(TARGETS.product)) return 'product';
    if (el.closest(TARGETS.canvas)) return 'canvas';
    if (el.closest(TARGETS.button)) return 'button';
    return '';
  }

  document.addEventListener('mouseover', function (e) {
    hoverType = getHoverType(e.target);
    dot.className = 'c-dot';
    ring.className = 'c-ring';
    if (hoverType === 'product') {
      dot.classList.add('c-dot-product');
      ring.classList.add('c-ring-product');
    } else if (hoverType === 'canvas') {
      dot.classList.add('c-dot-canvas');
      ring.classList.add('c-ring-canvas');
    } else if (hoverType === 'button') {
      document.body.classList.add('c-hover');
    }
  }, { passive: true });

  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      hoverType = '';
      dot.className = 'c-dot';
      ring.className = 'c-ring';
      document.body.classList.remove('c-hover');
    }
  }, { passive: true });

  var trailColors = [
    'rgba(230,26,26,0.4)',
    'rgba(238,90,160,0.35)',
    'rgba(255,215,0,0.3)',
    'rgba(124,58,237,0.25)',
    'rgba(0,212,170,0.2)'
  ];

  (function animate() {
    requestAnimationFrame(animate);
    for (var i = trail.length - 1; i > 0; i--) {
      trail[i].x += (trail[i - 1].x - trail[i].x) * 0.35;
      trail[i].y += (trail[i - 1].y - trail[i].y) * 0.35;
    }
    trail[0].x += (mx - trail[0].x) * 0.5;
    trail[0].y += (my - trail[0].y) * 0.5;
    for (var j = 0; j < trail.length; j++) {
      trail[j].el.style.transform = 'translate3d(' + trail[j].x + 'px,' + trail[j].y + 'px,0) translate(-50%,-50%)';
      trail[j].el.style.background = hoverType === 'product' ? trailColors[j] : (hoverType === 'canvas' ? 'rgba(0,212,170,' + (0.3 - j * 0.05) + ')' : 'rgba(255,255,255,' + (0.2 - j * 0.03) + ')');
    }
  })();
})();
