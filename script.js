/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

// Show the welcome message as a chat bubble and announce new messages.
chatWindow.textContent = "";
chatWindow.setAttribute("role", "log");
chatWindow.setAttribute("aria-live", "polite");
addMessage("👋 Hello! How can I help you today?", "ai");

// Keep the system instructions and successful conversation in memory for this page session.
const messages = [
  {
    role: "system",
    content:
      "You are a friendly L’Oréal beauty advisor. Answer questions about L’Oréal products and beauty-related topics, including skincare, haircare, makeup, fragrances, ingredients, application techniques, routines, and recommendations. For questions unrelated to L’Oréal or beauty, politely say you can help with L’Oréal products and beauty topics, then invite the user to ask about one of those. Use the conversation history to remember details the user has shared, such as their name, preferences, and past questions, and refer to them when relevant. Don’t guess or invent personal details or product facts. Keep advice practical, don’t diagnose conditions or make medical claims, and recommend consulting a healthcare professional for medical concerns.",
  },
];

// The Worker calls OpenAI securely; never put an API key in this browser file.
const workerUrl = "https://small-morning-666e.ijsando1.workers.dev/";

function addMessage(text, className) {
  const messageElement = document.createElement("div");
  messageElement.className = `msg ${className}`;
  messageElement.textContent = text;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageElement;
}

/* Send each user message to the Cloudflare Worker and display the reply. */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) {
    return;
  }

  // Show only the latest exchange while keeping the full conversation history for context.
  chatWindow.textContent = "";
  addMessage(userMessage, "user");
  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;

  const pendingMessage = addMessage("Thinking…", "ai pending");
  messages.push({ role: "user", content: userMessage });

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.error?.message || `The request failed (${response.status}).`,
      );
    }

    const assistantMessage = data.choices?.[0]?.message?.content;
    if (typeof assistantMessage !== "string" || !assistantMessage.trim()) {
      throw new Error("The service returned an empty or invalid response.");
    }

    pendingMessage.classList.remove("pending");
    pendingMessage.textContent = assistantMessage;
    messages.push({ role: "assistant", content: assistantMessage });
  } catch (error) {
    // Remove the unanswered user message from history so later requests stay in sync.
    messages.pop();
    pendingMessage.classList.remove("pending");
    pendingMessage.textContent = `Sorry, I couldn't get a response. ${error.message}`;
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});
