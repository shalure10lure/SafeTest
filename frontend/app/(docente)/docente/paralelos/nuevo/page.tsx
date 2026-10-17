import ParaleloForm from '@/features/paralelos/components/ParalelosForm';

export default function NuevoParaleloPage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Crear paralelo
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Completa los datos para registrar un nuevo grupo.
        </p>
      </div>

      <ParaleloForm />
    </main>
  );
}