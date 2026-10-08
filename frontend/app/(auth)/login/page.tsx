
import { ShieldCheck } from "lucide-react";
import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">

      {/* Panel izquierdo */}
      <section className="relative hidden min-h-screen w-1/2 flex-col justify-between overflow-hidden bg-[#203D89] p-12 text-white lg:flex">

        {/* Decoración */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-32 bottom-12 h-72 w-72 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <ShieldCheck size={23} />
          </div>
          <span className="text-xl font-bold">
            SafeTest
          </span>
        </div>

        {/* Mensaje */}
        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-blue-200">
            Plataforma de evaluación académica
          </p>

          <h2 className="text-4xl font-bold leading-tight xl:text-5xl">
            Evalúa hoy.
            <br />
            Construye mejores
            <br />
            resultados mañana.
          </h2>

          <p className="mt-6 max-w-sm text-base leading-relaxed text-blue-100">
            Plataforma académica para gestionar evaluaciones
            de forma segura, organizada y eficiente.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {["Seguro", "Organizado", "Eficiente", "Multi-rol"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <p className="relative z-10 text-xs text-blue-200">
          © {new Date().getFullYear()} SafeTest
        </p>
      </section>

      {/* Panel derecho */}
      <section className="flex min-h-screen w-full items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <LoginForm />
      </section>

    </div>
  );
}
