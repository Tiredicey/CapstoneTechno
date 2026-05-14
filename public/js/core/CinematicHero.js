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
    var rafId = 0;

    if (!reducedMotion()) {
      container.addEventListener('mousemove', function (e) {
        if (window.scrollY > window.innerHeight * 2) return;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(function () {
          if (mainCard) {
            var rect = mainCard.getBoundingClientRect();
            mainCard.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
            mainCard.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
          }
          if (mockup) {
            var xVal = (e.clientX / window.innerWidth - 0.5) * 2;
            var yVal = (e.clientY / window.innerHeight - 0.5) * 2;
            gsap.to(mockup, { rotationY: xVal * 12, rotationX: -yVal * 12, ease: 'power3.out', duration: 1.2 });
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

    gsap.set('.ch-text-track', { autoAlpha: 0, y: 60, scale: 0.85, filter: 'blur(20px)', rotationX: -20 });
    gsap.set('.ch-text-days', { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
    gsap.set('.ch-main-card', { y: window.innerHeight + 200, autoAlpha: 1 });
    gsap.set(['.ch-card-left-text', '.ch-card-right-text', '.ch-mockup-wrapper', '.ch-floating-badge', '.ch-phone-widget'], { autoAlpha: 0 });
    gsap.set('.ch-cta-wrapper', { autoAlpha: 0, scale: 0.8, filter: 'blur(30px)' });
    gsap.set('.ch-bg-frame', { force3D: true, transformOrigin: '50% 50%' });
    gsap.set('.ch-bg-frame:not(.frame-1)', { opacity: 0 });

    var introTl = gsap.timeline({ delay: 0.3 });
    introTl
      .to('.ch-text-track', { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', rotationX: 0, ease: 'expo.out', clearProps: 'filter' })
      .to('.ch-text-days', { duration: 1.4, clipPath: 'inset(0 0% 0 0)', ease: 'power4.inOut' }, '-=1.0');

    var scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=7000',
        pin: true,
        scrub: 1,
        anticipatePin: 1
      }
    });

    scrollTl
      // 1. Anti-gravity float for introductory text and grid baseline
      .to('.ch-hero-text-wrapper', { y: -120, scale: 1.08, ease: 'none', duration: 5 }, 0)
      .to('.ch-bg-grid', { scale: 1.25, opacity: 0.15, y: -60, ease: 'none', duration: 5 }, 0)

      // 2. CINEMATIC FRAME-BY-FRAME VIDEO SCRUB ENGINE (Anti-gravity float tracks)
      // Frame 1: Slow drift upwards & scale
      .to('.ch-bg-frame.frame-1', { scale: 1.18, y: -40, rotation: 1.5, duration: 1.5, ease: 'power1.out' }, 0)
      // Crossfade Frame 1 to Frame 2
      .to('.ch-bg-frame.frame-1', { opacity: 0, ease: 'power1.inOut', duration: 0.8 }, 0.7)
      .fromTo('.ch-bg-frame.frame-2', { opacity: 0, scale: 1.05, y: 20 }, { opacity: 0.85, scale: 1.15, y: -30, rotation: -1, ease: 'power2.inOut', duration: 1.5 }, 0.7)

      // Crossfade Frame 2 to Frame 3
      .to('.ch-bg-frame.frame-2', { opacity: 0, ease: 'power1.inOut', duration: 0.8 }, 1.9)
      .fromTo('.ch-bg-frame.frame-3', { opacity: 0, scale: 1.05, y: 20 }, { opacity: 0.9, scale: 1.2, y: -60, rotation: 2, ease: 'power2.inOut', duration: 1.5 }, 1.9)

      // Crossfade Frame 3 to Frame 4
      .to('.ch-bg-frame.frame-3', { opacity: 0, ease: 'power1.inOut', duration: 0.8 }, 3.1)
      .fromTo('.ch-bg-frame.frame-4', { opacity: 0, scale: 1.05, y: 20 }, { opacity: 0.85, scale: 1.22, y: -90, rotation: -2, ease: 'power2.inOut', duration: 1.5 }, 3.1)

      // Crossfade Frame 4 to Frame 5 (Deep atmospheric drift)
      .to('.ch-bg-frame.frame-4', { opacity: 0, ease: 'power1.inOut', duration: 0.8 }, 4.3)
      .fromTo('.ch-bg-frame.frame-5', { opacity: 0, scale: 1.05, y: 20 }, { opacity: 0.8, scale: 1.25, y: -120, rotation: 0.5, ease: 'power2.inOut', duration: 1.8 }, 4.3)

      // 3. Text dissolution and Main Card Intro
      .to('.ch-hero-text-wrapper', { autoAlpha: 0, filter: 'blur(15px)', scale: 1.12, ease: 'power2.in', duration: 1.2 }, 4.3)
      .to('.ch-main-card', { y: 0, ease: 'power3.inOut', duration: 2.5 }, 4.2)
      .to('.ch-main-card', { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.5 })
      .fromTo('.ch-mockup-wrapper',
        { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
        { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 2.5 }, '-=0.8'
      )
      .fromTo('.ch-phone-widget', { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, ease: 'back.out(1.2)', duration: 1.5 }, '-=1.5')
      .to('.ch-progress-ring', { strokeDashoffset: 60, duration: 2, ease: 'power3.inOut' }, '-=1.2')
      .to('.ch-counter-val', { innerHTML: 2400, snap: { innerHTML: 1 }, duration: 2, ease: 'expo.out' }, '-=2.0')
      .fromTo('.ch-floating-badge', { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'back.out(1.5)', duration: 1.5, stagger: 0.2 }, '-=2.0')
      .fromTo('.ch-card-left-text', { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: 'power4.out', duration: 1.5 }, '-=1.5')
      .fromTo('.ch-card-right-text', { x: 50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 1.5 }, '<')
      .to({}, { duration: 2.5 })
      .set('.ch-hero-text-wrapper', { autoAlpha: 0 })
      .set('.ch-cta-wrapper', { autoAlpha: 1 })
      .to({}, { duration: 1.5 })
      .to(['.ch-mockup-wrapper', '.ch-floating-badge', '.ch-card-left-text', '.ch-card-right-text'], {
        scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: 'power3.in', duration: 1.2, stagger: 0.05
      })
      .to('.ch-main-card', {
        width: isMobile ? '92vw' : '85vw',
        height: isMobile ? '92vh' : '85vh',
        borderRadius: isMobile ? '32px' : '40px',
        ease: 'expo.inOut',
        duration: 1.8
      }, 'pullback')
      .to('.ch-cta-wrapper', { scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 1.8, clearProps: 'filter' }, 'pullback')
      .addLabel('exit')
      .to('.ch-main-card', { y: -window.innerHeight - 300, ease: 'power3.in', duration: 1.8 }, 'exit')
      .to('.ch-bg-frame', { yPercent: -35, scale: 1.35, ease: 'power2.in', duration: 1.8 }, 'exit')
      .to('.ch-ethereal-bg', { yPercent: -15, ease: 'power1.in', duration: 1.8 }, 'exit');
  }

  window.BloomCinematicHero = { init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
