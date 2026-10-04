import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

export const { fontFamily } = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
export const poppins = loadPoppins("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const inter = loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const jetbrains = loadJetBrains("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;

export const fontFor = (name?: string): string => {
  switch (name) {
    case "poppins":   return poppins;
    case "inter":     return inter;
    case "jetbrains": return jetbrains;
    default:          return fontFamily; // fredoka
  }
};
