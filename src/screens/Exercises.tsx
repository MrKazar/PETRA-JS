import { useEffect, useState } from 'react'
import { CATALOG, type CatalogExercise } from '../data/catalog'
import { getData, useData } from '../data/store'
import { saveProgram } from '../logic/actions'
import { CatalogBrowse, CatalogDetail, CatalogFilters, CatalogResults, useCatalogSearch } from '../ui/ExercisePicker'
import { Empty, Header, Sheet, toast } from '../ui/kit'
import { IconBook } from '../ui/icons'

export function ExercisesScreen() {
  const data = useData()
  const search = useCatalogSearch()
  const [detail, setDetail] = useState<CatalogExercise>()
  const [programId, setProgramId] = useState<string>('')
  const target = data.programs.find((p) => p.id === programId) ?? data.programs[0]
  const { muscle, zone, setMuscle, setZone } = search

  // Retour Android : remonte d'un cran (muscle → zone → toutes les zones) avant de quitter l'écran.
  useEffect(() => {
    if (detail || (!muscle && !zone)) return
    const onBack = (ev: Event) => {
      ev.preventDefault()
      if (muscle) setMuscle(undefined)
      else setZone(undefined)
    }
    window.addEventListener('petra:back', onBack)
    return () => window.removeEventListener('petra:back', onBack)
  }, [detail, muscle, zone, setMuscle, setZone])

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="Exercices" sub={`${CATALOG.length} exercices · ${CATALOG.filter((e) => e.pdc).length} au poids du corps`} />
        <CatalogFilters {...search} />
        <CatalogBrowse {...search} />
        <CatalogResults search={search} onOpen={setDetail} />
        {!search.browsing && !search.results.length && !search.secondary.length && (
          <div className="card">
            <Empty icon={<IconBook />} title="Aucun exercice trouvé">Essaie un autre mot ou un autre groupe.</Empty>
          </div>
        )}
      </div>

      <Sheet open={!!detail} onClose={() => setDetail(undefined)} title={detail?.nom}>
        {detail && (
          <div className="stack">
            {data.programs.length > 0 && (
              <label className="field">
                <span>Ajouter au programme</span>
                <select className="input" value={target?.id} onChange={(e) => setProgramId(e.target.value)}>
                  {data.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
            <CatalogDetail
              key={detail.id}
              ex={detail}
              addLabel={target ? `Ajouter à ${target.name}` : 'Crée d’abord un programme'}
              onAdd={(ex) => {
                const p = getData().programs.find((x) => x.id === target?.id)
                if (!p) {
                  toast('Crée d’abord un programme dans l’onglet Programmes')
                  return
                }
                saveProgram({ ...p, exercises: [...p.exercises, ex] })
                toast(`${ex.name} ajouté à ${p.name}`)
                setDetail(undefined)
              }}
            />
          </div>
        )}
      </Sheet>
    </div>
  )
}
