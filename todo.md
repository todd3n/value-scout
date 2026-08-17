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

- [ ] Lägg till automatiserade tester för load/save paper-history, återläsning och offline-fallback
- [ ] Verifiera att fjärrhistorik överlever omladdning utan dubbla events
- [ ] Prioritera nyare persistent data framför stale localStorage vid merge
