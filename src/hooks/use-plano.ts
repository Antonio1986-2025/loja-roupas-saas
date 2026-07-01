"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function usePlano() {
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/plano", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.bloqueado) {
          router.replace("/bloqueado");
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [router]);
}