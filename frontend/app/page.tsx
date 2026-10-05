import Image from "next/image";

export default function Home() {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-50">
<section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
<h1 className="text-2xl font-semibold text-slate-900">
SafeTest
</h1>

    <p className="mt-2 text-slate-600">
      Sistema de evaluación académica
    </p>
  </section>
</main>

);
}