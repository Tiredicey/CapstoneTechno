const { Api, Store } = window;
const Toast = window.Toast || { show: (m, t) => window.showToast?.(m, t) || alert(m) };

const FAQS_FALLBACK = [
  { q: 'How far in advance should I pre-order?', a: 'Order at least 2 days in advance. For weddings or 10+ corporate arrangements, 7–14 days is best.' },
  { q: 'Can I change my delivery date after ordering?', a: 'Yes — contact support at least 24 hours before scheduled delivery and we will reschedule free of charge.' },
  { q: 'What is your refund policy?', a: 'Submit a ticket with your order code and a photo. Resolution is handled within 24 hours by a live agent.' },
  { q: 'Do you offer corporate bulk pricing?', a: 'Yes — 10+ arrangements unlock B2B pricing. Open a ticket with subject "corporate".' },
  { q: 'How do loyalty points work?', a: 'Earn 10 points per ₱1 spent. Redeem at ₱0.01 per point, up to 10% of order total.' },
  { q: 'Can I track my delivery in real time?', a: 'Yes — use the Track Order page or paste your BLOOM- code in chat. Live socket updates included.' }
];

const BLOOM_CODE_REGEX = /\b(BLOOM-[A-Z0-9]{4,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;
const OFFLINE_KEY = 'bloom_offline_chat_messages';
const HISTORY_KEY = 'bloom_chat_history_v3';
const POLLINATIONS = 'https://text.pollinations.ai/openai';
const MODELS = ['openai', 'mistral', 'llama', 'gemini'];

const FRUSTRATION_LEXICON = {
  high: ['scam', 'fraud', 'estafa', 'stolen', 'sue', 'lawsuit', 'horrible', 'disaster', 'unacceptable', 'furious', 'outrage', '詐欺', 'fraude'],
  mid: ['angry', 'upset', 'frustrated', 'disappointed', 'broken', 'damaged', 'wrong', 'late', 'galit', 'enojado', '怒', 'sucks', 'hate', 'useless'],
  low: ['bad', 'slow', 'confusing', 'annoying', 'pangit', 'malo', 'だめ']
};

const SYSTEM_PROMPT = `You are Bloom Assistant — a calm, warm, factually-grounded AI for a Philippine flower pre-order platform.

VERIFIED BLOOM FACTS (the ONLY business truths you may state):
• Pre-order lead time: minimum 48 hours; weddings & 10+ corporate orders need 7–14 days
• Delivery windows: Morning 9am–12pm | Afternoon 12pm–4pm | Evening 4pm–8pm
• Free shipping threshold: orders above ₱4,350
• Loyalty: 10 points per ₱1; redeem at ₱0.01/point up to 10% of order
• Currency: Philippine Peso (₱)
• Reschedule: free if requested ≥24h before delivery
• Cancellation: allowed up to 12h before delivery

TONE: Brief, gentle, structured. 1–2 short paragraphs max. One emoji 🌸 when warm. Never lecture, never argue, never fabricate prices, dates, or policies not listed above.

AGENTIC TOOLS (emit ONE line starting with ">"):
• track_order {"code":"BLOOM-XXXX"} — live order status, ETA, photo
• open_ticket — opens the formal ticket form
• escalate_agent — connects a live human agent immediately
• show_faq — scrolls to self-service knowledge base
• get_cart — reads user's current cart + total
• recommend {"occasion":"birthday|anniversary|sympathy|corporate"} — suggests bouquets

RULES:
• If the user pastes a BLOOM- code → immediately call track_order.
• If sentiment is angry, repeated complaint, or claims fraud → call escalate_agent THEN apologize briefly.
• If asked anything outside Bloom (politics, medical, code, news, weather) → politely decline in one line and offer to help with an order.
• If unsure of any fact → say "Let me connect you to a human agent" and call escalate_agent. Do not invent.
• Respond in natural language first, then on a new line emit at most ONE tool call.
• End every reply with: Suggested replies: chip1 | chip2 | chip3 (2–3 short pipe-separated quick replies)`;

const Agent = {
  state: {
    ticketId: null,
    socket: null,
    history: load(HISTORY_KEY, []),
    frustration: 0,
    aborter: null,
    csat: 0,
    nps: null,
    typingEl: null,
    streamBubble: null,
    lastUserMsg: '',
    voiceRec: null,
    listening: false
  },

  tools: {
    track_order: async ({ code }) => {
      if (!code) return { ok: false, error: 'Missing order code' };
      const norm = String(code).toUpperCase().trim();
      try {
        const order = await Api.get(`/orders/${encodeURIComponent(norm)}/track`);
        const recipient = typeof order.recipient === 'string'
          ? safeJSON(order.recipient)?.name || 'Customer'
          : order.recipient?.name || 'Customer';
        return {
          ok: true,
          code: norm,
          status: (order.status || 'new').replace(/_/g, ' ').toUpperCase(),
          rawStatus: order.status || 'new',
          eta: order.delivery_date || order.deliveryDate || 'TBD',
          recipient,
          photo: order.delivery_photo || null
        };
      } catch { return { ok: false, error: `No order found for ${norm}` }; }
    },

    open_ticket: async () => {
      const sec = document.getElementById('ticketSection');
      sec?.classList.remove('is-hidden');
      sec?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => document.getElementById('ticketSubject')?.focus(), 240);
      return { ok: true };
    },

    escalate_agent: async () => {
      const status = document.querySelector('.chat-agent-info .status');
      const name = document.querySelector('.chat-agent-info .name');
      if (name) name.textContent = 'Esperanza · Live Agent';
      if (status) {
        status.textContent = '● Connecting…';
        setTimeout(() => { status.textContent = '● Connected'; }, 1400);
      }
      if (!Agent.state.ticketId && Agent.state.history.length) {
        try {
          const last = Agent.state.history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
          const t = await Api.post('/support', {
            channel: 'chat',
            subject: 'Live agent escalation',
            message: last || 'Customer requested live agent'
          });
          Agent.state.ticketId = t.id;
          joinTicketSocket(t.id);
        } catch {}
      }
      return { ok: true };
    },

    show_faq: async () => { document.getElementById('faqSection')?.scrollIntoView({ behavior: 'smooth' }); return { ok: true }; },

    get_cart: async () => {
      const cart = safeJSON(localStorage.getItem('bloom_cart')) || [];
      const total = cart.reduce((s, i) => s + Number(i.price || i.base_price || 0) * Number(i.qty || i.quantity || 1), 0);
      return {
        ok: true,
        count: cart.length,
        total: total.toFixed(2),
        items: cart.map(i => ({ name: i.name, qty: i.qty || i.quantity || 1 }))
      };
    },

    recommend: async ({ occasion }) => {
      try {
        const data = await Api.get(`/products?occasion=${encodeURIComponent(occasion || '')}&limit=3`);
        const list = data.products || data || [];
        return { ok: true, occasion, items: list.slice(0, 3).map(p => ({ id: p.id, name: p.name, price: p.base_price || p.price })) };
      } catch { return { ok: false, error: 'Could not fetch recommendations right now' }; }
    }
  },

  render: {
    track_order(r) {
      if (!r.ok) return `<div class="chat-tool-error">⚠️ ${escapeHtml(r.error)}</div>`;
      const photo = r.photo ? `<div class="card-photo"><img src="${escapeHtml(r.photo)}" alt="Delivery photo" loading="lazy"></div>` : '';
      return `
        <div class="chat-status-card glass-ethereal shimmer">
          <div class="card-hd">
            <span class="code">${escapeHtml(r.code)}</span>
            <span class="pill status-${escapeHtml(r.rawStatus)}">${escapeHtml(r.status)}</span>
          </div>
          <div class="card-body">
            <div class="meta">ETA: <strong>${escapeHtml(r.eta)}</strong></div>
            <div class="meta">Recipient: <strong>${escapeHtml(r.recipient)}</strong></div>
            ${photo}
          </div>
          <a href="/tracking.html?id=${encodeURIComponent(r.code)}" class="card-link" target="_blank" rel="noopener">View Full Timeline →</a>
        </div>`;
    },
    recommend(r) {
      if (!r.ok || !r.items?.length) return '';
      return `<div class="chat-reco-grid">${r.items.map(i => `
        <a href="/product.html?id=${encodeURIComponent(i.id)}" class="chat-reco-card" target="_blank" rel="noopener">
          <div class="reco-name">${escapeHtml(i.name)}</div>
          <div class="reco-price">₱${Number(i.price).toLocaleString()}</div>
        </a>`).join('')}</div>`;
    },
    get_cart(r) {
      if (!r.ok || !r.count) return '';
      const rows = r.items.map(i => `<div class="cart-row"><span>${escapeHtml(i.name)}</span><span>×${i.qty}</span></div>`).join('');
      return `<div class="chat-cart-card glass-ethereal">
        <div class="card-hd"><strong>Your Cart</strong><span>₱${Number(r.total).toLocaleString()}</span></div>
        ${rows}
      </div>`;
    }
  }
};

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function load(k, fb) { return safeJSON(localStorage.getItem(k)) || fb; }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function formatMd(s = '') {
  let out = escapeHtml(s);
  out = out.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  out = out
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s>])\*(?!\s)([^*\n]+?)\*(?=[\s<.,!?)]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s>])_(?!\s)([^_\n]+?)_(?=[\s<.,!?)]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/(^|\n)(?:[-•] .+(?:\n|$))+/g, m => {
    const items = m.trim().split(/\n/).map(l => l.replace(/^[-•]\s+/, '')).map(li => `<li>${li}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  out = out.replace(/\n/g, '<br>');
  return out;
}

function extractToolCall(text) {
  const m = text.match(/(^|\n)\s*>\s*(\w+)\s*/);
  if (!m) return null;
  const name = m[2];
  const startInText = m.index + m[0].length;
  const rest = text.slice(startInText);
  let args = {};
  let consumed = 0;
  if (rest.trimStart().startsWith('{')) {
    const offset = rest.indexOf('{');
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = offset; i < rest.length; i++) {
      const c = rest[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') inStr = !inStr;
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end > 0) {
      args = safeJSON(rest.slice(offset, end)) || {};
      consumed = end;
    }
  }
  const raw = text.slice(m.index, startInText + consumed);
  return { name, args, raw };
}

function parseAgentOutput(raw) {
  let text = raw || '';
  let toolCall = null;
  let replies = [];
  const tc = extractToolCall(text);
  if (tc) { toolCall = { name: tc.name, args: tc.args }; text = text.replace(tc.raw, '').trim(); }
  const repMatch = text.match(/(?:Suggested replies?|Quick replies?)\s*:\s*(.+)$/im);
  if (repMatch) {
    replies = repMatch[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 4);
    text = text.replace(repMatch[0], '').trim();
  }
  return { text: text.trim(), toolCall, replies };
}

const FaqController = (() => {
  let all = [], active = 'all';

  async function fetchFaqs() {
    try {
      const data = await Api.get('/support/faqs');
      all = data?.faqs || [];
    } catch {
      try {
        const r = await fetch('/api/faq');
        const d = r.ok ? await r.json() : null;
        all = (Array.isArray(d) ? d : d?.faqs) || [];
      } catch {}
    }
    if (!all.length) all = FAQS_FALLBACK.map(f => ({ question: f.q, answer: f.a, category: 'general' }));
    buildTabs(); render();
  }

  function buildTabs() {
    const wrap = document.getElementById('faqCategoryTabs');
    if (!wrap) return;
    const cats = ['all', ...new Set(all.map(f => f.category).filter(Boolean))];
    wrap.innerHTML = cats.map(c => `
      <button type="button" class="faq-tab${c === active ? ' is-active' : ''}" data-cat="${escapeHtml(c)}" role="tab" aria-selected="${c === active}">
        ${escapeHtml(c.charAt(0).toUpperCase() + c.slice(1))}
      </button>`).join('');
    wrap.querySelectorAll('.faq-tab').forEach(b => b.addEventListener('click', () => {
      active = b.dataset.cat; buildTabs(); render();
    }));
  }

  function render() {
    const list = document.getElementById('faqList');
    if (!list) return;
    const search = (document.getElementById('faqSearch')?.value || '').toLowerCase().trim();
    let filtered = active === 'all' ? all : all.filter(f => f.category === active);
    if (search) filtered = filtered.filter(f => (f.question || f.q || '').toLowerCase().includes(search) || (f.answer || f.a || '').toLowerCase().includes(search));
    if (!filtered.length) {
      list.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:40px;">No FAQs match your search.</div>';
      return;
    }
    list.innerHTML = filtered.map(f => `
      <div class="faq-item" data-open="false">
        <button type="button" class="faq-trigger" aria-expanded="false">
          <span>${escapeHtml(f.question || f.q)}</span>
          <span class="faq-arrow" aria-hidden="true">›</span>
        </button>
        <div class="faq-panel"><div class="faq-panel-inner"><div>${formatMd(f.answer || f.a)}</div></div></div>
      </div>`).join('');
    list.querySelectorAll('.faq-trigger').forEach(btn => btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const open = item.getAttribute('data-open') === 'true';
      item.setAttribute('data-open', String(!open));
      btn.setAttribute('aria-expanded', String(!open));
    }));
  }

  return { load: fetchFaqs, refresh: fetchFaqs, render };
})();

function announce(text) {
  let live = document.getElementById('chatLive');
  if (!live) {
    live = document.createElement('div');
    live.id = 'chatLive';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);';
    document.body.appendChild(live);
  }
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 30);
}

function appendMessage(content, role = 'bot', isHtml = false) {
  const c = document.getElementById('chatMessages');
  if (!c) return null;
  const wrap = document.createElement('div');
  wrap.className = `chat-msg-wrap chat-msg-${role}`;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = isHtml ? content : formatMd(content);
  wrap.appendChild(bubble);

  if (role === 'bot' || role === 'agent') {
    const actions = document.createElement('div');
    actions.className = 'chat-msg-actions';
    actions.innerHTML = `
      <button type="button" class="chat-action" data-act="copy" title="Copy" aria-label="Copy message">⧉</button>
      <button type="button" class="chat-action" data-act="up" title="Helpful" aria-label="Mark helpful">👍</button>
      <button type="button" class="chat-action" data-act="down" title="Not helpful" aria-label="Mark not helpful">👎</button>
      ${role === 'bot' ? '<button type="button" class="chat-action" data-act="regen" title="Regenerate" aria-label="Regenerate">↻</button>' : ''}
    `;
    actions.addEventListener('click', e => {
      const b = e.target.closest('.chat-action');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'copy') {
        const text = bubble.innerText;
        navigator.clipboard?.writeText(text).then(() => Toast.show('Copied', 'success')).catch(() => {});
      } else if (act === 'up' || act === 'down') {
        b.classList.add('is-active');
        actions.querySelectorAll('.chat-action').forEach(x => { if (x !== b && (x.dataset.act === 'up' || x.dataset.act === 'down')) x.classList.remove('is-active'); });
        if (Agent.state.ticketId) Api.post(`/support/${Agent.state.ticketId}/message`, { message: `[feedback:${act === 'up' ? 'positive' : 'negative'}]`, sender: 'user' }).catch(() => {});
      } else if (act === 'regen') {
        if (Agent.state.lastUserMsg) {
          wrap.remove();
          Agent.state.history = Agent.state.history.filter(m => !(m.role === 'assistant' && m.content === bubble.innerText));
          runAgent(Agent.state.lastUserMsg);
        }
      }
    });
    wrap.appendChild(actions);
  }

  c.appendChild(wrap);
  c.scrollTop = c.scrollHeight;
  if (role !== 'user') announce(bubble.innerText.slice(0, 200));
  window.Motion?.animate?.(wrap, { opacity: [0, 1], y: [8, 0] }, { duration: 0.3 });
  return bubble;
}

function appendQuickReplies(replies) {
  if (!replies?.length) return;
  const c = document.getElementById('chatMessages');
  if (!c) return;
  const wrap = document.createElement('div');
  wrap.className = 'chat-chips';
  wrap.innerHTML = replies.map(r => `<button type="button" class="chat-chip">${escapeHtml(r)}</button>`).join('');
  wrap.querySelectorAll('.chat-chip').forEach(b => b.addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    if (input) { input.value = b.textContent; sendChat(); }
  }));
  c.appendChild(wrap);
  c.scrollTop = c.scrollHeight;
}

function showTyping() {
  if (Agent.state.typingEl) return;
  const c = document.getElementById('chatMessages');
  if (!c) return;
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg-wrap chat-msg-bot';
  wrap.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
  c.appendChild(wrap);
  c.scrollTop = c.scrollHeight;
  Agent.state.typingEl = wrap;
}
function hideTyping() { Agent.state.typingEl?.remove(); Agent.state.typingEl = null; }

function detectFrustration(msg) {
  const lower = msg.toLowerCase();
  let score = 0;
  for (const w of FRUSTRATION_LEXICON.high) if (lower.includes(w)) score += 3;
  for (const w of FRUSTRATION_LEXICON.mid) if (lower.includes(w)) score += 2;
  for (const w of FRUSTRATION_LEXICON.low) if (lower.includes(w)) score += 1;
  if (/!{2,}/.test(msg) || /[A-Z]{6,}/.test(msg)) score += 2;
  Agent.state.frustration += score;
  return Agent.state.frustration >= 5;
}

function buildContextSystem() {
  const user = Store?.get?.('user');
  const lang = window.I18n?.getLang?.() || Store?.get?.('lang') || 'en';
  const cart = safeJSON(localStorage.getItem('bloom_cart')) || [];
  const cartTotal = cart.reduce((s, i) => s + Number(i.price || i.base_price || 0) * Number(i.qty || i.quantity || 1), 0);
  const conn = navigator.connection;
  const low = conn?.saveData || /2g|slow-2g/i.test(conn?.effectiveType || '');
  return `[SESSION] time=${new Date().toISOString()} | online=${navigator.onLine} | lang=${lang} | user=${user?.name || 'guest'} | cart=${cart.length} items, ₱${cartTotal.toLocaleString()} | bandwidth=${low ? 'LOW (be terse, skip emojis)' : 'normal'} | frustration=${Agent.state.frustration}`;
}

async function streamModel(messages, model, onDelta) {
  Agent.state.aborter?.abort();
  Agent.state.aborter = new AbortController();
  const res = await fetch(POLLINATIONS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, private: true, referrer: 'bloom-support' }),
    signal: Agent.state.aborter.signal
  });
  if (!res.ok || !res.body) throw new Error(`stream ${model} ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', full = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') return full;
      try {
        const j = JSON.parse(payload);
        const d = j.choices?.[0]?.delta?.content || '';
        if (d) { full += d; onDelta(d, full); }
      } catch {}
    }
  }
  return full;
}

async function nonStreamModel(messages, model) {
  const r = await fetch(POLLINATIONS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, private: true, referrer: 'bloom-support' })
  });
  if (!r.ok) throw new Error(`nonstream ${model} ${r.status}`);
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content;
  if (!text) throw new Error('empty');
  return text;
}

async function serverProxyAI(messages) {
  const r = await Api.post('/support/ai/chat', { messages });
  if (!r?.text) throw new Error('proxy empty');
  return r.text;
}

async function runAgent(userMsg) {
  Agent.state.lastUserMsg = userMsg;
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: buildContextSystem() },
    ...Agent.state.history.slice(-12)
  ];

  let bubble = null;
  let streamed = '';
  showTyping();

  const onDelta = (_d, full) => {
    streamed = full;
    if (!bubble) { hideTyping(); bubble = appendMessage('', 'bot'); }
    const { text } = parseAgentOutput(full);
    bubble.innerHTML = formatMd(text || '…');
    const c = document.getElementById('chatMessages');
    if (c) c.scrollTop = c.scrollHeight;
  };

  let finalText = '';
  let lastErr = null;
  for (const model of MODELS) {
    try { finalText = await streamModel(messages, model, onDelta); if (finalText) break; }
    catch (e) { if (e.name === 'AbortError') { hideTyping(); return; } lastErr = e; }
  }

  if (!finalText) {
    for (const model of MODELS) {
      try { finalText = await nonStreamModel(messages, model); if (finalText) break; }
      catch (e) { lastErr = e; }
    }
  }

  if (!finalText) {
    try { finalText = await serverProxyAI(messages); } catch (e) { lastErr = e; }
  }

  hideTyping();

  if (!finalText) {
    const fb = localFallback(userMsg);
    appendMessage(fb, 'bot');
    appendQuickReplies(['Track my order', 'Talk to a human', 'See FAQ']);
    return;
  }

  const parsed = parseAgentOutput(finalText || streamed);
  if (!bubble) bubble = appendMessage('', 'bot');
  bubble.innerHTML = formatMd(parsed.text || '…');

  if (parsed.toolCall) await executeTool(parsed.toolCall);
  if (parsed.replies.length) appendQuickReplies(parsed.replies);

  Agent.state.history.push({ role: 'assistant', content: parsed.text });
  save(HISTORY_KEY, Agent.state.history.slice(-30));
  persistToTicket(parsed.text, 'bot');
}

async function executeTool({ name, args }) {
  const tool = Agent.tools[name];
  if (!tool) return;
  const result = await tool(args || {});
  const renderer = Agent.render[name];
  if (renderer) {
    const html = renderer(result);
    if (html) appendMessage(html, 'bot', true);
  }
  Agent.state.history.push({ role: 'system', content: `[tool_result:${name}] ${JSON.stringify(result).slice(0, 600)}` });
  if (name === 'track_order' && result.ok && /failed|cancelled|delayed/i.test(result.rawStatus || '')) {
    Agent.state.frustration += 2;
  }
}

function localFallback(msg) {
  const m = (msg || '').toLowerCase();
  if (BLOOM_CODE_REGEX.test(m)) return 'I noticed an order code but the AI is offline. Tap "Track my order" to use the live tracker.';
  if (/track|where|status/.test(m)) return 'Visit our Track Order page with your BLOOM- code for live updates.';
  if (/refund|damaged|wrong/.test(m)) return 'Please open a support ticket with your order ID and a photo — agents reply within 24h.';
  if (/cancel/.test(m)) return 'Orders can be cancelled up to 12 hours before scheduled delivery. Open a ticket with your order code.';
  if (/deliver|when|time/.test(m)) return 'Slots: Morning 9–12pm, Afternoon 12–4pm, Evening 4–8pm. Lead time is 48h minimum.';
  if (/price|cost|how much/.test(m)) return 'Bouquets vary by season — browse the Shop page for current pricing. Free shipping over ₱4,350.';
  return 'I am offline right now 🌸 — try Track Order, open a ticket, or browse the FAQ below.';
}

function persistToTicket(message, sender) {
  if (!Agent.state.ticketId) return;
  Api.post(`/support/${Agent.state.ticketId}/message`, { message, sender }).catch(() => {});
}

function queueOffline(msg) {
  const q = safeJSON(localStorage.getItem(OFFLINE_KEY)) || [];
  q.push({ content: msg, ts: Date.now() });
  save(OFFLINE_KEY, q);
}

async function syncOffline() {
  if (!navigator.onLine) return;
  const q = safeJSON(localStorage.getItem(OFFLINE_KEY)) || [];
  if (!q.length) return;
  Toast.show(`Reconnected — syncing ${q.length} message${q.length > 1 ? 's' : ''}`, 'success');
  localStorage.removeItem(OFFLINE_KEY);
  if (Agent.state.ticketId) {
    for (const m of q) {
      await Api.post(`/support/${Agent.state.ticketId}/message`, { message: m.content, sender: 'user' }).catch(() => {});
    }
  }
}

function joinTicketSocket(ticketId) {
  if (typeof io === 'undefined') return;
  Agent.state.socket ??= io({ reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1500 });
  Agent.state.socket.emit('join_support', ticketId);
  Agent.state.socket.off('support_message').on('support_message', d => {
    if (d.sender !== 'user' && d.sender !== 'bot') appendMessage(d.message, 'agent');
  });
  Agent.state.socket.off('support_status').on('support_status', s => {
    if (s === 'resolved') appendMessage('This ticket has been marked as resolved 🌸', 'bot');
  });
}

function handleSlash(raw) {
  const cmd = raw.trim().toLowerCase();
  if (cmd === '/clear') {
    document.getElementById('chatMessages').innerHTML = '';
    Agent.state.history = [];
    save(HISTORY_KEY, []);
    appendMessage('Conversation cleared 🌸', 'bot');
    return true;
  }
  if (cmd === '/agent' || cmd === '/human') { Agent.tools.escalate_agent(); appendMessage('Connecting you to a live agent…', 'bot'); return true; }
  if (cmd === '/ticket') { Agent.tools.open_ticket(); return true; }
  if (cmd === '/faq') { Agent.tools.show_faq(); return true; }
  if (cmd.startsWith('/track')) {
    const code = cmd.replace('/track', '').trim();
    if (code) sendChat(code);
    return !!code;
  }
  return false;
}

async function sendChat(forced) {
  const input = document.getElementById('chatInput');
  const raw = (forced || input?.value || '').trim();
  if (!raw) return;
  if (!forced) { input.value = ''; autoGrow(input); input.focus(); }

  if (raw.startsWith('/') && handleSlash(raw)) return;

  appendMessage(raw, 'user');
  Agent.state.history.push({ role: 'user', content: raw });
  save(HISTORY_KEY, Agent.state.history.slice(-30));
  persistToTicket(raw, 'user');

  const codeMatch = raw.match(BLOOM_CODE_REGEX);
  if (codeMatch) {
    showTyping();
    const result = await Agent.tools.track_order({ code: codeMatch[0] });
    hideTyping();
    appendMessage(result.ok ? `Here is the live status for ${result.code} 🌸` : `I couldn't find ${codeMatch[0]}. Could you double-check the code?`, 'bot');
    const html = Agent.render.track_order(result);
    if (html) appendMessage(html, 'bot', true);
    appendQuickReplies(result.ok ? ['Reschedule delivery', 'Talk to a human', 'Open a ticket'] : ['Try again', 'Talk to a human', 'Open ticket']);
    return;
  }

  if (detectFrustration(raw)) {
    Agent.state.frustration = -999;
    appendMessage('I hear you — connecting you to a human agent now. You will not have to repeat anything 🌸', 'bot');
    await Agent.tools.escalate_agent();
    appendQuickReplies(['Wait for agent', 'Open ticket instead']);
    return;
  }

  if (!navigator.onLine) {
    queueOffline(raw);
    appendMessage(localFallback(raw) + '\n\n_Your message is queued and will sync when you reconnect._', 'bot');
    appendQuickReplies(['Track my order', 'See FAQ']);
    return;
  }

  await runAgent(raw);
}

function autoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(140, el.scrollHeight) + 'px';
}

function setupVoice() {
  const btn = document.getElementById('voiceBtn');
  if (!btn) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btn.style.display = 'none'; return; }
  const rec = new SR();
  rec.lang = (navigator.language || 'en-PH');
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = e => {
    const transcript = e.results[0][0].transcript;
    const input = document.getElementById('chatInput');
    if (input) { input.value = transcript; autoGrow(input); sendChat(); }
  };
  rec.onerror = () => { Agent.state.listening = false; btn.classList.remove('is-active'); };
  rec.onend = () => { Agent.state.listening = false; btn.classList.remove('is-active'); };
  Agent.state.voiceRec = rec;
  btn.addEventListener('click', () => {
    if (Agent.state.listening) { rec.stop(); return; }
    try { rec.start(); Agent.state.listening = true; btn.classList.add('is-active'); }
    catch {}
  });
}

function buildNpsButtons() {
  const row = document.getElementById('npsRow');
  if (!row || row.dataset.built) return;
  row.dataset.built = '1';
  row.innerHTML = Array.from({ length: 11 }, (_, i) =>
    `<button type="button" class="btn btn-ghost btn-sm nps-btn" data-nps="${i}" role="radio" aria-checked="false" aria-label="${i} out of 10">${i}</button>`
  ).join('');
}

function bindStarRating() {
  const stars = document.querySelectorAll('#csatStars .rating-star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      Agent.state.csat = Number(star.dataset.val);
      stars.forEach((s, i) => {
        const on = i < Agent.state.csat;
        s.classList.toggle('active', on);
        s.setAttribute('aria-checked', String(i === Agent.state.csat - 1));
      });
    });
    star.addEventListener('keydown', e => {
      const idx = Number(star.dataset.val) - 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = e.key === 'ArrowRight' ? Math.min(4, idx + 1) : Math.max(0, idx - 1);
        stars[next].focus(); stars[next].click();
      }
    });
  });
}

function openChat() {
  document.getElementById('chatSection')?.classList.remove('is-hidden');
  document.getElementById('ticketSection')?.classList.add('is-hidden');
  setTimeout(() => document.getElementById('chatInput')?.focus(), 80);
  const status = document.querySelector('.chat-agent-info .status');
  if (status && (navigator.connection?.saveData || /2g/i.test(navigator.connection?.effectiveType || ''))) {
    status.innerHTML = '⚡ Eco Mode (Low Bandwidth)';
    status.style.color = '#facc15';
  }
}

function closeChat() {
  document.getElementById('chatSection')?.classList.add('is-hidden');
  Agent.state.aborter?.abort();
}

function wireEvents() {
  const input = document.getElementById('chatInput');
  if (input) {
    input.addEventListener('input', () => autoGrow(input));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
  }

  document.getElementById('chatForm')?.addEventListener('submit', e => { e.preventDefault(); sendChat(); });

  document.getElementById('closeChatBtn')?.addEventListener('click', () => {
    closeChat();
    document.getElementById('csatSection')?.classList.remove('is-hidden');
    document.getElementById('csatSection')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('openChatBtn')?.addEventListener('click', () => {
    openChat();
    if (!Agent.state.history.length) {
      appendMessage('Hi 🌸 I am Bloom Assistant. I can track orders, reschedule deliveries, recommend bouquets, or connect you to a human in under a minute.', 'bot');
      appendQuickReplies(['Track my order', 'Recommend a bouquet', 'Talk to a human', 'See FAQ']);
    }
  });

  document.getElementById('openAgentBtn')?.addEventListener('click', () => {
    openChat();
    Agent.tools.escalate_agent();
    appendMessage("Hi! I'm Esperanza, your live support agent. How can I help today?", 'agent');
  });

  document.getElementById('openTicketBtn')?.addEventListener('click', () => Agent.tools.open_ticket());
  document.getElementById('openSelfBtn')?.addEventListener('click', () => Agent.tools.show_faq());

  document.getElementById('faqSearch')?.addEventListener('input', () => FaqController.render());

  document.getElementById('ticketForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    const submit = document.getElementById('submitTicket');
    const prev = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Submitting…';
    try {
      const ticket = await Api.post('/support', {
        orderId: document.getElementById('ticketOrderId').value.trim() || null,
        channel: document.getElementById('ticketChannel').value,
        subject: document.getElementById('ticketSubject').value.trim(),
        message: document.getElementById('ticketMessage').value.trim()
      });
      Agent.state.ticketId = ticket.id;
      Toast.show(`Ticket #${ticket.id.slice(0, 8)} submitted`, 'success');
      form.reset();
      document.getElementById('ticketSection')?.classList.add('is-hidden');
      openChat();
      appendMessage(`Ticket #${ticket.id.slice(0, 8)} created 🌸 — an agent will reach out within 4 hours. Anything else I can help with right now?`, 'bot');
      appendQuickReplies(['Track another order', 'Recommend a bouquet', 'Close chat']);
      joinTicketSocket(ticket.id);
    } catch (err) {
      Toast.show(err.message || 'Could not submit ticket', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = prev;
    }
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('.nps-btn');
    if (!btn) return;
    document.querySelectorAll('.nps-btn').forEach(b => { b.classList.remove('btn-primary'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('btn-primary');
    btn.setAttribute('aria-checked', 'true');
    Agent.state.nps = Number(btn.dataset.nps);
  });

  document.getElementById('submitCsat')?.addEventListener('click', async () => {
    if (!Agent.state.csat) return Toast.show('Please rate your experience', 'error');
    const comment = document.getElementById('csatComment')?.value?.trim() || null;
    try {
      if (Agent.state.ticketId) {
        await Api.post(`/support/${Agent.state.ticketId}/resolve`, {
          csatScore: Agent.state.csat,
          npsScore: Agent.state.nps,
          feedbackComment: comment
        });
      }
      Toast.show('Thank you for your feedback 🌸', 'success');
      const sec = document.getElementById('csatSection');
      if (sec) sec.innerHTML = `<div class="glass-card" style="padding:40px;text-align:center;max-width:560px;"><h2 class="section-heading csat-heading" style="margin-bottom:12px;">Thank You! 🌸</h2><p style="color:rgba(255,255,255,0.6);font-size:0.95rem;">Your feedback helps us bloom and grow.</p></div>`;
    } catch (e) { Toast.show(e.message || 'Could not submit feedback', 'error'); }
  });

  window.addEventListener('online', syncOffline);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncOffline(); });
}

document.addEventListener('DOMContentLoaded', () => {
  FaqController.load();
  buildNpsButtons();
  bindStarRating();
  setupVoice();
  wireEvents();
  syncOffline();
  Store?.on?.('faq_update', () => FaqController.refresh());

  const hero = document.querySelector('.support-hero, .hero-support, main > section:first-child .con, .support-page > .container > div:first-child');
  if (hero && !hero.querySelector('.bloom-academic-notice')) {
    const note = document.createElement('div');
    note.className = 'bloom-academic-notice';
    note.setAttribute('role', 'note');
    note.style.cssText = 'margin:12px 0 0;padding:10px 16px;border-radius:10px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.2);font-size:.78rem;color:rgba(255,255,255,.6);text-align:center;';
    note.innerHTML = '🎓 Academic Demo — BSIT Capstone project. No commercial agents monitor these tickets.';
    hero.appendChild(note);
  }
});

window.BloomAgent = Agent;
