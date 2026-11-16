"use client";

import { useEffect, useRef, useState } from "react";
import HoldButton from "./HoldButton";
import { getSupabase } from "@/lib/supabase";

type Age = "young" | "mid" | "senior";
type Method = "face" | "finger" | "palm";

const STEPS = ["Sign up", "Bank", "Biometric", "Scan", "Activate", "Pay"];
const AGE_LABEL: Record<Age, string> = { young: "16-25", mid: "26-40", senior: "41+" };
const LABEL_AGE: Record<string, Age> = { "16-25": "young", "26-40": "mid", "41+": "senior" };
const BANKS = ["NBK", "KFH", "Gulf Bank", "Boubyan", "Burgan", "CBK"];
const METHODS: Record<Method, string> = { face: "Face", finger: "Fingerprint", palm: "Palm" };
const ICONS: Record<Method, string> = {
  face: '<rect x="10" y="10" width="44" height="44" rx="14"/><path d="M24 26v3M40 26v3M32 28v8h-3M24 42c5 4 11 4 16 0"/>',
  finger:
    '<path d="M16 24c4-8 12-12 20-10 8 2 12 9 12 16v4"/><path d="M12 34c0-4 1-8 3-11"/><path d="M20 50c2-4 3-8 3-13 0-6 4-10 9-10s9 4 9 10c0 6-1 11-4 16"/><path d="M30 52c2-5 2-9 2-15"/><path d="M13 42c0 4-1 7-3 9"/>',
  palm: '<path d="M20 34V20a3 3 0 0 1 6 0v10M26 30V12a3 3 0 0 1 6 0v18M32 30V14a3 3 0 0 1 6 0v16M38 30V20a3 3 0 0 1 6 0v22c0 10-6 14-12 14s-10-4-13-10l-6-9a3 3 0 0 1 5-3l4 5"/>',
};

const kwd = (n: number) => "KWD " + n.toFixed(3);
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));
const newPrice = () => Math.round((1 + Math.random() * 4) * 1000) / 1000;
const msg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message || "Something went wrong");

export default function Flow() {
  const [age, setAgeState] = useState<Age>("young");
  const [step, setStep] = useState(0);
  const [back, setBack] = useState(false);
  const [name, setName] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [bank, setBank] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [method, setMethod] = useState<Method | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [price, setPrice] = useState(newPrice);
  const [paid, setPaid] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stage = useRef<HTMLDivElement>(null);

  const setAge = (a: Age) => {
    setAgeState(a);
    document.documentElement.dataset.theme = a;
  };

  const go = (i: number) => {
    setBack(i < step);
    setErr("");
    setStep(i);
  };

  useEffect(() => {
    stage.current?.querySelector<HTMLElement>("h1,h2")?.focus({ preventScroll: true });
  }, [step]);

  /** After sign-in, load saved progress and jump to the right step. */
  const resume = async () => {
    const sb = getSupabase();
    const [p, b, m] = await Promise.all([
      sb.from("pwy_profiles").select("name,age_range").maybeSingle(),
      sb.from("pwy_bank_links").select("bank,balance").maybeSingle(),
      sb.from("pwy_biometric_enrollments").select("method,print_id,active").maybeSingle(),
    ]);
    if (p.data) {
      setName(p.data.name);
      setAge(LABEL_AGE[p.data.age_range] ?? "young");
    }
    setSignedIn(true);
    if (b.data) {
      setBank(b.data.bank);
      setBalance(Number(b.data.balance));
    }
    if (m.data) {
      setMethod(m.data.method as Method);
      setPrintId(m.data.print_id);
      setActive(m.data.active);
    }
    setBack(false);
    setStep(!b.data ? 2 : !m.data ? 3 : !m.data.active ? 5 : 6);
  };

  // Restore an existing session on load.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        if (data.session) await resume();
      } catch {
        /* not configured or no session: stay on the hero screen */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
    setSignedIn(false); setName(""); setBank(null); setBalance(0); setMethod(null); setPrintId(null); setActive(false); setPaid(0);
    setAge("young");
    setBack(true);
    setStep(0);
  };

  return (
    <>
      <div className="shapes" aria-hidden="true">
        <i style={{ "--s": "180px", "--x": "-40px", "--y": "12%", "--c": "#ff2bd6", "--d": "7s" } as React.CSSProperties} />
        <i style={{ "--s": "120px", "--x": "70%", "--y": "6%", "--c": "#00f0ff", "--d": "5s" } as React.CSSProperties} />
        <i style={{ "--s": "220px", "--x": "60%", "--y": "62%", "--c": "#b6ff3b", "--d": "9s" } as React.CSSProperties} />
        <i style={{ "--s": "90px", "--x": "12%", "--y": "75%", "--c": "#7a5cff", "--d": "6s" } as React.CSSProperties} />
      </div>

      <header>
        <div className="brand">Pay With You</div>
        <div className="age" role="radiogroup" aria-label="Age range">
          {(Object.keys(AGE_LABEL) as Age[]).map((k) => (
            <button key={k} role="radio" aria-checked={age === k} onClick={() => setAge(k)}>
              {AGE_LABEL[k]}
            </button>
          ))}
        </div>
        <ol className={`progress${step === 0 ? " off" : ""}`} aria-label="Progress" style={{ width: "100%" }}>
          {STEPS.map((n, i) => (
            <li key={n} title={n} className={i + 1 < step ? "done" : i + 1 === step ? "now" : ""} />
          ))}
        </ol>
        <div className="step-name" style={{ width: "100%" }}>
          {step ? STEPS[step - 1] : ""}
          {signedIn && (
            <button className="toplink" style={{ float: "right" }} onClick={signOut}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <main>
        <div id="stage" ref={stage} aria-live="polite">
          <section key={step} className={`screen${back ? " back" : ""}`}>
            {step === 0 && (
              <>
                <h1 tabIndex={-1}>Pay with you.</h1>
                <p className="sub">No card. No phone.</p>
                <div className="row">
                  <button className="btn" onClick={() => go(1)}>Get started</button>
                </div>
              </>
            )}

            {step === 1 && <Auth age={age} setAge={setAge} busy={busy} err={err} onBack={() => go(0)}
              onSubmit={(mode, f) => run(async () => {
                const sb = getSupabase();
                if (mode === "up") {
                  const { data, error } = await sb.auth.signUp({
                    email: f.email, password: f.password,
                    options: { data: { app: "pwy", name: f.name, age_range: AGE_LABEL[age] } },
                  });
                  if (error) throw error;
                  if (!data.session) throw new Error("Check your email to confirm your account, then sign in.");
                } else {
                  const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
                  if (error) throw error;
                }
                await resume();
              })} />}

            {step === 2 && <BankStep bank={bank} balance={balance} busy={busy} err={err}
              onBack={() => go(1)} onNext={() => go(3)}
              onLink={(b) => run(async () => {
                const { data, error } = await getSupabase().rpc("pwy_link_bank", { p_bank: b });
                if (error) throw error;
                setBank(b); setBalance(Number(data));
              })} />}

            {step === 3 && (
              <>
                <h2 tabIndex={-1}>Choose one</h2>
                <div className="methods">
                  {(Object.keys(METHODS) as Method[]).map((k) => (
                    <button key={k} type="button" className={`method${method === k ? " sel" : ""}`}
                      onClick={() => { setMethod(k); setPrintId(null); setActive(false); go(4); }}>
                      <svg viewBox="0 0 64 64" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />
                      {METHODS[k]}
                    </button>
                  ))}
                </div>
                <div className="row"><button className="btn ghost" onClick={() => go(2)}>Back</button></div>
              </>
            )}

            {step === 4 && method && (
              <>
                <h2 tabIndex={-1}>Scan {METHODS[method].toLowerCase()}</h2>
                <HoldButton icon={ICONS[method]} ms={2200} label="Press and hold to scan"
                  idle="Press and hold" busy="Scanning" doneText="Unique print saved ✅"
                  done={!!printId} disabled={busy}
                  onDone={() => run(async () => {
                    const { data, error } = await getSupabase().rpc("pwy_enroll_biometric", { p_method: method });
                    if (error) throw error;
                    setPrintId(String(data));
                  })} />
                <div className="pid">{printId ? "ID " + printId : ""}</div>
                {err && <p className="err" role="alert">{err}</p>}
                <div className="row">
                  <button className="btn ghost" onClick={() => go(3)}>Change</button>
                  <button className="btn" disabled={!printId} onClick={() => go(5)}>Continue</button>
                </div>
              </>
            )}

            {step === 5 && (active ? (
              <>
                <h2 tabIndex={-1}>You&apos;re live ✅</h2>
                <p className="sub">Pay with {method ? METHODS[method].toLowerCase() : "you"}.</p>
                <div className="row"><button className="btn" onClick={() => go(6)}>Pay now</button></div>
              </>
            ) : (
              <>
                <h2 tabIndex={-1}>Activate</h2>
                <div className="methods">
                  <div className="card"><span>{name || "You"}</span><span>{AGE_LABEL[age]}</span></div>
                  <div className="card"><span>{bank}</span><span>{kwd(balance)}</span></div>
                  <div className="card"><span>{method ? METHODS[method] : ""}</span><span>{printId}</span></div>
                </div>
                {err && <p className="err" role="alert">{err}</p>}
                <div className="row">
                  <button className="btn ghost" onClick={() => go(4)}>Back</button>
                  <button className="btn" disabled={busy} onClick={() => run(async () => {
                    const { error } = await getSupabase().rpc("pwy_activate_biometric");
                    if (error) throw error;
                    setActive(true);
                  })}>Activate</button>
                </div>
              </>
            ))}

            {step === 6 && method && (paid ? (
              <>
                <h2 tabIndex={-1}>Paid ✅</h2>
                <div className="card"><span>Coffee shop</span><span>{kwd(paid)}</span></div>
                <p className="sub">Balance {kwd(balance)}</p>
                <div className="row">
                  <button className="btn" onClick={() => { setPaid(0); setPrice(newPrice()); }}>Pay again</button>
                </div>
              </>
            ) : (
              <>
                <h2 tabIndex={-1}>Pay</h2>
                <div className="card"><span>Coffee shop</span><span>{kwd(price)}</span></div>
                <HoldButton icon={ICONS[method]} ms={1500} label="Press and hold to pay"
                  idle={price > balance ? "Not enough balance" : "Hold to pay"} busy="Paying" doneText="Paid"
                  disabled={busy || price > balance}
                  onDone={() => run(async () => {
                    const { data, error } = await getSupabase().rpc("pwy_make_payment", { p_merchant: "Coffee shop", p_amount: price });
                    if (error) throw error;
                    setBalance(Number(data)); setPaid(price);
                  })} />
                {err && <p className="err" role="alert">{err}</p>}
                <div className="row"><button className="btn ghost" onClick={() => go(5)}>Back</button></div>
              </>
            ))}
          </section>
        </div>
      </main>

      <footer><span className="demo">Demo only</span></footer>
    </>
  );
}

function Auth(props: {
  age: Age; setAge: (a: Age) => void; busy: boolean; err: string; onBack: () => void;
  onSubmit: (mode: "up" | "in", f: { name: string; email: string; password: string }) => void;
}) {
  const [mode, setMode] = useState<"up" | "in">("up");
  return (
    <>
      <h2 tabIndex={-1}>{mode === "up" ? "Sign up" : "Sign in"}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          props.onSubmit(mode, {
            name: String(f.get("name") ?? "").trim(),
            email: String(f.get("email") ?? "").trim(),
            password: String(f.get("password") ?? ""),
          });
        }}
      >
        {mode === "up" && (
          <label className="field"><span>Name</span>
            <input name="name" required maxLength={80} placeholder="Your name" autoComplete="name" /></label>
        )}
        <label className="field"><span>Email</span>
          <input name="email" type="email" required placeholder="you@example.com" autoComplete="email" /></label>
        <label className="field"><span>Password</span>
          <input name="password" type="password" required minLength={8} placeholder="8+ characters"
            autoComplete={mode === "up" ? "new-password" : "current-password"} /></label>
        {mode === "up" && (
          <div className="field"><span id="ageLbl">Age</span>
            <div className="chips" role="radiogroup" aria-labelledby="ageLbl">
              {(Object.keys(AGE_LABEL) as Age[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={props.age === k} onClick={() => props.setAge(k)}>
                  {AGE_LABEL[k]}
                </button>
              ))}
            </div></div>
        )}
        {props.err && <p className="err" role="alert">{props.err}</p>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={props.onBack}>Back</button>
          <button className="btn" type="submit" disabled={props.busy}>
            {props.busy ? <><span className="spin" />Wait</> : "Continue"}
          </button>
        </div>
        <button type="button" className="link" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? "Have an account? Sign in" : "New here? Sign up"}
        </button>
      </form>
    </>
  );
}

function BankStep(props: {
  bank: string | null; balance: number; busy: boolean; err: string;
  onBack: () => void; onNext: () => void; onLink: (b: string) => void;
}) {
  // Bank connection and the one-time code are simulated for the demo.
  const [stage, setStage] = useState<"pick" | "otp" | "done">(props.bank ? "done" : "pick");
  const [pick, setPick] = useState<string | null>(props.bank);
  const [connecting, setConnecting] = useState(false);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.bank && stage === "otp") setStage("done");
  }, [props.bank, stage]);
  useEffect(() => {
    if (stage === "otp") input.current?.focus({ preventScroll: true });
  }, [stage]);

  if (stage === "pick")
    return (
      <>
        <h2 tabIndex={-1}>Your bank</h2>
        <div className="chips two" role="radiogroup" aria-label="Bank">
          {BANKS.map((b) => (
            <button key={b} type="button" role="radio" aria-checked={pick === b} onClick={() => setPick(b)}>{b}</button>
          ))}
        </div>
        <div className="row">
          <button className="btn ghost" onClick={props.onBack}>Back</button>
          <button className="btn" disabled={!pick || connecting} onClick={() => {
            setConnecting(true);
            setTimeout(() => { setCode(newCode()); setValue(""); setConnecting(false); setStage("otp"); }, 1300);
          }}>{connecting ? <><span className="spin" />Connecting</> : "Connect"}</button>
        </div>
      </>
    );

  if (stage === "otp") {
    const at = Math.min(value.length, 5);
    const slot = (n: number) => (
      <div key={n} className={`slot${n === at ? " on" : ""}${value[n] ? "" : " empty"}`}><span>{value[n] || ""}</span></div>
    );
    return (
      <>
        <h2 tabIndex={-1}>Confirm bank</h2>
        <p className="sub">Code from {pick}</p>
        <form style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (value === code) props.onLink(pick!);
            else { setBad(true); setTimeout(() => { setValue(""); setBad(false); input.current?.focus(); }, 450); }
          }}>
          <div className={`otp${bad ? " bad" : ""}`}>
            <div className="group">{[0, 1, 2].map(slot)}</div><i className="dash" /><div className="group">{[3, 4, 5].map(slot)}</div>
            <input ref={input} id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*"
              aria-label="6-digit code" value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onSelect={(e) => { const t = e.currentTarget; t.setSelectionRange(t.value.length, t.value.length); }} />
          </div>
          <p className="hint" role="status">{bad ? "Wrong code" : <>Demo code: <b>{code}</b></>}</p>
          {props.err && <p className="err" role="alert">{props.err}</p>}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setStage("pick")}>Back</button>
            <button className="btn" type="submit" disabled={value.length < 6 || props.busy}>Confirm</button>
          </div>
          <button type="button" className="link" onClick={() => { setCode(newCode()); setValue(""); input.current?.focus(); }}>Resend</button>
        </form>
      </>
    );
  }

  return (
    <>
      <h2 tabIndex={-1}>Bank linked ✅</h2>
      <div className="card"><span>{props.bank}</span><span>{kwd(props.balance)}</span></div>
      <div className="row"><button className="btn" onClick={props.onNext}>Continue</button></div>
    </>
  );
}
