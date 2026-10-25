import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { IaGeneracion } from '../../iageneracion/entity/iageneracion.entity';
import { MaterialAcademico } from '../../materialacademico/entity/materialacademico.entity';

// Solo los materiales listados aquí pudieron usarse en esa generación.
@Entity('ia_generacion_material')
export class IaGeneracionMaterial {
  @PrimaryColumn({ name: 'generacion_id', type: 'int' })
  generacion_id: number;

  @PrimaryColumn({ name: 'material_id', type: 'int' })
  material_id: number;

  @ManyToOne(() => IaGeneracion, (g) => g.materiales, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'generacion_id' })
  generacion: IaGeneracion;

  @ManyToOne(() => MaterialAcademico, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: MaterialAcademico;
}
