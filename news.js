window.addEventListener("DOMContentLoaded", () => {
  const newsContainer = document.getElementById("news-container");

//   fetch("https://sfu-ai-chatbot-production.up.railway.app/api/news")
//     .then((response) => response.json())
//     .then((data) => {
//       newsContainer.innerHTML = data.news;
//     })
//     .catch((err) => {
//       console.error("Error fetching news:", err);
//       newsContainer.innerHTML =
//         "<p>Sorry, we could not load the latest news right now.</p>";
//     });
// });
  //fetch("https://sfu-ai-chatbot-production.up.railway.app/api/full-news")
   // fetch("https://sfu-ai-chatbot-production-6037.up.railway.app/api/full-news")
     fetch("/api/full-news")
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("loading-spinner")?.remove(); // Remove spinner
      newsContainer.innerHTML = data.news;
    })
    .catch((err) => {
      console.error("Failed to load news:", err);
      newsContainer.innerHTML =
        "<p>Sorry, we could not load the latest news right now.</p>";
    });
});
  
