import { DocumentTemplate, OnlineService } from '../types';

export const INITIAL_ONLINE_SERVICES: OnlineService[] = [
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
    name: 'Boleto DAS-MEI',
    category: 'Governo',
    description: 'Inscrição MEI, emissão do DAS mensal e declaração anual do MEI (DASN)',
    url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor',
    price: 30.0,
    cost: 0,
    active: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
];

export const INITIAL_DOCUMENT_TEMPLATES: DocumentTemplate[] = [];
