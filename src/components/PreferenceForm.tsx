'use client';

import { useState } from 'react';
import { PartnerPreferences, MOOD_OPTIONS, LANGUAGE_OPTIONS, ERA_OPTIONS } from '@/types';

interface Props {
  sessionCode: string;
  partnerId: string;
  partnerLabel: 'A' | 'B';
  onSubmitted: () => void;
}

const IMDB_OPTIONS = [
  { value: 6, label: '6+', note: '' },
  { value: 7, label: '7+', note: '' },
  { value: 8, label: '8+', note: '' },
  { value: 9, label: '9+', note: 'very few titles' },
];

export default function PreferenceForm({ sessionCode, partnerId, partnerLabel, onSubmitted }: Props) {
  const [moods, setMoods] = useState<string[]>([]);
  const [moodDescription, setMoodDescription] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [contentType, setContentType] = useState<'movies_only' | 'include_series'>('movies_only');
  const [minImdb, setMinImdb] = useState(7);
  const [eras, setEras] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleMood = (val: string) => {
    setMoods((prev) =>
      prev.includes(val) ? prev.filter((m) => m !== val) : [...prev, val]
    );
  };

  const toggleLanguage = (val: string) => {
    if (val === 'any') {
      setLanguages(['any']);
    } else {
      setLanguages((prev) => {
        const without = prev.filter((l) => l !== 'any');
        return without.includes(val) ? without.filter((l) => l !== val) : [...without, val];
      });
    }
  };

  const toggleEra = (val: string) => {
    if (val === 'any') {
      setEras(['any']);
    } else {
      setEras((prev) => {
        const without = prev.filter((e) => e !== 'any');
        return without.includes(val) ? without.filter((e) => e !== val) : [...without, val];
      });
    }
  };

  const isValid = moods.length > 0 && languages.length > 0 && eras.length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Please fill in all sections');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const preferences: PartnerPreferences = {
        moods,
        moodDescription: moodDescription.trim() || undefined,
        languages,
        contentType,
        minImdb,
        eras,
      };

      const res = await fetch(`/api/session/${sessionCode}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, preferences }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      onSubmitted();
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <p className="text-fm-muted text-sm font-medium mb-1">Partner {partnerLabel}</p>
        <h1 className="text-2xl font-bold text-fm-text">What are you in the mood for?</h1>
        <p className="text-fm-dim text-sm mt-1">Your partner can't see your answers until you both submit.</p>
      </div>

      <div className="space-y-7">
        {/* Mood */}
        <Section title="Mood" subtitle="Select all that apply">
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleMood(opt.value)}
                className={`chip ${moods.includes(opt.value) ? 'chip-active' : 'chip-inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            className="fm-input mt-3"
            rows={2}
            placeholder="Describe what you're in the mood for tonight… (optional)"
            value={moodDescription}
            onChange={(e) => setMoodDescription(e.target.value)}
          />
        </Section>

        {/* Language */}
        <Section title="Language">
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleLanguage(opt.value)}
                className={`chip ${languages.includes(opt.value) ? 'chip-active' : 'chip-inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Content type */}
        <Section title="Content">
          <div className="flex gap-3">
            {[
              { value: 'movies_only', label: 'Movies only' },
              { value: 'include_series', label: 'Include series' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setContentType(opt.value as 'movies_only' | 'include_series')}
                className={`chip flex-1 justify-center ${contentType === opt.value ? 'chip-active' : 'chip-inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Min IMDb rating */}
        <Section title="Minimum Rating">
          <div className="flex gap-2">
            {IMDB_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMinImdb(opt.value)}
                className={`chip flex-1 justify-center flex-col items-center ${minImdb === opt.value ? 'chip-active' : 'chip-inactive'}`}
              >
                <span className="font-semibold">{opt.label}</span>
                {opt.note && (
                  <span className="text-xs opacity-60 mt-0.5">{opt.note}</span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* Era */}
        <Section title="Era" subtitle="Select all that apply">
          <div className="flex flex-wrap gap-2">
            {ERA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleEra(opt.value)}
                className={`chip ${eras.includes(opt.value) ? 'chip-active' : 'chip-inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Error */}
      {error && (
        <p className="text-fm-accent text-sm mt-4 text-center">{error}</p>
      )}

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-fm-bg via-fm-bg/90 to-transparent">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="btn-primary w-full py-4 text-base text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="dots-loader">
                <span /><span /><span />
              </span>
            ) : (
              "I'm ready →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up">
      <div className="mb-2">
        <h3 className="text-fm-text font-semibold">{title}</h3>
        {subtitle && <p className="text-fm-dim text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
