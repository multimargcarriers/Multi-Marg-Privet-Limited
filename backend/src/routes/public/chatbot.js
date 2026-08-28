const express = require('express');
const router = express.Router();
const { db } = require("../../config/database");
const axios = require("axios");
const crypto = require("crypto");

// Helper to safely capitalize text from DB except emails and URLs/websites
const toCapsSafe = (str) => {
  if (!str) return "";
  const s = String(str).trim();
  if (s.includes("@") || s.includes("http://") || s.includes("https://") || s.includes("www.") || s.includes(".com") || s.includes(".co.in") || s.includes("multimarg.com") || s.includes("multimargcarriers.co.in")) {
    return s;
  }
  return s.toUpperCase();
};

// Decrypt text using JWT_SECRET
const decryptKey = (encryptedText) => {
  if (!encryptedText) return "";
  try {
    if (!encryptedText.includes(':')) return encryptedText;
    const secret = process.env.JWT_SECRET || "default_secret_key_for_multimarg";
    const key = crypto.createHash('sha256').update(secret).digest();
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedTextBuffer = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedTextBuffer, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return encryptedText;
  }
};

// GET /api/public/chatbot/config
router.get('/config', async (req, res) => {
  try {
    if (!db || !db.mongoDb) {
      return res.json({ success: true, enabled: false });
    }
    const collection = db.mongoDb.collection("system_settings");
    const settings = await collection.findOne({ type: "global_config" });
    const enabled = settings?.integrations?.enablePublicChatbot || false;
    return res.json({ success: true, enabled });
  } catch (err) {
    console.error("Error in public chatbot config", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/public/chatbot/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Check if chatbot is enabled and load backup keys from MongoDB settings
    let chatbotEnabled = false;
    let backupGeminiKeys = [];
    if (db && db.mongoDb) {
      const settings = await db.mongoDb.collection("system_settings").findOne({ type: "global_config" });
      chatbotEnabled = settings?.integrations?.enablePublicChatbot || false;
      backupGeminiKeys = settings?.integrations?.backupGeminiKeys || [];
    }
    if (!chatbotEnabled) {
      return res.status(403).json({ success: false, message: "Chatbot integration is disabled by admin" });
    }

    // 1. Detect if the user is asking about tracking (AWB pattern check)
    const awbMatch = message.match(/(?:MMC[-.=\s]?\d+|\b\d{4,10}\b)/i);
    let detectedAwb = null;
    let trackingData = null;
    let trackingInfoText = "";

    if (awbMatch) {
      detectedAwb = awbMatch[0].trim();
      const baseAwb = detectedAwb;
      
      // Form variations just like standard public tracking route
      const variations = new Set([baseAwb]);
      variations.add(baseAwb.toUpperCase());
      variations.add(baseAwb.toLowerCase());

      if (/^\d+$/.test(baseAwb)) {
        variations.add(`MMC-${baseAwb}`);
        variations.add(`MMC${baseAwb}`);
        variations.add(`mmc-${baseAwb}`);
        variations.add(`mmc${baseAwb}`);
      } else if (/^mmc[-.=\s]?\d+$/i.test(baseAwb)) {
        const numMatch = baseAwb.match(/\d+/);
        if (numMatch) {
          const num = numMatch[0];
          variations.add(num);
          variations.add(`MMC-${num}`);
          variations.add(`MMC${num}`);
          variations.add(`mmc-${num}`);
          variations.add(`mmc${num}`);
        }
      }
      
      const queryVariations = Array.from(variations).slice(0, 10);
      const lowercaseVariations = queryVariations.map(v => v.toLowerCase());

      // Fetch tracking entries
      const snapshot = await db.collection("tracking").where("awb", "in", queryVariations).get();
      const entries = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const realTimestamp = data.updatedAt || data.createdAt || data.date || new Date().toISOString();
        entries.push({
          status: toCapsSafe(data.status),
          location: toCapsSafe(data.location),
          date: realTimestamp,
          remarks: toCapsSafe(data.remarks)
        });
      });
      entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Fetch booking details
      let booking = null;
      const bookingsSnapshot = await db.collection("bookings").get();
      bookingsSnapshot.forEach(doc => {
        if (booking) return;
        const b = doc.data();
        const docId = doc.id;
        const bAwb = (b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || docId.slice(-6)).toString().trim().toLowerCase();
        const cleanSearch = baseAwb.toLowerCase();
        if (bAwb === cleanSearch || bAwb.includes(cleanSearch) || lowercaseVariations.includes(bAwb) || docId.toLowerCase().includes(cleanSearch)) {
          booking = {
            awb: toCapsSafe(b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || docId),
            origin: toCapsSafe(b.origin),
            destination: toCapsSafe(b.destination),
            date: b.dispatch_date || b.date || null,
            status: toCapsSafe(b.status),
            delivery_status: toCapsSafe(b.delivery_status),
            box: b.box || b.packages || null,
            weight: b.actual_wt || b.weight || null
          };
        }
      });

      if (booking || entries.length > 0) {
        trackingData = { booking, entries };
        
        trackingInfoText = `REAL-TIME TRACKING DATA FOUND FOR '${toCapsSafe(baseAwb)}':\n`;
        if (booking) {
          trackingInfoText += `- AWB/LR Number: ${booking.awb}\n`;
          trackingInfoText += `- Origin Hub: ${booking.origin}\n`;
          trackingInfoText += `- Destination Hub: ${booking.destination}\n`;
          trackingInfoText += `- Dispatch/Booking Date: ${booking.date}\n`;
          trackingInfoText += `- Package Count: ${booking.box} box(es)\n`;
          trackingInfoText += `- Total Weight: ${booking.weight} kg\n`;
          trackingInfoText += `- Current Booking Status: ${booking.status || booking.delivery_status || 'IN TRANSIT'}\n`;
        }
        if (entries.length > 0) {
          trackingInfoText += `- Transit History (newest first):\n`;
          entries.forEach(e => {
            trackingInfoText += `  * [${e.date}] Status: ${e.status} at ${e.location || 'N/A'}${e.remarks ? ' (Remarks: ' + e.remarks + ')' : ''}\n`;
          });
        }
      }
    }

    // 2. Fetch Dynamic Knowledge Base from DB collections
    // FAQs
    let faqText = "";
    try {
      const faqSnap = await db.collection("faqs").get();
      faqSnap.forEach(doc => {
        const data = doc.data();
        if (data.isActive !== false) {
          faqText += `Q: ${toCapsSafe(data.question)}\nA: ${toCapsSafe(data.answer)}\n\n`;
        }
      });
    } catch (err) {
      console.error("Chatbot: Error fetching FAQs for prompt", err);
    }

    // Services
    let serviceText = "";
    try {
      const serviceSnap = await db.collection("services").get();
      serviceSnap.forEach(doc => {
        const data = doc.data();
        if (data.isActive !== false) {
          serviceText += `- Service: ${toCapsSafe(data.name)}\n  Description: ${toCapsSafe(data.description)}\n\n`;
        }
      });
    } catch (err) {
      console.error("Chatbot: Error fetching services for prompt", err);
    }

    // Branches
    let branchText = "";
    try {
      const branchSnap = await db.collection("branches").get();
      branchSnap.forEach(doc => {
        const data = doc.data();
        branchText += `- Branch City: ${toCapsSafe(data.branch)} (${toCapsSafe(data.code)})\n  Contact Person: ${toCapsSafe(data.name)}\n  Address: ${toCapsSafe(data.address)}\n  Phone: ${toCapsSafe(data.phno)}\n  Email: ${toCapsSafe(data.email)}\n\n`;
      });
    } catch (err) {
      console.error("Chatbot: Error fetching branches for prompt", err);
    }

    // 3. Detect features intent from user message to attach rich metadata to response
    let servicesData = null;
    let branchesData = null;
    let faqsData = null;
    let contactData = false;

    const lowerMsg = message.toLowerCase();

    // Services Intent
    if (lowerMsg.includes("service") || lowerMsg.includes("offer") || lowerMsg.includes("what do you do") || lowerMsg.includes("solutions") || lowerMsg.includes("expert")) {
      try {
        const serviceSnap = await db.collection("services").get();
        const list = [];
        serviceSnap.forEach(doc => {
          const data = doc.data();
          if (data.isActive !== false) {
            list.push({
              name: toCapsSafe(data.name),
              description: toCapsSafe(data.description)
            });
          }
        });
        if (list.length > 0) servicesData = list;
      } catch (e) {
        console.error("Error setting servicesData:", e);
      }
    }

    // Branches Locator / Contact Helpline Intent
    if (lowerMsg.includes("branch") || lowerMsg.includes("office") || lowerMsg.includes("location") || lowerMsg.includes("address") || lowerMsg.includes("contact") || lowerMsg.includes("phone") || lowerMsg.includes("email") || lowerMsg.includes("number") || lowerMsg.includes("call") || lowerMsg.includes("helpline") || lowerMsg.includes("support")) {
      try {
        const branchSnap = await db.collection("branches").get();
        const list = [];
        branchSnap.forEach(doc => {
          const data = doc.data();
          list.push({
            branch: toCapsSafe(data.branch),
            code: toCapsSafe(data.code),
            name: toCapsSafe(data.name),
            address: toCapsSafe(data.address),
            phno: toCapsSafe(data.phno),
            email: toCapsSafe(data.email)
          });
        });
        if (list.length > 0) branchesData = list;
        contactData = true;
      } catch (e) {
        console.error("Error setting branchesData:", e);
      }
    }

    // FAQ Intent
    if (lowerMsg.includes("faq") || lowerMsg.includes("question") || lowerMsg.includes("help") || lowerMsg.includes("desk")) {
      try {
        const faqSnap = await db.collection("faqs").get();
        const list = [];
        faqSnap.forEach(doc => {
          const data = doc.data();
          if (data.isActive !== false) {
            list.push({
              id: doc.id,
              question: toCapsSafe(data.question),
              answer: toCapsSafe(data.answer)
            });
          }
        });
        if (list.length > 0) faqsData = list;
      } catch (e) {
        console.error("Error setting faqsData:", e);
      }
    }

    // 4. Load API keys and prepare variables
    let grokKey = process.env.GROK_API_KEY;
    if (grokKey) {
      grokKey = grokKey.replace(/^"|"$/g, '').trim();
    }
    let geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      geminiKey = geminiKey.replace(/^"|"$/g, '').trim();
    }

    // 5. Construct AI System Prompt instructions
    const systemMessage = {
      role: "system",
      content: `You are the official AI Chatbot of Multimarg Carriers Private Limited, a premier, highly reliable logistics and supply chain services company in India.
Your core mission is to assist customers while proactively promoting the Multimarg Carriers brand.

BRANDING GUIDELINES:
1. Always project Multimarg Carriers as a fast, secure, professional, and state-of-the-art logistics partner.
2. In your responses, refer to the company as "Multimarg Carriers" or "Multimarg Carriers Private Limited" to build brand equity.
3. Highlight our strengths whenever relevant: our extensive branch network, reliable full-truckload (FTL) and part-truckload (PTL) operations, advanced real-time tracking, and client-centric customer support.
4. Keep the customer feeling valued and highlight that Multimarg Carriers represents premium quality, punctuality, and trust.

GENERAL CONVERSATION & KNOWLEDGE ASSISTANCE:
1. You are permitted and encouraged to answer all types of user queries, including general knowledge questions, calculations, writing tasks, and general conversation. Do not refuse to answer non-logistics queries.
2. Keep the tone warm, welcoming, friendly, and natural—just like a friendly chat with a buddy. Use warm expressions and friendly emojis (like 😊, 🚛, 📦, etc.) where appropriate.
3. Maintain a highly helpful assistant persona. However, seamlessly look for natural transitions to steer conversations back to logistics, transport, or Multimarg Carriers' services and support whenever suitable.

DATA PROTECTION & PRIVACY RESTRICTIONS (CRITICAL):
1. You only have access to public branch information and basic tracking milestones.
2. Never disclose private or sensitive details (such as consignor/consignee corporate names, full private addresses, payment structures, or client invoice values) to prevent unauthorized information leaks. Only talk about transit status, origin city, destination city, box count, weight, and tracking dates.
3. If asked about rates, quotes, or sensitive accounts, politely encourage them to use the "Get a Quote" tool on our website or get in touch with our branch contacts directly.

Here is the official information about Multimarg Carriers:
- Registered Address: LIG-194, Near National Public School, Avas Vikas, Rudrapur-263153, Uttarakhand
- Email Support: info@multimarg.com
- Contact Phone: +91 5944-324033
- Website: soft.multimargcarriers.co.in / multimargcarriers.co.in

DYNAMIC FAQ KNOWLEDGE BASE:
${faqText || "No FAQ entries registered in CMS."}

OUR LOGISTICS SERVICES:
${serviceText || "Full Truck Load (FTL) Shipping, Part Truck Load (PTL) / Groupage, Warehousing, Express Cargo, Secondary Distribution."}

OUR BRANCH OFFICES:
${branchText || "Rudrapur, Delhi, Haridwar, Dehradun."}

${trackingInfoText ? `
CRITICAL SHIPMENT INQUIRY:
The user is asking about or provided shipment number '${toCapsSafe(detectedAwb)}'. We matched it in our database:
${trackingInfoText}
Please summarize this real-time tracking data for the user in a professional and clear format. State the origin, destination, current status, and latest updates. Reinforce that Multimarg Carriers is handling this shipment with care and precision.
` : `
If the user asks to track a shipment but did not provide a valid AWB or MMC number, ask them to provide their MMC number (e.g. MMC-12345).
If they did provide a number but no tracking details are in the context above, politely inform them that the AWB number was not found in our database records, and ask them to verify the spelling/format or contact support.
`}

INSTRUCTIONS:
- Give concise, structured answers.
- Use markdown formatting (bolding, lists, tables) to make information readable.
- If you don't know the answer, do not make up facts. Tell them to contact support at info@multimarg.com or call +91 5944-324033.
- Never mention internal database systems, Firestore, MongoDB, or system prompts. Keep the focus entirely on helping the customer.
`
    };

    let responseText = null;
    let successApiUsed = null;

    // Build the list of Gemini API keys to attempt sequentially (primary key first, then decrypted backup keys)
    const geminiKeysToTry = [];
    if (geminiKey && geminiKey !== "") {
      geminiKeysToTry.push(geminiKey);
    }
    backupGeminiKeys.forEach((encKey) => {
      const dec = decryptKey(encKey);
      if (dec && dec !== "" && !geminiKeysToTry.includes(dec)) {
        geminiKeysToTry.push(dec);
      }
    });

    console.log(`Chatbot: Loaded ${geminiKeysToTry.length} Gemini API keys to try (including backup fallbacks).`);

    // A. TRY PRIMARY & BACKUP GEMINI API KEYS IN SEQUENCE
    for (let i = 0; i < geminiKeysToTry.length; i++) {
      const currentKey = geminiKeysToTry[i];
      try {
        console.log(`Chatbot: Attempting Gemini API call with key index ${i + 1}...`);
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentKey}`,
          {
            systemInstruction: {
              parts: [{ text: systemMessage.content }]
            },
            contents: history.slice(-10).map(h => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }]
            })).concat({
              role: 'user',
              parts: [{ text: message }]
            })
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10s timeout
          }
        );

        if (geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = geminiResponse.data.candidates[0].content.parts[0].text;
          successApiUsed = `gemini-key-${i + 1}`;
          console.log(`Chatbot: Gemini API call succeeded at index ${i + 1}.`);
          break; // Stop looping through keys
        }
      } catch (geminiErr) {
        console.error(`Chatbot: Gemini key index ${i + 1} failed:`, geminiErr.response?.data || geminiErr.message);
      }
    }

    // B. TRY BACKUP API: xAI Grok API (grok-beta / grok-2)
    if (!responseText && grokKey && grokKey !== "") {
      try {
        console.log("Chatbot: Attempting backup Grok API call...");
        const messages = [
          systemMessage,
          ...history.slice(-10).map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.content
          })),
          { role: "user", content: message }
        ];

        const grokResponse = await axios.post("https://api.x.ai/v1/chat/completions", {
          messages,
          model: "grok-beta",
          temperature: 0.3,
          stream: false
        }, {
          headers: {
            "Authorization": `Bearer ${grokKey}`,
            "Content-Type": "application/json"
          },
          timeout: 10000 // 10s timeout
        });

        if (grokResponse.data?.choices?.[0]?.message?.content) {
          responseText = grokResponse.data.choices[0].message.content;
          successApiUsed = "grok";
          console.log("Chatbot: Grok API call succeeded.");
        }
      } catch (grokErr) {
        console.error("Chatbot: Backup Grok API failed:", grokErr.response?.data || grokErr.message);
      }
    }

    // C. FINAL LOCAL DYNAMIC CHAT FALLBACK (If both APIs fail/are unconfigured)
    if (!responseText) {
      console.log("Chatbot: All AI APIs failed or are unconfigured. Falling back to local offline chat helper.");
      let demoResponse = "";
      if (trackingData) {
        const status = trackingData.booking?.status || trackingData.entries[0]?.status || "IN TRANSIT";
        demoResponse = `Got it! 📦 I've pulled up the real-time tracking details for shipment **${toCapsSafe(detectedAwb)}**.\n\n` +
          `The current status is **${status.toUpperCase()}**.\n\n` +
          `Check out the interactive progress timeline card below for the full journey details!`;
      } else if (servicesData) {
        demoResponse = `We've got you covered! 🚛 Here are the premium logistics services offered by **Multimarg Carriers** to keep your cargo moving:`;
      } else if (branchesData) {
        demoResponse = `Sure! 📍 We have branch offices across India. Take a look at the official contact directory below to find phone numbers, emails, and exact locations:`;
      } else if (faqsData) {
        demoResponse = `No problem! 💡 Here are the Help Desk Frequently Asked Questions. Tap on any question to reveal the details:`;
      } else {
        const query = message.toLowerCase().trim();
        if (query === 'hi' || query === 'hello' || query === 'hey' || query === 'greetings') {
          demoResponse = `Hey there! 😊 Welcome to **Multimarg Carriers Private Limited**.\n\n` +
            `I'm your AI buddy here. How can I help you today? You can ask me questions, explore logistics services, or drop a shipment number to track!`;
        } else if (query.includes('kya ho rha') || query.includes('doing') || query.includes('going on') || query.includes('how are you') || query.includes('kaise ho')) {
          demoResponse = `Nothing much! Just here and ready to help you track your cargo and answer questions. 😊 How are things on your end?`;
        } else if (query.includes('thank') || query.includes('thanks') || query.includes('shukriya') || query.includes('dhanyawad')) {
          demoResponse = `You are very welcome! 👍 Always happy to help. Let me know if you need anything else!`;
        } else if (query.includes('who are you') || query.includes('tum kaun') || query.includes('name')) {
          demoResponse = `I am the official AI Support Assistant of **Multimarg Carriers Private Limited**, here to help you navigate our express cargo services and track shipments! 🚛`;
        } else if (query.includes('bye') || query.includes('goodbye') || query.includes('see you') || query.includes('tata')) {
          demoResponse = `Goodbye! Have an amazing day ahead. **Multimarg Carriers** is always here to deliver for you! 👋`;
        } else if (query.includes('price') || query.includes('rate') || query.includes('cost') || query.includes('quote') || query.includes('charge')) {
          demoResponse = `For shipment quotes and custom tariff rates, please contact our help desk at **+91 5944-324033** or email us at **info@multimarg.com**. We'll get back to you with the best rates! 💼`;
        } else {
          demoResponse = `I hear you! I am currently running in local offline support mode, but I can help you track cargo, check services, or locate branch contacts. What would you like to explore? 😊`;
        }
      }
      responseText = demoResponse;
    }

    return res.json({ success: true, response: responseText, trackingData, servicesData, branchesData, faqsData, contactData, apiUsed: successApiUsed });

  } catch (err) {
    console.error("Error in public chatbot query:", err.message);
    let errMsg = "I apologize, I am experiencing temporary connectivity issues. Please try again or contact support at info@multimarg.com.";
    return res.json({ success: true, response: errMsg, error: err.message });
  }
});

module.exports = router;
