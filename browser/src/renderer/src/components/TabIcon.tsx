import { useState } from 'react';
import { faviconFor, gradientFor, letterOf, hostOf } from '../lib/url';

interface TabIconProps {
  url: string;
  title: string;
  favicon?: string | null;
  size?: number;
}

/** Favicon with a graceful, colourful letter fallback — never a third-party icon service. */
export function TabIcon({ url, title, favicon, size = 15 }: TabIconProps) {
  const [failed, setFailed] = useState(false);
  const src = favicon || faviconFor(url);
  const isInternal = url.startsWith('kimmino://');

  if (isInternal) {
    return (
      <span
        className="tab-favicon"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg,#7c97ff,#33d6a6)',
          color: '#08111a',
          fontSize: size * 0.6,
          borderRadius: size * 0.26
        }}
      >
        K
      </span>
    );
  }

  if (src && !failed) {
    return (
      <img
        className="tab-favicon"
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="tab-favicon"
      style={{
        width: size,
        height: size,
        background: gradientFor(hostOf(url) || title),
        color: '#fff',
        fontSize: size * 0.62,
        borderRadius: size * 0.28
      }}
    >
      {letterOf(title || hostOf(url))}
    </span>
  );
}
