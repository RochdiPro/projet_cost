import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import {
  PROJECT_WORKBOOK_SHEETS,
  ProjectWorkbook,
  Projet,
  ProjetRapport,
  Facture,
  AutreFacture,
  Restauration,
  Deplacement,
  ChargeSociete
} from '../models/project-cost.models';

@Injectable({ providedIn: 'root' })
export class XlsxDataService {
  private readonly tables = new Map<string, object[]>();

  constructor(private readonly http: HttpClient) {}

  async importAsset<T>(assetPath: string, sheetName?: string): Promise<T[]> {
    const response = await firstValueFrom(this.http.get(assetPath, { responseType: 'arraybuffer' }));
    const workbook = XLSX.read(response, { type: 'array' });
    const selectedSheet = sheetName ?? workbook.SheetNames[0];

    if (!selectedSheet) {
      return [];
    }

    const rows = XLSX.utils.sheet_to_json<T>(workbook.Sheets[selectedSheet]);
    this.tables.set(selectedSheet, [...rows] as object[]);
    return rows;
  }

  async importSheet<T>(file: File, sheetName?: string): Promise<T[]> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const selectedSheet = sheetName ?? workbook.SheetNames[0];

    if (!selectedSheet) {
      return [];
    }

    const rows = XLSX.utils.sheet_to_json<T>(workbook.Sheets[selectedSheet]);
    this.tables.set(selectedSheet, [...rows] as object[]);
    return rows;
  }

  async importProjectWorkbook(file: File): Promise<ProjectWorkbook> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return this.readProjectWorkbook(workbook);
  }

  exportProjectWorkbook(fileName: string, data: ProjectWorkbook): void {
    const workbook = XLSX.utils.book_new();
    const sheets: Array<[string, object[]]> = [
      [PROJECT_WORKBOOK_SHEETS.infoProjet, data.infoProjet],
      [PROJECT_WORKBOOK_SHEETS.factures, data.factures],
      [PROJECT_WORKBOOK_SHEETS.autresFactures, data.autresFactures],
      [PROJECT_WORKBOOK_SHEETS.restauration, data.restauration],
      [PROJECT_WORKBOOK_SHEETS.logistique, data.logistique],
      [PROJECT_WORKBOOK_SHEETS.charges, data.charges],
      [PROJECT_WORKBOOK_SHEETS.rapport, data.rapport]
    ];

    for (const [sheetName, rows] of sheets) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    }

    XLSX.writeFile(workbook, fileName);
  }

  calculateProjectReport(data: Omit<ProjectWorkbook, 'rapport'>): ProjetRapport[] {
    const total = (rows: Array<{ montant?: number; montantTotal?: number }>): number =>
      rows.reduce((sum, row) => sum + Number(row.montant ?? row.montantTotal ?? 0), 0);
    const factures = total(data.factures);
    const autresFactures = total(data.autresFactures);
    const restauration = total(data.restauration);
    const logistique = total(data.logistique);
    const charges = data.charges.reduce(
      (sum, charge) => sum + Number(charge.montantTotal ?? charge.nombreJoursTravail * charge.montantJour),
      0
    );

    return [
      { categorie: 'Factures avec BC', montant: factures },
      { categorie: 'Autres factures', montant: autresFactures },
      { categorie: 'Restauration', montant: restauration },
      { categorie: 'Logistique', montant: logistique },
      { categorie: 'Charges société', montant: charges },
      { categorie: 'Coût total', montant: factures + autresFactures + restauration + logistique + charges }
    ];
  }

  calculateProjectTiming(project: Projet, today = new Date()): Pick<Projet, 'joursPasses' | 'joursRestants' | 'joursRetard' | 'etat'> {
    const start = this.parseDate(project.dateDebutReelle ?? project.dateDebutPrevue);
    const plannedEnd = this.parseDate(project.dateFinPrevue);
    const actualEnd = project.dateFinReelle ? this.parseDate(project.dateFinReelle) : undefined;
    const endForElapsed = actualEnd ?? today;
    const joursPasses = start ? Math.max(0, this.daysBetween(start, endForElapsed)) : 0;
    const joursRestants = plannedEnd && !actualEnd ? this.daysBetween(today, plannedEnd) : 0;
    const joursRetard = plannedEnd && !actualEnd ? Math.max(0, -joursRestants) : 0;
    let etat: Projet['etat'] = 'A_VENIR';

    if (actualEnd) {
      etat = 'TERMINE';
    } else if (!start || today < start) {
      etat = 'A_VENIR';
    } else if (joursRetard > 0) {
      etat = 'EN_RETARD';
    } else if (joursRestants <= 7) {
      etat = 'A_SURVEILLER';
    } else {
      etat = 'EN_COURS';
    }

    return { joursPasses, joursRestants, joursRetard, etat };
  }

  calculateInvoiceRemaining(invoice: Facture): number {
    return Math.max(0, Number(invoice.montantTotal) - Number(invoice.montantPaye));
  }

  calculateChargeTotal(charge: ChargeSociete): number {
    return Number(charge.nombreJoursTravail) * Number(charge.montantJour);
  }

  private readProjectWorkbook(workbook: XLSX.WorkBook): ProjectWorkbook {
    const read = <T>(sheetName: string): T[] => {
      const sheet = workbook.Sheets[sheetName];
      const rows = sheet ? XLSX.utils.sheet_to_json<T>(sheet) : [];
      this.tables.set(sheetName, [...rows] as object[]);
      return rows;
    };

    return {
      infoProjet: read<Projet>(PROJECT_WORKBOOK_SHEETS.infoProjet),
      factures: read<Facture>(PROJECT_WORKBOOK_SHEETS.factures),
      autresFactures: read<AutreFacture>(PROJECT_WORKBOOK_SHEETS.autresFactures),
      restauration: read<Restauration>(PROJECT_WORKBOOK_SHEETS.restauration),
      logistique: read<Deplacement>(PROJECT_WORKBOOK_SHEETS.logistique),
      charges: read<ChargeSociete>(PROJECT_WORKBOOK_SHEETS.charges),
      rapport: read<ProjetRapport>(PROJECT_WORKBOOK_SHEETS.rapport)
    };
  }

  private parseDate(value: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private daysBetween(from: Date, to: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((to.getTime() - from.getTime()) / millisecondsPerDay);
  }

  list<T extends object>(tableName: string): T[] {
    return [...(this.tables.get(tableName) ?? [])] as T[];
  }

  create<T extends object>(tableName: string, row: T): T {
    const rows = this.tables.get(tableName) ?? [];
    rows.push(row);
    this.tables.set(tableName, rows);
    return row;
  }

  update<T extends { id: string }>(tableName: string, row: T): T {
    const rows = this.tables.get(tableName) ?? [];
    const rowIndex = rows.findIndex((currentRow) => (currentRow as T).id === row.id);

    if (rowIndex === -1) {
      throw new Error(`Ligne introuvable dans la table ${tableName}: ${row.id}`);
    }

    rows[rowIndex] = row;
    this.tables.set(tableName, rows);
    return row;
  }

  remove<T extends { id: string }>(tableName: string, id: string): void {
    const rows = this.tables.get(tableName) ?? [];
    this.tables.set(
      tableName,
      rows.filter((row) => (row as T).id !== id)
    );
  }

  exportSheet<T extends object>(fileName: string, sheetName: string, rows: T[]): void {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  }
}
