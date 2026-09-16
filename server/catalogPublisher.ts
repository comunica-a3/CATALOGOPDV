import fs from 'fs';
import path from 'path';
import { db, initializeDatabase } from './db';

export interface PublicCatalogPayload {
  version: string;
  exportedAt: string;
  company: {
    name: string;
    tradingName?: string;
    document?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    logoUrl?: string;
    logoDriveFileId?: string;
    logoDriveThumbnailUrl?: string;
    receiptFooterMessage?: string;
    paymentMethods?: string[];
    catalogSubtitle?: string;
    catalogHeaderType?: 'NAME' | 'LOGO';
    prospectingTexts?: Record<string, any>;
  };
  categories: Array<{
    id: string;
    name: string;
    slug?: string;
    description?: string;
    itemType?: string;
    icon?: string;
  }>;
  niches: Array<{
    id: string;
    title: string;
    description: string;
    ctaText: string;
    imageUrl: string;
    badge: string;
    itemTypeMatch?: string;
    categoryMatchKeywords?: string[];
    order?: number;
    active: boolean;
  }>;
  items: Array<Record<string, any>>;
}

/**
 * Coleta e sanitiza exclusivamente os dados públicos do banco SQLite local
 * (remove custos de fornecedor, margens de lucro, notas internas e fornecedores)
 */
export async function buildPublicCatalogPayload(): Promise<PublicCatalogPayload> {
  if (!db.client) {
    await initializeDatabase();
  }

  // 1. Dados da Empresa (Apenas campos públicos)
  let companyData: any = {};
  try {
    const row = await db.get<any>('SELECT settings_json FROM company_settings WHERE id = ?', ['default']);
    if (row && row.settings_json) {
      const parsed = JSON.parse(row.settings_json);
      companyData = {
        name: parsed.name || 'Gráfica & Estúdio',
        tradingName: parsed.tradingName || '',
        document: parsed.document || '',
        phone: parsed.phone || '',
        whatsapp: parsed.whatsapp || '',
        email: parsed.email || '',
        address: parsed.address || '',
        city: parsed.city || '',
        state: parsed.state || '',
        logoUrl: parsed.logoUrl || '',
        logoDriveFileId: parsed.logoDriveFileId || undefined,
        logoDriveThumbnailUrl: parsed.logoDriveThumbnailUrl || undefined,
        receiptFooterMessage: parsed.receiptFooterMessage || '',
        paymentMethods: parsed.paymentMethods || [],
        catalogSubtitle: parsed.catalogSubtitle || '',
        catalogHeaderType: parsed.catalogHeaderType || 'NAME',
        prospectingTexts: parsed.prospectingTexts || {},
      };
    }
  } catch (err) {
    console.warn('Notice loading company settings for catalog:', err);
  }

  // 2. Categorias ativas
  let categories: any[] = [];
  try {
    const catRows = await db.all<any>(
      'SELECT * FROM categories WHERE active = 1 OR active IS NULL ORDER BY name ASC'
    );
    categories = catRows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug || r.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      description: r.description || '',
      itemType: r.item_type || 'PRODUTO_FISICO',
      icon: r.icon || '',
    }));
  } catch (err) {
    console.warn('Notice loading categories for catalog:', err);
  }

  // 3. Nichos de catálogo ativos
  let niches: any[] = [];
  try {
    const nicheRows = await db.all<any>(
      'SELECT * FROM catalog_niches ORDER BY niche_order ASC'
    );
    niches = nicheRows
      .filter((r) => r.active === 1 || r.active === null || r.active === undefined)
      .map((r) => {
        let extra: any = {};
        if (r.data_json) {
          try {
            extra = JSON.parse(r.data_json);
          } catch {}
        }
        return {
          id: r.id,
          title: r.title,
          description: r.description || '',
          ctaText: r.cta_text || 'Ver produtos',
          imageUrl: r.image_url || '',
          badge: r.badge || '',
          itemTypeMatch: r.item_type_match || 'ALL',
          categoryMatchKeywords: extra.categoryMatchKeywords || [],
          order: r.niche_order || 0,
          active: true,
        };
      });
  } catch (err) {
    console.warn('Notice loading catalog niches:', err);
  }

  // 4. Itens ativos com show_in_catalog = 1 (Sanitizados sem custos ou margens)
  let items: any[] = [];
  try {
    const itemRows = await db.all<any>(
      'SELECT * FROM items WHERE (active = 1 OR active IS NULL) AND show_in_catalog = 1 ORDER BY name ASC'
    );

    items = itemRows.map((r) => {
      let extra: any = {};
      if (r.data_json) {
        try {
          extra = JSON.parse(r.data_json);
        } catch {}
      }
      const baseItem = extra && typeof extra === 'object' && extra.id ? extra : {};

      // Sanitização de pacotes: remove custos e margens de cada pacote
      let rawPackages = r.packages_json ? JSON.parse(r.packages_json) : baseItem.packages;
      let sanitizedPackages: any[] | undefined = undefined;
      if (Array.isArray(rawPackages)) {
        sanitizedPackages = rawPackages.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          quantity: pkg.quantity,
          salePrice: pkg.salePrice,
          unitPrice: pkg.unitPrice,
          description: pkg.description,
        }));
      }

      // Sanitização de precificação por m2: remove custo por m2
      let rawArea = r.area_pricing_json ? JSON.parse(r.area_pricing_json) : baseItem.areaPricing;
      let sanitizedArea: any = undefined;
      if (rawArea && typeof rawArea === 'object') {
        sanitizedArea = {
          salePricePerM2: rawArea.salePricePerM2,
          minAreaM2: rawArea.minAreaM2,
          minSalePrice: rawArea.minSalePrice,
        };
      }

      // Retorna APENAS campos seguros para a vitrine pública
      return {
        id: r.id,
        name: r.name,
        sku: r.sku || baseItem.sku || undefined,
        barcode: r.barcode || baseItem.barcode || undefined,
        categoryId: r.category_id || baseItem.categoryId || '',
        type: r.type || baseItem.type || 'PRODUTO_FISICO',
        description: r.description || baseItem.description || '',
        salePrice: Number(r.sale_price !== null && r.sale_price !== undefined ? r.sale_price : (baseItem.salePrice || 0)),
        unit: r.unit || baseItem.unit || 'UN',
        stock: Number(r.stock !== null && r.stock !== undefined ? r.stock : (baseItem.stock || 0)),
        imageUrl: (r.image_url && r.image_url.trim()) ? r.image_url.trim() : (baseItem.imageUrl || ''),
        imageSource: r.image_source || baseItem.imageSource,
        imageOriginalUrl: r.image_original_url || baseItem.imageOriginalUrl,
        googleDriveFileId: r.google_drive_file_id || baseItem.googleDriveFileId,
        googleDriveFileName: r.google_drive_file_name || baseItem.googleDriveFileName,
        googleDriveMimeType: r.google_drive_mime_type || baseItem.googleDriveMimeType,
        googleDriveThumbnailUrl: r.google_drive_thumbnail_url || baseItem.googleDriveThumbnailUrl,
        pricingModel: r.pricing_model || baseItem.pricingModel,
        productionType: r.production_type || baseItem.productionType,
        leadTime: r.lead_time || baseItem.leadTime,
        requiresFile: Number(r.requires_file) === 1 || !!baseItem.requiresFile,
        brand: r.brand || baseItem.brand,
        niche: r.niche || baseItem.niche,
        featuredInCatalog: Number(r.featured_in_catalog) === 1 || !!baseItem.featuredInCatalog,
        priceRules: r.price_rules_json ? JSON.parse(r.price_rules_json) : baseItem.priceRules,
        packages: sanitizedPackages,
        areaPricing: sanitizedArea,
        variants: r.variants_json ? JSON.parse(r.variants_json) : baseItem.variants,
        estimatedTime: r.estimated_time || baseItem.estimatedTime,
        serviceFields: r.service_fields_json ? JSON.parse(r.service_fields_json) : baseItem.serviceFields,
        serviceUrl: r.service_url || baseItem.serviceUrl,
        options: r.options_json ? JSON.parse(r.options_json) : baseItem.options,
        active: true,
        showInCatalog: true,
      };
    });
  } catch (err) {
    console.warn('Notice loading items for catalog:', err);
  }

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    company: companyData,
    categories,
    niches,
    items,
  };
}

/**
 * Salva localmente em public/catalogo.json
 */
export function saveCatalogLocally(payload: PublicCatalogPayload): string {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const filePath = path.join(publicDir, 'catalogo.json');
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return filePath;
}

/**
 * Publica o arquivo public/catalogo.json diretamente no repositório do GitHub via API REST
 */
export async function publishCatalogToGitHub(options?: {
  token?: string;
  owner?: string;
  repo?: string;
  branch?: string;
}): Promise<{
  success: boolean;
  message: string;
  itemsCount: number;
  commitUrl?: string;
  fileSha?: string;
  targetRepo: string;
}> {
  const token = (options?.token || process.env.GITHUB_TOKEN || '').trim();
  const owner = (options?.owner || process.env.GITHUB_REPO_OWNER || '').trim();
  const repo = (options?.repo || process.env.GITHUB_REPO_NAME || '').trim();
  const branch = (options?.branch || process.env.GITHUB_BRANCH || '').trim();

  // 1. Gera o payload com os dados públicos sanitizados
  const payload = await buildPublicCatalogPayload();

  // 2. Salva localmente primeiro (para que ambiente local e build estático fiquem atualizados)
  saveCatalogLocally(payload);

  // 3. Valida credenciais do GitHub
  const missingVars: string[] = [];
  if (!token) missingVars.push('GITHUB_TOKEN');
  if (!owner) missingVars.push('GITHUB_REPO_OWNER');
  if (!repo) missingVars.push('GITHUB_REPO_NAME');

  if (missingVars.length > 0) {
    throw new Error(
      `Variáveis de ambiente do GitHub ausentes: ${missingVars.join(', ')}. Configure-as no arquivo .env ou no formulário de publicação.`
    );
  }

  const targetRepo = `${owner}/${repo}`;
  const fileApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/public/catalogo.json`;

  // 4. Verifica se o arquivo já existe no repositório para obter o SHA atual (obrigatório para updates)
  let existingSha: string | undefined;
  try {
    const branchParam = branch ? `?ref=${encodeURIComponent(branch)}` : '';
    const checkRes = await fetch(`${fileApiUrl}${branchParam}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Dumorro-PDV-Catalog-Publisher',
      },
    });

    if (checkRes.ok) {
      const existingData: any = await checkRes.json();
      existingSha = existingData.sha;
    } else if (checkRes.status === 401 || checkRes.status === 403) {
      throw new Error(
        `Token do GitHub inválido ou sem permissão de escrita em repositório (${checkRes.status}). Verifique o escopo "contents:write" ou "repo".`
      );
    } else if (checkRes.status !== 404) {
      const errData: any = await checkRes.json().catch(() => ({}));
      throw new Error(
        `Erro ao consultar repositório GitHub (${checkRes.status}): ${errData.message || checkRes.statusText}`
      );
    }
  } catch (checkErr: any) {
    if (checkErr.message && checkErr.message.includes('Token do GitHub')) {
      throw checkErr;
    }
    console.warn('Aviso ao checar SHA do arquivo no GitHub:', checkErr.message);
  }

  // 5. Prepara o conteúdo em Base64
  const jsonContent = JSON.stringify(payload, null, 2);
  const base64Content = Buffer.from(jsonContent, 'utf-8').toString('base64');

  const requestBody: Record<string, any> = {
    message: `chore(catalog): atualizar vitrine estática (${payload.items.length} itens)`,
    content: base64Content,
  };

  if (existingSha) {
    requestBody.sha = existingSha;
  }
  if (branch) {
    requestBody.branch = branch;
  }

  // 6. Envia requisição PUT para o GitHub
  const putRes = await fetch(fileApiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Dumorro-PDV-Catalog-Publisher',
    },
    body: JSON.stringify(requestBody),
  });

  if (!putRes.ok) {
    const errData: any = await putRes.json().catch(() => ({}));
    throw new Error(
      `Falha na API do GitHub (${putRes.status}): ${errData.message || putRes.statusText}`
    );
  }

  const putData: any = await putRes.json();
  const commitUrl = putData.commit?.html_url || `https://github.com/${owner}/${repo}/commits`;
  const fileSha = putData.content?.sha;

  return {
    success: true,
    message: 'Catálogo atualizado com sucesso no GitHub! A vitrine será atualizada em instantes.',
    itemsCount: payload.items.length,
    commitUrl,
    fileSha,
    targetRepo,
  };
}
