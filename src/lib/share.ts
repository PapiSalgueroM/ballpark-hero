import { toast } from 'sonner';

export async function shareResult(text: string, title = 'DoUKnowBall') {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    }
  } catch (err) {
    // User cancelled share or clipboard failed — try clipboard as fallback
    if (err instanceof DOMException && err.name === 'AbortError') return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Could not share or copy');
    }
  }
}
