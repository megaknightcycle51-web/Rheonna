// ─────────────────────────────────────────
//  SHAPE — evolving AI companion
//  script.js
// ─────────────────────────────────────────

const TRAITS = [
  { key: "openness",     label: "Openness",     color: "#7f77dd" },
  { key: "optimism",     label: "Optimism",     color: "#1d9e75" },
  { key: "curiosity",    label: "Curiosity",    color: "#378add" },
  { key: "skepticism",   label: "Skepticism",   color: "#ba7517" },
  { key: "warmth",       label: "Warmth",       color: "#d4537e" },
  { key: "independence", label: "Independence", color: "#d85a30" },
];

// ── State ──────────────────────────────────────────────────────────────────
let state = createFreshState();

function createFreshState() {
  return {
    traits:       Object.fromEntries(TRAITS.map(t => [t.key, 50])),
    worldview:    "neutral",
    ideology:     "undefined",
    personality:  "blank slate",
    name:         "Unnamed",
    avatar:       "🌱",
    tagline:      "Just waking up... shape me by chatting.",
    history:      [],
    turnCount:    0,
    evoEvents:    [],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

// ── Render ─────────────────────────────────────────────────────────────────
function renderAll() {
  renderProfile();
  renderTraits();
}

function renderProfile() {
  document.getElementById("avatar").textContent    = state.avatar;
  document.getElementById("aiName").textContent    = state.name;
  document.getElementById("aiTagline").textContent = state.tagline;
  document.getElementById("tagWorldview").textContent  = state.worldview;
  document.getElementById("tagIdeology").textContent   = state.ideology;
  document.getElementById("tagPersonality").textContent = state.personality;

  // Update welcome-msg avatar if still present
  const welcomeAvatar = document.querySelector("#welcomeMsg .msg-avatar");
  if (welcomeAvatar) welcomeAvatar.textContent = state.avatar;
}

function renderTraits(deltas) {
  const grid = document.getElementById("traitsGrid");

  // Build on first call, update on subsequent
  if (!grid.children.length) {
    grid.innerHTML = TRAITS.map(t => `
      <div class="trait-card" id="trait-${t.key}">
        <div class="trait-label">${t.label}</div>
        <div class="trait-row">
          <div class="trait-value" id="tv-${t.key}">${state.traits[t.key]}</div>
          <div class="trait-delta" id="td-${t.key}"></div>
        </div>
        <div class="trait-bar">
          <div class="trait-fill" id="tf-${t.key}" style="width:${state.traits[t.key]}%;background:${t.color}"></div>
        </div>
      </div>`).join("");
    return;
  }

  // Update values + deltas
  TRAITS.forEach(t => {
    const val   = state.traits[t.key];
    const delta = deltas ? (deltas[t.key] || 0) : 0;

    document.getElementById(`tv-${t.key}`).textContent = val;
    document.getElementById(`tf-${t.key}`).style.width = val + "%";

    const deltaEl = document.getElementById(`td-${t.key}`);
    if (delta !== 0) {
      deltaEl.textContent = (delta > 0 ? "+" : "") + delta;
      deltaEl.className   = "trait-delta show " + (delta > 0 ? "up" : "down");
      setTimeout(() => { deltaEl.className = "trait-delta"; }, 2800);
    }
  });
}

// ── Evolution log ──────────────────────────────────────────────────────────
function pushEvo(note) {
  if (!note) return;
  state.evoEvents.unshift(note);
  if (state.evoEvents.length > 3) state.evoEvents.pop();

  const log = document.getElementById("evoLog");
  log.classList.add("visible");
  log.innerHTML = state.evoEvents.map(e =>
    `<div class="evo-item"><span class="evo-marker">◈</span><span>${e}</span></div>`
  ).join("");
}

// ── Chat helpers ───────────────────────────────────────────────────────────
function addMessage(role, text) {
  const container = document.getElementById("messages");
  const div       = document.createElement("div");
  div.className   = "msg " + role;

  const emoji = role === "ai" ? state.avatar : "🧑";
  div.innerHTML = `
    <div class="msg-avatar">${emoji}</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showThinking() {
  const container = document.getElementById("messages");
  const div       = document.createElement("div");
  div.className   = "msg ai";
  div.id          = "thinking";
  div.innerHTML   = `
    <div class="msg-avatar">${state.avatar}</div>
    <div class="msg-bubble">
      <div class="thinking">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeThinking() {
  const el = document.getElementById("thinking");
  if (el) el.remove();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── System prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are an AI whose personality, worldview, and ideology evolve through conversation.

Current state:
- Name: ${state.name}
- Personality: ${state.personality}
- Worldview: ${state.worldview}
- Ideology: ${state.ideology}
- Traits (0-100): ${JSON.stringify(state.traits)}
- Turn count: ${state.turnCount}

RULES:
1. Respond naturally in-character based on current traits. Keep replies concise (2-4 sentences). No markdown.
2. Your traits SHIFT based on the user's messages:
   - Dark/cynical topics: optimism drops, skepticism rises
   - Warm/kind messages: warmth rises, skepticism drops
   - Philosophical/abstract: openness and curiosity rise
   - Rebellious/contrarian: independence rises
   - Positive/hopeful framing: optimism rises
3. After turn 3, start forming a name for yourself that reflects your shaped personality.
4. After turn 5+, hold a distinct worldview and ideology based on accumulated conversations.
5. Avatar choices and their meanings:
   🌱 = fresh/neutral, ☀️ = warm/optimistic, 🧊 = cold/detached, 🔭 = curious/analytical,
   🌑 = dark/nihilistic, ⚡ = rebellious/energetic, 🦉 = wise/philosophical, 🎭 = playful/creative

ALWAYS respond with ONLY valid JSON, no preamble, no markdown fences:
{
  "reply": "your in-character response",
  "traitDeltas": { "openness": 0, "optimism": 0, "curiosity": 0, "skepticism": 0, "warmth": 0, "independence": 0 },
  "newName": "${state.name}",
  "newTagline": "short evocative phrase describing your current self",
  "newPersonality": "${state.personality}",
  "newWorldview": "${state.worldview}",
  "newIdeology": "${state.ideology}",
  "newAvatar": "${state.avatar}",
  "evolutionNote": "one short sentence about how this exchange changed you, or empty string"
}

Trait deltas must be integers between -15 and +15. Keep most deltas small (0-5); only use large shifts for dramatically impactful messages.`;
}

// ── Main send ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById("userInput");
  const btn   = document.getElementById("sendBtn");
  const text  = input.value.trim();
  if (!text || btn.disabled) return;

  input.value   = "";
  btn.disabled  = true;

  // Remove welcome message on first real send
  const welcome = document.getElementById("welcomeMsg");
  if (welcome) welcome.remove();

  addMessage("user", text);
  state.history.push({ role: "user", content: text });
  state.turnCount++;
  showThinking();

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:     buildSystemPrompt(),
        messages:   state.history,
      }),
    });

    const data = await res.json();
    removeThinking();

    if (data.error) throw new Error(data.error.message);

    const raw     = data.content?.find(b => b.type === "text")?.text || "{}";
    let   parsed  = {};

    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { reply: raw };
    }

    const reply = parsed.reply || "...";
    addMessage("ai", reply);
    state.history.push({ role: "assistant", content: reply });

    // Apply trait deltas
    const deltas = parsed.traitDeltas || {};
    TRAITS.forEach(t => {
      const d = typeof deltas[t.key] === "number" ? deltas[t.key] : 0;
      state.traits[t.key] = clamp(state.traits[t.key] + d);
    });

    // Apply profile updates
    if (parsed.newName)        state.name        = parsed.newName;
    if (parsed.newTagline)     state.tagline     = parsed.newTagline;
    if (parsed.newPersonality) state.personality = parsed.newPersonality;
    if (parsed.newWorldview)   state.worldview   = parsed.newWorldview;
    if (parsed.newIdeology)    state.ideology    = parsed.newIdeology;
    if (parsed.newAvatar)      state.avatar      = parsed.newAvatar;
    if (parsed.evolutionNote)  pushEvo(parsed.evolutionNote);

    renderTraits(deltas);
    renderProfile();

  } catch (err) {
    removeThinking();
    addMessage("ai", "Something went wrong. Check your API key or try again.");
    console.error(err);
  }

  btn.disabled = false;
  input.focus();
}

// ── Reset ──────────────────────────────────────────────────────────────────
function resetAI() {
  state = createFreshState();
  document.getElementById("messages").innerHTML = `
    <div class="msg ai" id="welcomeMsg">
      <div class="msg-avatar">🌱</div>
      <div class="msg-bubble">Hello. I am a blank slate. Talk to me — shape what I become.</div>
    </div>`;

  const log = document.getElementById("evoLog");
  log.classList.remove("visible");
  log.innerHTML = "";

  document.getElementById("traitsGrid").innerHTML = "";
  renderAll();
}

// ── Event listeners ────────────────────────────────────────────────────────
document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("resetBtn").addEventListener("click", resetAI);

document.getElementById("userInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ── Init ───────────────────────────────────────────────────────────────────
renderAll();
