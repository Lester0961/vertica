"use client";

export default function TenantError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">Something went wrong</h2>
      <p className="text-sm text-neutral-500">{error.message}</p>
      <button onClick={reset} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Try again
      </button>
    </div>
  );
}
