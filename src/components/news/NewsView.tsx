import React from 'react';
import { Newspaper, Calendar, Shield, Award, Tag } from 'lucide-react';
import { NewsArticle } from '../../types/cricket';

interface NewsViewProps {
  news: NewsArticle[];
}

export const NewsView: React.FC<NewsViewProps> = ({ news }) => {
  return (
    <div className="space-y-4 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#121824] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-emerald-400" />
            International Cricket News Centre
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Breaking dispatches, official press briefings, squad drops, and post-match tournament analyses.
          </p>
        </div>

        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded border border-emerald-800/40 font-bold">
          LIVE WIRE DISPATCH
        </span>
      </div>

      {/* News Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map((item, index) => {
          const isLead = index === 0;

          return (
            <article
              key={item.id}
              className={`bg-[#121824] border border-[#1f293d] hover:border-[#2f3f5a] rounded-lg p-5 transition flex flex-col justify-between ${
                isLead ? 'md:col-span-2 bg-[#131d2c] border-emerald-900/60' : ''
              }`}
            >
              <div>
                <div className="flex items-center space-x-2 text-xs mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#182234] text-emerald-400 border border-[#243247]">
                    {item.category.replace('_', ' ')}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 font-mono text-[11px]">{item.timestamp}</span>
                </div>

                <h3 className={`font-bold text-white leading-snug ${isLead ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
                  {item.title}
                </h3>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1f293d] flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>ICC Press Service</span>
                <span className="text-emerald-400 font-medium">Verified Dispatch</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
