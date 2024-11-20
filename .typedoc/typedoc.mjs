import { Application, ParameterType, JSX } from "typedoc";
function load(app) {
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
    ]
  });
  app.renderer.hooks.on("head.begin", (ctx) => {
    const keywords = ctx.options.getValue("keywords");
    return /* @__PURE__ */ JSX.createElement(JSX.Fragment, null, /* @__PURE__ */ JSX.createElement("link", { rel: "preconnect", href: "https://fonts.googleapis.com" }), /* @__PURE__ */ JSX.createElement("link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: true }), /* @__PURE__ */ JSX.createElement(
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;700&display=swap",
        rel: "stylesheet"
      }
    ), /* @__PURE__ */ JSX.createElement("meta", { name: "keyword", content: keywords.join(", ") }), /* @__PURE__ */ JSX.createElement("meta", { name: "color-scheme", content: "dark light" }), /* @__PURE__ */ JSX.createElement("link", { rel: "shortcut icon", href: "/media/favicon.ico" }), /* @__PURE__ */ JSX.createElement(
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "./media/assets/favicon.svg"
      }
    ), /* @__PURE__ */ JSX.createElement("meta", { name: "web-author", content: "Okiki Ojo" }), /* @__PURE__ */ JSX.createElement("meta", { name: "robots", content: "index, follow" }), /* @__PURE__ */ JSX.createElement("meta", { name: "twitter:url", content: "https://sharedworker.okikio.dev" }), /* @__PURE__ */ JSX.createElement("meta", { name: "twitter:site", content: "@okikio_dev" }), /* @__PURE__ */ JSX.createElement("meta", { name: "twitter:creator", content: "@okikio_dev" }), /* @__PURE__ */ JSX.createElement("link", { href: "https://twitter.com/okikio_dev", rel: "me" }), /* @__PURE__ */ JSX.createElement(
      "link",
      {
        rel: "webmention",
        href: "https://webmention.io/sharedworker.okikio.dev/webmention"
      }
    ), /* @__PURE__ */ JSX.createElement(
      "link",
      {
        rel: "pingback",
        href: "https://webmention.io/sharedworker.okikio.dev/xmlrpc"
      }
    ), /* @__PURE__ */ JSX.createElement(
      "link",
      {
        rel: "pingback",
        href: "https://webmention.io/webmention?forward=https://sharedworker.okikio.dev/endpoint"
      }
    ));
  });
}
export {
  load
};
