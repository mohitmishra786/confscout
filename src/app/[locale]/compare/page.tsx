'use client';
import { useCompare } from '@/context/CompareContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function ComparePage() {
  const { selectedConferences, removeFromCompare } = useCompare();

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Compare Conferences</h1>
        
        {selectedConferences.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>No conferences selected to compare.</p>
            <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded mt-4 inline-block transition-colors">
              Browse Conferences
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-zinc-800 text-zinc-500 w-32">Feature</th>
                  {selectedConferences.map(c => (
                    <th key={c.id} className="p-4 border-b border-zinc-800 min-w-[200px]">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-white font-bold text-lg">{c.name}</span>
                        <button 
                          onClick={() => removeFromCompare(c.id)} 
                          className="text-zinc-500 hover:text-red-400 text-xl leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                <tr>
                  <td className="p-4 border-b border-zinc-800 font-medium text-zinc-500">Date</td>
                  {selectedConferences.map(c => (
                    <td key={c.id} className="p-4 border-b border-zinc-800">
                      {c.startDate || 'TBD'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-b border-zinc-800 font-medium text-zinc-500">Location</td>
                  {selectedConferences.map(c => (
                    <td key={c.id} className="p-4 border-b border-zinc-800">
                      {c.location?.raw || (c.online ? 'Online' : 'TBD')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-b border-zinc-800 font-medium text-zinc-500">Domain</td>
                  {selectedConferences.map(c => (
                    <td key={c.id} className="p-4 border-b border-zinc-800 capitalize">
                      <span className="inline-block px-2 py-1 rounded-full bg-zinc-800 text-xs">
                        {c.domain}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-b border-zinc-800 font-medium text-zinc-500">Online</td>
                  {selectedConferences.map(c => (
                    <td key={c.id} className="p-4 border-b border-zinc-800">
                      {c.online ? 'Yes' : 'No'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 border-b border-zinc-800 font-medium text-zinc-500">CFP Status</td>
                  {selectedConferences.map(c => (
                    <td key={c.id} className="p-4 border-b border-zinc-800">
                      {c.cfp?.status === 'open' ? (
                        <span className="text-green-400 font-medium">Open ({c.cfp.daysRemaining} days left)</span>
                      ) : (
                        <span className="text-zinc-500">Closed</span>
                      )}
                    </td>
                  ))}
                </tr>
                 <tr>
                  <td className="p-4 border-b border-zinc-800 font-medium text-zinc-500">Website</td>
                  {selectedConferences.map(c => (
                    <td key={c.id} className="p-4 border-b border-zinc-800">
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                        Visit Website
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}