import React from 'react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import './ActionButton.css';

export type ActionButtonTone = 'primary' | 'neutral' | 'dark' | 'success' | 'danger';
export type ActionButtonSize = 'regular' | 'compact';

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  tone?: ActionButtonTone;
  size?: ActionButtonSize;
  fullWidth?: boolean;
}

const DEFAULT_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={30}
    height={30}
    className="icon lbt-action-icon lbt-action-button-default-icon"
    aria-hidden="true"
  >
    <path d="M22,15.04C22,17.23 20.24,19 18.07,19H5.93C3.76,19 2,17.23 2,15.04C2,13.07 3.43,11.44 5.31,11.14C5.28,11 5.27,10.86 5.27,10.71C5.27,9.33 6.38,8.2 7.76,8.2C8.37 8.2 8.94 8.43 9.37 8.8C10.14 7.05 11.13 5.44 13.91 5.44C17.28 5.44 18.87 8.06 18.87 10.83C18.87 10.94 18.87 11.06 18.86 11.17C20.65 11.54 22 13.13 22 15.04Z" />
  </svg>
);

function prepareIcon(icon: ReactNode): ReactNode {
  if (!React.isValidElement(icon)) return icon;

  const element = icon as ReactElement<{ className?: string }>;
  return React.cloneElement(element, {
    className: [element.props.className, 'lbt-action-icon'].filter(Boolean).join(' '),
  });
}

/**
 * Shared LBT primary-action button.
 *
 * The SVG wrapper movement, icon slide/scale, label fade and press scale
 * intentionally retain the supplied Save-button interaction.
 * Only the icon, label, tone and sizing vary by action context.
 */
export default function ActionButton({
  children,
  icon,
  tone = 'primary',
  size = 'regular',
  fullWidth = false,
  className = '',
  type = 'button',
  ...buttonProps
}: ActionButtonProps) {
  const renderedIcon = icon ? prepareIcon(icon) : DEFAULT_ICON;
  const classes = [
    'lbt-action-button',
    `lbt-action-button--${tone}`,
    `lbt-action-button--${size}`,
    fullWidth ? 'lbt-action-button--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button {...buttonProps} type={type} className={classes}>
      <div className="svg-wrapper-1">
        <div className="svg-wrapper" aria-hidden="true">{renderedIcon}</div>
      </div>
      <span>{children}</span>
    </button>
  );
}
