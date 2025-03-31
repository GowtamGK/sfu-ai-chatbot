window.addEventListener("DOMContentLoaded", () => {
  const newsContainer = document.getElementById("news-container");

  fetch("https://sfu-ai-chatbot-production.up.railway.app/api/news")
    .then((response) => response.json())
    .then((data) => {
      newsContainer.innerHTML = data.news;
    })
    .catch((err) => {
      console.error("Error fetching news:", err);
      newsContainer.innerHTML =
        "<p>Sorry, we could not load the latest news right now.</p>";
    });
});
