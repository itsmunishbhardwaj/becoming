import { useState, useMemo } from "react";

/* ============================================================
   BECOMING — a life, organized by who you're turning into.

   Design rationale (every choice has a purpose):
   · Name "Becoming": the app answers one question — who are you becoming?
   · Logo: an open, irregular circle. Unclosed = a self still in progress.
   · Paper texture (Painter Press): matte grain kills glare + high-contrast
     strain. No pure white, no pure black anywhere.
   · One light paper theme end-to-end: coherence, calm, low arousal.
   · Irregular blob shapes: organic, hand-made, non-clinical. A life is
     not a rectangle.
   · No red anywhere: red = threat response. Drift is a sand-colored whisper.
   · Numbers framed as accumulation ("214 days kept"), never deficit.
     Misses in habit strips are near-invisible — we don't monumentalize failure.
   · One primary action per screen (+). Everything else is quiet navigation.
   · AI patterns are questions with equal-weight yes/no. No dark patterns.
   ============================================================ */

const CATS = {
  ai:            { name: "AI",            color: "#A8BEE8" },
  career:        { name: "Career",        color: "#E9B3B7" },
  health:        { name: "Health",        color: "#A9CEBB" },
  relationships: { name: "Relationships", color: "#EBC3A0" },
  reading:       { name: "Reading",       color: "#C5B5E3" },
  creativity:    { name: "Creativity",    color: "#E5D6A3" },
};
const P = {
  paper: "#F5F2EA",   // warm bone — base
  card:  "#FBF9F3",   // one step lighter
  line:  "#E7E2D5",   // hairline borders
  ink:   "#55505C",   // soft charcoal, never black
  dim:   "#97919F",
  faint: "#C9C3CE",
  whisper: "#B9A87F", // drift — warm sand, not alarm
};
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Inter', system-ui, sans-serif";
// asymmetric radii — nothing is a perfect rectangle
const R1 = "22px 18px 24px 19px";
const R2 = "18px 23px 17px 22px";

const GOALS = [
  { id: "google", name: "Become a Google Engineer", cat: "career", momentum: 0.74, last: "Yesterday", lastDetail: "Solved 3 Leetcode problems", streak: "12-day streak", state: "active",
    mission: "Get hired by Google.", why: "Prove I can operate at the highest bar in the world.",
    projects: [ { name: "Leetcode", done: 148, total: 200 }, { name: "System Design", done: 6, total: 12 }, { name: "Networking", done: 9, total: 15 }, { name: "Behavioral", done: 4, total: 8 } ] },
  { id: "health", name: "Health", cat: "health", momentum: 0.68, last: "Yesterday", lastDetail: "Gym — push day, 55 min", streak: "4 of last 5 days", state: "active",
    mission: "Stay strong for the long game.", why: "Energy is the input to everything else.",
    projects: [ { name: "Strength", done: 3, total: 4 } ],
    habits: [ { name: "Slept before 12", hits: 214, cur: 6, seed: 11 }, { name: "No PMO", hits: 180, cur: 12, seed: 23 }, { name: "Trained", hits: 141, cur: 3, seed: 37 } ] },
  { id: "relationships", name: "Relationships", cat: "relationships", momentum: 0.53, last: "Today", lastDetail: "Called parents", streak: null, state: "active",
    mission: "Stay close to the people who matter.", why: "No goal is worth reaching alone.",
    projects: [ { name: "Weekly family call", done: 3, total: 4 }, { name: "Meet one friend / week", done: 1, total: 4 } ] },
  { id: "reading", name: "Read 50 Books", cat: "reading", momentum: 0.32, last: "6 days ago", lastDetail: "20 pages — Deep Work", streak: null, state: "drift",
    mission: "Read 50 books this year.", why: "Compound the mind.",
    projects: [ { name: "Books this year", done: 16, total: 50 } ] },
  { id: "startup", name: "Build AI Startup", cat: "ai", momentum: 0.42, last: "March", lastDetail: null, streak: null, state: "dormant",
    dormantNote: "Paused to focus on Google interviews. Returning in summer.",
    mission: "Ship an AI agent people pay for.", why: "Build something that's mine.",
    projects: [ { name: "Agent MVP", done: 7, total: 10 }, { name: "First 10 users", done: 3, total: 10 } ] },
];

const DAYS_IN = [31,28,31,30,31,30,31,31,30,31,30,31];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function rng(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>(s=(s*16807)%2147483647)/2147483647;}
function buildYear(seed=2026){const r=rng(seed);const y=[];for(let m=0;m<12;m++){const days=[];for(let d=1;d<=DAYS_IN[m];d++){const c=[];const add=(cat,p,mn,mx)=>{if(r()<p)c.push({cat,effort:mn+r()*(mx-mn)});};add("career",0.55-Math.abs(m-3)*0.03,0.4,1);add("ai",m<=2?0.6:0.05,0.4,1);add("health",0.5,0.3,0.85);add("relationships",0.22,0.3,0.7);add("reading",m<=4?0.4:0.08,0.25,0.7);add("creativity",0.14,0.3,0.9);days.push(c);}y.push(days);}return y;}
const ACTIVITIES = {
  career: ["Solved 3 Leetcode problems", "Mock interview with peer", "System design: rate limiter"],
  ai: ["Built agent tool-calling loop", "Refactored memory layer"],
  health: ["Gym — push day", "5k run", "Slept 8h"],
  relationships: ["Called parents", "Coffee with Sam"],
  reading: ["20 pages — Deep Work", "Finished chapter 4"],
  creativity: ["Recorded YouTube video", "Sketched app icons"],
};

/* ---------- logo: open irregular circle — a self in progress ---------- */
function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path
        d="M 31 9 C 24 2.5, 11 4, 6.5 13 C 2 22, 7 33, 17 35.5 C 26 37.8, 35 31, 35.5 21.5"
        stroke="url(#lg)" strokeWidth="4.4" strokeLinecap="round"
      />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#E9B3B7" />
          <stop offset="50%" stopColor="#C5B5E3" />
          <stop offset="100%" stopColor="#A9CEBB" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ---------- blob orb: irregular, slowly morphing = alive ---------- */
function Orb({ cat, momentum, dormant }) {
  const color = CATS[cat].color;
  const size = 15 + momentum * 25;
  return (
    <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div className={dormant ? "blob" : "blob blob-live"} style={{
        width: size, height: size,
        background: `radial-gradient(circle at 32% 28%, ${color}, ${color}88 75%)`,
        boxShadow: dormant ? "none" : `0 2px ${8 + momentum * 14}px ${color}55`,
        opacity: dormant ? 0.45 : 0.9 }} />
    </div>
  );
}

/* ---------- HOME ---------- */
function Home({ go }) {
  const [answered, setAnswered] = useState(null);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <div style={{ minHeight: "100%", fontFamily: SANS, color: P.ink, padding: "0 20px 48px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <header style={{ padding: "40px 2px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
            <Logo />
            <span style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, letterSpacing: "0.01em" }}>Becoming</span>
          </div>
          <div style={{ fontSize: 11.5, letterSpacing: "0.15em", textTransform: "uppercase", color: P.faint, marginBottom: 10 }}>{today}</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 28, lineHeight: 1.28, margin: 0 }}>Who are you becoming?</h1>
          <p style={{ color: P.dim, fontSize: 14, margin: "8px 0 0" }}>4 goals in motion · 1 resting</p>
        </header>

        {/* AI question — collaborative, equal-weight answers */}
        <div style={{ background: "linear-gradient(135deg, #EFEAF6, #EDF1EA)", border: `1px solid ${P.line}`, borderRadius: R2, padding: "17px 20px", marginBottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: P.dim, marginBottom: 8 }}>A question from your week</div>
          {answered === null ? (
            <>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>Your Leetcode sessions seem stronger on gym days — 3 of your last 4 best sessions came after workouts. Does that match your experience?</p>
              <div style={{ display: "flex", gap: 10, marginTop: 13 }}>
                <button onClick={() => setAnswered(true)} className="pill" style={{ background: "#DCEAE2", border: "1px solid #C3DACD", color: "#5F8672" }}>Yes, that's real</button>
                <button onClick={() => setAnswered(false)} className="pill" style={{ background: P.card, border: `1px solid ${P.line}`, color: P.dim }}>Not really</button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, color: P.dim }}>{answered ? "Noted. Gym → coding link added to your patterns." : "Discarded. I won't bring this one up again."}</p>
          )}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {GOALS.map((g, gi) => {
            const dormant = g.state === "dormant", drift = g.state === "drift", color = CATS[g.cat].color;
            return (
              <button key={g.id} onClick={() => go({ screen: "goal", id: g.id })} className="card"
                style={{ display: "block", width: "100%", textAlign: "left", background: P.card, border: `1px solid ${P.line}`,
                  borderRadius: gi % 2 ? R2 : R1, padding: "17px 19px", cursor: "pointer", color: P.ink,
                  boxShadow: "0 1px 3px rgba(85,80,92,0.05)", opacity: dormant ? 0.78 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <Orb cat={g.cat} momentum={g.momentum} dormant={dormant} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontFamily: SERIF, fontSize: 17.5, fontWeight: 500 }}>{g.name}</span>
                      {dormant ? <span style={{ fontSize: 12, color: P.dim, whiteSpace: "nowrap" }}>🌙 resting since {g.last}</span>
                        : <span style={{ fontSize: 12.5, color: P.dim, fontVariantNumeric: "tabular-nums" }}>{Math.round(g.momentum*100)}%</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: P.dim, marginTop: 4 }}>
                      {dormant ? <em style={{ color: P.faint }}>“{g.dormantNote}”</em>
                        : <>{g.last} · {g.lastDetail}{g.streak && <span style={{ color: P.faint }}> · {g.streak}</span>}{drift && <span style={{ color: P.whisper }}> · quiet lately</span>}</>}
                    </div>
                  </div>
                </div>
                {!dormant && (
                  <div style={{ height: 4, borderRadius: 3, background: "#ECE8DD", overflow: "hidden", marginTop: 13 }}>
                    <div style={{ width: `${g.momentum*100}%`, height: "100%", borderRadius: 3, background: color }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <footer style={{ marginTop: 28, textAlign: "center" }}>
          <button onClick={() => go({ screen: "year" })} className="ghost" style={{ color: P.faint }}>Zoom out — <span style={{ color: P.dim }}>see your year</span> ↓</button>
        </footer>
      </div>
    </div>
  );
}

/* ---------- GOAL ---------- */
function Goal({ id, go }) {
  const g = GOALS.find(x => x.id === id);
  const color = CATS[g.cat].color;
  const dormant = g.state === "dormant";
  return (
    <div style={{ minHeight: "100%", fontFamily: SANS, color: P.ink, padding: "0 20px 48px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={() => go({ screen: "home" })} className="ghost" style={{ color: P.dim, padding: "22px 0 8px" }}>← Life</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
          <Orb cat={g.cat} momentum={g.momentum} dormant={dormant} />
          <div>
            <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, margin: 0 }}>{g.name}</h1>
            <div style={{ fontSize: 13, color: P.dim, marginTop: 3 }}>
              {dormant ? <>🌙 resting since {g.last}</> : <>{Math.round(g.momentum*100)}% momentum · last worked {g.last}</>}
            </div>
          </div>
        </div>

        {dormant && (
          <div style={{ marginTop: 16, padding: "13px 17px", background: P.card, border: `1px solid ${P.line}`, borderRadius: R2, fontSize: 13.5, color: P.dim }}>
            <em>“{g.dormantNote}”</em>
            <button className="pill" style={{ marginLeft: 12, background: `${color}44`, border: `1px solid ${color}`, color: P.ink }}>Wake this goal</button>
          </div>
        )}

        <Section title="Mission">
          <p style={{ margin: 0, fontSize: 16, fontFamily: SERIF }}>{g.mission}</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: P.dim }}>{g.why}</p>
        </Section>

        <Section title="Projects">
          <div style={{ display: "grid", gap: 12 }}>
            {g.projects.map(p => (
              <div key={p.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
                  <span>{p.name}</span><span style={{ color: P.dim, fontVariantNumeric: "tabular-nums" }}>{p.done}/{p.total}</span>
                </div>
                <div style={{ height: 4, borderRadius: 3, background: "#ECE8DD", overflow: "hidden" }}>
                  <div style={{ width: `${(p.done/p.total)*100}%`, height: "100%", background: color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {g.habits && (
          <Section title="Habits · this year">
            <div style={{ display: "grid", gap: 18 }}>
              {g.habits.map(h => <Habit key={h.name} habit={h} color={color} />)}
            </div>
          </Section>
        )}

        <Section title="Recent activity">
          <div style={{ display: "grid", gap: 8 }}>
            {(ACTIVITIES[g.cat] || []).map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: P.ink }}>
                <span className="blob" style={{ width: 7, height: 7, background: color, flexShrink: 0 }} />{a}
              </div>
            ))}
          </div>
        </Section>

        <div style={{ marginTop: 24 }}>
          <button onClick={() => go({ screen: "year" })} className="pill" style={{ background: P.card, border: `1px solid ${P.line}`, color: P.dim }}>See on calendar →</button>
        </div>
      </div>
    </div>
  );
}

/* habit: accumulation framing — days KEPT. misses near-invisible. */
function Habit({ habit, color }) {
  const r = rng(habit.seed);
  const rate = habit.hits / 365;
  const days = useMemo(() => Array.from({ length: 364 }, () => r() < rate), []); // eslint-disable-line
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{habit.name}</span>
        <span style={{ fontSize: 12.5, color: P.dim, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: P.ink, fontWeight: 500 }}>{habit.hits} days kept</span> · 🔥{habit.cur}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(52, 1fr)", gap: 2 }}>
        {days.map((hit, i) => (
          <span key={i} style={{ width: "100%", aspectRatio: "1", borderRadius: "40% 60% 55% 45%", background: hit ? color : "#EDE9DE" }} />
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${P.line}` }}>
      <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: P.faint, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

/* ---------- YEAR ---------- */
function Year({ go }) {
  const year = useMemo(() => buildYear(), []);
  const [tip, setTip] = useState(null);
  const totals = useMemo(() => { const t={}; Object.keys(CATS).forEach(k=>t[k]=0); year.forEach(mo=>mo.forEach(d=>d.forEach(c=>t[c.cat]+=c.effort))); return t; }, [year]);
  const max = Math.max(...Object.values(totals));
  return (
    <div style={{ minHeight: "100%", fontFamily: SANS, color: P.ink, padding: "0 22px 52px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => go({ screen: "home" })} className="ghost" style={{ color: P.dim, padding: "22px 0 4px" }}>← Life</button>
        <header style={{ padding: "4px 0" }}>
          <div style={{ fontSize: 11.5, letterSpacing: "0.15em", textTransform: "uppercase", color: P.faint, marginBottom: 6 }}>2026 · a year in progress</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 28, margin: 0 }}>Where your life went</h1>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", margin: "18px 0 24px" }}>
          {Object.entries(CATS).map(([k,v]) => { const s=totals[k]/max; return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}>
              <span className="blob" style={{ width: 10+s*8, height: 10+s*8, background: v.color }} />{v.name}
            </div> ); })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px 18px" }}>
          {MONTHS.map((name, mi) => {
            const days = year[mi];
            const dormant = mi > 2 && days.filter(c => c.some(x => x.cat === "ai")).length <= 2;
            return (
              <button key={name} onClick={() => go({ screen: "month", month: mi })} className="month" style={{ background: "none", border: "none", padding: 6, borderRadius: 14, cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: dormant ? P.faint : P.dim, marginBottom: 6, display: "flex", gap: 5, alignItems: "center" }}>{name}{dormant && <span style={{ fontSize: 10 }}>🌙</span>}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                  {days.map((circles, di) => (
                    <svg key={di} width={15} height={15} viewBox="0 0 15 15" onMouseEnter={() => circles.length && setTip({ m: name, d: di+1, circles })} onMouseLeave={() => setTip(null)} style={{ display: "block" }}>
                      {circles.length === 0 && <circle cx={7.5} cy={7.5} r={0.9} fill={P.faint} opacity={0.5} />}
                      {circles.map((c, i) => { const rr=2.2+c.effort*4.2; const a=(i/Math.max(circles.length,1))*Math.PI*2+i; const o=circles.length>1?1.8:0;
                        return <ellipse key={i} cx={7.5+Math.cos(a)*o} cy={7.5+Math.sin(a)*o} rx={rr} ry={rr*0.88} transform={`rotate(${(i*37)%360} 7.5 7.5)`} fill={CATS[c.cat].color} opacity={0.6} />; })}
                    </svg>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 32, padding: "15px 19px", background: P.card, border: `1px solid ${P.line}`, borderRadius: R1, fontSize: 13.5, lineHeight: 1.65 }}>
          <span style={{ color: P.dim }}>The shape of your year: </span>career runs steady, peaking in spring. <span style={{ color: "#8DA3D1" }}>AI</span> burned bright Jan–Mar, then went quiet 🌙 — a pause, not a collapse. <span style={{ color: "#A794CC" }}>Reading</span> faded after May.
        </div>
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: P.faint }}>Tap any month to zoom in →</div>
      </div>

      {tip && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: P.card, border: `1px solid ${P.line}`, boxShadow: "0 8px 26px rgba(85,80,92,0.13)", borderRadius: R2, padding: "10px 16px", display: "flex", gap: 12, alignItems: "center", fontSize: 12.5, color: P.ink }}>
        <span style={{ color: P.dim }}>{tip.m} {tip.d}</span>
        {tip.circles.map((c,i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="blob" style={{ width: 8, height: 8, background: CATS[c.cat].color }} />{CATS[c.cat].name}</span>)}
      </div>}
    </div>
  );
}

/* ---------- MONTH ---------- */
function Month({ month, go }) {
  const year = useMemo(() => buildYear(), []);
  const days = year[month];
  const [sel, setSel] = useState(null);
  return (
    <div style={{ minHeight: "100%", fontFamily: SANS, color: P.ink, padding: "0 22px 52px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button onClick={() => go({ screen: "year" })} className="ghost" style={{ color: P.dim, padding: "22px 0 4px" }}>← Year</button>
        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, margin: "2px 0" }}>{MONTHS[month]} 2026</h1>
        <div style={{ fontSize: 13, color: P.dim, marginBottom: 20 }}>Tap a day to read what happened.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {days.map((circles, di) => {
            const isSel = sel === di;
            return (
              <button key={di} onClick={() => setSel(isSel ? null : di)} className="daybtn"
                style={{ aspectRatio: "1", borderRadius: di % 2 ? "16px 12px 15px 13px" : "13px 16px 12px 15px", border: isSel ? "1.5px solid #C5B5E3" : `1px solid ${P.line}`, background: isSel ? "#F1EDF7" : P.card, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 4 }}>
                <span style={{ fontSize: 10, color: P.faint, fontVariantNumeric: "tabular-nums" }}>{di+1}</span>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", maxWidth: 34 }}>
                  {circles.slice(0,4).map((c,i) => <span key={i} className="blob" style={{ width: 6, height: 6, background: CATS[c.cat].color }} />)}
                </div>
              </button>
            );
          })}
        </div>

        {sel !== null && (
          <div style={{ marginTop: 20, padding: "17px 19px", background: P.card, border: `1px solid ${P.line}`, borderRadius: R1 }}>
            <div style={{ fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase", color: P.dim, marginBottom: 12 }}>{MONTHS[month]} {sel+1}</div>
            {days[sel].length === 0 ? <div style={{ color: P.faint, fontSize: 13.5 }}>A quiet day. Rest counts too.</div> : (
              <div style={{ display: "grid", gap: 10 }}>
                {days[sel].map((c, i) => {
                  const acts = ACTIVITIES[c.cat] || [];
                  return (
                    <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                      <span className="blob" style={{ width: 8+c.effort*8, height: 8+c.effort*8, background: CATS[c.cat].color, marginTop: 3, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13.5 }}>{acts[(sel+i) % acts.length]}</div>
                        <div style={{ fontSize: 12, color: P.dim }}>{CATS[c.cat].name} · {Math.round(c.effort*90)} min</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- LOG ---------- */
function LogSheet({ close }) {
  const [text, setText] = useState("Spent 4 hours building my AI agent, went to the gym, called my parents, read 20 pages.");
  const [parsed, setParsed] = useState(null);
  const parse = () => setParsed([
    { cat: "ai", label: "Built AI agent", meta: "4h → Build AI Startup" },
    { cat: "health", label: "Gym", meta: "→ Health · Trained ✓" },
    { cat: "relationships", label: "Called parents", meta: "→ Relationships" },
    { cat: "reading", label: "Read 20 pages", meta: "→ Read 50 Books" },
  ]);
  return (
    <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(85,80,92,0.28)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: P.paper, border: `1px solid ${P.line}`, borderRadius: "26px 22px 0 0", padding: "22px 22px 28px", fontFamily: SANS, color: P.ink, boxShadow: "0 -10px 40px rgba(85,80,92,0.15)" }}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: P.line, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 11.5, letterSpacing: "0.13em", textTransform: "uppercase", color: P.dim, marginBottom: 10 }}>Log your day — just write</div>
        <textarea value={text} onChange={e => { setText(e.target.value); setParsed(null); }} rows={3}
          style={{ width: "100%", background: P.card, border: `1px solid ${P.line}`, borderRadius: R2, color: P.ink, fontFamily: SANS, fontSize: 14.5, padding: "13px 15px", resize: "none", lineHeight: 1.55, outline: "none" }} />
        {!parsed ? (
          <button onClick={parse} className="pill" style={{ marginTop: 13, background: "#D9DFF0", border: "1px solid #C4CDE6", color: P.ink, fontWeight: 500, padding: "10px 19px" }}>Let it sort itself →</button>
        ) : (
          <div style={{ marginTop: 15 }}>
            <div style={{ fontSize: 12, color: P.dim, marginBottom: 10 }}>Understood — no forms, no tags:</div>
            <div style={{ display: "grid", gap: 8 }}>
              {parsed.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, background: P.card, border: `1px solid ${P.line}`, borderRadius: i % 2 ? R2 : R1, padding: "11px 14px" }}>
                  <span className="blob" style={{ width: 10, height: 10, background: CATS[p.cat].color }} />
                  <span style={{ fontSize: 13.5, flex: 1 }}>{p.label}</span>
                  <span style={{ fontSize: 11.5, color: P.dim }}>{p.meta}</span>
                </div>
              ))}
            </div>
            <button onClick={close} className="pill" style={{ marginTop: 15, background: "#DCEAE2", border: "1px solid #C3DACD", color: "#5F8672", padding: "10px 19px" }}>Looks right — save</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- SHELL ---------- */
export default function Becoming() {
  const [nav, setNav] = useState({ screen: "home" });
  const [log, setLog] = useState(false);
  const go = n => setNav(n);
  return (
    <div style={{ position: "relative", height: 780, maxWidth: 600, margin: "0 auto", borderRadius: "30px 26px 28px 26px", overflow: "hidden", background: P.paper, boxShadow: "0 18px 50px rgba(85,80,92,0.18)", border: `1px solid ${P.line}` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500&display=swap');
        .pill { border-radius: 999px; padding: 7px 15px; font-size: 12.5px; cursor: pointer; font-family: ${SANS}; transition: opacity .15s; }
        .pill:hover { opacity: .8; }
        .ghost { background: none; border: none; font-size: 13px; cursor: pointer; font-family: ${SANS}; }
        .card { transition: transform .18s, box-shadow .18s; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(85,80,92,0.09) !important; }
        .month { transition: background .18s; }
        .month:hover { background: #F0EDE3; }
        .daybtn { transition: transform .12s, border-color .15s; }
        .daybtn:hover { transform: scale(1.05); border-color: #C5B5E3; }
        .blob { border-radius: 58% 42% 55% 45% / 45% 55% 42% 58%; display: inline-block; }
        @keyframes morph {
          0%,100% { border-radius: 58% 42% 55% 45% / 45% 55% 42% 58%; transform: scale(1); }
          33% { border-radius: 45% 55% 48% 52% / 55% 45% 58% 42%; transform: scale(1.07); }
          66% { border-radius: 52% 48% 42% 58% / 48% 52% 45% 55%; transform: scale(0.97); }
        }
        .blob-live { animation: morph 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .blob-live { animation: none; } .card, .daybtn { transition: none; } }
        .scroll::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* Painter Press paper grain — matte finish, kills glare */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <div style={{ position: "absolute", inset: 0, filter: "url(#paper-grain)", opacity: 0.05, pointerEvents: "none", zIndex: 40 }} />

      <div className="scroll" style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" }}>
        {nav.screen === "home" && <Home go={go} />}
        {nav.screen === "goal" && <Goal id={nav.id} go={go} />}
        {nav.screen === "year" && <Year go={go} />}
        {nav.screen === "month" && <Month month={nav.month} go={go} />}
      </div>

      {(nav.screen === "home" || nav.screen === "goal") && (
        <button onClick={() => setLog(true)} className="blob-live" style={{ position: "absolute", right: 20, bottom: 22, width: 54, height: 54, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #C5B5E3, #A9CEBB)", color: P.paper, fontSize: 26, lineHeight: 1, boxShadow: "0 6px 20px rgba(197,181,227,0.5)", zIndex: 45 }}>+</button>
      )}

      {log && <LogSheet close={() => setLog(false)} />}
    </div>
  );
}
