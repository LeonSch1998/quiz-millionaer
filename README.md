# Quiz-Millionär – Online-Publikumsjoker

## Funktionen
- Quizhost auf `/`
- Zuschauerabstimmung auf `/vote`
- QR-Code wird im Host-Fenster angezeigt, wenn der Publikumsjoker aktiviert wird
- Live-Stimmenzähler und Prozentbalken
- Pro verbundener Sitzung eine Stimme je Abstimmung
- 15 Fragen, drei Joker und Punktestand

## Lokal testen
Voraussetzung: Node.js 18 oder neuer.

```bash
npm install
npm start
```

Dann am PC `http://localhost:3000` öffnen.
Damit Smartphones im selben WLAN abstimmen können, muss der Host über die lokale IP des PCs erreichbar sein; diese URL muss auch im QR-Code verwendet werden. Für einen echten Quizabend mit automatischem QR-Code ist eine öffentlich erreichbare HTTPS-Adresse empfohlen.

## Online bereitstellen (z. B. Render)
1. Lege die Dateien dieses Ordners in ein GitHub-Repository.
2. Erstelle bei Render einen neuen **Web Service** und verbinde das Repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Render stellt eine HTTPS-Adresse bereit. Öffne diese Adresse für die Quizleitung.

Hinweis: Bei Hostingdiensten mit kostenlosem Tarif kann der Dienst einschlafen oder Einschränkungen haben. Vor dem Quizabend unbedingt mit mehreren Smartphones testen.

## Datenschutz / Abstimmung
Die Anwendung speichert Abstimmungsdaten nur im Arbeitsspeicher des laufenden Servers. Es gibt keine Nutzerkonten. Der Server zählt pro verbundener Socket-Verbindung eine Stimme; erneutes Verbinden kann als neue Sitzung zählen. Für einen privaten Quizabend ist das meist ausreichend, aber es ist kein manipulationssicheres Wahlsystem.
