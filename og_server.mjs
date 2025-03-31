import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import axios from 'axios';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SFU_BASE_URL = "https://www.sfu.ca/bin/wcm/course-outlines";
const FLASK_SCRAPER_URL = "http://localhost:5001/scrape";

const URLS = [
    "https://www.sfu.ca/students/calendar/2025/summer/courses/cmpt.html",
    "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html",
    "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/minor.html",
    "https://www.sfu.ca/students/admission/programs/a-z/c/computing-science/careers.html",
    "https://www.sfu.ca/students/calendar/2025/spring/areas-of-study/engineering-science.html",
    "https://www.sfu.ca/students/calendar/2025/spring/programs/computer-and-electronics-design/minor.html",
    "https://www.sfu.ca/students/calendar/2025/spring/programs/mechatronic-systems-engineering/major/bachelor-of-applied-science.html",
    "https://www.sfu.ca/students/calendar/2025/spring/programs/software-systems/major/bachelor-of-science.html",
    "https://www.sfu.ca/students/admission/programs/a-z/s/software-systems/requirements.html",
    "https://www.sfu.ca/students/admission/programs/a-z/s/software-systems/careers.html",
    "https://www.sfu.ca/students/admission/programs/a-z/s/software-systems/apply.html",
    "https://www.sfu.ca/students/calendar/2025/spring/programs/sustainable-energy-engineering/major/bachelor-of-applied-science.html",
    "https://www.sfu.ca/students/admission/programs/a-z/s/sustainable-energy-engineering/careers.html",
    "https://www.sfu.ca/students/admission/programs/a-z/s/sustainable-energy-engineering/requirements.html",
    "https://www.sfu.ca/students/admission/programs/a-z/s/sustainable-energy-engineering/apply.html",
    "https://www.sfu.ca/students/admission/programs/arts-social-sciences/minors.html",
    "https://www.sfu.ca/students/admission/programs/arts-social-sciences/majors.html",
    "https://www.sfu.ca/students/admission/programs/arts-social-sciences/joint-majors.html",
    "https://www.sfu.ca/students/admission/programs/arts-social-sciences/certificates.html",
    "https://www.sfu.ca/students/admission/programs/business/majors.html",
    "https://www.sfu.ca/students/admission/programs/environment/minors.html",
    "https://www.sfu.ca/students/admission/programs/environment/majors.html",
    "https://www.sfu.ca/students/admission/programs/environment/joint-majors.html",
    "https://www.sfu.ca/students/admission/programs/environment/certificates.html"
];

let vectorStore;

async function initializeVectorStore() {
    const loaders = URLS.map(url => new CheerioWebBaseLoader(url, {
        selector: "body"
    }));
    const docs = await Promise.all(loaders.map(loader => loader.load()));
    const flatDocs = docs.flat();

    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const splitDocs = await textSplitter.splitDocuments(flatDocs);

    const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
    vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    console.log("Vector store initialized.");
}

(async () => {
    await initializeVectorStore();
})();

// Store course context globally
let courseContext = {};


const fetchAvailableSections = async (year, term, department, courseNumber) => {
    if (!year || !term || !department || !courseNumber) {
        return { error: "Missing required parameters for fetching course sections." };
    }

    const formattedCourseNumber = courseNumber.toString().toUpperCase();
    const formattedTerm = term.toLowerCase();
    const formattedDepartment = department.toUpperCase();
    const url = `${SFU_BASE_URL}?${year}/${formattedTerm}/${formattedDepartment}/${formattedCourseNumber}`;
    console.log(`🔍 Sections API URL: ${url}`);

    try {
        const response = await axios.get(url);
        console.log(`📄 API Response:`, response.data); // Log the response data

        // Filter sections to include only lectures (classType: 'e')
        const sections = response.data.filter(sec => sec.classType === 'e');
        if (!sections.length) {
            console.log("❌ No lecture sections available for this course.");
            return { error: "No lecture sections available for this course." };
        }

        return { sections };
    } catch (error) {
        console.log(`❌ Error fetching sections for ${courseNumber}: ${error}`);
        return { error: "Could not fetch course sections. It may not exist." };
    }
};


const fetchCourseOutline = async (year, term, department, courseNumber, section) => {
    if (!year || !term || !department || !courseNumber) {
        return { error: "Missing required parameters for fetching course outline." };
    }

    const formattedCourseNumber = courseNumber.toString().toUpperCase();
    const formattedTerm = term.toLowerCase();
    const formattedDepartment = department.toUpperCase();
    const url = `${SFU_BASE_URL}?${year}/${formattedTerm}/${formattedDepartment}/${formattedCourseNumber}/${section}`;
    console.log(`🔍 API URL: ${url}`);

    try {
        const response = await axios.get(url);
        return { data: response.data, url }; // Include URL for further use
    } catch (error) {
        return { error: "Could not fetch course outline. It may not exist." };
    }
};

const formatCourseOutline = (data, url) => {
    if (!data.info) return "❌ Course outline not found.";

    let outlineUrl = "";
    try {
        const [termPart, year] = data.info.term.toLowerCase().split(' ');
        const [dept, courseNum, section] = data.info.name.toLowerCase().split(' ');
        outlineUrl = `https://www.sfu.ca/outlines.html?${year}/${termPart}/${dept}/${courseNum}/${section}`;
    } catch (error) {
        outlineUrl = "URL generation failed - invalid course data format";
    }

    return `📚 *${data.info.title}* (${data.info.name})

📅 *Term:* ${data.info.term}  
🏛 *Campus:* ${data.courseSchedule?.[0]?.campus || "Not available"}  
🎓 *Instructor:* ${data.instructor?.[0]?.name || "Not available"}  
📖 *Description:* ${data.info.description}


📝 *Prerequisites:* ${data.info.prerequisites || "None listed"}  

📝 *Grading Notes:* ${data.info.gradingNotes || "Not specified"}  
📚 *Required Texts:* ${data.requiredText?.map(t => t.details).join("\n") || "None listed"}  
🗓 *Schedule:* ${data.courseSchedule?.map(s => `${s.days}: ${s.startTime} - ${s.endTime}`).join("\n") || "Not available"}  

🔗 [Here is the provided link for the course outline for further info](${outlineUrl})
`;
};

const extractCourseDetails = (message) => {
    // Match year (e.g., 2023)
    const yearMatch = message.match(/\b(20\d{2})\b/);
    // Match term (case-insensitive)
    const termMatch = message.match(/\b(spring|summer|fall)\b/i);
    // Match department code (e.g., CMPT, MATH, etc.)
    const departmentMatch = message.match(/\b([A-Za-z]{3,4})\s+\d{3}\b/);
    // Match course number with optional trailing letters (e.g., 225, 225W)
    const courseNumberMatch = message.match(/\b(\d{3}[A-Za-z]?)\b/);
    
    const sectionMatch = message.match(/\b([dD]\d{3})\b/); 

    const year = yearMatch ? yearMatch[1] : null;
    const term = termMatch ? termMatch[1].toLowerCase() : null;
    const department = departmentMatch ? departmentMatch[1].toUpperCase() : null; // Ensure department is always uppercase
    const courseNumber = courseNumberMatch ? courseNumberMatch[1].toUpperCase() : null;

    const section = sectionMatch ? sectionMatch[1].toUpperCase() : null;

    console.log(`🔍 Extracted Details -> Year: ${year}, Term: ${term}, Department: ${department}, Course Number: ${courseNumber}, Section: ${section}`);
    return { year, term, department, courseNumber, section };
};


  

app.post("/chat", async (req, res) => {
    try {
        const { message } = req.body;
        console.log(`📝 User Message: ${message}`);

        // Handle simple greetings without source links
        const greetings = ["hi", "hello", "hey", "good morning", "good afternoon"];
        if (greetings.includes(message.toLowerCase().trim())) {
            return res.json({ response: "Hello! How can I assist you today?" });
        }


        // Check if the user is providing a section directly (e.g., D100)
        const sectionMatch = message.match(/^d\d{3}$/i);
        if (sectionMatch) {
            const section = sectionMatch[0].toUpperCase();
            if (courseContext.year && courseContext.term && courseContext.department && courseContext.courseNumber) {
                const { data, error, url } = await fetchCourseOutline(courseContext.year, courseContext.term, courseContext.department, courseContext.courseNumber, section);
                if (error) {
                    return res.status(404).json({ response: "Sorry, I couldn't find the course outline for that section. Please check the details and try again." });
                }
                const formattedOutline = formatCourseOutline(data, url);
                return res.json({ response: formattedOutline });
            } else {
                return res.json({ response: "Please first ask for the course outline (e.g., CMPT 225 Summer 2024) before specifying the section." });
            }
        }

        const { year, term, department, courseNumber } = extractCourseDetails(message);

        if (year && term && department && courseNumber) {
            // Store course context
            courseContext = { year, term, department, courseNumber };

            const { sections, error } = await fetchAvailableSections(year, term, department, courseNumber);
            if (error || !sections.length) {
                return res.status(404).json({ response: "No sections available for this course." });
            }

            const sectionList = sections.map(sec => `${sec.text} - ${sec.title}`).join("\n");
            return res.json({
                response: `Here are the available sections for ${department} ${courseNumber} (${term} ${year}):\n${sectionList}\n\nPlease type the section code (e.g., D100) to get the course outline.`
            });
        }

        //const { year, term, department, courseNumber, section } = extractCourseDetails(message);

        // Validate extracted details
        // if (year && term && department && courseNumber) {
        //     if (!section) {
        //         // Step 1: No section provided, fetch available sections
        //         const { sections, error } = await fetchAvailableSections(year, term, department, courseNumber);
        //         if (error || !sections.length) {
        //             return res.status(404).json({ response: "No sections available for this course." });
        //         }

        //         console.log(`✅ Available Sections for ${courseNumber}:`, sections); // Log the available sections
            
        //          // Step 2: Display available sections to the user
        //         const sectionList = sections.map(sec => `${sec.text} - ${sec.title}`).join("\n");
        //         return res.json({
        //             response: `Here are the available sections for ${department} ${courseNumber} (${term} ${year}):\n${sectionList}\n\nPlease write in this format ${department} ${courseNumber} ${term} ${year} and then add the section by code (e.g., D100).`
        //         });
        //     }


            //console.log("✅ Fetching course outline from REST API...");
            // const courseOutline = await fetchCourseOutline(year, term, department, courseNumber);
            // if (!courseOutline.error) {
            //     const formattedOutline = formatCourseOutline(courseOutline.data, courseOutline.url);
            //     return res.json({ response: formattedOutline });
            // } else {
            //     return res.json({ response: "Sorry, I couldn't find the course outline. Please check the details and try again." });
            // }

            // Step 3: Section provided, fetch the course outline
        //     console.log(`✅ Fetching course outline for section ${section}...`);
        //     const { data, error, url } = await fetchCourseOutline(year, term, department, courseNumber, section);
        //     if (error) {
        //         return res.status(404).json({ response: "Sorry, I couldn't find the course outline. Please check the details and try again." });
        //     }
        
        //     console.log(`✅ Course outline fetched for ${department} ${courseNumber} ${section}`); // Log the success of the fetch
        
        //     const formattedOutline = formatCourseOutline(data, url);
        //     return res.json({ response: formattedOutline });
        // }


        // If not a greeting or course request, let's do similarity check with the SFU vector store
        console.log("🔍 Checking SFU vector store for relevant docs...");

        // We retrieve the top 5 docs along with scores
        // shape: [ [Document, score], [Document, score], ... ]
        const resultsWithScores = await vectorStore.similaritySearchWithScore(message, 5);

        // If no docs found or no results
        if (!resultsWithScores || resultsWithScores.length === 0) {
        // Fallback to normal GPT
        console.log("⚠️ No SFU docs found. Falling back to normal GPT.");
        return handleFallbackLLM(message, res);
        }

        // We have at least one doc. Let's check the top doc’s score
        const [topDoc, topScore] = resultsWithScores[0];
        console.log(`Top doc's score: ${topScore}`);

        // If the top doc's score is below your threshold, fallback
        const THRESHOLD = 0.8;
        if (topScore < THRESHOLD) {
        console.log(`⚠️ Score ${topScore} < ${THRESHOLD}. Falling back to normal GPT.`);
        return handleFallbackLLM(message, res);
        }

        // 4. If above threshold, proceed with SFU retrieval chain
        console.log(`✅ Score ${topScore} >= ${THRESHOLD}. Proceeding with SFU retrieval chain...`);

        // Convert [Document, score] array -> Document array
        const relevantDocs = resultsWithScores.map(([doc, _score]) => doc);

        // We'll build a single string context from the retrieved docs
        const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");


        // If not asking for a course outline, proceed with the general query
        const llm = new ChatOpenAI({
            modelName: "gpt-3.5-turbo-16k",
            openAIApiKey: process.env.OPENAI_API_KEY,
            maxTokens: 1000
        });

        const promptTemplate = ChatPromptTemplate.fromTemplate(`You are a chat bot called AskSfu.
            Answer the question based only on the following context:
            {context}
            
            Question: {input}`);

        const documentChain = await createStuffDocumentsChain({
            llm,
            prompt: promptTemplate
        });

        const retriever = vectorStore.asRetriever({
            k: 5 // Retrieve top 5 most relevant documents
        });

        const retrievalChain = await createRetrievalChain({
            combineDocsChain: documentChain,
            retriever,
        });

        const result = await retrievalChain.invoke({
            input: message,
        });

        // Check if the answer is derived from the vector store
        let sourceUrl = "Source not available";
        if (result.context && result.context[0] && result.context[0].metadata && result.context[0].metadata.source) {
            sourceUrl = result.context[0].metadata.source;
        }

        // Append the source URL to the response only if it's available
        let responseWithSource = result.answer;
        if (sourceUrl !== "Source not available" && result.answer.toLowerCase() !== "hello! how can i assist you today?") {
            responseWithSource += `\n\nSource: ${sourceUrl}`;
        }

        res.json({ response: responseWithSource });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ error: "An error occurred" });
    }
});

/**
 * Helper function to handle fallback GPT if no relevant SFU docs
 */
async function handleFallbackLLM(message, res) {
    // Make a normal LLM call
    const fallbackLLM = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-16k",
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000
    });
  
    // Provide a system prompt for general conversation
    const fallbackResponse = await fallbackLLM.call([
      {
        role: "system",
        content: "You are a friendly chatbot that can discuss any topic, not limited to SFU."
      },
      {
        role: "user",
        content: message
      }
    ]);
  
    // fallbackResponse.text contains the LLM's response
    return res.json({ response: fallbackResponse.text });
  }

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
