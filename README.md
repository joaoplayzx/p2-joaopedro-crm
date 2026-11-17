# Vínculo — CRM

Aplicação web responsiva para pequenas empresas gerenciarem clientes, pedidos e histórico de atendimento. Desenvolvida com Vite, React e TypeScript, integrada à API local da disciplina.

## Repositório GitHub

**Link:** https://github.com/joaoplayzx/p2-joaopedro-crm

## Requisitos

- Node.js 20.19+ ou 22.12+
- A API da disciplina disponível em `http://localhost:3333`

## Como executar

1. Na pasta do projeto, instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` na raiz (ou copie `.env.example`) e configure a URL da API:

   ```env
   VITE_API_URL=http://localhost:3333
   ```

3. Coloque a pasta `servidor-crm` fornecida pela professora na raiz do workspace, ao lado do `package.json` do frontend. Em outro terminal, inicie o servidor:

   ```bash
   cd servidor-crm
   npm install
   npm start
   ```

4. Na raiz deste projeto, inicie o frontend:

   ```bash
   npm run dev
   ```

5. Abra o endereço indicado pelo Vite. Conta de teste: usuário `emilys`, senha `emilyspass`.

Se alterar `.env`, reinicie `npm run dev`. O token é validado em `/auth/me`; se a API reiniciar e invalidar a sessão, o app retorna ao Login.

## Build de produção

```bash
npm run build
npm run preview
```

## Funcionalidades

- Login com retorno à rota protegida solicitada e tratamento de sessão expirada.
- Painel com total de clientes, vendas válidas, ticket médio, situação dos pedidos e Top 3 clientes.
- Busca e paginação de clientes, cadastro/edição com validação, selos VIP/Regular/Sem compras e exclusão com confirmação dos registros vinculados.
- Detalhe do cliente com criação, edição e exclusão de pedidos e atendimentos; mudanças de status respeitam as regras de negócio.
- Lista de pedidos com cliente, filtro por status e faixa de preço e ordenação por data ou valor.
- Estados de carregamento, vazio e erro; layout adaptado para telas estreitas.

## Referência visual

A paleta azul e a separação de camadas claras foram adaptadas como referência do [IBM Carbon Design System](https://designsystems.surf/design-systems/ibm), listado na seção **Design Systems** do repositório [recursos-frontend](https://github.com/yurimutti/recursos-frontend). As cores são aplicadas por tokens de função no tema do CRM; nenhum asset do Carbon foi copiado.

## Entrega ZIP

O arquivo ZIP deve conter o projeto e não deve incluir `node_modules` nem `dist`. O `.gitignore` já exclui essas pastas.
