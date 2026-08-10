import Image from "next/image";
import Link from "next/link";
import { cache, Suspense } from "react";
import type { FeaturedUnit, UnitTypeSummary } from "@/features/property/queries";
import {
  getFeaturedUnits,
  getPropertySummary,
  getUnitTypes,
} from "@/features/property/queries";
import { formatPeso } from "@/lib/utils/format";
import { LandingHero } from "./LandingHero";
import styles from "./landing.module.css";

export const dynamic = "force-dynamic";

const HIGHLIGHTS = [
  { value: "24", label: "Private residences" },
  { value: "3", label: "Considered layouts" },
  { value: "2 to 7", label: "Residential floors" },
  { value: "360°", label: "Interactive viewing" },
];

const MATCHING_STEPS = [
  {
    number: "01",
    title: "Name your non-negotiables",
    detail: "Budget, move-in date, household size, space, and accessibility come first.",
  },
  {
    number: "02",
    title: "See the logic, not a black box",
    detail: "Vertica filters hard constraints before scoring the details that matter to you.",
  },
  {
    number: "03",
    title: "Compare a focused shortlist",
    detail: "Receive up to three diversified matches with a clear reason behind every result.",
  },
];

const getCachedPropertySummary = cache(getPropertySummary);

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      <LandingHero
        availability={
          <Suspense fallback={<LandingAvailabilityFallback />}>
            <LandingAvailability />
          </Suspense>
        }
      />
      <Suspense fallback={<LandingBodySkeleton />}>
        <LandingPageContent />
      </Suspense>
    </main>
  );
}

async function LandingAvailability() {
  const summary = await getCachedPropertySummary();
  const copy =
    summary.availableCount > 0 && summary.lowestAvailableRent !== null
      ? `${summary.availableCount} residences from ${formatPeso(summary.lowestAvailableRent)}`
      : "Private viewings by appointment";

  return (
    <>
      <span className={styles.liveSignal}><i aria-hidden /> Live availability</span>
      <strong>{copy}</strong>
      <Link href="/explore">Open the building map <span aria-hidden>→</span></Link>
    </>
  );
}

function LandingAvailabilityFallback() {
  return (
    <>
      <span className={styles.liveSignal}><i aria-hidden /> Live availability</span>
      <strong>Checking residence availability</strong>
      <span className={styles.availabilityLoading} role="status">Updating live records</span>
    </>
  );
}

async function LandingPageContent() {
  const [summary, featured, unitTypes] = await Promise.all([
    getCachedPropertySummary(),
    getFeaturedUnits(),
    getUnitTypes(),
  ]);

  return (
    <>
      <section className={styles.factRail} aria-label="Property highlights">
        <div className={styles.container}>
          {HIGHLIGHTS.map((highlight) => (
            <div className={styles.fact} key={highlight.label}>
              <strong>{highlight.value}</strong>
              <span>{highlight.label}</span>
            </div>
          ))}
          <Link className={styles.railLink} href="/location">
            View location <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section className={styles.story} id="residence-story">
        <div className={`${styles.container} ${styles.storyGrid}`}>
          <div className={styles.storyCopy} data-reveal>
            <p className={styles.eyebrow}>The residence</p>
            <h2>Room to arrive. Space to exhale.</h2>
            <p className={styles.storyLead}>
              Vertica pairs the calm of a private residence with a connected urban address.
              Natural light, useful proportions, and thoughtful shared spaces shape daily life.
            </p>
            <dl className={styles.storyDetails}>
              <div>
                <dt>Layouts</dt>
                <dd>Studio, one bedroom, and two bedroom</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>Updated from live property records</dd>
              </div>
              <div>
                <dt>Selection</dt>
                <dd>Transparent matching with explainable results</dd>
              </div>
            </dl>
            <Link className={styles.textLink} href="/amenities">
              Explore the amenities <span aria-hidden>→</span>
            </Link>
          </div>

          <figure className={styles.storyMedia} data-reveal>
            <Image
              src="/images/vertica/vertica-residence.webp"
              alt="Fictional Vertica one-bedroom residence with treetop views"
              fill
              sizes="(max-width: 760px) 100vw, 58vw"
            />
            <figcaption>
              <span>One-bedroom residence</span>
              <span>Artist visualization</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.inventory} aria-labelledby="inventory-title">
        <div className={styles.container}>
          <div className={styles.sectionHeading} data-reveal>
            <div>
              <p className={styles.eyebrow}>Available now</p>
              <h2 id="inventory-title">A focused look at what is ready.</h2>
            </div>
            <p>
              Every residence shown here is drawn from the live inventory. Pricing and status
              can change as applications progress.
            </p>
          </div>

          {featured.length === 0 ? (
            <div className={styles.inventoryEmpty}>
              <p>No residences are currently listed as available.</p>
              <Link className={styles.buttonDark} href="/inquiry">Join the availability list</Link>
            </div>
          ) : (
            <FeaturedInventory units={featured} />
          )}

          <div className={styles.inventoryFooter}>
            <p><i aria-hidden /> {summary.availableCount} residences currently available</p>
            <Link className={styles.textLink} href="/units">
              View all available residences <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.courtyard}>
        <div className={`${styles.container} ${styles.courtyardGrid}`}>
          <figure className={styles.courtyardMedia} data-reveal>
            <Image
              src="/images/vertica/vertica-courtyard.webp"
              alt="Fictional Vertica tropical courtyard at blue hour"
              fill
              sizes="(max-width: 760px) 100vw, 46vw"
            />
            <figcaption>Residents&apos; courtyard · Artist visualization</figcaption>
          </figure>
          <div className={styles.courtyardCopy} data-reveal>
            <p className={styles.eyebrow}>Life between the rooms</p>
            <h2>A quieter rhythm, close to everything.</h2>
            <p>
              Shared spaces extend the residence without competing with it. Find shaded places
              to read, landscaped paths to reset, and arrival spaces designed to feel composed.
            </p>
            <ul>
              <li><span>01</span> Landscaped courtyard and quiet terraces</li>
              <li><span>02</span> Controlled access and resident gate passes</li>
              <li><span>03</span> Digital maintenance and resident services</li>
            </ul>
            <Link className={styles.buttonOutline} href="/amenities">
              View all amenities
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.matching} aria-labelledby="matching-title">
        <div className={styles.matchingGlow} aria-hidden />
        <div className={styles.container}>
          <div className={styles.matchingIntro} data-reveal>
            <p className={styles.eyebrow}>A more useful way to choose</p>
            <h2 id="matching-title">From many options to the right three.</h2>
            <p>
              Our guided questionnaire turns real priorities into a transparent shortlist in
              about three minutes.
            </p>
            <Link className={styles.buttonLight} href="/recommend">
              Start the unit finder <span aria-hidden>→</span>
            </Link>
          </div>
          <ol className={styles.matchingSteps}>
            {MATCHING_STEPS.map((step) => (
              <li key={step.number} data-reveal>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.layouts} aria-labelledby="layout-title">
        <div className={styles.container}>
          <div className={styles.layoutsHeader} data-reveal>
            <p className={styles.eyebrow}>Residence collection</p>
            <h2 id="layout-title">Choose the space that meets you there.</h2>
          </div>
          <div className={styles.layoutList}>
            {unitTypes.map((unitType, index) => (
              <UnitTypeRow key={unitType.id} unitType={unitType} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.inquiry}>
        <div className={styles.inquiryBackdrop} aria-hidden />
        <div className={styles.inquiryContent} data-reveal>
          <p className={styles.eyebrow}>Private appointments</p>
          <h2>See where your next chapter could begin.</h2>
          <p>Ask about a residence, arrange a viewing, or start with a personal shortlist.</p>
          <div>
            <Link className={styles.buttonLight} href="/inquiry">
              Send an inquiry <span aria-hidden>→</span>
            </Link>
            <Link className={styles.buttonGlass} href="/recommend">Find my unit</Link>
          </div>
          <small>Inquiries do not constitute an approved reservation.</small>
        </div>
      </section>
    </>
  );
}

function FeaturedInventory({ units }: { units: FeaturedUnit[] }) {
  const [primary, ...secondary] = units;

  if (!primary) return null;

  return (
    <div className={styles.inventoryGrid}>
      <Link
        className={styles.primaryUnit}
        href={`/units/${encodeURIComponent(primary.publicLabel)}`}
        data-reveal
      >
        <div className={styles.unitImage}>
          <Image
            src="/images/vertica/vertica-residence.webp"
            alt={`Artist visualization for ${primary.publicLabel}`}
            fill
            sizes="(max-width: 760px) 100vw, 58vw"
          />
          <span>Best priced available</span>
        </div>
        <div className={styles.primaryUnitCopy}>
          <div>
            <span>{primary.unitTypeName}</span>
            <h3>{primary.publicLabel}</h3>
          </div>
          <div className={styles.unitMetrics}>
            <span>{primary.areaSqm.toLocaleString("en-PH")} m²</span>
            <span>{formatPeso(primary.monthlyRent)} / month</span>
            <span>Available {formatAvailabilityDate(primary.availableFrom)}</span>
          </div>
          <span className={styles.unitArrow} aria-hidden>→</span>
        </div>
      </Link>

      <div className={styles.secondaryUnits}>
        {secondary.map((unit, index) => (
          <Link
            className={styles.secondaryUnit}
            href={`/units/${encodeURIComponent(unit.publicLabel)}`}
            key={unit.id}
            data-reveal
          >
            <div className={`${styles.unitCrop} ${index === 1 ? styles.unitCropRight : ""}`}>
              <Image
                src="/images/vertica/vertica-residence.webp"
                alt=""
                fill
                sizes="(max-width: 760px) 32vw, 16vw"
              />
            </div>
            <div className={styles.secondaryUnitCopy}>
              <span>{index === 0 ? "Best space value" : "Earliest move-in"}</span>
              <h3>{unit.publicLabel}</h3>
              <p>{unit.unitTypeName} · {unit.areaSqm.toLocaleString("en-PH")} m²</p>
              <strong>{formatPeso(unit.monthlyRent)} / month</strong>
            </div>
            <span className={styles.unitArrow} aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function UnitTypeRow({
  unitType,
  index,
}: {
  unitType: UnitTypeSummary;
  index: number;
}) {
  const area =
    unitType.minArea !== null && unitType.maxArea !== null
      ? `${unitType.minArea} to ${unitType.maxArea} m²`
      : "Area on request";
  const price =
    unitType.minRent !== null && unitType.maxRent !== null
      ? `${formatPeso(unitType.minRent)} to ${formatPeso(unitType.maxRent)}`
      : "Pricing on request";

  return (
    <Link className={styles.layoutRow} href={`/units?type=${encodeURIComponent(unitType.code)}`} data-reveal>
      <span className={styles.layoutIndex}>0{index + 1}</span>
      <div>
        <h3>{unitType.name}</h3>
        <p>{unitType.description}</p>
      </div>
      <dl>
        <div><dt>Interior</dt><dd>{area}</dd></div>
        <div><dt>Monthly rent</dt><dd>{price}</dd></div>
      </dl>
      <span className={styles.layoutArrow} aria-hidden>→</span>
    </Link>
  );
}

function formatAvailabilityDate(value: string | null): string {
  if (!value) return "now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

function LandingBodySkeleton() {
  return (
    <section className={`${styles.factRail} ${styles.bodySkeleton}`} aria-busy="true">
      <div className={styles.container}>
        {HIGHLIGHTS.map((highlight) => (
          <div className={styles.fact} key={highlight.label}>
            <strong>{highlight.value}</strong>
            <span>{highlight.label}</span>
          </div>
        ))}
        <span className={styles.railLink} role="status">Preparing live residences</span>
      </div>
    </section>
  );
}
