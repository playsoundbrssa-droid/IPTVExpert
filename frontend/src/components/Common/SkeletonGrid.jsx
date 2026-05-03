import React from 'react';

export default function SkeletonGrid({ count = 12 }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex flex-col h-full bg-white/5 rounded-2xl overflow-hidden border border-white/5 animate-pulse">
                    <div className="aspect-[2/3] bg-white/5 skeleton" />
                    <div className="p-4 space-y-3">
                        <div className="h-4 bg-white/10 rounded w-3/4 skeleton" />
                        <div className="h-3 bg-white/5 rounded w-1/2 skeleton" />
                    </div>
                </div>
            ))}
        </div>
    );
}
