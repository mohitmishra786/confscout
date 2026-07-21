'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Conference } from '@/types/conference';
import { useModalA11y } from '@/hooks/useModalA11y';

interface VisaModalProps {
  isOpen: boolean;
  onClose: () => void;
  conference: Conference;
}

/**
 * VisaModal Component
 * 
 * Renders a modal using React Portal to ensure it displays correctly above all other elements.
 */
export default function VisaModal({ isOpen, onClose, conference }: VisaModalProps) {
  const [name, setName] = useState('');
  const [passport, setPassport] = useState('');
  const [reason, setReason] = useState('speaker'); // speaker | attendee
  const { mounted, dialogRef } = useModalA11y(isOpen, onClose);

  if (!isOpen || !mounted) return null;

  const generateEmail = () => {
    const subject = encodeURIComponent(`Visa Support Letter Request - ${conference.name}`);
    const body = encodeURIComponent(`Dear Organizers,

I am writing to request a visa invitation letter for ${conference.name}, which will take place in ${conference.location.raw} from ${conference.startDate} to ${conference.endDate}.

I intend to participate as a ${reason === 'speaker' ? 'Speaker' : 'Attendee'}.

Details for the letter:
Full Name: ${name || '[Your Full Name]'}
Passport Number: ${passport || '[Your Passport Number]'}

Please let me know if you need any further information.

Best regards,
${name || '[Your Name]'}`);

    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop — native button so click-to-close is keyboard-accessible */}
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      {/* Modal Card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visa-modal-title"
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative z-10"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 id="visa-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400" aria-hidden="true">🛂</span> Visa Support
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-white transition-colors p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Need a visa letter? Fill in your details below to generate a request email to the organizers of <span className="text-white font-medium">{conference.name}</span>.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="visa-name" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Full Name (as in Passport)
              </label>
              <input
                id="visa-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-[border-color,box-shadow] duration-150"
              />
            </div>

            <div>
              <label htmlFor="visa-passport" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Passport Number (Optional)
              </label>
              <input
                id="visa-passport"
                type="text"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                placeholder="A1234567"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-[border-color,box-shadow] duration-150"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Role
              </label>
              <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl" role="group" aria-label="Role">
                <button
                  type="button"
                  onClick={() => setReason('speaker')}
                  aria-pressed={reason === 'speaker'}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-[color,background-color] duration-150 ${reason === 'speaker' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Speaker
                </button>
                <button
                  type="button"
                  onClick={() => setReason('attendee')}
                  aria-pressed={reason === 'attendee'}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-[color,background-color] duration-150 ${reason === 'attendee' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Attendee
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex flex-col gap-3">
          <button
            type="button"
            onClick={generateEmail}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-[0.98] shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <span aria-hidden="true">📧</span> Send Request Email
          </button>
          <p className="text-[10px] text-center text-zinc-500 italic">
            * This will open your default email client. No data is stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}