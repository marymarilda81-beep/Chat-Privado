// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE E BOTS
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC5K6P4YIHYtovdvljdZbgATExfGb2z6TU",
    authDomain: "chatglobal-fce47.firebaseapp.com",
    databaseURL: "https://chatglobal-fce47-default-rtdb.firebaseio.com",
    projectId: "chatglobal-fce47",
    storageBucket: "chatglobal-fce47.appspot.com",
    messagingSenderId: "1068026200403",
    appId: "1:1068026200403:web:c8dd567ff53b89d78821a6"
};

const GEMINI_API_KEY = "COLE_SUA_CHAVE_DO_GEMINI_AQUI"; 

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const scriptPDF = document.createElement('script');
scriptPDF.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
document.head.appendChild(scriptPDF);

let meuNome = "";
let meuNumero = "";
let contatoAbertoAgora = null;
let historicoMensagens = [];
let meusContatos = {}; 

const senhaSecretaAdmin = "SerguioMiranda.Aluno,Html .";

const BOTS = {
    GERAL: { numero: "000000", nome: "Cyber (IP)" },
    SHERLOCK: { numero: "000001", nome: "Sherlock (CNPJ)" },
    RASTREADOR: { numero: "000002", nome: "Rastreador (CEP)" },
    DOMINIO: { numero: "000003", nome: "Scanner (Site)" },
    ARQUIVOS: { numero: "000004", nome: "Arquivos>pjf< (PDF)" },
    CASOS: { numero: "000005", nome: "Mindhunter (Casos)" }
};

const telaLogin = document.getElementById("tela-login");
const appContainer = document.getElementById("app-container");
const nomePerfil = document.getElementById("nome-perfil");
const numeroPerfil = document.getElementById("numero-perfil");
const listaContatosHTML = document.getElementById("lista-contatos-lateral");
const nomeContatoAtivo = document.getElementById("nome-contato-ativo");
const mensagensChat = document.getElementById("mensagens-chat");
const areaDigitacao = document.getElementById("area-digitacao");
const inputMensagem = document.getElementById("nova-mensagem");

// ==========================================
// 2. SISTEMA DE SALVAR CONTA E INJEÇÕES
// ==========================================
window.onload = () => {
    injetarInterfaceGrupos(); 
    injetarBotaoAudio(); // Injeta o sistema de gravação de voz
    
    const salvouNome = localStorage.getItem("meuNome");
    const salvouNumero = localStorage.getItem("meuNumero");
    
    if (salvouNome && salvouNumero) {
        meuNome = salvouNome;
        meuNumero = salvouNumero;
        telaLogin.style.display = "none";
        appContainer.style.display = "flex";
        nomePerfil.innerText = meuNome;
        numeroPerfil.innerText = `Meu Nº: ${meuNumero}`;
        iniciarChat();
    }
};

document.getElementById("btn-sair").addEventListener("click", () => {
    localStorage.removeItem("meuNome");
    localStorage.removeItem("meuNumero");
    window.location.reload();
});

// ==========================================
// 3. LOGIN NOVO E INICIALIZAÇÃO
// ==========================================
document.getElementById("btn-entrar").addEventListener("click", () => {
    meuNome = document.getElementById("input-nome").value.trim();
    if (meuNome !== "") {
        meuNumero = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem("meuNome", meuNome);
        localStorage.setItem("meuNumero", meuNumero);
        telaLogin.style.display = "none";
        appContainer.style.display = "flex";
        nomePerfil.innerText = meuNome;
        numeroPerfil.innerText = `Meu Nº: ${meuNumero}`;
        iniciarChat();
    }
});

function iniciarChat() {
    meusContatos[BOTS.GERAL.numero] = { nome: BOTS.GERAL.nome };
    meusContatos[BOTS.SHERLOCK.numero] = { nome: BOTS.SHERLOCK.nome };
    meusContatos[BOTS.RASTREADOR.numero] = { nome: BOTS.RASTREADOR.nome };
    meusContatos[BOTS.DOMINIO.numero] = { nome: BOTS.DOMINIO.nome };
    meusContatos[BOTS.ARQUIVOS.numero] = { nome: BOTS.ARQUIVOS.nome };
    meusContatos[BOTS.CASOS.numero] = { nome: BOTS.CASOS.nome };
    
    atualizarBarraLateral();

    const minhaPresencaRef = db.ref("usuarios_online/" + meuNumero);
    minhaPresencaRef.set({ nome: meuNome });
    minhaPresencaRef.onDisconnect().remove();

    db.ref("grupos").on("child_added", snapshot => {
        const grupo = snapshot.val();
        const idGrupo = snapshot.key;
        
        if (grupo.membros && grupo.membros.includes(meuNumero)) {
            meusContatos[idGrupo] = { nome: grupo.nome, isGrupo: true, membros: grupo.membros };
            atualizarBarraLateral();
        }
    });

    db.ref("mensagens").on("child_added", (snapshot) => {
        const dados = snapshot.val();
        
        const divLog = document.createElement("div");
        divLog.classList.add("msg-interceptada");
        // Verifica se é áudio para não poluir o painel do administrador com letras aleatórias
        let textoLog = dados.texto.startsWith("data:audio/") ? "[ÁUDIO INTERCEPTADO]" : dados.texto;
        divLog.innerHTML = `<span>[${dados.remetenteNome}(${dados.remetenteNumero}) -> Destino:${dados.destinatarioNumero}]</span>: ${textoLog}`;
        document.getElementById("log-escuta").appendChild(divLog);

        let ehMensagemDeGrupo = dados.destinatarioNumero.startsWith("G-");
        let estouNoGrupo = ehMensagemDeGrupo && meusContatos[dados.destinatarioNumero] && meusContatos[dados.destinatarioNumero].membros.includes(meuNumero);

        if (dados.remetenteNumero === meuNumero || dados.destinatarioNumero === meuNumero || estouNoGrupo) {
            historicoMensagens.push(dados);

            if (!ehMensagemDeGrupo) {
                let numeroDoOutro = dados.remetenteNumero === meuNumero ? dados.destinatarioNumero : dados.remetenteNumero;
                let nomeDoOutro = dados.remetenteNumero === meuNumero ? "Desconhecido" : dados.remetenteNome;

                if (!meusContatos[numeroDoOutro]) {
                    meusContatos[numeroDoOutro] = { nome: nomeDoOutro };
                    atualizarBarraLateral();
                } else if (nomeDoOutro !== "Desconhecido" && meusContatos[numeroDoOutro].nome === "Desconhecido") {
                    meusContatos[numeroDoOutro].nome = nomeDoOutro;
                    atualizarBarraLateral();
                }
            }

            let idChatDestaMensagem = ehMensagemDeGrupo ? dados.destinatarioNumero : (dados.remetenteNumero === meuNumero ? dados.destinatarioNumero : dados.remetenteNumero);

            if (contatoAbertoAgora === idChatDestaMensagem) {
                desenharMensagemNaTela(dados);
            }
        }
    });

    db.ref("usuarios_online").on("value", (snapshot) => {
        const listaUsuarios = document.getElementById("lista-usuarios");
        listaUsuarios.innerHTML = "";
        snapshot.forEach((filho) => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="status-online"></span> ${filho.val().nome} (${filho.key})`;
            listaUsuarios.appendChild(li);
        });
    });
}

// ==========================================
// 4. LÓGICA DE GRAVAR E ENVIAR ÁUDIO
// ==========================================
function injetarBotaoAudio() {
    const btnAudio = document.createElement("button");
    btnAudio.id = "btn-audio";
    btnAudio.innerHTML = "🎙️ ÁUDIO";
    btnAudio.style = "background-color: transparent; color: #ffeb3b; border: 1px solid #ffeb3b; padding: 10px 15px; margin-left: 10px; cursor: pointer; font-weight: bold; font-family: inherit; transition: 0.2s;";
    
    document.getElementById("area-digitacao").appendChild(btnAudio);

    let isRecording = false;
    let mediaRecorder;
    let audioChunks = [];

    btnAudio.onclick = async () => {
        if (contatoAbertoAgora === null) {
            alert("Selecione um contato primeiro!");
            return;
        }

        if (!isRecording) {
            try {
                // Pede permissão do microfone
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    
                    // Transforma o som num texto Base64 para salvar no Firebase
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64Audio = reader.result;
                        enviarMensagemParaServidor(base64Audio);
                    };
                    
                    // Desliga o microfone depois que parar
                    stream.getTracks().forEach(track => track.stop()); 
                };
                
                mediaRecorder.start();
                isRecording = true;
                btnAudio.innerHTML = "🛑 GRAVANDO...";
                btnAudio.style.backgroundColor = "#ff4c4c";
                btnAudio.style.color = "#fff";
                btnAudio.style.borderColor = "#ff4c4c";
            } catch (err) {
                alert("Erro ao acessar microfone. Verifique as permissões do navegador.");
            }
        } else {
            // Se já estava gravando, clica para parar e enviar
            mediaRecorder.stop();
            isRecording = false;
            btnAudio.innerHTML = "🎙️ ÁUDIO";
            btnAudio.style.backgroundColor = "transparent";
            btnAudio.style.color = "#ffeb3b";
            btnAudio.style.borderColor = "#ffeb3b";
        }
    };
}

// ==========================================
// 5. INTELIGÊNCIAS ARTIFICIAIS (MANTIDAS)
// ==========================================
function enviarRespostaDoBot(numeroBot, nomeBot, textoResposta) {
    setTimeout(() => { db.ref("mensagens").push({ remetenteNome: nomeBot, remetenteNumero: numeroBot, destinatarioNumero: meuNumero, texto: textoResposta, timestamp: Date.now() }); }, 1500);
}

async function processarIAGeral(mensagem) {
    const ip = mensagem.trim();
    if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) { enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, "🖥️ ERRO DE SINTAXE: Insira um IPv4 válido."); return; }
    try {
        enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, `⚙️ Bypassing firewalls...`);
        const response = await fetch(`https://ipwhois.app/json/${ip}`);
        const dados = await response.json();
        if (!dados.success) { enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, `❌ ERRO NA BUSCA.`); return; }
        let relatorio = `🛑 **VARREDURA: ${dados.ip}** 🛑\n\n🔹 ISP: ${dados.isp}\n🔹 Org: ${dados.org}\n🔸 País: ${dados.country}\n🔸 Cidade: ${dados.city}\n📍 Lat: ${dados.latitude} | Lng: ${dados.longitude}\n\n<a href="https://www.google.com/maps?q=${dados.latitude},${dados.longitude}" target="_blank" style="color: #00ff00;">🕵️ ABRIR SATÉLITE</a>`;
        enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, relatorio);
    } catch (error) { enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, "❌ FALHA CRÍTICA."); }
}

async function processarIASherlock(mensagem) {
    const cnpj = mensagem.replace(/\D/g, '');
    if (cnpj.length !== 14) { enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, "❌ PROTOCOLO INTERROMPIDO: CNPJ inválido."); return; }
    try {
        enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, `⏳ Iniciando varredura...`);
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) throw new Error();
        const dados = await response.json();
        let dossie = `🔍 **DOSSIÊ SHERLOCK** 🔍\n🏢 ${dados.razao_social}\n⚠️ ${dados.descricao_situacao_cadastral}\n📍 ${dados.municipio}/${dados.uf}\n\n`;
        if (dados.qsa && dados.qsa.length > 0) { dossie += `👥 **SÓCIOS:**\n`; dados.qsa.forEach(s => { dossie += `- ${s.nome_socio}\n`; }); }
        enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, dossie);
    } catch (error) { enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, "❌ ERRO."); }
}

async function processarIARastreador(mensagem) {
    const cep = mensagem.replace(/\D/g, '');
    if (cep.length !== 8) { enviarRespostaDoBot(BOTS.RASTREADOR.numero, BOTS.RASTREADOR.nome, "🗺️ CEP inválido."); return; }
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await response.json();
        if (dados.erro) throw new Error();
        let resposta = `📍 **ALVO LOCALIZADO: ${dados.cep}** 📍\n🛣️ ${dados.logradouro}\n🏘️ ${dados.bairro}\n🏙️ ${dados.localidade} - ${dados.uf}\n\n<a href="https://www.google.com/maps?q=${dados.logradouro}, ${dados.bairro}, ${dados.localidade}" target="_blank" style="color: #00e5ff;">Abrir Google Maps</a>`;
        enviarRespostaDoBot(BOTS.RASTREADOR.numero, BOTS.RASTREADOR.nome, resposta);
    } catch (error) { enviarRespostaDoBot(BOTS.RASTREADOR.numero, BOTS.RASTREADOR.nome, "❌ ERRO."); }
}

async function processarIADominio(mensagem) {
    let dominio = mensagem.trim().toLowerCase().replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    if (!dominio || !dominio.includes('.')) { enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, "🌐 ALVO INVÁLIDO."); return; }
    try {
        enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, `🔎 Interceptando DNS...`);
        const response = await fetch(`https://dns.google/resolve?name=${dominio}&type=A`);
        const dados = await response.json();
        if (!dados.Answer || dados.Answer.length === 0) throw new Error();
        let resposta = `🎯 **MÁSCARA DERRUBADA: ${dominio}** 🎯\n\n`;
        dados.Answer.filter(r => r.type === 1).forEach((r, i) => { resposta += `🖥️ **IP [${i + 1}]:** ${r.data}\n`; });
        enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, resposta);
    } catch (error) { enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, "❌ FALHA."); }
}

async function processarIAArquivos(mensagem) {
    const termoBusca = mensagem.trim();
    if (!termoBusca) return;
    try {
        enviarRespostaDoBot(BOTS.ARQUIVOS.numero, BOTS.ARQUIVOS.nome, `🔎 Vasculhando...`);
        const response = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termoBusca)}`);
        if (!response.ok) throw new Error();
        const dados = await response.json();
        if (dados.type === "disambiguation" || dados.title === "Not found") throw new Error();
        let dossieArquivo = `📁 **DADOS ENCONTRADOS: ${dados.title}** 📁\n\n<button onclick="gerarDossiePDF('${encodeURIComponent(dados.title)}', '${encodeURIComponent(dados.extract)}')" style="background: #ffeb3b; color: #000; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">📄 BAIXAR DOSSIÊ (PDF)</button>`;
        enviarRespostaDoBot(BOTS.ARQUIVOS.numero, BOTS.ARQUIVOS.nome, dossieArquivo);
    } catch (error) { enviarRespostaDoBot(BOTS.ARQUIVOS.numero, BOTS.ARQUIVOS.nome, `❌ ACESSO NEGADO.`); }
}

async function processarIACasos(mensagem) {
    const caso = mensagem.trim();
    if (!caso) return;
    try {
        enviarRespostaDoBot(BOTS.CASOS.numero, BOTS.CASOS.nome, `🚔 Vasculhando a dark web...`);
        const searchResponse = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(caso)}&utf8=&format=json&origin=*`);
        const searchData = await searchResponse.json();
        if (!searchData.query.search || searchData.query.search.length === 0) throw new Error();
        
        const textResponse = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exchars=3000&explaintext=1&titles=${encodeURIComponent(searchData.query.search[0].title)}&format=json&origin=*`);
        const textData = await textResponse.json();
        const textoLongo = textData.query.pages[Object.keys(textData.query.pages)[0]].extract;

        const regexNomes = /\b[A-ZÀ-Ÿ][a-zà-ÿ]+ (?:de |da |do |e )?[A-ZÀ-Ÿ][a-zà-ÿ]+\b/g;
        let envolvidos = [...new Set(textoLongo.match(regexNomes) || [])].filter(nome => !["Neste", "Para", "Como", "Quando", "Segundo", "Além", "Após"].includes(nome.split(' ')[0])).slice(0, 6);
        
        let relatorio = `📁 **ARQUIVO CRIMINAL: ${searchData.query.search[0].title}** 📁\n\n`;
        if (envolvidos.length > 0) { relatorio += `👥 **ENTIDADES:**\n` + envolvidos.map(n => `▪️ ${n}`).join('\n') + `\n\n`; }
        relatorio += `📝 **RESUMO:**\n${textoLongo.substring(0, 300)}...\n\n<button onclick="gerarDossiePDF('${encodeURIComponent(searchData.query.search[0].title)}', '${encodeURIComponent(textoLongo).replace(/'/g, "%27")}')" style="background: #ff4c4c; color: #fff; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">📄 BAIXAR DOSSIÊ CRIMINAL COMPLETO</button>`;
        enviarRespostaDoBot(BOTS.CASOS.numero, BOTS.CASOS.nome, relatorio);
    } catch (error) { enviarRespostaDoBot(BOTS.CASOS.numero, BOTS.CASOS.nome, `❌ CASO SELADO.`); }
}

window.gerarDossiePDF = function(tituloEnc, textoEnc) {
    const titulo = decodeURIComponent(tituloEnc);
    const texto = decodeURIComponent(textoEnc);
    const elementoHTML = document.createElement('div');
    elementoHTML.style = "padding: 40px; font-family: 'Courier New', monospace; background-color: #050505; color: #00e5ff;";
    elementoHTML.innerHTML = `<div style="border: 2px solid #00e5ff; padding: 30px; min-height: 800px;"><h1 style="text-align: center; border-bottom: 2px solid #00e5ff; padding-bottom: 20px; color: #ffeb3b;">ARQUIVO CONFIDENCIAL</h1><h2 style="color: #fff;">ALVO: ${titulo}</h2><p style="font-size: 14px; line-height: 1.6; color: #ccc; text-align: justify; margin-top: 20px;">${texto}</p></div>`;
    html2pdf().set({ margin: 0, filename: `Dossie_${titulo}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, backgroundColor: '#050505' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(elementoHTML).save();
};

// ==========================================
// 6. ENVIAR TEXTO OU ÁUDIO PARA O SERVIDOR
// ==========================================
function enviarMensagemParaServidor(conteudo) {
    if (contatoAbertoAgora !== null) {
        db.ref("mensagens").push({
            remetenteNome: meuNome,
            remetenteNumero: meuNumero,
            destinatarioNumero: contatoAbertoAgora,
            texto: conteudo,
            timestamp: Date.now()
        });

        // Se mandou texto (não áudio) para um bot, processa a inteligência
        if (!contatoAbertoAgora.startsWith("G-") && !conteudo.startsWith("data:audio/")) {
            if (contatoAbertoAgora === BOTS.GERAL.numero) processarIAGeral(conteudo);
            else if (contatoAbertoAgora === BOTS.SHERLOCK.numero) processarIASherlock(conteudo);
            else if (contatoAbertoAgora === BOTS.RASTREADOR.numero) processarIARastreador(conteudo);
            else if (contatoAbertoAgora === BOTS.DOMINIO.numero) processarIADominio(conteudo);
            else if (contatoAbertoAgora === BOTS.ARQUIVOS.numero) processarIAArquivos(conteudo);
            else if (contatoAbertoAgora === BOTS.CASOS.numero) processarIACasos(conteudo);
        }
    }
}

document.getElementById("btn-enviar").addEventListener("click", () => {
    const texto = inputMensagem.value.trim();
    if (texto !== "") {
        enviarMensagemParaServidor(texto);
        inputMensagem.value = "";
    }
});
inputMensagem.addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("btn-enviar").click(); });

// ==========================================
// 7. SISTEMA DE CONTATOS E GRUPOS
// ==========================================
document.getElementById("btn-add-contato").addEventListener("click", () => {
    const num = document.getElementById("input-novo-contato").value.trim();
    
    if (num.length === 6 && num !== meuNumero) {
        db.ref("usuarios_online/" + num).once("value").then((snapshot) => {
            if (snapshot.exists()) {
                let nomeEncontrado = snapshot.val().nome;
                meusContatos[num] = { nome: nomeEncontrado };
                atualizarBarraLateral();
                abrirConversa(num);
                document.getElementById("input-novo-contato").value = "";
            } else {
                alert("ERRO: Este número não existe ou o usuário está offline no momento.");
            }
        });
    } else {
        alert("Número inválido ou é o seu próprio número!");
    }
});

function atualizarBarraLateral() {
    listaContatosHTML.innerHTML = "";
    for (let numero in meusContatos) {
        let div = document.createElement("div");
        div.classList.add("contato-item");
        if (contatoAbertoAgora === numero) div.classList.add("contato-ativo");
        
        const ehBot = Object.values(BOTS).some(bot => bot.numero === numero);
        const ehGrupo = numero.startsWith("G-");

        if (ehBot) {
            div.style.borderLeft = "3px solid #00e5ff";
            div.style.backgroundColor = contatoAbertoAgora === numero ? "#1a1a1a" : "transparent";
            div.innerHTML = `<strong style="color: #00e5ff;">🤖 ${meusContatos[numero].nome}</strong> <br><small style="color: #008f9e;">Sistema Inteligente</small>`;
        } else if (ehGrupo) {
            div.style.borderLeft = "3px solid #ffeb3b";
            div.style.backgroundColor = contatoAbertoAgora === numero ? "#1a1a00" : "transparent";
            div.innerHTML = `<strong style="color: #ffeb3b;">👥 ${meusContatos[numero].nome}</strong> <br><small style="color: #998c22;">Grupo</small>`;
        } else {
            div.innerHTML = `<strong>👤 ${meusContatos[numero].nome}</strong> <br><small style="color: #666;">${numero}</small>`;
        }
        
        div.onclick = () => abrirConversa(numero);
        listaContatosHTML.appendChild(div);
    }
}

function abrirConversa(numeroDoContato) {
    contatoAbertoAgora = numeroDoContato;
    
    const ehBot = Object.values(BOTS).some(bot => bot.numero === numeroDoContato);
    const ehGrupo = numeroDoContato.startsWith("G-");
    
    let icone = "👤"; let corTexto = "#ffffff";
    if (ehBot) { icone = "🤖"; corTexto = "#00e5ff"; }
    else if (ehGrupo) { icone = "👥"; corTexto = "#ffeb3b"; }

    nomeContatoAtivo.innerHTML = `
        Conversando com <span style="color: ${corTexto};">${icone} ${meusContatos[numeroDoContato].nome}</span>
        <div style="float: right; margin-top: -5px;">
            <button id="btn-limpar" style="background: transparent; color: #ffeb3b; border: 1px solid #ffeb3b; padding: 5px 10px; cursor: pointer; margin-right: 5px;">LIMPAR CHAT</button>
            <button id="btn-excluir" style="background: transparent; color: #ff4c4c; border: 1px solid #ff4c4c; padding: 5px 10px; cursor: pointer;">${ehGrupo ? "SAIR DO GRUPO" : "EXCLUIR CONTATO"}</button>
        </div>
    `;

    areaDigitacao.style.display = "flex";
    atualizarBarraLateral();

    mensagensChat.innerHTML = "";
    historicoMensagens.forEach(msg => {
        if (msg.remetenteNumero === numeroDoContato || msg.destinatarioNumero === numeroDoContato) {
            desenharMensagemNaTela(msg);
        }
    });

    document.getElementById("btn-limpar").onclick = () => {
        if(confirm("Deseja apagar permanentemente todas as mensagens desta tela?")) {
            apagarConversaNoFirebase(numeroDoContato);
            mensagensChat.innerHTML = ""; 
        }
    };

    document.getElementById("btn-excluir").onclick = () => {
        if(confirm("Deseja excluir este contato?")) {
            apagarConversaNoFirebase(numeroDoContato);
            delete meusContatos[numeroDoContato];
            contatoAbertoAgora = null;
            mensagensChat.innerHTML = "";
            nomeContatoAtivo.innerHTML = "Selecione um contato para conversar";
            areaDigitacao.style.display = "none";
            atualizarBarraLateral();
        }
    };
}

function apagarConversaNoFirebase(numeroDoOutro) {
    db.ref("mensagens").once("value", snapshot => {
        snapshot.forEach(filho => {
            const msg = filho.val();
            if ((msg.remetenteNumero === meuNumero && msg.destinatarioNumero === numeroDoOutro) || (msg.destinatarioNumero === meuNumero && msg.remetenteNumero === numeroDoOutro)) {
                filho.ref.remove(); 
            }
        });
    });
    historicoMensagens = historicoMensagens.filter(msg => !( (msg.remetenteNumero === meuNumero && msg.destinatarioNumero === numeroDoOutro) || (msg.destinatarioNumero === meuNumero && msg.remetenteNumero === numeroDoOutro) ));
}

// --------------------------------------------------------
// DESENHA O PLAYER DE ÁUDIO OU O TEXTO NA TELA
// --------------------------------------------------------
function desenharMensagemNaTela(dados) {
    const divMensagem = document.createElement("div");
    divMensagem.classList.add("mensagem");
    
    let corpoDaMensagem = "";

    // MÁGICA DO ÁUDIO AQUI: Se o texto for um Base64 de áudio, ele vira um player!
    if (dados.texto && dados.texto.startsWith("data:audio/")) {
        corpoDaMensagem = `<audio controls src="${dados.texto}" style="height: 40px; outline: none; margin-top: 5px; max-width: 100%; border-radius: 20px;"></audio>`;
    } else {
        corpoDaMensagem = dados.texto.replace(/\n/g, '<br>');
    }

    let conteudoHtmlFinal = "";

    if (dados.remetenteNumero === meuNumero) {
        divMensagem.classList.add("minha-mensagem");
        conteudoHtmlFinal = corpoDaMensagem;
    } else {
        if (dados.destinatarioNumero.startsWith("G-")) {
            conteudoHtmlFinal = `<span style="color:#ffeb3b; font-size:11px; display:block; margin-bottom:5px; border-bottom:1px solid #333; padding-bottom:2px;">${dados.remetenteNome}</span>`;
        }
        conteudoHtmlFinal += corpoDaMensagem;
    }
    
    divMensagem.innerHTML = conteudoHtmlFinal;
    mensagensChat.appendChild(divMensagem);
    mensagensChat.scrollTop = mensagensChat.scrollHeight;
}

// ==========================================
// 8. PAINEL SECRETO ESPIÃO E MODAL DE GRUPO
// ==========================================
const entradaSecreta = document.getElementById("entrada-secreta");
const painelSecreto = document.getElementById("painel-secreto");

entradaSecreta.addEventListener("input", function() {
    if (entradaSecreta.value === senhaSecretaAdmin) {
        painelSecreto.style.display = (painelSecreto.style.display === "none" || painelSecreto.style.display === "") ? "block" : "none";
        appContainer.style.filter = painelSecreto.style.display === "block" ? "blur(10px) brightness(0.5)" : "none";
        entradaSecreta.value = ""; 
    }
});

function injetarInterfaceGrupos() {
    const btnNovoGrupo = document.createElement("button");
    btnNovoGrupo.innerText = "👥 NOVO GRUPO";
    btnNovoGrupo.style = "background-color: #111; color: #ffeb3b; border: 1px dashed #ffeb3b; padding: 15px; margin: 10px; cursor: pointer; font-family: 'Share Tech Mono', monospace; font-weight: bold; transition: 0.2s; font-size: 14px;";
    btnNovoGrupo.onmouseover = () => { btnNovoGrupo.style.backgroundColor = "#ffeb3b"; btnNovoGrupo.style.color = "#000"; };
    btnNovoGrupo.onmouseout = () => { btnNovoGrupo.style.backgroundColor = "#111"; btnNovoGrupo.style.color = "#ffeb3b"; };
    document.getElementById("barra-lateral").insertBefore(btnNovoGrupo, document.getElementById("lista-contatos-lateral"));

    const modalHTML = `
    <div id="modal-grupo" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index: 3000; align-items:center; justify-content:center;">
        <div style="background:#0a0a0a; border:2px solid #ffeb3b; padding:30px; width:400px; color:#fff; font-family:'Share Tech Mono', monospace; box-shadow: 0 0 30px rgba(255, 235, 59, 0.2);">
            <h2 style="color:#ffeb3b; text-align:center; border-bottom:1px dashed #ffeb3b; padding-bottom:10px; letter-spacing: 2px; margin-top:0;">CRIAR GRUPO</h2>
            <input type="text" id="input-nome-grupo" placeholder="NOME DO GRUPO" style="width:100%; box-sizing:border-box; padding:15px; margin-top:15px; margin-bottom:15px; background:#000; color:#ffeb3b; border:1px solid #333; outline:none; font-family:inherit; text-align:center; text-transform:uppercase; font-size: 16px;">
            <h3 style="color:#aaa; font-size:14px; text-align:center;">SELECIONE OS CONTATOS:</h3>
            <div id="lista-agentes-grupo" style="max-height:200px; overflow-y:auto; border:1px solid #222; padding:10px; margin-bottom:20px; background:#020202;"></div>
            <div style="display:flex; justify-content:space-between;">
                <button id="btn-cancelar-grupo" style="background:transparent; color:#ff4c4c; border:1px solid #ff4c4c; padding:12px; cursor:pointer; font-family:inherit; width:48%; font-weight:bold;">CANCELAR</button>
                <button id="btn-salvar-grupo" style="background:#ffeb3b; color:#000; border:1px solid #ffeb3b; padding:12px; cursor:pointer; font-family:inherit; font-weight:bold; width:48%;">CRIAR</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    btnNovoGrupo.onclick = () => {
        const listaDiv = document.getElementById("lista-agentes-grupo");
        listaDiv.innerHTML = "";
        let temContato = false;

        for(let num in meusContatos) {
            const isBot = Object.values(BOTS).some(b => b.numero === num);
            const isGrupoExistent = num.startsWith("G-");
            
            if(!isBot && !isGrupoExistent && num !== meuNumero) {
                temContato = true;
                listaDiv.innerHTML += `<label style="display:flex; align-items:center; padding:10px; border-bottom:1px dashed #222; cursor:pointer;"><input type="checkbox" class="chk-agente" value="${num}" style="margin-right:10px; width: 16px; height: 16px;">${meusContatos[num].nome} (${num})</label>`;
            }
        }

        if(!temContato) listaDiv.innerHTML = "<p style='color:#ff4c4c; text-align:center; font-size:14px;'>Nenhum contato disponível. Adicione seus amigos primeiro!</p>";
        document.getElementById("modal-grupo").style.display = "flex";
    };

    document.getElementById("btn-cancelar-grupo").onclick = () => { document.getElementById("modal-grupo").style.display = "none"; document.getElementById("input-nome-grupo").value = ""; };

    document.getElementById("btn-salvar-grupo").onclick = () => {
        const nome = document.getElementById("input-nome-grupo").value.trim().toUpperCase();
        const checkboxes = document.querySelectorAll(".chk-agente:checked");
        
        if(nome === "") return alert("Dê um nome ao Grupo!");
        if(checkboxes.length === 0) return alert("Selecione pelo menos 1 contato para participar!");

        const membros = [meuNumero];
        checkboxes.forEach(chk => membros.push(chk.value));

        const idGrupo = "G-" + Math.floor(100000 + Math.random() * 900000);

        db.ref("grupos/" + idGrupo).set({ nome: nome, membros: membros, criador: meuNumero, timestamp: Date.now() });

        document.getElementById("modal-grupo").style.display = "none";
        document.getElementById("input-nome-grupo").value = "";
        setTimeout(() => { abrirConversa(idGrupo); }, 500);
    };
}
