import { NextRequest, NextResponse } from "next/server";

// Endpoint predisposto per l'integrazione di Google Gemini API
// Per attivarlo: imposta GEMINI_API_KEY nel file .env.local
export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        fallback: true,
        message: "GEMINI_API_KEY non configurata. Il bot utilizzerà il motore di simulazione locale.",
      });
    }

    // Chiamata all'API ufficiale Gemini (Gemini 1.5 Flash / Pro)
    const prompt = `Sei "Casper", un assistente virtuale automotive amichevole ed esperto per "Global Drive Srls", società che vende auto usate e cerca veicoli su commissione in provincia di Sassari (non è una concessionaria).
Offri consulenza sull'usato garantito, su vetture commissionate nel mercato europeo, e sul servizio conto vendita.
Rispondi in modo conciso, elegante e chiaro, invitando poi il cliente a contattare Global Drive su WhatsApp.
Domanda dell'utente: "${message}"`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();
    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Ti invito a contattarci su WhatsApp per scoprire l'auto migliore per le tue esigenze!";

    return NextResponse.json({
      success: true,
      reply: replyText,
    });
  } catch (error: any) {
    console.error("Gemini Casper Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
