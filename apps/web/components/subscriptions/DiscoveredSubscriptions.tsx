'use client';

import { useState } from 'react';
import { Sparkles, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Card } from '../ui/Card';
import type { DetectedSubscription } from '@mybudget/shared';
import styles from './DiscoveredSubscriptions.module.css';

interface Props {
  suggestions: DetectedSubscription[];
  onAccept: (suggestion: DetectedSubscription) => Promise<void>;
  onDismiss: (normalizedPayee: string) => Promise<void>;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  annual: 'Annual',
  unknown: 'Unknown',
};

function confidenceColor(confidence: number): 'success' | 'warning' | 'info' {
  if (confidence >= 0.7) return 'success';
  if (confidence >= 0.4) return 'warning';
  return 'info';
}

export function DiscoveredSubscriptions({ suggestions, onAccept, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = suggestions.filter(
    (s) => !s.isAlreadyTracked && !dismissed.has(s.normalizedPayee),
  );

  if (visible.length === 0) return null;

  async function handleAccept(s: DetectedSubscription) {
    setProcessing((prev) => new Set(prev).add(s.normalizedPayee));
    try {
      await onAccept(s);
      setDismissed((prev) => new Set(prev).add(s.normalizedPayee));
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(s.normalizedPayee);
        return next;
      });
    }
  }

  async function handleDismiss(s: DetectedSubscription) {
    setProcessing((prev) => new Set(prev).add(s.normalizedPayee));
    try {
      await onDismiss(s.normalizedPayee);
      setDismissed((prev) => new Set(prev).add(s.normalizedPayee));
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(s.normalizedPayee);
        return next;
      });
    }
  }

  return (
    <Card className={styles.container}>
      <button className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.headerLeft}>
          <Sparkles size={18} className={styles.sparkle} />
          <span className={styles.title}>Discovered Subscriptions</span>
          <Badge variant="info">{visible.length} found</Badge>
        </div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <div className={styles.list}>
          <p className={styles.subtitle}>
            We detected these recurring charges in your bank transactions.
            Accept to track them, or dismiss to hide.
          </p>
          {visible.map((s) => {
            const isProcessing = processing.has(s.normalizedPayee);
            return (
              <div key={s.normalizedPayee} className={styles.row}>
                <div className={styles.info}>
                  <div className={styles.payeeRow}>
                    <span className={styles.payee}>{s.payee}</span>
                    {s.matchedCatalogId && (
                      <Badge variant="success">Catalog match</Badge>
                    )}
                  </div>
                  <div className={styles.meta}>
                    <span>{FREQUENCY_LABELS[s.frequency]}</span>
                    <span className={styles.dot} />
                    <CurrencyDisplay amount={s.amount} />
                    <span className={styles.dot} />
                    <span>{s.transactionDates.length} charges</span>
                    <span className={styles.dot} />
                    <Badge variant={confidenceColor(s.confidence)}>
                      {Math.round(s.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleAccept(s)}
                  >
                    <Check size={14} /> Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleDismiss(s)}
                  >
                    <X size={14} /> Dismiss
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
