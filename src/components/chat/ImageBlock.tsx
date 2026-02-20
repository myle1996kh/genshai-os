import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ZoomIn, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ImageBlockProps {
  prompt: string;
  caption?: string;
}

export function ImageBlock({ prompt, caption }: ImageBlockProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    generateImage();
  }, [prompt]);

  const generateImage = async () => {
    try {
      setLoading(true);
      setError(false);

      const { data, error: fnError } = await supabase.functions.invoke("generate-agent-image", {
        body: { prompt },
      });

      if (fnError || !data?.url) {
        setError(true);
      } else {
        setImageUrl(data.url);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="my-5 p-8 rounded-xl border border-gold/15 bg-obsidian-light/40 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-gold/70" />
        <span className="text-sm text-cream-dim/60 font-mono">Generating image…</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="my-5 p-4 rounded-xl border border-destructive/40 bg-destructive/5 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
        <p className="text-sm text-destructive">Failed to generate image</p>
      </div>
    );
  }

  return (
    <>
      <div className="my-5 rounded-xl border border-gold/15 bg-obsidian-light/40 overflow-hidden group">
        <div
          className="relative cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={imageUrl}
            alt={caption || prompt}
            className="w-full h-auto"
            loading="lazy"
          />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md glass border border-gold/20 text-xs text-cream-dim">
              <ZoomIn className="w-3 h-3" />
              <span>Zoom</span>
            </div>
          </div>
        </div>
        {caption && (
          <div className="px-4 py-2.5 border-t border-gold/10 bg-obsidian-light/20">
            <p className="text-xs text-cream-dim/60 italic">{caption}</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-cream-dim hover:text-cream transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={imageUrl}
              alt={caption || prompt}
              className="w-full h-auto rounded-xl border border-gold/15"
            />
            {caption && (
              <p className="mt-3 text-sm text-cream-dim/70 italic text-center">{caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
