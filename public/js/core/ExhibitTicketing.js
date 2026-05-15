(function () {
  'use strict';
  var EXHIBITS = [
    {
      id: 'bloom-pop-workshop',
      title: 'Pop-Art Floral Masterclass',
      date: 'June 14, 2026',
      time: '2:00 PM \u2013 5:00 PM PHT',
      venue: 'Bloom Studio, Lipa City',
      price: 2500,
      currency: '\u20B1',
      seats: 20,
      remaining: 8,
      description: 'Learn hand-tied bouquet assembly techniques inspired by Warhol\u2019s bold color theory. Includes all materials, a take-home arrangement, and a signed certificate.',
      type: 'workshop',
      image: '/uploads/products/neon-blossom.jpg'
    },
    {
      id: 'bloom-gallery-night',
      title: 'Ethereal Petals: A Virtual Gallery',
      date: 'June 28, 2026',
      time: '7:00 PM \u2013 10:00 PM PHT',
      venue: 'Online (WebGL Experience)',
      price: 0,
      currency: '\u20B1',
      seats: 200,
      remaining: 142,
      description: 'Explore procedurally generated 3D floral sculptures in an interactive browser gallery. Free admission. Powered by the Bloom Three.js render engine.',
      type: 'exhibit',
      image: '/uploads/products/velvet-midnight.jpg'
    },
    {
      id: 'bloom-dried-lab',
      title: 'Dried & Preserved Workshop',
      date: 'July 12, 2026',
      time: '10:00 AM \u2013 1:00 PM PHT',
      venue: 'Bloom Studio, Lipa City',
      price: 1800,
      currency: '\u20B1',
      seats: 15,
      remaining: 5,
      description: 'Master the art of preserving botanicals. Create a framed dried arrangement using silica gel and glycerin techniques documented by the Smithsonian Gardens.',
      type: 'workshop',
      image: '/uploads/products/obsidian-rose.jpg'
    }
  ];

  var BAG_KEY = 'bloom_exhibit_bag';
  var bag = [];

  function loadBag() {
    try { bag = JSON.parse(localStorage.getItem(BAG_KEY) || '[]'); } catch (e) { bag = []; }
  }

  function saveBag() {
    try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) {}
  }

  function addToBag(exhibitId) {
    if (bag.indexOf(exhibitId) !== -1) return false;
    bag.push(exhibitId);
    saveBag();
    return true;
  }

  function removeFromBag(exhibitId) {
    bag = bag.filter(function (id) { return id !== exhibitId; });
    saveBag();
  }

  function escH(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function money(n) {
    return '\u20B1' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 });
  }

  function renderMarquee() {
    var el = document.getElementById('bloomExhibitMarquee');
    if (!el) return;
    var items = EXHIBITS.map(function (e) {
      return '<span class="exh-marquee-item">' +
        '<span class="exh-marquee-type">' + e.type.toUpperCase() + '</span> ' +
        escH(e.title) + ' \u2014 ' + escH(e.date) +
        (e.price > 0 ? ' \u00B7 ' + money(e.price) : ' \u00B7 FREE') +
        ' \u00B7 ' + e.remaining + ' spots left' +
        '</span>';
    }).join('<span class="exh-marquee-sep">\u2726</span>');
    el.innerHTML = '<div class="exh-marquee-track">' + items + items + '</div>';
  }

  function renderCards() {
    var grid = document.getElementById('bloomExhibitGrid');
    if (!grid) return;
    grid.innerHTML = EXHIBITS.map(function (e) {
      var inBag = bag.indexOf(e.id) !== -1;
      var soldOut = e.remaining <= 0;
      var pctFull = Math.round(((e.seats - e.remaining) / e.seats) * 100);
      return '<article class="exh-card glass-ethereal" data-exhibit="' + e.id + '">' +
        '<div class="exh-card-img"><img src="' + escH(e.image) + '" alt="' + escH(e.title) + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'"></div>' +
        '<div class="exh-card-body">' +
        '<span class="exh-type-tag exh-type-' + e.type + '">' + e.type + '</span>' +
        '<h3 class="exh-card-title">' + escH(e.title) + '</h3>' +
        '<div class="exh-card-meta"><span>' + escH(e.date) + '</span><span>' + escH(e.time) + '</span></div>' +
        '<div class="exh-card-venue">' + escH(e.venue) + '</div>' +
        '<p class="exh-card-desc">' + escH(e.description) + '</p>' +
        '<div class="exh-card-capacity">' +
        '<div class="exh-bar"><div class="exh-bar-fill" style="width:' + pctFull + '%"></div></div>' +
        '<span>' + e.remaining + ' of ' + e.seats + ' spots</span>' +
        '</div>' +
        '<div class="exh-card-foot">' +
        '<span class="exh-price">' + (e.price > 0 ? money(e.price) : 'Free Admission') + '</span>' +
        '<button class="btn btn-p exh-bag-btn' + (inBag ? ' exh-bagged' : '') + '"' +
        (soldOut ? ' disabled' : '') +
        ' data-id="' + e.id + '">' +
        (soldOut ? 'Sold Out' : (inBag ? '\u2714 In Bag' : 'Bag It \u2192')) +
        '</button>' +
        '</div>' +
        '</div>' +
        '</article>';
    }).join('');
    grid.querySelectorAll('.exh-bag-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        if (bag.indexOf(id) !== -1) {
          removeFromBag(id);
          btn.classList.remove('exh-bagged');
          btn.textContent = 'Bag It \u2192';
          if (window.showToast) window.showToast('Removed from bag', 'info');
        } else {
          if (addToBag(id)) {
            btn.classList.add('exh-bagged');
            btn.textContent = '\u2714 In Bag';
            btn.style.transform = 'scale(1.1)';
            setTimeout(function () { btn.style.transform = ''; }, 200);
            if (window.showToast) window.showToast('Added to exhibit bag', 'success');
          }
        }
      });
    });
  }

  function injectSection() {
    var target = document.querySelector('.subs-sec') || document.querySelector('#subs');
    if (!target) return;
    if (document.getElementById('bloomExhibitSection')) return;
    var section = document.createElement('section');
    section.id = 'bloomExhibitSection';
    section.className = 'exh-section sec-pad';
    section.setAttribute('aria-label', 'Floral workshops and exhibitions');
    section.innerHTML =
      '<div class="exh-marquee-wrap" id="bloomExhibitMarquee" aria-hidden="true"></div>' +
      '<div class="con">' +
      '<div class="sec-hd" style="flex-direction:column;align-items:flex-start">' +
      '<span class="tag tag-a">\u2726 Events</span>' +
      '<h2 class="sec-title" style="max-width:680px">Workshops & Exhibits</h2>' +
      '<p class="sec-sub" style="max-width:640px">Hands-on floral craft sessions and immersive gallery experiences. ' +
      'All events are organized by the Bloom team as part of the BSIT Capstone demonstration platform. ' +
      'Ticket availability and pricing shown are simulated for academic purposes.</p>' +
      '</div>' +
      '<div class="exh-grid" id="bloomExhibitGrid"></div>' +
      '</div>';
    var divider = document.createElement('div');
    divider.className = 'p5-sec-div';
    divider.setAttribute('aria-hidden', 'true');
    target.parentNode.insertBefore(divider, target);
    target.parentNode.insertBefore(section, divider);
    loadBag();
    renderMarquee();
    renderCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSection);
  } else {
    injectSection();
  }

  window.BloomExhibits = { addToBag: addToBag, removeFromBag: removeFromBag, getBag: function () { return bag.slice(); } };
})();
