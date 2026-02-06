'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { secureFetch } from '@/lib/api';

export default function SubmitConferencePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    startDate: '',
    endDate: '',
    city: '',
    country: '',
    online: false,
    domain: 'general',
    cfpUrl: '',
    cfpEndDate: '',
    hasFinancialAid: false,
    description: '',
    tags: '',
    organizerName: '',
    organizerEmail: '',
    submissionType: 'new',
    additionalNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await secureFetch('/api/submit-conference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Conference submitted successfully!');
        router.push('/');
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch {
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Submit a Conference</h1>
        <p className="text-zinc-400 mb-8">Help us grow our database by submitting tech conferences.</p>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Conference Name *</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Website URL *</label>
              <input
                required
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Start Date *</label>
              <input
                required
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">City *</label>
              <input
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Country *</label>
              <input
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Domain *</label>
            <select
              required
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="general">General</option>
              <option value="ai">AI & ML</option>
              <option value="web">Web Development</option>
              <option value="security">Security</option>
              <option value="devops">DevOps</option>
              <option value="cloud">Cloud & Infrastructure</option>
              <option value="data">Data Engineering</option>
              <option value="mobile">Mobile Development</option>
              <option value="opensource">Open Source</option>
              <option value="academic">Academic</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="online"
              checked={formData.online}
              onChange={(e) => setFormData({ ...formData, online: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="online" className="text-white">Online/Virtual Event</label>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-lg font-semibold text-white mb-3">CFP Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">CFP URL</label>
                <input
                  type="url"
                  value={formData.cfpUrl}
                  onChange={(e) => setFormData({ ...formData, cfpUrl: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">CFP End Date</label>
                <input
                  type="date"
                  value={formData.cfpEndDate}
                  onChange={(e) => setFormData({ ...formData, cfpEndDate: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-lg font-semibold text-white mb-3">Organizer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Your Name *</label>
                <input
                  required
                  value={formData.organizerName}
                  onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Your Email *</label>
                <input
                  required
                  type="email"
                  value={formData.organizerEmail}
                  onChange={(e) => setFormData({ ...formData, organizerEmail: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Tags (comma separated)</label>
            <input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="react, python, cloud"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-3"
          >
            {submitting ? 'Submitting...' : 'Submit Conference'}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}