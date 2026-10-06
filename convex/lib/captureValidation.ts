export const MAX_AUDIO_BYTES = 960_044;
export const MAX_TEXT_LENGTH = 5000;
export const EMPTY_AUDIO = "I couldn’t hear anything. Try again or type it instead.";
export const LONG_AUDIO = "That recording is too long. Record a shorter update, under 30 seconds.";

export function validateText(text: unknown): string {
  if (typeof text !== "string" || !text.trim()) throw new Error("Type what happened before continuing.");
  if (text.length > MAX_TEXT_LENGTH) throw new Error("That update is too long. Keep it under 5,000 characters.");
  return text.trim();
}

export function validateWav(buffer: ArrayBuffer): void {
  if (buffer.byteLength > MAX_AUDIO_BYTES) throw new Error(LONG_AUDIO);
  if (buffer.byteLength < 46) throw new Error(EMPTY_AUDIO);
  const view = new DataView(buffer);
  const text = (offset: number, length: number) => String.fromCharCode(...new Uint8Array(buffer, offset, length));
  if (text(0, 4) !== "RIFF" || text(8, 4) !== "WAVE" || text(12, 4) !== "fmt " || text(36, 4) !== "data" ||
    view.getUint32(4, true) !== buffer.byteLength - 8 || view.getUint32(16, true) !== 16 ||
    view.getUint16(20, true) !== 1 || view.getUint16(22, true) !== 1 || view.getUint32(24, true) !== 16000 ||
    view.getUint32(28, true) !== 32000 || view.getUint16(32, true) !== 2 || view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== buffer.byteLength - 44 || (buffer.byteLength - 44) % 2 !== 0) throw new Error(EMPTY_AUDIO);
  const duration = (buffer.byteLength - 44) / 32000;
  if (duration > 30) throw new Error(LONG_AUDIO);
  let energy = 0;
  for (let offset = 44; offset < buffer.byteLength; offset += 2) energy += (view.getInt16(offset, true) / 32768) ** 2;
  if (duration < 0.2 || Math.sqrt(energy / ((buffer.byteLength - 44) / 2)) < 0.0003) throw new Error(EMPTY_AUDIO);
}
