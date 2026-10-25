import { expect } from "chai";
import {
    Entry,
    Group,
    Vault,
    VaultFormatA,
    VaultFormatB,
    consumeVaultFacade,
    createEntryFacade,
    createFieldDescriptor,
    createGroupFacade,
    createVaultFacade
} from "../../../dist/node/index.js";

describe("Vault facades", function () {
    [
        [VaultFormatA, "A"],
        [VaultFormatB, "B"]
    ].forEach(([Format, formatName]) => {
        describe(`Format: ${formatName}`, function () {
            beforeEach(function () {
                this.vault = new Vault(Format);
                this.vault.setAttribute("ATTR_1", "one").setAttribute("ATTR_2", "two");
                const topGroup = (this.topGroup = this.vault.createGroup("top"));
                const bottomGroup = (this.bottomGroup = topGroup
                    .createGroup("one")
                    .createGroup("two"));
                this.otherGroup = this.vault.createGroup("other");
                topGroup.createGroup("three");
                this.entryA = topGroup
                    .createEntry("Entry A")
                    .setProperty("username", "user@example.com")
                    .setProperty("password", "passw0rd")
                    .setAttribute("test_attr", "1234")
                    .setAttribute("test_attr_2", "5678");
                this.entryB = bottomGroup
                    .createEntry("Entry B")
                    .setProperty("username", "user2@example.com")
                    .setProperty("password", "pa55w0rd");
            });

            describe("consumeVaultFacade", function () {
                it("supports deleting entries", function () {
                    const facade = createVaultFacade(this.vault);
                    const entryAID = this.entryA.id;
                    const targetEntryIndex = facade.entries.findIndex(
                        (entryFacade) => entryFacade.id === entryAID
                    );
                    expect(this.vault.findEntryByID(entryAID)).to.be.an.instanceOf(Entry);
                    facade.entries.splice(targetEntryIndex, 1);
                    consumeVaultFacade(this.vault, facade);
                    expect(this.vault.findEntryByID(entryAID)).to.be.null;
                });

                it("supports moving entries", function () {
                    const facade = createVaultFacade(this.vault);
                    const targetEntryIndex = facade.entries.findIndex(
                        (entryFacade) => entryFacade.id === this.entryA.id
                    );
                    facade.entries[targetEntryIndex].parentID = this.bottomGroup.id;
                    expect(this.vault.findEntryByID(this.entryA.id).getGroup().id).to.equal(
                        this.topGroup.id
                    );
                    consumeVaultFacade(this.vault, facade);
                    expect(this.vault.findEntryByID(this.entryA.id).getGroup().id).to.equal(
                        this.bottomGroup.id
                    );
                });

                it("supports adding entries", function () {
                    const facade = createVaultFacade(this.vault);
                    const entryFacade = createEntryFacade();
                    entryFacade.fields.find((field) => field.property === "title").value =
                        "Test Entry";
                    entryFacade.parentID = this.topGroup.id;
                    facade.entries.push(entryFacade);
                    consumeVaultFacade(this.vault, facade);
                    expect(
                        this.vault.findEntriesByProperty("title", "Test Entry")[0]
                    ).to.be.an.instanceOf(Entry);
                });

                it("supports adding entries of other types", function () {
                    const facade = createVaultFacade(this.vault);
                    const entryFacade = createEntryFacade(null, { type: "note" });
                    entryFacade.fields.find((field) => field.property === "title").value =
                        "Test Entry";
                    entryFacade.parentID = this.topGroup.id;
                    facade.entries.push(entryFacade);
                    consumeVaultFacade(this.vault, facade);
                    const entry = this.vault.findEntriesByProperty("title", "Test Entry")[0];
                    expect(entry.getAttribute(Entry.Attributes.FacadeType)).to.equal("note");
                });

                it("supports deleting groups", function () {
                    const facade = createVaultFacade(this.vault);
                    const topGroupID = this.topGroup.id;
                    const bottomGroupID = this.bottomGroup.id;
                    const groupIndex = facade.groups.findIndex(
                        (groupFacade) => groupFacade.id === topGroupID
                    );
                    facade.groups.splice(groupIndex, 1);
                    expect(this.vault.findGroupByID(topGroupID)).to.be.an.instanceOf(Group);
                    consumeVaultFacade(this.vault, facade);
                    expect(this.vault.findGroupByID(topGroupID)).to.be.null;
                    expect(this.vault.findGroupByID(bottomGroupID)).to.be.null;
                });

                it("supports moving groups", function () {
                    const facade = createVaultFacade(this.vault);
                    const otherGroupID = this.otherGroup.id;
                    const bottomGroupID = this.bottomGroup.id;
                    facade.groups.find((groupFacade) => groupFacade.id === bottomGroupID).parentID =
                        otherGroupID;
                    consumeVaultFacade(this.vault, facade);
                    const otherGroupChildren = this.vault.findGroupByID(otherGroupID).getGroups();
                    expect(otherGroupChildren[0].id).to.equal(bottomGroupID);
                });

                it("supports moving groups to root", function () {
                    const facade = createVaultFacade(this.vault);
                    const bottomGroupID = this.bottomGroup.id;
                    facade.groups.find((groupFacade) => groupFacade.id === bottomGroupID).parentID =
                        "0";
                    consumeVaultFacade(this.vault, facade);
                    expect(
                        this.vault.getGroups().find((g) => g.id === bottomGroupID)
                    ).to.be.an.instanceOf(Group);
                });

                describe("using ID placeholders", function () {
                    beforeEach(function () {
                        const facade = createVaultFacade(this.vault);
                        const newGroup1 = createGroupFacade();
                        newGroup1.title = "New 1";
                        newGroup1.id = "1";
                        const newGroup2 = createGroupFacade(null, "1");
                        newGroup2.title = "New 2";
                        newGroup2.id = "2";
                        facade.groups.push(newGroup2, newGroup1);
                        const newEntry = createEntryFacade();
                        newEntry.id = "3";
                        newEntry.parentID = "2";
                        const field = createFieldDescriptor(null, "Title", "property", "title");
                        field.value = "Test entry 3";
                        newEntry.fields.push(field);
                        facade.entries.push(newEntry);
                        consumeVaultFacade(this.vault, facade);
                    });

                    it("can create new items with relationships", function () {
                        const [parentGroup] = this.vault.findGroupsByTitle("New 1");
                        expect(parentGroup).to.be.an.instanceOf(Group);
                        const [childGroup] = parentGroup.getGroups();
                        expect(childGroup).to.be.an.instanceOf(Group);
                        const [entry] = childGroup.getEntries();
                        expect(entry).to.be.an.instanceOf(Entry);
                        expect(entry.getProperty("title")).to.equal("Test entry 3");
                    });
                });

                describe("in merge mode", function () {
                    beforeEach(function () {
                        const newVault = new Vault();
                        newVault
                            .createGroup("merged")
                            .createEntry("merged")
                            .setProperty("username", "merge")
                            .setProperty("password", "merge");
                        const newFacade = createVaultFacade(newVault);
                        consumeVaultFacade(this.vault, newFacade, {
                            mergeMode: true
                        });
                    });

                    it("can merge-in new items", function () {
                        const [mergeGroup] = this.vault.findGroupsByTitle("merged");
                        expect(mergeGroup).to.be.an.instanceOf(Group);
                        const [mergeEntry] = this.vault.findEntriesByProperty("title", "merged");
                        expect(mergeEntry).to.be.an.instanceOf(Entry);
                    });

                    it("retains existing items", function () {
                        const [existingGroup] = this.vault.findGroupsByTitle("three");
                        expect(existingGroup).to.be.an.instanceOf(Group);
                        const [existingEntry] = this.vault.findEntriesByProperty(
                            "title",
                            "Entry A"
                        );
                        expect(existingEntry).to.be.an.instanceOf(Entry);
                    });

                    // B-672: the merged-in vault (an import) has no attributes, and
                    // removing the vault's own ones lost its attachments key
                    it("keeps the vault's own attributes", function () {
                        expect(this.vault.getAttribute("ATTR_1")).to.equal("one");
                        expect(this.vault.getAttribute("ATTR_2")).to.equal("two");
                    });
                });

                describe("in merge mode, with an attachments key", function () {
                    beforeEach(function () {
                        this.vault.setAttribute(Vault.Attribute.AttachmentsKey, "the-vault-key");
                    });

                    it("keeps the attachments key when the merged vault has none", function () {
                        const newVault = new Vault();
                        newVault.createGroup("merged").createEntry("merged");
                        consumeVaultFacade(this.vault, createVaultFacade(newVault), {
                            mergeMode: true
                        });
                        expect(this.vault.getAttribute(Vault.Attribute.AttachmentsKey)).to.equal(
                            "the-vault-key"
                        );
                    });

                    it("keeps the attachments key when the merged vault has another", function () {
                        const newVault = new Vault();
                        newVault.setAttribute(Vault.Attribute.AttachmentsKey, "another-key");
                        newVault.createGroup("merged").createEntry("merged");
                        consumeVaultFacade(this.vault, createVaultFacade(newVault), {
                            mergeMode: true
                        });
                        expect(this.vault.getAttribute(Vault.Attribute.AttachmentsKey)).to.equal(
                            "the-vault-key"
                        );
                    });
                });

                describe("not in merge mode", function () {
                    it("removes attributes the facade no longer has", function () {
                        const facade = createVaultFacade(this.vault);
                        delete facade.attributes.ATTR_2;
                        consumeVaultFacade(this.vault, facade);
                        expect(this.vault.getAttribute("ATTR_1")).to.equal("one");
                        expect(this.vault.getAttribute("ATTR_2")).to.be.undefined;
                    });
                });

                describe("in merge mode, with attachments", function () {
                    // buttercup/buttercup-core#283: attachment data isn't part
                    // of a facade (only metadata is), so merging one vault's
                    // entry into another must not carry over attachment
                    // attributes - the referenced attachment doesn't actually
                    // exist in the target vault's storage.
                    const attachmentAttrKey = `${Entry.Attributes.AttachmentPrefix}fake-attachment-id`;
                    const attachmentPayload = JSON.stringify({
                        id: "fake-attachment-id",
                        name: "photo.png",
                        type: "image/png",
                        sizeOriginal: 100,
                        sizeEncrypted: 120,
                        created: "some-date",
                        updated: "some-date"
                    });

                    it("strips attachment attributes from newly merged-in entries", function () {
                        const newVault = new Vault();
                        newVault
                            .createGroup("merged")
                            .createEntry("merged")
                            .setProperty("username", "merge")
                            .setAttribute(attachmentAttrKey, attachmentPayload);
                        const newFacade = createVaultFacade(newVault);
                        consumeVaultFacade(this.vault, newFacade, { mergeMode: true });
                        const [mergeEntry] = this.vault.findEntriesByProperty("title", "merged");
                        expect(mergeEntry.getAttribute(attachmentAttrKey)).to.be.undefined;
                    });

                    it("does not remove an existing entry's real attachment attributes when merging", function () {
                        this.entryA.setAttribute(attachmentAttrKey, attachmentPayload);
                        const newVault = new Vault();
                        newVault
                            .createGroup("merged")
                            .createEntry("merged")
                            .setProperty("username", "merge");
                        const newFacade = createVaultFacade(newVault);
                        consumeVaultFacade(this.vault, newFacade, { mergeMode: true });
                        expect(this.entryA.getAttribute(attachmentAttrKey)).to.equal(
                            attachmentPayload
                        );
                    });
                });

                describe("in merge mode, with links", function () {
                    // B-681: merged-in entries get new IDs, so a link in the
                    // incoming vault can only mean one of its own entries. A
                    // link to an ID in this vault came from a hostile file
                    // and would show that entry's values on the new entry
                    const passwordLink = `${Entry.Attributes.PropertyLinkPrefix}password`;
                    const loginLink = Entry.Attributes.LoginEntry;

                    function mergeIn(target, setup) {
                        const newVault = new Vault();
                        const group = newVault.createGroup("merged");
                        setup(group);
                        consumeVaultFacade(target, createVaultFacade(newVault), {
                            mergeMode: true
                        });
                    }

                    function findMerged(vault, title) {
                        const [entry] = vault.findEntriesByProperty("title", title);
                        expect(entry).to.be.an.instanceOf(Entry);
                        return entry;
                    }

                    it("drops a property link to an entry already in the vault", function () {
                        const targetID = this.entryA.id;
                        mergeIn(this.vault, (group) => {
                            group
                                .createEntry("hostile")
                                .setProperty("password", "own value")
                                .setAttribute(passwordLink, `${targetID}:password`);
                        });
                        const merged = findMerged(this.vault, "hostile");
                        expect(merged.getAttribute(passwordLink)).to.be.undefined;
                        expect(merged.getProperty("password")).to.equal("own value");
                        // A save refreshes link copies: still nothing copied
                        this.vault._updatePropertyLinkCopies();
                        expect(merged.getProperty("password")).to.equal("own value");
                    });

                    it("drops a login entry link to an entry already in the vault", function () {
                        const targetID = this.entryA.id;
                        mergeIn(this.vault, (group) => {
                            group
                                .createEntry("hostile")
                                .setAttribute(loginLink, `${targetID}:Entry A`);
                        });
                        const merged = findMerged(this.vault, "hostile");
                        expect(merged.getAttribute(loginLink)).to.be.undefined;
                        expect(merged.getLoginEntry()).to.be.null;
                    });

                    it("drops link values that name no entry", function () {
                        mergeIn(this.vault, (group) => {
                            group
                                .createEntry("odd")
                                .setProperty("password", "own value")
                                .setAttribute(passwordLink, "not-a-link")
                                .setAttribute(loginLink, ":no id");
                        });
                        const merged = findMerged(this.vault, "odd");
                        expect(merged.getAttribute(passwordLink)).to.be.undefined;
                        expect(merged.getAttribute(loginLink)).to.be.undefined;
                    });

                    it("keeps links between merged-in entries, at their new IDs", function () {
                        mergeIn(this.vault, (group) => {
                            const account = group
                                .createEntry("account")
                                .setProperty("password", "shared secret");
                            group
                                .createEntry("linked")
                                .linkProperty("password", account)
                                .setLoginEntry(account);
                        });
                        const account = findMerged(this.vault, "account");
                        const linked = findMerged(this.vault, "linked");
                        expect(linked.getPropertyLink("password")).to.deep.equal({
                            entryID: account.id,
                            property: "password"
                        });
                        expect(linked.getLoginEntry()).to.equal(account);
                        account.setProperty("password", "changed");
                        expect(linked.getProperty("password")).to.equal("changed");
                    });

                    it("leaves the vault's existing links alone", function () {
                        this.entryB.linkProperty("password", this.entryA);
                        this.entryB.setLoginEntry(this.entryA);
                        mergeIn(this.vault, (group) => {
                            group.createEntry("merged");
                        });
                        expect(this.entryB.getPropertyLink("password").entryID).to.equal(
                            this.entryA.id
                        );
                        expect(this.entryB.getLoginEntry()).to.equal(this.entryA);
                    });
                });

                describe("not in merge mode, with links", function () {
                    it("keeps links to the vault's own entries", function () {
                        this.entryB.linkProperty("password", this.entryA);
                        this.entryB.setLoginEntry(this.entryA);
                        consumeVaultFacade(this.vault, createVaultFacade(this.vault));
                        expect(this.entryB.getPropertyLink("password").entryID).to.equal(
                            this.entryA.id
                        );
                        expect(this.entryB.getLoginEntry()).to.equal(this.entryA);
                    });
                });
            });

            describe("createVaultFacade", function () {
                beforeEach(function () {
                    const trash = this.vault.createGroup("Trash");
                    trash.createGroup("Trash sub");
                    this.trashEntry = trash.createEntry("Trash entry");
                    trash.setAttribute(Group.Attribute.Role, "trash");
                });

                it("outputs expected groups", function () {
                    const facade = createVaultFacade(this.vault);
                    const groupNames = facade.groups.map((group) => group.title);
                    expect(groupNames).to.contain("top");
                    expect(groupNames).to.contain("two");
                    expect(groupNames).to.contain("Trash");
                    expect(groupNames).to.contain("Trash sub");
                });

                it("does not output trash group when configured", function () {
                    const facade = createVaultFacade(this.vault, {
                        includeTrash: false
                    });
                    const groupNames = facade.groups.map((group) => group.title);
                    expect(groupNames).to.contain("top");
                    expect(groupNames).to.contain("two");
                    expect(groupNames).to.not.contain("Trash");
                    expect(groupNames).to.not.contain("Trash sub");
                });

                it("outputs expected entries", function () {
                    const facade = createVaultFacade(this.vault);
                    const entryIDs = facade.entries.map((entry) => entry.id);
                    expect(entryIDs).to.include(this.entryA.id);
                    expect(entryIDs).to.include(this.entryB.id);
                    expect(entryIDs).to.include(this.trashEntry.id);
                });

                it("does not output entries in trash when configured", function () {
                    const facade = createVaultFacade(this.vault, {
                        includeTrash: false
                    });
                    const entryIDs = facade.entries.map((entry) => entry.id);
                    expect(entryIDs).to.include(this.entryA.id);
                    expect(entryIDs).to.include(this.entryB.id);
                    expect(entryIDs).to.not.include(this.trashEntry.id);
                });
            });
        });
    });
});
