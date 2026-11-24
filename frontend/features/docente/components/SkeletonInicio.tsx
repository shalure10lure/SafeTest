import { Card } from '@/components/ui/Card';

/** Esqueleto gris que ocupa el mismo lugar que el inicio mientras carga. */
export default function SkeletonInicio() {
    return (
        <div className="space-y-5" role="status" aria-label="Cargando tu resumen">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Card key={i} className="h-24 animate-pulse bg-slate-100" />
                ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <Card className="h-56 animate-pulse bg-slate-100" />
                    <Card className="h-56 animate-pulse bg-slate-100" />
                </div>
                <div className="space-y-5">
                    <Card className="h-48 animate-pulse bg-slate-100" />
                    <Card className="h-64 animate-pulse bg-slate-100" />
                </div>
            </div>
        </div>
    );
}
