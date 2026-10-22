
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateInvitacionDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  correo_institucional: string;
}
