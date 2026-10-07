import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { BackHandler, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, Dimensions, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';

import { useScreenOverlay } from '@/components/screen-overlay';

import { Loader } from '@/components/Loader';
import { colors } from '@/constants/theme';
import { formatBRL, formatDateTime, formatEventDateTime } from '@/lib/format';
import {
  CASHLESS_TX_LABELS,
  PAYMENT_LABELS,
  paymentLabel,
  saleBadgeLabel,
  saleFeePercentLabel,
  saleMatchesMethod,
  storedFeeTotal,
  archiveConvenience,
  createConvenience,
  deleteCashlessCard,
  deleteConvenience,
  deleteDevice,
  deleteProduct,
  fetchCashierSessions,
  fetchCashless,
  fetchCashlessTx,
  fetchConveniences,
  fetchDevices,
  fetchProducts,
  fetchSales,
  fetchSalesSummary,
  lastHoursRange,
  moveCashless,
  moveStock,
  regenerateToken,
  saveCashlessCard,
  saveProduct,
  setCashlessStatus,
  setDeviceStatus,
  updateConvenience,
  uploadProductImage,
  type PdvCard,
  type PdvCashierSession,
  type PdvConvenience,
  type PdvDevice,
  type PdvProduct,
  type PdvSale,
  type PdvSalesSummary,
} from '@/lib/pdv';

type Tab = 'devices' | 'sales' | 'cashier' | 'items' | 'cashless';

function tap(style: StyleProp<ViewStyle>) {
  return ({ pressed }: PressableStateCallbackType) => [style, pressed && styles.tap];
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'cashier', label: 'Caixas' },
  { key: 'cashless', label: 'Cashless' },
  { key: 'devices', label: 'Maquininhas' },
  { key: 'items', label: 'Meus itens' },
  { key: 'sales', label: 'Vendas POS' },
];

export function PdvSection({
  nonce,
  onCopy,
  onToast,
}: {
  nonce: number;
  onCopy: (value: string, message: string) => void;
  onToast: (message: string) => void;
}) {
  const [list, setList] = useState<PdvConvenience[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<PdvConvenience | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await fetchConveniences();
      setList(rows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o Terminal PDV.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  const visible = (list ?? []).filter((item) => (archived ? item.archived : !item.archived));
  const opened = (list ?? []).find((item) => item.id === openId) ?? null;
  const archivedCount = (list ?? []).filter((item) => item.archived).length;
  const activeCount = (list ?? []).filter((item) => !item.archived).length;

  async function onArchive(item: PdvConvenience) {
    try {
      await archiveConvenience(item.id, true);
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Falha ao arquivar');
      return;
    }
    try {
      const devices = await fetchDevices(item.id);
      await Promise.all(
        devices
          .filter((device) => device.status !== 'disabled')
          .map((device) => setDeviceStatus(device.id, 'disabled'))
      );
      onToast('Conveniência arquivada');
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Arquivada, mas as maquininhas não foram desativadas');
    }
    await load();
  }

  async function onCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await createConvenience(newName, '');
      onToast('Conveniência criada');
      setNewName('');
      setCreating(false);
      const rows = await fetchConveniences();
      setList(rows);
      if (created?.id) setOpenId(created.id);
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Falha ao criar');
    } finally {
      setSaving(false);
    }
  }

  if (busy && !list) {
    return (
      <View style={styles.boot}>
        <Loader screen />
      </View>
    );
  }
  if (error && !list) return <Text style={styles.empty}>{error}</Text>;

  if (opened) {
    return (
      <PdvDetail
        convenience={opened}
        nonce={nonce}
        onBack={() => setOpenId(null)}
        onCopy={onCopy}
        onToast={onToast}
        onReload={async () => {
          const rows = await fetchConveniences();
          setList(rows);
        }}
      />
    );
  }

  return (
    <View style={styles.block}>
      <Text style={styles.hint}>
        Cada conveniência tem suas próprias maquininhas, vendas, caixas e itens — nada se mistura entre uma e outra.
      </Text>
      <View style={styles.salesFilters}>
        <Pressable onPress={() => setArchived(false)} style={tap([styles.chip, !archived && styles.chipOn])}>
          <Text style={[styles.chipText, !archived && styles.chipTextOn]}>Ativas ({activeCount})</Text>
        </Pressable>
        <Pressable onPress={() => setArchived(true)} style={tap([styles.chip, archived && styles.chipOn])}>
          <Text style={[styles.chipText, archived && styles.chipTextOn]}>Arquivadas ({archivedCount})</Text>
        </Pressable>
      </View>
      <Text style={styles.group}>
        {archived ? 'Conveniências arquivadas' : 'Suas conveniências'} ({visible.length})
      </Text>

      {!archived && !creating ? (
        <Pressable onPress={() => setCreating(true)} style={tap(styles.primaryBtn)}>
          <Ionicons name="add" size={16} color={colors.loginText} />
          <Text style={styles.primaryText}>Nova conveniência</Text>
        </Pressable>
      ) : !archived ? (
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Nome da conveniência</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Ex: Conveniência Arraiá 2026"
            placeholderTextColor="rgba(255,255,255,0.32)"
            style={styles.input}
            maxLength={120}
          />
          <View style={styles.row}>
            <Pressable
              onPress={() => {
                setCreating(false);
                setNewName('');
              }}
              style={tap(styles.ghostBtn)}
            >
              <Text style={styles.ghostText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => void onCreate()}
              disabled={!newName.trim() || saving}
              style={tap([styles.primaryBtn, (!newName.trim() || saving) && styles.off])}
            >
              <Text style={styles.primaryText}>Criar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={!!deleting} transparent animationType="fade" onRequestClose={() => setDeleting(null)}>
        <Pressable style={styles.modalBg} onPress={() => setDeleting(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Excluir conveniência?</Text>
            <Text style={styles.modalText}>
              Digite o nome {deleting ? `"${deleting.name}"` : ''} para confirmar. Esta ação não pode ser desfeita.
            </Text>
            <TextInput
              value={deleteName}
              onChangeText={setDeleteName}
              placeholder="Nome da conveniência"
              placeholderTextColor="rgba(255,255,255,0.32)"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setDeleting(null)} style={tap(styles.ghostBtn)}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!deleting?.archived) return;
                  try {
                    await deleteConvenience(deleting.id, deleteName.trim());
                    onToast('Conveniência excluída');
                    setDeleting(null);
                    setDeleteName('');
                    await load();
                  } catch (caught) {
                    onToast(caught instanceof Error ? caught.message : 'Falha ao excluir');
                  }
                }}
                disabled={!deleting || deleteName.trim() !== deleting.name}
                style={tap([styles.primaryBtn, (!deleting || deleteName.trim() !== deleting.name) && styles.off])}
              >
                <Text style={styles.primaryText}>Excluir</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {visible.length === 0 ? (
        <Text style={styles.empty}>
          {archived ? 'Nenhuma conveniência arquivada.' : 'Nenhuma conveniência ainda. Crie a primeira para começar.'}
        </Text>
      ) : (
        visible.map((item) => (
          <View key={item.id} style={styles.listCard}>
            <View style={styles.listCardInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[item.merchantName, item.token].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={styles.listCardActions}>
              {item.archived ? (
                <>
                  <Pressable
                    onPress={async () => {
                      try {
                        await archiveConvenience(item.id, false);
                      } catch (caught) {
                        onToast(caught instanceof Error ? caught.message : 'Falha ao restaurar');
                        return;
                      }
                      onToast('Restaurada');
                      setArchived(false);
                      await load();
                      setOpenId(item.id);
                    }}
                    style={tap(styles.listGhost)}
                  >
                    <Text style={styles.listGhostText}>Restaurar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setDeleting(item);
                      setDeleteName('');
                    }}
                    style={tap(styles.listDanger)}
                  >
                    <Text style={styles.listDangerText}>Excluir</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => setOpenId(item.id)} style={tap(styles.listPrimary)}>
                    <Text style={styles.listPrimaryText}>Abrir</Text>
                  </Pressable>
                  <Pressable onPress={() => void onArchive(item)} style={tap(styles.listGhost)}>
                    <Text style={styles.listGhostText}>Arquivar</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function PdvDetail({
  convenience,
  nonce,
  onBack,
  onCopy,
  onToast,
  onReload,
}: {
  convenience: PdvConvenience;
  nonce: number;
  onBack: () => void;
  onCopy: (value: string, message: string) => void;
  onToast: (message: string) => void;
  onReload: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('sales');
  const [name, setName] = useState(convenience.name);
  const [savingName, setSavingName] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  useEffect(() => {
    setName(convenience.name);
  }, [convenience.id, convenience.name]);

  return (
    <View style={styles.block}>
      <Pressable onPress={onBack} style={tap(styles.backRow)}>
        <Ionicons name="chevron-back" size={18} color={colors.blue} />
        <Text style={styles.linkText}>Conveniências</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Token desta conveniência (use em cada maquininha)</Text>
        <View style={styles.tokenRow}>
          <Pressable
            onPress={() => convenience.token && onCopy(convenience.token, 'Copiado')}
            style={styles.tokenBox}
          >
            <Text style={styles.token}>{convenience.token || '—'}</Text>
          </Pressable>
          <Pressable
            onPress={() => convenience.token && onCopy(convenience.token, 'Copiado')}
            style={tap(styles.ghostBtn)}
          >
            <Ionicons name="copy-outline" size={14} color={colors.blue} />
            <Text style={styles.ghostText}>Copiar</Text>
          </Pressable>
          <Pressable onPress={() => setRegenOpen(true)} style={tap(styles.ghostBtn)}>
            <Ionicons name="refresh" size={14} color={colors.text} />
            <Text style={styles.ghostText}>Novo token</Text>
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>Nome da conveniência</Text>
        <View style={styles.amountRow}>
          <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={120} />
          {name.trim() && name.trim() !== convenience.name ? (
            <Pressable
              onPress={async () => {
                setSavingName(true);
                try {
                  await updateConvenience(convenience.id, { name: name.trim() });
                  onToast('Nome da conveniência salvo');
                  await onReload();
                } catch (caught) {
                  onToast(caught instanceof Error ? caught.message : 'Falha ao salvar');
                } finally {
                  setSavingName(false);
                }
              }}
              style={tap(styles.ghostBtn)}
            >
              <Text style={styles.ghostText}>{savingName ? '...' : 'Salvar'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.subTabs}
        contentContainerStyle={styles.subTabsInner}
      >
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={tap([styles.subTab, tab === item.key && styles.subTabOn])}
          >
            <Text style={[styles.subTabText, tab === item.key && styles.subTabTextOn]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'devices' ? (
        <DevicesPane convenienceId={convenience.id} nonce={nonce} onToast={onToast} />
      ) : null}
      {tab === 'sales' ? <SalesPane convenienceId={convenience.id} nonce={nonce} /> : null}
      {tab === 'cashier' ? <CashierPane convenienceId={convenience.id} nonce={nonce} /> : null}
      {tab === 'items' ? <ItemsPane convenienceId={convenience.id} nonce={nonce} onToast={onToast} /> : null}
      {tab === 'cashless' ? (
        <CashlessPane convenienceId={convenience.id} nonce={nonce} onToast={onToast} />
      ) : null}

      <Modal visible={regenOpen} transparent animationType="fade" onRequestClose={() => setRegenOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setRegenOpen(false)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Gerar novo token?</Text>
            <Text style={styles.modalText}>
              As maquininhas desta conveniência precisarão entrar novamente com o token novo.
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRegenOpen(false)} style={tap(styles.ghostBtn)}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  setRegenOpen(false);
                  try {
                    await regenerateToken(convenience.id);
                    onToast('Token renovado');
                    await onReload();
                  } catch (caught) {
                    onToast(caught instanceof Error ? caught.message : 'Falha ao gerar token');
                  }
                }}
                style={tap(styles.primaryBtn)}
              >
                <Text style={styles.primaryText}>Gerar novo</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DevicesPane({
  convenienceId,
  nonce,
  onToast,
}: {
  convenienceId: string;
  nonce: number;
  onToast: (message: string) => void;
}) {
  const [devices, setDevices] = useState<PdvDevice[] | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setDevices(await fetchDevices(convenienceId));
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Falha ao carregar maquininhas');
    } finally {
      setBusy(false);
    }
  }, [convenienceId, onToast]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  if (busy && !devices) {
    return (
      <View style={styles.miniBoot}>
        <Loader size={96} />
      </View>
    );
  }

  const active = (devices ?? []).filter((item) => item.status !== 'disabled');
  const disabled = (devices ?? []).filter((item) => item.status === 'disabled');

  return (
    <View style={styles.gap}>
      <Text style={styles.group}>Liberadas ({active.length})</Text>
      {active.length === 0 ? <Text style={styles.empty}>Nenhuma maquininha liberada ainda.</Text> : null}
      {active.map((device) => (
        <DeviceRow
          key={device.id}
          device={device}
          onToast={onToast}
          onReload={load}
        />
      ))}
      {disabled.length > 0 ? (
        <>
          <Text style={styles.group}>Desativadas ({disabled.length})</Text>
          {disabled.map((device) => (
            <DeviceRow key={device.id} device={device} onToast={onToast} onReload={load} />
          ))}
        </>
      ) : null}
    </View>
  );
}

function DeviceRow({
  device,
  onToast,
  onReload,
}: {
  device: PdvDevice;
  onToast: (message: string) => void;
  onReload: () => Promise<void>;
}) {
  const off = device.status === 'disabled';
  const [confirm, setConfirm] = useState(false);
  return (
    <View style={styles.hit}>
      <View style={styles.hitInfo}>
        <Text style={styles.deviceName}>{device.name}</Text>
        <Text style={styles.meta}>
          {device.lastSeenAt ? `Visto ${formatDateTime(device.lastSeenAt)}` : 'Nunca conectada'}
        </Text>
      </View>
      <Text style={[styles.badge, off ? styles.badgeOff : styles.badgeOn]}>{off ? 'Desativado' : 'Ativado'}</Text>
      <Pressable
        onPress={async () => {
          try {
            await setDeviceStatus(device.id, off ? 'active' : 'disabled');
            await onReload();
          } catch (caught) {
            onToast(caught instanceof Error ? caught.message : 'Falha ao atualizar');
          }
        }}
        style={tap(styles.ghostBtn)}
      >
        <Text style={styles.ghostText}>{off ? 'Reativar' : 'Desativar'}</Text>
      </Pressable>
      <Pressable onPress={() => setConfirm(true)} hitSlop={6} style={tap(styles.iconHit)}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
      </Pressable>
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <Pressable style={styles.modalBg} onPress={() => setConfirm(false)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Excluir maquininha?</Text>
            <Text style={styles.modalText}>{device.name} será removida permanentemente.</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setConfirm(false)} style={tap(styles.ghostBtn)}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  setConfirm(false);
                  try {
                    await deleteDevice(device.id);
                    onToast('Maquininha excluída permanentemente.');
                    await onReload();
                  } catch (caught) {
                    onToast(caught instanceof Error ? caught.message : 'Falha ao excluir');
                  }
                }}
                style={tap(styles.primaryBtn)}
              >
                <Text style={styles.primaryText}>Excluir</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
}) {
  const [open, setOpen] = useState<'date' | 'time' | 'datetime' | null>(null);
  const [draft, setDraft] = useState(value);

  function start() {
    setDraft(value);
    setOpen(Platform.OS === 'ios' ? 'datetime' : 'date');
  }

  function onPick(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === 'dismissed') {
      setOpen(null);
      return;
    }
    const next = selected ?? draft;
    setDraft(next);
    if (Platform.OS === 'ios') return;
    if (open === 'date') {
      setOpen('time');
      return;
    }
    setOpen(null);
    onChange(next);
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={start} style={tap(styles.dateBtn)}>
        <Ionicons name="calendar-outline" size={16} color={colors.blue} />
        <Text style={styles.dateText}>{formatEventDateTime(value.toISOString())}</Text>
      </Pressable>
      {open ? (
        <View>
          <DateTimePicker
            value={draft}
            mode={open}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            onChange={onPick}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => {
                onChange(draft);
                setOpen(null);
              }}
              style={styles.dateOk}
            >
              <Text style={styles.linkText}>Confirmar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SalesPane({ convenienceId, nonce }: { convenienceId: string; nonce: number }) {
  const [period, setPeriod] = useState<24 | 168 | 720 | 'custom'>(24);
  const [customFrom, setCustomFrom] = useState(() => new Date(Date.now() - 24 * 3600 * 1000));
  const [customTo, setCustomTo] = useState(() => new Date());
  const [method, setMethod] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [devices, setDevices] = useState<PdvDevice[]>([]);
  const [query, setQuery] = useState('');
  const [sales, setSales] = useState<PdvSale[]>([]);
  const [summary, setSummary] = useState<PdvSalesSummary | null>(null);
  const [busy, setBusy] = useState(true);
  const [page, setPage] = useState(0);
  const range = useMemo(() => {
    if (period !== 'custom') return lastHoursRange(period);
    const from = customFrom.getTime() <= customTo.getTime() ? customFrom : customTo;
    const to = customFrom.getTime() <= customTo.getTime() ? customTo : customFrom;
    return { from: from.toISOString(), to: to.toISOString() };
  }, [period, customFrom, customTo]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [rows, totals, machineList] = await Promise.all([
        fetchSales({
          convenienceId,
          from: range.from,
          to: range.to,
          deviceId: deviceId || null,
        }),
        fetchSalesSummary({ convenienceId, from: range.from, to: range.to, deviceId: deviceId || null }),
        fetchDevices(convenienceId),
      ]);
      setSales(rows);
      setSummary(totals);
      setDevices(machineList);
      setPage(0);
    } catch {
      setSales([]);
      setSummary(null);
    } finally {
      setBusy(false);
    }
  }, [convenienceId, range.from, range.to, deviceId]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sales.filter((sale) => {
      if (!saleMatchesMethod(sale, method)) return false;
      if (!needle) return true;
      const hay = [
        sale.authorization,
        sale.nsu,
        sale.deviceName,
        sale.operator ?? '',
        sale.items.join(' '),
        saleBadgeLabel(sale),
        ...sale.payments.flatMap((part) => [
          paymentLabel(part.method),
          part.nsu ?? '',
          part.authorization ?? '',
          part.brand ?? '',
          formatBRL(part.amount),
        ]),
        String(sale.amount),
        formatBRL(sale.amount),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [sales, query, method]);

  const storedFee = useMemo(
    () => (summary ? storedFeeTotal(sales, summary.saleCount) : null),
    [sales, summary]
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages - 1);
  const paged = filtered.slice(current * 8, current * 8 + 8);

  return (
    <View style={styles.gap}>
      <View style={styles.salesFilters}>
        {(
          [
            [24, '24h'],
            [168, '7d'],
            [720, '30d'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={String(value)}
            onPress={() => setPeriod(value)}
            style={tap([styles.chip, styles.periodChip, period === value && styles.chipOn])}
          >
            <Text style={[styles.chipText, period === value && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setPeriod('custom')}
          style={tap([styles.chip, styles.periodChip, period === 'custom' && styles.chipOn])}
        >
          <Text style={[styles.chipText, period === 'custom' && styles.chipTextOn]}>Personalizado</Text>
        </Pressable>
      </View>
      {period === 'custom' ? (
        <View style={styles.card}>
          <DateTimeField label="De" value={customFrom} onChange={setCustomFrom} />
          <DateTimeField label="Até" value={customTo} onChange={setCustomTo} />
        </View>
      ) : null}
      <View style={styles.salesFilters}>
        {[
          ['', 'Todos'],
          ['pix', 'Pix'],
          ['credit', 'Crédito'],
          ['debit', 'Débito'],
          ['cash', 'Dinheiro'],
          ['cashless', 'Cashless'],
        ].map(([value, label]) => (
          <Pressable
            key={value || 'all'}
            onPress={() => {
              setMethod(value);
              setPage(0);
            }}
            style={tap([styles.chip, method === value && styles.chipOn])}
          >
            <Text style={[styles.chipText, method === value && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {devices.length > 0 ? (
        <View style={styles.salesFilters}>
          <Pressable onPress={() => setDeviceId('')} style={tap([styles.chip, !deviceId && styles.chipOn])}>
            <Text style={[styles.chipText, !deviceId && styles.chipTextOn]}>Todas as maquininhas</Text>
          </Pressable>
          {devices.map((device) => (
            <Pressable
              key={device.id}
              onPress={() => setDeviceId(device.id)}
              style={tap([styles.chip, deviceId === device.id && styles.chipOn])}
            >
              <Text style={[styles.chipText, deviceId === device.id && styles.chipTextOn]} numberOfLines={1}>
                {device.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setPage(0);
        }}
        placeholder="Buscar AUT, NSU, item ou valor"
        placeholderTextColor="rgba(255,255,255,0.32)"
        style={styles.input}
      />

      {busy && !summary ? (
        <View style={styles.miniBoot}>
          <Loader size={96} />
        </View>
      ) : (
        <>
          {summary ? (
            <View style={styles.gap}>
              <View style={styles.salesKpiRow}>
                <Kpi label="Vendas" value={String(summary.saleCount)} flex />
                <Kpi label="Bruto" value={formatBRL(summary.gross)} flex />
                <Kpi
                  label="Taxa Gate8"
                  value={`- ${formatBRL(storedFee ?? summary.bank + summary.gate8)}`}
                  flex
                />
              </View>
              <Kpi
                label="Líquido"
                value={formatBRL(storedFee != null ? summary.gross - storedFee : summary.net)}
                accent
                spread
              />
            </View>
          ) : null}
          {summary?.byMethod.length ? (
            <View style={styles.card}>
              <Text style={styles.group}>Vendas por forma de pagamento</Text>
              {summary.byMethod.map((item) => (
                <View key={item.method} style={styles.line}>
                  <Text style={styles.meta}>
                    {PAYMENT_LABELS[item.method] ?? item.method} · {item.count}
                  </Text>
                  <Text style={styles.meta}>{formatBRL(item.amount)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {paged.map((sale) => {
            const place = [sale.deviceName !== '—' ? sale.deviceName : '', sale.operator].filter(Boolean).join(' · ');
            const detail = [sale.items.join(', '), `Aut. ${sale.authorization} · NSU ${sale.nsu}`]
              .filter(Boolean)
              .join(' · ');
            const singleMethod = sale.payments.length === 1 ? sale.payments[0].method : sale.method;
            const percentLabel =
              sale.payments.length <= 1
                ? saleFeePercentLabel(sale.fee ?? sale.payments[0]?.fee ?? null, singleMethod)
                : null;
            return (
              <View key={sale.id} style={styles.saleCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{formatBRL(sale.amount)}</Text>
                  <Text style={styles.saleDate}>{formatDateTime(sale.createdAt) || '—'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.saleLine} numberOfLines={1}>
                    {saleBadgeLabel(sale)}
                    {place ? ` · ${place}` : ''}
                  </Text>
                  {sale.voided ? <Text style={[styles.badge, styles.badgeDanger]}>Estornada</Text> : null}
                </View>
                {sale.payments.length > 1
                  ? sale.payments.map((part, index) => {
                      const partPercent = saleFeePercentLabel(part.fee, part.method);
                      return (
                        <View key={`${sale.id}-pay-${index}`} style={styles.rowBetween}>
                          <Text style={[styles.saleLine, styles.saleDetail]} numberOfLines={1}>
                            {paymentLabel(part.method)} · {formatBRL(part.amount)}
                            {part.authorization ? ` · Aut. ${part.authorization}` : ''}
                            {part.nsu ? ` · NSU ${part.nsu}` : ''}
                          </Text>
                          {partPercent ? <Text style={styles.salePercent}>{partPercent}</Text> : null}
                        </View>
                      );
                    })
                  : null}
                {detail || percentLabel ? (
                  <View style={styles.saleFoot}>
                    <Text style={[styles.saleLine, styles.saleDetail]} numberOfLines={2}>
                      {detail}
                    </Text>
                    {percentLabel ? <Text style={styles.salePercent}>{percentLabel}</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
          {filtered.length === 0 ? <Text style={styles.empty}>Nenhuma venda neste período.</Text> : null}
          {filtered.length > 8 ? (
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>
                Página {current + 1} de {pages}
              </Text>
              <View style={styles.row}>
                <Pressable onPress={() => setPage(current - 1)} disabled={current === 0} style={tap(styles.ghostBtn)}>
                  <Text style={styles.ghostText}>Anterior</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPage(current + 1)}
                  disabled={current >= pages - 1}
                  style={tap(styles.ghostBtn)}
                >
                  <Text style={styles.ghostText}>Próxima</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function Kpi({
  label,
  value,
  accent,
  flex,
  spread,
}: {
  label: string;
  value: string;
  accent?: boolean;
  flex?: boolean;
  spread?: boolean;
}) {
  return (
    <View style={[flex ? styles.salesKpi : styles.kpi, accent && styles.kpiFull, accent && styles.kpiAccent, spread && styles.kpiSpread]}>
      <Text style={[styles.kpiLabel, spread && styles.kpiLabelForward]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.kpiValue, flex && styles.kpiValueCompact, spread && styles.kpiValueForward, accent && !spread && styles.linkText]}
        numberOfLines={1}
        adjustsFontSizeToFit={!spread}
      >
        {value}
      </Text>
    </View>
  );
}

function CashierPane({ convenienceId, nonce }: { convenienceId: string; nonce: number }) {
  const [status, setStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [rows, setRows] = useState<PdvCashierSession[]>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setRows(await fetchCashierSessions(convenienceId, status));
    } catch {
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [convenienceId, status]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  const grouped = useMemo(() => {
    const map = new Map<string, PdvCashierSession[]>();
    for (const row of rows) {
      const list = map.get(row.deviceId) ?? [];
      list.push(row);
      map.set(row.deviceId, list);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <View style={styles.gap}>
      <View style={styles.cashierFilters}>
        {(['all', 'open', 'closed'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setStatus(value)}
            style={tap([styles.chip, status === value && styles.chipOn])}
          >
            <Text style={[styles.chipText, status === value && styles.chipTextOn]}>
              {value === 'all' ? 'Todos' : value === 'open' ? 'Aberto' : 'Fechado'}
            </Text>
          </Pressable>
        ))}
      </View>
      {busy ? (
        <View style={styles.miniBoot}>
          <Loader size={96} />
        </View>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>Nenhuma sessão de caixa encontrada.</Text>
      ) : (
        grouped.map(([deviceId, sessions]) => (
          <View key={deviceId} style={styles.gap}>
            <Text style={styles.group}>{sessions[0]?.deviceName}</Text>
            {sessions.map((session) => (
              <View key={session.id} style={styles.card}>
                <Text style={[styles.badge, session.status === 'open' ? styles.badgeOn : styles.badgeOff]}>
                  {session.status === 'open' ? 'aberto' : 'fechado'}
                </Text>
                <Text style={styles.meta}>Aberto {formatDateTime(session.openedAt) || '—'}</Text>
                <Text style={styles.meta}>Fechado {formatDateTime(session.closedAt) || '—'}</Text>
                <Text style={styles.meta}>
                  Troco {formatBRL(session.openingBalance)} →{' '}
                  {session.counted == null ? '—' : formatBRL(session.counted)}
                </Text>
                {session.expected != null ? (
                  <Text style={styles.meta}>Esperado: {formatBRL(session.expected)}</Text>
                ) : null}
                {session.cashSales ? (
                  <Text style={styles.meta}>
                    Vendas cash: {formatBRL(session.cashSales)}
                    {session.withdrawals > 0 ? ` · Sangria: ${formatBRL(session.withdrawals)}` : ''}
                    {session.expenses > 0 ? ` · Despesas: ${formatBRL(session.expenses)}` : ''}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  Diferença {session.difference == null ? '—' : formatBRL(session.difference)}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function ItemsPane({
  convenienceId,
  nonce,
  onToast,
}: {
  convenienceId: string;
  nonce: number;
  onToast: (message: string) => void;
}) {
  const [items, setItems] = useState<PdvProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<Partial<PdvProduct> | null>(null);
  const [pendingImage, setPendingImage] = useState<{ uri: string; type: string } | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [stockItem, setStockItem] = useState<PdvProduct | null>(null);
  const [stockQty, setStockQty] = useState('');
  const [stockIn, setStockIn] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<PdvProduct | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setItems(await fetchProducts(convenienceId));
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Falha ao carregar itens');
    } finally {
      setBusy(false);
    }
  }, [convenienceId, onToast]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  const savedCategories = [
    'Cozinha',
    ...[...new Set(
      items
        .map((item) => item.category?.trim())
        .filter((name): name is string => !!name && name.toLowerCase() !== 'cozinha')
    )].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  ];

  async function pickProductPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onToast('Permita o acesso às fotos para escolher a imagem.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        onToast('Imagem muito grande. Máx 5MB.');
        return;
      }
      const type = asset.mimeType || 'image/jpeg';
      setPendingImage({ uri: asset.uri, type });
      setEditing((current) => ({ ...current, imageUrl: asset.uri }));
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Não foi possível abrir as fotos.');
    }
  }

  function openEditor(item: Partial<PdvProduct>) {
    setPendingImage(null);
    setEditing(item);
  }

  function openNewItem() {
    openEditor({
      name: '',
      category: '',
      price: 0,
      cost: 0,
      active: true,
      trackStock: false,
      stock: 0,
      minStock: 0,
      imageUrl: null,
    });
  }

  function closeItemModal() {
    setEditing(null);
    setPendingImage(null);
  }

  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    if (!editing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeItemModal();
      return true;
    });
    return () => sub.remove();
  }, [editing]);

  useScreenOverlay(
    editing ? (
      <View
        style={styles.editorOverlay}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          setSheetHeight((current) => (current === next ? current : next));
        }}
      >
        <Pressable style={styles.modalBg} onPress={closeItemModal}>
          <Pressable style={[styles.modal, styles.itemSheet]} onPress={() => undefined}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={[styles.itemModalScroll, sheetHeight > 0 && { maxHeight: sheetHeight - 36 }]}
              contentContainerStyle={styles.itemForm}
            >
              <Text style={styles.modalTitle}>{editing?.id ? 'Editar item' : 'Novo item'}</Text>
              <View style={styles.photoCenter}>
                <View>
                  <Pressable
                    onPress={() => void pickProductPhoto()}
                    style={tap(styles.productPhotoBtn)}
                    accessibilityLabel="Enviar foto do produto"
                  >
                    {editing?.imageUrl ? (
                      <Image source={{ uri: editing.imageUrl }} style={styles.productPhoto} />
                    ) : (
                      <View style={styles.productPhotoEmpty}>
                        <Ionicons name="cloud-upload-outline" size={42} color={colors.muted} />
                      </View>
                    )}
                    {editing?.imageUrl ? (
                      <View style={styles.photoBadge} pointerEvents="none">
                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                      </View>
                    ) : null}
                  </Pressable>
                  {editing?.imageUrl ? (
                    <Pressable
                      onPress={() => {
                        setPendingImage(null);
                        setEditing((current) => ({ ...current, imageUrl: null }));
                      }}
                      style={tap(styles.photoRemove)}
                      hitSlop={8}
                      accessibilityLabel="Remover foto"
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <TextInput
                value={editing?.name ?? ''}
                onChangeText={(value) => setEditing((current) => ({ ...current, name: value }))}
                placeholder="Nome"
                placeholderTextColor="rgba(255,255,255,0.32)"
                style={[styles.input, styles.soloInput]}
              />
              <View style={styles.inlineField}>
                <Text style={styles.inlineLabel}>Categoria</Text>
                <TextInput
                  value={editing?.category ?? ''}
                  onChangeText={(value) => setEditing((current) => ({ ...current, category: value }))}
                  placeholder="Nova categoria"
                  placeholderTextColor="rgba(255,255,255,0.32)"
                  style={styles.input}
                />
              </View>
              {savedCategories.length > 0 ? (
                <View style={styles.chips}>
                  {savedCategories.map((category) => {
                    const selected = (editing?.category ?? '').trim().toLowerCase() === category.toLowerCase();
                    return (
                      <Pressable
                        key={category}
                        onPress={() => setEditing((current) => ({ ...current, category }))}
                        style={tap([styles.chip, selected && styles.chipOn])}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextOn]}>{category}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <View style={styles.inlineField}>
                <Text style={styles.inlineLabel}>SKU</Text>
                <TextInput
                  value={editing?.sku ?? ''}
                  onChangeText={(value) => setEditing((current) => ({ ...current, sku: value }))}
                  placeholder="SKU"
                  placeholderTextColor="rgba(255,255,255,0.32)"
                  style={styles.input}
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.inlineLabel}>Preço de venda</Text>
                <TextInput
                  value={editing && editing.price ? String(editing.price) : ''}
                  onChangeText={(value) => setEditing((current) => ({ ...current, price: Number(value.replace(',', '.')) || 0 }))}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="rgba(255,255,255,0.32)"
                  style={styles.input}
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.inlineLabel}>Custo</Text>
                <TextInput
                  value={editing && editing.cost ? String(editing.cost) : ''}
                  onChangeText={(value) => setEditing((current) => ({ ...current, cost: Number(value.replace(',', '.')) || 0 }))}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="rgba(255,255,255,0.32)"
                  style={styles.input}
                />
              </View>
              <Pressable
                onPress={() => setEditing((current) => ({ ...current, active: current?.active === false }))}
                style={tap(styles.switchRow)}
                accessibilityRole="switch"
                accessibilityState={{ checked: editing?.active !== false }}
              >
                <Text style={styles.switchLabel}>Ativo</Text>
                <View style={styles.switchLine} />
                <Switch value={editing?.active !== false} pointerEvents="none" trackColor={{ true: colors.blue }} />
              </Pressable>
              <Pressable
                onPress={() => setEditing((current) => ({ ...current, trackStock: !current?.trackStock }))}
                style={tap(styles.switchRow)}
                accessibilityRole="switch"
                accessibilityState={{ checked: !!editing?.trackStock }}
              >
                <Text style={styles.switchLabel}>Controlar estoque</Text>
                <View style={styles.switchLine} />
                <Switch value={!!editing?.trackStock} pointerEvents="none" trackColor={{ true: colors.blue }} />
              </Pressable>
              {editing?.trackStock ? (
                <View style={styles.inlineField}>
                  <Text style={styles.inlineLabel}>Estoque</Text>
                  <TextInput
                    value={String(editing.stock ?? 0)}
                    onChangeText={(value) => setEditing((current) => ({ ...current, stock: Number(value) || 0 }))}
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor="rgba(255,255,255,0.32)"
                    style={styles.input}
                  />
                  <Text style={styles.inlineLabel}>Mínimo</Text>
                  <TextInput
                    value={String(editing.minStock ?? 0)}
                    onChangeText={(value) => setEditing((current) => ({ ...current, minStock: Number(value) || 0 }))}
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor="rgba(255,255,255,0.32)"
                    style={styles.input}
                  />
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable onPress={closeItemModal} style={tap(styles.ghostBtn)}>
                  <Text style={styles.ghostText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!editing?.name?.trim() || savingItem) return;
                    setSavingItem(true);
                    try {
                      let imageUrl = editing.imageUrl ?? '';
                      if (pendingImage) {
                        imageUrl = await uploadProductImage(pendingImage.uri, pendingImage.type);
                      } else if (imageUrl.startsWith('file:')) {
                        imageUrl = '';
                      }
                      await saveProduct(convenienceId, {
                        id: editing.id,
                        name: editing.name,
                        category: editing.category ?? '',
                        sku: editing.sku ?? '',
                        description: editing.description ?? '',
                        price: editing.price ?? 0,
                        cost: editing.cost ?? 0,
                        active: editing.active !== false,
                        trackStock: !!editing.trackStock,
                        stock: editing.stock ?? 0,
                        minStock: editing.minStock ?? 0,
                        imageUrl,
                      });
                      onToast('Item salvo. Na maquininha, abra Produtos e toque em Atualizar.');
                      closeItemModal();
                      await load();
                    } catch (caught) {
                      onToast(caught instanceof Error ? caught.message : 'Falha ao salvar');
                    } finally {
                      setSavingItem(false);
                    }
                  }}
                  style={tap([styles.primaryBtn, savingItem && styles.off])}
                >
                  <Text style={styles.primaryText}>{savingItem ? 'Salvando...' : 'Salvar'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </View>
    ) : confirmDelete ? (
      <View pointerEvents="box-none" style={styles.confirmToastWrap}>
        <View style={styles.confirmToast}>
          <Text style={styles.confirmToastText}>Excluir {confirmDelete.name}?</Text>
          <View style={styles.confirmToastActions}>
            <Pressable onPress={() => setConfirmDelete(null)} style={tap(styles.ghostBtn)} disabled={deletingItem}>
              <Text style={styles.ghostText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                if (deletingItem) return;
                setDeletingItem(true);
                try {
                  await deleteProduct(confirmDelete.id);
                  setConfirmDelete(null);
                  onToast('Item excluído');
                  await load();
                } catch (caught) {
                  onToast(caught instanceof Error ? caught.message : 'Falha ao excluir');
                } finally {
                  setDeletingItem(false);
                }
              }}
              style={tap([styles.listDanger, deletingItem && styles.off])}
              disabled={deletingItem}
            >
              <Text style={styles.listDangerText}>{deletingItem ? 'Excluindo...' : 'Excluir'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    ) : null,
  );

  return (
    <View style={styles.gap}>
      <Pressable onPress={openNewItem} style={tap(styles.primaryBtn)}>
        <Ionicons name="add" size={16} color={colors.loginText} />
        <Text style={styles.primaryText}>Novo item</Text>
      </Pressable>
      {busy ? (
        <View style={styles.miniBoot}>
          <Loader size={96} />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Nenhum item cadastrado nesta conveniência.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.hit}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.productThumb} resizeMode="cover" />
            ) : (
              <View style={styles.productThumbEmpty}>
                <Ionicons name="image-outline" size={16} color={colors.muted} />
              </View>
            )}
            <View style={styles.hitInfo}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.category || '—'} · {formatBRL(item.price)}
                {item.trackStock ? ` · estoque: ${item.stock}` : ''}
                {item.sku ? ` · SKU ${item.sku}` : ''}
              </Text>
            </View>
            {item.trackStock && item.stock <= item.minStock ? (
              <Text style={[styles.badge, styles.badgeDanger]}>estoque baixo</Text>
            ) : null}
            {item.trackStock ? (
              <Pressable onPress={() => setStockItem(item)} style={tap(styles.itemIconBtn)}>
                <Text style={styles.linkText}>±</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => openEditor(item)}
              style={tap(styles.itemIconBtn)}
              hitSlop={4}
            >
              <Ionicons name="pencil" size={22} color={colors.blue} />
            </Pressable>
            <Pressable
              onPress={() => setConfirmDelete(item)}
              style={tap(styles.itemIconBtn)}
              hitSlop={4}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ))
      )}


      <Modal visible={!!stockItem} transparent animationType="fade" onRequestClose={() => setStockItem(null)}>
        <Pressable style={styles.modalBg} onPress={() => setStockItem(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Movimentar estoque</Text>
            <View style={styles.chips}>
              <Pressable onPress={() => setStockIn(true)} style={tap([styles.chip, stockIn && styles.chipOn])}>
                <Text style={[styles.chipText, stockIn && styles.chipTextOn]}>Entrada</Text>
              </Pressable>
              <Pressable onPress={() => setStockIn(false)} style={tap([styles.chip, !stockIn && styles.chipOn])}>
                <Text style={[styles.chipText, !stockIn && styles.chipTextOn]}>Saída</Text>
              </Pressable>
            </View>
            <TextInput
              value={stockQty}
              onChangeText={setStockQty}
              placeholder="Quantidade"
              keyboardType="number-pad"
              placeholderTextColor="rgba(255,255,255,0.32)"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setStockItem(null)} style={tap(styles.ghostBtn)}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const qty = Number(stockQty);
                  if (!stockItem || !Number.isFinite(qty) || qty <= 0) return;
                  try {
                    await moveStock(stockItem.id, qty, stockIn);
                    onToast('Estoque atualizado');
                    setStockItem(null);
                    setStockQty('');
                    await load();
                  } catch (caught) {
                    onToast(caught instanceof Error ? caught.message : 'Falha no estoque');
                  }
                }}
                style={tap(styles.primaryBtn)}
              >
                <Text style={styles.primaryText}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CashlessPane({
  convenienceId,
  nonce,
  onToast,
}: {
  convenienceId: string;
  nonce: number;
  onToast: (message: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(0);
  const [balance, setBalance] = useState(0);
  const [cards, setCards] = useState<PdvCard[]>([]);
  const [busy, setBusy] = useState(true);
  const [form, setForm] = useState<{ id?: string; uid: string; holder: string; cpf: string; phone: string } | null>(
    null
  );
  const [move, setMove] = useState<PdvCard | null>(null);
  const [moveType, setMoveType] = useState<'topup' | 'consumption' | 'refund' | 'adjust'>('topup');
  const [moveAmount, setMoveAmount] = useState('');
  const [history, setHistory] = useState<PdvCard | null>(null);
  const [txs, setTxs] = useState<{ id: string; type: string; amount: number; createdAt: string | null }[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await fetchCashless(convenienceId, applied);
      setCards(data.cards);
      setCount(data.count);
      setActive(data.active);
      setBalance(data.balance);
    } catch (caught) {
      onToast(caught instanceof Error ? caught.message : 'Falha ao carregar cashless');
    } finally {
      setBusy(false);
    }
  }, [convenienceId, applied, onToast]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  return (
    <View style={styles.gap}>
      <View style={styles.kpis}>
        <Kpi label="Cartões cadastrados" value={String(count)} />
        <Kpi label="Cartões ativos" value={String(active)} />
        <Kpi label="Saldo em circulação" value={formatBRL(balance)} accent />
      </View>
      <View style={styles.amountRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar UID, nome, CPF..."
          placeholderTextColor="rgba(255,255,255,0.32)"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={() => setApplied(search.trim())}
        />
        <Pressable onPress={() => setApplied(search.trim())} style={tap(styles.ghostBtn)}>
          <Text style={styles.ghostText}>Buscar</Text>
        </Pressable>
        <Pressable onPress={() => setForm({ uid: '', holder: '', cpf: '', phone: '' })} style={tap(styles.primaryBtn)}>
          <Text style={styles.primaryText}>Novo</Text>
        </Pressable>
      </View>
      {busy ? (
        <View style={styles.miniBoot}>
          <Loader size={96} />
        </View>
      ) : cards.length === 0 ? (
        <Text style={styles.empty}>Nenhum cartão cashless cadastrado ainda.</Text>
      ) : (
        cards.map((card) => (
          <View key={card.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.tokenMini}>{card.uid}</Text>
              <Text
                style={[
                  styles.badge,
                  card.retired ? styles.badgeOff : card.status === 'active' ? styles.badgeOn : styles.badgeOff,
                ]}
              >
                {card.retired ? 'Encerrado' : card.status === 'active' ? 'Ativo' : 'Bloqueado'}
              </Text>
            </View>
            <Text style={styles.name}>{card.holder}</Text>
            <Text style={styles.meta}>Saldo {formatBRL(card.balance)}</Text>
            {!card.retired ? (
              <View style={styles.row}>
                <Pressable
                  onPress={() =>
                    setForm({
                      id: card.id,
                      uid: card.uid,
                      holder: card.holder === 'Sem nome' ? '' : card.holder,
                      cpf: card.cpf ?? '',
                      phone: card.phone ?? '',
                    })
                  }
                  style={tap(styles.ghostBtn)}
                >
                  <Text style={styles.ghostText}>Editar</Text>
                </Pressable>
                <Pressable onPress={() => setMove(card)} style={tap(styles.ghostBtn)}>
                  <Text style={styles.ghostText}>Saldo</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    setHistory(card);
                    try {
                      setTxs(await fetchCashlessTx(card.id));
                    } catch {
                      setTxs([]);
                    }
                  }}
                  style={tap(styles.ghostBtn)}
                >
                  <Text style={styles.ghostText}>Histórico</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      await setCashlessStatus(card.id, card.status === 'active' ? 'blocked' : 'active');
                      await load();
                    } catch (caught) {
                      onToast(caught instanceof Error ? caught.message : 'Falha ao atualizar');
                    }
                  }}
                  style={tap(styles.ghostBtn)}
                >
                  <Text style={styles.ghostText}>{card.status === 'active' ? 'Bloquear' : 'Desbloquear'}</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      await deleteCashlessCard(card.id);
                      onToast('Cartão excluído');
                      await load();
                    } catch (caught) {
                      onToast(caught instanceof Error ? caught.message : 'Falha ao excluir');
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}

      <Modal visible={!!form} transparent animationType="fade" onRequestClose={() => setForm(null)}>
        <Pressable style={styles.modalBg} onPress={() => setForm(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Cartão cashless</Text>
            <TextInput
              value={form?.uid ?? ''}
              onChangeText={(value) => setForm((current) => current && { ...current, uid: value })}
              placeholder="UID do cartão"
              placeholderTextColor="rgba(255,255,255,0.32)"
              style={styles.input}
            />
            <TextInput
              value={form?.holder ?? ''}
              onChangeText={(value) => setForm((current) => current && { ...current, holder: value })}
              placeholder="Nome do portador"
              placeholderTextColor="rgba(255,255,255,0.32)"
              style={styles.input}
            />
            <TextInput
              value={form?.cpf ?? ''}
              onChangeText={(value) => setForm((current) => current && { ...current, cpf: value })}
              placeholder="CPF"
              placeholderTextColor="rgba(255,255,255,0.32)"
              style={styles.input}
            />
            <TextInput
              value={form?.phone ?? ''}
              onChangeText={(value) => setForm((current) => current && { ...current, phone: value })}
              placeholder="Celular"
              placeholderTextColor="rgba(255,255,255,0.32)"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setForm(null)} style={tap(styles.ghostBtn)}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!form?.uid.trim()) return;
                  try {
                    await saveCashlessCard({
                      id: form.id,
                      convenienceId,
                      uid: form.uid,
                      holder: form.holder,
                      cpf: form.cpf,
                      phone: form.phone,
                    });
                    onToast('Cartão salvo');
                    setForm(null);
                    await load();
                  } catch (caught) {
                    const message = caught instanceof Error ? caught.message : '';
                    onToast(
                      message.includes('uid_ja_cadastrado')
                        ? 'Este UID já está cadastrado nesta conveniência'
                        : message.includes('cpf_invalido')
                          ? 'CPF inválido'
                          : message.includes('celular_invalido')
                            ? 'Celular inválido'
                            : 'Não foi possível salvar'
                    );
                  }
                }}
                style={tap(styles.primaryBtn)}
              >
                <Text style={styles.primaryText}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!move} transparent animationType="fade" onRequestClose={() => setMove(null)}>
        <Pressable style={styles.modalBg} onPress={() => setMove(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Movimentar saldo {move ? `· ${move.uid}` : ''}</Text>
            <View style={styles.chips}>
              {(
                [
                  ['topup', 'Recarga'],
                  ['consumption', 'Consumo'],
                  ['refund', 'Estorno'],
                  ['adjust', 'Ajuste'],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setMoveType(value)}
                  style={tap([styles.chip, moveType === value && styles.chipOn])}
                >
                  <Text style={[styles.chipText, moveType === value && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={moveAmount}
              onChangeText={setMoveAmount}
              placeholder="Valor (R$)"
              keyboardType="decimal-pad"
              placeholderTextColor="rgba(255,255,255,0.32)"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setMove(null)} style={tap(styles.ghostBtn)}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const amount = Number(moveAmount.replace(',', '.'));
                  if (!move || !Number.isFinite(amount) || amount <= 0) return;
                  try {
                    await moveCashless({ cardId: move.id, type: moveType, amount });
                    onToast('Saldo atualizado');
                    setMove(null);
                    setMoveAmount('');
                    await load();
                  } catch (caught) {
                    const message = caught instanceof Error ? caught.message : '';
                    onToast(message.includes('saldo_insuficiente') ? 'Saldo insuficiente' : 'Não foi possível atualizar');
                  }
                }}
                style={tap(styles.primaryBtn)}
              >
                <Text style={styles.primaryText}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!history} transparent animationType="fade" onRequestClose={() => setHistory(null)}>
        <Pressable style={styles.modalBg} onPress={() => setHistory(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Histórico {history ? `· ${history.uid}` : ''}</Text>
            {txs.length === 0 ? <Text style={styles.empty}>Nenhuma movimentação registrada.</Text> : null}
            {txs.map((tx) => (
              <View key={tx.id} style={styles.line}>
                <Text style={styles.meta}>
                  {CASHLESS_TX_LABELS[tx.type] ?? tx.type} · {formatDateTime(tx.createdAt)}
                </Text>
                <Text style={styles.meta}>{formatBRL(tx.amount)}</Text>
              </View>
            ))}
            <Pressable onPress={() => setHistory(null)} style={tap([styles.ghostBtn, { marginTop: 12 }])}>
              <Text style={styles.ghostText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flexGrow: 1,
    minHeight: Dimensions.get('window').height - 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBoot: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  block: { marginTop: 18, gap: 10 },
  gap: { gap: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  group: { color: colors.text, fontSize: 13, fontWeight: '700' },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, fontSize: 13 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  listCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  listCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  listPrimary: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPrimaryText: { color: colors.loginText, fontWeight: '700', fontSize: 13 },
  listDanger: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,92,122,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listDangerText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  listGhost: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listGhostText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  saleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 1,
  },
  saleDate: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  saleLine: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  saleDetail: { flex: 1 },
  saleFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
  salePercent: { color: colors.muted, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  switchLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  fieldLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  itemForm: { gap: 8 },
  inlineField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', flexShrink: 0 },
  soloInput: { flex: 0, alignSelf: 'stretch' },
  photoCenter: { alignItems: 'center' },
  productPhotoBtn: {
    width: 112,
    height: 112,
    borderRadius: 16,
    overflow: 'hidden',
  },
  productPhoto: {
    width: 112,
    height: 112,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  productPhotoEmpty: {
    width: 112,
    height: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  itemIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbEmpty: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.blue,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  primaryText: { color: colors.loginText, fontWeight: '700', fontSize: 13 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  ghostText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  linkBtn: { paddingVertical: 4 },
  linkText: { color: colors.blue, fontWeight: '700', fontSize: 13 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tokenBox: {
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,123,255,0.08)',
    flexShrink: 0,
  },
  token: { color: colors.blue, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  tokenMini: { color: colors.blue, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  subTabs: {
    flexGrow: 0,
    marginHorizontal: -16,
  },
  subTabsInner: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  subTab: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subTabOn: { backgroundColor: colors.blue },
  subTabText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  subTabTextOn: { color: colors.loginText },
  hit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 10,
  },
  hitInfo: { flex: 1, minWidth: 0 },
  deviceName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    color: colors.muted,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeOn: { color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.15)' },
  badgeOff: { color: colors.muted, backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeDanger: { color: colors.danger, backgroundColor: 'rgba(255,92,122,0.15)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cashierFilters: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  salesFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  periodRow: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 6 },
  periodChip: { flexShrink: 1 },
  chip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.blue },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  chipTextOn: { color: colors.loginText },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  dateText: { color: colors.text, fontSize: 13, flex: 1, fontWeight: '600' },
  dateOk: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  salesKpiRow: { flexDirection: 'row', width: '100%', gap: 8 },
  salesKpi: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  kpi: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 10,
  },
  kpiFull: { width: '100%' },
  kpiAccent: { borderColor: 'rgba(0,123,255,0.35)', backgroundColor: 'rgba(0,123,255,0.12)' },
  kpiLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  kpiLabelForward: { fontSize: 22, fontWeight: '700' },
  kpiSpread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiValue: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  kpiValueCompact: { fontSize: 13 },
  kpiValueForward: { marginTop: 0, fontSize: 22, fontWeight: '700', color: colors.blue },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  off: { opacity: 0.45 },
  tap: { backgroundColor: 'rgba(255,255,255,0.28)' },
  editorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    elevation: 40,
  },
  itemSheet: { width: '100%', maxHeight: '100%' },
  itemModalScroll: { flexGrow: 0 },
  confirmToastWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  confirmToast: {
    backgroundColor: '#0b1730',
    borderWidth: 1,
    borderColor: 'rgba(0,123,255,0.45)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  confirmToastText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmToastActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    backgroundColor: '#050d1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    maxHeight: '88%',
  },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  modalText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
