"use client";

import { useRouter } from "next/navigation";

export function useSmartBack() {
  const router = useRouter();

  return () => {
    const lastTab =
      (typeof window !== "undefined" && sessionStorage.getItem("lastTab")) || "/goals";
    router.push(lastTab);
  };
}
