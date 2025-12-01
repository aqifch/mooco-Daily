import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-slate-600 ml-1">{label}</label>}
      <input
        className={`w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-white focus:border-blue-500 focus:ring-0 transition-colors outline-none text-slate-800 placeholder:text-slate-400 ${className}`}
        {...props}
      />
    </div>
  );
};
