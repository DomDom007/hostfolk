// Hostfolk: tickets, dietary forms, a waiting list and the numbers for people who run supper clubs at home.
import { useState } from "react";
import { moneyFmt } from "./lib/money";
import { waLink } from "./lib/share";
import { uid, useStored } from "./lib/store";
import { useShared } from "./lib/useShared";
import { addDays, prettyDate, todayISO } from "./lib/time";
import { CurrencySelect, Section, ShareBox, Stat, Stats } from "./ui/kit";

const T = "hostfolk";
type Guest = { id: string; name: string; seats: number; paid: boolean; diet: string; waitlist: boolean };
type Event = { id: string; date: string; time: string; theme: string; menu: string; seats: number; price: number; cost: number; guests: Guest[] };
type Club = { name: string; host: string; phone: string; area: string; currency: string; about: string };
const SAMPLE_EV: Event[] = [{
  id: "ev1", date: addDays(todayISO(), 9), time: "20:00", theme: "Sfaxian home cooking", seats: 12, price: 70, cost: 22,
  menu: "Chorba frik with lamb\nMloukhia, slow cooked for 8 hours\nFish couscous from Sfax\nBambalouni with orange blossom honey",
  guests: [{ id: "g1", name: "Julia + 1", seats: 2, paid: true, diet: "No pork", waitlist: false }, { id: "g2", name: "Mehdi", seats: 1, paid: true, diet: "", waitlist: false }, { id: "g3", name: "The Ben Alis", seats: 4, paid: false, diet: "One vegetarian, one nut allergy", waitlist: false }, { id: "g4", name: "Sonia", seats: 2, paid: false, diet: "", waitlist: true }],
}];

function EventPage({ c, e }: { c: Club; e: Event }) {
  const [me, setMe] = useState({ name: "", seats: "2", diet: "" });
  const money = moneyFmt(c.currency);
  const left = e.seats - e.guests.filter(g => !g.waitlist).reduce((a, g) => a + g.seats, 0);
  return (
    <div className="stack">
      <section className="panel hf-hero"><p className="eyebrow">{c.name} · {c.area}</p><h2>{e.theme}</h2><p>{prettyDate(e.date)} at {e.time} · {money(e.price)} per person · {left > 0 ? `${left} seats left` : "Full, join the waiting list"}</p><p className="note" style={{ marginTop: 6 }}>{c.about}</p></section>
      <Section title="The menu"><ol className="hf-menu">{e.menu.split("\n").filter(Boolean).map((m, i) => <li key={i}>{m}</li>)}</ol></Section>
      <Section title={left > 0 ? "Book seats" : "Join the waiting list"}>
        <div className="row"><label className="field"><span>Name</span><input className="input" value={me.name} onChange={x => setMe({ ...me, name: x.target.value })} /></label><label className="field" style={{ flex: "0 0 90px" }}><span>Seats</span><input className="input num" value={me.seats} onChange={x => setMe({ ...me, seats: x.target.value })} /></label></div>
        <label className="field" style={{ marginTop: 10 }}><span>Allergies or dietary needs for anyone in your group</span><input className="input" value={me.diet} onChange={x => setMe({ ...me, diet: x.target.value })} /></label>
        <a className="btn primary" style={{ marginTop: 12 }} aria-disabled={!me.name.trim()} href={me.name.trim() ? waLink(`Hello ${c.host}! ${left > 0 ? "I'd like to book" : "Please add me to the waiting list for"} ${me.seats} seat(s) at "${e.theme}" on ${prettyDate(e.date)}.${me.diet ? ` Dietary: ${me.diet}.` : " No dietary needs."} ${me.name}`, c.phone) : undefined} target="_blank" rel="noreferrer">Send to {c.host} on WhatsApp</a>
        <p className="note" style={{ marginTop: 8 }}>{c.host} confirms your seats and how to pay.</p>
      </Section>
    </div>
  );
}

export default function Hostfolk() {
  const shared = useShared<{ c: Club; e: Event }>();
  const [club, setClub] = useStored<Club>(T, "club", { name: "Table de Nadia", host: "Nadia", phone: "", area: "Carthage, near the Roman villas", currency: "TND", about: "One long table in my family's home. Everyone eats together. Bring your own wine if you like." });
  const [events, setEvents] = useStored<Event[]>(T, "events", SAMPLE_EV);
  const [openId, setOpenId] = useState(events[0]?.id ?? "");
  const [ng, setNg] = useState({ name: "", seats: "2", diet: "" });
  const css = <style>{`.hf-hero h2{font-size:clamp(34px,5vw,52px);line-height:1.05;margin:6px 0}.hf-menu{margin:0;padding-left:20px;display:grid;gap:6px;font-family:var(--serif);font-size:20px}.hf-g{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}`}</style>;
  if (shared.loading) return <p className="empty-note">Opening…</p>;
  if (shared.data) return <>{css}<EventPage c={shared.data.c} e={shared.data.e} /></>;

  const e = events.find(x => x.id === openId) ?? events[0];
  const money = moneyFmt(club.currency);
  const setE = (p: Partial<Event>) => setEvents(events.map(x => (x.id === e.id ? { ...x, ...p } : x)));
  const setG = (id: string, p: Partial<Guest>) => setE({ guests: e.guests.map(g => (g.id === id ? { ...g, ...p } : g)) });
  const seated = e ? e.guests.filter(g => !g.waitlist) : [];
  const taken = seated.reduce((a, g) => a + g.seats, 0);
  const revenue = seated.filter(g => g.paid).reduce((a, g) => a + g.seats * e.price, 0), expected = taken * e?.price;
  const profit = expected - taken * (e?.cost ?? 0);
  const diets = seated.filter(g => g.diet.trim());

  return (
    <div className="stack">{css}
      <div className="row" style={{ alignItems: "flex-end" }}>
        <label className="field" style={{ flex: "0 1 320px" }}><span>Dinner</span><select className="input" value={e?.id} onChange={x => setOpenId(x.target.value)}>{events.map(x => <option key={x.id} value={x.id}>{prettyDate(x.date)} · {x.theme}</option>)}</select></label>
        <button className="btn small" onClick={() => { const n: Event = { id: uid(), date: addDays(todayISO(), 21), time: "20:00", theme: "New dinner", menu: "", seats: 12, price: e?.price ?? 60, cost: e?.cost ?? 20, guests: [] }; setEvents([...events, n]); setOpenId(n.id); }}>New dinner</button>
      </div>
      {e && <>
        <Section title={e.theme}>
          <Stats><Stat value={`${taken}/${e.seats}`} label="Seats taken" tone={taken >= e.seats ? "good" : undefined} /><Stat value={e.guests.filter(g => g.waitlist).reduce((a, g) => a + g.seats, 0)} label="On the waiting list" /><Stat value={money(revenue)} label={`Paid of ${money(expected)}`} /><Stat value={money(profit)} label="Profit after food" tone="good" /></Stats>
        </Section>
        <div className="grid2">
          <Section title="The dinner">
            <div className="stack" style={{ gap: 10 }}>
              <div className="row"><label className="field"><span>Date</span><input type="date" className="input" value={e.date} onChange={x => setE({ date: x.target.value })} /></label><label className="field"><span>Time</span><input type="time" className="input" value={e.time} onChange={x => setE({ time: x.target.value })} /></label></div>
              <label className="field"><span>Theme</span><input className="input" value={e.theme} onChange={x => setE({ theme: x.target.value })} /></label>
              <label className="field"><span>Menu, one course per line</span><textarea className="input" rows={4} value={e.menu} onChange={x => setE({ menu: x.target.value })} /></label>
              <div className="row"><label className="field"><span>Seats</span><input className="input num" value={e.seats} onChange={x => setE({ seats: parseInt(x.target.value) || 0 })} /></label><label className="field"><span>Ticket price</span><input className="input num" value={e.price} onChange={x => setE({ price: parseFloat(x.target.value) || 0 })} /></label><label className="field"><span>Food cost per guest</span><input className="input num" value={e.cost} onChange={x => setE({ cost: parseFloat(x.target.value) || 0 })} /></label></div>
            </div>
          </Section>
          <Section title="Invite guests"><ShareBox slug={T} data={{ c: club, e }} label="Copy booking link" message={`${club.name}: ${e.theme}, ${prettyDate(e.date)}. Book here:`} /></Section>
        </div>
        <Section title="Guest list">
          {e.guests.map(g => <div key={g.id} className="hf-g" style={{ opacity: g.waitlist ? 0.6 : 1 }}>
            <strong style={{ flex: 1 }}>{g.name} <span className="note">{g.seats} seat{g.seats > 1 ? "s" : ""}</span>{g.diet && <span className="pill warn" style={{ marginLeft: 6 }}>{g.diet}</span>}</strong>
            {g.waitlist ? <><span className="pill">Waiting list</span><button className="btn small" disabled={taken + g.seats > e.seats} onClick={() => setG(g.id, { waitlist: false })}>Give seats</button></> : <label className="check"><input type="checkbox" checked={g.paid} onChange={x => setG(g.id, { paid: x.target.checked })} />Paid</label>}
            <button className="btn ghost small danger" onClick={() => setE({ guests: e.guests.filter(x => x.id !== g.id) })}>×</button></div>)}
          <form className="row" style={{ marginTop: 10 }} onSubmit={x => { x.preventDefault(); if (!ng.name.trim()) return; const s = parseInt(ng.seats) || 1; setE({ guests: [...e.guests, { id: uid(), name: ng.name.trim(), seats: s, paid: false, diet: ng.diet, waitlist: taken + s > e.seats }] }); setNg({ name: "", seats: "2", diet: "" }); }}>
            <input className="input" style={{ flex: 2 }} aria-label="Guest" placeholder="Guest name" value={ng.name} onChange={x => setNg({ ...ng, name: x.target.value })} /><input className="input num" style={{ width: 70 }} aria-label="Seats" value={ng.seats} onChange={x => setNg({ ...ng, seats: x.target.value })} /><input className="input" style={{ flex: 2 }} aria-label="Dietary needs" placeholder="Dietary needs" value={ng.diet} onChange={x => setNg({ ...ng, diet: x.target.value })} /><button className="btn small" type="submit">Add guest</button>
          </form>
        </Section>
        <Section title="For the kitchen">
          {diets.length ? diets.map(g => <p key={g.id}><strong>{g.name}:</strong> {g.diet}</p>) : <p className="empty-note">No dietary needs so far.</p>}
          <p className="note" style={{ marginTop: 8 }}>Shopping for {taken} guests at about {money(e.cost)} each: {money(taken * e.cost)}.</p>
        </Section>
      </>}
      <Section title="Your supper club">
        <div className="row"><label className="field"><span>Name</span><input className="input" value={club.name} onChange={x => setClub({ ...club, name: x.target.value })} /></label><label className="field"><span>Host</span><input className="input" value={club.host} onChange={x => setClub({ ...club, host: x.target.value })} /></label><label className="field"><span>WhatsApp</span><input className="input" value={club.phone} onChange={x => setClub({ ...club, phone: x.target.value })} /></label><CurrencySelect id="hf-cur" value={club.currency} onChange={cc => setClub({ ...club, currency: cc })} /></div>
        <div className="row" style={{ marginTop: 10 }}><label className="field"><span>Area (share the exact address only after booking)</span><input className="input" value={club.area} onChange={x => setClub({ ...club, area: x.target.value })} /></label><label className="field" style={{ flexGrow: 2 }}><span>About</span><input className="input" value={club.about} onChange={x => setClub({ ...club, about: x.target.value })} /></label></div>
      </Section>
    </div>
  );
}
