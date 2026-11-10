import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LoginEntry from "./LoginEntry";

import type { UsuarioAuth } from "../types";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

function estadoAuth(
  cambios: { usuario?: UsuarioAuth | null; isInitializing?: boolean } = {},
) {
  return {
    usuario: null,
    accessToken: null,
    isLoading: false,
    isInitializing: false,
    error: "",
    mensaje: "",
    login: vi.fn(),
    registerDocente: vi.fn(),
    registerEstudiante: vi.fn(),
    refreshSession: vi.fn(),
    logout: vi.fn(),
    ...cambios,
  };
}

const docente: UsuarioAuth = {
  id: 1,
  nombre: "Docente de prueba",
  correo: "docente@universidad.edu",
  tipo: "docente",
};

const estudiante: UsuarioAuth = {
  id: 2,
  nombre: "Estudiante de prueba",
  correo: "estudiante@universidad.edu",
  tipo: "estudiante",
};

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.useAuth.mockReturnValue(estadoAuth());
});

afterEach(() => {
  cleanup();
});

describe("LoginEntry", () => {
  it("muestra el login en la raíz cuando no hay sesión", () => {
    render(<LoginEntry />);

    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeTruthy();

    expect(
      screen.getByLabelText("Correo institucional"),
    ).toBeTruthy();

    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("muestra el login mientras se verifica la sesión", () => {
    mocks.useAuth.mockReturnValue(
      estadoAuth({ isInitializing: true }),
    );

    render(<LoginEntry />);

    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeTruthy();

    expect(screen.queryByText("Verificando sesión...")).toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirige al panel docente cuando la sesión es de docente", () => {
    mocks.useAuth.mockReturnValue(
      estadoAuth({ usuario: docente }),
    );

    render(<LoginEntry />);

    expect(mocks.replace).toHaveBeenCalledWith("/docente");

    expect(
      screen.queryByRole("heading", { name: "Iniciar sesión" }),
    ).toBeNull();
  });

  it("redirige al panel estudiante cuando la sesión es de estudiante", () => {
    mocks.useAuth.mockReturnValue(
      estadoAuth({ usuario: estudiante }),
    );

    render(<LoginEntry />);

    expect(mocks.replace).toHaveBeenCalledWith("/estudiante");

    expect(
      screen.queryByRole("heading", { name: "Iniciar sesión" }),
    ).toBeNull();
  });
});
