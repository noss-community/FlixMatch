'use client';

import { useEffect, useState } from 'react';

const MESSAGES = [
  'Claude is reading both your tastes…',
  'Finding titles you\'ll both love…',
  'Cross-referencing your vibes…',
  'Checking what\'s worth your time…',
  'Building your personalised deck…',
];

interface Props {
  sessionCode: string;
  partnerId: string;
  round: number;
  onPoolReady: () => void;
  onError: (msg: string) => void;
}

export default function GeneratingPool({ sessionCode, partnerId, round, onPoolReady, onError }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [triggered, setTriggered] = useState(false);

  // Cycle loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Trigger pool generation
  useEffect(() => {
    if (triggered) return;
    setTriggered(true);

    const generate = async () => {
      try {
        const res = await fetch(`/api/session/${sessionCode}/pool`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partnerId }),
        });

        if (res.ok) {
          onPoolReady();
        } else {
          const data = await res.json();
          onError(data.error || 'Failed to generate pool');
        }
      } catch {
        onError('Network error. Please try again.');
      }
    };

    generate();
  }, [sessionCode, partnerId, round, triggered, onPoolReady, onError]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at center, #1a0533 0%, #090912 70%)' }}
    >
      {/* Animated film reel */}
      <div className="relative mb-10">
        <div className="text-7xl animate-spin-slow">🎬</div>
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, #8b5cf6, transparent)',
            filter: 'blur(20px)',
          }}
        />
      </div>

      {/* Message */}
      <div className="text-center max-w-xs">
        <h2 className="text-xl font-bold text-fm-text mb-3 transition-all duration-500">
          {MESSAGES[messageIndex]}
        </h2>
        <p className="text-fm-dim text-sm">
          This takes a few seconds. Good things take time.
        </p>
      </div>

      {/* Loader dots */}
      <div className="dots-loader mt-8">
        <span /><span /><span />
      </div>

      {/* Decorative */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-full"
            style={{
              height: `${8 + Math.random() * 24}px`,
              background: 'var(--primary)',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
