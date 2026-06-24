import "server-only";

type SnapshotPage = {
  addStyleTag(options: { content: string }): Promise<unknown>;
  evaluate<T>(pageFunction: () => T | Promise<T>): Promise<T>;
};

export type SnapshotRedactionResult = {
  maskedInputs: number;
  maskedTextNodes: number;
};

export async function maskSensitiveSnapshotText(
  page: SnapshotPage
): Promise<SnapshotRedactionResult> {
  await page.addStyleTag({
    content: `
      input[type="password"],
      input[data-sf-redacted="true"],
      textarea[data-sf-redacted="true"],
      [data-sf-redacted-text="true"] {
        color: transparent !important;
        background: #111827 !important;
        border-radius: 4px !important;
        text-shadow: none !important;
      }
      input[data-sf-redacted="true"]::placeholder,
      textarea[data-sf-redacted="true"]::placeholder {
        color: transparent !important;
      }
    `,
  });

  return page.evaluate(() => {
    const sensitiveLabelPattern =
      /(password|passcode|card|credit|cvv|cvc|account|token|secret|api\s*key|称号|姓名|密码|卡号|银行卡|信用卡|验证码|账号|账户|手机号|电话|邮箱|身份证)/i;
    const cardNumberPattern = /(?:\d[ -]?){13,19}/g;
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const labelValuePattern =
      /((?:password|passcode|card|credit|cvv|cvc|account|token|secret|api\s*key|称号|姓名|密码|卡号|银行卡|信用卡|验证码|账号|账户|手机号|电话|邮箱|身份证)\s*[:：]\s*)[^\s<]{2,}/gi;

    let maskedInputs = 0;
    let maskedTextNodes = 0;

    const inputSelector = [
      "input",
      "textarea",
      "[contenteditable='true']",
      "[aria-label]",
      "[data-testid]",
    ].join(",");

    document.querySelectorAll<HTMLElement>(inputSelector).forEach((element) => {
      const label = [
        element.getAttribute("type"),
        element.getAttribute("name"),
        element.getAttribute("id"),
        element.getAttribute("placeholder"),
        element.getAttribute("aria-label"),
        element.getAttribute("autocomplete"),
        element.getAttribute("data-testid"),
        element.textContent,
      ]
        .filter(Boolean)
        .join(" ");

      if (sensitiveLabelPattern.test(label)) {
        element.setAttribute("data-sf-redacted", "true");
        if ("value" in element) {
          (element as HTMLInputElement | HTMLTextAreaElement).value = "••••••";
        } else {
          element.textContent = "••••••";
        }
        maskedInputs += 1;
      }
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    for (const node of textNodes) {
      const original = node.nodeValue || "";
      const masked = original
        .replace(labelValuePattern, "$1••••••")
        .replace(cardNumberPattern, "•••• •••• •••• ••••")
        .replace(emailPattern, "••••@••••");

      if (masked !== original) {
        node.nodeValue = masked;
        node.parentElement?.setAttribute("data-sf-redacted-text", "true");
        maskedTextNodes += 1;
      }
    }

    return { maskedInputs, maskedTextNodes };
  });
}
