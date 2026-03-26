// ─── In-memory fallback when chrome.storage unavailable (dev preview) ───
const memStore = {};
const storage = {
  async get(defaults) {
    try {
      return await chrome.storage.local.get(defaults);
    } catch {
      const result = {};
      for (const [k,v] of Object.entries(defaults)) result[k] = (k in memStore) ? memStore[k] : v;
      return result;
    }
  },
  async set(data) {
    try {
      await chrome.storage.local.set(data);
    } catch {
      Object.assign(memStore, data);
    }
  }
};

const DEFAULTS = {
  enabled: true,
  collectedCount: 0,
  recentLogs: [],
  webhookUrl: "",
  filterKeywords: [
    'claude','codex','claude code','ai','chatgpt','perplexity',
    'openai','anthropic','gemini','gpt','llm','cursor',
    'copilot','midjourney','stable diffusion','sora','devin',
    'vibe coding','agent','agi'
  ],
  highlightKeywords: ['openclaw','manus','genspark']
};

const PRESETS = {
  ai: ['ai','llm','gpt','claude','chatgpt','gemini','openai','anthropic','copilot','cursor','agent','agi','sora','midjourney','stable diffusion','devin','vibe coding'],
  dev: ['react','nextjs','typescript','rust','golang','docker','kubernetes','github','vercel','supabase','tailwind','shadcn','vscode'],
  crypto: ['bitcoin','ethereum','web3','nft','defi','solana','crypto','blockchain','token'],
  design: ['figma','design','ui/ux','typography','branding','illustration','motion','framer'],
  marketing: ['seo','growth','analytics','conversion','funnel','content marketing','social media','ads']
};

const $ = id => document.getElementById(id);

let state = {};

init();

async function init() {
  state = await storage.get(DEFAULTS);
  render();
  bindEvents();
}

function render() {
  $('enabled').checked = !!state.enabled;
  updateStatus(state.enabled);
  $('count').textContent = state.collectedCount || 0;
  $('webhookUrl').value = state.webhookUrl || '';
  renderChips('filter', state.filterKeywords || []);
  renderChips('highlight', state.highlightKeywords || []);
  renderLogs(state.recentLogs || []);
}

function bindEvents() {
  // Toggle
  $('enabled').addEventListener('change', async () => {
    state.enabled = $('enabled').checked;
    await storage.set({ enabled: state.enabled });
    updateStatus(state.enabled);
  });

  // Tabs (segmented control)
  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('on'));
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
      btn.classList.add('on');
      $(`p-${btn.dataset.p}`).classList.add('on');
    });
  });

  // Save
  $('saveBtn').addEventListener('click', async () => {
    await storage.set({ webhookUrl: $('webhookUrl').value.trim() });
    try { await chrome.runtime.sendMessage({ type: 'settings-updated' }); } catch {}
    toast('Settings saved ✓');
  });

  // Enter to add
  $('fInp').addEventListener('keydown', e => { if (e.key === 'Enter') addKeyword('filter'); });
  $('hInp').addEventListener('keydown', e => { if (e.key === 'Enter') addKeyword('highlight'); });

  // Storage listener
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.collectedCount) $('count').textContent = changes.collectedCount.newValue || 0;
      if (changes.recentLogs) renderLogs(changes.recentLogs.newValue || []);
      if (changes.enabled) { state.enabled = changes.enabled.newValue; $('enabled').checked = !!state.enabled; updateStatus(state.enabled); }
      if (changes.filterKeywords) { state.filterKeywords = changes.filterKeywords.newValue || []; renderChips('filter', state.filterKeywords); }
      if (changes.highlightKeywords) { state.highlightKeywords = changes.highlightKeywords.newValue || []; renderChips('highlight', state.highlightKeywords); }
    });
  } catch {}
}

function updateStatus(on) {
  $('statusText').textContent = on ? 'Collecting…' : 'Stopped';
  $('dot').classList.toggle('on', !!on);
}

// ─── Chips ───

function renderChips(type, keywords) {
  const cloud = type === 'filter' ? $('fCloud') : $('hCloud');
  const badge = type === 'filter' ? $('fBadge') : $('hBadge');
  const stat = type === 'filter' ? $('kwCount') : $('hlCount');
  const cls = type === 'highlight' ? ' hl' : '';
  // hl class for highlight tags (orange style)

  cloud.innerHTML = keywords.map(kw =>
    `<span class="tag${cls}">${esc(kw)}<span class="del" data-type="${type}" data-kw="${esc(kw)}">×</span></span>`
  ).join('');

  cloud.querySelectorAll('.del').forEach(x => {
    x.addEventListener('click', () => removeKeyword(x.dataset.type, x.dataset.kw));
  });

  badge.textContent = keywords.length;
  stat.textContent = keywords.length;
}

async function addKeyword(type) {
  const input = type === 'filter' ? $('fInp') : $('hInp');
  const val = input.value.trim().toLowerCase();
  if (!val) return;

  const key = type === 'filter' ? 'filterKeywords' : 'highlightKeywords';
  const data = await storage.get({ [key]: [] });
  const kws = data[key] || [];
  if (kws.includes(val)) { toast('Already added'); return; }

  kws.push(val);
  await storage.set({ [key]: kws });
  state[key] = kws;
  renderChips(type, kws);
  input.value = '';
  try { await chrome.runtime.sendMessage({ type: 'keywords-updated' }); } catch {}
  toast(`Added "${val}" ✓`);
}
window.addKeyword = addKeyword;

async function removeKeyword(type, kw) {
  const key = type === 'filter' ? 'filterKeywords' : 'highlightKeywords';
  const data = await storage.get({ [key]: [] });
  const kws = (data[key] || []).filter(k => k !== kw);
  await storage.set({ [key]: kws });
  state[key] = kws;
  renderChips(type, kws);
  try { await chrome.runtime.sendMessage({ type: 'keywords-updated' }); } catch {}
}

async function applyPreset(id) {
  const preset = PRESETS[id];
  if (!preset) return;
  const data = await storage.get({ filterKeywords: [] });
  const existing = new Set(data.filterKeywords || []);
  let added = 0;
  for (const kw of preset) { if (!existing.has(kw)) { existing.add(kw); added++; } }
  const kws = [...existing];
  await storage.set({ filterKeywords: kws });
  state.filterKeywords = kws;
  renderChips('filter', kws);
  try { await chrome.runtime.sendMessage({ type: 'keywords-updated' }); } catch {}
  toast(`+${added} keywords from preset ✓`);
}
window.applyPreset = applyPreset;

// ─── Logs ───

function renderLogs(logs) {
  if (!logs || !logs.length) {
    $('logs').innerHTML = `<div class="nil"><div class="ico">✨</div><p>No posts collected yet.<br>Open X and start scrolling!</p></div>`;
    return;
  }
  $('logs').innerHTML = logs.slice(0, 12).map(l => `
    <div class="log-row">
      <div class="log-pic">𝕏</div>
      <div class="log-info">
        <div class="log-name">${esc(l.handle || '')}</div>
        <div class="log-text">${esc((l.text || '').slice(0, 100))}</div>
        <div class="log-nums">
          <span>♡ ${l.likes || 0}</span>
          <span>🔄 ${l.retweets || 0}</span>
          <span>👁 ${l.views || 0}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Helpers ───

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
