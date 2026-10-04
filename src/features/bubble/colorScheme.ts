import type { BubbleTheme } from './types';

/**
 * Dark palette: one cool-slate family, each elevation a step lighter than the one
 * below (bg → surface → alt → raised → hover). Text is dimmed below pure white on
 * purpose — light strokes on a very dark surface read heavier than the same
 * contrast the other way round.
 */
const dark = {
  bg: '#0b0f17',
  surface: '#131924',
  surfaceAlt: '#171e2a',
  surfaceRaised: '#1c2432',
  surfaceHover: '#222b3a',
  surfaceSunken: '#0e131c',
  selected: '#1e3230',
  border: '#252e3d',
  borderStrong: '#354052',
  text: '#c6c9ce',
  textMuted: '#9ba0aa',
  textFaint: '#767c87',
  icon: '#b4b9c2',
  link: '#6aa9ff',
};

/**
 * CSS custom properties for colors the widget draws itself rather than taking from
 * the theme (menus, outlined buttons, native controls). Components read them with
 * their light value as the fallback, so light mode needs none of them. A host can
 * restyle dark mode further by setting the same properties on the
 * <flowise-chatbot> element — outer styles win over :host.
 */
export const colorSchemeStyle = (scheme: BubbleTheme['colorScheme']) =>
  scheme === 'dark'
    ? `:host {
  color-scheme: dark;
  --fw-surface-raised: ${dark.surfaceRaised};
  --fw-surface-hover: ${dark.surfaceHover};
  --fw-selected: ${dark.selected};
  --fw-border: ${dark.border};
  --fw-border-strong: ${dark.borderStrong};
  --fw-text: ${dark.text};
  --fw-text-muted: ${dark.textMuted};
  --fw-icon: ${dark.icon};
  --fw-grip-filter: invert(1) opacity(0.6);
  --fw-surface: ${dark.surface};
  --fw-text-strong: ${dark.text};
  --fw-text-body: ${dark.icon};
  --fw-text-faint: ${dark.textFaint};
  --fw-border-subtle: ${dark.border};
  --fw-link: ${dark.link};
  --fw-quote-bg: ${dark.surfaceAlt};
  --fw-quote-border: #47cd89;
  --fw-overlay: #00000099;
  --fw-overlay-shadow: inset 0 1px 0 #ffffff0d, 0 20px 60px #00000099;
  --fw-cat-feature-tint: #12261c;
  --fw-cat-feature-ink: #47cd89;
  --fw-cat-fix-tint: #2b1f0a;
  --fw-cat-fix-ink: #fdb022;
  --fw-cat-notice-tint: ${dark.surfaceRaised};
  --fw-cat-notice-ink: ${dark.textMuted};
  --chatbot-input-placeholder-color: ${dark.textFaint};
  --chatbot-host-bubble-color: ${dark.text};
}`
    : '';

const isPlainObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const deepMerge = <T>(base: T, overrides: unknown): T => {
  if (!isPlainObject(overrides)) return base;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    result[key] = isPlainObject(value) && isPlainObject(result[key]) ? deepMerge(result[key], value) : value;
  }
  return result as T;
};

/**
 * Dark replacements for the theme's own surface/text/border colors. Brand accents
 * (themeColor, launcher, user bubble, send button) are left alone. Opt-in styling
 * the host never configured (header, sidebarBorder, …) stays unconfigured, so
 * turning dark mode on never switches on a feature by itself.
 */
const darkDefaults = (theme: BubbleTheme): BubbleTheme => {
  const chatWindow = theme.chatWindow ?? {};
  return {
    chatWindow: {
      backgroundColor: dark.surface,
      titleBackgroundColor: dark.surface,
      titleTextColor: dark.text,
      poweredByTextColor: dark.textMuted,
      sidebarBorderColor: dark.border,
      ...(chatWindow.sidebarBorder && { sidebarBorder: `1px solid ${dark.border}` }),
      ...(chatWindow.floatingBorder && { floatingBorder: `1px solid ${dark.border}` }),
      ...(chatWindow.sidebarResizeHandle && { sidebarResizeHandle: { color: dark.bg, hoverColor: dark.surfaceRaised } }),
      ...(chatWindow.header && {
        header: {
          iconColor: dark.icon,
          borderColor: dark.border,
          buttonBorderColor: dark.borderStrong,
          activeBackgroundColor: dark.selected,
        },
      }),
      botMessage: { backgroundColor: dark.surfaceAlt, textColor: dark.text },
      textInput: {
        backgroundColor: dark.surfaceSunken,
        textColor: dark.text,
        ...(chatWindow.textInput?.variant === 'outlined' && { borderColor: dark.borderStrong, dividerColor: dark.border }),
      },
      ...(chatWindow.quickActions && {
        quickActions: {
          labelColor: dark.textMuted,
          chipBackgroundColor: dark.surfaceRaised,
          chipBorder: `0.5px solid ${dark.borderStrong}`,
          chipTextColor: dark.textMuted,
        },
      }),
    },
  };
};

/**
 * The theme actually rendered: as given in light mode; in dark mode, the built-in
 * dark colors over it, then the host's own `theme.dark` overrides on top.
 */
export const resolveTheme = (theme: BubbleTheme | undefined): BubbleTheme | undefined => {
  if (!theme || theme.colorScheme !== 'dark') return theme;
  return deepMerge(deepMerge(theme, darkDefaults(theme)), theme.dark);
};
