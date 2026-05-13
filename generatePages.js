import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(publicDir, 'index.html');

try {
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');


  const navEndIndex = indexHtml.indexOf('</nav>') + 6;
  const headerPart = indexHtml.substring(0, navEndIndex);
  const footerStartIndex = indexHtml.indexOf('<footer class="bloom-foot"');
  let footerPart = indexHtml.substring(footerStartIndex);

  const styleStart = indexHtml.indexOf('<style>');
  const styleEnd = indexHtml.indexOf('</style>') + 8;
  const indexStyles = indexHtml.substring(styleStart, styleEnd);

  const indexFonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Barlow+Condensed:ital,wght@0,700;0,900;1,700;1,900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap">`;

  const bloomBootStart = indexHtml.indexOf('<div id="bloomBoot"');
  const navStart = indexHtml.indexOf('<nav id="nav"');
  const indexNavPrefix = indexHtml.substring(bloomBootStart, navStart);
  const indexNav = indexHtml.substring(navStart, navEndIndex);

  const mobMenuStart = indexHtml.indexOf('<div class="mob-menu"');
  const dlvBarStart = indexHtml.indexOf('<div class="delivery-bar"');
  const indexMobMenu = indexHtml.substring(mobMenuStart, dlvBarStart);

  const footerEnd = indexHtml.indexOf('</footer>', footerStartIndex) + 9;
  const indexFooter = indexHtml.substring(footerStartIndex, footerEnd);

  const overlayStart = indexHtml.indexOf('<div class="overlay" id="exitMod"');
  const overlayEnd = indexHtml.indexOf('<div class="toast-con" id="toastCon"');
  const toastConEnd = indexHtml.indexOf('</div>', overlayEnd) + 6;
  const indexOverlays = indexHtml.substring(overlayStart, toastConEnd);

  const scriptStart = indexHtml.indexOf('<script src="https://cdn.jsdelivr.net/npm/motion@');
  const iifeStart = indexHtml.indexOf('<script>', scriptStart);
  const indexBaseScripts = indexHtml.substring(scriptStart, iifeStart);
  const indexLayoutScript = indexHtml.substring(iifeStart, indexHtml.lastIndexOf('</script>') + 9);

  const styleBlock = `\n<!-- BLOOM_STYLE_INJECT -->\n${indexFonts}\n${indexStyles}\n<!-- BLOOM_STYLE_END -->\n`;
  const navBlock = `\n<!-- BLOOM_NAV_INJECT -->\n${indexNavPrefix}\n${indexNav}\n${indexMobMenu}\n<!-- BLOOM_NAV_END -->\n`;

  const storeNavLinks = `
  <ul class="n-links" role="list">
    <li><a href="/catalog.html" data-label="shop" data-i18n="nav.shop">Shop</a></li>
    <li><a href="/customize.html" data-label="create" data-i18n="nav.custom">Create</a></li>
    <li><a href="/tracking.html" data-label="track" data-i18n="nav.track">Track</a></li>
    <li><a href="/support.html" data-label="support" data-i18n="nav.support">Support</a></li>
  </ul>`;

  const storeMobLinks = `
    <ul role="list">
      <li><a href="/catalog.html" data-i18n="nav.shop">Shop</a></li>
      <li><a href="/customize.html" data-i18n="nav.custom">Create</a></li>
      <li><a href="/tracking.html" data-i18n="nav.track">Track</a></li>
      <li><a href="/support.html" data-i18n="nav.support">Support</a></li>
    </ul>`;

  const storeNav = indexNav.replace(/<ul class="n-links"[\s\S]*?<\/ul>/, storeNavLinks);
  const storeMob = indexMobMenu.replace(/<ul role="list">[\s\S]*?<\/ul>/, storeMobLinks);
  const storeNavBlock = `\n<!-- BLOOM_NAV_INJECT -->\n${indexNavPrefix}\n${storeNav}\n${storeMob}\n<!-- BLOOM_NAV_END -->\n`;

  const baseScriptsBlock = `\n<!-- BLOOM_BASE_INJECT -->\n${indexBaseScripts}\n<!-- BLOOM_BASE_END -->\n`;
  const footBlock = `\n<!-- BLOOM_FOOT_INJECT -->\n${indexFooter}\n${indexOverlays}\n${indexLayoutScript}\n<!-- BLOOM_FOOT_END -->\n`;

  const pages = {
    'about.html': `
      <style>
      .hero-about{padding:160px 0 80px;text-align:center;position:relative}
      .hero-about::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;height:600px;background:radial-gradient(circle,rgba(230,26,26,.08),transparent 60%);pointer-events:none}
      .tag-team{display:inline-flex;align-items:center;gap:6px;font-family:var(--fc);font-style:italic;font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:4px 13px;border-radius:100px;margin-bottom:16px;background:rgba(230,26,26,.12);border:1px solid rgba(230,26,26,.3);color:var(--p5l)}
      .sec-title-large{font-family:var(--fd);font-size:clamp(2rem,4vw,3.2rem);font-weight:900;line-height:1.1;margin-bottom:20px}
      .sec-sub-about{font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.75;max-width:620px;margin:0 auto 48px}
      .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px;margin-bottom:80px}
      .team-card{background:var(--gl);border:1px solid var(--glb);border-radius:var(--rs);padding:28px;text-align:center;transition:transform .4s var(--ease),border-color .3s,box-shadow .4s}
      .team-card:hover{transform:translateY(-6px);border-color:rgba(230,26,26,.3);box-shadow:0 18px 50px rgba(168,16,16,.22)}
      .team-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,rgba(230,26,26,.2),rgba(188,49,148,.15));border:2px solid rgba(230,26,26,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:2rem}
      .team-name{font-family:var(--fd);font-size:1.05rem;font-weight:700;margin-bottom:4px}
      .team-role{font-family:var(--fc);font-style:italic;font-size:.72rem;color:var(--p5l);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px}
      .team-bio{font-size:.84rem;color:rgba(255,255,255,.56);line-height:1.7}
      .values-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;margin-bottom:80px}
      .value-card{background:var(--gl);border:1px solid var(--glb);border-radius:var(--rs);padding:28px;position:relative;overflow:hidden}
      .value-card::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(to bottom,var(--p5),var(--pk))}
      .value-icon{font-size:1.8rem;margin-bottom:14px}
      .value-title{font-family:var(--fd);font-size:1.1rem;font-weight:700;margin-bottom:10px}
      .value-desc{font-size:.84rem;color:rgba(255,255,255,.58);line-height:1.7}
      </style>
      <main>
        <section class="hero-about">
          <div class="con">
            <span class="tag-team">Our Team</span>
            <h1 class="sec-title-large">Built by students<br>who care about details.</h1>
            <p class="sec-sub-about">Bloom is a capstone project by BSIT students of STI College Lipa. Every pixel, every line of code, and every platform workflow was built from scratch - with the intent to ship a real product, not a classroom demo.</p>
          </div>
        </section>

        <section style="padding:0 0 80px">
          <div class="con">
            <div class="team-grid">
              <div class="team-card">
                <div class="team-avatar">👨‍💻</div>
                <div class="team-name">Team Lead</div>
                <div class="team-role">Full-Stack Developer</div>
                <p class="team-bio">Architected the entire platform - from the Express backend and SQLite data layer to the real-time WebSocket system and admin dashboard.</p>
              </div>
              <div class="team-card">
                <div class="team-avatar">🎨</div>
                <div class="team-name">UI/UX Designer</div>
                <div class="team-role">Frontend & Design</div>
                <p class="team-bio">Designed the dark-mode interface, accessibility features, micro-animations, and the responsive component system that works across all devices.</p>
              </div>
              <div class="team-card">
                <div class="team-avatar">📊</div>
                <div class="team-name">Project Manager</div>
                <div class="team-role">Documentation & QA</div>
                <p class="team-bio">Managed sprint planning, coordinated testing cycles, wrote the technical documentation, and ensured WCAG 2.1 AA conformance.</p>
              </div>
              <div class="team-card">
                <div class="team-avatar">🔧</div>
                <div class="team-name">Backend Developer</div>
                <div class="team-role">API & Database</div>
                <p class="team-bio">Built the REST API, cart engine, pricing system, authentication flows with bcrypt + JWT, and the real-time notification infrastructure.</p>
              </div>
            </div>
          </div>
        </section>

        <section style="padding:0 0 80px">
          <div class="con">
            <div style="text-align:center;margin-bottom:48px">
              <span class="tag-team" style="background:rgba(0,212,170,.1);border-color:rgba(0,212,170,.25);color:var(--mn)">Our Values</span>
              <h2 class="sec-title-large">What guides every decision.</h2>
            </div>
            <div class="values-grid">
              <div class="value-card">
                <div class="value-icon">❄️</div>
                <div class="value-title">Freshness First</div>
                <p class="value-desc">The platform is designed to model logistics guidelines, demonstrating workflow capabilities from order to handoff.</p>
              </div>
              <div class="value-card">
                <div class="value-icon">♿</div>
                <div class="value-title">Accessibility by Default</div>
                <p class="value-desc">WCAG 2.1 AA conformance target. Keyboard navigation, screen reader labels, reduced motion support, and 4.5:1 contrast ratios.</p>
              </div>
              <div class="value-card">
                <div class="value-icon">📸</div>
                <div class="value-title">Honest Delivery</div>
                <p class="value-desc">The system supports timestamped photo proof of delivery. It models resolution workflows for order discrepancies.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    `,
    'blog.html': `
      <style>
      .hero-b{padding:160px 0 60px;text-align:center}
      .tag-j{display:inline-flex;font-family:var(--fc);font-style:italic;font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:4px 13px;border-radius:100px;margin-bottom:16px;background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.3);color:#a78bfa}
      .sec-title-b{font-family:var(--fd);font-size:clamp(2rem,4vw,3rem);font-weight:900;margin-bottom:16px}
      .sec-sub-b{font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.75;max-width:560px;margin:0 auto}
      .blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;padding-bottom:80px}
      .bc-card{background:var(--gl);border:1px solid var(--glb);border-radius:var(--rs);overflow:hidden;transition:transform .4s var(--ease),border-color .3s,box-shadow .4s}
      .bc-card:hover{transform:translateY(-6px);border-color:rgba(230,26,26,.3);box-shadow:0 18px 50px rgba(168,16,16,.22)}
      .bi-img{height:200px;background:rgba(230,26,26,.08);display:flex;align-items:center;justify-content:center;font-size:3rem}
      .bb-body{padding:24px}
      .bt-tag{font-family:var(--fc);font-style:italic;font-size:.68rem;color:var(--p5l);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
      .bn-title{font-family:var(--fd);font-size:1.15rem;font-weight:700;margin-bottom:10px;line-height:1.3}
      .bd-desc{font-size:.84rem;color:rgba(255,255,255,.56);line-height:1.7;margin-bottom:14px}
      .bm-meta{font-size:.72rem;color:rgba(255,255,255,.35)}
      </style>
      <main>
        <section class="hero-b"><div class="con"><span class="tag-j">Journal</span><h1 class="sec-title-b">Stories from the studio.</h1><p class="sec-sub-b">Behind-the-scenes, care guides, and the craft of making flowers mean something.</p></div></section>
        <section><div class="con"><div class="blog-grid">
          <article class="bc-card"><div class="bi-img">🌹</div><div class="bb-body"><div class="bt-tag">Care Guide</div><h2 class="bn-title">How to keep your bouquet fresh for 14 days</h2><p class="bd-desc">Cold water, diagonal cuts, and the 0-4°C rule. Our florists share the exact postharvest science behind lasting arrangements.</p><div class="bm-meta">April 2026 · 4 min read</div></div></article>
          <article class="bc-card"><div class="bi-img">❄️</div><div class="bb-body"><div class="bt-tag">Behind the Scenes</div><h2 class="bn-title">Logistics tracking: Modeling the supply chain</h2><p class="bd-desc">A look at how the Bloom platform models order tracking across simulated supply chain hubs.</p><div class="bm-meta">March 2026 · 6 min read</div></div></article>
          <article class="bc-card"><div class="bi-img">💼</div><div class="bb-body"><div class="bt-tag">Corporate</div><h2 class="bn-title">Why companies are switching to flower subscriptions</h2><p class="bd-desc">40 branded bouquets, one invoice. How Bloom corporate orders simplify team appreciation at scale.</p><div class="bm-meta">March 2026 · 3 min read</div></div></article>
          <article class="bc-card"><div class="bi-img">♿</div><div class="bb-body"><div class="bt-tag">Accessibility</div><h2 class="bn-title">Building an e-commerce site for everyone</h2><p class="bd-desc">How we achieved WCAG 2.1 AA conformance - keyboard navigation, screen readers, and reduced-motion support.</p><div class="bm-meta">February 2026 · 5 min read</div></div></article>
          <article class="bc-card"><div class="bi-img">🌸</div><div class="bb-body"><div class="bt-tag">Craft</div><h2 class="bn-title">The art of the hand-tied bouquet</h2><p class="bd-desc">A spiral technique passed down through generations. Our florists explain the mechanics behind every wrap.</p><div class="bm-meta">January 2026 · 4 min read</div></div></article>
          <article class="bc-card"><div class="bi-img">📸</div><div class="bb-body"><div class="bt-tag">Trust</div><h2 class="bn-title">Photo proof: the promise behind every delivery</h2><p class="bd-desc">Why we photograph every delivery at the door and how it holds us accountable to the bouquet we quoted.</p><div class="bm-meta">January 2026 · 3 min read</div></div></article>
        </div></div></section>
      </main>
    `,
    'contact.html': `
      <style>
      .hero-c{padding:160px 0 40px;text-align:center}
      .tag-c{display:inline-flex;font-family:var(--fc);font-style:italic;font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:4px 13px;border-radius:100px;margin-bottom:16px;background:rgba(230,26,26,.12);border:1px solid rgba(230,26,26,.3);color:var(--p5l)}
      .sec-title-c{font-family:var(--fd);font-size:clamp(2rem,4vw,3rem);font-weight:900;margin-bottom:16px}
      .sec-sub-c{font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.75;max-width:560px;margin:0 auto 40px}
      .cg-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:60px}
      @media(max-width:700px){.cg-grid{grid-template-columns:1fr}}
      .cc-card{background:var(--gl);border:1px solid var(--glb);border-radius:var(--rs);padding:28px;transition:border-color .3s,box-shadow .4s}
      .cc-card:hover{border-color:rgba(230,26,26,.3);box-shadow:0 12px 40px rgba(168,16,16,.18)}
      .ci-icon{font-size:1.6rem;margin-bottom:12px}
      .cl-label{font-family:var(--fc);font-style:italic;font-size:.72rem;color:var(--p5l);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
      .cv-val{font-size:.95rem;color:rgba(255,255,255,.8);line-height:1.6}
      .cv-val a{color:var(--p5l);border-bottom:1px dotted rgba(230,26,26,.3)}
      .cv-val a:hover{color:#fff}
      .fc-box{background:var(--gl);border:1px solid var(--glb);border-radius:var(--rs);padding:36px;margin-bottom:80px}
      .fi-wrap{margin-bottom:16px}
      .fi-wrap label{display:block;font-size:.78rem;color:rgba(255,255,255,.6);margin-bottom:6px;font-weight:500}
      .fi-wrap input,.fi-wrap textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--glb);border-radius:12px;padding:11px 14px;color:#fff;font-size:.9rem;font-family:inherit;outline:none;transition:border-color .2s}
      .fi-wrap input:focus,.fi-wrap textarea:focus{border-color:var(--p5);box-shadow:0 0 0 3px rgba(230,26,26,.12)}
      .fi-wrap textarea{resize:vertical;min-height:120px}
      .bp-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 28px;border-radius:12px;font-size:.9rem;font-weight:600;background:linear-gradient(135deg,var(--p5d),var(--p5));color:#fff;border:none;cursor:pointer;font-family:inherit;transition:transform .2s,box-shadow .2s}
      .bp-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(230,26,26,.5)}
      .t-toast{position:fixed;bottom:24px;right:24px;z-index:99999;padding:14px 22px;border-radius:12px;font-size:.88rem;font-weight:600;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.4);opacity:0;transform:translateY(10px);transition:all .3s;pointer-events:none}
      .t-toast.show{opacity:1;transform:none}
      </style>
      <main>
        <section class="hero-c"><div class="con"><span class="tag-c">Reach Out</span><h1 class="sec-title-c">We'd love to hear from you.</h1><p class="sec-sub-c">Whether it's a question about an order, a corporate inquiry, or just a kind word — we're here.</p></div></section>
        <section><div class="con">
          <div class="cg-grid">
            <div class="cc-card"><div class="ci-icon">📧</div><div class="cl-label">Email</div><div class="cv-val"><a href="mailto:hello@bloom.ph">hello@bloom.ph</a></div></div>
            <div class="cc-card"><div class="ci-icon">💬</div><div class="cl-label">Viber / WhatsApp</div><div class="cv-val">+63 XXX XXX XXXX</div></div>
            <div class="cc-card"><div class="ci-icon">📍</div><div class="cl-label">Office</div><div class="cv-val">STI College Lipa<br>Lipa City, Batangas, PH</div></div>
            <div class="cc-card"><div class="ci-icon">🕐</div><div class="cl-label">Hours</div><div class="cv-val">Mon – Sun, 8AM – 8PM PHT</div></div>
          </div>
          <div class="fc-box"><h2 style="font-family:var(--fd);font-size:1.3rem;font-weight:700;margin-bottom:20px">Send a message</h2><form id="cf"><div class="fi-wrap"><label for="cN">Name</label><input type="text" id="cN" placeholder="Your name" required></div><div class="fi-wrap"><label for="cE">Email</label><input type="email" id="cE" placeholder="you@example.com" required></div><div class="fi-wrap"><label for="cS">Subject</label><input type="text" id="cS" placeholder="Order question, corporate inquiry..."></div><div class="fi-wrap"><label for="cM">Message</label><textarea id="cM" placeholder="Tell us what's on your mind..." required></textarea></div><button type="submit" class="bp-btn" style="width:100%">Send Message →</button></form></div>
        </div></section>
      </main>
      <div class="t-toast" id="t-toast"></div>
      <script>
      document.addEventListener('DOMContentLoaded', function() {
        var form = document.getElementById('cf');
        if (form) {
          form.addEventListener('submit', function(e) {
            e.preventDefault();
            var t = document.getElementById('t-toast');
            if (t) {
              t.textContent = "Message sent! We'll reply within 24 hours. 🌸";
              t.style.background = '#22c55e';
              t.classList.add('show');
              this.reset();
              setTimeout(function() { t.classList.remove('show'); }, 4000);
            }
          });
        }
      });
      </script>
    `,
    'shipping.html': `
      <style>
      .hero-ship{padding:160px 0 40px;text-align:center}
      .tag-ship{display:inline-flex;font-family:var(--fc);font-style:italic;font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:4px 13px;border-radius:100px;margin-bottom:16px;background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.25);color:var(--mn)}
      .sec-title-s{font-family:var(--fd);font-size:clamp(2rem,4vw,3rem);font-weight:900;margin-bottom:16px}
      .sec-sub-s{font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.75;max-width:560px;margin:0 auto 48px}
      .sc-box{background:var(--gl);border:1px solid var(--glb);border-radius:var(--rs);padding:28px;margin-bottom:20px;position:relative;overflow:hidden}
      .sc-box::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(to bottom,var(--p5),var(--pk))}
      .sh-title{font-family:var(--fd);font-size:1.1rem;font-weight:700;margin-bottom:12px;padding-left:12px}
      .sp-desc{font-size:.88rem;color:rgba(255,255,255,.62);line-height:1.75;padding-left:12px}
      .tbl-log{width:100%;border-collapse:collapse;margin:12px 0 0 12px;font-size:.84rem}
      .tbl-log th{text-align:left;padding:10px 14px;background:rgba(230,26,26,.1);border:1px solid rgba(255,255,255,.06);color:var(--p5l);font-family:var(--fc);font-style:italic;letter-spacing:.08em;text-transform:uppercase;font-weight:700;font-size:.74rem}
      .tbl-log td{padding:10px 14px;border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.7)}
      </style>
      <main>
        <section class="hero-ship"><div class="con"><span class="tag-ship">Logistics</span><h1 class="sec-title-s">Shipping & Delivery</h1><p class="sec-sub-s">The platform models comprehensive logistics tracking, demonstrating order progression from preparation to delivery.</p></div></section>
        <section><div class="con">
          <div class="sc-box"><h2 class="sh-title">Delivery Areas</h2><p class="sp-desc">We deliver to Metro Manila, Batangas, Cavite, Laguna, Rizal, Bulacan, Pampanga, Cebu City, and Baguio. More regions are being added quarterly.</p></div>
          <div class="sc-box"><h2 class="sh-title">Lead Times</h2><table class="tbl-log"><thead><tr><th>Area</th><th>Standard</th><th>Express</th></tr></thead><tbody><tr><td>Metro Manila</td><td>48 hours</td><td>24 hours (+₱350)</td></tr><tr><td>Batangas / Cavite / Laguna</td><td>48 hours</td><td>24 hours (+₱450)</td></tr><tr><td>Cebu City</td><td>72 hours</td><td>48 hours (+₱500)</td></tr><tr><td>Baguio / Pampanga / Bulacan</td><td>72 hours</td><td>48 hours (+₱450)</td></tr></tbody></table></div>
          <div class="sc-box"><h2 class="sh-title">Delivery Windows</h2><p class="sp-desc">Choose a 1-hour delivery window at checkout, including evening slots (6-9 PM). The selected time is locked at checkout - it's our contract with you.</p></div>
          <div class="sc-box"><h2 class="sh-title">Cold-Chain Handling</h2><p class="sp-desc">All bouquets are maintained at 0-4°C from harvest through our hub to the delivery vehicle. Insulated packaging ensures temperature compliance throughout transit, per UC Davis postharvest guidelines.</p></div>
          <div class="sc-box"><h2 class="sh-title">Free Shipping</h2><p class="sp-desc">Orders above ₱4,200 ship free. Below that threshold, a flat ₱560 delivery fee applies. Subscription orders always ship free.</p></div>
          <div class="sc-box"><h2 class="sh-title">Photo Proof of Delivery</h2><p class="sp-desc">Every delivery is documented with a timestamped photo at the recipient's location. You'll receive this in your order confirmation email within 15 minutes of delivery.</p></div>
        </div></section>
      </main>
    `,
    'returns.html': `
      <style>
      .hero-ret{padding:160px 0 40px;text-align:center}
      .tag-ret{display:inline-flex;font-family:var(--fc);font-style:italic;font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:4px 13px;border-radius:100px;margin-bottom:16px;background:rgba(230,26,26,.12);border:1px solid rgba(230,26,26,.3);color:var(--p5l)}
      .sec-title-r{font-family:var(--fd);font-size:clamp(2rem,4vw,3rem);font-weight:900;margin-bottom:16px}
      .sec-sub-r{font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.75;max-width:580px;margin:0 auto 48px}
      .rc-box{background:var(--gl);border:1px solid var(--glb);border-radius:var(--rs);padding:28px;margin-bottom:20px;position:relative;overflow:hidden}
      .rc-box::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(to bottom,var(--p5),var(--pk))}
      .rh-title{font-family:var(--fd);font-size:1.1rem;font-weight:700;margin-bottom:12px;padding-left:12px}
      .rp-desc{font-size:.88rem;color:rgba(255,255,255,.62);line-height:1.75;padding-left:12px}
      </style>
      <main>
        <section class="hero-ret"><div class="con"><span class="tag-ret">Promise</span><h1 class="sec-title-r">Our Service Promise</h1><p class="sec-sub-r">We don't just deliver flowers. We deliver on our word. If something goes wrong, here's exactly what we do.</p></div></section>
        <section><div class="con">
          <div class="rc-box"><h2 class="rh-title">🌹 Tracking Integration</h2><p class="rp-desc">The Bloom platform is designed to track cold-chain logistics from harvest to delivery. Built to demonstrate automated issue resolution and processing for order anomalies.</p></div>
          <div class="rc-box"><h2 class="rh-title">📸 Photo Proof</h2><p class="rp-desc">The system supports timestamped photo proof of delivery uploads. It models discrepancy resolutions to demonstrate end-to-end order accountability.</p></div>
          <div class="rc-box"><h2 class="rh-title">⏰ On-Time Delivery</h2><p class="rp-desc">The platform tracks chosen 1-hour delivery windows. It models compensation workflows for simulated late deliveries to demonstrate robust customer service logic.</p></div>
          <div class="rc-box"><h2 class="rh-title">💬 Responsive Support</h2><p class="rp-desc">Reach us via live chat, email, or Viber. Our support team responds within 2 hours during operating hours (8 AM-8 PM PHT, 7 days a week). Urgent delivery issues are escalated immediately.</p></div>
          <div class="rc-box"><h2 class="rh-title">↩️ Issue Resolution</h2><p class="rp-desc">The platform integrates support ticketing to facilitate issue resolution models, including automated remakes and refund workflows. We handle the return logistics if needed.</p></div>
          <div class="rc-box"><h2 class="rh-title">🔒 Secure Transactions</h2><p class="rp-desc">All payments are processed over HTTPS with transport-layer encryption. Passwords are hashed with bcrypt. Sessions use HTTP-only JWT cookies with CSRF protection. Your data is never shared with third parties.</p></div>
        </div></section>
      </main>
    `,
    'privacy.html': `
      <main class="con sec-pad" style="padding-top: 140px; position: relative; min-height: 100vh; overflow: hidden;">
        <div class="hero-orb hero-orb-1" style="opacity: 0.15;"></div>
        <div class="hero-orb hero-orb-2" style="opacity: 0.1;"></div>
        <div class="p5-glow" style="top: 20%; right: 10%; opacity: 0.3;"></div>
        
        <div style="position: relative; z-index: 10;">
          <header style="text-align: center; margin-bottom: 64px;">
            <span class="tag tag-p shimmer" style="letter-spacing: 0.2em;">COMMERCE TRANSPARENCY</span>
            <h1 class="sec-title" style="font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 900; margin-bottom: 16px; background: linear-gradient(135deg, #fff 30%, var(--p5) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 4px 20px rgba(230,26,26,0.1);">
              Privacy Policy
            </h1>
            <p style="font-family: var(--fc); font-style: italic; color: var(--p5l); letter-spacing: 0.1em; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 24px;">
              Last updated: March 22, 2026 &nbsp;|&nbsp; Compliant with RA 10173 (Data Privacy Act)
            </p>
            <div class="p5-line-h" style="max-width: 120px;"></div>
          </header>

          <section class="glass-ethereal shimmer" style="border-radius: 24px; padding: clamp(24px, 5vw, 48px); margin-bottom: 48px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: linear-gradient(135deg, rgba(230,26,26,0.05), rgba(255,255,255,0.03)); backdrop-filter: blur(24px);">
            <div style="position: absolute; top: -30px; right: -30px; font-size: 12rem; opacity: 0.03; font-family: var(--fd); font-weight: 900; font-style: italic; user-select: none; pointer-events: none; color: var(--p5);">
              Promise
            </div>
            <h2 style="font-family: var(--fd); font-size: 1.8rem; font-weight: 700; color: #fff; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
              <span style="color: var(--p5);">❖</span> Our Privacy Promise
            </h2>
            <p style="font-size: 1.15rem; line-height: 1.8; color: rgba(255,255,255,0.85); text-wrap: pretty;">
              At Bloom, our relationship with you is rooted in trust. We believe your recipient details, floral gift messages, and custom 3D configurations belong strictly to you. We collect only what is necessary to handcraft, package, and safely deliver your moments of warmth. <span style="color: var(--p5l); font-weight: 600;">You retain complete ownership over your personal data.</span>
            </p>
          </section>

          <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 64px;">
            
            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px); transition: transform 0.3s var(--spring), border-color 0.3s;">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">01.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Information We Collect</h3>
              </header>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 16px; color: rgba(255,255,255,0.75); font-size: 0.95rem;">
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Account Profile:</strong> Email address, billing name, delivery contact number, and hashed credentials.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Customization Data:</strong> Saved 3D bouquet configurations, arrangement metadata, and personalized gift messages.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Logistics & Fulfillment:</strong> Recipient name, precise physical delivery coordinates, and timing windows.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Financial Security:</strong> Payments are securely processed via PayMongo (PCI-DSS compliant). Bloom never ingests or stores card numbers.</li>
              </ul>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px);">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">02.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">How We Protect Your Data</h3>
              </header>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 16px; color: rgba(255,255,255,0.75); font-size: 0.95rem;">
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Encrypted Pipeline:</strong> Standard TLS encryption in transit and AES-256 protection for data at rest.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Access Containment:</strong> Delivery details are strictly restricted to active logistics coordinators during your chosen arrival window.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Data Minimization:</strong> Recipient contact details are masked on dispatch sheets within 72 hours of successful delivery.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">PH Localization:</strong> Our database infrastructure complies with Philippine statutory data localization protocols.</li>
              </ul>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px);">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">03.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">3D Renders & Local Cache</h3>
              </header>
              <p style="line-height: 1.7; color: rgba(255,255,255,0.75); font-size: 0.95rem; text-wrap: pretty;">
                To deliver a sub-second, low-latency 3D arrangement experience, Bloom utilizes local browser caching (IndexedDB) to store lightweight flower geometry and textures. These visual assets reside strictly on your local device and are never compiled into cross-platform advertising profiles.
              </p>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px);">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">04.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Data Deletion Rights</h3>
              </header>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 16px; color: rgba(255,255,255,0.75); font-size: 0.95rem;">
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Cart Expulsion:</strong> Unfinished orders are automatically cleared from active database memory after 14 days of inactivity.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Account Terminations:</strong> Account deletion requests result in full erasure of your profile credentials within 30 days.</li>
                <li><strong style="color: #fff; display: block; margin-bottom: 4px;">Regulatory Backups:</strong> Transactional records are securely maintained as mandated by BIR accounting regulations.</li>
              </ul>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px);">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">05.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Non-Distribution Guarantee</h3>
              </header>
              <p style="line-height: 1.7; color: rgba(255,255,255,0.75); font-size: 0.95rem; text-wrap: pretty;">
                We will never sell, lease, or share your personal contact lists or recipient information with third-party marketing services. We share data exclusively with verified logistics partners solely to execute physical fulfillment.
              </p>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px);">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">06.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Functional Cookies</h3>
              </header>
              <p style="line-height: 1.7; color: rgba(255,255,255,0.75); font-size: 0.95rem; text-wrap: pretty;">
                We employ strictly essential session cookies to facilitate cart memory, maintain persistent login authorization, and honor your localized language selection. No advertising or tracking pixels are installed.
              </p>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px);">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">07.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Your Rights (RA 10173)</h3>
              </header>
              <p style="line-height: 1.7; color: rgba(255,255,255,0.75); font-size: 0.95rem; text-wrap: pretty; margin-bottom: 12px;">
                Under the Data Privacy Act of 2012, you possess absolute rights to be informed, access your information, correct inaccuracies, erase outdated records, object to processing, and secure data portability.
              </p>
              <p style="font-size: 0.95rem;">
                Contact: <a href="mailto:hello@bloom.ph" style="color: var(--p5l); font-weight: 600; border-bottom: 1px dotted var(--p5); transition: color 0.2s;">hello@bloom.ph</a>
              </p>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: clamp(20px, 4vw, 32px); border: 1.5px solid rgba(230,26,26,0.2); background: linear-gradient(135deg, rgba(230,26,26,0.08), rgba(255,255,255,0.03));">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid rgba(230,26,26,0.2); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">08.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Compliance Office</h3>
              </header>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px; color: rgba(255,255,255,0.8); font-size: 0.95rem;">
                <li><strong>Data Protection:</strong> Bloom Security Team</li>
                <li><strong>Inquiries:</strong> <a href="mailto:hello@bloom.ph" style="color: var(--p5l); font-weight: 600; border-bottom: 1px dotted var(--p5);">hello@bloom.ph</a></li>
                <li><strong>Campus Center:</strong> STI College Lipa BSIT Innovation Lab</li>
              </ul>
            </article>
          </section>

          <footer style="text-align: center; margin-top: 64px; padding: clamp(24px, 5vw, 32px); border-top: 1px solid var(--glb);">
            <h4 style="font-family: var(--fd); font-size: 1.4rem; font-weight: 900; letter-spacing: 0.05em; color: #fff; text-transform: uppercase; margin-bottom: 12px;">
              BLOOM BOTANICAL COMMERCE
            </h4>
            <p style="font-family: var(--fc); font-style: italic; color: rgba(255,255,255,0.4); letter-spacing: 0.15em; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 24px;">
              Lipa City, Batangas, Philippines
            </p>
            <div style="display: flex; align-items: center; justify-content: center; gap: 24px;">
              <a href="/about.html" style="font-size: 0.85rem; color: rgba(255,255,255,0.5); text-decoration: underline; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">About</a>
              <span style="color: var(--glb);">|</span>
              <a href="/" style="font-size: 0.85rem; color: rgba(255,255,255,0.5); text-decoration: underline; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">Home</a>
            </div>
          </footer>
        </div>
      </main>
    `
  };

  for (const [filename, content] of Object.entries(pages)) {
    const fullHtml = headerPart + indexMobMenu + content + footerPart;
    fs.writeFileSync(path.join(publicDir, filename), fullHtml, 'utf-8');
    console.log('Generated:', filename);
  }

  const storePages = [
    'catalog.html',
    'customize.html',
    'cart.html',
    'checkout.html',
    'tracking.html',
    'confirmation.html',
    'support.html',
    'profile.html'
  ];

  function syncPageLayout(filename) {
    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Skipping sync: ${filename} (file not found)`);
      return;
    }

    let html = fs.readFileSync(filePath, 'utf-8');



    html = html.replace(/\s*<!-- BLOOM_STYLE_INJECT -->[\s\S]*?<!-- BLOOM_STYLE_END -->\s*/g, '\n');
    html = html.replace(/\s*<!-- BLOOM_NAV_INJECT -->[\s\S]*?<!-- BLOOM_NAV_END -->\s*/g, '\n');
    html = html.replace(/\s*<!-- BLOOM_BASE_INJECT -->[\s\S]*?<!-- BLOOM_BASE_END -->\s*/g, '\n');
    html = html.replace(/\s*<!-- BLOOM_FOOT_INJECT -->[\s\S]*?<!-- BLOOM_FOOT_END -->\s*/g, '\n');



    html = html.replace(/<nav\s+class="bloom-nav"[^>]*>[\s\S]*?<\/nav>/gi, '');
    html = html.replace(/<footer\s+class="bloom-footer"[^>]*>[\s\S]*?<\/footer>/gi, '');
    html = html.replace(/<div\s+id="bloomBoot"[^>]*>[\s\S]*?<\/div>\s*<div\s+id="bloomBoot"[^>]*>[\s\S]*?<\/div>/gi, '');



    if (html.includes('<!-- BLOOM_STYLE_INJECT -->')) {
      html = html.replace('<!-- BLOOM_STYLE_INJECT -->', `<!-- BLOOM_STYLE_INJECT -->\n${indexFonts}\n`);
    } else {
      html = html.replace('</head>', `${styleBlock}</head>`);
    }



    if (html.includes('<!-- BLOOM_NAV_INJECT -->')) {
      html = html.replace('<!-- BLOOM_NAV_INJECT -->', `<!-- BLOOM_NAV_INJECT -->\n${indexNavPrefix}\n${storeNav}\n${storeMob}\n`);
    } else {
      const bodyMatch = html.match(/<body[^>]*>/i);
      if (bodyMatch) html = html.replace(bodyMatch[0], `${bodyMatch[0]}${storeNavBlock}`);
    }



    const storeFootBlock = `\n<!-- BLOOM_FOOT_INJECT -->\n${indexFooter}\n${indexOverlays}\n<script>
    (function(){
      var b=document.getElementById('bloomBoot');
      if(b){
        var h=function(){b.classList.add('gone');setTimeout(function(){b.style.display='none'},700)};
        if(document.readyState==='complete')setTimeout(h,400);
        else window.addEventListener('load',function(){setTimeout(h,400)});
        setTimeout(h,4500);
      }
      var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear();
    })();
    </script>\n<!-- BLOOM_FOOT_END -->\n`;

    if (html.includes('<!-- BLOOM_FOOT_INJECT -->')) {
      html = html.replace('<!-- BLOOM_FOOT_INJECT -->', storeFootBlock);
    } else {
      html = html.replace('</body>', `${storeFootBlock}</body>`);
    }

    fs.writeFileSync(filePath, html, 'utf-8');
    console.log('✅ Synchronized layout:', filename);
  }

  console.log('\n--- Initiating Global Storefront Layout Synchronization ---');
  for (const file of storePages) {
    syncPageLayout(file);
  }
  console.log('--- All Application Pages Synchronized! ---\n');

} catch (err) {

  console.error('❌ Failed to generate dynamic pages:', err);
  process.exit(1);
}
