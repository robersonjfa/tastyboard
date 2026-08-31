import { IsNotEmpty, IsString } from 'class-validator';

export class AddYoutubeMediaDto {
  @IsString()
  @IsNotEmpty()
  url!: string;
}
