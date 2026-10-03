import { useEffect, useState } from "react";
export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const a = () => setOnline(true);
    const b = () => setOnline(false);
    window.addEventListener("online", a);
    window.addEventListener("offline", b);
    return () => {
      window.removeEventListener("online", a);
      window.removeEventListener("offline", b);
    };
  }, []);
  return online;
}
export function useUrlSync() {
  useEffect(() => {
    try {
      const mod = import("@/store/session");
      void mod.then((m) => {
        m.restoreFromUrl();
      });
    } catch {
      void 0;
    }
  }, []);
}
export function syncUrl(region: string, date: string, depthIndex: number, engine?: string, engineMode?: string) {
  try {
    const q = new URLSearchParams(window.location.search);
    q.set("region", region);
    q.set("date", date);
    q.set("depth", String(depthIndex));
    if (engine) q.set("engine", engine);
    if (engineMode) q.set("mode", engineMode);
    window.history.replaceState(null, "", window.location.pathname + "?" + q.toString());
  } catch {
    void 0;
  }
}
