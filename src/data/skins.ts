/**
 * Skins dos heróis (core/skins.lua, D-202 e D-226): só aparência, sem poder. As mesmas 6 para todo herói.
 * Veteran, Champion e Shadow abrem com a medalha do códex (vencer na Easy, Normal, Hard; vencer numa mais
 * difícil vale para as mais fáceis); Abyssal e Ascended com as Depths 3 e 5 vencidas com o herói.
 * M14-09: a escolha entra na tela de herói agora; a aparência de cada skin vem no `M13-06` (fase 2).
 */
export type SkinId = "default" | "veteran" | "champion" | "shadow" | "abyssal" | "ascended";

export interface SkinDef {
  id: SkinId;
  name: string;
  /** medalha mínima (1 Easy, 2 Normal, 3 Hard) */
  medal?: number;
  /** nível das Depths vencido com o herói */
  depths?: number;
  /** cor do anel na miniatura até a skin ter arte própria */
  color: string;
}

export const SKINS: readonly SkinDef[] = [
  { id: "default", name: "Default", color: "#9aa0b8" },
  { id: "veteran", name: "Veteran", medal: 1, color: "#7ee08a" },
  { id: "champion", name: "Champion", medal: 2, color: "#9be4ff" },
  { id: "shadow", name: "Shadow", medal: 3, color: "#ff7a6a" },
  { id: "abyssal", name: "Abyssal", depths: 3, color: "#c07cff" },
  { id: "ascended", name: "Ascended", depths: 5, color: "#ffd34d" },
];
