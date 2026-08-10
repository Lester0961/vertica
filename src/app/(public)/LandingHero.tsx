"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type PointerEvent, type ReactNode } from "react";
import styles from "./landing.module.css";

export function LandingHero({ availability }: { availability: ReactNode }) {
  const heroRef = useRef<HTMLElement>(null);

  function setDepth(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const node = heroRef.current;
    node.style.setProperty("--hero-rotate-x", `${(-y * 3.2).toFixed(2)}deg`);
    node.style.setProperty("--hero-rotate-y", `${(x * 4.4).toFixed(2)}deg`);
    node.style.setProperty("--hero-image-x", `${(-x * 20).toFixed(1)}px`);
    node.style.setProperty("--hero-image-y", `${(-y * 14).toFixed(1)}px`);
    node.style.setProperty("--hero-copy-x", `${(x * 11).toFixed(1)}px`);
    node.style.setProperty("--hero-copy-y", `${(y * 7).toFixed(1)}px`);
    node.style.setProperty("--hero-card-x", `${(x * 18).toFixed(1)}px`);
    node.style.setProperty("--hero-card-y", `${(y * 12).toFixed(1)}px`);
  }

  function resetDepth() {
    const node = heroRef.current;
    if (!node) return;
    node.style.setProperty("--hero-rotate-x", "0deg");
    node.style.setProperty("--hero-rotate-y", "0deg");
    node.style.setProperty("--hero-image-x", "0px");
    node.style.setProperty("--hero-image-y", "0px");
    node.style.setProperty("--hero-copy-x", "0px");
    node.style.setProperty("--hero-copy-y", "0px");
    node.style.setProperty("--hero-card-x", "0px");
    node.style.setProperty("--hero-card-y", "0px");
  }

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      aria-labelledby="landing-title"
      onPointerMove={setDepth}
      onPointerLeave={resetDepth}
    >
      <div className={styles.heroMedia} aria-hidden>
        <Image
          className={styles.heroImage}
          src="/images/vertica/vertica-exterior.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
      </div>
      <div className={styles.heroShade} aria-hidden />
      <div className={styles.heroLight} aria-hidden />
      <div className={styles.heroFrame} aria-hidden />

      <div className={styles.heroContent}>
        <p className={styles.heroEyebrow}>Vertica Residences · Metro Manila</p>
        <h1 id="landing-title">City living, held in balance.</h1>
        <p className={styles.heroLead}>
          Considered residences, live availability, and a clearer way to find your place.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.buttonLight} href="/units">
            Explore residences <span aria-hidden>→</span>
          </Link>
          <Link className={styles.buttonGlass} href="/recommend">
            Find my unit
          </Link>
        </div>
      </div>

      <div className={styles.availabilityCard} aria-label="Live availability">
        {availability}
      </div>
    </section>
  );
}
