// Campo trappola anti-bot: fuori schermo, non focalizzabile e nascosto agli
// screen reader. Un utente reale non lo compila mai; i bot sì.
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Sito web
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
