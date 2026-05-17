(function () {
  'use strict';
  var BMC_USERNAME = 'bloomcapstone';
  var BMC_URL = 'https://buymeacoffee.com/' + BMC_USERNAME;
  var KOFI_USERNAME = 'bloomcapstone';
  var KOFI_URL = 'https://ko-fi.com/' + KOFI_USERNAME;

  window.BloomSupport = {
    renderSupportSection: renderSupportSection,
    renderFloatingButton: renderFloatingButton
  };

  function renderFloatingButton() {
    injectStyles();
    var fab = document.createElement('a');
    fab.href = BMC_URL;
    fab.target = '_blank';
    fab.rel = 'noopener noreferrer';
    fab.className = 'bmc-fab';
    fab.setAttribute('aria-label', 'Support us on Buy Me a Coffee');
    fab.innerHTML = '<svg viewBox="0 0 884 1279" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M791.109 297.518L790.231 297.002L788.201 296.383C789.018 297.072 790.04 297.472 791.109 297.518Z" fill="#0D0C22"/><path d="M803.896 388.891L802.916 389.166L803.896 388.891Z" fill="#0D0C22"/><path d="M791.484 297.377C791.359 297.361 791.237 297.332 791.109 297.518C791.248 297.46 791.381 297.404 791.484 297.377Z" fill="#0D0C22"/><path d="M803.896 388.891C803.523 388.857 803.14 388.996 802.916 389.166L803.177 389.584L803.896 388.891Z" fill="#0D0C22"/><path d="M884 629.97C883.199 629.209 882.288 628.565 881.296 628.054L881.282 628.12L880.318 628.852C880.318 628.852 874.468 631.998 867.46 634.122C860.68 636.177 854.892 637.186 849.108 637.186C839.922 637.186 831.71 634.792 824.464 630.073C817.134 625.366 811.456 618.88 807.395 610.578C803.334 602.276 801.304 593.038 801.304 582.803C801.304 572.282 803.395 562.681 807.578 554C811.761 545.32 817.585 538.414 825.054 533.282C832.522 528.15 841.153 525.584 850.946 525.584C855.139 525.584 859.333 526.14 863.527 527.207C867.946 528.336 872.31 529.967 876.553 532.095L879.053 533.282L879.81 533.684L879.81 448.274C876.733 447.207 873.6 446.316 870.42 445.603C862.953 443.84 854.923 442.939 846.33 442.939C829.09 442.939 813.346 447.27 799.099 455.924C784.852 464.579 773.637 476.35 765.454 491.237C757.271 506.124 753.18 522.932 753.18 541.637C753.18 560.895 757.223 578.251 765.311 593.704C773.398 609.157 784.408 621.376 798.341 630.361C810.878 638.419 825.095 643.456 840.934 645.483C841.081 645.502 841.228 645.523 841.375 645.541C845.556 646.075 849.809 646.342 854.137 646.342C861.238 646.342 868.269 645.536 875.13 643.947C877.828 643.327 880.479 642.609 883.068 641.797L884 641.462V629.97Z" fill="#FFDD00"/><path d="M232.903 535.645C232.903 548.968 235.782 561.21 241.432 572.378C247.083 583.547 255.077 592.653 265.322 599.7C275.567 606.747 287.497 610.271 301.113 610.271C314.729 610.271 326.66 606.747 336.905 599.7C347.149 592.653 355.068 583.547 360.719 572.378C366.369 561.21 369.248 548.968 369.248 535.645C369.248 522.149 366.332 509.759 360.548 498.42C354.789 487.134 346.754 478.003 336.398 471.069C326.066 464.157 314.169 460.688 300.728 460.688C287.287 460.688 275.353 464.157 264.984 471.069C254.615 478.003 246.592 487.134 240.834 498.42C235.05 509.759 232.109 522.149 232.109 535.645" fill="#FFDD00"/><path d="M876.553 532.095C872.31 529.967 867.946 528.336 863.527 527.207C859.333 526.14 855.139 525.584 850.946 525.584C841.153 525.584 832.522 528.15 825.054 533.282C817.585 538.414 811.761 545.32 807.578 554C803.395 562.681 801.304 572.282 801.304 582.803C801.304 593.038 803.334 602.276 807.395 610.578C811.456 618.88 817.134 625.366 824.464 630.073C831.71 634.792 839.922 637.186 849.108 637.186C854.892 637.186 860.68 636.177 867.46 634.122C874.468 631.998 880.318 628.852 880.318 628.852L881.282 628.12L881.296 628.054L884 626.712V518.549L879.81 533.684L879.053 533.282L876.553 532.095Z" fill="#0D0C22"/><path d="M409.788 0.000100708H361.144V204.987C361.144 218.31 364.023 230.551 369.674 241.72C375.324 252.888 383.318 261.994 393.563 269.041C403.808 276.088 415.738 279.612 429.354 279.612C442.97 279.612 454.901 276.088 465.146 269.041C475.39 261.994 483.31 252.888 488.96 241.72C494.61 230.551 497.49 218.31 497.49 204.987C497.49 191.491 494.574 179.1 488.789 167.761C483.031 156.475 474.995 147.345 464.639 140.411C454.307 133.499 442.41 130.029 428.969 130.029C422.362 130.029 416.073 131.03 410.059 132.994L409.788 0.000100708Z" fill="#0D0C22"/><path d="M628.772 130.029C615.331 130.029 603.434 133.499 593.065 140.411C582.696 147.345 574.672 156.475 568.914 167.761C563.13 179.1 560.214 191.491 560.214 204.987C560.214 218.31 563.093 230.551 568.744 241.72C574.394 252.888 582.388 261.994 592.633 269.041C602.878 276.088 614.808 279.612 628.424 279.612C642.04 279.612 653.971 276.088 664.215 269.041C674.46 261.994 682.379 252.888 688.03 241.72C693.68 230.551 696.56 218.31 696.56 204.987C696.56 191.491 693.643 179.1 687.859 167.761C682.1 156.475 674.065 147.345 663.709 140.411C653.377 133.499 641.48 130.029 628.039 130.029H628.772Z" fill="#0D0C22"/><path d="M300.728 790.875C287.287 790.875 275.39 794.345 265.021 801.257C254.652 808.191 246.629 817.321 240.87 828.607C235.087 839.946 232.146 852.337 232.146 865.832C232.146 879.156 235.025 891.397 240.675 902.565C246.326 913.734 254.32 922.84 264.564 929.887C274.809 936.934 286.74 940.458 300.355 940.458C313.971 940.458 325.902 936.934 336.147 929.887C346.391 922.84 354.311 913.734 359.961 902.565C365.611 891.397 368.491 879.156 368.491 865.832C368.491 852.337 365.574 839.946 359.79 828.607C354.031 817.321 345.997 808.191 335.64 801.257C325.309 794.345 313.412 790.875 299.971 790.875H300.728Z" fill="#0D0C22"/><path d="M628.772 790.875C615.331 790.875 603.434 794.345 593.065 801.257C582.696 808.191 574.672 817.321 568.914 828.607C563.13 839.946 560.214 852.337 560.214 865.832C560.214 879.156 563.093 891.397 568.744 902.565C574.394 913.734 582.388 922.84 592.633 929.887C602.878 936.934 614.808 940.458 628.424 940.458C642.04 940.458 653.971 936.934 664.215 929.887C674.46 922.84 682.379 913.734 688.03 902.565C693.68 891.397 696.56 879.156 696.56 865.832C696.56 852.337 693.643 839.946 687.859 828.607C682.1 817.321 674.065 808.191 663.709 801.257C653.377 794.345 641.48 790.875 628.039 790.875H628.772Z" fill="#0D0C22"/><path d="M464.396 1008.66C454.033 1001.7 442.136 998.254 428.695 998.254C415.254 998.254 403.358 1001.72 392.988 1008.64C382.619 1015.57 374.596 1024.7 368.837 1035.99C363.054 1047.33 360.112 1059.72 360.112 1073.21C360.112 1086.54 362.991 1098.78 368.642 1109.95C374.292 1121.11 382.286 1130.22 392.531 1137.27C402.775 1144.31 414.706 1147.84 428.322 1147.84C441.938 1147.84 453.869 1144.31 464.114 1137.27C474.358 1130.22 482.278 1121.11 487.928 1109.95C493.578 1098.78 496.458 1086.54 496.458 1073.21C496.458 1059.72 493.541 1047.33 487.757 1035.99C481.998 1024.7 473.964 1015.57 463.608 1008.64" fill="#0D0C22"/><path d="M232.903 1073.21C232.903 1086.54 235.782 1098.78 241.432 1109.95C247.083 1121.11 255.077 1130.22 265.322 1137.27C275.567 1144.31 287.497 1147.84 301.113 1147.84C314.729 1147.84 326.66 1144.31 336.905 1137.27C347.149 1130.22 355.068 1121.11 360.719 1109.95C366.369 1098.78 369.248 1086.54 369.248 1073.21C369.248 1059.72 366.332 1047.33 360.548 1035.99C354.789 1024.7 346.754 1015.57 336.398 1008.64C326.066 1001.72 314.169 998.254 300.728 998.254C287.287 998.254 275.353 1001.72 264.984 1008.64C254.615 1015.57 246.592 1024.7 240.834 1035.99C235.05 1047.33 232.109 1059.72 232.109 1073.21" fill="#0D0C22"/><path d="M628.772 998.254C615.331 998.254 603.434 1001.72 593.065 1008.64C582.696 1015.57 574.672 1024.7 568.914 1035.99C563.13 1047.33 560.214 1059.72 560.214 1073.21C560.214 1086.54 563.093 1098.78 568.744 1109.95C574.394 1121.11 582.388 1130.22 592.633 1137.27C602.878 1144.31 614.808 1147.84 628.424 1147.84C642.04 1147.84 653.971 1144.31 664.215 1137.27C674.46 1130.22 682.379 1121.11 688.03 1109.95C693.68 1098.78 696.56 1086.54 696.56 1073.21C696.56 1059.72 693.643 1047.33 687.859 1035.99C682.1 1024.7 674.065 1015.57 663.709 1008.64C653.377 1001.72 641.48 998.254 628.039 998.254H628.772Z" fill="#0D0C22"/></svg><span>Support Us</span>';
    document.body.appendChild(fab);
    setTimeout(function () { fab.classList.add('vis'); }, 2000);
  }

  function renderSupportSection(containerId) {
    var host = document.getElementById(containerId);
    if (!host || host.dataset.suInit) return;
    host.dataset.suInit = '1';
    injectStyles();

    var html = '<div class="su-wrap">';
    html += '<div class="su-glow" aria-hidden="true"></div>';
    html += '<div class="su-inner">';
    html += '<div class="su-content">';
    html += '<span class="su-eyebrow">Community Support</span>';
    html += '<h3 class="su-title">Love what we\u2019re building?</h3>';
    html += '<p class="su-desc">Bloom is an academic capstone project built with care by BSIT students at STI College Lipa. Your support helps us maintain servers, improve features, and keep the platform free for everyone.</p>';
    html += '<div class="su-btns">';
    html += '<a href="' + BMC_URL + '" target="_blank" rel="noopener noreferrer" class="su-btn su-btn-bmc" aria-label="Support us on Buy Me a Coffee">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4.5 7.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v.5H18a2 2 0 0 1 0 4h-2.5v.5A4.5 4.5 0 0 1 11 17H9a4.5 4.5 0 0 1-4.5-4.5v-5zM16 10h1a1 1 0 1 0 0-2h-1v2zM6 3a1 1 0 0 1 2 0v2H6V3zm4-1a1 1 0 0 1 2 0v3h-2V2zm4 0a1 1 0 0 1 2 0v2h-2V2z"/></svg>';
    html += '<span>Buy Me a Coffee</span>';
    html += '</a>';
    html += '<a href="' + KOFI_URL + '" target="_blank" rel="noopener noreferrer" class="su-btn su-btn-kofi" aria-label="Support us on Ko-fi">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    html += '<span>Ko-fi</span>';
    html += '</a>';
    html += '</div>';
    html += '<div class="su-note">100% of contributions go toward hosting, development tools, and academic resources.</div>';
    html += '</div>';
    html += '<div class="su-visual">';
    html += '<div class="su-coffee-art" aria-hidden="true">';
    html += '<div class="su-steam su-steam-1"></div>';
    html += '<div class="su-steam su-steam-2"></div>';
    html += '<div class="su-steam su-steam-3"></div>';
    html += '<div class="su-cup">\u2615</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    host.innerHTML = html;
    animateIn(host);
  }

  function animateIn(host) {
    var wrap = host.querySelector('.su-wrap');
    if (!wrap) return;
    wrap.style.opacity = '0';
    wrap.style.transform = 'translateY(24px)';
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          wrap.style.transition = 'opacity .7s cubic-bezier(.23,1,.32,1), transform .7s cubic-bezier(.23,1,.32,1)';
          wrap.style.opacity = '1';
          wrap.style.transform = 'translateY(0)';
          io.disconnect();
        }
      });
    }, { threshold: 0.15 });
    io.observe(wrap);
  }

  function injectStyles() {
    if (document.getElementById('suStyles')) return;
    var s = document.createElement('style');
    s.id = 'suStyles';
    s.textContent =
      '.su-wrap{position:relative;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;background:linear-gradient(135deg,rgba(255,214,0,.03),rgba(255,255,255,.01));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}' +
      '.su-glow{position:absolute;top:-60px;right:-60px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,214,0,.08),transparent 70%);pointer-events:none;filter:blur(50px);animation:suGlow 6s ease-in-out infinite alternate}' +
      '@keyframes suGlow{0%{opacity:.4;transform:scale(1)}100%{opacity:.7;transform:scale(1.2)}}' +
      '.su-inner{display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center;padding:clamp(28px,5vw,48px);position:relative;z-index:1}' +
      '.su-content{min-width:0}' +
      '.su-eyebrow{display:inline-block;font-family:var(--fc);font-style:italic;font-weight:900;font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,214,0,.85);margin-bottom:12px;padding:4px 14px;background:rgba(255,214,0,.08);border:1px solid rgba(255,214,0,.2);border-radius:100px}' +
      '.su-title{font-family:var(--fd);font-size:clamp(1.4rem,3vw,2rem);font-weight:900;margin-bottom:12px;background:linear-gradient(135deg,#fff 30%,rgba(255,214,0,.9));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
      '.su-desc{font-size:.9rem;color:rgba(255,255,255,.6);line-height:1.7;margin-bottom:24px;max-width:520px;text-wrap:pretty}' +
      '.su-btns{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}' +
      '.su-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:12px;font-size:.88rem;font-weight:700;transition:transform .25s cubic-bezier(.23,1,.32,1),box-shadow .25s;text-decoration:none}' +
      '.su-btn:hover{transform:translateY(-3px)}' +
      '.su-btn-bmc{background:linear-gradient(135deg,#FFDD00,#FBB034);color:#0D0C22;box-shadow:0 6px 24px rgba(255,214,0,.25)}' +
      '.su-btn-bmc:hover{box-shadow:0 12px 36px rgba(255,214,0,.4)}' +
      '.su-btn-kofi{background:linear-gradient(135deg,#FF5E5B,#FF2D2D);color:#fff;box-shadow:0 6px 24px rgba(255,94,91,.25)}' +
      '.su-btn-kofi:hover{box-shadow:0 12px 36px rgba(255,94,91,.4)}' +
      '.su-note{font-size:.68rem;color:rgba(255,255,255,.28);font-style:italic;line-height:1.6}' +
      '.su-visual{display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.su-coffee-art{position:relative;width:120px;height:140px;display:flex;align-items:flex-end;justify-content:center}' +
      '.su-cup{font-size:5rem;filter:drop-shadow(0 8px 24px rgba(255,214,0,.2));animation:suFloat 4s ease-in-out infinite}' +
      '@keyframes suFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}' +
      '.su-steam{position:absolute;width:8px;border-radius:4px;background:linear-gradient(to top,rgba(255,214,0,.15),transparent);animation:suSteam 2.4s ease-out infinite}' +
      '.su-steam-1{height:36px;left:30%;top:0;animation-delay:0s}' +
      '.su-steam-2{height:28px;left:50%;top:8px;animation-delay:.6s}' +
      '.su-steam-3{height:32px;left:70%;top:4px;animation-delay:1.2s}' +
      '@keyframes suSteam{0%{opacity:0;transform:translateY(0) scaleX(1)}40%{opacity:.6}100%{opacity:0;transform:translateY(-40px) scaleX(1.5)}}' +
      '.bmc-fab{position:fixed;bottom:86px;left:24px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:100px;background:linear-gradient(135deg,#FFDD00,#FBB034);color:#0D0C22;font-size:.82rem;font-weight:700;text-decoration:none;z-index:980;box-shadow:0 6px 28px rgba(255,214,0,.3);opacity:0;transform:translateY(16px);transition:opacity .5s cubic-bezier(.23,1,.32,1),transform .5s cubic-bezier(.23,1,.32,1)}' +
      '.bmc-fab.vis{opacity:1;transform:translateY(0)}' +
      '.bmc-fab:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 12px 40px rgba(255,214,0,.45)}' +
      '.bmc-fab svg{flex-shrink:0}' +
      '[data-theme="light"] .su-wrap{background:linear-gradient(135deg,rgba(255,214,0,.04),rgba(0,0,0,.01));border-color:rgba(0,0,0,.08);backdrop-filter:none}' +
      '[data-theme="light"] .su-title{background:linear-gradient(135deg,var(--ink) 30%,rgba(200,160,0,.9));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
      '[data-theme="light"] .su-desc{color:rgba(26,18,32,.6)}' +
      '[data-theme="light"] .su-note{color:rgba(26,18,32,.3)}' +
      '[data-theme="light"] .su-eyebrow{color:rgba(180,140,0,.9);background:rgba(255,214,0,.1);border-color:rgba(200,160,0,.25)}' +
      '@media(max-width:640px){.su-inner{grid-template-columns:1fr;text-align:center}.su-visual{display:none}.su-btns{justify-content:center}.su-desc{margin-left:auto;margin-right:auto}.bmc-fab{left:auto;right:24px;bottom:86px}.bmc-fab span{display:none}.bmc-fab{padding:12px}}' +
      '@media(prefers-reduced-motion:reduce){.su-cup,.su-steam,.su-glow,.bmc-fab{animation:none!important}}';
    document.head.appendChild(s);
  }
})();
