import Dexie, { type Table } from "dexie";

export type GameKind = "game" | "series" | "expansion";

export interface Game {
  id: string;
  name: string;
  kind: GameKind;
  parentId?: string | null;
  year?: number;
  author?: string;
  publisher?: string;
  genres?: string[];
  description?: string;
  coverImage?: string; // data URL
  createdAt: number;
  updatedAt: number;
}

export type FieldType = "string" | "longtext" | "number" | "boolean" | "image" | "select";

export interface TemplateField {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select
}

export type ComponentKind =
  | "card"
  | "chip"
  | "board"
  | "dice"
  | "token"
  | "rules"
  | "miniature"
  | "other";

export interface ComponentTemplate {
  id: string;
  name: string;
  kind: ComponentKind;
  fields: TemplateField[];
  // Card-specific defaults
  cardWidthMm?: number;
  cardHeightMm?: number;
  twoSided?: boolean;
  createdAt: number;
}

export interface ComponentInstance {
  id: string;
  gameId: string;
  templateId: string;
  name: string;
  values: Record<string, unknown>;
  frontImage?: string; // data URL
  backImage?: string;
  quantity?: number;
  createdAt: number;
  updatedAt: number;
}

class MeepleDB extends Dexie {
  games!: Table<Game, string>;
  templates!: Table<ComponentTemplate, string>;
  components!: Table<ComponentInstance, string>;

  constructor() {
    super("meeple-vault");
    this.version(1).stores({
      games: "id, name, kind, parentId, year",
      templates: "id, name, kind",
      components: "id, gameId, templateId, name",
    });
  }
}

export const db = new MeepleDB();

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const now = () => Date.now();
