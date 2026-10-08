
import { ShieldCheck } from "lucide-react";

export default function AuthBrandPanel() {
  return (
    <section className="relative hidden min-h-screen w-1/2 flex-col justify-between overflow-hidden bg-[#203D89] px-12 py-10 text-white lg:flex">

      {/* Decoraciones del fondo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      {/* Círculo superior */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-white/5" />

      {/* Círculo central */}
      <div className="pointer-events-none absolute -left-16 top-[15%] h-[540px] w-[540px] rounded-full bg-white/5" />

      {/* Círculo inferior */}
      <div className="pointer-events-none absolute -bottom-24 -left-28 h-80 w-80 rounded-full bg-white/5" />

      {/* Logo SafeTest */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
          <ShieldCheck size={22} strokeWidth={2.3} />
        </div>

        <span className="text-xl font-bold tracking-tight">
          SafeTest
        </span>
      </div>

      {/* Mensaje principal */}
      <div className="relative z-10 max-w-md">
        <p className="mb-5 text-xs font-bold uppercase tracking-widest text-blue-200">
          Plataforma de evaluación académica
        </p>

        <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
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

        {/* Etiquetas */}
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            "Seguro",
            "Organizado",
            "Eficiente",
            "Multi-rol",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Pie del panel */}
      <p className="relative z-10 text-xs text-blue-300">
        © {new Date().getFullYear()} SafeTest · Universidad
      </p>
    </section>
  );
}
