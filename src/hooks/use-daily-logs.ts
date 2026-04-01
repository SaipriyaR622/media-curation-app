import { useCallback, useEffect, useState } from 'react';
import { DailyLog } from '@/lib/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface PinnedSongInput {
  spotifyTrackId?: string | null;
  title?: string | null;
  artist?: string | null;
  coverUrl?: string | null;
  spotifyUrl?: string | null;
}

export function useDailyLogs() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData.user;
      if (!user) {
        setLogs([]);
        return;
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setLogs((data ?? []) as DailyLog[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load daily logs.';
      console.error('Error fetching daily logs:', message);
      toast({
        title: 'Daily logs unavailable',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const upsertLog = useCallback(
    async (date: string, pagesRead: number, notes?: string | null, pinnedSong?: PinnedSongInput | null) => {
      if (!isSupabaseConfigured || !supabase) {
        toast({
          title: 'Supabase not configured',
          description: 'Connect Supabase to save daily logs.',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const user = userData.user;
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('daily_logs')
          .upsert(
            {
              user_id: user.id,
              date,
              pages_read: Math.max(0, Math.floor(pagesRead)),
              notes: notes ?? null,
              spotify_track_id: pinnedSong?.spotifyTrackId?.trim() || null,
              song_title: pinnedSong?.title?.trim() || null,
              song_artist: pinnedSong?.artist?.trim() || null,
              song_cover_url: pinnedSong?.coverUrl?.trim() || null,
              song_spotify_url: pinnedSong?.spotifyUrl?.trim() || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,date' }
          )
          .select()
          .single();

        if (error) throw error;

        const nextLog = data as DailyLog;
        setLogs((prev) => {
          const index = prev.findIndex((log) => log.date === date);
          if (index >= 0) {
            const next = [...prev];
            next[index] = nextLog;
            return next;
          }
          return [...prev, nextLog];
        });

        toast({
          title: 'Log updated',
          description: `Saved ${nextLog.pages_read} pages for ${date}`,
        });

        return nextLog;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save daily log.';
        toast({
          title: 'Error saving log',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast]
  );

  return { logs, loading, upsertLog, refresh: fetchLogs };
}
