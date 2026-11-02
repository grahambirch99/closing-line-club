/* Closing Line Club — front end.
   Reads window.__DATA__ (data/bundle.js, built by site_build.py), window.SITE_CONFIG (config.js) and
   window.CLC_STRATEGIES (strategies.js). It only displays; every record, CLV and test number comes from the data
   files. The one thing computed here is the 95% range for NFL CLV, from the same picks the headline average uses,
   and it is only shown when its average matches the published one. */
(() => {
  "use strict";
  const RAW = window.__DATA__;
  const D = RAW || { picks: { weeks: [] }, summary: {}, wire: { items: [] }, nba: {} };
  D.picks = D.picks || { weeks: [] };
  D.summary = D.summary || {};
  D.wire = D.wire || { items: [] };
  D.nba = D.nba || {};
  D.nba.summary = D.nba.summary || {};
  D.nba.nights = D.nba.nights || [];
  const CFG = window.SITE_CONFIG || {};
  const STRATS = window.CLC_STRATEGIES || [];
  const REPO = CFG.repo || "https://github.com/grahambirch99/closing-line-club";
  const TZ = "America/Los_Angeles";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MINUS = "−";
  const sgn = (v) => (v > 0 ? "+" : v < 0 ? MINUS : "");
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const fmtU = (u, d = 2) => (isNum(u) ? `${sgn(u)}${Math.abs(u).toFixed(d)}u` : "–");
  const fmtPts = (p, d = 1) => (isNum(p) ? `${sgn(+p.toFixed(d))}${Math.abs(p).toFixed(d)}` : "–");
  const fmtPct = (p, d = 1) => (isNum(p) ? `${sgn(p)}${Math.abs(p).toFixed(d)}%` : "–");
  const fmtInt = (n) => (isNum(n) ? n.toLocaleString("en-US") : "–");
  const rec = (r) => (r ? `${r.w}\u2060–\u2060${r.l}${r.p ? `\u2060–\u2060${r.p}` : ""}` : "–");
  const graded = (r) => (r ? (r.w || 0) + (r.l || 0) + (r.p || 0) : 0);
  const tone = (v) => (!isNum(v) || v === 0 ? "" : v > 0 ? "pos" : "neg");
  const stakeU = (dollars) => (isNum(dollars) ? `${+(dollars / 10).toFixed(2)}u` : "–");

  const dtf = (opts) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts });
  const F_TIME = dtf({ hour: "numeric", minute: "2-digit" });
  const F_DAY = dtf({ weekday: "short", month: "short", day: "numeric" });
  const F_FULL = dtf({ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const F_DATEKEY = dtf({ year: "numeric", month: "2-digit", day: "2-digit" });
  const when = (iso) => (iso ? `${F_FULL.format(new Date(iso))} PT` : "");

  const ICON = {
    W: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2L9.6 3.6"/></svg>',
    L: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3L3 9"/></svg>',
    open: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4"/><path d="M6 3.6V6l1.6 1"/></svg>',
    P: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6h6"/></svg>',
    chev: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4"/></svg>',
  };
  ICON.void = ICON.P;
  const STATUS_LABEL = { W: "Won", L: "Lost", P: "Push", void: "Void", open: "Open" };
  const CHIP = {
    live: '<span class="chip chip-live">Live</span>',
    paper: '<span class="chip chip-paper">Paper</span>',
    experimental: '<span class="chip chip-exp">Experimental</span>',
    retired: '<span class="chip chip-retired">Retired</span>',
  };
  const statusChip = (st) => `<span class="chip chip-${st}">${ICON[st] || ""}${STATUS_LABEL[st] || esc(st)}</span>`;

  let tipSeq = 0;
  function info(text) {
    const id = `tip-${++tipSeq}`;
    return `<span class="tipwrap"><button type="button" class="info" aria-label="What this means" aria-describedby="${id}" aria-expanded="false">i</button><span class="tipbox" role="tooltip" id="${id}">${esc(text)}</span></span>`;
  }

  /* ---------- statistics ---------- */
  // Two-sided 95% t critical values; normal beyond 30 degrees of freedom.
  const T95 = [0, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.10, 2.09,
    2.09, 2.08, 2.07, 2.07, 2.06, 2.06, 2.06, 2.05, 2.05, 2.05, 2.04];
  function meanCI(xs) {
    const n = xs.length;
    if (n < 2) return null;
    const m = xs.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
    const t = n - 1 <= 30 ? T95[n - 1] : 1.96;
    const h = (t * sd) / Math.sqrt(n);
    return { n, mean: m, lo: m - h, hi: m + h };
  }
  const nflPicks = (D.picks.weeks || []).flatMap((w) => w.picks || []);
  const isLive = (p) => p.kind === "bet" || p.kind === "teaser";
  const isGraded = (p) => ["W", "L", "P"].includes(p.status);
  // Same selection as site_build.summarize(): counted kinds, graded, exact close that moved (clv_ok).
  function clvCI(kinds, published) {
    const xs = nflPicks.filter((p) => kinds.includes(p.kind) && isGraded(p) && p.clv_ok && isNum(p.clv)).map((p) => p.clv);
    const ci = meanCI(xs);
    if (!ci || !isNum(published) || Math.abs(ci.mean - published) > 0.006) return null;   // integrity check
    return ci;
  }
  const seasonCI = clvCI(["bet", "teaser"], D.summary.season && D.summary.season.clv);
  function clvSentence(s, ci) {
    if (!s || !s.n_clv) return "No real-money pick has a measurable closing line yet.";
    let out = `Average closing-line value is <b>${fmtPts(s.clv, 2)} pts</b> on ${s.n_clv} measurable bet${s.n_clv === 1 ? "" : "s"}`;
    if (ci) {
      out += ` (95% range ${fmtPts(ci.lo)} to ${fmtPts(ci.hi)}). `;
      out += ci.lo > 0 ? "The range is above zero, but the sample is still small." : ci.hi < 0 ? "The whole range is below zero: so far our prices have trailed the close."
        : "The range includes zero, so this can't yet be told apart from no edge.";
    } else out += ". ";
    if (isNum(s.clv_any)) out += ` Across all ${s.n_clv_any} picks with any closing price, including estimated and unchanged closes, it is ${fmtPts(s.clv_any, 2)} (reference only).`;
    return `${out} Win–loss and units at this sample size are mostly noise.`;
  }

  /* ---------- shared pieces ---------- */
  function figure(k, v, note, tipText, cls = "") {
    return `<div class="figure"><div class="figure-k">${esc(k)}${tipText ? info(tipText) : ""}</div>
      <div class="figure-v ${cls}">${v}</div>${note ? `<div class="figure-n">${note}</div>` : ""}</div>`;
  }
  function seasonFigures(s, ci) {
    const g = graded(s);
    const firstWeek = Math.min(...nflPicks.filter(isLive).map((p) => p.week));
    const winPct = s.w + s.l ? Math.round((100 * s.w) / (s.w + s.l)) : null;
    return [
      figure("Graded picks", fmtInt(g), isFinite(firstWeek) ? `Bets and teasers since Week ${firstWeek}` : "Bets and teasers",
        "Real-money picks with a final result. Voids are not counted. Paper picks and NBA research are excluded."),
      figure("Record", rec(s), winPct != null ? `${winPct}% won` : "", "Wins–losses (–pushes). Win rate alone doesn't show skill: it depends on the prices taken."),
      figure("Units", `<span class="${tone(s.units)}">${fmtU(s.units)}</span>`, "Flat 0.5u–0.75u stakes",
        "Total profit or loss in units. 1 unit is 2% of a bankroll; a 0.5u pick is $5 on a $500 bankroll."),
      figure("Return on stakes", `<span class="${tone(s.roi)}">${fmtPct(s.roi)}</span>`, g ? `On ${g} graded picks` : "",
        "Profit divided by the total amount staked. Swings widely below several hundred bets."),
      figure("Average CLV", `<span class="${tone(s.clv)}">${s.clv == null ? "–" : `${fmtPts(s.clv, 2)} pts`}</span>`,
        `${s.n_clv || 0} measurable bets${ci ? `<br>95% range ${fmtPts(ci.lo)} to ${fmtPts(ci.hi)}` : ""}`,
        "Points of win probability our price beat (+) or trailed (−) Pinnacle's no-margin closing price. Only picks where Pinnacle quoted the same line at the close and its price moved are averaged."),
      figure("Beat the close", s.beat == null ? "–" : `${s.beat}%`, `Of ${s.n_clv || 0} measurable bets`,
        "Share of measurable bets whose price was better than the closing price. Around 50% is what no edge looks like."),
    ].join("");
  }

  function progressHtml(n, goal, unit) {
    const pct = goal ? Math.min(100, (100 * n) / goal) : 0;
    return `<div class="mini-progress"><span class="num">${fmtInt(n)} of ${fmtInt(goal)} ${unit}</span>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(n, goal)}" aria-label="${esc(unit)} toward the verdict"><span style="width:${pct}%"></span></div></div>`;
  }
  function stratProgress(key) {
    const S = D.summary, N = D.nba.summary;
    if (key === "gate" && S.gate) return { n: S.gate.n_clv || 0, goal: S.gate.goal || 150, unit: "measurable picks", r: S.gate };
    if (key === "cfb" && S.cfb) return { n: S.cfb.n_clv || 0, goal: S.cfb.goal || 150, unit: "measurable picks", r: S.cfb };
    if (key === "cfb_props" && S.cfb_props) return { n: S.cfb_props.n_clv || 0, goal: S.cfb_props.goal || 150, unit: "measurable picks", r: S.cfb_props };
    if (key === "nba" && N.goal) return { n: N.graded || 0, goal: N.goal, unit: "graded picks", r: N };
    if (key === "h2h" && N.h2h) return { n: graded(N.h2h), goal: 1500, unit: "graded bets", r: N.h2h };
    return null;
  }
  function stratRecord(id) {
    const N = D.nba.summary;
    const sumKind = (kind) => {
      const ps = nflPicks.filter((p) => p.kind === kind && isGraded(p));
      if (!ps.length) return null;
      return { w: ps.filter((p) => p.status === "W").length, l: ps.filter((p) => p.status === "L").length,
        p: ps.filter((p) => p.status === "P").length, units: ps.reduce((a, p) => a + (p.units || 0), 0) };
    };
    const map = { "nfl-v1": sumKind("bet"), teasers: sumKind("teaser"), "nfl-v2": D.summary.gate, cfb: D.summary.cfb, "cfb-props": D.summary.cfb_props,
      "nba-v31": N.goal ? N : null, "nba-v3": N.v3_capped, "nba-v2": N.v2, "nba-v1": N.v1, "nba-h2h": N.h2h };
    const r = map[id];
    return r && graded(r) ? r : null;
  }

  /* ---------- picks table ---------- */
  function clvCell(p, nba) {
    if (!isNum(p.clv)) {
      const why = p.status === "pending" ? `Closing price comes in at ${nba ? "tip-off" : "kickoff"}`
        : p.kind === "teaser" ? "Teasers have no closing-line value" : p.price === "Pick'em" ? "No closing price for pick'em apps" : "No closing price captured";
      return `<td class="c-clv r na" title="${esc(why)}"><span class="muted" aria-label="${esc(why)}">–</span></td>`;
    }
    const v = fmtPts(p.clv);
    if (nba || p.kind === "paper") {
      const t = nba ? "Against Kalshi's price at tip-off. Reference only: the NBA test is judged on results." : "Reference only: mid-week paper picks are not part of any headline average.";
      return `<td class="c-clv r" title="${esc(t)}"><span class="clv-ref">${v}</span><span class="clv-flag">ref</span></td>`;
    }
    if (p.clv_ok) return `<td class="c-clv r"><span class="${tone(p.clv)}">${v}</span></td>`;
    const est = p.clv_method && p.clv_method !== "exact";
    const t = est ? "Estimated: the line moved, so the close was estimated. Not in the average." : "Flat: Pinnacle's closing price never changed after posting, so this repeats the starting edge. Not in the average.";
    return `<td class="c-clv r" title="${esc(t)}"><span class="clv-ref">${v}</span><span class="clv-flag">${est ? "est." : "flat"}</span></td>`;
  }
  function untilKick(iso, nba) {
    const ms = new Date(iso) - Date.now(), w = nba ? "Tip-off" : "Kickoff";
    if (ms <= 0) return nba ? "Tipped off, grading pending" : "Kicked off, grading pending";
    const h = Math.floor(ms / 36e5), d = Math.floor(h / 24);
    return d >= 1 ? `${w} in ${d}d ${h % 24}h` : `${w} in ${h}h ${Math.floor((ms % 36e5) / 6e4)}m`;
  }
  function nbaRuleChip(p) {
    if (p.conflict) return '<span class="chip chip-tag">Conflicts with an earlier bet: not a pick</span>';
    if (p.retired) return '<span class="chip chip-retired">v1, retired</span>';
    if (p.rules === "h2h") return '<span class="chip chip-exp">Matchup test</span>';
    if (p.v3) return `<span class="chip chip-tag">${p.v3_ver === "3.1" ? "v3.1" : "v3 with caps"}</span>`;
    if (p.rules === "v2") return '<span class="chip chip-retired">v2, retired</span>';
    return "";
  }
  function tagsFor(p) {
    const t = [];
    if (p.kind === "nba") {
      t.push(nbaRuleChip(p));
      if (p.v3 && p.matchup) t.push(`<span class="chip ${p.matchup === "agree" ? "chip-agree" : "chip-tag"}">${{ agree: "Matchup agrees", disagree: "Matchup disagrees", none: "No matchup pick" }[p.matchup] || ""}</span>`);
    }
    if (p.tier === "A" && p.kind !== "nba" && p.kind !== "teaser") t.push('<span class="chip chip-strong">Strong</span>');
    if (p.system) t.push(`<span class="chip chip-tag">${esc(p.system)}</span>`);
    if (p.rules && p.kind !== "nba") t.push(`<span class="chip chip-tag">Rules ${esc(p.rules)}</span>`);
    if (isNum(p.edge) && p.kind !== "teaser") t.push(`<span class="chip chip-tag">${p.edge > 0 ? "+" : ""}${p.edge}% edge at posting</span>`);
    return t.filter(Boolean).join("");
  }
  function pickRow(p) {
    const nba = p.kind === "nba";
    const st = p.status === "pending" ? "open" : p.status;
    const live = isLive(p);
    const fresh = Date.now() - new Date(p.posted) < 2 * 36e5;
    const kick = esc(String(p.kick_label || "").replace(/ PT$/, ""));
    const showUnits = isNum(p.units) && p.kind !== "paper";
    const result = st === "open"
      ? `${statusChip("open")}<span class="actual">${untilKick(p.kick, nba)}</span>`
      : `${statusChip(st)}<span class="actual">${p.actual ? esc(p.actual) : ""}${showUnits ? `${p.actual ? ", " : ""}<span class="units ${tone(p.units)}">${fmtU(p.units)}</span>${live ? "" : " paper"}` : ""}</span>`;
    const stake = nba && p.v3 ? stakeU(p.stake_v3) : stakeU(p.stake);
    const worst = p.worst ? esc(p.worst) : "–";
    const who = p.kind === "teaser" ? "Two-team teaser" : esc(p.title);
    const rid = esc(p.id);
    const receipt = nba ? `${REPO}/commits/main/data/nba/paper.csv` : p.kind === "cfb" ? `${REPO}/commits/main/data/cfb/paper.csv` : `${REPO}/commits/main/site/data/picks.json`;
    return `<tr class="row${fresh ? " fresh" : ""}" id="pick-${rid}">
      <td class="c-kick">${kick}</td>
      <td class="c-pick"><span class="pick-line"><span class="pick-who">${who}</span> <span class="pick-bet">${esc(p.bet)}</span></span><span class="pick-game">${esc(p.game)}${nba ? ` ${nbaRuleChip(p)}` : ""}</span></td>
      <td class="c-price"><span class="price num">${esc(p.price)}</span><span class="venue">${esc(p.venue)}</span><span class="m-only num">${stake}${p.worst ? `, take ${worst} or better` : ""}</span></td>
      <td class="c-worst r num">${worst}</td>
      <td class="c-stake r num">${stake}</td>
      <td class="c-result">${result}</td>
      ${clvCell(p, nba)}
      <td class="c-more"><button type="button" class="more" aria-expanded="false" aria-controls="d-${rid}" aria-label="Reasoning and timestamp for ${who}: ${esc(p.bet)}">${ICON.chev}</button></td>
    </tr>
    <tr class="detail" id="d-${rid}" hidden><td colspan="8"><div class="detail-in">
      <div class="tags">${tagsFor(p)}</div>
      ${p.analysis ? `<p style="margin:0">${esc(p.analysis)}</p>` : ""}
      <p class="posted" style="margin:0">Posted ${esc(when(p.posted))}, kickoff ${esc(p.kick_label || "")}. <a href="${receipt}">Public timestamp</a></p>
    </div></td></tr>`;
  }
  function picksTable(ps, nba) {
    return `<div class="table-wrap"><table class="data picks">
      <colgroup><col class="w-kick"><col><col class="w-price"><col class="w-worst"><col class="w-stake"><col class="w-result"><col class="w-clv"><col class="w-more"></colgroup>
      <thead><tr><th scope="col" class="c-kick">${nba ? "Tip-off" : "Kickoff"}</th><th scope="col">Pick</th><th scope="col">Price</th>
      <th scope="col" class="r">Take at</th><th scope="col" class="r">Stake</th><th scope="col">Result</th><th scope="col" class="r">${nba ? "CLV (Kalshi)" : "CLV"}</th><th scope="col"><span class="sr">Details</span></th></tr></thead>
      <tbody>${ps.map(pickRow).join("")}</tbody></table></div>`;
  }
  function miniRecord(ps, units) {
    const g = ps.filter(isGraded);
    if (!g.length) return `${ps.length} open`;
    const w = g.filter((p) => p.status === "W").length, l = g.filter((p) => p.status === "L").length, pu = g.filter((p) => p.status === "P").length;
    const u = g.reduce((a, p) => a + (p.units || 0), 0);
    const open = ps.filter((p) => p.status === "pending").length;
    return `${w}–${l}${pu ? `–${pu}` : ""}${units ? `, ${fmtU(u)}` : ""}${open ? `, ${open} open` : ""}`;
  }

  /* ================= BOARD ================= */
  const weeks = D.picks.weeks || [];
  const GROUPS = [
    { k: "bet", chip: "live", title: "Real-money picks", desc: "Game-day price picks. Counted in the record." },
    { k: "teaser", chip: "live", title: "Teasers", desc: "Counted in the record. Teasers have no closing-line value, so they are judged on results." },
    { k: "trial", chip: "paper", title: "NFL game-day picks, rules v2 test", desc: "Same rules and posting as the real-money picks, on paper since Nov 1 until the test is judged (150 measurable picks or Jan 13, 2027)." },
    { k: "cfb", chip: "paper", title: "College football test", desc: "Games with no Big Ten or SEC team. Paper only, judged on closing-line value." },
    { k: "paper", chip: "paper", title: "Mid-week props model and angles", desc: "Tracked on paper and never counted. Paper results are shown as won or lost only." },
  ];
  const state = { week: D.picks.current_week, status: "all", sport: "all", market: "all", night: null };
  const marketCat = (p) => (p.kind === "teaser" ? "teaser" : ["spreads", "totals", "h2h"].includes(p.market) ? "lines" : "props");
  function passes(p) {
    const f = state.status;
    if (f === "open" && p.status !== "pending") return false;
    if ((f === "W" || f === "L") && p.status !== f) return false;
    if (f === "live" && !isLive(p)) return false;
    if (f === "paper" && isLive(p)) return false;
    if (state.sport !== "all" && (p.kind === "cfb" ? "cfb" : "nfl") !== state.sport) return false;
    if (state.market !== "all" && marketCat(p) !== state.market) return false;
    return true;
  }

  function renderStanding() {
    const order = { live: 0, paper: 1, experimental: 2 };
    const rows = STRATS.filter((s) => s.status !== "retired").sort((a, b) => order[a.status] - order[b.status]);
    const row = (s) => {
      const pr = s.progress ? stratProgress(s.progress) : null;
      const prog = pr ? progressHtml(pr.n, pr.goal, pr.unit) : `<span>${s.status === "live" ? "Counted in the record" : "Tracked, not counted"}</span>`;
      return `<div class="standing-row${s.status === "live" ? " is-live" : ""}">
        <div class="st-chip">${CHIP[s.status] || ""}</div>
        <div class="st-name"><span>${esc(s.name)}</span><span class="st-sport">${esc(s.sport)}</span>${info(`${s.rule} ${s.verdict}`)}</div>
        <div class="st-progress">${prog}</div>
        <div class="st-since">Since ${esc(s.since)}</div></div>`;
    };
    const live = rows.filter((s) => s.status === "live"), rest = rows.filter((s) => s.status !== "live");
    $("#standing").innerHTML = rows.length
      ? (live.length ? live.map(row).join("") : '<div class="standing-row is-none"><div class="st-name">Nothing is on real money right now.</div></div>') +
        (rest.length ? `<details class="standing-more"${window.innerWidth >= 1024 ? " open" : ""}><summary>${rest.length} ${rest.length === 1 ? "strategy" : "strategies"} on paper or experimental<span class="small"> (not counted)</span></summary>${rest.map(row).join("")}</details>` : "")
      : '<div class="standing-row"><div>Strategy list unavailable.</div></div>';
  }

  function renderBoard() {
    const wk = weeks.find((w) => w.week === state.week) || weeks[0] || { week: state.week, picks: [], record: {} };
    state.week = wk.week;
    const ps = wk.picks || [];
    $("#week-num").textContent = wk.week ?? "–";
    const live = ps.filter(isLive).length, open = ps.filter((p) => p.status === "pending").length;
    $("#board-meta").innerHTML = `<div><dt>Season</dt><dd>2026 NFL</dd></div><div><dt>Week</dt><dd>${esc(wk.week)}</dd></div>${wk.dates ? `<div><dt>Games</dt><dd>${esc(wk.dates)}</dd></div>` : ""}${D.picks.generated_at ? `<div><dt>Picks last changed</dt><dd>${esc(when(D.picks.generated_at))}</dd></div>` : ""}`;
    $("#board-lede").innerHTML = ps.length
      ? `${ps.length} pick${ps.length === 1 ? "" : "s"} posted for Week ${esc(wk.week)}: <b>${live} on real money</b> and ${ps.length - live} on paper.${open ? ` ${open} still open.` : " All graded."}${live && graded(wk.record) ? ` Real money this week: ${rec(wk.record)}, ${fmtU(wk.record.units)}.` : ""}`
      : `No picks posted for Week ${esc(wk.week)} yet. Most picks post on Sunday mornings after inactives are announced.`;
    $("#week-pills").innerHTML = weeks.map((w) => {
      const sub = graded(w.record) ? `${rec(w.record)} live` : w.paper_record && graded(w.paper_record) ? `${rec(w.paper_record)} paper` : w.picks.length ? `${w.picks.length} picks` : "No picks yet";
      return `<button type="button" class="pill" role="tab" aria-selected="${w.week === wk.week}" data-week="${w.week}">Week ${w.week}<small>${sub}</small></button>`;
    }).join("");
    const shown = ps.filter(passes);
    $("#result-count").textContent = ps.length ? `Showing ${shown.length} of ${ps.length} picks` : "";
    let html = GROUPS.map((g) => {
      const gp = shown.filter((p) => p.kind === g.k);
      if (!gp.length) return "";
      return `<section class="group ${g.chip}" aria-label="${esc(g.title)}"><div class="group-head">${CHIP[g.chip]}<h3 class="group-title">${esc(g.title)}</h3>
        <span class="group-rec">${miniRecord(gp, g.k !== "paper")}</span><p class="group-desc">${esc(g.desc)}</p></div>${picksTable(gp, false)}</section>`;
    }).join("");
    if (!html) {
      html = ps.length
        ? `<div class="empty"><b>No picks match these filters.</b>Week ${esc(wk.week)} has ${ps.length} picks.<br><button type="button" class="btn btn-quiet" data-reset>Clear filters</button></div>`
        : `<div class="empty"><b>No picks posted for Week ${esc(wk.week)} yet.</b>Most picks post on Sunday morning after inactives. They appear here and in the Discord as soon as they post.</div>`;
    }
    $("#board-picks").innerHTML = html;
    $("#board-legend").innerHTML = ps.length ? "CLV is in points of win probability against Pinnacle's no-margin close. <i>est.</i> = the line moved and the close was estimated; <i>flat</i> = the close never moved, so it repeats the starting edge; <i>ref</i> = reference only. Only unmarked values count in averages." : "";
  }

  function renderBoardSummary() {
    const s = D.summary.season;
    if (!s) { $("#board-figures").innerHTML = '<div class="figure">No graded picks yet.</div>'; return; }
    $("#board-figures").className = "figures six";
    $("#board-figures").innerHTML = seasonFigures(s, seasonCI);
    $("#perf-note").innerHTML = `Bets and teasers only. Paper picks and NBA research are excluded. <a href="#record">Full record and charts</a>`;
    $("#board-verdict").innerHTML = clvSentence(s, seasonCI);
  }

  /* ================= RECORD ================= */
  function niceTicks(lo, hi, count = 4) {
    const span = hi - lo || 1, raw = span / count, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 0.5) || mag * 10;
    const out = [];
    for (let v = Math.floor(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }
  function attachTip(fig) {
    let tip = $(".chart-tip", fig);
    if (!tip) { tip = document.createElement("div"); tip.className = "chart-tip"; tip.hidden = true; fig.appendChild(tip); }
    return tip;
  }

  function unitsChart() {
    const fig = $("#units-chart"), c = D.summary.curve || [];
    if (c.length < 2) { fig.innerHTML = '<p class="chart-empty">The chart starts after two graded picks.</p>'; return; }
    const W = 760, H = 260, P = { l: 52, r: 16, t: 14, b: 30 };
    const ys = c.map((d) => d.units).concat(0);
    const [y0, y1] = (() => { const lo = Math.min(...ys), hi = Math.max(...ys), pad = Math.max(0.5, (hi - lo) * 0.1); return [lo - pad, hi + pad]; })();
    const ticks = niceTicks(y0, y1);
    const lo = Math.min(y0, ticks[0]), hi = Math.max(y1, ticks[ticks.length - 1]);
    const X = (i) => P.l + (i / (c.length - 1)) * (W - P.l - P.r);
    const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
    let g = ticks.map((v) => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><g class="axis"><text x="${P.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v === 0 ? "0" : fmtU(v, Math.abs(v) % 1 ? 1 : 0)}</text></g>`).join("");
    const wks = [...new Set(c.map((d) => d.week))];
    g += wks.map((w) => { const i = c.findIndex((d) => d.week === w); return `${i ? `<line class="week-rule" x1="${X(i)}" x2="${X(i)}" y1="${P.t}" y2="${H - P.b}"/>` : ""}<g class="axis"><text x="${X(i) + (i ? 4 : 0)}" y="${H - 8}">Week ${w}</text></g>`; }).join("");
    g += `<line class="zero" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    g += `<path class="line" d="${c.map((d, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(d.units).toFixed(1)}`).join("")}"/>`;
    const last = c[c.length - 1];
    g += `<circle cx="${X(c.length - 1)}" cy="${Y(last.units)}" r="4.5" fill="var(--navy-900)" stroke="var(--surface)" stroke-width="2"/>`;
    g += `<text x="${X(c.length - 1) - 8}" y="${Y(last.units) + (last.units >= 0 ? -10 : 18)}" text-anchor="end" style="font:600 12px var(--sans);fill:var(--ink)">${fmtU(last.units)}</text>`;
    g += `<line class="xh" stroke="var(--slate-2)" y1="${P.t}" y2="${H - P.b}" visibility="hidden"/><circle class="xd" r="5" fill="var(--navy-900)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`;
    g += `<rect class="hit" x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}"/>`;
    fig.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative units after each of ${c.length} graded real-money picks, ending at ${fmtU(last.units)}">${g}</svg>
      <figcaption>${c.length} graded picks. Hover or tap the line for each pick.</figcaption>
      <details class="chart-table"><summary>Show as a table</summary><div class="table-wrap" style="margin-top:8px;max-height:260px;overflow:auto"><table class="data"><thead><tr><th>#</th><th>Week</th><th>Pick</th><th class="r">This pick</th><th class="r">Running total</th></tr></thead><tbody>${c.map((d, i) => `<tr><td class="num">${i + 1}</td><td>${d.week}</td><td>${esc(d.label)}</td><td class="r ${tone(d.units - (i ? c[i - 1].units : 0))}">${fmtU(d.units - (i ? c[i - 1].units : 0))}</td><td class="r">${fmtU(d.units)}</td></tr>`).join("")}</tbody></table></div></details>`;
    const svg = $("svg", fig), tip = attachTip(fig), xh = $(".xh", svg), xd = $(".xd", svg);
    const move = (clientX) => {
      const r = svg.getBoundingClientRect(), x = (clientX - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(c.length - 1, Math.round(((x - P.l) / (W - P.l - P.r)) * (c.length - 1))));
      const d = c[i], delta = d.units - (i ? c[i - 1].units : 0);
      xh.setAttribute("x1", X(i)); xh.setAttribute("x2", X(i)); xh.setAttribute("visibility", "visible");
      xd.setAttribute("cx", X(i)); xd.setAttribute("cy", Y(d.units)); xd.setAttribute("visibility", "visible");
      const fr = fig.getBoundingClientRect();
      tip.hidden = false;
      tip.style.left = `${Math.max(90, Math.min(fr.width - 90, r.left - fr.left + (X(i) / W) * r.width))}px`;
      tip.style.top = `${r.top - fr.top + (Y(d.units) / H) * r.height}px`;
      tip.innerHTML = `Week ${d.week}, pick ${i + 1}<br>${esc(d.label)}<br>This pick <b>${fmtU(delta)}</b>, total <b>${fmtU(d.units)}</b>`;
    };
    svg.addEventListener("pointermove", (e) => move(e.clientX));
    svg.addEventListener("pointerdown", (e) => move(e.clientX));
    svg.addEventListener("pointerleave", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); xd.setAttribute("visibility", "hidden"); });
  }

  function clvChart() {
    const fig = $("#clv-chart"), c = D.summary.clv_by_week || [];
    if (!c.length) { fig.innerHTML = '<p class="chart-empty">Shows up once closing prices are graded.</p>'; return; }
    const trialWeeks = new Set(nflPicks.filter((p) => p.kind === "trial" && p.clv_ok && isGraded(p)).map((p) => p.week));
    const W = 520, H = 250, P = { l: 44, r: 12, t: 22, b: 40 };
    const m = Math.max(2, ...c.map((d) => Math.abs(d.clv))) * 1.2;
    const ticks = niceTicks(-m, m, 4).filter((v) => Math.abs(v) <= m);
    const slot = (W - P.l - P.r) / c.length, bw = Math.min(64, slot * 0.6);
    const X = (i) => P.l + (i + 0.5) * slot, Y = (v) => P.t + (1 - (v + m) / (2 * m)) * (H - P.t - P.b);
    let g = ticks.map((v) => `<line class="${v ? "grid" : "zero"}" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><g class="axis"><text x="${P.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v ? fmtPts(v, Math.abs(v) % 1 ? 1 : 0) : "0"}</text></g>`).join("");
    if (!ticks.includes(0)) g += `<line class="zero" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    g += c.map((d, i) => {
      const yv = Y(d.clv), y0 = Y(0), top = Math.min(yv, y0), h = Math.max(2, Math.abs(yv - y0));
      const fill = d.clv >= 0 ? "var(--pos)" : "var(--neg-mark)";
      return `<rect class="cbar" data-i="${i}" x="${X(i) - bw / 2}" y="${top}" width="${bw}" height="${h}" rx="2" fill="${fill}"/>
        <g class="axis"><text x="${X(i)}" y="${d.clv >= 0 ? top - 6 : top + h + 14}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${fmtPts(d.clv, 2)}</text>
        <text x="${X(i)}" y="${H - 22}" text-anchor="middle">Week ${d.week}${trialWeeks.has(d.week) ? "*" : ""}</text><text x="${X(i)}" y="${H - 8}" text-anchor="middle">n = ${d.n}</text></g>
        <rect class="hit" data-i="${i}" x="${X(i) - slot / 2}" y="${P.t}" width="${slot}" height="${H - P.t - P.b}"/>`;
    }).join("");
    const anyTrial = c.some((d) => trialWeeks.has(d.week));
    fig.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Average closing-line value by week: ${c.map((d) => `Week ${d.week} ${fmtPts(d.clv, 2)} points on ${d.n} picks`).join("; ")}">${g}</svg>
      <figcaption>n = measurable picks that week. Small weeks swing a lot.${anyTrial ? " *Includes the rules v2 paper picks (same rules, on paper from Nov 1), so this week is not real-money only." : ""}</figcaption>`;
    const tip = attachTip(fig), svg = $("svg", fig);
    $$(".hit", svg).forEach((b) => {
      const show = () => {
        const i = +b.dataset.i, d = c[i], r = svg.getBoundingClientRect(), fr = fig.getBoundingClientRect();
        tip.hidden = false;
        tip.style.left = `${Math.max(90, Math.min(fr.width - 90, r.left - fr.left + (X(i) / W) * r.width))}px`;
        tip.style.top = `${r.top - fr.top + (Math.min(Y(0), Y(d.clv)) / H) * r.height}px`;
        tip.innerHTML = `Week ${d.week}: <b>${fmtPts(d.clv, 2)} pts</b> average<br>over ${d.n} measurable pick${d.n === 1 ? "" : "s"}${trialWeeks.has(d.week) ? "<br>includes rules v2 paper picks" : ""}`;
      };
      b.addEventListener("pointerenter", show); b.addEventListener("pointerdown", show);
      b.addEventListener("pointerleave", () => { tip.hidden = true; });
    });
  }

  function statRow(name, r, extra = "") {
    return `<tr><td class="name">${name}${extra}</td><td class="r">${graded(r)}</td><td class="r">${rec(r)}</td><td class="r ${tone(r.units)}">${fmtU(r.units)}</td>
      <td class="r ${tone(r.roi)}">${fmtPct(r.roi)}</td><td class="r">${r.clv == null ? "–" : `<span class="${tone(r.clv)}">${fmtPts(r.clv, 2)}</span> <span class="muted">(${r.n_clv})</span>`}</td><td class="r">${r.beat == null ? "–" : `${r.beat}%`}</td></tr>`;
  }
  const statHead = (first) => `<thead><tr><th scope="col">${first}</th><th scope="col" class="r">Graded</th><th scope="col" class="r">Record</th><th scope="col" class="r">Units</th><th scope="col" class="r">ROI</th><th scope="col" class="r">CLV (n)</th><th scope="col" class="r">Beat close</th></tr></thead>`;

  function gaugeSvg(est, lo, hi, pass, opts = {}) {
    if (!isNum(est) || !isNum(lo) || !isNum(hi)) return `<p class="chart-empty">Shows up after the first graded picks.</p>`;
    const W = 520, H = 92, P = { l: 16, r: 16 };
    const ext = Math.max(10, Math.ceil(Math.max(Math.abs(lo), Math.abs(hi), pass || 0) / 5) * 5 + 2);
    const X = (v) => P.l + ((v + ext) / (2 * ext)) * (W - P.l - P.r);
    const ticks = niceTicks(-ext, ext, 6).filter((v) => Math.abs(v) <= ext);
    let g = `<line class="g-axis" x1="${P.l}" x2="${W - P.r}" y1="60" y2="60"/>`;
    g += ticks.map((v) => `<line class="g-axis" x1="${X(v)}" x2="${X(v)}" y1="57" y2="63"/><text x="${X(v)}" y="80" text-anchor="middle">${v ? fmtPts(v, 0) : "0"}</text>`).join("");
    g += `<line class="g-zero" x1="${X(0)}" x2="${X(0)}" y1="16" y2="63"/>`;
    if (isNum(pass) && pass !== 0) g += `<line class="g-pass" x1="${X(pass)}" x2="${X(pass)}" y1="16" y2="63"/><text class="g-pass-label" x="${X(pass) + 5}" y="22" style="font-size:11.5px">Pass mark ${fmtPts(pass, 0)}</text>`;
    else g += `<text x="${X(0) + 5}" y="22" style="font-size:11.5px">Range must clear zero</text>`;
    g += `<line class="g-range" x1="${X(lo)}" x2="${X(hi)}" y1="42" y2="42"/>`;
    g += `<line class="g-range" x1="${X(lo)}" x2="${X(lo)}" y1="36" y2="48" style="stroke-width:2"/><line class="g-range" x1="${X(hi)}" x2="${X(hi)}" y1="36" y2="48" style="stroke-width:2"/>`;
    g += `<circle class="g-dot" cx="${X(est)}" cy="42" r="6"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "Estimate")} ${fmtPts(est)} points, 95% range ${fmtPts(lo)} to ${fmtPts(hi)}${isNum(pass) && pass ? `, pass mark ${fmtPts(pass, 0)}` : ""}">${g}</svg>
      <figcaption>Estimate <b class="num">${fmtPts(est)} pts</b>, 95% range <span class="num">${fmtPts(lo)} to ${fmtPts(hi)}</span>. ${opts.note || ""}</figcaption>`;
  }

  function renderRecord() {
    const S = D.summary, s = S.season || {};
    $("#record-meta").innerHTML = `<div><dt>Season</dt><dd>2026 NFL</dd></div><div><dt>Graded real-money picks</dt><dd>${graded(s)}</dd></div>${D.picks.generated_at ? `<div><dt>Picks last changed</dt><dd>${esc(when(D.picks.generated_at))}</dd></div>` : ""}`;
    $("#record-figures").className = "figures six";
    $("#record-figures").innerHTML = S.season ? seasonFigures(s, seasonCI) : figure("Graded picks", "0", "No graded picks yet");
    $("#record-verdict").innerHTML = S.season ? clvSentence(s, seasonCI) : "";
    unitsChart();
    clvChart();
    const t = S.by_type || [];
    $("#type-table").innerHTML = statHead("Type") + `<tbody>${t.length ? t.map((r) => statRow(esc(r.type), r)).join("") + (S.season ? statRow("All real-money picks", s).replace("<tr>", '<tr class="total">') : "") : '<tr><td colspan="7">No graded picks yet.</td></tr>'}</tbody>`;

    // paper tests
    const N = D.nba.summary;
    const tests = [];
    const nflT = (id, title, r, unitWord) => {
      if (!r) return;
      const ci = id === "nfl-v2" ? clvCI(["trial"], r.clv) : null;
      tests.push({ title, chip: "paper", r, prog: progressHtml(r.n_clv || 0, r.goal || 150, unitWord),
        key: r.clv == null ? "–" : `CLV <span class="${tone(r.clv)}">${fmtPts(r.clv, 2)}</span> on ${r.n_clv}${ci ? `<span class="sub">95% range ${fmtPts(ci.lo)} to ${fmtPts(ci.hi)}</span>` : ""}`,
        judged: (STRATS.find((x) => x.id === id) || {}).verdict || "" });
    };
    nflT("nfl-v2", "NFL game-day picks, rules v2", S.gate, "measurable");
    nflT("cfb", "College game lines", S.cfb, "measurable");
    nflT("cfb-props", "College player props", S.cfb_props, "measurable");
    if (N.goal) tests.push({ title: '<a href="#nba">NBA player props, v3.1</a>', chip: "paper", r: N, prog: progressHtml(N.graded || 0, N.goal, "graded"),
      key: N.lean == null ? "–" : `Wins vs break-even ${fmtPts(N.lean)}<span class="sub">95% range ${fmtPts(N.lean_lo)} to ${fmtPts(N.lean_hi)}</span>`,
      judged: (STRATS.find((x) => x.id === "nba-v31") || {}).verdict || "" });
    if (N.h2h) tests.push({ title: '<a href="#nba">NBA matchup test</a>', chip: "experimental", r: N.h2h, prog: progressHtml(graded(N.h2h), 1500, "graded"),
      key: N.h2h.net_lean == null ? "–" : `Net after costs ${fmtPts(N.h2h.net_lean)}<span class="sub">95% range ${fmtPts(N.h2h.net_lo)} to ${fmtPts(N.h2h.net_hi)}</span>`,
      judged: (STRATS.find((x) => x.id === "nba-h2h") || {}).verdict || "" });
    $("#tests-table").innerHTML = `<thead><tr><th scope="col">Test</th><th scope="col">Status</th><th scope="col" class="r">Record</th><th scope="col" class="r">Units</th><th scope="col">Progress to verdict</th><th scope="col">Key number so far</th><th scope="col"><span class="sr">How it's judged</span></th></tr></thead><tbody>` +
      (tests.length ? tests.map((x) => `<tr><td class="name">${x.title}</td><td>${CHIP[x.chip]}</td><td class="r">${graded(x.r) ? rec(x.r) : "–"}</td><td class="r ${tone(x.r.units)}">${graded(x.r) ? fmtU(x.r.units) : "–"}</td>
        <td style="min-width:160px">${x.prog}</td><td>${x.key}</td><td>${info(x.judged)}</td></tr>`).join("") : '<tr><td colspan="7">No paper tests running.</td></tr>') + "</tbody>";
    renderHistory($("#history"));
  }

  function renderHistory(el) {
    if (!el) return;
    el.innerHTML = STRATS.map((s) => {
      const r = stratRecord(s.id);
      return `<li class="${s.status}"><div class="h-top">${CHIP[s.status] || ""}<span class="h-name">${esc(s.sport)}: ${esc(s.name)}</span><span class="h-when">${esc(s.since)}</span></div>
        <p>${esc(s.rule)} ${esc(s.verdict)}</p>${r ? `<div class="h-rec">Record ${rec(r)}, ${fmtU(r.units)}${s.status === "live" || s.id === "nfl-v1" ? "" : " (paper)"}</div>` : ""}</li>`;
    }).join("");
  }

  /* ================= NBA ================= */
  function renderNba() {
    const N = D.nba, s = N.summary || {}, nights = N.nights || [];
    const goal = s.goal || 400, n = s.graded || 0;
    const v31 = STRATS.find((x) => x.id === "nba-v31") || {};
    $("#nba-meta").innerHTML = `<div><dt>Rules</dt><dd>v3.1</dd></div><div><dt>Started</dt><dd>${esc(v31.since || "Oct 28, 2026")}</dd></div>${nights[0] ? `<div><dt>Latest game night</dt><dd>${esc(nights[0].label)}</dd></div>` : ""}<div><dt>Verdict</dt><dd>400 graded picks or Feb 15, 2027</dd></div>`;
    $("#nba-n").textContent = fmtInt(Math.min(n, goal));
    $("#nba-goal").textContent = fmtInt(goal);
    $("#nba-fill").style.width = `${Math.min(100, (100 * n) / goal)}%`;
    $("#nba-bar").setAttribute("aria-valuemax", goal);
    $("#nba-bar").setAttribute("aria-valuenow", Math.min(n, goal));
    $("#nba-progress-note").textContent = n < goal ? `${fmtInt(goal - n)} more graded picks before the verdict. ${s.bets != null ? `${s.bets} v3.1 picks posted so far.` : ""}` : "Sample complete.";
    let stateTxt;
    if (s.passed === true) stateTxt = '<span class="chip chip-W">Passed on paper</span>It met its pre-registered test. A second, untouched paper sample comes next; no money until that passes too.';
    else if (s.passed === false) stateTxt = '<span class="chip chip-L">Did not pass</span>It missed its pre-registered test, so it does not move to real money.';
    else stateTxt = `<span class="chip chip-open">${ICON.open}In progress</span>No verdict until ${goal} graded picks. The numbers below are interim and are not a result.`;
    $("#nba-state").innerHTML = stateTxt;
    $("#nba-gauge").innerHTML = gaugeSvg(s.lean, s.lean_lo, s.lean_hi, 3, { label: "Wins above break-even", note: "The bootstrap resamples whole games." });
    const crit = [
      ["Wins at least 3 points above break-even", s.lean == null ? "–" : `${fmtPts(s.lean)} pts`],
      ["95% range entirely above zero", s.lean_lo == null ? "–" : `${fmtPts(s.lean_lo)} to ${fmtPts(s.lean_hi)}`],
      ["A profit (return above zero)", s.roi == null ? "–" : `${fmtPct(s.roi)} return`],
    ];
    $("#nba-criteria").innerHTML = `<div class="crit crit-head"><span>To pass, all three at ${goal} picks</span><span>Now, after ${n}</span><span></span></div>` +
      crit.map(([k, v]) => `<div class="crit"><span>${k}</span><span class="crit-now">${v}</span><span class="small">${s.passed == null ? `Not judged until ${goal}` : s.passed ? "Judged: passed" : "Judged"}</span></div>`).join("");
    $("#nba-figures").className = "figures four";
    $("#nba-figures").innerHTML = [
      figure("v3.1 record", graded(s) ? rec(s) : "–", `${graded(s)} graded of ${s.bets ?? 0} posted`, "Wins–losses for v3.1 picks only (from Oct 28). Earlier versions are listed separately below."),
      figure("Paper units", `<span class="${tone(s.units)}">${graded(s) ? fmtU(s.units) : "–"}</span>`, "Flat 0.5u paper stakes", "What flat 0.5u stakes would have made at the posted prices, after fees."),
      figure("Return on stakes", `<span class="${tone(s.roi)}">${fmtPct(s.roi)}</span>`, "Paper", "Paper profit divided by paper stakes."),
      figure("Wins vs break-even", s.lean == null ? "–" : `${fmtPts(s.lean)} pts`, s.lean_lo == null ? "" : `95% range ${fmtPts(s.lean_lo)} to ${fmtPts(s.lean_hi)}`, "Win rate minus the win rate the price paid needed (after fees), averaged over graded picks. This is what the test is judged on."),
    ].join("");
    const t = N.by_type || [];
    $("#nba-type-table").innerHTML = `<thead><tr><th scope="col">Market</th><th scope="col" class="r">Graded</th><th scope="col" class="r">Record</th><th scope="col" class="r">Units</th><th scope="col" class="r">ROI</th></tr></thead><tbody>` +
      (t.length ? t.map((r) => `<tr><td class="name">${esc(r.type)}</td><td class="r">${graded(r)}</td><td class="r">${rec(r)}</td><td class="r ${tone(r.units)}">${fmtU(r.units)}</td><td class="r ${tone(r.roi)}">${fmtPct(r.roi)}</td></tr>`).join("") : '<tr><td colspan="5">No graded v3.1 picks yet.</td></tr>') + "</tbody>";
    const m = s.matchup || {};
    const tagRows = [["Matchup agrees", m.agree], ["Matchup disagrees", m.disagree], ["No matchup pick", m.none]].filter(([, r]) => r);
    $("#nba-tag-table").innerHTML = `<thead><tr><th scope="col">Tag</th><th scope="col" class="r">Picks</th><th scope="col" class="r">Record</th><th scope="col" class="r">Units</th><th scope="col" class="r">ROI</th></tr></thead><tbody>` +
      (tagRows.length ? tagRows.map(([k, r]) => `<tr><td class="name">${k}</td><td class="r">${r.bets ?? graded(r)}</td><td class="r">${rec(r)}</td><td class="r ${tone(r.units)}">${fmtU(r.units)}</td><td class="r ${tone(r.roi)}">${fmtPct(r.roi)}</td></tr>`).join("") : '<tr><td colspan="5">No tagged picks yet.</td></tr>') + "</tbody>";

    // nights
    const cur = nights.find((x) => x.night === state.night) || nights[0];
    state.night = cur ? cur.night : null;
    $("#nba-nights").innerHTML = nights.map((x) => `<button type="button" class="pill" role="tab" aria-selected="${x.night === state.night}" data-night="${esc(x.night)}">${esc(x.label)}<small>${graded(x.record) ? rec(x.record) : `${x.picks.length} open`}</small></button>`).join("");
    $("#nba-night-note").textContent = cur
      ? `${cur.label}: ${cur.picks.length} paper pick${cur.picks.length === 1 ? "" : "s"}${graded(cur.record) ? `, ${rec(cur.record)}, ${fmtU(cur.record.units)}` : ""}. From Oct 26 only v3 picks are listed; earlier nights show the bets as they were posted under v1, v2 and the matchup test, each labelled.`
      : "";
    $("#nba-picks").innerHTML = cur ? picksTable(cur.picks, true)
      : '<div class="empty"><b>No NBA paper picks yet.</b>The rules check every game 30 to 60 minutes before tip-off. Picks they would make show up here, then get graded after the game.</div>';

    // versions
    const vers = [["nba-v1", s.v1], ["nba-v2", s.v2], ["nba-v3", s.v3_capped], ["nba-v31", s]];
    $("#nba-versions").innerHTML = `<thead><tr><th scope="col">Version</th><th scope="col">Dates</th><th scope="col">Rule</th><th scope="col" class="r">Record</th><th scope="col" class="r">Units</th><th scope="col">Status</th></tr></thead><tbody>` +
      vers.map(([id, r]) => { const v = STRATS.find((x) => x.id === id) || {}; return `<tr><td class="name">${{ "nba-v1": "Rules v1", "nba-v2": "Rules v2", "nba-v3": "Rules v3 (capped)", "nba-v31": "Rules v3.1" }[id]}</td><td style="white-space:nowrap">${esc(v.since || "")}</td><td>${esc(v.rule || "")}<span class="sub">${esc(v.verdict || "")}</span></td><td class="r">${r && graded(r) ? rec(r) : "–"}</td><td class="r ${tone(r && r.units)}">${r && graded(r) ? fmtU(r.units) : "–"}</td><td>${CHIP[v.status] || ""}</td></tr>`; }).join("") + "</tbody>";

    // matchup test
    const h = s.h2h || {};
    const hn = graded(h);
    $("#h2h-n").textContent = fmtInt(Math.min(hn, 1500));
    $("#h2h-fill").style.width = `${Math.min(100, (100 * hn) / 1500)}%`;
    $("#h2h-bar").setAttribute("aria-valuenow", Math.min(hn, 1500));
    $("#h2h-state").innerHTML = hn >= 1500 ? '<span class="chip chip-open">Sample complete</span>Verdict pending review.'
      : `<span class="chip chip-open">${ICON.open}In progress</span>No verdict until 1,500 graded bets or Jan 31, 2027. Real money would also need the net result's 95% range above zero.`;
    $("#h2h-gauge").innerHTML = gaugeSvg(h.net_lean, h.net_lo, h.net_hi, 0, { label: "Net result after costs", note: h.lean_vs_mid != null ? `Before the spread and fee, against Kalshi's midpoint: ${fmtPts(h.lean_vs_mid)} pts (context only).` : "" });
    $("#h2h-figures").className = "figures four";
    $("#h2h-figures").innerHTML = [
      figure("Record", hn ? rec(h) : "–", `${fmtInt(hn)} graded of ${fmtInt(h.bets ?? 0)} bets`, "Every bet the matchup rule would make, priced at Kalshi. Tracked, not posted."),
      figure("Paper units", `<span class="${tone(h.units)}">${hn ? fmtU(h.units) : "–"}</span>`, "Flat paper stakes", "Paper profit at the Kalshi price paid."),
      figure("Return on stakes", `<span class="${tone(h.roi)}">${fmtPct(h.roi)}</span>`, "Paper", "Paper profit divided by paper stakes."),
      figure("Net after costs", h.net_lean == null ? "–" : `${fmtPts(h.net_lean)} pts`, h.net_lo == null ? "" : `95% range ${fmtPts(h.net_lo)} to ${fmtPts(h.net_hi)}`, "Win rate minus the price actually paid, including Kalshi's fee. This is what decides the test."),
    ].join("");
  }

  /* ================= NEWS ================= */
  const SOURCE = { sleeper: "Sleeper injury feed", "rotoworld-fb": "Rotoworld", rotowire: "RotoWire", rapsheet: "Ian Rapoport" };
  function renderWire() {
    const items = (D.wire.items || []).slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    const srcs = [...new Set(items.map((e) => SOURCE[e.source] || e.source))];
    $("#wire-meta").innerHTML = `<div><dt>Items</dt><dd>${items.length} most recent</dd></div>${items[0] ? `<div><dt>Latest</dt><dd>${esc(when(items[0].at))}</dd></div>` : ""}<div><dt>Checked</dt><dd>Every 3 minutes, 5 AM–9 PM PT</dd></div>`;
    if (!items.length) {
      $("#wire-list").innerHTML = '<div class="empty"><b>No quarterback or injury news yet.</b>The watcher checks every few minutes from early morning to evening. News that triggers a re-check appears here.</div>';
      return;
    }
    const todayKey = F_DATEKEY.format(new Date()), yKey = F_DATEKEY.format(new Date(Date.now() - 864e5));
    const days = [];
    items.forEach((e) => {
      const k = F_DATEKEY.format(new Date(e.at));
      let d = days.find((x) => x.k === k);
      if (!d) days.push((d = { k, label: k === todayKey ? "Today" : k === yKey ? "Yesterday" : F_DAY.format(new Date(e.at)), items: [] }));
      d.items.push(e);
    });
    $("#wire-list").innerHTML = days.map((d) => `<section class="wire-day" aria-label="${esc(d.label)}"><h2>${esc(d.label)}</h2><ol class="wire-list">${d.items.map((e) => {
      const isNew = Date.now() - new Date(e.at) < 2 * 36e5;
      const qb = e.kind === "qb";
      return `<li class="wire-item${isNew ? " is-new" : ""}"><div class="wire-time"><time datetime="${esc(e.at)}">${F_TIME.format(new Date(e.at))}</time>${isNew ? '<span class="new">New</span>' : ""}</div>
        <div class="wire-body"><p class="wire-text"><span class="chip ${qb ? "chip-qb" : "chip-inj"}">${qb ? "QB" : "Injury"}</span> ${esc(String(e.text).replace(/ -> /g, " → "))}</p><div class="wire-src">${esc(SOURCE[e.source] || e.source)}</div></div></li>`;
    }).join("")}</ol></section>`).join("") + (srcs.length ? `<p class="legend">Sources in this list: ${esc(srcs.join(", "))}. The wire shows the latest ${items.length} items; it does not record which pick, if any, each item led to.</p>` : "");
  }

  /* ================= VENUES & DISCORD ================= */
  function renderVenues() {
    const apps = (CFG.apps || []).filter((a) => a.url || a.code);
    if (!apps.length) return;
    $("#apps").hidden = false;
    $("#app-table").innerHTML = `<thead><tr><th scope="col">Venue</th><th scope="col">Type</th><th scope="col">Sign-up offer</th><th scope="col"><span class="sr">Code and link</span></th></tr></thead><tbody>` +
      apps.map((a) => `<tr><td class="name">${esc(a.name)}</td><td class="type">${esc(a.what || "")}</td><td class="offer">${a.offer ? esc(a.offer) : '<span class="muted">No current offer listed</span>'}</td>
        <td class="actions" style="white-space:nowrap">${a.code ? `<button type="button" class="code" data-code="${esc(a.code)}" aria-label="Copy referral code ${esc(a.code)}">Code ${esc(a.code)}</button>` : ""} ${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener sponsored">Sign up<span class="sr"> for ${esc(a.name)} (referral link, opens in a new tab)</span></a>` : ""}</td></tr>`).join("") + "</tbody>";
  }
  if (CFG.discord) {
    const d = $("#discord-btn"); d.href = CFG.discord; d.hidden = false; d.target = "_blank"; d.rel = "noopener";
    const t = $("#top-discord"); t.href = CFG.discord; t.target = "_blank"; t.rel = "noopener";
  }
  if (CFG.repo) { $("#repo-link").href = CFG.repo; }

  /* ================= events ================= */
  document.addEventListener("click", (e) => {
    const t = e.target;
    const infoBtn = t.closest(".info");
    $$('.info[aria-expanded="true"]').forEach((b) => { if (b !== infoBtn) b.setAttribute("aria-expanded", "false"); });
    if (infoBtn) { infoBtn.setAttribute("aria-expanded", infoBtn.getAttribute("aria-expanded") === "true" ? "false" : "true"); placeTip(infoBtn); return; }
    const more = t.closest(".more");
    if (more) {
      const open = more.getAttribute("aria-expanded") !== "true";
      more.setAttribute("aria-expanded", String(open));
      const det = document.getElementById(more.getAttribute("aria-controls"));
      if (det) det.hidden = !open;
      more.closest("tr").classList.toggle("is-open", open);
      return;
    }
    const wk = t.closest(".pill[data-week]");
    if (wk) { state.week = +wk.dataset.week; history.replaceState(null, "", `#week-${state.week}`); renderBoard(); return; }
    const nt = t.closest(".pill[data-night]");
    if (nt) { state.night = nt.dataset.night; renderNba(); return; }
    const sf = t.closest("#status-filter button");
    if (sf) { state.status = sf.dataset.filter; $$("#status-filter button").forEach((b) => b.setAttribute("aria-pressed", String(b === sf))); renderBoard(); return; }
    if (t.closest("[data-reset]")) {
      state.status = "all"; state.sport = "all"; state.market = "all";
      $$("#status-filter button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === "all")));
      $("#sport-filter").value = "all"; $("#market-filter").value = "all"; renderBoard(); return;
    }
    const code = t.closest(".code");
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code.dataset.code).then(() => { const old = code.textContent; code.textContent = "Copied"; setTimeout(() => (code.textContent = old), 1400); }).catch(() => {});
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $$('.info[aria-expanded="true"]').forEach((b) => b.setAttribute("aria-expanded", "false"));
      $$(".tipwrap").forEach((w) => w.classList.add("dismissed"));
    }
    const pill = e.target.closest && e.target.closest(".pill");
    if (pill && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const all = $$(".pill", pill.parentElement), i = all.indexOf(pill), nx = all[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (nx) { nx.click(); const again = $$(".pill", pill.parentElement)[i + (e.key === "ArrowRight" ? 1 : -1)]; if (again) again.focus(); }
    }
  });
  function placeTip(btn) {
    const w = btn.closest(".tipwrap");
    w.classList.remove("edge-l", "edge-r");
    const r = btn.getBoundingClientRect();
    if (r.left < 150) w.classList.add("edge-l"); else if (window.innerWidth - r.right < 150) w.classList.add("edge-r");
  }
  document.addEventListener("pointerover", (e) => { const b = e.target.closest && e.target.closest(".info"); if (b) placeTip(b); });
  document.addEventListener("pointerout", (e) => { const w = e.target.closest && e.target.closest(".tipwrap"); if (w && !w.contains(e.relatedTarget)) w.classList.remove("dismissed"); });
  document.addEventListener("focusout", (e) => { const w = e.target.closest && e.target.closest(".tipwrap"); if (w) w.classList.remove("dismissed"); });
  document.addEventListener("focusin", (e) => { const b = e.target.closest && e.target.closest(".info"); if (b) placeTip(b); });
  $("#sport-filter").addEventListener("change", (e) => { state.sport = e.target.value; renderBoard(); });
  $("#market-filter").addEventListener("change", (e) => { state.market = e.target.value; renderBoard(); });

  /* ================= routing ================= */
  const VIEWS = ["board", "record", "nba", "wire", "method"];
  const ALIAS = { news: "wire", methodology: "method", research: "nba", alerts: "board" };
  const rendered = {};
  function route() {
    const h = decodeURIComponent(location.hash.replace("#", ""));
    let v = VIEWS.includes(h) ? h : ALIAS[h] || "board";
    let target = null;
    const wm = h.match(/^week-(\d+)$/);
    if (wm) { state.week = +wm[1]; v = "board"; }
    if (h.startsWith("pick-")) {
      const id = h.slice(5), wk = weeks.find((w) => (w.picks || []).some((p) => p.id === id));
      if (wk) { state.week = wk.week; v = "board"; target = h; }
      else if ((D.nba.nights || []).some((n) => n.picks.some((p) => p.id === id))) {
        state.night = D.nba.nights.find((n) => n.picks.some((p) => p.id === id)).night; v = "nba"; target = h;
      }
    }
    if (h.startsWith("m-")) { v = "method"; target = h; }
    if (h === "alerts") target = "alerts";
    VIEWS.forEach((x) => { $(`#view-${x}`).hidden = x !== v; });
    $$(".nav a").forEach((a) => { if (a.dataset.tab === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.title = { board: "Closing Line Club: betting research with receipts", record: "Performance record | Closing Line Club", nba: "NBA research | Closing Line Club",
      wire: "News wire | Closing Line Club", method: "Methodology | Closing Line Club" }[v];
    if (v === "board") { renderBoard(); if (!rendered.board) { renderStanding(); renderBoardSummary(); renderVenues(); rendered.board = 1; } }
    if (v === "record") renderRecord();
    if (v === "nba") renderNba();
    if (v === "wire") renderWire();
    if (v === "method" && !rendered.method) { renderHistory($("#method-history")); rendered.method = 1; }
    if (target) {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ block: "start" });
        const btn = el.classList.contains("row") && $(".more", el);
        if (btn && btn.getAttribute("aria-expanded") !== "true") btn.click();
      }
    } else window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // methodology: highlight the section in view
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) $$(".toc a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${en.target.id}`));
    }), { rootMargin: "-30% 0px -60% 0px" });
    $$(".prose section").forEach((s) => io.observe(s));
  }

  if (!RAW) $("#data-error").hidden = false;
  if (D.picks.generated_at) $("#updated").textContent = `Picks last changed ${when(D.picks.generated_at)}.`;
  route();
})();
