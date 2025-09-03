// FILE: server.js
// Importa dependências
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const app = express();
const PORT = 8080;

// Configurações
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // pasta com HTML/CSS/JS

// Conexão com SQLite
const db = new sqlite3.Database("./banco.db", (err) => {
  if (err) {
    console.error(" Erro ao conectar no banco:", err.message);
  } else {
    console.log(" Banco SQLite conectado!");
  }
});

// Cria tabela se não existir
db.run(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL
)
`);

// Rota principal → mostra a tela de cadastro
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Rota para cadastro de usuário
app.post("/cadastrar", (req, res) => {
  const { nome, email } = req.body;
  db.run(
    `INSERT INTO usuarios (nome, email) VALUES (?, ?)`,
    [nome, email],
    function (err) {
      if (err) {
        console.error(err.message);
        res.send(" Erro ao cadastrar usuário!");
      } else {
        // redireciona para a listagem depois de cadastrar
        res.redirect("/consultar");
      }
    }
  );
});

// Rota para consultar todos os usuários (lista com Editar/Excluir)
app.get("/consultar", (req, res) => {
  db.all(`SELECT * FROM usuarios`, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.send(" Erro ao consultar usuários!");
    } else {
      const count = rows.length;
      let html = `<!doctype html>
      <html lang="pt-br">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Usuários Cadastrados</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <main class="container">
          <header class="site-header">
            <h1>Usuários cadastrados <span class="user-count">${count}</span></h1>
            <p class="subtitle">Lista de usuários inseridos no sistema.</p>
          </header>

          <section class="card user-table">
      `;

      if (rows.length === 0) {
        html += `<div class="empty-note">Nenhum usuário cadastrado ainda. <a href="/">Cadastrar agora</a></div>`;
      } else {
        html += `<table aria-label="Lista de usuários">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
        `;

        rows.forEach((user) => {
          html += `
            <tr class="user-row">
              <td class="user-id">${user.id}</td>
              <td class="user-name">${escapeHtml(user.nome)}</td>
              <td class="user-email">${escapeHtml(user.email)}</td>
              <td class="user-actions">
                <a class="action-link btn-edit" href="/editar/${user.id}">Editar</a>
                <form method="POST" action="/deletar/${user.id}" onsubmit="return confirm('Deseja realmente excluir ${escapeJs(user.nome)}?');" style="display:inline">
                  <button class="action-link btn-delete" type="submit">Excluir</button>
                </form>
              </td>
            </tr>
          `;
        });

        html += `</tbody></table>`;
      }

      html += `
          <div style="margin-top:12px"><a class="btn ghost" href="/">Cadastrar novo usuário</a></div>
          </section>
          <footer class="site-footer"><small>Projeto de exemplo • Node + SQLite</small></footer>
        </main>
      </body>
      </html>`;

      res.send(html);
    }
  });
});

// Rota que mostra o formulário de edição (preenchido)
app.get("/editar/:id", (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM usuarios WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      res.send(" Erro ao buscar usuário!");
    } else if (!row) {
      res.send(" Usuário não encontrado!");
    } else {
      // Formulário de edição (gera dinamicamente) com link para o style.css
      const html = `<!doctype html>
      <html lang="pt-br">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Editar Usuário</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <main class="container">
          <header class="site-header"><h1>Editar Usuário</h1></header>
          <section class="card form-card">
            <form method="POST" action="/editar/${row.id}">
              <div class="field">
                <label for="nome">Nome</label>
                <input id="nome" name="nome" type="text" required value="${escapeHtml(row.nome)}" />
              </div>

              <div class="field">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" required value="${escapeHtml(row.email)}" />
              </div>

              <div class="actions">
                <button class="btn primary" type="submit">Salvar alterações</button>
                <a class="btn ghost" href="/consultar">Voltar</a>
              </div>
            </form>
          </section>
          <footer class="site-footer"><small>Projeto de exemplo • Node + SQLite</small></footer>
        </main>
      </body>
      </html>`;

      res.send(html);
    }
  });
});

// Rota que recebe a edição e atualiza o registro
app.post("/editar/:id", (req, res) => {
  const id = req.params.id;
  const { nome, email } = req.body;
  db.run(
    `UPDATE usuarios SET nome = ?, email = ? WHERE id = ?`,
    [nome, email, id],
    function (err) {
      if (err) {
        console.error(err.message);
        res.send(" Erro ao atualizar usuário!");
      } else {
        res.redirect("/consultar");
      }
    }
  );
});

// Rota para deletar usuário
app.post("/deletar/:id", (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM usuarios WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error(err.message);
      res.send(" Erro ao deletar usuário!");
    } else {
      res.redirect("/consultar");
    }
  });
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(` Servidor rodando em http://localhost:${PORT}`);
});

// --- Helpers simples para escapar conteúdo (prevenir injeção básica ao gerar HTML) ---
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// used inside single-quoted JS in confirm() to avoid breaking the string
function escapeJs(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "\\'").replace(/\"/g, '\\\"');
}
