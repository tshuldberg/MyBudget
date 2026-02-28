'use client';

import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Settings, Download, Trash2, Info } from 'lucide-react';
import styles from './page.module.css';

export default function SettingsPage() {
  const [currency, setCurrency] = useState('USD');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState('0');

  return (
    <div className="fade-in">
      <PageHeader title="Settings" subtitle="Configure your preferences" />

      <div className={styles.sections}>
        <Card>
          <h3 className={styles.sectionTitle}>
            <Settings size={18} /> Display
          </h3>
          <div className={styles.fields}>
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
              value={firstDayOfWeek}
              onChange={(e) => setFirstDayOfWeek(e.target.value)}
              options={[
                { value: '0', label: 'Sunday' },
                { value: '1', label: 'Monday' },
                { value: '6', label: 'Saturday' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <h3 className={styles.sectionTitle}>
            <Download size={18} /> Data
          </h3>
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
                <div className={styles.actionDesc}>Import transactions from a CSV file</div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => window.location.href = '/transactions/import'}>
                Import
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className={styles.sectionTitle} style={{ color: 'var(--color-coral)' }}>
            <Trash2 size={18} /> Danger Zone
          </h3>
          <div className={styles.fields}>
            <div className={styles.actionRow}>
              <div>
                <div className={styles.actionLabel}>Reset All Data</div>
                <div className={styles.actionDesc}>Permanently delete all budget data. This cannot be undone.</div>
              </div>
              <Button variant="danger" size="sm">Reset</Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className={styles.sectionTitle}>
            <Info size={18} /> About
          </h3>
          <div className={styles.about}>
            <div><strong>MyBudget</strong> v0.1.0</div>
            <div className={styles.aboutText}>
              Privacy-first envelope budgeting. All data stays on your device. Zero analytics, zero telemetry.
            </div>
            <div className={styles.aboutText}>
              FSL-1.1-Apache-2.0 License
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
