/**
 * The Empatherapy logo: the teacup symbol (Cassidy's symbol, as drawn for the film: public/brand/teacup.svg) beside
 * Cassidy's title artwork, "Empatherapy" in serif letters with a vine from the "y" to a daisy (the same artwork the
 * honey melts into in The Golden Pause).
 *
 * The artwork comes in two layers, made by film/golden-pause/wordmark_layers.py from source/wordmark.png:
 * the letters and vine as a mask, painted in the colour of the text around them (deep green in the header, cream in
 * the footer, the system text colour in high-contrast modes), and the daisy and leaves in their own colours.
 * Screen readers hear "Empatherapy".
 */
export default function Logo() {
  return (
    <span className="logo">
      <img className="logo__cup" src="/brand/teacup.svg" alt="" width="930" height="890" />
      <span className="logo__name" aria-hidden="true">
        <span className="logo__letters" />
        <img className="logo__flower" src="/brand/name-flower.webp" alt="" width="1200" height="236" />
      </span>
      <span className="sr-only">Empatherapy</span>
    </span>
  );
}
