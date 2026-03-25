// @ts-nocheck - Deno Edge Functions types not available in VSCode
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Funzione per convertire array di oggetti in CSV
function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Header row
  csvRows.push(headers.join(','));
  
  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { tipo_tabella } = body

    let tabella = 'verifiche_antincendio';
    let nomeFile = 'verifiche_antincendio';
    let csv = '';
    let csvAntincendio = '';
    let csvPrimoSoccorso = '';
    
    if (tipo_tabella === 'entrambe') {
      // Esporta entrambe
      const { data: antincendio } = await supabase
        .from('verifiche_antincendio')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: primoSoccorso } = await supabase
        .from('verifiche_primo_soccorso')
        .select('*')
        .order('created_at', { ascending: false });

      csvAntincendio = arrayToCSV(antincendio || []);
      csvPrimoSoccorso = arrayToCSV(primoSoccorso || []);
      
      // Salva su Storage
      const dataOdierna = new Date().toISOString().split('T')[0];
      
      await supabase.storage
        .from("ai_verifiche")
        .upload(`esportazione_antincendio_${dataOdierna}.csv`, csvAntincendio, { contentType: 'text/csv', upsert: true });
        
      await supabase.storage
        .from("ai_verifiche")
        .upload(`esportazione_primo_soccorso_${dataOdierna}.csv`, csvPrimoSoccorso, { contentType: 'text/csv', upsert: true });
      
      const { data: urlAnt } = supabase.storage.from("ai_verifiche").getPublicUrl(`esportazione_antincendio_${dataOdierna}.csv`);
      const { data: urlPri } = supabase.storage.from("ai_verifiche").getPublicUrl(`esportazione_primo_soccorso_${dataOdierna}.csv`);

      // Invia email con link ai file
      const resendApiKey = "re_9vyoQUPF_AGCtEg6ALeFDzcyavtiKz4iq";
      
      const emailHtml = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #004a99; padding: 25px; text-align: center;">
    <h1 style="color: white; margin: 0;">📊 Esportazione Verifiche PT</h1>
    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Pannelli Termici S.r.l.</p>
  </div>
  <div style="padding: 30px;">
    <p style="margin-bottom: 20px;">Scarica i file CSV cliccando sui link qui sotto:</p>
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <strong>📋 Verifiche Antincendio</strong> (${(antincendio || []).length} record)<br>
      <a href="${urlAnt.publicUrl}" style="color: #004a99;">⬇️ Scarica CSV</a>
    </div>
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
      <strong>🏥 Verifiche Primo Soccorso</strong> (${(primoSoccorso || []).length} record)<br>
      <a href="${urlPri.publicUrl}" style="color: #28a745;">⬇️ Scarica CSV</a>
    </div>
  </div>
</div>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: 'Pannelli Termici <onboarding@resend.dev>',
          to: ['geom.rip@gmail.com'],
          subject: `📊 Esportazione Verifiche PT - ${new Date().toLocaleDateString('it-IT')}`,
          html: emailHtml
        })
      });

      return new Response(JSON.stringify({ 
        success: true, 
        url_antincendio: urlAnt.publicUrl,
        url_primo_soccorso: urlPri.publicUrl
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Esporta singola tabella
    if (tipo_tabella === 'primo_soccorso') {
      tabella = 'verifiche_primo_soccorso';
      nomeFile = 'verifiche_primo_soccorso';
    }

    const { data, error } = await supabase
      .from(tabella)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    csv = arrayToCSV(data || []);
    const dataOdierna = new Date().toISOString().split('T')[0];

    // Salva CSV su Storage
    await supabase.storage
      .from("ai_verifiche")
      .upload(`${nomeFile}_${dataOdierna}.csv`, csv, { contentType: 'text/csv', upsert: true });
    
    const { data: urlData } = supabase.storage.from("ai_verifiche").getPublicUrl(`${nomeFile}_${dataOdierna}.csv`);

    // Invia email con link
    const resendApiKey = "re_9vyoQUPF_AGCtEg6ALeFDzcyavtiKz4iq";
    const nomeTabella = tipo_tabella === 'primo_soccorso' ? 'Primo Soccorso' : 'Antincendio';
    
    const emailHtml = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: ${tipo_tabella === 'primo_soccorso' ? '#28a745' : '#dc3545'}; padding: 25px; text-align: center;">
    <h1 style="color: white; margin: 0;">📊 Esportazione ${nomeTabella}</h1>
    <p style="color: #e0e0e0; margin: 5px 0 0 0;">Pannelli Termici S.r.l.</p>
  </div>
  <div style="padding: 30px;">
    <p style="margin-bottom: 20px;">Esportazione completata! (${(data || []).length} record)</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
      <a href="${urlData.publicUrl}" style="background-color: #27ae60; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        ⬇️ SCARICA FILE CSV
      </a>
    </div>
    
    <p style="margin-top: 20px; font-size: 12px; color: #888;">
      Apri il file CSV con Excel o Google Sheets.
    </p>
  </div>
</div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: 'Pannelli Termici <onboarding@resend.dev>',
        to: ['geom.rip@gmail.com'],
        subject: `📊 Esportazione ${nomeTabella} - ${dataOdierna}`,
        html: emailHtml
      })
    });

    return new Response(JSON.stringify({ 
      success: true, 
      url: urlData.publicUrl,
      count: (data || []).length 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error("ERRORE:", errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 400 
    })
  }
})
