import {
  ApproachMessageTemplate,
  CaptureFormConfig,
  ComplementaryProductRule,
  Opportunity,
  ProductPackage,
  PublicSegmentPage,
  SegmentSuggestionRule,
} from '../types';

export const INITIAL_OPPORTUNITIES: Opportunity[] = [];

export const INITIAL_PACKAGES: ProductPackage[] = [
  {
    id: 'pkg-novo-negocio',
    name: 'Kit Novo Negócio & Abertura',
    description: 'Tudo o que uma empresa nova precisa para abrir as portas com presença profissional: cartões, panfletos de inauguração, banner e talão de recibo/comanda.',
    targetSegment: 'Comércio & Serviços Gerais',
    originalTotal: 380.0,
    packagePrice: 319.0,
    discountPercent: 16,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: 'prod-cartao-couche-1000',
        itemName: '1.000 Cartões de Visita Couchê 250g (Verniz Total Frente)',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 85.0,
        totalPrice: 85.0,
      },
      {
        itemId: 'prod-panfleto-10x14-1000',
        itemName: '1.000 Panfletos 10x14cm Couchê 90g (4x0 Colorido)',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 120.0,
        totalPrice: 120.0,
      },
      {
        itemId: 'prod-banner-lona-80x120',
        itemName: 'Banner em Lona 80x120cm c/ Bastão e Cordão',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 95.0,
        totalPrice: 95.0,
      },
      {
        itemId: 'prod-talao-recibo-100fls',
        itemName: 'Bloco/Talão Personalizado 100 Folhas 1 Via (10x15cm)',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 2,
        unitPrice: 40.0,
        totalPrice: 80.0,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pkg-restaurante-food',
    name: 'Kit Restaurante, Bar & Lanchonete',
    description: 'Solução completa para alimentação: cardápios resistentes, panfletos de delivery para distribuição, comandas e ímãs de geladeira.',
    targetSegment: 'Restaurante & Lanchonete',
    originalTotal: 460.0,
    packagePrice: 389.0,
    discountPercent: 15,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: 'prod-panfleto-10x14-2500',
        itemName: '2.500 Panfletos de Delivery 10x14cm Couchê 90g',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 180.0,
        totalPrice: 180.0,
      },
      {
        itemId: 'prod-cardapio-plastificado-a4',
        itemName: '10 Cardápios A4 Plastificação Rígida Polaseal',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 10,
        unitPrice: 15.0,
        totalPrice: 150.0,
      },
      {
        itemId: 'prod-ima-geladeira-500',
        itemName: '500 Ímãs de Geladeira com Calendário/Contato',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 130.0,
        totalPrice: 130.0,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pkg-salao-beleza',
    name: 'Kit Salão de Beleza, Estética & Barbearia',
    description: 'Aumente o retorno e a fidelização das suas clientes com cartões fidelidade, tags de produtos e banners promocionais dos serviços.',
    targetSegment: 'Salão de Beleza & Estética',
    originalTotal: 290.0,
    packagePrice: 245.0,
    discountPercent: 15,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: 'prod-cartao-fidelidade-1000',
        itemName: '1.000 Cartões Fidelidade Personalizados (Frente e Verso)',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 110.0,
        totalPrice: 110.0,
      },
      {
        itemId: 'prod-banner-tabela-precos',
        itemName: 'Banner Tabela de Serviços & Valores 60x90cm',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 75.0,
        totalPrice: 75.0,
      },
      {
        itemId: 'prod-adesivos-redondos-500',
        itemName: '500 Adesivos Redondos Vinil para Embalagens e Mimos',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 105.0,
        totalPrice: 105.0,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pkg-eventos-festas',
    name: 'Kit Eventos, Shows & Festas',
    description: 'Tudo para o seu evento bombar: ingressos de segurança/pulseiras, cartazes de divulgação, crachás e faixas/banners.',
    targetSegment: 'Eventos & Festas',
    originalTotal: 520.0,
    packagePrice: 439.0,
    discountPercent: 16,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: 'prod-cartaz-a3-100',
        itemName: '100 Cartazes A3 Couchê Brilho para Divulgação',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 160.0,
        totalPrice: 160.0,
      },
      {
        itemId: 'prod-pulseiras-500',
        itemName: '500 Pulseiras de Identificação Tyvek com Lacre Antifraude',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 140.0,
        totalPrice: 140.0,
      },
      {
        itemId: 'prod-banner-evento-100x150',
        itemName: 'Banner Fotográfico em Lona 100x150cm c/ Acabamento',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 120.0,
        totalPrice: 120.0,
      },
      {
        itemId: 'prod-crachas-credenciais-20',
        itemName: '20 Credenciais em PVC com Cordão Personalizado',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 100.0,
        totalPrice: 100.0,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pkg-autonomo-profissional',
    name: 'Kit Profissional Liberal & Autônomo',
    description: 'Destaque sua autoridade profissional: cartões de visita premium, bloco de receituário/proposta e pasta personalizada.',
    targetSegment: 'Profissional Autônomo & Saúde',
    originalTotal: 310.0,
    packagePrice: 260.0,
    discountPercent: 16,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: 'prod-cartao-premium-1000',
        itemName: '1.000 Cartões de Visita Premium Couchê 300g Laminação Fosca',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 110.0,
        totalPrice: 110.0,
      },
      {
        itemId: 'prod-bloco-receituario-5x',
        itemName: '5 Blocos de Receituário / Relatório (50 Folhas cada)',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 90.0,
        totalPrice: 90.0,
      },
      {
        itemId: 'prod-pastas-personalizadas-50',
        itemName: '50 Pastas com Bolsa Interna para Propostas e Laudos',
        itemType: 'PRODUTO_GRAFICO',
        quantity: 1,
        unitPrice: 110.0,
        totalPrice: 110.0,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_APPROACH_TEMPLATES: ApproachMessageTemplate[] = [
  {
    id: 'tpl-1',
    title: '1ª Abordagem — Negócio Local / Novo Estabelecimento',
    category: 'Primeiro Contato',
    targetStage: 'A_CONTATAR',
    templateText: `Olá, [NOME]! Tudo bem?

Me chamo [VENDEDOR], da *[EMPRESA]*. Notei a presença do *[NOME_DO_NEGOCIO]* aqui na nossa região e gostaria de parabenizá-los!

Estamos com condições especiais em materiais gráficos e comunicação visual (como cartões de visita, banners, panfletos e adesivos) para ajudar a movimentar ainda mais as suas vendas.

Vocês têm alguma demanda de impressão ou divulgação prevista para os próximos dias? Posso montar uma simulação sem compromisso!`,
    isDefault: true,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-2',
    title: 'Apresentação de Pacote — Kit Promocional',
    category: 'Oferta de Pacote',
    targetStage: 'INTERESSADO',
    templateText: `Olá, [NOME]! Como você está?

Aqui é o [VENDEDOR] da *[EMPRESA]*.

Pensando nas necessidades do seu segmento de *[NECESSIDADE]*, preparamos uma solução completa: o *[PACOTE_SUGERIDO]*. 

Com ele, você garante todos os materiais essenciais com um desconto especial de lançamento e agilidade na entrega!

Gostaria de dar uma olhada na composição e nos valores desse kit?`,
    isDefault: true,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-3',
    title: 'Follow-up / Retorno de Orçamento Enviado',
    category: 'Pós-Orçamento',
    targetStage: 'ORCAMENTO',
    templateText: `Olá, [NOME]! Tudo bem?

Aqui é o [VENDEDOR] da *[EMPRESA]*.

Passando para saber se você conseguiu avaliar a proposta de orçamento que te enviei recentemente. 

Ficou com alguma dúvida sobre os prazos de produção, acabamentos ou formas de pagamento facilitadas? 

Estamos com a fila de produção aberta para essa semana e consigo priorizar o seu pedido se confirmarmos hoje!`,
    isDefault: true,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-4',
    title: 'Retomada de Contato / Lead Antigo',
    category: 'Retorno',
    targetStage: 'CONTATADO',
    templateText: `Oi, [NOME], tudo bem?

É o [VENDEDOR] da *[EMPRESA]*.

Estou revisando meus contatos e lembrei da nossa conversa sobre as demandas do *[NOME_DO_NEGOCIO]*. 

Como estão os materiais de divulgação de vocês no momento? Precisando repor cartões, panfletos, adesivos ou faixas, temos condições especiais para clientes da nossa região!

Se precisar de qualquer orçamento rápido, estou 100% à disposição!`,
    isDefault: false,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-5',
    title: 'Abordagem Rápida — WhatsApp Direto',
    category: 'Primeiro Contato',
    targetStage: 'A_CONTATAR',
    templateText: `Olá, [NOME]! Tudo bem?
Aqui é o [VENDEDOR] da *[EMPRESA]*.

Trabalhamos com produção rápida de cartões, panfletos, banners, comandas e comunicação visual para empresas e comércios da nossa cidade.

Se precisar de orçamento rápido com preço direto de fábrica, é só me mandar o que você precisa que calculo na hora para você!`,
    isDefault: false,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_SEGMENT_SUGGESTIONS: SegmentSuggestionRule[] = [
  {
    id: 'sug-1',
    segment: 'Salão de Beleza & Estética',
    need: 'Melhorar a divulgação',
    recommendedProductIds: [],
    recommendedPackageIds: ['pkg-salao-beleza'],
    notes: 'Recomendar cartões fidelidade, tags e banner de tabela de preços.',
  },
  {
    id: 'sug-2',
    segment: 'Restaurante & Lanchonete',
    need: 'Precisa de material gráfico',
    recommendedProductIds: [],
    recommendedPackageIds: ['pkg-restaurante-food'],
    notes: 'Recomendar cardápios plastificados, panfletos de delivery e ímãs de geladeira.',
  },
  {
    id: 'sug-3',
    segment: 'Comércio & Serviços Gerais',
    need: 'Possui negócio novo',
    recommendedProductIds: [],
    recommendedPackageIds: ['pkg-novo-negocio'],
    notes: 'Apresentar Kit Novo Negócio com cartões, panfletos e banner.',
  },
  {
    id: 'sug-4',
    segment: 'Eventos & Festas',
    need: 'Vai realizar um evento',
    recommendedProductIds: [],
    recommendedPackageIds: ['pkg-eventos-festas'],
    notes: 'Recomendar pulseiras tyvek, ingressos com canhoto, cartazes A3 e banners.',
  },
  {
    id: 'sug-5',
    segment: 'Profissional Autônomo & Saúde',
    need: 'Precisa de cartões',
    recommendedProductIds: [],
    recommendedPackageIds: ['pkg-autonomo-profissional'],
    notes: 'Recomendar cartões 300g laminação fosca, blocos de receituário e pastas.',
  },
];

export const INITIAL_COMPLEMENTARY_RULES: ComplementaryProductRule[] = [
  {
    id: 'comp-1',
    baseItemId: 'cartoes',
    baseItemName: 'Cartão de Visita',
    suggestedItemIds: ['panfletos', 'adesivos', 'banners'],
    notes: 'Quem faz cartão quase sempre precisa de panfletos para divulgação e adesivos para produtos.',
  },
  {
    id: 'comp-2',
    baseItemId: 'panfletos',
    baseItemName: 'Panfleto / Folheto',
    suggestedItemIds: ['cartoes', 'banners', 'imas'],
    notes: 'Complementar com ímãs de geladeira e banners para ponto de venda.',
  },
  {
    id: 'comp-3',
    baseItemId: 'banners',
    baseItemName: 'Banner em Lona / Faixa',
    suggestedItemIds: ['panfletos', 'cartoes', 'adesivos'],
    notes: 'Complementar com adesivos de vitrine e cartões de balcão.',
  },
  {
    id: 'comp-4',
    baseItemId: 'cardapios',
    baseItemName: 'Cardápio / Menu',
    suggestedItemIds: ['panfletos', 'imas', 'comandas'],
    notes: 'Complementar com talões de comanda e panfletos de delivery.',
  },
];

export const INITIAL_PUBLIC_SEGMENT_PAGES: PublicSegmentPage[] = [
  {
    id: 'seg-saloes',
    slug: 'saloes-e-estetica',
    segment: 'Salões de Beleza & Clínicas de Estética',
    title: 'Soluções Gráficas e Visuais para Salões de Beleza & Estética',
    headline: 'Encante suas clientes e aumente o retorno aos seus atendimentos',
    description: 'Materiais profissionais criados sob medida para salões, barbearias, esmalterias e clínicas de estética: cartões fidelidade, tabelas de serviços, banners e adesivos para embalagens.',
    badgeText: '⭐ Especial para Estética & Beleza',
    suggestedPackageIds: ['pkg-salao-beleza'],
    suggestedProductIds: [],
    formId: 'form-geral',
    ctaButtonText: 'Solicitar Orçamento para Salão',
    active: true,
    isDefault: true,
  },
  {
    id: 'seg-restaurantes',
    slug: 'restaurantes-e-delivery',
    segment: 'Restaurantes, Bares, Lanchonetes & Delivery',
    title: 'Materiais Gráficos de Alto Impacto para Gastronomia',
    headline: 'Venda mais todos os dias no salão e no delivery',
    description: 'Cardápios resistentes e fáceis de limpar, panfletos de entrega com alta conversão, ímãs de geladeira e comandas personalizadas.',
    badgeText: '🍔 Soluções para Gastronomia',
    suggestedPackageIds: ['pkg-restaurante-food'],
    suggestedProductIds: [],
    formId: 'form-geral',
    ctaButtonText: 'Solicitar Orçamento para Gastronomia',
    active: true,
    isDefault: true,
  },
  {
    id: 'seg-abertura',
    slug: 'novos-negocios',
    segment: 'Abertura de Negócios & Empresas',
    title: 'Kit Completo de Inauguração e Divulgação Comercial',
    headline: 'Abra as portas com presença profissional desde o primeiro dia',
    description: 'Tudo o que sua nova empresa precisa reunido em um único pacote econômico: cartões de visita, panfletos de divulgação, banner de fachada e blocos de atendimento.',
    badgeText: '🚀 Kit Abertura de Negócio',
    suggestedPackageIds: ['pkg-novo-negocio'],
    suggestedProductIds: [],
    formId: 'form-geral',
    ctaButtonText: 'Pedir Orçamento de Inauguração',
    active: true,
    isDefault: true,
  },
  {
    id: 'seg-eventos',
    slug: 'eventos-e-shows',
    segment: 'Eventos, Shows, Festas & Congressos',
    title: 'Materiais Completos para Eventos, Festas e Feiras',
    headline: 'Segurança, divulgação e credenciamento impecável para seu público',
    description: 'Pulseiras de identificação tyvek, ingressos com canhoto e itens antifraude, cartazes A3 de divulgação, crachás PVC e banners promocionais.',
    badgeText: '🎉 Soluções para Eventos',
    suggestedPackageIds: ['pkg-eventos-festas'],
    suggestedProductIds: [],
    formId: 'form-geral',
    ctaButtonText: 'Solicitar Orçamento para Evento',
    active: true,
    isDefault: true,
  },
  {
    id: 'seg-autonomos',
    slug: 'autonomos-e-profissionais',
    segment: 'Profissionais Liberais, Saúde & Autônomos',
    title: 'Presença e Autoridade para Profissionais Autônomos',
    headline: 'Transmita credibilidade e confiança em cada atendimento',
    description: 'Cartões de visita com acabamentos nobres, blocos de receituário e laudos, pastas personalizadas e impressões em alta definição.',
    badgeText: '💼 Linha Corporativa',
    suggestedPackageIds: ['pkg-autonomo-profissional'],
    suggestedProductIds: [],
    formId: 'form-geral',
    ctaButtonText: 'Solicitar Orçamento Profissional',
    active: true,
    isDefault: true,
  },
];

export const INITIAL_CAPTURE_FORMS: CaptureFormConfig[] = [
  {
    id: 'form-geral',
    slug: 'orcamento-geral',
    internalName: 'Formulário Geral de Solicitação de Orçamento',
    title: 'Solicitar Orçamento Online',
    description: 'Preencha os campos abaixo com as informações do seu pedido para receber uma cotação rápida da nossa equipe.',
    submitButtonText: 'Enviar Solicitação de Orçamento',
    successMessage: 'Recebemos sua solicitação de orçamento com sucesso! Nossa equipe entrará em contato em breve via WhatsApp.',
    active: true,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    fields: [
      {
        id: 'fld-name',
        name: 'name',
        label: 'Nome ou Empresa',
        type: 'name',
        required: true,
        order: 1,
        placeholder: 'Ex: João Silva ou Bella Vista Estética',
      },
      {
        id: 'fld-contact',
        name: 'contactName',
        label: 'Nome do Responsável / Contato',
        type: 'text',
        required: false,
        order: 2,
        placeholder: 'Ex: João',
      },
      {
        id: 'fld-phone',
        name: 'phone',
        label: 'WhatsApp com DDD',
        type: 'whatsapp',
        required: true,
        order: 3,
        placeholder: '(00) 00000-0000',
      },
      {
        id: 'fld-email',
        name: 'email',
        label: 'E-mail de Contato',
        type: 'email',
        required: false,
        order: 4,
        placeholder: 'contato@suaempresa.com.br',
      },
      {
        id: 'fld-segment',
        name: 'segment',
        label: 'Ramo de Atuação / Segmento',
        type: 'text',
        required: false,
        order: 5,
        placeholder: 'Ex: Restaurante, Barbearia, Escritório, Eventos...',
      },
      {
        id: 'fld-need',
        name: 'need',
        label: 'Produto ou Demanda Principal',
        type: 'select',
        required: true,
        order: 6,
        options: [
          'Cartões de Visita',
          'Panfletos / Folders / Flyers',
          'Banners & Lonas Promocionais',
          'Adesivos & Rótulos Personalizados',
          'Cardápios & Menus',
          'Talões & Documentos Personalizados',
          'Fachada & Placas de Sinalização',
          'Kit Completo de Divulgação',
          'Outro Produto ou Projeto Especial',
        ],
        defaultValue: 'Cartões de Visita',
      },
      {
        id: 'fld-quantity',
        name: 'quantity',
        label: 'Quantidade Estimada',
        type: 'text',
        required: false,
        order: 7,
        placeholder: 'Ex: 1000 unidades, 2 banners, etc.',
      },
      {
        id: 'fld-deadline',
        name: 'deadline',
        label: 'Prazo Desejado',
        type: 'select',
        required: false,
        order: 8,
        options: [
          'Sem pressa / Normal (3 a 5 dias úteis)',
          'Urgente (até 48h)',
          'Imediato / Hoje',
        ],
        defaultValue: 'Sem pressa / Normal (3 a 5 dias úteis)',
      },
      {
        id: 'fld-description',
        name: 'description',
        label: 'Detalhes ou Informações do Pedido',
        type: 'textarea',
        required: false,
        order: 9,
        placeholder: 'Descreva medidas, cores, acabamentos ou qualquer especificação importante...',
      },
    ],
  },
];
