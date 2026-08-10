"use client";

import { useId, useState } from "react";
import styles from "./PasswordField.module.css";

export interface PasswordFieldProps {
  autoComplete?: "current-password" | "new-password";
  hint?: string;
  label: string;
  minLength?: number;
  name: string;
  required?: boolean;
  toggleLabel?: string;
}

export function PasswordField({
  autoComplete = "current-password",
  hint,
  label,
  minLength,
  name,
  required,
  toggleLabel = "password",
}: PasswordFieldProps) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const statusId = `${fieldId}-visibility`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId}>{label}</label>
      {hint ? <span className={styles.hint} id={hintId}>{hint}</span> : null}
      <div className={styles.control}>
        <input
          id={fieldId}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          minLength={minLength}
          required={required}
          aria-describedby={[hint ? hintId : null, statusId].filter(Boolean).join(" ")}
        />
        <button
          type="button"
          className={styles.toggle}
          aria-controls={fieldId}
          aria-label={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <span className={styles.srOnly} id={statusId} aria-live="polite">
        {visible ? `Your ${toggleLabel} is visible` : `Your ${toggleLabel} is hidden`}
      </span>
    </div>
  );
}
