import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import puppeteer from 'puppeteer';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static("."));

const CLUB_KEYWORDS_MAP = {
  // Tech & Programming
  "coding": ["tech","developers", "google developer", "cybersecurity", "programming", "software", "game development", "AI", "competitive programming"],
  "programming": ["developers", "google developer", "coding", "software", "hacking", "AI", "competitive programming"],
  "developer": ["developers", "google developer", "cybersecurity", "software", "app development", "game development"],
  "cybersecurity": ["hacking", "security", "privacy", "ethical hacking", "developers"],
  "game development": ["game developers", "game design", "game programming", "gamedev"],
  "AI": ["machine learning", "deep learning", "data science", "neural networks", "quantum computing"],
  "data science": ["AI", "statistics", "machine learning", "big data"],

  // Business & Finance
  "business": ["beedie", "entrepreneurship", "finance", "marketing", "startups", "investment"],
  "entrepreneurship": ["business", "startups", "founders", "finance", "networking"],
  "marketing": ["business", "advertising", "social media", "branding"],
  "finance": ["investing", "stocks", "trading", "accounting", "investment", "financial literacy"],
  "investment": ["finance", "stocks", "equity", "venture capital", "real estate"],

  // Debating & Public Speaking
  "debating": ["debate", "public speaking", "model un", "argumentation", "toastmasters"],
  "debate": ["debating", "public speaking", "model un", "critical thinking"],
  "public speaking": ["debating", "toastmasters", "leadership", "speech", "presentation"],

  // Science & Engineering
  "robotics": ["engineering", "hardware", "electronics", "AI", "automation", "mechatronics"],
  "engineering": ["robotics", "civil", "mechanical", "electrical", "design", "aerospace", "rocket"],
  "quantum computing": ["AI", "machine learning", "data science", "physics", "computing"],
  "data analytics": ["finance", "business", "big data", "sports analytics", "statistics"],

  // Sports & Outdoor Activities
  "hiking": ["outdoors", "adventure", "camping", "trekking"],
  "climbing": ["rock climbing", "bouldering", "indoor climbing"],
  "badminton": ["racket sports", "tennis", "ping pong"],
  "skiing": ["snowboarding", "winter sports", "mountain sports"],
  "martial arts": ["taekwondo", "karate", "judo", "bjj", "self-defense"],
  "dragon boat": ["rowing", "paddling", "team sports"],

  // Culture & Arts
  "music": ["choir", "jazz", "orchestra", "rock music", "band"],
  "dance": ["bhangra", "giddha", "hip hop", "latin dance", "bollywood", "salsa", "bachata"],
  "photography": ["photo", "camera", "visual arts", "media"],
  "anime": ["manga", "cosplay", "animation", "japanese culture"],
  "writing": ["creative writing", "poetry", "literature", "novels"],
  "graphic novels": ["comics", "illustration", "visual storytelling"],

  // Social & Cultural
  "volunteering": ["charity", "fundraising", "service", "ngo", "awareness"],
  "sustainability": ["climate change", "environment", "green", "eco-friendly"],
  "politics": ["government", "activism", "policy", "conservative", "liberal", "ndp", "student government"],
  "women in stem": ["women in tech", "gender equality", "diversity", "women in engineering"],
  "mental health": ["stress-free", "happiness", "well-being", "mindfulness"],
  "religion": ["christian", "muslim", "hindu", "sikh", "buddhist"],
  "christian": ["bible", "faith", "jesus", "evangelical", "catholic"],
  "muslim": ["islam", "prayer", "quran", "msa"],
  "hindu": ["culture", "tradition", "festivals", "hindu yuva"],
  "sikh": ["gurdwara", "community", "seva"],
  "jewish": ["judaism", "hillel", "torah"],

  // Miscellaneous
  "gaming": ["esports", "smash", "pokemon go", "tabletop"],
  "technology": ["AI", "robotics", "cybersecurity", "quantum computing"],
  "food": ["foodie", "cuisine", "restaurants", "cooking"],
  "medicine": ["pre-med", "healthcare", "biology", "science"],
  "law": ["pre-law", "law school", "justice", "legal studies"]
};

const SFU_CLUBS = [
  "350 - SFU", "Accounting Student Association - SFU", "Ace SFU", "Afghanistan Student Union",
    "Ahmadiyya Muslim Student Association (AMSA)", "AIESEC", "ALAS (Association of Latin American Students)",
    "Anime Club - SFU", "Arab Students' Association", "Ascend Leadership", "Astronomy Club - SFU",
    "Backpacking Club", "Bangladesh Students' Alliance", "Bhangra - SFU", "Bowling 300", "BRASA SFU",
    "Burnaby Mountain Toastmasters", "Campus Association of Baha'i Studies", "Campus Vibe for Christ",
    "Canadian Cancer Society - SFU", "Canadian Liver Foundation SFU", "Canadianized Asian Club (CAC)",
    "CaseIT", "Chess Club - SFU", "Choir - SFU", "Christian Leadership Initiative - SFU",
    "Christian Students @ SFU", "Concert Orchestra - SFU", "Debate Society", "Developers & Systems Club",
    "Dodo Club", "EAT!SFU", "Enactus SFU", "Engineers Without Borders - SFU Chapter",
    "Ethiopian & Eritrean Students Association", "Evangelical Chinese Bible Fellowship (ECBF)",
    "Exercise is Medicine SFU", "Filipino Students Association", "Finance Student Association (FINSA)",
    "Game Developers Club", "Giddha - SFU", "Google Developer Student Club - SFU", "Hanvoice SFU",
    "Hiking Club", "Hillel Jewish Students Association", "Hip Hop Club - SFU", "Hong Kong Society (HKS)",
    "Human Resources Student Association", "Indian Student Federation (ISF)", "Indoor Climbing Club",
    "Iranian Club - SFU", "Ismaili Students Association", "Japanese Network - SFU", "Jazz Band - Simon Fraser",
    "JDC West - SFU", "Korean Storm (K.STORM)", "Latin Dance Passion - SFU", "Love Your Neighbour Club",
    "Malaysia Singapore Students Club", "Management Information Systems Association",
    "Model United Nations - SFU", "Music Discussion Club", "Muslim Students Association",
    "NeuraXtension", "Operation Smile SFU", "Outdoors Club - SFU", "Pakistan Students Association",
    "Palestinian Youth Movement (PYM SFU)", "Phi Delta Epsilon", "Power to Change (P2C)",
    "Pre-Law Society - SFU", "Pre-Med Society - SFU", "Pre-Vet & Animal Wellness Club",
    "Provincial BC Conservatives", "Punjabi Student Association - SFU", "Reclaim Tech",
    "Rock Music Club", "SFU Artists", "SFU ASL Club", "SFU Befikre Dance Team", "SFU Blood, Organ, and Stem Cell Club",
    "SFU Cybersecurity Club", "SFU Dragon Boat", "SFU Esports Association", "SFU First Responders",
    "SFU Foodie Club", "SFU Golf Club", "SFU Hanfu Culture Society", "SFU Hindu Yuva", "SFU Magic the Gathering Club (MTG)",
    "SFU Mechanical Keyboards Club", "SFU OS Development", "SFU Peak Frequency", "SFU Pokemon Go Official Group",
    "SFU Robotics Club", "SFU Sports Analytics Club", "SFU Swifties", "SFU Thaqalyn Muslim Association",
    "SFU Transit Enthusiasts Club (SFU TEC)", "Sikh Students' Association - SFU", "Simon Fraser Investment Club",
    "Ski and Snowboard Club", "Smash Club", "Speech and Hearing Club", "STEM Fellowship", "Student Marketing Association",
    "Taiwanese Association - SFU", "Team Phantom: SFU Formula SAE Electric",
    "The FentaNIL Project at SFU (TFP)", "UNICEF - SFU", "University Bible Fellowship",
    "University Christian Ministries", "UPhoto Photography Club", "Vietnamese Student Association",
    "Women in Clean Tech", "Women In Engineering", "Women in STEM", "Young Women in Business SFU"
];

function extractClubKeywords(query) {
  const stopwords = ["is", "there", "a", "for", "club", "at", "sfu", "any", "do", "you", "have"];
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(" ")
    .filter(word => !stopwords.includes(word));
}

function matchClubs(query) {
  const keywords = extractClubKeywords(query);
  const matches = new Set();

  for (const keyword of keywords) {
    for (const club of SFU_CLUBS) {
      if (club.toLowerCase().includes(keyword)) matches.add(club);
    }
    if (CLUB_KEYWORDS_MAP[keyword]) {
      for (const related of CLUB_KEYWORDS_MAP[keyword]) {
        for (const club of SFU_CLUBS) {
          if (club.toLowerCase().includes(related)) matches.add(club);
        }
      }
    }
  }

  if (matches.size === 0) {
    for (const keyword of keywords) {
      const close = difflib.getCloseMatches(keyword, SFU_CLUBS, 3, 0.6);
      close.forEach(match => matches.add(match));
    }
  }

  return [...matches];
}

// NEW: /api/news endpoint to scrape SFU News
// app.get("/api/news", async (req, res) => {
//   try {
//     const { data } = await axios.get("https://www.sfu.ca/sfunews.html");
//     const $ = cheerio.load(data);

//     // 1. Convert all <img> src to absolute paths
//     $("img").each((i, el) => {
//       const src = $(el).attr("src");
//       if (src && !src.startsWith("http")) {
//         const absoluteUrl = new URL(src, "https://www.sfu.ca").toString();
//         $(el).attr("src", absoluteUrl);
//       }
//     });

//     // 2. Convert all <a> href to absolute paths
//     $("a").each((i, el) => {
//       const href = $(el).attr("href");
//       if (href && !href.startsWith("http")) {
//         const absoluteUrl = new URL(href, "https://www.sfu.ca").toString();
//         $(el).attr("href", absoluteUrl);
//       }
//     });

//     // 3. Now pick the .sfu-columns that has .show-date items
//     let newsHtml = "";
//     $(".sfu-columns").each((i, el) => {
//       const $col = $(el);
//       if ($col.find(".show-date").length > 0) {
//         newsHtml = $col.html();
//         return false;
//       }
//     });

//     res.json({ news: newsHtml });
//   } catch (error) {
//     console.error("Error scraping SFU News:", error);
//     res.status(500).json({ error: "Failed to scrape news" });
//   }
// });
app.get("/api/full-news", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.goto("https://www.sfu.ca/sfunews/stories/news.html", {
      waitUntil: "networkidle2"
    });

    // Click "Show All"
    await page.click("#cmp-dynamic-filter-show-all-button");
    await page.waitForSelector(".cmp-result-item", { timeout: 5000 });

    // Get full HTML after clicking
    const html = await page.content();

    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // Fix all relative <img> src attributes
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("http")) {
        $(el).attr("src", "https://www.sfu.ca" + src);
      }
    });

    // Fix all relative <a> href attributes
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        $(el).attr("href", "https://www.sfu.ca" + href);
      }
    });

    // Now extract all news blocks again
    const newsHTML = $(".cmp-result-item").map((i, el) => $.html(el)).get().join("");

    await browser.close();
    res.json({ news: newsHTML });
  } catch (err) {
    console.error("Error scraping full news:", err);
    res.status(500).json({ error: "Failed to scrape full news." });
  }
});



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Returns a default academic term based on the current date
 */
function getDefaultAcademicTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let defaultTerm = "";
  if (month >= 0 && month <= 3) {
    defaultTerm = "spring";
  } else if (month >= 4 && month <= 7) {
    defaultTerm = "summer";
  } else {
    defaultTerm = "fall";
  }
  return { defaultYear: String(year), defaultTerm };
}

const SFU_BASE_URL = "https://www.sfu.ca/bin/wcm/course-outlines";

/**
 * Utility: Gather all text from a given heading until the next <h2> or <h3>.
 */
function gatherSection($, startEl) {
  let sectionText = "";
  let current = startEl.next();
  while (current.length && !/^(h2|h3)$/i.test(current[0].tagName)) {
    sectionText += current.text().trim() + "\n";
    current = current.next();
  }
  return sectionText.trim();
}

/**
 * CustomCheerioLoader that:
 * 1) Loads <body> from the parent CheerioWebBaseLoader,
 * 2) Fetches the raw HTML via axios,
 * 3) For the CMPT major page, creates separate documents for each heading section
 *    (e.g., Lower Division Requirements, Upper Division Requirements, etc.)
 * 4) Also extracts each <div class="course"> block (combining course link, title, and units)
 */
class CustomCheerioLoader extends CheerioWebBaseLoader {
  constructor(url) {
    super(url, { selector: "body" });
    this.webPath = url;
  }

  async load() {
    const docs = await super.load();
    try {
      const response = await axios.get(this.webPath);
      const html = response.data;
      const $ = cheerio.load(html);
      const newDocs = [];
      // SFSS CLUBS HANDLING
if (this.webPath.includes("sfss.ca/clubs")) {
  $(".col-md-12 > .row").each((i, el) => {
    const name = $(el).find("h4").text().trim();
    const desc = $(el).find("p").text().trim();
    const logo = $(el).find("img").attr("src")?.trim();
    if (name && desc) {
      const clubText = `${name}\n${desc}${logo ? `\nLogo: https://go.sfss.ca/${logo}` : ""}`;
      newDocs.push(new Document({
        pageContent: clubText,
        metadata: {
          source: this.webPath,
          heading: name
        }
      }));
    }
  });
}


      // If this is the CMPT major page, gather heading sections
      if (
        this.webPath ===
        "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html"
      ) {
        $("h2, h3").each((i, el) => {
          const headingText = $(el).text().trim();
          const lowerHeading = headingText.toLowerCase();
          // Check for various headings (do not hardcode only one term)
          if (
            lowerHeading.includes("admission requirements") ||
            lowerHeading.includes("lower division requirements") ||
            lowerHeading.includes("upper division requirements") ||
            lowerHeading.includes("continuation requirements") ||
            lowerHeading.includes("internal transfer")
          ) {
            const lines = gatherSection($, $(el));
            if (lines) {
              const docText = headingText + "\n" + lines;
              newDocs.push(
                new Document({
                  pageContent: docText,
                  metadata: { source: this.webPath, heading: headingText }
                })
              );
            }
          }
        });
      }

      // Gather <div class="course"> blocks (combine course link, title, and units only)
      const courseElements = [];
      $("div.course").each((i, courseDiv) => {
        const courseLink = $(courseDiv).find("a.course-link").text().trim();
        const courseTitle = $(courseDiv).find("span.course-title").text().trim();
        const courseUnits = $(courseDiv).find("span.units").text().trim();
        let combinedText = `${courseLink} - ${courseTitle} - ${courseUnits}`;
        courseElements.push(combinedText);
      });
      const courseDocs = courseElements.map(textItem =>
        new Document({
          pageContent: textItem,
          metadata: { source: this.webPath, selector: ".course" }
        })
      );

      return [...docs, ...newDocs, ...courseDocs];
    } catch (err) {
      console.error("Error extracting content:", err);
      return docs;
    }
  }
}

// List of SFU URLs to scrape
const URLS = [
  "https://www.sfu.ca/students/calendar/2025/summer/courses/cmpt.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/minor.html",
  "https://www.sfu.ca/students/admission/programs/a-z/c/computing-science/careers.html",
  "https://www.sfu.ca/students/calendar/2025/spring/areas-of-study/engineering-science.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/computer-and-electronics-design/minor.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/mechatronic-systems-engineering/major/bachelor-of-applied-science.html",
   "https://go.sfss.ca/clubs/list.php"
];

let vectorStore;

/**
 * Build the vector store:
 * - Loads documents via CustomCheerioLoader.
 * - Splits them into chunks.
 * - Embeds them and stores them in MemoryVectorStore.
 */
async function initializeVectorStore() {
  const loaders = URLS.map(url => new CustomCheerioLoader(url));
  const docsArray = await Promise.all(loaders.map(loader => loader.load()));
  const flatDocs = docsArray.flat();
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 6000,
    chunkOverlap: 300
  });
  const splitDocs = await textSplitter.splitDocuments(flatDocs);
  const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
  vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  console.log("Vector store initialized.");
}

(async () => {
  await initializeVectorStore();
})();

// Dictionary for synonyms of major names
const majorMapping = {
  "COMPUTING SCIENCE": "CMPT",
  "CMPT": "CMPT",
  "ENGINEERING SCIENCE": "ENSC",
  "ENSC": "ENSC",
  "MECHATRONIC SYSTEMS ENGINEERING": "MSE",
  "MSE": "MSE",
  "SUSTAINABLE ENERGY ENGINEERING": "SEE",
  "SEE": "SEE",
  "SOFTWARE SYSTEMS": "SOFT",
  "SOFT": "SOFT"
};

let courseContext = {};

/**
 * Example function: fetch available sections for a course.
 */
async function fetchAvailableSections(year, term, department, courseNumber) {
  if (!year || !term || !department || !courseNumber) {
    return { error: "Missing required parameters for fetching course sections." };
  }
  const formattedCourseNumber = courseNumber.toUpperCase();
  const formattedTerm = term.toLowerCase();
  const formattedDepartment = department.toUpperCase();
  const url = `${SFU_BASE_URL}?${year}/${formattedTerm}/${formattedDepartment}/${formattedCourseNumber}`;
  console.log(`Sections API URL: ${url}`);
  try {
    const response = await axios.get(url);
    console.log("API Response:", response.data);
    const sections = response.data.filter(sec => sec.classType === 'e');
    if (!sections.length) {
      console.log("No lecture sections available for this course.");
      return { error: "No lecture sections available for this course." };
    }
    return { sections };
  } catch (error) {
    console.log(`Error fetching sections for ${courseNumber}:`, error);
    return { error: "Could not fetch course sections. It may not exist." };
  }
}

/**
 * Example function: fetch a course outline.
 */
async function fetchCourseOutline(year, term, department, courseNumber, section) {
  if (!year || !term || !department || !courseNumber) {
    return { error: "Missing required parameters for fetching course outline." };
  }
  const formattedCourseNumber = courseNumber.toUpperCase();
  const formattedTerm = term.toLowerCase();
  const formattedDepartment = department.toUpperCase();
  const url = `${SFU_BASE_URL}?${year}/${formattedTerm}/${formattedDepartment}/${formattedCourseNumber}/${section}`;
  console.log(`API URL: ${url}`);
  try {
    const response = await axios.get(url);
    return { data: response.data, url };
  } catch (error) {
    return { error: "Could not fetch course outline. It may not exist." };
  }
}

/**
 * Format the course outline data.
 */
function formatCourseOutline(data, url) {
  if (!data.info) return "Course outline not found.";
  let outlineUrl = "";
  try {
    const [termPart, year] = data.info.term.toLowerCase().split(' ');
    const [dept, courseNum, section] = data.info.name.toLowerCase().split(' ');
    outlineUrl = `https://www.sfu.ca/outlines.html?${year}/${termPart}/${dept}/${courseNum}/${section}`;
  } catch (error) {
    outlineUrl = "URL generation failed - invalid course data format";
  }
  return `${data.info.title} (${data.info.name})<br><br>
<strong>Term:</strong> ${data.info.term}<br>
<strong>Campus:</strong> ${data.courseSchedule?.[0]?.campus || "Not available"}<br>
<strong>Instructor:</strong> ${data.instructor?.[0]?.name || "Not available"}<br>
<strong>Description:</strong> ${data.info.description}<br><br>
<strong>Prerequisites:</strong> ${data.info.prerequisites || "None listed"}<br><br>
<strong>Grading Notes:</strong> ${data.info.gradingNotes || "Not specified"}<br><br>
<strong>Required Texts:</strong> ${data.requiredText?.map(t => t.details).join("<br>") || "None listed"}<br><br>
<strong>Schedule:</strong> ${data.courseSchedule?.map(s => `${s.days}: ${s.startTime} - ${s.endTime}`).join("<br>") || "Not available"}<br><br>
<a href="${outlineUrl}" target="_blank">Here is the provided link for the course outline for further info</a>`;
}

/**
 * Extract course details from the user message.
 */
function extractCourseDetails(message) {
  const yearMatch = message.match(/\b(20\d{2})\b/);
  const termMatch = message.match(/\b(spring|summer|fall)\b/i);
  const departmentMatch = message.match(/\b([A-Za-z]{3,4})\s+\d{3}\b/);
  const courseNumberMatch = message.match(/\b(\d{3}[A-Za-z]?)\b/);
  //const sectionMatch = message.match(/\b([dD]\d{3})\b/);
  //const sectionMatch = message.match(/\b([A-Za-z]\d{3})\b/);
  const sectionMatch = message.match(/\b([A-Za-z]{1,3}\d{1,3})\b/);



  const { defaultYear, defaultTerm } = getDefaultAcademicTerm();
  let year = yearMatch ? yearMatch[1] : defaultYear;
  let term = termMatch ? termMatch[1].toLowerCase() : defaultTerm;
  let department = departmentMatch ? departmentMatch[1].toUpperCase() : null;

  const upperMsg = message.toUpperCase();
  for (const key in majorMapping) {
    if (upperMsg.includes(key)) {
      department = majorMapping[key];
      break;
    }
  }

  const courseNumber = courseNumberMatch ? courseNumberMatch[1].toUpperCase() : null;
  const section = sectionMatch ? sectionMatch[1].toUpperCase() : null;

  console.log(`Extracted Details -> Year: ${year}, Term: ${term}, Department: ${department}, Course Number: ${courseNumber}, Section: ${section}`);
  return { year, term, department, courseNumber, section };
}

/**
 * Helper function to truncate text at a sentence boundary.
 * It looks for the last period before maxChars.
 */
function truncateText(text, maxChars, sourceUrl) {
  if (text.length <= maxChars) return text;
  let truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod !== -1) {
    return (
      truncated.substring(0, lastPeriod + 1) +
      `<br>...<br>For full details, please click <a href="${sourceUrl}" target="_blank">here</a>.`
    );
  }
  return (
    truncated +
    `<br>...<br>For full details, please click <a href="${sourceUrl}" target="_blank">here</a>.`
  );
}

/**
 * Main chat endpoint.
 */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    console.log(`User Message: ${message}`);

    // Simple greeting check
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon"];
    if (greetings.includes(message.toLowerCase().trim())) {
      return res.json({ response: "Hello! How can I assist you today?" });
    }

    const lower = message.toLowerCase();

    const keywords = extractClubKeywords(lower);
    const hasRelevantClubKeyword = keywords.some(kw => CLUB_KEYWORDS_MAP[kw]);

    if (hasRelevantClubKeyword) {
      const matched = matchClubs(lower);
      if (matched.length > 0) {
        return res.json({
          response: `✅ Here are some SFU clubs related to "${message}":<br>- ${matched.slice(0, 3).join("<br>- ")}<br><br>🔗 Explore more at <a href="https://go.sfss.ca/clubs/list.php" target="_blank">SFU Club List</a>`
        });
      } else {
        return res.json({
          response: `❌ Couldn't find a club match for "${message}".<br><br>🔗 Check all clubs at <a href="https://go.sfss.ca/clubs/list.php" target="_blank">SFU Club List</a>`
        });
      }
    }

    // If user typed a section code (e.g., D100)
    //const sectionMatch = message.match(/^d\d{3}$/i);
    //const sectionMatch = message.match(/^[a-zA-Z]\d{3}$/);
    const sectionMatch = message.match(/^[A-Za-z]{1,3}\d{1,3}$/);
    if (sectionMatch) {
      const section = sectionMatch[0].toUpperCase();
      if (courseContext.year && courseContext.term && courseContext.department && courseContext.courseNumber) {
        const { data, error, url } = await fetchCourseOutline(
          courseContext.year,
          courseContext.term,
          courseContext.department,
          courseContext.courseNumber,
          section
        );
        if (error) {
          return res.status(404).json({ response: "Sorry, I couldn't find the course outline." });
        }
        const formattedOutline = formatCourseOutline(data, url);
        return res.json({
          response: formattedOutline.split("\n").join("<br>") || "Course outline not available."
        });
      } else {
        return res.json({
          response: "Please first ask for the course outline (e.g., CMPT 225 Summer 2025) before specifying the section."
        });
      }
    }

    // Parse out year, term, department, and course number from the message
    const { year, term, department, courseNumber } = extractCourseDetails(message);
    if (year && term && department && courseNumber) {
      courseContext = { year, term, department, courseNumber };
      const { sections, error } = await fetchAvailableSections(year, term, department, courseNumber);
      if (error || !sections.length) {
        console.log("No sections available, falling back to GPT.");
        return handleFallbackLLM(message, res);
      }
      const sectionList = sections.map(sec => `${sec.text} - ${sec.title}`).join("<br>");
      return res.json({
        response: `Here are the available sections for ${department} ${courseNumber} (${term} ${year}):<br>${sectionList}<br><br>Please type the section code (e.g., D100) to get the course outline.`
      });
    }

    // If not a specific course request, perform a similarity search
    console.log("Checking SFU vector store for relevant docs...");
    const resultsWithScores = await vectorStore.similaritySearchWithScore(message, 5);
    if (!resultsWithScores || resultsWithScores.length === 0) {
      console.log("No SFU docs found. Falling back to GPT.");
      return handleFallbackLLM(message, res);
    }
    const [topDoc, topScore] = resultsWithScores[0];
    console.log(`Top doc's score: ${topScore}`);
    const THRESHOLD = 0.8;
    if (topScore < THRESHOLD) {
      console.log(`Score ${topScore} < ${THRESHOLD}, falling back to GPT.`);
      return handleFallbackLLM(message, res);
    }
    const relevantDocs = resultsWithScores.map(([doc]) => doc);
    relevantDocs.sort((a, b) => b.pageContent.length - a.pageContent.length);
    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

    const promptTemplate = ChatPromptTemplate.fromTemplate(
      `You are a chat bot called AskSfu.
When listing multiple points, please separate each point with a <br> tag.
Answer the question based only on the following context:<br>
{context}<br>
Question: {input}`
    );

    const documentChain = await createStuffDocumentsChain({
      llm: new ChatOpenAI({
        modelName: "gpt-3.5-turbo-16k",
        openAIApiKey: process.env.OPENAI_API_KEY,
        maxTokens: 1000
      }),
      prompt: promptTemplate
    });

    const retriever = vectorStore.asRetriever({ k: 3 });
    const retrievalChain = await createRetrievalChain({
      combineDocsChain: documentChain,
      retriever
    });

    let result = await retrievalChain.invoke({ input: message });
    if (!result || !result.answer || result.answer.trim() === "") {
      console.log("Primary retrieval returned empty, falling back to GPT.");
      return handleFallbackLLM(message, res);
    }

    let sourceUrl = "Source not available";
    if (
      result.context &&
      result.context[0] &&
      result.context[0].metadata &&
      result.context[0].metadata.source
    ) {
      sourceUrl = result.context[0].metadata.source;
    }

    // If the answer is too long, truncate it at a sentence boundary and add a "Read more" link
    const MAX_CHARS = 800; // Adjust threshold as needed
    let finalAnswer = result.answer;
    if (finalAnswer.length > MAX_CHARS) {
      finalAnswer = truncateText(finalAnswer, MAX_CHARS, sourceUrl);
    }
    finalAnswer = finalAnswer.split("\n").join("<br>");



    let responseWithSource = finalAnswer;
    if (
      sourceUrl !== "Source not available" &&
      finalAnswer.toLowerCase() !== "hello! how can i assist you today?"
    ) {
      responseWithSource += `<br><br>Source: <a href="${sourceUrl}" target="_blank">${sourceUrl}</a>`;
    }
    
return res.json({ response: responseWithSource });

  } catch (error) {
    console.error("Server Error:", error);
    return handleFallbackLLM("I'm sorry, something went wrong. Can you please rephrase your question?", res);
  }
});

/**
 * Fallback LLM: if no relevant docs are found or an error occurs.
 */
async function handleFallbackLLM(message, res) {
  try {
    const fallbackLLM = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-16k",
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000
    });
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
    let answer = fallbackResponse.text || "I'm sorry, I couldn't generate an answer at this time.";
    answer = answer.split("\n").join("<br>");
    return res.json({ response: answer });
  } catch (error) {
    console.error("Fallback LLM Error:", error);
    return res.json({
      response: "I'm sorry, I encountered an error while generating a response. Please try again later."
    });
  }
}

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
