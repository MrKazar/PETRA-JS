"""Matériel nécessaire par exercice -> src/data/equipment.ts.
Usage : python3 scripts/build_equipment.py src/data/exercices.json src/data/equipment.ts
"""
import json,sys
from collections import OrderedDict
d=json.load(open(sys.argv[1]));ex={e['id']:e for e in d['exercices']}
M=OrderedDict()  # (categorie, item) -> ids
def add(cat,item,ids):
    ids=ids.split() if isinstance(ids,str) else ids
    ids=[i for i in ids if i in ex]
    M.setdefault((cat,item),[]).extend(ids)
byeq=lambda k:[e['id'] for e in d['exercices'] if e['equipement']==k]
C1='Barres, poids libres et supports'
add(C1,'Barre olympique + disques',byeq('barre')+['rowing_inverse','traction_australienne'])
add(C1,'Haltères (paire, réglables ou fixes)',byeq('haltères'))
add(C1,'Haltère seul (un)',byeq('haltère'))
add(C1,'Barre EZ',byeq('barre EZ'))
add(C1,'Disques seuls (sans barre)',byeq('disque'))
add(C1,'Trap bar (barre hexagonale)',byeq('trap bar'))
add(C1,'Barre en T / station T-bar',byeq('barre en T'))
add(C1,'Kettlebell',byeq('kettlebell'))
add(C1,'Médecine-ball',byeq('médecine-ball'))
add(C1,'Support landmine','dev_landmine meadows_row dev_landmine_unilateral rotation_landmine')
add(C1,'Rack à squat / cage (avec sécurités)','squat_barre front_squat squat_pause box_squat squat_zercher dev_militaire_barre push_press rack_pull good_morning shrugs_barre rowing_inverse traction_australienne')
add(C1,'Ceinture de lest','traction_lestee')
add(C1,'Rouleau de poignets','rouleau_poignets')
C2='Bancs et stations'
add(C2,'Banc plat','pompes_inclinees pompes_declinees dev_couche_barre dev_couche_serre jm_press dev_couche_halteres dev_couche_halteres_neutre ecartes_halteres pullover_haltere rowing_haltere rowing_kroc tate_press barre_front barre_front_halteres hip_thrust hip_thrust_unilateral dips_banc step_up_pdc squat_bulgare_pdc fentes_bulgares planche_copenhague releve_jambes_banc dragon_flag curl_concentre kickback curl_poignets curl_poignets_inverse flexion_cou_disque extension_nuque_disque dev_couche_smith')
add(C2,'Banc avec supports de barre (développé couché)','dev_couche_barre dev_couche_serre jm_press')
add(C2,'Banc inclinable (incliné / dossier droit)','dev_incline_barre dev_incline_halteres ecartes_incline_halteres curl_incline y_raise_incline elevations_laterales_penche curl_spider dev_halteres_assis dev_arnold extension_nuque_haltere extension_nuque_ez dev_incline_smith dev_epaules_smith')
add(C2,'Banc décliné','dev_decline_barre dev_decline_halteres crunch_decline_leste')
add(C2,'Banc surélevé (seal row)','rowing_seal')
add(C2,'Pupitre (Larry Scott)','curl_pupitre curl_pupitre_haltere')
add(C2,'Banc à lombaires 45°','extension_lombaires')
add(C2,'Hyperextension inversée (ou banc haut)','hyperextension_inverse')
add(C2,'GHD (glute ham)','glute_ham_raise nordic_curl')
add(C2,'Chaise romaine','releve_jambes_chaise')
add(C2,'Barres parallèles (dips)','dips_pecs dips_triceps l_sit')
add(C2,'Barre de traction',byeq('barre de traction')+['traction_lestee'])
add(C2,'Anneaux de gym',byeq('anneaux'))
add(C2,'Box / caisse',['box_jump','box_squat','step_up'])
add(C2,'Marche / cale (talons, pointes)','mollets_unilateral mollets_debout_halteres squat_talons_sureleves mollets_pdc mollets_smith step')
add(C2,'Mur','pompes_poirier chaise_murale glissements_mur wall_ball')
C3='Poulies'
add(C3,'Vis-à-vis à deux poulies (crossover)','ecartes_poulie ecartes_poulie_basse ecartes_poulie_haute curl_poulie_haute oiseau_poulie')
add(C3,'Poulie haute','pullover_poulie face_pull pushdown_corde pushdown_barre extension_nuque_poulie pushdown_unilateral crunch_poulie woodchopper')
add(C3,'Poulie basse','curl_poulie_basse curl_bayesian curl_marteau_corde flexion_hanche_poulie kickback_poulie abduction_poulie adduction_poulie elevations_laterales_poulie elevations_laterales_unilaterale elevations_frontales_poulie tirage_menton_poulie kickback_poulie_triceps')
add(C3,'Poulie réglable à mi-hauteur','pallof_press rotation_externe_poulie ecartes_poulie_unilateral punch_dentele_poulie rowing_poulie_unilateral')
add(C3,'Station de tirage vertical','tirage_vertical_large tirage_vertical_serre tirage_vertical_unilateral tirage_vertical_supination')
add(C3,'Station de tirage horizontal','tirage_horizontal')
C4='Accessoires de poulie'
add(C4,'Corde','face_pull pushdown_corde extension_nuque_poulie curl_marteau_corde crunch_poulie')
add(C4,'Barre droite courte','pushdown_barre curl_poulie_basse tirage_menton_poulie')
add(C4,'Barre de tirage large','tirage_vertical_large tirage_vertical_supination')
add(C4,'Poignée triangle (V)','tirage_vertical_serre tirage_horizontal')
add(C4,'Poignée simple (D)','ecartes_poulie ecartes_poulie_basse ecartes_poulie_haute ecartes_poulie_unilateral punch_dentele_poulie tirage_vertical_unilateral rowing_poulie_unilateral elevations_laterales_poulie elevations_laterales_unilaterale elevations_frontales_poulie oiseau_poulie rotation_externe_poulie curl_poulie_haute curl_bayesian pushdown_unilateral kickback_poulie_triceps pallof_press woodchopper')
add(C4,'Sangle de cheville','kickback_poulie abduction_poulie adduction_poulie flexion_hanche_poulie')
C5='Machines de musculation'
names={'mollets_presse':'Presse à cuisses (mollets)','presse_unilaterale':'Presse à cuisses (unilatéral)'}
mach=[i for i in byeq('machine') if ex[i]['groupe_musculaire']!='cardio']
group=OrderedDict()
G={'presse_cuisses':'Presse à cuisses 45°','presse_unilaterale':'Presse à cuisses 45°','mollets_presse':'Presse à cuisses 45°',
 'leg_extension':'Leg extension','leg_extension_unilateral':'Leg extension',
 'pec_deck':'Pec deck / reverse pec deck','reverse_pec_deck':'Pec deck / reverse pec deck',
 'dips_assistes':'Machine assistée tractions / dips','traction_assistee':'Machine assistée tractions / dips',
 'abducteurs':'Machine abducteurs / adducteurs (assis)','adducteurs':'Machine abducteurs / adducteurs (assis)'}
nm={'dev_convergent':'Développé convergent','dev_incline_machine':'Développé incliné machine','dev_couche_machine':'Développé couché machine','rowing_machine':'Rowing machine (poitrine appuyée)','rowing_hammer':'Rowing convergent unilatéral','tirage_vertical_machine':'Tirage vertical convergent','pullover_machine':'Pull-over machine','dev_epaules_machine':'Développé épaules machine','elevations_laterales_machine':'Élévations latérales machine','curl_machine':'Curl machine','dips_machine':'Dips machine','extension_triceps_machine':'Extension triceps machine','shrugs_machine':'Shrugs machine','hack_squat':'Hack squat','belt_squat':'Belt squat','pendulum_squat':'Pendulum squat','leg_curl_allonge':'Leg curl allongé','leg_curl_assis':'Leg curl assis','leg_curl_debout':'Leg curl debout','hip_thrust_machine':'Hip thrust machine','kickback_machine':'Kickback fessier machine','abduction_machine_debout':'Abduction debout machine','mollets_debout':'Mollets debout machine','mollets_assis':'Mollets assis machine','mollets_donkey':'Mollets donkey machine','crunch_machine':'Crunch machine'}
for i in mach: add(C5,G.get(i) or nm[i],[i])
add(C5,'Smith machine',byeq('smith'))
C6='Cardio'
cm={'escalier_machine':'Stairmaster (escalier)','velo_elliptique':'Vélo elliptique','velo_appartement':"Vélo d'appartement",'velo_fractionne':"Vélo d'appartement",'rameur':'Rameur','rameur_fractionne':'Rameur','air_bike':'Air bike','ski_erg':'Ski erg'}
for i in byeq('machine'):
    if i in cm: add(C6,cm[i],[i])
add(C6,'Tapis de course',byeq('tapis de course'))
add(C6,'Corde à sauter',byeq('corde'))
add(C6,'Battle ropes',byeq('cordes'))
add(C6,'Sac de frappe (+ gants)',byeq('sac'))
add(C6,'Traîneau',byeq('traîneau'))
add(C6,'Step',byeq('step'))
add(C6,'Bâtons de marche nordique',byeq('bâtons'))
add(C6,'Vélo',byeq('vélo'))
add(C6,'Piscine',byeq('piscine'))
C7='Petit matériel'
add(C7,'Élastique / mini-band',byeq('élastique'))
add(C7,'Roue abdominale',byeq('roue'))
add(C7,'Ballon de gym (fitball)','leg_curl_ballon')
floor=[i for i in byeq('poids du corps') if i not in ('glissements_mur','squat_poids_corps','squat_saute','pistol_squat','sissy_squat','fentes_sautees','shrimp_squat','mollets_pdc','marche_talons','releves_pointes','jumping_jacks','hiit_poids_corps','rowing_inverse','traction_australienne','leg_curl_ballon')]
add(C7,'Tapis de sol (conseillé)',floor+['russian_twist','roue_abdos','coquillage_elastique','abduction_allonge_haltere','turkish_get_up','nordic_curl'])

import re,unicodedata
def slug(s):
    s=unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()
    s=re.sub(r'\(.*?\)','',s)
    return re.sub(r'[^a-z0-9]+','_',s).strip('_')
# Le tapis de sol est conseillé, jamais exigé : il ne sert pas au filtre.
items=[(c,it,list(dict.fromkeys(ids))) for (c,it),ids in M.items() if not it.startswith('Tapis de sol') and ids]
seen=set()
out=['// Généré par scripts/build_equipment.py depuis src/data/exercices.json : ne pas modifier à la main.','',
 'export interface EquipmentItem { id: string; label: string; cat: string; ids: string[] }','',
 'export const EQUIPMENT: EquipmentItem[] = [']
for c,it,ids in items:
    s=slug(it); assert s not in seen,s; seen.add(s)
    out.append('  { id: %s, label: %s, cat: %s, ids: [%s] },'%(json.dumps(s),json.dumps(it,ensure_ascii=False),json.dumps(c,ensure_ascii=False),', '.join(json.dumps(i) for i in ids)))
out.append(']')
open(sys.argv[2],'w').write('\n'.join(out)+'\n')
used=set(i for _,_,ids in items for i in ids)
print(len(items),'matériels,',len([i for i in ex if i not in used]),'exercices sans matériel')
