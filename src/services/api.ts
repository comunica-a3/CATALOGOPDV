/**
 * Centralized API Client for Server Communication
 * Connects frontend views and StorageService directly to the Express backend and SQLite database.
 */

const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('pdv_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('pdv_auth_token', token);
  } else {
    localStorage.removeItem('pdv_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Erro na requisição (${response.status})`;
    try {
      const errData = await response.json();
      if (errData.error) errorMessage = errData.error;
    } catch {
      // Fallback to status text
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // System & Health
  async getHealth() {
    return request<{ status: string; hasAdmin: boolean; uptimeSeconds: number }>('/health');
  },

  async getSystemStatus() {
    return request<{
      status: string;
      serverPort: number;
      localIps: string[];
      hasAdmin: boolean;
      tablesCount: Record<string, number>;
      memoryUsageMb: number;
    }>('/system/status');
  },

  async migrateFromClient(payload: any) {
    return request<{ success: boolean; importedCounts: Record<string, number> }>(
      '/system/migrate-from-client',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // Auth
  async getAuthStatus() {
    return request<{ hasAdmin: boolean; user: any; isAuthenticated: boolean }>('/auth/status');
  },

  async setupAdmin(data: { name: string; username?: string; email?: string; phone?: string; password: string }) {
    const res = await request<{ success: boolean; user: any; session: { token: string } }>(
      '/auth/setup-admin',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    if (res.session?.token) {
      setAuthToken(res.session.token);
    }
    return res;
  },

  async login(credentials: { userId?: string; username?: string; password: string }) {
    const res = await request<{
      success: boolean;
      user: any;
      session: { token: string };
      mustChangePassword?: boolean;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.session?.token) {
      setAuthToken(res.session.token);
    }
    return res;
  },

  async logout() {
    try {
      await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout network error:', e);
    } finally {
      setAuthToken(null);
    }
  },

  async changePassword(data: { currentPassword?: string; newPassword: string; targetUserId?: string }) {
    return request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Users
  async getUsers() {
    return request<any[]>('/users');
  },

  async saveUser(user: any) {
    return request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateUser(id: string, user: any) {
    return request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  async deleteUser(id: string) {
    return request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' });
  },

  // Customers
  async getCustomers() {
    return request<any[]>('/customers');
  },

  async saveCustomer(customer: any) {
    return request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },

  async deleteCustomer(id: string) {
    return request<{ success: boolean }>(`/customers/${id}`, { method: 'DELETE' });
  },

  // Items / Products
  async getItems() {
    return request<any[]>('/items');
  },

  async uploadImage(dataUrl: string, prefix = 'prod'): Promise<{ success: boolean; url: string; filename: string }> {
    return request<{ success: boolean; url: string; filename: string }>('/upload/image', {
      method: 'POST',
      body: JSON.stringify({ data: dataUrl, prefix }),
    });
  },

  async saveItem(item: any) {
    return request<any>('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async saveItemsBatch(items: any[]) {
    return request<{ success: boolean; count: number }>('/items/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  async deleteItem(id: string) {
    return request<{ success: boolean }>(`/items/${id}`, { method: 'DELETE' });
  },

  // Categories
  async getCategories() {
    return request<any[]>('/categories');
  },

  async saveCategory(cat: any) {
    return request<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(cat),
    });
  },

  async saveCategoriesBatch(categories: any[]) {
    return request<{ success: boolean; count: number }>('/categories/batch', {
      method: 'POST',
      body: JSON.stringify({ categories }),
    });
  },

  async deleteCategory(id: string) {
    return request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' });
  },

  // Sales
  async getSales() {
    return request<any[]>('/sales');
  },

  async saveSale(sale: any) {
    return request<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  },

  async deleteSale(id: string) {
    return request<{ success: boolean }>(`/sales/${id}`, { method: 'DELETE' });
  },

  async updateCompletedSale(id: string, payload: any) {
    return request<any>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async softDeleteSale(id: string, reason: string, user?: { id?: string; name?: string }) {
    return request<{ success: boolean; id: string; deletedAt: string }>(`/sales/${id}/soft-delete`, {
      method: 'POST',
      body: JSON.stringify({ reason, userId: user?.id, userName: user?.name }),
    });
  },

  async cancelSale(id: string) {
    return request<{ success: boolean }>(`/sales/${id}/cancel`, { method: 'POST' });
  },

  // Budgets
  async getBudgets() {
    return request<any[]>('/budgets');
  },

  async saveBudget(budget: any) {
    return request<any>('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  },

  async deleteBudget(id: string) {
    return request<{ success: boolean }>(`/budgets/${id}`, { method: 'DELETE' });
  },

  // Prospecting
  async getOpportunities() {
    return request<any[]>('/prospecting/opportunities');
  },

  async saveOpportunity(opp: any) {
    return request<any>('/prospecting/opportunities', {
      method: 'POST',
      body: JSON.stringify(opp),
    });
  },

  async deleteOpportunity(id: string) {
    return request<{ success: boolean }>(`/prospecting/opportunities/${id}`, { method: 'DELETE' });
  },

  async getPackages() {
    return request<any[]>('/prospecting/packages');
  },

  async getApproachTemplates() {
    return request<any[]>('/prospecting/approach-templates');
  },

  async saveApproachTemplate(tpl: any) {
    return request<any>('/prospecting/approach-templates', {
      method: 'POST',
      body: JSON.stringify(tpl),
    });
  },

  async deleteApproachTemplate(id: string) {
    return request<{ success: boolean }>(`/prospecting/approach-templates/${id}`, { method: 'DELETE' });
  },

  // Opportunity Activities (Ações Executadas)
  async getOpportunityActivities(opportunityId?: string) {
    const query = opportunityId ? `?opportunityId=${encodeURIComponent(opportunityId)}` : '';
    return request<any[]>(`/prospecting/opportunity-activities${query}`);
  },

  async saveOpportunityActivity(activity: any) {
    return request<any>('/prospecting/opportunity-activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  async deleteOpportunityActivity(id: string) {
    return request<{ success: boolean }>(`/prospecting/opportunity-activities/${id}`, { method: 'DELETE' });
  },

  async getComplementaryRules() {
    return request<any[]>('/prospecting/complementary-rules');
  },

  async getPublicSegmentPages() {
    return request<any[]>('/prospecting/public-segment-pages');
  },

  // Finance
  async getReceivingAccounts() {
    return request<any[]>('/finance/receiving-accounts');
  },

  async saveReceivingAccount(account: any) {
    return request<any>('/finance/receiving-accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  },

  async deleteReceivingAccount(id: string) {
    return request<{ success: boolean }>(`/finance/receiving-accounts/${id}`, { method: 'DELETE' });
  },

  async getFinancialTransfers() {
    return request<any[]>('/finance/transfers');
  },

  async saveFinancialTransfer(transfer: any) {
    return request<any>('/finance/transfers', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  },

  async deleteFinancialTransfer(id: string) {
    return request<{ success: boolean }>(`/finance/transfers/${id}`, { method: 'DELETE' });
  },

  async getReceivables() {
    return request<any[]>('/finance/receivables');
  },

  async getCashRegisterSessions() {
    return request<any[]>('/finance/cash-register-sessions');
  },

  async saveCashRegisterSession(session: any) {
    return request<any>('/finance/cash-register-sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  },

  async getAccountAdjustments() {
    return request<any[]>('/finance/adjustments');
  },

  async saveAccountAdjustment(adjustment: any) {
    return request<any>('/finance/adjustments', {
      method: 'POST',
      body: JSON.stringify(adjustment),
    });
  },

  // Sale Annotations (Metadata sem alterar venda original)
  async getSaleAnnotations(saleId: string) {
    return request<any[]>(`/sales/${saleId}/annotations`);
  },

  async getAllSaleAnnotations() {
    return request<any[]>('/sales/annotations/all');
  },

  async addSaleAnnotation(saleId: string, text: string, user?: { id?: string; name?: string }) {
    return request<any>(`/sales/${saleId}/annotations`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        userId: user?.id,
        userName: user?.name,
      }),
    });
  },

  // Production & Inventory
  async getProductionOrders() {
    return request<any[]>('/production');
  },

  async saveProductionOrder(order: any) {
    return request<{ success: boolean; order: any }>('/production', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  async saveProductionOrdersBatch(orders: any[]) {
    return request<{ success: boolean; count: number }>('/production/batch', {
      method: 'POST',
      body: JSON.stringify({ orders }),
    });
  },

  async deleteProductionOrder(id: string) {
    return request<{ success: boolean; id: string }>(`/production/${id}`, {
      method: 'DELETE',
    });
  },

  async getInventoryMovements() {
    return request<any[]>('/inventory/movements');
  },

  async saveInventoryMovementsBatch(movements: any[]) {
    return request<{ success: boolean; count: number }>('/inventory/movements/batch', {
      method: 'POST',
      body: JSON.stringify({ movements }),
    });
  },

  // Services & Documents
  async getOnlineServices() {
    return request<any[]>('/online-services');
  },

  async getDocumentTemplates() {
    return request<any[]>('/document-templates');
  },

  async getGeneratedDocuments() {
    return request<any[]>('/generated-documents');
  },

  // Settings
  async getSettings() {
    return request<any>('/settings');
  },

  async saveSettings(settings: any) {
    return request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Catalog Niches
  async getCatalogNiches() {
    return request<any[]>('/catalog-niches');
  },

  async saveCatalogNiche(niche: any) {
    return request<any>('/catalog-niches', {
      method: 'POST',
      body: JSON.stringify(niche),
    });
  },

  async saveCatalogNichesBatch(niches: any[]) {
    return request<{ success: boolean; count: number }>('/catalog-niches/batch', {
      method: 'POST',
      body: JSON.stringify(niches),
    });
  },

  async deleteCatalogNiche(id: string) {
    return request<{ success: boolean; id: string }>(`/catalog-niches/${id}`, {
      method: 'DELETE',
    });
  },

  // Real-time synchronization broadcast trigger
  async notifySync(event: string = 'catalog-updated', data?: any) {
    try {
      return await request<{ success: boolean }>('/sync/notify', {
        method: 'POST',
        body: JSON.stringify({ event, data }),
      });
    } catch {
      return { success: false };
    }
  },

  // Audit Logs
  async getAuditLogs(params: { limit?: number; offset?: number; entityType?: string; userId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.entityType) query.set('entityType', params.entityType);
    if (params.userId) query.set('userId', params.userId);
    return request<{ logs: any[]; total: number }>(`/audit?${query.toString()}`);
  },

  // Backup & Restore
  async exportBackup() {
    return request<any>('/backup/export');
  },

  async createBackup() {
    return request<{ success: boolean; filename: string }>('/backup/create', { method: 'POST' });
  },

  async listBackups() {
    return request<Array<{ filename: string; size: number; createdAt: string }>>('/backup/list');
  },

  async importBackup(snapshot: any) {
    return request<{ success: boolean; restoredTables: string[] }>('/backup/import', {
      method: 'POST',
      body: JSON.stringify(snapshot),
    });
  },

  async resetDatabaseToSeed() {
    return request<{ success: boolean; message: string }>('/database/reset-seed', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // AI Content Generator
  async generateAI(params: { type: string; prompt: string; context?: any }) {
    return request<{ text: string; source: 'gemini' | 'fallback' }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
