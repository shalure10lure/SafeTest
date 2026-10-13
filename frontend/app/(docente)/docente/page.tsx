
import RoleGuard from "@/features/auth/components/RoleGuard";

export default function Home() {
  return (
    <RoleGuard rolPermitido="docente">
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            SafeTest
          </h1>

          <p className="mt-2 text-slate-600">
            Pantalla docente
          </p>
        </section>
      </main>
    </RoleGuard>
  );
}
