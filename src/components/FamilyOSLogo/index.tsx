'use client';

import { createStyles } from 'antd-style';
import { CSSProperties, memo } from 'react';

/** brand accent of the Family-OS mark, kept identical to `public/favicon.svg` */
const MARK_COLOR = '#00A76F';
/** font size of the wordmark relative to the passed `size` */
const FONT_RATIO = 0.62;

export interface FamilyOSLogoProps {
  className?: string;
  /** muted suffix rendered right after the wordmark, e.g. `Chat` */
  extra?: string;
  size?: number;
  style?: CSSProperties;
  /** `combine` renders the mark with the wordmark, `icon` only the mark, `text` only the wordmark */
  type?: 'combine' | 'icon' | 'text';
}

const useStyles = createStyles(({ css }) => ({
  extra: css`
    margin-inline-start: 0.3em;

    font-weight: 400;
    opacity: 0.45;
  `,
  mark: css`
    flex: none;
  `,
  root: css`
    display: inline-flex;
    align-items: center;
    column-gap: 0.4em;

    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
    white-space: nowrap;

    user-select: none;
  `,
}));

const LogoMark = memo<{ className?: string; size: number }>(({ className, size }) => (
  <svg
    aria-hidden
    className={className}
    height={size}
    viewBox={'0 0 32 32'}
    width={size}
    xmlns={'http://www.w3.org/2000/svg'}
  >
    <rect fill={MARK_COLOR} height={32} rx={9} width={32} />
    <path d={'M11 8h11v3.6h-7.2v3.2h6v3.6h-6v5.6H11z'} fill={'#FFFFFF'} />
  </svg>
));

LogoMark.displayName = 'LogoMark';

const FamilyOSLogo = memo<FamilyOSLogoProps>(
  ({ className, extra, size = 32, style, type = 'text' }) => {
    const { styles, cx } = useStyles();

    return (
      <span className={cx(styles.root, className)} style={{ fontSize: size * FONT_RATIO, ...style }}>
        {type !== 'text' && <LogoMark className={styles.mark} size={size} />}
        {type !== 'icon' && <span>Family-OS</span>}
        {type !== 'icon' && extra && <span className={styles.extra}>{extra}</span>}
      </span>
    );
  },
);

FamilyOSLogo.displayName = 'FamilyOSLogo';

export default FamilyOSLogo;
