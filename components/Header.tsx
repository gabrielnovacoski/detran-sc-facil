
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between border-b border-solid border-[#dbdfe6] dark:border-[#2a303c] bg-white dark:bg-[#1a212f] px-4 md:px-10 py-3 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="text-primary flex items-center justify-center bg-primary/10 w-10 h-10 rounded-xl">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.29 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM6.85 7H17.14L18.22 10.11H5.78L6.85 7ZM19 17H5V12H19V17ZM7.5 13C8.33 13 9 13.67 9 14.5C9 15.33 8.33 16 7.5 16C6.67 16 6 15.33 6 14.5C6 13.67 6.67 13 7.5 13ZM16.5 13C17.33 13 18 13.67 18 14.5C18 15.33 17.33 16 16.5 16C15.67 16 15 15.33 15 14.5C15 13.67 15.67 13 16.5 13Z" fill="currentColor"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <h2 className="text-[#111318] dark:text-white text-base md:text-lg font-black leading-none tracking-tight">DETRAN SC</h2>
          <span className="text-primary text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">FÁCIL</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden xs:flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider whitespace-nowrap">DETRAN NET</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
