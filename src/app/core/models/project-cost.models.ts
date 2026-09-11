export type ProjectStatus = 'A_VENIR' | 'EN_COURS' | 'EN_AVANCE' | 'A_SURVEILLER' | 'EN_RETARD' | 'TERMINE';

export const PROJECT_WORKBOOK_SHEETS = {
  infoProjet: 'INFO_PROJET',
  factures: 'FACTURES',
  autresFactures: 'AUTRES_FACTURES',
  restauration: 'RESTAURATION',
  logistique: 'LOGISTIQUE',
  charges: 'CHARGES',
  paiements: 'PAIEMENTS',
  planification: 'PLANIFICATION',
  sousTraitance: 'SOUS_TRAITANCE',
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
  description: string;
  numeroFacture: string;
  numeroBC: string;
  montantTotal: number;
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
  nom?: string;
  montant: number;
  fournisseur: string;
  date: string;
  etat: 'PAYE' | 'NON_PAYE';
  retenuSource?: number;
}

export interface PhaseProjet {
  phase: string;
  dateDebut: string;
  dateFin: string;
  dateFinReelle?: string;
  nombreJours: number;
  pourcentageRealisation: number;
  avanceRetard: number;
  etat: ProjectStatus;
}

export interface Vehicule {
  id: string;
  matricule: string;
  visiteTechnique: string;
  assurance: string;
  taxe: string;
  prochainKilometrageVidange?: number;
}

export interface VehiculeFrais {
  id: string;
  vehiculeId?: string;
  montant: number;
  description: string;
  categorie: 'reparation' | 'gazoil' | 'vidange' | string;
  prochainKilometrage?: number;
  kilometrage?: number;
}

export interface VehiculeWorkbook {
  vehicules: Vehicule[];
  depenses: VehiculeFrais[];
}

export interface SousTraitance {
  collaborateur: string;
  contact: string;
  description: string;
  montant: number;
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
  sousTraitance: SousTraitance[];
  rapport: ProjetRapport[];
}
