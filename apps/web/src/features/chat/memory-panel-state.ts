export type PanelChoice = "open" | "closed";

export function parsePanelChoice(value: string | null): PanelChoice | null {
  return value === "open" || value === "closed" ? value : null;
}

export function panelOpen(choice: PanelChoice | null): boolean {
  return choice !== "closed";
}
