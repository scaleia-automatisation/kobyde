export type AgentMeta = {
  key: string;
  name: string;
  role: string;
  description: string;
  mission: string;
  emoji: string;
  ring: string;
  chip: string;
};

export const AGENTS: AgentMeta[] = [
  {
    key: "chef",
    name: "Alex",
    role: "Chef d'équipe IA",
    description: "Il coordonne les 9 autres agents et vous dit quoi faire aujourd'hui.",
    mission: "Organiser la journée",
    emoji: "🧭",
    ring: "bg-amber-100 text-amber-900 ring-amber-200",
    chip: "bg-amber-50 text-amber-800",
  },
  {
    key: "prospection",
    name: "Nina",
    role: "Chasseuse de clients",
    description: "Elle trouve de nouveaux prospects et vérifie s'ils sont intéressants.",
    mission: "Trouver des clients",
    emoji: "🔎",
    ring: "bg-sky-100 text-sky-900 ring-sky-200",
    chip: "bg-sky-50 text-sky-800",
  },
  {
    key: "vente",
    name: "Marco",
    role: "Commercial",
    description: "Il relance les prospects et transforme les discussions en ventes.",
    mission: "Vendre plus",
    emoji: "🤝",
    ring: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    chip: "bg-emerald-50 text-emerald-800",
  },
  {
    key: "devis",
    name: "Léa",
    role: "Devis & factures",
    description: "Elle rédige les devis, envoie les factures et surveille les paiements.",
    mission: "Encaisser à temps",
    emoji: "🧾",
    ring: "bg-violet-100 text-violet-900 ring-violet-200",
    chip: "bg-violet-50 text-violet-800",
  },
  {
    key: "marketing",
    name: "Sam",
    role: "Marketing",
    description: "Il écrit vos publications, vos emails et vos campagnes.",
    mission: "Se faire connaître",
    emoji: "📣",
    ring: "bg-rose-100 text-rose-900 ring-rose-200",
    chip: "bg-rose-50 text-rose-800",
  },
  {
    key: "support",
    name: "Ines",
    role: "Service client",
    description: "Elle répond aux clients vite et poliment, 24h/24.",
    mission: "Garder les clients",
    emoji: "💬",
    ring: "bg-teal-100 text-teal-900 ring-teal-200",
    chip: "bg-teal-50 text-teal-800",
  },
  {
    key: "projet",
    name: "Tom",
    role: "Chef de projet",
    description: "Il découpe les projets en étapes simples et suit les délais.",
    mission: "Livrer sans stress",
    emoji: "🗂️",
    ring: "bg-indigo-100 text-indigo-900 ring-indigo-200",
    chip: "bg-indigo-50 text-indigo-800",
  },
  {
    key: "rh",
    name: "Clara",
    role: "Ressources humaines",
    description: "Elle trie les candidatures et prépare vos entretiens.",
    mission: "Recruter mieux",
    emoji: "👥",
    ring: "bg-orange-100 text-orange-900 ring-orange-200",
    chip: "bg-orange-50 text-orange-800",
  },
  {
    key: "veille",
    name: "Yanis",
    role: "Veille & concurrence",
    description: "Il surveille vos concurrents et ce qu'on dit de vous sur le web.",
    mission: "Garder une longueur d'avance",
    emoji: "🛰️",
    ring: "bg-cyan-100 text-cyan-900 ring-cyan-200",
    chip: "bg-cyan-50 text-cyan-800",
  },
  {
    key: "analyste",
    name: "Zoé",
    role: "Analyste",
    description: "Elle regarde vos chiffres et vous dit ce qui rapporte vraiment.",
    mission: "Décider avec des chiffres",
    emoji: "📊",
    ring: "bg-lime-100 text-lime-900 ring-lime-200",
    chip: "bg-lime-50 text-lime-800",
  },
];

export const agentByKey = (key: string): AgentMeta => AGENTS.find((a) => a.key === key) ?? (AGENTS[0] as AgentMeta);
