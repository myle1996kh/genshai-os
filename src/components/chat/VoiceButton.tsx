import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "vi-VN"; // Vietnamese default, auto-detects others too

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      // Send interim results for live preview
      if (finalTranscript || interim) {
        onTranscript((finalTranscript + interim).trim());
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please enable it in browser settings.");
      } else if (event.error !== "aborted") {
        toast.error(`Voice error: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onTranscript]);

  if (!supported) return null;

  return (
    <button
      onClick={toggleListening}
      disabled={disabled}
      className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
        listening
          ? "bg-destructive/20 border border-destructive/40 text-destructive animate-pulse"
          : "hover:bg-gold/10 text-muted-foreground hover:text-gold border border-transparent"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
      title={listening ? "Stop listening" : "Voice input (Web Speech API — free)"}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}

// TTS helper — reads text aloud using browser SpeechSynthesis (free)
export function speakText(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    toast.error("Text-to-speech not supported in this browser.");
    return;
  }

  // Stop any current speech
  window.speechSynthesis.cancel();

  // Clean markdown for speech
  const clean = text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_~`#>\[\]()]/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith("vi")) || voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) || voices[0];
  if (preferred) utterance.voice = preferred;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
