import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetTranscriptionCostsUseCase } from '../../application/use-cases/get-transcription-costs.use-case.js';
import { TranscriptionCostsResponseDto } from './dto/transcription-costs-response.dto.js';

/** Adapter de entrada HTTP: custos estimados das transcrições. */
@ApiTags('costs')
@Controller('costs')
export class CostsController {
  constructor(
    private readonly getTranscriptionCosts: GetTranscriptionCostsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Custo estimado das transcrições',
    description:
      'Preço por minuto do modelo configurado e o custo estimado de cada gravação transcrita, ' +
      'calculado pela duração do áudio. A fatura real fica no painel do provedor.',
  })
  @ApiOkResponse({ type: TranscriptionCostsResponseDto })
  execute(): Promise<TranscriptionCostsResponseDto> {
    return this.getTranscriptionCosts.execute();
  }
}
