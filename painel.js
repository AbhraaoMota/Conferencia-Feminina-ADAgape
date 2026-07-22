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

document.addEventListener('DOMContentLoaded', () => {
    // Adiciona o evento de digitação no campo de busca para filtrar em tempo real
    const inputBusca = document.getElementById('input-busca');
    inputBusca.addEventListener('input', (e) => {
        const termoDigitado = e.target.value.trim();
        carregarPainel(termoDigitado);
    });

    // Permite apertar "Enter" para confirmar a senha
    const inputSenha = document.getElementById('input-senha');
    if(inputSenha) {
        inputSenha.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verificarSenha();
            }
        });
    }
});

function verificarSenha() {
    const senhaDigitada = document.getElementById('input-senha').value;
    const erroSenha = document.getElementById('erro-senha');
    
    if (senhaDigitada === "AD@2026") { // Troque "1234" pela sua senha desejada
        document.getElementById('modal-senha').classList.remove('active');
        carregarPainel(); 
    } else {
        erroSenha.style.display = 'block'; 
        document.getElementById('input-senha').value = ''; 
    }
}

function limparBusca() {
    const inputBusca = document.getElementById('input-busca');
    inputBusca.value = '';
    carregarPainel();
}

async function carregarPainel(filtroTexto = '') {
    const container = document.getElementById('container-cards');
    if(!container) return; 
    
    container.innerHTML = '<p style="text-align:center; width: 100%; font-size: 1.2rem;">Carregando dados da nuvem...</p>'; 

    try {
        const snapshot = await db.collection("inscricoes").get();
        let inscricoes = [];
        
        snapshot.forEach(doc => {
            inscricoes.push({ docId: doc.id, ...doc.data() });
        });

        // Ordena pela numeração do ID
        inscricoes.sort((a, b) => a.id - b.id);

        if (filtroTexto !== '') {
            inscricoes = inscricoes.filter(inscricao => 
                inscricao.codigo.includes(filtroTexto) || 
                inscricao.cpf.includes(filtroTexto) ||
                inscricao.nome.toLowerCase().includes(filtroTexto.toLowerCase()) // Permite buscar por nome também
            );
        }

        container.innerHTML = ''; 

        if (inscricoes.length === 0) {
            if (filtroTexto !== '') {
                container.innerHTML = '<p style="text-align:center; width: 100%; font-size: 1.2rem;">Nenhum registro encontrado para esta busca.</p>';
            } else {
                container.innerHTML = '<p style="text-align:center; width: 100%; font-size: 1.2rem;">Nenhuma inscrição/pagamento registrado ainda.</p>';
            }
            return;
        }

        inscricoes.forEach((inscricao) => {
            const card = document.createElement('div');
            
            let classeStatus = '';
            if (inscricao.status === 'Aprovado') classeStatus = 'aprovado';
            if (inscricao.status === 'Rejeitado') classeStatus = 'rejeitado';
            
            card.className = `gestor-card ${classeStatus}`;

            let idExibicao = inscricao.id ? inscricao.id : 'N/A';
            let badgeLivro = (inscricao.id && inscricao.id <= 50 && inscricao.status === 'Aprovado') 
                ? `<span style="background-color: #900C3F; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; margin-left: 10px; font-weight: bold;"><i class="fa-solid fa-gift"></i> Ganhou Livro!</span>` 
                : '';

            let infoData = inscricao.dataConfirmacao 
                ? `<p style="margin-top: 10px; font-size: 0.85rem; color: #555;"><i class="fa-regular fa-clock"></i> <strong>Cadastrado em:</strong> ${inscricao.dataConfirmacao}</p>` 
                : '';

            card.innerHTML = `
                <h4 style="margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
                    ID da Inscrição: #${idExibicao} ${badgeLivro}
                </h4>
                <p><strong>Nome:</strong> ${inscricao.nome}</p>
                <p><strong>CPF:</strong> ${inscricao.cpf}</p>
                <p><strong>Telefone:</strong> ${inscricao.telefone}</p>
                <p><strong>Igreja:</strong> ${inscricao.igreja}</p>
                <p><strong>Método:</strong> ${inscricao.metodo}</p>
                <p><strong>Status atual:</strong> ${inscricao.status}</p>
                
                ${infoData}
                
                <div class="codigo-destaque">#${inscricao.codigo}</div>
                
                <div class="acoes-gestor">
                    <button class="btn-pagar btn-aprovar" onclick="atualizarStatus('${inscricao.docId}', 'Aprovado')">Aprovar</button>
                    <button class="btn-pagar btn-rejeitar" onclick="atualizarStatus('${inscricao.docId}', 'Rejeitado')">Rejeitar</button>
                    <!-- NOVO BOTÃO DE EXCLUIR -->
                    <button class="btn-pagar btn-excluir" onclick="excluirInscricao('${inscricao.docId}')"><i class="fa-solid fa-trash"></i> Excluir</button>
                </div>
            `;
            
            container.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao puxar as inscrições do banco: ", erro);
        container.innerHTML = '<p style="text-align:center; width: 100%; font-size: 1.2rem; color: #e74c3c;">Erro ao carregar dados. Verifique sua conexão com a internet.</p>';
    }
}

async function atualizarStatus(docId, novoStatus) {
    try {
        await db.collection("inscricoes").doc(docId).update({
            status: novoStatus
        });
        
        const termoBusca = document.getElementById('input-busca').value;
        carregarPainel(termoBusca);
    } catch (erro) {
        console.error("Erro ao atualizar status: ", erro);
        alert("Ocorreu um erro ao atualizar o status no banco de dados.");
    }
}

// --- NOVA FUNÇÃO DE EXCLUIR INSCRIÇÃO ---
async function excluirInscricao(docId) {
    // Pede confirmação antes de apagar
    const confirmacao = confirm("Tem certeza absoluta que deseja excluir esta inscrição? Esta ação não pode ser desfeita.");
    
    if (confirmacao) {
        try {
            await db.collection("inscricoes").doc(docId).delete();
            alert("Inscrição excluída com sucesso!");
            
            // Recarrega o painel após apagar
            const termoBusca = document.getElementById('input-busca').value;
            carregarPainel(termoBusca);
        } catch (erro) {
            console.error("Erro ao excluir inscrição: ", erro);
            alert("Ocorreu um erro ao excluir a inscrição do banco de dados.");
        }
    }
}

// --- NOVA FUNÇÃO DE GERAR PDF ---
async function gerarPDF() {
    try {
        // Mostra que está carregando enquanto baixa do Firebase
        const btnPdf = document.querySelector('button[onclick="gerarPDF()"]');
        const textoOriginalBotao = btnPdf.innerHTML;
        btnPdf.innerHTML = "Gerando PDF...";
        
        // Puxa as informações da nuvem
        const snapshot = await db.collection("inscricoes").get();
        let inscricoes = [];
        snapshot.forEach(doc => inscricoes.push(doc.data()));
        
        // Ordena as inscrições por ID numérico
        inscricoes.sort((a, b) => a.id - b.id);

        // Prepara os dados da tabela
        let linhasTabela = [];
        inscricoes.forEach(inc => {
            // Verifica se a pessoa ganhou o livro (ID de 1 a 50 E status Aprovado)
            let ganhouLivro = (inc.id && inc.id <= 50 && inc.status === 'Aprovado') ? 'Sim' : 'Não';
            
            linhasTabela.push([
                inc.id || '-',
                inc.nome,
                inc.cpf,
                inc.telefone,
                inc.status,
                ganhouLivro
            ]);
        });

        // Configuração do PDF usando jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título do PDF
        doc.setFontSize(16);
        doc.setTextColor(144, 12, 63); // Cor var(--text-color) do seu site
        doc.text("Lista de Inscrições - Conferência de Mulheres", 14, 15);
        
        // Adiciona a Data de Geração
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);

        // Cria a Tabela
        doc.autoTable({
            startY: 28,
            head: [['ID', 'Nome', 'CPF', 'Telefone', 'Status', 'Ganhou Livro?']],
            body: linhasTabela,
            headStyles: { fillColor: [144, 12, 63], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [255, 240, 245] }, // Cor var(--bg-color) suave
            styles: { fontSize: 9 }
        });

        // Salva e Baixa o PDF
        doc.save("inscricoes-conferencia.pdf");
        
        // Restaura o botão
        btnPdf.innerHTML = textoOriginalBotao;

    } catch (erro) {
        console.error("Erro ao gerar PDF: ", erro);
        alert("Ocorreu um erro ao gerar a lista em PDF. Verifique a internet e tente novamente.");
        document.querySelector('button[onclick="gerarPDF()"]').innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar PDF';
    }
}
