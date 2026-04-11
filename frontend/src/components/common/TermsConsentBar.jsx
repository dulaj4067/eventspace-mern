import { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog.jsx';
import { TERMS_TITLE, TERMS_SECTIONS, TERMS_VERSION } from '../../content/termsOfService.js';

const STORAGE_KEY = `eventspace_terms_v${TERMS_VERSION}`;

export function getTermsAcceptance() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setTermsAcceptance(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event('terms-updated'));
  } catch {
    /* ignore */
  }
}

export function hasAcceptedTerms() {
  return getTermsAcceptance() === 'accepted';
}

export function TermsConsentBar() {
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const syncVisibility = useCallback(() => {
    if (!isAuthenticated) {
      setVisible(false);
      return;
    }
    const v = getTermsAcceptance();
    setVisible(v !== 'accepted' && v !== 'declined');
  }, [isAuthenticated]);

  useEffect(() => {
    syncVisibility();
  }, [syncVisibility]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) syncVisibility();
    };
    const onLocalUpdate = () => syncVisibility();
    window.addEventListener('storage', onStorage);
    window.addEventListener('terms-updated', onLocalUpdate);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('terms-updated', onLocalUpdate);
    };
  }, [syncVisibility]);

  const handleAllow = () => {
    setTermsAcceptance('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    setTermsAcceptance('declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 pointer-events-none"
        role="region"
        aria-label="Terms of service consent"
      >
        <div className="pointer-events-auto max-w-4xl mx-auto rounded-xl border border-white/20 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-purple-900/30 px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium">
              Welcome! Please review our Terms of Service to continue using EventSpace fully.
            </p>
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-100 hover:text-white underline underline-offset-2 decoration-white/50 hover:decoration-white transition-colors"
            >
              <FileText className="size-4 shrink-0" />
              Read terms &amp; conditions
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="bg-white/95 text-purple-900 hover:bg-white"
              onClick={handleAllow}
            >
              Allow
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/50 text-white bg-white/10 hover:bg-white/20"
              onClick={handleDecline}
            >
              Decline
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg border-purple-100">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {TERMS_TITLE}
            </DialogTitle>
            <DialogDescription className="text-left text-slate-600">
              Last updated for your session (version {TERMS_VERSION}). Please read carefully before
              accepting or declining the banner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-slate-700 pr-1">
            {TERMS_SECTIONS.map((section) => (
              <section key={section.heading}>
                <h3 className="font-semibold text-slate-900 mb-1">{section.heading}</h3>
                <p className="leading-relaxed whitespace-pre-wrap">{section.body}</p>
              </section>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setTermsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
