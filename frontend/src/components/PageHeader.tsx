import React from 'react';

interface PageHeaderProps {
  title: string;
  subline: string;
  actionButtons?: React.ReactNode;
  children?: React.ReactNode;
}

function PageHeader({ title, subline, actionButtons, children }: PageHeaderProps) {
  return (
    <div className="page-header relative overflow-hidden">
      {/* SVG Waveform Background */}
      <div className="absolute inset-0 opacity-8 dark:opacity-5">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <g className="text-gray-300 dark:text-gray-700">
            {/* Waveform bars - no repeat, distributed across full width */}
            <rect x="1%" y="45" width="10" height="32" rx="3" fill="currentColor" opacity="0.02" />
            <rect x="4%" y="38" width="10" height="67" rx="3" fill="currentColor" opacity="0.025" />
            <rect x="7%" y="29" width="10" height="93" rx="3" fill="currentColor" opacity="0.03" />
            <rect x="10%" y="41" width="10" height="61" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="13%" y="33" width="10" height="82" rx="3" fill="currentColor" opacity="0.0175" />
            <rect x="16%" y="19" width="10" height="109" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="19%" y="45" width="10" height="55" rx="3" fill="currentColor" opacity="0.025" />
            <rect x="22%" y="28" width="10" height="84" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="25%" y="36" width="10" height="64" rx="3" fill="currentColor" opacity="0.02" />
            <rect x="28%" y="25" width="10" height="99" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="31%" y="46" width="10" height="54" rx="3" fill="currentColor" opacity="0.025" />
            <rect x="34%" y="33" width="10" height="77" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="37%" y="20" width="10" height="103" rx="3" fill="currentColor" opacity="0.03" />
            <rect x="40%" y="44" width="10" height="51" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="43%" y="26" width="10" height="83" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="46%" y="37" width="10" height="63" rx="3" fill="currentColor" opacity="0.025" />
            <rect x="49%" y="21" width="10" height="95" rx="3" fill="currentColor" opacity="0.03" />
            <rect x="52%" y="40" width="10" height="56" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="55%" y="29" width="10" height="84" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="58%" y="24" width="10" height="93" rx="3" fill="currentColor" opacity="0.03" />
            <rect x="61%" y="39" width="10" height="59" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="64%" y="26" width="10" height="82" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="67%" y="17" width="10" height="102" rx="3" fill="currentColor" opacity="0.03" />
            <rect x="70%" y="34" width="10" height="64" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="73%" y="21" width="10" height="93" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="76%" y="35" width="10" height="58" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="79%" y="21" width="10" height="83" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="82%" y="29" width="10" height="65" rx="3" fill="currentColor" opacity="0.025" />
            <rect x="85%" y="17" width="10" height="96" rx="3" fill="currentColor" opacity="0.03" />
            <rect x="88%" y="33" width="10" height="56" rx="3" fill="currentColor" opacity="0.0225" />
            <rect x="91%" y="20" width="10" height="85" rx="3" fill="currentColor" opacity="0.0275" />
            <rect x="94%" y="26" width="10" height="63" rx="3" fill="currentColor" opacity="0.025" />
            <rect x="97%" y="19" width="10" height="91" rx="3" fill="currentColor" opacity="0.03" />
          </g>
        </svg>
      </div>

      <div className="page-header-content relative z-10">
        <div className="flex justify-between items-start">
          <div className="page-header-title animate-reveal" style={{ animationDelay: '0.05s' }}>
            <h1>{title}</h1>
            <p>{subline}</p>
          </div>
          {actionButtons && (
            <div className="page-header-actions animate-reveal" style={{ animationDelay: '0.1s' }}>
              {actionButtons}
            </div>
          )}
        </div>
        
        {children && (
          <div className="animate-reveal" style={{ animationDelay: '0.15s' }}>
            {children}
          </div>
        )}
      </div>
      
      {/* Decorative elements */}
      <div className="header-decoration header-decoration-top-right" />
      <div className="header-decoration header-decoration-bottom-left" />
    </div>
  );
}

export default PageHeader;
