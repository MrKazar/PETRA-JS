import { useMemo } from 'react'
import { CATALOG } from '../data/catalog'
import { useData } from '../data/store'
import { saveSettings } from '../logic/actions'
import { CATEGORIES, EQUIPMENT, PRESETS, canDo, ownedSet } from '../logic/equipment'
import { SectionTitle, Toggle } from '../ui/kit'

/** Nombre d'exercices du catalogue faisables avec ce matériel. */
export function doableCount(equipment: readonly string[]): number {
  const owned = ownedSet(equipment)
  return CATALOG.filter((e) => canDo(e.id, owned)).length
}

export function equipmentSummary(equipment: readonly string[] | null | undefined): string {
  if (!equipment) return 'Pas réglé : tous les exercices sont proposés'
  return `${doableCount(equipment)} exercices faisables sur ${CATALOG.length}`
}

/** Paramètres > Mon matériel : ce que j'ai, pour ne voir que les exercices faisables. */
export function EquipmentSection() {
  const equipment = useData().settings.equipment
  const list = useMemo(() => equipment ?? [], [equipment])
  const owned = useMemo(() => ownedSet(list), [list])
  const doable = useMemo(() => doableCount(list), [list])
  const set = (ids: string[]) => saveSettings({ equipment: [...new Set(ids)] })
  const toggle = (id: string, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id))
  const preset = PRESETS.find((p) => equipment && p.items.length === list.length && p.items.every((x) => list.includes(x)))

  return (
    <>
      <div className="card stack">
        <div className="small muted">
          Coche le matériel que tu as. Dans Exercices et quand tu ajoutes un exercice à un programme, le filtre « Mon matériel » ne montre que ceux que tu peux faire.
        </div>
        {equipment ? (
          <div style={{ fontWeight: 600 }}>{doable} exercices faisables sur {CATALOG.length}</div>
        ) : (
          <div style={{ fontWeight: 600 }}>Pas encore réglé : tous les exercices sont proposés.</div>
        )}
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p.id} className={`chip${preset?.id === p.id ? ' on' : ''}`} onClick={() => set(p.items)} title={p.hint}>{p.label}</button>
          ))}
        </div>
        <div className="small faint">Un préréglage remplace la liste ; tu peux ensuite cocher ou décocher chaque élément.</div>
        {equipment && <button className="btn block" onClick={() => saveSettings({ equipment: null })}>Ne plus filtrer par matériel</button>}
      </div>

      {CATEGORIES.map((cat) => {
        const items = EQUIPMENT.filter((x) => x.cat === cat)
        const all = items.every((x) => owned.has(x.id))
        return (
          <div key={cat} className="stack" style={{ gap: 8 }}>
            <SectionTitle right={<button className="chip" onClick={() => set(all ? list.filter((id) => !items.some((x) => x.id === id)) : [...list, ...items.map((x) => x.id)])}>{all ? 'Tout décocher' : 'Tout cocher'}</button>}>{cat}</SectionTitle>
            <div className="card stack">
              {items.map((x) => {
                const implied = owned.has(x.id) && !list.includes(x.id)
                return (
                  <div key={x.id} className="row">
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{x.label}</div>
                      <div className="small muted">{x.ids.length} exercice{x.ids.length > 1 ? 's' : ''}{implied ? ' · compris avec ton autre matériel' : ''}</div>
                    </div>
                    <span style={implied ? { opacity: 0.5, pointerEvents: 'none' } : undefined}><Toggle on={owned.has(x.id)} onChange={(v) => toggle(x.id, v)} label={x.label} /></span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
