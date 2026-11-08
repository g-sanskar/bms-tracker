"use client";

import {
  Bell, CalendarDays, Check, ChevronDown, CircleDot, Clock3, Copy, Film, Mail,
  MapPin, MessageSquareText, MoreHorizontal, Pause, Play, Plus, Search,
  Sparkles, Trash2, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Channel = "email" | "sms";
type TrackerStatus = "watching" | "paused" | "open";
type Tracker = {
  id: string; movie: string; theatre: string; city: string; date: string;
  format: string;
  channel: Channel; destination: string; status: TrackerStatus;
  lastChecked: string; color: string; bookingUrl?: string;
};

const STORAGE_KEY = "showping-trackers-v1";
const today = new Date();
const isoDate = (offset: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const seedTrackers: Tracker[] = [
  { id:"ramayana-broadway-coimbatore", movie:"Ramayana", theatre:"Broadway Cinemas: Coimbatore", city:"Coimbatore", date:"2026-11-14", format:"IMAX", channel:"sms", destination:"+91 ••••• 1369", status:"watching", lastChecked:"GitHub checks every 5 min", color:"coral", bookingUrl:"https://in.bookmyshow.com/cinemas/coim/broadway-cinemas-coimbatore/buytickets/BWCB/20261114" },
];
const movieSuggestions = ["Ramayana", "The Odyssey", "Project Hail Mary", "Spider-Man: Brand New Day", "Avengers: Secret Wars"];
const theatreSuggestions = ["Broadway Cinemas: Coimbatore", "PVR INOX: Phoenix Marketcity", "Cinepolis: Nexus Shantiniketan", "INOX: R-City Mall", "PVR: Select City Walk"];
const formatOptions = ["IMAX", "IMAX 3D", "IMAX 2D", "3D", "2D"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday:"short", day:"numeric", month:"short" }).format(new Date(`${value}T12:00:00`));
}

function TrackerCard({ tracker, onToggle, onDelete, onCopy }: { tracker: Tracker; onToggle: () => void; onDelete: () => void; onCopy: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isWatching = tracker.status === "watching";
  return (
    <article className="tracker-card">
      <div className={`poster poster-${tracker.color}`} aria-hidden="true">
        <span className="poster-grain" /><Film size={22} strokeWidth={1.6} /><span>{tracker.movie.split(" ").slice(0, 2).join(" ")}</span>
      </div>
      <div className="tracker-content">
        <div className="tracker-title-row">
          <div><div className="status-line"><span className={`status-dot ${isWatching ? "is-live" : ""}`} />{isWatching ? "Watching" : "Paused"}</div><h3>{tracker.movie}</h3></div>
          <div className="menu-wrap">
            <button className="icon-button" type="button" aria-label="Tracker options" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={20} /></button>
            {menuOpen && <div className="card-menu">
              <button type="button" onClick={onCopy}><Copy size={15} />Copy GitHub JSON</button>
              <button type="button" onClick={onToggle}>{isWatching ? <Pause size={15} /> : <Play size={15} />}{isWatching ? "Pause tracker" : "Resume tracker"}</button>
              <button className="danger" type="button" onClick={onDelete}><Trash2 size={15} /> Delete tracker</button>
            </div>}
          </div>
        </div>
        <div className="tracker-meta"><p><MapPin size={15} /> {tracker.theatre}, {tracker.city}</p><p><Film size={15} /> {tracker.format || "Any format"}</p><p><CalendarDays size={15} /> {formatDate(tracker.date)}</p></div>
        <div className="tracker-footer">
          <span className="channel-chip">{tracker.channel === "email" ? <Mail size={14} /> : <MessageSquareText size={14} />}{tracker.destination}</span>
          <span className="last-check"><Clock3 size={14} /> Checked {tracker.lastChecked}</span>
        </div>
      </div>
    </article>
  );
}

function CreateTracker({ onClose, onCreate }: { onClose: () => void; onCreate: (tracker: Tracker) => void }) {
  const [step, setStep] = useState(1);
  const [movie, setMovie] = useState("");
  const [theatre, setTheatre] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [date, setDate] = useState(isoDate(1));
  const [format, setFormat] = useState("IMAX");
  const [bookingUrl, setBookingUrl] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [destination, setDestination] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step === 1) { setStep(2); return; }
    onCreate({ id:crypto.randomUUID(), movie:movie.trim(), theatre:theatre.trim(), city, date, format, bookingUrl:bookingUrl.trim(), channel, destination:destination.trim(), status:"watching", lastChecked:"Local draft", color:["coral","violet","blue"][Math.floor(Math.random()*3)] });
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="step-eyebrow">STEP {step} OF 2</div>
        <h2 id="create-title">{step === 1 ? "What should we watch?" : "Where should we ping you?"}</h2>
        <p className="modal-intro">{step === 1 ? "Choose one movie, theatre and show date. You can add more trackers later." : "We’ll use this channel once live delivery is connected."}</p>
        <div className="step-track" aria-label={`Step ${step} of 2`}><span style={{ width:`${step*50}%` }} /></div>
        <form onSubmit={submit}>
          {step === 1 ? <div className="form-stack">
            <label>Movie<span className="field-shell"><Search size={17} /><input list="movies" required value={movie} onChange={(event) => setMovie(event.target.value)} placeholder="Search for a movie" autoFocus /></span><datalist id="movies">{movieSuggestions.map((item) => <option key={item} value={item} />)}</datalist></label>
            <div className="form-grid">
              <label>City<span className="select-shell"><MapPin size={17} /><select value={city} onChange={(event) => setCity(event.target.value)}><option>Coimbatore</option><option>Mumbai</option><option>Delhi NCR</option><option>Bengaluru</option><option>Hyderabad</option><option>Chennai</option><option>Pune</option></select><ChevronDown size={16} /></span></label>
              <label>Date<span className="field-shell"><CalendarDays size={17} /><input required type="date" min={isoDate(0)} value={date} onChange={(event) => setDate(event.target.value)} /></span></label>
            </div>
            <label>Theatre<span className="field-shell"><MapPin size={17} /><input list="theatres" required value={theatre} onChange={(event) => setTheatre(event.target.value)} placeholder="Search for a theatre" /></span><datalist id="theatres">{theatreSuggestions.map((item) => <option key={item} value={item} />)}</datalist></label>
            <label>Format<span className="select-shell"><Film size={17} /><select value={format} onChange={(event) => setFormat(event.target.value)}><option value="">Any format</option>{formatOptions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} /></span></label>
            <label>BookMyShow theatre/date URL<span className="field-shell"><Film size={17} /><input required type="url" pattern="https://in\.bookmyshow\.com/.*/buytickets/.*" value={bookingUrl} onChange={(event) => setBookingUrl(event.target.value)} placeholder="https://in.bookmyshow.com/.../buytickets/.../20261218" /></span></label>
          </div> : <div className="form-stack">
            <div className="channel-toggle" role="group" aria-label="Notification channel">
              <button type="button" disabled><Mail size={19} /><span><b>Email</b><small>Coming next</small></span></button>
              <button type="button" className={channel === "sms" ? "selected" : ""} onClick={() => setChannel("sms")}><MessageSquareText size={19} /><span><b>SMS</b><small>Powered by Twilio</small></span>{channel === "sms" && <Check size={16} />}</button>
            </div>
            <label>Mobile number<span className="field-shell"><MessageSquareText size={17} /><input required type="tel" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="+91 98765 43210" autoFocus /></span></label>
            <div className="summary-box"><Sparkles size={17} /><span>This creates a local draft for {format || "any format"}. Copy its GitHub JSON into <b>data/trackers.json</b>; the scheduled Action will then check every 5 minutes and send one SMS when booking opens.</span></div>
          </div>}
          <div className="modal-actions">{step === 2 && <button className="button secondary" type="button" onClick={() => setStep(1)}>Back</button>}<button className="button primary" type="submit">{step === 1 ? "Continue" : "Start watching"}</button></div>
        </form>
      </section>
    </div>
  );
}

export function TrackerApp() {
  const [trackers, setTrackers] = useState<Tracker[]>(seedTrackers);
  const [ready, setReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TrackerStatus>("all");
  const [toast, setToast] = useState("");
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setTrackers(JSON.parse(saved)); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(trackers)); }, [ready, trackers]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(id); }, [toast]);
  const visibleTrackers = useMemo(() => trackers.filter((tracker) => (filter === "all" || tracker.status === filter) && `${tracker.movie} ${tracker.theatre} ${tracker.city} ${tracker.format || ""}`.toLowerCase().includes(search.toLowerCase())), [filter, search, trackers]);
  const createTracker = (tracker: Tracker) => { setTrackers((current) => [tracker, ...current]); setCreating(false); setToast(`Draft saved. Copy ${tracker.movie} as GitHub JSON from its menu.`); };
  const toggleTracker = (id: string) => setTrackers((current) => current.map((tracker) => tracker.id === id ? { ...tracker, status:tracker.status === "watching" ? "paused" : "watching" } : tracker));
  const copyTrackerConfig = async (tracker: Tracker) => {
    const movieSlug = tracker.movie.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 44);
    const citySlug = tracker.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const config = { id:`${movieSlug || "movie"}-${citySlug}`, active:tracker.status === "watching", movie:tracker.movie, aliases:[], theatre:tracker.theatre, city:tracker.city, date:tracker.date, ...(tracker.format ? { format:tracker.format } : {}), bookingUrl:tracker.bookingUrl || "PASTE_EXACT_BUYTICKETS_URL" };
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setToast("GitHub tracker JSON copied");
  };
  const testNotification = async () => {
    if (!("Notification" in window)) { setToast("Browser notifications aren’t supported here"); return; }
    const permission = await Notification.requestPermission();
    if (permission === "granted") { new Notification("ShowPing test", { body:"Your alert flow is ready for a live delivery provider." }); setToast("Test notification sent"); }
    else setToast("Notification permission wasn’t granted");
  };
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ShowPing home"><span className="brand-mark"><Bell size={18} fill="currentColor" /></span><span>Show<span>Ping</span></span></a>
        <nav aria-label="Primary navigation"><a className="active" href="#trackers">Trackers</a><a href="#how-it-works">How it works</a></nav>
        <div className="top-actions"><span className="preview-pill"><CircleDot size={12} /> Actions ready</span><button className="avatar" type="button" aria-label="Account">SP</button></div>
      </header>
      <section className="hero" id="top">
        <div><div className="eyebrow"><span /> YOUR BOOKING SENTINEL</div><h1>Don’t refresh.<br /><em>We’ll watch the seats.</em></h1><p>Pick a movie, theatre, format and date. ShowPing keeps an eye on booking status so you can get there before the good seats go.</p><div className="hero-actions"><button className="button primary large" type="button" onClick={() => setCreating(true)}><Plus size={18} /> Create a tracker</button><button className="text-button" type="button" onClick={testNotification}><Bell size={16} /> Test browser alert</button></div></div>
        <div className="hero-visual" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="ticket-card back-ticket"><span>BOOKING</span><b>WATCH</b><small>05 MIN CHECKS</small></div><div className="ticket-card front-ticket"><span className="ticket-icon"><Bell size={25} /></span><div><small>THE MOMENT IT OPENS</small><b>You’re first to know.</b></div><span className="ticket-check"><Check size={17} /></span></div><span className="spark spark-one">✦</span><span className="spark spark-two">✦</span></div>
      </section>
      <section className="dashboard" id="trackers">
        <div className="section-heading"><div><span className="section-kicker">DASHBOARD</span><h2>Your tracker drafts</h2><p>{trackers.filter((item) => item.status === "watching").length} enabled locally · GitHub Actions checks committed trackers every 5 minutes</p></div><button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={17} /> New tracker</button></div>
        <div className="toolbar"><div className="filters" role="group" aria-label="Filter trackers">{(["all","watching","paused"] as const).map((item) => <button key={item} type="button" className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item === "all" ? `All ${trackers.length}` : item[0].toUpperCase()+item.slice(1)}</button>)}</div><label className="search-box"><Search size={16} /><span className="sr-only">Search trackers</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search trackers" /></label></div>
        <div className="tracker-list">{visibleTrackers.map((tracker) => <TrackerCard key={tracker.id} tracker={tracker} onCopy={() => copyTrackerConfig(tracker)} onToggle={() => toggleTracker(tracker.id)} onDelete={() => { setTrackers((current) => current.filter((item) => item.id !== tracker.id)); setToast("Tracker deleted"); }} />)}{visibleTrackers.length === 0 && <div className="empty-state"><Search size={24} /><h3>No trackers found</h3><p>Try a different search or create a new tracker.</p></div>}</div>
      </section>
      <section className="how-section" id="how-it-works">
        <div className="section-heading compact"><div><span className="section-kicker">THE SHORT VERSION</span><h2>From wishlist to watchlist.</h2></div></div>
        <div className="how-grid"><article><span>01</span><Film size={22} /><h3>Tell us the show</h3><p>Choose the exact movie, city, theatre, format and date you care about.</p></article><article><span>02</span><Clock3 size={22} /><h3>We keep watch</h3><p>A production checker polls availability and stops after the date passes.</p></article><article><span>03</span><Bell size={22} /><h3>Get the ping</h3><p>Connect an email or SMS provider and get one alert the moment booking opens.</p></article></div>
        <div className="integration-note"><span className="note-icon"><Sparkles size={18} /></span><div><b>GitHub monitor ready</b><p>The repository now contains the scheduled checker, transition-only SMS delivery, deduplication state, dry-run support and tests. Add the copied JSON to data/trackers.json and configure the Twilio repository secrets to activate it.</p></div></div>
      </section>
      <footer><a className="brand muted" href="#top"><span className="brand-mark"><Bell size={16} fill="currentColor" /></span><span>Show<span>Ping</span></span></a><p>Built for movie nights, not endless refreshes.</p><span>Unofficial companion · Not affiliated with BookMyShow</span></footer>
      {creating && <CreateTracker onClose={() => setCreating(false)} onCreate={createTracker} />}{toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}
    </main>
  );
}
