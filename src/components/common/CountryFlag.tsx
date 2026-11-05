import React from 'react';

interface CountryFlagProps {
  countryCode: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: boolean;
}

const SIZE_MAP = {
  xs: 'w-4 h-3',
  sm: 'w-5 h-3.5',
  md: 'w-7 h-5',
  lg: 'w-10 h-7',
  xl: 'w-14 h-10',
};

export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  size = 'md',
  className = '',
  rounded = true,
}) => {
  const code = (countryCode || '').toUpperCase().trim();
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const roundedClass = rounded ? 'rounded-sm shadow-sm overflow-hidden' : '';

  // Return SVG for each nation
  switch (code) {
    case 'IND':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="200" fill="#FF9933" />
          <rect y="200" width="900" height="200" fill="#FFFFFF" />
          <rect y="400" width="900" height="200" fill="#138808" />
          <circle cx="450" cy="300" r="70" fill="none" stroke="#000080" strokeWidth="6" />
          <circle cx="450" cy="300" r="14" fill="#000080" />
          {[...Array(24)].map((_, i) => (
            <line
              key={i}
              x1="450"
              y1="300"
              x2={450 + 70 * Math.cos((i * 15 * Math.PI) / 180)}
              y2={300 + 70 * Math.sin((i * 15 * Math.PI) / 180)}
              stroke="#000080"
              strokeWidth="3.5"
            />
          ))}
        </svg>
      );

    case 'AUS':
      return (
        <svg
          viewBox="0 0 1200 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="1200" height="600" fill="#00008B" />
          {/* Canton: Union Flag simplified */}
          <rect width="600" height="300" fill="#00247D" />
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#FFFFFF" strokeWidth="60" />
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#CF142B" strokeWidth="20" />
          <path d="M300,0 V300 M0,150 H600" stroke="#FFFFFF" strokeWidth="100" />
          <path d="M300,0 V300 M0,150 H600" stroke="#CF142B" strokeWidth="60" />
          {/* Commonwealth Star */}
          <circle cx="300" cy="450" r="50" fill="#FFFFFF" />
          {/* Southern Cross stars */}
          <circle cx="900" cy="150" r="20" fill="#FFFFFF" />
          <circle cx="1020" cy="240" r="20" fill="#FFFFFF" />
          <circle cx="900" cy="480" r="22" fill="#FFFFFF" />
          <circle cx="780" cy="270" r="20" fill="#FFFFFF" />
          <circle cx="960" cy="330" r="14" fill="#FFFFFF" />
        </svg>
      );

    case 'ENG':
      return (
        <svg
          viewBox="0 0 600 360"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="600" height="360" fill="#FFFFFF" />
          <rect x="250" width="100" height="360" fill="#CE1124" />
          <rect y="130" width="600" height="100" fill="#CE1124" />
        </svg>
      );

    case 'PAK':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="600" fill="#01411C" />
          <rect width="225" height="600" fill="#FFFFFF" />
          {/* Crescent */}
          <circle cx="560" cy="300" r="140" fill="#FFFFFF" />
          <circle cx="600" cy="265" r="125" fill="#01411C" />
          {/* Star */}
          <polygon
            points="610,210 622,246 660,246 629,268 641,304 610,282 579,304 591,268 560,246 598,246"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'RSA':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="300" fill="#E03C31" />
          <rect y="300" width="900" height="300" fill="#001489" />
          <polygon points="0,0 450,300 0,600" fill="#000000" />
          <polygon points="0,0 40,0 460,280 460,320 40,600 0,600 420,300" fill="#FFB81C" />
          <path
            d="M 0,0 L 50,0 L 450,266 L 900,266 L 900,334 L 450,334 L 50,600 L 0,600 Z"
            fill="#FFFFFF"
          />
          <path
            d="M 0,0 L 25,0 L 420,275 L 900,275 L 900,325 L 420,325 L 25,600 L 0,600 Z"
            fill="#007749"
          />
        </svg>
      );

    case 'NZL':
      return (
        <svg
          viewBox="0 0 1200 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="1200" height="600" fill="#00247D" />
          {/* Union Jack in canton */}
          <rect width="600" height="300" fill="#00247D" />
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#FFFFFF" strokeWidth="60" />
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#CC142B" strokeWidth="20" />
          <path d="M300,0 V300 M0,150 H600" stroke="#FFFFFF" strokeWidth="100" />
          <path d="M300,0 V300 M0,150 H600" stroke="#CC142B" strokeWidth="60" />
          {/* Red stars with white border */}
          <circle cx="900" cy="150" r="24" fill="#FFFFFF" />
          <circle cx="900" cy="150" r="18" fill="#CC142B" />
          <circle cx="1020" cy="240" r="22" fill="#FFFFFF" />
          <circle cx="1020" cy="240" r="16" fill="#CC142B" />
          <circle cx="900" cy="450" r="26" fill="#FFFFFF" />
          <circle cx="900" cy="450" r="20" fill="#CC142B" />
          <circle cx="800" cy="280" r="22" fill="#FFFFFF" />
          <circle cx="800" cy="280" r="16" fill="#CC142B" />
        </svg>
      );

    case 'SL':
      return (
        <svg
          viewBox="0 0 1200 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="1200" height="600" fill="#FFBE29" />
          <rect x="50" y="50" width="1100" height="500" fill="#0033A0" />
          <rect x="80" y="80" width="130" height="440" fill="#007953" />
          <rect x="230" y="80" width="130" height="440" fill="#EB7400" />
          <rect x="390" y="80" width="730" height="440" fill="#8D153A" />
          <circle cx="750" cy="300" r="110" fill="#FFBE29" />
          <text
            x="750"
            y="325"
            fontSize="80"
            fontWeight="bold"
            textAnchor="middle"
            fill="#8D153A"
          >
            SL
          </text>
        </svg>
      );

    case 'WI':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="600" fill="#7B002C" />
          <circle cx="450" cy="300" r="180" fill="#FDB913" />
          <circle cx="450" cy="300" r="160" fill="#7B002C" />
          <circle cx="450" cy="300" r="130" fill="#FDB913" />
          {/* Cricket Wicket / Palm motif */}
          <rect x="430" y="220" width="40" height="130" fill="#008080" />
          <text
            x="450"
            y="390"
            fontSize="45"
            fontWeight="black"
            textAnchor="middle"
            fill="#FFFFFF"
            letterSpacing="2"
          >
            WINDIES
          </text>
        </svg>
      );

    case 'BAN':
      return (
        <svg
          viewBox="0 0 1000 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="1000" height="600" fill="#006A4E" />
          <circle cx="450" cy="300" r="200" fill="#F42A41" />
        </svg>
      );

    case 'AFG':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="300" height="600" fill="#000000" />
          <rect x="300" width="300" height="600" fill="#D32011" />
          <rect x="600" width="300" height="600" fill="#007A3D" />
          <circle cx="450" cy="300" r="80" fill="none" stroke="#FFFFFF" strokeWidth="12" />
        </svg>
      );

    case 'ZIM':
      return (
        <svg
          viewBox="0 0 1200 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect y="0" width="1200" height="85.7" fill="#006400" />
          <rect y="85.7" width="1200" height="85.7" fill="#FFD200" />
          <rect y="171.4" width="1200" height="85.7" fill="#D40000" />
          <rect y="257.1" width="1200" height="85.7" fill="#000000" />
          <rect y="342.8" width="1200" height="85.7" fill="#D40000" />
          <rect y="428.5" width="1200" height="85.7" fill="#FFD200" />
          <rect y="514.2" width="1200" height="85.8" fill="#006400" />
          <polygon points="0,0 400,300 0,600" fill="#FFFFFF" stroke="#000000" strokeWidth="4" />
          <polygon points="120,260 160,260 170,220 180,260 220,260 190,290 200,330 170,305 140,330 150,290" fill="#D40000" />
        </svg>
      );

    case 'IRE':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="300" height="600" fill="#169B62" />
          <rect x="300" width="300" height="600" fill="#FFFFFF" />
          <rect x="600" width="300" height="600" fill="#FF883E" />
        </svg>
      );

    case 'SCO':
      return (
        <svg
          viewBox="0 0 1000 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="1000" height="600" fill="#0065BF" />
          <path d="M0,0 L1000,600 M1000,0 L0,600" stroke="#FFFFFF" strokeWidth="120" />
        </svg>
      );

    case 'NED':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="200" fill="#AE1C28" />
          <rect y="200" width="900" height="200" fill="#FFFFFF" />
          <rect y="400" width="900" height="200" fill="#21468B" />
        </svg>
      );

    case 'NEP':
      return (
        <svg
          viewBox="0 0 500 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="0,0 450,260 160,260 450,560 0,560"
            fill="#DC143C"
            stroke="#003893"
            strokeWidth="35"
          />
          <circle cx="120" cy="190" r="40" fill="#FFFFFF" />
          <circle cx="130" cy="420" r="45" fill="#FFFFFF" />
        </svg>
      );

    case 'NAM':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon points="0,0 900,0 0,600" fill="#003580" />
          <polygon points="900,0 900,600 0,600" fill="#009543" />
          <line x1="0" y1="600" x2="900" y2="0" stroke="#FFFFFF" strokeWidth="180" />
          <line x1="0" y1="600" x2="900" y2="0" stroke="#D21034" strokeWidth="120" />
          <circle cx="180" cy="150" r="75" fill="#FFCE00" />
        </svg>
      );

    case 'USA':
      return (
        <svg
          viewBox="0 0 950 500"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {[...Array(13)].map((_, i) => (
            <rect
              key={i}
              y={(i * 500) / 13}
              width="950"
              height={500 / 13 + 0.5}
              fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'}
            />
          ))}
          <rect width="380" height={(7 * 500) / 13} fill="#3C3B6E" />
          <text
            x="190"
            y="160"
            fontSize="100"
            fontWeight="bold"
            textAnchor="middle"
            fill="#FFFFFF"
          >
            ★
          </text>
        </svg>
      );

    case 'UAE':
      return (
        <svg
          viewBox="0 0 900 450"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="150" fill="#00732F" />
          <rect y="150" width="900" height="150" fill="#FFFFFF" />
          <rect y="300" width="900" height="150" fill="#000000" />
          <rect width="225" height="450" fill="#FF0000" />
        </svg>
      );

    case 'OMA':
      return (
        <svg
          viewBox="0 0 900 450"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="150" fill="#FFFFFF" />
          <rect y="150" width="900" height="150" fill="#D32011" />
          <rect y="300" width="900" height="150" fill="#008000" />
          <rect width="225" height="450" fill="#D32011" />
        </svg>
      );

    case 'CAN':
      return (
        <svg
          viewBox="0 0 1000 500"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="250" height="500" fill="#FF0000" />
          <rect x="250" width="500" height="500" fill="#FFFFFF" />
          <rect x="750" width="250" height="500" fill="#FF0000" />
          <text
            x="500"
            y="320"
            fontSize="260"
            fontWeight="bold"
            textAnchor="middle"
            fill="#FF0000"
          >
            🍁
          </text>
        </svg>
      );

    case 'PNG':
      return (
        <svg
          viewBox="0 0 800 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon points="0,0 800,0 0,600" fill="#CE1126" />
          <polygon points="800,0 800,600 0,600" fill="#000000" />
          <circle cx="200" cy="450" r="30" fill="#FFFFFF" />
          <circle cx="280" cy="380" r="20" fill="#FFFFFF" />
          <circle cx="240" cy="520" r="25" fill="#FFFFFF" />
          <text
            x="560"
            y="300"
            fontSize="140"
            textAnchor="middle"
            fill="#FCD116"
          >
            ✦
          </text>
        </svg>
      );

    case 'IDN':
      return (
        <svg
          viewBox="0 0 900 600"
          className={`inline-block shrink-0 ${sizeClasses} ${roundedClass} ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="300" fill="#CE1126" />
          <rect y="300" width="900" height="300" fill="#FFFFFF" />
        </svg>
      );

    default:
      return (
        <div
          className={`inline-flex items-center justify-center font-bold text-xs uppercase bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses} ${roundedClass} ${className}`}
        >
          {code.slice(0, 3)}
        </div>
      );
  }
};

