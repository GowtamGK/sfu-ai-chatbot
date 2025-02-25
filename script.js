// Handle Enter Key Press for Sending Message
function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

// Send User Message to Backend API
function sendMessage() {
    const userInput = document.getElementById("user-input").value.trim();
    if (userInput === "") return;

    const chatBox = document.getElementById("chat-box");

    // Display User Message with Animation
    const userMessage = document.createElement("div");
    userMessage.className = "user-message";
    userMessage.textContent = userInput;
    chatBox.appendChild(userMessage);

    // Clear Input
    document.getElementById("user-input").value = "";

    // Scroll to Bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    // Add Typing Indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    typingIndicator.innerHTML = "<span></span><span></span><span></span>";
    chatBox.appendChild(typingIndicator);

    // Change Raccoon Image to Closed (Waiting Mode)
    changeRaccoonImage("assets/raccoon_closed.png");

    // Simulate Typing Delay Before Bot Responds
    setTimeout(() => {
        fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userInput })
        })
        .then(response => response.json())
        .then(data => {
            // Remove Typing Indicator
            chatBox.removeChild(typingIndicator);

            // Change Raccoon Image to Open (Talking Mode)
            changeRaccoonImage("assets/raccoon_open.png");

            // Display Bot Response with Animation
            const botMessage = document.createElement("div");
            botMessage.className = "bot-message";

            // Detect Academic Integrity Responses and Highlight Them
            if (data.response.includes("Academic Integrity Info") || data.response.includes("cheating") || data.response.includes("disciplinary process")) {
                botMessage.style.backgroundColor = "#ffcccb";  // Light red for warnings
                botMessage.innerHTML = `⚠️ <strong>Important:</strong> ${data.response}`;
            } else {
                botMessage.innerHTML = data.response.replace(/\n/g, "<br>");
            }

            chatBox.appendChild(botMessage);

            // Scroll to Bottom
            chatBox.scrollTop = chatBox.scrollHeight;

            // Close Raccoon Mouth After 3 Seconds
            setTimeout(() => {
                changeRaccoonImage("assets/raccoon_closed.png");
            }, 3000);
        })
        .catch(error => console.error("Error:", error));
    }, 1500); // Simulated Typing Delay
}

// Function to Change Raccoon Image
function changeRaccoonImage(imagePath) {
    document.getElementById("raccoonImage").src = imagePath;
}
