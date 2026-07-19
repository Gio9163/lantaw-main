import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import overviewImage from "../assets/landing-showcase/overview.png";
import activitiesImage from "../assets/landing-showcase/activities.png";
import analyticsImage from "../assets/landing-showcase/analytics.png";
import personnelImage from "../assets/landing-showcase/personnel.png";
import historyLogImage from "../assets/landing-showcase/history-log.png";
import "./LandingShowcaseCollage.css";

type LandingShowcaseCollageProps = {
  isVisible: boolean;
};

const showcaseScreens = [
  {
    key: "overview",
    label: "Overview",
    src: overviewImage,
    alt: "LANTAW overview dashboard",
    eager: true,
  },
  {
    key: "activities",
    label: "Activities",
    src: activitiesImage,
    alt: "LANTAW activities management screen",
    eager: false,
  },
  {
    key: "analytics",
    label: "Analytics",
    src: analyticsImage,
    alt: "LANTAW analytics dashboard",
    eager: false,
  },
  {
    key: "personnel",
    label: "Personnel",
    src: personnelImage,
    alt: "LANTAW personnel management screen",
    eager: false,
  },
  {
    key: "history",
    label: "History Log",
    src: historyLogImage,
    alt: "LANTAW history log",
    eager: false,
  },
] as const;

type ShowcaseScreen = (typeof showcaseScreens)[number];

export function LandingShowcaseCollage({
  isVisible,
}: LandingShowcaseCollageProps) {
  const [selectedScreen, setSelectedScreen] = useState<ShowcaseScreen | null>(
    null,
  );
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedScreen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedScreen(null);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      activeTriggerRef.current?.focus();
    };
  }, [selectedScreen]);

  const openLightbox = (
    screen: ShowcaseScreen,
    trigger: HTMLButtonElement,
  ) => {
    activeTriggerRef.current = trigger;
    setSelectedScreen(screen);
  };

  return (
    <>
      <div
        className={`landing-showcase${isVisible ? " landing-showcase--visible" : ""}`}
        aria-label="LANTAW application preview"
      >
        <div className="landing-showcase__glow landing-showcase__glow--maroon" />
        <div className="landing-showcase__glow landing-showcase__glow--green" />
        <div className="landing-showcase__glow landing-showcase__glow--gold" />

        {showcaseScreens.map((screen) => (
          <div
            key={screen.key}
            className={`landing-showcase__card landing-showcase__card--${screen.key}`}
          >
            <button
              type="button"
              className="landing-showcase__trigger"
              aria-label={`Open ${screen.label} screenshot`}
              onClick={(event) => openLightbox(screen, event.currentTarget)}
            >
              <span className="landing-showcase__float">
                <span className="landing-showcase__label">{screen.label}</span>
                <span className="landing-showcase__frame">
                  <img
                    src={screen.src}
                    alt={screen.alt}
                    className="landing-showcase__image"
                    loading={screen.eager ? "eager" : "lazy"}
                    fetchPriority={screen.eager ? "high" : "auto"}
                    decoding="async"
                  />
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>

      {selectedScreen
        ? createPortal(
            <div
              className="landing-showcase-lightbox"
              role="dialog"
              aria-modal="true"
              aria-labelledby="landing-showcase-lightbox-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedScreen(null);
                }
              }}
            >
              <div className="landing-showcase-lightbox__content">
                <h2
                  id="landing-showcase-lightbox-title"
                  className="landing-showcase-lightbox__title"
                >
                  {selectedScreen.label}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="landing-showcase-lightbox__close"
                  aria-label={`Close ${selectedScreen.label} screenshot`}
                  onClick={() => setSelectedScreen(null)}
                >
                  <span aria-hidden="true">×</span>
                </button>
                <img
                  src={selectedScreen.src}
                  alt={selectedScreen.alt}
                  className="landing-showcase-lightbox__image"
                  decoding="async"
                  draggable="false"
                />
                <p className="landing-showcase-lightbox__hint">
                  Press Escape or click outside the image to close.
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
