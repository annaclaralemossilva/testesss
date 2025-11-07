// Inicialização quando o DOM é carregado
document.addEventListener("DOMContentLoaded", function () {
    
    const form = document.getElementById("fornecedor-form");
    if (form) {
        form.addEventListener("submit", cadastrarFornecedor);
    }

    // Esconder o campo ID inicialmente
    const idInput = document.getElementById("id");
    if (idInput) {
        idInput.style.display = "none";
    }

    // Formatação do CNPJ
    const campoCnpj = document.getElementById("cnpj");
    if (campoCnpj) {
        campoCnpj.addEventListener("keypress", () => {
            let tamanhoCampo = campoCnpj.value.length;
            if (tamanhoCampo == 2 || tamanhoCampo == 6) {
                campoCnpj.value += ".";
            } else if (tamanhoCampo == 10) {
                campoCnpj.value += "/";
            } else if (tamanhoCampo == 15) {
                campoCnpj.value += "-";
            }
        });
    }
});

async function cadastrarFornecedor(event) {
    event.preventDefault();

    let nome_fornecedor = document.getElementById("nome").value;
    let endereco_fornecedor = {
        cep: document.getElementById("cep").value,
        rua: document.getElementById("rua").value,
        bairro: document.getElementById("bairro").value,
        cidade: document.getElementById("cidade").value,
        uf: document.getElementById("uf").value,
        ibge: document.getElementById("ibge").value,
        numero: document.getElementById("numero").value,
        referencia: document.getElementById("referencia").value
    };

    const fornecedor = {
        nome: nome_fornecedor,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("email").value,
        cnpj: document.getElementById("cnpj").value,
        endereco: endereco_fornecedor
    };

    try {
        const response = await fetch("/fornecedores", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(fornecedor),
        });

        const result = await response.json();
        if (response.ok) {
            alert("Fornecedor cadastrado com sucesso!");
            document.getElementById("fornecedor-form").reset();
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (err) {
        console.error("Erro na solicitação:", err);
        alert("Erro ao cadastrar fornecedor.");
    }
}

// Função para listar todos os fornecedores ou buscar fornecedores /por CNPJ
async function listarFornecedores() {
    const cnpj = document.getElementById("cnpj").value.trim(); // Pega o valor do CNPJ digitado no input

    let url = "/fornecedores"; // URL padrão para todos os fornecedores

    if (cnpj) {
        // Se Cnpj foi digitado, adiciona o parâmetro de consulta
        url += `?cnpj=${cnpj}`;
    }

    try {
        const response = await fetch(url);
        const fornecedores = await response.json();

        const tabela = document.getElementById("tabela-fornecedores");
        tabela.innerHTML = ""; // Limpa a tabela antes de preencher

        if (fornecedores.length === 0) {
            // Caso não encontre fornecedores, exibe uma mensagem
            tabela.innerHTML =
                '<tr><td colspan="6">Nenhum fornecedor encontrado.</td></tr>';
        } else {
            fornecedores.forEach(fornecedores) => {
                const linha = document.createElement("tr");
                linha.style.cursor = "pointer";
                linha.onclick = () => selecionarFornecedor(fornecedores);

                // Formata o endereço para exibição
                let enderecoFormatado = "";
                if (fornecedores.cep) {
                    enderecoFormatado = `${fornecedores.rua || ""}, ${fornecedores.numero || ""}, ${fornecedores.bairro || ""}, ${fornecedores.cidade || ""}, ${fornecedores.estado || ""}, CEP: ${fornecedores.cep || ""}`;
                }
                else {
                    enderecoFormatado = "Não informado";
                }
                
                linha.innerHTML = `
                    <td>${fornecedores.id}</td>
                    <td>${fornecedores.nome}</td>
                    <td>${fornecedores.cnpj}</td>
                    <td>${fornecedores.email}</td>
                    <td>${fornecedores.telefone}</td>
                    <td>${fornecedores.endereco}</td>
                `;
                tabela.appendChild(linha);
            };
        }
    } catch (error) {
        console.error("Erro ao listar fornecedores:", error);
    }
}

function meu_callback(conteudo) {
    if (!("erro" in conteudo)) {
        //Atualiza os campos com os valores.
        document.getElementById('rua').value=(conteudo.logradouro);
        document.getElementById('bairro').value=(conteudo.bairro);
        document.getElementById('cidade').value=(conteudo.localidade);
        document.getElementById('uf').value=(conteudo.uf);
        document.getElementById('ibge').value=(conteudo.ibge);
    } //end if.
    else {
        //CEP não Encontrado.
        limpa_formulário_cep();
        alert("CEP não encontrado.");
    }
}

function pesquisacep(valor) {

    //Nova variável "cep" somente com dígitos.
    var cep = valor.replace(/\D/g, '');

    //Verifica se campo cep possui valor informado.
    if (cep != "") {

        //Expressão regular para validar o CEP.
        var validacep = /^[0-9]{8}$/;

        //Valida o formato do CEP.
        if(validacep.test(cep)) {

            //Preenche os campos com "..." enquanto consulta webservice.
            function limpa_formulário_cep() {
                document.getElementById('rua').value = '...';
                document.getElementById('bairro').value = '...';
                document.getElementById('cidade').value = '...';
                document.getElementById('uf').value = '...';
                document.getElementById('ibge').value = '...';
            }
            //Cria um elemento javascript.
            var script = document.createElement('script');

            //Sincroniza com o callback.
            script.src = 'https://viacep.com.br/ws/'+ cep + '/json/?callback=meu_callback';

            //Insere script no documento e carrega o conteúdo.
            document.body.appendChild(script);

        } //end if.
        else {
            //cep é inválido.
            limpa_formulário_cep();
            alert("Formato de CEP inválido.");
        }
    } //end if.
    else {
        //cep sem valor, limpa formulário.
        limpa_formulário_cep();
    }
};

// Função para atualizar as informações do fornecedor
async function atualizarFornecedor() {
    const nome = document.getElementById('nome').value;
    const cnpj = document.getElementById('cnpj').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;
    const cep = document.getElementById("cep").value;
    const rua = document.getElementById("rua").value;
    const bairro = document.getElementById("bairro").value;
    const cidade = document.getElementById("cidade").value;
    const uf = document.getElementById("uf").value;
    const ibge = document.getElementById("ibge").value;
    const numero = document.getElementById("numero").value;
    const referencia = document.getElementById("referencia").value

    // Verifique se os dados estão sendo capturados corretamente
    console.log("Dados do fornecedor para atualização:", {
        nome,
        cnpj,
        email,
        telefone,
        endereco: {
            cep,
            rua,
            bairro,
            cidade,
            uf,
            ibge,
            numero,
            referencia
        }
    });

    const fornecedorAtualizado = {
        nome,
        email,
        telefone,
        endereco: {
            cep,
            rua,
            bairro,
            cidade,
            uf,
            ibge,
            numero,
            referencia
        }
    };

    try {
        const response = await fetch(`/fornecedores/cnpj/${dnpj}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fornecedorAtualizado)
        });

        if (response.ok) {
            alert('Fornecedor atualizado com sucesso!');
            limpaFornecedor();
            listarFornecedores(); // Recarrega a lista após atualizar
        } else {
            const errorMessage = await response.text();
            alert('Erro ao atualizar fornecedor: ' + errorMessage);
        }
    } catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        alert('Erro ao atualizar Fornecedor.');
    }
}

function limpaFornecedor() {
    document.getElementById("nome").value = "";
    document.getElementById("cnpj").value = "";
    document.getElementById("email").value = "";
    document.getElementById("telefone").value = "";
    document.getElementById("cep").value = "";
    document.getElementById("rua").value = "";
    document.getElementById("bairro").value = "";
    document.getElementById("cidade").value = "";
    document.getElementById("uf").value = "";
    document.getElementById("ibge").value = "";
    document.getElementById("numero").value = "";
    document.getElementById("referencia").value = "";

    // Re-habilitar o campo CNPJ para permitir novos cadastros
    document.getElementById("cnpj").disabled = false;
}
// Função para selecionar fornecedor da tabela para edição
function selecionarFornecedor(fornecedor) {
    document.getElementById("nome").value = fornecedor.nome || "";
    document.getElementById("cnpj").value = fornecedor.cnpj || "";
    document.getElementById("email").value = fornecedor.email || "";
    document.getElementById("telefone").value = fornecedor.telefone || "";
    document.getElementById("cep").value = fornecedor.cep || "";
    document.getElementById("rua").value = fornecedor.rua || "";
    document.getElementById("bairro").value = fornecedor.bairro || "";
    document.getElementById("cidade").value = fornecedor.cidade || "";
    document.getElementById("uf").value = fornecedor.uf || "";
    document.getElementById("ibge").value = fornecedor.ibge || "";
    document.getElementById("numero").value = fornecedor.numero || "";
    document.getElementById("referencia").value = fornecedor.referencia || "";

    // Desabilitar o campo CNPJ durante edição para evitar problemas
    document.getElementById("cnpj").disabled = true;
}

function onChangeEmail() {
    toggleButtonsDisable();
    toggleEmailErrors();
}

function onChangePassword() {
    toggleButtonsDisable();
    togglePasswordErrors();
} 

