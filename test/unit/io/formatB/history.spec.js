import { expect } from "chai";
import { cloneValue, mergeValues } from "../../../../dist/node/io/formatB/history.js";

function value(overrides = {}) {
    return {
        value: "v",
        created: 1000,
        updated: 1000,
        history: [],
        ...overrides
    };
}

describe("io/formatB/history", function () {
    describe("cloneValue", function () {
        it("copies the core fields", function () {
            const cloned = cloneValue(value({ value: "abc", created: 5, updated: 9 }));
            expect(cloned).to.deep.equal({ value: "abc", created: 5, updated: 9, history: [] });
        });

        it("preserves the deletion tombstone", function () {
            const cloned = cloneValue(value({ deleted: 4321 }));
            expect(cloned).to.have.property("deleted", 4321);
        });

        it("omits `deleted` when not present", function () {
            expect(cloneValue(value())).to.not.have.property("deleted");
        });
    });

    describe("mergeValues", function () {
        it("keeps a property deleted when the deletion is the most recent change", function () {
            const deleted = value({ updated: 1000, deleted: 2000 });
            const live = value({ updated: 1000 });
            expect(mergeValues(deleted, live, "property")).to.have.property("deleted", 2000);
            expect(mergeValues(live, deleted, "property")).to.have.property("deleted", 2000);
        });

        it("revives a property that was rewritten after deletion", function () {
            const deleted = value({ updated: 1000, deleted: 2000 });
            const rewritten = value({ value: "new", updated: 3000 });
            const merged = mergeValues(deleted, rewritten, "property");
            expect(merged).to.not.have.property("deleted");
            expect(merged).to.have.property("value", "new");
        });

        it("keeps the newest deletion timestamp when both sides are deleted", function () {
            const a = value({ deleted: 2000 });
            const b = value({ deleted: 2500 });
            expect(mergeValues(a, b, "property")).to.have.property("deleted", 2500);
        });

        it("does not add `deleted` when neither side is deleted", function () {
            expect(mergeValues(value(), value(), "property")).to.not.have.property("deleted");
        });
    });
});
