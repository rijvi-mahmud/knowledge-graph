import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { docsContentRoute, docsRoute } from '@/lib/shared';
import { JURISDICTION_COOKIE, isJurisdiction, jurisdictionSegment } from '@/lib/jurisdictions';

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);

const queryJurisdiction = (request: NextRequest) =>
  request.nextUrl.searchParams.get('jurisdiction')?.toLowerCase();

/**
 * `?jurisdiction=us` asks for the spec as one jurisdiction sees it. The
 * markdown route is static, so the choice travels in the file name
 * (content.us.md) rather than the query string, which a static route never sees.
 */
function toMarkdown(path: string, request: NextRequest) {
  const jurisdiction = queryJurisdiction(request);
  const file = isJurisdiction(jurisdiction) ? `content.${jurisdiction}.md` : 'content.md';
  const url = new URL(path.replace(/content\.md$/, file), request.nextUrl);
  url.search = '';
  return NextResponse.rewrite(url);
}

/**
 * HTML docs pages: the reader's choice comes from the query, else the cookie
 * the jurisdiction selector sets. A filtered page is the static path with a
 * trailing "__us" segment, which the page route strips off.
 */
function toHtml(request: NextRequest) {
  const query = queryJurisdiction(request);
  const chosen = query ?? request.cookies.get(JURISDICTION_COOKIE)?.value;
  if (!isJurisdiction(chosen)) {
    const response = NextResponse.next();
    if (query === 'all') response.cookies.delete(JURISDICTION_COOKIE);
    return response;
  }
  const url = request.nextUrl.clone();
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${jurisdictionSegment(chosen)}`;
  url.search = '';
  const response = NextResponse.rewrite(url);
  if (query) response.cookies.set(JURISDICTION_COOKIE, chosen, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return response;
}

export default function proxy(request: NextRequest) {
  const result = rewriteSuffix(request.nextUrl.pathname);
  if (result) return toMarkdown(result, request);

  if (isMarkdownPreferred(request)) {
    const result = rewriteDocs(request.nextUrl.pathname);
    if (result) return toMarkdown(result, request);
  }

  const { pathname } = request.nextUrl;
  if (pathname === docsRoute || pathname.startsWith(`${docsRoute}/`)) return toHtml(request);

  return NextResponse.next();
}
