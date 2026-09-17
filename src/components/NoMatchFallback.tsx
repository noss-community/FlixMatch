'use client';

import { useEffect, useState } from 'react';
import { TopTitle } from '@/types';
import { formatRuntime, getPosterUrl } from '@/lib/utils';
import { MatchedTitle } from '@/types';

interface Props {
  sessionCode: string;
  partnerId: string;
  onPick: (title: MatchedTitle) => void;
}

export default function NoMatchFallback({ sessionCode, partnerId, onPick }: Props) {
  const [topTitles, setTopTitles] = useState<TopTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const res = await fetch(`/api/session/${sessionCode}/top5?partnerId=${partnerId}`);
        const data = await res.json();
        setTopTitles(data.titles || []);
      } catch {
        setTopTitles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTop();
  }, [sessionCode, partnerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="dots-loader"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-5xl mb-3">🤔</div>
          <h2 className="text-xl font-bold text-fm-text mb-2">No automatic match</h2>
          <p className="text-fm-muted text-sm max-w-xs mx-auto">
            You both liked these the most. Decide together — it's time to compromise just a little.
          </p>
        </div>

        {/* Top 5 */}
        <div className="flex flex-col gap-3 animate-slide-up">
          {topTitles.length > 0 ? (
            topTitles.map((title, i) => {
              const posterUrl = title.poster_url
                ? `https://image.tmdb.org${title.poster_url}`
                : null;

              return (
                <button
                  key={title.tmdb_id}
                  onClick={() =>
                    onPick({
                      ...title,
                      ott_platforms: undefined,
                    })
                  }
                  className="w-full text-left rounded-2xl overflow-hidden flex gap-0 transition-all active:scale-98"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Rank */}
                  <div
                    className="flex items-center justify-center w-12 shrink-0 font-extrabold text-lg"
                    style={{
                      background: i === 0
                        ? 'linear-gradient(135deg, #8b5cf6, #f43f5e)'
                        : 'var(--surface)',
                      color: i === 0 ? 'white' : 'var(--dim)',
                    }}
                  >
                    #{i + 1}
                  </div>

                  {/* Poster */}
                  <div className="shrink-0" style={{ width: '64px', height: '96px' }}>
                    {posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                        <span className="text-2xl opacity-30">🎬</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 min-w-0">
                    <p className="text-fm-text font-semibold text-sm leading-tight mb-1 line-clamp-1">
                      {title.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-fm-dim mb-1">
                      {title.year && <span>{title.year}</span>}
                      {title.runtime && (
                        <>
                          <span>·</span>
                          <span>{formatRuntime(title.runtime)}</span>
                        </>
                      )}
                      {title.tmdb_rating && (
                        <>
                          <span>·</span>
                          <span className="text-yellow-400">★ {title.tmdb_rating.toFixed(1)}</span>
                        </>
                      )}
                    </div>
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: 'var(--primary-light)',
                      }}
                    >
                      ♥ {title.combined_likes} combined likes
                    </div>
                  </div>

                  <div className="flex items-center pr-3 text-fm-dim text-lg">›</div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-fm-muted text-sm">No titles to show.</p>
            </div>
          )}
        </div>

        <p className="text-center text-fm-dim text-xs mt-6">
          Tap any title to select it as tonight's watch
        </p>
      </div>
    </div>
  );
}
