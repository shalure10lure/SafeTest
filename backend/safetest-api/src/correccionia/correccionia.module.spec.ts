import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { ExamenModule } from '../examen/examen.module';
import { CorreccionIaService } from './correccionia.service';
import { CorreccionIaController } from './correccionia.controller';
import { CorreccionIaPropuestaController } from './correccionia-propuesta.controller';
import { CorreccionIa } from './entity/correccionia.entity';
import { CorreccionIaModule } from './correccionia.module';
import { CorreccionIaInputGuard } from './correccionia-input.guard';

interface DynamicModuleMetadata {
  module?: unknown;
  providers?: Array<{ provide?: unknown }>;
}

describe('CorreccionIaModule', () => {
  it('registra los controladores de examen y propuesta', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      CorreccionIaModule,
    ) as unknown[];

    expect(controllers).toEqual(
      expect.arrayContaining([
        CorreccionIaController,
        CorreccionIaPropuestaController,
      ]),
    );
  });

  it('registra el guard de validación previa a los pipes globales', () => {
    const providers = Reflect.getMetadata(
      'providers',
      CorreccionIaModule,
    ) as unknown[];

    expect(providers).toContain(CorreccionIaInputGuard);
  });

  it('registra y exporta el servicio de CorreccionIa', () => {
    const providers = Reflect.getMetadata(
      'providers',
      CorreccionIaModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(
      'exports',
      CorreccionIaModule,
    ) as unknown[];

    expect(providers).toContain(CorreccionIaService);
    expect(exports).toContain(CorreccionIaService);
  });

  it('registra el repositorio de CorreccionIa con TypeORM', () => {
    const imports = Reflect.getMetadata(
      'imports',
      CorreccionIaModule,
    ) as DynamicModuleMetadata[];
    const typeOrmFeature = imports.find(
      (module) => module.module === TypeOrmModule,
    );

    expect(typeOrmFeature?.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provide: getRepositoryToken(CorreccionIa),
        }),
      ]),
    );
  });

  it('importa ExamenModule para reutilizar la valoración oficial', () => {
    const imports = Reflect.getMetadata(
      'imports',
      CorreccionIaModule,
    ) as unknown[];

    expect(imports).toContain(ExamenModule);
  });
});
