import { create } from 'zustand';
import { persist } from '../../lib/persistir';
import type { DungeonProgress, TrackDungeonState, TrackId } from './types';

const fresh = (): TrackDungeonState => ({ currentStageNumber: 1, completedStageIds: [], defeatedBossIds: [], highScores: {} });

interface DungeonState {
  track: TrackId;
  progress: DungeonProgress;
  setTrack: (t: TrackId) => void;
  recordWin: (track: TrackId, stageId: string, stageNumber: number, score: number, isBoss?: boolean) => void;
  resetTrack: (track: TrackId) => void;
}

export const useDungeon = create<DungeonState>()(
  persist(
    (set) => ({
      track: 'csharp',
      progress: { csharp: fresh(), c_bases: fresh(), lfa: fresh() },
      setTrack: (track) => set({ track }),
      recordWin: (track, stageId, stageNumber, score, isBoss) =>
        set((s) => {
          const cur = s.progress[track] ?? fresh();
          return {
            progress: {
              ...s.progress,
              [track]: {
                currentStageNumber: Math.max(cur.currentStageNumber, stageNumber + 1),
                completedStageIds: cur.completedStageIds.includes(stageId) ? cur.completedStageIds : [...cur.completedStageIds, stageId],
                defeatedBossIds: isBoss && !cur.defeatedBossIds.includes(stageId) ? [...cur.defeatedBossIds, stageId] : cur.defeatedBossIds,
                highScores: { ...cur.highScores, [stageId]: Math.max(cur.highScores[stageId] ?? 0, score) },
              },
            },
          };
        }),
      resetTrack: (track) => set((s) => ({ progress: { ...s.progress, [track]: fresh() } })),
    }),
    { name: 'neural-os.dungeon', version: 1 },
  ),
);
