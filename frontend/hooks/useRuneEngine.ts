import { useState } from 'react';
import { useICP } from '@/lib/icp/ICPProvider';
import { getRuneEngineActor } from '@/lib/icp/actors';
import { RuneEtching, EtchingProcessView } from '@/types/canisters';

export function useRuneEngine() {
  const { isConnected } = useICP();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRune = async (etching: RuneEtching): Promise<string | null> => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const actor = getRuneEngineActor();
      const result = await actor.create_rune(etching);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getEtchingStatus = async (processId: string): Promise<EtchingProcessView | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const actor = getRuneEngineActor();
      const result = await actor.get_etching_status(processId);

      if (result.length > 0 && result[0]) {
        return result[0];
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getMyEtchings = async (): Promise<EtchingProcessView[]> => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const actor = getRuneEngineActor();
      return await actor.get_my_etchings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createRune,
    getEtchingStatus,
    getMyEtchings,
    isLoading,
    error,
  };
}
