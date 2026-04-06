import type { NextFunction, Request, Response } from 'express';
import ipaddr from 'ipaddr.js';

function normalizeIp(input: string): ipaddr.IPv4 | ipaddr.IPv6 | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const parsed = ipaddr.parse(raw);
    // Express can return IPv4-mapped IPv6 addresses like ::ffff:10.8.0.2
    if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
      return (parsed as ipaddr.IPv6).toIPv4Address();
    }
    return parsed;
  } catch {
    return null;
  }
}

function matchesAllowed(ip: ipaddr.IPv4 | ipaddr.IPv6, rule: string): boolean {
  const trimmed = rule.trim();
  if (!trimmed) return false;
  try {
    if (trimmed.includes('/')) {
      const [range, prefix] = ipaddr.parseCIDR(trimmed);
      return ip.match(range, prefix);
    }
    const allowedIp = normalizeIp(trimmed);
    if (!allowedIp) return false;
    if (ip.kind() !== allowedIp.kind()) return false;
    return ip.toNormalizedString() === allowedIp.toNormalizedString();
  } catch {
    return false;
  }
}

function getClientIp(req: Request): ipaddr.IPv4 | ipaddr.IPv6 | null {
  // We rely on Express `trust proxy` to make `req.ip` reflect the real client IP behind Nginx.
  // If trust proxy is misconfigured, req.ip may be the proxy/container IP.
  return normalizeIp(String(req.ip ?? ''));
}

export function ipWhitelist(allowedIps: string[]) {
  const enabled = Array.isArray(allowedIps) && allowedIps.some((s) => s.trim().length > 0);

  return function ipWhitelistMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (!enabled) {
      next();
      return;
    }

    const clientIp = getClientIp(req);
    if (!clientIp) {
      res.status(403).json({ error: 'Access denied. VPN connection required.' });
      return;
    }

    const ok = allowedIps.some((rule) => matchesAllowed(clientIp, rule));
    if (!ok) {
      res.status(403).json({ error: 'Access denied. VPN connection required.' });
      return;
    }

    next();
  };
}
