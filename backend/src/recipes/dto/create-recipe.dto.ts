import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @Length(2, 120)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  ingredients!: string[];

  @IsString()
  @Length(3, 20000)
  instructions!: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  categoryIds?: number[];
}
