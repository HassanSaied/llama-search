import {z} from "zod";

export interface UserQuery {
    query: string;
    result_count: number;
}

// Interface for the search parameters
export interface ArxivSearchParams {
    search_query: string;
    start: number;
    max_results: number;
}

export const outputSchema = z.object({
    query : z.string(),
    summary: z.string(),
    sources: z.array(z.object({
        title : z.string(),
        url : z.string(),
        summary : z.string()
    }))
});

export type LlmSearchResults = z.infer<typeof outputSchema>;