// Minimal downsampler from 48k→16k by factor 3 (decimation).
// If your input sampleRate ≠ 48000, we switch to linear-resample.
class PCM16Downsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.inputRate = sampleRate; // AudioContext sampleRate
    this.targetRate = 16000;
    this.linearFrac = 0;
    this.linearStep = this.inputRate / this.targetRate;
  }

  _downsample(input) {
    if (this.inputRate === this.targetRate) return input;

    if (this.inputRate === 48000 && this.targetRate === 16000) {
      // Fast path: take every 3rd sample (simple decimation).
      const outLen = Math.floor(input.length / 3);
      const out = new Float32Array(outLen);
      for (let i = 0, j = 0; j < outLen; j++, i += 3) out[j] = input[i];
      return out;
    }

    // Generic linear resampler to 16k
    const outLen = Math.floor(input.length / this.linearStep);
    const out = new Float32Array(outLen);
    let pos = 0;
    let srcIndex = 0;
    for (let i = 0; i < outLen; i++) {
      const idx = Math.floor(srcIndex);
      const frac = srcIndex - idx;
      const s0 = input[idx] || 0;
      const s1 = input[idx + 1] || s0;
      out[i] = s0 + (s1 - s0) * frac;
      srcIndex += this.linearStep;
    }
    return out;
  }

  _floatToPCM16(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    // mono from channel 0
    const mono = input[0];
    const ds = this._downsample(mono);
    const pcm16 = this._floatToPCM16(ds);

    // Post as transferable ArrayBuffer
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    return true;
  }
}

registerProcessor('pcm16-downsampler', PCM16Downsampler);