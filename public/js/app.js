// copy clickboard function
document.addEventListener("DOMContentLoaded", () => {
  const copyContainers = document.querySelectorAll(".copy-container");

  copyContainers.forEach(container => {
    container.addEventListener("click", async () => {
      const url = container.getAttribute("data-url");

      try {
        await navigator.clipboard.writeText(url);

        // Change icon and text
        const icon = container.querySelector("i");
        const text = container.querySelector(".copy-text");

        icon.classList.remove("bi-clipboard");
        icon.classList.add("bi-check2");
        icon.style.color = "green";
        text.innerText = "Copied!";

        // Revert after 1.5s
        setTimeout(() => {
          icon.classList.remove("bi-check2");
          icon.classList.add("bi-clipboard");
          icon.style.color = "";
          text.innerText = "Copy";
        }, 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });
  });
});


// till here copy function

//faq
document.addEventListener("DOMContentLoaded", () => {
  const questions = document.querySelectorAll(".faq__question");
  const answers = document.querySelectorAll(".faq__answer");

  questions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = btn.dataset.index;
      const answer = document.getElementById(`faq-${index}`);

      const isOpen = btn.classList.contains("active");

      // Close all answers
      questions.forEach((q) => q.classList.remove("active"));
      answers.forEach((a) => (a.style.display = "none"));

      // Open clicked if not already open
      if (!isOpen) {
        btn.classList.add("active");
        answer.style.display = "block";
      }
    });
  });
});

// logout confirmation
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", function (e) {
      const confirmed = confirm("Are you sure you want to logout?");
      if (!confirmed) {
        e.preventDefault();
      }
    });
  }
});


//delete url -- alert 

document.addEventListener("DOMContentLoaded", () => {
  const deleteForms = document.querySelectorAll(".delete-form");

  deleteForms.forEach(form => {
    form.addEventListener("submit", function (e) {
      const confirmDelete = confirm("Are you sure you want to delete this URL?");
      if (!confirmDelete) {
        e.preventDefault(); // stop form from submitting
      }
    });
  });
});


//url expiry field
document.addEventListener("DOMContentLoaded", () => {
  const expiryInput = document.getElementById("expiry");
  const form = document.querySelector(".home__form");

  if (expiryInput && form) {
    form.addEventListener("submit", (e) => {
      const expiryValue = expiryInput.value;
      if (expiryValue) {
        const today = new Date();
        const selected = new Date(expiryValue);
        if (selected < today.setHours(0, 0, 0, 0)) {
          e.preventDefault();
          alert("Expiry date must be today or a future date.");
        }
      }
    });
  }
});

// alert msg for qr delete
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".delete-qr-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const confirmDelete = confirm("Are you sure you want to delete this QR code?");
      if (!confirmDelete) {
        e.preventDefault();
      }
    });
  });
});
