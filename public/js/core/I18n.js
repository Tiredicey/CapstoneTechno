(function () {
  'use strict';
  if (window.I18n) return;

  var dictionaries = {
    en: {
      'nav.shop': 'Shop',
      'nav.custom': 'Custom',
      'nav.track': 'Track',
      'nav.support': 'Support',
      'nav.cart': 'Cart',
      'nav.signin': 'Sign In',
      'hero.tagline': 'Handcrafted bouquets, pre-ordered for every moment.',
      'hero.cta': 'Pre-Order Now',
      'hero.catalog': 'Browse Catalog',
      'section.featured': 'Featured Arrangements',
      'section.categories': 'Shop by Category',
      'section.reviews': 'What Customers Say',
      'section.facts': 'Why Bloom?',
      'section.newsletter': 'Stay in Bloom',
      'section.stats': 'By the Numbers',
      'section.recently': 'Recently Viewed',
      'cart.add': 'Add to Cart',
      'cart.view': 'View Cart',
      'cart.empty': 'Your cart is empty',
      'cart.checkout': 'Checkout',
      'auth.login': 'Sign In',
      'auth.register': 'Create Account',
      'auth.guest': 'Continue as Guest',
      'auth.forgot': 'Forgot password?',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.name': 'Name',
      'footer.handcrafted': 'Handcrafted in the Philippines',
      'search.placeholder': 'Search bouquets, gifts...',
      'exit.title': 'Wait — don\'t leave empty-handed!',
      'exit.subtitle': 'Get 10% off your first order',
      'exit.cta': 'Claim My Discount',
      'exit.dismiss': 'No thanks',
      'theme.toggle': 'Toggle theme'
    },
    fil: {
      'nav.shop': 'Tindahan',
      'nav.custom': 'Custom',
      'nav.track': 'Subaybayan',
      'nav.support': 'Tulong',
      'nav.cart': 'Kariton',
      'nav.signin': 'Mag-sign In',
      'hero.tagline': 'Mga bouquet na gawa sa kamay, pre-order para sa bawat okasyon.',
      'hero.cta': 'Pre-Order Ngayon',
      'hero.catalog': 'Tingnan ang Katalogo',
      'section.featured': 'Mga Tampok na Ayos',
      'section.categories': 'Tindahan ayon sa Kategorya',
      'section.reviews': 'Ano ang Sabi ng mga Customer',
      'section.facts': 'Bakit Bloom?',
      'section.newsletter': 'Manatiling Namumulaklak',
      'section.stats': 'Sa mga Numero',
      'section.recently': 'Kamakailan Tiningnan',
      'cart.add': 'Idagdag sa Kariton',
      'cart.view': 'Tingnan ang Kariton',
      'cart.empty': 'Walang laman ang iyong kariton',
      'cart.checkout': 'Checkout',
      'auth.login': 'Mag-sign In',
      'auth.register': 'Gumawa ng Account',
      'auth.guest': 'Magpatuloy bilang Bisita',
      'auth.forgot': 'Nakalimutan ang password?',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.name': 'Pangalan',
      'footer.handcrafted': 'Gawa sa kamay sa Pilipinas',
      'search.placeholder': 'Maghanap ng bouquets, regalo...',
      'exit.title': 'Teka — huwag umalis ng walang dala!',
      'exit.subtitle': '10% diskwento sa unang order mo',
      'exit.cta': 'Kunin ang Diskwento Ko',
      'exit.dismiss': 'Hindi, salamat',
      'theme.toggle': 'Palitan ang tema'
    },
    ja: {
      'nav.shop': 'ショップ',
      'nav.custom': 'カスタム',
      'nav.track': '追跡',
      'nav.support': 'サポート',
      'nav.cart': 'カート',
      'nav.signin': 'ログイン',
      'hero.tagline': 'すべての瞬間のための手作りブーケ。',
      'hero.cta': '今すぐ予約',
      'hero.catalog': 'カタログを見る',
      'section.featured': '特集アレンジメント',
      'section.categories': 'カテゴリーで探す',
      'section.reviews': 'お客様の声',
      'section.facts': 'なぜBloom？',
      'section.newsletter': 'ニュースレター',
      'section.stats': '実績',
      'section.recently': '最近見たもの',
      'cart.add': 'カートに追加',
      'cart.view': 'カートを見る',
      'cart.empty': 'カートは空です',
      'cart.checkout': 'レジに進む',
      'auth.login': 'ログイン',
      'auth.register': 'アカウント作成',
      'auth.guest': 'ゲストとして続ける',
      'auth.forgot': 'パスワードを忘れた？',
      'auth.email': 'メール',
      'auth.password': 'パスワード',
      'auth.name': '名前',
      'footer.handcrafted': 'フィリピンで手作り',
      'search.placeholder': 'ブーケ、ギフトを検索...',
      'exit.title': 'ちょっと待って！',
      'exit.subtitle': '初回注文10%オフ',
      'exit.cta': '割引を受ける',
      'exit.dismiss': 'いいえ、結構です',
      'theme.toggle': 'テーマ切替'
    },
    es: {
      'nav.shop': 'Tienda',
      'nav.custom': 'Personalizar',
      'nav.track': 'Rastrear',
      'nav.support': 'Soporte',
      'nav.cart': 'Carrito',
      'nav.signin': 'Iniciar sesión',
      'hero.tagline': 'Ramos artesanales, pre-ordenados para cada momento.',
      'hero.cta': 'Pre-Ordenar',
      'hero.catalog': 'Ver Catálogo',
      'section.featured': 'Arreglos Destacados',
      'section.categories': 'Comprar por Categoría',
      'section.reviews': 'Lo que Dicen los Clientes',
      'section.facts': '¿Por qué Bloom?',
      'section.newsletter': 'Mantente en Bloom',
      'section.stats': 'En Números',
      'section.recently': 'Vistos Recientemente',
      'cart.add': 'Añadir al Carrito',
      'cart.view': 'Ver Carrito',
      'cart.empty': 'Tu carrito está vacío',
      'cart.checkout': 'Pagar',
      'auth.login': 'Iniciar sesión',
      'auth.register': 'Crear Cuenta',
      'auth.guest': 'Continuar como Invitado',
      'auth.forgot': '¿Olvidaste tu contraseña?',
      'auth.email': 'Correo',
      'auth.password': 'Contraseña',
      'auth.name': 'Nombre',
      'footer.handcrafted': 'Hecho a mano en Filipinas',
      'search.placeholder': 'Buscar ramos, regalos...',
      'exit.title': '¡Espera, no te vayas con las manos vacías!',
      'exit.subtitle': '10% de descuento en tu primer pedido',
      'exit.cta': 'Obtener Descuento',
      'exit.dismiss': 'No, gracias',
      'theme.toggle': 'Cambiar tema'
    }
  };

  var currentLang = 'en';

  function t(key, fallback) {
    var dict = dictionaries[currentLang] || dictionaries.en;
    return dict[key] || (dictionaries.en[key]) || fallback || key;
  }

  function setLang(lang) {
    if (!dictionaries[lang]) lang = 'en';
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
    applyTranslations();
    if (window.Store) window.Store.setLang(lang);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var translated = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  function formatMoney(amount, currency) {
    currency = currency || 'PHP';
    var lang = currentLang === 'fil' ? 'en-PH' : currentLang;
    try {
      return new Intl.NumberFormat(lang, { style: 'currency', currency: currency }).format(amount);
    } catch {
      return '₱' + Number(amount).toFixed(2);
    }
  }

  function formatDate(date, opts) {
    var lang = currentLang === 'fil' ? 'en-PH' : currentLang;
    try {
      return new Intl.DateTimeFormat(lang, opts || { dateStyle: 'medium' }).format(new Date(date));
    } catch {
      return String(date);
    }
  }

  function getLang() { return currentLang; }
  function getAvailable() { return Object.keys(dictionaries); }

  if (window.Store) {
    currentLang = window.Store.get('lang') || 'en';
  }

  window.I18n = {
    t: t,
    setLang: setLang,
    getLang: getLang,
    getAvailable: getAvailable,
    formatMoney: formatMoney,
    formatDate: formatDate,
    applyTranslations: applyTranslations,
    dictionaries: dictionaries
  };
})();
