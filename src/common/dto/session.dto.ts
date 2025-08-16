import { IsNumber, Min, Max } from 'class-validator';

export class JoinDto {
  @IsNumber()
  @Min(1)
  @Max(9)
  pick!: number;
} 