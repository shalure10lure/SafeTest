import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class UpdateMateriaDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
    @MaxLength(150)
    nombre?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'El código no puede estar vacío' })
    @MaxLength(20)
    codigo?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    descripcion?: string;

    @IsOptional()
    @IsBoolean()
    activo?: boolean;
}