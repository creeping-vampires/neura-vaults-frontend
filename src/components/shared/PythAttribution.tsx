import React from 'react';

interface PythAttributionProps {
  className?: string;
  variant?: 'default' | 'compact' | 'footer';
}

export const PythAttribution: React.FC<PythAttributionProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const baseClasses = "flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground";
  
  const variantClasses = {
    default: "text-xs",
    compact: "text-[10px]",
    footer: "text-sm"
  };

  const content = {
    default: "Price data from Pyth Network",
    compact: "Powered by Pyth",
    footer: "Price data powered by Pyth Network"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <span>{content[variant]}</span>
      <a
        href="https://www.pyth.network/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:underline"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-70"
        >
          <path
            d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="15,3 21,3 21,9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="10"
            y1="14"
            x2="21"
            y2="3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
};

export default PythAttribution;