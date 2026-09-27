import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const LIMIT = 30;

/** The signed-in user's latest notifications, kept live over realtime. */
export const useNotifications = (userId: string | null) => {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    let cancelled = false;

    supabase
      .from('notifications')
      .select('id, kind, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT)
      .then(({ data }) => {
        if (!cancelled) setItems((data ?? []) as AppNotification[]);
      });

    const channel = supabase
      .channel(`notifications-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as AppNotification, ...prev].slice(0, LIMIT)),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(async (ids?: string[]) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id)) && !n.read_at ? { ...n, read_at: now } : n));
    let query = supabase.from('notifications').update({ read_at: now }).is('read_at', null);
    if (ids) query = query.in('id', ids);
    await query;
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  return { items, unread, markRead };
};
