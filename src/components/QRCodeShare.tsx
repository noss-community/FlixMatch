'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  sessionCode: string;
  sessionUrl: string;
}

export default function QRCodeShare({ sessionCode, sessionUrl }: Props) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = sessionUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareQR = async () => {
    const canvas = qrRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const file = new File([blob], 'flixmatch-qr.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Join me on FlixMatch!',
          text: `Scan this QR code or open: ${sessionUrl}`,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'Join me on FlixMatch!',
          text: `Let's find something to watch tonight!`,
          url: sessionUrl,
        });
      } else {
        // Download QR
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flixmatch-qr.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setShareError(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* QR code */}
      <div
        className="p-4 rounded-2xl"
        style={{ background: '#fff' }}
      >
        <QRCodeCanvas
          ref={qrRef}
          value={sessionUrl}
          size={180}
          level="M"
          includeMargin={false}
          fgColor="#090912"
          bgColor="#ffffff"
        />
      </div>

      {/* Session code */}
      <div className="text-center">
        <p className="text-fm-dim text-xs mb-1">Session code</p>
        <p
          className="text-2xl font-bold tracking-[0.3em] text-fm-primary-light font-mono"
        >
          {sessionCode}
        </p>
      </div>

      {/* Share link */}
      <div
        className="w-full max-w-xs rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--surface)', border: '1.5px solid var(--border)' }}
      >
        <span className="text-fm-dim text-sm truncate flex-1" style={{ fontSize: '0.8rem' }}>
          {sessionUrl}
        </span>
        <button
          onClick={handleCopyLink}
          className="text-xs font-semibold shrink-0 transition-colors"
          style={{ color: copied ? 'var(--like)' : 'var(--primary-light)' }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Share button */}
      <button
        onClick={handleShareQR}
        className="btn-primary w-full max-w-xs py-3 text-sm text-white font-semibold"
      >
        📤 Share with your partner
      </button>

      {shareError && (
        <p className="text-fm-dim text-xs text-center">
          Sharing not available — use the link above
        </p>
      )}
    </div>
  );
}
