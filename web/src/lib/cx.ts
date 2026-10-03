import "@fontsource/inter";
import "@fontsource/jetbrains-mono";
import "maplibre-gl/dist/maplibre-gl.css";
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
