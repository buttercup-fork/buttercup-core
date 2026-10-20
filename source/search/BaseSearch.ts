import levenshtein from "fast-levenshtein";
import { StorageInterface } from "../storage/StorageInterface.js";
import { buildSearcher } from "./searcher.js";
import { Vault } from "../core/Vault.js";
import { extractTagsFromSearchTerm, tagsMatchSearch } from "./tags.js";
import { extractEntryTypesFromSearchTerm } from "./entryTypes.js";
import { EntryID, EntryType, GroupID, VaultFacade, VaultID, VaultSourceID } from "../types.js";

interface DomainScores {
    [domain: string]: number;
}

interface URLSearchResult {
    item: ProcessedSearchEntry;
    score: number;
    url: string;
    domainScore: number;
}

type EntryFetcher<T> = (
    target: T,
    memory: StorageInterface
) => Promise<Array<ProcessedSearchEntry>>;

export interface ProcessedSearchEntry extends SearchResult {
    domainScores: DomainScores;
}

export interface SearcherFactory {
    (items: Array<any>): any;
}

export interface SearchResult {
    entryType: EntryType;
    groupID: GroupID;
    id: EntryID;
    properties: { [property: string]: string };
    tags: Array<string>;
    sourceID?: VaultSourceID;
    urls: Array<string>;
    vaultID: VaultID;
}

interface SearchScores {
    [vaultID: string]: {
        [entryID: string]: DomainScores;
    };
}

interface ParsedHost {
    exact: boolean;
    labels: Array<string>;
    port: string;
}

/**
 * Parse the host part of a URL, as returned by `extractDomain` (it can hold
 * user info and a port). Lowercases, drops the trailing dot and converts a
 * non-ASCII name to punycode where the platform can (otherwise the name is kept
 * as it is, which can only fail to match, never match wrongly).
 */
function parseHost(authority: string): ParsedHost | null {
    const hostPort = authority.slice(authority.lastIndexOf("@") + 1);
    const portMatch = /:(\d+)$/.exec(hostPort);
    let host = (portMatch ? hostPort.slice(0, portMatch.index) : hostPort).toLowerCase();
    if (/[^\x00-\x7f]/.test(host)) {
        try {
            host = new URL(`http://${host}`).hostname;
        } catch (err) {}
    }
    host = host.replace(/\.$/, "");
    if (!host) return null;
    return {
        // IP addresses and localhost have no parent domain
        exact: host === "localhost" || /^\[.*\]$/.test(host) || /^\d+(\.\d+){3}$/.test(host),
        labels: host.split("."),
        port: portMatch ? portMatch[1] : ""
    };
}

/**
 * Whether an entry's host and a page's host are related: the same host, or one is a
 * subdomain of the other, compared label by label (so `example.com` is not related
 * to `evilexample.com`). IP addresses and localhost must match exactly. The port
 * must be the same.
 */
function domainsRelated(domain1: string, domain2: string): boolean {
    const host1 = parseHost(domain1);
    const host2 = parseHost(domain2);
    if (!host1 || !host2 || host1.port !== host2.port) return false;
    const [shorter, longer] =
        host1.labels.length <= host2.labels.length ? [host1, host2] : [host2, host1];
    if (shorter.exact || longer.exact) {
        return shorter.labels.join(".") === longer.labels.join(".");
    }
    const offset = longer.labels.length - shorter.labels.length;
    return shorter.labels.every((label, index) => label === longer.labels[offset + index]);
}

function extractDomain(str: string): string {
    const match = /^((https?|ftp):\/\/)?([^\/]+)/i.exec(str);
    return (match && match[3]) || "";
}

export class BaseSearch<T extends Vault | VaultFacade = Vault | VaultFacade> {
    _entries: Array<ProcessedSearchEntry> = [];
    _entryFetcher: EntryFetcher<T>;
    _fuse: any = null;
    _memory: StorageInterface;
    _results: Array<SearchResult> = [];
    _searcherFactory: SearcherFactory;
    _scores: SearchScores = {};
    _targets: Array<T>;

    constructor(
        targets: Array<T>,
        entryFetcher: EntryFetcher<T>,
        memory = new StorageInterface(),
        searcherFactory: SearcherFactory = buildSearcher
    ) {
        this._targets = targets;
        this._entryFetcher = entryFetcher;
        this._memory = memory;
        this._searcherFactory = searcherFactory;
    }

    /**
     * Last search results
     * @deprecated Use `getResults` instead
     */
    get results(): Array<SearchResult> {
        return this._results;
    }

    /**
     * Get last search results
     * @returns An array of results
     */
    getResults(): Array<SearchResult> {
        return this._results;
    }

    /**
     * Increment the score of a URL in an entry
     * @param vaultID The vault ID
     * @param entryID The entry ID
     * @param url The URL to increment for
     */
    async incrementScore(vaultID: VaultID, entryID: EntryID, url: string) {
        const scoresRaw = await this._memory.getValue(`bcup_search_${vaultID}`);
        let vaultScore: { [entryID: string]: DomainScores } = {};
        if (scoresRaw) {
            try {
                vaultScore = JSON.parse(scoresRaw);
            } catch (err) {}
        }
        const domain = extractDomain(url);
        if (!domain) return;
        vaultScore[entryID] = vaultScore[entryID] || {};
        vaultScore[entryID][domain] = vaultScore[entryID][domain]
            ? vaultScore[entryID][domain] + 1
            : 1;
        await this._memory.setValue(`bcup_search_${vaultID}`, JSON.stringify(vaultScore));
    }

    /**
     * Prepare the search instance by processing
     * entries
     */
    async prepare(): Promise<void> {
        this._entries = [];
        this._scores = {};
        for (const target of this._targets) {
            // Get scores
            const scoresRaw = await this._memory.getValue(`bcup_search_${target.id}`);
            if (scoresRaw) {
                try {
                    const scores = JSON.parse(scoresRaw);
                    this._scores[target.id] = scores;
                } catch (err) {}
            }
            // Process entries
            const entries = await this._entryFetcher(target, this._memory);
            this._entries.push(...entries);
        }
        // Instantiate new searcher
        this._fuse = this._searcherFactory(this._entries);
    }

    /**
     * Search for entries by term
     * The term can include filters: `#tag` (entries must have every tag
     * given) and `type:<entry type>`, eg. `type:login` or `type:ssh_key`
     * (entries must be one of the types given). A term with only filters
     * returns every matching entry.
     * @param term The term to search for
     * @returns An array of search results
     */
    searchByTerm(term: string): Array<SearchResult> {
        if (!this._fuse) {
            throw new Error("Searching interface not prepared");
        }
        const { entryTypes, term: termWithoutTypes } = extractEntryTypesFromSearchTerm(term);
        const { tags, term: searchTerm } = extractTagsFromSearchTerm(termWithoutTypes);
        if (tags.length > 0 || entryTypes.length > 0) {
            // Instantiate new searcher based on a subset of entries: every
            // tag must match, and the entry must be one of the types (an
            // entry has only one type)
            const subset = this._entries.filter(
                (entry) =>
                    (tags.length === 0 || tagsMatchSearch(tags, entry.tags)) &&
                    (entryTypes.length === 0 || entryTypes.includes(entry.entryType))
            );
            if (searchTerm.trim().length === 0) {
                // Filters only, return all matching entries
                return subset;
            }
            this._fuse = this._searcherFactory(subset);
        } else {
            // Reset instance
            this._fuse = this._searcherFactory(this._entries);
        }
        this._results = this._fuse
            .search(searchTerm)
            .map((result: { item: SearchResult }) => result.item);
        return this._results;
    }

    /**
     * Search for entries by URL
     * @param url The URL to search with
     * @returns An array of search results
     */
    searchByURL(url: string): Array<SearchResult> {
        const incomingDomain = extractDomain(url);
        if (!incomingDomain) {
            this._results = [];
            return this._results;
        }
        const results = this._entries.reduce((output: Array<URLSearchResult>, entryItem) => {
            let bestScore = Infinity;
            const bestURL = entryItem.urls.reduce((best: string | null, next) => {
                const thisDomain = extractDomain(next);
                if (!thisDomain) return best;
                if (!domainsRelated(thisDomain, incomingDomain)) return best;
                const score = levenshtein.get(next, url);
                if (score < bestScore) {
                    bestScore = score;
                    return next;
                }
                return best;
            }, null);
            if (!bestURL) return output;
            const resultDomain = extractDomain(bestURL);
            return [
                ...output,
                {
                    item: entryItem,
                    score: bestScore,
                    url: bestURL,
                    domainScore: Math.max(
                        entryItem.domainScores[incomingDomain] || 0,
                        entryItem.domainScores[resultDomain] || 0
                    )
                }
            ];
        }, []);
        this._results = results
            .sort((a, b) => {
                if (a.domainScore > b.domainScore) {
                    return -1;
                } else if (b.domainScore > a.domainScore) {
                    return 1;
                }
                if (a.score > b.score) {
                    return 1;
                } else if (b.score > a.score) {
                    return -1;
                }
                return 0;
            })
            .map((result: { item: SearchResult }) => result.item);
        return this._results;
    }
}
