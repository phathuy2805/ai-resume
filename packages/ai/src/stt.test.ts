import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './client.js';
import { AiRateLimitError } from './errors.js';
import {
  isSttError,
  MAX_AUDIO_BYTES,
  normalizeAudioMimeType,
  SttError,
  transcribe,
  TRANSCRIBE_PROMPT,
  TRANSCRIBE_SYSTEM_INSTRUCTION,
  TranscriptionSchema,
  type TranscriptionResponse,
} from './stt.js';

const AUDIO = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]);

function fakeAi(response: TranscriptionResponse | Error) {
  const generateStructured =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response);
  const ai = { generateStructured } as unknown as AiClient;
  return { ai, generateStructured };
}

async function sttErrorOf(promise: Promise<unknown>): Promise<SttError> {
  const error = await promise.catch((e: unknown) => e);
  expect(isSttError(error)).toBe(true);
  return error as SttError;
}

describe('normalizeAudioMimeType', () => {
  it.each([
    ['audio/wav', 'audio/wav'],
    ['audio/x-wav', 'audio/wav'],
    ['audio/wave', 'audio/wav'],
    ['audio/mpeg', 'audio/mp3'],
    ['AUDIO/FLAC', 'audio/flac'],
    ['audio/ogg; codecs=vorbis', 'audio/ogg'],
    ['audio/aac', 'audio/aac'],
    ['audio/aiff', 'audio/aiff'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeAudioMimeType(input)).toBe(expected);
  });

  it.each([
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'video/mp4',
    'application/pdf',
    '',
  ])('%s → null (Gemini không nhận)', (input) => {
    expect(normalizeAudioMimeType(input)).toBeNull();
  });
});

describe('transcribe', () => {
  it('gửi audio inline cho model audio, temperature 0, trả transcript', async () => {
    const { ai, generateStructured } = fakeAi({
      hasSpeech: true,
      transcript: 'Em dùng NestJS và PostgreSQL để xây dựng API.',
    });

    const text = await transcribe(ai, AUDIO, 'audio/x-wav', { timeoutMs: 20_000 });

    expect(text).toBe('Em dùng NestJS và PostgreSQL để xây dựng API.');
    expect(generateStructured).toHaveBeenCalledWith(
      { text: TRANSCRIBE_PROMPT, files: [{ mimeType: 'audio/wav', data: AUDIO }] },
      TranscriptionSchema,
      {
        timeoutMs: 20_000,
        model: 'audio',
        temperature: 0,
        systemInstruction: TRANSCRIBE_SYSTEM_INSTRUCTION,
      },
    );
  });

  it('gộp khoảng trắng, NFC', async () => {
    const { ai } = fakeAi({
      hasSpeech: true,
      transcript: '  Xin   chào\n Docker  '.normalize('NFD'),
    });
    await expect(transcribe(ai, AUDIO, 'audio/wav')).resolves.toBe('Xin chào Docker');
  });

  it('webm → UNSUPPORTED_FORMAT, không gọi Gemini', async () => {
    const { ai, generateStructured } = fakeAi({ hasSpeech: true, transcript: 'x' });
    const error = await sttErrorOf(transcribe(ai, AUDIO, 'audio/webm;codecs=opus'));
    expect(error.code).toBe('UNSUPPORTED_FORMAT');
    expect(error.mimeType).toBe('audio/webm;codecs=opus');
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('file rỗng → EMPTY_AUDIO, không gọi Gemini', async () => {
    const { ai, generateStructured } = fakeAi({ hasSpeech: true, transcript: 'x' });
    const error = await sttErrorOf(transcribe(ai, new Uint8Array(), 'audio/wav'));
    expect(error.code).toBe('EMPTY_AUDIO');
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('file quá lớn → AUDIO_TOO_LARGE, không gọi Gemini', async () => {
    const { ai, generateStructured } = fakeAi({ hasSpeech: true, transcript: 'x' });
    const big = new Uint8Array(MAX_AUDIO_BYTES + 1);
    const error = await sttErrorOf(transcribe(ai, big, 'audio/wav'));
    expect(error.code).toBe('AUDIO_TOO_LARGE');
    expect(error.bytes).toBe(MAX_AUDIO_BYTES + 1);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('hasSpeech = false → NO_SPEECH', async () => {
    const { ai } = fakeAi({ hasSpeech: false, transcript: '' });
    const error = await sttErrorOf(transcribe(ai, AUDIO, 'audio/wav'));
    expect(error.code).toBe('NO_SPEECH');
    expect(error.message).toBe('Speech-to-text failed: NO_SPEECH');
  });

  it('transcript chỉ có khoảng trắng → NO_SPEECH dù hasSpeech = true', async () => {
    const { ai } = fakeAi({ hasSpeech: true, transcript: '   ' });
    expect((await sttErrorOf(transcribe(ai, AUDIO, 'audio/wav'))).code).toBe('NO_SPEECH');
  });

  it('hasSpeech = false nhưng có chữ → vẫn NO_SPEECH', async () => {
    const { ai } = fakeAi({ hasSpeech: false, transcript: '(tiếng ồn)' });
    expect((await sttErrorOf(transcribe(ai, AUDIO, 'audio/wav'))).code).toBe('NO_SPEECH');
  });

  it('lỗi của client (429) được ném ra nguyên vẹn, không phải SttError', async () => {
    const { ai } = fakeAi(new AiRateLimitError());
    const error = await transcribe(ai, AUDIO, 'audio/wav').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiRateLimitError);
    expect(isSttError(error)).toBe(false);
  });

  it('message lỗi không chứa nội dung audio', () => {
    const error = new SttError('NO_SPEECH', { mimeType: 'audio/wav', bytes: 10 });
    expect(error.name).toBe('SttError');
    expect(error.message).not.toMatch(/[A-Za-z0-9+/]{20,}={0,2}/);
  });
});
