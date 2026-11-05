import { IsBoolean } from 'class-validator';

/** Acción explícita del docente sobre el uso del material en IA. */
export class AutorizarMaterialDto {
  @IsBoolean({ message: 'Debes indicar true o false en "autorizado"' })
  autorizado: boolean;
}
