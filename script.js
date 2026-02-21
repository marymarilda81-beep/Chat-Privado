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

// Injeta a biblioteca geradora de PDF automaticamente na página
const scriptPDF = document.createElement('script');
scriptPDF.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
document.head.appendChild(scriptPDF);

let meuNome = "";
let meuNumero = "";
let contatoAbertoAgora = null;
let historicoMensagens = [];
let meusContatos = {}; 

const senhaSecretaAdmin = "SerguioMiranda.Aluno,Html .";

// --- NÚMEROS OFICIAIS DOS BOTS (AGORA SÃO 6 SISTEMAS) ---
const BOTS = {
    GERAL: { numero: "000000", nome: "Cyber (IP)" },
    SHERLOCK: { numero: "000001", nome: "Sherlock (CNPJ)" },
    RASTREADOR: { numero: "000002", nome: "Rastreador (CEP)" },
    DOMINIO: { numero: "000003", nome: "Scanner (Site)" },
    ARQUIVOS: { numero: "000004", nome: "Arquivos>pjf< (PDF)" },
    CASOS: { numero: "000005", nome: "Mindhunter (Casos)" } // NOVO BOT!
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
// 2. SISTEMA DE SALVAR CONTA
// ==========================================
window.onload = () => {
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
    // Carrega TODOS os 6 bots direto na lista de contatos do usuário
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

    db.ref("mensagens").on("child_added", (snapshot) => {
        const dados = snapshot.val();
        
        const divLog = document.createElement("div");
        divLog.classList.add("msg-interceptada");
        divLog.innerHTML = `<span class="remetente-espião">[${dados.remetenteNome}(${dados.remetenteNumero}) -> Destino:${dados.destinatarioNumero}]</span>: ${dados.texto}`;
        document.getElementById("log-escuta").appendChild(divLog);

        if (dados.remetenteNumero === meuNumero || dados.destinatarioNumero === meuNumero) {
            historicoMensagens.push(dados);
            let numeroDoOutro = dados.remetenteNumero === meuNumero ? dados.destinatarioNumero : dados.remetenteNumero;
            let nomeDoOutro = dados.remetenteNumero === meuNumero ? "Desconhecido" : dados.remetenteNome;

            if (!meusContatos[numeroDoOutro]) {
                meusContatos[numeroDoOutro] = { nome: nomeDoOutro };
                atualizarBarraLateral();
            } else if (nomeDoOutro !== "Desconhecido" && meusContatos[numeroDoOutro].nome === "Desconhecido") {
                meusContatos[numeroDoOutro].nome = nomeDoOutro;
                atualizarBarraLateral();
            }

            if (contatoAbertoAgora === numeroDoOutro) {
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
// 4. LÓGICA DAS INTELIGÊNCIAS ARTIFICIAIS
// ==========================================
function enviarRespostaDoBot(numeroBot, nomeBot, textoResposta) {
    setTimeout(() => {
        db.ref("mensagens").push({
            remetenteNome: nomeBot,
            remetenteNumero: numeroBot,
            destinatarioNumero: meuNumero,
            texto: textoResposta,
            timestamp: Date.now()
        });
    }, 1500);
}

// IA 1: Cyber (Rastreador de IP)
async function processarIAGeral(mensagem) {
    const ip = mensagem.trim();
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) { enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, "🖥️ ERRO DE SINTAXE: Insira um endereço IPv4 válido."); return; }
    try {
        enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, `⚙️ Bypassing firewalls e rastreando o alvo: ${ip}...`);
        const response = await fetch(`https://ipwhois.app/json/${ip}`);
        const dados = await response.json();
        if (!dados.success) { enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, `❌ ERRO NA BUSCA: ${dados.message || 'Sinal blindado.'}`); return; }
        let relatorio = `🛑 **VARREDURA CONCLUÍDA: ALVO ${dados.ip}** 🛑\n\n📡 **DADOS DE REDE:**\n🔹 **ISP:** ${dados.isp}\n🔹 **Org:** ${dados.org}\n\n🌍 **GEOLOCALIZAÇÃO:**\n🔸 **País:** ${dados.country} ${dados.country_flag}\n🔸 **Região:** ${dados.region}\n🔸 **Cidade:** ${dados.city}\n\n📍 **COORDENADAS EXATAS:**\nLat: ${dados.latitude} | Lng: ${dados.longitude}\n\n`;
        const linkMapa = `https://www.google.com/maps?q=${dados.latitude},${dados.longitude}`;
        relatorio += `🗺️ <a href="${linkMapa}" target="_blank" style="color: #00ff00; text-decoration: underline;">🕵️ ABRIR RADAR NO SATÉLITE</a>`;
        enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, relatorio);
    } catch (error) { enviarRespostaDoBot(BOTS.GERAL.numero, BOTS.GERAL.nome, "❌ FALHA CRÍTICA."); }
}

// IA 2: Sherlock (CNPJ)
async function processarIASherlock(mensagem) {
    const cnpj = mensagem.replace(/\D/g, '');
    if (cnpj.length !== 14) { enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, "❌ PROTOCOLO INTERROMPIDO: Forneça um CNPJ válido."); return; }
    try {
        enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, `⏳ Iniciando varredura profunda...`);
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) throw new Error('Alvo não encontrado.');
        const dados = await response.json();
        let dossie = `🔍 **DOSSIÊ SHERLOCK v2.0** 🔍\n\n🏢 **Razão Social:** ${dados.razao_social}\n⚠️ **Situação:** ${dados.descricao_situacao_cadastral}\n💰 **Capital Social:** R$ ${dados.capital_social || '0,00'}\n\n📍 **ENDEREÇO:**\n${dados.logradouro}, Nº ${dados.numero}\nCEP: ${dados.cep} - ${dados.municipio}/${dados.uf}\n\n`;
        if (dados.qsa && dados.qsa.length > 0) { dossie += `👥 **QUADRO DE SÓCIOS:**\n`; dados.qsa.forEach(s => { dossie += `- ${s.nome_socio} (${s.qualificacao_socio})\n`; }); }
        enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, dossie);
    } catch (error) { enviarRespostaDoBot(BOTS.SHERLOCK.numero, BOTS.SHERLOCK.nome, "❌ ERRO: Alvo não encontrado."); }
}

// IA 3: Rastreador (CEP)
async function processarIARastreador(mensagem) {
    const cep = mensagem.replace(/\D/g, '');
    if (cep.length !== 8) { enviarRespostaDoBot(BOTS.RASTREADOR.numero, BOTS.RASTREADOR.nome, "🗺️ Me envie um CEP de 8 dígitos."); return; }
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await response.json();
        if (dados.erro) throw new Error();
        let resposta = `📍 **ALVO LOCALIZADO: ${dados.cep}** 📍\n\n🛣️ **Logradouro:** ${dados.logradouro}\n🏘️ **Bairro:** ${dados.bairro}\n🏙️ **Cidade:** ${dados.localidade} - ${dados.uf}\n\n`;
        const enderecoParaBusca = encodeURIComponent(`${dados.logradouro}, ${dados.bairro}, ${dados.localidade} - ${dados.uf}`);
        resposta += `🗺️ **Satélite:**\n<a href="https://www.google.com/maps?q=${enderecoParaBusca}" target="_blank" style="color: #00e5ff; text-decoration: underline;">Abrir no Google Maps</a>`;
        enviarRespostaDoBot(BOTS.RASTREADOR.numero, BOTS.RASTREADOR.nome, resposta);
    } catch (error) { enviarRespostaDoBot(BOTS.RASTREADOR.numero, BOTS.RASTREADOR.nome, "❌ ERRO: Setor não encontrado."); }
}

// IA 4: Scanner (Domínio)
async function processarIADominio(mensagem) {
    let dominio = mensagem.trim().toLowerCase().replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    if (!dominio || !dominio.includes('.')) { enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, "🌐 ALVO INVÁLIDO."); return; }
    try {
        enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, `🔎 Interceptando tráfego DNS de: ${dominio}...`);
        const response = await fetch(`https://dns.google/resolve?name=${dominio}&type=A`);
        const dados = await response.json();
        if (!dados.Answer || dados.Answer.length === 0) throw new Error();
        const ipsEncontrados = dados.Answer.filter(r => r.type === 1);
        let resposta = `🎯 **MÁSCARA DERRUBADA: ${dominio}** 🎯\n\nO servidor principal que hospeda este alvo foi exposto:\n\n`;
        ipsEncontrados.forEach((r, i) => { resposta += `🖥️ **IP Encontrado [${i + 1}]:** ${r.data}\n`; });
        enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, resposta);
    } catch (error) { enviarRespostaDoBot(BOTS.DOMINIO.numero, BOTS.DOMINIO.nome, "❌ FALHA CRÍTICA."); }
}

// IA 5: Arquivos>pjf< (Pesquisa Global com Geração de PDF)
async function processarIAArquivos(mensagem) {
    const termoBusca = mensagem.trim();
    if (!termoBusca) return;
    try {
        enviarRespostaDoBot(BOTS.ARQUIVOS.numero, BOTS.ARQUIVOS.nome, `🔎 Vasculhando o banco de dados global por: "${termoBusca}"...`);
        const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termoBusca)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Não encontrado");
        const dados = await response.json();
        if (dados.type === "disambiguation" || dados.title === "Not found") {
            enviarRespostaDoBot(BOTS.ARQUIVOS.numero, BOTS.ARQUIVOS.nome, `⚠️ ARQUIVO NÃO ESPECÍFICO: O termo "${termoBusca}" é muito genérico.`);
            return;
        }
        let dossieArquivo = `📁 **DADOS ENCONTRADOS: ${dados.title}** 📁\n\n`;
        dossieArquivo += `Os registros oficiais foram interceptados. Clique no botão abaixo para gerar o Dossiê em PDF.\n\n`;
        const tituloEncoded = encodeURIComponent(dados.title);
        const textoEncoded = encodeURIComponent(dados.extract);
        dossieArquivo += `<button onclick="gerarDossiePDF('${tituloEncoded}', '${textoEncoded}')" style="background: #ffeb3b; color: #000; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">📄 BAIXAR DOSSIÊ (PDF)</button>`;
        enviarRespostaDoBot(BOTS.ARQUIVOS.numero, BOTS.ARQUIVOS.nome, dossieArquivo);
    } catch (error) {
        enviarRespostaDoBot(BOTS.ARQUIVOS.numero, BOTS.ARQUIVOS.nome, `❌ ACESSO NEGADO: Nenhum registro oficial encontrado para "${termoBusca}".`);
    }
}

/// IA 6: Mindhunter (Busca Profunda de Casos, Extração de Suspeitos e PDF)
async function processarIACasos(mensagem) {
    const caso = mensagem.trim();
    if (!caso) return;

    try {
        enviarRespostaDoBot(BOTS.CASOS.numero, BOTS.CASOS.nome, `🚔 Diretriz Mindhunter ativada. Vasculhando a dark web e arquivos públicos pelo caso: "${caso}"...`);
        
        // Passo 1: Busca o melhor resultado possível
        const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(caso)}&utf8=&format=json&origin=*`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData.query.search || searchData.query.search.length === 0) {
            throw new Error("Nenhum registro");
        }

        const melhorResultado = searchData.query.search[0].title;

        // Passo 2: Puxa o TEXTO COMPLETO E PROFUNDO (Até 3000 caracteres)
        const textUrl = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exchars=3000&explaintext=1&titles=${encodeURIComponent(melhorResultado)}&format=json&origin=*`;
        const textResponse = await fetch(textUrl);
        const textData = await textResponse.json();
        
        const pages = textData.query.pages;
        const pageId = Object.keys(pages)[0];
        const textoLongo = pages[pageId].extract;

        // Passo 3: ALGORITMO DE EXTRAÇÃO (Acha os nomes dos envolvidos no meio do texto)
        // Procura palavras com Iniciais Maiúsculas seguidas (ex: "Suzane von Richthofen", "Polícia Federal")
        const regexNomes = /\b[A-ZÀ-Ÿ][a-zà-ÿ]+ (?:de |da |do |e )?[A-ZÀ-Ÿ][a-zà-ÿ]+\b/g;
        let nomesBrutos = textoLongo.match(regexNomes) || [];
        
        // Filtra algumas palavras normais que começam frase para evitar falsos positivos
        const ignorar = ["Neste", "Nesta", "Para", "Como", "Quando", "Segundo", "Além", "Isso", "Este", "Esta", "Pela", "Pelo", "Após"];
        let nomesFiltrados = [...new Set(nomesBrutos)].filter(nome => !ignorar.includes(nome.split(' ')[0]));
        
        // Separa os 6 principais "Envolvidos" para o relatório do chat
        let envolvidos = nomesFiltrados.slice(0, 6);

        // Passo 4: Monta o Relatório do Chat
        let relatorio = `📁 **ARQUIVO CRIMINAL INVESTIGADO: ${melhorResultado}** 📁\n\n`;
        
        if (envolvidos.length > 0) {
            relatorio += `👥 **POSSÍVEIS ENVOLVIDOS / ENTIDADES:**\n`;
            envolvidos.forEach(nome => {
                relatorio += `▪️ ${nome}\n`;
            });
            relatorio += `\n`;
        }

        // Mostra só um pedacinho no chat para não poluir a tela
        relatorio += `📝 **RESUMO INICIAL:**\n${textoLongo.substring(0, 400)}...\n\n`;
        relatorio += `⚠️ O Dossiê completo possui informações extensas e confidenciais. Clique abaixo para extrair a cópia local.\n\n`;
        
        // Passo 5: O Botão Mágico do PDF (Codificando o texto longo para não quebrar o HTML)
        const tituloEncoded = encodeURIComponent(melhorResultado).replace(/'/g, "%27");
        const textoEncoded = encodeURIComponent(textoLongo).replace(/'/g, "%27"); 
        
        relatorio += `<button onclick="gerarDossiePDF('${tituloEncoded}', '${textoEncoded}')" style="background: #ff4c4c; color: #fff; border: 1px solid #ff0000; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">📄 BAIXAR DOSSIÊ CRIMINAL COMPLETO (PDF)</button>`;

        enviarRespostaDoBot(BOTS.CASOS.numero, BOTS.CASOS.nome, relatorio);

    } catch (error) {
        enviarRespostaDoBot(BOTS.CASOS.numero, BOTS.CASOS.nome, `❌ CASO SELADO: Não foram encontradas informações públicas detalhadas sobre "${caso}".`);
    }
}

// Função Global do PDF
window.gerarDossiePDF = function(tituloEnc, textoEnc) {
    const titulo = decodeURIComponent(tituloEnc);
    const texto = decodeURIComponent(textoEnc);
    const elementoHTML = document.createElement('div');
    elementoHTML.style.padding = "40px";
    elementoHTML.style.fontFamily = "'Courier New', Courier, monospace";
    elementoHTML.style.backgroundColor = "#050505";
    elementoHTML.style.color = "#00e5ff"; 
    
    elementoHTML.innerHTML = `
        <div style="border: 2px solid #00e5ff; padding: 30px; min-height: 800px;">
            <h1 style="text-align: center; border-bottom: 2px solid #00e5ff; padding-bottom: 20px; color: #ffeb3b; font-size: 32px;">ARQUIVO CONFIDENCIAL</h1>
            <h2 style="color: #ffffff; margin-top: 30px;">ALVO DA BUSCA: ${titulo}</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #cccccc; text-align: justify; margin-top: 20px;">${texto}</p>
            <br><br><br>
            <div style="text-align: center; border-top: 1px dashed #333; padding-top: 20px; margin-top: 50px;">
                <p style="font-size: 12px; color: #666666;">Documento classificado extraído via terminal seguro Arquivos>pjf<</p>
                <p style="font-size: 12px; color: #666666;">Data da extração: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
    `;
    
    const opt = {
        margin:       0,
        filename:     `Dossie_${titulo.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, backgroundColor: '#050505' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(elementoHTML).save();
};

// ==========================================
// 5. ENVIAR MENSAGENS E INTERFACE
// ==========================================
document.getElementById("btn-enviar").addEventListener("click", () => {
    const texto = inputMensagem.value.trim();
    if (texto !== "" && contatoAbertoAgora !== null) {
        
        db.ref("mensagens").push({
            remetenteNome: meuNome,
            remetenteNumero: meuNumero,
            destinatarioNumero: contatoAbertoAgora,
            texto: texto,
            timestamp: Date.now()
        });

        if (contatoAbertoAgora === BOTS.GERAL.numero) processarIAGeral(texto);
        else if (contatoAbertoAgora === BOTS.SHERLOCK.numero) processarIASherlock(texto);
        else if (contatoAbertoAgora === BOTS.RASTREADOR.numero) processarIARastreador(texto);
        else if (contatoAbertoAgora === BOTS.DOMINIO.numero) processarIADominio(texto);
        else if (contatoAbertoAgora === BOTS.ARQUIVOS.numero) processarIAArquivos(texto);
        else if (contatoAbertoAgora === BOTS.CASOS.numero) processarIACasos(texto); // Aciona o novo bot de casos

        inputMensagem.value = "";
    }
});
inputMensagem.addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("btn-enviar").click(); });

document.getElementById("btn-add-contato").addEventListener("click", () => {
    const num = document.getElementById("input-novo-contato").value.trim();
    if (num.length === 6 && num !== meuNumero) {
        db.ref("usuarios_online/" + num).once("value").then((snapshot) => {
            let nomeEncontrado = "Desconhecido (Offline)";
            if (snapshot.exists()) nomeEncontrado = snapshot.val().nome;
            else alert("Este usuário está offline ou não existe.");

            if (!meusContatos[num]) meusContatos[num] = { nome: nomeEncontrado };
            else meusContatos[num].nome = nomeEncontrado;
            
            atualizarBarraLateral();
            abrirConversa(num);
        });
        document.getElementById("input-novo-contato").value = "";
    } else alert("Número inválido!");
});

// A MÁGICA VISUAL ACONTECE AQUI (Robôs vs Humanos)
function atualizarBarraLateral() {
    listaContatosHTML.innerHTML = "";
    for (let numero in meusContatos) {
        let div = document.createElement("div");
        div.classList.add("contato-item");
        if (contatoAbertoAgora === numero) div.classList.add("contato-ativo");
        
        // Verifica se o número desse contato pertence a um dos nossos Bots oficiais
        const ehBot = Object.values(BOTS).some(bot => bot.numero === numero);

        if (ehBot) {
            // Estilo super tecnológico para as IAs
            div.style.borderLeft = "3px solid #00e5ff";
            div.style.backgroundColor = contatoAbertoAgora === numero ? "#1a1a1a" : "#0d0d0d";
            div.innerHTML = `<strong style="color: #00e5ff;">🤖 ${meusContatos[numero].nome}</strong> <br><small style="color: #008f9e;">SISTEMA INTELIGENTE - ${numero}</small>`;
        } else {
            // Estilo normal para os humanos (amigos)
            div.innerHTML = `<strong>👤 ${meusContatos[numero].nome}</strong> <br><small style="color: #666;">${numero}</small>`;
        }
        
        div.onclick = () => abrirConversa(numero);
        listaContatosHTML.appendChild(div);
    }
}

// ==========================================
// LÓGICA DE ABRIR, LIMPAR E EXCLUIR CONVERSA
// ==========================================
function abrirConversa(numeroDoContato) {
    contatoAbertoAgora = numeroDoContato;
    
    const ehBot = Object.values(BOTS).some(bot => bot.numero === numeroDoContato);
    const icone = ehBot ? "🤖" : "👤";
    const corTexto = ehBot ? "#00e5ff" : "#ffffff";

    nomeContatoAtivo.innerHTML = `
        Conversando com <span style="color: ${corTexto};">${icone} ${meusContatos[numeroDoContato].nome}</span> (${numeroDoContato})
        <div style="float: right; margin-top: -5px;">
            <button id="btn-limpar" style="background: transparent; color: #ffeb3b; border: 1px solid #ffeb3b; border-radius: 4px; padding: 5px 10px; cursor: pointer; margin-right: 5px; font-size: 12px; font-weight: bold;">Limpar Chat</button>
            <button id="btn-excluir" style="background: transparent; color: #ff4c4c; border: 1px solid #ff4c4c; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; font-weight: bold;">Excluir Contato</button>
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

    document.getElementById("btn-limpar").addEventListener("click", () => {
        if(confirm("ATENÇÃO: Deseja apagar permanentemente todas as mensagens com este contato?")) {
            apagarConversaNoFirebase(numeroDoContato);
            mensagensChat.innerHTML = ""; 
        }
    });

    document.getElementById("btn-excluir").addEventListener("click", () => {
        if(confirm("ATENÇÃO: Deseja excluir este contato e apagar toda a conversa?")) {
            apagarConversaNoFirebase(numeroDoContato);
            delete meusContatos[numeroDoContato];
            contatoAbertoAgora = null;
            mensagensChat.innerHTML = "";
            nomeContatoAtivo.innerHTML = "Selecione um contato para conversar";
            areaDigitacao.style.display = "none";
            atualizarBarraLateral();
        }
    });
}

function apagarConversaNoFirebase(numeroDoOutro) {
    db.ref("mensagens").once("value", snapshot => {
        snapshot.forEach(filho => {
            const msg = filho.val();
            if (
                (msg.remetenteNumero === meuNumero && msg.destinatarioNumero === numeroDoOutro) ||
                (msg.destinatarioNumero === meuNumero && msg.remetenteNumero === numeroDoOutro)
            ) {
                filho.ref.remove(); 
            }
        });
    });

    historicoMensagens = historicoMensagens.filter(msg => 
        !( (msg.remetenteNumero === meuNumero && msg.destinatarioNumero === numeroDoOutro) || 
           (msg.destinatarioNumero === meuNumero && msg.remetenteNumero === numeroDoOutro) )
    );
}

function desenharMensagemNaTela(dados) {
    const divMensagem = document.createElement("div");
    divMensagem.classList.add("mensagem");
    if (dados.remetenteNumero === meuNumero) divMensagem.classList.add("minha-mensagem");
    
    divMensagem.innerHTML = dados.texto.replace(/\n/g, '<br>');
    
    mensagensChat.appendChild(divMensagem);
    mensagensChat.scrollTop = mensagensChat.scrollHeight;
}

// ==========================================
// 6. PAINEL SECRETO ESPIÃO
// ==========================================
const entradaSecreta = document.getElementById("entrada-secreta");
const painelSecreto = document.getElementById("painel-secreto");

entradaSecreta.addEventListener("input", function() {
    const valorDigitado = entradaSecreta.value;

    if (valorDigitado === senhaSecretaAdmin) {
        if (painelSecreto.style.display === "none" || painelSecreto.style.display === "") {
            painelSecreto.style.display = "block";
            appContainer.style.filter = "blur(10px) brightness(0.5)";
        } else {
            painelSecreto.style.display = "none";
            appContainer.style.filter = "none";
        }
        entradaSecreta.value = ""; 
    }
});