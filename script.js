// --- CONFIGURAZIONE SUPABASE ---
const SB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenJld2Nibm9xYnF2emNrb21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njk2NDUsImV4cCI6MjA4NjU0NTY0NX0.pdnPyYB4DwEjZ10aF3tGigAjiwLGkP-kx07-15L4ass";
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

// Variabili globali per firme e foto
let sigPad1 = null;
let sigPad2 = null;
let fotoChecklist = {};
let tipoModulo = 'antincendio'; // Variabile globale per il tipo di modulo attivo

// Definizione delle sezioni ANTINCENDIO
const sezioniAntincendio = {
    "estintori": [
        "Gli estintori sono segnalati da apposita cartellonistica?",
        "Gli estintori sono prontamente individuabili e facilmente accessibili?",
        "Si è potuta riscontrare l'ASSENZA di anomalie e/o fattori di pericolo sugli estintori?",
        "L'ultimo controllo sugli estintori è stato effettuato non oltre sei mesi fa?"
    ],
    "idranti": [
        "Gli idranti sono segnalati da apposita cartellonistica?",
        "Gli idranti sono prontamente individuabili e facilmente accessibili?",
        "Si è potuta riscontrare l'ASSENZA di anomalie e/o fattori di pericolo sugli idranti?",
        "L'ultimo controllo sugli idranti è stato effettuato non oltre sei mesi fa?"
    ],
    "luci_di_emergenza": [
        "Le luci di emergenza sono correttamente funzionanti?",
        "Si è potuta riscontrare l'ASSENZA di anomalie sulle luci di emergenza?"
    ],
    "impianto_irai": [
        "Rilevatori e pulsanti manuali sono accessibili?",
        "Assenza di anomalie sui dispositivi dell'IRAI?"
    ],
    "porte_tagliafuoco": [
        "Le porte tagliafuoco sono segnalate e prive di ostacoli?",
        "Le prove di apertura/chiusura hanno confermato il corretto funzionamento?",
        "Si è potuta riscontrare l'ASSENZA di anomalie sulle porte?",
        "Controllo semestrale ditta specializzata regolare?"
    ],
    "vie_di_esodo": [
        "Vie di esodo e uscite segnalate?",
        "Percorsi privi di materiali ingombranti?",
        "Vie di esodo adeguatamente illuminate?",
        "Assenza di anomalie sulle vie di esodo?"
    ]
};

// Definizione delle sezioni PRIMO SOCCORSO - Contenuto Cassette
const sezioniPrimoSoccorso = {
    "contenuto_cassetta": [
        "Guanti sterili monouso (5 paia)",
        "Visiera paraschizzi",
        "Flacone di soluzione cutanea di iodopovidone al 10% di iodio da 1 litro",
        "Flaconi di soluzione fisiologica (sodio cloruro - 0, 9%) da 500 ml (3)",
        "Compresse di garza sterile 10 x 10 in buste singole (10)",
        "Compresse di garza sterile 18 x 40 in buste singole (2)",
        "Teli sterili monouso (2)",
        "Pinzette da medicazione sterili monouso (2)",
        "Confezione di rete elastica di misura media (1)",
        "Confezione di cotone idrofilo (1)",
        "Confezioni di cerotti di varie misure pronti all'uso (2)",
        "Rotoli di cerotto alto cm. 2,5 (2)",
        "Un paio di forbici",
        "Lacci emostatici (3)",
        "Ghiaccio pronto uso (due confezioni)",
        "Sacchetti monouso per la raccolta di rifiuti sanitari (2)"
    ],
    "strumenti": [
        "Termometro",
        "Apparecchio per la misurazione della pressione arteriosa"
    ]
};

// --- FUNZIONI NAVIGAZIONE ---

window.mostraApp = function(tipo) {
    tipoModulo = tipo || 'antincendio';
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'block';
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    // Imposta il badge del tipo di modulo
    const badge = document.getElementById('tipo-modulo-badge');
    if (badge) {
        if (tipoModulo === 'primo_soccorso') {
            badge.textContent = '🏥 MODULO: VERIFICA CASSETTE PRIMO SOCCORSO';
            badge.style.background = '#d4edda';
            badge.style.color = '#155724';
        } else {
            badge.textContent = '🔥 MODULO: VERIFICA ANTINCENDIO';
            badge.style.background = '#f8d7da';
            badge.style.color = '#721c24';
        }
    }
    
    fotoChecklist = {}; // Reset foto
    window.renderChecklist();
    window.openTab(null, 'tab-info');
};

window.tornaAllaHome = function() {
    document.getElementById('home-screen').style.display = 'block';
    document.getElementById('app-interface').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'none';
    
    // Reset delle firme
    if (sigPad1) sigPad1.clear();
    if (sigPad2) sigPad2.clear();
};

window.openTab = function(evt, tabName) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) contents[i].style.display = "none";

    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove("active");

    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";

    // Inizializza le firme quando si arriva all'ultimo tab
    if (tabName === 'tab-invio') {
        setTimeout(() => { window.initSignatures(); }, 200);
    }

    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    } else {
        const firstBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (firstBtn) firstBtn.classList.add("active");
    }
    window.scrollTo(0,0);
};

// --- RENDERING CHECKLIST ---

window.renderChecklist = function() {
    const container = document.getElementById('checklist-container');
    if (!container) return;
    
    // Seleziona le sezioni in base al tipo di modulo
    const sezioni = (tipoModulo === 'primo_soccorso') ? sezioniPrimoSoccorso : sezioniAntincendio;
    
    let html = '';
    for (const [key, domande] of Object.entries(sezioni)) {
        html += `<div class="sezione-titolo">${key.replace(/_/g, ' ').toUpperCase()}</div>`;
        domande.forEach((domanda, index) => {
            const id = `${key}_q${index}`;
            html += `
                <div class="card-verifica">
                    <p class="domanda-testo">${domanda}</p>
                    <div class="opzioni">
                        <label><input type="radio" name="${id}" value="SI" checked> ✅ SI</label>
                        <label><input type="radio" name="${id}" value="NO"> ❌ NO</label>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <textarea class="area-note" id="note_${id}" placeholder="Note o anomalie..."></textarea>
                        <button type="button" class="btn-foto" onclick="window.scattaFoto('${id}')">📸</button>
                    </div>
                    <div id="preview_${id}" class="photo-preview" style="display:none; margin-top:10px;">
                        <img id="img_${id}" src="" style="width:100px; border-radius:8px; border:1px solid #ddd;">
                        <button type="button" onclick="window.rimuoviFoto('${id}')" style="color:red; background:none; border:none; font-size:12px; display:block;">Rimuovi</button>
                    </div>
                    <input type="file" id="file_${id}" accept="image/*" capture="environment" style="display:none;" onchange="window.gestisciFoto(event, '${id}')">
                </div>
            `;
        });
    }
    container.innerHTML = html;
};

// --- GESTIONE FOTO ---

window.scattaFoto = async (id) => {
    const fileInput = document.getElementById(`file_${id}`);
    
    // Su mobile, usa direttamente la fotocamera
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        fileInput.click();
        return;
    }
    
    // Su desktop Windows/Mac, prova ad usare la webcam se disponibile
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Se l'accesso alla webcam funziona, mostriamo un prompt
        stream.getTracks().forEach(track => track.stop());
        
        // Chiedi all'utente se vuole usare webcam o caricare file
        if (confirm('Vuoi scattare una foto con la webcam?\n\nClicca ANNULLA per caricare un file.')) {
            // Implementazione webcam diretta (richiede ulteriore codice)
            fileInput.click();
        } else {
            fileInput.click();
        }
    } catch (err) {
        // Webcam non disponibile o permesso negato, usa file picker
        console.log('Webcam non disponibile, uso selezione file');
        fileInput.click();
    }
};

window.gestisciFoto = (e, id) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            fotoChecklist[id] = event.target.result;
            document.getElementById(`img_${id}`).src = event.target.result;
            document.getElementById(`preview_${id}`).style.display = "block";
        };
        reader.readAsDataURL(file);
    }
};

window.rimuoviFoto = (id) => {
    delete fotoChecklist[id];
    document.getElementById(`preview_${id}`).style.display = "none";
    document.getElementById(`file_${id}`).value = "";
};

// --- GESTIONE FIRME (DOPPIE) ---

window.initSignatures = function() {
    const canvas1 = document.getElementById('signature-pad-1');
    const canvas2 = document.getElementById('signature-pad-2');
    
    if (canvas1 && !sigPad1) {
        sigPad1 = new SignaturePad(canvas1, { backgroundColor: 'white' });
        window.resizeCanvas(canvas1);
    }
    if (canvas2 && !sigPad2) {
        sigPad2 = new SignaturePad(canvas2, { backgroundColor: 'white' });
        window.resizeCanvas(canvas2);
    }
};

window.resizeCanvas = function(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
};

window.cancellaFirma = (n) => {
    if (n === 1 && sigPad1) sigPad1.clear();
    if (n === 2 && sigPad2) sigPad2.clear();
};

// --- INVIO FINALE ---

window.inviaVerifica = async function() {
    const btn = document.getElementById('btnInvia');
    const op1 = document.getElementById('operatore_1').value;
    const op2 = document.getElementById('operatore_2').value;
    const dataV = document.getElementById('dataVerifica').value;

    if (!op1 || !sigPad1 || sigPad1.isEmpty()) {
        alert("Attenzione: Operatore 1 e Firma sono obbligatori!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "🚀 INVIO IN CORSO...";

    try {
        // Seleziona le sezioni in base al tipo di modulo
        const sezioni = (tipoModulo === 'primo_soccorso') ? sezioniPrimoSoccorso : sezioniAntincendio;
        const tabellaDB = (tipoModulo === 'primo_soccorso') ? 'verifiche_primo_soccorso' : 'verifiche_antincendio';
        // Usa sempre hyper-function che gestisce entrambi i tipi
        const nomeEdgeFunction = 'hyper-function';

        // 1. Raccogliamo tutte le risposte nell'oggetto JSON 'risposte'
        const risposteJSON = {};
        for (const [nomeSezione, domande] of Object.entries(sezioni)) {
            risposteJSON[nomeSezione] = domande.map((domanda, i) => {
                const id = `${nomeSezione}_q${i}`;
                const risp = document.querySelector(`input[name="${id}"]:checked`)?.value || "SI";
                const nota = document.getElementById(`note_${id}`).value;
                return { domanda, risposta: risp, nota };
            });
        }

        // 2. Prepariamo il record per il database
        const record = {
            operatore_1: op1,
            operatore_2: op2,
            data_ispezione: new Date(dataV).toISOString(),
            risposte: risposteJSON,
            foto: fotoChecklist,
            firma_base64: sigPad1.toDataURL(),
            firma_2_base64: sigPad2 && !sigPad2.isEmpty() ? sigPad2.toDataURL() : null,
            logo_base64: logoBase64 || "",
            processato: false
        };

        // 3. Salvataggio nel database
        const { data: dbData, error: dbErr } = await supabaseClient
            .from(tabellaDB)
            .insert([record])
            .select();

        if (dbErr) throw new Error("Errore Database: " + dbErr.message);
        
        const nuovoRecord = dbData[0];

        // 4. Chiamata alla Edge Function
        try {
            await supabaseClient.functions.invoke(nomeEdgeFunction, {
                body: { record: nuovoRecord }
            });
        } catch (funcErr) {
            console.log("Edge function non disponibile, PDF verrà generato offline");
        }

        const nomeModulo = (tipoModulo === 'primo_soccorso') ? 'Primo Soccorso' : 'Antincendio';
        alert("✅ Verifica " + nomeModulo + " inviata con successo!");
        window.tornaAllaHome();
        setTimeout(() => { location.reload(); }, 500);

    } catch (err) {
        console.error(err);
        alert("❌ Errore: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "🚀 SALVA E INVIA";
    }
};

// --- STORICO ---

window.caricaStorico = async function(tipo) {
    tipoModulo = tipo || 'antincendio';
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'block';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    const container = document.getElementById('lista-verifiche');
    container.innerHTML = "<p style='text-align:center;'>Caricamento in corso...</p>";
    
    const tabellaDB = (tipoModulo === 'primo_soccorso') ? 'verifiche_primo_soccorso' : 'verifiche_antincendio';
    const nomeModulo = (tipoModulo === 'primo_soccorso') ? 'Primo Soccorso' : 'Antincendio';
    
    try {
        const { data, error } = await supabaseClient
            .from(tabellaDB)
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Aggiungi titolo per il tipo di storico
        const titoloStorico = (tipoModulo === 'primo_soccorso') 
            ? '<h3 style="color: #28a745; text-align: center;">📂 ARCHIVIO VERIFICHE PRIMO SOCCORSO</h3>' 
            : '<h3 style="color: #dc3545; text-align: center;">📂 ARCHIVIO VERIFICHE ANTINCENDIO</h3>';
        
        if (data.length === 0) {
            container.innerHTML = titoloStorico + "<p style='text-align:center;'>Nessuna verifica trovata.</p>";
            return;
        }

        container.innerHTML = titoloStorico + data.map(v => {
            const op2Text = v.operatore_2 ? ` (+ ${v.operatore_2})` : "";
            
            return `
            <div class="card-verifica" style="border-left: 5px solid ${tipoModulo === 'primo_soccorso' ? '#28a745' : '#dc3545'}; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${v.operatore_1}${op2Text}</strong>
                    <span style="font-size:0.8rem; color:#666;">${new Date(v.data_ispezione).toLocaleDateString()}</span>
                </div>
                <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.7rem; color:#999;">ID: ${v.id}</span>
                    ${v.pdf_url ? `<a href="${v.pdf_url}" target="_blank" style="background:${tipoModulo === 'primo_soccorso' ? '#28a745' : '#004a99'}; color:white; padding:5px 10px; border-radius:5px; text-decoration:none; font-size:0.8rem;">VEDI PDF 📄</a>` : `<span style="font-size:0.8rem; color:orange;">In elaborazione...</span>`}
                </div>
            </div>
        `}).join('');
    } catch (e) { 
        container.innerHTML = "<p style='color:red;'>Errore nel caricamento dello storico.</p>"; 
    }
};

// Imposta data odierna all'avvio
window.addEventListener('load', () => {
    if (document.getElementById('dataVerifica')) {
        document.getElementById('dataVerifica').valueAsDate = new Date();
    }
});

// --- ESPORTAZIONE TABELLE IN EXCEL ---
window.esportaTabella = async function(tipo) {
    const nomi = {
        'antincendio': 'Antincendio',
        'primo_soccorso': 'Primo Soccorso',
        'entrambe': 'Entrambe le tabelle'
    };
    
    const conferma = confirm(`Vuoi esportare la tabella ${nomi[tipo]} e inviarla per email a geom.rip@gmail.com?`);
    if (!conferma) return;
    
    try {
        btn = document.createElement('button');
        btn.innerText = '⏳ Esportazione in corso...';
        btn.disabled = true;
        alert('⏳ Esportazione in corso. Riceverai una email con il file Excel.');
        
        const { data, error } = await supabaseClient.functions.invoke('export-excel', {
            body: { tipo_tabella: tipo }
        });
        
        if (error) throw error;
        
        alert('✅ Esportazione completata! Controlla la tua email.');
    } catch (err) {
        console.error(err);
        alert('❌ Errore: ' + err.message);
    }
};
