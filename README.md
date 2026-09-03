# Project Cost

Socle Angular 17 standalone pour la gestion et l’analyse des coûts de projets.

## Structure initiale

- `/dashboard` : tableau de bord vide, point d’entrée de l’application.
- `/projects` : module de gestion des projets à compléter.
- `src/app/core/models` : modèles métier du cahier des charges.
- `src/app/core/services/xlsx-data.service.ts` : import/export XLSX et CRUD en mémoire.

Le service XLSX expose `importSheet`, `list`, `create`, `update`, `remove` et `exportSheet`.

## Format d'un fichier projet

Un fichier projet doit respecter le nom `Projet_[NomClient]_[NomProjet].xlsx` et contenir les feuilles suivantes : `INFO_PROJET`, `FACTURES`, `AUTRES_FACTURES`, `RESTAURATION`, `LOGISTIQUE`, `CHARGES` et `RAPPORT`.

Les indicateurs de délais, les montants restants des factures, les coûts des charges et la synthèse du rapport sont calculés par `XlsxDataService`.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
