/** @jsxFactory JSX.createElement */
/** @jsxFragmentFactory JSX.Fragment */
import { Application, ParameterType, JSX } from "typedoc";

export function load(app: Application) {
  app.options.addDeclaration({
    name: "keywords",
    type: ParameterType.Array,
    help: "Website keywords",
    defaultValue: [
      "sharedworker",
      "polyfill",
      "ponyfill",
      "framework agnostic",
      "es2023",
      "web"
    ],
  });

  app.renderer.hooks.on("head.begin", (ctx) => {
    const keywords = ctx.options.getValue("keywords") as string[];

    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;700&amp;display=swap"
          rel="stylesheet"
        />

        <meta name="keyword" content={keywords.join(", ")} />
        <meta name="color-scheme" content="dark light" />
        <link rel="shortcut icon" href="/media/favicon.ico" />
        <link
          rel="icon"
          type="image/svg+xml"
          href="./media/assets/favicon.svg"
        />

        <meta name="web-author" content="Okiki Ojo" />
        <meta name="robots" content="index, follow" />

        <meta name="twitter:url" content="https://sharedworker.okikio.dev" />
        <meta name="twitter:site" content="@okikio_dev" />
        <meta name="twitter:creator" content="@okikio_dev" />

        <link href="https://twitter.com/okikio_dev" rel="me" />
        <link
          rel="webmention"
          href="https://webmention.io/sharedworker.okikio.dev/webmention"
        />
        <link
          rel="pingback"
          href="https://webmention.io/sharedworker.okikio.dev/xmlrpc"
        />
        <link
          rel="pingback"
          href="https://webmention.io/webmention?forward=https://sharedworker.okikio.dev/endpoint"
        />
      </>
    );
  });
}
