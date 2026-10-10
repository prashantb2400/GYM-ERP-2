/**
 * Listmonk Marketing Client
 * Integration with Zerodha's self-hosted newsletter and mailing list manager
 * (https://github.com/knadh/listmonk).
 * Enables gym owners to run zero-cost member newsletters, retention broadcasts,
 * and diet/workout plan campaigns without expensive third-party SaaS fees.
 */

export interface ListmonkConfig {
  baseUrl?: string;
  username?: string;
  password?: string;
}

export interface ListmonkSubscriber {
  email: string;
  name: string;
  lists?: number[];
  status?: 'enabled' | 'disabled' | 'blocklisted';
  attribs?: Record<string, any>;
}

export interface ListmonkSyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

export class ListmonkClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config?: ListmonkConfig) {
    this.baseUrl = (config?.baseUrl || process.env.LISTMONK_URL || 'http://localhost:9000').replace(/\/$/, '');
    const user = config?.username || process.env.LISTMONK_USERNAME || 'listmonk';
    const pass = config?.password || process.env.LISTMONK_PASSWORD || 'listmonk';
    const credentials = Buffer.from(`${user}:${pass}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Listmonk API error (${res.status} ${res.statusText}): ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Health check to confirm Listmonk service is reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        headers: { 'Authorization': this.authHeader },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch all lists or find a specific list by name.
   */
  async getLists(): Promise<Array<{ id: number; name: string; type: string }>> {
    const data = await this.request<{ data: { results: Array<{ id: number; name: string; type: string }> } }>('/api/lists');
    return data.data.results || [];
  }

  /**
   * Finds an existing list by name or creates it if missing.
   */
  async findOrCreateList(name: string, description = 'GymERP Synced Member List'): Promise<number> {
    const lists = await this.getLists();
    const existing = lists.find(l => l.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    const created = await this.request<{ data: { id: number } }>('/api/lists', {
      method: 'POST',
      body: JSON.stringify({
        name,
        type: 'public',
        optin: 'single',
        tags: ['gymerp', 'members'],
        description,
      }),
    });

    return created.data.id;
  }

  /**
   * Upserts a single subscriber into Listmonk.
   */
  async upsertSubscriber(sub: ListmonkSubscriber): Promise<number> {
    const payload = {
      email: sub.email,
      name: sub.name,
      status: sub.status || 'enabled',
      lists: sub.lists || [],
      attribs: sub.attribs || {},
      preconfirm_subscriptions: true,
    };

    const res = await this.request<{ data: { id: number } }>('/api/subscribers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res.data.id;
  }

  /**
   * Syncs a list of gym members into a target Listmonk list.
   */
  async syncGymMembers(
    members: Array<{
      email: string;
      name: string;
      phone?: string;
      planName?: string;
      expiryDate?: string;
      status?: string;
    }>,
    targetListName = 'Gym Members'
  ): Promise<ListmonkSyncResult> {
    const listId = await this.findOrCreateList(targetListName);
    const result: ListmonkSyncResult = {
      total: members.length,
      synced: 0,
      failed: 0,
      errors: [],
    };

    for (const m of members) {
      if (!m.email || !m.email.includes('@')) {
        result.failed++;
        result.errors.push(`Invalid email for member: ${m.name}`);
        continue;
      }

      try {
        await this.upsertSubscriber({
          email: m.email,
          name: m.name,
          lists: [listId],
          attribs: {
            phone: m.phone,
            plan: m.planName,
            expiry_date: m.expiryDate,
            status: m.status,
            synced_from: 'GymERP',
          },
        });
        result.synced++;
      } catch (err: any) {
        result.failed++;
        result.errors.push(`${m.email}: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Sends a transactional email template via Listmonk.
   */
  async sendTransactional(
    templateId: number,
    subscriberEmail: string,
    data: Record<string, any>
  ): Promise<boolean> {
    try {
      await this.request('/api/tx', {
        method: 'POST',
        body: JSON.stringify({
          subscriber_email: subscriberEmail,
          template_id: templateId,
          data,
        }),
      });
      return true;
    } catch {
      return false;
    }
  }
}
