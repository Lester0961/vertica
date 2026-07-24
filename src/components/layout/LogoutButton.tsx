import { logoutAction } from "@/features/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        style={{
          background: "transparent",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-sm)",
          padding: "8px 14px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          color: "var(--text)",
        }}
      >
        Sign out
      </button>
    </form>
  );
}
