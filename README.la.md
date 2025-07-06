# Gemini CLI

[![Gemini CLI CI](https://github.com/google-gemini/gemini-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/google-gemini/gemini-cli/actions/workflows/ci.yml)

![Gemini CLI Screenshot](./docs/assets/gemini-screenshot.png)

Hoc repositorium continet Gemini CLI, instrumentum AI pro linea mandatorum quod cum instrumentis tuis connectitur, codicem tuum intellegit et opera tua accelerat.

Cum Gemini CLI potes:

- Magnas bases codicum interrogare et recensere, etiam ultra fenestram contextus 1M signorum Gemini.
- Novas applicationes generare ex PDF vel adumbrationibus, facultatibus multimodalibus Gemini utens.
- Operationes automatizare, sicut interrogationes de "pull requests" vel complexas "rebases" tractare.
- Instrumentis et MCP servientibus uti ad novas facultates connectendas, includens [generationem mediorum cum Imagen, Veo vel Lyria](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia)
- Interrogationes tuas fundare cum instrumento [Google Search](https://ai.google.dev/gemini-api/docs/grounding), in Gemini aedificato.

## Initium Rapidum

1. **Praerequisita:** Cura ut [Node.js versionem 20](https://nodejs.org/en/download) vel superiorem institutam habeas.
2. **CLI currere:** Hoc mandatum in terminali tuo exsequere:

   ```bash
   npx https://github.com/google-gemini/gemini-cli
   ```

   Aut instituere cum:

   ```bash
   npm install -g @google/gemini-cli
   gemini
   ```

3. **Colorem thematis elige**
4. **Authenticare:** Cum rogatus, aperi sessionem cum ratione tua personali Google. Hoc tibi concedet usque ad 60 petitiones exemplaris per minutum et 1,000 petitiones exemplaris per diem, Gemini utens.

Nunc paratus es uti Gemini CLI!

### Utere clavi API Gemini:

API Gemini praebet gradum gratuitum cum [100 petitionibus per diem](https://ai.google.dev/gemini-api/docs/rate-limits#free-tier) utens Gemini 2.5 Pro, potestatem super quo exemplari uteris, et aditum ad limites petitionum altiores (cum consilio soluto):

1. Clavem generare ex [Google AI Studio](https://aistudio.google.com/apikey).
2. Eam constitue ut variabilis environmentalis in terminali tuo. Repone `YOUR_API_KEY` cum clavi tua generata.

   ```bash
   export GEMINI_API_KEY="YOUR_API_KEY"
   ```

3. (Libitum) Propositum tuum API Gemini ad consilium solutum promove in pagina clavis API (automatice reserabit [limites petitionum Gradus 1](https://ai.google.dev/gemini-api/docs/rate-limits#tier-1))

Pro aliis modis authenticaris, includens rationes Google Workspace, vide ducem [authenticationis](./docs/cli/authentication.md).

## Exempla

Postquam CLI currit, potes incipere cum Gemini ex testa tua interagere.

Potes incipere propositum ex novo directorio:

```sh
cd novum-propositum/
gemini
> Scribe mihi bot Discord Gemini qui quaestionibus respondet utens fasciculo FAQ.md quem praebebo
```

Aut cum proposito exsistenti operari:

```sh
git clone https://github.com/google-gemini/gemini-cli
cd gemini-cli
gemini
> Da mihi summarium omnium mutationum quae heri factae sunt
```

### Proximi gradus

- Disce quomodo [contribuere vel a fonte aedificare](./CONTRIBUTING.md).
- Explora **[Mandata CLI](./docs/cli/commands.md)** praesto.
- Si quas quaestiones inveneris, recognosce **[Ducem ad solvendas quaestiones](./docs/troubleshooting.md)**.
- Pro documentis amplioribus, vide [documenta plena](./docs/index.md).
- Inspice aliqua [opera popularia](#opera-popularia) pro maiori inspiratione.

### Solutio quaestionum

Vade ad ducem [solvendarum quaestionum](docs/troubleshooting.md) si difficultates habes.

## Opera popularia

### Novam basim codicis explorare

Incipe `cd` faciendo in repositorium exsistens vel nuper clonatum et `gemini` currendo.

```text
> Describe praecipuas partes architecturae huius systematis.
```

```text
> Quae mechanismi securitatis in loco sunt?
```

### Cum codice tuo exsistenti operari

```text
> Implementa primam versionem pro re GitHub #123.
```

```text
> Adiuva me hanc basim codicis ad recentissimam versionem Javae migrare. Incipe cum consilio.
```

### Opera tua automatizare

Utere MCP servientibus ad integrandum instrumenta systematis localis tui cum comitatu tuo collaborationis suite.

```text
> Fac mihi praesentationem monstrantem historiam git ex ultimis 7 diebus, per pluma et membrum manipuli digestam.
```

```text
> Fac applicationem web plenam screen pro muro ostentationis ad monstrandum nostras quaestiones GitHub maxime interacatas.
```

### Cum systemate tuo interagere

```text
> Converte omnes imagines in hoc directorio ad png, et eas renominare utentes datas ex data exif.
```

```text
> Ordina meas cautiones PDF per mensem expensarum.
```

### Amotio

Vade ad ducem [Amotionis](docs/Uninstall.md) pro instructionibus amotionis.

## Termini servitii et Notitia de secreto

Pro singulis de terminis servitii et notitia de secreto quae ad usum tuum Gemini CLI pertinent, vide [Terminos servitii et Notitiam de secreto](./docs/tos-privacy.md).
