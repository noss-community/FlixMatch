'use client';

import QRCodeShare from './QRCodeShare';

interface Props {
  sessionCode: string;
  partnerLabel: 'A' | 'B';
  waitingFor: 'to_join' | 'to_submit';
}

export default function WaitingForPartner({ sessionCode, partnerLabel, waitingFor }: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const sessionUrl = `${appUrl}/session/${sessionCode}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="text-4xl mb-3">
          {waitingFor === 'to_join' ? '📲' : '⏳'}
        </div>
        <h2 className="text-xl font-bold text-fm-text mb-2">
          {waitingFor === 'to_join'
            ? 'Share this with your partner'
            : 'Waiting for your partner…'}
        </h2>
        <p className="text-fm-muted text-sm max-w-xs mx-auto">
          {waitingFor === 'to_join'
            ? 'They scan the QR code or open the link to join your session.'
            : "Your partner is filling in their preferences. Hang tight — you'll both be swiping soon."}
        </p>
      </div>

      {waitingFor === 'to_join' ? (
        <div className="w-full max-w-xs animate-slide-up">
          <QRCodeShare sessionCode={sessionCode} sessionUrl={sessionUrl} />
        </div>
      ) : (
        <div className="animate-slide-up">
          {/* Pulsing indicator */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-full" style={{ background: 'var(--surface)' }}>
            <div className="relative flex h-3 w-3">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: 'var(--primary)' }}
              />
              <span
                className="relative inline-flex rounded-full h-3 w-3"
                style={{ background: 'var(--primary)' }}
              />
            </div>
            <span className="text-fm-muted text-sm">Partner is filling their form…</span>
          </div>

          {/* Share link again, in case they need it */}
          <div className="mt-8 text-center">
            <p className="text-fm-dim text-xs mb-3">Need to share the link again?</p>
            <div className="inline-block">
              <QRCodeShare sessionCode={sessionCode} sessionUrl={sessionUrl} />
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-fm-dim text-xs animate-fade-in">
        Partner {partnerLabel} · This page updates automatically
      </p>
    </div>
  );
}
