import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { api } from '../services/api';
import { User, UserRole } from '../types';

export function normalizeRole(role?: string): UserRole {
  if (role === 'ADMIN' || role === 'ADMINISTRADOR') {
    return 'ADMINISTRADOR';
  }
  return (role || 'VENDEDOR') as UserRole;
}

export function serializeRole(role?: string): string {
  if (role === 'ADMINISTRADOR' || role === 'ADMIN') {
    return 'ADMIN';
  }
  return role || 'VENDEDOR';
}

interface AuthContextType {
  currentUser: User;
  users: User[];
  sellers: User[];
  collaborators: User[];
  promoters: User[];
  admins: User[];
  isAdmin: boolean;
  isCollaborator: boolean;
  isSeller: boolean;
  isPromotor: boolean;
  canManageProducts: boolean;
  canManageStock: boolean;
  canViewCosts: boolean;
  canAccessFinancial: boolean;
  canViewFinancialReports: boolean;
  canAccessCashRegister: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canDeleteOrders: boolean;
  canEditCompletedSales: boolean;
  canDeleteCompletedSales: boolean;
  canCreateSales: boolean;
  canCreateBudgets: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  hasAdmin: boolean | null;
  checkAuthStatus: () => Promise<{ hasAdmin: boolean }>;
  setupFirstAdmin: (data: {
    name: string;
    username?: string;
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  login: (
    userId: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  forceInitialPasswordChange: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    userId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  adminResetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  adminResetSellerPassword: (sellerId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  refreshUsers: () => Promise<void>;
  updateAdminName: (name: string) => Promise<User>;
  addUser: (name: string, role: UserRole, initialPassword?: string, email?: string, phone?: string, username?: string, isTestUser?: boolean) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>, newPassword?: string) => Promise<User | undefined>;
  deleteUser: (id: string) => Promise<void>;
  addSeller: (name: string, initialPassword?: string, email?: string, phone?: string) => Promise<User>;
  updateSeller: (id: string, name: string, newPassword?: string) => Promise<User | undefined>;
  deleteSeller: (id: string) => Promise<void>;
  addPromoter: (name: string, initialPassword?: string, email?: string, phone?: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => 
    StorageService.getUsers().map((u) => ({ ...u, role: normalizeRole(u.role) }))
  );
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const active = StorageService.getCurrentUser();
    if (active) {
      return { ...active, role: normalizeRole(active.role) };
    }
    const sessionUser = StorageService.getSession().user;
    if (sessionUser) {
      return { ...sessionUser, role: normalizeRole(sessionUser.role) };
    }
    return {
      id: 'usr-admin-1',
      name: 'Administrador',
      role: 'ADMINISTRADOR',
    };
  });
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = StorageService.getSession();
    return session.isAuthenticated;
  });
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    const session = StorageService.getSession();
    return session.isAuthenticated && session.mustChangePassword;
  });

  const loadUsers = useCallback(async () => {
    // 1. Fetch live status from backend server
    let serverHasAdmin: boolean | null = null;
    try {
      const statusRes = await api.getAuthStatus();
      if (statusRes && typeof statusRes.hasAdmin === 'boolean') {
        serverHasAdmin = statusRes.hasAdmin;
        setHasAdmin(statusRes.hasAdmin);
      }
    } catch (e) {
      console.debug('API auth status check notice:', e);
    }

    // 2. Sync from backend server
    try {
      const serverUsers = await api.getUsers();
      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        const normalized = serverUsers.map((u) => ({ ...u, role: normalizeRole(u.role) }));
        setUsers(normalized);
        StorageService.saveUsers(normalized);
        setHasAdmin(normalized.some((u) => u.role === 'ADMINISTRADOR'));
      } else {
        const localUsers = StorageService.getUsers().map((u) => ({ ...u, role: normalizeRole(u.role) }));
        setUsers(localUsers);
        setHasAdmin(localUsers.some((u) => u.role === 'ADMINISTRADOR'));
      }
    } catch (e) {
      const localUsers = StorageService.getUsers().map((u) => ({ ...u, role: normalizeRole(u.role) }));
      setUsers(localUsers);
    }

    const session = StorageService.getSession();
    setIsAuthenticated(session.isAuthenticated);
    setMustChangePassword(session.isAuthenticated && session.mustChangePassword);

    if (session.isAuthenticated && session.user) {
      const normalizedSessionUser = { ...session.user, role: normalizeRole(session.user.role) };
      setCurrentUserState(normalizedSessionUser);
      StorageService.setCurrentUser(normalizedSessionUser.id);
    } else {
      const active = StorageService.getCurrentUser();
      if (active) {
        setCurrentUserState({ ...active, role: normalizeRole(active.role) });
      }
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const checkAuthStatus = async (): Promise<{ hasAdmin: boolean }> => {
    try {
      const statusRes = await api.getAuthStatus();
      const adminExists = !!statusRes?.hasAdmin;
      setHasAdmin(adminExists);
      if (!adminExists) {
        setUsers([]);
      }
      return { hasAdmin: adminExists };
    } catch (e) {
      return { hasAdmin: hasAdmin ?? true };
    }
  };

  const setupFirstAdmin = async (data: {
    name: string;
    username?: string;
    email?: string;
    phone?: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.setupAdmin(data);
      if (res.success && res.user) {
        const authUser: User = {
          id: res.user.id,
          name: res.user.name,
          role: normalizeRole(res.user.role),
          email: res.user.email,
          phone: res.user.phone,
          username: res.user.username,
        };

        StorageService.setSession(authUser, false);
        StorageService.setCurrentUser(authUser.id);
        StorageService.saveUsers([authUser]);
        setUsers([authUser]);
        setCurrentUserState(authUser);
        setIsAuthenticated(true);
        setMustChangePassword(false);
        setHasAdmin(true);

        return { success: true };
      }
      return { success: false, error: 'Falha ao cadastrar administrador inicial.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao cadastrar administrador inicial.' };
    }
  };

  const login = async (
    usernameOrId: string,
    passwordOrEmpty?: string
  ): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }> => {
    let inputUser = (usernameOrId || '').trim();
    let inputPassword = (passwordOrEmpty || '').trim();

    if (!passwordOrEmpty) {
      inputPassword = (usernameOrId || '').trim();
      inputUser = 'admin';
    }

    if (!inputUser) {
      return { success: false, error: 'Por favor, informe o usuário de acesso.' };
    }

    if (!inputPassword) {
      return { success: false, error: 'Por favor, informe a senha de acesso.' };
    }

    try {
      // Direct backend API authentication (Turso)
      const apiRes = await api.login({ username: inputUser, password: inputPassword });
      if (apiRes.success && apiRes.user) {
        const authUser: User = {
          id: apiRes.user.id,
          name: apiRes.user.name,
          role: normalizeRole(apiRes.user.role),
          email: apiRes.user.email,
          phone: apiRes.user.phone,
          username: apiRes.user.username,
          isTestUser: Boolean(apiRes.user.isTestUser),
        };

        StorageService.setSession(authUser, !!apiRes.mustChangePassword);
        StorageService.setCurrentUser(authUser.id);
        setCurrentUserState(authUser);
        setIsAuthenticated(true);
        setMustChangePassword(!!apiRes.mustChangePassword);

        // Sync users in background
        api.getUsers().then((freshUsers) => {
          if (Array.isArray(freshUsers) && freshUsers.length > 0) {
            const normalized = freshUsers.map((u) => ({ ...u, role: normalizeRole(u.role) }));
            setUsers(normalized);
            StorageService.saveUsers(normalized);
          }
        }).catch(() => {});

        return {
          success: true,
          mustChangePassword: !!apiRes.mustChangePassword,
        };
      }

      return {
        success: false,
        error: 'Credenciais inválidas. Verifique usuário e senha.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Erro ao realizar login.',
      };
    }
  };

  const forceInitialPasswordChange = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = newPassword.trim();
    if (trimmed.length < 4) {
      return {
        success: false,
        error: 'A nova senha deve possuir pelo menos 4 caracteres.',
      };
    }

    try {
      await api.changePassword({ newPassword: trimmed, targetUserId: currentUser.id });
      const updatedUser = { ...currentUser };
      StorageService.setSession(updatedUser, false);
      setCurrentUserState(updatedUser);
      setMustChangePassword(false);
      StorageService.setUserPassword(currentUser.id, trimmed, false).catch(() => {});
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Erro ao salvar nova senha no servidor.',
      };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    targetUserId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const uId = targetUserId || currentUser.id;
    const trimmedNew = newPassword.trim();
    if (trimmedNew.length < 4) {
      return { success: false, error: 'A nova senha deve possuir pelo menos 4 caracteres.' };
    }

    try {
      try {
        await api.changePassword({
          currentPassword,
          newPassword: trimmedNew,
          targetUserId: uId,
        });
      } catch (apiErr) {
        console.warn('API password change notice:', apiErr);
      }

      await StorageService.setUserPassword(uId, trimmedNew, false);
      if (uId === currentUser.id) {
        setMustChangePassword(false);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao atualizar senha.' };
    }
  };

  const adminResetPassword = async (
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Apenas o Administrador pode redefinir senhas.' };
    }
    const trimmed = newPassword.trim();
    if (trimmed.length < 4) {
      return { success: false, error: 'A senha deve possuir pelo menos 4 caracteres.' };
    }
    try {
      try {
        await api.changePassword({ newPassword: trimmed, targetUserId: userId });
      } catch (apiErr) {
        console.warn('API reset password notice:', apiErr);
      }
      await StorageService.setUserPassword(userId, trimmed, false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao redefinir senha do usuário.' };
    }
  };

  const adminResetSellerPassword = async (
    sellerId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    return adminResetPassword(sellerId, newPassword);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout API notice:', e);
    }
    StorageService.clearSession();
    setIsAuthenticated(false);
    setMustChangePassword(false);
  };

  const switchUser = (userId: string) => {
    if (!isAuthenticated) return;
    const selected = users.find((u) => u.id === userId);
    if (selected) {
      const normalized = { ...selected, role: normalizeRole(selected.role) };
      StorageService.setCurrentUser(userId);
      StorageService.setSession(normalized, false);
      setCurrentUserState(normalized);
    }
  };

  const updateAdminName = async (name: string) => {
    if (!isAuthenticated || !isAdmin) {
      throw new Error('Acesso não autorizado.');
    }
    const updated = StorageService.updateAdminName(name);
    try {
      await api.updateUser(updated.id, { name: updated.name });
    } catch (e) {
      console.warn('API updateUser notice:', e);
    }
    await loadUsers();
    return { ...updated, role: normalizeRole(updated.role) };
  };

  const addUser = async (
    name: string,
    role: UserRole,
    initialPassword = '1234',
    email?: string,
    phone?: string,
    username?: string,
    isTestUser?: boolean
  ) => {
    if (!isAuthenticated || !isAdmin) {
      throw new Error('Acesso restrito ao Administrador.');
    }
    const normalizedRole = normalizeRole(role);
    const newUser = StorageService.addUser({ name, role: normalizedRole, initialPassword, email, phone, username, isTestUser });
    try {
      await api.saveUser({
        id: newUser.id,
        name: newUser.name,
        role: serializeRole(normalizedRole),
        email: newUser.email,
        phone: newUser.phone,
        username: newUser.username,
        password: initialPassword,
        isTestUser: Boolean(isTestUser),
      });
    } catch (e) {
      console.warn('API saveUser notice:', e);
    }
    await loadUsers();
    return { ...newUser, role: normalizedRole };
  };

  const updateUser = async (id: string, updates: Partial<User>, newPassword?: string) => {
    if (!isAuthenticated || !isAdmin) {
      throw new Error('Acesso restrito ao Administrador.');
    }
    const normalizedUpdates = {
      ...updates,
      role: updates.role ? normalizeRole(updates.role) : undefined,
    };
    const updated = StorageService.updateUser(id, normalizedUpdates, newPassword);
    if (updated) {
      try {
        await api.updateUser(id, {
          name: updated.name,
          role: serializeRole(updated.role),
          email: updated.email,
          phone: updated.phone,
          username: updated.username,
          password: newPassword,
          isTestUser: updated.isTestUser !== undefined ? Boolean(updated.isTestUser) : undefined,
        });
      } catch (e) {
        console.warn('API updateUser notice:', e);
      }
    }
    await loadUsers();
    return updated ? { ...updated, role: normalizeRole(updated.role) } : undefined;
  };

  const deleteUser = async (id: string) => {
    if (!isAuthenticated || !isAdmin) {
      throw new Error('Acesso restrito ao Administrador.');
    }
    StorageService.deleteUser(id);
    try {
      await api.deleteUser(id);
    } catch (e) {
      console.warn('API deleteUser notice:', e);
    }
    await loadUsers();
  };

  const addSeller = async (name: string, initialPassword = '1234', email?: string, phone?: string) => {
    return addUser(name, 'VENDEDOR', initialPassword, email, phone);
  };

  const updateSeller = async (id: string, name: string, newPassword?: string) => {
    return updateUser(id, { name }, newPassword);
  };

  const deleteSeller = async (id: string) => {
    await deleteUser(id);
  };

  const addPromoter = async (name: string, initialPassword = '1234', email?: string, phone?: string) => {
    return addUser(name, 'PROMOTOR', initialPassword, email, phone);
  };

  // Role booleans
  const isAdmin = isAuthenticated && currentUser.role === 'ADMINISTRADOR';
  const isCollaborator = isAuthenticated && currentUser.role === 'COLABORADOR';
  const isSeller = currentUser.role === 'VENDEDOR' || currentUser.role === 'VENDEDOR_EXTERNO';
  const isPromotor = currentUser.role === 'PROMOTOR';

  // Permission Matrix
  const canManageProducts = isAdmin || isCollaborator;
  const canManageStock = isAdmin || isCollaborator;
  const canViewCosts = isAdmin || isCollaborator;
  const canAccessFinancial = isAdmin || isCollaborator;
  const canViewFinancialReports = isAdmin || isCollaborator;
  const canAccessCashRegister = isAdmin || isCollaborator;
  const canAccessSettings = isAdmin;
  const canManageUsers = isAdmin;
  const canDeleteOrders = isAdmin;
  const canEditCompletedSales = isAdmin || isCollaborator;
  const canDeleteCompletedSales = isAdmin;
  const canCreateSales = isAdmin || isCollaborator || isSeller;
  const canCreateBudgets = true;

  const sellers = users.filter((u) => u.role === 'VENDEDOR' || u.role === 'VENDEDOR_EXTERNO');
  const collaborators = users.filter((u) => u.role === 'COLABORADOR');
  const promoters = users.filter((u) => u.role === 'PROMOTOR');
  const admins = users.filter((u) => u.role === 'ADMINISTRADOR');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        sellers,
        collaborators,
        promoters,
        admins,
        isAdmin,
        isCollaborator,
        isSeller,
        isPromotor,
        canManageProducts,
        canManageStock,
        canViewCosts,
        canAccessFinancial,
        canViewFinancialReports,
        canAccessCashRegister,
        canAccessSettings,
        canManageUsers,
        canDeleteOrders,
        canEditCompletedSales,
        canDeleteCompletedSales,
        canCreateSales,
        canCreateBudgets,
        isAuthenticated,
        mustChangePassword,
        hasAdmin,
        checkAuthStatus,
        setupFirstAdmin,
        login,
        forceInitialPasswordChange,
        changePassword,
        adminResetPassword,
        adminResetSellerPassword,
        logout,
        switchUser,
        refreshUsers: loadUsers,
        updateAdminName,
        addUser,
        updateUser,
        deleteUser,
        addSeller,
        updateSeller,
        deleteSeller,
        addPromoter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

