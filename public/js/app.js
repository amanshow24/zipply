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

// qr resolve text copy
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.querySelector("[data-qr-resolve-copy]");

  if (!copyBtn) {
    return;
  }

  const copyLabel = copyBtn.querySelector(".qr-resolve__copy-label");
  const icon = copyBtn.querySelector("i");

  copyBtn.addEventListener("click", async () => {
    const copyValue = copyBtn.getAttribute("data-copy-value") || "";

    try {
      await navigator.clipboard.writeText(copyValue);

      if (copyLabel) {
        copyLabel.textContent = "Copied";
      }

      if (icon) {
        icon.classList.remove("bi-clipboard");
        icon.classList.add("bi-check2");
      }

      setTimeout(() => {
        if (copyLabel) {
          copyLabel.textContent = "Copy";
        }

        if (icon) {
          icon.classList.remove("bi-check2");
          icon.classList.add("bi-clipboard");
        }
      }, 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  });
});

// live IST clock labels
document.addEventListener("DOMContentLoaded", () => {
  const istClockNodes = document.querySelectorAll("[data-ist-clock]");

  if (!istClockNodes.length) {
    return;
  }

  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const refreshISTClock = () => {
    const nowText = formatter.format(new Date());
    istClockNodes.forEach((node) => {
      node.textContent = `IST: ${nowText}`;
    });
  };

  refreshISTClock();
  setInterval(refreshISTClock, 1000);
});

// short url table filter
document.addEventListener("DOMContentLoaded", () => {
  const filterSelect = document.getElementById("urlFilter");
  const rows = Array.from(document.querySelectorAll(".home__url-row"));
  const emptyState = document.getElementById("urlFilterEmpty");
  const activeStat = document.getElementById("homeStatActive");
  const expiredStat = document.getElementById("homeStatExpired");

  if (!filterSelect || rows.length === 0) {
    return;
  }

  const updateRowExpiryState = () => {
    const nowEpoch = Date.now();

    rows.forEach((row) => {
      const expiryEpochRaw = row.dataset.expiryEpoch;
      if (!expiryEpochRaw) {
        row.dataset.filterStatus = "active";
        return;
      }

      const expiryEpoch = Number(expiryEpochRaw);
      const isExpired = Number.isFinite(expiryEpoch) && nowEpoch > expiryEpoch;
      row.dataset.filterStatus = isExpired ? "expired" : "active";

      const badge = row.querySelector("[data-expiry-badge]");
      if (badge) {
        badge.textContent = isExpired ? "Expired" : "Active";
        badge.classList.toggle("bg-danger", isExpired);
        badge.classList.toggle("bg-success", !isExpired);
      }
    });
  };

  const updateSummaryStats = () => {
    let activeCount = 0;
    let expiredCount = 0;

    rows.forEach((row) => {
      if (row.dataset.filterStatus === "expired") {
        expiredCount += 1;
      } else {
        activeCount += 1;
      }
    });

    if (activeStat) {
      activeStat.textContent = String(activeCount);
    }

    if (expiredStat) {
      expiredStat.textContent = String(expiredCount);
    }
  };

  const doesRowMatch = (row, filterValue) => {
    if (filterValue === "all") {
      return true;
    }

    if (filterValue === "active" || filterValue === "expired") {
      return row.dataset.filterStatus === filterValue;
    }

    if (filterValue === "with-expiry" || filterValue === "no-expiry") {
      return row.dataset.filterExpiry === filterValue;
    }

    if (filterValue === "clicked" || filterValue === "not-clicked") {
      return row.dataset.filterClicks === filterValue;
    }

    return true;
  };

  const applyFilter = () => {
    const filterValue = filterSelect.value;
    let visibleCount = 0;

    rows.forEach((row) => {
      const isVisible = doesRowMatch(row, filterValue);
      row.style.display = isVisible ? "" : "none";
      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  };

  filterSelect.addEventListener("change", applyFilter);

  const refreshHomeExpiryState = () => {
    updateRowExpiryState();
    updateSummaryStats();
    applyFilter();
  };

  refreshHomeExpiryState();
  setInterval(refreshHomeExpiryState, 1000);
});

// view more expiry badge live refresh
document.addEventListener("DOMContentLoaded", () => {
  const expiryContainer = document.querySelector("[data-view-expiry][data-expiry-epoch]");
  const expiryBadge = document.querySelector("[data-view-expiry-badge]");

  if (!expiryContainer || !expiryBadge) {
    return;
  }

  const expiryEpoch = Number(expiryContainer.getAttribute("data-expiry-epoch"));
  if (!Number.isFinite(expiryEpoch)) {
    return;
  }

  const refreshDetailExpiryState = () => {
    const isExpired = Date.now() > expiryEpoch;
    expiryBadge.textContent = isExpired ? "Expired" : "Active";
    expiryBadge.classList.toggle("bg-danger", isExpired);
    expiryBadge.classList.toggle("bg-success", !isExpired);
  };

  refreshDetailExpiryState();
  setInterval(refreshDetailExpiryState, 1000);
});

// verify-email OTP input sanitization
document.addEventListener("DOMContentLoaded", () => {
  const otpInput = document.getElementById("otp");

  if (otpInput) {
    otpInput.addEventListener("input", () => {
      otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
    });
  }
});


// till here copy function

//faq accordion toggle
document.addEventListener("DOMContentLoaded", () => {
  const questions = document.querySelectorAll(".faq__question");
  const answers = document.querySelectorAll(".faq__answer");

  questions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = btn.dataset.index;
      const answer = document.getElementById(`faq-${index}`);

      const isOpen = btn.classList.contains("active");

      // Close all answers and questions
      questions.forEach((q) => q.classList.remove("active"));
      answers.forEach((a) => a.classList.remove("active"));

      // Open clicked if not already open
      if (!isOpen) {
        btn.classList.add("active");
        answer.classList.add("active");
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
      const isQRDelete = form.action.includes("/qr/delete/");
      const confirmMessage = isQRDelete
        ? "Are you sure you want to delete this QR code?"
        : "Are you sure you want to delete this URL?";
      const confirmDelete = confirm(confirmMessage);
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
  const customInput = document.getElementById("custom");
  const customValidationMsg = document.getElementById("customValidationMsg");

  if (expiryInput && form) {
    form.addEventListener("submit", (e) => {
      const expiryValue = expiryInput.value;
      if (expiryValue) {
        const todayIST = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        if (expiryValue < todayIST) {
          e.preventDefault();
          alert("Expiry date must be today or a future date.");
        }
      }
    });
  }

  if (customInput) {
    const setCustomMessage = (message) => {
      if (!customValidationMsg) {
        return;
      }

      if (message) {
        customValidationMsg.textContent = message;
        customValidationMsg.classList.remove("home__field-error--hidden");
      } else {
        customValidationMsg.textContent = "";
        customValidationMsg.classList.add("home__field-error--hidden");
      }
    };

    const syncCustomState = () => {
      const value = customInput.value.trim();
      const invalidType = customInput.getAttribute("data-custom-invalid");
      const isLengthInvalid = value.length > 0 && value.length < 4;
      const isDuplicateInvalid = invalidType === "duplicate";
      const shouldBeInvalid = isLengthInvalid || isDuplicateInvalid;

      customInput.classList.toggle("home__input--invalid", shouldBeInvalid);
      customInput.setAttribute("aria-invalid", shouldBeInvalid ? "true" : "false");

      if (isDuplicateInvalid) {
        setCustomMessage("This custom ID is already in use. Try another one.");
        return;
      }

      setCustomMessage("");
    };

    syncCustomState();

    customInput.addEventListener("input", () => {
      const value = customInput.value.trim();

      if (customInput.getAttribute("data-custom-invalid") === "duplicate" && value !== customInput.defaultValue.trim()) {
        customInput.removeAttribute("data-custom-invalid");
      }

      syncCustomState();
    });

    customInput.addEventListener("blur", () => {
      syncCustomState();
    });
  }
});

// password toggle and signup password validation
document.addEventListener("DOMContentLoaded", () => {
  const toggles = document.querySelectorAll(".password-toggle[data-toggle-password]");

  toggles.forEach((toggleBtn) => {
    toggleBtn.addEventListener("click", () => {
      const inputId = toggleBtn.getAttribute("data-toggle-password");
      const targetInput = document.getElementById(inputId);
      const icon = toggleBtn.querySelector("i");

      if (!targetInput) {
        return;
      }

      const isHidden = targetInput.type === "password";
      targetInput.type = isHidden ? "text" : "password";

      if (icon) {
        icon.classList.toggle("bi-eye", !isHidden);
        icon.classList.toggle("bi-eye-slash", isHidden);
      }
    });
  });

  const signupForm = document.querySelector(".signup__form");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const passwordMatchError = document.getElementById("passwordMatchError");

  if (signupForm && passwordInput && confirmPasswordInput && passwordMatchError) {
    const validatePasswords = () => {
      if (!confirmPasswordInput.value) {
        passwordMatchError.style.display = "none";
        passwordMatchError.textContent = "";
        return true;
      }

      if (passwordInput.value !== confirmPasswordInput.value) {
        passwordMatchError.style.display = "block";
        passwordMatchError.textContent = "Password not matched.";
        return false;
      }

      passwordMatchError.style.display = "none";
      passwordMatchError.textContent = "";
      return true;
    };

    passwordInput.addEventListener("input", validatePasswords);
    confirmPasswordInput.addEventListener("input", validatePasswords);

    signupForm.addEventListener("submit", (e) => {
      if (!validatePasswords()) {
        e.preventDefault();
      }

      if (passwordInput.value.length < 4) {
        e.preventDefault();
        passwordMatchError.style.display = "block";
        passwordMatchError.textContent = "Password must be at least 4 characters long.";
      }
    });
  }
});
