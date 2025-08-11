import {SafeSearchLevel, type SearchResult, WebSearchApiResponse} from "brave-search/dist/types";
import {BraveSearch} from "brave-search";
import {type UserQuery, type ArxivSearchParams} from "@llama-search/types"

import {XMLParser} from 'fast-xml-parser';


// Now you can safely access your variables anywhere in your app
const braveKey = process.env.BRAVE_API_KEY;

export const extractOrderedUrls = (webSearchResults: WebSearchApiResponse) => {
    var urls: string [] = [];

    if (webSearchResults.mixed?.main !== undefined) {
        var result_used: boolean [] = new Array(webSearchResults.web?.results.length).fill(false);
        for (const result_ref of webSearchResults.mixed.main) {
            if (result_ref.type !== 'web' || result_ref.index === undefined) {
                continue;
            }
            if (result_ref.all) {
                const all_remaining_urls: string [] = result_used.filter((used) => !used).map((used, idx) => {
                    return webSearchResults.web?.results.at(idx)?.url
                })
                    .filter((url) => url !== undefined)

                urls.push(...all_remaining_urls)
                break;
            } else {
                const url: string | undefined = webSearchResults.web?.results.at(result_ref.index)?.url;
                result_used[result_ref.index] = true;
                if (url !== undefined) {
                    urls.push(url)
                }
            }
        }
        return urls;
    }
}


export const performWebSearch = async (query: UserQuery): Promise<string[] | undefined> => {

    const BRAVE_API_KEY = braveKey || "";
    const user_query: UserQuery = query;
    console.log("brave_key",BRAVE_API_KEY);
    const braveSearch = new BraveSearch(BRAVE_API_KEY);
    const webSearchResults = await braveSearch.webSearch(user_query.query, {
        count: user_query.result_count,
        safesearch: SafeSearchLevel.Off,
        search_lang: "en",
        country: "US",
        text_decorations: false,
    });
    var urls: string [] | undefined;


    if (webSearchResults.mixed?.main === undefined) {
        //just take all urls in web
        urls = webSearchResults.web?.results.map((result: SearchResult) => result.url);
    } else {
        // now we need to respect the order in mixed, I think it's gonna be ordered sequentially, but
        // it's not mentioned explicitly in the docs, so a little bit of handling it here
        urls = extractOrderedUrls(webSearchResults);
    }
    console.log(urls);


    return urls;

};


// You can place this code in a new file like 'src/arxiv-client.ts' in your backend

// A simplified interface for a parsed arXiv entry
export interface ArxivEntry {
    id: string;
    updated: string;
    published: string;
    title: string;
    summary: string;
    author: { name: string } | Array<{ name: string }>;
    link: { '@_href': string };
}

/**
 * Fetches and parses data from the arXiv API.
 * @param params - The search parameters for the arXiv query.
 * @returns A promise that resolves to an array of article entries.
 */
export async function searchArxiv(params: ArxivSearchParams): Promise<string[]> {
    const baseUrl = 'http://export.arxiv.org/api/query';

    // Use URLSearchParams to safely construct the query string
    const searchParams = new URLSearchParams({
        search_query: params.search_query,
        start: params.start.toString(),
        max_results: params.max_results.toString(),
    });

    const url = `${baseUrl}?${searchParams.toString()}`;
    console.log(`Fetching from arXiv: ${url}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Get the response as raw text (since it's XML)
        const xmlText = await response.text();

        // Initialize the parser and parse the XML
        // The 'ignoreAttributes: false' option is needed to get the 'href' from links
        const parser = new XMLParser({ignoreAttributes: false});
        const parsedData = parser.parse(xmlText);

        // The articles are located in the 'feed.entry' property
        const entries = parsedData.feed.entry || [];

        // Ensure the result is always an array
        const entries_array = Array.isArray(entries) ? entries : [entries];
        const urls = entries_array.map((entry: ArxivEntry) => {
            return entry.id
        });
        return urls;

    } catch (error) {
        console.error("Failed to fetch from arXiv:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}