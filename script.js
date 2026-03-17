// --- CONFIGURAZIONE SUPABASE ---
const SB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SB_KEY = "sb_publishable_Sq9txbu-PmKdbxETSx2cjw_WqWEFBPO"; 
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

// Variabili globali per firme e foto
let sigPad1 = null;
let sigPad2 = null;
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
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    fotoChecklist = {}; // Reset foto
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

// --- GENERAZIONE PDF (Logica interna per jsPDF) ---

async function generaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const op1 = document.getElementById('operatore_1').value;
    const op2 = document.getElementById('operatore_2').value || "Nessuno";
    const dataV = document.getElementById('dataVerifica').value;

    // Intestazione
    doc.setFontSize(18);
    doc.setTextColor(0, 74, 153);
    doc.text("REPORT VERIFICA ANTINCENDIO", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Data: ${dataV}`, 15, 30);
    doc.text(`Operatore 1: ${op1}`, 15, 35);
    doc.text(`Operatore 2: ${op2}`, 15, 40);
    
    let y = 50;

    // Ciclo su risposte
    for (const [sez, domande] of Object.entries(sezioni)) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(sez.toUpperCase().replace(/_/g, ' '), 15, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        
        domande.forEach((d, i) => {
            const id = `${sez}_q${i}`;
            const risp = document.querySelector(`input[name="${id}"]:checked`)?.value || "N.D.";
            const nota = document.getElementById(`note_${id}`).value;
            
            const testoDomanda = doc.splitTextToSize(`${i+1}. ${d}`, 160);
            doc.text(testoDomanda, 15, y);
            doc.text(risp, 180, y);
            y += (testoDomanda.length * 5);
            
            if (nota) {
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`Nota: ${nota}`, 20, y);
                y += 5;
                doc.setFontSize(10);
                doc.setTextColor(0);
            }
            y += 2;
            if (y > 275) { doc.addPage(); y = 20; }
        });
        y += 5;
    }

    // Firme
    if (y > 230) { doc.addPage(); y = 20; }
    doc.text("Firma Operatore 1:", 15, y + 10);
    doc.addImage(sigPad1.toDataURL(), 'PNG', 15, y + 15, 50, 25);
    
    if (!sigPad2.isEmpty()) {
        doc.text("Firma Operatore 2:", 110, y + 10);
        doc.addImage(sigPad2.toDataURL(), 'PNG', 110, y + 15, 50, 25);
    }

    return doc.output('blob');
}

// --- INVIO FINALE ---

window.inviaVerifica = async function() {
    const btn = document.getElementById('btnInvia');
    const op1 = document.getElementById('operatore_1').value;

    if (!op1 || sigPad1.isEmpty()) {
        alert("Attenzione: Operatore 1 e Firma 1 sono obbligatori!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "⏳ Generazione e Caricamento...";

    try {
        // 1. Genera PDF
        const pdfBlob = await generaPDF();
        const nomeFile = `verifica_${Date.now()}_${op1.replace(/\s/g, '_')}.pdf`;

        // 2. Carica su Supabase Storage
        const { data: upData, error: upErr } = await supabaseClient.storage
            .from('ai_verificheiche') // Assicurati che questo bucket esista
            .upload(nomeFile, pdfBlob);
        
        if (upErr) throw upErr;

        // 3. Ottieni URL Pubblico
        const { data: urlData } = supabaseClient.storage.from('ai_verificheiche').getPublicUrl(nomeFile);
        const publicUrl = urlData.publicUrl;

        // 4. Salva il record nel Database
        const { error: dbErr } = await supabaseClient.from('verifiche_antincendio').insert([{
            operatore_1: op1,
            operatore_2: document.getElementById('operatore_2').value,
            data_ispezione: document.getElementById('dataVerifica').value,
            pdf_url: publicUrl
        }]);

        if (dbErr) throw dbErr;

        // 5. Preparazione Email
        const subject = encodeURIComponent(`REPORT ANTINCENDIO: ${op1}`);
        const body = encodeURIComponent(`Buongiorno,\nè stato completato un nuovo report di verifica.\n\nOperatore: ${op1}\nLink al PDF: ${publicUrl}\n\nCordiali saluti.`);
        const mailTo = "geom.rip@gmail.com";
        
        alert("✅ Verifica salvata con successo nel database!");
        
        // Apre il client mail
        window.location.href = `mailto:${mailTo}?subject=${subject}&body=${body}`;

        // Reset e ritorno alla home
        setTimeout(() => { window.tornaAllaHome(); location.reload(); }, 1000);

    } catch (err) {
        console.error(err);
        alert("Errore durante il salvataggio: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "🚀 SALVA E INVIA A GEOM. RIPA";
    }
};

// --- STORICO ---

window.caricaStorico = async function() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'block';
    document.getElementById('btnHomeFisso').style.display = 'block';
    
    const container = document.getElementById('lista-verifiche');
    container.innerHTML = "<p style='text-align:center;'>Caricamento in corso...</p>";
    
    try {
        const { data, error } = await supabaseClient
            .from('verifiche_antincendio')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = "<p style='text-align:center;'>Nessuna verifica trovata.</p>";
            return;
        }

        container.innerHTML = data.map(v => `
            <div class="card-verifica" style="border-left: 5px solid #004a99; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${v.operatore_1}</strong>
                    <span style="font-size:0.8rem; color:#666;">${new Date(v.data_ispezione).toLocaleDateString()}</span>
                </div>
                <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.7rem; color:#999;">ID: ${v.id}</span>
                    <a href="${v.pdf_url}" target="_blank" style="background:#004a99; color:white; padding:5px 10px; border-radius:5px; text-decoration:none; font-size:0.8rem;">VEDI PDF 📄</a>
                </div>
            </div>
        `).join('');
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
