import React from 'react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

(globalThis as { React?: typeof React }).React = React;

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) =>
    React.createElement('a', { href, ...props }, children),
}));
