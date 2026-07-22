// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBrtefscvjcSnCcsse9MtRIpxMoK6TlaW0",
  authDomain: "conferencia-de-mulheres-082026.firebaseapp.com",
  projectId: "conferencia-de-mulheres-082026",
  storageBucket: "conferencia-de-mulheres-082026.firebasestorage.app",
  messagingSenderId: "633627202452",
  appId: "1:633627202452:web:4825567db615b29b343581"
};

// Ligando o Firebase e o Banco de Dados (Firestore)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 1. Seleção dos elementos principais
const cards = document.querySelectorAll('.card');
const btnInscricao = document.getElementById('btn-inscricao');
const backButtons = document.querySelectorAll('.back-btn');

// Elementos de Cadastro
const inputNome = document.getElementById('input-nome'); 
const inputCPF = document.getElementById('input-cpf');
const inputTelefone = document.getElementById('input-telefone');
const btnIrPagamento = document.getElementById('btn-ir-pagamento');

// Elementos de Consulta e Sobre
const btnConsultaMenu = document.getElementById('btn-consulta-menu');
const btnSobre = document.getElementById('btn-sobre'); 
const btnRealizarConsulta = document.getElementById('btn-realizar-consulta');
const inputConsultaCpf = document.getElementById('consulta-cpf');

// Botões de pagamento finais
const btnPix = document.getElementById('btn-pix');
const btnCartao = document.getElementById('btn-cartao');
const btnConfirmarPix = document.getElementById('btn-confirmar-pix');
const btnConfirmarCartao = document.getElementById('btn-confirmar-cartao');

// Variável de controle para envio único
let inscricaoJaEnviada = false;

// 2. Links de Pagamento
const LINK_CARTAO = "https://link.infinitepay.io/abhraao_wniston/VC1D-2dHpuwC7Qp-70,00"; 

// --- FUNÇÕES DO NOVO AVISO CUSTOMIZADO ---
let avisoCallback = null;

function mostrarAviso(mensagem, callback = null) {
    document.getElementById('texto-aviso').innerText = mensagem;
    document.getElementById('modal-aviso').classList.add('active');
    avisoCallback = callback; 
}

function fecharAviso() {
    document.getElementById('modal-aviso').classList.remove('active');
    
    if (avisoCallback) {
        avisoCallback();
        avisoCallback = null; 
    }
}

// --- NAVEGAÇÃO ENTRE AS TELINHAS ---
function showPage(pageId) {
    cards.forEach(card => {
        card.classList.remove('active');
        if (card.id === pageId) {
            card.classList.add('active');
        }
    });
}

btnInscricao.addEventListener('click', () => showPage('cadastro'));
btnConsultaMenu.addEventListener('click', () => showPage('consulta'));
if(btnSobre) btnSobre.addEventListener('click', () => showPage('sobre')); 

backButtons.forEach(button => {
    button.addEventListener('click', () => showPage('home'));
});

// --- MÁSCARAS E VALIDAÇÕES DE INPUT ---

// Máscara para permitir apenas letras e espaços no Nome (incluindo acentos)
if (inputNome) {
    inputNome.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]/g, '');
    });
}

function aplicarMascaraCPF(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
}

inputCPF.addEventListener('input', aplicarMascaraCPF);
inputConsultaCpf.addEventListener('input', aplicarMascaraCPF);

inputTelefone.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    e.target.value = value;
});

// --- VALIDAÇÃO PARA IR PARA A TELA DE PAGAMENTO ---
// (Atualizado para checar duplicidade no Firebase)
btnIrPagamento.addEventListener('click', async () => {
    const nome = inputNome.value.trim();
    const cpfAtual = inputCPF.value.trim();
    
    if (!nome || cpfAtual.length < 14 || inputTelefone.value.length < 14) {
        mostrarAviso("Ops! Por favor, preencha o Nome, CPF e Telefone corretamente.");
        return;
    }

    btnIrPagamento.innerHTML = "Verificando..."; // Mostra que está carregando

    try {
        // Busca no Firebase se já existe alguma inscrição com esse CPF
        const querySnapshot = await db.collection("inscricoes").where("cpf", "==", cpfAtual).get();
        
        if (!querySnapshot.empty) {
            mostrarAviso("Atenção: Este CPF já possui uma inscrição cadastrada em nosso sistema.");
            btnIrPagamento.innerHTML = "Pagamento";
            return; 
        }

        btnIrPagamento.innerHTML = "Pagamento";
        showPage('pagamento');
    } catch (erro) {
        console.error("Erro ao verificar CPF: ", erro);
        mostrarAviso("Erro ao conectar com o banco de dados. Verifique a internet e tente novamente.");
        btnIrPagamento.innerHTML = "Pagamento";
    }
});

// --- AÇÕES DOS BOTÕES DE ESCOLHA DE PAGAMENTO ---
btnCartao.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarAviso("Após concluir o pagamento, volte para o site e aperte em 'Confirmar e Acessar Cartão'. Será gerado um código referente ao seu pagamento. Guarde esse código!", () => {
        showPage('cartao-detalhes');
    });
});

btnPix.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarAviso("Após concluir o pagamento, volte para o site e aperte em 'Confirmar Pagamento'. Será gerado um código referente ao seu pagamento. Guarde esse código!", () => {
        showPage('pix-detalhes');
    });
});

// --- FUNÇÕES DE REGISTRO E CONFIRMAÇÃO ---
function gerarCodigo() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function registrarPagamentoFinal(metodo) {
    const nome = document.getElementById('input-nome').value;
    const cpf = document.getElementById('input-cpf').value;
    const telefone = document.getElementById('input-telefone').value;
    const congregacao = document.getElementById('input-congregacao').value;
    const outraIgreja = document.getElementById('input-outra').value;

    const codigoGerado = gerarCodigo();
    
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR') + ' às ' + dataAtual.toLocaleTimeString('pt-BR');

    try {
        // Pega o total de inscrições no Firebase para manter a lógica do ID e do prêmio do livro
        const snapshotTotal = await db.collection("inscricoes").get();
        const novoId = snapshotTotal.size + 1;

        const novaInscricao = {
            id: novoId,
            codigo: codigoGerado,
            nome: nome,
            cpf: cpf,
            telefone: telefone,
            igreja: congregacao || outraIgreja || "Não informada",
            metodo: metodo,
            status: 'Pendente',
            dataConfirmacao: dataFormatada 
        };

        // Salvando no Firebase com etiqueta personalizada (Nome - CPF)
        const nomeDaEtiqueta = `${nome} - ${cpf}`;
        await db.collection("inscricoes").doc(nomeDaEtiqueta).set(novaInscricao);
        
        return codigoGerado;
    } catch (erro) {
        console.error("Erro ao salvar no banco de dados: ", erro);
        mostrarAviso("Ocorreu um erro ao salvar sua inscrição. Tente novamente.");
        return null;
    }
}

function exibirTelaSucesso(codigo) {
    document.getElementById('codigo-gerado-tela').innerText = codigo;
    showPage('sucesso');
}

btnConfirmarPix.addEventListener('click', async () => {
    if (inscricaoJaEnviada) return; 
    inscricaoJaEnviada = true;
    
    btnConfirmarPix.innerHTML = "Enviando..."; 
    const codigo = await registrarPagamentoFinal('Pix');
    
    if (codigo) {
        exibirTelaSucesso(codigo);
    } else {
        inscricaoJaEnviada = false;
        btnConfirmarPix.innerHTML = "Confirmar Pagamento";
    }
});

btnConfirmarCartao.addEventListener('click', async () => {
    if (inscricaoJaEnviada) return; 
    inscricaoJaEnviada = true;
    
    btnConfirmarCartao.innerHTML = "Enviando..."; 
    const codigo = await registrarPagamentoFinal('Cartão');
    
    if (codigo) {
        window.open(LINK_CARTAO, '_blank');
        exibirTelaSucesso(codigo);
    } else {
        inscricaoJaEnviada = false;
        btnConfirmarCartao.innerHTML = "Confirmar e Acessar Cartão";
    }
});

// --- FUNÇÃO PARA COPIAR O CÓDIGO PIX ---
const btnCopiarPix = document.getElementById('btn-copiar-pix');
const inputPix = document.getElementById('pix-codigo');

if (btnCopiarPix) {
    btnCopiarPix.addEventListener('click', () => {
        inputPix.select();
        inputPix.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(inputPix.value).then(() => {
            const textoOriginal = btnCopiarPix.innerHTML;
            btnCopiarPix.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
            setTimeout(() => { btnCopiarPix.innerHTML = textoOriginal; }, 2000);
        }).catch(err => {
            mostrarAviso("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
        });
    });
}

// --- LÓGICA DE CONSULTA DA INSCRIÇÃO ---
// (Atualizado para buscar os dados diretamente do Firebase)
btnRealizarConsulta.addEventListener('click', async () => {
    const cpf = inputConsultaCpf.value.trim();

    if (cpf.length < 14) {
        mostrarAviso("Por favor, preencha o CPF completo.");
        return;
    }

    btnRealizarConsulta.innerHTML = "Buscando...";

    try {
        const querySnapshot = await db.collection("inscricoes").where("cpf", "==", cpf).get();
        const conteudoResultado = document.getElementById('conteudo-resultado');
        const botoesResultado = document.getElementById('botoes-resultado');

        if (!querySnapshot.empty) {
            let inscricaoEncontrada = null;
            // Pega os dados do primeiro documento encontrado
            querySnapshot.forEach((doc) => {
                inscricaoEncontrada = doc.data();
            });

            let corStatus = '#f1c40f'; 
            if (inscricaoEncontrada.status === 'Aprovado') corStatus = '#2ecc71'; 
            if (inscricaoEncontrada.status === 'Rejeitado') corStatus = '#e74c3c'; 
            
            // Lógica do livro na consulta 
            let avisoLivro = (inscricaoEncontrada.id && inscricaoEncontrada.id <= 50 && inscricaoEncontrada.status === 'Aprovado')
                ? `<div style="margin-top: 20px; padding: 12px; background-color: #900C3F; color: white; border-radius: 6px; text-align: center; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(144, 12, 63, 0.3);">
                     <i class="fa-solid fa-gift"></i> Parabéns! Você ganhou um livro!
                   </div>`
                : '';

            conteudoResultado.innerHTML = `
                <p style="margin-bottom: 8px;"><strong>Nome:</strong> ${inscricaoEncontrada.nome}</p>
                <p style="margin-bottom: 8px;"><strong>CPF:</strong> ${inscricaoEncontrada.cpf}</p>
                <p style="margin-bottom: 8px;"><strong>Igreja:</strong> ${inscricaoEncontrada.igreja}</p>
                <p style="margin-bottom: 8px;"><strong>Forma de Pgto:</strong> ${inscricaoEncontrada.metodo}</p>
                <p style="margin-top: 15px;"><strong>Status do Pagamento:</strong> <br>
                    <span style="display: inline-block; margin-top: 8px; background-color: ${corStatus}; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold;">
                        ${inscricaoEncontrada.status}
                    </span>
                </p>
                ${avisoLivro}
            `;
            
            botoesResultado.innerHTML = `
                <button type="button" class="btn-alt" onclick="window.location.reload()">Concluir</button>
            `;
        } else {
            // Se o Firebase não achar o CPF
            conteudoResultado.innerHTML = `
                <div style="text-align: center; color: #e74c3c; margin-bottom: 15px;">
                    <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem;"></i>
                </div>
                <p style="text-align: center; font-weight: bold; color: var(--text-color);">Nenhum registro encontrado.</p>
                <p style="text-align: center; font-size: 0.9rem; margin-top: 5px;">Verifique se o CPF foi digitado corretamente.</p>
            `;
            
            botoesResultado.innerHTML = `
                <button type="button" class="btn-alt" onclick="showPage('consulta')">Tentar Novamente</button>
                <button type="button" class="btn-action" onclick="showPage('cadastro')">Fazer Inscrição</button>
            `;
        }

        btnRealizarConsulta.innerHTML = "Consultar";
        showPage('resultado-consulta');

    } catch (erro) {
        console.error("Erro na consulta: ", erro);
        mostrarAviso("Ocorreu um erro ao consultar. Verifique sua internet.");
        btnRealizarConsulta.innerHTML = "Consultar";
    }
});
