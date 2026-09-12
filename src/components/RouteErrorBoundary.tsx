import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Round 544: one game falling over must not take the site with it.
 *
 * WHY THIS EXISTS. On 2026-09-11 a player reported that Club Manager crashed on
 * "See Season Review" and they could not progress. Round 541 fixed the throw.
 * This is the other half: there was no error boundary anywhere in the app, so
 * that throw unmounted the entire React root. The visitor got a white page with
 * no header, no footer, no link home, and no report-a-bug button, because all
 * of those live inside the tree that just came down. From the outside it looks
 * exactly like the whole site is broken, and the only move left is closing the
 * tab.
 *
 * A grep for ErrorBoundary, componentDidCatch and getDerivedStateFromError
 * across the repo returned nothing before this file, so every render bug on any
 * of the 130-odd routes has always cost the whole site rather than one page.
 *
 * WHAT IT DOES NOT DO. It fixes no bug and hides none. A caught error is still
 * logged to the console with its component stack, and the screen says plainly
 * that something broke rather than pretending the page is empty on purpose. The
 * point is that the visitor keeps a way out, and that a save-backed game says
 * out loud that the save is still on the device, because "the page went blank"
 * and "my career is gone" feel identical from the player's side and only one of
 * them is true.
 *
 * WHY IT SITS AROUND Routes AND NOT AROUND App. Inside the Suspense boundary
 * and around the routes only, so the header above it and the global footer
 * below it both survive. The footer is where the report-a-bug button lives, per
 * the standing rule that it stays there, and it is the single most useful thing
 * on the screen at the moment a page has just broken.
 *
 * KEEP THIS COMPONENT'S OWN RENDER TRIVIAL. It is the last thing standing when
 * something else has already failed, so it does no data access, no hooks, no
 * lazy imports and no clock reads. If it throws, there is nothing underneath.
 */

interface Props {
  children: ReactNode;
  /** Resets the boundary when the route changes, so navigating away recovers. */
  resetKey: string;
}

interface State {
  failed: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /* Console only. No network call: a crash reporter here would be one more
       thing that can fail while something is already failing, and the report a
       bug button below gives the player a way to tell us in their own words. */
    console.error('A page failed to render:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-3" aria-hidden="true">😬</div>
          <h1 className="text-xl font-bold font-display text-foreground mb-2">
            This page broke
          </h1>
          <p className="text-sm text-muted-foreground mb-1">
            Something in this game went wrong and it stopped drawing. It is our fault, not
            anything you did.
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            If you had a save going, it is still on this device. It is kept in your browser, and
            nothing here has touched it.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a
              href="/"
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Back to the games
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-secondary text-foreground rounded-full font-bold text-sm hover:bg-secondary/70 transition-colors"
            >
              Try this page again
            </button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Telling us what you were doing helps a lot. The report a bug button is at the bottom
            of this page.
          </p>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;
