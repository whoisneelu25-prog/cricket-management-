import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MatchFormat } from '../../types/cricket';
import { resolveStadiumImage, ResolvedStadiumImage } from '../../data/stadiumImages';

interface StadiumBackgroundProps {
  venue?: string;
  hostCountryId?: string;
  format?: MatchFormat;
  fallbackSrc?: string;
  /** Dark overlay strength (0-1). Defaults to 0.55 */
  overlayOpacity?: number;
  className?: string;
  /** Show a small caption with the stadium name in the bottom-right corner */
  showCaption?: boolean;
}

interface Layer {
  key: number;
  image: ResolvedStadiumImage;
}

/**
 * Full-bleed stadium photograph with a dark translucent overlay.
 * Resolves the correct local photograph from the match venue / host nation and
 * cross-fades smoothly when the venue changes. Purely decorative (aria-hidden).
 */
export const StadiumBackground: React.FC<StadiumBackgroundProps> = ({
  venue,
  hostCountryId,
  format,
  fallbackSrc,
  overlayOpacity = 0.55,
  className = '',
  showCaption = true,
}) => {
  const resolved = useMemo(
    () => resolveStadiumImage({ venue, hostCountryId, format, fallbackSrc }),
    [venue, hostCountryId, format, fallbackSrc]
  );

  const keyRef = useRef(0);
  const [layers, setLayers] = useState<Layer[]>(() => [{ key: 0, image: resolved }]);

  // Preload the new photograph, then fade it in above the previous one
  useEffect(() => {
    const top = layers[layers.length - 1];
    if (top && top.image.src === resolved.src) return;

    let cancelled = false;
    const push = (image: ResolvedStadiumImage) => {
      if (cancelled) return;
      keyRef.current += 1;
      const key = keyRef.current;
      setLayers((prev) => [...prev.slice(-1), { key, image }]);
    };

    if (!resolved.src) {
      push(resolved);
    } else {
      const img = new Image();
      img.onload = () => push(resolved);
      img.onerror = () => push({ ...resolved, src: null, matchType: 'NEUTRAL', blurPx: 0 });
      img.src = resolved.src;
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.src]);

  const current = layers[layers.length - 1]?.image || resolved;

  return (
    <div
      className={`stadium-bg absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {layers.map((layer, idx) => {
        const isTop = idx === layers.length - 1;
        return layer.image.src ? (
          <div
            key={layer.key}
            className={`stadium-bg-photo ${isTop && layers.length > 1 ? 'stadium-bg-fade-in' : ''}`}
            onAnimationEnd={() => {
              if (isTop) setLayers((prev) => prev.slice(-1));
            }}
            style={{
              backgroundImage: `url("${layer.image.src}")`,
              filter: layer.image.blurPx > 0 ? `blur(${layer.image.blurPx}px)` : undefined,
              transform: layer.image.blurPx > 0 ? 'scale(1.03)' : undefined,
            }}
          />
        ) : (
          <div
            key={layer.key}
            className={`stadium-bg-neutral ${isTop && layers.length > 1 ? 'stadium-bg-fade-in' : ''}`}
            onAnimationEnd={() => {
              if (isTop) setLayers((prev) => prev.slice(-1));
            }}
          />
        );
      })}

      {/* Dark readability overlay + soft vignette */}
      <div className="absolute inset-0" style={{ background: `rgba(0, 0, 0, ${overlayOpacity})` }} />
      <div className="stadium-bg-vignette" />

      {showCaption && current.src && (
        <div className="absolute bottom-3 right-4 text-[10px] font-mono uppercase tracking-widest text-white/45 hidden sm:block">
          {current.label}
          {current.matchType === 'HOST_COUNTRY' ? ' · host nation venue' : ''}
        </div>
      )}
    </div>
  );
};

