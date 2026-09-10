import { ProductNicheCard } from '../types';

export const INITIAL_CATALOG_NICHES: ProductNicheCard[] = [
  {
    id: 'grafica-e-personalizados',
    title: 'Gráfica e Personalizados',
    description: 'Materiais impressos e produtos personalizados',
    ctaText: 'Ver produtos',
    imageUrl: 'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800&auto=format&fit=crop&q=80',
    badge: 'Gráfica & Impressos',
    order: 1,
    active: true,
    itemTypeMatch: 'PRODUTO_GRAFICO',
    categoryMatchKeywords: [
      'grafica',
      'personalizado',
      'impresso',
      'adesivo',
      'panfleto',
      'cartao',
      'bloco',
      'banner',
      'embalagem',
      'sublimacao',
      'brinde',
    ],
  },
  {
    id: 'produtos-eletronicos',
    title: 'Produtos Eletrônicos',
    description: 'Equipamentos e acessórios eletrônicos.',
    ctaText: 'Ver produtos',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    badge: 'Eletrônicos & Acessórios',
    order: 2,
    active: true,
    itemTypeMatch: 'PRODUTO_FISICO',
    categoryMatchKeywords: [
      'eletronico',
      'acessorio',
      'cabo',
      'fone',
      'carregador',
      'celular',
      'fisico',
      'teclado',
      'mouse',
    ],
  },
  {
    id: 'servicos-digitais',
    title: 'Serviços Digitais',
    description: 'Soluções para o seu dia a dia',
    ctaText: 'Ver serviços',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    badge: 'Serviços Online',
    order: 3,
    active: true,
    itemTypeMatch: 'SERVICO',
    categoryMatchKeywords: [
      'digital',
      'servico',
      'online',
      'design',
      'social',
      'site',
      'consulta',
      'documento',
    ],
  },
];

export const PRESET_NICHE_IMAGES = [
  {
    label: 'Gráfica e Impressão',
    url: 'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Cartões e Papelaria',
    url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Eletrônicos e Fones',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Smartphones e Gadgets',
    url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Serviços Digitais e Web',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Design e Criatividade',
    url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Brindes e Canecas',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Vestuário e Sublimação',
    url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Fotografia e Eventos',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Festas e Decoração',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format&fit=crop&q=80',
  },
];
