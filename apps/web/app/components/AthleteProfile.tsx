"use client";

import { useEffect, useRef, useState } from "react";
import { fetchProfile, saveProfile } from "../../lib/api";

export function AthleteProfile() {
  const [bio, setBio] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchProfile().then((p) => {
      setBio(p.bio ?? "");
      setWeeklyHours(p.weeklyTrainingHours != null ? String(p.weeklyTrainingHours) : "");
      setDaysPerWeek(p.trainingDaysPerWeek != null ? String(p.trainingDaysPerWeek) : "");
    });
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
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          About you
        </label>
        <textarea
          rows={4}
          placeholder="e.g. I'm a 35-year-old recreational cyclist/runner. I currently train 4–5 hours per week and want to build up to running a half marathon. I have a solid aerobic base but limited time for long sessions on weekdays."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(255,255,255,0.12)",
          }}
        />
        <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          The AI coach uses this to personalise training suggestions.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Weekly training hours
          </label>
          <input
            type="number"
            min={0}
            max={40}
            placeholder="e.g. 6"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.12)",
            }}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Days per week
          </label>
          <input
            type="number"
            min={1}
            max={7}
            placeholder="e.g. 4"
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.12)",
            }}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={status === "saving"}
        className="self-start rounded-xl px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Error — retry" : "Save profile"}
      </button>
    </div>
  );
}
