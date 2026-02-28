interface Props {
  amount: number; // in cents
  className?: string;
  showSign?: boolean;
  colorize?: boolean;
}

export function CurrencyDisplay({ amount, className, showSign, colorize }: Props) {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const dollars = Math.floor(abs / 100);
  const cents = abs % 100;
  const formatted = `$${dollars.toLocaleString()}.${String(cents).padStart(2, '0')}`;
  const display = showSign
    ? isNegative ? `-${formatted}` : `+${formatted}`
    : isNegative ? `-${formatted}` : formatted;

  const color = colorize
    ? isNegative ? 'var(--color-coral)' : amount > 0 ? 'var(--color-teal)' : undefined
    : undefined;

  return (
    <span className={className} style={color ? { color } : undefined}>
      {display}
    </span>
  );
}
