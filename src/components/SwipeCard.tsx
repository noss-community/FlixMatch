'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Title } from '@/types';
import { getPosterUrl, formatRuntime, truncate } from '@/lib/utils';

interface Props {
  title: Title;
  isTop: boolean;
  stackPosition: number; // 0 = top, 1 = behind, 2 = further behind
  onSwipe: (direction: 'left' | 'right', tmdbId: number, mediaType: string) => void;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeCard({ title, isTop, stackPosition, onSwipe }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-20, 20]);
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const cardOpacity = useTransform(x, [-300, 0, 300], [0.6, 1, 0.6]);

  const isAnimating = useRef(false);

  const triggerSwipe = async (direction: 'left' | 'right') => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    const targetX = direction === 'right' ? 1000 : -1000;
    await animate(x, targetX, { duration: 0.35, ease: 'easeIn' });
    onSwipe(direction, title.tmdb_id, title.media_type);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    if (offset > SWIPE_THRESHOLD) {
      triggerSwipe('right');
    } else if (offset < -SWIPE_THRESHOLD) {
      triggerSwipe('left');
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
      isAnimating.current = false;
    }
  };

  // Stack visual offset
  const stackOffset = stackPosition * 8;
  const stackScale = 1 - stackPosition * 0.05;

  const posterUrl = title.poster_url
    ? `https://image.tmdb.org${title.poster_url}`
    : null;

  return (
    <motion.div
      className="absolute swipe-card no-select"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? cardOpacity : 1,
        scale: stackScale,
        y: stackOffset,
        zIndex: 10 - stackPosition,
        width: '100%',
        maxWidth: '340px',
        left: '50%',
        translateX: '-50%',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <div
        className="rounded-2xl overflow-hidden card-shadow"
        style={{
          background: 'var(--card)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Poster */}
        <div className="relative" style={{ height: '360px', background: 'var(--surface)' }}>
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt={title.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl opacity-20">🎬</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(26,26,46,1) 0%, rgba(26,26,46,0.3) 40%, transparent 70%)',
            }}
          />

          {/* Media type badge */}
          <div
            className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: title.media_type === 'tv' ? '#a78bfa' : '#94a3b8',
              backdropFilter: 'blur(8px)',
            }}
          >
            {title.media_type === 'tv' ? 'Series' : 'Movie'}
          </div>

          {/* LIKE overlay */}
          {isTop && (
            <motion.div
              className="absolute inset-0 flex items-center justify-start pl-6 pt-10"
              style={{ opacity: likeOpacity }}
            >
              <div
                className="px-4 py-2 rounded-xl border-2 font-bold text-2xl rotate-[-15deg]"
                style={{ borderColor: 'var(--like)', color: 'var(--like)' }}
              >
                LIKE
              </div>
            </motion.div>
          )}

          {/* NOPE overlay */}
          {isTop && (
            <motion.div
              className="absolute inset-0 flex items-center justify-end pr-6 pt-10"
              style={{ opacity: nopeOpacity }}
            >
              <div
                className="px-4 py-2 rounded-xl border-2 font-bold text-2xl rotate-[15deg]"
                style={{ borderColor: 'var(--nope)', color: 'var(--nope)' }}
              >
                NOPE
              </div>
            </motion.div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-fm-text font-bold text-lg leading-tight flex-1">
              {title.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-fm-muted text-sm font-medium">
                {title.tmdb_rating?.toFixed(1) || '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-fm-dim text-xs mb-3">
            {title.year && <span>{title.year}</span>}
            {title.year && title.runtime && <span>·</span>}
            {title.runtime && <span>{formatRuntime(title.runtime)}</span>}
            {title.genres?.[0] && (
              <>
                <span>·</span>
                <span>{title.genres[0]}</span>
              </>
            )}
          </div>

          <p className="text-fm-muted text-sm leading-relaxed">
            {truncate(title.synopsis, 120)}
          </p>
        </div>
      </div>

      {/* Button row — only for top card */}
      {isTop && (
        <div className="flex gap-4 mt-4 px-2">
          <button
            onClick={() => triggerSwipe('left')}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
            }}
          >
            ✕ Pass
          </button>
          <button
            onClick={() => triggerSwipe('right')}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1.5px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e',
            }}
          >
            ♥ Like
          </button>
        </div>
      )}
    </motion.div>
  );
}
