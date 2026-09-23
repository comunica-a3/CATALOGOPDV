import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  Coins,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  FolderTree,
  HelpCircle,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Megaphone,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  X,
  Image as ImageIcon,
  HardDrive,
  Link as LinkIcon,
  Globe,
  Github,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StorageService } from '../../services/storage';
import { Category, CompanySettings, User, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { compressImage } from '../../utils/imageCompressor';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';
import { BrandLogo } from '../common/BrandLogo';
import { NicheManagementPanel } from '../catalog/NicheManagementPanel';
import { GoogleDrivePickerModal } from '../items/GoogleDrivePickerModal';
import { PublishCatalogModal } from '../catalog/PublishCatalogModal';
import {
  extractGoogleDriveFileId,
  getGoogleDriveDisplayUrl,
  getGoogleDriveFileMetadata,
} from '../../services/googleDriveService';

interface SettingsViewProps {
  companySettings: CompanySettings;
  categories: Category[];
  onSettingsSaved: () => void;
  initialTab?: SettingsTab;
}

export type SettingsTab = 'empresa' | 'usuarios' | 'admin' | 'categorias' | 'comissoes' | 'nichos';

export const SettingsView: React.FC<SettingsViewProps> = ({
  companySettings,
  categories,
  onSettingsSaved,
  initialTab,
}) => {
  const {
    currentUser,
    users,
    sellers,
    collaborators,
    admins,
    isAdmin,
    updateAdminName,
    addUser,
    updateUser,
    deleteUser,
    adminResetPassword,
    refreshUsers,
  } = useAuth();

  const promoters = useMemo(() => users.filter((u) => u.role === 'PROMOTOR'), [users]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'usuarios');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Commission Rates Form State
  const initialCommissionRates = StorageService.getCommissionRates();
  const [graphicCommissionRate, setGraphicCommissionRate] = useState<string>(
    String(companySettings.commissionRates?.PRODUTO_GRAFICO ?? initialCommissionRates.PRODUTO_GRAFICO ?? 10)
  );
  const [physicalCommissionRate, setPhysicalCommissionRate] = useState<string>(
    String(companySettings.commissionRates?.PRODUTO_FISICO ?? initialCommissionRates.PRODUTO_FISICO ?? 5)
  );
  const [serviceCommissionRate, setServiceCommissionRate] = useState<string>(
    String(companySettings.commissionRates?.SERVICO ?? initialCommissionRates.SERVICO ?? 15)
  );
  const [promoterCommissionPercent, setPromoterCommissionPercent] = useState<string>(
    String(companySettings.promoterCommissionPercent ?? StorageService.getPromoterCommissionPercent() ?? 20)
  );
  const [commissionError, setCommissionError] = useState('');
  const [isSavingCommissions, setIsSavingCommissions] = useState(false);

  // Multi-Item Commission Simulator State
  const [simGraphicValue, setSimGraphicValue] = useState<number>(1000);
  const [simPhysicalValue, setSimPhysicalValue] = useState<number>(500);
  const [simServiceValue, setSimServiceValue] = useState<number>(800);

  // Company Form State
  const [name, setName] = useState(companySettings.name);
  const [document, setDocument] = useState(companySettings.document || '');
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email || '');
  const [address, setAddress] = useState(companySettings.address);
  const [city, setCity] = useState(companySettings.city);
  const [state, setState] = useState(companySettings.state);
  const [catalogSubtitle, setCatalogSubtitle] = useState(
    companySettings.catalogSubtitle || 'Sua rotina, mais simples.'
  );
  const [logoUrl, setLogoUrl] = useState(companySettings.logoUrl || '');
  const [logoDriveFileId, setLogoDriveFileId] = useState(companySettings.logoDriveFileId || '');
  const [logoDriveFileName, setLogoDriveFileName] = useState(companySettings.logoDriveFileName || '');
  const [catalogHeaderType, setCatalogHeaderType] = useState<'NAME' | 'LOGO'>(
    companySettings.catalogHeaderType || (companySettings.logoUrl || companySettings.logoDriveFileId ? 'LOGO' : 'NAME')
  );
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [isResolvingDriveLink, setIsResolvingDriveLink] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [receiptFooter, setReceiptFooter] = useState(
    companySettings.receiptFooterMessage || ''
  );
  const [defaultSupplierFreight, setDefaultSupplierFreight] = useState<number>(
    companySettings.defaultSupplierFreight ?? 20.0
  );
  const [isPublishCatalogModalOpen, setIsPublishCatalogModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    companySettings.paymentMethods
  );
  const [newMethodName, setNewMethodName] = useState('');

  // Admin Data Form State
  const adminUser = users.find((u) => u.role === 'ADMINISTRADOR') || currentUser;
  const [adminName, setAdminName] = useState(adminUser.name);
  const [adminFormError, setAdminFormError] = useState('');

  // Admin Password Change State
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const { changePassword } = useAuth();

  // User Manager State (All hierarchy levels)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userNameInput, setUserNameInput] = useState('');
  const [userEmailInput, setUserEmailInput] = useState('');
  const [userPhoneInput, setUserPhoneInput] = useState('');
  const [userRoleInput, setUserRoleInput] = useState<UserRole>('VENDEDOR');
  const [userPasswordInput, setUserPasswordInput] = useState('1234');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userIsTestUserInput, setUserIsTestUserInput] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPwd, setUserToResetPwd] = useState<User | null>(null);
  const [newUserPwd, setNewUserPwd] = useState('');
  const [showNewUserPwd, setShowNewUserPwd] = useState(false);
  const [resetPwdError, setResetPwdError] = useState('');

  // Category Manager State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('Tag');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryErrorMsg, setCategoryErrorMsg] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryTransferOption, setCategoryTransferOption] = useState<'NONE' | 'TRANSFER'>('NONE');
  const [categoryTransferTargetId, setCategoryTransferTargetId] = useState<string>('');

  // Reset Confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // --- ADMIN HANDLERS ---
  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = adminName.trim();
    if (!trimmed) {
      setAdminFormError('O nome do administrador não pode ficar em branco.');
      return;
    }
    setAdminFormError('');
    updateAdminName(trimmed);
    onSettingsSaved();
    showToast('Nome do administrador atualizado com sucesso!');
  };

  const handleCancelAdmin = () => {
    setAdminName(adminUser.name);
    setAdminFormError('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCurr = currentPwd.trim();
    const trimmedNew = newPwd.trim();
    const trimmedConfirm = confirmPwd.trim();

    if (!trimmedCurr) {
      setPwdError('Por favor, informe a senha atual.');
      return;
    }
    if (!trimmedNew || trimmedNew.length < 4) {
      setPwdError('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setPwdError('A confirmação de senha não confere com a nova senha.');
      return;
    }

    setPwdError('');
    setIsChangingPwd(true);

    try {
      const res = await changePassword(trimmedCurr, trimmedNew);
      if (res.success) {
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        showToast('Senha do administrador alterada com sucesso!');
      } else {
        setPwdError(res.error || 'Erro ao alterar senha.');
      }
    } catch (err: any) {
      setPwdError(err.message || 'Erro ao alterar senha.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  // --- USER HANDLERS (ADMINISTRADOR, COLABORADOR, VENDEDOR) ---
  const handleOpenAddUser = (defaultRole: UserRole = 'VENDEDOR') => {
    setEditingUser(null);
    setUserNameInput('');
    setUserEmailInput('');
    setUserPhoneInput('');
    setUserRoleInput(defaultRole);
    setUserPasswordInput('1234');
    setShowUserPassword(false);
    setUserIsTestUserInput(false);
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserNameInput(user.name);
    setUserEmailInput(user.email || '');
    setUserPhoneInput(user.phone || '');
    setUserRoleInput(user.role === 'VENDEDOR_EXTERNO' ? 'VENDEDOR' : user.role);
    setUserPasswordInput('');
    setShowUserPassword(false);
    setUserIsTestUserInput(Boolean(user.isTestUser));
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userNameInput.trim();
    if (!trimmed) {
      setUserFormError('O nome do usuário é obrigatório.');
      return;
    }

    if (userPasswordInput && userPasswordInput.trim().length < 4) {
      setUserFormError('A senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    try {
      if (editingUser) {
        // Prevent demoting the only active administrator
        if (editingUser.role === 'ADMINISTRADOR' && userRoleInput !== 'ADMINISTRADOR') {
          const totalAdmins = users.filter((u) => u.role === 'ADMINISTRADOR').length;
          if (totalAdmins <= 1) {
            setUserFormError('Não é possível alterar a função do único Administrador do sistema. Cadastre outro Administrador antes de rebaixar este.');
            return;
          }
        }

        updateUser(
          editingUser.id,
          {
            name: trimmed,
            role: userRoleInput,
            email: userEmailInput.trim() || undefined,
            phone: userPhoneInput.trim() || undefined,
            isTestUser: userIsTestUserInput,
          },
          userPasswordInput.trim() ? userPasswordInput.trim() : undefined
        );
        showToast(`Usuário "${trimmed}" atualizado com sucesso para nível ${getRoleLabel(userRoleInput)}!`);
      } else {
        addUser(
          trimmed,
          userRoleInput,
          userPasswordInput.trim() || '1234',
          userEmailInput.trim() || undefined,
          userPhoneInput.trim() || undefined,
          undefined,
          userIsTestUserInput
        );
        showToast(`Usuário "${trimmed}" adicionado como ${getRoleLabel(userRoleInput)} com sucesso!`);
      }
      setIsUserModalOpen(false);
      onSettingsSaved();
    } catch (err: any) {
      setUserFormError(err.message || 'Erro ao salvar usuário.');
    }
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.role === 'ADMINISTRADOR') {
      const totalAdmins = users.filter((u) => u.role === 'ADMINISTRADOR').length;
      if (totalAdmins <= 1) {
        alert('Não é possível excluir o único Administrador ativo no sistema.');
        setUserToDelete(null);
        return;
      }
    }

    deleteUser(userToDelete.id);
    showToast(`Usuário "${userToDelete.name}" removido com sucesso.`);
    setUserToDelete(null);
    onSettingsSaved();
  };

  const handleResetUserPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPwd) return;
    const trimmed = newUserPwd.trim();
    if (!trimmed || trimmed.length < 4) {
      setResetPwdError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }
    setResetPwdError('');
    const res = await adminResetPassword(userToResetPwd.id, trimmed);
    if (res.success) {
      showToast(`Senha de "${userToResetPwd.name}" redefinida para "${trimmed}" com sucesso!`);
      setUserToResetPwd(null);
      setNewUserPwd('');
    } else {
      setResetPwdError(res.error || 'Erro ao redefinir senha.');
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'COLABORADOR':
        return 'Colaborador';
      case 'VENDEDOR':
      case 'VENDEDOR_EXTERNO':
        return 'Vendedor';
      case 'PROMOTOR':
        return 'Promotor';
      default:
        return role;
    }
  };

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === 'ALL') return true;
    if (userRoleFilter === 'VENDEDOR') {
      return u.role === 'VENDEDOR' || u.role === 'VENDEDOR_EXTERNO';
    }
    return u.role === userRoleFilter;
  });

  // --- COMPANY HANDLERS ---
  const handleSelectDriveLogo = (selected: {
    fileId: string;
    fileName: string;
    mimeType: string;
    sizeBytes?: number;
    thumbnailUrl: string;
    displayUrl: string;
    webViewLink?: string;
    accountEmail?: string;
  }) => {
    setLogoUrl(selected.displayUrl);
    setLogoDriveFileId(selected.fileId);
    setLogoDriveFileName(selected.fileName);
    setCatalogHeaderType('LOGO');
    setLogoError('');
    setIsDrivePickerOpen(false);
  };

  const handleResolveDriveLogoLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!driveLinkInput.trim()) return;

    setIsResolvingDriveLink(true);
    setLogoError('');
    try {
      const fileId = extractGoogleDriveFileId(driveLinkInput.trim());
      if (!fileId) {
        throw new Error('Link ou ID do Google Drive não reconhecido. Cole um link de compartilhamento ou ID válido.');
      }

      const meta = await getGoogleDriveFileMetadata(fileId);
      handleSelectDriveLogo({
        fileId: meta.id,
        fileName: meta.name,
        mimeType: meta.mimeType,
        sizeBytes: meta.size ? Number(meta.size) : undefined,
        thumbnailUrl: meta.thumbnailLink || getGoogleDriveDisplayUrl(fileId, 400),
        displayUrl: getGoogleDriveDisplayUrl(fileId, 1200),
        webViewLink: meta.webViewLink,
      });
      setDriveLinkInput('');
    } catch (err: any) {
      setLogoError(err.message || 'Não foi possível carregar a logo do Google Drive.');
    } finally {
      setIsResolvingDriveLink(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoDriveFileId('');
    setLogoDriveFileName('');
    setCatalogHeaderType('NAME');
    setLogoError('');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('O arquivo de imagem deve ter no máximo 5MB.');
      return;
    }

    setLogoError('');
    setIsUploadingLogo(true);
    try {
      const compressed = await compressImage(file, 800, 800, 0.9);
      setLogoUrl(compressed);
      setLogoDriveFileId('');
      setLogoDriveFileName(file.name);
      setCatalogHeaderType('LOGO');
      try {
        const uploadRes = await api.uploadImage(compressed, 'logo');
        if (uploadRes && uploadRes.url) {
          setLogoUrl(uploadRes.url);
        }
      } catch (uploadErr) {
        console.warn('Upload remoto de logo não completou, mantendo dataUrl comprimido:', uploadErr);
      }
    } catch (err: any) {
      setLogoError(err.message || 'Falha ao processar a logo.');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanySettings = {
      ...companySettings,
      name: name.trim(),
      document: document.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      logoUrl: logoUrl.trim() || undefined,
      logoDriveFileId: logoDriveFileId.trim() || undefined,
      logoDriveFileName: logoDriveFileName.trim() || undefined,
      catalogHeaderType,
      catalogSubtitle: catalogSubtitle.trim() || 'Sua rotina, mais simples.',
      receiptFooterMessage: receiptFooter.trim(),
      paymentMethods,
      defaultSupplierFreight: Number(defaultSupplierFreight) || 20.0,
    };

    StorageService.saveCompanySettings(updated);
    onSettingsSaved();
    showToast('Configurações da empresa salvas com sucesso!');
  };

  const handleAddPaymentMethod = () => {
    if (!newMethodName.trim()) return;
    if (paymentMethods.includes(newMethodName.trim())) {
      alert('Esta forma de pagamento já existe.');
      return;
    }
    setPaymentMethods([...paymentMethods, newMethodName.trim()]);
    setNewMethodName('');
  };

  const handleRemovePaymentMethod = (methodToRemove: string) => {
    setPaymentMethods(paymentMethods.filter((m) => m !== methodToRemove));
  };

  // --- CATEGORY HANDLERS ---
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDesc('');
    setCatIcon('Tag');
    setCategoryErrorMsg('');
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatIcon(cat.icon || 'Tag');
    setCategoryErrorMsg('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCategoryErrorMsg('O nome da categoria é obrigatório.');
      return;
    }

    const cat: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      name: catName.trim(),
      slug: editingCategory
        ? editingCategory.slug
        : catName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      description: catDesc.trim() || undefined,
      icon: catIcon.trim() || undefined,
    };

    setIsSavingCategory(true);
    setCategoryErrorMsg('');

    try {
      const saved = await StorageService.saveCategory(cat);
      onSettingsSaved();
      setIsCategoryModalOpen(false);
      showToast(
        editingCategory
          ? `Categoria "${saved.name}" atualizada com sucesso no servidor!`
          : `Categoria "${saved.name}" cadastrada com sucesso no servidor!`
      );
    } catch (err: any) {
      console.error('Erro ao salvar categoria no servidor:', err);
      setCategoryErrorMsg(
        err.message || 'Erro ao gravar categoria no banco de dados do servidor.'
      );
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleOpenDeleteCategory = (cat: Category) => {
    setCategoryToDelete(cat);
    setCategoryTransferOption('NONE');
    const otherCats = categories.filter((c) => c.id !== cat.id);
    setCategoryTransferTargetId(otherCats.length > 0 ? otherCats[0].id : '');
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const targetTransferId = categoryTransferOption === 'TRANSFER' ? categoryTransferTargetId : undefined;
    try {
      await StorageService.deleteCategory(categoryToDelete.id, targetTransferId);
      showToast(`Categoria "${categoryToDelete.name}" excluída com sucesso do servidor!`);
      setCategoryToDelete(null);
      onSettingsSaved();
    } catch (err: any) {
      console.error('Erro ao excluir categoria:', err);
      showToast(err.message || 'Erro ao excluir categoria no servidor.');
    }
  };

  // --- COMMISSION RATES HANDLERS & SIMULATOR ---
  const simRates = useMemo(() => {
    const pg = Math.max(0, Math.min(100, parseFloat(graphicCommissionRate) || 0));
    const pf = Math.max(0, Math.min(100, parseFloat(physicalCommissionRate) || 0));
    const ps = Math.max(0, Math.min(100, parseFloat(serviceCommissionRate) || 0));
    const promRate = Math.max(0, Math.min(100, parseFloat(promoterCommissionPercent) || 0));

    const gVal = Math.max(0, Number(simGraphicValue) || 0);
    const fVal = Math.max(0, Number(simPhysicalValue) || 0);
    const sVal = Math.max(0, Number(simServiceValue) || 0);

    const commGraphic = Number(((gVal * pg) / 100).toFixed(2));
    const commPhysical = Number(((fVal * pf) / 100).toFixed(2));
    const commService = Number(((sVal * ps) / 100).toFixed(2));

    const totalSale = Number((gVal + fVal + sVal).toFixed(2));
    const totalCommission = Number((commGraphic + commPhysical + commService).toFixed(2));
    
    // Promotor split logic: Promoter gets X% of the commission, deducted from Seller
    const promoterShare = Number(((totalCommission * promRate) / 100).toFixed(2));
    const netSellerShare = Number(Math.max(0, totalCommission - promoterShare).toFixed(2));
    const companyShare = Number(Math.max(0, totalSale - totalCommission).toFixed(2));
    const avgRate = totalSale > 0 ? Number(((totalCommission / totalSale) * 100).toFixed(2)) : 0;

    return {
      pg,
      pf,
      ps,
      promRate,
      gVal,
      fVal,
      sVal,
      commGraphic,
      commPhysical,
      commService,
      totalSale,
      totalCommission,
      promoterShare,
      netSellerShare,
      companyShare,
      avgRate,
    };
  }, [
    graphicCommissionRate,
    physicalCommissionRate,
    serviceCommissionRate,
    promoterCommissionPercent,
    simGraphicValue,
    simPhysicalValue,
    simServiceValue,
  ]);

  const handleSaveCommissionRates = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      setCommissionError('Apenas o perfil Administrador tem autorização para alterar as porcentagens de comissão.');
      return;
    }

    const pg = parseFloat(graphicCommissionRate);
    const pf = parseFloat(physicalCommissionRate);
    const srv = parseFloat(serviceCommissionRate);
    const prom = parseFloat(promoterCommissionPercent);

    if (isNaN(pg) || isNaN(pf) || isNaN(srv) || isNaN(prom)) {
      setCommissionError('Por favor, informe valores numéricos válidos para todos os campos de comissão.');
      return;
    }

    if (pg < 0 || pg > 100) {
      setCommissionError('A comissão para Produto Gráfico deve ser uma porcentagem entre 0% e 100%.');
      return;
    }

    if (pf < 0 || pf > 100) {
      setCommissionError('A comissão para Produto Físico deve ser uma porcentagem entre 0% e 100%.');
      return;
    }

    if (srv < 0 || srv > 100) {
      setCommissionError('A comissão para Serviço Digital deve ser uma porcentagem entre 0% e 100%.');
      return;
    }

    if (prom < 0 || prom > 100) {
      setCommissionError('A comissão do Promotor deve ser uma porcentagem entre 0% e 100%.');
      return;
    }

    setCommissionError('');
    setIsSavingCommissions(true);

    try {
      StorageService.saveCommissionRates(
        {
          PRODUTO_GRAFICO: Number(pg.toFixed(2)),
          PRODUTO_FISICO: Number(pf.toFixed(2)),
          SERVICO: Number(srv.toFixed(2)),
        },
        currentUser
      );

      StorageService.savePromoterCommissionPercent(Number(prom.toFixed(2)), currentUser);

      onSettingsSaved();
      showToast('Configurações de comissões e percentual do Promotor salvas com sucesso!');
    } catch (err: any) {
      setCommissionError(err.message || 'Erro ao salvar porcentagens de comissão.');
    } finally {
      setIsSavingCommissions(false);
    }
  };

  const handleResetCommissionRates = () => {
    if (!isAdmin) return;
    setGraphicCommissionRate('10');
    setPhysicalCommissionRate('5');
    setServiceCommissionRate('15');
    setPromoterCommissionPercent('20');
    setCommissionError('');
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      setCategoryToDelete(cat);
    }
  };

  const handleResetData = async () => {
    setIsResetConfirmOpen(false);
    await StorageService.resetToInitialData();
    refreshUsers();
    onSettingsSaved();
    showToast('Dados restaurados para o padrão de demonstração!');
  };

  return (
    <div id="settings-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast('')} className="p-1 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            <span>Configurações do Sistema</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento de usuários e níveis hierárquicos, dados da empresa e categorias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPublishCatalogModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
            title="Sincronizar vitrine estática no GitHub"
          >
            <Globe className="w-4 h-4" />
            <span>Publicar Catálogo na Web</span>
          </button>
        </div>
      </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'usuarios'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Usuários e Equipe</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full font-bold">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Dados do Administrador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('empresa')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'empresa'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Empresa e Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categorias')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'categorias'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FolderTree className="w-4 h-4 text-purple-600" />
            <span>Categorias</span>
          </button>

          <button
            type="button"
            id="tab-btn-comissoes"
            onClick={() => setActiveTab('comissoes')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'comissoes'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>Comissões por Tipo</span>
          </button>

          <button
            type="button"
            id="tab-btn-nichos"
            onClick={() => setActiveTab('nichos')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'nichos'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Nichos da Vitrine</span>
          </button>
        </div>

      {/* --- TAB 1: USUÁRIOS & HIERARQUIA DE ACESSO --- */}
      {activeTab === 'usuarios' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Gestão de Usuários e Níveis de Acesso</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cadastre novos membros e gerencie o nível hierárquico (Administrador, Colaborador ou Vendedor).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-add-user"
                  onClick={() => handleOpenAddUser('VENDEDOR')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adicionar Usuário</span>
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Filtrar por papel:</span>
              <button
                type="button"
                onClick={() => setUserRoleFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  userRoleFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({users.length})
              </button>

              <button
                type="button"
                onClick={() => setUserRoleFilter('ADMINISTRADOR')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  userRoleFilter === 'ADMINISTRADOR'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administradores ({admins.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setUserRoleFilter('COLABORADOR')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  userRoleFilter === 'COLABORADOR'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Colaboradores ({collaborators.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setUserRoleFilter('VENDEDOR')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  userRoleFilter === 'VENDEDOR'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Vendedores ({sellers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setUserRoleFilter('PROMOTOR')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  userRoleFilter === 'PROMOTOR'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Promotores ({promoters.length})</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="px-4 py-3">Membro da Equipe</th>
                    <th className="px-4 py-3">Nível Hierárquico</th>
                    <th className="px-4 py-3">Contato / E-mail</th>
                    <th className="px-4 py-3">Status de Acesso</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Nenhum usuário encontrado neste filtro. Clique em "+ Adicionar Usuário" acima.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isMe = u.id === currentUser.id;
                      const isUserAdmin = u.role === 'ADMINISTRADOR';
                      const isUserCollab = u.role === 'COLABORADOR';
                      const isUserPromoter = u.role === 'PROMOTOR';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                                  isUserAdmin
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : isUserCollab
                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                    : isUserPromoter
                                    ? 'bg-teal-100 text-teal-800 border-teal-300'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900">{u.name}</p>
                                  {isMe && (
                                    <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                                      Você
                                    </span>
                                  )}
                                  {u.isTestUser && (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded">
                                      Modo Simulação
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {u.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {isUserAdmin ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Shield className="w-3.5 h-3.5 text-amber-600" />
                                <span>Administrador</span>
                              </div>
                            ) : isUserCollab ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Colaborador</span>
                              </div>
                            ) : isUserPromoter ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                <Megaphone className="w-3.5 h-3.5 text-teal-600" />
                                <span>Promotor</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Vendedor</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            <div className="space-y-0.5 text-xs">
                              {u.email ? (
                                <p className="text-slate-800 font-medium">{u.email}</p>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Sem e-mail</span>
                              )}
                              {u.phone && (
                                <p className="text-[11px] text-slate-500 font-mono">{u.phone}</p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                              <KeyRound className="w-3 h-3 text-emerald-600" />
                              <span>Senha ativa</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setUserToResetPwd(u);
                                  setNewUserPwd('');
                                  setResetPwdError('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                                title="Redefinir senha de acesso"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Senha</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                title="Editar dados e nível hierárquico"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Editar / Nível</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                disabled={isUserAdmin && admins.length <= 1}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                  isUserAdmin && admins.length <= 1
                                    ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                                }`}
                                title={
                                  isUserAdmin && admins.length <= 1
                                    ? 'Não é possível excluir o único administrador ativo'
                                    : 'Excluir usuário'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Excluir</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Hierarchical Roles Explanation Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Shield className="w-4 h-4 text-amber-700" />
                  <span>👑 Administrador</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Acesso irrestrito a todas as áreas: visualização e alteração de custos, relatórios financeiros de lucro, configurações da empresa, taxas e gerenciamento de usuários.
                </p>
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  <span>🛡️ Colaborador</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Acesso operacional avançado: operação do PDV, acompanhamento e atualização de Ordens de Produção gráfica, gestão de Estoque e cadastro de itens (sem acesso a configurações).
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  <span>💼 Vendedor</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Acesso comercial de balcão: operação do PDV, emissão e conversão de Orçamentos, consulta de catálogo e cadastro de clientes (custos e configurações bloqueados).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: DADOS DO ADMINISTRADOR --- */}
      {activeTab === 'admin' && (
        <div className="max-w-2xl space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <span>Identificação do Administrador</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Altere seu nome de identificação utilizado no cabeçalho e nas áreas administrativas do sistema.
              </p>
            </div>

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              {adminFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold">
                  {adminFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => {
                    setAdminName(e.target.value);
                    setAdminFormError('');
                  }}
                  placeholder="Ex: Ana Paula"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelAdmin}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar alterações</span>
                </button>
              </div>
            </form>
          </div>

          {/* Password Security Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                <span>Segurança e Senha de Acesso</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Altere a senha utilizada para acessar o painel administrativo. A senha é armazenada com criptografia forte.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwdError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{pwdError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Senha Atual *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    required
                    value={currentPwd}
                    onChange={(e) => {
                      setCurrentPwd(e.target.value);
                      setPwdError('');
                    }}
                    placeholder="Digite sua senha atual..."
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  >
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      required
                      value={newPwd}
                      onChange={(e) => {
                        setNewPwd(e.target.value);
                        setPwdError('');
                      }}
                      placeholder="Mínimo 4 dígitos..."
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    >
                      {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirmar Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      required
                      value={confirmPwd}
                      onChange={(e) => {
                        setConfirmPwd(e.target.value);
                        setPwdError('');
                      }}
                      placeholder="Repita a nova senha..."
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    >
                      {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isChangingPwd ? 'Atualizando...' : 'Atualizar Senha'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB 3: DADOS DA EMPRESA & GERAL --- */}
      {activeTab === 'empresa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-150">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Dados da Empresa e Impressão</span>
            </h2>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Empresa / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CNPJ / CPF
                  </label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Sincronização da Vitrine Estática com o GitHub */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-blue-950">
                        Vitrine Pública Estática & Sincronização GitHub
                      </h4>
                      <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                        Exporte produtos públicos, categorias e dados da marca para o arquivo <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-semibold">public/catalogo.json</code> no GitHub com segurança total (sem expor custos ou margens).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPublishCatalogModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Publicar Catálogo na Web</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Frase de Destaque do Catálogo (Slogan)
                </label>
                <input
                  type="text"
                  value={catalogSubtitle}
                  onChange={(e) => setCatalogSubtitle(e.target.value)}
                  placeholder="Ex: Sua rotina, mais simples."
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Frase principal exibida em destaque no banner do Catálogo Digital logo abaixo do nome da empresa.
                </p>
              </div>

              {/* Configuração do Header do Catálogo: Nome da Marca ou Logo */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Exibição no Header Principal do Catálogo
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Defina se o topo do catálogo exibirá o nome da marca em texto ou a logo personalizada.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="catalogHeaderType"
                        value="NAME"
                        checked={catalogHeaderType === 'NAME'}
                        onChange={() => setCatalogHeaderType('NAME')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Nome da Marca ({name || 'Sem nome'})</span>
                    </label>

                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="catalogHeaderType"
                        value="LOGO"
                        checked={catalogHeaderType === 'LOGO'}
                        onChange={() => setCatalogHeaderType('LOGO')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Logo Personalizada</span>
                    </label>
                  </div>
                </div>

                {/* Gestão e Vinculação da Logo via Google Drive (Zero Armazenamento Local) */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-800">
                          Logo da Empresa / Catálogo
                        </label>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full border border-blue-200 flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-blue-600" />
                          <span>Google Drive (Zero Storage)</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        A imagem vem diretamente do Google Drive, sem ocupar espaço no armazenamento local.
                      </p>
                    </div>
                  </div>

                  {logoUrl || logoDriveFileId ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-24 h-16 bg-slate-900 rounded-lg flex items-center justify-center p-2 overflow-hidden shadow-xs shrink-0 border border-slate-700">
                          <BrandLogo
                            logoUrl={logoUrl}
                            logoDriveFileId={logoDriveFileId}
                            alt={name}
                            className="max-h-full max-w-full object-contain"
                            showDriveBadge={true}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                            <span className="truncate">{logoDriveFileName || 'Logo vinculada do Drive'}</span>
                            <span className="shrink-0 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded">
                              Conectada
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {catalogHeaderType === 'LOGO'
                              ? 'Exibição ativa no Header principal e no Banner do catálogo.'
                              : 'Logo salva. Selecione a opção "Logo Personalizada" acima para ativá-la no catálogo.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsDrivePickerOpen(true)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Selecionar outra logo no Google Drive"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                          <span>Trocar no Drive</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remover logo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-200 rounded-xl space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              Vincular Logo do Google Drive
                            </h4>
                            <p className="text-[11px] text-slate-600 mt-0.5 max-w-md leading-relaxed">
                              A foto permanece 100% no Google Drive. O sistema apenas armazena a referência para exibi-la em alta resolução, <strong>reduzindo o consumo de espaço no servidor a zero</strong>.
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
                          Ou cole o link compartilhado ou ID do arquivo no Google Drive:
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-1">
                            <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={driveLinkInput}
                              onChange={(e) => setDriveLinkInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleResolveDriveLogoLink();
                                }
                              }}
                              placeholder="https://drive.google.com/file/d/1A2B3C.../view ou ID do arquivo"
                              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleResolveDriveLogoLink()}
                            disabled={isResolvingDriveLink || !driveLinkInput.trim()}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
                          >
                            {isResolvingDriveLink ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Vinculando...</span>
                              </>
                            ) : (
                              <>
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span>Vincular</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {logoError && (
                    <p className="text-xs text-rose-600 font-semibold">{logoError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <PhoneInput
                    id="company-phone"
                    required
                    value={phone}
                    onChange={(masked) => setPhone(masked)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cidade / UF
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={state}
                      maxLength={2}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="UF"
                      className="w-14 px-2 py-2 text-xs border border-slate-300 rounded-lg text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensagem no Rodapé do Cupom de Venda
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Ex: Obrigado pela preferência! Volte sempre."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              {/* Parâmetros Comerciais / Frete Fornecedor */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Frete Padrão de Fornecedor Terceirizado (R$)
                </label>
                <p className="text-[11px] text-slate-500">
                  Custo fixo de frete por item terceirizado adicionado automaticamente ao cálculo de custo total e lucro bruto.
                </p>
                <div className="relative max-w-xs pt-1">
                  <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={defaultSupplierFreight}
                    onChange={(e) => setDefaultSupplierFreight(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Methods Config */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Formas de Pagamento Aceitas
                </label>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <span>{m}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentMethod(m)}
                        className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1 max-w-sm">
                  <input
                    type="text"
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    placeholder="Nova forma de pagamento..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddPaymentMethod}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-5">
            {isAdmin && (
              <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-5 space-y-3 bg-rose-50/20">
                <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Manutenção de Dados</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Restaure os dados de exemplo do sistema (produtos gráficos, estoque e vendas de teste).
                </p>
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="w-full py-2.5 px-3 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Restaurar Dados Padrão (Seed)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: CATEGORIAS --- */}
      {activeTab === 'categorias' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-purple-600" />
                <span>Categorias de Itens</span>
              </h2>
              <p className="text-xs text-slate-500">
                Categorias para organização dos produtos gráficos, físicos e serviços.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewCategory}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              + Nova Categoria
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const productCount = StorageService.getItems().filter((i) => i.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{cat.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-200/80 text-slate-600 rounded-md">
                        {productCount} {productCount === 1 ? 'item' : 'itens'}
                      </span>
                    </p>
                    {cat.description && (
                      <p className="text-[10px] text-slate-400 leading-tight">{cat.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Categoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 5: COMISSÕES POR TIPO DE ITEM --- */}
      {activeTab === 'comissoes' && (
        <div id="commission-settings-tab" className="space-y-6 animate-in fade-in duration-150">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Área Exclusiva do Administrador</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Controle de Comissão por Tipo de Item
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Defina a porcentagem de comissão que os vendedores recebem sobre cada categoria de produto ou serviço.
                Ao registrar uma venda com múltiplos itens, o sistema calcula a comissão individualmente para cada item
                conforme o seu tipo e soma os valores exatos.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10 pointer-events-none">
              <Percent className="w-64 h-64 text-white" />
            </div>
          </div>

          {!isAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Acesso Somente Leitura</p>
                <p>
                  Você está visualizando as taxas de comissão ativas no sistema. Apenas usuários com perfil de
                  <strong> Administrador</strong> têm autorização para editar e salvar novas porcentagens.
                </p>
              </div>
            </div>
          )}

          {/* Main Commission Form */}
          <form onSubmit={handleSaveCommissionRates} className="space-y-6">
            {commissionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{commissionError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Card 1: PRODUTO GRÁFICO */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                      Gráfica
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Produto Gráfico</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Panfletos, cartões de visita, banners, lonas, adesivos, talões, encadernações e impressões em geral.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <label
                      htmlFor="commission-rate-graphic"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Porcentagem de Comissão *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="commission-rate-graphic"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={!isAdmin || isSavingCommissions}
                        value={graphicCommissionRate}
                        onChange={(e) => setGraphicCommissionRate(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-base font-bold text-slate-900 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 font-extrabold text-sm">
                        %
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-center justify-between">
                    <span className="text-blue-700 font-medium">Exemplo (R$ 1.000,00):</span>
                    <span className="font-bold text-blue-900">
                      {formatCurrency(1000 * ((parseFloat(graphicCommissionRate) || 0) / 100))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: PRODUTO FÍSICO */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                      <Coins className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                      Físico / Estoque
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Produto Físico</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Cabos, adaptadores, fones de ouvido, mouses, pen drives, brindes e itens prontos de revenda física.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <label
                      htmlFor="commission-rate-physical"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Porcentagem de Comissão *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="commission-rate-physical"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={!isAdmin || isSavingCommissions}
                        value={physicalCommissionRate}
                        onChange={(e) => setPhysicalCommissionRate(e.target.value)}
                        placeholder="Ex: 5"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl text-base font-bold text-slate-900 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 font-extrabold text-sm">
                        %
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
                    <span className="text-amber-800 font-medium">Exemplo (R$ 500,00):</span>
                    <span className="font-bold text-amber-950">
                      {formatCurrency(500 * ((parseFloat(physicalCommissionRate) || 0) / 100))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: SERVIÇO DIGITAL */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                      Digital e Serviços
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Serviço Digital</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Consultas governamentais, emissão e digitação de documentos, plastificação, cópias e atendimentos online.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <label
                      htmlFor="commission-rate-service"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Porcentagem de Comissão *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="commission-rate-service"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={!isAdmin || isSavingCommissions}
                        value={serviceCommissionRate}
                        onChange={(e) => setServiceCommissionRate(e.target.value)}
                        placeholder="Ex: 15"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl text-base font-bold text-slate-900 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 font-extrabold text-sm">
                        %
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-purple-50/60 border border-purple-100 rounded-xl text-[11px] text-purple-900 flex items-center justify-between">
                    <span className="text-purple-700 font-medium">Exemplo (R$ 800,00):</span>
                    <span className="font-bold text-purple-900">
                      {formatCurrency(800 * ((parseFloat(serviceCommissionRate) || 0) / 100))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Promoter Commission Card */}
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-700 shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-teal-950 flex items-center gap-2">
                      <span>Porcentagem Global de Comissão do Promotor</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-teal-200/80 text-teal-900 rounded-md">
                        Nível Promotor
                      </span>
                    </h3>
                    <p className="text-xs text-teal-800/90 mt-0.5 leading-relaxed">
                      Defina a fatia da comissão que será repassada ao Promotor que originou o orçamento/cliente.
                      <strong> Importante:</strong> A comissão do Promotor NÃO é adicionada ao custo total; ela é
                      <strong> deduzida da comissão que originalmente pertenceria ao Vendedor</strong>.
                    </p>
                  </div>
                </div>

                <div className="sm:w-48 shrink-0">
                  <label
                    htmlFor="commission-rate-promoter"
                    className="block text-xs font-bold text-teal-900 mb-1"
                  >
                    Fatia do Promotor (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="commission-rate-promoter"
                      min="0"
                      max="100"
                      step="0.5"
                      disabled={!isAdmin || isSavingCommissions}
                      value={promoterCommissionPercent}
                      onChange={(e) => setPromoterCommissionPercent(e.target.value)}
                      placeholder="Ex: 20"
                      className="w-full pl-3.5 pr-10 py-2 bg-white border border-teal-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 rounded-xl text-base font-bold text-teal-950 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-teal-600 font-extrabold text-sm">
                      %
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/80 border border-teal-200/80 rounded-xl text-xs text-teal-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    Exemplo: Se a comissão calculada da venda for <strong>R$ 100,00</strong> e o percentual for <strong>{promoterCommissionPercent}%</strong>:
                  </span>
                </div>
                <div className="flex items-center gap-3 font-semibold text-[11px] shrink-0">
                  <span className="text-teal-800">
                    Promotor recebe: <strong>{formatCurrency(100 * ((parseFloat(promoterCommissionPercent) || 0) / 100))}</strong>
                  </span>
                  <span className="text-slate-700">
                    Vendedor retém: <strong>{formatCurrency(Math.max(0, 100 - (100 * ((parseFloat(promoterCommissionPercent) || 0) / 100))))}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={handleResetCommissionRates}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Restaurar Padrão (10% Gráf. / 5% Fís. / 15% Serv. / 20% Promotor)</span>
                </button>

                <button
                  type="submit"
                  id="btn-save-commission-rates"
                  disabled={isSavingCommissions}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingCommissions ? 'Salvando...' : 'Salvar Configurações de Comissão'}</span>
                </button>
              </div>
            )}
          </form>

          {/* Interactive Multi-Item Sale Simulator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Simulador Interativo de Venda e Divisão Vendedor x Promotor</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Teste em tempo real como o sistema calcula a comissão item a item e faz o desdobramento entre Vendedor, Promotor e Empresa.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Cálculo em Tempo Real
              </span>
            </div>

            {/* Simulation Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Item 1: Valor em Produto Gráfico (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={simGraphicValue}
                  onChange={(e) => setSimGraphicValue(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Item 2: Valor em Produto Físico (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={simPhysicalValue}
                  onChange={(e) => setSimPhysicalValue(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Item 3: Valor em Serviço Digital (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={simServiceValue}
                  onChange={(e) => setSimServiceValue(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500"
                />
              </div>
            </div>

            {/* Simulation Results Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Item Simulado</th>
                    <th className="py-2.5 px-3">Tipo de Item</th>
                    <th className="py-2.5 px-3 text-right">Valor do Item</th>
                    <th className="py-2.5 px-3 text-center">Taxa Aplicada (%)</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700">Comissão Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">1.000 Panfletos 10x14cm</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        Produto Gráfico
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(simRates.gVal)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                      {simRates.pg}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                      {formatCurrency(simRates.commGraphic)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">Fone de Ouvido Bluetooth Pro</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        Produto Físico
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(simRates.fVal)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                      {simRates.pf}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                      {formatCurrency(simRates.commPhysical)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">Emissão e Digitação de Contrato</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                        Serviço Digital
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(simRates.sVal)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-purple-700">
                      {simRates.ps}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                      {formatCurrency(simRates.commService)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                  <tr className="border-b border-slate-200">
                    <td colSpan={2} className="py-3 px-4 uppercase text-[10px] text-slate-600">
                      Totais Consolidados da Venda
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 text-sm">
                      {formatCurrency(simRates.totalSale)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 text-xs">
                      {simRates.avgRate.toFixed(2)}% (Média)
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 text-sm">
                      {formatCurrency(simRates.totalCommission)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Split Banners (Vendedor, Promotor, Empresa) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">
                    Comissão Líquida do Vendedor
                  </span>
                  <span className="text-xl font-extrabold text-blue-700">
                    {formatCurrency(simRates.netSellerShare)}
                  </span>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    {100 - simRates.promRate}% da comissão
                  </span>
                </div>
              </div>

              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-800 block">
                    Comissão do Promotor (Indicação)
                  </span>
                  <span className="text-xl font-extrabold text-teal-700">
                    {formatCurrency(simRates.promoterShare)}
                  </span>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                    {simRates.promRate}% da comissão
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Repasse Líquido da Empresa
                  </span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {formatCurrency(simRates.companyShare)}
                  </span>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    {(100 - simRates.avgRate).toFixed(2)}% da venda
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 6: NICHOS DA VITRINE PÚBLICA --- */}
      {activeTab === 'nichos' && (
        <div id="catalog-niches-tab" className="space-y-6 animate-in fade-in duration-150">
          <NicheManagementPanel onNichesChanged={onSettingsSaved} />
        </div>
      )}

      {/* User Add / Edit Modal (Administrador, Colaborador, Vendedor) */}
      {isUserModalOpen && (
        <Modal
          id="user-hierarchy-modal"
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          title={editingUser ? `Editar Usuário: ${editingUser.name}` : 'Adicionar Novo Usuário'}
          subtitle={
            editingUser
              ? 'Modifique os dados cadastrais ou altere o nível hierárquico no sistema'
              : 'Cadastre um novo usuário e defina seu nível hierárquico e senha'
          }
          maxWidth="md"
        >
          <form onSubmit={handleSaveUser} className="space-y-4">
            {userFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{userFormError}</span>
              </div>
            )}

            {/* Hierarchical Role Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Nível Hierárquico de Acesso (Cargo) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. ADMINISTRADOR */}
                <button
                  type="button"
                  onClick={() => setUserRoleInput('ADMINISTRADOR')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    userRoleInput === 'ADMINISTRADOR'
                      ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30 text-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>👑 Admin</span>
                    </div>
                    {userRoleInput === 'ADMINISTRADOR' && (
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Acesso total: configurações, relatórios e usuários.
                  </p>
                </button>

                {/* 2. COLABORADOR */}
                <button
                  type="button"
                  onClick={() => setUserRoleInput('COLABORADOR')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    userRoleInput === 'COLABORADOR'
                      ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/30 text-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>🛡️ Colaborador</span>
                    </div>
                    {userRoleInput === 'COLABORADOR' && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    PDV balcão, ordens de produção gráfica e estoque.
                  </p>
                </button>

                {/* 3. VENDEDOR */}
                <button
                  type="button"
                  onClick={() => setUserRoleInput('VENDEDOR')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    userRoleInput === 'VENDEDOR' || userRoleInput === 'VENDEDOR_EXTERNO'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/30 text-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span>💼 Vendedor</span>
                    </div>
                    {(userRoleInput === 'VENDEDOR' || userRoleInput === 'VENDEDOR_EXTERNO') && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    PDV balcão, orçamentos, vendas e catálogo.
                  </p>
                </button>

                {/* 4. PROMOTOR */}
                <button
                  type="button"
                  onClick={() => setUserRoleInput('PROMOTOR')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    userRoleInput === 'PROMOTOR'
                      ? 'bg-teal-50/80 border-teal-400 ring-2 ring-teal-400/30 text-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-teal-900">
                      <Megaphone className="w-4 h-4 text-teal-600" />
                      <span>📢 Promotor</span>
                    </div>
                    {userRoleInput === 'PROMOTOR' && (
                      <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Divulgação, cria orçamentos, clientes e comissões próprias.
                  </p>
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome Completo do Usuário *
              </label>
              <input
                type="text"
                autoFocus
                required
                value={userNameInput}
                onChange={(e) => {
                  setUserNameInput(e.target.value);
                  setUserFormError('');
                }}
                placeholder="Ex: Carlos Eduardo, Mariana Silva, Roberto"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  E-mail / Usuário de Login (Opcional)
                </label>
                <input
                  type="email"
                  value={userEmailInput}
                  onChange={(e) => setUserEmailInput(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Telefone / WhatsApp (Opcional)
                </label>
                <PhoneInput
                  id="user-phone-input"
                  value={userPhoneInput}
                  onChange={(masked) => setUserPhoneInput(masked)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {editingUser ? 'Alterar Senha de Acesso (Opcional)' : 'Senha de Acesso Inicial *'}
              </label>
              <div className="relative">
                <input
                  type={showUserPassword ? 'text' : 'password'}
                  value={userPasswordInput}
                  onChange={(e) => {
                    setUserPasswordInput(e.target.value);
                    setUserFormError('');
                  }}
                  placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : 'Padrão: 1234'}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowUserPassword(!showUserPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                >
                  {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {editingUser
                  ? 'Preencha este campo somente se desejar alterar a senha deste usuário.'
                  : 'Senha que o usuário utilizará para acessar o sistema (padrão: 1234).'}
              </p>
            </div>

            {/* Usuário de Testes Toggle */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="user-is-test-checkbox"
                  checked={userIsTestUserInput}
                  onChange={(e) => setUserIsTestUserInput(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-950">
                      Definir como Usuário de Testes (Simulação)
                    </span>
                    <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                      Simulação
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-tight mt-0.5">
                    Quando ativado, qualquer movimentação (vendas, clientes, itens ou alterações) feita por este usuário é apenas simulada, sem alterar o estoque real, relatórios nem persistir dados no sistema.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Usuário</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset User Password Modal */}
      {userToResetPwd && (
        <Modal
          id="reset-user-password-modal"
          isOpen={!!userToResetPwd}
          onClose={() => setUserToResetPwd(null)}
          title={`Redefinir Senha: ${userToResetPwd.name}`}
          subtitle={`Defina uma nova senha para este ${getRoleLabel(userToResetPwd.role)} acessar o sistema`}
          maxWidth="sm"
        >
          <form onSubmit={handleResetUserPasswordSubmit} className="space-y-4">
            {resetPwdError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetPwdError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nova Senha para {userToResetPwd.name} *
              </label>
              <div className="relative">
                <input
                  type={showNewUserPwd ? 'text' : 'password'}
                  autoFocus
                  required
                  value={newUserPwd}
                  onChange={(e) => {
                    setNewUserPwd(e.target.value);
                    setResetPwdError('');
                  }}
                  placeholder="Mínimo 4 caracteres (Ex: 1234 ou 5678)"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPwd(!showNewUserPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                >
                  {showNewUserPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                O usuário poderá entrar com esta nova senha imediatamente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToResetPwd(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Salvar Nova Senha</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
        title="Excluir Usuário"
        message={`Deseja realmente excluir o usuário "${userToDelete?.name}" (${getRoleLabel(userToDelete?.role || 'VENDEDOR')})? Os pedidos e registros históricos vinculados a este usuário serão preservados.`}
        confirmLabel="Sim, Excluir"
        variant="danger"
      />

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <Modal
          id="category-modal"
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveCategory} className="space-y-3">
            {categoryErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{categoryErrorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome da Categoria *
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Banners e Lonas"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição (Opcional)
              </label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Ex: Comunicação visual..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                disabled={isSavingCategory}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-save-category-submit"
                disabled={isSavingCategory}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isSavingCategory ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Gravando no servidor...</span>
                  </>
                ) : (
                  <span>Salvar Categoria</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Category Delete Confirmation Modal */}
      {categoryToDelete && (
        <Modal
          id="category-delete-modal"
          isOpen={!!categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          title="Excluir Categoria"
          subtitle={`Confirmação de exclusão da categoria "${categoryToDelete.name}"`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-700">
                Tem certeza que deseja excluir a categoria <strong>"{categoryToDelete.name}"</strong>?
              </p>
              {(() => {
                const count = StorageService.getItems().filter((i) => i.categoryId === categoryToDelete.id).length;
                if (count > 0) {
                  return (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Esta categoria possui {count} produto(s) associado(s).</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        A exclusão da categoria <strong>NÃO apagará nenhum produto</strong>. Escolha o destino dos produtos vinculados:
                      </p>

                      <div className="space-y-2 pt-1">
                        <label className="flex items-start gap-2 text-[11px] cursor-pointer">
                          <input
                            type="radio"
                            name="category_transfer"
                            checked={categoryTransferOption === 'NONE'}
                            onChange={() => setCategoryTransferOption('NONE')}
                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Manter os produtos no catálogo (ficarão sem categoria definida)</span>
                        </label>

                        {categories.filter((c) => c.id !== categoryToDelete.id).length > 0 && (
                          <div className="space-y-1.5">
                            <label className="flex items-start gap-2 text-[11px] cursor-pointer">
                              <input
                                type="radio"
                                name="category_transfer"
                                checked={categoryTransferOption === 'TRANSFER'}
                                onChange={() => setCategoryTransferOption('TRANSFER')}
                                className="mt-0.5 text-blue-600 focus:ring-blue-500"
                              />
                              <span>Transferir os produtos para outra categoria:</span>
                            </label>

                            {categoryTransferOption === 'TRANSFER' && (
                              <select
                                value={categoryTransferTargetId}
                                onChange={(e) => setCategoryTransferTargetId(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                              >
                                {categories
                                  .filter((c) => c.id !== categoryToDelete.id)
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Esta categoria não possui produtos associados.
                  </p>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Categoria</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Google Drive Logo Picker Modal */}
      {isDrivePickerOpen && (
        <GoogleDrivePickerModal
          isOpen={isDrivePickerOpen}
          onClose={() => setIsDrivePickerOpen(false)}
          onSelectFile={handleSelectDriveLogo}
        />
      )}

      {/* Confirm Reset */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Restaurar Banco de Demonstração"
        message="Esta ação irá restaurar os itens, estoques, pedidos e configurações para o estado original de fábrica. Deseja prosseguir?"
        confirmLabel="Sim, Restaurar Dados"
        variant="danger"
      />

      {/* Publicar Catálogo na Web (GitHub API) Modal */}
      {isPublishCatalogModalOpen && (
        <PublishCatalogModal
          isOpen={isPublishCatalogModalOpen}
          onClose={() => setIsPublishCatalogModalOpen(false)}
          onSuccess={() => {
            setToast('Catálogo atualizado com sucesso no GitHub! A vitrine será atualizada em instantes.');
          }}
        />
      )}
    </div>
  );
};

