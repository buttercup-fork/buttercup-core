import { expect } from "chai";
import { valuesDiffer } from "../../../../dist/node/io/formatB/compare.js";

function value(overrides = {}) {
    return {
        value: "1234",
        created: 1000,
        updated: 2000,
        history: [],
        ...overrides
    };
}

describe("io/formatB/compare", function () {
    describe("valuesDiffer", function () {
        it("returns false for equal values", function () {
            expect(valuesDiffer(value(), value())).to.equal(false);
        });

        it("returns true when only one side is deleted (B-691)", function () {
            expect(valuesDiffer(value(), value({ deleted: 3000 }))).to.equal(true);
            expect(valuesDiffer(value({ deleted: 3000 }), value())).to.equal(true);
        });

        it("returns true when the deletion times differ (B-691)", function () {
            expect(valuesDiffer(value({ deleted: 3000 }), value({ deleted: 4000 }))).to.equal(true);
        });

        it("returns false when both sides have the same deletion time", function () {
            expect(valuesDiffer(value({ deleted: 3000 }), value({ deleted: 3000 }))).to.equal(
                false
            );
        });

        it("returns true when only one side knows a history item was deleted (B-691)", function () {
            const history = [{ value: "old", updated: 1500 }];
            const historyDeleted = [{ value: "old", updated: 1500, deleted: 1700 }];
            expect(valuesDiffer(value({ history }), value({ history: historyDeleted }))).to.equal(
                true
            );
        });

        it("returns false for equal history", function () {
            const history = () => [{ value: "old", updated: 1500, deleted: 1700 }];
            expect(
                valuesDiffer(value({ history: history() }), value({ history: history() }))
            ).to.equal(false);
        });
    });
});
