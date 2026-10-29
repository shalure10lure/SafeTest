
"use client";

import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import RoleGuard from "@/features/auth/components/RoleGuard";

import {
  NAV_ESTUDIANTE,
  ROUTES,
} from "@/constants/routes";

/**
 * Todas las páginas bajo /estudiante/*
 * comparten Sidebar y Topbar.
 */
export default function EstudianteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard rolPermitido="estudiante">
      <AppShell
        navegacion={NAV_ESTUDIANTE}
        etiquetaRol="EST"
        nombreRol="Estudiante"
        inicioHref={ROUTES.estudiante.inicio}
        subtituloInicio="Panel académico · SafeTest"
      >
        {children}
      </AppShell>
    </RoleGuard>
  );
}
