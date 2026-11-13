/**
 * Utility to print only a specific card/element rather than the whole webpage/dashboard.
 * Clones the element into an isolated print container directly on document.body,
 * then triggers window.print().
 */
export function printCard(elementId: string) {
  if (typeof window === "undefined") return;

  const target = document.getElementById(elementId);
  if (!target) {
    window.print();
    return;
  }

  // Find or create the dedicated print container
  let printContainer = document.getElementById("afiya-print-container");
  if (!printContainer) {
    printContainer = document.createElement("div");
    printContainer.id = "afiya-print-container";
    document.body.appendChild(printContainer);
  }

  // Clone target element
  printContainer.innerHTML = "";
  const clone = target.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id"); // avoid duplicate ID in DOM
  printContainer.appendChild(clone);

  // Mark body for isolated printing
  document.body.classList.add("is-printing-card");

  const cleanup = () => {
    document.body.classList.remove("is-printing-card");
    if (printContainer) {
      printContainer.innerHTML = "";
    }
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();

  // Fallback cleanup if afterprint event doesn't fire (e.g. some webview environments)
  setTimeout(cleanup, 2000);
}

