import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, docsRoute, gitConfig } from './shared';

/** Brand mark - three linked nodes, standing in for the graph itself. */
function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-fd-primary" aria-hidden="true">
      <path
        d="M6 7.5 L12 12 L6 16.5 M12 12 L18 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="7.5" r="2.1" fill="currentColor" />
      <circle cx="6" cy="16.5" r="2.1" fill="currentColor" />
      <circle cx="19" cy="12" r="2.1" fill="currentColor" />
    </svg>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-medium">
          <LogoMark />
          {appName}
        </span>
      ),
    },
    links: [
      {
        // Exact match only - 'nested-url' here would also match every
        // knowledge page and light this up alongside Core.
        text: 'Documentation',
        url: docsRoute,
        active: 'url',
      },
      {
        text: 'Core',
        url: `${docsRoute}/core/appointment`,
        active: 'nested-url',
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
