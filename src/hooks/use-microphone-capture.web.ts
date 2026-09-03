import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  captureDurationMs,
  joinPcmChunks,
  type CapturedPcm,
  type MicrophoneCaptureController,
  type MicrophoneCaptureError,
  type MicrophoneCaptureOptions,
  type MicrophoneCaptureStatus,
} from '@/lib/speaking/microphone-capture';

const REQUESTED_SAMPLE_RATE = 16_000;
const WORKLET_NAME = 'thai-speaker-pcm-capture';
const WORKLET_SOURCE = `
class ThaiSpeakerPcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0 || channels[0].length === 0) return true;
    const mono = new Float32Array(channels[0].length);
    for (let channel = 0; channel < channels.length; channel++) {
      const input = channels[channel];
      for (let frame = 0; frame < mono.length; frame++) mono[frame] += input[frame] / channels.length;
    }
    this.port.postMessage(mono.buffer, [mono.buffer]);
    return true;
  }
}
registerProcessor('${WORKLET_NAME}', ThaiSpeakerPcmCapture);
`;

type CaptureView = {
  status: MicrophoneCaptureStatus;
  elapsedMs: number;
  lastCapture: CapturedPcm | null;
  error: MicrophoneCaptureError | null;
};

type WebAudioResources = {
  context: AudioContext;
  mediaStream: MediaStream;
  source: MediaStreamAudioSourceNode;
  captureNode: AudioWorkletNode | ScriptProcessorNode;
  silentGain: GainNode;
};

const INITIAL_VIEW: CaptureView = {
  status: 'idle',
  elapsedMs: 0,
  lastCapture: null,
  error: null,
};

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const candidate = window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return candidate ?? null;
}

function webStartError(error: unknown): MicrophoneCaptureError {
  const name =
    typeof DOMException !== 'undefined' && error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      code: 'permission-denied',
      message: 'Ohne Mikrofonfreigabe kann keine Tonkontur aufgenommen werden.',
    };
  }
  return {
    code: 'start-failed',
    message:
      error instanceof Error
        ? `Das Mikrofon konnte nicht gestartet werden: ${error.message}`
        : 'Das Mikrofon konnte nicht gestartet werden.',
  };
}

function createAudioContext(AudioContextClass: typeof AudioContext): AudioContext {
  try {
    return new AudioContextClass({ sampleRate: REQUESTED_SAMPLE_RATE });
  } catch {
    // Safari-Versionen, die die Option nicht akzeptieren, liefern ihre echte
    // Hardware-Rate ueber context.sampleRate; die Auswertung benutzt genau die.
    return new AudioContextClass();
  }
}

async function createWorkletNode(
  context: AudioContext,
  onSamples: (samples: Float32Array, sampleRate: number) => void
): Promise<AudioWorkletNode> {
  const moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'text/javascript' }));
  try {
    await context.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }

  const node = new AudioWorkletNode(context, WORKLET_NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });
  node.port.onmessage = (event: MessageEvent<ArrayBuffer | Float32Array>) => {
    const samples =
      event.data instanceof Float32Array ? event.data : new Float32Array(event.data);
    onSamples(samples, context.sampleRate);
  };
  return node;
}

function createScriptProcessorNode(
  context: AudioContext,
  onSamples: (samples: Float32Array, sampleRate: number) => void
): ScriptProcessorNode {
  // Veraltet, aber als lokaler Fallback fuer Browser ohne AudioWorklet noch
  // sinnvoll. Ein Eingangskanal laesst Web Audio vorab nach Mono mischen.
  const node = context.createScriptProcessor(2_048, 1, 1);
  node.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    onSamples(input.slice(), event.inputBuffer.sampleRate);
  };
  return node;
}

/**
 * Web-Aufnahme direkt aus getUserMedia/Web Audio.
 *
 * expo-audio 57 exportiert `useAudioStream` zwar fuer Web, seine konkrete
 * `AudioStream.web`-Implementierung liefert aber nur `stream: null`. Dieser
 * getrennte Pfad greift deshalb lokal auf PCM zu, ohne MediaRecorder-Datei,
 * Upload, Schluessel oder persistente Ablage.
 */
export function useMicrophoneCapture(
  options: MicrophoneCaptureOptions = {}
): MicrophoneCaptureController {
  const maxDurationMs = captureDurationMs(options.maxDurationMs);
  const [view, setView] = useState<CaptureView>(INITIAL_VIEW);
  const mountedRef = useRef(true);
  const statusRef = useRef<MicrophoneCaptureStatus>('idle');
  const generationRef = useRef(0);
  const acceptingRef = useRef(false);
  const resourcesRef = useRef<WebAudioResources | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const lengthRef = useRef(0);
  const sampleRateRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef(0);
  const failureRef = useRef<MicrophoneCaptureError | null>(null);
  const finishRef = useRef<(reachedLimit: boolean) => Promise<CapturedPcm | null>>(
    async () => null
  );
  const finishPromiseRef = useRef<Promise<CapturedPcm | null> | null>(null);

  const updateView = useCallback((change: Partial<CaptureView>) => {
    if (mountedRef.current) setView((current) => ({ ...current, ...change }));
  }, []);

  const resetBuffers = useCallback(() => {
    chunksRef.current = [];
    lengthRef.current = 0;
    sampleRateRef.current = null;
    lastProgressRef.current = 0;
    failureRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseResources = useCallback(async () => {
    const resources = resourcesRef.current;
    resourcesRef.current = null;
    if (!resources) return;

    // Tracks zuerst stoppen: Das beendet den System-Mikrofonindikator auch
    // dann sofort, wenn context.close() spaeter ablehnt.
    try {
      resources.mediaStream.getTracks().forEach((track) => track.stop());
    } catch {
      // Der Stream kann vom Browser bereits beendet worden sein.
    }
    if ('port' in resources.captureNode) {
      resources.captureNode.port.onmessage = null;
    } else {
      resources.captureNode.onaudioprocess = null;
    }
    for (const node of [resources.source, resources.captureNode, resources.silentGain]) {
      try {
        node.disconnect();
      } catch {
        // Disconnect ist idempotent gemeint; manche Browser werfen trotzdem.
      }
    }
    await resources.context.close().catch(() => {});
  }, []);

  const acceptSamples = useCallback(
    (samples: Float32Array, sampleRate: number) => {
      if (!acceptingRef.current || sampleRate <= 0) return;
      if (sampleRateRef.current === null) {
        sampleRateRef.current = sampleRate;
      } else if (Math.abs(sampleRateRef.current - sampleRate) > 0.5) {
        failureRef.current = {
          code: 'capture-failed',
          message: 'Die Abtastrate hat sich während der Aufnahme geändert.',
        };
        acceptingRef.current = false;
        void finishRef.current(false);
        return;
      }

      const limit = Math.floor((sampleRate * maxDurationMs) / 1_000);
      const remaining = Math.max(0, limit - lengthRef.current);
      const kept = samples.length <= remaining ? samples : samples.slice(0, remaining);
      if (kept.length > 0) {
        // Worklet- und ScriptProcessor-Puffer duerfen nach dem Callback wieder
        // verwendet werden. Eine eigene Kopie haelt die Aufnahme deterministisch.
        chunksRef.current.push(kept.slice());
        lengthRef.current += kept.length;
      }

      const now = Date.now();
      if (now - lastProgressRef.current >= 100) {
        lastProgressRef.current = now;
        updateView({ elapsedMs: Math.round((lengthRef.current / sampleRate) * 1_000) });
      }

      if (lengthRef.current >= limit) {
        acceptingRef.current = false;
        void finishRef.current(true);
      }
    },
    [maxDurationMs, updateView]
  );

  const finish = useCallback(
    (reachedLimit: boolean): Promise<CapturedPcm | null> => {
      if (finishPromiseRef.current) return finishPromiseRef.current;
      if (statusRef.current !== 'recording') return Promise.resolve(null);

      statusRef.current = 'stopping';
      acceptingRef.current = false;
      clearTimer();
      updateView({ status: 'stopping' });

      const generation = generationRef.current;
      const failure = failureRef.current;
      const sampleRate = sampleRateRef.current;
      const length = lengthRef.current;
      const chunks = chunksRef.current;
      resetBuffers();

      const promise = (async () => {
        await releaseResources();

        if (generation !== generationRef.current || !mountedRef.current) return null;
        statusRef.current = 'idle';

        if (failure) {
          updateView({ status: 'idle', elapsedMs: 0, error: failure });
          return null;
        }
        if (!sampleRate || length === 0) {
          updateView({
            status: 'idle',
            elapsedMs: 0,
            error: {
              code: 'empty',
              message: 'Es wurde kein auswertbares Mikrofonsignal aufgenommen.',
            },
          });
          return null;
        }

        const capture: CapturedPcm = {
          samples: joinPcmChunks(chunks, length),
          sampleRate,
          durationMs: Math.round((length / sampleRate) * 1_000),
          reachedLimit,
        };
        updateView({
          status: 'idle',
          elapsedMs: capture.durationMs,
          lastCapture: capture,
          error: null,
        });
        return capture;
      })();

      finishPromiseRef.current = promise;
      void promise.finally(() => {
        if (finishPromiseRef.current === promise) finishPromiseRef.current = null;
      });
      return promise;
    },
    [clearTimer, releaseResources, resetBuffers, updateView]
  );
  finishRef.current = finish;

  const cancel = useCallback(() => {
    generationRef.current += 1;
    finishPromiseRef.current = null;
    acceptingRef.current = false;
    clearTimer();
    void releaseResources();
    resetBuffers();
    statusRef.current = 'idle';
    updateView({
      status: 'idle',
      elapsedMs: 0,
      lastCapture: null,
      error: null,
    });
  }, [clearTimer, releaseResources, resetBuffers, updateView]);

  const start = useCallback(async (): Promise<boolean> => {
    if (statusRef.current !== 'idle') return false;

    const AudioContextClass = audioContextConstructor();
    if (
      !AudioContextClass ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      updateView({
        status: 'idle',
        elapsedMs: 0,
        lastCapture: null,
        error: {
          code: 'unsupported',
          message: 'Dieser Browser stellt keine lokale Mikrofonaufnahme bereit.',
        },
      });
      return false;
    }

    const generation = ++generationRef.current;
    statusRef.current = 'requesting-permission';
    resetBuffers();
    updateView({
      status: 'requesting-permission',
      elapsedMs: 0,
      lastCapture: null,
      error: null,
    });

    const context = createAudioContext(AudioContextClass);
    let mediaStream: MediaStream | null = null;
    try {
      // Context und Berechtigungsdialog entstehen beide aus dem ausdruecklichen
      // Start-Klick. Es gibt keinen Permission-Check beim Mounten.
      await context.resume();
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      if (generation !== generationRef.current || !mountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        await context.close().catch(() => {});
        return false;
      }

      const source = context.createMediaStreamSource(mediaStream);
      let captureNode: AudioWorkletNode | ScriptProcessorNode;
      if (context.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          captureNode = await createWorkletNode(context, acceptSamples);
        } catch {
          captureNode = createScriptProcessorNode(context, acceptSamples);
        }
      } else if (typeof context.createScriptProcessor === 'function') {
        captureNode = createScriptProcessorNode(context, acceptSamples);
      } else {
        throw new Error('Weder AudioWorklet noch ScriptProcessor ist verfuegbar.');
      }

      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      source.connect(captureNode);
      captureNode.connect(silentGain);
      silentGain.connect(context.destination);
      resourcesRef.current = { context, mediaStream, source, captureNode, silentGain };
    } catch (error) {
      mediaStream?.getTracks().forEach((track) => track.stop());
      await context.close().catch(() => {});
      if (generation !== generationRef.current || !mountedRef.current) return false;
      statusRef.current = 'idle';
      updateView({ status: 'idle', error: webStartError(error) });
      return false;
    }

    if (generation !== generationRef.current || !mountedRef.current) {
      await releaseResources();
      return false;
    }

    acceptingRef.current = true;
    statusRef.current = 'recording';
    updateView({ status: 'recording' });
    timerRef.current = setTimeout(() => {
      acceptingRef.current = false;
      void finishRef.current(true);
    }, maxDurationMs);
    return true;
  }, [acceptSamples, maxDurationMs, releaseResources, resetBuffers, updateView]);

  const stop = useCallback(() => finish(false), [finish]);

  const clear = useCallback(() => {
    updateView({ lastCapture: null, error: null });
  }, [updateView]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      acceptingRef.current = false;
      clearTimer();
      void releaseResources();
      resetBuffers();
    };
  }, [clearTimer, releaseResources, resetBuffers]);

  return useMemo(
    () => ({
      status: view.status,
      isRecording: view.status === 'recording',
      elapsedMs: view.elapsedMs,
      lastCapture: view.lastCapture,
      error: view.error,
      start,
      stop,
      cancel,
      clear,
    }),
    [cancel, clear, start, stop, view]
  );
}
