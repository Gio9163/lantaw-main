import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/button";
import { LandingShowcaseCollage } from "./LandingShowcaseCollage";
import {
  Eye,
  LayoutDashboard,
  Users,
  BarChart3,
  ClipboardList,
} from "lucide-react";

function DecorativeWaves() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Top-left dotted waves (A) */}
      <svg
        className="absolute -top-20 -left-24 h-[420px] w-[520px] text-primary/45"
        viewBox="0 0 520 420"
        fill="none"
      >
        <defs>
          <linearGradient id="lantaw_wave_a" x1="0" y1="0" x2="520" y2="420">
            <stop stopColor="currentColor" stopOpacity="0.95" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g
          stroke="url(#lantaw_wave_a)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0.1 9"
        >
          {/* dotted/pointillism feel */}
          <path
            d="M-90 115 C 30 25, 205 40, 340 120 S 560 235, 710 150"
            strokeWidth="3.2"
            opacity="0.95"
          />
          <path
            d="M-110 150 C 25 70, 205 78, 350 150 S 580 270, 730 185"
            strokeWidth="2.8"
            opacity="0.8"
          />
          <path
            d="M-130 185 C 20 115, 210 120, 365 185 S 600 305, 755 220"
            strokeWidth="2.6"
            opacity="0.72"
          />
          <path
            d="M-150 220 C 18 150, 220 160, 390 230 S 635 345, 790 260"
            strokeWidth="2.4"
            opacity="0.62"
          />
          <path
            d="M-170 255 C 20 190, 235 208, 410 270 S 665 385, 820 300"
            strokeWidth="2.2"
            opacity="0.55"
          />
          <path
            d="M-190 290 C 25 230, 250 252, 430 310 S 700 430, 855 340"
            strokeWidth="2"
            opacity="0.5"
          />
          <path
            d="M-210 325 C 30 270, 270 295, 460 350 S 730 470, 900 380"
            strokeWidth="1.8"
            opacity="0.45"
          />
        </g>
      </svg>

      {/* Bottom-right blended dotted contour (A) */}
      <svg
        className="absolute -bottom-28 -right-40 h-[520px] w-[680px] text-primary/40"
        viewBox="0 0 680 520"
        fill="none"
      >
        <defs>
          <linearGradient id="lantaw_wave_b" x1="680" y1="0" x2="0" y2="520">
            <stop stopColor="currentColor" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g
          stroke="url(#lantaw_wave_b)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0.1 10"
        >
          {/* dotted contour stack */}
          <path
            d="M-40 470 C 120 380, 320 370, 520 445 S 880 580, 1120 450"
            strokeWidth="3"
            opacity="0.85"
          />
          <path
            d="M-75 435 C 110 340, 320 332, 530 410 S 900 545, 1150 415"
            strokeWidth="2.6"
            opacity="0.7"
          />
          <path
            d="M-110 400 C 100 305, 320 298, 540 375 S 920 510, 1180 380"
            strokeWidth="2.4"
            opacity="0.7"
          />
          <path
            d="M-145 365 C 92 270, 320 265, 550 340 S 940 475, 1210 345"
            strokeWidth="2.2"
            opacity="0.62"
          />
          <path
            d="M-180 330 C 86 235, 322 232, 560 305 S 960 440, 1240 310"
            strokeWidth="2"
            opacity="0.58"
          />
          <path
            d="M-215 295 C 82 205, 326 205, 572 270 S 980 405, 1270 275"
            strokeWidth="1.8"
            opacity="0.52"
          />
          <path
            d="M-250 260 C 80 175, 332 178, 585 235 S 1000 370, 1300 240"
            strokeWidth="1.6"
            opacity="0.48"
          />
        </g>
      </svg>

      {/* Mid-right tech circuit lines (B) */}
      <svg
        className="absolute top-24 -right-40 h-[340px] w-[520px] text-primary/35"
        viewBox="0 0 520 340"
        fill="none"
      >
        <defs>
          <linearGradient id="lantaw_wave_c" x1="520" y1="0" x2="0" y2="340">
            <stop stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g
          stroke="url(#lantaw_wave_c)"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* main circuit trunk */}
          <path
            d="M520 70 H360 Q330 70 330 100 V140 Q330 165 305 165 H225 Q195 165 195 195 V235 Q195 265 165 265 H85 Q60 265 60 290 V320"
            strokeWidth="1.6"
            opacity="0.85"
          />
          {/* branch 1 */}
          <path
            d="M330 115 H410 Q440 115 440 90 V60"
            strokeWidth="1.3"
            opacity="0.7"
          />
          {/* branch 2 */}
          <path
            d="M240 165 V130 Q240 110 260 110 H305"
            strokeWidth="1.3"
            opacity="0.65"
          />
          {/* branch 3 */}
          <path
            d="M195 220 H140 Q110 220 110 190 V150"
            strokeWidth="1.2"
            opacity="0.6"
          />
          {/* node dots */}
          <g fill="currentColor" opacity="0.8">
            <circle cx="330" cy="100" r="2.6" />
            <circle cx="330" cy="165" r="2.4" />
            <circle cx="195" cy="195" r="2.4" />
            <circle cx="195" cy="235" r="2.2" />
            <circle cx="110" cy="190" r="2.2" />
            <circle cx="440" cy="90" r="2.2" />
            <circle cx="60" cy="290" r="2.2" />
          </g>
          {/* thin parallel accent */}
          <path
            d="M520 86 H375 Q350 86 350 110 V145 Q350 178 318 178 H240 Q215 178 215 205 V248 Q215 282 182 282 H96 Q76 282 76 304 V330"
            strokeWidth="1"
            opacity="0.5"
            strokeDasharray="2 6"
          />
        </g>
      </svg>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  const handleLoginClick = () => navigate("/login");
  const handleProjectsClick = () => navigate("/projects");

  const whatSectionRef = useRef<HTMLElement | null>(null);
  const [hasRevealedWhat, setHasRevealedWhat] = useState(false);

  const heroSectionRef = useRef<HTMLElement | null>(null);
  const [hasRevealedHero, setHasRevealedHero] = useState(false);

  const featuresSectionRef = useRef<HTMLElement | null>(null);
  const [hasRevealedFeatures, setHasRevealedFeatures] = useState(false);
  const [hasFinishedHeroIntro, setHasFinishedHeroIntro] = useState(false);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    // Safari fallback
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const HERO_ANIMATION_FINISH_MS = 900;
  const canShowShowcase = hasRevealedWhat && hasFinishedHeroIntro;

  useEffect(() => {
    if (!whatSectionRef.current) return;

    const el = whatSectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setHasRevealedWhat(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!heroSectionRef.current) return;

    const el = heroSectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setHasRevealedHero(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasRevealedHero) return;
    if (prefersReducedMotion) {
      setHasFinishedHeroIntro(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setHasFinishedHeroIntro(true);
    }, HERO_ANIMATION_FINISH_MS);

    return () => window.clearTimeout(timer);
  }, [hasRevealedHero, prefersReducedMotion]);

  useEffect(() => {
    if (!featuresSectionRef.current) return;

    const el = featuresSectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setHasRevealedFeatures(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top bar with login button on the right */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-6">
        <div className="flex items-center">
          <Eye className="size-14 text-primary" strokeWidth={1.25} aria-hidden />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <Button
            variant="outline"
            onClick={handleProjectsClick}
            className="px-6"
          >
            Projects
          </Button>
          <Button onClick={handleLoginClick} className="px-6">
            Login
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main
        ref={heroSectionRef}
        className="relative flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-hidden"
      >
        <DecorativeWaves />
        <div className="relative text-center max-w-4xl mx-auto">
          <div
            className={[
              "transition-all duration-700 ease-out delay-150",
              hasRevealedHero
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-6",
              "motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none",
            ].join(" ")}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 mt-6">
              LANTAW
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Project visibility and team coordination in one place. Plan, track,
              and deliver with clarity.
            </p>
          </div>
        </div>
      </main>

      {/* What is Lantaw */}
      <section
        ref={whatSectionRef}
        className="relative px-4 sm:px-8 py-16 md:py-24 bg-primary text-primary-foreground border-t border-primary-foreground/20 overflow-hidden"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* faint divider wave across the top */}
          <svg
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-[1100px] max-w-none text-primary-foreground/35"
            viewBox="0 0 1100 120"
            fill="none"
          >
            <path
              d="M0 70 C 140 25, 280 25, 420 70 S 700 115, 840 70 S 980 25, 1100 70"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M0 90 C 140 45, 280 45, 420 90 S 700 135, 840 90 S 980 45, 1100 90"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.8"
            />
            <path
              d="M0 50 C 140 10, 280 10, 420 50 S 700 90, 840 50 S 980 10, 1100 50"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.55"
            />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto">
          <LandingShowcaseCollage isVisible={canShowShowcase} />
        </div>
      </section>

      {/* Features */}
      <section
        ref={featuresSectionRef}
        className="px-4 sm:px-8 py-16 md:py-24 bg-muted/50"
      >
        <div className="max-w-4xl mx-auto">
          <div
            className={[
              "text-center mb-8 md:mb-10",
              "transition-all duration-700 ease-out",
              hasRevealedFeatures ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              "motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none",
            ].join(" ")}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              What is Lantaw?
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Lantaw helps teams and organizations keep projects on track.
              From activities and personnel to analytics and change requests,
              you get a single view of progress and clear accountability so
              everyone knows what’s done and what’s next.
            </p>
          </div>
          <div
            className={[
              "transition-all duration-700 ease-out delay-250",
              hasRevealedFeatures ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              "motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none",
            ].join(" ")}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Why Lantaw?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="rounded-lg bg-card p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <LayoutDashboard className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold">Dashboard overview</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  See project status at a glance. One place for key metrics and
                  recent activity.
                </p>
              </div>
              <div className="rounded-lg bg-card p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <ClipboardList className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold">Activities & tasks</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Track activities, assign owners, and manage change requests in a
                  structured workflow.
                </p>
              </div>
              <div className="rounded-lg bg-card p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold">Personnel</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Manage team members and roles. Keep roles and access aligned with
                  your structure.
                </p>
              </div>
              <div className="rounded-lg bg-card p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <BarChart3 className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold">Analytics & history</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Visualize progress with charts and review a full history log for
                  audit and transparency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-8 py-8 border-t border-border bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
          © 2026 Lantaw. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
