import { useState, useRef, useCallback, useEffect } from "react";

// ─── Canvas dimensions ────────────────────────────────────────────────────────
const W = 1400;
const H = 1260;
const toX = (p) => (p / 100) * W;
const toY = (p) => (p / 100) * H;
const NW = 118, NH = 34;

// ─── Node definitions ─────────────────────────────────────────────────────────
const nodes = [
  // ── TRACK A: Reactive voice ──────────────────────────────────────────────────
  { id: "start",      label: "Driver Opens App",        icon: "🚗", type: "start",    x: 14,  y: 2.5,
    desc: "App starts. Two parallel loops begin: one waiting for voice, one monitoring the road proactively." },
  { id: "listen",     label: "App Listens for Voice",   icon: "🎙️", type: "process",  x: 14,  y: 12,
    desc: "Microphone is active and waiting for the driver to speak." },
  { id: "detect",     label: "Voice Detected?",         icon: "🔊", type: "decision", x: 14,  y: 22,
    desc: "Did the app pick up meaningful speech, or just background noise?" },
  { id: "confident",  label: "Understood Clearly?",     icon: "🧩", type: "decision", x: 14,  y: 34,
    desc: "The app checks how confident it is in what the driver said." },
  { id: "retry",      label: "Ask Driver to Repeat",    icon: "🔁", type: "action",   x: 36,  y: 34,
    desc: "The app politely says: 'Sorry, could you repeat that?' and listens again." },
  { id: "retrycount", label: "Tried 3 Times?",          icon: "🔢", type: "decision", x: 36,  y: 44,
    desc: "After 3 failed attempts the app stops asking — it doesn't nag the driver." },
  { id: "giveup",     label: "Apologise & Reset",       icon: "🤷", type: "action",   x: 52,  y: 44,
    desc: "App says 'No problem, just say something when you need me' and resets." },
  { id: "understand", label: "Understand the Request",  icon: "🧠", type: "process",  x: 14,  y: 46,
    desc: "App determines what the driver is asking for." },
  { id: "categorize", label: "What Type of Request?",   icon: "📋", type: "decision", x: 14,  y: 57,
    desc: "Navigation, traffic, places, or general help." },
  { id: "nav",        label: "Navigation Guidance",     icon: "🗺️", type: "action",   x: 4,   y: 69,
    desc: "Turn-by-turn directions, rerouting, ETA updates." },
  { id: "traffic",    label: "Traffic & Hazard Alerts", icon: "⚠️", type: "action",   x: 16,  y: 69,
    desc: "Real-time traffic, accidents, road closures." },
  { id: "info",       label: "Points of Interest",      icon: "📍", type: "action",   x: 28,  y: 69,
    desc: "Nearby petrol, restaurants, rest stops." },
  { id: "general",    label: "General Assistance",      icon: "💬", type: "action",   x: 40,  y: 69,
    desc: "Music, calls, reminders, and other requests." },
  { id: "respond",    label: "App Speaks the Answer",   icon: "🔈", type: "process",  x: 14,  y: 81,
    desc: "Answer delivered via voice — completely hands-free." },
  { id: "loop",       label: "Ready for Next Request",  icon: "🔄", type: "start",    x: 14,  y: 91,
    desc: "The reactive loop resets and listens again immediately." },

  // ── TRACK B: Proactive ───────────────────────────────────────────────────────
  { id: "monitor",    label: "Monitor Road & Route",    icon: "📡", type: "proactive", x: 78,  y: 12,
    desc: "Background loop: app continuously watches GPS, traffic APIs, and sensors." },
  { id: "event",      label: "Important Event Detected?", icon: "🚨", type: "pdecision", x: 78, y: 24,
    desc: "Did something worth telling the driver happen? Traffic, hazard, parking, shortcut." },
  { id: "priority",   label: "How Urgent?",             icon: "🎯", type: "pdecision", x: 78, y: 36,
    desc: "High-priority alerts interrupt immediately. Low-priority wait for a quiet moment." },
  { id: "interrupt",  label: "Interrupt & Alert Driver",icon: "📢", type: "paction",   x: 66,  y: 48,
    desc: "App speaks now: 'Accident ahead — rerouting you.' No button press needed." },
  { id: "queue",      label: "Queue for Quiet Moment",  icon: "⏳", type: "paction",   x: 90,  y: 48,
    desc: "App waits for a pause in conversation before mentioning lower-priority info." },
  { id: "prorespond", label: "App Speaks Proactively",  icon: "🔔", type: "proactive", x: 78,  y: 60,
    desc: "Unprompted voice message delivered to the driver." },
  { id: "ploop",      label: "Continue Monitoring",     icon: "🔄", type: "start",    x: 78,  y: 71,
    desc: "Proactive loop continues watching in the background." },
];

// ─── Edge definitions ────────────────────────────────────────────────────────
const edges = [
  // Reactive track
  { from: "start",      to: "listen",     color: "b" },
  { from: "listen",     to: "detect",     color: "b" },
  { from: "detect",     to: "confident",  color: "b", label: "Yes" },
  { from: "detect",     to: "listen",     color: "b", label: "No", curved: true, side: "left" },
  { from: "confident",  to: "understand", color: "b", label: "Yes" },
  { from: "confident",  to: "retry",      color: "y", label: "No" },
  { from: "retry",      to: "retrycount", color: "y" },
  { from: "retrycount", to: "listen",     color: "b", label: "No" },
  { from: "retrycount", to: "giveup",     color: "y", label: "Yes" },
  { from: "giveup",     to: "listen",     color: "b", curved: true },
  { from: "understand", to: "categorize", color: "b" },
  { from: "categorize", to: "nav",        color: "g", label: "Nav" },
  { from: "categorize", to: "traffic",    color: "g", label: "Traffic" },
  { from: "categorize", to: "info",       color: "g", label: "Places" },
  { from: "categorize", to: "general",    color: "g", label: "Other" },
  { from: "nav",        to: "respond",    color: "g" },
  { from: "traffic",    to: "respond",    color: "g" },
  { from: "info",       to: "respond",    color: "g" },
  { from: "general",    to: "respond",    color: "g" },
  { from: "respond",    to: "loop",       color: "b" },
  { from: "loop",       to: "listen",     color: "b", curved: true, side: "left" },

  // Proactive track
  { from: "start",      to: "monitor",    color: "p" },
  { from: "monitor",    to: "event",      color: "p" },
  { from: "event",      to: "priority",   color: "p", label: "Yes" },
  { from: "event",      to: "monitor",    color: "p", label: "No", curved: true, side: "right" },
  { from: "priority",   to: "interrupt",  color: "p", label: "High" },
  { from: "priority",   to: "queue",      color: "p", label: "Low" },
  { from: "interrupt",  to: "prorespond", color: "p" },
  { from: "queue",      to: "prorespond", color: "p" },
  { from: "prorespond", to: "ploop",      color: "p" },
  { from: "ploop",      to: "monitor",    color: "p", curved: true, side: "right" },
];

// ─── Colour map ───────────────────────────────────────────────────────────────
const COLORS = {
  b: "#1e90ff",
  y: "#f59e0b",
  g: "#22c55e",
  p: "#a855f7",
};

const TYPE_STYLES = {
  start:     { bg: "#00d4ff22", border: "#00d4ff", text: "#e8f4ff" },
  process:   { bg: "#0d1f3c",   border: "#1e90ff", text: "#e8f4ff" },
  decision:  { bg: "#0d1f3c",   border: "#f59e0b", text: "#fef3c7" },
  action:    { bg: "#0d1f3c",   border: "#22c55e", text: "#d1fae5" },
  proactive: { bg: "#1a0d2e",   border: "#a855f7", text: "#f3e8ff" },
  pdecision: { bg: "#1a0d2e",   border: "#a855f7", text: "#f3e8ff" },
  paction:   { bg: "#1a0d2e",   border: "#a855f7", text: "#f3e8ff" },
};

// ─── Node component ───────────────────────────────────────────────────────────
function Node({ node, active, onClick }) {
  const cx = toX(node.x);
  const cy = toY(node.y);
  const style = TYPE_STYLES[node.type] || TYPE_STYLES.process;
  const isActive = active === node.id;

  const isDecision = node.type === "decision" || node.type === "pdecision";
  const dx = NW / 2 + 6;
  const dy = NH / 2 + 6;

  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      transform={isActive ? `translate(${cx},${cy}) scale(1.07) translate(${-cx},${-cy})` : ""}
    >
      {isDecision ? (
        <polygon
          points={`${cx},${cy - dy} ${cx + dx},${cy} ${cx},${cy + dy} ${cx - dx},${cy}`}
          fill={style.bg}
          stroke={style.border}
          strokeWidth={isActive ? 2.5 : 1.5}
          opacity={0.95}
        />
      ) : (
        <rect
          x={cx - NW / 2} y={cy - NH / 2}
          width={NW} height={NH}
          rx={node.type === "start" ? 17 : 7}
          fill={style.bg}
          stroke={style.border}
          strokeWidth={isActive ? 2.5 : 1.5}
          opacity={0.95}
        />
      )}
      {/* Glow on active */}
      {isActive && (
        <rect
          x={cx - NW / 2 - 4} y={cy - NH / 2 - 4}
          width={NW + 8} height={NH + 8}
          rx={12} fill="none"
          stroke={style.border} strokeWidth={1}
          opacity={0.35}
        />
      )}
      <text
        x={cx - 22} y={cy + 1}
        dominantBaseline="middle"
        fontSize="11"
        fontFamily="'DM Sans', sans-serif"
      >
        {node.icon}
      </text>
      <text
        x={cx - 10} y={cy}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={style.text}
        fontSize="8.5"
        fontFamily="'DM Sans', sans-serif"
        fontWeight="600"
      >
        {node.label.split(" ").slice(0, 3).join(" ")}
      </text>
      {node.label.split(" ").length > 3 && (
        <text
          x={cx - 10} y={cy + 10}
          dominantBaseline="middle"
          textAnchor="middle"
          fill={style.text}
          fontSize="8.5"
          fontFamily="'DM Sans', sans-serif"
          fontWeight="600"
        >
          {node.label.split(" ").slice(3).join(" ")}
        </text>
      )}
    </g>
  );
}

// ─── Edge component ───────────────────────────────────────────────────────────
function EdgePath({ edge, nodeMap }) {
  const fromN = nodeMap[edge.from];
  const toN   = nodeMap[edge.to];
  if (!fromN || !toN) return null;

  const fx = toX(fromN.x), fy = toY(fromN.y);
  const tx = toX(toN.x),   ty = toY(toN.y);
  const color = COLORS[edge.color] || COLORS.b;
  const markerId = `arrow-${edge.color || "b"}`;

  let d;
  if (edge.curved) {
    const side = edge.side === "right" ? 1 : -1;
    const bend = Math.abs(fy - ty) * 0.5;
    d = `M ${fx} ${fy + NH / 2} C ${fx + side * bend} ${fy + NH / 2 + 40}, ${tx + side * bend} ${ty - NH / 2 - 40}, ${tx} ${ty - NH / 2}`;
  } else {
    d = `M ${fx} ${fy + NH / 2} L ${tx} ${ty - NH / 2}`;
  }

  const midX = (fx + tx) / 2;
  const midY = (fy + ty) / 2;

  return (
    <g>
      <path d={d} stroke={color} strokeWidth="1.5" fill="none"
        strokeDasharray={edge.curved ? "5,3" : undefined}
        markerEnd={`url(#${markerId})`} opacity={0.75} />
      {edge.label && (
        <text x={midX} y={midY - 4} textAnchor="middle"
          fill={color} fontSize="8" fontFamily="'DM Mono', monospace"
          fontWeight="600" opacity={0.9}>
          {edge.label}
        </text>
      )}
    </g>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive]     = useState(null);
  const [pan, setPan]           = useState({ x: 0, y: 0 });
  const isPanning               = useRef(false);
  const panStart                = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const svgRef                  = useRef(null);

  const activeNode = nodes.find((n) => n.id === active);
  const nodeMap    = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // ── Right-click pan handlers ──────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 2) return;          // only right mouse button
    e.preventDefault();
    isPanning.current = true;
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    if (svgRef.current) svgRef.current.style.cursor = "grabbing";
  }, [pan]);

  const onMouseMove = useCallback((e) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.mx;
    const dy = e.clientY - panStart.current.my;
    setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
  }, []);

  const onMouseUp = useCallback((e) => {
    if (e.button !== 2) return;
    isPanning.current = false;
    if (svgRef.current) svgRef.current.style.cursor = "default";
  }, []);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();                  // suppress browser context menu
  }, []);

  // Clean up if mouse released outside SVG
  useEffect(() => {
    const up = (e) => {
      if (e.button === 2 && isPanning.current) {
        isPanning.current = false;
        if (svgRef.current) svgRef.current.style.cursor = "default";
      }
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #060c1a 0%, #0a1628 50%, #060c1a 100%)",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "32px 16px",
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: 24, padding: "6px 18px", marginBottom: 14,
        }}>
          <span style={{ fontSize: 14 }}>🚗</span>
          <span style={{ color: "#00d4ff", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>
            Driver Voice App
          </span>
        </div>
        <h1 style={{ color: "#e8f4ff", fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
          How the App Works
        </h1>
        <p style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
          Click a node to learn more · <span style={{ color: "#94a3b8" }}>Right-click + drag</span> to pan
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        {[
          { color: "#00d4ff", label: "Start / Loop" },
          { color: "#1e90ff", label: "Process" },
          { color: "#f59e0b", label: "Decision" },
          { color: "#22c55e", label: "Action" },
          { color: "#a855f7", label: "Proactive" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: l.color }} />
            <span style={{ color: "#64748b", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#94a3b8", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>REACTIVE →</span>
          <span style={{ color: "#64748b", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>|</span>
          <span style={{ color: "#a855f7", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>← PROACTIVE (app alerts)</span>
        </div>
      </div>

      {/* Flowchart SVG — overflow:hidden so panning clips at edges */}
      <div style={{ width: "100%", maxWidth: 960, overflow: "hidden", borderRadius: 16, border: "1px solid rgba(255,255,255,0.04)" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block", cursor: "default" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onContextMenu={onContextMenu}
        >
          <defs>
            {[["b", "#1e5a8a"], ["y", "#d97706"], ["g", "#15803d"], ["p", "#7c3aed"]].map(([id, col]) => (
              <marker key={id} id={`arrow-${id}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill={col} />
              </marker>
            ))}
          </defs>

          {/* Panning group */}
          <g transform={`translate(${pan.x}, ${pan.y})`}>
            {/* Divider */}
            <line x1={toX(62)} y1={toY(1)} x2={toX(62)} y2={toY(99)}
              stroke="#ffffff08" strokeWidth="1" strokeDasharray="6,4" />
            <text x={toX(62) + 8} y={toY(3)} fill="#ffffff15" fontSize="9"
              fontFamily="'DM Mono', monospace" letterSpacing={1}>PROACTIVE TRACK →</text>

            {edges.map((e, i) => <EdgePath key={i} edge={e} nodeMap={nodeMap} />)}
            {nodes.map((n) => (
              <Node
                key={n.id} node={n} active={active}
                onClick={() => setActive(active === n.id ? null : n.id)}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Detail card */}
      <div style={{
        width: "100%", maxWidth: 520, minHeight: 72,
        background: activeNode ? "rgba(30,144,255,0.07)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${activeNode ? "rgba(30,144,255,0.25)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 14, padding: "14px 20px", marginTop: 24,
        transition: "all 0.3s", textAlign: "center",
      }}>
        {activeNode ? (
          <>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{activeNode.icon}</div>
            <div style={{ color: "#e8f4ff", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              {activeNode.label}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
              {activeNode.desc}
            </div>
          </>
        ) : (
          <div style={{ color: "#334155", fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
            TAP A NODE TO LEARN MORE
          </div>
        )}
      </div>
    </div>
  );
}
