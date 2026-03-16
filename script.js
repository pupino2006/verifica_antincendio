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

// --- FUNZIONI DI INTERFACCIA ---

window.mostraApp = function() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'block';
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'block';
    fotoChecklist = {};
    window.renderChecklist();
    setTimeout(() => { window.initSignature(); }, 200);
    window.openTab(null, 'tab-info');
};

window.tornaAllaHome = function() {
    location.reload(); // Semplificato per resettare tutto lo stato
};

window.openTab = function(evt, tabName) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) contents[i].style.display = "none";
    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove("active");
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";
    if (tabName === 'tab-invio') setTimeout(() => { window.resizeCanvas(); }, 100);
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
                    <div style="display: flex; gap: 10px; align-items: center; margin-top:10px;">
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
            document.getElementById(`img_${id}`).src = base64;
            document.getElementById(`preview_${id}`).style.display = "block";
        };
        reader.readAsDataURL(file);
    }
};

window.rimuoviFoto = function(id) {
    delete fotoChecklist[id];
    document.getElementById(`preview_${id}`).style.display = "none";
    document.getElementById(`input_file_${id}`).value = "";
};

window.cancellaFirma = function() { if (signaturePad) signaturePad.clear(); };

window.initSignature = function() {
    const canvas = document.getElementById('signature-pad');
    if (canvas) {
        signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgba(255, 255, 255, 0)', penColor: 'rgb(0, 0, 0)' });
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
};

// --- INVIO E INTEGRAZIONE ---

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
    btn.innerText = "⏳ Invio in corso...";

    try {
        // Prepariamo la firma se presente
        const firmaBase64 = (signaturePad && !signaturePad.isEmpty()) ? signaturePad.toDataURL("image/png") : null;

        const payload = {
            operatore_1: op1,
            operatore_2: document.getElementById('operatore_2').value,
            data_verifica: dataOggiStr, 
            estintori: raccogliRisposte('estintori'),
            idranti: raccogliRisposte('idranti'),
            luci_emergenza: raccogliRisposte('luci_di_emergenza'),
            porte: raccogliRisposte('porte_tagliafuoco'),
            uscite: raccogliRisposte('vie_di_esodo'),
            processato: false
        };

        // 1. Inserimento record nel Database
        const { data, error } = await supabaseClient
            .from('verifiche_antincendio')
            .insert([payload])
            .select();

        if (error) throw error;
        const savedRecord = data[0];

        // 2. Chiamata alla Edge Function (Invio strutturato)
        // Inviamo i dati grezzi per permettere alla funzione cloud di gestire il PDF professionale
        fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                record: {
                    ...savedRecord,
                    firma_base64: firmaBase64,
                    foto_checklist: fotoChecklist
                }
            })
        }).then(res => res.json())
          .then(resData => console.log("Edge Function Response:", resData))
          .catch(err => console.error("Errore background function:", err));

        // 3. Generazione PDF locale (per download immediato nel browser)
        const pdfBlob = await generaPDF();
        const fileURL = URL.createObjectURL(pdfBlob);
        
        alert("✅ Verifica salvata! Il PDF è in fase di generazione cloud e invio email.");
        
        const link = document.createElement('a');
        link.href = fileURL;
        link.download = `Verifica_${op1.replace(/ /g, '_')}_${new Date().getTime()}.pdf`;
        link.click();

        window.tornaAllaHome();

    } catch (err) {
        console.error(err);
        alert("Errore: " + (err.message || "Problema di comunicazione."));
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
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 74, 153);
    doc.text("PANNELLI TERMICI S.R.L.", 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text("VERBALE VERIFICA ANTINCENDIO", 105, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data: ${dataOggi}`, 15, 35);
    doc.text(`Operatore: ${document.getElementById('operatore_1').value}`, 15, 42);
    
    let y = 55;
    for (const [key, domande] of Object.entries(sezioni)) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(key.toUpperCase().replace(/_/g, ' '), 15, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        
        domande.forEach((d, i) => {
            const id = `${key}_q${i}`;
            const risp = document.querySelector(`input[name="${id}"]:checked`)?.value || "N.D.";
            
            // Testo a capo se troppo lungo
            const textLines = doc.splitTextToSize(`${i+1}. ${d}`, 140);
            doc.text(textLines, 15, y);
            doc.text(risp, 170, y);
            
            y += (textLines.length * 5) + 2;
            
            if (fotoChecklist[id]) {
                doc.addImage(fotoChecklist[id], 'JPEG', 175, y - 5, 10, 10);
            }
            
            if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 5;
    }
    
    if (signaturePad && !signaturePad.isEmpty()) {
        const sigData = signaturePad.toDataURL("image/png");
        doc.text("Firma del Tecnico:", 15, y + 5);
        doc.addImage(sigData, 'PNG', 15, y + 10, 40, 15);
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
            .order('data_verifica', { ascending: false });
        if (error) throw error;
        container.innerHTML = data.map(v => `
            <div class="card-verifica" style="border-left: 5px solid ${v.processato ? '#27ae60' : '#8b98a7'};">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${v.data_verifica ? new Date(v.data_verifica).toLocaleDateString() : 'N.D.'}</strong>
                    <span>${v.operatore_1}</span>
                </div>
                ${v.pdf_url ? `<div style="margin-top:10px;"><a href="${v.pdf_url}" target="_blank" style="color:#004a99; font-size:12px;">📄 Visualizza PDF Cloud</a></div>` : '<div style="font-size:11px; color:gray; margin-top:5px;">PDF in elaborazione...</div>'}
            </div>
        `).join('');
    } catch(e) { container.innerHTML = "Errore: " + e.message; }
};

// --- INIZIALIZZAZIONE ---
window.addEventListener('load', () => {
    const di = document.getElementById('dataVerifica');
    if (di) di.valueAsDate = new Date();
});
