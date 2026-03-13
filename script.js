// --- CONFIGURAZIONE SUPABASE ---
const SB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SB_KEY = "sb_publishable_Sq9txbu-PmKdbxETSx2cjw_WqWEFBPO"; 
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

let signaturePad;
let fotoChecklist = {}; // Memorizza le immagini base64: { "sezione_q0": "data:image..." }

const sezioni = {
    estintori: [
        "Gli estintori sono segnalati da apposita cartellonistica?",
        "Gli estintori sono prontamente individuabili e facilmente accessibili?",
        "Assenza di anomalie e/o fattori di pericolo sugli estintori?",
        "Ultimo controllo effettuato non oltre sei mesi fa?"
    ],
    idranti: [
        "Gli idranti sono segnalati da apposita cartellonistica?",
        "Gli idranti sono prontamente individuabili e facilmente accessibili?",
        "Assenza di anomalie e/o fattori di pericolo sugli idranti?",
        "Ultimo controllo effettuato non oltre sei mesi fa?"
    ],
    luci_emergenza: [
        "Le luci di emergenza sono correttamente funzionanti?",
        "Assenza di anomalie e/o fattori di pericolo sulle luci?"
    ],
    porte: [
        "Le porte tagliafuoco sono segnalate e prive di ostacoli?",
        "Le prove di apertura/chiusura hanno confermato il corretto funzionamento?",
        "Assenza di anomalie (maniglioni rotti, porte chiuse a chiave)?",
        "Ultimo controllo effettuato non oltre sei mesi fa?"
    ],
    uscite: [
        "Le vie di esodo e uscite sono segnalate correttamente?",
        "I percorsi sono privi di ostacoli?",
        "Le vie di esodo sono adeguatamente illuminate?",
        "Assenza di anomalie (combustibili sui percorsi, porte bloccate)?"
    ]
};

window.onload = () => {
    const canvas = document.getElementById('signature-pad');
    signaturePad = new SignaturePad(canvas);

    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    renderChecklist();
};

function mostraApp() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'block';
    document.getElementById('tab-storico').style.display = 'none';
    document.getElementById('btnHomeFisso').style.display = 'block';
    openTab(null, 'tab-info');
}

function tornaAllaHome() {
    location.reload();
}

function openTab(evt, tabName) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) contents[i].style.display = "none";

    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove("active");

    document.getElementById(tabName).style.display = "block";
    if (evt) {
        evt.currentTarget.classList.add("active");
    } else {
        const btn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if(btn) btn.classList.add("active");
    }
}

function renderChecklist() {
    const container = document.getElementById('checklist-container');
    let html = '';
    
    for (const [key, domande] of Object.entries(sezioni)) {
        html += `<div class="sezione-titolo">${key.replace('_', ' ')}</div>`;
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
                        <button type="button" class="btn-foto" onclick="scattaFoto('${id}')">📷</button>
                    </div>
                    <div id="preview_${id}" style="margin-top:10px; display:none;">
                        <img id="img_${id}" src="" style="width:100px; border-radius:8px; border:1px solid #ddd;">
                        <button type="button" onclick="rimuoviFoto('${id}')" style="background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; cursor:pointer;">X</button>
                    </div>
                    <!-- Input nascosto per fotocamera -->
                    <input type="file" id="input_file_${id}" accept="image/*" capture="environment" style="display:none;" onchange="gestisciFoto(event, '${id}')">
                </div>
            `;
        });
    }
    container.innerHTML = html;
}

function scattaFoto(id) {
    document.getElementById(`input_file_${id}`).click();
}

function gestisciFoto(event, id) {
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
}

function rimuoviFoto(id) {
    delete fotoChecklist[id];
    document.getElementById(`preview_${id}`).style.display = "none";
    document.getElementById(`input_file_${id}`).value = "";
}

function raccogliRisposte(sezione) {
    let testoRisposte = "";
    sezioni[sezione].forEach((d, i) => {
        const val = document.querySelector(`input[name="${sezione}_q${i}"]:checked`)?.value || "N.D.";
        const nota = document.getElementById(`note_${sezione}_q${i}`).value;
        testoRisposte += `D: ${d}\nR: ${val}${nota ? ' - Note: ' + nota : ''}\n\n`;
    });
    return testoRisposte;
}

async function inviaVerifica() {
    const btn = document.getElementById('btnInvia');
    const op1 = document.getElementById('operatore_1').value;
    
    if (!op1) {
        alert("Per favore, seleziona l'Operatore 1!");
        openTab(null, 'tab-info');
        return;
    }

    btn.disabled = true;
    btn.innerText = "Invio in corso...";

    try {
        const payload = {
            operatore_1: op1,
            operatore_2: document.getElementById('operatore_2').value,
            estintori: raccogliRisposte('estintori'),
            idranti: raccogliRisposte('idranti'),
            luci_emergenza: raccogliRisposte('luci_emergenza'),
            porte: raccogliRisposte('porte'),
            uscite: raccogliRisposte('uscite'),
            created_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('verifiche_antincendio')
            .insert([payload]);

        if (error) throw error;

        const pdfBlob = await generaPDF();
        const fileURL = URL.createObjectURL(pdfBlob);
        
        alert("✅ Verifica salvata e inviata!");
        
        const link = document.createElement('a');
        link.href = fileURL;
        link.download = `Verifica_${op1}_${new Date().getTime()}.pdf`;
        link.click();

        tornaAllaHome();

    } catch (err) {
        console.error(err);
        alert("Errore: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "🚀 SALVA E GENERA PDF";
    }
}

async function generaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dataOggi = document.getElementById('dataVerifica').value;

    const imgLogo = document.querySelector('.header-logo img');
    if (imgLogo) {
        try { doc.addImage(imgLogo, 'PNG', 10, 5, 40, 15); } catch(e) {}
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 74, 153);
    doc.text("VERBALE VERIFICA ANTINCENDIO", 70, 15);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data: ${dataOggi}`, 10, 30);
    doc.text(`Operatore 1: ${document.getElementById('operatore_1').value}`, 10, 37);
    doc.text(`Operatore 2: ${document.getElementById('operatore_2').value || 'Nessuno'}`, 10, 44);

    let y = 55;

    for (const [key, domande] of Object.entries(sezioni)) {
        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFont("helvetica", "bold");
        doc.setFillColor(235, 243, 250);
        doc.rect(10, y, 190, 8, 'F');
        doc.text(key.toUpperCase().replace('_', ' '), 12, y + 6);
        y += 15;

        for (let i = 0; i < domande.length; i++) {
            const domanda = domande[i];
            const id = `${key}_q${i}`;
            const risp = document.querySelector(`input[name="${id}"]:checked`)?.value || "N.D.";
            const nota = document.getElementById(`note_${id}`).value;
            const foto = fotoChecklist[id];

            if (y > 240) { doc.addPage(); y = 20; }

            doc.setFont("helvetica", "normal");
            const splitDomanda = doc.splitTextToSize(`${i+1}. ${domanda}`, 160);
            doc.text(splitDomanda, 10, y);
            
            if(risp === "NO") doc.setTextColor(220, 0, 0);
            else doc.setTextColor(0, 100, 0);
            doc.text(risp, 180, y);
            doc.setTextColor(0, 0, 0);

            y += (splitDomanda.length * 7);

            if (nota) {
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text(`Note: ${nota}`, 15, y);
                y += 6;
                doc.setFontSize(10);
            }

            if (foto) {
                try {
                    doc.addImage(foto, 'JPEG', 15, y, 30, 30);
                    y += 35;
                } catch(e) { console.error("Errore aggiunta foto PDF", e); }
            }
            
            y += 3;
        }
        y += 5;
    }

    if (!signaturePad.isEmpty()) {
        if (y > 230) { doc.addPage(); y = 20; }
        const sigData = signaturePad.toDataURL();
        doc.setFont("helvetica", "bold");
        doc.text("Firma dell'operatore:", 10, y + 5);
        doc.addImage(sigData, 'PNG', 10, y + 8, 50, 20);
    }

    return doc.output('blob');
}

async function caricaStorico() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('tab-storico').style.display = 'block';
    document.getElementById('btnHomeFisso').style.display = 'block';
    const container = document.getElementById('lista-verifiche');
    container.innerHTML = "<p style='text-align:center;'>Caricamento archivio...</p>";
    
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
            <div class="card-verifica" style="border-left-color: #8b98a7;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${new Date(v.created_at).toLocaleDateString('it-IT')}</strong>
                    <span style="color:#004a99; font-weight:bold;">ID: ${v.id}</span>
                </div>
                <div style="margin-top:5px;">Operatore: ${v.operatore_1}</div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = "Errore: " + e.message;
    }
}