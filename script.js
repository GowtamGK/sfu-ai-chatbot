/**********************************************
 * script.js
 **********************************************/

// When user clicks the map button
document.getElementById("map-button").addEventListener("click", function () {
    // Replace with your actual campus map URL:
    window.open("https://www.sfu.ca/campuses/maps.html", "_blank");
  });
  
  // When user clicks the news button
  document.getElementById("news-button").addEventListener("click", function () {
    // Replace with your actual SFU news URL:
    window.open("https://www.sfu.ca/dashboard.html", "_blank");
  });
  
  // Theme Toggle
  document.getElementById("theme-toggle").addEventListener("click", function () {
    document.body.classList.toggle("dark-theme");
    const isDarkTheme = document.body.classList.contains("dark-theme");
    document.getElementById("theme-toggle").textContent = isDarkTheme
      ? "🌙"
      : "☀️";
  });
  
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
  
    // 1) Add the user's message bubble (right-aligned)
    addMessage(userInput, true);
  
    // Clear the input
    document.getElementById("user-input").value = "";
  
    // 2) Create a new bubble for the bot with a loading animation
    const messageList = document.getElementById("messages");
    const botLoadingBubble = document.createElement("li");
    botLoadingBubble.classList.add("bot-message");
    // Insert the loading dots markup
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
  
    // 3) Fetch the bot response
    setTimeout(() => {
      fetch("https://sfu-ai-chatbot-production.up.railway.app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      })
        .then((response) => response.json())
        .then((data) => {
          // 4) Replace the loading dots with the actual bot response
          botLoadingBubble.innerHTML = data.response;
          // Scroll to bottom again
          chatBox.scrollTop = chatBox.scrollHeight;
        })
        .catch((error) => {
          console.error("Error:", error);
          // If there's an error, you could show an error message
          botLoadingBubble.innerHTML = "Sorry, something went wrong.";
        });
    }, 1500);
  }
  
  // Reusable helper to add a chat bubble
  function addMessage(message, isUser) {
    const messageList = document.getElementById("messages");
    const messageItem = document.createElement("li");
    messageItem.textContent = message;
    messageItem.classList.add(isUser ? "user-message" : "bot-message");
    messageList.appendChild(messageItem);
  
    // Scroll the chat box to the bottom
    const chatBox = document.getElementById("chat-box");
    chatBox.scrollTop = chatBox.scrollHeight;
  }
  
