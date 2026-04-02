import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Plant {
  id: number;
  type: number;
  stage: number;
  x: number;
  height: number;
}

interface ConservatoryStateRow {
  user_id: string;
  plants: Plant[] | null;
  spent_energy: number | null;
  last_check_in: string;
}

export function useConservatory() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [spentEnergy, setSpentEnergy] = useState(0);
  const [loading, setLoading] = useState(true);

  const syncToDatabase = useCallback(
    async (newPlants: Plant[], newEnergy: number, checkInDate?: string) => {
      if (!supabase) return;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData.user;
      if (!user) return;

      const updatePayload: {
        plants: Plant[];
        spent_energy: number;
        last_check_in?: string;
      } = {
        plants: newPlants,
        spent_energy: Math.max(0, Math.floor(newEnergy)),
      };

      if (checkInDate) {
        updatePayload.last_check_in = checkInDate;
      }

      const { error } = await supabase
        .from('conservatory_state')
        .update(updatePayload)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    []
  );

  const loadAndCheckWither = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData.user;
      if (!user) return;

      let row: ConservatoryStateRow | null = null;
      const { data, error } = await supabase
        .from('conservatory_state')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: inserted, error: insertError } = await supabase
          .from('conservatory_state')
          .insert({ user_id: user.id })
          .select('*')
          .single();

        if (insertError) throw insertError;
        row = inserted as ConservatoryStateRow;
      } else if (error) {
        throw error;
      } else {
        row = data as ConservatoryStateRow;
      }

      if (!row) {
        setPlants([]);
        setSpentEnergy(0);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastCheckIn = new Date(row.last_check_in);
      lastCheckIn.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(today.getTime() - lastCheckIn.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let currentPlants: Plant[] = Array.isArray(row.plants) ? row.plants : [];

      if (diffDays > 1) {
        const missedDays = diffDays - 1;
        currentPlants = currentPlants.map((plant) => ({
          ...plant,
          stage: Math.max(0, Math.floor(plant.stage) - missedDays),
        }));
      }

      const currentEnergy = Math.max(0, Math.floor(row.spent_energy ?? 0));
      setPlants(currentPlants);
      setSpentEnergy(currentEnergy);

      await syncToDatabase(currentPlants, currentEnergy, today.toISOString());
    } catch (error) {
      console.error('Error loading conservatory:', error);
    } finally {
      setLoading(false);
    }
  }, [syncToDatabase]);

  useEffect(() => {
    void loadAndCheckWither();
  }, [loadAndCheckWither]);

  const updatePlantsAndEnergy = useCallback(
    (newPlants: Plant[], newSpentEnergy: number) => {
      setPlants(newPlants);
      setSpentEnergy(newSpentEnergy);
      void syncToDatabase(newPlants, newSpentEnergy);
    },
    [syncToDatabase]
  );

  return { plants, spentEnergy, updatePlantsAndEnergy, loading };
}
