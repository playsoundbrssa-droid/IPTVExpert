import React from 'react';

export default function CategoryFilter({ groups, selectedGroup, onSelectGroup }) {
    const groupNames = Object.keys(groups || {})
        .filter(name => !name.includes('[MSEController]') && !name.includes('MediaSource'))
        .sort((a, b) => a.localeCompare(b));
    
    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar no-scrollbar py-2">
            <button
                onClick={() => onSelectGroup(null)}
                className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-sm font-black transition-all duration-300 ${
                    !selectedGroup 
                    ? 'bg-primary text-white shadow-[0_0_20px_rgba(108,92,231,0.4)] scale-105' 
                    : 'bg-[#151515] text-gray-400 hover:bg-white/5 hover:text-white border border-white/5'
                }`}
            >
                Todos
            </button>
            
            {groupNames.map(group => (
                <button
                    key={group}
                    onClick={() => onSelectGroup(group)}
                    className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-sm font-black transition-all duration-300 flex items-center gap-2 ${
                        selectedGroup === group 
                        ? 'bg-primary text-white shadow-[0_0_20px_rgba(108,92,231,0.4)] scale-105' 
                        : 'bg-[#151515] text-gray-400 hover:bg-white/5 hover:text-white border border-white/5'
                    }`}
                >
                    <span className="truncate max-w-[250px]">{group}</span>
                    <span className={`text-[11px] font-medium opacity-50 ${selectedGroup === group ? 'text-white' : 'text-gray-500'}`}>
                        {groups[group]?.length || 0}
                    </span>
                </button>
            ))}
        </div>
    );
}
