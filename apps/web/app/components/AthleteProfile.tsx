"use client";

import { useEffect, useRef, useState } from "react";
import { fetchProfile, saveProfile } from "../../lib/api";
import { ledgerInput, ledgerPrimaryBtn } from "./ledger/forms";

export function AthleteProfile() {
  const [bio, setBio] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        setBio(p.bio ?? "");
        setWeeklyHours(p.weeklyTrainingHours != null ? String(p.weeklyTrainingHours) : "");
        setDaysPerWeek(p.trainingDaysPerWeek != null ? String(p.trainingDaysPerWeek) : "");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function handleSave() {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    try {
      await saveProfile({
        bio: bio.trim() || null,
        weeklyTrainingHours: weeklyHours ? parseInt(weeklyHours) : null,
        trainingDaysPerWeek: daysPerWeek ? parseInt(daysPerWeek) : null,
      });
      setStatus("saved");
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      timer.current = setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="lx-eyebrow mb-2 block">About you</label>
        <textarea
          rows={4}
          placeholder="e.g. I'm a 35-year-old recreational cyclist/runner. I currently train 4–5 hours per week and want to build up to running a half marathon. I have a solid aerobic base but limited time for long sessions on weekdays."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ ...ledgerInput, resize: "none" }}
        />
        <p className="lx-sans mt-1.5 text-xs" style={{ color: "var(--ink-3)" }}>
          The AI coach uses this to personalise training suggestions.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="lx-eyebrow mb-2 block">Weekly training hours</label>
          <input type="number" min={0} max={40} placeholder="e.g. 6" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} style={ledgerInput} />
        </div>
        <div className="flex-1">
          <label className="lx-eyebrow mb-2 block">Days per week</label>
          <input type="number" min={1} max={7} placeholder="e.g. 4" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} style={ledgerInput} />
        </div>
      </div>

      <button onClick={handleSave} disabled={status === "saving"} className="self-start transition-opacity disabled:opacity-50" style={ledgerPrimaryBtn}>
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Error — retry" : "Save profile"}
      </button>
    </div>
  );
}
