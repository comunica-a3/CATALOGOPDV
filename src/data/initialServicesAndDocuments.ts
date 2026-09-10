import { DocumentTemplate, OnlineService } from '../types';

export const INITIAL_ONLINE_SERVICES: OnlineService[] = [
  {
    id: 'srv-detran-multas',
    name: 'Emissão de Multas e Débitos Veiculares (Detran)',
    category: 'Serviços Públicos',
    description: 'Consulta e emissão de guias de multas, IPVA e licenciamento veicular',
    url: 'https://www.detran.mg.gov.br/',
    price: 15.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-gov-br',
    name: 'Criação e Recuperação de Conta GOV.br',
    category: 'Governo',
    description: 'Acesso único do governo federal, aumento de nível prata/ouro e recuperação de senha',
    url: 'https://acesso.gov.br/',
    price: 20.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-agendamento-poupatempo',
    name: 'Agendamento Poupatempo / Sine / RG',
    category: 'Agendamentos',
    description: 'Agendamento de atendimento presencial para emissão de RG, CNH e serviços públicos',
    url: 'https://www.poupatempo.mg.gov.br/',
    price: 15.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-consulta-cpf-rfb',
    name: 'Consulta Situação Cadastral CPF (Receita Federal)',
    category: 'Consultas',
    description: 'Comprovante de situação cadastral no CPF junto à Receita Federal',
    url: 'https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp',
    price: 10.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-certidao-receita-federal',
    name: 'Certidão Negativa de Débitos (CND Receita Federal)',
    category: 'Documentos',
    description: 'Emissão de certidão de débitos relativos a créditos tributários federais e à dívida ativa da União',
    url: 'https://solucoes.receita.fazenda.gov.br/servicos/certidaointernet/pf/consultapf',
    price: 15.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-antecedentes-pf',
    name: 'Atestado de Antecedentes Criminais (Polícia Federal)',
    category: 'Documentos',
    description: 'Certidão de antecedentes criminais emitida online pela Polícia Federal',
    url: 'https://servicos.dpf.gov.br/antecedentes-criminais/certidao',
    price: 15.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-portal-empreendedor-mei',
    name: 'Portal do Empreendedor MEI (Abertura e Boletos DAS)',
    category: 'Governo',
    description: 'Inscrição MEI, emissão do DAS mensal e declaração anual do MEI (DASN)',
    url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor',
    price: 30.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-carteira-trabalho-digital',
    name: 'Carteira de Trabalho Digital (CTPS Digital)',
    category: 'Governo',
    description: 'Consulta aos contratos de trabalho registrados, PIS e abono salarial',
    url: 'https://www.gov.br/trabalho-e-emprego/pt-br/servicos/trabalhador/carteira-de-trabalho-digital',
    price: 20.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-quitacao-eleitoral-tse',
    name: 'Certidão de Quitação Eleitoral (TSE)',
    category: 'Documentos',
    description: 'Comprovante de regularidade com a Justiça Eleitoral para concursos e passaporte',
    url: 'https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral#/',
    price: 15.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'srv-consulta-processual-tjsp',
    name: 'Consulta Processual / Tribunal de Justiça',
    category: 'Consultas',
    description: 'Pesquisa de andamento de processos judiciais de 1º e 2º graus',
    url: 'https://esaj.tjsp.jus.br/cpopg/open.do',
    price: 15.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
];

export const INITIAL_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tmpl-curriculo-profissional',
    title: 'Currículo Profissional',
    category: 'Currículos',
    description: 'Modelo completo para apresentação profissional no mercado de trabalho',
    defaultPrice: 30.0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
    fields: [
      {
        id: 'nome_completo',
        label: 'Nome Completo',
        type: 'text',
        placeholder: 'Ex: Carlos Eduardo de Oliveira',
        required: true,
        customerFieldMapping: 'name',
      },
      {
        id: 'contato_email',
        label: 'E-mail',
        type: 'email',
        placeholder: 'carlos.oliveira@email.com',
        required: false,
        customerFieldMapping: 'email',
      },
      {
        id: 'contato_telefone',
        label: 'Telefone / WhatsApp',
        type: 'phone',
        placeholder: '(11) 98765-4321',
        required: true,
        customerFieldMapping: 'phone',
      },
      {
        id: 'cidade_estado',
        label: 'Cidade e Estado',
        type: 'text',
        placeholder: 'São Paulo - SP',
        required: true,
        customerFieldMapping: 'city',
      },
      {
        id: 'nacionalidade_estado_civil',
        label: 'Nacionalidade, Idade e Estado Civil',
        type: 'text',
        placeholder: 'Brasileiro(a), 28 anos, Solteiro(a)',
        required: false,
      },
      {
        id: 'bairro_endereco',
        label: 'Bairro / Região',
        type: 'text',
        placeholder: 'Centro / Zona Leste',
        required: false,
        customerFieldMapping: 'address',
      },
      {
        id: 'objetivo_profissional',
        label: 'Objetivo Profissional',
        type: 'textarea',
        placeholder: 'Ex: Atuar na área de Atendimento ao Cliente, Vendas ou Administração, agregando valor com pontualidade e dedicação.',
        required: true,
      },
      {
        id: 'resumo_qualificacoes',
        label: 'Resumo de Qualificações',
        type: 'textarea',
        placeholder: 'Ex: Profissional proativo com excelente comunicação interpessoal, facilidade no aprendizado de novos sistemas e foco em resultados.',
        required: false,
      },
      {
        id: 'experiencias_profissionais',
        label: 'Experiência Profissional',
        type: 'textarea',
        placeholder: `Ex:
• Empresa Alpha Comércio (2022 - 2024)
Cargo: Assistente de Atendimento
Principais atividades: Atendimento ao público, emissão de pedidos, controle de estoque e suporte pós-venda.

• Mercado Central (2020 - 2022)
Cargo: Operador de Caixa / Repositor
Principais atividades: Abertura e fechamento de caixa, organização e controle de mercadorias.`,
        required: true,
      },
      {
        id: 'formacao_academica',
        label: 'Formação Acadêmica / Escolaridade',
        type: 'textarea',
        placeholder: `Ex:
• Ensino Médio Completo - Escola Estadual Dr. Silva (Conclusão: 2019)
• Cursando Administração - UNIP (Previsão de Formatura: 2026)`,
        required: true,
      },
      {
        id: 'cursos_habilidades',
        label: 'Cursos Complementares e Habilidades',
        type: 'textarea',
        placeholder: `Ex:
• Pacote Office (Word, Excel, PowerPoint) - Nível Intermediário
• Atendimento ao Cliente e Técnicas de Vendas (40h) - SENAC
• Boa digitação e familiaridade com sistemas de PDV`,
        required: false,
      },
      {
        id: 'informacoes_adicionais',
        label: 'Informações Adicionais',
        type: 'text',
        placeholder: 'Ex: Disponibilidade para início imediato e para viagens / horários flexíveis.',
        required: false,
      },
    ],
    templateBody: `# {{nome_completo}}

**{{nacionalidade_estado_civil}}**
📍 {{cidade_estado}}{{#if bairro_endereco}} • {{bairro_endereco}}{{/if}}
📞 {{contato_telefone}} | ✉️ {{contato_email}}

---

### 🎯 OBJETIVO PROFISSIONAL
{{objetivo_profissional}}

{{#if resumo_qualificacoes}}
---

### 💡 RESUMO DE QUALIFICAÇÕES
{{resumo_qualificacoes}}
{{/if}}

---

### 💼 EXPERIÊNCIA PROFISSIONAL
{{experiencias_profissionais}}

---

### 🎓 FORMAÇÃO ACADÊMICA
{{formacao_academica}}

{{#if cursos_habilidades}}
---

### 🚀 CURSOS E HABILIDADES
{{cursos_habilidades}}
{{/if}}

{{#if informacoes_adicionais}}
---

### ℹ️ INFORMAÇÕES ADICIONAIS
{{informacoes_adicionais}}
{{/if}}
`,
  },
  {
    id: 'tmpl-contrato-prestacao-servicos',
    title: 'Contrato de Prestação de Serviços',
    category: 'Contratos',
    description: 'Contrato padrão de prestação de serviços com cláusulas de obrigações, prazos e pagamento',
    defaultPrice: 40.0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
    fields: [
      {
        id: 'contratante_nome',
        label: 'Nome / Razão Social do Contratante',
        type: 'text',
        placeholder: 'Nome completo ou Razão Social',
        required: true,
        customerFieldMapping: 'name',
      },
      {
        id: 'contratante_doc',
        label: 'CPF ou CNPJ do Contratante',
        type: 'text',
        placeholder: '000.000.000-00 ou 00.000.000/0001-00',
        required: true,
        customerFieldMapping: 'document',
      },
      {
        id: 'contratante_endereco',
        label: 'Endereço Completo do Contratante',
        type: 'text',
        placeholder: 'Rua, Número, Bairro, Cidade - UF',
        required: true,
        customerFieldMapping: 'address',
      },
      {
        id: 'contratado_nome',
        label: 'Nome / Razão Social do Contratado (Prestador)',
        type: 'text',
        placeholder: 'Nome completo do prestador de serviço',
        required: true,
      },
      {
        id: 'contratado_doc',
        label: 'CPF ou CNPJ do Contratado',
        type: 'text',
        placeholder: '000.000.000-00 ou 00.000.000/0001-00',
        required: true,
      },
      {
        id: 'contratado_endereco',
        label: 'Endereço Completo do Contratado',
        type: 'text',
        placeholder: 'Rua, Número, Bairro, Cidade - UF',
        required: true,
      },
      {
        id: 'objeto_servico',
        label: 'Descrição do Serviço Contratado (Objeto)',
        type: 'textarea',
        placeholder: 'Descreva detalhadamente o serviço a ser executado',
        required: true,
      },
      {
        id: 'valor_total',
        label: 'Valor Total dos Serviços (R$)',
        type: 'text',
        placeholder: 'Ex: R$ 1.500,00 (um mil e quinhentos reais)',
        required: true,
      },
      {
        id: 'forma_pagamento',
        label: 'Forma e Condições de Pagamento',
        type: 'textarea',
        placeholder: 'Ex: 50% de entrada no ato da assinatura via PIX e 50% na entrega final do serviço.',
        required: true,
      },
      {
        id: 'prazo_execucao',
        label: 'Prazo de Execução / Entrega',
        type: 'text',
        placeholder: 'Ex: 15 (quinze) dias úteis a contar da data de assinatura deste contrato.',
        required: true,
      },
      {
        id: 'cidade_foro',
        label: 'Cidade do Foro / Comarca',
        type: 'text',
        placeholder: 'São Paulo - SP',
        required: true,
        customerFieldMapping: 'city',
      },
      {
        id: 'data_contrato',
        label: 'Data do Contrato',
        type: 'text',
        placeholder: 'Ex: 27 de Agosto de 2026',
        required: true,
      },
    ],
    templateBody: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, de um lado:

**CONTRATANTE:** {{contratante_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{contratante_doc}}, residente e domiciliado(a) em {{contratante_endereco}}.

E de outro lado:

**CONTRATADO:** {{contratado_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{contratado_doc}}, residente e domiciliado(a) em {{contratado_endereco}}.

Têm, entre si, justo e contratado o que se segue:

### CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação, pelo CONTRATADO ao CONTRATANTE, dos seguintes serviços:
{{objeto_servico}}

### CLÁUSULA SEGUNDA - DO VALOR E FORMA DE PAGAMENTO
Pela prestação dos serviços ora contratados, o CONTRATANTE pagará ao CONTRATADO o valor total de **{{valor_total}}**, mediante as seguintes condições:
{{forma_pagamento}}

### CLÁUSULA TERCEIRA - DO PRAZO
O prazo estipulado para a conclusão e entrega dos serviços descritos na Cláusula Primeira é de **{{prazo_execucao}}**.

### CLÁUSULA QUARTA - DAS OBRIGAÇÕES
1. O CONTRATADO obriga-se a executar os serviços com diligência, técnica adequada e dentro dos padrões de qualidade esperados.
2. O CONTRATANTE obriga-se a fornecer todas as informações e subsídios necessários à realização dos trabalhos, bem como efetuar os pagamentos nas datas aprazadas.

### CLÁUSULA QUINTA - DO FORO
Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca de **{{cidade_foro}}**, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma.

**{{cidade_foro}}, {{data_contrato}}**


________________________________________________
**CONTRATANTE:** {{contratante_nome}}
CPF/CNPJ: {{contratante_doc}}


________________________________________________
**CONTRATADO:** {{contratado_nome}}
CPF/CNPJ: {{contratado_doc}}
`,
  },
  {
    id: 'tmpl-declaracao-residencia',
    title: 'Declaração de Residência',
    category: 'Declarações',
    description: 'Declaração formal de residência quando o comprovante de endereço não está no nome do solicitante',
    defaultPrice: 15.0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
    fields: [
      {
        id: 'declarante_nome',
        label: 'Nome do Titular do Imóvel (Declarante)',
        type: 'text',
        placeholder: 'Nome do titular da conta de luz/água',
        required: true,
      },
      {
        id: 'declarante_doc',
        label: 'CPF do Declarante',
        type: 'text',
        placeholder: '000.000.000-00',
        required: true,
      },
      {
        id: 'declarante_rg',
        label: 'RG do Declarante',
        type: 'text',
        placeholder: '00.000.000-0 SSP/SP',
        required: false,
      },
      {
        id: 'residente_nome',
        label: 'Nome da Pessoa que Reside no Imóvel (Beneficiário)',
        type: 'text',
        placeholder: 'Nome do cliente',
        required: true,
        customerFieldMapping: 'name',
      },
      {
        id: 'residente_doc',
        label: 'CPF do Beneficiário',
        type: 'text',
        placeholder: '000.000.000-00',
        required: true,
        customerFieldMapping: 'document',
      },
      {
        id: 'residente_rg',
        label: 'RG do Beneficiário',
        type: 'text',
        placeholder: '00.000.000-0 SSP/SP',
        required: false,
      },
      {
        id: 'endereco_completo',
        label: 'Endereço Completo do Imóvel',
        type: 'text',
        placeholder: 'Rua Exemplo, nº 123, Apto 45, Bairro Centro',
        required: true,
        customerFieldMapping: 'address',
      },
      {
        id: 'cidade_estado',
        label: 'Cidade e Estado',
        type: 'text',
        placeholder: 'São Paulo - SP',
        required: true,
        customerFieldMapping: 'city',
      },
      {
        id: 'cep',
        label: 'CEP',
        type: 'text',
        placeholder: '01001-000',
        required: false,
      },
      {
        id: 'data_declaracao',
        label: 'Data da Declaração',
        type: 'text',
        placeholder: '27 de Agosto de 2026',
        required: true,
      },
    ],
    templateBody: `# DECLARAÇÃO DE RESIDÊNCIA

Eu, **{{declarante_nome}}**, inscrito(a) no CPF sob o nº **{{declarante_doc}}**{{#if declarante_rg}}, portador(a) do RG nº {{declarante_rg}}{{/if}}, titular e responsável pelo imóvel situado em:

📍 **{{endereco_completo}}**
Cidade: **{{cidade_estado}}**{{#if cep}} | CEP: **{{cep}}**{{/if}}

DECLARO, para os devidos fins de direito e sob as penas da Lei nº 7.115/1983 e do Artigo 299 do Código Penal Brasileiro (Falsidade Ideológica), que:

O(A) Sr.(a) **{{residente_nome}}**, inscrito(a) no CPF sob o nº **{{residente_doc}}**{{#if residente_rg}}, portador(a) do RG nº {{residente_rg}}{{/if}}, **RESIDE E DOMICILIA-SE NO REFERIDO ENDEREÇO** citado acima.

Por ser a mais pura expressão da verdade, firmo a presente declaração para que produza seus efeitos legais e jurídicos.

**{{cidade_estado}}, {{data_declaracao}}**


________________________________________________
**{{declarante_nome}}**
CPF: {{declarante_doc}}
(Declarante / Titular do Imóvel)


________________________________________________
**{{residente_nome}}**
CPF: {{residente_doc}}
(Residente / Solicitante)
`,
  },
  {
    id: 'tmpl-procuracao-simples',
    title: 'Procuração Simples (Poderes Específicos)',
    category: 'Procurações',
    description: 'Instrumento particular de mandato para representação perante órgãos públicos, empresas e cartórios',
    defaultPrice: 25.0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
    fields: [
      {
        id: 'outorgante_nome',
        label: 'Nome do Outorgante (Quem concede os poderes)',
        type: 'text',
        placeholder: 'Nome completo',
        required: true,
        customerFieldMapping: 'name',
      },
      {
        id: 'outorgante_doc',
        label: 'CPF do Outorgante',
        type: 'text',
        placeholder: '000.000.000-00',
        required: true,
        customerFieldMapping: 'document',
      },
      {
        id: 'outorgante_rg',
        label: 'RG do Outorgante',
        type: 'text',
        placeholder: '00.000.000-0 SSP/SP',
        required: false,
      },
      {
        id: 'outorgante_endereco',
        label: 'Endereço do Outorgante',
        type: 'text',
        placeholder: 'Rua, Número, Bairro, Cidade - UF',
        required: true,
        customerFieldMapping: 'address',
      },
      {
        id: 'outorgado_nome',
        label: 'Nome do Outorgado (Procurador / Representante)',
        type: 'text',
        placeholder: 'Nome do procurador',
        required: true,
      },
      {
        id: 'outorgado_doc',
        label: 'CPF do Outorgado',
        type: 'text',
        placeholder: '000.000.000-00',
        required: true,
      },
      {
        id: 'outorgado_rg',
        label: 'RG do Outorgado',
        type: 'text',
        placeholder: '00.000.000-0 SSP/SP',
        required: false,
      },
      {
        id: 'outorgado_endereco',
        label: 'Endereço do Outorgado',
        type: 'text',
        placeholder: 'Rua, Número, Bairro, Cidade - UF',
        required: true,
      },
      {
        id: 'poderes_especificos',
        label: 'Poderes Concedidos / Finalidade',
        type: 'textarea',
        placeholder: 'Ex: amplos poderes para representá-lo junto ao DETRAN/SP e Poupatempo, exclusivamente para dar entrada, requerer, retirar segunda via de documentos do veículo placa ABC-1234, assinar requerimentos e praticar os atos necessários ao fiel cumprimento deste mandato.',
        required: true,
      },
      {
        id: 'cidade_data',
        label: 'Cidade e Data',
        type: 'text',
        placeholder: 'São Paulo - SP, 27 de Agosto de 2026',
        required: true,
      },
    ],
    templateBody: `# PROCURAÇÃO PARTICULAR

**OUTORGANTE:**
Nome: **{{outorgante_nome}}**, inscrito(a) no CPF sob o nº **{{outorgante_doc}}**{{#if outorgante_rg}}, portador(a) do RG nº {{outorgante_rg}}{{/if}}, residente e domiciliado(a) em {{outorgante_endereco}}.

**OUTORGADO(A):**
Nome: **{{outorgado_nome}}**, inscrito(a) no CPF sob o nº **{{outorgado_doc}}**{{#if outorgado_rg}}, portador(a) do RG nº {{outorgado_rg}}{{/if}}, residente e domiciliado(a) em {{outorgado_endereco}}.

**PODERES:**
Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) seu(sua) bastante procurador(a), conferindo-lhe poderes especiais para:

{{poderes_especificos}}

Podendo para tanto assinar termos, requerimentos, guias, dar e receber quitação, retirar certidões e documentos pertinentes, praticando, enfim, todos os atos indispensáveis e necessários ao fiel e cabal desempenho do presente mandato, que dará tudo por bom, firme e valioso.

**{{cidade_data}}**


________________________________________________
**{{outorgante_nome}}**
CPF: {{outorgante_doc}}
(Outorgante)
`,
  },
  {
    id: 'tmpl-recibo-simples',
    title: 'Recibo de Pagamento / Prestação',
    category: 'Recibos',
    description: 'Comprovante de recebimento de valores em moeda corrente ou transferência para transações e serviços',
    defaultPrice: 10.0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
    fields: [
      {
        id: 'recebedor_nome',
        label: 'Nome de Quem Recebeu (Emissor)',
        type: 'text',
        placeholder: 'Nome completo ou Razão Social',
        required: true,
      },
      {
        id: 'recebedor_doc',
        label: 'CPF/CNPJ do Emissor',
        type: 'text',
        placeholder: '000.000.000-00',
        required: true,
      },
      {
        id: 'pagador_nome',
        label: 'Nome de Quem Pagou (Cliente/Pagador)',
        type: 'text',
        placeholder: 'Nome completo do pagador',
        required: true,
        customerFieldMapping: 'name',
      },
      {
        id: 'pagador_doc',
        label: 'CPF/CNPJ do Pagador',
        type: 'text',
        placeholder: '000.000.000-00',
        required: false,
        customerFieldMapping: 'document',
      },
      {
        id: 'valor_reais',
        label: 'Valor Numérico (R$)',
        type: 'text',
        placeholder: 'R$ 450,00',
        required: true,
      },
      {
        id: 'valor_extenso',
        label: 'Valor por Extenso',
        type: 'text',
        placeholder: 'quatrocentos e cinquenta reais',
        required: true,
      },
      {
        id: 'referente_a',
        label: 'Referente ao Pagamento de',
        type: 'textarea',
        placeholder: 'Ex: Prestação de serviços de impressão gráfica de 1.000 panfletos e criação de arte visual.',
        required: true,
      },
      {
        id: 'cidade_data',
        label: 'Cidade e Data',
        type: 'text',
        placeholder: 'São Paulo - SP, 27 de Agosto de 2026',
        required: true,
      },
    ],
    templateBody: `# RECIBO DE PAGAMENTO

**VALOR:** {{valor_reais}} ({{valor_extenso}})

Recebi(emos) de **{{pagador_nome}}**{{#if pagador_doc}}, inscrito(a) no CPF/CNPJ sob o nº **{{pagador_doc}}**{{/if}}, a importância supra de **{{valor_reais}}** ({{valor_extenso}}), referente a:

{{referente_a}}

Para maior clareza e comprovação, firmo(amos) o presente recibo dando plena, rasa e geral quitação pela quantia recebida.

**{{cidade_data}}**


________________________________________________
**{{recebedor_nome}}**
CPF/CNPJ: {{recebedor_doc}}
`,
  },
  {
    id: 'tmpl-requerimento-administrativo',
    title: 'Requerimento / Solicitação Administrativa',
    category: 'Requerimentos',
    description: 'Solicitação formal endereçada a órgãos públicos, prefeituras, escolas ou empresas',
    defaultPrice: 20.0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
    fields: [
      {
        id: 'destinatario_orgao',
        label: 'Órgão / Autoridade Destinatária',
        type: 'text',
        placeholder: 'Ex: Ao Ilmo. Senhor Diretor do Departamento de Trânsito / Prefeitura Municipal',
        required: true,
      },
      {
        id: 'requerente_nome',
        label: 'Nome Completo do Requerente',
        type: 'text',
        placeholder: 'Nome do solicitante',
        required: true,
        customerFieldMapping: 'name',
      },
      {
        id: 'requerente_doc',
        label: 'CPF do Requerente',
        type: 'text',
        placeholder: '000.000.000-00',
        required: true,
        customerFieldMapping: 'document',
      },
      {
        id: 'requerente_rg',
        label: 'RG do Requerente',
        type: 'text',
        placeholder: '00.000.000-0',
        required: false,
      },
      {
        id: 'requerente_endereco',
        label: 'Endereço do Requerente',
        type: 'text',
        placeholder: 'Rua, Número, Bairro, Cidade - UF',
        required: true,
        customerFieldMapping: 'address',
      },
      {
        id: 'contato_fone_email',
        label: 'Telefone e E-mail para Contato',
        type: 'text',
        placeholder: '(11) 98765-4321 | email@exemplo.com',
        required: false,
        customerFieldMapping: 'phone',
      },
      {
        id: 'objeto_pedido',
        label: 'Objeto da Solicitação (O que está sendo requerido)',
        type: 'textarea',
        placeholder: 'Ex: Vem respeitosamente requerer a emissão de 2ª via do histórico escolar / cancelamento de cobrança indevida / certidão de tempo de serviço.',
        required: true,
      },
      {
        id: 'justificativa',
        label: 'Justificativa / Fatos Explicativos',
        type: 'textarea',
        placeholder: 'Ex: O requerente necessita do referido documento para fins de comprovação junto à instituição de ensino superior.',
        required: false,
      },
      {
        id: 'cidade_data',
        label: 'Cidade e Data',
        type: 'text',
        placeholder: 'São Paulo - SP, 27 de Agosto de 2026',
        required: true,
      },
    ],
    templateBody: `# REQUERIMENTO

**{{destinatario_orgao}}**

**REQUERENTE:**
Nome: **{{requerente_nome}}**, inscrito(a) no CPF sob o nº **{{requerente_doc}}**{{#if requerente_rg}}, portador(a) do RG nº {{requerente_rg}}{{/if}}, residente e domiciliado(a) em {{requerente_endereco}}{{#if contato_fone_email}}, contato: {{contato_fone_email}}{{/if}}.

Vem, mui respeitosamente, à presença de V. Sa., expor e **REQUERER** o quanto segue:

{{objeto_pedido}}

{{#if justificativa}}
**DOS MOTIVOS E JUSTIFICATIVAS:**
{{justificativa}}
{{/if}}

Nestes termos,
Pede e aguarda deferimento.

**{{cidade_data}}**


________________________________________________
**{{requerente_nome}}**
CPF: {{requerente_doc}}
`,
  },
  {
    id: 'tmpl-carta-demissao',
    title: 'Carta de Demissão / Pedido de Rescisão',
    category: 'Cartas',
    description: 'Comunicação formal de desligamento voluntário de emprego com opção de aviso prévio',
    defaultPrice: 15.0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
    fields: [
      {
        id: 'empresa_nome',
        label: 'Nome da Empresa / Empregador',
        type: 'text',
        placeholder: 'Ex: Comércio e Serviços Ltda',
        required: true,
      },
      {
        id: 'empregado_nome',
        label: 'Nome do Empregado',
        type: 'text',
        placeholder: 'Nome completo',
        required: true,
        customerFieldMapping: 'name',
      },
      {
        id: 'empregado_cpf',
        label: 'CPF do Empregado',
        type: 'text',
        placeholder: '000.000.000-00',
        required: true,
        customerFieldMapping: 'document',
      },
      {
        id: 'cargo_funcao',
        label: 'Cargo / Função Desempenhada',
        type: 'text',
        placeholder: 'Ex: Auxiliar Administrativo',
        required: true,
      },
      {
        id: 'aviso_previo_opcao',
        label: 'Cumprimento do Aviso Prévio',
        type: 'select',
        options: [
          'Solicito a dispensa do cumprimento do aviso prévio',
          'Cumprirei integralmente o período de 30 dias de aviso prévio',
        ],
        required: true,
      },
      {
        id: 'cidade_data',
        label: 'Cidade e Data',
        type: 'text',
        placeholder: 'São Paulo - SP, 27 de Agosto de 2026',
        required: true,
      },
    ],
    templateBody: `# CARTA DE PEDIDO DE DEMISSÃO

À
**{{empresa_nome}}**

Prezados Senhores,

Venho por meio desta comunicar formalmente o meu **PEDIDO DE DEMISSÃO** do cargo de **{{cargo_funcao}}**, o qual venho desempenhando nesta empresa.

Informo que, por motivos estritamente pessoais e profissionais, opto pelo encerramento de minhas atividades laborais.

Em relação ao aviso prévio: **{{aviso_previo_opcao}}**.

Agradeço à direção e aos colegas de trabalho pela oportunidade, aprendizado e convivência durante o período em que fiz parte desta organização.

**{{cidade_data}}**


________________________________________________
**{{empregado_nome}}**
CPF: {{empregado_cpf}}
(Empregado)


________________________________________________
**CIENTE DO EMPREGADOR:**
Em: ____ / ____ / ________
Assinatura / Carimbo do Responsável
`,
  },
];
