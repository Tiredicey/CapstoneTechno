import { Api } from './core/Api.js';
import { Store } from './core/Store.js';
import { Toast } from './core/Auth.js';

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

function renderFAQ() {
  const list = document.getElementById('faqList');
  if (!list) return;
  list.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" id="faq${i}">
      <div class="faq-question" data-idx="${i}">
        <span>${f.q}</span>
        <span style="color:rgba(255,255,255,0.3);transition:transform 0.3s;" class="faq-arrow">▾</span>
      </div>
      <div class="faq-answer">${f.a}</div>
    </div>`).join('');
  list.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = document.getElementById(`faq${q.dataset.idx}`);
      const wasOpen = item.classList.contains('open');
      list.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

function openChat() {
  document.getElementById('chatSection').style.display = 'block';
  document.getElementById('ticketSection').style.display = 'none';
  document.getElementById('chatSection').scrollIntoView({ behavior:'smooth' });
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

document.getElementById('chatSend')?.addEventListener('click', sendChat);
document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
document.getElementById('closeChatBtn')?.addEventListener('click', () => {
  document.getElementById('chatSection').style.display = 'none';
  document.getElementById('csatSection').style.display = 'block';
  document.getElementById('csatSection').scrollIntoView({ behavior:'smooth' });
});

document.getElementById('openChatBtn')?.addEventListener('click', openChat);
document.getElementById('openAgentBtn')?.addEventListener('click', async () => {
  openChat();
  document.querySelector('.chat-agent-info .name').textContent = 'Live Agent';
  document.querySelector('.chat-agent-info .status').textContent = '● Connecting...';
  setTimeout(() => {
    document.querySelector('.chat-agent-info .status').textContent = '● Connected — Esperanza is here';
    appendMessage('Hi! I\'m Esperanza, your live support agent. How can I help you today?', 'agent');
  }, 2000);
});
document.getElementById('openTicketBtn')?.addEventListener('click', () => {
  document.getElementById('ticketSection').style.display = 'block';
  document.getElementById('chatSection').style.display = 'none';
  document.getElementById('ticketSection').scrollIntoView({ behavior:'smooth' });
});
document.getElementById('openSelfBtn')?.addEventListener('click', () => {
  document.getElementById('faqSection').scrollIntoView({ behavior:'smooth' });
});

document.getElementById('submitTicket')?.addEventListener('click', async () => {
  const subject = document.getElementById('ticketSubject')?.value?.trim();
  const message = document.getElementById('ticketMessage')?.value?.trim();
  if (!subject || !message) { Toast.show('Subject and message required', 'error'); return; }
  try {
    const ticket = await Api.post('/support', {
      orderId: document.getElementById('ticketOrderId')?.value?.trim() || null,
      channel: document.getElementById('ticketChannel')?.value,
      subject,
      message
    });
    currentTicketId = ticket.id;
    Toast.show(`Ticket submitted! ID: ${ticket.id.slice(0,8)}`, 'success');
    document.getElementById('ticketSection').style.display = 'none';
    document.getElementById('chatSection').style.display = 'block';
    appendMessage(`Your ticket has been created (${ticket.id.slice(0,8)}). An agent will follow up shortly. Is there anything else I can help with right now?`, 'bot');
    if (typeof io !== 'undefined') {
      if (!socket) socket = io();
      socket.emit('join_support', ticket.id);
      socket.on('support_message', data => {
        if (data.sender !== 'user') appendMessage(data.message, 'agent');
      });
    }
  } catch (e) { Toast.show(e.message || 'Could not submit ticket', 'error'); }
});

document.querySelectorAll('.rating-star').forEach(star => {
  star.addEventListener('click', () => {
    csatRating = Number(star.dataset.val);
    document.querySelectorAll('.rating-star').forEach((s,i) => {
      s.classList.toggle('active', i < csatRating);
    });
  });
});

document.addEventListener('click', e => {
  if (e.target.classList.contains('nps-btn')) {
    document.querySelectorAll('.nps-btn').forEach(b => b.classList.remove('btn-primary'));
    e.target.classList.add('btn-primary');
    npsScore = Number(e.target.dataset.nps);
  }
});

document.getElementById('submitCsat')?.addEventListener('click', async () => {
  if (!csatRating) { Toast.show('Please rate your experience', 'error'); return; }
  if (currentTicketId) {
    try {
      await Api.post(`/support/${currentTicketId}/resolve`, { csatScore: csatRating, npsScore });
      Toast.show('Thank you for your feedback! 🌸', 'success');
      document.getElementById('csatSection').innerHTML = `
        <div class="glass-card" style="padding:40px;text-align:center;max-width:560px;">
          