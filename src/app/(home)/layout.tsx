import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { SiteFooter } from '@/components/site-footer';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout {...baseOptions()} className="min-h-screen">
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </HomeLayout>
  );
}
