// Strategy register: what each strategy is and how it will be judged.
// Edit in the PRIVATE repo (nfl-odds-logger -> site/strategies.js -> pencil icon); every site build copies it to the
// public repo, so edits made there are overwritten. Text only: records and progress always come from the data files.
//
// status: base status only. The live status comes from data/picks/strategy_status.csv (summary.status), set by
//         strategy_status.py: real money at >= 30 graded and ROI > +10%, back to paper below +10% (Graham, Nov 2).
//         "paper"    posted before kickoff, graded and counted in the record
//         "experimental" tracked for measurement only (not posted as picks)
//         "retired"  no longer run; its record stays visible
// progress: which data block counts toward the verdict (filled in by app.js from data/bundle.js):
//   "gate" | "cfb" | "cfb_props" (summary.json), "nba" | "h2h" (nba.json)
window.CLC_STRATEGIES = [
  { id: "teasers", sport: "NFL", name: "Two-team teasers", status: "paper", since: "Oct 2026",
    rule: "Six-point teasers on underdogs of +1.5 to +2.5 in games with a total of 49 or less, teased through 3 and 7.",
    verdict: "Backed by closing lines since 2014 (about 78% of legs won), but only a handful of forward picks so far, so not proven. On paper since Nov 2; counted in the record. Reviewed after 25 graded: stops if the leg win rate is under 70%." },
  { id: "nfl-v2", sport: "NFL", name: "Game-day prices, rules v2", status: "paper", since: "Nov 1, 2026",
    rule: "Same picks and posting as rules v1, re-tested with stricter closing-line value.",
    verdict: "Judged once at 150 measurable picks or Jan 13, 2027: average CLV vs Pinnacle's close of at least +1.0 pt with the 95% range above zero, and positive CLV vs Kalshi's close. A pass is followed by a second, untouched paper sample.",
    progress: "gate" },
  { id: "props-midweek", sport: "NFL", name: "Mid-week props model", status: "paper", since: "Oct 21, 2026",
    rule: "Mid-week player-prop prices compared with Pinnacle alone and with Kalshi alone; plays where both agree are flagged.",
    verdict: "Counted in the record. Judged on closing-line value against Pinnacle and Kalshi separately." },
  { id: "sat-preview", sport: "NFL", name: "Saturday preview picks", status: "paper", since: "Oct 28, 2026",
    rule: "Saturday edges against Pinnacle, posted the day before games.",
    verdict: "Counted in the record." },
  { id: "wind", sport: "NFL", name: "Wind Unders angle", status: "paper", since: "Oct 2026",
    rule: "Game-total Unders when the kickoff wind forecast is strong.",
    verdict: "Counted in the record." },
  { id: "cfb", sport: "College football", name: "College game lines", status: "paper", since: "Oct 31, 2026",
    rule: "Same price rule as the NFL picks, in games with no Big Ten or SEC team.",
    verdict: "Judged on closing-line value at 150 measurable picks.", progress: "cfb" },
  { id: "cfb-props", sport: "College football", name: "College player props", status: "paper", since: "Oct 31, 2026",
    rule: "ProphetX player props against Pinnacle in ACC, Big 12 and Notre Dame games (no Big Ten or SEC teams).",
    verdict: "Judged on closing-line value at 150 measurable picks.", progress: "cfb_props" },
  { id: "nba-v31", sport: "NBA", name: "NBA player props, rules v3.1", status: "paper", since: "Oct 28, 2026",
    rule: "An exchange price (Novig or ProphetX) whose break-even after fees is at least 3 points below Kalshi's price.",
    verdict: "Judged at 400 graded picks or Feb 15, 2027: wins at least 3 points above break-even, the 95% range above zero, and a profit.",
    progress: "nba" },
  { id: "nba-h2h", sport: "NBA", name: "NBA matchup test", status: "experimental", since: "Oct 22, 2026",
    rule: "Players whose past results against tonight's opponent rank in the top or bottom 20% of last season's matchups, priced at Kalshi.",
    verdict: "Decided once at 1,500 graded bets or Jan 31, 2027. Passing also needs the net result's 95% range above zero.",
    progress: "h2h" },
  { id: "nfl-v1", sport: "NFL", name: "Game-day prices, rules v1 to v1.1", status: "retired", since: "Oct 15 – Oct 31, 2026",
    rule: "Exchange prices at least 3% better than Pinnacle's no-margin price and 2 points above break-even.",
    verdict: "Retired Oct 31: counting only closing lines Pinnacle actually moved, closing-line value was about zero, so the edge is not proven. Its record stays in full." },
  { id: "nba-v3", sport: "NBA", name: "NBA rules v3 with caps", status: "retired", since: "Oct 26 – 27, 2026",
    rule: "The v3 rule with at most 3 picks per game and 8 per night.",
    verdict: "Replaced by v3.1 on Oct 28 (caps removed). Reported separately; not part of the v3.1 test." },
  { id: "nba-v2", sport: "NBA", name: "NBA rules v2", status: "retired", since: "Posted Oct 22 – 25, 2026",
    rule: "Unders 3%+ and Overs 6%+ against Pinnacle and Kalshi combined.",
    verdict: "Its 'passed' score was mechanical (Kalshi was part of the price it bet against), and results showed no edge. Still tracked, no longer posted." },
  { id: "nba-v1", sport: "NBA", name: "NBA rules v1", status: "retired", since: "Oct 20 – 21, 2026",
    rule: "Exchange prices compared with Pinnacle alone.",
    verdict: "Retired Oct 22 after going 17–39. Its bets are still shown." },
];
