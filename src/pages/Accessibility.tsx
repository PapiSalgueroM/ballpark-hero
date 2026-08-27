import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

/**
 * Round 306: the accessibility statement, written to describe what the site
 * actually does rather than what a template wishes it did. Every claim on
 * this page is backed by code that ships or a check that runs; when we fix
 * more, the page grows, and simAccessibility holds the load bearing claims
 * against the source so the page cannot drift into fiction.
 *
 * Deliberately a <main id="dukb-main">: this is the page that explains the
 * skip link, so it is not allowed to be a page where the skip link fails.
 */
const Accessibility = () => {
  const navigate = useNavigate();
  return (
    <main id="dukb-main" tabIndex={-1} className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo
        title="Accessibility - DoUKnowBall"
        description="How DoUKnowBall works with keyboards, screen readers and reduced motion, what we check on every release, and how to reach us if something is in your way."
        path="/accessibility"
      />
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-8">Accessibility</h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: August 27, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Where we stand</h2>
          <p>Every game on this site is free and plays without an account, and we want that to include playing with a keyboard, a screen reader, or motion turned down. We aim at the WCAG 2.1 AA guidelines. We are not going to claim full conformance, because honest is more useful than impressive: this page says exactly what works, what we check automatically, and what we are still fixing.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">What works today</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Color contrast is checked by machine on every release.</strong> An automated sweep renders every page in a real browser and measures every piece of text against the 4.5 to 1 standard (3 to 1 for large text), including text over gradients and translucent layers. A page that fails does not ship.</li>
            <li><strong>Keyboard play:</strong> a skip link jumps past the navigation straight to the game, every focused control draws a visible ring, and the interactive grids in our connect style games are real buttons a keyboard can reach and a screen reader announces with their clues.</li>
            <li><strong>Screen reader labels:</strong> search boxes, answer fields, report forms and icon buttons carry names, game results are announced when they appear, and guess feedback (right, close, wrong) is spoken alongside the color coding, never carried by color alone.</li>
            <li><strong>Reduced motion is respected.</strong> With reduce motion set in your system, the animated tiles, reveals, pulses, spinners and the celebration confetti calm down, and the live scores ticker stops cycling and shows everything at once.</li>
            <li><strong>No time pressure by default.</strong> Daily puzzles have no clock. The one head to head mode with a shot clock is a deliberate game rule, and everything else waits for you.</li>
            <li><strong>Text and zoom:</strong> the site uses real text, not text baked into images, and the layout is built to reflow at high zoom on a phone sized screen.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">What we are still working on</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>A few older in-game panels (some Soccer Career and Stadium Tycoon popups) are announced as dialogs but do not yet hold keyboard focus inside themselves the way our newer dialogs do. We are converting them.</li>
            <li>The cookie banner sits at the end of the keyboard tab order instead of the start.</li>
            <li>The live scores ticker does not yet have its own pause button (it pauses while your pointer or keyboard focus is on it, and it never cycles at all under reduce motion).</li>
          </ul>
          <p className="mt-2">This list shrinks as rounds ship, and this page is updated when it does.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Something in your way? Tell us</h2>
          <p>If anything on this site is hard or impossible for you to use, that is a bug and we want it reported like one. Use the Report a bug button in the footer of any page, or email <a href="mailto:douknowball1@gmail.com" className="underline hover:text-foreground transition-colors">douknowball1@gmail.com</a> with the page and what got in the way. Reports go straight to the person who fixes things, and accessibility reports go to the front of the queue.</p>
        </div>
      </section>
    </main>
  );
};

export default Accessibility;
