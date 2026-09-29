import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('')
@UseGuards(JwtAuthGuard)
export class BinanceController {}
