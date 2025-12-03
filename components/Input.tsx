import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-bold text-slate-500 ml-1 uppercase">{label}</label>}
      <input
        className={`w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white focus:ring-0 transition-all outline-none text-slate-800 placeholder:text-slate-400 text-base ${className}`}
        {...props}
      />
    </div>
  );
};
