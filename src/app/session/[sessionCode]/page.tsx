'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Session, Title, MatchedTitle, SessionStatus } from '@/types';
import { loadPartnerId, savePartnerId } from '@/lib/utils';

import PreferenceForm from '@/components/PreferenceForm';
import WaitingForPartner from '@/components/WaitingForPartner';
import GeneratingPool from '@/components/GeneratingPool';
import SwipeInterface from '@/components/SwipeInterface';
import MatchScreen from '@/components/MatchScreen';
import NoMatchFallback from '@/components/NoMatchFallback';

type UiState =
  | 'loading'
  | 'error'
  | 'not_found'
  | 'full' // session already has 2 partners and this is a 3rd visitor
  | 'preference_form'
  | 'waiting_for_partner_join' // Partner A submitted, Partner B not joined yet
  | 'waiting_for_partner_submit' // this partner submitted, other hasn't
  | 'generating_pool'
  | 'swiping'
  | 'match'
  | 'no_match_fallback';

export default function SessionPage() {
  const params = useParams<{ sessionCode: string }>();
  const sessionCode = params.sessionCode?.toUpperCase();

  const [uiState, setUiState] = useState<UiState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partner, setPartner] = useState<'A' | 'B' | null>(null);
  const [pool, setPool] = useState<Title[]>([]);
  const [match, setMatch] = useState<MatchedTitle | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const poolFetchedRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
  };

  const fetchPool = useCallback(async (sess: Session, pid: string, pt: 'A' | 'B') => {
    if (poolFetchedRef.current) return;
    const res = await fetch(`/api/session/${sessionCode}/pool?partner=${pt}&round=${sess.round}`);
    if (res.ok) {
      const data = await res.json();
      if (data.pool?.length > 0) {
        poolFetchedRef.current = true;
        setPool(data.pool);
        setUiState('swiping');
      }
    }
  }, [sessionCode]);

  const determineUiState = useCallback(
    async (sess: Session, pid: string, pt: 'A' | 'B') => {
      const mySubmitted = pt === 'A' ? sess.partner_a_submitted : sess.partner_b_submitted;
      const partnerSubmitted = pt === 'A' ? sess.partner_b_submitted : sess.partner_a_submitted;
      const partnerJoined = !!sess.partner_b_id;

      switch (sess.status) {
        case 'waiting':
          if (!mySubmitted) {
            setUiState('preference_form');
          } else if (pt === 'A' && !partnerJoined) {
            setUiState('waiting_for_partner_join');
          } else if (!partnerSubmitted) {
            setUiState('waiting_for_partner_submit');
          }
          break;

        case 'both_submitted':
          if (!mySubmitted) {
            setUiState('preference_form');
          } else {
            setUiState('generating_pool');
          }
          break;

        case 'generating_pool':
          setUiState('generating_pool');
          break;

        case 'swiping':
          if (pool.length === 0 && !poolFetchedRef.current) {
            await fetchPool(sess, pid, pt);
          } else if (pool.length > 0) {
            setUiState('swiping');
          }
          break;

        case 'matched': {
          // Fetch match details if not already set
          if (!match) {
            const res = await fetch(`/api/session/${sessionCode}/match`);
            if (res.ok) {
              const data = await res.json();
              if (data.match) {
                setMatch(data.match);
                setUiState('match');
                stopPolling();
              }
            }
          } else {
            setUiState('match');
            stopPolling();
          }
          break;
        }

        case 'finished_no_match':
          setUiState('no_match_fallback');
          stopPolling();
          break;
      }
    },
    [pool.length, match, sessionCode, fetchPool]
  );

  const pollSession = useCallback(async () => {
    if (!sessionCode || !partnerId || !partner) return;

    try {
      const res = await fetch(`/api/session/${sessionCode}`);
      if (!res.ok) return;
      const data = await res.json();
      const sess: Session = data.session;
      setSession(sess);
      await determineUiState(sess, partnerId, partner);
    } catch {
      // Network hiccup — keep polling
    }
  }, [sessionCode, partnerId, partner, determineUiState]);

  // Initial session setup
  useEffect(() => {
    if (!sessionCode) return;

    const init = async () => {
      // Check localStorage for existing partner ID
      const existingPid = loadPartnerId(sessionCode);

      // Fetch session
      const res = await fetch(`/api/session/${sessionCode}`);
      if (!res.ok) {
        setUiState(res.status === 404 ? 'not_found' : 'error');
        return;
      }
      const data = await res.json();
      const sess: Session = data.session;
      setSession(sess);

      let pid: string;
      let pt: 'A' | 'B';

      if (existingPid) {
        // Returning visitor — determine their role
        if (sess.partner_a_id === existingPid) {
          pid = existingPid;
          pt = 'A';
        } else if (sess.partner_b_id === existingPid) {
          pid = existingPid;
          pt = 'B';
        } else {
          // PID doesn't match either partner — might be stale. Treat as new visitor.
          pid = existingPid;
          pt = 'B'; // Fallback — will be caught if partner B already exists
        }
      } else {
        // New visitor
        if (!sess.partner_b_id) {
          // Become Partner B
          const joinRes = await fetch(`/api/session/${sessionCode}/join`, { method: 'POST' });
          if (joinRes.status === 409) {
            // Race condition — session was just filled
            setUiState('full');
            return;
          }
          if (!joinRes.ok) {
            setUiState('error');
            return;
          }
          const joinData = await joinRes.json();
          pid = joinData.partnerId;
          pt = 'B';
          savePartnerId(sessionCode, pid);
        } else {
          // Both slots taken and no existing PID — spectator mode isn't supported
          setUiState('full');
          return;
        }
      }

      setPartnerId(pid);
      setPartner(pt);

      await determineUiState(sess, pid, pt);
    };

    init().catch(() => setUiState('error'));
  }, [sessionCode, determineUiState]);

  // Start/stop polling based on UI state
  useEffect(() => {
    const pollingStates: UiState[] = [
      'waiting_for_partner_join',
      'waiting_for_partner_submit',
      'generating_pool',
      'swiping',
    ];

    if (uiState === 'match' || uiState === 'no_match_fallback') {
      stopPolling();
      return;
    }

    if (pollingStates.includes(uiState) && partnerId && partner) {
      stopPolling();
      pollingRef.current = setInterval(pollSession, 2500);
    }

    return () => stopPolling();
  }, [uiState, partnerId, partner, pollSession]);

  // Clean up on unmount
  useEffect(() => () => stopPolling(), []);

  // ─── Render ───────────────────────────────────────────────────────────

  if (uiState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="dots-loader"><span /><span /><span /></div>
      </div>
    );
  }

  if (uiState === 'not_found') {
    return (
      <Centered>
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-fm-text mb-2">Session not found</h2>
        <p className="text-fm-muted text-sm text-center mb-6">
          This link may have expired or the session code is incorrect.
        </p>
        <a href="/" className="btn-primary px-6 py-3 text-sm text-white">
          Start a new session
        </a>
      </Centered>
    );
  }

  if (uiState === 'full') {
    return (
      <Centered>
        <div className="text-5xl mb-4">👥</div>
        <h2 className="text-xl font-bold text-fm-text mb-2">Session is full</h2>
        <p className="text-fm-muted text-sm text-center mb-6">
          This session already has two partners.
        </p>
        <a href="/" className="btn-primary px-6 py-3 text-sm text-white">
          Start your own session
        </a>
      </Centered>
    );
  }

  if (uiState === 'error') {
    return (
      <Centered>
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-fm-text mb-2">Something went wrong</h2>
        <p className="text-fm-muted text-sm text-center mb-6">{errorMsg || 'Please try again.'}</p>
        <button onClick={() => window.location.reload()} className="btn-secondary px-6 py-3 text-sm">
          Try again
        </button>
      </Centered>
    );
  }

  if (uiState === 'preference_form' && partnerId && partner) {
    return (
      <PreferenceForm
        sessionCode={sessionCode}
        partnerId={partnerId}
        partnerLabel={partner}
        onSubmitted={() => {
          hasSubmittedRef.current = true;
          setUiState(session?.partner_b_id ? 'waiting_for_partner_submit' : 'waiting_for_partner_join');
        }}
      />
    );
  }

  if (uiState === 'waiting_for_partner_join' && partner) {
    return (
      <WaitingForPartner
        sessionCode={sessionCode}
        partnerLabel={partner}
        waitingFor="to_join"
      />
    );
  }

  if (uiState === 'waiting_for_partner_submit' && partner) {
    return (
      <WaitingForPartner
        sessionCode={sessionCode}
        partnerLabel={partner}
        waitingFor="to_submit"
      />
    );
  }

  if (uiState === 'generating_pool' && partnerId && partner) {
    return (
      <GeneratingPool
        sessionCode={sessionCode}
        partnerId={partnerId}
        round={session?.round || 1}
        onPoolReady={async () => {
          poolFetchedRef.current = false;
          if (session && partnerId && partner) {
            await fetchPool(session, partnerId, partner);
          }
        }}
        onError={(msg) => {
          setErrorMsg(msg);
          setUiState('error');
        }}
      />
    );
  }

  if (uiState === 'swiping' && partnerId && partner && pool.length > 0) {
    return (
      <SwipeInterface
        pool={pool}
        sessionCode={sessionCode}
        partnerId={partnerId}
        partner={partner}
        round={session?.round || 1}
        onMatch={(m) => {
          setMatch(m);
          setUiState('match');
          stopPolling();
        }}
        onRoundEnd={(status: SessionStatus) => {
          if (status === 'finished_no_match') {
            setUiState('no_match_fallback');
          } else if (status === 'both_submitted') {
            // Round 2 starts
            poolFetchedRef.current = false;
            setPool([]);
            setUiState('generating_pool');
          } else {
            // Waiting for partner to finish current round
            pollSession();
          }
        }}
      />
    );
  }

  if (uiState === 'match' && match && partnerId) {
    return (
      <MatchScreen
        match={match}
        sessionCode={sessionCode}
        partnerId={partnerId}
      />
    );
  }

  if (uiState === 'no_match_fallback' && partnerId) {
    return (
      <NoMatchFallback
        sessionCode={sessionCode}
        partnerId={partnerId}
        onPick={(title) => {
          setMatch(title);
          setUiState('match');
        }}
      />
    );
  }

  // Fallback loading
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="dots-loader"><span /><span /><span /></div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center">{children}</div>
    </div>
  );
}
