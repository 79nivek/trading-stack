import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionController {}
