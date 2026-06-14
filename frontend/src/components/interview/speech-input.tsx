"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpeechInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone blocked. Click the lock icon in the address bar → allow Microphone, then refresh.",
  "service-not-allowed":
    "Speech recognition requires HTTPS or localhost. Open the app at http://localhost:3000",
  "no-speech": "No speech heard. Speak louder and try again.",
  "audio-capture": "No microphone detected. Plug in a mic or type your answer.",
  network: "Speech service unreachable. Check internet or type your answer.",
  aborted: "Recording stopped.",
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

async function requestMicrophoneAccess(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone API not available in this browser.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
}

export function SpeechInput({ onTranscript, onError, disabled }: SpeechInputProps) {
  const [status, setStatus] = useState<"idle" | "starting" | "listening">("idle");
  const [statusHint, setStatusHint] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const wantListeningRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  const stopRecognition = useCallback(() => {
    wantListeningRef.current = false;
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }
    }
    setStatus("idle");
  }, []);

  const attachHandlers = useCallback(
    (recognition: SpeechRecognitionInstance) => {
      recognition.onstart = () => {
        setStatus("listening");
        setStatusHint("Listening — speak now");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t + " ";
          else interim += t;
        }
        if (final) onTranscriptRef.current(final.trim(), true);
        else if (interim) onTranscriptRef.current(interim, false);
      };

      recognition.onerror = (event: { error: string }) => {
        if (event.error === "no-speech" && wantListeningRef.current) {
          setStatusHint("No speech yet — keep talking...");
          return;
        }
        if (event.error !== "aborted") {
          const msg = ERROR_MESSAGES[event.error] || `Speech error: ${event.error}`;
          onErrorRef.current?.(msg);
          setStatusHint(msg);
        }
        if (event.error !== "no-speech") {
          wantListeningRef.current = false;
          setStatus("idle");
        }
      };

      recognition.onend = () => {
        if (!wantListeningRef.current) {
          setStatus("idle");
          setStatusHint(null);
          return;
        }
        setStatusHint("Still listening — speak your answer");
        window.setTimeout(() => {
          if (!wantListeningRef.current || !recognitionRef.current) return;
          try {
            recognitionRef.current.start();
          } catch {
            wantListeningRef.current = false;
            setStatus("idle");
            setStatusHint(null);
          }
        }, 150);
      };
    },
    []
  );

  const startListening = useCallback(async () => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      onErrorRef.current?.("Voice input needs Google Chrome or Microsoft Edge. Type your answer instead.");
      return;
    }

    setStatus("starting");
    setStatusHint("Requesting microphone permission...");

    try {
      await requestMicrophoneAccess();
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? ERROR_MESSAGES["not-allowed"]
          : "Could not access microphone. Allow mic permission and try again.";
      onErrorRef.current?.(msg);
      setStatusHint(msg);
      setStatus("idle");
      return;
    }

    stopRecognition();
    wantListeningRef.current = true;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    attachHandlers(recognition);
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      wantListeningRef.current = false;
      recognitionRef.current = null;
      const msg =
        err instanceof DOMException && err.name === "InvalidStateError"
          ? "Speech recognition busy. Click Start Speaking again."
          : "Could not start recording. Use Chrome/Edge and try again.";
      onErrorRef.current?.(msg);
      setStatusHint(msg);
      setStatus("idle");
    }
  }, [attachHandlers, stopRecognition]);

  const toggle = useCallback(() => {
    if (status === "listening" || status === "starting") {
      stopRecognition();
      setStatusHint(null);
    } else {
      void startListening();
    }
  }, [status, startListening, stopRecognition]);

  const SR = typeof window !== "undefined" ? getSpeechRecognitionCtor() : null;
  const mediaSupported =
    typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  if (!SR || !mediaSupported) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Voice input requires <strong>Chrome</strong> or <strong>Edge</strong> with a microphone.
        </p>
        <p className="text-xs text-muted-foreground">Type your answer in the box above.</p>
      </div>
    );
  }

  const listening = status === "listening";
  const starting = status === "starting";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          variant={listening ? "destructive" : "outline"}
          size="sm"
          onClick={toggle}
          disabled={disabled || starting}
          className={cn(listening && "animate-pulse")}
        >
          {starting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting mic...
            </>
          ) : listening ? (
            <>
              <Square className="mr-2 h-4 w-4" /> Stop Recording
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" /> Start Speaking
            </>
          )}
        </Button>
        {listening && (
          <span className="text-sm text-rose-500 animate-pulse">● Recording</span>
        )}
      </div>
      {statusHint && (
        <p className={cn("text-xs", listening ? "text-rose-500" : "text-muted-foreground")}>{statusHint}</p>
      )}
      {!listening && !starting && (
        <p className="text-xs text-muted-foreground">
          Tip: Allow microphone when prompted. If blocked, click the lock icon in the address bar.
        </p>
      )}
    </div>
  );
}
