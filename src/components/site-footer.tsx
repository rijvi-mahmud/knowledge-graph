import Link from 'next/link';
import { appName, appTagline, docsRoute, gitConfig } from '@/lib/shared';

const columns = [
  {
    title: 'Knowledge',
    links: [
      { text: 'Introduction', href: docsRoute },
      { text: 'Appointment', href: `${docsRoute}/core/appointment` },
      { text: 'Healthcare', href: `${docsRoute}/healthcare` },
      { text: 'EHR', href: `${docsRoute}/healthcare/ehr` },
    ],
  },
  {
    title: 'For machines',
    links: [
      { text: 'llms.txt', href: '/llms.txt' },
      { text: 'llms-full.txt', href: '/llms-full.txt' },
      { text: 'Module markdown', href: '/llms.mdx/docs/core/appointment/content.md' },
    ],
  },
  {
    title: 'Project',
    links: [{ text: 'GitHub', href: `https://github.com/${gitConfig.user}/${gitConfig.repo}` }],
  },
];

/**
 * Shared footer. Deliberately surfaces the machine-readable routes alongside the
 * human ones - both audiences read the same knowledge base.
 */
export function SiteFooter() {
  return (
    <footer className="not-prose mt-16 border-t border-fd-border bg-fd-card/40">
      <div className="mx-auto w-full max-w-fd-container px-4 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <p className="font-medium">{appName}</p>
            <p className="mt-2 text-sm text-fd-muted-foreground">{appTagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-medium">{col.title}</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary"
                      >
                        {link.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-fd-border pt-6 text-sm text-fd-muted-foreground">
          Open knowledge base. Contributions welcome.
        </div>
      </div>
    </footer>
  );
}
