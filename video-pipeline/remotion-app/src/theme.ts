import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

export const { fontFamily } = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
export const poppins = loadPoppins("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const fontFor = (name?: string) => (name === "poppins" ? poppins : fontFamily);
