'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePartnerId } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/session/create', { method: 'POST' });
      const data = await res.json();
      savePartnerId(data.sessionCode, data.partnerId);
      router.push(`/session/${data.sessionCode}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at top, #1a0533 0%, #090912 60%)' }}
    >
      {/* Logo */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-4xl">🎬</span>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">FlixMatch</h1>
        </div>
        <p className="text-fm-dim text-sm font-medium tracking-widest uppercase">
          For couples who can't agree
        </p>
      </div>

      {/* Hero */}
      <div className="text-center max-w-sm mb-12 animate-slide-up">
        <h2 className="text-4xl font-extrabold text-fm-text leading-tight mb-4">
          Finally watch something
          <span className="gradient-text block">you'll both love.</span>
        </h2>
        <p className="text-fm-muted text-base leading-relaxed">
          Stop scrolling. Stop negotiating. Tell us what you're in the mood for,
          swipe together, and we'll find the perfect match — with exactly where
          to watch it in India.
        </p>
      </div>

      {/* How it works */}
      <div className="flex gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {[
          { icon: '🎭', text: 'Share your mood' },
          { icon: '👆', text: 'Swipe together' },
          { icon: '🎉', text: 'Watch tonight' },
        ].map((step) => (
          <div key={step.text} className="text-center">
            <div className="text-2xl mb-1">{step.icon}</div>
            <p className="text-fm-dim text-xs font-medium">{step.text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleStart}
        disabled={loading}
        className="btn-primary w-full max-w-xs py-4 text-base text-white rounded-2xl font-semibold animate-slide-up"
        style={{ animationDelay: '0.15s' }}
      >
        {loading ? (
          <span className="dots-loader">
            <span /><span /><span />
          </span>
        ) : (
          'Start Matching'
        )}
      </button>

      <p className="mt-4 text-fm-dim text-xs text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
        No sign-up needed · Share a QR code · Works on any phone
      </p>

      {/* Decorative orbs */}
      <div
        className="fixed -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}
      />
      <div
        className="fixed -bottom-24 -left-24 w-64 h-64 rounded-full pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #f43f5e, transparent)' }}
      />
    </div>
  );
}
