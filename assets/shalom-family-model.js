/* Reglas puras para inscripciones familiares de demostración. */
(function(root) {
  function plan(event, members, selected) {
    const allowed = new Set(members.filter(m => m.verified).map(m => m.id));
    const ids = [...new Set(selected)];
    if (ids.some(id => !allowed.has(id))) return { error: 'Solo puedes inscribir relaciones verificadas de esta familia.' };
    const keep = [...new Set(event.registered)].filter(id => !allowed.has(id));
    const next = [...keep, ...ids];
    if (next.length > event.capacity) return { error: 'No hay lugares suficientes. Reduce la selección; no se guardó ningún cambio.' };
    return { registered: next };
  }
  const api = { plan };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ShalomFamily = api;
})(typeof window !== 'undefined' ? window : this);
