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

// NOVA FUNÇÃO DE SENHA ESTILIZADA
function verificarSenha() {
    const senhaDigitada = document.getElementById('input-senha').value;
    const erroSenha = document.getElementById('erro-senha');
    
    if (senhaDigitada === "1234") { // Troque "1234" pela sua senha desejada
        document.getElementById('modal-senha').classList.remove('active');
        carregarPainel(); // Carrega os dados apenas depois que acertar a senha
    } else {
        erroSenha.style.display = 'block'; // Mostra a mensagem de erro
        document.getElementById('input-senha').value = ''; // Limpa o campo
    }
}

function limparBusca() {
    const inputBusca = document.getElementById('input-busca');
    inputBusca.value = '';
    carregarPainel();
}

// Transformado em função Async para esperar a nuvem
async function carregarPainel(filtroTexto = '') {
    const container = document.getElementById('container-cards');
    if(!container) return; // evita erro se for chamado sem estar no painel
    
    container.innerHTML = '<p style="text-align:center; width: 100%; font-size: 1.2rem;">Carregando dados da nuvem...</p>'; 

    try {
        // Puxa as inscrições diretamente da coleção "inscricoes" no Firebase
        const snapshot = await db.collection("inscricoes").get();
        let inscricoes = [];
        
        snapshot.forEach(doc => {
            // Guarda o ID do documento do Firebase junto com os dados para usarmos depois
            inscricoes.push({ docId: doc.id, ...doc.data() });
        });

        // Ordena pela numeração do ID (ordem de cadastro)
        inscricoes.sort((a, b) => a.id - b.id);

        // Se houver algum filtro digitado, filtra pelo CÓDIGO ou pelo CPF
        if (filtroTexto !== '') {
            inscricoes = inscricoes.filter(inscricao => 
                inscricao.codigo.includes(filtroTexto) || 
                inscricao.cpf.includes(filtroTexto)
            );
        }

        container.innerHTML = ''; // Limpa o aviso de "carregando"

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
            
            // Define a classe CSS com base no status salvo
            let classeStatus = '';
            if (inscricao.status === 'Aprovado') classeStatus = 'aprovado';
            if (inscricao.status === 'Rejeitado') classeStatus = 'rejeitado';
            
            card.className = `gestor-card ${classeStatus}`;

            // <--- LÓGICA DO LIVRO E DO ID --->
            let idExibicao = inscricao.id ? inscricao.id : 'N/A';
            let badgeLivro = (inscricao.id && inscricao.id <= 50 && inscricao.status === 'Aprovado') 
                ? `<span style="background-color: #900C3F; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; margin-left: 10px; font-weight: bold;"><i class="fa-solid fa-gift"></i> Ganhou Livro!</span>` 
                : '';

            // <--- LÓGICA DO HORÁRIO DO CADASTRO --->
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
                    <!-- Passando o docId do Firebase para facilitar a atualização -->
                    <button class="btn-pagar btn-aprovar" onclick="atualizarStatus('${inscricao.docId}', 'Aprovado')">PG Realizado</button>
                    <button class="btn-pagar btn-rejeitar" onclick="atualizarStatus('${inscricao.docId}', 'Rejeitado')">PG Não Realizado</button>
                </div>
            `;
            
            container.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao puxar as inscrições do banco: ", erro);
        container.innerHTML = '<p style="text-align:center; width: 100%; font-size: 1.2rem; color: #e74c3c;">Erro ao carregar dados. Verifique sua conexão com a internet.</p>';
    }
}

// Função de atualização alterada para usar o Firestore
async function atualizarStatus(docId, novoStatus) {
    try {
        // Atualiza o documento específico na nuvem usando o docId
        await db.collection("inscricoes").doc(docId).update({
            status: novoStatus
        });
        
        // Mantém a tela filtrada se o gestor ainda estiver com algo digitado na busca, e recarrega os dados
        const termoBusca = document.getElementById('input-busca').value;
        carregarPainel(termoBusca);

    } catch (erro) {
        console.error("Erro ao atualizar status: ", erro);
        alert("Ocorreu um erro ao atualizar o status no banco de dados.");
    }
}