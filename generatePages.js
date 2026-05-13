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

  // ---------------- Centralized Layout Component Extraction ----------------
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

  // Wrap modules in unique idempotent HTML bounded tags
  const styleBlock = `\n<!-- BLOOM_STYLE_INJECT -->\n${indexFonts}\n${indexStyles}\n<!-- BLOOM_STYLE_END -->\n`;
  const navBlock = `\n<!-- BLOOM_NAV_INJECT -->\n${indexNavPrefix}\n${indexNav}\n<!-- BLOOM_NAV_END -->\n`;
  const baseScriptsBlock = `\n<!-- BLOOM_BASE_INJECT -->\n${indexBaseScripts}\n<!-- BLOOM_BASE_END -->\n`;
  const footBlock = `\n<!-- BLOOM_FOOT_INJECT -->\n${indexFooter}\n${indexOverlays}\n${indexLayoutScript}\n<!-- BLOOM_FOOT_END -->\n`;

  const pages = {
    'about.html': `
      <main class="con sec-pad" style="padding-top: 140px; min-height: 70vh;">
        <h1 class="sec-title" style="margin-bottom: 24px; color: var(--p5);">Our Team</h1>
        <p class="sec-sub" style="font-size: 1.1rem; max-width: 800px; color: rgba(255,255,255,0.8);">
          Bloom was conceptualized, designed, and developed entirely by the Bachelor of Science in Information Technology (BSIT) students at <strong>STI College Lipa</strong>.
        </p>
        <p class="sec-sub" style="max-width: 800px; margin-top: 20px;">
          As our Capstone Project, we aimed to solve real-world e-commerce challenges by building a comprehensive, accessible, and performant platform for floral delivery. Every line of code, from the secure JWT authentication to the Persona 5 inspired UI, reflects our dedication to software engineering excellence.
        </p>
        <div style="margin-top: 40px; padding: 20px; background: rgba(255,255,255,0.05); border-left: 4px solid var(--p5); border-radius: 8px;">
          <h3 style="margin-bottom: 10px;">Project Details</h3>
          <ul style="list-style: none; color: rgba(255,255,255,0.7); line-height: 1.8;">
            <li><strong>Institution:</strong> STI College Lipa</li>
            <li><strong>Program:</strong> BS in Information Technology</li>
            <li><strong>Focus:</strong> E-Commerce, UX/UI Design, Secure Web APIs</li>
          </ul>
        </div>
      </main>
    `,
    'blog.html': `
      <main class="con sec-pad" style="padding-top: 140px; min-height: 70vh;">
        <h1 class="sec-title" style="margin-bottom: 24px; color: var(--p5);">Journal</h1>
        <p class="sec-sub" style="font-size: 1.1rem; max-width: 800px; color: rgba(255,255,255,0.8);">
          Chronicles of our development journey at STI College Lipa.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 40px;">
          <article style="padding: 24px; background: var(--gl); border: 1px solid var(--glb); border-radius: 12px;">
            <div style="font-size: 0.8rem; color: var(--p5); margin-bottom: 10px;">Phase 1</div>
            <h3 style="margin-bottom: 10px;">Architecting the Backend</h3>
            <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Designing the SQLite database schema and implementing secure JWT authentication middlewares for robust user management.</p>
          </article>
          <article style="padding: 24px; background: var(--gl); border: 1px solid var(--glb); border-radius: 12px;">
            <div style="font-size: 0.8rem; color: var(--p5); margin-bottom: 10px;">Phase 2</div>
            <h3 style="margin-bottom: 10px;">Thematic UI Integration</h3>
            <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Applying the high-contrast, edgy aesthetic inspired by modern RPGs, ensuring deep reds and pure blacks remain WCAG 2.1 AA accessible.</p>
          </article>
        </div>
      </main>
    `,
    'contact.html': `
      <main class="con sec-pad" style="padding-top: 140px; min-height: 70vh;">
        <h1 class="sec-title" style="margin-bottom: 24px; color: var(--p5);">Contact Us</h1>
        <p class="sec-sub" style="font-size: 1.1rem; max-width: 800px; color: rgba(255,255,255,0.8);">
          Have questions about the Bloom platform or our Capstone project? Reach out to the development team.
        </p>
        <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <form style="display: flex; flex-direction: column; gap: 16px;">
            <input type="text" placeholder="Your Name" style="padding: 12px; background: var(--gl); border: 1px solid var(--glb); color: white; border-radius: 8px;" required>
            <input type="email" placeholder="Your Email" style="padding: 12px; background: var(--gl); border: 1px solid var(--glb); color: white; border-radius: 8px;" required>
            <textarea placeholder="Your Message" rows="5" style="padding: 12px; background: var(--gl); border: 1px solid var(--glb); color: white; border-radius: 8px;" required></textarea>
            <button type="submit" class="btn btn-p" style="align-self: flex-start;">Send Message</button>
          </form>
          <div>
            <h3 style="margin-bottom: 16px; color: var(--p5);">STI College Lipa</h3>
            <p style="color: rgba(255,255,255,0.6); margin-bottom: 8px;">BSIT Capstone Development Team</p>
            <p style="color: rgba(255,255,255,0.6); margin-bottom: 8px;">Lipa City, Batangas, Philippines</p>
            <p style="color: rgba(255,255,255,0.6);">Email: capstone.bloom@edu.ph</p>
          </div>
        </div>
      </main>
    `,
    'shipping.html': `
      <main class="con sec-pad" style="padding-top: 140px; min-height: 70vh;">
        <h1 class="sec-title" style="margin-bottom: 24px; color: var(--p5);">Shipping & Delivery</h1>
        <p class="sec-sub" style="font-size: 1.1rem; max-width: 800px; color: rgba(255,255,255,0.8);">
          Simulated logistics network for the Bloom Capstone Project.
        </p>
        <div style="margin-top: 40px; max-width: 800px; color: rgba(255,255,255,0.7); line-height: 1.8;">
          <h3 style="color: white; margin-bottom: 12px; margin-top: 24px;">Cold-Chain Simulation</h3>
          <p>Our platform simulates a cold-chain logistics network, tracking the temperature and state of orders from our hypothetical distribution centers to the end user. This allows us to demonstrate advanced order tracking logic in the user dashboard.</p>
          
          <h3 style="color: white; margin-bottom: 12px; margin-top: 24px;">Delivery Zones</h3>
          <p>The system is programmed to calculate shipping rates based on geographical zones within the Philippines, specifically targeting Metro Manila and the CALABARZON region for next-day delivery simulations.</p>
        </div>
      </main>
    `,
    'returns.html': `
      <main class="con sec-pad" style="padding-top: 140px; min-height: 70vh;">
        <h1 class="sec-title" style="margin-bottom: 24px; color: var(--p5);">Service Promise</h1>
        <p class="sec-sub" style="font-size: 1.1rem; max-width: 800px; color: rgba(255,255,255,0.8);">
          Our commitment to software quality and user experience.
        </p>
        <div style="margin-top: 40px; max-width: 800px; color: rgba(255,255,255,0.7); line-height: 1.8;">
          <p>As developers from STI College Lipa, our service promise is to deliver a Capstone project that is free from critical defects, highly performant, and perfectly aligned with WCAG 2.1 AA accessibility standards.</p>
          <ul style="margin-top: 20px; padding-left: 20px;">
            <li style="margin-bottom: 10px;"><strong>Accessibility First:</strong> Full screen-reader support, keyboard navigation, and high-contrast compliance.</li>
            <li style="margin-bottom: 10px;"><strong>Performance:</strong> Sub-second Time to Interactive (TTI) via optimized assets and Service Worker caching.</li>
            <li style="margin-bottom: 10px;"><strong>Reliability:</strong> Robust error boundaries and fallback mechanisms ensuring the platform never crashes gracefully.</li>
          </ul>
        </div>
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

          <section class="glass-ethereal shimmer" style="border-radius: 24px; padding: 48px; margin-bottom: 48px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: linear-gradient(135deg, rgba(230,26,26,0.05), rgba(255,255,255,0.03)); backdrop-filter: blur(24px);">
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

          <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 28px; margin-bottom: 64px;">
            
            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px; transition: transform 0.3s var(--spring), border-color 0.3s;">
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

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px;">
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

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px;">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">03.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">3D Renders & Local Cache</h3>
              </header>
              <p style="line-height: 1.7; color: rgba(255,255,255,0.75); font-size: 0.95rem; text-wrap: pretty;">
                To deliver a sub-second, low-latency 3D arrangement experience, Bloom utilizes local browser caching (IndexedDB) to store lightweight flower geometry and textures. These visual assets reside strictly on your local device and are never compiled into cross-platform advertising profiles.
              </p>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px;">
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

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px;">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">05.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Non-Distribution Guarantee</h3>
              </header>
              <p style="line-height: 1.7; color: rgba(255,255,255,0.75); font-size: 0.95rem; text-wrap: pretty;">
                We will never sell, lease, or share your personal contact lists or recipient information with third-party marketing services. We share data exclusively with verified logistics partners solely to execute physical fulfillment.
              </p>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px;">
              <header style="margin-bottom: 20px; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--glb); padding-bottom: 12px;">
                <span style="font-family: var(--fc); font-size: 1.5rem; font-weight: 900; color: var(--p5); font-style: italic;">06.</span>
                <h3 style="font-family: var(--fd); font-size: 1.25rem; font-weight: 700; color: #fff;">Functional Cookies</h3>
              </header>
              <p style="line-height: 1.7; color: rgba(255,255,255,0.75); font-size: 0.95rem; text-wrap: pretty;">
                We employ strictly essential session cookies to facilitate cart memory, maintain persistent login authorization, and honor your localized language selection. No advertising or tracking pixels are installed.
              </p>
            </article>

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px;">
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

            <article class="glass-ethereal p5-tilt" style="border-radius: 20px; padding: 32px; border: 1.5px solid rgba(230,26,26,0.2); background: linear-gradient(135deg, rgba(230,26,26,0.08), rgba(255,255,255,0.03));">
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

          <footer style="text-align: center; margin-top: 64px; padding: 32px; border-top: 1px solid var(--glb);">
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
    const fullHtml = headerPart + content + footerPart;
    fs.writeFileSync(path.join(publicDir, filename), fullHtml, 'utf-8');
    console.log('Generated:', filename);
  }

  // ---------------- Idempotent Layout Synchronization for Special Application Pages ----------------
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

    // 1. Clean previously injected blocks to ensure strict idempotency (swallows surrounding whitespace)
    html = html.replace(/\s*<!-- BLOOM_STYLE_INJECT -->[\s\S]*?<!-- BLOOM_STYLE_END -->\s*/g, '\n');
    html = html.replace(/\s*<!-- BLOOM_NAV_INJECT -->[\s\S]*?<!-- BLOOM_NAV_END -->\s*/g, '\n');
    html = html.replace(/\s*<!-- BLOOM_BASE_INJECT -->[\s\S]*?<!-- BLOOM_BASE_END -->\s*/g, '\n');
    html = html.replace(/\s*<!-- BLOOM_FOOT_INJECT -->[\s\S]*?<!-- BLOOM_FOOT_END -->\s*/g, '\n');

    // 2. Strip original legacy structures (acts on fresh/legacy copies on first execution)
    html = html.replace(/<nav\s+class="bloom-nav"[^>]*>([\s\S]*?)<\/nav>/gi, '');
    html = html.replace(/<div\s+class="toast-container"[^>]*>([\s\S]*?)<\/div>/gi, '');
    html = html.replace(/<div\s+class="particle-field"[^>]*>([\s\S]*?)<\/div>/gi, '');

    // 3. Inject Styles and Font definitions into the head
    html = html.replace('</head>', `${styleBlock}</head>`);

    // 4. Inject dynamic loader, cursor systems, and premium navigation at top of body
    const bodyTagRegex = /<body[^>]*>/i;
    const bodyMatch = html.match(bodyTagRegex);
    if (bodyMatch) {
      html = html.replace(bodyMatch[0], `${bodyMatch[0]}${navBlock}`);
    }

    // 5. Avoid duplication by removing historical direct imports of scripts now bundled centrally
    html = html.replace(/<script[^>]*src="\/js\/core\/Store\.js"[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*src="\/js\/core\/Api\.js"[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*src="\/js\/core\/Auth\.js"[^>]*><\/script>/gi, '');

    // 6. Inject base infrastructure scripts BEFORE the page-specific controller execution
    const firstScriptIndex = html.indexOf('<script');
    if (firstScriptIndex !== -1) {
      html = html.substring(0, firstScriptIndex) + baseScriptsBlock + html.substring(firstScriptIndex);
    } else {
      html = html.replace('</body>', `${baseScriptsBlock}</body>`);
    }

    // 7. Inject the standard footer, dynamic modals/drawers, and the layout IIFE script before body closing
    html = html.replace('</body>', `${footBlock}</body>`);

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
