"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const TAB_ROUTES = ["/analytics", "/goals", "/social"];

export function TabTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (TAB_ROUTES.some((t) => pathname.startsWith(t))) {
      sessionStorage.setItem("lastTab", pathname);
    }
  }, [pathname]);

  return null;
}
