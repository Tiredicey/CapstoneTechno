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
    var defaults = { y: [24, 0], opacity: [0, 1] };
    var anim = Object.assign({}, defaults, opts && opts.keyframes);
    var config = { duration: opts && opts.duration || 0.7, easing: opts && opts.easing || [0.23, 1, 0.32, 1] };
    if (opts && opts.staggerDelay && stagger) {
      config.delay = stagger(opts.staggerDelay);
    }
    inView(selector, function (info) {
      if (!animate) return;
      animate(info.target, anim, config);
    }, { margin: opts && opts.margin || '0px 0px -80px 0px' });
  }

  function heroEntrance() {
    if (reducedMotion() || !animate) return;
    var tl = [
      ['.hero-eyebrow', { opacity: [0, 1], x: [-30, 0] }, { duration: 0.6, easing: [0.23, 1, 0.32, 1] }],
      ['.hero-hl', { opacity: [0, 1], y: [40, 0] }, { duration: 0.8, easing: [0.23, 1, 0.32, 1], at: 0.15 }],
      ['.hero-sub', { opacity: [0, 1], y: [20, 0] }, { duration: 0.6, easing: [0.23, 1, 0.32, 1], at: 0.3 }],
      ['.hero-cta', { opacity: [0, 1], y: [20, 0] }, { duration: 0.5, easing: [0.23, 1, 0.32, 1], at: 0.4 }],
      ['.trust', { opacity: [0, 1], y: [12, 0] }, { duration: 0.5, easing: [0.23, 1, 0.32, 1], at: 0.5 }]
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
    var config = Object.assign({ duration: 0.6, easing: [0.23, 1, 0.32, 1] }, options);
    animate(els, { opacity: [0, 1], y: [24, 0] }, config);
  }

  function scaleIn(selector, options) {
    if (reducedMotion() || !animate) return;
    var els = document.querySelectorAll(selector);
    if (!els.length) return;
    var config = Object.assign({ duration: 0.5, easing: [0.34, 1.56, 0.64, 1] }, options);
    animate(els, { opacity: [0, 1], scale: [0.85, 1] }, config);
  }

  function slideIn(selector, direction, options) {
    if (reducedMotion() || !animate) return;
    var els = document.querySelectorAll(selector);
    if (!els.length) return;
    var kf = { opacity: [0, 1] };
    if (direction === 'left') kf.x = [-40, 0];
    else if (direction === 'right') kf.x = [40, 0];
    else if (direction === 'up') kf.y = [-40, 0];
    else kf.y = [40, 0];
    var config = Object.assign({ duration: 0.6, easing: [0.23, 1, 0.32, 1] }, options);
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
      duration: options && options.duration || 0.6,
      delay: stagger(options && options.staggerDelay || 0.08),
      easing: options && options.easing || [0.23, 1, 0.32, 1]
    };
    animate(els, {
      opacity: [0, 1],
      y: [30, 0],
      scale: [0.96, 1]
    }, config);
  }

  function pressEffect(selector) {
    if (reducedMotion() || !animate) return;
    var els = document.querySelectorAll(selector);
    els.forEach(function (el) {
      el.addEventListener('pointerdown', function () {
        animate(el, { scale: 0.96 }, { duration: 0.1, easing: [0.23, 1, 0.32, 1] });
      });
      el.addEventListener('pointerup', function () {
        animate(el, { scale: 1 }, { duration: 0.3, easing: [0.34, 1.56, 0.64, 1] });
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
      duration: options && options.duration || 1.8,
      easing: [0.23, 1, 0.32, 1],
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

    revealOnScroll('.stat-item', { staggerDelay: 0.06 });
    revealOnScroll('.p-card', { staggerDelay: 0.06 });
    revealOnScroll('.feat-card', {
      keyframes: { y: [30, 0], opacity: [0, 1], scale: [0.96, 1] },
      staggerDelay: 0.08,
      duration: 0.7
    });
    revealOnScroll('.rev-card', { staggerDelay: 0.1 });
    revealOnScroll('.fact-card', { staggerDelay: 0.08 });
    revealOnScroll('.subs-card', {
      keyframes: { x: [30, 0], opacity: [0, 1] },
      staggerDelay: 0.1
    });

    pressEffect('.btn-p, .p-add, .cat-tab');

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
