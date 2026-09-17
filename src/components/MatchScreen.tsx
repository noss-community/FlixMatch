'use client';

import { useEffect, useRef, useState } from 'react';
import { MatchedTitle, OttPlatform, OTT_COLORS } from '@/types';
import { formatRuntime, getPosterUrl } from '@/lib/utils';

interface Props {
  match: MatchedTitle;
  sessionCode: string;
  partnerId: string;
}

export default function MatchScreen({ match, sessionCode, partnerId }: Props) {
  const [platforms, setPlatforms] = useState<OttPlatform[] | null>(null);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);
  const confettiLoaded = useRef(false);

  // Fire confetti
  useEffect(() => {
    if (confettiLoaded.current) return;
    confettiLoaded.current = true;

    import('canvas-confetti').then(({ default: confetti }) => {
      const end = Date.now() + 3000;
      const colors = ['#8b5cf6', '#f43f5e', '#a78bfa', '#fbbf24', '#22c55e'];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
          zIndex: 9999,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
          zIndex: 9999,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });
  }, []);

  // Fetch OTT platforms
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(
          `/api/ott/${match.tmdb_id}?type=${match.media_type}`
        );
        const data = await res.json();
        setPlatforms(data.platforms || []);
      } catch {
        setPlatforms([]);
      }
    };
    fetch_();
  }, [match.tmdb_id, match.media_type]);

  const handleRate = async (stars: number) => {
    setRating(stars);
    setRated(true);
    await fetch(`/api/session/${sessionCode}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId, rating: stars }),
    });
  };

  const posterUrl = match.poster_url
    ? `https://image.tmdb.org${match.poster_url}`
    : null;

  const backdropUrl = match.backdrop_url
    ? `https://image.tmdb.org${match.backdrop_url}`
    : null;

  return (
    <div
      className="min-h-screen flex flex-col overflow-y-auto"
      style={{ background: 'var(--bg)' }}
    >
      {/* Backdrop hero */}
      <div className="relative" style={{ height: '55vh', minHeight: '300px' }}>
        {backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--card)' }} />
        )}

        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(9,9,18,0.3) 0%, rgba(9,9,18,0.9) 70%, rgba(9,9,18,1) 100%)',
          }}
        />

        {/* Match badge */}
        <div className="absolute top-6 left-0 right-0 flex justify-center animate-bounce-slow">
          <div
            className="px-5 py-2 rounded-full font-bold text-sm tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #f43f5e)',
              color: 'white',
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
            }}
          >
            🎉 It's a Match!
          </div>
        </div>

        {/* Poster + title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex gap-4 items-end">
          {posterUrl && (
            <div
              className="rounded-xl overflow-hidden shrink-0 card-shadow"
              style={{ width: '80px', height: '120px' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt={match.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-fm-text font-extrabold text-2xl leading-tight mb-1 line-clamp-2">
              {match.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              {match.year && (
                <span className="text-fm-muted text-sm">{match.year}</span>
              )}
              {match.tmdb_rating && (
                <span className="flex items-center gap-1 text-sm">
                  <span className="text-yellow-400">★</span>
                  <span className="text-fm-muted">{match.tmdb_rating.toFixed(1)}</span>
                </span>
              )}
              {match.runtime && (
                <span className="text-fm-muted text-sm">{formatRuntime(match.runtime)}</span>
              )}
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--muted)' }}
              >
                {match.media_type === 'tv' ? 'Series' : 'Movie'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-5 flex flex-col gap-5">
        {/* Genres */}
        {match.genres?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {match.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'var(--primary-light)',
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Synopsis */}
        {match.synopsis && (
          <p className="text-fm-muted text-sm leading-relaxed">{match.synopsis}</p>
        )}

        {/* OTT Platforms */}
        <div>
          <h3 className="text-fm-text font-semibold mb-3 flex items-center gap-2">
            <span>Watch in India</span>
            {platforms === null && (
              <span className="dots-loader" style={{ transform: 'scale(0.7)' }}>
                <span /><span /><span />
              </span>
            )}
          </h3>

          {platforms === null ? null : platforms.length > 0 ? (
            <div className="flex flex-col gap-2">
              {platforms.map((p) => (
                <a
                  key={p.service}
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-white transition-all active:scale-95"
                  style={{
                    background: OTT_COLORS[p.service] || '#333',
                    boxShadow: `0 4px 15px ${OTT_COLORS[p.service] || '#333'}40`,
                  }}
                >
                  <span className="flex-1">{p.displayName}</span>
                  <span className="text-xs opacity-70 capitalize">{p.streamingType}</span>
                  <span>→</span>
                </a>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-fm-muted text-sm mb-3">
                Check availability on major platforms:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Netflix', 'Prime Video', 'Hotstar', 'ZEE5', 'SonyLIV', 'JioCinema'].map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      color: 'var(--muted)',
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Post-watch rating */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {rated ? (
            <div className="animate-fade-in">
              <div className="text-3xl mb-2">
                {rating >= 4 ? '🥰' : rating >= 3 ? '😊' : '😐'}
              </div>
              <p className="text-fm-muted text-sm">Thanks for rating!</p>
              <p className="text-fm-dim text-xs mt-1">We'll use this to improve your matches.</p>
            </div>
          ) : (
            <>
              <p className="text-fm-text font-semibold mb-1">Did you enjoy it?</p>
              <p className="text-fm-dim text-xs mb-4">Rate after watching to improve future matches</p>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    className="star text-3xl"
                    style={{ color: star <= rating ? '#fbbf24' : 'var(--border)' }}
                    onMouseEnter={() => setRating(star)}
                    onMouseLeave={() => setRating(0)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
