# Vuokrankorotuslaskuri

Simuloi vuokran kehitystä Suomen elinkustannusindeksin historiallisten tietojen perusteella.

🚀 **Live-sovellus:** [pekkaro.github.io/vuokrankorotuslaskuri/](https://pekkaro.github.io/vuokrankorotuslaskuri/)

## Ominaisuudet

- **Historiallinen Simulaatio**: Käyttää bootstrapping-menetelmää Tilastokeskuksen elinkustannusindeksistä (2004-2024).
- **PWA-tuki**: Toimii offline-tilassa ja voidaan asentaa kotivaihtoehdoksi.
- **Skenaariot**: Tallenna useita eri asetuksia (nykyinen vuokra, vesimaksu, korotusrajat) ja vertaile niitä kaaviossa.
- **Puhdas Indeksi -vertailu**: Visualisoi heti, miten omat korotusehdot (kuten 0 % lattia) vaikuttavat verrattuna raakaan markkinaindeksiin.
- **Automaattinen tallennus**: Sovellus muistaa nykyiset syötteet automaattisesti.

## Teknologia

- HTML / Vanilla CSS / Vanilla JS
- Chart.js (Visualisointi)
- Service Worker (Offline-tuki)
- LocalStorage (Skenaariot ja tilan tallennus)

## Käyttöohje

1. Syötä nykyinen vuokra ja vesimaksu.
2. Aseta mahdolliset korotusrajat (Min/Max).
3. Valitse aikaväli, josta simulaation kehitys poimitaan.
4. Tallenna skenaario, jos haluat vertailla sitä myöhemmin muihin asetuksiin.
