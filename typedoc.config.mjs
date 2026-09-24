import { OptionDefaults } from "typedoc";

// Legacy JSDoc tags still present in source comments - accepted so TypeDoc
// doesn't warn on them, then stripped from the output
const LEGACY_TAGS = ["@memberof", "@module", "@name", "@static", "@type"];

/** @type {Partial<import("typedoc").TypeDocOptions>} */
export default {
    entryPoints: ["./source/index.node.ts"],
    tsconfig: "./tsconfig.json",
    out: "./docs/api",
    plugin: ["typedoc-plugin-markdown", "./scripts/typedoc-hide-underscored.mjs"],
    name: "Buttercup Core API",
    readme: "none",
    excludePrivate: true,
    excludeProtected: true,
    excludeInternal: true,
    excludeExternals: true,
    disableSources: true,
    sort: ["kind", "alphabetical"],
    blockTags: [...OptionDefaults.blockTags, ...LEGACY_TAGS],
    excludeTags: [...OptionDefaults.excludeTags, ...LEGACY_TAGS]
};
