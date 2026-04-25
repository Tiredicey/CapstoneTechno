import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(publicDir, 'index.html');

try {
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Extract parts of index.html
  // Header part up to the closing </nav>
  const navEndIndex = indexHtml.indexOf('</nav>') + 6;
  const headerPart = indexHtml.substring(0, navEndIndex);

  // Footer part starting from <footer class="bloom-foot">
  const footerStartIndex = indexHtml.indexOf('<footer class="bloom-foot"');
  // But wait, there is also the bottom-sheet modals, we should probably grab from footer to the end, EXCEPT the hero specific scripts.
  // Actually, we can grab the footer and everything after it.
  let footerPart = indexHtml.substring(footerStartIndex);

  // We should remove the hero-specific initialization from the footer script if possible, but it's fine for now, they have safety checks.
  // Just inject our content.

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
      <main class="con sec-pad" style="padding-top: 140px; min-height: 70vh;">
        <h1 class="sec-title" style="margin-bottom: 24px; color: var(--p5);">Privacy Policy</h1>
        <p class="sec-sub" style="font-size: 1.1rem; max-width: 800px; color: rgba(255,255,255,0.8);">
          Data protection protocols implemented in the Bloom platform.
        </p>
        <div style="margin-top: 40px; max-width: 800px; color: rgba(255,255,255,0.7); line-height: 1.8;">
          <h3 style="color: white; margin-bottom: 12px; margin-top: 24px;">Data Collection</h3>
          <p>As an academic Capstone project by STI LIPA BSIT students, any data entered into this system (names, emails, simulated addresses) is securely stored locally in the SQLite database. We do not sell, distribute, or utilize this data outside of academic demonstration purposes.</p>
          
          <h3 style="color: white; margin-bottom: 12px; margin-top: 24px;">Security Measures</h3>
          <p>We enforce strict data sanitization on all inputs to prevent Cross-Site Scripting (XSS) and utilize parameterized queries to prevent SQL Injection (SQLi). Your simulated sessions are protected by industry-standard JWT protocols.</p>
        </div>
      </main>
    `
  };

  for (const [filename, content] of Object.entries(pages)) {
    const fullHtml = headerPart + content + footerPart;
    fs.writeFileSync(path.join(publicDir, filename), fullHtml, 'utf-8');
    console.log('Generated:', filename);
  }

} catch (err) {
  console.error(err);
}
