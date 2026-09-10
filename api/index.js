// server/serverless.ts
import express2 from "express";

// server/db.ts
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

// src/data/importedProducts.ts
var OFFICIAL_CATEGORIES = [
  {
    id: "cat-servicos",
    name: "Servi\xE7os loja",
    slug: "servicos-loja",
    description: "Servi\xE7os digitais, consultas, documentos e atendimento de balc\xE3o",
    itemType: "SERVICO"
  },
  {
    id: "cat-adesivos",
    name: "Adesivos",
    slug: "adesivos",
    description: "Adesivos vinil, BOPP, etiquetas escolares e DTF UV",
    itemType: "PRODUTO_GRAFICO"
  },
  {
    id: "cat-impressos",
    name: "Impressos",
    slug: "impressos",
    description: "Fotos, certificados, credenciais, convites e impress\xF5es gerais",
    itemType: "PRODUTO_GRAFICO"
  },
  {
    id: "cat-panfletos",
    name: "Panfletos",
    slug: "panfletos",
    description: "Panfletos promocionais e folhetos em diversos tamanhos e gramaturas",
    itemType: "PRODUTO_GRAFICO"
  },
  {
    id: "cat-cartoes",
    name: "Cart\xF5es de visita",
    slug: "cartoes-de-visita",
    description: "Cart\xF5es de visita couch\xEA 250g/300g, mini cart\xF5es e tags",
    itemType: "PRODUTO_GRAFICO"
  },
  {
    id: "cat-blocos",
    name: "Blocos e comandas",
    slug: "blocos-e-comandas",
    description: "Tal\xF5es de recibo, comandas, folhas blocadas para or\xE7amento e rifas",
    itemType: "PRODUTO_GRAFICO"
  },
  {
    id: "cat-banners",
    name: "Banners e Comunica\xE7\xE3o Visual",
    slug: "banners-comunicacao-visual",
    description: "Wind banner, banners em lona, placas de sinaliza\xE7\xE3o e \xEDm\xE3s de geladeira",
    itemType: "PRODUTO_GRAFICO"
  },
  {
    id: "cat-embalagens",
    name: "Embalagens",
    slug: "embalagens",
    description: "Sacolas personalizadas e materiais promocionais de embalagem",
    itemType: "PRODUTO_GRAFICO"
  }
];
var FREIGHT = 20;
function calcProfit(salePrice, isService = false) {
  const supplierCost = Number((salePrice / 2).toFixed(2));
  const supplierFreight = isService ? 0 : FREIGHT;
  const costPrice = Number((supplierCost + supplierFreight).toFixed(2));
  const marginReais = Number((salePrice - costPrice).toFixed(2));
  const marginPercent = salePrice > 0 ? Number((marginReais / salePrice * 100).toFixed(2)) : 0;
  return { supplierCost, supplierFreight, costPrice, salePrice, marginReais, marginPercent };
}
var IMPORTED_ITEMS = [
  // 1. Impressão A3
  {
    id: "prod-imp-a3",
    name: "Impress\xE3o A3",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-A3",
    description: "Impress\xE3o A3 de alta defini\xE7\xE3o em papel padr\xE3o.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 a 2 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(8),
    packages: [
      { id: "pkg-a3-1", name: "At\xE9 3 p\xE1ginas - P&B", quantity: 1, ...calcProfit(8) },
      { id: "pkg-a3-2", name: "At\xE9 3 p\xE1ginas - Color", quantity: 1, ...calcProfit(10) },
      { id: "pkg-a3-3", name: "At\xE9 10 p\xE1ginas - P&B", quantity: 1, ...calcProfit(6) },
      { id: "pkg-a3-4", name: "At\xE9 10 p\xE1ginas - Color", quantity: 1, ...calcProfit(8) },
      { id: "pkg-a3-5", name: "At\xE9 20 p\xE1ginas - P&B", quantity: 1, ...calcProfit(5) },
      { id: "pkg-a3-6", name: "At\xE9 20 p\xE1ginas - Color", quantity: 1, ...calcProfit(7) },
      { id: "pkg-a3-7", name: "At\xE9 50 p\xE1ginas - P&B", quantity: 1, ...calcProfit(3.5) },
      { id: "pkg-a3-8", name: "At\xE9 50 p\xE1ginas - Color", quantity: 1, ...calcProfit(6.5) },
      { id: "pkg-a3-9", name: "Acima de 50 p\xE1ginas - P&B", quantity: 1, ...calcProfit(4) },
      { id: "pkg-a3-10", name: "Acima de 50 p\xE1ginas - Color", quantity: 1, ...calcProfit(6) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 2. Contratos
  {
    id: "prod-srv-contratos",
    name: "Contratos",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-CONTRATOS",
    description: "Elabora\xE7\xE3o e formata\xE7\xE3o de contratos e minutas.",
    estimatedTime: "20 minutos",
    ...calcProfit(35, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 3. Recuperação de Senha GOV
  {
    id: "prod-srv-gov",
    name: "Recupera\xE7\xE3o de Senha GOV",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-SENHA-GOV",
    description: "Recupera\xE7\xE3o e redefini\xE7\xE3o de acesso \xE0 conta GOV.BR.",
    estimatedTime: "10 minutos",
    ...calcProfit(10, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 4. CRLV
  {
    id: "prod-srv-crlv",
    name: "CRLV",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-CRLV",
    description: "Emiss\xE3o e impress\xE3o do Certificado de Registro e Licenciamento de Ve\xEDculo digital.",
    estimatedTime: "10 minutos",
    ...calcProfit(10, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 5. Guia IPVA/Licenciamento
  {
    id: "prod-srv-ipva",
    name: "Guia IPVA/Licenciamento",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-GUIA-IPVA",
    description: "Consulta de d\xE9bitos e emiss\xE3o de guias de IPVA / Licenciamento.",
    estimatedTime: "5 minutos",
    ...calcProfit(5, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 6. Multas
  {
    id: "prod-srv-multas",
    name: "Multas",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-CONS-MULTAS",
    description: "Consulta detalhada e emiss\xE3o de guias para pagamento de multas de tr\xE2nsito.",
    estimatedTime: "5 minutos",
    ...calcProfit(7, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 7. Transferência de veículos
  {
    id: "prod-srv-transf-veic",
    name: "Transfer\xEAncia de ve\xEDculos",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-TRANSF-VEIC",
    description: "Aux\xEDlio completo e emiss\xE3o de documenta\xE7\xE3o para transfer\xEAncia veicular.",
    estimatedTime: "30 minutos",
    ...calcProfit(45, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 8. Transferência de pontos
  {
    id: "prod-srv-transf-pontos",
    name: "Transfer\xEAncia de pontos",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-TRANSF-PONTOS",
    description: "Indica\xE7\xE3o de real condutor e transfer\xEAncia de pontos na CNH.",
    estimatedTime: "20 minutos",
    ...calcProfit(35, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 9. Plastificar
  {
    id: "prod-srv-plastificar",
    name: "Plastificar",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-PLASTIFICAR",
    description: "Plastifica\xE7\xE3o t\xE9rmica protetora de documentos.",
    estimatedTime: "5 minutos",
    ...calcProfit(5, true),
    options: [
      {
        id: "opt-tam-plast",
        name: "Tamanho",
        values: [
          { id: "val-plast-peq", label: "Pequeno", additionalPrice: 0, additionalCost: 0 },
          { id: "val-plast-grd", label: "Grande", additionalPrice: 5, additionalCost: 2.5 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 10. Cadastros
  {
    id: "prod-srv-cadastros",
    name: "Cadastros",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-CADASTROS",
    description: "Preenchimento e envio de cadastros em plataformas governamentais ou privadas.",
    estimatedTime: "20 minutos",
    ...calcProfit(25, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 11. Atestado de bons antecedentes
  {
    id: "prod-srv-antecedentes",
    name: "Atestado de bons antecedentes",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-ANTECEDENTES",
    description: "Emiss\xE3o e valida\xE7\xE3o de Certid\xE3o de Antecedentes Criminais.",
    estimatedTime: "10 minutos",
    ...calcProfit(15, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 12. Agendamentos
  {
    id: "prod-srv-agendamentos",
    name: "Agendamentos",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-AGENDAMENTOS",
    description: "Agendamento de servi\xE7os em \xF3rg\xE3os p\xFAblicos (Poupatempo, INSS, Detran, etc.).",
    estimatedTime: "15 minutos",
    ...calcProfit(15, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 13. Boletim de ocorrência
  {
    id: "prod-srv-boletim",
    name: "Boletim de ocorr\xEAncia",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-BOLETIM",
    description: "Registro de Boletim de Ocorr\xEAncia eletr\xF4nico junto \xE0 Pol\xEDcia Civil.",
    estimatedTime: "25 minutos",
    ...calcProfit(35, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 14. Segunda via de contas
  {
    id: "prod-srv-2via",
    name: "Segunda via de contas",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-2VIA-CONTAS",
    description: "Emiss\xE3o de 2\xAA via de faturas (\xC1gua, Luz, Telefone, Internet, Bancos).",
    estimatedTime: "5 minutos",
    ...calcProfit(5, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 15. Digitalizar
  {
    id: "prod-srv-digitalizar",
    name: "Digitalizar",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-DIGITALIZAR",
    description: "Digitaliza\xE7\xE3o em alta resolu\xE7\xE3o de documentos para PDF ou imagem.",
    estimatedTime: "5 minutos",
    ...calcProfit(4, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 16. Serviços Digitais / Consultas diversas
  {
    id: "prod-srv-diversos",
    name: "Servi\xE7os Digitais / Consultas diversas",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-CONSULTAS-DIV",
    description: "Consultas diversas em sistemas p\xFAblicos e suporte digital.",
    estimatedTime: "15 minutos",
    ...calcProfit(10, true),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 17. Plastificação
  {
    id: "prod-srv-plastificacao",
    name: "Plastifica\xE7\xE3o",
    type: "SERVICO",
    categoryId: "cat-servicos",
    sku: "SRV-PLASTIFICACAO",
    description: "Plastifica\xE7\xE3o de documentos Grande ou Pequeno.",
    estimatedTime: "5 minutos",
    ...calcProfit(10, true),
    options: [
      {
        id: "opt-plast-tipo",
        name: "Plastificar",
        values: [
          { id: "val-plast-grd", label: "Grande", additionalPrice: 0, additionalCost: 0 },
          { id: "val-plast-peq", label: "Pequeno", additionalPrice: -5, additionalCost: -2.5 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 18. Adesivos etiqueta redondo BOPP branco
  {
    id: "prod-bopp-branco",
    name: "Adesivos etiqueta redondo BOPP branco",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-BOPP-BRANCO",
    description: "Etiquetas adesivas em BOPP 50x50mm, resistentes \xE0 \xE1gua, com meio corte digital.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(68),
    packages: [
      { id: "pkg-bopp-40", name: "40 unidades", quantity: 40, ...calcProfit(68) },
      { id: "pkg-bopp-200", name: "200 unidades", quantity: 200, ...calcProfit(118) },
      { id: "pkg-bopp-520", name: "520 unidades", quantity: 520, ...calcProfit(218) },
      { id: "pkg-bopp-1000", name: "1000 unidades", quantity: 1e3, ...calcProfit(358) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 19. Bloco recibo A6 (10x15cm)
  {
    id: "prod-bloco-recibo-a6",
    name: "Bloco recibo A6 (10x15cm)",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-blocos",
    sku: "BLC-REC-A6",
    description: "Bloco de recibos no formato A6 (10x15cm) em papel apergaminhado 75g com 50 folhas por bloco.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(60),
    packages: [
      { id: "pkg-blc-1", name: "1 Bloco", quantity: 1, ...calcProfit(60) },
      { id: "pkg-blc-5", name: "5 Blocos", quantity: 5, ...calcProfit(106) },
      { id: "pkg-blc-10", name: "10 Blocos", quantity: 10, ...calcProfit(159.99) },
      { id: "pkg-blc-20", name: "20 blocos", quantity: 20, ...calcProfit(259) },
      { id: "pkg-blc-50", name: "50 blocos", quantity: 50, ...calcProfit(559.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 20. Credenciais
  {
    id: "prod-credenciais",
    name: "Credenciais",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-CREDENCIAL",
    description: "Credenciais em alto padr\xE3o para eventos e identifica\xE7\xE3o de equipes.",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(5.95),
    options: [
      {
        id: "opt-crd-tipo",
        name: "Tipo",
        values: [
          { id: "val-crd-sem", label: "Sem cord\xE3o", additionalPrice: 0, additionalCost: 0 },
          { id: "val-crd-com", label: "Com cord\xE3o", additionalPrice: 2, additionalCost: 1 }
        ]
      },
      {
        id: "opt-crd-pag",
        name: "Pagina\xE7\xE3o",
        values: [
          { id: "val-crd-frente", label: "Frente", additionalPrice: 0, additionalCost: 0 },
          { id: "val-crd-fv", label: "Frente e verso", additionalPrice: 3, additionalCost: 1.5 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 21. Convites
  {
    id: "prod-convites",
    name: "Convites",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-CONVITES",
    description: "Convites para celebra\xE7\xF5es e eventos em papel glossy paper ou linho texturizado.",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    requiresFile: true,
    ...calcProfit(3.6),
    options: [
      {
        id: "opt-conv-tipo",
        name: "Tipo",
        values: [
          { id: "val-conv-brilho", label: "brilho", additionalPrice: 0, additionalCost: 0 },
          { id: "val-conv-fosco", label: "fosco texturizado", additionalPrice: 0, additionalCost: 0 }
        ]
      },
      {
        id: "opt-conv-pag",
        name: "Pagina\xE7\xE3o",
        values: [
          { id: "val-conv-frente", label: "Frente", additionalPrice: 0, additionalCost: 0 },
          { id: "val-conv-fv", label: "Frente e verso", additionalPrice: 3.25, additionalCost: 1.625 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 22. WIND BANNER
  {
    id: "prod-wind-banner",
    name: "WIND BANNER",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "BAN-WIND",
    description: "Wind Banner em tecido Oxford para divulga\xE7\xE3o ao ar livre.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "5 a 7 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(192),
    packages: [
      { id: "pkg-wb-1", name: "Bandeira avulsa pena", quantity: 1, ...calcProfit(192) },
      { id: "pkg-wb-2", name: "Bandeira avulsa vela", quantity: 1, ...calcProfit(192) },
      { id: "pkg-wb-3", name: "Bandeira avulsa retangular", quantity: 1, ...calcProfit(192) },
      { id: "pkg-wb-4", name: "kit completo pena", quantity: 1, ...calcProfit(349) },
      { id: "pkg-wb-5", name: "kit completo vela", quantity: 1, ...calcProfit(349) },
      { id: "pkg-wb-6", name: "kit completo retangular", quantity: 1, ...calcProfit(349) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 23. Xerox
  {
    id: "prod-xerox",
    name: "Xerox",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-XEROX",
    description: "C\xF3pias e impress\xF5es em papel offset 75g.",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    ...calcProfit(2),
    options: [
      {
        id: "opt-xerox-tipo",
        name: "Tipo",
        values: [
          { id: "val-xrx-pb", label: "P&B", additionalPrice: 0, additionalCost: 0 },
          { id: "val-xrx-col", label: "Color", additionalPrice: 1, additionalCost: 0.5 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 24. Estampa termocolante Folha
  {
    id: "prod-estampa-termo",
    name: "Estampa termocolante Folha",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-TERMO-FLH",
    description: "Estampa termocolante Dark Film 3.0 para aplica\xE7\xE3o com calor em roupas e tecidos (300x450mm).",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "7 a 10 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(164),
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 25. Topo de bolo
  {
    id: "prod-topo-bolo",
    name: "Topo de bolo",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-TOPO-BOLO",
    description: "Topos de bolo personalizados impressos em papel glossy 115g.",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    requiresFile: true,
    ...calcProfit(7),
    options: [
      {
        id: "opt-tb-tipo",
        name: "Tipo",
        values: [
          { id: "tb-padrao", label: "Impress\xE3o padr\xE3o", additionalPrice: 0, additionalCost: 0 },
          { id: "tb-recorte", label: "Impress\xE3o + recorte digital", additionalPrice: 7.5, additionalCost: 3.75 },
          { id: "tb-montagem", label: "Impress\xE3o + recorte digital + montagem", additionalPrice: 15, additionalCost: 7.5 }
        ]
      },
      {
        id: "opt-tb-arte",
        name: "Arte",
        values: [
          { id: "tb-minha-arte", label: "Enviar minha arte", additionalPrice: 0, additionalCost: 0 },
          { id: "tb-arte-pers", label: "Arte personalizada", additionalPrice: 20.5, additionalCost: 10.25 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 26. Folha Adesiva DTF UV
  {
    id: "prod-dtf-uv",
    name: "Folha Adesiva DTF UV",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-DTF-UV",
    description: "Adesivo DTF UV resistente a riscos e intemp\xE9ries para aplica\xE7\xE3o direta.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "4 a 5 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(100),
    packages: [
      { id: "pkg-dtf-a4", name: "A4", quantity: 1, ...calcProfit(100) },
      { id: "pkg-dtf-a3", name: "A3", quantity: 1, ...calcProfit(121) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 27. Impressão papéis especiais
  {
    id: "prod-imp-papeis-especiais",
    name: "Impress\xE3o pap\xE9is especiais",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-PAP-ESP",
    description: "Impress\xF5es em papel glossy paper ou linho texturizado 180g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    requiresFile: true,
    ...calcProfit(7),
    packages: [
      { id: "pkg-esp-3", name: "At\xE9 3 p\xE1ginas", quantity: 1, ...calcProfit(7) },
      { id: "pkg-esp-10", name: "At\xE9 10 p\xE1ginas", quantity: 1, ...calcProfit(5) },
      { id: "pkg-esp-20", name: "At\xE9 20 p\xE1ginas", quantity: 1, ...calcProfit(4) },
      { id: "pkg-esp-50", name: "At\xE9 50 p\xE1ginas", quantity: 1, ...calcProfit(3.5) },
      { id: "pkg-esp-acima50", name: "Acima de 50 p\xE1ginas", quantity: 1, ...calcProfit(3) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 28. Impressão padrão Color
  {
    id: "prod-imp-padrao-color",
    name: "Impress\xE3o padr\xE3o Color",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-PAD-COLOR",
    description: "Impress\xE3o colorida formato A4 em papel offset 75g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    requiresFile: true,
    ...calcProfit(3),
    packages: [
      { id: "pkg-col-3-f", name: "At\xE9 3 p\xE1ginas - Frente", quantity: 1, ...calcProfit(3) },
      { id: "pkg-col-3-fv", name: "At\xE9 3 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(3) },
      { id: "pkg-col-15-f", name: "At\xE9 15 p\xE1ginas - Frente", quantity: 1, ...calcProfit(2.5) },
      { id: "pkg-col-15-fv", name: "At\xE9 15 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(2.5) },
      { id: "pkg-col-35-f", name: "At\xE9 35 p\xE1ginas - Frente", quantity: 1, ...calcProfit(2.25) },
      { id: "pkg-col-35-fv", name: "At\xE9 35 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(2.25) },
      { id: "pkg-col-50-f", name: "At\xE9 50 p\xE1ginas - Frente", quantity: 1, ...calcProfit(2) },
      { id: "pkg-col-50-fv", name: "At\xE9 50 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(2) },
      { id: "pkg-col-ac50-f", name: "Acima de 50 p\xE1ginas - Frente", quantity: 1, ...calcProfit(1.5) },
      { id: "pkg-col-ac50-fv", name: "Acima de 50 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(1.5) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 29. Impressão padrão P&B
  {
    id: "prod-imp-padrao-pb",
    name: "Impress\xE3o padr\xE3o P&B",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-PAD-PB",
    description: "Impress\xE3o preto e branco formato A4 em papel offset 75g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    requiresFile: true,
    ...calcProfit(2),
    packages: [
      { id: "pkg-pb-3-f", name: "At\xE9 3 p\xE1ginas - Frente", quantity: 1, ...calcProfit(2) },
      { id: "pkg-pb-3-fv", name: "At\xE9 3 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(2) },
      { id: "pkg-pb-15-f", name: "At\xE9 15 p\xE1ginas - Frente", quantity: 1, ...calcProfit(1.5) },
      { id: "pkg-pb-15-fv", name: "At\xE9 15 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(1.5) },
      { id: "pkg-pb-35-f", name: "At\xE9 35 p\xE1ginas - Frente", quantity: 1, ...calcProfit(1.25) },
      { id: "pkg-pb-35-fv", name: "At\xE9 35 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(1.25) },
      { id: "pkg-pb-50-f", name: "At\xE9 50 p\xE1ginas - Frente", quantity: 1, ...calcProfit(1) },
      { id: "pkg-pb-50-fv", name: "At\xE9 50 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(1) },
      { id: "pkg-pb-ac50-f", name: "Acima de 50 p\xE1ginas - Frente", quantity: 1, ...calcProfit(0.5) },
      { id: "pkg-pb-ac50-fv", name: "Acima de 50 p\xE1ginas - Frente e verso", quantity: 1, ...calcProfit(0.5) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 30. Etiquetas escolares
  {
    id: "prod-etiquetas-escolares",
    name: "Etiquetas escolares",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-ESC-A4",
    description: "Etiquetas personalizadas para identifica\xE7\xE3o de cadernos, livros, canetas e l\xE1pis em papel adesivo A4 115g.",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    requiresFile: true,
    ...calcProfit(25),
    options: [
      {
        id: "opt-esc-cartela",
        name: "Cartelas",
        values: [
          { id: "val-esc-padrao", label: "Cartela padr\xE3o", additionalPrice: 0, additionalCost: 0 },
          { id: "val-esc-lapis", label: "Cartela l\xE1pis e canetas", additionalPrice: 0, additionalCost: 0 },
          { id: "val-esc-cadernos", label: "Cartela cadernos e livros", additionalPrice: 0, additionalCost: 0 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 31. Panfleto - 10x15cm - 115g
  {
    id: "prod-panfleto-10x15-115g",
    name: "Panfleto - 10x15cm - 115g",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-10X15-115G",
    description: "Panfletos promocionais no formato 10x15cm em papel Couch\xEA brilho 115g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(109.99),
    packages: [
      { id: "pkg-p115-100f", name: "100 unid - frente colorida", quantity: 100, ...calcProfit(109.99) },
      { id: "pkg-p115-100fv", name: "100 unid - frente e verso colorido", quantity: 100, ...calcProfit(139.99) },
      { id: "pkg-p115-150fv", name: "150 unid - frente e verso colorido", quantity: 150, ...calcProfit(214.98) },
      { id: "pkg-p115-200f", name: "200 unid - frente colorida", quantity: 200, ...calcProfit(179.99) },
      { id: "pkg-p115-200fv", name: "200 unid - frente e verso colorido", quantity: 200, ...calcProfit(234.99) },
      { id: "pkg-p115-1000f", name: "1000 unid - frente colorida", quantity: 1e3, ...calcProfit(239.99) },
      { id: "pkg-p115-1000fv", name: "1000 unid - frente e verso colorido", quantity: 1e3, ...calcProfit(251.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 32. Cardápio PVC
  {
    id: "prod-cardapio-pvc",
    name: "Card\xE1pio PVC",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "CRD-PVC-05",
    description: "Card\xE1pios produzidos em Pl\xE1stico Compacto PVC 0,5mm com acabamento canteado.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(94),
    packages: [
      { id: "pkg-pvc-2f", name: "2 unid - frente", quantity: 2, ...calcProfit(94) },
      { id: "pkg-pvc-2fv", name: "2 unid - frente verso", quantity: 2, ...calcProfit(104) },
      { id: "pkg-pvc-8f", name: "8 unid - frente", quantity: 8, ...calcProfit(184) },
      { id: "pkg-pvc-8fv", name: "8 unid - frente e verso", quantity: 8, ...calcProfit(194) },
      { id: "pkg-pvc-12f", name: "12 unid - frente", quantity: 12, ...calcProfit(214) },
      { id: "pkg-pvc-12fv", name: "12 unid - frente e verso", quantity: 12, ...calcProfit(254) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 33. Imã de geladeira com calendário
  {
    id: "prod-ima-calendario",
    name: "Im\xE3 de geladeira com calend\xE1rio",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "IMA-CALENDARIO",
    description: "\xCDm\xE3 de geladeira com calend\xE1rio acoplado e manta magn\xE9tica em papel couch\xEA 250g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "4 a 5 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(178),
    packages: [
      { id: "pkg-ima-45", name: "45 unidades", quantity: 45, ...calcProfit(178) },
      { id: "pkg-ima-90", name: "90 unidades", quantity: 90, ...calcProfit(288) },
      { id: "pkg-ima-270", name: "270 unidades", quantity: 270, ...calcProfit(408) },
      { id: "pkg-ima-500", name: "500 unidades", quantity: 500, ...calcProfit(648) },
      { id: "pkg-ima-1000", name: "1000 unidades", quantity: 1e3, ...calcProfit(808) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 34. Mini cartão
  {
    id: "prod-mini-cartao",
    name: "Mini cart\xE3o",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-cartoes",
    sku: "CRT-MINI",
    description: "Minicart\xE3o em papel Couch\xEA 300g com lamina\xE7\xE3o fosca frente e verso no formato 43x48mm.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(190),
    packages: [
      { id: "pkg-mini-1000", name: "1000 unidades", quantity: 1e3, ...calcProfit(190) },
      { id: "pkg-mini-2000", name: "2000 unidades", quantity: 2e3, ...calcProfit(235) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 35. Imã de geladeira corte especial
  {
    id: "prod-ima-corte-esp",
    name: "Im\xE3 de geladeira corte especial",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "IMA-CORTE-ESP",
    description: "\xCDm\xE3 com faca de corte especial personalizado e verniz UV total.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "6 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(358.99),
    packages: [
      { id: "pkg-imce-500", name: "500 unidades", quantity: 500, ...calcProfit(358.99) },
      { id: "pkg-imce-1000", name: "1000 unidades", quantity: 1e3, ...calcProfit(810.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 36. Imã de geladeira padrão
  {
    id: "prod-ima-padrao",
    name: "Im\xE3 de geladeira padr\xE3o",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "IMA-PADRAO-50X45",
    description: "\xCDm\xE3 com cantos arredondados no formato 50x45mm e verniz UV total frente.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "4 a 5 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(339.99),
    packages: [
      { id: "pkg-imp-500", name: "500 unidades", quantity: 500, ...calcProfit(339.99) },
      { id: "pkg-imp-1000", name: "1000 unidades", quantity: 1e3, ...calcProfit(781.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 37. PVC SRA3
  {
    id: "prod-pvc-sra3",
    name: "PVC SRA3",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "PVC-SRA3-33X48",
    description: "Folha avulsa PVC SRA3 (330x480mm) com verniz total brilho frente.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(49.99),
    packages: [
      { id: "pkg-pvcs-1f", name: "1 unid - frente colorida", quantity: 1, ...calcProfit(49.99) },
      { id: "pkg-pvcs-1fv", name: "1 unid - frente e verso colorido", quantity: 1, ...calcProfit(59.99) },
      { id: "pkg-pvcs-5f", name: "5 unid - frente colorida", quantity: 5, ...calcProfit(149.99) },
      { id: "pkg-pvcs-5fv", name: "5 unid - frente e verso colorido", quantity: 5, ...calcProfit(179.99) },
      { id: "pkg-pvcs-10f", name: "10 unid - frente colorida", quantity: 10, ...calcProfit(279.99) },
      { id: "pkg-pvcs-10fv", name: "10 unid - frente e verso colorido", quantity: 10, ...calcProfit(319.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 38. Panfleto - 20x30cm - 150g
  {
    id: "prod-panfleto-20x30-150g",
    name: "Panfleto - 20x30cm - 150g",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-20X30-150G",
    description: "Panfleto grande formato 20x30cm em papel Couch\xEA brilho 150g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "4 a 5 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(858),
    packages: [
      { id: "pkg-p20x30-150-1000f", name: "1000 unid - frente colorida", quantity: 1e3, ...calcProfit(858) },
      { id: "pkg-p20x30-150-1000fv", name: "1000 unid - frente e verso colorido", quantity: 1e3, ...calcProfit(908) },
      { id: "pkg-p20x30-150-2500f", name: "2500 unid - frente colorida", quantity: 2500, ...calcProfit(1618) },
      { id: "pkg-p20x30-150-2500fv", name: "2500 unid - frente e verso colorido", quantity: 2500, ...calcProfit(1718) },
      { id: "pkg-p20x30-150-5000f", name: "5000 unid - frente colorida", quantity: 5e3, ...calcProfit(2368) },
      { id: "pkg-p20x30-150-5000fv", name: "5000 unid - frente e verso colorido", quantity: 5e3, ...calcProfit(3258) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 39. Panfleto - 20x30cm - 115g
  {
    id: "prod-panfleto-20x30-115g",
    name: "Panfleto - 20x30cm - 115g",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-20X30-115G",
    description: "Panfleto grande formato 20x30cm em papel Couch\xEA brilho 115g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "4 a 5 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(740),
    packages: [
      { id: "pkg-p20x30-115-1000f", name: "1000 unid - frente colorida", quantity: 1e3, ...calcProfit(740) },
      { id: "pkg-p20x30-115-1000fv", name: "1000 unid - frente e verso colorido", quantity: 1e3, ...calcProfit(820) },
      { id: "pkg-p20x30-115-2500f", name: "2500 unid - frente colorida", quantity: 2500, ...calcProfit(1355) },
      { id: "pkg-p20x30-115-2500fv", name: "2500 unid - frente e verso colorido", quantity: 2500, ...calcProfit(1320) },
      { id: "pkg-p20x30-115-5000f", name: "5000 unid - frente colorida", quantity: 5e3, ...calcProfit(1980) },
      { id: "pkg-p20x30-115-5000fv", name: "5000 unid - frente e verso colorido", quantity: 5e3, ...calcProfit(2260) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 40. Panfleto - 20x28cm - 90g
  {
    id: "prod-panfleto-20x28-90g",
    name: "Panfleto - 20x28cm - 90g",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-20X28-90G",
    description: "Panfleto no formato 20x28cm em papel Couch\xEA brilho 90g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(380),
    packages: [
      { id: "pkg-p20x28-500f", name: "500 unid - frente colorida", quantity: 500, ...calcProfit(380) },
      { id: "pkg-p20x28-500fv", name: "500 unid - frente e verso colorido", quantity: 500, ...calcProfit(490) },
      { id: "pkg-p20x28-1000f", name: "1000 unid - frente colorida", quantity: 1e3, ...calcProfit(542) },
      { id: "pkg-p20x28-1000fv", name: "1000 unid - frente e verso colorido", quantity: 1e3, ...calcProfit(660) },
      { id: "pkg-p20x28-2500f", name: "2500 unid - frente colorida", quantity: 2500, ...calcProfit(900) },
      { id: "pkg-p20x28-2500fv", name: "2500 unid - frente e verso colorido", quantity: 2500, ...calcProfit(1039) },
      { id: "pkg-p20x28-5000f", name: "5000 unid - frente colorida", quantity: 5e3, ...calcProfit(1470) },
      { id: "pkg-p20x28-5000fv", name: "5000 unid - frente e verso colorido", quantity: 5e3, ...calcProfit(1660) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 41. Placa QR CODE PIX
  {
    id: "prod-placa-pix",
    name: "Placa QR CODE PIX",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "VIS-PLACA-PIX",
    description: "Placa display em acr\xEDlico transparente 3mm com QR Code Pix em impress\xE3o digital com tinta branca especial.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(92),
    packages: [
      { id: "pkg-pix-1", name: "1 unidade", quantity: 1, ...calcProfit(92) },
      { id: "pkg-pix-5", name: "5 unidades", quantity: 5, ...calcProfit(237) },
      { id: "pkg-pix-10", name: "10 unidades", quantity: 10, ...calcProfit(407) },
      { id: "pkg-pix-25", name: "25 unidades", quantity: 25, ...calcProfit(892) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 42. Etiquetas adesivas vinil
  {
    id: "prod-etiquetas-vinil",
    name: "Etiquetas adesivas vinil",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-VINIL-FLH",
    description: "Etiquetas adesivas em vinil branco com verniz UV total e meio corte especial.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "4 a 5 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(58.99),
    packages: [
      { id: "pkg-vin-1", name: "1 Folha", quantity: 1, ...calcProfit(58.99) },
      { id: "pkg-vin-5", name: "5 Folhas", quantity: 5, ...calcProfit(112.99) },
      { id: "pkg-vin-10", name: "10 Folhas", quantity: 10, ...calcProfit(183.99) },
      { id: "pkg-vin-50", name: "50 Folhas", quantity: 50, ...calcProfit(718.99) }
    ],
    options: [
      {
        id: "opt-tam-etq-vinil",
        name: "Tamanho da etiqueta",
        values: [
          { id: "v-3x3", label: "3x3cm - 96 unidades por folha", additionalPrice: 0, additionalCost: 0 },
          { id: "v-5x5", label: "5x5cm - 40 unidades por folha", additionalPrice: 0, additionalCost: 0 },
          { id: "v-8x8", label: "8x8cm - 15 unidades por folha", additionalPrice: 0, additionalCost: 0 },
          { id: "v-10x10", label: "10x10cm - 6 unidades por folha", additionalPrice: 0, additionalCost: 0 },
          { id: "v-proprio", label: "Tamanho pr\xF3prio", additionalPrice: 0, additionalCost: 0 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 43. Panfleto - 15x21cm - 90g
  {
    id: "prod-panfleto-15x21-90g",
    name: "Panfleto - 15x21cm - 90g",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-15X21-90G",
    description: "Panfletos promocionais no formato 15x21cm em papel Couch\xEA brilho 90g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(236),
    packages: [
      { id: "pkg-p15-100fv", name: "100 unid - frente e verso colorido", quantity: 100, ...calcProfit(228) },
      { id: "pkg-p15-500f", name: "15x21 - 500 unid - frente colorida", quantity: 500, ...calcProfit(236) },
      { id: "pkg-p15-500fv", name: "15x21 - 500 unid - frente e verso colorido", quantity: 500, ...calcProfit(296) },
      { id: "pkg-p15-1000f", name: "15x21 - 1000 unid - frente colorida", quantity: 1e3, ...calcProfit(436) },
      { id: "pkg-p15-1000fv", name: "15x21 - 1000 unid - frente e verso colorido", quantity: 1e3, ...calcProfit(456) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 44. Cartão de visitas 300G
  {
    id: "prod-cartao-300g",
    name: "Cart\xE3o de visitas 300G",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-cartoes",
    sku: "CRT-300G",
    description: "Cart\xE3o de visita em papel couch\xEA brilho premium 300g com verniz UV total frente.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(94),
    packages: [
      { id: "pkg-c3-50f", name: "50 frente colorida", quantity: 50, ...calcProfit(94) },
      { id: "pkg-c3-50fv", name: "50 frente e verso colorido", quantity: 50, ...calcProfit(104) },
      { id: "pkg-c3-100f", name: "100 frente colorida", quantity: 100, ...calcProfit(119) },
      { id: "pkg-c3-100fv", name: "100 frente e verso colorido", quantity: 100, ...calcProfit(130) },
      { id: "pkg-c3-250f", name: "250 - frente colorida", quantity: 250, ...calcProfit(146) },
      { id: "pkg-c3-250fv", name: "250 - frente e verso colorido", quantity: 250, ...calcProfit(179) },
      { id: "pkg-c3-500f", name: "500 - frente colorida", quantity: 500, ...calcProfit(184) },
      { id: "pkg-c3-500fv", name: "500 - frente e verso colorido", quantity: 500, ...calcProfit(194) },
      { id: "pkg-c3-1000f", name: "1000 - frente colorida", quantity: 1e3, ...calcProfit(199) },
      { id: "pkg-c3-1000fv", name: "1000 - frente e verso colorido", quantity: 1e3, ...calcProfit(214) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 45. Placa de sinalização
  {
    id: "prod-placa-sinalizacao",
    name: "Placa de sinaliza\xE7\xE3o",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "VIS-PLACA-PS",
    description: "Placa em PSAI 2mm com adesivo vinil plotter de alta durabilidade e fita dupla face.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "6 a 8 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(68),
    packages: [
      { id: "pkg-plc-1-25x20", name: "1 unid - 25x20", quantity: 1, ...calcProfit(68) },
      { id: "pkg-plc-5-25x20", name: "5 unid - 25x20", quantity: 5, ...calcProfit(148) },
      { id: "pkg-plc-10-25x20", name: "10 unid - 25x20", quantity: 10, ...calcProfit(243) },
      { id: "pkg-plc-1-30x40", name: "1 unid - 30x40", quantity: 1, ...calcProfit(78) },
      { id: "pkg-plc-5-30x40", name: "5 unid - 30x40", quantity: 5, ...calcProfit(173) },
      { id: "pkg-plc-10-30x40", name: "10 unid - 30x40", quantity: 10, ...calcProfit(308) },
      { id: "pkg-plc-1-60x40", name: "1 unid - 60x40", quantity: 1, ...calcProfit(131) },
      { id: "pkg-plc-5-60x40", name: "5 unid - 60x40", quantity: 5, ...calcProfit(321) },
      { id: "pkg-plc-10-60x40", name: "10 unid - 60x40", quantity: 10, ...calcProfit(698) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 46. Folha adesiva A4
  {
    id: "prod-folha-adesiva-a4",
    name: "Folha adesiva A4",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-FLH-A4",
    description: "Folha adesiva impressa no tamanho 29x21cm em papel glossy.",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 a 2 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(9.99),
    options: [
      {
        id: "opt-flh-corte",
        name: "Acabamento",
        values: [
          { id: "val-sem-corte", label: "Sem Corte", additionalPrice: 0, additionalCost: 0 },
          { id: "val-meio-corte", label: "Meio Corte", additionalPrice: 5, additionalCost: 2.5 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 47. Panfleto - 15x21cm - 150g
  {
    id: "prod-panfleto-15x21-150g",
    name: "Panfleto - 15x21cm - 150g",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-15X21-150G",
    description: "Panfletos promocionais no formato 15x21cm em papel Couch\xEA brilho 150g encorpado.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(169.99),
    packages: [
      { id: "pkg-p15-150-50f", name: "50 unidades - frente colorida", quantity: 50, ...calcProfit(169.99) },
      { id: "pkg-p15-150-50fv", name: "50 unidades - frente e verso colorido", quantity: 50, ...calcProfit(189.99) },
      { id: "pkg-p15-150-100f", name: "100 unidades - frente colorida", quantity: 100, ...calcProfit(189.99) },
      { id: "pkg-p15-150-100fv", name: "100 unidades - frente e verso colorido", quantity: 100, ...calcProfit(199.99) },
      { id: "pkg-p15-150-300f", name: "300 unidades - frente colorida", quantity: 300, ...calcProfit(452.99) },
      { id: "pkg-p15-150-300fv", name: "300 unidades - frente e verso colorido", quantity: 300, ...calcProfit(674.99) },
      { id: "pkg-p15-150-1000f", name: "1000 unidades - frente colorida", quantity: 1e3, ...calcProfit(397.99) },
      { id: "pkg-p15-150-1000fv", name: "1000 unidades - frente e verso colorido", quantity: 1e3, ...calcProfit(422.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 48. Sacola personalizada média
  {
    id: "prod-sacola-media",
    name: "Sacola personalizada m\xE9dia",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-embalagens",
    sku: "EMB-SAC-MED",
    description: "Sacola pl\xE1stica em polietileno de alta densidade 200x300mm com estampa silk 1x0, suporta at\xE9 6kg.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "8 a 12 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(200),
    packages: [
      { id: "pkg-sac-50", name: "50 unidades", quantity: 50, ...calcProfit(200) },
      { id: "pkg-sac-100", name: "100 unidades", quantity: 100, ...calcProfit(265) },
      { id: "pkg-sac-250", name: "250 unidades", quantity: 250, ...calcProfit(530) },
      { id: "pkg-sac-500", name: "500 unidades", quantity: 500, ...calcProfit(848) },
      { id: "pkg-sac-1000", name: "1000 unidades", quantity: 1e3, ...calcProfit(1510) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 49. FOTO POLAROID
  {
    id: "prod-foto-polaroid",
    name: "FOTO POLAROID",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-POLAROID",
    description: "Fotos estilo Polaroid formato 10x7,5cm em papel couch\xEA 210g com verniz UV resistente \xE0 \xE1gua.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(80),
    packages: [
      { id: "pkg-pol-18", name: "18 unidades", quantity: 18, ...calcProfit(80) },
      { id: "pkg-pol-36", name: "36 unidades", quantity: 36, ...calcProfit(100) },
      { id: "pkg-pol-72", name: "72 unidades", quantity: 72, ...calcProfit(108) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 50. FOTO 10X15 PREMIUM
  {
    id: "prod-foto-10x15-prem",
    name: "FOTO 10X15 PREMIUM",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-FOTO-PREM",
    description: "Revela\xE7\xE3o e impress\xE3o de fotos 10x15cm em papel Couch\xEA 210g com verniz UV de prote\xE7\xE3o.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(76),
    packages: [
      { id: "pkg-fotop-9", name: "9 unidades", quantity: 9, ...calcProfit(72) },
      { id: "pkg-fotop-18", name: "18 unidades", quantity: 18, ...calcProfit(76) },
      { id: "pkg-fotop-27", name: "27 unidades", quantity: 27, ...calcProfit(84) },
      { id: "pkg-fotop-45", name: "45 unidades", quantity: 45, ...calcProfit(94) },
      { id: "pkg-fotop-99", name: "99 unidades", quantity: 99, ...calcProfit(122.5) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 51. FOTO 10X15
  {
    id: "prod-foto-10x15",
    name: "FOTO 10X15",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-FOTO-AVULSA",
    description: "Impress\xE3o de fotos 10x15cm em papel fotogr\xE1fico 180g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 a 2 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(3.5),
    packages: [
      { id: "pkg-foto-10", name: "At\xE9 10 fotos", quantity: 1, ...calcProfit(3.5) },
      { id: "pkg-foto-50", name: "At\xE9 50 fotos", quantity: 1, ...calcProfit(3) },
      { id: "pkg-foto-acima50", name: "Acima de 50 fotos", quantity: 1, ...calcProfit(2.5) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 52. Certificados
  {
    id: "prod-certificados",
    name: "Certificados",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-CERTIFICADOS",
    description: "Certificados em papel linho texturizado 180g no formato 300x210mm.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 dia \xFAtil",
    requiresFile: true,
    ...calcProfit(80),
    packages: [
      { id: "pkg-cert-2", name: "2 unidades", quantity: 2, ...calcProfit(80) },
      { id: "pkg-cert-5", name: "5 unidades", quantity: 5, ...calcProfit(110) },
      { id: "pkg-cert-10", name: "10 unidades", quantity: 10, ...calcProfit(120) },
      { id: "pkg-cert-20", name: "20 unidades", quantity: 20, ...calcProfit(160) },
      { id: "pkg-cert-50", name: "50 unidades", quantity: 50, ...calcProfit(300) },
      { id: "pkg-cert-100", name: "100 unidades", quantity: 100, ...calcProfit(430) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 53. Folhas pra orçamento blocadas A5 (15x21cm)
  {
    id: "prod-folhas-orc-a5",
    name: "Folhas pra or\xE7amento blocadas A5 (15x21cm)",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-blocos",
    sku: "BLC-ORC-A5",
    description: "Bloco de folhas de or\xE7amento A5 (15x21cm) em papel apergaminhado 56g, 50 folhas por bloco.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(66),
    packages: [
      { id: "pkg-orcA5-1", name: "1 Bloco", quantity: 1, ...calcProfit(66) },
      { id: "pkg-orcA5-5", name: "5 Blocos", quantity: 5, ...calcProfit(112) },
      { id: "pkg-orcA5-10", name: "10 Blocos", quantity: 10, ...calcProfit(165.99) },
      { id: "pkg-orcA5-20", name: "20 blocos", quantity: 20, ...calcProfit(265) },
      { id: "pkg-orcA5-50", name: "50 blocos", quantity: 50, ...calcProfit(565.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 54. Folhas pra orçamento blocadas A4 (30x21cm)
  {
    id: "prod-folhas-orc-a4",
    name: "Folhas pra or\xE7amento blocadas A4 (30x21cm)",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-blocos",
    sku: "BLC-ORC-A4",
    description: "Bloco de folhas de or\xE7amento A4 (30x21cm) em papel apergaminhado 56g, 50 folhas por bloco.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(76),
    packages: [
      { id: "pkg-orcA4-1", name: "1 Bloco", quantity: 1, ...calcProfit(76) },
      { id: "pkg-orcA4-5", name: "5 Blocos", quantity: 5, ...calcProfit(151.79) },
      { id: "pkg-orcA4-10", name: "10 Blocos", quantity: 10, ...calcProfit(261) },
      { id: "pkg-orcA4-20", name: "20 blocos", quantity: 20, ...calcProfit(475) },
      { id: "pkg-orcA4-50", name: "50 blocos", quantity: 50, ...calcProfit(775) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 55. Adesivo vinil M2
  {
    id: "prod-adesivo-vinil-m2",
    name: "Adesivo vinil M2",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-VINIL-M2",
    description: "Impress\xE3o digital l\xE1tex em vinil adesivo branco por metro quadrado (100x100cm).",
    pricingModel: "POR_M2",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(130),
    areaPricing: {
      costPerM2: 65 + FREIGHT,
      salePricePerM2: 130,
      minAreaM2: 0.5
    },
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 56. Adesivos Vinil Folha SRA3
  {
    id: "prod-adesivos-vinil-sra3",
    name: "Adesivos Vinil Folha SRA3",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-VIN-SRA3",
    description: "Folha inteira em vinil branco 31x46cm sem meio corte.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 a 2 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(49.99),
    packages: [
      { id: "pkg-vsra3-1", name: "1 folha", quantity: 1, ...calcProfit(49.99) },
      { id: "pkg-vsra3-5", name: "5 folhas", quantity: 5, ...calcProfit(94.99) },
      { id: "pkg-vsra3-10", name: "10 folhas", quantity: 10, ...calcProfit(148.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 57. Cartão Feed Instagram
  {
    id: "prod-cartao-feed-insta",
    name: "Cart\xE3o Feed Instagram",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-cartoes",
    sku: "CRT-FEED-INSTA",
    description: "Cart\xE3o no formato Feed do Instagram em papel couch\xEA brilho frente e verso personalizado.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(86),
    packages: [
      { id: "pkg-insta-50", name: "50 unidades", quantity: 50, ...calcProfit(86) },
      { id: "pkg-insta-100", name: "100 unidades", quantity: 100, ...calcProfit(125.99) },
      { id: "pkg-insta-250", name: "250 unidades", quantity: 250, ...calcProfit(176) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 58. Folheto de agradecimento
  {
    id: "prod-folheto-agradecimento",
    name: "Folheto de agradecimento",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-AGRADECIMENTO",
    description: "Cart\xE3o / folheto de agradecimento ao cliente no formato 7x10cm em papel Glossy Matte 120g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(9.99),
    packages: [
      { id: "pkg-agr-16", name: "16 unidades", quantity: 16, ...calcProfit(9.99) },
      { id: "pkg-agr-32", name: "32 unidades", quantity: 32, ...calcProfit(18.99) },
      { id: "pkg-agr-64", name: "64 unidades", quantity: 64, ...calcProfit(28.99) },
      { id: "pkg-agr-128", name: "128 unidades", quantity: 128, ...calcProfit(54.99) },
      { id: "pkg-agr-256", name: "256 unidades", quantity: 256, ...calcProfit(109.99) },
      { id: "pkg-agr-1000", name: "1000 unidades", quantity: 1e3, ...calcProfit(299.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 59. comandas
  {
    id: "prod-comandas",
    name: "comandas",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-blocos",
    sku: "BLC-COMANDAS",
    description: "Comandas em papel apergaminhado 75g para controle de bares, restaurantes e lanchonetes.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(158),
    packages: [
      { id: "pkg-cmd-10f", name: "10 blocos ( 50 unid cada) - frente", quantity: 10, ...calcProfit(158) },
      { id: "pkg-cmd-10fv", name: "10 blocos (50 unid cada) - frente e verso", quantity: 10, ...calcProfit(178) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 60. Banner
  {
    id: "prod-banner-lona",
    name: "Banner",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-banners",
    sku: "BAN-LONA-440G",
    description: "Banner em Lona 440g com acabamento em bast\xE3o de madeira, ponteira pl\xE1stica e cord\xE3o de nylon.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(68),
    packages: [
      { id: "pkg-ban-20x30", name: "20x30", quantity: 1, ...calcProfit(68) },
      { id: "pkg-ban-20x60", name: "20x60", quantity: 1, ...calcProfit(82) },
      { id: "pkg-ban-40x60", name: "40x60", quantity: 1, ...calcProfit(97) },
      { id: "pkg-ban-70x100", name: "70x100", quantity: 1, ...calcProfit(112) },
      { id: "pkg-ban-60x90", name: "60x90", quantity: 1, ...calcProfit(113) },
      { id: "pkg-ban-80x120", name: "80x120", quantity: 1, ...calcProfit(147) },
      { id: "pkg-ban-100x160", name: "100x160", quantity: 1, ...calcProfit(192) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 61. Cardápio plastificado padrão
  {
    id: "prod-cardapio-plastificado",
    name: "Card\xE1pio plastificado padr\xE3o",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "CRD-PLAST-RIG",
    description: "Card\xE1pios com plastifica\xE7\xE3o r\xEDgida 0,10mm para estabelecimentos aliment\xEDcios.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(19.99),
    packages: [
      { id: "pkg-cplast-1f", name: "1 unid - frente colorida", quantity: 1, ...calcProfit(19.99) },
      { id: "pkg-cplast-1fv", name: "1 unid - frente e verso colorido", quantity: 1, ...calcProfit(24.99) },
      { id: "pkg-cplast-5f", name: "5 unid - frente colorida", quantity: 5, ...calcProfit(52.99) },
      { id: "pkg-cplast-5fv", name: "5 unid - frente e verso colorido", quantity: 5, ...calcProfit(62.99) },
      { id: "pkg-cplast-8f", name: "8 unid - frente colorida", quantity: 8, ...calcProfit(79.99) },
      { id: "pkg-cplast-8fv", name: "8 unid - frente e verso colorido", quantity: 8, ...calcProfit(89.99) },
      { id: "pkg-cplast-10f", name: "10 unid - frente colorida", quantity: 10, ...calcProfit(94.99) },
      { id: "pkg-cplast-10fv", name: "10 unid - frente e verso colorido", quantity: 10, ...calcProfit(97.99) },
      { id: "pkg-cplast-24f", name: "24 unid - frente colorida", quantity: 24, ...calcProfit(299.99) },
      { id: "pkg-cplast-24fv", name: "24 unid - frente e verso colorido", quantity: 24, ...calcProfit(319.99) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 62. Etiquetas adesivas papel
  {
    id: "prod-etiquetas-papel",
    name: "Etiquetas adesivas papel",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-adesivos",
    sku: "ADS-PAPEL-GLOSSY",
    description: "Etiquetas adesivas em papel glossy para identifica\xE7\xE3o de produtos e selos.",
    pricingModel: "POR_UNIDADE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 a 2 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(15),
    options: [
      {
        id: "opt-tam-etq-papel",
        name: "Tamanho e Quantidade",
        values: [
          { id: "val-p-3x3", label: "3x3cm - 35 unidades", additionalPrice: 0, additionalCost: 0 },
          { id: "val-p-4x4", label: "4x4cm - 20 unidades", additionalPrice: 0, additionalCost: 0 },
          { id: "val-p-5x5", label: "5x5cm - 12 unidades", additionalPrice: 0, additionalCost: 0 },
          { id: "val-p-6x6", label: "6x6cm - 12 unidades", additionalPrice: 0, additionalCost: 0 },
          { id: "val-p-semrecorte", label: "Folha sem recorte", additionalPrice: 0, additionalCost: 0 }
        ]
      }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 63. Panfleto - 10x15cm - 90g
  {
    id: "prod-panfleto-10x15-90g",
    name: "Panfleto - 10x15cm - 90g",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-panfletos",
    sku: "PNF-10X15-90G",
    description: "Panfleto promocional formato 10x15cm em papel Couch\xEA brilho 90g.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "3 a 4 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(96),
    packages: [
      { id: "pkg-p90-100f", name: "100 unid - frente colorida", quantity: 100, ...calcProfit(96) },
      { id: "pkg-p90-100fv", name: "100 unid - frente e verso colorido", quantity: 100, ...calcProfit(126) },
      { id: "pkg-p90-200f", name: "200 unid - frente colorida", quantity: 200, ...calcProfit(166) },
      { id: "pkg-p90-200fv", name: "200 unid - frente e verso colorido", quantity: 200, ...calcProfit(221) },
      { id: "pkg-p90-500f", name: "500 unid - frente colorida", quantity: 500, ...calcProfit(181) },
      { id: "pkg-p90-500fv", name: "500 unid - frente e verso colorido", quantity: 500, ...calcProfit(216) },
      { id: "pkg-p90-1000f", name: "1000 unid - frente colorida", quantity: 1e3, ...calcProfit(206) },
      { id: "pkg-p90-1000fv", name: "1000 unid - frente e verso colorido", quantity: 1e3, ...calcProfit(216) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 64. Rifa
  {
    id: "prod-rifa",
    name: "Rifa",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-blocos",
    sku: "BLC-RIFA-75G",
    description: "Tal\xF5es de rifa em papel apergaminhado 75g com numera\xE7\xE3o e picote digital (50 folhas por bloco).",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "4 a 5 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(71),
    packages: [
      { id: "pkg-rifa-1", name: "1 bloco - 50 unid", quantity: 1, ...calcProfit(71) },
      { id: "pkg-rifa-2", name: "2 blocos - 100unid", quantity: 2, ...calcProfit(104) },
      { id: "pkg-rifa-5", name: "5 blocos - 250unid", quantity: 5, ...calcProfit(194) },
      { id: "pkg-rifa-10", name: "10 blocos - 500 unid", quantity: 10, ...calcProfit(268.4) },
      { id: "pkg-rifa-20", name: "20 blocos - 1000 unid", quantity: 20, ...calcProfit(475) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 65. cartaz A3
  {
    id: "prod-cartaz-a3",
    name: "cartaz A3",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-impressos",
    sku: "IMP-CARTAZ-A3",
    description: "Cartazes A3 e SRA3 em papel couch\xEA ou sulfite para divulga\xE7\xE3o.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "1 a 2 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(10),
    packages: [
      { id: "pkg-ctz-1-a3couche", name: "1 unid - A3 couhc\xEA", quantity: 1, ...calcProfit(10) },
      { id: "pkg-ctz-1-a3sulfite", name: "1unid - A3 Sulfite", quantity: 1, ...calcProfit(10) },
      { id: "pkg-ctz-5-sra3", name: "5 unid - SRA3 couhc\xEA", quantity: 5, ...calcProfit(94) },
      { id: "pkg-ctz-10-sra3", name: "10 unid - SRA3 couch\xEA", quantity: 10, ...calcProfit(182) },
      { id: "pkg-ctz-25-sra3", name: "25 unid - SRA3 couch\xEA", quantity: 25, ...calcProfit(232.25) },
      { id: "pkg-ctz-50-sra3", name: "50 unid - SRA3 couch\xEA", quantity: 50, ...calcProfit(306) },
      { id: "pkg-ctz-100-sra3", name: "100 unid - SRA3 couch\xEA", quantity: 100, ...calcProfit(465) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 66. TAGS
  {
    id: "prod-tags",
    name: "TAGS",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-cartoes",
    sku: "CRT-TAGS-250G",
    description: "Tags personalizadas em papel Couch\xEA brilho 250g com furo padr\xE3o 41,5x44mm.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "6 a 7 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(72),
    packages: [
      { id: "pkg-tag-50f", name: "4x5cm - frente colorida - 50 unid", quantity: 50, ...calcProfit(72) },
      { id: "pkg-tag-50fv", name: "4x5 - frente e verso colorido - 50 unid", quantity: 50, ...calcProfit(102) },
      { id: "pkg-tag-100f", name: "4x5cm - frente colorida - 100unid", quantity: 100, ...calcProfit(87) },
      { id: "pkg-tag-100fv", name: "4x5 - frente e verso colorido - 100 unid", quantity: 100, ...calcProfit(107) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  // 67. Cartão de visitas 250G
  {
    id: "prod-cartao-250g",
    name: "Cart\xE3o de visitas 250G",
    type: "PRODUTO_GRAFICO",
    categoryId: "cat-cartoes",
    sku: "CRT-250G",
    description: "Cart\xE3o de visita em papel couch\xEA brilho 250g com verniz UV total na frente.",
    pricingModel: "POR_PACOTE",
    productionType: "PRODUCAO_TERCEIRIZADA",
    leadTime: "2 a 3 dias \xFAteis",
    requiresFile: true,
    ...calcProfit(79.9),
    packages: [
      { id: "pkg-c2-50f", name: "50 frente colorida", quantity: 50, ...calcProfit(66.9) },
      { id: "pkg-c2-50fv", name: "50 frente e verso colorido", quantity: 50, ...calcProfit(69.9) },
      { id: "pkg-c2-100f", name: "100 frente colorida", quantity: 100, ...calcProfit(78.9) },
      { id: "pkg-c2-100fv", name: "100 frente e verso colorido", quantity: 100, ...calcProfit(79.1) },
      { id: "pkg-c2-250f", name: "250 - frente colorida", quantity: 250, ...calcProfit(79.9) },
      { id: "pkg-c2-250fv", name: "250 - frente e verso colorido", quantity: 250, ...calcProfit(104.9) },
      { id: "pkg-c2-500f", name: "500 - frente colorida", quantity: 500, ...calcProfit(109.9) },
      { id: "pkg-c2-500fv", name: "500 - frente e verso colorido", quantity: 500, ...calcProfit(114.9) },
      { id: "pkg-c2-1000f", name: "1000 - frente colorida", quantity: 1e3, ...calcProfit(129.9) },
      { id: "pkg-c2-1000fv", name: "1000 - frente e verso colorido", quantity: 1e3, ...calcProfit(179.9) }
    ],
    active: true,
    showInCatalog: true,
    featuredInCatalog: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];

// src/data/initialData.ts
var DEFAULT_COMMISSION_RATES = {
  PRODUTO_GRAFICO: 10,
  PRODUTO_FISICO: 5,
  SERVICO: 15
};
var INITIAL_RECEIVING_ACCOUNTS = [
  {
    id: "acc-caixa-1",
    type: "CAIXA",
    name: "Caixa \u2014 Caixa f\xEDsico",
    receiverName: "Caixa f\xEDsico",
    active: true,
    isDefault: true,
    notes: "Gaveta / caixa f\xEDsico da loja",
    createdAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "acc-pix-empresa",
    type: "PIX",
    name: "Pix \u2014 Empresa",
    receiverName: "Empresa",
    active: true,
    isDefault: true,
    notes: "Chave Pix CNPJ da empresa",
    createdAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "acc-cartao-empresa",
    type: "CARTAO",
    name: "Cart\xE3o \u2014 Empresa",
    receiverName: "Empresa",
    creditFeePercent: 3.5,
    debitFeePercent: 1.5,
    active: true,
    isDefault: true,
    notes: "Maquininha principal da loja (Cr\xE9dito 3,50% / D\xE9bito 1,50%)",
    createdAt: "2026-08-01T08:00:00Z"
  }
];
var INITIAL_COMPANY_SETTINGS = {
  name: "Gr\xE1fica R\xE1pida e Digital Express",
  tradingName: "Digital Express Impress\xF5es e Servi\xE7os",
  document: "12.345.678/0001-90",
  phone: "(11) 3456-7890",
  whatsapp: "11987654321",
  email: "contato@digitalexpress.com.br",
  address: "Rua do Com\xE9rcio, 450 - Centro Comercial",
  city: "S\xE3o Paulo",
  state: "SP",
  logoUrl: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=150&auto=format&fit=crop&q=80",
  receiptFooterMessage: "Agradecemos a prefer\xEAncia! Or\xE7amentos e pedidos via WhatsApp (11) 98765-4321.",
  paymentMethods: [
    "PIX",
    "Cart\xE3o de Cr\xE9dito",
    "Cart\xE3o de D\xE9bito",
    "Dinheiro",
    "Boleto Banc\xE1rio",
    "Prazo / Credi\xE1rio",
    "Transfer\xEAncia Banc\xE1ria"
  ],
  defaultSupplierFreight: 20,
  commissionRates: { ...DEFAULT_COMMISSION_RATES },
  promoterCommissionPercent: 20
};
var INITIAL_CATEGORIES = OFFICIAL_CATEGORIES;
var INITIAL_ITEMS = IMPORTED_ITEMS;

// src/data/initialServicesAndDocuments.ts
var INITIAL_ONLINE_SERVICES = [
  {
    id: "srv-detran-multas",
    name: "Emiss\xE3o de Multas e D\xE9bitos Veiculares (Detran)",
    category: "Servi\xE7os P\xFAblicos",
    description: "Consulta e emiss\xE3o de guias de multas, IPVA e licenciamento veicular",
    url: "https://www.detran.sp.gov.br/",
    price: 15,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-gov-br",
    name: "Cria\xE7\xE3o e Recupera\xE7\xE3o de Conta GOV.br",
    category: "Governo",
    description: "Acesso \xFAnico do governo federal, aumento de n\xEDvel prata/ouro e recupera\xE7\xE3o de senha",
    url: "https://acesso.gov.br/",
    price: 20,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-agendamento-poupatempo",
    name: "Agendamento Poupatempo / Sine / RG",
    category: "Agendamentos",
    description: "Agendamento de atendimento presencial para emiss\xE3o de RG, CNH e servi\xE7os p\xFAblicos",
    url: "https://www.poupatempo.sp.gov.br/",
    price: 15,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-consulta-cpf-rfb",
    name: "Consulta Situa\xE7\xE3o Cadastral CPF (Receita Federal)",
    category: "Consultas",
    description: "Comprovante de situa\xE7\xE3o cadastral no CPF junto \xE0 Receita Federal",
    url: "https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp",
    price: 10,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-certidao-receita-federal",
    name: "Certid\xE3o Negativa de D\xE9bitos (CND Receita Federal)",
    category: "Documentos",
    description: "Emiss\xE3o de certid\xE3o de d\xE9bitos relativos a cr\xE9ditos tribut\xE1rios federais e \xE0 d\xEDvida ativa da Uni\xE3o",
    url: "https://solucoes.receita.fazenda.gov.br/servicos/certidaointernet/pf/consultapf",
    price: 15,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-antecedentes-pf",
    name: "Atestado de Antecedentes Criminais (Pol\xEDcia Federal)",
    category: "Documentos",
    description: "Certid\xE3o de antecedentes criminais emitida online pela Pol\xEDcia Federal",
    url: "https://servicos.dpf.gov.br/antecedentes-criminais/certidao",
    price: 15,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-portal-empreendedor-mei",
    name: "Portal do Empreendedor MEI (Abertura e Boletos DAS)",
    category: "Governo",
    description: "Inscri\xE7\xE3o MEI, emiss\xE3o do DAS mensal e declara\xE7\xE3o anual do MEI (DASN)",
    url: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor",
    price: 30,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-carteira-trabalho-digital",
    name: "Carteira de Trabalho Digital (CTPS Digital)",
    category: "Governo",
    description: "Consulta aos contratos de trabalho registrados, PIS e abono salarial",
    url: "https://www.gov.br/trabalho-e-emprego/pt-br/servicos/trabalhador/carteira-de-trabalho-digital",
    price: 20,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-quitacao-eleitoral-tse",
    name: "Certid\xE3o de Quita\xE7\xE3o Eleitoral (TSE)",
    category: "Documentos",
    description: "Comprovante de regularidade com a Justi\xE7a Eleitoral para concursos e passaporte",
    url: "https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral#/",
    price: 15,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "srv-consulta-processual-tjsp",
    name: "Consulta Processual / Tribunal de Justi\xE7a",
    category: "Consultas",
    description: "Pesquisa de andamento de processos judiciais de 1\xBA e 2\xBA graus",
    url: "https://esaj.tjsp.jus.br/cpopg/open.do",
    price: 15,
    cost: 0,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  }
];
var INITIAL_DOCUMENT_TEMPLATES = [
  {
    id: "tmpl-curriculo-profissional",
    title: "Curr\xEDculo Profissional",
    category: "Curr\xEDculos",
    description: "Modelo completo para apresenta\xE7\xE3o profissional no mercado de trabalho",
    defaultPrice: 30,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    fields: [
      {
        id: "nome_completo",
        label: "Nome Completo",
        type: "text",
        placeholder: "Ex: Carlos Eduardo de Oliveira",
        required: true,
        customerFieldMapping: "name"
      },
      {
        id: "contato_email",
        label: "E-mail",
        type: "email",
        placeholder: "carlos.oliveira@email.com",
        required: false,
        customerFieldMapping: "email"
      },
      {
        id: "contato_telefone",
        label: "Telefone / WhatsApp",
        type: "phone",
        placeholder: "(11) 98765-4321",
        required: true,
        customerFieldMapping: "phone"
      },
      {
        id: "cidade_estado",
        label: "Cidade e Estado",
        type: "text",
        placeholder: "S\xE3o Paulo - SP",
        required: true,
        customerFieldMapping: "city"
      },
      {
        id: "nacionalidade_estado_civil",
        label: "Nacionalidade, Idade e Estado Civil",
        type: "text",
        placeholder: "Brasileiro(a), 28 anos, Solteiro(a)",
        required: false
      },
      {
        id: "bairro_endereco",
        label: "Bairro / Regi\xE3o",
        type: "text",
        placeholder: "Centro / Zona Leste",
        required: false,
        customerFieldMapping: "address"
      },
      {
        id: "objetivo_profissional",
        label: "Objetivo Profissional",
        type: "textarea",
        placeholder: "Ex: Atuar na \xE1rea de Atendimento ao Cliente, Vendas ou Administra\xE7\xE3o, agregando valor com pontualidade e dedica\xE7\xE3o.",
        required: true
      },
      {
        id: "resumo_qualificacoes",
        label: "Resumo de Qualifica\xE7\xF5es",
        type: "textarea",
        placeholder: "Ex: Profissional proativo com excelente comunica\xE7\xE3o interpessoal, facilidade no aprendizado de novos sistemas e foco em resultados.",
        required: false
      },
      {
        id: "experiencias_profissionais",
        label: "Experi\xEAncia Profissional",
        type: "textarea",
        placeholder: `Ex:
\u2022 Empresa Alpha Com\xE9rcio (2022 - 2024)
Cargo: Assistente de Atendimento
Principais atividades: Atendimento ao p\xFAblico, emiss\xE3o de pedidos, controle de estoque e suporte p\xF3s-venda.

\u2022 Mercado Central (2020 - 2022)
Cargo: Operador de Caixa / Repositor
Principais atividades: Abertura e fechamento de caixa, organiza\xE7\xE3o e controle de mercadorias.`,
        required: true
      },
      {
        id: "formacao_academica",
        label: "Forma\xE7\xE3o Acad\xEAmica / Escolaridade",
        type: "textarea",
        placeholder: `Ex:
\u2022 Ensino M\xE9dio Completo - Escola Estadual Dr. Silva (Conclus\xE3o: 2019)
\u2022 Cursando Administra\xE7\xE3o - UNIP (Previs\xE3o de Formatura: 2026)`,
        required: true
      },
      {
        id: "cursos_habilidades",
        label: "Cursos Complementares e Habilidades",
        type: "textarea",
        placeholder: `Ex:
\u2022 Pacote Office (Word, Excel, PowerPoint) - N\xEDvel Intermedi\xE1rio
\u2022 Atendimento ao Cliente e T\xE9cnicas de Vendas (40h) - SENAC
\u2022 Boa digita\xE7\xE3o e familiaridade com sistemas de PDV`,
        required: false
      },
      {
        id: "informacoes_adicionais",
        label: "Informa\xE7\xF5es Adicionais",
        type: "text",
        placeholder: "Ex: Disponibilidade para in\xEDcio imediato e para viagens / hor\xE1rios flex\xEDveis.",
        required: false
      }
    ],
    templateBody: `# {{nome_completo}}

**{{nacionalidade_estado_civil}}**
\u{1F4CD} {{cidade_estado}}{{#if bairro_endereco}} \u2022 {{bairro_endereco}}{{/if}}
\u{1F4DE} {{contato_telefone}} | \u2709\uFE0F {{contato_email}}

---

### \u{1F3AF} OBJETIVO PROFISSIONAL
{{objetivo_profissional}}

{{#if resumo_qualificacoes}}
---

### \u{1F4A1} RESUMO DE QUALIFICA\xC7\xD5ES
{{resumo_qualificacoes}}
{{/if}}

---

### \u{1F4BC} EXPERI\xCANCIA PROFISSIONAL
{{experiencias_profissionais}}

---

### \u{1F393} FORMA\xC7\xC3O ACAD\xCAMICA
{{formacao_academica}}

{{#if cursos_habilidades}}
---

### \u{1F680} CURSOS E HABILIDADES
{{cursos_habilidades}}
{{/if}}

{{#if informacoes_adicionais}}
---

### \u2139\uFE0F INFORMA\xC7\xD5ES ADICIONAIS
{{informacoes_adicionais}}
{{/if}}
`
  },
  {
    id: "tmpl-contrato-prestacao-servicos",
    title: "Contrato de Presta\xE7\xE3o de Servi\xE7os",
    category: "Contratos",
    description: "Contrato padr\xE3o de presta\xE7\xE3o de servi\xE7os com cl\xE1usulas de obriga\xE7\xF5es, prazos e pagamento",
    defaultPrice: 40,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    fields: [
      {
        id: "contratante_nome",
        label: "Nome / Raz\xE3o Social do Contratante",
        type: "text",
        placeholder: "Nome completo ou Raz\xE3o Social",
        required: true,
        customerFieldMapping: "name"
      },
      {
        id: "contratante_doc",
        label: "CPF ou CNPJ do Contratante",
        type: "text",
        placeholder: "000.000.000-00 ou 00.000.000/0001-00",
        required: true,
        customerFieldMapping: "document"
      },
      {
        id: "contratante_endereco",
        label: "Endere\xE7o Completo do Contratante",
        type: "text",
        placeholder: "Rua, N\xFAmero, Bairro, Cidade - UF",
        required: true,
        customerFieldMapping: "address"
      },
      {
        id: "contratado_nome",
        label: "Nome / Raz\xE3o Social do Contratado (Prestador)",
        type: "text",
        placeholder: "Nome completo do prestador de servi\xE7o",
        required: true
      },
      {
        id: "contratado_doc",
        label: "CPF ou CNPJ do Contratado",
        type: "text",
        placeholder: "000.000.000-00 ou 00.000.000/0001-00",
        required: true
      },
      {
        id: "contratado_endereco",
        label: "Endere\xE7o Completo do Contratado",
        type: "text",
        placeholder: "Rua, N\xFAmero, Bairro, Cidade - UF",
        required: true
      },
      {
        id: "objeto_servico",
        label: "Descri\xE7\xE3o do Servi\xE7o Contratado (Objeto)",
        type: "textarea",
        placeholder: "Descreva detalhadamente o servi\xE7o a ser executado",
        required: true
      },
      {
        id: "valor_total",
        label: "Valor Total dos Servi\xE7os (R$)",
        type: "text",
        placeholder: "Ex: R$ 1.500,00 (um mil e quinhentos reais)",
        required: true
      },
      {
        id: "forma_pagamento",
        label: "Forma e Condi\xE7\xF5es de Pagamento",
        type: "textarea",
        placeholder: "Ex: 50% de entrada no ato da assinatura via PIX e 50% na entrega final do servi\xE7o.",
        required: true
      },
      {
        id: "prazo_execucao",
        label: "Prazo de Execu\xE7\xE3o / Entrega",
        type: "text",
        placeholder: "Ex: 15 (quinze) dias \xFAteis a contar da data de assinatura deste contrato.",
        required: true
      },
      {
        id: "cidade_foro",
        label: "Cidade do Foro / Comarca",
        type: "text",
        placeholder: "S\xE3o Paulo - SP",
        required: true,
        customerFieldMapping: "city"
      },
      {
        id: "data_contrato",
        label: "Data do Contrato",
        type: "text",
        placeholder: "Ex: 27 de Agosto de 2026",
        required: true
      }
    ],
    templateBody: `# CONTRATO DE PRESTA\xC7\xC3O DE SERVI\xC7OS

Pelo presente instrumento particular, de um lado:

**CONTRATANTE:** {{contratante_nome}}, inscrito(a) no CPF/CNPJ sob o n\xBA {{contratante_doc}}, residente e domiciliado(a) em {{contratante_endereco}}.

E de outro lado:

**CONTRATADO:** {{contratado_nome}}, inscrito(a) no CPF/CNPJ sob o n\xBA {{contratado_doc}}, residente e domiciliado(a) em {{contratado_endereco}}.

T\xEAm, entre si, justo e contratado o que se segue:

### CL\xC1USULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a presta\xE7\xE3o, pelo CONTRATADO ao CONTRATANTE, dos seguintes servi\xE7os:
{{objeto_servico}}

### CL\xC1USULA SEGUNDA - DO VALOR E FORMA DE PAGAMENTO
Pela presta\xE7\xE3o dos servi\xE7os ora contratados, o CONTRATANTE pagar\xE1 ao CONTRATADO o valor total de **{{valor_total}}**, mediante as seguintes condi\xE7\xF5es:
{{forma_pagamento}}

### CL\xC1USULA TERCEIRA - DO PRAZO
O prazo estipulado para a conclus\xE3o e entrega dos servi\xE7os descritos na Cl\xE1usula Primeira \xE9 de **{{prazo_execucao}}**.

### CL\xC1USULA QUARTA - DAS OBRIGA\xC7\xD5ES
1. O CONTRATADO obriga-se a executar os servi\xE7os com dilig\xEAncia, t\xE9cnica adequada e dentro dos padr\xF5es de qualidade esperados.
2. O CONTRATANTE obriga-se a fornecer todas as informa\xE7\xF5es e subs\xEDdios necess\xE1rios \xE0 realiza\xE7\xE3o dos trabalhos, bem como efetuar os pagamentos nas datas aprazadas.

### CL\xC1USULA QUINTA - DO FORO
Para dirimir quaisquer controv\xE9rsias oriundas do presente contrato, as partes elegem o foro da comarca de **{{cidade_foro}}**, com ren\xFAncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma.

**{{cidade_foro}}, {{data_contrato}}**


________________________________________________
**CONTRATANTE:** {{contratante_nome}}
CPF/CNPJ: {{contratante_doc}}


________________________________________________
**CONTRATADO:** {{contratado_nome}}
CPF/CNPJ: {{contratado_doc}}
`
  },
  {
    id: "tmpl-declaracao-residencia",
    title: "Declara\xE7\xE3o de Resid\xEAncia",
    category: "Declara\xE7\xF5es",
    description: "Declara\xE7\xE3o formal de resid\xEAncia quando o comprovante de endere\xE7o n\xE3o est\xE1 no nome do solicitante",
    defaultPrice: 15,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    fields: [
      {
        id: "declarante_nome",
        label: "Nome do Titular do Im\xF3vel (Declarante)",
        type: "text",
        placeholder: "Nome do titular da conta de luz/\xE1gua",
        required: true
      },
      {
        id: "declarante_doc",
        label: "CPF do Declarante",
        type: "text",
        placeholder: "000.000.000-00",
        required: true
      },
      {
        id: "declarante_rg",
        label: "RG do Declarante",
        type: "text",
        placeholder: "00.000.000-0 SSP/SP",
        required: false
      },
      {
        id: "residente_nome",
        label: "Nome da Pessoa que Reside no Im\xF3vel (Benefici\xE1rio)",
        type: "text",
        placeholder: "Nome do cliente",
        required: true,
        customerFieldMapping: "name"
      },
      {
        id: "residente_doc",
        label: "CPF do Benefici\xE1rio",
        type: "text",
        placeholder: "000.000.000-00",
        required: true,
        customerFieldMapping: "document"
      },
      {
        id: "residente_rg",
        label: "RG do Benefici\xE1rio",
        type: "text",
        placeholder: "00.000.000-0 SSP/SP",
        required: false
      },
      {
        id: "endereco_completo",
        label: "Endere\xE7o Completo do Im\xF3vel",
        type: "text",
        placeholder: "Rua Exemplo, n\xBA 123, Apto 45, Bairro Centro",
        required: true,
        customerFieldMapping: "address"
      },
      {
        id: "cidade_estado",
        label: "Cidade e Estado",
        type: "text",
        placeholder: "S\xE3o Paulo - SP",
        required: true,
        customerFieldMapping: "city"
      },
      {
        id: "cep",
        label: "CEP",
        type: "text",
        placeholder: "01001-000",
        required: false
      },
      {
        id: "data_declaracao",
        label: "Data da Declara\xE7\xE3o",
        type: "text",
        placeholder: "27 de Agosto de 2026",
        required: true
      }
    ],
    templateBody: `# DECLARA\xC7\xC3O DE RESID\xCANCIA

Eu, **{{declarante_nome}}**, inscrito(a) no CPF sob o n\xBA **{{declarante_doc}}**{{#if declarante_rg}}, portador(a) do RG n\xBA {{declarante_rg}}{{/if}}, titular e respons\xE1vel pelo im\xF3vel situado em:

\u{1F4CD} **{{endereco_completo}}**
Cidade: **{{cidade_estado}}**{{#if cep}} | CEP: **{{cep}}**{{/if}}

DECLARO, para os devidos fins de direito e sob as penas da Lei n\xBA 7.115/1983 e do Artigo 299 do C\xF3digo Penal Brasileiro (Falsidade Ideol\xF3gica), que:

O(A) Sr.(a) **{{residente_nome}}**, inscrito(a) no CPF sob o n\xBA **{{residente_doc}}**{{#if residente_rg}}, portador(a) do RG n\xBA {{residente_rg}}{{/if}}, **RESIDE E DOMICILIA-SE NO REFERIDO ENDERE\xC7O** citado acima.

Por ser a mais pura express\xE3o da verdade, firmo a presente declara\xE7\xE3o para que produza seus efeitos legais e jur\xEDdicos.

**{{cidade_estado}}, {{data_declaracao}}**


________________________________________________
**{{declarante_nome}}**
CPF: {{declarante_doc}}
(Declarante / Titular do Im\xF3vel)


________________________________________________
**{{residente_nome}}**
CPF: {{residente_doc}}
(Residente / Solicitante)
`
  },
  {
    id: "tmpl-procuracao-simples",
    title: "Procura\xE7\xE3o Simples (Poderes Espec\xEDficos)",
    category: "Procura\xE7\xF5es",
    description: "Instrumento particular de mandato para representa\xE7\xE3o perante \xF3rg\xE3os p\xFAblicos, empresas e cart\xF3rios",
    defaultPrice: 25,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    fields: [
      {
        id: "outorgante_nome",
        label: "Nome do Outorgante (Quem concede os poderes)",
        type: "text",
        placeholder: "Nome completo",
        required: true,
        customerFieldMapping: "name"
      },
      {
        id: "outorgante_doc",
        label: "CPF do Outorgante",
        type: "text",
        placeholder: "000.000.000-00",
        required: true,
        customerFieldMapping: "document"
      },
      {
        id: "outorgante_rg",
        label: "RG do Outorgante",
        type: "text",
        placeholder: "00.000.000-0 SSP/SP",
        required: false
      },
      {
        id: "outorgante_endereco",
        label: "Endere\xE7o do Outorgante",
        type: "text",
        placeholder: "Rua, N\xFAmero, Bairro, Cidade - UF",
        required: true,
        customerFieldMapping: "address"
      },
      {
        id: "outorgado_nome",
        label: "Nome do Outorgado (Procurador / Representante)",
        type: "text",
        placeholder: "Nome do procurador",
        required: true
      },
      {
        id: "outorgado_doc",
        label: "CPF do Outorgado",
        type: "text",
        placeholder: "000.000.000-00",
        required: true
      },
      {
        id: "outorgado_rg",
        label: "RG do Outorgado",
        type: "text",
        placeholder: "00.000.000-0 SSP/SP",
        required: false
      },
      {
        id: "outorgado_endereco",
        label: "Endere\xE7o do Outorgado",
        type: "text",
        placeholder: "Rua, N\xFAmero, Bairro, Cidade - UF",
        required: true
      },
      {
        id: "poderes_especificos",
        label: "Poderes Concedidos / Finalidade",
        type: "textarea",
        placeholder: "Ex: amplos poderes para represent\xE1-lo junto ao DETRAN/SP e Poupatempo, exclusivamente para dar entrada, requerer, retirar segunda via de documentos do ve\xEDculo placa ABC-1234, assinar requerimentos e praticar os atos necess\xE1rios ao fiel cumprimento deste mandato.",
        required: true
      },
      {
        id: "cidade_data",
        label: "Cidade e Data",
        type: "text",
        placeholder: "S\xE3o Paulo - SP, 27 de Agosto de 2026",
        required: true
      }
    ],
    templateBody: `# PROCURA\xC7\xC3O PARTICULAR

**OUTORGANTE:**
Nome: **{{outorgante_nome}}**, inscrito(a) no CPF sob o n\xBA **{{outorgante_doc}}**{{#if outorgante_rg}}, portador(a) do RG n\xBA {{outorgante_rg}}{{/if}}, residente e domiciliado(a) em {{outorgante_endereco}}.

**OUTORGADO(A):**
Nome: **{{outorgado_nome}}**, inscrito(a) no CPF sob o n\xBA **{{outorgado_doc}}**{{#if outorgado_rg}}, portador(a) do RG n\xBA {{outorgado_rg}}{{/if}}, residente e domiciliado(a) em {{outorgado_endereco}}.

**PODERES:**
Pelo presente instrumento particular de procura\xE7\xE3o, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) seu(sua) bastante procurador(a), conferindo-lhe poderes especiais para:

{{poderes_especificos}}

Podendo para tanto assinar termos, requerimentos, guias, dar e receber quita\xE7\xE3o, retirar certid\xF5es e documentos pertinentes, praticando, enfim, todos os atos indispens\xE1veis e necess\xE1rios ao fiel e cabal desempenho do presente mandato, que dar\xE1 tudo por bom, firme e valioso.

**{{cidade_data}}**


________________________________________________
**{{outorgante_nome}}**
CPF: {{outorgante_doc}}
(Outorgante)
`
  },
  {
    id: "tmpl-recibo-simples",
    title: "Recibo de Pagamento / Presta\xE7\xE3o",
    category: "Recibos",
    description: "Comprovante de recebimento de valores em moeda corrente ou transfer\xEAncia para transa\xE7\xF5es e servi\xE7os",
    defaultPrice: 10,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    fields: [
      {
        id: "recebedor_nome",
        label: "Nome de Quem Recebeu (Emissor)",
        type: "text",
        placeholder: "Nome completo ou Raz\xE3o Social",
        required: true
      },
      {
        id: "recebedor_doc",
        label: "CPF/CNPJ do Emissor",
        type: "text",
        placeholder: "000.000.000-00",
        required: true
      },
      {
        id: "pagador_nome",
        label: "Nome de Quem Pagou (Cliente/Pagador)",
        type: "text",
        placeholder: "Nome completo do pagador",
        required: true,
        customerFieldMapping: "name"
      },
      {
        id: "pagador_doc",
        label: "CPF/CNPJ do Pagador",
        type: "text",
        placeholder: "000.000.000-00",
        required: false,
        customerFieldMapping: "document"
      },
      {
        id: "valor_reais",
        label: "Valor Num\xE9rico (R$)",
        type: "text",
        placeholder: "R$ 450,00",
        required: true
      },
      {
        id: "valor_extenso",
        label: "Valor por Extenso",
        type: "text",
        placeholder: "quatrocentos e cinquenta reais",
        required: true
      },
      {
        id: "referente_a",
        label: "Referente ao Pagamento de",
        type: "textarea",
        placeholder: "Ex: Presta\xE7\xE3o de servi\xE7os de impress\xE3o gr\xE1fica de 1.000 panfletos e cria\xE7\xE3o de arte visual.",
        required: true
      },
      {
        id: "cidade_data",
        label: "Cidade e Data",
        type: "text",
        placeholder: "S\xE3o Paulo - SP, 27 de Agosto de 2026",
        required: true
      }
    ],
    templateBody: `# RECIBO DE PAGAMENTO

**VALOR:** {{valor_reais}} ({{valor_extenso}})

Recebi(emos) de **{{pagador_nome}}**{{#if pagador_doc}}, inscrito(a) no CPF/CNPJ sob o n\xBA **{{pagador_doc}}**{{/if}}, a import\xE2ncia supra de **{{valor_reais}}** ({{valor_extenso}}), referente a:

{{referente_a}}

Para maior clareza e comprova\xE7\xE3o, firmo(amos) o presente recibo dando plena, rasa e geral quita\xE7\xE3o pela quantia recebida.

**{{cidade_data}}**


________________________________________________
**{{recebedor_nome}}**
CPF/CNPJ: {{recebedor_doc}}
`
  },
  {
    id: "tmpl-requerimento-administrativo",
    title: "Requerimento / Solicita\xE7\xE3o Administrativa",
    category: "Requerimentos",
    description: "Solicita\xE7\xE3o formal endere\xE7ada a \xF3rg\xE3os p\xFAblicos, prefeituras, escolas ou empresas",
    defaultPrice: 20,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    fields: [
      {
        id: "destinatario_orgao",
        label: "\xD3rg\xE3o / Autoridade Destinat\xE1ria",
        type: "text",
        placeholder: "Ex: Ao Ilmo. Senhor Diretor do Departamento de Tr\xE2nsito / Prefeitura Municipal",
        required: true
      },
      {
        id: "requerente_nome",
        label: "Nome Completo do Requerente",
        type: "text",
        placeholder: "Nome do solicitante",
        required: true,
        customerFieldMapping: "name"
      },
      {
        id: "requerente_doc",
        label: "CPF do Requerente",
        type: "text",
        placeholder: "000.000.000-00",
        required: true,
        customerFieldMapping: "document"
      },
      {
        id: "requerente_rg",
        label: "RG do Requerente",
        type: "text",
        placeholder: "00.000.000-0",
        required: false
      },
      {
        id: "requerente_endereco",
        label: "Endere\xE7o do Requerente",
        type: "text",
        placeholder: "Rua, N\xFAmero, Bairro, Cidade - UF",
        required: true,
        customerFieldMapping: "address"
      },
      {
        id: "contato_fone_email",
        label: "Telefone e E-mail para Contato",
        type: "text",
        placeholder: "(11) 98765-4321 | email@exemplo.com",
        required: false,
        customerFieldMapping: "phone"
      },
      {
        id: "objeto_pedido",
        label: "Objeto da Solicita\xE7\xE3o (O que est\xE1 sendo requerido)",
        type: "textarea",
        placeholder: "Ex: Vem respeitosamente requerer a emiss\xE3o de 2\xAA via do hist\xF3rico escolar / cancelamento de cobran\xE7a indevida / certid\xE3o de tempo de servi\xE7o.",
        required: true
      },
      {
        id: "justificativa",
        label: "Justificativa / Fatos Explicativos",
        type: "textarea",
        placeholder: "Ex: O requerente necessita do referido documento para fins de comprova\xE7\xE3o junto \xE0 institui\xE7\xE3o de ensino superior.",
        required: false
      },
      {
        id: "cidade_data",
        label: "Cidade e Data",
        type: "text",
        placeholder: "S\xE3o Paulo - SP, 27 de Agosto de 2026",
        required: true
      }
    ],
    templateBody: `# REQUERIMENTO

**{{destinatario_orgao}}**

**REQUERENTE:**
Nome: **{{requerente_nome}}**, inscrito(a) no CPF sob o n\xBA **{{requerente_doc}}**{{#if requerente_rg}}, portador(a) do RG n\xBA {{requerente_rg}}{{/if}}, residente e domiciliado(a) em {{requerente_endereco}}{{#if contato_fone_email}}, contato: {{contato_fone_email}}{{/if}}.

Vem, mui respeitosamente, \xE0 presen\xE7a de V. Sa., expor e **REQUERER** o quanto segue:

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
`
  },
  {
    id: "tmpl-carta-demissao",
    title: "Carta de Demiss\xE3o / Pedido de Rescis\xE3o",
    category: "Cartas",
    description: "Comunica\xE7\xE3o formal de desligamento volunt\xE1rio de emprego com op\xE7\xE3o de aviso pr\xE9vio",
    defaultPrice: 15,
    active: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    fields: [
      {
        id: "empresa_nome",
        label: "Nome da Empresa / Empregador",
        type: "text",
        placeholder: "Ex: Com\xE9rcio e Servi\xE7os Ltda",
        required: true
      },
      {
        id: "empregado_nome",
        label: "Nome do Empregado",
        type: "text",
        placeholder: "Nome completo",
        required: true,
        customerFieldMapping: "name"
      },
      {
        id: "empregado_cpf",
        label: "CPF do Empregado",
        type: "text",
        placeholder: "000.000.000-00",
        required: true,
        customerFieldMapping: "document"
      },
      {
        id: "cargo_funcao",
        label: "Cargo / Fun\xE7\xE3o Desempenhada",
        type: "text",
        placeholder: "Ex: Auxiliar Administrativo",
        required: true
      },
      {
        id: "aviso_previo_opcao",
        label: "Cumprimento do Aviso Pr\xE9vio",
        type: "select",
        options: [
          "Solicito a dispensa do cumprimento do aviso pr\xE9vio",
          "Cumprirei integralmente o per\xEDodo de 30 dias de aviso pr\xE9vio"
        ],
        required: true
      },
      {
        id: "cidade_data",
        label: "Cidade e Data",
        type: "text",
        placeholder: "S\xE3o Paulo - SP, 27 de Agosto de 2026",
        required: true
      }
    ],
    templateBody: `# CARTA DE PEDIDO DE DEMISS\xC3O

\xC0
**{{empresa_nome}}**

Prezados Senhores,

Venho por meio desta comunicar formalmente o meu **PEDIDO DE DEMISS\xC3O** do cargo de **{{cargo_funcao}}**, o qual venho desempenhando nesta empresa.

Informo que, por motivos estritamente pessoais e profissionais, opto pelo encerramento de minhas atividades laborais.

Em rela\xE7\xE3o ao aviso pr\xE9vio: **{{aviso_previo_opcao}}**.

Agrade\xE7o \xE0 dire\xE7\xE3o e aos colegas de trabalho pela oportunidade, aprendizado e conviv\xEAncia durante o per\xEDodo em que fiz parte desta organiza\xE7\xE3o.

**{{cidade_data}}**


________________________________________________
**{{empregado_nome}}**
CPF: {{empregado_cpf}}
(Empregado)


________________________________________________
**CIENTE DO EMPREGADOR:**
Em: ____ / ____ / ________
Assinatura / Carimbo do Respons\xE1vel
`
  }
];

// src/data/initialProspectingData.ts
var INITIAL_OPPORTUNITIES = [
  {
    id: "opp-1",
    opportunityNumber: "OPP-001",
    name: "Espa\xE7o Bella & Elegance (Sal\xE3o e Est\xE9tica)",
    contactName: "Juliana Mendes",
    segment: "Sal\xE3o de Beleza & Est\xE9tica",
    neighborhood: "Centro",
    city: "S\xE3o Paulo",
    phone: "(11) 98711-2233",
    whatsapp: "(11) 98711-2233",
    instagram: "@espacobellaelegance",
    needs: ["Melhorar a divulga\xE7\xE3o", "Precisa de material gr\xE1fico", "Precisa de cart\xF5es"],
    needsDescription: "Inaugurou h\xE1 2 meses e precisa de cart\xF5es fidelidade, tags de valores e banner de fachada.",
    origin: "PROSPECCAO_PRESENCIAL",
    stage: "A_CONTATAR",
    assignedUserId: "usr-vendedor-1",
    assignedUserName: "Lucas Silva",
    notes: "Local com bastante fluxo de pedestres, propriet\xE1ria demonstrou muito interesse em pacotes completos.",
    nextAction: {
      type: "WHATSAPP",
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      time: "14:00",
      note: "Enviar mensagem de apresenta\xE7\xE3o com o Kit Sal\xE3o de Beleza",
      completed: false
    },
    suggestedPackageIds: ["pkg-salao-beleza"],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString()
  },
  {
    id: "opp-2",
    opportunityNumber: "OPP-002",
    name: "Burger & Cia Gourmet",
    contactName: "Rodrigo Ferreira",
    segment: "Restaurante & Lanchonete",
    neighborhood: "Jardins",
    city: "S\xE3o Paulo",
    phone: "(11) 97654-8899",
    whatsapp: "(11) 97654-8899",
    instagram: "@burgerciagourmet",
    needs: ["Precisa de impress\xE3o", "Precisa de comunica\xE7\xE3o visual", "Precisa atualizar materiais"],
    needsDescription: "Mudou o card\xE1pio e precisa de 30 card\xE1pios plastificados, 1000 panfletos e 2 banners promocionais.",
    origin: "WHATSAPP",
    stage: "ORCAMENTO",
    assignedUserId: "usr-vendedor-2",
    assignedUserName: "Camila Santos",
    notes: "Cliente solicitou or\xE7amento urgente para entrega at\xE9 sexta-feira.",
    nextAction: {
      type: "RETOMAR_NEGOCIACAO",
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      time: "10:30",
      note: "Confirmar se recebeu a proposta em PDF e tirar d\xFAvidas sobre acabamento",
      completed: false
    },
    suggestedPackageIds: ["pkg-restaurante-food"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString()
  },
  {
    id: "opp-3",
    opportunityNumber: "OPP-003",
    name: "Dra. Patricia Lima - Odontologia",
    contactName: "Dra. Patricia",
    segment: "Consult\xF3rio & Sa\xFAde",
    neighborhood: "Vila Mariana",
    city: "S\xE3o Paulo",
    phone: "(11) 99123-4567",
    whatsapp: "(11) 99123-4567",
    needs: ["Precisa de material gr\xE1fico", "Precisa de cart\xF5es", "Precisa organizar documentos"],
    needsDescription: "Precisa de receitu\xE1rios personalizados, pastas com bolsa para exames e cart\xF5es de visita com verniz localizado.",
    origin: "PESQUISA_PROPRIA",
    stage: "CONTATADO",
    assignedUserId: "usr-vendedor-1",
    assignedUserName: "Lucas Silva",
    notes: "Secret\xE1ria pediu para enviar apresenta\xE7\xE3o e valores por WhatsApp.",
    nextAction: {
      type: "WHATSAPP",
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
      time: "09:00",
      note: "Retornar com proposta de receitu\xE1rios e pastas",
      completed: false
    },
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString()
  },
  {
    id: "opp-4",
    opportunityNumber: "OPP-004",
    name: "Auto El\xE9trica & Mec\xE2nica S\xE3o Pedro",
    contactName: "Carlos Eduardo",
    segment: "Oficina & Automotivo",
    neighborhood: "Mooca",
    city: "S\xE3o Paulo",
    phone: "(11) 98222-3344",
    whatsapp: "(11) 98222-3344",
    needs: ["Possui neg\xF3cio novo", "Precisa de banner", "Precisa de comunica\xE7\xE3o visual"],
    needsDescription: "Fachada nova, precisa de adesivo perfurado para vidro, placa de ACM/lona e tal\xF5es de ordem de servi\xE7o em 2 vias.",
    origin: "PROSPECCAO_PRESENCIAL",
    stage: "IDENTIFICADO",
    assignedUserId: "usr-promotor-1",
    assignedUserName: "Gabriel Martins (Promotor)",
    notes: "Oficina rec\xE9m-aberta na esquina principal da avenida.",
    nextAction: {
      type: "LIGACAO",
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      time: "15:00",
      note: "Fazer primeiro contato telef\xF4nico com o propriet\xE1rio",
      completed: false
    },
    suggestedPackageIds: ["pkg-novo-negocio"],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString()
  }
];
var INITIAL_PACKAGES = [
  {
    id: "pkg-novo-negocio",
    name: "Kit Novo Neg\xF3cio & Abertura",
    description: "Tudo o que uma empresa nova precisa para abrir as portas com presen\xE7a profissional: cart\xF5es, panfletos de inaugura\xE7\xE3o, banner e tal\xE3o de recibo/comanda.",
    targetSegment: "Com\xE9rcio & Servi\xE7os Gerais",
    originalTotal: 380,
    packagePrice: 319,
    discountPercent: 16,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: "prod-cartao-couche-1000",
        itemName: "1.000 Cart\xF5es de Visita Couch\xEA 250g (Verniz Total Frente)",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 85,
        totalPrice: 85
      },
      {
        itemId: "prod-panfleto-10x14-1000",
        itemName: "1.000 Panfletos 10x14cm Couch\xEA 90g (4x0 Colorido)",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 120,
        totalPrice: 120
      },
      {
        itemId: "prod-banner-lona-80x120",
        itemName: "Banner em Lona 80x120cm c/ Bast\xE3o e Cord\xE3o",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 95,
        totalPrice: 95
      },
      {
        itemId: "prod-talao-recibo-100fls",
        itemName: "Bloco/Tal\xE3o Personalizado 100 Folhas 1 Via (10x15cm)",
        itemType: "PRODUTO_GRAFICO",
        quantity: 2,
        unitPrice: 40,
        totalPrice: 80
      }
    ],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "pkg-restaurante-food",
    name: "Kit Restaurante, Bar & Lanchonete",
    description: "Solu\xE7\xE3o completa para alimenta\xE7\xE3o: card\xE1pios resistentes, panfletos de delivery para distribui\xE7\xE3o, comandas e \xEDm\xE3s de geladeira.",
    targetSegment: "Restaurante & Lanchonete",
    originalTotal: 460,
    packagePrice: 389,
    discountPercent: 15,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: "prod-panfleto-10x14-2500",
        itemName: "2.500 Panfletos de Delivery 10x14cm Couch\xEA 90g",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 180,
        totalPrice: 180
      },
      {
        itemId: "prod-cardapio-plastificado-a4",
        itemName: "10 Card\xE1pios A4 Plastifica\xE7\xE3o R\xEDgida Polaseal",
        itemType: "PRODUTO_GRAFICO",
        quantity: 10,
        unitPrice: 15,
        totalPrice: 150
      },
      {
        itemId: "prod-ima-geladeira-500",
        itemName: "500 \xCDm\xE3s de Geladeira com Calend\xE1rio/Contato",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 130,
        totalPrice: 130
      }
    ],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "pkg-salao-beleza",
    name: "Kit Sal\xE3o de Beleza, Est\xE9tica & Barbearia",
    description: "Aumente o retorno e a fideliza\xE7\xE3o das suas clientes com cart\xF5es fidelidade, tags de produtos e banners promocionais dos servi\xE7os.",
    targetSegment: "Sal\xE3o de Beleza & Est\xE9tica",
    originalTotal: 290,
    packagePrice: 245,
    discountPercent: 15,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: "prod-cartao-fidelidade-1000",
        itemName: "1.000 Cart\xF5es Fidelidade Personalizados (Frente e Verso)",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 110,
        totalPrice: 110
      },
      {
        itemId: "prod-banner-tabela-precos",
        itemName: "Banner Tabela de Servi\xE7os & Valores 60x90cm",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 75,
        totalPrice: 75
      },
      {
        itemId: "prod-adesivos-redondos-500",
        itemName: "500 Adesivos Redondos Vinil para Embalagens e Mimos",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 105,
        totalPrice: 105
      }
    ],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "pkg-eventos-festas",
    name: "Kit Eventos, Shows & Festas",
    description: "Tudo para o seu evento bombar: ingressos de seguran\xE7a/pulseiras, cartazes de divulga\xE7\xE3o, crach\xE1s e faixas/banners.",
    targetSegment: "Eventos & Festas",
    originalTotal: 520,
    packagePrice: 439,
    discountPercent: 16,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: "prod-cartaz-a3-100",
        itemName: "100 Cartazes A3 Couch\xEA Brilho para Divulga\xE7\xE3o",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 160,
        totalPrice: 160
      },
      {
        itemId: "prod-pulseiras-500",
        itemName: "500 Pulseiras de Identifica\xE7\xE3o Tyvek com Lacre Antifraude",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 140,
        totalPrice: 140
      },
      {
        itemId: "prod-banner-evento-100x150",
        itemName: "Banner Fotogr\xE1fico em Lona 100x150cm c/ Acabamento",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 120,
        totalPrice: 120
      },
      {
        itemId: "prod-crachas-credenciais-20",
        itemName: "20 Credenciais em PVC com Cord\xE3o Personalizado",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100
      }
    ],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "pkg-autonomo-profissional",
    name: "Kit Profissional Liberal & Aut\xF4nomo",
    description: "Destaque sua autoridade profissional: cart\xF5es de visita premium, bloco de receitu\xE1rio/proposta e pasta personalizada.",
    targetSegment: "Profissional Aut\xF4nomo & Sa\xFAde",
    originalTotal: 310,
    packagePrice: 260,
    discountPercent: 16,
    active: true,
    featuredInPublic: true,
    items: [
      {
        itemId: "prod-cartao-premium-1000",
        itemName: "1.000 Cart\xF5es de Visita Premium Couch\xEA 300g Lamina\xE7\xE3o Fosca",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 110,
        totalPrice: 110
      },
      {
        itemId: "prod-bloco-receituario-5x",
        itemName: "5 Blocos de Receitu\xE1rio / Relat\xF3rio (50 Folhas cada)",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 90,
        totalPrice: 90
      },
      {
        itemId: "prod-pastas-personalizadas-50",
        itemName: "50 Pastas com Bolsa Interna para Propostas e Laudos",
        itemType: "PRODUTO_GRAFICO",
        quantity: 1,
        unitPrice: 110,
        totalPrice: 110
      }
    ],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var INITIAL_APPROACH_TEMPLATES = [
  {
    id: "tpl-1",
    title: "1\xAA Abordagem \u2014 Neg\xF3cio Local / Novo Estabelecimento",
    category: "Primeiro Contato",
    targetStage: "A_CONTATAR",
    templateText: `Ol\xE1, [NOME]! Tudo bem?

Me chamo [VENDEDOR], da *[EMPRESA]*. Notei a presen\xE7a do *[NOME_DO_NEGOCIO]* aqui na nossa regi\xE3o e gostaria de parabeniz\xE1-los!

Estamos com condi\xE7\xF5es especiais em materiais gr\xE1ficos e comunica\xE7\xE3o visual (como cart\xF5es de visita, banners, panfletos e adesivos) para ajudar a movimentar ainda mais as suas vendas.

Voc\xEAs t\xEAm alguma demanda de impress\xE3o ou divulga\xE7\xE3o prevista para os pr\xF3ximos dias? Posso montar uma simula\xE7\xE3o sem compromisso!`,
    isDefault: true,
    active: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "tpl-2",
    title: "Apresenta\xE7\xE3o de Pacote \u2014 Kit Promocional",
    category: "Oferta de Pacote",
    targetStage: "INTERESSADO",
    templateText: `Ol\xE1, [NOME]! Como voc\xEA est\xE1?

Aqui \xE9 o [VENDEDOR] da *[EMPRESA]*.

Pensando nas necessidades do seu segmento de *[NECESSIDADE]*, preparamos uma solu\xE7\xE3o completa: o *[PACOTE_SUGERIDO]*. 

Com ele, voc\xEA garante todos os materiais essenciais com um desconto especial de lan\xE7amento e agilidade na entrega!

Gostaria de dar uma olhada na composi\xE7\xE3o e nos valores desse kit?`,
    isDefault: true,
    active: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "tpl-3",
    title: "Follow-up / Retorno de Or\xE7amento Enviado",
    category: "P\xF3s-Or\xE7amento",
    targetStage: "ORCAMENTO",
    templateText: `Ol\xE1, [NOME]! Tudo bem?

Aqui \xE9 o [VENDEDOR] da *[EMPRESA]*.

Passando para saber se voc\xEA conseguiu avaliar a proposta de or\xE7amento que te enviei recentemente. 

Ficou com alguma d\xFAvida sobre os prazos de produ\xE7\xE3o, acabamentos ou formas de pagamento facilitadas? 

Estamos com a fila de produ\xE7\xE3o aberta para essa semana e consigo priorizar o seu pedido se confirmarmos hoje!`,
    isDefault: true,
    active: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "tpl-4",
    title: "Retomada de Contato / Lead Antigo",
    category: "Retorno",
    targetStage: "CONTATADO",
    templateText: `Oi, [NOME], tudo bem?

\xC9 o [VENDEDOR] da *[EMPRESA]*.

Estou revisando meus contatos e lembrei da nossa conversa sobre as demandas do *[NOME_DO_NEGOCIO]*. 

Como est\xE3o os materiais de divulga\xE7\xE3o de voc\xEAs no momento? Precisando repor cart\xF5es, panfletos, adesivos ou faixas, temos condi\xE7\xF5es especiais para clientes da nossa regi\xE3o!

Se precisar de qualquer or\xE7amento r\xE1pido, estou 100% \xE0 disposi\xE7\xE3o!`,
    isDefault: false,
    active: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "tpl-5",
    title: "Abordagem R\xE1pida \u2014 WhatsApp Direto",
    category: "Primeiro Contato",
    targetStage: "A_CONTATAR",
    templateText: `Ol\xE1, [NOME]! Tudo bem?
Aqui \xE9 o [VENDEDOR] da *[EMPRESA]*.

Trabalhamos com produ\xE7\xE3o r\xE1pida de cart\xF5es, panfletos, banners, comandas e comunica\xE7\xE3o visual para empresas e com\xE9rcios da nossa cidade.

Se precisar de or\xE7amento r\xE1pido com pre\xE7o direto de f\xE1brica, \xE9 s\xF3 me mandar o que voc\xEA precisa que calculo na hora para voc\xEA!`,
    isDefault: false,
    active: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var INITIAL_COMPLEMENTARY_RULES = [
  {
    id: "comp-1",
    baseItemId: "cartoes",
    baseItemName: "Cart\xE3o de Visita",
    suggestedItemIds: ["panfletos", "adesivos", "banners"],
    notes: "Quem faz cart\xE3o quase sempre precisa de panfletos para divulga\xE7\xE3o e adesivos para produtos."
  },
  {
    id: "comp-2",
    baseItemId: "panfletos",
    baseItemName: "Panfleto / Folheto",
    suggestedItemIds: ["cartoes", "banners", "imas"],
    notes: "Complementar com \xEDm\xE3s de geladeira e banners para ponto de venda."
  },
  {
    id: "comp-3",
    baseItemId: "banners",
    baseItemName: "Banner em Lona / Faixa",
    suggestedItemIds: ["panfletos", "cartoes", "adesivos"],
    notes: "Complementar com adesivos de vitrine e cart\xF5es de balc\xE3o."
  },
  {
    id: "comp-4",
    baseItemId: "cardapios",
    baseItemName: "Card\xE1pio / Menu",
    suggestedItemIds: ["panfletos", "imas", "comandas"],
    notes: "Complementar com tal\xF5es de comanda e panfletos de delivery."
  }
];
var INITIAL_PUBLIC_SEGMENT_PAGES = [
  {
    id: "seg-saloes",
    slug: "saloes-e-estetica",
    segment: "Sal\xF5es de Beleza & Cl\xEDnicas de Est\xE9tica",
    title: "Solu\xE7\xF5es Gr\xE1ficas e Visuais para Sal\xF5es de Beleza & Est\xE9tica",
    headline: "Encante suas clientes e aumente o retorno aos seus atendimentos",
    description: "Materiais profissionais criados sob medida para sal\xF5es, barbearias, esmalterias e cl\xEDnicas de est\xE9tica: cart\xF5es fidelidade, tabelas de servi\xE7os, banners e adesivos para embalagens.",
    badgeText: "\u2B50 Especial para Est\xE9tica & Beleza",
    suggestedPackageIds: ["pkg-salao-beleza"],
    suggestedProductIds: [],
    active: true
  },
  {
    id: "seg-restaurantes",
    slug: "restaurantes-e-delivery",
    segment: "Restaurantes, Bares, Lanchonetes & Delivery",
    title: "Materiais Gr\xE1ficos de Alto Impacto para Gastronomia",
    headline: "Venda mais todos os dias no sal\xE3o e no delivery",
    description: "Card\xE1pios resistentes e f\xE1ceis de limpar, panfletos de entrega com alta convers\xE3o, \xEDm\xE3s de geladeira e comandas personalizadas.",
    badgeText: "\u{1F354} Solu\xE7\xF5es para Gastronomia",
    suggestedPackageIds: ["pkg-restaurante-food"],
    suggestedProductIds: [],
    active: true
  },
  {
    id: "seg-abertura",
    slug: "novos-negocios",
    segment: "Abertura de Neg\xF3cios & Empresas",
    title: "Kit Completo de Inaugura\xE7\xE3o e Divulga\xE7\xE3o Comercial",
    headline: "Abra as portas com presen\xE7a profissional desde o primeiro dia",
    description: "Tudo o que sua nova empresa precisa reunido em um \xFAnico pacote econ\xF4mico: cart\xF5es de visita, panfletos de divulga\xE7\xE3o, banner de fachada e blocos de atendimento.",
    badgeText: "\u{1F680} Kit Abertura de Neg\xF3cio",
    suggestedPackageIds: ["pkg-novo-negocio"],
    suggestedProductIds: [],
    active: true
  },
  {
    id: "seg-eventos",
    slug: "eventos-e-shows",
    segment: "Eventos, Shows, Festas & Congressos",
    title: "Materiais Completos para Eventos, Festas e Feiras",
    headline: "Seguran\xE7a, divulga\xE7\xE3o e credenciamento impec\xE1vel para seu p\xFAblico",
    description: "Pulseiras de identifica\xE7\xE3o tyvek, ingressos com canhoto e itens antifraude, cartazes A3 de divulga\xE7\xE3o, crach\xE1s PVC e banners promocionais.",
    badgeText: "\u{1F389} Solu\xE7\xF5es para Eventos",
    suggestedPackageIds: ["pkg-eventos-festas"],
    suggestedProductIds: [],
    active: true
  },
  {
    id: "seg-autonomos",
    slug: "autonomos-e-profissionais",
    segment: "Profissionais Liberais, Sa\xFAde & Aut\xF4nomos",
    title: "Presen\xE7a e Autoridade para Profissionais Aut\xF4nomos",
    headline: "Transmita credibilidade e confian\xE7a em cada atendimento",
    description: "Cart\xF5es de visita com acabamentos nobres, blocos de receitu\xE1rio e laudos, pastas personalizadas e impress\xF5es em alta defini\xE7\xE3o.",
    badgeText: "\u{1F4BC} Linha Corporativa",
    suggestedPackageIds: ["pkg-autonomo-profissional"],
    suggestedProductIds: [],
    active: true
  }
];

// server/auth.ts
import bcrypt from "bcryptjs";
import crypto from "crypto";
var SALT_ROUNDS = 10;
var SESSION_TTL_HOURS = 24 * 7;
async function hashPassword(plainText) {
  return await bcrypt.hash(plainText, SALT_ROUNDS);
}
async function verifyPassword(plainText, hash) {
  if (!hash) return false;
  return await bcrypt.compare(plainText, hash);
}
async function hasAdminUser() {
  const admin = await db.get(
    "SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND active = 1"
  );
  return !!admin && Number(admin.count) > 0;
}
async function ensureDefaultAdminUser() {
  const existingAdmin = await db.get(
    "SELECT id, name, username, email, phone, role, password_hash, active, must_change_password FROM users WHERE id IN ('usr-admin-1', 'usr-admin') OR username = 'admin' OR role = 'ADMIN' ORDER BY CASE WHEN id = 'usr-admin-1' THEN 0 WHEN id = 'usr-admin' THEN 1 ELSE 2 END LIMIT 1"
  );
  const passwordHash = await hashPassword("admin");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existingAdmin) {
    if (Number(existingAdmin.must_change_password) === 0 && existingAdmin.password_hash) {
      await db.run(
        `UPDATE users SET 
          username = COALESCE(NULLIF(username, ''), 'admin'),
          role = 'ADMIN',
          active = 1
        WHERE id = ?`,
        [existingAdmin.id]
      );
      return;
    }
    await db.run(
      `UPDATE users SET 
        name = COALESCE(NULLIF(name, ''), 'Administrador'),
        username = 'admin',
        role = 'ADMIN',
        password_hash = ?,
        active = 1,
        must_change_password = 1,
        updated_at = ?
      WHERE id = ?`,
      [passwordHash, now, existingAdmin.id]
    );
    console.log(`Configured initial admin credentials (admin / admin, must_change_password = 1) for user ${existingAdmin.id}`);
  } else {
    await db.run(
      `INSERT INTO users (
        id, name, username, email, phone, role, password_hash, active, must_change_password, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "usr-admin-1",
        "Administrador",
        "admin",
        "admin@digitalexpress.com.br",
        null,
        "ADMIN",
        passwordHash,
        1,
        1,
        now,
        now
      ]
    );
    console.log("Created default initial admin user usr-admin-1: admin / admin (must_change_password = 1)");
  }
}
async function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1e3).toISOString();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  await db.run("DELETE FROM sessions WHERE expires_at < ?", [createdAt]);
  await db.run(
    "INSERT INTO sessions (token, user_id, user_name, user_role, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [token, user.id, user.name, user.role, expiresAt, createdAt]
  );
  return {
    token,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    expiresAt
  };
}
async function validateSessionToken(token) {
  if (!token) return null;
  const session = await db.get(
    "SELECT user_id, expires_at FROM sessions WHERE token = ?",
    [token]
  );
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db.run("DELETE FROM sessions WHERE token = ?", [token]);
    return null;
  }
  const row = await db.get(
    "SELECT * FROM users WHERE id = ? AND active = 1",
    [session.user_id]
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username || void 0,
    email: row.email || void 0,
    phone: row.phone || void 0,
    role: row.role,
    active: Number(row.active) === 1,
    mustChangePassword: Number(row.must_change_password) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function invalidateSession(token) {
  if (!token) return;
  await db.run("DELETE FROM sessions WHERE token = ?", [token]);
}
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (req.headers["x-session-token"]) {
      token = String(req.headers["x-session-token"]).trim();
    }
    if (token) {
      const user = await validateSessionToken(token);
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    console.error("Error in authMiddleware:", err);
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({
      error: "N\xE3o autorizado. Fa\xE7a login para continuar.",
      code: "UNAUTHORIZED"
    });
    return;
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user) {
    res.status(401).json({
      error: "N\xE3o autorizado. Fa\xE7a login para continuar.",
      code: "UNAUTHORIZED"
    });
    return;
  }
  if (req.user.role !== "ADMIN") {
    res.status(403).json({
      error: "Acesso negado. Apenas administradores podem executar esta a\xE7\xE3o.",
      code: "FORBIDDEN"
    });
    return;
  }
  next();
}

// server/db.ts
var DATA_DIR = path.join(process.cwd(), "data");
var BACKUPS_DIR = path.join(DATA_DIR, "backups");
var tursoClient = null;
var localEngine = null;
function isTursoConfigured() {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim().length > 0);
}
function ensureDirectories() {
  if (isTursoConfigured()) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  } catch (err) {
  }
}
function persistDatabase() {
  if (tursoClient || !localEngine) return;
  try {
    localEngine.persist();
  } catch (err) {
  }
}
var db = {
  get isTurso() {
    return !!tursoClient;
  },
  get raw() {
    return localEngine ? localEngine.raw : null;
  },
  get turso() {
    return tursoClient;
  },
  async run(sqlText, params = []) {
    if (tursoClient) {
      await tursoClient.execute({ sql: sqlText, args: params });
      return;
    }
    if (localEngine) {
      localEngine.run(sqlText, params);
      return;
    }
    throw new Error("Database not initialized. Please configure TURSO_DATABASE_URL or initialize local database.");
  },
  async exec(sqlText) {
    if (tursoClient) {
      await tursoClient.executeMultiple(sqlText);
      return [];
    }
    if (localEngine) {
      return localEngine.exec(sqlText);
    }
    throw new Error("Database not initialized. Please configure TURSO_DATABASE_URL or initialize local database.");
  },
  async all(sqlText, params = []) {
    if (tursoClient) {
      const rs = await tursoClient.execute({ sql: sqlText, args: params });
      return rs.rows;
    }
    if (localEngine) {
      return localEngine.all(sqlText, params);
    }
    throw new Error("Database not initialized. Please configure TURSO_DATABASE_URL or initialize local database.");
  },
  async get(sqlText, params = []) {
    if (tursoClient) {
      const rs = await tursoClient.execute({ sql: sqlText, args: params });
      return rs.rows.length > 0 ? rs.rows[0] : null;
    }
    if (localEngine) {
      return localEngine.get(sqlText, params);
    }
    throw new Error("Database not initialized. Please configure TURSO_DATABASE_URL or initialize local database.");
  },
  async batch(statements) {
    if (tursoClient) {
      return await tursoClient.batch(statements);
    }
    if (localEngine) {
      return localEngine.batch(statements);
    }
    throw new Error("Database not initialized. Please configure TURSO_DATABASE_URL or initialize local database.");
  }
};
async function runMigrations() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const appliedRows = await db.all("SELECT version FROM schema_migrations");
  const appliedVersions = new Set(appliedRows.map((r) => r.version));
  if (!appliedVersions.has("001_initial_core_schema")) {
    console.log("Applying migration 001_initial_core_schema...");
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        must_change_password INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id TEXT PRIMARY KEY,
        settings_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        description TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trade_name TEXT,
        type TEXT DEFAULT 'PF',
        cpf_cnpj TEXT,
        rg_ie TEXT,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        address TEXT,
        number TEXT,
        complement TEXT,
        neighborhood TEXT,
        city TEXT,
        state TEXT,
        cep TEXT,
        notes TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        category_id TEXT,
        type TEXT NOT NULL,
        description TEXT,
        cost_price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        margin_reais REAL DEFAULT 0,
        margin_percent REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 0,
        unit TEXT DEFAULT 'UN',
        image_url TEXT,
        show_in_catalog INTEGER DEFAULT 1,
        featured_in_catalog INTEGER DEFAULT 0,
        price_rules_json TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        sale_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        seller_id TEXT,
        seller_name TEXT,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        addition REAL DEFAULT 0,
        total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        payment_status TEXT NOT NULL,
        payment_method TEXT,
        payments_json TEXT,
        items_json TEXT NOT NULL,
        notes TEXT,
        invoice_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        budget_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        seller_id TEXT,
        seller_name TEXT,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        addition REAL DEFAULT 0,
        total REAL DEFAULT 0,
        status TEXT NOT NULL,
        valid_until TEXT,
        items_json TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS production_orders (
        id TEXT PRIMARY KEY,
        order_number INTEGER,
        sale_id TEXT,
        sale_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        item_id TEXT,
        item_name TEXT,
        quantity REAL DEFAULT 1,
        status TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIA',
        dead_line TEXT,
        notes TEXT,
        files_json TEXT,
        stages_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        previous_stock REAL NOT NULL,
        current_stock REAL NOT NULL,
        reason TEXT,
        user_id TEXT,
        user_name TEXT,
        reference_id TEXT,
        reference_type TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS receivables (
        id TEXT PRIMARY KEY,
        sale_id TEXT,
        sale_number INTEGER,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        due_date TEXT,
        status TEXT NOT NULL,
        payment_records_json TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS receiving_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        receiver_name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        pix_key TEXT,
        bank_details TEXT,
        card_fee_percent REAL DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS cash_register_sessions (
        id TEXT PRIMARY KEY,
        register_number INTEGER,
        opened_by_user_id TEXT NOT NULL,
        opened_by_user_name TEXT NOT NULL,
        closed_by_user_id TEXT,
        closed_by_user_name TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        initial_amount REAL DEFAULT 0,
        final_cash_amount REAL,
        status TEXT NOT NULL,
        notes TEXT,
        summary_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS online_services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL DEFAULT 0,
        turnaround_time TEXT,
        requirements TEXT,
        description TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        variables_json TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS generated_documents (
        id TEXT PRIMARY KEY,
        template_id TEXT,
        template_name TEXT NOT NULL,
        title TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_cpf_cnpj TEXT,
        rendered_content TEXT NOT NULL,
        created_by_user_id TEXT,
        created_by_user_name TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(
      "INSERT INTO schema_migrations VALUES (?, ?, ?)",
      ["001_initial_core_schema", "Initial Core ERP & PDV Tables", (/* @__PURE__ */ new Date()).toISOString()]
    );
  }
  if (!appliedVersions.has("002_prospecting_and_audit")) {
    console.log("Applying migration 002_prospecting_and_audit...");
    await db.run(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY,
        opportunity_number INTEGER,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        segment TEXT NOT NULL,
        stage TEXT NOT NULL,
        estimated_value REAL DEFAULT 0,
        confidence INTEGER DEFAULT 50,
        neighborhood TEXT,
        city TEXT,
        origin TEXT,
        origin_details TEXT,
        notes TEXT,
        assigned_seller_id TEXT,
        assigned_seller_name TEXT,
        next_action_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS opportunity_activities (
        id TEXT PRIMARY KEY,
        opportunity_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        user_id TEXT,
        user_name TEXT,
        date TEXT NOT NULL,
        scheduled_for TEXT,
        completed INTEGER DEFAULT 1,
        result TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        segment TEXT NOT NULL,
        target_audience TEXT,
        description TEXT,
        items_json TEXT NOT NULL,
        total_individual_price REAL DEFAULT 0,
        package_price REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        pitch TEXT,
        featured INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS approach_templates (
        id TEXT PRIMARY KEY,
        segment TEXT NOT NULL,
        title TEXT NOT NULL,
        trigger TEXT NOT NULL,
        message_text TEXT NOT NULL,
        tone TEXT NOT NULL,
        variables_json TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS segment_suggestions (
        id TEXT PRIMARY KEY,
        segment TEXT NOT NULL,
        label TEXT NOT NULL,
        suggested_product_ids_json TEXT,
        suggested_package_ids_json TEXT,
        tips_json TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS complementary_rules (
        id TEXT PRIMARY KEY,
        trigger_item_id TEXT,
        trigger_item_name TEXT,
        suggested_item_ids_json TEXT,
        reason TEXT,
        discount_on_combo REAL DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS public_segment_pages (
        id TEXT PRIMARY KEY,
        segment_slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        cover_image_url TEXT,
        hero_badge TEXT,
        pain_points_json TEXT,
        solutions_json TEXT,
        recommended_package_ids_json TEXT,
        testimonials_json TEXT,
        cta_text TEXT,
        whatsapp_default_message TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details_json TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.run(
      "INSERT INTO schema_migrations VALUES (?, ?, ?)",
      ["002_prospecting_and_audit", "Prospecting, Commercial Packages & Audit Logs", (/* @__PURE__ */ new Date()).toISOString()]
    );
  }
  if (!appliedVersions.has("003_indexes_and_optimizations")) {
    console.log("Applying migration 003_indexes_and_optimizations...");
    await db.run(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_seller ON opportunities(assigned_seller_id);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);`);
    await db.run(
      "INSERT INTO schema_migrations VALUES (?, ?, ?)",
      ["003_indexes_and_optimizations", "Indexes for Search & Queries", (/* @__PURE__ */ new Date()).toISOString()]
    );
  }
}
async function seedDefaultDataIfEmpty() {
  const settingsCount = await db.get("SELECT COUNT(*) as count FROM company_settings");
  if (!settingsCount || settingsCount.count === 0) {
    await db.run(
      "INSERT INTO company_settings (id, settings_json, updated_at) VALUES (?, ?, ?)",
      ["default", JSON.stringify(INITIAL_COMPANY_SETTINGS), (/* @__PURE__ */ new Date()).toISOString()]
    );
  }
  const catCount = await db.get("SELECT COUNT(*) as count FROM categories");
  if (!catCount || catCount.count === 0) {
    for (const cat of INITIAL_CATEGORIES) {
      await db.run(
        "INSERT OR REPLACE INTO categories (id, name, slug, description, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [cat.id, cat.name, cat.slug || "", cat.description || "", 1, (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString()]
      );
    }
  }
  const itemsCount = await db.get("SELECT COUNT(*) as count FROM items");
  if (!itemsCount || itemsCount.count === 0) {
    for (const item of INITIAL_ITEMS) {
      const cleanImg = item.imageUrl && !item.imageUrl.includes("unsplash.com") ? item.imageUrl : "";
      await db.run(
        `INSERT OR REPLACE INTO items (
          id, name, sku, category_id, type, description, cost_price, sale_price, margin_reais, margin_percent,
          stock, min_stock, unit, image_url, show_in_catalog, featured_in_catalog, price_rules_json, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.sku || "",
          item.categoryId,
          item.type,
          item.description || "",
          item.costPrice || 0,
          item.salePrice || 0,
          item.marginReais || 0,
          item.marginPercent || 0,
          item.stock || 0,
          item.minStock || 0,
          item.unit || "UN",
          cleanImg,
          item.showInCatalog ? 1 : 0,
          item.featuredInCatalog ? 1 : 0,
          item.priceRules ? JSON.stringify(item.priceRules) : null,
          item.active !== false ? 1 : 0,
          item.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          item.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const accCount = await db.get("SELECT COUNT(*) as count FROM receiving_accounts");
  if (!accCount || accCount.count === 0) {
    for (const acc of INITIAL_RECEIVING_ACCOUNTS) {
      await db.run(
        `INSERT OR REPLACE INTO receiving_accounts (
          id, name, type, receiver_name, active, pix_key, bank_details, card_fee_percent, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          acc.id,
          acc.name,
          acc.type,
          acc.receiverName,
          acc.active ? 1 : 0,
          acc.pixKey || "",
          acc.bankDetails || "",
          acc.creditFeePercent || acc.cardFeePercent || 0,
          acc.isDefault ? 1 : 0,
          acc.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          acc.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const svcCount = await db.get("SELECT COUNT(*) as count FROM online_services");
  if (!svcCount || svcCount.count === 0) {
    for (const svc of INITIAL_ONLINE_SERVICES) {
      await db.run(
        `INSERT OR REPLACE INTO online_services (
          id, name, category, price, turnaround_time, requirements, description, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          svc.id,
          svc.name,
          svc.category,
          svc.price || 0,
          svc.turnaroundTime || "",
          svc.requirements || "",
          svc.description || "",
          svc.active ? 1 : 0,
          svc.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          svc.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const tmplCount = await db.get("SELECT COUNT(*) as count FROM document_templates");
  if (!tmplCount || tmplCount.count === 0) {
    for (const tmpl of INITIAL_DOCUMENT_TEMPLATES) {
      await db.run(
        `INSERT OR REPLACE INTO document_templates (
          id, name, description, category, content, variables_json, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tmpl.id,
          tmpl.title || tmpl.name,
          tmpl.description || "",
          tmpl.category,
          tmpl.templateBody || tmpl.content || "",
          tmpl.fields ? JSON.stringify(tmpl.fields) : tmpl.variables ? JSON.stringify(tmpl.variables) : null,
          tmpl.active ? 1 : 0,
          tmpl.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          tmpl.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const pkgCount = await db.get("SELECT COUNT(*) as count FROM packages");
  if (!pkgCount || pkgCount.count === 0) {
    for (const pkg of INITIAL_PACKAGES) {
      await db.run(
        `INSERT OR REPLACE INTO packages (
          id, name, segment, target_audience, description, items_json, total_individual_price, package_price, discount_percent, pitch, featured, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pkg.id,
          pkg.name,
          pkg.targetSegment || pkg.segment || "Geral",
          pkg.targetSegment || "",
          pkg.description || "",
          JSON.stringify(pkg.items),
          pkg.originalTotal || 0,
          pkg.packagePrice || 0,
          pkg.discountPercent || 0,
          pkg.description || "",
          pkg.featuredInPublic ? 1 : 0,
          pkg.active !== false ? 1 : 0,
          pkg.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          pkg.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const appCount = await db.get("SELECT COUNT(*) as count FROM approach_templates");
  if (!appCount || appCount.count === 0) {
    for (const ap of INITIAL_APPROACH_TEMPLATES) {
      await db.run(
        `INSERT OR REPLACE INTO approach_templates (
          id, segment, title, trigger, message_text, tone, variables_json, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ap.id,
          ap.category || "Geral",
          ap.title,
          ap.targetStage || "ALL",
          ap.templateText || "",
          "Profissional",
          null,
          ap.active !== false ? 1 : 0,
          ap.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const ruleCount = await db.get("SELECT COUNT(*) as count FROM complementary_rules");
  if (!ruleCount || ruleCount.count === 0) {
    for (const rule of INITIAL_COMPLEMENTARY_RULES) {
      await db.run(
        `INSERT OR REPLACE INTO complementary_rules (
          id, trigger_item_id, trigger_item_name, suggested_item_ids_json, reason, discount_on_combo, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rule.id,
          rule.baseItemId || rule.triggerItemId || "",
          rule.baseItemName || rule.triggerItemName || "",
          JSON.stringify(rule.suggestedItemIds || []),
          rule.notes || rule.reason || "",
          0,
          1,
          (/* @__PURE__ */ new Date()).toISOString(),
          (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const pubCount = await db.get("SELECT COUNT(*) as count FROM public_segment_pages");
  if (!pubCount || pubCount.count === 0) {
    for (const pg of INITIAL_PUBLIC_SEGMENT_PAGES) {
      await db.run(
        `INSERT OR REPLACE INTO public_segment_pages (
          id, segment_slug, title, subtitle, cover_image_url, hero_badge, pain_points_json, solutions_json, recommended_package_ids_json, testimonials_json, cta_text, whatsapp_default_message, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pg.id,
          pg.slug || pg.segmentSlug || "",
          pg.title || "",
          pg.headline || "",
          pg.imageUrl || "",
          pg.badgeText || "",
          JSON.stringify(pg.suggestedProductIds || []),
          JSON.stringify(pg.suggestedPackageIds || []),
          JSON.stringify(pg.suggestedPackageIds || []),
          null,
          "Solicitar Or\xE7amento",
          "",
          pg.active !== false ? 1 : 0,
          (/* @__PURE__ */ new Date()).toISOString(),
          (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  const oppCount = await db.get("SELECT COUNT(*) as count FROM opportunities");
  if (!oppCount || oppCount.count === 0) {
    for (const opp of INITIAL_OPPORTUNITIES) {
      await db.run(
        `INSERT OR REPLACE INTO opportunities (
          id, opportunity_number, name, contact_name, phone, whatsapp, email, segment, stage,
          estimated_value, confidence, neighborhood, city, origin, origin_details, notes,
          assigned_seller_id, assigned_seller_name, next_action_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          opp.id,
          opp.opportunityNumber || "",
          opp.name,
          opp.contactName || "",
          opp.phone,
          opp.whatsapp || "",
          opp.email || "",
          opp.segment || "Geral",
          opp.stage || "IDENTIFICADO",
          opp.estimatedValue || 0,
          opp.confidence || 50,
          opp.neighborhood || "",
          opp.city || "",
          opp.origin || "",
          opp.originDetails || "",
          opp.notes || "",
          opp.assignedUserId || opp.assignedSellerId || "",
          opp.assignedUserName || opp.assignedSellerName || "",
          opp.nextAction ? JSON.stringify(opp.nextAction) : null,
          opp.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          opp.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
    }
  }
  await ensureDefaultAdminUser();
}
async function initializeDatabase() {
  if (!isTursoConfigured()) {
    throw new Error("TURSO_DATABASE_URL is not configured. For local development, initialize using db-local.");
  }
  const url = process.env.TURSO_DATABASE_URL.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN ? process.env.TURSO_AUTH_TOKEN.trim() : void 0;
  console.log(`Connecting to Turso Online Database: ${url}`);
  tursoClient = createClient({
    url,
    authToken
  });
  await runMigrations();
  await seedDefaultDataIfEmpty();
  console.log("Connected and initialized Turso Cloud Database successfully.");
  return tursoClient;
}

// server/routes.ts
import express from "express";
import os from "os";

// server/audit.ts
import crypto2 from "crypto";
async function logAudit(entry) {
  try {
    const id = entry.id || `audit-${Date.now()}-${crypto2.randomBytes(4).toString("hex")}`;
    const createdAt = entry.createdAt || (/* @__PURE__ */ new Date()).toISOString();
    const detailsJson = entry.details ? JSON.stringify(entry.details) : null;
    await db.run(
      `INSERT INTO audit_logs (
        id, user_id, user_name, action, entity_type, entity_id, details_json, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.userId || "SISTEMA",
        entry.userName || "Sistema / An\xF4nimo",
        entry.action,
        entry.entityType,
        entry.entityId || null,
        detailsJson,
        entry.ipAddress || null,
        createdAt
      ]
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
async function getAuditLogs(params) {
  let whereClauses = [];
  let queryParams = [];
  if (params.entityType) {
    whereClauses.push("entity_type = ?");
    queryParams.push(params.entityType);
  }
  if (params.userId) {
    whereClauses.push("user_id = ?");
    queryParams.push(params.userId);
  }
  if (params.action) {
    whereClauses.push("action LIKE ?");
    queryParams.push(`%${params.action}%`);
  }
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const countRes = await db.get(`SELECT COUNT(*) as total FROM audit_logs ${whereSql}`, queryParams);
  const total = countRes ? Number(countRes.total) : 0;
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  const rows = await db.all(
    `SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset]
  );
  const logs = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details_json ? JSON.parse(row.details_json) : null,
    ipAddress: row.ip_address,
    createdAt: row.created_at
  }));
  return { logs, total };
}

// server/backup.ts
import fs2 from "fs";
import path2 from "path";
var DATA_DIR2 = path2.join(process.cwd(), "data");
var BACKUPS_DIR2 = path2.join(DATA_DIR2, "backups");
var ALL_TABLES = [
  "users",
  "categories",
  "items",
  "customers",
  "sales",
  "budgets",
  "production_orders",
  "inventory_movements",
  "receivables",
  "receiving_accounts",
  "cash_register_sessions",
  "online_services",
  "document_templates",
  "generated_documents",
  "opportunities",
  "opportunity_activities",
  "packages",
  "approach_templates",
  "segment_suggestions",
  "complementary_rules",
  "public_segment_pages",
  "company_settings",
  "audit_logs"
];
async function exportDatabaseSnapshot() {
  const snapshot = {
    version: "2.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    tables: {}
  };
  for (const table of ALL_TABLES) {
    try {
      const rows = await db.all(`SELECT * FROM ${table}`);
      snapshot.tables[table] = rows;
    } catch (err) {
      console.warn(`Table ${table} not found or error reading:`, err);
      snapshot.tables[table] = [];
    }
  }
  return snapshot;
}
async function createLocalBackupFile(tag = "manual") {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const filename = `backup_${tag}_${timestamp}.json`;
  try {
    ensureDirectories();
    const filePath = path2.join(BACKUPS_DIR2, filename);
    const snapshot = await exportDatabaseSnapshot();
    fs2.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
    try {
      const files = fs2.readdirSync(BACKUPS_DIR2).filter((f) => f.startsWith("backup_") && f.endsWith(".json")).map((f) => ({ name: f, path: path2.join(BACKUPS_DIR2, f), time: fs2.statSync(path2.join(BACKUPS_DIR2, f)).mtime.getTime() })).sort((a, b) => b.time - a.time);
      if (files.length > 20) {
        for (const oldFile of files.slice(20)) {
          fs2.unlinkSync(oldFile.path);
        }
      }
    } catch (err) {
    }
  } catch (err) {
    console.warn("Could not write backup to disk (e.g. serverless read-only environment):", err);
  }
  return filename;
}
function listLocalBackups() {
  try {
    ensureDirectories();
    if (!fs2.existsSync(BACKUPS_DIR2)) return [];
    const files = fs2.readdirSync(BACKUPS_DIR2).filter((f) => f.endsWith(".json") || f.endsWith(".sqlite")).map((f) => {
      const fullPath = path2.join(BACKUPS_DIR2, f);
      const stat = fs2.statSync(fullPath);
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString()
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return files;
  } catch (err) {
    return [];
  }
}
async function restoreDatabaseSnapshot(snapshot, userId, userName) {
  if (!snapshot || !snapshot.tables) {
    return { success: false, error: "Formato de backup inv\xE1lido.", restoredTables: [] };
  }
  const safetyBackupName = await createLocalBackupFile("pre_restore");
  try {
    const restoredTables = [];
    const statements = [];
    for (const table of ALL_TABLES) {
      const rows = snapshot.tables[table];
      if (Array.isArray(rows)) {
        statements.push(`DELETE FROM ${table};`);
        if (rows.length > 0) {
          const sample = rows[0];
          const columns = Object.keys(sample);
          const placeholders = columns.map(() => "?").join(", ");
          const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders});`;
          for (const row of rows) {
            const values = columns.map((col) => row[col]);
            statements.push({ sql, args: values });
          }
        }
        restoredTables.push(table);
      }
    }
    await db.batch(statements);
    persistDatabase();
    await logAudit({
      userId: userId || "ADMIN",
      userName: userName || "Administrador",
      action: "RESTORE_DATABASE",
      entityType: "DATABASE",
      entityId: "ALL",
      details: {
        safetyBackupName,
        restoredTables,
        sourceTimestamp: snapshot.timestamp
      }
    });
    return { success: true, restoredTables };
  } catch (err) {
    console.error("Database restore error:", err);
    return {
      success: false,
      error: `Falha ao restaurar banco de dados: ${err.message}.`,
      restoredTables: []
    };
  }
}

// server/ai.ts
import { GoogleGenAI } from "@google/genai";
var geminiClient = null;
function getGemini() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}
function generateOfflineFallback(params) {
  const { type, context } = params;
  if (type === "prospecting_pitch") {
    const segment = context?.segment || "Com\xE9rcio Local";
    const clientName = context?.clientName || "Cliente";
    const pkgName = context?.packageName || "Solu\xE7\xF5es Gr\xE1ficas & Comunica\xE7\xE3o Visual";
    return `Ol\xE1 ${clientName}! Notamos o excelente trabalho do seu neg\xF3cio no segmento de ${segment}. Desenvolvemos solu\xE7\xF5es completas para aumentar a visibilidade e o fluxo de clientes na sua empresa com o ${pkgName}. Podemos agendar uma conversa r\xE1pida de 5 minutos para apresentar os modelos sem compromisso?`;
  }
  if (type === "followup_message") {
    const clientName = context?.clientName || "Cliente";
    const budgetNumber = context?.budgetNumber ? `#${context?.budgetNumber}` : "enviada";
    return `Ol\xE1 ${clientName}, tudo bem? Estou passando para saber se voc\xEA conseguiu analisar a nossa proposta comercial ${budgetNumber}. Ficou alguma d\xFAvida sobre os materiais, acabamentos ou prazos de produ\xE7\xE3o? Estamos com a escala da semana aberta para priorizar seu pedido!`;
  }
  if (type === "budget_description") {
    const items = context?.itemsSummary || "materiais gr\xE1ficos personalizados";
    return `Proposta comercial para fornecimento de ${items}, com acabamento profissional, alta durabilidade e garantia de fidelidade de cores conforme padr\xF5es t\xE9cnicos da nossa gr\xE1fica.`;
  }
  return `Proposta de comunica\xE7\xE3o visual personalizada com foco em alto impacto e retorno comercial para sua empresa.`;
}
async function generateAIContent(params) {
  try {
    const ai = getGemini();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Voc\xEA \xE9 um assistente comercial e de produ\xE7\xE3o de uma gr\xE1fica r\xE1pida e est\xFAdio de comunica\xE7\xE3o visual. Seja direto, persuasivo e profissional em portugu\xEAs do Brasil.

Instru\xE7\xE3o: ${params.prompt}
Contexto: ${JSON.stringify(params.context || {})}`
              }
            ]
          }
        ]
      });
      const generatedText = response.text?.trim();
      if (generatedText) {
        return { text: generatedText, source: "gemini" };
      }
    }
  } catch (err) {
    console.warn("Gemini API call failed or rate-limited, switching to offline fallback engine:", err);
  }
  return {
    text: generateOfflineFallback(params),
    source: "fallback"
  };
}

// server/routes.ts
var router = express.Router();
function getLocalNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
  }
  return addresses.length > 0 ? addresses : ["127.0.0.1"];
}
router.get("/health", async (req, res) => {
  try {
    const hasAdmin = await hasAdminUser();
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      hasAdmin,
      isTurso: db.isTurso
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});
router.get("/system/status", async (req, res) => {
  try {
    const networkIps = getLocalNetworkIps();
    const [
      usersCount,
      customersCount,
      itemsCount,
      salesCount,
      budgetsCount,
      opportunitiesCount,
      productionCount,
      auditLogsCount
    ] = await Promise.all([
      db.get("SELECT COUNT(*) as c FROM users"),
      db.get("SELECT COUNT(*) as c FROM customers"),
      db.get("SELECT COUNT(*) as c FROM items"),
      db.get("SELECT COUNT(*) as c FROM sales"),
      db.get("SELECT COUNT(*) as c FROM budgets"),
      db.get("SELECT COUNT(*) as c FROM opportunities"),
      db.get("SELECT COUNT(*) as c FROM production_orders"),
      db.get("SELECT COUNT(*) as c FROM audit_logs")
    ]);
    const hasAdmin = await hasAdminUser();
    res.json({
      status: "online",
      serverPort: 3e3,
      localIps: networkIps,
      isTurso: db.isTurso,
      hasAdmin,
      tablesCount: {
        users: Number(usersCount?.c || 0),
        customers: Number(customersCount?.c || 0),
        items: Number(itemsCount?.c || 0),
        sales: Number(salesCount?.c || 0),
        budgets: Number(budgetsCount?.c || 0),
        opportunities: Number(opportunitiesCount?.c || 0),
        production: Number(productionCount?.c || 0),
        auditLogs: Number(auditLogsCount?.c || 0)
      },
      nodeVersion: process.version,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao obter status do sistema." });
  }
});
router.post("/system/migrate-from-client", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({ error: "Payload de migra\xE7\xE3o inv\xE1lido." });
      return;
    }
    await createLocalBackupFile("pre_client_migration");
    let importedCounts = {
      customers: 0,
      sales: 0,
      budgets: 0,
      opportunities: 0,
      items: 0
    };
    if (Array.isArray(payload.customers)) {
      for (const c of payload.customers) {
        if (!c.id || !c.name) continue;
        const exists = await db.get("SELECT id FROM customers WHERE id = ?", [c.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO customers (
              id, name, trade_name, type, cpf_cnpj, rg_ie, phone, whatsapp, email,
              address, number, complement, neighborhood, city, state, cep, notes, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              c.id,
              c.name,
              c.tradeName || "",
              c.type || "PF",
              c.cpfCnpj || "",
              c.rgIe || "",
              c.phone || "",
              c.whatsapp || "",
              c.email || "",
              c.address || "",
              c.number || "",
              c.complement || "",
              c.neighborhood || "",
              c.city || "",
              c.state || "",
              c.cep || "",
              c.notes || "",
              c.active !== false ? 1 : 0,
              c.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              c.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
            ]
          );
          importedCounts.customers++;
        }
      }
    }
    if (Array.isArray(payload.sales)) {
      for (const s of payload.sales) {
        if (!s.id) continue;
        const exists = await db.get("SELECT id FROM sales WHERE id = ?", [s.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO sales (
              id, sale_number, customer_id, customer_name, customer_phone, customer_email,
              seller_id, seller_name, subtotal, discount, addition, total, paid_amount,
              remaining_amount, payment_status, payment_method, payments_json, items_json,
              notes, invoice_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.id,
              s.saleNumber || 0,
              s.customerId || null,
              s.customerName || "Consumidor",
              s.customerPhone || null,
              s.customerEmail || null,
              s.sellerId || null,
              s.sellerName || "Atendente",
              s.subtotal || 0,
              s.discount || 0,
              s.addition || 0,
              s.total || 0,
              s.paidAmount || 0,
              s.remainingAmount || 0,
              s.paymentStatus || "PAGO",
              s.paymentMethod || "DINHEIRO",
              s.payments ? JSON.stringify(s.payments) : null,
              JSON.stringify(s.items || []),
              s.notes || null,
              s.invoiceStatus || null,
              s.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              s.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
            ]
          );
          importedCounts.sales++;
        }
      }
    }
    if (Array.isArray(payload.budgets)) {
      for (const b of payload.budgets) {
        if (!b.id) continue;
        const exists = await db.get("SELECT id FROM budgets WHERE id = ?", [b.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO budgets (
              id, budget_number, customer_id, customer_name, customer_phone, customer_email,
              seller_id, seller_name, subtotal, discount, addition, total, status, valid_until,
              items_json, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              b.id,
              b.budgetNumber || 0,
              b.customerId || null,
              b.customerName || "Cliente",
              b.customerPhone || null,
              b.customerEmail || null,
              b.sellerId || null,
              b.sellerName || "Vendedor",
              b.subtotal || 0,
              b.discount || 0,
              b.addition || 0,
              b.total || 0,
              b.status || "PENDENTE",
              b.validUntil || null,
              JSON.stringify(b.items || []),
              b.notes || null,
              b.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              b.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
            ]
          );
          importedCounts.budgets++;
        }
      }
    }
    if (Array.isArray(payload.opportunities)) {
      for (const opp of payload.opportunities) {
        if (!opp.id || !opp.name) continue;
        const exists = await db.get("SELECT id FROM opportunities WHERE id = ?", [opp.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO opportunities (
              id, opportunity_number, name, contact_name, phone, whatsapp, email, segment,
              stage, estimated_value, confidence, neighborhood, city, origin, origin_details,
              notes, assigned_seller_id, assigned_seller_name, next_action_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              opp.id,
              opp.opportunityNumber || 0,
              opp.name,
              opp.contactName || "",
              opp.phone || "",
              opp.whatsapp || "",
              opp.email || "",
              opp.segment || "Geral",
              opp.stage || "IDENTIFICADO",
              opp.estimatedValue || 0,
              opp.confidence || 50,
              opp.neighborhood || "",
              opp.city || "",
              opp.origin || "",
              opp.originDetails || "",
              opp.notes || "",
              opp.assignedSellerId || "",
              opp.assignedSellerName || "",
              opp.nextAction ? JSON.stringify(opp.nextAction) : null,
              opp.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              opp.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
            ]
          );
          importedCounts.opportunities++;
        }
      }
    }
    persistDatabase();
    await logAudit({
      userId: req.user?.id || "MIGRATION",
      userName: req.user?.name || "Rotina de Migra\xE7\xE3o",
      action: "MIGRATE_FROM_CLIENT",
      entityType: "SYSTEM",
      details: importedCounts,
      ipAddress: req.ip
    });
    res.json({ success: true, importedCounts });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: err.message || "Falha ao migrar dados." });
  }
});
router.get("/auth/status", async (req, res) => {
  try {
    await ensureDefaultAdminUser();
    const hasAdmin = await hasAdminUser();
    res.json({
      hasAdmin,
      user: req.user || null,
      isAuthenticated: !!req.user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/auth/setup-admin", async (req, res) => {
  try {
    const hasAdmin = await hasAdminUser();
    if (hasAdmin) {
      res.status(400).json({ error: "O sistema j\xE1 possui um administrador configurado." });
      return;
    }
    const { name, username, email, phone, password } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Nome do administrador \xE9 obrigat\xF3rio." });
      return;
    }
    if (!password || password.trim().length < 4) {
      res.status(400).json({ error: "A senha do administrador deve possuir no m\xEDnimo 4 caracteres." });
      return;
    }
    const passwordHash = await hashPassword(password.trim());
    const adminId = `usr-admin-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(
      `INSERT INTO users (
        id, name, username, email, phone, role, password_hash, active, must_change_password, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        name.trim(),
        username?.trim() || "admin",
        email?.trim() || null,
        phone?.trim() || null,
        "ADMIN",
        passwordHash,
        1,
        0,
        now,
        now
      ]
    );
    const createdAdmin = {
      id: adminId,
      name: name.trim(),
      username: username?.trim() || "admin",
      email: email?.trim(),
      phone: phone?.trim(),
      role: "ADMIN",
      active: true,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now
    };
    const session = await createSession(createdAdmin);
    await logAudit({
      userId: adminId,
      userName: name.trim(),
      action: "SETUP_FIRST_ADMIN",
      entityType: "USER",
      entityId: adminId,
      details: { username: username || "admin", email },
      ipAddress: req.ip
    });
    res.json({
      success: true,
      user: createdAdmin,
      session
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao inicializar administrador." });
  }
});
router.post("/auth/login", async (req, res) => {
  try {
    await ensureDefaultAdminUser();
    const { userId, username, password } = req.body;
    if (!password || !password.trim()) {
      res.status(400).json({ error: "Informe a senha de acesso." });
      return;
    }
    const loginIdentifier = (username || userId || "").trim();
    let userRow = null;
    if (loginIdentifier) {
      userRow = await db.get(
        "SELECT * FROM users WHERE (id = ? OR username = ? OR email = ? OR name = ?) AND active = 1 LIMIT 1",
        [loginIdentifier, loginIdentifier, loginIdentifier, loginIdentifier]
      );
    } else {
      userRow = await db.get("SELECT * FROM users WHERE role = 'ADMIN' AND active = 1 LIMIT 1");
    }
    if (!userRow) {
      res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado ou inativo no sistema." });
      return;
    }
    if (!userRow.password_hash) {
      res.status(400).json({
        error: "Usu\xE1rio ainda n\xE3o possui senha cadastrada. Solicite a defini\xE7\xE3o pelo Administrador."
      });
      return;
    }
    const isValid = await verifyPassword(password.trim(), userRow.password_hash);
    if (!isValid) {
      await logAudit({
        userId: userRow.id,
        userName: userRow.name,
        action: "FAILED_LOGIN_ATTEMPT",
        entityType: "AUTH",
        entityId: userRow.id,
        ipAddress: req.ip
      });
      res.status(401).json({ error: "Senha incorreta. Verifique e tente novamente." });
      return;
    }
    const user = {
      id: userRow.id,
      name: userRow.name,
      username: userRow.username || void 0,
      email: userRow.email || void 0,
      phone: userRow.phone || void 0,
      role: userRow.role,
      active: Number(userRow.active) === 1,
      mustChangePassword: Number(userRow.must_change_password) === 1,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at
    };
    const session = await createSession(user);
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "LOGIN",
      entityType: "AUTH",
      entityId: user.id,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      user,
      session,
      mustChangePassword: user.mustChangePassword
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao realizar autentica\xE7\xE3o." });
  }
});
router.post("/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    if (token) {
      await invalidateSession(token);
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});
router.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, targetUserId } = req.body;
    const userIdToUpdate = req.user.role === "ADMIN" && targetUserId ? targetUserId : req.user.id;
    if (!newPassword || newPassword.trim().length < 4) {
      res.status(400).json({ error: "A nova senha deve ter no m\xEDnimo 4 caracteres." });
      return;
    }
    const targetRow = await db.get("SELECT * FROM users WHERE id = ?", [userIdToUpdate]);
    if (!targetRow) {
      res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
      return;
    }
    const isMandatoryChange = Number(targetRow.must_change_password) === 1;
    const isAdminManagingOther = req.user.role === "ADMIN" && targetUserId && targetUserId !== req.user.id;
    if (!isMandatoryChange && !isAdminManagingOther) {
      if (targetRow.password_hash) {
        if (!currentPassword) {
          res.status(400).json({ error: "Informe a senha atual para continuar." });
          return;
        }
        const valid = await verifyPassword(currentPassword, targetRow.password_hash);
        if (!valid) {
          res.status(401).json({ error: "A senha atual est\xE1 incorreta." });
          return;
        }
      }
    }
    const newHash = await hashPassword(newPassword.trim());
    await db.run(
      "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?",
      [newHash, (/* @__PURE__ */ new Date()).toISOString(), userIdToUpdate]
    );
    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: "CHANGE_PASSWORD",
      entityType: "USER",
      entityId: userIdToUpdate,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao alterar senha." });
  }
});
router.get("/users", async (req, res) => {
  try {
    const rows = await db.all("SELECT id, name, username, email, phone, role, active, must_change_password, created_at, updated_at FROM users ORDER BY name ASC");
    const users = rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username || void 0,
      email: r.email || void 0,
      phone: r.phone || void 0,
      role: r.role,
      active: Number(r.active) === 1,
      mustChangePassword: Number(r.must_change_password) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar usu\xE1rios." });
  }
});
router.post("/users", requireAdmin, async (req, res) => {
  try {
    const { name, username, email, phone, role, initialPassword, mustChangePassword } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Nome do usu\xE1rio \xE9 obrigat\xF3rio." });
      return;
    }
    const assignedRole = role === "ADMINISTRADOR" ? "ADMIN" : role || "VENDEDOR";
    const newId = `usr-${assignedRole.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const rawPassword = initialPassword && initialPassword.trim() || "1234";
    const hash = await hashPassword(rawPassword);
    await db.run(
      `INSERT INTO users (
        id, name, username, email, phone, role, password_hash, active, must_change_password, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        name.trim(),
        username?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        assignedRole,
        hash,
        1,
        mustChangePassword ? 1 : 0,
        now,
        now
      ]
    );
    const created = {
      id: newId,
      name: name.trim(),
      username: username?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      role: assignedRole === "ADMIN" ? "ADMINISTRADOR" : assignedRole,
      active: true,
      mustChangePassword: !!mustChangePassword,
      createdAt: now,
      updatedAt: now
    };
    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: "CREATE_USER",
      entityType: "USER",
      entityId: newId,
      details: { name: created.name, role: created.role },
      ipAddress: req.ip
    });
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao criar usu\xE1rio." });
  }
});
router.put("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, phone, role, active, mustChangePassword, newPassword } = req.body;
    const existing = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!existing) {
      res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
      return;
    }
    let passwordHash = existing.password_hash;
    if (newPassword && newPassword.trim()) {
      passwordHash = await hashPassword(newPassword.trim());
    }
    const assignedRole = role !== void 0 ? role === "ADMINISTRADOR" ? "ADMIN" : role : existing.role;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(
      `UPDATE users SET
        name = ?, username = ?, email = ?, phone = ?, role = ?, password_hash = ?,
        active = ?, must_change_password = ?, updated_at = ?
      WHERE id = ?`,
      [
        name !== void 0 ? name.trim() : existing.name,
        username !== void 0 ? username?.trim() || null : existing.username,
        email !== void 0 ? email?.trim() || null : existing.email,
        phone !== void 0 ? phone?.trim() || null : existing.phone,
        assignedRole,
        passwordHash,
        active !== void 0 ? active ? 1 : 0 : existing.active,
        mustChangePassword !== void 0 ? mustChangePassword ? 1 : 0 : existing.must_change_password,
        now,
        id
      ]
    );
    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: "UPDATE_USER",
      entityType: "USER",
      entityId: id,
      details: { name, role, active },
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao atualizar usu\xE1rio." });
  }
});
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      res.status(400).json({ error: "Voc\xEA n\xE3o pode excluir o seu pr\xF3prio usu\xE1rio conectado." });
      return;
    }
    await db.run("DELETE FROM users WHERE id = ?", [id]);
    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: "DELETE_USER",
      entityType: "USER",
      entityId: id,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao excluir usu\xE1rio." });
  }
});
router.get("/customers", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM customers ORDER BY name ASC");
    const customers = rows.map((r) => ({
      id: r.id,
      name: r.name,
      tradeName: r.trade_name || void 0,
      type: r.type,
      cpfCnpj: r.cpf_cnpj || void 0,
      rgIe: r.rg_ie || void 0,
      phone: r.phone || void 0,
      whatsapp: r.whatsapp || void 0,
      email: r.email || void 0,
      address: r.address || void 0,
      number: r.number || void 0,
      complement: r.complement || void 0,
      neighborhood: r.neighborhood || void 0,
      city: r.city || void 0,
      state: r.state || void 0,
      cep: r.cep || void 0,
      notes: r.notes || void 0,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar clientes." });
  }
});
router.post("/customers", async (req, res) => {
  try {
    const c = req.body;
    if (!c.name || !c.name.trim()) {
      res.status(400).json({ error: "Nome do cliente \xE9 obrigat\xF3rio." });
      return;
    }
    const id = c.id || `cust-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(
      `INSERT OR REPLACE INTO customers (
        id, name, trade_name, type, cpf_cnpj, rg_ie, phone, whatsapp, email,
        address, number, complement, neighborhood, city, state, cep, notes, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        c.name.trim(),
        c.tradeName?.trim() || null,
        c.type || "PF",
        c.cpfCnpj?.trim() || null,
        c.rgIe?.trim() || null,
        c.phone?.trim() || null,
        c.whatsapp?.trim() || null,
        c.email?.trim() || null,
        c.address?.trim() || null,
        c.number?.trim() || null,
        c.complement?.trim() || null,
        c.neighborhood?.trim() || null,
        c.city?.trim() || null,
        c.state?.trim() || null,
        c.cep?.trim() || null,
        c.notes?.trim() || null,
        c.active !== false ? 1 : 0,
        c.createdAt || now,
        now
      ]
    );
    const saved = { ...c, id, createdAt: c.createdAt || now, updatedAt: now };
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "SAVE_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: id,
      details: { name: saved.name, phone: saved.phone },
      ipAddress: req.ip
    });
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao salvar cliente." });
  }
});
router.delete("/customers/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM customers WHERE id = ?", [id]);
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "DELETE_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: id,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao excluir cliente." });
  }
});
router.get("/items", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM items ORDER BY name ASC");
    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku || void 0,
      categoryId: r.category_id,
      type: r.type,
      description: r.description || "",
      costPrice: Number(r.cost_price),
      salePrice: Number(r.sale_price),
      marginReais: Number(r.margin_reais),
      marginPercent: Number(r.margin_percent),
      stock: Number(r.stock),
      minStock: Number(r.min_stock),
      unit: r.unit || "UN",
      imageUrl: r.image_url || "",
      showInCatalog: Number(r.show_in_catalog) === 1,
      featuredInCatalog: Number(r.featured_in_catalog) === 1,
      priceRules: r.price_rules_json ? JSON.parse(r.price_rules_json) : void 0,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar itens." });
  }
});
router.post("/items", requireAuth, async (req, res) => {
  try {
    const item = req.body;
    if (!item.name || !item.name.trim()) {
      res.status(400).json({ error: "Nome do item \xE9 obrigat\xF3rio." });
      return;
    }
    const id = item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const cost = Number(item.costPrice) || 0;
    const sale = Number(item.salePrice) || 0;
    const marginReais = Number((sale - cost).toFixed(2));
    const marginPercent = sale > 0 ? Number((marginReais / sale * 100).toFixed(2)) : 0;
    await db.run(
      `INSERT OR REPLACE INTO items (
        id, name, sku, category_id, type, description, cost_price, sale_price,
        margin_reais, margin_percent, stock, min_stock, unit, image_url,
        show_in_catalog, featured_in_catalog, price_rules_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.name.trim(),
        item.sku?.trim() || null,
        item.categoryId || "",
        item.type || "PRODUTO_FISICO",
        item.description?.trim() || "",
        cost,
        sale,
        marginReais,
        marginPercent,
        Number(item.stock) || 0,
        Number(item.minStock) || 0,
        item.unit || "UN",
        item.imageUrl?.trim() || "",
        item.showInCatalog !== false ? 1 : 0,
        item.featuredInCatalog ? 1 : 0,
        item.priceRules ? JSON.stringify(item.priceRules) : null,
        item.active !== false ? 1 : 0,
        item.createdAt || now,
        now
      ]
    );
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "SAVE_ITEM",
      entityType: "ITEM",
      entityId: id,
      details: { name: item.name, salePrice: sale, costPrice: cost },
      ipAddress: req.ip
    });
    res.json({ ...item, id, marginReais, marginPercent, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao salvar item." });
  }
});
router.delete("/items/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM items WHERE id = ?", [id]);
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "DELETE_ITEM",
      entityType: "ITEM",
      entityId: id,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao excluir item." });
  }
});
router.get("/categories", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM categories ORDER BY name ASC");
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug || void 0,
      description: r.description || void 0,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar categorias." });
  }
});
router.post("/categories", requireAuth, async (req, res) => {
  try {
    const c = req.body;
    const id = c.id || `cat-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(
      "INSERT OR REPLACE INTO categories (id, name, slug, description, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, c.name, c.slug || "", c.description || "", c.active !== false ? 1 : 0, c.createdAt || now, now]
    );
    res.json({ ...c, id, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao salvar categoria." });
  }
});
router.delete("/categories/:id", requireAuth, async (req, res) => {
  try {
    await db.run("DELETE FROM categories WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao excluir categoria." });
  }
});
router.get("/sales", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM sales ORDER BY created_at DESC");
    const sales = rows.map((r) => ({
      id: r.id,
      saleNumber: Number(r.sale_number),
      customerId: r.customer_id || void 0,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || void 0,
      customerEmail: r.customer_email || void 0,
      sellerId: r.seller_id || void 0,
      sellerName: r.seller_name,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      addition: Number(r.addition),
      total: Number(r.total),
      paidAmount: Number(r.paid_amount),
      remainingAmount: Number(r.remaining_amount),
      paymentStatus: r.payment_status,
      paymentMethod: r.payment_method,
      payments: r.payments_json ? JSON.parse(r.payments_json) : [],
      items: JSON.parse(r.items_json),
      notes: r.notes || void 0,
      invoiceStatus: r.invoice_status || void 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar vendas." });
  }
});
router.post("/sales", requireAuth, async (req, res) => {
  try {
    const s = req.body;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = s.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    let saleNum = s.saleNumber;
    if (!saleNum) {
      const maxNum = await db.get("SELECT MAX(sale_number) as m FROM sales");
      saleNum = (Number(maxNum?.m) || 1e3) + 1;
    }
    await db.run(
      `INSERT OR REPLACE INTO sales (
        id, sale_number, customer_id, customer_name, customer_phone, customer_email,
        seller_id, seller_name, subtotal, discount, addition, total, paid_amount,
        remaining_amount, payment_status, payment_method, payments_json, items_json,
        notes, invoice_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        saleNum,
        s.customerId || null,
        s.customerName || "Consumidor Final",
        s.customerPhone || null,
        s.customerEmail || null,
        s.sellerId || req.user?.id || null,
        s.sellerName || req.user?.name || "Atendente",
        Number(s.subtotal) || 0,
        Number(s.discount) || 0,
        Number(s.addition) || 0,
        Number(s.total) || 0,
        Number(s.paidAmount) || 0,
        Number(s.remainingAmount) || 0,
        s.paymentStatus || "PAGO",
        s.paymentMethod || "DINHEIRO",
        s.payments ? JSON.stringify(s.payments) : JSON.stringify([]),
        JSON.stringify(s.items || []),
        s.notes || null,
        s.invoiceStatus || null,
        s.createdAt || now,
        now
      ]
    );
    if (s.remainingAmount > 0 || s.paymentStatus === "PENDENTE" || s.paymentStatus === "PARCIALMENTE_PAGO") {
      const recId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await db.run(
        `INSERT OR REPLACE INTO receivables (
          id, sale_id, sale_number, customer_id, customer_name, customer_phone,
          total_amount, paid_amount, remaining_amount, due_date, status,
          payment_records_json, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recId,
          id,
          saleNum,
          s.customerId || null,
          s.customerName || "Consumidor",
          s.customerPhone || null,
          Number(s.total) || 0,
          Number(s.paidAmount) || 0,
          Number(s.remainingAmount) || 0,
          s.dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString(),
          s.remainingAmount <= 0 ? "PAGO" : s.paidAmount > 0 ? "PARCIALMENTE_PAGO" : "PENDENTE",
          JSON.stringify(s.payments || []),
          s.notes || null,
          now,
          now
        ]
      );
    }
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "CREATE_SALE",
      entityType: "SALE",
      entityId: id,
      details: { saleNumber: saleNum, total: s.total, customer: s.customerName },
      ipAddress: req.ip
    });
    res.json({ ...s, id, saleNumber: saleNum, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao registrar venda." });
  }
});
router.post("/sales/:id/cancel", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run("UPDATE sales SET payment_status = 'CANCELADO', updated_at = ? WHERE id = ?", [now, id]);
    await db.run("UPDATE receivables SET status = 'CANCELADO', updated_at = ? WHERE id = ?", [now, id]);
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "CANCEL_SALE",
      entityType: "SALE",
      entityId: id,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao cancelar venda." });
  }
});
router.get("/budgets", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM budgets ORDER BY created_at DESC");
    const budgets = rows.map((r) => ({
      id: r.id,
      budgetNumber: Number(r.budget_number),
      customerId: r.customer_id || void 0,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || void 0,
      customerEmail: r.customer_email || void 0,
      sellerId: r.seller_id || void 0,
      sellerName: r.seller_name,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      addition: Number(r.addition),
      total: Number(r.total),
      status: r.status,
      validUntil: r.valid_until || void 0,
      items: JSON.parse(r.items_json),
      notes: r.notes || void 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar or\xE7amentos." });
  }
});
router.post("/budgets", async (req, res) => {
  try {
    const b = req.body;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = b.id || `bgt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    let bgtNum = b.budgetNumber;
    if (!bgtNum) {
      const maxNum = await db.get("SELECT MAX(budget_number) as m FROM budgets");
      bgtNum = (Number(maxNum?.m) || 100) + 1;
    }
    await db.run(
      `INSERT OR REPLACE INTO budgets (
        id, budget_number, customer_id, customer_name, customer_phone, customer_email,
        seller_id, seller_name, subtotal, discount, addition, total, status, valid_until,
        items_json, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        bgtNum,
        b.customerId || null,
        b.customerName || "Cliente",
        b.customerPhone || null,
        b.customerEmail || null,
        b.sellerId || req.user?.id || null,
        b.sellerName || req.user?.name || "Atendente",
        Number(b.subtotal) || 0,
        Number(b.discount) || 0,
        Number(b.addition) || 0,
        Number(b.total) || 0,
        b.status || "PENDENTE",
        b.validUntil || null,
        JSON.stringify(b.items || []),
        b.notes || null,
        b.createdAt || now,
        now
      ]
    );
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "SAVE_BUDGET",
      entityType: "BUDGET",
      entityId: id,
      details: { budgetNumber: bgtNum, total: b.total, customer: b.customerName },
      ipAddress: req.ip
    });
    res.json({ ...b, id, budgetNumber: bgtNum, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao salvar or\xE7amento." });
  }
});
router.delete("/budgets/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM budgets WHERE id = ?", [id]);
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "DELETE_BUDGET",
      entityType: "BUDGET",
      entityId: id,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao excluir or\xE7amento." });
  }
});
router.get("/prospecting/opportunities", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM opportunities ORDER BY updated_at DESC");
    const list = rows.map((r) => ({
      id: r.id,
      opportunityNumber: Number(r.opportunity_number),
      name: r.name,
      contactName: r.contact_name || void 0,
      phone: r.phone,
      whatsapp: r.whatsapp || void 0,
      email: r.email || void 0,
      segment: r.segment,
      stage: r.stage,
      estimatedValue: Number(r.estimated_value),
      confidence: Number(r.confidence),
      neighborhood: r.neighborhood || void 0,
      city: r.city || void 0,
      origin: r.origin || void 0,
      originDetails: r.origin_details || void 0,
      notes: r.notes || void 0,
      assignedSellerId: r.assigned_seller_id || void 0,
      assignedSellerName: r.assigned_seller_name || void 0,
      nextAction: r.next_action_json ? JSON.parse(r.next_action_json) : void 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar oportunidades." });
  }
});
router.post("/prospecting/opportunities", async (req, res) => {
  try {
    const opp = req.body;
    if (!opp.name || !opp.name.trim()) {
      res.status(400).json({ error: "Nome do lead/empresa \xE9 obrigat\xF3rio." });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = opp.id || `opp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    let oppNum = opp.opportunityNumber;
    if (!oppNum) {
      const maxNum = await db.get("SELECT MAX(opportunity_number) as m FROM opportunities");
      oppNum = (Number(maxNum?.m) || 100) + 1;
    }
    await db.run(
      `INSERT OR REPLACE INTO opportunities (
        id, opportunity_number, name, contact_name, phone, whatsapp, email, segment,
        stage, estimated_value, confidence, neighborhood, city, origin, origin_details,
        notes, assigned_seller_id, assigned_seller_name, next_action_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        oppNum,
        opp.name.trim(),
        opp.contactName?.trim() || null,
        opp.phone?.trim() || "",
        opp.whatsapp?.trim() || null,
        opp.email?.trim() || null,
        opp.segment || "Com\xE9rcio & Servi\xE7os Gerais",
        opp.stage || "IDENTIFICADO",
        Number(opp.estimatedValue) || 0,
        Number(opp.confidence) || 50,
        opp.neighborhood?.trim() || null,
        opp.city?.trim() || null,
        opp.origin || "PROSPECCAO_ATIVA",
        opp.originDetails?.trim() || null,
        opp.notes?.trim() || null,
        opp.assignedSellerId || null,
        opp.assignedSellerName || null,
        opp.nextAction ? JSON.stringify(opp.nextAction) : null,
        opp.createdAt || now,
        now
      ]
    );
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "SAVE_OPPORTUNITY",
      entityType: "OPPORTUNITY",
      entityId: id,
      details: { name: opp.name, stage: opp.stage, value: opp.estimatedValue },
      ipAddress: req.ip
    });
    res.json({ ...opp, id, opportunityNumber: oppNum, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao salvar oportunidade." });
  }
});
router.delete("/prospecting/opportunities/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM opportunities WHERE id = ?", [id]);
    await db.run("DELETE FROM opportunity_activities WHERE opportunity_id = ?", [id]);
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "DELETE_OPPORTUNITY",
      entityType: "OPPORTUNITY",
      entityId: id,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao excluir oportunidade." });
  }
});
router.get("/prospecting/packages", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM packages ORDER BY featured DESC, name ASC");
    const pkgs = rows.map((r) => ({
      id: r.id,
      name: r.name,
      segment: r.segment,
      targetAudience: r.target_audience || void 0,
      description: r.description || "",
      items: JSON.parse(r.items_json),
      totalIndividualPrice: Number(r.total_individual_price),
      packagePrice: Number(r.package_price),
      discountPercent: Number(r.discount_percent),
      pitch: r.pitch || void 0,
      featured: Number(r.featured) === 1,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    res.json(pkgs);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar pacotes." });
  }
});
router.get("/prospecting/approach-templates", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM approach_templates ORDER BY segment ASC");
    res.json(rows.map((r) => ({
      id: r.id,
      segment: r.segment,
      title: r.title,
      trigger: r.trigger,
      messageText: r.message_text,
      tone: r.tone,
      variables: r.variables_json ? JSON.parse(r.variables_json) : void 0,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar templates de abordagem." });
  }
});
router.get("/prospecting/complementary-rules", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM complementary_rules WHERE active = 1");
    res.json(rows.map((r) => ({
      id: r.id,
      triggerItemId: r.trigger_item_id,
      triggerItemName: r.trigger_item_name,
      suggestedItemIds: JSON.parse(r.suggested_item_ids_json),
      reason: r.reason,
      discountOnCombo: Number(r.discount_on_combo),
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar regras complementares." });
  }
});
router.get("/prospecting/public-segment-pages", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM public_segment_pages WHERE active = 1");
    res.json(rows.map((r) => ({
      id: r.id,
      segmentSlug: r.segment_slug,
      title: r.title,
      subtitle: r.subtitle || void 0,
      coverImageUrl: r.cover_image_url || void 0,
      heroBadge: r.hero_badge || void 0,
      painPoints: r.pain_points_json ? JSON.parse(r.pain_points_json) : void 0,
      solutions: r.solutions_json ? JSON.parse(r.solutions_json) : void 0,
      recommendedPackageIds: r.recommended_package_ids_json ? JSON.parse(r.recommended_package_ids_json) : void 0,
      testimonials: r.testimonials_json ? JSON.parse(r.testimonials_json) : void 0,
      ctaText: r.cta_text || void 0,
      whatsappDefaultMessage: r.whatsapp_default_message || void 0,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar p\xE1ginas de segmento." });
  }
});
router.get("/finance/receiving-accounts", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM receiving_accounts ORDER BY name ASC");
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      receiverName: r.receiver_name,
      active: Number(r.active) === 1,
      pixKey: r.pix_key || void 0,
      bankDetails: r.bank_details || void 0,
      cardFeePercent: Number(r.card_fee_percent),
      isDefault: Number(r.is_default) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar contas de recebimento." });
  }
});
router.post("/finance/receiving-accounts", requireAdmin, async (req, res) => {
  try {
    const a = req.body;
    const id = a.id || `acc-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(
      `INSERT OR REPLACE INTO receiving_accounts (
        id, name, type, receiver_name, active, pix_key, bank_details, card_fee_percent, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        a.name,
        a.type,
        a.receiverName,
        a.active !== false ? 1 : 0,
        a.pixKey || "",
        a.bankDetails || "",
        Number(a.cardFeePercent) || 0,
        a.isDefault ? 1 : 0,
        a.createdAt || now,
        now
      ]
    );
    res.json({ ...a, id, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao salvar conta." });
  }
});
router.get("/finance/receivables", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM receivables ORDER BY due_date ASC");
    res.json(rows.map((r) => ({
      id: r.id,
      saleId: r.sale_id,
      saleNumber: Number(r.sale_number),
      customerId: r.customer_id || void 0,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || void 0,
      totalAmount: Number(r.total_amount),
      paidAmount: Number(r.paid_amount),
      remainingAmount: Number(r.remaining_amount),
      dueDate: r.due_date,
      status: r.status,
      paymentRecords: r.payment_records_json ? JSON.parse(r.payment_records_json) : [],
      notes: r.notes || void 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar contas a receber." });
  }
});
router.get("/finance/cash-register-sessions", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM cash_register_sessions ORDER BY opened_at DESC");
    res.json(rows.map((r) => ({
      id: r.id,
      registerNumber: Number(r.register_number),
      openedByUserId: r.opened_by_user_id,
      openedByUserName: r.opened_by_user_name,
      closedByUserId: r.closed_by_user_id || void 0,
      closedByUserName: r.closed_by_user_name || void 0,
      openedAt: r.opened_at,
      closedAt: r.closed_at || void 0,
      initialAmount: Number(r.initial_amount),
      finalCashAmount: r.final_cash_amount !== null && r.final_cash_amount !== void 0 ? Number(r.final_cash_amount) : void 0,
      status: r.status,
      notes: r.notes || void 0,
      summary: r.summary_json ? JSON.parse(r.summary_json) : void 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar sess\xF5es de caixa." });
  }
});
router.get("/production", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM production_orders ORDER BY priority DESC, created_at DESC");
    res.json(rows.map((r) => ({
      id: r.id,
      orderNumber: Number(r.order_number),
      saleId: r.sale_id,
      saleNumber: Number(r.sale_number),
      customerId: r.customer_id || void 0,
      customerName: r.customer_name,
      itemId: r.item_id,
      itemName: r.item_name,
      quantity: Number(r.quantity),
      status: r.status,
      priority: r.priority,
      deadline: r.dead_line || void 0,
      notes: r.notes || void 0,
      files: r.files_json ? JSON.parse(r.files_json) : [],
      stages: r.stages_json ? JSON.parse(r.stages_json) : [],
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar ordens de produ\xE7\xE3o." });
  }
});
router.get("/inventory/movements", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 200");
    res.json(rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      itemName: r.item_name,
      type: r.type,
      quantity: Number(r.quantity),
      previousStock: Number(r.previous_stock),
      currentStock: Number(r.current_stock),
      reason: r.reason || void 0,
      userId: r.user_id || void 0,
      userName: r.user_name || void 0,
      referenceId: r.reference_id || void 0,
      referenceType: r.reference_type || void 0,
      createdAt: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar movimenta\xE7\xF5es de estoque." });
  }
});
router.get("/online-services", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM online_services ORDER BY name ASC");
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      turnaroundTime: r.turnaround_time || void 0,
      requirements: r.requirements || void 0,
      description: r.description || void 0,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar servi\xE7os online." });
  }
});
router.get("/document-templates", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM document_templates ORDER BY name ASC");
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || void 0,
      category: r.category,
      content: r.content,
      variables: r.variables_json ? JSON.parse(r.variables_json) : [],
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar templates." });
  }
});
router.get("/generated-documents", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM generated_documents ORDER BY created_at DESC");
    res.json(rows.map((r) => ({
      id: r.id,
      templateId: r.template_id || void 0,
      templateName: r.template_name,
      title: r.title,
      customerId: r.customer_id || void 0,
      customerName: r.customer_name || void 0,
      customerCpfCnpj: r.customer_cpf_cnpj || void 0,
      renderedContent: r.rendered_content,
      createdByUserId: r.created_by_user_id || void 0,
      createdByUserName: r.created_by_user_name || void 0,
      createdAt: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar documentos gerados." });
  }
});
router.get("/settings", async (req, res) => {
  try {
    const row = await db.get("SELECT settings_json FROM company_settings WHERE id = ?", ["default"]);
    if (row && row.settings_json) {
      res.json(JSON.parse(row.settings_json));
    } else {
      res.json({});
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao obter configura\xE7\xF5es." });
  }
});
router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const newSettings = req.body;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(
      "INSERT OR REPLACE INTO company_settings (id, settings_json, updated_at) VALUES (?, ?, ?)",
      ["default", JSON.stringify(newSettings), now]
    );
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "UPDATE_COMPANY_SETTINGS",
      entityType: "SETTINGS",
      entityId: "default",
      ipAddress: req.ip
    });
    res.json(newSettings);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao atualizar configura\xE7\xF5es." });
  }
});
router.get("/audit", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const entityType = req.query.entityType;
    const userId = req.query.userId;
    const action = req.query.action;
    const result = await getAuditLogs({ limit, offset, entityType, userId, action });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao buscar auditoria." });
  }
});
router.get("/backup/export", requireAdmin, async (req, res) => {
  try {
    const snapshot = await exportDatabaseSnapshot();
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "EXPORT_BACKUP",
      entityType: "DATABASE",
      ipAddress: req.ip
    });
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao exportar backup." });
  }
});
router.post("/backup/create", requireAdmin, async (req, res) => {
  try {
    const filename = await createLocalBackupFile("manual");
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: "CREATE_MANUAL_BACKUP",
      entityType: "DATABASE",
      details: { filename },
      ipAddress: req.ip
    });
    res.json({ success: true, filename });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao criar backup local." });
  }
});
router.get("/backup/list", requireAdmin, async (req, res) => {
  try {
    const backups = listLocalBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao listar backups." });
  }
});
router.post("/backup/import", requireAdmin, async (req, res) => {
  try {
    const snapshot = req.body;
    const result = await restoreDatabaseSnapshot(snapshot, req.user?.id, req.user?.name);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Erro ao importar backup." });
  }
});
router.post("/ai/generate", async (req, res) => {
  try {
    const { type, prompt, context } = req.body;
    const response = await generateAIContent({ type: type || "custom", prompt, context });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro no servi\xE7o de IA." });
  }
});
var routes_default = router;

// server/serverless.ts
var app = express2();
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ extended: true, limit: "50mb" }));
app.use(authMiddleware);
app.use("/api", routes_default);
app.use(routes_default);
var isDbReady = false;
var dbInitPromise = null;
async function ensureDatabase() {
  if (isDbReady) return;
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase().then((db2) => {
      isDbReady = true;
      return db2;
    });
  }
  await dbInitPromise;
}
async function handler(req, res) {
  try {
    await ensureDatabase();
    return app(req, res);
  } catch (err) {
    console.error("Fatal Serverless API handler error:", err);
    res.status(500).json({
      error: "Erro interno no servidor de banco de dados.",
      message: err?.message || "Falha ao inicializar o banco online."
    });
  }
}
export {
  handler as default
};
