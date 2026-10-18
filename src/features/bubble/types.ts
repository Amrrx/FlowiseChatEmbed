export type BubbleParams = {
  theme?: BubbleTheme;
};

export type BubbleTheme = {
  chatWindow?: ChatWindowTheme;
  button?: ButtonTheme;
  tooltip?: ToolTipTheme;
  disclaimer?: DisclaimerPopUpTheme;
  customCSS?: string;
  form?: FormTheme;
  // Single accent color used as a fallback wherever a more specific color isn't set.
  themeColor?: string;
  // 'dark' recolors the panel's surfaces, text, borders and controls with a built-in
  // dark palette (brand accents are kept). The host may switch it at any time by
  // re-running init() with the new value. Defaults to 'light'.
  colorScheme?: 'light' | 'dark';
  // Applied on top of the built-in dark palette while colorScheme is 'dark'.
  dark?: Omit<BubbleTheme, 'dark' | 'colorScheme'>;
};

export type FormTheme = {
  backgroundColor?: string;
  textColor?: string;
};

export type TextInputTheme = {
  backgroundColor?: string;
  textColor?: string;
  placeholder?: string;
  placeholder_rtl?: string;
  sendButtonColor?: string;
  maxChars?: number;
  maxCharsWarningMessage?: string;
  autoFocus?: boolean;
  sendMessageSound?: boolean;
  sendSoundLocation?: string;
  receiveMessageSound?: boolean;
  receiveSoundLocation?: string;
  // 'outlined' renders the field as a bordered box with the send button beside it
  // (not inside), on a composer row separated from the messages by a divider.
  variant?: 'default' | 'outlined';
  borderColor?: string; // outlined only; defaults to #D5D7DA
  focusBorderColor?: string; // outlined only; defaults to sendButtonColor
  borderRadius?: number; // outlined only; field and send button radius, defaults to 8
  fontSize?: number; // outlined only; defaults to 16
  dividerColor?: string; // outlined only; line above the composer row, defaults to #E9EAEB
};

export type UserMessageTheme = {
  backgroundColor?: string;
  textColor?: string;
  showAvatar?: boolean;
  avatarSrc?: string;
  borderRadius?: number; // px; defaults to 18
  padding?: string; // raw CSS padding; defaults to '12px 16px'
  boxShadow?: string; // raw CSS box-shadow; 'none' removes it
  fontSize?: number; // px; defaults to the chat window's fontSize
};

export type BotMessageTheme = {
  backgroundColor?: string;
  textColor?: string;
  showAvatar?: boolean;
  avatarSrc?: string;
  borderRadius?: number; // px; defaults to 18
  padding?: string; // raw CSS padding; defaults to '12px 16px'
  boxShadow?: string; // raw CSS box-shadow; 'none' removes it
  fontSize?: number; // px; defaults to the chat window's fontSize
};

export type FooterTheme = {
  showFooter?: boolean;
  textColor?: string;
  text?: string;
  company?: string;
  companyLink?: string;
};

export type FeedbackTheme = {
  color?: string;
};

export type ChatWindowTheme = {
  // 'sidebar' docks the chat window to the right edge full-height and emits
  // 'flowise-sidebar-toggle' so the host page can push its own layout aside.
  // Falls back to 'floating' below 768px viewport width.
  // 'inline' renders unpositioned, filling whatever box the host places the
  // element in (see window.ts's init({id}) adoption option) — no launcher, no
  // fixed/transform chrome, opens immediately, ignores sidebarMinViewportWidth.
  // Defaults to 'floating'.
  layout?: 'floating' | 'sidebar' | 'inline';
  showTitle?: boolean;
  showAgentMessages?: boolean; // parameter to show agent reasonings when using agentflows
  title?: string;
  title_rtl?: string;
  titleAvatarSrc?: string;
  titleTextColor?: string;
  titleBackgroundColor?: string;
  titleHeight?: number; // px; defaults to 56, lets a host match its own header height
  showWelcomeMessage?: boolean;
  welcomeMessage?: string;
  errorMessage?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  height?: number;
  width?: number;
  fontSize?: number;
  userMessage?: UserMessageTheme;
  botMessage?: BotMessageTheme;
  textInput?: TextInputTheme;
  feedback?: FeedbackTheme;
  footer?: FooterTheme;
  sourceDocsTitle?: string;
  poweredByTextColor?: string;
  starterPrompts?: string[];
  starterPromptFontSize?: number;
  clearChatOnReload?: boolean;
  dateTimeToggle?: DateTimeToggleTheme;
  renderHTML?: boolean;
  autoMessage?: AutoMessageTheme;
  // Edge styling applied only when layout is 'sidebar'.
  sidebarBorderWidth?: number; // px; defaults to 1
  sidebarBorderColor?: string; // defaults to #d1d5db
  sidebarBoxShadow?: string; // raw CSS box-shadow; defaults to '-4px 0 24px rgba(0, 0, 0, 0.12)'
  // Raw CSS border drawn on all four sides, replacing the left-only
  // sidebarBorderWidth/sidebarBorderColor edge (e.g. '1px solid #F5F5F5').
  sidebarBorder?: string;
  // Stacking order of the docked panel; defaults to 42424242 (above everything).
  // Lower it to let host chrome such as a fixed footer and its shadow overlap the panel.
  sidebarZIndex?: number;
  // Sidebar insets from the viewport's top/bottom edges in px, so a docked panel
  // can sit between a host's own navbar and footer. Both default to 0.
  sidebarTop?: number;
  sidebarBottom?: number;
  // Lets the user drag the sidebar's leading edge to resize it. The width is
  // persisted per chatflow and reported live through 'flowise-sidebar-toggle'.
  sidebarResizable?: boolean;
  sidebarMinWidth?: number; // px; defaults to 240
  sidebarMaxWidth?: number; // px; defaults to 600
  // Draws the resize edge as a visible strip just outside the panel's leading edge,
  // with a centered grip (same look as angular-split's gutter). Without it the edge
  // is an invisible 6px hit area.
  sidebarResizeHandle?: {
    width?: number; // px; defaults to 5
    color?: string; // strip background; defaults to #eee
    hoverColor?: string; // defaults to color
    grip?: boolean; // dotted grip in the middle; defaults to true
  };
  // Floating window corner radius and shadow. Default to 20px and '0 4px 24px rgba(0, 0, 0, 0.12)'.
  floatingBorderRadius?: number;
  floatingBoxShadow?: string;
  floatingBorder?: string; // raw CSS border, e.g. '1px solid #F5F5F5'
  // Pins the floating window to these viewport offsets (px) instead of unfolding it
  // from the launcher; pair with button.hideLauncherWhenOpen so the window takes
  // the launcher's place.
  floatingRight?: number;
  floatingBottom?: number;
  quickActions?: QuickActionsTheme;
  // Opt-in title bar styling and controls. When set, the close button moves into
  // the title bar's own flow (next to the ⋮ menu) instead of floating over it.
  header?: HeaderTheme;
};

export type QuickActionsTheme = {
  label?: string; // defaults to 'Quick actions'
  labelColor?: string;
  labelFontSize?: number;
  labelFontWeight?: number;
  labelUppercase?: boolean; // defaults to true
  chipBackgroundColor?: string;
  chipBorder?: string; // raw CSS border
  chipTextColor?: string;
  chipFontSize?: number;
  chipFontWeight?: number;
  chipPadding?: string; // raw CSS padding
};

export type HeaderTheme = {
  // Adds "Switch to Floating / Side Panel" to the ⋮ menu. The choice is applied
  // in place (the conversation survives) and announced on document as a
  // 'flowise-layout-change' CustomEvent ({ layout }) so the host can persist it.
  layoutSwitcher?: boolean;
  iconColor?: string; // ⋮, close, announcements and reports icons; defaults to #535862
  borderColor?: string; // divider under the title bar; defaults to #E9EAEB
  activeColor?: string; // checkmark next to the active layout; defaults to #252B37
  activeBackgroundColor?: string; // active layout row; defaults to rgba(232, 239, 239, 0.5)
  buttonBorderColor?: string; // ⋮ button outline; defaults to #D5D7DA
  fontSize?: number; // title text px; defaults to 16
  fontWeight?: number; // title text weight; defaults to 600
  labels?: {
    menu?: string;
    switchTo?: string;
    floating?: string;
    sidebar?: string;
    clear?: string;
    close?: string;
  };
};

export type ButtonTheme = {
  size?: 'small' | 'medium' | 'large' | number; // custom size of chatbot in pixels
  backgroundColor?: string;
  iconColor?: string;
  customIconSrc?: string;
  bottom?: number;
  right?: number;
  dragAndDrop?: boolean; // parameter to enable drag and drop(true or false)
  autoWindowOpen?: autoWindowOpenTheme;
  // Suppress the built-in launcher and tooltip. The host page supplies its own
  // trigger and opens the panel with a 'flowise-toggle' CustomEvent dispatched
  // on the <flowise-chatbot> element. autoWindowOpen still applies.
  hideLauncher?: boolean;
  // Hide the launcher only while the layout is 'sidebar' (e.g. the host's own
  // toolbar opens the docked panel), and show it again when the user switches to floating.
  hideLauncherWhenDocked?: boolean;
  // Hide the launcher while the floating window is open (the window's own close
  // button and the host's trigger still close it).
  hideLauncherWhenOpen?: boolean;
};

export type ToolTipTheme = {
  showTooltip?: boolean; // parameter to enable tooltip(true or false)
  tooltipMessage?: string;
  tooltipBackgroundColor?: string;
  tooltipTextColor?: string;
  tooltipFontSize?: number;
};

export type autoWindowOpenTheme = {
  autoOpen?: boolean; //parameter to control automatic window opening
  openDelay?: number; // Optional parameter for delay time in seconds
  autoOpenOnMobile?: boolean; // Optional parameter for opening on mobile
};

export type DisclaimerPopUpTheme = {
  title?: string;
  message?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonText?: string;
  blurredBackgroundColor?: string;
  backgroundColor?: string;
  denyButtonBgColor?: string;
  denyButtonText?: string;
};

export type DateTimeToggleTheme = {
  date?: boolean;
  time?: boolean;
};

export type AutoMessageTheme = {
  enabled?: boolean;
  message?: string;
};
