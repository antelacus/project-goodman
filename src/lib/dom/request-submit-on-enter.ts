type EnterKeyEvent = {
  key: string;
  preventDefault: () => void;
};

type SubmitOptions = {
  disabled?: boolean;
};

export function requestSubmitOnEnter(
  event: EnterKeyEvent,
  form: HTMLFormElement | null,
  options: SubmitOptions = {}
): boolean {
  if (options.disabled) return false;
  if (event.key !== 'Enter') return false;

  event.preventDefault();
  form?.requestSubmit();
  return true;
}
