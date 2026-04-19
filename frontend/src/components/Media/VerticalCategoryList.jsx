import React from 'react';
import { FiStar } from 'react-icons/fi';

export default function VerticalCategoryList({ groups, selectedGroup, onSelectGroup }) {
    const groupNames = Object.keys(groups || {})
        .filter(name => !name.includes('[MSEController]') && !name.includes('MediaSource'))
        .sort((a, b) => a.localeCompare(b));
    
    return (
        <div className="flex flex-col gap-1 w-full h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar pr-2 pb-10">
            <button
                onClick={() => onSelectGroup(null)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 w-full text-left group
                    ${!selectedGroup 
                        ? 'text-primary bg-primary/10 shadow-[inset_4px_0_0_0_rgba(108,92,231,1)]' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
            >
                <FiStar className={`shrink-0 ${!selectedGroup ? 'fill-primary text-primary' : 'text-gray-500'}`} size={18} />
                <span className="truncate">TODOS OS ITENS</span>
            </button>

            {groupNames.map(group => {
                const isActive = selectedGroup === group;
                return (
                    <button
                        key={group}
                        onClick={() => onSelectGroup(group)}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 w-full text-left group
                            ${isActive 
                                ? 'text-primary bg-primary/10 shadow-[inset_4px_0_0_0_rgba(108,92,231,1)]' 
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                    >
                        <FiStar className={`shrink-0 transition-all ${isActive ? 'fill-primary text-primary scale-110' : 'text-gray-500 group-hover:text-gray-400'}`} size={18} />
                        <span className="truncate flex-1">{group}</span>
                    </button>
                );
            })}
        </div>
    );
}
