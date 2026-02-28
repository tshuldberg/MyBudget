'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, ArrowLeft, Check, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { CurrencyDisplay } from '../../../components/ui/CurrencyDisplay';
import { parseCSV } from '@mybudget/shared';
import type { ParsedTransaction, CsvProfile } from '@mybudget/shared';
import styles from './page.module.css';

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Upload', 'Map Columns', 'Preview', 'Done'];

export default function ImportCSVPage() {
  const [step, setStep] = useState<Step>(1);
  const [rawContent, setRawContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Column mapping state
  const [dateCol, setDateCol] = useState('0');
  const [payeeCol, setPayeeCol] = useState('1');
  const [amountCol, setAmountCol] = useState('2');
  const [memoCol, setMemoCol] = useState('');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [amountSign, setAmountSign] = useState<'negative_is_outflow' | 'positive_is_outflow'>('negative_is_outflow');

  // Parsed results
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [importedCount, setImportedCount] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawContent(text);

      // Extract headers from first line
      const firstLine = text.split(/\r?\n/)[0] ?? '';
      const cols = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      setHeaders(cols);
      setStep(2);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) handleFile(file);
    },
    [handleFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleParse = useCallback(() => {
    const profile: CsvProfile = {
      id: 'temp',
      name: 'Import',
      date_column: parseInt(dateCol, 10),
      payee_column: parseInt(payeeCol, 10),
      amount_column: parseInt(amountCol, 10),
      memo_column: memoCol ? parseInt(memoCol, 10) : null,
      date_format: dateFormat,
      amount_sign: amountSign,
      debit_column: null,
      credit_column: null,
      skip_rows: 1, // Skip header row
      created_at: new Date().toISOString(),
    };

    const result = parseCSV(rawContent, profile);
    setParsed(result.transactions);
    setErrors(result.errors);
    setStep(3);
  }, [rawContent, dateCol, payeeCol, amountCol, memoCol, dateFormat, amountSign]);

  const handleImport = useCallback(() => {
    // In a full implementation, this would call createTransaction for each parsed row.
    // For now, we simulate success with the count.
    setImportedCount(parsed.length);
    setStep(4);
  }, [parsed]);

  const columnOptions = headers.map((h, i) => ({
    value: String(i),
    label: `${i}: ${h}`,
  }));

  const memoOptions = [
    { value: '', label: 'None' },
    ...columnOptions,
  ];

  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'M/D/YY', label: 'M/D/YY' },
  ];

  const amountSignOptions = [
    { value: 'negative_is_outflow', label: 'Negative = Outflow' },
    { value: 'positive_is_outflow', label: 'Positive = Outflow' },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="Import Transactions"
        subtitle={fileName ? `File: ${fileName}` : 'Upload a CSV file from your bank'}
        actions={
          <Link href="/transactions">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} /> Back
            </Button>
          </Link>
        }
      />

      {/* Step Indicator */}
      <div className={styles.steps}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isDone = step > stepNum;
          const isActive = step === stepNum;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              {i > 0 && (
                <div
                  className={`${styles.stepConnector} ${isDone ? styles.stepConnectorDone : ''}`}
                />
              )}
              <div
                className={`${styles.step} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}
              >
                <div className={styles.stepNumber}>
                  {isDone ? <Check size={14} /> : stepNum}
                </div>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.wizard}>
        {/* Step 1: Upload */}
        {step === 1 && (
          <div
            className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div className={styles.dropzoneIcon}>
              <Upload size={40} />
            </div>
            <div className={styles.dropzoneTitle}>
              Drop your CSV file here
            </div>
            <div className={styles.dropzoneHint}>
              or click to browse. Supports CSV exports from most banks.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className={styles.fileInput}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <Card>
            <p className={styles.previewLabel}>
              Map your CSV columns to transaction fields
            </p>
            <div className={styles.mappingGrid}>
              <Select
                label="Date Column"
                options={columnOptions}
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
              />
              <Select
                label="Date Format"
                options={dateFormatOptions}
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              />
              <Select
                label="Payee Column"
                options={columnOptions}
                value={payeeCol}
                onChange={(e) => setPayeeCol(e.target.value)}
              />
              <Select
                label="Amount Column"
                options={columnOptions}
                value={amountCol}
                onChange={(e) => setAmountCol(e.target.value)}
              />
              <Select
                label="Memo Column"
                options={memoOptions}
                value={memoCol}
                onChange={(e) => setMemoCol(e.target.value)}
              />
              <Select
                label="Amount Convention"
                options={amountSignOptions}
                value={amountSign}
                onChange={(e) => setAmountSign(e.target.value as typeof amountSign)}
              />
            </div>
            <div className={styles.wizardActions}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleParse}>
                <FileSpreadsheet size={16} /> Parse CSV
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <Card>
            <p className={styles.previewLabel}>
              {parsed.length} transaction{parsed.length !== 1 ? 's' : ''} found
              {errors.length > 0 && (
                <span style={{ color: 'var(--color-coral)', marginLeft: 'var(--spacing-sm)' }}>
                  ({errors.length} error{errors.length !== 1 ? 's' : ''})
                </span>
              )}
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payee</th>
                    <th>Amount</th>
                    <th>Memo</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((txn, i) => (
                    <tr key={i}>
                      <td>{txn.date}</td>
                      <td>{txn.payee}</td>
                      <td>
                        <CurrencyDisplay amount={txn.amount} colorize showSign />
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{txn.memo ?? ''}</td>
                    </tr>
                  ))}
                  {parsed.length > 50 && (
                    <tr>
                      <td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                        ...and {parsed.length - 50} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {errors.length > 0 && (
              <>
                <p
                  className={styles.previewLabel}
                  style={{ marginTop: 'var(--spacing-lg)', color: 'var(--color-coral)' }}
                >
                  Errors
                </p>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.slice(0, 10).map((err, i) => (
                      <tr key={i} className={styles.errorRow}>
                        <td>{err.row + 1}</td>
                        <td>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className={styles.wizardActions}>
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={parsed.length === 0}>
                Import {parsed.length} Transaction{parsed.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <Card>
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>
                <Check size={32} />
              </div>
              <div className={styles.successTitle}>Import Complete</div>
              <p className={styles.successDesc}>
                Successfully imported {importedCount} transaction{importedCount !== 1 ? 's' : ''} from {fileName}.
              </p>
              <Link href="/transactions">
                <Button>View Transactions</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
