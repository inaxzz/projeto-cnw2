// FILE: server.js
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const PORT = 8080;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Banco de dados
const db = new sqlite3.Database("./banco.db");
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL
  )
`);

// Rotas principais
app.get("/", (req, res) => res.sendFile("index.html", { root: "public" }));

app.post("/cadastrar", (req, res) => {
  const { nome, email } = req.body;
  db.run("INSERT INTO usuarios (nome, email) VALUES (?, ?)", [nome, email], (err) => {
    if (err) return res.status(500).send("Erro ao cadastrar!");
    res.redirect("/consultar");
  });
});

app.get("/consultar", (req, res) => {
  db.all("SELECT * FROM usuarios", (err, rows) => {
    if (err) return res.status(500).send("Erro ao consultar!");
    res.send(renderPage("Usuários Cadastrados", `
      <h1>Usuários cadastrados <span class="user-count">${rows.length}</span></h1>
      ${rows.length === 0 ? 
        '<div class="empty-note">Nenhum usuário cadastrado ainda. <a href="/">Cadastrar agora</a></div>' : 
        renderUsersTable(rows)
      }
      <div style="margin-top:20px"><a class="btn ghost" href="/">Cadastrar novo usuário</a></div>
    `));
  });
});

app.get("/editar/:id", (req, res) => {
  db.get("SELECT * FROM usuarios WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Usuário não encontrado!");
    res.send(renderPage("Editar Usuário", `
      <h1>Editar Usuário</h1>
      <form method="POST" action="/editar/${row.id}">
        <div class="field">
          <label for="nome">Nome</label>
          <input id="nome" name="nome" type="text" required value="${escape(row.nome)}" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" required value="${escape(row.email)}" />
        </div>
        <div class="actions">
          <button class="btn primary" type="submit">Salvar alterações</button>
          <a class="btn ghost" href="/consultar">Voltar</a>
        </div>
      </form>
    `));
  });
});

app.post("/editar/:id", (req, res) => {
  const { nome, email } = req.body;
  db.run("UPDATE usuarios SET nome = ?, email = ? WHERE id = ?", 
    [nome, email, req.params.id], 
    (err) => {
      if (err) return res.status(500).send("Erro ao atualizar!");
      res.redirect("/consultar");
    }
  );
});

app.post("/deletar/:id", (req, res) => {
  db.run("DELETE FROM usuarios WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).send("Erro ao deletar!");
    res.redirect("/consultar");
  });
});

// Funções auxiliares
function renderPage(title, content) {
  return `<!DOCTYPE html>
  <html lang="pt-br">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <main class="container">
      <header class="site-header">${content.split('<h1>')[0].includes('header') ? '' : content.match(/<h1>.*?<\/h1>/)?.[0] || ''}</header>
      <section class="card">${content}</section>
      <footer class="site-footer"><small>Projeto de exemplo • Node + SQLite</small></footer>
    </main>
  </body>
  </html>`;
}

function renderUsersTable(users) {
  return `<table aria-label="Lista de usuários">
    <thead>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>Email</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody>
      ${users.map(user => `
        <tr class="user-row">
          <td class="user-id">${user.id}</td>
          <td class="user-name">${escape(user.nome)}</td>
          <td class="user-email">${escape(user.email)}</td>
          <td class="user-actions">
            <a class="action-link btn-edit" href="/editar/${user.id}">Editar</a>
            <form method="POST" action="/deletar/${user.id}" onsubmit="return confirm('Deseja realmente excluir ${escapeJs(user.nome)}?');" style="display:inline">
              <button class="action-link btn-delete" type="submit">Excluir</button>
            </form>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function escape(str) {
  return str ? str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]) : '';
}

function escapeJs(str) {
  return str ? str.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
}

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor rodando: http://localhost:${PORT}`));