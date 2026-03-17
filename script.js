// --- CONFIGURAZIONE SUPABASE ---
const SB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SB_KEY = "sb_publishable_Sq9txbu-PmKdbxETSx2cjw_WqWEFBPO"; 
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

// Variabili globali per firme e foto
let sigPad = null;
let fotoChecklist = {};

// Definizione completa delle sezioni e domande
const sezioni = {
    "estintori": [
        "Gli estintori sono segnalati da apposita cartellonistica?",
        "Gli estintori sono prontamente individuabili e facilmente accessibili?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sugli estintori?",
        "L’ultimo controllo sugli estintori è stato effettuato non oltre sei mesi fa?"
    ],
    "idranti": [
        "Gli idranti sono segnalati da apposita cartellonistica?",
        "Gli idranti sono prontamente individuabili e facilmente accessibili?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sugli idranti?",
        "L’ultimo controllo sugli idranti è stato effettuato non oltre sei mesi fa?"
    ],
    "luci_di_emergenza": [
        "Le luci di emergenza sono correttamente funzionanti?",
        "Si è potuta riscontrare l’ASSENZA di anomalie sulle luci di emergenza?"
    ],
    "impianto_irai": [
        "Rilevatori e pulsanti manuali sono accessibili?",
        "Assenza di anomalie sui dispositivi dell’IRAI?"
    ],
    "porte_tagliafuoco": [
        "Le porte tagliafuoco sono segnalate e prive di ostacoli?",
        "Le prove di apertura/chiusura hanno confermato il corretto funzionamento?",
        "Si è potuta riscontrare l’ASSENZA di anomalie sulle porte?",
        "Controllo semestrale ditta specializzata regolare?"
    ],
    "vie_di_esodo": [
        "Vie di esodo e uscite segnalate?",
        "Percorsi privi di materiali ingombranti?",
        "Vie di esodo adeguatamente illuminate?",
        "Assenza di anomalie sulle vie di esodo?"
    ]
};

// --- FUNZIONI NAVIGAZIONE ---

window.mostraApp = function() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'block';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    fotoChecklist = {}; 
    window.renderChecklist();
    window.openTab(null, 'tab-info');
};

window.openTab = function(evt, tabName) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) contents[i].style.display = "none";

    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove("active");

    document.getElementById(tabName).style.display = "block";

    if (tabName === 'tab-invio') {
        setTimeout(() => { window.initSignature(); }, 200);
    }

    if (evt) evt.currentTarget.classList.add("active");
    window.scrollTo(0,0);
};

// --- RENDERING CHECKLIST ---

window.renderChecklist = function() {
    const container = document.getElementById('checklist-container');
    let html = '';
    for (const [key, domande] of Object.entries(sezioni)) {
        html += `<div class="sezione-titolo">${key.toUpperCase().replace(/_/g, ' ')}</div>`;
        domande.forEach((domanda, index) => {
            const id = `${key}_q${index}`;
            html += `
                <div class="card-verifica">
                    <p class="domanda-testo">${domanda}</p>
                    <div class="opzioni">
                        <label><input type="radio" name="${id}" value="SI" checked> ✅ SI</label>
                        <label><input type="radio" name="${id}" value="NO"> ❌ NO</label>
                    </div>
                    <textarea class="area-note" id="note_${id}" placeholder="Note o anomalie..."></textarea>
                    <button type="button" class="btn-foto" onclick="window.scattaFoto('${id}')">📸 SCATTA FOTO</button>
                    <div id="preview_${id}" class="photo-preview" style="display:none;">
                        <img id="img_${id}" src="">
                    </div>
                    <input type="file" id="file_${id}" accept="image/*" capture="environment" style="display:none;" onchange="window.gestisciFoto(event, '${id}')">
                </div>`;
        });
    }
    container.innerHTML = html;
};

window.scattaFoto = (id) => document.getElementById(`file_${id}`).click();

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

// --- GESTIONE FIRMA ---

window.initSignature = function() {
    const canvas = document.getElementById('signature-pad');
    if (canvas && !sigPad) {
        sigPad = new SignaturePad(canvas, { backgroundColor: 'white' });
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
    }
};

// --- INVIO FINALE ---

window.inviaVerifica = async function() {
    const btn = document.getElementById('btnInvia');
    const overlay = document.getElementById('loading-overlay');
    const op1 = document.getElementById('operatore_1').value;
    const dataV = document.getElementById('dataVerifica').value;

    if (sigPad.isEmpty()) return alert("La firma è obbligatoria!");

    btn.disabled = true;
    overlay.style.display = 'flex';

    try {
        // Prepariamo l'oggetto risposte (JSON)
        const risposteJSON = {};
        for (const [key, domande] of Object.entries(sezioni)) {
            risposteJSON[key] = domande.map((d, i) => {
                const id = `${key}_q${i}`;
                return {
                    domanda: d,
                    risposta: document.querySelector(`input[name="${id}"]:checked`).value,
                    nota: document.getElementById(`note_${id}`).value
                };
            });
        }

        const record = {
            operatore_1: op1,
            data_ispezione: dataV,
            risposte: risposteJSON,
            foto: fotoChecklist,
            firma_base64: sigPad.toDataURL(),
            processato: false
        };

        // 1. Salvataggio nel database
        const { data, error } = await supabaseClient
            .from('verifiche_antincendio')
            .insert([record])
            .select();

        if (error) throw error;

        // 2. Chiamata alla Edge Function (Genera PDF e invia Email)
        await supabaseClient.functions.invoke('antincendio', {
            body: { record: data[0] }
        });

        alert("🚀 Rapporto inviato con successo a Geom. Ripà!");
        location.reload();

    } catch (err) {
        console.error(err);
        alert("❌ Errore: " + err.message);
    } finally {
        btn.disabled = false;
        overlay.style.display = 'none';
    }
};

window.caricaStorico = async function() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'block';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    const container = document.getElementById('lista-verifiche');
    container.innerHTML = "Caricamento...";
    
    const { data, error } = await supabaseClient
        .from('verifiche_antincendio')
        .select('*')
        .order('created_at', { ascending: false });
            
    if (error) {
        container.innerHTML = "Errore.";
    } else {
        container.innerHTML = data.map(v => `
            <div class="card-verifica" style="border-left: 5px solid #004a99;">
                <strong>${v.operatore_1}</strong> - ${new Date(v.data_ispezione).toLocaleDateString()}<br>
                <a href="${v.pdf_url}" target="_blank" style="color:#004a99; font-weight:bold;">VEDI PDF 📄</a>
            </div>
        `).join('');
    }
};
