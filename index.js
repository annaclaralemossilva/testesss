const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.static("pub"));
app.use(bodyParser.json());

const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite.");
    }
});

// criação das tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    cpf TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL,
                    telefone TEXT NOT NULL
                  )
                `); // Adicionado a crição da tabela clientes

    db.run(`CREATE TABLE IF NOT EXISTS fornecedores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    cnpj TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL,
                    telefone TEXT NOT NULL
                    )
                `); // Adicionado a criação da tabela fornecedores

    db.run(`
                    CREATE TABLE IF NOT EXISTS produtos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT NOT NULL,
                        preco REAL NOT NULL,
                        quantidade_estoque INTEGER NOT NULL,
                        tipo TEXT NOT NULL,
                        descricao TEXT NOT NULL,
                        fornecedor_id INTEGER,
                        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
                    )
                    `); // Adicionado a criação da tabela produtos

    db.run(`
                        CREATE TABLE IF NOT EXISTS funcao(
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nomefun TEXT NOT NULL,
                            descricao TEXT NOT NULL,
                            salario REAL NOT NULL,
                            carga_horaria INTEGER NOT NULL
                        )
                    `); // Adicionado a criação da tabela funcao

    db.run(`
                        CREATE TABLE IF NOT EXISTS funcionarios (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nome TEXT NOT NULL,
                            cpf TEXT NOT NULL UNIQUE,
                            rg TEXT NOT NULL,
                            telefone TEXT NOT NULL,
                            email TEXT NOT NULL,
                            data_nascimento TEXT NOT NULL,
                            data_contratacao TEXT NOT NULL,
                            funcao_id INTEGER,
                            FOREIGN KEY (funcao_id) REFERENCES funcao(id)
                        )
                    `); // Adicionado a criação da tabela funcionarios

    db.run(`
                        CREATE TABLE IF NOT EXISTS vendas (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            cliente_cpf TEXT NOT NULL,
                            produto_id INTEGER NOT NULL,
                            quantidade INTEGER NOT NULL,
                            data TEXT NOT NULL,
                            FOREIGN KEY (cliente_cpf) REFERENCES clientes(cpf),
                            FOREIGN KEY (produto_id) REFERENCES produtos(id)
                            )
                    `); // Adicionado a criação da tabela vendas

    db.run(`
                        CREATE TABLE IF NOT EXISTS carrinho (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            cliente_cpf TEXT NOT NULL,
                            produto_id INTEGER NOT NULL,
                            quantidade INTEGER NOT NULL,
                            data_adicao TEXT NOT NULL,
                            FOREIGN KEY (cliente_cpf) REFERENCES clientes(cpf),
                            FOREIGN KEY (produto_id) REFERENCES produtos(id)
                        )
                    `);
    // Adicionado a criação da tabela carrinho
    
    db.run(`
                        CREATE TABLE IF NOT EXISTS endereco (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            cliente_id INTEGER NOT NULL,
                            cep TEXT NOT NULL,
                            rua TEXT,
                            bairro TEXT,
                            cidade TEXT,
                            estado TEXT,
                            ibge TEXT,
                            numero TEXT,
                            referencia TEXT,
                            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
                            FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE,
                            FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE
                        )
                    `);
    // Adicionado a criação da tabela endereco

    // Adicionar colunas que podem estar faltando em tabelas existentes
    db.run(`ALTER TABLE funcionarios ADD COLUMN email TEXT`, function (err) {
        if (err && !err.message.includes("duplicate column name")) {
            console.log(
                "Coluna email já existe em funcionarios ou outro erro:",
                err.message,
            );
        }
    });

    db.run(`ALTER TABLE vendas ADD COLUMN quantidade INTEGER`, function (err) {
        if (err && !err.message.includes("duplicate column name")) {
            console.log(
                "Coluna quantidade já existe em vendas ou outro erro:",
                err.message,
            );
        }
    });

    db.run(`ALTER TABLE vendas ADD COLUMN cliente_cpf TEXT`, function (err) {
        if (err && !err.message.includes("duplicate column name")) {
            console.log(
                "Coluna cliente_cpf já existe em vendas ou outro erro:",
                err.message,
            );
        }
    });

    db.run(`ALTER TABLE vendas ADD COLUMN produto_id INTEGER`, function (err) {
        if (err && !err.message.includes("duplicate column name")) {
            console.log(
                "Coluna produto_id já existe em vendas ou outro erro:",
                err.message,
            );
        }
    });

    db.run(`ALTER TABLE vendas ADD COLUMN data TEXT`, function (err) {
        if (err && !err.message.includes("duplicate column name")) {
            console.log(
                "Coluna data já existe em vendas ou outro erro:",
                err.message,
            );
        }
    });

    console.log("Tabelas criadas com sucesso.");
});

//////////////////////////////   cliente //////////////////////////////////////////////
//////////////////////////////   cliente   //////////////////////////////////////////////
//////////////////////////////   cliente   //////////////////////////////////////////////

//cadastrar cliente 
app.post("/clientes", (req, res) => { 
    const { nome, cpf, email, telefone, endereco } = req.body; 
    
    if (!nome || !cpf) { 
        return res.status(400).json({ message: "Nome e CPF são obrigatórios." }); 
    } 
    
    // Inicia uma transação
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // Primeiro, insere o cliente
        const queryCliente = 'INSERT INTO clientes (nome, cpf, email, telefone) VALUES (?, ?, ?, ?)'; 
        db.run(queryCliente, [nome, cpf, email, telefone], function (err) {
            if (err) { 
                console.error("Erro ao cadastrar cliente:", err);
                db.run("ROLLBACK");
                return res.status(500).json({ message: "Erro ao cadastrar cliente." }); 
            }
            
            const clienteId = this.lastID; // ID do cliente inserido
            
            // Se houver dados de endereço, insere na tabela endereco
            if (endereco && endereco.cep) {
                const queryEndereco = 'INSERT INTO endereco (cliente_id, cep, rua, bairro, cidade, estado, ibge, numero, referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'; 
                db.run(queryEndereco, [
                    clienteId, 
                    endereco.cep, 
                    endereco.rua, 
                    endereco.bairro, 
                    endereco.cidade, 
                    endereco.uf, 
                    endereco.ibge, 
                    endereco.numero, 
                    endereco.referencia
                ], function (err) { 
                    if (err) {
                        console.error("Erro ao cadastrar endereço:", err);
                        db.run("ROLLBACK");
                        return res.status(500).json({ message: "Erro ao cadastrar endereço." });
                    }
                    db.run("COMMIT");
                    res.status(201).json({ 
                        id: clienteId, 
                        message: "Cliente cadastrado com sucesso."
                    });
                });
            } else {
                // Se não houver endereço, retorna sucesso apenas com o cliente
                db.run("COMMIT");
                res.status(201).json({ 
                    id: clienteId, 
                    message: "Cliente cadastrado com sucesso."
                });
            }
        }); 
    });
});
// buscar cliente por CPF específico
app.get("/clientes/:cpf", (req, res) => {
    const { cpf } = req.params;

    const query = `
        SELECT 
            c.id, c.nome, c.cpf, c.email, c.telefone,
            e.cep, e.rua, e.bairro, e.cidade, e.estado, e.ibge, e.numero, e.referencia
        FROM clientes c
        LEFT JOIN endereco e ON c.id = e.cliente_id
        WHERE c.cpf = ?
    `;
    db.get(query, [cpf], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar cliente." });
        }
        if (!row) {
            return res.status(404).json({ message: "Cliente não encontrado." });
        }
        res.json(row);
    });
});

// listar todos os clientes ou buscar por CPF
app.get("/clientes", (req, res) => {
    const cpf = req.query.cpf || ""; // Pega o CPF da query string, se existir

    let query = `
        SELECT 
            c.id, c.nome, c.cpf, c.email, c.telefone,
            e.cep, e.rua, e.bairro, e.cidade, e.estado, e.ibge, e.numero, e.referencia
        FROM clientes c
        LEFT JOIN endereco e ON c.id = e.cliente_id
    `;
    let params = [];
    
    if (cpf) {
        query += ` WHERE c.cpf = ?`;
        params.push(cpf);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar clientes." });
        }
        res.json(rows); // Retorna os clientes com os dados de endereço
    });
});

// atualizar cliente
app.put("/clientes/cpf/:cpf", (req, res) => {
    const { cpf } = req.params;
    const { nome, email, telefone, endereco } = req.body;

    // Primeiro, atualiza os dados do cliente
    const queryCliente = `UPDATE clientes SET nome = ?, email = ?, telefone = ? WHERE cpf = ?`;
    db.run(queryCliente, [nome, email, telefone, cpf], function (err) {
        if (err) {
            console.error("Erro ao atualizar cliente:", err);
            return res.status(500).json({ message: "Erro ao atualizar cliente." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Cliente não encontrado." });
        }

        // Busca o ID do cliente para atualizar o endereço
        db.get(`SELECT id FROM clientes WHERE cpf = ?`, [cpf], (err, row) => {
            if (err || !row) {
                return res.status(500).json({ message: "Erro ao buscar cliente." });
            }

            const clienteId = row.id;

            // Se houver dados de endereço, atualiza ou insere
            if (endereco && endereco.cep) {
                // Verifica se já existe um endereço para este cliente
                db.get(`SELECT id FROM endereco WHERE cliente_id = ?`, [clienteId], (err, enderecoRow) => {
                    if (enderecoRow) {
                        // Atualiza o endereço existente
                        const queryUpdateEndereco = `
                            UPDATE endereco 
                            SET cep = ?, rua = ?, bairro = ?, cidade = ?, estado = ?, ibge = ?, numero = ?, referencia = ?
                            WHERE cliente_id = ?
                        `;
                        db.run(queryUpdateEndereco, [
                            endereco.cep, 
                            endereco.rua, 
                            endereco.bairro, 
                            endereco.cidade, 
                            endereco.uf, 
                            endereco.ibge, 
                            endereco.numero, 
                            endereco.referencia,
                            clienteId
                        ], (err) => {
                            if (err) {
                                console.error("Erro ao atualizar endereço:", err);
                                return res.status(500).json({ message: "Erro ao atualizar endereço." });
                            }
                            res.json({ message: "Cliente e endereço atualizados com sucesso." });
                        });
                    } else {
                        // Insere um novo endereço
                        const queryInsertEndereco = `
                            INSERT INTO endereco (cliente_id, cep, rua, bairro, cidade, estado, ibge, numero, referencia)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        db.run(queryInsertEndereco, [
                            clienteId,
                            endereco.cep, 
                            endereco.rua, 
                            endereco.bairro, 
                            endereco.cidade, 
                            endereco.uf, 
                            endereco.ibge, 
                            endereco.numero, 
                            endereco.referencia
                        ], (err) => {
                            if (err) {
                                console.error("Erro ao inserir endereço:", err);
                                return res.status(500).json({ message: "Erro ao inserir endereço." });
                            }
                            res.json({ message: "Cliente e endereço atualizados com sucesso." });
                        });
                    }
                });
            } else {
                res.json({ message: "Cliente atualizado com sucesso." });
            }
        });
    });
});


//////////////////////////////   fornecedor   //////////////////////////////////////////////
//////////////////////////////   fornecedor   //////////////////////////////////////////////
//////////////////////////////   fornecedor   //////////////////////////////////////////////

//cadastrar fornecedor
app.post("/fornecedores", (req, res) => {
    const { nome, cnpj, email, telefone, endereco } = req.body;

    if (!nome || !cnpj) {
        return res.status(400).json({ message: "Nome e CNPJ são obrigatórios." });
    }

    // Inicia uma transação
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Primeiro, insere o fornecedor
        const queryFornecedor = 'INSERT INTO fornecedores (nome, cnpj, email, telefone) VALUES (?, ?, ?, ?)';
        db.run(queryFornecedor, [nome, cnpj, email, telefone], function (err){
            if (err){
                console.error("Erro ao cadastrar fornecedor:", err);
                db.run("ROLLBACK");
                return res.status(500).json({ message: "Erro ao cadastrar fornecedor." });
            }
            const fornecedorId = this.lastID; // ID do fornecedor inserido

            // Se houver dados de endereço, insere na tabela endereco
            if (endereco && endereco.cep){
                const queryEndereco = 'INSERT INTO endereco (fornecedor_id, cep, rua, bairro, cidade, estado, ibge, numero, referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                db.run(queryEndereco, [
                    fornecedorId,
                    endereco.cep,
                    endereco.rua,
                    endereco.bairro,
                    endereco.cidade,
                    endereco.uf, // Assumindo que o campo 'estado' do DB é preenchido com 'uf' do body
                    endereco.ibge,
                    endereco.numero,
                    endereco.referencia
                ], function (err) {
                    if (err) { // <<< CORREÇÃO: O IF DE ERRO estava faltando
                        console.error("Erro ao cadastrar endereço:", err);
                        db.run("ROLLBACK");
                        return res.status(500).json({ message: "Erro ao cadastrar endereço." });
                    }

                    // <<< CORREÇÃO: COMMIT e RESPONSE MOVIDOS PARA DENTRO DO CALLBACK DE SUCESSO
                    db.run("COMMIT"); 
                    res.status(201).json({
                        id: fornecedorId,
                        message: "Fornecedor e Endereço cadastrados com sucesso."
                    });
                }); 
            } else {
                // Se não houver endereço, faz o COMMIT e retorna sucesso apenas com o fornecedor
                db.run("COMMIT");
                res.status(201).json({
                    id: fornecedorId,
                    message: "Fornecedor cadastrado com sucesso (sem endereço)."
                });
            }
        }); 
    });
});

// buscar fornecedor por CNPJ específico
app.get("/fornecedores/:cnpj", (req, res) => { // <<< CORREÇÃO: Adicionado '{'
    const { cnpj } = req.params;

    const query = `
        SELECT
            f.id, f.nome, f.cnpj, f.email, f.telefone,
            e.cep, e.rua, e.bairro, e.cidade, e.estado, e.ibge, e.numero, e.referencia
        FROM fornecedores f
        LEFT JOIN endereco e ON f.id = e.fornecedor_id
        WHERE f.cnpj = ?
        `;
    db.get(query, [cnpj], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar fornecedor." });
        }
        if (!row) {
            return res.status(404).json({ message: "Fornecedor não encontrado." });
        }
        // Tratamento dos dados para melhorar a estrutura (opcional)
        const fornecedor = {
            id: row.id,
            nome: row.nome,
            cnpj: row.cnpj,
            email: row.email,
            telefone: row.telefone,
            endereco: row.cep ? {
                cep: row.cep,
                rua: row.rua,
                bairro: row.bairro,
                cidade: row.cidade,
                estado: row.estado,
                ibge: row.ibge,
                numero: row.numero,
                referencia: row.referencia
            } : null // Retorna null se não houver endereço
        };
        res.json(fornecedor); // Retorna o objeto reestruturado
    });
});

// listar todos os fornecedores ou buscar por CNPJ
app.get("/fornecedores", (req, res) => {
    const cnpj = req.query.cnpj || "";

    let query = `
        SELECT
            f.id, f.nome, f.cnpj, f.email, f.telefone,
            e.cep, e.rua, e.bairro, e.cidade, e.estado, e.ibge, e.numero, e.referencia
        FROM fornecedores f
        LEFT JOIN endereco e ON f.id = e.fornecedor_id
    `;

    let params = [];

    if (cnpj){
        query += ` WHERE f.cnpj = ?`;
        params.push(cnpj);
    }
    db.all(query, [], (err, rows) => {
        if (err) {
            return res
                .status(500)
                .json({ message: "Erro ao listar fornecedores." });
        }
        res.json(rows);
    });
});

//atualizar fornecedor
app.put("/fornecedores/cnpj/:cnpj", (req, res) => {
    const { cnpj } = req.params;
    const { nome, email, telefone, endereco } = req.body;

    db.serialize(() => {
        // Primeiro, atualiza os dados do fornecedor
        const queryFornecedor = `UPDATE fornecedores SET nome = ?, email = ?, telefone = ? WHERE cnpj = ?`;
        db.run(queryFornecedor, [nome, email, telefone, cnpj], function (err) {
            if (err) {
                console.error("Erro ao atualizar fornecedor:", err);
                return res.status(500).json({ message: "Erro ao atualizar fornecedor." });             
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: "Fornecedor não encontrado." });
            }

            // Se não houver endereço, retorna sucesso e encerra aqui.
            if (!endereco || !endereco.cep) {
                 return res.json({ message: "Fornecedor atualizado com sucesso (endereço inalterado)." });
            }

            // Busca o ID do fornecedor para atualizar o endereço
            db.get(`SELECT id FROM fornecedores WHERE cnpj = ?`, [cnpj], (err, row) =>{
                if (err || !row) {
                    return res.status(500).json({ message: "Erro ao buscar fornecedor para endereço." });
                }

                const fornecedorId = row.id;

                // Verifica se já existe um endereço para este fornecedor
                db.get(`SELECT id FROM endereco WHERE fornecedor_id = ?`, [fornecedorId], (err, enderecoRow) => {
                    if (err) {
                        return res.status(500).json({ message: "Erro ao verificar endereço existente." });
                    }

                    if (enderecoRow) {
                        // Atualiza o endereço existente
                        const queryUpdateEndereco = `
                            UPDATE endereco
                            SET cep = ?, rua = ?, bairro = ?, cidade = ?, estado = ?, ibge = ?, numero = ?, referencia = ?
                            WHERE fornecedor_id = ?
                        `;
                        db.run (queryUpdateEndereco, [
                            endereco.cep,
                            endereco.rua,
                            endereco.bairro,
                            endereco.cidade,
                            endereco.uf,
                            endereco.ibge,
                            endereco.numero,
                            endereco.referencia,
                            fornecedorId
                        ], (err) => {
                            if (err) {
                                console.error("Erro ao atualizar endereço:", err);
                                return res.status(500).json({ message: "Erro ao atualizar endereço." });
                            }
                            res.json({ message: "Fornecedor e endereço atualizados com sucesso." });
                        });
                    }else {
                        // Insere um novo endereço
                        const queryInsertEndereco = `
                            INSERT INTO endereco (fornecedor_id, cep, rua, bairro, cidade, estado, ibge, numero, referencia)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        db.run(queryInsertEndereco, [
                            fornecedorId,
                            endereco.cep,
                            endereco.rua,
                            endereco.bairro,
                            endereco.cidade,
                            endereco.uf,
                            endereco.ibge,
                            endereco.numero,
                            endereco.referencia
                        ], (err) => {
                            if (err) {
                                console.error("Erro ao inserir endereço:", err);
                                return res.status(500).json({ message: "Erro ao inserir endereço." });
                            }
                            res.json({ message: "Fornecedor atualizado e novo endereço inserido com sucesso." });
                        });
                    }
                });
            });
        });
    }); 
});

/////////////////////////////  Produtos /////////////////////////////
/////////////////////////////  Produtos /////////////////////////////
/////////////////////////////  Produtos /////////////////////////////

//cadastrar produto
app.post("/produto", (req, res) => {
    const { nome, preco, quantidade_estoque, tipo, descricao, fornecedor_id } =
        req.body;
    if (
        !nome ||
        !preco ||
        !quantidade_estoque ||
        !tipo ||
        !descricao ||
        !fornecedor_id
    ) {
        return res.status(400).send("Todos os campos são obrigatórios.");
    }

    const query = `INSERT INTO produtos (nome, preco, quantidade_estoque, tipo, descricao, fornecedor_id) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(
        query,
        [nome, preco, quantidade_estoque, tipo, descricao, fornecedor_id],
        function (err) {
            if (err) {
                return res.status(500).send("Erro ao cadastrar produto.");
            }
            res.status(201).send({
                id: this.lastID,
                message: "Produto cadastrado com sucesso.",
            });
        },
    );
});

// listar todos os produtos

app.get("/produto", (req, res) => {
    const query = `SELECT * FROM produtos`;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res
                .status(500)
                .json({ message: "Erro ao listar produtos." });
        }
        res.json(rows);
    });
});

// buscar produtos para carrinho
app.get("/produtos_carrinho/:id", (req, res) => {
    const { id } = req.params;

    const query = `SELECT * FROM produtos WHERE id = ?`;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar produto." });
        }
        if (!row) {
            return res.status(404).json({ message: "Produto não encontrado." });
        }
        res.json(row);
    });
});

// atualizar produto
app.put("/produto/:id", (req, res) => {
    const { id } = req.params;
    const { nome, preco, descricao, tipo, quantidade_estoque, fornecedor_id } =
        req.body;

    const query = `UPDATE produtos SET nome = ?, preco = ?, quantidade_estoque = ?, tipo = ?, descricao = ?, fornecedor_id = ? WHERE id = ?`;
    db.run(
        query,
        [nome, preco, quantidade_estoque, tipo, descricao, fornecedor_id, id],
        function (err) {
            if (err) {
                console.error("Erro ao atualizar produto:", err);
                return res
                    .status(500)
                    .json({ message: "Erro ao atualizar produto." });
            }
            if (this.changes === 0) {
                return res
                    .status(404)
                    .json({ message: "Produto não encontrado." });
            }
            res.json({ message: "Produto atualizado com sucesso." });
        },
    );
});

// ROTA PARA BUSCAR TODOS OS FORNECEDORES PARA CADASTRAR O PRODUTO
app.get("/buscar-fornecedores", (req, res) => {
    db.all("SELECT id, nome FROM fornecedores", [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar serviços:", err);
            res.status(500).send("Erro ao buscar serviços");
        } else {
            res.json(rows); // Retorna os serviços em formato JSON
        }
    });
});

// ROTA PARA BUSCAR TODOS OS PRODUTOS PARA VENDAS
app.get("/buscar-produtos", (req, res) => {
    db.all(
        "SELECT id, nome, quantidade_estoque FROM produtos",
        [],
        (err, rows) => {
            if (err) {
                console.error("Erro ao buscar produtos:", err);
                res.status(500).send("Erro ao buscar produtos");
            } else {
                res.json(rows);
            }
        },
    );
});

///////////////////////////////  funçao /////////////////////////////
///////////////////////////////  funçao /////////////////////////////
///////////////////////////////  funçao /////////////////////////////

//cadastrar funcao
app.post("/funcao", (req, res) => {
    const { nome, descricao, salario, carga_horaria } = req.body;
    if (!nome || !descricao || !salario || !carga_horaria) {
        return res
            .status(400)
            .json({ message: "Todos os campos são obrigatórios." });
    }
    const query = `INSERT INTO funcao (nomefun, descricao, salario, carga_horaria) VALUES (?, ?, ?, ?)`;
    db.run(query, [nome, descricao, salario, carga_horaria], function (err) {
        if (err) {
            return res
                .status(500)
                .json({ message: "Erro ao cadastrar funcao." });
        }
        res.status(201).json({
            id: this.lastID,
            message: "Funcao cadastrada com sucesso.",
        });
    });
});

// listar todos as funcoes
app.get("/funcao", (req, res) => {
    const query = `SELECT * FROM funcao`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "Erro ao listar funcoes." });
        }
        res.json(rows);
    });
});

// atualizar funcao

app.put("/funcao/:id", (req, res) => {
    const { id } = req.params;
    const { nome, descricao, salario, carga_horaria } = req.body;
    const query = `UPDATE funcao SET nomefun = ?, descricao = ?, salario = ?, carga_horaria = ? WHERE id = ?`;
    db.run(
        query,
        [nome, descricao, salario, carga_horaria, id],
        function (err) {
            if (err) {
                return res
                    .status(500)
                    .json({ message: "Erro ao atualizar funcao." });
            }
            if (this.changes === 0) {
                return res
                    .status(404)
                    .json({ message: "Funcao não encontrada." });
            }
            res.json({ message: "Funcao atualizada com sucesso." });
        },
    );
});

///////////////////////////////  Funcionario /////////////////////////////
///////////////////////////////  Funcionario /////////////////////////////
///////////////////////////////  Funcionario /////////////////////////////

//cadastrar funcionario
app.post("/funcionarios", (req, res) => {
    const {
        nome,
        cpf,
        rg,
        telefone,
        email,
        data_nascimento,
        data_contratacao,
        endereco,
        funcao_id,
    } = req.body;
    if (
        !nome ||
        !cpf ||
        !rg ||
        !telefone ||
        !email ||
        !data_nascimento ||
        !data_contratacao ||
        !endereco ||
        !funcao_id
    ) {
        return res
            .status(400)
            .json({ message: "Todos os campos são obrigatórios." });
    }
    const query = `INSERT INTO funcionarios (nome, cpf, rg, telefone, email, data_nascimento, data_contratacao, endereco, funcao_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(
        query,
        [
            nome,
            cpf,
            rg,
            telefone,
            email,
            data_nascimento,
            data_contratacao,
            endereco,
            funcao_id,
        ],
        function (err) {
            if (err) {
                console.error("Erro ao cadastrar funcionario:", err.message);
                return res
                    .status(500)
                    .json({
                        message: "Erro ao cadastrar funcionario.",
                        error: err.message,
                    });
            }
            res.status(201).json({
                id: this.lastID,
                message: "Funcionario cadastrado com sucesso.",
            });
        },
    );
});

//listar todos os funcionarios

app.get("/buscar-funcionarios", (req, res) => {
    db.all(
        `SELECT f.id, f.nome, f.cpf, f.rg, f.telefone, f.email, f.data_nascimento, f.data_contratacao, f.endereco, f.funcao_id, fn.nomefun as funcao 
                 FROM funcionarios f 
                 LEFT JOIN funcao fn ON f.funcao_id = fn.id`,
        [],
        (err, rows) => {
            if (err) {
                console.error("Erro ao buscar funcionario:", err);
                res.status(500).send("Erro ao buscar funcionario");
            } else {
                res.json(rows); // Retorna todos os dados dos funcionários
            }
        },
    );
});

// atualizar funcionario
app.put("/funcionarios/cpf/:cpf", (req, res) => {
    const { cpf } = req.params;
    const {
        nome,
        rg,
        telefone,
        email,
        data_nascimento,
        data_contratacao,
        endereco,
        funcao_id,
    } = req.body;
    const query = `UPDATE funcionarios SET nome = ?, rg = ?, telefone = ?, email = ?, data_nascimento = ?, data_contratacao = ?, endereco = ?, funcao_id = ? WHERE cpf = ?`;
    db.run(
        query,
        [
            nome,
            rg,
            telefone,
            email,
            data_nascimento,
            data_contratacao,
            endereco,
            funcao_id,
            cpf,
        ],
        function (err) {
            if (err) {
                return res
                    .status(500)
                    .json({ message: "Erro ao atualizar funcionario." });
            }
            if (this.changes === 0) {
                return res
                    .status(404)
                    .json({ message: "Funcionario não encontrado." });
            }
            res.json({ message: "Funcionario atualizado com sucesso." });
        },
    );
});

// ROTA PARA BUSCAR TODAS AS FUNÇÕES PARA CADASTRAR O FUNCIONARIO
app.get("/buscar-funcoes", (req, res) => {
    db.all("SELECT id, nomefun FROM funcao", [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar funcoes:", err);
            res.status(500).send("Erro ao buscar funcoes");
        } else {
            res.json(rows);
        }
    });
});

///////////////////////////////  Vendas /////////////////////////////
///////////////////////////////  Vendas /////////////////////////////
///////////////////////////////  Vendas /////////////////////////////

app.post("/vendas", (req, res) => {
    const { cliente_cpf, itens } = req.body;

    if (!cliente_cpf || !itens || itens.length === 0) {
        return res.status(400).send("Dados de venda incompletos.");
    }
    const dataVenda = new Date().toISOString();

    db.serialize(() => {
        const insertSaleQuery = `INSERT INTO vendas (cliente_cpf, produto_id, quantidade, data) VALUES (?, ?, ?, ?)`;
        const updateStockQuery = `UPDATE produtos SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?`;

        let erroOcorrido = false;

        itens.forEach(({ idProduto, quantidade }) => {
            if (!idProduto || !quantidade || quantidade <= 0) {
                console.error(
                    `Dados inválidos para o produto ID: ${idProduto}, quantidade: ${quantidade}`,
                );
                erroOcorrido = true;
                return;
            }

            // Registrar a venda
            db.run(
                insertSaleQuery,
                [cliente_cpf, idProduto, quantidade, dataVenda],
                function (err) {
                    if (err) {
                        console.error("Erro ao registrar venda:", err.message);
                        erroOcorrido = true;
                    }
                },
            );

            // Atualizar o estoque
            db.run(updateStockQuery, [quantidade, idProduto], function (err) {
                if (err) {
                    console.error("Erro ao atualizar estoque:", err.message);
                    erroOcorrido = true;
                }
            });
        });

        if (erroOcorrido) {
            res.status(500).send("Erro ao processar a venda.");
        } else {
            res.status(201).send({ message: "Venda registrada com sucesso." });
        }
    });
});

///////////////////////////// consulta /////////////////////////////
///////////////////////////// consulta /////////////////////////////
///////////////////////////// consulta /////////////////////////////

// Rota para buscar relatórios de vendas com filtros
app.get("/relatorios", (req, res) => {
    const { cpf, produto, dataInicio, dataFim } = req.query;

    let query = `SELECT 
                        v.id, 
                        c.nome AS cliente_nome,
                        p.nome AS produto_nome, 
                        v.quantidade, 
                        v.data
                    FROM vendas v
                    JOIN clientes c ON v.cliente_cpf = c.cpf
                    JOIN produtos p ON v.produto_id = p.id
                    WHERE 1=1`; // 1=1 é uma técnica para facilitar a adição de condições

    const params = []; // Array para armazenar os parâmetros

    if (cpf) {
        query += ` AND c.cpf = ?`;
        params.push(cpf);
    }

    if (produto) {
        query += ` AND p.nome LIKE ?`;
        params.push(`%${produto}%`);
    }

    if (dataInicio) {
        query += ` AND v.data >= ?`;
        params.push(dataInicio);
    }

    if (dataFim) {
        query += ` AND v.data <= ?`;
        params.push(dataFim);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro ao buscar relatórios:", err);
            res.status(500).send("Erro ao buscar relatórios");
        } else {
            res.json(rows);
        }
    });
});

// Rota para buscar relatórios de estoque
app.get("/relatorios-estoque", (req, res) => {
    const { produto, fornecedor } = req.query; 
    let query = `SELECT p.id, p.nome, p.quantidade_estoque, f.nome AS fornecedor_nome FROM produtos p JOIN fornecedores f ON p.fornecedor_id = f.id WHERE 1=1`;
    const params = [];
    if (produto) {
        query += ` AND p.nome LIKE ?`;
        params.push(`%${produto}%`);
    } 
    if (fornecedor) {
        query += ` AND f.nome LIKE ?`;
        params.push(`%${fornecedor}%`);
    } 
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro ao buscar relatórios de estoque:", err);
            res.status(500).send("Erro ao buscar relatórios de estoque");
        } else{
            res.json(rows);
        }
     },
  );
 });

 // Rota para buscar relatórios de funcionários
app.get("/relatorios-funcionarios", (req, res) => {
    const { nome, funcao } = req.query;
    let query = `SELECT f.id, f.nome, f.cpf, f.rg, f.telefone, f.email, f.data_nascimento, f.data_contratacao, f.endereco, fn.nomefun as funcao FROM funcionarios f LEFT JOIN funcao fn ON f.funcao_id = fn.id WHERE 1=1`;
    const params = [];
    if (nome) {
        query += ` AND f.nome LIKE ?`;
        params.push(`%${nome}%`);
    }
    if (funcao) {
        query += ` AND fn.nomefun LIKE ?`;
        params.push(`%${funcao}%`);
    }
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro ao buscar relatórios de funcionários:", err);
            res.status(500).send("Erro ao buscar relatórios de funcionários");
        } else {
            res.json(rows);
        }
    });
});

    // Rota para buscar relatórios de fornecedores
app.get("/relatorios-fornecedores", (req, res) => {
     const { nome, cnpj } = req.query;
        let query = `SELECT * FROM fornecedores WHERE 1=1`;
        const params = [];
        if (nome) {
            query += ` AND nome LIKE ?`;
            params.push(`%${nome}%`);
        }
        if (cnpj) {
            query += ` AND cnpj LIKE ?`;
            params.push(`%${cnpj}%`);
        }
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error("Erro ao buscar relatórios de fornecedores:", err);
                res.status(500).send("Erro ao buscar relatórios de fornecedores");
            } else {
                res.json(rows);
            }
        });
    });

    // Rota para buscar relatórios de clientes
app.get("/relatorios-clientes", (req, res) => {
    const { nome, cpf } = req.query;
    let query = `SELECT * FROM clientes WHERE 1=1`;
    const params = [];
    if (nome) {
        query += ` AND nome LIKE ?`;
        params.push(`%${nome}%`);
    }
    if (cpf) {
        query += ` AND cpf LIKE ?`;
        params.push(`%${cpf}%`);
    }
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro ao buscar relatórios de clientes:", err);
            res.status(500).send("Erro ao buscar relatórios de clientes");
        } else {
            res.json(rows);
        }
        },
     );
 });

// Rota para buscar relatórios de funções
app.get("/relatorios-funcoes", (req, res) => {



    
    const { nome, descricao } = req.query;
    let query = `SELECT * FROM funcao WHERE 1=1`;
    const params = [];
    if (nome) {
        query += ` AND nomefun LIKE ?`;
        params.push(`%${nome}%`);
    }
    if (descricao) {
        query += ` AND descricao LIKE ?`;
        params.push(`%${descricao}%`);
    }
    db.all(query, params, (err, rows) => {
        if (err){
            console.error("Erro ao buscar relatórios de funções:", err);
            res.status(500).send("Erro ao buscar relatórios de funções");
        }
        else {
            res.json(rows);
        }
        },
     );
 });

// Rota para buscar relatórios de produtos
app.get("/relatorios-produtos", (req, res) => {
    const { nome, tipo } = req.query;
    let query = `SELECT * FROM produtos WHERE 1=1`;
    const params = [];
    if (nome) {
        query += ` AND nome LIKE ?`;
        params.push(`%${nome}%`);
    }
    if (tipo) {
        query += ` AND tipo LIKE ?`;
        params.push(`%${tipo}%`);
    }
    db.all(query, params, (err, rows) => {
        if (err){
            console.error("Erro ao buscar relatórios de produtos:", err);
            res.status(500).send("Erro ao buscar relatórios de produtos");
        }
        else {
            res.json(rows);
        }
        },
    );
});

    // Rota para buscar relatórios de carrinho
app.get("/relatorios-carrinho", (req, res) => {
    const { cliente_cpf, produto_id } = req.query;
    let query = `SELECT * FROM carrinho WHERE 1=1`;
    const params = [];
    if (cliente_cpf) {
        query += ` AND cliente_cpf LIKE ?`;
        params.push(`%${cliente_cpf}%`);
    }
    if (produto_id) {
        query += ` AND produto_id LIKE ?`;
        params.push(`%${produto_id}%`);
    }
    db.all(query, params, (err, rows) => {
        if (err){
            console.error("Erro ao buscar relatórios de carrinho:", err);
            res.status(500).send("Erro ao buscar relatórios de carrinho");
        }
        else{
            res.json(rows);
        }
        },
    );
});

    // Rota para buscar relatórios de vendas
app.get("/relatorios-vendas", (req, res) => {
    const { cliente_cpf, produto_id } = req.query;
    let query = `SELECT * FROM vendas WHERE 1=1`;
    const params = [];
    if (cliente_cpf) {
        query += ` AND cliente_cpf LIKE ?`;
        params.push(`%${cliente_cpf}%`);
    }
    if (produto_id) {
        query += ` AND produto_id LIKE ?`;
        params.push(`%${produto_id}%`);
    }
    db.all(query, params, (err, rows) => {
        if (err){
            console.error("Erro ao buscar relatórios de vendas:", err);
            res.status(500).send("Erro ao buscar relatórios de vendas");
        }
        else{
            res.json(rows);
        }
        },
    );
});


    
// Teste para verificar se o servidor está rodando
app.get("/", (req, res) => {
    res.send("Servidor está rodando e tabelas criadas!");
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta http://localhost:${port}`);
});