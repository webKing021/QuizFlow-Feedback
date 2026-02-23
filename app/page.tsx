"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Review, ReviewInsert } from "@/lib/reviews";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ═══════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════ */

const STEPS = [
  { title: "About You", icon: "👋", desc: "Quick intro" },
  { title: "Experience", icon: "💬", desc: "Your journey" },
  { title: "Issues", icon: "🔍", desc: "Help us fix" },
  { title: "Suggestions", icon: "💡", desc: "Shape v2.0" },
];

interface FormData {
  name: string;
  role: "student" | "faculty";
  rating: number;
  experience: string;
  reliabilityRating: number;
  wouldRecommend: boolean | null;
  securityIssues: string;
  bugsGlitches: string;
  databaseIssues: string;
  featureRequests: string;
  uiUxFeedback: string;
  otherFeedback: string;
}

const initialForm: FormData = {
  name: "",
  role: "student",
  rating: 0,
  experience: "",
  reliabilityRating: 0,
  wouldRecommend: null,
  securityIssues: "",
  bugsGlitches: "",
  databaseIssues: "",
  featureRequests: "",
  uiUxFeedback: "",
  otherFeedback: "",
};

/* ═══════════════════════════════════════════════════
   TINY COMPONENTS
   ═══════════════════════════════════════════════════ */

function StarIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={
        "transition-all duration-300 " +
        (filled
          ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
          : "text-slate-200")
      }
      fill="currentColor"
    >
      <path d="M12 17.27l-5.18 3.06 1.64-5.81L3 9.24l5.94-.51L12 3l3.06 5.73 5.94.51-5.46 5.28 1.64 5.81z" />
    </svg>
  );
}

function StarsRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} filled={i < rating} size={16} />
      ))}
    </div>
  );
}

function InteractiveStars({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const active = hover || value;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(n)}
              className={
                "rounded-xl border px-3 py-2.5 transition-all duration-300 " +
                (n <= active
                  ? "border-amber-300 bg-amber-50 shadow-sm scale-105"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:scale-105")
              }
            >
              <StarIcon filled={n <= active} size={22} />
            </button>
          );
        })}
      </div>
      {active > 0 && (
        <span className="text-sm font-medium text-violet-600">
          {labels[active]}
        </span>
      )}
    </div>
  );
}

function AnimatedNumber({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = prevValue.current;
    const obj = { v: start };
    gsap.to(obj, {
      v: value,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = obj.v.toFixed(decimals);
      },
    });
    prevValue.current = value;
  }, [value, decimals]);

  return (
    <span ref={ref} className="stat-number">
      {value.toFixed(decimals)}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Home() {
  const pageSize = 500;

  /* ── Refs ─────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);

  /* ── Mobile detection ── */
  const isMobile = useRef(false);
  useEffect(() => {
    isMobile.current = window.matchMedia("(max-width: 767px)").matches;
  }, []);

  /* ── Form State ──────────────────────────── */
  const [form, setForm] = useState<FormData>({ ...initialForm });
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Reviews State ───────────────────────── */
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "faculty">(
    "all"
  );
  const [visibleCount, setVisibleCount] = useState(12);

  /* ── Update form helper ──────────────────── */
  function updateForm<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  /* ── Computed ─────────────────────────────── */
  const distribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
      1 | 2 | 3 | 4 | 5,
      number
    >;
    for (const r of reviews)
      counts[Math.max(1, Math.min(5, r.rating)) as 1 | 2 | 3 | 4 | 5]++;
    const total = reviews.length;
    const avg =
      total === 0
        ? 0
        : Math.round(
            (reviews.reduce(
              (sum, r) => sum + Math.max(1, Math.min(5, r.rating)),
              0
            ) /
              total) *
              10
          ) / 10;
    return { counts, total, avg };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      return roleFilter === "all" || r.role === roleFilter;
    });
  }, [reviews, roleFilter]);

  useEffect(() => {
    setVisibleCount(12);
  }, [roleFilter]);

  const recommendCount = useMemo(
    () => reviews.filter((r) => r.would_recommend).length,
    [reviews]
  );

  /* ── Data loading ────────────────────────── */
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    let cancelled = false;

    async function load() {
      setError(null);
      setIsLoadingReviews(true);
      try {
        const all: Review[] = [];
        for (let from = 0; !cancelled; from += pageSize) {
          const { data, error } = await sb
            .from("reviews")
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, from + pageSize - 1);
          if (cancelled) return;
          if (error) {
            setError(error.message);
            setIsLoadingReviews(false);
            return;
          }
          const batch = (data ?? []) as Review[];
          all.push(...batch);
          if (batch.length < pageSize) break;
        }
        if (cancelled) return;
        setReviews(all);
        setIsLoadingReviews(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setIsLoadingReviews(false);
      }
    }
    load();

    const channel = sb
      .channel("reviews-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        (payload) => {
          const next = payload.new as Review;
          setReviews((prev) =>
            prev.some((r) => r.id === next.id) ? prev : [next, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) void sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ═══════════════════════════════════════════
     ANIMATIONS
     ═══════════════════════════════════════════ */

  /* ── Hero entrance ──────────────────────── */
  useEffect(() => {
    if (!rootRef.current) return;
    const mobile = isMobile.current;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (mobile) {
        tl.set(".hero-letter", { opacity: 1, y: 0 });
        tl.fromTo(
          "h1",
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          0
        );
        tl.fromTo(
          ".hero-subtitle",
          { opacity: 0 },
          { opacity: 1, duration: 0.4 },
          0.2
        );
        tl.fromTo(
          ".hero-desc",
          { opacity: 0 },
          { opacity: 1, duration: 0.4 },
          0.35
        );
        tl.fromTo(
          ".hero-cta",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4 },
          0.5
        );
        tl.fromTo(
          ".hero-stats",
          { opacity: 0 },
          { opacity: 1, duration: 0.3 },
          0.65
        );
      } else {
        tl.to(".hero-letter", {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.03,
          ease: "back.out(1.4)",
        });
        tl.fromTo(
          ".hero-subtitle",
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          "-=0.15"
        );
        tl.fromTo(
          ".hero-desc",
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          "-=0.2"
        );
        tl.fromTo(
          ".hero-cta",
          { y: 10, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" },
          "-=0.15"
        );
        tl.fromTo(
          ".hero-stats",
          { y: 8, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4 },
          "-=0.1"
        );
        tl.fromTo(
          ".hero-scroll",
          { opacity: 0 },
          { opacity: 1, duration: 0.4 },
          "-=0.05"
        );
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  /* ── ScrollTrigger for sections ─────────── */
  useEffect(() => {
    if (!rootRef.current) return;
    const mobile = isMobile.current;
    const ctx = gsap.context(() => {
      const dur = mobile ? 0.5 : 0.8;
      const stPct = mobile ? "top 92%" : "top 85%";

      gsap.utils.toArray<HTMLElement>(".section-heading").forEach((el) => {
        gsap.fromTo(
          el,
          { y: mobile ? 15 : 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: dur,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: stPct },
          }
        );
      });

      gsap.fromTo(
        ".form-card",
        { y: mobile ? 20 : 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: dur,
          ease: "power3.out",
          scrollTrigger: { trigger: ".form-section", start: stPct },
        }
      );

      gsap.fromTo(
        ".stats-card",
        { y: mobile ? 20 : 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: dur,
          ease: "power3.out",
          scrollTrigger: { trigger: ".stats-card", start: stPct },
        }
      );

      gsap.fromTo(
        ".reviews-container",
        { y: mobile ? 20 : 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: dur,
          ease: "power3.out",
          scrollTrigger: { trigger: ".reviews-section", start: stPct },
        }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  /* ── Step transition animation ──────────── */
  useEffect(() => {
    if (stepContentRef.current) {
      gsap.fromTo(
        stepContentRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [step, submitted]);

  /* ── Confetti burst ────────────────────── */
  function burstConfetti() {
    const layer = confettiRef.current;
    const btn = submitBtnRef.current;
    if (!layer || !btn) return;
    const rect = btn.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    const colors = [
      "#7c3aed",
      "#6366f1",
      "#3b82f6",
      "#8b5cf6",
      "#fbbf24",
      "#34d399",
      "#f472b6",
      "#60a5fa",
      "#a78bfa",
      "#818cf8",
    ];
    const shapes = ["circle", "rect", "rect", "circle", "rect"];
    const pieces: HTMLDivElement[] = [];
    const pieceCount = window.innerWidth < 768 ? 20 : 55;
    for (let i = 0; i < pieceCount; i++) {
      const el = document.createElement("div");
      const shape = shapes[i % shapes.length];
      el.style.position = "fixed";
      el.style.left = `${ox}px`;
      el.style.top = `${oy}px`;
      const s = 4 + Math.random() * 8;
      el.style.width = `${s}px`;
      el.style.height = shape === "circle" ? `${s}px` : `${s * 0.4}px`;
      el.style.borderRadius = shape === "circle" ? "50%" : "2px";
      el.style.background = colors[i % colors.length];
      el.style.pointerEvents = "none";
      el.style.zIndex = "60";
      layer.appendChild(el);
      pieces.push(el);
    }
    gsap.set(pieces, { opacity: 1, rotate: () => Math.random() * 360 });
    gsap.to(pieces, {
      x: () => (Math.random() - 0.5) * 600,
      y: () => -160 - Math.random() * 350,
      rotate: () => 360 + Math.random() * 1080,
      duration: 1.4,
      ease: "power3.out",
      stagger: 0.006,
    });
    gsap.to(pieces, {
      y: "+=320",
      opacity: 0,
      duration: 1.1,
      ease: "power2.in",
      delay: 0.45,
      onComplete: () => pieces.forEach((el) => el.remove()),
    });
  }

  /* ═══════════════════════════════════════════
     STEP VALIDATION & NAVIGATION
     ═══════════════════════════════════════════ */

  function validateStep(s: number): string | null {
    switch (s) {
      case 0:
        if (form.name.trim().length < 2)
          return "Please enter your name (at least 2 characters).";
        if (form.rating < 1) return "Please select an overall rating.";
        return null;
      case 1:
        if (form.experience.trim().length < 3)
          return "Please share your experience (at least a few words).";
        if (form.reliabilityRating < 1) return "Please rate the reliability.";
        if (form.wouldRecommend === null)
          return "Please tell us if you'd recommend QuizFlow.";
        return null;
      default:
        return null;
    }
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) {
      toast.error("Hold on!", { description: err });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function skipStep() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  /* ═══════════════════════════════════════════
     SUBMIT
     ═══════════════════════════════════════════ */

  async function onSubmit() {
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Database not connected", {
        description: "Supabase is not configured.",
      });
      return;
    }

    const payload: ReviewInsert = {
      name: form.name.trim(),
      role: form.role,
      rating: Math.max(1, Math.min(5, form.rating)),
      experience: form.experience.trim(),
      reliability_rating: Math.max(1, Math.min(5, form.reliabilityRating)),
      would_recommend: form.wouldRecommend ?? true,
      security_issues: form.securityIssues.trim() || null,
      bugs_glitches: form.bugsGlitches.trim() || null,
      database_issues: form.databaseIssues.trim() || null,
      feature_requests: form.featureRequests.trim() || null,
      ui_ux_feedback: form.uiUxFeedback.trim() || null,
      other_feedback: form.otherFeedback.trim() || null,
    };

    setIsSubmitting(true);
    const { data, error: ie } = await supabase
      .from("reviews")
      .insert(payload)
      .select("*")
      .single();
    setIsSubmitting(false);

    if (ie) {
      toast.error("Submission failed", { description: ie.message });
      return;
    }

    if (data) {
      const ins = data as Review;
      setReviews((prev) =>
        prev.some((r) => r.id === ins.id) ? prev : [ins, ...prev]
      );
      toast.success("Thank you! Your feedback has been submitted.", {
        description: `You rated QuizFlow ${payload.rating}★ as a ${payload.role === "faculty" ? "Faculty Member" : "Student"}.`,
      });
      burstConfetti();
    }

    setSubmitted(true);
  }

  function resetForm() {
    setForm({ ...initialForm });
    setStep(0);
    setSubmitted(false);
  }

  /* ═══════════════════════════════════════════
     STEP RENDERERS
     ═══════════════════════════════════════════ */

  function renderStep0() {
    return (
      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            What&apos;s your name? <span className="text-red-400">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            placeholder="e.g., Krutarth Raychura"
            disabled={isSubmitting}
            className="input-field"
          />
        </div>

        {/* Role */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            I am a... <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "student" as const, icon: "🎓", label: "Student" },
              { key: "faculty" as const, icon: "👨‍🏫", label: "Faculty" },
            ].map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => updateForm("role", r.key)}
                disabled={isSubmitting}
                className={
                  "rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all duration-300 " +
                  (form.role === r.key
                    ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:bg-violet-50/30")
                }
              >
                <span className="text-lg">{r.icon}</span>
                <span className="ml-2">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overall Rating */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            How would you rate QuizFlow overall?{" "}
            <span className="text-red-400">*</span>
          </label>
          <InteractiveStars
            value={form.rating}
            onChange={(v) => updateForm("rating", v)}
            disabled={isSubmitting}
          />
        </div>
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className="space-y-6">
        {/* Experience */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            How has your experience been using QuizFlow for examinations?{" "}
            <span className="text-red-400">*</span>
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Tell us about your journey — what worked well, what didn&apos;t?
          </p>
          <textarea
            value={form.experience}
            onChange={(e) => updateForm("experience", e.target.value)}
            placeholder="e.g., QuizFlow made our internal exams much smoother..."
            rows={4}
            disabled={isSubmitting}
            className="input-field"
          />
        </div>

        {/* Reliability Rating */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            How reliable was QuizFlow during your exams?{" "}
            <span className="text-red-400">*</span>
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Did it stay stable throughout? Any crashes or slowdowns?
          </p>
          <InteractiveStars
            value={form.reliabilityRating}
            onChange={(v) => updateForm("reliabilityRating", v)}
            disabled={isSubmitting}
          />
        </div>

        {/* Would Recommend */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Would you recommend QuizFlow to other institutions?{" "}
            <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            {[
              { val: true, icon: "👍", label: "Yes, definitely!" },
              { val: false, icon: "🤔", label: "Not yet" },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => updateForm("wouldRecommend", opt.val)}
                disabled={isSubmitting}
                className={
                  "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-300 " +
                  (form.wouldRecommend === opt.val
                    ? opt.val
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")
                }
              >
                <span className="text-lg">{opt.icon}</span>
                <span className="ml-2">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        <p className="text-xs text-slate-400 italic">
          All fields below are optional — fill in what you can. Every detail
          helps!
        </p>

        {/* Security Issues */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            🔒 Any security or authentication concerns?
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Login issues, unauthorized access, session problems, etc.
          </p>
          <textarea
            value={form.securityIssues}
            onChange={(e) => updateForm("securityIssues", e.target.value)}
            placeholder="e.g., Sometimes the session expires mid-exam..."
            rows={3}
            disabled={isSubmitting}
            className="input-field"
          />
        </div>

        {/* Bugs & Glitches */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            🐛 Any bugs or glitches you encountered?
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Crashes, freezes, wrong data, UI breaking, etc.
          </p>
          <textarea
            value={form.bugsGlitches}
            onChange={(e) => updateForm("bugsGlitches", e.target.value)}
            placeholder="e.g., The timer sometimes freezes when switching tabs..."
            rows={3}
            disabled={isSubmitting}
            className="input-field"
          />
        </div>

        {/* Database Issues */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            🗃️ Any data or results-related issues?
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Wrong scores, missing answers, duplicate records, etc.
          </p>
          <textarea
            value={form.databaseIssues}
            onChange={(e) => updateForm("databaseIssues", e.target.value)}
            placeholder="e.g., My score didn't save after completing the quiz..."
            rows={3}
            disabled={isSubmitting}
            className="input-field"
          />
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        <p className="text-xs text-slate-400 italic">
          Your ideas will directly shape QuizFlow 2.0! All fields are optional.
        </p>

        {/* Feature Requests */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            🚀 What features would you love in QuizFlow 2.0?
          </label>
          <p className="mb-2 text-xs text-slate-400">
            New question types, analytics dashboard, mobile app, scheduling,
            etc.
          </p>
          <textarea
            value={form.featureRequests}
            onChange={(e) => updateForm("featureRequests", e.target.value)}
            placeholder="e.g., I'd love a practice mode where students can retry quizzes..."
            rows={3}
            disabled={isSubmitting}
            className="input-field"
          />
        </div>

        {/* UI/UX Feedback */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            🎨 Any suggestions to improve the look &amp; feel?
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Navigation, layout, color scheme, readability, mobile experience,
            etc.
          </p>
          <textarea
            value={form.uiUxFeedback}
            onChange={(e) => updateForm("uiUxFeedback", e.target.value)}
            placeholder="e.g., The dashboard could use a dark mode toggle..."
            rows={3}
            disabled={isSubmitting}
            className="input-field"
          />
        </div>

        {/* Other Feedback */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            💬 Anything else on your mind?
          </label>
          <textarea
            value={form.otherFeedback}
            onChange={(e) => updateForm("otherFeedback", e.target.value)}
            placeholder="Any other thoughts, suggestions, or encouragement..."
            rows={3}
            disabled={isSubmitting}
            className="input-field"
          />
        </div>
      </div>
    );
  }

  function renderSuccess() {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200">
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-emerald-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              className="check-animate"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-slate-800">Thank You! 🎉</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
          Your feedback is incredibly valuable and will directly help us build a
          better QuizFlow 2.0 for everyone at LJ College.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="mt-6 rounded-xl border-2 border-violet-200 bg-violet-50 px-6 py-2.5 text-sm font-medium text-violet-600 transition-all hover:bg-violet-100"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3];

  /* ── Helper ──────────────────────────────── */
  function scrollToFeedback() {
    document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth" });
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  const titleWord1 = "QuizFlow";

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-gradient-to-br from-[#faf9ff] via-[#f3f0ff] to-[#eef2ff] text-slate-800"
    >
      <Toaster richColors position="top-right" />
      <div ref={confettiRef} className="pointer-events-none fixed inset-0 z-50" />

      {/* ── Subtle background decoration ───── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-200/20 blur-[120px]" />
        <div className="absolute -right-32 top-20 h-[450px] w-[450px] rounded-full bg-blue-200/15 blur-[120px]" />
        <div className="absolute bottom-[-100px] left-1/3 h-[400px] w-[400px] rounded-full bg-indigo-200/10 blur-[100px]" />
        <div className="bg-grid-pattern absolute inset-0 opacity-60" />
      </div>

      {/* ════════════════════════════════════════
         HERO
         ════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative flex min-h-[85vh] flex-col items-center justify-center px-5 pt-10 text-center"
      >
        {/* Badge */}
        <div className="float-badge inline-flex items-center gap-2.5 rounded-full border border-violet-200 bg-white/80 px-5 py-2 text-xs font-medium text-violet-600 shadow-sm backdrop-blur-sm">
          <span className="pulse-live h-2 w-2 rounded-full bg-emerald-400" />
          Live at LJ College of Computer Application
          <span className="h-3.5 w-px bg-violet-200" />
          <span className="text-slate-400">Vastrapur, Ahmedabad</span>
        </div>

        {/* Title */}
        <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-7xl lg:text-[5.5rem] leading-none">
          <span className="inline-flex">
            {titleWord1.split("").map((ch, i) => (
              <span key={`a${i}`} className="hero-letter gradient-text">
                {ch}
              </span>
            ))}
          </span>
        </h1>

        {/* Subtitle */}
        <div className="hero-subtitle mt-5 text-xl font-semibold text-slate-600 sm:text-2xl">
          Help Us Build{" "}
          <span className="gradient-text-animated font-bold">Version 2.0</span>
        </div>

        {/* Description */}
        <p className="hero-desc mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base sm:leading-8">
          QuizFlow is the Quiz Management System powering secure examinations at{" "}
          <span className="font-medium text-slate-700">
            LJ College of Computer Application
          </span>
          . I&apos;am collecting feedback from students and faculty to fix bugs,
          improve features, and build an even better v2.0. Your honest input
          matters!
        </p>

        {/* CTA */}
        <div className="hero-cta mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={scrollToFeedback}
            className="btn-glow inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110"
          >
            Share Your Feedback
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={() =>
              document
                .getElementById("reviews")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white/70 px-7 py-4 text-sm font-medium text-slate-600 backdrop-blur-sm transition-all duration-300 hover:border-violet-300 hover:bg-white hover:text-violet-700"
          >
            View Responses
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
              />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="hero-stats mt-8 flex flex-wrap items-center justify-center gap-4">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/70 px-5 py-2.5 text-xs backdrop-blur-sm shadow-sm">
            <span className="flex items-center gap-1.5">
              <span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Live</span>
            </span>
            <span className="h-4 w-px bg-violet-100" />
            <span className="font-bold tabular-nums text-slate-700">
              <AnimatedNumber value={distribution.total} />
            </span>
            <span className="text-slate-400">responses</span>
            <span className="h-4 w-px bg-violet-100" />
            <span className="font-bold tabular-nums text-slate-700">
              <AnimatedNumber value={distribution.avg} decimals={1} />
            </span>
            <span className="text-slate-400">avg ★</span>
          </div>
          <div className="text-xs text-slate-400">
            Built with Laravel &bull; Developed by Krutarth Raychura
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll absolute bottom-8 flex flex-col items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.25em] text-slate-400">
            Scroll
          </span>
          <div className="scroll-indicator flex flex-col items-center">
            <div className="h-8 w-[1.5px] rounded-full bg-gradient-to-b from-violet-400/40 to-transparent" />
          </div>
        </div>
      </section>

      <div className="section-divider mx-auto w-full max-w-4xl" />

      {/* ════════ ALERTS ═════════════════════════ */}
      {!isSupabaseConfigured && (
        <div className="relative mx-auto max-w-4xl px-5 pt-12">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="text-sm font-medium">Supabase not configured</div>
            <div className="mt-1 text-sm text-amber-700">
              Add{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              to{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
                .env.local
              </code>
              .
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="relative mx-auto max-w-4xl px-5 pt-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
            <div className="text-sm font-medium">Something went wrong</div>
            <div className="mt-1 text-sm text-rose-700">{error}</div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
         FEEDBACK FORM + STATS
         ════════════════════════════════════════ */}
      <section id="feedback" className="form-section relative px-5 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="section-heading mb-10 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-violet-500">
              Feedback
            </div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Share Your{" "}
              <span className="gradient-text">QuizFlow Experience</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-500">
              Your feedback will directly impact how we build QuizFlow 2.0 —
              every response counts!
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* ── Live Stats Panel ──────────── */}
            <div className="stats-card lg:col-span-2">
              <div className="card-elevated p-7">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-slate-800">
                    Live Stats
                  </h3>
                  <span className="pulse-live h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Based on {distribution.total} response
                  {distribution.total !== 1 ? "s" : ""}
                </p>

                {/* Big avg rating */}
                <div className="mt-5 flex items-end gap-3">
                  <div className="text-5xl font-bold tabular-nums text-slate-800">
                    <AnimatedNumber value={distribution.avg} decimals={1} />
                  </div>
                  <div className="mb-1">
                    <StarsRow rating={Math.round(distribution.avg)} />
                    <div className="mt-1 text-[10px] text-slate-400">
                      overall rating
                    </div>
                  </div>
                </div>

                {/* Distribution bars */}
                <div className="mt-6 space-y-2">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const count = distribution.counts[star];
                    const maxBar = Math.max(
                      1,
                      ...Object.values(distribution.counts)
                    );
                    const pct = Math.round((count / maxBar) * 100);
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="w-6 text-xs tabular-nums text-slate-500">
                          {star}★
                        </div>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-violet-50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-6 text-right text-xs tabular-nums text-slate-400">
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick stats */}
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    { label: "Total", value: distribution.total },
                    { label: "5-Star", value: distribution.counts[5] },
                    { label: "Recommend", value: recommendCount },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-center"
                    >
                      <div className="text-lg font-bold tabular-nums text-slate-700">
                        <AnimatedNumber value={s.value} />
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Multi-Step Form Card ──────── */}
            <div className="form-card lg:col-span-3">
              <div className="shimmer-border card-elevated overflow-hidden p-7">
                {submitted ? (
                  <div ref={stepContentRef} key="success">
                    {renderSuccess()}
                  </div>
                ) : (
                  <>
                    {/* Step indicator */}
                    <div className="mb-7">
                      <div className="flex items-center justify-between">
                        {STEPS.map((s, i) => (
                          <div
                            key={i}
                            className="flex flex-1 flex-col items-center"
                          >
                            <div
                              className={
                                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 " +
                                (i < step
                                  ? "bg-violet-600 text-white"
                                  : i === step
                                    ? "bg-violet-100 text-violet-700 ring-2 ring-violet-400 ring-offset-2"
                                    : "bg-slate-100 text-slate-400")
                              }
                            >
                              {i < step ? (
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <span className="text-xs">{s.icon}</span>
                              )}
                            </div>
                            <div className="mt-1.5 hidden text-[10px] font-medium sm:block">
                              <div
                                className={
                                  i <= step
                                    ? "text-violet-600"
                                    : "text-slate-400"
                                }
                              >
                                {s.title}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-violet-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                          style={{
                            width: `${((step + 1) / STEPS.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Step content */}
                    <div ref={stepContentRef} key={step}>
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-800">
                          {STEPS[step].icon} {STEPS[step].title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Step {step + 1} of {STEPS.length} &mdash;{" "}
                          {STEPS[step].desc}
                        </p>
                      </div>
                      {stepRenderers[step]()}
                    </div>

                    {/* Navigation buttons */}
                    <div className="mt-7 flex items-center justify-between gap-3">
                      <div>
                        {step > 0 && (
                          <button
                            type="button"
                            onClick={prevStep}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                              />
                            </svg>
                            Back
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Skip button for optional steps */}
                        {step >= 2 && step < STEPS.length - 1 && (
                          <button
                            type="button"
                            onClick={skipStep}
                            disabled={isSubmitting}
                            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:text-violet-600"
                          >
                            Skip
                          </button>
                        )}

                        {step < STEPS.length - 1 ? (
                          <button
                            type="button"
                            onClick={nextStep}
                            disabled={isSubmitting}
                            className="btn-glow inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                          >
                            Next
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                              />
                            </svg>
                          </button>
                        ) : (
                          <button
                            type="button"
                            ref={submitBtnRef}
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            className="btn-glow inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <svg
                                  className="h-4 w-4 animate-spin"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                                Submitting...
                              </>
                            ) : (
                              <>
                                Submit Feedback
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                                  />
                                </svg>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider mx-auto w-full max-w-4xl" />

      {/* ════════════════════════════════════════
         ALL REVIEWS / RESPONSES
         ════════════════════════════════════════ */}
      <section id="reviews" className="reviews-section relative px-5 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="section-heading mb-10 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-violet-500">
              Responses
            </div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              What People Are <span className="gradient-text">Saying</span>
            </h2>
          </div>

          <div className="reviews-container card-elevated p-7">
            {/* Header + Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400">
                  {isLoadingReviews
                    ? "Loading responses..."
                    : `Showing ${Math.min(visibleCount, filteredReviews.length)} of ${filteredReviews.length} filtered · ${reviews.length} total`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] uppercase tracking-wider text-emerald-500">
                  Real-time
                </span>
              </div>
            </div>

            {/* Role filter */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "all" as const, label: "All" },
                  { key: "student" as const, label: "Students" },
                  { key: "faculty" as const, label: "Faculty" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleFilter(key)}
                  className={
                    "rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-300 " +
                    (roleFilter === key
                      ? "border-violet-300 bg-violet-100 text-violet-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-600")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Review Cards */}
            {filteredReviews.length === 0 ? (
              <div className="mt-8 rounded-2xl border-2 border-dashed border-violet-100 bg-violet-50/30 p-10 text-center text-sm text-slate-500">
                {isLoadingReviews
                  ? "Loading responses..."
                  : "No responses yet. Be the first to share your feedback!"}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredReviews.slice(0, visibleCount).map((r) => (
                  <div key={r.id} className="review-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-slate-700">
                            {r.name}
                          </div>
                          <span
                            className={
                              "rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                              (r.role === "faculty"
                                ? "border-violet-200 bg-violet-50 text-violet-600"
                                : "border-blue-200 bg-blue-50 text-blue-600")
                            }
                          >
                            {r.role === "faculty" ? "Faculty" : "Student"}
                          </span>
                          {r.would_recommend && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                              👍 Recommends
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <StarsRow
                            rating={Math.max(1, Math.min(5, r.rating))}
                          />
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-[10px] tabular-nums text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {/* Reliability rating */}
                    {r.reliability_rating > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">Reliability:</span>
                        <StarsRow rating={Math.max(1, Math.min(5, r.reliability_rating))} />
                      </div>
                    )}

                    {/* Experience */}
                    {r.experience && (
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400 mb-0.5">Experience</div>
                        <p className="text-sm leading-6 text-slate-600 whitespace-pre-line">
                          {r.experience}
                        </p>
                      </div>
                    )}

                    {/* All optional detail fields */}
                    {[
                      { label: "Security Issues", value: r.security_issues },
                      { label: "Bugs / Glitches", value: r.bugs_glitches },
                      { label: "Database Issues", value: r.database_issues },
                      { label: "Feature Request", value: r.feature_requests },
                      { label: "UI / UX Feedback", value: r.ui_ux_feedback },
                      { label: "Other Feedback", value: r.other_feedback },
                    ]
                      .filter((f) => f.value)
                      .map((f) => (
                        <div
                          key={f.label}
                          className="mt-2 rounded-lg bg-violet-50/60 px-3 py-2"
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                            {f.label}
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-slate-600 whitespace-pre-line">
                            {f.value}
                          </p>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}

            {filteredReviews.length > visibleCount && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + 12)}
                  className="rounded-xl border border-violet-200 bg-violet-50 px-7 py-2.5 text-sm font-medium text-violet-600 transition-all duration-300 hover:border-violet-300 hover:bg-violet-100"
                >
                  Load more responses
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ═════════════════ */}
      <div className="section-divider mx-auto w-full max-w-4xl" />
      <footer className="relative py-14 text-center">
        <div className="mx-auto max-w-lg px-5">
          <div className="text-lg font-bold gradient-text mb-2">QuizFlow</div>
          <div className="text-xs leading-6 text-slate-400">
            Quiz Management System &bull; Built with Laravel
            <br />
            Live at{" "}
            <span className="text-slate-500">
              LJ College of Computer Application, Vastrapur, Ahmedabad
            </span>
            <br />
            Real-time updates powered by Supabase · Designed &amp; developed by{" "}
            <span className="text-slate-500">Krutarth Raychura</span>
          </div>
          <div className="mt-3 text-[10px] text-slate-300">
            &copy; {new Date().getFullYear()} QuizFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
