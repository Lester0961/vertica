"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeTables(tables: string[], onChange: () => void) {
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  const key = tables.join(",");
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channels = tables.map((table) => supabase.channel(`vertica:${table}`, { config: { private: true } })
      .on("broadcast", { event: "insert" }, () => { clearTimeout(timer); timer = setTimeout(() => callback.current(), 180); })
      .on("broadcast", { event: "update" }, () => { clearTimeout(timer); timer = setTimeout(() => callback.current(), 180); })
      .on("broadcast", { event: "delete" }, () => { clearTimeout(timer); timer = setTimeout(() => callback.current(), 180); }));
    void supabase.auth.getSession().then(({ data }) => {
      if (disposed) return;
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      channels.forEach((channel) => channel.subscribe());
    });
    return () => { disposed = true; clearTimeout(timer); channels.forEach((channel) => { void supabase.removeChannel(channel); }); };
  // The joined key intentionally represents the table list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  useRealtimeTables(tables, () => router.refresh());
  return null;
}
