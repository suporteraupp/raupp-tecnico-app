# Raupp Técnico App — ERP Soluções em Impressão

Aplicativo web responsivo voltado para técnicos de campo da **Raupp Soluções em Impressão**, integrado diretamente com o banco de dados **Supabase PostgreSQL**. O sistema permite a visualização, atendimento, laudo e coleta de assinatura digital de Ordens de Serviço (OS).

---

## 🚀 Funcionalidades Principais

- **Gerenciamento de Ordens de Serviço por Abas:**
  - 📂 **Abertos:** OSs aguardando início de atendimento.
  - ⏳ **Em Curso:** OSs em andamento pelo técnico.
  - ✅ **Concluídos:** OSs finalizadas com laudo técnico e assinatura digital.
- **Autenticação Conectada ao Supabase Auth:**
  - Login seguro diretamente na infraestrutura do Supabase.
  - Tratamento de sessão persistente e Row Level Security (RLS).
- **Localização Inteligente e Navegação:**
  - Resolução automática do endereço completo via `end_logradouro`, `end_numero`, `end_bairro`, `end_cidade` e `end_uf`.
  - Prioridade para filiais e locais específicos (`parceiros_localizacao`) com fallback para o cadastro principal (`parceiros`).
  - Botão de rota direta no **Google Maps / Waze**.
- **Comunicação Direta:**
  - Atalho de acionamento rápido para **WhatsApp** do solicitante/cliente.
- **Assinatura Digital no Celular (Canvas HTML5):**
  - Coleta da assinatura do cliente na tela sensível ao toque.
  - Persistência e renderização da assinatura diretamente na Ordem de Serviço.
- **Leitura de Contadores:**
  - Registro de contadores P&B e Coloridos no atendimento.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, Vite.
- **Estilização:** Vanilla CSS3 moderno (Dark Mode, Glassmorphism, Design Responsivo Mobile-First).
- **Ícones & Fontes:** FontAwesome 6, Google Fonts (Inter).
- **Backend & Database:** Supabase JS Client, PostgreSQL (`os_chamados`, `parceiros`, `parceiros_localizacao`, `equipamentos`).

---

## 📁 Estrutura do Projeto

```text
raupp-tecnico-app/
├── public/
│   └── assets/          # Logotipos e recursos estáticos
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Cabeçalho com identificador do usuário e ações
│   │   ├── Login.jsx            # Formulário de Login Supabase
│   │   ├── OsCard.jsx           # Card responsivo da OS com leitor de endereço e assinatura
│   │   ├── SignatureModal.jsx   # Modal de assinatura Canvas e laudo técnico
│   │   ├── TabNav.jsx           # Navegação em abas e contadores
│   │   └── Toast.jsx            # Notificações Toast no app
│   ├── config/
│   │   └── api.js               # Cliente Supabase, gerenciamento de RLS e sanitização
│   ├── App.jsx                  # Componente raiz, estados e roteamento de autenticação
│   ├── App.css                  # Estilos globais e temas do app
│   ├── index.css                # Reset CSS e utilitários de layout
│   └── main.jsx                 # Ponto de entrada React
├── .env                         # Variáveis de ambiente (URL e Anon Key do Supabase)
├── package.json
└── vite.config.js
```

---

## 📦 Como Rodar o Projeto Localmente

1. **Clonar/Acessar a pasta do projeto:**
   ```bash
   cd /home/kayke/Documentos/Projetos/raupp-tecnico-app
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O aplicativo estará disponível em: `http://localhost:5173`

4. **Gerar o build de produção:**
   ```bash
   npm run build
   ```

---

## 🔒 Variáveis de Ambiente (`.env`)

```env
VITE_SUPABASE_URL=https://hvwdcsdbqpuqnsacqdpb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```
