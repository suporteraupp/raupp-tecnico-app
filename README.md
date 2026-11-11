# Raupp Técnico App — Field Service & Soluções em Impressão

Aplicativo web progressivo (*Mobile-First Field Service*) voltado para os técnicos de campo da **Raupp Soluções em Impressão**, integrado em tempo real com o banco de dados **Supabase PostgreSQL**.

---

## 🚀 Funcionalidades Principais

- **Gerenciamento de Ordens de Serviço por Abas:**
  - 📂 **Abertos:** OSs aguardando início de atendimento (ordenadas por prioridade e data).
  - ⏳ **Em Curso:** OSs em andamento pelo técnico.
  - ✅ **Concluídos:** OSs finalizadas com checklist, contadores, peças utilizadas, laudo técnico, assinatura digital e opção de **Reabrir Chamado (Gerar Retorno)** em 1 clique.
  - 🏢 **Clientes:** Lista de clientes e filiais com filtro rápido por cidade.
  - 🧰 **Minha Maleta (Estoque Volante):** Controle de peças e insumos do técnico com vínculo direto por **Marca + Modelo** de impressora.
- **Autenticação Flexível (Supabase Auth):**
  - Login por **Nome de Usuário** ou **E-mail**.
  - Sessão persistente com suporte a Row Level Security (RLS).
- **Amarração Estrita de Peças por Marca e Modelo:**
  - Ao finalizar um chamado de uma **Brother HL-L5102DW**, apenas peças compatíveis com **Brother HL-L5102DW** são exibidas.
  - Ao finalizar um chamado de uma **Samsung MF-4070**, apenas peças compatíveis com **Samsung MF-4070** são exibidas.
  - Vinculação rápida de peças sem modelo diretamente na aba **Minha Maleta**.
- **Checklist Técnico Obrigatório na Finalização:**
  - 3 etapas de verificação obrigatórias antes de liberar o encerramento da OS (Limpeza, Verificação de desgaste e Página de teste).
- **Alerta Preventivo de Peça no Fim da Vida Útil + Reabertura Automática:**
  - Permite sinalizar peças desgastadas que vão durar poucas impressões (ex.: *Fusor*, *Cilindro*, *Roletes*, *Película*).
  - Abre/reabre automaticamente o chamado na fila de **Abertos** e exibe um banner âmbar de destaque (**⚠️ Aviso da Última Visita — Levar Peça**) para que o técnico leve a peça no próximo atendimento.
- **Localização Inteligente e Comunicação Direta:**
  - Rota direta no **Google Maps / Waze** e atalho para **WhatsApp** do solicitante.
- **Assinatura Digital no Celular (Canvas HTML5):**
  - Coleta da assinatura do cliente na tela sensível ao toque com validação de traço mínimo.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, Vite 8.
- **Qualidade de Código:** Oxlint (`npm run lint`).
- **Estilização:** CSS3 moderno (Dark Mode, Glassmorphism, Design Responsivo Mobile-First).
- **Ícones & Fontes:** FontAwesome 6, Google Fonts (Inter, Outfit).
- **Backend & Database:** Supabase JS Client (`@supabase/supabase-js`), PostgreSQL (`os_chamados`, `parceiros`, `parceiros_localizacao`, `equipamentos`, `equipamentos_marcas`, `equipamentos_modelos`, `produtos`, `profiles`).

---

## 📁 Estrutura do Projeto

```text
raupp-tecnico-app/
├── public/
│   └── assets/                        # Logotipos e recursos estáticos
├── src/
│   ├── components/
│   │   ├── CityFilter.jsx             # Filtro de OSs e clientes por cidade
│   │   ├── ClientList.jsx             # Diretório de clientes e filiais
│   │   ├── EquipmentHistoryModal.jsx  # Histórico de manutenções do equipamento
│   │   ├── Header.jsx                 # Cabeçalho com perfil do técnico e atualização
│   │   ├── Login.jsx                  # Tela de autenticação (Usuário ou E-mail)
│   │   ├── OsCard.jsx                 # Card da OS com alertas preventivos, rotas e reabertura
│   │   ├── SignatureModal.jsx         # Checklist, alerta preventivo, baixa de peças e assinatura
│   │   ├── TabNav.jsx                 # Navegação principal com contadores
│   │   └── TechMaleta.jsx             # Gestão de estoque volante e vínculo Marca/Modelo
│   ├── context/
│   │   ├── AuthContext.jsx            # Contexto de sessão do técnico
│   │   └── ToastContext.jsx           # Sistema global de notificações Toast
│   ├── domain/
│   │   ├── chamados/statusRules.js    # Regras de status e ordenação de OSs
│   │   ├── equipamentos/brandDetector.js # Identificação de Marca/Modelo e filtro estrito de peças
│   │   └── parceiros/cityExtractor.js # Extração de municípios de clientes e locais
│   ├── hooks/
│   │   ├── useChamados.js             # Hook de ciclo de vida das OSs (iniciar, concluir, reabrir)
│   │   └── useEstoqueVolante.js       # Hook de métricas do estoque volante
│   ├── services/supabase/
│   │   ├── client.js                  # Instância do Supabase e verificação de sessão
│   │   ├── authService.js             # Login por usuário/e-mail e leitura de perfil
│   │   ├── chamadosService.js         # CRUD de OSs, alertas preventivos e reabertura
│   │   ├── parceirosService.js        # Consulta de clientes e localizações
│   │   └── produtosService.js         # Estoque de peças, modelos de impressora e baixa em OS
│   ├── App.jsx                        # Componente raiz da aplicação
│   ├── App.css                        # Estilos de componentes e modais
│   ├── index.css                      # Variáveis de tema e layout responsivo
│   └── main.jsx                       # Ponto de entrada React
├── .env                               # Variáveis de ambiente (URL e Anon Key do Supabase)
├── package.json
└── vite.config.js
```

---

## 📦 Como Executar o Projeto

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Disponível em `http://localhost:5173`.

3. **Executar verificação de lint:**
   ```bash
   npm run lint
   ```

4. **Gerar build de produção:**
   ```bash
   npm run build
   ```
