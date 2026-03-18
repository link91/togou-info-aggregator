(function () {
  if (window.top !== window || window.__TUGOU_RADAR_OVERLAY__) {
    return;
  }
  window.__TUGOU_RADAR_OVERLAY__ = true;

  const STORAGE_KEY = "tugouRadarOverlayStateV1";
  const DEFAULT_API_BASE = "https://tugoumeme.fun";
  const EXTENSION_ICON_URL = chrome?.runtime?.getURL
    ? chrome.runtime.getURL("icon-128.png")
    : `${DEFAULT_API_BASE}/favicon.svg`;
  const MAX_MESSAGES = 120;
  const DEFAULT_WIDTH = 420;
  const DEFAULT_HEIGHT = 680;
  const MIN_WIDTH = 340;
  const MIN_HEIGHT = 420;
  const SOUND_PRESETS = {
    chime: {
      label: "清脆",
      notes: [
        { frequency: 784, duration: 0.08, type: "triangle", gain: 0.08, gap: 0.02 },
        { frequency: 1174.66, duration: 0.14, type: "sine", gain: 0.1, gap: 0.04 }
      ]
    },
    soft: {
      label: "柔和",
      notes: [
        { frequency: 523.25, duration: 0.09, type: "sine", gain: 0.06, gap: 0.03 },
        { frequency: 659.25, duration: 0.12, type: "triangle", gain: 0.07, gap: 0.04 }
      ]
    },
    alert: {
      label: "提醒",
      notes: [
        { frequency: 659.25, duration: 0.07, type: "square", gain: 0.07, gap: 0.03 },
        { frequency: 880, duration: 0.08, type: "square", gain: 0.075, gap: 0.03 },
        { frequency: 1318.51, duration: 0.1, type: "triangle", gain: 0.085, gap: 0.04 }
      ]
    }
  };
  const SOURCE_THEMES = [
    {
      match: /微博热搜/,
      vars: {
        bg: "rgba(255, 92, 102, 0.14)",
        border: "rgba(255, 110, 130, 0.34)",
        text: "#ffd7db",
        countBg: "rgba(255, 110, 130, 0.22)",
        countText: "#fff1f2",
        cardBorder: "rgba(255, 110, 130, 0.24)",
        cardGlow: "rgba(255, 92, 102, 0.08)"
      }
    },
    {
      match: /抖音热搜|抖音视频监控/,
      vars: {
        bg: "rgba(130, 210, 255, 0.14)",
        border: "rgba(115, 221, 255, 0.34)",
        text: "#d6f5ff",
        countBg: "rgba(115, 221, 255, 0.2)",
        countText: "#effcff",
        cardBorder: "rgba(115, 221, 255, 0.24)",
        cardGlow: "rgba(54, 167, 255, 0.08)"
      }
    },
    {
      match: /微博监控/,
      vars: {
        bg: "rgba(255, 156, 92, 0.14)",
        border: "rgba(255, 179, 102, 0.34)",
        text: "#ffe1c2",
        countBg: "rgba(255, 179, 102, 0.2)",
        countText: "#fff4e7",
        cardBorder: "rgba(255, 179, 102, 0.24)",
        cardGlow: "rgba(255, 153, 82, 0.08)"
      }
    },
    {
      match: /公众号监控/,
      vars: {
        bg: "rgba(84, 220, 164, 0.14)",
        border: "rgba(105, 229, 176, 0.34)",
        text: "#d8ffee",
        countBg: "rgba(105, 229, 176, 0.2)",
        countText: "#f1fff9",
        cardBorder: "rgba(105, 229, 176, 0.22)",
        cardGlow: "rgba(78, 206, 152, 0.08)"
      }
    },
    {
      match: /全网热榜/,
      vars: {
        bg: "rgba(255, 224, 112, 0.14)",
        border: "rgba(255, 215, 97, 0.34)",
        text: "#fff0b0",
        countBg: "rgba(255, 215, 97, 0.22)",
        countText: "#fffbe7",
        cardBorder: "rgba(255, 215, 97, 0.22)",
        cardGlow: "rgba(255, 205, 67, 0.08)"
      }
    },
    {
      match: /币安广场监控/,
      vars: {
        bg: "rgba(255, 197, 79, 0.14)",
        border: "rgba(255, 208, 101, 0.34)",
        text: "#ffe9ab",
        countBg: "rgba(255, 208, 101, 0.22)",
        countText: "#fff7e2",
        cardBorder: "rgba(255, 208, 101, 0.22)",
        cardGlow: "rgba(255, 195, 69, 0.08)"
      }
    },
    {
      match: /X推文监控|推特监控|twitter/i,
      vars: {
        bg: "rgba(120, 170, 255, 0.14)",
        border: "rgba(100, 160, 255, 0.34)",
        text: "#d0e4ff",
        countBg: "rgba(100, 160, 255, 0.22)",
        countText: "#e8f2ff",
        cardBorder: "rgba(100, 160, 255, 0.24)",
        cardGlow: "rgba(80, 140, 255, 0.08)"
      }
    }
  ];
  const DEFAULT_SOURCE_THEME = {
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#eff8ef",
    countBg: "rgba(255, 255, 255, 0.1)",
    countText: "#eff8ef",
    cardBorder: "rgba(105, 184, 128, 0.16)",
    cardGlow: "rgba(89, 211, 126, 0.05)"
  };
  const SOURCE_ICONS = [
    { match: /微博热搜/, icon: "🔴" },
    { match: /抖音热搜/, icon: "🎵" },
    { match: /抖音视频监控/, icon: "🎬" },
    { match: /微博监控/, icon: "📣" },
    { match: /公众号监控/, icon: "🟢" },
    { match: /全网热榜/, icon: "🔥" },
    { match: /币安广场监控/, icon: "🟡" },
    { match: /X推文监控|推特监控|twitter/i, icon: "𝕏" }
  ];

  const state = {
    settings: null,
    messages: [],
    groups: [],
    status: null,
    isConnected: false,
    onlineCount: 0,
    error: "",
    ws: null,
    reconnectTimer: null,
    pollingTimer: null,
    wsFailCount: 0,
    heartbeatTimer: null,
    lastPongAt: Date.now(),
    audioContext: null,
    _newMsgCount: 0,
    _disconnectTimer: null
  };

  const refs = {};

  const css = `
    :host {
      all: initial;
    }

    .tugou-root {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
    }

    .tugou-root.is-resizing {
      cursor: nwse-resize;
    }

    .tugou-root.is-resizing * {
      user-select: none !important;
    }

    .tugou-panel {
      position: fixed;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      width: 420px;
      max-height: 90vh;
      height: auto;
      border-radius: 18px;
      overflow: hidden;
      background:
        radial-gradient(circle at top right, rgba(89, 211, 126, 0.18), transparent 28%),
        linear-gradient(180deg, rgba(7, 11, 17, 0.96), rgba(8, 14, 21, 0.95));
      border: 1px solid rgba(108, 232, 153, 0.32);
      box-shadow:
        0 28px 80px rgba(0, 0, 0, 0.5),
        inset 0 0 0 1px rgba(255, 255, 255, 0.03);
      color: #e6f3ea;
      backdrop-filter: blur(18px);
    }

    .tugou-panel.is-hidden {
      display: none;
    }

    .tugou-panel.is-flashing {
      animation: tugou-flash 1.2s ease;
    }

    @keyframes tugou-flash {
      0% { box-shadow: 0 28px 80px rgba(0, 0, 0, 0.5), 0 0 0 0 rgba(110, 255, 161, 0.55); }
      55% { box-shadow: 0 28px 80px rgba(0, 0, 0, 0.5), 0 0 0 10px rgba(110, 255, 161, 0); }
      100% { box-shadow: 0 28px 80px rgba(0, 0, 0, 0.5), 0 0 0 0 rgba(110, 255, 161, 0); }
    }

    .tugou-bubble {
      position: fixed;
      width: 64px;
      height: 64px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #8fd55b, #4e9e2e);
      color: #16240d;
      border: 2px solid #1c3810;
      box-shadow: 0 16px 44px rgba(0, 0, 0, 0.32);
      cursor: grab;
      pointer-events: auto;
      user-select: none;
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .tugou-bubble-icon {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tugou-bubble-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none;
    }

    .tugou-bubble:active {
      cursor: grabbing;
    }

    .tugou-bubble.is-hidden {
      display: none;
    }

    .tugou-bubble-count {
      position: absolute;
      top: -8px;
      right: -6px;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 999px;
      background: #ff6957;
      color: #fff;
      font-size: 12px;
      line-height: 22px;
      text-align: center;
      box-shadow: 0 10px 24px rgba(255, 105, 87, 0.35);
    }

    .tugou-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px 12px;
      background: linear-gradient(180deg, rgba(19, 29, 24, 0.98), rgba(10, 16, 20, 0.98));
      border-bottom: 1px solid rgba(103, 189, 133, 0.16);
      cursor: grab;
      user-select: none;
    }

    .tugou-header:active {
      cursor: grabbing;
    }

    .tugou-logo {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
    }

    .tugou-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none;
    }

    .tugou-title-wrap {
      min-width: 0;
      flex: 1;
    }

    .tugou-title {
      font-size: 15px;
      line-height: 1.2;
      font-weight: 800;
      color: #f3f7ef;
    }

    .tugou-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tugou-icon-btn {
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 10px;
      color: #e7f0e8;
      background: rgba(255, 255, 255, 0.06);
      cursor: pointer;
      font-size: 16px;
    }

    .tugou-icon-btn:hover {
      background: rgba(143, 213, 91, 0.2);
    }

    .tugou-icon-btn.active {
      background: rgba(143, 213, 91, 0.2);
      color: #f6fff2;
    }

    .tugou-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 16px 12px;
    }

    .tugou-action-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      padding: 0 16px 12px;
    }

    .tugou-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: rgba(223, 236, 228, 0.82);
    }

    .tugou-status-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #ff6767;
      box-shadow: 0 0 0 3px rgba(255, 103, 103, 0.18);
    }

    .tugou-status-dot.connected {
      background: #6ef08f;
      box-shadow: 0 0 0 3px rgba(110, 240, 143, 0.15);
    }

    .tugou-pill-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .tugou-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      border: 1px solid rgba(105, 184, 128, 0.16);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(231, 240, 232, 0.88);
      padding: 5px 10px;
      font-size: 11px;
    }

    .tugou-controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      padding: 14px 0 0;
    }

    .tugou-toggle {
      border: 1px solid rgba(109, 189, 134, 0.18);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(231, 240, 232, 0.9);
      border-radius: 12px;
      padding: 9px 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-align: left;
    }

    .tugou-toggle.active {
      background: linear-gradient(180deg, rgba(120, 223, 131, 0.26), rgba(58, 126, 73, 0.22));
      border-color: rgba(145, 243, 159, 0.45);
      color: #f8fff6;
    }

    .tugou-toggle.secondary {
      text-align: center;
    }

    .tugou-section {
      padding: 14px 0 0;
    }

    .tugou-sound-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .tugou-sound-switch {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      border: 1px solid rgba(105, 184, 128, 0.16);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(231, 240, 232, 0.9);
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }

    .tugou-sound-switch.active {
      background: linear-gradient(180deg, rgba(120, 223, 131, 0.26), rgba(58, 126, 73, 0.22));
      border-color: rgba(145, 243, 159, 0.45);
      color: #f8fff6;
    }

    .tugou-select {
      width: 100%;
      height: 38px;
      border: 1px solid rgba(103, 189, 133, 0.18);
      border-radius: 12px;
      background: rgba(4, 8, 12, 0.55);
      color: #f3f8f1;
      padding: 0 12px;
      font-size: 13px;
      outline: none;
    }

    .tugou-select option {
      color: #0f1714;
    }

    .tugou-section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .tugou-section-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(227, 241, 230, 0.72);
    }

    .tugou-source-list,
    .tugou-keyword-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tugou-source-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid var(--source-border, rgba(105, 184, 128, 0.16));
      background: var(--source-bg, rgba(255, 255, 255, 0.04));
      color: var(--source-text, rgba(231, 240, 232, 0.88));
      cursor: pointer;
      font-size: 12px;
    }

    .tugou-source-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      min-width: 16px;
      font-size: 12px;
      line-height: 1;
    }

    .tugou-source-chip.disabled {
      opacity: 0.45;
    }

    .tugou-source-chip-count {
      min-width: 18px;
      height: 18px;
      border-radius: 999px;
      background: var(--source-count-bg, rgba(255, 255, 255, 0.1));
      color: var(--source-count-text, #eff8ef);
      text-align: center;
      font-size: 11px;
      line-height: 18px;
      padding: 0 4px;
    }

    .tugou-keyword-form {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      margin-bottom: 8px;
    }

    .tugou-input {
      border: 1px solid rgba(103, 189, 133, 0.18);
      border-radius: 12px;
      background: rgba(4, 8, 12, 0.55);
      color: #f3f8f1;
      padding: 10px 12px;
      font-size: 13px;
      outline: none;
    }

    .tugou-input::placeholder {
      color: rgba(226, 236, 228, 0.35);
    }

    .tugou-btn {
      border: 0;
      border-radius: 12px;
      background: linear-gradient(180deg, #93db63, #4ea031);
      color: #14270b;
      font-weight: 800;
      font-size: 13px;
      padding: 0 14px;
      cursor: pointer;
    }

    .tugou-btn.secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #edf6ed;
      border: 1px solid rgba(105, 184, 128, 0.16);
    }

    .tugou-keyword-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(115, 207, 122, 0.12);
      color: #c5f7c8;
      border: 1px solid rgba(122, 219, 134, 0.24);
      font-size: 12px;
      cursor: pointer;
    }

    .tugou-keyword-empty {
      color: rgba(227, 241, 230, 0.42);
      font-size: 12px;
    }

    .tugou-list {
      flex: 1;
      min-height: 400px;
      padding: 14px 16px 16px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: relative;
    }

    .tugou-new-msg-toast {
      position: sticky;
      top: 0;
      align-self: center;
      z-index: 100;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      border: none;
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(37, 99, 235, 0.4);
      transition: opacity 0.2s, transform 0.2s;
      display: none;
      margin-bottom: -10px;
    }
    .tugou-new-msg-toast:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.5);
    }
    }

    .tugou-empty {
      margin-top: 12px;
      border-radius: 16px;
      border: 1px dashed rgba(107, 181, 127, 0.22);
      background: rgba(255, 255, 255, 0.03);
      color: rgba(227, 241, 230, 0.52);
      padding: 30px 18px;
      text-align: center;
      font-size: 13px;
    }

    .tugou-card {
      border-radius: 16px;
      border: 1px solid var(--source-card-border, rgba(105, 184, 128, 0.16));
      background:
        radial-gradient(circle at top right, var(--source-card-glow, rgba(89, 211, 126, 0.05)), transparent 28%),
        linear-gradient(180deg, rgba(15, 23, 28, 0.96), rgba(11, 18, 23, 0.98));
      padding: 12px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    }

    .tugou-card.is-hit {
      border-color: rgba(145, 243, 159, 0.4);
      box-shadow:
        inset 0 0 0 1px rgba(145, 243, 159, 0.12),
        0 0 0 1px rgba(145, 243, 159, 0.1);
    }

    .tugou-card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .tugou-meta {
      min-width: 0;
      flex: 1;
    }

    .tugou-group {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      color: rgba(225, 235, 228, 0.72);
      margin-bottom: 6px;
    }

    .tugou-group-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 20px;
      padding: 0 8px;
      border-radius: 999px;
      background: var(--source-bg, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--source-border, rgba(255, 255, 255, 0.06));
      color: var(--source-text, #eff8ef);
    }

    .tugou-card-title {
      font-size: var(--tugou-font-size, 13px);
      line-height: 1.5;
      color: #f1f7ef;
      font-weight: 700;
      word-break: break-word;
    }

    .tugou-card-summary {
      margin-top: 8px;
      font-size: calc(var(--tugou-font-size, 13px) - 1px);
      line-height: 1.6;
      color: rgba(214, 232, 219, 0.76);
    }

    .tugou-card-content {
      margin-top: 10px;
      font-size: var(--tugou-font-size, 13px);
      line-height: 1.72;
      color: rgba(241, 247, 239, 0.92);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .tugou-inline-link {
      color: #8fe7ff;
      text-decoration: none;
      font-weight: 700;
    }

    .tugou-inline-link:hover {
      text-decoration: underline;
    }

    .tugou-expand-btn {
      margin-top: 8px;
      border: 0;
      background: transparent;
      color: #9ae96d;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      padding: 0;
    }

    .tugou-card-media {
      margin-top: 10px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(105, 184, 128, 0.16);
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
    }

    .tugou-card-media img {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: contain;
      background: rgba(0, 0, 0, 0.18);
    }

    .tugou-mark {
      background: rgba(255, 225, 93, 0.16);
      color: #fff0a8;
      padding: 0 2px;
      border-radius: 3px;
    }

    .tugou-card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 10px;
    }

    .tugou-card-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      min-width: 0;
      flex: 1;
    }

    .tugou-tag {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 8px;
      border-radius: 999px;
      background: rgba(89, 211, 126, 0.14);
      color: #baf5c7;
      font-size: 11px;
      border: 1px solid rgba(105, 184, 128, 0.16);
    }

    .tugou-tag.is-meme {
      background: rgba(255, 95, 95, 0.14);
      color: #ffd3d3;
      border-color: rgba(255, 95, 95, 0.26);
    }

    .tugou-card-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .tugou-mini-btn {
      border: 1px solid rgba(105, 184, 128, 0.16);
      background: rgba(255, 255, 255, 0.05);
      color: #eef8ef;
      border-radius: 10px;
      height: 30px;
      padding: 0 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .tugou-mini-btn:hover {
      background: rgba(103, 189, 133, 0.16);
    }

    .tugou-new {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 8px;
      border-radius: 999px;
      background: rgba(255, 105, 87, 0.15);
      color: #ffd1c8;
      border: 1px solid rgba(255, 105, 87, 0.18);
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .tugou-footer {
      padding: 0 16px 16px;
      font-size: 11px;
      color: rgba(227, 241, 230, 0.46);
    }

    .tugou-resizer {
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 18px;
      height: 18px;
      border: 0;
      background: transparent;
      cursor: nwse-resize;
      padding: 0;
      pointer-events: auto;
      opacity: 0.7;
    }

    .tugou-resizer::before {
      content: "";
      display: block;
      width: 100%;
      height: 100%;
      background:
        linear-gradient(135deg, transparent 30%, rgba(173, 231, 188, 0.75) 30%, rgba(173, 231, 188, 0.75) 42%, transparent 42%),
        linear-gradient(135deg, transparent 55%, rgba(173, 231, 188, 0.75) 55%, rgba(173, 231, 188, 0.75) 67%, transparent 67%),
        linear-gradient(135deg, transparent 80%, rgba(173, 231, 188, 0.75) 80%, rgba(173, 231, 188, 0.75) 92%, transparent 92%);
    }

    .tugou-resizer:hover {
      opacity: 1;
    }

    /* ===== Settings panel overlay (slide from right) ===== */
    .tugou-settings {
      position: absolute;
      top: 56px;
      right: 0;
      bottom: 0;
      width: 280px;
      max-width: 85%;
      z-index: 20;
      padding: 0 14px 14px;
      overflow-y: auto;
      background: linear-gradient(180deg, rgba(10, 17, 23, 0.97), rgba(8, 12, 18, 0.96));
      border-left: 1px solid rgba(103, 189, 133, 0.18);
      backdrop-filter: blur(14px);
      transform: translateX(100%);
      transition: transform 0.25s ease;
      pointer-events: none;
    }
    .tugou-settings.is-open {
      transform: translateX(0);
      pointer-events: auto;
    }
    .tugou-settings-close {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0 6px;
      font-size: 13px;
      font-weight: 700;
      color: #d0e6d8;
      border-bottom: 1px solid rgba(103, 189, 133, 0.12);
      margin-bottom: 8px;
    }
    .tugou-settings-close button {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }
    .tugou-settings-close button:hover {
      color: #fff;
    }
    .tugou-settings-backdrop {
      display: none;
      position: absolute;
      top: 56px;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 19;
      background: rgba(0,0,0,0.2);
    }
    .tugou-settings-backdrop.is-open {
      display: block;
    }

    /* ===== Font size section ===== */
    .tugou-fontsize-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 0;
    }
    .tugou-fontsize-slider {
      flex: 1;
      accent-color: #67bd85;
      height: 4px;
      cursor: pointer;
    }
    .tugou-fontsize-label {
      font-size: 12px;
      color: rgba(231, 240, 232, 0.7);
      min-width: 36px;
      text-align: right;
    }

    /* ===== X Tweet Card ===== */
    .tugou-x-card {
      padding: 0 !important;
      overflow: visible;
    }
    .tugou-x-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      font-size: 11px;
      color: rgba(231, 240, 232, 0.6);
      flex-wrap: wrap;
    }
    .tugou-x-time {
      color: rgba(231, 240, 232, 0.5);
    }
    .tugou-x-type {
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    .tugou-x-type-tweet { background: rgba(255,255,255,0.08); color: rgba(231,240,232,0.6); }
    .tugou-x-type-reply { background: rgba(56,163,255,0.18); color: #8ac4ff; }
    .tugou-x-type-quote { background: rgba(168,85,247,0.18); color: #c9a0ff; }
    .tugou-x-type-repost { background: rgba(34,197,94,0.18); color: #86efac; }
    .tugou-x-type-ca_alert { background: rgba(251,146,60,0.22); color: #fdba74; }
    .tugou-x-origin {
      margin-left: auto;
      color: rgba(100,160,255,0.8);
      cursor: pointer;
      font-size: 11px;
    }
    .tugou-x-origin:hover { color: #8ac4ff; }
    .tugou-x-new {
      position: static !important;
      margin-left: 6px;
    }
    .tugou-x-body {
      padding: 0 12px 10px;
    }
    .tugou-x-author {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .tugou-x-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(100,160,255,0.25);
      object-fit: cover;
      flex-shrink: 0;
    }
    .tugou-x-author-info {
      min-width: 0;
      flex: 1;
    }
    .tugou-x-name {
      font-weight: 700;
      font-size: var(--tugou-font-size, 13px);
      color: #e7f0e8;
      margin-right: 6px;
    }
    .tugou-x-handle {
      font-size: calc(var(--tugou-font-size, 13px) - 1px);
      color: rgba(231,240,232,0.5);
    }
    .tugou-x-bio {
      font-size: 11px;
      color: rgba(231,240,232,0.4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .tugou-x-text {
      font-size: var(--tugou-font-size, 13px);
      line-height: 1.5;
      color: rgba(231,240,232,0.92);
      white-space: pre-wrap;
      word-break: break-word;
      margin-bottom: 8px;
    }
    .tugou-x-text a {
      color: rgba(100,160,255,0.85);
      text-decoration: none;
    }
    .tugou-x-text a:hover { text-decoration: underline; }
    .tugou-x-reply {
      background: rgba(255,255,255,0.04);
      border-left: 2px solid rgba(100,160,255,0.3);
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 8px;
    }
    .tugou-x-reply-label {
      font-size: 10px;
      color: rgba(231,240,232,0.4);
      margin-bottom: 3px;
    }
    .tugou-x-reply-text {
      font-size: 12px;
      color: rgba(231,240,232,0.65);
      line-height: 1.4;
    }
    .tugou-x-ca {
      display: inline-block;
      background: rgba(251,146,60,0.15);
      border: 1px solid rgba(251,146,60,0.3);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      color: #fdba74;
      cursor: pointer;
      margin-bottom: 6px;
    }
    .tugou-x-ca:hover { background: rgba(251,146,60,0.25); }
    .tugou-x-metrics {
      display: flex;
      gap: 10px;
      margin-bottom: 6px;
    }
    .tugou-x-metrics span {
      font-size: 11px;
      color: rgba(231,240,232,0.5);
      background: rgba(255,255,255,0.06);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .tugou-x-quoted {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 6px;
    }
    .tugou-x-quoted-head {
      display: flex;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      color: rgba(231,240,232,0.7);
      margin-bottom: 4px;
    }
    .tugou-x-media {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 4px;
      margin-bottom: 6px;
    }
    .tugou-x-media img {
      width: 100%;
      border-radius: 6px;
      max-height: 160px;
      object-fit: cover;
      cursor: zoom-in;
    }
    .tugou-x-lightbox {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(2, 6, 23, 0.88);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: zoom-out;
      padding: 20px;
      animation: tugou-lb-fade 0.2s ease;
    }
    @keyframes tugou-lb-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .tugou-x-lightbox img {
      max-width: 92vw;
      max-height: 92vh;
      border-radius: 12px;
      object-fit: contain;
      animation: tugou-lb-scale 0.2s ease;
    }
    @keyframes tugou-lb-scale {
      from { transform: scale(0.92); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    .tugou-x-summary {
      font-size: calc(var(--tugou-font-size, 13px) - 2px);
      color: rgba(231,240,232,0.5);
      padding: 4px 8px;
      background: rgba(255,255,255,0.03);
      border-radius: 4px;
      font-style: italic;
    }

    /* ===== X Follow Event Card ===== */
    .tugou-x-follow-shell {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
    }
    .tugou-x-follow-node {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }
    .tugou-x-follow-node .tugou-x-avatar {
      flex-shrink: 0;
    }
    .tugou-x-follow-arrow {
      font-size: 20px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .tugou-x-follow-arrow.follow { color: #4ade80; }
    .tugou-x-follow-arrow.unfollow { color: #f87171; }
    .tugou-x-type-follow { background: rgba(74,222,128,0.18); color: #4ade80; }
    .tugou-x-type-unfollow { background: rgba(248,113,113,0.18); color: #f87171; }

    /* ===== X Profile Change Card ===== */
    .tugou-x-profile-title {
      font-size: var(--tugou-font-size, 13px);
      font-weight: 700;
      color: #e7f0e8;
      margin-bottom: 8px;
    }
    .tugou-x-profile-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: calc(var(--tugou-font-size, 13px) - 1px);
      color: rgba(231,240,232,0.8);
    }
    .tugou-x-profile-field {
      font-weight: 600;
      color: rgba(231,240,232,0.5);
      min-width: 40px;
    }
    .tugou-x-profile-old {
      text-decoration: line-through;
      color: rgba(248,113,113,0.7);
    }
    .tugou-x-profile-arrow {
      color: rgba(231,240,232,0.3);
    }
    .tugou-x-profile-new {
      color: #4ade80;
    }
    .tugou-x-profile-avatar-change {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tugou-x-profile-avatar-change img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    .tugou-x-type-profile { background: rgba(168,130,255,0.18); color: #a882ff; }

    /* Cloudflare 5s 盾提示条 */
    .tugou-cf-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #ff6b35 0%, #f7c948 100%);
      color: #1a1a2e;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px 8px 0 0;
      flex-shrink: 0;
      z-index: 10;
    }
    .tugou-cf-banner span {
      flex: 1;
    }
    .tugou-cf-btn {
      padding: 4px 12px;
      background: #1a1a2e;
      color: #f7c948;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .tugou-cf-btn:hover {
      background: #2a2a4e;
    }
    .tugou-cf-retry {
      background: #0d7c3e !important;
      color: #fff !important;
    }
    .tugou-cf-retry:hover {
      background: #0fa854 !important;
    }
    .tugou-cf-dismiss {
      background: none;
      border: none;
      color: #1a1a2e;
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
      opacity: 0.7;
    }
    .tugou-cf-dismiss:hover {
      opacity: 1;
    }
  `;

  init().catch((error) => {
    console.error("[土狗雷达] 初始化失败", error);
  });

  async function init() {
    state.settings = await loadSettings();
    createUi();
    bindStaticEvents();
    updatePanelPosition();
    applyFontSize();
    renderAll();

    await bootstrapData();
    connectWebSocket();
  }

  function defaultSettings() {
    return {
      apiBase: DEFAULT_API_BASE,
      x: Math.max(16, window.innerWidth - DEFAULT_WIDTH - 24),
      y: 80,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      minimized: false,
      settingsOpen: false,
      soundEnabled: true,
      soundProfile: "chime",
      aiOnly: false,
      keywords: [],
      sourceStates: {},
      fontSize: 13
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeSettings(input) {
    const base = defaultSettings();
    const merged = { ...base, ...(input || {}) };

    merged.width = clamp(Number(merged.width) || DEFAULT_WIDTH, MIN_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 24));
    merged.height = clamp(Number(merged.height) || DEFAULT_HEIGHT, MIN_HEIGHT, Math.max(MIN_HEIGHT, window.innerHeight - 24));
    merged.x = clamp(Number(merged.x) || base.x, 12, Math.max(12, window.innerWidth - merged.width - 12));
    merged.y = clamp(Number(merged.y) || base.y, 12, Math.max(12, window.innerHeight - merged.height - 12));
    merged.keywords = Array.isArray(merged.keywords) ? merged.keywords.filter(Boolean) : [];
    merged.sourceStates = merged.sourceStates && typeof merged.sourceStates === "object" ? merged.sourceStates : {};
    merged.apiBase = typeof merged.apiBase === "string" && merged.apiBase ? merged.apiBase : DEFAULT_API_BASE;
    merged.minimized = Boolean(merged.minimized);
    merged.settingsOpen = Boolean(merged.settingsOpen);
    merged.soundEnabled = merged.soundEnabled !== false;
    merged.soundProfile = SOUND_PRESETS[merged.soundProfile] ? merged.soundProfile : "chime";
    merged.aiOnly = Boolean(merged.aiOnly);
    merged.fontSize = clamp(Number(merged.fontSize) || 13, 10, 20);

    return merged;
  }

  function storageGet(key) {
    return new Promise((resolve) => {
      if (!chrome?.storage?.local) {
        resolve(null);
        return;
      }
      chrome.storage.local.get([key], (result) => resolve(result[key] || null));
    });
  }

  function storageSet(key, value) {
    return new Promise((resolve) => {
      if (!chrome?.storage?.local) {
        resolve();
        return;
      }
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }

  async function loadSettings() {
    const saved = await storageGet(STORAGE_KEY);
    return normalizeSettings(saved);
  }

  async function saveSettings() {
    await storageSet(STORAGE_KEY, state.settings);
  }

  function createUi() {
    const host = document.createElement("div");
    host.id = "tugou-radar-overlay-host";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;

    const root = document.createElement("div");
    root.className = "tugou-root";

    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "tugou-bubble is-hidden";

    const bubbleLabel = document.createElement("span");
    bubbleLabel.className = "tugou-bubble-icon";
    const bubbleImage = document.createElement("img");
    bubbleImage.src = EXTENSION_ICON_URL;
    bubbleImage.alt = "土狗气象台";
    bubbleImage.draggable = false;
    bubbleLabel.appendChild(bubbleImage);
    const bubbleCount = document.createElement("span");
    bubbleCount.className = "tugou-bubble-count";
    bubbleCount.textContent = "0";
    bubble.append(bubbleLabel, bubbleCount);

    const panel = document.createElement("section");
    panel.className = "tugou-panel";

    const header = document.createElement("div");
    header.className = "tugou-header";

    const logo = document.createElement("div");
    logo.className = "tugou-logo";
    const logoImg = document.createElement("img");
    logoImg.src = EXTENSION_ICON_URL;
    logoImg.alt = "土狗气象台";
    logoImg.draggable = false;
    logo.appendChild(logoImg);

    const titleWrap = document.createElement("div");
    titleWrap.className = "tugou-title-wrap";
    const title = document.createElement("div");
    title.className = "tugou-title";
    title.textContent = "土狗气象台";
    titleWrap.append(title);

    const headerActions = document.createElement("div");
    headerActions.className = "tugou-header-actions";
    const openSiteBtn = createIconButton("↗", "打开网站");
    const settingsBtn = createIconButton("⚙", "设置");
    const minimizeBtn = createIconButton("—", "最小化");
    headerActions.append(openSiteBtn, settingsBtn, minimizeBtn);

    header.append(logo, titleWrap, headerActions);

    const statusRow = document.createElement("div");
    statusRow.className = "tugou-status-row";

    const status = document.createElement("div");
    status.className = "tugou-status";
    const statusDot = document.createElement("span");
    statusDot.className = "tugou-status-dot";
    const statusText = document.createElement("span");
    statusText.textContent = "连接中";
    status.append(statusDot, statusText);

    const pills = document.createElement("div");
    pills.className = "tugou-pill-group";
    const onlinePill = document.createElement("span");
    onlinePill.className = "tugou-pill";
    onlinePill.textContent = "巡田员 0";
    const unreadPill = document.createElement("span");
    unreadPill.className = "tugou-pill";
    unreadPill.textContent = "未读 0";
    pills.append(onlinePill, unreadPill);
    statusRow.append(status, pills);

    const settingsPanel = document.createElement("div");
    settingsPanel.className = "tugou-settings";

    const actionRow = document.createElement("div");
    actionRow.className = "tugou-action-row";
    const soundToggle = createToggleButton("🔊 声音");
    const aiToggle = createToggleButton("🤖 风向精选");
    const markAllReadBtn = document.createElement("button");
    markAllReadBtn.type = "button";
    markAllReadBtn.className = "tugou-toggle secondary";
    markAllReadBtn.textContent = "🧹 全部已读";
    actionRow.append(soundToggle, aiToggle, markAllReadBtn);

    const soundSection = document.createElement("div");
    soundSection.className = "tugou-section";
    const soundHead = document.createElement("div");
    soundHead.className = "tugou-section-head";
    const soundTitle = document.createElement("div");
    soundTitle.className = "tugou-section-title";
    soundTitle.textContent = "提示音";
    const soundSwitchBtn = document.createElement("button");
    soundSwitchBtn.type = "button";
    soundSwitchBtn.className = "tugou-sound-switch";
    soundSwitchBtn.textContent = "🔊 已开启";
    soundHead.append(soundTitle, soundSwitchBtn);
    const soundRow = document.createElement("div");
    soundRow.className = "tugou-sound-row";
    const soundSelect = document.createElement("select");
    soundSelect.className = "tugou-select";
    for (const [value, preset] of Object.entries(SOUND_PRESETS)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = preset.label;
      soundSelect.appendChild(option);
    }
    const soundTestBtn = document.createElement("button");
    soundTestBtn.type = "button";
    soundTestBtn.className = "tugou-mini-btn";
    soundTestBtn.textContent = "测试";
    soundRow.append(soundSelect, soundTestBtn);
    const soundHint = document.createElement("div");
    soundHint.className = "tugou-keyword-empty";
    soundHint.textContent = "如浏览器拦截自动播放，先点击一次悬浮窗再测试。";
    soundSection.append(soundHead, soundRow, soundHint);

    const sourceSection = document.createElement("div");
    sourceSection.className = "tugou-section";
    const sourceHead = document.createElement("div");
    sourceHead.className = "tugou-section-head";
    const sourceTitle = document.createElement("div");
    sourceTitle.className = "tugou-section-title";
    sourceTitle.textContent = "来源开关";
    const sourceHint = document.createElement("div");
    sourceHint.className = "tugou-section-title";
    sourceHint.textContent = "点击开关";
    sourceHead.append(sourceTitle, sourceHint);
    const sourceList = document.createElement("div");
    sourceList.className = "tugou-source-list";
    sourceSection.append(sourceHead, sourceList);

    const keywordSection = document.createElement("div");
    keywordSection.className = "tugou-section";
    const keywordHead = document.createElement("div");
    keywordHead.className = "tugou-section-head";
    const keywordTitle = document.createElement("div");
    keywordTitle.className = "tugou-section-title";
    keywordTitle.textContent = "关键词种子";
    keywordHead.appendChild(keywordTitle);
    const keywordForm = document.createElement("div");
    keywordForm.className = "tugou-keyword-form";
    const keywordInput = document.createElement("input");
    keywordInput.type = "text";
    keywordInput.className = "tugou-input";
    keywordInput.placeholder = "输入关键词，例如 OpenAI、小红书";
    const addKeywordBtn = document.createElement("button");
    addKeywordBtn.type = "button";
    addKeywordBtn.className = "tugou-btn";
    addKeywordBtn.textContent = "播种";
    keywordForm.append(keywordInput, addKeywordBtn);
    const keywordList = document.createElement("div");
    keywordList.className = "tugou-keyword-list";
    keywordSection.append(keywordHead, keywordForm, keywordList);

    const list = document.createElement("div");
    list.className = "tugou-list";
    const newMsgToast = document.createElement("button");
    newMsgToast.type = "button";
    newMsgToast.className = "tugou-new-msg-toast";
    list.appendChild(newMsgToast);
    const empty = document.createElement("div");
    empty.className = "tugou-empty";
    empty.textContent = "监控消息会在这里实时出现";
    list.appendChild(empty);

    const footer = document.createElement("div");
    footer.className = "tugou-footer";
    footer.textContent = "土狗气象台已接入实时消息、关键词命中和未读状态";

    const resizeHandle = document.createElement("button");
    resizeHandle.type = "button";
    resizeHandle.className = "tugou-resizer";
    resizeHandle.title = "拖动调整窗口大小";

    // Font size section
    const fontSection = document.createElement("div");
    fontSection.className = "tugou-section";
    const fontHead = document.createElement("div");
    fontHead.className = "tugou-section-head";
    const fontTitle = document.createElement("div");
    fontTitle.className = "tugou-section-title";
    fontTitle.textContent = "字体大小";
    const fontLabel = document.createElement("div");
    fontLabel.className = "tugou-fontsize-label";
    fontLabel.textContent = `${state.settings.fontSize}px`;
    fontHead.append(fontTitle, fontLabel);
    const fontRow = document.createElement("div");
    fontRow.className = "tugou-fontsize-row";
    const fontSlider = document.createElement("input");
    fontSlider.type = "range";
    fontSlider.className = "tugou-fontsize-slider";
    fontSlider.min = "10";
    fontSlider.max = "20";
    fontSlider.step = "1";
    fontSlider.value = String(state.settings.fontSize);
    fontSlider.addEventListener("input", () => {
      const val = Number(fontSlider.value);
      state.settings.fontSize = val;
      fontLabel.textContent = `${val}px`;
      applyFontSize();
      saveSettings();
    });
    fontRow.appendChild(fontSlider);
    fontSection.append(fontHead, fontRow);

    settingsPanel.append(soundSection, sourceSection, keywordSection, fontSection);

    // Settings close header
    const settingsCloseBar = document.createElement("div");
    settingsCloseBar.className = "tugou-settings-close";
    const settingsCloseLabel = document.createElement("span");
    settingsCloseLabel.textContent = "设置";
    const settingsCloseBtn = document.createElement("button");
    settingsCloseBtn.textContent = "✕";
    settingsCloseBtn.title = "关闭设置";
    settingsCloseBar.append(settingsCloseLabel, settingsCloseBtn);
    settingsPanel.insertBefore(settingsCloseBar, settingsPanel.firstChild);

    // Settings backdrop (click outside to close)
    const settingsBackdrop = document.createElement("div");
    settingsBackdrop.className = "tugou-settings-backdrop";

    panel.append(header, statusRow, actionRow, settingsBackdrop, settingsPanel, list, footer, resizeHandle);
    root.append(panel, bubble);
    shadow.append(style, root);

    refs.host = host;
    refs.shadow = shadow;
    refs.root = root;
    refs.panel = panel;
    refs.bubble = bubble;
    refs.bubbleCount = bubbleCount;
    refs.header = header;
    refs.openSiteBtn = openSiteBtn;
    refs.settingsBtn = settingsBtn;
    refs.minimizeBtn = minimizeBtn;
    refs.settingsPanel = settingsPanel;
    refs.settingsBackdrop = settingsBackdrop;
    refs.settingsCloseBtn = settingsCloseBtn;
    refs.statusDot = statusDot;
    refs.statusText = statusText;
    refs.onlinePill = onlinePill;
    refs.unreadPill = unreadPill;
    refs.soundToggle = soundToggle;
    refs.aiToggle = aiToggle;
    refs.markAllReadBtn = markAllReadBtn;
    refs.soundSelect = soundSelect;
    refs.soundTestBtn = soundTestBtn;
    refs.soundSwitchBtn = soundSwitchBtn;
    refs.sourceList = sourceList;
    refs.keywordInput = keywordInput;
    refs.addKeywordBtn = addKeywordBtn;
    refs.keywordList = keywordList;
    refs.list = list;
    refs.empty = empty;
    refs.newMsgToast = newMsgToast;
    refs.resizeHandle = resizeHandle;
  }

  function createIconButton(label, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tugou-icon-btn";
    button.textContent = label;
    button.title = title;
    return button;
  }

  function createToggleButton(label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tugou-toggle";
    button.textContent = label;
    return button;
  }

  function bindStaticEvents() {
    refs.openSiteBtn.addEventListener("click", () => {
      openExternal(`${state.settings.apiBase}/`);
    });

    refs.settingsBtn.addEventListener("click", async () => {
      state.settings.settingsOpen = !state.settings.settingsOpen;
      await saveSettings();
      renderSettings();
    });

    // Close settings via close button
    refs.settingsCloseBtn.addEventListener("click", async () => {
      state.settings.settingsOpen = false;
      await saveSettings();
      renderSettings();
    });

    // Close settings via backdrop click
    refs.settingsBackdrop.addEventListener("click", async () => {
      state.settings.settingsOpen = false;
      await saveSettings();
      renderSettings();
    });

    refs.minimizeBtn.addEventListener("click", () => {
      state.settings.minimized = true;
      saveSettings();
      renderVisibility();
    });

    refs.soundToggle.addEventListener("click", async () => {
      state.settings.soundEnabled = !state.settings.soundEnabled;
      await saveSettings();
      renderControls();
    });

    refs.soundSwitchBtn.addEventListener("click", async () => {
      state.settings.soundEnabled = !state.settings.soundEnabled;
      await saveSettings();
      renderControls();
    });

    refs.aiToggle.addEventListener("click", async () => {
      state.settings.aiOnly = !state.settings.aiOnly;
      await saveSettings();
      sendWs({ action: "set_ai_filter", enabled: state.settings.aiOnly });
      renderControls();
      await refreshMessages();
    });

    refs.markAllReadBtn.addEventListener("click", async () => {
      await markAllRead();
    });

    refs.soundSelect.addEventListener("change", async () => {
      state.settings.soundProfile = refs.soundSelect.value;
      await saveSettings();
    });

    refs.soundTestBtn.addEventListener("click", async () => {
      await unlockAudio();
      await playNotificationSound(true);
    });

    refs.addKeywordBtn.addEventListener("click", async () => {
      await addKeyword();
    });

    refs.keywordInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await addKeyword();
      }
    });

    refs.panel.addEventListener("pointerdown", () => {
      unlockAudio();
    }, { passive: true });
    refs.bubble.addEventListener("pointerdown", () => {
      unlockAudio();
    }, { passive: true });
    refs.panel.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });
    refs.bubble.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    bindDrag();
    bindResize();
    bindBubbleDrag();

    window.addEventListener("resize", () => {
      state.settings = normalizeSettings(state.settings);
      updatePanelPosition();
      saveSettings();
    });
  }

  function bindDrag() {
    let dragging = false;
    let deltaX = 0;
    let deltaY = 0;

    refs.header.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      dragging = true;
      deltaX = event.clientX - state.settings.x;
      deltaY = event.clientY - state.settings.y;
      refs.header.setPointerCapture(event.pointerId);
    });

    refs.header.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      state.settings.x = clamp(event.clientX - deltaX, 12, Math.max(12, window.innerWidth - state.settings.width - 12));
      state.settings.y = clamp(event.clientY - deltaY, 12, Math.max(12, window.innerHeight - state.settings.height - 12));
      updatePanelPosition();
    });

    refs.header.addEventListener("pointerup", async (event) => {
      if (!dragging) return;
      dragging = false;
      refs.header.releasePointerCapture(event.pointerId);
      await saveSettings();
    });

    refs.header.addEventListener("pointercancel", async () => {
      if (!dragging) return;
      dragging = false;
      await saveSettings();
    });
  }

  function bindBubbleDrag() {
    const bubbleSize = 64;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let moved = false;

    refs.bubble.addEventListener("pointerdown", (event) => {
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originX = state.settings.x;
      originY = state.settings.y;
      moved = false;
      refs.bubble.setPointerCapture(event.pointerId);
    });

    refs.bubble.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) {
        return;
      }
      moved = true;
      state.settings.x = clamp(originX + dx, 12, Math.max(12, window.innerWidth - bubbleSize - 12));
      state.settings.y = clamp(originY + dy, 12, Math.max(12, window.innerHeight - bubbleSize - 12));
      updatePanelPosition();
    });

    refs.bubble.addEventListener("pointerup", async (event) => {
      if (pointerId !== event.pointerId) return;
      refs.bubble.releasePointerCapture(event.pointerId);
      pointerId = null;
      if (moved) {
        await saveSettings();
        return;
      }
      state.settings.minimized = false;
      state.settings = normalizeSettings(state.settings);
      await saveSettings();
      updatePanelPosition();
      renderVisibility();
    });

    refs.bubble.addEventListener("pointercancel", async () => {
      pointerId = null;
      if (moved) {
        await saveSettings();
      }
    });
  }

  function bindResize() {
    let resizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let activePointerId = null;

    refs.resizeHandle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      resizing = true;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startWidth = state.settings.width;
      startHeight = state.settings.height;
      refs.root.classList.add("is-resizing");
      refs.resizeHandle.setPointerCapture(event.pointerId);
    });

    refs.resizeHandle.addEventListener("pointermove", (event) => {
      if (!resizing || activePointerId !== event.pointerId) return;

      const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - state.settings.x - 12);
      const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - state.settings.y - 12);
      const nextWidth = startWidth + (event.clientX - startX);
      const nextHeight = startHeight + (event.clientY - startY);

      state.settings.width = clamp(nextWidth, MIN_WIDTH, maxWidth);
      state.settings.height = clamp(nextHeight, MIN_HEIGHT, maxHeight);
      updatePanelPosition();
    });

    const finishResize = async (event) => {
      if (!resizing || activePointerId !== event.pointerId) return;
      resizing = false;
      activePointerId = null;
      refs.root.classList.remove("is-resizing");
      refs.resizeHandle.releasePointerCapture(event.pointerId);
      state.settings = normalizeSettings(state.settings);
      updatePanelPosition();
      await saveSettings();
    };

    refs.resizeHandle.addEventListener("pointerup", finishResize);
    refs.resizeHandle.addEventListener("pointercancel", async (event) => {
      if (!resizing || activePointerId !== event.pointerId) return;
      resizing = false;
      activePointerId = null;
      refs.root.classList.remove("is-resizing");
      state.settings = normalizeSettings(state.settings);
      updatePanelPosition();
      await saveSettings();
    });

    // 新消息浮窗：滚动到顶部时清空计数
    refs.list.addEventListener("scroll", () => {
      if (refs.list.scrollTop <= 30) {
        state._newMsgCount = 0;
        refs.newMsgToast.style.display = "none";
      }
    });

    // 点击浮窗回到顶部
    refs.newMsgToast.addEventListener("click", (e) => {
      e.stopPropagation();
      refs.list.scrollTo({ top: 0, behavior: "smooth" });
      state._newMsgCount = 0;
      refs.newMsgToast.style.display = "none";
    });
  }

  async function bootstrapData() {
    try {
      const [status, groups] = await Promise.all([
        fetchJson("/api/status"),
        fetchJson("/api/channels/groups")
      ]);

      state.status = status;
      state.groups = Array.isArray(groups) ? groups : [];
      ensureSourceStates();
      await refreshMessages(false);
      state.error = "";
      hideCfChallengeBanner();
    } catch (error) {
      console.error("[土狗雷达] 初始数据加载失败", error);
      if (error.message === "CF_CHALLENGE") {
        state.error = "请打开主站完成验证，并保持标签页打开";
        showCfChallengeBanner();
      } else {
        state.error = `连接失败: ${error.message}`;
      }
    }

    renderAll();
  }

  function ensureSourceStates() {
    let changed = false;
    for (const group of state.groups) {
      if (typeof state.settings.sourceStates[group.group_name] !== "boolean") {
        state.settings.sourceStates[group.group_name] = true;
        changed = true;
      }
    }
    if (changed) {
      saveSettings();
    }
  }

  function syncSourceSubscriptions() {
    if (!state.groups.length) return;
    for (const group of state.groups) {
      sendWs({
        action: state.settings.sourceStates[group.group_name] === false ? "unsubscribe" : "subscribe",
        group_name: group.group_name
      });
    }
  }

  function buildUrl(path) {
    const url = new URL(path, state.settings.apiBase);
    url.searchParams.set("_ts", Date.now().toString());
    return url.toString();
  }

  /**
   * 通过 background service worker 代理 fetch，绕过 CORS 和 CF 5s 盾
   */
  function bgFetch(url, options) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "tugou:fetch", url, options },
        (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!resp) {
            reject(new Error("background fetch: no response"));
            return;
          }
          resolve(resp);
        }
      );
    });
  }

  async function fetchJson(path, init) {
    const url = buildUrl(path);
    const resp = await bgFetch(url, {
      method: init?.method || "GET",
      headers: init?.headers,
      body: init?.body,
    });

    // 网络层错误
    if (resp.error) {
      showCfChallengeBanner();
      throw new Error(resp.error);
    }

    const contentType = resp.contentType || "";

    // 检测 Cloudflare 5s 盾 challenge 页面
    if (
      (resp.status === 403 || resp.status === 503) &&
      !contentType.includes("application/json")
    ) {
      showCfChallengeBanner();
      throw new Error("CF_CHALLENGE");
    }

    if (!resp.ok) {
      throw new Error(`请求失败: ${resp.status}`);
    }

    // 防止 Cloudflare 返回 200 但内容是 HTML challenge
    if (!contentType.includes("application/json")) {
      if (resp.body && (resp.body.includes("cf-challenge") || resp.body.includes("challenge-platform") || resp.body.includes("Just a moment"))) {
        showCfChallengeBanner();
        throw new Error("CF_CHALLENGE");
      }
      // 尝试解析为 JSON（有些服务器不设 content-type）
      try {
        return JSON.parse(resp.body);
      } catch {
        throw new Error("响应非 JSON 格式");
      }
    }

    // 5s 盾通过，清除提示
    hideCfChallengeBanner();
    try {
      return JSON.parse(resp.body);
    } catch {
      throw new Error("响应非 JSON 格式");
    }
  }

  async function markAsRead(messageId) {
    try {
      await bgFetch(
        new URL(`/api/messages/${messageId}/read`, state.settings.apiBase).toString(),
        { method: "POST" }
      );
    } catch (error) {
      console.warn("[土狗雷达] 标记已读失败", error);
    }
  }

  async function markAllRead() {
    try {
      await bgFetch(
        new URL("/api/messages/read-all", state.settings.apiBase).toString(),
        { method: "POST" }
      );
      state.messages = state.messages.map((item) => ({ ...item, is_new: false }));
      if (Array.isArray(state.groups)) {
        state.groups = state.groups.map((group) => ({ ...group, unread_count: 0 }));
      }
      renderAll();
    } catch (error) {
      console.warn("[土狗雷达] 全部已读失败", error);
    }
  }

  async function refreshMessages(render = true) {
    const suffix = state.settings.aiOnly ? "&is_meme=true" : "";
    const data = await fetchJson(`/api/messages?page=1&page_size=60${suffix}`);
    const existing = new Map(state.messages.map((item) => [item.key, item]));
    state.messages = normalizeApiMessages(data.items || []).map((item) => {
      const previous = existing.get(item.key);
      if (!previous) return item;
      return {
        ...item,
        is_new: previous.is_new && item.is_new
      };
    });
    if (render) {
      renderAll();
    }
  }

  function normalizeApiMessages(items) {
    return items.map((item) => normalizeMessage(item)).sort(compareMessages).slice(0, MAX_MESSAGES);
  }

  function normalizeMessage(item) {
    return {
      key: `msg-${item.id}`,
      type: "message",
      id: item.id,
      channel_name: item.channel_name || "未知来源",
      group_name: item.group_name || "未分组",
      content: item.content || "",
      ai_summary: item.ai_summary || "",
      ai_tags: Array.isArray(item.ai_tags) ? item.ai_tags : [],
      ai_confidence: typeof item.ai_confidence === "number" ? item.ai_confidence : null,
      is_meme: Boolean(item.is_meme),
      is_new: item.is_new !== false,
      link_url: item.link_url || "",
      media_url: normalizeMediaUrl(item.media_url),
      created_at: item.created_at || new Date().toISOString(),
      created_at_ms: parseApiDate(item.created_at || Date.now()).getTime(),
      message_kind: item.message_kind || null,
      metadata: item.metadata || null
    };
  }

  function createHotSearchMessage(source, changes) {
    const sourceLabel = source === "weibo" ? "微博热搜" : source === "douyin" ? "抖音热搜" : "热搜推送";
    const first = changes[0]?.item || {};
    const content = changes
      .slice(0, 3)
      .map((change) => {
        const prefix = change.type === "new" ? "新上榜" : change.type === "rise" ? "飙升" : "变化";
        return `${prefix} [${change.item.rank}] ${change.item.title}`;
      })
      .join(" · ");

    return {
      key: `hot-${source}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "hot_search",
      id: null,
      channel_name: "土狗气象台",
      group_name: sourceLabel,
      content,
      ai_summary: "",
      ai_tags: [],
      ai_confidence: null,
      is_meme: false,
      is_new: true,
      link_url: first.url || "",
      media_url: "",
      created_at: new Date().toISOString(),
      created_at_ms: Date.now()
    };
  }

  function compareMessages(a, b) {
    return b.created_at_ms - a.created_at_ms;
  }

  // ====== 头像代理 ======
  function proxyAvatar(url) {
    if (!url) return url;
    if (url.includes("pbs.twimg.com") || url.includes("abs.twimg.com") || url.includes("unavatar.io")) {
      return `${state.settings.apiBase}/api/avatar-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  // ====== Cloudflare 5s 盾检测与提示 ======
  let cfBannerEl = null;
  let cfCheckInFlight = false;
  let cfRetryTimer = null;

  function showCfChallengeBanner() {
    if (cfBannerEl) return;
    cfBannerEl = document.createElement("div");
    cfBannerEl.className = "tugou-cf-banner";
    cfBannerEl.innerHTML = `
      <span>⚠️ 连接失败，服务器可能正在维护中</span>
      <button class="tugou-cf-btn">打开主站</button>
      <button class="tugou-cf-btn tugou-cf-retry">重新连接</button>
      <button class="tugou-cf-dismiss">✕</button>
    `;
    cfBannerEl.querySelector(".tugou-cf-btn").addEventListener("click", () => {
      window.open(state.settings.apiBase, "_blank");
    });
    cfBannerEl.querySelector(".tugou-cf-retry").addEventListener("click", () => {
      hideCfChallengeBanner();
      bootstrapData();
      connectWebSocket();
    });
    cfBannerEl.querySelector(".tugou-cf-dismiss").addEventListener("click", () => {
      hideCfChallengeBanner();
    });
    // 插入到面板 header 之后
    const panel = refs.panel;
    const header = refs.header;
    if (panel && header && header.nextSibling) {
      panel.insertBefore(cfBannerEl, header.nextSibling);
    } else if (panel) {
      panel.appendChild(cfBannerEl);
    }
  }

  function hideCfChallengeBanner() {
    if (cfBannerEl) {
      cfBannerEl.remove();
      cfBannerEl = null;
    }
  }

  async function checkCfShieldOnWsFailure() {
    if (cfCheckInFlight) return;
    cfCheckInFlight = true;
    try {
      const url = new URL("/api/status", state.settings.apiBase);
      url.searchParams.set("_ts", Date.now().toString());
      const resp = await bgFetch(url.toString(), { method: "GET" });
      const ct = resp.contentType || "";
      if ((resp.status === 403 || resp.status === 503) && !ct.includes("application/json")) {
        showCfChallengeBanner();
      } else if (resp.ok && ct.includes("application/json")) {
        hideCfChallengeBanner();
      }
    } catch {
      // 网络错误，非 5s 盾问题
    }
    cfCheckInFlight = false;
  }

  function connectWebSocket() {
    disconnectWebSocket();

    try {
      const url = new URL(state.settings.apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws";
      url.search = "";

      const ws = new WebSocket(url.toString());
      state.ws = ws;

      ws.onopen = () => {
        state.isConnected = true;
        state.lastPongAt = Date.now();
        state.wsFailCount = 0;
        if (state._disconnectTimer) {
          clearTimeout(state._disconnectTimer);
          state._disconnectTimer = null;
        }
        syncSourceSubscriptions();
        sendWs({ action: "set_ai_filter", enabled: state.settings.aiOnly });
        startHeartbeat();
        renderStatus();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleWsPayload(payload);
        } catch (error) {
          console.warn("[土狗雷达] WebSocket 消息解析失败", error);
        }
      };

      ws.onclose = () => {
        state.isConnected = false;
        stopHeartbeat();
        // 延迟显示断开状态，避免短暂重连闪烁
        if (state._disconnectTimer) clearTimeout(state._disconnectTimer);
        state._disconnectTimer = setTimeout(() => {
          if (!state.isConnected) renderStatus();
        }, 2000);
        // WS 连接失败时，检测是否是 5s 盾导致
        checkCfShieldOnWsFailure();
        scheduleReconnect();
      };

      ws.onerror = () => {
        state.isConnected = false;
      };
    } catch (error) {
      console.warn("[土狗雷达] WebSocket 连接失败", error);
      scheduleReconnect();
    }
  }

  function disconnectWebSocket() {
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    stopHeartbeat();
    if (state.ws) {
      try {
        state.ws.close();
      } catch (error) {
        // ignore
      }
      state.ws = null;
    }
  }

  function scheduleReconnect() {
    if (state.reconnectTimer) return;
    state.wsFailCount = (state.wsFailCount || 0) + 1;
    // 连续失败 3 次后，启动 API 轮询回退
    if (state.wsFailCount >= 3 && !state.pollingTimer) {
      startPolling();
    }
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connectWebSocket();
    }, 5000);
  }

  function startPolling() {
    if (state.pollingTimer) return;
    console.log("[土狗雷达] WebSocket 不可用，启动 API 轮询");
    state.pollingTimer = setInterval(async () => {
      try {
        await refreshMessages();
        const status = await fetchJson("/api/status");
        state.status = status;
        renderStatus();
      } catch (e) {
        // 轮询失败，静默忽略
      }
    }, 5000);
  }

  function stopPolling() {
    if (state.pollingTimer) {
      clearInterval(state.pollingTimer);
      state.pollingTimer = null;
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    state.heartbeatTimer = setInterval(() => {
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      if (Date.now() - state.lastPongAt > 45000) {
        try {
          state.ws.close();
        } catch (error) {
          // ignore
        }
        return;
      }
      sendWs({ action: "ping" });
    }, 15000);
  }

  function stopHeartbeat() {
    if (state.heartbeatTimer) {
      clearInterval(state.heartbeatTimer);
      state.heartbeatTimer = null;
    }
  }

  function sendWs(data) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(data));
    }
  }

  function handleWsPayload(payload) {
    switch (payload.type) {
      case "connected":
        state.onlineCount = payload.data?.online_count || 0;
        renderStatus();
        break;
      case "pong":
        state.lastPongAt = Date.now();
        break;
      case "ai_filter_updated":
        state.settings.aiOnly = Boolean(payload.data?.enabled);
        saveSettings();
        renderControls();
        break;
      case "new_message": {
        const message = normalizeMessage(payload.data || {});
        upsertMessage(message, true);
        break;
      }
      case "message_update":
        applyMessageUpdate(payload.data || {});
        break;
      case "hot_search_update": {
        const synthetic = createHotSearchMessage(payload.data?.source, payload.data?.changes || []);
        upsertMessage(synthetic, true);
        break;
      }
      default:
        break;
    }
  }

  function upsertMessage(message, fromRealtime) {
    const index = state.messages.findIndex((item) => item.key === message.key);
    if (index >= 0) {
      state.messages[index] = { ...state.messages[index], ...message };
    } else {
      state.messages.unshift(message);
    }

    state.messages.sort(compareMessages);
    state.messages = state.messages.slice(0, MAX_MESSAGES);

    if (fromRealtime) {
      incrementGroupUnread(message.group_name);
      maybeNotify(message);
      flashPanel();

      // 用户滚动下方时，显示新消息浮窗
      if (refs.list && refs.list.scrollTop > 30) {
        state._newMsgCount = (state._newMsgCount || 0) + 1;
        if (refs.newMsgToast) {
          refs.newMsgToast.textContent = `↑ ${state._newMsgCount} 条新消息`;
          refs.newMsgToast.style.display = "block";
        }
      }
    }

    renderAll();
  }

  function applyMessageUpdate(update) {
    const key = `msg-${update.id}`;
    const target = state.messages.find((item) => item.key === key);
    if (!target) return;

    if ("is_meme" in update) target.is_meme = Boolean(update.is_meme);
    if ("ai_summary" in update) target.ai_summary = update.ai_summary || "";
    if ("ai_tags" in update && Array.isArray(update.ai_tags)) target.ai_tags = update.ai_tags;
    if ("ai_confidence" in update) target.ai_confidence = typeof update.ai_confidence === "number" ? update.ai_confidence : null;
    if ("link_url" in update) target.link_url = update.link_url || "";
    if ("media_url" in update) target.media_url = normalizeMediaUrl(update.media_url);
    if ("message_kind" in update) target.message_kind = update.message_kind || null;
    if ("metadata" in update) target.metadata = update.metadata || null;

    renderMessages();
  }

  function incrementGroupUnread(groupName) {
    const group = state.groups.find((item) => item.group_name === groupName);
    if (group) {
      group.unread_count = (group.unread_count || 0) + 1;
    }
  }

  function maybeNotify(message) {
    if (!passesFilters(message)) return;

    const hits = getKeywordHits(message);
    if (state.settings.keywords.length > 0 && hits.length === 0) {
      return;
    }

    playNotificationSound(false);
  }

  function flashPanel() {
    refs.panel.classList.remove("is-flashing");
    void refs.panel.offsetWidth;
    refs.panel.classList.add("is-flashing");
  }

  async function addKeyword() {
    const raw = refs.keywordInput.value.trim();
    if (!raw) return;

    const keyword = raw.toLowerCase();
    if (!state.settings.keywords.includes(keyword)) {
      state.settings.keywords = [...state.settings.keywords, keyword];
      await saveSettings();
    }

    refs.keywordInput.value = "";
    renderKeywords();
    renderMessages();
  }

  async function removeKeyword(keyword) {
    state.settings.keywords = state.settings.keywords.filter((item) => item !== keyword);
    await saveSettings();
    renderKeywords();
    renderMessages();
  }

  async function toggleSource(groupName) {
    state.settings.sourceStates[groupName] = state.settings.sourceStates[groupName] === false;
    await saveSettings();
    sendWs({
      action: state.settings.sourceStates[groupName] === false ? "unsubscribe" : "subscribe",
      group_name: groupName
    });
    renderSources();
    renderMessages();
  }

  function getUnreadCount() {
    return state.messages.filter((item) => item.is_new && passesFilters(item)).length;
  }

  function passesFilters(message) {
    if (state.settings.aiOnly && !message.is_meme) return false;
    return state.settings.sourceStates[message.group_name] !== false;
  }

  function getKeywordHits(message) {
    if (!state.settings.keywords.length) return [];
    const haystack = [
      message.group_name,
      message.channel_name,
      message.content,
      message.ai_summary,
      (message.ai_tags || []).join(" ")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return state.settings.keywords.filter((keyword) => haystack.includes(keyword));
  }

  function getVisibleMessages() {
    return state.messages
      .filter((message) => passesFilters(message))
      .map((message) => ({
        ...message,
        keywordHits: getKeywordHits(message)
      }))
      .sort((a, b) => {
        const aHit = a.keywordHits.length > 0 ? 1 : 0;
        const bHit = b.keywordHits.length > 0 ? 1 : 0;
        if (aHit !== bHit) return bHit - aHit;
        if (a.is_new !== b.is_new) return a.is_new ? -1 : 1;
        return compareMessages(a, b);
      });
  }

  function renderAll() {
    renderVisibility();
    renderStatus();
    renderSettings();
    renderControls();
    renderSources();
    renderKeywords();
    renderMessages();
  }

  function renderVisibility() {
    refs.panel.classList.toggle("is-hidden", state.settings.minimized);
    refs.bubble.classList.toggle("is-hidden", !state.settings.minimized);
    refs.bubbleCount.textContent = String(getUnreadCount());
  }

  function renderStatus() {
    refs.statusDot.classList.toggle("connected", state.isConnected);
    refs.statusText.textContent = state.isConnected
      ? `实时连接中 · ${state.status?.telegram_connected ? "TG在线" : "TG离线"}`
      : state.error || "连接中断";
    refs.onlinePill.textContent = `巡田员 ${state.onlineCount || state.status?.online_users || 0}`;
    refs.unreadPill.textContent = `未读 ${getUnreadCount()}`;
    refs.bubbleCount.textContent = String(getUnreadCount());
  }

  function renderControls() {
    refs.soundToggle.classList.toggle("active", state.settings.soundEnabled);
    refs.soundToggle.textContent = state.settings.soundEnabled ? "🔊 声音已开" : "🔇 声音已关";
    refs.aiToggle.classList.toggle("active", state.settings.aiOnly);
    refs.soundSelect.value = state.settings.soundProfile;
    refs.soundSelect.disabled = !state.settings.soundEnabled;
    refs.soundTestBtn.disabled = !state.settings.soundEnabled;
    refs.soundSwitchBtn.classList.toggle("active", state.settings.soundEnabled);
    refs.soundSwitchBtn.textContent = state.settings.soundEnabled ? "🔊 已开启" : "🔇 已关闭";
  }

  function renderSettings() {
    refs.settingsPanel.classList.toggle("is-open", state.settings.settingsOpen);
    refs.settingsBtn.classList.toggle("active", state.settings.settingsOpen);
    if (refs.settingsBackdrop) {
      refs.settingsBackdrop.classList.toggle("is-open", state.settings.settingsOpen);
    }
  }

  function renderSources() {
    refs.sourceList.textContent = "";

    if (!state.groups.length) {
      const empty = document.createElement("span");
      empty.className = "tugou-keyword-empty";
      empty.textContent = "暂无来源数据";
      refs.sourceList.appendChild(empty);
      return;
    }

    const groups = [...state.groups].sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0) || (b.message_count || 0) - (a.message_count || 0));
    for (const group of groups) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tugou-source-chip";
      applySourceTheme(chip, group.group_name);
      const enabled = state.settings.sourceStates[group.group_name] !== false;
      chip.classList.toggle("disabled", !enabled);

      const icon = document.createElement("span");
      icon.className = "tugou-source-icon";
      icon.textContent = getSourceIcon(group.group_name);
      const name = document.createElement("span");
      name.textContent = group.group_name;
      const count = document.createElement("span");
      count.className = "tugou-source-chip-count";
      count.textContent = String(group.unread_count || 0);
      chip.append(icon, name, count);
      chip.addEventListener("click", () => toggleSource(group.group_name));
      refs.sourceList.appendChild(chip);
    }
  }

  function renderKeywords() {
    refs.keywordList.textContent = "";

    if (!state.settings.keywords.length) {
      const empty = document.createElement("span");
      empty.className = "tugou-keyword-empty";
      empty.textContent = "暂无关键词种子，命中后会自动高亮并优先显示";
      refs.keywordList.appendChild(empty);
      return;
    }

    for (const keyword of state.settings.keywords) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tugou-keyword-chip";
      chip.textContent = `#${keyword} ×`;
      chip.addEventListener("click", () => removeKeyword(keyword));
      refs.keywordList.appendChild(chip);
    }
  }

  function renderMessages() {
    // 记住当前可见的第一条消息
    const scrollTop = refs.list.scrollTop;
    let anchorId = null;
    let anchorOffset = 0;
    if (scrollTop > 0) {
      for (const child of refs.list.children) {
        const id = child.dataset && child.dataset.msgId;
        if (id) {
          anchorId = id;
          anchorOffset = child.getBoundingClientRect().top - refs.list.getBoundingClientRect().top;
          break;
        }
      }
    }

    refs.list.textContent = "";
    // 重新插入新消息浮窗（textContent清空会移除它）
    if (refs.newMsgToast) refs.list.appendChild(refs.newMsgToast);
    const visibleMessages = getVisibleMessages();

    if (!visibleMessages.length) {
      refs.empty.textContent = "当前筛选条件下暂无消息";
      refs.list.appendChild(refs.empty);
      renderStatus();
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const message of visibleMessages.slice(0, 50)) {
      fragment.appendChild(createMessageCard(message));
    }
    refs.list.appendChild(fragment);

    // 恢复滚动位置：找到之前可见的消息，滚到相同偏移
    if (anchorId) {
      const anchorEl = refs.list.querySelector(`[data-msg-id="${anchorId}"]`);
      if (anchorEl) {
        const newTop = anchorEl.getBoundingClientRect().top - refs.list.getBoundingClientRect().top;
        refs.list.scrollTop = refs.list.scrollTop + (newTop - anchorOffset);
      } else {
        refs.list.scrollTop = scrollTop;
      }
    }

    renderStatus();
  }

  function createMessageCard(message) {
    // X 推文消息使用专属卡片
    if (message.message_kind && message.message_kind.startsWith("x_") && message.metadata) {
      const kind = message.metadata.kind;
      if (kind === "x_follow_event") return createXFollowCard(message);
      if (kind === "x_profile_change") return createXProfileChangeCard(message);
      return createXTweetCard(message);
    }

    const card = document.createElement("article");
    card.className = "tugou-card";
    card.dataset.msgId = String(message.id);
    applySourceTheme(card, message.group_name);
    card.classList.toggle("is-hit", message.keywordHits.length > 0);

    const head = document.createElement("div");
    head.className = "tugou-card-head";

    const meta = document.createElement("div");
    meta.className = "tugou-meta";

    const group = document.createElement("div");
    group.className = "tugou-group";
    const groupBadge = document.createElement("span");
    groupBadge.className = "tugou-group-badge";
    applySourceTheme(groupBadge, message.group_name);
    const groupIcon = document.createElement("span");
    groupIcon.className = "tugou-source-icon";
    groupIcon.textContent = getSourceIcon(message.group_name);
    const groupLabel = document.createElement("span");
    groupLabel.textContent = message.group_name;
    groupBadge.append(groupIcon, groupLabel);
    const time = document.createElement("span");
    time.textContent = formatTime(message.created_at_ms);
    group.append(groupBadge, time);

    const title = document.createElement("div");
    title.className = "tugou-card-title";
    appendHighlightedText(title, primaryTitle(message), message.keywordHits);

    meta.append(group, title);
    if (shouldShowSummary(message)) {
      const summary = document.createElement("div");
      summary.className = "tugou-card-summary";
      appendHighlightedText(summary, message.ai_summary, message.keywordHits);
      meta.appendChild(summary);
    }

    const content = buildContentBlock(message);
    if (content) {
      meta.appendChild(content);
    }

    if (message.media_url) {
      const media = document.createElement("div");
      media.className = "tugou-card-media";
      const image = document.createElement("img");
      image.src = message.media_url;
      image.alt = message.group_name;
      image.loading = "lazy";
      image.addEventListener("error", () => media.remove());
      media.addEventListener("click", async () => {
        openExternal(message.link_url || message.media_url);
        await markMessageLocal(message);
      });
      media.appendChild(image);
      meta.appendChild(media);
    }

    head.appendChild(meta);

    if (message.is_new) {
      const badge = document.createElement("span");
      badge.className = "tugou-new";
      badge.textContent = "NEW";
      head.appendChild(badge);
    }

    const actions = document.createElement("div");
    actions.className = "tugou-card-actions";

    const tags = document.createElement("div");
    tags.className = "tugou-card-tags";
    if (message.keywordHits.length > 0) {
      for (const hit of message.keywordHits) {
        const tag = document.createElement("span");
        tag.className = "tugou-tag";
        tag.textContent = `命中 #${hit}`;
        tags.appendChild(tag);
      }
    }
    if (message.is_meme) {
      const tag = document.createElement("span");
      tag.className = "tugou-tag is-meme";
      tag.textContent = "风向精选";
      tags.appendChild(tag);
    }

    if (shouldShowAiMeta(message) && typeof message.ai_confidence === "number") {
      const tag = document.createElement("span");
      tag.className = "tugou-tag";
      tag.textContent = `AI ${message.ai_confidence}%`;
      tags.appendChild(tag);
    }

    const buttons = document.createElement("div");
    buttons.className = "tugou-card-buttons";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "tugou-mini-btn";
    copyButton.textContent = "复制";
    copyButton.addEventListener("click", async () => {
      await copyMessage(message);
      await markMessageLocal(message);
    });

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "tugou-mini-btn";
    openButton.textContent = message.link_url ? "打开" : "详情";
    openButton.addEventListener("click", async () => {
      if (message.link_url) {
        openExternal(message.link_url);
      } else {
        openExternal(`${state.settings.apiBase}/`);
      }
      await markMessageLocal(message);
    });

    buttons.append(copyButton, openButton);
    actions.append(tags, buttons);

    card.append(head, actions);
    return card;
  }

  function createXTweetCard(message) {
    const meta = message.metadata;
    const user = meta.user || {};
    const handle = user.screen_name || "";
    const displayName = user.name || handle || "Unknown";
    const tweetType = meta.tweet_type || "tweet";
    // extractCleanContent 提取 "推文内容:" 部分（引用推文时是发推人的评论），
    // meta.text 对于引用推文类型包含的是被引用内容，不是发推人的正文，所以优先用 extractCleanContent。
    // 但对于回复类型，meta.text 是回复正文（来自 enrichment），更可靠。
    const tweetText = tweetType === "reply"
      ? (meta.text || (message.content ? extractCleanContent(message.content) : null) || "")
      : ((message.content ? extractCleanContent(message.content) : null) || meta.text || "");
    const tweetUrl = meta.tweet_url || message.link_url || "";
    const avatarUrl = proxyAvatar(user.avatar
      || (handle ? `https://unavatar.io/twitter/${handle}` : ""))
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f172a&color=f8fafc&size=40`;

    const TYPE_LABELS = { reply: "回复", quote: "引用", repost: "转推", tweet: "推文", ca_alert: "CA" };

    const card = document.createElement("article");
    card.className = "tugou-card tugou-x-card";
    card.dataset.msgId = String(message.id);
    applySourceTheme(card, message.group_name);
    card.classList.toggle("is-hit", message.keywordHits.length > 0);

    // Header: time + type badge + group
    const header = document.createElement("div");
    header.className = "tugou-x-header";
    const timeSpan = document.createElement("span");
    timeSpan.className = "tugou-x-time";
    timeSpan.textContent = formatTime(message.created_at_ms);
    const typeBadge = document.createElement("span");
    typeBadge.className = `tugou-x-type tugou-x-type-${tweetType}`;
    typeBadge.textContent = TYPE_LABELS[tweetType] || tweetType;
    const groupBadge = document.createElement("span");
    groupBadge.className = "tugou-group-badge";
    applySourceTheme(groupBadge, message.group_name);
    groupBadge.innerHTML = `<span class="tugou-source-icon">${getSourceIcon(message.group_name)}</span><span>${message.group_name}</span>`;
    header.append(timeSpan, typeBadge, groupBadge);
    if (tweetUrl) {
      const originLink = document.createElement("a");
      originLink.className = "tugou-x-origin";
      originLink.textContent = "原文";
      originLink.addEventListener("click", (e) => { e.stopPropagation(); openExternal(tweetUrl); });
      header.appendChild(originLink);
    }

    // Card body
    const body = document.createElement("div");
    body.className = "tugou-x-body";

    // Author row
    const authorRow = document.createElement("div");
    authorRow.className = "tugou-x-author";
    const avatar = document.createElement("img");
    avatar.className = "tugou-x-avatar";
    avatar.src = avatarUrl;
    avatar.alt = displayName;
    avatar.loading = "lazy";
    avatar.addEventListener("error", () => {
      if (!avatar.src.includes("avatar-proxy") && !avatar.src.includes("ui-avatars.com") && handle) {
        avatar.src = proxyAvatar(`https://unavatar.io/twitter/${handle}`);
      } else if (!avatar.src.includes("ui-avatars.com")) {
        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f172a&color=f8fafc&size=40`;
      }
    });
    const authorInfo = document.createElement("div");
    authorInfo.className = "tugou-x-author-info";
    const nameSpan = document.createElement("span");
    nameSpan.className = "tugou-x-name";
    nameSpan.textContent = displayName;
    const handleSpan = document.createElement("span");
    handleSpan.className = "tugou-x-handle";
    handleSpan.textContent = handle ? `@${handle}` : "";
    authorInfo.append(nameSpan, handleSpan);
    if (user.note || user.bio) {
      const bio = document.createElement("div");
      bio.className = "tugou-x-bio";
      bio.textContent = user.note || user.bio;
      authorInfo.appendChild(bio);
    }
    authorRow.append(avatar, authorInfo);
    body.appendChild(authorRow);

    // Reply context
    if (meta.reply_to && (meta.reply_to.text || meta.reply_to.user?.screen_name)) {
      const replyBlock = document.createElement("div");
      replyBlock.className = "tugou-x-reply";
      const replyLabel = document.createElement("div");
      replyLabel.className = "tugou-x-reply-label";
      replyLabel.textContent = "回复上下文";
      const replyUser = meta.reply_to.user || {};

      // Reply author row with avatar
      const replyAuthor = document.createElement("div");
      replyAuthor.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:4px;";
      const rAvatarUrl = proxyAvatar(replyUser.avatar
        || (replyUser.screen_name ? `https://unavatar.io/twitter/${replyUser.screen_name}` : ""))
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(replyUser.name || "?")}&background=0f172a&color=f8fafc&size=28`;
      if (rAvatarUrl) {
        const rAvatar = document.createElement("img");
        rAvatar.src = rAvatarUrl;
        rAvatar.style.cssText = "width:20px;height:20px;border-radius:50%;flex-shrink:0;";
        rAvatar.loading = "lazy";
        rAvatar.addEventListener("error", () => {
          if (!rAvatar.src.includes("avatar-proxy") && !rAvatar.src.includes("ui-avatars.com") && replyUser.screen_name) {
            rAvatar.src = proxyAvatar(`https://unavatar.io/twitter/${replyUser.screen_name}`);
          } else if (!rAvatar.src.includes("ui-avatars.com")) {
            rAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(replyUser.name || "?")}&background=0f172a&color=f8fafc&size=28`;
          }
        });
        replyAuthor.appendChild(rAvatar);
      }
      const rNameSpan = document.createElement("span");
      rNameSpan.style.cssText = "font-size:11px;color:rgba(231,240,232,0.7);font-weight:600;";
      rNameSpan.textContent = `${replyUser.name || replyUser.screen_name || ""}${replyUser.screen_name ? " @" + replyUser.screen_name : ""}`;
      replyAuthor.appendChild(rNameSpan);
      replyBlock.append(replyLabel, replyAuthor);

      if (meta.reply_to.text) {
        const replyText = document.createElement("div");
        replyText.className = "tugou-x-reply-text";
        appendRichText(replyText, meta.reply_to.text, message.keywordHits);
        replyBlock.appendChild(replyText);
      }
      // Reply media
      if (meta.reply_to.media && meta.reply_to.media.length > 0) {
        const rMedia = document.createElement("div");
        rMedia.className = "tugou-x-media";
        rMedia.style.marginTop = "6px";
        for (const item of meta.reply_to.media.slice(0, 4)) {
          const img = document.createElement("img");
          img.src = item.url || item;
          img.loading = "lazy";
          img.addEventListener("error", () => img.remove());
          rMedia.appendChild(img);
        }
        replyBlock.appendChild(rMedia);
        attachLightboxToMedia(rMedia);
      }
      body.appendChild(replyBlock);
    }

    // Tweet text
    if (tweetText) {
      const textDiv = document.createElement("div");
      textDiv.className = "tugou-x-text";
      appendRichText(textDiv, tweetText, message.keywordHits);
      body.appendChild(textDiv);
    }

    // CA badge
    if (meta.ca_address) {
      const caBadge = document.createElement("div");
      caBadge.className = "tugou-x-ca";
      caBadge.textContent = `CA: ${meta.ca_address.slice(0, 8)}...${meta.ca_address.slice(-6)}`;
      caBadge.addEventListener("click", () => {
        navigator.clipboard.writeText(meta.ca_address).catch(() => {});
        openExternal(`https://dexscreener.com/solana/${meta.ca_address}`);
      });
      body.appendChild(caBadge);
    }

    // Metrics
    if (meta.metrics) {
      const metrics = document.createElement("div");
      metrics.className = "tugou-x-metrics";
      const m = meta.metrics;
      if (m.retweets != null) metrics.innerHTML += `<span>转推 ${formatCount(m.retweets)}</span>`;
      if (m.likes != null) metrics.innerHTML += `<span>点赞 ${formatCount(m.likes)}</span>`;
      if (m.replies != null) metrics.innerHTML += `<span>回复 ${formatCount(m.replies)}</span>`;
      body.appendChild(metrics);
    }

    // Quoted tweet — enrichment 前 quoted_tweet 为 null，用 meta.text 做兜底（对 quote 类型，meta.text 就是被引用内容）
    let quoted = meta.quoted_tweet || meta.retweeted_tweet || null;
    if (!quoted && tweetType === "quote" && meta.text) {
      quoted = { user: {}, text: meta.text, media: [] };
    }
    if (quoted && (quoted.text || (quoted.media && quoted.media.length))) {
      const qBlock = document.createElement("div");
      qBlock.className = "tugou-x-quoted";
      const qLabel = document.createElement("div");
      qLabel.className = "tugou-x-reply-label";
      qLabel.textContent = (meta.quoted_tweet || tweetType === "quote") ? "引用推文" : "转推内容";
      const qUser = quoted.user || {};
      const qHead = document.createElement("div");
      qHead.className = "tugou-x-quoted-head";

      // Quoted tweet author avatar + name
      const qAvatarUrl = proxyAvatar(qUser.avatar
        || (qUser.screen_name ? `https://unavatar.io/twitter/${qUser.screen_name}` : ""))
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(qUser.name || "?")}&background=0f172a&color=f8fafc&size=28`;
      if (qAvatarUrl) {
        const qAvatar = document.createElement("img");
        qAvatar.src = qAvatarUrl;
        qAvatar.style.cssText = "width:20px;height:20px;border-radius:50%;margin-right:6px;vertical-align:middle;";
        qAvatar.loading = "lazy";
        qAvatar.addEventListener("error", () => {
          if (!qAvatar.src.includes("avatar-proxy") && !qAvatar.src.includes("ui-avatars.com") && qUser.screen_name) {
            qAvatar.src = proxyAvatar(`https://unavatar.io/twitter/${qUser.screen_name}`);
          } else if (!qAvatar.src.includes("ui-avatars.com")) {
            qAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(qUser.name || "?")}&background=0f172a&color=f8fafc&size=28`;
          }
        });
        qHead.appendChild(qAvatar);
      }
      const qNameSpan = document.createElement("span");
      qNameSpan.textContent = `${qUser.name || ""} @${qUser.screen_name || ""}`;
      qHead.appendChild(qNameSpan);

      qBlock.append(qLabel, qHead);
      if (quoted.text) {
        const qText = document.createElement("div");
        qText.className = "tugou-x-reply-text";
        appendRichText(qText, quoted.text, message.keywordHits);
        qBlock.appendChild(qText);
      }
      // Quoted tweet media
      if (quoted.media && quoted.media.length > 0) {
        const qMedia = document.createElement("div");
        qMedia.className = "tugou-x-media";
        qMedia.style.marginTop = "6px";
        for (const item of quoted.media.slice(0, 4)) {
          const img = document.createElement("img");
          img.src = item.url || item;
          img.loading = "lazy";
          img.addEventListener("error", () => img.remove());
          qMedia.appendChild(img);
        }
        qBlock.appendChild(qMedia);
        attachLightboxToMedia(qMedia);
      }
      body.appendChild(qBlock);
    }

    // Media
    if (meta.media && meta.media.length > 0) {
      const mediaGrid = document.createElement("div");
      mediaGrid.className = "tugou-x-media";
      for (const item of meta.media.slice(0, 4)) {
        const img = document.createElement("img");
        img.src = item.url || item;
        img.loading = "lazy";
        img.addEventListener("error", () => img.remove());
        mediaGrid.appendChild(img);
      }
      body.appendChild(mediaGrid);
      attachLightboxToMedia(mediaGrid);
    }

    // AI summary
    if (message.ai_summary) {
      const summary = document.createElement("div");
      summary.className = "tugou-x-summary";
      summary.textContent = message.ai_summary;
      body.appendChild(summary);
    }

    // NEW badge
    if (message.is_new) {
      const badge = document.createElement("span");
      badge.className = "tugou-new tugou-x-new";
      badge.textContent = "NEW";
      header.appendChild(badge);
    }

    card.append(header, body);
    return card;
  }

  function formatCount(n) {
    if (n == null) return "";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function openLightbox(src) {
    // Close any existing lightbox
    const existing = shadow.querySelector(".tugou-x-lightbox");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "tugou-x-lightbox";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    overlay.appendChild(img);
    overlay.addEventListener("click", () => overlay.remove());
    // ESC to close
    const onKey = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
    shadow.appendChild(overlay);
  }

  function attachLightboxToMedia(container) {
    container.querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", (e) => {
        e.stopPropagation();
        openLightbox(img.src);
      });
    });
  }

  /**
   * 从原始 TG 消息内容中提取干净的推文正文。
   * message.content 包含完整 TG 消息（含标题、标签等），
   * 这里剥离已知的头部标签，提取 "推文内容:" 或 "引用内容:" 之后的正文。
   */
  function extractCleanContent(raw) {
    if (!raw) return "";
    // 尝试提取 "推文内容:" 之后的内容
    const contentIdx = raw.indexOf("推文内容:");
    const quoteIdx = raw.indexOf("引用内容:");
    const replyIdx = raw.indexOf("回帖内容:");
    if (contentIdx >= 0) {
      // 如果同时有引用内容或回复上下文，取推文内容到它们之间
      let end = raw.length;
      if (quoteIdx > contentIdx) end = Math.min(end, quoteIdx);
      const replyCtxIdx = raw.indexOf("回复上下文:");
      if (replyCtxIdx > contentIdx) end = Math.min(end, replyCtxIdx);
      const text = raw.slice(contentIdx + "推文内容:".length, end).trim();
      if (text) return text;
    }
    if (replyIdx >= 0) {
      return raw.slice(replyIdx + "回帖内容:".length).trim();
    }
    if (quoteIdx >= 0) {
      return raw.slice(quoteIdx + "引用内容:".length).trim();
    }
    // 兜底：去掉已知头部行，返回剩余内容
    const lines = raw.split("\n").filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (/^🌟监控到/.test(t)) return false;
      if (/^📢/.test(t)) return false;
      if (/^你关注的用户[:：]/.test(t)) return false;
      if (/^用户所属分组[:：]/.test(t)) return false;
      return true;
    });
    return lines.join("\n").trim();
  }

  function createXFollowCard(message) {
    const meta = message.metadata;
    const actor = meta.actor || {};
    const target = meta.target || {};
    const isFollow = meta.action === "follow";

    const card = document.createElement("article");
    card.className = "tugou-card tugou-x-card";
    card.dataset.msgId = String(message.id);
    applySourceTheme(card, message.group_name);

    // Header
    const header = document.createElement("div");
    header.className = "tugou-x-header";
    const timeSpan = document.createElement("span");
    timeSpan.className = "tugou-x-time";
    timeSpan.textContent = formatTime(message.created_at_ms);
    const typeBadge = document.createElement("span");
    typeBadge.className = `tugou-x-type ${isFollow ? "tugou-x-type-follow" : "tugou-x-type-unfollow"}`;
    typeBadge.textContent = isFollow ? "关注" : "取关";
    const groupBadge = document.createElement("span");
    groupBadge.className = "tugou-group-badge";
    applySourceTheme(groupBadge, message.group_name);
    groupBadge.innerHTML = `<span class="tugou-source-icon">${getSourceIcon(message.group_name)}</span><span>${message.group_name}</span>`;
    header.append(timeSpan, typeBadge, groupBadge);
    if (message.is_new) {
      const badge = document.createElement("span");
      badge.className = "tugou-new tugou-x-new";
      badge.textContent = "NEW";
      header.appendChild(badge);
    }

    // Body: actor → target
    const body = document.createElement("div");
    body.className = "tugou-x-follow-shell";

    function makeFollowNode(user) {
      const node = document.createElement("div");
      node.className = "tugou-x-follow-node";
      const handle = user.screen_name || "";
      const displayName = user.name || handle || "Unknown";
      const avatarUrl = proxyAvatar(user.avatar
        || (handle ? `https://unavatar.io/twitter/${handle}` : ""))
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f172a&color=f8fafc&size=40`;
      const avatar = document.createElement("img");
      avatar.className = "tugou-x-avatar";
      avatar.src = avatarUrl;
      avatar.alt = displayName;
      avatar.loading = "lazy";
      avatar.addEventListener("error", () => {
        if (!avatar.src.includes("avatar-proxy") && !avatar.src.includes("ui-avatars.com") && handle) {
          avatar.src = proxyAvatar(`https://unavatar.io/twitter/${handle}`);
        } else if (!avatar.src.includes("ui-avatars.com")) {
          avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f172a&color=f8fafc&size=40`;
        }
      });
      const info = document.createElement("div");
      info.className = "tugou-x-author-info";
      const nameSpan = document.createElement("span");
      nameSpan.className = "tugou-x-name";
      nameSpan.textContent = displayName;
      const handleSpan = document.createElement("span");
      handleSpan.className = "tugou-x-handle";
      handleSpan.textContent = handle ? `@${handle}` : "";
      info.append(nameSpan, handleSpan);
      if (user.bio) {
        const bio = document.createElement("div");
        bio.className = "tugou-x-bio";
        bio.textContent = user.bio;
        info.appendChild(bio);
      }
      node.append(avatar, info);
      return node;
    }

    const arrow = document.createElement("div");
    arrow.className = `tugou-x-follow-arrow ${isFollow ? "follow" : "unfollow"}`;
    arrow.textContent = isFollow ? "→" : "↘";

    body.append(makeFollowNode(actor), arrow, makeFollowNode(target));
    card.append(header, body);
    return card;
  }

  function createXProfileChangeCard(message) {
    const meta = message.metadata;
    const username = meta.username || "";
    const changes = meta.changes || [];

    const card = document.createElement("article");
    card.className = "tugou-card tugou-x-card";
    card.dataset.msgId = String(message.id);
    applySourceTheme(card, message.group_name);

    // Header
    const header = document.createElement("div");
    header.className = "tugou-x-header";
    const timeSpan = document.createElement("span");
    timeSpan.className = "tugou-x-time";
    timeSpan.textContent = formatTime(message.created_at_ms);
    const typeBadge = document.createElement("span");
    typeBadge.className = "tugou-x-type tugou-x-type-profile";
    typeBadge.textContent = "资料变更";
    const groupBadge = document.createElement("span");
    groupBadge.className = "tugou-group-badge";
    applySourceTheme(groupBadge, message.group_name);
    groupBadge.innerHTML = `<span class="tugou-source-icon">${getSourceIcon(message.group_name)}</span><span>${message.group_name}</span>`;
    header.append(timeSpan, typeBadge, groupBadge);

    if (username) {
      const profileLink = document.createElement("a");
      profileLink.className = "tugou-x-origin";
      profileLink.textContent = `@${username}`;
      profileLink.addEventListener("click", (e) => { e.stopPropagation(); openExternal(`https://x.com/${username}`); });
      header.appendChild(profileLink);
    }
    if (message.is_new) {
      const badge = document.createElement("span");
      badge.className = "tugou-new tugou-x-new";
      badge.textContent = "NEW";
      header.appendChild(badge);
    }

    // Body
    const body = document.createElement("div");
    body.className = "tugou-x-body";

    const title = document.createElement("div");
    title.className = "tugou-x-profile-title";
    title.textContent = `@${username}`;
    body.appendChild(title);

    for (const change of changes) {
      const row = document.createElement("div");
      row.className = "tugou-x-profile-row";

      const fieldLabel = document.createElement("span");
      fieldLabel.className = "tugou-x-profile-field";
      fieldLabel.textContent = change.field === "name" ? "昵称" : "头像";
      row.appendChild(fieldLabel);

      if (change.field === "name") {
        const oldSpan = document.createElement("span");
        oldSpan.className = "tugou-x-profile-old";
        oldSpan.textContent = change.old_value || "未知";
        const arrowSpan = document.createElement("span");
        arrowSpan.className = "tugou-x-profile-arrow";
        arrowSpan.textContent = "→";
        const newSpan = document.createElement("span");
        newSpan.className = "tugou-x-profile-new";
        newSpan.textContent = change.new_value || "未知";
        row.append(oldSpan, arrowSpan, newSpan);
      } else {
        const avatarChange = document.createElement("div");
        avatarChange.className = "tugou-x-profile-avatar-change";
        if (change.old_value) {
          const oldImg = document.createElement("img");
          oldImg.src = change.old_value;
          oldImg.alt = "旧头像";
          oldImg.addEventListener("error", () => oldImg.remove());
          avatarChange.appendChild(oldImg);
        } else {
          const placeholder = document.createElement("span");
          placeholder.textContent = "旧头像";
          avatarChange.appendChild(placeholder);
        }
        const arrowSpan = document.createElement("span");
        arrowSpan.className = "tugou-x-profile-arrow";
        arrowSpan.textContent = "→";
        avatarChange.appendChild(arrowSpan);
        if (change.new_value) {
          const newImg = document.createElement("img");
          newImg.src = change.new_value;
          newImg.alt = "新头像";
          newImg.addEventListener("error", () => newImg.remove());
          avatarChange.appendChild(newImg);
        } else {
          const placeholder = document.createElement("span");
          placeholder.textContent = "新头像";
          avatarChange.appendChild(placeholder);
        }
        row.appendChild(avatarChange);
      }

      body.appendChild(row);
    }

    card.append(header, body);
    return card;
  }

  async function copyMessage(message) {
    const text = [
      `[${message.group_name}] ${message.channel_name}`,
      message.content || "",
      message.ai_summary ? `AI摘要：${message.ai_summary}` : "",
      message.link_url ? `链接：${message.link_url}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  async function markMessageLocal(message) {
    if (!message.is_new) return;
    message.is_new = false;
    if (typeof message.id === "number") {
      await markAsRead(message.id);
    }
    const group = state.groups.find((item) => item.group_name === message.group_name);
    if (group && group.unread_count > 0) {
      group.unread_count -= 1;
    }
    renderAll();
  }

  function appendHighlightedText(container, text, hits) {
    const safeText = text || "";
    if (!hits || !hits.length) {
      container.textContent = safeText;
      return;
    }

    const normalizedHits = [...new Set(hits.filter(Boolean))]
      .sort((a, b) => b.length - a.length)
      .map((item) => escapeRegExp(item));

    if (!normalizedHits.length) {
      container.textContent = safeText;
      return;
    }

    const regex = new RegExp(`(${normalizedHits.join("|")})`, "ig");
    const parts = safeText.split(regex);

    for (const part of parts) {
      if (!part) continue;
      const matched = hits.some((hit) => hit && hit.toLowerCase() === part.toLowerCase());
      if (matched) {
        const mark = document.createElement("mark");
        mark.className = "tugou-mark";
        mark.textContent = part;
        container.appendChild(mark);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    }
  }

  function primaryText(message) {
    if (message.content) return snippetFromMessage(message);
    if (message.ai_summary) return message.ai_summary;
    return `${message.channel_name} 的新消息`;
  }

  function primaryTitle(message) {
    if (message.channel_name && message.channel_name !== message.group_name && message.channel_name !== "土狗气象台") {
      return message.channel_name;
    }
    return primaryText(message);
  }

  function shouldShowSummary(message) {
    return Boolean(message.ai_summary) && shouldShowAiMeta(message);
  }

  function shouldShowAiMeta(message) {
    return message.group_name !== "全网热榜";
  }

  function buildContentBlock(message) {
    if (!message.content) return null;

    const cleaned = cleanMessageContent(message.content);
    if (!cleaned) return null;

    const previewText = buildCollapsedPreview(cleaned);
    const limit = message.group_name.includes("热搜") ? 280 : 420;
    const collapsed = previewText.length > limit;
    const initialText = collapsed ? `${previewText.slice(0, limit)}…` : previewText;

    const wrap = document.createElement("div");
    const content = document.createElement("div");
    content.className = "tugou-card-content";
    appendRichText(content, initialText, message.keywordHits);
    wrap.appendChild(content);

    if (collapsed) {
      let expanded = false;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tugou-expand-btn";
      toggle.textContent = "展开全文";
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        expanded = !expanded;
        content.textContent = "";
        appendRichText(content, expanded ? cleaned : `${previewText.slice(0, limit)}…`, message.keywordHits);
        toggle.textContent = expanded ? "收起" : "展开全文";
      });
      wrap.appendChild(toggle);
    }

    return wrap;
  }

  function snippetFromMessage(message) {
    const text = cleanMessageContent(message.content || "").replace(/\s+/g, " ").trim();
    if (!text) return "暂无正文";
    return text.length > 180 ? `${text.slice(0, 180)}…` : text;
  }

  function normalizeMediaUrl(value) {
    if (!value) return "";
    try {
      return new URL(value, state.settings.apiBase).toString();
    } catch (error) {
      return value || "";
    }
  }

  function cleanMessageContent(value) {
    return (value || "")
      .replace(/\*\*/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  function buildCollapsedPreview(text) {
    return text
      .replace(/\[([^\]]+)\]\s*\((https?:\/\/[^)\s]+)\)/gi, "$1")
      .replace(/https?:\/\/[^\s)]+/gi, (url) => `[${shortenUrl(url)}]`)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function appendRichText(container, text, hits) {
    const markdownLinkPattern = /\[([^\]]+)\]\s*\((https?:\/\/[^)\s]+)\)/gi;
    let lastIndex = 0;
    let match;

    while ((match = markdownLinkPattern.exec(text)) !== null) {
      appendPlainAndAutoLink(container, text.slice(lastIndex, match.index), hits);
      appendAnchor(container, match[1], match[2], hits);
      lastIndex = markdownLinkPattern.lastIndex;
    }

    appendPlainAndAutoLink(container, text.slice(lastIndex), hits);
  }

  function appendPlainAndAutoLink(container, text, hits) {
    const plainUrlPattern = /https?:\/\/[^\s)]+/gi;
    let lastIndex = 0;
    let match;

    while ((match = plainUrlPattern.exec(text)) !== null) {
      appendHighlightedText(container, text.slice(lastIndex, match.index), hits);
      appendAnchor(container, shortenUrl(match[0]), match[0], []);
      lastIndex = plainUrlPattern.lastIndex;
    }

    appendHighlightedText(container, text.slice(lastIndex), hits);
  }

  function appendAnchor(container, label, url, hits) {
    const anchor = document.createElement("a");
    anchor.className = "tugou-inline-link";
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openExternal(url);
    });
    appendHighlightedText(anchor, label, hits);
    container.appendChild(anchor);
  }

  function shortenUrl(value) {
    try {
      const url = new URL(value);
      return url.hostname.replace(/^www\./, "");
    } catch (error) {
      return value;
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return "--:--";
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < 60 * 1000) {
      return "刚刚";
    }
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))} 分钟前`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
    }

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hour}:${minute}`;
  }

  function parseApiDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === "number") return new Date(value);

    const raw = String(value || "");
    if (!raw) return new Date();

    if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) {
      return new Date(raw);
    }

    const localCandidate = new Date(raw);
    const utcCandidate = new Date(`${raw}Z`);

    if (Number.isNaN(localCandidate.getTime())) return utcCandidate;
    if (Number.isNaN(utcCandidate.getTime())) return localCandidate;

    const now = Date.now();
    const localDelta = Math.abs(now - localCandidate.getTime());
    const utcDelta = Math.abs(now - utcCandidate.getTime());
    const localFuture = localCandidate.getTime() - now > 5 * 60 * 1000;
    const utcFuture = utcCandidate.getTime() - now > 5 * 60 * 1000;

    if (localFuture !== utcFuture) {
      return localFuture ? utcCandidate : localCandidate;
    }

    return utcDelta < localDelta ? utcCandidate : localCandidate;
  }

  async function unlockAudio() {
    try {
      const context = await ensureAudioContext();
      if (context?.state === "suspended") {
        await context.resume();
      }
    } catch (error) {
      // ignore blocked audio unlocks
    }
  }

  async function ensureAudioContext() {
    if (state.audioContext) return state.audioContext;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;

    state.audioContext = new AudioContextCtor();
    return state.audioContext;
  }

  async function playNotificationSound(force) {
    if (!force && !state.settings.soundEnabled) return;

    try {
      const context = await ensureAudioContext();
      if (!context) return;

      if (context.state === "suspended") {
        await context.resume();
      }

      const preset = SOUND_PRESETS[state.settings.soundProfile] || SOUND_PRESETS.chime;
      let cursor = context.currentTime + 0.01;

      for (const note of preset.notes) {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = note.type || "sine";
        oscillator.frequency.setValueAtTime(note.frequency, cursor);

        gainNode.gain.setValueAtTime(0.0001, cursor);
        gainNode.gain.exponentialRampToValueAtTime(note.gain || 0.07, cursor + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, cursor + note.duration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(cursor);
        oscillator.stop(cursor + note.duration + 0.02);

        cursor += note.duration + (note.gap || 0.02);
      }
    } catch (error) {
      // ignore autoplay or audio context failures
    }
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getSourceTheme(groupName) {
    const name = String(groupName || "");
    for (const theme of SOURCE_THEMES) {
      if (theme.match.test(name)) {
        return theme.vars;
      }
    }
    return DEFAULT_SOURCE_THEME;
  }

  function getSourceIcon(groupName) {
    const name = String(groupName || "");
    for (const source of SOURCE_ICONS) {
      if (source.match.test(name)) {
        return source.icon;
      }
    }
    return "📡";
  }

  function applyFontSize() {
    const size = state.settings.fontSize || 13;
    if (refs.list) {
      refs.list.style.setProperty("--tugou-font-size", size + "px");
    }
  }

  function applySourceTheme(element, groupName) {
    const theme = getSourceTheme(groupName);
    element.style.setProperty("--source-bg", theme.bg);
    element.style.setProperty("--source-border", theme.border);
    element.style.setProperty("--source-text", theme.text);
    element.style.setProperty("--source-count-bg", theme.countBg);
    element.style.setProperty("--source-count-text", theme.countText);
    element.style.setProperty("--source-card-border", theme.cardBorder);
    element.style.setProperty("--source-card-glow", theme.cardGlow);
  }

  function updatePanelPosition() {
    refs.panel.style.left = `${state.settings.x}px`;
    refs.panel.style.top = `${state.settings.y}px`;
    refs.panel.style.width = `${state.settings.width}px`;
    refs.panel.style.height = `${state.settings.height}px`;
    refs.bubble.style.left = `${state.settings.x}px`;
    refs.bubble.style.top = `${state.settings.y}px`;
  }

  function openExternal(url) {
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: "tugou:open", url });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }
})();
