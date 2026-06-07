import React, { useState, useEffect } from 'react';
import { api, type AdminAnalytics, type AdminDailyStats, type AdminLiveStats } from '../adminApi';
import type { ShowToast } from '../AdminApp';
import { AdminInput } from '../components/AdminInput';
import { ADMIN_CARD_CLASS, ADMIN_SPINNER_CLASS } from '../components/adminStyles';
import {
  typographyClass,
  labelSectionClass,
  labelSectionTitleClass,
  formLabelClass,
} from '../../../constants/typography';

interface Props {
  showToast: ShowToast;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${ADMIN_CARD_CLASS} p-5 flex flex-col gap-1.5`}>
      <span className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold`}>
        {label}
      </span>
      <span className="text-3xl font-serif font-bold text-ui-fg">{value}</span>
      {sub && <span className="text-xs text-ui-fg-muted">{sub}</span>}
    </div>
  );
}

function Bar({ pct, color = 'bg-ui-accent' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 bg-ui-surface-hover rounded-full h-2 overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${Math.max(1, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function StatsTab({ showToast }: Props) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [daily, setDaily] = useState<AdminDailyStats[]>([]);
  const [live, setLive] = useState<AdminLiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', url: '' });
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([api.getAnalytics(), api.getDailyStats(30)])
      .then(([a, d]) => {
        if (cancelled) return;
        setAnalytics(a);
        setDaily(d);
      })
      .catch((err: Error) => {
        if (!cancelled) showToast(err.message, 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Live stats poll — legitimate interval subscription with cleanup.
  useEffect(() => {
    let cancelled = false;
    const fetch = () => {
      api
        .getLiveStats()
        .then((d) => {
          if (!cancelled) setLive(d);
        })
        .catch(() => {
          if (!cancelled) setLive(null);
        });
    };
    fetch();
    const id = window.setInterval(fetch, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.body) return;
    setBroadcasting(true);
    try {
      await api.broadcastPush(
        broadcastForm.title,
        broadcastForm.body,
        broadcastForm.url || undefined
      );
      showToast('Push-розсилку надіслано', 'success');
      setBroadcastForm({ title: '', body: '', url: '' });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-24">
        <div className={`w-8 h-8 ${ADMIN_SPINNER_CLASS}`} />
      </div>
    );
  }

  if (!analytics) return null;

  const maxGames = Math.max(...daily.map((d) => d.games), 1);

  return (
    <div className="space-y-8">
      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ігор всього" value={analytics.games.total} />
        <StatCard
          label="Завершено"
          value={analytics.games.completed}
          sub={`${analytics.games.completionRate}% completion`}
        />
        <StatCard label="Покупок" value={analytics.revenue.totalPurchases} />
        <StatCard label="Дохід" value={`$${(analytics.revenue.totalCents / 100).toFixed(2)}`} />
      </div>

      {/* Live Redis */}
      <section>
        <h2 className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold mb-3`}>
          Live · Redis · оновлення кожні 15 с
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Активних кімнат"
            value={live?.activeRooms ?? '—'}
            sub={
              live
                ? live.redisConnected
                  ? `Оновлено о ${new Date(live.asOf).toLocaleTimeString('uk-UA')}`
                  : '⚠ Redis недоступний'
                : 'Завантаження…'
            }
          />
          <StatCard
            label="Гравців онлайн"
            value={live?.playersOnline ?? '—'}
            sub={live?.redisConnected ? 'alias:socket:* ключі' : ''}
          />
        </div>
      </section>

      {/* Metrics bars */}
      <section className={`${ADMIN_CARD_CLASS} p-6 space-y-4`}>
        <h2 className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold`}>
          Показники
        </h2>
        {[
          {
            label: 'Завершеність ігор',
            pct: analytics.games.completionRate,
            color: 'bg-ui-success',
          },
          {
            label: 'Конверсія покупок',
            pct:
              analytics.games.total > 0
                ? Math.round((analytics.revenue.totalPurchases / analytics.games.total) * 100)
                : 0,
            color: 'bg-ui-accent',
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-xs text-ui-fg-muted w-44 shrink-0">{row.label}</span>
            <Bar pct={row.pct} color={row.color} />
            <span className="text-xs text-ui-fg opacity-70 font-bold w-12 text-right">
              {row.pct}%
            </span>
          </div>
        ))}
      </section>

      {/* Daily chart */}
      {daily.length > 0 && (
        <section className={`${ADMIN_CARD_CLASS} p-6`}>
          <h2
            className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold mb-5`}
          >
            Активність за 30 днів
          </h2>
          <div className="flex items-end gap-0.5 h-28">
            {daily.map((d) => (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center"
                title={`${d.date}: ${d.games} ігор, $${(d.revenue / 100).toFixed(2)}`}
              >
                <div
                  className="w-full bg-[color-mix(in_srgb,var(--ui-accent)_50%,transparent)] hover:bg-ui-accent rounded-sm transition-colors cursor-default"
                  style={{
                    height: `${(d.games / maxGames) * 100}%`,
                    minHeight: d.games > 0 ? '4px' : '0',
                  }}
                />
              </div>
            ))}
          </div>
          <div
            className={`flex justify-between mt-2 ${typographyClass.label} normal-case text-ui-fg-subtle`}
          >
            <span>{daily[0]?.date.slice(5)}</span>
            <span>{daily[Math.floor(daily.length / 2)]?.date.slice(5)}</span>
            <span>{daily[daily.length - 1]?.date.slice(5)}</span>
          </div>
        </section>
      )}

      {/* Top packs */}
      {analytics.topPacks.length > 0 && (
        <section>
          <h2
            className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold mb-4`}
          >
            Топ паки
          </h2>
          <div className="space-y-2">
            {analytics.topPacks.map((p, i) => {
              const max = analytics.topPacks[0]?.purchases ?? 1;
              return (
                <div key={p.packId} className="flex items-center gap-3">
                  <span className="text-ui-fg-muted font-bold text-xs w-5">#{i + 1}</span>
                  <span className="text-ui-fg text-sm font-medium w-44 truncate">{p.name}</span>
                  <Bar pct={Math.round((p.purchases / max) * 100)} color="bg-ui-accent" />
                  <span className="text-ui-accent font-bold text-xs w-20 text-right">
                    {p.purchases} купівель
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Push broadcast */}
      <section className={`${ADMIN_CARD_CLASS} p-6 space-y-4`}>
        <h2 className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold`}>
          Push-розсилка
        </h2>
        <div className="space-y-3 max-w-lg">
          {(['title', 'body', 'url'] as const).map((field) => (
            <AdminInput
              key={field}
              value={broadcastForm[field]}
              onChange={(e) => setBroadcastForm((f) => ({ ...f, [field]: e.target.value }))}
              placeholder={
                field === 'title'
                  ? 'Заголовок *'
                  : field === 'body'
                    ? 'Текст повідомлення *'
                    : "URL (необов'язково)"
              }
              className="w-full rounded-xl px-4 py-3"
            />
          ))}
          <button
            onClick={handleBroadcast}
            disabled={broadcasting || !broadcastForm.title || !broadcastForm.body}
            className={`px-6 py-2.5 rounded-xl bg-ui-accent text-ui-accent-contrast ${typographyClass.label} normal-case uppercase tracking-widest transition-all hover:bg-ui-accent-hover active:scale-95 disabled:opacity-40`}
          >
            {broadcasting ? 'Надсилання...' : 'Розіслати всім'}
          </button>
        </div>
      </section>
    </div>
  );
}
