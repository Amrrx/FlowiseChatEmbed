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
    themeColor?: string;
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
    variant?: 'default' | 'outlined';
    borderColor?: string;
    focusBorderColor?: string;
    borderRadius?: number;
    fontSize?: number;
    dividerColor?: string;
};
export type UserMessageTheme = {
    backgroundColor?: string;
    textColor?: string;
    showAvatar?: boolean;
    avatarSrc?: string;
    borderRadius?: number;
    padding?: string;
    boxShadow?: string;
    fontSize?: number;
};
export type BotMessageTheme = {
    backgroundColor?: string;
    textColor?: string;
    showAvatar?: boolean;
    avatarSrc?: string;
    borderRadius?: number;
    padding?: string;
    boxShadow?: string;
    fontSize?: number;
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
    layout?: 'floating' | 'sidebar' | 'inline';
    showTitle?: boolean;
    showAgentMessages?: boolean;
    title?: string;
    title_rtl?: string;
    titleAvatarSrc?: string;
    titleTextColor?: string;
    titleBackgroundColor?: string;
    titleHeight?: number;
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
    sidebarBorderWidth?: number;
    sidebarBorderColor?: string;
    sidebarBoxShadow?: string;
    sidebarBorder?: string;
    sidebarZIndex?: number;
    sidebarTop?: number;
    sidebarBottom?: number;
    sidebarResizable?: boolean;
    sidebarMinWidth?: number;
    sidebarMaxWidth?: number;
    sidebarResizeHandle?: {
        width?: number;
        color?: string;
        hoverColor?: string;
        grip?: boolean;
    };
    floatingBorderRadius?: number;
    floatingBoxShadow?: string;
    floatingBorder?: string;
    floatingRight?: number;
    floatingBottom?: number;
    quickActions?: QuickActionsTheme;
    header?: HeaderTheme;
};
export type QuickActionsTheme = {
    label?: string;
    labelColor?: string;
    labelFontSize?: number;
    labelFontWeight?: number;
    labelUppercase?: boolean;
    chipBackgroundColor?: string;
    chipBorder?: string;
    chipTextColor?: string;
    chipFontSize?: number;
    chipFontWeight?: number;
    chipPadding?: string;
};
export type HeaderTheme = {
    layoutSwitcher?: boolean;
    iconColor?: string;
    borderColor?: string;
    activeColor?: string;
    activeBackgroundColor?: string;
    buttonBorderColor?: string;
    fontSize?: number;
    fontWeight?: number;
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
    size?: 'small' | 'medium' | 'large' | number;
    backgroundColor?: string;
    iconColor?: string;
    customIconSrc?: string;
    bottom?: number;
    right?: number;
    dragAndDrop?: boolean;
    autoWindowOpen?: autoWindowOpenTheme;
    hideLauncher?: boolean;
    hideLauncherWhenDocked?: boolean;
    hideLauncherWhenOpen?: boolean;
};
export type ToolTipTheme = {
    showTooltip?: boolean;
    tooltipMessage?: string;
    tooltipBackgroundColor?: string;
    tooltipTextColor?: string;
    tooltipFontSize?: number;
};
export type autoWindowOpenTheme = {
    autoOpen?: boolean;
    openDelay?: number;
    autoOpenOnMobile?: boolean;
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
//# sourceMappingURL=types.d.ts.map