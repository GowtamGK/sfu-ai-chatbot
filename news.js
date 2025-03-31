/***********************************
 * news.js
 ***********************************/
window.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("news-container");
  
    fetch("/api/news")
      .then((response) => response.json())
      .then((data) => {
        // data.news is the HTML from the first .sfu-columns that has .show-date items
        // Insert that HTML directly into the container
        newsContainer.innerHTML = data.news;
  
        // Optionally, you can do further manipulation here:
        // e.g., remove certain elements, re-style them, etc.
        // But for a direct approach, just set innerHTML.
      })
      .catch((err) => {
        console.error("Error fetching news:", err);
        newsContainer.innerHTML =
          "<p>Sorry, we could not load the latest news right now.</p>";
      });
  });
  
