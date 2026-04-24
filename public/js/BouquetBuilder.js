(function () {
  'use strict';
  if (window.BouquetBuilder) return;

  var STEMS = [
    { id: 'rose-red', name: 'Red Rose', emoji: '🌹', price: 85, category: 'roses' },
    { id: 'rose-pink', name: 'Pink Rose', emoji: '🌷', price: 85, category: 'roses' },
    { id: 'rose-white', name: 'White Rose', emoji: '🤍', price: 85, category: 'roses' },
    { id: 'sunflower', name: 'Sunflower', emoji: '🌻', price: 95, category: 'statement' },
    { id: 'tulip', name: 'Tulip', emoji: '🌷', price: 75, category: 'spring' },
    { id: 'lily', name: 'Lily', emoji: '🪷', price: 110, category: 'exotic' },
    { id: 'orchid', name: 'Orchid', emoji: '🪻', price: 150, category: 'exotic' },
    { id: 'daisy', name: 'Daisy', emoji: '🌼', price: 55, category: 'garden' },
    { id: 'lavender', name: 'Lavender', emoji: '💜', price: 65, category: 'garden' },
    { id: 'peony', name: 'Peony', emoji: '🌸', price: 120, category: 'premium' },
    { id: 'carnation', name: 'Carnation', emoji: '🩷', price: 50, category: 'classic' },
    { id: 'baby-breath', name: "Baby's Breath", emoji: '☁️', price: 40, category: 'filler' }
  ];

  var WRAPS = [
    { id: 'kraft', name: 'Kraft Paper', price: 0, color: '#C8A87C' },
    { id: 'silk', name: 'Silk Wrap', price: 180, color: '#E8C4D8' },
    { id: 'velvet', name: 'Velvet', price: 250, color: '#4A0E2E' },
    { id: 'burlap', name: 'Burlap', price: 80, color: '#A8956A' },
    { id: 'organza', name: 'Organza', price: 150, color: '#F0E6F6' }
  ];

  var ADDONS = [
    { id: 'ribbon', name: 'Satin Ribbon', price: 45, emoji: '🎀' },
    { id: 'card', name: 'Message Card', price: 35, emoji: '💌' },
    { id: 'vase', name: 'Glass Vase', price: 350, emoji: '🏺' },
    { id: 'chocolates', name: 'Chocolates Box', price: 280, emoji: '🍫' },
    { id: 'bear', name: 'Teddy Bear', price: 450, emoji: '🧸' }
  ];

  var state = {
    stems: [],
    wrap: 'kraft',
    addons: [],
    message: '',
    size: 'medium'
  };

  var SIZE_MULTIPLIER = { small: 0.7, medium: 1, large: 1.4, grand: 1.9 };
  var SIZE_STEM_LIMITS = { small: 6, medium: 12, large: 20, grand: 30 };

  function calcTotal() {
    var stemCost = state.stems.reduce(function (s, item) {
      var stem = STEMS.find(function (st) { return st.id === item.id; });
      return s + (stem ? stem.price * item.qty : 0);
    }, 0);
    var wrapObj = WRAPS.find(function (w) { return w.id === state.wrap; });
    var wrapCost = wrapObj ? wrapObj.price : 0;
    var addonCost = state.addons.reduce(function (s, aid) {
      var a = ADDONS.find(function (ad) { return ad.id === aid; });
      return s + (a ? a.price : 0);
    }, 0);
    var mult = SIZE_MULTIPLIER[state.size] || 1;
    return Math.round((stemCost * mult + wrapCost + addonCost) * 100) / 100;
  }

  function stemCount() {
    return state.stems.reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function addStem(id) {
    var limit = SIZE_STEM_LIMITS[state.size] || 12;
    if (stemCount() >= limit) return false;
    var existing = state.stems.find(function (s) { return s.id === id; });
    if (existing) existing.qty++;
    else state.stems.push({ id: id, qty: 1 });
    return true;
  }

  function removeStem(id) {
    var existing = state.stems.find(function (s) { return s.id === id; });
    if (!existing) return;
    existing.qty--;
    if (existing.qty <= 0) {
      state.stems = state.stems.filter(function (s) { return s.id !== id; });
    }
  }

  function setWrap(id) { state.wrap = id; }

  function toggleAddon(id) {
    var idx = state.addons.indexOf(id);
    if (idx === -1) state.addons.push(id);
    else state.addons.splice(idx, 1);
  }

  function setSize(size) {
    if (!SIZE_MULTIPLIER[size]) return;
    state.size = size;
    var limit = SIZE_STEM_LIMITS[size];
    while (stemCount() > limit && state.stems.length) {
      var last = state.stems[state.stems.length - 1];
      last.qty--;
      if (last.qty <= 0) state.stems.pop();
    }
  }

  function setMessage(msg) { state.message = String(msg).slice(0, 200); }

  function getPreview() {
    return state.stems.map(function (s) {
      var stem = STEMS.find(function (st) { return st.id === s.id; });
      return stem ? Array(s.qty).fill(stem.emoji).join('') : '';
    }).join(' ');
  }

  function toCartItem() {
    return {
      type: 'custom_bouquet',
      stems: JSON.parse(JSON.stringify(state.stems)),
      wrap: state.wrap,
      addons: state.addons.slice(),
      size: state.size,
      message: state.message,
      price: calcTotal(),
      preview: getPreview()
    };
  }

  function reset() {
    state.stems = [];
    state.wrap = 'kraft';
    state.addons = [];
    state.message = '';
    state.size = 'medium';
  }

  window.BouquetBuilder = {
    STEMS: STEMS,
    WRAPS: WRAPS,
    ADDONS: ADDONS,
    SIZE_MULTIPLIER: SIZE_MULTIPLIER,
    SIZE_STEM_LIMITS: SIZE_STEM_LIMITS,
    addStem: addStem,
    removeStem: removeStem,
    setWrap: setWrap,
    toggleAddon: toggleAddon,
    setSize: setSize,
    setMessage: setMessage,
    calcTotal: calcTotal,
    stemCount: stemCount,
    getPreview: getPreview,
    toCartItem: toCartItem,
    reset: reset,
    getState: function () { return JSON.parse(JSON.stringify(state)); }
  };
})();
