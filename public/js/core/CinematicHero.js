(function () {
  'use strict';
  if (window.BloomCinematicHero) return;
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function init() {
    var container = document.getElementById('cinematicHero');
    if (!container || typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    var mainCard = container.querySelector('.ch-main-card');
    var mockup = container.querySelector('.ch-mockup-bezel');
    var etherealBg = container.querySelector('.ch-ethereal-bg');
    var rafId = 0;
    var mouseX = 0.5, mouseY = 0.5;

    if (!reducedMotion()) {
      container.addEventListener('mousemove', function (e) {
        if (window.scrollY > window.innerHeight * 2) return;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(function () {
          mouseX = e.clientX / window.innerWidth;
          mouseY = e.clientY / window.innerHeight;
          if (mainCard) {
            var rect = mainCard.getBoundingClientRect();
            mainCard.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
            mainCard.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
          }
          if (mockup) {
            var xVal = (mouseX - 0.5) * 2;
            var yVal = (mouseY - 0.5) * 2;
            gsap.to(mockup, { rotationY: xVal * 14, rotationX: -yVal * 14, ease: 'power3.out', duration: 1.4 });
          }
          if (etherealBg) {
            gsap.to(etherealBg, {
              backgroundImage: 'radial-gradient(circle at ' + (mouseX * 100) + '% ' + (mouseY * 100) + '%, var(--ethereal-glow-pink, rgba(255,0,255,.25)), transparent 50%), radial-gradient(circle at ' + ((1 - mouseX) * 100) + '% ' + ((1 - mouseY) * 100) + '%, var(--ethereal-glow-red, rgba(230,26,26,.2)), transparent 50%), radial-gradient(circle at 50% 50%, hsla(272,100%,10%,.4), transparent 60%)',
              duration: 2,
              ease: 'sine.out'
            });
          }
        });
      });
    }
    if (reducedMotion()) {
      container.querySelectorAll('.ch-gsap-reveal').forEach(function (el) {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });
      return;
    }
    var isMobile = window.innerWidth < 768;
    var isSmall = window.innerWidth < 560;
    var q = function(sel) { return container.querySelectorAll(sel); };
    gsap.set(q('.ch-text-track'), { autoAlpha: 0, y: 80, scale: 0.8, filter: 'blur(24px)', rotationX: -25 });
    gsap.set(q('.ch-text-days'), { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
    gsap.set(q('.ch-main-card'), { y: window.innerHeight + 250, autoAlpha: 1 });
    gsap.set(q('.ch-card-left-text, .ch-card-right-text, .ch-mockup-wrapper, .ch-floating-badge, .ch-phone-widget'), { autoAlpha: 0 });
    gsap.set(q('.ch-cta-wrapper'), { autoAlpha: 0, scale: 0.7, filter: 'blur(40px)' });
    gsap.set(q('.ch-bg-frame'), { force3D: true, transformOrigin: '50% 50%' });
    gsap.set(q('.ch-bg-frame:not(.frame-1)'), { opacity: 0 });

    var introTl = gsap.timeline({ delay: 0.2 });
    introTl
      .to('.ch-text-track', {
        duration: 2.2, autoAlpha: 1, y: 0, scale: 1,
        filter: 'blur(0px)', rotationX: 0,
        ease: 'expo.out', clearProps: 'filter'
      })
      .to('.ch-text-days', {
        duration: 1.6, clipPath: 'inset(0 0% 0 0)',
        ease: 'power4.inOut'
      }, '-=1.2');

    var eyebrowEls = container.querySelectorAll('.ch-hero-text-wrapper .hero-eyebrow, .ch-hero-text-wrapper .tag');
    if (eyebrowEls.length) {
      introTl.fromTo(eyebrowEls, {
        autoAlpha: 0, y: 20, filter: 'blur(8px)'
      }, {
        autoAlpha: 1, y: 0, filter: 'blur(0px)',
        duration: 0.8, ease: 'power3.out', stagger: 0.1, clearProps: 'filter'
      }, '-=0.8');
    }

    var scrollEnd = isMobile ? '+=5000' : '+=7000';
    var scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: scrollEnd,
        pin: true,
        scrub: 1.2,
        anticipatePin: 1
      }
    });

    scrollTl
      .to('.ch-hero-text-wrapper', { y: -140, scale: 1.1, ease: 'none', duration: 5 }, 0)
      .to('.ch-bg-grid', { scale: 1.3, opacity: 0.12, y: -80, ease: 'none', duration: 5 }, 0)

      .to('.ch-bg-frame.frame-1', { scale: 1.2, y: -50, rotation: 2, duration: 1.5, ease: 'power1.out' }, 0)
      .to('.ch-bg-frame.frame-1', { opacity: 0, ease: 'power1.inOut', duration: 1 }, 0.6)
      .fromTo('.ch-bg-frame.frame-2',
        { opacity: 0, scale: 1.03, y: 30, filter: 'brightness(0.5)' },
        { opacity: 0.9, scale: 1.18, y: -40, rotation: -1.5, filter: 'brightness(1)', ease: 'power2.inOut', duration: 1.6 }, 0.6)
      .to('.ch-bg-frame.frame-2', { opacity: 0, ease: 'power1.inOut', duration: 0.9 }, 1.8)
      .fromTo('.ch-bg-frame.frame-3',
        { opacity: 0, scale: 1.03, y: 30, filter: 'brightness(0.5)' },
        { opacity: 0.92, scale: 1.22, y: -70, rotation: 2.5, filter: 'brightness(1)', ease: 'power2.inOut', duration: 1.6 }, 1.8)
      .to('.ch-bg-frame.frame-3', { opacity: 0, ease: 'power1.inOut', duration: 0.9 }, 3)
      .fromTo('.ch-bg-frame.frame-4',
        { opacity: 0, scale: 1.03, y: 30, filter: 'brightness(0.5)' },
        { opacity: 0.88, scale: 1.24, y: -100, rotation: -2.5, filter: 'brightness(1)', ease: 'power2.inOut', duration: 1.6 }, 3)
      .to('.ch-bg-frame.frame-4', { opacity: 0, ease: 'power1.inOut', duration: 0.9 }, 4.2)
      .fromTo('.ch-bg-frame.frame-5',
        { opacity: 0, scale: 1.03, y: 30, filter: 'brightness(0.5) saturate(0.6)' },
        { opacity: 0.85, scale: 1.28, y: -130, rotation: 1, filter: 'brightness(1) saturate(1)', ease: 'power2.inOut', duration: 2 }, 4.2)

      .to('.ch-hero-text-wrapper', {
        autoAlpha: 0, filter: 'blur(18px)', scale: 1.15,
        ease: 'power2.in', duration: 1.4
      }, 4.2)

      .to('.ch-main-card', {
        y: 0, ease: 'expo.inOut', duration: 2.8
      }, 4)

      .to('.ch-main-card', {
        width: '100%', height: '100%', borderRadius: '0px',
        ease: 'expo.inOut', duration: 1.8
      })

      .fromTo('.ch-mockup-wrapper',
        { y: 350, z: -600, rotationX: 55, rotationY: -35, autoAlpha: 0, scale: 0.5 },
        { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 3 }, '-=1')

      .fromTo('.ch-phone-widget',
        { y: 50, autoAlpha: 0, scale: 0.9 },
        { y: 0, autoAlpha: 1, scale: 1, stagger: 0.12, ease: 'back.out(1.4)', duration: 1.6 }, '-=1.8')

      .to('.ch-progress-ring', { strokeDashoffset: 60, duration: 2.2, ease: 'power3.inOut' }, '-=1.4')
      .to('.ch-counter-val', { innerHTML: 2400, snap: { innerHTML: 1 }, duration: 2.2, ease: 'expo.out' }, '-=2.2')

      .fromTo('.ch-floating-badge',
        { y: 120, autoAlpha: 0, scale: 0.6, rotationZ: -15 },
        { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'back.out(1.7)', duration: 1.8, stagger: 0.18 }, '-=2.2')

      .fromTo('.ch-card-left-text',
        { x: -60, autoAlpha: 0, filter: 'blur(6px)' },
        { x: 0, autoAlpha: 1, filter: 'blur(0px)', ease: 'power4.out', duration: 1.6, clearProps: 'filter' }, '-=1.6')
      .fromTo('.ch-card-right-text',
        { x: 60, autoAlpha: 0, scale: 0.75 },
        { x: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 1.6 }, '<')

      .to({}, { duration: 2.8 })

      .set('.ch-hero-text-wrapper', { autoAlpha: 0 })
      .set('.ch-cta-wrapper', { autoAlpha: 1 })
      .to({}, { duration: 1.8 })

      .to(['.ch-mockup-wrapper', '.ch-floating-badge', '.ch-card-left-text', '.ch-card-right-text'], {
        scale: 0.85, y: -50, z: -250, autoAlpha: 0,
        ease: 'power3.in', duration: 1.4, stagger: 0.04
      })

      .to('.ch-main-card', {
        width: isSmall ? '94vw' : (isMobile ? '92vw' : '85vw'),
        height: isSmall ? '94vh' : (isMobile ? '92vh' : '85vh'),
        borderRadius: isSmall ? '24px' : (isMobile ? '32px' : '40px'),
        ease: 'expo.inOut',
        duration: 2
      }, 'pullback')

      .to('.ch-cta-wrapper', {
        scale: 1, filter: 'blur(0px)',
        ease: 'expo.inOut', duration: 2, clearProps: 'filter'
      }, 'pullback')

      .addLabel('exit')
      .to('.ch-main-card', {
        y: -window.innerHeight - 350, ease: 'power3.in', duration: 2
      }, 'exit')
      .to('.ch-bg-frame', {
        yPercent: -40, scale: 1.4, ease: 'power2.in', duration: 2
      }, 'exit')
      .to('.ch-ethereal-bg', {
        yPercent: -18, ease: 'power1.in', duration: 2
      }, 'exit');

    injectAuroraLayer(container);
  }

  function injectAuroraLayer(container) {
    if (!container || document.getElementById('chAuroraSvg')) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'chAuroraSvg';
    svg.setAttribute('viewBox', '0 0 1440 600');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:35%;z-index:2;pointer-events:none;opacity:0.35;mix-blend-mode:screen;';
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.id = 'auroraGrad';
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '0%');
    var stops = [
      { offset: '0%', color: 'rgba(124,58,237,0)' },
      { offset: '20%', color: 'rgba(124,58,237,0.6)' },
      { offset: '40%', color: 'rgba(232,67,147,0.5)' },
      { offset: '60%', color: 'rgba(230,26,26,0.4)' },
      { offset: '80%', color: 'rgba(255,215,0,0.3)' },
      { offset: '100%', color: 'rgba(0,212,170,0)' }
    ];
    stops.forEach(function (s) {
      var stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', s.offset);
      stop.setAttribute('stop-color', s.color);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);

    var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = 'auroraBlur';
    var blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '30');
    filter.appendChild(blur);
    defs.appendChild(filter);
    svg.appendChild(defs);

    for (var i = 0; i < 3; i++) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'url(#auroraGrad)');
      path.setAttribute('filter', 'url(#auroraBlur)');
      path.setAttribute('opacity', String(0.5 - i * 0.12));
      path.style.cssText = 'animation:chAuroraWave ' + (12 + i * 4) + 's ease-in-out infinite alternate;transform-origin:center;';
      var yOff = 200 + i * 80;
      path.setAttribute('d', 'M0,' + yOff + ' C360,' + (yOff - 120 + i * 30) + ' 720,' + (yOff + 60 - i * 20) + ' 1080,' + (yOff - 80 + i * 40) + ' S1440,' + (yOff + 40) + ' 1440,' + yOff + ' L1440,600 L0,600 Z');
      svg.appendChild(path);
    }
    var etherealBg = container.querySelector('.ch-ethereal-bg');
    if (etherealBg) {
      etherealBg.appendChild(svg);
    } else {
      container.insertBefore(svg, container.firstChild);
    }

    if (!document.getElementById('chAuroraStyle')) {
      var style = document.createElement('style');
      style.id = 'chAuroraStyle';
      style.textContent = '@keyframes chAuroraWave{0%{transform:translateX(-3%) scaleY(1)}50%{transform:translateX(3%) scaleY(1.15)}100%{transform:translateX(-2%) scaleY(0.9)}}';
      document.head.appendChild(style);
    }
  }

  window.BloomCinematicHero = { init: init };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
