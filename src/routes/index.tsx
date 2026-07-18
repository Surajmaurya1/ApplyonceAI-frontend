import { createFileRoute } from "@tanstack/react-router";
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  Play,
  Check,
  FileText,
  ChevronRight,
  Menu,
  X,
  Zap,
  Shield,
  Cloud,
  Sparkles,
  MousePointerClick,
  Globe,
  Cpu,
  Upload,
  KeyRound,
  Rocket,
  Github,
  RotateCw,
  Pause,
  Circle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "ApplyOnce AI",
          applicationCategory: "BrowserApplication",
          operatingSystem: "Chrome",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "Chrome extension that auto-fills every job application using your saved profile.",
        }),
      },
    ],
  }),
  component: Landing,
});

/* -------------------------------------------------------------------------- */
/*  Small primitives                                                          */
/* -------------------------------------------------------------------------- */

function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <>
    </>
    // <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    //   <defs>
    //     <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
    //       <stop offset="0%" stopColor="#ff2a34" />
    //       <stop offset="100%" stopColor="#8a0007" />
    //     </linearGradient>
    //   </defs>
    //   <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#lg1)" />
    //   <path d="M12 27 L20 11 L28 27" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    //   <path d="M15.5 22 H24.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
    // </svg>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs uppercase tracking-widest text-muted">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
      {children}
    </div>
  );
}

function Counter({ to, suffix = "", duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.floor(v).toString());
  useEffect(() => {
    if (inView) animate(mv, to, { duration, ease: "easeOut" });
  }, [inView, to, duration, mv]);
  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Programmatic ZIP download                     */
/* -------------------------------------------------------------------------- */

function downloadDummyZip() {
  const a = document.createElement("a");
  a.href = "/download/applyonce-extension.zip";
  a.download = "applyonce-ai-extension.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                    */
/* -------------------------------------------------------------------------- */

const NAV_LINKS = [
  { label: "The Pain", id: "pain" },
  { label: "How it Works", id: "how" },
  { label: "Interactive Demo", id: "demo" },
  { label: "Installation", id: "install" },
  { label: "FAQ", id: "faq" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav
        initial={false}
        animate={{
          maxWidth: scrolled ? 880 : 1120,
          paddingTop: scrolled ? 6 : 10,
          paddingBottom: scrolled ? 6 : 10,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className={`flex w-full items-center justify-between gap-6 rounded-full border px-3 md:px-4 backdrop-blur-xl transition-colors ${
          scrolled
            ? "border-white/10 bg-black/70 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)]"
            : "border-white/[0.07] bg-black/40"
        }`}
      >
        <a href="#top" className="flex items-center gap-2 pl-2">
          <Logo className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight">
            ApplyOnce <span className="text-primary">AI</span>
          </span>
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => scrollToId(l.id)}
                className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <Button
            onClick={downloadDummyZip}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(225,29,42,0.55)] transition-all hover:scale-[1.02]"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="rounded-full p-2 text-foreground hover:bg-white/[0.06]" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85%] border-l border-white/10 bg-gradient-to-b from-[#140204] to-black text-foreground"
            >
              <div className="mb-8 flex items-center gap-2">
                <Logo />
                <span className="font-semibold">ApplyOnce <span className="text-primary">AI</span></span>
              </div>
              <ul className="space-y-2">
                {NAV_LINKS.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        setTimeout(() => scrollToId(l.id), 200);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-base hover:border-primary/40 hover:bg-primary/10"
                    >
                      {l.label}
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => {
                  setOpen(false);
                  downloadDummyZip();
                }}
                className="mt-8 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Download className="mr-2 h-4 w-4" /> Download Extension
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </motion.nav>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero — simulated browser + form autofill loop                             */
/* -------------------------------------------------------------------------- */

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_30px_80px_-20px_rgba(229,9,20,0.35)]">
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#121212] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-4 flex-1 truncate rounded-md bg-black/40 px-3 py-1 text-xs text-muted">
          jobs.greenhouse.io/apply
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function TypingField({
  label,
  value,
  active,
  done,
}: {
  label: string;
  value: string;
  active: boolean;
  done: boolean;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active) {
      setText("");
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setText(value.slice(0, i));
      if (i >= value.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [active, value]);
  useEffect(() => {
    if (done) setText(value);
  }, [done, value]);

  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">{label}</label>
      <div
        className={`flex h-10 items-center rounded-md border bg-black/40 px-3 text-sm transition-colors ${
          active ? "border-primary/60 shadow-[0_0_0_3px_rgba(229,9,20,0.15)]" : "border-white/10"
        }`}
      >
        <span className="text-foreground">{text}</span>
        {active && text.length < value.length && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary" />
        )}
      </div>
    </div>
  );
}

function HeroForm() {
  const [step, setStep] = useState(0); // 0 name, 1 email, 2 resume, 3 done
  useEffect(() => {
    const seq = [1200, 1500, 2200, 2400];
    let t: ReturnType<typeof setTimeout>;
    const tick = (i: number) => {
      t = setTimeout(() => {
        setStep((s) => (s >= 3 ? 0 : s + 1));
        tick(i + 1);
      }, seq[step] ?? 1500);
    };
    tick(0);
    return () => clearTimeout(t);
  }, [step]);

  const resumeProgress = step >= 2 ? (step === 2 ? 100 : 100) : 0;

  return (
    <BrowserFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Senior Product Engineer</div>
            <div className="text-xs text-muted">Greenhouse · Remote</div>
          </div>
          <motion.div
            className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary-foreground"
            animate={{ opacity: step >= 3 ? 1 : 0.5 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            ApplyOnce AI active
          </motion.div>
        </div>

        <TypingField label="Full Name" value="Alex Rivera" active={step === 0} done={step > 0} />
        <TypingField label="Email" value="alex@applyonce.ai" active={step === 1} done={step > 1} />

        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">Resume</label>
          <div
            className={`flex items-center gap-3 rounded-md border bg-black/40 px-3 py-2.5 text-sm transition-colors ${
              step >= 2 ? "border-primary/60" : "border-white/10"
            }`}
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-xs">alex-rivera-resume.pdf</div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-[#ff5560]"
                  initial={{ width: 0 }}
                  animate={{ width: `${resumeProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            {step >= 3 ? (
              <Check className="h-5 w-5 text-emerald-400" />
            ) : (
              <span className="text-xs text-muted">{resumeProgress}%</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
              <motion.circle
                cx="20"
                cy="20"
                r="16"
                stroke="#e50914"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 16}
                initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - Math.min(step, 3) / 3) }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute text-[11px] font-semibold">{Math.round((Math.min(step, 3) / 3) * 100)}%</span>
          </div>
          <AnimatePresence>
            {step >= 3 && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <div className="absolute inset-0 -m-2 rounded-full bg-emerald-400/20 blur-xl" />
                <div className="relative flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
                  <Check className="h-4 w-4" /> Done.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-4 pb-16 pt-32 md:pb-24 md:pt-40">
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full red-radial blur-3xl" />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
          <div className="mb-5"><SectionEyebrow>Chrome extension · Developer preview</SectionEyebrow></div>
          <h1 className="text-gradient-silver text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Applying for jobs shouldn't feel like a full-time job.
          </h1>
          <div className="mt-6 space-y-4 text-base text-muted md:text-lg">
            <p>
              Every application asks the same questions: Name. Email. Phone. Resume. Education. Experience. Skills.{" "}
              {["Again.", "Again.", "Again."].map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, color: "#b8b8b8" }}
                  animate={{
                    opacity: 1,
                    color: ["#ff8a90", "#ff3340", "#e50914"][i],
                    textShadow: `0 0 ${8 + i * 10}px rgba(229,9,20,${0.3 + i * 0.2})`,
                  }}
                  transition={{ delay: 0.6 + i * 0.35, duration: 0.5 }}
                  className="ml-1 font-semibold"
                >
                  {w}
                </motion.span>
              ))}
            </p>
            <p className="italic text-foreground/80">
              ApplyOnce AI fills every job application automatically so you can focus on getting interviews instead of typing.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={downloadDummyZip}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_40px_rgba(229,9,20,0.6)] transition-shadow"
            >
              <Download className="mr-2 h-4 w-4" /> Download Extension
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToId("demo")}
              className="border-white/15 bg-white/[0.02] text-foreground hover:bg-white/[0.06]"
            >
              <Play className="mr-2 h-4 w-4" /> Watch Demo
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 90, damping: 16 }}
        >
          <HeroForm />
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 2 — The Pain                                                      */
/* -------------------------------------------------------------------------- */

function PainSection() {
  const [clicks, setClicks] = useState(0);
  const clickIntensity = Math.min(clicks / 30, 1);

  const timeline = [
    { label: "Open Job Listing", tone: "gray" },
    { label: "Upload Resume", tone: "yellow" },
    { label: "Fill Same Information", tone: "red" },
    { label: "Answer Repeated Questions", tone: "red-strong", note: "Frustrated?" },
    { label: "Submit", tone: "faded" },
    { label: "Repeat", tone: "loop" },
  ];

  return (
    <section id="pain" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <SectionEyebrow>The Pain</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Every job application <span className="text-primary">steals your time.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { label: "Average job application", value: 15, suffix: " min" },
              { label: "20 applications", value: 5, suffix: " hrs" },
              { label: "100 applications", value: 25, suffix: "+ hrs" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-card/60 p-5 backdrop-blur"
              >
                <div className="text-3xl font-bold text-primary md:text-4xl">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-xs text-muted">{s.label}</div>
              </div>
            ))}
            <button
              onClick={() => setClicks((c) => c + 1)}
              className="group relative overflow-hidden rounded-2xl border p-5 text-left transition-colors"
              style={{
                borderColor: `rgba(229,9,20,${0.15 + clickIntensity * 0.6})`,
                background: `rgba(229,9,20,${0.03 + clickIntensity * 0.15})`,
              }}
            >
              <div
                className="text-3xl font-bold md:text-4xl"
                style={{ color: `rgb(${229 + (255 - 229) * clickIntensity}, ${9 * (1 - clickIntensity)}, ${20 * (1 - clickIntensity)})` }}
              >
                {clicks}
              </div>
              <div className="mt-1 text-xs text-muted">Clicks to fill one form — try it</div>
              <MousePointerClick className="absolute right-3 top-3 h-4 w-4 text-primary opacity-60 group-hover:animate-pulse" />
            </button>
          </motion.div>

          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-white/5 via-primary/30 to-white/5" />
            <ul className="space-y-4">
              {timeline.map((n, i) => (
                <motion.li
                  key={n.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.08 }}
                  className="relative flex items-center gap-4 pl-10"
                >
                  <span
                    className={`absolute left-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      n.tone === "gray"
                        ? "bg-white/10 text-muted"
                        : n.tone === "yellow"
                        ? "bg-amber-400/20 text-amber-300 ring-2 ring-amber-400/40"
                        : n.tone === "red"
                        ? "bg-primary/20 text-primary-foreground ring-2 ring-primary/50 animate-pulse"
                        : n.tone === "red-strong"
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(229,9,20,0.6)]"
                        : n.tone === "faded"
                        ? "bg-white/5 text-muted/60"
                        : "bg-primary/30 text-primary-foreground"
                    }`}
                  >
                    {n.tone === "loop" ? <RotateCw className="h-3 w-3" /> : i + 1}
                  </span>
                  <div
                    className={`flex-1 rounded-xl border px-4 py-3 ${
                      n.tone === "red" || n.tone === "red-strong"
                        ? "border-primary/30 bg-primary/[0.06]"
                        : n.tone === "loop"
                        ? "border-primary/40 bg-primary/[0.08]"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={n.tone === "faded" ? "text-muted/60" : "text-foreground"}>{n.label}</span>
                      {n.note && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {n.note}
                        </span>
                      )}
                      {n.tone === "loop" && (
                        <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          ∞ infinite loop
                        </span>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 3 — Meet the product                                              */
/* -------------------------------------------------------------------------- */

function Solution() {
  return (
    <section className="relative px-4 py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 red-radial blur-3xl" />
      <div className="mx-auto max-w-4xl text-center">
        <SectionEyebrow>The Solution</SectionEyebrow>
        <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
          Meet <span className="text-gradient-silver">ApplyOnce AI</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted md:text-lg">
          A browser extension that understands job forms and fills them instantly using your saved profile.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          animate={{ y: [0, -10, 0] }}
          transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          className="relative mx-auto mt-14 w-full max-w-sm"
        >
          <div className="absolute -inset-8 -z-10 rounded-full red-radial blur-2xl" />
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(229,9,20,0.5)]">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <Logo className="h-6 w-6" />
                <span className="text-sm font-semibold">ApplyOnce AI</span>
              </div>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                Online
              </span>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-bold text-primary-foreground">
                  AR
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">Alex Rivera</div>
                  <div className="text-xs text-muted">Profile 98% complete</div>
                </div>
              </div>
              <button
                className="relative w-full overflow-hidden rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
                style={{ animation: "pulse-glow 2.5s ease-in-out infinite" }}
              >
                <Sparkles className="mr-2 inline h-4 w-4" />
                Auto Fill Form
              </button>
              <div className="grid grid-cols-3 gap-2 text-left text-[11px]">
                {[
                  { k: "Resume", v: "Saved" },
                  { k: "Projects", v: "5" },
                  { k: "Skills", v: "12" },
                ].map((x) => (
                  <div key={x.k} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                    <div className="text-muted">{x.k}</div>
                    <div className="font-semibold">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 4 — How it works                                                  */
/* -------------------------------------------------------------------------- */

function HowCard({
  n,
  title,
  desc,
  children,
}: {
  n: number;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || !ref.current) return;
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur transition-colors hover:border-primary/40"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(280px circle at var(--mx,50%) var(--my,50%), rgba(229,9,20,0.15), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-bold text-primary-foreground">
          {n}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted">{desc}</p>
        <div className="mt-5">{children}</div>
      </div>
    </motion.div>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">Three steps to zero typing.</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <HowCard n={1} title="Install Extension" desc="Download and load the extension into Chrome in less than a minute.">
            <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs">
              <div className="mb-2 text-muted">chrome://extensions</div>
              <div className="flex items-center justify-between rounded border border-white/5 p-2">
                <span>Developer mode</span>
                <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary/60">
                  <span className="ml-4 h-4 w-4 rounded-full bg-white" />
                </span>
              </div>
            </div>
          </HowCard>
          <HowCard n={2} title="Create Your Profile" desc="Save your resume, education, experience, projects, links, and skills once.">
            <ul className="space-y-2 text-xs">
              {["Resume uploaded", "3 education entries", "4 work experiences", "12 skills tagged"].map((t) => (
                <li key={t} className="flex items-center gap-2 rounded border border-white/5 bg-black/30 px-3 py-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
          </HowCard>
          <HowCard n={3} title="Apply Anywhere" desc="Open LinkedIn, Greenhouse, Lever, Workday, Indeed or company career pages. Click Auto Fill. Done.">
            <div className="relative rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="space-y-1.5">
                <div className="h-2 w-3/4 rounded bg-white/10" />
                <div className="h-2 w-1/2 rounded bg-white/10" />
                <div className="h-2 w-2/3 rounded bg-white/10" />
              </div>
              <motion.div
                animate={{ y: [10, -6, 10], x: [0, 4, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-[0_0_20px_rgba(229,9,20,0.7)]"
              >
                <MousePointerClick className="h-4 w-4 text-white" />
              </motion.div>
            </div>
          </HowCard>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 5 — Interactive Sandbox Demo                                      */
/* -------------------------------------------------------------------------- */

const DEMO_STEPS = [
  "Open Job Page",
  "Open Extension",
  "AI Form Scan",
  "Auto Fill",
  "File Upload",
  "Success",
];

function Confetti({ active }: { active: boolean }) {
  const pieces = 32;
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: pieces }).map((_, i) => {
        const left = Math.random() * 100;
        const color = i % 2 === 0 ? "#e50914" : "#ffffff";
        const delay = Math.random() * 0.3;
        return (
          <motion.span
            key={i}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: 500, opacity: [0, 1, 1, 0], rotate: 360 }}
            transition={{ duration: 2.2, delay, ease: "easeOut" }}
            className="absolute h-2 w-1.5"
            style={{ left: `${left}%`, background: color, top: 0 }}
          />
        );
      })}
    </div>
  );
}

function InteractiveDemo() {
  const [step, setStep] = useState(-1); // -1 idle
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!running || paused) return;
    if (step >= DEMO_STEPS.length - 1) return;
    const id = setTimeout(() => setStep((s) => s + 1), step === -1 ? 300 : 1400);
    return () => clearTimeout(id);
  }, [step, running, paused]);

  const start = () => {
    setStep(-1);
    setRunning(true);
    setPaused(false);
  };
  const restart = () => {
    setStep(-1);
    setRunning(false);
    setTimeout(start, 100);
  };

  const activeStep = Math.max(step, 0);
  const isSuccess = step >= DEMO_STEPS.length - 1;

  return (
    <section id="demo" className="relative px-4 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 mx-auto h-[400px] w-full max-w-4xl red-radial blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <SectionEyebrow>Interactive demo</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            See it fill a real form.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            A full 6-step walkthrough of the ApplyOnce workflow — no install required.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/60 p-6 backdrop-blur md:p-10">
          {/* Steps progress */}
          <div className="mb-6 grid grid-cols-6 gap-2">
            {DEMO_STEPS.map((label, i) => (
              <div key={label} className="min-w-0">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    running && i <= activeStep ? "bg-primary shadow-[0_0_10px_rgba(229,9,20,0.6)]" : "bg-white/10"
                  }`}
                />
                <div className={`mt-2 truncate text-[10px] md:text-xs ${running && i <= activeStep ? "text-foreground" : "text-muted"}`}>
                  Step {i + 1}: {label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <BrowserFrame>
                <div className="relative">
                  {/* Scan line */}
                  <AnimatePresence>
                    {running && activeStep === 2 && (
                      <motion.div
                        initial={{ top: "0%", opacity: 0 }}
                        animate={{ top: "100%", opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "linear" }}
                        className="pointer-events-none absolute left-0 right-0 z-10 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(229,9,20,0.9)]"
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={
                      isSuccess
                        ? { boxShadow: "0 0 0 3px rgba(229,9,20,0.6), 0 0 60px rgba(229,9,20,0.5)" }
                        : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
                    }
                    transition={{ duration: 0.4 }}
                    className="space-y-3 rounded-lg"
                  >
                    <div className="text-sm font-semibold">Application · Product Engineer</div>
                    {[
                      { l: "Full Name", v: "Alex Rivera" },
                      { l: "Email", v: "alex@applyonce.ai" },
                      { l: "Phone", v: "+1 (415) 555-0134" },
                      { l: "LinkedIn", v: "linkedin.com/in/alexrivera" },
                      { l: "Why do you want this role?", v: "Because I love shipping." },
                    ].map((f, i) => (
                      <motion.div
                        key={f.l}
                        initial={false}
                        animate={{
                          borderColor:
                            running && activeStep >= 3 ? "rgba(229,9,20,0.5)" : "rgba(255,255,255,0.08)",
                        }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-md border bg-black/40 px-3 py-2"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted">{f.l}</div>
                        <div className="mt-0.5 min-h-[18px] text-sm">
                          {running && activeStep >= 3 ? (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 + i * 0.1 }}
                            >
                              {f.v}
                            </motion.span>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted">Resume</div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: running && activeStep >= 4 ? "100%" : "0%" }}
                          transition={{ duration: 0.9 }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  </motion.div>
                  <Confetti active={isSuccess} />
                </div>
              </BrowserFrame>

              {/* Extension floating icon */}
              <motion.div
                animate={
                  running && activeStep >= 1
                    ? { scale: [1, 1.2, 1], boxShadow: "0 0 30px rgba(229,9,20,0.8)" }
                    : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }
                }
                className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/70 backdrop-blur"
              >
                <Logo className="h-6 w-6" />
              </motion.div>
            </div>

            <div className="flex flex-col justify-between gap-4 md:w-64">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="text-xs uppercase tracking-wider text-muted">Status</div>
                <div className="mt-1 text-lg font-semibold">
                  {step === -1 ? "Ready" : isSuccess ? "Success 🎉" : DEMO_STEPS[activeStep]}
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-white/10">
                  <motion.div
                    animate={{ width: running ? `${((activeStep + 1) / DEMO_STEPS.length) * 100}%` : "0%" }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {!running ? (
                  <Button onClick={start} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Play className="mr-2 h-4 w-4" /> Start Interactive Demo
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => setPaused((p) => !p)}
                      variant="outline"
                      className="border-white/15 bg-white/[0.02]"
                    >
                      {paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                      {paused ? "Resume" : "Pause"}
                    </Button>
                    <Button onClick={restart} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <RotateCw className="mr-2 h-4 w-4" /> Restart
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 6 — Bento Features                                                */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  { icon: Cpu, title: "AI Form Detection", desc: "Deep learning model maps input fields to profile items automatically.", span: "md:col-span-2 md:row-span-2" },
  { icon: FileText, title: "Resume Parser & Upload", desc: "Auto-formats and uploads PDF resumes to any ATS system." },
  { icon: Cloud, title: "Profile Sync", desc: "Keeps data updated across devices instantly." },
  { icon: Sparkles, title: "Smart Answers", desc: "Generates custom response text matching job-specific prompts.", span: "md:col-span-2" },
  { icon: MousePointerClick, title: "One Click Apply", desc: "Instantly fills and reviews complete applications in a single click." },
  { icon: Globe, title: "Multiple Job Boards", desc: "Universal support for all major job application sites." },
  { icon: Shield, title: "Privacy First", desc: "Saved profile details are stored locally on your machine." },
  { icon: KeyRound, title: "No Manual Typing", desc: "Zero typing required after setting up your profile once." },
  { icon: Check, title: "ATS Friendly", desc: "Ensures parsed values match standard applicant tracking system headers." },
  { icon: Zap, title: "Lightning Fast", desc: "Fills complex multi-page applications in under 2 seconds.", span: "md:col-span-2" },
];

function BentoCard({ f }: { f: (typeof FEATURES)[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = f.icon;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || !ref.current) return;
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur transition-colors hover:border-primary/40 ${f.span ?? ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(300px circle at var(--mx,50%) var(--my,50%), rgba(229,9,20,0.18), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-gradient-to-br from-primary/30 to-primary/5">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <h3 className="text-base font-semibold md:text-lg">{f.title}</h3>
        <p className="mt-2 text-sm text-muted">{f.desc}</p>
      </div>
    </motion.div>
  );
}

function Features() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <SectionEyebrow>Features</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">Built for the pace of a job search.</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[180px]">
          {FEATURES.map((f) => (
            <BentoCard key={f.title} f={f} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 7 — Platforms marquee                                             */
/* -------------------------------------------------------------------------- */

const PLATFORMS = [
  "LinkedIn", "Greenhouse", "Lever", "Workday", "Indeed",
  "Ashby", "SmartRecruiters", "SuccessFactors", "Taleo",
];

function Platforms() {
  const doubled = [...PLATFORMS, ...PLATFORMS];
  return (
    <section className="relative py-16">
      <div className="mx-auto mb-8 max-w-6xl px-4 text-center">
        <SectionEyebrow>Supported platforms</SectionEyebrow>
        <h2 className="mt-3 text-2xl font-bold md:text-3xl">Works everywhere you apply.</h2>
      </div>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max gap-4 animate-[marquee_40s_linear_infinite]">
          {doubled.map((p, i) => (
            <div
              key={i}
              className="flex h-14 items-center gap-3 whitespace-nowrap rounded-xl border border-white/10 bg-card/60 px-6 backdrop-blur"
            >
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
              <span className="text-sm font-semibold">{p}</span>
            </div>
          ))}
          <div className="flex h-14 items-center whitespace-nowrap rounded-xl border-2 border-dashed border-primary/60 px-6 text-sm font-semibold text-primary-foreground animate-pulse">
            More coming soon…
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 8 — Developer install guide                                       */
/* -------------------------------------------------------------------------- */

const INSTALL_STEPS = [
  { icon: Download, title: "Download ZIP", desc: "Grab the developer preview package." },
  { icon: Upload, title: "Extract Folder", desc: "Unzip anywhere on your machine." },
  { icon: Globe, title: "Open chrome://extensions", desc: "Paste the URL in a new tab." },
  { icon: KeyRound, title: "Enable Developer Mode", desc: "Toggle it on in the top right." },
  { icon: MousePointerClick, title: "Click Load Unpacked", desc: "It appears once dev mode is on." },
  { icon: FileText, title: "Select Extracted Folder", desc: "Point Chrome to your unzipped folder." },
  { icon: Rocket, title: "Done & Pin", desc: "Pin the ApplyOnce icon for quick access." },
];

function Installation() {
  return (
    <section id="install" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <SectionEyebrow>Installation</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Load it in developer mode.
          </h2>
          <p className="mt-3 text-muted">
            While we finish Chrome Web Store review, install the developer preview in under a minute.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INSTALL_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.05 }}
                className="relative rounded-2xl border border-white/10 bg-card/60 p-5 backdrop-blur"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-sm font-bold">
                    {i + 1}
                  </div>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-muted">{s.desc}</div>
                {i === 0 && (
                  <button
                    onClick={downloadDummyZip}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground hover:underline"
                  >
                    Download now <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 9 — FAQ                                                           */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes, the initial developer preview version is completely free to install and use.",
  },
  {
    q: "Does my data stay private?",
    a: "Yes. ApplyOnce AI stores all profile details locally in your browser's extension storage. No profile data is ever uploaded or sold.",
  },
  {
    q: "Does it work on LinkedIn?",
    a: "Yes, it fully supports LinkedIn Easy Apply, Greenhouse, Lever, Workday, and custom career portals.",
  },
  {
    q: "Can I edit the answers before submitting?",
    a: "Absolutely. The extension fills the form but lets you review, modify, and manually edit any answer before hitting submit.",
  },
  {
    q: "Will a Chrome Web Store version be available?",
    a: "Yes! We are currently in the store review process, and a public store version will be launched soon.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Questions, answered.</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-white/10 bg-card/60 px-5 backdrop-blur data-[state=open]:border-primary/40"
            >
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 10 — CTA                                                          */
/* -------------------------------------------------------------------------- */

function CTA() {
  return (
    <section className="px-4 pb-24">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[#e50914] via-[#7a0006] to-[#2a0002] px-6 py-16 text-center md:px-16 md:py-24">
          <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-black/40 blur-3xl" />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight md:text-5xl">
            Stop wasting hours filling the same forms.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80 md:text-lg">
            Install ApplyOnce AI today and make every application take seconds instead of minutes.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={downloadDummyZip}
              className="bg-black text-white hover:bg-black/80 shadow-[0_0_40px_rgba(0,0,0,0.6),0_0_60px_rgba(229,9,20,0.6)]"
            >
              <Download className="mr-2 h-4 w-4" /> Download Extension
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToId("demo")}
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              <Play className="mr-2 h-4 w-4" /> Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-xs text-muted md:text-sm">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-semibold text-foreground">ApplyOnce <span className="text-primary">AI</span></span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="https://github.com/Surajmaurya1/ApplyonceAI-frontend" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
          <a href="https://www.linkedin.com/in/suraj-maurya-33a91325a/" className="hover:text-foreground">Contact</a>
        </nav>
        <div>© {new Date().getFullYear()} ApplyOnce AI. All rights reserved.</div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                      */
/* -------------------------------------------------------------------------- */

function Landing() {
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <Hero />
      <PainSection />
      <Solution />
      <HowItWorks />
      <InteractiveDemo />
      <Features />
      <Platforms />
      <Installation />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
