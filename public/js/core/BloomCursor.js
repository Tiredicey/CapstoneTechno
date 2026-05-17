(function () {
  'use strict';
  if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var dot = document.getElementById('cDot');
  var ring = document.getElementById('cRing');
  if (!dot || !ring) return;

  var trail = [];
  var TRAIL_COUNT = 7;
  var mx = -100, my = -100;
  var hoverType = '';
  var velocity = { x: 0, y: 0 };
  var prevMouse = { x: -100, y: -100 };

  for (var i = 0; i < TRAIL_COUNT; i++) {
    var t = document.createElement('div');
    t.className = 'bloom-cursor-trail';
    var size = 8 - i;
    t.style.cssText = 'position:fixed;pointer-events:none;z-index:99997;border-radius:50%;width:' + size + 'px;height:' + size + 'px;opacity:' + (0.35 - i * 0.04) + ';will-change:transform;transition:none;mix-blend-mode:screen;';
    document.body.appendChild(t);
    trail.push({ el: t, x: -100, y: -100 });
  }

  document.addEventListener('mousemove', function (e) {
    velocity.x = e.clientX - prevMouse.x;
    velocity.y = e.clientY - prevMouse.y;
    prevMouse.x = mx;
    prevMouse.y = my;
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

  var trailPalettes = {
    default: [
      'rgba(255,255,255,0.25)',
      'rgba(232,67,147,0.22)',
      'rgba(124,58,237,0.18)',
      'rgba(0,212,170,0.15)',
      'rgba(255,215,0,0.12)',
      'rgba(230,26,26,0.10)',
      'rgba(56,189,248,0.08)'
    ],
    product: [
      'rgba(230,26,26,0.45)',
      'rgba(238,90,160,0.38)',
      'rgba(255,215,0,0.32)',
      'rgba(124,58,237,0.28)',
      'rgba(0,212,170,0.22)',
      'rgba(255,107,107,0.18)',
      'rgba(230,26,26,0.12)'
    ],
    canvas: [
      'rgba(0,212,170,0.35)',
      'rgba(56,189,248,0.30)',
      'rgba(124,58,237,0.25)',
      'rgba(0,212,170,0.20)',
      'rgba(56,189,248,0.16)',
      'rgba(124,58,237,0.12)',
      'rgba(0,212,170,0.08)'
    ]
  };

  var hue = 0;

  (function animate() {
    requestAnimationFrame(animate);
    hue = (hue + 0.3) % 360;
    var speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    var springFactor = Math.min(0.6, 0.35 + speed * 0.003);
    var trailFactor = Math.min(0.5, 0.28 + speed * 0.002);

    for (var i = trail.length - 1; i > 0; i--) {
      trail[i].x += (trail[i - 1].x - trail[i].x) * trailFactor;
      trail[i].y += (trail[i - 1].y - trail[i].y) * trailFactor;
    }
    trail[0].x += (mx - trail[0].x) * springFactor;
    trail[0].y += (my - trail[0].y) * springFactor;

    var palette = hoverType === 'product' ? trailPalettes.product :
                  hoverType === 'canvas' ? trailPalettes.canvas :
                  trailPalettes.default;

    for (var j = 0; j < trail.length; j++) {
      var stretch = 1 + Math.min(speed * 0.003, 0.4);
      var angle = Math.atan2(velocity.y, velocity.x) * (180 / Math.PI);
      trail[j].el.style.transform = 'translate3d(' + trail[j].x + 'px,' + trail[j].y + 'px,0) translate(-50%,-50%) rotate(' + angle + 'deg) scaleX(' + stretch + ')';
      trail[j].el.style.background = palette[j] || palette[palette.length - 1];
    }

    velocity.x *= 0.92;
    velocity.y *= 0.92;
  })();
})();
