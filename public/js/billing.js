document.addEventListener("DOMContentLoaded", () => {
  const shell = document.querySelector("[data-billing-shell]");
  const statusNode = document.getElementById("billingStatus");
  const buttons = document.querySelectorAll("[data-plan-button]");

  if (!shell || !buttons.length) {
    return;
  }

  const userName = shell.getAttribute("data-user-name") || "";
  const userEmail = shell.getAttribute("data-user-email") || "";

  const setStatus = (message, isError = false) => {
    if (!statusNode) {
      return;
    }

    statusNode.textContent = message || "";
    statusNode.style.color = isError ? "#dc2626" : "#1d4ed8";
  };

  const waitForRazorpay = () => {
    if (window.Razorpay) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;

      const poll = () => {
        if (window.Razorpay) {
          resolve();
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(new Error("Unable to load Razorpay checkout."));
          return;
        }

        window.setTimeout(poll, 100);
      };

      poll();
    });
  };

  const createCheckout = async (plan, button) => {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Preparing checkout...";
    setStatus(`Creating ${plan} order...`);

    try {
      await waitForRazorpay();

      const response = await fetch("/payment/create-order", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to create order.");
      }

      setStatus(`Opening ${data.planLabel} checkout...`);

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Zipply",
        description: `${data.planLabel} monthly subscription (test mode)`,
        order_id: data.order.id,
        prefill: {
          name: userName,
          email: userEmail,
        },
        notes: {
          plan: data.plan,
          mode: "test",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            button.disabled = false;
            button.textContent = originalText;
            setStatus("Checkout closed.");
          },
        },
        handler: async (responsePayload) => {
          try {
            setStatus("Verifying payment...");

            const verifyResponse = await fetch("/payment/verify", {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                plan,
                razorpay_order_id: responsePayload.razorpay_order_id,
                razorpay_payment_id: responsePayload.razorpay_payment_id,
                razorpay_signature: responsePayload.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.message || "Payment verification failed.");
            }

            setStatus(verifyData.message || "Payment verified successfully.");
            window.location.reload();
          } catch (verifyError) {
            setStatus(verifyError.message || "Payment verification failed.", true);
            alert(verifyError.message || "Payment verification failed.");
            button.disabled = false;
            button.textContent = originalText;
          }
        },
      });

      razorpay.on("payment.failed", (failure) => {
        const description =
          failure?.error?.description ||
          failure?.error?.reason ||
          failure?.error?.step ||
          "Payment failed in checkout.";

        setStatus(description, true);
        button.disabled = false;
        button.textContent = originalText;
      });

      razorpay.open();
    } catch (error) {
      setStatus(error.message || "Checkout could not be started.", true);
      alert(error.message || "Checkout could not be started.");
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const plan = button.getAttribute("data-plan");
      if (!plan) {
        return;
      }

      createCheckout(plan, button);
    });
  });
});