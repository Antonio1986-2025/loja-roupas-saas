"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Verifica o status do plano e redireciona para /bloqueado se necessario.
 * Usado no layout do dashboard.
 */
export function usePlano() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/plano")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.bloqueado) {
          router.replace("/bloqueado");
        }
      })
      .catch(() => {});
  }, [router]);
}