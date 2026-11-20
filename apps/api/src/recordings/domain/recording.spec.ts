import { CorrectionStatus, Recording, RecordingStatus } from './recording.js';
import {
  CorrectionNotAllowedError,
  RecordingNotRetryableError,
} from './recording.errors.js';

const newRecording = () =>
  Recording.create({
    originalName: 'Reunião.MP3',
    mimeType: 'audio/mpeg',
    sizeBytes: 4,
  });

describe('Recording', () => {
  it('nasce pendente, com chave de storage derivada do id e da extensão', () => {
    const recording = newRecording();

    expect(recording.status).toBe(RecordingStatus.Pending);
    expect(recording.storageKey).toBe(`recordings/${recording.id}.mp3`);
  });

  it('percorre pending → processing → completed guardando a transcrição', () => {
    const recording = newRecording();

    recording.startProcessing();
    expect(recording.status).toBe(RecordingStatus.Processing);

    recording.complete(
      { text: 'olá', language: 'portuguese', durationSeconds: 2 },
      false,
    );
    expect(recording.toSnapshot()).toMatchObject({
      status: RecordingStatus.Completed,
      transcript: 'olá',
      language: 'portuguese',
      durationSeconds: 2,
      error: null,
      correctionStatus: null,
    });
  });

  describe('revisão do texto', () => {
    const transcribed = () => {
      const recording = newRecording();
      recording.complete(
        {
          text: 'foi descontado alguma falta',
          language: 'pt',
          durationSeconds: 3,
        },
        true,
      );
      return recording;
    };

    it('fica pendente ao concluir a transcrição com revisão ligada', () => {
      expect(transcribed().correctionStatus).toBe(CorrectionStatus.Pending);
    });

    it('percorre pending → processing → completed guardando texto, modelo e tokens', () => {
      const recording = transcribed();

      recording.startCorrection();
      expect(recording.correctionStatus).toBe(CorrectionStatus.Processing);

      recording.completeCorrection({
        text: 'Foi descontada alguma falta?',
        model: 'gpt-6-luna',
        inputTokens: 120,
        outputTokens: 40,
      });
      expect(recording.toSnapshot()).toMatchObject({
        transcript: 'foi descontado alguma falta',
        correctedTranscript: 'Foi descontada alguma falta?',
        correctionStatus: CorrectionStatus.Completed,
        correctionModel: 'gpt-6-luna',
        correctionInputTokens: 120,
        correctionOutputTokens: 40,
      });
    });

    it('falha na revisão mantém a transcrição original', () => {
      const recording = transcribed();

      recording.registerCorrectionFailure('timeout', true);
      expect(recording.correctionStatus).toBe(CorrectionStatus.Pending);

      recording.registerCorrectionFailure('chave inválida', false);
      expect(recording.toSnapshot()).toMatchObject({
        status: RecordingStatus.Completed,
        transcript: 'foi descontado alguma falta',
        correctionStatus: CorrectionStatus.Failed,
        correctionError: 'chave inválida',
      });
    });

    it('nova transcrição descarta a revisão anterior', () => {
      const recording = transcribed();
      recording.completeCorrection({
        text: 'velho',
        model: 'gpt-6-luna',
        inputTokens: 1,
        outputTokens: 1,
      });

      recording.complete(
        { text: 'novo', language: 'pt', durationSeconds: 1 },
        true,
      );

      expect(recording.toSnapshot()).toMatchObject({
        correctionStatus: CorrectionStatus.Pending,
        correctedTranscript: null,
        correctionInputTokens: null,
      });
    });

    it('pedido manual de revisão exige transcrição pronta e nada em andamento', () => {
      expect(() => newRecording().requestCorrection()).toThrow(
        CorrectionNotAllowedError,
      );

      const recording = transcribed();
      recording.startCorrection();
      expect(() => recording.requestCorrection()).toThrow(
        CorrectionNotAllowedError,
      );

      recording.registerCorrectionFailure('boom', false);
      recording.requestCorrection();
      expect(recording.toSnapshot()).toMatchObject({
        correctionStatus: CorrectionStatus.Pending,
        correctionError: null,
      });
    });
  });

  it('volta para pending se ainda haverá nova tentativa, senão falha', () => {
    const recording = newRecording();

    recording.registerFailure('timeout', true);
    expect(recording.status).toBe(RecordingStatus.Pending);

    recording.registerFailure('timeout', false);
    expect(recording.toSnapshot()).toMatchObject({
      status: RecordingStatus.Failed,
      error: 'timeout',
    });
  });

  it('aceita reprocessar gravação com falha e limpa o erro', () => {
    const recording = newRecording();
    recording.registerFailure('boom', false);

    recording.requestRetry();

    expect(recording.toSnapshot()).toMatchObject({
      status: RecordingStatus.Pending,
      error: null,
    });
  });

  it.each([RecordingStatus.Processing, RecordingStatus.Completed])(
    'recusa reprocessar gravação %s',
    (status) => {
      const recording = Recording.restore({
        ...newRecording().toSnapshot(),
        status,
      });
      expect(() => recording.requestRetry()).toThrow(
        RecordingNotRetryableError,
      );
    },
  );
});
