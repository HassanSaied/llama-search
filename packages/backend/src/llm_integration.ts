import {groq, Groq} from "@llamaindex/groq";
import {type LlmSearchResults,outputSchema} from "@llama-search/types";
import {z} from "zod";



// Now you can safely access your variables anywhere in your app
const groqKey = process.env.GROQ_API_KEY;

  const llm = new Groq({
    model : "moonshotai/kimi-k2-instruct",
    apiKey : groqKey
  });


export async function llm_search(query : string,urls : string []) : Promise<LlmSearchResults> {
  //response format as zod schema
  const response = await llm.chat({
    messages: [
      {
        role: "system",
        content: `You are a search assistant for summarizing a search result given a query and a list of urls, You should summarize the data available in those specific urls only`,
      },
      {
        role: "user",
        content: `My quey is ${query} and the urls are \n------\n${urls.join("\n")}\n------`,
      },
    ],
      responseFormat: {
            type: "json_schema",
            json_schema: {
                name: "URLSearchResult",
                schema: z.toJSONSchema(outputSchema)
            }
        },
  });
  // for await (const chunck of response){
  //     console.log(chunck.delta);
  // }
  console.log(response.message.content);
    let parsedResponse = undefined;
    // The type guard check
    if (typeof response.message.content === 'string') {
        // --- Safe to parse here ---
        // Inside this block, TypeScript knows messageContent is a string.
            parsedResponse = JSON.parse(response.message.content);
    } else {
        // --- Handle the array case here ---
        // --- I am very sure that this clause should not be reachable, so I will throw something here
        // --- This is analogues to the LLM API call failing, and I should properly handle this case
    }
//   const rawResult = JSON.parse()
    return outputSchema.parse(parsedResponse);
}