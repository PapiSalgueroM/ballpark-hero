import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/* Round 1144: a toast must not sit on the cookie banner.

   Both live at the bottom of the screen. On a first visit the banner is up
   until it is answered, and at 390 wide a toast sat 47px into its top lines
   (measured on main: toast 675 to 748, banner 701 to 844), over the words
   that say what Accept does. So while the banner is up the toasts anchor
   above it: its real height, read off the page, plus a gap. The height is
   measured, not assumed, because the banner's text wraps differently at
   every width (and under a translated page).

   Nothing here touches the banner. src/components/CookieConsent.tsx already
   marks the document while its question is open (body[data-consent-pending],
   Round 117) and takes the mark off when it is answered or when the banner
   moves inside an open rules sheet, so this only has to watch that mark. */
const BANNER = '[aria-label="Cookie choices"]';
/** Air between the top of the banner and the bottom of a toast, in px. */
const BANNER_GAP = 12;
const RESTING = "calc(6rem + env(safe-area-inset-bottom, 0px))";

/** The cookie banner's height in px while it is up at the bottom of the screen, 0 when it is not. */
function useCookieBannerHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return undefined;
    let sized: ResizeObserver | null = null;
    const measure = () => {
      sized?.disconnect();
      sized = null;
      const banner = document.body.dataset.consentPending ? document.querySelector<HTMLElement>(BANNER) : null;
      if (!banner) { setHeight(0); return; }
      const read = () => setHeight(Math.ceil(banner.getBoundingClientRect().height));
      read();
      /* the banner grows and shrinks with the window: a phone turned on its side, a resized desktop */
      if (typeof ResizeObserver !== "undefined") { sized = new ResizeObserver(read); sized.observe(banner); }
    };
    measure();
    const pending = new MutationObserver(measure);
    pending.observe(document.body, { attributes: true, attributeFilter: ["data-consent-pending"] });
    return () => { pending.disconnect(); sized?.disconnect(); };
  }, []);
  return height;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const banner = useCookieBannerHeight();
  const clear = banner > 0 ? `${banner + BANNER_GAP}px` : null;

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      /* never lower than where a toast rests on a phone, and above the banner while it is up */
      mobileOffset={{ bottom: clear ? `max(${RESTING}, ${clear})` : RESTING }}
      offset={clear ? { bottom: clear } : undefined}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
