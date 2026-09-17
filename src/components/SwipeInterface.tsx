'use client';

import { useState, useCallback } from 'react';
import SwipeCard from './SwipeCard';
import { Title, MatchedTitle, SessionStatus } from '@/types';

interface Props {
  pool: Title[];
  sessionCode: string;
  partnerId: string;
  partner: 'A' | 'B';
  round: number;
  onMatch: (match: MatchedTitle) => void;
  onRoundEnd: (newStatus: SessionStatus) => void;
}

export default function SwipeInterface({
  pool,
  sessionCode,
  partnerId,
  partner,
  round,
  onMatch,
  onRoundEnd,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  const remaining = pool.length - currentIndex;
  const progress = Math.min((currentIndex / pool.length) * 100, 100);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right', tmdbId: number, mediaType: string) => {
      if (swiping) return;
      setSwiping(true);

      setCurrentIndex((prev) => prev + 1);

      try {
        const res = await fetch(`/api/session/${sessionCode}/swipe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partnerId, tmdbId, direction, mediaType }),
        });

        const data = await res.json();

        if (data.match) {
          onMatch(data.match);
          return;
        }

        if (data.thisPartnerDone) {
          if (data.sessionStatus === 'both_submitted' || data.sessionStatus === 'finished_no_match') {
            onRoundEnd(data.sessionStatus);
          } else {
            setWaitingForPartner(true);
          }
        }
      } catch {
        // Swipe failed silently — continue
      } finally {
        setSwiping(false);
      }
    },
    [sessionCode, partnerId, swiping, onMatch, onRoundEnd]
  );

  // Show waiting screen if partner is still swiping
  if (waitingForPartner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-5xl mb-6">🍿</div>
        <h2 className="text-xl font-bold text-fm-text mb-2 text-center">You're done!</h2>
        <p className="text-fm-muted text-sm text-center max-w-xs">
          Waiting for your partner to finish swiping…
        </p>
        <div className="dots-loader mt-8">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  // All cards swiped
  if (currentIndex >= pool.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-5xl mb-6">🎯</div>
        <h2 className="text-xl font-bold text-fm-text mb-2">All done!</h2>
        <p className="text-fm-muted text-sm text-center max-w-xs">
          Waiting to see if you matched…
        </p>
        <div className="dots-loader mt-8">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  const visibleCards = pool.slice(currentIndex, currentIndex + 3);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <p className="text-fm-dim text-xs font-medium">
            Partner {partner} · Round {round}
          </p>
          <p className="text-fm-muted text-sm font-semibold mt-0.5">
            {remaining} left to swipe
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold gradient-text">FM</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-4">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--primary), var(--accent))',
            }}
          />
        </div>
      </div>

      {/* Hint */}
      {currentIndex === 0 && (
        <div className="text-center mb-2 animate-fade-in">
          <p className="text-fm-dim text-xs">← Swipe or tap Pass / Like →</p>
        </div>
      )}

      {/* Card stack */}
      <div
        className="flex-1 relative"
        style={{ minHeight: '520px' }}
      >
        <div className="absolute inset-0 flex items-start justify-center pt-2 px-4">
          <div className="relative w-full" style={{ maxWidth: '340px', height: '520px' }}>
            {[...visibleCards].reverse().map((title, reversedIdx) => {
              const stackPosition = visibleCards.length - 1 - reversedIdx;
              return (
                <SwipeCard
                  key={`${title.tmdb_id}-${round}`}
                  title={title}
                  isTop={stackPosition === 0}
                  stackPosition={stackPosition}
                  onSwipe={handleSwipe}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Swipe hint icons */}
      <div className="flex justify-between px-8 pb-6 pt-2 opacity-30">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">👈</span>
          <span className="text-xs" style={{ color: 'var(--nope)' }}>Pass</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">👉</span>
          <span className="text-xs" style={{ color: 'var(--like)' }}>Like</span>
        </div>
      </div>
    </div>
  );
}
