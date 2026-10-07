import * as SecureStore from 'expo-secure-store';

import { getAccessToken, getAuthUser } from '@/lib/auth';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';
import { formatBRL } from '@/lib/format';
import { callServerFn } from '@/lib/server-fn';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const FN = {
  conveniences: 'd82ee90b8b50396bc17e4c3c69aacf5f8fe36c27d3e5fdbbcedc540a9c6f4540',
  createConv: '992f8dccc6e49f1902b24282f800c0fbeac81ad422089905522a8e742a6b8365',
  archiveConv: '5eda0ca9fc3bc2bd846f03d6031bfd2cab1b3d4ac9cf4bcb361b5e4f48be7977',
  deleteConv: '050dfed0243fe317dd9f5f66f5eadf7b993a277b22b6932153ecff2be6946972',
  updateConv: '65fde1745e8ab8a3857043ae49e682cdab16e8e55c851895bbe1fd9f9db3d8c3',
  regenToken: '44854a5f508f00f3d9d69cce4f7dbacc7be1f32515f3312b033e3bfd25a5abf8',
  devices: 'c617c104f9bf1d8dd2f3d63fee520729bd70e3728f7138e5354c4c014ce083f4',
  deviceStatus: 'e3352b0b0cd164bfbb7e2a63b1865d6c7730b35b4a779356c2e86e7cf343147e',
  deleteDevice: 'c0d2b16f6d4c6a1e0e2d671643e40737128d80c1e223041dd7438174b61d03a7',
  sales: 'faff3ebc65c00d51f5c4136fe3d669312366a2b7dbb7ebb0c8e76e29a2abba37',
  salesSummary: '07c32cc9ab5c1c87617a39afefefe5a97fa16e325a52c2cac22fa6bdb22104de',
  cashier: '814ced5af5324c9479900c79122883b990c93bec8662f8cdeebf212773bc6bdb',
  products: '105bd799834984b4d533484ae120c8f03d361753aa41664da451add3201a5b37',
  saveProduct: 'e9f746c4a33a0841ac407095ff39bd471de40ff288bb1bbea5ee7cd47763ef80',
  deleteProduct: '2131fd5ddeb040197c48c1a3face8b710339682c5210b67a28a925d16ae0ceec',
  stock: 'aded2057e63c12db39ad2639d45043ab4cfa7b651e732c3590eab770a37c0f46',
  cashless: 'f67c7899c5ae36dcd27ca919b258be387b8590cde45ea4c77d95dcb3be8c9a35',
  cashlessSave: '341516717292f55a94db313da713333e999127b58c3840efcb5016870dcaab9f',
  cashlessUpdate: 'a34fa4805eb82a71652372233ccaf69eee7c131d89f9cb0c93e312e0e2723de5',
  cashlessDelete: '14b746862f420ae6699ef34962e1d353ead52cf4b426609231dd80655bfc376d',
  cashlessMove: 'e35a3b7fb399ed4dbbd21f22289b6551613b6eece8e9b4cdd7b648f639d49757',
  cashlessTx: '76c26130932606e87570a47dbf30f1cc79f7895db8e7f3a2573b4b782065bb4a',
} as const;

type Row = Record<string, unknown>;

export type PdvDevice = {
  id: string;
  name: string;
  status: string;
  lastSeenAt: string | null;
};

export type PdvConvenience = {
  id: string;
  name: string;
  token: string | null;
  merchantName: string | null;
  archived: boolean;
};

export type PdvFee = {
  amount: number;
  percent: number | null;
};

export type PdvSalePayment = {
  method: string;
  amount: number;
  status: string;
  nsu: string | null;
  authorization: string | null;
  brand: string | null;
  fee: PdvFee | null;
};

export type PdvSale = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string | null;
  deviceName: string;
  operator: string | null;
  authorization: string;
  nsu: string;
  items: string[];
  payments: PdvSalePayment[];
  fee: PdvFee | null;
  voided: boolean;
};

export type PdvSalesSummary = {
  saleCount: number;
  gross: number;
  bank: number;
  gate8: number;
  net: number;
  byMethod: { method: string; count: number; amount: number }[];
};

export type PdvCashierSession = {
  id: string;
  deviceId: string;
  deviceName: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  openingBalance: number;
  counted: number | null;
  expected: number | null;
  difference: number | null;
  cashSales: number;
  withdrawals: number;
  expenses: number;
};

export type PdvProduct = {
  id: string;
  name: string;
  category: string | null;
  sku: string | null;
  price: number;
  cost: number;
  active: boolean;
  trackStock: boolean;
  stock: number;
  minStock: number;
  description: string | null;
  imageUrl: string | null;
  convenienceId: string | null;
};

export type PdvCard = {
  id: string;
  uid: string;
  holder: string;
  cpf: string | null;
  phone: string | null;
  status: string;
  balance: number;
  retired: boolean;
};

export type PdvCardTx = {
  id: string;
  type: string;
  amount: number;
  createdAt: string | null;
  description: string | null;
};

export const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit: 'Crédito',
  credit_card: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  cashless: 'Cashless',
  other: 'Outro',
};

export const CASHLESS_TX_LABELS: Record<string, string> = {
  topup: 'Recarga',
  consumption: 'Consumo',
  refund: 'Estorno',
  adjust: 'Ajuste',
  block: 'Cartão bloqueado',
  unblock: 'Cartão desbloqueado',
  transfer_out: 'Saldo transferido',
  transfer_in: 'Saldo recebido',
};

function text(value: unknown) {
  return value == null ? '' : String(value);
}

function enabledFlag(value: unknown) {
  if (value === true || value === 1 || value === 'true' || value === '1') return true;
  if (value === false || value === 0 || value === 'false' || value === '0') return false;
  return null;
}

function productImage(row: Row) {
  const candidates = [
    row.image_url,
    row.imageUrl,
    row.image,
    row.photo_url,
    row.photo,
    row.picture_url,
    row.thumbnail_url,
    row.thumb_url,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    const nested = asObject(candidate);
    const url = nested ? text(nested.url || nested.public_url || nested.src || nested.image_url).trim() : '';
    if (url) return url;
  }
  return null;
}

function explicitTrack(row: Row) {
  const flags = [row.track_stock, row.manage_stock, row.stock_control, row.track_inventory, row.manage_inventory].map(
    enabledFlag
  );
  const decided = flags.filter((value): value is boolean => value != null);
  if (decided.includes(true)) return true;
  if (decided.includes(false)) return false;
  return null;
}

function tracksStock(row: Row) {
  const explicit = explicitTrack(row);
  if (explicit != null) return explicit;
  return num(row.stock_quantity) > 0;
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asObject(value: unknown): Row | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Row;
  return null;
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function pick(raw: unknown, key: string): unknown {
  const root = asObject(raw);
  if (!root) return null;
  if (root[key] != null) return root[key];
  const nested = asObject(root.data);
  return nested?.[key] ?? null;
}

function mapDevice(row: Row): PdvDevice {
  return {
    id: text(row.id),
    name: text(row.name) || 'Maquininha',
    status: text(row.status) || 'active',
    lastSeenAt: row.last_seen_at ? text(row.last_seen_at) : null,
  };
}

const ARCHIVED_KEY = 'gate8.pdv.archivedConvenienceIds';
const RESTORED_KEY = 'gate8.pdv.restoredConvenienceIds';
const PRODUCT_OWNER_KEY = 'gate8.pdv.productOwners';
const PRODUCT_POS_KEY = 'gate8.pdv.productPosPublished';
function convenienceArchived(row: Row) {
  const stamp = row.archived_at ?? row.archivedAt ?? row.pos_archived_at ?? row.archived_on;
  if (typeof stamp === 'string' && stamp.trim()) return true;
  if (enabledFlag(row.archived) === true || enabledFlag(row.is_archived) === true) return true;
  return text(row.status).toLowerCase() === 'archived';
}

async function readIdSet(key: string) {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
    return new Set(ids);
  } catch {
    return new Set<string>();
  }
}

async function writeIdSet(key: string, ids: Set<string>) {
  await SecureStore.setItemAsync(key, JSON.stringify([...ids]));
}

async function readOwners() {
  try {
    const raw = await SecureStore.getItemAsync(PRODUCT_OWNER_KEY);
    if (!raw) return {} as Record<string, string>;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {} as Record<string, string>;
    const owners: Record<string, string> = {};
    for (const [id, convenienceId] of Object.entries(parsed)) {
      if (typeof convenienceId === 'string' && convenienceId) owners[id] = convenienceId;
    }
    return owners;
  } catch {
    return {} as Record<string, string>;
  }
}

async function rememberProductOwner(productId: string, convenienceId: string) {
  if (!productId || !convenienceId) return;
  const owners = await readOwners();
  owners[productId] = convenienceId;
  await SecureStore.setItemAsync(PRODUCT_OWNER_KEY, JSON.stringify(owners));
}

async function forgetProductOwner(productId: string) {
  const owners = await readOwners();
  if (!owners[productId]) return;
  delete owners[productId];
  await SecureStore.setItemAsync(PRODUCT_OWNER_KEY, JSON.stringify(owners));
}

async function rememberArchive(id: string, archived: boolean) {
  const archivedIds = await readIdSet(ARCHIVED_KEY);
  const restoredIds = await readIdSet(RESTORED_KEY);
  if (archived) {
    archivedIds.add(id);
    restoredIds.delete(id);
  } else {
    archivedIds.delete(id);
    restoredIds.add(id);
  }
  await writeIdSet(ARCHIVED_KEY, archivedIds);
  await writeIdSet(RESTORED_KEY, restoredIds);
}

function mapConvenience(row: Row): PdvConvenience {
  return {
    id: text(row.id),
    name: text(row.name) || 'Conveniência',
    token: row.pos_token ? text(row.pos_token) : null,
    merchantName: row.pos_merchant_name ? text(row.pos_merchant_name) : null,
    archived: convenienceArchived(row),
  };
}

export function lastHoursRange(hours: number) {
  const to = new Date();
  const from = new Date(to.getTime() - hours * 3600 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function enableDisabledDevices(id: string) {
  const devices = await fetchDevices(id);
  await Promise.all(
    devices
      .filter((device) => device.status === 'disabled')
      .map((device) => setDeviceStatus(device.id, 'active'))
  );
}

export async function fetchConveniences(): Promise<PdvConvenience[]> {
  const raw = await callServerFn<unknown>(FN.conveniences, { include_archived: true });
  const rows = asRows(pick(raw, 'conveniences')).map(mapConvenience).filter((item) => item.id);
  const archivedIds = await readIdSet(ARCHIVED_KEY);
  const restoredIds = await readIdSet(RESTORED_KEY);
  return rows.map((item) => ({
    ...item,
    archived: restoredIds.has(item.id) ? false : archivedIds.has(item.id) ? true : item.archived,
  }));
}

export async function createConvenience(name: string, merchantName: string) {
  const raw = asObject(
    await callServerFn<unknown>(FN.createConv, {
      name: name.trim(),
      pos_merchant_name: merchantName.trim() || null,
    })
  );
  const nested = asObject(raw?.convenience) ?? asObject(asObject(raw?.data)?.convenience) ?? raw;
  return nested ? mapConvenience(nested) : null;
}

export async function archiveConvenience(id: string, archived: boolean) {
  await rememberArchive(id, archived);
  if (archived) return;
  await enableDisabledDevices(id);
}

export async function deleteConvenience(id: string, name: string) {
  await callServerFn(FN.deleteConv, { id, confirm_name: name });
  const archivedIds = await readIdSet(ARCHIVED_KEY);
  const restoredIds = await readIdSet(RESTORED_KEY);
  archivedIds.delete(id);
  restoredIds.delete(id);
  await writeIdSet(ARCHIVED_KEY, archivedIds);
  await writeIdSet(RESTORED_KEY, restoredIds);
}

export async function updateConvenience(id: string, patch: { name?: string; merchantName?: string | null }) {
  await callServerFn(FN.updateConv, {
    id,
    ...(patch.name != null ? { name: patch.name } : {}),
    ...(patch.merchantName !== undefined ? { pos_merchant_name: patch.merchantName } : {}),
  });
}

export async function regenerateToken(id: string) {
  await callServerFn(FN.regenToken, { id });
}

export async function fetchDevices(convenienceId: string): Promise<PdvDevice[]> {
  const raw = await callServerFn<unknown>(FN.devices, { convenience_id: convenienceId });
  return asRows(pick(raw, 'devices')).map(mapDevice);
}

export async function setDeviceStatus(id: string, status: 'active' | 'disabled') {
  await callServerFn(FN.deviceStatus, { id, status });
}

export async function deleteDevice(id: string) {
  await callServerFn(FN.deleteDevice, { id });
}

function mapSaleItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      const row = asObject(item);
      return row ? text(row.description) || text(row.name) || text(row.product_name) : '';
    })
    .filter(Boolean);
}

function optionalNum(value: unknown): number | null {
  if (value == null || value === '' || typeof value === 'object') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function firstNum(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = optionalNum(row[key]);
    if (value != null) return value;
  }
  return null;
}

function readFee(row: Row, gross: number | null): PdvFee | null {
  const snapshot = asObject(row.fee_snapshot) ?? asObject(row.fees);
  const source = snapshot ?? row;
  const bank = firstNum(source, ['bank_amount', 'bank_fee', 'bank_fee_amount', 'bank_total']);
  const gate8 = firstNum(source, ['gate8_amount', 'gate8_fee', 'gate8_fee_amount', 'service_fee', 'platform_fee', 'gate8_total']);
  let amount =
    bank != null || gate8 != null
      ? (bank ?? 0) + (gate8 ?? 0)
      : firstNum(source, ['fee_amount', 'fee_total', 'total_fee', 'fee']);
  const feeCents = firstNum(source, ['fee_cents', 'fee_amount_cents']);
  if (amount == null && feeCents != null) amount = feeCents / 100;
  const rawPercent = firstNum(source, ['fee_percent', 'percent', 'rate', 'fee_rate', 'applied_percent']);
  const percent = rawPercent == null ? null : rawPercent > 0 && rawPercent <= 1 ? rawPercent * 100 : rawPercent;
  const net = firstNum(source, ['net_amount', 'net_total']);
  if (amount == null && net != null && net > 0 && gross != null && gross + 0.001 >= net) {
    amount = gross - net;
  }
  if (amount == null && percent != null && gross != null) {
    amount = gross * (percent / 100);
  }
  if (amount == null && percent == null) return null;
  return {
    amount: Math.round((amount ?? 0) * 100) / 100,
    percent,
  };
}

export function saleFeeLabel(fee: PdvFee | null) {
  if (!fee) return null;
  const value = `- ${formatBRL(fee.amount)}`;
  if (fee.percent == null) return `Taxa ${value}`;
  const rate = fee.percent.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return `Taxa ${rate}% · ${value}`;
}

export function storedFeeTotal(sales: PdvSale[], saleCount: number) {
  if (sales.length < saleCount) return null;
  const active = sales.filter((sale) => !sale.voided);
  if (active.some((sale) => !sale.fee)) return null;
  return Math.round(active.reduce((sum, sale) => sum + (sale.fee?.amount ?? 0), 0) * 100) / 100;
}

function mapPayments(value: unknown): PdvSalePayment[] {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const row = asObject(item);
    if (!row) return [];
    const method = text(row.method ?? row.payment_method).trim();
    if (!method) return [];
    const cents = num(row.amount_cents);
    const amount = row.amount != null && row.amount !== '' ? num(row.amount) : cents / 100;
    const nsu = text(row.nsu).trim();
    const authorization = text(row.authorization ?? row.acquirer_authorization).trim();
    const brand = text(row.brand).trim();
    return [
      {
        method,
        amount,
        status: text(row.status).trim(),
        nsu: nsu || null,
        authorization: authorization || null,
        brand: brand || null,
        fee: readFee(row, amount),
      },
    ];
  });
}

function mapSale(row: Row): PdvSale {
  const status = text(row.status).toLowerCase();
  const amount = num(row.total_amount ?? row.amount ?? row.gross ?? row.total);
  const payments = mapPayments(row.payments);
  const ownFee = readFee(row, amount);
  const partFees = payments.map((part) => part.fee).filter((fee): fee is PdvFee => fee != null);
  const percents = [...new Set(partFees.map((fee) => fee.percent))];
  const fee =
    ownFee ??
    (partFees.length === payments.length && partFees.length > 0
      ? {
          amount: Math.round(partFees.reduce((sum, part) => sum + part.amount, 0) * 100) / 100,
          percent: percents.length === 1 ? percents[0] : null,
        }
      : null);
  return {
    id: text(row.id),
    amount,
    method: text(row.payment_method ?? row.method),
    status,
    createdAt: row.created_at ? text(row.created_at) : null,
    deviceName: text(asObject(row.device)?.name) || text(row.device_name) || '—',
    operator: row.operator_name
      ? text(row.operator_name)
      : row.cashier_name
        ? text(row.cashier_name)
        : null,
    authorization: text(row.acquirer_authorization ?? row.stone_authorization) || '—',
    nsu: text(row.acquirer_nsu ?? row.stone_nsu) || '—',
    items: mapSaleItems(row.items ?? row.line_items),
    payments,
    fee,
    voided: ['voided', 'refunded', 'canceled', 'cancelled', 'reversed'].includes(status),
  };
}

export function paymentLabel(method: string) {
  return PAYMENT_LABELS[method] ?? (method || 'Outro');
}

export function saleBadgeLabel(sale: Pick<PdvSale, 'method' | 'payments'>) {
  const methods = [...new Set(sale.payments.map((part) => part.method).filter(Boolean))];
  if (methods.length > 1) return 'Dividido';
  if (methods.length === 1) return paymentLabel(methods[0]);
  return paymentLabel(sale.method);
}

export function saleMatchesMethod(sale: Pick<PdvSale, 'method' | 'payments'>, method: string) {
  if (!method) return true;
  const keys = method === 'credit' ? ['credit', 'credit_card'] : [method];
  if (sale.payments.length > 0) return sale.payments.some((part) => keys.includes(part.method));
  return keys.includes(sale.method);
}

export async function fetchSales(input: {
  convenienceId: string;
  from: string;
  to: string;
  deviceId?: string | null;
  paymentMethod?: string | null;
}): Promise<PdvSale[]> {
  const raw = await callServerFn<unknown>(FN.sales, {
    from: input.from,
    to: input.to,
    device_id: input.deviceId || null,
    payment_method: input.paymentMethod || null,
    convenience_id: input.convenienceId,
    limit: 200,
  });
  return asRows(pick(raw, 'sales')).map(mapSale);
}

export async function fetchSalesSummary(input: {
  convenienceId: string;
  from: string;
  to: string;
  deviceId?: string | null;
}): Promise<PdvSalesSummary> {
  const raw = await callServerFn<unknown>(FN.salesSummary, {
    from: input.from,
    to: input.to,
    device_id: input.deviceId || null,
    convenience_id: input.convenienceId,
  });
  const summary = asObject(pick(raw, 'summary')) ?? asObject(raw) ?? {};
  const methods = asRows(summary.by_payment_method ?? pick(raw, 'by_payment_method'));
  return {
    saleCount: num(summary.sale_count),
    gross: num(summary.gross_total),
    bank: num(summary.bank_total),
    gate8: num(summary.gate8_total),
    net: num(summary.net_total),
    byMethod: methods.map((row) => ({
      method: text(row.method),
      count: num(row.count),
      amount: num(row.amount ?? row.total ?? row.gross),
    })),
  };
}

export async function fetchCashierSessions(
  convenienceId: string,
  status: 'all' | 'open' | 'closed'
): Promise<PdvCashierSession[]> {
  const raw = await callServerFn<unknown>(FN.cashier, {
    status,
    limit: 200,
    convenience_id: convenienceId,
  });
  return asRows(pick(raw, 'sessions')).map((row) => {
    const device = asObject(row.device);
    const totals = asObject(row.totals);
    const expected = row.expected_drawer ?? row.expected ?? totals?.expected;
    const counted = row.counted_balance ?? row.closing_balance ?? row.counted;
    const difference =
      row.difference != null
        ? num(row.difference)
        : counted != null && expected != null
          ? num(counted) - num(expected)
          : null;
    return {
      id: text(row.id),
      deviceId: text(row.device_id ?? device?.id),
      deviceName: text(device?.name) || 'Maquininha',
      status: text(row.status) || (row.closed_at ? 'closed' : 'open'),
      openedAt: row.opened_at ? text(row.opened_at) : null,
      closedAt: row.closed_at ? text(row.closed_at) : null,
      openingBalance: num(row.opening_balance),
      counted: counted == null ? null : num(counted),
      expected: expected == null ? null : num(expected),
      difference,
      cashSales: num(totals?.cash_sales),
      withdrawals: num(totals?.withdrawals),
      expenses: num(totals?.expenses),
    };
  });
}

type ProductInput = {
  id?: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  price: number;
  cost: number;
  active: boolean;
  trackStock: boolean;
  stock: number;
  minStock: number;
  imageUrl?: string | null;
};

function mapProduct(row: Row): PdvProduct {
  return {
    id: text(row.id),
    name: text(row.name) || 'Item',
    category: row.category ? text(row.category) : null,
    sku: row.sku ? text(row.sku) : null,
    price: num(row.price),
    cost: num(row.cost),
    active: enabledFlag(row.active) !== false,
    trackStock: tracksStock(row),
    stock: num(row.stock_quantity),
    minStock: num(row.min_stock),
    description: row.description ? text(row.description) : null,
    imageUrl: productImage(row),
    convenienceId: rowConvenienceId(row) || null,
  };
}

function rowConvenienceId(row: Row) {
  const direct = row.convenience_id ?? row.pos_convenience_id ?? row.convenienceId;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const nested = asObject(direct) ?? asObject(row.convenience);
  const nestedId = nested?.id ?? nested?.convenience_id;
  return typeof nestedId === 'string' && nestedId.trim() ? nestedId.trim() : '';
}

function productPayload(convenienceId: string, product: ProductInput) {
  const trackStock = product.trackStock;
  return {
    id: product.id,
    event_id: null,
    convenience_id: convenienceId,
    name: product.name.trim(),
    description: product.description?.trim() || '',
    sku: product.sku?.trim() || '',
    category: product.category?.trim() || '',
    price: product.price,
    cost: product.cost,
    active: product.active,
    track_stock: trackStock,
    manage_stock: trackStock,
    stock_control: trackStock,
    stock_quantity: trackStock ? product.stock : 0,
    min_stock: trackStock ? product.minStock : 0,
    image_url: product.imageUrl?.trim() || '',
  };
}

async function writeProduct(convenienceId: string, product: ProductInput) {
  const payload = productPayload(convenienceId, product);
  try {
    await callServerFn(FN.saveProduct, payload);
  } catch (error) {
    const { stock_control: _stockControl, ...withoutExtra } = payload;
    try {
      await callServerFn(FN.saveProduct, withoutExtra);
    } catch {
      throw error;
    }
  }
}

async function loadProductRows() {
  const raw = await callServerFn<unknown>(FN.products, { mine: true });
  return asRows(pick(raw, 'products'));
}

export async function fetchProducts(convenienceId: string): Promise<PdvProduct[]> {
  const rows = await loadProductRows();
  return rows.map(mapProduct).filter((item) => item.convenienceId === convenienceId);
}

export async function saveProduct(convenienceId: string, product: ProductInput) {
  await writeProduct(convenienceId, product);
  if (product.id) await rememberProductOwner(product.id, convenienceId);
}

export async function uploadProductImage(uri: string, contentType: string) {
  if (!contentType.startsWith('image/')) throw new Error('O arquivo precisa ser uma imagem.');
  const user = await getAuthUser();
  if (!user?.id) throw new Error('Sessão expirada. Entre novamente.');
  const token = await getAccessToken();
  if (!token) throw new Error('Faça login para continuar.');
  const file = await fetch(uri);
  const blob = await file.blob();
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('Imagem muito grande. Máx 5MB.');
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${user.id}/pdv-products/${crypto.randomUUID()}.${ext}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/event-banners/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType || blob.type || 'image/jpeg',
      'x-upsert': 'false',
    },
    body: blob,
  });
  const raw = await response.text();
  if (!response.ok) {
    let message = 'Falha ao enviar a foto do produto.';
    try {
      const parsed = JSON.parse(raw) as { message?: string; error?: string };
      message = parsed.message || parsed.error || message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/event-banners/${path}`;
}

export async function deleteProduct(id: string) {
  await callServerFn(FN.deleteProduct, { id });
  await forgetProductOwner(id);
}

export async function moveStock(productId: string, delta: number, inbound: boolean) {
  await callServerFn(FN.stock, {
    product_id: productId,
    delta: inbound ? Math.abs(delta) : -Math.abs(delta),
    reason: inbound ? 'entrada manual' : 'saída manual',
  });
}

export async function fetchCashless(
  convenienceId: string,
  search?: string
): Promise<{ cards: PdvCard[]; count: number; active: number; balance: number }> {
  const raw = await callServerFn<unknown>(FN.cashless, {
    convenience_id: convenienceId,
    event_id: null,
    search: search || null,
  });
  const totals = asObject(pick(raw, 'totals')) ?? {};
  const cards = asRows(pick(raw, 'cards')).map((row) => ({
    id: text(row.id),
    uid: text(row.card_uid),
    holder: text(row.holder_name) || 'Sem nome',
    cpf: row.cpf ? text(row.cpf) : null,
    phone: row.phone ? text(row.phone) : null,
    status: text(row.status) || 'active',
    balance: num(row.balance),
    retired: Boolean(row.retired_at),
  }));
  return {
    cards,
    count: num(totals.count) || cards.length,
    active: num(totals.active) || cards.filter((card) => card.status === 'active' && !card.retired).length,
    balance: num(totals.balance),
  };
}

export async function saveCashlessCard(input: {
  id?: string;
  convenienceId: string;
  uid: string;
  holder: string;
  cpf: string;
  phone: string;
}) {
  await callServerFn(FN.cashlessSave, {
    id: input.id,
    convenience_id: input.convenienceId,
    event_id: null,
    card_uid: input.uid.trim(),
    holder_name: input.holder.trim() || null,
    cpf: input.cpf.trim(),
    phone: input.phone.trim(),
  });
}

export async function setCashlessStatus(id: string, status: 'active' | 'blocked') {
  await callServerFn(FN.cashlessUpdate, { id, status });
}

export async function deleteCashlessCard(id: string) {
  await callServerFn(FN.cashlessDelete, { card_id: id });
}

export async function moveCashless(input: {
  cardId: string;
  type: 'topup' | 'consumption' | 'refund' | 'adjust';
  amount: number;
  description?: string;
}) {
  await callServerFn(FN.cashlessMove, {
    card_id: input.cardId,
    type: input.type,
    amount: input.amount,
    description: input.description || null,
  });
}

export async function fetchCashlessTx(cardId: string): Promise<PdvCardTx[]> {
  const raw = await callServerFn<unknown>(FN.cashlessTx, { card_id: cardId });
  return asRows(pick(raw, 'transactions')).map((row) => ({
    id: text(row.id),
    type: text(row.type),
    amount: num(row.amount),
    createdAt: row.created_at ? text(row.created_at) : null,
    description: row.description ? text(row.description) : null,
  }));
}
