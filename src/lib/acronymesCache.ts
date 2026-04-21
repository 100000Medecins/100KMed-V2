export type Acronyme = { sigle: string; definition: string; lien: string | null }

let _cache: Acronyme[] | null = null
let _promise: Promise<Acronyme[]> | null = null

export function fetchAcronymes(): Promise<Acronyme[]> {
  if (_cache) return Promise.resolve(_cache)
  if (!_promise) {
    _promise = fetch('/api/acronymes')
      .then(r => r.json())
      .then((data: Acronyme[]) => { _cache = data; return data })
      .catch(() => { _promise = null; return [] })
  }
  return _promise
}

export function getCache(): Acronyme[] | null {
  return _cache
}

export function buildRegex(acronymes: Acronyme[]): RegExp {
  const escaped = acronymes.map(a => a.sigle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'g')
}

export function injectAcronymsInHtml(html: string, acronymes: Acronyme[]): string {
  if (!acronymes.length || !html) return html
  const regex = buildRegex(acronymes)
  return html.split(/(<[^>]*>)/g).map((part, i) => {
    if (i % 2 === 1) return part
    return part.replace(regex, (_, sigle) => {
      const acro = acronymes.find(a => a.sigle === sigle)!
      const title = acro.definition.replace(/"/g, '&quot;')
      return `<abbr title="${title}" style="text-decoration:underline dotted #9ca3af;cursor:help">${sigle}</abbr>`
    })
  }).join('')
}
