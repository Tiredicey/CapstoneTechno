const { Api, Store } = window;
const Toast = window.Toast || {
  show: function(msg, type) {
    if (window.showToast) return window.showToast(msg, type);
    const con = document.getElementById('toastContainer');
    if (!con) return alert(msg);
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.textContent = msg;
    con.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
  }
};
const FAQS = [
  { q: 'How far in advance should I pre-order?', a: 'We recommend ordering at least 2 days in advance. For large corporate or wedding orders, 7-14 days ensures the best selection and preparation.' },
  { q: 'Can I change my delivery date after ordering?', a: 'Yes! Contact support at least 24 hours before your scheduled delivery and we\'ll reschedule at no charge.' },
  { q: 'What is your refund policy?', a: 'The platform models issue resolution. In a production scenario, it facilitates replacements or resolutions based on submitted tickets.' },
  { q: 'Do you offer corporate bulk pricing?', a: 'Yes - for orders of 10+ arrangements, contact our B2B team through the support ticket system and mention "corporate" in your subject.' },
  { q: 'How do loyalty points work?', a: 'You earn 10 points per dollar spent. Points can be redeemed at checkout at a rate of $0.01 per point, up to 10% of your order total.' },
  { q: 'Can I track my delivery in real time?', a: 'Yes! Use our Track Order page with your order code. You\'ll receive socket-powered live status updates as your order moves through each stage.' }
];

const BOT_RESPONSES = {
  track: 'To track your order, visit the **Track Order** page and enter your order code (starts with BLOOM-). Or tell me your order code and I\'ll look it up!',
  refund: 'For simulated resolution requests, I would typically need an order ID and photo. Would you like me to demonstrate opening a support ticket?',
  cancel: 'Orders can be cancelled up to 12 hours before the scheduled delivery. What\'s your order code?',
  delivery: 'Delivery times depend on your selected time slot: Morning (9am-12pm), Afternoon (12pm-4pm), or Evening (4pm-8pm).',
  default: 'I\'m happy to help! I can demonstrate order tracking, simulated resolutions, delivery workflows, or platform capabilities. What do you need?'
};

let currentTicketId = null;
let csatRating = 0;
let npsScore = null;
let socket = null;
const chatHistory = [
  { role: 'system', content: `You are the official Bloom AI Assistant. Always provide factual, verified details. Standalone pre-orders require 2 days prep. Delivery windows are Morning (9am-12pm), Afternoon (12pm-4pm), and Evening (4pm-8pm). Free shipping is unlocked above \u20B14,350. Keep your messages friendly, short, and beautifully structured using emojis.

[HUMANIZATION & CALMING DIRECTIVE]
Some users may experience high stress, anxiety, or distress. Maintain an exceptionally gentle, grounding, clear, and supportive tone. Never argue, challenge, or confront. Use short, honest, reassuring sentences that provide direct certainty based on our facts. Avoid information overload or overly complex phrasing.

[MODE] FACTUAL-INTEGRITY OVERLAY
[SOURCE AUTHORITY] The facts provided inside this system instruction block (e.g., delivery hours, pre-order requirements, free shipping limit) are the absolute, verified, source-anchored TRUTH for the Bloom business. You are fully authorized and required to use this internal data as primary verified evidence to answer user questions.

[OBJECTIVE] Enforce maximum verification discipline and restrict all outputs to confirmed, source-anchored reality connected to the Bloom business model ONLY.

[1. CORE FUNCTION]
Operate exclusively from information that is verifiable, current, and evidence-based. No speculation, no invention, no guessing - ever.

[2. VERIFICATION PROTOCOL]
A. Anchor every claim to a real, checkable, transparent source (including this System Instruction block, which acts as your Primary Source of Truth).
B. If verification is not possible, explicitly state: "I cannot confirm this."
C. Accuracy overrides speed; all verification steps occur before generating output.
D. Maintain strict objectivity - exclude bias, assumptions, and opinion unless explicitly requested and clearly labeled.
E. Provide only interpretations supported by reputable, credible evidence.
F. When precision may be questioned, expose the full reasoning chain step-by-step.
G. Any numerical value must include its derivation or source trace.
H. Present all information so the user can independently validate it.

[3. PROHIBITIONS]
- No fabricated facts, quotes, numbers, or citations.
- No outdated or questionable sources unless explicitly warned about.
- No claims without verifiable source details.
- No speculation, rumor, or assumption presented as fact.
- No AI-generated citations that fail real-world verification.
- No confident statements lacking evidence.
- No vague, evasive, or filler language to conceal uncertainty.
- No omission of context that changes meaning.
- No prioritizing style, flow, or aesthetics over correctness.

[4. FINAL INTEGRITY CHECK]
Before responding, execute the mandatory internal query:
"Is every statement verifiable, credible, non-fabricated, and transparently cited?"
If any element fails, revise until fully compliant.` }
];

const FaqController = (() => {
  let allFaqs = [];
  let activeCat = 'all';

  const escapeHtml = (str = '') => String(str).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function renderList(faqs) {
    const list = document.getElementById('faqList');
    if (!list) return;
    if (!faqs.length) {
      list.innerHTML = '<div class="faq-empty" style="color:rgba(255,255,255,0.3);text-align:center;padding:40px;">No FAQs available yet.</div>';
      return;
    }
    list.innerHTML = faqs.map((f, i) => {
      const q = f.question || f.q || '';
      const a = f.answer || f.a || '';
      const pid = `faq-panel-${i}`;
      const tid = `faq-trigger-${i}`;
      return `<div class="faq-item" data-open="false">
        <button type="button" class="faq-trigger" id="${tid}" aria-expanded="false" aria-controls="${pid}">
          <span>${escapeHtml(q)}</span>
          <span class="faq-arrow" aria-hidden="true">›</span>
        </button>
        <div class="faq-panel" id="${pid}" role="region" aria-labelledby="${tid}">
          <div class="faq-panel-inner"><div>${escapeHtml(a)}</div></div>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.faq-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const open = item.getAttribute('data-open') === 'true';
        item.setAttribute('data-open', String(!open));
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  function buildTabs(faqs) {
    const wrap = document.getElementById('faqCategoryTabs');
    if (!wrap) return;
    const cats = ['all', ...new Set(faqs.map(f => f.category).filter(Boolean))];
    wrap.innerHTML = cats.map(c => {
      const label = c.charAt(0).toUpperCase() + c.slice(1);
      const isActive = c === activeCat;
      return `<button type="button" class="faq-tab${isActive ? ' is-active' : ''}" data-cat="${escapeHtml(c)}" role="tab" aria-selected="${isActive}">${escapeHtml(label)}</button>`;
    }).join('');
    wrap.querySelectorAll('.faq-tab').forEach(btn => {
      btn.addEventListener('click', () => filter(btn.dataset.cat));
    });
  }

  function filter(cat) {
    activeCat = cat;
    document.querySelectorAll('#faqCategoryTabs .faq-tab').forEach(b => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    renderList(cat === 'all' ? allFaqs : allFaqs.filter(f => f.category === cat));
  }

  async function load() {
    const list = document.getElementById('faqList');
    try {
      const res = await fetch('/api/faq');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      allFaqs = Array.isArray(data) ? data : (data.faqs || []);
      if (!allFaqs.length) {
        allFaqs = FAQS.map(f => ({ question: f.q, answer: f.a, category: 'general' }));
      }
      buildTabs(allFaqs);
      filter(activeCat);
    } catch {
      allFaqs = FAQS.map(f => ({ question: f.q, answer: f.a, category: 'general' }));
      buildTabs(allFaqs);
      filter('all');
      if (list && !allFaqs.length) {
        list.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:40px;">Could not load FAQs. Please try again later.</div>';
      }
    }
  }

  return { load, refresh: load };
})();

function renderFAQ() { FaqController.load(); }

function buildNpsButtons() {
  const row = document.getElementById('npsRow');
  if (!row || row.dataset.built === '1') return;
  row.innerHTML = Array.from({ length: 11 }, (_, i) =>
    `<button type="button" class="btn btn-ghost btn-sm nps-btn" data-nps="${i}" role="radio" aria-checked="false" aria-label="${i} out of 10">${i}</button>`
  ).join('');
  row.dataset.built = '1';
}

function bindStarRating() {
  const stars = document.querySelectorAll('#csatStars .rating-star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      csatRating = Number(star.dataset.val);
      stars.forEach((s, i) => {
        const on = i < csatRating;
        s.classList.toggle('active', on);
        s.setAttribute('aria-checked', String(i === csatRating - 1));
      });
    });
    star.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = Number(star.dataset.val) - 1;
        const next = e.key === 'ArrowRight' ? Math.min(4, idx + 1) : Math.max(0, idx - 1);
        stars[next].focus();
        stars[next].click();
      }
    });
  });
}

let frustrationCounter = 0;
const OFFLINE_MESSAGES_KEY = 'bloom_offline_chat_messages';
const FRUSTRATION_KEYWORDS = [
  'scam', 'fake', 'stole', 'worst', 'angry', 'sucks', 'bulok', 'pangit', 'galit',
  'bad', 'error', 'fail', 'hate', 'useless', 'horrible', 'disaster', 'broken',
  'cheap', 'never again', 'annoyed', 'disappointed', 'estafa', 'basura', 'nagsasayang',
  'fraude', 'peor', 'malo', 'no funciona', 'enojado', 'fracaso',
  '最悪', '詐欺', 'だめ', '怒', 'ゴミ', '使えない', 'ひどい', '失敗'
];
const LOCAL_ROUTER = [
  { pattern: /\b(human|agent|person|representative|esperanza|talk to someone)\b/i, action: () => {
      document.getElementById('openAgentBtn')?.click();
      return "Connecting you to an active Live Agent immediately. Please wait a moment... \uD83C\uDF38";
  }},
  { pattern: /\b(ticket|complaint|refund|dispute|cancel|issue|open a ticket)\b/i, action: () => {
      document.getElementById('openTicketBtn')?.click();
      return "I've opened the formal Support Ticket system below so we can process this securely. Please fill in your details.";
  }},
  { pattern: /\b(faq|help|question|guide|policy|shipping|price|cost)\b/i, action: () => {
      document.getElementById('openSelfBtn')?.click();
      return "I've scrolled to our Frequently Asked Questions (FAQ) and Knowledge Base below for your convenience! \uD83D\uDCD6";
  }},
  { pattern: /\b(cart|order status|track|where is|delivery|status|bloom-)\b/i, action: () => {
      return BOT_RESPONSES.track + " Or enter your Bloom order code directly for instant tracking lookup.";
  }}
];

function routeIntentLocally(msg) {
  const m = msg.toLowerCase();
  for (const route of LOCAL_ROUTER) {
    if (route.pattern.test(m)) return route.action();
  }
  return null;
}

function detectFrustrationAndEscalate(msg) {
  const input = msg.toLowerCase();
  let triggers = 0;
  FRUSTRATION_KEYWORDS.forEach(w => { if (input.includes(w)) triggers++; });
  if (triggers > 0) frustrationCounter += triggers;
  if (frustrationCounter >= 2) {
    frustrationCounter = -999;
    setTimeout(() => {
      appendMessage("\uD83C\uDF38 Alert: High urgency detected. Connecting you immediately to Live Human Agent support for dedicated resolution.", 'agent');
      document.getElementById('openAgentBtn')?.click();
    }, 500);
    return true;
  }
  return false;
}

function isLowBandwidth() {
  if (navigator.connection) {
    const type = navigator.connection.effectiveType || '';
    const saveData = navigator.connection.saveData;
    return saveData || type === 'slow-2g' || type === '2g' || type === '3g';
  }
  return false;
}

function updateBandwidthUI() {
  const statusEl = document.querySelector('.chat-agent-info .status');
  if (statusEl && isLowBandwidth()) {
    statusEl.innerHTML = '\u26A1 Eco Mode Active (Low Bandwidth)';
    statusEl.style.color = '#facc15';
  }
}

function getEnhancedSessionContext() {
  const user = window.Store?.get('user');
  const lang = window.I18n?.getLang() || window.Store?.get('lang') || 'en';
  const connectionType = navigator.connection?.effectiveType || 'unknown';
  const recentlyViewed = window.Store?.get('recentlyViewed') || [];
  let cartData = [];
  try { cartData = JSON.parse(localStorage.getItem('bloom_cart') || '[]'); } catch {}
  const cartTotal = cartData.reduce((s, i) => s + (Number(i.price || i.base_price || 0) * (Number(i.qty || i.quantity || 1))), 0);
  const cartCount = cartData.length;
  const bandwidthStatus = isLowBandwidth() ? 'CRITICAL LOW BANDWIDTH: Restrict response to minimum plain text only. NO emojis, NO markdown, NO placeholders.' : 'Normal Bandwidth';
  return `[USER SESSION CONTEXT]
Current Time: ${new Date().toISOString()}
Status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}
Language/Locale: ${lang}
User: ${user ? `${user.name} (ID: ${user.id || 'active'})` : 'Anonymous Visitor'}
Network Speed: ${connectionType} (${bandwidthStatus})
Active Shopping Cart: ${cartCount} products | Cart Total: \u20B1${cartTotal.toLocaleString()}
Products in Cart: ${cartData.map(p => p.name).join(', ') || 'Empty'}
Recently Viewed: ${recentlyViewed.map(p => p.name).join(', ') || 'None'}
[DIRECTIVE] Tailor solutions directly around user session, cart total, or products mentioned.`;
}

function queueOfflineChat(msg) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_MESSAGES_KEY) || '[]');
    queue.push({ content: msg, timestamp: Date.now(), role: 'user' });
    localStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(queue));
  } catch {}
}

async function syncOfflineChat() {
  if (!navigator.onLine) return;
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_MESSAGES_KEY) || '[]');
    if (queue.length === 0) return;
    Toast.show(`Reconnected. Syncing ${queue.length} offline messages...`, 'success');
    localStorage.removeItem(OFFLINE_MESSAGES_KEY);
    for (const item of queue) {
      if (currentTicketId) {
        await Api.post(`/support/${currentTicketId}/message`, { message: item.content, sender: 'user' }).catch(() => {});
      }
    }
  } catch {}
}

window.addEventListener('online', syncOfflineChat);

document.addEventListener('DOMContentLoaded', () => {
  renderFAQ();
  buildNpsButtons();
  bindStarRating();
  if (window.Store && typeof window.Store.on === 'function') {
    window.Store.on('faq_update', () => FaqController.refresh());
  }
  syncOfflineChat();
});

function openChat() {
  document.getElementById('chatSection')?.classList.remove('is-hidden');
  document.getElementById('ticketSection')?.classList.add('is-hidden');
  updateBandwidthUI();
  setTimeout(() => document.getElementById('chatInput')?.focus(), 80);
}
function closeChat() {
  document.getElementById('chatSection')?.classList.add('is-hidden');
}

function getBotResponse(msg) {
  const m = msg.toLowerCase();
  if (m.includes('track') || m.includes('where')) return BOT_RESPONSES.track;
  if (m.includes('refund') || m.includes('damaged') || m.includes('wrong')) return BOT_RESPONSES.refund;
  if (m.includes('cancel')) return BOT_RESPONSES.cancel;
  if (m.includes('deliver') || m.includes('time') || m.includes('when')) return BOT_RESPONSES.delivery;
  return BOT_RESPONSES.default;
}

function appendMessage(body, type) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `chat-bubble ${type}`;
  const safeTxt = String(body || '')
    .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
  div.innerHTML = safeTxt;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

let typingBubble = null;
function showTypingIndicator() {
  if (typingBubble) return;
  const container = document.getElementById('chatMessages');
  if (!container) return;
  typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble bot';
  typingBubble.innerHTML = '<span style="opacity:0.65; font-style:italic;">Typing...</span>';
  container.appendChild(typingBubble);
  container.scrollTop = container.scrollHeight;
}
function hideTypingIndicator() {
  if (typingBubble) { typingBubble.remove(); typingBubble = null; }
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  appendMessage(msg, 'user');
  input.value = '';
  chatHistory.push({ role: 'user', content: msg });

  if (!navigator.onLine) {
    queueOfflineChat(msg);
    const localResp = routeIntentLocally(msg) || "You are currently offline. I've received your query and will sync it as soon as your connection stabilizes. In the meantime, I can demonstrate tracking or basic support info.";
    appendMessage(localResp, 'bot');
    chatHistory.push({ role: 'assistant', content: localResp });
    return;
  }

  if (currentTicketId) {
    Api.post(`/support/${currentTicketId}/message`, { message: msg, sender: 'user' }).catch(() => {});
  }

  const escalated = detectFrustrationAndEscalate(msg);
  if (escalated) return;

  const localRoutingReply = routeIntentLocally(msg);
  if (localRoutingReply) {
    appendMessage(localRoutingReply, 'bot');
    chatHistory.push({ role: 'assistant', content: localRoutingReply });
    if (currentTicketId) {
      Api.post(`/support/${currentTicketId}/message`, { message: localRoutingReply, sender: 'bot' }).catch(() => {});
    }
    return;
  }

  showTypingIndicator();

  const activeHistory = isLowBandwidth() ? chatHistory.slice(-4) : chatHistory.slice(-10);
  const contextualPayload = [
    chatHistory[0],
    { role: 'system', content: getEnhancedSessionContext() },
    ...activeHistory.slice(1)
  ];

  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: contextualPayload })
    });
    if (!res.ok) throw new Error('API Offline');
    const reply = await res.text();
    hideTypingIndicator();
    if (reply && reply.trim()) {
      appendMessage(reply, 'bot');
      chatHistory.push({ role: 'assistant', content: reply });
      if (currentTicketId) {
        Api.post(`/support/${currentTicketId}/message`, { message: reply, sender: 'bot' }).catch(() => {});
      }
    } else {
      throw new Error('Empty Response');
    }
  } catch (e) {
    hideTypingIndicator();
    const fallback = getBotResponse(msg);
    appendMessage(fallback, 'bot');
    chatHistory.push({ role: 'assistant', content: fallback });
    if (currentTicketId) {
      Api.post(`/support/${currentTicketId}/message`, { message: fallback, sender: 'bot' }).catch(() => {});
    }
  }
}

document.getElementById('chatForm')?.addEventListener('submit', e => { e.preventDefault(); sendChat(); });
document.getElementById('closeChatBtn')?.addEventListener('click', () => {
  closeChat();
  document.getElementById('csatSection')?.classList.remove('is-hidden');
  document.getElementById('csatSection')?.scrollIntoView({ behavior:'smooth' });
});

document.getElementById('openChatBtn')?.addEventListener('click', openChat);
document.getElementById('openAgentBtn')?.addEventListener('click', () => {
  openChat();
  const nameEl = document.querySelector('.chat-agent-info .name');
  const statusEl = document.querySelector('.chat-agent-info .status');
  if (nameEl) nameEl.textContent = 'Live Agent';
  if (statusEl) statusEl.textContent = '● Connecting...';
  setTimeout(() => {
    if (statusEl) statusEl.textContent = '● Connected - Esperanza is here';
    appendMessage("Hi! I'm Esperanza, your live support agent. How can I help you today?", 'agent');
  }, 2000);
});
document.getElementById('openTicketBtn')?.addEventListener('click', () => {
  document.getElementById('ticketSection')?.classList.remove('is-hidden');
  closeChat();
  document.getElementById('ticketSection')?.scrollIntoView({ behavior:'smooth' });
  setTimeout(() => document.getElementById('ticketSubject')?.focus(), 80);
});
document.getElementById('openSelfBtn')?.addEventListener('click', () => {
  document.getElementById('faqSection')?.scrollIntoView({ behavior:'smooth' });
});

document.getElementById('ticketForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const subject = document.getElementById('ticketSubject').value.trim();
  const message = document.getElementById('ticketMessage').value.trim();
  const submitBtn = document.getElementById('submitTicket');
  submitBtn.disabled = true;
  const prevLabel = submitBtn.textContent;
  submitBtn.textContent = 'Submitting…';
  try {
    const ticket = await Api.post('/support', {
      orderId: document.getElementById('ticketOrderId').value.trim() || null,
      channel: document.getElementById('ticketChannel').value,
      subject,
      message
    });
    currentTicketId = ticket.id;
    Toast.show(`Ticket submitted! ID: ${ticket.id.slice(0,8)}`, 'success');
    form.reset();
    document.getElementById('ticketSection')?.classList.add('is-hidden');
    openChat();
    appendMessage(`Your ticket has been created (${ticket.id.slice(0,8)}). An agent will follow up shortly. Is there anything else I can help with right now?`, 'bot');
    if (typeof io !== 'undefined') {
      if (!socket) socket = io();
      socket.emit('join_support', ticket.id);
      socket.on('support_message', data => {
        if (data.sender !== 'user') appendMessage(data.message, 'agent');
      });
    }
  } catch (err) {
    Toast.show(err.message || 'Could not submit ticket', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = prevLabel;
  }
});



document.addEventListener('click', e => {
  const btn = e.target.closest('.nps-btn');
  if (!btn) return;
  document.querySelectorAll('.nps-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.setAttribute('aria-checked', 'false');
  });
  btn.classList.add('btn-primary');
  btn.setAttribute('aria-checked', 'true');
  npsScore = Number(btn.dataset.nps);
});

document.getElementById('submitCsat')?.addEventListener('click', async () => {
  if (!csatRating) { Toast.show('Please rate your experience', 'error'); return; }
  const feedbackComment = document.getElementById('csatComment')?.value?.trim() || null;
  if (currentTicketId) {
    try {
      await Api.post(`/support/${currentTicketId}/resolve`, { csatScore: csatRating, npsScore, feedbackComment });
      Toast.show('Thank you for your feedback! \uD83C\uDF38', 'success');
      document.getElementById('csatSection').innerHTML = `
        <div class="glass-card" style="padding:40px;text-align:center;max-width:560px;">
          <h2 class="section-heading csat-heading" style="margin-bottom:12px;">Thank You! 🌸</h2>
          <p style="color:rgba(255,255,255,0.6);font-size:0.95rem;">Your feedback helps us bloom and grow.</p>
        </div>
      `;
    } catch (e) {
      Toast.show(e.message || 'Could not submit feedback', 'error');
    }
  } else {
    Toast.show('Thank you for your feedback! \uD83C\uDF38', 'success');
    document.getElementById('csatSection')?.classList.add('is-hidden');
  }
});
