"use client";

import { useEffect, useRef, useState } from "react";

const C = 289; // circumference of the progress ring (r=46)

type Props = {
  icon: string; // trusted static SVG inner markup
  ms: number;
  onDone: () => void;
  done?: boolean;
  disabled?: boolean;
  label: string;
  idle: string;
  busy: string;
  doneText: string;
};

/** Press-and-hold ring button. Mouse, touch and Space/Enter all work. */
export default function HoldButton({ icon, ms, onDone, done, disabled, label, idle, busy, doneText }: Props) {
  const bar = useRef<SVGCircleElement>(null);
  const raf = useRef(0);
  const t0 = useRef(0);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;
  const [holding, setHolding] = useState(false);
  const [retry, setRetry] = useState(false);

  const set = (p: number) => {
    if (bar.current) bar.current.style.strokeDashoffset = String(C * (1 - p));
  };

  useEffect(() => {
    if (done) set(1);
    return () => cancelAnimationFrame(raf.current);
  }, [done]);

  const start = () => {
    if (raf.current || disabled || done) return;
    t0.current = performance.now();
    if (bar.current) bar.current.style.transition = "none";
    setHolding(true);
    const loop = (now: number) => {
      const p = Math.min((now - t0.current) / ms, 1);
      set(p);
      if (p < 1) {
        raf.current = requestAnimationFrame(loop);
      } else {
        raf.current = 0;
        setHolding(false);
        navigator.vibrate?.(40);
        doneCb.current();
      }
    };
    raf.current = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (!raf.current) return;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    setHolding(false);
    setRetry(true);
    if (bar.current) bar.current.style.transition = "stroke-dashoffset .35s";
    set(0);
  };

  const status = done ? doneText : holding ? busy : retry ? "Try again" : idle;

  return (
    <div className="scanwrap">
      <button
        type="button"
        className={`scan${holding ? " hold" : ""}${done ? " ok" : ""}`}
        aria-label={label}
        disabled={disabled && !done}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.code === "Space" || e.code === "Enter") stop();
        }}
      >
        <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="track" cx="50" cy="50" r="46" />
          <circle className="bar" cx="50" cy="50" r="46" ref={bar} />
        </svg>
        <svg className="ico" viewBox="0 0 64 64" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
        <i className="beam" />
      </button>
      <div className="status" role="status">
        {status}
      </div>
    </div>
  );
}
