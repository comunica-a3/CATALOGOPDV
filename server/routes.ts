import express, { Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dns from 'dns';
import { db, persistDatabase, resetDatabaseToSeed } from './db';
import {
  AuthenticatedUser,
  AuthRequest,
  createSession,
  ensureDefaultAdminUser,
  hashPassword,
  hasAdminUser,
  invalidateSession,
  requireAdmin,
  requireAuth,
  verifyPassword,
} from './auth';
import { logAudit, getAuditLogs } from './audit';
import {
  createLocalBackupFile,
  exportDatabaseSnapshot,
  listLocalBackups,
  restoreDatabaseSnapshot,
} from './backup';
import { generateAIContent } from './ai';
import { buildPublicCatalogPayload, publishCatalogToGitHub } from './catalogPublisher';

const router = express.Router();

/**
 * Helper to store an image (from base64 data URL) into uploads table and disk cache
 */
export async function saveBase64Image(
  dataUrl: string,
  customPrefix = 'img'
): Promise<{ url: string; filename: string }> {
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Parse mime type and base64 payload
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de imagem data URL inválido.');
  }

  const mimeType = match[1];
  const base64Data = match[2];
  let ext = 'jpg';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('gif')) ext = 'gif';
  else if (mimeType.includes('svg')) ext = 'svg';

  // Compute hash or unique id
  const hash = crypto.createHash('md5').update(base64Data).digest('hex').slice(0, 12);
  const id = `${customPrefix}-${Date.now()}-${hash}`;
  const filename = `${id}.${ext}`;
  const filePath = path.join(uploadsDir, filename);

  // Grava o arquivo de imagem diretamente no disco em data/uploads/
  const buffer = Buffer.from(base64Data, 'base64');
  try {
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error('Erro ao gravar arquivo de imagem em data/uploads/:', err);
    throw new Error('Falha ao salvar arquivo de imagem no disco.');
  }

  // Registra metadados do arquivo sem salvar o payload base64 no banco de dados
  const now = new Date().toISOString();
  try {
    await db.run(
      'INSERT OR REPLACE INTO uploaded_files (id, filename, mime_type, data_base64, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, filename, mimeType, '', now]
    );
  } catch (err) {
    // Registro de metadados não bloqueante
  }

  return {
    url: `/api/uploads/${filename}`,
    filename,
  };
}

/**
 * Network IPs discovery helper
 */
function getLocalNetworkIps(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
  }

  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}

// -----------------------------------------------------------------------------
// REAL-TIME SYNCHRONIZATION (Server-Sent Events)
// -----------------------------------------------------------------------------

const sseClients = new Set<Response>();

export function broadcastSync(event: string, data?: any) {
  const payload = JSON.stringify({
    event,
    data: data || {},
    timestamp: new Date().toISOString(),
  });
  const message = `event: ${event}\ndata: ${payload}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

router.get('/sync/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

router.post('/sync/notify', (req, res) => {
  const { event = 'catalog-updated', data } = req.body || {};
  broadcastSync(event, data);
  res.json({ success: true, event });
});

// -----------------------------------------------------------------------------
// SYSTEM & HEALTH
// -----------------------------------------------------------------------------

router.get('/health', async (req, res) => {
  try {
    const hasAdmin = await hasAdminUser();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      hasAdmin,
      isTurso: db.isTurso,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

router.get('/system/status', async (req, res) => {
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
      auditLogsCount,
    ] = await Promise.all([
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM users'),
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM customers'),
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM items'),
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM sales'),
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM budgets'),
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM opportunities'),
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM production_orders'),
      db.get<{ c: number }>('SELECT COUNT(*) as c FROM audit_logs'),
    ]);

    const hasAdmin = await hasAdminUser();

    res.json({
      status: 'online',
      serverPort: 3000,
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
        auditLogs: Number(auditLogsCount?.c || 0),
      },
      nodeVersion: process.version,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao obter status do sistema.' });
  }
});

// Client LocalStorage Migration (Safe & Idempotent Merge)
router.post('/system/migrate-from-client', async (req: AuthRequest, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Payload de migração inválido.' });
      return;
    }

    // Safety backup first
    await createLocalBackupFile('pre_client_migration');
    let importedCounts = {
      customers: 0,
      sales: 0,
      budgets: 0,
      opportunities: 0,
      items: 0,
    };

    // 1. Merge Customers
    if (Array.isArray(payload.customers)) {
      for (const c of payload.customers) {
        if (!c.id || !c.name) continue;
        const exists = await db.get('SELECT id FROM customers WHERE id = ?', [c.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO customers (
              id, name, trade_name, type, cpf_cnpj, rg_ie, phone, whatsapp, email,
              address, number, complement, neighborhood, city, state, cep, notes, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              c.id, c.name, c.tradeName || '', c.type || 'PF', c.cpfCnpj || '', c.rgIe || '',
              c.phone || '', c.whatsapp || '', c.email || '', c.address || '', c.number || '',
              c.complement || '', c.neighborhood || '', c.city || '', c.state || '', c.cep || '',
              c.notes || '', c.active !== false ? 1 : 0, c.createdAt || new Date().toISOString(),
              c.updatedAt || new Date().toISOString(),
            ]
          );
          importedCounts.customers++;
        }
      }
    }

    // 2. Merge Sales
    if (Array.isArray(payload.sales)) {
      for (const s of payload.sales) {
        if (!s.id) continue;
        const exists = await db.get('SELECT id FROM sales WHERE id = ?', [s.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO sales (
              id, sale_number, customer_id, customer_name, customer_phone, customer_email,
              seller_id, seller_name, subtotal, discount, addition, total, paid_amount,
              remaining_amount, payment_status, payment_method, payments_json, items_json,
              notes, invoice_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.id, s.saleNumber || 0, s.customerId || null, s.customerName || 'Consumidor',
              s.customerPhone || null, s.customerEmail || null, s.sellerId || null, s.sellerName || 'Atendente',
              s.subtotal || 0, s.discount || 0, s.addition || 0, s.total || 0, s.paidAmount || 0,
              s.remainingAmount || 0, s.paymentStatus || 'PAGO', s.paymentMethod || 'DINHEIRO',
              s.payments ? JSON.stringify(s.payments) : null, JSON.stringify(s.items || []),
              s.notes || null, s.invoiceStatus || null, s.createdAt || new Date().toISOString(),
              s.updatedAt || new Date().toISOString(),
            ]
          );
          importedCounts.sales++;
        }
      }
    }

    // 3. Merge Budgets
    if (Array.isArray(payload.budgets)) {
      for (const b of payload.budgets) {
        if (!b.id) continue;
        const exists = await db.get('SELECT id FROM budgets WHERE id = ?', [b.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO budgets (
              id, budget_number, customer_id, customer_name, customer_phone, customer_email,
              seller_id, seller_name, subtotal, discount, addition, total, status, valid_until,
              items_json, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              b.id, b.budgetNumber || 0, b.customerId || null, b.customerName || 'Cliente',
              b.customerPhone || null, b.customerEmail || null, b.sellerId || null, b.sellerName || 'Vendedor',
              b.subtotal || 0, b.discount || 0, b.addition || 0, b.total || 0, b.status || 'PENDENTE',
              b.validUntil || null, JSON.stringify(b.items || []), b.notes || null,
              b.createdAt || new Date().toISOString(), b.updatedAt || new Date().toISOString(),
            ]
          );
          importedCounts.budgets++;
        }
      }
    }

    // 4. Merge Opportunities
    if (Array.isArray(payload.opportunities)) {
      for (const opp of payload.opportunities) {
        if (!opp.id || !opp.name) continue;
        const exists = await db.get('SELECT id FROM opportunities WHERE id = ?', [opp.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO opportunities (
              id, opportunity_number, name, contact_name, phone, whatsapp, email, segment,
              stage, estimated_value, confidence, neighborhood, city, origin, origin_details,
              notes, assigned_seller_id, assigned_seller_name, next_action_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              opp.id, opp.opportunityNumber || 0, opp.name, opp.contactName || '', opp.phone || '',
              opp.whatsapp || '', opp.email || '', opp.segment || 'Geral', opp.stage || 'IDENTIFICADO',
              opp.estimatedValue || 0, opp.confidence || 50, opp.neighborhood || '', opp.city || '',
              opp.origin || '', opp.originDetails || '', opp.notes || '', opp.assignedSellerId || '',
              opp.assignedSellerName || '', opp.nextAction ? JSON.stringify(opp.nextAction) : null,
              opp.createdAt || new Date().toISOString(), opp.updatedAt || new Date().toISOString(),
            ]
          );
          importedCounts.opportunities++;
        }
      }
    }

    // 5. Merge Approach Templates
    if (Array.isArray(payload.approachTemplates)) {
      for (const tpl of payload.approachTemplates) {
        if (!tpl.id || !tpl.title) continue;
        const exists = await db.get('SELECT id FROM approach_templates WHERE id = ?', [tpl.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO approach_templates (
              id, segment, title, trigger, message_text, tone, variables_json, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tpl.id,
              tpl.category || tpl.segment || 'Geral',
              tpl.title,
              tpl.targetStage || tpl.trigger || 'ALL',
              tpl.templateText || tpl.messageText || '',
              tpl.tone || 'Profissional',
              null,
              tpl.active !== false ? 1 : 0,
              tpl.createdAt || new Date().toISOString(),
              tpl.updatedAt || new Date().toISOString(),
            ]
          );
        }
      }
    }

    // 6. Merge Opportunity Activities
    if (Array.isArray(payload.opportunityActivities)) {
      for (const act of payload.opportunityActivities) {
        if (!act.id || !act.opportunityId) continue;
        const exists = await db.get('SELECT id FROM opportunity_activities WHERE id = ?', [act.id]);
        if (!exists) {
          await db.run(
            `INSERT INTO opportunity_activities (
              id, opportunity_id, type, title, description, user_id, user_name, date, scheduled_for, completed, result, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              act.id,
              act.opportunityId,
              act.type || 'OBSERVACAO',
              act.title || act.type || 'Atividade',
              act.description || '',
              act.userId || '',
              act.userName || '',
              act.date || act.createdAt || new Date().toISOString(),
              act.scheduledFor || null,
              act.completed !== false ? 1 : 0,
              act.result || null,
              act.createdAt || new Date().toISOString(),
            ]
          );
        }
      }
    }

    persistDatabase();

    await logAudit({
      userId: req.user?.id || 'MIGRATION',
      userName: req.user?.name || 'Rotina de Migração',
      action: 'MIGRATE_FROM_CLIENT',
      entityType: 'SYSTEM',
      details: importedCounts,
      ipAddress: req.ip,
    });

    res.json({ success: true, importedCounts });
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message || 'Falha ao migrar dados.' });
  }
});

// -----------------------------------------------------------------------------
// AUTHENTICATION
// -----------------------------------------------------------------------------

router.get('/auth/status', async (req: AuthRequest, res) => {
  try {
    await ensureDefaultAdminUser();
    const hasAdmin = await hasAdminUser();
    res.json({
      hasAdmin,
      user: req.user || null,
      isAuthenticated: !!req.user,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup First Administrator
router.post('/auth/setup-admin', async (req, res) => {
  try {
    const hasAdmin = await hasAdminUser();
    if (hasAdmin) {
      res.status(400).json({ error: 'O sistema já possui um administrador configurado.' });
      return;
    }

    const { name, username, email, phone, password } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nome do administrador é obrigatório.' });
      return;
    }
    if (!password || password.trim().length < 4) {
      res.status(400).json({ error: 'A senha do administrador deve possuir no mínimo 4 caracteres.' });
      return;
    }

    const passwordHash = await hashPassword(password.trim());
    const adminId = `usr-admin-${Date.now()}`;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO users (
        id, name, username, email, phone, role, password_hash, active, must_change_password, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        name.trim(),
        username?.trim() || 'admin',
        email?.trim() || null,
        phone?.trim() || null,
        'ADMIN',
        passwordHash,
        1,
        0,
        now,
        now,
      ]
    );

    const createdAdmin: AuthenticatedUser = {
      id: adminId,
      name: name.trim(),
      username: username?.trim() || 'admin',
      email: email?.trim(),
      phone: phone?.trim(),
      role: 'ADMIN',
      active: true,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };

    const session = await createSession(createdAdmin);

    await logAudit({
      userId: adminId,
      userName: name.trim(),
      action: 'SETUP_FIRST_ADMIN',
      entityType: 'USER',
      entityId: adminId,
      details: { username: username || 'admin', email },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      user: createdAdmin,
      session,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao inicializar administrador.' });
  }
});

// User Login
router.post('/auth/login', async (req, res) => {
  try {
    await ensureDefaultAdminUser();
    const { userId, username, password } = req.body;
    if (!password || !password.trim()) {
      res.status(400).json({ error: 'Informe a senha de acesso.' });
      return;
    }

    const loginIdentifier = (username || userId || '').trim();
    let userRow: any = null;

    if (loginIdentifier) {
      userRow = await db.get(
        'SELECT * FROM users WHERE (id = ? OR username = ? OR email = ? OR name = ?) AND active = 1 LIMIT 1',
        [loginIdentifier, loginIdentifier, loginIdentifier, loginIdentifier]
      );
    } else {
      userRow = await db.get("SELECT * FROM users WHERE role = 'ADMIN' AND active = 1 LIMIT 1");
    }

    if (!userRow) {
      res.status(404).json({ error: 'Usuário não encontrado ou inativo no sistema.' });
      return;
    }

    if (!userRow.password_hash) {
      res.status(400).json({
        error: 'Usuário ainda não possui senha cadastrada. Solicite a definição pelo Administrador.',
      });
      return;
    }

    const isValid = await verifyPassword(password.trim(), userRow.password_hash);
    if (!isValid) {
      await logAudit({
        userId: userRow.id,
        userName: userRow.name,
        action: 'FAILED_LOGIN_ATTEMPT',
        entityType: 'AUTH',
        entityId: userRow.id,
        ipAddress: req.ip,
      });

      res.status(401).json({ error: 'Senha incorreta. Verifique e tente novamente.' });
      return;
    }

    const user: AuthenticatedUser = {
      id: userRow.id,
      name: userRow.name,
      username: userRow.username || undefined,
      email: userRow.email || undefined,
      phone: userRow.phone || undefined,
      role: userRow.role,
      active: Number(userRow.active) === 1,
      mustChangePassword: Number(userRow.must_change_password) === 1,
      isTestUser: Number(userRow.is_test_user) === 1,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
    };

    const session = await createSession(user);

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      user,
      session,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao realizar autenticação.' });
  }
});

// Logout
router.post('/auth/logout', async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (token) {
      await invalidateSession(token);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: true });
  }
});

// Change Password
router.post('/auth/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword, targetUserId } = req.body;
    const userIdToUpdate = req.user!.role === 'ADMIN' && targetUserId ? targetUserId : req.user!.id;

    if (!newPassword || newPassword.trim().length < 4) {
      res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
      return;
    }

    const targetRow = await db.get<any>('SELECT * FROM users WHERE id = ?', [userIdToUpdate]);
    if (!targetRow) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    // Verification of current password:
    // - Mandatory first-access / temporary password change (must_change_password === 1): user just logged in with temporary password, no current password required.
    // - Admin changing another user's password: no current password required.
    // - Voluntary self-service password change: requires current password validation.
    const isMandatoryChange = Number(targetRow.must_change_password) === 1;
    const isAdminManagingOther = req.user!.role === 'ADMIN' && targetUserId && targetUserId !== req.user!.id;

    if (!isMandatoryChange && !isAdminManagingOther) {
      if (targetRow.password_hash) {
        if (!currentPassword) {
          res.status(400).json({ error: 'Informe a senha atual para continuar.' });
          return;
        }
        const valid = await verifyPassword(currentPassword, targetRow.password_hash);
        if (!valid) {
          res.status(401).json({ error: 'A senha atual está incorreta.' });
          return;
        }
      }
    }

    const newHash = await hashPassword(newPassword.trim());
    await db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
      [newHash, new Date().toISOString(), userIdToUpdate]
    );

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CHANGE_PASSWORD',
      entityType: 'USER',
      entityId: userIdToUpdate,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao alterar senha.' });
  }
});

// -----------------------------------------------------------------------------
// USERS CRUD
// -----------------------------------------------------------------------------

router.get('/users', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT id, name, username, email, phone, role, active, must_change_password, is_test_user, created_at, updated_at FROM users ORDER BY name ASC');
    const users = rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username || undefined,
      email: r.email || undefined,
      phone: r.phone || undefined,
      role: r.role,
      active: Number(r.active) === 1,
      mustChangePassword: Number(r.must_change_password) === 1,
      isTestUser: Number(r.is_test_user) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar usuários.' });
  }
});

router.post('/users', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, username, email, phone, role, initialPassword, mustChangePassword, isTestUser } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nome do usuário é obrigatório.' });
      return;
    }

    const assignedRole = role === 'ADMINISTRADOR' ? 'ADMIN' : (role || 'VENDEDOR');
    const newId = `usr-${assignedRole.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const rawPassword = (initialPassword && initialPassword.trim()) || '1234';
    const hash = await hashPassword(rawPassword);

    await db.run(
      `INSERT INTO users (
        id, name, username, email, phone, role, password_hash, active, must_change_password, is_test_user, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        isTestUser ? 1 : 0,
        now,
        now,
      ]
    );

    const created = {
      id: newId,
      name: name.trim(),
      username: username?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      role: assignedRole === 'ADMIN' ? 'ADMINISTRADOR' : assignedRole,
      active: true,
      mustChangePassword: !!mustChangePassword,
      isTestUser: !!isTestUser,
      createdAt: now,
      updatedAt: now,
    };

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newId,
      details: { name: created.name, role: created.role, isTestUser: created.isTestUser },
      ipAddress: req.ip,
    });

    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao criar usuário.' });
  }
});

router.put('/users/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, phone, role, active, mustChangePassword, newPassword, isTestUser } = req.body;

    const existing = await db.get<any>('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    let passwordHash = existing.password_hash;
    if (newPassword && newPassword.trim()) {
      passwordHash = await hashPassword(newPassword.trim());
    }

    const assignedRole = role !== undefined ? (role === 'ADMINISTRADOR' ? 'ADMIN' : role) : existing.role;

    const now = new Date().toISOString();
    await db.run(
      `UPDATE users SET
        name = ?, username = ?, email = ?, phone = ?, role = ?, password_hash = ?,
        active = ?, must_change_password = ?, is_test_user = ?, updated_at = ?
      WHERE id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        username !== undefined ? username?.trim() || null : existing.username,
        email !== undefined ? email?.trim() || null : existing.email,
        phone !== undefined ? phone?.trim() || null : existing.phone,
        assignedRole,
        passwordHash,
        active !== undefined ? (active ? 1 : 0) : existing.active,
        mustChangePassword !== undefined ? (mustChangePassword ? 1 : 0) : existing.must_change_password,
        isTestUser !== undefined ? (isTestUser ? 1 : 0) : existing.is_test_user,
        now,
        id,
      ]
    );

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      details: { name, role, active, isTestUser },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar usuário.' });
  }
});

router.delete('/users/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      res.status(400).json({ error: 'Você não pode excluir o seu próprio usuário conectado.' });
      return;
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir usuário.' });
  }
});

// -----------------------------------------------------------------------------
// CUSTOMERS CRUD
// -----------------------------------------------------------------------------

router.get('/customers', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM customers ORDER BY name ASC');
    const customers = rows.map((r) => ({
      id: r.id,
      name: r.name,
      tradeName: r.trade_name || undefined,
      type: r.type,
      cpfCnpj: r.cpf_cnpj || undefined,
      rgIe: r.rg_ie || undefined,
      phone: r.phone || undefined,
      whatsapp: r.whatsapp || undefined,
      email: r.email || undefined,
      address: r.address || undefined,
      number: r.number || undefined,
      complement: r.complement || undefined,
      neighborhood: r.neighborhood || undefined,
      city: r.city || undefined,
      state: r.state || undefined,
      cep: r.cep || undefined,
      notes: r.notes || undefined,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar clientes.' });
  }
});

router.post('/customers', async (req: AuthRequest, res) => {
  try {
    const c = req.body;
    if (!c.name || !c.name.trim()) {
      res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
      return;
    }

    const id = c.id || `cust-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    // Check if test user operation: do not persist to real database
    if (req.user?.isTestUser || c.isTestCustomer) {
      res.json({ ...c, id, createdAt: c.createdAt || now, updatedAt: now, isTest: true });
      return;
    }

    await db.run(
      `INSERT OR REPLACE INTO customers (
        id, name, trade_name, type, cpf_cnpj, rg_ie, phone, whatsapp, email,
        address, number, complement, neighborhood, city, state, cep, notes, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        c.name.trim(),
        c.tradeName?.trim() || null,
        c.type || 'PF',
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
        now,
      ]
    );

    const saved = { ...c, id, createdAt: c.createdAt || now, updatedAt: now };

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'SAVE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { name: saved.name, phone: saved.phone },
      ipAddress: req.ip,
    });

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar cliente.' });
  }
});

router.delete('/customers/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM customers WHERE id = ?', [id]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir cliente.' });
  }
});

// -----------------------------------------------------------------------------
// MEDIA & FILE UPLOADS
// -----------------------------------------------------------------------------

router.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    const filePath = path.join(uploadsDir, filename);

    // Servir arquivo de imagem diretamente do disco local
    if (fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.sendFile(filePath);
      return;
    }

    res.status(404).json({ error: 'Imagem não encontrada no diretório local de uploads.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao servir arquivo de imagem.' });
  }
});

router.post('/upload/image', async (req: AuthRequest, res) => {
  try {
    const { data, prefix } = req.body;
    if (!data || typeof data !== 'string') {
      res.status(400).json({ error: 'Dados da imagem não fornecidos.' });
      return;
    }

    if (!data.startsWith('data:image/')) {
      res.status(400).json({ error: 'Formato inválido. Deve ser um data URL de imagem (data:image/...).' });
      return;
    }

    const result = await saveBase64Image(data, prefix || 'item');
    res.json({
      success: true,
      url: result.url,
      filename: result.filename,
    });
  } catch (err: any) {
    console.error('Erro no upload de imagem:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar upload da imagem.' });
  }
});

// -----------------------------------------------------------------------------
// GOOGLE DRIVE STREAMING PROXY & METADATA CHECK (ZERO LOCAL STORAGE)
// -----------------------------------------------------------------------------

router.get('/drive/image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      res.status(400).json({ error: 'ID do arquivo do Google Drive inválido.' });
      return;
    }

    const authHeader = req.headers['authorization'] || (req.query.token ? `Bearer ${req.query.token}` : null);

    // 1. If access token is provided, stream directly from Google Drive v3 API
    if (authHeader) {
      try {
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const driveRes = await fetch(driveUrl, {
          headers: { Authorization: String(authHeader) },
        });

        if (driveRes.ok) {
          const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');
          const arrayBuf = await driveRes.arrayBuffer();
          res.send(Buffer.from(arrayBuf));
          return;
        }
      } catch (streamErr) {
        console.warn('Drive stream with token fallback:', streamErr);
      }
    }

    // 2. High-res CDN thumbnail fallback (works for public files or shared with link)
    try {
      const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
      const cdnRes = await fetch(thumbUrl, { redirect: 'follow' });
      if (cdnRes.ok) {
        const cType = cdnRes.headers.get('content-type') || 'image/jpeg';
        if (!cType.includes('text/html')) {
          res.setHeader('Content-Type', cType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          const buf = await cdnRes.arrayBuffer();
          res.send(Buffer.from(buf));
          return;
        }
      }
    } catch {}

    res.status(404).json({ error: 'A imagem não está mais disponível no Google Drive.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao transmitir imagem do Google Drive.' });
  }
});

router.get('/drive/file-info/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      res.status(400).json({ available: false, error: 'ID do arquivo inválido.' });
      return;
    }

    const authHeader = req.headers['authorization'] || (req.query.token ? `Bearer ${req.query.token}` : null);
    if (!authHeader) {
      // Test direct thumbnail reachability
      try {
        const testRes = await fetch(`https://drive.google.com/thumbnail?id=${fileId}&sz=w200`, { method: 'HEAD', redirect: 'follow' });
        res.json({ available: testRes.ok && testRes.status === 200 });
      } catch {
        res.json({ available: false });
      }
      return;
    }

    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink,trashed`,
      { headers: { Authorization: String(authHeader) } }
    );

    if (!metaRes.ok) {
      res.json({
        available: false,
        status: metaRes.status,
        reason: metaRes.status === 404 ? 'not_found' : 'unauthorized',
      });
      return;
    }

    const meta = await metaRes.json();
    if (meta.trashed) {
      res.json({ available: false, reason: 'trashed' });
      return;
    }

    res.json({ available: true, file: meta });
  } catch (err: any) {
    res.status(500).json({ available: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// ITEMS & PRODUCTS CRUD
// -----------------------------------------------------------------------------

router.get('/items', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM items ORDER BY name ASC');
    const items = rows.map((r) => {
      let extra: any = {};
      if (r.data_json) {
        try {
          extra = JSON.parse(r.data_json);
        } catch {}
      }

      const baseItem = extra && typeof extra === 'object' && extra.id ? extra : {};
      return {
        ...baseItem,
        id: r.id,
        name: r.name,
        sku: r.sku !== null && r.sku !== undefined ? r.sku : (baseItem.sku || undefined),
        barcode: r.barcode !== null && r.barcode !== undefined ? r.barcode : (baseItem.barcode || undefined),
        categoryId: r.category_id !== null && r.category_id !== undefined ? r.category_id : (baseItem.categoryId || ''),
        type: r.type || baseItem.type || 'PRODUTO_FISICO',
        description: r.description !== null && r.description !== undefined ? r.description : (baseItem.description || ''),
        costPrice: r.cost_price !== null && r.cost_price !== undefined ? Number(r.cost_price) : (baseItem.costPrice || 0),
        supplierCost: r.supplier_cost !== null && r.supplier_cost !== undefined ? Number(r.supplier_cost) : (baseItem.supplierCost || 0),
        supplierFreight: r.supplier_freight !== null && r.supplier_freight !== undefined ? Number(r.supplier_freight) : (baseItem.supplierFreight || 0),
        salePrice: r.sale_price !== null && r.sale_price !== undefined ? Number(r.sale_price) : (baseItem.salePrice || 0),
        marginReais: r.margin_reais !== null && r.margin_reais !== undefined ? Number(r.margin_reais) : (baseItem.marginReais || 0),
        marginPercent: r.margin_percent !== null && r.margin_percent !== undefined ? Number(r.margin_percent) : (baseItem.marginPercent || 0),
        stock: r.stock !== null && r.stock !== undefined ? Number(r.stock) : (baseItem.stock || 0),
        minStock: r.min_stock !== null && r.min_stock !== undefined ? Number(r.min_stock) : (baseItem.minStock || 0),
        unit: r.unit || baseItem.unit || 'UN',
        imageUrl: (r.image_url && r.image_url.trim()) ? r.image_url.trim() : (baseItem.imageUrl || ''),
        imageSource: r.image_source || baseItem.imageSource || ((r.image_url && r.image_url.trim()) ? 'upload' : undefined),
        imageOriginalUrl: r.image_original_url || baseItem.imageOriginalUrl,
        googleMediaId: r.google_media_id || baseItem.googleMediaId,
        googleDriveFileId: r.google_drive_file_id || baseItem.googleDriveFileId,
        googleDriveFileName: r.google_drive_file_name || baseItem.googleDriveFileName,
        googleDriveMimeType: r.google_drive_mime_type || baseItem.googleDriveMimeType,
        googleDriveThumbnailUrl: r.google_drive_thumbnail_url || baseItem.googleDriveThumbnailUrl,
        googleDriveAccount: r.google_drive_account || baseItem.googleDriveAccount,
        imageMetadata: r.image_metadata_json ? JSON.parse(r.image_metadata_json) : baseItem.imageMetadata,
        showInCatalog: r.show_in_catalog !== null && r.show_in_catalog !== undefined ? Number(r.show_in_catalog) === 1 : (baseItem.showInCatalog !== false),
        featuredInCatalog: r.featured_in_catalog !== null && r.featured_in_catalog !== undefined ? Number(r.featured_in_catalog) === 1 : !!baseItem.featuredInCatalog,
        pricingModel: r.pricing_model !== null && r.pricing_model !== undefined ? r.pricing_model : baseItem.pricingModel,
        productionType: r.production_type !== null && r.production_type !== undefined ? r.production_type : baseItem.productionType,
        leadTime: r.lead_time !== null && r.lead_time !== undefined ? r.lead_time : baseItem.leadTime,
        requiresFile: r.requires_file !== null && r.requires_file !== undefined ? Number(r.requires_file) === 1 : !!baseItem.requiresFile,
        brand: r.brand !== null && r.brand !== undefined ? r.brand : baseItem.brand,
        supplier: r.supplier !== null && r.supplier !== undefined ? r.supplier : baseItem.supplier,
        priceRules: r.price_rules_json ? JSON.parse(r.price_rules_json) : baseItem.priceRules,
        packages: r.packages_json ? JSON.parse(r.packages_json) : baseItem.packages,
        areaPricing: r.area_pricing_json ? JSON.parse(r.area_pricing_json) : baseItem.areaPricing,
        variants: r.variants_json ? JSON.parse(r.variants_json) : baseItem.variants,
        estimatedTime: r.estimated_time !== null && r.estimated_time !== undefined ? r.estimated_time : baseItem.estimatedTime,
        serviceFields: r.service_fields_json ? JSON.parse(r.service_fields_json) : baseItem.serviceFields,
        serviceUrl: r.service_url !== null && r.service_url !== undefined ? r.service_url : (baseItem.serviceUrl || baseItem.url),
        url: r.service_url !== null && r.service_url !== undefined ? r.service_url : (baseItem.serviceUrl || baseItem.url),
        options: r.options_json ? JSON.parse(r.options_json) : baseItem.options,
        active: r.active !== null && r.active !== undefined ? Number(r.active) === 1 : (baseItem.active !== false),
        createdAt: r.created_at || baseItem.createdAt,
        updatedAt: r.updated_at || baseItem.updatedAt,
      };
    });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar itens.' });
  }
});

router.post('/items', async (req: AuthRequest, res) => {
  try {
    const item = req.body;
    if (!item.name || !item.name.trim()) {
      res.status(400).json({ error: 'Nome do item é obrigatório.' });
      return;
    }

    const id = item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    // Check if test user operation: do not persist to real database
    if (req.user?.isTestUser || item.isTestItem) {
      res.json({ ...item, id, createdAt: item.createdAt || now, updatedAt: now, isTest: true });
      return;
    }
    const cost = Number(item.costPrice) || 0;
    const supplierCost = Number(item.supplierCost) || 0;
    const supplierFreight = Number(item.supplierFreight) || 0;
    const sale = Number(item.salePrice) || 0;
    const marginReais = item.marginReais !== undefined ? Number(item.marginReais) : Number((sale - cost).toFixed(2));
    const marginPercent = item.marginPercent !== undefined ? Number(item.marginPercent) : (sale > 0 ? Number(((marginReais / sale) * 100).toFixed(2)) : 0);

    // Convert base64 data URL to permanent uploaded file URL
    if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('data:image/')) {
      try {
        const uploadRes = await saveBase64Image(item.imageUrl, 'item');
        item.imageUrl = uploadRes.url;
      } catch (e) {
        console.warn('Notice converting base64 imageUrl to upload file:', e);
      }
    }

    const insertItemSql = `INSERT OR REPLACE INTO items (
        id, name, sku, barcode, category_id, type, description, cost_price, supplier_cost, supplier_freight,
        sale_price, margin_reais, margin_percent, stock, min_stock, unit, image_url, image_source, image_original_url,
        google_media_id, google_drive_file_id, google_drive_file_name, google_drive_mime_type, google_drive_thumbnail_url, google_drive_account,
        image_metadata_json, show_in_catalog, featured_in_catalog, pricing_model, production_type,
        lead_time, requires_file, brand, supplier, price_rules_json, packages_json, area_pricing_json, variants_json,
        estimated_time, service_fields_json, service_url, options_json, data_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const insertParams = [
      id,
      item.name.trim(),
      item.sku?.trim() || null,
      item.barcode?.trim() || null,
      item.categoryId || '',
      item.type || 'PRODUTO_FISICO',
      item.description?.trim() || '',
      cost,
      supplierCost,
      supplierFreight,
      sale,
      marginReais,
      marginPercent,
      Number(item.stock) || 0,
      Number(item.minStock) || 0,
      item.unit || 'UN',
      item.imageUrl?.trim() || '',
      item.imageSource || (item.imageUrl ? 'upload' : null),
      item.imageOriginalUrl || null,
      item.googleMediaId || null,
      item.googleDriveFileId || null,
      item.googleDriveFileName || null,
      item.googleDriveMimeType || null,
      item.googleDriveThumbnailUrl || null,
      item.googleDriveAccount || null,
      item.imageMetadata ? JSON.stringify(item.imageMetadata) : null,
      item.showInCatalog !== false ? 1 : 0,
      item.featuredInCatalog ? 1 : 0,
      item.pricingModel || null,
      item.productionType || null,
      item.leadTime || null,
      item.requiresFile ? 1 : 0,
      item.brand || null,
      item.supplier || null,
      item.priceRules ? JSON.stringify(item.priceRules) : null,
      item.packages ? JSON.stringify(item.packages) : null,
      item.areaPricing ? JSON.stringify(item.areaPricing) : null,
      item.variants ? JSON.stringify(item.variants) : null,
      item.estimatedTime || null,
      item.serviceFields ? JSON.stringify(item.serviceFields) : null,
      item.serviceUrl?.trim() || item.url?.trim() || null,
      item.options ? JSON.stringify(item.options) : null,
      JSON.stringify(item),
      item.active !== false ? 1 : 0,
      item.createdAt || now,
      now,
    ];

    try {
      await db.run(insertItemSql, insertParams);
    } catch (insertErr: any) {
      if (insertErr?.message && (insertErr.message.includes('service_url') || insertErr.message.includes('no column named'))) {
        try {
          const { ensureAllTableColumns } = await import('./db');
          await ensureAllTableColumns();
          await db.run(insertItemSql, insertParams);
        } catch {
          throw insertErr;
        }
      } else {
        throw insertErr;
      }
    }

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'SAVE_ITEM',
      entityType: 'ITEM',
      entityId: id,
      details: { name: item.name, salePrice: sale, costPrice: cost },
      ipAddress: req.ip,
    });

    persistDatabase();

    broadcastSync('items-updated', { id, showInCatalog: item.showInCatalog !== false });
    broadcastSync('catalog-updated', { type: 'item', id });

    res.json({ ...item, id, marginReais, marginPercent, updatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar item.' });
  }
});

router.post('/items/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Array de itens inválido.' });
      return;
    }

    const now = new Date().toISOString();
    for (const item of items) {
      if (!item.name || !item.name.trim()) continue;
      const id = item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const cost = Number(item.costPrice) || 0;
      const supplierCost = Number(item.supplierCost) || 0;
      const supplierFreight = Number(item.supplierFreight) || 0;
      const sale = Number(item.salePrice) || 0;
      const marginReais = item.marginReais !== undefined ? Number(item.marginReais) : Number((sale - cost).toFixed(2));
      const marginPercent = item.marginPercent !== undefined ? Number(item.marginPercent) : (sale > 0 ? Number(((marginReais / sale) * 100).toFixed(2)) : 0);

      // Convert base64 data URL to permanent uploaded file URL
      if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('data:image/')) {
        try {
          const uploadRes = await saveBase64Image(item.imageUrl, 'item');
          item.imageUrl = uploadRes.url;
        } catch (e) {
          console.warn('Notice converting base64 batch imageUrl to upload file:', e);
        }
      }

      const batchSql = `INSERT OR REPLACE INTO items (
          id, name, sku, barcode, category_id, type, description, cost_price, supplier_cost, supplier_freight,
          sale_price, margin_reais, margin_percent, stock, min_stock, unit, image_url, image_source, image_original_url,
          google_media_id, google_drive_file_id, google_drive_file_name, google_drive_mime_type, google_drive_thumbnail_url, google_drive_account,
          image_metadata_json, show_in_catalog, featured_in_catalog, pricing_model, production_type,
          lead_time, requires_file, brand, supplier, price_rules_json, packages_json, area_pricing_json, variants_json,
          estimated_time, service_fields_json, service_url, options_json, data_json, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const batchParams = [
        id,
        item.name.trim(),
        item.sku?.trim() || null,
        item.barcode?.trim() || null,
        item.categoryId || '',
        item.type || 'PRODUTO_FISICO',
        item.description?.trim() || '',
        cost,
        supplierCost,
        supplierFreight,
        sale,
        marginReais,
        marginPercent,
        Number(item.stock) || 0,
        Number(item.minStock) || 0,
        item.unit || 'UN',
        item.imageUrl?.trim() || '',
        item.imageSource || (item.imageUrl ? 'upload' : null),
        item.imageOriginalUrl || null,
        item.googleMediaId || null,
        item.googleDriveFileId || null,
        item.googleDriveFileName || null,
        item.googleDriveMimeType || null,
        item.googleDriveThumbnailUrl || null,
        item.googleDriveAccount || null,
        item.imageMetadata ? JSON.stringify(item.imageMetadata) : null,
        item.showInCatalog !== false ? 1 : 0,
        item.featuredInCatalog ? 1 : 0,
        item.pricingModel || null,
        item.productionType || null,
        item.leadTime || null,
        item.requiresFile ? 1 : 0,
        item.brand || null,
        item.supplier || null,
        item.priceRules ? JSON.stringify(item.priceRules) : null,
        item.packages ? JSON.stringify(item.packages) : null,
        item.areaPricing ? JSON.stringify(item.areaPricing) : null,
        item.variants ? JSON.stringify(item.variants) : null,
        item.estimatedTime || null,
        item.serviceFields ? JSON.stringify(item.serviceFields) : null,
        item.serviceUrl?.trim() || item.url?.trim() || null,
        item.options ? JSON.stringify(item.options) : null,
        JSON.stringify(item),
        item.active !== false ? 1 : 0,
        item.createdAt || now,
        now,
      ];

      try {
        await db.run(batchSql, batchParams);
      } catch (batchErr: any) {
        if (batchErr?.message && (batchErr.message.includes('service_url') || batchErr.message.includes('no column named'))) {
          try {
            const { ensureAllTableColumns } = await import('./db');
            await ensureAllTableColumns();
            await db.run(batchSql, batchParams);
          } catch {}
        }
      }
    }

    try {
      await logAudit({
        userId: (req as any).user?.id,
        userName: (req as any).user?.name,
        action: 'BATCH_SAVE_ITEMS',
        entityType: 'ITEM',
        entityId: 'batch',
        details: { count: items.length },
        ipAddress: req.ip,
      });
    } catch {}

    persistDatabase();

    broadcastSync('items-updated', { count: items.length });
    broadcastSync('catalog-updated', { type: 'items-batch' });

    res.json({ success: true, count: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar itens em lote.' });
  }
});

router.delete('/items/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM items WHERE id = ?', [id]);

    // Also delete any associated online service entry to prevent resurrection
    const srvId = id.startsWith('prod-srv-') ? id.replace('prod-srv-', 'srv-') : id;
    await db.run('DELETE FROM online_services WHERE id = ? OR id = ?', [id, srvId]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DELETE_ITEM',
      entityType: 'ITEM',
      entityId: id,
      ipAddress: req.ip,
    });

    persistDatabase();

    broadcastSync('items-updated', { id, deleted: true });
    broadcastSync('catalog-updated', { type: 'item-deleted', id });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir item.' });
  }
});

// -----------------------------------------------------------------------------
// CATEGORIES CRUD
// -----------------------------------------------------------------------------

router.get('/categories', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug || undefined,
      description: r.description || undefined,
      itemType: r.item_type || undefined,
      icon: r.icon || undefined,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar categorias.' });
  }
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const c = req.body;
    if (!c.name || !c.name.trim()) {
      res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
      return;
    }
    const id = c.id || `cat-${Date.now()}`;
    const now = new Date().toISOString();
    await db.run(
      'INSERT OR REPLACE INTO categories (id, name, slug, description, item_type, icon, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        c.name.trim(),
        c.slug?.trim() || c.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        c.description?.trim() || '',
        c.itemType || null,
        c.icon || null,
        c.active !== false ? 1 : 0,
        c.createdAt || now,
        now,
      ]
    );

    persistDatabase();

    broadcastSync('categories-updated', { id });
    broadcastSync('catalog-updated', { type: 'category', id });

    res.json({
      id,
      name: c.name.trim(),
      slug: c.slug?.trim() || c.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      description: c.description?.trim() || undefined,
      itemType: c.itemType || undefined,
      icon: c.icon || undefined,
      active: c.active !== false,
      createdAt: c.createdAt || now,
      updatedAt: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar categoria no banco de dados.' });
  }
});

router.post('/categories/batch', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      res.status(400).json({ error: 'Array de categorias inválido.' });
      return;
    }
    const now = new Date().toISOString();
    for (const c of categories) {
      if (!c.name || !c.name.trim()) continue;
      const id = c.id || `cat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await db.run(
        'INSERT OR REPLACE INTO categories (id, name, slug, description, item_type, icon, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          c.name.trim(),
          c.slug?.trim() || c.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
          c.description?.trim() || '',
          c.itemType || null,
          c.icon || null,
          c.active !== false ? 1 : 0,
          c.createdAt || now,
          now,
        ]
      );
    }

    persistDatabase();

    broadcastSync('categories-updated', { count: categories.length });
    broadcastSync('catalog-updated', { type: 'categories-batch' });

    res.json({ success: true, count: categories.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar categorias em lote.' });
  }
});

router.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    persistDatabase();

    broadcastSync('categories-updated', { id: req.params.id, deleted: true });
    broadcastSync('catalog-updated', { type: 'category-deleted', id: req.params.id });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir categoria.' });
  }
});

// -----------------------------------------------------------------------------
// PRODUCT SEPARATIONS CRUD (Categorias Principais / Separações de Produtos)
// -----------------------------------------------------------------------------

router.get('/product-separations', async (req, res) => {
  try {
    // Ensure table exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_separations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        is_system INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        behavior TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Ensure behavior column exists if table was created previously without it
    try {
      await db.run('ALTER TABLE product_separations ADD COLUMN behavior TEXT');
    } catch {
      // Column already exists
    }

    const defaultSeps = [
      { id: 'PRODUTO_GRAFICO', name: 'Gráficos', description: 'Materiais gráficos e impressos', icon: 'Layers', sort_order: 1, behavior: 'GRAFICO' },
      { id: 'PRODUTO_FISICO', name: 'Físicos', description: 'Produtos físicos e itens de estoque', icon: 'Package', sort_order: 2, behavior: 'FISICO' },
      { id: 'SERVICO', name: 'Serviços', description: 'Serviços digitais e atendimento', icon: 'Globe', sort_order: 3, behavior: 'SERVICO' },
    ];

    // Ensure PRODUTO_PERSONALIZADO is purged from database
    await db.run("DELETE FROM product_separations WHERE id = 'PRODUTO_PERSONALIZADO'");

    const now = new Date().toISOString();
    for (const s of defaultSeps) {
      await db.run(
        `INSERT OR IGNORE INTO product_separations (id, name, description, icon, is_system, sort_order, behavior, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        [s.id, s.name, s.description, s.icon, s.sort_order, s.behavior, now, now]
      );
    }

    // Update behavior for any existing rows where behavior is null
    await db.run("UPDATE product_separations SET behavior = 'GRAFICO' WHERE behavior IS NULL AND (id = 'PRODUTO_GRAFICO' OR LOWER(name) LIKE '%personaliz%' OR LOWER(id) LIKE '%personaliz%')");
    await db.run("UPDATE product_separations SET behavior = 'SERVICO' WHERE behavior IS NULL AND id = 'SERVICO'");
    await db.run("UPDATE product_separations SET behavior = 'FISICO' WHERE behavior IS NULL");

    const rows = await db.all<any>(
      'SELECT * FROM product_separations ORDER BY sort_order ASC, name ASC'
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        icon: r.icon || undefined,
        isSystem: Number(r.is_system) === 1,
        sortOrder: Number(r.sort_order) || 0,
        behavior: r.behavior || (r.id === 'PRODUTO_GRAFICO' || (r.name && r.name.toLowerCase().includes('personaliz')) ? 'GRAFICO' : r.id === 'SERVICO' ? 'SERVICO' : 'FISICO'),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar separações de produtos.' });
  }
});

router.post('/product-separations', async (req: AuthRequest, res) => {
  try {
    const s = req.body;
    if (!s.name || !s.name.trim()) {
      res.status(400).json({ error: 'O nome da separação/categoria é obrigatório.' });
      return;
    }

    const isSystemId = s.id === 'PRODUTO_GRAFICO' || s.id === 'PRODUTO_FISICO' || s.id === 'SERVICO';
    const cleanName = s.name.trim();
    const slug = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
    const id = s.id || `sep_${slug}_${Date.now()}`;
    const now = new Date().toISOString();

    await db.run(`
      CREATE TABLE IF NOT EXISTS product_separations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        is_system INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        behavior TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    try {
      await db.run('ALTER TABLE product_separations ADD COLUMN behavior TEXT');
    } catch {
      // ignore
    }

    // Check if updating existing
    const existing = await db.get<any>('SELECT * FROM product_separations WHERE id = ?', [id]);
    const isSystem = isSystemId || (existing && Number(existing.is_system) === 1) ? 1 : 0;
    const sortOrder = s.sortOrder !== undefined ? Number(s.sortOrder) : (existing ? Number(existing.sort_order) : 10);
    const behavior = s.behavior || (id === 'PRODUTO_GRAFICO' || cleanName.toLowerCase().includes('personaliz') ? 'GRAFICO' : id === 'SERVICO' ? 'SERVICO' : 'FISICO');

    await db.run(
      `INSERT OR REPLACE INTO product_separations (id, name, description, icon, is_system, sort_order, behavior, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanName,
        s.description?.trim() || '',
        s.icon || 'Package',
        isSystem,
        sortOrder,
        behavior,
        existing?.created_at || s.createdAt || now,
        now,
      ]
    );

    persistDatabase();

    broadcastSync('product-separations-updated', { id, name: cleanName });
    broadcastSync('catalog-updated', { type: 'product-separation', id });

    res.json({
      id,
      name: cleanName,
      description: s.description?.trim() || undefined,
      icon: s.icon || 'Package',
      isSystem: isSystem === 1,
      sortOrder,
      createdAt: existing?.created_at || s.createdAt || now,
      updatedAt: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar separação de produtos.' });
  }
});

router.delete('/product-separations/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { transferToId } = req.body || {};

    if (id === 'PRODUTO_GRAFICO' || id === 'PRODUTO_FISICO' || id === 'SERVICO') {
      res.status(400).json({
        error: 'As separações padrão do sistema (Gráficos, Físicos e Serviços) são fundamentais e não podem ser excluídas.',
      });
      return;
    }

    // Check how many items currently use this separation
    const itemCountRow = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM items WHERE type = ?',
      [id]
    );
    const count = Number(itemCountRow?.count || 0);

    let transferredCount = 0;
    if (count > 0) {
      if (!transferToId) {
        res.status(400).json({
          error: `Existem ${count} produto(s) vinculados a esta separação. Selecione uma categoria destino para transferi-los antes de excluir.`,
          count,
          requiresTransfer: true,
        });
        return;
      }

      // Transfer items to target separation
      const now = new Date().toISOString();
      await db.run(
        'UPDATE items SET type = ?, updated_at = ? WHERE type = ?',
        [transferToId, now, id]
      );
      transferredCount = count;
      broadcastSync('items-updated', { count: transferredCount });
    }

    await db.run('DELETE FROM product_separations WHERE id = ?', [id]);
    persistDatabase();

    broadcastSync('product-separations-updated', { id, deleted: true, transferToId });
    broadcastSync('catalog-updated', { type: 'separation-deleted', id });

    res.json({ success: true, transferredCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir separação de produtos.' });
  }
});

// -----------------------------------------------------------------------------
// SALES CRUD & PAYMENTS
// -----------------------------------------------------------------------------

router.get('/sales', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM sales ORDER BY created_at DESC');
    const sales = rows.map((r) => ({
      id: r.id,
      saleNumber: r.sale_code || (r.sale_number ? String(r.sale_number) : (r.id || '')),
      customerId: r.customer_id || undefined,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || undefined,
      customerEmail: r.customer_email || undefined,
      sellerId: r.seller_id || undefined,
      sellerName: r.seller_name,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      addition: Number(r.addition),
      total: Number(r.total),
      paidAmount: Number(r.paid_amount),
      remainingAmount: Number(r.remaining_amount),
      status: r.status || ((r.payment_status === 'CANCELADO' || r.is_deleted === 1) ? 'CANCELADA' : 'CONCLUIDA'),
      isDeleted: Boolean(r.is_deleted === 1 || r.deleted_at || r.status === 'EXCLUIDA'),
      deletedAt: r.deleted_at || undefined,
      deletedBy: r.deleted_by || undefined,
      deletedByName: r.deleted_by_name || undefined,
      deletionReason: r.deletion_reason || undefined,
      editHistory: r.edit_history_json ? JSON.parse(r.edit_history_json) : [],
      paymentStatus: r.payment_status || 'PAGO',
      paymentMethod: r.payment_method || (r.payment_status === 'A_PRAZO' ? 'A Prazo' : 'DINHEIRO'),
      payments: r.payments_json ? JSON.parse(r.payments_json) : [],
      items: JSON.parse(r.items_json),
      notes: r.notes || undefined,
      invoiceStatus: r.invoice_status || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(sales);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar vendas.' });
  }
});

router.post('/sales', async (req: AuthRequest, res) => {
  try {
    const s = req.body;
    const now = new Date().toISOString();
    const id = s.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    // Check if test user operation: do not persist to real database
    if (req.user?.isTestUser || s.isTestSale) {
      res.json({ ...s, id, createdAt: s.createdAt || now, updatedAt: now, isTest: true });
      return;
    }

    // Auto-increment sale number if not provided
    let saleNum = s.saleNumber || s.code;
    if (!saleNum) {
      const maxNum = await db.get<{ m: number }>('SELECT MAX(sale_number) as m FROM sales');
      const nextCount = (Number(maxNum?.m) || 1000) + 1;
      saleNum = `VND-${new Date().getFullYear()}-${String(nextCount).padStart(4, '0')}`;
    }

    const saleNumberStr = String(saleNum);
    const saleNumberNumeric = parseInt(saleNumberStr.replace(/\D/g, ''), 10) || 1;
    const updatedAt = s.updatedAt || now;
    const createdAt = s.createdAt || now;
    const subtotal = Number(s.subtotal) || 0;
    const discount = Number(s.discount) || 0;
    const addition = Number(s.addition) || 0;
    const total = Number(s.total) || 0;
    const paidAmount = Number(s.paidAmount) || 0;
    const remainingAmount = Number(s.remainingAmount !== undefined ? s.remainingAmount : Math.max(0, total - paidAmount));
    
    // Regra Venda a Prazo: se o status for A_PRAZO, deve permanecer A_PRAZO até confirmação manual do vendedor
    const paymentStatus = s.paymentStatus === 'A_PRAZO'
      ? 'A_PRAZO'
      : (s.paymentStatus || (remainingAmount <= 0 ? 'PAGO' : (paidAmount > 0 ? 'PARCIALMENTE_PAGO' : 'PENDENTE')));
    const paymentMethod = s.paymentMethod || (paymentStatus === 'A_PRAZO' ? 'A Prazo' : 'DINHEIRO');
    const paymentsJson = s.payments ? JSON.stringify(s.payments) : JSON.stringify([]);
    const itemsJson = JSON.stringify(s.items || []);
    const editHistoryJson = s.editHistory ? JSON.stringify(s.editHistory) : null;
    const isDeletedNum = s.isDeleted || s.status === 'EXCLUIDA' ? 1 : 0;
    const saleStatus = s.status || (isDeletedNum === 1 ? 'EXCLUIDA' : 'CONCLUIDA');

    await db.run(
      `INSERT OR REPLACE INTO sales (
        id, sale_number, sale_code, customer_id, customer_name, customer_phone, customer_email,
        seller_id, seller_name, subtotal, discount, addition, total, paid_amount,
        remaining_amount, status, is_deleted, deleted_at, deleted_by, deleted_by_name, deletion_reason, edit_history_json,
        payment_status, payment_method, payments_json, items_json,
        notes, invoice_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        saleNumberNumeric,
        saleNumberStr,
        s.customerId || null,
        s.customerName || 'Consumidor Final',
        s.customerPhone || null,
        s.customerEmail || null,
        s.sellerId || req.user?.id || null,
        s.sellerName || req.user?.name || 'Atendente',
        subtotal,
        discount,
        addition,
        total,
        paidAmount,
        remainingAmount,
        saleStatus,
        isDeletedNum,
        s.deletedAt || null,
        s.deletedBy || null,
        s.deletedByName || null,
        s.deletionReason || null,
        editHistoryJson,
        paymentStatus,
        paymentMethod,
        paymentsJson,
        itemsJson,
        s.notes || null,
        s.invoiceStatus || null,
        createdAt,
        updatedAt,
      ]
    );

    // Sync receivables in database
    if (remainingAmount > 0 || paymentStatus === 'PENDENTE' || paymentStatus === 'PARCIALMENTE_PAGO' || paymentStatus === 'A_PRAZO') {
      const receivableStatus = remainingAmount <= 0 ? 'PAGO' : paymentStatus === 'A_PRAZO' ? 'A_PRAZO' : paidAmount > 0 ? 'PARCIALMENTE_PAGO' : 'PENDENTE';
      const existingRec = await db.get<any>('SELECT id FROM receivables WHERE sale_id = ?', [id]);
      const recId = existingRec ? existingRec.id : `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      await db.run(
        `INSERT OR REPLACE INTO receivables (
          id, sale_id, sale_number, customer_id, customer_name, customer_phone,
          total_amount, paid_amount, remaining_amount, due_date, status,
          payment_records_json, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recId,
          id,
          saleNumberStr,
          s.customerId || null,
          s.customerName || 'Consumidor',
          s.customerPhone || null,
          total,
          paidAmount,
          remainingAmount,
          s.dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          receivableStatus,
          paymentsJson,
          s.notes || null,
          createdAt,
          updatedAt,
        ]
      );
    } else {
      // Sale is fully paid! If receivable exists, mark it as PAGO
      await db.run(
        `UPDATE receivables SET 
          status = 'PAGO', 
          paid_amount = ?, 
          remaining_amount = 0, 
          payment_records_json = ?, 
          updated_at = ? 
        WHERE sale_id = ?`,
        [total, paymentsJson, updatedAt, id]
      );
    }

    persistDatabase();

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE_OR_UPDATE_SALE',
      entityType: 'SALE',
      entityId: id,
      details: { saleNumber: saleNumberStr, total, customer: s.customerName, paymentStatus },
      ipAddress: req.ip,
    });

    res.json({
      ...s,
      id,
      saleNumber: saleNumberStr,
      paidAmount,
      remainingAmount,
      paymentStatus,
      updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao registrar venda.' });
  }
});

router.put('/sales/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const now = new Date().toISOString();

    // Check if test user operation: do not persist to real database
    if (req.user?.isTestUser || body.isTestSale) {
      res.json({ ...body, id, updatedAt: now, isTest: true });
      return;
    }

    const existingSale = await db.get<any>('SELECT * FROM sales WHERE id = ?', [id]);
    if (!existingSale) {
      res.status(404).json({ error: 'Venda não encontrada.' });
      return;
    }

    const previousTotal = Number(existingSale.total) || 0;
    const subtotal = Number(body.subtotal) || 0;
    const discount = Number(body.discount) || 0;
    const addition = Number(body.addition) || 0;
    const total = Number(body.total) || 0;
    const paidAmount = Number(body.paidAmount) || 0;
    const remainingAmount = Number(body.remainingAmount !== undefined ? body.remainingAmount : Math.max(0, total - paidAmount));
    const paymentStatus = body.paymentStatus === 'A_PRAZO'
      ? 'A_PRAZO'
      : (body.paymentStatus || (remainingAmount <= 0 ? 'PAGO' : (paidAmount > 0 ? 'PARCIALMENTE_PAGO' : 'PENDENTE')));
    const paymentMethod = body.paymentMethod || (paymentStatus === 'A_PRAZO' ? 'A Prazo' : 'DINHEIRO');
    const paymentsJson = body.payments ? JSON.stringify(body.payments) : existingSale.payments_json;
    const itemsJson = body.items ? JSON.stringify(body.items) : existingSale.items_json;
    const editHistoryJson = body.editHistory ? JSON.stringify(body.editHistory) : existingSale.edit_history_json;
    const reason = body.reason || 'Edição de venda finalizada';

    await db.run(
      `UPDATE sales SET
        customer_id = ?, customer_name = ?, customer_phone = ?, customer_email = ?,
        seller_id = ?, seller_name = ?, subtotal = ?, discount = ?, addition = ?, total = ?,
        paid_amount = ?, remaining_amount = ?, status = 'EDITADA', edit_history_json = ?,
        payment_status = ?, payment_method = ?, payments_json = ?, items_json = ?,
        notes = ?, updated_at = ?
      WHERE id = ?`,
      [
        body.customerId || existingSale.customer_id,
        body.customerName || existingSale.customer_name,
        body.customerPhone || existingSale.customer_phone,
        body.customerEmail || existingSale.customer_email,
        body.sellerId || existingSale.seller_id,
        body.sellerName || existingSale.seller_name,
        subtotal,
        discount,
        addition,
        total,
        paidAmount,
        remainingAmount,
        editHistoryJson,
        paymentStatus,
        paymentMethod,
        paymentsJson,
        itemsJson,
        body.notes || existingSale.notes,
        now,
        id,
      ]
    );

    // Sync receivable
    if (remainingAmount > 0 || paymentStatus === 'PENDENTE' || paymentStatus === 'PARCIALMENTE_PAGO' || paymentStatus === 'A_PRAZO') {
      const receivableStatus = remainingAmount <= 0 ? 'PAGO' : paymentStatus === 'A_PRAZO' ? 'A_PRAZO' : paidAmount > 0 ? 'PARCIALMENTE_PAGO' : 'PENDENTE';
      const existingRec = await db.get<any>('SELECT id FROM receivables WHERE sale_id = ?', [id]);
      const recId = existingRec ? existingRec.id : `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      await db.run(
        `INSERT OR REPLACE INTO receivables (
          id, sale_id, sale_number, customer_id, customer_name, customer_phone,
          total_amount, paid_amount, remaining_amount, due_date, status,
          payment_records_json, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recId,
          id,
          existingSale.sale_code || existingSale.id,
          body.customerId || existingSale.customer_id,
          body.customerName || existingSale.customer_name,
          body.customerPhone || existingSale.customer_phone,
          total,
          paidAmount,
          remainingAmount,
          body.dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          receivableStatus,
          paymentsJson,
          body.notes || existingSale.notes,
          existingSale.created_at,
          now,
        ]
      );
    } else {
      await db.run(
        `UPDATE receivables SET 
          status = 'PAGO', 
          paid_amount = ?, 
          remaining_amount = 0, 
          payment_records_json = ?, 
          updated_at = ? 
        WHERE sale_id = ?`,
        [total, paymentsJson, now, id]
      );
    }

    persistDatabase();

    await logAudit({
      userId: req.user?.id || body.userId,
      userName: req.user?.name || body.userName,
      action: 'EDIT_SALE',
      entityType: 'SALE',
      entityId: id,
      details: {
        saleNumber: existingSale.sale_code,
        previousTotal,
        newTotal: total,
        reason,
        customer: body.customerName || existingSale.customer_name,
      },
      ipAddress: req.ip,
    });

    res.json({ success: true, id, total, updatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao editar venda.' });
  }
});

router.post('/sales/:id/soft-delete', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason, userId, userName } = req.body || {};
    const now = new Date().toISOString();

    const existingSale = await db.get<any>('SELECT * FROM sales WHERE id = ?', [id]);
    if (!existingSale) {
      res.status(404).json({ error: 'Venda não encontrada.' });
      return;
    }

    const deleterId = req.user?.id || userId || 'ADMIN';
    const deleterName = req.user?.name || userName || 'Administrador';
    const deletionReason = reason || 'Exclusão de venda após finalização';

    await db.run(
      `UPDATE sales SET
        status = 'EXCLUIDA',
        is_deleted = 1,
        deleted_at = ?,
        deleted_by = ?,
        deleted_by_name = ?,
        deletion_reason = ?,
        payment_status = 'CANCELADO',
        updated_at = ?
      WHERE id = ?`,
      [now, deleterId, deleterName, deletionReason, now, id]
    );

    await db.run(
      "UPDATE receivables SET status = 'CANCELADO', updated_at = ? WHERE sale_id = ?",
      [now, id]
    );

    persistDatabase();

    await logAudit({
      userId: deleterId,
      userName: deleterName,
      action: 'DELETE_SALE',
      entityType: 'SALE',
      entityId: id,
      details: {
        saleNumber: existingSale.sale_code,
        total: existingSale.total,
        customer: existingSale.customer_name,
        reason: deletionReason,
      },
      ipAddress: req.ip,
    });

    res.json({ success: true, id, deletedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir venda logicamente.' });
  }
});

router.delete('/sales/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM sales WHERE id = ?', [id]);
    await db.run('DELETE FROM receivables WHERE sale_id = ?', [id]);
    await db.run('DELETE FROM sale_annotations WHERE sale_id = ?', [id]);
    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao deletar venda.' });
  }
});

router.post('/sales/:id/cancel', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    await db.run("UPDATE sales SET status = 'CANCELADA', payment_status = 'CANCELADO', updated_at = ? WHERE id = ?", [now, id]);
    await db.run("UPDATE receivables SET status = 'CANCELADO', updated_at = ? WHERE id = ?", [now, id]);
    persistDatabase();

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CANCEL_SALE',
      entityType: 'SALE',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao cancelar venda.' });
  }
});

// Sale Annotations (Metadata adicional sem alterar dados financeiros da venda)
router.get('/sales/annotations/all', async (req, res) => {
  try {
    const rows = await db.all<any>(
      'SELECT * FROM sale_annotations ORDER BY created_at DESC'
    );
    res.json(rows.map((r) => ({
      id: r.id,
      saleId: r.sale_id,
      text: r.text,
      userId: r.user_id || undefined,
      userName: r.user_name || undefined,
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar anotações.' });
  }
});

router.get('/sales/:id/annotations', async (req, res) => {
  try {
    const rows = await db.all<any>(
      'SELECT * FROM sale_annotations WHERE sale_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows.map((r) => ({
      id: r.id,
      saleId: r.sale_id,
      text: r.text,
      userId: r.user_id || undefined,
      userName: r.user_name || undefined,
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar anotações da venda.' });
  }
});

router.post('/sales/:id/annotations', async (req: AuthRequest, res) => {
  try {
    const { id: saleId } = req.params;
    const { text, userId, userName } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Texto da anotação não pode ser vazio.' });
    }

    const sale = await db.get<any>('SELECT * FROM sales WHERE id = ?', [saleId]);
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    const noteId = `annot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const authorId = userId || req.user?.id || '';
    const authorName = userName || req.user?.name || 'Usuário';

    // Insere anotação vinculada à venda sem alterar produtos, quantidades, preços, descontos ou totais
    await db.run(
      `INSERT INTO sale_annotations (id, sale_id, text, user_id, user_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [noteId, saleId, text.trim(), authorId, authorName, now]
    );

    // Mantém campo notes atualizado para consultas rápidas, preservando todos os dados originais
    const updatedNotes = sale.notes ? `${sale.notes}\n[${now.split('T')[0]}] ${text.trim()}` : text.trim();
    await db.run('UPDATE sales SET notes = ?, updated_at = ? WHERE id = ?', [updatedNotes, now, saleId]);

    await logAudit({
      userId: authorId,
      userName: authorName,
      action: 'ADD_SALE_ANNOTATION',
      entityType: 'SALE',
      entityId: saleId,
      details: { text: text.trim(), saleNumber: sale.sale_number },
      ipAddress: req.ip,
    });

    res.json({
      id: noteId,
      saleId,
      text: text.trim(),
      userId: authorId,
      userName: authorName,
      createdAt: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar anotação na venda.' });
  }
});

// -----------------------------------------------------------------------------
// BUDGETS CRUD
// -----------------------------------------------------------------------------

router.get('/budgets', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM budgets ORDER BY created_at DESC');
    const budgets = rows.map((r) => ({
      id: r.id,
      budgetNumber: Number(r.budget_number),
      customerId: r.customer_id || undefined,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || undefined,
      customerEmail: r.customer_email || undefined,
      sellerId: r.seller_id || undefined,
      sellerName: r.seller_name,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      addition: Number(r.addition),
      total: Number(r.total),
      status: r.status,
      validUntil: r.valid_until || undefined,
      items: JSON.parse(r.items_json),
      notes: r.notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(budgets);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar orçamentos.' });
  }
});

router.post('/budgets', async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    const now = new Date().toISOString();
    const id = b.id || `bgt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    let bgtNum = b.budgetNumber;
    if (!bgtNum) {
      const maxNum = await db.get<{ m: number }>('SELECT MAX(budget_number) as m FROM budgets');
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
        b.customerName || 'Cliente',
        b.customerPhone || null,
        b.customerEmail || null,
        b.sellerId || req.user?.id || null,
        b.sellerName || req.user?.name || 'Atendente',
        Number(b.subtotal) || 0,
        Number(b.discount) || 0,
        Number(b.addition) || 0,
        Number(b.total) || 0,
        b.status || 'PENDENTE',
        b.validUntil || null,
        JSON.stringify(b.items || []),
        b.notes || null,
        b.createdAt || now,
        now,
      ]
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'SAVE_BUDGET',
      entityType: 'BUDGET',
      entityId: id,
      details: { budgetNumber: bgtNum, total: b.total, customer: b.customerName },
      ipAddress: req.ip,
    });

    res.json({ ...b, id, budgetNumber: bgtNum, updatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar orçamento.' });
  }
});

router.delete('/budgets/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM budgets WHERE id = ?', [id]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DELETE_BUDGET',
      entityType: 'BUDGET',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir orçamento.' });
  }
});

// -----------------------------------------------------------------------------
// PROSPECTING (OPPORTUNITIES, PACKAGES, APPROACH TEMPLATES)
// -----------------------------------------------------------------------------

router.get('/prospecting/opportunities', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM opportunities ORDER BY updated_at DESC');
    const list = rows.map((r) => ({
      id: r.id,
      opportunityNumber: Number(r.opportunity_number),
      name: r.name,
      contactName: r.contact_name || undefined,
      phone: r.phone,
      whatsapp: r.whatsapp || undefined,
      email: r.email || undefined,
      segment: r.segment,
      stage: r.stage,
      estimatedValue: Number(r.estimated_value),
      confidence: Number(r.confidence),
      neighborhood: r.neighborhood || undefined,
      city: r.city || undefined,
      origin: r.origin || undefined,
      originDetails: r.origin_details || undefined,
      notes: r.notes || undefined,
      assignedSellerId: r.assigned_seller_id || undefined,
      assignedSellerName: r.assigned_seller_name || undefined,
      nextAction: r.next_action_json ? JSON.parse(r.next_action_json) : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar oportunidades.' });
  }
});

router.post('/prospecting/opportunities', async (req: AuthRequest, res) => {
  try {
    const opp = req.body;
    if (!opp.name || !opp.name.trim()) {
      res.status(400).json({ error: 'Nome do lead/empresa é obrigatório.' });
      return;
    }

    const now = new Date().toISOString();
    const id = opp.id || `opp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    let oppNum = opp.opportunityNumber;
    if (!oppNum) {
      const maxNum = await db.get<{ m: number }>('SELECT MAX(opportunity_number) as m FROM opportunities');
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
        opp.phone?.trim() || '',
        opp.whatsapp?.trim() || null,
        opp.email?.trim() || null,
        opp.segment || 'Comércio & Serviços Gerais',
        opp.stage || 'IDENTIFICADO',
        Number(opp.estimatedValue) || 0,
        Number(opp.confidence) || 50,
        opp.neighborhood?.trim() || null,
        opp.city?.trim() || null,
        opp.origin || 'PROSPECCAO_ATIVA',
        opp.originDetails?.trim() || null,
        opp.notes?.trim() || null,
        opp.assignedSellerId || null,
        opp.assignedSellerName || null,
        opp.nextAction ? JSON.stringify(opp.nextAction) : null,
        opp.createdAt || now,
        now,
      ]
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'SAVE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: id,
      details: { name: opp.name, stage: opp.stage, value: opp.estimatedValue },
      ipAddress: req.ip,
    });

    res.json({ ...opp, id, opportunityNumber: oppNum, updatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar oportunidade.' });
  }
});

router.delete('/prospecting/opportunities/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM opportunities WHERE id = ?', [id]);
    await db.run('DELETE FROM opportunity_activities WHERE opportunity_id = ?', [id]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DELETE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir oportunidade.' });
  }
});

router.get('/prospecting/packages', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM packages ORDER BY featured DESC, name ASC');
    const pkgs = rows.map((r) => ({
      id: r.id,
      name: r.name,
      segment: r.segment,
      targetAudience: r.target_audience || undefined,
      description: r.description || '',
      items: JSON.parse(r.items_json),
      totalIndividualPrice: Number(r.total_individual_price),
      packagePrice: Number(r.package_price),
      discountPercent: Number(r.discount_percent),
      pitch: r.pitch || undefined,
      featured: Number(r.featured) === 1,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(pkgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar pacotes.' });
  }
});

router.get('/prospecting/approach-templates', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM approach_templates ORDER BY segment ASC');
    res.json(rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.segment || 'Geral',
      segment: r.segment || 'Geral',
      targetStage: r.trigger || 'ALL',
      trigger: r.trigger || 'ALL',
      templateText: r.message_text,
      messageText: r.message_text,
      tone: r.tone || 'Profissional',
      variables: r.variables_json ? JSON.parse(r.variables_json) : undefined,
      isDefault: r.trigger === 'A_CONTATAR' && Number(r.active) === 1,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar templates de abordagem.' });
  }
});

router.post('/prospecting/approach-templates', async (req: AuthRequest, res) => {
  try {
    const tpl = req.body;
    if (!tpl.title || !tpl.title.trim()) {
      res.status(400).json({ error: 'Título do modelo é obrigatório.' });
      return;
    }
    const now = new Date().toISOString();
    const id = tpl.id || `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const category = (tpl.category || tpl.segment || 'Geral').trim();
    const targetStage = tpl.targetStage || tpl.trigger || 'ALL';
    const templateText = (tpl.templateText || tpl.messageText || '').trim();
    const tone = tpl.tone || 'Profissional';
    const active = tpl.active !== false ? 1 : 0;
    const createdAt = tpl.createdAt || now;

    await db.run(
      `INSERT OR REPLACE INTO approach_templates (
        id, segment, title, trigger, message_text, tone, variables_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, category, tpl.title.trim(), targetStage, templateText, tone, null, active, createdAt, now]
    );

    persistDatabase();

    await logAudit({
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Usuário',
      action: 'SAVE_APPROACH_TEMPLATE',
      entityType: 'APPROACH_TEMPLATE',
      entityId: id,
      details: { title: tpl.title, category, targetStage },
      ipAddress: req.ip,
    });

    res.json({
      id,
      title: tpl.title.trim(),
      category,
      segment: category,
      targetStage,
      trigger: targetStage,
      templateText,
      messageText: templateText,
      tone,
      active: active === 1,
      isDefault: targetStage === 'A_CONTATAR' && active === 1,
      createdAt,
      updatedAt: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar modelo de abordagem.' });
  }
});

router.delete('/prospecting/approach-templates/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM approach_templates WHERE id = ?', [id]);
    persistDatabase();

    await logAudit({
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Usuário',
      action: 'DELETE_APPROACH_TEMPLATE',
      entityType: 'APPROACH_TEMPLATE',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir modelo de abordagem.' });
  }
});

// Opportunity Activities (Ações Executadas compartilhadas)
router.get('/prospecting/opportunity-activities', async (req, res) => {
  try {
    const { opportunityId } = req.query;
    let rows: any[];
    if (opportunityId) {
      rows = await db.all<any>(
        'SELECT * FROM opportunity_activities WHERE opportunity_id = ? ORDER BY date DESC, created_at DESC',
        [opportunityId]
      );
    } else {
      rows = await db.all<any>(
        'SELECT * FROM opportunity_activities ORDER BY date DESC, created_at DESC'
      );
    }
    res.json(
      rows.map((r) => ({
        id: r.id,
        opportunityId: r.opportunity_id,
        type: r.type,
        title: r.title,
        description: r.description || '',
        userId: r.user_id || '',
        userName: r.user_name || '',
        date: r.date,
        scheduledFor: r.scheduled_for || undefined,
        completed: Number(r.completed) === 1,
        result: r.result || undefined,
        createdAt: r.created_at,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar atividades.' });
  }
});

router.post('/prospecting/opportunity-activities', async (req: AuthRequest, res) => {
  try {
    const act = req.body;
    if (!act.opportunityId) {
      res.status(400).json({ error: 'ID da oportunidade é obrigatório.' });
      return;
    }
    const now = new Date().toISOString();
    const id = act.id || `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const title = act.title || act.type || 'Atividade';
    const description = act.description || '';
    const userId = act.userId || req.user?.id || '';
    const userName = act.userName || req.user?.name || 'Atendente';
    const date = act.date || now;
    const scheduledFor = act.scheduledFor || null;
    const completed = act.completed !== false ? 1 : 0;
    const result = act.result || null;
    const createdAt = act.createdAt || now;

    await db.run(
      `INSERT OR REPLACE INTO opportunity_activities (
        id, opportunity_id, type, title, description, user_id, user_name, date, scheduled_for, completed, result, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, act.opportunityId, act.type || 'OBSERVACAO', title, description, userId, userName, date, scheduledFor, completed, result, createdAt]
    );

    // Update opportunity updated_at
    await db.run('UPDATE opportunities SET updated_at = ? WHERE id = ?', [now, act.opportunityId]);

    persistDatabase();

    await logAudit({
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Usuário',
      action: 'ADD_OPPORTUNITY_ACTIVITY',
      entityType: 'OPPORTUNITY_ACTIVITY',
      entityId: id,
      details: { opportunityId: act.opportunityId, type: act.type },
      ipAddress: req.ip,
    });

    res.json({
      id,
      opportunityId: act.opportunityId,
      type: act.type || 'OBSERVACAO',
      title,
      description,
      userId,
      userName,
      date,
      scheduledFor,
      completed: completed === 1,
      result,
      createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar atividade executada.' });
  }
});

router.delete('/prospecting/opportunity-activities/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM opportunity_activities WHERE id = ?', [id]);
    persistDatabase();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir atividade.' });
  }
});

router.get('/prospecting/complementary-rules', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM complementary_rules WHERE active = 1');
    res.json(rows.map((r) => ({
      id: r.id,
      triggerItemId: r.trigger_item_id,
      triggerItemName: r.trigger_item_name,
      suggestedItemIds: JSON.parse(r.suggested_item_ids_json),
      reason: r.reason,
      discountOnCombo: Number(r.discount_on_combo),
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar regras complementares.' });
  }
});

router.get('/prospecting/public-segment-pages', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM public_segment_pages WHERE active = 1');
    res.json(rows.map((r) => ({
      id: r.id,
      segmentSlug: r.segment_slug,
      title: r.title,
      subtitle: r.subtitle || undefined,
      coverImageUrl: r.cover_image_url || undefined,
      heroBadge: r.hero_badge || undefined,
      painPoints: r.pain_points_json ? JSON.parse(r.pain_points_json) : undefined,
      solutions: r.solutions_json ? JSON.parse(r.solutions_json) : undefined,
      recommendedPackageIds: r.recommended_package_ids_json ? JSON.parse(r.recommended_package_ids_json) : undefined,
      testimonials: r.testimonials_json ? JSON.parse(r.testimonials_json) : undefined,
      ctaText: r.cta_text || undefined,
      whatsappDefaultMessage: r.whatsapp_default_message || undefined,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar páginas de segmento.' });
  }
});

// -----------------------------------------------------------------------------
// CATALOG NICHES
// -----------------------------------------------------------------------------

router.get('/catalog-niches', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM catalog_niches ORDER BY niche_order ASC');
    const niches = rows.map((r) => {
      let extra: any = {};
      if (r.data_json) {
        try { extra = JSON.parse(r.data_json); } catch {}
      }
      return {
        ...extra,
        id: r.id,
        title: r.title,
        description: r.description || '',
        ctaText: r.cta_text || undefined,
        badge: r.badge || undefined,
        imageUrl: r.image_url || undefined,
        itemTypeMatch: r.item_type_match || undefined,
        categoryMatchKeywords: r.category_match_keywords_json ? JSON.parse(r.category_match_keywords_json) : (extra.categoryMatchKeywords || []),
        customKeywords: r.custom_keywords_json ? JSON.parse(r.custom_keywords_json) : (extra.customKeywords || undefined),
        active: Number(r.active) === 1,
        order: Number(r.niche_order ?? 1),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
    res.json(niches);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar nichos do catálogo.' });
  }
});

router.post('/catalog-niches', async (req: AuthRequest, res) => {
  try {
    const niche = req.body;
    if (!niche || !niche.title) {
      return res.status(400).json({ error: 'Título do nicho é obrigatório.' });
    }

    const id = niche.id || `niche-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    // Convert base64 data URL to permanent uploaded file URL
    if (niche.imageUrl && typeof niche.imageUrl === 'string' && niche.imageUrl.startsWith('data:image/')) {
      try {
        const uploadRes = await saveBase64Image(niche.imageUrl, 'niche');
        niche.imageUrl = uploadRes.url;
      } catch (e) {
        console.warn('Notice converting base64 niche image to upload file:', e);
      }
    }

    await db.run(
      `INSERT OR REPLACE INTO catalog_niches (
        id, title, description, cta_text, badge, image_url, item_type_match,
        category_match_keywords_json, custom_keywords_json, active, niche_order,
        data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        niche.title.trim(),
        niche.description?.trim() || '',
        niche.ctaText?.trim() || null,
        niche.badge?.trim() || null,
        niche.imageUrl?.trim() || null,
        niche.itemTypeMatch || null,
        niche.categoryMatchKeywords ? JSON.stringify(niche.categoryMatchKeywords) : null,
        niche.customKeywords ? JSON.stringify(niche.customKeywords) : null,
        niche.active !== false ? 1 : 0,
        Number(niche.order ?? 1),
        JSON.stringify(niche),
        niche.createdAt || now,
        now,
      ]
    );

    persistDatabase();

    broadcastSync('catalog-niches-updated', { id });
    broadcastSync('catalog-updated', { type: 'niche', id });

    res.json({
      ...niche,
      id,
      updatedAt: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar nicho do catálogo.' });
  }
});

router.post('/catalog-niches/batch', async (req: AuthRequest, res) => {
  try {
    const niches = req.body;
    if (!Array.isArray(niches)) {
      return res.status(400).json({ error: 'Payload de nichos deve ser um array.' });
    }

    const now = new Date().toISOString();
    for (const niche of niches) {
      if (!niche || !niche.title) continue;
      const id = niche.id || `niche-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      if (niche.imageUrl && typeof niche.imageUrl === 'string' && niche.imageUrl.startsWith('data:image/')) {
        try {
          const uploadRes = await saveBase64Image(niche.imageUrl, 'niche');
          niche.imageUrl = uploadRes.url;
        } catch (e) {
          console.warn('Notice converting batch base64 niche image:', e);
        }
      }

      await db.run(
        `INSERT OR REPLACE INTO catalog_niches (
          id, title, description, cta_text, badge, image_url, item_type_match,
          category_match_keywords_json, custom_keywords_json, active, niche_order,
          data_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          niche.title.trim(),
          niche.description?.trim() || '',
          niche.ctaText?.trim() || null,
          niche.badge?.trim() || null,
          niche.imageUrl?.trim() || null,
          niche.itemTypeMatch || null,
          niche.categoryMatchKeywords ? JSON.stringify(niche.categoryMatchKeywords) : null,
          niche.customKeywords ? JSON.stringify(niche.customKeywords) : null,
          niche.active !== false ? 1 : 0,
          Number(niche.order ?? 1),
          JSON.stringify(niche),
          niche.createdAt || now,
          niche.updatedAt || now,
        ]
      );
    }

    persistDatabase();

    broadcastSync('catalog-niches-updated', { count: niches.length });
    broadcastSync('catalog-updated', { type: 'niches-batch' });

    res.json({ success: true, count: niches.length, niches });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar nichos em lote.' });
  }
});

router.delete('/catalog-niches/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM catalog_niches WHERE id = ?', [id]);
    persistDatabase();

    broadcastSync('catalog-niches-updated', { id, deleted: true });
    broadcastSync('catalog-updated', { type: 'niche-deleted', id });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir nicho do catálogo.' });
  }
});

// -----------------------------------------------------------------------------
// CATALOG PUBLISH TO GITHUB & STATIC JSON
// -----------------------------------------------------------------------------

router.get('/catalog/publish/status', async (req, res) => {
  const hasToken = !!process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || '';
  const repo = process.env.GITHUB_REPO_NAME || '';
  const branch = process.env.GITHUB_BRANCH || '';

  res.json({
    configured: !!(hasToken && owner && repo),
    owner,
    repo,
    branch,
    hasToken,
  });
});

router.post('/catalog/publish', async (req: AuthRequest, res) => {
  try {
    const { githubToken, githubRepoOwner, githubRepoName, githubBranch } = req.body || {};

    const result = await publishCatalogToGitHub({
      token: githubToken,
      owner: githubRepoOwner,
      repo: githubRepoName,
      branch: githubBranch,
    });

    await logAudit({
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrador',
      action: 'PUBLISH_CATALOG_GITHUB',
      entityType: 'CATALOG',
      entityId: 'public/catalogo.json',
      details: {
        targetRepo: result.targetRepo,
        itemsCount: result.itemsCount,
        commitUrl: result.commitUrl,
      },
      ipAddress: req.ip,
    });

    broadcastSync('catalog-updated', { type: 'published-github', itemsCount: result.itemsCount });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Falha ao sincronizar catálogo com o GitHub.',
    });
  }
});

router.get('/catalog/data', async (req, res) => {
  try {
    const payload = await buildPublicCatalogPayload();
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao carregar dados do catálogo.' });
  }
});

// -----------------------------------------------------------------------------
// FINANCE & CASH SESSIONS
// -----------------------------------------------------------------------------

router.get('/finance/receiving-accounts', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM receiving_accounts ORDER BY name ASC');
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      receiverName: r.receiver_name,
      active: Number(r.active) === 1,
      pixKey: r.pix_key || undefined,
      bankDetails: r.bank_details || undefined,
      cardFeePercent: Number(r.card_fee_percent || 0),
      creditFeePercent: r.credit_fee_percent !== null && r.credit_fee_percent !== undefined ? Number(r.credit_fee_percent) : undefined,
      debitFeePercent: r.debit_fee_percent !== null && r.debit_fee_percent !== undefined ? Number(r.debit_fee_percent) : undefined,
      initialBalance: Number(r.initial_balance || 0),
      notes: r.notes || undefined,
      isDefault: Number(r.is_default) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar contas de recebimento.' });
  }
});

router.post('/finance/receiving-accounts', async (req: AuthRequest, res) => {
  try {
    const a = req.body;
    const id = a.id || `acc-${Date.now()}`;
    const now = new Date().toISOString();
    await db.run(
      `INSERT OR REPLACE INTO receiving_accounts (
        id, name, type, receiver_name, active, pix_key, bank_details, card_fee_percent,
        credit_fee_percent, debit_fee_percent, initial_balance, notes, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, a.name, a.type, a.receiverName, a.active !== false ? 1 : 0, a.pixKey || '',
        a.bankDetails || '', Number(a.cardFeePercent) || 0,
        Number(a.creditFeePercent ?? a.cardFeePercent) || 0,
        Number(a.debitFeePercent ?? 0) || 0,
        Number(a.initialBalance) || 0,
        a.notes || '',
        a.isDefault ? 1 : 0, a.createdAt || now, now
      ]
    );
    res.json({ ...a, id, updatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar conta.' });
  }
});

router.get('/finance/transfers', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM financial_transfers ORDER BY created_at DESC');
    res.json(rows.map((r) => ({
      id: r.id,
      transferNumber: r.transfer_number,
      type: 'TRANSFERENCIA',
      fromAccountId: r.from_account_id,
      fromAccountName: r.from_account_name,
      toAccountId: r.to_account_id,
      toAccountName: r.to_account_name,
      amount: Number(r.amount),
      date: r.date,
      observation: r.observation || undefined,
      userId: r.user_id || undefined,
      userName: r.user_name || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar transferências.' });
  }
});

router.post('/finance/transfers', async (req: AuthRequest, res) => {
  try {
    const t = req.body;
    const id = t.id || `trf-${Date.now()}`;
    const now = new Date().toISOString();

    // Prevenção de duplicação: se já existir transferência com mesmo ID, retorna a existente
    const existing = await db.get<any>('SELECT * FROM financial_transfers WHERE id = ?', [id]);
    if (existing) {
      return res.json({
        id: existing.id,
        transferNumber: existing.transfer_number,
        type: 'TRANSFERENCIA',
        fromAccountId: existing.from_account_id,
        fromAccountName: existing.from_account_name,
        toAccountId: existing.to_account_id,
        toAccountName: existing.to_account_name,
        amount: Number(existing.amount),
        date: existing.date,
        observation: existing.observation || undefined,
        userId: existing.user_id || undefined,
        userName: existing.user_name || undefined,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      });
    }

    await db.run(
      `INSERT OR REPLACE INTO financial_transfers (
        id, transfer_number, from_account_id, from_account_name, to_account_id, to_account_name,
        amount, date, observation, user_id, user_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, t.transferNumber, t.fromAccountId, t.fromAccountName, t.toAccountId, t.toAccountName,
        Number(t.amount) || 0, t.date || now.split('T')[0], t.observation || '',
        t.userId || req.user?.id || '', t.userName || req.user?.name || '',
        t.createdAt || now, now
      ]
    );

    await logAudit({
      userId: t.userId || req.user?.id,
      userName: t.userName || req.user?.name,
      action: 'FINANCIAL_TRANSFER',
      entityType: 'ACCOUNT_TRANSFER',
      entityId: id,
      details: {
        from: t.fromAccountName,
        to: t.toAccountName,
        amount: t.amount,
        transferNumber: t.transferNumber,
      },
      ipAddress: req.ip,
    });

    res.json({ ...t, id, type: 'TRANSFERENCIA', createdAt: t.createdAt || now, updatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar transferência.' });
  }
});

router.delete('/finance/transfers/:id', async (req: AuthRequest, res) => {
  try {
    await db.run('DELETE FROM financial_transfers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir transferência.' });
  }
});

router.get('/finance/adjustments', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM account_balance_adjustments ORDER BY created_at DESC');
    res.json(rows.map((r) => ({
      id: r.id,
      adjustmentNumber: r.adjustment_number,
      type: 'AJUSTE_ADMINISTRATIVO_SALDO',
      accountId: r.account_id,
      accountName: r.account_name,
      previousBalance: Number(r.previous_balance || 0),
      newBalance: Number(r.new_balance || 0),
      adjustedAmount: Number(r.adjusted_amount || 0),
      reason: r.reason || '',
      userId: r.user_id || undefined,
      userName: r.user_name || undefined,
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar ajustes de saldo.' });
  }
});

router.post('/finance/adjustments', async (req: AuthRequest, res) => {
  try {
    const a = req.body;
    const id = a.id || `adj-${Date.now()}`;
    const now = new Date().toISOString();
    await db.run(
      `INSERT OR REPLACE INTO account_balance_adjustments (
        id, adjustment_number, account_id, account_name, previous_balance,
        new_balance, adjusted_amount, reason, user_id, user_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        a.adjustmentNumber || 'AJU-001',
        a.accountId,
        a.accountName,
        Number(a.previousBalance) || 0,
        Number(a.newBalance) || 0,
        Number(a.adjustedAmount) || 0,
        a.reason || '',
        a.userId || req.user?.id || '',
        a.userName || req.user?.name || '',
        a.createdAt || now,
      ]
    );
    res.json({ ...a, id, createdAt: a.createdAt || now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar ajuste de saldo.' });
  }
});

router.get('/finance/receivables', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM receivables ORDER BY due_date ASC');
    res.json(rows.map((r) => ({
      id: r.id,
      saleId: r.sale_id,
      saleNumber: r.sale_number ? String(r.sale_number) : '',
      customerId: r.customer_id || undefined,
      customerName: r.customer_name,
      customerPhone: r.customer_phone || undefined,
      totalAmount: Number(r.total_amount),
      paidAmount: Number(r.paid_amount),
      remainingAmount: Number(r.remaining_amount),
      dueDate: r.due_date,
      status: r.status,
      paymentRecords: r.payment_records_json ? JSON.parse(r.payment_records_json) : [],
      notes: r.notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar contas a receber.' });
  }
});

router.get('/finance/cash-register-sessions', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM cash_register_sessions ORDER BY opened_at DESC');
    res.json(rows.map((r) => {
      let summary: any = {};
      try {
        summary = r.summary_json ? JSON.parse(r.summary_json) : {};
      } catch {}

      return {
        id: r.id,
        registerNumber: r.register_number ? String(r.register_number) : '',
        openedByUserId: r.opened_by_user_id,
        openedByUserName: r.opened_by_user_name,
        closedByUserId: r.closed_by_user_id || undefined,
        closedByUserName: r.closed_by_user_name || undefined,
        openedAt: r.opened_at,
        closedAt: r.closed_at || undefined,
        initialAmount: Number(r.initial_amount || 0),
        finalCashAmount: r.final_cash_amount !== null && r.final_cash_amount !== undefined ? Number(r.final_cash_amount) : undefined,
        cashSalesAmount: Number(summary.cashSalesAmount ?? 0),
        expectedCashAmount: Number(summary.expectedCashAmount ?? r.initial_amount ?? 0),
        countedCashAmount: r.final_cash_amount !== null && r.final_cash_amount !== undefined
          ? Number(r.final_cash_amount)
          : (summary.countedCashAmount !== undefined ? Number(summary.countedCashAmount) : undefined),
        cashDifference: summary.cashDifference !== undefined ? Number(summary.cashDifference) : undefined,
        totalSalesCount: Number(summary.totalSalesCount ?? 0),
        totalGrossSales: Number(summary.totalGrossSales ?? 0),
        totalCardFees: Number(summary.totalCardFees ?? 0),
        totalNetSales: Number(summary.totalNetSales ?? 0),
        byMethod: summary.byMethod || [],
        byAccount: summary.byAccount || [],
        status: r.status,
        notes: r.notes || undefined,
        closingNotes: r.closing_notes || summary.closingNotes || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar sessões de caixa.' });
  }
});

router.post('/finance/cash-register-sessions', async (req: AuthRequest, res) => {
  try {
    const s = req.body;
    const now = new Date().toISOString();
    const id = s.id || `cx-${Date.now()}`;

    const summary = {
      cashSalesAmount: s.cashSalesAmount,
      expectedCashAmount: s.expectedCashAmount,
      countedCashAmount: s.countedCashAmount,
      cashDifference: s.cashDifference,
      totalSalesCount: s.totalSalesCount,
      totalGrossSales: s.totalGrossSales,
      totalCardFees: s.totalCardFees,
      totalNetSales: s.totalNetSales,
      byMethod: s.byMethod || [],
      byAccount: s.byAccount || [],
      closingNotes: s.closingNotes,
    };

    const finalCash = s.countedCashAmount !== undefined && s.countedCashAmount !== null
      ? Number(s.countedCashAmount)
      : (s.finalCashAmount !== undefined && s.finalCashAmount !== null ? Number(s.finalCashAmount) : null);

    await db.run(
      `INSERT OR REPLACE INTO cash_register_sessions (
        id, register_number, opened_by_user_id, opened_by_user_name,
        closed_by_user_id, closed_by_user_name, opened_at, closed_at,
        initial_amount, final_cash_amount, status, notes, closing_notes, summary_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        s.registerNumber ? String(s.registerNumber) : '',
        s.openedByUserId || req.user?.id || '',
        s.openedByUserName || req.user?.name || '',
        s.closedByUserId || null,
        s.closedByUserName || null,
        s.openedAt || now,
        s.closedAt || null,
        Number(s.initialAmount) || 0,
        finalCash,
        s.status || 'ABERTO',
        s.notes || null,
        s.closingNotes || null,
        JSON.stringify(summary),
        s.createdAt || now,
        now,
      ]
    );

    res.json({ ...s, id, updatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar sessão de caixa.' });
  }
});

// -----------------------------------------------------------------------------
// PRODUCTION ORDERS & INVENTORY
// -----------------------------------------------------------------------------

router.get('/production', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM production_orders ORDER BY created_at DESC');
    res.json(rows.map((r) => {
      let config = undefined;
      try {
        config = r.configuration_json ? JSON.parse(r.configuration_json) : undefined;
      } catch {}

      let files = [];
      try {
        files = r.files_json ? JSON.parse(r.files_json) : [];
      } catch {}

      let stages = [];
      try {
        stages = r.stages_json ? JSON.parse(r.stages_json) : [];
      } catch {}

      return {
        id: r.id,
        orderNumber: r.order_number ? String(r.order_number) : String(r.id),
        saleId: r.sale_id || '',
        saleNumber: r.sale_number ? String(r.sale_number) : '',
        saleItemId: r.sale_item_id || undefined,
        customerId: r.customer_id || undefined,
        customerName: r.customer_name || 'Cliente Balcão',
        customerPhone: r.customer_phone || undefined,
        sellerId: r.seller_id || undefined,
        sellerName: r.seller_name || undefined,
        promoterId: r.promoter_id || undefined,
        promoterName: r.promoter_name || undefined,
        productionType: r.production_type || 'PRODUCAO_PROPRIA',
        leadTime: r.lead_time || undefined,
        itemId: r.item_id || '',
        itemName: r.item_name || '',
        quantity: Number(r.quantity) || 1,
        configuration: config || { notes: r.notes || '' },
        status: r.status || 'AGUARDANDO_PRODUCAO',
        priority: r.priority || 'MEDIA',
        deadline: r.dead_line || undefined,
        notes: r.notes || undefined,
        files: Array.isArray(files) ? files : [],
        stages: Array.isArray(stages) ? stages : [],
        completedAt: r.completed_at || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString(),
      };
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar ordens de produção.' });
  }
});

router.post('/production', async (req: AuthRequest, res) => {
  try {
    const po = req.body;
    if (!po || !po.id) {
      res.status(400).json({ error: 'Dados da ordem de produção inválidos.' });
      return;
    }
    const now = new Date().toISOString();
    await db.run(
      `INSERT OR REPLACE INTO production_orders (
        id, order_number, sale_id, sale_number, sale_item_id,
        customer_id, customer_name, customer_phone,
        seller_id, seller_name, promoter_id, promoter_name,
        production_type, lead_time, item_id, item_name, quantity,
        configuration_json, status, priority, dead_line, notes,
        files_json, stages_json, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        po.id,
        po.orderNumber ? String(po.orderNumber) : null,
        po.saleId || null,
        po.saleNumber ? String(po.saleNumber) : null,
        po.saleItemId || null,
        po.customerId || null,
        po.customerName || 'Cliente Balcão',
        po.customerPhone || null,
        po.sellerId || null,
        po.sellerName || null,
        po.promoterId || null,
        po.promoterName || null,
        po.productionType || 'PRODUCAO_PROPRIA',
        po.leadTime || null,
        po.itemId || '',
        po.itemName || '',
        Number(po.quantity) || 1,
        po.configuration ? JSON.stringify(po.configuration) : null,
        po.status || 'AGUARDANDO_PRODUCAO',
        po.priority || 'MEDIA',
        po.deadline || po.deadLine || null,
        po.notes || null,
        po.files ? JSON.stringify(po.files) : '[]',
        po.stages ? JSON.stringify(po.stages) : '[]',
        po.completedAt || null,
        po.createdAt || now,
        po.updatedAt || now,
      ]
    );

    persistDatabase();

    broadcastSync('production-updated', { id: po.id, status: po.status });

    res.json({ success: true, order: po });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar ordem de produção.' });
  }
});

router.post('/production/batch', async (req: AuthRequest, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'Array de ordens inválido.' });
      return;
    }
    const now = new Date().toISOString();
    for (const po of orders) {
      if (!po || !po.id) continue;
      await db.run(
        `INSERT OR REPLACE INTO production_orders (
          id, order_number, sale_id, sale_number, sale_item_id,
          customer_id, customer_name, customer_phone,
          seller_id, seller_name, promoter_id, promoter_name,
          production_type, lead_time, item_id, item_name, quantity,
          configuration_json, status, priority, dead_line, notes,
          files_json, stages_json, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          po.id,
          po.orderNumber ? String(po.orderNumber) : null,
          po.saleId || null,
          po.saleNumber ? String(po.saleNumber) : null,
          po.saleItemId || null,
          po.customerId || null,
          po.customerName || 'Cliente Balcão',
          po.customerPhone || null,
          po.sellerId || null,
          po.sellerName || null,
          po.promoterId || null,
          po.promoterName || null,
          po.productionType || 'PRODUCAO_PROPRIA',
          po.leadTime || null,
          po.itemId || '',
          po.itemName || '',
          Number(po.quantity) || 1,
          po.configuration ? JSON.stringify(po.configuration) : null,
          po.status || 'AGUARDANDO_PRODUCAO',
          po.priority || 'MEDIA',
          po.deadline || po.deadLine || null,
          po.notes || null,
          po.files ? JSON.stringify(po.files) : '[]',
          po.stages ? JSON.stringify(po.stages) : '[]',
          po.completedAt || null,
          po.createdAt || now,
          po.updatedAt || now,
        ]
      );
    }

    persistDatabase();

    broadcastSync('production-updated', { count: orders.length });

    res.json({ success: true, count: orders.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar ordens de produção em lote.' });
  }
});

router.delete('/production/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM production_orders WHERE id = ?', [id]);
    persistDatabase();

    broadcastSync('production-updated', { id, deleted: true });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir ordem de produção.' });
  }
});

router.get('/inventory/movements', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 200');
    res.json(rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      itemName: r.item_name,
      type: r.type,
      quantity: Number(r.quantity),
      previousStock: Number(r.previous_stock),
      currentStock: Number(r.current_stock),
      reason: r.reason || undefined,
      userId: r.user_id || undefined,
      userName: r.user_name || undefined,
      referenceId: r.reference_id || undefined,
      referenceType: r.reference_type || undefined,
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar movimentações de estoque.' });
  }
});

router.post('/inventory/movements/batch', async (req, res) => {
  try {
    const { movements } = req.body;
    if (!Array.isArray(movements)) {
      res.status(400).json({ error: 'Array de movimentações inválido.' });
      return;
    }
    // Test user simulation: do not persist to real database
    if ((req as any).user?.isTestUser) {
      res.json({ success: true, count: movements.length, isTest: true });
      return;
    }
    const now = new Date().toISOString();
    for (const m of movements) {
      const id = m.id || `mov-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await db.run(
        `INSERT OR REPLACE INTO inventory_movements (
          id, item_id, item_name, type, quantity, previous_stock, current_stock, reason, user_id, user_name, reference_id, reference_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          m.itemId,
          m.itemName,
          m.type,
          Number(m.quantity) || 0,
          Number(m.previousStock) || 0,
          Number(m.newStock ?? m.currentStock ?? 0),
          m.reason || null,
          m.userId || null,
          m.userName || null,
          m.referenceId || null,
          m.referenceType || null,
          m.date || m.createdAt || now,
        ]
      );
    }
    res.json({ success: true, count: movements.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar movimentações de estoque em lote.' });
  }
});

// -----------------------------------------------------------------------------
// ONLINE SERVICES & DOCUMENT TEMPLATES
// -----------------------------------------------------------------------------

router.get('/online-services', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM online_services ORDER BY name ASC');
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      turnaroundTime: r.turnaround_time || undefined,
      requirements: r.requirements || undefined,
      description: r.description || undefined,
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar serviços online.' });
  }
});

router.delete('/online-services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM online_services WHERE id = ?', [id]);
    const prodSrvId = id.startsWith('srv-') ? `prod-srv-${id.replace('srv-', '')}` : id;
    await db.run('DELETE FROM items WHERE id = ? OR id = ?', [id, prodSrvId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir serviço online.' });
  }
});

router.get('/document-templates', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM document_templates ORDER BY name ASC');
    res.json(rows.map((r) => ({
      id: r.id,
      title: r.name,
      name: r.name,
      description: r.description || undefined,
      category: r.category,
      defaultPrice: Number(r.default_price || 0),
      templateBody: r.content,
      content: r.content,
      fields: r.variables_json ? JSON.parse(r.variables_json) : [],
      variables: r.variables_json ? JSON.parse(r.variables_json) : [],
      active: Number(r.active) === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar templates.' });
  }
});

router.post('/document-templates', async (req, res) => {
  try {
    const tmpl = req.body;
    if (!tmpl || !tmpl.id || (!tmpl.title && !tmpl.name)) {
      return res.status(400).json({ error: 'Dados de modelo inválidos.' });
    }
    const name = tmpl.title || tmpl.name;
    const content = tmpl.templateBody || tmpl.content || '';
    const fields = tmpl.fields || tmpl.variables || [];
    const now = new Date().toISOString();

    await db.run(
      `INSERT OR REPLACE INTO document_templates (
        id, name, description, category, content, variables_json, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tmpl.id,
        name,
        tmpl.description || '',
        tmpl.category || 'Outros',
        content,
        JSON.stringify(fields),
        tmpl.active !== false ? 1 : 0,
        tmpl.createdAt || now,
        tmpl.updatedAt || now,
      ]
    );
    res.json({ success: true, id: tmpl.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar modelo.' });
  }
});

router.put('/document-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tmpl = req.body;
    const name = tmpl.title || tmpl.name;
    const content = tmpl.templateBody || tmpl.content || '';
    const fields = tmpl.fields || tmpl.variables || [];
    const now = new Date().toISOString();

    await db.run(
      `UPDATE document_templates SET
        name = ?, description = ?, category = ?, content = ?, variables_json = ?, active = ?, updated_at = ?
      WHERE id = ?`,
      [
        name,
        tmpl.description || '',
        tmpl.category || 'Outros',
        content,
        JSON.stringify(fields),
        tmpl.active !== false ? 1 : 0,
        now,
        id,
      ]
    );
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar modelo.' });
  }
});

router.delete('/document-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM document_templates WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir modelo.' });
  }
});

router.get('/generated-documents', async (req, res) => {
  try {
    const rows = await db.all<any>('SELECT * FROM generated_documents ORDER BY created_at DESC');
    res.json(rows.map((r) => ({
      id: r.id,
      templateId: r.template_id || undefined,
      templateName: r.template_name,
      title: r.title,
      customerId: r.customer_id || undefined,
      customerName: r.customer_name || undefined,
      customerCpfCnpj: r.customer_cpf_cnpj || undefined,
      renderedContent: r.rendered_content,
      createdByUserId: r.created_by_user_id || undefined,
      createdByUserName: r.created_by_user_name || undefined,
      createdAt: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar documentos gerados.' });
  }
});

router.post('/generated-documents', async (req, res) => {
  try {
    const doc = req.body;
    if (!doc || !doc.id) {
      return res.status(400).json({ error: 'Documento gerado inválido.' });
    }
    await db.run(
      `INSERT OR REPLACE INTO generated_documents (
        id, template_id, template_name, title, customer_id, customer_name, customer_cpf_cnpj,
        rendered_content, created_by_user_id, created_by_user_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doc.id,
        doc.templateId || null,
        doc.templateName || '',
        doc.title || '',
        doc.customerId || null,
        doc.customerName || null,
        doc.customerCpfCnpj || null,
        doc.renderedContent || '',
        doc.createdByUserId || null,
        doc.createdByUserName || null,
        doc.createdAt || new Date().toISOString(),
      ]
    );
    res.json({ success: true, id: doc.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao salvar documento gerado.' });
  }
});

router.delete('/generated-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM generated_documents WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao excluir documento gerado.' });
  }
});

// -----------------------------------------------------------------------------
// SETTINGS
// -----------------------------------------------------------------------------

router.get('/settings', async (req, res) => {
  try {
    const row = await db.get<any>('SELECT settings_json FROM company_settings WHERE id = ?', ['default']);
    if (row && row.settings_json) {
      res.json(JSON.parse(row.settings_json));
    } else {
      res.json({});
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao obter configurações.' });
  }
});

router.put('/settings', async (req: AuthRequest, res) => {
  try {
    const newSettings = req.body;
    const now = new Date().toISOString();
    await db.run(
      'INSERT OR REPLACE INTO company_settings (id, settings_json, updated_at) VALUES (?, ?, ?)',
      ['default', JSON.stringify(newSettings), now]
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE_COMPANY_SETTINGS',
      entityType: 'SETTINGS',
      entityId: 'default',
      ipAddress: req.ip,
    });

    broadcastSync('settings-updated');
    broadcastSync('catalog-updated', { type: 'settings' });

    res.json(newSettings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar configurações.' });
  }
});

// -----------------------------------------------------------------------------
// AUDIT LOGS
// -----------------------------------------------------------------------------

router.get('/audit', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const entityType = req.query.entityType as string;
    const userId = req.query.userId as string;
    const action = req.query.action as string;

    const result = await getAuditLogs({ limit, offset, entityType, userId, action });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao buscar auditoria.' });
  }
});

// -----------------------------------------------------------------------------
// BACKUPS
// -----------------------------------------------------------------------------

router.get('/backup/export', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const snapshot = await exportDatabaseSnapshot();
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'EXPORT_BACKUP',
      entityType: 'DATABASE',
      ipAddress: req.ip,
    });
    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao exportar backup.' });
  }
});

router.post('/backup/create', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const filename = await createLocalBackupFile('manual');
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE_MANUAL_BACKUP',
      entityType: 'DATABASE',
      details: { filename },
      ipAddress: req.ip,
    });
    res.json({ success: true, filename });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao criar backup local.' });
  }
});

router.get('/backup/list', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const backups = listLocalBackups();
    res.json(backups);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao listar backups.' });
  }
});

router.post('/backup/import', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const snapshot = req.body;
    const result = await restoreDatabaseSnapshot(snapshot, req.user?.id, req.user?.name);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao importar backup.' });
  }
});

router.post('/database/reset-seed', async (req: AuthRequest, res) => {
  try {
    const result = await resetDatabaseToSeed(req.user?.id, req.user?.name);
    persistDatabase();

    broadcastSync('catalog-updated', { type: 'reset-seed' });
    broadcastSync('items-updated');
    broadcastSync('catalog-niches-updated');
    broadcastSync('categories-updated');
    broadcastSync('production-updated');

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao restaurar banco para os dados padrão.' });
  }
});

// -----------------------------------------------------------------------------
// AI COMPLETION (DECOUPLED / FREE MODEL PROXY)
// -----------------------------------------------------------------------------

router.post('/ai/generate', async (req, res) => {
  try {
    const { type, prompt, context } = req.body;
    const response = await generateAIContent({ type: type || 'custom', prompt, context });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro no serviço de IA.' });
  }
});

export default router;
