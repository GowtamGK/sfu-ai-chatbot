/**********************************************
 * script.js
 **********************************************/

// When user clicks the map button
document.getElementById("map-button").addEventListener("click", function () {
  const chatBox = document.getElementById("chat-box");
  const mapContainer = document.getElementById("map-container");
  const sfuLogo = document.getElementById("sfu-logo");

  // Hide chatbot and logo, show map
  chatBox.style.display = "none";
  sfuLogo.style.display = "none";
  mapContainer.style.display = "block";
});

// Theme Toggle
// document.getElementById("theme-toggle").addEventListener("click", function () {
//   document.body.classList.toggle("dark-theme");
//   const isDarkTheme = document.body.classList.contains("dark-theme");
//   document.getElementById("theme-toggle").textContent = isDarkTheme ? "🌙" : "☀️";
// });

// Handle Enter Key Press
function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

// Send a message
function sendMessage() {
  const userInput = document.getElementById("user-input").value.trim();
  if (userInput === "") return;

  // Add user's message
  addMessage(userInput, true);
  document.getElementById("user-input").value = "";

  // Create loading animation
  const messageList = document.getElementById("messages");
  const botLoadingBubble = document.createElement("li");
  botLoadingBubble.classList.add("bot-message");
  botLoadingBubble.innerHTML = `
    <div class="loading-dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
  messageList.appendChild(botLoadingBubble);

  // Scroll to bottom
  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTop = chatBox.scrollHeight;

  // Fetch response from Railway API (production)
  setTimeout(() => {
    fetch("https://sfu-ai-chatbot-production.up.railway.app/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userInput }),
    })
      .then((response) => response.json())
      .then((data) => {
        botLoadingBubble.innerHTML = data.response;
        chatBox.scrollTop = chatBox.scrollHeight;
      })
      .catch((error) => {
        console.error("Error:", error);
        botLoadingBubble.innerHTML = "Sorry, something went wrong.";
      });
  }, 1500);
}

// Add a message to the chat
function addMessage(message, isUser) {
  const messageList = document.getElementById("messages");
  const messageItem = document.createElement("li");
  messageItem.textContent = message;
  messageItem.classList.add(isUser ? "user-message" : "bot-message");
  messageList.appendChild(messageItem);

  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTop = chatBox.scrollHeight;
}
