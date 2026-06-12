import { FullscreenBootLoading } from './BootLoading';

/**
 * Full-screen boot state for Telegram Mini App.
 * Shown until JWT handshake completes (GameProvider is not mounted yet).
 */
export const TelegramAuthLoadingScreen = () => <FullscreenBootLoading message="Авторизація…" />;
