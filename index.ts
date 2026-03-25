// @ts-nocheck - Deno Edge Functions types not available in VSCode
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestione CORS per permettere la chiamata dall'app
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Inizializza Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Estrae i dati inviati dall'app
    const body = await req.json()
    const record = body.record || body

    if (!record || !record.id) {
      throw new Error("Dati mancanti: Impossibile trovare l'ID del record")
    }

    console.log("Elaborazione record ID:", record.id)

    // Determina il tipo di verifica dalla struttura delle risposte
    // Se contiene 'contenuto_cassetta' o 'strumenti' è Primo Soccorso
    const risposte = record.risposte || {};
    const hasContenutoCassetta = risposte.contenuto_cassetta || risposte.strumenti;
    const isPrimoSoccorso = !!hasContenutoCassetta;
    
    // Determina la tabella corretta per l'update
    const tabellaUpdate = isPrimoSoccorso ? 'verifiche_primo_soccorso' : 'verifiche_antincendio';
    const nomeVerbale = isPrimoSoccorso ? 'verbale_primo_soccorso_' : 'verbale_';
    const colorePrimario = isPrimoSoccorso ? [40, 167, 69] : [0, 74, 153]; // Verde o Blu

    // Inizia la creazione del PDF
    const doc = new jsPDF()
    let y = 20

    // 1. INSERIMENTO LOGO (se presente)
    if (record.logo_base64 && record.logo_base64.startsWith('data:image')) {
      try {
        doc.addImage(record.logo_base64, 'PNG', 15, 10, 40, 12)
        y = 35
      } catch (e) {
        console.error("Errore inserimento logo:", e)
      }
    }

    // ==========================================
    // HEADER SISTEMA GESTIONE QUALITA' PER ENTRAMBI
    // ==========================================
    // Riga superiore: SISTEMA GESTIONE QUALITA' a sinistra, MODULO a destra
    doc.setFontSize(10)
    doc.setTextColor(0, 74, 153)
    doc.text("SISTEMA GESTIONE QUALITA':", 15, y)
    doc.setFont("helvetica", "bold")
    doc.text("MODULO", 190, y, { align: "right" })
    y += 8
    
    // Linea separatrice
    doc.setDrawColor(0, 74, 153)
    doc.setLineWidth(0.5)
    doc.line(15, y, 195, y)
    y += 8
    
    // Titolo principale (differente per tipo)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 74, 153)
    if (isPrimoSoccorso) {
      doc.text("REGISTRO CASSETTE DI PRIMO SOCCORSO", 105, y, { align: "center" })
    } else {
      doc.text("REGISTRO VERIFICA SISTEMA SICUREZZA ANTINCENDIO", 105, y, { align: "center" })
    }
    y += 10
    
    // Sottotitolo con revisione
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text("Rev. 0", 190, y, { align: "right" })
    y += 12
    
    // Linea separatrice
    doc.setDrawColor(200)
    doc.line(15, y, 195, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(0)
    
    // Formattazione data
    const dataFormat = record.data_ispezione ? new Date(record.data_ispezione).toLocaleDateString('it-IT') : 'N.D.'
    doc.text(`Data Intervento: ${dataFormat}`, 15, y)
    y += 7
    doc.text(`Operatore 1: ${record.operatore_1 || 'N.D.'}`, 15, y)
    y += 7
    
    // Mostra operatore 2 solo se presente
    if (record.operatore_2) {
      doc.text(`Operatore 2: ${record.operatore_2}`, 15, y)
      y += 7
    }
    y += 5

    // 2. CICLO SULLE RISPOSTE (Checklist, Note e Foto)
    if (record.risposte && typeof record.risposte === 'object') {
      for (const [sez, domande] of Object.entries(record.risposte)) {
        
        // Controllo spazio per il titolo della sezione
        if (y > 260) { doc.addPage(); y = 20; }
        
        // Stile titolo sezione
        doc.setFont("helvetica", "bold")
        doc.setFillColor(colorePrimario[0], colorePrimario[1], colorePrimario[2])
        doc.setTextColor(255, 255, 255)
        doc.rect(15, y, 180, 7, 'F')
        doc.text(sez.toUpperCase().replace(/_/g, ' '), 17, y + 5)
        y += 12
        
        doc.setFont("helvetica", "normal")
        doc.setTextColor(0)
        
        // 'domande' è un array di oggetti: { domanda, risposta, nota }
        if (Array.isArray(domande)) {
            domande.forEach((item, i) => {
                const qId = `${sez}_q${i}` // ID univoco per cercare la foto
                
                // Controllo spazio per la domanda
                if (y > 270) { doc.addPage(); y = 20; }
                
                // Testo della domanda a capo automatico
                const testoDomanda = doc.splitTextToSize(`${i+1}. ${item.domanda}`, 160)
                doc.text(testoDomanda, 15, y)
                
                // Risposta (SI/NO) allineata a destra
                doc.setFont("helvetica", "bold")
                if (item.risposta === 'SI') {
                    doc.setTextColor(0, 128, 0) // Verde
                } else {
                    doc.setTextColor(204, 0, 0) // Rosso
                }
                doc.text(item.risposta || 'N.D.', 185, y)
                doc.setFont("helvetica", "normal")
                doc.setTextColor(0)
                
                y += (testoDomanda.length * 6)
                
                // Aggiunta Nota (se compilata)
                if (item.nota) {
                    doc.setFontSize(8)
                    doc.setTextColor(100)
                    const notaLines = doc.splitTextToSize(`Nota: ${item.nota}`, 170)
                    doc.text(notaLines, 20, y)
                    y += (notaLines.length * 5)
                    doc.setFontSize(10)
                    doc.setTextColor(0)
                }

                // Aggiunta Foto sotto la specifica domanda (se scattata)
                if (record.foto && record.foto[qId]) {
                    // Controllo spazio per l'immagine
                    if (y > 200) { doc.addPage(); y = 20; }
                    try {
                        doc.addImage(record.foto[qId], 'JPEG', 20, y, 50, 35) 
                        y += 40
                    } catch (e) {
                        console.error(`Errore inserimento foto per ${qId}:`, e)
                    }
                }
                
                y += 4 // Spazio tra una domanda e l'altra
            })
        }
        y += 5 // Spazio tra le sezioni
      }
    }

    // 4. INSERIMENTO FIRME
    if (y > 220) { doc.addPage(); y = 20; } // Se non c'è spazio, pagina nuova
    y += 10
    
    doc.text("Firma Operatore 1:", 15, y)
    if (record.firma_base64 && record.firma_base64.startsWith('data:image')) {
        doc.addImage(record.firma_base64, 'PNG', 15, y + 5, 45, 20)
    }
    
    // Inserisce la seconda firma solo se è stata compilata
    if (record.firma_2_base64 && record.firma_2_base64.startsWith('data:image')) {
        doc.text("Firma Operatore 2:", 110, y)
        doc.addImage(record.firma_2_base64, 'PNG', 110, y + 5, 45, 20)
    }

    // 5. ESPORTAZIONE PDF E UPLOAD SU STORAGE
    const pdfArray = doc.output('arraybuffer')
    const fileName = `${nomeVerbale}${record.id}.pdf`

    const { error: storageErr } = await supabase.storage
      .from("ai_verifiche")
      .upload(fileName, pdfArray, { contentType: 'application/pdf', upsert: true })
    
    if (storageErr) throw new Error("Errore Salvataggio PDF: " + storageErr.message)

    const { data: { publicUrl } } = supabase.storage.from("ai_verifiche").getPublicUrl(fileName)

    // 6. INVIO EMAIL TRAMITE RESEND
    const resendApiKey = "re_9vyoQUPF_AGCtEg6ALeFDzcyavtiKz4iq"
    
    // Logo HTML (se presente)
    const logoHtml = record.logo_base64 && record.logo_base64.startsWith('data:image') 
      ? `<img src="${record.logo_base64}" alt="Logo PT" style="height: 60px; margin-bottom: 10px;">` 
      : '';
    
    // Dati operatore
    const operatore1 = record.operatore_1 || 'N.D.';
    const operatore2 = record.operatore_2 ? `<p style="margin: 5px 0;"><strong>👤 Operatore 2:</strong> ${record.operatore_2}</p>` : '';
    const nomeTipoVerifica = isPrimoSoccorso ? 'Primo Soccorso' : 'Antincendio';
    
    // Costruisci il riepilogo risposte
    let riepilogoHtml = '';
    if (record.risposte && typeof record.risposte === 'object') {
      for (const [sez, domande] of Object.entries(record.risposte)) {
        if (Array.isArray(domande)) {
          riepilogoHtml += `<div style="background-color: #f8f9fa; padding: 12px; border-left: 4px solid rgb(${colorePrimario.join(',')}); margin: 15px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: rgb(${colorePrimario.join(',')});">${sez.toUpperCase().replace(/_/g, ' ')}</p>`;
          domande.forEach((item, i) => {
            const emoji = item.risposta === 'SI' ? '✅' : '❌';
            riepilogoHtml += `<p style="margin: 4px 0; font-size: 13px;">${emoji} <strong>${item.risposta}</strong>: ${item.domanda}</p>`;
          });
          riepilogoHtml += '</div>';
        }
      }
    }
    
    // Template email con grafica
    const emailHtml = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
  <div style="background-color: rgb(${colorePrimario.join(',')}); padding: 25px; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px;">RAPPORTO TECNICO</h1>
    <p style="color: #e0e0e0; margin: 5px 0 0 0; font-size: 14px;">Verifica ${nomeTipoVerifica} - Pannelli Termici S.r.l.</p>
  </div>

  <div style="padding: 30px; line-height: 1.6; color: #333; background-color: #ffffff;">
    <div style="margin-bottom: 20px;">
      <p style="margin: 5px 0;"><strong>👤 Operatore:</strong> ${operatore1}</p>
      ${operatore2}
      <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${dataFormat}</p>
    </div>

    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid rgb(${colorePrimario.join(',')}); margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: rgb(${colorePrimario.join(',')});">📝 Riepilogo Verifica:</p>
      ${riepilogoHtml}
    </div>

    <div style="text-align: center; margin-top: 35px; padding-top: 25px; border-top: 1px solid #eee;">
      <p style="font-size: 13px; color: #666; margin-bottom: 15px;">
        Il rapporto completo in formato PDF è disponibile qui sotto:
      </p>
      <a href="${publicUrl}" style="background-color: #27ae60; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 2px 5px rgba(39,174,96,0.3);">
        📄 SCARICA RAPPORTO PDF
      </a>
    </div>
  </div>

  <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee;">
    Questo è un messaggio automatico generato dall'App Verifiche ${nomeTipoVerifica}.<br />
    Non rispondere a questa email.
  </div>
</div>`;
    
    // Mettiamo in try/catch così se la mail fallisce, non blocca il processo
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: 'Pannelli Termici <onboarding@resend.dev>',
          to: ['geom.rip@gmail.com'],
          subject: `RAPPORTO: ${operatore1} - Verifica ${nomeTipoVerifica}`,
          html: emailHtml
        })
      })
    } catch (emailErr) {
      console.error("Avviso: PDF generato ma invio mail fallito:", emailErr)
    }

    // 7. AGGIORNAMENTO DATABASE
    const { error: updateErr } = await supabase.from(tabellaUpdate)
      .update({ pdf_url: publicUrl, processato: true })
      .eq('id', record.id)

    if (updateErr) throw new Error("Errore aggiornamento Database: " + updateErr.message)

    return new Response(JSON.stringify({ success: true, url: publicUrl }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error("ERRORE CRITICO FUNZIONE:", errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 400 
    })
  }
})