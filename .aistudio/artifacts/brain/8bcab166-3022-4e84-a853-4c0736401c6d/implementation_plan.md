# Importação de Arquivos CSV e Sistema de Backup Automatizado

Plano arquitetural e de implementação para introduzir a importação assistida de arquivos CSV em Clientes, Orçamentos e Faturamento/Contas a Receber, e ativar o sistema completo de cópias de segurança (Backup manual e automático diário com retenção histórica de 20 snapshots).

---

## Decisões Confirmadas pelo Usuário

> [!IMPORTANT]
> As decisões de produto e fluxo operacional foram confirmadas com o usuário durante a etapa de alinhamento interativo:

* **Tratamento de Duplicados no CSV**: O usuário poderá alternar entre **Ignorar registros existentes** ou **Atualizar dados existentes** diretamente na tela de conferência prévia (Preview) antes da gravação definitiva.
* **Frequência do Backup Automático**: Execução **diária** em segundo plano pelo servidor Express, com retenção automática dos últimos 20 arquivos de snapshot (`data/backups/`).
* **Localização do Painel de Backup**: Integrado diretamente na aba **Administrador** da tela de Configurações (`SettingsView`), mantendo o isolamento de segurança para perfis com permissão de administrador (`ADMIN`).

---

## 1. Visão Geral e Conceito Central

### O que a solução entrega
1. **Importador Universal de CSV Operacional**:
   * **Clientes (`CustomersView`)**: Adiciona botão "Importar CSV" permitindo carregar novos contatos e empresas ou atualizar cadastros existentes, validando CPF/CNPJ, telefones, e-mails e endereços.
   * **Orçamentos (`BudgetsView`)**: Permite importar orçamentos com vinculação inteligente de clientes (por documento ou nome), validando valores numéricos, datas de validade, status e integridade dos itens.
   * **Faturamento e Contas a Receber (`SalesView`)**: Permite importar vendas e títulos a receber, sincronizando valores faturados, saldos em aberto e títulos na tabela `receivables`.
2. **Download de Modelos CSV Oficiais**:
   * Disponibilização de arquivos de modelo `.csv` estruturados exatamente com os campos, cabeçalhos e separadores suportados pelo sistema (sem dados fictícios), garantindo fácil preenchimento pelo usuário.
3. **Correção do Sistema de Backup**:
   * **Backup Automático no Servidor**: Inicialização de rotina de agendamento diário em `server.ts` chamando `createLocalBackupFile('auto')` com rotação limpa de até 20 snapshots.
   * **Painel de Backup Manual na Interface**: Seção dedicada na aba "Administrador" de `SettingsView` permitindo:
     * Disparar backup manual imediato no servidor (`/api/backup/create`).
     * Baixar arquivo JSON completo de snapshot para o computador do operador (`/api/backup/export`).
     * Visualizar a lista cronológica de backups com data, tamanho e tag (`/api/backup/list`).
     * Restaurar o sistema a partir de um backup anterior (`/api/backup/import`) com salvaguarda automática pré-restauração.

---

## 2. Experiência do Usuário e Design Visual

### Fluxos de Importação de CSV (Wizard de 4 Etapas)
Seguindo o padrão de alta fidelidade já consolidado no `ProductImportModal`:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    1. Upload    │ ──> │   2. Preview    │ ──> │ 3. Processando  │ ──> │  4. Conclusão   │
│ Arrastar arquivo│     │ Validar colunas │     │ Gravação no DB  │     │ Resumo & Erros  │
│ Baixar modelo   │     │ Alternar ação   │     │ Barra progresso │     │ Baixar relatório│
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Etapa 1: Upload & Modelo**
   * Área de drag-and-drop estilizada para arquivos `.csv`.
   * Botão sutil e visível "Baixar Modelo CSV Oficial" com cabeçalhos exatos e codificação UTF-8 com BOM (`\uFEFF`), compatível com Microsoft Excel, LibreOffice e Google Planilhas.
   * Detecção automática de delimitador (ponto e vírgula `;` ou vírgula `,`).
2. **Etapa 2: Pré-visualização e Validação Rigorosa**
   * Tabela densa com rolagem horizontal apresentando os primeiros registros parseados.
   * Destaque para novos registros vs. registros já identificados no sistema (por Documento/ID no caso de Clientes, ou Número no caso de Orçamentos e Vendas).
   * Controle de ação para duplicados: seletor com as opções **"Ignorar duplicados (apenas cadastrar novos)"** e **"Atualizar dados dos registros existentes"**.
   * Painel de validação apontando linhas com inconsistências (campos obrigatórios vazios, valores numéricos inválidos, formatos de data incorretos).
3. **Etapa 3: Processamento e Persistência**
   * Gravação em lote através do `StorageService` e sincronização direta com a API do servidor Express / SQLite.
4. **Etapa 4: Resumo Final**
   * Métricas claras: total lido, registros criados, registros atualizados, registros ignorados e erros.
   * Opção de baixar relatório em CSV das linhas rejeitadas e seus respectivos motivos.

### Painel de Backup na Aba Administrador
* Localizado em `src/components/settings/SettingsView.tsx` (aba `admin`).
* **Card de Segurança e Backups**:
  * Status do backup automático: indicador textual da última execução e intervalo (diário).
  * Botão de ação primária: **"Iniciar Backup Manual Agora"** (gera cópia no servidor e atualiza a lista).
  * Botão de ação secundária: **"Baixar Cópia Completa (.json)"** (download direto via navegador).
  * Tabela de histórico dos últimos backups armazenados com data/hora formatada, tamanho em KB/MB, tipo (`manual`, `auto`, `pre_restore`) e botão para restaurar.
  * Modal de confirmação segura com aviso de salvaguarda automática antes de restaurar qualquer snapshot.

---

## 3. Decisões Técnicas e Integridade dos Dados

### Compatibilidade de Arquivos CSV
* **Parser Resiliente**: Leitura com suporte a BOM (`\uFEFF`), delimitadores `;` e `,`, quebras de linha `\r\n` ou `\n`, e campos entre aspas contendo caracteres especiais.
* **Normalização Numérica**: Tratamento de moeda brasileira (`R$ 1.250,50` ou `1250,50` ou `1250.50`) convertendo confiavelmente para números float.
* **Integridade Relacional**:
  * Ao importar **Orçamentos**: busca cliente por documento ou nome; caso não exista, cria automaticamente o registro básico do cliente para evitar orçamentos órfãos.
  * Ao importar **Faturamento/Vendas**: registra a venda e gera/atualiza o título correspondente em `receivables` se houver saldo pendente (`remainingAmount > 0`), mantendo a integridade financeira do ERP.

### Agendamento do Backup no Servidor
* Em `server/backup.ts`, implementação da rotina `startBackupScheduler()`:
  * Executa uma verificação na inicialização do servidor.
  * Se o último backup automático tiver mais de 24 horas (ou nenhum existir), dispara imediatamente `createLocalBackupFile('auto')`.
  * Mantém um temporizador periódico de 1 hora para verificar a janela de 24 horas sem sobrecarregar a CPU.
  * Rotação segura de arquivos limitando a pasta `data/backups/` aos 20 arquivos mais recentes.

---

## 4. Arquitetura Técnica e Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (React)                               │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│   CustomersView      │      BudgetsView       │         SalesView          │
│   [+ Importar CSV]   │    [+ Importar CSV]    │      [+ Importar CSV]      │
└──────────┬───────────┴───────────┬────────────┴──────────────┬─────────────┘
           │                       │                           │
           └───────────────────────┼───────────────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │    CsvImportModal (Genérico) │
                    │ - Leitor CSV (BOM, ;, ,)     │
                    │ - Validador de Tipos/Campos  │
                    │ - Opção Ignorar / Atualizar  │
                    │ - Download de Modelos Oficiais│
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │        StorageService        │
                    │ - importCustomersFromData()  │
                    │ - importBudgetsFromData()    │
                    │ - importSalesFromData()      │
                    └──────────────┬───────────────┘
                                   │
                        Eventos de Sincronização
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express + SQLite)                          │
├────────────────────────────────────────────────────────────────────────────┤
│  POST /api/customers/batch   │  POST /api/budgets/batch                    │
│  POST /api/sales/batch       │  POST /api/backup/create                    │
│  GET  /api/backup/export     │  GET  /api/backup/list                      │
│  POST /api/backup/import     │  Scheduler Diário (server.ts)               │
├────────────────────────────────────────────────────────────────────────────┤
│ Banco de Dados Local: data/pdv_database.sqlite                             │
│ Diretório de Snapshots: data/backups/ (Máximo 20 arquivos)                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Roteiro de Implementação

1. **Camada de Validação e Utilitários CSV (`src/utils/csvImport.ts`)**:
   * Criar rotinas puras para:
     * Parser de CSV multi-delimitador (`,`, `;`) com suporte a aspas e quebras de linha.
     * Geradores de modelos oficiais CSV para Clientes, Orçamentos e Vendas/Faturamento.
     * Validadores específicos para cada uma das 3 entidades com lista detalhada de erros por linha.
2. **Componente Modal de Importação CSV (`src/components/common/CsvImportModal.tsx`)**:
   * Modal reutilizável e com alta consistência visual seguindo o design system do projeto.
   * Abas de preview, seletor de ação de duplicados, relatório de inconsistências e download de template.
3. **Integração nas Telas (`CustomersView`, `BudgetsView`, `SalesView`)**:
   * Adicionar o botão "Importar CSV" ao lado do botão existente "Exportar CSV" no cabeçalho de cada uma das três visões.
   * Conectar os callbacks de atualização para recarregar as tabelas e métricas instantaneamente.
4. **Agendador e Correção do Backup no Servidor (`server/backup.ts` e `server.ts`)**:
   * Implementar `startBackupScheduler()` e ligá-lo na inicialização do servidor em `server.ts`.
   * Assegurar que os métodos `createLocalBackupFile`, `listLocalBackups`, `exportDatabaseSnapshot` e `restoreDatabaseSnapshot` funcionem sem bloqueios de autenticação para o agendador interno.
5. **Painel de Gerenciamento de Backups na Aba Administrador (`SettingsView.tsx`)**:
   * Construir a seção "Cópia de Segurança e Backups" com acionamento manual, download de snapshot, restauração assistida e listagem dos backups salvos.
6. **Compilação e Verificação Geral**:
   * Executar `compile_applet` e validar ausência de erros de compilação ou tipos.
