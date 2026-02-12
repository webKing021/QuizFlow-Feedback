"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Review, ReviewInsert } from "@/lib/reviews";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ═══════════════════════════════════════════════════
   TINY COMPONENTS
   ═══════════════════════════════════════════════════ */

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={"h-5 w-5 transition-all duration-300 " + (filled ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-white/15")}
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
        <StarIcon key={i} filled={i < rating} />
      ))}
    </div>
  );
}

function clampRating(n: number) {
  return Math.max(1, Math.min(5, n));
}

/* ── Animated Counter ────────────────────────── */
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
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

  return <span ref={ref} className="stat-number">{value.toFixed(decimals)}</span>;
}

/* ── Typewriter Effect Hook ──────────────────── */
function useTypewriter(text: string, speed = 60, delay = 1500) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return { displayed, done };
}

/* ── Feature data ────────────────────────────── */
const features = [
  { emoji: "🧠", title: "AI-Powered Learning", desc: "Personalized educational experiences powered by artificial intelligence for smarter study sessions." },
  { emoji: "📝", title: "Smart Notes", desc: "Create, access, and organize study materials with intelligent categorization and easy retrieval." },
  { emoji: "👥", title: "Student-Teacher Connect", desc: "A role-based platform that bridges the gap between learners and educators for collaborative growth." },
  { emoji: "📚", title: "Course Management", desc: "Teachers can create and manage courses with structured materials, quizzes, and assessments." },
  { emoji: "💳", title: "Premium Plans", desc: "Subscription-based access to premium content and advanced AI-powered study tools." },
  { emoji: "📱", title: "Responsive Design", desc: "Modern UI that works beautifully across all devices — desktop, tablet, and mobile." },
];

const techStack = ["Django", "Python", "Stripe", "MySQL", "Bootstrap", "REST API", "Mailtrap", "JavaScript"];

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Home() {
  const team = "Krutarth Raychura • Het Patel";
  const pageSize = 500;

  /* ── Refs ─────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const magneticRef = useRef<HTMLDivElement>(null);
  const magneticBtnRef = useRef<HTMLButtonElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const particleRef = useRef<HTMLDivElement>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  /* ── State ───────────────────────────────── */
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher">("all");
  const [starFilter, setStarFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [soundOn, setSoundOn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  /* ── Typewriter ──────────────────────────── */
  const { displayed: tagline, done: taglineDone } = useTypewriter("Smart Notes. Smarter Prep.", 70, 2000);

  /* ── Computed ─────────────────────────────── */
  const distribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    for (const r of reviews) counts[clampRating(r.rating) as 1 | 2 | 3 | 4 | 5]++;
    const total = reviews.length;
    const avg = total === 0 ? 0 : Math.round((reviews.reduce((sum, r) => sum + clampRating(r.rating), 0) / total) * 10) / 10;
    return { counts, total, avg };
  }, [reviews]);

  const featuredReview = useMemo(() => {
    return reviews.find((r) => r.role === "teacher" && clampRating(r.rating) === 5) ?? null;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const roleOk = roleFilter === "all" || r.role === roleFilter;
      const starOk = starFilter === 0 || clampRating(r.rating) === starFilter;
      return roleOk && starOk;
    });
  }, [reviews, roleFilter, starFilter]);

  useEffect(() => { setVisibleCount(12); }, [roleFilter, starFilter]);
  const maxBar = Math.max(1, ...Object.values(distribution.counts));

  /* ── Marquee reviews for the ticker ──────── */
  const marqueeReviews = useMemo(() => {
    return reviews.filter((r) => clampRating(r.rating) >= 4).slice(0, 20);
  }, [reviews]);

  /* ── Helpers ─────────────────────────────── */

  function scrollToFeedback() {
    document.getElementById("feedback")?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToReviews() {
    document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
  }

  function playStarClick() {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.start();
      osc.stop(now + 0.09);
      osc.onended = () => { try { ctx.close(); } catch { /* noop */ } };
    } catch { /* noop */ }
  }

  function burstConfetti() {
    const layer = confettiRef.current;
    const btn = submitBtnRef.current;
    if (!layer || !btn) return;
    const rect = btn.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    const colors = ["#8b5cf6","#3b82f6","#06b6d4","#d946ef","#fbbf24","#34d399","#f472b6","#60a5fa","#a78bfa","#22d3ee"];
    const shapes = ["circle","rect","rect","circle","rect"];
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
    gsap.to(pieces, { x: () => (Math.random() - 0.5) * 600, y: () => -160 - Math.random() * 350, rotate: () => 360 + Math.random() * 1080, duration: 1.4, ease: "power3.out", stagger: 0.006 });
    gsap.to(pieces, { y: `+=320`, opacity: 0, duration: 1.1, ease: "power2.in", delay: 0.45, onComplete: () => pieces.forEach((el) => el.remove()) });
  }

  /* ── Mouse-follow glow card handler (desktop only) ── */
  const handleCardMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer:coarse)").matches) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

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
          const { data, error } = await sb.from("reviews").select("id, created_at, name, role, rating, feedback").order("created_at", { ascending: false }).range(from, from + pageSize - 1);
          if (cancelled) return;
          if (error) { setError(error.message); setIsLoadingReviews(false); return; }
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
    const channel = sb.channel("reviews-realtime").on("postgres_changes", { event: "INSERT", schema: "public", table: "reviews" }, (payload) => {
      const next = payload.new as Review;
      setReviews((prev) => prev.some((r) => r.id === next.id) ? prev : [next, ...prev]);
    }).subscribe();
    return () => { cancelled = true; if (channel) void sb.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ═══════════════════════════════════════════
     GSAP ANIMATIONS
     ═══════════════════════════════════════════ */

  /* ── Cursor glow that follows mouse ──────── */
  useEffect(() => {
    const glow = cursorGlowRef.current;
    if (!glow) return;
    const hasFine = typeof window !== "undefined" && window.matchMedia?.("(pointer:fine)").matches;
    if (!hasFine) return;
    const onMove = (e: MouseEvent) => {
      gsap.to(glow, { x: e.clientX, y: e.clientY, duration: 0.6, ease: "power2.out" });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* ── Hero entrance — letter-by-letter title ── */
  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      /* Aurora orbs */
      tl.set(".bg-orb", { opacity: 0, scale: 0.8 }).to(".bg-orb", { opacity: 1, scale: 1, duration: 1.6, stagger: 0.15, ease: "power2.out" });

      /* Badge */
      tl.fromTo(".hero-badge", { y: 20, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.5)" }, "-=1.0");

      /* Letters stagger */
      tl.to(".hero-letter", { y: 0, opacity: 1, rotateX: 0, duration: 0.6, stagger: 0.035, ease: "back.out(1.4)" }, "-=0.5");

      /* Tagline area */
      tl.fromTo(".hero-tagline-area", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.2");

      /* Description */
      tl.fromTo(".hero-desc", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65 }, "-=0.3");

      /* CTA buttons */
      tl.fromTo(".hero-cta-group", { y: 15, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.5)" }, "-=0.2");

      /* Stats bar */
      tl.fromTo(".hero-stats", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.2");

      /* Scroll indicator */
      tl.fromTo(".hero-scroll", { opacity: 0 }, { opacity: 1, duration: 0.6 }, "-=0.1");

      /* Continuous aurora float — desktop only for performance */
      if (window.matchMedia("(min-width: 768px)").matches) {
        gsap.to(".bg-orb", { y: (i) => (i % 2 === 0 ? -35 : 35), x: (i) => (i % 2 === 0 ? 25 : -25), duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.5 });
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  /* ── Floating particles (desktop only) ───── */
  useEffect(() => {
    const c = particleRef.current;
    if (!c) return;
    /* Skip particles entirely on mobile to save GPU */
    const isSmall = window.matchMedia("(max-width: 767px)").matches;
    if (isSmall) return;
    const isTablet = window.matchMedia("(max-width: 1023px)").matches;
    const count = isTablet ? 12 : 20;
    const els: HTMLDivElement[] = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.borderRadius = "50%";
      const s = 1 + Math.random() * 3;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      const hue = 200 + Math.random() * 100;
      el.style.background = `hsla(${hue}, 70%, 70%, ${0.06 + Math.random() * 0.12})`;
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      el.style.willChange = "transform";
      c.appendChild(el);
      els.push(el);
      gsap.to(el, { y: -30 - Math.random() * 60, x: (Math.random() - 0.5) * 40, duration: 6 + Math.random() * 8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() * 6 });
    }
    return () => els.forEach((el) => el.remove());
  }, []);

  /* ── ScrollTrigger for all sections ──────── */
  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      /* Section headers */
      gsap.utils.toArray<HTMLElement>(".section-heading").forEach((el) => {
        gsap.fromTo(el, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
      });

      /* Project cards */
      gsap.fromTo(".project-card", { y: 60, opacity: 0, rotateX: 8 }, { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.2, ease: "power3.out", scrollTrigger: { trigger: ".project-section", start: "top 82%" } });

      /* Feature items */
      gsap.fromTo(".feature-item", { y: 30, opacity: 0, x: -20 }, { y: 0, opacity: 1, x: 0, duration: 0.7, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".features-grid", start: "top 82%" } });

      /* Tech tags */
      gsap.fromTo(".tech-tag-anim", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.06, ease: "back.out(2)", scrollTrigger: { trigger: ".tech-tags-row", start: "top 90%" } });

      /* Feedback cards */
      gsap.fromTo(".feedback-card", { y: 60, opacity: 0, rotateX: 8 }, { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.2, ease: "power3.out", scrollTrigger: { trigger: ".feedback-section", start: "top 82%" } });

      /* Marquee */
      gsap.fromTo(".marquee-section", { opacity: 0 }, { opacity: 1, duration: 1, scrollTrigger: { trigger: ".marquee-section", start: "top 90%" } });

      /* Featured & reviews */
      gsap.fromTo(".featured-card", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".featured-card", start: "top 85%" } });
      gsap.fromTo(".reviews-section-card", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".reviews-section", start: "top 85%" } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  /* ── Distribution bars ───────────────────── */
  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".dist-bar", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left", duration: 0.8, ease: "power3.out", stagger: 0.08 });
    }, rootRef);
    return () => ctx.revert();
  }, [distribution.total, distribution.avg]);

  /* ── Magnetic button ─────────────────────── */
  useEffect(() => {
    const wrap = magneticRef.current;
    const btn = magneticBtnRef.current;
    if (!wrap || !btn) return;
    const hasFine = typeof window !== "undefined" && window.matchMedia?.("(pointer:fine)").matches;
    if (!hasFine) return;

    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        const pull = 0.35;
        gsap.to(btn, { x: dx * pull, y: dy * pull, duration: 0.4, ease: "power2.out" });
      } else {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
      }
    };
    const onLeave = () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
    };
    window.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  /* ── 3D tilt on cards ────────────────────── */
  useEffect(() => {
    if (!rootRef.current) return;
    const hasFine = typeof window !== "undefined" && window.matchMedia?.("(pointer:fine)").matches;
    if (!hasFine) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".tilt-card"));
    const onMove = (e: PointerEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      const rx = ((e.clientY / h) * 2 - 1) * -2.5;
      const ry = ((e.clientX / w) * 2 - 1) * 2.5;
      for (const el of cards) gsap.to(el, { rotateX: rx, rotateY: ry, transformPerspective: 1000, transformOrigin: "center", duration: 0.8, ease: "power2.out" });
    };
    const onLeave = () => {
      for (const el of cards) gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: "power2.out" });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("mouseleave", onLeave); };
  }, []);

  /* ── Submit ──────────────────────────────── */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) { toast.error("Database not connected", { description: "Supabase is not configured." }); return; }
    const n2 = name.trim(), fb = feedback.trim(), sr = clampRating(rating);
    if (n2.length < 2) { toast.error("Please check your input", { description: "Name must be at least 2 characters." }); return; }
    if (fb.length < 3) { toast.error("Please check your input", { description: "Feedback must be at least 3 characters." }); return; }
    const payload: ReviewInsert = { name: n2, role, rating: sr, feedback: fb };
    setIsSubmitting(true);
    const { data, error: ie } = await supabase.from("reviews").insert(payload).select("id, created_at, name, role, rating, feedback").single();
    setIsSubmitting(false);
    if (ie) { toast.error("Submission failed", { description: ie.message }); return; }
    if (data) {
      const ins = data as Review;
      setReviews((prev) => prev.some((r) => r.id === ins.id) ? prev : [ins, ...prev]);
      toast.success("Thank you! Feedback submitted.", { description: `You rated ${sr}★ as a ${role === "teacher" ? "Faculty" : "Student"}.` });
      if (sr === 5) burstConfetti();
    }
    setName(""); setRole("student"); setRating(5); setFeedback("");
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  /* Hero title letters */
  const titleWord1 = "BrainFuel";
  const titleWord2 = "AI";

  return (
    <div ref={rootRef} className="noise min-h-screen bg-[#030014] text-white">
      <Toaster richColors position="top-right" />
      <div ref={confettiRef} className="pointer-events-none fixed inset-0 z-50" />

      {/* ── Cursor glow ──────────────────────── */}
      <div
        ref={cursorGlowRef}
        className="pointer-events-none fixed -left-[150px] -top-[150px] z-30 hidden h-[300px] w-[300px] rounded-full bg-violet-500/[0.04] blur-[80px] lg:block"
      />

      {/* ── Background atmosphere ────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div ref={particleRef} className="absolute inset-0" />
        <div className="bg-orb aurora-1 absolute -left-40 -top-40 h-[550px] w-[550px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="bg-orb aurora-2 absolute -right-32 top-16 h-[600px] w-[600px] rounded-full bg-blue-500/12 blur-[140px]" />
        <div className="bg-orb aurora-3 absolute left-1/4 bottom-[-200px] h-[650px] w-[650px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="bg-orb aurora-1 absolute right-1/5 top-1/2 h-[450px] w-[450px] rounded-full bg-fuchsia-500/8 blur-[120px]" />
        <div className="bg-orb aurora-2 absolute left-1/2 top-1/4 h-[350px] w-[350px] rounded-full bg-indigo-400/6 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)]" />
        <div className="grid-pattern absolute inset-0 opacity-50" />
      </div>

      {/* ════════════════════════════════════════
         HERO
         ════════════════════════════════════════ */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center px-5 text-center">
        {/* Badge */}
        <div className="hero-badge float-badge inline-flex items-center gap-2.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-5 py-2 text-xs font-medium text-violet-200/80 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)]">
          <span className="pulse-live h-2 w-2 rounded-full bg-emerald-400" />
          LJ Innovation Village 2026
          <span className="h-3.5 w-px bg-white/15" />
          <span className="text-white/50">Live Feedback</span>
        </div>

        {/* Title — letter reveal */}
        <h1 className="mt-10 text-5xl font-bold tracking-tight sm:text-7xl lg:text-[5.5rem] leading-none">
          <span className="inline-flex">
            {titleWord1.split("").map((ch, i) => (
              <span key={`a${i}`} className="hero-letter">{ch}</span>
            ))}
          </span>
          <span className="inline-block w-3 sm:w-5" />
          <span className="inline-flex">
            {titleWord2.split("").map((ch, i) => (
              <span key={`b${i}`} className="hero-letter gradient-text-animated">{ch}</span>
            ))}
          </span>
        </h1>

        {/* Typewriter tagline */}
        <div className="hero-tagline-area mt-6 h-10 text-xl font-medium sm:text-2xl lg:text-3xl">
          <span className="gradient-text-warm">{tagline}</span>
          {!taglineDone && <span className="typewriter-cursor" />}
        </div>

        {/* Description */}
        <p className="hero-desc mt-6 max-w-2xl text-sm leading-7 text-white/50 sm:text-base sm:leading-8">
          An AI-powered educational platform built with Django that connects students with
          teachers — delivering personalized learning, smart study resources, and intelligent
          exam preparation. Presented at <span className="text-white/70">LJ Innovation Village 2026</span>.
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta-group mt-9 flex flex-wrap items-center justify-center gap-4">
          <div ref={magneticRef} className="magnetic-wrap">
            <button
              ref={magneticBtnRef}
              onClick={scrollToFeedback}
              className="btn-glow inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-8 py-4 text-sm font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] hover:brightness-110"
            >
              Give Feedback
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <button
            onClick={scrollToReviews}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4 text-sm font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            View Reviews
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="hero-stats mt-10 flex flex-wrap items-center justify-center gap-4">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              <span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-white/50">Live</span>
            </span>
            <span className="h-4 w-px bg-white/10" />
            <span className="font-bold tabular-nums text-white/90"><AnimatedNumber value={distribution.total} /></span>
            <span className="text-white/50">reviews</span>
            <span className="h-4 w-px bg-white/10" />
            <span className="font-bold tabular-nums text-white/90"><AnimatedNumber value={distribution.avg} decimals={1} /></span>
            <span className="text-white/50">avg ★</span>
          </div>
          <div className="text-xs text-white/35">{team}</div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll absolute bottom-8 flex flex-col items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.25em] text-white/25">Explore</span>
          <div className="scroll-indicator flex flex-col items-center">
            <div className="h-8 w-[1.5px] rounded-full bg-gradient-to-b from-violet-400/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── Section Divider ──────────────────── */}
      <div className="section-divider mx-auto w-full max-w-4xl" />

      {/* ════════════════════════════════════════
         PROJECT SHOWCASE
         ════════════════════════════════════════ */}
      <section className="project-section relative px-5 py-24">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="section-heading mb-12 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-violet-300/50">About the Project</div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              What is <span className="gradient-text">BrainFuel AI</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/50">
              An intelligent educational platform that bridges the gap between students and teachers
              — making learning personalized, efficient, and AI-powered.
            </p>
          </div>

          {/* ── Project Screenshot Showcase ──── */}
          <div className="project-card mb-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-1.5 sm:p-2 backdrop-blur-sm">
            <div className="relative aspect-video overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Poster.png"
                alt="BrainFuel AI — Smart Notes. Smarter Prep. Powered by AI"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030014]/70 via-transparent to-[#030014]/10" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-white/90">
                  <span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live Demo at LJ Innovation Village 2026
                </div>
                <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl lg:text-2xl font-bold text-white/95">BrainFuel AI Platform</h3>
                <p className="mt-1 text-xs sm:text-sm text-white/60 max-w-lg">Built with Django &bull; Powered by AI &bull; Smart Notes &bull; Smarter Prep</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* About card */}
            <div className="project-card tilt-card glow-card glass rounded-3xl p-8 sm:p-10" onMouseMove={handleCardMouse}>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-violet-300/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  Overview
                </div>
                <h3 className="mt-4 text-xl font-semibold sm:text-2xl">The Vision</h3>
                <p className="mt-4 text-sm leading-7 text-white/60">
                  BrainFuel AI is built with <span className="text-white/85 font-medium">Django</span> and
                  powered by <span className="text-white/85 font-medium">AI</span>. It provides personalized
                  learning experiences through smart notes, study resources, and interactive course
                  management — making exam preparation <span className="text-white/85 font-medium">smarter and more efficient</span>.
                </p>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  The platform features secure authentication, role-based dashboards for students and teachers,
                  subscription plans for premium content, and a modern responsive interface.
                </p>
                <div className="tech-tags-row mt-6 flex flex-wrap gap-2">
                  {techStack.map((t) => (
                    <span key={t} className="tech-tag tech-tag-anim">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Features card */}
            <div className="project-card tilt-card glow-card glass rounded-3xl p-8 sm:p-10" onMouseMove={handleCardMouse}>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-300/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Features
                </div>
                <h3 className="mt-4 text-xl font-semibold sm:text-2xl">Key Highlights</h3>
                <div className="features-grid mt-5 space-y-3">
                  {features.map((f, idx) => (
                    <div key={f.title} className="feature-item group flex gap-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.015] p-3.5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
                      <div className="feature-icon-box flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base group-hover:scale-110 transition-transform duration-300">{f.emoji}</div>
                      <div>
                        <div className="text-sm font-semibold text-white/85">{f.title}</div>
                        <div className="mt-0.5 text-[11px] leading-[1.6] text-white/45">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider mx-auto w-full max-w-4xl" />

      {/* ════════ ALERTS ═════════════════════════ */}
      {!isSupabaseConfigured && (
        <div className="relative mx-auto max-w-6xl px-5 pt-12">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/8 p-5 text-amber-50 backdrop-blur">
            <div className="text-sm font-medium">Supabase not configured</div>
            <div className="mt-1 text-sm text-amber-100/70">
              Add <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">.env.local</code>.
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="relative mx-auto max-w-6xl px-5 pt-8">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 p-5 text-rose-50 backdrop-blur">
            <div className="text-sm font-medium">Something went wrong</div>
            <div className="mt-1 text-sm text-rose-100/70">{error}</div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
         STATS + FORM
         ════════════════════════════════════════ */}
      <section id="feedback" className="feedback-section relative px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="section-heading mb-12 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-300/50">Feedback</div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Share Your <span className="gradient-text-warm">Experience</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/45">
              Your feedback matters! Rate BrainFuel AI and let others know what you think.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Live Rating Dashboard ──────── */}
            <div className="feedback-card tilt-card glow-card glass rounded-3xl p-8 sm:p-10" onMouseMove={handleCardMouse}>
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-semibold">Live Rating</h3>
                      <span className="pulse-live h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="mt-1 text-xs text-white/40">
                      Based on {distribution.total} feedback{distribution.total !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold tabular-nums leading-none">
                      <AnimatedNumber value={distribution.avg} decimals={1} />
                    </div>
                    <div className="mt-2 flex justify-end">
                      <StarsRow rating={Math.round(distribution.avg)} />
                    </div>
                  </div>
                </div>

                {/* Distribution bars */}
                <div className="mt-8 space-y-2.5">
                  {([5,4,3,2,1] as const).map((star) => {
                    const count = distribution.counts[star];
                    const pct = Math.round((count / maxBar) * 100);
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="w-8 text-sm tabular-nums text-white/55">{star}★</div>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="dist-bar h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-400 to-cyan-300" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-8 text-right text-sm tabular-nums text-white/45">{count}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick stats */}
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: distribution.total, gradient: false },
                    { label: "5-Star", value: distribution.counts[5], gradient: false },
                    { label: "Average", value: distribution.avg, gradient: true },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3.5 text-center transition-all duration-300 hover:border-white/10 hover:bg-white/[0.03]">
                      <div className={`text-xl font-bold tabular-nums ${s.gradient ? "gradient-text-gold" : ""}`}>
                        <AnimatedNumber value={s.value} decimals={s.gradient ? 1 : 0} />
                      </div>
                      <div className="mt-0.5 text-[10px] text-white/40">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Feedback Form ──────────────── */}
            <div className="feedback-card shimmer-border tilt-card glow-card glass rounded-3xl p-8 sm:p-10" onMouseMove={handleCardMouse}>
              <div className="relative z-10">
                <h3 className="text-lg font-semibold">Share Your Feedback</h3>
                <p className="mt-1 text-xs text-white/40">No login required — just be honest and respectful.</p>

                <form onSubmit={onSubmit} className="mt-7 space-y-5">
                  {/* Name */}
                  <label className="block">
                    <div className="mb-2 text-xs font-medium text-white/60">Your Name</div>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Krutarth Raychura" disabled={isSubmitting}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3.5 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 focus:border-violet-500/40 focus:bg-white/[0.045] focus:shadow-[0_0_25px_rgba(139,92,246,0.12)]" />
                  </label>

                  {/* Role */}
                  <div>
                    <div className="mb-2 text-xs font-medium text-white/60">You are</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { key: "student" as const, icon: "🎓", label: "Student", color: "cyan" },
                        { key: "teacher" as const, icon: "👨‍🏫", label: "Faculty", color: "violet" },
                      ].map((r) => (
                        <button key={r.key} type="button" onClick={() => setRole(r.key)} disabled={isSubmitting}
                          className={"rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all duration-300 " +
                            (role === r.key
                              ? `border-${r.color}-400/30 bg-${r.color}-400/10 text-white shadow-[0_0_25px_rgba(${r.color === "cyan" ? "6,182,212" : "139,92,246"},0.1)]`
                              : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/15 hover:bg-white/[0.04]")
                          }
                        >
                          {r.icon} {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Star rating */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-medium text-white/60">Rating</div>
                      <button type="button" onClick={() => setSoundOn((v) => !v)} disabled={isSubmitting}
                        className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[10px] text-white/45 transition hover:border-white/15">
                        🔊 {soundOn ? "On" : "Off"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const n = i + 1;
                        const active = n <= (hoverRating || rating);
                        return (
                          <button key={n} type="button"
                            onMouseEnter={() => setHoverRating(n)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => { playStarClick(); setRating(n); }}
                            disabled={isSubmitting}
                            className={"group inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-all duration-300 " +
                              (active ? "border-amber-400/30 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.12)] scale-[1.03]" : "border-white/10 bg-white/[0.02] hover:border-white/15 hover:scale-[1.02]")
                            }
                          >
                            <StarIcon filled={active} />
                            <span className={active ? "text-white font-medium" : "text-white/45"}>{n}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback text */}
                  <label className="block">
                    <div className="mb-2 text-xs font-medium text-white/60">Your Feedback</div>
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What did you think about BrainFuel AI?..." rows={4} disabled={isSubmitting}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3.5 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 focus:border-violet-500/40 focus:bg-white/[0.045] focus:shadow-[0_0_25px_rgba(139,92,246,0.12)]" />
                  </label>

                  {/* Submit */}
                  <button type="submit" disabled={isSubmitting} ref={submitBtnRef}
                    className="btn-glow inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-4 py-4 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmitting ? (
                      <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Submitting...</>
                    ) : (
                      <>Submit Feedback <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg></>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
         MARQUEE TICKER
         ════════════════════════════════════════ */}
      {marqueeReviews.length >= 3 && (
        <section className="marquee-section relative overflow-hidden py-12">
          <div className="section-divider mx-auto mb-8 w-full max-w-4xl" />
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#030014] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#030014] to-transparent" />
            <div className="marquee-track">
              {[...marqueeReviews, ...marqueeReviews].map((r, idx) => (
                <div key={`${r.id}-${idx}`} className="mx-3 flex-shrink-0 w-[320px] rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white/80 text-sm">{r.name}</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${r.role === "teacher" ? "border-violet-400/20 bg-violet-400/10 text-violet-200/70" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200/70"}`}>
                        {r.role === "teacher" ? "Faculty" : "Student"}
                      </span>
                    </div>
                    <StarsRow rating={clampRating(r.rating)} />
                  </div>
                  <p className="mt-2.5 text-xs leading-5 text-white/45 line-clamp-2">{r.feedback}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="section-divider mx-auto mt-8 w-full max-w-4xl" />
        </section>
      )}

      {/* ════════════════════════════════════════
         FEATURED REVIEW
         ════════════════════════════════════════ */}
      {featuredReview && (
        <section className="relative px-5 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="featured-card shimmer-border tilt-card rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/8 via-white/[0.02] to-cyan-400/8 p-8 backdrop-blur sm:p-10">
              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-1.5 text-xs font-medium text-amber-200/85">
                      ⭐ Featured Review
                      <span className="h-3 w-px bg-white/15" />
                      Top-rated Faculty
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <div className="text-xl font-bold">{featuredReview.name}</div>
                      <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-0.5 text-[10px] text-violet-200/80">Faculty</span>
                    </div>
                    <div className="mt-2"><StarsRow rating={5} /></div>
                  </div>
                  <div className="text-xs tabular-nums text-white/30">{new Date(featuredReview.created_at).toLocaleString()}</div>
                </div>
                <p className="mt-5 text-sm leading-7 text-white/65">{featuredReview.feedback}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
         ALL REVIEWS
         ════════════════════════════════════════ */}
      <section id="reviews" className="reviews-section relative px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="section-heading mb-12 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-300/50">Reviews</div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Live Feedback <span className="gradient-text">Wall</span>
            </h2>
          </div>

          <div className="reviews-section-card glow-card glass rounded-3xl p-8 sm:p-10" onMouseMove={handleCardMouse}>
            <div className="relative z-10">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-white/40">
                    {isLoadingReviews ? "Loading reviews..." : `Showing ${Math.min(visibleCount, filteredReviews.length)} of ${filteredReviews.length} filtered · ${reviews.length} total`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="pulse-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400/60">Real-time</span>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {([{ key: "all" as const, label: "All" }, { key: "student" as const, label: "Students" }, { key: "teacher" as const, label: "Faculty" }] as const).map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setRoleFilter(key)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-300 ${roleFilter === key ? (key === "student" ? "border-cyan-400/30 bg-cyan-400/10 text-white" : key === "teacher" ? "border-violet-400/30 bg-violet-400/10 text-white" : "border-white/20 bg-white/10 text-white") : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/15"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[10px] text-white/35">Stars:</div>
                  {([0,5,4,3,2,1] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setStarFilter(s)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${starFilter === s ? "border-amber-400/30 bg-amber-400/10 text-white" : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/15"}`}>
                      {s === 0 ? "All" : `${s}★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards */}
              {filteredReviews.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-10 text-center text-sm text-white/45">
                  {isLoadingReviews ? "Loading reviews..." : "No reviews match this filter."}
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredReviews.slice(0, visibleCount).map((r) => (
                    <div key={r.id} className="review-card rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-white/85">{r.name}</div>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${r.role === "teacher" ? "border-violet-400/20 bg-violet-400/8 text-violet-200/75" : "border-cyan-400/20 bg-cyan-400/8 text-cyan-200/75"}`}>
                              {r.role === "teacher" ? "Faculty" : "Student"}
                            </span>
                          </div>
                          <div className="mt-1.5"><StarsRow rating={clampRating(r.rating)} /></div>
                        </div>
                        <div className="flex-shrink-0 text-[10px] tabular-nums text-white/25">{new Date(r.created_at).toLocaleString()}</div>
                      </div>
                      <p className="mt-3.5 text-sm leading-6 text-white/55">{r.feedback}</p>
                    </div>
                  ))}
                </div>
              )}

              {filteredReviews.length > visibleCount && (
                <div className="mt-8 flex justify-center">
                  <button type="button" onClick={() => setVisibleCount((n) => n + 12)}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] px-7 py-3 text-sm font-medium text-white/65 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.05] hover:text-white/80">
                    Load more reviews
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ═════════════════ */}
      <div className="section-divider mx-auto w-full max-w-4xl" />
      <footer className="relative py-14 text-center">
        <div className="mx-auto max-w-lg px-5">
          <div className="text-xs leading-6 text-white/25">
            Built for <span className="text-white/40">BrainFuel AI</span> project presentation
            at <span className="text-white/40">LJ Innovation Village 2026</span>
            <br />
            Real-time updates powered by Supabase · Designed & developed by{" "}
            <span className="text-white/40">Krutarth Raychura</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
