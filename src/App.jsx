import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "plt_tracker_v3";

const DAYS = [
  { id: "mon", label: "Monday",   focus: "Lower — Strength",        env: "Gym"     },
  { id: "tue", label: "Tuesday",  focus: "Upper — Pull + Rehab",    env: "Gym"     },
  { id: "thu", label: "Thursday", focus: "Lower — Stamina / Carry", env: "Outdoor" },
  { id: "sat", label: "Saturday", focus: "Upper — Push + Pull",     env: "Gym"     },
];

const REST_BY_CATEGORY = {
  hinge: 210, squat: 180, pull: 90, push: 120,
  carry: 90, rehab: 60, core: 60, accessory: 60, cardio: 0,
};

const WEEK1_TEMPLATE = {
  mon: [
    { name: "Trap Bar Deadlift",       sets: 4, reps: "4–5", rpe: 8,   note: "Neutral spine. Reset between reps.",          category: "hinge",   pr: 405 },
    { name: "Goblet Squat",            sets: 3, reps: "8",   rpe: 7,   note: "Pause 1s at bottom. Pelvis neutral.",         category: "squat"  },
    { name: "Romanian Deadlift",       sets: 3, reps: "10",  rpe: 7,   note: "3s eccentric. Hinge from hip.",               category: "hinge"  },
    { name: "Trap Bar Farmer's Carry", sets: 3, reps: "40yd",rpe: null,note: "Tall posture. 90s rest.",                     category: "carry"  },
    { name: "Copenhagen Plank",        sets: 2, reps: "25s", rpe: null,note: "Per side. Sub side plank if needed.",         category: "core"   },
    { name: "Dead Bug",                sets: 2, reps: "8",   rpe: null,note: "Per side. Lumbar on floor throughout.",       category: "core"   },
  ],
  tue: [
    { name: "Chest-Supported DB Row",  sets: 4, reps: "10–12",rpe: 7,  note: "Scapular retraction at top.",                category: "pull"   },
    { name: "Neutral-Grip Pull-Up",    sets: 3, reps: "8–10", rpe: 7,  note: "Full hang at bottom.",                       category: "pull"   },
    { name: "Face Pull",               sets: 3, reps: "15",   rpe: 6,  note: "External rotation at end range.",            category: "rehab"  },
    { name: "Single-Arm DB Row",       sets: 3, reps: "10",   rpe: 7,  note: "Per side. Note L/R asymmetry.",              category: "pull"   },
    { name: "Overhead Carry",          sets: 2, reps: "25yd", rpe: null,note: "Per arm. Light load. Stability only.",      category: "carry"  },
    { name: "Band External Rotation",  sets: 2, reps: "15–20",rpe: null,note: "Per side. Motor re-patterning.",            category: "rehab"  },
    { name: "Bicep Curl",              sets: 2, reps: "12",   rpe: 6,  note: "Neutral or supinated grip.",                 category: "accessory"},
  ],
  thu: [
    { name: "Weighted Ruck",           sets: 1, reps: "35min",rpe: null,note: "30–40 lbs. Nasal breathing only.",          category: "cardio" },
    { name: "Bulgarian Split Squat",   sets: 3, reps: "8",    rpe: 7,  note: "Per leg. Post-ruck. Controlled descent.",   category: "squat"  },
    { name: "Kettlebell Swing",        sets: 4, reps: "15",   rpe: 7,  note: "Hip drive, not squat. Snap at top.",        category: "hinge"  },
  ],
  sat: [
    { name: "Landmine Press",          sets: 4, reps: "10",   rpe: 7,  note: "Shoulder-friendly arc. Control descent.",   category: "push"   },
    { name: "Chest-Supported DB Row",  sets: 3, reps: "12",   rpe: 7,  note: "Balance press volume.",                     category: "pull"   },
    { name: "Neutral-Grip DB Press",   sets: 2, reps: "12",   rpe: 6,  note: "Neutral grip only. Stop if discomfort.",    category: "push"   },
    { name: "Band Pull-Apart",         sets: 3, reps: "20",   rpe: null,note: "Non-negotiable with every press session.", category: "rehab"  },
    { name: "Tricep Overhead Ext.",    sets: 2, reps: "15",   rpe: 6,  note: "Long head. Controlled eccentric.",          category: "accessory"},
    { name: "Hammer Curl",             sets: 2, reps: "12",   rpe: 6,  note: "Brachialis focus.",                         category: "accessory"},
    { name: "Face Pull",               sets: 2, reps: "15",   rpe: 6,  note: "Shoulder insurance every upper session.",   category: "rehab"  },
  ],
};

const EXERCISE_LIBRARY = [
  "Trap Bar Deadlift","Conventional Deadlift","Romanian Deadlift","Rack Pull","Sumo Deadlift",
  "Back Squat","Front Squat","Goblet Squat","Bulgarian Split Squat","Hack Squat","Leg Press",
  "Walking Lunge","Step-Up","Box Squat",
  "Bench Press","Incline DB Press","DB Floor Press","Landmine Press","Push-Up","Dip",
  "DB Shoulder Press","Arnold Press","Lateral Raise","Front Raise",
  "Pull-Up","Chin-Up","Lat Pulldown","Chest-Supported DB Row","Single-Arm DB Row",
  "Cable Row","Barbell Row","Face Pull","Band Pull-Apart","Rear Delt Fly",
  "Trap Bar Farmer's Carry","Suitcase Carry","Overhead Carry","Weighted Ruck","Sled Push",
  "Sled Drag","Yoke Carry",
  "Kettlebell Swing","Kettlebell Clean","Kettlebell Press","Turkish Get-Up",
  "Copenhagen Plank","Dead Bug","Pallof Press","Ab Wheel","Bird Dog","Side Plank",
  "Band External Rotation","Band Internal Rotation","Wall Slide","Serratus Punch",
  "Bicep Curl","Hammer Curl","Tricep Pushdown","Tricep Overhead Ext.","Skull Crusher",
  "Calf Raise","Nordic Curl","Glute Bridge","Hip Thrust","Good Morning",
];

const CATEGORY_COLORS = {
  hinge: "#C8A84B", squat: "#7EB8A0", pull: "#7896C8", push: "#C87E96",
  carry: "#A07EC8", rehab: "#6BA86B", core: "#C8966B", accessory: "#888",
  cardio: "#5ABECC",
};

const C = {
  bg: "#0A0A0A", surface: "#111", card: "#161616", border: "#222",
  borderHover: "#333", accent: "#C8A84B", accentDim: "#8A6F2E",
  text: "#E2E2E2", muted: "#555", faint: "#2A2A2A",
  green: "#5aaa6a", red: "#e05555", blue: "#5a8aee",
};

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const serif = { fontFamily: "'Playfair Display', serif" };

// ─── Garmin Readiness ─────────────────────────────────────────────────────────
function getReadinessCue(battery, hrvTrend) {
  if (!battery && !hrvTrend) return null;
  const bb = parseInt(battery) || 0;
  if (bb > 0 && bb < 50) {
    return { level: "reduced", color: C.red, label: "REDUCE INTENSITY",
      detail: `Body Battery ${bb} — below threshold. Drop compounds to 3×3, reduce RDL load ~20%. Technique-only day. Do not chase load.` };
  }
  if (hrvTrend === "down") {
    return { level: "reduced", color: C.red, label: "REDUCE INTENSITY",
      detail: "HRV downtrend across 7 days — systemic fatigue accumulating. Pull one working set per compound movement. Prioritize technique over load." };
  }
  if ((bb > 0 && bb < 70) || hrvTrend === "flat") {
    return { level: "moderate", color: C.accent, label: "MAINTAIN TARGETS",
      detail: `Body Battery ${bb || "—"}. Proceed as programmed. No PRs, no extra sets. Hit your RPE targets exactly — not above.` };
  }
  if (bb >= 70 || hrvTrend === "up") {
    return { level: "green", color: C.green, label: "GO AS PROGRAMMED",
      detail: `Body Battery ${bb || "—"} — well-recovered. Full volume as programmed. If everything moves clean, you can nudge RPE ceiling +0.5 on top sets only.` };
  }
  return null;
}

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function RestTimer({ seconds, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const [active, setActive] = useState(true);
  const intervalRef = useRef(null);
  const doneCalledRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          if (!doneCalledRef.current) {
            doneCalledRef.current = true;
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              [0, 0.18, 0.36].forEach(t => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
                osc.start(ctx.currentTime + t);
                osc.stop(ctx.currentTime + t + 0.3);
              });
            } catch (_) {}
            setTimeout(onDone, 400);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  const pct = remaining / seconds;
  const r = 28, circ = 2 * Math.PI * r;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "#0D0D0D", border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "12px 16px",
    }}>
      <svg width={68} height={68} style={{ flexShrink: 0 }}>
        <circle cx={34} cy={34} r={r} fill="none" stroke={C.faint} strokeWidth={3} />
        <circle cx={34} cy={34} r={r} fill="none" stroke={C.accent} strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <text x={34} y={34} textAnchor="middle" dominantBaseline="central"
          fill={remaining === 0 ? C.green : C.accent} fontSize={13}
          fontFamily="'IBM Plex Mono', monospace" fontWeight={700}>
          {mins}:{String(secs).padStart(2, "0")}
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4, ...mono }}>REST PERIOD</div>
        <div style={{ fontSize: 12, color: remaining === 0 ? C.green : C.text, ...mono }}>
          {remaining === 0 ? "Go — load the bar" : `${remaining}s remaining`}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button onClick={() => setActive(p => !p)} style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 3,
            color: C.muted, cursor: "pointer", padding: "3px 10px", fontSize: 9, letterSpacing: 1, ...mono,
          }}>{active ? "PAUSE" : "RESUME"}</button>
          <button onClick={onSkip} style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 3,
            color: C.muted, cursor: "pointer", padding: "3px 10px", fontSize: 9, letterSpacing: 1, ...mono,
          }}>SKIP</button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Log Modal ──────────────────────────────────────────────────────────
function QuickLogModal({ ex, logData, onUpdateLog, onClose }) {
  const currentSets = logData?.sets ?? [];
  const loggedSets = currentSets.filter(s => s.weight && s.reps);
  const targetSets = parseInt(ex.sets) || 3;
  const done = loggedSets.length >= targetSets;
  const catColor = CATEGORY_COLORS[ex.category] || C.muted;
  const restDuration = REST_BY_CATEGORY[ex.category] || 90;

  const [weight, setWeight] = useState(() => {
    const last = loggedSets.at(-1);
    return last?.weight ?? logData?.workingWeight ?? "";
  });
  const [reps, setReps] = useState(() => {
    const last = loggedSets.at(-1);
    if (last?.reps) return last.reps;
    const target = ex.reps;
    if (target && target.includes("–")) return target.split("–")[1];
    return target ?? "";
  });
  const [rpe, setRpe] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const logSet = () => {
    if (!weight || !reps) return;
    const newSets = [...currentSets, { weight, reps, rpe, note: "" }];
    onUpdateLog({ ...logData, sets: newSets, workingWeight: +weight });
    setRpe("");
    const newLogged = newSets.filter(s => s.weight && s.reps).length;
    if (restDuration > 0 && newLogged < targetSets) {
      setTimerKey(k => k + 1);
      setShowTimer(true);
    }
  };

  const bestWeight = loggedSets.length ? Math.max(...loggedSets.map(s => +s.weight)) : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${catColor}`, borderRadius: 10,
        padding: 22, width: "100%", maxWidth: 420,
        boxShadow: "0 32px 80px #000",
        animation: "slideUp .2s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ ...serif, fontSize: 19, color: C.text }}>{ex.name}</div>
            <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginTop: 3, ...mono }}>
              {ex.sets} × {ex.reps}{ex.rpe ? ` @ RPE ${ex.rpe}` : ""}
            </div>
            {ex.note && <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic", marginTop: 4, lineHeight: 1.5 }}>{ex.note}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {/* Set progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {Array.from({ length: targetSets }, (_, i) => (
            <div key={i} style={{
              height: 4, flex: 1, borderRadius: 2,
              background: i < loggedSets.length ? catColor : C.faint,
              transition: "background .25s",
            }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 14, textAlign: "center", ...mono }}>
          {done ? "ALL SETS COMPLETE" : `SET ${loggedSets.length + 1} OF ${targetSets}`}
        </div>

        {/* Rest timer */}
        {showTimer && !done && (
          <div style={{ marginBottom: 16 }}>
            <RestTimer key={timerKey} seconds={restDuration} onDone={() => setShowTimer(false)} onSkip={() => setShowTimer(false)} />
          </div>
        )}

        {/* Input area */}
        {!done && !showTimer && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>WEIGHT (lbs)</div>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} autoFocus
                  style={{
                    background: C.bg, border: `1px solid ${C.accentDim}`, borderRadius: 6,
                    color: C.accent, padding: "12px 10px", fontSize: 24, fontWeight: 700,
                    width: "100%", outline: "none", textAlign: "center", ...mono,
                  }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.accentDim}
                />
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>REPS</div>
                <input type="number" value={reps} onChange={e => setReps(e.target.value)}
                  style={{
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                    color: C.text, padding: "12px 10px", fontSize: 24, fontWeight: 700,
                    width: "100%", outline: "none", textAlign: "center", ...mono,
                  }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* RPE quick-select */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 7, ...mono }}>RPE</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => (
                  <button key={r} onClick={() => setRpe(rpe === String(r) ? "" : String(r))}
                    style={{
                      background: rpe === String(r) ? (r >= 9 ? C.red : r >= 7 ? C.accent : C.green) : C.faint,
                      border: "none", borderRadius: 4,
                      color: rpe === String(r) ? "#000" : C.muted,
                      padding: "6px 9px", cursor: "pointer", fontSize: 10, fontWeight: 700,
                      transition: "all .1s", ...mono,
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* PR context */}
            {ex.pr && weight && (
              <div style={{ fontSize: 10, color: C.accentDim, marginBottom: 14, textAlign: "center", ...mono }}>
                {Math.round((+weight / ex.pr) * 100)}% of pre-layoff PR ({ex.pr} lbs)
              </div>
            )}

            <button onClick={logSet} disabled={!weight || !reps} style={{
              width: "100%", background: (!weight || !reps) ? C.faint : catColor,
              border: "none", borderRadius: 6, color: "#000", padding: "14px",
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              cursor: (!weight || !reps) ? "default" : "pointer",
              transition: "all .15s", ...mono,
            }}>
              LOG SET {loggedSets.length + 1}
            </button>
          </>
        )}

        {/* Completion state */}
        {done && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 12, color: C.green, letterSpacing: 2, ...mono }}>ALL SETS COMPLETE</div>
            {bestWeight && ex.pr && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6, ...mono }}>
                {bestWeight >= ex.pr ? "🏅 PR MATCHED OR EXCEEDED" : `${Math.round(bestWeight / ex.pr * 100)}% of pre-layoff PR`}
              </div>
            )}
            <button onClick={onClose} style={{
              marginTop: 16, background: C.green, border: "none", borderRadius: 6,
              color: "#000", padding: "11px 28px", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: 1, ...mono,
            }}>DONE</button>
          </div>
        )}

        {/* Session summary */}
        {loggedSets.length > 0 && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${C.faint}`, paddingTop: 12 }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>SESSION LOG</div>
            {loggedSets.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 3, ...mono }}>
                <span style={{ color: C.faint }}>Set {i + 1}</span>
                <span>{s.weight} lbs × {s.reps}{s.rpe ? ` @ RPE ${s.rpe}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Garmin Readiness Banner ──────────────────────────────────────────────────
function ReadinessBanner() {
  const [battery, setBattery] = useState("");
  const [hrvTrend, setHrvTrend] = useState("");
  const [open, setOpen] = useState(false);
  const cue = getReadinessCue(battery, hrvTrend);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 16, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: cue ? cue.color : C.muted,
            boxShadow: cue ? `0 0 8px ${cue.color}55` : "none",
            transition: "all .3s",
          }} />
          <span style={{ fontSize: 10, letterSpacing: 1, color: C.muted, ...mono }}>GARMIN READINESS</span>
          {cue && <span style={{ fontSize: 10, color: cue.color, fontWeight: 700, letterSpacing: 1, ...mono }}>{cue.label}</span>}
          {!cue && <span style={{ fontSize: 10, color: C.muted, ...mono }}>— enter Body Battery + HRV to get session protocol</span>}
        </div>
        <span style={{ fontSize: 10, color: C.muted }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.faint}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>BODY BATTERY</div>
              <input type="number" min={0} max={100} value={battery} onChange={e => setBattery(e.target.value)} placeholder="0–100"
                style={{
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4,
                  color: C.text, padding: "8px 10px", fontSize: 16, fontWeight: 700,
                  width: "100%", outline: "none", textAlign: "center", ...mono,
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>HRV TREND (7-DAY)</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["up","↑",C.green],["flat","→",C.accent],["down","↓",C.red]].map(([v, icon, color]) => (
                  <button key={v} onClick={() => setHrvTrend(hrvTrend === v ? "" : v)} style={{
                    flex: 1, background: hrvTrend === v ? color : C.faint,
                    border: "none", borderRadius: 4,
                    color: hrvTrend === v ? "#000" : C.muted,
                    padding: "8px 4px", cursor: "pointer", fontSize: 16, fontWeight: 700,
                    transition: "all .15s",
                  }}>{icon}</button>
                ))}
              </div>
            </div>
          </div>
          {cue && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: C.bg, borderLeft: `3px solid ${cue.color}`,
              borderRadius: 4, fontSize: 11, color: C.text, lineHeight: 1.65,
            }}>
              {cue.detail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, w = 100, h = 28, color }) {
  const col = color || C.accent;
  const pts = data.filter(Boolean);
  if (pts.length < 2) return (
    <svg width={w} height={h}><line x1={0} y1={h/2} x2={w} y2={h/2} stroke={C.faint} strokeWidth={1} /></svg>
  );
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const xs = data.map((_, i) => (i / (data.length - 1)) * w);
  const ys = data.map(v => v == null ? null : h - ((v - min) / range) * (h - 6) - 3);
  const validIdx = data.map((v, i) => v != null ? i : -1).filter(i => i >= 0);
  const segs = []; let seg = [];
  data.forEach((v, i) => {
    if (v != null) seg.push(`${xs[i]},${ys[i]}`);
    else if (seg.length) { segs.push(seg.join(" ")); seg = []; }
  });
  if (seg.length) segs.push(seg.join(" "));
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {segs.map((s, i) => <polyline key={i} points={s} fill="none" stroke={col} strokeWidth={1.5} strokeLinecap="round" />)}
      {validIdx.map(i => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={i === validIdx.at(-1) ? 3 : 2}
          fill={i === validIdx.at(-1) ? col : C.card} stroke={col} strokeWidth={1.2} />
      ))}
    </svg>
  );
}

// ─── Area Chart ───────────────────────────────────────────────────────────────
function AreaChart({ data, w = 680, h = 80, color = C.accent, label = "" }) {
  const pts = data.filter(v => v != null);
  if (pts.length < 2) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: h }}>
      <span style={{ fontSize: 10, color: C.muted, ...mono }}>NOT ENOUGH DATA</span>
    </div>
  );
  const min = Math.min(...pts) * 0.93;
  const max = Math.max(...pts) * 1.04;
  const range = max - min || 1;
  const pad = 6;
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (w - pad * 2));
  const ys = data.map(v => v == null ? null : h - pad - ((v - min) / range) * (h - pad * 2));
  const validIdx = data.map((v, i) => v != null ? i : -1).filter(i => i >= 0);
  const first = validIdx[0], last = validIdx.at(-1);
  const linePts = validIdx.map(i => `${xs[i]},${ys[i]}`).join(" L ");
  const areaPath = `M ${xs[first]},${h} L ${xs[first]},${ys[first]} L ${linePts} L ${xs[last]},${h} Z`;
  const linePath = `M ${xs[first]},${ys[first]} L ${linePts}`;
  const gradId = `ag-${label.replace(/\s/g, "")}`;

  return (
    <svg width={w} height={h + 18} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {validIdx.map(i => (
        <circle key={i} cx={xs[i]} cy={ys[i]}
          r={i === last ? 4.5 : 3}
          fill={i === last ? color : C.card}
          stroke={color} strokeWidth={1.5} />
      ))}
      {data.map((v, i) => i % 3 === 0 && (
        <text key={i} x={xs[i]} y={h + 14} textAnchor="middle"
          fill={C.muted} fontSize={8} fontFamily="'IBM Plex Mono', monospace">W{i + 1}</text>
      ))}
      {/* Value label on last point */}
      {validIdx.length > 0 && (
        <text x={xs[last]} y={ys[last] - 10} textAnchor="middle"
          fill={color} fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight={700}>
          {data[last]} lbs
        </text>
      )}
    </svg>
  );
}

// ─── Volume Bar Chart ─────────────────────────────────────────────────────────
function VolumeBar({ data, w = 700, h = 60 }) {
  const max = Math.max(...data, 1);
  const barW = Math.max(1, (w / data.length) - 3);
  return (
    <svg width={w} height={h + 18} style={{ overflow: "visible" }}>
      {data.map((v, i) => {
        const bh = v > 0 ? Math.max(3, (v / max) * h) : 2;
        const x = i * (w / data.length) + 1;
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={barW} height={bh}
              fill={v > 0 ? C.accent : C.faint} fillOpacity={v > 0 ? 0.75 : 0.2} rx={2} />
            {i % 3 === 0 && (
              <text x={x + barW / 2} y={h + 14} textAnchor="middle"
                fill={C.muted} fontSize={8} fontFamily="'IBM Plex Mono', monospace">W{i + 1}</text>
            )}
            {v > 0 && (
              <text x={x + barW / 2} y={h - bh - 4} textAnchor="middle"
                fill={C.accent} fontSize={7} fontFamily="'IBM Plex Mono', monospace">{v}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Category Donut ───────────────────────────────────────────────────────────
function CategoryDonut({ data, size = 100 }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const cx = size / 2, cy = size / 2, r = size / 2 - 8, inner = r * 0.52;
  let angle = -Math.PI / 2;
  const slices = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return (
    <svg width={size} height={size}>
      {slices.map(([cat, count]) => {
        const sweep = (count / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
        const xi1 = cx + inner * Math.cos(angle), yi1 = cy + inner * Math.sin(angle);
        const xi2 = cx + inner * Math.cos(angle + sweep), yi2 = cy + inner * Math.sin(angle + sweep);
        const large = sweep > Math.PI ? 1 : 0;
        const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`;
        const color = CATEGORY_COLORS[cat] || C.muted;
        angle += sweep;
        return <path key={cat} d={d} fill={color} opacity={0.85} />;
      })}
      <circle cx={cx} cy={cy} r={inner - 1} fill={C.card} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fill={C.text} fontSize={11} fontFamily="'IBM Plex Mono', monospace" fontWeight={700}>{total}</text>
    </svg>
  );
}

// ─── Exercise Autocomplete ────────────────────────────────────────────────────
function ExerciseInput({ value, onChange, placeholder = "Exercise name" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  useEffect(() => { setQ(value); }, [value]);
  const matches = q.length > 1 ? EXERCISE_LIBRARY.filter(e => e.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <input value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={e => { e.target.style.borderColor = C.accent; setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, padding: "6px 10px", fontSize: 12, outline: "none", width: "100%", ...mono }}
      />
      {open && matches.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px #000a" }}>
          {matches.map(m => (
            <div key={m} onMouseDown={() => { onChange(m); setQ(m); setOpen(false); }}
              style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", color: C.text, borderBottom: `1px solid ${C.faint}`, ...mono }}
              onMouseEnter={e => e.currentTarget.style.background = C.faint}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>{m}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Set Logger ───────────────────────────────────────────────────────────────
function SetLogger({ sets, onChange, workingWeight }) {
  const addSet = () => {
    const last = sets.at(-1);
    onChange([...sets, { weight: last?.weight ?? workingWeight ?? "", reps: last?.reps ?? "", rpe: "", note: "" }]);
  };
  const updateSet = (i, k, v) => { const ns = [...sets]; ns[i] = { ...ns[i], [k]: v }; onChange(ns); };
  const removeSet = (i) => onChange(sets.filter((_, j) => j !== i));

  return (
    <div>
      {sets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "18px 72px 52px 52px 1fr 20px", gap: 5, marginBottom: 3 }}>
          {["", "WEIGHT", "REPS", "RPE", "NOTE", ""].map((h, i) => (
            <span key={i} style={{ fontSize: 9, color: C.muted, letterSpacing: 1, ...mono }}>{h}</span>
          ))}
        </div>
      )}
      {sets.map((s, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "18px 72px 52px 52px 1fr 20px", gap: 5, marginBottom: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.muted, textAlign: "right", ...mono }}>{i + 1}</span>
          {["weight", "reps"].map(k => (
            <input key={k} type="number" value={s[k]} placeholder={k === "weight" ? "lbs" : "reps"}
              onChange={e => updateSet(i, k, e.target.value)}
              style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "4px 7px", fontSize: 12, width: "100%", outline: "none", ...mono }} />
          ))}
          <select value={s.rpe} onChange={e => updateSet(i, "rpe", e.target.value)}
            style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: s.rpe ? (s.rpe >= 9 ? C.red : s.rpe >= 7 ? C.accent : C.green) : C.muted, padding: "4px", fontSize: 11, outline: "none", ...mono }}>
            <option value="">—</option>
            {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={s.note} onChange={e => updateSet(i, "note", e.target.value)} placeholder="note"
            style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.muted, padding: "4px 7px", fontSize: 11, width: "100%", outline: "none", ...mono }} />
          <button onClick={() => removeSet(i)} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 13, padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = "#333"}>✕</button>
        </div>
      ))}
      <button onClick={addSet} style={{
        background: "none", border: `1px dashed ${C.faint}`, borderRadius: 3,
        color: C.muted, cursor: "pointer", padding: "4px 12px", fontSize: 10,
        width: "100%", letterSpacing: 1, transition: "all .15s", ...mono, marginTop: sets.length ? 4 : 0,
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.faint; e.currentTarget.style.color = C.muted; }}>
        + ADD SET
      </button>
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({ ex, weekIdx, dayId, logData, onUpdateLog, onUpdateEx, onRemove, allPRs }) {
  const [expanded, setExpanded] = useState(false);
  const [editName, setEditName] = useState(false);
  const [quickLog, setQuickLog] = useState(false);

  const sets = logData?.sets ?? [];
  const loggedSets = sets.filter(s => s.weight && s.reps);
  const bestWeight = loggedSets.length ? Math.max(...loggedSets.map(s => +s.weight)) : null;
  const isPR = bestWeight && ex.pr && bestWeight >= ex.pr;
  const catColor = CATEGORY_COLORS[ex.category] || C.muted;
  const targetSets = parseInt(ex.sets) || 0;
  const completedSets = loggedSets.length;
  const allDone = completedSets >= targetSets && targetSets > 0;

  const sparkData = Array.from({ length: 12 }, (_, wi) => allPRs[`${wi}_${dayId}_${ex.name}`] ?? null);

  return (
    <>
      {quickLog && (
        <QuickLogModal ex={ex} logData={logData} onUpdateLog={d => onUpdateLog(d)} onClose={() => setQuickLog(false)} />
      )}
      <div style={{
        background: C.card,
        border: `1px solid ${allDone ? "#1E2E1E" : expanded ? C.accentDim : C.border}`,
        borderLeft: `3px solid ${allDone ? C.green : catColor}`,
        borderRadius: 6, marginBottom: 8, transition: "border .15s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editName ? (
              <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <ExerciseInput value={ex.name} onChange={v => onUpdateEx({ ...ex, name: v })} />
                <button onClick={e => { e.stopPropagation(); setEditName(false); }}
                  style={{ background: C.accent, border: "none", borderRadius: 3, color: "#000", padding: "4px 10px", cursor: "pointer", fontSize: 11, ...mono }}>done</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...serif, fontSize: 14, color: allDone ? C.green : C.text }}>{ex.name}</span>
                {allDone && <span style={{ fontSize: 10, color: C.green }}>✓</span>}
                {isPR && <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 2, padding: "1px 5px", ...mono }}>PR</span>}
                <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", color: catColor, border: `1px solid ${catColor}`, borderRadius: 2, padding: "1px 5px", ...mono }}>{ex.category || "lift"}</span>
                <button onClick={e => { e.stopPropagation(); setEditName(true); }}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 10, padding: 0, ...mono }}
                  onMouseEnter={e => e.currentTarget.style.color = C.accent} onMouseLeave={e => e.currentTarget.style.color = C.muted}>rename</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: C.muted, ...mono }}>{ex.sets} × {ex.reps}{ex.rpe ? ` @ RPE ${ex.rpe}` : ""}</span>
              {targetSets > 0 && (
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  {Array.from({ length: targetSets }, (_, i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < completedSets ? catColor : C.faint }} />
                  ))}
                </div>
              )}
              {bestWeight && <span style={{ fontSize: 11, color: C.accent, ...mono }}>{bestWeight} lbs × {loggedSets.find(s => +s.weight === bestWeight)?.reps}</span>}
              {ex.note && <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>{ex.note}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Sparkline data={sparkData} />
            {ex.category !== "cardio" && (
              <button onClick={e => { e.stopPropagation(); setQuickLog(true); }} style={{
                background: allDone ? "#172217" : C.accent,
                border: "none", borderRadius: 4,
                color: allDone ? C.green : "#000",
                padding: "5px 10px", cursor: "pointer", fontSize: 9,
                fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap",
                transition: "all .15s", ...mono,
              }}>
                {allDone ? "✓" : "LOG"}
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onRemove(); }}
              style={{ background: "none", border: "none", color: "#2A2A2A", cursor: "pointer", fontSize: 13, padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = "#2A2A2A"}>✕</button>
            <span style={{ color: C.muted, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.faint}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "10px 0 12px" }}>
              {[{ label: "TARGET SETS", key: "sets", type: "number" }, { label: "TARGET REPS", key: "reps", type: "text" }, { label: "TARGET RPE", key: "rpe", type: "number" }].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 3, ...mono }}>{f.label}</div>
                  <input type={f.type} value={ex[f.key] ?? ""} onChange={e => onUpdateEx({ ...ex, [f.key]: e.target.value })}
                    style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "5px 8px", fontSize: 12, width: "100%", outline: "none", ...mono }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 3, ...mono }}>CATEGORY</div>
                <select value={ex.category || ""} onChange={e => onUpdateEx({ ...ex, category: e.target.value })}
                  style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "5px 8px", fontSize: 12, width: "100%", outline: "none", ...mono }}>
                  {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 3, ...mono }}>PR WEIGHT (lbs)</div>
                <input type="number" value={ex.pr ?? ""} placeholder="e.g. 405" onChange={e => onUpdateEx({ ...ex, pr: e.target.value ? +e.target.value : null })}
                  style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "5px 8px", fontSize: 12, width: "100%", outline: "none", ...mono }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 3, ...mono }}>COACHING NOTE</div>
              <input value={ex.note ?? ""} onChange={e => onUpdateEx({ ...ex, note: e.target.value })} placeholder="Cue or note"
                style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "5px 8px", fontSize: 12, width: "100%", outline: "none", ...mono }} />
            </div>
            <div style={{ borderTop: `1px solid ${C.faint}`, paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#111", border: `1px solid ${C.accentDim}`, borderRadius: 5, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: C.accent, letterSpacing: 1, marginBottom: 4, ...mono }}>TODAY'S WORKING WEIGHT</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" value={logData?.workingWeight ?? ""} placeholder="lbs"
                      onChange={e => onUpdateLog({ ...logData, workingWeight: e.target.value === "" ? null : +e.target.value, sets: logData?.sets ?? [] })}
                      style={{ background: C.bg, border: `1px solid ${C.accentDim}`, borderRadius: 4, color: C.accent, padding: "6px 10px", fontSize: 18, fontWeight: 700, width: 100, outline: "none", textAlign: "center", ...mono }}
                      onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.accentDim} />
                    <span style={{ fontSize: 12, color: C.muted, ...mono }}>lbs</span>
                  </div>
                </div>
                {ex.pr && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 2, ...mono }}>PRE-LAYOFF PR</div>
                    <div style={{ fontSize: 16, color: C.muted, fontWeight: 700, ...mono }}>{ex.pr} lbs</div>
                    {logData?.workingWeight && <div style={{ fontSize: 9, color: C.accentDim, marginTop: 2, ...mono }}>{Math.round((logData.workingWeight / ex.pr) * 100)}% of PR</div>}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 8, ...mono }}>LOGGED SETS — WEEK {weekIdx + 1}</div>
              <SetLogger sets={sets} onChange={s => onUpdateLog({ ...logData, sets: s })} workingWeight={logData?.workingWeight} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Day Panel ────────────────────────────────────────────────────────────────
function DayPanel({ day, weekIdx, program, log, onUpdateProgram, onUpdateLog, allPRs }) {
  const exercises = program[weekIdx]?.[day.id] ?? [];
  const [adding, setAdding] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", sets: 3, reps: "8", rpe: "", category: "squat", note: "", pr: null });

  const updateExercise = (i, val) => { const exs = [...exercises]; exs[i] = val; onUpdateProgram(weekIdx, day.id, exs); };
  const removeExercise = (i) => onUpdateProgram(weekIdx, day.id, exercises.filter((_, j) => j !== i));
  const addExercise = () => {
    if (!newEx.name.trim()) return;
    onUpdateProgram(weekIdx, day.id, [...exercises, { ...newEx }]);
    setNewEx({ name: "", sets: 3, reps: "8", rpe: "", category: "squat", note: "", pr: null });
    setAdding(false);
  };

  const totalSets = exercises.reduce((s, e) => s + (+e.sets || 0), 0);
  const loggedCount = exercises.filter(e => (log[weekIdx]?.[day.id]?.[e.name]?.sets ?? []).some(s => s.weight && s.reps)).length;
  const allComplete = loggedCount === exercises.length && exercises.length > 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ ...serif, fontSize: 22, color: allComplete ? C.green : C.text }}>{day.label}</div>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: 1, marginTop: 2, ...mono }}>{day.focus}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.muted, ...mono }}>{day.env}</div>
          <div style={{ fontSize: 10, color: allComplete ? C.green : C.muted, marginTop: 2, ...mono }}>
            {loggedCount}/{exercises.length} logged · {totalSets} sets
          </div>
        </div>
      </div>

      {exercises.map((ex, i) => (
        <ExerciseCard key={`${ex.name}-${i}`} ex={ex} weekIdx={weekIdx} dayId={day.id}
          logData={log[weekIdx]?.[day.id]?.[ex.name]}
          onUpdateLog={d => onUpdateLog(weekIdx, day.id, ex.name, d)}
          onUpdateEx={v => updateExercise(i, v)}
          onRemove={() => removeExercise(i)}
          allPRs={allPRs}
        />
      ))}

      {adding ? (
        <div style={{ background: C.card, border: `1px solid ${C.accentDim}`, borderRadius: 6, padding: 14, marginTop: 8 }}>
          <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 10, ...mono }}>ADD EXERCISE</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><ExerciseInput value={newEx.name} onChange={v => setNewEx(p => ({ ...p, name: v }))} placeholder="Exercise name" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[{ label: "SETS", key: "sets", type: "number" }, { label: "REPS", key: "reps", type: "text" }, { label: "RPE", key: "rpe", type: "number" }, { label: "PR (lbs)", key: "pr", type: "number" }].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 3, letterSpacing: 1, ...mono }}>{f.label}</div>
                <input type={f.type} value={newEx[f.key] ?? ""} onChange={e => setNewEx(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "5px 8px", fontSize: 12, width: "100%", outline: "none", ...mono }} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 3, letterSpacing: 1, ...mono }}>CATEGORY</div>
              <select value={newEx.category} onChange={e => setNewEx(p => ({ ...p, category: e.target.value }))}
                style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "5px 8px", fontSize: 12, width: "100%", outline: "none", ...mono }}>
                {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 3, letterSpacing: 1, ...mono }}>NOTE</div>
              <input value={newEx.note} onChange={e => setNewEx(p => ({ ...p, note: e.target.value }))} placeholder="Cue"
                style={{ background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, padding: "5px 8px", fontSize: 12, width: "100%", outline: "none", ...mono }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addExercise} style={{ background: C.accent, border: "none", borderRadius: 4, color: "#000", padding: "7px 20px", cursor: "pointer", fontSize: 11, fontWeight: 700, ...mono }}>ADD</button>
            <button onClick={() => setAdding(false)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, padding: "7px 16px", cursor: "pointer", fontSize: 11, ...mono }}>CANCEL</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          background: "none", border: `1px dashed ${C.faint}`, borderRadius: 4,
          color: C.muted, cursor: "pointer", padding: "8px", fontSize: 10,
          width: "100%", letterSpacing: 1, marginTop: 4, transition: "all .15s", ...mono,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.faint; e.currentTarget.style.color = C.muted; }}>
          + ADD EXERCISE
        </button>
      )}
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────
function ProgressTab({ program, log }) {
  const [selectedEx, setSelectedEx] = useState(null);
  const [filter, setFilter] = useState("all");

  const allExercises = new Set();
  Object.values(program).forEach(week => Object.values(week).forEach(day => day.forEach(ex => allExercises.add(ex.name))));

  const weeklyVolume = Array.from({ length: 12 }, (_, wi) => {
    let count = 0;
    Object.values(log[wi] ?? {}).forEach(day => Object.values(day).forEach(exLog => {
      count += (exLog.sets ?? []).filter(s => s.weight && s.reps).length;
    }));
    return count;
  });

  const catDist = {};
  Object.values(log).forEach(week => Object.values(week).forEach(day => Object.keys(day).forEach(exName => {
    let cat = "accessory";
    Object.values(program).forEach(week => Object.values(week).forEach(day => day.forEach(ex => { if (ex.name === exName) cat = ex.category || "accessory"; })));
    const count = (day[exName]?.sets ?? []).filter(s => s.weight && s.reps).length;
    catDist[cat] = (catDist[cat] || 0) + count;
  })));

  const stats = Array.from(allExercises).map(name => {
    const weeklyMax = Array.from({ length: 12 }, (_, wi) => {
      const allSets = Object.values(log[wi] ?? {}).flatMap(day => (day[name]?.sets ?? []));
      const weights = allSets.map(s => +s.weight).filter(Boolean);
      return weights.length ? Math.max(...weights) : null;
    });
    const logged = weeklyMax.filter(Boolean);
    const gain = logged.length >= 2 ? logged.at(-1) - logged[0] : null;
    const bestEver = logged.length ? Math.max(...logged) : null;
    let pr = null, cat = "accessory";
    Object.values(program).forEach(week => Object.values(week).forEach(day => day.forEach(ex => {
      if (ex.name === name) { if (ex.pr) pr = ex.pr; if (ex.category) cat = ex.category; }
    })));
    return { name, weeklyMax, gain, bestEver, pr, cat, logged: logged.length };
  }).filter(s => s.logged > 0).sort((a, b) => b.logged - a.logged);

  const filtered = filter === "all" ? stats : stats.filter(s => s.cat === filter);
  const totalSetsLogged = weeklyVolume.reduce((a, b) => a + b, 0);
  const activeWeeks = weeklyVolume.filter(v => v > 0).length;
  const bestWeek = Math.max(...weeklyVolume, 0);

  return (
    <div>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...serif, fontSize: 22, color: C.text }}>Progress Overview</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 1, ...mono }}>12-WEEK CYCLE · STRENGTH & VOLUME TRACKING</div>
      </div>

      {/* Summary stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          { label: "TOTAL SETS", value: totalSetsLogged || "—", color: C.accent },
          { label: "ACTIVE WEEKS", value: activeWeeks || "—", color: C.blue },
          { label: "EXERCISES", value: stats.length || "—", color: C.green },
          { label: "PEAK WEEK", value: bestWeek > 0 ? `${bestWeek} sets` : "—", color: C.text },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color, ...mono }}>{value}</div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1, marginTop: 2, ...mono }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly volume */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 12, ...mono }}>WEEKLY VOLUME — TOTAL SETS LOGGED</div>
        <div style={{ overflowX: "auto" }}>
          <VolumeBar data={weeklyVolume} w={700} h={60} />
        </div>
      </div>

      {/* Category donut */}
      {Object.keys(catDist).length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 10, ...mono }}>SET DISTRIBUTION</div>
            <CategoryDonut data={catDist} size={100} />
          </div>
          <div style={{ flex: 1 }}>
            {Object.entries(catDist).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: CATEGORY_COLORS[cat] || C.muted, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, ...mono }}>{cat}</div>
                <div style={{ height: 4, borderRadius: 2, background: CATEGORY_COLORS[cat] || C.muted, width: `${Math.round((count / totalSetsLogged) * 100)}%`, minWidth: 4, maxWidth: 120 }} />
                <div style={{ fontSize: 10, color: C.text, ...mono, minWidth: 28, textAlign: "right" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={() => setFilter("all")} style={{
            background: filter === "all" ? C.accent : "none", border: `1px solid ${filter === "all" ? C.accent : C.border}`,
            borderRadius: 4, color: filter === "all" ? "#000" : C.muted,
            padding: "4px 10px", cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: 1, ...mono,
          }}>ALL</button>
          {Object.keys(CATEGORY_COLORS).filter(c => stats.some(s => s.cat === c)).map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{
              background: filter === c ? CATEGORY_COLORS[c] : "none", border: `1px solid ${filter === c ? CATEGORY_COLORS[c] : C.border}`,
              borderRadius: 4, color: filter === c ? "#000" : C.muted,
              padding: "4px 10px", cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", ...mono,
            }}>{c}</button>
          ))}
        </div>
      )}

      {stats.length === 0 && (
        <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "40px 0", ...mono }}>No logged sets yet. Start logging to see progress.</div>
      )}

      {filtered.map(s => {
        const isSelected = selectedEx === s.name;
        const catColor = CATEGORY_COLORS[s.cat] || C.muted;
        return (
          <div key={s.name} style={{
            background: C.card, border: `1px solid ${isSelected ? C.accentDim : C.border}`,
            borderLeft: `3px solid ${catColor}`, borderRadius: 6, marginBottom: 8,
            overflow: "hidden", cursor: "pointer", transition: "border .15s",
          }} onClick={() => setSelectedEx(isSelected ? null : s.name)}>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ ...serif, fontSize: 14, color: C.text, marginBottom: 4 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {s.bestEver && <span style={{ fontSize: 11, color: C.accent, ...mono }}>Best: {s.bestEver} lbs</span>}
                  {s.gain !== null && <span style={{ fontSize: 11, color: s.gain >= 0 ? C.green : C.red, ...mono }}>{s.gain >= 0 ? "+" : ""}{s.gain} lbs</span>}
                  {s.pr && <span style={{ fontSize: 10, color: C.muted, ...mono }}>PR: {s.pr} lbs</span>}
                  <span style={{ fontSize: 10, color: C.muted, ...mono }}>{s.logged} wks logged</span>
                </div>
              </div>
              <Sparkline data={s.weeklyMax} w={120} h={32} color={catColor} />
            </div>
            {isSelected && (
              <div style={{ padding: "0 16px 18px", borderTop: `1px solid ${C.faint}` }}>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, margin: "12px 0 10px", ...mono }}>MAX WEIGHT TREND — 12 WEEKS</div>
                <div style={{ overflowX: "auto" }}>
                  <AreaChart data={s.weeklyMax} w={680} h={80} color={catColor} label={s.name} />
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 22 }}>
                  {s.weeklyMax.map((v, i) => v && (
                    <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 9, ...mono }}>
                      <span style={{ color: C.muted }}>W{i + 1} </span>
                      <span style={{ color: catColor }}>{v} lbs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AI Updater ───────────────────────────────────────────────────────────────
function AIUpdater({ onApplyUpdate, currentProgram }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const SYSTEM = `You are a strength coach assistant for a 37-year-old male athlete (5'10", 190 lbs) in a 12-week reconditioning program after a 6-week shoulder layoff. Goals: longevity, functional stamina, body composition.

Program: program[weekIndex][dayId] = exercises[].
weekIndex 0–11. dayIds: "mon" (Lower-Strength), "tue" (Upper-Pull+Rehab), "thu" (Lower-Stamina), "sat" (Upper-Push+Pull).

Exercise fields: { name, sets (number), reps (string), rpe (number|null), category, note, pr (number|null) }
Categories: hinge, squat, pull, push, carry, rehab, core, accessory, cardio

Shoulder constraint: Week 1–2 pressing = Landmine Press only. DB Floor Press allowed Week 3+. Incline DB Press Week 4+. Flat bench Week 5+ only if pain-free.

Respond ONLY with valid JSON:
{
  "action": "update_program",
  "description": "Brief description of what changed and why",
  "changes": [{ "week": 0, "day": "mon", "exercises": [...full array...] }]
}

Never change log data. No text outside JSON. If request conflicts with shoulder safety, adapt safely and explain in description.`;

  const run = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM,
          messages: [{ role: "user", content: `Current program:\n${JSON.stringify(currentProgram, null, 2)}\n\nRequest: ${prompt}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text ?? "";
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setError("Parse error — try rephrasing.");
    }
    setLoading(false);
  };

  const apply = () => {
    if (!result?.changes?.length) return;
    onApplyUpdate(result.changes);
    setResult(null); setPrompt("");
  };

  return (
    <div>
      <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...serif, fontSize: 22, color: C.text }}>AI Program Update</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: 1, ...mono }}>SHOULDER-AWARE · CONTEXT-INFORMED · PREVIEWS BEFORE APPLYING</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>EXAMPLE REQUESTS</div>
        {[
          "Propagate Week 1 into Weeks 2–4 with 5% weekly load increases",
          "Replace Thursday Week 3 ruck with gym Option B",
          "Add hip thrust to Monday Week 2 as hinge, 3×10 @ RPE 7",
          "Advance pressing to DB floor press starting Week 3 Saturday",
          "Deload Week 6 — reduce all volume by 40%",
        ].map(ex => (
          <button key={ex} onClick={() => setPrompt(ex)} style={{
            background: "none", border: `1px solid ${C.faint}`, borderRadius: 3,
            color: C.muted, cursor: "pointer", padding: "4px 10px", fontSize: 10,
            marginRight: 6, marginBottom: 6, transition: "all .15s", ...mono,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.faint; e.currentTarget.style.color = C.muted; }}>
            {ex}
          </button>
        ))}
      </div>

      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the program change you want..." rows={3}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, padding: "10px 12px", fontSize: 13, width: "100%", outline: "none", resize: "vertical", ...mono, marginBottom: 10 }}
        onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />

      <button onClick={run} disabled={loading || !prompt.trim()} style={{
        background: loading ? C.accentDim : C.accent, border: "none", borderRadius: 4,
        color: "#000", padding: "9px 24px", cursor: loading ? "wait" : "pointer",
        fontSize: 12, fontWeight: 700, letterSpacing: 1, transition: "all .15s", ...mono,
        opacity: !prompt.trim() ? 0.5 : 1,
      }}>{loading ? "THINKING..." : "GENERATE CHANGES"}</button>

      {error && <div style={{ marginTop: 12, color: C.red, fontSize: 12, ...mono }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 16, background: C.card, border: `1px solid ${C.accentDim}`, borderRadius: 6, padding: 16 }}>
          <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 8, ...mono }}>PREVIEW</div>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 12, lineHeight: 1.6 }}>{result.description}</div>
          {result.changes?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {result.changes.map((c, i) => (
                <div key={i} style={{ background: "#0F0F0F", borderRadius: 4, padding: "8px 12px", marginBottom: 6, fontSize: 11, color: C.muted, ...mono }}>
                  <span style={{ color: C.accent }}>Week {c.week + 1} · {c.day.toUpperCase()}</span>
                  {" — "}{c.exercises?.length} exercises
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {result.changes?.length > 0 && (
              <button onClick={apply} style={{ background: C.accent, border: "none", borderRadius: 4, color: "#000", padding: "8px 20px", cursor: "pointer", fontSize: 11, fontWeight: 700, ...mono }}>APPLY CHANGES</button>
            )}
            <button onClick={() => setResult(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, padding: "8px 16px", cursor: "pointer", fontSize: 11, ...mono }}>DISCARD</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Program Builder ─────────────────────────────────────────────────────────

// Day configurations by split type and count
function buildDays(split, dayCount, environment) {
  const hasOutdoor = environment === "outdoor" || environment === "mix";
  const hasGym = environment === "gym" || environment === "mix";

  if (split === "upper_lower") {
    const maps = {
      3: [
        { id: "mon", label: "Monday",    focus: "Lower — Strength",     env: hasGym ? "Gym" : "Outdoor" },
        { id: "wed", label: "Wednesday", focus: "Upper — Push + Pull",  env: "Gym" },
        { id: "fri", label: "Friday",    focus: "Lower — Stamina",      env: hasOutdoor ? "Outdoor" : "Gym" },
      ],
      4: [
        { id: "mon", label: "Monday",    focus: "Lower — Strength",        env: "Gym" },
        { id: "tue", label: "Tuesday",   focus: "Upper — Pull + Rehab",    env: "Gym" },
        { id: "thu", label: "Thursday",  focus: "Lower — Stamina / Carry", env: hasOutdoor ? "Outdoor" : "Gym" },
        { id: "sat", label: "Saturday",  focus: "Upper — Push + Pull",     env: "Gym" },
      ],
      5: [
        { id: "mon", label: "Monday",    focus: "Lower — Strength",     env: "Gym" },
        { id: "tue", label: "Tuesday",   focus: "Upper — Pull",         env: "Gym" },
        { id: "wed", label: "Wednesday", focus: "Conditioning / Carry", env: hasOutdoor ? "Outdoor" : "Gym" },
        { id: "fri", label: "Friday",    focus: "Lower — Volume",       env: "Gym" },
        { id: "sat", label: "Saturday",  focus: "Upper — Push",         env: "Gym" },
      ],
    };
    return maps[Math.min(dayCount, 5)] || maps[4];
  }

  if (split === "ppl") {
    const maps = {
      3: [
        { id: "mon", label: "Monday",    focus: "Push",  env: "Gym" },
        { id: "wed", label: "Wednesday", focus: "Pull",  env: "Gym" },
        { id: "fri", label: "Friday",    focus: "Legs",  env: "Gym" },
      ],
      4: [
        { id: "mon", label: "Monday",    focus: "Push",       env: "Gym" },
        { id: "tue", label: "Tuesday",   focus: "Pull",       env: "Gym" },
        { id: "thu", label: "Thursday",  focus: "Legs",       env: hasOutdoor ? "Outdoor" : "Gym" },
        { id: "sat", label: "Saturday",  focus: "Push + Pull", env: "Gym" },
      ],
      6: [
        { id: "mon", label: "Monday",    focus: "Push",  env: "Gym" },
        { id: "tue", label: "Tuesday",   focus: "Pull",  env: "Gym" },
        { id: "wed", label: "Wednesday", focus: "Legs",  env: "Gym" },
        { id: "thu", label: "Thursday",  focus: "Push",  env: "Gym" },
        { id: "fri", label: "Friday",    focus: "Pull",  env: "Gym" },
        { id: "sat", label: "Saturday",  focus: "Legs",  env: hasOutdoor ? "Outdoor" : "Gym" },
      ],
    };
    return maps[dayCount] || maps[3];
  }

  if (split === "fullbody") {
    const maps = {
      3: [
        { id: "mon", label: "Monday",    focus: "Full Body — Strength",    env: "Gym" },
        { id: "wed", label: "Wednesday", focus: "Full Body — Hypertrophy", env: "Gym" },
        { id: "fri", label: "Friday",    focus: "Full Body — Stamina",     env: hasOutdoor ? "Outdoor" : "Gym" },
      ],
      4: [
        { id: "mon", label: "Monday",    focus: "Full Body A",    env: "Gym" },
        { id: "wed", label: "Wednesday", focus: "Full Body B",    env: "Gym" },
        { id: "fri", label: "Friday",    focus: "Full Body A",    env: "Gym" },
        { id: "sat", label: "Saturday",  focus: "Conditioning",   env: hasOutdoor ? "Outdoor" : "Gym" },
      ],
    };
    return maps[Math.min(dayCount, 4)] || maps[3];
  }

  if (split === "conventional") {
    return [
      { id: "mon", label: "Monday",    focus: "Chest + Triceps",     env: "Gym" },
      { id: "tue", label: "Tuesday",   focus: "Back + Biceps",       env: "Gym" },
      { id: "thu", label: "Thursday",  focus: "Legs",                env: hasOutdoor ? "Outdoor" : "Gym" },
      { id: "sat", label: "Saturday",  focus: "Shoulders + Arms",    env: "Gym" },
    ];
  }

  // Default fallback
  return [
    { id: "mon", label: "Monday",   focus: "Lower — Strength",        env: "Gym" },
    { id: "tue", label: "Tuesday",  focus: "Upper — Pull + Rehab",    env: "Gym" },
    { id: "thu", label: "Thursday", focus: "Lower — Stamina / Carry", env: hasOutdoor ? "Outdoor" : "Gym" },
    { id: "sat", label: "Saturday", focus: "Upper — Push + Pull",     env: "Gym" },
  ];
}

// Exercise substitution by equipment
function subForEquipment(exercise, equipment) {
  if (equipment === "full" || equipment === "barbell") return exercise;
  const subs = {
    "Back Squat":            { dumbbells: "Goblet Squat",          bodyweight: "Bodyweight Squat",   kettlebells: "Goblet Squat" },
    "Barbell Row":           { dumbbells: "Single-Arm DB Row",     bodyweight: "Bodyweight Row",     kettlebells: "Kettlebell Clean" },
    "Bench Press":           { dumbbells: "Incline DB Press",      bodyweight: "Push-Up",            kettlebells: "Kettlebell Press" },
    "Trap Bar Deadlift":     { dumbbells: "Romanian Deadlift",     bodyweight: "Single-Leg RDL",     kettlebells: "Kettlebell Swing" },
    "Conventional Deadlift": { dumbbells: "Romanian Deadlift",     bodyweight: "Single-Leg RDL",     kettlebells: "Kettlebell Swing" },
    "Overhead Press":        { dumbbells: "DB Shoulder Press",     bodyweight: "Pike Push-Up",       kettlebells: "Kettlebell Press" },
    "Trap Bar Farmer's Carry":{ dumbbells: "Suitcase Carry",       bodyweight: "Loaded Pack Walk",   kettlebells: "Suitcase Carry" },
    "Lat Pulldown":          { dumbbells: "Pull-Up",               bodyweight: "Pull-Up",            kettlebells: "Pull-Up" },
  };
  return subs[exercise]?.[equipment] || exercise;
}

// Upper body limitation modifications
function applyUpperLimitation(exercises, limitationType) {
  return exercises.map(e => {
    if (e.category !== "push") return e;
    if (limitationType === "upper_pain") {
      return { ...e, name: "Push-Up", sets: Math.min(e.sets, 3), reps: "10–15", rpe: 6, note: "Pain-free range only. Stop at any discomfort. No overhead loading.", pr: null };
    }
    if (limitationType === "upper_cautious") {
      if (e.name === "Neutral-Grip DB Press" || e.name === "Bench Press") return null;
      if (e.name === "DB Shoulder Press") return { ...e, name: "Landmine Press", note: "Shoulder-friendly arc. Conservative load." };
      return e;
    }
    return e;
  }).filter(Boolean);
}

// Lower body limitation modifications
function applyLowerLimitation(exercises, limitationType) {
  return exercises.map(e => {
    if (limitationType === "lower_pain") {
      if (e.category === "squat") return { ...e, name: "Seated Leg Press", sets: Math.min(e.sets, 3), rpe: 6, note: "Pain-free range only. No deep flexion if uncomfortable." };
      if (e.category === "hinge" && (e.name.includes("Deadlift") || e.name === "Trap Bar Deadlift")) {
        return { ...e, name: "Glute Bridge", sets: Math.min(e.sets, 3), reps: "15", rpe: 6, note: "Hinge pattern without spinal load. Build from here.", pr: null };
      }
    }
    if (limitationType === "lower_cautious") {
      if (e.name === "Bulgarian Split Squat") return { ...e, name: "Step-Up", note: "Controlled. Drive through heel. Sub for split squat while rehabbing." };
      if (e.rpe && e.rpe >= 8 && e.category === "hinge") return { ...e, rpe: 7, sets: Math.max(e.sets - 1, 2), note: (e.note || "") + " Reduced intensity — lower body caution." };
    }
    return e;
  }).filter(Boolean);
}

function buildProgram(answers) {
  const { split, dayCount, environment, equipment, limitation, primaryGoal, layoffWeeks, dlPR } = answers;

  const days = buildDays(split, dayCount, environment);
  const hasOutdoor = environment === "outdoor" || environment === "mix";
  const hasBarbell = equipment === "full" || equipment === "barbell";

  // ── Build day programs based on split ──
  const prog = {};

  // Helper: reduce volume if long layoff
  const volMod = (sets) => layoffWeeks >= 8 ? Math.max(2, sets - 1) : sets;

  // ── UPPER/LOWER split (default) ──
  if (split === "upper_lower") {
    // Lower Strength day
    const lowerStrength = [
      { name: hasBarbell ? "Trap Bar Deadlift" : "Romanian Deadlift", sets: volMod(4), reps: "4–5", rpe: 8, note: "Neutral spine. Reset between reps.", category: "hinge", pr: dlPR ? +dlPR : undefined },
      { name: "Goblet Squat",            sets: volMod(3), reps: "8",    rpe: 7, note: "Pause 1s at bottom.", category: "squat" },
      { name: "Romanian Deadlift",       sets: volMod(3), reps: "10",   rpe: 7, note: "3s eccentric. Hinge from hip.", category: "hinge" },
      { name: hasBarbell ? "Trap Bar Farmer's Carry" : "Suitcase Carry", sets: 3, reps: "40yd", rpe: null, note: "Tall posture. 90s rest.", category: "carry" },
      { name: "Copenhagen Plank",        sets: 2, reps: "25s", rpe: null, note: "Per side.", category: "core" },
      { name: "Dead Bug",                sets: 2, reps: "8",   rpe: null, note: "Per side. Lumbar on floor.", category: "core" },
    ];

    // Upper Pull day
    const upperPull = [
      { name: "Chest-Supported DB Row",  sets: volMod(4), reps: "10–12", rpe: 7, note: "Scapular retraction at top.", category: "pull" },
      { name: equipment === "bodyweight" ? "Pull-Up" : "Neutral-Grip Pull-Up", sets: volMod(3), reps: "8–10", rpe: 7, note: "Full hang at bottom.", category: "pull" },
      { name: "Face Pull",               sets: volMod(3), reps: "15",    rpe: 6, note: "External rotation at end range.", category: "rehab" },
      { name: "Single-Arm DB Row",       sets: volMod(3), reps: "10",    rpe: 7, note: "Per side.", category: "pull" },
      { name: "Band External Rotation",  sets: 2, reps: "15–20", rpe: null, note: "Per side. Motor re-patterning.", category: "rehab" },
      { name: "Bicep Curl",              sets: 2, reps: "12",   rpe: 6, note: "Neutral or supinated grip.", category: "accessory" },
    ];

    // Lower Stamina day
    const lowerStamina = hasOutdoor ? [
      { name: "Weighted Ruck",         sets: 1, reps: "35min", rpe: null, note: "30–40 lbs. Nasal breathing only.", category: "cardio" },
      { name: "Bulgarian Split Squat", sets: volMod(3), reps: "8",  rpe: 7, note: "Per leg. Post-ruck.", category: "squat" },
      { name: equipment === "kettlebells" || equipment === "bodyweight" ? "Kettlebell Swing" : "Kettlebell Swing", sets: volMod(4), reps: "15", rpe: 7, note: "Hip drive, not squat.", category: "hinge" },
    ] : [
      { name: hasBarbell ? "High Bar Back Squat" : "Goblet Squat", sets: volMod(4), reps: "5", rpe: 7, note: "Upright torso. Depth where pelvis stays neutral.", category: "squat" },
      { name: "Walking Lunge",         sets: volMod(3), reps: "12", rpe: 7, note: "Per leg. Controlled.", category: "squat" },
      { name: hasBarbell ? "Trap Bar Farmer's Carry" : "Suitcase Carry", sets: 4, reps: "40yd", rpe: null, note: "Heavy. Grip, posture, pace.", category: "carry" },
      { name: "Step-Up",               sets: volMod(3), reps: "10", rpe: 7, note: "Per leg. Drive through heel.", category: "squat" },
    ];

    // Upper Push day
    const upperPush = (() => {
      const pressExercise = equipment === "bodyweight"
        ? { name: "Push-Up", sets: volMod(4), reps: "15–20", rpe: 7, note: "Controlled eccentric. Chest to floor.", category: "push" }
        : { name: "Landmine Press", sets: volMod(4), reps: "10", rpe: 7, note: "Shoulder-friendly arc. Control descent.", category: "push" };
      return [
        pressExercise,
        { name: "Chest-Supported DB Row", sets: volMod(3), reps: "12", rpe: 7, note: "Balance press volume.", category: "pull" },
        ...(equipment !== "bodyweight" ? [{ name: "Neutral-Grip DB Press", sets: volMod(2), reps: "12", rpe: 6, note: "Neutral grip only.", category: "push" }] : []),
        { name: "Band Pull-Apart",        sets: 3, reps: "20",  rpe: null, note: "Every press session.", category: "rehab" },
        { name: "Tricep Overhead Ext.",   sets: 2, reps: "15",  rpe: 6, note: "Long head. Controlled eccentric.", category: "accessory" },
        { name: "Hammer Curl",            sets: 2, reps: "12",  rpe: 6, note: "Brachialis focus.", category: "accessory" },
        { name: "Face Pull",              sets: 2, reps: "15",  rpe: 6, note: "Shoulder insurance.", category: "rehab" },
      ];
    })();

    // Assign to days
    const dayPrograms = [lowerStrength, upperPull, lowerStamina, upperPush];
    days.forEach((d, i) => { prog[d.id] = dayPrograms[i % dayPrograms.length]; });

    // 5-day: add a volume lower and a push day
    if (dayCount >= 5 && days[4]) {
      prog[days[4].id] = upperPush.map(e => ({ ...e, sets: Math.max(2, e.sets - 1) }));
    }
  }

  // ── PUSH / PULL / LEGS ──
  else if (split === "ppl") {
    const push = [
      { name: equipment === "bodyweight" ? "Push-Up" : (hasBarbell ? "Bench Press" : "Incline DB Press"), sets: volMod(4), reps: hasBarbell ? "5" : "10", rpe: 8, note: hasBarbell ? "Controlled descent. Full range." : "Controlled eccentric. Chest stretch at bottom.", category: "push" },
      { name: "Landmine Press",          sets: volMod(3), reps: "10", rpe: 7, note: "Shoulder-friendly. Good warmup for pressing.", category: "push" },
      { name: equipment === "bodyweight" ? "Pike Push-Up" : "DB Shoulder Press", sets: volMod(3), reps: "12", rpe: 7, note: "Overhead strength. Control descent.", category: "push" },
      { name: "Lateral Raise",           sets: 3, reps: "15", rpe: 6, note: "Light. Medial delt focus.", category: "accessory" },
      { name: "Tricep Overhead Ext.",    sets: 3, reps: "15", rpe: 6, note: "Long head stretch.", category: "accessory" },
      { name: "Band Pull-Apart",         sets: 3, reps: "20", rpe: null, note: "Every press session.", category: "rehab" },
    ];

    const pull = [
      { name: equipment === "bodyweight" ? "Pull-Up" : "Neutral-Grip Pull-Up", sets: volMod(4), reps: "8–10", rpe: 7, note: "Full hang. Scapular depression at top.", category: "pull" },
      { name: "Chest-Supported DB Row",  sets: volMod(4), reps: "10–12", rpe: 7, note: "Retract scapula. Pause at top.", category: "pull" },
      { name: "Single-Arm DB Row",       sets: volMod(3), reps: "10",    rpe: 7, note: "Per side. Full stretch at bottom.", category: "pull" },
      { name: "Face Pull",               sets: 3, reps: "15", rpe: 6, note: "External rotation. High pull.", category: "rehab" },
      { name: "Bicep Curl",              sets: 3, reps: "12", rpe: 6, note: "Full supination at top.", category: "accessory" },
      { name: "Hammer Curl",             sets: 2, reps: "12", rpe: 6, note: "Brachialis focus.", category: "accessory" },
    ];

    const legs = [
      { name: hasBarbell ? "Back Squat" : "Goblet Squat", sets: volMod(4), reps: hasBarbell ? "5" : "8", rpe: 8, note: hasBarbell ? "High bar. Depth where pelvis stays neutral." : "Pause 1s at bottom. Upright torso.", category: "squat", pr: undefined },
      { name: hasBarbell ? "Romanian Deadlift" : "Single-Leg RDL", sets: volMod(3), reps: "8–10", rpe: 7, note: "3s eccentric. Hip hinge pattern.", category: "hinge" },
      { name: "Bulgarian Split Squat",   sets: volMod(3), reps: "8",   rpe: 7, note: "Per leg. Rear foot elevated.", category: "squat" },
      { name: hasOutdoor ? "Weighted Ruck" : (hasBarbell ? "Trap Bar Farmer's Carry" : "Suitcase Carry"), sets: hasOutdoor ? 1 : 3, reps: hasOutdoor ? "30min" : "40yd", rpe: null, note: hasOutdoor ? "Nasal breathing." : "Tall posture. Heavy.", category: hasOutdoor ? "cardio" : "carry" },
      { name: "Dead Bug",                sets: 2, reps: "8", rpe: null, note: "Per side. Lumbar on floor.", category: "core" },
    ];

    days.forEach((d, i) => {
      const cycle = [push, pull, legs];
      prog[d.id] = cycle[i % 3];
    });
  }

  // ── FULL BODY ──
  else if (split === "fullbody") {
    const fbA = [
      { name: hasBarbell ? "Trap Bar Deadlift" : "Romanian Deadlift", sets: volMod(4), reps: "5", rpe: 8, note: "Primary hinge. Reset between reps.", category: "hinge", pr: dlPR ? +dlPR : undefined },
      { name: equipment === "bodyweight" ? "Push-Up" : "Landmine Press", sets: volMod(3), reps: "10", rpe: 7, note: "Horizontal push.", category: "push" },
      { name: equipment === "bodyweight" ? "Pull-Up" : "Chest-Supported DB Row", sets: volMod(3), reps: "10", rpe: 7, note: "Horizontal pull.", category: "pull" },
      { name: "Goblet Squat",            sets: volMod(3), reps: "8", rpe: 7, note: "Pause at bottom.", category: "squat" },
      { name: "Dead Bug",                sets: 2, reps: "8", rpe: null, note: "Core stability.", category: "core" },
    ];

    const fbB = [
      { name: hasBarbell ? "Back Squat" : "Bulgarian Split Squat", sets: volMod(4), reps: hasBarbell ? "5" : "8", rpe: 8, note: "Primary squat.", category: "squat" },
      { name: equipment === "bodyweight" ? "Pike Push-Up" : "DB Shoulder Press", sets: volMod(3), reps: "10", rpe: 7, note: "Vertical push.", category: "push" },
      { name: "Neutral-Grip Pull-Up",    sets: volMod(3), reps: "8–10", rpe: 7, note: "Vertical pull.", category: "pull" },
      { name: hasBarbell ? "Romanian Deadlift" : "Kettlebell Swing", sets: volMod(3), reps: "10", rpe: 7, note: "Hip hinge.", category: "hinge" },
      { name: "Copenhagen Plank",        sets: 2, reps: "25s", rpe: null, note: "Per side.", category: "core" },
    ];

    const conditioning = hasOutdoor ? [
      { name: "Weighted Ruck",         sets: 1, reps: "35min", rpe: null, note: "30–40 lbs. Nasal breathing.", category: "cardio" },
      { name: "Kettlebell Swing",       sets: 4, reps: "15",   rpe: 7, note: "Hip drive.", category: "hinge" },
      { name: "Walking Lunge",          sets: 3, reps: "12",   rpe: 7, note: "Per leg.", category: "squat" },
    ] : [
      { name: hasBarbell ? "Trap Bar Farmer's Carry" : "Suitcase Carry", sets: 4, reps: "40yd", rpe: null, note: "Heavy. Grip and posture.", category: "carry" },
      { name: "Kettlebell Swing",       sets: 4, reps: "15",   rpe: 7, note: "Hip drive.", category: "hinge" },
      { name: "Step-Up",                sets: 3, reps: "10",   rpe: 7, note: "Per leg.", category: "squat" },
    ];

    days.forEach((d, i) => {
      const cycle = [fbA, fbB, conditioning, fbA];
      prog[d.id] = cycle[i % cycle.length];
    });
  }

  // ── CONVENTIONAL (bro split) ──
  else if (split === "conventional") {
    const chest = [
      { name: hasBarbell ? "Bench Press" : "Incline DB Press", sets: volMod(4), reps: hasBarbell ? "5" : "10", rpe: 8, note: "Primary chest movement.", category: "push" },
      { name: "Incline DB Press",        sets: volMod(3), reps: "12", rpe: 7, note: "Stretch at bottom.", category: "push" },
      { name: equipment === "bodyweight" ? "Push-Up" : "DB Fly", sets: volMod(3), reps: "15", rpe: 6, note: "Isolation. Full stretch.", category: "push" },
      { name: "Band Pull-Apart",         sets: 3, reps: "20", rpe: null, note: "Shoulder health.", category: "rehab" },
      { name: "Tricep Pushdown",         sets: 3, reps: "15", rpe: 6, note: "Lockout at bottom.", category: "accessory" },
      { name: "Tricep Overhead Ext.",    sets: 3, reps: "15", rpe: 6, note: "Long head stretch.", category: "accessory" },
    ];

    const back = [
      { name: equipment === "bodyweight" ? "Pull-Up" : "Neutral-Grip Pull-Up", sets: volMod(4), reps: "8–10", rpe: 7, note: "Full hang.", category: "pull" },
      { name: "Chest-Supported DB Row",  sets: volMod(4), reps: "10–12", rpe: 7, note: "Retract scapula.", category: "pull" },
      { name: hasBarbell ? "Barbell Row" : "Single-Arm DB Row", sets: volMod(3), reps: "10", rpe: 7, note: "Full range.", category: "pull" },
      { name: "Face Pull",               sets: 3, reps: "15", rpe: 6, note: "External rotation.", category: "rehab" },
      { name: "Bicep Curl",              sets: 3, reps: "12", rpe: 6, note: "Full supination.", category: "accessory" },
      { name: "Hammer Curl",             sets: 3, reps: "12", rpe: 6, note: "Brachialis.", category: "accessory" },
    ];

    const legs = [
      { name: hasBarbell ? "Back Squat" : "Goblet Squat", sets: volMod(4), reps: hasBarbell ? "5" : "8", rpe: 8, note: "Primary squat.", category: "squat", pr: undefined },
      { name: hasBarbell ? "Romanian Deadlift" : "Single-Leg RDL", sets: volMod(3), reps: "8–10", rpe: 7, note: "Hip hinge.", category: "hinge" },
      { name: "Bulgarian Split Squat",   sets: volMod(3), reps: "8", rpe: 7, note: "Per leg.", category: "squat" },
      { name: hasOutdoor ? "Weighted Ruck" : (hasBarbell ? "Trap Bar Farmer's Carry" : "Suitcase Carry"), sets: hasOutdoor ? 1 : 3, reps: hasOutdoor ? "30min" : "40yd", rpe: null, note: hasOutdoor ? "Nasal breathing." : "Grip and posture.", category: hasOutdoor ? "cardio" : "carry" },
      { name: "Nordic Curl",             sets: 2, reps: "5", rpe: 8, note: "Eccentric only if needed. Hamstring strength.", category: "accessory" },
    ];

    const shoulders = [
      { name: equipment === "bodyweight" ? "Pike Push-Up" : "DB Shoulder Press", sets: volMod(4), reps: "10", rpe: 7, note: "Vertical press.", category: "push" },
      { name: "Landmine Press",          sets: volMod(3), reps: "12", rpe: 7, note: "Shoulder-friendly arc.", category: "push" },
      { name: "Lateral Raise",           sets: 4, reps: "15", rpe: 6, note: "Light. Medial delt.", category: "accessory" },
      { name: "Face Pull",               sets: 3, reps: "15", rpe: 6, note: "Rear delt and cuff.", category: "rehab" },
      { name: "Bicep Curl",              sets: 3, reps: "12", rpe: 6, note: "Supinating curl.", category: "accessory" },
      { name: "Tricep Pushdown",         sets: 3, reps: "15", rpe: 6, note: "Cable or band.", category: "accessory" },
    ];

    const dayMap = [chest, back, legs, shoulders];
    days.forEach((d, i) => { prog[d.id] = dayMap[i % dayMap.length]; });
  }

  // ── Apply limitation modifications ──
  if (limitation === "upper_pain" || limitation === "upper_cautious") {
    Object.keys(prog).forEach(dayId => {
      prog[dayId] = applyUpperLimitation(prog[dayId], limitation);
    });
  }
  if (limitation === "lower_pain" || limitation === "lower_cautious") {
    Object.keys(prog).forEach(dayId => {
      prog[dayId] = applyLowerLimitation(prog[dayId], limitation);
    });
  }
  if (limitation === "both_pain") {
    Object.keys(prog).forEach(dayId => {
      prog[dayId] = applyUpperLimitation(applyLowerLimitation(prog[dayId], "lower_pain"), "upper_pain");
    });
  }

  // ── Primary goal fine-tuning ──
  if (primaryGoal === "strength") {
    Object.keys(prog).forEach(dayId => {
      prog[dayId] = prog[dayId].map(e =>
        (e.category === "hinge" || e.category === "squat") && e.rpe >= 7
          ? { ...e, sets: Math.min(e.sets + 1, 5), rpe: Math.min(e.rpe + 0.5, 9) }
          : e
      );
    });
  }
  if (primaryGoal === "stamina") {
    Object.keys(prog).forEach(dayId => {
      prog[dayId] = prog[dayId].map(e =>
        e.category === "carry" || e.category === "cardio"
          ? { ...e, sets: Math.min((e.sets || 1) + 1, 5) }
          : e
      );
    });
  }
  if (primaryGoal === "body") {
    Object.keys(prog).forEach(dayId => {
      prog[dayId] = prog[dayId].map(e =>
        e.rpe && e.rpe < 8 ? { ...e, reps: typeof e.reps === "string" && !e.reps.includes("–") ? `${e.reps}–${+e.reps + 4}` : e.reps } : e
      );
    });
  }

  return { program: { 0: prog }, days };
}

// ─── Onboarding Wizard ────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  "welcome", "goals", "split", "days", "environment", "equipment", "limitation", "baselines", "summary"
];

function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    name: "",
    primaryGoal: "longevity",
    split: "upper_lower",
    dayCount: 4,
    environment: "mix",
    equipment: "full",
    limitation: "none",
    layoffWeeks: 6,
    dlPR: "",
    squatPR: "",
    bodyweight: "",
  });

  const update = (key, val) => setAnswers(p => ({ ...p, [key]: val }));
  const stepName = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const totalSteps = ONBOARDING_STEPS.length - 2; // exclude welcome and summary

  const next = () => setStep(s => Math.min(s + 1, ONBOARDING_STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const finish = () => {
    const { program, days } = buildProgram(answers);
    onComplete(program, days, answers);
  };

  const SelectCard = ({ selected, onClick, children, color }) => (
    <div onClick={onClick} style={{
      border: `1px solid ${selected ? (color || C.accent) : C.border}`,
      borderLeft: `3px solid ${selected ? (color || C.accent) : C.border}`,
      borderRadius: 6, padding: "12px 16px", cursor: "pointer",
      background: selected ? `${(color || C.accent)}12` : C.card,
      transition: "all .15s", marginBottom: 8,
    }}>
      {children}
    </div>
  );

  const stepContent = () => {
    switch (stepName) {

      case "welcome": return (
        <div>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: 3, marginBottom: 12, ...mono }}>PERFORMANCE & LONGEVITY</div>
          <div style={{ ...serif, fontSize: 32, color: C.text, marginBottom: 8, lineHeight: 1.2 }}>Build your program.</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>
            A few questions to generate a Week 1 training plan built around your goals, schedule, equipment, and any current limitations. Takes about 90 seconds.
          </div>
          <div style={{ borderTop: `1px solid ${C.faint}`, paddingTop: 20, marginBottom: 24 }}>
            {[
              ["Program split tailored to your goals", C.accent],
              ["Equipment-aware exercise selection", C.blue],
              ["Limitation-safe modifications built in", C.green],
              ["Indoor, outdoor, or mixed sessions", "#A07EC8"],
            ].map(([text, col]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.muted, ...mono }}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>YOUR NAME (optional)</div>
          <input value={answers.name} onChange={e => update("name", e.target.value)} placeholder="First name"
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, padding: "10px 14px", fontSize: 14, outline: "none", width: "100%", ...mono }}
            onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
      );

      case "goals": return (
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 10, ...mono }}>STEP 1 OF {totalSteps}</div>
          <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>What's the primary driver?</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>Shapes intensity, volume, and exercise priority across the 12-week cycle.</div>
          {[
            { val: "longevity", label: "Longevity & Healthspan",   desc: "Train to move well for decades. Load serves function.", color: C.green },
            { val: "strength",  label: "Strength & Performance",   desc: "Build or rebuild max strength. Volume follows load.", color: C.accent },
            { val: "stamina",   label: "Stamina & Work Capacity",  desc: "Functional endurance — far under load. Carries anchor the week.", color: C.blue },
            { val: "body",      label: "Body Composition",         desc: "Lean and functional. Strength training as the metabolic engine.", color: "#C87E96" },
          ].map(({ val, label, desc, color }) => (
            <SelectCard key={val} selected={answers.primaryGoal === val} onClick={() => update("primaryGoal", val)} color={color}>
              <div style={{ fontSize: 13, color: answers.primaryGoal === val ? C.text : C.muted, fontWeight: 600, marginBottom: 3, ...mono }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </SelectCard>
          ))}
        </div>
      );

      case "split": return (
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 10, ...mono }}>STEP 2 OF {totalSteps}</div>
          <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>Program structure?</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>How do you want to organize your training across the week?</div>
          {[
            { val: "upper_lower", label: "Upper / Lower Split",       desc: "Alternate upper and lower body days. Best balance of frequency and recovery. Recommended for most goals.", color: C.accent },
            { val: "ppl",         label: "Push / Pull / Legs",        desc: "Dedicated push, pull, and leg days. High volume per movement pattern. Great for hypertrophy and strength.", color: C.blue },
            { val: "fullbody",    label: "Full Body",                  desc: "Hit all major patterns every session. Best for 3-day schedules and general fitness.", color: C.green },
            { val: "conventional",label: "Conventional Split",         desc: "Classic chest/back/legs/shoulders approach. Familiar structure with dedicated muscle-group days.", color: "#A07EC8" },
          ].map(({ val, label, desc, color }) => (
            <SelectCard key={val} selected={answers.split === val} onClick={() => update("split", val)} color={color}>
              <div style={{ fontSize: 13, color: answers.split === val ? C.text : C.muted, fontWeight: 600, marginBottom: 3, ...mono }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </SelectCard>
          ))}
        </div>
      );

      case "days": return (
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 10, ...mono }}>STEP 3 OF {totalSteps}</div>
          <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>Training days per week?</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>
            How many days can you realistically commit to every week? Recovery is part of the program.
          </div>
          {[
            { val: 3, label: "3 days",  desc: "Solid foundation. Full recovery between sessions. Best for beginners or high-stress weeks." },
            { val: 4, label: "4 days",  desc: "Optimal for most people. Enough frequency and volume without outrunning recovery." },
            { val: 5, label: "5 days",  desc: "Higher volume. Requires solid sleep and nutrition. Good for advanced trainees." },
            { val: 6, label: "6 days",  desc: "PPL double-run or high-frequency split. Only if recovery is dialed in." },
          ].filter(({ val }) => {
            if (answers.split === "fullbody" && val > 4) return false;
            if (answers.split === "conventional" && val !== 4) return false;
            if (answers.split === "upper_lower" && val > 5) return false;
            return true;
          }).map(({ val, label, desc }) => (
            <SelectCard key={val} selected={answers.dayCount === val} onClick={() => update("dayCount", val)}>
              <div style={{ fontSize: 13, color: answers.dayCount === val ? C.text : C.muted, fontWeight: 600, marginBottom: 3, ...mono }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </SelectCard>
          ))}
        </div>
      );

      case "environment": return (
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 10, ...mono }}>STEP 4 OF {totalSteps}</div>
          <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>Training environment?</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>Determines whether outdoor sessions like rucks and loaded carries are built into your schedule.</div>
          {[
            { val: "gym",     label: "Gym only",           desc: "All sessions indoors. Carry and stamina work uses gym equipment.", color: C.blue },
            { val: "outdoor", label: "Outdoor only",       desc: "Trail work, rucks, and carries outdoors. Minimal equipment needed.", color: C.green },
            { val: "mix",     label: "Mix of both",        desc: "Gym for strength days, outdoor for stamina. Highest variety — recommended.", color: C.accent },
          ].map(({ val, label, desc, color }) => (
            <SelectCard key={val} selected={answers.environment === val} onClick={() => update("environment", val)} color={color}>
              <div style={{ fontSize: 13, color: answers.environment === val ? C.text : C.muted, fontWeight: 600, marginBottom: 3, ...mono }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </SelectCard>
          ))}
        </div>
      );

      case "equipment": return (
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 10, ...mono }}>STEP 5 OF {totalSteps}</div>
          <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>Available equipment?</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>Exercise selection adapts to what you actually have access to.</div>
          {[
            { val: "full",       label: "Full commercial gym",    desc: "Barbells, rack, cables, machines, dumbbells — everything. No substitutions needed.", color: C.accent },
            { val: "barbell",    label: "Barbell + rack + DBs",   desc: "Home gym setup. Full strength work, no cables or machines.", color: C.blue },
            { val: "dumbbells",  label: "Dumbbells only",         desc: "No barbell. DB alternatives used throughout. Still highly effective.", color: C.green },
            { val: "kettlebells",label: "Kettlebells",            desc: "KB-primary training. Swings, cleans, carries, presses.", color: "#A07EC8" },
            { val: "bodyweight", label: "Bodyweight only",        desc: "No equipment. Push-up, pull-up, squat, and carry progressions.", color: "#C87E96" },
          ].map(({ val, label, desc, color }) => (
            <SelectCard key={val} selected={answers.equipment === val} onClick={() => update("equipment", val)} color={color}>
              <div style={{ fontSize: 13, color: answers.equipment === val ? C.text : C.muted, fontWeight: 600, marginBottom: 3, ...mono }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </SelectCard>
          ))}
        </div>
      );

      case "limitation": return (
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 10, ...mono }}>STEP 6 OF {totalSteps}</div>
          <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>Any current limitations?</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>The program will substitute or modify affected movements. You can always update this later via the AI tab.</div>
          {[
            { val: "none",           label: "None — train fully",                    desc: "No restrictions. Full exercise selection.", color: C.green },
            { val: "upper_cautious", label: "Upper body — pain-free but cautious",   desc: "Shoulder, elbow, or wrist history. Conservative pressing progression. Landmine entry point.", color: C.accent },
            { val: "upper_pain",     label: "Upper body — currently uncomfortable",  desc: "Active shoulder, elbow, or wrist pain. Pressing replaced with band/push-up work only.", color: C.red },
            { val: "lower_cautious", label: "Lower body — pain-free but cautious",   desc: "Knee, hip, or back history. Split squats replaced. Hinge load reduced.", color: C.accent },
            { val: "lower_pain",     label: "Lower body — currently uncomfortable",  desc: "Active knee, hip, or back pain. Squats and heavy hinges replaced with low-load alternatives.", color: C.red },
            { val: "both_pain",      label: "Both upper and lower limitations",      desc: "Multiple active restrictions. Conservative across all movement patterns.", color: "#A07EC8" },
          ].map(({ val, label, desc, color }) => (
            <SelectCard key={val} selected={answers.limitation === val} onClick={() => update("limitation", val)} color={color}>
              <div style={{ fontSize: 13, color: answers.limitation === val ? C.text : C.muted, fontWeight: 600, marginBottom: 3, ...mono }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </SelectCard>
          ))}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>TRAINING LAYOFF</div>
            {[
              { val: 0, label: "No layoff — continuous training" },
              { val: 3, label: "1–4 weeks off" },
              { val: 6, label: "4–8 weeks off" },
              { val: 10, label: "8+ weeks off" },
            ].map(({ val, label }) => (
              <div key={val} onClick={() => update("layoffWeeks", val)} style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 8, cursor: "pointer", padding: "8px 12px",
                background: answers.layoffWeeks === val ? `${C.accent}12` : C.card,
                border: `1px solid ${answers.layoffWeeks === val ? C.accent : C.border}`, borderRadius: 5,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: answers.layoffWeeks === val ? C.accent : C.border, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: answers.layoffWeeks === val ? C.text : C.muted, ...mono }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      );

      case "baselines": return (
        <div>
          <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 10, ...mono }}>STEP 7 OF {totalSteps}</div>
          <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>Baseline numbers.</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>Used to track progress and suggest working weights. Skip any you don't know — you can add them later.</div>

          {[
            { key: "dlPR",       label: "Deadlift / Hinge PR (lbs)",  pct: [0.55, 0.62] },
            { key: "squatPR",    label: "Squat PR (lbs)",              pct: [0.60, 0.67] },
            { key: "bodyweight", label: "Current Bodyweight (lbs)",    pct: null },
          ].map(({ key, label, pct }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 6, ...mono }}>{label.toUpperCase()}</div>
              <input type="number" value={answers[key]} onChange={e => update(key, e.target.value)} placeholder="—"
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, color: C.accent, padding: "12px 14px", fontSize: 22, fontWeight: 700, outline: "none", width: "100%", textAlign: "center", ...mono }}
                onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border}
              />
              {pct && answers[key] && (
                <div style={{ fontSize: 10, color: C.muted, marginTop: 5, textAlign: "center", ...mono }}>
                  Week 1 target: {Math.round(+answers[key] * pct[0])}–{Math.round(+answers[key] * pct[1])} lbs
                </div>
              )}
            </div>
          ))}
          <div style={{ background: C.faint, borderRadius: 5, padding: "10px 14px", fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
            Additional PRs can be added to individual exercise cards after your program loads.
          </div>
        </div>
      );

      case "summary": {
        const { program: previewProg, days: previewDays } = buildProgram(answers);
        const splitLabels = { upper_lower: "Upper / Lower", ppl: "Push / Pull / Legs", fullbody: "Full Body", conventional: "Conventional Split" };
        const envLabels = { gym: "Gym only", outdoor: "Outdoor only", mix: "Mix of both" };
        const eqLabels = { full: "Full gym", barbell: "Barbell + DBs", dumbbells: "Dumbbells only", kettlebells: "Kettlebells", bodyweight: "Bodyweight" };
        const limLabels = { none: "None", upper_cautious: "Upper — cautious", upper_pain: "Upper — pain present", lower_cautious: "Lower — cautious", lower_pain: "Lower — pain present", both_pain: "Upper + lower" };

        return (
          <div>
            <div style={{ fontSize: 9, color: C.green, letterSpacing: 3, marginBottom: 10, ...mono }}>PROGRAM READY</div>
            <div style={{ ...serif, fontSize: 26, color: C.text, marginBottom: 6 }}>
              {answers.name ? `Here's your program, ${answers.name}.` : "Here's your Week 1 program."}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>Review your setup, then load the program. Everything can be adjusted inside the app.</div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
              {[
                ["Goal",         { longevity: "Longevity", strength: "Strength", stamina: "Stamina", body: "Body Comp" }[answers.primaryGoal]],
                ["Split",        splitLabels[answers.split]],
                ["Days/week",    `${answers.dayCount} days`],
                ["Environment",  envLabels[answers.environment]],
                ["Equipment",    eqLabels[answers.equipment]],
                ["Limitations",  limLabels[answers.limitation]],
                answers.dlPR ? ["DL PR", `${answers.dlPR} lbs`] : null,
                answers.squatPR ? ["Squat PR", `${answers.squatPR} lbs`] : null,
                answers.bodyweight ? ["Bodyweight", `${answers.bodyweight} lbs`] : null,
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.faint}` }}>
                  <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1, ...mono }}>{label.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: C.text, ...mono }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#0D1A0D", border: `1px solid #1E3A1E`, borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.green, letterSpacing: 1, marginBottom: 10, ...mono }}>WEEK 1 SCHEDULE</div>
              {previewDays.map(d => (
                <div key={d.id} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: C.green, fontWeight: 700, ...mono, minWidth: 30 }}>{d.label.slice(0, 3).toUpperCase()}</span>
                  <div>
                    <div style={{ fontSize: 11, color: C.text, ...mono }}>{d.focus}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {(previewProg[0]?.[d.id] ?? []).slice(0, 3).map(e => e.name).join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder { color: #444; }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: C.faint, zIndex: 100 }}>
        <div style={{ height: "100%", background: C.accent, width: `${(step / (ONBOARDING_STEPS.length - 1)) * 100}%`, transition: "width .4s ease" }} />
      </div>

      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, ...mono }}>PERFORMANCE & LONGEVITY</div>
        {step > 0 && step < ONBOARDING_STEPS.length - 1 && (
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, ...mono }}>{step} / {totalSteps}</div>
        )}
      </div>

      <div key={step} style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px 100px", animation: "fadeSlide .25s ease" }}>
        {stepContent()}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {step > 0 ? (
          <button onClick={back} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, padding: "10px 20px", cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 1, ...mono }}>← BACK</button>
        ) : <div />}
        {isLast ? (
          <button onClick={finish} style={{ background: C.green, border: "none", borderRadius: 5, color: "#000", padding: "12px 32px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 2, ...mono }}>LOAD MY PROGRAM →</button>
        ) : (
          <button onClick={next} style={{ background: C.accent, border: "none", borderRadius: 5, color: "#000", padding: "12px 28px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 2, ...mono }}>{step === 0 ? "GET STARTED →" : "NEXT →"}</button>
        )}
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [program, setProgram]               = useState({});
  const [log, setLog]                       = useState({});
  const [days, setDays]                     = useState(DAYS);
  const [loaded, setLoaded]                 = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [weekIdx, setWeekIdx]               = useState(0);
  const [dayIdx, setDayIdx]                 = useState(0);
  const [tab, setTab]                       = useState("log");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { program: p, log: l, days: d } = JSON.parse(saved);
          if (p) setProgram(p); if (l) setLog(l); if (d) setDays(d);
        } else {
          setShowOnboarding(true);
        }
      } catch (_) { setProgram({ 0: WEEK1_TEMPLATE }); }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((p, l, d) => {
    setSaving(true);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ program: p, log: l, days: d || days })); } catch (_) {}
    setTimeout(() => setSaving(false), 700);
  }, [days]);

  const updateProgram = useCallback((wi, dayId, exercises) => {
    setProgram(prev => { const np = { ...prev, [wi]: { ...(prev[wi] ?? {}), [dayId]: exercises } }; persist(np, log); return np; });
  }, [log, persist]);

  const updateLog = useCallback((wi, dayId, exName, data) => {
    setLog(prev => {
      const nl = { ...prev, [wi]: { ...(prev[wi] ?? {}), [dayId]: { ...(prev[wi]?.[dayId] ?? {}), [exName]: data } } };
      persist(program, nl); return nl;
    });
  }, [program, persist]);

  const applyAIUpdate = useCallback((changes) => {
    setProgram(prev => {
      let np = { ...prev };
      changes.forEach(({ week, day, exercises }) => { np = { ...np, [week]: { ...(np[week] ?? {}), [day]: exercises } }; });
      persist(np, log); return np;
    });
  }, [log, persist]);

  const allPRs = {};
  Object.entries(log).forEach(([wi, dayMap]) =>
    Object.entries(dayMap).forEach(([dayId, exs]) =>
      Object.entries(exs).forEach(([name, data]) => {
        const weights = (data.sets ?? []).map(s => +s.weight).filter(Boolean);
        if (weights.length) allPRs[`${wi}_${dayId}_${name}`] = Math.max(...weights);
      })
    )
  );

  const weekHasData = (wi) => days.some(d =>
    (program[wi]?.[d.id] ?? []).some(ex => (log[wi]?.[d.id]?.[ex.name]?.sets ?? []).some(s => s.weight && s.reps))
  );

  const handleOnboardingComplete = useCallback((generatedProgram, generatedDays, answers) => {
    setProgram(generatedProgram);
    setLog({});
    setDays(generatedDays);
    setShowOnboarding(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ program: generatedProgram, log: {}, days: generatedDays }));
    } catch (_) {}
  }, []);

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.accent, letterSpacing: 3, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>LOADING...</div>
    </div>
  );

  if (showOnboarding) return <OnboardingWizard onComplete={handleOnboardingComplete} />;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder, textarea::placeholder { color: #444; }
        select option { background: #1A1A1A; }
        textarea { font-family: 'IBM Plex Mono', monospace; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: C.bg,
        borderBottom: `1px solid ${C.border}`, padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ ...serif, fontSize: 18, letterSpacing: 0.3 }}>Performance & Longevity</div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, marginTop: 1, ...mono }}>TRAINING TRACKER · 12-WEEK CYCLE</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saving && <span style={{ fontSize: 9, color: C.accent, letterSpacing: 1, animation: "pulse 1s infinite", ...mono }}>SAVING</span>}
          <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 5, overflow: "hidden" }}>
            {[["log","LOG"],["progress","PROGRESS"],["ai","AI UPDATE"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? C.accent : "none", border: "none",
                color: tab === t ? "#000" : C.muted, padding: "6px 12px",
                cursor: "pointer", fontSize: 9, fontWeight: 700, letterSpacing: 1,
                transition: "all .15s", ...mono,
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "log" && (
          <>
            {/* Week selector */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <button key={i} onClick={() => setWeekIdx(i)} style={{
                  background: weekIdx === i ? C.accent : weekHasData(i) ? "#181818" : "none",
                  border: `1px solid ${weekIdx === i ? C.accent : weekHasData(i) ? "#333" : C.border}`,
                  borderRadius: 4, color: weekIdx === i ? "#000" : weekHasData(i) ? C.text : C.muted,
                  padding: "5px 11px", cursor: "pointer", fontSize: 10,
                  fontWeight: weekIdx === i ? 700 : 400, transition: "all .15s", ...mono,
                }}>
                  W{i + 1}
                  {weekHasData(i) && weekIdx !== i && <span style={{ marginLeft: 3, color: C.accent, fontSize: 7 }}>●</span>}
                </button>
              ))}
            </div>

            {/* Day selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {days.map((d, i) => {
                const hasLog = (program[weekIdx]?.[d.id] ?? []).some(ex =>
                  (log[weekIdx]?.[d.id]?.[ex.name]?.sets ?? []).some(s => s.weight && s.reps)
                );
                return (
                  <button key={d.id} onClick={() => setDayIdx(i)} style={{
                    background: dayIdx === i ? (hasLog ? C.green : C.accent) : "none",
                    border: `1px solid ${dayIdx === i ? (hasLog ? C.green : C.accent) : C.border}`,
                    borderRadius: 4, color: dayIdx === i ? "#000" : C.muted,
                    padding: "5px 12px", cursor: "pointer", fontSize: 11,
                    fontWeight: dayIdx === i ? 700 : 400, transition: "all .15s", ...mono,
                  }}>
                    {d.label.slice(0, 3).toUpperCase()}
                    {hasLog && <span style={{ marginLeft: 4, fontSize: 8 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <ReadinessBanner />

            <DayPanel
              day={days[dayIdx]} weekIdx={weekIdx}
              program={program} log={log}
              onUpdateProgram={updateProgram} onUpdateLog={updateLog}
              allPRs={allPRs}
            />
          </>
        )}
        {tab === "progress" && <ProgressTab program={program} log={log} />}
        {tab === "ai" && <AIUpdater onApplyUpdate={applyAIUpdate} currentProgram={program} />}
      </div>
    </div>
  );
}
