import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
  if (!DEEPGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'DEEPGRAM_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'tts';

    if (action === 'stt') {
      // Speech-to-Text: receive audio blob, return transcript
      const audioData = await req.arrayBuffer();
      const lang = url.searchParams.get('lang') || 'vi';

      const dgResponse = await fetch(
        `https://api.deepgram.com/v1/listen?language=${lang}&model=nova-3&smart_format=true&punctuate=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/webm',
          },
          body: audioData,
        }
      );

      if (!dgResponse.ok) {
        const errText = await dgResponse.text();
        console.error(`Deepgram STT error [${dgResponse.status}]: ${errText}`);
        return new Response(JSON.stringify({ error: `Deepgram STT failed: ${dgResponse.status}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await dgResponse.json();
      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

      return new Response(JSON.stringify({ transcript }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'tts') {
      // Text-to-Speech: receive text, return audio
      const { text, model, voice } = await req.json();

      const ttsModel = model || 'aura-asteria-en';

      const dgResponse = await fetch(
        `https://api.deepgram.com/v1/speak?model=${ttsModel}&encoding=mp3`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!dgResponse.ok) {
        const errText = await dgResponse.text();
        console.error(`Deepgram TTS error [${dgResponse.status}]: ${errText}`);
        return new Response(JSON.stringify({ error: `Deepgram TTS failed: ${dgResponse.status}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const audioBuffer = await dgResponse.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use ?action=stt or ?action=tts' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Deepgram voice error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
