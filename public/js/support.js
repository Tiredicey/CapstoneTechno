const { Api, Store, Toast } = window;
const FAQS = [
  { q: 'How far in advance should I pre-order?', a: 'We recommend ordering at least 2 days in advance. For large corporate or wedding orders, 7-14 days ensures the best selection and preparation.' },
  { q: 'Can I change my delivery date after ordering?', a: 'Yes! Contact support at least 24 hours before your scheduled delivery and we\'ll reschedule at no charge.' },
  { q: 'What is your refund policy?', a: 'If your arrangement arrives damaged or differs significantly from your order, we offer a full replacement or refund within 24 hours of delivery. Submit a ticket with a photo.' },
  { q: 'Do you offer corporate bulk pricing?', a: 'Yes — for orders of 10+ arrangements, contact our B2B team through the support ticket system and mention "corporate" in your subject.' },
  { q: 'How do loyalty points work?', a: 'You earn 10 points per dollar spent. Points can be redeemed at checkout at a rate of $0.01 per point, up to 10% of your order total.' },
  { q: 'Can I track my delivery in real time?', a: 'Yes! Use our Track Order page with your order code. You\'ll receive socket-powered live status updates as your order moves through each stage.' }
];

const BOT_RESPONSES = {
  track: 'To track your order, visit the **Track Order** page and enter your order code (starts with BLOOM-). Or tell me your order code and I\'ll look it up!',
  refund: 'For refund requests, I\'ll need your order ID and a photo of the issue. You can also submit a support ticket for fastest processing. Would you like me to open one for you?',
  cancel: 'Orders can be cancelled up to 12 hours before the scheduled delivery. What\'s your order code?',
  delivery: 'Delivery times depend on your selected time slot: Morning (9am–12pm), Afternoon (12pm–4pm), or Evening (4pm–8pm).',
  default: 'I\'m happy to help! I can assist with order tracking, refunds, delivery questions, or product information. What do you need?'
};

let currentTicketId = null;
let csatRating = 0;
let npsScore = null;
let socket = null;

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

document.addEventListener('DOMContentLoaded', () => {
  renderFAQ();
  buildNpsButtons();
  bindStarRating();
  if (window.Store && typeof window.Store.on === 'function') {
    window.Store.on('faq_update', () => FaqController.refresh());
  }
});

function openChat() {
  document.getElementById('chatSection')?.classList.remove('is-hidden');
  document.getElementById('ticketSection')?.classList.add('is-hidden');
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
  const div = document.createElement('div');
  div.className = `chat-bubble ${type}`;
  div.textContent = body;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  appendMessage(msg, 'user');
  input.value = '';
  setTimeout(() => {
    appendMessage(getBotResponse(msg), 'bot');
    if (currentTicketId) {
      Api.post(`/support/${currentTicketId}/message`, { message: msg, sender: 'user' }).catch(() => {});
    }
  }, 600);
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
    if (statusEl) statusEl.textContent = '● Connected — Esperanza is here';
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
  if (currentTicketId) {
    try {
      await Api.post(`/support/${currentTicketId}/resolve`, { csatScore: csatRating, npsScore });
      Toast.show('Thank you for your feedback! 🌸', 'success');
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
    Toast.show('Thank you for your feedback! 🌸', 'success');
    document.getElementById('csatSection')?.classList.add('is-hidden');
  }
});
