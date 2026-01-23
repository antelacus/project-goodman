import { describe, it, expect, vi } from "vitest";
import { requestSubmitOnEnter } from "@/lib/dom/request-submit-on-enter";

describe("requestSubmitOnEnter", () => {
  it("submits the form on Enter when enabled", () => {
    const requestSubmit = vi.fn();
    const form = { requestSubmit } as unknown as HTMLFormElement;
    const event = {
      key: "Enter",
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    const result = requestSubmitOnEnter(event, form, { disabled: false });

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", () => {
    const requestSubmit = vi.fn();
    const form = { requestSubmit } as unknown as HTMLFormElement;
    const event = {
      key: "Enter",
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    const result = requestSubmitOnEnter(event, form, { disabled: true });

    expect(result).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it("ignores other keys", () => {
    const requestSubmit = vi.fn();
    const form = { requestSubmit } as unknown as HTMLFormElement;
    const event = {
      key: "Tab",
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    const result = requestSubmitOnEnter(event, form, { disabled: false });

    expect(result).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(requestSubmit).not.toHaveBeenCalled();
  });
});
