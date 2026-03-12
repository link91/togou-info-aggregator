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
    { match: /币安广场监控/, icon: "🟡" }
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
    heartbeatTimer: null,
    lastPongAt: Date.now(),
    audioContext: null
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
      height: 680px;
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

    .tugou-settings {
      display: none;
      padding: 0 16px 14px;
      border-top: 1px solid rgba(103, 189, 133, 0.16);
      background: linear-gradient(180deg, rgba(10, 17, 23, 0.82), rgba(8, 12, 18, 0.72));
    }

    .tugou-settings.is-open {
      display: block;
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
      min-height: 0;
      padding: 14px 16px 16px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
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
      font-size: 13px;
      line-height: 1.5;
      color: #f1f7ef;
      font-weight: 700;
      word-break: break-word;
    }

    .tugou-card-summary {
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.6;
      color: rgba(214, 232, 219, 0.76);
    }

    .tugou-card-content {
      margin-top: 10px;
      font-size: 13px;
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
  `;

  init().catch((error) => {
    console.error("[土狗雷达] 初始化失败", error);
  });

  async function init() {
    state.settings = await loadSettings();
    createUi();
    bindStaticEvents();
    updatePanelPosition();
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
      sourceStates: {}
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

    settingsPanel.append(soundSection, sourceSection, keywordSection);
    panel.append(header, statusRow, actionRow, settingsPanel, list, footer, resizeHandle);
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
    } catch (error) {
      console.error("[土狗雷达] 初始数据加载失败", error);
      state.error = "初始数据加载失败";
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

  async function fetchJson(path, init) {
    const response = await fetch(buildUrl(path), {
      ...init,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    return response.json();
  }

  async function markAsRead(messageId) {
    try {
      await fetch(new URL(`/api/messages/${messageId}/read`, state.settings.apiBase).toString(), {
        method: "POST",
        mode: "cors"
      });
    } catch (error) {
      console.warn("[土狗雷达] 标记已读失败", error);
    }
  }

  async function markAllRead() {
    try {
      await fetch(new URL("/api/messages/read-all", state.settings.apiBase).toString(), {
        method: "POST",
        mode: "cors"
      });
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
      created_at_ms: parseApiDate(item.created_at || Date.now()).getTime()
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
        renderStatus();
        scheduleReconnect();
      };

      ws.onerror = () => {
        state.isConnected = false;
        renderStatus();
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
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connectWebSocket();
    }, 5000);
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
    refs.list.textContent = "";
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
    renderStatus();
  }

  function createMessageCard(message) {
    const card = document.createElement("article");
    card.className = "tugou-card";
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
