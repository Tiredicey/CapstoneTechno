(function () {
  'use strict';
  if (window.BloomMotion) return;
  var M = window.Motion || {};
  var animate = M.animate;
  var scroll = M.scroll;
  var inView = M.inView;
  var stagger = M.stagger;
  var spring = M.spring;
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function revealOnScroll(selector, opts) {
    if (reducedMotion() || !inView) return;
    var defaults = { y: [28, 0], opacity: [0, 1] };
    var anim = Object.assign({}, defaults, opts && opts.keyframes);
    var config = { duration: opts && opts.duration || 0.75, easing: opts && opts.easing || [0.22, 1, 0.36, 1] };
    if (opts && opts.staggerDelay && stagger) {
      config.delay = stagger(opts.staggerDelay);
    }
    inView(selector, function (info) {
      if (!animate) return;
      animate(info.target, anim, config);
    }, { margin: opts && opts.margin || '0px 0px -100px 0px' });
  }
  function heroEntrance() {
    if (reducedMotion() || !animate) return;
    var tl = [
      ['.hero-eyebrow', { opacity: [0, 1], x: [-35, 0], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 0.65, easing: [0.22, 1, 0.36, 1] }],
      ['.hero-hl', { opacity: [0, 1], y: [45, 0], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.9, easing: [0.22, 1, 0.36, 1], at: 0.12 }],
      ['.hero-sub', { opacity: [0, 1], y: [22, 0] }, { duration: 0.65, easing: [0.22, 1, 0.36, 1], at: 0.25 }],
      ['.hero-cta', { opacity: [0, 1], y: [22, 0], scale: [0.95, 1] }, { duration: 0.55, easing: [0.34, 1.56, 0.64, 1], at: 0.38 }],
      ['.trust', { opacity: [0, 1], y: [14, 0] }, { duration: 0.5, easing: [0.22, 1, 0.36, 1], at: 0.5 }]
    ];
    tl.forEach(function (step) {
      var el = document.querySelector(step[0]);
      if (el) animate(el, step[1], step[2]);
    });
  }
  function fadeUp(selector, options) {
    if (reducedMotion() || !animate) return;
    var els = document.querySelectorAll(selector);
    if (!els.length) return;
    var config = Object.assign({ duration: 0.65, easing: [0.22, 1, 0.36, 1] }, options);
    animate(els, { opacity: [0, 1], y: [28, 0] }, config);
  }
  function scaleIn(selector, options) {
    if (reducedMotion() || !animate) return;
    var els = document.querySelectorAll(selector);
    if (!els.length) return;
    var config = Object.assign({ duration: 0.55, easing: [0.34, 1.56, 0.64, 1] }, options);
    animate(els, { opacity: [0, 1], scale: [0.82, 1] }, config);
  }
  function slideIn(selector, direction, options) {
    if (reducedMotion() || !animate) return;
    var els = document.querySelectorAll(selector);
    if (!els.length) return;
    var kf = { opacity: [0, 1] };
    if (direction === 'left') kf.x = [-45, 0];
    else if (direction === 'right') kf.x = [45, 0];
    else if (direction === 'up') kf.y = [-45, 0];
    else kf.y = [45, 0];
    var config = Object.assign({ duration: 0.65, easing: [0.22, 1, 0.36, 1] }, options);
    animate(els, kf, config);
  }
  function scrollProgress(selector, keyframes, options) {
    if (reducedMotion() || !animate || !scroll) return;
    var el = document.querySelector(selector);
    if (!el) return;
    scroll(
      animate(el, keyframes, { duration: 1, easing: 'linear' }),
      Object.assign({ target: el }, options)
    );
  }
  function staggerCards(selector, options) {
    if (reducedMotion() || !animate || !stagger) return;
    var els = document.querySelectorAll(selector);
    if (!els.length) return;
    var config = {
      duration: options && options.duration || 0.65,
      delay: stagger(options && options.staggerDelay || 0.07),
      easing: options && options.easing || [0.22, 1, 0.36, 1]
    };
    animate(els, {
      opacity: [0, 1],
      y: [35, 0],
      scale: [0.94, 1]
    }, config);
  }
  function pressEffect(selector) {
    if (reducedMotion() || !animate) return;
    var els = document.querySelectorAll(selector);
    els.forEach(function (el) {
      el.addEventListener('pointerdown', function () {
        animate(el, { scale: 0.95 }, { duration: 0.08, easing: [0.22, 1, 0.36, 1] });
      });
      el.addEventListener('pointerup', function () {
        animate(el, { scale: 1 }, { duration: 0.35, easing: [0.34, 1.56, 0.64, 1] });
      });
      el.addEventListener('pointerleave', function () {
        animate(el, { scale: 1 }, { duration: 0.2 });
      });
    });
  }
  function countUp(el, endValue, options) {
    if (!animate) return;
    var decimal = options && options.decimal;
    var suffix = options && options.suffix || '';
    var obj = { val: 0 };
    animate(obj, { val: endValue }, {
      duration: options && options.duration || 2,
      easing: [0.22, 1, 0.36, 1],
      onUpdate: function () {
        el.textContent = (decimal ? obj.val.toFixed(1) : Math.floor(obj.val).toLocaleString()) + suffix;
      }
    });
  }
  function init() {
    M = window.Motion || {};
    animate = M.animate;
    scroll = M.scroll;
    inView = M.inView;
    stagger = M.stagger;
    spring = M.spring;
    if (!animate) return;
    heroEntrance();
    revealOnScroll('.stat-item', { staggerDelay: 0.05 });
    revealOnScroll('.p-card', {
      keyframes: { y: [35, 0], opacity: [0, 1], scale: [0.95, 1] },
      staggerDelay: 0.06
    });
    revealOnScroll('.feat-card', {
      keyframes: { y: [35, 0], opacity: [0, 1], scale: [0.94, 1] },
      staggerDelay: 0.07,
      duration: 0.75
    });
    revealOnScroll('.rev-card', { staggerDelay: 0.09 });
    revealOnScroll('.fact-card', { staggerDelay: 0.07 });
    revealOnScroll('.subs-card', {
      keyframes: { x: [35, 0], opacity: [0, 1] },
      staggerDelay: 0.09
    });
    revealOnScroll('.team-card', {
      keyframes: { y: [30, 0], opacity: [0, 1], scale: [0.94, 1] },
      staggerDelay: 0.08
    });
    revealOnScroll('.value-card', {
      keyframes: { x: [-30, 0], opacity: [0, 1] },
      staggerDelay: 0.08
    });
    revealOnScroll('.bc-card', {
      keyframes: { y: [30, 0], opacity: [0, 1], scale: [0.95, 1] },
      staggerDelay: 0.06
    });
    pressEffect('.btn-p, .p-add, .cat-tab, .btn-primary, .btn-accent');
    scrollProgress('#sbar', { scaleX: [0, 1] }, {
      target: document.documentElement,
      offset: ['start start', 'end end']
    });
  }
  var BloomMotion = {
    init: init,
    animate: function () { return animate && animate.apply(null, arguments); },
    scroll: function () { return scroll && scroll.apply(null, arguments); },
    inView: function () { return inView && inView.apply(null, arguments); },
    stagger: function () { return stagger && stagger.apply(null, arguments); },
    revealOnScroll: revealOnScroll,
    heroEntrance: heroEntrance,
    fadeUp: fadeUp,
    scaleIn: scaleIn,
    slideIn: slideIn,
    scrollProgress: scrollProgress,
    staggerCards: staggerCards,
    pressEffect: pressEffect,
    countUp: countUp,
    reducedMotion: reducedMotion
  };
  window.BloomMotion = BloomMotion;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
