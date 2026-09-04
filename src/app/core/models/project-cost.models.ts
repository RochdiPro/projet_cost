export type ProjectStatus = 'A_VENIR' | 'EN_COURS' | 'A_SURVEILLER' | 'EN_RETARD' | 'TERMINE';

export const PROJECT_WORKBOOK_SHEETS = {
  infoProjet: 'INFO_PROJET',
  factures: 'FACTURES',
  autresFactures: 'AUTRES_FACTURES',
  restauration: 'RESTAURATION',
  logistique: 'LOGISTIQUE',
  charges: 'CHARGES',
  paiements: 'PAIEMENTS',
  planification: 'PLANIFICATION',
  rapport: 'RAPPORT'
} as const;

export interface Projet {
  id: string;
  client: string;
  description: string;
  dateDebutPrevue: string;
  dateDebutReelle?: string;
  dateFinPrevue: string;
  dateFinReelle?: string;
  joursPasses?: number;
  joursRestants?: number;
  joursRetard?: number;
  etat: ProjectStatus;
}

export interface Fournisseur {
  id: string;
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  description?: string;
}

export interface Facture {
  id: string;
  fournisseur: string;
  numeroFacture: string;
  numeroBC: string;
  montantTotal: number;
  montantPaye: number;
  montantRestant?: number;
  dateEcheance: string;
}

export interface PaiementPlanifie {
  numeroFacture: string;
  datePlanifiee: string;
  montantPlanifie: number;
}

export interface AutreFacture {
  id: string;
  fournisseur: string;
  description: string;
  montant: number;
  date: string;
}

export interface Deplacement {
  id: string;
  type: 'Déplacement' | 'Transport' | 'Hébergement' | 'Autre';
  date: string;
  montant: number;
  description: string;
}

export interface Restauration {
  id: string;
  date: string;
  montant: number;
  description: string;
}

export interface Employe {
  id: string;
  nom: string;
  prenom: string;
  montantJour: number;
}

export interface ChargeSociete {
  id: string;
  employe: string;
  nombreJoursTravail: number;
  montantJour: number;
  montantTotal?: number;
  description: string;
}

export interface ProjetRapport {
  categorie: string;
  montant: number;
}

export interface Paiement {
  id: string;
  montant: number;
  fournisseur: string;
  date: string;
  etat: 'PAYE' | 'PLANIFIE';
}

export interface PhaseProjet {
  phase: string;
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  avanceRetard: number;
  etat: ProjectStatus;
}

export interface ProjectWorkbook {
  infoProjet: Projet[];
  factures: Facture[];
  autresFactures: AutreFacture[];
  restauration: Restauration[];
  logistique: Deplacement[];
  charges: ChargeSociete[];
  paiements: Paiement[];
  planification: PhaseProjet[];
  rapport: ProjetRapport[];
}
