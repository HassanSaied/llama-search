import express, {Request, Response} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// --- Environment Variable Validation ---
// This function checks for required variables and throws an error if they're missing.
const validateEnvVariables = () => {
    const requiredEnvVars = ['GROQ_API_KEY','BRAVE_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
};

// Run the validation function immediately
validateEnvVariables();
// --- End Validation ---


import {llm_search} from "./llm_integration"
import {performWebSearch, searchArxiv} from "./web_searcher";
import {type UserQuery, type LlmSearchResults as searchResults, type ArxivSearchParams} from "@llama-search/types";
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';





const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
    origin: '*',
    allowedHeaders :'*'
};

app.use(cors(corsOptions)); // 👈 Use the cors middleware
app.use(cookieParser());
app.use(express.json());

enum JobStatus {
    InProgress = 'InProgress',
    Finished = 'Finished',
}


interface CacheEntry {
    promise: Promise<searchResults | undefined>; // The data returned from Brave API
    data: searchResults | undefined;
    timestamp: number;
    status: JobStatus;
}

// The cache will store results using the query string as the key
const normalQueryCache = new Map<string, CacheEntry>();
const scientificQueryCache = new Map<string, CacheEntry>();
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;


const performSearch = async (query: UserQuery): Promise<searchResults | undefined> => {
    const urls = await performWebSearch(query);
    if (urls !== undefined) {
        return await llm_search(query.query, urls)
    }
}

const performAcademicSearch = async (query: UserQuery): Promise<searchResults | undefined> => {
    const search_params: ArxivSearchParams = {
        search_query: query.query,
        start: 0,
        max_results: query.result_count,
    };
    const urls = await searchArxiv(search_params);
    if (urls !== undefined) {
        return await llm_search(query.query, urls)
    }
    return urls;
}

const performCachedRequest = async (query: UserQuery, scientific_search: boolean, queryCache : Map<string, CacheEntry>): Promise<searchResults | undefined> => {
    const query_text = query.query;
    if (queryCache.has(query_text)) {
        const cachedEntry = queryCache.get(query_text)!; // Get the cached item
        const isCacheValid = (Date.now() - cachedEntry.timestamp) < (scientific_search ? DAY_IN_MS :  FIVE_MINUTES_IN_MS);
        if (!isCacheValid) {
            //remove too old results from the cache
            console.log('Deleting old entry from cache');
            queryCache.delete(query_text);
        }
    }

    let llm_response: searchResults | undefined = undefined;
    if (queryCache.has(query_text)) {

        //WE have an entry in the cache, we just need to check it's status
        if (queryCache.get(query_text)?.status === JobStatus.Finished) {
            //The data is ready, just return it
            console.log('Grabbing ready data');
            llm_response = queryCache.get(query_text)?.data;
        } else if (queryCache.get(query_text)?.status === JobStatus.InProgress) {
            //we need to wait till the first response is done
            console.log('Waiting for previous request to finish');
            llm_response = await queryCache.get(query_text)?.promise;
        }
    } else {
        console.log(`First time seeing ${query_text}, starting processing`);
        const llm_promise = scientific_search ? performAcademicSearch(query) : performSearch(query);
        const newCacheEntry: CacheEntry = {
            data: undefined,
            promise: llm_promise,
            timestamp: Date.now(),
            status: JobStatus.InProgress
        };
        queryCache.set(query_text, newCacheEntry);
        llm_response = await llm_promise;
    }
    if (queryCache.has(query_text)) {
        const cachedEntry = queryCache.get(query_text); // Get the cached item
        if (cachedEntry) {
            cachedEntry.status = JobStatus.Finished;
            cachedEntry.data = llm_response;
            cachedEntry.timestamp = Date.now();
        }
    }
    return llm_response;
}
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World! The LLM wrapper is running.');
});

const add_session_id = (req: Request, res: Response):string => {
    let sessionId: string | undefined = req.cookies.session_id;
    if (!sessionId) {
        sessionId = uuidv4();
        console.log(`New user connected. Assigning session ID: ${sessionId}`);
    }

    res.cookie('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    });
    return sessionId
}

/**
 * The main API endpoint.
 * Expects a POST request with a JSON body like: { "query": "your search query" }
 */
app.post('/process-query', async (req: Request, res: Response) => {

    const body: UserQuery = req.body;
    const {query} = body
    console.log(query);
    const session_id = add_session_id(req,res)

    if (!query) {
        return res.status(400).json({error: 'Query is required.'});
    }
    try {
        const llm_response = await performCachedRequest(req.body, false,normalQueryCache);
        res.status(200).json({result: llm_response});

    } catch (error) {
        console.error('Error in /api/process-query:', error);
        res.status(500).json({error: 'An internal server error occurred.'});
    }


});

app.post('/process-academic-query', async (req: Request, res: Response) => {
    const body: UserQuery = req.body;
    const {query} = body
    console.log(query);
    const session_id = add_session_id(req,res)

    if (!query) {
        return res.status(400).json({error: 'Query is required.'});
    }
    try {
        const llm_response = await performCachedRequest(req.body, true,scientificQueryCache);
        res.status(200).json({result: llm_response});

    } catch (error) {
        console.error('Error in /api/process-academic-query:', error);
        res.status(500).json({error: 'An internal server error occurred.'});
    }


});

app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
});
