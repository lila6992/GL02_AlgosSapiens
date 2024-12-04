const { Question, CollectionQuestion } = require('./question');
const Examen = require('./examen');

// Vérification de l'examen existant
console.log("\n=== Vérification de l'examen existant ===");
try {
    const examen = new Examen('examen_1');
    examen.chargerDepuisFichier();

    const resultat = examen.verifierQualite();
    if (resultat.valide) {
        console.log("L'examen est valide !");
    } else {
        console.log("L'examen est invalide. Problèmes détectés :");
        resultat.erreurs.forEach(err => console.log(`- ${err}`));
    }
} catch (error) {
    console.error(`Erreur : ${error.message}`);
}

// Création d'un nouvel examen diversifié
console.log("\n=== Création d'un nouvel examen diversifié ===");
const collection = new CollectionQuestion();

collection.ajouterQuestion(
    new Question(
        "Capitales",
        "Quelle est la capitale de la France ?",
        ["Paris", "Lyon", "Marseille"],
        ["Paris"],
        "choix_multiple"
    )
);

collection.ajouterQuestion(
    new Question(
        "Mathématiques",
        "Combien font 3 x 3 ?",
        ["6", "9", "12"],
        ["9"],
        "numerique"
    )
);

collection.ajouterQuestion(
    new Question(
        "Vrai ou Faux",
        "L'eau gèle à 0 degrés Celsius.",
        ["Vrai", "Faux"],
        ["Vrai"],
        "vrai_faux"
    )
);

collection.ajouterQuestion(
    new Question(
        "Complétion",
        "Les couleurs primaires sont ___, bleu et jaune.",
        ["rouge", "vert", "violet"],
        ["rouge"],
        "mot_manquant"
    )
);

for (let i = 1; i <= 11; i++) {
    collection.ajouterQuestion(
        new Question(
            `Question générale ${i}`,
            `Texte de la question générale ${i}`,
            ["Option A", "Option B", "Option C"],
            ["Option A"],
            "choix_multiple"
        )
    );
}

try {
    const nomExamen = 'examen_diversifie';
    collection.genererFichierGIFT(nomExamen);
    console.log(`Nouvel examen diversifié créé : ${nomExamen}.gift`);

    // Vérification de l'examen diversifié
    console.log("\n=== Vérification du nouvel examen diversifié ===");
    const nouvelExamen = new Examen(nomExamen);
    nouvelExamen.chargerDepuisFichier();

    const resultat = nouvelExamen.verifierQualite();
    if (resultat.valide) {
        console.log("Le nouvel examen est valide !");
    } else {
        console.log("Le nouvel examen est invalide. Problèmes détectés :");
        resultat.erreurs.forEach(err => console.log(`- ${err}`));
    }
} catch (error) {
    console.error(`Erreur : ${error.message}`);
}
