import Image from "next/image";
import Link from "next/link";
import styles from "./auth.module.css";
import { NavigationShortcuts, PUBLIC_SHORTCUTS } from "@/components/navigation/NavigationShortcuts";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className={styles.shell}>
      <section className={styles.visual} aria-label="Vertica residence access">
        <Image
          src="/images/vertica/vertica-courtyard.webp"
          alt="Fictional Vertica residents' courtyard at blue hour"
          fill
          priority
          sizes="(max-width: 820px) 100vw, 46vw"
        />
        <div className={styles.visualShade} aria-hidden />
        <Link href="/" className={styles.visualBrand} aria-label="Vertica home">
          <span>VERTICA</span><i aria-hidden />
        </Link>
        <div className={styles.visualCopy}>
          <p>Residence access</p>
          <h2>One address. Every part of daily life.</h2>
          <span>Secure role-based access for residents, operations, maintenance, and gate security.</span>
        </div>
        <div className={styles.visualIndex} aria-hidden>
          <span>24 residences</span>
          <span>Live property records</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelNav}>
          <Link href="/" className={styles.panelBrand} aria-label="Vertica home">
            <span>VERTICA</span><i aria-hidden />
          </Link>
          <NavigationShortcuts items={PUBLIC_SHORTCUTS} />
          <Link href="/">Return to residences</Link>
        </div>
        <div className={styles.formStage}>
          <div className={styles.formFrame}>{children}</div>
        </div>
        <p className={styles.panelNote}>Vertica is an independent academic condominium-management prototype.</p>
      </section>
    </main>
  );
}
