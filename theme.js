// Handle theme toggle click
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("theme-toggle");
    const storedTheme = localStorage.getItem("theme");
  
    // Apply saved theme
    if (storedTheme === "dark") {
      document.body.classList.add("dark-theme");
      toggleBtn.textContent = "🌙";
    } else {
      toggleBtn.textContent = "☀️";
    }
  
    // Toggle on click
    toggleBtn?.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      toggleBtn.textContent = isDark ? "🌙" : "☀️";
    });
  });
  
