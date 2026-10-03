# Knowledge Graph

Versioned domain requirements that inherit: core, industry, domain. Readable by
people, loadable by AI.

This is a Next.js application generated with
[Create Fumadocs](https://github.com/fuma-nama/fumadocs).

Run development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open http://localhost:3000 with your browser to see the result.

## Explore

In the project, you can see:

- `lib/source.ts`: Code for content source adapter, [`loader()`](https://fumadocs.dev/docs/headless/source-api) provides the interface to access your content.
- `lib/layout.shared.tsx`: Shared options for layouts, optional but preferred to keep.

| Route                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `app/(home)`              | The route group for your landing page and other pages. |
| `app/docs`                | The documentation layout and pages.                    |
| `app/api/search/route.ts` | The Route Handler for search.                          |

### Fumadocs MDX

A `source.config.ts` config file has been included, you can customise different options like frontmatter schema.

Read the [Introduction](https://fumadocs.dev/docs/mdx) for further details.

## Learn More

To learn more about Next.js and Fumadocs, take a look at the following
resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Fumadocs](https://fumadocs.dev) - learn about Fumadocs

## License

Code and content are licensed separately:

| What | License | File |
|---|---|---|
| Code (everything outside `content/`) | [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) | [`LICENSE`](./LICENSE) |
| Knowledge content (`content/`) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [`content/LICENSE`](./content/LICENSE) |

You may use, modify and share both, including commercially, under those terms.
If you run a modified version of the code as a network service, the AGPL
requires you to offer your changes under the same license. Commercial licenses
without the AGPL obligations are available from the copyright holder.

"Knowledge Graph", its name and its logo are not licensed under either license.

### Contributing

Contributions require a signed Contributor License Agreement, so the project
can stay dual-licensed. Please open an issue before sending a pull request.

