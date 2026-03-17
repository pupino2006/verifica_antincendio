// --- CONFIGURAZIONE SUPABASE ---
const SB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SB_KEY = "sb_publishable_Sq9txbu-PmKdbxETSx2cjw_WqWEFBPO"; 
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

const EDGE_FUNCTION_URL = "https://vnzrewcbnoqbqvzckome.supabase.co/functions/v1/generate-pdf-function";

let signaturePad = null;
let fotoChecklist = {};

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
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    fotoChecklist = {};
    window.renderChecklist();
    window.openTab(null, 'tab-info');
};

window.tornaAllaHome = function() {
    document.getElementById('home-screen').style.display = 'block';
    document.getElementById('app-interface').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'none';
};

window.openTab = function(evt, tabName) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) contents[i].style.display = "none";

    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove("active");

    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";

    if (tabName === 'tab-invio') {
        setTimeout(() => { window.initSignature(); }, 150);
    }

    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    } else {
        const firstBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (firstBtn) firstBtn.classList.add("active");
    }
};

window.renderChecklist = function() {
    const container = document.getElementById('checklist-container');
    if (!container) return;
    
    let html = '';
    for (const [key, domande] of Object.entries(sezioni)) {
        html += `<div class="sezione-titolo">${key.toUpperCase().replace(/_/g, ' ')}</div>`;
        domande.forEach((domanda, index) => {
            const id = `${key}_q${index}`;
            html += `
                <div class="card-verifica">
                    <p class="text-sm font-semibold mb-3 text-gray-700">${domanda}</p>
                    <div class="opzioni-si-no">
                        <label><input type="radio" name="${id}" value="SI"> ✅ SI</label>
                        <label><input type="radio" name="${id}" value="NO"> ❌ NO</label>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <textarea class="area-note" id="note_${id}" placeholder="Note..."></textarea>
                        <button type="button" class="btn-foto" onclick="window.scattaFoto('${id}')">📷</button>
                    </div>
                    <div id="preview_${id}" style="margin-top:10px; display:none;">
                        <img id="img_${id}" src="" style="width:80px; border-radius:5px;">
                        <button type="button" onclick="window.rimuoviFoto('${id}')" style="color:red; font-size:10px;">Rimuovi</button>
                    </div>
                    <input type="file" id="file_${id}" accept="image/*" capture="environment" style="display:none;" onchange="window.gestisciFoto(event, '${id}')">
                </div>
            `;
        });
    }
    container.innerHTML = html;
};

// --- FOTO ---

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

window.rimuoviFoto = (id) => {
    delete fotoChecklist[id];
    document.getElementById(`preview_${id}`).style.display = "none";
};

// --- FIRMA ---

window.initSignature = function() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    if (!signaturePad) {
        signaturePad = new SignaturePad(canvas, { backgroundColor: 'white', penColor: 'black' });
    }
    window.resizeCanvas();
};

window.resizeCanvas = function() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
};

window.cancellaFirma = () => signaturePad && signaturePad.clear();

// --- SALVATAGGIO E INVIO ---
window.inviaVerifica = async function() {
    const btn = document.getElementById('btnInvia');
    const op1 = document.getElementById('operatore_1').value;

    if (!op1 || signaturePad.isEmpty()) {
        alert("Inserire Operatore e Firma!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Generazione PDF...";

    try {
        // 1. Genera PDF Blob
        const pdfBlob = await generaPDF();
        const nomeFile = `verifica_${Date.now()}.pdf`;

        // 2. Carica su Storage
        const { data: upData, error: upErr } = await supabaseClient.storage
            .from('pdf_verifiche') // Assicurati che il bucket esista ed è PUBBLICO
            .upload(nomeFile, pdfBlob);
        
        if (upErr) throw upErr;

        const { data: urlData } = supabaseClient.storage.from('pdf_verifiche').getPublicUrl(nomeFile);
        const publicUrl = urlData.publicUrl;

        // 3. Salva su Database
        await supabaseClient.from('verifiche_antincendio').insert([{
            operatore_1: op1,
            data_ispezione: new Date(),
            pdf_url: publicUrl
        }]);

        // 4. INVIO MAIL (Stessa logica Rapportini)
        const subject = encodeURIComponent(`Verifica Antincendio - ${op1}`);
        const body = encodeURIComponent(`Buongiorno,\nin allegato il link al report della verifica antincendio:\n\n${publicUrl}\n\nCordiali saluti.`);
        const mailTo = "sicurezza@pannellitermici.it"; // La tua mail aziendale
        
        alert("✅ Dati salvati! Ora si aprirà la tua mail per l'invio del link.");
        
        window.location.href = `mailto:${mailTo}?subject=${subject}&body=${body}`;

        window.tornaAllaHome();

    } catch (err) {
        alert("Errore: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "🚀 SALVA E GENERA PDF";
    }
}

window.caricaStorico = async function() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'block';
    document.getElementById('btnHomeFisso').style.display = 'block';
    const container = document.getElementById('lista-verifiche');
    container.innerHTML = "Caricamento...";
    try {
        const { data, error } = await supabaseClient.from('verifiche_antincendio').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        container.innerHTML = data.map(v => `
            <div class="bg-white p-4 mb-2 rounded border-l-4 ${v.processato ? 'border-green-500' : 'border-gray-300'}">
                <strong>${v.operatore_1}</strong> - ${new Date(v.created_at).toLocaleDateString()}<br>
                ${v.pdf_url ? `<a href="${v.pdf_url}" target="_blank" class="text-blue-500 underline text-xs">Apri PDF</a>` : 'In elaborazione...'}
            </div>
        `).join('');
    } catch (e) { container.innerHTML = "Errore storico."; }
};

window.addEventListener('load', () => {
    if (document.getElementById('dataVerifica')) document.getElementById('dataVerifica').valueAsDate = new Date();
});
