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
- [x] Spara checkpoint och begära publicering före aktivering
- [x] Aktivera kostnadsfri VS-bevakning under marknadstid

- [x] Verifiera automatiskt exitbeslut end-to-end efter att publicerad scheduled monitor är aktiv.

- [x] Ta fram ett enhetligt terminalinspirerat designsystem för hela Value Scout.
- [x] Gör om Scanner-vyn med tydlig marknadsöversikt, filter, datakällor och rangordnade signaler.
- [x] Gör om Min portfölj med mer professionell positionsöversikt, riskfördelning och analysflöde.
- [x] Gör om Paper trading med tydlig positionstratt, beslutsjournal och orderstatus.
- [x] Förbättra navigation, tomlägen, laddning, mobil layout och tillgänglighet genom hela Value Scout.
- [x] Verifiera full UI-regression och publicera Value Scout-makeovern till GitHub Pages.

- [x] Ta bort alla användarvända hänvisningar och beroenden till WebbAI Analys från Value Scout.
- [x] Märk Value Scouts datalager som en intern Value Scout-tjänst i UI och dokumentation.
- [x] Verifiera att Value Scout fungerar och navigerar fristående från GitHub Pages-länken.
- [x] Publicera frikopplad Value Scout-version till GitHub Pages.

- [x] Rätta relative datumetiketter för kursnedgångar och handelsdagar.
- [x] Använd marknadens datum och tidszon i stället för klientens aktuella datum vid datumformatering.
- [x] Lägg till tester för i dag, tidigare handelsdag och helgfall.
- [x] Publicera och liveverifiera korrigerade datumetiketter i Value Scout.

- [x] Kartlägg aktuella produktionsfel i scanner, dataladdning och paper trading.
- [x] Förbättra felhantering och datakvalitetssignaler vid fördröjd eller ofullständig marknadsdata.
- [x] Förbättra återkoppling, tillgänglighet och mobil användbarhet i centrala Value Scout-flöden.
- [x] Lägg till regressionstester för identifierade stabilitetsproblem.
- [x] Publicera och liveverifiera kvalitetshöjningarna i Value Scout.

- [x] Märk sparade scannerresultat och delvis uppdaterade listor tydligt under en pågående genomgång.
- [x] Visa uppdateringsomfång, datakälla och eventuell fallback utan att kalla osäker data live.
- [x] Spara absolut signaldatum i nya paper-tradingbeslut och visa det i journalen.
- [x] Migrera visningen av äldre paper-trades så relativa datumetiketter inte misstolkas som nutida fakta.
- [x] Säkerställ begriplig feedback för felaktiga tickers, saknade kurser och fondkoder i portföljflödet.
- [x] Återställ den lokala Vite-ingången så produktionsbyggen alltid kan generera GitHub Pages-assets korrekt.
- [x] Kontrollera visuellt den byggda Value Scout-klienten före GitHub Pages-publicering.
- [x] Gör GitHub Pages-byggflödet reproducerbart så källingång och publicerade assets inte blandas ihop.

- [x] Ta bort den onödiga Cache-Control-begäran som utlöser en blockerad CORS-preflight i live-scannern.
- [x] Testa att publika scanbatches blir liveverifierade utan fallback.

- [x] Ersätt hela äldre datumetiketten i paper-tradingjournalen så absolut datum inte dupliceras.

- [x] Rätta den fullständiga svenska datumfrasen i verkliga äldre paper-tradingposter utan duplicerat datum.

- [x] Fastställ konservativa regler för automatisk paper-entry, positionsstorlek och samtidiga positioner.
- [ ] Låt den befintliga bakgrundsbevakningen öppna berättigade paper-orders under aktiv marknad.
- [ ] Spara automatiska entrybeslut med order-ID, pris, signaldata, källor och riskgränser.
- [ ] Skydda mot dubblettorder, stängd marknad, låg datakvalitet och endast sparade scannerresultat.
- [x] Visa automatisk entrypolicy, senaste körning och orderutfall i Paper trading.
- [x] Lägg till regressionstester för automatisk entry, idempotens och marknadsstängning.
- [ ] Publicera och liveverifiera en automatisk paper-entry utan riktiga pengar.

- [ ] Begränsa automatisk paper-entry till högst tre samtidiga öppna positioner enligt val B.
- [ ] Rangordna samtidigt berättigade signaler transparent före automatiska paper-orders.
- [x] Spara val B och dess högsta positionsantal per Value Scout-installation i backenddatabasen.
