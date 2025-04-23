<p align="center">
  <h1>Plataforma Sem Nome 📄✨</h1>
  <h2>Sua plataforma de documentação selfmade (quase) :D</h2>
</p>

<p align="center">
  <em>Uma plataforma moderna e interativa para criar, gerenciar e publicar documentação técnica com a filosofia "Documentation as Code".</em>
  <br/>
  <a href="#-funcionalidades"><strong>Funcionalidades</strong></a> •
  <a href="#-tecnologias"><strong>Tecnologias</strong></a> •
  <a href="#%EF%B8%8F-como-rodar"><strong>Como Rodar</strong></a> •
  <a href="#-estrutura-do-projeto"><strong>Estrutura</strong></a> •
  <a href="#-contribuindo"><strong>Contribuindo</strong></a>
</p>

---

A **Plataforma Sem Nome** transforma o processo de documentação, permitindo que equipes técnicas produzam, revisem e publiquem conteúdo usando Markdown e fluxos de trabalho Git familiares. Crie documentações bonitas, responsivas e fáceis de navegar!

## ✨ Funcionalidades Principais

* **Navegação intuitiva:** sidebar interativa gerada automaticamente a partir da estrutura de pastas, com destaque para o arquivo ativo e suporte a múltiplos níveis.
* **Conteúdo rico com markdown:** suporte completo a Markdown, processado dinamicamente no cliente com a biblioteca [Marked.js](https://marked.js.org/).
* **Callouts estilizados:** destaque informações importantes, avisos ou erros usando uma sintaxe simples no Markdown (`:::(info) (Título) ... :::`) que é automaticamente renderizada com estilos customizáveis.
* **Tabela de Conteúdo (TOC) dinâmica:** geração automática de TOC baseada nos cabeçalhos (H1, H2, H3) do documento atual, com scroll spy para indicar a seção ativa.
* **Seleção de versão e idioma:** permite aos usuários alternar facilmente entre diferentes versões e idiomas da documentação, carregando o conteúdo correspondente.
* **Busca integrada:** funcionalidade de busca em tempo real (com debounce) no conteúdo pré-carregado da versão/idioma selecionado.
* **Referência de API:** página dedicada para exibir especificações OpenAPI (Swagger) usando [Redoc](https://github.com/Redocly/redoc).
* **Feedback do Usuário:** botões de "like/dislike" com modal para coletar feedback sobre a utilidade das páginas.
* **Design Responsivo:** interface adaptável para diferentes tamanhos de tela.
* **"Documentation as Code" (DocAsCode):** baseado em arquivos estáticos (HTML, CSS, JS, Markdown) e versionamento Git, facilitando a colaboração e a integração com CI/CD.

## 🚀 Tecnologias

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS)
* **Processamento Markdown:** [Marked.js](https://marked.js.org/)
* **Visualização API:** [Redoc](https://github.com/Redocly/redoc)
* **Tooling (Helper Scripts):** Node.js (para geração da estrutura de menu)
* **Servidor (Desenvolvimento):** Qualquer servidor web estático (ex: `npx serve`, Live Server)

## 🛠️ Como Rodar

Siga estes passos para configurar e rodar o projeto localmente:

1.  **Clone o Repositório:**
    ```bash
    git clone <url-do-seu-repositorio>
    cd <nome-da-pasta-do-projeto>
    ```

2.  **Instale as Dependências (para o script de menu):**
    ```bash
    npm install
    ```
    *(Isso instalará o `marked` necessário para o `cria_menu.js`)*

3.  **Gere a Estrutura da Documentação:**
    Execute o script Node.js para escanear seus arquivos `.md` e criar/atualizar o `structure.json`.
    ```bash
    node cria_menu.js
    ```
    *Verifique o console por erros e confirme se o `structure.json` foi gerado corretamente.*

4.  **Inicie um Servidor Local:**
    Navegue **para dentro** da pasta raiz do projeto (onde está o `index.html`) e use um servidor de sua preferência.
    *Exemplo usando `serve` (instale com `npm install -g serve` se não tiver):*
    ```bash
    serve .
    ```
    *Ou use a extensão "Live Server" do VS Code.*

5.  **Acesse no Navegador:**
    Abra seu navegador e vá para o endereço fornecido pelo servidor (geralmente `http://localhost:3000`, `http://localhost:5000` ou `http://127.0.0.1:5500`).

## 📁 Estrutura do Projeto

```txt
/
├── api-specs/         # Arquivos de especificação OpenAPI (ex: openapi.yaml)
├── css/
│   └── styles.css     # Estilos principais
├── images/            # Logos e outras imagens (coloque seu logo aqui!)
├── js/
│   └── script.js      # Lógica principal do frontend
├── 1.0/               # Exemplo de pasta de versão
│   ├── en/            # Exemplo de pasta de idioma
│   │   └── about.md
│   └── pt/
│       └── sobre.md
├── *.md               # Outros arquivos Markdown de documentação (organize por versão/idioma)
├── api.html           # Página para visualização da API com Redoc
├── cria_menu.js       # Script Node.js para gerar structure.json
├── index.html         # Ponto de entrada principal da aplicação
├── package.json       # Dependências do Node.js (para cria_menu.js)
├── README.md          # Este arquivo :)
└── structure.json     # Estrutura da documentação (gerado por cria_menu.js)
```
## 🎨 Customização

* **Estrutura/Menu:** adicione/remova arquivos `.md` e execute `node cria_menu.js` para atualizar a navegação.
* **Aparência:** modifique as variáveis CSS e estilos em `css/styles.css`.
* **Comportamento:** ajuste a lógica no `js/script.js`.
* **Logo:** substitua a imagem em `images/` e atualize o caminho no `index.html`.

## 🙌 Contribuindo

Contribuições são bem-vindas! Se você tem sugestões ou quer corrigir algo:

1.  Faça um Fork do projeto.
2.  Crie uma Branch para sua modificação (`git checkout -b feature/nova-feature` ou `fix/corrige-bug`).
3.  Faça Commit das suas alterações (`git commit -m 'Adiciona nova feature X'`).
4.  Faça Push para a Branch (`git push origin feature/nova-feature`).
5.  Abra um Pull Request.

## 📜 Licença

GPL V4.

---

*Desenvolvido com ❤️ por [aulo Guilherme*