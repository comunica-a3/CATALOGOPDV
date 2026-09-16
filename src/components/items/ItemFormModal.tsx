import {
  AlertCircle,
  ArrowRight,
  Check,
  CloudOff,
  Coins,
  Copy,
  ExternalLink,
  FileCode,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { StorageService } from '../../services/storage';
import { compressImage } from '../../utils/imageCompressor';
import { isGraphicOrPersonalizedType } from '../../utils/productUtils';
import { GoogleDrivePickerModal } from './GoogleDrivePickerModal';
import {
  checkGoogleDriveFileAvailability,
  extractGoogleDriveFileId,
  getGoogleDriveDisplayUrl,
  getGoogleDriveFileMetadata,
} from '../../services/googleDriveService';
import {
  Category,
  GraphicPricingModel,
  Item,
  ItemAreaPricing,
  ItemOption,
  ItemPackage,
  ItemPriceRule,
  ItemType,
  ItemVariant,
  ProductionType,
  ProductSeparation,
  ServiceField,
} from '../../types';
import { ProductSeparationManagerModal, getSeparationIcon } from './ProductSeparationManagerModal';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: Item | null;
  onSaved: (item: Item) => void;
  categories: Category[];
  isDuplication?: boolean;
}

const getInitialFormData = (itemToEdit: Item | null | undefined, categories: Category[], isDuplication = false) => {
  if (itemToEdit) {
    return {
      name: itemToEdit.name || '',
      type: itemToEdit.type || 'PRODUTO_GRAFICO',
      categoryId: itemToEdit.categoryId || (categories[0]?.id ?? ''),
      sku: isDuplication ? StorageService.generateNextSku(itemToEdit.type || 'PRODUTO_GRAFICO') : (itemToEdit.sku || ''),
      barcode: itemToEdit.barcode || '',
      description: itemToEdit.description || '',
      imageUrl: itemToEdit.imageUrl || '',
      imageSource: itemToEdit.imageSource || (itemToEdit.imageUrl ? 'upload' : undefined),
      imageOriginalUrl: itemToEdit.imageOriginalUrl || '',
      googleMediaId: itemToEdit.googleMediaId || '',
      googleDriveFileId: itemToEdit.googleDriveFileId || '',
      googleDriveFileName: itemToEdit.googleDriveFileName || '',
      googleDriveMimeType: itemToEdit.googleDriveMimeType || '',
      googleDriveThumbnailUrl: itemToEdit.googleDriveThumbnailUrl || '',
      googleDriveAccount: itemToEdit.googleDriveAccount || '',
      imageMetadata: itemToEdit.imageMetadata,
      costPrice: itemToEdit.costPrice || 0,
      salePrice: itemToEdit.salePrice || 0,
      active: itemToEdit.active !== false,
      showInCatalog: itemToEdit.showInCatalog !== false,
      featuredInCatalog: !!itemToEdit.featuredInCatalog,
      brand: itemToEdit.brand || '',
      supplier: itemToEdit.supplier || '',
      stock: itemToEdit.stock || 0,
      minStock: itemToEdit.minStock || 5,
      variants: itemToEdit.variants ? JSON.parse(JSON.stringify(itemToEdit.variants)) : [],
      pricingModel: itemToEdit.pricingModel || 'POR_UNIDADE',
      productionType: itemToEdit.productionType || 'PRODUCAO_PROPRIA',
      leadTime: itemToEdit.leadTime || '2 a 3 dias úteis',
      requiresFile: itemToEdit.requiresFile !== false,
      options: itemToEdit.options ? JSON.parse(JSON.stringify(itemToEdit.options)) : [],
      priceRules: itemToEdit.priceRules ? JSON.parse(JSON.stringify(itemToEdit.priceRules)) : [],
      packages: itemToEdit.packages ? JSON.parse(JSON.stringify(itemToEdit.packages)) : [],
      areaPricing: itemToEdit.areaPricing
        ? {
            costPerM2: itemToEdit.areaPricing.costPerM2 ?? 0,
            salePricePerM2: itemToEdit.areaPricing.salePricePerM2 ?? 0,
            technicalMinArea: itemToEdit.areaPricing.technicalMinArea ?? itemToEdit.areaPricing.minAreaM2 ?? 0.01,
            minAreaM2: itemToEdit.areaPricing.technicalMinArea ?? itemToEdit.areaPricing.minAreaM2 ?? 0.01,
            minSalePrice: itemToEdit.areaPricing.minSalePrice,
          }
        : { costPerM2: 130, salePricePerM2: 260, technicalMinArea: 0.01, minAreaM2: 0.01 },
      estimatedTime: itemToEdit.estimatedTime || '15 minutos',
      serviceFields: itemToEdit.serviceFields ? JSON.parse(JSON.stringify(itemToEdit.serviceFields)) : [],
      serviceUrl: itemToEdit.serviceUrl || itemToEdit.url || '',
    };
  }

  const initialType: ItemType = 'PRODUTO_GRAFICO';
  return {
    name: '',
    type: initialType,
    categoryId: categories[0]?.id || '',
    sku: StorageService.generateNextSku(initialType),
    barcode: '',
    description: '',
    imageUrl: '',
    imageSource: undefined as 'upload' | 'url' | 'google_drive' | undefined,
    imageOriginalUrl: '',
    googleMediaId: '',
    googleDriveFileId: '',
    googleDriveFileName: '',
    googleDriveMimeType: '',
    googleDriveThumbnailUrl: '',
    googleDriveAccount: '',
    imageMetadata: undefined,
    costPrice: 0,
    salePrice: 0,
    active: true,
    showInCatalog: true,
    featuredInCatalog: false,
    brand: '',
    supplier: '',
    stock: 10,
    minStock: 5,
    variants: [] as ItemVariant[],
    pricingModel: 'POR_UNIDADE' as GraphicPricingModel,
    productionType: 'PRODUCAO_PROPRIA' as ProductionType,
    leadTime: '2 a 3 dias úteis',
    requiresFile: true,
    options: [] as ItemOption[],
    priceRules: [
      { id: 'pr-1', minQuantity: 100, maxQuantity: 249, unitCost: 0.12, unitSalePrice: 0.25 },
      { id: 'pr-2', minQuantity: 250, maxQuantity: 499, unitCost: 0.08, unitSalePrice: 0.16 },
      { id: 'pr-3', minQuantity: 500, maxQuantity: undefined, unitCost: 0.05, unitSalePrice: 0.11 },
    ],
    packages: [
      { id: 'pkg-1', name: 'Pacote 100 un', quantity: 100, costPrice: 20, salePrice: 45 },
      { id: 'pkg-2', name: 'Pacote 500 un', quantity: 500, costPrice: 45, salePrice: 99 },
    ],
    areaPricing: { costPerM2: 130, salePricePerM2: 260, technicalMinArea: 0.01, minAreaM2: 0.01 },
    estimatedTime: '15 minutos',
    serviceFields: [
      { id: 'sf-1', label: 'Nome do Titular', required: true, type: 'text' as const, placeholder: 'Nome completo' },
      { id: 'sf-2', label: 'CPF / Documento', required: true, type: 'text' as const, placeholder: '000.000.000-00' },
    ],
    serviceUrl: '',
  };
};

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
  onSaved,
  categories,
  isDuplication = false,
}) => {
  const [productSeparations, setProductSeparations] = useState<ProductSeparation[]>(() =>
    StorageService.getProductSeparations()
  );
  const [isSeparationsModalOpen, setIsSeparationsModalOpen] = useState(false);

  useEffect(() => {
    const handleSeps = () => {
      setProductSeparations(StorageService.getProductSeparations());
    };
    window.addEventListener('product-separations-updated', handleSeps);
    return () => window.removeEventListener('product-separations-updated', handleSeps);
  }, []);

  const [activeTab, setActiveTab] = useState<'geral' | 'especifico' | 'catalogo'>('geral');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Initial data calculation on mount
  const initialData = useRef(getInitialFormData(itemToEdit, categories, isDuplication)).current;

  // Form Fields
  const [name, setName] = useState(initialData.name);
  const [type, setType] = useState<ItemType>(initialData.type);
  const [categoryId, setCategoryId] = useState(initialData.categoryId);
  const [sku, setSku] = useState(initialData.sku);
  const [barcode, setBarcode] = useState(initialData.barcode);
  const [description, setDescription] = useState(initialData.description);
  const [imageUrl, setImageUrl] = useState(initialData.imageUrl);
  const [imageSource, setImageSource] = useState<'upload' | 'url' | 'google_drive' | undefined>(initialData.imageSource);
  const [imageOriginalUrl, setImageOriginalUrl] = useState(initialData.imageOriginalUrl || '');
  const [googleMediaId, setGoogleMediaId] = useState(initialData.googleMediaId || '');
  const [googleDriveFileId, setGoogleDriveFileId] = useState(initialData.googleDriveFileId || '');
  const [googleDriveFileName, setGoogleDriveFileName] = useState(initialData.googleDriveFileName || '');
  const [googleDriveMimeType, setGoogleDriveMimeType] = useState(initialData.googleDriveMimeType || '');
  const [googleDriveThumbnailUrl, setGoogleDriveThumbnailUrl] = useState(initialData.googleDriveThumbnailUrl || '');
  const [googleDriveAccount, setGoogleDriveAccount] = useState(initialData.googleDriveAccount || '');
  const [imageMetadata, setImageMetadata] = useState(initialData.imageMetadata);

  const [imageTab, setImageTab] = useState<'upload' | 'drive'>(
    initialData.imageSource === 'google_drive' ? 'drive' : 'upload'
  );
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [driveImageAvailable, setDriveImageAvailable] = useState<boolean | null>(null);
  const [driveQuickLink, setDriveQuickLink] = useState('');
  const [isResolvingDriveQuickLink, setIsResolvingDriveQuickLink] = useState(false);

  const [costPrice, setCostPrice] = useState<number>(initialData.costPrice);
  const [salePrice, setSalePrice] = useState<number>(initialData.salePrice);

  const [active, setActive] = useState(initialData.active);
  const [showInCatalog, setShowInCatalog] = useState(initialData.showInCatalog);
  const [featuredInCatalog, setFeaturedInCatalog] = useState(initialData.featuredInCatalog);

  // Physical Fields
  const [brand, setBrand] = useState(initialData.brand);
  const [supplier, setSupplier] = useState(initialData.supplier);
  const [stock, setStock] = useState<number>(initialData.stock);
  const [minStock, setMinStock] = useState<number>(initialData.minStock);
  const [variants, setVariants] = useState<ItemVariant[]>(initialData.variants);

  // Graphic Fields
  const [pricingModel, setPricingModel] = useState<GraphicPricingModel>(initialData.pricingModel);
  const [productionType, setProductionType] = useState<ProductionType>(initialData.productionType);
  const [leadTime, setLeadTime] = useState(initialData.leadTime);
  const [requiresFile, setRequiresFile] = useState(initialData.requiresFile);
  const [options, setOptions] = useState<ItemOption[]>(initialData.options);
  const [priceRules, setPriceRules] = useState<ItemPriceRule[]>(initialData.priceRules);
  const [packages, setPackages] = useState<ItemPackage[]>(initialData.packages);
  const [areaPricing, setAreaPricing] = useState<ItemAreaPricing>(initialData.areaPricing);

  // Service Fields
  const [estimatedTime, setEstimatedTime] = useState(initialData.estimatedTime);
  const [serviceFields, setServiceFields] = useState<ServiceField[]>(initialData.serviceFields);
  const [serviceUrl, setServiceUrl] = useState(initialData.serviceUrl || '');

  // Calculated Margins
  const marginReais = Number((salePrice - costPrice).toFixed(2));
  const marginPercent = salePrice > 0 ? Number(((marginReais / salePrice) * 100).toFixed(2)) : 0;

  const selectedSeparation = productSeparations.find((s) => s.id === type);
  const isGraphicOrPersonalized = isGraphicOrPersonalizedType(type, productSeparations);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Track session identity so we ONLY reset when a genuinely different item or session is opened
  const lastLoadedSessionKeyRef = useRef<string | null>(
    itemToEdit ? `edit-${itemToEdit.id}` : isDuplication ? `dup-${itemToEdit?.id || 'new'}` : 'new'
  );
  const lastIsOpenRef = useRef<boolean>(isOpen);

  useEffect(() => {
    const currentSessionKey = itemToEdit
      ? `edit-${itemToEdit.id}`
      : isDuplication
      ? `dup-${itemToEdit?.id || 'new'}`
      : 'new';

    const modalJustOpened = isOpen && !lastIsOpenRef.current;
    const sessionChanged = currentSessionKey !== lastLoadedSessionKeyRef.current;

    // Only reset state if the modal just transitioned from closed to open, or target item changed
    if (modalJustOpened || (isOpen && sessionChanged)) {
      const freshData = getInitialFormData(itemToEdit, categories, isDuplication);
      setName(freshData.name);
      setType(freshData.type);
      setCategoryId(freshData.categoryId);
      setSku(freshData.sku);
      setBarcode(freshData.barcode);
      setDescription(freshData.description);
      setImageUrl(freshData.imageUrl);
      setImageSource(freshData.imageSource);
      setImageOriginalUrl(freshData.imageOriginalUrl || '');
      setGoogleMediaId(freshData.googleMediaId || '');
      setGoogleDriveFileId(freshData.googleDriveFileId || '');
      setGoogleDriveFileName(freshData.googleDriveFileName || '');
      setGoogleDriveMimeType(freshData.googleDriveMimeType || '');
      setGoogleDriveThumbnailUrl(freshData.googleDriveThumbnailUrl || '');
      setGoogleDriveAccount(freshData.googleDriveAccount || '');
      setImageMetadata(freshData.imageMetadata);
      setImageTab(freshData.imageSource === 'google_drive' ? 'drive' : 'upload');
      setDriveQuickLink('');
      setImageError('');
      setDriveImageAvailable(null);

      // If existing item has a Google Drive image, asynchronously verify its availability
      if (freshData.imageSource === 'google_drive' && freshData.googleDriveFileId) {
        checkGoogleDriveFileAvailability(freshData.googleDriveFileId).then((available) => {
          setDriveImageAvailable(available);
        });
      }
      setCostPrice(freshData.costPrice);
      setSalePrice(freshData.salePrice);
      setActive(freshData.active);
      setShowInCatalog(freshData.showInCatalog);
      setFeaturedInCatalog(freshData.featuredInCatalog);
      setBrand(freshData.brand);
      setSupplier(freshData.supplier);
      setStock(freshData.stock);
      setMinStock(freshData.minStock);
      setVariants(freshData.variants);
      setPricingModel(freshData.pricingModel);
      setProductionType(freshData.productionType);
      setLeadTime(freshData.leadTime);
      setRequiresFile(freshData.requiresFile);
      setOptions(freshData.options);
      setPriceRules(freshData.priceRules);
      setPackages(freshData.packages);
      setAreaPricing(freshData.areaPricing);
      setEstimatedTime(freshData.estimatedTime);
      setServiceFields(freshData.serviceFields);
      setServiceUrl(freshData.serviceUrl || '');

      setErrorMsg('');
      setActiveTab('geral');
      lastLoadedSessionKeyRef.current = currentSessionKey;
    }

    lastIsOpenRef.current = isOpen;
  }, [isOpen, itemToEdit?.id, isDuplication]);

  const processImageFile = async (file?: File) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setImageError('Formato inválido. Por favor, selecione um arquivo JPG, PNG ou WEBP.');
      return;
    }

    const maxSizeInBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeInBytes) {
      setImageError('A imagem deve ter no máximo 15MB.');
      return;
    }

    setImageError('');
    setIsUploadingImage(true);

    try {
      // 1. Instant compression and optimization (max 1200px, 85% quality JPEG)
      const compressedDataUrl = await compressImage(file, 1200, 1200, 0.85);

      // Temporarily set preview so user sees instant visual feedback
      setImageUrl(compressedDataUrl);
      setImageSource('upload');
      setImageOriginalUrl('');
      setGoogleMediaId('');
      setImageMetadata({
        mimeType: file.type,
        sizeBytes: file.size,
        fetchedAt: new Date().toISOString(),
      });

      // 2. Upload to server to get permanent lightweight URL
      try {
        const uploadRes = await api.uploadImage(compressedDataUrl, 'item');
        if (uploadRes && uploadRes.url) {
          setImageUrl(uploadRes.url);
        }
      } catch (uploadErr) {
        console.warn('Falha no upload imediato da imagem, gravação direta ocorrerá ao salvar:', uploadErr);
      }
    } catch (err: any) {
      console.error('Erro ao processar imagem:', err);
      setImageError(err.message || 'Falha ao processar arquivo de imagem.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processImageFile(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImageSource(undefined);
    setImageOriginalUrl('');
    setGoogleMediaId('');
    setGoogleDriveFileId('');
    setGoogleDriveFileName('');
    setGoogleDriveMimeType('');
    setGoogleDriveThumbnailUrl('');
    setGoogleDriveAccount('');
    setImageMetadata(undefined);
    setImageError('');
    setDriveQuickLink('');
    setDriveImageAvailable(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  const handleSelectDriveFile = (selected: {
    fileId: string;
    fileName: string;
    mimeType: string;
    sizeBytes?: number;
    thumbnailUrl: string;
    displayUrl: string;
    webViewLink?: string;
    accountEmail?: string;
  }) => {
    // REGRA DE OURO: Zero cópia/armazenamento local. Apenas referência ao Google Drive.
    setImageUrl(selected.displayUrl);
    setImageSource('google_drive');
    setImageOriginalUrl(selected.webViewLink || '');
    setGoogleDriveFileId(selected.fileId);
    setGoogleDriveFileName(selected.fileName);
    setGoogleDriveMimeType(selected.mimeType);
    setGoogleDriveThumbnailUrl(selected.thumbnailUrl);
    setGoogleDriveAccount(selected.accountEmail || '');
    setImageMetadata({
      fileId: selected.fileId,
      fileName: selected.fileName,
      mimeType: selected.mimeType,
      sizeBytes: selected.sizeBytes,
      accountEmail: selected.accountEmail,
      fetchedAt: new Date().toISOString(),
    });
    setDriveImageAvailable(true);
    setImageError('');
    setIsDrivePickerOpen(false);
  };

  const handleResolveDriveQuickLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!driveQuickLink.trim()) return;

    setIsResolvingDriveQuickLink(true);
    setImageError('');

    try {
      const fileId = extractGoogleDriveFileId(driveQuickLink.trim());
      if (!fileId) {
        throw new Error('Link ou ID do Google Drive não reconhecido. Cole um link de compartilhamento válido.');
      }

      const meta = await getGoogleDriveFileMetadata(fileId);
      handleSelectDriveFile({
        fileId: meta.id,
        fileName: meta.name,
        mimeType: meta.mimeType,
        sizeBytes: meta.size ? Number(meta.size) : undefined,
        thumbnailUrl: meta.thumbnailLink || getGoogleDriveDisplayUrl(fileId, 400),
        displayUrl: getGoogleDriveDisplayUrl(fileId, 1200),
        webViewLink: meta.webViewLink,
      });
      setDriveQuickLink('');
    } catch (err: any) {
      console.error('Erro ao resolver link do Drive:', err);
      setImageError(err.message || 'Não foi possível carregar a foto informada do Google Drive.');
    } finally {
      setIsResolvingDriveQuickLink(false);
    }
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(true);
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    processImageFile(file);
  };

  const handleTypeChange = (newType: ItemType) => {
    setType(newType);
    if (!itemToEdit || isDuplication) {
      setSku(StorageService.generateNextSku(newType));
    }
  };

  const handleRegenerateSku = () => {
    setSku(StorageService.generateNextSku(type));
  };

  // Option management for Graphic Items
  const handleAddOptionGroup = () => {
    const newOpt: ItemOption = {
      id: `opt-${Date.now()}`,
      name: 'Novo Acabamento',
      values: [
        { id: `val-${Date.now()}-1`, label: 'Padrão', additionalCost: 0, additionalPrice: 0 },
      ],
    };
    setOptions([...options, newOpt]);
  };

  const handleAddOptionValue = (optIndex: number) => {
    const updated = [...options];
    updated[optIndex].values.push({
      id: `val-${Date.now()}`,
      label: 'Opção Extra',
      additionalCost: 0,
      additionalPrice: 0,
    });
    setOptions(updated);
  };

  const handleRemoveOptionGroup = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleRemoveOptionValue = (optIndex: number, valIndex: number) => {
    const updated = [...options];
    updated[optIndex].values = updated[optIndex].values.filter((_, i) => i !== valIndex);
    setOptions(updated);
  };

  // Variants management for Physical Items
  const handleAddVariant = () => {
    const newVar: ItemVariant = {
      id: `var-${Date.now()}`,
      name: 'Nova Cor/Tamanho',
      sku: `${sku}-${String(variants.length + 1).padStart(2, '0')}`,
      costPrice: costPrice,
      salePrice: salePrice,
      stock: 5,
    };
    setVariants([...variants, newVar]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Service Fields management
  const handleAddServiceField = () => {
    const newField: ServiceField = {
      id: `sf-${Date.now()}`,
      label: 'Novo Campo',
      required: true,
      type: 'text',
      placeholder: 'Digite aqui...',
    };
    setServiceFields([...serviceFields, newField]);
  };

  const handleRemoveServiceField = (index: number) => {
    setServiceFields(serviceFields.filter((_, i) => i !== index));
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome do item é obrigatório.');
      return;
    }
    if (!sku.trim()) {
      setErrorMsg('O SKU é obrigatório.');
      return;
    }

    // Check SKU uniqueness if new or changed
    const allItems = StorageService.getItems();
    const cleanSku = sku.trim().toLowerCase();
    const isDuplicateSku = allItems.some(
      (item) => (item.sku || '').toLowerCase() === cleanSku && item.id !== itemToEdit?.id
    );
    if (isDuplicateSku) {
      setErrorMsg(`O SKU "${sku}" já está em uso por outro item. Gere ou escolha outro.`);
      return;
    }

    const now = new Date().toISOString();
    const itemId = itemToEdit?.id || `item-${Date.now()}`;

    const isPhysicalOnly = !isGraphicOrPersonalized && type !== 'SERVICO';

    const computedStock =
      isPhysicalOnly
        ? variants.length > 0
          ? variants.reduce((acc, v) => acc + (v.stock || 0), 0)
          : stock
        : (stock !== undefined && stock > 0 ? stock : undefined);

    const itemData: Item = {
      id: itemId,
      name: name.trim(),
      type,
      categoryId,
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim() || undefined,
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
      imageSource: imageUrl.trim() ? (imageSource || 'upload') : undefined,
      imageOriginalUrl: imageUrl.trim() ? (imageOriginalUrl.trim() || undefined) : undefined,
      googleMediaId: imageUrl.trim() ? (googleMediaId.trim() || undefined) : undefined,
      googleDriveFileId: imageUrl.trim() && imageSource === 'google_drive' ? (googleDriveFileId.trim() || undefined) : undefined,
      googleDriveFileName: imageUrl.trim() && imageSource === 'google_drive' ? (googleDriveFileName.trim() || undefined) : undefined,
      googleDriveMimeType: imageUrl.trim() && imageSource === 'google_drive' ? (googleDriveMimeType.trim() || undefined) : undefined,
      googleDriveThumbnailUrl: imageUrl.trim() && imageSource === 'google_drive' ? (googleDriveThumbnailUrl.trim() || undefined) : undefined,
      googleDriveAccount: imageUrl.trim() && imageSource === 'google_drive' ? (googleDriveAccount.trim() || undefined) : undefined,
      imageMetadata: imageUrl.trim() ? imageMetadata : undefined,
      costPrice: Number(costPrice) || 0,
      salePrice: Number(salePrice) || 0,
      marginReais,
      marginPercent,
      active,
      showInCatalog,
      featuredInCatalog,
      createdAt: itemToEdit?.createdAt || now,
      updatedAt: now,

      // Physical / Stock / Supplies
      brand: brand?.trim() || undefined,
      supplier: supplier?.trim() || undefined,
      stock: computedStock,
      minStock: isPhysicalOnly ? minStock : (minStock !== undefined && minStock > 0 ? minStock : undefined),
      variants: isPhysicalOnly ? variants : undefined,

      // Graphic & Personalized settings (M², Pacotes, Faixas de Preço, Acabamentos, Prazos)
      pricingModel: isGraphicOrPersonalized ? pricingModel : undefined,
      productionType: isGraphicOrPersonalized ? productionType : undefined,
      leadTime: isGraphicOrPersonalized ? leadTime : undefined,
      requiresFile: isGraphicOrPersonalized ? requiresFile : undefined,
      options: isGraphicOrPersonalized ? options : undefined,
      priceRules: isGraphicOrPersonalized && pricingModel === 'POR_UNIDADE' ? priceRules : undefined,
      packages: isGraphicOrPersonalized && pricingModel === 'POR_PACOTE' ? packages : undefined,
      areaPricing: isGraphicOrPersonalized && pricingModel === 'POR_M2' ? areaPricing : undefined,

      // Service
      estimatedTime: type === 'SERVICO' ? estimatedTime : undefined,
      serviceFields: type === 'SERVICO' ? serviceFields : undefined,
      serviceUrl: type === 'SERVICO' ? (serviceUrl.trim() || undefined) : undefined,
      url: type === 'SERVICO' ? (serviceUrl.trim() || undefined) : undefined,
    };

    setIsSaving(true);
    setErrorMsg('');

    try {
      const saved = await StorageService.saveItem(itemData);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar produto no servidor:', err);
      setErrorMsg(
        err.message ||
          'Falha ao gravar o produto no banco de dados do servidor. Verifique a conexão e tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      id="item-form-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? (isDuplication ? 'Revisar Item Duplicado' : 'Editar Item') : 'Novo Item Comercial'}
      subtitle="Cadastro unificado de produtos gráficos, produtos físicos e serviços digitais"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {isDuplication && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-800 text-xs font-semibold">
            <Copy className="w-5 h-5 text-blue-600 shrink-0" />
            <span>
              Item duplicado com sucesso! Um novo SKU foi gerado automaticamente. Revise os dados e faça as alterações desejadas antes de salvar.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'geral'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Dados Gerais e Preço
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('especifico')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'especifico'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Configurações de {
              isGraphicOrPersonalized
                ? (selectedSeparation?.name || 'Gráfica / Personalizados')
                : type === 'SERVICO'
                ? 'Serviço'
                : (selectedSeparation?.name || 'Estoque / Físico')
            }
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalogo')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'catalogo'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Vitrine / Catálogo Digital
          </button>
        </div>

        {/* TAB 1: DADOS GERAIS */}
        {activeTab === 'geral' && (
          <div className="space-y-4">
            {/* Item Type / Separation Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Tipo / Separação do Item *
                </label>
                <button
                  type="button"
                  onClick={() => setIsSeparationsModalOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Separação</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {productSeparations.map((sep) => {
                  const IconComp = getSeparationIcon(sep.icon);
                  const isSelected = type === sep.id;
                  return (
                    <div
                      key={sep.id}
                      onClick={() => handleTypeChange(sep.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold text-xs ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {sep.name}
                        </span>
                        <IconComp className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {sep.description || (
                          sep.id === 'PRODUTO_GRAFICO'
                            ? 'Banners, cartões, panfletos. Gera ordem de produção.'
                            : sep.id === 'PRODUTO_FISICO'
                            ? 'Fones, cabos, tintas. Controla saldo de estoque.'
                            : sep.id === 'SERVICO'
                            ? '2ª via de contas, digitação, contratos, cópias.'
                            : 'Produtos desta categoria com controle comercial completo.'
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cartão de Visita 4x0 (Couchê 300g)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">SKU (Identificador Único) *</label>
                  <button
                    type="button"
                    onClick={handleRegenerateSku}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Gerar Próximo
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono uppercase font-bold text-blue-700 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de Barras (EAN / Opcional)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="7891234567890"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Foto / Imagem do Produto</span>
                  </label>
                  <span className="text-[11px] font-normal text-slate-500">
                    Upload do dispositivo ou Google Drive
                  </span>
                </div>

                {/* Input de arquivo oculto para upload */}
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {/* Seletor de modo de inserção: [ Upload ] [ Google Drive ] */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200 mb-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setImageTab('upload');
                      setImageError('');
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      imageTab === 'upload'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImageTab('drive');
                      setImageError('');
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      imageTab === 'drive'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google Drive</span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                      0 MB local
                    </span>
                  </button>
                </div>

                {/* Indicador de carregamento ou upload */}
                {isUploadingImage || isResolvingDriveQuickLink ? (
                  <div className="flex items-center justify-center gap-3.5 p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-blue-800">
                        {isResolvingDriveQuickLink
                          ? 'Validando e vinculando foto do Google Drive...'
                          : 'Otimizando e enviando foto do produto...'}
                      </p>
                      <p className="text-[11px] text-blue-600 mt-0.5">
                        {isResolvingDriveQuickLink
                          ? 'Zero storage: vinculando diretamente sem duplicar para o servidor.'
                          : 'Comprimindo para carregamento instantâneo em celulares e catálogo.'}
                      </p>
                    </div>
                  </div>
                ) : imageUrl ? (
                  /* Card de Imagem Cadastrada */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white shadow-xs">
                        <img
                          src={imageUrl}
                          alt={name || 'Prévia do produto'}
                          className="w-full h-full object-cover"
                          onError={() => setDriveImageAvailable(false)}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-800">
                            Foto vinculada ao produto
                          </p>
                          {imageSource === 'google_drive' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <HardDrive className="w-3 h-3 text-blue-600" />
                              Google Drive (Zero Storage Local)
                            </span>
                          ) : imageSource === 'url' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              <Globe className="w-3 h-3 text-sky-600" />
                              URL da Web
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Upload className="w-3 h-3 text-emerald-600" />
                              Upload de arquivo
                            </span>
                          )}
                        </div>

                        {imageSource === 'google_drive' ? (
                          <div className="mt-1 space-y-0.5">
                            {googleDriveFileName && (
                              <p className="text-[11px] text-slate-700 font-medium truncate flex items-center gap-1">
                                <span className="text-slate-400">Arquivo:</span>
                                <span className="font-semibold text-slate-800 truncate max-w-[260px]" title={googleDriveFileName}>
                                  {googleDriveFileName}
                                </span>
                              </p>
                            )}
                            {googleDriveAccount && (
                              <p className="text-[10px] text-slate-400 truncate">
                                Conta: {googleDriveAccount}
                              </p>
                            )}
                            <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Armazenamento exclusivo no Drive. Zero bytes no storage do servidor.</span>
                            </p>
                            {driveImageAvailable === false && (
                              <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5 text-[11px] text-amber-800">
                                <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>A foto parece estar inacessível no Google Drive. Verifique as permissões de compartilhamento.</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {imageOriginalUrl && (
                              <p className="text-[11px] text-slate-500 mt-1 truncate flex items-center gap-1">
                                <span className="font-semibold text-slate-600 shrink-0">Link original:</span>
                                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[280px]" title={imageOriginalUrl}>
                                  {imageOriginalUrl}
                                </span>
                              </p>
                            )}
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Salva no armazenamento seguro do sistema. Exibida no catálogo, PDV e pedidos.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                      {imageSource === 'google_drive' ? (
                        <button
                          type="button"
                          onClick={() => setIsDrivePickerOpen(true)}
                          className="px-2.5 py-1.5 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Trocar imagem por outra do Google Drive"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                          <span>Trocar no Drive</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Substituir foto fazendo upload de outro arquivo"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Upload</span>
                      </button>

                      {imageSource !== 'google_drive' && (
                        <button
                          type="button"
                          onClick={() => setIsDrivePickerOpen(true)}
                          className="px-2.5 py-1.5 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Usar foto do Google Drive (Zero storage)"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                          <span>Google Drive</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remover imagem do produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ) : imageTab === 'drive' ? (
                  /* Painel Google Drive (Zero Armazenamento Local) */
                  <div className="p-4 bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-200 rounded-xl space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">
                              Vincular Imagem do Google Drive
                            </h4>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                              Zero Armazenamento
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 max-w-md leading-relaxed">
                            A foto permanece 100% no Google Drive. O sistema apenas armazena a referência para carregá-la, <strong>reduzindo o consumo de espaço no servidor a zero</strong>.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDrivePickerOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer shrink-0"
                      >
                        <HardDrive className="w-4 h-4" />
                        <span>Selecionar no Drive</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-blue-100/80">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ou cole o link compartilhado ou ID do arquivo:
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={driveQuickLink}
                            onChange={(e) => setDriveQuickLink(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleResolveDriveQuickLink();
                              }
                            }}
                            placeholder="https://drive.google.com/file/d/1A2B3C.../view ou ID do arquivo"
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isResolvingDriveQuickLink || !driveQuickLink.trim()}
                          onClick={handleResolveDriveQuickLink}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          {isResolvingDriveQuickLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Vincular Link</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Dropzone tradicional de upload de arquivos */
                  <div
                    onClick={() => imageFileInputRef.current?.click()}
                    onDragOver={handleImageDragOver}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDrop}
                    className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      isDraggingImage
                        ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 text-center">
                      Clique para selecionar ou arraste o arquivo da imagem
                    </p>
                    <p className="text-[11px] text-slate-400 text-center mt-0.5">
                      Formatos aceitos: JPG, PNG, WEBP (fotos de câmeras e celulares são otimizadas e sincronizadas)
                    </p>
                  </div>
                )}

                {imageError && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{imageError}</span>
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição Completa
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes técnicos, acabamentos inclusos e especificações do item..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Base Financial & Automatic Margin Calculation */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Precificação Base e Cálculo Automático de Margem
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Aplicável para todos os tipos de itens
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Preço de Custo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    Lucro Bruto (R$)
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {formatCurrency(marginReais)}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    Margem de Lucro (%)
                  </span>
                  <span
                    className={`text-sm font-extrabold ${
                      marginPercent >= 50
                        ? 'text-emerald-600'
                        : marginPercent >= 25
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {formatPercent(marginPercent)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURAÇÕES ESPECÍFICAS CONFORME O TIPO */}
        {activeTab === 'especifico' && (
          <div className="space-y-5">
            {/* IF PRODUTO_GRAFICO OU PERSONALIZADOS (M², PACOTES, FAIXAS, ACABAMENTOS) */}
            {isGraphicOrPersonalized && (
              <div className="space-y-5">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">
                        Configurações Avançadas: {selectedSeparation?.name || 'Gráficos e Personalizados'}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Configure cobrança por M², Pacotes fechados, Preço progressivo por faixas, acabamentos adicionais e ordens de produção.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Production Model & Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Produção *
                    </label>
                    <select
                      value={productionType}
                      onChange={(e) => setProductionType(e.target.value as ProductionType)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="PRODUCAO_PROPRIA">Produção Própria (Interna)</option>
                      <option value="PRODUCAO_TERCEIRIZADA">Produção Terceirizada (Parceiro)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prazo Estimado de Produção
                    </label>
                    <input
                      type="text"
                      value={leadTime}
                      onChange={(e) => setLeadTime(e.target.value)}
                      placeholder="Ex: 2 a 3 dias úteis"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Modelo de Precificação *
                    </label>
                    <select
                      value={pricingModel}
                      onChange={(e) => setPricingModel(e.target.value as GraphicPricingModel)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold text-blue-700"
                    >
                      <option value="POR_UNIDADE">Por Unidade (Faixas de Quantidade)</option>
                      <option value="POR_PACOTE">Por Pacote Fechado (100, 250, 500 un)</option>
                      <option value="POR_M2">Por Metro Quadrado (m² - Banner / Adesivo)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-req-file"
                    checked={requiresFile}
                    onChange={(e) => setRequiresFile(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="chk-req-file" className="text-xs font-semibold text-slate-700">
                    Exige anexo de arquivo de arte para envio à produção
                  </label>
                </div>

                {/* Sub-section: POR_UNIDADE (Price Tiers) */}
                {pricingModel === 'POR_UNIDADE' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800">
                        Tabela de Preços por Faixa de Quantidade
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          setPriceRules([
                            ...priceRules,
                            {
                              id: `pr-${Date.now()}`,
                              minQuantity: 100,
                              maxQuantity: 500,
                              unitCost: 0.05,
                              unitSalePrice: 0.1,
                            },
                          ])
                        }
                        className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Faixa
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="py-1.5 px-2">Qtd Mínima</th>
                            <th className="py-1.5 px-2">Qtd Máxima</th>
                            <th className="py-1.5 px-2">Custo Unit. (R$)</th>
                            <th className="py-1.5 px-2">Venda Unit. (R$)</th>
                            <th className="py-1.5 px-2">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {priceRules.map((rule, rIdx) => (
                            <tr key={rule.id}>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  value={rule.minQuantity}
                                  onChange={(e) => {
                                    const updated = [...priceRules];
                                    updated[rIdx].minQuantity = parseInt(e.target.value) || 0;
                                    setPriceRules(updated);
                                  }}
                                  className="w-24 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  placeholder="Ilimitado"
                                  value={rule.maxQuantity || ''}
                                  onChange={(e) => {
                                    const updated = [...priceRules];
                                    updated[rIdx].maxQuantity = e.target.value ? parseInt(e.target.value) : undefined;
                                    setPriceRules(updated);
                                  }}
                                  className="w-24 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={rule.unitCost}
                                  onChange={(e) => {
                                    const updated = [...priceRules];
                                    updated[rIdx].unitCost = parseFloat(e.target.value) || 0;
                                    setPriceRules(updated);
                                  }}
                                  className="w-24 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={rule.unitSalePrice}
                                  onChange={(e) => {
                                    const updated = [...priceRules];
                                    updated[rIdx].unitSalePrice = parseFloat(e.target.value) || 0;
                                    setPriceRules(updated);
                                  }}
                                  className="w-24 px-2 py-1 border rounded font-bold text-blue-700"
                                />
                              </td>
                              <td className="p-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPriceRules(priceRules.filter((_, i) => i !== rIdx))}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-section: POR_PACOTE */}
                {pricingModel === 'POR_PACOTE' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800">
                        Opções de Pacotes Fechados
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          setPackages([
                            ...packages,
                            {
                              id: `pkg-${Date.now()}`,
                              name: 'Novo Pacote',
                              quantity: 100,
                              costPrice: 20,
                              salePrice: 45,
                            },
                          ])
                        }
                        className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Pacote
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="py-1.5 px-2">Nome do Pacote</th>
                            <th className="py-1.5 px-2">Qtd Unidades</th>
                            <th className="py-1.5 px-2">Custo (R$)</th>
                            <th className="py-1.5 px-2">Preço de Venda (R$)</th>
                            <th className="py-1.5 px-2">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {packages.map((pkg, pIdx) => (
                            <tr key={pkg.id}>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={pkg.name}
                                  onChange={(e) => {
                                    const updated = [...packages];
                                    updated[pIdx].name = e.target.value;
                                    setPackages(updated);
                                  }}
                                  className="w-36 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  value={pkg.quantity}
                                  onChange={(e) => {
                                    const updated = [...packages];
                                    updated[pIdx].quantity = parseInt(e.target.value) || 0;
                                    setPackages(updated);
                                  }}
                                  className="w-20 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={pkg.costPrice}
                                  onChange={(e) => {
                                    const updated = [...packages];
                                    updated[pIdx].costPrice = parseFloat(e.target.value) || 0;
                                    setPackages(updated);
                                  }}
                                  className="w-20 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={pkg.salePrice}
                                  onChange={(e) => {
                                    const updated = [...packages];
                                    updated[pIdx].salePrice = parseFloat(e.target.value) || 0;
                                    setPackages(updated);
                                  }}
                                  className="w-20 px-2 py-1 border rounded font-bold text-blue-700"
                                />
                              </td>
                              <td className="p-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPackages(packages.filter((_, i) => i !== pIdx))}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-section: POR_M2 */}
                {pricingModel === 'POR_M2' && (
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Precificação por Metro Quadrado (m²)
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        O sistema adota <strong>Cobrança Proporcional</strong> à área REAL (largura × altura × preço/m²). O <strong>Mínimo Técnico</strong> serve exclusivamente para validação e bloqueio de produção (não altera a fórmula de cobrança).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Custo por m² (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={areaPricing.costPerM2}
                          onChange={(e) =>
                            setAreaPricing({
                              ...areaPricing,
                              costPerM2: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Preço de Venda por m² (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={areaPricing.salePricePerM2}
                          onChange={(e) =>
                            setAreaPricing({
                              ...areaPricing,
                              salePricePerM2: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Mínimo Técnico (m²) *
                          </label>
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1 rounded">
                            Bloqueio
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.0001"
                          value={areaPricing.technicalMinArea ?? areaPricing.minAreaM2 ?? 0.01}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.01;
                            setAreaPricing({
                              ...areaPricing,
                              technicalMinArea: val,
                              minAreaM2: val,
                            });
                          }}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          Menor medida viável para confecção
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Preço Mínimo Venda (R$)
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Opcional
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          placeholder="Ex: 10.00"
                          value={areaPricing.minSalePrice ?? ''}
                          onChange={(e) =>
                            setAreaPricing({
                              ...areaPricing,
                              minSalePrice: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          Piso financeiro por peça
                        </span>
                      </div>
                    </div>

                    {/* Live Simulation Preview */}
                    <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-900">
                        Simulação de Cobrança Proporcional (Exemplos Práticos)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="block text-[10px] text-slate-500 font-semibold">10 × 10 cm (0,01 m²)</span>
                          <span className="font-extrabold text-slate-800">
                            R$ {(0.01 * (areaPricing.salePricePerM2 || 0)).toFixed(2)}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            Custo: R$ {(0.01 * (areaPricing.costPerM2 || 0)).toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="block text-[10px] text-slate-500 font-semibold">50 × 80 cm (0,40 m²)</span>
                          <span className="font-extrabold text-slate-800">
                            R$ {(0.4 * (areaPricing.salePricePerM2 || 0)).toFixed(2)}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            Custo: R$ {(0.4 * (areaPricing.costPerM2 || 0)).toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="block text-[10px] text-slate-500 font-semibold">100 × 100 cm (1,00 m²)</span>
                          <span className="font-extrabold text-slate-800">
                            R$ {(1.0 * (areaPricing.salePricePerM2 || 0)).toFixed(2)}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            Custo: R$ {(1.0 * (areaPricing.costPerM2 || 0)).toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="block text-[10px] text-slate-500 font-semibold">200 × 100 cm (2,00 m²)</span>
                          <span className="font-extrabold text-slate-800">
                            R$ {(2.0 * (areaPricing.salePricePerM2 || 0)).toFixed(2)}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            Custo: R$ {(2.0 * (areaPricing.costPerM2 || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-section: Options & Finishes */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Opções e Acabamentos (Ex: Material, Bastão, Ilhós, Laminação)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Permite ao vendedor e ao cliente escolher variações com ou sem acréscimo de valor
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOptionGroup}
                      className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo Grupo de Opções
                    </button>
                  </div>

                  {options.map((opt, oIdx) => (
                    <div key={opt.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={opt.name}
                          onChange={(e) => {
                            const updated = [...options];
                            updated[oIdx].name = e.target.value;
                            setOptions(updated);
                          }}
                          placeholder="Nome do Grupo (ex: Acabamento)"
                          className="text-xs font-bold text-slate-800 px-2 py-1 border rounded w-48"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionGroup(oIdx)}
                          className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover Grupo
                        </button>
                      </div>

                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                        {opt.values.map((val, vIdx) => (
                          <div key={val.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="text"
                              value={val.label}
                              onChange={(e) => {
                                const updated = [...options];
                                updated[oIdx].values[vIdx].label = e.target.value;
                                setOptions(updated);
                              }}
                              placeholder="Rótulo da Opção"
                              className="px-2 py-1 border rounded flex-1"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500">+ Custo:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={val.additionalCost || 0}
                                onChange={(e) => {
                                  const updated = [...options];
                                  updated[oIdx].values[vIdx].additionalCost = parseFloat(e.target.value) || 0;
                                  setOptions(updated);
                                }}
                                className="w-16 px-1.5 py-1 border rounded"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500">+ Venda:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={val.additionalPrice || 0}
                                onChange={(e) => {
                                  const updated = [...options];
                                  updated[oIdx].values[vIdx].additionalPrice = parseFloat(e.target.value) || 0;
                                  setOptions(updated);
                                }}
                                className="w-16 px-1.5 py-1 border rounded font-semibold text-blue-700"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionValue(oIdx, vIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOptionValue(oIdx)}
                          className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 hover:underline pt-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Valor a este Grupo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional Supplies & Base Stock for Personalized/Graphic Items */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-600" />
                    <span>Insumo, Fornecedor e Saldo Base (Opcional)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Marca / Fabricante
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Ex: Live, Mecolour, Sulpen"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Fornecedor Padrão
                      </label>
                      <input
                        type="text"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="Ex: Distribuidor Brasil"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Estoque Base (unidades cruas)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* IF PRODUTO_FISICO TRADICIONAL (NÃO GRÁFICO / NÃO PERSONALIZADO) */}
            {!isGraphicOrPersonalized && type !== 'SERVICO' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Marca / Fabricante
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ex: MasterPrint, JBL, PowerLink"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fornecedor Padrão
                    </label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Ex: Distribuidora Central"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estoque Atual (Unidades) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={variants.length > 0}
                      value={variants.length > 0 ? variants.reduce((acc, v) => acc + (v.stock || 0), 0) : stock}
                      onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-bold disabled:bg-slate-100"
                    />
                    {variants.length > 0 && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Calculado automaticamente pela soma das variantes abaixo.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estoque Mínimo (Alerta de Reposição) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minStock}
                      onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-bold text-rose-700"
                    />
                  </div>
                </div>

                {/* Variants (Ex: Cores / Tamanhos) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Variantes do Produto (Ex: Cores, Voltagem, Tamanho)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Cada variante pode ter SKU, custo, preço e estoque próprios.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Variante
                    </button>
                  </div>

                  {variants.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="py-1.5 px-2">Nome da Variante</th>
                            <th className="py-1.5 px-2">SKU</th>
                            <th className="py-1.5 px-2">Custo (R$)</th>
                            <th className="py-1.5 px-2">Venda (R$)</th>
                            <th className="py-1.5 px-2">Estoque</th>
                            <th className="py-1.5 px-2">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {variants.map((v, vIdx) => (
                            <tr key={v.id}>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={v.name}
                                  onChange={(e) => {
                                    const updated = [...variants];
                                    updated[vIdx].name = e.target.value;
                                    setVariants(updated);
                                  }}
                                  placeholder="Ex: Cor Preto"
                                  className="w-32 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={v.sku}
                                  onChange={(e) => {
                                    const updated = [...variants];
                                    updated[vIdx].sku = e.target.value;
                                    setVariants(updated);
                                  }}
                                  className="w-28 px-2 py-1 border rounded font-mono uppercase"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={v.costPrice}
                                  onChange={(e) => {
                                    const updated = [...variants];
                                    updated[vIdx].costPrice = parseFloat(e.target.value) || 0;
                                    setVariants(updated);
                                  }}
                                  className="w-20 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={v.salePrice}
                                  onChange={(e) => {
                                    const updated = [...variants];
                                    updated[vIdx].salePrice = parseFloat(e.target.value) || 0;
                                    setVariants(updated);
                                  }}
                                  className="w-20 px-2 py-1 border rounded font-bold text-blue-700"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => {
                                    const updated = [...variants];
                                    updated[vIdx].stock = parseInt(e.target.value) || 0;
                                    setVariants(updated);
                                  }}
                                  className="w-16 px-2 py-1 border rounded font-bold"
                                />
                              </td>
                              <td className="p-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(vIdx)}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Nenhuma variante criada (produto de modelo único).
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* IF SERVICO */}
            {type === 'SERVICO' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tempo Estimado de Execução
                  </label>
                  <input
                    type="text"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="Ex: 10 minutos, 24 horas"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL do Serviço
                  </label>
                  <input
                    type="text"
                    value={serviceUrl}
                    onChange={(e) => setServiceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Link do portal ou página oficial que será aberto pelo botão &quot;Abrir serviço&quot; no PDV.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Campos Adicionais no PDV (Ex: Titular, CPF, Matrícula, Tipo de Contrato)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Estes campos serão solicitados ao vendedor no momento de adicionar o serviço ao carrinho
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddServiceField}
                      className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Campo
                    </button>
                  </div>

                  <div className="space-y-2">
                    {serviceFields.map((field, fIdx) => (
                      <div key={field.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const updated = [...serviceFields];
                            updated[fIdx].label = e.target.value;
                            setServiceFields(updated);
                          }}
                          placeholder="Rótulo do Campo (ex: CPF do Titular)"
                          className="px-2 py-1 text-xs border rounded flex-1"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const updated = [...serviceFields];
                            updated[fIdx].type = e.target.value as any;
                            setServiceFields(updated);
                          }}
                          className="px-2 py-1 text-xs border rounded bg-white"
                        >
                          <option value="text">Texto</option>
                          <option value="number">Número</option>
                          <option value="date">Data</option>
                          <option value="select">Lista de Opções</option>
                        </select>
                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const updated = [...serviceFields];
                              updated[fIdx].required = e.target.checked;
                              setServiceFields(updated);
                            }}
                            className="w-3.5 h-3.5 text-blue-600"
                          />
                          Obrigatório
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceField(fIdx)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VITRINE & CATÁLOGO */}
        {activeTab === 'catalogo' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-900">
                Visibilidade na Vitrine Digital Pública
              </h4>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Itens com publicação habilitada aparecerão automaticamente no Catálogo Público com fotos, especificações, preços e botão para contato direto via WhatsApp.
              </p>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInCatalog}
                    onChange={(e) => setShowInCatalog(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Publicar este item no Catálogo Digital Público
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featuredInCatalog}
                    onChange={(e) => setFeaturedInCatalog(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Destacar este item no topo da vitrine pública
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Item Ativo para Venda no PDV
                  </span>
                </label>
              </div>
            </div>

            {imageUrl ? (
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={imageUrl}
                    alt={name || 'Prévia'}
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">Prévia da Imagem do Item</p>
                    <p className="text-[11px] text-slate-500">
                      Certifique-se de usar imagens nítidas com boa iluminação para o catálogo.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Substituir</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
                    title="Remover Imagem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Nenhuma imagem cadastrada</p>
                    <p className="text-[11px] text-slate-500">
                      Adicione uma foto por upload do computador/celular ou pelo Google Drive.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    className="text-xs font-semibold text-blue-600 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('geral');
                      setImageTab('drive');
                    }}
                    className="text-xs font-semibold text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Google Drive</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              id="btn-save-item-submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-lg shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Gravando no servidor...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Item</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Google Drive Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelectFile={handleSelectDriveFile}
      />

      {/* Product Separations Manager Modal */}
      <ProductSeparationManagerModal
        isOpen={isSeparationsModalOpen}
        onClose={() => setIsSeparationsModalOpen(false)}
        onSeparationCreatedOrUpdated={(newSep) => {
          handleTypeChange(newSep.id);
        }}
      />
    </Modal>
  );
};
