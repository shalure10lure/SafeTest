import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateMateriaDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(150)
    nombre: string;

    @IsString({ message: 'El código debe ser texto' })
    @IsNotEmpty({ message: 'El código es obligatorio' })
    @MaxLength(20)
    codigo: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    descripcion?: string;
}