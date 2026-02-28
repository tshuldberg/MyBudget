'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import {
  User, Link2, Bell, Tag, Repeat, Download,
  Trash2, Info, Plus, Pencil, Eye, EyeOff,
  ArrowRight, Building2,
} from 'lucide-react';
import {
  fetchCategoryGroups,
  fetchCategoriesByGroup,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../actions/categories';
import { fetchAccounts } from '../actions/accounts';
import type { CategoryGroup, Category, Account } from '@mybudget/shared';
import styles from './page.module.css';

type Section = 'profile' | 'linked' | 'notifications' | 'categories' | 'rules' | 'data';

const NAV_ITEMS: Array<{ id: Section; label: string; icon: React.ReactNode }> = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'linked', label: 'Linked Accounts', icon: <Link2 size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'categories', label: 'Categories', icon: <Tag size={16} /> },
  { id: 'rules', label: 'Transaction Rules', icon: <Repeat size={16} /> },
  { id: 'data', label: 'Data', icon: <Download size={16} /> },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('profile');

  return (
    <div className="fade-in">
      <PageHeader title="Settings" subtitle="Manage your preferences and account" />

      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${section === item.id ? styles.navItemActive : ''}`}
              onClick={() => setSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          {section === 'profile' && <ProfileSection />}
          {section === 'linked' && <LinkedAccountsSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'categories' && <CategoriesSection />}
          {section === 'rules' && <TransactionRulesSection />}
          {section === 'data' && <DataSection />}
        </div>
      </div>
    </div>
  );
}

/* ─── Profile ──────────────────────────────── */

function ProfileSection() {
  const [currency, setCurrency] = useState('USD');
  const [firstDay, setFirstDay] = useState('0');

  return (
    <>
      <h2 className={styles.sectionTitle}>Profile</h2>
      <p className={styles.sectionSubtitle}>Display preferences and personal settings</p>

      <Card>
        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'CAD', label: 'CAD (C$)' },
                { value: 'AUD', label: 'AUD (A$)' },
              ]}
            />
            <Select
              label="First Day of Week"
              value={firstDay}
              onChange={(e) => setFirstDay(e.target.value)}
              options={[
                { value: '0', label: 'Sunday' },
                { value: '1', label: 'Monday' },
                { value: '6', label: 'Saturday' },
              ]}
            />
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <Card>
          <div className={styles.about}>
            <div><strong>MyBudget</strong> v0.1.0</div>
            <div className={styles.aboutText}>
              Privacy-first envelope budgeting. All data stays on your device. Zero analytics, zero telemetry.
            </div>
            <div className={styles.aboutText}>FSL-1.1-Apache-2.0 License</div>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ─── Linked Accounts ──────────────────────── */

function LinkedAccountsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetchAccounts().then(setAccounts);
  }, []);

  const bankAccounts = accounts.filter((a) => a.type === 'checking' || a.type === 'savings');
  const cardAccounts = accounts.filter((a) => a.type === 'credit_card');

  return (
    <>
      <h2 className={styles.sectionTitle}>Linked Accounts</h2>
      <p className={styles.sectionSubtitle}>Manage connected bank accounts and credit cards</p>

      {accounts.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏦</div>
            <div className={styles.emptyText}>No accounts linked yet. Add your bank accounts to get started.</div>
            <Button variant="primary" size="sm">
              <Plus size={14} /> Link Account
            </Button>
          </div>
        </Card>
      ) : (
        <div className={styles.linkedSection}>
          {bankAccounts.length > 0 && (
            <Card>
              <div className={styles.groupHeader}>
                <span className={styles.groupName}>Bank Accounts</span>
              </div>
              {bankAccounts.map((a) => (
                <div key={a.id} className={styles.linkedAccount}>
                  <div className={styles.linkedIcon}>
                    <Building2 size={18} />
                  </div>
                  <div className={styles.linkedInfo}>
                    <div className={styles.linkedName}>{a.name}</div>
                    <div className={styles.linkedStatus}>{a.type === 'checking' ? 'Checking' : 'Savings'}</div>
                  </div>
                  <span className={styles.syncBadge}>Connected</span>
                </div>
              ))}
            </Card>
          )}
          {cardAccounts.length > 0 && (
            <Card>
              <div className={styles.groupHeader}>
                <span className={styles.groupName}>Credit Cards</span>
              </div>
              {cardAccounts.map((a) => (
                <div key={a.id} className={styles.linkedAccount}>
                  <div className={styles.linkedIcon}>💳</div>
                  <div className={styles.linkedInfo}>
                    <div className={styles.linkedName}>{a.name}</div>
                    <div className={styles.linkedStatus}>Credit Card</div>
                  </div>
                  <span className={styles.syncBadge}>Connected</span>
                </div>
              ))}
            </Card>
          )}
          <Button variant="secondary" size="sm">
            <Plus size={14} /> Link Another Account
          </Button>
        </div>
      )}
    </>
  );
}

/* ─── Notifications ────────────────────────── */

function NotificationsSection() {
  const [billReminders, setBillReminders] = useState(true);
  const [overBudget, setOverBudget] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <>
      <h2 className={styles.sectionTitle}>Notifications</h2>
      <p className={styles.sectionSubtitle}>Control what alerts you receive</p>

      <Card>
        <div className={styles.fields}>
          <ToggleRow
            label="Bill Reminders"
            desc="Get notified before upcoming bills and subscriptions are due"
            checked={billReminders}
            onChange={setBillReminders}
          />
          <ToggleRow
            label="Over-Budget Alerts"
            desc="Alert when a category exceeds its budget allocation"
            checked={overBudget}
            onChange={setOverBudget}
          />
          <ToggleRow
            label="Weekly Spending Digest"
            desc="Summary of your spending every Monday morning"
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
        </div>
      </Card>
    </>
  );
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.actionRow}>
      <div>
        <div className={styles.actionLabel}>{label}</div>
        <div className={styles.actionDesc}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? 'var(--color-teal)' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: 'white', transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
}

/* ─── Categories ───────────────────────────── */

function CategoriesSection() {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [catsByGroup, setCatsByGroup] = useState<Map<string, Category[]>>(new Map());
  const [showHidden, setShowHidden] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  const loadData = useCallback(async () => {
    const g = await fetchCategoryGroups(true);
    setGroups(g);
    const map = new Map<string, Category[]>();
    for (const group of g) {
      const cats = await fetchCategoriesByGroup(group.id);
      map.set(group.id, cats);
    }
    setCatsByGroup(map);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddGroup() {
    if (!newGroupName.trim()) return;
    await createCategoryGroup({ name: newGroupName.trim() });
    setNewGroupName('');
    setShowNewGroup(false);
    loadData();
  }

  async function handleDeleteGroup(id: string) {
    await deleteCategoryGroup(id);
    loadData();
  }

  async function handleToggleHidden(cat: Category) {
    await updateCategory(cat.id, { is_hidden: !cat.is_hidden });
    loadData();
  }

  async function handleDeleteCat(id: string) {
    await deleteCategory(id);
    loadData();
  }

  return (
    <>
      <h2 className={styles.sectionTitle}>Categories</h2>
      <p className={styles.sectionSubtitle}>Organize your spending into groups and categories</p>

      {groups.map((group) => {
        const cats = catsByGroup.get(group.id) ?? [];
        const visibleCats = showHidden ? cats : cats.filter((c) => !c.is_hidden);

        return (
          <div key={group.id} className={styles.categoryGroup}>
            <Card>
              <div className={styles.groupHeader}>
                <span className={styles.groupName}>{group.name}</span>
                <button
                  className={styles.addBtn}
                  onClick={() => setAddingToGroup(group.id)}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className={styles.catList}>
                {visibleCats.map((cat) => (
                  <div
                    key={cat.id}
                    className={`${styles.catItem} ${cat.is_hidden ? styles.hiddenCat : ''}`}
                  >
                    <span className={styles.catEmoji}>{cat.emoji ?? '📁'}</span>
                    <span className={styles.catName}>{cat.name}</span>
                    <div className={styles.catActions}>
                      <button
                        className={styles.catActionBtn}
                        onClick={() => setEditingCat(cat)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className={styles.catActionBtn}
                        onClick={() => handleToggleHidden(cat)}
                        title={cat.is_hidden ? 'Show' : 'Hide'}
                      >
                        {cat.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button
                        className={`${styles.catActionBtn} ${styles.catActionBtnDanger}`}
                        onClick={() => handleDeleteCat(cat.id)}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {visibleCats.length === 0 && (
                  <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                    No categories in this group
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
        {showNewGroup ? (
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'end' }}>
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
            />
            <Button variant="primary" size="sm" onClick={handleAddGroup}>Add</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowNewGroup(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowNewGroup(true)}>
            <Plus size={14} /> New Group
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowHidden(!showHidden)}
        >
          {showHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          {showHidden ? 'Hide Hidden' : 'Show Hidden'}
        </Button>
      </div>

      {/* Edit Category Dialog */}
      {editingCat && (
        <EditCategoryDialog
          category={editingCat}
          groups={groups}
          onClose={() => setEditingCat(null)}
          onSave={async (updates) => {
            await updateCategory(editingCat.id, updates);
            setEditingCat(null);
            loadData();
          }}
        />
      )}

      {/* Add Category Dialog */}
      {addingToGroup && (
        <AddCategoryDialog
          groupId={addingToGroup}
          onClose={() => setAddingToGroup(null)}
          onSave={async (input) => {
            await createCategory(input);
            setAddingToGroup(null);
            loadData();
          }}
        />
      )}
    </>
  );
}

function EditCategoryDialog({ category, groups, onClose, onSave }: {
  category: Category;
  groups: CategoryGroup[];
  onClose: () => void;
  onSave: (updates: Partial<Pick<Category, 'name' | 'emoji' | 'group_id'>>) => void;
}) {
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji ?? '');
  const [groupId, setGroupId] = useState(category.group_id);

  return (
    <Dialog open onClose={onClose} title="Edit Category" width={400}>
      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <Input label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ maxWidth: 80 }} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Select
          label="Group"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          options={groups.map((g) => ({ value: g.id, label: g.name }))}
        />
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onSave({ name, emoji: emoji || null, group_id: groupId })}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AddCategoryDialog({ groupId, onClose, onSave }: {
  groupId: string;
  onClose: () => void;
  onSave: (input: { name: string; emoji: string | null; group_id: string }) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');

  return (
    <Dialog open onClose={onClose} title="Add Category" width={400}>
      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <Input label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ maxWidth: 80 }} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onSave({ name, emoji: emoji || null, group_id: groupId })}>
            Add
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ─── Transaction Rules ────────────────────── */

interface TransactionRule {
  id: string;
  payeeContains: string;
  categoryName: string;
  categoryId: string;
}

function TransactionRulesSection() {
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [newPayee, setNewPayee] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; emoji: string | null }>>([]);

  useEffect(() => {
    // Load categories for the dropdown
    fetchCategoryGroups(false).then(async (groups) => {
      const allCats: Array<{ id: string; name: string; emoji: string | null }> = [];
      for (const g of groups) {
        const cats = await fetchCategoriesByGroup(g.id);
        for (const c of cats) {
          allCats.push({ id: c.id, name: c.name, emoji: c.emoji });
        }
      }
      setCategories(allCats);
    });

    // Load saved rules from localStorage
    const saved = localStorage.getItem('mybudget_txn_rules');
    if (saved) {
      try { setRules(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  function saveRules(updated: TransactionRule[]) {
    setRules(updated);
    localStorage.setItem('mybudget_txn_rules', JSON.stringify(updated));
  }

  function handleAddRule() {
    if (!newPayee.trim() || !newCatId) return;
    const cat = categories.find((c) => c.id === newCatId);
    if (!cat) return;
    const rule: TransactionRule = {
      id: crypto.randomUUID(),
      payeeContains: newPayee.trim(),
      categoryName: `${cat.emoji ?? ''} ${cat.name}`.trim(),
      categoryId: newCatId,
    };
    saveRules([...rules, rule]);
    setNewPayee('');
    setNewCatId('');
  }

  function handleDeleteRule(id: string) {
    saveRules(rules.filter((r) => r.id !== id));
  }

  return (
    <>
      <h2 className={styles.sectionTitle}>Transaction Rules</h2>
      <p className={styles.sectionSubtitle}>Auto-assign categories to transactions by payee name</p>

      <Card>
        <div className={styles.ruleList}>
          {rules.map((rule) => (
            <div key={rule.id} className={styles.ruleRow}>
              <div>
                <div className={styles.ruleLabel}>When payee contains</div>
                <div className={styles.ruleValue}>&ldquo;{rule.payeeContains}&rdquo;</div>
              </div>
              <div className={styles.ruleArrow}>
                <ArrowRight size={16} />
              </div>
              <div>
                <div className={styles.ruleLabel}>Assign category</div>
                <div className={styles.ruleValue}>{rule.categoryName}</div>
              </div>
              <button className={styles.ruleDeleteBtn} onClick={() => handleDeleteRule(rule.id)} title="Remove rule">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {rules.length === 0 && (
            <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
              No rules yet. Add a rule to auto-categorize transactions.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className={styles.addRuleForm}>
          <Input
            label="Payee contains"
            placeholder="e.g. Starbucks"
            value={newPayee}
            onChange={(e) => setNewPayee(e.target.value)}
          />
          <Select
            label="Assign category"
            value={newCatId}
            onChange={(e) => setNewCatId(e.target.value)}
            options={[
              { value: '', label: 'Select...' },
              ...categories.map((c) => ({
                value: c.id,
                label: `${c.emoji ?? ''} ${c.name}`.trim(),
              })),
            ]}
          />
          <Button variant="primary" size="sm" onClick={handleAddRule} style={{ alignSelf: 'end' }}>
            <Plus size={14} /> Add Rule
          </Button>
        </div>
      </Card>
    </>
  );
}

/* ─── Data ─────────────────────────────────── */

function DataSection() {
  return (
    <>
      <h2 className={styles.sectionTitle}>Data</h2>
      <p className={styles.sectionSubtitle}>Import, export, and manage your budget data</p>

      <Card>
        <div className={styles.fields}>
          <div className={styles.actionRow}>
            <div>
              <div className={styles.actionLabel}>Export Data</div>
              <div className={styles.actionDesc}>Download all your data as JSON</div>
            </div>
            <Button variant="secondary" size="sm">Export</Button>
          </div>
          <div className={styles.actionRow}>
            <div>
              <div className={styles.actionLabel}>Import CSV</div>
              <div className={styles.actionDesc}>Import transactions from a bank CSV file</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (window.location.href = '/transactions/import')}
            >
              Import
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className={styles.dangerCard}>
          <div className={styles.dangerTitle}>Danger Zone</div>
          <div className={styles.actionRow}>
            <div>
              <div className={styles.actionLabel}>Reset All Data</div>
              <div className={styles.actionDesc}>Permanently delete all budget data. This cannot be undone.</div>
            </div>
            <Button variant="danger" size="sm">Reset</Button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--spacing-xl)' }}>
        <Card>
          <div className={styles.about}>
            <div><strong>MyBudget</strong> v0.1.0</div>
            <div className={styles.aboutText}>
              Privacy-first envelope budgeting. All data stays on your device. Zero analytics, zero telemetry.
            </div>
            <div className={styles.aboutText}>FSL-1.1-Apache-2.0 License</div>
          </div>
        </Card>
      </div>
    </>
  );
}
