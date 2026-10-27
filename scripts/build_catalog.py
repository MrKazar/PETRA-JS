#!/usr/bin/env python3
"""Génère src/data/exercices.json, le catalogue d'exercices de PETRA.

Chaque exercice de musculation suit le même cycle de 4 séries :
  1 série de chauffe (charge = % de la charge de travail),
  2 séries de travail (charge de travail),
  1 série d'hypertrophie (charge = % de la charge de travail, plus de répétitions).

Les répétitions, pourcentages et temps de repos viennent d'un « profil » choisi selon le type
d'exercice, d'après les recommandations courantes (ACSM, Schoenfeld) :
  - polyarticulaire lourd : force à 4-6 reps (≈ 85 % 1RM), 3 min de repos ;
  - polyarticulaire : 6-8 reps, 2 min 30 ;
  - polyarticulaire guidé (machine, poulie) : 8-10 reps, 2 min ;
  - isolation : 8-12 reps, 1 min 30 ; petits muscles : 10-12 reps, 1 min 15 ;
  - poids du corps, abdos et gainage : répétitions ou secondes, repos courts.
La série d'hypertrophie se fait à 65-75 % de la charge de travail, proche de l'échec (1-2 reps en réserve).

Usage : python3 scripts/build_catalog.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "exercices.json"

# profil : (chauffe, travail, hypertrophie, type)
#   chauffe / hypertrophie : (reps, % de la charge de travail ou None, repos en s)
#   travail : (reps, repos en s)
PROFILES = {
    "poly_lourd": (("10", 50, 90), ("4-6", 180), ("8-10", 75, 120), "polyarticulaire"),
    "poly": (("12", 50, 75), ("6-8", 150), ("10-12", 75, 90), "polyarticulaire"),
    "poly_guide": (("12", 50, 60), ("8-10", 120), ("12-15", 70, 90), "polyarticulaire"),
    "explosif": (("5", 50, 90), ("3-5", 150), ("6-8", 70, 120), "polyarticulaire"),
    "iso": (("15", 50, 45), ("8-12", 90), ("12-15", 70, 60), "isolation"),
    "iso_petit": (("15", 40, 45), ("10-12", 75), ("15-20", 65, 60), "isolation"),
    "pdc_force": (("5", None, 60), ("6-10", 120), ("10-15", None, 90), "polyarticulaire"),
    "pdc": (("10", None, 45), ("12-15", 75), ("15-20", None, 60), "polyarticulaire"),
    "abdos": (("10", None, 30), ("12-15", 60), ("15-20", None, 45), "isolation"),
    "abdos_charge": (("12", 50, 45), ("10-12", 75), ("15-20", 70, 60), "isolation"),
    "gainage": (("20 s", None, 30), ("45 s", 60), ("60 s", None, 45), "isolation"),
    "porte": (("20 s", 50, 60), ("40 s", 90), ("60 s", 75, 90), "polyarticulaire"),
}

# Équipements sans charge additionnelle : la charge de travail ne s'y applique pas (lest facultatif).
BODYWEIGHT = {"poids du corps", "barres parallèles", "barre de traction", "roue", "banc", "aucun", "anneaux", "box", "chaise romaine", "mur"}

GROUPS = [
    "pectoraux", "dos", "epaules", "biceps", "triceps", "avant_bras", "trapezes", "lombaires",
    "quadriceps", "ischio_jambiers", "fessiers", "adducteurs", "mollets", "abdominaux", "obliques",
    "corps_entier", "cardio",
]

# Profils des exercices déjà présents dans l'ancien catalogue (même id, même nom).
LEGACY_PROFILES = {
    "dev_couche_barre": "poly_lourd", "dev_incline_barre": "poly", "dev_decline_barre": "poly",
    "dev_couche_halteres": "poly", "dev_incline_halteres": "poly", "dev_couche_smith": "poly",
    "dev_incline_smith": "poly", "dev_convergent": "poly_guide", "dev_incline_machine": "poly_guide",
    "pec_deck": "iso", "ecartes_halteres": "iso", "ecartes_poulie": "iso", "ecartes_poulie_basse": "iso",
    "pompes": "pdc", "dips_pecs": "pdc_force", "pullover_haltere": "iso",
    "souleve_terre": "poly_lourd", "souleve_terre_roumain": "poly", "souleve_terre_jambes_tendues": "poly",
    "traction_pronation": "pdc_force", "traction_supination": "pdc_force", "traction_assistee": "poly_guide",
    "tirage_vertical_large": "poly_guide", "tirage_vertical_serre": "poly_guide", "tirage_vertical_unilateral": "poly_guide",
    "rowing_barre": "poly", "rowing_haltere": "poly", "rowing_tbar": "poly", "rowing_machine": "poly_guide",
    "tirage_horizontal": "poly_guide", "pullover_poulie": "iso",
    "shrugs_halteres": "iso_petit", "shrugs_barre": "iso_petit",
    "extension_lombaires": "pdc", "good_morning": "poly",
    "dev_militaire_barre": "poly", "dev_halteres_assis": "poly", "dev_arnold": "poly",
    "dev_epaules_machine": "poly_guide", "dev_epaules_smith": "poly",
    "elevations_laterales_halteres": "iso_petit", "elevations_laterales_poulie": "iso_petit",
    "elevations_laterales_machine": "iso_petit", "elevations_frontales": "iso_petit",
    "oiseau_halteres": "iso_petit", "reverse_pec_deck": "iso_petit", "face_pull": "iso_petit", "tirage_menton": "iso",
    "curl_barre": "iso", "curl_barre_ez": "iso", "curl_halteres": "iso", "curl_marteau": "iso",
    "curl_incline": "iso", "curl_pupitre": "iso", "curl_poulie_basse": "iso", "curl_concentre": "iso", "curl_spider": "iso",
    "barre_front": "iso", "pushdown_corde": "iso", "pushdown_barre": "iso", "extension_nuque_poulie": "iso",
    "extension_nuque_haltere": "iso", "dips_triceps": "pdc_force", "dev_couche_serre": "poly", "kickback": "iso_petit",
    "dips_machine": "poly_guide", "curl_poignets": "iso_petit", "curl_inverse": "iso",
    "squat_barre": "poly_lourd", "front_squat": "poly_lourd", "squat_smith": "poly", "goblet_squat": "poly_guide",
    "presse_cuisses": "poly_guide", "hack_squat": "poly_guide", "leg_extension": "iso",
    "fentes_marchees": "poly", "fentes_bulgares": "poly", "fentes_arriere": "poly", "step_up": "poly",
    "leg_curl_allonge": "iso", "leg_curl_assis": "iso",
    "hip_thrust": "poly", "hip_thrust_machine": "poly_guide", "kickback_poulie": "iso_petit",
    "kickback_machine": "iso_petit", "abducteurs": "iso_petit", "adducteurs": "iso_petit",
    "mollets_debout": "iso_petit", "mollets_assis": "iso_petit", "mollets_presse": "iso_petit",
    "crunch": "abdos", "crunch_poulie": "abdos_charge", "crunch_machine": "abdos_charge",
    "releve_jambes_suspendu": "abdos", "releve_jambes_banc": "abdos", "roue_abdos": "abdos",
    "russian_twist": "abdos_charge", "pallof_press": "abdos_charge",
    "planche": "gainage", "planche_laterale": "gainage",
}

# Nouveaux exercices : (id, nom, groupe, muscles secondaires, équipement, profil, par côté)
NEW = [
    # Pectoraux
    ("pompes_inclinees", "Pompes inclinées (mains surélevées)", "pectoraux", ["triceps"], "poids du corps", "pdc", False),
    ("pompes_declinees", "Pompes déclinées (pieds surélevés)", "pectoraux", ["epaules", "triceps"], "poids du corps", "pdc", False),
    ("pompes_larges", "Pompes prise large", "pectoraux", ["epaules"], "poids du corps", "pdc", False),
    ("pompes_archer", "Pompes archer", "pectoraux", ["triceps", "epaules"], "poids du corps", "pdc_force", True),
    ("pompes_explosives", "Pompes explosives (claquées)", "pectoraux", ["triceps"], "poids du corps", "pdc_force", False),
    ("pompes_anneaux", "Pompes aux anneaux", "pectoraux", ["triceps", "abdominaux"], "anneaux", "pdc_force", False),
    ("dev_couche_halteres_neutre", "Développé couché haltères prise neutre", "pectoraux", ["triceps"], "haltères", "poly", False),
    ("dev_decline_halteres", "Développé décliné aux haltères", "pectoraux", ["triceps"], "haltères", "poly", False),
    ("floor_press", "Floor press aux haltères", "pectoraux", ["triceps"], "haltères", "poly", False),
    ("dev_couche_machine", "Développé couché machine", "pectoraux", ["triceps", "epaules"], "machine", "poly_guide", False),
    ("dev_landmine", "Développé landmine", "pectoraux", ["epaules", "triceps"], "barre", "poly", False),
    ("ecartes_incline_halteres", "Écartés inclinés aux haltères", "pectoraux", ["epaules"], "haltères", "iso", False),
    ("ecartes_poulie_haute", "Écartés poulie haute vers bas", "pectoraux", [], "poulie", "iso", False),
    ("ecartes_poulie_unilateral", "Écarté unilatéral à la poulie", "pectoraux", [], "poulie", "iso", True),
    ("svend_press", "Svend press (disque serré)", "pectoraux", ["epaules"], "disque", "iso_petit", False),
    ("dips_assistes", "Dips machine assistée", "pectoraux", ["triceps"], "machine", "poly_guide", False),
    # Dos
    ("rowing_pendlay", "Rowing Pendlay", "dos", ["biceps", "lombaires"], "barre", "poly_lourd", False),
    ("rowing_yates", "Rowing Yates (supination)", "dos", ["biceps"], "barre", "poly", False),
    ("rowing_seal", "Rowing allongé sur banc (seal row)", "dos", ["biceps"], "haltères", "poly", False),
    ("rowing_kroc", "Rowing Kroc (haltère lourd)", "dos", ["biceps", "avant_bras"], "haltère", "poly", True),
    ("meadows_row", "Rowing Meadows (landmine)", "dos", ["biceps"], "barre", "poly", True),
    ("rowing_poulie_unilateral", "Rowing poulie unilatéral", "dos", ["biceps"], "poulie", "poly_guide", True),
    ("rowing_hammer", "Rowing machine convergente unilatéral", "dos", ["biceps"], "machine", "poly_guide", True),
    ("rowing_inverse", "Rowing inversé (barre basse)", "dos", ["biceps"], "poids du corps", "pdc", False),
    ("traction_australienne", "Tractions australiennes", "dos", ["biceps"], "poids du corps", "pdc", False),
    ("traction_neutre", "Tractions prise neutre", "dos", ["biceps"], "barre de traction", "pdc_force", False),
    ("traction_lestee", "Tractions lestées", "dos", ["biceps"], "disque", "poly", False),
    ("tirage_vertical_supination", "Tirage vertical supination", "dos", ["biceps"], "poulie", "poly_guide", False),
    ("tirage_vertical_machine", "Tirage vertical machine convergente", "dos", ["biceps"], "machine", "poly_guide", False),
    ("rack_pull", "Rack pull (soulevé partiel)", "dos", ["trapezes", "fessiers"], "barre", "poly_lourd", False),
    ("souleve_terre_sumo", "Soulevé de terre sumo", "dos", ["fessiers", "adducteurs", "quadriceps"], "barre", "poly_lourd", False),
    ("souleve_terre_trap_bar", "Soulevé de terre trap bar", "dos", ["quadriceps", "fessiers"], "trap bar", "poly_lourd", False),
    ("pullover_machine", "Pull-over machine", "dos", ["pectoraux"], "machine", "iso", False),
    # Lombaires
    ("superman", "Superman", "lombaires", ["fessiers"], "poids du corps", "pdc", False),
    ("hyperextension_inverse", "Hyperextension inversée", "lombaires", ["fessiers", "ischio_jambiers"], "banc", "pdc", False),
    ("bird_dog", "Bird dog", "lombaires", ["abdominaux", "fessiers"], "poids du corps", "abdos", True),
    # Trapèzes
    ("shrugs_smith", "Shrugs à la Smith machine", "trapezes", [], "smith", "iso_petit", False),
    ("shrugs_machine", "Shrugs machine", "trapezes", [], "machine", "iso_petit", False),
    ("y_raise_incline", "Élévations en Y sur banc incliné", "trapezes", ["epaules"], "haltères", "iso_petit", False),
    # Épaules
    ("dev_militaire_halteres_debout", "Développé militaire haltères debout", "epaules", ["triceps"], "haltères", "poly", False),
    ("push_press", "Push press", "epaules", ["triceps", "quadriceps"], "barre", "explosif", False),
    ("dev_landmine_unilateral", "Développé landmine unilatéral", "epaules", ["pectoraux", "triceps"], "barre", "poly", True),
    ("dev_kettlebell", "Développé kettlebell unilatéral", "epaules", ["triceps"], "kettlebell", "poly", True),
    ("elevations_laterales_unilaterale", "Élévation latérale unilatérale à la poulie", "epaules", [], "poulie", "iso_petit", True),
    ("elevations_laterales_penche", "Élévations latérales penché sur banc", "epaules", [], "haltères", "iso_petit", False),
    ("elevations_frontales_disque", "Élévations frontales au disque", "epaules", [], "disque", "iso_petit", False),
    ("elevations_frontales_poulie", "Élévations frontales à la poulie", "epaules", [], "poulie", "iso_petit", False),
    ("oiseau_poulie", "Oiseau à la poulie (croisé)", "epaules", ["trapezes"], "poulie", "iso_petit", False),
    ("rotation_externe_poulie", "Rotation externe à la poulie", "epaules", [], "poulie", "iso_petit", True),
    ("tirage_menton_poulie", "Tirage menton à la poulie", "epaules", ["trapezes"], "poulie", "iso", False),
    ("pompes_piquees", "Pompes piquées (pike push-up)", "epaules", ["triceps"], "poids du corps", "pdc_force", False),
    ("pompes_poirier", "Pompes en équilibre contre le mur", "epaules", ["triceps"], "mur", "pdc_force", False),
    # Biceps
    ("curl_poulie_haute", "Curl poulie haute (double biceps)", "biceps", [], "poulie", "iso", False),
    ("curl_bayesian", "Curl Bayesian (poulie dans le dos)", "biceps", [], "poulie", "iso", True),
    ("curl_drag", "Drag curl", "biceps", [], "barre", "iso", False),
    ("curl_zottman", "Curl Zottman", "biceps", ["avant_bras"], "haltères", "iso", False),
    ("curl_machine", "Curl machine", "biceps", [], "machine", "iso", False),
    ("curl_marteau_corde", "Curl marteau à la corde", "biceps", ["avant_bras"], "poulie", "iso", False),
    ("curl_pupitre_haltere", "Curl pupitre unilatéral à l'haltère", "biceps", [], "haltère", "iso", True),
    ("curl_21", "Curl 21 (barre EZ)", "biceps", [], "barre EZ", "iso", False),
    # Triceps
    ("pompes_diamant", "Pompes diamant", "triceps", ["pectoraux"], "poids du corps", "pdc", False),
    ("dips_banc", "Dips entre deux bancs", "triceps", ["pectoraux"], "banc", "pdc", False),
    ("jm_press", "JM press", "triceps", ["pectoraux"], "barre", "poly", False),
    ("barre_front_halteres", "Extension couché aux haltères", "triceps", [], "haltères", "iso", False),
    ("extension_nuque_ez", "Extension nuque à la barre EZ", "triceps", [], "barre EZ", "iso", False),
    ("extension_triceps_machine", "Extension triceps machine", "triceps", [], "machine", "iso", False),
    ("pushdown_unilateral", "Extension unilatérale poulie haute (prise inversée)", "triceps", [], "poulie", "iso_petit", True),
    ("kickback_poulie_triceps", "Kickback triceps à la poulie", "triceps", [], "poulie", "iso_petit", True),
    ("tate_press", "Tate press", "triceps", [], "haltères", "iso", False),
    # Avant-bras
    ("curl_poignets_inverse", "Curl des poignets inversé", "avant_bras", [], "barre", "iso_petit", False),
    ("rouleau_poignets", "Rouleau de poignets", "avant_bras", [], "disque", "iso_petit", False),
    ("farmer_walk", "Marche du fermier", "avant_bras", ["trapezes", "abdominaux"], "haltères", "porte", False),
    ("suspension_barre", "Suspension à la barre", "avant_bras", ["dos"], "barre de traction", "gainage", False),
    ("pinch_disques", "Pince de disques", "avant_bras", [], "disque", "porte", False),
    # Quadriceps
    ("squat_pause", "Squat avec pause", "quadriceps", ["fessiers"], "barre", "poly_lourd", False),
    ("box_squat", "Box squat", "quadriceps", ["fessiers", "ischio_jambiers"], "barre", "poly_lourd", False),
    ("squat_zercher", "Squat Zercher", "quadriceps", ["fessiers", "abdominaux"], "barre", "poly", False),
    ("squat_talons_sureleves", "Squat talons surélevés aux haltères", "quadriceps", [], "haltères", "poly", False),
    ("belt_squat", "Belt squat", "quadriceps", ["fessiers"], "machine", "poly_guide", False),
    ("pendulum_squat", "Pendulum squat", "quadriceps", ["fessiers"], "machine", "poly_guide", False),
    ("presse_unilaterale", "Presse à cuisses unilatérale", "quadriceps", ["fessiers"], "machine", "poly_guide", True),
    ("fentes_avant", "Fentes avant", "quadriceps", ["fessiers"], "haltères", "poly", True),
    ("fentes_laterales", "Fentes latérales", "quadriceps", ["adducteurs", "fessiers"], "haltères", "poly", True),
    ("leg_extension_unilateral", "Leg extension unilatéral", "quadriceps", [], "machine", "iso", True),
    ("squat_poids_corps", "Squat au poids du corps", "quadriceps", ["fessiers"], "poids du corps", "pdc", False),
    ("squat_saute", "Squats sautés", "quadriceps", ["fessiers", "mollets"], "poids du corps", "pdc", False),
    ("pistol_squat", "Pistol squat", "quadriceps", ["fessiers"], "poids du corps", "pdc_force", True),
    ("sissy_squat", "Sissy squat", "quadriceps", [], "poids du corps", "pdc", False),
    ("chaise_murale", "Chaise contre le mur", "quadriceps", ["fessiers"], "mur", "gainage", False),
    # Ischio-jambiers
    ("souleve_terre_roumain_halteres", "Soulevé de terre roumain aux haltères", "ischio_jambiers", ["fessiers", "lombaires"], "haltères", "poly", False),
    ("souleve_terre_unilateral", "Soulevé de terre roumain unilatéral", "ischio_jambiers", ["fessiers"], "haltère", "poly", True),
    ("leg_curl_debout", "Leg curl debout unilatéral", "ischio_jambiers", [], "machine", "iso", True),
    ("nordic_curl", "Nordic curl", "ischio_jambiers", [], "poids du corps", "pdc_force", False),
    ("glute_ham_raise", "Glute ham raise", "ischio_jambiers", ["fessiers"], "banc", "pdc_force", False),
    ("leg_curl_ballon", "Leg curl au ballon de gym", "ischio_jambiers", ["fessiers"], "poids du corps", "pdc", False),
    # Fessiers
    ("pont_fessier", "Pont fessier", "fessiers", ["ischio_jambiers"], "poids du corps", "pdc", False),
    ("pont_fessier_barre", "Pont fessier à la barre", "fessiers", ["ischio_jambiers"], "barre", "poly", False),
    ("hip_thrust_unilateral", "Hip thrust unilatéral", "fessiers", ["ischio_jambiers"], "banc", "pdc", True),
    ("kickback_sol", "Kickback fessier au sol", "fessiers", [], "poids du corps", "pdc", True),
    ("abduction_poulie", "Abduction de hanche à la poulie", "fessiers", [], "poulie", "iso_petit", True),
    ("fentes_croisees", "Fentes croisées (curtsy)", "fessiers", ["quadriceps", "adducteurs"], "haltères", "poly", True),
    ("frog_pump", "Frog pump", "fessiers", [], "poids du corps", "pdc", False),
    ("kettlebell_swing", "Kettlebell swing", "fessiers", ["ischio_jambiers", "lombaires"], "kettlebell", "explosif", False),
    # Adducteurs
    ("adduction_poulie", "Adduction de hanche à la poulie", "adducteurs", [], "poulie", "iso_petit", True),
    ("squat_sumo_haltere", "Squat sumo à l'haltère", "adducteurs", ["quadriceps", "fessiers"], "haltère", "poly", False),
    ("planche_copenhague", "Planche Copenhague", "adducteurs", ["obliques"], "banc", "gainage", True),
    # Mollets
    ("mollets_debout_halteres", "Mollets debout aux haltères", "mollets", [], "haltères", "iso_petit", False),
    ("mollets_unilateral", "Mollets unilatéral sur marche", "mollets", [], "haltère", "iso_petit", True),
    ("mollets_smith", "Mollets à la Smith machine", "mollets", [], "smith", "iso_petit", False),
    ("mollets_donkey", "Mollets donkey (machine)", "mollets", [], "machine", "iso_petit", False),
    ("releves_pointes", "Relevés de pointes (tibial)", "mollets", [], "poids du corps", "pdc", False),
    # Abdominaux
    ("crunch_inverse", "Crunch inversé", "abdominaux", [], "poids du corps", "abdos", False),
    ("crunch_bicyclette", "Crunch bicyclette", "abdominaux", ["obliques"], "poids du corps", "abdos", False),
    ("sit_up", "Sit-up", "abdominaux", [], "poids du corps", "abdos", False),
    ("v_ups", "V-ups", "abdominaux", [], "poids du corps", "abdos", False),
    ("dead_bug", "Dead bug", "abdominaux", ["lombaires"], "poids du corps", "abdos", False),
    ("mountain_climbers", "Mountain climbers", "abdominaux", ["epaules"], "poids du corps", "abdos", False),
    ("releve_jambes_chaise", "Relevé de genoux à la chaise romaine", "abdominaux", [], "chaise romaine", "abdos", False),
    ("toes_to_bar", "Toes to bar", "abdominaux", ["dos"], "barre de traction", "pdc_force", False),
    ("dragon_flag", "Dragon flag", "abdominaux", ["lombaires"], "banc", "pdc_force", False),
    ("crunch_decline_leste", "Crunch décliné lesté", "abdominaux", [], "disque", "abdos_charge", False),
    ("hollow_hold", "Hollow hold", "abdominaux", [], "poids du corps", "gainage", False),
    ("planche_toucher_epaules", "Planche bras tendus avec toucher d'épaules", "abdominaux", ["epaules"], "poids du corps", "gainage", False),
    # Obliques
    ("crunch_oblique", "Crunch oblique", "obliques", [], "poids du corps", "abdos", True),
    ("essuie_glace", "Essuie-glace au sol", "obliques", ["abdominaux"], "poids du corps", "abdos", False),
    ("woodchopper", "Bûcheron à la poulie (woodchopper)", "obliques", ["abdominaux"], "poulie", "abdos_charge", True),
    ("flexion_laterale_haltere", "Flexion latérale à l'haltère", "obliques", [], "haltère", "abdos_charge", True),
    ("rotation_landmine", "Rotation landmine", "obliques", ["epaules"], "barre", "abdos_charge", False),
    ("suitcase_carry", "Marche valise (suitcase carry)", "obliques", ["avant_bras"], "haltère", "porte", True),
    # Corps entier
    ("burpees", "Burpees", "corps_entier", ["pectoraux", "quadriceps"], "poids du corps", "pdc", False),
    ("thruster", "Thruster", "corps_entier", ["quadriceps", "epaules"], "haltères", "poly", False),
    ("power_clean", "Épaulé (power clean)", "corps_entier", ["dos", "trapezes", "quadriceps"], "barre", "explosif", False),
    ("box_jump", "Box jump", "corps_entier", ["quadriceps", "mollets"], "box", "pdc_force", False),
    ("wall_ball", "Wall ball", "corps_entier", ["quadriceps", "epaules"], "médecine-ball", "poly_guide", False),
    ("turkish_get_up", "Turkish get-up", "corps_entier", ["epaules", "abdominaux"], "kettlebell", "poly", True),
    ("poussee_traineau", "Poussée de traîneau", "corps_entier", ["quadriceps", "fessiers"], "traîneau", "porte", False),
]

NEW_CARDIO = [
    ("velo_exterieur", "Vélo (extérieur)", "vélo", 5, 40, 5, "modérée", "Allure où tu peux parler en phrases courtes (zone 2)."),
    ("randonnee", "Randonnée", "aucun", 10, 60, 10, "modérée", "Rythme régulier, plus lent dans les montées."),
    ("marche_nordique", "Marche nordique", "bâtons", 5, 40, 5, "modérée", "Pousse sur les bâtons à chaque pas, buste droit."),
    ("sprints_cote", "Sprints en côte", "aucun", 10, 12, 8, "élevée", "8 à 10 sprints de 10-15 s en montée, retour en marchant."),
    ("battle_ropes", "Battle ropes", "cordes", 5, 10, 5, "élevée", "Fractionné : 30 s d'ondulations / 30 s de repos."),
    ("ski_erg", "Ski erg", "machine", 5, 15, 5, "élevée", "Fractionné : 1 min rapide / 1 min tranquille."),
    ("sac_frappe", "Sac de frappe", "sac", 5, 15, 5, "élevée", "Rounds de 2 min, 1 min de récupération."),
    ("shadow_boxing", "Shadow boxing", "aucun", 5, 15, 5, "modérée", "Rounds de 3 min, garde haute, appuis mobiles."),
    ("velo_fractionne", "Vélo d'appartement fractionné", "machine", 5, 20, 5, "élevée", "Fractionné : 30 s à fond / 90 s tranquille."),
    ("rameur_fractionne", "Rameur fractionné", "machine", 5, 16, 5, "élevée", "8 × 250 m rapides, 1 min de récupération."),
]


def strength(e, profile):
    warm, work, hyp, kind = PROFILES[profile]
    out = dict(e)
    out["type"] = kind
    out["charge"] = e["equipement"] not in BODYWEIGHT
    out["profil"] = profile

    def phase(reps, pct, rest):
        p = {"reps": reps, "repos_sec": rest}
        if pct is not None and out["charge"]:
            p["charge_pct"] = pct
        return p

    out["chauffe"] = phase(*warm)
    out["travail"] = {"reps": work[0], "repos_sec": work[1]}
    out["hypertrophie"] = phase(*hyp)
    return out


def main():
    # Le fichier existant sert de source pour les exercices de l'ancien catalogue (relancer le script est sans effet).
    new_ids = {n[0] for n in NEW} | {c[0] for c in NEW_CARDIO}
    legacy = [e for e in json.loads(OUT.read_text(encoding="utf-8"))["exercices"] if e["id"] not in new_ids]
    exercises = []
    for e in legacy:
        base = {k: e[k] for k in ("id", "nom", "groupe_musculaire", "muscles_secondaires", "equipement", "par_cote")}
        if "cardio" in e:
            exercises.append({**base, "type": "cardio", "charge": False, "cardio": e["cardio"]})
        else:
            exercises.append(strength(base, LEGACY_PROFILES[e["id"]]))
    for (id_, nom, groupe, sec, equip, profile, par_cote) in NEW:
        exercises.append(strength({"id": id_, "nom": nom, "groupe_musculaire": groupe, "muscles_secondaires": sec, "equipement": equip, "par_cote": par_cote}, profile))
    for (id_, nom, equip, ech, eff, ret, intensite, consigne) in NEW_CARDIO:
        exercises.append({
            "id": id_, "nom": nom, "groupe_musculaire": "cardio", "muscles_secondaires": [], "equipement": equip,
            "par_cote": False, "type": "cardio", "charge": False,
            "cardio": {"echauffement_min": ech, "effort_min": eff, "retour_calme_min": ret, "intensite": intensite, "consigne": consigne},
        })

    ids = [e["id"] for e in exercises]
    dup = {i for i in ids if ids.count(i) > 1}
    assert not dup, f"identifiants en double : {dup}"
    assert all(e["groupe_musculaire"] in GROUPS for e in exercises)
    order = {g: i for i, g in enumerate(GROUPS)}
    exercises.sort(key=lambda e: order[e["groupe_musculaire"]])

    catalog = {
        "version": "2.0",
        "langue": "fr",
        "legende": {
            "cycle": "Chaque exercice de musculation se fait en 4 séries : 1 de chauffe, 2 de travail, 1 d'hypertrophie.",
            "chauffe": "Série d'échauffement à charge légère (charge_pct % de la charge de travail), sans aller à l'échec.",
            "travail": "Deux séries à la charge de travail, orientées force, 1 à 2 répétitions en réserve.",
            "hypertrophie": "Dernière série plus légère (charge_pct % de la charge de travail) et plus longue, proche de l'échec.",
            "repos_sec": "Repos conseillé après la série, en secondes.",
            "charge": "Si false, l'exercice se fait au poids du corps (lest facultatif).",
            "par_cote": "Si true, les répétitions se font de chaque côté.",
            "cardio": "Exercice de cardio : échauffement, effort puis retour au calme, durées en minutes.",
            "note": "Valeurs indicatives issues des recommandations courantes en musculation : à ajuster selon ton niveau et ta récupération.",
        },
        "groupes_musculaires": GROUPS,
        "exercices": exercises,
    }
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(exercises)} exercices écrits dans {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
