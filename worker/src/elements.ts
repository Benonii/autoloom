import type { Page } from 'playwright';

import type { PageElement } from '@worker/types';

const maximumElements = 80;

function collectInPage(limit: number): PageElement[] {
  const interactiveSelector =
    'a[href], button, input:not([type=hidden]), textarea, select, [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=switch], [role=option], [contenteditable=true]';
  const roleByTag: Record<string, string> = { a: 'link', button: 'button', textarea: 'textbox', select: 'combobox' };
  const inputRoles: Record<string, string> = {
    checkbox: 'checkbox',
    radio: 'radio',
    submit: 'button',
    button: 'button',
    range: 'slider'
  };
  for (const tagged of Array.from(document.querySelectorAll('[data-autoloom-number]'))) {
    tagged.removeAttribute('data-autoloom-number');
  }
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(interactiveSelector));
  const visible = candidates.filter((element) => {
    const rectangle = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rectangle.width > 2 &&
      rectangle.height > 2 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      rectangle.bottom > 0 &&
      rectangle.top < window.innerHeight * 2
    );
  });
  function readName(element: HTMLElement): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelText = labelledBy
        .split(' ')
        .map((labelID) => document.getElementById(labelID)?.textContent ?? '')
        .join(' ');
      if (labelText.trim()) return labelText;
    }
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label?.textContent?.trim()) return label.textContent;
    }
    const wrappingLabel = element.closest('label');
    if (wrappingLabel?.textContent?.trim() && wrappingLabel !== element) return wrappingLabel.textContent;
    const text = element.innerText || element.textContent || '';
    if (text.trim()) return text;
    return element.getAttribute('placeholder') ?? element.getAttribute('title') ?? '';
  }
  return visible.slice(0, limit).map((element, index) => {
    const number = index + 1;
    element.setAttribute('data-autoloom-number', String(number));
    const tag = element.tagName.toLowerCase();
    const inputType = element instanceof HTMLInputElement ? element.type : '';
    const role =
      element.getAttribute('role') ??
      (tag === 'input' ? (inputRoles[inputType] ?? 'textbox') : (roleByTag[tag] ?? tag));
    const isTextInput =
      tag === 'textarea' ||
      element.isContentEditable ||
      (tag === 'input' && !['checkbox', 'radio', 'submit', 'button', 'range', 'file'].includes(inputType));
    return {
      number,
      role,
      name: readName(element).replace(/\s+/g, ' ').trim().slice(0, 80),
      tag,
      id: element.id,
      placeholder: element.getAttribute('placeholder') ?? '',
      inputName: element.getAttribute('name') ?? '',
      testID: element.getAttribute('data-testid') ?? '',
      isTextInput,
      isPasswordInput: inputType === 'password'
    };
  });
}

function quote(text: string): string {
  return JSON.stringify(text);
}

function buildCandidates(element: PageElement): string[] {
  const candidates: string[] = [];
  if (element.testID) candidates.push(`[data-testid=${quote(element.testID)}]`);
  if (element.name) candidates.push(`role=${element.role}[name=${quote(element.name)}]`);
  if (element.id && /^[A-Za-z][\w-]*$/.test(element.id)) candidates.push(`#${element.id}`);
  if (element.inputName) candidates.push(`${element.tag}[name=${quote(element.inputName)}]`);
  if (element.placeholder) candidates.push(`[placeholder=${quote(element.placeholder)}]`);
  return candidates;
}

async function pointsAtElement(page: Page, selector: string, number: number): Promise<boolean> {
  try {
    const locator = page.locator(selector);
    if ((await locator.count()) !== 1) return false;
    const taggedNumber = await locator.getAttribute('data-autoloom-number', { timeout: 1000 });
    return taggedNumber === String(number);
  } catch {
    return false;
  }
}

async function chooseSelector(page: Page, element: PageElement): Promise<string> {
  for (const candidate of buildCandidates(element)) {
    if (await pointsAtElement(page, candidate, element.number)) return candidate;
  }
  if (element.name) {
    const roleSelector = `role=${element.role}[name=${quote(element.name)}]`;
    const matches = page.locator(roleSelector);
    const count = await matches.count();
    for (let position = 0; position < count; position += 1) {
      const candidate = `${roleSelector} >> nth=${position}`;
      if (await pointsAtElement(page, candidate, element.number)) return candidate;
    }
  }
  return `[data-autoloom-number="${element.number}"]`;
}

export async function collectElements(page: Page): Promise<PageElement[]> {
  await page.evaluate('window.__name = window.__name || ((target) => target)');
  return page.evaluate(collectInPage, maximumElements);
}

export async function resolveDurableSelector(page: Page, element: PageElement): Promise<string> {
  return chooseSelector(page, element);
}

export function describeElements(elements: PageElement[]): string {
  return elements
    .map((element) => {
      const kind = element.isPasswordInput ? 'password field' : element.isTextInput ? 'text field' : element.role;
      return `[${element.number}] ${kind} "${element.name || 'unnamed'}"`;
    })
    .join('\n');
}
