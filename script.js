// --- CONFIGURAZIONE SUPABASE ---
const SB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SB_KEY = "sb_publishable_Sq9txbu-PmKdbxETSx2cjw_WqWEFBPO"; 
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

// URL della tua Edge Function
const EDGE_FUNCTION_URL = "https://vnzrewcbnoqbqvzckome.supabase.co/functions/v1/generate-pdf-function";

// Variabili globali
let signaturePad;
let fotoChecklist = {};

const sezioni = {
    "estintori": [
        "Gli estintori sono segnalati da apposita cartellonistica?",
        "Gli estintori sono prontamente individuabili e facilmente accessibili?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sugli estintori (es. manometro al di fuori della zona verde, ammaccature e/o crepe, spina di sicurezza mancante, ecc.)?",
        "L’ultimo controllo sugli estintori da parte di ditta specializzata è stato effettuato non oltre sei mesi fa?"
    ],
    "idranti": [
        "Gli idranti sono segnalati da apposita cartellonistica?",
        "Gli idranti sono prontamente individuabili e facilmente accessibili?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sugli idranti (es. mancanza di lancia erogatrice, manichetta non correttamente avvolta, cassetta ammaccata, ecc.)?",
        "L’ultimo controllo sugli idranti da parte di ditta specializzata è stato effettuato non oltre sei mesi fa?"
    ],
    "luci_di_emergenza": [
        "Le luci di emergenza sono correttamente funzionanti in caso di mancanza di alimentazione elettrica?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sulle luci di emergenza (es. mancanza cartellonistica, malfunzionamento batterie, ecc.)?"
    ],
    "impianto_irai": [
        "I dispositivi di rilevazione automatica e i pulsanti manuali di allarme incendio sono prontamente individuabili e facilmente accessibili?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sui dispositivi dell’IRAI (es. rilevatori non adeguatamente puliti, mancata attivazione, ecc.)?"
    ],
    "porte_tagliafuoco": [
        "Le porte tagliafuoco sono correttamente segnalate da specifica cartellonistica, e priva di ostacoli alla loro apertura e/o chiusura?",
        "Le prove di aperture e/o chiusura delle porte tagliafuoco ha confermato il loro corretto funzionamento?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sulle porte tagliafuoco (es. porta chiusa a chiave, maniglione rotto, ecc.)?",
        "L’ultimo controllo sulle porte tagliafuoco da parte di ditta specializzata è stato effettuato non oltre sei mesi fa?"
    ],
    "vie_di_esodo": [
        "Le vie di esodo e le uscite di sicurezza sono segnalate mediante apposita cartellonistica?",
        "I percorsi di esodo sono privi di materiale che potrebbe fungere da ostacolo all’esodo stesso?",
        "Le vie di esodo sono adeguatamente illuminate?",
        "Si è potuta riscontrare l’ASSENZA di anomalie e/o fattori di pericolo sulle vie di esodo e le uscite di sicurezza (es. presenza di combustibili e/o infiammabili, porte non apribili, ecc.)?"
    ]
};

// --- ESPOSIZIONE GLOBALE DELLE FUNZIONI ---

window.mostraApp = function() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'block';
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    fotoChecklist = {};
    window.renderChecklist();

    setTimeout(() => {
        window.initSignature();
    }, 200);

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
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
    }

    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove("active");
    }

    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";

    if (tabName === 'tab-invio') {
        setTimeout(() => {
            window.resizeCanvas();
        }, 100);
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
                    <span class="domanda-testo">${domanda}</span>
                    <div class="opzioni-si-no">
                        <label><input type="radio" name="${id}" value="SI"> ✅ SI</label>
                        <label><input type="radio" name="${id}" value="NO"> ❌ NO</label>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <textarea class="area-note" id="note_${id}" placeholder="Note eventuali..."></textarea>
                        <button type="button" class="btn-foto" onclick="window.scattaFoto('${id}')">📷</button>
                    </div>
                    <div id="preview_${id}" style="margin-top:10px; display:none;">
                        <img id="img_${id}" src="" style="width:100px; border-radius:8px; border:1px solid #ddd;">
                        <button type="button" onclick="window.rimuoviFoto('${id}')" style="background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; cursor:pointer; vertical-align: top;">X</button>
                    </div>
                    <input type="file" id="input_file_${id}" accept="image/*" capture="environment" style="display:none;" onchange="window.gestisciFoto(event, '${id}')">
                </div>
            `;
        });
    }
    container.innerHTML = html;
};

window.scattaFoto = function(id) {
    const input = document.getElementById(`input_file_${id}`);
    if (input) input.click();
};

window.gestisciFoto = function(event, id) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            fotoChecklist[id] = base64;
            const img = document.getElementById(`img_${id}`);
            const preview = document.getElementById(`preview_${id}`);
            if (img) img.src = base64;
            if (preview) preview.style.display = "block";
        };
        reader.readAsDataURL(file);
    }
};

window.rimuoviFoto = function(id) {
    delete fotoChecklist[id];
    const preview = document.getElementById(`preview_${id}`);
    const input = document.getElementById(`input_file_${id}`);
    if (preview) preview.style.display = "none";
    if (input) input.value = "";
};

window.cancellaFirma = function() {
    if (signaturePad) signaturePad.clear();
};

window.initSignature = function() {
    const canvas = document.getElementById('signature-pad');
    if (canvas) {
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 0, 0)'
        });
        window.resizeCanvas();
    }
};

window.resizeCanvas = function() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    if (signaturePad) signaturePad.clear();
};

// --- INVIO E INTEGRAZIONE EDGE FUNCTION ---
window.inviaVerifica = async function() {
    const btn = document.getElementById('btnInvia');
    const op1 = document.getElementById('operatore_1').value;
    const dataOggiStr = document.getElementById('dataVerifica').value;
    
    if (!op1) {
        alert("Seleziona l'Operatore 1 prima di inviare!");
        window.openTab(null, 'tab-info');
        return;
    }

    btn.disabled = true;
    btn.innerText = "Invio in corso...";

    try {
        // Prepariamo i dati per il database secondo lo schema SQL
        const payload = {
            operatore_1: op1,
            operatore_2: document.getElementById('operatore_2').value,
            data_ispezione: dataOggiStr, 
            estintori: raccogliRisposte('estintori'),
            idranti: raccogliRisposte('idranti'),
            luci_emergenza: raccogliRisposte('luci_di_emergenza'),
            porte: raccogliRisposte('porte_tagliafuoco'),
            uscite: raccogliRisposte('vie_di_esodo'),
            created_at: new Date().toISOString(),
            processato: false
        };

        // 1. Inserimento record nel Database
        const { data, error } = await supabaseClient
            .from('verifiche_antincendio')
            .insert([payload])
            .select();

        if (error) throw error;

        const savedRecord = data[0];

        // 2. Chiamata alla Edge Function (Invio Email e PDF Cloud)
        fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savedRecord)
        }).catch(err => console.error("Errore background function:", err));

        // 3. Generazione PDF locale per l'utente
        const pdfBlob = await generaPDF();
        const fileURL = URL.createObjectURL(pdfBlob);
        
        alert("✅ Verifica salvata con successo!");
        
        const link = document.createElement('a');
        link.href = fileURL;
        link.download = `Verifica_${op1.replace(/ /g, '_')}_${new Date().getTime()}.pdf`;
        link.click();

        window.tornaAllaHome();

    } catch (err) {
        console.error(err);
        alert("Errore durante l'invio: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "🚀 SALVA E GENERA PDF";
    }
};

function raccogliRisposte(sezione) {
    let testo = "";
    if (!sezioni[sezione]) return "Nessuna domanda";
    
    sezioni[sezione].forEach((d, i) => {
        const val = document.querySelector(`input[name="${sezione}_q${i}"]:checked`)?.value || "N.D.";
        const nota = document.getElementById(`note_${sezione}_q${i}`).value;
        testo += `D: ${d}\nR: ${val}${nota ? ' - Note: ' + nota : ''}\n\n`;
    });
    return testo;
}

async function generaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dataOggi = document.getElementById('dataVerifica').value;

    doc.setFontSize(16);
    doc.setTextColor(0, 74, 153);
    doc.text("VERBALE VERIFICA ANTINCENDIO", 70, 15);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data: ${dataOggi}`, 10, 30);
    doc.text(`Operatore 1: ${document.getElementById('operatore_1').value}`, 10, 37);

    let y = 50;

    for (const [key, domande] of Object.entries(sezioni)) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(key.toUpperCase().replace(/_/g, ' '), 10, y);
        y += 10;
        doc.setFont("helvetica", "normal");

        for (let i = 0; i < domande.length; i++) {
            const id = `${key}_q${i}`;
            const risp = document.querySelector(`input[name="${id}"]:checked`)?.value || "N.D.";
            doc.text(`${i+1}. ${domande[i].substring(0, 70)}... : ${risp}`, 15, y);
            y += 7;
            if (y > 270) { doc.addPage(); y = 20; }
        }
        y += 5;
    }

    if (signaturePad && !signaturePad.isEmpty()) {
        const sigData = signaturePad.toDataURL("image/png");
        doc.text("Firma:", 10, y + 5);
        doc.addImage(sigData, 'PNG', 10, y + 10, 50, 20);
    }

    return doc.output('blob');
}

window.caricaStorico = async function() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'block';
    document.getElementById('btnHomeFisso').style.display = 'block';

    const container = document.getElementById('lista-verifiche');
    container.innerHTML = "<p style='text-align:center;'>Caricamento...</p>";
    
    try {
        const { data, error } = await supabaseClient
            .from('verifiche_antincendio')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        container.innerHTML = data.map(v => `
            <div class="card-verifica" style="border-left-color: ${v.processato ? '#27ae60' : '#8b98a7'};">
                <strong>${new Date(v.created_at).toLocaleDateString()}</strong> - ${v.operatore_1}
                ${v.pdf_url ? `<br><small><a href="${v.pdf_url}" target="_blank">📄 Scarica Cloud PDF</a></small>` : ''}
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = "Errore: " + e.message;
    }
};

// --- INIT ---
window.addEventListener('load', () => {
    window.renderChecklist();
    const di = document.getElementById('dataVerifica');
    if (di) di.valueAsDate = new Date();
});
