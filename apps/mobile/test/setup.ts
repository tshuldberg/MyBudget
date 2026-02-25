import React from 'react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

function renderChildren(
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode),
  state = { pressed: false },
) {
  return typeof children === 'function'
    ? (children as (s: { pressed: boolean }) => React.ReactNode)(state)
    : children;
}

function sanitizeProps(props: Record<string, unknown>) {
  const next = { ...props };
  delete next.style;
  delete next.contentContainerStyle;
  delete next.keyboardShouldPersistTaps;
  delete next.stickySectionHeadersEnabled;
  delete next.hitSlop;
  delete next.numberOfLines;
  delete next.trackColor;
  delete next.thumbColor;
  delete next.selectionColor;
  delete next.placeholderTextColor;
  delete next.autoCapitalize;
  delete next.autoComplete;
  delete next.keyboardType;
  delete next.secureTextEntry;
  delete next.multiline;
  delete next.textAlignVertical;
  return next;
}

function host(tag: keyof HTMLElementTagNameMap) {
  return function Host({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) {
    return React.createElement(tag, sanitizeProps(props), renderChildren(children));
  };
}

vi.mock('react-native', () => {
  const View = host('div');
  const Text = host('span');
  const ScrollView = host('div');
  const KeyboardAvoidingView = host('div');
  const ActivityIndicator = host('div');

  const Pressable = ({
    children,
    onPress,
    onLongPress,
    disabled,
    ...props
  }: Record<string, unknown> & {
    children?: React.ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        ...sanitizeProps(props),
        disabled: Boolean(disabled),
        onClick: disabled ? undefined : onPress,
        onContextMenu: (event: MouseEvent) => {
          event.preventDefault();
          if (!disabled) onLongPress?.();
        },
      },
      renderChildren(children),
    );

  const Switch = ({
    value,
    onValueChange,
    ...props
  }: Record<string, unknown> & {
    value?: boolean;
    onValueChange?: (value: boolean) => void;
  }) =>
    React.createElement('input', {
      type: 'checkbox',
      ...sanitizeProps(props),
      checked: Boolean(value),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        onValueChange?.(event.currentTarget.checked),
    });

  const TextInput = React.forwardRef<HTMLInputElement, Record<string, unknown>>(
    ({ value, onChangeText, ...props }, ref) =>
      React.createElement('input', {
        ...sanitizeProps(props),
        ref,
        value: (value as string | undefined) ?? '',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          (onChangeText as ((v: string) => void) | undefined)?.(event.currentTarget.value),
      }),
  );
  TextInput.displayName = 'TextInput';

  const FlatList = ({
    data = [],
    renderItem,
    ListEmptyComponent,
  }: Record<string, unknown>) => {
    const list = data as unknown[];
    const empty =
      typeof ListEmptyComponent === 'function'
        ? React.createElement(ListEmptyComponent as React.ComponentType)
        : (ListEmptyComponent as React.ReactNode);
    return React.createElement(
      'div',
      null,
      list.length === 0
        ? empty
        : list.map((item, index) =>
            React.createElement(
              React.Fragment,
              { key: index },
              (renderItem as ((args: { item: unknown; index: number }) => React.ReactNode) | undefined)?.({
                item,
                index,
              }),
            ),
          ),
    );
  };

  const SectionList = ({
    sections = [],
    renderSectionHeader,
    renderItem,
    ListHeaderComponent,
    ListEmptyComponent,
  }: Record<string, unknown>) => {
    const typedSections = sections as Array<{ data?: unknown[] }>;
    const hasRows = typedSections.some((section) => (section.data?.length ?? 0) > 0);
    const header =
      typeof ListHeaderComponent === 'function'
        ? React.createElement(ListHeaderComponent as React.ComponentType)
        : (ListHeaderComponent as React.ReactNode);
    const empty =
      typeof ListEmptyComponent === 'function'
        ? React.createElement(ListEmptyComponent as React.ComponentType)
        : (ListEmptyComponent as React.ReactNode);

    return React.createElement(
      'div',
      null,
      header,
      ...typedSections.flatMap((section, sectionIndex) => [
        React.createElement(
          React.Fragment,
          { key: `header-${(section as { title?: string }).title ?? sectionIndex}` },
          (renderSectionHeader as ((args: { section: unknown }) => React.ReactNode) | undefined)?.({
            section,
          }),
        ),
        ...(section.data ?? []).map((item, index) =>
          React.createElement(
            React.Fragment,
            { key: `item-${(section as { title?: string }).title ?? sectionIndex}-${index}` },
            (renderItem as ((args: { item: unknown; index: number; section: unknown }) => React.ReactNode) | undefined)?.({
              item,
              index,
              section,
            }),
          ),
        ),
      ]),
      hasRows ? null : empty,
    );
  };

  class AnimatedValue {
    private value: number;

    constructor(value: number) {
      this.value = value;
    }

    setValue(next: number) {
      this.value = next;
    }

    interpolate() {
      return this.value;
    }
  }

  const Animated = {
    Value: AnimatedValue,
    timing: () => ({
      start: (callback?: () => void) => callback?.(),
    }),
    Text: host('span'),
  };

  return {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    ActivityIndicator,
    Pressable,
    FlatList,
    SectionList,
    TextInput,
    Switch,
    Image: host('img'),
    Animated,
    Alert: { alert: vi.fn() },
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      hairlineWidth: 1,
    },
    Dimensions: {
      get: () => ({ width: 390, height: 844 }),
    },
    Platform: { OS: 'ios' },
  };
});

vi.mock('@mybudget/ui', () => {
  const colorScale = new Proxy<Record<string, string>>(
    {},
    { get: () => '#999999' },
  );
  const spacingScale = new Proxy<Record<string, number>>(
    {},
    { get: () => 8 },
  );
  const fontScale = new Proxy<Record<string, number>>(
    {},
    { get: () => 14 },
  );
  const lineHeightScale = new Proxy<Record<string, number>>(
    {},
    { get: () => 1.4 },
  );
  const weightScale = new Proxy<Record<string, string | number>>(
    {},
    { get: () => 500 },
  );
  const familyScale = new Proxy<Record<string, string>>(
    {},
    { get: () => 'System' },
  );

  const Text = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('span', sanitizeProps(props), children);
  const Card = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('div', sanitizeProps(props), children);
  const Badge = ({
    status,
    label,
    ...props
  }: Record<string, unknown> & { status: string; label?: string }) =>
    React.createElement('span', sanitizeProps(props), label ?? status);
  const ProgressBar = ({ progress = 0, ...props }: Record<string, unknown> & { progress?: number }) =>
    React.createElement('progress', { ...sanitizeProps(props), value: progress, max: 100 });
  const Button = ({
    label,
    onPress,
    disabled,
    ...props
  }: Record<string, unknown> & {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        ...sanitizeProps(props),
        disabled: Boolean(disabled),
        onClick: disabled ? undefined : onPress,
      },
      label,
    );
  const Input = ({
    label,
    value,
    onChangeText,
    ...props
  }: Record<string, unknown> & {
    label: string;
    value?: string;
    onChangeText?: (value: string) => void;
  }) =>
    React.createElement(
      'label',
      null,
      React.createElement('span', null, label),
      React.createElement('input', {
        ...sanitizeProps(props),
        'aria-label': label,
        value: value ?? '',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeText?.(event.currentTarget.value),
      }),
    );

  return {
    Text,
    Card,
    Badge,
    ProgressBar,
    Button,
    Input,
    colors: colorScale,
    spacing: spacingScale,
    typography: {
      fontSize: fontScale,
      lineHeight: lineHeightScale,
      fontWeight: weightScale,
      fontFamily: familyScale,
    },
  };
});
