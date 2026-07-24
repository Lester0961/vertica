# VERIFY.md — External decisions, approvals, and legal/privacy blockers

Items here require an external decision, approval, asset, or legal review before
the related feature may be enabled in production. The system fails closed while
these remain unverified.

## Legal / compliance

- [ ] Rental legal-rule parameters (advance, deposit, escalation caps) verified
      against an authoritative source, with reviewer and evidence recorded.
      Until verified, `legal_rule_sets` stay inactive and the compliance engine
      fails closed.
- [ ] Data-privacy notice wording approved and versioned.
- [ ] Consent/receipt language approved for questionnaire, inquiry, and gate
      passes.
- [ ] Data retention schedule per table and storage bucket approved.
- [ ] Data-subject request workflow approved.

## Content / assets

- [ ] Building imagery, renders, and 360 tours cleared for use (rights + accuracy).
- [ ] Amenity list confirmed against the fictional project brief.
- [ ] Location distances sourced from a verified dataset (state road vs.
      straight-line vs. travel time).
- [ ] Landing-page claims, prices, and figures approved (no fake scarcity).

## Operations / security

- [ ] Production secret ownership assigned (managed outside source control).
- [ ] Backup encryption + key owner assigned.
- [ ] Restore drill performed and evidenced.
- [ ] Incident-response procedure approved.
- [ ] Approved email sender domain configured.

## Product decisions

- [ ] Public registration policy (default: disabled).
- [ ] Phone-only inquiry path supported? (operational decision)
- [ ] Multi-property support activation (default: single building).
