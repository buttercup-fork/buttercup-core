import { Converter, ReflectionKind } from "typedoc";

// Class members prefixed with an underscore are internal by convention in
// this codebase (TypeScript-public only for tests/subclasses) - keep them
// out of the generated API docs
export function load(app) {
    app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
        const project = context.project;
        const members = project.getReflectionsByKind(
            ReflectionKind.Property | ReflectionKind.Method | ReflectionKind.Accessor
        );
        for (const reflection of members) {
            if (reflection.name.startsWith("_")) {
                project.removeReflection(reflection);
            }
        }
    });
}
