'use client';

import { useState } from 'react';
import { ArrowLeft, ExternalLink, Pause, XCircle, Play, Trash2, Edit3, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Subscription } from '@mybudget/shared';
import styles from './SubscriptionDetail.module.css';

interface Props {
  subscription: Subscription;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  custom: 'Custom',
};

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  active: 'success',
  trial: 'info',
  paused: 'warning',
  cancelled: 'danger',
};

const BILLING_CYCLE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

function daysUntilRenewal(nextRenewal: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(nextRenewal + 'T00:00:00');
  const diff = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff} days`;
}

export function SubscriptionDetail({ subscription, onUpdate, onDelete, onBack }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(subscription.name);
  const [editPrice, setEditPrice] = useState((subscription.price / 100).toFixed(2));
  const [editCycle, setEditCycle] = useState<string>(subscription.billing_cycle);
  const [editNotes, setEditNotes] = useState(subscription.notes ?? '');
  const [editUrl, setEditUrl] = useState(subscription.url ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    const priceCents = Math.round(parseFloat(editPrice || '0') * 100);
    onUpdate(subscription.id, {
      name: editName.trim(),
      price: priceCents,
      billing_cycle: editCycle,
      notes: editNotes.trim() || null,
      url: editUrl.trim() || null,
    });
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditName(subscription.name);
    setEditPrice((subscription.price / 100).toFixed(2));
    setEditCycle(subscription.billing_cycle);
    setEditNotes(subscription.notes ?? '');
    setEditUrl(subscription.url ?? '');
    setEditing(false);
  }

  function handleStatusAction(newStatus: string) {
    onUpdate(subscription.id, { status: newStatus });
  }

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={18} />
        <span>Back to Subscriptions</span>
      </button>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.largeIcon}>{subscription.icon ?? '💳'}</span>
          <div>
            {editing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={styles.editNameInput}
              />
            ) : (
              <h1 className={styles.name}>{subscription.name}</h1>
            )}
            <Badge variant={STATUS_VARIANT[subscription.status] ?? 'default'}>
              {subscription.status}
            </Badge>
          </div>
        </div>

        <div className={styles.headerActions}>
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X size={16} /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check size={16} /> Save
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Edit3 size={16} /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldCard}>
          <span className={styles.fieldLabel}>Price</span>
          {editing ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
            />
          ) : (
            <span className={styles.fieldValue}>
              <CurrencyDisplay amount={subscription.price} />
            </span>
          )}
        </div>

        <div className={styles.fieldCard}>
          <span className={styles.fieldLabel}>Billing Cycle</span>
          {editing ? (
            <Select
              options={BILLING_CYCLE_OPTIONS}
              value={editCycle}
              onChange={(e) => setEditCycle(e.target.value)}
            />
          ) : (
            <span className={styles.fieldValue}>
              {CYCLE_LABELS[subscription.billing_cycle] ?? subscription.billing_cycle}
            </span>
          )}
        </div>

        <div className={styles.fieldCard}>
          <span className={styles.fieldLabel}>Next Renewal</span>
          <span className={styles.fieldValue}>{subscription.next_renewal}</span>
          <span className={styles.fieldSub}>{daysUntilRenewal(subscription.next_renewal)}</span>
        </div>

        <div className={styles.fieldCard}>
          <span className={styles.fieldLabel}>Start Date</span>
          <span className={styles.fieldValue}>{subscription.start_date}</span>
        </div>
      </div>

      {(subscription.url || editing) && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Website</span>
          {editing ? (
            <Input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://..."
            />
          ) : subscription.url ? (
            <a
              href={subscription.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {subscription.url}
              <ExternalLink size={14} />
            </a>
          ) : null}
        </div>
      )}

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Notes</span>
        {editing ? (
          <textarea
            className={styles.textarea}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Add notes..."
            rows={3}
          />
        ) : (
          <p className={styles.notesText}>
            {subscription.notes || 'No notes'}
          </p>
        )}
      </div>

      <div className={styles.statusActions}>
        <span className={styles.sectionLabel}>Actions</span>
        <div className={styles.actionRow}>
          {subscription.status === 'active' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleStatusAction('paused')}>
                <Pause size={16} /> Pause
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleStatusAction('cancelled')}>
                <XCircle size={16} /> Cancel
              </Button>
            </>
          )}
          {subscription.status === 'paused' && (
            <Button variant="secondary" size="sm" onClick={() => handleStatusAction('active')}>
              <Play size={16} /> Resume
            </Button>
          )}
          {subscription.status === 'cancelled' && (
            <Button variant="secondary" size="sm" onClick={() => handleStatusAction('active')}>
              <Play size={16} /> Reactivate
            </Button>
          )}
          {subscription.status === 'trial' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleStatusAction('active')}>
                <Play size={16} /> Activate
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleStatusAction('cancelled')}>
                <XCircle size={16} /> Cancel
              </Button>
            </>
          )}

          {confirmDelete ? (
            <div className={styles.confirmDelete}>
              <span className={styles.confirmText}>Delete permanently?</span>
              <Button variant="danger" size="sm" onClick={() => onDelete(subscription.id)}>
                Yes, Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
