import { expect } from "chai";
import sinon from "sinon";
import {
    cloneValue,
    mergeValues,
    nextDeleteTimestamp,
    nextUpdateTimestamp,
    valueToHistoryItem
} from "../../../../dist/node/io/formatB/history.js";

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

        it("adds no history when both sides have the same value (B-456)", function () {
            const same = () => value({ updated: 2000, history: [{ value: "old", updated: 1000 }] });
            expect(mergeValues(same(), same(), "property").history).to.deep.equal([
                { value: "old", updated: 1000 }
            ]);
        });

        it("keeps the previous value of a value deleted on both sides (B-456)", function () {
            const merged = mergeValues(value({ deleted: 2000 }), value(), "property");
            expect(merged).to.have.property("deleted", 2000);
            expect(merged.history).to.deep.equal([]);
        });

        it("keeps a deletion marker that only one side has (B-456)", function () {
            const plain = value({ value: "one", updated: 1000 });
            const rewritten = value({
                value: "two",
                updated: 3000,
                history: [{ value: "one", updated: 1000, deleted: 2000 }]
            });
            expect(mergeValues(plain, rewritten, "property").history).to.deep.equal([
                { value: "one", updated: 1000, deleted: 2000 }
            ]);
        });
    });

    describe("valueToHistoryItem", function () {
        it("keeps the deletion time of a deleted value (B-456)", function () {
            expect(valueToHistoryItem(value({ updated: 1000, deleted: 2000 }))).to.deep.equal({
                value: "v",
                updated: 1000,
                deleted: 2000
            });
        });

        it("has no deletion time for a live value", function () {
            expect(valueToHistoryItem(value())).to.not.have.property("deleted");
        });
    });
    describe("nextUpdateTimestamp", function () {
        afterEach(function () {
            if (this.clock) this.clock.restore();
        });

        it("uses the current time when it is later", function () {
            this.clock = sinon.useFakeTimers(5000);
            expect(nextUpdateTimestamp(value({ updated: 1000 }))).to.equal(5000);
        });

        it("is later than the previous update if the clock went backwards", function () {
            this.clock = sinon.useFakeTimers(500);
            expect(nextUpdateTimestamp(value({ updated: 1000 }))).to.equal(1001);
        });

        it("is later than a deletion if the clock went backwards", function () {
            this.clock = sinon.useFakeTimers(500);
            expect(nextUpdateTimestamp(value({ updated: 1000, deleted: 2000 }))).to.equal(2001);
        });
    });

    describe("nextDeleteTimestamp", function () {
        afterEach(function () {
            if (this.clock) this.clock.restore();
        });

        it("uses the current time when it is later", function () {
            this.clock = sinon.useFakeTimers(5000);
            expect(nextDeleteTimestamp(value({ updated: 1000 }))).to.equal(5000);
        });

        it("is not earlier than the last update if the clock went backwards", function () {
            this.clock = sinon.useFakeTimers(500);
            expect(nextDeleteTimestamp(value({ updated: 1000 }))).to.equal(1000);
        });
    });
});
