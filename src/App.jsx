import { useState, useRef, useCallback, useEffect } from "react";

const W = 1400;
const H = 1260;
const toX = (p) => (p / 100) * W;
const toY = (p) => (p / 100) * H;
const NW = 118, NH = 34;

const nodes = [
  // ── TRACK A: Reactive voice ─────────────────────────────
  { id:"start",       label:"Driver Opens App",            icon:"🚗", type:"start",     x:14, y:2.5,
    desc:"App starts. Voice loop, sensor monitoring, ML copilot all activate. Map is NOT loaded — voice only by default." },
  { id:"listen",      label:"App Listens for Voice",       icon:"🎙️", type:"process",   x:14, y:10.5,
    desc:"Microphone active. The screen stays minimal — no map loaded yet." },
  { id:"detect",      label:"Voice Detected?",             icon:"🔊", type:"decision",  x:14, y:19.5,
    desc:"Did the app pick up meaningful speech?" },
  { id:"confident",   label:"Understood Clearly?",         icon:"🧩", type:"decision",  x:14, y:29,
    desc:"How confident is the app about what was said?" },
  { id:"retry",       label:"Ask to Repeat (max 3×)",      icon:"🔁", type:"action",    x:32, y:29,
    desc:"Politely asks the driver to repeat. Gives up after 3 failed attempts to avoid distraction." },
  { id:"categorize",  label:"What Type of Request?",       icon:"📋", type:"decision",  x:14, y:39,
    desc:"Navigation, traffic, places, feedback, show map, or general help." },
  { id:"showmap",     label:"Driver Requests Map",         icon:"👁️", type:"map",       x:32, y:39,
    desc:"Driver says 'show me the map' or 'open navigation'. The map loads immediately regardless of proximity to destination." },
  { id:"nav",         label:"Navigation",                  icon:"🗺️", type:"action",    x:3,  y:49,
    desc:"Turn-by-turn voice guidance. If map is already open, route highlights on it too." },
  { id:"traffic",     label:"Traffic Alert",               icon:"⚠️", type:"action",    x:11, y:49,
    desc:"Congestion, accidents, closures — delivered by voice." },
  { id:"poi",         label:"Nearby Places",               icon:"📍", type:"action",    x:19, y:49,
    desc:"Gas stations, rest stops, restaurants." },
  { id:"general",     label:"General Help",                icon:"💬", type:"action",    x:27, y:49,
    desc:"Music, calls, reminders." },
  { id:"respond",     label:"App Speaks the Answer",       icon:"🔈", type:"process",   x:14, y:59,
    desc:"Voice response delivered. If map is open, visual cues also update on screen." },
  { id:"feedback",    label:"Driver Feedback",             icon:"📣", type:"feedback",  x:14, y:68.5,
    desc:"Delivery update or road/parking report from the driver." },
  { id:"dashboard",   label:"Back Office Dashboard",       icon:"🖥️", type:"backoffice",x:14, y:78,
    desc:"All driver updates visible in real time. Triggers heatmap and alert broadcasts." },
  { id:"loop",        label:"Back to Listening",           icon:"🔄", type:"start",     x:14, y:87.5,
    desc:"After every interaction the app returns to standby, map state preserved." },

  // ── TRACK B: Sensors + Map + ML ─────────────────────────
  { id:"sensors",     label:"GPS + Accelerometer",         icon:"📲", type:"sensor",    x:55, y:7,
    desc:"Continuously reads position and motion. Feeds behavior detection, the adaptive proximity engine, and the cross-driver road alert system." },
  { id:"behavior",    label:"Detect Driver Behavior",      icon:"🔍", type:"sensor",    x:55, y:15.5,
    desc:"Classifies state: Driving, Approaching destination, Parked, or Walking." },
  { id:"bstate",      label:"Driver State?",               icon:"🚦", type:"decision",  x:55, y:25,
    desc:"Four states. 'Approaching' is now adaptive — the trigger distance varies by area density and parking difficulty." },
  { id:"driving",     label:"Driving",                     icon:"🏎️", type:"sensor",    x:42, y:34,
    desc:"Moving at speed. Voice only unless map was already opened manually." },
  { id:"approaching", label:"Approaching (Adaptive)",      icon:"🎯", type:"map",       x:55, y:34,
    desc:"The trigger distance adapts — tighter in dense urban areas where parking is harder to find, wider in suburbs. ML adjusts this per area over time." },
  { id:"parked",      label:"Parked",                      icon:"🅿️", type:"sensor",    x:68, y:34,
    desc:"Vehicle stopped. ML checks spot quality. Map stays on for walking." },

  { id:"mapdecision", label:"Map Already Open?",           icon:"🗺️", type:"decision",  x:55, y:43,
    desc:"Has the driver already opened the map manually, or is this the first time? Avoids reloading unnecessarily." },
  { id:"loadmap",     label:"Load Google Maps",            icon:"📡", type:"map",       x:55, y:52,
    desc:"Google Maps API is called. Map renders centred on destination area. Route is drawn. Heatmap layer is added on top." },
  { id:"heatmap",     label:"Overlay Parking Heatmap",     icon:"🌡️", type:"map",       x:55, y:61,
    desc:"Shared knowledge base rendered as a colour gradient. Darker green = more driver confirmations for that spot. Lighter = fewer. No numbers shown — the colour does the work." },
  { id:"voicemap",    label:"Voice + Map Active",          icon:"🔊", type:"map",       x:55, y:70,
    desc:"Driver now has both streams: 'Good parking on the right in 200m' by voice, AND a visual heatmap to glance at. Voice remains primary." },
  { id:"parkedconf",  label:"Driver Parks",                icon:"✅", type:"sensor",    x:55, y:79,
    desc:"GPS + accelerometer confirm the vehicle has stopped. Exact location logged." },
  { id:"mlanalyze",   label:"ML Analyses Spot",            icon:"🤖", type:"ml",        x:55, y:87.5,
    desc:"Compares parking location to heatmap and historical data. Was it a hot zone? New spot? How far from the door?" },
  { id:"mlprompt",    label:"Prompt Driver to Confirm",    icon:"🗣️", type:"ml",        x:55, y:96,
    desc:"e.g. 'Looks like a solid spot — want me to save it for your colleagues?' Delivered by voice." },
  { id:"driverresp",  label:"Driver Confirms or Denies",   icon:"👂", type:"decision",  x:55, y:104,
    desc:"Driver responds by voice. Both yes and no are useful signals for the model." },
  { id:"knowledge",   label:"Update Shared Knowledge",     icon:"🧠", type:"ml",        x:55, y:112,
    desc:"Result added to shared knowledge base immediately. Heatmap colour gradient updates live for all drivers in the area." },

  // ── TRACK C: Proactive + Road Closure ───────────────────
  { id:"monitor",     label:"Background Monitoring",       icon:"📡", type:"proactive", x:87, y:8,
    desc:"Watches traffic, hazards, dispatcher messages — and road closure reports from the fleet." },
  { id:"event",       label:"Important Event?",            icon:"🚨", type:"decision",  x:87, y:18.5,
    desc:"Hazard, faster route, dispatcher message, low fuel — or a colleague-reported road closure." },
  { id:"closedroad",  label:"Road Closure Reported",       icon:"🚧", type:"proactive", x:87, y:29,
    desc:"A driver in the fleet has reported a closed road via voice feedback. This triggers a cross-driver check." },
  { id:"affected",    label:"Other Drivers Heading There?",icon:"🔎", type:"decision",  x:87, y:39,
    desc:"System checks GPS routes of all active drivers. Are any of them heading toward the reported closure?" },
  { id:"closuremsg",  label:"Alert Affected Drivers",      icon:"📢", type:"proactive", x:87, y:49,
    desc:"Proactive voice alert: 'A colleague just reported a road closure ahead on your route. Want me to open the map and show an alternate?' Driver can say yes or no." },
  { id:"openmapoffer",label:"Driver Wants Map?",           icon:"🗺️", type:"decision",  x:87, y:59,
    desc:"Driver responds to the offer. If yes, map opens immediately and shows the reroute. If no, the alert is noted and the driver continues." },
  { id:"interrupt",   label:"Interrupt & Alert Driver",    icon:"📢", type:"proactive", x:87, y:69,
    desc:"For non-closure proactive alerts: hazard, traffic, dispatcher message. Voice only unless map is open." },
  { id:"dispatch",    label:"Dispatcher Alert",            icon:"📨", type:"backoffice",x:87, y:79,
    desc:"Back office pushes a message — new instructions, updated drop-off, urgent info." },
  { id:"hmupdate",    label:"Live Heatmap Broadcast",      icon:"🌐", type:"map",       x:87, y:89,
    desc:"When knowledge updates, all drivers with map open get a live gradient refresh — darker greens appear or shift as new confirmations come in." },
];

const typeStyles = {
  start:     { bg:"#00d4ff15", border:"#00d4ff", text:"#e0f7ff" },
  process:   { bg:"#0d1f3c",   border:"#1e90ff", text:"#e8f4ff" },
  decision:  { bg:"#0d1f3c",   border:"#f59e0b", text:"#fef3c7" },
  action:    { bg:"#0d1f3c",   border:"#22c55e", text:"#d1fae5" },
  proactive: { bg:"#1a0d2e",   border:"#a855f7", text:"#f3e8ff" },
  feedback:  { bg:"#1a1000",   border:"#f97316", text:"#ffedd5" },
  backoffice:{ bg:"#001a1a",   border:"#06b6d4", text:"#cffafe" },
  sensor:    { bg:"#001220",   border:"#38bdf8", text:"#e0f2fe" },
  ml:        { bg:"#0f0a1e",   border:"#e879f9", text:"#fae8ff" },
  map:       { bg:"#001a0d",   border:"#4ade80", text:"#dcfce7" },
};

const nm = Object.fromEntries(nodes.map(n=>[n.id,n]));
const cx = id => toX(nm[id].x);
const cy = id => toY(nm[id].y);

const B="#1e5a8a",Y="#f59e0b",P="#a855f7",O="#f97316",C="#06b6d4",S="#38bdf8",M="#e879f9",G="#4ade80",R="#f87171";

function L(x1,y1,x2,y2,color,dashed,label,lx,ly){
  return {type:"line",x1,y1,x2,y2,color,dashed,label,lx:lx??(x1+x2)/2,ly:ly??(y1+y2)/2};
}
function Q(d,color,dashed,label,lx,ly){
  return {type:"curve",d,color,dashed,label,lx,ly};
}

function buildEdges(){
  const e=[];
  const b=NH/2,l=-NW/2,r=NW/2;

  e.push(L(cx("start"),cy("start")+b, cx("listen"),cy("listen")-b, B));
  e.push(L(cx("listen"),cy("listen")+b, cx("detect"),cy("detect")-b, B));
  e.push(L(cx("detect"),cy("detect")+b, cx("confident"),cy("confident")-b, B,false,"Yes"));
  e.push(Q(`M ${cx("detect")+l} ${cy("detect")} Q ${toX(2)} ${(cy("detect")+cy("listen"))/2} ${cx("listen")+l} ${cy("listen")+b}`,Y,true,"No",toX(1.5),(cy("detect")+cy("listen"))/2));
  e.push(L(cx("confident")+r,cy("confident"), cx("retry")+l,cy("retry"), Y,false,"Unsure"));
  e.push(Q(`M ${cx("retry")+l} ${cy("retry")+b} Q ${toX(2)} ${toY(34)} ${cx("listen")+l} ${cy("listen")+b}`,Y,true,"retry",toX(1.5),toY(34)));
  e.push(L(cx("confident"),cy("confident")+b, cx("categorize"),cy("categorize")-b, B,false,"Yes"));
  e.push(L(cx("categorize")+r,cy("categorize"), cx("showmap")+l,cy("showmap"), G,false,"Show Map"));
  e.push(Q(`M ${cx("showmap")} ${cy("showmap")+b} Q ${toX(40)} ${toY(54)} ${cx("mapdecision")+l} ${cy("mapdecision")}`,G,true,"Early load",toX(39),toY(52)));
  e.push(L(cx("categorize")+l*0.8,cy("categorize"), cx("nav"),cy("nav")-b, B,false,"Nav"));
  e.push(L(cx("categorize")+l*0.3,cy("categorize"), cx("traffic"),cy("traffic")-b, B,false,"Traffic"));
  e.push(L(cx("categorize")+r*0.3,cy("categorize"), cx("poi"),cy("poi")-b, B,false,"Places"));
  e.push(L(cx("categorize")+r*0.8,cy("categorize"), cx("general"),cy("general")-b, B,false,"Other"));
  e.push(L(cx("nav"),cy("nav")+b, cx("respond")+l,cy("respond"), B));
  e.push(L(cx("traffic"),cy("traffic")+b, cx("respond")+l/2,cy("respond"), B));
  e.push(L(cx("poi"),cy("poi")+b, cx("respond")+r/2,cy("respond"), B));
  e.push(L(cx("general"),cy("general")+b, cx("respond")+r,cy("respond"), B));
  e.push(L(cx("respond"),cy("respond")+b, cx("feedback"),cy("feedback")-b, B));
  e.push(L(cx("categorize"),cy("categorize")+b, cx("feedback"),cy("feedback")-b, O,false,"Feedback"));
  e.push(L(cx("feedback"),cy("feedback")+b, cx("dashboard"),cy("dashboard")-b, O));
  e.push(L(cx("dashboard"),cy("dashboard")+b, cx("loop"),cy("loop")-b, C));
  e.push(Q(`M ${cx("loop")+l} ${cy("loop")} Q ${toX(2)} ${toY(48)} ${cx("listen")+l} ${cy("listen")+b}`,B,true,"Next",toX(1.5),toY(49)));

  e.push(L(cx("start")+r,cy("start"), cx("sensors")+l,cy("sensors"), S,true));
  e.push(L(cx("sensors"),cy("sensors")+b, cx("behavior"),cy("behavior")-b, S));
  e.push(L(cx("behavior"),cy("behavior")+b, cx("bstate"),cy("bstate")-b, S));
  e.push(L(cx("bstate")+l,cy("bstate"), cx("driving"),cy("driving")-b, S,false,"Driving"));
  e.push(L(cx("bstate"),cy("bstate")+b, cx("approaching"),cy("approaching")-b, G,false,"Adaptive"));
  e.push(L(cx("bstate")+r,cy("bstate"), cx("parked"),cy("parked")-b, S,false,"Parked"));
  e.push(Q(`M ${cx("driving")+l} ${cy("driving")} Q ${toX(32)} ${cy("driving")} ${cx("sensors")+l} ${cy("sensors")+b}`,S,true,"voice only",toX(33),cy("driving")-8));
  e.push(L(cx("approaching"),cy("approaching")+b, cx("mapdecision"),cy("mapdecision")-b, G,false,"Trigger"));
  e.push(L(cx("parked"),cy("parked")+b, cx("parkedconf"),cy("parkedconf")-b, S));
  e.push(L(cx("mapdecision"),cy("mapdecision")+b, cx("loadmap"),cy("loadmap")-b, G,false,"No"));
  e.push(Q(`M ${cx("mapdecision")+r} ${cy("mapdecision")} Q ${toX(70)} ${cy("mapdecision")} ${toX(70)} ${cy("voicemap")}`,G,true,"Already open",toX(71.5),cy("mapdecision")+20));
  e.push(L(cx("loadmap"),cy("loadmap")+b, cx("heatmap"),cy("heatmap")-b, G));
  e.push(L(cx("heatmap"),cy("heatmap")+b, cx("voicemap"),cy("voicemap")-b, G));
  e.push(L(cx("voicemap"),cy("voicemap")+b, cx("parkedconf"),cy("parkedconf")-b, G,false,"Parks"));
  e.push(L(cx("parkedconf"),cy("parkedconf")+b, cx("mlanalyze"),cy("mlanalyze")-b, M));
  e.push(L(cx("mlanalyze"),cy("mlanalyze")+b, cx("mlprompt"),cy("mlprompt")-b, M));
  e.push(L(cx("mlprompt"),cy("mlprompt")+b, cx("driverresp"),cy("driverresp")-b, M));
  e.push(L(cx("driverresp"),cy("driverresp")+b, cx("knowledge"),cy("knowledge")-b, M,false,"Either way"));
  e.push(Q(`M ${cx("knowledge")+r} ${cy("knowledge")} Q ${toX(73)} ${cy("knowledge")} ${cx("hmupdate")+l} ${cy("hmupdate")}`,G,false,"Live gradient update",toX(72),cy("knowledge")+14));
  e.push(Q(`M ${cx("knowledge")+l} ${cy("knowledge")} Q ${toX(36)} ${cy("knowledge")} ${cx("dashboard")+r} ${cy("dashboard")}`,C,true,"Shared immediately",toX(36),cy("knowledge")+14));
  e.push(Q(`M ${cx("knowledge")} ${cy("knowledge")+b} Q ${toX(55)} ${toY(122)} ${cx("sensors")+r} ${cy("sensors")+b}`,M,true,"Model improves",toX(62),toY(122)));

  e.push(L(cx("start")+r,cy("start"), cx("monitor")+l,cy("monitor"), P,true));
  e.push(L(cx("monitor"),cy("monitor")+b, cx("event"),cy("event")-b, P));
  e.push(L(cx("event"),cy("event")+b, cx("closedroad"),cy("closedroad")-b, R,false,"Road closure"));
  e.push(L(cx("closedroad"),cy("closedroad")+b, cx("affected"),cy("affected")-b, R));
  e.push(Q(`M ${cx("affected")+l} ${cy("affected")} Q ${toX(75)} ${cy("affected")} ${toX(75)} ${cy("monitor")+b}`,Y,true,"No drivers affected",toX(74),cy("affected")-8));
  e.push(L(cx("affected"),cy("affected")+b, cx("closuremsg"),cy("closuremsg")-b, R,false,"Yes"));
  e.push(L(cx("closuremsg"),cy("closuremsg")+b, cx("openmapoffer"),cy("openmapoffer")-b, R));
  e.push(L(cx("openmapoffer"),cy("openmapoffer")+b, cx("interrupt"),cy("interrupt")-b, P,false,"No"));
  e.push(Q(`M ${cx("openmapoffer")+l} ${cy("openmapoffer")} Q ${toX(70)} ${cy("openmapoffer")} ${cx("mapdecision")+r} ${cy("mapdecision")}`,G,true,"Yes → open map",toX(70),cy("openmapoffer")+12));
  e.push(L(cx("event")+r,cy("event"), cx("interrupt")+r-10,cy("interrupt")-b, P,false,"Other"));
  e.push(Q(`M ${cx("interrupt")} ${cy("interrupt")+b} Q ${toX(88)} ${toY(90)} ${cx("loop")+r} ${cy("loop")}`,P,true,"",toX(89),toY(90)));
  e.push(L(cx("dashboard")+r,cy("dashboard"), cx("dispatch")+l,cy("dispatch"), C));
  e.push(L(cx("dispatch"),cy("dispatch")-b, cx("interrupt"),cy("interrupt")+b, P,true,"Becomes alert"));
  e.push(Q(`M ${cx("feedback")+r} ${cy("feedback")} Q ${toX(52)} ${cy("feedback")} ${cx("monitor")+l} ${cy("monitor")+b}`,R,true,"Road report",toX(52),cy("feedback")-10));
  e.push(L(cx("hmupdate"),cy("hmupdate")-b, cx("interrupt"),cy("interrupt")+b, G,true,"Map refresh"));

  return e;
}

const edges = buildEdges();
const colorKey = {[B]:"b",[Y]:"y",[P]:"p",[O]:"o",[C]:"c",[S]:"s",[M]:"m",[G]:"g",[R]:"r"};

export default function App() {
  const [active, setActive] = useState(null);
  const activeNode = nm[active];

  // ── Right-click pan ──────────────────────────────────────
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart  = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const svgRef    = useRef(null);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 2) return;
    e.preventDefault();
    isPanning.current = true;
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    if (svgRef.current) svgRef.current.style.cursor = "grabbing";
  }, [pan]);

  const onMouseMove = useCallback((e) => {
    if (!isPanning.current) return;
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.mx),
      y: panStart.current.py + (e.clientY - panStart.current.my),
    });
  }, []);

  const onMouseUp = useCallback((e) => {
    if (e.button !== 2) return;
    isPanning.current = false;
    if (svgRef.current) svgRef.current.style.cursor = "default";
  }, []);

  const onContextMenu = useCallback((e) => e.preventDefault(), []);

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
  // ────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#04090f 0%,#070e1c 55%,#040a15 100%)",
      fontFamily:"'DM Sans',sans-serif",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"22px 8px 48px",
      userSelect:"none",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,
          background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.2)",
          borderRadius:24,padding:"5px 16px",marginBottom:10}}>
          <span style={{fontSize:12}}>🌡️</span>
          <span style={{color:"#4ade80",fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:2,textTransform:"uppercase"}}>Driver Voice App · v6</span>
        </div>
        <h1 style={{color:"#e8f4ff",fontSize:21,fontWeight:700,margin:0,letterSpacing:-0.5}}>
          Adaptive Map · Live Heatmap · Cross-Driver Alerts
        </h1>
        <p style={{color:"#475569",fontSize:12,marginTop:5}}>Tap any step to learn more · <span style={{color:"#64748b"}}>Right-click + drag to pan</span></p>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",justifyContent:"center"}}>
        {[
          {icon:"🏎️", label:"Driving",                   sub:"Voice only · No map",                           color:"#38bdf8"},
          {icon:"🎯", label:"Adaptive approach",          sub:"Map loads · Heatmap gradient overlays",          color:"#4ade80"},
          {icon:"👁️", label:"Driver opens map",           sub:"Loads on demand at any time",                   color:"#4ade80"},
          {icon:"🚧", label:"Colleague reports closure",  sub:"Alert + map offer sent to affected drivers",     color:"#f87171"},
          {icon:"🚶", label:"Parked / Walking",           sub:"Map stays · ML prompts confirmation",            color:"#e879f9"},
        ].map(m=>(
          <div key={m.label} style={{
            display:"flex",alignItems:"center",gap:8,
            background:"rgba(255,255,255,0.03)",border:`1px solid ${m.color}28`,
            borderRadius:10,padding:"6px 12px",
          }}>
            <span style={{fontSize:16}}>{m.icon}</span>
            <div>
              <div style={{color:m.color,fontSize:10,fontWeight:700}}>{m.label}</div>
              <div style={{color:"#3d5068",fontSize:9}}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display:"flex",alignItems:"center",gap:12,marginBottom:14,
        background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.15)",
        borderRadius:10,padding:"8px 18px",
      }}>
        <span style={{color:"#4ade80",fontSize:10,fontFamily:"'DM Mono',monospace"}}>HEATMAP GRADIENT</span>
        <div style={{display:"flex",gap:0,borderRadius:4,overflow:"hidden",height:14,width:120}}>
          {["#052e16","#14532d","#166534","#15803d","#16a34a","#22c55e","#4ade80","#86efac"].map((c,i)=>(
            <div key={i} style={{flex:1,background:c}}/>
          ))}
        </div>
        <span style={{color:"#334155",fontSize:9}}>fewer confirmations</span>
        <span style={{color:"#4ade80",fontSize:9}}>→ more confirmations</span>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",width:"100%",maxWidth:1140,marginBottom:4,padding:"0 4px"}}>
        {[
          {label:"← REACTIVE VOICE",color:"#1e90ff"},
          {label:"SENSORS · MAP · ML COPILOT",color:"#4ade80"},
          {label:"PROACTIVE · CLOSURE ALERTS · BACK OFFICE →",color:"#f87171"},
        ].map(t=>(
          <span key={t.label} style={{color:t.color,fontSize:9,fontFamily:"'DM Mono',monospace",opacity:0.55}}>{t.label}</span>
        ))}
      </div>

      <div style={{width:"100%",maxWidth:1140}}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{width:"100%",height:"auto",overflow:"visible"}}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onContextMenu={onContextMenu}
        >
          <defs>
            {[[B,"b"],[Y,"y"],[P,"p"],[O,"o"],[C,"c"],[S,"s"],[M,"m"],[G,"g"],[R,"r"]].map(([col,id])=>(
              <marker key={id} id={`arr-${id}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill={col}/>
              </marker>
            ))}
          </defs>

          <g transform={`translate(${pan.x},${pan.y})`}>
            {[37,72].map(x=>(
              <line key={x} x1={toX(x)} y1={toY(1)} x2={toX(x)} y2={toY(118)} stroke="#ffffff05" strokeWidth="1" strokeDasharray="6,4"/>
            ))}
            <rect x={toX(38)} y={toY(5)} width={toX(33)} height={toY(112)} rx={14} fill="#4ade8005" stroke="#4ade8010" strokeWidth="1"/>
            <text x={toX(54.5)} y={toY(6.3)} textAnchor="middle" fill="#4ade8025" fontSize="9" fontFamily="'DM Mono',monospace" letterSpacing="3">MAP + ML COPILOT</text>
            <rect x={toX(73)} y={toY(26)} width={toX(22)} height={toY(38)} rx={10} fill="#f871710a" stroke="#f8717118" strokeWidth="1" strokeDasharray="4,3"/>
            <text x={toX(84)} y={toY(27.2)} textAnchor="middle" fill="#f8717130" fontSize="8" fontFamily="'DM Mono',monospace" letterSpacing="2">ROAD CLOSURE CHAIN</text>

            {edges.map((e,i)=>{
              const mk=`url(#arr-${colorKey[e.color]||"b"})`;
              return (
                <g key={i}>
                  {e.type==="line"
                    ?<line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth="1.5"
                        strokeDasharray={e.dashed?"5,3":"none"} markerEnd={mk} opacity="0.72"/>
                    :<path d={e.d} fill="none" stroke={e.color} strokeWidth="1.5"
                        strokeDasharray={e.dashed?"5,3":"none"} markerEnd={mk} opacity="0.72"/>
                  }
                  {e.label&&(
                    <text x={e.lx} y={e.ly} textAnchor="middle" fontSize="7" fontFamily="'DM Mono',monospace"
                      fill={e.color===R?"#f87171":e.color===Y?"#b07820":e.color===G?"#4ade80":e.color===M?"#b050c0":"#3d5470"}>
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {nodes.map(n=>{
              const ncx=toX(n.x),ncy=toY(n.y);
              const s=typeStyles[n.type];
              const on=active===n.id;
              return (
                <g key={n.id} onClick={()=>setActive(active===n.id?null:n.id)} style={{cursor:"pointer"}}>
                  {on&&<rect x={ncx-NW/2-7} y={ncy-NH/2-7} width={NW+14} height={NH+14} rx={12} fill={s.border} opacity="0.13"/>}
                  <rect x={ncx-NW/2} y={ncy-NH/2} width={NW} height={NH}
                    rx={n.type==="start"?17:6}
                    fill={on?s.border:s.bg} stroke={s.border} strokeWidth={on?2.5:1.5}/>
                  <text x={ncx-NW/2+14} y={ncy+5} fontSize="13" textAnchor="middle">{n.icon}</text>
                  <text x={ncx+6} y={ncy+5} textAnchor="middle"
                    fill={on?"#050d1a":s.text} fontSize="7.5" fontFamily="'DM Sans',sans-serif" fontWeight="600">
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginTop:6,marginBottom:16}}>
        {[
          {color:"#1e90ff",label:"Reactive"},
          {color:"#f59e0b",label:"Decision"},
          {color:"#22c55e",label:"Action"},
          {color:"#f97316",label:"Feedback"},
          {color:"#06b6d4",label:"Back Office"},
          {color:"#a855f7",label:"Proactive"},
          {color:"#38bdf8",label:"Sensors"},
          {color:"#e879f9",label:"ML Copilot"},
          {color:"#4ade80",label:"Map / Heatmap"},
          {color:"#f87171",label:"Road Closure Chain"},
        ].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:8,height:8,borderRadius:2,background:l.color}}/>
            <span style={{color:"#64748b",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{
        width:"100%",maxWidth:540,minHeight:72,
        background:activeNode?"rgba(74,222,128,0.05)":"rgba(255,255,255,0.02)",
        border:`1px solid ${activeNode?"rgba(74,222,128,0.2)":"rgba(255,255,255,0.05)"}`,
        borderRadius:14,padding:"14px 22px",transition:"all 0.3s",textAlign:"center",
      }}>
        {activeNode?(
          <>
            <div style={{fontSize:22,marginBottom:5}}>{activeNode.icon}</div>
            <div style={{color:"#e8f4ff",fontWeight:700,fontSize:13,marginBottom:4}}>{activeNode.label}</div>
            <div style={{color:"#94a3b8",fontSize:12,lineHeight:1.6}}>{activeNode.desc}</div>
          </>
        ):(
          <div style={{color:"#2d3f55",fontSize:12,paddingTop:10}}>↑ Tap any step to see what happens there</div>
        )}
      </div>
    </div>
  );
}
