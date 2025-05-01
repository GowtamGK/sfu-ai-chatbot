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
  //   document.getElementById("theme-toggle").textContent = isDarkTheme
  //     ? "🌙"
  //     : "☀️";
  // });
  
  
  // Handle Enter Key Press
  function handleKeyPress(event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }
  

  function sendMessage() {
    const userInput = document.getElementById("user-input").value.trim();
    if (userInput === "") return;
  
    addMessage(userInput, true);
    document.getElementById("user-input").value = "";
  
    const messageList = document.getElementById("messages");
  
    // 🦝 Rocco thinking bubble
    const botLoadingBubble = document.createElement("li");
    botLoadingBubble.classList.add("message-with-avatar");
    botLoadingBubble.innerHTML = `
      <img src="assets/think.png" class="rocco-avatar" alt="Rocco thinking">
      <div class="bot-text">
        <div class="loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    `;

    //messageList.appendChild(botLoadingBubble);
  
    //const chatBox = document.getElementById("chat-box");
    const chatBox = document.getElementById("chat-box");
    const suggestions = document.querySelector(".suggested-questions");

    // Insert bot message above suggested questions
    if (suggestions && suggestions.parentNode === chatBox) {
      chatBox.insertBefore(botLoadingBubble, suggestions);
    } else {
      messageList.appendChild(botLoadingBubble); // fallback
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  
    setTimeout(() => {
      //fetch("https://sfu-ai-chatbot-production.up.railway.app/chat", {
      // fetch("https://sfu-ai-chatbot-production-6037.up.railway.app/chat", {
      fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      })
        .then((response) => response.json())
        .then((data) => {
          // 🦝 Replace with smiling Rocco and actual message
          botLoadingBubble.innerHTML = `
            <div class="message-with-avatar">
              <img src="assets/smile.png" class="rocco-avatar" alt="Rocco smiling">
              <div class="bot-text">${data.response}</div>
            </div>
          `;
          chatBox.scrollTop = chatBox.scrollHeight;
        })
        .catch((error) => {
          console.error("Error:", error);
          botLoadingBubble.innerHTML = `
            <div class="message-with-avatar">
              <img src="assets/think.png" class="rocco-avatar" alt="Rocco error">
              <div class="bot-text">Sorry, something went wrong.</div>
            </div>
          `;
        });
    }, 1500);
  }

  function suggest(text, el) {
    const input = document.getElementById("user-input");
    input.value = text;
    input.focus();
  
    // Remove only the clicked suggestion bubble
    if (el) {
      el.style.display = "none";
    }
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
  

  window.addEventListener("DOMContentLoaded", () => {
    const welcomeMsg = "Welcome! I'm Rocco, the SFU AI Chatbot. How can I help you today?";
    const messageList = document.getElementById("messages");
  
    const botWelcome = document.createElement("li");
    botWelcome.classList.add("message-with-avatar");
    botWelcome.innerHTML = `
      <div class="message-with-avatar">
        <img src="assets/smile.png" class="rocco-avatar" alt="Rocco smiling">
        <div class="bot-text">${welcomeMsg}</div>
      </div>
    `;
    messageList.appendChild(botWelcome);
  });
  
