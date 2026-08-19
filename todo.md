# Value Scout TODO

- [x] Blockera nya paper trades när relevant börs är stängd
- [x] Visa och spara varför varje paper trade köptes
- [x] Lägg till tester för svenska, amerikanska och brittiska marknadstider
- [x] Kör build och regressionskontroller
- [x] Publicera uppdaterad GitHub Pages-version

- [x] Förbättra Paper trading och portföljens UI/UX med tydligare köp/säljflöden
- [x] Lägg till spårbar transaktionslogg med tid, symbol, sida, status och orsak
- [x] Lägg till säker orderförhandsgranskning utan automatisk riktig orderexekvering
- [ ] Förbered mäklaradapter och explicit bekräftelsegate för framtida riktiga order
- [x] Testa responsivitet, loggning och orderförhandsgranskning
- [x] Publicera UI/UX- och loggversionen

- [x] Gör simulerade orderstatus realistiska: mottagen, fylld, stängd och avvisad
- [x] Logga varje paper-köp och paper-sälj med full ordermetadata och orsak
- [x] Visa orderhistorik och P/L som en sammanhängande paper-tradingjournal
- [x] Testa hela simulerade köp-/säljflödet utan mäklaranrop
- [x] Publicera den förfinade paper-tradingversionen

- [x] Spara paper trades och auditlogg i persistent backendlagring
- [x] Läsa tillbaka historik efter sidladdning och omstart
- [x] Behålla lokal offline-fallback utan att skapa dubbla händelser
- [x] Testa persistent historik och publicera uppdateringen

- [x] Lägg till automatiserade tester för load/save paper-history, återläsning och offline-fallback
- [x] Verifiera att fjärrhistorik överlever omladdning utan dubbla events
- [x] Prioritera nyare persistent data framför stale localStorage vid merge

- [x] Fixa Starta-flödet så ny data hämtas utan stale cache
- [x] Visa tydlig senaste uppdatering, datakälla och uppdateringsstatus
- [x] Redesignera scannerdashboarden mot professionell marknadsterminal-estetik
- [x] Förbättra tabellhierarki, KPI-paneler, filter och mobil responsivitet
- [x] Testa färsk data och UI-regression
- [x] Publicera senaste Value Scout-versionen

- [x] Skapa en komplett simulerad orderlivscykel för VS:s köp, bevakning och sälj
- [x] Spara strukturerat beslutsunderlag för varje köp och sälj med pris-, nyhets- och riskskäl
- [x] Lägg till datakvalitets- och marknadsstatusgate innan en paper-order kan fyllas
- [x] Utöka automatiska exitregler med tid, mål, stop och försämrad signal
- [x] Visa positionens aktuella tes, exitregel och varje beslut i Paper trading
- [x] Testa orderlivscykel, beslutsspårbarhet och datakällmärkning
- [x] Publicera VS:s utökade paper-tradingversion

- [x] Lägg till gratis återkommande backendbevakning av öppna VS-paper-positioner
- [x] Kör bevakning idempotent och spara automatiska exitbeslut med källor
- [x] Visa senaste automatiska kontroll och bevakningsläge i Paper trading
- [x] Testa schemalagd exit utan dubbla säljloggar
- [ ] Spara checkpoint och begära publicering före aktivering
- [ ] Aktivera kostnadsfri VS-bevakning under marknadstid

- [ ] Verifiera automatiskt exitbeslut end-to-end efter att publicerad scheduled monitor är aktiv.

- [x] Ta fram ett enhetligt terminalinspirerat designsystem för hela Value Scout.
- [x] Gör om Scanner-vyn med tydlig marknadsöversikt, filter, datakällor och rangordnade signaler.
- [x] Gör om Min portfölj med mer professionell positionsöversikt, riskfördelning och analysflöde.
- [x] Gör om Paper trading med tydlig positionstratt, beslutsjournal och orderstatus.
- [x] Förbättra navigation, tomlägen, laddning, mobil layout och tillgänglighet genom hela Value Scout.
- [x] Verifiera full UI-regression och publicera Value Scout-makeovern till GitHub Pages.

- [ ] Ta bort alla användarvända hänvisningar och beroenden till WebbAI Analys från Value Scout.
- [ ] Märk Value Scouts datalager som en intern Value Scout-tjänst i UI och dokumentation.
- [ ] Verifiera att Value Scout fungerar och navigerar fristående från GitHub Pages-länken.
- [ ] Publicera frikopplad Value Scout-version till GitHub Pages.
