const { VCard, GestionVCard } = require('./vCard');

try {
    const gestionVCard = new GestionVCard();

    // Création d'une VCard
    const maVCard = new VCard(
        "Dupont",
        "Marie",
        "marie.dupont@example.com",
        "+33123456789"
    );

    // Génération et sauvegarde après vérification
    gestionVCard.genererEtSauvegarder(maVCard, 'Marie_Dupont.vcf');
} catch (error) {
    console.error(error.message);
}
