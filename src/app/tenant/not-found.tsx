import Link from "next/link";

export default function TenantNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">Page not found</h2>
      <p className="text-sm text-neutral-500">The page you are looking for does not exist.</p>
      <Link href="/tenant/dashboard" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
    </div>
  );
}
