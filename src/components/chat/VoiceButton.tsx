import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const toggleListening = useCallback(async () => {
    // Stop recording
    if (listening && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setListening(false);
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 100) return; // too short

        setTranscribing(true);
        try {
          const res = await fetch(
            `${SUPABASE_URL}/functions/v1/deepgram-voice?action=stt&lang=vi`,
            {
              method: 'POST',
              headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'audio/webm' },
              body: blob,
            }
          );
          if (!res.ok) throw new Error(`STT failed: ${res.status}`);
          const data = await res.json();
          if (data.transcript) {
            onTranscript(data.transcript);
          } else {
            toast.error("Không nhận diện được giọng nói. Thử lại?");
          }
        } catch (err: any) {
          console.error('Deepgram STT error:', err);
          toast.error("Lỗi nhận diện giọng nói: " + err.message);
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setListening(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please enable it in browser settings.");
      } else {
        toast.error(`Mic error: ${err.message}`);
      }
    }
  }, [listening, onTranscript]);

  return (
    <button
      onClick={toggleListening}
      disabled={disabled || transcribing}
      className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
        listening
          ? "bg-destructive/20 border border-destructive/40 text-destructive animate-pulse"
          : transcribing
          ? "bg-gold/10 border border-gold/30 text-gold"
          : "hover:bg-gold/10 text-muted-foreground hover:text-gold border border-transparent"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
      title={listening ? "Stop recording" : transcribing ? "Transcribing..." : "Voice input (Deepgram)"}
    >
      {transcribing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : listening ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}

// ─── Deepgram TTS ───────────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;

export async function speakText(text: string, onEnd?: () => void) {
  stopSpeaking();

  // Clean markdown for speech
  const clean = text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_~`#>\[\]()]/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/deepgram-voice?action=tts`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: clean }),
      }
    );

    if (!res.ok) {
      // Fallback to browser TTS
      console.warn('Deepgram TTS failed, falling back to browser TTS');
      browserSpeak(clean, onEnd);
      return;
    }

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd?.();
    };

    await audio.play();
  } catch (err) {
    console.warn('Deepgram TTS error, falling back to browser:', err);
    browserSpeak(clean, onEnd);
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// Browser fallback TTS
function browserSpeak(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    toast.error("Text-to-speech not supported in this browser.");
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith("vi")) || voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) || voices[0];
  if (preferred) utterance.voice = preferred;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}
