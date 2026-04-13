import { Markup, Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';

let botSingleton: Telegraf | null = null;
let prismaSingleton: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (prismaSingleton) return prismaSingleton;
  prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

function getRequiredTelegramToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN env variable is not set');
  }
  return token;
}

function getFrontendUrl(): string {
  const raw = process.env.FRONTEND_URL?.trim();
  return raw && raw.length > 0 ? raw : 'https://твій-тестовий-url.com';
}

function buildStartMessage(): string {
  return [
    '👋 <b>Привіт!</b>',
    '',
    'Ласкаво просимо в <b>Alias</b> — гру, де команда пояснює слова, не називаючи їх напряму.',
    '',
    '<b>Як грати:</b>',
    '• Створюй кімнату або приєднуйся за кодом',
    '• Пояснюй слова — без однокореневих і перекладів',
    '• Заробляй бали та вигравай раунди',
    '',
    'Натискай кнопку нижче, щоб почати.',
  ].join('\n');
}

export function getTelegramBot(): Telegraf {
  if (botSingleton) return botSingleton;

  const bot = new Telegraf(getRequiredTelegramToken());

  bot.start(async (ctx) => {
    const keyboard = Markup.inlineKeyboard([[Markup.button.webApp('🎮 Грати', getFrontendUrl())]]);

    await ctx.replyWithHTML(buildStartMessage(), {
      ...keyboard,
    });
  });

  // Payments: MUST answer pre_checkout_query within 10 seconds
  bot.on('pre_checkout_query', async (ctx) => {
    try {
      await ctx.answerPreCheckoutQuery(true);
    } catch (err) {
      console.warn('[Telegram] pre_checkout_query answer failed:', (err as Error).message);
    }
  });

  // Payments: successful payment handler
  bot.on('successful_payment', async (ctx) => {
    const payment = ctx.message?.successful_payment;
    if (!payment) return;

    const purchaseId = String(payment.invoice_payload || '').trim();
    if (!purchaseId) return;

    try {
      const prisma = getPrisma();

      const updated = await prisma.purchase.updateMany({
        where: {
          id: purchaseId,
          status: 'pending',
          paymentProvider: 'telegram_stars',
        },
        data: { status: 'completed' },
      });

      if (updated.count > 0) {
        await ctx.replyWithHTML('✅ <b>Оплату прийнято!</b>\nПокупку активовано.');
      } else {
        // Idempotency / already processed
        await ctx.replyWithHTML('✅ <b>Оплату прийнято!</b>');
      }
    } catch (err) {
      console.error('[Telegram] successful_payment Prisma error:', err);
      await ctx.replyWithHTML(
        '⚠️ Оплату отримано, але сталася помилка активації. Напишіть в підтримку.'
      );
    }
  });

  botSingleton = bot;
  return bot;
}

export function getTelegramWebhookCallback(params: {
  path: string;
  secretToken: string;
}): RequestHandler {
  const { path, secretToken } = params;
  const bot = getTelegramBot();
  return bot.webhookCallback(path, { secretToken });
}

export async function setTelegramWebhook(params: {
  webhookUrl: string;
  secretToken: string;
}): Promise<void> {
  const { webhookUrl, secretToken } = params;
  const bot = getTelegramBot();
  await bot.telegram.setWebhook(webhookUrl, {
    secret_token: secretToken,
    drop_pending_updates: true,
  });
}

export async function startTelegramLongPolling(): Promise<void> {
  try {
    const bot = getTelegramBot();
    await bot.launch();
    console.log('[Telegram] Bot launched (long polling)');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`[Telegram] Bot not started: ${message}`);
  }
}

export function stopTelegramBot(reason: string): void {
  if (!botSingleton) return;
  botSingleton.stop(reason);
}
