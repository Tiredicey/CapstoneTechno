(function () {
  'use strict';
  if (window.MerchandisePersonalizer) return;

  var MERCH_TYPES = [
    { id: 'mug', name: 'Ceramic Mug', price: 450, emoji: '☕' },
    { id: 'tote', name: 'Canvas Tote Bag', price: 380, emoji: '👜' },
    { id: 'pillow', name: 'Throw Pillow', price: 650, emoji: '🛋️' },
    { id: 'notebook', name: 'Bound Notebook', price: 320, emoji: '📓' },
    { id: 'frame', name: 'Photo Frame', price: 550, emoji: '🖼️' },
    { id: 'candle', name: 'Scented Candle', price: 420, emoji: '🕯️' }
  ];

  var FONTS = ['Playfair Display', 'DM Sans', 'Barlow Condensed', 'Georgia', 'Courier New'];
  var COLORS = ['#E61A1A', '#E84393', '#FFD700', '#00D4AA', '#7C3AED', '#FFFFFF', '#000000'];

  var state = {
    type: null,
    text: '',
    font: FONTS[0],
    textColor: COLORS[5],
    imageUrl: null,
    layout: 'centered'
  };

  function setType(id) {
    var item = MERCH_TYPES.find(function (m) { return m.id === id; });
    if (item) state.type = id;
  }

  function setText(txt) { state.text = String(txt).slice(0, 100); }
  function setFont(font) { if (FONTS.indexOf(font) !== -1) state.font = font; }
  function setTextColor(color) { state.textColor = color; }
  function setImage(url) { state.imageUrl = url; }
  function setLayout(layout) {
    if (['centered', 'top', 'bottom', 'wrap'].indexOf(layout) !== -1) state.layout = layout;
  }

  function calcPrice() {
    var base = MERCH_TYPES.find(function (m) { return m.id === state.type; });
    var p = base ? base.price : 0;
    if (state.text) p += 80;
    if (state.imageUrl) p += 120;
    return p;
  }

  function toCartItem() {
    var item = MERCH_TYPES.find(function (m) { return m.id === state.type; });
    return {
      type: 'custom_merchandise',
      merchType: state.type,
      merchName: item ? item.name : 'Custom Item',
      text: state.text,
      font: state.font,
      textColor: state.textColor,
      imageUrl: state.imageUrl,
      layout: state.layout,
      price: calcPrice(),
      emoji: item ? item.emoji : '🎁'
    };
  }

  function reset() {
    state.type = null;
    state.text = '';
    state.font = FONTS[0];
    state.textColor = COLORS[5];
    state.imageUrl = null;
    state.layout = 'centered';
  }

  window.MerchandisePersonalizer = {
    MERCH_TYPES: MERCH_TYPES,
    FONTS: FONTS,
    COLORS: COLORS,
    setType: setType,
    setText: setText,
    setFont: setFont,
    setTextColor: setTextColor,
    setImage: setImage,
    setLayout: setLayout,
    calcPrice: calcPrice,
    toCartItem: toCartItem,
    reset: reset,
    getState: function () { return JSON.parse(JSON.stringify(state)); }
  };
})();
