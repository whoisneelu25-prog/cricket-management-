import React from 'react';

export const PitchBackground: React.FC = () => {
  return (
    <div className="pitch-bg select-none" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
        <g>
          {/* Main Ground Boundary */}
          <circle className="pb-boundary" cx="500" cy="500" r="438" />

          {/* 30-Yard Infield Ring */}
          <circle
            className="pb-ring pb-fade"
            style={{ '--dur': '30s', '--delay': '3s' } as React.CSSProperties}
            cx="500"
            cy="500"
            r="268"
          />

          {/* 22-Yard Pitch Rectangle */}
          <rect className="pb-square" x="470" y="368" width="60" height="264" rx="2" />

          {/* Batting & Bowling Creases */}
          <line
            className="pb-crease pb-draw"
            style={{ '--len': 64, '--dur': '25s', '--delay': '4s' } as React.CSSProperties}
            x1="468"
            y1="404"
            x2="532"
            y2="404"
          />
          <line
            className="pb-crease pb-draw"
            style={{ '--len': 64, '--dur': '27s', '--delay': '7s' } as React.CSSProperties}
            x1="468"
            y1="596"
            x2="532"
            y2="596"
          />

          {/* Stumps (North & South) */}
          <g className="pb-stumps">
            <line
              className="pb-draw"
              style={{ '--len': 10, '--dur': '22s', '--delay': '5s' } as React.CSSProperties}
              x1="493"
              y1="386"
              x2="493"
              y2="394"
            />
            <line
              className="pb-draw"
              style={{ '--len': 10, '--dur': '22s', '--delay': '5.3s' } as React.CSSProperties}
              x1="500"
              y1="386"
              x2="500"
              y2="394"
            />
            <line
              className="pb-draw"
              style={{ '--len': 10, '--dur': '22s', '--delay': '5.6s' } as React.CSSProperties}
              x1="507"
              y1="386"
              x2="507"
              y2="394"
            />
            <line
              className="pb-draw"
              style={{ '--len': 10, '--dur': '26s', '--delay': '9s' } as React.CSSProperties}
              x1="493"
              y1="606"
              x2="493"
              y2="614"
            />
            <line
              className="pb-draw"
              style={{ '--len': 10, '--dur': '26s', '--delay': '9.3s' } as React.CSSProperties}
              x1="500"
              y1="606"
              x2="500"
              y2="614"
            />
            <line
              className="pb-draw"
              style={{ '--len': 10, '--dur': '26s', '--delay': '9.6s' } as React.CSSProperties}
              x1="507"
              y1="606"
              x2="507"
              y2="614"
            />
          </g>

          {/* Animated Cricket Balls Traversing Boundary Paths */}
          <circle
            className="pb-ball"
            r="5"
            style={
              {
                offsetPath: "path('M 500 404 Q 470 660 500 934')",
                '--dur': '19s',
                '--delay': '0s',
              } as React.CSSProperties
            }
          />
          <circle
            className="pb-ball"
            r="4"
            style={
              {
                offsetPath: "path('M 500 404 Q 700 570 846 732')",
                '--dur': '23s',
                '--delay': '5s',
              } as React.CSSProperties
            }
          />
          <circle
            className="pb-ball"
            r="5"
            style={
              {
                offsetPath: "path('M 500 404 Q 300 550 168 700')",
                '--dur': '29s',
                '--delay': '11s',
              } as React.CSSProperties
            }
          />
          <circle
            className="pb-ball"
            r="4"
            style={
              {
                offsetPath: "path('M 500 404 Q 280 435 64 478')",
                '--dur': '31s',
                '--delay': '17s',
              } as React.CSSProperties
            }
          />
          <circle
            className="pb-ball"
            r="5"
            style={
              {
                offsetPath: "path('M 500 404 Q 745 415 934 454')",
                '--dur': '37s',
                '--delay': '25s',
              } as React.CSSProperties
            }
          />
          <circle
            className="pb-ball"
            r="4"
            style={
              {
                offsetPath: "path('M 500 404 Q 360 238 252 122')",
                '--dur': '43s',
                '--delay': '34s',
              } as React.CSSProperties
            }
          />
        </g>
      </svg>
    </div>
  );
};

